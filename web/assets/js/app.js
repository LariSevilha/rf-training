import { apiHealth, apiLogin, apiMe, apiDocuments, apiAdminSaveDocs, apiAdminSetActive } from "./api.js";
import { state, loadRememberedEmail, saveRememberedEmail, setToken, getToken, clearSession } from "./state.js";
import { showScreen, setMsg, clearMsg, showMask } from "./ui.js";
import { driveToPreview, makePlaceholderHtml } from "./pdf.js";

// Elements
const emailEl = document.getElementById("email");
const passEl = document.getElementById("pass");
const rememberEl = document.getElementById("remember");
const loginBtn = document.getElementById("loginBtn");
const loginErr = document.getElementById("loginErr");
const loginOk = document.getElementById("loginOk");
const who = document.getElementById("who");
const logoutBtn = document.getElementById("logoutBtn");
const statusText = document.getElementById("statusText");

// PDF overlay
const topbar = document.getElementById("topbar");
const pdfOverlay = document.getElementById("pdfOverlay");
const pdfFrame = document.getElementById("pdfFrame");
const pdfBack = document.getElementById("pdfBack");
const pdfTitle = document.getElementById("pdfTitle");
const loadingLayer = document.getElementById("loadingLayer");

// Forgot modal
const forgotLink = document.getElementById("forgotLink");
const modalMask = document.getElementById("modalMask");
const closeModal = document.getElementById("closeModal");
const sendReset = document.getElementById("sendReset");
const forgotEmail = document.getElementById("forgotEmail");
const resetOk = document.getElementById("resetOk");

// Right panel quick
const fillStudent = document.getElementById("fillStudent");
const fillAdmin = document.getElementById("fillAdmin");
const quickLink = document.getElementById("quickLink");
const useQuickLink = document.getElementById("useQuickLink");
const clearLink = document.getElementById("clearLink");

// Admin modal
const btnAdmin = document.getElementById("btnAdmin");
const adminMask = document.getElementById("adminMask");
const adminClose = document.getElementById("adminClose");
const adminSave = document.getElementById("adminSave");
const adminStudentEmail = document.getElementById("adminStudentEmail");
const adminTraining = document.getElementById("adminTraining");
const adminDiet = document.getElementById("adminDiet");
const adminSupp = document.getElementById("adminSupp");
const adminActive = document.getElementById("adminActive");
const adminOk = document.getElementById("adminOk");
const adminErr = document.getElementById("adminErr");

// Loading helpers
let loadingFallbackTimer = null;
function showLoading() {
  loadingLayer.classList.add("show");
  clearTimeout(loadingFallbackTimer);
  loadingFallbackTimer = setTimeout(() => loadingLayer.classList.remove("show"), 10000);
}
function hideLoading() {
  loadingLayer.classList.remove("show");
  clearTimeout(loadingFallbackTimer);
  loadingFallbackTimer = null;
}

pdfFrame.addEventListener("load", () => hideLoading());

// Open PDF
function openPdfFullscreen(type) {
  const titles = { training: "TREINO", diet: "ALIMENTAÇÃO", supp: "SUPLEMENTAÇÃO" };
  pdfTitle.textContent = titles[type] || "PDF";

  const raw = state.urls[type] || "";
  const preview = driveToPreview(raw);

  showLoading();

  if (!preview) {
    const placeholder = makePlaceholderHtml(titles[type], "Configure o PDF com o admin ou use o painel lateral.");
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(placeholder);
    setTimeout(hideLoading, 350);
  } else {
    pdfFrame.src = preview;
  }

  topbar.style.display = "none";
  pdfOverlay.classList.add("show");
  pdfOverlay.setAttribute("aria-hidden", "false");
}

function closePdfFullscreen() {
  pdfOverlay.classList.remove("show");
  pdfOverlay.setAttribute("aria-hidden", "true");
  hideLoading();
  setTimeout(() => {
    topbar.style.display = "flex";
    pdfFrame.src = "about:blank";
  }, 220);
}

pdfBack.addEventListener("click", closePdfFullscreen);

// Menu
document.querySelectorAll(".menuBtn").forEach((btn) => {
  btn.addEventListener("click", () => openPdfFullscreen(btn.dataset.open));
});

// Forgot modal
forgotLink.addEventListener("click", () => {
  resetOk.classList.remove("show", "ok");
  resetOk.textContent = "";
  forgotEmail.value = emailEl.value.trim();
  showMask(modalMask, true);
});
closeModal.addEventListener("click", () => showMask(modalMask, false));
modalMask.addEventListener("click", (e) => {
  if (e.target === modalMask) showMask(modalMask, false);
});
sendReset.addEventListener("click", () => {
  const em = forgotEmail.value.trim();
  if (!em) return setMsg(resetOk, "Digite um email para simular o envio.", "ok");
  setMsg(resetOk, "Email de redefinição enviado (simulação).", "ok");
});

// Quick buttons
fillStudent.addEventListener("click", () => {
  emailEl.value = "maria@exemplo.com";
  passEl.value = "123456";
  setMsg(loginOk, "Aluno preenchido.", "ok");
  setTimeout(() => clearMsg(loginOk), 800);
});
fillAdmin.addEventListener("click", () => {
  emailEl.value = "admin@rf.com";
  passEl.value = "admin123";
  setMsg(loginOk, "Admin preenchido.", "ok");
  setTimeout(() => clearMsg(loginOk), 800);
});

useQuickLink.addEventListener("click", () => {
  state.urls.training = quickLink.value.trim();
  setMsg(loginOk, "Link aplicado ao TREINO (somente local).", "ok");
  setTimeout(() => clearMsg(loginOk), 900);
});
clearLink.addEventListener("click", () => {
  quickLink.value = "";
  state.urls.training = "";
  setMsg(loginOk, "Link local removido.", "ok");
  setTimeout(() => clearMsg(loginOk), 900);
});

// Logout
logoutBtn.addEventListener("click", () => {
  passEl.value = "";
  btnAdmin.style.display = "none";
  clearSession();
  showScreen("login");
});

// Login
loginBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  clearMsg(loginErr);
  clearMsg(loginOk);

  const email = emailEl.value.trim().toLowerCase();
  const pass = passEl.value.trim();
  if (!email || !pass) return setMsg(loginErr, "Preencha email e senha.", "error");

  try {
    const data = await apiLogin(email, pass);

    if (!data.user.active) {
      return setMsg(loginErr, "Usuário desativado. Entre em contato com o personal.", "error");
    }

    saveRememberedEmail(email, rememberEl.checked);
    setToken(data.token);
    state.user = data.user;

    who.textContent = data.user.email;

    const docs = await apiDocuments(data.token);
    state.urls = { training: docs.training || "", diet: docs.diet || "", supp: docs.supp || "" };

    btnAdmin.style.display = data.user.role === "admin" ? "inline-flex" : "none";

    setMsg(loginOk, "Login realizado.", "ok");
    setTimeout(() => {
      clearMsg(loginOk);
      showScreen("menu");
    }, 150);
  } catch (err) {
    setMsg(loginErr, err.message || "Erro no login.", "error");
  }
});

// Admin modal open/close
btnAdmin.addEventListener("click", () => {
  clearMsg(adminOk);
  clearMsg(adminErr);
  showMask(adminMask, true);
});
adminClose.addEventListener("click", () => showMask(adminMask, false));
adminMask.addEventListener("click", (e) => {
  if (e.target === adminMask) showMask(adminMask, false);
});

// Admin save
adminSave.addEventListener("click", async () => {
  clearMsg(adminOk);
  clearMsg(adminErr);

  const token = getToken();
  if (!token) return setMsg(adminErr, "Sessão expirada. Faça login novamente.", "error");

  const studentEmail = adminStudentEmail.value.trim().toLowerCase();
  if (!studentEmail) return setMsg(adminErr, "Digite o email do aluno.", "error");

  const docs = {
    training: adminTraining.value.trim() || undefined,
    diet: adminDiet.value.trim() || undefined,
    supp: adminSupp.value.trim() || undefined,
  };

  try {
    await apiAdminSetActive(token, studentEmail, !!adminActive.checked);
    await apiAdminSaveDocs(token, studentEmail, docs);
    setMsg(adminOk, "Salvo com sucesso.", "ok");
  } catch (e) {
    setMsg(adminErr, e.message || "Erro ao salvar.", "error");
  }
});

// Init
(async function init() {
  emailEl.value = loadRememberedEmail();
  rememberEl.checked = !!emailEl.value;

  try {
    await apiHealth();
    statusText.textContent = "API online ✅";
  } catch {
    statusText.textContent = "API offline ❌ (confira localhost:3333)";
  }

  // Se já tiver token salvo, tenta restaurar sessão
  const token = getToken();
  if (token) {
    try {
      const me = await apiMe(token);
      if (me.user?.active) {
        state.user = me.user;
        who.textContent = me.user.email;

        const docs = await apiDocuments(token);
        state.urls = { training: docs.training || "", diet: docs.diet || "", supp: docs.supp || "" };

        btnAdmin.style.display = me.user.role === "admin" ? "inline-flex" : "none";
        showScreen("menu");
      } else {
        clearSession();
      }
    } catch {
      clearSession();
    }
  }
})();
