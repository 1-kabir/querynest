// app/dashboard/layout.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  PlusCircle,
  LogOut,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { FaBars } from "react-icons/fa";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { DialogTitle } from "@radix-ui/react-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const mainNav: SidebarItem[] = [
  { name: "New Chat", href: "/dashboard", icon: PlusCircle },
  { name: "Library", href: "/dashboard/library", icon: FileText },
];

const SidebarContent = () => {
  const [conversations, setConversations] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadConversations() {
    setLoading(true);
    try {
      const res = await fetch(`/api/conversations`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load conversations");
      setConversations(
        (json.conversations || []).map((c: any) => ({
          id: c.id,
          title: c.title || "Untitled",
        }))
      );
    } catch (err) {
      console.error("loadConversations error", err);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  async function handleDelete(conversationId: string) {
    setDeleting(conversationId);
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete conversation");
      }
      // Refresh the conversations list
      await loadConversations();
      window.location.href = `/dashboard`;
    } catch (err) {
      console.error("handleDelete error", err);
      // You might want to show an error message to the user
    } finally {
      setDeleting(null);
    }
  }

  async function handleLogout() {
    try {
      const res = await fetch('/api/logout', {
        method: 'POST',
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to log out');
      }
      window.location.href = '/';
    } catch (err) {
      console.error('handleLogout error', err);
      // You might want to show an error message to the user
    }
  }

  return (
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

        <div className="space-y-1">
          {loading && (
            <div className="px-4 text-sm text-gray-500">Loading...</div>
          )}
          {!loading && conversations.length === 0 && (
            <div className="px-4 text-sm text-gray-400">No chats yet</div>
          )}
          {!loading &&
            conversations.map((chat) => (
              <div key={chat.id} className="relative flex items-center w-full">
                {/* reserve space for the delete icon by adding padding-right on the button itself */}
                <Link
                  href={`/dashboard/chats/${chat.id}`}
                  className="block w-full min-w-0"
                >
                  <Button
                    variant="ghost"
                    size="default"
                    className="w-full flex items-center gap-3 px-4 pr-10 text-sm justify-start"
                    title={chat.title} // keep full title on hover
                  >
                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                    <span
                      className="truncate block text-left min-w-0"
                      style={{ maxWidth: 'calc(100%)' }}
                    >
                      {chat.title.length > 20
                        ? `${chat.title.slice(0, 20)}…`
                        : chat.title}
                    </span>
                  </Button>
                </Link>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete conversation ${chat.title}`}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20 text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this conversation and its messages.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(chat.id)}
                        disabled={deleting === chat.id}
                      >
                        {deleting === chat.id ? 'Deleting...' : 'Delete'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
        </div>
      </ScrollArea>

      <div className="px-2 py-4 border-t border-gray-200 space-y-2">
        <Button
          variant="ghost"
          size="default"
          className="w-full justify-start gap-3 px-4 text-red-600 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </Button>
      </div>
    </div>
  );
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

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
