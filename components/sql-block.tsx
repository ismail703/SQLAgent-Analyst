"use client"

import { useState } from "react"
import { Check, ChevronDown, Copy, Database } from "lucide-react"

import { cn } from "@/lib/utils"

export function SqlBlock({ sql }: { sql: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(sql)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard may be unavailable (e.g. insecure context); fail silently.
    }
  }

  const panelId = "sql-panel"

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border bg-secondary/50">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex items-center gap-2 text-xs font-medium text-secondary-foreground transition-colors hover:text-primary"
        >
          <Database className="size-3.5" aria-hidden="true" />
          <span>Generated SQL</span>
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-primary"
        >
          {copied ? (
            <>
              <Check className="size-3.5" aria-hidden="true" />
              Copied
            </>
          ) : (
            <>
              <Copy className="size-3.5" aria-hidden="true" />
              Copy
            </>
          )}
          <span className="sr-only">Copy SQL to clipboard</span>
        </button>
      </div>
      {open && (
        <pre
          id={panelId}
          className="overflow-x-auto border-t border-border bg-background px-3 py-3"
        >
          <code className="font-mono text-xs leading-relaxed text-foreground">
            {sql}
          </code>
        </pre>
      )}
    </div>
  )
}
