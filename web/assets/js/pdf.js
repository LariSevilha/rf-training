export function getDriveFileId(url) {
  if (!url) return "";

  const raw = String(url).trim();

  try {
    const parsed = new URL(raw);

    const byId = parsed.searchParams.get("id");
    if (byId) return byId;

    const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    if (fileMatch?.[1]) return fileMatch[1];

    const openMatch = parsed.pathname.match(/\/open\/([^/]+)/);
    if (openMatch?.[1]) return openMatch[1];
  } catch {
    const fallback = raw.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]{10,})/);
    if (fallback?.[1]) return fallback[1];
  }

  return "";
}

export function driveToPreview(url) {
  if (!url) return "";

  const raw = String(url).trim();
  if (!raw) return "";

  if (!raw.includes("drive.google.com")) return raw;

  const id = getDriveFileId(raw);
  if (id) return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;

  if (raw.includes("/preview")) return raw;
  if (raw.includes("/view")) return raw.replace(/\/view(?:\?.*)?$/, "/preview");

  return raw;
}

export function pdfProxyUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  return `/api/student/pdf-proxy?url=${encodeURIComponent(raw)}`;
}

export async function loadPdfAsBlobUrl(url, token) {
  const endpoint = pdfProxyUrl(url);
  if (!endpoint) throw new Error("Material não configurado.");

  const response = await fetch(endpoint, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Erro HTTP ${response.status}`;
    try {
      const data = await response.json();
      message = data?.message || message;
    } catch {}
    throw new Error(message);
  }

  const blob = await response.blob();
  const type = blob.type || response.headers.get("content-type") || "";

  if (type.includes("text/html")) {
    throw new Error("O arquivo não veio como PDF. Verifique a permissão do Drive.");
  }

  return URL.createObjectURL(blob);
}

export function placeholderHtml(title, msg) {
  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <style>
          body{
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background:#111;
            color:#eee;
            display:flex;
            align-items:center;
            justify-content:center;
            min-height:100vh;
            margin:0;
            padding:24px;
            box-sizing:border-box;
          }
          .box{
            text-align:center;
            opacity:.95;
            max-width:420px;
          }
          h1{margin:0 0 8px;font-size:22px;line-height:1.1;}
          p{margin:0;line-height:1.45;color:rgba(255,255,255,.72);}
        </style>
      </head>
      <body>
        <div class="box">
          <h1>${title}</h1>
          <p>${msg}</p>
        </div>
      </body>
    </html>
  `;
}

export const makePlaceholderHtml = placeholderHtml;

// Compatibilidade com versões antigas.
export function driveToDirectPdf(url) {
  return pdfProxyUrl(url) || driveToPreview(url);
}

export function isIOSPdfUnsafe() {
  return false;
}

export function externalPdfHtml(title, url) {
  const safeTitle = String(title || "PDF").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const safeUrl = driveToPreview(url);
  return placeholderHtml(safeTitle, safeUrl ? "Carregando material dentro do aplicativo." : "Material não configurado.");
}
