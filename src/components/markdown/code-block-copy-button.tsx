'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface MarkdownContentProps {
  html: string;
  className?: string;
}

/** Renders pre-processed HTML and adds interactive copy buttons to code blocks */
export function MarkdownContent({ html, className }: MarkdownContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = useCallback(async (preEl: HTMLPreElement, index: number) => {
    const text = preEl.textContent ?? '';
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Fallback: select text for manual copying
      const range = document.createRange();
      range.selectNodeContents(preEl);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preElements = container.querySelectorAll('pre');
    const wrappers: HTMLDivElement[] = [];

    preElements.forEach((pre, index) => {
      // Skip if already wrapped
      if (pre.parentElement?.classList.contains('code-block-wrapper')) return;

      const lang = pre.getAttribute('data-language');

      // Create wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'code-block-wrapper group/code relative';

      // Add language badge
      if (lang && lang !== 'plaintext') {
        const badge = document.createElement('span');
        badge.className = 'absolute left-3 top-2 select-none font-mono text-xs';
        badge.style.color = 'var(--muted-foreground)';
        badge.textContent = lang;
        wrapper.appendChild(badge);

        // Add padding top for language badge
        pre.style.paddingTop = '2.25rem';
      }

      // Add copy button
      const btn = document.createElement('button');
      btn.className = 'code-copy-btn absolute right-2 top-2 rounded-md p-1.5 opacity-0 transition-opacity hover:bg-accent group-hover/code:opacity-100';
      btn.setAttribute('aria-label', 'Copy code');
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
      btn.addEventListener('click', () => {
        handleCopy(pre, index);
      });

      wrapper.appendChild(btn);

      // Wrap the pre element
      pre.parentNode?.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);
      wrappers.push(wrapper);
    });

    // Cleanup on unmount
    return () => {
      wrappers.forEach((wrapper) => {
        const pre = wrapper.querySelector('pre');
        if (pre && wrapper.parentNode) {
          wrapper.parentNode.insertBefore(pre, wrapper);
          wrapper.remove();
        }
      });
    };
  }, [html, handleCopy]);

  // Update copy button icons when copiedIndex changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const buttons = container.querySelectorAll('.code-copy-btn');
    buttons.forEach((btn, index) => {
      if (index === copiedIndex) {
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
        btn.classList.add('opacity-100');
      } else {
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
        btn.classList.remove('opacity-100');
      }
    });
  }, [copiedIndex]);

  return (
    <div
      ref={containerRef}
      className={cn(className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
