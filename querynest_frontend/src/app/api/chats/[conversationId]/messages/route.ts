// app/api/chats/[conversationId]/messages/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { VertexAI } from "@google-cloud/vertexai";

export const config = { runtime: "nodejs" };

// Supabase admin (service role)
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Vertex AI client
const PROJECT_ID = process.env.GCP_PROJECT_ID!;
const LOCATION = process.env.GCP_LOCATION || "us-central1";
const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const MODEL_NAME = process.env.VERTEX_AI_MODEL || "gemini-1.5-flash";

export async function POST(req: Request, { params }: { params: { conversationId: string } }) {
  try {
    const { conversationId } = await params;
    const body = await req.json();
    const content = (body.content || "").toString().trim();
    const metadata = body.metadata || {};

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const pairId = typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : require("crypto").randomUUID();

    // 1) Save user message
    const { data: userInserted, error: insertErr } = await supabaseAdmin
      .from("messages")
      .insert([
        {
          conversation_id: conversationId,
          pair_id: pairId,
          role: "user",
          content,
          metadata,
        },
      ])
      .select()
      .single();

    if (insertErr) {
      console.error("insert user message error", insertErr);
      return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
    }

    // 2) Fetch conversation history
    const { data: msgs, error: fetchErr } = await supabaseAdmin
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (fetchErr) {
      console.error("fetch history error", fetchErr);
      return NextResponse.json({ error: "Failed to fetch conversation history" }, { status: 500 });
    }

    // 3) Build the “contents” array for Vertex AI
    const contents = (msgs || []).map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));
    // include current user message
    contents.push({ role: "user", parts: [{ text: content }] });

    // 4) Get generative model
    const model = vertexAI.getGenerativeModel({ model: MODEL_NAME });
    // (Use correct method according to SDK you installed)

    // 5) Setup grounding with Elasticsearch (native integration)
    const groundingConfig = {
      retrievalConfig: {
        datastore: process.env.VERTEX_AI_DATASTORE_ID!,
        searchConfig: {
          searchTemplate: process.env.ELASTIC_SEARCH_TEMPLATE || "default",
        },
      },
    };

    let response;
    try {
      response = await model.generateContent({
        contents,
        groundingConfig,
      });
    } catch (err) {
      console.error("Vertex AI generateContent failed", err);
      const fallback = "I’m sorry, I couldn’t generate a response.";
      // save fallback
      await supabaseAdmin
        .from("messages")
        .insert([
          {
            conversation_id: conversationId,
            pair_id: pairId,
            role: "assistant",
            content: fallback,
          },
        ]);
      return NextResponse.json({ assistant: fallback, user: userInserted });
    }

    // 6) Extract assistant text & grounding metadata
    let assistantText = "";
    try {
      // Many SDKs provide `response.text` or `response.output` etc.
      if (typeof response?.text === "string") {
        assistantText = response.text;
      } else if (response?.response?.text) {
        assistantText = response.response.text();
      } else if (response?.output?.[0]?.content?.[0]?.text) {
        assistantText = response.output[0].content[0].text;
      } else {
        assistantText = JSON.stringify(response).slice(0, 500);
      }

      // If grounding metadata is present
      if (response?.response?.groundingMetadata?.citationSources) {
        const cites = response.response.groundingMetadata.citationSources.map((c: any, idx: number) =>
          `\n[${idx + 1}] Source: ${c.uri || "Document"}`
        ).join("");
        assistantText += "\n" + cites;
      }
    } catch (parseErr) {
      console.error("Parsing Vertex AI response error", parseErr);
      assistantText = "Generated a response, but failed to parse it.";
    }

    assistantText = assistantText.trim();

    // 7) Store assistant reply
    const { data: aiInserted, error: aiInsertErr } = await supabaseAdmin
      .from("messages")
      .insert([
        {
          conversation_id: conversationId,
          pair_id: pairId,
          role: "assistant",
          content: assistantText,
        },
      ])
      .select()
      .single();

    if (aiInsertErr) {
      console.error("insert assistant message error", aiInsertErr);
      return NextResponse.json({ assistant: assistantText, user: userInserted });
    }

    return NextResponse.json({ user: userInserted, assistant: aiInserted });
  } catch (err) {
    console.error("chat processing error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: { params: { conversationId: string } }) {
  try {
    const { conversationId } = await params;
    const { data: messages, error } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("fetch messages error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ messages });
  } catch (err) {
    console.error("GET messages error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
