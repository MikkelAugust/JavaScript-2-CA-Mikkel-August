import { requireAuth } from "../../utils/guards.js";
import { mountNavbar } from "../../components/navbar.js";
import * as Posts from "../../services/posts.js";
import { store } from "../../state/store.js";
import Spinner from "../../components/spinner.js";

requireAuth();
mountNavbar(document.querySelector("#nav"));

const root = document.querySelector("#post-root");
const FEED_URL = new URL("../feed/feed.html", import.meta.url).href;
const PROFILE_BASE = new URL("../profile/profile.html", import.meta.url);

const id = new URLSearchParams(location.search).get("id");
if (!id) { Spinner.show(); location.replace(FEED_URL); }

function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}

function profileUrl(name){
  const u = new URL(PROFILE_BASE);
  u.searchParams.set("u", name);
  return u.href;
}

async function load() {
  Spinner.show();
  try {
    const p = await Posts.get(id);
    const author = p?.author?.name || "unknown";
    const owner = author === store.user?.name;

    root.innerHTML = `
      <article class="prose">
        <h1 ${owner ? 'contenteditable="true"' : ""}>${esc(p?.title || "(untitled)")}</h1>
        <p ${owner ? 'contenteditable="true"' : ""}>${esc(p?.body || "")}</p>
        <small>by <a href="${author !== "unknown" ? profileUrl(author) : "#"}">@${esc(author)}</a></small>
        ${owner ? `
          <div class="row" style="margin-top:1rem;display:flex;gap:.75rem;">
            <button id="save" class="btn primary">Save</button>
            <button id="delete" class="btn danger">Delete</button>
          </div>` : ``}
      </article>`;

    if (owner) {
      root.querySelector("#save")?.addEventListener("click", async () => {
        Spinner.show();
        try {
          const title = root.querySelector("h1").innerText.trim();
          const body  = root.querySelector("p").innerText.trim();
          await Posts.update(id, { title, body });
          await load();
        } catch { alert("Save failed"); }
        finally { Spinner.hide(); }
      });

      root.querySelector("#delete")?.addEventListener("click", async () => {
        if (!confirm("Delete this post?")) return;
        Spinner.show();
        try {
          await Posts.remove(id);
          location.replace(FEED_URL);
        } catch { Spinner.hide(); alert("Delete failed"); }
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