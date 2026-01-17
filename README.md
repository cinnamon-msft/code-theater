# 🎭 Code Theater

Turn your git history into a dramatic screenplay with stunning ASCII art.

```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║     ░█▀▀░█▀█░█▀▄░█▀▀░░░▀█▀░█░█░█▀▀░█▀█░▀█▀░█▀▀░█▀█            ║
║     ░█░░░█░█░█░█░█▀▀░░░░█░░█▀█░█▀▀░█▀█░░█░░█▀▀░█▀▄            ║
║     ░▀▀▀░▀▀▀░▀▀░░▀▀▀░░░░▀░░▀░▀░▀▀▀░▀░▀░░▀░░▀▀▀░▀░▀            ║
║                                                                ║
║            Your git history, dramatized.                       ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

## Features

- 🎬 **Dramatic Narratives** - Transform commits into compelling screenplay scenes
- 🎭 **Character Personas** - Contributors become dramatic characters with unique voices
- 🖼️ **Detailed ASCII Art** - Beautiful terminal-rendered scenes and character portraits
- 📖 **Story Continuity** - Resume stories across sessions with "Previously on..." recaps
- 🔍 **AI-Powered Exploration** - Copilot SDK autonomously investigates your repo for dramatic details
- 📊 **Smart Summarization** - Montage mode for large release windows

## Installation

```bash
npm install -g code-theater
```

### Prerequisites

- Node.js >= 18.0.0
- GitHub Copilot CLI installed and authenticated

## Usage

### Interactive Mode

```bash
code-theater
```

### Generate a Screenplay

```bash
# From a local repository
code-theater generate --repo ./my-project --from v1.0.0 --to v2.0.0

# From a GitHub URL
code-theater generate --repo https://github.com/user/repo --from v1.0 --to v2.0

# Continue a previous story
code-theater generate --repo ./my-project --from v2.0.0 --to v3.0.0 --continue
```

### List Available Releases

```bash
code-theater releases --repo ./my-project
```

### Manage Sessions

```bash
# List active story sessions
code-theater sessions --list

# Clear sessions for a repo
code-theater sessions --clear --repo ./my-project
```

## Options

| Flag | Description |
|------|-------------|
| `--repo <path\|url>` | Repository path or GitHub URL |
| `--from <ref>` | Start reference (tag, SHA, date, or `latest-release`) |
| `--to <ref>` | End reference (tag, SHA, date, or `HEAD`) |
| `--genre <type>` | Genre: `drama`, `comedy`, `thriller`, `noir` |
| `--continue` | Continue from previous session |
| `--forget` | Start fresh, forget previous sessions |
| `--full` | Generate scenes for every commit |
| `--highlights-only` | Only pivotal moments |
| `--tool-budget <n>` | AI exploration budget per scene (default: 20) |
| `--export <file>` | Export to file (strips ANSI codes) |

## Character Archetypes

Code Theater analyzes contributor patterns to assign dramatic personas:

| Archetype | Emoji | Description |
|-----------|-------|-------------|
| The Architect | 🏛️ | Makes sweeping changes that reshape the codebase |
| The Bug Hunter | 🔍 | Patient detective who finds hidden bugs |
| The Night Owl | 🦉 | Does their best work at 3 AM |
| The Refactorer | ✨ | Cannot let ugly code stand |
| The Documentation Hero | 📚 | Ensures others can understand |
| The Perfectionist | 💎 | Small, perfect commits |
| The Journeyman | 🛤️ | Versatile, goes where needed |

## How It Works

Code Theater leverages the GitHub Copilot SDK to:

1. **Extract** git history between specified releases
2. **Analyze** contributor patterns and assign personas
3. **Explore** the repository using AI tools for context
4. **Generate** dramatic scenes with dialogue and ASCII art
5. **Stream** output in real-time with typewriter effects

## License

MIT

---

*"Every commit tells a story. Code Theater brings them to life."*
