const ROOT = new URL('../../', import.meta.url);

const ROUTES = {
  home: '',
  login: 'src/pages/login/login.html',
  register: 'src/pages/register/register.html',
  feed: 'src/pages/feed/feed.html',
  post: 'src/pages/post/post.html',
};

function hrefFor(key) {
  const path = ROUTES[key];
  if (path == null) return null;
  return new URL(path, ROOT).href;
}

function buildUrl(key, nextKey) {
  const base = hrefFor(key);
  if (!base) return null;
  if (!nextKey) return base;

  const next = hrefFor(nextKey);
  const u = new URL(base);
  if (next) u.searchParams.set('next', next);
  return u.href;
}

function wireAnchors() {
  const token = localStorage.getItem('social.token');
  document.querySelectorAll('a[data-link]').forEach(a => {
    const key = a.dataset.link;
    const next = !token ? a.dataset.next : null;
    const url = buildUrl(key, next);
    if (url) a.href = url;
  });
}

function wireButtons() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-link-btn]');
    if (!btn) return;
    e.preventDefault();
    const token = localStorage.getItem('social.token');
    const key = btn.dataset.linkBtn;
    const next = !token ? btn.dataset.next : null;
    const url = buildUrl(key, next);
    if (url) location.href = url;
  }, { passive: false });
}

function wireBrandRefresh() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a.brand');
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    location.reload();
  }, { passive: false });
}

wireAnchors();
wireButtons();
wireBrandRefresh();