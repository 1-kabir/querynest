require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
const { Client } = require("@elastic/elasticsearch");
const officeParser = require("officeparser");
const Tesseract = require("tesseract.js");

// --- INITIALIZATION ---

const app = express();
const PORT = process.env.PORT;

// Initialize Supabase Admin Client
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Elasticsearch Client
const esClient = new Client({
  node: process.env.ELASTIC_URL,
  auth: {
    username: process.env.ELASTIC_USERNAME,
    password: process.env.ELASTIC_PASSWORD,
  },
  // If using self-signed certificates on a development ES instance
  // tls: {
  //   rejectUnauthorized: false
  // }
});

// --- MIDDLEWARE ---

// Enable JSON body parsing
app.use(express.json());

// Configure CORS
const allowedOrigins = process.env.ALLOWED_DOMAINS
  ? process.env.ALLOWED_DOMAINS.split(",")
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like server-to-server, curl)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};
app.use(cors(corsOptions));


// --- HELPER FUNCTION ---

/**
 * Ensures the 'documents' index exists in Elasticsearch. Creates it if it doesn't.
 */
async function ensureEsIndexExists() {
  const indexName = "documents";
  const indexExists = await esClient.indices.exists({ index: indexName });
  if (!indexExists) {
    console.log(`Index '${indexName}' not found. Creating...`);
    await esClient.indices.create({
      index: indexName,
      body: {
        mappings: {
          properties: {
            fileId: { type: 'keyword' },
            userId: { type: 'keyword' },
            content: { type: 'text' }, // This is the field that will be searched
            originalName: { type: 'text' },
            createdAt: { type: 'date' },
          },
        },
      },
    });
    console.log(`Index '${indexName}' created successfully.`);
  }
}


// --- API ROUTE ---

app.post("/api/process-file", async (req, res) => {
  console.log("Received request to process file.");
  const { fileId } = req.body;

  if (!fileId) {
    return res.status(400).json({ error: "fileId is required" });
  }

  try {
    // 1. Fetch File Metadata from Supabase DB
    const { data: fileMeta, error: metaError } = await supabaseAdmin
      .from("files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (metaError || !fileMeta) {
      console.error("Error fetching file metadata:", metaError);
      return res.status(404).json({ error: "File not found in database." });
    }

    // 2. Download File from Supabase Storage
    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from(fileMeta.bucket)
      .download(fileMeta.path);

    if (downloadError || !fileBlob) {
      console.error("Error downloading file from storage:", downloadError);
      return res.status(500).json({ error: "Failed to download file." });
    }

    const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
    console.log(`Processing file: ${fileMeta.name} (${fileMeta.mime_type})`);

    // 3. Extract Text Content Based on File Type
    let extractedText = "";
    const mimeType = fileMeta.mime_type;

    const ext = fileMeta.name.split('.').pop()?.toLowerCase();

    if (
      [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",      // .xlsx
        "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
        "application/pdf", // .pdf
        "application/vnd.oasis.opendocument.text", // .odt
        "application/vnd.oasis.opendocument.spreadsheet", // .ods
        "application/vnd.oasis.opendocument.presentation", // .odp
      ].includes(mimeType)
    ) {
      extractedText = await officeParser.parseOfficeAsync(fileBuffer);
    } else if (["text/plain", "text/csv", "text/markdown"].includes(mimeType) || ["md", "markdown"].includes(ext)) {
      // For plain text formats, direct buffer conversion is most efficient.
      extractedText = fileBuffer.toString("utf-8");
    } else if (["image/jpeg", "image/png", "image/tiff", "image/webp"].includes(mimeType)) {
      console.log("Performing OCR on image...");
      const { data: { text } } = await Tesseract.recognize(fileBuffer, "eng");
      extractedText = text;
      console.log("OCR complete.");
    } else {
      console.warn(`Unsupported file type: ${mimeType}. Skipping text extraction.`);
      // Exit gracefully without indexing
      return res.status(200).json({ message: "File type not supported for indexing, but acknowledged." });
    }
    
    if (!extractedText || extractedText.trim() === "") {
        console.log("No text content extracted or file is empty.");
        return res.status(200).json({ message: "No content to index." });
    }

    // 4. Index Content in Elasticsearch
    console.log("Indexing content into Elasticsearch...");
    await esClient.index({
      index: "documents",
      id: fileId, // Use the database ID as the document ID for easy mapping
      body: {
        fileId: fileMeta.id,
        userId: fileMeta.user_id,
        content: extractedText,
        originalName: fileMeta.name,
        createdAt: new Date().toISOString(),
      },
    });

    console.log(`File ID ${fileId} processed and indexed successfully.`);
    return res.status(200).json({ message: "File processed and indexed successfully." });

  } catch (err) {
    console.error(`[ERROR] Processing file ID ${fileId}:`, err);
    return res.status(500).json({ error: "An internal server error occurred." });
  }
});


// --- START SERVER ---

app.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  // Make sure the Elasticsearch index exists before we start accepting requests
  await ensureEsIndexExists();
});