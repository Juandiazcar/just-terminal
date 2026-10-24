use tauri::State;

use super::actions;
use super::repository::{self, CommitInfo, GitStatus};
use crate::blocking;
use crate::state::AppState;

#[tauri::command]
pub async fn git_log(path: String, limit: Option<usize>) -> Result<Vec<CommitInfo>, String> {
    blocking::run(move || {
        repository::get_log(&path, limit.unwrap_or(100))
            .map_err(|e| format!("git log failed: {e}"))
    })
    .await
}

#[tauri::command]
pub async fn git_status(path: String, _state: State<'_, AppState>) -> Result<GitStatus, String> {
    blocking::run(move || {
        repository::get_status(&path).map_err(|e| format!("git status failed for '{path}': {e}"))
    })
    .await
}

#[tauri::command]
pub async fn git_fetch(path: String) -> Result<(), String> {
    blocking::run(move || {
        actions::git_fetch(&path).map_err(|e| format!("git fetch failed: {e}"))
    })
    .await
}

#[tauri::command]
pub async fn git_pull(path: String) -> Result<(), String> {
    blocking::run(move || {
        actions::git_pull(&path).map_err(|e| format!("git pull failed: {e}"))
    })
    .await
}

#[tauri::command]
pub async fn git_push(path: String) -> Result<(), String> {
    blocking::run(move || {
        actions::git_push(&path).map_err(|e| format!("git push failed: {e}"))
    })
    .await
}

#[tauri::command]
pub async fn git_checkout(path: String, branch: String) -> Result<(), String> {
    blocking::run(move || {
        actions::git_checkout(&path, &branch)
            .map_err(|e| format!("git checkout '{branch}' failed: {e}"))
    })
    .await
}

#[tauri::command]
pub async fn git_branches(path: String) -> Result<Vec<String>, String> {
    blocking::run(move || {
        repository::get_branches(&path).map_err(|e| format!("Failed to list branches: {e}"))
    })
    .await
}

#[tauri::command]
pub async fn git_stash(path: String) -> Result<(), String> {
    blocking::run(move || {
        actions::git_stash(&path).map_err(|e| format!("git stash failed: {e}"))
    })
    .await
}

#[tauri::command]
pub async fn git_stash_pop(path: String) -> Result<(), String> {
    blocking::run(move || {
        actions::git_stash_pop(&path).map_err(|e| format!("git stash pop failed: {e}"))
    })
    .await
}
