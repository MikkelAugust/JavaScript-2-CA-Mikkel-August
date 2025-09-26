import { api } from "./apiClient.js";
import { CONFIG } from "../app/config.js";

export const getProfile = (username) =>
  api.get(`${CONFIG.ENDPOINTS.SOCIAL.PROFILES}/${encodeURIComponent(username)}`);

export const follow = (username) =>
  api.put(`${CONFIG.ENDPOINTS.SOCIAL.PROFILES}/${encodeURIComponent(username)}/follow`, {});

export const unfollow = (username) =>
  api.put(`${CONFIG.ENDPOINTS.SOCIAL.PROFILES}/${encodeURIComponent(username)}/unfollow`, {});
