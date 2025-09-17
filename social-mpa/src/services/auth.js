import { CONFIG } from "../app/config.js";
import { store } from "../state/store.js";

async function jsonFetch(url, init = {}) {
  const res = await fetch(url, {
    method: init.method || "GET",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, data: json };
  return json;
}

export async function register(payload) {
  const json = await jsonFetch(`${CONFIG.API_BASE}${CONFIG.ENDPOINTS.AUTH.REGISTER}`, {
    method: "POST",
    body: payload,
  });
  return json.data;
}

export async function login({ email, password }) {
  const json = await jsonFetch(`${CONFIG.API_BASE}${CONFIG.ENDPOINTS.AUTH.LOGIN}`, {
    method: "POST",
    body: { email, password },
  });
  const user = json.data;
  store.setAuth(user.accessToken, user);
  await ensureApiKey();
  return user;
}

export async function ensureApiKey() {
  if (store.apiKey) return store.apiKey;
  const token = store.getToken?.() || localStorage.getItem(CONFIG.STORAGE.TOKEN);
  if (!token) throw { status: 401, data: { message: "Not authenticated" } };
  const res = await fetch(`${CONFIG.API_BASE}${CONFIG.ENDPOINTS.AUTH.CREATE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, data: json };
  const key = json?.data?.key;
  if (key) store.setApiKey ? store.setApiKey(key) : localStorage.setItem(CONFIG.STORAGE.API_KEY, key);
  return key;
}

export function logout() {
  store.clearAuth?.();
  localStorage.removeItem(CONFIG.STORAGE.TOKEN);
  localStorage.removeItem(CONFIG.STORAGE.USER);
  localStorage.removeItem(CONFIG.STORAGE.API_KEY);
}