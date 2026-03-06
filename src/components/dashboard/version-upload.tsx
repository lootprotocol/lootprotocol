'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Upload } from 'lucide-react';
import type { Extension } from '@lootprotocol/shared-types';

interface VersionUploadProps {
  extension: Extension | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VersionUpload({ extension, open, onOpenChange }: VersionUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [changelog, setChangelog] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<'success' | 'error' | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!file || !extension) return;

      setIsUploading(true);
      setUploadResult(null);

      // Mock upload — in production this calls POST /api/extensions/[slug]/versions
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setIsUploading(false);
      setUploadResult('success');
      setTimeout(() => {
        onOpenChange(false);
        setFile(null);
        setChangelog('');
        setUploadResult(null);
      }, 1500);
    },
    [file, extension, onOpenChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload New Version</DialogTitle>
          <DialogDescription>
            {extension
              ? `Upload a new version for ${extension.displayName ?? extension.name}`
              : 'Select an extension first'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="file">Package File</Label>
              <Input
                id="file"
                type="file"
                accept=".tar.gz,.tgz,.zip"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="changelog">Changelog</Label>
              <Textarea
                id="changelog"
                placeholder="What changed in this version?"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                rows={4}
              />
            </div>
            {uploadResult === 'success' && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Version uploaded successfully!
              </p>
            )}
            {uploadResult === 'error' && (
              <p className="text-sm text-destructive">Upload failed. Please try again.</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!file || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
