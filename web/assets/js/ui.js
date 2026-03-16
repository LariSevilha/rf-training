export function toast(type = "info", title = "Aviso", msg = "", ms = 2600) {
  const wrap = document.getElementById("toastWrap");
  if (!wrap) return;

  const icons = {
    ok: "✓",
    error: "!",
    info: "i",
    warn: "•",
  };

  const el = document.createElement("div");
  el.className = `toast ${type}`.trim();

  el.innerHTML = `
    <div class="toastIcon">${icons[type] || "i"}</div>
    <div class="toastContent">
      <div class="toastTitle">${title}</div>
      <div class="toastMessage">${msg}</div>
    </div>
  `;

  wrap.appendChild(el);

  // força reflow para animação funcionar sempre
  void el.offsetWidth;
  el.classList.add("show");

  const hideTimer = setTimeout(() => {
    el.classList.remove("show");
    el.classList.add("hide");

    setTimeout(() => {
      el.remove();
    }, 220);
  }, ms);

  // opcional: clicar fecha antes
  el.addEventListener("click", () => {
    clearTimeout(hideTimer);
    el.classList.remove("show");
    el.classList.add("hide");
    setTimeout(() => el.remove(), 220);
  });
}

// Compat
export function setMsg(el, text, kind) {
  if (!el) return;
  el.textContent = text || "";
  el.style.display = text ? "block" : "none";
  el.classList.remove("error", "ok", "info", "show");
  if (kind) el.classList.add(kind);
  if (text) el.classList.add("show");
}

export function clearMsg(el) {
  if (!el) return;
  el.textContent = "";
  el.style.display = "none";
  el.classList.remove("error", "ok", "info", "show");
}

let modalBusy = false;

export function openModal({
  title,
  text,
  mode = "confirm",
  placeholder = "",
  okText = "Confirmar",
}) {
  const mask = document.getElementById("modalMask");
  const t = document.getElementById("modalTitle");
  const p = document.getElementById("modalText");
  const inputWrap = document.getElementById("modalInputWrap");
  const input = document.getElementById("modalInput");
  const cancel = document.getElementById("modalCancel");
  const ok = document.getElementById("modalOk");

  if (!mask || !t || !p || !cancel || !ok) {
    return Promise.resolve(null);
  }

  // evita abrir 2 modais ao mesmo tempo
  if (modalBusy) return Promise.resolve(null);
  modalBusy = true;

  const isPrompt = mode === "prompt";

  t.textContent = title || "Confirmação";
  p.textContent = text || "—";
  ok.textContent = okText || "Confirmar";

  if (inputWrap) inputWrap.style.display = isPrompt ? "block" : "none";

  if (input) {
    input.value = "";
    input.placeholder = isPrompt ? placeholder || "" : "";
  }

  mask.classList.add("show");
  mask.setAttribute("aria-hidden", "false");

  if (isPrompt && input) {
    setTimeout(() => input.focus(), 40);
  } else {
    setTimeout(() => ok.focus(), 40);
  }

  return new Promise((resolve) => {
    let closed = false;

    function close(value) {
      if (closed) return;
      closed = true;

      mask.classList.remove("show");
      mask.setAttribute("aria-hidden", "true");

      cleanup();
      modalBusy = false;
      resolve(value);
    }

    function onMask(e) {
      if (e.target === mask) close(null);
    }

    function onCancel() {
      close(null);
    }

    function onOk() {
      if (isPrompt) {
        close((input?.value || "").trim());
      } else {
        close(true);
      }
    }

    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close(null);
        return;
      }

      if (e.key === "Enter") {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === "textarea") return;
        e.preventDefault();
        onOk();
      }
    }

    function cleanup() {
      mask.removeEventListener("click", onMask);
      cancel.removeEventListener("click", onCancel);
      ok.removeEventListener("click", onOk);
      document.removeEventListener("keydown", onKey);
    }

    mask.addEventListener("click", onMask);
    cancel.addEventListener("click", onCancel);
    ok.addEventListener("click", onOk);
    document.addEventListener("keydown", onKey);
  });
}