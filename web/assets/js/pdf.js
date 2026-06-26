function appendPdfFragment(url, fragment) {
  if (!url || !fragment) return url || "";

  const [base, currentHash = ""] = String(url).split("#");
  const params = new URLSearchParams(currentHash);

  Object.entries(fragment).forEach(([key, value]) => {
    if (!params.has(key)) params.set(key, value);
  });

  const hash = params.toString();
  return hash ? `${base}#${hash}` : base;
}

function getDriveFileId(url) {
  const text = String(url || "").trim();
  if (!text) return "";

  const directMatch = text.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (directMatch?.[1]) return directMatch[1];

  try {
    const parsed = new URL(text);
    return parsed.searchParams.get("id") || "";
  } catch {
    return "";
  }
}

export function driveToPreview(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  if (raw.includes("drive.google.com")) {
    const fileId = getDriveFileId(raw);

    if (fileId) {
      return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
    }

    return raw.includes("/preview")
      ? raw
      : raw.replace(/\/view.*$/i, "/preview");
  }

  if (/\.pdf(\?|#|$)/i.test(raw)) {
    return appendPdfFragment(raw, {
      toolbar: "1",
      navpanes: "0",
      scrollbar: "1",
      view: "FitH"
    });
  }

  return raw;
}

export function placeholderHtml(title, msg) {
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
            min-height:100vh;
            margin:0;
            padding:24px;
            box-sizing:border-box;
          }
          .box{
            max-width:420px;
            text-align:center;
            opacity:.92;
            border:1px solid rgba(255,255,255,.10);
            border-radius:22px;
            padding:28px 22px;
            background:rgba(255,255,255,.04);
          }
          h1{margin:0 0 8px;font-size:22px;}
          p{margin:0;color:#cfcfcf;line-height:1.45;}
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
