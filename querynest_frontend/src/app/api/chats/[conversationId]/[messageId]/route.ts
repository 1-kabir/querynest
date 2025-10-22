import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string; messageId: string }> }
) {
  try {
    const { conversationId, messageId } = await params;

    if (!conversationId || !messageId) {
      return NextResponse.json({ error: "Invalid path parameters" }, { status: 400 });
    }

    // 1) Fetch the message within this conversation
    const { data: msg, error: fetchErr, status: fetchStatus } = await supabaseAdmin
      .from("messages")
      .select("id, pair_id, conversation_id")
      .eq("id", messageId)
      .eq("conversation_id", conversationId)
      .maybeSingle(); // avoid hard 406/404 throws

    if (fetchErr) {
      console.error("Fetch message error", { fetchErr, conversationId, messageId, fetchStatus });
    }

    if (!msg) {
      // Log helpful diagnostics
      console.warn("Message not found in conversation", { conversationId, messageId, fetchStatus });
      return NextResponse.json(
        { error: "Message not found in this conversation" },
        { status: 404 }
      );
    }

    // 2) If pair_id present, delete the entire pair in the same conversation
    if (msg.pair_id) {
      const { error: delPairErr } = await supabaseAdmin
        .from("messages")
        .delete()
        .eq("conversation_id", conversationId)
        .eq("pair_id", msg.pair_id);

      if (delPairErr) {
        console.error("Supabase delete pair error", delPairErr);
        return NextResponse.json({ error: "Failed to delete messages" }, { status: 500 });
      }

      return NextResponse.json({ success: true, deletedPairId: msg.pair_id }, { status: 200 });
    }

    // 3) Otherwise delete just this message (still scoped)
    const { error: delOneErr } = await supabaseAdmin
      .from("messages")
      .delete()
      .eq("id", msg.id)
      .eq("conversation_id", conversationId);

    if (delOneErr) {
      console.error("Supabase delete message error", delOneErr);
      return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedId: msg.id }, { status: 200 });
  } catch (err) {
    console.error("delete message error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
