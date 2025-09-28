// @ts-check
import { CONFIG } from "../app/config.js";

/** Internal state */
const state = {
  token: (CONFIG.STORAGE?.TOKEN && localStorage.getItem(CONFIG.STORAGE.TOKEN)) || null,
  user: (() => {
    try { return JSON.parse(localStorage.getItem(CONFIG.STORAGE?.USER || "") || "null"); }
    catch { return null; }
  })(),
  apiKey: (CONFIG.STORAGE?.API_KEY && localStorage.getItem(CONFIG.STORAGE.API_KEY)) || null,
};

/** Subscribers */
const listeners = new Set();
/** Notify all subscribers */
function notify() { listeners.forEach(fn => { try { fn(state); } catch {} }); }

/** Persist state to localStorage safely */
function persist() {
  const TOKEN_KEY  = CONFIG.STORAGE?.TOKEN;
  const USER_KEY   = CONFIG.STORAGE?.USER;
  const APIKEY_KEY = CONFIG.STORAGE?.API_KEY;

  if (TOKEN_KEY)  state.token ? localStorage.setItem(TOKEN_KEY, state.token) : localStorage.removeItem(TOKEN_KEY);
  if (USER_KEY)   state.user  ? localStorage.setItem(USER_KEY, JSON.stringify(state.user)) : localStorage.removeItem(USER_KEY);
  if (APIKEY_KEY) state.apiKey? localStorage.setItem(APIKEY_KEY, state.apiKey) : localStorage.removeItem(APIKEY_KEY);
}

/**
 * @typedef {{ token:string|null, user:any, apiKey:string|null }} StoreState
 * @typedef {(s:StoreState)=>void} StoreListener
 */

/** Global store API */
export const store = {
  /** @returns {string|null} */
  get token() { return state.token; },
  /** @returns {any} */
  get user()  { return state.user;  },
  /** @returns {string|null} */
  get apiKey(){ return state.apiKey; },
  /** @returns {string|null} */
  getToken()  { return state.token; },

  /** @param {string|null} t */
  setToken(t) { state.token = t; persist(); notify(); },
  /** @param {any} u */
  setUser(u)  { state.user  = u; persist(); notify(); },
  /** @param {string|null} k */
  setApiKey(k){ state.apiKey= k; persist(); notify(); },

  /** @param {string|null} token @param {any} user */
  setAuth(token, user) { state.token = token; state.user = user; persist(); notify(); },

  clearAuth() { state.token = null; state.user = null; state.apiKey = null; persist(); notify(); },

  /** @param {StoreListener} fn */
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};