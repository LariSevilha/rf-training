export function setMsg(el, text, type) {
  el.textContent = text;
  el.classList.remove("show", "error", "ok");
  el.classList.add("show");
  if (type) el.classList.add(type);
}

export function clearMsg(el) {
  el.textContent = "";
  el.classList.remove("show", "error", "ok");
}
