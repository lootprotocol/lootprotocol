import * as tar from 'tar';
import AdmZip from 'adm-zip';
import path from 'path';
import { tmpdir } from 'os';
import { mkdtemp, rm } from 'fs/promises';
import { readdirSync, readFileSync } from 'fs';
export async function extractArchive(buffer, filename) {
    if (filename.endsWith('.zip')) {
        return extractZip(buffer);
    }
    else if (filename.endsWith('.tar.gz') || filename.endsWith('.tgz')) {
        return extractTarGz(buffer);
    }
    throw new Error(`Unsupported archive format: ${filename}`);
}
function extractZip(buffer) {
    const zip = new AdmZip(buffer);
    const files = new Map();
    for (const entry of zip.getEntries()) {
        if (!entry.isDirectory) {
            const normalized = normalizePath(entry.entryName);
            files.set(normalized, entry.getData());
        }
    }
    return { files, rootDir: detectRootDir(files) };
}
async function extractTarGz(buffer) {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'lootprotocol-'));
    try {
        const extractor = tar.extract({ cwd: tmpDir, gzip: true });
        await new Promise((resolve, reject) => {
            extractor.on('end', resolve);
            extractor.on('error', reject);
            extractor.end(buffer);
        });
        const files = readDirRecursive(tmpDir, tmpDir);
        return { files, rootDir: detectRootDir(files) };
    }
    finally {
        await rm(tmpDir, { recursive: true, force: true });
    }
}
function readDirRecursive(dir, baseDir) {
    const files = new Map();
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            const subFiles = readDirRecursive(fullPath, baseDir);
            for (const [k, v] of subFiles) {
                files.set(k, v);
            }
        }
        else {
            const relativePath = normalizePath(path.relative(baseDir, fullPath));
            const content = readFileSync(fullPath);
            files.set(relativePath, content);
        }
    }
    return files;
}
function normalizePath(filePath) {
    return filePath.replace(/\\/g, '/').replace(/^\/+/, '');
}
function detectRootDir(files) {
    const paths = Array.from(files.keys());
    if (paths.length === 0)
        return '';
    const firstSegments = new Set();
    for (const p of paths) {
        const parts = p.split('/');
        if (parts.length > 1) {
            firstSegments.add(parts[0]);
        }
    }
    if (firstSegments.size === 1) {
        const rootDir = Array.from(firstSegments)[0];
        const allUnderRoot = paths.every((p) => p.startsWith(`${rootDir}/`));
        if (allUnderRoot)
            return rootDir;
    }
    return '';
}
export function checkArchiveSize(buffer, maxBytes) {
    if (buffer.length > maxBytes) {
        return {
            code: 'SIZE_EXCEEDED',
            message: `Archive size ${formatBytes(buffer.length)} exceeds maximum ${formatBytes(maxBytes)}`,
        };
    }
    return null;
}
export function checkPathTraversal(files) {
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
export function readFileFromArchive(contents, relativePath) {
    const buffer = contents.files.get(relativePath) ||
        (contents.rootDir
            ? contents.files.get(`${contents.rootDir}/${relativePath}`)
            : undefined);
    return buffer ? buffer.toString('utf-8') : null;
}
export function fileExistsInArchive(contents, relativePath) {
    return (contents.files.has(relativePath) ||
        (!!contents.rootDir &&
            contents.files.has(`${contents.rootDir}/${relativePath}`)));
}
export function dirExistsInArchive(contents, dirPath) {
    const normalizedDir = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
    for (const filePath of contents.files.keys()) {
        if (filePath.startsWith(normalizedDir))
            return true;
        if (contents.rootDir &&
            filePath.startsWith(`${contents.rootDir}/${normalizedDir}`)) {
            return true;
        }
    }
    return false;
}
export function getFilesInDir(contents, dirPath) {
    const normalizedDir = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
    const result = [];
    for (const filePath of contents.files.keys()) {
        if (filePath.startsWith(normalizedDir)) {
            result.push(filePath);
        }
        else if (contents.rootDir &&
            filePath.startsWith(`${contents.rootDir}/${normalizedDir}`)) {
            result.push(filePath.slice(contents.rootDir.length + 1));
        }
    }
    return result;
}
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes}B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
//# sourceMappingURL=shared.js.map