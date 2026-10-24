use std::sync::{Arc, Mutex};

use portable_pty::{ChildKiller, MasterPty};

pub struct PtySession {
    pub id: String,
    pub cwd: Arc<Mutex<String>>,
    pub master: Box<dyn MasterPty + Send>,
    pub writer: Box<dyn std::io::Write + Send>,
    pub killer: Box<dyn ChildKiller + Send + Sync>,
}
