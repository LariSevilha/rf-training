import { requireAuth } from "./guard.js";
import { apiDocuments, apiMe } from "./api.js";
import { clearSession } from "./state.js";
import { setMsg, clearMsg } from "./ui.js";
import { driveToPreview, placeholderHtml } from "./pdf.js";

const logoutBtn = document.getElementById("logoutBtn");
const statusEl = document.getElementById("status");
const nameEl = document.getElementById("studentName");
const ok = document.getElementById("ok");
const err = document.getElementById("err");

// PDF elements
const pdfOverlay = document.getElementById("pdfOverlay");
const pdfFrame = document.getElementById("pdfFrame");
const pdfBack = document.getElementById("pdfBack");
const pdfTitle = document.getElementById("pdfTitle");
const loadingLayer = document.getElementById("loadingLayer");

// Install buttons
const installBtn = document.getElementById("installBtn");
const installHelpBtn = document.getElementById("installHelpBtn");

// links dos PDFs
const urls = { training: "", diet: "", supp: "", stretch: "" };

// Variável para guardar o evento de install prompt (Android/Chrome)
let deferredPrompt = null;

// loading helpers
let fallbackTimer = null;
function showLoading() {
  loadingLayer?.classList.add("show");
  clearTimeout(fallbackTimer);
  fallbackTimer = setTimeout(() => loadingLayer?.classList.remove("show"), 10000);
}
function hideLoading() {
  loadingLayer?.classList.remove("show");
  clearTimeout(fallbackTimer);
  fallbackTimer = null;
}

pdfFrame?.addEventListener("load", hideLoading);

// Detecta se o app já está instalado (PWA standalone)
function isInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    window.matchMedia("(display-mode: fullscreen)").matches
  );
}

// esconde botões sem link
function applyVisibility() {
  const buttons = Array.from(document.querySelectorAll(".menuBtn"));
  let available = 0;

  buttons.forEach((btn) => {
    const type = btn?.dataset?.open;
    if (!type) return;

    const hasLink = !!(urls[type] || "").trim();
    btn.style.display = hasLink ? "" : "none";
    if (hasLink) available++;
  });
}

// abrir PDF
function openPdf(type) {
  const titles = {
    training: "TREINO",
    diet: "ALIMENTAÇÃO",
    supp: "SUPLEMENTAÇÃO",
    stretch: "ALONGAMENTOS E MOBILIDADE",
  };

  if (pdfTitle) pdfTitle.textContent = titles[type] || "PDF";
  showLoading();

  const rawUrl = (urls[type] || "").trim();

  if (!rawUrl) {
    const html = placeholderHtml("PDF não configurado", "Entre em contato com o personal.");
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(html);
    setTimeout(hideLoading, 300);

    pdfOverlay?.classList.add("show");
    pdfOverlay?.setAttribute("aria-hidden", "false");
    return;
  }

  const preview = driveToPreview(rawUrl);

  if (!preview) {
    const html = placeholderHtml("Link inválido ou não suportado", "Envie o link do Drive no formato correto.");
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(html);
    setTimeout(hideLoading, 300);
  } else {
    pdfFrame.src = preview;
  }

  pdfOverlay?.classList.add("show");
  pdfOverlay?.setAttribute("aria-hidden", "false");
}

function closePdf() {
  pdfOverlay?.classList.remove("show");
  pdfOverlay?.setAttribute("aria-hidden", "true");
  hideLoading();
  setTimeout(() => {
    if (pdfFrame) pdfFrame.src = "about:blank";
  }, 220);
}

pdfBack?.addEventListener("click", closePdf);

// clique nos itens do menu
document.querySelectorAll(".menuBtn").forEach((btn) => {
  btn.addEventListener("click", () => openPdf(btn.dataset.open));
});

// logout
logoutBtn?.addEventListener("click", () => {
  clearSession();
  window.location.href = "/pages/index.html";
});

// ====================
//     INSTALAÇÃO PWA
// ====================

// Detecta iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

// Intercepta o prompt de instalação (Android/Chrome/Edge)
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault(); // impede o mini-infobar automático
  deferredPrompt = e;

  // Mostra botão de instalar se ainda não estiver instalado
  if (!isInstalled() && installBtn) {
    installBtn.style.display = "block";
  }
});

// Clique no botão "Adicionar à tela inicial" (Android)
installBtn?.addEventListener("click", async () => {
  if (!deferredPrompt) {
    setMsg(err || document.createElement("div"), "Não foi possível abrir o instalador agora. Tente pelo menu do navegador (3 pontinhos) → Adicionar à tela inicial.", "error");
    return;
  }

  deferredPrompt.prompt();

  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === "accepted") {
    setMsg(ok, "RF App adicionado à tela inicial! 🎉 Abra pelo ícone na tela inicial.", "ok");
  } else {
    setMsg(err || document.createElement("div"), "Instalação cancelada.", "error");
  }

  deferredPrompt = null;
  installBtn.style.display = "none";
});

// Evento quando o app é realmente instalado
window.addEventListener("appinstalled", () => {
  setMsg(ok, "RF App instalado com sucesso! Abra pela tela inicial.", "ok");
  if (installBtn) installBtn.style.display = "none";
  deferredPrompt = null;
});

// Botão de ajuda para iPhone
if (isIOS && !isInstalled() && installHelpBtn) {
  installHelpBtn.style.display = "block";

  installHelpBtn.addEventListener("click", () => {
    const instructions = `
Para adicionar o RF App na tela inicial do iPhone:
1. Toque no ícone de Compartilhar (quadrado com seta para cima) na parte inferior da tela
2. Role a lista e selecione "Adicionar à Tela de Início"
3. Você pode mudar o nome se quiser (ex: RF App)
4. Toque em "Adicionar" no canto superior direito

Depois disso o app abre em tela cheia, sem barra do navegador.
    `;

    // Você pode melhorar isso com um modal bonito no futuro
    alert(instructions.trim());
    // Ou usar seu sistema de mensagens (se suportar texto longo):
    // setMsg(ok, instructions.trim(), "ok");
  });
}

// Init principal
(async function init() {
  const session = await requireAuth("student");
  if (!session) return;

  // Nome do aluno
  let displayName = (session?.user?.name || "").trim();

  if (!displayName) {
    try {
      const me = await apiMe(session.token);
      displayName = (me?.user?.name || "").trim();
    } catch {}
  }

  if (!displayName) displayName = "Aluno";
  if (nameEl) nameEl.textContent = displayName;

  // Carrega documentos
  try {
    const docs = await apiDocuments(session.token);

    urls.training = (docs.training || "").trim();
    urls.diet = (docs.diet || "").trim();
    urls.supp = (docs.supp || "").trim();
    urls.stretch = (docs.stretch || "").trim();

    applyVisibility();

    if (ok) {
      setMsg(ok, "Toque em um item disponível para abrir.", "ok");
      setTimeout(() => clearMsg(ok), 1800);
    }
  } catch (e) {
    if (statusEl) statusEl.textContent = "Erro ao carregar documentos ❌";
    if (err) setMsg(err, e.message || "Erro ao carregar.", "error");
  }

  // Verifica se já está instalado → esconde botões desnecessários
  if (isInstalled()) {
    if (installBtn) installBtn.style.display = "none";
    if (installHelpBtn) installHelpBtn.style.display = "none";
  }
})();