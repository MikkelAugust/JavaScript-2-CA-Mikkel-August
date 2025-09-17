import { store } from "../state/store.js";

export function requireAuth() {
  if (store.getToken()) return;
  const loginUrl = new URL("../login/login.html", location.href);
  loginUrl.searchParams.set("next", location.href);
  location.replace(loginUrl);
}

export function redirectIfAuthed() {
  if (!store.getToken()) return;
  const qs = new URLSearchParams(location.search);
  const next = qs.get("next");
  const dest = next
    ? new URL(next, location.href).href
    : new URL("../feed/feed.html", location.href).href;
  location.replace(dest);
}
