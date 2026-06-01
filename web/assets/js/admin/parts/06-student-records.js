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
        <button class="recordsStudentItem recordsStudentCard ${activeClass}" type="button" data-record-student="${escapeHtml(email)}">
          <span class="recordsStudentAvatar">${escapeHtml(getInitials(u.name || u.email || "RF"))}</span>
          <span class="recordsStudentInfo">
            <b>${escapeHtml(u.name || "Sem nome")}</b>
            <small>${escapeHtml(u.email)}</small>
          </span>
          <span class="recordsStudentStatus ${u.active ? "isActive" : "isInactive"}">${u.active ? "Ativo" : "Inativo"}</span>
          <span class="recordsStudentOpen">Abrir histórico ›</span>
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

      if (window.__setRoute) {
        window.__setRoute("records-detail");
      } else {
        await loadWorkoutRecords();
      }
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

function groupRecordLogsByExercise(logs = []) {
  const grouped = new Map();

  (logs || []).forEach((log) => {
    const exerciseName = log.exerciseName || "Exercício";
    const muscleGroup = log.muscleGroup || "";
    const key = `${exerciseName}__${muscleGroup}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        exerciseName,
        muscleGroup,
        exerciseOrder: Number(log.exerciseOrder ?? 999),
        sets: [],
      });
    }

    grouped.get(key).sets.push(log);
  });

  return [...grouped.values()]
    .sort((a, b) => Number(a.exerciseOrder ?? 999) - Number(b.exerciseOrder ?? 999))
    .map((exercise) => ({
      ...exercise,
      sets: exercise.sets.sort((a, b) => Number(a.setIndex || 0) - Number(b.setIndex || 0)),
    }));
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
    .map((record) => {
      const groupedExercises = groupRecordLogsByExercise(record.logs || []);
      const weekLabel = record.weekStart ? formatDateTimeBR(record.weekStart).split(",")[0] : "—";

      return `
        <article class="recordHistoryCard">
          <div class="recordHistoryHead">
            <div>
              <span class="recordStudentName">${escapeHtml(record.studentName || record.studentEmail || "Aluno")}</span>
              <b>${escapeHtml(record.workoutTitle || "Treino")}</b>
              <small>${escapeHtml(record.studentEmail || "")} · ${formatDateTimeBR(record.date)} · Semana: ${weekLabel}</small>
            </div>
            <span class="recordExerciseCount">${groupedExercises.length} exercício(s)</span>
          </div>

          ${record.notes ? `<div class="recordNote"><b>Observação do aluno:</b><br>${escapeHtml(record.notes)}</div>` : `<div class="recordNote muted">Sem observação do aluno.</div>`}

          <div class="recordExerciseList">
            ${groupedExercises.map((exercise, exIndex) => `
              <section class="recordExerciseGroup">
                <div class="recordExerciseHead">
                  <div>
                    <strong>${exIndex + 1}. ${escapeHtml(exercise.exerciseName || "Exercício")}</strong>
                    ${exercise.muscleGroup ? `<small>${escapeHtml(exercise.muscleGroup)}</small>` : ""}
                  </div>
                  <span>${exercise.sets.length} série(s)</span>
                </div>

                <div class="recordSeriesGrid">
                  ${exercise.sets.map((log) => `
                    <div class="recordSeriesItem">
                      <span>Série ${Number(log.setIndex || 0) + 1}</span>
                      <small>Alvo: ${escapeHtml(log.targetReps || "—")}</small>
                      <b>${log.weight ?? "—"} kg · ${log.performedReps ?? "—"} reps</b>
                    </div>
                  `).join("")}
                </div>
              </section>
            `).join("")}
          </div>
        </article>
      `;
    })
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
      .session h2{margin:0 0 6px;font-size:18px}
      .note{background:#fafafa;border-left:4px solid #ceac5e;padding:10px;margin-top:10px}
      .exercise{border:1px solid #e4e4e4;border-radius:10px;margin-top:12px;padding:10px;break-inside:avoid}
      .exercise h3{margin:0 0 3px;font-size:14px}
      .series{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:8px}
      .serie{border:1px solid #e7e7e7;border-radius:8px;padding:8px;font-size:12px;background:#fafafa}
      .serie b{display:block;margin-top:4px;font-size:13px}
      @media print{.series{grid-template-columns:repeat(2,minmax(0,1fr))}}
    </style>
    </head><body><h1>Registros dos alunos</h1><p class="muted">Gerado em ${new Date().toLocaleString("pt-BR")}</p>
    ${records.map((record) => {
      const groupedExercises = groupRecordLogsByExercise(record.logs || []);
      return `
        <div class="session">
          <h2>${escapeHtml(record.studentName || record.studentEmail)} · ${escapeHtml(record.workoutTitle || "Treino")}</h2>
          <p class="muted">${escapeHtml(record.studentEmail)} · ${formatDateTimeBR(record.date)}</p>
          ${record.notes ? `<div class="note"><b>Observação:</b><br>${escapeHtml(record.notes)}</div>` : ""}
          ${groupedExercises.map((exercise, exIndex) => `
            <div class="exercise">
              <h3>${exIndex + 1}. ${escapeHtml(exercise.exerciseName || "Exercício")}</h3>
              ${exercise.muscleGroup ? `<div class="muted">${escapeHtml(exercise.muscleGroup)}</div>` : ""}
              <div class="series">
                ${exercise.sets.map((log) => `
                  <div class="serie">
                    <span>Série ${Number(log.setIndex || 0) + 1}</span><br>
                    <span>Alvo: ${escapeHtml(log.targetReps || "—")}</span>
                    <b>${log.weight ?? "—"} kg · ${log.performedReps ?? "—"} reps</b>
                  </div>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }).join("")}
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

recordsBackBtn?.addEventListener("click", () => {
  if (window.__setRoute) window.__setRoute("records");
});
