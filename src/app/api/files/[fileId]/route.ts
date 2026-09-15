import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";
import { getDriveFileStream } from "@/lib/google-drive";

export const runtime = "nodejs";

/**
 * GET /api/files/[fileId]
 *
 * Proxies a document stored in Google Drive to the browser. The Drive file
 * itself is never made public — access is gated here:
 *  - Internal Admin/Viewer: full access to any document.
 *  - Client Portal user: only documents belonging to their own client's
 *    certificates or renewal history — checked against the DB before
 *    fetching anything from Drive, so one client can never enumerate and
 *    open another client's documents.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ fileId: string }> }) {
  const params = await context.params;
  const internalSession = await getSession();
  const clientSession = internalSession ? null : await getClientSession();

  if (!internalSession && !clientSession) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (clientSession) {
    const [ownsViaCertificate, ownsViaApplication] = await Promise.all([
      prisma.certificate.findFirst({
        where: {
          clientId: clientSession.clientId,
          OR: [{ driveFileId: params.fileId }, { renewals: { some: { driveFileId: params.fileId } } }],
        },
        select: { id: true },
      }),
      prisma.applicationDocument.findFirst({
        where: { driveFileId: params.fileId, application: { clientId: clientSession.clientId } },
        select: { id: true },
      }),
    ]);
    if (!ownsViaCertificate && !ownsViaApplication) {
      return NextResponse.json({ message: "Dokumen tidak ditemukan." }, { status: 404 });
    }
  }

  try {
    const { stream, mimeType, fileName } = await getDriveFileStream(params.fileId);
    const isDownload = request.nextUrl.searchParams.get("download") === "1";

    const webStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk: Buffer) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${fileName}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("Failed to fetch file from Google Drive:", err);
    return NextResponse.json(
      { message: "Dokumen tidak ditemukan atau gagal dimuat dari Google Drive." },
      { status: 404 }
    );
  }
}
