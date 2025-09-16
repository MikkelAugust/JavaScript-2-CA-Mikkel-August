// src/pages/home/home.js
const app = document.querySelector("#app");
const authed = !!localStorage.getItem("social.token");

const PATHS = {
  feed: "src/pages/feed/feed.html",
  login: "src/pages/login/login.html",
  register: "src/pages/register/register.html",
  profile: "src/pages/profile/profile.html",
};

// optional: redirect authenticated users
if (authed) {
  // comment this out if you want to keep a visible home
  // location.replace(PATHS.feed);
}

app.innerHTML = `
  <nav class="nav">
    <div class="container nav-bar">
      <a class="brand" href="./">
        <span class="logo">B</span><span class="word">.log</span>
      </a>

      <button class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="nav-menu" aria-label="Menu">
        <span class="nav-burger"></span>
      </button>

      <div class="nav-menu" id="nav-menu">
        <div class="nav-left">
          <a class="nav-link" href="${PATHS.feed}">Feed</a>
          <a class="nav-link" href="${PATHS.profile}">Profile</a>
        </div>

        <form id="nav-search" class="nav-search" role="search">
          <input name="q" placeholder="Search posts" />
        </form>

        <div class="nav-actions">
          ${authed
            ? `<a class="btn" href="${PATHS.feed}">Open app</a>`
            : `<a class="nav-link" href="${PATHS.login}">Login</a>
               <a class="btn primary" href="${PATHS.register}">Create account</a>`}
        </div>
      </div>
    </div>
  </nav>

  <main class="container">
    <section class="hero card">
      <h1>${authed ? "Welcome back." : "Write. Share. Connect."}</h1>
      <p class="muted">A light social blog powered by the Noroff v2 Social API.</p>
      <div class="actions">
        ${authed
          ? `<a class="btn primary" href="${PATHS.feed}">Continue to Feed</a>`
          : `<a class="btn primary" href="${PATHS.register}">Get started</a>
             <a class="btn" href="${PATHS.login}">I already have an account</a>`}
      </div>
    </section>

    <section class="features">
      ${[
        { t:"Post", d:"Create, edit, and delete posts." },
        { t:"Discover", d:"Browse the global feed and search." },
        { t:"Profiles", d:"View users and their posts." },
        { t:"Follow", d:"Follow or unfollow other users." },
      ].map(f => `
        <article class="post-card">
          <h3>${f.t}</h3>
          <p>${f.d}</p>
          <div class="meta"><small>B.log</small></div>
        </article>`).join("")}
    </section>
  </main>

  <footer class="site-foot">
    <div class="container">
      <small class="muted">© B.log</small>
      <div class="cluster">
        <a class="link" href="${PATHS.login}">Login</a>
        <a class="link" href="${PATHS.register}">Register</a>
      </div>
    </div>
  </footer>
`;

// interactions
document.querySelector("#nav-search")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = new FormData(e.currentTarget).get("q");
  const url = new URL(PATHS.feed, location.href);
  if (q) url.searchParams.set("q", q);
  location.href = url;
});
const toggle = document.querySelector("#nav-toggle");
const menu = document.querySelector("#nav-menu");
toggle?.addEventListener("click", () => {
  const open = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!open));
  menu.classList.toggle("open", !open);
});
