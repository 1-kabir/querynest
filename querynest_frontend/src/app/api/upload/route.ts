// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "nodejs" };

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const userId = (form.get("userId") as string) || null;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const filename = `${Date.now()}-${String(file.name).replace(/\s+/g, "-")}`;
    const folder = userId ? `${userId}` : "anonymous";
    const path = `${folder}/${filename}`;

    // Buffer conversion (Node runtime)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("user-uploads")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
        metadata: { originalName: file.name },
      });

    if (uploadError) {
      console.error("Upload error", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL (if bucket public)
    const { data: publicData } = supabaseAdmin.storage.from("user-uploads").getPublicUrl(path);

    // Insert metadata row
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from("files")
      .insert([
        {
          user_id: userId,
          name: file.name,
          mime_type: file.type,
          size_bytes: buffer.length,
          bucket: "user-uploads",
          path,
          public_url: publicData?.publicUrl ?? null,
          metadata: { uploaded_via: "nextjs" },
        },
      ])
      .select()
      .single();

    if (insertError) {
      // cleanup storage if DB insert fails
      await supabaseAdmin.storage.from("user-uploads").remove([path]);
      console.error("DB insert error", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // --- Call /api/process-file to index into Elasticsearch ---
    try {
      // assuming the API route is at /api/process-file and accepts JSON { fileId }
      const processRes = await fetch(`${process.env.BACKEND_API_URL}/api/process-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: insertData.id }),
      });

        // safer
        let processJson: any;
        const ct = processRes.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
        processJson = await processRes.json();
        } else {
        const text = await processRes.text();
        console.error("process-file returned non-JSON response", processRes.status, text.slice(0, 1000));
        throw new Error(`process-file failed with status ${processRes.status}. Response: ${text.slice(0, 1000)}`);
        }

        if (!processRes.ok) {
        console.error("Elasticsearch indexing failed", processJson);
        // existing error handling...
        }
    } catch (err) {
      console.error("Error calling /api/process-file", err);
    }

    return NextResponse.json({ file: insertData }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
