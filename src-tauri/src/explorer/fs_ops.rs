use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub is_hidden: bool,
    pub size: Option<u64>,
    pub modified_at: Option<u64>,
}

pub fn list_dir(path: &str, show_hidden: bool) -> Result<Vec<DirEntry>> {
    let dir = Path::new(path);
    let mut entries = Vec::new();

    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let name = entry.file_name().to_string_lossy().to_string();
        let is_hidden = name.starts_with('.');

        if !show_hidden && is_hidden {
            continue;
        }

        let metadata = entry.metadata()?;
        let modified_at = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs());

        entries.push(DirEntry {
            path: entry.path().to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            is_hidden,
            size: if metadata.is_file() {
                Some(metadata.len())
            } else {
                None
            },
            modified_at,
            name,
        });
    }

    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    Ok(entries)
}

pub fn create_file(path: &str) -> Result<()> {
    fs::write(path, "")?;
    Ok(())
}

pub fn create_dir(path: &str) -> Result<()> {
    fs::create_dir_all(path)?;
    Ok(())
}

pub fn rename_entry(from: &str, to: &str) -> Result<()> {
    fs::rename(from, to)?;
    Ok(())
}

pub fn delete_entry(path: &str, recursive: bool) -> Result<()> {
    let meta = fs::metadata(path)?;
    if meta.is_dir() {
        if recursive {
            fs::remove_dir_all(path)?;
        } else {
            fs::remove_dir(path)?;
        }
    } else {
        fs::remove_file(path)?;
    }
    Ok(())
}

pub fn search_files(root: &str, query: &str, max_results: usize) -> Result<Vec<DirEntry>> {
    let mut results = Vec::new();
    search_recursive(
        std::path::Path::new(root),
        &query.to_lowercase(),
        &mut results,
        max_results,
        0,
    );
    Ok(results)
}

fn search_recursive(
    dir: &std::path::Path,
    query: &str,
    results: &mut Vec<DirEntry>,
    max: usize,
    depth: usize,
) {
    if results.len() >= max || depth > 8 {
        return;
    }
    let read = match std::fs::read_dir(dir) {
        Ok(r) => r,
        Err(_) => return,
    };
    for entry in read.flatten() {
        if results.len() >= max {
            return;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        if name.to_lowercase().contains(query) {
            let modified_at = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_secs());
            results.push(DirEntry {
                name,
                path: entry.path().to_string_lossy().to_string(),
                is_dir: meta.is_dir(),
                is_hidden: false,
                size: if meta.is_file() { Some(meta.len()) } else { None },
                modified_at,
            });
        }
        if meta.is_dir() {
            search_recursive(&entry.path(), query, results, max, depth + 1);
        }
    }
}

pub fn copy_entry(from: &str, to: &str) -> Result<()> {
    let from_path = Path::new(from);
    let to_path = Path::new(to);
    if from_path.is_dir() {
        copy_dir_recursive(from_path, to_path)?;
    } else {
        fs::copy(from, to)?;
    }
    Ok(())
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let dest = dst.join(entry.file_name());
        if entry.metadata()?.is_dir() {
            copy_dir_recursive(&entry.path(), &dest)?;
        } else {
            fs::copy(entry.path(), dest)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_create_and_delete_file() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("test.txt");
        create_file(path.to_str().unwrap()).unwrap();
        assert!(path.exists());
        delete_entry(path.to_str().unwrap(), false).unwrap();
        assert!(!path.exists());
    }

    #[test]
    fn test_list_dir() {
        let dir = TempDir::new().unwrap();
        create_file(dir.path().join("a.txt").to_str().unwrap()).unwrap();
        create_dir(dir.path().join("b").to_str().unwrap()).unwrap();
        let entries = list_dir(dir.path().to_str().unwrap(), true).unwrap();
        assert_eq!(entries.len(), 2);
        assert!(entries[0].is_dir); // dirs first
    }
}
