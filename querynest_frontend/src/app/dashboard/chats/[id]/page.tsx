// app/dashboard/chats/[id]/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { Send as PaperPlane, Copy, User, Bot as Robot } from "lucide-react";
import { Button } from "@/components/ui/button";

type Message = {
  id: string;
  pair_id?: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap the params Promise
  const { id: conversationId } = React.use(params);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Dialog state for copy feedback
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyText, setCopyText] = useState("");

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  async function fetchMessages() {
    try {
      setLoading(true);
      const res = await fetch(`/api/chats/${conversationId}/messages`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load messages");
      setMessages(json.messages || []);
    } catch (err) {
      console.error("fetchMessages error", err);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chats/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: input }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Send failed");

      if (json.user && json.assistant) {
        setMessages((prev) => [...prev, json.user, json.assistant]);
      } else {
        await fetchMessages();
      }
      setInput("");
    } catch (err) {
      console.error("sendMessage error", err);
    } finally {
      setSending(false);
    }
  }

  // Open Copy dialog, write to clipboard, then show success dialog
  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyText("Copied to clipboard");
    } catch (err) {
      console.error("copy failed", err);
      setCopyText("Copy failed");
    } finally {
      setCopyDialogOpen(true);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Chat</h2>
          <p className="text-sm text-gray-500">Conversation: {conversationId}</p>
        </div>

        <div className="bg-white rounded-2xl shadow border border-gray-100">
          <div className="p-4 h-[60vh] overflow-auto" ref={listRef}>
            <div className="space-y-4">
              {loading && messages.length === 0 && (
                <div className="text-sm text-gray-500">Loading...</div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${
                    m.role === "assistant" ? "justify-start" : "justify-end"
                  }`}
                >
                  <div className="flex-shrink-0">
                    {m.role === "user" ? (
                      <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <User className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">
                        <Robot className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div
                    className={`max-w-[80%] p-3 rounded-xl shadow-sm ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-50 text-gray-900"
                    }`}
                  >
                    <div className="prose prose-sm max-w-full">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeSanitize]}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      {/* Copy button — now just an icon */}
                      <button
                        onClick={() => handleCopy(m.content)}
                        className="inline-flex items-center p-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                      >
                        <Copy className="w-3 h-3" />
                      </button>

                      {/* Removed Delete button entirely */}
                      {/* <button ...> <Trash2 ... /> Delete </button> */}

                      <div className="ml-auto text-xs text-gray-400">
                        {new Date(m.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 p-4">
            <div className="flex gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 resize-none rounded-md border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />

              <div className="flex flex-col gap-2">
                <Button
                  onClick={sendMessage}
                  disabled={sending || !input.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <PaperPlane className="w-4 h-4 mr-2" /> Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copy Result Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copyText === "Copied to clipboard" ? "Success" : "Notice"}</DialogTitle>
            <DialogDescription>{copyText}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">OK</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

// Import Dialog components if not already imported
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";