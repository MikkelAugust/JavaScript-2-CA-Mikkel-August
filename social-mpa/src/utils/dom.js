/** Safe document ref for SSR/tests */
const DOC = /** @type {Document | undefined} */ (
  typeof document !== "undefined" ? document : undefined
);

/**
 * Query single element.
 * @template {Element} T
 * @param {string} sel
 * @param {ParentNode} [root=DOC]
 * @returns {T|null}
 */
export const $ = (sel, root = /** @type {ParentNode} */ (DOC)) =>
  root ? root.querySelector(sel) : null;

/**
 * Query multiple elements.
 * @template {Element} T
 * @param {string} sel
 * @param {ParentNode} [root=DOC]
 * @returns {T[]}
 */
export const $$ = (sel, root = /** @type {ParentNode} */ (DOC)) =>
  root ? Array.from(root.querySelectorAll(sel)) : [];

/**
 * Run callback when DOM is ready. No-op if document is unavailable.
 * @param {() => void} fn
 */
export const ready = (fn) => {
  if (!DOC) return;
  if (DOC.readyState === "loading") {
    DOC.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
};

/**
 * HTML-escape a string.
 * @param {any} s
 * @returns {string}
 */
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (ch) =>
    ch === "&" ? "&amp;"
    : ch === "<" ? "&lt;"
    : ch === ">" ? "&gt;"
    : ch === '"' ? "&quot;"
    : "&#39;"
  );

/**
 * Safe CSS.escape fallback.
 * @param {any} str
 * @returns {string}
 */
export const cssEscape = (str) =>
  (typeof window !== "undefined" && window.CSS && typeof CSS.escape === "function")
    ? CSS.escape(String(str ?? ""))
    : String(str ?? "").replace(/"/g, '\\"');