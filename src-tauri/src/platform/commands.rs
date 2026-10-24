use tauri::{AppHandle, Manager};

use super::info::{self, PlatformInfo};

#[tauri::command]
pub async fn get_platform_info(app: AppHandle) -> Result<PlatformInfo, String> {
    let home = app
        .path()
        .home_dir()
        .map_err(|e| format!("Failed to resolve home directory: {e}"))?;
    Ok(info::detect(home.to_string_lossy().to_string()))
}
