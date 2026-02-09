import { requireAuth } from "./guard.js";
import { apiDocuments, apiMe } from "./api.js";
import { clearSession } from "./state.js";
import { setMsg, clearMsg } from "./ui.js";
import { driveToPreview, placeholderHtml } from "./pdf.js";

// ===== Elements =====
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

// Install buttons
const installBtn = document.getElementById("installBtn");
const installHelpBtn = document.getElementById("installHelpBtn");

// links dos PDFs
const urls = { training: "", diet: "", supp: "", stretch: "" };

// Android install prompt
let deferredPrompt = null;

// ===== Service Worker register (ESSENCIAL pro Android) =====
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// ===== helpers =====
let fallbackTimer = null;
function showLoading() {
  loadingLayer?.classList.add("show");
  clearTimeout(fallbackTimer);
  fallbackTimer = setTimeout(() => loadingLayer?.classList.remove("show"), 12000);
}
function hideLoading() {
  loadingLayer?.classList.remove("show");
  clearTimeout(fallbackTimer);
  fallbackTimer = null;
}

pdfFrame?.addEventListener("load", hideLoading);

function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true
  );
}

function applyVisibility() {
  const buttons = Array.from(document.querySelectorAll(".menuBtn"));
  buttons.forEach((btn) => {
    const type = btn?.dataset?.open;
    if (!type) return;
    const hasLink = !!(urls[type] || "").trim();
    btn.style.display = hasLink ? "" : "none";
  });
}

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
    setTimeout(hideLoading, 250);

    pdfOverlay?.classList.add("show");
    pdfOverlay?.setAttribute("aria-hidden", "false");
    return;
  }

  const preview = driveToPreview(rawUrl);

  if (!preview) {
    const html = placeholderHtml("Link inválido", "Envie um link do Drive compatível.");
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(html);
    setTimeout(hideLoading, 250);
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
  }, 200);
}

pdfBack?.addEventListener("click", closePdf);

document.querySelectorAll(".menuBtn").forEach((btn) => {
  btn.addEventListener("click", () => openPdf(btn.dataset.open));
});

logoutBtn?.addEventListener("click", () => {
  clearSession();
  window.location.href = "/pages/index.html";
});

// ====================
//     INSTALAÇÃO PWA
// ====================

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  if (!isInstalled() && installBtn) {
    installBtn.style.display = "inline-flex";
  }
});

installBtn?.addEventListener("click", async () => {
  clearMsg(ok);
  clearMsg(err);

  if (!deferredPrompt) {
    setMsg(err, "No Android: abra o menu (⋮) do Chrome e toque em “Adicionar à tela inicial”.", "error");
    return;
  }

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === "accepted") {
    setMsg(ok, "RF App adicionado! Abra pelo ícone na tela inicial.", "ok");
  } else {
    setMsg(err, "Instalação cancelada.", "error");
  }

  deferredPrompt = null;
  if (installBtn) installBtn.style.display = "none";
});

window.addEventListener("appinstalled", () => {
  setMsg(ok, "RF App instalado com sucesso! 🎉", "ok");
  if (installBtn) installBtn.style.display = "none";
  if (installHelpBtn) installHelpBtn.style.display = "none";
  deferredPrompt = null;
});

if (isIOS && !isInstalled() && installHelpBtn) {
  installHelpBtn.style.display = "inline-flex";
  installHelpBtn.addEventListener("click", () => {
    alert(
`Para adicionar o RF App no iPhone:
1) Abra no Safari
2) Toque em Compartilhar (quadrado com seta)
3) “Adicionar à Tela de Início”
4) Toque em “Adicionar”
Depois disso o app abre em tela cheia.`
    );
  });
}

// ====================
//        INIT
// ====================
(async function init() {
  const session = await requireAuth("student");
  if (!session) return;

  if (statusEl) statusEl.textContent = "Carregando seus documentos…";

  // Nome do aluno
  let displayName = (session?.user?.name || "").trim();
  if (!displayName) {
    try {
      const me = await apiMe(session.token);
      displayName = (me?.user?.name || "").trim();
    } catch {}
  }
  if (!displayName) displayName = "Aluno";
  if (nameEl) nameEl.textContent = displayName;

  // Docs
  try {
    const docs = await apiDocuments(session.token);
    urls.training = (docs.training || "").trim();
    urls.diet = (docs.diet || "").trim();
    urls.supp = (docs.supp || "").trim();
    urls.stretch = (docs.stretch || "").trim();

    applyVisibility();

    if (statusEl) statusEl.textContent = "Toque em um item disponível para abrir.";
    setMsg(ok, "Pronto ✅", "ok");
    setTimeout(() => clearMsg(ok), 1400);
  } catch (e) {
    if (statusEl) statusEl.textContent = "Erro ao carregar documentos ❌";
    setMsg(err, e?.message || "Erro ao carregar.", "error");
  }

  // já instalado? esconde botões
  if (isInstalled()) {
    if (installBtn) installBtn.style.display = "none";
    if (installHelpBtn) installHelpBtn.style.display = "none";
  }
})();
