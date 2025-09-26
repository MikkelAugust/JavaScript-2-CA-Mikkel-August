import { requireAuth } from "../../utils/guards.js";
import { mountNavbar } from "../../components/navbar.js";
import { store } from "../../state/store.js";
import Spinner from "../../components/spinner.js";
import { CONFIG } from "../../app/config.js";
import { api } from "../../services/apiClient.js";
import { createLoadMore } from "../../components/pagination.js";

requireAuth();

const params = new URLSearchParams(location.search);
const q = params.get("q") || "";
const mine = params.get("mine") === "1";

const POST_BASE = new URL("../post/post.html", import.meta.url);
const PROFILE_BASE = new URL("../profile/profile.html", import.meta.url);
const postUrl = (id) => { const u = new URL(POST_BASE); u.searchParams.set("id", id); return u.href; };
const profileUrl = (name) => { const u = new URL(PROFILE_BASE); u.searchParams.set("u", name); return u.href; };

const esc = (s) => String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const cssEscape = (str) => (window.CSS && CSS.escape ? CSS.escape(str) : String(str).replace(/"/g, '\\"'));

async function listPosts({ q = "", page = 1, limit = 24 } = {}) {
  const qs = new URLSearchParams({
    sort: "created",
    sortOrder: "desc",
    page: String(page),
    limit: String(limit),
    ...(q ? { q } : {})
  });
  qs.append("_author", "true");
  qs.append("_reactions", "true");
  qs.append("_count", "true");
  const out = await api.get(`/social/posts?${qs}`);
  let items = out?.data ?? out;
  if (mine && store.user?.name) items = items.filter(p => p?.author?.name === store.user.name);
  return items;
}

async function createPost({ title, body, tags = [], media }) {
  const payload = { title, body, tags, ...(media ? { media } : {}) };
  const out = await api.post("/social/posts", payload);
  return out?.data ?? out;
}

function postCard(p) {
  const author = p?.author?.name || "unknown";
  const title = String(p?.title || "(untitled)");
  const body = String(p?.body || "");
  const created = p?.created ? new Date(p.created) : null;

  const media = p?.media?.url
    ? `<div class="media"><img src="${esc(p.media.url)}" alt="${esc(p.media.alt || title)}" loading="lazy"></div>`
    : "";

  const tags = Array.isArray(p.tags) && p.tags.length
    ? `<small class="tags">#${p.tags.map(esc).join(" #")}</small>`
    : "";

  const reactionsHTML = (window.Reactions?.renderBar?.(p, { viewOnly: true })) || "";

  return `
  <article class="post-card" data-id="${esc(p.id)}">
    ${media}
    <div class="content">
      <h3>${esc(title)}</h3>
      ${body ? `<p>${esc(body)}</p>` : ""}
    </div>
    <div class="meta">
      <small>${author !== "unknown" ? `<a href="${profileUrl(author)}">@${esc(author)}</a>` : "@unknown"}</small>
      <span class="dot"></span>
      <small>${created ? created.toLocaleDateString() : ""}</small>
      ${tags}
    </div>
    ${reactionsHTML}
  </article>`;
}

function ready(fn) { document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn(); }

ready(async () => {
  mountNavbar(document.querySelector("#nav"));

  const listEl = document.querySelector("#feed-list");
  if (!listEl) return;

  // Load-more paginator
  const LM = createLoadMore(listEl, {
    pageSize: 24,
    buttonText: "Load more posts",
    fetchPage: (page, limit) => listPosts({ q, page, limit }),
    renderItems: (items) => items.map(postCard).join(""),
    renderEmpty: () => "<p>No posts.</p>",
  });

  // initial load
  await LM.load(1);

  // live reaction updates
  window.addEventListener("reactions:update", (e) => {
    const d = e.detail || {};
    const postId = String(d.postId ?? "");
    const symbol = String(d.symbol ?? "");
    const delta = Number(d.delta ?? 0);
    const active = !!d.active;
    if (!postId || !symbol || !delta) return;

    const card = listEl.querySelector(`.post-card[data-id="${cssEscape(postId)}"]`);
    if (!card) return;
    const wrap = card.querySelector(`.reactions[data-post="${cssEscape(postId)}"]`);
    if (!wrap) return;
    const btn = wrap.querySelector(`.react-btn[data-sym="${cssEscape(symbol)}"]`);
    if (!btn) return;

    const cntEl = btn.querySelector(".cnt");
    const prev = parseInt(btn.dataset.count || cntEl?.textContent || "0", 10) || 0;
    const next = Math.max(0, prev + delta);

    btn.dataset.count = String(next);
    if (cntEl) cntEl.textContent = String(next);
    if (active) btn.setAttribute("data-active", ""); else btn.removeAttribute("data-active");
  }, { passive: true });

  // open post on card click
  listEl.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    const card = e.target.closest(".post-card");
    if (!card) return;
    const id = card.dataset.id;
    if (id) location.href = postUrl(id);
  });

  // create form
  const formEl = document.querySelector("#create-form");
  formEl?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = formEl.querySelector('[type="submit"]');
    if (btn) btn.disabled = true;
    Spinner.show();

    try {
      const fd = new FormData(formEl);
      const title = String(fd.get("title") || "").trim();
      const body = String(fd.get("body") || "").trim();
      const tags = String(fd.get("tags") || "").split(",").map(t => t.trim()).filter(Boolean);
      const url = String(fd.get("imageUrl") || "").trim();
      const alt = String(fd.get("alt") || "").trim();

      let media;
      if (url) {
        if (!/^https?:\/\//i.test(url)) throw new Error("Image URL must start with http(s)");
        media = { url, alt: alt || title };
      }

      const created = await createPost({ title, body, tags, media });

      const wrap = document.createElement("div");
      wrap.innerHTML = postCard(created);
      const footer = listEl.querySelector('[data-loadmore]'); // keep button at bottom
      if (footer) listEl.insertBefore(wrap.firstElementChild, footer);
      else listEl.prepend(wrap.firstElementChild);

      formEl.reset();
    } catch (err) {
      alert(err.data?.errors?.[0]?.message || err.message || "Create failed");
      console.error(err);
    } finally {
      if (btn) btn.disabled = false;
      Spinner.hide();
    }
  });
});