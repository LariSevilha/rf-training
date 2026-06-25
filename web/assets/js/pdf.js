export function getDriveFileId(url) {
  if (!url) return "";

  try {
    const parsed = new URL(String(url));

    const byQuery = parsed.searchParams.get("id");
    if (byQuery) return byQuery;

    const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    if (match?.[1]) return match[1];

    const foldersMatch = parsed.pathname.match(/\/folders\/([^/]+)/);
    if (foldersMatch?.[1]) return foldersMatch[1];
  } catch {
    const match = String(url).match(/(?:id=|\/d\/)([a-zA-Z0-9_-]{10,})/);
    if (match?.[1]) return match[1];
  }

  return "";
}

export function driveToDirectPdf(url) {
  if (!url) return "";

  const raw = String(url).trim();

  if (!raw.includes("drive.google.com")) return raw;

  const id = getDriveFileId(raw);

  // Link direto do arquivo. Não abre a tela do Google Drive.
  // Em iPhone/iPad, isso costuma ser mais estável do que /preview dentro de iframe.
  if (id) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;

  return raw.replace(/\/view.*$/, "").replace(/\/preview.*$/, "");
}

export function driveToPreview(url) {
  return driveToDirectPdf(url);
}

export function placeholderHtml(title, msg) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body{
            font-family: system-ui;
            background:#111;
            color:#eee;
            display:flex;
            align-items:center;
            justify-content:center;
            height:100vh;
            margin:0;
          }
          .box{
            text-align:center;
            opacity:.85;
          }
          h1{margin-bottom:8px;}
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

export function isIOSPdfUnsafe() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function externalPdfHtml(title, url) {
  const safeTitle = String(title || "PDF")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const safeUrl = String(url || "").replaceAll('"', "&quot;");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <style>
          *{box-sizing:border-box}
          body{
            margin:0;
            min-height:100vh;
            background:#0b0b0b;
            color:#f5f5f5;
            font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
            display:grid;
            place-items:center;
            padding:24px;
          }
          .card{
            width:min(520px,100%);
            border:1px solid rgba(206,172,94,.32);
            background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018));
            border-radius:24px;
            padding:22px;
            text-align:center;
            box-shadow:0 18px 60px rgba(0,0,0,.36);
          }
          .icon{font-size:38px;margin-bottom:10px}
          h1{font-size:22px;line-height:1.12;margin:0 0 10px;letter-spacing:-.03em}
          p{margin:0 auto 18px;color:rgba(255,255,255,.72);line-height:1.45;font-size:14px;max-width:390px}
          a{
            min-height:48px;
            display:inline-flex;
            align-items:center;
            justify-content:center;
            width:100%;
            border-radius:16px;
            color:#111;
            background:linear-gradient(135deg,#e2be76,#ceac5e);
            text-decoration:none;
            font-weight:900;
          }
          small{display:block;margin-top:12px;color:rgba(255,255,255,.52);line-height:1.35}
        </style>
      </head>
      <body>
        <main class="card">
          <div class="icon" aria-hidden="true">📄</div>
          <h1>${safeTitle}</h1>
          <p>No iPhone/iPad, o visualizador interno pode travar quando usa zoom. Abra o PDF no visualizador nativo para dar zoom sem voltar para a primeira página.</p>
          <a href="${safeUrl}" target="_blank" rel="noopener">Abrir PDF</a>
          <small>Depois é só voltar para a área do aluno.</small>
        </main>
      </body>
    </html>
  `;
}
