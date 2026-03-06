'use client';

import { FileUploadField } from './file-upload-field';

interface PluginFieldsProps {
  files: Record<string, File | null>;
  onFileChange: (field: string, file: File | null) => void;
  fieldErrors: Record<string, string>;
}

export function PluginFields({ files, onFileChange, fieldErrors }: PluginFieldsProps) {
  return (
    <div className="space-y-4">
      <FileUploadField
        label="plugin.json"
        helpText="Plugin manifest — name, version, description"
        accept=".json"
        file={files['plugin.json'] ?? null}
        onFileChange={(f) => onFileChange('plugin.json', f)}
        error={fieldErrors['plugin.json']}
        required
      />

      <FileUploadField
        label="README.md"
        helpText="Documentation for your plugin"
        accept=".md"
        file={files['README.md'] ?? null}
        onFileChange={(f) => onFileChange('README.md', f)}
        error={fieldErrors['README.md']}
        required
      />

      <FileUploadField
        label="Component bundle"
        helpText="Zip containing your plugin components: skills/, commands/, agents/, hooks/, .mcp.json, .lsp.json"
        accept=".zip,.tar.gz,.tgz"
        file={files['component-bundle'] ?? null}
        onFileChange={(f) => onFileChange('component-bundle', f)}
        error={fieldErrors['component-bundle']}
        required
      />
    </div>
  );
}
