use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::io::BufRead;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::process::Stdio;
use tauri::{AppHandle, Emitter, Manager};

/// Names, ports, and paths shared across the Docker/Xpra commands below.
/// Centralized so the reliability fixes in docker_stop/stop_environment stay
/// consistent with the values used to start the container in docker_run.
mod config {
    pub const CONTAINER_NAME: &str = "x11vm-container";
    pub const IMAGE_NAME: &str = "x11vm-image";
    pub const XPRA_DISPLAY: &str = ":100";
    pub const XPRA_PORT: u16 = 10000;
    /// Grace period given to `docker stop` before Docker sends SIGKILL.
    pub const STOP_TIMEOUT_SECS: u32 = 5;

    pub fn xpra_tcp_target() -> String {
        format!("tcp:127.0.0.1:{}", XPRA_PORT)
    }
}
use config::{xpra_tcp_target, CONTAINER_NAME, IMAGE_NAME, STOP_TIMEOUT_SECS, XPRA_DISPLAY};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Mapping {
    pub host_path: String,
    pub container_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct XtermPreset {
    pub id: String,
    pub name: String,
    pub flags: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub language: String,
    pub first_run: bool,
    pub mappings: Vec<Mapping>,
    pub xterm_presets: Vec<XtermPreset>,
    #[serde(default)]
    pub xpra_dpi: u32,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            language: "en".to_string(),
            first_run: true,
            mappings: vec![],
            xterm_presets: vec![
                XtermPreset {
                    id: "default-xterm".to_string(),
                    name: "Default".to_string(),
                    flags: "".to_string(),
                },
                XtermPreset {
                    id: "matrix-xterm".to_string(),
                    name: "Matrix".to_string(),
                    flags: "-bg black -fg green".to_string(),
                },
            ],
            xpra_dpi: 0,
        }
    }
}

fn get_docker_cmd() -> String {
    if Command::new("docker").arg("--version").output().is_ok() {
        return "docker".to_string();
    }
    if env::consts::OS == "macos" {
        let paths = [
            "/usr/local/bin/docker",
            "/opt/homebrew/bin/docker",
            "/Applications/Docker.app/Contents/Resources/bin/docker",
        ];
        for p in paths {
            if PathBuf::from(p).exists() {
                return p.to_string();
            }
        }
    } else if env::consts::OS == "windows" {
        let win_path = "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe";
        if PathBuf::from(win_path).exists() {
            return win_path.to_string();
        }
    }
    "docker".to_string()
}

/// Resolves the Xpra client binary, preferring well-known absolute install
/// paths on Windows/macOS and falling back to PATH resolution everywhere
/// else (Linux installs Xpra via the system package manager, so PATH is the
/// correct source of truth there).
fn resolve_xpra_cmd() -> String {
    if env::consts::OS == "windows" {
        let win_path = "C:\\Program Files\\Xpra\\Xpra_cmd.exe";
        if PathBuf::from(win_path).exists() {
            return win_path.to_string();
        }
    } else if env::consts::OS == "macos" {
        let mac_path = "/Applications/Xpra.app/Contents/MacOS/Xpra";
        if PathBuf::from(mac_path).exists() {
            return mac_path.to_string();
        }
    }
    "xpra".to_string()
}

/// Returns the (program, args) needed to terminate a locally running Xpra
/// client attached to our container, or `None` if the OS isn't recognized.
/// Kept pure/parameterized on `os` so it can be unit tested from any runner.
fn xpra_client_kill_command(os: &str) -> Option<(&'static str, Vec<String>)> {
    match os {
        "windows" => Some((
            "taskkill",
            vec![
                "/F".to_string(),
                "/IM".to_string(),
                "xpra_cmd.exe".to_string(),
                "/T".to_string(),
            ],
        )),
        "macos" | "linux" => Some(("pkill", vec!["-f".to_string(), xpra_tcp_target()])),
        _ => None,
    }
}

/// Shared shutdown path used both by the explicit "Stop" command and by the
/// window-close handler: kill any locally attached Xpra client first (now
/// including Linux, previously only Windows/macOS), then stop the container
/// with a grace period long enough to avoid an immediate SIGKILL. The
/// container runs with `--rm`, so a plain `stop` is enough for Docker to
/// remove it once it exits.
fn stop_environment() {
    if let Some((program, args)) = xpra_client_kill_command(env::consts::OS) {
        let _ = Command::new(program).args(&args).output();
    }

    let _ = Command::new(get_docker_cmd())
        .args(["stop", "-t", &STOP_TIMEOUT_SECS.to_string(), CONTAINER_NAME])
        .output();
}

fn get_settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let mut config_dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    config_dir.push("settings.json");
    Ok(config_dir)
}

fn load_settings(app: &AppHandle) -> Result<Settings, String> {
    let path = get_settings_path(app)?;
    if !path.exists() {
        return Ok(Settings::default());
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let settings: Settings = serde_json::from_str(&content).unwrap_or_default();
    Ok(settings)
}

#[tauri::command]
async fn get_settings(app: AppHandle) -> Result<Settings, String> {
    load_settings(&app)
}

#[tauri::command]
async fn save_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    validate_settings(&settings)?;
    let path = get_settings_path(&app)?;
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())?;
    Ok(())
}

fn validate_settings(settings: &Settings) -> Result<(), String> {
    // 1. Check if host paths exist
    for mapping in &settings.mappings {
        let host_path = Path::new(&mapping.host_path);
        if !host_path.exists() {
            return Err(format!("Host path does not exist: {}", mapping.host_path));
        }
    }

    // 2. Check for overlapping loops (subfolders)
    for (i, m1) in settings.mappings.iter().enumerate() {
        for (j, m2) in settings.mappings.iter().enumerate() {
            if i != j {
                if m1.host_path.starts_with(&m2.host_path)
                    || m2.host_path.starts_with(&m1.host_path)
                {
                    return Err(format!(
                        "Overlapping host paths detected: '{}' overlaps with '{}'. This can cause Docker loops.",
                        m1.host_path, m2.host_path
                    ));
                }
                if m1.container_path == m2.container_path {
                    return Err(format!(
                        "Duplicate container paths detected: '{}'.",
                        m1.container_path
                    ));
                }
            }
        }
    }

    Ok(())
}

/// Checks whether the Docker daemon (not just the CLI binary) is reachable.
/// `Ok(false)` means the CLI ran but the daemon didn't respond (e.g. Docker
/// Desktop isn't started); `Err` is reserved for the CLI itself failing to
/// spawn, which is a distinct, much rarer failure mode.
#[tauri::command]
async fn docker_daemon_status() -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let output = Command::new(get_docker_cmd())
            .arg("info")
            .output()
            .map_err(|e| e.to_string())?;
        Ok(output.status.success())
    })
    .await
    .map_err(|e| e.to_string())?
}

fn ensure_daemon_running() -> Result<(), String> {
    let output = Command::new(get_docker_cmd())
        .arg("info")
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(())
    } else {
        Err("Docker is not running. Please start Docker Desktop / the Docker service and try again.".to_string())
    }
}

#[tauri::command]
async fn docker_build(app: AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        ensure_daemon_running()?;

        let resource_dir = app.path().resource_dir().unwrap_or_default();
        let mut docker_dir = resource_dir.join("docker");
        if !docker_dir.exists() {
            // Tauri bundles resources from parent directories into _up_
            docker_dir = resource_dir.join("_up_").join("docker");
        }
        if !docker_dir.exists() {
            docker_dir = std::env::current_dir()
                .unwrap_or_default()
                .join("../docker");
        }
        let docker_dir_str = docker_dir.to_string_lossy().to_string();

        let mut child = Command::new(get_docker_cmd())
            .args(["build", "-t", IMAGE_NAME, &docker_dir_str])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?;

        let stdout = child.stdout.take().unwrap();
        let stderr = child.stderr.take().unwrap();

        let app_clone1 = app.clone();
        let out_thread = std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(l) = line {
                    let _ = app_clone1.emit("build-log", l);
                }
            }
        });

        let app_clone2 = app.clone();
        let err_thread = std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(l) = line {
                    let _ = app_clone2.emit("build-log", l);
                }
            }
        });

        let status = child.wait().map_err(|e| e.to_string())?;

        let _ = out_thread.join();
        let _ = err_thread.join();

        if status.success() {
            Ok("Build finished successfully.".to_string())
        } else {
            Err(format!("Build failed with status: {}", status))
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn docker_run(app: AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        ensure_daemon_running()?;

        let settings = load_settings(&app)?;
        validate_settings(&settings)?;

        let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
        let mut x11vm_dir = home_dir.clone();
        x11vm_dir.push(".x11vm");

        if !x11vm_dir.exists() {
            fs::create_dir_all(&x11vm_dir).map_err(|e| e.to_string())?;
        }

        let default_host_path = x11vm_dir.to_str().unwrap();
        let default_guest_path = "/home/x11vm/.x11vm";

        let mut args = vec![
            "run".to_string(),
            "-d".to_string(),
            "--name".to_string(),
            CONTAINER_NAME.to_string(),
            "--rm".to_string(),
            "-p".to_string(),
            format!("{}:{}", config::XPRA_PORT, config::XPRA_PORT),
            "-v".to_string(),
            format!("{}:{}", default_host_path, default_guest_path),
        ];

        // Add custom mappings
        for mapping in settings.mappings {
            args.push("-v".to_string());
            args.push(format!("{}:{}", mapping.host_path, mapping.container_path));
        }

        args.push(IMAGE_NAME.to_string());

        let output = Command::new(get_docker_cmd())
            .args(&args)
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn docker_stop() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| {
        stop_environment();

        let output = Command::new(get_docker_cmd())
            .args(["rm", "-f", CONTAINER_NAME])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn docker_image_status() -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let output = Command::new(get_docker_cmd())
            .args(["images", "-q", IMAGE_NAME])
            .output()
            .map_err(|e| e.to_string())?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(!stdout.trim().is_empty())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn docker_status() -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let output = Command::new(get_docker_cmd())
            .args(["ps", "-q", "-f", &format!("name={}", CONTAINER_NAME)])
            .output()
            .map_err(|e| e.to_string())?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        Ok(!stdout.trim().is_empty())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn xpra_attach(dpi: u32) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let xpra_cmd = resolve_xpra_cmd();

        let mut args = vec!["attach".to_string(), xpra_tcp_target()];
        if dpi > 0 {
            args.push(format!("--dpi={}", dpi));
        }

        let output = Command::new(&xpra_cmd)
            .args(&args)
            .output()
            .map_err(|e| format!("Failed to run xpra ({}): {}", xpra_cmd, e))?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn check_xpra_installed() -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let xpra_cmd = resolve_xpra_cmd();

        // Just check if we can get the version
        let output = Command::new(&xpra_cmd).args(["--version"]).output();

        match output {
            Ok(out) => Ok(out.status.success()),
            Err(_) => Ok(false),
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn open_terminal() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let cmd = format!("DISPLAY={} xfce4-terminal", XPRA_DISPLAY);
        let output = Command::new(get_docker_cmd())
            .args(["exec", "-d", CONTAINER_NAME, "bash", "-c", &cmd])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn open_xterm(flags: Option<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let xterm_flags = flags.unwrap_or_default();
        let cmd = format!("DISPLAY={} xterm {}", XPRA_DISPLAY, xterm_flags);

        let output = Command::new(get_docker_cmd())
            .args(["exec", "-d", CONTAINER_NAME, "bash", "-c", &cmd])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn open_xemacs() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let cmd = format!("DISPLAY={} xemacs", XPRA_DISPLAY);
        let output = Command::new(get_docker_cmd())
            .args(["exec", "-d", CONTAINER_NAME, "bash", "-c", &cmd])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                stop_environment();
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_settings,
            save_settings,
            docker_build,
            docker_run,
            docker_stop,
            docker_status,
            docker_image_status,
            docker_daemon_status,
            xpra_attach,
            check_xpra_installed,
            open_terminal,
            open_xterm,
            open_xemacs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn xpra_client_kill_command_windows() {
        let (program, args) =
            xpra_client_kill_command("windows").expect("windows should have a kill command");
        assert_eq!(program, "taskkill");
        assert_eq!(args, vec!["/F", "/IM", "xpra_cmd.exe", "/T"]);
    }

    #[test]
    fn xpra_client_kill_command_macos_and_linux_match() {
        let (mac_program, mac_args) =
            xpra_client_kill_command("macos").expect("macos should have a kill command");
        let (linux_program, linux_args) =
            xpra_client_kill_command("linux").expect("linux should have a kill command");
        assert_eq!(mac_program, "pkill");
        assert_eq!(linux_program, "pkill");
        assert_eq!(mac_args, linux_args);
        assert_eq!(mac_args, vec!["-f", &xpra_tcp_target()]);
    }

    #[test]
    fn xpra_client_kill_command_unknown_os_is_none() {
        assert!(xpra_client_kill_command("freebsd").is_none());
    }

    #[test]
    fn xpra_tcp_target_uses_configured_port() {
        assert_eq!(
            xpra_tcp_target(),
            format!("tcp:127.0.0.1:{}", config::XPRA_PORT)
        );
    }

    #[test]
    fn validate_settings_accepts_empty_mappings() {
        let settings = Settings {
            mappings: vec![],
            ..Settings::default()
        };
        assert!(validate_settings(&settings).is_ok());
    }

    #[test]
    fn validate_settings_rejects_missing_host_path() {
        let settings = Settings {
            mappings: vec![Mapping {
                host_path: "/this/path/does/not/exist/x11vm-test".to_string(),
                container_path: "/mnt/a".to_string(),
            }],
            ..Settings::default()
        };
        assert!(validate_settings(&settings).is_err());
    }

    #[test]
    fn validate_settings_rejects_overlapping_host_paths() {
        let dir = tempfile::tempdir().expect("failed to create temp dir");
        let parent = dir.path().to_string_lossy().to_string();
        let child = dir.path().join("sub");
        fs::create_dir_all(&child).unwrap();
        let child = child.to_string_lossy().to_string();

        let settings = Settings {
            mappings: vec![
                Mapping {
                    host_path: parent.clone(),
                    container_path: "/mnt/a".to_string(),
                },
                Mapping {
                    host_path: child,
                    container_path: "/mnt/b".to_string(),
                },
            ],
            ..Settings::default()
        };
        assert!(validate_settings(&settings).is_err());
    }

    #[test]
    fn validate_settings_rejects_duplicate_container_paths() {
        let dir1 = tempfile::tempdir().expect("failed to create temp dir");
        let dir2 = tempfile::tempdir().expect("failed to create temp dir");

        let settings = Settings {
            mappings: vec![
                Mapping {
                    host_path: dir1.path().to_string_lossy().to_string(),
                    container_path: "/mnt/shared".to_string(),
                },
                Mapping {
                    host_path: dir2.path().to_string_lossy().to_string(),
                    container_path: "/mnt/shared".to_string(),
                },
            ],
            ..Settings::default()
        };
        assert!(validate_settings(&settings).is_err());
    }

    #[test]
    fn validate_settings_accepts_valid_distinct_mappings() {
        let dir1 = tempfile::tempdir().expect("failed to create temp dir");
        let dir2 = tempfile::tempdir().expect("failed to create temp dir");

        let settings = Settings {
            mappings: vec![
                Mapping {
                    host_path: dir1.path().to_string_lossy().to_string(),
                    container_path: "/mnt/a".to_string(),
                },
                Mapping {
                    host_path: dir2.path().to_string_lossy().to_string(),
                    container_path: "/mnt/b".to_string(),
                },
            ],
            ..Settings::default()
        };
        assert!(validate_settings(&settings).is_ok());
    }
}
