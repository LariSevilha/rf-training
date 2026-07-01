// ===== Events =====
logoutBtn?.addEventListener("click", async () => {
  if (isManualWorkoutBuilderActive() && hasUnsavedWorkoutChanges()) {
    const ok = await confirmDiscardWorkoutChanges();
    if (!ok) return;
  }

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
setEditDocPanel("training");
