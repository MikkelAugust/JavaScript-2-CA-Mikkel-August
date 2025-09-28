/**
 * Normalize text for fuzzy search: lowercase, trim, collapse spaces.
 * @param {string} s
 * @returns {string}
 */
export function norm(s) {
  return String(s || "").toLowerCase().normalize("NFKC").replace(/\s+/g, " ").trim();
}

/**
 * Bounded Levenshtein distance. Stops if distance exceeds maxDist.
 * @param {string} a
 * @param {string} b
 * @param {number} [maxDist=Infinity]
 * @returns {number}
 */
export function levenshtein(a, b, maxDist = Infinity) {
  if (a === b) return 0;
  const n = a.length, m = b.length;
  if (n === 0) return Math.min(m, maxDist);
  if (m === 0) return Math.min(n, maxDist);
  if (Math.abs(n - m) > maxDist) return maxDist + 1;

  let prev = new Array(m + 1), cur = new Array(m + 1);
  for (let j = 0; j <= m; j++) prev[j] = j;

  for (let i = 1; i <= n; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= m; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      cur[j] = Math.min(
        prev[j] + 1,      // deletion
        cur[j - 1] + 1,   // insertion
        prev[j - 1] + cost // substitution
      );
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > maxDist) return maxDist + 1;
    [prev, cur] = [cur, prev];
  }
  return prev[m];
}