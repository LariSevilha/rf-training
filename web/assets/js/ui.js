export function toast(type, title, msg, ms = 2600) {
  const wrap = document.getElementById("toastWrap");
  if (!wrap) return;

  const el = document.createElement("div");
  el.className = `toast ${type || ""}`.trim();
  el.innerHTML = `
    <div class="dot"></div>
    <div>
      <div class="t">${title || "Aviso"}</div>
      <div class="m">${msg || ""}</div>
    </div>
  `;

  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    setTimeout(() => el.remove(), 180);
  }, ms);
}

// Compat (se você ainda usa em algum lugar)
export function setMsg(el, text, kind) {
  if (!el) return;
  el.textContent = text || "";
  el.style.display = "block";
  el.classList.remove("error", "ok", "show");
  el.classList.add("show");
  if (kind) el.classList.add(kind);
}
export function clearMsg(el) {
  if (!el) return;
  el.textContent = "";
  el.style.display = "none";
  el.classList.remove("error", "ok", "show");
}

// Modal confirm/prompt
export function openModal({ title, text, mode="confirm", placeholder="", okText="Confirmar" }) {
  const mask = document.getElementById("modalMask");
  const t = document.getElementById("modalTitle");
  const p = document.getElementById("modalText");
  const inputWrap = document.getElementById("modalInputWrap");
  const input = document.getElementById("modalInput");
  const cancel = document.getElementById("modalCancel");
  const ok = document.getElementById("modalOk");

  if (!mask || !t || !p || !cancel || !ok) return Promise.resolve(null);

  t.textContent = title || "Confirmação";
  p.textContent = text || "—";
  ok.textContent = okText || "Confirmar";

  const isPrompt = mode === "prompt";
  if (inputWrap) inputWrap.style.display = isPrompt ? "block" : "none";
  if (isPrompt && input) {
    input.value = "";
    input.placeholder = placeholder || "";
    setTimeout(() => input.focus(), 50);
  }

  mask.classList.add("show");
  mask.setAttribute("aria-hidden", "false");

  return new Promise((resolve) => {
    function close(val) {
      mask.classList.remove("show");
      mask.setAttribute("aria-hidden", "true");
      cleanup();
      resolve(val);
    }

    function onMask(e){ if(e.target === mask) close(null); }
    function onCancel(){ close(null); }
    function onOk(){ close(isPrompt ? (input?.value || "").trim() : true); }
    function onKey(e){
      if(e.key === "Escape") close(null);
      if(e.key === "Enter") onOk();
    }

    function cleanup(){
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
