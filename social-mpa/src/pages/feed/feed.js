import { requireAuth } from "../../utils/guards.js";
import { mountNavbar } from "../../components/navbar.js";
import { store } from "../../state/store.js";
import Spinner from "../../components/spinner.js";
import { api } from "../../services/apiClient.js";
import { createLoadMore } from "../../components/pagination.js";
import { ready, esc } from "../../utils/dom.js";
import { ensureApiKey } from "../../services/auth.js";
import { CONFIG } from "../../app/config.js";

requireAuth();

const { search } = location;
const params = new URLSearchParams(search);
const q = params.get("q") || "";
const mine = params.get("mine") === "1";

const POST_BASE = new URL("../post/post.html", import.meta.url);
const PROFILE_BASE = new URL("../profile/profile.html", import.meta.url);
const postUrl    = (id)   => { const u = new URL(POST_BASE);    u.searchParams.set("id", id); return u.href; };
const profileUrl = (name) => { const u = new URL(PROFILE_BASE); u.searchParams.set("u", name); return u.href; };

const cssEscape = (str) => (window.CSS && CSS.escape ? CSS.escape(str) : String(str).replace(/"/g, '\\"'));

async function listPosts({ q = "", page = 1, limit = 24 } = {}) {
  const qs = new URLSearchParams({
    sort: "created",
    sortOrder: "desc",
    page: String(page),
    limit: String(limit),
    ...(q ? { q } : {}),
  });
  qs.append("_author", "true");
  qs.append("_reactions", "true");
  qs.append("_count", "true");

  const { data = [] } = await api.get(`${CONFIG.ENDPOINTS.SOCIAL.POSTS}?${qs}`);
  const { user } = store || {};
  const { name: myName } = user || {};
  return mine && myName ? data.filter(({ author }) => author?.name === myName) : data;
}

async function createPost({ title, body, tags = [], media }) {
  const payload = { title, body, tags, ...(media ? { media } : {}) };
  const { data } = await api.post(CONFIG.ENDPOINTS.SOCIAL.POSTS, payload);
  return data;
}

function postCard(post) {
  const {
    id,
    title = "(untitled)",
    body = "",
    created,
    author = {},
    media,
    tags = [],
  } = post || {};

  const { name: authorName = "unknown" } = author;
  const createdAt = created ? new Date(created) : null;

  const mediaHTML = media?.url
    ? `<div class="media"><img src="${esc(media.url)}" alt="${esc(media.alt || title)}" loading="lazy"></div>`
    : "";

  const tagsHTML = Array.isArray(tags) && tags.length
    ? `<small class="tags">#${tags.map(esc).join(" #")}</small>`
    : "";

  const reactionsHTML = window.Reactions?.renderBar?.(post, { viewOnly: true }) || "";

  return `
  <article class="post-card" data-id="${esc(id)}">
    ${mediaHTML}
    <div class="content">
      <h3>${esc(title)}</h3>
      ${body ? `<p>${esc(body)}</p>` : ""}
    </div>
    <div class="meta">
      <small>${authorName !== "unknown" ? `<a href="${profileUrl(authorName)}">@${esc(authorName)}</a>` : "@unknown"}</small>
      <span class="dot"></span>
      <small>${createdAt ? createdAt.toLocaleDateString() : ""}</small>
      ${tagsHTML}
    </div>
    ${reactionsHTML}
  </article>`;
}

ready(async () => {
  mountNavbar(document.querySelector("#nav"));

  const listEl = document.querySelector("#feed-list");
  if (!listEl) return;

  try { await ensureApiKey(); } catch {}

  const LM = createLoadMore(listEl, {
    pageSize: 24,
    buttonText: "Load more posts",
    fetchPage: (page, limit) => listPosts({ q, page, limit }),
    renderItems: (items) => items.map(postCard).join(""),
    renderEmpty: () => "<p>No posts.</p>",
  });

  await LM.load(1);

  window.addEventListener("reactions:update", (e) => {
    const { detail = {} } = e;
    const { postId = "", symbol = "", delta = 0, active = false } = detail;
    if (!postId || !symbol || !delta) return;

    const card = listEl.querySelector(`.post-card[data-id="${cssEscape(String(postId))}"]`);
    if (!card) return;

    const wrap = card.querySelector(`.reactions[data-post="${cssEscape(String(postId))}"]`);
    if (!wrap) return;

    const btn = wrap.querySelector(`.react-btn[data-sym="${cssEscape(String(symbol))}"]`);
    if (!btn) return;

    const cntEl = btn.querySelector(".cnt");
    const prev = parseInt(btn.dataset.count || cntEl?.textContent || "0", 10) || 0;
    const next = Math.max(0, prev + Number(delta));

    btn.dataset.count = String(next);
    if (cntEl) cntEl.textContent = String(next);
    if (active) btn.setAttribute("data-active", ""); else btn.removeAttribute("data-active");
  }, { passive: true });

  listEl.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    const card = e.target.closest(".post-card");
    if (!card) return;
    const { id } = card.dataset;
    if (id) location.href = postUrl(id);
  });

  const formEl = document.querySelector("#create-form");
  formEl?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = formEl.querySelector('[type="submit"]');
    if (btn) btn.disabled = true;
    Spinner.show();

    try {
      const fd = new FormData(formEl);
      const title = String(fd.get("title") || "").trim();
      const body  = String(fd.get("body")  || "").trim();
      const tags  = String(fd.get("tags")  || "").split(",").map(t => t.trim()).filter(Boolean);
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
      const footer = listEl.querySelector('[data-loadmore]');
      if (footer) listEl.insertBefore(wrap.firstElementChild, footer);
      else listEl.prepend(wrap.firstElementChild);

      formEl.reset();
    } catch (err) {
      alert(err?.data?.errors?.[0]?.message || err?.message || "Create failed");
      console.error(err);
    } finally {
      if (btn) btn.disabled = false;
      Spinner.hide();
    }
  });
});