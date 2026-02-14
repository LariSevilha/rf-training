// ✅ PWA: registra SW
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/service-worker.js");
    } catch (e) {
      console.warn("SW register falhou:", e);
    }
  });
}

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
const menuGrid = document.getElementById("menuGrid");

// PDF
const pdfOverlay = document.getElementById("pdfOverlay");
const pdfFrame = document.getElementById("pdfFrame");
const pdfBack = document.getElementById("pdfBack");
const pdfTitle = document.getElementById("pdfTitle");
const loadingLayer = document.getElementById("loadingLayer");

// Offline
const offlineMask = document.getElementById("offlineMask");
const offlineTryBtn = document.getElementById("offlineTryBtn");

// Install (Android)
const installBtn = document.getElementById("installBtn");
let deferredPrompt = null;

// links dos PDFs
const urls = { training: "", diet: "", supp: "", stretch: "" };

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

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent);
}
function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true
  );
}

// ====================
// OFFLINE UI
// ====================
function setOfflineUI() {
  const online = navigator.onLine;
  if (!offlineMask) return;
  offlineMask.classList.toggle("show", !online);
  offlineMask.setAttribute("aria-hidden", online ? "true" : "false");
}
window.addEventListener("online", setOfflineUI);
window.addEventListener("offline", setOfflineUI);
offlineTryBtn?.addEventListener("click", setOfflineUI);

// ====================
// Menu sem flash
// ====================
function lockMenu() {
  document.body.classList.remove("ready");
  menuGrid?.classList.add("menuLocked");
}
function unlockMenu() {
  document.body.classList.add("ready");
  menuGrid?.classList.remove("menuLocked");
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

// ====================
// PDF overlay
// ====================
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
  } else if (!navigator.onLine) {
    const html = placeholderHtml("Você está offline", "Conecte-se para abrir este PDF.");
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(html);
    setTimeout(hideLoading, 250);
  } else {
    const preview = driveToPreview(rawUrl);
    if (!preview) {
      const html = placeholderHtml("Link inválido", "Envie um link do Drive compatível.");
      pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(html);
      setTimeout(hideLoading, 250);
    } else {
      pdfFrame.src = preview;
    }
  }

  pdfOverlay?.classList.add("show");
  pdfOverlay?.setAttribute("aria-hidden", "false");
  document.body.classList.add("pdfOpen");
}

function closePdf() {
  pdfOverlay?.classList.remove("show");
  pdfOverlay?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("pdfOpen");
  hideLoading();
  setTimeout(() => { if (pdfFrame) pdfFrame.src = "about:blank"; }, 200);
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
// ANDROID INSTALL
// ====================
function hideInstallUI() { if (installBtn) installBtn.style.display = "none"; }
function showInstallUI() { if (installBtn) installBtn.style.display = "inline-flex"; }

if (installBtn) {
  hideInstallUI();

  if (!isAndroidDevice() || isStandaloneMode()) hideInstallUI();

  window.addEventListener("beforeinstallprompt", (e) => {
    if (!isAndroidDevice() || isStandaloneMode()) return;
    e.preventDefault();
    deferredPrompt = e;
    showInstallUI();
  });

  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => {});
    deferredPrompt = null;
    hideInstallUI();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    hideInstallUI();
  });
}

// ====================
// iOS modal (ÚNICO)
// ====================
(function iosInstallModalInit() {
  const modal = document.getElementById("iosInstallModal");
  if (!modal) return;

  if (!isIOSDevice() || isStandaloneMode()) return;

  const key = "rf_ios_install_hide_until";
  const hideUntil = Number(localStorage.getItem(key) || "0");
  if (hideUntil && Date.now() < hideUntil) return;

  const closeBtn = document.getElementById("iosInstallClose");
  const laterBtn = document.getElementById("iosLaterBtn");
  const okBtn = document.getElementById("iosOkBtn");
  const dontShowChk = document.getElementById("iosDontShowChk");

  function open() {
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }
  function close() {
    if (dontShowChk?.checked) {
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem(key, String(Date.now() + sevenDays));
    }
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }

  closeBtn?.addEventListener("click", close);
  laterBtn?.addEventListener("click", close);
  okBtn?.addEventListener("click", close);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  setTimeout(open, 700);
})();

// ====================
// Sync docs
// ====================
let session = null;

async function syncDocuments() {
  if (!session?.token) return;

  lockMenu();
  if (statusEl) statusEl.textContent = navigator.onLine ? "Sincronizando documentos…" : "Você está offline.";

  try {
    const docs = await apiDocuments(session.token);

    urls.training = (docs.training || "").trim();
    urls.diet = (docs.diet || "").trim();
    urls.supp = (docs.supp || "").trim();
    urls.stretch = (docs.stretch || "").trim();

    applyVisibility();

    if (statusEl) statusEl.textContent = "Toque em um item disponível para abrir.";
    clearMsg(err);
    setTimeout(() => clearMsg(ok), 1200);
  } catch {
    if (statusEl) statusEl.textContent = "Erro ao sincronizar";
  } finally {
    unlockMenu();
  }
}

// ====================
// INIT
// ====================
(async function init() {
  setOfflineUI();

  session = await requireAuth("student");
  if (!session) return;

  lockMenu();

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

  await syncDocuments().catch(() => {});
})();
