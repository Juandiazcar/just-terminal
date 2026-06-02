use anyhow::Result;
use git2::{AutotagOption, FetchOptions, PushOptions, Repository};

pub fn git_fetch(path: &str) -> Result<()> {
    let repo = Repository::discover(path)?;
    let mut remote = repo.find_remote("origin")?;
    let mut opts = FetchOptions::new();
    opts.download_tags(AutotagOption::Auto);
    remote.fetch(&[] as &[&str], Some(&mut opts), None)?;
    Ok(())
}

pub fn git_pull(path: &str) -> Result<()> {
    git_fetch(path)?;

    let repo = Repository::discover(path)?;
    let head = repo.head()?;
    let branch_name = head
        .shorthand()
        .ok_or_else(|| anyhow::anyhow!("Not on a branch"))?
        .to_string();

    let fetch_head = repo.find_reference("FETCH_HEAD")?;
    let fetch_commit = repo.reference_to_annotated_commit(&fetch_head)?;

    let (analysis, _) = repo.merge_analysis(&[&fetch_commit])?;

    if analysis.is_fast_forward() {
        let refname = format!("refs/heads/{}", branch_name);
        let mut reference = repo.find_reference(&refname)?;
        reference.set_target(fetch_commit.id(), "Fast-forward")?;
        repo.set_head(&refname)?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))?;
    } else if analysis.is_normal() {
        return Err(anyhow::anyhow!("Merge required — use git merge manually"));
    }

    Ok(())
}

pub fn git_push(path: &str) -> Result<()> {
    let repo = Repository::discover(path)?;
    let mut remote = repo.find_remote("origin")?;
    let head = repo.head()?;
    let branch = head
        .shorthand()
        .ok_or_else(|| anyhow::anyhow!("Not on a branch"))?;
    let refspec = format!("refs/heads/{}:refs/heads/{}", branch, branch);
    let mut opts = PushOptions::new();
    remote.push(&[refspec.as_str()], Some(&mut opts))?;
    Ok(())
}

pub fn git_checkout(path: &str, branch: &str) -> Result<()> {
    let repo = Repository::discover(path)?;
    let (object, reference) = repo.revparse_ext(branch)?;
    repo.checkout_tree(&object, None)?;
    if let Some(r) = reference {
        repo.set_head(r.name().unwrap_or(branch))?;
    } else {
        repo.set_head_detached(object.id())?;
    }
    Ok(())
}

pub fn git_stash(path: &str) -> Result<()> {
    let mut repo = Repository::discover(path)?;
    let sig = repo.signature()?;
    repo.stash_save(&sig, "WIP stash", None)?;
    Ok(())
}

pub fn git_stash_pop(path: &str) -> Result<()> {
    let mut repo = Repository::discover(path)?;
    repo.stash_pop(0, None)?;
    Ok(())
}
