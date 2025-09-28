import { requireAuth } from "../../utils/guards.js";
import { mountNavbar } from "../../components/navbar.js";
import * as Profiles from "../../services/profiles.js";
import { store } from "../../state/store.js";
import { pagerHTML, wirePager } from "../../components/pagination.js";
import { ready, esc } from "../../utils/dom.js";
import { ensureApiKey } from "../../services/auth.js";

requireAuth();

const PAGE_SIZE = 3;
let CURRENT_PAGE = 1;
let CURRENT_TARGET = null;

ready(init);

async function init() {
  const head = document.querySelector("#user-head");
  const list = document.querySelector("#user-posts");
  if (!head || !list) return;

  mountNavbar(document.querySelector("#nav"));
  try { await ensureApiKey(); } catch {}

  const params = new URLSearchParams(location.search);
  const target = params.get("u") || store?.user?.name;
  if (!target) { renderError(head, "No profile selected. Please log in or provide ?u=<username>."); return; }

  CURRENT_TARGET = target;

  list.addEventListener("click", (e) => onCardClick(e, list));
  window.addEventListener("reactions:update", (e) => onReactionsUpdate(e, list), { passive: true });

  try {
    await loadProfile(head, target);
    await loadPosts(list, target, 1);
  } catch (e) {
    renderError(head, msg(e));
    console.error("profile load error:", e);
  }
}

async function loadProfile(head, target) {
  head.innerHTML = "<div class='card'>Loading…</div>";

  const meName = store?.user?.name || null;

  const [profile, me] = await Promise.all([
    Profiles.get(target, { _followers: true, _following: true, _count: true }),
    meName ? Profiles.get(meName, { _following: true }) : Promise.resolve(null),
  ]);

  const mine = meName === target;

  const {
    _count: {
      followers: followersInit = 0,
      posts: postsCount = 0,
      following: followingCount = 0,
    } = {},
    avatar = {},
    name: profileName = "",
    bio = "",
  } = profile || {};

  let followersCount = followersInit;
  const iFollow = !!me?.following?.some(({ name }) => name === target);

  head.classList.add("profile-hero");
  head.innerHTML = `
    <div class="row">
      <div class="avatar-wrap">
        <img id="avatar-img" class="avatar"
             src="${esc(avatar.url || "")}"
             alt="${esc(avatar.alt || profileName || "avatar")}"
             onerror="this.style.display='none'"/>
        ${mine ? `<button id="edit-avatar" class="btn small" type="button" style="margin-top:.5rem">Change avatar</button>` : ""}
      </div>
      <div>
        <div class="handle">@${esc(profileName)}</div>
        <p class="bio">${esc(bio)}</p>
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

  if (mine) {
    const btnEdit   = head.querySelector("#edit-avatar");
    const form      = head.querySelector("#avatar-form");
    const inputUrl  = head.querySelector("#avatar-url");
    const inputAlt  = head.querySelector("#avatar-alt");
    const btnCancel = head.querySelector("#avatar-cancel");
    const imgEl     = head.querySelector("#avatar-img");

    btnEdit?.addEventListener("click", () => {
      inputUrl.value = avatar.url || "";
      inputAlt.value = avatar.alt || "";
      form.hidden = false;
      inputUrl.focus();
    });

    btnCancel?.addEventListener("click", () => { form.hidden = true; });

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const url = String(inputUrl.value || "").trim();
      const alt = String(inputAlt.value || "").trim();
      if (!/^https?:\/\//i.test(url)) { alert("Image URL must start with http(s)://"); inputUrl.focus(); return; }

      const prevSrc = imgEl?.src || "";
      const prevAlt = imgEl?.alt || "";
      if (imgEl) { imgEl.style.display = ""; imgEl.src = url; imgEl.alt = alt || (profileName || "avatar"); }

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

  if (!mine) {
    const btn = head.querySelector("#follow-btn");
    btn?.addEventListener("click", async () => {
      if (!btn) return;

      btn.disabled = true;
      const wasFollowing = btn.textContent.trim() === "Unfollow";
      const nextFollowing = !wasFollowing;

      btn.textContent = nextFollowing ? "Unfollow" : "Follow";
      btn.classList.toggle("primary", !nextFollowing);

      const statsEl = head.querySelector(".stats");
      const prevFollowers = followersCount;
      followersCount = Math.max(0, followersCount + (nextFollowing ? 1 : -1));
      if (statsEl) statsEl.textContent =
        `${postsCount} posts · ${followersCount} followers · ${followingCount} following`;

      try {
        try { await ensureApiKey(); } catch {}
        if (nextFollowing) await Profiles.follow(target);
        else await Profiles.unfollow(target);

        window.dispatchEvent(new CustomEvent("profile:follow", {
          detail: { name: target, following: nextFollowing }
        }));
      } catch (err) {
        followersCount = prevFollowers;
        if (statsEl) statsEl.textContent =
          `${postsCount} posts · ${followersCount} followers · ${followingCount} following`;
        btn.textContent = wasFollowing ? "Unfollow" : "Follow";
        btn.classList.toggle("primary", !wasFollowing);

        const m = err?.data?.errors?.[0]?.message || err?.data?.message || err?.message || "Follow failed";
        alert(m);
        console.error("follow error:", err);
      } finally {
        btn.disabled = false;
      }
    });
  }
}

async function loadPosts(list, target, page) {
  CURRENT_PAGE = Math.max(1, page);
  list.innerHTML = "<div class='card'>Loading posts…</div>";

  const items = await Profiles.posts(target, {
    page: CURRENT_PAGE,
    limit: PAGE_SIZE,
    _reactions: true,
    _count: true,
    _author: true,
  });

  const hasPrev = CURRENT_PAGE > 1;
  const hasNext = Array.isArray(items) && items.length === PAGE_SIZE;

  if (!items?.length) {
    list.innerHTML = `<p class="muted">No posts yet.</p>${pagerHTML(CURRENT_PAGE, { hasPrev, hasNext: false })}`;
    wirePager(list, {
      onPrev: () => loadPosts(list, target, CURRENT_PAGE - 1),
      onNext: () => loadPosts(list, target, CURRENT_PAGE + 1),
    });
    return;
  }

  const cards = items.map(postCard).join("");
  list.innerHTML = `${cards}${pagerHTML(CURRENT_PAGE, { hasPrev, hasNext })}`;

  wirePager(list, {
    onPrev: () => loadPosts(list, target, CURRENT_PAGE - 1),
    onNext: () => loadPosts(list, target, CURRENT_PAGE + 1),
  });
}

function onCardClick(e, list) {
  if (e.target.closest("a")) return;
  const card = e.target.closest(".post-card");
  if (!card) return;
  const { id } = card.dataset;
  location.href = `../post/post.html?id=${id}`;
}

function onReactionsUpdate(e, list) {
  const { detail = {} } = e;
  const { postId = "", symbol = "", delta = 0, active = false } = detail;
  if (!postId || !symbol || !delta) return;

  const card = list.querySelector(`.post-card[data-id="${cssEscape(String(postId))}"]`);
  if (!card) return;
  const wrap = card.querySelector(`.reactions[data-post="${cssEscape(String(postId))}"]`);
  if (!wrap) return;
  const btn  = wrap.querySelector(`.react-btn[data-sym="${cssEscape(String(symbol))}"]`);
  if (!btn) return;

  const cntEl = btn.querySelector(".cnt");
  const prev = parseInt(btn.dataset.count || cntEl?.textContent || "0", 10) || 0;
  const next = Math.max(0, prev + Number(delta));

  btn.dataset.count = String(next);
  if (cntEl) cntEl.textContent = String(next);
  if (active) btn.setAttribute("data-active", ""); else btn.removeAttribute("data-active");
}

function postCard(p) {
  const { id, title = "(untitled)", body = "", created, media } = p || {};
  const createdAt = created ? new Date(created) : null;

  const mediaHTML = media?.url
    ? `<div class="media"><img src="${esc(media.url)}" alt="${esc(media.alt || title)}" loading="lazy"></div>`
    : "";

  const reactionsHTML = window.Reactions?.renderBar?.(p, { viewOnly: true }) || "";

  return `<article class="post-card" data-id="${id}">
    ${mediaHTML}
    <h3>${esc(title)}</h3>
    ${body ? `<p>${esc(body).slice(0, 140)}</p>` : ""}
    ${reactionsHTML}
    <div class="meta"><small>${createdAt ? createdAt.toLocaleDateString() : ""}</small></div>
  </article>`;
}

const cssEscape = (str) => (window.CSS && CSS.escape ? CSS.escape(str) : String(str).replace(/"/g, '\\"'));
function renderError(container, t){ if (container) container.innerHTML = `<div class="card error">${esc(t)}</div>`; }
function msg(e){ return e?.data?.errors?.[0]?.message || e?.message || "Something went wrong."; }