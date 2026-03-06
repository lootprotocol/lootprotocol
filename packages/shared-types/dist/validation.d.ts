export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    metadata: ExtractedMetadata | null;
}
export interface ValidationError {
    code: string;
    message: string;
    path?: string;
}
export interface ValidationWarning {
    code: string;
    message: string;
    path?: string;
}
export interface ExtractedMetadata {
    name: string;
    description: string;
    version?: string;
    [key: string]: unknown;
}
//# sourceMappingURL=validation.d.ts.map