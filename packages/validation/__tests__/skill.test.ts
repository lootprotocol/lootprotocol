import { describe, it, expect } from 'vitest';
import { validateExtension } from '../src/index.js';
import { createZip } from './helpers.js';

describe('Skill Validation', () => {
  it('passes for a valid skill archive', async () => {
    const zip = createZip({
      'SKILL.md': `---
description: A helpful code review skill
name: code-review
---

# Code Review Skill

This skill helps you review code effectively and provide feedback.
`,
    });

    const result = await validateExtension('skill', zip, 'skill.zip');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.metadata).not.toBeNull();
    expect(result.metadata!.name).toBe('code-review');
    expect(result.metadata!.description).toBe('A helpful code review skill');
  });

  it('fails when SKILL.md is missing', async () => {
    const zip = createZip({
      'README.md': '# Hello',
    });

    const result = await validateExtension('skill', zip, 'skill.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'MISSING_FILE' }),
    );
  });

  it('fails when description is missing from frontmatter', async () => {
    const zip = createZip({
      'SKILL.md': `---
name: my-skill
---

# My Skill

This skill does something useful for developers.
`,
    });

    const result = await validateExtension('skill', zip, 'skill.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'INVALID_FRONTMATTER' }),
    );
  });

  it('fails when name has invalid format', async () => {
    const zip = createZip({
      'SKILL.md': `---
description: A skill
name: MySkill_BAD
---

# My Skill

This skill does something useful for developers.
`,
    });

    const result = await validateExtension('skill', zip, 'skill.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_FRONTMATTER',
        message: expect.stringContaining('name must be lowercase'),
      }),
    );
  });

  it('fails when body is too short', async () => {
    const zip = createZip({
      'SKILL.md': `---
description: A skill
---

Hi
`,
    });

    const result = await validateExtension('skill', zip, 'skill.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'EMPTY_BODY' }),
    );
  });

  it('passes when name is omitted (derives from archive)', async () => {
    const zip = createZip({
      'SKILL.md': `---
description: A helpful skill
---

# My Skill

This skill does something useful for developers and is very helpful.
`,
    });

    const result = await validateExtension('skill', zip, 'skill.zip');
    expect(result.valid).toBe(true);
    expect(result.metadata!.name).toBeTruthy();
  });

  it('fails for name exceeding 64 characters', async () => {
    const longName = 'a' + '-very-long-name'.repeat(5);
    const zip = createZip({
      'SKILL.md': `---
description: A skill
name: ${longName}
---

# My Skill

This skill does something useful for developers.
`,
    });

    const result = await validateExtension('skill', zip, 'skill.zip');
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_FRONTMATTER',
        message: expect.stringContaining('at most 64'),
      }),
    );
  });
});
