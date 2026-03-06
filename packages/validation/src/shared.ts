import * as tar from 'tar';
import AdmZip from 'adm-zip';
import path from 'path';
import { tmpdir } from 'os';
import { mkdtemp, rm } from 'fs/promises';
import { readdirSync, readFileSync } from 'fs';
import type { ArchiveContents } from './types.js';
import type { ValidationError } from '@lootprotocol/shared-types';

export async function extractArchive(
  buffer: Buffer,
  filename: string,
): Promise<ArchiveContents> {
  if (filename.endsWith('.zip')) {
    return extractZip(buffer);
  } else if (filename.endsWith('.tar.gz') || filename.endsWith('.tgz')) {
    return extractTarGz(buffer);
  }
  throw new Error(`Unsupported archive format: ${filename}`);
}

function extractZip(buffer: Buffer): ArchiveContents {
  const zip = new AdmZip(buffer);
  const files = new Map<string, Buffer>();
  for (const entry of zip.getEntries()) {
    if (!entry.isDirectory) {
      const normalized = normalizePath(entry.entryName);
      files.set(normalized, entry.getData());
    }
  }
  return { files, rootDir: detectRootDir(files) };
}

async function extractTarGz(buffer: Buffer): Promise<ArchiveContents> {
  const tmpDir = await mkdtemp(path.join(tmpdir(), 'lootprotocol-'));
  try {
    const extractor = tar.extract({ cwd: tmpDir, gzip: true });
    await new Promise<void>((resolve, reject) => {
      extractor.on('end', resolve);
      extractor.on('error', reject);
      extractor.end(buffer);
    });
    const files = readDirRecursive(tmpDir, tmpDir);
    return { files, rootDir: detectRootDir(files) };
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

function readDirRecursive(dir: string, baseDir: string): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const subFiles = readDirRecursive(fullPath, baseDir);
      for (const [k, v] of subFiles) {
        files.set(k, v);
      }
    } else {
      const relativePath = normalizePath(path.relative(baseDir, fullPath));
      const content = readFileSync(fullPath);
      files.set(relativePath, content);
    }
  }
  return files;
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^\/+/, '');
}

function detectRootDir(files: Map<string, Buffer>): string {
  const paths = Array.from(files.keys());
  if (paths.length === 0) return '';

  const firstSegments = new Set<string>();
  for (const p of paths) {
    const parts = p.split('/');
    if (parts.length > 1) {
      firstSegments.add(parts[0]);
    }
  }

  if (firstSegments.size === 1) {
    const rootDir = Array.from(firstSegments)[0];
    const allUnderRoot = paths.every((p) => p.startsWith(`${rootDir}/`));
    if (allUnderRoot) return rootDir;
  }

  return '';
}

export function checkArchiveSize(
  buffer: Buffer,
  maxBytes: number,
): ValidationError | null {
  if (buffer.length > maxBytes) {
    return {
      code: 'SIZE_EXCEEDED',
      message: `Archive size ${formatBytes(buffer.length)} exceeds maximum ${formatBytes(maxBytes)}`,
    };
  }
  return null;
}

export function checkPathTraversal(
  files: Map<string, Buffer>,
): ValidationError | null {
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
  relativePath: string,
): string | null {
  const buffer =
    contents.files.get(relativePath) ||
    (contents.rootDir
      ? contents.files.get(`${contents.rootDir}/${relativePath}`)
      : undefined);
  return buffer ? buffer.toString('utf-8') : null;
}

export function fileExistsInArchive(
  contents: ArchiveContents,
  relativePath: string,
): boolean {
  return (
    contents.files.has(relativePath) ||
    (!!contents.rootDir &&
      contents.files.has(`${contents.rootDir}/${relativePath}`))
  );
}

export function dirExistsInArchive(
  contents: ArchiveContents,
  dirPath: string,
): boolean {
  const normalizedDir = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
  for (const filePath of contents.files.keys()) {
    if (filePath.startsWith(normalizedDir)) return true;
    if (
      contents.rootDir &&
      filePath.startsWith(`${contents.rootDir}/${normalizedDir}`)
    ) {
      return true;
    }
  }
  return false;
}

export function getFilesInDir(
  contents: ArchiveContents,
  dirPath: string,
): string[] {
  const normalizedDir = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
  const result: string[] = [];
  for (const filePath of contents.files.keys()) {
    if (filePath.startsWith(normalizedDir)) {
      result.push(filePath);
    } else if (
      contents.rootDir &&
      filePath.startsWith(`${contents.rootDir}/${normalizedDir}`)
    ) {
      result.push(filePath.slice(contents.rootDir.length + 1));
    }
  }
  return result;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
