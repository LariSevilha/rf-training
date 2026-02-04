import { requireAuth } from "./guard.js";
import {
  apiAdminListUsers,
  apiAdminCreateUser,
  apiAdminGetUser,
  apiAdminGetDocs,
  apiAdminSetActive,
  apiAdminSaveDocs,
  apiAdminResetPassword,
  apiAdminDeleteUser
} from "./api.js";
import { clearSession } from "./state.js";
import { setMsg, clearMsg } from "./ui.js";

const who = document.getElementById("who");
const logoutBtn = document.getElementById("logoutBtn");

const ok = document.getElementById("ok");
const err = document.getElementById("err");

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

const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const deleteBtn = document.getElementById("deleteBtn");

const totalUsers = document.getElementById("totalUsers");
const activeUsers = document.getElementById("activeUsers");
const inactiveUsers = document.getElementById("inactiveUsers");

let token = null;

logoutBtn.onclick = () => {
  clearSession();
  window.location.href = "/pages/index.html";
};

function renderUsers(users) {
  userList.innerHTML = "";

  let activeCount = 0;

  if (!users.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="2" style="opacity:.7;padding:12px;">Nenhum aluno encontrado.</td>`;
    userList.appendChild(tr);

    totalUsers.textContent = 0;
    activeUsers.textContent = 0;
    inactiveUsers.textContent = 0;
    return;
  }

  users.forEach(u => {
    if (u.active) activeCount++;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.active ? "🟢" : "🔴"}</td>
      <td>${u.email}</td>
    `;
    tr.onclick = () => {
      studentEmail.value = u.email;
      active.checked = !!u.active;
      setMsg(ok, "Aluno selecionado ✅", "ok");
      setTimeout(() => clearMsg(ok), 800);
    };
    userList.appendChild(tr);
  });

  totalUsers.textContent = users.length;
  activeUsers.textContent = activeCount;
  inactiveUsers.textContent = users.length - activeCount;
}

async function refreshList() {
  clearMsg(ok);
  clearMsg(err);

  const q = (search.value || "").trim();
  const data = await apiAdminListUsers(token, q);
  renderUsers(data.users || []);
}

createBtn.onclick = async () => {
  clearMsg(ok);
  clearMsg(err);

  const email = newEmail.value.trim().toLowerCase();
  const password = newPass.value.trim();

  if (!email || !password)
    return setMsg(err, "Preencha email e senha inicial.", "error");

  try {
    await apiAdminCreateUser(token, email, password, !!newActive.checked);
    setMsg(ok, "Aluno criado ✅", "ok");
    newEmail.value = "";
    newPass.value = "";
    await refreshList();
  } catch (e) {
    setMsg(err, e.message || "Erro ao criar.", "error");
  }
};

refreshBtn.onclick = async () => {
  try { await refreshList(); }
  catch (e) { setMsg(err, e.message || "Erro ao listar.", "error"); }
};

saveBtn.onclick = async () => {
  clearMsg(ok);
  clearMsg(err);

  const em = studentEmail.value.trim().toLowerCase();
  if (!em) return setMsg(err, "Digite o email do aluno.", "error");

  const docs = {
    training: training.value.trim() || undefined,
    diet: diet.value.trim() || undefined,
    supp: supp.value.trim() || undefined
  };

  try {
    await apiAdminSetActive(token, em, !!active.checked);
    await apiAdminSaveDocs(token, em, docs);
    setMsg(ok, "Salvo com sucesso ✅", "ok");
    await refreshList();
  } catch (e) {
    setMsg(err, e.message || "Erro ao salvar.", "error");
  }
};

resetBtn.onclick = async () => {
  clearMsg(ok);
  clearMsg(err);

  const em = studentEmail.value.trim().toLowerCase();
  if (!em) return setMsg(err, "Digite o email do aluno.", "error");

  const newPassword = prompt("Nova senha do aluno (mín. 6 caracteres):");
  if (!newPassword) return;

  try {
    await apiAdminResetPassword(token, em, newPassword);
    setMsg(ok, "Senha resetada ✅", "ok");
  } catch (e) {
    setMsg(err, e.message || "Erro ao resetar senha.", "error");
  }
};

deleteBtn.onclick = async () => {
  clearMsg(ok);
  clearMsg(err);

  const em = studentEmail.value.trim().toLowerCase();
  if (!em) return setMsg(err, "Digite o email do aluno.", "error");

  if (!confirm(`Deletar o aluno ${em}?`)) return;

  try {
    await apiAdminDeleteUser(token, em);
    setMsg(ok, "Aluno deletado ✅", "ok");

    studentEmail.value = "";
    training.value = "";
    diet.value = "";
    supp.value = "";

    await refreshList();
  } catch (e) {
    setMsg(err, e.message || "Erro ao deletar.", "error");
  }
};

(async function init() {
  const session = await requireAuth("admin");
  if (!session) return;

  token = session.token;
  who.textContent = session.user.email;

  try {
    await refreshList();
  } catch (e) {
    setMsg(err, e.message || "Erro ao listar.", "error");
  }
})();
