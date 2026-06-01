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

  if (r === "edit") {
    await refreshExercises().catch(() => {});
    await refreshTechniques().catch(() => {});
  }

  if (r === "records") {
    await refreshRecordsStudents();
  }

  if (r === "records-detail") {
    if (!recordsStudents.length) await refreshRecordsStudents();
    updateSelectedRecordStudentBox();
    await loadWorkoutRecords();
  }

  if (r === "techniques") {
    await refreshTechniques();
  }

  if (r === "extra-items") {
    if (extraStudentSearch) extraStudentSearch.value = "";
    await refreshExtraStudents({ reset: true });
  }
});

// ===== Init =====
(async function init() {
  initTheme();
  const session = await requireAuth("admin");
  if (!session) return;

  token = session.token;
  if (who) who.textContent = session.user.email;

  fillMonthSelects();

  await loadMe().catch(() => {});
  await refreshList().catch(() => {});
  renderCurrentSeries();
  updateSeriesButtonState();
  renderWorkoutDraft();
  renderWorkoutList();
  updateWorkoutExerciseButtonState();
  setupLibraryCards();
  await refreshTechniques().catch(() => {});
  ensureRecordsStudentSelect();
  updateTrainingModeUI();
})();

function renderSearchResultList({ box, items, type }) {
  if (!box) return;

  if (!items.length) {
    box.style.display = "block";
    box.innerHTML = `<div class="searchResultEmpty">Nenhum resultado encontrado.</div>`;
    return;
  }

  box.style.display = "flex";
  box.innerHTML = items.slice(0, 12).map((item) => {
    if (type === "exercise") {
      const group = item.muscleGroup || item.muscleGroupName || item.muscleGroup?.name || "Sem agrupamento";
      return `
        <button class="searchResultItem" type="button" data-pick-exercise="${escapeHtml(item.id || item.name || "")}">
          <span><b>${escapeHtml(item.name || "Exercício")}</b><small>${escapeHtml(group)}</small></span>
          <span class="searchResultArrow">Selecionar</span>
        </button>
      `;
    }

    return `
      <button class="searchResultItem" type="button" data-pick-video="${escapeHtml(item.id || "")}">
        <span><b>${escapeHtml(item.title || "Vídeo")}</b><small>${escapeHtml(item.url || "")}</small></span>
        <span class="searchResultArrow">Selecionar</span>
      </button>
    `;
  }).join("");

  if (type === "exercise") {
    box.querySelectorAll("[data-pick-exercise]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.pickExercise || "";

        if (workoutExerciseSearch) {
          workoutExerciseSearch.value = "";
        }

        renderWorkoutExerciseOptions("");

        if (workoutExerciseSelect) {
          workoutExerciseSelect.value = id;
        }

        box.innerHTML = "";
        box.style.display = "none";
      });
    });
  }

  if (type === "video") {
    box.querySelectorAll("[data-pick-video]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.pickVideo || "";
        if (exerciseVideoSelect) exerciseVideoSelect.value = id;
        if (exerciseVideoSearch) {
          const found = (window.__videoCatalog || []).find((v) => String(v.id) === String(id));
          exerciseVideoSearch.value = found?.title || "";
        }
        box.innerHTML = "";
        box.style.display = "none";
      });
    });
  }
}

function renderWorkoutExerciseOptions(query = "") {
  if (!workoutExerciseSelect) return;

  const q = normalizeText(query);
  const items = (workoutCatalogExercises || []).filter((e) => {
    const name = normalizeText(e.name || "");
    const group = normalizeText(e.muscleGroup || e.muscleGroupName || e.muscleGroup?.name || "");
    return !q || name.includes(q) || group.includes(q);
  });

  workoutExerciseSelect.innerHTML = items.length
    ? items.map((e) => {
        const group = e.muscleGroup || e.muscleGroupName || e.muscleGroup?.name || "";
        return `<option value="${escapeHtml(e.id || e.name)}">${escapeHtml(e.name)}${group ? ` · ${escapeHtml(group)}` : ""}</option>`;
      }).join("")
    : `<option value="">Nenhum exercício encontrado</option>`;

  if (q) {
    renderSearchResultList({ box: workoutExerciseResults, items, type: "exercise" });
  } else if (workoutExerciseResults) {
    workoutExerciseResults.innerHTML = "";
    workoutExerciseResults.style.display = "none";
  }
}

function renderExerciseVideoOptions(items) {
  if (!exerciseVideoSelect) return;

  const catalog = items || window.__videoCatalog || [];
  const q = normalizeText(exerciseVideoSearch?.value || "");
  const filtered = catalog.filter((v) => {
    const title = normalizeText(v.title || "");
    const url = normalizeText(v.url || "");
    return !q || title.includes(q) || url.includes(q);
  });

  exerciseVideoSelect.innerHTML = `<option value="">Sem vídeo</option>` + filtered.map((v) =>
    `<option value="${escapeHtml(v.id)}" data-url="${escapeHtml(v.url)}" data-title="${escapeHtml(v.title)}">${escapeHtml(v.title)}</option>`
  ).join("");

  if (q) {
    renderSearchResultList({ box: exerciseVideoResults, items: filtered, type: "video" });
  } else if (exerciseVideoResults) {
    exerciseVideoResults.innerHTML = "";
    exerciseVideoResults.style.display = "none";
  }
}


async function ensureWorkoutExerciseCatalogLoaded() {
  if (Array.isArray(workoutCatalogExercises) && workoutCatalogExercises.length) return;
  try {
    const data = await apiAdminListExercises(token, "");
    workoutCatalogExercises = data.exercises || [];
    renderWorkoutExerciseOptions(workoutExerciseSearch?.value || "");
  } catch (e) {
    console.warn("Não foi possível carregar exercícios para busca:", e);
  }
}

workoutExerciseSearch?.addEventListener("focus", async () => {
  await ensureWorkoutExerciseCatalogLoaded();
});

workoutExerciseSearch?.addEventListener("input", async () => {
  await ensureWorkoutExerciseCatalogLoaded();
  renderWorkoutExerciseOptions(workoutExerciseSearch.value || "");
});

exerciseVideoSearch?.addEventListener("input", () => {
  renderExerciseVideoOptions(window.__videoCatalog || []);
});


// Garante que as listas de busca comecem ocultas.
if (workoutExerciseResults) {
  workoutExerciseResults.innerHTML = "";
  workoutExerciseResults.style.display = "none";
}
if (exerciseVideoResults) {
  exerciseVideoResults.innerHTML = "";
  exerciseVideoResults.style.display = "none";
}
