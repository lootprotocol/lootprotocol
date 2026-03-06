import { describe, it, expect } from 'vitest';
import { validateExtension } from '../src/index.js';
import { createZip } from './helpers.js';

describe('Plugin Validation', () => {
  it('passes for a valid minimal plugin with skills', async () => {
    const zip = createZip({
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

    const result = await validateExtension('plugin', zip, 'plugin.zip');
    expect(result.valid).toBe(true);
    expect(result.metadata).not.toBeNull();
    expect(result.metadata!.name).toBe('my-plugin');
  });

  it('passes for a plugin with all component types', async () => {
    const zip = createZip({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'full-plugin',
        version: '2.0.0',
        description: 'Full plugin',
      }),
      'skills/lint/SKILL.md': `---
description: Lint your code
---

# Lint Skill

This skill lints your code and provides feedback on issues.
`,
      'commands/deploy.sh': '#!/bin/bash\necho "deploying"',
      'agents/reviewer/config.json': '{}',
      'hooks/hooks.json': '{"pre-commit": []}',
      '.mcp.json': '{"servers": {}}',
      '.lsp.json': '{"servers": {}}',
      'README.md': '# Full Plugin\n\nEverything included.',
    });

    const result = await validateExtension('plugin', zip, 'plugin.zip');
    expect(result.valid).toBe(true);
  });

  it('fails when plugin.json is missing', async () => {
    const zip = createZip({
      'skills/search/SKILL.md': `---
description: Search
---

# Search Skill

This skill searches for things effectively.
`,
      'README.md': '# Plugin',
    });

    const result = await validateExtension('plugin', zip, 'plugin.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'MISSING_FILE',
        path: '.claude-plugin/plugin.json',
      }),
    );
  });

  it('fails when plugin.json has invalid JSON', async () => {
    const zip = createZip({
      '.claude-plugin/plugin.json': 'not json {{{',
      'skills/a/SKILL.md': `---
description: test
---

# Test Skill

A test skill for validation testing purposes.
`,
      'README.md': '# Plugin',
    });

    const result = await validateExtension('plugin', zip, 'plugin.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'INVALID_JSON' }),
    );
  });

  it('fails when plugin name is not kebab-case', async () => {
    const zip = createZip({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'MyPlugin',
        version: '1.0.0',
      }),
      'skills/a/SKILL.md': `---
description: test
---

# Test Skill

A test skill for validation testing purposes.
`,
      'README.md': '# Plugin',
    });

    const result = await validateExtension('plugin', zip, 'plugin.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_SCHEMA',
        message: expect.stringContaining('kebab-case'),
      }),
    );
  });

  it('fails when no components are present', async () => {
    const zip = createZip({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'empty-plugin',
        version: '1.0.0',
      }),
      'README.md': '# Empty Plugin',
    });

    const result = await validateExtension('plugin', zip, 'plugin.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'NO_COMPONENTS' }),
    );
  });

  it('fails when nested skill validation fails', async () => {
    const zip = createZip({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'bad-skills',
        version: '1.0.0',
        description: 'Plugin with bad skills',
      }),
      'skills/broken/SKILL.md': `---
name: broken-skill
---

Too short
`,
      'README.md': '# Plugin',
    });

    const result = await validateExtension('plugin', zip, 'plugin.zip');
    expect(result.valid).toBe(false);
    // Should have frontmatter error from nested skill (missing description)
    expect(result.errors.some((e) => e.code === 'INVALID_FRONTMATTER')).toBe(
      true,
    );
  });

  it('fails when hooks.json is invalid JSON', async () => {
    const zip = createZip({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'bad-hooks',
        version: '1.0.0',
        description: 'Plugin with bad hooks',
      }),
      'hooks/hooks.json': 'not valid json',
      'README.md': '# Plugin',
    });

    const result = await validateExtension('plugin', zip, 'plugin.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_JSON',
        path: 'hooks/hooks.json',
      }),
    );
  });

  it('fails when .mcp.json is invalid JSON', async () => {
    const zip = createZip({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'bad-mcp',
        version: '1.0.0',
        description: 'Plugin with bad mcp',
      }),
      '.mcp.json': '{{invalid',
      'README.md': '# Plugin',
    });

    const result = await validateExtension('plugin', zip, 'plugin.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'INVALID_JSON', path: '.mcp.json' }),
    );
  });

  it('fails when README.md is missing', async () => {
    const zip = createZip({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'no-readme',
        version: '1.0.0',
        description: 'No readme',
      }),
      'skills/a/SKILL.md': `---
description: test skill
---

# Test Skill

A test skill for validation testing purposes.
`,
    });

    const result = await validateExtension('plugin', zip, 'plugin.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'MISSING_FILE', path: 'README.md' }),
    );
  });

  it('detects path traversal in plugin.json values', async () => {
    const zip = createZip({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'evil-plugin',
        version: '1.0.0',
        description: 'Evil plugin',
        configPath: '../../etc/passwd',
      }),
      'skills/a/SKILL.md': `---
description: test skill
---

# Test Skill

A test skill for validation testing purposes.
`,
      'README.md': '# Evil Plugin',
    });

    const result = await validateExtension('plugin', zip, 'plugin.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'PATH_TRAVERSAL' }),
    );
  });

  it('warns when version is missing from plugin.json', async () => {
    const zip = createZip({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'no-version',
        description: 'A plugin',
      }),
      'skills/a/SKILL.md': `---
description: test skill
---

# Test Skill

A test skill for validation testing purposes.
`,
      'README.md': '# Plugin',
    });

    const result = await validateExtension('plugin', zip, 'plugin.zip');
    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'MISSING_VERSION' }),
    );
  });

  it('warns when description is missing from plugin.json', async () => {
    const zip = createZip({
      '.claude-plugin/plugin.json': JSON.stringify({
        name: 'no-desc',
        version: '1.0.0',
      }),
      'skills/a/SKILL.md': `---
description: test skill
---

# Test Skill

A test skill for validation testing purposes.
`,
      'README.md': '# Plugin',
    });

    const result = await validateExtension('plugin', zip, 'plugin.zip');
    expect(result.valid).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'MISSING_DESCRIPTION' }),
    );
  });
});
