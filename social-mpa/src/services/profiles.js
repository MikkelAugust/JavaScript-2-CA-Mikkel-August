// src/services/profiles.js
import { api } from "./apiClient.js";
import { CONFIG } from "../app/config.js";

// GET /social/profiles/{name}?_followers=true&_following=true
export async function get(name, flags = {}) {
  const qs = new URLSearchParams();
  if (flags._followers) qs.set("_followers", "true");
  if (flags._following) qs.set("_following", "true");
  const path = `${CONFIG.ENDPOINTS.SOCIAL.PROFILES}/${encodeURIComponent(name)}${qs.toString() ? "?" + qs : ""}`;
  const json = await api.get(path);
  return json.data;
}

// GET /social/profiles/{name}/posts?_author=true&page=&limit=
export async function posts(name, { page = 1, limit = 20 } = {}) {
  const qs = new URLSearchParams({ page, limit, _author: "true" });
  const json = await api.get(`${CONFIG.ENDPOINTS.SOCIAL.PROFILES}/${encodeURIComponent(name)}/posts?${qs}`);
  return json.data;
}

// PUT /social/profiles/{name}/follow
export async function follow(name) {
  const json = await api.put(`${CONFIG.ENDPOINTS.SOCIAL.PROFILES}/${encodeURIComponent(name)}/follow`, {});
  return json.data;
}

// PUT /social/profiles/{name}/unfollow
export async function unfollow(name) {
  const json = await api.put(`${CONFIG.ENDPOINTS.SOCIAL.PROFILES}/${encodeURIComponent(name)}/unfollow`, {});
  return json.data;
}
