import { api } from "./apiClient.js";
import { norm, levenshtein } from "../utils/text.js";
import { CONFIG } from "../app/config.js";

const TTL_MS = 15000;
const cache = new Map(); // key -> { at, items }

const key = (q) => `v1:${norm(q)}`;
const get = (q) => { const k = key(q), v = cache.get(k); return v && (Date.now()-v.at<TTL_MS) ? v.items : null; };
const set = (q, items) => cache.set(key(q), { at: Date.now(), items });

function scoreText(query, text){
  const q = norm(query), t = norm(text);
  if (!q || !t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 85;
  if (t.includes(q)) return 65;
  if (t.split(/\s+/).some(w => w.startsWith(q))) return 75;
  const d = levenshtein(t, q, 2);
  if (d === 1) return 55;
  if (d === 2) return 45;
  return 0;
}

function scoreItem(query, it){
  const clamp = (n, a, b)=>Math.max(a, Math.min(b, n));
  if (it.type === "author"){
    let s = scoreText(query, it.name) + 0.4 * scoreText(query, it.bio || "");
    if (norm(it.name).startsWith(norm(query))) s += 8;
    return s;
  }
  let s = scoreText(query, it.title) + 0.7 * scoreText(query, it.author || "");
  const pop = Number(it.popularity || 0);
  s += clamp(Math.log10(pop + 1) * 6, 0, 12);
  const ts = it.created ? Date.parse(it.created) : 0;
  if (ts) {
    const days = (Date.now() - ts) / 86400000;
    s += clamp(10 - Math.log2(days + 1), 0, 10);
  }
  return s;
}

export async function searchPostsAndProfiles(q){
  const cached = get(q);
  if (cached) return cached;

  const qs = new URLSearchParams({
    q, limit: "12", sort: "created", sortOrder: "desc", _author: "true", _reactions: "true", _count: "true"
  });
  const [postsJson, profsJson] = await Promise.all([
    api.get(`${CONFIG.ENDPOINTS.SOCIAL.POSTS}?${qs}`),
    api.get(`${CONFIG.ENDPOINTS.SOCIAL.PROFILES}?${new URLSearchParams({ q, limit: "12" })}`)
  ]);

  const posts = (postsJson.data ?? postsJson ?? []).filter(p => p?.id).map(p => ({
    type: "post",
    id: p.id,
    title: p.title || "(untitled)",
    author: p?.author?.name || "unknown",
    img: p?.media?.url || "",
    created: p?.created || "",
    popularity: Array.isArray(p?.reactions) ? p.reactions.reduce((n, r) => n + (r?.count || 0), 0) : 0
  }));

  const authors = (profsJson.data ?? profsJson ?? []).filter(u => u?.name).map(u => ({
    type: "author",
    name: u.name,
    bio: u?.bio || "",
    img: u?.avatar?.url || ""
  }));

  const ranked = [...authors, ...posts]
    .map(it => ({ it, score: scoreItem(q, it) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(x => x.it);

  set(q, ranked);
  return ranked;
}
