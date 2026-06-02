use std::collections::HashMap;
use std::path::Path;
use std::time::Duration;

use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FsChangeEvent {
    pub kind: String,
    pub path: String,
    pub new_path: Option<String>,
}

pub struct FsWatcher {
    watchers: HashMap<String, RecommendedWatcher>,
}

impl FsWatcher {
    pub fn new() -> Self {
        Self {
            watchers: HashMap::new(),
        }
    }

    pub fn watch(&mut self, path: String, app: AppHandle) -> notify::Result<()> {
        let app_clone = app.clone();
        let path_clone = path.clone();

        let mut watcher = RecommendedWatcher::new(
            move |result: notify::Result<Event>| {
                if let Ok(event) = result {
                    let fs_event = event_to_fs_change(&event);
                    let _ = app_clone.emit("fs_change", fs_event);
                }
            },
            Config::default().with_poll_interval(Duration::from_millis(100)),
        )?;

        watcher.watch(Path::new(&path_clone), RecursiveMode::Recursive)?;
        self.watchers.insert(path, watcher);
        Ok(())
    }

    pub fn unwatch(&mut self, path: &str) {
        self.watchers.remove(path);
    }
}

fn event_to_fs_change(event: &Event) -> FsChangeEvent {
    let kind = match event.kind {
        EventKind::Create(_) => "created",
        EventKind::Remove(_) => "deleted",
        EventKind::Modify(notify::event::ModifyKind::Name(_)) => "renamed",
        EventKind::Modify(_) => "modified",
        _ => "modified",
    };

    let path = event
        .paths
        .first()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();

    let new_path = if kind == "renamed" {
        event
            .paths
            .get(1)
            .map(|p| p.to_string_lossy().to_string())
    } else {
        None
    };

    FsChangeEvent {
        kind: kind.to_string(),
        path,
        new_path,
    }
}
