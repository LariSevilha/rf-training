function setRoute(route) {
  // ativa botão do menu
  document.querySelectorAll(".navBtn[data-route]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.route === route);
  });

  // mostra view isolada
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const target = document.getElementById(`view-${route}`);
  if (target) target.classList.add("active");

  // Top search só na LIST
  const searchWrap = document.getElementById("searchWrap");
  const refreshBtn = document.getElementById("refreshBtn");
  const isList = route === "list";
  if (searchWrap) searchWrap.style.display = isList ? "flex" : "none";
  if (refreshBtn) refreshBtn.style.display = isList ? "inline-flex" : "none";

  // evento para o admin.js reagir (ex: carregar lista ao abrir "Alunos")
  window.dispatchEvent(new CustomEvent("routechange", { detail: { route } }));
}

document.querySelectorAll(".navBtn[data-route]").forEach(btn => {
  btn.addEventListener("click", () => setRoute(btn.dataset.route));
});

// expõe pra outros scripts (admin.js manda pra EDIT ao selecionar aluno)
window.__setRoute = setRoute;

// rota inicial
setRoute("create");
