import { requireAuth } from "../../utils/guards.js";
import { mountNavbar } from "../../components/navbar.js";
import * as Profiles from "../../services/profiles.js";
import * as Posts from "../../services/posts.js";
import { store } from "../../state/store.js";

requireAuth();
mountNavbar(document.querySelector("#nav"));

const head = document.querySelector("#user-head");
const list = document.querySelector("#user-posts");

const params = new URLSearchParams(location.search);
const target = params.get("u") || store.user?.name;
if (!target) location.replace("../login/login.html");

load();

async function load() {
  head.innerHTML = "<div class='card'>Loading…</div>";
  list.innerHTML = "";

  const [profile, me] = await Promise.all([
    Profiles.get(target, { _followers: true, _following: true }),
    Profiles.get(store.user.name, { _following: true })
  ]);

  const mine = store.user?.name === target;
  const iFollow = !!me?.following?.some(f => f?.name === target);

  head.classList.add("profile-hero");
  head.innerHTML = `
    <div class="row">
      <img class="avatar" src="${esc(profile?.avatar?.url || "")}" alt="${esc(profile?.avatar?.alt || profile?.name || "avatar")}" onerror="this.style.display='none'"/>
      <div>
        <div class="handle">@${esc(profile?.name || "")}</div>
        <p class="bio">${esc(profile?.bio || "")}</p>
        <small class="muted">${(profile?._count?.posts ?? 0)} posts · ${(profile?._count?.followers ?? 0)} followers · ${(profile?._count?.following ?? 0)} following</small>
      </div>
      ${mine ? "" : `
        <div class="actions">
          <button id="follow-btn" class="btn ${iFollow ? "" : "primary"}">${iFollow ? "Unfollow" : "Follow"}</button>
        </div>`}
    </div>
  `;

  if (!mine) {
    head.querySelector("#follow-btn")?.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        if (btn.textContent === "Follow") { await Profiles.follow(target); btn.textContent = "Unfollow"; btn.classList.remove("primary"); }
        else { await Profiles.unfollow(target); btn.textContent = "Follow"; btn.classList.add("primary"); }
      } catch (err) {
        alert(err?.data?.message || "Follow action failed");
      } finally { btn.disabled = false; }
    });
  }

  const items = await Profiles.posts(target, { limit: 30 });
  if (!items.length) { list.innerHTML = `<p class="muted">No posts yet.</p>`; return; }

  list.innerHTML = items.map(postCard).join("");
  list.querySelectorAll(".post-card").forEach(el => {
    el.addEventListener("click", () => location.href = `../post/post.html?id=${el.dataset.id}`);
  });
}

function postCard(p) {
  return `<article class="post-card" data-id="${p.id}">
    <h3>${esc(p?.title || "(untitled)")}</h3>
    <p>${esc(String(p?.body || "").slice(0,140))}</p>
    <div class="meta"><small>${p?.created ? new Date(p.created).toLocaleDateString() : ""}</small></div>
  </article>`;
}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}