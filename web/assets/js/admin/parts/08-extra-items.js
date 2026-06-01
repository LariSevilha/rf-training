// ===== ITENS EXTRAS DO ALUNO =====
function resetExtraSelection() {
  selectedExtraStudentEmail = "";
  if (extraStudentEmail) extraStudentEmail.value = "";
  studentExtraItems = [];
  clearExtraForm();
  updateSelectedExtraStudentBox();
  renderExtraStudentsList();
  renderExtraItems();
}

function clearExtraForm() {
  if (extraTitle) extraTitle.value = "";
  if (extraUrl) extraUrl.value = "";
  if (extraNotes) extraNotes.value = "";
  if (extraOrder) extraOrder.value = String(studentExtraItems.length);
  if (extraActive) extraActive.checked = true;
}

function updateSelectedExtraStudentBox() {
  if (!extraSelectedStudentBox) return;

  if (!selectedExtraStudentEmail) {
    extraSelectedStudentBox.innerHTML = `Selecione um aluno na lista antes de adicionar ou salvar itens extras.`;
    return;
  }

  const student = extraStudents.find(
    (u) => String(u.email || "").toLowerCase() === selectedExtraStudentEmail
  );

  extraSelectedStudentBox.innerHTML = student
    ? `<b>${escapeHtml(student.name || "Sem nome")}</b><br><span>${escapeHtml(student.email)}</span>`
    : `Aluno selecionado: ${escapeHtml(selectedExtraStudentEmail)}`;
}

async function refreshExtraStudents({ reset = false } = {}) {
  if (!extraStudentsList) return;

  extraStudentsList.innerHTML = `<div class="smallHint">Carregando alunos...</div>`;

  try {
    const data = await apiAdminListUsers(token, "");

    // Algumas versões da API não retornam role. Por isso não filtramos por role aqui.
    // O importante é carregar todos os cadastros disponíveis para seleção.
    extraStudents = Array.isArray(data?.users) ? data.users : [];

    if (reset) {
      selectedExtraStudentEmail = "";
      if (extraStudentEmail) extraStudentEmail.value = "";
      studentExtraItems = [];
      clearExtraForm();
    }

    renderExtraStudentsList();
    updateSelectedExtraStudentBox();
    renderExtraItems();
  } catch (e) {
    console.error("refreshExtraStudents error:", e);
    extraStudents = [];
    extraStudentsList.innerHTML = `
      <div class="emptyState">
        <h3>Erro ao carregar alunos</h3>
        <p>${escapeHtml(e?.message || "Tente atualizar novamente.")}</p>
      </div>
    `;
  }
}

function renderExtraStudentsList() {
  if (!extraStudentsList) return;

  const q = normalizeText(extraStudentSearch?.value || "");
  const filtered = extraStudents.filter((u) => {
    const name = normalizeText(u.name || "");
    const email = normalizeText(u.email || "");
    return !q || name.includes(q) || email.includes(q);
  });

  if (!filtered.length) {
    extraStudentsList.innerHTML = `
      <div class="emptyState">
        <h3>Nenhum aluno encontrado</h3>
        <p>Tente buscar por outro nome ou email.</p>
      </div>
    `;
    return;
  }

  extraStudentsList.innerHTML = filtered
    .map((u) => {
      const email = String(u.email || "").toLowerCase();
      const activeClass = email === selectedExtraStudentEmail ? "active" : "";

      return `
        <button class="extraStudentItem recordsStudentItem ${activeClass}" type="button" data-extra-student="${escapeHtml(email)}">
          <span>
            <b>${escapeHtml(u.name || "Sem nome")}</b>
            <small>${escapeHtml(u.email)}</small>
          </span>
          <span>${u.active ? "🟢" : "🔴"}</span>
        </button>
      `;
    })
    .join("");

  extraStudentsList.querySelectorAll("[data-extra-student]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      selectedExtraStudentEmail = String(btn.dataset.extraStudent || "").trim().toLowerCase();
      if (extraStudentEmail) extraStudentEmail.value = selectedExtraStudentEmail;
      updateSelectedExtraStudentBox();
      renderExtraStudentsList();
      await loadExtraItems();
    });
  });
}

function renderExtraItems() {
  if (!extraItemsBox) return;

  if (!selectedExtraStudentEmail) {
    extraItemsBox.innerHTML = "Selecione um aluno para carregar os itens.";
    return;
  }

  if (!studentExtraItems.length) {
    extraItemsBox.innerHTML = "Nenhum item extra cadastrado para este aluno.";
    return;
  }
  extraItemsBox.innerHTML = studentExtraItems.map((item, idx) => `
    <div style="border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:12px;margin:8px 0;display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
      <div style="min-width:0;">
        <b>${idx + 1}. ${escapeHtml(item.title)}</b>
        <div style="word-break:break-word;opacity:.78;">${item.active === false ? "Inativo" : "Ativo"} · ${escapeHtml(item.url)}</div>
        ${item.notes ? `<div style="margin-top:6px;opacity:.78;">Obs.: ${escapeHtml(item.notes)}</div>` : ""}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
        <button class="btnGhost" type="button" data-edit-extra="${idx}" style="padding:6px 10px;min-width:auto;">Editar</button>
        <button class="btnGhost" type="button" data-remove-extra="${idx}" style="padding:6px 10px;min-width:auto;">Remover</button>
      </div>
    </div>
  `).join("");

  extraItemsBox.querySelectorAll("[data-edit-extra]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.editExtra);
      const item = studentExtraItems[idx];
      if (!item) return;
      if (extraTitle) extraTitle.value = item.title || "";
      if (extraUrl) extraUrl.value = item.url || "";
      if (extraNotes) extraNotes.value = item.notes || "";
      if (extraOrder) extraOrder.value = String(item.order ?? idx);
      if (extraActive) extraActive.checked = item.active !== false;
      studentExtraItems.splice(idx, 1);
      renderExtraItems();
    });
  });
  extraItemsBox.querySelectorAll("[data-remove-extra]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.dataset.removeExtra);
      studentExtraItems.splice(idx, 1);
      studentExtraItems = studentExtraItems.map((item, i) => ({ ...item, order: i }));
      renderExtraItems();
      clearExtraForm();
    });
  });
}

async function loadExtraItems() {
  const em = (selectedExtraStudentEmail || extraStudentEmail?.value || "").trim().toLowerCase();
  if (!em) return toast("error", "Atenção", "Selecione um aluno primeiro.");
  selectedExtraStudentEmail = em;
  if (extraStudentEmail) extraStudentEmail.value = em;
  try {
    const data = await apiAdminGetExtraItems(token, em);
    studentExtraItems = Array.isArray(data.items) ? data.items : [];
    updateSelectedExtraStudentBox();
    renderExtraStudentsList();
    renderExtraItems();
    clearExtraForm();
    toast("ok", "Itens carregados", "Lista atualizada.");
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao carregar itens.");
  }
}

extraStudentSearch?.addEventListener("input", async () => {
  if (!extraStudents.length) {
    await refreshExtraStudents({ reset: false });
    return;
  }
  renderExtraStudentsList();
});
extraLoadBtn?.addEventListener("click", loadExtraItems);
extraSaveBtn?.addEventListener("click", async () => {
  const em = (selectedExtraStudentEmail || extraStudentEmail?.value || "").trim().toLowerCase();
  if (!em) return toast("error", "Atenção", "Selecione um aluno primeiro.");
  try {
    const cleanItems = studentExtraItems
      .map((item, idx) => ({
        title: String(item.title || "").trim(),
        url: String(item.url || "").trim(),
        notes: item.notes || "",
        active: item.active !== false,
        order: Number(item.order ?? idx),
      }))
      .filter((item) => item.title && item.url);
    const saved = await apiAdminSaveExtraItems(token, em, cleanItems);
    studentExtraItems = Array.isArray(saved?.items) ? saved.items : cleanItems;
    renderExtraItems();
    await loadExtraItems();
    toast("ok", "Itens salvos", "Os itens extras foram gravados no banco e recarregados.");
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao salvar itens.");
  }
});
extraAddBtn?.addEventListener("click", () => {
  if (!selectedExtraStudentEmail) return toast("error", "Atenção", "Selecione um aluno antes de adicionar o item.");
  const title = (extraTitle?.value || "").trim();
  const url = (extraUrl?.value || "").trim();
  if (!title) return toast("error", "Atenção", "Informe o título do item.");
  if (!url) return toast("error", "Atenção", "Informe o link do arquivo/PDF.");
  studentExtraItems.push({
    title,
    url,
    notes: (extraNotes?.value || "").trim(),
    active: extraActive ? !!extraActive.checked : true,
    order: Number(extraOrder?.value || studentExtraItems.length),
  });
  studentExtraItems.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  renderExtraItems();
  clearExtraForm();
});
extraClearBtn?.addEventListener("click", clearExtraForm);
