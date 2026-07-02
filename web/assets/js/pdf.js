export function cleanLinkUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    // Links copiados do Google costumam vir como google.com/url?q=URL_REAL.
    // No iOS isso cria a tela branca/intermediária de redirecionamento ao voltar do YouTube.
    if (host === "google.com" && parsed.pathname === "/url") {
      const real = parsed.searchParams.get("q") || parsed.searchParams.get("url");
      if (real) return cleanLinkUrl(real);
    }

    return parsed.href;
  } catch {
    return raw;
  }
}

export function driveToPreview(url) {
  const cleanUrl = cleanLinkUrl(url);
  if (!cleanUrl) return "";

  // transforma link do drive em preview
  if (cleanUrl.includes("drive.google.com")) {
    return cleanUrl.includes("/preview")
      ? cleanUrl
      : cleanUrl.replace(/\/view.*$/, "/preview");
  }
  return cleanUrl;
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
