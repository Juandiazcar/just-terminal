use tauri::State;

use super::persistence::{self, SessionSnapshot};
use crate::state::AppState;

#[tauri::command]
pub async fn save_session(
    session: SessionSnapshot,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    persistence::save(&db, &session).map_err(|e| format!("Failed to save session: {e}"))
}

#[tauri::command]
pub async fn load_session(
    state: State<'_, AppState>,
) -> Result<Option<SessionSnapshot>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    persistence::load(&db).map_err(|e| format!("Failed to load session: {e}"))
}
