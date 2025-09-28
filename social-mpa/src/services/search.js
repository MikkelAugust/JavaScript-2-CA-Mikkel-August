import { api } from "./apiClient.js";
import { CONFIG } from "../app/config.js";

/**
 * Normalize: lowercase, trim, collapse spaces.
 * @param {string} s
 */
function norm(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Score relevance using simple heuristics.
 * @param {string} q
 * @param {string} text
 */
function scoreText(q, text) {
  const query = norm(q);
  const t = norm(text);
  if (!query || !t) return 0;
  if (t === query) return 100;
  if (t.startsWith(query)) return 80;
  if (t.includes(query)) return 60;
  return 0;
}

/**
 * Search posts and profiles. Returns up to 8 ranked results.
 * @param {string} q
 * @returns {Promise<Array<{type:"post"|"author"} & Record<string, any>>>}
 */
export async function searchPostsAndProfiles(q) {
  const query = norm(q);
  if (!query || query.length < 2) return [];

  const qs = new URLSearchParams({
    q: query,
    limit: "12",
    sort: "created",
    sortOrder: "desc",
    _author: "true",
    _reactions: "true",
    _count: "true",
  });

  /** @type {any} */ const postsEnv =
    await api.get(`${CONFIG.ENDPOINTS.SOCIAL.POSTS}?${qs}`);
  /** @type {any} */ const profsEnv =
    await api.get(`${CONFIG.ENDPOINTS.SOCIAL.PROFILES}?${new URLSearchParams({ q: query, limit: "12" })}`);

  /** @type {any[]} */
  const postsRaw = Array.isArray(postsEnv?.data) ? postsEnv.data : [];
  /** @type {any[]} */
  const profsRaw = Array.isArray(profsEnv?.data) ? profsEnv.data : [];

  const posts = postsRaw
    .filter((p) => p && p.id)
    .map(/** @param {any} p */(p) => ({
      type: "post",
      id: String(p.id),
      title: p.title || "(untitled)",
      author: p?.author?.name || "unknown",
      img: p?.media?.url || "",
      created: p?.created || "",
      popularity: Array.isArray(p?.reactions)
        ? /** @type {any[]} */ (p.reactions).reduce(
            /** @param {number} acc @param {{count?:number}} rec */(acc, rec) => acc + (Number(rec?.count) || 0),
          0
        )
        : 0,
      _score: scoreText(query, p.title || "") + 0.5 * scoreText(query, p?.author?.name || ""),
    }));

  const authors = profsRaw
    .filter((u) => u && u.name)
    .map(/** @param {any} u */(u) => ({
      type: "author",
      name: u.name,
      bio: u?.bio || "",
      img: u?.avatar?.url || "",
      _score: scoreText(query, u.name) + 0.4 * scoreText(query, u?.bio || ""),
    }));

  /** @type {Array<{_score:number} & Record<string, any>>} */
  const combined = [...authors, ...posts];

  const ranked = combined
    .filter(/** @param {{_score:number}} x */(x) => x._score > 0)
    .sort(/** @param {{_score:number}} a @param {{_score:number}} b */(a, b) => b._score - a._score)
    .slice(0, 8)
    .map((x) => {
      const { _score, ...it } = x;
      return /** @type {any} */ (it);
    });

  return ranked;
}