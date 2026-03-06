import { z } from 'zod';
import { readFileFromArchive, fileExistsInArchive, dirExistsInArchive, } from './shared.js';
const mcpJsonSchema = z
    .object({
    name: z.string().min(1),
    description: z.string().optional(),
    transport: z.enum(['stdio', 'http', 'sse']),
    command: z.string().optional(),
    args: z.array(z.string()).optional(),
    url: z.string().url().optional(),
})
    .refine((data) => {
    if (data.transport === 'stdio')
        return !!data.command;
    if (data.transport === 'http' || data.transport === 'sse')
        return !!data.url;
    return true;
}, {
    message: 'stdio transport requires "command", http/sse transport requires "url"',
});
const packageJsonSchema = z.object({
    name: z.string().min(1),
    version: z.string().min(1),
});
export async function validateMcpServer(contents) {
    const errors = [];
    const warnings = [];
    // 1. mcp.json must exist and be valid
    const mcpJson = readFileFromArchive(contents, 'mcp.json');
    if (!mcpJson) {
        errors.push({
            code: 'MISSING_FILE',
            message: 'mcp.json is required',
            path: 'mcp.json',
        });
        return { valid: false, errors, warnings, metadata: null };
    }
    let mcpConfig;
    try {
        mcpConfig = JSON.parse(mcpJson);
    }
    catch {
        errors.push({
            code: 'INVALID_JSON',
            message: 'mcp.json contains invalid JSON',
            path: 'mcp.json',
        });
        return { valid: false, errors, warnings, metadata: null };
    }
    const mcpResult = mcpJsonSchema.safeParse(mcpConfig);
    if (!mcpResult.success) {
        for (const issue of mcpResult.error.issues) {
            errors.push({
                code: 'INVALID_SCHEMA',
                message: `mcp.json: ${issue.message}`,
                path: 'mcp.json',
            });
        }
    }
    // 2. package.json or requirements.txt must exist
    const hasPackageJson = fileExistsInArchive(contents, 'package.json');
    const hasRequirementsTxt = fileExistsInArchive(contents, 'requirements.txt');
    if (!hasPackageJson && !hasRequirementsTxt) {
        errors.push({
            code: 'MISSING_FILE',
            message: 'Either package.json or requirements.txt is required',
        });
    }
    if (hasPackageJson) {
        const pkgJson = readFileFromArchive(contents, 'package.json');
        try {
            const pkg = JSON.parse(pkgJson);
            const pkgResult = packageJsonSchema.safeParse(pkg);
            if (!pkgResult.success) {
                for (const issue of pkgResult.error.issues) {
                    errors.push({
                        code: 'INVALID_SCHEMA',
                        message: `package.json: ${issue.path.join('.')}: ${issue.message}`,
                        path: 'package.json',
                    });
                }
            }
        }
        catch {
            errors.push({
                code: 'INVALID_JSON',
                message: 'package.json contains invalid JSON',
                path: 'package.json',
            });
        }
    }
    // 3. src/ directory must exist with at least one file
    if (!dirExistsInArchive(contents, 'src')) {
        errors.push({
            code: 'MISSING_DIR',
            message: 'src/ directory is required with at least one source file',
            path: 'src/',
        });
    }
    // 4. README.md must exist and be non-empty
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
    // Extract version from package.json if available
    let version = '1.0.0';
    if (hasPackageJson) {
        try {
            const pkg = JSON.parse(readFileFromArchive(contents, 'package.json'));
            version = pkg.version || '1.0.0';
        }
        catch {
            // Already reported above
        }
    }
    const metadata = {
        name: mcpConfig?.name || '',
        description: mcpConfig?.description || '',
        version,
        transport: mcpConfig?.transport,
        readme: readme || undefined,
    };
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        metadata: errors.length === 0 ? metadata : null,
    };
}
//# sourceMappingURL=mcp-server.js.map