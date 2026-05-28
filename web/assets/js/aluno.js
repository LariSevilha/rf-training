import { requireAuth } from "./guard.js";
import { apiDocuments, apiMe, apiWorkouts, apiSaveWorkoutLogs, apiExtraItems } from "./api.js";
import { clearSession } from "./state.js";
import { driveToPreview, placeholderHtml } from "./pdf.js";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try { await navigator.serviceWorker.register("/service-worker.js"); }
    catch (e) { console.warn("SW register falhou:", e); }
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
const documentsTab = document.getElementById("documentsTab");
const manualTab = document.getElementById("manualTab");
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

const urls = { training: "", diet: "", supp: "", cardio: "", exams: "", stretch: "" };
const cardioWritten = { name: "", time: "", intensity: "", days: "" };
const extraUrls = {};

// Evita aparecerem todos os cards antes de carregar os dados.
document.querySelectorAll(".studentCard[data-open]").forEach((btn) => {
  btn.style.display = "none";
});
if (docsEmpty) docsEmpty.style.display = "none";

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
function isAndroidDevice() { return /Android/i.test(navigator.userAgent); }
function isStandaloneMode() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.navigator.standalone === true;
}
function showInstallButton() { if (installBtn) installBtn.style.display = "inline-flex"; }
function hideInstallButton() { if (installBtn) installBtn.style.display = "none"; }

function showAndroidManualInstall() {
  alert("Para instalar no Android:\n\n1) Abra este site no Chrome\n2) Toque no menu ⋮\n3) Toque em ‘Instalar app’ ou ‘Adicionar à tela inicial’." );
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

function setTab(name) {
  const target = name === "manual" ? "manual" : "documents";

  document.querySelectorAll("[data-student-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.studentTab === target);
  });

  document.querySelectorAll(".alunoPanel").forEach((panel) => panel.classList.remove("active"));
  document.getElementById(`panel-${target}`)?.classList.add("active");
}

document.querySelectorAll("[data-student-tab]").forEach((btn) => {
  btn.addEventListener("click", () => setTab(btn.dataset.studentTab));
});

backHomeBtn?.addEventListener("click", () => {
  setTab("documents");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

function normalizeUrl(value) {
  return String(value || "").trim();
}

function hasWrittenCardio() {
  return !!(
    String(cardioWritten.name || "").trim() ||
    String(cardioWritten.time || "").trim() ||
    String(cardioWritten.intensity || "").trim() ||
    String(cardioWritten.days || "").trim()
  );
}

function hasAnyVisibleMaterial() {
  const hasManualWorkout = Array.isArray(workouts) && workouts.length > 0;
  const hasAnyLink = ["training", "diet", "supp", "exams", "stretch"].some((type) => !!normalizeUrl(urls[type]));
  return hasManualWorkout || hasAnyLink || hasWrittenCardio() || extraItems.length > 0;
}

function updateContentModeUI() {
  if (documentsTab) {
    documentsTab.style.display = "none";
    documentsTab.textContent = "Início";
  }

  if (manualTab) {
    manualTab.style.display = "none";
    manualTab.textContent = "Treino";
  }

  if (alunoTabs) {
    alunoTabs.style.display = "none";
    alunoTabs.setAttribute("hidden", "");
  }

  setTab("documents");
}

function lockMenu() {
  document.body.classList.remove("ready");
  menuGrid?.classList.add("menuLocked");
}
function unlockMenu() {
  document.body.classList.add("ready");
  menuGrid?.classList.remove("menuLocked");
}

function renderExtraItemCards() {
  if (!menuGrid) return;

  menuGrid.querySelectorAll(".studentCard[data-extra-item]").forEach((el) => el.remove());

  Object.keys(extraUrls).forEach((key) => delete extraUrls[key]);

  extraItems
    .filter((item) => item && item.active !== false && normalizeUrl(item.url))
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .forEach((item) => {
      const key = `extra-${item.id}`;
      extraUrls[key] = normalizeUrl(item.url);

      const btn = document.createElement("button");
      btn.className = "studentCard";
      btn.type = "button";
      btn.dataset.open = key;
      btn.dataset.extraItem = "true";
      btn.style.display = "grid";
      btn.innerHTML = `
        <span class="cardIcon extraCardIcon" aria-hidden="true">📎</span>
        <span class="cardText"><b>${escapeHtml(item.title || "Arquivo")}</b><small>${escapeHtml(item.notes || "Material extra")}</small></span>
        <span class="cardArrow">›</span>
      `;
      menuGrid.appendChild(btn);
    });
}

function applyVisibility() {
  const hasManualWorkout = Array.isArray(workouts) && workouts.length > 0;
  renderExtraItemCards();

  const buttons = Array.from(document.querySelectorAll(".studentCard[data-open]"));
  let visible = 0;

  buttons.forEach((btn) => {
    const type = btn?.dataset?.open;
    let show = false;

    if (type === "training") {
      show = hasManualWorkout || !!normalizeUrl(urls.training);
      const title = btn.querySelector(".cardText b");
      const sub = btn.querySelector(".cardText small");
      if (title) title.textContent = "Treino";
      if (sub) sub.textContent = hasManualWorkout ? "Abrir treino manual" : "Plano de treino";
    } else if (type === "diet") {
      show = !!normalizeUrl(urls.diet);
    } else if (type === "supp") {
      show = !!normalizeUrl(urls.supp);
    } else if (type === "cardio") {
      show = hasWrittenCardio();
    } else if (type === "exams") {
      show = !!normalizeUrl(urls.exams);
    } else if (type === "stretch") {
      show = !!normalizeUrl(urls.stretch);
    } else if (type && type.startsWith("extra-")) {
      show = !!normalizeUrl(extraUrls[type]);
    }

    btn.style.display = show ? "grid" : "none";
    if (show) visible += 1;
  });

  if (docsEmpty) docsEmpty.style.display = visible ? "none" : "grid";
  updateContentModeUI();
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
          <div class="eyebrow">Cardio / Corrida</div>
          <h1>${name}</h1>
          <div class="row"><div class="label">Tempo</div><div class="value">${time}</div></div>
          <div class="row"><div class="label">Intensidade</div><div class="value">${intensity}</div></div>
          <div class="row"><div class="label">Dias</div><div class="value">${days}</div></div>
        </main>
      </body>
    </html>
  `;
}

function openPdf(type) {
  if (type === "training" && workouts.length > 0) {
    activeWorkoutIndex = 0;
    setTab("manual");
    renderWorkouts();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const titles = {
    training: "TREINO",
    diet: "DIETA",
    supp: "SUPLEMENTAÇÃO",
    cardio: "CARDIO / CORRIDA",
    exams: "EXAMES",
    stretch: "ALONGAMENTO",
  };

  const extra = extraItems.find((item) => `extra-${item.id}` === type);
  if (pdfTitle) pdfTitle.textContent = extra?.title || titles[type] || "PDF";
  showLoading();

  const rawUrl = normalizeUrl(urls[type] || extraUrls[type] || "");

  if (type === "cardio" && hasWrittenCardio()) {
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(cardioWrittenHtml());
    setTimeout(hideLoading, 250);
  } else if (!rawUrl) {
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(placeholderHtml("Material não configurado", "Entre em contato com o personal."));
    setTimeout(hideLoading, 250);
  } else if (!navigator.onLine) {
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(placeholderHtml("Você está offline", "Conecte-se para abrir este material."));
    setTimeout(hideLoading, 250);
  } else {
    const preview = driveToPreview(rawUrl) || rawUrl;
    pdfFrame.src = preview;
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

menuGrid?.addEventListener("click", (ev) => {
  const btn = ev.target.closest(".studentCard[data-open]");
  if (!btn) return;
  openPdf(btn.dataset.open);
});

logoutBtn?.addEventListener("click", () => {
  clearSession();
  window.location.href = "/pages/index.html";
});

function setupInstallFlow() {
  if (!installBtn) return;
  hideInstallButton();
  if (isAndroidDevice() && !isStandaloneMode()) {
    showInstallButton();
    installBtn.textContent = "Instalar app";
  }
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installPromptSeen = true;
    if (isAndroidDevice() && !isStandaloneMode()) {
      installBtn.textContent = "Instalar app";
      showInstallButton();
    }
  });
  installBtn.addEventListener("click", async () => {
    if (isStandaloneMode()) return hideInstallButton();
    if (deferredPrompt) {
      try { await deferredPrompt.prompt(); await deferredPrompt.userChoice; }
      finally { deferredPrompt = null; isStandaloneMode() ? hideInstallButton() : showInstallButton(); }
      return;
    }
    if (isAndroidDevice()) return showAndroidManualInstall();
    if (isIOSDevice()) {
      const modal = document.getElementById("iosInstallModal");
      modal?.classList.add("show");
      modal?.setAttribute("aria-hidden", "false");
    }
  });
  window.addEventListener("appinstalled", () => { deferredPrompt = null; hideInstallButton(); });
  setTimeout(() => {
    if (isAndroidDevice() && !isStandaloneMode() && !installPromptSeen) {
      installBtn.textContent = "Instalar app";
      showInstallButton();
    }
  }, 2500);
}
setupInstallFlow();

(function iosInstallModalInit() {
  const modal = document.getElementById("iosInstallModal");
  if (!modal || !isIOSDevice() || isStandaloneMode()) return;
  const key = "rf_ios_install_hide_until";
  const hideUntil = Number(localStorage.getItem(key) || "0");
  if (hideUntil && Date.now() < hideUntil) return;
  const closeBtn = document.getElementById("iosInstallClose");
  const laterBtn = document.getElementById("iosLaterBtn");
  const okBtn = document.getElementById("iosOkBtn");
  const dontShowChk = document.getElementById("iosDontShowChk");
  function open() { modal.classList.add("show"); modal.setAttribute("aria-hidden", "false"); }
  function close() {
    if (dontShowChk?.checked) localStorage.setItem(key, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }
  closeBtn?.addEventListener("click", close);
  laterBtn?.addEventListener("click", close);
  okBtn?.addEventListener("click", close);
  modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
  setTimeout(open, 700);
})();

function cleanRepsLabel(value) {
  return String(value || "").replace(/^\s*\d+\s*x\s*/i, "").trim();
}

function getExpandedSets(serie) {
  const count = Math.max(1, Number(serie?.count || 1));
  const reps = cleanRepsLabel(serie?.targetReps || serie?.reps || "");
  const lastSets = Array.isArray(serie?.lastSets) ? serie.lastSets : [];
  return Array.from({ length: count }, (_, index) => {
    const last = lastSets.find((item) => Number(item?.setIndex) === index) || (index === 0 ? serie : {});
    return {
      seriesId: serie.id,
      setIndex: index,
      reps,
      lastWeight: last?.lastWeight ?? "",
      lastPerformedReps: last?.lastPerformedReps ?? "",
    };
  });
}

function renderWorkoutTabs() {
  if (!workoutTabs) return;
  workoutTabs.innerHTML = "";
  workouts.forEach((workout, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `workoutTab ${index === activeWorkoutIndex ? "active" : ""}`;
    btn.textContent = workout.title || `Treino ${index + 1}`;
    btn.addEventListener("click", () => {
      activeWorkoutIndex = index;
      renderWorkouts();
    });
    workoutTabs.appendChild(btn);
  });
}

function renderWorkouts() {
  if (!workoutArea || !workoutsEmpty) return;
  renderWorkoutTabs();

  if (!workouts.length) {
    workoutArea.innerHTML = "";
    workoutsEmpty.style.display = "grid";
    return;
  }

  workoutsEmpty.style.display = "none";
  const workout = workouts[activeWorkoutIndex] || workouts[0];
  if (!workout) return;

  const exercisesHtml = (workout.exercises || []).map((item, exIndex) => {
    const exercise = item.exercise || {};
    const series = item.series || [];
    return `
      <article class="exerciseBlock">
        <div class="exerciseHeader">
          <div>
            <div class="exerciseKicker">${escapeHtml(exercise.muscleGroup || "Exercício")}</div>
            <h3>${exIndex + 1}. ${escapeHtml(exercise.name || "Exercício")}</h3>
            ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ""}
            ${item.technique ? `<div class="techniqueBox"><b>Técnica:</b> ${escapeHtml(item.technique.name || "")}${item.technique.exerciseNote ? ` · ${escapeHtml(item.technique.exerciseNote)}` : ""}${item.technique.notes ? `<br><small>${escapeHtml(item.technique.notes)}</small>` : ""}${item.technique.videoUrl ? `<br><a class="videoBtn" href="${escapeHtml(item.technique.videoUrl)}" target="_blank" rel="noopener">Ver técnica</a>` : ""}</div>` : ""}
          </div>
          ${exercise.videoUrl ? `<a class="videoBtn" href="${escapeHtml(exercise.videoUrl)}" target="_blank" rel="noopener">Ver vídeo</a>` : ""}
        </div>

        <div class="seriesTable">
          <div class="seriesHead"><span>Série</span><span>Reps alvo</span><span>Carga</span><span>Reps feitas</span></div>
          ${series.flatMap((serie) => getExpandedSets(serie)).map((set, serieIndex) => `
            <div class="seriesRow">
              <span>${serieIndex + 1}</span>
              <span>${escapeHtml(set.reps || "—")}</span>
              <label><small>kg</small><input inputmode="decimal" type="number" step="0.5" min="0" data-series-id="${escapeHtml(set.seriesId)}" data-set-index="${set.setIndex}" data-field="weight" value="${set.lastWeight ?? ""}" placeholder="0" /></label>
              <label><small>reps</small><input inputmode="numeric" type="number" step="1" min="0" data-series-id="${escapeHtml(set.seriesId)}" data-set-index="${set.setIndex}" data-field="performedReps" value="${set.lastPerformedReps ?? ""}" placeholder="0" /></label>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }).join("");

  workoutArea.innerHTML = `
    <div class="workoutCard" data-workout-id="${escapeHtml(workout.id)}">
      <div class="workoutHead">
        <div>
          <h2>${escapeHtml(workout.title || "Treino")}</h2>
          ${workout.notes ? `<p>${escapeHtml(workout.notes)}</p>` : `<p>Preencha carga e repetições para registrar sua execução.</p>`}
        </div>
        <button class="saveWorkoutBtn" id="saveWorkoutBtn" type="button">Salvar execução</button>
      </div>
      ${exercisesHtml || `<div class="emptyState inline"><h3>Treino sem exercícios</h3><p>Entre em contato com o personal.</p></div>`}
      <div class="workoutObservationBox">
        <div class="label">Observação do treino de hoje</div>
        <textarea id="workoutSessionNotes" rows="4" placeholder="Ex.: senti dificuldade em alguma série, dor, cansaço, evolução de carga...">${escapeHtml(workout.sessionNotes || "")}</textarea>
        <div class="smallHint">Essa observação fica salva no histórico para o personal acompanhar.</div>
      </div>
    </div>
  `;

  document.getElementById("saveWorkoutBtn")?.addEventListener("click", () => saveCurrentWorkout(workout.id));
}

async function saveCurrentWorkout(workoutId) {
  if (!workoutId) return showMessage("error", "Treino inválido", "Atualize a página e tente novamente.");
  if (!navigator.onLine) return showMessage("warn", "Sem internet", "Conecte-se para salvar a execução do treino.");

  const rows = new Map();
  workoutArea?.querySelectorAll("input[data-series-id]").forEach((input) => {
    const seriesId = input.dataset.seriesId;
    const setIndex = Number(input.dataset.setIndex || 0);
    const field = input.dataset.field;
    if (!seriesId || !field) return;
    const key = `${seriesId}:${Number.isFinite(setIndex) ? setIndex : 0}`;
    if (!rows.has(key)) rows.set(key, { seriesId, setIndex: Number.isFinite(setIndex) ? setIndex : 0, weight: "", performedReps: "" });
    rows.get(key)[field] = input.value;
  });

  const logs = [...rows.values()].filter((row) => String(row.weight || "").trim() || String(row.performedReps || "").trim());
  if (!logs.length) return showMessage("warn", "Nada para salvar", "Preencha pelo menos uma carga ou repetição.");

  const btn = document.getElementById("saveWorkoutBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Salvando…"; }

  try {
    const notes = (document.getElementById("workoutSessionNotes")?.value || "").trim();
    const resp = await apiSaveWorkoutLogs(session.token, workoutId, logs, notes);
    showMessage("ok", "Execução salva", `${resp.saved || logs.length} registro(s) gravado(s) com sucesso.`);
    hideMessage(4000);
    await syncWorkouts(false);
  } catch (e) {
    showMessage("error", "Erro ao salvar", e?.message || "Tente novamente em alguns segundos.");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Salvar execução"; }
  }
}

async function syncExtraItems() {
  if (!session?.token) return;
  try {
    const data = await apiExtraItems(session.token);
    extraItems = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
  } catch {
    extraItems = [];
  }
  applyVisibility();
}

function parseCardioFromDocuments(docs) {
  cardioWritten.name = "";
  cardioWritten.time = "";
  cardioWritten.intensity = "";
  cardioWritten.days = "";

  const rawCardio = String(docs?.cardio || "").trim();

  if (rawCardio) {
    try {
      const parsed = JSON.parse(rawCardio);
      cardioWritten.name = String(parsed.name || "").trim();
      cardioWritten.time = String(parsed.time || "").trim();
      cardioWritten.intensity = String(parsed.intensity || "").trim();
      cardioWritten.days = String(parsed.days || "").trim();
      return;
    } catch {
      // Se for link antigo de cardio, deixa como URL apenas se não houver cardio escrito.
      urls.cardio = rawCardio;
    }
  }

  cardioWritten.name = String(docs?.cardioName || "").trim();
  cardioWritten.time = String(docs?.cardioTime || "").trim();
  cardioWritten.intensity = String(docs?.cardioIntensity || "").trim();
  cardioWritten.days = String(docs?.cardioDays || "").trim();
}

async function syncDocuments() {
  if (!session?.token) return;
  lockMenu();
  if (statusEl) statusEl.textContent = navigator.onLine ? "Sincronizando materiais…" : "Você está offline.";
  try {
    const docs = await apiDocuments(session.token);
    urls.training = normalizeUrl(docs.training);
    urls.diet = normalizeUrl(docs.diet);
    urls.supp = normalizeUrl(docs.supp);
    urls.cardio = "";
    urls.exams = normalizeUrl(docs.exams);
    urls.stretch = normalizeUrl(docs.stretch);
    parseCardioFromDocuments(docs);
    applyVisibility();
    if (statusEl) statusEl.textContent = "Materiais atualizados.";
  } catch (e) {
    showMessage("error", "Erro ao carregar materiais", e?.message || "Tente atualizar a página.");
    if (statusEl) statusEl.textContent = "Não foi possível sincronizar todos os dados.";
  } finally {
    unlockMenu();
  }
}

async function syncWorkouts(showLoadingMessage = true) {
  if (!session?.token) return;
  if (showLoadingMessage) showMessage("info", "Carregando treinos", "Buscando treinos manuais liberados pelo personal.");
  try {
    const data = await apiWorkouts(session.token);
    workouts = Array.isArray(data.workouts) ? data.workouts : [];
    if (activeWorkoutIndex >= workouts.length) activeWorkoutIndex = 0;
    renderWorkouts();
    applyVisibility();
    if (showLoadingMessage) {
      workouts.length ? showMessage("ok", "Treinos carregados", "Você já pode registrar sua execução.") : showMessage("info", "Sem treino manual", "Nenhum treino manual foi liberado ainda.");
      hideMessage(3500);
    }
  } catch (e) {
    workouts = [];
    renderWorkouts();
    applyVisibility();
    showMessage("error", "Erro ao carregar treinos", e?.message || "Tente novamente mais tarde.");
  }
}

async function refreshAll() {
  if (!session?.token) return;
  showMessage("info", "Atualizando", "Buscando materiais e treinos.");
  await Promise.allSettled([syncDocuments(), syncWorkouts(false), syncExtraItems()]);
  applyVisibility();
  showMessage("ok", "Atualizado", "Seus materiais foram sincronizados.");
  hideMessage(3000);
}
refreshStudentBtn?.addEventListener("click", refreshAll);

(async function init() {
  setOfflineUI();
  session = await requireAuth("student");
  if (!session) return;

  let displayName = (session?.user?.name || "").trim();
  if (!displayName) {
    try { const me = await apiMe(session.token); displayName = (me?.user?.name || "").trim(); } catch {}
  }
  if (!displayName) displayName = "Aluno";
  if (nameEl) nameEl.textContent = displayName;

  await Promise.allSettled([syncDocuments(), syncWorkouts(false), syncExtraItems()]);
  applyVisibility();
  if (statusEl) statusEl.textContent = hasAnyVisibleMaterial() ? "Escolha abaixo o que deseja acessar." : "Nenhum material liberado no momento.";
})();
