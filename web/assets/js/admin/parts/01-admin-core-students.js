// ===== Admin footer/profile =====
function getInitials(nameOrEmail = "") {
  const base = String(nameOrEmail || "").trim();
  if (!base) return "RF";
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

function initTheme() {
  // Tema claro/escuro removido. Mantém o painel no tema padrão escuro.
  document.documentElement.removeAttribute("data-theme");
  localStorage.removeItem("rf-admin-theme");
}

// ===== Helpers =====

function clearEditFields() {
  if (training) training.value = "";
  if (diet) diet.value = "";
  if (supp) supp.value = "";
  if (cardioName) cardioName.value = "";
  if (cardioTime) cardioTime.value = "";
  if (cardioIntensity) cardioIntensity.value = "";
  if (cardioDays) cardioDays.value = "";
  if (exams) exams.value = "";
  if (stretch) stretch.value = "";
}

function getActiveEditDocPanel() {
  return document.querySelector(".editDocTab.active[data-doc-panel]")?.dataset?.docPanel || "training";
}

function updateTrainingModeUI() {
  const mode = trainingMode?.value || "pdf";
  const activePanel = getActiveEditDocPanel();
  const isTrainingPanel = activePanel === "training";

  if (pdfTrainingBox) {
    pdfTrainingBox.style.display = isTrainingPanel && mode === "pdf" ? "block" : "none";
  }

  if (manualTrainingBox) {
    manualTrainingBox.style.display = isTrainingPanel && mode === "manual" ? "block" : "none";
  }
}

function setEditDocPanel(name = "training") {
  document.querySelectorAll(".editDocTab[data-doc-panel]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.docPanel === name);
  });

  document.querySelectorAll(".editDocPanel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `doc-panel-${name}`);
  });

  updateTrainingModeUI();
}
function markSelectedRow(tr) {
  if (selectedRow) selectedRow.classList.remove("selected");
  selectedRow = tr;
  if (selectedRow) selectedRow.classList.add("selected");
}

function normalizeText(v) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function compareDatesDesc(a, b) {
  return new Date(pickDate(b) || 0) - new Date(pickDate(a) || 0);
}

function compareDatesAsc(a, b) {
  return new Date(pickDate(a) || 0) - new Date(pickDate(b) || 0);
}

function getEmailDomain(email) {
  const clean = String(email || "").trim().toLowerCase();
  const parts = clean.split("@");
  return parts[1] || "—";
}

function buildDomainSummary(users) {
  const map = new Map();

  for (const u of users || []) {
    const domain = getEmailDomain(u.email);
    map.set(domain, (map.get(domain) || 0) + 1);
  }

  return [...map.entries()]
    .map(([domain, total]) => ({ domain, total }))
    .sort((a, b) => b.total - a.total || a.domain.localeCompare(b.domain, "pt-BR"));
}

function applyDashboardExtraFilters(users) {
  let out = [...(users || [])];

  const status = dashStatus?.value || "all";
  const named = dashNamed?.value || "all";
  const text = normalizeText(dashText?.value || "");
  const sort = dashSort?.value || "recent";

  if (status === "active") {
    out = out.filter((u) => !!u.active);
  } else if (status === "inactive") {
    out = out.filter((u) => !u.active);
  }

  if (named === "with-name") {
    out = out.filter((u) => !!String(u.name || "").trim());
  } else if (named === "without-name") {
    out = out.filter((u) => !String(u.name || "").trim());
  }

  if (text) {
    out = out.filter((u) => {
      const name = normalizeText(u.name || "");
      const email = normalizeText(u.email || "");
      return name.includes(text) || email.includes(text);
    });
  }

  if (sort === "recent") out.sort(compareDatesDesc);
  if (sort === "oldest") out.sort(compareDatesAsc);
  if (sort === "name-asc") {
    out.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"));
  }
  if (sort === "name-desc") {
    out.sort((a, b) => String(b.name || "").localeCompare(String(a.name || ""), "pt-BR"));
  }
  if (sort === "email-asc") {
    out.sort((a, b) => String(a.email || "").localeCompare(String(b.email || ""), "pt-BR"));
  }

  return out;
}

async function selectUser(email, isActive, name = "") {
  if (studentEmail) studentEmail.value = email;
  if (studentName) studentName.value = name || "";
  if (active) active.checked = !!isActive;

  clearEditFields();
  setEditDocPanel("training");

  const docs = await apiAdminGetDocs(token, email);
  if (training) training.value = docs.training || "";
  if (diet) diet.value = docs.diet || "";
  if (supp) supp.value = docs.supp || "";
  const cardioData = parseCardioPayload(docs.cardio);
  if (cardioName) cardioName.value = docs.cardioName || cardioData.name || "";
  if (cardioTime) cardioTime.value = docs.cardioTime || cardioData.time || "";
  if (cardioIntensity) cardioIntensity.value = docs.cardioIntensity || cardioData.intensity || "";
  if (cardioDays) cardioDays.value = docs.cardioDays || cardioData.days || "";
  if (exams) exams.value = docs.exams || "";
  if (stretch) stretch.value = docs.stretch || "";

  if (workoutStudentEmail) workoutStudentEmail.value = email;
  if (recordsStudentSelect) recordsStudentSelect.value = email;
  if (recordsEmail) recordsEmail.value = email;

  try {
    const manual = await apiAdminGetWorkouts(token, email);
    studentWorkoutList = Array.isArray(manual.workouts) ? manual.workouts : [];
    renderWorkoutList();
  } catch {
    studentWorkoutList = [];
    renderWorkoutList();
  }

  if (trainingMode) {
    trainingMode.value = studentWorkoutList.length ? "manual" : "pdf";
  }
  updateTrainingModeUI();
}

function renderUsers(users) {
  if (!userList) return;
  userList.innerHTML = "";

  const list = Array.isArray(users) ? users : [];
  const activeCount = list.filter((u) => !!u.active).length;
  const inactiveCount = list.length - activeCount;
  const query = (search?.value || "").trim();

  if (studentsTotalCount) studentsTotalCount.textContent = String(list.length);
  if (studentsActiveCount) studentsActiveCount.textContent = String(activeCount);
  if (studentsInactiveCount) studentsInactiveCount.textContent = String(inactiveCount);
  if (studentsResultText) {
    studentsResultText.textContent = list.length
      ? `${list.length} aluno${list.length > 1 ? "s" : ""} encontrado${list.length > 1 ? "s" : ""}${query ? ` para “${query}”` : ""}.`
      : query
        ? `Nenhum aluno encontrado para “${query}”.`
        : "Nenhum aluno cadastrado ainda.";
  }

  if (list.length === 0) {
    const tr = document.createElement("tr");
    tr.className = "studentsEmptyRow";
    tr.innerHTML = `<td colspan="4"><div class="emptyStudentsState"><strong>Nenhum aluno encontrado</strong><span>Revise a busca ou cadastre um novo aluno.</span></div></td>`;
    userList.appendChild(tr);
    return;
  }

  list.forEach((u) => {
    const tr = document.createElement("tr");
    const nm = (u.name || "").trim();
    const initials = (nm || u.email || "A")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

    tr.innerHTML = `
      <td data-label="Aluno">
        <div class="studentCell">
          <div class="studentAvatar">${escapeHtml(initials || "A")}</div>
          <div class="studentIdentity">
            <strong>${escapeHtml(nm || "Sem nome")}</strong>
            <small>${u.active ? "Acesso liberado" : "Acesso bloqueado"}</small>
          </div>
        </div>
      </td>
      <td data-label="Email"><span class="studentEmailText">${escapeHtml(u.email)}</span></td>
      <td data-label="Status"><span class="statusBadge ${u.active ? "isActive" : "isInactive"}">${u.active ? "Ativo" : "Inativo"}</span></td>
      <td data-label="Ações">
        <div class="studentActions">
          <button class="iconAction" data-act="edit" title="Editar aluno" aria-label="Editar aluno">✎</button>
          <button class="iconAction danger" data-act="del" title="Excluir aluno" aria-label="Excluir aluno">🗑</button>
        </div>
      </td>
    `;

    tr.addEventListener("click", async () => {
      markSelectedRow(tr);
      try {
        await selectUser(u.email, u.active, u.name || "");
        toast("ok", "Aluno selecionado", "Dados carregados.");
        if (window.__setRoute) window.__setRoute("edit");
      } catch (e) {
        toast("error", "Erro", e.message || "Erro ao carregar documentos do aluno.");
      }
    });

    tr.querySelector('[data-act="edit"]')?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      tr.click();
    });

    tr.querySelector('[data-act="del"]')?.addEventListener("click", async (ev) => {
      ev.stopPropagation();

      const okConfirm = await openModal({
        title: "Deletar aluno",
        text: `Tem certeza que deseja deletar ${u.email}? Essa ação não pode ser desfeita.`,
        mode: "confirm",
        okText: "Deletar",
      });

      if (!okConfirm) return;

      try {
        await apiAdminDeleteUser(token, u.email);

        if ((studentEmail?.value || "").toLowerCase() === u.email.toLowerCase()) {
          if (studentName) studentName.value = "";
          if (studentEmail) studentEmail.value = "";
          if (active) active.checked = true;
          if (training) training.value = "";
          if (diet) diet.value = "";
          if (supp) supp.value = "";
          if (cardioName) cardioName.value = "";
          if (cardioTime) cardioTime.value = "";
          if (cardioIntensity) cardioIntensity.value = "";
          if (cardioDays) cardioDays.value = "";
          if (exams) exams.value = "";
          if (stretch) stretch.value = "";
          studentWorkoutList = [];
          renderWorkoutList();
        }

        await refreshList();
      } catch (e) {
        toast("error", "Erro", e.message || "Erro ao deletar.");
      }
    });

    userList.appendChild(tr);
  });
}

async function refreshList() {
  const q = (search?.value || "").trim();
  const data = await apiAdminListUsers(token, q);
  renderUsers(data.users || []);
}

function buildMonthOptions(n = 24) {
  const now = new Date();
  const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
  const keys = [];

  for (let i = 0; i < n; i++) {
    keys.push(monthKey(cursor));
    cursor.setMonth(cursor.getMonth() - 1);
  }

  return keys;
}

function fillMonthSelects() {
  if (!dashFrom || !dashTo) return;

  const keys = buildMonthOptions(24);
  const opts = keys.map((k) => `<option value="${k}">${monthLabel(k)}</option>`).join("");

  dashFrom.innerHTML = opts;
  dashTo.innerHTML = opts;

  const defaultTo = keys[0];
  const defaultFrom = keys[Math.min(5, keys.length - 1)];

  dashFrom.value = defaultFrom;
  dashTo.value = defaultTo;
}

function renderMonthly(rows) {
  if (!dashMonthlyBody) return;

  if (!rows || rows.length === 0) {
    dashMonthlyBody.innerHTML = `<tr><td colspan="4" style="opacity:.7;padding:12px;">—</td></tr>`;
    return;
  }

  dashMonthlyBody.innerHTML = rows
    .map(
      (r) => `
      <tr>
        <td>${monthLabel(r.key)}</td>
        <td>${r.total}</td>
        <td>${r.active}</td>
        <td>${r.inactive}</td>
      </tr>
    `
    )
    .join("");
}
