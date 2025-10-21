// app/api/files/[id]/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Client as ESClient } from "@elastic/elasticsearch";

export const config = { runtime: "nodejs" };

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Initialize Elasticsearch client
const esClient = new ESClient({
  node: process.env.ELASTIC_URL,
  auth: {
    username: process.env.ELASTIC_USERNAME!,
    password: process.env.ELASTIC_PASSWORD!,
  },
});

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    // 1️⃣ Fetch file row from Supabase
    const { data: fileRow, error: fetchErr } = await supabaseAdmin
      .from("files")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchErr || !fileRow) {
      return NextResponse.json({ error: fetchErr?.message || "File not found" }, { status: 404 });
    }

    const bucket = fileRow.bucket;
    const path = fileRow.path;

    // 2️⃣ Delete file from Supabase storage
    const { error: removeErr } = await supabaseAdmin.storage.from(bucket).remove([path]);
    if (removeErr) {
      console.error("Storage remove error", removeErr);
      return NextResponse.json({ error: removeErr.message }, { status: 500 });
    }

    // 3️⃣ Delete file from Supabase DB
    const { error: delErr } = await supabaseAdmin.from("files").delete().eq("id", id);
    if (delErr) {
      console.error("DB delete error", delErr);
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
    // 4️⃣ Delete document from Elasticsearch
    try {
      const res = await esClient.delete({
        index: "documents",
        id, // same as Supabase ID
      });

      console.log("Elasticsearch delete response", res);
    } catch (esErr: any) {
      // If the document does not exist in ES, just log a warning
      if (esErr.meta?.statusCode === 404) {
        console.warn(`Elasticsearch document ${id} not found. Skipping deletion.`);
      } else {
        console.error("Elasticsearch delete error", esErr);
        return NextResponse.json({ error: "Failed to delete document from Elasticsearch" }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
