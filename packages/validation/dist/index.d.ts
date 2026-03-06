import type { ExtensionType, ValidationResult } from './types.js';
export declare function validateExtension(type: ExtensionType, archiveBuffer: Buffer, filename: string): Promise<ValidationResult>;
export * from './types.js';
export { extractArchive, checkArchiveSize, checkPathTraversal } from './shared.js';
export { validateSkill } from './skill.js';
export { validateMcpServer } from './mcp-server.js';
export { validatePlugin } from './plugin.js';
//# sourceMappingURL=index.d.ts.map