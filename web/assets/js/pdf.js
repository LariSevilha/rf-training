export function driveToPreview(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw, window.location.origin);

    if (parsed.hostname.includes("drive.google.com")) {
      let fileId = "";

      const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
      if (fileMatch?.[1]) fileId = fileMatch[1];

      if (!fileId) fileId = parsed.searchParams.get("id") || "";

      if (fileId) {
        return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
      }

      if (parsed.pathname.includes("/preview")) return parsed.href;
      return parsed.href.replace(/\/view(?:\?.*)?$/, "/preview");
    }

    return parsed.href;
  } catch {
    return raw;
  }
}

export function placeholderHtml(title, msg) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <style>
          body{
            font-family: system-ui;
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
