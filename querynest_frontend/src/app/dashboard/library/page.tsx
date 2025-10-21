"use client";

import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  UploadCloud,
  Search,
  Trash2,
  FileText,
  Clock,
  File,
  X,
  Download,
} from "lucide-react";

type LibFile = {
  id: string;
  name: string;
  type: string;
  size: number; // bytes
  created_at: string; // ISO from DB
  enabled: boolean;
};

const STORAGE_LIMIT = 10 * 10000 * 10000;

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1000;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const v = parseFloat((bytes / Math.pow(k, i)).toFixed(i ? 1 : 0));
  return `${v} ${sizes[i]}`;
};

const getExt = (filename?: string) => {
  if (!filename) return "";
  const parts = filename.split(".");
  if (parts.length <= 1) return "";
  return parts.pop()!.toLowerCase();
};

const formatFileType = (mime?: string | null, filename?: string | null) => {
  const ext = getExt(filename || undefined);
  const extMap: Record<string, string> = {
    pdf: "PDF",
    docx: "Word (.docx)",
    doc: "Word (.doc)",
    xlsx: "Excel (.xlsx)",
    xls: "Excel (.xls)",
    csv: "CSV",
    pptx: "PowerPoint (.pptx)",
    ppt: "PowerPoint (.ppt)",
    txt: "Text (.txt)",
    md: "Markdown (.md)",
    jpeg: "JPEG Image",
    jpg: "JPEG Image",
    png: "PNG Image",
    webp: "WEBP Image",
    tiff: "TIFF Image",
    odt: "OpenDocument Text",
    ods: "OpenDocument Spreadsheet",
    odp: "OpenDocument Presentation",
  };

  if (ext && extMap[ext]) return extMap[ext];

  if (mime) {
    const m = mime.toLowerCase();
    if (m.includes("pdf")) return "PDF";
    if (m.includes("word") || m.includes("msword")) return "Word";
    if (m.includes("excel") || m.includes("spreadsheet")) return "Excel";
    if (m.includes("presentation") || m.includes("powerpoint")) return "PowerPoint";
    if (m.startsWith("image/")) {
      const subtype = m.split("/")[1] || "Image";
      return `${subtype.toUpperCase()} Image`;
    }
    if (m.startsWith("text/")) {
      if (m.includes("markdown")) return "Markdown";
      if (m.includes("csv")) return "CSV";
      return "Text";
    }
  }

  if (ext) return ext.toUpperCase();
  return "Unknown";
};

/* -----------------------------
   Validation & constants
   ----------------------------- */
const MAX_FILE_SIZE = 100000000//1 * 1024 * 1024; // 100MB

const ALLOWED_EXTS = new Set([
  "docx", "xlsx", "pptx", "pdf", "odt", "ods", "odp",
  "md", "markdown", "csv", "txt",
  "jpeg", "jpg", "png", "tiff", "webp",
]);

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
  "application/vnd.oasis.opendocument.text", // odt
  "application/vnd.oasis.opendocument.spreadsheet", // ods
  "application/vnd.oasis.opendocument.presentation", // odp
  "text/markdown",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/tiff",
  "image/webp",
]);

export default function LibraryPage() {
  const [files, setFiles] = useState<LibFile[]>([]);
  const [query, setQuery] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setHydrated(true);
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch("/api/files");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch files");
      const mapped = json.files.map((f: any) => ({
        id: f.id,
        name: f.name,
        type: formatFileType(f.mime_type, f.name),
        size: f.size_bytes,
        created_at: f.created_at,
        enabled: f.enabled,
      }));
      setFiles(mapped);
    } catch (err) {
      console.error("fetchFiles error", err);
    }
  };

  // XMLHttpRequest upload with progress to allow progress events
  const uploadWithProgress = (file: File) =>
    new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = "/api/upload";
      const fd = new FormData();
      fd.append("file", file);

      xhr.open("POST", url, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress((p) => ({ ...p, [file.name]: percent }));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const resp = JSON.parse(xhr.responseText);
            resolve(resp);
          } catch (err) {
            reject(err);
          } finally {
            setUploadProgress((p) => {
              const copy = { ...p };
              delete copy[file.name];
              return copy;
            });
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
          setUploadProgress((p) => {
            const copy = { ...p };
            delete copy[file.name];
            return copy;
          });
        }
      };

      xhr.onerror = () => {
        reject(new Error("Upload network error"));
        setUploadProgress((p) => {
          const copy = { ...p };
          delete copy[file.name];
          return copy;
        });
      };

      xhr.send(fd);
    });

  const isAcceptedFile = (file: File) => {
    const ext = getExt(file.name);
    if (ext && ALLOWED_EXTS.has(ext)) return true;
    if (file.type && ALLOWED_MIMES.has(file.type.toLowerCase())) return true;
    // fallback: allow image/* for common image mimes not in the set
    if (file.type && file.type.startsWith("image/")) {
      const subtype = file.type.split("/")[1];
      return ["png", "jpeg", "jpg", "tiff", "webp"].includes(subtype);
    }
    return false;
  };

  const handleFileInput = async (list: FileList | null) => {
    if (!list) return;
    for (const file of Array.from(list)) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File "${file.name}" exceeds the 100MB limit.`);
        continue;
      }
      if (!isAcceptedFile(file)) {
        alert(`File "${file.name}" is not an accepted format.`);
        continue;
      }
      try {
        const resp = await uploadWithProgress(file);
        if (!resp?.file) throw new Error(resp?.error || "Upload failed");
        const f = resp.file;
        setFiles((prev) => [
          {
            id: f.id,
            name: f.name,
            type: formatFileType(f.mime_type, f.name),
            size: f.size_bytes,
            created_at: f.created_at,
            enabled: f.enabled,
          },
          ...prev,
        ]);
      } catch (err) {
        console.error("Upload error", err);
        alert(`Upload failed for ${file.name}`);
      }
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this file? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error("Delete error", err);
      alert("Delete failed");
    }
  };

  const handleDownload = async (file: LibFile) => {
    try {
      const res = await fetch(`/api/files/${file.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Download URL failed");
      const url = json.url;
      if (!url) throw new Error("No URL");
      window.open(url, "_blank");
    } catch (err) {
      console.error("Download error", err);
      alert("Download failed");
    }
  };

  const toggleEnabled = (id: string) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)));

  const usedBytes = files.reduce((s, f) => s + f.size, 0);
  const percentUsed = Math.min(100, Math.round((usedBytes / STORAGE_LIMIT) * 100));

  const visibleFiles = files.filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()));

  // Accept attribute (extensions + some mime hints)
  const acceptAttr = [
    ".docx,.xlsx,.pptx,.pdf,.odt,.ods,.odp",
    ".md,.markdown,.csv,.txt",
    "image/png,image/jpeg,image/tiff,image/webp",
  ].join(",");

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">Library</h1>
          <p className="mt-2 text-sm text-gray-600 max-w-2xl">
            Manage your uploaded documents, view storage usage, and control file access.
          </p>
        </div>

        {/* Storage + Upload */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Storage */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">Storage Used</h3>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <p className="text-2xl font-extrabold text-gray-900">{formatBytes(usedBytes)}</p>
                  <p className="text-sm text-gray-500 mt-1">{formatBytes(STORAGE_LIMIT)} total</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">{percentUsed}%</p>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                <div className="h-3 rounded-full bg-indigo-600 transition-all" style={{ width: `${percentUsed}%` }} />
              </div>
              <div className="mt-3 text-xs text-gray-400">Upgrade for more storage</div>
            </div>
          </div>

          {/* Upload */}
          <div
            className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col justify-center items-center gap-4 text-center"
            onDrop={(e) => { e.preventDefault(); handleFileInput(e.dataTransfer.files); }}
            onDragOver={(e) => e.preventDefault()}
            role="button"
            tabIndex={0}
            aria-label="Upload files"
          >
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                <UploadCloud className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Upload files</h3>
              <p className="mt-2 text-sm text-gray-600">Drag & drop files here — or click below to browse your device.</p>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={acceptAttr}
                className="hidden"
                onChange={async (e) => {
                  await handleFileInput(e.target.files);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
              <Button variant="default" size="lg" onClick={handleUploadClick} className="bg-indigo-600 hover:bg-indigo-700">
                <UploadCloud className="w-5 h-5 mr-2" />
                Upload Files
              </Button>
            </div>

            <div className="text-xs text-gray-400 mt-2">Accepted: docx, xlsx, pptx, pdf, odt, ods, odp, md, markdown, csv, txt, jpeg, png, tiff, webp. Max 100MB per file.</div>

            {/* Active uploads */}
            {Object.keys(uploadProgress).length > 0 && (
              <div className="w-full max-w-3xl mt-4 space-y-2">
                {Object.entries(uploadProgress).map(([name, pct]) => (
                  <div key={name} className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <div className="flex justify-between text-xs text-gray-700 mb-1">
                      <span className="truncate max-w-[70%]">{name}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-2 bg-indigo-600" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search + Files */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="relative w-full sm:w-96">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search files by name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-full border border-gray-200 bg-white px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {query && (
                <button aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            <div className="text-sm text-gray-500">{visibleFiles.length} files</div>
          </div>

          {/* File Table */}
          {/* Note: removed max-height so this container grows with file list */}
          <ScrollArea className="">
            <div className="hidden md:block">
              <table className="w-full table-fixed min-w-[720px]">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                    <th className="py-3 px-4">File name</th>
                    <th className="py-3 px-4 w-28">Type</th>
                    <th className="py-3 px-4 w-28">Size</th>
                    <th className="py-3 px-4 w-40">Date added</th>
                    <th className="py-3 px-4 w-28">Enabled</th>
                    <th className="py-3 px-4 w-28"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFiles.map((f) => (
                    <tr key={f.id} className="border-b last:border-b-0">
                      <td className="py-4 px-4 align-top">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600"><FileText className="w-4 h-4" /></div>
                          <div><div className="text-sm font-medium text-gray-900">{f.name}</div></div>
                        </div>
                      </td>
                      <td className="py-4 px-4">{f.type}</td>
                      <td className="py-4 px-4">{formatBytes(f.size)}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span suppressHydrationWarning>{hydrated ? new Date(f.created_at).toLocaleString() : ""}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <button onClick={() => toggleEnabled(f.id)} aria-label={f.enabled ? "Disable file" : "Enable file"} className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none ${f.enabled ? "bg-indigo-600" : "bg-gray-200"}`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${f.enabled ? "translate-x-5" : "translate-x-1"}`} />
                        </button>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleDownload(f)} aria-label="Download file" className="inline-flex items-center rounded-md p-1 text-gray-600 hover:bg-gray-100"><Download className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(f.id)} aria-label="Delete file" className="inline-flex items-center rounded-md p-1 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleFiles.length === 0 && (
                    <tr><td colSpan={6} className="py-8 px-4 text-center text-gray-500">No files found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4 mt-2">
              {visibleFiles.length === 0 && <div className="py-6 px-4 text-center text-gray-500">No files found.</div>}
              {visibleFiles.map((f) => (
                <div key={f.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600"><File className="w-5 h-5" /></div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{f.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{f.type} • {formatBytes(f.size)}</div>
                      <div className="text-xs text-gray-400 mt-1" suppressHydrationWarning>{hydrated ? new Date(f.created_at).toLocaleString() : ""}</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDownload(f)} aria-label="Download file" className="inline-flex cursor-pointer items-center rounded-md p-1 text-gray-600 hover:bg-gray-100"><Download className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(f.id)} aria-label="Delete file" className="inline-flex cursor-pointer items-center rounded-md p-1 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <button onClick={() => toggleEnabled(f.id)} aria-label={f.enabled ? "Disable file" : "Enable file"} className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none ${f.enabled ? "bg-indigo-600" : "bg-gray-200"}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${f.enabled ? "translate-x-5" : "translate-x-1"}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </main>
  );
}
