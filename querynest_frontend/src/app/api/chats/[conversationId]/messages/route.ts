// app/api/chats/[conversationId]/messages/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { VertexAI, GenerativeModel } from "@google-cloud/vertexai";

export const config = { runtime: "nodejs" };

// stronger system prompt that instructs tool usage explicitly
const SYSTEM_PROMPT =
  "You are a helpful assistant with access to an external document search tool named 'elasticsearch'. " +
  "Whenever a user query is about facts, documents, or the user's personal/work/academic data, you MUST call the " +
  "'elasticsearch' tool to retrieve relevant passages and include citations from those passages in your answer. " +
  "If the tool returns results, use them as authoritative and indicate the source (doc id or filename). " +
  "If the tool cannot be reached or returns no results, say so and answer based on your knowledge (or say you don't know).";

// supabase / vertex / es envs (same as yours)
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PROJECT_ID = process.env.GCP_PROJECT_ID!;
const LOCATION = process.env.GCP_LOCATION || "us-central1";
const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const MODEL_NAME = process.env.VERTEX_AI_MODE || process.env.VERTEX_AI_MODEL || "gemini-1.5-flash";

const ELASTICSEARCH_URL = (process.env.ELASTIC_URL || "").replace(/\/+$/, "");
const ELASTIC_APIKEY_RAW = process.env.ELASTIC_APIKEY || "";
const ELASTIC_SEARCH_TEMPLATE = process.env.ELASTIC_SEARCH_TEMPLATE || "grounding_search_template";
const USE_ES_GROUNDING = (process.env.ELASTIC_USE_GROUNDING || "true").toLowerCase() === "true";

/* helpers (keep your implementations) */
function extractAssistantText(responseObj: any): string {
  if (!responseObj) return "";
  const res = responseObj.response || responseObj;
  try {
    if (res.candidates && res.candidates.length > 0) {
      const candidate = res.candidates[0];
      if (candidate.content?.parts && candidate.content.parts.length > 0) {
        return candidate.content.parts.map((p: any) => p.text || "").join("\n");
      }
      if (typeof candidate.content === "string") return candidate.content;
    }
  } catch (e) {
    console.error("extractAssistantText parsing error", e);
  }
  return "";
}
function extractCitations(_: any) { return []; }
function unescapeString(s: string) { return s; }

function formatApiKey(raw: string) {
  if (!raw) return "";
  return raw.startsWith("ApiKey ") ? raw : `ApiKey ${raw}`;
}

/* perform manual retrieval (fallback only) */
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
  if (ELASTIC_APIKEY_RAW) headers["Authorization"] = formatApiKey(ELASTIC_APIKEY_RAW);
  try {
    const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    if (!resp.ok) {
      console.error("ES error", resp.status, await resp.text());
      return [];
    }
    const json = await resp.json();
    return (json.hits?.hits || []).map((h: any) => ({
      id: h._id || h._source?.fileId || "",
      title: h._source?.originalName || h._source?.filename || "",
      content: h._source?.content || h._source?.ocr_text || "",
      score: h._score ?? null,
    }));
  } catch (err) {
    console.error("retrieveFromElasticsearch error:", err);
    return [];
  }
}

/** POST handler — prioritise native grounding and only inject docs as a fallback */
export async function POST(req: Request, { params }: { params: { conversationId: string } }) {
  try {
    const { conversationId } = await params;
    const body = await req.json();
    const content = (body.content || "").toString().trim();
    const metadata = body.metadata || {};

    if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });

    const pairId = typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : require("crypto").randomUUID();

    // store user message
    const { data: userInserted, error: insertErr } = await supabaseAdmin
      .from("messages")
      .insert([{ conversation_id: conversationId, pair_id: pairId, role: "user", content, metadata }])
      .select()
      .single();
    if (insertErr) {
      console.error("insert user message error", insertErr);
      return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
    }

    // fetch history as before
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

    // Build base inputs (history + user)
    const modelInputsBase: any[] = [...historyContents];
    modelInputsBase.push({ role: "user", parts: [{ text: content }] });

    // Set up model with system instruction (explicit)
    const model: GenerativeModel = vertexAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
    });

    // Build tools if native grounding enabled.
    // >>> FIX: DO NOT include `name` or `description` fields here — Vertex rejects unknown top-level keys.
    let tools: any[] | undefined = undefined;
    let willAttemptNativeGrounding = USE_ES_GROUNDING && !!ELASTIC_APIKEY_RAW && !!ELASTICSEARCH_URL;
    if (willAttemptNativeGrounding) {
      tools = [{
        // no name/description keys here — removed to match Vertex API
        retrieval: {
          externalApi: {
            api_spec: "ELASTIC_SEARCH",
            endpoint: ELASTICSEARCH_URL,
            apiAuth: { apiKeyConfig: { apiKeyString: formatApiKey(ELASTIC_APIKEY_RAW) } },
            elasticSearchParams: {
              index: "documents",
              searchTemplate: ELASTIC_SEARCH_TEMPLATE,
              numHits: 5,
            },
          },
        },
      }];
    }

    // 1) Primary attempt: ask Vertex to generate with tools present (native grounding preferred)
    let genResponse: any = null;
    let usedNativeGrounding = false;
    try {
      console.log("Primary Vertex.generateContent call; toolsPresent=", !!tools);
      const genArgs: any = { contents: modelInputsBase };
      if (tools) genArgs.tools = tools;

      const callResult = await model.generateContent(genArgs);
      genResponse = await (callResult?.response ?? callResult);
      console.log("Primary Vertex response (truncated):", JSON.stringify(genResponse, null, 2).slice(0, 2000));

      // check for toolResponses / grounding metadata
      const toolResponses = genResponse?.toolResponses || genResponse?.response?.toolResponses || null;
      const groundingMeta = genResponse?.grounding || genResponse?.groundingMetadata || null;
      const hasRetrieval = !!(toolResponses && toolResponses.length > 0) || (groundingMeta && Object.keys(groundingMeta).length > 0);

      if (tools && hasRetrieval) {
        usedNativeGrounding = true;
        console.log("Primary attempt: Vertex used native ES grounding (toolResponses/groundingMetadata present).");
      } else if (tools && !hasRetrieval) {
        console.warn("Primary attempt: Vertex did NOT return toolResponses/groundingMetadata. Will try a targeted 'call-tool' prompt once.");
      }
    } catch (err) {
      console.error("Primary Vertex.generateContent failed:", err);
      genResponse = null;
    }

    // 2) If primary attempt did not produce a tool invocation AND tools exist, perform ONE explicit retry
    if (!usedNativeGrounding && tools) {
      try {
        // targeted prompt instructing model to call the tool (keeps it short)
        const explicitToolPrompt = [
          { role: "system", parts: [{ text: SYSTEM_PROMPT }] },
          { role: "user", parts: [{ text: `Please use the "elasticsearch" tool now to retrieve documents relevant to: "${content}". Only call the tool and return your retrieval output (do not answer yet).` }] },
        ];
        console.log("Second Vertex.generateContent call (explicit tool request).");
        const callResult2 = await model.generateContent({ contents: explicitToolPrompt, tools });
        const resp2 = await (callResult2?.response ?? callResult2);
        console.log("Explicit-tool-response (truncated):", JSON.stringify(resp2, null, 2).slice(0, 2000));

        // If Vertex returned toolResponses, mark native grounding used and then do the actual generation (so model can use the tool output)
        const toolResponses2 = resp2?.toolResponses || resp2?.response?.toolResponses || null;
        const groundingMeta2 = resp2?.grounding || resp2?.groundingMetadata || null;
        const hasRetrieval2 = !!(toolResponses2 && toolResponses2.length > 0) || (groundingMeta2 && Object.keys(groundingMeta2).length > 0);

        if (hasRetrieval2) {
          usedNativeGrounding = true;
          console.log("Explicit attempt: Vertex returned toolResponses/groundingMetadata. Now do final generateContent to consume them.");

          // Final call to produce assistant text with tool outputs available to the model
          const finalGenArgs: any = { contents: modelInputsBase, tools };
          const callResult3 = await model.generateContent(finalGenArgs);
          genResponse = await (callResult3?.response ?? callResult3);
          console.log("Final Vertex response after explicit-tool (truncated):", JSON.stringify(genResponse, null, 2).slice(0, 2000));
        } else {
          console.warn("Explicit attempt also did not produce toolResponses. Will fall back to manual retrieval.");
        }
      } catch (err2) {
        console.error("Explicit-tool Vertex.generateContent failed:", err2);
        // do nothing here; fallback path below
      }
    }

    // 3) If native grounding not used, fallback to manual retrieval and single re-call (ONLY fallback)
    let retrievedDocsForLogging: any[] = [];
    if (!usedNativeGrounding) {
      console.log("Native grounding not used — performing manual retrieval (fallback).");
      retrievedDocsForLogging = await retrieveFromElasticsearch(content, "documents", 5);

      // If we have retrieved docs, inject a 'tool' role message so the model sees authoritative tool output (fallback path)
      if (retrievedDocsForLogging.length > 0) {
        const toolText = retrievedDocsForLogging
          .map(d => `${d.title ? d.title + ' | ' : ''}${d.id}\n${(d.content || "").slice(0, 800)}`)
          .join("\n---\n");

        // >>> FIX: DO NOT include `name` field in contents items. Vertex rejects `name` on contents.
        // Build fallback inputs: history + (tool role with ES results) + user query
        const fallbackInputs: any[] = [...historyContents];
        fallbackInputs.push({ role: "tool", parts: [{ text: `ELASTICSEARCH_TOOL_RESULT:\n${toolText}` }] }); // no name here
        fallbackInputs.push({ role: "user", parts: [{ text: content }] });

        try {
          const callResultFallback = await model.generateContent({ contents: fallbackInputs });
          genResponse = await (callResultFallback?.response ?? callResultFallback);
          console.log("Fallback generateContent response (truncated):", JSON.stringify(genResponse, null, 2).slice(0, 2000));
        } catch (fbErr) {
          console.error("Fallback model.generateContent failed:", fbErr);
        }
      } else {
        console.log("Manual retrieval returned no documents; will proceed without grounding.");
      }
    }

    // Extract assistant text & citations
    let assistantText = extractAssistantText(genResponse);
    assistantText = unescapeString(assistantText).trim();
    if (!assistantText) assistantText = "Sorry — the assistant produced no textual reply.";

    const citations = extractCitations(genResponse) || [];

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
          retrieved_from: usedNativeGrounding ? "elasticsearch_native" : "elasticsearch_manual",
          retrieved_docs: usedNativeGrounding ? undefined : retrievedDocsForLogging,
        },
      }])
      .select()
      .single();

    if (aiInsertErr) {
      console.error("insert assistant message error", aiInsertErr);
      return NextResponse.json({ assistant: { role: "assistant", content: assistantText }, user: userInserted });
    }

    return NextResponse.json({ user: userInserted, assistant: aiInserted }, { status: 200 });
  } catch (err) {
    console.error("chat processing error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
