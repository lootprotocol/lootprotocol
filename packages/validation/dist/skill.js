import matter from 'gray-matter';
import { z } from 'zod';
import { readFileFromArchive } from './shared.js';
const skillFrontmatterSchema = z.object({
    description: z.string().min(1, 'description must be non-empty'),
    name: z
        .string()
        .regex(/^[a-z][a-z0-9-]*$/, 'name must be lowercase with hyphens only')
        .max(64, 'name must be at most 64 characters')
        .optional(),
    version: z.string().optional(),
});
export async function validateSkill(contents) {
    const errors = [];
    const warnings = [];
    // 1. Check SKILL.md exists
    const skillMd = readFileFromArchive(contents, 'SKILL.md');
    if (!skillMd) {
        errors.push({
            code: 'MISSING_FILE',
            message: 'SKILL.md is required at the root of the archive',
            path: 'SKILL.md',
        });
        return { valid: false, errors, warnings, metadata: null };
    }
    // 2. Parse frontmatter
    let parsed;
    try {
        parsed = matter(skillMd);
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        errors.push({
            code: 'INVALID_FRONTMATTER',
            message: `Failed to parse YAML frontmatter: ${message}`,
            path: 'SKILL.md',
        });
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
    const metadata = {
        name: parsed.data.name || deriveNameFromArchive(contents),
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
function deriveNameFromArchive(contents) {
    if (contents.rootDir) {
        return contents.rootDir.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }
    return 'unnamed-skill';
}
//# sourceMappingURL=skill.js.map