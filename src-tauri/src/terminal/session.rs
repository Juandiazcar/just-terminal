use std::io::Write;
use std::sync::{Arc, Condvar, Mutex, MutexGuard};
use std::time::Duration;

use anyhow::Result;
use portable_pty::{ChildKiller, MasterPty, PtySize};

// Output events the frontend may leave unprocessed before the reader pauses.
// 32 events x 32 KB read buffer bounds webview memory at roughly 1 MB per terminal.
const MAX_PENDING_EVENTS: usize = 32;
const STALL_TIMEOUT: Duration = Duration::from_secs(3);

// A poisoned lock only means another thread panicked; the data is still usable.
fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(|e| e.into_inner())
}

#[derive(Default)]
struct FlowState {
    attached: bool,
    closed: bool,
    pending: usize,
}

/// Backpressure between the PTY reader thread and the frontend renderer.
/// Only applies while a terminal view is attached; a detached PTY never blocks.
#[derive(Default)]
pub struct FlowControl {
    state: Mutex<FlowState>,
    capacity: Condvar,
}

impl FlowControl {
    pub fn wait_for_capacity(&self) {
        let mut state = lock(&self.state);
        while state.attached && !state.closed && state.pending >= MAX_PENDING_EVENTS {
            let (guard, timeout) = self
                .capacity
                .wait_timeout(state, STALL_TIMEOUT)
                .unwrap_or_else(|e| e.into_inner());
            state = guard;
            if timeout.timed_out() {
                // Frontend vanished without detaching (e.g. webview reload): stop throttling.
                state.attached = false;
                state.pending = 0;
            }
        }
    }

    pub fn record_emit(&self) {
        let mut state = lock(&self.state);
        if state.attached {
            state.pending += 1;
        }
    }

    pub fn ack(&self, count: usize) {
        let mut state = lock(&self.state);
        state.pending = state.pending.saturating_sub(count);
        self.capacity.notify_all();
    }

    pub fn set_attached(&self, attached: bool) {
        let mut state = lock(&self.state);
        state.attached = attached;
        state.pending = 0;
        self.capacity.notify_all();
    }

    pub fn close(&self) {
        lock(&self.state).closed = true;
        self.capacity.notify_all();
    }
}

pub struct PtySession {
    pub id: String,
    pub flow: Arc<FlowControl>,
    cwd: Mutex<String>,
    master: Mutex<Box<dyn MasterPty + Send>>,
    writer: Mutex<Box<dyn Write + Send>>,
    killer: Mutex<Box<dyn ChildKiller + Send + Sync>>,
}

impl PtySession {
    pub fn new(
        id: String,
        cwd: String,
        master: Box<dyn MasterPty + Send>,
        writer: Box<dyn Write + Send>,
        killer: Box<dyn ChildKiller + Send + Sync>,
    ) -> Self {
        Self {
            id,
            flow: Arc::new(FlowControl::default()),
            cwd: Mutex::new(cwd),
            master: Mutex::new(master),
            writer: Mutex::new(writer),
            killer: Mutex::new(killer),
        }
    }

    pub fn write_input(&self, data: &str) -> Result<()> {
        lock(&self.writer).write_all(data.as_bytes())?;
        Ok(())
    }

    pub fn resize(&self, cols: u16, rows: u16) -> Result<()> {
        lock(&self.master).resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;
        Ok(())
    }

    pub fn set_cwd(&self, cwd: String) {
        *lock(&self.cwd) = cwd;
    }

    pub fn cwd(&self) -> String {
        lock(&self.cwd).clone()
    }

    pub fn kill(&self) {
        self.flow.close();
        // Already-exited processes make kill() fail; that is not an error here.
        let _ = lock(&self.killer).kill();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_flow_blocks_only_when_attached_and_full() {
        let flow = FlowControl::default();
        // Detached: never blocks, never counts
        for _ in 0..MAX_PENDING_EVENTS * 2 {
            flow.record_emit();
        }
        flow.wait_for_capacity();

        flow.set_attached(true);
        for _ in 0..MAX_PENDING_EVENTS {
            flow.record_emit();
        }
        flow.ack(MAX_PENDING_EVENTS);
        flow.wait_for_capacity();
    }

    #[test]
    fn test_close_releases_a_waiting_reader() {
        let flow = Arc::new(FlowControl::default());
        flow.set_attached(true);
        for _ in 0..MAX_PENDING_EVENTS {
            flow.record_emit();
        }
        let waiter = {
            let flow = flow.clone();
            std::thread::spawn(move || flow.wait_for_capacity())
        };
        std::thread::sleep(Duration::from_millis(50));
        flow.close();
        waiter.join().unwrap();
    }
}
