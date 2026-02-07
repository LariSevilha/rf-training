import { requireAuth } from "./guard.js";
import { apiDocuments, apiMe } from "./api.js";
import { clearSession } from "./state.js";
import { setMsg, clearMsg } from "./ui.js";
import { driveToPreview, placeholderHtml } from "./pdf.js";

const logoutBtn = document.getElementById("logoutBtn");
const statusEl = document.getElementById("status");
const nameEl = document.getElementById("studentName");
const ok = document.getElementById("ok");
const err = document.getElementById("err");

// PDF elements
const pdfOverlay = document.getElementById("pdfOverlay");
const pdfFrame = document.getElementById("pdfFrame");
const pdfBack = document.getElementById("pdfBack");
const pdfTitle = document.getElementById("pdfTitle");
const loadingLayer = document.getElementById("loadingLayer");

// links
const urls = { training: "", diet: "", supp: "", stretch: "" };

// loading helpers
let fallbackTimer = null;
function showLoading() {
  loadingLayer?.classList.add("show");
  clearTimeout(fallbackTimer);
  fallbackTimer = setTimeout(() => loadingLayer?.classList.remove("show"), 10000);
}
function hideLoading() {
  loadingLayer?.classList.remove("show");
  clearTimeout(fallbackTimer);
  fallbackTimer = null;
}

pdfFrame?.addEventListener("load", hideLoading);

// esconde botões sem link
function applyVisibility() {
  const buttons = Array.from(document.querySelectorAll(".menuBtn"));
  let available = 0;

  buttons.forEach((btn) => {
    const type = btn?.dataset?.open;
    if (!type) return;

    const hasLink = !!(urls[type] || "").trim();
    btn.style.display = hasLink ? "" : "none";
    if (hasLink) available++;
  });

  
}

// abrir PDF
function openPdf(type) {
  const titles = {
    training: "TREINO",
    diet: "ALIMENTAÇÃO",
    supp: "SUPLEMENTAÇÃO",
    stretch: "ALONGAMENTOS E MOBILIDADE",
  };

  if (pdfTitle) pdfTitle.textContent = titles[type] || "PDF";
  showLoading();

  const rawUrl = (urls[type] || "").trim();

  if (!rawUrl) {
    const html = placeholderHtml("PDF não configurado", "Entre em contato com o personal.");
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(html);
    setTimeout(hideLoading, 300);

    pdfOverlay?.classList.add("show");
    pdfOverlay?.setAttribute("aria-hidden", "false");
    return;
  }

  const preview = driveToPreview(rawUrl);

  if (!preview) {
    const html = placeholderHtml("Link inválido ou não suportado", "Envie o link do Drive no formato correto.");
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(html);
    setTimeout(hideLoading, 300);
  } else {
    pdfFrame.src = preview;
  }

  pdfOverlay?.classList.add("show");
  pdfOverlay?.setAttribute("aria-hidden", "false");
}

function closePdf() {
  pdfOverlay?.classList.remove("show");
  pdfOverlay?.setAttribute("aria-hidden", "true");
  hideLoading();
  setTimeout(() => {
    if (pdfFrame) pdfFrame.src = "about:blank";
  }, 220);
}

pdfBack?.addEventListener("click", closePdf);

// clique nos itens
document.querySelectorAll(".menuBtn").forEach((btn) => {
  btn.addEventListener("click", () => openPdf(btn.dataset.open));
});

// logout
logoutBtn?.addEventListener("click", () => {
  clearSession();
  window.location.href = "/pages/index.html";
});

// init
(async function init() {
  const session = await requireAuth("student");
  if (!session) return;

  // 1) tenta usar name vindo do login
  let displayName = (session?.user?.name || "").trim();

  // 2) fallback: busca /me se name não veio
  if (!displayName) {
    try {
      const me = await apiMe(session.token);
      displayName = (me?.user?.name || "").trim();
    } catch {}
  }

  // 3) fallback final: “Aluno”
  if (!displayName) displayName = "Aluno";

  if (nameEl) nameEl.textContent = displayName;

  try {
    const docs = await apiDocuments(session.token);

    urls.training = (docs.training || "").trim();
    urls.diet = (docs.diet || "").trim();
    urls.supp = (docs.supp || "").trim();
    urls.stretch = (docs.stretch || "").trim();

    applyVisibility();

    if (ok) {
      setMsg(ok, "Toque em um item disponível para abrir.", "ok");
      setTimeout(() => clearMsg(ok), 1200);
    }
  } catch (e) {
    if (statusEl) statusEl.textContent = "Erro ao carregar documentos ❌";
    if (err) setMsg(err, e.message || "Erro ao carregar.", "error");
  }
})();
