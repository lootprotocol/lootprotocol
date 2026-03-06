import { describe, it, expect } from 'vitest';
import { validateExtension, checkPathTraversal } from '../src/index.js';
import { createZip, createTarGz } from './helpers.js';

describe('Shared Archive Utilities', () => {
  describe('Archive format validation', () => {
    it('rejects unsupported archive formats', async () => {
      const buffer = Buffer.from('not an archive');
      const result = await validateExtension('skill', buffer, 'file.rar');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_FORMAT');
    });

    it('accepts .zip files', async () => {
      const zip = createZip({
        'SKILL.md': `---
description: A skill
---

# Skill Content

This is a valid skill with enough body content.
`,
      });
      const result = await validateExtension('skill', zip, 'skill.zip');
      expect(result.valid).toBe(true);
    });

    it('accepts .tar.gz files', async () => {
      const tarGz = await createTarGz({
        'SKILL.md': `---
description: A skill
---

# Skill Content

This is a valid skill with enough body content.
`,
      });
      const result = await validateExtension('skill', tarGz, 'skill.tar.gz');
      expect(result.valid).toBe(true);
    });

    it('accepts .tgz files', async () => {
      const tarGz = await createTarGz({
        'SKILL.md': `---
description: A skill
---

# Skill Content

This is a valid skill with enough body content.
`,
      });
      const result = await validateExtension('skill', tarGz, 'skill.tgz');
      expect(result.valid).toBe(true);
    });
  });

  describe('Size limits', () => {
    it('rejects skills exceeding 5MB', async () => {
      // Create a buffer larger than 5MB to test size limit
      // Use random-ish data so zip can't compress it below the limit
      const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024);
      for (let i = 0; i < oversizedBuffer.length; i++) {
        oversizedBuffer[i] = i % 256;
      }
      const result = await validateExtension('skill', oversizedBuffer, 'big.zip');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('SIZE_EXCEEDED');
    });

    it('allows MCP servers up to 50MB', async () => {
      // Just test the limit enforcement, not actual 50MB file
      const zip = createZip({
        'mcp.json': JSON.stringify({
          name: 'test',
          transport: 'stdio',
          command: 'node',
        }),
        'package.json': JSON.stringify({ name: 'test', version: '1.0.0' }),
        'src/index.ts': 'console.log("hi");',
        'README.md': '# Test',
      });
      // This should pass since it's under 50MB
      const result = await validateExtension('mcp_server', zip, 'mcp.zip');
      expect(result.valid).toBe(true);
    });
  });

  describe('Path traversal', () => {
    it('rejects file maps with path traversal', () => {
      // Test the checkPathTraversal function directly since AdmZip sanitizes paths
      const files = new Map<string, Buffer>();
      files.set('../../../etc/passwd', Buffer.from('root:x:0:0'));
      const error = checkPathTraversal(files);
      expect(error).not.toBeNull();
      expect(error!.code).toBe('PATH_TRAVERSAL');
    });

    it('accepts safe file paths', () => {
      const files = new Map<string, Buffer>();
      files.set('SKILL.md', Buffer.from('content'));
      files.set('src/index.ts', Buffer.from('code'));
      const error = checkPathTraversal(files);
      expect(error).toBeNull();
    });
  });

  describe('Root directory detection', () => {
    it('handles archives with a root directory wrapper', async () => {
      const tarGz = await createTarGz(
        {
          'SKILL.md': `---
description: A skill in a root dir
---

# Skill

This skill is wrapped in a root directory structure.
`,
        },
        'my-skill',
      );
      const result = await validateExtension('skill', tarGz, 'skill.tar.gz');
      expect(result.valid).toBe(true);
    });
  });

  describe('Corrupt archives', () => {
    it('rejects corrupt zip files', async () => {
      const corrupt = Buffer.from('PK\x03\x04corrupt data here');
      const result = await validateExtension('skill', corrupt, 'bad.zip');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('EXTRACT_FAILED');
    });

    it('rejects corrupt tar.gz files', async () => {
      const corrupt = Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00]);
      const result = await validateExtension(
        'skill',
        corrupt,
        'bad.tar.gz',
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('EXTRACT_FAILED');
    });
  });

  describe('Unknown extension type', () => {
    it('rejects unknown extension types', async () => {
      const zip = createZip({ 'test.txt': 'hello' });
      const result = await validateExtension(
        'unknown' as any,
        zip,
        'test.zip',
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('UNKNOWN_TYPE');
    });
  });
});
