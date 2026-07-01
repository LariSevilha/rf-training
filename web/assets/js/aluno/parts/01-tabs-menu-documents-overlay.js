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
    extraItems.length,
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
      title: "Treino",
    });
  }

  if (urls.diet) {
    cards.push({
      key: "diet",
      icon: "🍽️",
      title: "Alimentação",
    });
  }

  if (urls.supp) {
    cards.push({
      key: "supp",
      icon: "💊",
      title: "Suplementação",
    });
  }

  if (hasWrittenCardio()) {
    cards.push({
      key: "cardio",
      icon: "🏃",
      title: "Cardio",
    });
  }

  if (urls.exams) {
    cards.push({
      key: "exams",
      icon: "🧾",
      title: "Exames",
    });
  }

  if (urls.stretch) {
    cards.push({
      key: "stretch",
      icon: "🤸",
      title: "Alongamento",
    });
  }

  extraItems
    .filter(
      (item) => item && item.active !== false && String(item.url || "").trim(),
    )
    .forEach((item) => {
      const key = `extra-${item.id}`;
      extraUrls[key] = String(item.url || "").trim();

      cards.push({
        key,
        icon: "📎",
        title: item.title || "Arquivo",
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

let activeOverlayBlobUrl = "";

function setPdfFrameHtml(html) {
  if (!pdfFrame) return;

  if (activeOverlayBlobUrl) {
    try {
      URL.revokeObjectURL(activeOverlayBlobUrl);
    } catch {}
    activeOverlayBlobUrl = "";
  }

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  activeOverlayBlobUrl = URL.createObjectURL(blob);
  pdfFrame.src = activeOverlayBlobUrl;
}

function openHtmlOverlay(title, html) {
  if (pdfTitle) pdfTitle.textContent = title || "Material";
  showLoading();

  setPdfFrameHtml(html);

  setTimeout(hideLoading, 250);

  pdfOverlay?.classList.add("show");
  pdfOverlay?.setAttribute("aria-hidden", "false");
  document.body.classList.add("pdfOpen");
}

function apiBaseUrl() {
  return location.hostname === "localhost"
    ? "http://localhost:3333/api"
    : `${location.origin}/api`;
}

function getSessionToken() {
  return session?.token || localStorage.getItem("rf_token") || "";
}

function buildPdfProxyUrl(rawUrl) {
  const url = String(rawUrl || "").trim();
  if (!url) return "";
  return `${apiBaseUrl()}/pdf-proxy?url=${encodeURIComponent(url)}`;
}

function isProbablyPdfUrl(rawUrl) {
  const url = String(rawUrl || "")
    .trim()
    .toLowerCase();
  return (
    url.includes(".pdf") ||
    url.includes("drive.google.com") ||
    url.includes("application/pdf")
  );
}

function customPdfViewerHtml(title, rawUrl) {
  const pdfUrl = buildPdfProxyUrl(rawUrl);
  const token = getSessionToken();
  const safeTitle = String(title || "PDF");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    *{box-sizing:border-box}
    body{margin:0;background:#0f0f0f;color:#f5f5f5;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .bar{position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:rgba(15,15,15,.96);border-bottom:1px solid rgba(206,172,94,.28);backdrop-filter:blur(10px)}
    .title{min-width:0;font-weight:900;color:#ceac5e;text-transform:uppercase;letter-spacing:.06em;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .actions{display:flex;gap:8px;align-items:center;flex-shrink:0}
    button,a.openOriginal{border:0;border-radius:999px;background:rgba(255,255,255,.10);color:#fff;font-weight:850;padding:8px 11px;text-decoration:none;font-size:12px;cursor:pointer}
    button:active{transform:translateY(1px)}
    #status{padding:18px;text-align:center;color:rgba(255,255,255,.75);font-weight:700}
    #pages{width:min(1120px,100%);margin:0 auto;padding:12px 8px 34px}
    .page{position:relative;margin:0 auto 14px;background:#171717;border-radius:14px;overflow:hidden;box-shadow:0 12px 34px rgba(0,0,0,.38)}
    canvas{display:block;width:100%;height:auto}
    .linkLayer{position:absolute;inset:0;z-index:5}
    .pdfLink{position:absolute;display:block;border-radius:6px;background:rgba(206,172,94,.01);outline:2px solid transparent;cursor:pointer}
    .pdfLink:focus,.pdfLink:hover{outline-color:rgba(206,172,94,.55);background:rgba(206,172,94,.14)}
    .err{width:min(720px,calc(100% - 24px));margin:24px auto;background:#171717;border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:18px;line-height:1.45}
    .err b{display:block;color:#ceac5e;margin-bottom:6px}
    @media(max-width:640px){.bar{padding:8px}.title{font-size:11px}.actions{gap:6px}button,a.openOriginal{padding:8px 10px;font-size:11px}#pages{padding:8px 4px 28px}.page{border-radius:10px;margin-bottom:10px}}
  </style>
</head>
<body>
  <div class="bar">
    <div class="title" id="viewerTitle"></div>
    <div class="actions">
      <button id="zoomOut" type="button">−</button>
      <button id="zoomIn" type="button">+</button>
      <a class="openOriginal" id="openOriginal" href="#" target="_blank" rel="noopener">Abrir PDF</a>
    </div>
  </div>
  <div id="status">Carregando PDF…</div>
  <main id="pages"></main>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    const PDF_URL = ${JSON.stringify(pdfUrl)};
    const RAW_URL = ${JSON.stringify(String(rawUrl || ""))};
    const TOKEN = ${JSON.stringify(token)};
    const TITLE = ${JSON.stringify(safeTitle)};
    const statusEl = document.getElementById('status');
    const pagesEl = document.getElementById('pages');
    const original = document.getElementById('openOriginal');
    const titleEl = document.getElementById('viewerTitle');
    let pdfDoc = null;
    let zoom = 1;
    let rendering = false;
    let rerender = false;

    titleEl.textContent = TITLE || 'PDF';
    original.href = RAW_URL || PDF_URL;

    function isYoutube(url) {
      try {
        const u = new URL(String(url || '').replace(/&amp;/g, '&'));
        const h = u.hostname.toLowerCase();
        return h === 'youtu.be' || h.endsWith('youtube.com') || h.endsWith('youtube-nocookie.com') || (h.includes('google.') && u.pathname.startsWith('/url'));
      } catch { return /youtu\.?be|youtube\.com|youtube-nocookie\.com/i.test(String(url || '')); }
    }

    function openLink(url, ev) {
      if (!url) return;
      if (isYoutube(url)) {
        ev.preventDefault();
        ev.stopPropagation();
        window.parent.postMessage({ type: 'RF_OPEN_STUDENT_VIDEO', url, title: 'Vídeo do treino' }, '*');
        return;
      }
      window.open(url, '_blank', 'noopener');
    }

    function setStatus(text) {
      statusEl.textContent = text || '';
      statusEl.style.display = text ? 'block' : 'none';
    }

    async function renderPage(pageNumber) {
      const page = await pdfDoc.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const available = Math.max(320, Math.min(1080, pagesEl.clientWidth - 12));
      const scale = (available / baseViewport.width) * zoom;
      const viewport = page.getViewport({ scale });

      const pageWrap = document.createElement('section');
      pageWrap.className = 'page';
      pageWrap.style.width = viewport.width + 'px';
      pageWrap.style.height = viewport.height + 'px';

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = viewport.height + 'px';
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      pageWrap.appendChild(canvas);

      await page.render({ canvasContext: ctx, viewport }).promise;

      const linkLayer = document.createElement('div');
      linkLayer.className = 'linkLayer';
      const annotations = await page.getAnnotations({ intent: 'display' });
      annotations.forEach((ann) => {
        const url = ann.url || ann.unsafeUrl || '';
        if (!url || !ann.rect) return;
        const rect = viewport.convertToViewportRectangle(ann.rect);
        const left = Math.min(rect[0], rect[2]);
        const top = Math.min(rect[1], rect[3]);
        const width = Math.abs(rect[0] - rect[2]);
        const height = Math.abs(rect[1] - rect[3]);
        if (width < 2 || height < 2) return;

        const a = document.createElement('a');
        a.className = 'pdfLink';
        a.href = url;
        a.title = isYoutube(url) ? 'Abrir vídeo' : 'Abrir link';
        a.style.left = left + 'px';
        a.style.top = top + 'px';
        a.style.width = width + 'px';
        a.style.height = height + 'px';
        a.addEventListener('click', (ev) => openLink(url, ev));
        linkLayer.appendChild(a);
      });
      pageWrap.appendChild(linkLayer);
      pagesEl.appendChild(pageWrap);
    }

    async function renderAll() {
      if (!pdfDoc) return;
      if (rendering) { rerender = true; return; }
      rendering = true;
      rerender = false;
      pagesEl.innerHTML = '';
      setStatus('Renderizando PDF…');
      for (let i = 1; i <= pdfDoc.numPages; i += 1) {
        await renderPage(i);
      }
      setStatus('');
      rendering = false;
      if (rerender) renderAll();
    }

    async function init() {
      try {
        if (!window.pdfjsLib) throw new Error('Não foi possível carregar o leitor de PDF.');
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const res = await fetch(PDF_URL, { headers: TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {} });
        if (!res.ok) {
          let msg = 'PDF indisponível ou sem permissão.';
          try {
            const data = await res.json();
            if (data?.message) msg = data.message;
          } catch {}
          throw new Error(msg);
        }
        const bytes = await res.arrayBuffer();
        if (!bytes || bytes.byteLength < 10) throw new Error('PDF vazio ou indisponível.');
        pdfDoc = await pdfjsLib.getDocument({ data: bytes }).promise;
        await renderAll();
      } catch (err) {
        pagesEl.innerHTML = '<div class="err"><b>Não foi possível abrir este PDF dentro do app.</b><span>' + (err?.message || 'Tente abrir o PDF original.') + '</span></div>';
        setStatus('');
      }
    }

    document.getElementById('zoomIn').addEventListener('click', () => { zoom = Math.min(2.4, zoom + 0.15); renderAll(); });
    document.getElementById('zoomOut').addEventListener('click', () => { zoom = Math.max(0.65, zoom - 0.15); renderAll(); });
    window.addEventListener('resize', () => renderAll());
    init();
  </script>
</body>
</html>`;
}

function openPdfOverlay(title, rawUrl) {
  if (pdfTitle) pdfTitle.textContent = title || "PDF";
  showLoading();

  if (!rawUrl) {
    setPdfFrameHtml(
      placeholderHtml(
        "Material não configurado",
        "Entre em contato com o personal.",
      ),
    );
    setTimeout(hideLoading, 250);
  } else if (!navigator.onLine) {
    setPdfFrameHtml(
      placeholderHtml(
        "Você está offline",
        "Conecte-se para abrir este material.",
      ),
    );
    setTimeout(hideLoading, 250);
  } else {
    const preview = driveToPreview(rawUrl);
    if (!preview) {
      setPdfFrameHtml(
        placeholderHtml(
          "Link inválido",
          "Envie um link do Drive/PDF compatível.",
        ),
      );
      setTimeout(hideLoading, 250);
    } else if (isProbablyPdfUrl(rawUrl)) {
      setPdfFrameHtml(customPdfViewerHtml(title || "PDF", rawUrl));
    } else {
      pdfFrame.src = preview;
    }
  }

  pdfOverlay?.classList.add("show");
  pdfOverlay?.setAttribute("aria-hidden", "false");
  document.body.classList.add("pdfOpen");
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
    openPdfOverlay(extra?.title || "MATERIAL EXTRA", extraUrls[type] || "");
    return;
  }

  openPdfOverlay(titles[type] || "MATERIAL", urls[type] || "");
}

function closePdf() {
  pdfOverlay?.classList.remove("show");
  pdfOverlay?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("pdfOpen");
  hideLoading();

  setTimeout(() => {
    if (pdfFrame) pdfFrame.src = "about:blank";
    if (activeOverlayBlobUrl) {
      try {
        URL.revokeObjectURL(activeOverlayBlobUrl);
      } catch {}
      activeOverlayBlobUrl = "";
    }
  }, 200);
}

pdfBack?.addEventListener("click", (ev) => {
  ev.preventDefault();
  ev.stopPropagation();
  closePdf();
});

logoutBtn?.addEventListener("click", () => {
  clearSession();
  window.location.href = "/pages/index.html";
});
