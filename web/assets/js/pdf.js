export function driveToPreview(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";

  // Mantém o mesmo tipo de link cadastrado pelo admin, mas exibe no modo preview.
  // Ex.: https://drive.google.com/file/d/ID/view?usp=sharing -> /preview
  // Esse modo é o mais estável para zoom no iOS/PWA e é usado para treino e dieta.
  if (/drive\.google\.com/i.test(raw)) {
    if (/\/preview(?:\?|$)/i.test(raw)) return raw;
    if (/\/file\/d\/[^/]+\/view/i.test(raw)) {
      return raw.replace(/\/view(?:\?.*)?$/i, "/preview");
    }
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