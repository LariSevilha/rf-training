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

function showLoginScreen() {
  document.body.classList.remove("loginBooting");
  document.body.classList.add("loginReady");
}

function submitLogin() {
  loginBtn?.click();
}

[emailEl, passEl].forEach((el) => {
  el?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitLogin();
    }
  });
});

function goRole(role) {
  window.location.replace(role === "admin" ? "/pages/admin.html" : "/pages/aluno.html");
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

    if (rememberEl?.checked) {
      saveEmail(email);
      localStorage.setItem("rf_login", JSON.stringify({ email, password }));
    } else {
      saveEmail("");
      localStorage.removeItem("rf_login");
    }

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

  // Não bloqueia a tela de login esperando /health.
  // A checagem continua em segundo plano só para atualizar o status.
  apiHealth()
    .then(() => {
      if (status) status.textContent = "API online ✅";
    })
    .catch(() => {
      if (status) status.textContent = "API offline ❌ (confira localhost:3333)";
    });

  const token = getToken();
  if (!token) {
    showLoginScreen();
    return;
  }

  try {
    const me = await apiMe(token);
    if (me.user?.active) {
      goRole(me.user.role);
      return;
    }
    clearSession();
  } catch {
    clearSession();
  }

  showLoginScreen();
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
