import { redirectIfAuthed } from "../../utils/guards.js";
import { register as apiRegister, login } from "../../services/auth.js";

redirectIfAuthed();

const form = document.querySelector("#register-form");
const submitBtn = form?.querySelector('button[type="submit"]');

form?.addEventListener("submit", onSubmit);

async function onSubmit(e) {
  e.preventDefault();
  clearValidity();

  const fd = new FormData(form);
  const name = s(fd.get("name"));
  const email = s(fd.get("email")).toLowerCase();
  const password = s(fd.get("password"));
  const bio = s(fd.get("bio"));

  const avatarUrl = s(fd.get("avatarUrl"));
  const avatarAlt = s(fd.get("avatarAlt"));
  const bannerUrl = s(fd.get("bannerUrl"));
  const bannerAlt = s(fd.get("bannerAlt"));

  // Client-side validation per spec
  if (!/^[A-Za-z0-9_]{3,20}$/.test(name))
    return fail("name", "3–20 chars. Letters, numbers, underscore.");
  if (!/^[^@]+@stud\.noroff\.no$/i.test(email))
    return fail("email", "Use your stud.noroff.no email.");
  if (password.length < 8)
    return fail("password", "Minimum 8 characters.");
  if (bio && bio.length > 160)
    return fail("bio", "Max 160 characters.");
  if (avatarUrl && !isHttpUrl(avatarUrl))
    return fail("avatarUrl", "Enter a valid http(s) URL.");
  if (avatarAlt && !avatarUrl)
    return fail("avatarUrl", "Avatar alt requires a URL.");
  if (avatarAlt && avatarAlt.length > 120)
    return fail("avatarAlt", "Max 120 characters.");
  if (bannerUrl && !isHttpUrl(bannerUrl))
    return fail("bannerUrl", "Enter a valid http(s) URL.");
  if (bannerAlt && !bannerUrl)
    return fail("bannerUrl", "Banner alt requires a URL.");
  if (bannerAlt && bannerAlt.length > 120)
    return fail("bannerAlt", "Max 120 characters.");

  const payload = { name, email, password };
  if (bio) payload.bio = bio;
  if (avatarUrl)
    payload.avatar = { url: avatarUrl, ...(avatarAlt ? { alt: avatarAlt } : {}) };
  if (bannerUrl)
    payload.banner = { url: bannerUrl, ...(bannerAlt ? { alt: bannerAlt } : {}) };

  submitBtnDisabled(true);

  try {
    await apiRegister(payload);
    await login({ email, password });
    window.location.replace("../feed/feed.html");
  } catch (err) {
    console.error("REGISTER ERROR RAW:", err);
    const errs = err?.data?.errors;
    if (Array.isArray(errs) && errs.length) {
      const msgs = [];
      for (const eObj of errs) {
        const field = eObj?.path?.[0];
        if (field && form.elements[field]) setCustom(form.elements[field], eObj.message || "Invalid value.");
        if (eObj?.message) msgs.push(eObj.message);
      }
      alert(msgs.join("\n"));
      return;
    }
    alert(err?.data?.message || `HTTP ${err?.status || ""} — Registration failed`);
  } finally {
    submitBtnDisabled(false);
  }
}

/* Helpers */
function s(v) { return (v ?? "").toString().trim(); }
function isHttpUrl(u) {
  try { const url = new URL(u); return url.protocol === "http:" || url.protocol === "https:"; }
  catch { return false; }
}
function fail(name, message) {
  const el = form.elements[name];
  if (el) setCustom(el, message);
}
function setCustom(el, message) {
  el.setCustomValidity(message);
  el.reportValidity();
  el.focus();
}
function clearValidity() {
  for (const el of form.elements) {
    if (el instanceof HTMLElement && typeof el.setCustomValidity === "function") el.setCustomValidity("");
  }
}
function submitBtnDisabled(state) {
  if (!submitBtn) return;
  submitBtn.disabled = state;
  submitBtn.textContent = state ? "Creating…" : "Create account";
}