"use client"

import { useEffect, useRef } from "react"

import { ChatInput } from "@/components/chat-input"
import { ChatMessageItem } from "@/components/chat-message"
import { ConversationSidebar } from "@/components/conversation-sidebar"
import { WelcomeScreen } from "@/components/welcome-screen"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useConversations } from "@/hooks/use-conversations"

export function SqlChat() {
  const {
    conversations,
    active,
    activeId,
    isSending,
    createConversation,
    selectConversation,
    deleteConversation,
    sendMessage,
  } = useConversations()

  const scrollRef = useRef<HTMLDivElement>(null)
  const messageCount = active?.messages.length ?? 0

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [messageCount, activeId])

  const hasMessages = messageCount > 0

  return (
    <SidebarProvider>
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onCreate={createConversation}
        onDelete={deleteConversation}
      />
      <SidebarInset className="gradient-wash">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="text-muted-foreground" />
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-foreground">
              {active?.title ?? "New chat"}
            </h2>
            <p className="text-[0.6875rem] text-muted-foreground">
              Ask in plain English, get SQL and charts
            </p>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {hasMessages ? (
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
              {active?.messages.map((m) => (
                <ChatMessageItem key={m.id} message={m} />
              ))}
            </div>
          ) : (
            <WelcomeScreen onPick={sendMessage} />
          )}
        </div>

        <div className="shrink-0 border-t border-border/60 bg-background/80 px-4 py-3 backdrop-blur">
          <div className="mx-auto w-full max-w-3xl">
            <ChatInput onSend={sendMessage} disabled={isSending} />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
