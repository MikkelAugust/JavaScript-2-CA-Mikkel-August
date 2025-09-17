import { api } from "./apiClient.js";
export const getProfile = (username) => api.get(`/users/${username}`);
export const follow = (username) => api.post(`/users/${username}/follow`);
export const unfollow = (username) => api.post(`/users/${username}/unfollow`);