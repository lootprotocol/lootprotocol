import { MarkdownRenderer } from '@/components/markdown/markdown-renderer';

export function ReadmeRenderer({ content }: { content: string }) {
  return <MarkdownRenderer content={content} sanitize />;
}
