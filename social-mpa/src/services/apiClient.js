import { CONFIG } from "../app/config.js";
import { store } from "../state/store.js";

const API_BASE   = CONFIG.API_BASE;
const TOKEN_KEY  = CONFIG.STORAGE?.TOKEN;
const API_KEY_KEY= CONFIG.STORAGE?.API_KEY;

/**
 * Core HTTP request. Automatically adds Bearer token and X-Noroff-API-Key when available.
 * Throws an Error with `.status` and `.data` on non-2xx responses.
 * @param {string} path
 * @param {{ method?: "GET"|"POST"|"PUT"|"PATCH"|"DELETE", body?: any, headers?: Record<string,string>, signal?: AbortSignal }} [opts]
 * @returns {Promise<{data?:any, meta?:any, errors?:any, message?:string}>}
 */
async function request(path, opts = {}) {
  const { method = "GET", body, headers = {}, signal } = opts;
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

  // Read credentials from store first, then localStorage as a fallback
  const token  = store?.getToken?.() ?? (TOKEN_KEY   ? localStorage.getItem(TOKEN_KEY)   : null);
  const apiKey = store?.apiKey       ?? (API_KEY_KEY ? localStorage.getItem(API_KEY_KEY) : null);

  /** @type {Record<string,string>} */
  const baseHeaders = {
    ...(token  ? { Authorization: `Bearer ${token}` } : {}),
    ...(apiKey ? { "X-Noroff-API-Key": String(apiKey) } : {}),
    ...headers,
  };

  // Only set JSON content-type if a body is present and caller didn’t override it
  if (body !== undefined && !baseHeaders["Content-Type"]) {
    baseHeaders["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    method,
    headers: baseHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const parsed = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = parsed?.errors?.[0]?.message || parsed?.message || res.statusText || "Request failed";
    const err = Object.assign(new Error(msg), { status: res.status, data: parsed });
    throw err;
  }
  return parsed;
}

/**
 * Minimal API client.
 * @typedef {Object} ApiClient
 * @property {(p:string, headers?:Record<string,string>) => Promise<any>} get
 * @property {(p:string, body?:any, headers?:Record<string,string>) => Promise<any>} post
 * @property {(p:string, body?:any, headers?:Record<string,string>) => Promise<any>} put
 * @property {(p:string, body?:any, headers?:Record<string,string>) => Promise<any>} patch
 * @property {(p:string, headers?:Record<string,string>) => Promise<any>} del
 */

/** @type {ApiClient} */
export const api = {
  get(p, headers)            { return request(p, { headers }); },
  post(p, body, headers)     { return request(p, { method: "POST",  body, headers }); },
  put(p, body, headers)      { return request(p, { method: "PUT",   body, headers }); },
  patch(p, body, headers)    { return request(p, { method: "PATCH", body, headers }); },
  del(p, headers)            { return request(p, { method: "DELETE", headers }); },
};