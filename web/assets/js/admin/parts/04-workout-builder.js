function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function buildTechniqueBadgeHtml(source) {
  const name = source?.techniqueName || source?.technique?.name || "";
  const note = source?.techniqueNote || source?.technique?.exerciseNote || "";
  const details = source?.techniqueNotes || source?.technique?.notes || "";
  const videoUrl = source?.techniqueVideoUrl || source?.technique?.videoUrl || "";

  if (!name) return "";

  const title = [note, details].filter(Boolean).join(" • ");

  return `
    <span class="techniqueInline" ${title ? `title="${escapeHtml(title)}"` : ""}>
      ${escapeHtml(name)}
      ${videoUrl ? `<a class="techniqueInlineLink" href="${escapeHtml(videoUrl)}" target="_blank" rel="noopener">Ver técnica</a>` : ""}
    </span>
  `;
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

function updateSeriesButtonState() {
  if (!seriesAddBtn) return;
  seriesAddBtn.textContent = editingSeriesIndex !== null ? "Atualizar série" : "Adicionar série";
}


function renderCurrentSeries() {
  if (!currentSeriesBox) return;

  if (!currentSeriesDraft.length) {
    currentSeriesBox.innerHTML = "Nenhuma série adicionada.";
    updateSeriesButtonState();
    return;
  }

  currentSeriesBox.innerHTML = currentSeriesDraft
    .map((s, idx) => `
      <div class="seriesDraftItem" style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin:6px 0;">
        <span><b>Bloco ${idx + 1}:</b> ${escapeHtml(formatSeriesLabel(s))}</span>
        <span style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
          <button class="btnGhost" type="button" data-edit-series="${idx}" style="padding:6px 10px;min-width:auto;">Editar</button>
          <button class="btnGhost" type="button" data-remove-series="${idx}" style="padding:6px 10px;min-width:auto;">Remover</button>
        </span>
      </div>
    `)
    .join("");

  currentSeriesBox.querySelectorAll("[data-edit-series]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.editSeries);
      const s = currentSeriesDraft[idx];
      if (!s) return;

      editingSeriesIndex = idx;
      if (seriesCount) seriesCount.value = String(s.count || 1);
      if (seriesTargetReps) seriesTargetReps.value = String(s.reps || s.targetReps || "");
      updateSeriesButtonState();
      toast("info", "Série carregada", "Altere séries/repetições e clique em Atualizar série.");
    });
  });

  currentSeriesBox.querySelectorAll("[data-remove-series]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.removeSeries);
      currentSeriesDraft.splice(idx, 1);
      currentSeriesDraft = currentSeriesDraft.map((s, i) => ({ ...s, order: i }));

      if (editingSeriesIndex === idx) {
        editingSeriesIndex = null;
        if (seriesCount) seriesCount.value = "";
        if (seriesTargetReps) seriesTargetReps.value = "";
      } else if (editingSeriesIndex !== null && editingSeriesIndex > idx) {
        editingSeriesIndex -= 1;
      }

      updateSeriesButtonState();
      renderCurrentSeries();
    });
  });

  updateSeriesButtonState();
}

function resetExerciseDraft() {
  editingDraftExerciseIndex = null;
  editingSeriesIndex = null;
  currentSeriesDraft = [];
  if (seriesCount) seriesCount.value = "";
  if (seriesTargetReps) seriesTargetReps.value = "";
  if (workoutExerciseNotes) workoutExerciseNotes.value = "";
  if (workoutTechniqueSelect) workoutTechniqueSelect.value = "";
  if (workoutTechniqueNote) workoutTechniqueNote.value = "";
  if (workoutExerciseOrder) workoutExerciseOrder.value = String(workoutDraftExercises.length);
  renderCurrentSeries();
  updateSeriesButtonState();
  updateWorkoutExerciseButtonState();
}

function resetWorkoutDraft() {
  editingDraftExerciseIndex = null;
  editingSeriesIndex = null;
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
  updateSeriesButtonState();
  renderWorkoutDraft();
  updateSeriesButtonState();
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
      <div draggable="true" data-draft-ex-index="${idx}" style="border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:10px;margin:8px 0;cursor:grab;">
        <div style="display:flex;justify-content:space-between;gap:10px;">
          <div>
            <div class="exerciseInlineTitle">
              <b>☰ ${idx + 1}. ${escapeHtml(ex.name)}</b>
              ${buildTechniqueBadgeHtml(ex)}
            </div>
            <div>${escapeHtml(ex.muscleGroup || "Sem agrupamento")}${ex.videoUrl ? " · vídeo vinculado" : ""}</div>
            ${ex.notes ? `<div style="margin-top:6px;">Obs.: ${escapeHtml(ex.notes)}</div>` : ""}
            <div style="margin-top:6px;">Séries: ${ex.series.map((s) => escapeHtml(formatSeriesLabel(s))).join(" · ")}</div>
          </div>
          <div style="display:flex;gap:8px;height:max-content;flex-wrap:wrap;justify-content:flex-end;">
            <button class="btnGhost" type="button" data-edit-draft-ex="${idx}" style="padding:8px 10px;min-width:auto;">Editar</button>
            <button class="btnGhost" type="button" data-duplicate-draft-ex="${idx}" style="padding:8px 10px;min-width:auto;">Duplicar</button>
            <button class="btnGhost" type="button" data-remove-draft-ex="${idx}" style="padding:8px 10px;min-width:auto;">Remover</button>
          </div>
        </div>
      </div>
    `)
    .join("");


  let draggedDraftIndex = null;
  workoutDraftBox.querySelectorAll("[data-draft-ex-index]").forEach((card) => {
    card.addEventListener("dragstart", (ev) => {
      draggedDraftIndex = Number(card.dataset.draftExIndex);
      card.style.opacity = "0.55";
      ev.dataTransfer.effectAllowed = "move";
    });

    card.addEventListener("dragend", () => {
      card.style.opacity = "1";
      draggedDraftIndex = null;
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
      const targetIndex = Number(card.dataset.draftExIndex);
      if (draggedDraftIndex === null || Number.isNaN(targetIndex) || draggedDraftIndex === targetIndex) return;
      const [moved] = workoutDraftExercises.splice(draggedDraftIndex, 1);
      workoutDraftExercises.splice(targetIndex, 0, moved);
      workoutDraftExercises = workoutDraftExercises.map((ex, i) => ({ ...ex, order: i }));
      if (workoutExerciseOrder) workoutExerciseOrder.value = String(workoutDraftExercises.length);
      editingDraftExerciseIndex = null;
      updateWorkoutExerciseButtonState();
      renderWorkoutDraft();
      toast("ok", "Ordem alterada", "Exercícios reorganizados no treino em montagem.");
    });
  });

  workoutDraftBox.querySelectorAll("[data-duplicate-draft-ex]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.duplicateDraftEx);
      const ex = workoutDraftExercises[idx];
      if (!ex) return;

      const duplicated = JSON.parse(JSON.stringify(ex));
      duplicated.id = undefined;
      duplicated.workoutExerciseId = undefined;
      duplicated.order = idx + 1;
      duplicated.series = Array.isArray(duplicated.series)
        ? duplicated.series.map((s, i) => ({
            ...s,
            id: undefined,
            workoutSeriesId: undefined,
            order: Number(s.order ?? i),
          }))
        : [];

      workoutDraftExercises.splice(idx + 1, 0, duplicated);
      workoutDraftExercises = workoutDraftExercises.map((item, i) => ({ ...item, order: i }));

      editingDraftExerciseIndex = null;
      if (workoutExerciseOrder) workoutExerciseOrder.value = String(workoutDraftExercises.length);
      updateWorkoutExerciseButtonState();
      renderWorkoutDraft();
      toast("ok", "Exercício duplicado", "Exercício, séries, técnica e observações foram copiados.");
    });
  });

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

      if (workoutExerciseSearch) {
        workoutExerciseSearch.value = "";
      }
      renderWorkoutExerciseOptions("");

      if (workoutExerciseSelect) {
        const selectedId = found?.id || ex.exerciseId || "";
        workoutExerciseSelect.value = selectedId;
      }

      if (workoutExerciseOrder) workoutExerciseOrder.value = String(ex.order ?? idx);
      if (workoutExerciseNotes) workoutExerciseNotes.value = ex.notes || "";

      const techniqueId = ex.techniqueId || ex.technique?.id || "";
      const techniqueName = ex.techniqueName || ex.technique?.name || "";

      if (workoutTechniqueSelect) {
        if (
          techniqueId &&
          ![...workoutTechniqueSelect.options].some((opt) => String(opt.value) === String(techniqueId))
        ) {
          const opt = document.createElement("option");
          opt.value = techniqueId;
          opt.textContent = techniqueName || "Técnica cadastrada";
          workoutTechniqueSelect.appendChild(opt);
        }
        workoutTechniqueSelect.value = techniqueId || "";
      }

      if (workoutTechniqueNote) {
        workoutTechniqueNote.value = ex.techniqueNote || ex.technique?.exerciseNote || "";
      }

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

function cloneWorkoutForDuplicate(workout = {}, index = 0) {
  const duplicated = JSON.parse(JSON.stringify(workout || {}));

  delete duplicated.id;
  delete duplicated.workoutId;
  delete duplicated.createdAt;
  delete duplicated.updatedAt;

  duplicated.title = `${duplicated.title || `Treino ${index + 1}`} - cópia`;
  duplicated.order = index + 1;
  duplicated.exercises = Array.isArray(duplicated.exercises)
    ? duplicated.exercises.map((ex, exIndex) => {
        const cleanExercise = { ...ex };
        delete cleanExercise.id;
        delete cleanExercise.workoutExerciseId;
        delete cleanExercise.createdAt;
        delete cleanExercise.updatedAt;

        cleanExercise.order = Number(cleanExercise.order ?? exIndex);
        cleanExercise.series = Array.isArray(cleanExercise.series)
          ? cleanExercise.series.map((serie, serieIndex) => {
              const cleanSerie = { ...serie };
              delete cleanSerie.id;
              delete cleanSerie.workoutSeriesId;
              delete cleanSerie.createdAt;
              delete cleanSerie.updatedAt;
              cleanSerie.order = Number(cleanSerie.order ?? serieIndex);
              return cleanSerie;
            })
          : [];

        return cleanExercise;
      })
    : [];

  return duplicated;
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
            <button class="btnGhost" type="button" data-duplicate-workout="${idx}" style="padding:8px 10px;min-width:auto;">Duplicar treino</button>
            <button class="btnGhost" type="button" data-remove-workout="${idx}" style="padding:8px 10px;min-width:auto;">Remover</button>
          </div>
        </div>
        <div style="margin-top:8px;">
          ${(w.exercises || []).map((ex, exIdx) => `
            <div class="studentWorkoutExerciseLine">
              <span>${exIdx + 1}. ${escapeHtml(ex.name)} — ${(ex.series || []).map((s) => escapeHtml(formatSeriesLabel(s))).join(" · ")}</span>
              ${buildTechniqueBadgeHtml(ex)}
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
      setWorkoutUnsaved();
      renderWorkoutList();
      toast("ok", "Ordem alterada", "Clique em Salvar treinos manuais para gravar.");
    });
  });

  workoutListBox.querySelectorAll("[data-remove-workout]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.removeWorkout);
      studentWorkoutList.splice(idx, 1);
      updateWorkoutOrdersFromList();
      setWorkoutUnsaved();
      renderWorkoutList();
    });
  });

  workoutListBox.querySelectorAll("[data-duplicate-workout]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.duplicateWorkout);
      const workout = studentWorkoutList[idx];
      if (!workout) return;

      const duplicated = cloneWorkoutForDuplicate(workout, idx);
      studentWorkoutList.splice(idx + 1, 0, duplicated);
      updateWorkoutOrdersFromList();
      setWorkoutUnsaved();
      renderWorkoutList();
      toast("ok", "Treino duplicado", "O treino completo foi copiado. Clique em Salvar treinos manuais para gravar.");
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
      refreshExercises().catch(() => {});
      refreshTechniques().catch(() => {});
      workoutDraftExercises = Array.isArray(w.exercises) ? JSON.parse(JSON.stringify(w.exercises)) : [];
      studentWorkoutList.splice(idx, 1);
      updateWorkoutOrdersFromList();
      setWorkoutUnsaved();
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

  const payload = {
    count,
    reps,
    targetReps: reps,
    order: editingSeriesIndex !== null ? editingSeriesIndex : currentSeriesDraft.length,
  };

  if (editingSeriesIndex !== null && currentSeriesDraft[editingSeriesIndex]) {
    currentSeriesDraft[editingSeriesIndex] = payload;
    toast("ok", "Série atualizada", "O bloco de séries/reps foi atualizado.");
  } else {
    currentSeriesDraft.push(payload);
    toast("ok", "Série adicionada", "Bloco de séries/reps adicionado.");
  }

  currentSeriesDraft = currentSeriesDraft.map((s, i) => ({ ...s, order: i }));
  editingSeriesIndex = null;
  setWorkoutUnsaved();

  if (seriesCount) seriesCount.value = "";
  if (seriesTargetReps) seriesTargetReps.value = "";

  updateSeriesButtonState();
  renderCurrentSeries();
});

seriesClearBtn?.addEventListener("click", () => {
  editingSeriesIndex = null;
  currentSeriesDraft = [];
  if (seriesCount) seriesCount.value = "";
  if (seriesTargetReps) seriesTargetReps.value = "";
  updateSeriesButtonState();
  renderCurrentSeries();
  setWorkoutUnsaved();
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
    techniqueName: (workoutTechniqueSelect?.value ? workoutTechniqueSelect?.selectedOptions?.[0]?.textContent?.trim() : "") || "",
    techniqueNote: (workoutTechniqueNote?.value || "").trim(),
    techniqueVideoUrl: techniqueCatalog.find((t) => String(t.id) === String(workoutTechniqueSelect?.value || ""))?.videoUrl || "",
    techniqueNotes: techniqueCatalog.find((t) => String(t.id) === String(workoutTechniqueSelect?.value || ""))?.notes || "",
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
  setWorkoutUnsaved();
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
  setWorkoutUnsaved();
  renderWorkoutList();
  resetWorkoutDraft();
  toast("ok", "Treino adicionado", "Não esqueça de clicar em Salvar treinos manuais.");
});
