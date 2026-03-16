const API =
  location.hostname === "localhost"
    ? "http://localhost:3333/api"
    : "/api";

async function readJson(res) {
  let data = {};

  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const err = new Error(data?.message || `Erro HTTP ${res.status}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  return readJson(res);
}

function authHeaders(token, extra = {}) {
  return {
    ...extra,
    Authorization: `Bearer ${token}`,
  };
}

function jsonHeaders(token) {
  return authHeaders(token, {
    "Content-Type": "application/json",
  });
}

// ===== HEALTH =====
export async function apiHealth() {
  return apiFetch("/health");
}

// ===== AUTH =====
export async function apiLogin(email, password) {
  return apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function apiMe(token) {
  return apiFetch("/me", {
    headers: authHeaders(token),
  });
}

export async function apiUpdateMe(token, data) {
  return apiFetch("/me", {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function apiUpdateMyPassword(token, password) {
  return apiFetch("/me/password", {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify({ password }),
  });
}

// ===== STUDENT =====
export async function apiDocuments(token) {
  const data = await apiFetch("/documents", {
    headers: authHeaders(token),
  });

  return {
    training: (data.training || "").trim(),
    diet: (data.diet || "").trim(),
    supp: (data.supp || "").trim(),
    stretch: (data.stretch || "").trim(),
  };
}

// ===== ADMIN =====
export async function apiAdminListUsers(token, q = "") {
  const search = String(q || "").trim();
  const qs = search ? `?q=${encodeURIComponent(search)}` : "";

  return apiFetch(`/admin/users${qs}`, {
    headers: authHeaders(token),
  });
}

export async function apiAdminCreateUser(
  token,
  email,
  password,
  active = true,
  name = ""
) {
  return apiFetch("/admin/users", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ email, password, active, name }),
  });
}

export async function apiAdminUpdateProfile(token, email, data) {
  return apiFetch(`/admin/users/${encodeURIComponent(email)}/profile`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function apiAdminGetDocs(token, email) {
  return apiFetch(`/admin/users/${encodeURIComponent(email)}/documents`, {
    headers: authHeaders(token),
  });
}

export async function apiAdminSetActive(token, email, active) {
  return apiFetch(`/admin/users/${encodeURIComponent(email)}`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify({ active }),
  });
}

export async function apiAdminSaveDocs(token, email, docs) {
  return apiFetch(`/admin/users/${encodeURIComponent(email)}/documents`, {
    method: "PUT",
    headers: jsonHeaders(token),
    body: JSON.stringify(docs),
  });
}

export async function apiAdminResetPassword(token, email, password) {
  return apiFetch(`/admin/users/${encodeURIComponent(email)}/password`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify({ password }),
  });
}

export async function apiAdminDeleteUser(token, email) {
  return apiFetch(`/admin/users/${encodeURIComponent(email)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}