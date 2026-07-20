use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::io::BufRead;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::process::Stdio;
use tauri::{AppHandle, Emitter, Manager};

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
                }
            ],
            xpra_dpi: 0,
        }
    }
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

#[tauri::command]
async fn docker_build(app: AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut child = Command::new("docker")
            .args(["build", "-t", "x11vm-image", "../docker"])
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
            "x11vm-container".to_string(),
            "--rm".to_string(),
            "-p".to_string(),
            "10000:10000".to_string(),
            "-v".to_string(),
            format!("{}:{}", default_host_path, default_guest_path),
        ];

        // Add custom mappings
        for mapping in settings.mappings {
            args.push("-v".to_string());
            args.push(format!("{}:{}", mapping.host_path, mapping.container_path));
        }

        args.push("x11vm-image".to_string());

        let output = Command::new("docker")
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
        // Kill Xpra process first to avoid limbo state
        if env::consts::OS == "windows" {
            let _ = Command::new("taskkill")
                .args(["/F", "/IM", "xpra_cmd.exe", "/T"])
                .output();
        } else if env::consts::OS == "macos" {
            let _ = Command::new("pkill")
                .args(["-f", "tcp:127.0.0.1:10000"])
                .output();
        }

        let output = Command::new("docker")
            .args(["rm", "-f", "x11vm-container"])
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
        let output = Command::new("docker")
            .args(["images", "-q", "x11vm-image"])
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
        let output = Command::new("docker")
            .args(["ps", "-q", "-f", "name=x11vm-container"])
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
        let mut xpra_cmd = "xpra";

        if env::consts::OS == "windows" {
            let win_path = "C:\\Program Files\\Xpra\\Xpra_cmd.exe";
            if PathBuf::from(win_path).exists() {
                xpra_cmd = win_path;
            }
        } else if env::consts::OS == "macos" {
            let mac_path = "/Applications/Xpra.app/Contents/MacOS/Xpra";
            if PathBuf::from(mac_path).exists() {
                xpra_cmd = mac_path;
            }
        }

        let mut args = vec!["attach", "tcp:127.0.0.1:10000"];
        let dpi_str = format!("--dpi={}", dpi);
        if dpi > 0 {
            args.push(&dpi_str);
        }

        let output = Command::new(xpra_cmd)
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
        let mut xpra_cmd = "xpra";

        if env::consts::OS == "windows" {
            let win_path = "C:\\Program Files\\Xpra\\Xpra_cmd.exe";
            if PathBuf::from(win_path).exists() {
                xpra_cmd = win_path;
            }
        } else if env::consts::OS == "macos" {
            let mac_path = "/Applications/Xpra.app/Contents/MacOS/Xpra";
            if PathBuf::from(mac_path).exists() {
                xpra_cmd = mac_path;
            }
        }

        // Just check if we can get the version
        let output = Command::new(xpra_cmd)
            .args(["--version"])
            .output();

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
        let output = Command::new("docker")
            .args([
                "exec",
                "-d",
                "x11vm-container",
                "bash",
                "-c",
                "DISPLAY=:100 xfce4-terminal",
            ])
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
        let cmd = format!("DISPLAY=:100 xterm {}", xterm_flags);
        
        let output = Command::new("docker")
            .args([
                "exec",
                "-d",
                "x11vm-container",
                "bash",
                "-c",
                &cmd,
            ])
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
        let output = Command::new("docker")
            .args([
                "exec",
                "-d",
                "x11vm-container",
                "bash",
                "-c",
                "DISPLAY=:100 xemacs",
            ])
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
                // Ensure container is stopped when closing the app (max 1s wait)
                let _ = Command::new("docker")
                    .args(["stop", "-t", "1", "x11vm-container"])
                    .output();
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
            xpra_attach,
            check_xpra_installed,
            open_terminal,
            open_xterm,
            open_xemacs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
