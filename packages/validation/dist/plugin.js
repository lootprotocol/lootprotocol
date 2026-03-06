import { z } from 'zod';
import { readFileFromArchive, fileExistsInArchive, dirExistsInArchive, getFilesInDir, } from './shared.js';
import { validateSkill } from './skill.js';
const pluginJsonSchema = z.object({
    name: z.string().regex(/^[a-z][a-z0-9-]*$/, 'name must be kebab-case'),
    version: z.string().optional(),
    description: z.string().optional(),
});
export async function validatePlugin(contents) {
    const errors = [];
    const warnings = [];
    // 1. .claude-plugin/plugin.json must exist
    const pluginJson = readFileFromArchive(contents, '.claude-plugin/plugin.json');
    if (!pluginJson) {
        errors.push({
            code: 'MISSING_FILE',
            message: '.claude-plugin/plugin.json is required',
            path: '.claude-plugin/plugin.json',
        });
        return { valid: false, errors, warnings, metadata: null };
    }
    let pluginConfig;
    try {
        pluginConfig = JSON.parse(pluginJson);
    }
    catch {
        errors.push({
            code: 'INVALID_JSON',
            message: '.claude-plugin/plugin.json contains invalid JSON',
            path: '.claude-plugin/plugin.json',
        });
        return { valid: false, errors, warnings, metadata: null };
    }
    const pluginResult = pluginJsonSchema.safeParse(pluginConfig);
    if (!pluginResult.success) {
        for (const issue of pluginResult.error.issues) {
            errors.push({
                code: 'INVALID_SCHEMA',
                message: `plugin.json: ${issue.message}`,
                path: '.claude-plugin/plugin.json',
            });
        }
    }
    // Warn if version/description missing
    if (!pluginConfig.version) {
        warnings.push({
            code: 'MISSING_VERSION',
            message: 'version in plugin.json is recommended',
            path: '.claude-plugin/plugin.json',
        });
    }
    if (!pluginConfig.description) {
        warnings.push({
            code: 'MISSING_DESCRIPTION',
            message: 'description in plugin.json is recommended',
            path: '.claude-plugin/plugin.json',
        });
    }
    // 2. Must have at least one component
    const hasSkills = dirExistsInArchive(contents, 'skills');
    const hasCommands = dirExistsInArchive(contents, 'commands');
    const hasAgents = dirExistsInArchive(contents, 'agents');
    const hasHooks = fileExistsInArchive(contents, 'hooks/hooks.json');
    const hasMcp = fileExistsInArchive(contents, '.mcp.json');
    const hasLsp = fileExistsInArchive(contents, '.lsp.json');
    if (!hasSkills &&
        !hasCommands &&
        !hasAgents &&
        !hasHooks &&
        !hasMcp &&
        !hasLsp) {
        errors.push({
            code: 'NO_COMPONENTS',
            message: 'Plugin must contain at least one component: skills/, commands/, agents/, hooks/, .mcp.json, or .lsp.json',
        });
    }
    // 3. Validate each skill if present
    if (hasSkills) {
        const skillDirs = findSkillDirs(contents);
        for (const skillDir of skillDirs) {
            const skillContents = extractSubArchive(contents, skillDir);
            const skillResult = await validateSkill(skillContents);
            if (!skillResult.valid) {
                for (const error of skillResult.errors) {
                    errors.push({ ...error, path: `${skillDir}/${error.path || ''}` });
                }
            }
        }
    }
    // 4. Validate hooks/hooks.json if present
    if (hasHooks) {
        const hooksJson = readFileFromArchive(contents, 'hooks/hooks.json');
        try {
            JSON.parse(hooksJson);
        }
        catch {
            errors.push({
                code: 'INVALID_JSON',
                message: 'hooks/hooks.json contains invalid JSON',
                path: 'hooks/hooks.json',
            });
        }
    }
    // 5. Validate .mcp.json if present
    if (hasMcp) {
        const mcpJson = readFileFromArchive(contents, '.mcp.json');
        try {
            JSON.parse(mcpJson);
        }
        catch {
            errors.push({
                code: 'INVALID_JSON',
                message: '.mcp.json contains invalid JSON',
                path: '.mcp.json',
            });
        }
    }
    // 6. README.md must exist
    const readme = readFileFromArchive(contents, 'README.md');
    if (!readme) {
        errors.push({
            code: 'MISSING_FILE',
            message: 'README.md is required',
            path: 'README.md',
        });
    }
    else if (readme.trim().length === 0) {
        errors.push({
            code: 'EMPTY_FILE',
            message: 'README.md must not be empty',
            path: 'README.md',
        });
    }
    // 7. Check path safety in plugin.json
    if (pluginConfig && typeof pluginConfig === 'object') {
        checkPluginPaths(pluginConfig, errors);
    }
    const metadata = {
        name: pluginConfig?.name || '',
        description: pluginConfig?.description || '',
        version: pluginConfig?.version || '1.0.0',
        readme: readme || undefined,
    };
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        metadata: errors.length === 0 ? metadata : null,
    };
}
function findSkillDirs(contents) {
    const skillFiles = getFilesInDir(contents, 'skills');
    const dirs = new Set();
    for (const file of skillFiles) {
        // e.g., skills/search/SKILL.md -> skills/search
        const parts = file.split('/');
        if (parts.length >= 3 && parts[parts.length - 1] === 'SKILL.md') {
            dirs.add(parts.slice(0, parts.length - 1).join('/'));
        }
    }
    return Array.from(dirs);
}
function extractSubArchive(contents, dirPath) {
    const prefix = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
    const files = new Map();
    for (const [filePath, buffer] of contents.files.entries()) {
        let relativePath = null;
        if (filePath.startsWith(prefix)) {
            relativePath = filePath.slice(prefix.length);
        }
        else if (contents.rootDir &&
            filePath.startsWith(`${contents.rootDir}/${prefix}`)) {
            relativePath = filePath.slice(`${contents.rootDir}/${prefix}`.length);
        }
        if (relativePath) {
            files.set(relativePath, buffer);
        }
    }
    return { files, rootDir: '' };
}
function checkPluginPaths(config, errors) {
    for (const [key, value] of Object.entries(config)) {
        if (typeof value === 'string' &&
            (value.includes('/') || value.endsWith('.json') || value.endsWith('.md'))) {
            if (value.includes('..')) {
                errors.push({
                    code: 'PATH_TRAVERSAL',
                    message: `Path traversal detected in plugin.json: ${key}="${value}"`,
                    path: '.claude-plugin/plugin.json',
                });
            }
        }
        if (typeof value === 'object' && value !== null) {
            checkPluginPaths(value, errors);
        }
    }
}
//# sourceMappingURL=plugin.js.map