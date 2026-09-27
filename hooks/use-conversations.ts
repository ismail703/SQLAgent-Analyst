"use client"

import { useCallback, useState } from "react"

import type { AgentResponse, ChatMessage, Conversation } from "@/lib/types"

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function titleFrom(question: string): string {
  const t = question.trim().replace(/\s+/g, " ")
  return t.length > 40 ? `${t.slice(0, 40)}…` : t
}

function newConversation(): Conversation {
  const now = Date.now()
  return {
    id: uid(),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
  }
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>(() => [
    newConversation(),
  ])
  const [activeId, setActiveId] = useState<string>(
    () => conversations[0]?.id ?? ""
  )
  const [isSending, setIsSending] = useState(false)

  const active =
    conversations.find((c) => c.id === activeId) ?? conversations[0]

  const createConversation = useCallback(() => {
    const convo = newConversation()
    setConversations((prev) => [convo, ...prev])
    setActiveId(convo.id)
  }, [])

  const selectConversation = useCallback((id: string) => {
    setActiveId(id)
  }, [])

  const deleteConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id)
      const next = remaining.length ? remaining : [newConversation()]
      setActiveId((current) =>
        current === id ? next[0].id : current
      )
      return next
    })
  }, [])

  const sendMessage = useCallback(
    async (question: string) => {
      const targetId = activeId
      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content: question,
      }
      const pendingMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: "",
        pending: true,
      }

      setIsSending(true)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetId
            ? {
                ...c,
                title: c.messages.length === 0 ? titleFrom(question) : c.title,
                updatedAt: Date.now(),
                messages: [...c.messages, userMsg, pendingMsg],
              }
            : c
        )
      )

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        })

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          throw new Error(body.error ?? "The agent could not answer that.")
        }

        const data = (await res.json()) as AgentResponse
        const resolved: ChatMessage = {
          id: pendingMsg.id,
          role: "assistant",
          content: data.result,
          sql: data.sql,
          chartConfig: data.chartConfig,
          error: data.result
            ? undefined
            : "I couldn't generate a valid query for that request. Try rephrasing your question.",
        }

        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetId
              ? {
                  ...c,
                  updatedAt: Date.now(),
                  messages: c.messages.map((m) =>
                    m.id === pendingMsg.id ? resolved : m
                  ),
                }
              : c
          )
        )
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong."
        setConversations((prev) =>
          prev.map((c) =>
            c.id === targetId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === pendingMsg.id
                      ? { ...m, pending: false, error: message }
                      : m
                  ),
                }
              : c
          )
        )
      } finally {
        setIsSending(false)
      }
    },
    [activeId]
  )

  return {
    conversations,
    active,
    activeId,
    isSending,
    createConversation,
    selectConversation,
    deleteConversation,
    sendMessage,
  }
}
