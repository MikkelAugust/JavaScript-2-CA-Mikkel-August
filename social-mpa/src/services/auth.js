// @ts-check
import { CONFIG } from "../app/config.js";
import { store } from "../state/store.js";

const { API_BASE, ENDPOINTS, STORAGE } = CONFIG;
// Some templates expose AUTH under ENDPOINTS.AUTH, others at root
const AUTH = ENDPOINTS.AUTH ?? ENDPOINTS;
const REGISTER_EP = AUTH.REGISTER;
const LOGIN_EP = AUTH.LOGIN;
const CREATE_API_KEY_EP = AUTH.CREATE_API_KEY;

const TOKEN_KEY = STORAGE?.TOKEN;
const USER_KEY = STORAGE?.USER;
const APIKEY_KEY = STORAGE?.API_KEY;

/**
 * Small JSON helper. Throws {status,data} on non-2xx.
 * @param {string} url
 * @param {{method?:string, headers?:Record<string,string>, body?:any}} [init]
 * @returns {Promise<any>}
 */
async function jsonFetch(url, init = {}) {
  const { method = "GET", headers = {}, body } = init;
  const res = await fetch(url, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw { status: res.status, data: json };
  return json;
}

/**
 * Persist token and user to store + localStorage.
 * @param {string} accessToken
 * @param {{name:string,email:string}} user
 */
function setAuthSafely(accessToken, user) {
  try {
    if (store?.setToken) store.setToken(accessToken);
    if (store?.setUser) store.setUser(user);
  } catch { }
  if (TOKEN_KEY && accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  if (USER_KEY && user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Persist API key to store + localStorage.
 * @param {string|null} key
 */
function setApiKeySafely(key) {
  try {
    if (store?.setApiKey) store.setApiKey(key || null);
  } catch { }
  if (APIKEY_KEY) {
    if (key) localStorage.setItem(APIKEY_KEY, key);
    else localStorage.removeItem(APIKEY_KEY);
  }
}

/**
 * Register a new account.
 * @param {{name:string,email:string,password:string,bio?:string,avatar?:{url:string,alt?:string},banner?:{url:string,alt?:string}}} payload
 * @returns {Promise<any>}
 */
export async function register(payload) {
  const json = await jsonFetch(`${API_BASE}${REGISTER_EP}`, { method: "POST", body: payload });
  return json.data;
}

/**
 * Log in and seed token/user into store. Also ensures an API key.
 * @param {{email:string,password:string}} creds
 * @returns {Promise<{accessToken:string,name:string,email:string}>}
 */
export async function login({ email, password }) {
  const json = await jsonFetch(`${API_BASE}${LOGIN_EP}`, { method: "POST", body: { email, password } });
  const data = json?.data || {};
  const { accessToken, name, email: userEmail } = data;
  if (!accessToken) throw { status: 500, data: { message: "Missing access token" } };

  setAuthSafely(accessToken, { name, email: userEmail });
  try { await ensureApiKey(); } catch { } // non-fatal
  return data;
}

/**
 * Ensure we have a Noroff API key. Returns existing or newly created key.
 * @returns {Promise<string|null>}
 */
export async function ensureApiKey() {
  const existing = (store?.apiKey) || (APIKEY_KEY ? localStorage.getItem(APIKEY_KEY) : null);
  if (existing) return existing;

  const token =
    (store?.getToken?.() || store?.token) ||
    (TOKEN_KEY ? localStorage.getItem(TOKEN_KEY) : null);
  if (!token) throw { status: 401, data: { message: "Not authenticated" } };

  try {
    // Some environments require an empty JSON object body; avoid sending none.
    const json = await jsonFetch(`${API_BASE}${CREATE_API_KEY_EP}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {},
    });
    const key = json?.data?.key || json?.data?.apiKey || json?.key || null;
    if (key) setApiKeySafely(key);
    return key;
  } catch (err) {
    // 409 = key already exists; return whatever is stored if any
    const e = /** @type {any} */ (err);
    if (e?.status === 409) return APIKEY_KEY ? localStorage.getItem(APIKEY_KEY) : null;
    throw err;
  }
}

/** Clear token, user, and API key from store and storage. */
export function logout() {
  try {
    if (store?.setToken) store.setToken(null);
    if (store?.setUser) store.setUser(null);
    if (store?.setApiKey) store.setApiKey(null);
  } catch { }
  if (TOKEN_KEY) localStorage.removeItem(TOKEN_KEY);
  if (USER_KEY) localStorage.removeItem(USER_KEY);
  if (APIKEY_KEY) localStorage.removeItem(APIKEY_KEY);
}
