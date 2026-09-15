import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const BUCKET_NAME = "documents";

/**
 * Server-only Supabase client using the service_role key — this bypasses
 * Row Level Security entirely, which is fine here because access control
 * for documents is enforced in our own API routes (session + ownership
 * checks in /api/files/[fileId]), not by Supabase Storage policies. The
 * bucket itself is private; nothing is ever made public.
 */
function getStorageClient() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set. Add them to .env (see README)."
    );
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

export type StorageUploadResult = {
  path: string; // the object's key inside the bucket — stored in driveFileId column
  fileUrl: string; // app-internal proxy URL, e.g. /api/files/{encoded path}
};

export type StorageFolder = "certificates" | "renewals" | "applications" | "misc";

/**
 * Uploads a file buffer to the private "documents" bucket, under a folder
 * that reflects what it's for (e.g. "certificates/…", "applications/…").
 * This is purely for browsability in the Supabase dashboard — the actual
 * link between a file and its record always comes from the database
 * (`driveFileId` column), never from the path itself, since the file is
 * uploaded before the record that will reference it exists.
 */
export async function uploadFile(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  folder?: StorageFolder;
}): Promise<StorageUploadResult> {
  const supabase = getStorageClient();
  const folder = params.folder || "misc";
  const path = `${folder}/${Date.now()}-${crypto.randomBytes(4).toString("hex")}-${params.filename}`;

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, params.buffer, {
    contentType: params.mimeType,
    upsert: false,
  });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  return { path, fileUrl: `/api/files/${path}` };
}

/** Permanently deletes a file from Storage. Safe to call even if already gone. */
export async function deleteFile(path: string): Promise<void> {
  const supabase = getStorageClient();
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);
  if (error) {
    throw new Error(`Supabase Storage delete failed: ${error.message}`);
  }
}

export type StorageFileStream = {
  stream: NodeJS.ReadableStream;
  mimeType: string;
  fileName: string;
};

/** Fetches a file's content as a stream, for the proxy download route to pipe to the client. */
export async function getFileStream(path: string): Promise<StorageFileStream> {
  const supabase = getStorageClient();

  const { data, error } = await supabase.storage.from(BUCKET_NAME).download(path);
  if (error || !data) {
    throw new Error(`Supabase Storage download failed: ${error?.message || "no data"}`);
  }

  // The SDK returns a Blob in the Node runtime; convert it to a Node stream
  // so the proxy route can pipe it the same way it did for Google Drive.
  const arrayBuffer = await data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const { Readable } = await import("stream");
  const stream = Readable.from(buffer);

  // Supabase's download() doesn't return the original filename, so we
  // derive a reasonable one from the storage path (strip the folder prefix
  // and our timestamp prefix) and fall back to the blob's reported MIME type.
  const fileName = path.replace(/^[^/]+\//, "").replace(/^\d+-[0-9a-f]{8}-/, "") || "document";

  return {
    stream,
    mimeType: data.type || "application/octet-stream",
    fileName,
  };
}
