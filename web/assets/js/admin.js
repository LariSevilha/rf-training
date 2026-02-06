import { requireAuth } from "./guard.js";
import {
  apiAdminListUsers,
  apiAdminCreateUser,
  apiAdminGetDocs,
  apiAdminSetActive,
  apiAdminSaveDocs,
  apiAdminResetPassword,
  apiAdminDeleteUser
} from "./api.js";
import { clearSession } from "./state.js";
import { toast, openModal } from "./ui.js";

// ===== Elements =====
const who = document.getElementById("who");
const logoutBtn = document.getElementById("logoutBtn");

const newEmail = document.getElementById("newEmail");
const newPass = document.getElementById("newPass");
const newActive = document.getElementById("newActive");
const createBtn = document.getElementById("createBtn");

const search = document.getElementById("search");
const refreshBtn = document.getElementById("refreshBtn");
const userList = document.getElementById("userList");

const studentEmail = document.getElementById("studentEmail");
const active = document.getElementById("active");
const training = document.getElementById("training");
const diet = document.getElementById("diet");
const supp = document.getElementById("supp");
const stretch = document.getElementById("stretch");

const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const deleteBtn = document.getElementById("deleteBtn");

let token = null;
let selectedRow = null;

// ===== Helpers =====
function clearEditFields() {
  if (training) training.value = "";
  if (diet) diet.value = "";
  if (supp) supp.value = "";
  if (stretch) stretch.value = "";
}

function markSelectedRow(tr){
  if (selectedRow) selectedRow.classList.remove("selected");
  selectedRow = tr;
  if (selectedRow) selectedRow.classList.add("selected");
}

async function selectUser(email, isActive) {
  if (studentEmail) studentEmail.value = email;
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
    tr.innerHTML = `<td colspan="3" style="opacity:.7;padding:12px;">Nenhum aluno encontrado.</td>`;
    userList.appendChild(tr);
    return;
  }

  users.forEach(u => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td style="width:92px;">${u.active ? "🟢" : "🔴"}</td>
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

    // clicar na linha = selecionar + carregar docs
    tr.addEventListener("click", async () => {
      markSelectedRow(tr);

      try {
        await selectUser(u.email, u.active);
        toast("ok", "Aluno selecionado", "Dados carregados.");
        if (window.__setRoute) window.__setRoute("edit");
      } catch (e) {
        toast("error", "Erro", e.message || "Erro ao carregar documentos do aluno.");
      }
    });

    // EDITAR (não propaga)
    tr.querySelector('[data-act="edit"]').addEventListener("click", (ev) => {
      ev.stopPropagation();
      tr.click();
    });

    // EXCLUIR (não propaga)
    tr.querySelector('[data-act="del"]').addEventListener("click", async (ev) => {
      ev.stopPropagation();

      const okConfirm = await openModal({
        title: "Deletar aluno",
        text: `Tem certeza que deseja deletar ${u.email}? Essa ação não pode ser desfeita.`,
        mode: "confirm",
        okText: "Deletar"
      });

      if (!okConfirm) return;

      try {
        await apiAdminDeleteUser(token, u.email);
        toast("ok", "Aluno deletado", "Conta removida com sucesso.");

        // se estava selecionado, limpa a edição
        if ((studentEmail?.value || "").trim().toLowerCase() === u.email.toLowerCase()) {
          if (studentEmail) studentEmail.value = "";
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

// ===== Events =====
logoutBtn?.addEventListener("click", () => {
  clearSession();
  window.location.href = "/pages/index.html";
});

createBtn?.addEventListener("click", async () => {
  const email = (newEmail?.value || "").trim().toLowerCase();
  const password = (newPass?.value || "").trim();

  if (!email || !password) {
    return toast("error", "Atenção", "Preencha email e senha inicial.");
  }

  try {
    await apiAdminCreateUser(token, email, password, !!newActive?.checked);
    toast("ok", "Aluno criado", "Conta criada com sucesso.");

    if (newEmail) newEmail.value = "";
    if (newPass) newPass.value = "";

    await refreshList().catch(()=>{});
  } catch (e) {
    toast("error", "Erro ao criar", e.message || "Erro ao criar.");
  }
});

refreshBtn?.addEventListener("click", async () => {
  try {
    await refreshList();
    toast("ok", "Atualizado", "Lista carregada.");
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao listar.");
  }
});

search?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") refreshBtn?.click();
});

saveBtn?.addEventListener("click", async () => {
  const em = (studentEmail?.value || "").trim().toLowerCase();
  if (!em) return toast("error", "Atenção", "Digite o email do aluno.");

  const docs = {
    training: (training?.value || "").trim(),
    diet: (diet?.value || "").trim(),
    supp: (supp?.value || "").trim(),
    stretch: (stretch?.value || "").trim()
  };

  try {
    await apiAdminSetActive(token, em, !!active?.checked);
    await apiAdminSaveDocs(token, em, docs);
    toast("ok", "Salvo", "Alterações aplicadas com sucesso.");
    await refreshList().catch(()=>{});
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
    okText: "Resetar"
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
    okText: "Deletar"
  });

  if (!okConfirm) return;

  try {
    await apiAdminDeleteUser(token, em);
    toast("ok", "Aluno deletado", "Conta removida com sucesso.");
    if (studentEmail) studentEmail.value = "";
    clearEditFields();
    await refreshList().catch(()=>{});
    if (window.__setRoute) window.__setRoute("list");
  } catch (e) {
    toast("error", "Erro", e.message || "Erro ao deletar.");
  }
});

// quando abrir "Alunos", carrega automaticamente
window.addEventListener("routechange", async (e) => {
  if (e?.detail?.route === "list") {
    try { await refreshList(); }
    catch (err) { toast("error", "Erro", err?.message || "Erro ao listar."); }
  }
});

// ===== Init =====
(async function init() {
  const session = await requireAuth("admin");
  if (!session) return;

  token = session.token;
  if (who) who.textContent = session.user.email;

  await refreshList().catch(()=>{});
})();
