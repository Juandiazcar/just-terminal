use tauri::{AppHandle, State};

use crate::state::AppState;

#[tauri::command]
pub async fn create_terminal(
    shell: String,
    args: Vec<String>,
    cwd: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<String, String> {
    let mut manager = state
        .pty_manager
        .lock()
        .map_err(|e| e.to_string())?;
    manager
        .spawn(shell, args, cwd, app)
        .map_err(|e| format!("Failed to create terminal: {e}"))
}

#[tauri::command]
pub async fn write_pty_input(
    id: String,
    data: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut manager = state
        .pty_manager
        .lock()
        .map_err(|e| e.to_string())?;
    manager
        .write_input(&id, &data)
        .map_err(|e| format!("Failed to write input to terminal {id}: {e}"))
}

#[tauri::command]
pub async fn resize_pty(
    id: String,
    cols: u16,
    rows: u16,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut manager = state
        .pty_manager
        .lock()
        .map_err(|e| e.to_string())?;
    manager
        .resize(&id, cols, rows)
        .map_err(|e| format!("Failed to resize terminal {id}: {e}"))
}

#[tauri::command]
pub async fn kill_terminal(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut manager = state
        .pty_manager
        .lock()
        .map_err(|e| e.to_string())?;
    manager
        .kill(&id)
        .map_err(|e| format!("Failed to kill terminal {id}: {e}"))
}

#[tauri::command]
pub async fn set_terminal_cwd(
    id: String,
    cwd: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut manager = state
        .pty_manager
        .lock()
        .map_err(|e| e.to_string())?;
    manager
        .set_cwd(&id, cwd)
        .map_err(|e| format!("Failed to set cwd for terminal {id}: {e}"))
}
