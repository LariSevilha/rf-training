const GOOGLE_DRIVE_SOURCE_HOSTS = new Set([
  "drive.google.com",
  "docs.google.com",
]);

const GOOGLE_DRIVE_DELIVERY_HOSTS = new Set([
  ...GOOGLE_DRIVE_SOURCE_HOSTS,
  "drive.usercontent.google.com",
]);

export const PDF_TICKET_TTL = "30m";
export const PDF_MAX_BYTES = 100 * 1024 * 1024;
export const PDF_UPSTREAM_TIMEOUT_MS = 30_000;
export const PDF_MAX_REDIRECTS = 5;

export type PdfResourceKind = "document" | "extra";

export type PdfTicketPayload = {
  sub: string;
  role: "admin" | "student";
  scope: "pdf";
  resourceKind: PdfResourceKind;
  resourceKey: string;
};

export function extractGoogleDriveFileId(value: string): string {
  const input = String(value || "").trim();
  if (!input) return "";

  const patterns = [
    /drive\.google\.com\/file\/d\/([^/?#]+)/i,
    /drive\.google\.com\/(?:open|uc)\?[^#]*\bid=([^&#]+)/i,
    /docs\.google\.com\/uc\?[^#]*\bid=([^&#]+)/i,
    /[?&]id=([^&#]+)/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (!match?.[1]) continue;

    try {
      return decodeURIComponent(match[1]).trim();
    } catch {
      return match[1].trim();
    }
  }

  return "";
}

export function buildGoogleDriveDownloadUrl(value: string): string {
  const input = String(value || "").trim();
  if (!input) return "";

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return "";
  }

  if (parsed.protocol !== "https:") return "";
  if (!GOOGLE_DRIVE_SOURCE_HOSTS.has(parsed.hostname.toLowerCase())) return "";

  const fileId = extractGoogleDriveFileId(input);
  if (!fileId || !/^[A-Za-z0-9_-]+$/.test(fileId)) return "";

  const url = new URL("https://drive.google.com/uc");
  url.searchParams.set("export", "download");
  url.searchParams.set("id", fileId);
  return url.toString();
}

export function isAllowedGoogleDriveDeliveryUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:") return false;

  const hostname = parsed.hostname.toLowerCase();
  return (
    GOOGLE_DRIVE_DELIVERY_HOSTS.has(hostname) ||
    hostname.endsWith(".googleusercontent.com")
  );
}

export function normalizeRangeHeader(value: unknown): string | undefined {
  const range = String(value || "").trim();
  if (!range) return undefined;
  return /^bytes=\d*-\d*$/.test(range) ? range : undefined;
}

export function isPdfLikeContentType(value: string | null): boolean {
  const contentType = String(value || "").toLowerCase();
  return (
    contentType.includes("application/pdf") ||
    contentType.includes("application/octet-stream")
  );
}

const PDF_SIGNATURE_SCAN_BYTES = 1024;

// Per PDF spec 32000-1 §7.5.2, readers should tolerate leading bytes before
// the header and look for "%PDF-" within the first 1024 bytes of the file.
export function hasPdfSignature(chunk: Uint8Array): boolean {
  if (chunk.byteLength < 5) return false;
  const scanLength = Math.min(chunk.byteLength, PDF_SIGNATURE_SCAN_BYTES);
  const head = Buffer.from(chunk.buffer, chunk.byteOffset, scanLength).toString(
    "latin1",
  );
  return head.includes("%PDF-");
}

export function parseContentLength(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

