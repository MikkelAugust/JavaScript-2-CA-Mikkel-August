import './links.js';
import Spinner from '../components/spinner.js';

const ROOT  = new URL('../../', import.meta.url);
const FEED  = new URL('src/pages/feed/feed.html',   ROOT).href;
const LOGIN = new URL('src/pages/login/login.html', ROOT).href;

export const getToken = () => localStorage.getItem('social.token');

export function requireAuth() {
  if (getToken()) return true;
  const u = new URL(LOGIN);
  u.searchParams.set('next', location.href);
  Spinner.show();
  location.replace(u);
  return false;
}

export function redirectIfAuthed(target = FEED) {
  if (!getToken()) return;
  const next = new URLSearchParams(location.search).get('next');
  const dest = next ? new URL(next, location.href).href : target;
  Spinner.show();
  location.replace(dest);
}

Spinner.show();
addEventListener('load', () => Spinner.hide());

document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a) return;
  const u = new URL(a.href, location.href);
  const same = u.origin === location.origin;
  const newTab = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank';
  const hashOnly = u.pathname === location.pathname && u.search === location.search && u.hash;
  if (same && !newTab && !hashOnly) Spinner.show();
}, { capture: true });

document.addEventListener('submit', () => Spinner.show(), true);

function stampNextOnAuthLinks() {
  if (getToken()) return;
  document.querySelectorAll('a[href*="pages/login"], a[href*="pages/register"]').forEach(a => {
    const u = new URL(a.getAttribute('href'), location.href);
    u.searchParams.set('next', FEED);
    a.href = u.href;
  });
}

function markActiveNav() {
  const here = location.pathname.replace(/index\.html$/, '');
  document.querySelectorAll('.nav-link').forEach(a => {
    const p = new URL(a.href, location.href).pathname.replace(/index\.html$/, '');
    if (p === here) a.classList.add('active');
  });
}

function wireLogout() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-logout]');
    if (!btn) return;
    e.preventDefault();
    ['social.token','social.user','social.apiKey'].forEach(k => localStorage.removeItem(k));
    Spinner.show();
    location.assign(new URL('index.html', ROOT).href);
  }, { passive: false });
}

stampNextOnAuthLinks();
markActiveNav();
wireLogout();

window.Spinner = Spinner;