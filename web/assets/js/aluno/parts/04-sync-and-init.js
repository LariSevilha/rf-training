// Sincronização de dados e inicialização da área do aluno
// Dependências importadas pelo arquivo principal: ../aluno.js

async function syncWorkoutHistory(showErrors = false) {
  if (!session?.token) return;

  try {
    const data = await apiWorkoutHistory(session.token);
    workoutHistory = Array.isArray(data.records) ? data.records : [];
  } catch (e) {
    workoutHistory = [];
    if (showErrors) showMessage("warn", "Histórico indisponível", e?.message || "Não foi possível carregar o histórico agora.");
  }
}

async function syncExtraItems() {
  if (!session?.token) return;

  try {
    const data = await apiExtraItems(session.token);
    extraItems = Array.isArray(data.items) ? data.items : [];
  } catch {
    extraItems = [];
  }

  renderHomeMenu();
}

async function syncDocuments() {
  if (!session?.token) return;

  lockMenu();

  if (statusEl) {
    statusEl.textContent = navigator.onLine ? "Sincronizando materiais…" : "Você está offline.";
  }

  try {
    const docs = await apiDocuments(session.token);

    urls.training = String(docs.training || "").trim();
    urls.diet = String(docs.diet || "").trim();
    urls.supp = String(docs.supp || "").trim();
    urls.exams = String(docs.exams || "").trim();
    urls.stretch = String(docs.stretch || "").trim();

    parseCardioFromDocs(docs);

    renderHomeMenu();

    if (statusEl) {
      statusEl.textContent = hasAnyMaterial()
        ? ""
        : "Nenhum material disponível no momento.";
    }
  } catch (e) {
    showMessage("error", "Erro ao carregar materiais", e?.message || "Tente atualizar a página.");

    if (statusEl) {
      statusEl.textContent = "Não foi possível sincronizar todos os dados.";
    }
  } finally {
    unlockMenu();
  }
}

async function syncWorkouts(showLoadingMessage = true, options = {}) {
  if (!session?.token) return;

  if (showLoadingMessage) {
    showMessage("info", "Carregando treinos", "Buscando treinos manuais liberados pelo personal.");
  }

  try {
    const data = await apiWorkouts(session.token);
    workouts = Array.isArray(data.workouts) ? data.workouts : [];

    // O histórico pode ser grande. Carrega só quando o aluno abrir o histórico
    // ou depois de salvar uma execução, em vez de bloquear a abertura da página.
    if (options.loadHistory === true) {
      await syncWorkoutHistory(false);
    }

    if (activeWorkoutIndex >= workouts.length) {
      activeWorkoutIndex = 0;
    }

    renderWorkouts();
    renderHomeMenu();

    if (showLoadingMessage) {
      if (workouts.length) {
        showMessage("ok", "Treinos carregados", "Você já pode registrar sua execução.");
      } else {
        showMessage("info", "Sem treino manual", "Nenhum treino manual foi liberado ainda.");
      }

      hideMessage(3500);
    }
  } catch (e) {
    workouts = [];
    renderWorkouts();
    renderHomeMenu();
    showMessage("error", "Erro ao carregar treinos", e?.message || "Tente novamente mais tarde.");
  }
}

async function refreshAll() {
  if (!session?.token) return;

  showMessage("info", "Atualizando", "Buscando materiais e treinos.");

  await Promise.allSettled([
    syncDocuments(),
    syncWorkouts(false),
    syncExtraItems(),
  ]);

  renderHomeMenu();

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
    try {
      const me = await apiMe(session.token);
      displayName = (me?.user?.name || "").trim();
    } catch {}
  }

  if (!displayName) displayName = "Aluno";
  if (nameEl) nameEl.textContent = displayName;

  setTab("documents");

  // Libera a interface antes das chamadas de dados terminarem.
  // Assim o app deixa de ficar preso na tela de carregamento quando a API oscila.
  document.body.classList.remove("studentBooting");
  document.body.classList.add("studentReady");

  await Promise.allSettled([
    syncDocuments(),
    syncWorkouts(false),
    syncExtraItems(),
  ]);

  renderHomeMenu();

  if (statusEl) {
    statusEl.textContent = hasAnyMaterial()
      ? ""
      : "Nenhum material disponível no momento.";
  }
})();
