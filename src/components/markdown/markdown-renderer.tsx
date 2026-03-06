import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import slugify from 'slugify';
import { cn } from '@/lib/utils';
import { shikiSanitizeSchema } from './sanitize-schema';
import { MarkdownContent } from './code-block-copy-button';
import type { Root, Element, Text } from 'hast';
import './markdown-renderer.css';

interface MarkdownRendererProps {
  content: string;
  /** Enable rehype-sanitize for untrusted content (user READMEs) */
  sanitize?: boolean;
  className?: string;
}

/** Rehype plugin to add IDs and anchor links to headings */
function rehypeHeadingAnchors() {
  return (tree: Root) => {
    function visit(node: Root | Element) {
      if ('children' in node) {
        for (const child of node.children) {
          if (child.type === 'element') {
            if (['h1', 'h2', 'h3', 'h4'].includes(child.tagName)) {
              const text = extractText(child);
              const id = slugify(text, { lower: true, strict: true });

              child.properties = child.properties || {};
              child.properties.id = id;
              child.properties.className = 'group scroll-mt-20';

              // Wrap children in an anchor
              const originalChildren = child.children;
              child.children = [
                {
                  type: 'element',
                  tagName: 'a',
                  properties: {
                    href: `#${id}`,
                    className: 'heading-anchor',
                    ariaLabel: `Link to "${text}"`,
                  },
                  children: [
                    ...originalChildren,
                    {
                      type: 'element',
                      tagName: 'span',
                      properties: {
                        className: 'heading-anchor-hash',
                        ariaHidden: 'true',
                      },
                      children: [{ type: 'text', value: '#' }],
                    },
                  ],
                },
              ];
            }
            visit(child);
          }
        }
      }
    }
    visit(tree);
  };
}

/** Rehype plugin to style blockquotes, hrs, and wrap tables */
function rehypeCallouts() {
  return (tree: Root) => {
    function visit(node: Root | Element) {
      if (!('children' in node)) return;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (child.type !== 'element') continue;

        if (child.tagName === 'blockquote') {
          child.properties = child.properties || {};
          child.properties.className = 'markdown-callout';
        }
        if (child.tagName === 'hr') {
          child.properties = child.properties || {};
          child.properties.className = 'markdown-hr';
        }
        if (child.tagName === 'table') {
          // Wrap table in overflow-x-auto div (replace in parent's children array)
          const wrapper: Element = {
            type: 'element',
            tagName: 'div',
            properties: { style: 'overflow-x:auto;margin:1.5rem 0' },
            children: [child],
          };
          node.children[i] = wrapper;
          // Visit table's children (skip the wrapper to avoid revisiting the table)
          visit(child);
          continue;
        }
        visit(child);
      }
    }
    visit(tree);
  };
}

function extractText(node: Element | Text): string {
  if (node.type === 'text') return node.value;
  if ('children' in node) {
    return node.children.map((child) => {
      if (child.type === 'text') return child.value;
      if (child.type === 'element') return extractText(child);
      return '';
    }).join('');
  }
  return '';
}

export async function processMarkdown(content: string, sanitizeContent: boolean = false): Promise<string> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: !sanitizeContent })
    .use(rehypePrettyCode, {
      theme: { dark: 'github-dark', light: 'github-light' },
      keepBackground: false,
      defaultLang: 'plaintext',
    })
    .use(rehypeHeadingAnchors)
    .use(rehypeCallouts);

  if (sanitizeContent) {
    processor.use(rehypeSanitize, shikiSanitizeSchema);
  }

  processor.use(rehypeStringify, { allowDangerousHtml: !sanitizeContent });

  const result = await processor.process(content);
  return String(result);
}

export async function MarkdownRenderer({ content, sanitize = false, className }: MarkdownRendererProps) {
  const html = await processMarkdown(content, sanitize);

  return (
    <MarkdownContent
      html={html}
      className={cn('markdown-body prose prose-neutral max-w-none dark:prose-invert', className)}
    />
  );
}
