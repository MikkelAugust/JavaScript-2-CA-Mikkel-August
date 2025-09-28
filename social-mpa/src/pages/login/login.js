import { redirectIfAuthed } from "../../utils/guards.js";
import { login } from "../../services/auth.js";
import Spinner from "../../components/spinner.js";

redirectIfAuthed();

const form = document.querySelector("#login-form");
const submitBtn = form?.querySelector('button[type="submit"]');

const params = new URLSearchParams(location.search);
const next = params.get("next") || new URL("../feed/feed.html", location.href).href;

form?.addEventListener("submit", onSubmit);

async function onSubmit(e) {
  e.preventDefault();
  if (!form) return;

  submitDisabled(true);
  Spinner.show();

  try {
    const fd = new FormData(form);
    const email = String(fd.get("email") || "").trim().toLowerCase();
    const password = String(fd.get("password") || "");
    await login({ email, password });
    location.replace(next);
  } catch (err) {
    const msgs = Array.isArray(err?.data?.errors)
      ? err.data.errors.map(e => e?.message).filter(Boolean)
      : null;
    alert((msgs?.length ? msgs.join("\n") : err?.data?.message) || `HTTP ${err?.status || ""} — Login failed`);
  } finally {
    Spinner.hide();
    submitDisabled(false);
  }
}

function submitDisabled(state) {
  if (!submitBtn) return;
  submitBtn.disabled = state;
  submitBtn.textContent = state ? "Signing in…" : "Sign in";
}