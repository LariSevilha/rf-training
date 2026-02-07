function setRoute(route) {
  // salva rota (pra refreshBtn no admin.js decidir o que atualizar)
  try { sessionStorage.setItem("route", route); } catch {}

  // ativa botão do menu
  document.querySelectorAll(".navBtn[data-route]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.route === route);
  });

  // mostra view isolada
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const target = document.getElementById(`view-${route}`);
  if (target) target.classList.add("active");

  // Topbar:
  // - Search só na LIST
  // - Refresh na LIST e no DASH
  const searchWrap = document.getElementById("searchWrap");
  const refreshBtn = document.getElementById("refreshBtn");

  const isList = route === "list";
  const isDash = route === "dash";

  if (searchWrap) searchWrap.style.display = isList ? "flex" : "none";
  if (refreshBtn) refreshBtn.style.display = (isList || isDash) ? "inline-flex" : "none";

  // opcional: título
  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) {
    pageTitle.textContent =
      route === "dash" ? "Dashboard" :
      route === "list" ? "Alunos" :
      route === "edit" ? "Editar aluno" :
      route === "create" ? "Criar aluno" :
      "Admin";
  }

  // evento para o admin.js reagir (ex: carregar lista / dashboard)
  window.dispatchEvent(new CustomEvent("routechange", { detail: { route } }));
}

document.querySelectorAll(".navBtn[data-route]").forEach(btn => {
  btn.addEventListener("click", () => setRoute(btn.dataset.route));
});

// expõe pra outros scripts (admin.js manda pra EDIT ao selecionar aluno)
window.__setRoute = setRoute;

// rota inicial (pode lembrar a última)
const initial = (sessionStorage.getItem("route") || "create");
setRoute(initial);
