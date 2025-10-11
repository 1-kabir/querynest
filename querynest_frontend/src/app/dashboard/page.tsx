"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const NewChat = () => {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const createConversation = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create conversation");

      router.push(`/dashboard/chats/${json.conversation.id}`);
    } catch (err: any) {
      console.error("createConversation error", err);
      alert(err?.message || "Failed to create conversation");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">

      {/* Main Chat Section */}
      <section className="flex-grow flex flex-col items-center justify-center px-4 py-20 sm:py-24">
        {/* Greeting Header */}
        <div className="text-center mb-10">
          <div className="inline-block rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20 mb-4">
            Welcome Back to QueryNest
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900">
            Start a <span className="text-indigo-600">New Chat</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Ask questions about your uploaded documents, or explore insights across your knowledge hub — powered by QueryNest AI.
          </p>
        </div>

        {/* Central Chat Preview / Empty State */}
        <div className="w-full max-w-3xl flex flex-col items-center justify-center bg-white rounded-2xl shadow-lg border border-gray-200 p-8 sm:p-12 text-center transition-all duration-300 hover:shadow-2xl">
          <div className="h-14 w-14 flex items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 mb-6">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-3">
            How can I help you today?
          </h2>
          <p className="text-gray-600 mb-6 max-w-md">
            You can ask questions like:
            <br />
            <span className="text-gray-800 font-medium">
              “Summarize the Q3 marketing plan”  
            </span> or{" "}
            <span className="text-gray-800 font-medium">
              “What’s the latest budget from Project Phoenix?”
            </span>
          </p>

          {/* Suggested Prompts */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-8">
            {[
              "Summarize latest project updates",
              "Compare Q4 vs Q3 performance",
              "List key insights from research docs",
            ].map((prompt, i) => (
              <button
                key={i}
                className="rounded-full border border-indigo-200 px-4 py-2 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <div className="relative w-full max-w-2xl">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              type="text"
              placeholder="Ask anything about your documents..."
              className="w-full rounded-full border border-gray-300 bg-white px-6 py-4 text-base text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
            />
            <Button
              size="icon"
              variant="default"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 bg-indigo-600 hover:bg-indigo-700"
              onClick={createConversation}
              disabled={creating}
            >
              <Send className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default NewChat;