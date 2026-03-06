'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type SortOption = 'downloads' | 'recent' | 'relevance';

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  hasQuery?: boolean;
}

export function SortSelect({ value, onChange, hasQuery }: SortSelectProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortOption)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="downloads">Most Downloads</SelectItem>
        <SelectItem value="recent">Most Recent</SelectItem>
        {hasQuery && <SelectItem value="relevance">Most Relevant</SelectItem>}
      </SelectContent>
    </Select>
  );
}
