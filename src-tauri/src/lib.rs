use std::process::Command;
use std::path::PathBuf;
use std::fs;
use std::env;
use tauri::{AppHandle, Emitter};
use std::process::Stdio;
use std::io::BufReader;
use std::io::BufRead;

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
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn docker_run() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
        let mut x11vm_dir = home_dir.clone();
        x11vm_dir.push(".x11vm");
        
        if !x11vm_dir.exists() {
            fs::create_dir_all(&x11vm_dir).map_err(|e| e.to_string())?;
        }

        let host_path = x11vm_dir.to_str().unwrap();
        let guest_path = "/home/x11vm/.x11vm";

        let output = Command::new("docker")
            .args([
                "run",
                "-d",
                "--name", "x11vm-container",
                "--rm",
                "-p", "10000:10000",
                "-v", &format!("{}:{}", host_path, guest_path),
                "x11vm-image"
            ])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn docker_stop() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let output = Command::new("docker")
            .args(["rm", "-f", "x11vm-container"])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }).await.map_err(|e| e.to_string())?
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
    }).await.map_err(|e| e.to_string())?
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
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn xpra_attach() -> Result<String, String> {
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

        let output = Command::new(xpra_cmd)
            .args(["attach", "tcp:127.0.0.1:10000"])
            .output()
            .map_err(|e| format!("Failed to run xpra ({}): {}", xpra_cmd, e))?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn open_terminal() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let output = Command::new("docker")
            .args(["exec", "-d", "x11vm-container", "bash", "-c", "DISPLAY=:100 xfce4-terminal"])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn open_xterm() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let output = Command::new("docker")
            .args(["exec", "-d", "x11vm-container", "bash", "-c", "DISPLAY=:100 xterm"])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }).await.map_err(|e| e.to_string())?
}

#[tauri::command]
async fn open_xemacs() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let output = Command::new("docker")
            .args(["exec", "-d", "x11vm-container", "bash", "-c", "DISPLAY=:100 xemacs"])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }).await.map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            docker_build,
            docker_run,
            docker_stop,
            docker_status,
            docker_image_status,
            xpra_attach,
            open_terminal,
            open_xterm,
            open_xemacs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
