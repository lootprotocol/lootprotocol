'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

interface FileUploadFieldProps {
  label: string;
  helpText?: string;
  accept: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  error?: string;
  required?: boolean;
}

export function FileUploadField({
  label,
  helpText,
  accept,
  file,
  onFileChange,
  error,
  required,
}: FileUploadFieldProps) {
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptExts = accept.split(',').map((s) => s.trim().toLowerCase());

  const validateFile = useCallback(
    (f: File): boolean => {
      const name = f.name.toLowerCase();
      const valid = acceptExts.some((ext) => name.endsWith(ext));
      if (!valid) {
        setLocalError(`Invalid file type. Accepted: ${accept}`);
        return false;
      }
      setLocalError(null);
      return true;
    },
    [accept, acceptExts],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f && validateFile(f)) onFileChange(f);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f && validateFile(f)) onFileChange(f);
    if (inputRef.current) inputRef.current.value = '';
  }

  const displayError = error || localError;

  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}

      {file ? (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
          <File className="size-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => {
              onFileChange(null);
              setLocalError(null);
            }}
            aria-label="Remove file"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg border-2 border-dashed p-4 transition-colors cursor-pointer',
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50',
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
        >
          <Upload className="size-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium">Drop file here or click to browse</p>
            <p className="text-xs text-muted-foreground">Accepted: {accept}</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}

      {displayError && <p className="text-sm text-destructive">{displayError}</p>}
    </div>
  );
}
