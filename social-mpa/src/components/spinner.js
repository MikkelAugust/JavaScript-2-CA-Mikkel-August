class Spinner {
  static el; static shownAt = 0; static MIN_MS = 200;

  static injectCSS() {
    if (document.getElementById('app-loader-style')) return;
    const s = document.createElement('style');
    s.id = 'app-loader-style';
    s.textContent = `
      .app-loader{position:fixed;inset:0;display:grid;place-items:center;
        background:color-mix(in oklab, var(--surface,#fff) 60%, transparent);
        backdrop-filter:saturate(140%) blur(2px);z-index:9999;
        transition:opacity .25s cubic-bezier(.2,.7,.2,1), visibility 0s linear .25s}
      .app-loader.hidden{opacity:0;visibility:hidden}
      .app-loader .spinner{width:44px;height:44px;border-radius:50%;
        background:conic-gradient(from 0turn, var(--primary,#2563eb) 0 25%, transparent 0 100%);
        -webkit-mask:radial-gradient(farthest-side, transparent 55%, #000 56%);
                mask:radial-gradient(farthest-side, transparent 55%, #000 56%);
        animation:app_spin 1s linear infinite;box-shadow:0 0 0 1px rgba(0,0,0,.05) inset}
      @keyframes app_spin{to{transform:rotate(1turn)}}
      .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
    `;
    document.head.appendChild(s);
  }

  static mount() {
    if (this.el) return this.el;
    this.injectCSS();
    const el = document.createElement('div');
    el.className = 'app-loader hidden';
    el.innerHTML = `<div class="spinner" aria-hidden="true"></div><span class="sr-only">Loading</span>`;
    const attach = () => { document.body.appendChild(el); this.el = el; };
    if (document.body) attach(); else addEventListener('DOMContentLoaded', attach, { once: true });
    return el;
  }

  static show() {
    this.mount();
    const reveal = () => { this.shownAt = performance.now(); this.el.classList.remove('hidden'); };
    if (this.el) reveal(); else addEventListener('DOMContentLoaded', reveal, { once: true });
  }

  static hide() {
    const finish = () => {
      if (!this.el) return;
      const remain = Math.max(0, this.MIN_MS - (performance.now() - this.shownAt));
      setTimeout(() => this.el.classList.add('hidden'), remain);
    };
    if (this.el) finish(); else addEventListener('DOMContentLoaded', finish, { once: true });
  }

  static async wrap(p) { try { this.show(); return await p; } finally { this.hide(); } }
}
export default Spinner;