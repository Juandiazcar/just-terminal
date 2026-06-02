use anyhow::Result;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ShellProfile {
    pub name: String,
    pub executable: String,
    pub args: Vec<String>,
    pub env: Option<std::collections::HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PaneSnapshot {
    pub shell: ShellProfile,
    pub cwd: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SplitSnapshot {
    pub direction: Option<String>,
    pub panes: Vec<PaneSnapshot>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TabSnapshot {
    pub id: String,
    pub title: String,
    pub shell: ShellProfile,
    pub cwd: String,
    pub splits: Vec<SplitSnapshot>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuickCommand {
    pub id: String,
    pub label: String,
    pub command: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionSnapshot {
    pub tabs: Vec<TabSnapshot>,
    pub active_tab_id: String,
    pub sidebar_width: u32,
    pub favorites: Vec<String>,
    pub recent_dirs: Vec<String>,
    pub quick_commands: Vec<QuickCommand>,
    pub theme: String,
}

pub fn init_db(conn: &Connection) -> Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS session (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );",
    )?;
    Ok(())
}

pub fn save(conn: &Connection, snapshot: &SessionSnapshot) -> Result<()> {
    let json = serde_json::to_string(snapshot)?;
    conn.execute(
        "INSERT OR REPLACE INTO session (key, value) VALUES ('main', ?1)",
        rusqlite::params![json],
    )?;
    Ok(())
}

pub fn load(conn: &Connection) -> Result<Option<SessionSnapshot>> {
    let result: Option<String> = conn
        .query_row(
            "SELECT value FROM session WHERE key = 'main'",
            [],
            |row| row.get(0),
        )
        .ok();

    match result {
        Some(json) => Ok(Some(serde_json::from_str(&json)?)),
        None => Ok(None),
    }
}
