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

// Arquivo principal do Admin.
// Ele deixa as dependências disponíveis e carrega os módulos em ordem.
Object.assign(window, {
  requireAuth,
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
  clearSession,
  toast,
  openModal,
  buildDashboardPrintHTML,
  monthKey,
  monthLabel,
  pct,
  pickDate,
  monthsBetween,
});

const ADMIN_PARTS = [
  "00-bootstrap-elements-state.js",
  "01-admin-core-students.js",
  "02-dashboard-profile.js",
  "03-admin-events-documents.js",
  "04-workout-builder.js",
  "05-catalogs-muscles-videos-exercises.js",
  "06-student-records.js",
  "07-techniques.js",
  "08-extra-items.js",
  "09-navigation-search-init.js",
];

function loadClassicScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.defer = false;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.head.appendChild(script);
  });
}

try {
  for (const file of ADMIN_PARTS) {
    await loadClassicScript(`../assets/js/admin/parts/${file}`);
  }
} catch (error) {
  console.error(error);
  if (typeof toast === "function") {
    toast(error.message || "Erro ao carregar o painel administrativo.", "err");
  }
}
