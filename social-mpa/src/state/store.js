import { CONFIG } from "../app/config.js";

const listeners = new Set();
const state = {
  token: localStorage.getItem(CONFIG.STORAGE.TOKEN),
  user: JSON.parse(localStorage.getItem(CONFIG.STORAGE.USER) || "null")
};

function setAuth(token, user) {
  state.token = token;
  state.user = user;
  if (token) localStorage.setItem(CONFIG.STORAGE.TOKEN, token);
  else localStorage.removeItem(CONFIG.STORAGE.TOKEN);
  if (user) localStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify(user));
  else localStorage.removeItem(CONFIG.STORAGE.USER);
  listeners.forEach((fn) => fn(state));
}

export const store = {
  get token() { return state.token; },
  get user() { return state.user; },
  getToken() { return state.token; },
  setAuth,
  clearAuth() { setAuth(null, null); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
};