// @ts-check
import { api } from "./apiClient.js";
import { CONFIG } from "../app/config.js";

const { ENDPOINTS: { SOCIAL: { POSTS } } } = CONFIG;

/**
 * List posts with optional query and expansions.
 * @param {{q?:string,page?:number,limit?:number,_author?:boolean,_reactions?:boolean,_count?:boolean}} [opts]
 * @returns {Promise<any[]>}
 */
export async function list({
  q = "",
  page = 1,
  limit = 20,
  _author = true,
  _reactions = true,
  _count = true,
} = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (q) qs.set("q", q);
  if (_author) qs.set("_author", "true");
  if (_reactions) qs.set("_reactions", "true");
  if (_count) qs.set("_count", "true");

  const { data } = await api.get(`${POSTS}?${qs}`);
  return data;
}

/**
 * Get a single post.
 * @param {string} id
 * @param {{_author?:boolean,_reactions?:boolean}} [opts]
 * @returns {Promise<any>}
 */
export async function get(id, { _author = true, _reactions = true } = {}) {
  const qs = new URLSearchParams();
  if (_author) qs.set("_author", "true");
  if (_reactions) qs.set("_reactions", "true");
  const { data } = await api.get(`${POSTS}/${encodeURIComponent(id)}?${qs}`);
  return data;
}

/**
 * Create a post.
 * @param {{title:string, body?:string, tags?:string[], media?:{url:string,alt?:string}}} payload
 * @returns {Promise<any>}
 */
export async function create(payload) {
  const { data } = await api.post(POSTS, payload);
  return data;
}

/**
 * Update a post.
 * @param {string} id
 * @param {Partial<{title:string, body:string, tags:string[], media:{url:string,alt?:string}}>} payload
 * @returns {Promise<any>}
 */
export async function update(id, payload) {
  const { data } = await api.put(`${POSTS}/${encodeURIComponent(id)}`, payload);
  return data;
}

/**
 * Delete a post.
 * @param {string} id
 * @returns {Promise<any>}
 */
export async function remove(id) {
  const { data } = await api.del(`${POSTS}/${encodeURIComponent(id)}`);
  return data;
}