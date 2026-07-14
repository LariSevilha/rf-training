import { requireAuth } from "./guard.js";
import {
  apiDocuments,
  apiMe,
  apiWorkouts,
  apiSaveWorkoutLogs,
  apiWorkoutHistory,
  apiExtraItems,
  apiPdfTicket,
} from "./api.js";
import { clearSession } from "./state.js";
import { driveToPreview, driveToNativePdf, placeholderHtml } from "./pdf.js";

// Arquivo principal da área do aluno.
// As funções reais ficam separadas em web/assets/js/aluno/parts/.
Object.assign(window, {
  requireAuth,
  apiDocuments,
  apiMe,
  apiWorkouts,
  apiSaveWorkoutLogs,
  apiWorkoutHistory,
  apiExtraItems,
  apiPdfTicket,
  clearSession,
  driveToPreview,
  driveToNativePdf,
  placeholderHtml,
});

const ALUNO_PARTS = [
  "00-service-worker-elements-state.js",
  "01-tabs-menu-documents-overlay.js",
  "02-install-flow.js",
  "03-workouts-history.js",
  "04-sync-and-init.js",
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
  for (const file of ALUNO_PARTS) {
    await loadClassicScript(`../assets/js/aluno/parts/${file}`);
  }
} catch (error) {
  console.error(error);
  const messageBox = document.getElementById("studentMessage");
  if (messageBox) {
    messageBox.className = "studentMessage err";
    messageBox.innerHTML = `<b>Erro ao carregar a área do aluno.</b><span>${error.message || "Tente recarregar a página."}</span>`;
  }
}
