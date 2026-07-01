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
    if (refreshing) return;

    refreshing = true;
    window.location.reload();
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

// Modal de vídeo do treino manual: mantém YouTube dentro do próprio app.
let studentVideoModal = null;
let studentVideoFrame = null;
let studentVideoTitle = null;

function isYoutubeUrl(url) {
  try {
    const u = new URL(String(url || ""), window.location.href);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    return host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com";
  } catch {
    return /youtu\.be|youtube\.com/i.test(String(url || ""));
  }
}

function parseYoutubeStartSeconds(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d+$/.test(raw)) return raw;

  const match = raw.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
  if (!match || !match[0]) return "";

  const h = Number(match[1] || 0);
  const m = Number(match[2] || 0);
  const sec = Number(match[3] || 0);
  const total = (h * 3600) + (m * 60) + sec;
  return total ? String(total) : "";
}

function youtubeEmbedUrl(url) {
  try {
    const u = new URL(String(url || ""), window.location.href);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();
    let id = "";

    if (host === "youtu.be") {
      id = u.pathname.split("/").filter(Boolean)[0] || "";
    } else if (u.pathname.startsWith("/embed/")) {
      id = u.pathname.split("/").filter(Boolean)[1] || "";
    } else if (u.pathname.startsWith("/shorts/")) {
      id = u.pathname.split("/").filter(Boolean)[1] || "";
    } else {
      id = u.searchParams.get("v") || "";
    }

    id = String(id || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
    if (!id) return "";

    const embed = new URL(`https://www.youtube.com/embed/${id}`);
    embed.searchParams.set("rel", "0");
    embed.searchParams.set("modestbranding", "1");
    embed.searchParams.set("playsinline", "1");

    const start = parseYoutubeStartSeconds(u.searchParams.get("start") || u.searchParams.get("t"));
    if (start) embed.searchParams.set("start", start);

    return embed.toString();
  } catch {
    return "";
  }
}

function ensureStudentVideoModal() {
  if (studentVideoModal) return;

  studentVideoModal = document.createElement("div");
  studentVideoModal.className = "studentVideoModal";
  studentVideoModal.setAttribute("aria-hidden", "true");
  studentVideoModal.innerHTML = `
    <div class="studentVideoCard" role="dialog" aria-modal="true" aria-label="Vídeo do treino">
      <div class="studentVideoBar">
        <div class="studentVideoTitle" id="studentVideoTitle">Vídeo</div>
        <button class="studentVideoClose" type="button" aria-label="Fechar vídeo">×</button>
      </div>
      <div class="studentVideoFrameWrap">
        <iframe id="studentVideoFrame" title="Vídeo do treino" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
      </div>
    </div>
  `;

  document.body.appendChild(studentVideoModal);
  studentVideoFrame = studentVideoModal.querySelector("#studentVideoFrame");
  studentVideoTitle = studentVideoModal.querySelector("#studentVideoTitle");

  studentVideoModal.querySelector(".studentVideoClose")?.addEventListener("click", closeStudentVideoModal);
  studentVideoModal.addEventListener("click", (ev) => {
    if (ev.target === studentVideoModal) closeStudentVideoModal();
  });
}

function openStudentVideoModal(url, title = "Vídeo") {
  const embed = youtubeEmbedUrl(url);
  if (!embed) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  ensureStudentVideoModal();
  if (studentVideoTitle) studentVideoTitle.textContent = title || "Vídeo";
  if (studentVideoFrame) studentVideoFrame.src = embed;
  studentVideoModal.classList.add("show");
  studentVideoModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("videoOpen");
}

function closeStudentVideoModal() {
  if (!studentVideoModal) return;
  studentVideoModal.classList.remove("show");
  studentVideoModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("videoOpen");
  if (studentVideoFrame) studentVideoFrame.src = "about:blank";
}

window.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape" && studentVideoModal?.classList.contains("show")) {
    closeStudentVideoModal();
  }
});

document.addEventListener("click", (ev) => {
  const link = ev.target?.closest?.("a.videoBtn, a[data-video-modal]");
  if (!link) return;

  const url = link.getAttribute("href") || link.dataset.videoModal || "";
  if (!isYoutubeUrl(url)) return;

  ev.preventDefault();
  ev.stopPropagation();
  openStudentVideoModal(url, (link.textContent || "Vídeo do treino").trim());
});

