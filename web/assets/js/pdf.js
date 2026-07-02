export function cleanLinkUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

    // Links copiados do Google/encurtadores internos costumam carregar a URL real em q/url/u.
    // No iOS isso cria uma tela intermediária branca ao voltar do YouTube.
    const isGoogleRedirect =
      /(^|\.)google\.[a-z.]+$/.test(host) &&
      ["/url", "/interstitial", "/search"].includes(parsed.pathname);

    if (isGoogleRedirect) {
      const real = parsed.searchParams.get("q") || parsed.searchParams.get("url") || parsed.searchParams.get("u");
      if (real) return cleanLinkUrl(real);
    }

    if ((host === "youtube.com" || host === "youtu.be") && parsed.pathname === "/redirect") {
      const real = parsed.searchParams.get("q") || parsed.searchParams.get("url");
      if (real) return cleanLinkUrl(real);
    }

    if (["l.instagram.com", "lm.facebook.com", "m.facebook.com"].includes(host)) {
      const real = parsed.searchParams.get("u") || parsed.searchParams.get("url");
      if (real) return cleanLinkUrl(real);
    }

    return parsed.href;
  } catch {
    return raw;
  }
}

export function getDriveFileId(url) {
  const cleanUrl = cleanLinkUrl(url);
  if (!cleanUrl) return "";

  try {
    const parsed = new URL(cleanUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (!host.endsWith("drive.google.com") && !host.endsWith("docs.google.com")) return "";

    const byPath = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
    if (byPath) return byPath;

    const byQuery = parsed.searchParams.get("id");
    if (byQuery) return byQuery;

    return "";
  } catch {
    return "";
  }
}

export function driveToDownload(url) {
  const cleanUrl = cleanLinkUrl(url);
  if (!cleanUrl) return "";

  const fileId = getDriveFileId(cleanUrl);
  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
  }

  return cleanUrl;
}

export function driveToPreview(url) {
  const cleanUrl = cleanLinkUrl(url);
  if (!cleanUrl) return "";

  // transforma link do drive em preview para documentos simples.
  // Treino em PDF usa o viewer próprio no iOS para corrigir zoom + links de vídeo.
  if (cleanUrl.includes("drive.google.com")) {
    return cleanUrl.includes("/preview")
      ? cleanUrl
      : cleanUrl.replace(/\/view.*$/, "/preview");
  }
  return cleanUrl;
}

export function isPdfLikeUrl(url) {
  const cleanUrl = cleanLinkUrl(url);
  if (!cleanUrl) return false;

  try {
    const parsed = new URL(cleanUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host.endsWith("drive.google.com") || host.endsWith("docs.google.com")) return true;
    if (parsed.pathname.toLowerCase().endsWith(".pdf")) return true;
    return parsed.searchParams.get("format") === "pdf" || parsed.searchParams.get("export") === "download";
  } catch {
    return /\.pdf(?:$|[?#])/i.test(cleanUrl);
  }
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
            padding: 24px;
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
