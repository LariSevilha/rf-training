// Treinos manuais, séries, histórico e salvamento de execução
// Dependências importadas pelo arquivo principal: ../aluno.js

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


function formatDateTimeBR(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function groupHistoryLogsByExercise(logs = []) {
  const grouped = new Map();

  (logs || []).forEach((log) => {
    const exerciseName = log.exerciseName || "Exercício";
    const muscleGroup = log.muscleGroup || "";
    const key = `${exerciseName}__${muscleGroup}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        exerciseName,
        muscleGroup,
        sets: [],
      });
    }

    grouped.get(key).sets.push(log);
  });

  return [...grouped.values()].map((exercise) => ({
    ...exercise,
    sets: exercise.sets.sort((a, b) => Number(a.setIndex || 0) - Number(b.setIndex || 0)),
  }));
}

function renderStudentHistory(records = []) {
  if (!records.length) {
    return `<div class="studentHistoryEmpty">Nenhum histórico salvo ainda. Quando você registrar cargas e reps, elas aparecerão aqui.</div>`;
  }

  return records.slice(0, 12).map((record) => {
    const groupedExercises = groupHistoryLogsByExercise(record.logs || []);

    return `
      <article class="studentHistoryCard">
        <div class="studentHistoryHead">
          <div>
            <b>${escapeHtml(record.workoutTitle || "Treino")}</b>
            <span>${formatDateTimeBR(record.date)}</span>
          </div>
          <small>${groupedExercises.length} exercício(s)</small>
        </div>
        ${record.notes ? `<div class="studentHistoryNote">${escapeHtml(record.notes)}</div>` : ""}
        <div class="studentHistoryExercises">
          ${groupedExercises.map((exercise) => `
            <div class="studentHistoryExercise">
              <div class="studentHistoryExerciseHead">
                <strong>${escapeHtml(exercise.exerciseName || "Exercício")}</strong>
                ${exercise.muscleGroup ? `<small>${escapeHtml(exercise.muscleGroup)}</small>` : ""}
              </div>
              <div class="studentHistorySets">
                ${exercise.sets.map((log) => `
                  <div class="studentHistorySet">
                    <span>Série ${Number(log.setIndex || 0) + 1}</span>
                    <small>Alvo: ${escapeHtml(log.targetReps || "—")}</small>
                    <b>${log.weight ?? "—"} kg · ${log.performedReps ?? "—"} reps</b>
                  </div>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }).join("");
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
    const technique = item.technique || null;
    const techniqueName = String(technique?.name || item.techniqueName || "").trim();
    const techniqueNote = String(technique?.exerciseNote || item.techniqueNote || "").trim();
    const techniqueNotes = String(technique?.notes || item.techniqueNotes || "").trim();
    const techniqueVideoUrl = String(technique?.videoUrl || item.techniqueVideoUrl || "").trim();

    return `
      <article class="exerciseBlock">
        <div class="exerciseHeader">
          <div>
            <h3 class="exerciseInlineTitle">
              <span>${exIndex + 1}. ${escapeHtml(exercise.name || "Exercício")}</span>
              ${techniqueName ? `
                <span class="techniqueInline">
                  <span class="techniqueDot">•</span>
                  <span class="techniqueName">${escapeHtml(techniqueName)}</span>
                  ${techniqueVideoUrl ? `<a class="techniqueLink" href="${escapeHtml(techniqueVideoUrl)}" target="_blank" rel="noopener">Ver técnica</a>` : ""}
                </span>
              ` : ""}
            </h3>
            ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ""}
            ${(techniqueNote || techniqueNotes) ? `
              <div class="techniqueBox">
                ${techniqueNote ? `<b>Obs. técnica:</b> ${escapeHtml(techniqueNote)}` : ""}
                ${techniqueNotes ? `${techniqueNote ? "<br>" : ""}<small>${escapeHtml(techniqueNotes)}</small>` : ""}
              </div>
            ` : ""}
          </div>

          ${exercise.videoUrl ? `<a class="videoBtn" href="${escapeHtml(exercise.videoUrl)}" target="_blank" rel="noopener">Ver vídeo</a>` : ""}
        </div>

        <div class="seriesTable">
          <div class="seriesHead">
            <span>Série</span>
            <span>Reps alvo</span>
            <span>Carga</span>
            <span>Reps feitas</span>
          </div>

          ${series.flatMap((serie) => getExpandedSets(serie)).map((set, serieIndex) => `
            <div class="seriesRow">
              <span>Série ${serieIndex + 1}</span>
              <span>${escapeHtml(set.reps || "—")}</span>

              <label>
                <small>kg</small>
                <input inputmode="decimal" type="number" step="0.5" min="0"
                  data-series-id="${escapeHtml(set.seriesId)}"
                  data-set-index="${set.setIndex}"
                  data-field="weight"
                  value="${set.lastWeight ?? ""}"
                  placeholder="Carga" />
              </label>

              <label>
                <small>reps</small>
                <input inputmode="numeric" type="number" step="1" min="0"
                  data-series-id="${escapeHtml(set.seriesId)}"
                  data-set-index="${set.setIndex}"
                  data-field="performedReps"
                  value="${set.lastPerformedReps ?? ""}"
                  placeholder="Reps" />
              </label>
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
        ${workout.notes ? `<p>${escapeHtml(workout.notes)}</p>` : ""}
      </div>
    </div>

      ${exercisesHtml || `<div class="emptyState inline"><h3>Treino sem exercícios</h3><p>Entre em contato com o personal.</p></div>`}

      

      <div class="workoutSaveFooter">
        <button class="saveWorkoutBtn" id="saveWorkoutBtn" type="button">Salvar execução</button>
      </div>

      <section class="studentHistoryBox ${historyOpen ? "open" : ""}">
        <button class="studentHistoryToggle" id="studentHistoryToggle" type="button">
          <span>Histórico de evolução</span>
          <small>${historyOpen ? "Ocultar" : "Ver cargas anteriores"}</small>
        </button>
        <div class="studentHistoryContent" id="studentHistoryContent">
          ${historyOpen ? renderStudentHistory(workoutHistory) : ""}
        </div>
      </section>
    </div>
  `;

  document.getElementById("saveWorkoutBtn")?.addEventListener("click", () => saveCurrentWorkout(workout.id));
  document.getElementById("studentHistoryToggle")?.addEventListener("click", async () => {
    historyOpen = !historyOpen;
    if (historyOpen && !workoutHistory.length) await syncWorkoutHistory(false);
    renderWorkouts();
  });
}

async function saveCurrentWorkout(workoutId) {
  if (!workoutId) {
    return showMessage("error", "Treino inválido", "Atualize a página e tente novamente.");
  }

  if (!navigator.onLine) {
    return showMessage("warn", "Sem internet", "Conecte-se para salvar a execução do treino.");
  }

  const rows = new Map();

  workoutArea?.querySelectorAll("input[data-series-id]").forEach((input) => {
    const seriesId = input.dataset.seriesId;
    const setIndex = Number(input.dataset.setIndex || 0);
    const field = input.dataset.field;

    if (!seriesId || !field) return;

    const key = `${seriesId}:${Number.isFinite(setIndex) ? setIndex : 0}`;

    if (!rows.has(key)) {
      rows.set(key, {
        seriesId,
        setIndex: Number.isFinite(setIndex) ? setIndex : 0,
        weight: "",
        performedReps: "",
      });
    }

    rows.get(key)[field] = input.value;
  });

  const logs = [...rows.values()].filter((row) => {
    return String(row.weight || "").trim() || String(row.performedReps || "").trim();
  });

  if (!logs.length) {
    return showMessage("warn", "Nada para salvar", "Preencha pelo menos uma carga ou repetição.");
  }

  const btn = document.getElementById("saveWorkoutBtn");

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Salvando…";
  }

  try {
    const notes = (document.getElementById("workoutSessionNotes")?.value || "").trim();
    const resp = await apiSaveWorkoutLogs(session.token, workoutId, logs, notes);

    showMessage("ok", "Execução salva", `${resp.saved || logs.length} registro(s) gravado(s) com sucesso.`);
    hideMessage(4000);

    await syncWorkouts(false);
    await syncWorkoutHistory(false);
  } catch (e) {
    showMessage("error", "Erro ao salvar", e?.message || "Tente novamente em alguns segundos.");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Salvar execução";
    }
  }
}
