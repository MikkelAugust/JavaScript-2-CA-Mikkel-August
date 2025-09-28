import { api } from "./apiClient.js";
import { CONFIG } from "../app/config.js";
import { store } from "../state/store.js";

const {
  ENDPOINTS: {
    SOCIAL: { PROFILES, POSTS },
  },
} = CONFIG;

/**
 * Get a profile.
 * @param {string} name
 * @param {{_followers?:boolean,_following?:boolean,_count?:boolean}} [opts]
 * @returns {Promise<any>}
 */
export async function get(name, { _followers = false, _following = false, _count = false } = {}) {
  const qs = new URLSearchParams();
  if (_followers) qs.set("_followers", "true");
  if (_following) qs.set("_following", "true");
  if (_count) qs.set("_count", "true");
  const { data } = await api.get(`${PROFILES}/${encodeURIComponent(name)}${qs.toString() ? "?" + qs : ""}`);
  return data;
}

/**
 * Update a profile (bio, avatar, banner, etc.). Also updates local store if it is the current user.
 * @param {string} name
 * @param {{bio?:string, avatar?:{url:string,alt?:string}, banner?:{url:string,alt?:string}}} payload
 * @returns {Promise<any>}
 */
export async function update(name, payload) {
  const { data } = await api.put(`${PROFILES}/${encodeURIComponent(name)}`, payload);

  try {
    if (store?.user?.name && store.user.name === (data?.name || name)) {
      const nextUser = {
        ...store.user,
        ...(typeof payload.bio === "string" ? { bio: payload.bio } : {}),
        ...(payload.avatar ? { avatar: { ...store.user?.avatar, ...payload.avatar } } : {}),
        ...(payload.banner ? { banner: { ...store.user?.banner, ...payload.banner } } : {}),
      };
      if (store?.setUser) store.setUser(nextUser);
      else localStorage.setItem(CONFIG.STORAGE.USER, JSON.stringify(nextUser));
      window.dispatchEvent(new CustomEvent("user:update", { detail: nextUser }));
    }
  } catch {}

  return data;
}

/**
 * Follow a user. API requires no body.
 * @param {string} name
 * @returns {Promise<boolean>}
 */
export async function follow(name) {
  const enc = encodeURIComponent(name);
  try {
    const { data } = await api.put(`${PROFILES}/${enc}/follow`);
    return data ?? true;
  } catch (err) {
    if (/** @type {any} */(err)?.status === 409) return true; // already following
    throw err;
  }
}

/**
 * Unfollow a user. API requires no body.
 * @param {string} name
 * @returns {Promise<boolean>}
 */
export async function unfollow(name) {
  const enc = encodeURIComponent(name);
  try {
    const { data } = await api.put(`${PROFILES}/${enc}/unfollow`);
    return data ?? true;
  } catch (err) {
    if (/** @type {any} */(err)?.status === 409) return true; // not following
    throw err;
  }
}

/**
 * List posts for a profile.
 * @param {string} name
 * @param {{page?:number,limit?:number,_author?:boolean,_reactions?:boolean,_count?:boolean,sort?:string,sortOrder?:"asc"|"desc"}} [opts]
 * @returns {Promise<any[]>}
 */
export async function posts(
  name,
  {
    page = 1,
    limit = 10,
    _author = true,
    _reactions = true,
    _count = true,
    sort = "created",
    sortOrder = "desc",
  } = {},
) {
  const qs = new URLSearchParams({
    sort,
    sortOrder,
    page: String(page),
    limit: String(limit),
    _author: _author ? "true" : "false",
    _reactions: _reactions ? "true" : "false",
    _count: _count ? "true" : "false",
  });
  const { data } = await api.get(`${PROFILES}/${encodeURIComponent(name)}/posts?${qs}`);
  return Array.isArray(data) ? data : [];
}

/**
 * Search/list profiles.
 * @param {{q?:string,limit?:number,page?:number}} [opts]
 * @returns {Promise<any[]>}
 */
export async function list({ q = "", limit = 20, page = 1 } = {}) {
  const qs = new URLSearchParams({ limit: String(limit), page: String(page) });
  if (q) qs.set("q", q);
  const { data } = await api.get(`${PROFILES}?${qs}`);
  return Array.isArray(data) ? data : [];
}

/**
 * Get a single post (helper exposed here for convenience).
 * @param {string} id
 * @param {{_author?:boolean,_reactions?:boolean}} [opts]
 * @returns {Promise<any>}
 */
export async function getPost(id, { _author = true, _reactions = true } = {}) {
  const qs = new URLSearchParams();
  if (_author) qs.set("_author", "true");
  if (_reactions) qs.set("_reactions", "true");
  const { data } = await api.get(`${POSTS}/${encodeURIComponent(id)}?${qs}`);
  return data;
}