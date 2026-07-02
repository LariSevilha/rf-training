// Abas, menu inicial, documentos, PDF/HTML overlay e logout
// Dependências importadas pelo arquivo principal: ../aluno.js

function setTab(name) {
  const target = name === "manual" ? "manual" : "documents";

  document.body.classList.toggle("studentManualMode", target === "manual");
  document.body.classList.toggle("studentHomeMode", target !== "manual");

  document.querySelectorAll("[data-student-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.studentTab === target);
  });

  document.querySelectorAll(".alunoPanel").forEach((panel) => {
    panel.classList.remove("active");
  });

  document.getElementById(`panel-${target}`)?.classList.add("active");

  const hero = document.getElementById("alunoHero");
  if (hero) {
    hero.hidden = target === "manual";
    hero.setAttribute("aria-hidden", target === "manual" ? "true" : "false");
  }
}

document.querySelectorAll("[data-student-tab]").forEach((btn) => {
  btn.addEventListener("click", () => setTab(btn.dataset.studentTab));
});

backHomeBtn?.addEventListener("click", (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  setTab("documents");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

function lockMenu() {
  document.body.classList.remove("ready");
  menuGrid?.classList.add("menuLocked");
}

function unlockMenu() {
  document.body.classList.add("ready");
  menuGrid?.classList.remove("menuLocked");
}

function hasWrittenCardio() {
  return !!(
    String(cardioWritten.name || "").trim() ||
    String(cardioWritten.time || "").trim() ||
    String(cardioWritten.intensity || "").trim() ||
    String(cardioWritten.days || "").trim()
  );
}

function parseCardioFromDocs(docs = {}) {
  cardioWritten.name = "";
  cardioWritten.time = "";
  cardioWritten.intensity = "";
  cardioWritten.days = "";

  if (typeof docs.cardio === "string" && docs.cardio.trim()) {
    try {
      const parsed = JSON.parse(docs.cardio);
      cardioWritten.name = String(parsed.name || "").trim();
      cardioWritten.time = String(parsed.time || "").trim();
      cardioWritten.intensity = String(parsed.intensity || "").trim();
      cardioWritten.days = String(parsed.days || "").trim();
      return;
    } catch {
      // Se o campo cardio vier como link antigo, não usar como cardio escrito.
    }
  }

  cardioWritten.name = String(docs.cardioName || "").trim();
  cardioWritten.time = String(docs.cardioTime || "").trim();
  cardioWritten.intensity = String(docs.cardioIntensity || "").trim();
  cardioWritten.days = String(docs.cardioDays || "").trim();
}

function hasAnyMaterial() {
  return Boolean(
    (urls.training && !workouts.length) ||
    urls.diet ||
    urls.supp ||
    urls.exams ||
    urls.stretch ||
    hasWrittenCardio() ||
    workouts.length ||
    extraItems.length
  );
}

function createMenuButton({ key, icon, title, subtitle }) {
  const btn = document.createElement("button");
  btn.className = "studentCard";
  btn.type = "button";
  btn.dataset.open = key;

  btn.innerHTML = `
    <span class="cardIcon">${escapeHtml(icon)}</span>
    <span class="cardText">
      <b>${escapeHtml(title)}</b>
      <small>${escapeHtml(subtitle || "")}</small>
    </span>
    <span class="cardArrow">›</span>
  `;

  btn.addEventListener("click", () => openContent(key));

  return btn;
}

function renderHomeMenu() {
  if (!menuGrid) return;

  menuGrid.innerHTML = "";
  Object.keys(extraUrls).forEach((key) => delete extraUrls[key]);

  const hasManualWorkout = Array.isArray(workouts) && workouts.length > 0;

  const cards = [];

  if (hasManualWorkout || urls.training) {
    cards.push({
      key: "training",
      icon: "🏋️",
      title: "Treino"
    });
  }

  if (urls.diet) {
    cards.push({
      key: "diet",
      icon: "🍽️",
      title: "Alimentação"
    });
  }

  if (urls.supp) {
    cards.push({
      key: "supp",
      icon: "💊",
      title: "Suplementação"
    });
  }

  if (hasWrittenCardio()) {
    cards.push({
      key: "cardio",
      icon: "🏃",
      title: "Cardio"
    });
  }

  if (urls.exams) {
    cards.push({
      key: "exams",
      icon: "🧾",
      title: "Exames"
    });
  }

  if (urls.stretch) {
    cards.push({
      key: "stretch",
      icon: "🤸",
      title: "Alongamento"
    });
  }

  extraItems
    .filter((item) => item && item.active !== false && String(item.url || "").trim())
    .forEach((item) => {
      const key = `extra-${item.id}`;
      extraUrls[key] = String(item.url || "").trim();

      cards.push({
        key,
        icon: "📎",
        title: item.title || "Arquivo"
      });
    });

  cards.forEach((card) => menuGrid.appendChild(createMenuButton(card)));

  if (docsEmpty) {
    docsEmpty.style.display = cards.length ? "none" : "grid";
  }

  if (alunoTabs) {
    alunoTabs.style.display = "none";
    alunoTabs.setAttribute("hidden", "");
  }

  setTab("documents");
}

function cardioWrittenHtml() {
  const name = escapeHtml(cardioWritten.name || "Cardio");
  const time = escapeHtml(cardioWritten.time || "Não informado");
  const intensity = escapeHtml(cardioWritten.intensity || "Não informada");
  const days = escapeHtml(cardioWritten.days || "Não informado");

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body{margin:0;background:#0f0f0f;color:#f5f5f5;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;box-sizing:border-box}
          .card{width:min(620px,100%);background:#151515;border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
          .eyebrow{color:#ceac5e;text-transform:uppercase;font-size:12px;font-weight:900;letter-spacing:.12em;margin-bottom:8px}
          h1{font-size:32px;line-height:1.05;margin:0 0 18px}
          .row{border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:16px;margin-top:12px;background:rgba(255,255,255,.035)}
          .label{font-size:12px;color:rgba(255,255,255,.58);font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
          .value{font-size:20px;font-weight:850}
        </style>
      </head>
      <body>
        <main class="card">
          <div class="eyebrow ">Cardio</div>
          <h1>${name}</h1>
          <div class="row"><div class="label">Tempo</div><div class="value">${time}</div></div>
          <div class="row"><div class="label">Intensidade</div><div class="value">${intensity}</div></div>
          <div class="row cardioDaysBadge"><div class="label">frequência / dias por semana</div><div class="value">${days}</div></div>
        </main>
      </body>
    </html>
  `;
}

let pdfPageScrollY = 0;
let pdfGestureGuardsInstalled = false;

function preventPdfBrowserGesture(event) {
  if (!document.body.classList.contains("pdfOpen")) return;
  if (event.type.startsWith("gesture") || event.touches?.length > 1) {
    if (event.cancelable) event.preventDefault();
  }
}

function installPdfGestureGuards() {
  if (pdfGestureGuardsInstalled) return;
  pdfGestureGuardsInstalled = true;

  ["gesturestart", "gesturechange", "gestureend"].forEach((name) => {
    document.addEventListener(name, preventPdfBrowserGesture, { passive: false });
  });

  document.addEventListener("touchmove", preventPdfBrowserGesture, { passive: false });
}

function lockPageForPdf() {
  installPdfGestureGuards();
  pdfPageScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.style.position = "fixed";
  document.body.style.top = `-${pdfPageScrollY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockPageForPdf() {
  const top = Math.abs(parseInt(document.body.style.top || "0", 10)) || pdfPageScrollY || 0;
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  window.scrollTo(0, top);
}

function openHtmlOverlay(title, html) {
  if (pdfTitle) pdfTitle.textContent = title || "Material";
  showLoading();

  if (pdfFrame) {
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(html);
  }

  setTimeout(hideLoading, 250);

  pdfOverlay?.classList.add("show");
  pdfOverlay?.setAttribute("aria-hidden", "false");
  document.body.classList.add("pdfOpen");
  lockPageForPdf();
}

function openPdfOverlay(title, rawUrl, materialType = "") {
  if (pdfTitle) pdfTitle.textContent = title || "PDF";
  showLoading();

  const cleanRawUrl = window.cleanLinkUrl ? window.cleanLinkUrl(rawUrl || "") : String(rawUrl || "").trim();
  const shouldUseTrainingViewer =
    materialType === "training" &&
    cleanRawUrl &&
    navigator.onLine &&
    (!window.isPdfLikeUrl || window.isPdfLikeUrl(cleanRawUrl));

  if (!cleanRawUrl) {
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(
      placeholderHtml("Material não configurado", "Entre em contato com o personal.")
    );
    setTimeout(hideLoading, 250);
  } else if (!navigator.onLine) {
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(
      placeholderHtml("Você está offline", "Conecte-se para abrir este material.")
    );
    setTimeout(hideLoading, 250);
  } else if (shouldUseTrainingViewer) {
    // Treino em PDF com links de vídeo: usa viewer próprio, não o preview do Google Drive.
    // Assim conseguimos controlar zoom e abrir os links direto no YouTube, sem tela branca de google.com no iOS.
    sessionStorage.setItem("rf_pdf_src", cleanRawUrl);
    sessionStorage.setItem("rf_pdf_title", title || "TREINO");
    const viewerSrc = `/pages/pdf-viewer.html?title=${encodeURIComponent(title || "TREINO")}&src=${encodeURIComponent(cleanRawUrl)}&v=${Date.now()}`;
    pdfFrame.src = viewerSrc;
  } else {
    const preview = driveToPreview(cleanRawUrl);
    if (!preview) {
      pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(
        placeholderHtml("Link inválido", "Envie um link do Drive/PDF compatível.")
      );
      setTimeout(hideLoading, 250);
    } else {
      pdfFrame.src = preview;
    }
  }

  pdfOverlay?.classList.add("show");
  pdfOverlay?.setAttribute("aria-hidden", "false");
  document.body.classList.add("pdfOpen");
  lockPageForPdf();
}

function openContent(type) {
  if (type === "training" && workouts.length > 0) {
    activeWorkoutIndex = 0;
    setTab("manual");
    renderWorkouts();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (type === "cardio" && hasWrittenCardio()) {
    openHtmlOverlay("CARDIO", cardioWrittenHtml());
    return;
  }

  const titles = {
    training: "TREINO",
    diet: "DIETA",
    supp: "SUPLEMENTAÇÃO",
    exams: "EXAMES",
    stretch: "ALONGAMENTO",
  };

  if (type.startsWith("extra-")) {
    const extra = extraItems.find((item) => `extra-${item.id}` === type);
    openPdfOverlay(extra?.title || "MATERIAL EXTRA", extraUrls[type] || "", type);
    return;
  }

  openPdfOverlay(titles[type] || "MATERIAL", urls[type] || "", type);
}

function closePdf() {
  pdfOverlay?.classList.remove("show");
  pdfOverlay?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("pdfOpen");
  unlockPageForPdf();
  hideLoading();

  setTimeout(() => {
    if (pdfFrame) pdfFrame.src = "about:blank";
  }, 200);
}

pdfBack?.addEventListener("click", (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  closePdf();
});

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) return;
  if (event.data?.type === "RF_CLOSE_PDF_VIEWER") {
    closePdf();
  }
});

logoutBtn?.addEventListener("click", () => {
  clearSession();
  window.location.href = "/pages/index.html";
});
