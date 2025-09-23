export const CONFIG = {
  API_BASE: "https://v2.api.noroff.dev",
  ENDPOINTS: {
    AUTH: {
      REGISTER: "/auth/register",
      LOGIN: "/auth/login",
      CREATE_API_KEY: "/auth/create-api-key",
    },
    SOCIAL: {
      POSTS: "/social/posts",
      PROFILES: "/social/profiles",
    },
  },
  STORAGE: {
    TOKEN: "social.token",
    USER: "social.user",
    API_KEY: "social.apiKey",
  },
};

export function buildUrl(path) {
  if (!path) return CONFIG.API_BASE;
  return path.startsWith("http") ? path : `${CONFIG.API_BASE}${path}`;
}

export function defaultHeaders(extra = {}) {
  const token = localStorage.getItem(CONFIG.STORAGE.TOKEN);
  const apiKey = localStorage.getItem(CONFIG.STORAGE.API_KEY);
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(apiKey ? { "X-Noroff-API-Key": apiKey } : {}),
    ...extra,
  };
}

export function withAuth(init = {}) {
  const headers = defaultHeaders(init.headers || {});
  return { ...init, headers };
}