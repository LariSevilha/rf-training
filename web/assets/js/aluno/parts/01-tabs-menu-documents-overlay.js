// Abas, menu inicial, documentos, PDF/HTML overlay e logout
// Dependências importadas pelo arquivo principal: ../aluno.js

function setTab(name) {
  const target = name === "manual" ? "manual" : "documents";

  document.body.classList.toggle("studentManualMode", target === "manual");
  document.body.classList.toggle("studentHomeMode", target !== "manual");

  document.querySelectorAll("[data-student-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.studentTab === target);
  });

  document.querySelectorAll(".alunoPanel").forEach((panel) => {
    panel.classList.remove("active");
  });

  document.getElementById(`panel-${target}`)?.classList.add("active");

  const hero = document.getElementById("alunoHero");
  if (hero) {
    hero.hidden = target === "manual";
    hero.setAttribute("aria-hidden", target === "manual" ? "true" : "false");
  }
}

document.querySelectorAll("[data-student-tab]").forEach((btn) => {
  btn.addEventListener("click", () => setTab(btn.dataset.studentTab));
});

backHomeBtn?.addEventListener("click", (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  setTab("documents");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

function lockMenu() {
  document.body.classList.remove("ready");
  menuGrid?.classList.add("menuLocked");
}

function unlockMenu() {
  document.body.classList.add("ready");
  menuGrid?.classList.remove("menuLocked");
}

function hasWrittenCardio() {
  return !!(
    String(cardioWritten.name || "").trim() ||
    String(cardioWritten.time || "").trim() ||
    String(cardioWritten.intensity || "").trim() ||
    String(cardioWritten.days || "").trim()
  );
}

function parseCardioFromDocs(docs = {}) {
  cardioWritten.name = "";
  cardioWritten.time = "";
  cardioWritten.intensity = "";
  cardioWritten.days = "";

  if (typeof docs.cardio === "string" && docs.cardio.trim()) {
    try {
      const parsed = JSON.parse(docs.cardio);
      cardioWritten.name = String(parsed.name || "").trim();
      cardioWritten.time = String(parsed.time || "").trim();
      cardioWritten.intensity = String(parsed.intensity || "").trim();
      cardioWritten.days = String(parsed.days || "").trim();
      return;
    } catch {
      // Se o campo cardio vier como link antigo, não usar como cardio escrito.
    }
  }

  cardioWritten.name = String(docs.cardioName || "").trim();
  cardioWritten.time = String(docs.cardioTime || "").trim();
  cardioWritten.intensity = String(docs.cardioIntensity || "").trim();
  cardioWritten.days = String(docs.cardioDays || "").trim();
}

function hasAnyMaterial() {
  return Boolean(
    (urls.training && !workouts.length) ||
    urls.diet ||
    urls.supp ||
    urls.exams ||
    urls.stretch ||
    hasWrittenCardio() ||
    workouts.length ||
    extraItems.length
  );
}

function createMenuButton({ key, icon, title, subtitle }) {
  const btn = document.createElement("button");
  btn.className = "studentCard";
  btn.type = "button";
  btn.dataset.open = key;

  btn.innerHTML = `
    <span class="cardIcon">${escapeHtml(icon)}</span>
    <span class="cardText">
      <b>${escapeHtml(title)}</b>
      <small>${escapeHtml(subtitle || "")}</small>
    </span>
    <span class="cardArrow">›</span>
  `;

  btn.addEventListener("click", () => openContent(key));

  return btn;
}

function renderHomeMenu() {
  if (!menuGrid) return;

  menuGrid.innerHTML = "";
  Object.keys(extraUrls).forEach((key) => delete extraUrls[key]);

  const hasManualWorkout = Array.isArray(workouts) && workouts.length > 0;

  const cards = [];

  if (hasManualWorkout || urls.training) {
    cards.push({
      key: "training",
      icon: "🏋️",
      title: "Treino"
    });
  }

  if (urls.diet) {
    cards.push({
      key: "diet",
      icon: "🍽️",
      title: "Alimentação"
    });
  }

  if (urls.supp) {
    cards.push({
      key: "supp",
      icon: "💊",
      title: "Suplementação"
    });
  }

  if (hasWrittenCardio()) {
    cards.push({
      key: "cardio",
      icon: "🏃",
      title: "Cardio"
    });
  }

  if (urls.exams) {
    cards.push({
      key: "exams",
      icon: "🧾",
      title: "Exames"
    });
  }

  if (urls.stretch) {
    cards.push({
      key: "stretch",
      icon: "🤸",
      title: "Alongamento"
    });
  }

  extraItems
    .filter((item) => item && item.active !== false && String(item.url || "").trim())
    .forEach((item) => {
      const key = `extra-${item.id}`;
      extraUrls[key] = String(item.url || "").trim();

      cards.push({
        key,
        icon: "📎",
        title: item.title || "Arquivo"
      });
    });

  cards.forEach((card) => menuGrid.appendChild(createMenuButton(card)));

  if (docsEmpty) {
    docsEmpty.style.display = cards.length ? "none" : "grid";
  }

  if (alunoTabs) {
    alunoTabs.style.display = "none";
    alunoTabs.setAttribute("hidden", "");
  }

  setTab("documents");
}

function cardioWrittenHtml() {
  const name = escapeHtml(cardioWritten.name || "Cardio");
  const time = escapeHtml(cardioWritten.time || "Não informado");
  const intensity = escapeHtml(cardioWritten.intensity || "Não informada");
  const days = escapeHtml(cardioWritten.days || "Não informado");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body{margin:0;background:#0f0f0f;color:#f5f5f5;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;box-sizing:border-box}
          .card{width:min(620px,100%);background:#151515;border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
          .eyebrow{color:#ceac5e;text-transform:uppercase;font-size:12px;font-weight:900;letter-spacing:.12em;margin-bottom:8px}
          h1{font-size:32px;line-height:1.05;margin:0 0 18px}
          .row{border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:16px;margin-top:12px;background:rgba(255,255,255,.035)}
          .label{font-size:12px;color:rgba(255,255,255,.58);font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
          .value{font-size:20px;font-weight:850}
        </style>
      </head>
      <body>
        <main class="card">
          <div class="eyebrow ">Cardio</div>
          <h1>${name}</h1>
          <div class="row"><div class="label">Tempo</div><div class="value">${time}</div></div>
          <div class="row"><div class="label">Intensidade</div><div class="value">${intensity}</div></div>
          <div class="row cardioDaysBadge"><div class="label">frequência / dias por semana</div><div class="value">${days}</div></div>
        </main>
      </body>
    </html>
  `;
}


function createInteractivePdfHtml(title, rawUrl) {
  const safeTitle = escapeHtml(title || "PDF");
  const safeUrl = escapeHtml(rawUrl || "");
  const proxyPath = `/api/pdf-proxy?url=${encodeURIComponent(rawUrl || "")}`;
  const authToken = session?.token || localStorage.getItem("rf_token") || "";

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/web/pdf_viewer.min.css">
        <style>
          *{box-sizing:border-box} body{margin:0;background:#0b0b0b;color:#f5f5f5;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif} 
          .top{position:sticky;top:0;z-index:20;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:#111;border-bottom:1px solid rgba(206,172,94,.25)}
          .top b{font-size:12px;color:#ceac5e;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
          .top button,.fallbackBtn{border:0;border-radius:999px;background:#ceac5e;color:#111;font-weight:900;padding:9px 12px;cursor:pointer}
          .hint{font-size:12px;color:#d8d8d8;opacity:.78;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.08)}
          #viewer{width:100%;max-width:980px;margin:0 auto;padding:12px 8px 40px}
          .page{position:relative;margin:0 auto 14px;background:#fff;box-shadow:0 14px 40px rgba(0,0,0,.45);overflow:hidden}
          .page canvas{display:block;width:100%;height:auto}
          .annotationLayer{position:absolute;inset:0;pointer-events:none}
          .annotationLayer section,.annotationLayer a{pointer-events:auto}
          .annotationLayer a{outline:2px solid rgba(206,172,94,.30);border-radius:3px}
          .status{min-height:70vh;display:flex;align-items:center;justify-content:center;padding:26px;text-align:center;color:#ddd}
          .statusBox{max-width:440px;background:#141414;border:1px solid rgba(206,172,94,.22);border-radius:20px;padding:22px;box-shadow:0 16px 50px rgba(0,0,0,.35)}
          .statusBox h2{margin:0 0 10px;font-size:18px;color:#ceac5e}.statusBox p{margin:0 0 14px;line-height:1.45;color:#ddd}
        </style>
      </head>
      <body>
        <div class="top"><b>${safeTitle}</b><button id="zoomBtn" type="button">Ajustar zoom</button></div>
        <div class="hint">Links do YouTube dentro do PDF abrem em modal, sem sair do aplicativo.</div>
        <div id="viewer"><div class="status"><div class="statusBox"><h2>Carregando PDF…</h2><p>Aguarde enquanto preparamos o leitor interativo.</p></div></div></div>
        <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js"><\/script>
        <script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/web/pdf_viewer.min.js"><\/script>
        <script>
          const RAW_URL = ${JSON.stringify(rawUrl || "")};
          const PROXY_PATH = ${JSON.stringify(proxyPath)};
          const AUTH_TOKEN = ${JSON.stringify(authToken)};
          const viewer = document.getElementById("viewer");
          let fitWidth = true;

          function parentVideo(url){
            try { parent.postMessage({ type:"RF_OPEN_STUDENT_VIDEO", url, title:"Vídeo do PDF" }, "*"); } catch {}
          }
          function normalizeUrl(url){
            let value = String(url || "").trim().replace(/&amp;/g, "&");
            if (!/^https?:\/\//i.test(value)) value = "https://" + value;
            try {
              const parsed = new URL(value);
              const host = parsed.hostname.toLowerCase();
              if (host.includes("google.") && parsed.pathname.startsWith("/url")) {
                const redirected = parsed.searchParams.get("q") || parsed.searchParams.get("url");
                if (redirected) return normalizeUrl(decodeURIComponent(redirected));
              }
              return parsed.toString();
            } catch { return value; }
          }
          function isYouTube(url){
            try {
              const parsed = new URL(normalizeUrl(url));
              const host = parsed.hostname.toLowerCase();
              return host === "youtu.be" || host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com");
            } catch { return false; }
          }
          function showFallback(message){
            viewer.innerHTML = '<div class="status"><div class="statusBox"><h2>Leitor interativo indisponível</h2><p>'+ message +'</p><button class="fallbackBtn" id="fallbackBtn" type="button">Abrir visualização padrão</button></div></div>';
            document.getElementById("fallbackBtn")?.addEventListener("click", () => {
              parent.postMessage({ type:"RF_PDF_FALLBACK", url: RAW_URL }, "*");
            });
          }
          async function loadPdf(){
            if (!window.pdfjsLib) return showFallback("Não foi possível carregar o leitor de PDF. Verifique a conexão e tente novamente.");
            pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
            const token = AUTH_TOKEN || "";
            const res = await fetch(PROXY_PATH, { headers: token ? { Authorization: "Bearer " + token } : {} });
            if (!res.ok) throw new Error("Falha ao carregar PDF: " + res.status);
            const data = await res.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data }).promise;
            viewer.innerHTML = "";
            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
              const page = await pdf.getPage(pageNumber);
              const baseViewport = page.getViewport({ scale: 1 });
              const maxWidth = Math.min(window.innerWidth - 16, 980);
              const scale = fitWidth ? Math.max(0.65, maxWidth / baseViewport.width) : 1.25;
              const viewport = page.getViewport({ scale });
              const pageBox = document.createElement("div");
              pageBox.className = "page";
              pageBox.style.width = viewport.width + "px";
              pageBox.style.height = viewport.height + "px";
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              canvas.width = Math.floor(viewport.width * devicePixelRatio);
              canvas.height = Math.floor(viewport.height * devicePixelRatio);
              canvas.style.width = viewport.width + "px";
              canvas.style.height = viewport.height + "px";
              ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
              pageBox.appendChild(canvas);
              const annotationLayer = document.createElement("div");
              annotationLayer.className = "annotationLayer";
              pageBox.appendChild(annotationLayer);
              viewer.appendChild(pageBox);
              await page.render({ canvasContext: ctx, viewport }).promise;
              const annotations = await page.getAnnotations({ intent: "display" });
              if (pdfjsLib.AnnotationLayer && annotations.length) {
                pdfjsLib.AnnotationLayer.render({
                  viewport: viewport.clone({ dontFlip: true }),
                  div: annotationLayer,
                  annotations,
                  page,
                  renderForms: false,
                  linkService: { addLinkAttributes: (link, url) => { link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer"; } },
                  downloadManager: null,
                });
              }
              annotationLayer.querySelectorAll("a[href]").forEach((a) => {
                a.addEventListener("click", (ev) => {
                  const href = a.getAttribute("href") || "";
                  if (isYouTube(href)) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    parentVideo(href);
                  }
                }, true);
              });
            }
          }
          document.getElementById("zoomBtn")?.addEventListener("click", () => { fitWidth = !fitWidth; loadPdf().catch(() => showFallback("Não foi possível reajustar o PDF.")); });
          loadPdf().catch((err) => showFallback("Não foi possível ler este PDF de forma interativa. A visualização padrão continua disponível, mas links internos podem depender do leitor do navegador."));
        <\/script>
      </body>
    </html>
  `;
}

function openHtmlOverlay(title, html) {
  if (pdfTitle) pdfTitle.textContent = title || "Material";
  showLoading();

  if (pdfFrame) {
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(html);
  }

  setTimeout(hideLoading, 250);

  pdfOverlay?.classList.add("show");
  pdfOverlay?.setAttribute("aria-hidden", "false");
  document.body.classList.add("pdfOpen");
}

function openPdfOverlay(title, rawUrl) {
  if (pdfTitle) pdfTitle.textContent = title || "PDF";
  showLoading();

  if (!rawUrl) {
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(
      placeholderHtml("Material não configurado", "Entre em contato com o personal.")
    );
    setTimeout(hideLoading, 250);
  } else if (!navigator.onLine) {
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(
      placeholderHtml("Você está offline", "Conecte-se para abrir este material.")
    );
    setTimeout(hideLoading, 250);
  } else {
    const preview = driveToPreview(rawUrl);
    if (!preview) {
      pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(
        placeholderHtml("Link inválido", "Envie um link do Drive/PDF compatível.")
      );
      setTimeout(hideLoading, 250);
    } else {
      pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(
        createInteractivePdfHtml(title || "PDF", rawUrl)
      );
      setTimeout(hideLoading, 650);
    }
  }

  pdfOverlay?.classList.add("show");
  pdfOverlay?.setAttribute("aria-hidden", "false");
  document.body.classList.add("pdfOpen");
}

function openContent(type) {
  if (type === "training" && workouts.length > 0) {
    activeWorkoutIndex = 0;
    setTab("manual");
    renderWorkouts();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (type === "cardio" && hasWrittenCardio()) {
    openHtmlOverlay("CARDIO", cardioWrittenHtml());
    return;
  }

  const titles = {
    training: "TREINO",
    diet: "DIETA",
    supp: "SUPLEMENTAÇÃO",
    exams: "EXAMES",
    stretch: "ALONGAMENTO",
  };

  if (type.startsWith("extra-")) {
    const extra = extraItems.find((item) => `extra-${item.id}` === type);
    openPdfOverlay(extra?.title || "MATERIAL EXTRA", extraUrls[type] || "");
    return;
  }

  openPdfOverlay(titles[type] || "MATERIAL", urls[type] || "");
}

function closePdf() {
  pdfOverlay?.classList.remove("show");
  pdfOverlay?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("pdfOpen");
  hideLoading();

  setTimeout(() => {
    if (pdfFrame) pdfFrame.src = "about:blank";
  }, 200);
}

pdfBack?.addEventListener("click", (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  closePdf();
});

logoutBtn?.addEventListener("click", () => {
  clearSession();
  window.location.href = "/pages/index.html";
});
