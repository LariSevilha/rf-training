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
      return setMsg(err, "Usuário inativo. Entre em contato com seu personal.", "error");
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

const emailInput = document.getElementById("email");
const passInput = document.getElementById("pass");
const rememberChk = document.getElementById("remember");
const togglePassBtn = document.getElementById("togglePass");

// ===== MOSTRAR / OCULTAR SENHA =====
togglePassBtn.addEventListener("click", () => {
  const isHidden = passInput.type === "password";
  passInput.type = isHidden ? "text" : "password";
  togglePassBtn.textContent = isHidden ? "🙈" : "👁";
});

// ===== CARREGAR LOGIN SALVO =====
(function loadSavedLogin(){
  const saved = JSON.parse(localStorage.getItem("rf_login") || "{}");

  if (saved.email) {
    emailInput.value = saved.email;
    rememberChk.checked = true;
  }

  if (saved.password) {
    passInput.value = saved.password;
    rememberChk.checked = true;
  }
})();

// ===== AO CLICAR EM LOGIN =====
document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passInput.value;

  if (!email || !password) {
    showError("Preencha email e senha.");
    return;
  }

  // 🔐 salvar ou limpar credenciais
  if (rememberChk.checked) {
    localStorage.setItem(
      "rf_login",
      JSON.stringify({ email, password })
    );
  } else {
    localStorage.removeItem("rf_login");
  }

  // 👉 continua teu fluxo normal de login aqui
}); 


