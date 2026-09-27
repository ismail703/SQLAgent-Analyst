"use client"

import { Database, MessageSquare, Plus, Trash2 } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import type { Conversation } from "@/lib/types"

export function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
}: {
  conversations: Conversation[]
  activeId: string
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
}) {
  return (
    <Sidebar>
      <SidebarHeader className="gap-3 p-3">
        <div className="flex items-center gap-2 px-1">
          <div className="flex size-8 items-center justify-center rounded-lg gradient-brand text-white shadow-blue-soft">
            <Database className="size-4" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              QueryPilot
            </span>
            <span className="text-[0.6875rem] text-muted-foreground">
              Text-to-SQL analytics
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center justify-center gap-2 rounded-lg gradient-brand px-3 py-2 text-sm font-medium text-white shadow-blue-soft transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" aria-hidden="true" />
          New chat
        </button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Conversations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {conversations.map((c) => (
                <SidebarMenuItem key={c.id}>
                  <SidebarMenuButton
                    isActive={c.id === activeId}
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      c.id === activeId &&
                        "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <MessageSquare className="size-4" aria-hidden="true" />
                    <span className="truncate">{c.title}</span>
                  </SidebarMenuButton>
                  <SidebarMenuAction
                    onClick={() => onDelete(c.id)}
                    showOnHover
                    aria-label={`Delete conversation ${c.title}`}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </SidebarMenuAction>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <p className="px-1 text-[0.6875rem] leading-relaxed text-muted-foreground">
          Connect a database to run real queries. This demo uses simulated
          results.
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
