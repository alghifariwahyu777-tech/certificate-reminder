/**
 * Validates a file's real content type by inspecting its magic bytes,
 * instead of trusting the browser-supplied MIME type (which is trivial to
 * spoof by renaming a file's extension or editing the multipart request).
 */

const SIGNATURES: { mime: string; check: (buf: Buffer) => boolean }[] = [
  {
    mime: "application/pdf",
    // "%PDF-"
    check: (buf) => buf.length >= 5 && buf.subarray(0, 5).toString("ascii") === "%PDF-",
  },
  {
    mime: "image/png",
    // 89 50 4E 47 0D 0A 1A 0A
    check: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a,
  },
  {
    mime: "image/jpeg",
    // FF D8 FF
    check: (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
];

/**
 * Returns the detected MIME type based on file content, or null if the
 * content doesn't match any of the types this app accepts.
 */
export function detectFileType(buffer: Buffer): string | null {
  const match = SIGNATURES.find((sig) => sig.check(buffer));
  return match?.mime ?? null;
}
