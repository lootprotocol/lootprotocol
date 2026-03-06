'use client';

import { FileUploadField } from './file-upload-field';

interface SkillFieldsProps {
  files: Record<string, File | null>;
  onFileChange: (field: string, file: File | null) => void;
  fieldErrors: Record<string, string>;
}

export function SkillFields({ files, onFileChange, fieldErrors }: SkillFieldsProps) {
  return (
    <div className="space-y-4">
      <FileUploadField
        label="SKILL.md"
        helpText="Markdown file with YAML frontmatter (description, name, version) and skill instructions in the body"
        accept=".md"
        file={files['SKILL.md'] ?? null}
        onFileChange={(f) => onFileChange('SKILL.md', f)}
        error={fieldErrors['SKILL.md']}
        required
      />
    </div>
  );
}
