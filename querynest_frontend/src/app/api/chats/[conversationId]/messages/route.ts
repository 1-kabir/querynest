// app/api/chats/[conversationId]/messages/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI, FunctionCallingConfigMode } from "@google/genai";
import { randomUUID } from "crypto";

export const config = { runtime: "nodejs" };

// --- system prompt ---
const SYSTEM_PROMPT =
  "You are an intelligent assistant for a company called QueryNest, which helps users easily interact with and query their documents." +
  "If you need to fetch information from the knowledge base, you may call the function named 'elasticsearch' with a single parameter 'query'. " +
  "If you're asked something personal, or related to something that you probably don't know the answer to, query the knowledgebase to see if you can find an answer. " +
  "If you're asked for something that may be related to a file, assume its from the knowledgebase and query it. " +
  "Treat this function as the user's knowledge base. The user knows this function as their 'knowledgebase'" +
  "If you call it, the server will execute the search and provide the results back to you. Otherwise, answer the user's questions directly and naturally." 


// --- env / clients ---
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PROJECT_ID = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || "";
const LOCATION = process.env.GCP_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || "us-central1";
const MODEL_NAME = process.env.VERTEX_AI_MODEL || process.env.VERTEX_AI_MODE || "gemini-2.5-pro";

const ELASTICSEARCH_URL = (process.env.ELASTIC_URL || "").replace(/\/+$/, "");
const ELASTIC_APIKEY_RAW = process.env.ELASTIC_APIKEY || "";
const ELASTIC_INDEX = process.env.ELASTIC_INDEX || "documents";
const ELASTIC_NUM_HITS = Number(process.env.ELASTIC_NUM_HITS || "5");
const USE_ES_GROUNDING = (process.env.ELASTIC_USE_GROUNDING || "true").toLowerCase() === "true";

// New: max bytes for the tool (adjust via env ES_TOOL_RESPONSE_MAX_BYTES)
const ES_TOOL_RESPONSE_MAX_BYTES = Number(process.env.ES_TOOL_RESPONSE_MAX_BYTES || "100000"); // default 100KB

const genAI = new GoogleGenAI({
  vertexai: true,
  project: PROJECT_ID,
  location: LOCATION,
});

// --- helpers ---
function formatApiKey(raw: string) {
  if (!raw) return "";
  return raw.startsWith("ApiKey ") ? raw : `ApiKey ${raw}`;
}

function safeGetText(resp: any): string {
  if (!resp) return "";
  try {
    // Prefer top-level text property
    if (typeof resp.text === "string" && resp.text.trim()) return resp.text.trim();
    // Some SDK shapes export output / output_text
    if (typeof resp.output === "string" && resp.output.trim()) return resp.output.trim();
    if (typeof resp.output_text === "string" && resp.output_text.trim()) return resp.output_text.trim();

    // Function-calling candidate shapes / alternatives
    if (resp?.candidates && Array.isArray(resp.candidates) && resp.candidates.length) {
      const cand = resp.candidates[0];
      if (cand?.content) {
        if (typeof cand.content === "string") return cand.content;
        if (Array.isArray(cand.content.parts)) {
          return cand.content.parts.map((p: any) => p.text || "").join("");
        }
      }
      if (typeof cand.output === "string" && cand.output.trim()) return cand.output;
    }

    // Older / alternate shapes
    if (Array.isArray(resp.content?.parts)) {
      return resp.content.parts.map((p: any) => p.text || "").join("");
    }
  } catch (e) {
    console.error("safeGetText parse error", e);
  }
  return "";
}

/**
 * Extract model function-call (if present) from a generateContent response.
 */
function extractFunctionCall(resp: any): { name: string; args: any; rawCandidate?: any } | null {
  if (!resp) return null;

  // Check canonical SDK shapes
  if (Array.isArray(resp.functionCalls) && resp.functionCalls.length) {
    const fc = resp.functionCalls[0];
    return { name: fc.name, args: fc.args || fc.parameters || {}, rawCandidate: resp.functionCalls[0] };
  }

  if (Array.isArray(resp.function_calls) && resp.function_calls.length) {
    const fc = resp.function_calls[0];
    return { name: fc.name, args: fc.args || fc.parameters || {}, rawCandidate: resp.function_calls[0] };
  }

  // candidates-based shapes
  if (resp.candidates && resp.candidates.length) {
    const cand = resp.candidates[0];

    if (cand?.functionCalls && cand.functionCalls.length) {
      const fc = cand.functionCalls[0];
      return { name: fc.name, args: fc.args || fc.arguments || {}, rawCandidate: cand };
    }

    if (cand.function_call) {
      return { name: cand.function_call.name, args: cand.function_call.args || cand.function_call.arguments || {}, rawCandidate: cand };
    }
    if (cand.functionCall) {
      return { name: cand.functionCall.name, args: cand.functionCall.args || cand.functionCall.arguments || {}, rawCandidate: cand };
    }

    // sometimes function_call is embedded in content parts
    if (cand.content && Array.isArray(cand.content.parts)) {
      for (const p of cand.content.parts) {
        if (p.function_call) {
          return { name: p.function_call.name, args: p.function_call.args || p.function_call.arguments || {}, rawCandidate: cand };
        }
        if (p.functionCall) {
          return { name: p.functionCall.name, args: p.functionCall.args || p.functionCall.arguments || {}, rawCandidate: cand };
        }
      }
    }
  }

  // fallback: some responses expose top-level functionCalls
  if (Array.isArray(resp.functionCalls) && resp.functionCalls.length) {
    const fc = resp.functionCalls[0];
    return { name: fc.name, args: fc.args || fc.parameters || {}, rawCandidate: resp };
  }

  return null;
}

/**
 * Call Elasticsearch _search and return normalized hits.
 */
async function callElasticsearch(query: string, numHits = ELASTIC_NUM_HITS) {
  if (!ELASTICSEARCH_URL || !ELASTIC_APIKEY_RAW) {
    throw new Error("Elasticsearch not configured (ELASTIC_URL or ELASTIC_APIKEY missing).");
  }

  const endpoint = `${ELASTICSEARCH_URL}/${encodeURIComponent(ELASTIC_INDEX)}/_search`;
  const body = {
    size: numHits,
    query: {
      multi_match: {
        query,
        fields: ["title^3", "filename^2", "content", "text", "body"],
        fuzziness: "AUTO",
      },
    },
    _source: ["id", "title", "filename", "content", "path"],
  };

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: formatApiKey(ELASTIC_APIKEY_RAW),
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Elasticsearch query failed: ${resp.status} ${resp.statusText} - ${text}`);
  }

  const data = await resp.json();
  const hits = (data?.hits?.hits || []).map((h: any) => ({
    id: h._id || h._source?.id || null,
    score: h._score || 0,
    source: h._source || {},
  }));
  return hits;
}

/**
 * Estimate byte size of an object when JSON.stringified
 */
function estimateBytes(obj: any) {
  try {
    return Buffer.byteLength(JSON.stringify(obj), "utf8");
  } catch (e) {
    return Infinity;
  }
}

/**
 * Prune hits to keep serialized size under maxBytes.
 * Strategy:
 *  - Reduce snippet length first, then number of hits.
 *  - Conservative reductions until within size limit or cannot reduce more.
 */
function pruneHitsForModel(origHits: any[], maxBytes: number) {
  const hitsCopy = (origHits || []).map(h => ({ ...h, source: { ...(h.source || {}) } }));
  if (!hitsCopy.length) {
    return {
      hits: [],
      truncated: false,
      originalCount: 0,
      finalCount: 0,
      snippetLength: 0,
      serializedBytes: 0,
    };
  }

  let snippetLen = 400; // starting snippet length (matches buildFunctionResponse default)
  const minSnippet = 50;
  let maxHits = hitsCopy.length;
  const minHits = 1;

  const buildPreview = (count: number, sLen: number) =>
    hitsCopy.slice(0, count).map(h => ({
      id: h.id,
      score: h.score,
      title: h.source?.title || h.source?.filename || null,
      path: h.source?.path || null,
      snippet: (h.source?.content || h.source?.text || h.source?.body || "").toString().slice(0, sLen),
    }));

  let preview = buildPreview(maxHits, snippetLen);
  let size = estimateBytes({ hits: preview });

  // Iteratively reduce snippetLen first, then number of hits
  while (size > maxBytes) {
    if (snippetLen > minSnippet) {
      snippetLen = Math.max(minSnippet, Math.floor(snippetLen * 0.7));
    } else if (maxHits > minHits) {
      maxHits = Math.max(minHits, Math.floor(maxHits * 0.7));
    } else {
      break;
    }

    preview = buildPreview(maxHits, snippetLen);
    size = estimateBytes({ hits: preview });
  }

  // Build final pruned hits (canonicalize content -> 'content' and remove large fields)
  const finalHits = hitsCopy.slice(0, maxHits).map(h => {
    const rawContent = (h.source?.content || h.source?.text || h.source?.body || "").toString();
    const trimmedContent = rawContent.slice(0, snippetLen);
    const newSource: any = { ...h.source, content: trimmedContent };
    delete newSource.body;
    delete newSource.text;
    return { ...h, source: newSource };
  });

  return {
    hits: finalHits,
    truncated: (finalHits.length !== origHits.length) || snippetLen < 400,
    originalCount: origHits.length,
    finalCount: finalHits.length,
    snippetLength: snippetLen,
    serializedBytes: estimateBytes({ hits: finalHits }),
  };
}

/**
 * Convert hits to a compact JSON object we can pass back as the function response.
 */
function buildFunctionResponse(hits: any[]) {
  return {
    hits: hits.map((h) => ({
      id: h.id,
      score: h.score,
      title: h.source?.title || h.source?.filename || null,
      // Use whatever 'content' is present (may already be trimmed by pruneHitsForModel)
      snippet: (h.source?.content || h.source?.text || h.source?.body || "").toString().slice(0, 400),
      path: h.source?.path || null,
    })),
  };
}

// --- GET handler ---
export async function GET(_req: Request, { params }: { params: { conversationId: string } }) {
  try {
    const { conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    const { data: messages, error } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("supabase list messages error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] }, { status: 200 });
  } catch (err) {
    console.error("messages GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// --- POST handler (function-calling using Gemini function declarations, simplified) ---
export async function POST(req: Request, { params }: { params: { conversationId: string } }) {
  try {
    const { conversationId } = await params;
    const body = await req.json();
    const content = (body.content || "").toString().trim();
    const metadata = body.metadata || {};

    if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });

    const pairId = typeof randomUUID === "function" ? randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // 1) Save user message
    const { data: userInserted, error: insertErr } = await supabaseAdmin
      .from("messages")
      .insert([{ conversation_id: conversationId, pair_id: pairId, role: "user", content, metadata }])
      .select()
      .single();
    if (insertErr) {
      console.error("insert user message error", insertErr);
      return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
    }

    // 2) Fetch history (roles: user/model)
    const { data: msgs, error: fetchErr } = await supabaseAdmin
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (fetchErr) {
      console.error("fetch history error", fetchErr);
      return NextResponse.json({ error: "Failed to fetch conversation history" }, { status: 500 });
    }

    // 3) Compose contents for model (history + current)
    const contents: any[] = [];
    (msgs || []).forEach((m: any) => {
      contents.push({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      });
    });
    contents.push({ role: "user", parts: [{ text: content }] });

    // 4) Declare the 'elasticsearch' function (FunctionDeclaration; OpenAPI/JSON Schema)
    const esFunctionDeclaration = {
      name: "elasticsearch",
      description: "Search the internal Elasticsearch knowledge base. Args: { query: string, num_hits?: integer }. Returns JSON with hits array {id,title,snippet,score,path}.",
      // SDK expects parametersJsonSchema for function declarations
      parametersJsonSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          num_hits: { type: "integer", description: "Number of hits to return" },
        },
        required: ["query"],
      },
    };

    // Wrap in a Tool as required by the SDK shape (tools in config expect functionDeclarations)
    const esTool = {
      functionDeclarations: [esFunctionDeclaration],
    };

    // 5) First call: let the model decide whether to call the function
    const firstResp = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction: [SYSTEM_PROMPT],
        // toolConfig controls function-calling behavior
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.AUTO,
          },
        },
        tools: [esTool],
        maxOutputTokens: 2000,
      },
    });

    // Extract the model's text (if any) and detect function call
    const firstText = safeGetText(firstResp || "").trim();
    console.log("First model output (truncated):", firstText.slice(0, 800));

    const funcCall = extractFunctionCall(firstResp);

    // If model didn't call the function, save and return that direct answer (single AI response)
    if (!funcCall) {
      const { data: aiInserted, error: aiInsertErr } = await supabaseAdmin
        .from("messages")
        .insert([{
          conversation_id: conversationId,
          pair_id: pairId,
          role: "assistant",
          content: firstText,
          metadata: {
            retrieved_from: "none",
          },
        }])
        .select()
        .single();

      if (aiInsertErr) {
        console.error("insert assistant message error", aiInsertErr);
        // Return the assistant text even if DB insert fails
        return NextResponse.json({ user: userInserted, assistant: { role: "assistant", content: firstText } }, { status: 200 });
      }

      return NextResponse.json({ user: userInserted, assistant: aiInserted }, { status: 200 });
    }

    // Ensure it's the expected function
    if (funcCall.name !== "elasticsearch") {
      const warnText = `Model attempted to call an unexpected function: ${funcCall.name}`;
      const { data: aiInserted, error: aiInsertErr } = await supabaseAdmin
        .from("messages")
        .insert([{
          conversation_id: conversationId,
          pair_id: pairId,
          role: "assistant",
          content: warnText,
          metadata: { retrieved_from: "function_unexpected" },
        }])
        .select()
        .single();
      if (aiInsertErr) console.error("insert assistant message error", aiInsertErr);
      return NextResponse.json({ user: userInserted, assistant: aiInserted || { role: "assistant", content: warnText } }, { status: 200 });
    }

    // Parse function arguments safely (string or object)
    let funcArgs = funcCall.args || {};
    if (typeof funcArgs === "string") {
      try {
        funcArgs = JSON.parse(funcArgs);
      } catch (e) {
        funcArgs = { query: funcCall.args };
      }
    }

    const esQuery = (funcArgs.query || "").toString().trim();
    const numHits = Number(funcArgs.num_hits || ELASTIC_NUM_HITS);

    if (!esQuery) {
      const errText = "Function call 'elasticsearch' missing required parameter 'query'.";
      const { data: aiInserted, error: aiInsertErr } = await supabaseAdmin
        .from("messages")
        .insert([{
          conversation_id: conversationId,
          pair_id: pairId,
          role: "assistant",
          content: errText,
          metadata: { retrieved_from: "function_args_missing" },
        }])
        .select()
        .single();
      if (aiInsertErr) console.error("insert assistant message error", aiInsertErr);
      return NextResponse.json({ user: userInserted, assistant: aiInserted || { role: "assistant", content: errText } }, { status: 200 });
    }

    // 6) Execute Elasticsearch query
    let hits: any[] = [];
    let pruneResult: any = null;
    try {
      hits = await callElasticsearch(esQuery, numHits);

      // 6.1) Prune/trim hits so model won't be overloaded
      pruneResult = pruneHitsForModel(hits, ES_TOOL_RESPONSE_MAX_BYTES);
      hits = pruneResult.hits || [];
    } catch (e: any) {
      console.error("Elasticsearch query error:", e);
      const assistantFailText = `Search failed: ${e.message || String(e)}`;

      const { data: aiInserted, error: aiInsertErr } = await supabaseAdmin
        .from("messages")
        .insert([{
          conversation_id: conversationId,
          pair_id: pairId,
          role: "assistant",
          content: assistantFailText,
          metadata: { retrieved_from: "elasticsearch_error" },
        }])
        .select()
        .single();

      if (aiInsertErr) console.error("insert assistant failure message error", aiInsertErr);
      return NextResponse.json({ user: userInserted, assistant: aiInserted || { role: "assistant", content: assistantFailText } }, { status: 200 });
    }

    // 7) Build function response object (compact)
    const funcResponseObj = buildFunctionResponse(hits);

    // 8) Use the functionResponse pattern expected by some Gemini SDKs:
    // Create a function response part as the model expects, then append the model's function-call candidate
    // followed by a user part that contains the functionResponse. Then call generateContent again to finalize.
    const function_response_part = {
      name: funcCall.name,
      response: funcResponseObj,
    };

    const contentsForFinal: any[] = [...contents];

    // Append the model's original function-call candidate if present (so model sees its own call)
    try {
      const cand = firstResp?.candidates && firstResp.candidates.length ? firstResp.candidates[0] : null;

      if (cand?.content) {
        // push the model's candidate content as-is
        contentsForFinal.push(cand.content);
      } else {
        // Use safeGetText to extract text from various SDK shapes without relying on a specific 'output' field
        const candText = safeGetText(cand) || (typeof firstResp?.text === "string" ? firstResp.text : "");

        if (candText) {
          contentsForFinal.push({ role: "model", parts: [{ text: candText }] });
        } else {
          // fallback marker
          contentsForFinal.push({
            role: "model",
            parts: [{ text: `FunctionCall: ${funcCall.name}(${JSON.stringify(funcCall.args)})` }],
          });
        }
      }
    } catch (e) {
      contentsForFinal.push({
        role: "model",
        parts: [{ text: `FunctionCall: ${funcCall.name}(${JSON.stringify(funcCall.args)})` }],
      });
    }

    // Append the function response in the specified 'functionResponse' shape inside a user role part
    contentsForFinal.push({
      role: "user",
      parts: [{ functionResponse: function_response_part }],
    });

    // 9) Finalize: ask model to produce the user-facing text, grounded in the function response.
    const finalResp = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: contentsForFinal,
      config: {
        systemInstruction: [SYSTEM_PROMPT + " Use the search results passed in the tool response to produce the final user-facing answer."],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.NONE, // prevent further function calls in this pass
          },
        },
        tools: [esTool],
        maxOutputTokens: 4000,
      },
    });

    const finalText = (safeGetText(finalResp) || "").trim();

    // 10) Save assistant final message (metadata contains the ES grounding info)
    const { data: aiInserted, error: aiInsertErr } = await supabaseAdmin
      .from("messages")
      .insert([{
        conversation_id: conversationId,
        pair_id: pairId,
        role: "assistant",
        content: finalText,
        metadata: {
          retrieved_from: "elasticsearch_function_call",
          tool_query: esQuery,
          tool_original_hits_count: pruneResult?.originalCount ?? (hits?.length || 0),
          tool_final_hits_count: pruneResult?.finalCount ?? (hits?.length || 0),
          tool_snippet_length: pruneResult?.snippetLength ?? 0,
          tool_serialized_bytes: pruneResult?.serializedBytes ?? estimateBytes({ hits }),
          tool_truncated: !!pruneResult?.truncated,
          tool_hits: (hits || []).slice(0, 10),
        },
      }])
      .select()
      .single();

    if (aiInsertErr) {
      console.error("insert assistant message error", aiInsertErr);
      return NextResponse.json({ assistant: { role: "assistant", content: finalText }, user: userInserted });
    }

    // Return the user + assistant records (assistant content is plain finalText)
    return NextResponse.json({ user: userInserted, assistant: aiInserted }, { status: 200 });
  } catch (err) {
    console.error("chat processing error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
