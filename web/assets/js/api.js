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
    cardio: (data.cardio || "").trim(),
    cardioName: (data.cardioName || "").trim(),
    cardioTime: (data.cardioTime || "").trim(),
    cardioIntensity: (data.cardioIntensity || "").trim(),
    cardioDays: (data.cardioDays || "").trim(),
    exams: (data.exams || "").trim(),
    stretch: (data.stretch || "").trim(),
  };
}

export async function apiPdfTicket(token, resourceKind, resourceKey) {
  return apiFetch("/pdf/ticket", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ resourceKind, resourceKey }),
  });
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
// ===== MANUAL WORKOUTS =====
export async function apiWorkouts(token) {
  return apiFetch("/workouts", { headers: authHeaders(token) });
}

export async function apiSaveWorkoutLogs(token, workoutId, logs, notes = "") {
  return apiFetch(`/student/workouts/${encodeURIComponent(workoutId)}/logs`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ logs, notes }),
  });
}

export async function apiWorkoutHistory(token) {
  return apiFetch("/student/workouts/history", { headers: authHeaders(token) });
}


export async function apiAdminListMuscleGroups(token) {
  return apiFetch("/admin/muscle-groups", { headers: authHeaders(token) });
}

export async function apiAdminCreateMuscleGroup(token, name) {
  return apiFetch("/admin/muscle-groups", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ name }),
  });
}

export async function apiAdminListVideos(token) {
  return apiFetch("/admin/videos", { headers: authHeaders(token) });
}

export async function apiAdminCreateVideo(token, data) {
  return apiFetch("/admin/videos", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function apiAdminListExercises(token, q = "") {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiFetch(`/admin/exercises${qs}`, { headers: authHeaders(token) });
}

export async function apiAdminCreateExercise(token, data) {
  return apiFetch("/admin/exercises", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function apiAdminGetWorkouts(token, email) {
  return apiFetch(`/admin/users/${encodeURIComponent(email)}/workouts`, {
    headers: authHeaders(token),
  });
}

export async function apiAdminSaveWorkouts(token, email, workouts) {
  return apiFetch(`/admin/users/${encodeURIComponent(email)}/workouts`, {
    method: "PUT",
    headers: jsonHeaders(token),
    body: JSON.stringify({ workouts }),
  });
}

export async function apiAdminWorkoutRecords(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.email) params.set("email", filters.email);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return apiFetch(`/admin/workout-records${qs}`, { headers: authHeaders(token) });
}

// ===== CATALOG EDIT/DELETE =====
export async function apiAdminUpdateMuscleGroup(token, id, data) {
  return apiFetch(`/admin/muscle-groups/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function apiAdminDeleteMuscleGroup(token, id) {
  return apiFetch(`/admin/muscle-groups/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function apiAdminUpdateVideo(token, id, data) {
  return apiFetch(`/admin/videos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function apiAdminDeleteVideo(token, id) {
  return apiFetch(`/admin/videos/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export async function apiAdminUpdateExercise(token, id, data) {
  return apiFetch(`/admin/exercises/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function apiAdminDeleteExercise(token, id) {
  return apiFetch(`/admin/exercises/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

// ===== TÉCNICAS DE TREINO =====
export async function apiAdminListTechniques(token) {
  return apiFetch("/admin/techniques", { headers: authHeaders(token) });
}

export async function apiAdminCreateTechnique(token, data) {
  return apiFetch("/admin/techniques", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function apiAdminUpdateTechnique(token, id, data) {
  return apiFetch(`/admin/techniques/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: jsonHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function apiAdminDeleteTechnique(token, id) {
  return apiFetch(`/admin/techniques/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

// ===== ITENS EXTRAS =====
export async function apiExtraItems(token) {
  return apiFetch("/extra-items", { headers: authHeaders(token) });
}

export async function apiAdminGetExtraItems(token, email) {
  return apiFetch(`/admin/users/${encodeURIComponent(email)}/extra-items`, {
    headers: authHeaders(token),
  });
}

export async function apiAdminSaveExtraItems(token, email, items) {
  return apiFetch(`/admin/users/${encodeURIComponent(email)}/extra-items`, {
    method: "PUT",
    headers: jsonHeaders(token),
    body: JSON.stringify({ items }),
  });
}
