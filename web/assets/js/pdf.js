export function getGoogleDriveFileId(url) {
  if (!url) return "";

  const raw = String(url).trim();

  try {
    const parsed = new URL(raw);

    // https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    if (fileMatch?.[1]) return fileMatch[1];

    // https://drive.google.com/open?id=FILE_ID
    // https://drive.google.com/uc?id=FILE_ID&export=download
    const idParam = parsed.searchParams.get("id");
    if (idParam) return idParam;

    // https://drive.google.com/drive/folders/... não é arquivo PDF
    return "";
  } catch {
    const fileMatch = raw.match(/\/file\/d\/([^/?#]+)/);
    if (fileMatch?.[1]) return fileMatch[1];

    const idMatch = raw.match(/[?&]id=([^&#]+)/);
    if (idMatch?.[1]) return decodeURIComponent(idMatch[1]);
  }

  return "";
}

export function driveToPreview(url) {
  if (!url) return "";

  const raw = String(url).trim();

  if (raw.includes("drive.google.com")) {
    const fileId = getGoogleDriveFileId(raw);

    // Usa sempre o preview oficial do arquivo. Isso evita variações como /view,
    // open?id=, uc?id= e links com ?usp=sharing recarregando o iframe.
    if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;

    // Se já for preview, mantém.
    if (raw.includes("/preview")) return raw;

    return "";
  }

  return raw;
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
            padding:24px;
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

// Compatibilidade com arquivo antigo app.js
export const makePlaceholderHtml = placeholderHtml;
