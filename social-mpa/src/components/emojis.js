(() => {

  const $  = (s, r = document) => r.querySelector(s);
  const isTextField = (el) =>
    el && (el.tagName === 'TEXTAREA' ||
    (el.tagName === 'INPUT' && /^(text|search|tel|url|email)$/i.test(el.type)));

  const insertAtCaret = (el, text) => {
    const s = el.selectionStart ?? el.value.length;
    const e = el.selectionEnd   ?? el.value.length;
    el.value = el.value.slice(0, s) + text + el.value.slice(e);
    const pos = s + text.length;
    el.setSelectionRange(pos, pos);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.focus();
  };


  const menu    = $('#emoji-menu');
  if (!menu) return;
  const trigger = $('summary', menu);
  const bodyEl  = $('#post-body');


  let lastFocused = bodyEl || null;


  const setOpen = (open) => {
    if (!menu) return;
    menu.open = open;
    trigger?.setAttribute('aria-expanded', String(open));
  };

  const onFocusIn = (e) => { if (isTextField(e.target)) lastFocused = e.target; };

  const onTriggerPointerDown = (e) => {

    e.preventDefault();
    e.stopPropagation();
    setOpen(!menu.open);
  };

  const onTriggerClick = (e) => { e.preventDefault(); e.stopPropagation(); };

  const onTriggerKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(!menu.open);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const onDocPointerDown = (e) => {
    if (!menu.open) return;
    if (!menu.contains(e.target)) setOpen(false);
  };

  const onEmojiClick = (e) => {
    const btn = e.target.closest('.emoji');
    if (!btn) return;
    e.preventDefault();

    const target = isTextField(document.activeElement)
      ? document.activeElement
      : lastFocused || bodyEl;

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
