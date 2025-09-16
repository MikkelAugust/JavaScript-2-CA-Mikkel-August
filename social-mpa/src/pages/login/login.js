import { redirectIfAuthed } from "../../utils/guards.js";
import { login } from "../../services/auth.js";

redirectIfAuthed();

const form = document.querySelector("#login-form");
const next = new URLSearchParams(location.search).get("next") || "../feed/feed.html";

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true;
  try {
    const fd = new FormData(form);
    const credentials = {
      email: String(fd.get("email") || "").trim().toLowerCase(),
      password: String(fd.get("password") || "")
    };
    console.log("LOGIN ->", credentials);
    await login(credentials);
    window.location.replace(next);
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    const list = err?.data?.errors?.map(e => e?.message).filter(Boolean);
    alert((list?.length ? list.join("\n") : err?.data?.message) || `HTTP ${err?.status || ""} — Login failed`);
  } finally {
    btn.disabled = false;
  }
});
