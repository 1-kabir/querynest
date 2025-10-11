// app/api/conversations/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// GET -> list conversations (no auth required)
export async function GET() {
  try {
    const { data: convos, error } = await supabaseAdmin
      .from("conversations")
      .select("id, title, metadata, created_at, updated_at")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("supabase list convos error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ conversations: convos }, { status: 200 });
  } catch (err) {
    console.error("conversations GET error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST -> create conversation
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const title = (body.title || "").toString() || "New chat";

    const { data, error } = await supabaseAdmin
      .from("conversations")
      .insert([
        {
          title: title,
          metadata: {},
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("supabase insert convo error", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conversation: data }, { status: 201 });
  } catch (err) {
    console.error("conversations POST error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}