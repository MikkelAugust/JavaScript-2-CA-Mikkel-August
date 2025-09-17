import { redirectIfAuthed } from "../../utils/guards.js";
import { login } from "../../services/auth.js";
import Spinner from "../../components/spinner.js";

redirectIfAuthed();

const form = document.querySelector("#login-form");
const next =
  new URLSearchParams(location.search).get("next") ||
  new URL("../feed/feed.html", location.href).href;

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = form.querySelector('[type="submit"]');
  btn.disabled = true;
  Spinner.show();
  try {
    const fd = new FormData(form);
    const credentials = {
      email: String(fd.get("email") || "").trim().toLowerCase(),
      password: String(fd.get("password") || "")
    };
    await login(credentials);
    Spinner.show();
    location.replace(next);
    return;
  } catch (err) {
    Spinner.hide();
    const list = err?.data?.errors?.map(e => e?.message).filter(Boolean);
    alert((list?.length ? list.join("\n") : err?.data?.message) || `HTTP ${err?.status || ""} — Login failed`);
  } finally {
    btn.disabled = false;
  }
});