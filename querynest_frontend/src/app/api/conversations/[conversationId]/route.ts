// app/api/conversations/[conversationId]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// DELETE -> delete a conversation and its messages
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ conversationId: string }> }
) {
  try {
    const paramsObj = await ctx.params;
    const conversationId = paramsObj?.conversationId;

    if (!conversationId) {
      return NextResponse.json(
        { error: "Missing conversationId" },
        { status: 400 }
      );
    }

    // First, delete all messages associated with the conversation
    const { error: messagesError } = await supabaseAdmin
      .from("messages")
      .delete()
      .eq("conversation_id", conversationId);

    if (messagesError) {
      console.error("Supabase delete messages error", messagesError);
      return NextResponse.json(
        { error: messagesError.message },
        { status: 500 }
      );
    }

    // Then, delete the conversation itself
    const { error: conversationError } = await supabaseAdmin
      .from("conversations")
      .delete()
      .eq("id", conversationId);

    if (conversationError) {
      console.error("Supabase delete conversation error", conversationError);
      return NextResponse.json(
        { error: conversationError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Conversation deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("DELETE conversation error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
