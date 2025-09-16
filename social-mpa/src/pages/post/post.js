// src/pages/post/post.js
import { requireAuth } from "../../utils/guards.js";
import { mountNavbar } from "../../components/navbar.js";
import * as Posts from "../../services/posts.js";
import { store } from "../../state/store.js";

requireAuth();
mountNavbar(document.querySelector("#nav"));

const root = document.querySelector("#post-root");
const id = new URLSearchParams(location.search).get("id");
if (!id) window.location.replace("../feed/feed.html");

function esc(s){return String(s).replace(/[&<>"']/g,m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}

async function load() {
  try {
    const p = await Posts.get(id); // includes author
    const author = p?.author?.name || "unknown";
    const owner = author === store.user?.name;

    root.innerHTML = `
      <article class="prose">
        <h1 ${owner ? 'contenteditable="true"' : ""}>${esc(p?.title || "(untitled)")}</h1>
        <p ${owner ? 'contenteditable="true"' : ""}>${esc(p?.body || "")}</p>
        <small>by <a href="../profile/profile.html?u=${encodeURIComponent(author)}">@${author}</a></small>
        ${owner ? `
          <div class="row" style="margin-top:1rem;display:flex;gap:.75rem;">
            <button id="save" class="btn primary">Save</button>
            <button id="delete" class="btn danger">Delete</button>
          </div>` : ``}
      </article>`;

    if (owner) {
      root.querySelector("#save").onclick = async () => {
        const title = root.querySelector("h1").innerText.trim();
        const body = root.querySelector("p").innerText.trim();
        await Posts.update(id, { title, body });
        load();
      };
      root.querySelector("#delete").onclick = async () => {
        await Posts.remove(id);
        window.location.replace("../feed/feed.html");
      };
    }
  } catch (e) {
    console.error(e);
    root.innerHTML = `<p>Could not load this post.</p>`;
  }
}

load();
