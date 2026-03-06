'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { ExtensionType } from '@lootprotocol/shared-types';

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

const EXTENSION_TYPES: { value: string; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'skill', label: 'Skills' },
  { value: 'mcp_server', label: 'MCP Servers' },
  { value: 'plugin', label: 'Plugins' },
];

interface FilterSidebarProps {
  selectedCategory: string | undefined;
  selectedType: ExtensionType | undefined;
  onCategoryChange: (category: string | undefined) => void;
  onTypeChange: (type: ExtensionType | undefined) => void;
}

export function FilterSidebar({
  selectedCategory,
  selectedType,
  onCategoryChange,
  onTypeChange,
}: FilterSidebarProps) {
  const hasFilters = selectedCategory || selectedType;

  return (
    <div className="space-y-6">
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onCategoryChange(undefined);
            onTypeChange(undefined);
          }}
        >
          Clear filters
        </Button>
      )}

      {/* Extension Type */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Extension Type</h3>
        <RadioGroup
          value={selectedType || 'all'}
          onValueChange={(val) => onTypeChange(val === 'all' ? undefined : (val as ExtensionType))}
        >
          {EXTENSION_TYPES.map((t) => (
            <div key={t.value} className="flex items-center gap-2">
              <RadioGroupItem value={t.value} id={`type-${t.value}`} />
              <Label htmlFor={`type-${t.value}`} className="text-sm font-normal cursor-pointer">
                {t.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Category</h3>
        <div className="space-y-2">
          {CATEGORIES.map((cat) => (
            <div key={cat.slug} className="flex items-center gap-2">
              <Checkbox
                id={`cat-${cat.slug}`}
                checked={selectedCategory === cat.slug}
                onCheckedChange={(checked) =>
                  onCategoryChange(checked ? cat.slug : undefined)
                }
              />
              <Label htmlFor={`cat-${cat.slug}`} className="text-sm font-normal cursor-pointer">
                {cat.name}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
