---
description: Install an extension from Loot Protocol marketplace
---

# Loot Protocol Install

Install a Claude Code extension from Loot Protocol.

## How to install

Run the `lootprotocol` CLI to install an extension:

```bash
lootprotocol install <slug>
```

## Parameters

| Parameter | Flag | Description | Required |
|-----------|------|-------------|----------|
| slug | (positional) | The extension slug (e.g., `code-reviewer`) | Yes |
| version | `--version <ver>` | Specific version to install (default: latest) | No |
| force | `--force` | Overwrite existing installation without prompting | No |

## Prerequisites

The user must be logged in first:
```bash
lootprotocol login
```

This opens a browser for authentication. After successful login, a session token is stored locally.

## Installation Flow

1. **Resolve extension** — CLI fetches extension metadata from `/api/extensions/<slug>`
2. **Download package** — CLI requests the package archive from `/api/extensions/<slug>/download`
3. **Validate** — The archive is validated locally for integrity
4. **Extract** — Files are extracted to the appropriate directory based on extension type
5. **Configure** — Any required configuration is written (e.g., MCP server config in `claude_desktop_config.json`)
6. **Confirm** — CLI prints success message with installation path

## After installation

Tell the user what was installed and where. Extensions are installed to:
- Skills: `~/.claude/skills/<slug>/`
- MCP Servers: `~/.claude/mcp-servers/<slug>/`
- Plugins: `~/.claude/plugins/<slug>/`

Suggest the user restart their Claude Code session to pick up the new extension.

## Examples

### Install latest version
```bash
lootprotocol install code-reviewer
```
Installs the latest version of the `code-reviewer` extension.

### Install a specific version
```bash
lootprotocol install code-reviewer --version 1.2.0
```

### Force reinstall
```bash
lootprotocol install code-reviewer --force
```
Overwrites an existing installation.

## Error Handling

| Error | Cause | Action |
|-------|-------|--------|
| `Extension not found` | Invalid slug | Verify the slug with `lootprotocol search` |
| `Authentication required` | Not logged in | Run `lootprotocol login` first |
| `Version not found` | Specified version doesn't exist | Check available versions with `lootprotocol info <slug>` |
| `Validation failed` | Corrupted or tampered package | Try again; if persistent, report to the publisher |
| `Permission denied` | Cannot write to install directory | Check file permissions on `~/.claude/` |

## Uninstalling

To remove an installed extension:
```bash
lootprotocol uninstall <slug>
```

This removes the extension files and any related configuration.
