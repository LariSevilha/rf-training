import { requireAuth } from "./guard.js";
import {
  apiAdminListUsers,
  apiAdminCreateUser,
  apiAdminUpdateProfile,
  apiAdminGetDocs,
  apiAdminSetActive,
  apiAdminSaveDocs,
  apiAdminResetPassword,
  apiAdminDeleteUser,
  apiMe,
  apiUpdateMe,
  apiUpdateMyPassword,
} from "./api.js";
import { clearSession } from "./state.js";
import { toast, openModal } from "./ui.js";
import {
  buildDashboardPrintHTML,
  monthKey,
  monthLabel,
  pct,
  pickDate,
  monthsBetween,
} from "./helpers/report.js";

// ===== Elements =====
const who = document.getElementById("who");
const mName = document.getElementById("mName");
const logoutBtn = document.getElementById("logoutBtn");

// Create
const newName = document.getElementById("newName");
const newEmail = document.getElementById("newEmail");
const newPass = document.getElementById("newPass");
const newActive = document.getElementById("newActive");
const createBtn = document.getElementById("createBtn");

// List
const search = document.getElementById("search");
const refreshBtn = document.getElementById("refreshBtn");
const userList = document.getElementById("userList");

// Edit
const studentName = document.getElementById("studentName");
const studentEmail = document.getElementById("studentEmail");
const active = document.getElementById("active");

const training = document.getElementById("training");
const diet = document.getElementById("diet");
const supp = document.getElementById("supp");
const stretch = document.getElementById("stretch");

const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const deleteBtn = document.getElementById("deleteBtn");

// ===== Dashboard Elements =====
const dashTotal = document.getElementById("dashTotal");
const dashActive = document.getElementById("dashActive");
const dashInactive = document.getElementById("dashInactive");
const dashActivePct = document.getElementById("dashActivePct");
const dashInactivePct = document.getElementById("dashInactivePct");

const dashMonthlyBody = document.getElementById("dashMonthlyBody");
const dashRefreshBtn = document.getElementById("dashRefreshBtn");

const dashFrom = document.getElementById("dashFrom");
const dashTo = document.getElementById("dashTo");
const dashApplyBtn = document.getElementById("dashApplyBtn");
const dashPdfBtn = document.getElementById("dashPdfBtn");

const dashPeriodNew = document.getElementById("dashPeriodNew");
const dashPeriodLabel = document.getElementById("dashPeriodLabel");

// ===== ME (Admin Profile) =====
const meName = document.getElementById("meName");
const meEmail = document.getElementById("meEmail");
const mePass1 = document.getElementById("mePass1");
const mePass2 = document.getElementById("mePass2");
const meSaveBtn = document.getElementById("meSaveBtn");
const meRefreshBtn = document.getElementById("meRefreshBtn");

let token = null;
let selectedRow = null;
let meSessionUser = null;
let dashboardUsers = [];
let dashboardMonthlyRows = [];

// ===== Helpers =====
function clearEditFields() {
  if (training) training.value = "";
  if (diet) diet.value = "";
  if (supp) supp.value = "";
  if (stretch) stretch.value = "";
}

function markSelectedRow(tr) {
  if (selectedRow) selectedRow.classList.remove("selected");
  selectedRow = tr;
  if (selectedRow) selectedRow.classList.add("selected");
}

async function selectUser(email, isActive, name = "") {
  if (studentEmail) studentEmail.value = email;
  if (studentName) studentName.value = name || "";
  if (active) active.checked = !!isActive;

  clearEditFields();

  const docs = await apiAdminGetDocs(token, email);
  if (training) training.value = docs.training || "";
  if (diet) diet.value = docs.diet || "";
  if (supp) supp.value = docs.supp || "";
  if (stretch) stretch.value = docs.stretch || "";
}

function renderUsers(users) {
  if (!userList) return;
  userList.innerHTML = "";

  if (!users || users.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="4" style="opacity:.7;padding:12px;">Nenhum aluno encontrado.</td>`;
    userList.appendChild(tr);
    return;
  }

  users.forEach((u) => {
    const tr = document.createElement("tr");
    const nm = (u.name || "").trim();

    tr.innerHTML = `
      <td style="width:92px;">${u.active ? "🟢" : "🔴"}</td>
      <td style="opacity:${nm ? 1 : 0.6};">${nm || "—"}</td>
      <td>${u.email}</td>
      <td style="width:120px;">
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button class="btnGhost" data-act="edit" title="Editar"
            style="padding:10px 12px; border-radius:14px; min-width:auto;">✎</button>
          <button class="btnGhost" data-act="del" title="Excluir"
            style="padding:10px 12px; border-radius:14px; min-width:auto;">🗑</button>
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
        toast("ok", "Aluno deletado", "Conta removida com sucesso.");

        if ((studentEmail?.value || "").trim().toLowerCase() === u.email.toLowerCase()) {
          if (studentEmail) studentEmail.value = "";
          if (studentName) studentName.value = "";
          clearEditFields();
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

async function loadDashboard() {
  if (!dashTotal || !dashMonthlyBody) return;

  try {
    dashTotal.textContent = "…";
    dashActive.textContent = "…";
    dashInactive.textContent = "…";
    if (dashPeriodNew) dashPeriodNew.textContent = "…";
    if (dashActivePct) dashActivePct.textContent = "—";
    if (dashInactivePct) dashInactivePct.textContent = "—";
    if (dashPeriodLabel) dashPeriodLabel.textContent = "—";

    dashMonthlyBody.innerHTML = `<tr><td colspan="4" style="opacity:.7;padding:12px;">Carregando...</td></tr>`;

    const data = await apiAdminListUsers(token, "");
    const users = data?.users || [];

    dashboardUsers = users;

    const total = users.length;
    const activeCount = users.filter((u) => !!u.active).length;
    const inactiveCount = total - activeCount;

    dashTotal.textContent = String(total);
    dashActive.textContent = String(activeCount);
    dashInactive.textContent = String(inactiveCount);

    if (dashActivePct) dashActivePct.textContent = `${pct(activeCount, total)} do total`;
    if (dashInactivePct) dashInactivePct.textContent = `${pct(inactiveCount, total)} do total`;

    const fromKey = dashFrom?.value || monthKey(new Date());
    const toKey = dashTo?.value || monthKey(new Date());
    const keys = monthsBetween(fromKey, toKey);

    if (dashPeriodLabel) {
      dashPeriodLabel.textContent = `Período: ${monthLabel(keys[0])} → ${monthLabel(keys[keys.length - 1])}`;
    }

    const periodUsers = users.filter((u) => {
      const d = pickDate(u);
      if (!d) return false;
      return keys.includes(monthKey(d));
    });

    const periodNew = periodUsers.length;

    if (dashPeriodNew) dashPeriodNew.textContent = String(periodNew);

    const monthly = keys.map((key) => {
      const inMonth = users.filter((u) => {
        const d = pickDate(u);
        if (!d) return false;
        return monthKey(d) === key;
      });

      const t = inMonth.length;
      const a = inMonth.filter((u) => !!u.active).length;

      return {
        key,
        total: t,
        active: a,
        inactive: t - a,
      };
    });

    dashboardMonthlyRows = monthly;
    renderMonthly(monthly);
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao carregar dashboard.");
    if (dashMonthlyBody) {
      dashMonthlyBody.innerHTML = `<tr><td colspan="4" style="opacity:.7;padding:12px;">Erro ao carregar.</td></tr>`;
    }
  }
}

// ===== ME (Admin) =====
async function loadMe() {
  try {
    const data = await apiMe(token);

    if (!data?.user?.email) {
      toast("error", "Erro", "API /me não retornou um usuário válido.");
      return;
    }

    meSessionUser = data.user;

    if (meName) meName.value = (data.user.name || "").trim();
    if (meEmail) meEmail.value = (data.user.email || "").trim();
    if (who) who.textContent = data.user.email;
    if (mName) mName.textContent = data.user.name || "";

    if (mePass1) mePass1.value = "";
    if (mePass2) mePass2.value = "";
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao carregar admin.");
  }
}

async function saveMe() {
  try {
    if (!meSessionUser) {
      await loadMe();
      if (!meSessionUser) {
        toast("error", "Erro", "Não foi possível carregar seu perfil para salvar.");
        return;
      }
    }

    const oldName = (meSessionUser.name || "").trim();
    const oldEmail = (meSessionUser.email || "").trim().toLowerCase();

    const name = (meName?.value || "").trim();
    const email = (meEmail?.value || "").trim().toLowerCase();

    const p1 = (mePass1?.value || "").trim();
    const p2 = (mePass2?.value || "").trim();

    if (!name || name.length < 2) {
      return toast("error", "Atenção", "Nome precisa ter no mínimo 2 caracteres.");
    }

    if (!email) {
      return toast("error", "Atenção", "Email inválido.");
    }

    const patch = {};
    if (name !== oldName) patch.name = name;
    if (email !== oldEmail) patch.email = email;

    const passwordChanged = !!(p1 || p2);

    if (passwordChanged) {
      if (p1.length < 6) return toast("error", "Senha fraca", "Use no mínimo 6 caracteres.");
      if (p1 !== p2) return toast("error", "Senha não confere", "Digite a mesma senha nos 2 campos.");
    }

    if (Object.keys(patch).length === 0 && !passwordChanged) {
      return toast("info", "Nada mudou", "Nenhuma alteração detectada.");
    }

    let updatedUser = meSessionUser;

    if (Object.keys(patch).length > 0) {
      const resp = await apiUpdateMe(token, patch);
      updatedUser = resp?.user || updatedUser;

      if (who) who.textContent = updatedUser.email || oldEmail;
      toast("ok", "Salvo", "Perfil atualizado.");
    }

    if (passwordChanged) {
      await apiUpdateMyPassword(token, p1);
      toast("ok", "Salvo", "Senha atualizada.");

      if (mePass1) mePass1.value = "";
      if (mePass2) mePass2.value = "";
    }

    await loadMe();

    if (email !== oldEmail) {
      toast("info", "Atenção", "Email alterado. Se der problema depois, faça login novamente.");
    }
  } catch (e) {
    const status = e?.status ? ` (HTTP ${e.status})` : "";
    toast("error", "Erro ao salvar", (e?.message || "Erro desconhecido") + status);
    console.error("saveMe error:", e);
  }
}

// ===== Events =====
logoutBtn?.addEventListener("click", () => {
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

  const docs = {
    training: (training?.value || "").trim(),
    diet: (diet?.value || "").trim(),
    supp: (supp?.value || "").trim(),
    stretch: (stretch?.value || "").trim(),
  };

  try {
    await apiAdminUpdateProfile(token, em, { name: nm });
    await apiAdminSetActive(token, em, !!active?.checked);

    const saved = await apiAdminSaveDocs(token, em, docs);

    if (training) training.value = saved.training || "";
    if (diet) diet.value = saved.diet || "";
    if (supp) supp.value = saved.supp || "";
    if (stretch) stretch.value = saved.stretch || "";

    toast("ok", "Salvo", "Alterações aplicadas com sucesso.");
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

dashPdfBtn?.addEventListener("click", () => {
  const fromKey = dashFrom?.value || monthKey(new Date());
  const toKey = dashTo?.value || monthKey(new Date());

  const html = buildDashboardPrintHTML({
    periodLabel: dashPeriodLabel?.textContent || "",
    total: Number(dashTotal?.textContent || 0),
    active: Number(dashActive?.textContent || 0),
    inactive: Number(dashInactive?.textContent || 0),
    periodNew: Number(dashPeriodNew?.textContent || 0),
    users: dashboardUsers,
    monthlyRows: dashboardMonthlyRows,
    fromKey,
    toKey,
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

// ✅ Route change
window.addEventListener("routechange", async (e) => {
  const r = e?.detail?.route;

  if (r === "list") {
    try {
      await refreshList();
    } catch (err) {
      toast("error", "Erro", err?.message || "Erro ao listar.");
    }
  }

  if (r === "dash") {
    try {
      await loadDashboard();
    } catch (err) {
      toast("error", "Erro", err?.message || "Erro ao carregar dashboard.");
    }
  }

  if (r === "me") {
    try {
      await loadMe();
    } catch (err) {
      toast("error", "Erro", err?.message || "Erro ao carregar admin.");
    }
  }
});

// ===== Init =====
(async function init() {
  const session = await requireAuth("admin");
  if (!session) return;

  token = session.token;
  if (who) who.textContent = session.user.email;

  fillMonthSelects();

  await loadMe().catch(() => {});
  await refreshList().catch(() => {});
})();