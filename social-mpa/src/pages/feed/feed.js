// src/pages/feed/feed.js  (search + render tidy)
import { requireAuth } from "../../utils/guards.js";
import { mountNavbar } from "../../components/navbar.js";
import * as Posts from "../../services/posts.js";
import { store } from "../../state/store.js";

requireAuth();
mountNavbar(document.querySelector("#nav"));

const listEl = document.querySelector("#feed-list");
const createForm = document.querySelector("#create-form");
const params = new URLSearchParams(location.search);
const q = params.get("q") || "";
const mine = params.get("mine") === "1";

async function load() {
  listEl.innerHTML = "<p>Loading…</p>";
  try {
    let items = await Posts.list({ q, limit: 24 });
    if (mine) items = items.filter(p => p?.author?.name === store.user?.name);
    listEl.innerHTML = items.map(postCard).join("") || "<p>No posts.</p>";
    listEl.querySelectorAll(".post-card").forEach(el => {
      el.addEventListener("click", () => location.href = `../post/post.html?id=${el.dataset.id}`);
    });
  } catch (e) {
    console.error(e);
    listEl.innerHTML = "<p>Error loading feed.</p>";
  }
}

function postCard(p) {
  const author = p?.author?.name || "unknown";
  const title = String(p?.title || "(untitled)");
  const body = String(p?.body || "");
  const created = p?.created ? new Date(p.created) : null;
  return `<article class="post-card" data-id="${p.id}">
    <h3>${esc(title)}</h3>
    <p>${esc(body).slice(0,160)}</p>
    <div class="meta">
      <small><a href="../profile/profile.html?u=${encodeURIComponent(author)}">@${esc(author)}</a></small>
      <span class="dot"></span><small>${created ? created.toLocaleDateString() : ""}</small>
    </div>
  </article>`;
}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}

createForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = createForm.querySelector('[type="submit"]');
  btn.disabled = true;
  try {
    const payload = Object.fromEntries(new FormData(createForm)); // {title, body}
    await Posts.create(payload);
    createForm.reset();
    await load();
  } catch { alert("Create failed"); }
  finally { btn.disabled = false; }
});

load();
