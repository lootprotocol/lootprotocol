# Engineer 4: Validation Pipeline, CLI & In-Agent Plugin

## Overview

You own the **extension validation pipeline** (the most logic-dense part of the system), the **`lootprotocol` CLI** npm package, the **Claude Code in-agent plugin**, and the **documentation pages**. Your validation pipeline is a standalone pnpm workspace package (`packages/validation`) with zero external dependencies on other workstreams — it operates on archive buffers and file trees using pure logic.

Since all 4 workstreams run in parallel, the CLI uses a **mock API server** (or recorded responses) for testing. The validation package has no external dependencies at all. Real API integration happens in Phase 5.

---

## File Ownership

```
packages/
  validation/                              # Shared validation package
    package.json
    tsconfig.json
    src/
      index.ts                             # Orchestrator: validateExtension()
      skill.ts                             # SKILL.md + frontmatter validation
      mcp-server.ts                        # mcp.json + package structure validation
      plugin.ts                            # plugin.json manifest + components validation
      shared.ts                            # Archive unpacking, size limits, path traversal
      types.ts                             # ValidationResult, ValidationError, etc.
    __tests__/
      skill.test.ts                        # Unit tests for skill validation
      mcp-server.test.ts                   # Unit tests for MCP server validation
      plugin.test.ts                       # Unit tests for plugin validation
      shared.test.ts                       # Unit tests for archive handling
      fixtures/                            # Test archives (.zip and .tar.gz)
        valid-skill.tar.gz
        valid-mcp-server.tar.gz
        valid-plugin.tar.gz
        invalid-missing-skill-md.zip
        invalid-bad-frontmatter.zip
        invalid-path-traversal.tar.gz
        ...

cli/
  package.json                             # name: "lootprotocol", bin: { "lootprotocol": ... }
  tsconfig.json
  src/
    index.ts                               # CLI entry point (commander setup)
    commands/
      login.ts                             # lootprotocol login
      publish.ts                           # lootprotocol publish
      search.ts                            # lootprotocol search <query>
      install.ts                           # lootprotocol install <slug>
      info.ts                              # lootprotocol info <slug>
      validate.ts                          # lootprotocol validate [path]
    api.ts                                 # HTTP client with auth token injection
    config.ts                              # Read/write ~/.lootprotocol/config.json
    auth.ts                                # Browser-based OAuth flow for CLI
    output.ts                              # Formatted terminal output helpers
  __tests__/
    commands/                              # Command tests with mock API
      search.test.ts
      validate.test.ts
      ...

skill/                                     # Claude Code in-agent plugin
  .claude-plugin/
    plugin.json
  skills/
    search/
      SKILL.md                             # Search skill instructions
    install/
      SKILL.md                             # Install skill instructions

docs/                                      # MDX documentation content
  getting-started.mdx
  publishing-guide.mdx
  cli-reference.mdx
  extension-types.mdx

src/app/docs/
  [slug]/
    page.tsx                               # MDX documentation page renderer
  layout.tsx                               # Docs layout with sidebar nav
```

---

## Shared Contracts

### Interfaces You Implement

```typescript
// packages/validation/src/types.ts — the validation contract

export type ExtensionType = 'skill' | 'mcp_server' | 'plugin';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: ExtractedMetadata | null;
}

export interface ValidationError {
  code: string;           // Machine-readable: 'MISSING_FILE', 'INVALID_JSON', etc.
  message: string;        // Human-readable error description
  path?: string;          // File path within archive (e.g., 'SKILL.md')
}

export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
}

export interface ExtractedMetadata {
  name: string;
  description: string;
  version?: string;
  readme?: string;        // README.md content if found
  [key: string]: unknown; // Additional type-specific metadata
}

// The main function E3 will call
export async function validateExtension(
  type: ExtensionType,
  archiveBuffer: Buffer,
  filename: string
): Promise<ValidationResult>;
```

### Interfaces You Consume

```typescript
// From E3 (Marketplace API) — mock during parallel phase
GET  /api/extensions?q=<query>          -> PaginatedResponse<Extension>
GET  /api/extensions/<slug>             -> ApiSuccess<Extension>
POST /api/extensions                    -> ApiSuccess<Extension>
POST /api/extensions/<slug>/download    -> { url: string }
POST /api/auth/token                    -> { access_token, refresh_token, user }

// From shared types
import { Extension, PaginatedResponse, ApiError } from '@lootprotocol/shared-types';
```

---

## Technical Decisions

| Decision | Choice | Rationale |
|---------|--------|-----------|
| Archive handling | `tar` (npm) for .tar.gz, `adm-zip` for .zip | Well-maintained, handle both formats |
| YAML parsing | `gray-matter` | Standard for markdown frontmatter, handles edge cases |
| JSON schema validation | `zod` | TypeScript-first, great error messages, same as rest of project |
| Semver parsing | `semver` (npm) | Standard, handles ranges and validation |
| CLI framework | `commander` | Mature, TypeScript support, widely used |
| CLI prompts | `@inquirer/prompts` | Interactive input for metadata during publish |
| CLI output | `chalk` + `ora` + `cli-table3` | Colored output, spinners, formatted tables |
| HTTP client (CLI) | `undici` (built into Node 20) or `got` | Modern, fast, minimal dependencies |
| Test framework | `vitest` | Fast, TypeScript-native, compatible with pnpm workspaces |
| Test fixtures | Pre-built archives committed to repo | Deterministic tests, no archive creation in tests |

### Libraries to Install

**`packages/validation`:**
```
pnpm add tar adm-zip gray-matter zod semver
pnpm add -D vitest @types/tar @types/adm-zip
```

**`cli`:**
```
pnpm add commander @inquirer/prompts chalk ora cli-table3 tar open
pnpm add -D vitest @types/node
```

---

## Tasks (Ordered)

### Task 1: Validation Package Setup

**Files:** `packages/validation/package.json`, `tsconfig.json`, `src/types.ts`

```json
// packages/validation/package.json
{
  "name": "@lootprotocol/validation",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest",
    "test:watch": "vitest --watch"
  }
}
```

Define all types in `src/types.ts` (ValidationResult, ValidationError, etc.).

### Task 2: Shared Archive Utilities

**File:** `packages/validation/src/shared.ts`

```typescript
import tar from 'tar';
import AdmZip from 'adm-zip';
import path from 'path';
import { tmpdir } from 'os';
import { mkdtemp, readdir, readFile, rm } from 'fs/promises';

export interface ArchiveContents {
  files: Map<string, Buffer>;   // relative path -> file contents
  rootDir: string;              // detected root directory name (if archive has one)
}

export async function extractArchive(
  buffer: Buffer,
  filename: string
): Promise<ArchiveContents> {
  if (filename.endsWith('.zip')) {
    return extractZip(buffer);
  } else if (filename.endsWith('.tar.gz') || filename.endsWith('.tgz')) {
    return extractTarGz(buffer);
  }
  throw new Error(`Unsupported archive format: ${filename}`);
}

async function extractZip(buffer: Buffer): Promise<ArchiveContents> {
  const zip = new AdmZip(buffer);
  const files = new Map<string, Buffer>();
  for (const entry of zip.getEntries()) {
    if (!entry.isDirectory) {
      files.set(normalizePath(entry.entryName), entry.getData());
    }
  }
  return { files, rootDir: detectRootDir(files) };
}

async function extractTarGz(buffer: Buffer): Promise<ArchiveContents> {
  const tmpDir = await mkdtemp(path.join(tmpdir(), 'lootprotocol-'));
  try {
    // Extract to temp directory, then read all files
    await tar.extract({ cwd: tmpDir, gzip: true }, []).end(buffer);
    const files = await readDirRecursive(tmpDir);
    return { files, rootDir: detectRootDir(files) };
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

export function checkArchiveSize(buffer: Buffer, maxBytes: number): ValidationError | null {
  if (buffer.length > maxBytes) {
    return {
      code: 'SIZE_EXCEEDED',
      message: `Archive size ${formatBytes(buffer.length)} exceeds maximum ${formatBytes(maxBytes)}`,
    };
  }
  return null;
}

export function checkPathTraversal(files: Map<string, Buffer>): ValidationError | null {
  for (const filePath of files.keys()) {
    if (filePath.includes('..') || path.isAbsolute(filePath)) {
      return {
        code: 'PATH_TRAVERSAL',
        message: `Dangerous path detected: ${filePath}`,
        path: filePath,
      };
    }
  }
  return null;
}

export function readFileFromArchive(
  contents: ArchiveContents,
  relativePath: string
): string | null {
  // Try with and without root directory prefix
  const buffer = contents.files.get(relativePath)
    || contents.files.get(`${contents.rootDir}/${relativePath}`);
  return buffer ? buffer.toString('utf-8') : null;
}

export function fileExistsInArchive(
  contents: ArchiveContents,
  relativePath: string
): boolean {
  return contents.files.has(relativePath)
    || contents.files.has(`${contents.rootDir}/${relativePath}`);
}

export function dirExistsInArchive(
  contents: ArchiveContents,
  dirPath: string
): boolean {
  const normalizedDir = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
  for (const filePath of contents.files.keys()) {
    if (filePath.startsWith(normalizedDir) || filePath.startsWith(`${contents.rootDir}/${normalizedDir}`)) {
      return true;
    }
  }
  return false;
}
```

**Tests for `shared.ts`:** Create test fixtures (valid and invalid archives) and test all edge cases: nested root dirs, path traversal attempts, oversized archives, unsupported formats.

### Task 3: Skill Validator

**File:** `packages/validation/src/skill.ts`

```typescript
import matter from 'gray-matter';
import { z } from 'zod';

const SKILL_MAX_SIZE = 5 * 1024 * 1024; // 5MB

const skillFrontmatterSchema = z.object({
  description: z.string().min(1, 'description must be non-empty'),
  name: z.string()
    .regex(/^[a-z][a-z0-9-]*$/, 'name must be lowercase with hyphens only')
    .max(64, 'name must be at most 64 characters')
    .optional(),
});

export async function validateSkill(contents: ArchiveContents): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. Check SKILL.md exists
  const skillMd = readFileFromArchive(contents, 'SKILL.md');
  if (!skillMd) {
    errors.push({ code: 'MISSING_FILE', message: 'SKILL.md is required at the root of the archive', path: 'SKILL.md' });
    return { valid: false, errors, warnings, metadata: null };
  }

  // 2. Parse frontmatter
  let parsed;
  try {
    parsed = matter(skillMd);
  } catch (e) {
    errors.push({ code: 'INVALID_FRONTMATTER', message: `Failed to parse YAML frontmatter: ${e.message}`, path: 'SKILL.md' });
    return { valid: false, errors, warnings, metadata: null };
  }

  // 3. Validate frontmatter fields
  const frontmatterResult = skillFrontmatterSchema.safeParse(parsed.data);
  if (!frontmatterResult.success) {
    for (const issue of frontmatterResult.error.issues) {
      errors.push({
        code: 'INVALID_FRONTMATTER',
        message: `Frontmatter: ${issue.path.join('.')}: ${issue.message}`,
        path: 'SKILL.md',
      });
    }
  }

  // 4. Check body is non-empty (at least 10 chars of instructions)
  const body = parsed.content.trim();
  if (body.length < 10) {
    errors.push({
      code: 'EMPTY_BODY',
      message: 'SKILL.md body must contain at least 10 characters of instructions',
      path: 'SKILL.md',
    });
  }

  // 5. Extract metadata
  const metadata: ExtractedMetadata = {
    name: parsed.data.name || deriveNameFromFilename(contents),
    description: parsed.data.description || '',
    version: parsed.data.version || '1.0.0',
    readme: skillMd,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: errors.length === 0 ? metadata : null,
  };
}
```

**Tests:** Valid skill, missing SKILL.md, missing description, invalid name format, empty body, name too long, valid optional files (reference.md, examples.md, scripts/).

### Task 4: MCP Server Validator

**File:** `packages/validation/src/mcp-server.ts`

```typescript
import { z } from 'zod';

const MCP_MAX_SIZE = 50 * 1024 * 1024; // 50MB

const mcpJsonSchema = z.object({
  name: z.string().min(1),
  transport: z.enum(['stdio', 'http', 'sse']),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().url().optional(),
}).refine(
  (data) => {
    if (data.transport === 'stdio') return !!data.command;
    if (data.transport === 'http' || data.transport === 'sse') return !!data.url;
    return true;
  },
  { message: 'stdio transport requires "command", http/sse transport requires "url"' }
);

const packageJsonSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
});

export async function validateMcpServer(contents: ArchiveContents): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. mcp.json must exist and be valid
  const mcpJson = readFileFromArchive(contents, 'mcp.json');
  if (!mcpJson) {
    errors.push({ code: 'MISSING_FILE', message: 'mcp.json is required', path: 'mcp.json' });
    return { valid: false, errors, warnings, metadata: null };
  }

  let mcpConfig;
  try {
    mcpConfig = JSON.parse(mcpJson);
  } catch {
    errors.push({ code: 'INVALID_JSON', message: 'mcp.json contains invalid JSON', path: 'mcp.json' });
    return { valid: false, errors, warnings, metadata: null };
  }

  const mcpResult = mcpJsonSchema.safeParse(mcpConfig);
  if (!mcpResult.success) {
    for (const issue of mcpResult.error.issues) {
      errors.push({ code: 'INVALID_SCHEMA', message: `mcp.json: ${issue.message}`, path: 'mcp.json' });
    }
  }

  // 2. package.json or requirements.txt must exist
  const hasPackageJson = fileExistsInArchive(contents, 'package.json');
  const hasRequirementsTxt = fileExistsInArchive(contents, 'requirements.txt');

  if (!hasPackageJson && !hasRequirementsTxt) {
    errors.push({ code: 'MISSING_FILE', message: 'Either package.json or requirements.txt is required' });
  }

  if (hasPackageJson) {
    const pkgJson = readFileFromArchive(contents, 'package.json');
    try {
      const pkg = JSON.parse(pkgJson!);
      const pkgResult = packageJsonSchema.safeParse(pkg);
      if (!pkgResult.success) {
        for (const issue of pkgResult.error.issues) {
          errors.push({ code: 'INVALID_SCHEMA', message: `package.json: ${issue.path.join('.')}: ${issue.message}`, path: 'package.json' });
        }
      }
    } catch {
      errors.push({ code: 'INVALID_JSON', message: 'package.json contains invalid JSON', path: 'package.json' });
    }
  }

  // 3. src/ directory must exist with at least one file
  if (!dirExistsInArchive(contents, 'src')) {
    errors.push({ code: 'MISSING_DIR', message: 'src/ directory is required with at least one source file', path: 'src/' });
  }

  // 4. README.md must exist and be non-empty
  const readme = readFileFromArchive(contents, 'README.md');
  if (!readme) {
    errors.push({ code: 'MISSING_FILE', message: 'README.md is required', path: 'README.md' });
  } else if (readme.trim().length === 0) {
    errors.push({ code: 'EMPTY_FILE', message: 'README.md must not be empty', path: 'README.md' });
  }

  const metadata: ExtractedMetadata = {
    name: mcpConfig?.name || '',
    description: mcpConfig?.description || '',
    version: hasPackageJson ? JSON.parse(readFileFromArchive(contents, 'package.json')!).version : '1.0.0',
    transport: mcpConfig?.transport,
    readme: readme || undefined,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: errors.length === 0 ? metadata : null,
  };
}
```

**Tests:** Valid MCP server (stdio + http + sse), missing mcp.json, invalid transport, missing command for stdio, missing package.json + requirements.txt, empty src/ dir, empty README.

### Task 5: Plugin Validator

**File:** `packages/validation/src/plugin.ts`

```typescript
import { z } from 'zod';
import { validateSkill } from './skill';

const PLUGIN_MAX_SIZE = 100 * 1024 * 1024; // 100MB

const pluginJsonSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/, 'name must be kebab-case'),
  version: z.string().optional(),
  description: z.string().optional(),
});

export async function validatePlugin(contents: ArchiveContents): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. .claude-plugin/plugin.json must exist
  const pluginJson = readFileFromArchive(contents, '.claude-plugin/plugin.json');
  if (!pluginJson) {
    errors.push({ code: 'MISSING_FILE', message: '.claude-plugin/plugin.json is required', path: '.claude-plugin/plugin.json' });
    return { valid: false, errors, warnings, metadata: null };
  }

  let pluginConfig;
  try {
    pluginConfig = JSON.parse(pluginJson);
  } catch {
    errors.push({ code: 'INVALID_JSON', message: '.claude-plugin/plugin.json contains invalid JSON', path: '.claude-plugin/plugin.json' });
    return { valid: false, errors, warnings, metadata: null };
  }

  const pluginResult = pluginJsonSchema.safeParse(pluginConfig);
  if (!pluginResult.success) {
    for (const issue of pluginResult.error.issues) {
      errors.push({ code: 'INVALID_SCHEMA', message: `plugin.json: ${issue.message}`, path: '.claude-plugin/plugin.json' });
    }
  }

  // Warn if version/description missing
  if (!pluginConfig.version) {
    warnings.push({ code: 'MISSING_VERSION', message: 'version in plugin.json is recommended', path: '.claude-plugin/plugin.json' });
  }
  if (!pluginConfig.description) {
    warnings.push({ code: 'MISSING_DESCRIPTION', message: 'description in plugin.json is recommended', path: '.claude-plugin/plugin.json' });
  }

  // 2. Must have at least one component
  const hasSkills = dirExistsInArchive(contents, 'skills');
  const hasCommands = dirExistsInArchive(contents, 'commands');
  const hasAgents = dirExistsInArchive(contents, 'agents');
  const hasHooks = fileExistsInArchive(contents, 'hooks/hooks.json');
  const hasMcp = fileExistsInArchive(contents, '.mcp.json');
  const hasLsp = fileExistsInArchive(contents, '.lsp.json');

  if (!hasSkills && !hasCommands && !hasAgents && !hasHooks && !hasMcp && !hasLsp) {
    errors.push({
      code: 'NO_COMPONENTS',
      message: 'Plugin must contain at least one component: skills/, commands/, agents/, hooks/, .mcp.json, or .lsp.json',
    });
  }

  // 3. Validate each skill if present
  if (hasSkills) {
    const skillDirs = findSkillDirs(contents);
    for (const skillDir of skillDirs) {
      const skillContents = extractSubArchive(contents, skillDir);
      const skillResult = await validateSkill(skillContents);
      if (!skillResult.valid) {
        for (const error of skillResult.errors) {
          errors.push({ ...error, path: `${skillDir}/${error.path || ''}` });
        }
      }
    }
  }

  // 4. Validate hooks/hooks.json if present
  if (hasHooks) {
    const hooksJson = readFileFromArchive(contents, 'hooks/hooks.json');
    try {
      JSON.parse(hooksJson!);
    } catch {
      errors.push({ code: 'INVALID_JSON', message: 'hooks/hooks.json contains invalid JSON', path: 'hooks/hooks.json' });
    }
  }

  // 5. Validate .mcp.json if present
  if (hasMcp) {
    const mcpJson = readFileFromArchive(contents, '.mcp.json');
    try {
      JSON.parse(mcpJson!);
    } catch {
      errors.push({ code: 'INVALID_JSON', message: '.mcp.json contains invalid JSON', path: '.mcp.json' });
    }
  }

  // 6. README.md must exist
  const readme = readFileFromArchive(contents, 'README.md');
  if (!readme) {
    errors.push({ code: 'MISSING_FILE', message: 'README.md is required', path: 'README.md' });
  } else if (readme.trim().length === 0) {
    errors.push({ code: 'EMPTY_FILE', message: 'README.md must not be empty', path: 'README.md' });
  }

  // 7. Check path safety in plugin.json
  if (pluginConfig && typeof pluginConfig === 'object') {
    checkPluginPaths(pluginConfig, errors);
  }

  const metadata: ExtractedMetadata = {
    name: pluginConfig?.name || '',
    description: pluginConfig?.description || '',
    version: pluginConfig?.version || '1.0.0',
    readme: readme || undefined,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metadata: errors.length === 0 ? metadata : null,
  };
}

function checkPluginPaths(config: Record<string, unknown>, errors: ValidationError[]) {
  // Recursively check that all path-like string values start with "./" and don't contain "../"
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string' && (value.includes('/') || value.endsWith('.json') || value.endsWith('.md'))) {
      if (value.includes('..')) {
        errors.push({ code: 'PATH_TRAVERSAL', message: `Path traversal detected in plugin.json: ${key}="${value}"`, path: '.claude-plugin/plugin.json' });
      }
    }
    if (typeof value === 'object' && value !== null) {
      checkPluginPaths(value as Record<string, unknown>, errors);
    }
  }
}
```

**Tests:** Valid plugin (minimal), valid plugin (all components), missing plugin.json, no components, invalid name format, nested skill validation fails, path traversal in plugin.json, invalid hooks.json, invalid .mcp.json, missing README.

### Task 6: Validation Orchestrator

**File:** `packages/validation/src/index.ts`

```typescript
export async function validateExtension(
  type: ExtensionType,
  archiveBuffer: Buffer,
  filename: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  // 1. Check archive format
  if (!filename.endsWith('.zip') && !filename.endsWith('.tar.gz') && !filename.endsWith('.tgz')) {
    return {
      valid: false,
      errors: [{ code: 'INVALID_FORMAT', message: 'Archive must be .zip or .tar.gz' }],
      warnings: [],
      metadata: null,
    };
  }

  // 2. Check size limit per type
  const maxSize = { skill: 5 * 1024 * 1024, mcp_server: 50 * 1024 * 1024, plugin: 100 * 1024 * 1024 };
  const sizeError = checkArchiveSize(archiveBuffer, maxSize[type]);
  if (sizeError) {
    return { valid: false, errors: [sizeError], warnings: [], metadata: null };
  }

  // 3. Extract archive
  let contents: ArchiveContents;
  try {
    contents = await extractArchive(archiveBuffer, filename);
  } catch (e) {
    return {
      valid: false,
      errors: [{ code: 'EXTRACT_FAILED', message: `Failed to extract archive: ${e.message}` }],
      warnings: [],
      metadata: null,
    };
  }

  // 4. Check path traversal
  const pathError = checkPathTraversal(contents.files);
  if (pathError) {
    return { valid: false, errors: [pathError], warnings: [], metadata: null };
  }

  // 5. Delegate to type-specific validator
  switch (type) {
    case 'skill':
      return validateSkill(contents);
    case 'mcp_server':
      return validateMcpServer(contents);
    case 'plugin':
      return validatePlugin(contents);
    default:
      return {
        valid: false,
        errors: [{ code: 'UNKNOWN_TYPE', message: `Unknown extension type: ${type}` }],
        warnings: [],
        metadata: null,
      };
  }
}

// Re-export all types
export * from './types';
```

### Task 7: CLI Package Setup

**File:** `cli/package.json`

```json
{
  "name": "lootprotocol",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "lootprotocol": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "vitest"
  },
  "dependencies": {
    "@lootprotocol/validation": "workspace:*",
    "@lootprotocol/shared-types": "workspace:*",
    "commander": "^12.0.0",
    "@inquirer/prompts": "^7.0.0",
    "chalk": "^5.3.0",
    "ora": "^8.0.0",
    "cli-table3": "^0.6.0",
    "tar": "^7.0.0",
    "open": "^10.0.0"
  }
}
```

### Task 8: CLI — Config & API Client

**Files:** `cli/src/config.ts`, `cli/src/api.ts`, `cli/src/output.ts`

**`config.ts`:**
```typescript
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.lootprotocol');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface Loot ProtocolConfig {
  accessToken?: string;
  refreshToken?: string;
  apiUrl: string;
  user?: { id: string; githubUsername: string; displayName: string };
}

const DEFAULT_CONFIG: Loot ProtocolConfig = {
  apiUrl: 'https://lootprotocol.com/api',
};

export async function readConfig(): Promise<Loot ProtocolConfig>;
export async function writeConfig(config: Partial<Loot ProtocolConfig>): Promise<void>;
export async function clearConfig(): Promise<void>;
export function isLoggedIn(config: Loot ProtocolConfig): boolean;
```

**`api.ts`:**
```typescript
export class Loot ProtocolAPI {
  constructor(private baseUrl: string, private accessToken?: string) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
      ...(options?.headers as Record<string, string>),
    };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      if (response.status === 401) throw new Error('Authentication required. Run: lootprotocol login');
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }
    return response.json();
  }

  async searchExtensions(query: string, options?: { category?: string; type?: string }): Promise<PaginatedResponse<Extension>>;
  async getExtension(slug: string): Promise<Extension>;
  async downloadExtension(slug: string, source?: string): Promise<{ url: string }>;
  async publishExtension(formData: FormData): Promise<Extension>;
  async validateExtension(formData: FormData): Promise<ValidationResult>;
  async getMe(): Promise<Profile>;
}
```

**`output.ts`:**
```typescript
import chalk from 'chalk';
import Table from 'cli-table3';

export function printExtensionTable(extensions: Extension[]): void {
  const table = new Table({
    head: [chalk.cyan('Name'), chalk.cyan('Type'), chalk.cyan('Downloads'), chalk.cyan('Description')],
    colWidths: [25, 12, 12, 50],
  });
  for (const ext of extensions) {
    table.push([ext.displayName || ext.name, ext.extensionType, ext.downloadCount.toString(), truncate(ext.description, 47)]);
  }
  console.log(table.toString());
}

export function printSuccess(message: string): void;
export function printError(message: string): void;
export function printWarning(message: string): void;
export function printValidationResult(result: ValidationResult): void;
```

### Task 9: CLI Commands

**`login.ts`:**
```typescript
// 1. Start a temporary local HTTP server on a random port
// 2. Open browser to Cognito authorize URL with redirect_uri=http://localhost:{port}/callback
// 3. Handle callback: receive authorization code
// 4. Exchange code via POST /api/auth/token
// 5. Store tokens in ~/.lootprotocol/config.json
// 6. Print "Logged in as {username}"
```

**`search.ts`:**
```typescript
// lootprotocol search <query> [--category <cat>] [--type <type>] [--limit <n>]
// 1. Call GET /api/extensions?q=<query>&category=<cat>&type=<type>&limit=<n>
// 2. Print results as formatted table
// 3. If no results: suggest broadening search
```

**`info.ts`:**
```typescript
// lootprotocol info <slug>
// 1. Call GET /api/extensions/<slug>
// 2. Print detailed info: name, type, description, publisher, version, downloads, install command
```

**`validate.ts`:**
```typescript
// lootprotocol validate [--type <type>] [path]
// 1. Default path is current directory
// 2. Auto-detect type if not specified (check for SKILL.md, mcp.json, .claude-plugin/)
// 3. Package directory as .tar.gz in memory
// 4. Run validateExtension() from @lootprotocol/validation
// 5. Print validation results (pass/fail with details)
```

**`install.ts`:**
```typescript
// lootprotocol install <slug> [--version <ver>]
// 1. Require login (check config)
// 2. Call POST /api/extensions/<slug>/download with X-Download-Source: cli
// 3. Download .tar.gz from pre-signed URL
// 4. Detect extension type from API response
// 5. Extract to appropriate Claude Code directory:
//    - Skills:      ~/.claude/skills/<slug>/
//    - MCP Servers: ~/.claude/mcp-servers/<slug>/
//    - Plugins:     ~/.claude/plugins/<slug>/
// 6. Print success with usage instructions
```

**`publish.ts`:**
```typescript
// lootprotocol publish [--type <type>] [path]
// 1. Require login
// 2. Default path is current directory
// 3. Auto-detect type if not specified
// 4. Run local validation first (fast feedback)
// 5. If validation fails: print errors, exit
// 6. Package directory as .tar.gz
// 7. Read lootprotocol.json if present for metadata defaults
// 8. Prompt for missing metadata (display name, category, tags) using inquirer
// 9. Upload via POST /api/extensions (multipart form)
// 10. Print success with extension URL
```

### Task 10: In-Agent Claude Code Plugin

**File:** `skill/.claude-plugin/plugin.json`
```json
{
  "name": "lootprotocol",
  "version": "1.0.0",
  "description": "Search and install extensions from Loot Protocol marketplace"
}
```

**File:** `skill/skills/search/SKILL.md`
```markdown
---
description: Search Loot Protocol for Claude Code extensions (skills, MCP servers, plugins)
---

# Loot Protocol Search

Search the Loot Protocol marketplace for extensions.

## How to search

Run the `lootprotocol` CLI to search for extensions:

\`\`\`bash
lootprotocol search "<query>"
\`\`\`

Options:
- `--category <cat>` — Filter by category
- `--type <skill|mcp_server|plugin>` — Filter by type

## Examples

- `lootprotocol search "code review"` — Find code review extensions
- `lootprotocol search "database" --type mcp_server` — Find database MCP servers
- `lootprotocol search "testing" --category testing-qa` — Find testing tools

## Output

Display the results to the user as a formatted list with name, type, description, and download count.
```

**File:** `skill/skills/install/SKILL.md`
```markdown
---
description: Install an extension from Loot Protocol marketplace
---

# Loot Protocol Install

Install a Claude Code extension from Loot Protocol.

## How to install

Run the `lootprotocol` CLI to install an extension:

\`\`\`bash
lootprotocol install <slug>
\`\`\`

## Prerequisites

The user must be logged in first:
\`\`\`bash
lootprotocol login
\`\`\`

## After installation

Tell the user what was installed and where. Extensions are installed to:
- Skills: `~/.claude/skills/<slug>/`
- MCP Servers: `~/.claude/mcp-servers/<slug>/`
- Plugins: `~/.claude/plugins/<slug>/`

Suggest the user restart their Claude Code session to pick up the new extension.
```

### Task 11: Documentation Pages

**Files:** `docs/*.mdx`, `src/app/docs/[slug]/page.tsx`

Create MDX content files:
- `getting-started.mdx` — What is Loot Protocol, sign up, browse, install your first extension
- `publishing-guide.mdx` — Extension types explained, file structure requirements, validation rules, step-by-step publish flow (web + CLI)
- `cli-reference.mdx` — All commands with usage, options, and examples
- `extension-types.mdx` — Detailed spec for each type (Skill, MCP Server, Plugin)

Create a docs page renderer:
```typescript
// src/app/docs/[slug]/page.tsx
// Server component that reads MDX files and renders them
// With sidebar navigation listing all doc pages
```

---

## Mock Strategy

### Mock API Server for CLI Testing

Create a simple mock API server or use recorded responses:

```typescript
// cli/__tests__/mock-server.ts
import { createServer } from 'http';

export function startMockServer(port: number) {
  return createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.url?.startsWith('/api/extensions') && req.method === 'GET') {
      res.end(JSON.stringify({
        data: [mockExtension],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }));
    } else if (req.url?.includes('/download') && req.method === 'POST') {
      res.end(JSON.stringify({ url: 'http://localhost/mock-package.tar.gz' }));
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: { message: 'Not found' } }));
    }
  }).listen(port);
}
```

Alternatively, use vitest mocks to mock the `fetch` calls in `api.ts`.

### Validation Package — No Mocks Needed

The validation package is pure logic. It takes a `Buffer` and returns a `ValidationResult`. No external dependencies to mock. All testing uses pre-built archive fixtures.

---

## Deliverables & Acceptance Criteria

| # | Deliverable | Acceptance Criteria |
|---|------------|-------------------|
| 1 | `@lootprotocol/validation` package | `pnpm build` succeeds, `pnpm test` all pass |
| 2 | Skill validation | Valid SKILL.md passes, all invalid cases rejected with correct error codes |
| 3 | MCP Server validation | Valid mcp.json+package.json+src/ passes, all invalid cases rejected |
| 4 | Plugin validation | Valid plugin.json+component passes, nested skill validation works |
| 5 | Path traversal check | Archives with `../` paths are rejected |
| 6 | Size limit check | Oversized archives rejected per type limit |
| 7 | `lootprotocol login` | Opens browser, completes OAuth (mock or real) |
| 8 | `lootprotocol search` | Queries API, prints formatted results table |
| 9 | `lootprotocol info` | Fetches and displays extension details |
| 10 | `lootprotocol validate` | Runs local validation, prints pass/fail with errors |
| 11 | `lootprotocol install` | Downloads and extracts to correct directory |
| 12 | `lootprotocol publish` | Validates locally, uploads, prints success URL |
| 13 | Claude Code plugin | `plugin.json` valid, SKILL.md files have correct frontmatter |
| 14 | Documentation | All 4 MDX files written, docs page renders them |

---

## Handoff to Integration (Phase 5)

You deliver:
- `@lootprotocol/validation` package ready to import
- `lootprotocol` CLI with all 6 commands
- Claude Code plugin with search + install skills
- Documentation MDX content + docs page

Phase 5 will:
- Wire `@lootprotocol/validation` into E3's `POST /api/extensions` and `POST /api/validate` routes
- Configure CLI to point to real API URL
- Test CLI auth flow with real Cognito
- Test end-to-end: publish via CLI -> appears on web -> install via CLI
- Publish the Claude Code plugin to the platform itself (dogfooding)
