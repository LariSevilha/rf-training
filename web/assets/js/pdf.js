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

export function isDriveUrl(url) {
  return /drive\.google\.com/i.test(String(url || ""));
}

export function driveToPreview(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  // Se alguém colou um link do Google Viewer antigo, retiramos a camada extra
  // e abrimos o material original. O Google Viewer dentro de outro iframe é
  // mais instável no mobile.
  if (/docs\.google\.com\/gview/i.test(raw)) {
    try {
      const parsed = new URL(raw);
      const originalUrl = parsed.searchParams.get("url") || "";
      if (originalUrl) return driveToPreview(originalUrl);
    } catch {
      // segue para as outras regras
    }
  }

  if (raw.includes("drive.google.com")) {
    const fileId = getDriveFileId(raw);

    if (fileId) {
      // V7: voltamos para /preview porque o link direto uc?export=download
      // pode pedir permissão/baixar em vez de visualizar dentro do sistema.
      // A proteção contra reload fica no sandbox aplicado dinamicamente no
      // iframe, bloqueando navegação para fora do overlay.
      return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
    }

    return raw;
  }

  // PDFs diretos continuam diretos. Arquivos anexados do próprio sistema não
  // precisam passar por Drive/Viewer.
  if (/^https?:\/\//i.test(raw) && /\.pdf(\?|#|$)/i.test(raw)) {
    return raw;
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
