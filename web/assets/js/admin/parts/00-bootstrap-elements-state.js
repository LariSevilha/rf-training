// Dependências importadas pelo arquivo principal: ../admin.js
// Este arquivo é carregado em ordem e usa as funções expostas no window.

// ===== Elements =====
const who = document.getElementById("who");
const mName = document.getElementById("mName");
const logoutBtn = document.getElementById("logoutBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const footerAdminName = document.getElementById("footerAdminName");
const footerAdminEmail = document.getElementById("footerAdminEmail");
const adminAvatar = document.getElementById("adminAvatar");

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
const studentsTotalCount = document.getElementById("studentsTotalCount");
const studentsActiveCount = document.getElementById("studentsActiveCount");
const studentsInactiveCount = document.getElementById("studentsInactiveCount");
const studentsResultText = document.getElementById("studentsResultText");

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

const workoutExerciseSearch = document.getElementById("workoutExerciseSearch");
const workoutExerciseResults = document.getElementById("workoutExerciseResults");
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
const exerciseVideoSearch = document.getElementById("exerciseVideoSearch");
const exerciseVideoResults = document.getElementById("exerciseVideoResults");
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
const extraStudentSearch = document.getElementById("extraStudentSearch");
const extraStudentsList = document.getElementById("extraStudentsList");
const extraSelectedStudentBox = document.getElementById("extraSelectedStudentBox");

const recordsEmail = document.getElementById("recordsEmail");
let recordsStudentSelect = document.getElementById("recordsStudentSelect");
const recordsFrom = document.getElementById("recordsFrom");
const recordsTo = document.getElementById("recordsTo");
const recordsApplyBtn = document.getElementById("recordsApplyBtn");
const recordsRefreshBtn = document.getElementById("recordsRefreshBtn");
const recordsPdfBtn = document.getElementById("recordsPdfBtn");
const recordsBackBtn = document.getElementById("recordsBackBtn");
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
let editingSeriesIndex = null;
let studentWorkoutList = [];
let editingWorkoutIndex = null;
let editingMuscleId = null;
let editingVideoId = null;
let editingExerciseId = null;
let editingTechniqueId = null;
let editingDraftExerciseIndex = null;
let techniqueCatalog = [];
let studentExtraItems = [];
let extraStudents = [];
let selectedExtraStudentEmail = "";

const UNSAVED_WORKOUT_MESSAGE = "Deseja mesmo sair sem salvar?";
let workoutListHasUnsavedChanges = false;
let workoutDiscardModalOpen = false;

function setWorkoutUnsaved() {
  workoutListHasUnsavedChanges = true;
}

function clearWorkoutUnsaved() {
  workoutListHasUnsavedChanges = false;
}

function hasWorkoutDraftContent() {
  const textFields = [
    workoutTitle,
    workoutNotes,
    workoutExerciseNotes,
    workoutTechniqueNote,
    seriesCount,
    seriesTargetReps,
  ];

  const hasTypedText = textFields.some((el) => String(el?.value || "").trim());
  const activeChanged = workoutActive ? workoutActive.checked === false : false;

  return Boolean(
    hasTypedText ||
    activeChanged ||
    workoutDraftExercises.length ||
    currentSeriesDraft.length ||
    editingDraftExerciseIndex !== null ||
    editingSeriesIndex !== null ||
    editingWorkoutIndex !== null
  );
}

function hasUnsavedWorkoutChanges() {
  return Boolean(workoutListHasUnsavedChanges || hasWorkoutDraftContent());
}

function isManualWorkoutBuilderActive() {
  const editViewIsActive = document.getElementById("view-edit")?.classList.contains("active");
  const manualMode = (trainingMode?.value || "pdf") === "manual";
  const manualVisible = manualTrainingBox && getComputedStyle(manualTrainingBox).display !== "none";
  return Boolean(editViewIsActive && manualMode && manualVisible);
}

function shouldProtectWorkoutExit(fromRoute = "") {
  return Boolean(fromRoute === "edit" && isManualWorkoutBuilderActive() && hasUnsavedWorkoutChanges());
}

async function confirmDiscardWorkoutChanges() {
  if (!hasUnsavedWorkoutChanges()) return true;

  const ok = await openModal({
    title: "Sair sem salvar?",
    text: UNSAVED_WORKOUT_MESSAGE,
    mode: "confirm",
    okText: "Sair sem salvar",
    cancelText: "Continuar editando",
  });

  if (ok) {
    clearWorkoutUnsaved();
  }

  return ok;
}

window.addEventListener("beforeRouteChange", (event) => {
  const fromRoute = event?.detail?.from || "";
  const nextRoute = event?.detail?.route || "";

  if (!shouldProtectWorkoutExit(fromRoute)) return;

  event.preventDefault();

  if (workoutDiscardModalOpen) return;
  workoutDiscardModalOpen = true;

  confirmDiscardWorkoutChanges()
    .then((ok) => {
      if (ok && nextRoute && window.__setRoute) {
        window.__setRoute(nextRoute, { force: true });
      }
    })
    .finally(() => {
      workoutDiscardModalOpen = false;
    });
});

window.addEventListener("beforeunload", (event) => {
  if (!isManualWorkoutBuilderActive() || !hasUnsavedWorkoutChanges()) return;

  event.preventDefault();
  event.returnValue = "";
});
