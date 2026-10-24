#[cfg(unix)]
use std::path::Path;

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PlatformInfo {
    pub os: String,
    pub home_dir: String,
    pub path_separator: String,
    pub default_shell: Option<String>,
    pub shells: Vec<String>,
}

pub fn current_os() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    }
}

pub fn detect(home_dir: String) -> PlatformInfo {
    PlatformInfo {
        os: current_os().to_string(),
        home_dir,
        path_separator: std::path::MAIN_SEPARATOR.to_string(),
        default_shell: default_shell(),
        shells: installed_shells(),
    }
}

#[cfg(unix)]
fn default_shell() -> Option<String> {
    if let Ok(shell) = std::env::var("SHELL") {
        if Path::new(&shell).is_file() {
            return Some(shell);
        }
    }
    let fallback = if cfg!(target_os = "macos") { "/bin/zsh" } else { "/bin/bash" };
    [fallback, "/bin/sh"]
        .into_iter()
        .find(|p| Path::new(p).is_file())
        .map(str::to_string)
}

#[cfg(not(unix))]
fn default_shell() -> Option<String> {
    None
}

// /etc/shells is the canonical list of login shells on macOS and Linux.
#[cfg(unix)]
fn installed_shells() -> Vec<String> {
    let Ok(content) = std::fs::read_to_string("/etc/shells") else {
        return Vec::new();
    };
    let mut shells: Vec<String> = Vec::new();
    for line in content.lines().map(str::trim) {
        if line.is_empty() || line.starts_with('#') || !Path::new(line).is_file() {
            continue;
        }
        if !shells.iter().any(|s| s == line) {
            shells.push(line.to_string());
        }
    }
    shells
}

#[cfg(not(unix))]
fn installed_shells() -> Vec<String> {
    Vec::new()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_reports_separator_and_os() {
        let info = detect("/home/test".to_string());
        assert_eq!(info.path_separator, std::path::MAIN_SEPARATOR.to_string());
        assert!(["windows", "macos", "linux"].contains(&info.os.as_str()));
    }
}
