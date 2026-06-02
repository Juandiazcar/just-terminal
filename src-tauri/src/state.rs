use std::sync::{Arc, Mutex};

use crate::explorer::watcher::FsWatcher;
use crate::terminal::pty_manager::PtyManager;

pub struct AppState {
    pub pty_manager: Arc<Mutex<PtyManager>>,
    pub fs_watcher: Arc<Mutex<FsWatcher>>,
    pub db: Arc<Mutex<rusqlite::Connection>>,
}

unsafe impl Send for AppState {}
unsafe impl Sync for AppState {}
