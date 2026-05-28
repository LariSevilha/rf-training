import { requireAuth } from "./guard.js";
import {
  apiAdminListUsers,
  apiAdminCreateUser,
  apiAdminUpdateProfile,
  apiAdminGetDocs,
  apiAdminSetActive,
  apiAdminSaveDocs,
  apiAdminResetPassword,
  apiAdminDeleteUser,
  apiAdminWorkoutRecords,
  apiAdminGetWorkouts,
  apiAdminSaveWorkouts,
  apiAdminListExercises,
  apiAdminCreateExercise,
  apiAdminUpdateExercise,
  apiAdminDeleteExercise,
  apiAdminListMuscleGroups,
  apiAdminCreateMuscleGroup,
  apiAdminUpdateMuscleGroup,
  apiAdminDeleteMuscleGroup,
  apiAdminListVideos,
  apiAdminCreateVideo,
  apiAdminUpdateVideo,
  apiAdminDeleteVideo,
  apiAdminListTechniques,
  apiAdminCreateTechnique,
  apiAdminUpdateTechnique,
  apiAdminDeleteTechnique,
  apiAdminGetExtraItems,
  apiAdminSaveExtraItems,
  apiMe,
  apiUpdateMe,
  apiUpdateMyPassword,
} from "./api.js";
import { clearSession } from "./state.js";
import { toast, openModal } from "./ui.js";
import {
  buildDashboardPrintHTML,
  monthKey,
  monthLabel,
  pct,
  pickDate,
  monthsBetween,
} from "./helpers/report.js";

// ===== Elements =====
const who = document.getElementById("who");
const mName = document.getElementById("mName");
const logoutBtn = document.getElementById("logoutBtn");

// Create
const newName = document.getElementById("newName");
const newEmail = document.getElementById("newEmail");
const newPass = document.getElementById("newPass");
const newActive = document.getElementById("newActive");
const createBtn = document.getElementById("createBtn");

// List
const search = document.getElementById("search");
const refreshBtn = document.getElementById("refreshBtn");
const userList = document.getElementById("userList");

// Edit
const studentName = document.getElementById("studentName");
const studentEmail = document.getElementById("studentEmail");
const active = document.getElementById("active");

const training = document.getElementById("training");
const diet = document.getElementById("diet");
const supp = document.getElementById("supp");
const stretch = document.getElementById("stretch");
const cardioName = document.getElementById("cardioName");
const cardioTime = document.getElementById("cardioTime");
const cardioIntensity = document.getElementById("cardioIntensity");
const cardioDays = document.getElementById("cardioDays");
const exams = document.getElementById("exams");

const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const deleteBtn = document.getElementById("deleteBtn");
const workoutStudentEmail = document.getElementById("workoutStudentEmail");
const workoutLoadBtn = document.getElementById("workoutLoadBtn");
const workoutSaveBtn = document.getElementById("workoutSaveBtn");

const trainingMode = document.getElementById("trainingMode");
const pdfTrainingBox = document.getElementById("pdfTrainingBox");
const manualTrainingBox = document.getElementById("manualTrainingBox");

const workoutTitle = document.getElementById("workoutTitle");
const workoutOrder = document.getElementById("workoutOrder");
const workoutNotes = document.getElementById("workoutNotes");
const workoutActive = document.getElementById("workoutActive");

const workoutExerciseSelect = document.getElementById("workoutExerciseSelect");
const workoutExerciseOrder = document.getElementById("workoutExerciseOrder");
const workoutExerciseNotes = document.getElementById("workoutExerciseNotes");
const seriesCount = document.getElementById("seriesCount");
const seriesTargetReps = document.getElementById("seriesTargetReps");
const seriesAddBtn = document.getElementById("seriesAddBtn");
const seriesClearBtn = document.getElementById("seriesClearBtn");
const currentSeriesBox = document.getElementById("currentSeriesBox");
const workoutExerciseAddBtn = document.getElementById("workoutExerciseAddBtn");
const workoutDraftClearBtn = document.getElementById("workoutDraftClearBtn");
const workoutAddBtn = document.getElementById("workoutAddBtn");
const workoutDraftBox = document.getElementById("workoutDraftBox");
const workoutListBox = document.getElementById("workoutListBox");

const muscleName = document.getElementById("muscleName");
const muscleSaveBtn = document.getElementById("muscleSaveBtn");
const muscleRefreshBtn = document.getElementById("muscleRefreshBtn");
const muscleCancelEditBtn = document.getElementById("muscleCancelEditBtn");
const muscleListBox = document.getElementById("muscleListBox");

const videoTitle = document.getElementById("videoTitle");
const videoUrl = document.getElementById("videoUrl");
const videoSaveBtn = document.getElementById("videoSaveBtn");
const videoRefreshBtn = document.getElementById("videoRefreshBtn");
const videoCancelEditBtn = document.getElementById("videoCancelEditBtn");
const videoListBox = document.getElementById("videoListBox");

const exerciseName = document.getElementById("exerciseName");
const exerciseMuscleSelect = document.getElementById("exerciseMuscleSelect");
const exerciseVideoSelect = document.getElementById("exerciseVideoSelect");
const exerciseSaveBtn = document.getElementById("exerciseSaveBtn");
const exerciseListBtn = document.getElementById("exerciseListBtn");
const exerciseCancelEditBtn = document.getElementById("exerciseCancelEditBtn");
const exerciseListBox = document.getElementById("exerciseListBox");

const techniqueName = document.getElementById("techniqueName");
const techniqueVideoUrl = document.getElementById("techniqueVideoUrl");
const techniqueNotes = document.getElementById("techniqueNotes");
const techniqueSaveBtn = document.getElementById("techniqueSaveBtn");
const techniqueRefreshBtn = document.getElementById("techniqueRefreshBtn");
const techniqueCancelEditBtn = document.getElementById("techniqueCancelEditBtn");
const techniqueListBox = document.getElementById("techniqueListBox");
const workoutTechniqueSelect = document.getElementById("workoutTechniqueSelect");
const workoutTechniqueNote = document.getElementById("workoutTechniqueNote");

const extraStudentEmail = document.getElementById("extraStudentEmail");
const extraStudentSearch = document.getElementById("extraStudentSearch");
const extraStudentResults = document.getElementById("extraStudentResults");
const extraSelectedStudentBox = document.getElementById("extraSelectedStudentBox");
const extraTitle = document.getElementById("extraTitle");
const extraUrl = document.getElementById("extraUrl");
const extraNotes = document.getElementById("extraNotes");
const extraOrder = document.getElementById("extraOrder");
const extraActive = document.getElementById("extraActive");
const extraAddBtn = document.getElementById("extraAddBtn");
const extraClearBtn = document.getElementById("extraClearBtn");
const extraLoadBtn = document.getElementById("extraLoadBtn");
const extraSaveBtn = document.getElementById("extraSaveBtn");
const extraItemsBox = document.getElementById("extraItemsBox");

const recordsEmail = document.getElementById("recordsEmail");
let recordsStudentSelect = document.getElementById("recordsStudentSelect");
const recordsFrom = document.getElementById("recordsFrom");
const recordsTo = document.getElementById("recordsTo");
const recordsApplyBtn = document.getElementById("recordsApplyBtn");
const recordsRefreshBtn = document.getElementById("recordsRefreshBtn");
const recordsPdfBtn = document.getElementById("recordsPdfBtn");
const recordsListBox = document.getElementById("recordsListBox");

const recordsStudentSearch = document.getElementById("recordsStudentSearch");
const recordsStudentsList = document.getElementById("recordsStudentsList");
const recordsSelectedStudentBox = document.getElementById("recordsSelectedStudentBox");

let lastWorkoutRecords = [];
let recordsStudents = [];
let selectedRecordsStudentEmail = "";

// ===== Dashboard Elements =====
const dashTotal = document.getElementById("dashTotal");
const dashActive = document.getElementById("dashActive");
const dashInactive = document.getElementById("dashInactive");
const dashActivePct = document.getElementById("dashActivePct");
const dashInactivePct = document.getElementById("dashInactivePct");

const dashMonthlyBody = document.getElementById("dashMonthlyBody");
const dashRefreshBtn = document.getElementById("dashRefreshBtn");

const dashFrom = document.getElementById("dashFrom");
const dashTo = document.getElementById("dashTo");
const dashApplyBtn = document.getElementById("dashApplyBtn");
const dashPdfBtn = document.getElementById("dashPdfBtn");

const dashPeriodNew = document.getElementById("dashPeriodNew");
const dashPeriodLabel = document.getElementById("dashPeriodLabel");

// filtros extras do relatório
const dashStatus = document.getElementById("dashStatus");
const dashNamed = document.getElementById("dashNamed");
const dashText = document.getElementById("dashText");
const dashSort = document.getElementById("dashSort");

// ===== ME (Admin Profile) =====
const meName = document.getElementById("meName");
const meEmail = document.getElementById("meEmail");
const mePass1 = document.getElementById("mePass1");
const mePass2 = document.getElementById("mePass2");
const meSaveBtn = document.getElementById("meSaveBtn");
const meRefreshBtn = document.getElementById("meRefreshBtn");

let token = null;
let selectedRow = null;
let meSessionUser = null;

// dashboard state
let dashboardUsers = [];
let dashboardFilteredUsers = [];
let dashboardMonthlyRows = [];
let dashboardFilterMeta = {};

let workoutCatalogExercises = [];
let workoutDraftExercises = [];
let currentSeriesDraft = [];
let studentWorkoutList = [];
let editingMuscleId = null;
let editingVideoId = null;
let editingExerciseId = null;
let editingTechniqueId = null;
let editingDraftExerciseIndex = null;
let techniqueCatalog = [];
let studentExtraItems = [];
let extraStudentsCatalog = [];

// ===== Helpers =====
function clearEditFields() {
  if (training) training.value = "";
  if (diet) diet.value = "";
  if (supp) supp.value = "";
  if (cardioName) cardioName.value = "";
  if (cardioTime) cardioTime.value = "";
  if (cardioIntensity) cardioIntensity.value = "";
  if (cardioDays) cardioDays.value = "";
  if (exams) exams.value = "";
  if (stretch) stretch.value = "";
}

function getActiveEditDocPanel() {
  return document.querySelector(".editDocTab.active[data-doc-panel]")?.dataset?.docPanel || "training";
}

function updateTrainingModeUI() {
  const mode = trainingMode?.value || "pdf";
  const activePanel = getActiveEditDocPanel();
  const isTrainingPanel = activePanel === "training";

  if (pdfTrainingBox) {
    pdfTrainingBox.style.display = isTrainingPanel && mode === "pdf" ? "block" : "none";
  }

  if (manualTrainingBox) {
    manualTrainingBox.style.display = isTrainingPanel && mode === "manual" ? "block" : "none";
  }
}

function setEditDocPanel(name = "training") {
  document.querySelectorAll(".editDocTab[data-doc-panel]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.docPanel === name);
  });

  document.querySelectorAll(".editDocPanel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `doc-panel-${name}`);
  });

  updateTrainingModeUI();
}
function markSelectedRow(tr) {
  if (selectedRow) selectedRow.classList.remove("selected");
  selectedRow = tr;
  if (selectedRow) selectedRow.classList.add("selected");
}

function normalizeText(v) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function compareDatesDesc(a, b) {
  return new Date(pickDate(b) || 0) - new Date(pickDate(a) || 0);
}

function compareDatesAsc(a, b) {
  return new Date(pickDate(a) || 0) - new Date(pickDate(b) || 0);
}

function getEmailDomain(email) {
  const clean = String(email || "").trim().toLowerCase();
  const parts = clean.split("@");
  return parts[1] || "—";
}

function buildDomainSummary(users) {
  const map = new Map();

  for (const u of users || []) {
    const domain = getEmailDomain(u.email);
    map.set(domain, (map.get(domain) || 0) + 1);
  }

  return [...map.entries()]
    .map(([domain, total]) => ({ domain, total }))
    .sort((a, b) => b.total - a.total || a.domain.localeCompare(b.domain, "pt-BR"));
}

function applyDashboardExtraFilters(users) {
  let out = [...(users || [])];

  const status = dashStatus?.value || "all";
  const named = dashNamed?.value || "all";
  const text = normalizeText(dashText?.value || "");
  const sort = dashSort?.value || "recent";

  if (status === "active") {
    out = out.filter((u) => !!u.active);
  } else if (status === "inactive") {
    out = out.filter((u) => !u.active);
  }

  if (named === "with-name") {
    out = out.filter((u) => !!String(u.name || "").trim());
  } else if (named === "without-name") {
    out = out.filter((u) => !String(u.name || "").trim());
  }

  if (text) {
    out = out.filter((u) => {
      const name = normalizeText(u.name || "");
      const email = normalizeText(u.email || "");
      return name.includes(text) || email.includes(text);
    });
  }

  if (sort === "recent") out.sort(compareDatesDesc);
  if (sort === "oldest") out.sort(compareDatesAsc);
  if (sort === "name-asc") {
    out.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"));
  }
  if (sort === "name-desc") {
    out.sort((a, b) => String(b.name || "").localeCompare(String(a.name || ""), "pt-BR"));
  }
  if (sort === "email-asc") {
    out.sort((a, b) => String(a.email || "").localeCompare(String(b.email || ""), "pt-BR"));
  }

  return out;
}

async function selectUser(email, isActive, name = "") {
  if (studentEmail) studentEmail.value = email;
  if (studentName) studentName.value = name || "";
  if (active) active.checked = !!isActive;

  clearEditFields();

  const docs = await apiAdminGetDocs(token, email);
  if (training) training.value = docs.training || "";
  if (diet) diet.value = docs.diet || "";
  if (supp) supp.value = docs.supp || "";
  const cardioData = parseCardioPayload(docs.cardio);
  if (cardioName) cardioName.value = docs.cardioName || cardioData.name || "";
  if (cardioTime) cardioTime.value = docs.cardioTime || cardioData.time || "";
  if (cardioIntensity) cardioIntensity.value = docs.cardioIntensity || cardioData.intensity || "";
  if (cardioDays) cardioDays.value = docs.cardioDays || cardioData.days || "";
  if (exams) exams.value = docs.exams || "";
  if (stretch) stretch.value = docs.stretch || "";

  if (workoutStudentEmail) workoutStudentEmail.value = email;
  if (recordsStudentSelect) recordsStudentSelect.value = email;
  if (recordsEmail) recordsEmail.value = email;
  if (extraStudentEmail) extraStudentEmail.value = email;
  if (extraStudentSearch) extraStudentSearch.value = name || email;
  if (extraSelectedStudentBox) extraSelectedStudentBox.innerHTML = `<b>${escapeHtml(name || "Aluno selecionado")}</b><br><span>${escapeHtml(email)}</span>`;

  try {
    const manual = await apiAdminGetWorkouts(token, email);
    studentWorkoutList = Array.isArray(manual.workouts) ? manual.workouts : [];
    renderWorkoutList();
  } catch {
    studentWorkoutList = [];
    renderWorkoutList();
  }

  if (trainingMode) {
    trainingMode.value = studentWorkoutList.length ? "manual" : "pdf";
  }
  updateTrainingModeUI();
}

function renderUsers(users) {
  if (!userList) return;
  userList.innerHTML = "";

  if (!users || users.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="4" style="opacity:.7;padding:12px;">Nenhum aluno encontrado.</td>`;
    userList.appendChild(tr);
    return;
  }

  users.forEach((u) => {
    const tr = document.createElement("tr");
    const nm = (u.name || "").trim();

    tr.innerHTML = `
      <td style="width:92px;">${u.active ? "🟢" : "🔴"}</td>
      <td style="opacity:${nm ? 1 : 0.6};">${nm || "—"}</td>
      <td>${u.email}</td>
      <td style="width:120px;">
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button class="btnGhost" data-act="edit" title="Editar"
            style="padding:10px 12px; border-radius:14px; min-width:auto;">✎</button>
          <button class="btnGhost" data-act="del" title="Excluir"
            style="padding:10px 12px; border-radius:14px; min-width:auto;">🗑</button>
        </div>
      </td>
    `;

    tr.addEventListener("click", async () => {
      markSelectedRow(tr);
      try {
        await selectUser(u.email, u.active, u.name || "");
        toast("ok", "Aluno selecionado", "Dados carregados.");
        if (window.__setRoute) window.__setRoute("edit");
      } catch (e) {
        toast("error", "Erro", e.message || "Erro ao carregar documentos do aluno.");
      }
    });

    tr.querySelector('[data-act="edit"]')?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      tr.click();
    });

    tr.querySelector('[data-act="del"]')?.addEventListener("click", async (ev) => {
      ev.stopPropagation();

      const okConfirm = await openModal({
        title: "Deletar aluno",
        text: `Tem certeza que deseja deletar ${u.email}? Essa ação não pode ser desfeita.`,
        mode: "confirm",
        okText: "Deletar",
      });

      if (!okConfirm) return;

      try {
        await apiAdminDeleteUser(token, u.email);
        toast("ok", "Aluno deletado", "Conta removida com sucesso.");

        if ((studentEmail?.value || "").trim().toLowerCase() === u.email.toLowerCase()) {
          if (studentEmail) studentEmail.value = "";
          if (studentName) studentName.value = "";
          clearEditFields();
          studentWorkoutList = [];
          renderWorkoutList();
        }

        await refreshList();
      } catch (e) {
        toast("error", "Erro", e.message || "Erro ao deletar.");
      }
    });

    userList.appendChild(tr);
  });
}

async function refreshList() {
  const q = (search?.value || "").trim();
  const data = await apiAdminListUsers(token, q);
  renderUsers(data.users || []);
}

function buildMonthOptions(n = 24) {
  const now = new Date();
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
  const keys = [];

  for (let i = 0; i < n; i++) {
    keys.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() - 1);
  }

  return keys;
}

function fillMonthSelects() {
  if (!dashFrom || !dashTo) return;

  const keys = buildMonthOptions(24);
  const opts = keys.map((k) => `<option value="${k}">${monthLabel(k)}</option>`).join("");

  dashFrom.innerHTML = opts;
  dashTo.innerHTML = opts;

  const defaultTo = keys[0];
  const defaultFrom = keys[Math.min(5, keys.length - 1)];

  dashFrom.value = defaultFrom;
  dashTo.value = defaultTo;
}

function renderMonthly(rows) {
  if (!dashMonthlyBody) return;

  if (!rows || rows.length === 0) {
    dashMonthlyBody.innerHTML = `<tr><td colspan="4" style="opacity:.7;padding:12px;">—</td></tr>`;
    return;
  }

  dashMonthlyBody.innerHTML = rows
    .map(
      (r) => `
      <tr>
        <td>${monthLabel(r.key)}</td>
        <td>${r.total}</td>
        <td>${r.active}</td>
        <td>${r.inactive}</td>
      </tr>
    `
    )
    .join("");
}

// ===== DASHBOARD =====
async function loadDashboard() {
  if (!dashTotal || !dashMonthlyBody) return;

  try {
    dashTotal.textContent = "…";
    dashActive.textContent = "…";
    dashInactive.textContent = "…";
    if (dashPeriodNew) dashPeriodNew.textContent = "…";
    if (dashActivePct) dashActivePct.textContent = "—";
    if (dashInactivePct) dashInactivePct.textContent = "—";
    if (dashPeriodLabel) dashPeriodLabel.textContent = "—";

    dashMonthlyBody.innerHTML = `<tr><td colspan="4" style="opacity:.7;padding:12px;">Carregando...</td></tr>`;

    const data = await apiAdminListUsers(token, "");
    const users = data?.users || [];
    dashboardUsers = users;

    const totalBase = users.length;
    const fromKey = dashFrom?.value || monthKey(new Date());
    const toKey = dashTo?.value || monthKey(new Date());
    const keys = monthsBetween(fromKey, toKey);

    let periodUsers = users.filter((u) => {
      const d = pickDate(u);
      if (!d) return false;
      return keys.includes(monthKey(d));
    });

    periodUsers = applyDashboardExtraFilters(periodUsers);
    dashboardFilteredUsers = periodUsers;

    const filteredTotal = periodUsers.length;
    const activeCount = periodUsers.filter((u) => !!u.active).length;
    const inactiveCount = filteredTotal - activeCount;

    dashTotal.textContent = String(filteredTotal);
    dashActive.textContent = String(activeCount);
    dashInactive.textContent = String(inactiveCount);

    if (dashActivePct) dashActivePct.textContent = `${pct(activeCount, filteredTotal)} do total filtrado`;
    if (dashInactivePct) dashInactivePct.textContent = `${pct(inactiveCount, filteredTotal)} do total filtrado`;

    if (dashPeriodLabel) {
      dashPeriodLabel.textContent = `Período: ${monthLabel(keys[0])} → ${monthLabel(keys[keys.length - 1])}`;
    }

    if (dashPeriodNew) dashPeriodNew.textContent = String(filteredTotal);

    const monthly = keys.map((key) => {
      const inMonth = periodUsers.filter((u) => {
        const d = pickDate(u);
        if (!d) return false;
        return monthKey(d) === key;
      });

      const t = inMonth.length;
      const a = inMonth.filter((u) => !!u.active).length;

      return {
        key,
        total: t,
        active: a,
        inactive: t - a,
      };
    });

    dashboardMonthlyRows = monthly;

    dashboardFilterMeta = {
      fromKey,
      toKey,
      totalBase,
      filteredTotal,
      status: dashStatus?.value || "all",
      named: dashNamed?.value || "all",
      text: (dashText?.value || "").trim(),
      sort: dashSort?.value || "recent",
      domains: buildDomainSummary(periodUsers),
    };

    renderMonthly(monthly);
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao carregar dashboard.");
    if (dashMonthlyBody) {
      dashMonthlyBody.innerHTML = `<tr><td colspan="4" style="opacity:.7;padding:12px;">Erro ao carregar.</td></tr>`;
    }
  }
}

// ===== ME (Admin) =====
async function loadMe() {
  const footerAdminName = document.getElementById("footerAdminName");
  const footerAdminEmail = document.getElementById("footerAdminEmail");
  const adminAvatar = document.getElementById("adminAvatar");
  try {
    const data = await apiMe(token);

    if (!data?.user?.email) {
      toast("error", "Erro", "API /me não retornou um usuário válido.");
      return;
    }

    meSessionUser = data.user;

    if (meName) meName.value = (data.user.name || "").trim();
    if (meEmail) meEmail.value = (data.user.email || "").trim();
    if (who) who.textContent = data.user.email;
    if (mName) mName.textContent = data.user.name || "";

    if (mePass1) mePass1.value = "";
    if (mePass2) mePass2.value = "";

    if (footerAdminName) {
      footerAdminName.textContent = data.user.name || "Admin";
    }
    
    if (footerAdminEmail) {
      footerAdminEmail.textContent = data.user.email || "—";
    }
    
    if (adminAvatar) {
      const initials = (data.user.name || data.user.email || "RF")
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    
      adminAvatar.textContent = initials;
    }
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao carregar admin.");
  }
}

async function saveMe() {
  try {
    if (!meSessionUser) {
      await loadMe();
      if (!meSessionUser) {
        toast("error", "Erro", "Não foi possível carregar seu perfil para salvar.");
        return;
      }
    }

    const oldName = (meSessionUser.name || "").trim();
    const oldEmail = (meSessionUser.email || "").trim().toLowerCase();

    const name = (meName?.value || "").trim();
    const email = (meEmail?.value || "").trim().toLowerCase();

    const p1 = (mePass1?.value || "").trim();
    const p2 = (mePass2?.value || "").trim();

    if (!name || name.length < 2) {
      return toast("error", "Atenção", "Nome precisa ter no mínimo 2 caracteres.");
    }

    if (!email) {
      return toast("error", "Atenção", "Email inválido.");
    }

    const patch = {};
    if (name !== oldName) patch.name = name;
    if (email !== oldEmail) patch.email = email;

    const passwordChanged = !!(p1 || p2);

    if (passwordChanged) {
      if (p1.length < 6) return toast("error", "Senha fraca", "Use no mínimo 6 caracteres.");
      if (p1 !== p2) return toast("error", "Senha não confere", "Digite a mesma senha nos 2 campos.");
    }

    if (Object.keys(patch).length === 0 && !passwordChanged) {
      return toast("info", "Nada mudou", "Nenhuma alteração detectada.");
    }

    let updatedUser = meSessionUser;

    if (Object.keys(patch).length > 0) {
      const resp = await apiUpdateMe(token, patch);
      updatedUser = resp?.user || updatedUser;

      if (who) who.textContent = updatedUser.email || oldEmail;
      toast("ok", "Salvo", "Perfil atualizado.");
    }

    if (passwordChanged) {
      await apiUpdateMyPassword(token, p1);
      toast("ok", "Salvo", "Senha atualizada.");

      if (mePass1) mePass1.value = "";
      if (mePass2) mePass2.value = "";
    }

    await loadMe();

    if (email !== oldEmail) {
      toast("info", "Atenção", "Email alterado. Se der problema depois, faça login novamente.");
    }
  } catch (e) {
    const status = e?.status ? ` (HTTP ${e.status})` : "";
    toast("error", "Erro ao salvar", (e?.message || "Erro desconhecido") + status);
    console.error("saveMe error:", e);
  }
}

// ===== Events =====
logoutBtn?.addEventListener("click", () => {
  clearSession();
  window.location.href = "/pages/index.html";
});

createBtn?.addEventListener("click", async () => {
  const name = (newName?.value || "").trim();
  const email = (newEmail?.value || "").trim().toLowerCase();
  const password = (newPass?.value || "").trim();

  if (!name) return toast("error", "Atenção", "Preencha o nome do aluno.");
  if (!email || !password) return toast("error", "Atenção", "Preencha email e senha inicial.");

  try {
    await apiAdminCreateUser(token, email, password, !!newActive?.checked, name);
    toast("ok", "Aluno criado", "Conta criada com sucesso.");

    if (newName) newName.value = "";
    if (newEmail) newEmail.value = "";
    if (newPass) newPass.value = "";

    await refreshList().catch(() => {});
  } catch (e) {
    toast("error", "Erro ao criar", e.message || "Erro ao criar.");
  }
});

refreshBtn?.addEventListener("click", async () => {
  try {
    const r = sessionStorage.getItem("route") || "";

    if (r === "dash") {
      await loadDashboard();
      toast("ok", "Atualizado", "Dashboard carregado.");
    } else if (r === "me") {
      await loadMe();
      toast("ok", "Atualizado", "Dados do admin carregados.");
    } else {
      await refreshList();
      toast("ok", "Atualizado", "Lista carregada.");
    }
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao atualizar.");
  }
});

let searchTimer = null;

search?.addEventListener("input", () => {
  clearTimeout(searchTimer);

  searchTimer = setTimeout(async () => {
    try {
      await refreshList();
    } catch (e) {
      toast("error", "Erro", e.message || "Erro ao buscar alunos.");
    }
  }, 250);
});

saveBtn?.addEventListener("click", async () => {
  const em = (studentEmail?.value || "").trim().toLowerCase();
  if (!em) return toast("error", "Atenção", "Digite o email do aluno.");

  const nm = (studentName?.value || "").trim();
  const mode = trainingMode?.value || "pdf";

  const docs = {
    training: (training?.value || "").trim(),
    diet: (diet?.value || "").trim(),
    supp: (supp?.value || "").trim(),
    cardio: JSON.stringify(buildCardioPayload()),
    cardioName: (cardioName?.value || "").trim(),
    cardioTime: (cardioTime?.value || "").trim(),
    cardioIntensity: (cardioIntensity?.value || "").trim(),
    cardioDays: (cardioDays?.value || "").trim(),
    exams: (exams?.value || "").trim(),
    stretch: (stretch?.value || "").trim(),
  };

  try {
    await apiAdminUpdateProfile(token, em, { name: nm });
    await apiAdminSetActive(token, em, !!active?.checked);

    // Salva documentos sempre, mesmo quando o treino for manual.
    const saved = await apiAdminSaveDocs(token, em, docs);

    if (training) training.value = saved.training || "";
    if (diet) diet.value = saved.diet || "";
    if (supp) supp.value = saved.supp || "";
    const savedCardioData = parseCardioPayload(saved.cardio);
    if (cardioName) cardioName.value = saved.cardioName || savedCardioData.name || "";
    if (cardioTime) cardioTime.value = saved.cardioTime || savedCardioData.time || "";
    if (cardioIntensity) cardioIntensity.value = saved.cardioIntensity || savedCardioData.intensity || "";
    if (cardioDays) cardioDays.value = saved.cardioDays || savedCardioData.days || "";
    if (exams) exams.value = saved.exams || "";
    if (stretch) stretch.value = saved.stretch || "";

    // Se o treino for manual, salva os treinos também.
    if (mode === "manual") {
      await apiAdminSaveWorkouts(token, em, studentWorkoutList);
    }

    toast(
      "ok",
      "Salvo",
      mode === "manual" ? "Treino manual e documentos salvos." : "Links/PDFs salvos."
    );

    await refreshList().catch(() => {});
  } catch (e) {
    toast("error", "Erro ao salvar", e.message || "Erro ao salvar.");
  }
});

resetBtn?.addEventListener("click", async () => {
  const em = (studentEmail?.value || "").trim().toLowerCase();
  if (!em) return toast("error", "Atenção", "Digite o email do aluno.");

  const val = await openModal({
    title: "Reset de senha",
    text: `Defina uma nova senha para ${em}.`,
    mode: "prompt",
    placeholder: "Mínimo 6 caracteres",
    okText: "Resetar",
  });

  if (!val) return;
  if (val.length < 6) return toast("error", "Senha fraca", "Use no mínimo 6 caracteres.");

  try {
    await apiAdminResetPassword(token, em, val);
    toast("ok", "Senha resetada", "Nova senha definida com sucesso.");
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao resetar senha.");
  }
});

deleteBtn?.addEventListener("click", async () => {
  const em = (studentEmail?.value || "").trim().toLowerCase();
  if (!em) return toast("error", "Atenção", "Digite o email do aluno.");

  const okConfirm = await openModal({
    title: "Deletar aluno",
    text: `Tem certeza que deseja deletar ${em}? Essa ação não pode ser desfeita.`,
    mode: "confirm",
    okText: "Deletar",
  });

  if (!okConfirm) return;

  try {
    await apiAdminDeleteUser(token, em);
    toast("ok", "Aluno deletado", "Conta removida com sucesso.");

    if (studentEmail) studentEmail.value = "";
    if (studentName) studentName.value = "";
    clearEditFields();

    await refreshList().catch(() => {});
    if (window.__setRoute) window.__setRoute("list");
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao deletar.");
  }
});

// Dashboard events
dashApplyBtn?.addEventListener("click", async () => {
  await loadDashboard();
  toast("ok", "Filtro aplicado", "Relatório atualizado.");
});

dashRefreshBtn?.addEventListener("click", async () => {
  await loadDashboard();
  toast("ok", "Atualizado", "Dashboard carregado.");
});

dashStatus?.addEventListener("change", loadDashboard);
dashNamed?.addEventListener("change", loadDashboard);
dashSort?.addEventListener("change", loadDashboard);

let dashTextTimer = null;
dashText?.addEventListener("input", () => {
  clearTimeout(dashTextTimer);
  dashTextTimer = setTimeout(() => {
    loadDashboard();
  }, 250);
});

dashPdfBtn?.addEventListener("click", () => {
  const html = buildDashboardPrintHTML({
    periodLabel: dashPeriodLabel?.textContent || "",
    total: Number(dashTotal?.textContent || 0),
    active: Number(dashActive?.textContent || 0),
    inactive: Number(dashInactive?.textContent || 0),
    periodNew: Number(dashPeriodNew?.textContent || 0),
    users: dashboardFilteredUsers,
    monthlyRows: dashboardMonthlyRows,
    filterMeta: dashboardFilterMeta,
  });

  const w = window.open("", "_blank");
  if (!w) return toast("error", "Popup bloqueado", "Permita popups para gerar o PDF.");

  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
});

// ME events
meRefreshBtn?.addEventListener("click", async () => {
  await loadMe();
  toast("ok", "Atualizado", "Dados do admin carregados.");
});

meSaveBtn?.addEventListener("click", async () => {
  await saveMe();
});

trainingMode?.addEventListener("change", async () => {
  updateTrainingModeUI();

  if (trainingMode.value === "manual") {
    await refreshExercises().catch(() => {});
    await refreshTechniques().catch(() => {});

    const em = (studentEmail?.value || "").trim().toLowerCase();
    if (em) {
      if (workoutStudentEmail) workoutStudentEmail.value = em;
      if (!studentWorkoutList.length) {
        await workoutLoadBtn?.click?.();
      }
    }
  }
});



document.querySelectorAll(".editDocTab[data-doc-panel]").forEach((btn) => {
  btn.addEventListener("click", () => {
    setEditDocPanel(btn.dataset.docPanel || "training");
  });
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatSeriesLabel(s) {
  if (!s) return "";

  const count = s.count ?? s.seriesCount ?? null;
  const reps = s.reps || s.repetitions || s.targetReps || "";

  if (count && reps && !String(reps).toLowerCase().includes(`${count}x`)) {
    return `${count}x ${reps}`;
  }

  return String(reps || "").trim();
}

function cleanRepsLabel(value) {
  return String(value || "").replace(/^\s*\d+\s*x\s*/i, "").trim();
}

function buildCardioPayload() {
  return {
    type: "written",
    name: (cardioName?.value || "").trim(),
    time: (cardioTime?.value || "").trim(),
    intensity: (cardioIntensity?.value || "").trim(),
    days: (cardioDays?.value || "").trim(),
  };
}

function parseCardioPayload(value) {
  try {
    const parsed = JSON.parse(String(value || ""));
    if (parsed && typeof parsed === "object") return parsed;
  } catch {}

  return {};
}

function updateWorkoutExerciseButtonState() {
  if (!workoutExerciseAddBtn) return;
  workoutExerciseAddBtn.textContent = editingDraftExerciseIndex !== null
    ? "Atualizar exercício"
    : "Adicionar exercício ao treino";
}

function renderCurrentSeries() {
  if (!currentSeriesBox) return;

  if (!currentSeriesDraft.length) {
    currentSeriesBox.innerHTML = "Nenhuma série adicionada.";
    return;
  }

  currentSeriesBox.innerHTML = currentSeriesDraft
    .map((s, idx) => `
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin:6px 0;">
        <span><b>Bloco ${idx + 1}:</b> ${escapeHtml(formatSeriesLabel(s))}</span>
        <button class="btnGhost" type="button" data-remove-series="${idx}" style="padding:6px 10px;min-width:auto;">Remover</button>
      </div>
    `)
    .join("");

  currentSeriesBox.querySelectorAll("[data-remove-series]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.removeSeries);
      currentSeriesDraft.splice(idx, 1);
      currentSeriesDraft = currentSeriesDraft.map((s, i) => ({ ...s, order: i }));
      renderCurrentSeries();
    });
  });
}

function resetExerciseDraft() {
  editingDraftExerciseIndex = null;
  currentSeriesDraft = [];
  if (seriesCount) seriesCount.value = "";
  if (seriesTargetReps) seriesTargetReps.value = "";
  if (workoutExerciseNotes) workoutExerciseNotes.value = "";
  if (workoutTechniqueSelect) workoutTechniqueSelect.value = "";
  if (workoutTechniqueNote) workoutTechniqueNote.value = "";
  if (workoutExerciseOrder) workoutExerciseOrder.value = String(workoutDraftExercises.length);
  renderCurrentSeries();
  updateWorkoutExerciseButtonState();
}

function resetWorkoutDraft() {
  editingDraftExerciseIndex = null;
  workoutDraftExercises = [];
  currentSeriesDraft = [];
  if (workoutTitle) workoutTitle.value = "";
  if (workoutNotes) workoutNotes.value = "";
  if (workoutOrder) workoutOrder.value = String(studentWorkoutList.length);
  if (workoutActive) workoutActive.checked = true;
  if (workoutExerciseOrder) workoutExerciseOrder.value = "0";
  if (workoutExerciseNotes) workoutExerciseNotes.value = "";
  if (workoutTechniqueSelect) workoutTechniqueSelect.value = "";
  if (workoutTechniqueNote) workoutTechniqueNote.value = "";
  if (seriesCount) seriesCount.value = "";
  if (seriesTargetReps) seriesTargetReps.value = "";
  renderCurrentSeries();
  renderWorkoutDraft();
  updateWorkoutExerciseButtonState();
}

function renderWorkoutDraft() {
  if (!workoutDraftBox) return;

  if (!workoutDraftExercises.length) {
    workoutDraftBox.innerHTML = "Nenhum exercício adicionado ao treino atual.";
    return;
  }

  workoutDraftBox.innerHTML = workoutDraftExercises
    .map((ex, idx) => `
      <div style="border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:10px;margin:8px 0;">
        <div style="display:flex;justify-content:space-between;gap:10px;">
          <div>
            <b>${idx + 1}. ${escapeHtml(ex.name)}</b>
            <div>${escapeHtml(ex.muscleGroup || "Sem agrupamento")}${ex.videoUrl ? " · vídeo vinculado" : ""}</div>
            ${ex.notes ? `<div style="margin-top:6px;">Obs.: ${escapeHtml(ex.notes)}</div>` : ""}
            ${ex.techniqueName ? `<div style="margin-top:6px;"><b>Técnica:</b> ${escapeHtml(ex.techniqueName)}${ex.techniqueNote ? ` · ${escapeHtml(ex.techniqueNote)}` : ""}</div>` : ""}
            <div style="margin-top:6px;">Séries: ${ex.series.map((s) => escapeHtml(formatSeriesLabel(s))).join(" · ")}</div>
          </div>
          <div style="display:flex;gap:8px;height:max-content;flex-wrap:wrap;justify-content:flex-end;">
            <button class="btnGhost" type="button" data-edit-draft-ex="${idx}" style="padding:8px 10px;min-width:auto;">Editar</button>
            <button class="btnGhost" type="button" data-remove-draft-ex="${idx}" style="padding:8px 10px;min-width:auto;">Remover</button>
          </div>
        </div>
      </div>
    `)
    .join("");

  workoutDraftBox.querySelectorAll("[data-edit-draft-ex]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.editDraftEx);
      const ex = workoutDraftExercises[idx];
      if (!ex) return;

      editingDraftExerciseIndex = idx;

      const found = workoutCatalogExercises.find((item) => {
        const itemId = String(item.id || "");
        const exId = String(ex.exerciseId || "");
        const itemName = String(item.name || "").trim().toLowerCase();
        const exName = String(ex.name || "").trim().toLowerCase();
        return (exId && itemId === exId) || itemName === exName;
      });

      if (workoutExerciseSelect) {
        workoutExerciseSelect.value = found?.id || ex.exerciseId || "";
      }

      if (workoutExerciseOrder) workoutExerciseOrder.value = String(ex.order ?? idx);
      if (workoutExerciseNotes) workoutExerciseNotes.value = ex.notes || "";
      if (workoutTechniqueSelect) workoutTechniqueSelect.value = ex.techniqueId || "";
      if (workoutTechniqueNote) workoutTechniqueNote.value = ex.techniqueNote || "";

      currentSeriesDraft = Array.isArray(ex.series)
        ? ex.series.map((s, i) => ({
            count: Number(s.count || s.seriesCount || 1),
            reps: String(s.reps || s.targetReps || ""),
            targetReps: String(s.targetReps || s.reps || ""),
            order: Number(s.order ?? i),
          }))
        : [];

      renderCurrentSeries();
      updateWorkoutExerciseButtonState();
      toast("info", "Exercício carregado", "Edite os dados e clique em Atualizar exercício.");
    });
  });

  workoutDraftBox.querySelectorAll("[data-remove-draft-ex]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.removeDraftEx);
      workoutDraftExercises.splice(idx, 1);
      workoutDraftExercises = workoutDraftExercises.map((ex, i) => ({ ...ex, order: i }));
      if (editingDraftExerciseIndex === idx) {
        resetExerciseDraft();
      } else if (editingDraftExerciseIndex !== null && editingDraftExerciseIndex > idx) {
        editingDraftExerciseIndex -= 1;
      }
      if (workoutExerciseOrder) workoutExerciseOrder.value = String(workoutDraftExercises.length);
      renderWorkoutDraft();
    });
  });
}

function updateWorkoutOrdersFromList() {
  studentWorkoutList = studentWorkoutList.map((w, i) => ({ ...w, order: i }));
  if (workoutOrder) workoutOrder.value = String(studentWorkoutList.length);
}

function renderWorkoutList() {
  if (!workoutListBox) return;

  updateWorkoutOrdersFromList();

  if (!studentWorkoutList.length) {
    workoutListBox.innerHTML = "Nenhum treino manual cadastrado para este aluno.";
    return;
  }

  workoutListBox.innerHTML = studentWorkoutList
    .map((w, idx) => `
      <div draggable="true" data-workout-index="${idx}" style="border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:12px;margin:10px 0;cursor:grab;background:rgba(255,255,255,.025);">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div>
            <b>☰ ${idx + 1}. ${escapeHtml(w.title || `Treino ${idx + 1}`)}</b>
            <div>${w.active === false ? "Inativo" : "Ativo"} · ${w.exercises?.length || 0} exercício(s)</div>
            ${w.notes ? `<div style="margin-top:6px;">Obs.: ${escapeHtml(w.notes)}</div>` : ""}
          </div>
          <div style="display:flex;gap:8px;height:max-content;">
            <button class="btnGhost" type="button" data-edit-workout="${idx}" style="padding:8px 10px;min-width:auto;">Editar</button>
            <button class="btnGhost" type="button" data-remove-workout="${idx}" style="padding:8px 10px;min-width:auto;">Remover</button>
          </div>
        </div>
        <div style="margin-top:8px;">
          ${(w.exercises || []).map((ex, exIdx) => `
            <div style="margin:6px 0;">
              ${exIdx + 1}. ${escapeHtml(ex.name)} — ${(ex.series || []).map((s) => escapeHtml(formatSeriesLabel(s))).join(" · ")}
            </div>
          `).join("")}
        </div>
      </div>
    `)
    .join("");

  let draggedIndex = null;

  workoutListBox.querySelectorAll("[data-workout-index]").forEach((card) => {
    card.addEventListener("dragstart", (ev) => {
      draggedIndex = Number(card.dataset.workoutIndex);
      card.style.opacity = "0.55";
      ev.dataTransfer.effectAllowed = "move";
    });

    card.addEventListener("dragend", () => {
      card.style.opacity = "1";
      draggedIndex = null;
    });

    card.addEventListener("dragover", (ev) => {
      ev.preventDefault();
      card.style.borderColor = "rgba(206,172,94,.85)";
    });

    card.addEventListener("dragleave", () => {
      card.style.borderColor = "rgba(255,255,255,.10)";
    });

    card.addEventListener("drop", (ev) => {
      ev.preventDefault();
      card.style.borderColor = "rgba(255,255,255,.10)";

      const targetIndex = Number(card.dataset.workoutIndex);
      if (draggedIndex === null || Number.isNaN(targetIndex) || draggedIndex === targetIndex) return;

      const [moved] = studentWorkoutList.splice(draggedIndex, 1);
      studentWorkoutList.splice(targetIndex, 0, moved);
      updateWorkoutOrdersFromList();
      renderWorkoutList();
      toast("ok", "Ordem alterada", "Clique em Salvar treinos manuais para gravar.");
    });
  });

  workoutListBox.querySelectorAll("[data-remove-workout]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.removeWorkout);
      studentWorkoutList.splice(idx, 1);
      updateWorkoutOrdersFromList();
      renderWorkoutList();
    });
  });

  workoutListBox.querySelectorAll("[data-edit-workout]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.editWorkout);
      const w = studentWorkoutList[idx];
      if (!w) return;

      if (workoutTitle) workoutTitle.value = w.title || "";
      if (workoutNotes) workoutNotes.value = w.notes || "";
      if (workoutOrder) workoutOrder.value = String(w.order ?? idx);
      if (workoutActive) workoutActive.checked = w.active !== false;

      editingDraftExerciseIndex = null;
      updateWorkoutExerciseButtonState();
      workoutDraftExercises = Array.isArray(w.exercises) ? JSON.parse(JSON.stringify(w.exercises)) : [];
      studentWorkoutList.splice(idx, 1);
      updateWorkoutOrdersFromList();
      renderWorkoutDraft();
      renderWorkoutList();
      toast("info", "Treino carregado para edição", "Ajuste e adicione novamente à lista do aluno.");
    });
  });
}

function selectedWorkoutExerciseData() {
  const id = workoutExerciseSelect?.value || "";
  const found = workoutCatalogExercises.find((e) => String(e.id || "") === String(id));

  if (found) {
    return {
      exerciseId: found.id || "",
      name: found.name || "",
      muscleGroup: found.muscleGroup || found.muscleGroupName || found.muscleGroup?.name || "",
      videoUrl: found.videoUrl || found.video?.url || "",
      videoTitle: found.videoTitle || found.video?.title || "",
    };
  }

  const label = workoutExerciseSelect?.selectedOptions?.[0]?.textContent || "";
  return { exerciseId: "", name: label.trim(), muscleGroup: "", videoUrl: "", videoTitle: "" };
}

seriesAddBtn?.addEventListener("click", () => {
  const count = Number(seriesCount?.value || 0);
  const reps = (seriesTargetReps?.value || "").trim();

  if (!count || count < 1) return toast("error", "Atenção", "Informe a quantidade de séries.");
  if (!reps) return toast("error", "Atenção", "Informe as repetições.");

  currentSeriesDraft.push({
    count,
    reps,
    targetReps: reps,
    order: currentSeriesDraft.length,
  });

  if (seriesCount) seriesCount.value = "";
  if (seriesTargetReps) seriesTargetReps.value = "";
  renderCurrentSeries();
});

seriesClearBtn?.addEventListener("click", () => {
  currentSeriesDraft = [];
  if (seriesCount) seriesCount.value = "";
  if (seriesTargetReps) seriesTargetReps.value = "";
  renderCurrentSeries();
});

workoutExerciseAddBtn?.addEventListener("click", () => {
  const ex = selectedWorkoutExerciseData();

  if (!ex.name) return toast("error", "Atenção", "Selecione um exercício cadastrado.");
  if (!currentSeriesDraft.length) return toast("error", "Atenção", "Adicione pelo menos uma série para este exercício.");

  const payloadExercise = {
    exerciseId: ex.exerciseId || "",
    name: ex.name,
    muscleGroup: ex.muscleGroup || "",
    videoUrl: ex.videoUrl || "",
    videoTitle: ex.videoTitle || ex.name,
    notes: (workoutExerciseNotes?.value || "").trim(),
    techniqueId: (workoutTechniqueSelect?.value || "").trim(),
    techniqueName: workoutTechniqueSelect?.selectedOptions?.[0]?.textContent?.trim() || "",
    techniqueNote: (workoutTechniqueNote?.value || "").trim(),
    order: Number(workoutExerciseOrder?.value || workoutDraftExercises.length),
    series: currentSeriesDraft.map((s, i) => ({
      count: Number(s.count || 1),
      reps: s.reps || s.targetReps || "",
      targetReps: s.targetReps || s.reps || formatSeriesLabel(s),
      order: i,
    })),
  };

  if (editingDraftExerciseIndex !== null && workoutDraftExercises[editingDraftExerciseIndex]) {
    workoutDraftExercises[editingDraftExerciseIndex] = payloadExercise;
    toast("ok", "Exercício atualizado", "O exercício do treino em montagem foi atualizado.");
  } else {
    workoutDraftExercises.push(payloadExercise);
    toast("ok", "Exercício adicionado", "Agora você pode adicionar outro exercício ou finalizar o treino.");
  }

  workoutDraftExercises.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  resetExerciseDraft();
  renderWorkoutDraft();
});

workoutDraftClearBtn?.addEventListener("click", () => {
  resetWorkoutDraft();
});

workoutAddBtn?.addEventListener("click", () => {
  const title = (workoutTitle?.value || "").trim();
  if (!title) return toast("error", "Atenção", "Informe o nome do treino.");
  if (!workoutDraftExercises.length) return toast("error", "Atenção", "Adicione pelo menos um exercício ao treino.");

  studentWorkoutList.push({
    title,
    notes: (workoutNotes?.value || "").trim(),
    active: workoutActive ? !!workoutActive.checked : true,
    order: Number(workoutOrder?.value || studentWorkoutList.length),
    exercises: workoutDraftExercises.map((ex, i) => ({
      ...ex,
      order: Number(ex.order ?? i),
      series: (ex.series || []).map((s, si) => ({ ...s, order: Number(s.order ?? si) })),
    })),
  });

  studentWorkoutList.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  renderWorkoutList();
  resetWorkoutDraft();
  toast("ok", "Treino adicionado", "Não esqueça de clicar em Salvar treinos manuais.");
});


function resetMuscleEdit() {
  editingMuscleId = null;
  if (muscleName) muscleName.value = "";
  if (muscleSaveBtn) muscleSaveBtn.textContent = "Cadastrar agrupamento";
  if (muscleCancelEditBtn) muscleCancelEditBtn.style.display = "none";
}

function resetVideoEdit() {
  editingVideoId = null;
  if (videoTitle) videoTitle.value = "";
  if (videoUrl) videoUrl.value = "";
  if (videoSaveBtn) videoSaveBtn.textContent = "Cadastrar vídeo";
  if (videoCancelEditBtn) videoCancelEditBtn.style.display = "none";
}

function resetExerciseEdit() {
  editingExerciseId = null;
  if (exerciseName) exerciseName.value = "";
  if (exerciseMuscleSelect) exerciseMuscleSelect.value = "";
  if (exerciseVideoSelect) exerciseVideoSelect.value = "";
  if (exerciseSaveBtn) exerciseSaveBtn.textContent = "Cadastrar exercício";
  if (exerciseCancelEditBtn) exerciseCancelEditBtn.style.display = "none";
}

async function refreshMuscleGroups() {
  const data = await apiAdminListMuscleGroups(token);
  const items = data.muscleGroups || [];

  if (muscleListBox) {
    muscleListBox.innerHTML = items.length
      ? items.map((m) => `
        <div class="smallHint" style="display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;margin:8px 0;">
          <b>${escapeHtml(m.name)}</b>
          <span style="display:flex;gap:8px;">
            <button class="btnGhost" type="button" data-edit-muscle="${escapeHtml(m.id)}" data-name="${escapeHtml(m.name)}" style="padding:6px 10px;min-width:auto;">Editar</button>
            <button class="btnGhost" type="button" data-delete-muscle="${escapeHtml(m.id)}" style="padding:6px 10px;min-width:auto;">Excluir</button>
          </span>
        </div>
      `).join("")
      : `<div class="smallHint">Nenhum agrupamento cadastrado.</div>`;

    muscleListBox.querySelectorAll("[data-edit-muscle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        editingMuscleId = btn.dataset.editMuscle;
        if (muscleName) muscleName.value = btn.dataset.name || "";
        if (muscleSaveBtn) muscleSaveBtn.textContent = "Salvar alteração";
        if (muscleCancelEditBtn) muscleCancelEditBtn.style.display = "inline-flex";
      });
    });

    muscleListBox.querySelectorAll("[data-delete-muscle]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ok = await openModal({ title: "Excluir agrupamento", text: "Excluir este agrupamento? Exercícios vinculados ficarão sem agrupamento.", mode: "confirm", okText: "Excluir" });
        if (!ok) return;
        try {
          await apiAdminDeleteMuscleGroup(token, btn.dataset.deleteMuscle);
          resetMuscleEdit();
          await refreshMuscleGroups();
          await refreshExercises().catch(() => {});
          toast("ok", "Agrupamento excluído", "Lista atualizada.");
        } catch (e) {
          toast("error", "Erro", e.message || "Erro ao excluir agrupamento.");
        }
      });
    });
  }

  if (exerciseMuscleSelect) {
    exerciseMuscleSelect.innerHTML = `<option value="">Sem agrupamento</option>` + items.map((m) => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`).join("");
  }
}

async function refreshVideos() {
  const data = await apiAdminListVideos(token);
  const items = data.videos || [];

  if (videoListBox) {
    videoListBox.innerHTML = items.length
      ? items.map((v) => `
        <div class="smallHint" style="display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;margin:8px 0;">
          <span><b>${escapeHtml(v.title)}</b>${v.url ? ` · ${escapeHtml(v.url)}` : ""}</span>
          <span style="display:flex;gap:8px;">
            <button class="btnGhost" type="button" data-edit-video="${escapeHtml(v.id)}" data-title="${escapeHtml(v.title)}" data-url="${escapeHtml(v.url || "")}" style="padding:6px 10px;min-width:auto;">Editar</button>
            <button class="btnGhost" type="button" data-delete-video="${escapeHtml(v.id)}" style="padding:6px 10px;min-width:auto;">Excluir</button>
          </span>
        </div>
      `).join("")
      : `<div class="smallHint">Nenhum vídeo cadastrado.</div>`;

    videoListBox.querySelectorAll("[data-edit-video]").forEach((btn) => {
      btn.addEventListener("click", () => {
        editingVideoId = btn.dataset.editVideo;
        if (videoTitle) videoTitle.value = btn.dataset.title || "";
        if (videoUrl) videoUrl.value = btn.dataset.url || "";
        if (videoSaveBtn) videoSaveBtn.textContent = "Salvar alteração";
        if (videoCancelEditBtn) videoCancelEditBtn.style.display = "inline-flex";
      });
    });

    videoListBox.querySelectorAll("[data-delete-video]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ok = await openModal({ title: "Excluir vídeo", text: "Excluir este vídeo? Exercícios vinculados ficarão sem vídeo.", mode: "confirm", okText: "Excluir" });
        if (!ok) return;
        try {
          await apiAdminDeleteVideo(token, btn.dataset.deleteVideo);
          resetVideoEdit();
          await refreshVideos();
          await refreshExercises().catch(() => {});
          toast("ok", "Vídeo excluído", "Lista atualizada.");
        } catch (e) {
          toast("error", "Erro", e.message || "Erro ao excluir vídeo.");
        }
      });
    });
  }

  if (exerciseVideoSelect) {
    exerciseVideoSelect.innerHTML = `<option value="">Sem vídeo</option>` + items.map((v) => `<option value="${escapeHtml(v.id)}" data-url="${escapeHtml(v.url)}" data-title="${escapeHtml(v.title)}">${escapeHtml(v.title)}</option>`).join("");
  }
}

async function refreshExercises() {
  const data = await apiAdminListExercises(token, "");
  const items = data.exercises || [];
  workoutCatalogExercises = items;

  if (exerciseListBox) {
    exerciseListBox.innerHTML = items.length
      ? items.map((e) => `
        <div class="smallHint" style="display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;margin:8px 0;">
          <span><b>${escapeHtml(e.name)}</b>${e.muscleGroup ? ` · ${escapeHtml(e.muscleGroup)}` : ""}${e.videoUrl ? " · vídeo ok" : ""}</span>
          <span style="display:flex;gap:8px;">
            <button class="btnGhost" type="button" data-edit-exercise="${escapeHtml(e.id)}" style="padding:6px 10px;min-width:auto;">Editar</button>
            <button class="btnGhost" type="button" data-delete-exercise="${escapeHtml(e.id)}" style="padding:6px 10px;min-width:auto;">Excluir</button>
          </span>
        </div>
      `).join("")
      : `<div class="smallHint">Nenhum exercício cadastrado.</div>`;

    exerciseListBox.querySelectorAll("[data-edit-exercise]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.editExercise;
        const ex = workoutCatalogExercises.find((item) => String(item.id) === String(id));
        if (!ex) return;
        editingExerciseId = id;
        if (exerciseName) exerciseName.value = ex.name || "";
        if (exerciseMuscleSelect) exerciseMuscleSelect.value = ex.muscleGroup || "";
        if (exerciseVideoSelect) {
          const option = [...exerciseVideoSelect.options].find((o) => (o.dataset.url || "") === (ex.videoUrl || "") || (o.dataset.title || "") === (ex.videoTitle || ""));
          exerciseVideoSelect.value = option?.value || "";
        }
        if (exerciseSaveBtn) exerciseSaveBtn.textContent = "Salvar alteração";
        if (exerciseCancelEditBtn) exerciseCancelEditBtn.style.display = "inline-flex";
      });
    });

    exerciseListBox.querySelectorAll("[data-delete-exercise]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ok = await openModal({ title: "Excluir exercício", text: "Excluir este exercício? Se ele já estiver em treinos antigos, a exclusão pode ser bloqueada.", mode: "confirm", okText: "Excluir" });
        if (!ok) return;
        try {
          await apiAdminDeleteExercise(token, btn.dataset.deleteExercise);
          resetExerciseEdit();
          await refreshExercises();
          toast("ok", "Exercício excluído", "Lista atualizada.");
        } catch (e) {
          toast("error", "Erro", e.message || "Erro ao excluir exercício.");
        }
      });
    });
  }

  if (workoutExerciseSelect) {
    workoutExerciseSelect.innerHTML = items.length
      ? items.map((e) => `<option value="${escapeHtml(e.id || e.name)}">${escapeHtml(e.name)}${e.muscleGroup ? ` · ${escapeHtml(e.muscleGroup)}` : ""}</option>`).join("")
      : `<option value="">Cadastre exercícios primeiro</option>`;
  }
}

muscleSaveBtn?.addEventListener("click", async () => {
  const name = (muscleName?.value || "").trim();
  if (!name) return toast("error", "Atenção", "Informe o nome do agrupamento muscular.");
  try {
    if (editingMuscleId) {
      await apiAdminUpdateMuscleGroup(token, editingMuscleId, { name });
      toast("ok", "Agrupamento atualizado", "Lista atualizada.");
    } else {
      await apiAdminCreateMuscleGroup(token, name);
      toast("ok", "Agrupamento salvo", "Lista atualizada.");
    }
    resetMuscleEdit();
    await refreshMuscleGroups();
    await refreshExercises().catch(() => {});
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao salvar agrupamento.");
  }
});

muscleCancelEditBtn?.addEventListener("click", resetMuscleEdit);

muscleRefreshBtn?.addEventListener("click", async () => {
  await refreshMuscleGroups();
  toast("ok", "Atualizado", "Agrupamentos carregados.");
});

videoSaveBtn?.addEventListener("click", async () => {
  const title = (videoTitle?.value || "").trim();
  const url = (videoUrl?.value || "").trim();
  if (!title || !url) return toast("error", "Atenção", "Informe o título e o link do vídeo.");
  try {
    if (editingVideoId) {
      await apiAdminUpdateVideo(token, editingVideoId, { title, url });
      toast("ok", "Vídeo atualizado", "Banco de vídeos atualizado.");
    } else {
      await apiAdminCreateVideo(token, { title, url });
      toast("ok", "Vídeo salvo", "Banco de vídeos atualizado.");
    }
    resetVideoEdit();
    await refreshVideos();
    await refreshExercises().catch(() => {});
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao salvar vídeo.");
  }
});

videoCancelEditBtn?.addEventListener("click", resetVideoEdit);

videoRefreshBtn?.addEventListener("click", async () => {
  await refreshVideos();
  toast("ok", "Atualizado", "Vídeos carregados.");
});

exerciseSaveBtn?.addEventListener("click", async () => {
  const name = (exerciseName?.value || "").trim();
  const muscleGroup = exerciseMuscleSelect?.value || "";
  const selectedVideo = exerciseVideoSelect?.selectedOptions?.[0];
  const videoUrlValue = selectedVideo?.dataset?.url || "";
  const videoTitleValue = selectedVideo?.dataset?.title || name;

  if (!name) return toast("error", "Atenção", "Informe o nome do exercício.");

  try {
    if (editingExerciseId) {
      await apiAdminUpdateExercise(token, editingExerciseId, { name, muscleGroup, videoUrl: videoUrlValue, videoTitle: videoTitleValue });
      toast("ok", "Exercício atualizado", "Banco de exercícios atualizado.");
    } else {
      await apiAdminCreateExercise(token, { name, muscleGroup, videoUrl: videoUrlValue, videoTitle: videoTitleValue });
      toast("ok", "Exercício salvo", "Banco de exercícios atualizado.");
    }
    resetExerciseEdit();
    await refreshExercises();
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao salvar exercício.");
  }
});

exerciseCancelEditBtn?.addEventListener("click", resetExerciseEdit);

exerciseListBtn?.addEventListener("click", async () => {
  await refreshExercises();
  toast("ok", "Atualizado", "Exercícios carregados.");
});

workoutLoadBtn?.addEventListener("click", async () => {
  const em = (workoutStudentEmail?.value || studentEmail?.value || "").trim().toLowerCase();
  if (!em) return toast("error", "Atenção", "Informe o email do aluno.");

  try {
    await refreshExercises();
    await refreshTechniques().catch(() => {});
    const manual = await apiAdminGetWorkouts(token, em);
    studentWorkoutList = Array.isArray(manual.workouts) ? manual.workouts : [];
    renderWorkoutList();
    resetWorkoutDraft();
    toast("ok", "Treinos carregados", "Treinos manuais atualizados na tela.");
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao carregar treinos.");
  }
});

workoutSaveBtn?.addEventListener("click", async () => {
  const em = (workoutStudentEmail?.value || studentEmail?.value || "").trim().toLowerCase();
  if (!em) return toast("error", "Atenção", "Informe o email do aluno.");

  try {
    const cleanWorkouts = studentWorkoutList.map((w, wi) => ({
      title: String(w.title || `Treino ${wi + 1}`).trim(),
      notes: w.notes || "",
      active: w.active !== false,
      order: Number(w.order ?? wi),
      exercises: (w.exercises || []).map((ex, ei) => ({
        exerciseId: ex.exerciseId || null,
        name: String(ex.name || "").trim(),
        muscleGroup: ex.muscleGroup || "",
        videoUrl: ex.videoUrl || "",
        videoTitle: ex.videoTitle || ex.name || "",
        notes: ex.notes || "",
        techniqueId: ex.techniqueId || null,
        techniqueNote: ex.techniqueNote || "",
        order: Number(ex.order ?? ei),
        series: (ex.series || []).map((serie, si) => ({
          count: Math.max(1, Number(serie.count || 1)),
          reps: cleanRepsLabel(serie.reps || serie.targetReps || ""),
          targetReps: cleanRepsLabel(serie.reps || serie.targetReps || ""),
          order: Number(serie.order ?? si),
        })),
      })),
    }));

    await apiAdminSaveWorkouts(token, em, cleanWorkouts);
    studentWorkoutList = cleanWorkouts;
    renderWorkoutList();
    toast("ok", "Treinos salvos", "Treinos manuais do aluno atualizados.");
  } catch (e) {
    toast("error", "Erro ao salvar", e.message || "Erro ao salvar treinos.");
  }
});





function ensureRecordsStudentSelect() {
  if (recordsStudentSelect) {
    recordsStudentSelect.addEventListener("change", async () => {
      selectedRecordsStudentEmail = String(recordsStudentSelect.value || "").trim().toLowerCase();
      await loadWorkoutRecords();
    });
    return recordsStudentSelect;
  }

  if (!recordsEmail) return null;

  const select = document.createElement("select");
  select.id = "recordsStudentSelect";
  select.innerHTML = `<option value="">Selecione um aluno</option>`;

  recordsEmail.replaceWith(select);
  recordsStudentSelect = select;

  recordsStudentSelect.addEventListener("change", async () => {
    selectedRecordsStudentEmail = String(recordsStudentSelect.value || "").trim().toLowerCase();
    await loadWorkoutRecords();
  });

  return recordsStudentSelect;
}

async function refreshRecordsStudents() {
  const data = await apiAdminListUsers(token, "");
  recordsStudents = (data.users || []).filter((u) => u.role !== "admin");

  renderRecordsStudentsList();
  renderRecordsStudentSelect();
}

function renderRecordsStudentSelect() {
  const select = ensureRecordsStudentSelect();
  if (!select) return;

  const current = selectedRecordsStudentEmail || select.value || "";

  select.innerHTML =
    `<option value="">Selecione um aluno</option>` +
    recordsStudents
      .map((u) => {
        const label = `${u.name || "Sem nome"} — ${u.email}`;
        return `<option value="${escapeHtml(u.email)}">${escapeHtml(label)}</option>`;
      })
      .join("");

  if (current) select.value = current;
}

function renderRecordsStudentsList() {
  if (!recordsStudentsList) return;

  const q = normalizeText(recordsStudentSearch?.value || "");

  const filtered = recordsStudents.filter((u) => {
    const name = normalizeText(u.name || "");
    const email = normalizeText(u.email || "");
    return !q || name.includes(q) || email.includes(q);
  });

  if (!filtered.length) {
    recordsStudentsList.innerHTML = `
      <div class="emptyState">
        <h3>Nenhum aluno encontrado</h3>
        <p>Tente buscar por outro nome ou email.</p>
      </div>
    `;
    return;
  }

  recordsStudentsList.innerHTML = filtered
    .map((u) => {
      const email = String(u.email || "").toLowerCase();
      const activeClass = email === selectedRecordsStudentEmail ? "active" : "";

      return `
        <button class="recordsStudentItem ${activeClass}" type="button" data-record-student="${escapeHtml(email)}">
          <span>
            <b>${escapeHtml(u.name || "Sem nome")}</b>
            <small>${escapeHtml(u.email)}</small>
          </span>
          <span>${u.active ? "🟢" : "🔴"}</span>
        </button>
      `;
    })
    .join("");

  recordsStudentsList.querySelectorAll("[data-record-student]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      selectedRecordsStudentEmail = String(btn.dataset.recordStudent || "").trim().toLowerCase();

      if (recordsStudentSelect) recordsStudentSelect.value = selectedRecordsStudentEmail;

      updateSelectedRecordStudentBox();
      renderRecordsStudentsList();
      await loadWorkoutRecords();
    });
  });
}

function updateSelectedRecordStudentBox() {
  if (!recordsSelectedStudentBox) return;

  if (!selectedRecordsStudentEmail) {
    recordsSelectedStudentBox.innerHTML = `Selecione um aluno na lista para ver os registros.`;
    return;
  }

  const student = recordsStudents.find(
    (u) => String(u.email || "").toLowerCase() === selectedRecordsStudentEmail
  );

  recordsSelectedStudentBox.innerHTML = student
    ? `<b>${escapeHtml(student.name || "Sem nome")}</b><br><span>${escapeHtml(student.email)}</span>`
    : `Aluno selecionado: ${escapeHtml(selectedRecordsStudentEmail)}`;
}

recordsStudentSearch?.addEventListener("input", renderRecordsStudentsList);

function formatDateTimeBR(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function renderWorkoutRecords(records = []) {
  lastWorkoutRecords = records;
  if (!recordsListBox) return;

  if (!records.length) {
    recordsListBox.innerHTML = `
      <div class="emptyState">
        <h3>Nenhum registro encontrado</h3>
        <p>Quando o aluno salvar uma execução de treino, ela aparecerá aqui.</p>
      </div>
    `;
    return;
  }

  recordsListBox.innerHTML = records
    .map((record) => `
      <div class="rf-block recordBlock">
        <div class="rf-blockHeader">
          <div>
            <div class="rf-blockTitle">${escapeHtml(record.studentName || record.studentEmail)} · ${escapeHtml(record.workoutTitle || "Treino")}</div>
            <div class="rf-blockMeta">${escapeHtml(record.studentEmail)} · ${formatDateTimeBR(record.date)} · Semana: ${formatDateTimeBR(record.weekStart).split(",")[0]}</div>
          </div>
        </div>

        ${record.notes ? `<div class="recordNote"><b>Observação do aluno:</b><br>${escapeHtml(record.notes)}</div>` : `<div class="recordNote muted">Sem observação do aluno.</div>`}

        <div class="tableWrap" style="margin-top:10px;">
          <table>
            <thead>
              <tr>
                <th>Exercício</th>
                <th>Série</th>
                <th>Reps alvo</th>
                <th>Carga</th>
                <th>Reps feitas</th>
              </tr>
            </thead>
            <tbody>
              ${(record.logs || []).map((log) => `
                <tr>
                  <td>${escapeHtml(log.exerciseName || "—")}<br><span class="smallHint">${escapeHtml(log.muscleGroup || "")}</span></td>
                  <td>${Number(log.setIndex || 0) + 1}</td>
                  <td>${escapeHtml(log.targetReps || "—")}</td>
                  <td>${log.weight ?? "—"}</td>
                  <td>${log.performedReps ?? "—"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `)
    .join("");
}

async function loadWorkoutRecords() {
  if (!recordsListBox) return;

  const selectedEmailFromList = selectedRecordsStudentEmail;
  const selectedEmailFromSelect = (recordsStudentSelect?.value || "").trim().toLowerCase();
  const fallbackEmail = (recordsEmail?.value || "").trim().toLowerCase();
  const email = selectedEmailFromList || selectedEmailFromSelect || fallbackEmail;

  if (!email) {
    lastWorkoutRecords = [];
    recordsListBox.innerHTML = `
      <div class="emptyState">
        <h3>Nenhum aluno selecionado</h3>
        <p>Clique em um aluno na lista para carregar os registros.</p>
      </div>
    `;
    return;
  }

  selectedRecordsStudentEmail = email;
  updateSelectedRecordStudentBox();

  recordsListBox.innerHTML = "Carregando registros...";

  try {
    const filters = {
      email,
      from: recordsFrom?.value || "",
      to: recordsTo?.value ? `${recordsTo.value}T23:59:59` : "",
    };

    const data = await apiAdminWorkoutRecords(token, filters);
    renderWorkoutRecords(data.records || []);
  } catch (e) {
    recordsListBox.innerHTML = `
      <div class="emptyState">
        <h3>Erro ao carregar</h3>
        <p>${escapeHtml(e?.message || "Tente novamente.")}</p>
      </div>
    `;
  }
}

function printWorkoutRecordsPdf() {
  const records = lastWorkoutRecords || [];

  if (!records.length) {
    return toast("info", "Sem registros", "Selecione um aluno com registros antes de baixar o PDF.");
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Registros dos alunos</title>
    <style>
      body{font-family:Arial,sans-serif;padding:28px;color:#111}
      h1{margin:0 0 8px}
      .muted{color:#666}
      .session{border:1px solid #ddd;border-radius:12px;padding:14px;margin:14px 0;break-inside:avoid}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left;font-size:12px}
      th{background:#f4f4f4}
      .note{background:#fafafa;border-left:4px solid #ceac5e;padding:10px;margin-top:10px}
    </style>
    </head><body><h1>Registros dos alunos</h1><p class="muted">Gerado em ${new Date().toLocaleString("pt-BR")}</p>
    ${records.map((record) => `
      <div class="session">
        <h2>${escapeHtml(record.studentName || record.studentEmail)} · ${escapeHtml(record.workoutTitle || "Treino")}</h2>
        <p class="muted">${escapeHtml(record.studentEmail)} · ${formatDateTimeBR(record.date)}</p>
        ${record.notes ? `<div class="note"><b>Observação:</b><br>${escapeHtml(record.notes)}</div>` : ""}
        <table>
          <thead>
            <tr>
              <th>Exercício</th>
              <th>Série</th>
              <th>Reps alvo</th>
              <th>Carga</th>
              <th>Reps feitas</th>
            </tr>
          </thead>
          <tbody>
            ${(record.logs || []).map((log) => `
              <tr>
                <td>${escapeHtml(log.exerciseName || "—")}</td>
                <td>${Number(log.setIndex || 0) + 1}</td>
                <td>${escapeHtml(log.targetReps || "—")}</td>
                <td>${log.weight ?? "—"}</td>
                <td>${log.performedReps ?? "—"}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `).join("")}
    </body></html>`;

  const w = window.open("", "_blank");
  if (!w) return toast("error", "Popup bloqueado", "Permita popups para baixar o PDF.");

  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

recordsApplyBtn?.addEventListener("click", loadWorkoutRecords);

recordsRefreshBtn?.addEventListener("click", async () => {
  await refreshRecordsStudents();
  await loadWorkoutRecords();
});

recordsPdfBtn?.addEventListener("click", printWorkoutRecordsPdf);



// ===== TÉCNICAS DE TREINO =====
function resetTechniqueEdit() {
  editingTechniqueId = null;
  if (techniqueName) techniqueName.value = "";
  if (techniqueVideoUrl) techniqueVideoUrl.value = "";
  if (techniqueNotes) techniqueNotes.value = "";
  if (techniqueSaveBtn) techniqueSaveBtn.textContent = "Cadastrar técnica";
  if (techniqueCancelEditBtn) techniqueCancelEditBtn.style.display = "none";
}

async function refreshTechniques() {
  const data = await apiAdminListTechniques(token);
  techniqueCatalog = data.techniques || [];

  if (workoutTechniqueSelect) {
    workoutTechniqueSelect.innerHTML =
      `<option value="">Sem técnica</option>` +
      techniqueCatalog.map((t) => `<option value="${escapeHtml(t.id)}">${escapeHtml(t.name)}</option>`).join("");
  }

  if (techniqueListBox) {
    techniqueListBox.innerHTML = techniqueCatalog.length
      ? techniqueCatalog.map((t) => `
        <div class="smallHint" style="display:flex;justify-content:space-between;gap:10px;align-items:center;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:10px;margin:8px 0;">
          <span><b>${escapeHtml(t.name)}</b>${t.videoUrl ? ` · vídeo ok` : ""}${t.notes ? `<br><small>${escapeHtml(t.notes)}</small>` : ""}</span>
          <span style="display:flex;gap:8px;">
            <button class="btnGhost" type="button" data-edit-technique="${escapeHtml(t.id)}" style="padding:6px 10px;min-width:auto;">Editar</button>
            <button class="btnGhost" type="button" data-delete-technique="${escapeHtml(t.id)}" style="padding:6px 10px;min-width:auto;">Excluir</button>
          </span>
        </div>
      `).join("")
      : `<div class="smallHint">Nenhuma técnica cadastrada.</div>`;

    techniqueListBox.querySelectorAll("[data-edit-technique]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = techniqueCatalog.find((item) => String(item.id) === String(btn.dataset.editTechnique));
        if (!t) return;
        editingTechniqueId = t.id;
        if (techniqueName) techniqueName.value = t.name || "";
        if (techniqueVideoUrl) techniqueVideoUrl.value = t.videoUrl || "";
        if (techniqueNotes) techniqueNotes.value = t.notes || "";
        if (techniqueSaveBtn) techniqueSaveBtn.textContent = "Salvar alteração";
        if (techniqueCancelEditBtn) techniqueCancelEditBtn.style.display = "inline-flex";
      });
    });

    techniqueListBox.querySelectorAll("[data-delete-technique]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ok = await openModal({ title: "Excluir técnica", text: "Excluir esta técnica? Ela será removida dos exercícios onde foi vinculada.", mode: "confirm", okText: "Excluir" });
        if (!ok) return;
        try {
          await apiAdminDeleteTechnique(token, btn.dataset.deleteTechnique);
          resetTechniqueEdit();
          await refreshTechniques();
          toast("ok", "Técnica excluída", "Lista atualizada.");
        } catch (e) {
          toast("error", "Erro", e.message || "Erro ao excluir técnica.");
        }
      });
    });
  }
}

techniqueSaveBtn?.addEventListener("click", async () => {
  const name = (techniqueName?.value || "").trim();
  const videoUrl = (techniqueVideoUrl?.value || "").trim();
  const notes = (techniqueNotes?.value || "").trim();
  if (!name) return toast("error", "Atenção", "Informe o nome da técnica.");
  try {
    if (editingTechniqueId) {
      await apiAdminUpdateTechnique(token, editingTechniqueId, { name, videoUrl, notes });
      toast("ok", "Técnica atualizada", "Lista atualizada.");
    } else {
      await apiAdminCreateTechnique(token, { name, videoUrl, notes });
      toast("ok", "Técnica cadastrada", "Lista atualizada.");
    }
    resetTechniqueEdit();
    await refreshTechniques();
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao salvar técnica.");
  }
});
techniqueCancelEditBtn?.addEventListener("click", resetTechniqueEdit);
techniqueRefreshBtn?.addEventListener("click", async () => { await refreshTechniques(); toast("ok", "Atualizado", "Técnicas carregadas."); });

// ===== ITENS EXTRAS DO ALUNO =====

async function refreshExtraStudents() {
  if (!extraStudentSearch && !extraStudentResults) return;

  try {
    const data = await apiAdminListUsers(token, "");
    extraStudentsCatalog = (data.users || []).filter((u) => u.role !== "admin");
    renderExtraStudentResults();
  } catch {
    extraStudentsCatalog = [];
    if (extraStudentResults) extraStudentResults.innerHTML = "Não foi possível carregar alunos.";
  }
}

function setExtraSelectedStudent(user) {
  if (!user?.email) return;

  if (extraStudentEmail) extraStudentEmail.value = String(user.email || "").trim().toLowerCase();
  if (extraStudentSearch) extraStudentSearch.value = user.name || user.email;
  if (extraSelectedStudentBox) {
    extraSelectedStudentBox.innerHTML = `<b>${escapeHtml(user.name || "Sem nome")}</b><br><span>${escapeHtml(user.email)}</span>`;
  }
  if (extraStudentResults) extraStudentResults.innerHTML = "";

  loadExtraItems().catch(() => {});
}

function renderExtraStudentResults() {
  if (!extraStudentResults) return;

  const q = normalizeText(extraStudentSearch?.value || "");

  if (!q) {
    extraStudentResults.innerHTML = "Digite o nome do aluno para buscar.";
    return;
  }

  const matches = extraStudentsCatalog
    .filter((u) => normalizeText(u.name || "").includes(q) || normalizeText(u.email || "").includes(q))
    .slice(0, 8);

  if (!matches.length) {
    extraStudentResults.innerHTML = "Nenhum aluno encontrado.";
    return;
  }

  extraStudentResults.innerHTML = matches.map((u) => `
    <button class="btnGhost" type="button" data-extra-student-email="${escapeHtml(u.email)}" style="display:flex;width:100%;justify-content:space-between;margin:6px 0;padding:8px 10px;min-width:auto;text-align:left;">
      <span><b>${escapeHtml(u.name || "Sem nome")}</b><br><small>${escapeHtml(u.email)}</small></span>
      <span>Selecionar</span>
    </button>
  `).join("");

  extraStudentResults.querySelectorAll("[data-extra-student-email]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const email = String(btn.dataset.extraStudentEmail || "").toLowerCase();
      const user = extraStudentsCatalog.find((u) => String(u.email || "").toLowerCase() === email);
      if (user) setExtraSelectedStudent(user);
    });
  });
}

extraStudentSearch?.addEventListener("input", renderExtraStudentResults);

function clearExtraForm() {
  if (extraTitle) extraTitle.value = "";
  if (extraUrl) extraUrl.value = "";
  if (extraNotes) extraNotes.value = "";
  if (extraOrder) extraOrder.value = String(studentExtraItems.length);
  if (extraActive) extraActive.checked = true;
}

function renderExtraItems() {
  if (!extraItemsBox) return;
  if (!studentExtraItems.length) {
    extraItemsBox.innerHTML = "Nenhum item extra cadastrado para este aluno.";
    return;
  }
  extraItemsBox.innerHTML = studentExtraItems.map((item, idx) => `
    <div style="border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:10px;margin:8px 0;display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
      <div>
        <b>${idx + 1}. ${escapeHtml(item.title)}</b>
        <div>${item.active === false ? "Inativo" : "Ativo"} · ${escapeHtml(item.url)}</div>
        ${item.notes ? `<div style="margin-top:6px;">Obs.: ${escapeHtml(item.notes)}</div>` : ""}
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btnGhost" type="button" data-edit-extra="${idx}" style="padding:6px 10px;min-width:auto;">Editar</button>
        <button class="btnGhost" type="button" data-remove-extra="${idx}" style="padding:6px 10px;min-width:auto;">Remover</button>
      </div>
    </div>
  `).join("");

  extraItemsBox.querySelectorAll("[data-edit-extra]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.editExtra);
      const item = studentExtraItems[idx];
      if (!item) return;
      if (extraTitle) extraTitle.value = item.title || "";
      if (extraUrl) extraUrl.value = item.url || "";
      if (extraNotes) extraNotes.value = item.notes || "";
      if (extraOrder) extraOrder.value = String(item.order ?? idx);
      if (extraActive) extraActive.checked = item.active !== false;
      studentExtraItems.splice(idx, 1);
      renderExtraItems();
    });
  });
  extraItemsBox.querySelectorAll("[data-remove-extra]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.removeExtra);
      studentExtraItems.splice(idx, 1);
      studentExtraItems = studentExtraItems.map((item, i) => ({ ...item, order: i }));
      renderExtraItems();
      clearExtraForm();
    });
  });
}

async function loadExtraItems() {
  const em = (extraStudentEmail?.value || studentEmail?.value || "").trim().toLowerCase();
  if (!em) return toast("error", "Atenção", "Busque e selecione o aluno.");
  if (extraStudentEmail) extraStudentEmail.value = em;
  try {
    const data = await apiAdminGetExtraItems(token, em);
    studentExtraItems = Array.isArray(data.items) ? data.items : [];
    renderExtraItems();
    clearExtraForm();
    toast("ok", "Itens carregados", "Lista atualizada.");
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao carregar itens.");
  }
}

extraLoadBtn?.addEventListener("click", loadExtraItems);
extraSaveBtn?.addEventListener("click", async () => {
  const em = (extraStudentEmail?.value || studentEmail?.value || "").trim().toLowerCase();
  if (!em) return toast("error", "Atenção", "Busque e selecione o aluno.");
  try {
    const cleanItems = studentExtraItems
      .map((item, idx) => ({
        title: String(item.title || "").trim(),
        url: String(item.url || "").trim(),
        notes: item.notes || "",
        active: item.active !== false,
        order: Number(item.order ?? idx),
      }))
      .filter((item) => item.title && item.url);
    await apiAdminSaveExtraItems(token, em, cleanItems);
    studentExtraItems = cleanItems;
    renderExtraItems();
    toast("ok", "Itens salvos", "Os itens extras foram atualizados para o aluno.");
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao salvar itens.");
  }
});
extraAddBtn?.addEventListener("click", () => {
  const title = (extraTitle?.value || "").trim();
  const url = (extraUrl?.value || "").trim();
  if (!title) return toast("error", "Atenção", "Informe o título do item.");
  if (!url) return toast("error", "Atenção", "Informe o link do arquivo/PDF.");
  studentExtraItems.push({
    title,
    url,
    notes: (extraNotes?.value || "").trim(),
    active: extraActive ? !!extraActive.checked : true,
    order: Number(extraOrder?.value || studentExtraItems.length),
  });
  studentExtraItems.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  renderExtraItems();
  clearExtraForm();
});
extraClearBtn?.addEventListener("click", clearExtraForm);

// Cards da biblioteca
function setupLibraryCards() {
  document.querySelectorAll("[data-route-go]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const route = btn.dataset.routeGo;
      if (window.__setRoute) window.__setRoute(route);
    });
  });
}

// Route change
window.addEventListener("routechange", async (e) => {
  const r = e?.detail?.route;

  if (r === "list") {
    await refreshList();
  }

  if (r === "dash") {
    await loadDashboard();
  }

  if (r === "me") {
    await loadMe();
  }

  if (r === "muscles") {
    await refreshMuscleGroups();
  }

  if (r === "videos") {
    await refreshVideos();
  }

  if (r === "exercises") {
    await refreshMuscleGroups();
    await refreshVideos();
    await refreshExercises();
  }

  if (r === "records") {
    await refreshRecordsStudents();
    await loadWorkoutRecords();
  }

  if (r === "techniques") {
    await refreshTechniques();
  }

  if (r === "extra-items") {
    await refreshExtraStudents();
    if (extraStudentEmail && studentEmail?.value) {
      extraStudentEmail.value = studentEmail.value;
      const selected = extraStudentsCatalog.find((u) => String(u.email || "").toLowerCase() === String(studentEmail.value || "").toLowerCase());
      if (selected && extraSelectedStudentBox) {
        extraSelectedStudentBox.innerHTML = `<b>${escapeHtml(selected.name || "Sem nome")}</b><br><span>${escapeHtml(selected.email)}</span>`;
        if (extraStudentSearch) extraStudentSearch.value = selected.name || selected.email;
      }
      await loadExtraItems().catch(() => {});
    } else {
      renderExtraItems();
    }
  }
});

// ===== Init =====
(async function init() {
  const session = await requireAuth("admin");
  if (!session) return;

  token = session.token;
  if (who) who.textContent = session.user.email;

  fillMonthSelects();

  await loadMe().catch(() => {});
  await refreshList().catch(() => {});
  renderCurrentSeries();
  renderWorkoutDraft();
  renderWorkoutList();
  updateWorkoutExerciseButtonState();
  setupLibraryCards();
  await refreshTechniques().catch(() => {});
  ensureRecordsStudentSelect();
  updateTrainingModeUI();
})();