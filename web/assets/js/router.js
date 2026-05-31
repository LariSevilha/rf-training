const DEFAULT_ROUTE = "create";
const STORAGE_KEY = "rf_admin_last_route";

const LIBRARY_ROUTES = [
  "muscles",
  "videos",
  "exercises",
  "techniques",
  "extra-items",
  "records",
  "records-detail",
];

const VALID_ROUTES = [
  "me",
  "dash",
  "create",
  "list",
  "edit",
  "library",
  ...LIBRARY_ROUTES,
];

function isValidRoute(route) {
  return VALID_ROUTES.includes(route);
}

function getInitialRoute() {
  const savedRoute = sessionStorage.getItem(STORAGE_KEY);

  if (savedRoute && isValidRoute(savedRoute)) {
    return savedRoute;
  }

  return DEFAULT_ROUTE;
}

function saveRoute(route) {
  if (!isValidRoute(route)) return;
  sessionStorage.setItem(STORAGE_KEY, route);
}

function setActiveMenu(route) {
  document.querySelectorAll(".navBtn[data-route]").forEach((btn) => {
    const isLibraryRoute = LIBRARY_ROUTES.includes(route);

    const isActive =
      btn.dataset.route === route ||
      (btn.dataset.route === "library" && isLibraryRoute);

    btn.classList.toggle("active", isActive);
  });
}

function setActiveView(route) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.remove("active");
  });

  const target = document.getElementById(`view-${route}`);

  if (target) {
    target.classList.add("active");
    return;
  }

  const fallback = document.getElementById(`view-${DEFAULT_ROUTE}`);
  fallback?.classList.add("active");
}

function updateListTools(route) {
  const searchWrap = document.getElementById("searchWrap");
  const refreshBtn = document.getElementById("refreshBtn");

  const isList = route === "list";

  if (searchWrap) {
    searchWrap.style.display = isList ? "flex" : "none";
  }

  if (refreshBtn) {
    refreshBtn.style.display = isList ? "inline-flex" : "none";
  }
}

function setRoute(route, options = {}) {
  const nextRoute = isValidRoute(route) ? route : DEFAULT_ROUTE;

  setActiveMenu(nextRoute);
  setActiveView(nextRoute);
  updateListTools(nextRoute);

  if (!options.skipSave) {
    saveRoute(nextRoute);
  }

  window.dispatchEvent(
    new CustomEvent("routechange", {
      detail: { route: nextRoute },
    })
  );
}

document.querySelectorAll(".navBtn[data-route]").forEach((btn) => {
  btn.addEventListener("click", () => {
    setRoute(btn.dataset.route);
  });
});

document.querySelectorAll("[data-route-go]").forEach((btn) => {
  btn.addEventListener("click", () => {
    setRoute(btn.dataset.routeGo);
  });
});

window.__setRoute = setRoute;

setRoute(getInitialRoute(), { skipSave: true });