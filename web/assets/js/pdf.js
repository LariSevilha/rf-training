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

  // Mantém o PDF abrindo dentro do sistema em iframe.
  // Não usamos /uc?export=download porque esse formato pode perder a permissão
  // do Google Drive e mostrar erro de acesso para o aluno.
  if (id) return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;

  if (raw.includes("/preview")) return raw;
  if (raw.includes("/view")) return raw.replace(/\/view(?:\?.*)?$/, "/preview");

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
            opacity:.9;
            max-width:420px;
          }
          h1{margin:0 0 8px;font-size:22px;}
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
