pub mod explorer;
pub mod git;
pub mod session;
pub mod state;
pub mod terminal;

use std::sync::{Arc, Mutex};
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            let app_data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&app_data_dir)?;
            let db_path = app_data_dir.join("powershell_explorer.db");
            let db = rusqlite::Connection::open(&db_path)
                .map_err(|e| format!("Failed to open database: {e}"))?;
            session::persistence::init_db(&db)
                .map_err(|e| format!("Failed to init database: {e}"))?;

            let state = state::AppState {
                pty_manager: Arc::new(Mutex::new(terminal::pty_manager::PtyManager::new())),
                fs_watcher: Arc::new(Mutex::new(explorer::watcher::FsWatcher::new())),
                db: Arc::new(Mutex::new(db)),
            };
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            terminal::commands::create_terminal,
            terminal::commands::write_pty_input,
            terminal::commands::resize_pty,
            terminal::commands::kill_terminal,
            terminal::commands::set_terminal_cwd,
            explorer::commands::search_files,
            explorer::commands::list_dir,
            explorer::commands::create_file,
            explorer::commands::create_dir,
            explorer::commands::rename_entry,
            explorer::commands::delete_entry,
            explorer::commands::copy_entry,
            explorer::commands::watch_dir,
            explorer::commands::unwatch_dir,
            git::commands::git_log,
            git::commands::git_status,
            git::commands::git_fetch,
            git::commands::git_pull,
            git::commands::git_push,
            git::commands::git_checkout,
            git::commands::git_branches,
            git::commands::git_stash,
            git::commands::git_stash_pop,
            session::commands::save_session,
            session::commands::load_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
