// app/dashboard/layout.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, PlusCircle, LogOut, MessageSquare } from "lucide-react";
import { FaBars } from "react-icons/fa";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { DialogTitle } from "@radix-ui/react-dialog";

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const mainNav: SidebarItem[] = [
  { name: "New Chat", href: "/dashboard", icon: PlusCircle },
  { name: "Library", href: "/dashboard/library", icon: FileText },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [conversations, setConversations] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadConversations() {
      setLoading(true);
      try {
        // No auth or userId required — fetch all conversations (adjust API if needed)
        const res = await fetch(`/api/conversations`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load conversations");
        if (!mounted) return;

        const list = (json.conversations || []).map((c: any) => ({
          id: c.id,
          title: c.title || "Untitled",
        }));

        setConversations(list);
      } catch (err) {
        console.error("loadConversations error", err);
        if (mounted) setConversations([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadConversations();
    return () => {
      mounted = false;
    };
  }, []);

  // Sidebar content extracted
  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-white border-r border-gray-200 w-64">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200">
        <div className="h-9 w-9 rounded-md flex items-center justify-center bg-indigo-600 text-white font-bold">
          QN
        </div>
        <span className="text-lg font-semibold">QueryNest</span>
      </div>

      <ScrollArea className="flex-1 px-2 py-4 space-y-2">
        {mainNav.map((item) => (
          <Link key={item.name} href={item.href}>
            <Button
              variant="ghost"
              size="default"
              className="w-full justify-start gap-3 px-4"
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Button>
          </Link>
        ))}

        <hr className="my-2 border-gray-200" />

        <div className="px-3 text-xs text-gray-500 mb-1">Chats</div>

        {/* User chats */}
        <div className="space-y-1">
          {loading && <div className="px-4 text-sm text-gray-500">Loading...</div>}
          {!loading && conversations.length === 0 && (
            <div className="px-4 text-sm text-gray-400">No chats yet</div>
          )}
          {!loading &&
            conversations.map((chat) => (
              <Link key={chat.id} href={`/dashboard/chats/${chat.id}`}>
                <Button
                  variant="ghost"
                  size="default"
                  className="w-full justify-start gap-3 px-4 text-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  {chat.title}
                </Button>
              </Link>
            ))}
        </div>
      </ScrollArea>

      <div className="px-2 py-4 border-t border-gray-200 space-y-2">
        <Button
          variant="ghost"
          size="default"
          className="w-full justify-start gap-3 px-4 text-red-600 hover:bg-red-50"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="hidden md:flex md:flex-shrink-0">
        <SidebarContent />
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <button className="md:hidden p-3 fixed top-4 left-4 z-50 inline-flex items-center justify-center rounded-md bg-white shadow-md">
            <FaBars className="h-5 w-5 text-indigo-600" />
          </button>
        </SheetTrigger>

        <SheetContent side="left" className="w-64 p-0 bg-white border-r border-gray-200">
          <VisuallyHidden>
            <DialogTitle>Mobile Navigation Menu</DialogTitle>
          </VisuallyHidden>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
