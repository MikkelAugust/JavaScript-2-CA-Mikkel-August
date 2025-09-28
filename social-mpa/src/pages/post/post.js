import { requireAuth } from "../../utils/guards.js";
import { mountNavbar } from "../../components/navbar.js";
import * as Posts from "../../services/posts.js";
import { store } from "../../state/store.js";
import Spinner from "../../components/spinner.js";
import { api } from "../../services/apiClient.js";
import { ready, esc } from "../../utils/dom.js";
import { ensureApiKey } from "../../services/auth.js";
import { CONFIG } from "../../app/config.js";

requireAuth();

const FEED_URL = new URL("../feed/feed.html", import.meta.url).href;
const PROFILE_BASE = new URL("../profile/profile.html", import.meta.url);
const profileUrl = (name) => { const u = new URL(PROFILE_BASE); u.searchParams.set("u", name); return u.href; };

const EMOJI = ["👍", "❤️", "😂", "😮", "😢", "🔥"];
const { ENDPOINTS: { SOCIAL: { POSTS } } } = CONFIG;

const getLocalUserReactions = (postId) => {
  const key = `reactions:${postId}`;
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); }
  catch { return new Set(); }
};
const setLocalUserReactions = (postId, set) => {
  localStorage.setItem(`reactions:${postId}`, JSON.stringify([...set]));
};
const getDeltas = (postId) => {
  const key = `reactions:delta:${postId}`;
  try { return JSON.parse(localStorage.getItem(key) || "{}") || {}; }
  catch { return {}; }
};
const setDeltas = (postId, d) => {
  localStorage.setItem(`reactions:delta:${postId}`, JSON.stringify(d));
};

async function sendReaction(postId, symbol, currentlyReacted) {
  try {
    const method = currentlyReacted ? "del" : "put";
    await api[method](`${POSTS}/${encodeURIComponent(postId)}/react/${encodeURIComponent(symbol)}`);
  } catch { }
}

function renderReactionsBarLocal(post) {
  const baseCounts = new Map();
  if (Array.isArray(post.reactions)) for (const r of post.reactions) baseCounts.set(r.symbol, r.count);
  for (const e of EMOJI) if (!baseCounts.has(e)) baseCounts.set(e, 0);

  const user = getLocalUserReactions(post.id);
  const deltas = getDeltas(post.id);

  const btns = EMOJI.map((sym) => {
    const base = Number.isFinite(baseCounts.get(sym)) ? baseCounts.get(sym) : 0;
    const delta = Number.isFinite(deltas[sym]) ? deltas[sym] : 0;
    const shown = Math.max(0, base + delta);
    const active = user.has(sym);
    return `<button class="react-btn" data-sym="${sym}" data-count="${shown}" ${active ? "data-active" : ""} aria-pressed="${active}">
      <span class="sym">${sym}</span><span class="cnt">${shown}</span>
    </button>`;
  }).join("");

  return `<div class="reactions" data-post="${post.id}" role="group" aria-label="Reactions">${btns}</div>`;
}

function wireReactionsLocal(root) {
  root.addEventListener("click", async (e) => {
    const btn = e.target.closest(".react-btn");
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();

    const wrap = btn.closest(".reactions");
    if (!wrap) return;

    const { post: postId } = wrap.dataset;
    const { sym } = btn.dataset;

    let prev = Number.parseInt(btn.dataset.count ?? "", 10);
    if (!Number.isFinite(prev)) prev = Number.parseInt(btn.querySelector(".cnt")?.textContent ?? "0", 10) || 0;

    const wasActive = btn.hasAttribute("data-active");
    const delta = wasActive ? -1 : 1;
    const next = Math.max(0, prev + delta);

    // optimistic update
    btn.dataset.count = String(next);
    btn.querySelector(".cnt").textContent = String(next);
    btn.toggleAttribute("data-active");
    btn.setAttribute("aria-pressed", String(!wasActive));

    const sel = getLocalUserReactions(postId);
    if (wasActive) sel.delete(sym); else sel.add(sym);
    setLocalUserReactions(postId, sel);

    const deltas = getDeltas(postId);
    const cur = Number.isFinite(deltas[sym]) ? deltas[sym] : 0;
    deltas[sym] = cur + delta;
    setDeltas(postId, deltas);

    window.dispatchEvent(new CustomEvent("reactions:update", {
      detail: { postId, symbol: sym, delta, active: !wasActive }
    }));

    try { await sendReaction(postId, sym, wasActive); } catch { }
  });
}

ready(async () => {
  mountNavbar(document.querySelector("#nav"));
  try { await ensureApiKey(); } catch { }

  const root = document.querySelector("#post-root");
  if (!root) return;

  const id = new URLSearchParams(location.search).get("id");
  if (!id) { Spinner.show(); location.replace(FEED_URL); return; }

  function setEditing(enabled) {
    const t = root.querySelector("h1");
    const b = root.querySelector("p[data-body]");
    t?.setAttribute("contenteditable", String(enabled));
    b?.setAttribute("contenteditable", String(enabled));
    root.querySelector("#edit")?.toggleAttribute("hidden", enabled);
    root.querySelector("#save")?.toggleAttribute("hidden", !enabled);
    root.querySelector("#cancel")?.toggleAttribute("hidden", !enabled);
    if (enabled) t?.focus();
  }

  async function load() {
    Spinner.show();
    try {
      const p = await Posts.get(id);
      const { title = "(untitled)", body = "", media, author = {} } = p || {};
      const { name: authorName = "unknown" } = author;
      const owner = authorName === store.user?.name;

      const imgBlock = media?.url
        ? `<figure style="margin:.75rem 0">
             <img src="${esc(media.url)}" alt="${esc(media.alt || title)}" loading="eager" style="max-width:100%;height:auto;display:block;border-radius:.5rem">
             ${media?.alt ? `<figcaption class="muted" style="font-size:.9rem">${esc(media.alt)}</figcaption>` : ""}
           </figure>` : "";

      const reactionsHTML = renderReactionsBarLocal(p);

      root.innerHTML = `
        <article class="prose">
          <h1 contenteditable="false">${esc(title)}</h1>
          ${imgBlock}
          <p data-body contenteditable="false">${esc(body)}</p>
          ${reactionsHTML}
          <small>by ${authorName !== "unknown" ? `<a href="${profileUrl(authorName)}">@${esc(authorName)}</a>` : "@unknown"}</small>
          ${owner ? `
            <div class="row" style="margin-top:1rem;display:flex;gap:.5rem;flex-wrap:wrap">
              <button id="edit" class="btn">Edit</button>
              <button id="save" class="btn primary" hidden>Save</button>
              <button id="cancel" class="btn" hidden>Cancel</button>
              <button id="delete" class="btn danger">Delete</button>
            </div>` : ""}
        </article>`;

      wireReactionsLocal(root);

      if (owner) {
        const elEdit = root.querySelector("#edit");
        const elSave = root.querySelector("#save");
        const elCancel = root.querySelector("#cancel");
        const elDelete = root.querySelector("#delete");

        elEdit?.addEventListener("click", () => setEditing(true));
        elCancel?.addEventListener("click", async () => { await load(); });

        elSave?.addEventListener("click", async () => {
          Spinner.show();
          try {
            const newTitle = root.querySelector("h1").innerText.trim();
            const newBody = root.querySelector("p[data-body]").innerText.trim();
            await Posts.update(id, { title: newTitle, body: newBody });
            await load();
          } catch { alert("Save failed"); }
          finally { Spinner.hide(); }
        });

        elDelete?.addEventListener("click", async () => {
          if (!confirm("Delete this post?")) return;
          Spinner.show();
          try {
            await Posts.remove(id);
            location.replace(FEED_URL);
          } catch { alert("Delete failed"); }
          finally { Spinner.hide(); }
        });
      }
    } catch (e) {
      console.error(e);
      root.innerHTML = `<p>Could not load this post.</p>`;
    } finally {
      Spinner.hide();
    }
  }

  load();
});