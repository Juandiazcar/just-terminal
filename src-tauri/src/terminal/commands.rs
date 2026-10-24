use std::sync::Arc;

use tauri::{AppHandle, State};

use super::session::PtySession;
use crate::state::AppState;

// The manager lock is held only for the map lookup; all I/O happens on the per-session locks,
// so a stalled shell can never block other terminals.
fn session_of(state: &State<'_, AppState>, id: &str) -> Result<Arc<PtySession>, String> {
    let manager = state.pty_manager.lock().map_err(|e| e.to_string())?;
    manager.get(id).map_err(|e| e.to_string())
}

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
    session_of(&state, &id)?
        .write_input(&data)
        .map_err(|e| format!("Failed to write input to terminal {id}: {e}"))
}

#[tauri::command]
pub async fn resize_pty(
    id: String,
    cols: u16,
    rows: u16,
    state: State<'_, AppState>,
) -> Result<(), String> {
    session_of(&state, &id)?
        .resize(cols, rows)
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
    session_of(&state, &id)?.set_cwd(cwd);
    Ok(())
}

/// Frontend reports how many output events xterm has finished rendering.
#[tauri::command]
pub async fn ack_pty_output(
    id: String,
    count: usize,
    state: State<'_, AppState>,
) -> Result<(), String> {
    session_of(&state, &id)?.flow.ack(count);
    Ok(())
}

/// A terminal view attaches on mount and detaches on unmount; only attached views apply backpressure.
#[tauri::command]
pub async fn set_pty_attached(
    id: String,
    attached: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    session_of(&state, &id)?.flow.set_attached(attached);
    Ok(())
}
