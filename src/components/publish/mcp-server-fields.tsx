'use client';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileUploadField } from './file-upload-field';

type Runtime = 'javascript' | 'python';

interface McpServerFieldsProps {
  files: Record<string, File | null>;
  onFileChange: (field: string, file: File | null) => void;
  fieldErrors: Record<string, string>;
  runtime: Runtime;
  onRuntimeChange: (runtime: Runtime) => void;
}

export function McpServerFields({
  files,
  onFileChange,
  fieldErrors,
  runtime,
  onRuntimeChange,
}: McpServerFieldsProps) {
  return (
    <div className="space-y-4">
      <FileUploadField
        label="mcp.json"
        helpText="Server configuration — name, transport type, command/URL, and optional args"
        accept=".json"
        file={files['mcp.json'] ?? null}
        onFileChange={(f) => onFileChange('mcp.json', f)}
        error={fieldErrors['mcp.json']}
        required
      />

      <div className="space-y-2">
        <Label>Runtime</Label>
        <RadioGroup
          value={runtime}
          onValueChange={(v) => onRuntimeChange(v as Runtime)}
          className="flex gap-4"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="javascript" id="runtime-js" />
            <Label htmlFor="runtime-js" className="font-normal cursor-pointer">
              JavaScript / TypeScript
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="python" id="runtime-py" />
            <Label htmlFor="runtime-py" className="font-normal cursor-pointer">
              Python
            </Label>
          </div>
        </RadioGroup>
      </div>

      {runtime === 'javascript' ? (
        <FileUploadField
          label="package.json"
          helpText="Node.js package manifest with dependencies"
          accept=".json"
          file={files['package.json'] ?? null}
          onFileChange={(f) => onFileChange('package.json', f)}
          error={fieldErrors['package.json']}
          required
        />
      ) : (
        <FileUploadField
          label="requirements.txt"
          helpText="Python dependency list"
          accept=".txt"
          file={files['package.json'] ?? null}
          onFileChange={(f) => onFileChange('package.json', f)}
          error={fieldErrors['package.json']}
          required
        />
      )}

      <FileUploadField
        label="README.md"
        helpText="Documentation for your MCP server"
        accept=".md"
        file={files['README.md'] ?? null}
        onFileChange={(f) => onFileChange('README.md', f)}
        error={fieldErrors['README.md']}
        required
      />

      <FileUploadField
        label="Source code archive"
        helpText="Zip of your src/ directory containing server source code"
        accept=".zip,.tar.gz,.tgz"
        file={files['source-archive'] ?? null}
        onFileChange={(f) => onFileChange('source-archive', f)}
        error={fieldErrors['source-archive']}
        required
      />
    </div>
  );
}
