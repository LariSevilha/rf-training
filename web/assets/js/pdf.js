export function driveToPreview(url) {
  if (!url) return "";

  // Transforma link do Drive em preview
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

// ====================== FUNÇÃO MELHORADA PARA ABRIR PDF ======================
export function openPdf(url, title = "PDF") {
  const pdfFrame = document.getElementById('pdfFrame');
  const pdfOverlay = document.getElementById('pdfOverlay');
  const pdfTitle = document.getElementById('pdfTitle');
  const loadingLayer = document.getElementById('loadingLayer');

  if (!pdfFrame || !pdfOverlay) return;

  pdfTitle.textContent = title || "PDF";

  const previewUrl = driveToPreview(url);

  // Abre o PDF
  pdfFrame.src = previewUrl;
  pdfOverlay.classList.add('active'); // ou remova o aria-hidden
  pdfOverlay.setAttribute('aria-hidden', 'false');

  // Limpa loading quando carregar
  pdfFrame.onload = () => {
    if (loadingLayer) loadingLayer.style.display = 'none';
  };

  console.log("📄 PDF aberto:", previewUrl);
}

// Função para fechar o PDF
export function closePdf() {
  const pdfOverlay = document.getElementById('pdfOverlay');
  const pdfFrame = document.getElementById('pdfFrame');
  
  if (pdfFrame) pdfFrame.src = "about:blank";
  if (pdfOverlay) {
    pdfOverlay.setAttribute('aria-hidden', 'true');
    pdfOverlay.classList.remove('active');
  }
}