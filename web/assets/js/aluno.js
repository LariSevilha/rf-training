import { requireAuth } from "./guard.js";
import { apiDocuments } from "./api.js";
import { clearSession } from "./state.js";
import { setMsg, clearMsg } from "./ui.js";
import { driveToPreview, placeholderHtml } from "./pdf.js";

const who = document.getElementById("who");
const logoutBtn = document.getElementById("logoutBtn");
const statusEl = document.getElementById("status");
const ok = document.getElementById("ok");
const err = document.getElementById("err");

// PDF elements
const topbar = document.getElementById("topbar");
const pdfOverlay = document.getElementById("pdfOverlay");
const pdfFrame = document.getElementById("pdfFrame");
const pdfBack = document.getElementById("pdfBack");
const pdfTitle = document.getElementById("pdfTitle");
const loadingLayer = document.getElementById("loadingLayer");

const urls = { training: "", diet: "", supp: "" };

// loading helpers
let fallbackTimer = null;
function showLoading() {
  loadingLayer.classList.add("show");
  clearTimeout(fallbackTimer);
  fallbackTimer = setTimeout(() => loadingLayer.classList.remove("show"), 10000);
}
function hideLoading() {
  loadingLayer.classList.remove("show");
  clearTimeout(fallbackTimer);
  fallbackTimer = null;
}

pdfFrame.addEventListener("load", hideLoading);

// abrir PDF
function openPdf(type) {
  const titles = {
    training: "TREINO",
    diet: "ALIMENTAÇÃO",
    supp: "SUPLEMENTAÇÃO"
  };

  pdfTitle.textContent = titles[type] || "PDF";
  showLoading();

  const preview = driveToPreview(urls[type]);

  if (!preview) {
    const html = placeholderHtml(
      "PDF não configurado",
      "Entre em contato com o personal."
    );
    pdfFrame.src =
      "data:text/html;charset=utf-8," + encodeURIComponent(html);
    setTimeout(hideLoading, 300);
  } else {
    pdfFrame.src = preview;
  }

  topbar.style.display = "none";
  pdfOverlay.classList.add("show");
  pdfOverlay.setAttribute("aria-hidden", "false");
}

function closePdf() {
  pdfOverlay.classList.remove("show");
  pdfOverlay.setAttribute("aria-hidden", "true");
  hideLoading();
  setTimeout(() => {
    topbar.style.display = "flex";
    pdfFrame.src = "about:blank";
  }, 220);
}

pdfBack.addEventListener("click", closePdf);

// clique nos ícones
document.querySelectorAll(".menuBtn").forEach((btn) => {
  btn.addEventListener("click", () => openPdf(btn.dataset.open));
});

// logout
logoutBtn.addEventListener("click", () => {
  clearSession();
  window.location.href = "/pages/index.html";
});

// init
(async function init() {
  const session = await requireAuth("student");
  if (!session) return;

  who.textContent = session.user.email;

  try {
    const docs = await apiDocuments(session.token);
    urls.training = docs.training || "";
    urls.diet = docs.diet || "";
    urls.supp = docs.supp || "";

    statusEl.textContent = "Documentos carregados ✅";
    setMsg(ok, "Toque em um item para abrir.", "ok");
    setTimeout(() => clearMsg(ok), 1200);
  } catch (e) {
    statusEl.textContent = "Erro ao carregar documentos ❌";
    setMsg(err, e.message || "Erro ao carregar.", "error");
  }
})();
