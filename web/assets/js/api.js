const API = location.hostname === "localhost"
  ? "http://localhost:3333"
  : "/api";


async function readJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Erro HTTP ${res.status}`);
  return data;
}

export async function apiHealth() {
  return readJson(await fetch(`${API}/health`));
}

export async function apiLogin(email, password) {
  return readJson(
    await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
  );
}

export async function apiMe(token) {
  return readJson(
    await fetch(`${API}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  );
}

export async function apiDocuments(token) {
  return readJson(
    await fetch(`${API}/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  );
}

// ===== Admin =====
export async function apiAdminListUsers(token, q = "") {
  const url = `${API}/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`;

  return readJson(
    await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  );
}


export async function apiAdminCreateUser(token, email, password, active = true) {
  return readJson(
    await fetch(`${API}/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, password, active }),
    })
  );
}

export async function apiAdminGetUser(token, email) {
  return readJson(
    await fetch(`${API}/admin/users/${encodeURIComponent(email)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  );
}

export async function apiAdminGetDocs(token, email) {
  return readJson(
    await fetch(`${API}/admin/users/${encodeURIComponent(email)}/documents`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  );
}

export async function apiAdminSetActive(token, email, active) {
  return readJson(
    await fetch(`${API}/admin/users/${encodeURIComponent(email)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ active }),
    })
  );
}

export async function apiAdminSaveDocs(token, email, docs) {
  return readJson(
    await fetch(`${API}/admin/users/${encodeURIComponent(email)}/documents`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(docs),
    })
  );
}

export async function apiAdminResetPassword(token, email, password) {
  return readJson(
    await fetch(`${API}/admin/users/${encodeURIComponent(email)}/password`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password }),
    })
  );
}

export async function apiAdminDeleteUser(token, email) {
  return readJson(
    await fetch(`${API}/admin/users/${encodeURIComponent(email)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
  );
}
