use std::collections::HashMap;
use std::io::Read;
use std::sync::Arc;

use anyhow::Result;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

use super::session::PtySession;
use super::shell_integration;
use crate::state::AppState;

// Large reads cut IPC events under heavy output; blocking reads still return
// immediately with whatever is available, so interactive latency is unaffected.
const READ_BUF_SIZE: usize = 32 * 1024;
const READER_STACK_SIZE: usize = 256 * 1024;

pub struct PtyManager {
    sessions: HashMap<String, Arc<PtySession>>,
}

impl Default for PtyManager {
    fn default() -> Self {
        Self::new()
    }
}

impl PtyManager {
    pub fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }

    pub fn spawn(&mut self, shell: String, args: Vec<String>, cwd: String, app: AppHandle) -> Result<String> {
        let id = Uuid::new_v4().to_string();
        let pty_system = native_pty_system();

        let pair = pty_system.openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })?;

        // Integration failure must never block a shell from starting.
        let integration = app
            .path()
            .app_data_dir()
            .map_err(anyhow::Error::from)
            .and_then(|dir| shell_integration::prepare(&shell, &dir))
            .unwrap_or_default();

        let mut cmd = CommandBuilder::new(&shell);
        for arg in args.iter().chain(integration.args.iter()) {
            cmd.arg(arg);
        }
        if cfg!(unix) {
            cmd.env("TERM", "xterm-256color");
            cmd.env("COLORTERM", "truecolor");
        }
        for (key, value) in &integration.envs {
            cmd.env(key, value);
        }
        cmd.cwd(&cwd);

        let mut child = pair.slave.spawn_command(cmd)?;
        // The slave end must be closed in the parent or EOF is never delivered on Unix.
        drop(pair.slave);

        let mut reader = pair.master.try_clone_reader()?;
        let writer = pair.master.take_writer()?;

        let session = Arc::new(PtySession::new(
            id.clone(),
            cwd,
            pair.master,
            writer,
            child.clone_killer(),
        ));
        // The reader holds only the flow handle, never the session: dropping the session
        // (kill) must release the master so the reader sees EOF.
        let flow = session.flow.clone();
        // Registered before the reader starts so an instantly-dying shell is still cleaned up.
        self.sessions.insert(id.clone(), session);

        let id_clone = id.clone();
        let app_clone = app.clone();
        let event_name = format!("pty_output_{id}");

        let spawned = std::thread::Builder::new()
            .name(format!("pty-reader-{id}"))
            .stack_size(READER_STACK_SIZE)
            .spawn(move || {
                let mut buf = vec![0u8; READ_BUF_SIZE];
                let mut filled = 0usize;
                loop {
                    match reader.read(&mut buf[filled..]) {
                        Ok(0) | Err(_) => break,
                        Ok(n) => {
                            filled += n;
                            let (output, consumed) = decode_chunk(&buf[..filled]);
                            if !output.is_empty() {
                                flow.wait_for_capacity();
                                let _ = app_clone.emit(&event_name, output);
                                flow.record_emit();
                            }
                            // Keep a trailing partial UTF-8 sequence for the next read.
                            buf.copy_within(consumed..filled, 0);
                            filled -= consumed;
                        }
                    }
                }

                // Reaps the child (no zombies on Unix) and reports its real exit code.
                let code = child
                    .wait()
                    .map(|status| status.exit_code() as i32)
                    .unwrap_or(0);

                // Release master/writer FDs of a process that exited on its own.
                if let Ok(mut manager) = app_clone.state::<AppState>().pty_manager.lock() {
                    manager.sessions.remove(&id_clone);
                }
                let _ = app_clone.emit(&format!("terminal_closed_{}", id_clone), code);
            });

        if let Err(e) = spawned {
            self.sessions.remove(&id);
            return Err(e.into());
        }

        Ok(id)
    }

    pub fn get(&self, id: &str) -> Result<Arc<PtySession>> {
        self.sessions
            .get(id)
            .cloned()
            .ok_or_else(|| anyhow::anyhow!("Terminal not found: {}", id))
    }

    pub fn kill(&mut self, id: &str) -> Result<()> {
        if let Some(session) = self.sessions.remove(id) {
            session.kill();
        }
        Ok(())
    }
}

/// Decodes the longest valid UTF-8 prefix with a single allocation.
/// Returns the text and how many bytes were consumed; an incomplete trailing
/// sequence is left unconsumed, genuinely invalid bytes are replaced.
fn decode_chunk(data: &[u8]) -> (String, usize) {
    match std::str::from_utf8(data) {
        Ok(text) => (text.to_owned(), data.len()),
        Err(e) if e.error_len().is_none() => {
            let valid = e.valid_up_to();
            // valid_up_to() is a char boundary by contract.
            (String::from_utf8_lossy(&data[..valid]).into_owned(), valid)
        }
        Err(_) => (String::from_utf8_lossy(data).into_owned(), data.len()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_decode_chunk_keeps_partial_sequence() {
        let bytes = "añ".as_bytes(); // 'ñ' is 2 bytes
        let (text, consumed) = decode_chunk(&bytes[..2]);
        assert_eq!(text, "a");
        assert_eq!(consumed, 1);
    }

    #[test]
    fn test_decode_chunk_replaces_invalid_bytes() {
        let (text, consumed) = decode_chunk(&[b'a', 0xFF, b'b']);
        assert_eq!(text, "a\u{FFFD}b");
        assert_eq!(consumed, 3);
    }
}
