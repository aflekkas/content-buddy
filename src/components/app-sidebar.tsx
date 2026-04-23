"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, LogOut, MessageSquare, ChevronsUpDown, User } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import type { ChatRow } from "@/lib/db/types";

type Props = {
  chats: ChatRow[];
  user: { id: string; email: string };
};

export function AppSidebar({
  chats,
  user,
  ...props
}: Props & React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = (user.email || "?")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={BRAND_NAME}
              render={
                <Link href="/dashboard">
                  <LogoMark size={32} className="rounded-lg" />
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate font-semibold">
                      {BRAND_NAME}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {BRAND_TAGLINE}
                    </span>
                  </div>
                </Link>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="New chat"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
              render={
                <Link href="/dashboard/chat/new">
                  <Plus />
                  <span>New chat</span>
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recent</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.length === 0 ? (
                <div className="px-2 py-1.5 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                  No chats yet.
                </div>
              ) : (
                chats.map((chat) => (
                  <SidebarMenuItem key={chat.id}>
                    <SidebarMenuButton
                      tooltip={chat.title || "New chat"}
                      render={
                        <Link href={`/dashboard/chat/${chat.id}`}>
                          <MessageSquare />
                          <span>{chat.title || "New chat"}</span>
                        </Link>
                      }
                    />
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    tooltip={user.email}
                    className="data-[state=open]:bg-sidebar-accent"
                  >
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="rounded-lg text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left leading-tight">
                      <span className="truncate text-sm font-medium">
                        {user.email}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-56"
              >
                <DropdownMenuItem
                  render={
                    <Link href="/dashboard/profile">
                      <User className="mr-2 size-4" />
                      Your context
                    </Link>
                  }
                />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
