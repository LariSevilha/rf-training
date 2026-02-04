import { apiMe } from "./api.js";
import { getToken, clearSession } from "./state.js";

export async function requireAuth(requiredRole) {
  const token = getToken();
  if (!token) {
    location.href = "./index.html";
    return null;
  }

  try {
    const me = await apiMe(token);
    if (!me.user || !me.user.active) {
      clearSession();
      location.href = "./index.html";
      return null;
    }

    // role mismatch -> manda pra página correta
    if (requiredRole && me.user.role !== requiredRole) {
      location.href = me.user.role === "admin" ? "./admin.html" : "./aluno.html";
      return null;
    }

    return { token, user: me.user };
  } catch {
    clearSession();
    location.href = "./index.html";
    return null;
  }
}
