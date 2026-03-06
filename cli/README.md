# LootProtocol CLI

Command-line interface for the [Loot Protocol](https://lootprotocol.com) AI Extension Marketplace.

## Installation

### Homebrew (macOS/Linux)

```bash
brew install lootprotocol/tap/lootprotocol
```

### Download from GitHub Releases

Download the latest binary for your platform from the [Releases](https://github.com/lootprotocol/lootprotocol/releases) page.

### Go Install

```bash
go install github.com/lootprotocol/lootprotocol/cmd/lootprotocol@latest
```

### Build from Source

```bash
cd cli
make build
./lootprotocol --version
```

## Commands

| Command | Description |
|---|---|
| `lootprotocol login` | Log in via browser-based OAuth |
| `lootprotocol logout` | Log out and clear credentials |
| `lootprotocol search <query>` | Search for extensions |
| `lootprotocol info <slug>` | Show extension details |
| `lootprotocol validate [path]` | Validate an extension package |
| `lootprotocol install <slug>` | Install an extension |
| `lootprotocol uninstall <slug>` | Uninstall an extension |
| `lootprotocol list` | List installed extensions |
| `lootprotocol publish [path]` | Publish an extension |

## Usage

### Search

```bash
lootprotocol search "code review"
lootprotocol search "testing" --type skill --category testing-qa --limit 10
```

### Validate

```bash
# Validate current directory (auto-detects type)
lootprotocol validate

# Validate a specific path with explicit type
lootprotocol validate ./my-skill --type skill
```

### Publish

```bash
# Interactive publish
lootprotocol publish ./my-extension

# Non-interactive (CI) publish
lootprotocol publish ./my-extension --non-interactive
```

For non-interactive mode, create a `lootprotocol.json` in your extension directory:

```json
{
  "displayName": "My Extension",
  "category": "development-tools",
  "tags": "code,review"
}
```

### List Installed

```bash
lootprotocol list
lootprotocol list --type skill
lootprotocol list --json
```

## Configuration

Config is stored at `~/.lootprotocol/config.json`.

| Environment Variable | Description |
|---|---|
| `LOOTPROTOCOL_API_URL` | Override the API base URL |
| `COGNITO_DOMAIN` | Override the OAuth domain |
| `COGNITO_CLIENT_ID` | Set the OAuth client ID |

## Development

```bash
cd cli

# Run tests
make test

# Build
make build

# Lint
make lint

# Install locally
make install
```

## Release

Releases are automated via GoReleaser + GitHub Actions:

```bash
git tag cli/v1.0.0
git push origin cli/v1.0.0
```

This creates GitHub Release artifacts for all platforms and updates the Homebrew tap.
