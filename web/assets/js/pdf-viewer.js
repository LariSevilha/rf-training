import { cleanLinkUrl, driveToDownload } from "./pdf.js";
import { getToken } from "./state.js";

const PDFJS_VERSION = "4.10.38";
const pdfjsLib = await import(`https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.mjs`);
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.mjs`;

const params = new URLSearchParams(window.location.search);
const srcFromParam = params.get("src") || "";
const title = params.get("title") || sessionStorage.getItem("rf_pdf_title") || "PDF";
const storedSrc = sessionStorage.getItem("rf_pdf_src") || "";
const rawSrc = cleanLinkUrl(srcFromParam || storedSrc);

const titleEl = document.getElementById("viewerTitle");
const stage = document.getElementById("viewerStage");
const pagesEl = document.getElementById("pdfPages");
const statusEl = document.getElementById("viewerStatus");
const zoomOut = document.getElementById("zoomOut");
const zoomIn = document.getElementById("zoomIn");
const zoomLabel = document.getElementById("zoomLabel");
const back = document.getElementById("viewerBack");

if (titleEl) titleEl.textContent = title;

const MIN_SCALE = 0.65;
const MAX_SCALE = 2.6;
const SCALE_STEP = 0.15;
let scale = 1;
let pdfDoc = null;
let rendering = false;
let renderAgain = false;

function setStatus(message, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.classList.toggle("hidden", !message);
  statusEl.classList.toggle("error", Boolean(isError));
}

function updateZoomLabel() {
  if (zoomLabel) zoomLabel.textContent = `${Math.round(scale * 100)}%`;
}

function clampScale(value) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(value) || 1));
}

function getProxyUrls(url) {
  const clean = driveToDownload(cleanLinkUrl(url));
  const query = `url=${encodeURIComponent(clean)}`;
  return Array.from(new Set([
    `/api/pdf-proxy?${query}`,
    `/pdf-proxy?${query}`,
  ]));
}

function getAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function isPdfBytes(bytes) {
  if (!bytes || bytes.byteLength < 5) return false;
  const head = new Uint8Array(bytes, 0, 5);
  return head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 && head[4] === 0x2d;
}

async function readErrorMessage(response) {
  try {
    const text = await response.text();
    if (!text) return "";
    try {
      return JSON.parse(text)?.message || text.slice(0, 180);
    } catch {
      return text.slice(0, 180);
    }
  } catch {
    return "";
  }
}

async function fetchPdfBytes() {
  const candidates = getProxyUrls(rawSrc);
  let lastError = null;

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "same-origin",
        cache: "no-store",
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new Error(message || `Servidor retornou HTTP ${response.status}.`);
      }

      const bytes = await response.arrayBuffer();
      if (!isPdfBytes(bytes)) {
        throw new Error("O arquivo recebido não é um PDF válido.");
      }

      return bytes;
    } catch (error) {
      lastError = error;
      console.warn("Falha ao carregar PDF por", url, error);
    }
  }

  throw lastError || new Error("Não foi possível carregar o PDF.");
}

function transformRect(rect, viewport) {
  const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(rect);
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x1 - x2);
  const height = Math.abs(y1 - y2);
  return { left, top, width, height };
}

function openExternalLink(url) {
  const clean = cleanLinkUrl(url);
  if (!clean) return;

  // Abrir fora do iframe impede que o Google/YouTube substitua a tela do app por uma página branca de redirecionamento.
  const opened = window.open(clean, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.top.location.href = clean;
  }
}

async function renderPage(pageNumber) {
  const page = await pdfDoc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const availableWidth = Math.max(240, (stage?.clientWidth || window.innerWidth) - 16);
  const fitScale = Math.max(0.35, Math.min(1.35, availableWidth / baseViewport.width));
  const viewport = page.getViewport({ scale: fitScale * scale });

  const pageWrap = document.createElement("section");
  pageWrap.className = "pdfPage";
  pageWrap.style.width = `${viewport.width}px`;
  pageWrap.style.height = `${viewport.height}px`;
  pageWrap.dataset.page = String(pageNumber);

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });
  const outputScale = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  await page.render({
    canvasContext: context,
    viewport,
    transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null,
  }).promise;

  pageWrap.appendChild(canvas);

  const linkLayer = document.createElement("div");
  linkLayer.className = "pdfLinkLayer";
  pageWrap.appendChild(linkLayer);

  const annotations = await page.getAnnotations({ intent: "display" });
  annotations
    .filter((annotation) => annotation?.subtype === "Link" && (annotation.url || annotation.unsafeUrl))
    .forEach((annotation) => {
      const target = cleanLinkUrl(annotation.url || annotation.unsafeUrl || "");
      if (!target || !annotation.rect) return;

      const rect = transformRect(annotation.rect, viewport);
      const a = document.createElement("a");
      a.href = target;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.title = "Abrir vídeo/link";
      a.style.left = `${rect.left}px`;
      a.style.top = `${rect.top}px`;
      a.style.width = `${Math.max(12, rect.width)}px`;
      a.style.height = `${Math.max(12, rect.height)}px`;
      a.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openExternalLink(target);
      });
      linkLayer.appendChild(a);
    });

  return pageWrap;
}

async function renderDocument() {
  if (!pdfDoc || rendering) {
    renderAgain = true;
    return;
  }

  rendering = true;
  renderAgain = false;
  updateZoomLabel();
  setStatus("Carregando páginas…");

  const currentScrollRatio = stage.scrollTop / Math.max(1, stage.scrollHeight - stage.clientHeight);
  const fragment = document.createDocumentFragment();

  try {
    for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber += 1) {
      fragment.appendChild(await renderPage(pageNumber));
    }

    pagesEl.replaceChildren(fragment);
    stage.scrollTop = currentScrollRatio * Math.max(1, stage.scrollHeight - stage.clientHeight);
    setStatus("");
  } finally {
    rendering = false;
    if (renderAgain) {
      renderDocument();
    }
  }
}

async function loadPdf() {
  if (!rawSrc) {
    setStatus("PDF não configurado.", true);
    return;
  }

  setStatus("Carregando PDF…");

  try {
    const pdfBytes = await fetchPdfBytes();
    const task = pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes) });
    pdfDoc = await task.promise;
    await renderDocument();
  } catch (error) {
    console.error(error);
    setStatus("Não foi possível carregar este PDF. Atualize os arquivos do servidor e confirme que o link do Treino é um PDF público/compartilhável.", true);
  }
}

function changeZoom(delta) {
  const next = clampScale(scale + delta);
  if (Math.abs(next - scale) < 0.001) return;
  scale = next;
  renderDocument();
}

zoomOut?.addEventListener("click", () => changeZoom(-SCALE_STEP));
zoomIn?.addEventListener("click", () => changeZoom(SCALE_STEP));

back?.addEventListener("click", () => {
  window.parent?.postMessage({ type: "RF_CLOSE_PDF_VIEWER" }, window.location.origin);
  if (window.parent === window) history.back();
});

let initialPinchDistance = 0;
let initialPinchScale = 1;
let pinchTimer = null;
let lastTouchY = 0;

function getDistance(touches) {
  const [a, b] = touches;
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

function preventDefaultIfPossible(event) {
  if (event.cancelable) event.preventDefault();
}

// Safari/iOS: impede zoom nativo da página e pull-to-refresh enquanto o viewer está aberto.
["gesturestart", "gesturechange", "gestureend"].forEach((name) => {
  document.addEventListener(name, preventDefaultIfPossible, { passive: false });
});

document.addEventListener("touchmove", (event) => {
  if (event.touches.length > 1) {
    preventDefaultIfPossible(event);
  }
}, { passive: false });

stage?.addEventListener("touchstart", (event) => {
  if (event.touches.length === 1) {
    lastTouchY = event.touches[0].clientY;
  }

  if (event.touches.length === 2) {
    initialPinchDistance = getDistance(event.touches);
    initialPinchScale = scale;
  }
}, { passive: false });

stage?.addEventListener("touchmove", (event) => {
  if (event.touches.length === 2 && initialPinchDistance > 0) {
    preventDefaultIfPossible(event);
    const next = clampScale(initialPinchScale * (getDistance(event.touches) / initialPinchDistance));
    if (Math.abs(next - scale) < 0.02) return;
    scale = next;
    updateZoomLabel();

    clearTimeout(pinchTimer);
    pinchTimer = setTimeout(() => renderDocument(), 120);
    return;
  }

  if (event.touches.length === 1) {
    const y = event.touches[0].clientY;
    const movingDown = y > lastTouchY;
    const movingUp = y < lastTouchY;
    const atTop = stage.scrollTop <= 0;
    const atBottom = stage.scrollTop + stage.clientHeight >= stage.scrollHeight - 1;

    if ((atTop && movingDown) || (atBottom && movingUp)) {
      preventDefaultIfPossible(event);
    }

    lastTouchY = y;
  }
}, { passive: false });

stage?.addEventListener("touchend", (event) => {
  if (event.touches.length < 2 && initialPinchDistance > 0) {
    initialPinchDistance = 0;
    clearTimeout(pinchTimer);
    renderDocument();
  }
}, { passive: false });

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type === "RF_SET_PDF_SCALE") {
    scale = clampScale(event.data.scale);
    renderDocument();
  }
});

loadPdf();
