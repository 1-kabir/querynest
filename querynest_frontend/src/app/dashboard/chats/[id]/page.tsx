// app/dashboard/chats/[id]/page.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { Send as PaperPlane, Copy, User, Bot as Robot } from "lucide-react";
import { Button } from "@/components/ui/button";

// Dialog components import (shadcn ui)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

type Message = {
  id: string;
  pair_id?: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  // Unwrap params Promise (Next server component pattern)
  const { id: conversationId } = React.use(params);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Copy dialog state
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

    // If no body, bail with helpful error
    const ct = res.headers.get("content-type") || "";

    let json: any = null;
    if (ct.includes("application/json")) {
      // try/catch because JSON.parse() can throw on invalid JSON
      try {
        json = await res.json();
      } catch (parseErr) {
        const text = await res.text().catch(() => "");
        console.error("Invalid JSON from messages endpoint:", parseErr, "body:", text);
        throw new Error("Invalid JSON returned from messages endpoint");
      }
    } else {
      // not JSON — capture the body (text/html or empty) for debugging
      const text = await res.text().catch(() => "");
      console.error("Non-JSON response from messages endpoint", res.status, text);
      // If endpoint returned 200 with empty body, treat as empty messages list
      if (res.status === 200 && (!text || text.trim() === "")) {
        setMessages([]);
        return;
      }
      throw new Error(`Unexpected content-type: ${ct}`);
    }

    if (!res.ok) {
      // if json exists, prefer its error message
      const errMsg = (json && json.error) || `Failed to load messages (status ${res.status})`;
      throw new Error(errMsg);
    }

    setMessages(json.messages || []);
  } catch (err) {
    console.error("fetchMessages error", err);
    // optionally set an UI error state to show user
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

    const ct = res.headers.get("content-type") || "";
    let json: any = null;
    if (ct.includes("application/json")) {
      try {
        json = await res.json();
      } catch (parseErr) {
        const text = await res.text().catch(() => "");
        console.error("Invalid JSON from POST messages:", parseErr, text);
        throw new Error("Invalid JSON returned from server");
      }
    } else {
      const text = await res.text().catch(() => "");
      console.error("Non-JSON response on send:", res.status, text);
      throw new Error("Server returned non-JSON response");
    }

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

  /**
   * Utility: detect if any child is a block element like <pre>, or an element node,
   * in which case rendering a <p> is invalid. We fall back to a <div> wrapper.
   */
  const hasBlockChild = (children: React.ReactNode) => {
    const arr = React.Children.toArray(children);
    for (const c of arr) {
      if (React.isValidElement(c)) {
        const t: any = c.type;
        // direct check for 'pre' or block-level elements created by react-markdown
        if (t === "pre" || t === "div" || t === "ul" || t === "ol" || t === "h1" || t === "h2" || t === "h3") {
          return true;
        }
        // sometimes code blocks are returned as <code> wrapped in <pre>; detect that too
        if (t && typeof t === "function" && String(t).includes("pre")) {
          return true;
        }
      }
      // strings are safe
    }
    return false;
  };

  // Components mapping for react-markdown to ensure block elements get correct tags & classes
  const mdComponents: any = {
    // Paragraph: fallback to div if block child exists (pre/code etc.)
    p: ({ node, children }: { node: any; children: React.ReactNode }) => {
      if (hasBlockChild(children)) {
        return <div className="my-2">{children}</div>;
      }
      return <p className="my-2 leading-6">{children}</p>;
    },
    // Headings
    h1: ({ children }: any) => <h1 className="text-2xl font-semibold mt-4 mb-2">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-xl font-semibold mt-4 mb-2">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-lg font-semibold mt-3 mb-2">{children}</h3>,
    h4: ({ children }: any) => <h4 className="text-base font-semibold mt-3 mb-1">{children}</h4>,
    h5: ({ children }: any) => <h5 className="text-sm font-semibold mt-2 mb-1">{children}</h5>,
    h6: ({ children }: any) => <h6 className="text-sm font-medium mt-2 mb-1">{children}</h6>,

    // Lists
    ul: ({ children }: any) => <ul className="list-disc ml-6 my-2">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal ml-6 my-2">{children}</ol>,
    li: ({ children }: any) => <li className="mb-1">{children}</li>,

    // Links
    a: ({ node, ...props }: any) => (
      <a {...props} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline" />
    ),

    // Images
    img: ({ node, ...props }: any) => <img {...props} alt={props.alt || "image"} className="max-w-full rounded" />,

    // Code: inline vs block
    code: ({ node, inline, className, children, ...props }: any) => {
      if (inline) {
        return (
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs text-red-600" {...props}>
            {children}
          </code>
        );
      }
      // block code: output pre/code with overflow so it won't break layout
      return (
        <pre className="rounded bg-gray-900 text-white p-3 overflow-auto my-2">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    },
  };

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
              {loading && messages.length === 0 && <div className="text-sm text-gray-500">Loading...</div>}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${m.role === "assistant" ? "justify-start" : "justify-end"}`}
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

                  <div className={`max-w-[80%] p-3 rounded-xl shadow-sm ${m.role === "user" ? "bg-indigo-600 text-white" : "bg-gray-50 text-gray-900"}`}>
                    <div className="prose prose-sm max-w-full">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw, rehypeSanitize]}
                        components={mdComponents}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => handleCopy(m.content)} className="inline-flex items-center p-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded" title="Copy message">
                        <Copy className="w-3 h-3" />
                      </button>

                      <div className="ml-auto text-xs text-gray-400">{new Date(m.created_at).toLocaleString()}</div>
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
                <Button onClick={sendMessage} disabled={sending || !input.trim()} className="bg-indigo-600 hover:bg-indigo-700">
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