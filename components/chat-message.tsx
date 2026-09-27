import { AlertTriangle, Sparkles, User } from "lucide-react"

import { ChartRenderer } from "@/components/chart-renderer"
import { Markdown } from "@/components/markdown"
import { SqlBlock } from "@/components/sql-block"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/lib/types"

function ThinkingDots() {
  return (
    <div
      className="flex items-center gap-1 py-1"
      role="status"
      aria-label="Generating answer"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 animate-bounce rounded-full bg-primary/60"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
      <span className="ml-2 text-xs text-muted-foreground">
        Writing SQL and analyzing results…
      </span>
    </div>
  )
}

function Avatar({ role }: { role: ChatMessage["role"] }) {
  if (role === "user") {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full gradient-user text-white shadow-blue-soft">
        <User className="size-4" aria-hidden="true" />
        <span className="sr-only">You</span>
      </div>
    )
  }
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full gradient-brand text-white shadow-blue-soft">
      <Sparkles className="size-4" aria-hidden="true" />
      <span className="sr-only">Assistant</span>
    </div>
  )
}

export function ChatMessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user"

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar role={message.role} />
      <div
        className={cn(
          "flex min-w-0 max-w-[min(46rem,85%)] flex-col",
          isUser ? "items-end" : "items-start"
        )}
      >
        {isUser ? (
          <div className="rounded-2xl rounded-tr-sm gradient-user px-4 py-2.5 text-sm leading-relaxed text-white shadow-blue-soft">
            {message.content}
          </div>
        ) : (
          <div className="w-full rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 shadow-blue-soft">
            {message.pending ? (
              <ThinkingDots />
            ) : message.error ? (
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertTriangle
                  className="mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <p>{message.error}</p>
              </div>
            ) : (
              <>
                {message.content && <Markdown>{message.content}</Markdown>}
                {message.sql && <SqlBlock sql={message.sql} />}
                {message.chartConfig && (
                  <ChartRenderer spec={message.chartConfig} />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
