'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Upload } from 'lucide-react';
import type { Extension } from '@lootprotocol/shared-types';

interface ExtensionListProps {
  extensions: Extension[];
  onUploadVersion?: (extension: Extension) => void;
}

const typeColors: Record<string, string> = {
  skill: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  mcp_server: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  plugin: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

export function ExtensionList({ extensions, onUploadVersion }: ExtensionListProps) {
  if (extensions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8">
        <p className="text-muted-foreground">No extensions published yet.</p>
        <Button variant="outline" className="mt-4" asChild>
          <a href="/publish">Publish your first extension</a>
        </Button>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Version</TableHead>
          <TableHead className="text-right">Downloads</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {extensions.map((ext) => (
          <TableRow key={ext.id}>
            <TableCell className="font-medium">{ext.displayName ?? ext.name}</TableCell>
            <TableCell>
              <Badge variant="secondary" className={typeColors[ext.extensionType] ?? ''}>
                {ext.extensionType.replace('_', ' ')}
              </Badge>
            </TableCell>
            <TableCell>{ext.latestVersion}</TableCell>
            <TableCell className="text-right">{ext.downloadCount.toLocaleString()}</TableCell>
            <TableCell>
              <Badge variant={ext.isPublished ? 'default' : 'secondary'}>
                {ext.isPublished ? 'Published' : 'Draft'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button variant="ghost" size="sm" asChild>
                  <a href={`/extensions/${ext.slug}`}>
                    <Eye className="h-4 w-4" />
                  </a>
                </Button>
                {onUploadVersion && (
                  <Button variant="ghost" size="sm" onClick={() => onUploadVersion(ext)}>
                    <Upload className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
