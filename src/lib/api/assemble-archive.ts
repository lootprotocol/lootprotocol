import AdmZip from 'adm-zip';

interface ArchiveEntry {
  path: string;
  buffer: Buffer;
}

/**
 * Assembles individual file entries into a single in-memory zip buffer
 * suitable for the existing validateExtension() pipeline.
 */
export function assembleArchive(entries: ArchiveEntry[]): Buffer {
  const zip = new AdmZip();
  for (const entry of entries) {
    zip.addFile(entry.path, entry.buffer);
  }
  return zip.toBuffer();
}

/**
 * Extracts entries from a zip/archive buffer and returns them with a path prefix.
 * Used to re-nest source archives (e.g., contents go under `src/`).
 */
export async function extractAndPrefix(
  archiveBuffer: Buffer,
  prefix: string,
): Promise<ArchiveEntry[]> {
  const zip = new AdmZip(archiveBuffer);
  const entries: ArchiveEntry[] = [];

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const entryPath = entry.entryName.replace(/^\/+/, '');
    entries.push({
      path: prefix ? `${prefix}/${entryPath}` : entryPath,
      buffer: entry.getData(),
    });
  }

  return entries;
}

type ExtensionType = 'skill' | 'mcp_server' | 'plugin';

/**
 * Builds the full archive for a given extension type from individual uploaded files.
 */
export async function buildArchiveForType(
  type: ExtensionType,
  files: Record<string, Buffer>,
): Promise<Buffer> {
  const entries: ArchiveEntry[] = [];

  if (type === 'skill') {
    if (files['SKILL.md']) {
      entries.push({ path: 'SKILL.md', buffer: files['SKILL.md'] });
    }
  } else if (type === 'mcp_server') {
    if (files['mcp.json']) {
      entries.push({ path: 'mcp.json', buffer: files['mcp.json'] });
    }
    if (files['package.json']) {
      // Could be package.json or requirements.txt — detect by content
      const content = files['package.json'].toString('utf-8').trim();
      const isJson = content.startsWith('{');
      entries.push({
        path: isJson ? 'package.json' : 'requirements.txt',
        buffer: files['package.json'],
      });
    }
    if (files['README.md']) {
      entries.push({ path: 'README.md', buffer: files['README.md'] });
    }
    if (files['source-archive']) {
      const srcEntries = await extractAndPrefix(files['source-archive'], 'src');
      entries.push(...srcEntries);
    }
  } else if (type === 'plugin') {
    if (files['plugin.json']) {
      entries.push({ path: '.claude-plugin/plugin.json', buffer: files['plugin.json'] });
    }
    if (files['README.md']) {
      entries.push({ path: 'README.md', buffer: files['README.md'] });
    }
    if (files['component-bundle']) {
      const bundleEntries = await extractAndPrefix(files['component-bundle'], '');
      entries.push(...bundleEntries);
    }
  }

  return assembleArchive(entries);
}
