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

function openHtmlOverlay(title, html) {
  if (pdfTitle) pdfTitle.textContent = title || "Material";
  showLoading();
  installPdfSafeGestures();
  resetPdfVisualZoom();
  lastPdfFrameUrl = "";

  if (pdfFrame) {
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(html);
  }

  setTimeout(hideLoading, 250);

  pdfOverlay?.classList.add("show");
  pdfOverlay?.setAttribute("aria-hidden", "false");
  document.body.classList.add("pdfOpen");
}


// PDF interno no app: zoom visual seguro + recuperação ao voltar do YouTube/Drive.
// O PDF do Drive continua dentro do app, mas o zoom do iOS é feito pelo shell
// da aplicação para evitar que o WebKit re-renderize canvas gigante no iframe.
const PDF_VISUAL_ZOOM_MIN = 1;
const PDF_VISUAL_ZOOM_MAX = 2.75;
const PDF_VISUAL_ZOOM_STEP = 0.25;
let pdfVisualZoom = 1;
let lastPdfFrameUrl = "";
let pdfPinchStartDistance = 0;
let pdfPinchStartZoom = 1;
let pdfGestureStartZoom = 1;
let pdfGestureAnchorClientX = 0;
let pdfGestureAnchorClientY = 0;
let pdfGestureActive = false;
let pdfWasHiddenWhileOpen = false;
let pdfRestoreTimer = 0;
let pdfVisualPanX = 0;
let pdfTouchPanActive = false;
let pdfTouchPanLocked = false;
let pdfTouchPanStartX = 0;
let pdfTouchPanStartY = 0;
let pdfTouchPanStartPanX = 0;
let pdfTouchPanPointerId = null;
let pdfTouchPanPassthroughTimer = 0;
const pdfZoomControls = document.getElementById("pdfZoomControls");
const pdfTouchPanLayer = document.getElementById("pdfTouchPanLayer");

function clampPdfZoom(value) {
  const n = Number(value) || 1;
  return Math.max(PDF_VISUAL_ZOOM_MIN, Math.min(PDF_VISUAL_ZOOM_MAX, n));
}

function getPdfBaseWidth() {
  const wrap = pdfFrameWrap;
  if (!wrap) return 0;
  const rect = wrap.getBoundingClientRect();
  return Math.max(1, Math.floor(rect.width || wrap.clientWidth || 1));
}

function getPdfBaseHeight() {
  const wrap = pdfFrameWrap;
  if (!wrap) return 0;
  const rect = wrap.getBoundingClientRect();
  return Math.max(1, Math.floor(rect.height || wrap.clientHeight || 1));
}

function getPdfMaxPanX() {
  const baseWidth = getPdfBaseWidth();
  return Math.max(0, Math.ceil(baseWidth * pdfVisualZoom - baseWidth));
}

function clampPdfPanX(value) {
  const max = getPdfMaxPanX();
  const n = Number(value) || 0;
  return Math.max(0, Math.min(max, n));
}

function updatePdfZoomLabel() {
  const zoomed = pdfVisualZoom > PDF_VISUAL_ZOOM_MIN + 0.001;
  const maxPanX = getPdfMaxPanX();

  pdfVisualPanX = zoomed ? clampPdfPanX(pdfVisualPanX) : 0;

  if (pdfZoomLabel) {
    pdfZoomLabel.textContent = `${Math.round(pdfVisualZoom * 100)}%`;
    pdfZoomLabel.title = zoomed ? "Toque para voltar para 100%" : "Zoom em 100%";
  }

  if (pdfZoomOut) pdfZoomOut.disabled = pdfVisualZoom <= PDF_VISUAL_ZOOM_MIN + 0.001;
  if (pdfZoomIn) pdfZoomIn.disabled = pdfVisualZoom >= PDF_VISUAL_ZOOM_MAX - 0.001;

  const panEnabled = zoomed && maxPanX > 1;

  if (pdfTouchPanLayer) {
    pdfTouchPanLayer.classList.toggle("isEnabled", panEnabled);
    pdfTouchPanLayer.setAttribute("aria-hidden", panEnabled ? "false" : "true");
    pdfTouchPanLayer.title = panEnabled
      ? "Arraste o PDF com o dedo; use dois dedos para aproximar/afastar"
      : "Use dois dedos para aproximar o PDF";
  }

  pdfOverlay?.classList.toggle("pdfZoomed", zoomed);
  pdfFrameWrap?.classList.toggle("pdfZoomed", zoomed);
  pdfFrameScale?.classList.toggle("pdfZoomed", zoomed);

  if (pdfFrame) {
    // V13: quando o PDF está ampliado, uma camada transparente do app recebe
    // o arraste horizontal com o dedo. Em 100%, o iframe fica totalmente livre
    // para rolagem e cliques dos vídeos.
    pdfFrame.style.pointerEvents = "auto";
  }
}

function updatePdfVisualTransform() {
  if (!pdfFrameWrap || !pdfFrameScale || !pdfFrame) {
    updatePdfZoomLabel();
    return;
  }

  const baseWidth = getPdfBaseWidth();
  const baseHeight = getPdfBaseHeight();

  pdfVisualPanX = clampPdfPanX(pdfVisualPanX);

  pdfFrameScale.style.width = `${baseWidth}px`;
  pdfFrameScale.style.height = `${baseHeight}px`;

  pdfFrame.style.width = `${baseWidth}px`;
  pdfFrame.style.height = `${baseHeight}px`;
  pdfFrame.style.transform = `matrix(${pdfVisualZoom}, 0, 0, ${pdfVisualZoom}, ${-pdfVisualPanX}, 0)`;
  pdfFrame.style.transformOrigin = "0 0";

  updatePdfZoomLabel();
}

function normalizePdfZoomOptions(options) {
  if (!options) return { anchor: false };
  if (options === true) return { anchor: "center" };
  if (typeof options === "object") return options;
  return { anchor: false };
}

function getPdfZoomAnchor(wrap, options) {
  const rect = wrap.getBoundingClientRect();

  if (options.anchor && typeof options.clientX === "number" && typeof options.clientY === "number") {
    return {
      x: Math.max(0, Math.min(wrap.clientWidth, options.clientX - rect.left)),
      y: Math.max(0, Math.min(wrap.clientHeight, options.clientY - rect.top))
    };
  }

  if (options.anchor === "center" || options.anchor === true) {
    return { x: wrap.clientWidth / 2, y: wrap.clientHeight / 2 };
  }

  return null;
}

function applyPdfVisualZoom(nextZoom, options = false) {
  const next = clampPdfZoom(nextZoom);
  const previous = pdfVisualZoom || 1;
  const wrap = pdfFrameWrap;
  const zoomOptions = normalizePdfZoomOptions(options);

  if (!wrap || !pdfFrameScale || !pdfFrame) {
    pdfVisualZoom = next;
    if (next <= PDF_VISUAL_ZOOM_MIN + 0.001) pdfVisualPanX = 0;
    updatePdfZoomLabel();
    return;
  }

  const anchor = getPdfZoomAnchor(wrap, zoomOptions);
  let relX = 0;

  if (anchor) {
    relX = (pdfVisualPanX + anchor.x) / previous;
  }

  pdfVisualZoom = next;

  if (pdfVisualZoom <= PDF_VISUAL_ZOOM_MIN + 0.001) {
    pdfVisualPanX = 0;
  } else if (anchor) {
    pdfVisualPanX = relX * pdfVisualZoom - anchor.x;
  }

  updatePdfVisualTransform();
}

function setPdfVisualPanX(nextPanX) {
  pdfVisualPanX = clampPdfPanX(nextPanX);
  updatePdfVisualTransform();
}

function canDragPdfPan() {
  return pdfVisualZoom > PDF_VISUAL_ZOOM_MIN + 0.001 && getPdfMaxPanX() > 1;
}

function temporarilyPassPdfTouchLayer(ms = 700) {
  if (!pdfTouchPanLayer) return;

  pdfTouchPanLayer.classList.add("isPassthrough");
  clearTimeout(pdfTouchPanPassthroughTimer);
  pdfTouchPanPassthroughTimer = window.setTimeout(() => {
    pdfTouchPanLayer.classList.remove("isPassthrough");
    updatePdfZoomLabel();
  }, ms);
}

function beginPdfTouchPan(clientX, clientY, pointerId = null) {
  if (!canDragPdfPan()) {
    temporarilyPassPdfTouchLayer(500);
    return false;
  }

  pdfTouchPanActive = true;
  pdfTouchPanLocked = false;
  pdfTouchPanStartX = Number(clientX) || 0;
  pdfTouchPanStartY = Number(clientY) || 0;
  pdfTouchPanStartPanX = pdfVisualPanX;
  pdfTouchPanPointerId = pointerId;
  pdfTouchPanLayer?.classList.add("isTouching");
  return true;
}

function movePdfTouchPan(clientX, clientY) {
  if (!pdfTouchPanActive) return false;

  const currentX = Number(clientX) || pdfTouchPanStartX;
  const currentY = Number(clientY) || pdfTouchPanStartY;
  const rawDeltaX = currentX - pdfTouchPanStartX;
  const rawDeltaY = currentY - pdfTouchPanStartY;
  const absX = Math.abs(rawDeltaX);
  const absY = Math.abs(rawDeltaY);

  if (!pdfTouchPanLocked) {
    if (absX < 7 && absY < 7) return false;

    // Se o gesto for vertical, libera rapidamente a camada para o Drive receber
    // a rolagem/página no próximo toque, em vez de prender a tela.
    if (absY > absX * 1.15) {
      endPdfTouchPan(false);
      temporarilyPassPdfTouchLayer(650);
      return false;
    }

    pdfTouchPanLocked = true;
    pdfTouchPanLayer?.classList.add("isPanning");
    pdfZoomControls?.classList.add("isPanning");
  }

  // Mesma sensação de rolagem nativa: arrastar para a esquerda mostra a parte direita.
  const deltaX = pdfTouchPanStartX - currentX;
  setPdfVisualPanX(pdfTouchPanStartPanX + deltaX);
  return true;
}

function endPdfTouchPan(allowTapPassthrough = true) {
  if (!pdfTouchPanActive) return;

  const wasLocked = pdfTouchPanLocked;
  pdfTouchPanActive = false;
  pdfTouchPanLocked = false;
  pdfTouchPanPointerId = null;
  pdfTouchPanLayer?.classList.remove("isTouching", "isPanning");
  pdfZoomControls?.classList.remove("isPanning");

  if (!wasLocked && allowTapPassthrough) {
    // Um toque curto acima do PDF não abre link porque a camada estava por cima.
    // Liberamos por um instante para o próximo toque ir direto ao Drive/YouTube.
    temporarilyPassPdfTouchLayer(900);
  }
}

function resetPdfVisualZoom() {
  pdfVisualZoom = 1;
  pdfVisualPanX = 0;
  requestAnimationFrame(() => applyPdfVisualZoom(1, false));
}

function touchDistance(touches) {
  if (!touches || touches.length < 2) return 0;
  const a = touches[0];
  const b = touches[1];
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function touchCenter(touches) {
  if (!touches || touches.length < 2) return null;
  const a = touches[0];
  const b = touches[1];
  return {
    clientX: (a.clientX + b.clientX) / 2,
    clientY: (a.clientY + b.clientY) / 2
  };
}

function getPdfGestureAnchorFromEvent(ev) {
  const rect = pdfFrameWrap?.getBoundingClientRect?.();
  const fallback = rect
    ? { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }
    : { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 };

  const clientX = Number.isFinite(ev?.clientX) && ev.clientX > 0 ? ev.clientX : fallback.clientX;
  const clientY = Number.isFinite(ev?.clientY) && ev.clientY > 0 ? ev.clientY : fallback.clientY;

  return { clientX, clientY };
}

function beginPdfGestureZoom(ev) {
  if (!pdfOverlay?.classList.contains("show")) return false;
  if (!pdfFrameWrap) return false;

  ev?.preventDefault?.();
  ev?.stopPropagation?.();

  const anchor = getPdfGestureAnchorFromEvent(ev);
  pdfGestureStartZoom = pdfVisualZoom || 1;
  pdfGestureAnchorClientX = anchor.clientX;
  pdfGestureAnchorClientY = anchor.clientY;
  pdfGestureActive = true;
  pdfOverlay?.classList.add("pdfPinching");
  pdfTouchPanLayer?.classList.add("isPassthrough");
  return true;
}

function movePdfGestureZoom(ev) {
  if (!pdfGestureActive) return false;

  ev?.preventDefault?.();
  ev?.stopPropagation?.();

  const scale = Number(ev?.scale) || 1;
  applyPdfVisualZoom(pdfGestureStartZoom * scale, {
    anchor: true,
    clientX: pdfGestureAnchorClientX,
    clientY: pdfGestureAnchorClientY
  });
  return true;
}

function endPdfGestureZoom(ev) {
  if (!pdfGestureActive) return false;

  ev?.preventDefault?.();
  ev?.stopPropagation?.();

  pdfGestureActive = false;
  pdfGestureStartZoom = pdfVisualZoom || 1;
  pdfOverlay?.classList.remove("pdfPinching");
  pdfTouchPanLayer?.classList.remove("isPassthrough");
  updatePdfZoomLabel();
  return true;
}

function installPdfSafeGestures() {
  if (!pdfFrameWrap || pdfFrameWrap.dataset.safeGestures === "1") return;
  pdfFrameWrap.dataset.safeGestures = "1";

  const preventTwoFinger = (ev) => {
    if (!ev.touches || ev.touches.length < 2) return false;
    ev.preventDefault();
    ev.stopPropagation();
    return true;
  };

  pdfFrameWrap.addEventListener("touchstart", (ev) => {
    if (!preventTwoFinger(ev)) return;
    const center = touchCenter(ev.touches);
    pdfPinchStartDistance = touchDistance(ev.touches) || 1;
    pdfPinchStartZoom = pdfVisualZoom;
    pdfGestureAnchorClientX = center?.clientX || window.innerWidth / 2;
    pdfGestureAnchorClientY = center?.clientY || window.innerHeight / 2;
    pdfOverlay?.classList.add("pdfPinching");
    endPdfTouchPan(false);
  }, { passive: false, capture: true });

  pdfFrameWrap.addEventListener("touchmove", (ev) => {
    if (!preventTwoFinger(ev)) return;
    const distance = touchDistance(ev.touches) || pdfPinchStartDistance || 1;
    const ratio = distance / (pdfPinchStartDistance || distance || 1);
    const center = touchCenter(ev.touches);
    applyPdfVisualZoom(pdfPinchStartZoom * ratio, {
      anchor: true,
      clientX: center?.clientX || pdfGestureAnchorClientX,
      clientY: center?.clientY || pdfGestureAnchorClientY
    });
  }, { passive: false, capture: true });

  pdfFrameWrap.addEventListener("touchend", () => {
    pdfPinchStartDistance = 0;
    pdfPinchStartZoom = pdfVisualZoom;
    pdfOverlay?.classList.remove("pdfPinching");
    updatePdfZoomLabel();
  }, { passive: true, capture: true });

  // V14/iOS: captura o gesto nativo de pinça do Safari/PWA sem precisar de botão.
  // Isso é o que permite pinçar diretamente sobre o PDF/iframe do Drive quando
  // o navegador envia o gesto para a página principal.
  const gestureTargets = [pdfFrameWrap, pdfOverlay, window].filter(Boolean);
  gestureTargets.forEach((target) => {
    target.addEventListener("gesturestart", beginPdfGestureZoom, { passive: false, capture: true });
    target.addEventListener("gesturechange", movePdfGestureZoom, { passive: false, capture: true });
    target.addEventListener("gestureend", endPdfGestureZoom, { passive: false, capture: true });
  });
}

function shouldRestorePdfFrame(src) {
  const value = String(src || "").trim();
  if (!value || value === "about:blank") return true;
  return /(^|\.)google\.com\/(url|search|sorry|amp)|youtube\.com|youtu\.be|accounts\.google\.com/i.test(value);
}

function forceRestorePdfFrame(reason = "return") {
  if (!pdfOverlay?.classList.contains("show")) return;
  if (!pdfFrame || !lastPdfFrameUrl) return;

  const original = lastPdfFrameUrl;
  pdfWasHiddenWhileOpen = false;
  showLoading();

  // iOS/Drive: quando o vídeo externo volta, o iframe pode ficar preso em
  // google.com/url, youtube.com ou about:blank sem atualizar o atributo src.
  // Por isso a restauração precisa ser FORÇADA, zerando antes de recolocar o PDF.
  pdfFrame.src = "about:blank";

  window.setTimeout(() => {
    if (!pdfOverlay?.classList.contains("show")) return;
    if (lastPdfFrameUrl !== original) return;
    pdfFrame.src = original;
    window.setTimeout(hideLoading, 1800);
    console.log(`PDF restaurado após ${reason}.`);
  }, 80);
}

function restorePdfFrameIfNeeded(force = false, reason = "check") {
  if (!pdfOverlay?.classList.contains("show")) return;
  if (!pdfFrame || !lastPdfFrameUrl) return;

  if (force) {
    forceRestorePdfFrame(reason);
    return;
  }

  const current = pdfFrame.getAttribute("src") || pdfFrame.src || "";
  if (!shouldRestorePdfFrame(current)) return;

  forceRestorePdfFrame(reason);
}

function schedulePdfRestore(force = false, reason = "return") {
  clearTimeout(pdfRestoreTimer);
  pdfRestoreTimer = window.setTimeout(() => restorePdfFrameIfNeeded(force, reason), 300);
}

pdfZoomOut?.addEventListener("click", (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  applyPdfVisualZoom(pdfVisualZoom - PDF_VISUAL_ZOOM_STEP, { anchor: "center" });
});

pdfZoomIn?.addEventListener("click", (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  applyPdfVisualZoom(pdfVisualZoom + PDF_VISUAL_ZOOM_STEP, { anchor: "center" });
});

if (window.PointerEvent && pdfTouchPanLayer) {
  pdfTouchPanLayer.addEventListener("pointerdown", (ev) => {
    if (!beginPdfTouchPan(ev.clientX, ev.clientY, ev.pointerId)) return;
    try {
      pdfTouchPanLayer.setPointerCapture(ev.pointerId);
    } catch {}
  });

  pdfTouchPanLayer.addEventListener("pointermove", (ev) => {
    if (!pdfTouchPanActive || pdfTouchPanPointerId !== ev.pointerId) return;
    const handled = movePdfTouchPan(ev.clientX, ev.clientY);
    if (handled) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  });

  ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
    pdfTouchPanLayer.addEventListener(eventName, (ev) => {
      if (pdfTouchPanPointerId !== null && ev.pointerId !== pdfTouchPanPointerId) return;
      endPdfTouchPan(true);
    });
  });
} else if (pdfTouchPanLayer) {
  pdfTouchPanLayer.addEventListener("touchstart", (ev) => {
    if (ev.touches?.length !== 1) return;
    const touch = ev.touches[0];
    beginPdfTouchPan(touch.clientX, touch.clientY);
  }, { passive: true });

  pdfTouchPanLayer.addEventListener("touchmove", (ev) => {
    if (ev.touches?.length !== 1 || !pdfTouchPanActive) return;
    const touch = ev.touches[0];
    const handled = movePdfTouchPan(touch.clientX, touch.clientY);
    if (handled) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  }, { passive: false });

  ["touchend", "touchcancel"].forEach((eventName) => {
    pdfTouchPanLayer.addEventListener(eventName, () => endPdfTouchPan(true), { passive: true });
  });
}

pdfZoomLabel?.addEventListener("click", (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  applyPdfVisualZoom(1, { anchor: "center" });
});

window.addEventListener("resize", () => {
  if (pdfOverlay?.classList.contains("show")) {
    requestAnimationFrame(() => applyPdfVisualZoom(pdfVisualZoom, { anchor: "center" }));
  }
});

window.addEventListener("pageshow", () => {
  if (pdfWasHiddenWhileOpen) schedulePdfRestore(true, "pageshow");
});

window.addEventListener("focus", () => {
  if (pdfWasHiddenWhileOpen) schedulePdfRestore(true, "focus");
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden" && pdfOverlay?.classList.contains("show")) {
    pdfWasHiddenWhileOpen = true;
    return;
  }

  if (document.visibilityState === "visible" && pdfWasHiddenWhileOpen) {
    schedulePdfRestore(true, "visibilitychange");
  }
});

function openPdfOverlay(title, rawUrl) {
  if (pdfTitle) pdfTitle.textContent = title || "PDF";
  showLoading();
  installPdfSafeGestures();
  resetPdfVisualZoom();
  lastPdfFrameUrl = "";
  pdfWasHiddenWhileOpen = false;
  clearTimeout(pdfRestoreTimer);

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
      lastPdfFrameUrl = preview;
      pdfFrame.src = preview;
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
  pdfWasHiddenWhileOpen = false;
  clearTimeout(pdfRestoreTimer);
  clearTimeout(pdfTouchPanPassthroughTimer);
  pdfTouchPanLayer?.classList.remove("isPassthrough", "isTouching", "isPanning");

  setTimeout(() => {
    if (pdfFrame) pdfFrame.src = "about:blank";
    lastPdfFrameUrl = "";
    resetPdfVisualZoom();
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
