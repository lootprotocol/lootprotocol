import AdmZip from 'adm-zip';
import * as tar from 'tar';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import { tmpdir } from 'os';

/**
 * Create a zip archive in memory from a map of filename -> content
 */
export function createZip(files: Record<string, string>): Buffer {
  const zip = new AdmZip();
  for (const [filePath, content] of Object.entries(files)) {
    zip.addFile(filePath, Buffer.from(content, 'utf-8'));
  }
  return zip.toBuffer();
}

/**
 * Create a tar.gz archive in memory from a map of filename -> content
 */
export async function createTarGz(
  files: Record<string, string>,
  rootDir?: string,
): Promise<Buffer> {
  const tmpDir = mkdtempSync(path.join(tmpdir(), 'lootprotocol-test-'));
  const baseDir = rootDir ? path.join(tmpDir, rootDir) : tmpDir;

  try {
    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(baseDir, filePath);
      mkdirSync(path.dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content, 'utf-8');
    }

    const entries = rootDir ? [rootDir] : Object.keys(files).map((f) => {
      const parts = f.split('/');
      return parts[0];
    });
    const uniqueEntries = [...new Set(entries)];

    await tar.create(
      { gzip: true, cwd: tmpDir, file: path.join(tmpDir, 'archive.tar.gz') },
      uniqueEntries,
    );

    return readFileSync(path.join(tmpDir, 'archive.tar.gz'));
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Create a valid skill archive
 */
export function createValidSkillZip(): Buffer {
  return createZip({
    'SKILL.md': `---
description: A helpful code review skill
name: code-review
---

# Code Review Skill

This skill helps you review code effectively and provide feedback.
`,
  });
}

/**
 * Create a valid MCP server archive
 */
export function createValidMcpServerZip(): Buffer {
  return createZip({
    'mcp.json': JSON.stringify({
      name: 'my-mcp-server',
      transport: 'stdio',
      command: 'node',
      args: ['dist/index.js'],
    }),
    'package.json': JSON.stringify({
      name: 'my-mcp-server',
      version: '1.0.0',
    }),
    'src/index.ts': 'console.log("hello");',
    'README.md': '# My MCP Server\n\nA useful MCP server.',
  });
}

/**
 * Create a valid plugin archive
 */
export function createValidPluginZip(): Buffer {
  return createZip({
    '.claude-plugin/plugin.json': JSON.stringify({
      name: 'my-plugin',
      version: '1.0.0',
      description: 'A test plugin',
    }),
    'skills/search/SKILL.md': `---
description: Search for things
---

# Search Skill

This skill searches for things effectively and returns results.
`,
    'README.md': '# My Plugin\n\nA useful plugin.',
  });
}
