export function extractDriveFileId(url) {
  const value = String(url || "").trim();
  if (!value) return "";

  const patterns = [
    /drive\.google\.com\/file\/d\/([^/]+)/i,
    /drive\.google\.com\/open\?id=([^&]+)/i,
    /drive\.google\.com\/uc\?[^#?]*\bid=([^&]+)/i,
    /docs\.google\.com\/uc\?[^#?]*\bid=([^&]+)/i,
    /[?&]id=([^&]+)/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  return "";
}

export function driveToNativePdf(url) {
  const value = String(url || "").trim();
  if (!value) return "";

  if (!/drive\.google\.com|docs\.google\.com/i.test(value)) {
    return value;
  }

  const fileId = extractDriveFileId(value);
  if (!fileId) return driveToPreview(value);

  // Link direto/inline do arquivo. Evita o visualizador do Google Drive,
  // que embrulha links do PDF em google.com/redirect e causa tela branca no iOS.
  return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`;
}

export function driveToPreview(url) {
  if (!url) return "";

  if (url.includes("drive.google.com")) {
    // Força preview otimizado
    return url
      .replace(/\/view\?usp=drivesdk/, "/preview")
      .replace(/\/edit\?usp=drivesdk/, "/preview")
      .replace(/\/file\/d\/(.*?)\/.*/, "/file/d/$1/preview");
  }
  return url;
}

export function placeholderHtml(title, msg) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <style>
          html,body{height:100%;margin:0;overscroll-behavior:none;background:#111;}
          body{
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color:#eee;
            display:flex;
            align-items:center;
            justify-content:center;
            padding:24px;
            box-sizing:border-box;
          }
          .box{
            width:min(520px, 100%);
            text-align:center;
            opacity:.9;
            border:1px solid rgba(255,255,255,.14);
            border-radius:24px;
            padding:28px 22px;
            background:#151515;
          }
          h1{margin:0 0 8px;font-size:24px;line-height:1.1;}
          p{margin:0;color:rgba(255,255,255,.72);line-height:1.45;}
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
