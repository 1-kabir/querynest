// app/api/chats/[conversationId]/messages/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { VertexAI, GenerativeModel } from "@google-cloud/vertexai";
import { Client as ElasticClient } from "@elastic/elasticsearch";

export const config = { runtime: "nodejs" };

// Supabase admin (service role)
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Vertex AI
const PROJECT_ID = process.env.GCP_PROJECT_ID!;
const LOCATION = process.env.GCP_LOCATION || "us-central1";
const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const MODEL_NAME = process.env.VERTEX_AI_MODEL || "gemini-1.5-flash";

// Elasticsearch environment
const ELASTICSEARCH_URL = (process.env.ELASTIC_URL || "").replace(/\/+$/, ""); // trim trailing slashes
const ELASTICSEARCH_USERNAME = process.env.ELASTIC_USERNAME;
const ELASTICSEARCH_PASSWORD = process.env.ELASTIC_PASSWORD;
const ELASTIC_APIKEY = process.env.ELASTIC_APIKEY; // base64 encoded ApiKey (or the raw API key string)
const ELASTIC_SEARCH_TEMPLATE = process.env.ELASTIC_SEARCH_TEMPLATE || "grounding_search_template";
const USE_ES_GROUNDING = (process.env.ELASTIC_USE_GROUNDING || "true").toLowerCase() === "true";

// Optional: instantiate official client if username/password present (not required for Vertex grounding)
let elasticClient: any = undefined;
if (ELASTICSEARCH_URL && ELASTICSEARCH_USERNAME && ELASTICSEARCH_PASSWORD) {
  elasticClient = new ElasticClient({
    node: ELASTICSEARCH_URL,
    auth: {
      username: ELASTICSEARCH_USERNAME,
      password: ELASTICSEARCH_PASSWORD,
    },
    tls: { rejectUnauthorized: false },
  });
} else if (ELASTICSEARCH_URL && ELASTIC_APIKEY) {
  // You can still instantiate client via API key if you prefer; below we use fetch for simple queries.
  try {
    elasticClient = new ElasticClient({
      node: ELASTICSEARCH_URL,
      auth: { apiKey: ELASTIC_APIKEY },
      tls: { rejectUnauthorized: false },
    });
  } catch (e) {
    // ignore; we will fallback to fetch-based queries
    elasticClient = undefined;
  }
}

/* ---------- Helper placeholders (you already have these implemented) ---------- */
/* findTextInCandidateShape, extractAssistantText, extractCitations, unescapeString */
function findTextInCandidateShape(_resp: any) { /* ... */ }
function extractAssistantText(resp: any) {
  // Existing robust extractor you had. Keep using it.
  // Example naive fallback:
  if (!resp) return "";
  try {
    // prefer text from response.candidates or response.candidates[0].content
    const candidate = (resp?.candidates?.[0] || resp?.candidates || resp);
    if (candidate?.content) return candidate.content;
    if (candidate?.text) return candidate.text;
    return JSON.stringify(resp).slice(0, 1000);
  } catch {
    return "";
  }
}
function extractCitations(_resp: any) { return []; }
function unescapeString(s: string) { return s; }
/* ----------------------------------------------------------------------------- */

/** Fetch directly from Elasticsearch using fetch (supports ApiKey or basic auth) */
async function retrieveFromElasticsearch(query: string, indexName = "documents", maxResults = 5) {
  if (!ELASTICSEARCH_URL) return [];

  const url = `${ELASTICSEARCH_URL}/${encodeURIComponent(indexName)}/_search`;
  const body = {
    size: maxResults,
    query: {
      multi_match: {
        query,
        fields: ["content^3", "ocr_text", "originalName"],
        fuzziness: "AUTO",
      },
    },
    _source: ["fileId", "originalName", "content", "ocr_text", "filename"],
  };

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (ELASTIC_APIKEY) {
    // Vertex expects header like "ApiKey <base64...>" — supply same for direct calls.
    // If your ELASTIC_APIKEY already includes "ApiKey " prefix, don't double it.
    headers["Authorization"] = ELASTIC_APIKEY.startsWith("ApiKey ")
      ? ELASTIC_APIKEY
      : `ApiKey ${ELASTIC_APIKEY}`;
  } else if (ELASTICSEARCH_USERNAME && ELASTICSEARCH_PASSWORD) {
    const creds = Buffer.from(`${ELASTICSEARCH_USERNAME}:${ELASTICSEARCH_PASSWORD}`).toString("base64");
    headers["Authorization"] = `Basic ${creds}`;
  } else {
    throw new Error("No Elasticsearch credentials configured (ELASTIC_APIKEY or username/password).");
  }

  try {
    const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (!resp.ok) {
      const text = await resp.text();
      console.error("Elasticsearch HTTP error", resp.status, text);
      return [];
    }
    const json = await resp.json();
    const hits = json.hits?.hits || [];
    return hits.map((h: any) => {
      const title = h._source?.originalName || h._source?.filename || "";
      const content = h._source?.content || h._source?.ocr_text || "";
      const id = h._id || h._source?.fileId || "";
      // return an object or a plain string depending on how you later want to reference
      return { id, title, content, score: h._score ?? null };
    });
  } catch (err) {
    console.error("retrieveFromElasticsearch error:", err);
    return [];
  }
}

/** --- GET messages for a conversation --- */
export async function GET(req: Request, { params }: { params: { conversationId: string } }) {
  try {
    const { conversationId } = params;
    if (!conversationId) return NextResponse.json({ error: "conversationId is required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    return NextResponse.json({ messages: data }, { status: 200 });
  } catch (err) {
    console.error("GET messages error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** --- POST: send message and get grounded response --- */
export async function POST(req: Request, { params }: { params: { conversationId: string } }) {
  try {
    const { conversationId } = params;
    const body = await req.json();
    const content = (body.content || "").toString().trim();
    const metadata = body.metadata || {};

    if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });

    const pairId = typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : require("crypto").randomUUID();

    // Insert user message
    const { data: userInserted, error: insertErr } = await supabaseAdmin
      .from("messages")
      .insert([{
        conversation_id: conversationId,
        pair_id: pairId,
        role: "user",
        content,
        metadata,
      }])
      .select()
      .single();

    if (insertErr) {
      console.error("insert user message error", insertErr);
      return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
    }

    // Fetch history for context
    const { data: msgs, error: fetchErr } = await supabaseAdmin
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (fetchErr) {
      console.error("fetch history error", fetchErr);
      return NextResponse.json({ error: "Failed to fetch conversation history" }, { status: 500 });
    }

    const historyContents = (msgs || []).map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    // If ES native grounding is enabled, prefer that (Vertex will call ES itself).
    // Otherwise, do our manual retrieval and inject context into the prompt.
    let retrievedDocsForLogging: any[] = [];
    let retrievedContext = "";

    if (USE_ES_GROUNDING && ELASTIC_APIKEY && ELASTICSEARCH_URL) {
      // Vertex native grounding will be used; we do NOT inject retrievedContext to avoid duplication.
      console.log("Using Vertex-native Elasticsearch grounding (tools).");
    } else {
      // Manual retrieval fallback
      if (ELASTICSEARCH_URL) {
        console.log("Performing manual Elasticsearch retrieval for query:", content);
        retrievedDocsForLogging = await retrieveFromElasticsearch(content, "documents", 5);
        if (retrievedDocsForLogging.length > 0) {
          retrievedContext = "Relevant Information:\n" + retrievedDocsForLogging
            .map(d => `${d.title ? d.title + ': ' : ''}${(d.content || "").slice(0, 400)}`)
            .join("\n---\n");
          console.log("Retrieved docs count:", retrievedDocsForLogging.length);
        } else {
          console.log("No docs retrieved (manual retrieval).");
        }
      } else {
        console.log("No ES config available for manual retrieval.");
      }
    }

    // Build inputs (history + optional manual context + user)
    const modelInputs: any[] = [...historyContents];
    if (retrievedContext) {
      modelInputs.push({ role: "user", parts: [{ text: retrievedContext }] });
    }
    modelInputs.push({ role: "user", parts: [{ text: content }] });

    // Prepare model
    const model: GenerativeModel = vertexAI.getGenerativeModel({ model: MODEL_NAME });

    // Optionally build 'tools' for Vertex-native ES grounding per docs:
    // Vertex expects a 'tools' array where retrieval.externalApi has api_spec: "ELASTIC_SEARCH"
    // and apiAuth.apiKeyConfig.apiKeyString set to "ApiKey <BASE64>" — see docs. :contentReference[oaicite:1]{index=1}
    let tools: any[] | undefined = undefined;
    if (USE_ES_GROUNDING && ELASTIC_APIKEY && ELASTICSEARCH_URL) {
      tools = [{
        retrieval: {
          externalApi: {
            api_spec: "ELASTIC_SEARCH",
            endpoint: ELASTICSEARCH_URL,
            apiAuth: {
              apiKeyConfig: {
                // Vertex docs expect "ApiKey <key>" string
                apiKeyString: ELASTIC_APIKEY.startsWith("ApiKey ") ? ELASTIC_APIKEY : `ApiKey ${ELASTIC_APIKEY}`,
              },
            },
            elasticSearchParams: {
              index: "documents",
              searchTemplate: ELASTIC_SEARCH_TEMPLATE,
              numHits: 5,
            },
          },
        },
      }];
    }

    console.log("Model Input (history+context+query) preview:", JSON.stringify(modelInputs).slice(0, 1200));

    // Generate content: include tools if we built them, otherwise legacy call (no grounding tool)
    let response: any;
    try {
      const genArgs: any = { contents: modelInputs };
      if (tools) genArgs.tools = tools;
      response = await model.generateContent(genArgs);
    } catch (sdkErr) {
      console.error("Vertex AI generateContent failed", sdkErr);
      const fallbackText = "I’m sorry — I couldn't generate a response right now.";

      // Save fallback assistant message
      await supabaseAdmin.from("messages").insert([{
        conversation_id: conversationId,
        pair_id: pairId,
        role: "assistant",
        content: fallbackText,
      }]);

      const assistantResponse = {
        id: `err-${pairId}`,
        role: "assistant" as const,
        content: fallbackText,
        created_at: new Date().toISOString(),
        pair_id: pairId,
        conversation_id: conversationId,
        metadata: { error: "SDK_ERROR" },
      };

      return NextResponse.json({ assistant: assistantResponse, user: userInserted });
    }

    // Extract assistant text & citations
    let assistantText = extractAssistantText(response);
    assistantText = unescapeString(assistantText).trim();
    if (!assistantText) assistantText = "Sorry — the assistant produced no textual reply.";

    // If Vertex-native grounding used, the response may contain grounding metadata; extractCitations should handle it.
    const citations = extractCitations(response) || [];

    // Save assistant message
    const { data: aiInserted, error: aiInsertErr } = await supabaseAdmin
      .from("messages")
      .insert([{
        conversation_id: conversationId,
        pair_id: pairId,
        role: "assistant",
        content: assistantText,
        metadata: {
          citations,
          retrieved_from: USE_ES_GROUNDING ? "elasticsearch_native" : "elasticsearch_manual",
          retrieved_docs: USE_ES_GROUNDING ? undefined : retrievedDocsForLogging,
        },
      }])
      .select()
      .single();

    if (aiInsertErr) {
      console.error("insert assistant message error", aiInsertErr);
      const assistantResponse = {
        id: `temp-${pairId}`,
        role: "assistant" as const,
        content: assistantText,
        created_at: new Date().toISOString(),
        pair_id: pairId,
        conversation_id: conversationId,
        metadata: { citations },
      };
      return NextResponse.json({ assistant: assistantResponse, user: userInserted });
    }

    return NextResponse.json({ user: userInserted, assistant: aiInserted }, { status: 200 });
  } catch (err) {
    console.error("chat processing error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
