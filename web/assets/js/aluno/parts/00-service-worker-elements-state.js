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
    // Não recarrega automaticamente. Em iOS/PWA, voltar de um app externo
    // durante esse reload pode deixar a área do aluno em tela branca.
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


function normalizeStudentVideoUrl(rawUrl) {
  let url = String(rawUrl || "").trim();
  if (!url) return "";

  url = url.replace(/&amp;/g, "&").replace(/\s+/g, "");

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    // Corrige links copiados do Google: google.com/url?q=https://youtube...
    if (host.includes("google.") && parsed.pathname.startsWith("/url")) {
      const redirected = parsed.searchParams.get("q") || parsed.searchParams.get("url");
      if (redirected) return normalizeStudentVideoUrl(decodeURIComponent(redirected));
    }

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0] || "";
      return id ? `https://www.youtube.com/watch?v=${id}` : url;
    }

    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      parsed.hostname = "www.youtube.com";
      parsed.protocol = "https:";
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return url;
  }
}

function getYouTubeVideoId(url) {
  try {
    const parsed = new URL(normalizeStudentVideoUrl(url));
    const host = parsed.hostname.toLowerCase();
    const parts = parsed.pathname.split("/").filter(Boolean);

    if (host === "youtu.be") return parts[0] || "";
    if (!(host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com"))) return "";

    if (parsed.searchParams.get("v")) return parsed.searchParams.get("v") || "";
    if (["shorts", "embed", "live"].includes(parts[0])) return parts[1] || "";

    return "";
  } catch {
    return "";
  }
}

function getYouTubeStartSeconds(url) {
  try {
    const parsed = new URL(normalizeStudentVideoUrl(url));
    const raw = parsed.searchParams.get("start") || parsed.searchParams.get("t") || "";
    if (!raw) return 0;
    if (/^\d+$/.test(raw)) return Number(raw);

    const match = raw.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
    if (!match) return 0;

    return (Number(match[1] || 0) * 3600) + (Number(match[2] || 0) * 60) + Number(match[3] || 0);
  } catch {
    return 0;
  }
}

function getYouTubeEmbedUrl(url) {
  const videoId = getYouTubeVideoId(url);
  if (!/^[a-zA-Z0-9_-]{6,}$/.test(videoId)) return "";

  const start = getYouTubeStartSeconds(url);
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
  });

  if (start > 0) params.set("start", String(start));

  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

function ensureStudentVideoModal() {
  let modal = document.getElementById("studentVideoModal");
  if (modal) return modal;

  const style = document.createElement("style");
  style.textContent = `
    .studentVideoModal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.88);padding:18px;box-sizing:border-box}
    .studentVideoModal.show{display:flex}
    .studentVideoDialog{width:min(960px,100%);background:#101010;border:1px solid rgba(206,172,94,.35);border-radius:22px;overflow:hidden;box-shadow:0 22px 80px rgba(0,0,0,.55)}
    .studentVideoTop{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;background:#151515;color:#fff}
    .studentVideoTop b{font-size:14px;color:#ceac5e;text-transform:uppercase;letter-spacing:.06em}
    .studentVideoClose{border:0;border-radius:999px;background:rgba(255,255,255,.10);color:#fff;font-size:15px;font-weight:800;padding:9px 13px;cursor:pointer}
    .studentVideoFrameWrap{position:relative;width:100%;aspect-ratio:16/9;background:#000}
    .studentVideoFrameWrap iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
    @media(max-width:640px){.studentVideoModal{padding:10px}.studentVideoDialog{border-radius:18px}.studentVideoFrameWrap{aspect-ratio:9/16;max-height:78vh}.studentVideoTop b{font-size:12px}}
  `;
  document.head.appendChild(style);

  modal = document.createElement("div");
  modal.id = "studentVideoModal";
  modal.className = "studentVideoModal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="studentVideoDialog" role="dialog" aria-modal="true" aria-label="Vídeo do treino">
      <div class="studentVideoTop">
        <b id="studentVideoTitle">Vídeo do treino</b>
        <button class="studentVideoClose" id="studentVideoClose" type="button">Fechar</button>
      </div>
      <div class="studentVideoFrameWrap">
        <iframe id="studentVideoFrame" src="about:blank" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => closeStudentVideoModal();
  modal.querySelector("#studentVideoClose")?.addEventListener("click", close);
  modal.addEventListener("click", (ev) => {
    if (ev.target === modal) close();
  });
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && modal.classList.contains("show")) close();
  });

  return modal;
}

function closeStudentVideoModal() {
  const modal = document.getElementById("studentVideoModal");
  const frame = document.getElementById("studentVideoFrame");

  if (frame) frame.src = "about:blank";
  modal?.classList.remove("show");
  modal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("videoOpen");
}

function rememberStudentVideoReturnState() {
  try {
    sessionStorage.setItem("rfStudentVideoReturn", JSON.stringify({
      activeWorkoutIndex,
      scrollY: window.scrollY || 0,
      tab: document.body.classList.contains("studentManualMode") ? "manual" : "documents",
      ts: Date.now(),
    }));
  } catch {}
}

function restoreStudentVideoReturnState() {
  try {
    const raw = sessionStorage.getItem("rfStudentVideoReturn");
    if (!raw) return;
    const state = JSON.parse(raw);
    if (!state || Date.now() - Number(state.ts || 0) > 15 * 60 * 1000) return;

    if (state.tab === "manual") {
      activeWorkoutIndex = Number.isFinite(Number(state.activeWorkoutIndex)) ? Number(state.activeWorkoutIndex) : activeWorkoutIndex;
      if (typeof setTab === "function") setTab("manual");
      if (typeof renderWorkouts === "function") renderWorkouts();
      setTimeout(() => window.scrollTo({ top: Number(state.scrollY || 0), behavior: "auto" }), 80);
    }
  } catch {}
}

function openStudentVideo(rawUrl, title = "Vídeo do treino") {
  const normalizedUrl = normalizeStudentVideoUrl(rawUrl);
  if (!normalizedUrl) return showMessage("warn", "Vídeo indisponível", "O link do vídeo não foi cadastrado corretamente.");

  rememberStudentVideoReturnState();

  const embedUrl = getYouTubeEmbedUrl(normalizedUrl);
  if (embedUrl) {
    const modal = ensureStudentVideoModal();
    const frame = modal.querySelector("#studentVideoFrame");
    const label = modal.querySelector("#studentVideoTitle");

    if (label) label.textContent = title || "Vídeo do treino";
    if (frame) frame.src = embedUrl;

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("videoOpen");
    return;
  }

  window.location.href = normalizedUrl;
}

function studentVideoButton(rawUrl, label = "Ver vídeo") {
  const url = normalizeStudentVideoUrl(rawUrl);
  if (!url) return "";
  return `<button class="videoBtn" type="button" data-student-video-url="${escapeHtml(url)}" data-student-video-title="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
}

function bindStudentVideoButtons(root = document) {
  root.querySelectorAll("[data-student-video-url]").forEach((btn) => {
    if (btn.dataset.videoBound === "1") return;
    btn.dataset.videoBound = "1";
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      openStudentVideo(btn.dataset.studentVideoUrl || "", btn.dataset.studentVideoTitle || btn.textContent || "Vídeo do treino");
    });
  });
}

window.addEventListener("message", (event) => {
  const data = event?.data || {};
  if (data.type !== "RF_OPEN_STUDENT_VIDEO") return;

  const rawUrl = String(data.url || "").trim();
  if (!rawUrl) return;

  const videoId = getYouTubeVideoId(rawUrl);
  if (!videoId) return;

  openStudentVideo(rawUrl, data.title || "Vídeo do treino");
});

window.addEventListener("pageshow", () => {
  hideLoading?.();
  closeStudentVideoModal();
  restoreStudentVideoReturnState();
});
