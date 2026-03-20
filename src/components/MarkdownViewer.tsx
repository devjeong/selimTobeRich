"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownViewer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-pre:bg-gray-900">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
