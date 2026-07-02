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

const PDFJS_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER_URL = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

let pdfJsPromise = null;
let activePdfDoc = null;
let activePdfScale = 1;
let activePdfUrl = "";
let pdfRenderVersion = 0;
let pinchStartDistance = 0;
let pinchStartScale = 1;
let pinchLastScale = 1;

function apiBaseUrl() {
  return location.hostname === "localhost" ? "http://localhost:3333/api" : "/api";
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      if (window.pdfjsLib) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Não foi possível carregar o leitor de PDF."));
    document.head.appendChild(script);
  });
}

async function ensurePdfJs() {
  if (window.pdfjsLib) return window.pdfjsLib;

  if (!pdfJsPromise) {
    pdfJsPromise = loadScriptOnce(PDFJS_URL).then(() => {
      if (!window.pdfjsLib) throw new Error("Leitor de PDF indisponível.");
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      return window.pdfjsLib;
    });
  }

  return pdfJsPromise;
}

function clampPdfScale(value) {
  return Math.max(0.45, Math.min(2.75, Number(value) || 1));
}

function updateZoomLabel(value = activePdfScale) {
  if (pdfZoomLabel) pdfZoomLabel.textContent = `${Math.round((value || 1) * 100)}%`;
  if (pdfZoomControls) pdfZoomControls.style.display = activePdfDoc ? "inline-flex" : "none";
}

function resetPdfViewer() {
  activePdfDoc = null;
  activePdfUrl = "";
  pdfRenderVersion += 1;
  activePdfScale = 1;
  pinchStartDistance = 0;
  pinchStartScale = 1;
  pinchLastScale = 1;
  updateZoomLabel(1);

  if (pdfViewer) {
    pdfViewer.innerHTML = "";
    pdfViewer.scrollTop = 0;
    pdfViewer.style.display = "block";
  }

  if (pdfFrame) {
    pdfFrame.src = "about:blank";
    pdfFrame.style.display = "none";
  }
}

function setPdfPlaceholder(title, msg, actionUrl = "") {
  if (!pdfViewer) return;

  const safeTitle = escapeHtml(title || "Material indisponível");
  const safeMsg = escapeHtml(msg || "Tente novamente em instantes.");
  const safeUrl = escapeHtml(actionUrl || "");

  pdfViewer.innerHTML = `
    <div class="pdfNoticeCard">
      <div class="pdfNoticeIcon">📄</div>
      <h3>${safeTitle}</h3>
      <p>${safeMsg}</p>
      ${safeUrl ? `<button class="btn" type="button" data-open-external="${safeUrl}">Abrir fora do app</button>` : ""}
    </div>
  `;
}

function normalizeExternalUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";

  try {
    const parsed = new URL(value, window.location.href);

    // PDFs exportados pelo Google às vezes salvam o link como redirect do google.com/url?q=...
    if (/((^|\.)google\.)/i.test(parsed.hostname) && parsed.pathname === "/url") {
      const redirected = parsed.searchParams.get("q") || parsed.searchParams.get("url");
      if (redirected) return normalizeExternalUrl(redirected);
    }

    return parsed.href;
  } catch {
    return value;
  }
}

function youtubeEmbedUrl(raw) {
  const normalized = normalizeExternalUrl(raw);
  if (!normalized) return "";

  try {
    const url = new URL(normalized);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    let id = "";

    if (host === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    } else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (url.pathname.startsWith("/shorts/")) id = url.pathname.split("/").filter(Boolean)[1] || "";
      else if (url.pathname.startsWith("/embed/")) id = url.pathname.split("/").filter(Boolean)[1] || "";
      else if (url.pathname.startsWith("/watch")) id = url.searchParams.get("v") || "";
      else if (url.pathname.startsWith("/live/")) id = url.pathname.split("/").filter(Boolean)[1] || "";
    }

    id = id.replace(/[^a-zA-Z0-9_-]/g, "");
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&playsinline=1&rel=0` : "";
  } catch {
    return "";
  }
}

function openStudentVideo(rawUrl) {
  const normalized = normalizeExternalUrl(rawUrl);
  const embed = youtubeEmbedUrl(normalized);

  if (!embed) {
    window.open(normalized || rawUrl, "_blank", "noopener,noreferrer");
    return;
  }

  if (studentVideoFrame) studentVideoFrame.src = embed;
  studentVideoModal?.classList.add("show");
  studentVideoModal?.setAttribute("aria-hidden", "false");
  document.body.classList.add("videoOpen");
}

function closeStudentVideo() {
  studentVideoModal?.classList.remove("show");
  studentVideoModal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("videoOpen");
  if (studentVideoFrame) studentVideoFrame.src = "about:blank";
}

function externalLinkFromAnnotation(annotation) {
  return normalizeExternalUrl(annotation?.url || annotation?.unsafeUrl || "");
}

async function renderPdfPages() {
  if (!activePdfDoc || !pdfViewer) return;

  const version = ++pdfRenderVersion;
  const pdfjsLib = await ensurePdfJs();

  pdfViewer.innerHTML = `<div class="pdfNoticeInline">Carregando páginas do PDF…</div>`;
  updateZoomLabel();

  const scrollRatio = pdfViewer.scrollHeight > 0 ? pdfViewer.scrollTop / pdfViewer.scrollHeight : 0;
  const fragment = document.createDocumentFragment();

  for (let pageNumber = 1; pageNumber <= activePdfDoc.numPages; pageNumber += 1) {
    if (version !== pdfRenderVersion) return;

    const page = await activePdfDoc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: activePdfScale });
    const outputScale = Math.min(window.devicePixelRatio || 1, 2);

    const pageBox = document.createElement("div");
    pageBox.className = "pdfPageBox";
    pageBox.style.width = `${viewport.width}px`;
    pageBox.style.height = `${viewport.height}px`;

    const canvas = document.createElement("canvas");
    canvas.className = "pdfCanvas";
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);

    pageBox.appendChild(canvas);

    const linkLayer = document.createElement("div");
    linkLayer.className = "pdfLinkLayer";
    pageBox.appendChild(linkLayer);

    fragment.appendChild(pageBox);

    await page.render({ canvasContext: ctx, viewport }).promise;

    const annotations = await page.getAnnotations({ intent: "display" });
    annotations.forEach((annotation) => {
      const href = externalLinkFromAnnotation(annotation);
      if (!href || !annotation.rect) return;

      const rect = pdfjsLib.Util.normalizeRect(annotation.rect);
      const converted = viewport.convertToViewportRectangle(rect);
      const left = Math.min(converted[0], converted[2]);
      const top = Math.min(converted[1], converted[3]);
      const width = Math.abs(converted[0] - converted[2]);
      const height = Math.abs(converted[1] - converted[3]);

      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.className = "pdfAnnotationLink";
      anchor.dataset.pdfHref = href;
      anchor.setAttribute("aria-label", "Abrir link do PDF");
      anchor.style.left = `${left}px`;
      anchor.style.top = `${top}px`;
      anchor.style.width = `${Math.max(width, 24)}px`;
      anchor.style.height = `${Math.max(height, 24)}px`;

      anchor.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();

        const target = normalizeExternalUrl(anchor.dataset.pdfHref || anchor.href);
        if (youtubeEmbedUrl(target)) openStudentVideo(target);
        else window.open(target, "_blank", "noopener,noreferrer");
      });

      linkLayer.appendChild(anchor);
    });
  }

  if (version !== pdfRenderVersion) return;

  pdfViewer.innerHTML = "";
  pdfViewer.appendChild(fragment);
  pdfViewer.scrollTop = Math.max(0, pdfViewer.scrollHeight * scrollRatio);
  hideLoading();
}

async function openPdfWithPdfJs(rawUrl) {
  resetPdfViewer();
  showLoading();

  const pdfjsLib = await ensurePdfJs();
  const endpoint = `${apiBaseUrl()}/pdf-proxy?url=${encodeURIComponent(rawUrl)}`;
  const res = await fetch(endpoint, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${session?.token || ""}` },
  });

  if (!res.ok) {
    let message = `Erro HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {}
    throw new Error(message);
  }

  const buffer = await res.arrayBuffer();
  activePdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
  activePdfUrl = rawUrl;

  const width = Math.max(320, (pdfViewer?.clientWidth || window.innerWidth) - 24);
  const firstPage = await activePdfDoc.getPage(1);
  const baseViewport = firstPage.getViewport({ scale: 1 });
  activePdfScale = clampPdfScale(Math.min(1.35, Math.max(0.45, width / baseViewport.width)));

  updateZoomLabel();
  await renderPdfPages();
}

async function changePdfZoom(delta) {
  if (!activePdfDoc) return;
  activePdfScale = clampPdfScale(activePdfScale + delta);
  showLoading();
  await renderPdfPages();
}

function touchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function openHtmlOverlay(title, html) {
  if (pdfTitle) pdfTitle.textContent = title || "Material";
  resetPdfViewer();
  showLoading();

  if (pdfFrame) {
    pdfFrame.style.display = "block";
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(html);
  }

  if (pdfViewer) pdfViewer.style.display = "none";
  if (pdfZoomControls) pdfZoomControls.style.display = "none";

  setTimeout(hideLoading, 250);

  pdfOverlay?.classList.add("show");
  pdfOverlay?.setAttribute("aria-hidden", "false");
  document.body.classList.add("pdfOpen");
}

async function openPdfOverlay(title, rawUrl) {
  if (pdfTitle) pdfTitle.textContent = title || "PDF";

  pdfOverlay?.classList.add("show");
  pdfOverlay?.setAttribute("aria-hidden", "false");
  document.body.classList.add("pdfOpen");
  resetPdfViewer();

  if (!rawUrl) {
    setPdfPlaceholder("Material não configurado", "Entre em contato com o personal.");
    return;
  }

  if (!navigator.onLine) {
    setPdfPlaceholder("Você está offline", "Conecte-se para abrir este material.");
    return;
  }

  try {
    await openPdfWithPdfJs(rawUrl);
  } catch (error) {
    console.error("Falha ao renderizar PDF dentro do app:", error);
    hideLoading();
    setPdfPlaceholder(
      "Não foi possível abrir o PDF dentro do app",
      error?.message || "Confira se o arquivo do Drive está liberado para qualquer pessoa com o link.",
      rawUrl
    );
  }
}

function closePdf() {
  pdfOverlay?.classList.remove("show");
  pdfOverlay?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("pdfOpen");
  hideLoading();
  resetPdfViewer();

  setTimeout(() => {
    if (pdfFrame) pdfFrame.src = "about:blank";
  }, 200);
}

pdfZoomIn?.addEventListener("click", () => changePdfZoom(0.15));
pdfZoomOut?.addEventListener("click", () => changePdfZoom(-0.15));

pdfViewer?.addEventListener("touchstart", (ev) => {
  if (ev.touches.length === 2 && activePdfDoc) {
    pinchStartDistance = touchDistance(ev.touches);
    pinchStartScale = activePdfScale;
    pinchLastScale = activePdfScale;
  }
}, { passive: false });

pdfViewer?.addEventListener("touchmove", (ev) => {
  if (ev.touches.length === 2 && pinchStartDistance && activePdfDoc) {
    ev.preventDefault();
    pinchLastScale = clampPdfScale(pinchStartScale * (touchDistance(ev.touches) / pinchStartDistance));
    updateZoomLabel(pinchLastScale);
  }
}, { passive: false });

pdfViewer?.addEventListener("touchend", () => {
  if (!pinchStartDistance || !activePdfDoc) return;
  const nextScale = pinchLastScale;
  pinchStartDistance = 0;

  if (Math.abs(nextScale - activePdfScale) > 0.04) {
    activePdfScale = nextScale;
    showLoading();
    renderPdfPages();
  } else {
    updateZoomLabel(activePdfScale);
  }
});

pdfViewer?.addEventListener("click", (ev) => {
  const btn = ev.target?.closest?.("[data-open-external]");
  if (!btn) return;
  ev.preventDefault();
  window.open(btn.dataset.openExternal, "_blank", "noopener,noreferrer");
});

studentVideoClose?.addEventListener("click", closeStudentVideo);
studentVideoModal?.addEventListener("click", (ev) => {
  if (ev.target === studentVideoModal) closeStudentVideo();
});

document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") closeStudentVideo();
});

document.addEventListener("click", (ev) => {
  const link = ev.target?.closest?.("a.videoBtn");
  if (!link) return;

  const href = normalizeExternalUrl(link.getAttribute("href") || "");
  if (!youtubeEmbedUrl(href)) return;

  ev.preventDefault();
  ev.stopPropagation();
  openStudentVideo(href);
});

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


pdfBack?.addEventListener("click", (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  closePdf();
});

logoutBtn?.addEventListener("click", () => {
  clearSession();
  window.location.href = "/pages/index.html";
});
