import { api } from "./apiClient.js";
import { CONFIG } from "../app/config.js";

export async function get(name, flags = {}) {
  const qs = new URLSearchParams();
  if (flags._followers) qs.set("_followers", "true");
  if (flags._following) qs.set("_following", "true");
  if (flags._count)     qs.set("_count", "true");
  const path = `${CONFIG.ENDPOINTS.SOCIAL.PROFILES}/${encodeURIComponent(name)}${qs.toString() ? "?" + qs : ""}`;
  const json = await api.get(path);
  return json.data ?? json;
}

export async function posts(
  name,
  { page = 1, limit = 20, _author = true, _reactions = true, _count = true } = {}
) {
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (_author)    qs.set("_author", "true");
  if (_reactions) qs.set("_reactions", "true");
  if (_count)     qs.set("_count", "true");

  const json = await api.get(
    `${CONFIG.ENDPOINTS.SOCIAL.PROFILES}/${encodeURIComponent(name)}/posts?${qs}`
  );
  return json.data ?? json;
}

export async function follow(name) {
  const json = await api.put(
    `${CONFIG.ENDPOINTS.SOCIAL.PROFILES}/${encodeURIComponent(name)}/follow`
  );
  return json.data ?? json;
}

export async function unfollow(name) {
  const json = await api.put(
    `${CONFIG.ENDPOINTS.SOCIAL.PROFILES}/${encodeURIComponent(name)}/unfollow`
  );
  return json.data ?? json;
}

export async function update(name, data) {
  const path = `${CONFIG.ENDPOINTS.SOCIAL.PROFILES}/${encodeURIComponent(name)}`;
  const json = await api.put(path, data);
  return json.data ?? json;
}

export const updateMedia = (name, media) => update(name, media);