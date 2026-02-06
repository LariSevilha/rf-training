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

// ✅ inclui stretch
const urls = { training: "", diet: "", supp: "", stretch: "" };

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

// ✅ esconde botões que não têm link
function applyVisibility() {
  const buttons = Array.from(document.querySelectorAll(".menuBtn"));
  let available = 0;

  buttons.forEach((btn) => {
    const type = btn?.dataset?.open;
    if (!type) return;

    const hasLink = !!(urls[type] || "").trim();

    // some se não tem link
    btn.style.display = hasLink ? "" : "none";
    if (hasLink) available++;
  });

  statusEl.textContent =
    available === 0
      ? "Nenhum documento liberado para sua conta ainda."
      : `${available} item(ns) disponível(is) ✅`;
}

// abrir PDF
function openPdf(type) {
  const titles = {
    training: "TREINO",
    diet: "ALIMENTAÇÃO",
    supp: "SUPLEMENTAÇÃO",
    stretch: "ALONGAMENTOS E MOBILIDADE"
  };

  pdfTitle.textContent = titles[type] || "PDF";
  showLoading();

  const rawUrl = (urls[type] || "").trim();

  // ✅ se não existe link, mostra placeholder (segurança)
  if (!rawUrl) {
    const html = placeholderHtml(
      "PDF não configurado",
      "Entre em contato com o personal."
    );
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(html);
    setTimeout(hideLoading, 300);

    topbar.style.display = "none";
    pdfOverlay.classList.add("show");
    pdfOverlay.setAttribute("aria-hidden", "false");
    return;
  }

  const preview = driveToPreview(rawUrl);

  if (!preview) {
    const html = placeholderHtml(
      "Link inválido ou não suportado",
      "Envie o link do Drive no formato correto."
    );
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(html);
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

    // ✅ trim pra evitar " " e garantir condição
    urls.training = (docs.training || "").trim();
    urls.diet = (docs.diet || "").trim();
    urls.supp = (docs.supp || "").trim();
    urls.stretch = (docs.stretch || "").trim();

    // ✅ agora só aparecem os botões com link
    applyVisibility();

    setMsg(ok, "Toque em um item disponível para abrir.", "ok");
    setTimeout(() => clearMsg(ok), 1200);
  } catch (e) {
    statusEl.textContent = "Erro ao carregar documentos ❌";
    setMsg(err, e.message || "Erro ao carregar.", "error");
  }
})();
