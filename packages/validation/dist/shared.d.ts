import type { ArchiveContents } from './types.js';
import type { ValidationError } from '@lootprotocol/shared-types';
export declare function extractArchive(buffer: Buffer, filename: string): Promise<ArchiveContents>;
export declare function checkArchiveSize(buffer: Buffer, maxBytes: number): ValidationError | null;
export declare function checkPathTraversal(files: Map<string, Buffer>): ValidationError | null;
export declare function readFileFromArchive(contents: ArchiveContents, relativePath: string): string | null;
export declare function fileExistsInArchive(contents: ArchiveContents, relativePath: string): boolean;
export declare function dirExistsInArchive(contents: ArchiveContents, dirPath: string): boolean;
export declare function getFilesInDir(contents: ArchiveContents, dirPath: string): string[];
//# sourceMappingURL=shared.d.ts.map