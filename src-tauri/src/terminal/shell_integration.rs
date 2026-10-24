use std::path::Path;

use anyhow::Result;

// OSC 7 integration for POSIX shells: every prompt emits `ESC ] 7 ; file://host/cwd BEL`.
// PowerShell is handled by the frontend via shell args (see lib/shell-profiles.ts).

const OSC7_PRINTF: &str = r#"printf '\033]7;file://%s%s\007'"#;

const ZSHENV: &str = r#"[[ -f "${PSE_USER_ZDOTDIR:-$HOME}/.zshenv" ]] && source "${PSE_USER_ZDOTDIR:-$HOME}/.zshenv"
"#;

const ZPROFILE: &str = r#"[[ -f "${PSE_USER_ZDOTDIR:-$HOME}/.zprofile" ]] && source "${PSE_USER_ZDOTDIR:-$HOME}/.zprofile"
"#;

const ZSHRC: &str = r#"if [[ -n "$PSE_USER_ZDOTDIR" ]]; then ZDOTDIR="$PSE_USER_ZDOTDIR"; else unset ZDOTDIR; fi
unset PSE_USER_ZDOTDIR
[[ -f "${ZDOTDIR:-$HOME}/.zshrc" ]] && source "${ZDOTDIR:-$HOME}/.zshrc"
__pse_osc7() { printf '\033]7;file://%s%s\007' "$HOST" "$PWD" }
autoload -Uz add-zsh-hook
add-zsh-hook precmd __pse_osc7
"#;

#[derive(Debug, Default)]
pub struct ShellIntegration {
    pub args: Vec<String>,
    pub envs: Vec<(String, String)>,
}

pub fn prepare(shell: &str, data_dir: &Path) -> Result<ShellIntegration> {
    if cfg!(windows) {
        return Ok(ShellIntegration::default());
    }
    let name = Path::new(shell)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or_default();

    match name {
        "bash" => Ok(bash()),
        "zsh" => zsh(data_dir),
        "fish" => Ok(fish()),
        _ => Ok(ShellIntegration::default()),
    }
}

fn bash() -> ShellIntegration {
    let osc7 = format!(r#"{OSC7_PRINTF} "$HOSTNAME" "$PWD""#);
    let value = match std::env::var("PROMPT_COMMAND") {
        Ok(existing) if !existing.is_empty() => format!("{osc7};{existing}"),
        _ => osc7,
    };
    ShellIntegration {
        args: Vec::new(),
        envs: vec![("PROMPT_COMMAND".to_string(), value)],
    }
}

fn zsh(data_dir: &Path) -> Result<ShellIntegration> {
    let dir = data_dir.join("shell-integration").join("zsh");
    std::fs::create_dir_all(&dir)?;
    write_if_changed(&dir.join(".zshenv"), ZSHENV)?;
    write_if_changed(&dir.join(".zprofile"), ZPROFILE)?;
    write_if_changed(&dir.join(".zshrc"), ZSHRC)?;

    let user_zdotdir = std::env::var("ZDOTDIR").unwrap_or_default();
    Ok(ShellIntegration {
        args: Vec::new(),
        envs: vec![
            ("PSE_USER_ZDOTDIR".to_string(), user_zdotdir),
            ("ZDOTDIR".to_string(), dir.to_string_lossy().to_string()),
        ],
    })
}

fn fish() -> ShellIntegration {
    let hook = format!(
        r#"function __pse_osc7 --on-event fish_prompt; {OSC7_PRINTF} $hostname $PWD; end"#
    );
    ShellIntegration {
        args: vec!["--init-command".to_string(), hook],
        envs: Vec::new(),
    }
}

// Avoids rewriting (and touching mtime of) files that are already up to date.
fn write_if_changed(path: &Path, content: &str) -> Result<()> {
    if std::fs::read_to_string(path).map(|c| c == content).unwrap_or(false) {
        return Ok(());
    }
    std::fs::write(path, content)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_unknown_shell_has_no_integration() {
        let dir = std::env::temp_dir();
        let result = prepare("/bin/sh", &dir).unwrap();
        assert!(result.args.is_empty());
        assert!(result.envs.is_empty());
    }

    #[cfg(unix)]
    #[test]
    fn test_bash_sets_prompt_command() {
        let result = prepare("/bin/bash", &std::env::temp_dir()).unwrap();
        assert!(result.envs.iter().any(|(k, v)| k == "PROMPT_COMMAND" && v.contains("]7;file://")));
    }
}
