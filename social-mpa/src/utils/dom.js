export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const ready = (fn) => (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", fn) : fn());
export const esc = (s) => String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
