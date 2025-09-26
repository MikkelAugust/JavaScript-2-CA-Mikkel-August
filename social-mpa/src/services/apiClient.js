import { CONFIG } from "../app/config.js";
import { store } from "../state/store.js";

async function request(path, { method = "GET", body, headers } = {}) {
  const url = path.startsWith("http") ? path : `${CONFIG.API_BASE}${path}`;
  const token = store?.getToken?.() ?? localStorage.getItem(CONFIG.STORAGE.TOKEN);
  const apiKey = store?.apiKey ?? localStorage.getItem(CONFIG.STORAGE.API_KEY);

  const baseHeaders = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(apiKey ? { "X-Noroff-API-Key": apiKey } : {}),
    ...(headers || {}),
  };
  if (body !== undefined) baseHeaders["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers: baseHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.errors?.[0]?.message || json?.message || res.statusText || "Request failed";
    const err = new Error(msg);
    err.status = res.status;
    err.data = json;
    throw err;
  }
  return json;
}

export const api = {
  get: (p, h) => request(p, { headers: h }),
  post: (p, b, h) => request(p, { method: "POST", body: b, headers: h }),
  put: (p, b, h) => request(p, { method: "PUT", body: b, headers: h }),
  patch: (p, b, h) => request(p, { method: "PATCH", body: b, headers: h }),
  del: (p, h) => request(p, { method: "DELETE", headers: h }),
};