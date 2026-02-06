import { apiHealth, apiLogin, apiMe } from "./api.js";
import { setToken, loadEmail, saveEmail, getToken, clearSession } from "./state.js";
import { setMsg, clearMsg } from "./ui.js";

const emailEl = document.getElementById("email");
const passEl = document.getElementById("pass");
const rememberEl = document.getElementById("remember");
const loginBtn = document.getElementById("loginBtn");

const err = document.getElementById("err");
const ok = document.getElementById("ok");
const status = document.getElementById("status");

function goRole(role) {
  window.location.href = role === "admin" ? "/pages/admin.html" : "/pages/aluno.html";
}

loginBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  clearMsg(err);
  clearMsg(ok);

  const email = (emailEl?.value || "").trim().toLowerCase();
  const password = (passEl?.value || "").trim();

  if (!email || !password) return setMsg(err, "Preencha email e senha.", "error");

  try {
    const data = await apiLogin(email, password);

    if (!data.user.active) {
      return setMsg(err, "Usuário desativado. Fale com o personal/admin.", "error");
    }

    if (rememberEl?.checked) saveEmail(email);
    else saveEmail("");

    setToken(data.token);

    setMsg(ok, "Login OK. Entrando…", "ok");
    goRole(data.user.role);
  } catch (e2) {
    setMsg(err, e2.message || "Erro no login.", "error");
  }
});

(async function init() {
  if (emailEl) emailEl.value = loadEmail();
  if (rememberEl) rememberEl.checked = !!(emailEl?.value || "");

  try {
    await apiHealth();
    if (status) status.textContent = "API online ✅";
  } catch {
    if (status) status.textContent = "API offline ❌ (confira localhost:3333)";
  }

  const token = getToken();
  if (token) {
    try {
      const me = await apiMe(token);
      if (me.user?.active) goRole(me.user.role);
      else clearSession();
    } catch {
      clearSession();
    }
  }
})();
