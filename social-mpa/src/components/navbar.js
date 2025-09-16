import { logout } from "../services/auth.js";
import { store } from "../state/store.js";

export function mountNavbar(root) {
  const me = store.user || {};
  const section = location.pathname.includes("/profile/") ? "profile"
                : location.pathname.includes("/feed/") ? "feed"
                : "";

  root.innerHTML = `
    <nav class="nav">
      <div class="container nav-bar">
        <a class="brand" href="../feed/feed.html">
          <span class="logo">B</span><span class="word">.log</span>
        </a>

        <button class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="nav-menu" aria-label="Menu">
          <span class="nav-burger"></span>
        </button>

        <div class="nav-menu" id="nav-menu">
          <div class="nav-left">
            <a class="nav-link ${section==="feed"?"active":""}" href="../feed/feed.html">Feed</a>
            <a class="nav-link ${section==="profile"?"active":""}" href="../profile/profile.html">Profile</a>
          </div>

          <form id="nav-search" class="nav-search" role="search">
            <input name="q" placeholder="Search posts" value="${new URLSearchParams(location.search).get("q")||""}" />
          </form>

          <div class="nav-actions">
            <details class="nav-user">
              <summary>@${me.name || "user"}</summary>
              <div class="menu">
                <a href="../profile/profile.html">My profile</a>
                <button type="button" id="logout-btn" class="linklike">Logout</button>
              </div>
            </details>
          </div>
        </div>
      </div>
    </nav>
  `;

  root.querySelector("#nav-search")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = new FormData(e.currentTarget).get("q");
    const url = new URL("../feed/feed.html", location.href);
    if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
    location.href = url;
  });

  root.querySelector("#logout-btn")?.addEventListener("click", () => {
    logout();
    location.replace("../login/login.html");
  });

  const toggle = root.querySelector("#nav-toggle");
  const menu = root.querySelector("#nav-menu");
  toggle?.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    menu.classList.toggle("open", !open);
  });
}