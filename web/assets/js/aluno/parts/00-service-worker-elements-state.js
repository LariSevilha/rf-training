// Service worker, elementos, estado e utilitários básicos
// Dependências importadas pelo arquivo principal: ../aluno.js

if ("serviceWorker" in navigator) {
  let refreshing = false;

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/service-worker.js", {
        updateViaCache: "none"
      });

      await reg.update();

      if (reg.waiting) {
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;

        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            newWorker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    } catch (e) {
      console.warn("SW register falhou:", e);
    }
  });

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    // Não force recarregamento automático aqui.
    // Em PWA/mobile, especialmente ao voltar do YouTube ou de outro app externo,
    // esse reload pode deixar a área do aluno em tela branca. A nova versão do
    // service worker passa a valer naturalmente no próximo carregamento completo.
    if (refreshing) return;
    refreshing = true;
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "APP_UPDATED") {
      console.log("App atualizado:", event.data.version);
    }
  });
}

const logoutBtn = document.getElementById("logoutBtn");
const statusEl = document.getElementById("status");
const nameEl = document.getElementById("studentName");
const menuGrid = document.getElementById("menuGrid");
const docsEmpty = document.getElementById("docsEmpty");
const studentMessage = document.getElementById("studentMessage");
const refreshStudentBtn = document.getElementById("refreshStudentBtn");

const pdfOverlay = document.getElementById("pdfOverlay");
const pdfFrame = document.getElementById("pdfFrame");
const pdfBack = document.getElementById("pdfBack");
const pdfTitle = document.getElementById("pdfTitle");
const loadingLayer = document.getElementById("loadingLayer");

const offlineMask = document.getElementById("offlineMask");
const offlineTryBtn = document.getElementById("offlineTryBtn");
const installBtn = document.getElementById("installBtn");

const workoutTabs = document.getElementById("workoutTabs");
const workoutArea = document.getElementById("workoutArea");
const workoutsEmpty = document.getElementById("workoutsEmpty");
const alunoTabs = document.getElementById("alunoTabs");
const documentsPanel = document.getElementById("panel-documents");
const manualPanel = document.getElementById("panel-manual");
const backHomeBtn = document.getElementById("backHomeBtn");

let session = null;
let deferredPrompt = null;
let installPromptSeen = false;
let fallbackTimer = null;

let workouts = [];
let extraItems = [];
let activeWorkoutIndex = 0;
let workoutHistory = [];
let historyOpen = false;

const urls = {
  training: "",
  diet: "",
  supp: "",
  exams: "",
  stretch: "",
};

const cardioWritten = {
  name: "",
  time: "",
  intensity: "",
  days: "",
};

const extraUrls = {};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(type, title, text = "") {
  if (!studentMessage) return;

  studentMessage.className = `studentMessage ${type || "info"}`;
  studentMessage.innerHTML = `<b>${escapeHtml(title)}</b>${text ? `<span>${escapeHtml(text)}</span>` : ""}`;
  studentMessage.style.display = "flex";
}

function hideMessage(delay = 0) {
  if (!studentMessage) return;

  window.setTimeout(() => {
    studentMessage.style.display = "none";
    studentMessage.innerHTML = "";
  }, delay);
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent);
}

function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true;
}

function showInstallButton() {
  if (installBtn) installBtn.style.display = "inline-flex";
}

function hideInstallButton() {
  if (installBtn) installBtn.style.display = "none";
}

function showAndroidManualInstall() {
  alert("Para instalar no Android:\n\n1) Abra este site no Chrome\n2) Toque no menu ⋮\n3) Toque em ‘Instalar app’ ou ‘Adicionar à tela inicial’.");
}


function isExternalHttpUrl(rawUrl) {
  try {
    const url = new URL(String(rawUrl || "").trim(), window.location.href);
    return ["http:", "https:"].includes(url.protocol) && url.origin !== window.location.origin;
  } catch {
    return false;
  }
}

function isYouTubeUrl(rawUrl) {
  try {
    const host = new URL(String(rawUrl || "").trim(), window.location.href).hostname.replace(/^www\./, "");
    return host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be";
  } catch {
    return false;
  }
}

function saveStudentReturnState(extra = {}) {
  try {
    sessionStorage.setItem("rfStudentReturnState", JSON.stringify({
      tab: document.body.classList.contains("studentManualMode") ? "manual" : "documents",
      activeWorkoutIndex: Number(activeWorkoutIndex || 0),
      scrollY: window.scrollY || 0,
      savedAt: Date.now(),
      ...extra,
    }));
  } catch {}
}

function getStudentReturnState() {
  try {
    const raw = sessionStorage.getItem("rfStudentReturnState");
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!state?.savedAt || Date.now() - Number(state.savedAt) > 1000 * 60 * 60 * 6) {
      sessionStorage.removeItem("rfStudentReturnState");
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

function openExternalVideo(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return;

  saveStudentReturnState({ lastExternalVideoUrl: url });
  hideLoading();

  // Em app instalado/mobile, abrir na mesma navegação evita a aba/webview vazia
  // que pode aparecer ao retornar de links externos do YouTube.
  if (isStandaloneMode() || isIOSDevice() || isAndroidDevice() || isYouTubeUrl(url)) {
    window.location.assign(url);
    return;
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) window.location.assign(url);
}

function restoreAfterExternalReturn() {
  hideLoading();
  document.body.classList.remove("studentBooting");
  document.body.classList.add("studentReady");

  const state = getStudentReturnState();
  if (!state) return;

  if (
    state.tab === "manual" &&
    Array.isArray(workouts) &&
    workouts.length &&
    typeof setTab === "function" &&
    typeof renderWorkouts === "function"
  ) {
    activeWorkoutIndex = Math.min(Math.max(Number(state.activeWorkoutIndex || 0), 0), workouts.length - 1);
    setTab("manual");
    renderWorkouts();
  }

  window.setTimeout(() => {
    const y = Number(state.scrollY || 0);
    if (Number.isFinite(y) && y > 0) window.scrollTo({ top: y, behavior: "instant" });
  }, 80);
}

document.addEventListener("click", (event) => {
  const link = event.target?.closest?.("a[data-external-video]");
  if (!link) return;

  const href = link.getAttribute("href") || link.dataset.externalVideo || "";
  if (!isExternalHttpUrl(href)) return;

  event.preventDefault();
  event.stopPropagation();
  openExternalVideo(href);
});

window.addEventListener("pagehide", () => saveStudentReturnState());
window.addEventListener("pageshow", () => {
  // Quando o navegador restaura a PWA do cache após sair do YouTube, garante
  // que loaders ou overlays não fiquem presos sobre a tela.
  restoreAfterExternalReturn();
});
window.addEventListener("focus", () => {
  if (getStudentReturnState()?.tab === "manual") restoreAfterExternalReturn();
});

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

function setOfflineUI() {
  const online = navigator.onLine;

  if (!offlineMask) return;

  offlineMask.classList.toggle("show", !online);
  offlineMask.setAttribute("aria-hidden", online ? "true" : "false");
}

window.addEventListener("online", () => {
  setOfflineUI();
  showMessage("ok", "Conexão restabelecida", "Você já pode atualizar os dados e salvar registros.");
  hideMessage(3500);
});

window.addEventListener("offline", () => {
  setOfflineUI();
  showMessage("warn", "Você está offline", "Alguns conteúdos podem não abrir e os registros não serão salvos.");
});

offlineTryBtn?.addEventListener("click", setOfflineUI);
