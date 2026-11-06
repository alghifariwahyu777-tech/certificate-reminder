import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";
import { getFileStream } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * GET /api/files/[...fileId]
 *
 * Proxies a document stored in Supabase Storage to the browser. This is a
 * catch-all route (not a single [fileId] segment) because storage paths
 * are nested — e.g. "certificates/1699999999-ab12cd34-name.pdf" — and a
 * single dynamic segment can't reliably carry a literal "/" through the
 * URL, encoded or not. Next.js hands nested segments back as an array,
 * which we simply rejoin into the real Storage path here.
 *
 * The bucket itself is never made public — access is gated here:
 *  - Internal Admin/Viewer: full access to any document.
 *  - Client Portal user: only documents belonging to their own client's
 *    certificates or renewal history — checked against the DB before
 *    fetching anything from Storage, so one client can never enumerate and
 *    open another client's documents.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ fileId: string[] }> }) {
  const params = await context.params;
  const fileId = params.fileId.join("/");

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
          OR: [{ driveFileId: fileId }, { renewals: { some: { driveFileId: fileId } } }],
        },
        select: { id: true },
      }),
      prisma.applicationDocument.findFirst({
        where: { driveFileId: fileId, application: { clientId: clientSession.clientId } },
        select: { id: true },
      }),
    ]);
    if (!ownsViaCertificate && !ownsViaApplication) {
      return NextResponse.json({ message: "Dokumen tidak ditemukan." }, { status: 404 });
    }
  }

  try {
    const { stream, mimeType, fileName } = await getFileStream(fileId);
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
    console.error("Failed to fetch file from Supabase Storage:", err);
    return NextResponse.json(
      { message: "Dokumen tidak ditemukan atau gagal dimuat." },
      { status: 404 }
    );
  }
}
