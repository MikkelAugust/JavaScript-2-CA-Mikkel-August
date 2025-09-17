import { api } from "./apiClient.js";
import { CONFIG } from "../app/config.js";

export async function list({ q = "", page = 1, limit = 20 } = {}) {
  const qs = new URLSearchParams({ page, limit, _author: "true" });
  if (q) qs.set("q", q); // server-side text search
  const json = await api.get(`${CONFIG.ENDPOINTS.SOCIAL.POSTS}?${qs}`);
  return json.data;
}
export async function get(id) {
  const json = await api.get(`${CONFIG.ENDPOINTS.SOCIAL.POSTS}/${id}?_author=true`);
  return json.data;
}
export async function create(payload) {
  const json = await api.post(CONFIG.ENDPOINTS.SOCIAL.POSTS, payload);
  return json.data;
}
export async function update(id, payload) {
  const json = await api.put(`${CONFIG.ENDPOINTS.SOCIAL.POSTS}/${id}`, payload);
  return json.data;
}
export async function remove(id) {
  const json = await api.del(`${CONFIG.ENDPOINTS.SOCIAL.POSTS}/${id}`);
  return json.data;
}