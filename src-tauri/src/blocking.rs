/// Runs blocking work (disk, libgit2) on tokio's blocking pool so async commands
/// never stall the runtime workers that serve IPC and PTY events.
pub async fn run<T, F>(work: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tokio::task::spawn_blocking(work)
        .await
        .map_err(|e| format!("Background task failed: {e}"))?
}
