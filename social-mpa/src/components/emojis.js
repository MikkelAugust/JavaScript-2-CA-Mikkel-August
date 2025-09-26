(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const isTextField = (el) =>
    el && (el.tagName === 'TEXTAREA' ||
      (el.tagName === 'INPUT' && /^(text|search|tel|url|email)$/i.test(el.type)));

  const insertAtCaret = (el, text) => {
    const s = el.selectionStart ?? el.value.length;
    const e = el.selectionEnd ?? el.value.length;
    el.value = el.value.slice(0, s) + text + el.value.slice(e);
    const pos = s + text.length;
    el.setSelectionRange(pos, pos);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
  };

  const menu = $('#emoji-menu');
  if (menu) {
    const trigger = $('summary', menu);
    const bodyEl = $('#post-body');
    let lastFocused = bodyEl || null;

    const setOpen = (open) => {
      menu.open = open;
      trigger?.setAttribute('aria-expanded', String(open));
    };
    const onFocusIn = (e) => { if (isTextField(e.target)) lastFocused = e.target; };
    const onTriggerPointerDown = (e) => { e.preventDefault(); e.stopPropagation(); setOpen(!menu.open); };
    const onTriggerClick = (e) => { e.preventDefault(); e.stopPropagation(); };
    const onTriggerKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!menu.open); }
      else if (e.key === 'Escape') setOpen(false);
    };
    const onDocPointerDown = (e) => { if (!menu.open) return; if (!menu.contains(e.target)) setOpen(false); };
    const onEmojiClick = (e) => {
      const btn = e.target.closest('.emoji');
      if (!btn) return;
      e.preventDefault();
      const target = isTextField(document.activeElement) ? document.activeElement : lastFocused || bodyEl;
      if (target) insertAtCaret(target, btn.dataset.e);
      setOpen(false);
    };
    const init = () => {
      trigger?.setAttribute('role', 'button');
      trigger?.setAttribute('aria-haspopup', 'menu');
      trigger?.setAttribute('aria-expanded', 'false');
      document.addEventListener('focusin', onFocusIn);
      trigger?.addEventListener('pointerdown', onTriggerPointerDown);
      trigger?.addEventListener('click', onTriggerClick);
      trigger?.addEventListener('keydown', onTriggerKeyDown);
      document.addEventListener('pointerdown', onDocPointerDown);
      menu.addEventListener('click', onEmojiClick);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  }

  const EMOJI = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

  const getUserSet = (postId) => {
    try { return new Set(JSON.parse(localStorage.getItem(`reactions:${postId}`) || "[]")); }
    catch { return new Set(); }
  };
  const setUserSet = (postId, set) =>
    localStorage.setItem(`reactions:${postId}`, JSON.stringify([...set]));

  async function sendReaction(postId, symbol, removing) {
    try {
      const t = localStorage.getItem("social.token");
      const k = localStorage.getItem("social.apiKey") || localStorage.getItem("social.apikey");
      const headers = { "Content-Type": "application/json" };
      if (t) headers.Authorization = `Bearer ${t}`;
      if (k) headers["X-Noroff-API-Key"] = k;
      const base = window?.APP_CONFIG?.API_BASE || "";
      const method = removing ? "DELETE" : "PUT";
      await fetch(`${base}/social/posts/${postId}/react/${encodeURIComponent(symbol)}`, { method, headers });
    } catch { }
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));

  function renderBar(post, opts = {}) {
    const viewOnly = !!opts.viewOnly;
    const base = new Map();
    if (Array.isArray(post.reactions)) for (const r of post.reactions) base.set(r.symbol, r.count);
    for (const e of EMOJI) if (!base.has(e)) base.set(e, 0);

    const mine = getUserSet(post.id);

    const html = EMOJI.map(sym => {
      const shown = (Number.isFinite(base.get(sym)) ? base.get(sym) : 0) + (mine.has(sym) ? 1 : 0);
      const active = mine.has(sym);
      const attrs = [
        `class="react-btn"`,
        `data-sym="${esc(sym)}"`,
        `data-count="${shown}"`,
        `aria-pressed="${active}"`,
        viewOnly ? "disabled aria-disabled=\"true\"" : "",
        active ? "data-active" : ""
      ].filter(Boolean).join(" ");
      return `<button ${attrs}><span class="sym">${sym}</span><span class="cnt">${shown}</span></button>`;
    }).join("");

    const wrapAttrs = [
      `class="reactions"`,
      `data-post="${esc(post.id)}"`,
      viewOnly ? `data-viewonly="1"` : ""
    ].filter(Boolean).join(" ");

    return `<div ${wrapAttrs} role="group" aria-label="Reactions">${html}</div>`;
  }

  function wire(root = document) {
    root.addEventListener("click", async (e) => {
      const btn = e.target.closest(".react-btn");
      if (!btn) return;
      const wrap = btn.closest(".reactions");
      if (!wrap || wrap.hasAttribute("data-viewonly")) return;

      e.preventDefault(); e.stopPropagation();

      const postId = wrap.dataset.post;
      const sym = btn.dataset.sym;

      let prev = parseInt(btn.dataset.count || btn.querySelector(".cnt")?.textContent || "0", 10);
      if (!Number.isFinite(prev)) prev = 0;

      const wasActive = btn.hasAttribute("data-active");
      const next = wasActive ? Math.max(0, prev - 1) : prev + 1;

      // UI update
      btn.dataset.count = String(next);
      btn.querySelector(".cnt").textContent = String(next);
      btn.toggleAttribute("data-active");
      btn.setAttribute("aria-pressed", String(!wasActive));

      const mine = getUserSet(postId);
      if (wasActive) mine.delete(sym); else mine.add(sym);
      setUserSet(postId, mine);

      try { await sendReaction(postId, sym, wasActive); } catch { }

      window.dispatchEvent(new CustomEvent("reactions:update", {
        detail: {
          postId,
          symbol: sym,
          delta: wasActive ? -1 : 1,
          active: !wasActive
        }
      }));
    }, { passive: false });
  }

  window.Reactions = { renderBar, wire };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => wire(document));
  } else {
    wire(document);
  }
})();