import { requireAuth } from "./guard.js";
import { apiDocuments, apiMe } from "./api.js";
import { clearSession } from "./state.js";
import { clearMsg } from "./ui.js";
import { driveToPreview, placeholderHtml } from "./pdf.js";

// ====================
// SERVICE WORKER
// ====================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/service-worker.js");
      console.log("SW registrado com sucesso");
    } catch (e) {
      console.warn("SW register falhou:", e);
    }
  });
}

// ====================
// ELEMENTS
// ====================
const logoutBtn = document.getElementById("logoutBtn");
const statusEl = document.getElementById("status");
const nameEl = document.getElementById("studentName");
const ok = document.getElementById("ok");
const err = document.getElementById("err");
const menuGrid = document.getElementById("menuGrid");

const pdfOverlay = document.getElementById("pdfOverlay");
const pdfFrame = document.getElementById("pdfFrame");
const pdfBack = document.getElementById("pdfBack");
const pdfTitle = document.getElementById("pdfTitle");
const loadingLayer = document.getElementById("loadingLayer");

const offlineMask = document.getElementById("offlineMask");
const offlineTryBtn = document.getElementById("offlineTryBtn");

const installBtn = document.getElementById("installBtn");

// ====================
// STATE
// ====================
let session = null;
let deferredPrompt = null;
let installPromptSeen = false;

const urls = {
  training: "",
  diet: "",
  supp: "",
  stretch: ""
};

// ====================
// HELPERS
// ====================
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

function showInstallButton() {
  if (installBtn) installBtn.style.display = "inline-flex";
}

function hideInstallButton() {
  if (installBtn) installBtn.style.display = "none";
}

function showAndroidManualInstall() {
  alert(
    "Para instalar no Android:\n\n" +
    "1) Abra este site no Chrome\n" +
    "2) Toque no menu ⋮\n" +
    "3) Toque em “Instalar app” ou “Adicionar à tela inicial”\n\n" +
    "Se a opção não aparecer, feche e abra o site novamente após alguns segundos."
  );
}

let fallbackTimer = null;

function showLoading() {
  loadingLayer?.classList.add("show");
  clearTimeout(fallbackTimer);
  fallbackTimer = setTimeout(() => {
    loadingLayer?.classList.remove("show");
  }, 12000);
}

function hideLoading() {
  loadingLayer?.classList.remove("show");
  clearTimeout(fallbackTimer);
  fallbackTimer = null;
}

pdfFrame?.addEventListener("load", hideLoading);

// ====================
// OFFLINE
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
// MENU
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
// PDF
// ====================
function openPdf(type) {
  const titles = {
    training: "TREINO",
    diet: "ALIMENTAÇÃO",
    supp: "SUPLEMENTAÇÃO",
    stretch: "ALONGAMENTOS E MOBILIDADE"
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

  setTimeout(() => {
    if (pdfFrame) pdfFrame.src = "about:blank";
  }, 200);
}

pdfBack?.addEventListener("click", closePdf);

document.querySelectorAll(".menuBtn").forEach((btn) => {
  btn.addEventListener("click", () => openPdf(btn.dataset.open));
});

// ====================
// LOGOUT
// ====================
logoutBtn?.addEventListener("click", () => {
  clearSession();
  window.location.href = "/pages/index.html";
});

// ====================
// INSTALL
// ====================
function setupInstallFlow() {
  if (!installBtn) return;

  hideInstallButton();

  // Android com fallback
  if (isAndroidDevice() && !isStandaloneMode()) {
    showInstallButton();
    installBtn.textContent = "Instalar app";
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    console.log("beforeinstallprompt capturado");
    event.preventDefault();

    deferredPrompt = event;
    installPromptSeen = true;

    if (isAndroidDevice() && !isStandaloneMode()) {
      installBtn.textContent = "Instalar app";
      showInstallButton();
    }
  });

  installBtn.addEventListener("click", async () => {
    if (isStandaloneMode()) {
      hideInstallButton();
      return;
    }

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        console.log("Resultado install:", choice?.outcome || "sem retorno");
      } catch (e) {
        console.warn("Falha ao abrir prompt:", e);
      } finally {
        deferredPrompt = null;
        if (!isStandaloneMode()) {
          showInstallButton();
        } else {
          hideInstallButton();
        }
      }
      return;
    }

    if (isAndroidDevice()) {
      showAndroidManualInstall();
      return;
    }

    if (isIOSDevice()) {
      const modal = document.getElementById("iosInstallModal");
      if (modal) {
        modal.classList.add("show");
        modal.setAttribute("aria-hidden", "false");
      }
    }
  });

  window.addEventListener("appinstalled", () => {
    console.log("App instalado");
    deferredPrompt = null;
    hideInstallButton();
  });

  // fallback: alguns Androids não disparam beforeinstallprompt na hora
  setTimeout(() => {
    if (isAndroidDevice() && !isStandaloneMode() && !installPromptSeen) {
      installBtn.textContent = "Instalar app";
      showInstallButton();
    }
  }, 2500);
}

setupInstallFlow();

// ====================
// iOS MODAL
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
// DATA
// ====================
async function syncDocuments() {
  if (!session?.token) return;

  lockMenu();

  if (statusEl) {
    statusEl.textContent = navigator.onLine
      ? "Sincronizando documentos…"
      : "Você está offline.";
  }

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