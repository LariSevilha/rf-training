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
    window.__videoCatalog = items;
    renderExerciseVideoOptions(items);
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

  renderWorkoutExerciseOptions(workoutExerciseSearch?.value || "");
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
  if (hasUnsavedWorkoutChanges()) {
    const ok = await confirmDiscardWorkoutChanges();
    if (!ok) return;
  }
  const em = (workoutStudentEmail?.value || studentEmail?.value || "").trim().toLowerCase();
  if (!em) return toast("error", "Atenção", "Informe o email do aluno.");

  try {
    await refreshExercises();
    await refreshTechniques().catch(() => {});
    const manual = await apiAdminGetWorkouts(token, em);
    studentWorkoutList = Array.isArray(manual.workouts) ? manual.workouts : [];
    renderWorkoutList();
    resetWorkoutDraft();
    clearWorkoutUnsaved();
    toast("ok", "Treinos carregados", "Treinos manuais atualizados na tela.");
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao carregar treinos.");
  }
});

workoutSaveBtn?.addEventListener("click", async () => {
  const em = (workoutStudentEmail?.value || studentEmail?.value || "").trim().toLowerCase();
  if (!em) return toast("error", "Atenção", "Informe o email do aluno.");

  try {
    if (typeof commitEditingWorkoutDraft === "function" && !commitEditingWorkoutDraft({ silent: true })) return;

    const cleanWorkouts = typeof buildCleanWorkoutPayload === "function"
      ? buildCleanWorkoutPayload(studentWorkoutList)
      : studentWorkoutList;

    await apiAdminSaveWorkouts(token, em, cleanWorkouts);
    studentWorkoutList = cleanWorkouts;
    renderWorkoutList();
    resetWorkoutDraft();
    clearWorkoutUnsaved();
    toast("ok", "Treinos salvos", "Treinos manuais do aluno atualizados.");
  } catch (e) {
    toast("error", "Erro ao salvar", e.message || "Erro ao salvar treinos.");
  }
});
