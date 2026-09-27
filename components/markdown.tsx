import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// Renders the agent's `result` markdown into styled, accessible HTML.
// Component overrides keep typography consistent with the app's theme.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed text-foreground [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-2">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="text-muted-foreground">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline underline-offset-2"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.8125rem] text-secondary-foreground">
              {children}
            </code>
          ),
          h1: ({ children }) => (
            <h1 className="mb-2 mt-3 text-base font-semibold">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-3 text-base font-semibold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-2 text-sm font-semibold">{children}</h3>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-secondary text-secondary-foreground">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-t border-border px-3 py-2">{children}</td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-primary/40 pl-3 text-muted-foreground">
              {children}
            </blockquote>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
