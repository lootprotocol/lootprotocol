'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CATEGORIES = [
  { slug: 'development-tools', name: 'Development Tools' },
  { slug: 'productivity', name: 'Productivity' },
  { slug: 'testing-qa', name: 'Testing & QA' },
  { slug: 'security', name: 'Security' },
  { slug: 'database-backend', name: 'Database & Backend' },
  { slug: 'devops-deployment', name: 'DevOps & Deployment' },
  { slug: 'design-frontend', name: 'Design & Frontend' },
  { slug: 'learning-docs', name: 'Learning & Docs' },
  { slug: 'integrations', name: 'Integrations' },
  { slug: 'other', name: 'Other' },
];

const MAX_TAGS = 5;

export interface MetadataFormValues {
  displayName: string;
  category: string;
  tags: string[];
}

interface MetadataFormProps {
  values: MetadataFormValues;
  onChange: (values: MetadataFormValues) => void;
  errors?: Record<string, string>;
}

export function MetadataForm({ values, onChange, errors }: MetadataFormProps) {
  const [tagInput, setTagInput] = useState('');

  function addTag(tag: string) {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || values.tags.includes(trimmed) || values.tags.length >= MAX_TAGS) return;
    onChange({ ...values, tags: [...values.tags, trimmed] });
    setTagInput('');
  }

  function removeTag(tag: string) {
    onChange({ ...values, tags: values.tags.filter((t) => t !== tag) });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Extension Details</h2>
        <p className="text-sm text-muted-foreground">Provide additional information about your extension</p>
      </div>

      <div className="space-y-4">
        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={values.displayName}
            onChange={(e) => onChange({ ...values, displayName: e.target.value })}
            placeholder="My Extension"
          />
          {errors?.displayName && (
            <p className="text-sm text-destructive">{errors.displayName}</p>
          )}
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={values.category}
            onValueChange={(v) => onChange({ ...values, category: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.slug} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors?.category && (
            <p className="text-sm text-destructive">{errors.category}</p>
          )}
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label htmlFor="tags">Tags (max {MAX_TAGS})</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {values.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive">
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag(tagInput);
              }
            }}
            placeholder="Type a tag and press Enter"
            disabled={values.tags.length >= MAX_TAGS}
          />
        </div>
      </div>
    </div>
  );
}
