import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ExtensionType } from '@lootprotocol/shared-types';

const TYPE_CONFIG: Record<ExtensionType, { label: string; className: string }> = {
  skill: {
    label: 'Skill',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  },
  mcp_server: {
    label: 'MCP Server',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  },
  plugin: {
    label: 'Plugin',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  },
};

export function ExtensionTypeBadge({ type }: { type: ExtensionType }) {
  const config = TYPE_CONFIG[type];
  return (
    <Badge variant="outline" className={cn('border-transparent', config.className)}>
      {config.label}
    </Badge>
  );
}
