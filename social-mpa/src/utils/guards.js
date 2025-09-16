import { store } from "../state/store.js";
export function requireAuth() {
  if (!store.getToken()) window.location.replace("../login/login.html");
}
export function redirectIfAuthed() {
  if (store.getToken()) window.location.replace("../feed/feed.html");
}
