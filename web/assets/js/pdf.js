function youtubeVideoId(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");

    if (host === "youtu.be") {
      return u.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v") || "";
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || "";
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || "";
      if (u.pathname.startsWith("/live/")) return u.pathname.split("/")[2] || "";
    }
  } catch {
    // URL inválida, ignora e trata como link comum
  }
  return "";
}

export function driveToPreview(url) {
  if (!url) return "";

  // transforma link do YouTube em embed (obrigatório para abrir em iframe)
  const videoId = youtubeVideoId(url);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // transforma link do drive em preview
  if (url.includes("drive.google.com")) {
    return url.includes("/preview")
      ? url
      : url.replace(/\/view.*$/, "/preview");
  }
  return url;
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