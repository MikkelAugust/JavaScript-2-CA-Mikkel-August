import { requireAuth } from "../../utils/guards.js";
import { mountNavbar } from "../../components/navbar.js";
import * as Profiles from "../../services/profiles.js";
import { store } from "../../state/store.js";
import { CONFIG } from "../../app/config.js";
import { pagerHTML, wirePager } from "../../components/pagination.js";

requireAuth();

const head = document.querySelector("#user-head");
const list = document.querySelector("#user-posts");

const PAGE_SIZE = 3;
let CURRENT_PAGE = 1;
let CURRENT_TARGET = null;

ready(init);

async function init() {
  mountNavbar(document.querySelector("#nav"));

  const params = new URLSearchParams(location.search);
  const target = params.get("u") || store?.user?.name;
  if (!target) { renderError("No profile selected. Please log in or provide ?u=<username>."); return; }

  CURRENT_TARGET = target;
  try {
    await loadProfile(target);
    await loadPosts(target, 1); // page 1 initially
  } catch (e) {
    renderError(msg(e));
    console.error("profile load error:", e);
  }
}

async function loadProfile(target) {
  head.innerHTML = "<div class='card'>Loading…</div>";

  const meName = store?.user?.name || null;

  const [profile, me] = await Promise.all([
    Profiles.get(target, { _followers: true, _following: true, _count: true }),
    meName ? Profiles.get(meName, { _following: true }) : Promise.resolve(null)
  ]);

  const mine = meName === target;
  let followersCount   = profile?._count?.followers  ?? 0;
  const postsCount     = profile?._count?.posts      ?? 0;
  const followingCount = profile?._count?.following  ?? 0;
  const iFollow = !!me?.following?.some(f => f?.name === target);

  head.classList.add("profile-hero");
  head.innerHTML = `
    <div class="row">
      <div class="avatar-wrap">
        <img id="avatar-img" class="avatar" src="${esc(profile?.avatar?.url || "")}" alt="${esc(profile?.avatar?.alt || profile?.name || "avatar")}" onerror="this.style.display='none'"/>
        ${mine ? `<button id="edit-avatar" class="btn small" type="button" style="margin-top:.5rem">Change avatar</button>` : ""}
      </div>
      <div>
        <div class="handle">@${esc(profile?.name || "")}</div>
        <p class="bio">${esc(profile?.bio || "")}</p>
        <small class="muted stats">${postsCount} posts · ${followersCount} followers · ${followingCount} following</small>

        ${mine ? `
        <form id="avatar-form" class="row" hidden style="margin-top:.75rem;display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
          <input id="avatar-url" type="url" placeholder="https://image.url" required style="flex:1 1 280px;min-width:220px">
          <input id="avatar-alt" type="text" placeholder="Alt text (optional)" style="flex:1 1 200px;min-width:180px">
          <button class="btn primary" type="submit">Save</button>
          <button class="btn" id="avatar-cancel" type="button">Cancel</button>
        </form>` : ``}
      </div>

      ${mine ? "" : `
        <div class="actions">
          <button id="follow-btn" class="btn ${iFollow ? "" : "primary"}">${iFollow ? "Unfollow" : "Follow"}</button>
        </div>`}
    </div>
  `;

  // avatar edit wiring (only mine)
  if (mine) {
    const btnEdit   = head.querySelector("#edit-avatar");
    const form      = head.querySelector("#avatar-form");
    const inputUrl  = head.querySelector("#avatar-url");
    const inputAlt  = head.querySelector("#avatar-alt");
    const btnCancel = head.querySelector("#avatar-cancel");
    const imgEl     = head.querySelector("#avatar-img");

    btnEdit?.addEventListener("click", () => {
      inputUrl.value = profile?.avatar?.url || "";
      inputAlt.value = profile?.avatar?.alt || "";
      form.hidden = false;
      inputUrl.focus();
    });

    btnCancel?.addEventListener("click", () => {
      form.hidden = true;
    });

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const url = String(inputUrl.value || "").trim();
      const alt = String(inputAlt.value || "").trim();
      if (!/^https?:\/\//i.test(url)) { alert("Image URL must start with http(s)://"); inputUrl.focus(); return; }

      const hasToken = !!localStorage.getItem(CONFIG.STORAGE.TOKEN);
      const hasKey   = !!localStorage.getItem(CONFIG.STORAGE.API_KEY);
      if (!hasToken || !hasKey) { alert("Missing token or API key. Log in and create an API key."); return; }

      const prevSrc = imgEl?.src || "";
      const prevAlt = imgEl?.alt || "";
      if (imgEl) { imgEl.style.display = ""; imgEl.src = url; imgEl.alt = alt || (profile?.name || "avatar"); }

      try {
        await Profiles.update(target, { avatar: { url, alt } });
        form.hidden = true;
        try {
          if (store.user?.name === target) {
            store.user.avatar = { url, alt };
            localStorage.setItem("user", JSON.stringify(store.user));
          }
        } catch {}
      } catch (err) {
        if (imgEl) { imgEl.src = prevSrc; imgEl.alt = prevAlt; }
        alert(`[${err?.status ?? "ERR"}] ${msg(err)}`);
        console.error("avatar update error:", err);
      }
    });
  }

  // follow/unfollow (only if not mine)
  if (!mine) {
    const btn = head.querySelector("#follow-btn");
    btn?.addEventListener("click", async () => {
      if (!btn) return;

      const hasToken = !!localStorage.getItem(CONFIG.STORAGE.TOKEN);
      const hasKey   = !!localStorage.getItem(CONFIG.STORAGE.API_KEY);
      if (!hasToken || !hasKey) { alert("Missing token or API key. Log in and create an API key."); return; }

      btn.disabled = true;

      const wasFollowing = btn.textContent.trim() === "Unfollow";
      const nextFollowing = !wasFollowing;

      btn.textContent = nextFollowing ? "Unfollow" : "Follow";
      btn.classList.toggle("primary", !nextFollowing);

      const statsEl = head.querySelector(".stats");
      const prevFollowers = followersCount;
      followersCount = Math.max(0, followersCount + (nextFollowing ? 1 : -1));
      if (statsEl) statsEl.textContent = `${postsCount} posts · ${followersCount} followers · ${followingCount} following`;

      try {
        if (nextFollowing) await Profiles.follow(target); else await Profiles.unfollow(target);
        window.dispatchEvent(new CustomEvent("profile:follow", { detail: { name: target, following: nextFollowing } }));
      } catch (err) {
        followersCount = prevFollowers;
        if (statsEl) statsEl.textContent = `${postsCount} posts · ${followersCount} followers · ${followingCount} following`;
        btn.textContent = wasFollowing ? "Unfollow" : "Follow";
        btn.classList.toggle("primary", !wasFollowing);
        alert(`[${err?.status ?? "ERR"}] ${msg(err)}`);
        console.error("follow error:", err);
      } finally {
        btn.disabled = false;
      }
    });
  }
}

/** Load posts for target at a specific page (pager UI comes from components/pagination.js) */
async function loadPosts(target, page) {
  CURRENT_PAGE = Math.max(1, page);
  list.innerHTML = "<div class='card'>Loading posts…</div>";

  const items = await Profiles.posts(target, {
    page: CURRENT_PAGE,
    limit: PAGE_SIZE,
    _reactions: true,
    _count: true,
    _author: true
  });

  const hasPrev = CURRENT_PAGE > 1;
  const hasNext = Array.isArray(items) && items.length === PAGE_SIZE;

  if (!items?.length) {
    list.innerHTML = `<p class="muted">No posts yet.</p>${pagerHTML(CURRENT_PAGE, { hasPrev, hasNext: false })}`;
    wirePager(list, {
      onPrev: () => loadPosts(target, CURRENT_PAGE - 1),
      onNext: () => loadPosts(target, CURRENT_PAGE + 1),
    });
    return;
  }

  const cards = items.map(postCard).join("");
  list.innerHTML = `${cards}${pagerHTML(CURRENT_PAGE, { hasPrev, hasNext })}`;

  list.addEventListener("click", onCardClick);
  window.addEventListener("reactions:update", onReactionsUpdate, { passive: true });

  wirePager(list, {
    onPrev: () => loadPosts(target, CURRENT_PAGE - 1),
    onNext: () => loadPosts(target, CURRENT_PAGE + 1),
  });
}

function onCardClick(e) {
  if (e.target.closest("a")) return;
  const card = e.target.closest(".post-card");
  if (!card) return;
  location.href = `../post/post.html?id=${card.dataset.id}`;
}

function onReactionsUpdate(e) {
  const d = e.detail || {};
  const postId = String(d.postId ?? "");
  const symbol = String(d.symbol ?? "");
  const delta  = Number(d.delta ?? 0);
  const active = !!d.active;
  if (!postId || !symbol || !delta) return;

  const card = list.querySelector(`.post-card[data-id="${cssEscape(postId)}"]`);
  if (!card) return;
  const wrap = card.querySelector(`.reactions[data-post="${cssEscape(postId)}"]`);
  if (!wrap) return;
  const btn  = wrap.querySelector(`.react-btn[data-sym="${cssEscape(symbol)}"]`);
  if (!btn) return;

  const cntEl = btn.querySelector(".cnt");
  const prev = parseInt(btn.dataset.count || cntEl?.textContent || "0", 10) || 0;
  const next = Math.max(0, prev + delta);

  btn.dataset.count = String(next);
  if (cntEl) cntEl.textContent = String(next);
  if (active) btn.setAttribute("data-active", ""); else btn.removeAttribute("data-active");
}

function postCard(p) {
  const title   = String(p?.title || "(untitled)");
  const body    = String(p?.body || "");
  const created = p?.created ? new Date(p.created) : null;

  const media = p?.media?.url
    ? `<div class="media"><img src="${esc(p.media.url)}" alt="${esc(p.media.alt || title)}" loading="lazy"></div>`
    : "";

  const reactionsHTML = (window.Reactions?.renderBar?.(p, { viewOnly: true })) || "";

  return `<article class="post-card" data-id="${p.id}">
    ${media}
    <h3>${esc(title)}</h3>
    ${body ? `<p>${esc(body).slice(0,140)}</p>` : ""}
    ${reactionsHTML}
    <div class="meta"><small>${created ? created.toLocaleDateString() : ""}</small></div>
  </article>`;
}

/* utils */
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
const cssEscape = (str) => (window.CSS && CSS.escape ? CSS.escape(str) : String(str).replace(/"/g, '\\"'));
function ready(fn){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",fn):fn();}
function renderError(t){ head.innerHTML = `<div class="card error">${esc(t)}</div>`; }
function msg(e){ return e?.data?.errors?.[0]?.message || e?.message || "Something went wrong."; }