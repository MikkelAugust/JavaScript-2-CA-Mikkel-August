import { logout } from "../services/auth.js";
import { store } from "../state/store.js";
import { CONFIG } from "../app/config.js";

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
            <a class="nav-link ${section === "feed" ? "active" : ""}" href="../feed/feed.html">Feed</a>
            <a class="nav-link ${section === "profile" ? "active" : ""}" href="../profile/profile.html">Profile</a>
          </div>

          <form id="nav-search" class="nav-search" role="search" autocomplete="off">
            <input id="nav-q" name="q" placeholder="Search posts or authors" value="${new URLSearchParams(location.search).get("q") || ""}" aria-autocomplete="list" aria-controls="nav-suggest" aria-expanded="false" />
            <ul id="nav-suggest" class="nav-suggest" role="listbox"></ul>
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

  const qInput = root.querySelector("#nav-q");
  const suggest = root.querySelector("#nav-suggest");
  const form = root.querySelector("#nav-search");

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = new FormData(form).get("q");
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

  // --- typeahead (modern ranking like big apps) ---

const authHeaders = () => {
  const h = {};
  const t = localStorage.getItem(CONFIG.STORAGE.TOKEN);
  const k = localStorage.getItem(CONFIG.STORAGE.API_KEY);
  if (t) h.Authorization = `Bearer ${t}`;
  if (k) h["X-Noroff-API-Key"] = k;
  return h;
};
const API = (p) => `${CONFIG.API_BASE}${p}`;

function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
const deaccent = (s)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const norm = (s)=>deaccent(String(s||"").toLowerCase().trim());
const tokenize = (s)=>norm(s).split(/\s+/).filter(Boolean);

function levenshtein(a,b,cap=3){
  // small, fast, early-exit Levenshtein for fuzzy ≤ cap
  a=norm(a); b=norm(b);
  if (a===b) return 0;
  if (Math.abs(a.length-b.length)>cap) return cap+1;
  const dp = Array(b.length+1).fill(0).map((_,i)=>i);
  for(let i=1;i<=a.length;i++){
    let prev = dp[0]; dp[0]=i;
    let minRow = dp[0];
    for(let j=1;j<=b.length;j++){
      const tmp = dp[j];
      dp[j] = a[i-1]===b[j-1] ? prev : Math.min(prev+1, dp[j]+1, dp[j-1]+1);
      prev = tmp;
      if (dp[j]<minRow) minRow=dp[j];
    }
    if (minRow>cap) return cap+1; // early exit
  }
  return dp[b.length];
}

function scoreText(query, text){
  // token-based, position-aware scoring
  const q = norm(query);
  const t = norm(text);
  if (!q || !t) return 0;

  if (t===q) return 100;                    // exact
  if (t.startsWith(q)) return 85;           // prefix
  if (t.includes(q)) return 65;             // substring

  // word-wise startsWith
  const words = t.split(/\s+/);
  if (words.some(w=>w.startsWith(q))) return 75;

  // fuzzy: allow small typos
  const d = levenshtein(t,q,2);
  if (d===1) return 55;
  if (d===2) return 45;

  return 0;
}

function scoreItem(query, item){
  // blend multiple fields + recency/popularity boosts
  const NOW = Date.now();
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));

  if (item.type==="author"){
    const sName = scoreText(query, item.name);
    const sBio  = scoreText(query, item.bio||"") * 0.4;
    let score = sName*1.0 + sBio;
    // tiny boost if query token is prefix of handle
    if (norm(item.name).startsWith(norm(query))) score += 8;
    return score;
  } else { // post
    const sTitle  = scoreText(query, item.title);
    const sAuthor = scoreText(query, item.author||"") * 0.7;
    let score = sTitle*1.0 + sAuthor;

    // popularity: sum reactions if present
    const pop = Number(item.popularity||0);
    score += clamp(Math.log10(pop+1)*6, 0, 12);

    // recency: newer gets a small boost
    const ts = item.created ? new Date(item.created).getTime() : 0;
    if (ts) {
      const days = (NOW - ts)/86400000;
      score += clamp(10 - Math.log2(days+1), 0, 10);
    }
    return score;
  }
}

function highlight(text, query){
  // highlight every query token; keep safe by highlighting after escaping
  const safe = esc(text);
  const toks = tokenize(query);
  if (!toks.length) return safe;
  let out = safe;
  toks.forEach(tok=>{
    if (!tok) return;
    const re = new RegExp(`(${tok.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`,"ig");
    out = out.replace(re, "<mark>$1</mark>");
  });
  return out;
}

let activeIndex = -1;
let items = [];
function renderSuggestions(list){
  items = list;
  activeIndex = -1;
  if (!list.length){
    suggest.innerHTML = "";
    qInput.setAttribute("aria-expanded","false");
    return;
  }
  suggest.innerHTML = list.map((it,i)=>{
    const img = esc(it.img||"");
    const badge = it.type==="post" ? "Post" : "Author";
    const title = it.type==="post" ? highlight(it.title, qInput.value) : `@${highlight(it.name, qInput.value)}`;
    const sub   = it.type==="post"
      ? `by @${highlight(it.author||"", qInput.value)}`
      : (it.bio ? esc(it.bio) : "");
    const dataAttrs = it.type==="post"
      ? `data-type="post" data-id="${esc(it.id)}"`
      : `data-type="author" data-name="${esc(it.name)}"`;
    return `
      <li role="option" id="opt-${i}" class="opt" ${dataAttrs}>
        <div class="opt-media">
          ${img ? `<img src="${img}" alt="" onerror="this.remove()">` : `<span class="opt-fallback" aria-hidden="true">📝</span>`}
        </div>
        <div class="opt-main">
          <div class="opt-title">${title}</div>
          ${sub ? `<div class="opt-sub">${sub}</div>` : ``}
        </div>
        <div class="opt-meta"><span class="badge">${badge}</span></div>
      </li>`;
  }).join("");
  qInput.setAttribute("aria-expanded","true");
}

function moveActive(delta){
  if (!items.length) return;
  activeIndex = (activeIndex + delta + items.length) % items.length;
  [...suggest.children].forEach((li,i)=>li.classList.toggle("active", i===activeIndex));
}
function choose(index){
  if (index<0 || index>=items.length) return;
  const it = items[index];
  if (it.type==="post"){
    const url = new URL("../post/post.html", location.href);
    url.searchParams.set("id", it.id);
    location.href = url;
  } else {
    const url = new URL("../profile/profile.html", location.href);
    url.searchParams.set("u", it.name);
    location.href = url;
  }
}

// cache to reduce flicker and calls
const cache = new Map(); // key -> { at:number, items:[] }
const cacheKey = (term)=>`v1:${norm(term)}`;
const getCache = (term)=> {
  const k = cacheKey(term);
  const hit = cache.get(k);
  if (hit && Date.now()-hit.at < 15000) return hit.items;
  return null;
};
const setCache = (term, items)=> cache.set(cacheKey(term), { at: Date.now(), items });

let inflight = 0;
const debounce = (fn, ms=180)=>{ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };

const query = debounce(async (term)=>{
  term = String(term||"").trim();
  if (!term){ renderSuggestions([]); return; }
  const run = ++inflight;

  // cached?
  const cached = getCache(term);
  if (cached && run===inflight){
    renderSuggestions(cached);
  }

  try{
    const qs = new URLSearchParams({
      q: term,
      limit: "12",
      sort: "created",
      sortOrder: "desc",
      _author: "true",
      _reactions: "true",
      _count: "true"
    });

    const [postsRes, profsRes] = await Promise.all([
      fetch(API(`/social/posts?${qs}`), { headers: authHeaders() }),
      fetch(API(`/social/profiles?${new URLSearchParams({ q: term, limit: "12" })}`), { headers: authHeaders() })
    ]);
    if (run!==inflight) return;

    const postsJson = await postsRes.json().catch(()=>({}));
    const profsJson = await profsRes.json().catch(()=>({}));

    const posts = (postsJson.data ?? postsJson ?? [])
      .filter(p=>p?.id && (p?.title || p?.author?.name))
      .map(p=>({
        type:"post",
        id: p.id,
        title: p.title || "(untitled)",
        author: p?.author?.name || "unknown",
        img: p?.media?.url || "",
        created: p?.created || "",
        popularity: Array.isArray(p?.reactions) ? p.reactions.reduce((n,r)=>n+(r?.count||0),0) : 0
      }));

    const authors = (profsJson.data ?? profsJson ?? [])
      .filter(u=>u?.name)
      .map(u=>({
        type:"author",
        name: u.name,
        bio: u?.bio || "",
        img: u?.avatar?.url || ""
      }));

    // score and sort
    const ranked = [...authors, ...posts]
      .map(it => ({ it, score: scoreItem(term, it) }))
      .filter(x => x.score > 0)
      .sort((a,b)=> b.score - a.score)
      .slice(0, 10)
      .map(x => x.it);

    setCache(term, ranked);
    renderSuggestions(ranked);
  } catch {
    if (run===inflight) renderSuggestions([]);
  }
}, 180);

// wire input + keys
qInput?.addEventListener("input", (e)=>{ query(e.currentTarget.value); });
qInput?.addEventListener("keydown", (e)=>{
  if (!items.length) return;
  if (e.key==="ArrowDown"){ e.preventDefault(); moveActive(1); }
  else if (e.key==="ArrowUp"){ e.preventDefault(); moveActive(-1); }
  else if (e.key==="Enter"){
    if (activeIndex>=0){ e.preventDefault(); choose(activeIndex); }
  } else if (e.key==="Escape"){
    suggest.innerHTML=""; qInput.setAttribute("aria-expanded","false");
  }
});
suggest.addEventListener("mousedown",(e)=>{
  const li = e.target.closest(".opt"); if (!li) return;
  e.preventDefault();
  const index = [...suggest.children].indexOf(li);
  choose(index);
});
document.addEventListener("click",(e)=>{ if (!form.contains(e.target)) { suggest.innerHTML=""; qInput.setAttribute("aria-expanded","false"); }});
}