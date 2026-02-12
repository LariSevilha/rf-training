const KEY_TOKEN = "rf_token";
const KEY_EMAIL = "rf_email";

export const state = {
  user: null,
};

export function getToken() {
  return localStorage.getItem(KEY_TOKEN);
}

export function setToken(token) {
  if (token) localStorage.setItem(KEY_TOKEN, token);
  else localStorage.removeItem(KEY_TOKEN);
}

export function clearSession() {
  state.user = null;
  localStorage.removeItem(KEY_TOKEN);
}

export function saveEmail(email) {
  localStorage.setItem(KEY_EMAIL, email);
}

export function loadEmail() {
  return localStorage.getItem(KEY_EMAIL) || "";
}



