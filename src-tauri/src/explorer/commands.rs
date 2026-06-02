use tauri::{AppHandle, State};

use super::fs_ops::{self, DirEntry};
use crate::state::AppState;

#[tauri::command]
pub async fn list_dir(
    path: String,
    show_hidden: Option<bool>,
    state: State<'_, AppState>,
) -> Result<Vec<DirEntry>, String> {
    let _ = state;
    fs_ops::list_dir(&path, show_hidden.unwrap_or(false))
        .map_err(|e| format!("Failed to list directory '{path}': {e}"))
}

#[tauri::command]
pub async fn create_file(path: String) -> Result<(), String> {
    fs_ops::create_file(&path).map_err(|e| format!("Failed to create file '{path}': {e}"))
}

#[tauri::command]
pub async fn create_dir(path: String) -> Result<(), String> {
    fs_ops::create_dir(&path).map_err(|e| format!("Failed to create directory '{path}': {e}"))
}

#[tauri::command]
pub async fn rename_entry(from: String, to: String) -> Result<(), String> {
    fs_ops::rename_entry(&from, &to)
        .map_err(|e| format!("Failed to rename '{from}' to '{to}': {e}"))
}

#[tauri::command]
pub async fn delete_entry(path: String, recursive: bool) -> Result<(), String> {
    fs_ops::delete_entry(&path, recursive)
        .map_err(|e| format!("Failed to delete '{path}': {e}"))
}

#[tauri::command]
pub async fn copy_entry(from: String, to: String) -> Result<(), String> {
    fs_ops::copy_entry(&from, &to)
        .map_err(|e| format!("Failed to copy '{from}' to '{to}': {e}"))
}

#[tauri::command]
pub async fn search_files(root: String, query: String) -> Result<Vec<DirEntry>, String> {
    fs_ops::search_files(&root, &query, 60)
        .map_err(|e| format!("Search failed: {e}"))
}

#[tauri::command]
pub async fn watch_dir(
    path: String,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<(), String> {
    let mut watcher = state.fs_watcher.lock().map_err(|e| e.to_string())?;
    watcher
        .watch(path.clone(), app)
        .map_err(|e| format!("Failed to watch directory '{path}': {e}"))
}

#[tauri::command]
pub async fn unwatch_dir(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let mut watcher = state.fs_watcher.lock().map_err(|e| e.to_string())?;
    watcher.unwatch(&path);
    Ok(())
}
