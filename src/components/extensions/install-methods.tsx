'use client';

import { Check, Copy, Terminal, Bot } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export function InstallMethods({ slug }: { slug: string }) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const cliCommand = `lootprotocol install ${slug}`;
  const agentCommand = `/lootprotocol:install ${slug}`;

  async function handleCopy(text: string, tab: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTab(tab);
      setTimeout(() => setCopiedTab(null), 2000);
    } catch {
      const codeEl = document.querySelector<HTMLElement>(`[data-command="${tab}-${slug}"]`);
      if (codeEl) {
        const range = document.createRange();
        range.selectNodeContents(codeEl);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }

  return (
    <Tabs defaultValue="cli">
      <TabsList className="w-full">
        <TabsTrigger value="cli" className="gap-1.5">
          <Terminal className="size-3.5" />
          CLI
        </TabsTrigger>
        <TabsTrigger value="agent" className="gap-1.5">
          <Bot className="size-3.5" />
          AI Agent
        </TabsTrigger>
      </TabsList>

      <TabsContent value="cli" className="mt-2 space-y-2">
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 font-mono text-sm">
          <code className="flex-1 truncate" data-command={`cli-${slug}`}>{cliCommand}</code>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleCopy(cliCommand, 'cli')}
            aria-label="Copy CLI install command"
          >
            {copiedTab === 'cli' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Requires the <code className="font-mono">lootprotocol</code> CLI.
        </p>
      </TabsContent>

      <TabsContent value="agent" className="mt-2 space-y-2">
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 font-mono text-sm">
          <code className="flex-1 truncate" data-command={`agent-${slug}`}>{agentCommand}</code>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => handleCopy(agentCommand, 'agent')}
            aria-label="Copy AI agent install command"
          >
            {copiedTab === 'agent' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          In Claude Code, use the command or ask your agent to install it.
        </p>
      </TabsContent>
    </Tabs>
  );
}
