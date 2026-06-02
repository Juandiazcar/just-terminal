use anyhow::Result;
use git2::{Repository, Sort, StatusOptions, StatusShow};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    pub branch: String,
    pub is_repo: bool,
    pub is_dirty: bool,
    pub modified_count: usize,
    pub staged_count: usize,
    pub untracked_count: usize,
    pub ahead: usize,
    pub behind: usize,
}

impl GitStatus {
    pub fn not_a_repo() -> Self {
        Self {
            branch: String::new(),
            is_repo: false,
            is_dirty: false,
            modified_count: 0,
            staged_count: 0,
            untracked_count: 0,
            ahead: 0,
            behind: 0,
        }
    }
}

pub fn get_status(path: &str) -> Result<GitStatus> {
    let repo = match Repository::discover(path) {
        Ok(r) => r,
        Err(_) => return Ok(GitStatus::not_a_repo()),
    };

    let branch = repo
        .head()
        .ok()
        .and_then(|h| h.shorthand().map(|s| s.to_string()))
        .unwrap_or_else(|| "HEAD".to_string());

    let mut opts = StatusOptions::new();
    opts.show(StatusShow::IndexAndWorkdir)
        .include_untracked(true)
        .exclude_submodules(true);

    let statuses = repo.statuses(Some(&mut opts))?;

    let mut modified_count = 0;
    let mut staged_count = 0;
    let mut untracked_count = 0;

    for entry in statuses.iter() {
        let s = entry.status();
        if s.is_wt_modified() || s.is_wt_deleted() || s.is_wt_renamed() {
            modified_count += 1;
        }
        if s.is_index_modified() || s.is_index_new() || s.is_index_deleted() || s.is_index_renamed()
        {
            staged_count += 1;
        }
        if s.is_wt_new() {
            untracked_count += 1;
        }
    }

    let (ahead, behind) = get_ahead_behind(&repo).unwrap_or((0, 0));

    Ok(GitStatus {
        branch,
        is_repo: true,
        is_dirty: modified_count > 0 || staged_count > 0 || untracked_count > 0,
        modified_count,
        staged_count,
        untracked_count,
        ahead,
        behind,
    })
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CommitInfo {
    pub id: String,
    pub message: String,
    pub author: String,
    pub time: i64,
    pub parents: Vec<String>,
    pub refs: Vec<String>,
}

pub fn get_log(path: &str, limit: usize) -> Result<Vec<CommitInfo>> {
    let repo = match Repository::discover(path) {
        Ok(r) => r,
        Err(_) => return Ok(vec![]),
    };

    let mut revwalk = repo.revwalk()?;
    if revwalk.push_head().is_err() {
        return Ok(vec![]);
    }
    revwalk.set_sorting(Sort::TIME | Sort::TOPOLOGICAL)?;

    // Build ref map: oid → list of ref names
    let mut ref_map: std::collections::HashMap<String, Vec<String>> = std::collections::HashMap::new();
    for reference in repo.references()?.flatten() {
        if let (Some(name), Some(target)) = (reference.shorthand(), reference.target()) {
            ref_map
                .entry(target.to_string())
                .or_default()
                .push(name.to_string());
        }
    }

    let mut commits = Vec::new();
    for oid in revwalk.take(limit) {
        let oid = oid?;
        let commit = repo.find_commit(oid)?;
        let full_id = oid.to_string();
        let short_id = &full_id[..7];

        let parents: Vec<String> = commit
            .parent_ids()
            .map(|p| p.to_string()[..7].to_string())
            .collect();

        let refs = ref_map.get(&full_id).cloned().unwrap_or_default();

        commits.push(CommitInfo {
            id: short_id.to_string(),
            message: commit.summary().unwrap_or("").to_string(),
            author: commit.author().name().unwrap_or("").to_string(),
            time: commit.time().seconds(),
            parents,
            refs,
        });
    }

    Ok(commits)
}

pub fn get_branches(path: &str) -> Result<Vec<String>> {
    let repo = Repository::discover(path)?;
    let branches = repo.branches(Some(git2::BranchType::Local))?;
    let mut names = Vec::new();
    for branch in branches {
        let (branch, _) = branch?;
        if let Some(name) = branch.name()? {
            names.push(name.to_string());
        }
    }
    Ok(names)
}

fn get_ahead_behind(repo: &Repository) -> Option<(usize, usize)> {
    let head = repo.head().ok()?;
    let head_oid = head.target()?;
    let upstream = repo
        .find_branch(head.shorthand()?, git2::BranchType::Local)
        .ok()?
        .upstream()
        .ok()?;
    let upstream_oid = upstream.get().target()?;
    let (ahead, behind) = repo.graph_ahead_behind(head_oid, upstream_oid).ok()?;
    Some((ahead, behind))
}
