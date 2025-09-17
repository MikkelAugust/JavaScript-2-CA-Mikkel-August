import { requireAuth } from "../../utils/guards.js";
import { mountNavbar } from "../../components/navbar.js";
import * as Posts from "../../services/posts.js";
import { store } from "../../state/store.js";
import Spinner from "../../components/spinner.js";

requireAuth();
mountNavbar(document.querySelector("#nav"));

const listEl = document.querySelector("#feed-list");
const createForm = document.querySelector("#create-form");
const params = new URLSearchParams(location.search);
const q = params.get("q") || "";
const mine = params.get("mine") === "1";

async function load() {
  listEl.innerHTML = "<p>Loading…</p>";
  Spinner.show();
  try {
    let items = await Posts.list({ q, limit: 24 });
    if (mine) items = items.filter(p => p?.author?.name === store.user?.name);
    listEl.innerHTML = items.map(postCard).join("") || "<p>No posts.</p>";
    listEl.querySelectorAll(".post-card").forEach(el => {
      el.addEventListener("click", () => location.href = postUrl(el.dataset.id));
    });
  } catch (e) {
    console.error(e);
    listEl.innerHTML = "<p>Error loading feed.</p>";
  } finally {
    Spinner.hide();
  }
}

const POST_BASE    = new URL("../post/post.html", import.meta.url);
const PROFILE_BASE = new URL("../profile/profile.html", import.meta.url);
const postUrl = (id) => { const u = new URL(POST_BASE); u.searchParams.set("id", id); return u.href; };
const profileUrl = (name) => { const u = new URL(PROFILE_BASE); u.searchParams.set("u", name); return u.href; };

function postCard(p) {
  const author = p?.author?.name || "unknown";
  const title = String(p?.title || "(untitled)");
  const body = String(p?.body || "");
  const created = p?.created ? new Date(p.created) : null;
  const authorLink = author !== "unknown" ? profileUrl(author) : "#";
  return `<article class="post-card" data-id="${p.id}">
    <h3>${esc(title)}</h3>
    <p>${esc(body).slice(0,160)}</p>
    <div class="meta">
      <small><a href="${authorLink}">@${esc(author)}</a></small>
      <span class="dot"></span><small>${created ? created.toLocaleDateString() : ""}</small>
    </div>
  </article>`;
}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}

createForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = createForm.querySelector('[type="submit"]');
  btn.disabled = true;
  Spinner.show();
  try {
    const payload = Object.fromEntries(new FormData(createForm));
    await Posts.create(payload);
    createForm.reset();
    await load();
  } catch {
    alert("Create failed");
  } finally {
    btn.disabled = false;
    Spinner.hide();
  }
});

load();