function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function extractDriveId(url) {
  if (!url || !url.includes("drive.google.com")) return "";

  try {
    const parsed = new URL(url);
    const idFromQuery = parsed.searchParams.get("id");
    if (idFromQuery) return idFromQuery;

    const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    if (match?.[1]) return match[1];
  } catch {
    const match = String(url).match(/\/file\/d\/([^/]+)/) || String(url).match(/[?&]id=([^&]+)/);
    if (match?.[1]) return match[1];
  }

  return "";
}

function appendPdfHash(url) {
  if (!url) return "";
  if (!/\.pdf(\?|#|$)/i.test(url)) return url;

  const [base, hash = ""] = url.split("#");
  const params = new URLSearchParams(hash);

  if (!params.has("toolbar")) params.set("toolbar", "1");
  if (!params.has("navpanes")) params.set("navpanes", "0");
  if (!params.has("scrollbar")) params.set("scrollbar", "1");

  return `${base}#${params.toString().replace(/=(&|$)/g, "$1")}`;
}

export function driveToPreview(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  if (raw.includes("drive.google.com")) {
    const id = extractDriveId(raw);
    if (id) return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview?rm=minimal`;

    if (raw.includes("/preview")) return raw;
    return raw.replace(/\/view.*$/, "/preview?rm=minimal");
  }

  return appendPdfHash(raw);
}

export function placeholderHtml(title, msg) {
  const safeTitle = escapeHtml(title || "Material");
  const safeMsg = escapeHtml(msg || "");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <style>
          html, body { height: 100%; }
          body{
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background:#111;
            color:#eee;
            display:flex;
            align-items:center;
            justify-content:center;
            min-height:100%;
            margin:0;
            padding:24px;
            box-sizing:border-box;
          }
          .box{
            width:min(440px, 100%);
            text-align:center;
            background:rgba(255,255,255,.06);
            border:1px solid rgba(255,255,255,.12);
            border-radius:18px;
            padding:28px 22px;
          }
          h1{margin:0 0 8px;font-size:22px;}
          p{margin:0;opacity:.8;line-height:1.5;}
        </style>
      </head>
      <body>
        <div class="box">
          <h1>${safeTitle}</h1>
          <p>${safeMsg}</p>
        </div>
      </body>
    </html>
  `;
}

export const makePlaceholderHtml = placeholderHtml;
