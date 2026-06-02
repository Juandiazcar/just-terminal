use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};

use anyhow::Result;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use super::session::PtySession;

pub struct PtyManager {
    sessions: HashMap<String, PtySession>,
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

        let mut cmd = CommandBuilder::new(&shell);
        for arg in &args {
            cmd.arg(arg);
        }
        cmd.cwd(&cwd);

        let _child = pair.slave.spawn_command(cmd)?;

        let mut reader = pair.master.try_clone_reader()?;
        let writer = pair.master.take_writer()?;

        let id_clone = id.clone();
        let app_clone = app.clone();

        std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match reader.read(&mut buf) {
                    Ok(0) | Err(_) => break,
                    Ok(n) => {
                        let output = String::from_utf8_lossy(&buf[..n]).to_string();
                        let _ = app_clone.emit(&format!("pty_output_{}", id_clone), output);
                    }
                }
            }
            let _ = app_clone.emit(&format!("terminal_closed_{}", id_clone), 0i32);
        });

        let session = PtySession {
            id: id.clone(),
            cwd: Arc::new(Mutex::new(cwd)),
            master: pair.master,
            writer,
        };
        self.sessions.insert(id.clone(), session);

        Ok(id)
    }

    pub fn write_input(&mut self, id: &str, data: &str) -> Result<()> {
        let session = self
            .sessions
            .get_mut(id)
            .ok_or_else(|| anyhow::anyhow!("Terminal not found: {}", id))?;
        session.writer.write_all(data.as_bytes())?;
        Ok(())
    }

    pub fn resize(&mut self, id: &str, cols: u16, rows: u16) -> Result<()> {
        let session = self
            .sessions
            .get_mut(id)
            .ok_or_else(|| anyhow::anyhow!("Terminal not found: {}", id))?;
        session.master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;
        Ok(())
    }

    pub fn kill(&mut self, id: &str) -> Result<()> {
        self.sessions.remove(id);
        Ok(())
    }

    pub fn set_cwd(&mut self, id: &str, cwd: String) -> Result<()> {
        let session = self
            .sessions
            .get_mut(id)
            .ok_or_else(|| anyhow::anyhow!("Terminal not found: {}", id))?;
        let mut lock = session.cwd.lock().map_err(|e| anyhow::anyhow!("{e}"))?;
        *lock = cwd;
        Ok(())
    }

    pub fn get_cwd(&self, id: &str) -> Option<String> {
        let session = self.sessions.get(id)?;
        let lock = session.cwd.lock().ok()?;
        Some(lock.clone())
    }
}
