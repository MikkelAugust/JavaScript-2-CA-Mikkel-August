import { requireAuth } from "../../utils/guards.js";
import { mountNavbar } from "../../components/navbar.js";
import { store } from "../../state/store.js";
import Spinner from "../../components/spinner.js";
import { CONFIG } from "../../app/config.js"; // ensure this exports API_BASE and STORAGE keys

requireAuth();
mountNavbar(document.querySelector("#nav"));

const $ = (s, r = document) => r.querySelector(s);
const listEl = $("#feed-list");
const formEl = $("#create-form");

const params = new URLSearchParams(location.search);
const q    = params.get("q") || "";
const mine = params.get("mine") === "1";

const POST_BASE    = new URL("../post/post.html", import.meta.url);
const PROFILE_BASE = new URL("../profile/profile.html", import.meta.url);
const postUrl    = (id)   => { const u = new URL(POST_BASE);    u.searchParams.set("id", id);   return u.href; };
const profileUrl = (name) => { const u = new URL(PROFILE_BASE); u.searchParams.set("u",  name); return u.href; };

const API   = (p) => `${CONFIG.API_BASE}${p}`;
const get   = (k) => localStorage.getItem(k);
const token = ()  => get(CONFIG.STORAGE.TOKEN);
const key   = ()  => get(CONFIG.STORAGE.API_KEY);

const authHeaders = () => ({
  "Content-Type": "application/json",
  "Authorization": `Bearer ${token()}`,
  "X-Noroff-API-Key": key()
});

const fail = (res, json) => {
  const msg = json?.errors?.[0]?.message || res.statusText || "Request failed";
  throw new Error(`${res.status} ${msg}`);
};

const esc = (s) =>
  String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));

async function listPosts({ q = "", limit = 24 } = {}) {
  const qs = new URLSearchParams({
    sort: "created",
    sortOrder: "desc",
    limit: String(limit),
    ...(q ? { q } : {})
  });
  const res = await fetch(API(`/social/posts?${qs}`), { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) fail(res, json);
  return json.data ?? json;
}

async function createPost({ title, body, tags = [], media }) {
  if (!token() || !key()) throw new Error("Not authenticated");
  const payload = { title, body, tags, ...(media ? { media } : {}) };
  const res = await fetch(API("/social/posts"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (!res.ok) fail(res, json);
  return json.data ?? json;
}

function postCard(p) {
  const author  = p?.author?.name || "unknown";
  const title   = String(p?.title || "(untitled)");
  const body    = String(p?.body || "");
  const created = p?.created ? new Date(p.created) : null;

  const img  = p?.media?.url
    ? `<img src="${esc(p.media.url)}" alt="${esc(p.media.alt || title)}" loading="lazy">`
    : "";
  const tags = Array.isArray(p.tags) && p.tags.length
    ? `<small class="tags">#${p.tags.map(esc).join(" #")}</small>`
    : "";

  return `
  <article class="post-card" data-id="${esc(p.id)}">
    ${img}
    <h3>${esc(title)}</h3>
    ${body ? `<p>${esc(body).slice(0, 240)}</p>` : ""}
    <div class="meta">
      <small>${author !== "unknown" ? `<a href="${profileUrl(author)}">@${esc(author)}</a>` : "@unknown"}</small>
      <span class="dot"></span>
      <small>${created ? created.toLocaleDateString() : ""}</small>
      ${tags}
    </div>
  </article>`;
}

function renderFeed(posts) {
  listEl.innerHTML = posts.map(postCard).join("") || "<p>No posts.</p>";
}

async function load() {
  listEl.innerHTML = "<p>Loading…</p>";
  Spinner.show();
  try {
    let items = await listPosts({ q, limit: 24 });
    if (mine && store.user?.name) {
      items = items.filter(p => p?.author?.name === store.user.name);
    }
    renderFeed(items);
  } catch (e) {
    console.error(e);
    listEl.innerHTML = `<p class="error">Error loading feed: ${esc(e.message)}</p>`;
  } finally {
    Spinner.hide();
  }
}

async function onSubmit(e) {
  e.preventDefault();
  const btn = formEl.querySelector('[type="submit"]');
  btn.disabled = true;
  Spinner.show();

  try {
    const fd    = new FormData(formEl);
    const title = String(fd.get("title") || "").trim();
    const body  = String(fd.get("body")  || "").trim();
    const tags  = String(fd.get("tags")  || "")
                    .split(",").map(t => t.trim()).filter(Boolean);
    const url   = String(fd.get("imageUrl") || "").trim();
    const alt   = String(fd.get("alt") || "").trim();

    let media;
    if (url) {
      if (!/^https?:\/\//i.test(url)) throw new Error("Image URL must start with http(s)");
      media = { url, alt: alt || title };
    }

    const created = await createPost({ title, body, tags, media });

    const wrap = document.createElement("div");
    wrap.innerHTML = postCard(created);
    listEl.prepend(wrap.firstElementChild);

    formEl.reset();
  } catch (err) {
    alert(err.message || "Create failed");
    console.error(err);
  } finally {
    btn.disabled = false;
    Spinner.hide();
  }
}

listEl.addEventListener("click", (e) => {
  const card = e.target.closest(".post-card");
  if (!card) return;
  const id = card.dataset.id;
  if (id) location.href = postUrl(id);
});

formEl?.addEventListener("submit", onSubmit);

(async function init() {
  if (!token() || !key()) {
    listEl.innerHTML = `<p class="muted">Login required. Missing token or API key.</p>`;
    return;
  }
  await load();
})();
