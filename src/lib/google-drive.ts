import { google } from "googleapis";
import { Readable } from "stream";

/**
 * Reads the service account credentials from GOOGLE_SERVICE_ACCOUNT_KEY.
 * Accepts either the raw JSON content of the key file, or that same JSON
 * base64-encoded (handy for a single .env line without escaping quotes).
 */
function getServiceAccountCredentials(): { client_email: string; private_key: string } {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is not set. Add your Google service account JSON (or its base64 encoding) to .env."
    );
  }

  let jsonString = raw;
  if (!raw.trim().startsWith("{")) {
    jsonString = Buffer.from(raw, "base64").toString("utf-8");
  }

  const parsed = JSON.parse(jsonString);
  return { client_email: parsed.client_email, private_key: parsed.private_key };
}

function getDriveClient() {
  const { client_email, private_key } = getServiceAccountCredentials();
  const auth = new google.auth.JWT({
    email: client_email,
    key: private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

function getFolderId(): string {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID is not set. Add it to .env (see README).");
  }
  return folderId;
}

export type DriveUploadResult = {
  fileId: string;
  fileUrl: string; // app-internal URL that proxies the file through our own auth
};

/**
 * Uploads a file buffer to the shared Google Drive folder. The file is
 * intentionally left with default (private) sharing — access is instead
 * gated by our own app's login via the /api/files/[fileId] proxy route.
 */
export async function uploadFileToDrive(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<DriveUploadResult> {
  const drive = getDriveClient();

  const response = await drive.files.create({
    requestBody: {
      name: params.filename,
      parents: [getFolderId()],
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.buffer),
    },
    fields: "id",
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new Error("Google Drive did not return a file ID after upload.");
  }

  return { fileId, fileUrl: `/api/files/${fileId}` };
}

/** Permanently deletes a file from Google Drive. Safe to call even if already gone. */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = getDriveClient();
  try {
    await drive.files.delete({ fileId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("File not found")) {
      throw err;
    }
  }
}

export type DriveFileStream = {
  stream: NodeJS.ReadableStream;
  mimeType: string;
  fileName: string;
};

/** Fetches a file's content as a stream, for the proxy download route to pipe to the client. */
export async function getDriveFileStream(fileId: string): Promise<DriveFileStream> {
  const drive = getDriveClient();

  const metadata = await drive.files.get({ fileId, fields: "name, mimeType" });

  const response = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });

  return {
    stream: response.data as unknown as NodeJS.ReadableStream,
    mimeType: metadata.data.mimeType || "application/octet-stream",
    fileName: metadata.data.name || "document",
  };
}
