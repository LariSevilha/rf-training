import { apiMe } from "./api.js";
import { getToken, clearSession } from "./state.js";

function go(path) {
  if (location.pathname === path) return; // corta loop
  window.location.href = path;
}

export async function requireAuth(requiredRole) {
  const token = getToken();

  if (!token) {
    clearSession();
    go("/pages/index.html");
    return null;
  }

  try {
    const me = await apiMe(token);
    const user = me.user;

    if (!user || !user.active) {
      clearSession();
      go("/pages/index.html");
      return null;
    }

    if (requiredRole && user.role !== requiredRole) {
      go(user.role === "admin" ? "/pages/admin.html" : "/pages/aluno.html");
      return null;
    }

    return { token, user };
  } catch {
    clearSession();
    go("/pages/index.html");
    return null;
  }
}
