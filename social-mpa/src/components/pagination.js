export function pagerHTML(page, { hasPrev, hasNext }) {
  return `
    <div class="pager row" data-pager style="margin-top:1rem;display:flex;gap:.5rem;align-items:center;justify-content:center">
      <button class="btn" data-action="prev" ${hasPrev ? "" : "disabled"} aria-label="Previous page">← Prev</button>
      <span class="muted" data-page>Page ${page}</span>
      <button class="btn" data-action="next" ${hasNext ? "" : "disabled"} aria-label="Next page">Next →</button>
    </div>
  `;
}

export function wirePager(root, { onPrev, onNext }) {
  const wrap = root.querySelector("[data-pager]");
  if (!wrap) return;
  const prev = wrap.querySelector('[data-action="prev"]');
  const next = wrap.querySelector('[data-action="next"]');

  prev?.addEventListener("click", (e) => {
    if (prev.disabled) return;
    onPrev?.(e);
  });

  next?.addEventListener("click", (e) => {
    if (next.disabled) return;
    onNext?.(e);
  });
}

export function createLoadMore(root, {
  pageSize = 24,
  fetchPage,
  renderItems,
  renderEmpty = () => "<p>No items.</p>",
  buttonText = "Load more",
} = {}) {
  let currentPage = 1;
  let busy = false;
  let more = true;

  // container for button
  const footer = document.createElement("div");
  footer.setAttribute("data-loadmore", "");
  footer.style.cssText = "margin-top:1rem;display:flex;justify-content:center";
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.type = "button";
  btn.textContent = buttonText;
  footer.appendChild(btn);

  async function load(page = 1) {
    if (busy) return;
    busy = true;

    if (page === 1) {
      root.innerHTML = "<div class='card'>Loading…</div>";
    } else {
      btn.disabled = true;
      btn.textContent = "Loading…";
    }

    currentPage = Math.max(1, page);
    const items = await fetchPage(currentPage, pageSize);
    more = Array.isArray(items) && items.length === pageSize;

    if (currentPage === 1) {
      root.innerHTML = items?.length ? renderItems(items) : renderEmpty();
      if (items?.length && more) root.appendChild(footer);
    } else if (items?.length) {
      const html = renderItems(items);
      const wrap = document.createElement("div");
      wrap.innerHTML = html;
      while (wrap.firstElementChild) root.insertBefore(wrap.firstElementChild, footer);
    }

    if (!more) {
      footer.remove();
    } else {
      if (!footer.isConnected) root.appendChild(footer);
      btn.disabled = false;
      btn.textContent = buttonText;
    }

    busy = false;
  }

  btn.addEventListener("click", () => {
    if (busy || !more) return;
    load(currentPage + 1);
  });

  return {
    load,
    more: () => more,
    get page() { return currentPage; },
    reset: () => { currentPage = 1; more = true; busy = false; },
    setPageSize(n) { pageSize = Math.max(1, Number(n) || 1); }
  };
}