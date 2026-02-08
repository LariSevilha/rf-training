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

// ===== Elements =====
const who = document.getElementById("who");
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

// ===== DASHBOARD =====
function monthKey(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-");
  return `${m}/${y}`;
}

function pct(part, total) {
  if (!total) return "0%";
  return Math.round((part / total) * 100) + "%";
}

function pickDate(u) {
  return u.createdAt || u.created_at || u.updatedAt || u.updated_at || null;
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

function monthsBetween(fromKey, toKey) {
  const [fy, fm] = fromKey.split("-").map(Number);
  const [ty, tm] = toKey.split("-").map(Number);

  const start = new Date(fy, fm - 1, 1);
  const end = new Date(ty, tm - 1, 1);

  const a = start <= end ? start : end;
  const b = start <= end ? end : start;

  const out = [];
  const cur = new Date(a.getFullYear(), a.getMonth(), 1);
  while (cur <= b) {
    out.push(monthKey(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
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

    const periodNew = users.filter((u) => {
      const d = pickDate(u);
      if (!d) return false;
      return keys.includes(monthKey(d));
    }).length;

    if (dashPeriodNew) dashPeriodNew.textContent = String(periodNew);

    const monthly = keys.map((key) => {
      const inMonth = users.filter((u) => {
        const d = pickDate(u);
        if (!d) return false;
        return monthKey(d) === key;
      });

      const t = inMonth.length;
      const a = inMonth.filter((u) => !!u.active).length;
      return { key, total: t, active: a, inactive: t - a };
    });

    renderMonthly(monthly);
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao carregar dashboard.");
    if (dashMonthlyBody) {
      dashMonthlyBody.innerHTML = `<tr><td colspan="4" style="opacity:.7;padding:12px;">Erro ao carregar.</td></tr>`;
    }
  }
}

function buildDashboardPrintHTML() {
  const period = dashPeriodLabel?.textContent || "";
  const total = dashTotal?.textContent || "—";
  const act = dashActive?.textContent || "—";
  const inact = dashInactive?.textContent || "—";
  const newp = dashPeriodNew?.textContent || "—";
  const now = new Date().toLocaleString("pt-BR");
  const bodyRows = dashMonthlyBody?.innerHTML || "";

  return `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>RF — Relatório de Alunos</title>
  <style>
    body{ font-family: Arial; padding: 24px; color:#111; }
    h1{ margin:0 0 6px; }
    .muted{ color:#444; margin:0 0 18px; }
    .grid{ display:grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0 18px; }
    .box{ border:1px solid #ddd; border-radius:10px; padding:12px; }
    .label{ font-size:12px; color:#555; }
    .val{ font-size:22px; font-weight:800; margin-top:6px; }
    table{ width:100%; border-collapse:collapse; }
    th, td{ border:1px solid #ddd; padding:8px; text-align:left; }
    th{ background:#f6f6f6; }
  </style>
</head>
<body>
  <h1>RF FITNESS — Relatório de Alunos</h1>
  <p class="muted">${period} • Gerado em: ${now}</p>

  <div class="grid">
    <div class="box"><div class="label">Total</div><div class="val">${total}</div></div>
    <div class="box"><div class="label">Ativos</div><div class="val">${act}</div></div>
    <div class="box"><div class="label">Inativos</div><div class="val">${inact}</div></div>
    <div class="box"><div class="label">Cadastros no período</div><div class="val">${newp}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Mês</th><th>Total cadastrados</th><th>Ativos</th><th>Inativos</th>
      </tr>
    </thead>
    <tbody>
      ${bodyRows}
    </tbody>
  </table>
</body>
</html>`;
}

// ===== ME (Admin) =====
async function loadMe() {
  try {
    const data = await apiMe(token);

    // ✅ NÃO sobrescreve se veio vazio / inválido
    if (!data?.user?.email) {
      toast("error", "Erro", "API /me não retornou um usuário válido.");
      return;
    }

    meSessionUser = data.user;

    if (meName) meName.value = (data.user.name || "").trim();
    if (meEmail) meEmail.value = (data.user.email || "").trim();
    if (who) who.textContent = data.user.email;
    if (mName) mName.textContent = data.user.name;

    if (mePass1) mePass1.value = "";
    if (mePass2) mePass2.value = "";
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao carregar admin.");
  }
}


async function saveMe() {
  try {
    // garante que temos o "me" carregado
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

    // validações básicas
    if (!name || name.length < 2) {
      return toast("error", "Atenção", "Nome precisa ter no mínimo 2 caracteres.");
    }
    if (!email) {
      return toast("error", "Atenção", "Email inválido.");
    }

    // monta PATCH somente com o que mudou (✅ não exige preencher tudo)
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

    // 1) Atualiza perfil (nome/email) somente se mudou
    let updatedUser = meSessionUser;
    if (Object.keys(patch).length > 0) {
      const resp = await apiUpdateMe(token, patch); // ✅ PATCH /api/me
      updatedUser = resp?.user || updatedUser;

      // atualiza topo
      if (who) who.textContent = updatedUser.email || oldEmail;
      toast("ok", "Salvo", "Perfil atualizado.");
    }

    // 2) Atualiza senha (opcional)
    if (passwordChanged) {
      await apiUpdateMyPassword(token, p1); // ✅ PATCH /api/me/password
      toast("ok", "Salvo", "Senha atualizada.");

      if (mePass1) mePass1.value = "";
      if (mePass2) mePass2.value = "";
    }

    // 3) recarrega do servidor para confirmar e não ficar com cache
    await loadMe();

    // Se mudou email, seu token antigo pode ficar “inconsistente” (depende da sua política)
    // Aqui eu só AVISO. Se quiser deslogar automaticamente, eu adapto.
    if (email !== oldEmail) {
      toast("info", "Atenção", "Email alterado. Se der problema depois, faça login novamente.");
    }
  } catch (e) {
    // mostra status/payload se vier do readJson com debug
    const status = e?.status ? ` (HTTP ${e.status})` : "";
    const extra = e?.payload ? ` | ${JSON.stringify(e.payload)}` : "";
    toast("error", "Erro ao salvar", (e?.message || "Erro desconhecido") + status);
    console.error("saveMe error:", e, extra);
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

search?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") refreshBtn?.click();
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
  const w = window.open("", "_blank");
  if (!w) return toast("error", "Popup bloqueado", "Permita popups para gerar o PDF.");
  w.document.open();
  w.document.write(buildDashboardPrintHTML());
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

  // ✅ ESSA LINHA RESOLVE o "fica em branco ao recarregar"
  await loadMe().catch(() => {});

  await refreshList().catch(() => {});
})();

