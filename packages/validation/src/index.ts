import type { ExtensionType, ValidationResult, ArchiveContents } from './types.js';
import {
  extractArchive,
  checkArchiveSize,
  checkPathTraversal,
} from './shared.js';
import { validateSkill } from './skill.js';
import { validateMcpServer } from './mcp-server.js';
import { validatePlugin } from './plugin.js';

const MAX_SIZE: Record<ExtensionType, number> = {
  skill: 5 * 1024 * 1024,
  mcp_server: 50 * 1024 * 1024,
  plugin: 100 * 1024 * 1024,
};

export async function validateExtension(
  type: ExtensionType,
  archiveBuffer: Buffer,
  filename: string,
): Promise<ValidationResult> {
  // 1. Check archive format
  if (
    !filename.endsWith('.zip') &&
    !filename.endsWith('.tar.gz') &&
    !filename.endsWith('.tgz')
  ) {
    return {
      valid: false,
      errors: [
        { code: 'INVALID_FORMAT', message: 'Archive must be .zip or .tar.gz' },
      ],
      warnings: [],
      metadata: null,
    };
  }

  // 2. Check size limit per type
  const sizeError = checkArchiveSize(archiveBuffer, MAX_SIZE[type]);
  if (sizeError) {
    return { valid: false, errors: [sizeError], warnings: [], metadata: null };
  }

  // 3. Extract archive
  let contents: ArchiveContents;
  try {
    contents = await extractArchive(archiveBuffer, filename);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      valid: false,
      errors: [
        {
          code: 'EXTRACT_FAILED',
          message: `Failed to extract archive: ${message}`,
        },
      ],
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
        errors: [
          {
            code: 'UNKNOWN_TYPE',
            message: `Unknown extension type: ${type}`,
          },
        ],
        warnings: [],
        metadata: null,
      };
  }
}

// Re-export all types
export * from './types.js';
export { extractArchive, checkArchiveSize, checkPathTraversal } from './shared.js';
export { validateSkill } from './skill.js';
export { validateMcpServer } from './mcp-server.js';
export { validatePlugin } from './plugin.js';
