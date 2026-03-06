'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bot, Server, Puzzle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExtensionType } from '@lootprotocol/shared-types';

const TYPES: {
  value: ExtensionType;
  label: string;
  description: string;
  icon: typeof Bot;
  includes: string[];
}[] = [
  {
    value: 'skill',
    label: 'Skill',
    description: 'A reusable capability for AI agents',
    icon: Bot,
    includes: ['SKILL.md — skill instructions with YAML frontmatter'],
  },
  {
    value: 'mcp_server',
    label: 'MCP Server',
    description: 'A Model Context Protocol server',
    icon: Server,
    includes: [
      'mcp.json — server config',
      'package.json or requirements.txt',
      'README.md',
      'Source code archive (src/)',
    ],
  },
  {
    value: 'plugin',
    label: 'Plugin',
    description: 'A standalone plugin for the platform',
    icon: Puzzle,
    includes: [
      'plugin.json — plugin manifest',
      'README.md',
      'Component bundle (skills/, commands/, etc.)',
    ],
  },
];

interface TypeSelectorProps {
  selected: ExtensionType | null;
  onSelect: (type: ExtensionType) => void;
}

export function TypeSelector({ selected, onSelect }: TypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Select Extension Type</h2>
        <p className="text-sm text-muted-foreground">Choose the type of extension you want to publish</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" role="group" aria-label="Extension type selection">
        {TYPES.map(({ value, label, description, icon: Icon, includes }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            aria-pressed={selected === value}
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
          >
            <Card
              className={cn(
                'h-full cursor-pointer transition-all hover:shadow-md',
                selected === value && 'border-primary ring-2 ring-primary/20',
              )}
            >
              <CardHeader>
                <Icon className="size-8 text-primary" />
                <CardTitle className="text-base">{label}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Required files:</p>
                <ul className="space-y-1 text-sm">
                  {includes.map((item) => (
                    <li key={item} className="text-muted-foreground">
                      &bull; {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
