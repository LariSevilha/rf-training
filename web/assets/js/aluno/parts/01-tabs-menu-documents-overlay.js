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

function openHtmlOverlay(title, html) {
  if (pdfTitle) pdfTitle.textContent = title || "Material";
  showLoading();

  if (pdfFrame) {
    pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(html);
  }

  setTimeout(hideLoading, 250);

  setPdfViewportLock(true);
  pdfOverlay?.classList.add("show");
  pdfOverlay?.setAttribute("aria-hidden", "false");
  document.body.classList.add("pdfOpen");
}


let pdfJsLoaderPromise = null;
let pdfNativeDoc = null;
let pdfNativeScale = 1;
let pdfNativeRenderTicket = 0;
let pdfNativeObjectUrl = "";
let pdfNativePinch = null;

// Limites de zoom do leitor interno. No iOS/PWA, zoom muito alto pode
// fazer o WebView tentar ampliar a página inteira e recarregar o PDF.
const PDF_NATIVE_MIN_ZOOM = 0.85;
const PDF_NATIVE_MAX_ZOOM = 1.55;
const PDF_NATIVE_ZOOM_STEP = 0.15;
let previousViewportContent = null;

function clampPdfZoom(value) {
  return Math.max(PDF_NATIVE_MIN_ZOOM, Math.min(PDF_NATIVE_MAX_ZOOM, Number(value || 1)));
}

function setPdfViewportLock(enabled) {
  let viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement("meta");
    viewport.setAttribute("name", "viewport");
    document.head.appendChild(viewport);
  }

  if (enabled) {
    if (previousViewportContent === null) {
      previousViewportContent = viewport.getAttribute("content") || "width=device-width, initial-scale=1";
    }
    viewport.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover");
    return;
  }

  if (previousViewportContent !== null) {
    viewport.setAttribute("content", previousViewportContent);
    previousViewportContent = null;
  }
}

function setPdfNativeMode(enabled) {
  if (pdfFrame) {
    pdfFrame.hidden = !!enabled;
    if (enabled) pdfFrame.src = "about:blank";
  }

  if (pdfNativeViewer) {
    pdfNativeViewer.hidden = !enabled;
  }
}

function clearPdfNativeViewer() {
  pdfNativeRenderTicket++;
  pdfNativeDoc = null;
  pdfNativePinch = null;

  if (pdfNativePages) {
    pdfNativePages.innerHTML = "";
    pdfNativePages.style.transform = "";
    pdfNativePages.style.transformOrigin = "";
  }

  if (pdfNativeObjectUrl) {
    URL.revokeObjectURL(pdfNativeObjectUrl);
    pdfNativeObjectUrl = "";
  }
}

function updatePdfZoomLabel() {
  if (pdfZoomLabel) pdfZoomLabel.textContent = `${Math.round(pdfNativeScale * 100)}%`;
}

function loadPdfJs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);

  if (!pdfJsLoaderPromise) {
    pdfJsLoaderPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.async = true;
      script.onload = () => {
        if (!window.pdfjsLib) {
          reject(new Error("PDF.js não carregou."));
          return;
        }

        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(window.pdfjsLib);
      };
      script.onerror = () => reject(new Error("Falha ao carregar o leitor interno do PDF."));
      document.head.appendChild(script);
    });
  }

  return pdfJsLoaderPromise;
}

async function renderPdfNative() {
  if (!pdfNativeDoc || !pdfNativePages) return;

  const ticket = ++pdfNativeRenderTicket;
  const currentScrollTop = pdfNativeScroller?.scrollTop || 0;
  const currentHeight = Math.max(1, pdfNativeScroller?.scrollHeight || 1);
  const scrollRatio = currentScrollTop / currentHeight;

  pdfNativePages.innerHTML = "";
  pdfNativePages.style.transform = "";
  pdfNativePages.style.transformOrigin = "";
  updatePdfZoomLabel();

  const containerWidth = Math.max(320, (pdfNativeScroller?.clientWidth || window.innerWidth) - 22);

  for (let pageNumber = 1; pageNumber <= pdfNativeDoc.numPages; pageNumber += 1) {
    if (ticket !== pdfNativeRenderTicket) return;

    const page = await pdfNativeDoc.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    const fitScale = containerWidth / baseViewport.width;
    const viewport = page.getViewport({ scale: fitScale * pdfNativeScale });

    const pageWrap = document.createElement("div");
    pageWrap.className = "pdfNativePage";

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { alpha: false });
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(viewport.width * ratio);
    canvas.height = Math.floor(viewport.height * ratio);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    pageWrap.appendChild(canvas);
    pdfNativePages.appendChild(pageWrap);

    await page.render({
      canvasContext: ctx,
      viewport,
      transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null,
    }).promise;
  }

  if (pdfNativeScroller && scrollRatio > 0) {
    requestAnimationFrame(() => {
      pdfNativeScroller.scrollTop = pdfNativeScroller.scrollHeight * scrollRatio;
    });
  }
}

async function openPdfNative(title, rawUrl) {
  if (pdfTitle) pdfTitle.textContent = title || "PDF";

  clearPdfNativeViewer();
  setPdfNativeMode(true);
  pdfNativeScale = 1;
  updatePdfZoomLabel();

  setPdfViewportLock(true);
  pdfOverlay?.classList.add("show");
  pdfOverlay?.setAttribute("aria-hidden", "false");
  document.body.classList.add("pdfOpen");
  showLoading();

  if (!rawUrl) {
    if (pdfNativePages) pdfNativePages.innerHTML = placeholderHtml("Material não configurado", "Entre em contato com o personal.");
    hideLoading();
    return;
  }

  if (!navigator.onLine) {
    if (pdfNativePages) pdfNativePages.innerHTML = placeholderHtml("Você está offline", "Conecte-se para abrir este material.");
    hideLoading();
    return;
  }

  try {
    const token = session?.token || localStorage.getItem("rf_token") || "";
    const res = await fetch(`/api/pdf-proxy?url=${encodeURIComponent(rawUrl)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });

    if (!res.ok) {
      let msg = `Erro HTTP ${res.status}`;
      try {
        const data = await res.json();
        msg = data?.message || msg;
      } catch {}
      throw new Error(msg);
    }

    const blob = await res.blob();
    if (!/pdf/i.test(blob.type || "application/pdf")) {
      throw new Error("O arquivo recebido não parece ser um PDF.");
    }

    const pdfjsLib = await loadPdfJs();
    const data = await blob.arrayBuffer();
    pdfNativeDoc = await pdfjsLib.getDocument({ data }).promise;
    await renderPdfNative();
    hideLoading();
  } catch (error) {
    console.error(error);
    if (pdfNativePages) {
      pdfNativePages.innerHTML = `
        <div class="pdfNativeError">
          <h3>Não foi possível abrir o PDF dentro do app</h3>
          <p>${escapeHtml(error?.message || "Verifique o link do PDF e tente novamente.")}</p>
          <small>O link pode continuar sendo o link normal do Drive. O arquivo precisa permitir visualização por link para o app conseguir ler o PDF.</small>
        </div>
      `;
    }
    hideLoading();
  }
}

function openPdfOverlay(title, rawUrl) {
  // Modo simples e estável: mostra o PDF dentro do app usando o preview do Drive.
  // Não usa /api/pdf-proxy e não tenta baixar o PDF. Assim o PDF aparece do mesmo jeito
  // que aparecia antes, desde que o link abra normalmente no Drive.
  clearPdfNativeViewer();
  setPdfNativeMode(false);

  if (pdfTitle) pdfTitle.textContent = title || "PDF";
  showLoading();

  if (pdfFrame) {
    pdfFrame.hidden = false;
    pdfFrame.src = "about:blank";
  }

  if (!rawUrl) {
    if (pdfFrame) {
      pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(
        placeholderHtml("Material não configurado", "Entre em contato com o personal.")
      );
    }
    setTimeout(hideLoading, 250);
  } else if (!navigator.onLine) {
    if (pdfFrame) {
      pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(
        placeholderHtml("Você está offline", "Conecte-se para abrir este material.")
      );
    }
    setTimeout(hideLoading, 250);
  } else {
    const preview = driveToPreview(rawUrl);
    if (!preview) {
      if (pdfFrame) {
        pdfFrame.src = "data:text/html;charset=utf-8," + encodeURIComponent(
          placeholderHtml("Link inválido", "Envie um link do Drive/PDF compatível.")
        );
      }
      setTimeout(hideLoading, 250);
    } else {
      requestAnimationFrame(() => {
        if (pdfFrame) pdfFrame.src = preview;
      });
    }
  }

  // Evita que o iOS amplie/recarregue a página principal enquanto o PDF está aberto.
  // O PDF continua dentro do app, no iframe de preview.
  setPdfViewportLock(true);
  pdfOverlay?.classList.add("show");
  pdfOverlay?.setAttribute("aria-hidden", "false");
  document.body.classList.add("pdfOpen");
}

function changePdfNativeZoom(delta) {
  if (!pdfNativeDoc) return;
  const next = clampPdfZoom(Number((pdfNativeScale + delta).toFixed(2)));
  if (next === pdfNativeScale) return;
  pdfNativeScale = next;
  showLoading();
  renderPdfNative().finally(() => hideLoading());
}

pdfZoomIn?.addEventListener("click", (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  changePdfNativeZoom(PDF_NATIVE_ZOOM_STEP);
});

pdfZoomOut?.addEventListener("click", (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  changePdfNativeZoom(-PDF_NATIVE_ZOOM_STEP);
});

function pdfTouchDistance(touches) {
  const a = touches[0];
  const b = touches[1];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

pdfNativeScroller?.addEventListener("touchstart", (ev) => {
  if (ev.touches.length !== 2 || !pdfNativeDoc) return;
  pdfNativePinch = {
    distance: pdfTouchDistance(ev.touches),
    scale: pdfNativeScale,
  };
  if (pdfNativePages) {
    pdfNativePages.style.transformOrigin = "50% 0";
  }
}, { passive: false });

pdfNativeScroller?.addEventListener("touchmove", (ev) => {
  if (!pdfNativePinch || ev.touches.length !== 2 || !pdfNativeDoc) return;
  ev.preventDefault();

  const ratio = pdfTouchDistance(ev.touches) / Math.max(1, pdfNativePinch.distance);
  const visualScale = clampPdfZoom(pdfNativePinch.scale * ratio);

  if (pdfNativePages) {
    pdfNativePages.style.transform = `scale(${visualScale / pdfNativePinch.scale})`;
  }
}, { passive: false });

pdfNativeScroller?.addEventListener("touchend", (ev) => {
  if (!pdfNativePinch || !pdfNativeDoc) return;

  const lastScale = pdfNativePages?.style.transform?.match(/scale\(([^)]+)\)/)?.[1];
  const multiplier = Number(lastScale || 1);
  pdfNativeScale = clampPdfZoom(Number((pdfNativePinch.scale * multiplier).toFixed(2)));
  pdfNativePinch = null;

  if (pdfNativePages) {
    pdfNativePages.style.transform = "";
    pdfNativePages.style.transformOrigin = "";
  }

  showLoading();
  renderPdfNative().finally(() => hideLoading());
}, { passive: false });

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
    openPdfOverlay(extra?.title || "MATERIAL EXTRA", extraUrls[type] || "");
    return;
  }

  openPdfOverlay(titles[type] || "MATERIAL", urls[type] || "");
}

function closePdf() {
  clearPdfNativeViewer();
  setPdfNativeMode(false);
  pdfOverlay?.classList.remove("show");
  pdfOverlay?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("pdfOpen");
  setPdfViewportLock(false);
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

// Evita que uma pinça fora da área renderizada do PDF vire zoom da página
// inteira no iOS, o que era o gatilho do recarregamento.
pdfOverlay?.addEventListener("touchmove", (ev) => {
  if (!document.body.classList.contains("pdfOpen")) return;
  if (ev.touches && ev.touches.length > 1) {
    ev.preventDefault();
  }
}, { passive: false });

logoutBtn?.addEventListener("click", () => {
  clearSession();
  window.location.href = "/pages/index.html";
});
