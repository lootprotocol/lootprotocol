---
description: Search Loot Protocol for Claude Code extensions (skills, MCP servers, plugins)
---

# Loot Protocol Search

Search the Loot Protocol marketplace for extensions.

## How to search

Run the `lootprotocol` CLI to search for extensions:

```bash
lootprotocol search "<query>"
```

## Parameters

| Parameter | Flag | Description | Required |
|-----------|------|-------------|----------|
| query | (positional) | Search term to match against name, description, and tags | Yes |
| category | `--category <cat>` | Filter by category (e.g., `coding`, `testing-qa`, `devops`) | No |
| type | `--type <type>` | Filter by extension type: `skill`, `mcp_server`, or `plugin` | No |
| sort | `--sort <field>` | Sort results: `relevance` (default), `downloads`, `recent` | No |
| limit | `--limit <n>` | Max results to return (default: 20, max: 100) | No |
| page | `--page <n>` | Page number for pagination (default: 1) | No |

## Response Format

The CLI returns a JSON array. Each result contains:

```json
{
  "slug": "code-reviewer",
  "name": "code-reviewer",
  "displayName": "Code Reviewer",
  "description": "Automated code review with actionable feedback",
  "extensionType": "skill",
  "category": "coding",
  "tags": ["review", "quality"],
  "latestVersion": "1.2.0",
  "downloadCount": 1500,
  "publisher": { "githubUsername": "acme-dev" }
}
```

## Examples

### Basic search
```bash
lootprotocol search "code review"
```
Display results as a formatted list showing name, type, description, and download count.

### Filter by type
```bash
lootprotocol search "database" --type mcp_server
```
Find only MCP servers related to databases.

### Filter by category and sort by downloads
```bash
lootprotocol search "testing" --category testing-qa --sort downloads
```

### Browse all extensions in a category
```bash
lootprotocol search "" --category devops
```
An empty query with a category filter returns all extensions in that category.

## Error Handling

| Error | Cause | Action |
|-------|-------|--------|
| `No results found` | No extensions match the query | Suggest broadening the search or trying different keywords |
| `Network error` | CLI cannot reach the API | Check internet connection and API URL configuration |
| `Invalid type` | Unrecognized `--type` value | Must be one of: `skill`, `mcp_server`, `plugin` |

## Output

Display the results to the user as a formatted list with name, type, description, and download count. If no results are found, suggest alternative search terms.
