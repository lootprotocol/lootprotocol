import type { ExtensionType, ValidationResult } from '@lootprotocol/shared-types';

export async function validateExtension(
  _type: ExtensionType,
  _buffer: Buffer,
  filename: string,
): Promise<ValidationResult> {
  return {
    valid: true,
    errors: [],
    warnings: [],
    metadata: {
      name: filename.replace(/\.(zip|tar\.gz|tgz)$/, ''),
      description: 'Mock extension',
      version: '1.0.0',
    },
  };
}
