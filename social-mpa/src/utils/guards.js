import { store } from "../state/store.js";

export const getToken = () => store?.getToken?.();

/**
 * @returns {boolean}
 */
export function requireAuth() {
  const token = getToken();
  if (token) return true;

  const { href } = location;
  const loginUrl = new URL("../login/login.html", href);
  loginUrl.searchParams.set("next", href);
  location.replace(loginUrl);
  return false;
}

/**
 * @param {string} [target=new URL("../feed/feed.html", location.href).href]
 * @returns {boolean}
 */
export function redirectIfAuthed(target = new URL("../feed/feed.html", location.href).href) {
  const token = getToken();
  if (!token) return false;

  const { search, href } = location;
  const next = new URLSearchParams(search).get("next");
  const dest = next ? new URL(next, href).href : target;
  location.replace(dest);
  return true;
}