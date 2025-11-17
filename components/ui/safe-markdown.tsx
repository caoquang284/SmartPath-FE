'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import type { Components } from 'react-markdown';

type Props = {
  children: string;
  className?: string;
  isAssistant?: boolean;
};

const markdownComponents: Components = {
  h1: ({ node, ...props }) => (
    <h1 className="mt-2 mb-2 text-xl font-bold" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="mt-2 mb-2 text-lg font-semibold" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="mt-2 mb-2 font-semibold" {...props} />
  ),
  p: ({ node, ...props }) => (
    <p className="my-1 leading-6" {...props} />
  ),
  ul: ({ node, ...props }) => (
    <ul className="my-1 list-disc pl-5 space-y-1" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="my-1 list-decimal pl-5 space-y-1" {...props} />
  ),
  li: ({ node, ...props }) => (
    <li className="leading-6" {...props} />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="my-2 border-l-4 pl-3 italic opacity-90"
      {...props}
    />
  ),

  // QUAN TRỌNG: không tạo <pre> ở đây nữa
  code: ({ node, inline, className, children, ...props }: any) => {
    const txt = String(children ?? '').replace(/\n$/, '');

    // Nếu inline === undefined, mặc định coi như inline để tránh <pre> trong <p>
    const isInline = inline === undefined ? true : inline;

    if (isInline) {
      return (
        <code
          className={
            'rounded px-1 py-[2px] text-[0.9em] bg-black/10 dark:bg-white/10'
          }
          {...props}
        >
          {txt}
        </code>
      );
    }

    // Block code: chỉ render <code>, để ReactMarkdown wrap bằng <pre>
    return (
      <code
        className={className}
        {...props}
      >
        {txt}
      </code>
    );
  },

  // Style cho <pre> (wrapper của code block)
  pre: ({ node, ...props }) => (
    <pre
      className="my-2 overflow-auto rounded-md p-3 bg-black/80 text-white text-sm"
      {...props}
    />
  ),

  a: ({ node, href, children, ...props }) => (
    <a
      className="underline underline-offset-2 hover:opacity-80"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),

  hr: () => <hr className="my-3 opacity-30" />,

  table: ({ node, ...props }) => (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full text-sm" {...props} />
    </div>
  ),
  th: ({ node, ...props }) => (
    <th
      className="border-b px-2 py-1 text-left font-semibold"
      {...props}
    />
  ),
  td: ({ node, ...props }) => (
    <td
      className="border-b px-2 py-1 align-top"
      {...props}
    />
  ),
};

export default function SafeMarkdown({ children, className }: Props) {
  const text = (children ?? '').trim();
  const isPlaceholder = text === 'Đang soạn…';
  if (isPlaceholder) return <span className={className}>{text}</span>;

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}