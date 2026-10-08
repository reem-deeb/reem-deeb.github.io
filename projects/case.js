/* Shared behaviour for the project case-study pages.
   Each page defines window.CASE_I18N = { de: {...}, ar: {...} } before loading this file. */
(() => {
  const html = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const rtl = html.dir === 'rtl';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Translations ---------- */
  const UI = {
    de: {
      'ui.back': 'Alle Arbeiten', 'ui.next': 'Nächstes Projekt', 'ui.copied': 'Kopiert', 'ui.view': 'Ansehen', 'ui.scroll': 'Scrollen',
      'ui.overview': 'Überblick', 'ui.client': 'Kunde', 'ui.industry': 'Branche', 'ui.services': 'Leistungen', 'ui.location': 'Standort',
      'ui.palette': 'Farbpalette', 'ui.typography': 'Typografie', 'ui.copy': 'Klicken zum Kopieren', 'ui.top': 'Nach oben &uarr;',
      'ui.contact': 'Projekt im Kopf? Schreiben Sie mir', 'ui.toTop': 'Nach oben'
    },
    ar: {
      'ui.back': 'جميع الأعمال', 'ui.next': 'المشروع التالي', 'ui.copied': 'تم النسخ', 'ui.view': 'عرض', 'ui.scroll': 'مرّر',
      'ui.overview': 'نظرة عامة', 'ui.client': 'العميل', 'ui.industry': 'المجال', 'ui.services': 'الخدمات', 'ui.location': 'الموقع',
      'ui.palette': 'لوحة الألوان', 'ui.typography': 'الخطوط', 'ui.copy': 'انقر للنسخ', 'ui.top': 'العودة للأعلى &uarr;',
      'ui.contact': 'لديك مشروع؟ تواصل معي', 'ui.toTop': 'العودة للأعلى'
    }
  };
  const lang = html.lang;
  const dict = Object.assign({}, UI[lang] || {}, (window.CASE_I18N || {})[lang] || {});
  if (lang !== 'en') {
    $$('[data-i18n]').forEach(el => { const v = dict[el.dataset.i18n]; if (v != null) el.innerHTML = v; });
    $$('[data-i18n-aria]').forEach(el => { const v = dict[el.dataset.i18nAria]; if (v != null) el.setAttribute('aria-label', v); });
    if (dict.title) { const t = document.createElement('textarea'); t.innerHTML = dict.title; document.title = t.value; }
  }
  const t = (key, fallback) => dict[key] != null ? dict[key] : fallback;

  $$('.lang button').forEach(btn => {
    btn.setAttribute('aria-pressed', btn.dataset.lang === lang);
    btn.addEventListener('click', () => {
      if (btn.dataset.lang === lang) return;
      try { localStorage.setItem('lang', btn.dataset.lang); sessionStorage.setItem('caseY', String(Math.round(scrollY))); } catch (e) {}
      document.body.classList.add('is-leaving');
      setTimeout(() => location.reload(), 350);
    });
  });

  /* ---------- Page transitions ---------- */
  const wipe = $('.page-wipe');
  function leave(href, color, label) {
    if (reduce || !window.gsap) { location.href = href; return; }
    if (color) wipe.style.setProperty('--wipe', color);
    const span = $('span', wipe); if (span) span.textContent = label || '';
    if (lenis) lenis.stop();
    gsap.fromTo(wipe, { clipPath: 'inset(100% 0% 0% 0%)' }, {
      clipPath: 'inset(0% 0% 0% 0%)', duration: .9, ease: 'expo.inOut',
      onComplete: () => { location.href = href; }
    });
    if (span) gsap.fromTo(span, { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: .8, delay: .35, ease: 'expo.out' });
  }
  $$('a[data-transition]').forEach(a => a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (a.hasAttribute('data-back')) {
      // Back to the homepage: land on the project you came from, without replaying the intro.
      try {
        sessionStorage.setItem('langY', sessionStorage.getItem('homeY') || '0');
        sessionStorage.setItem('tab', a.dataset.tab || 'branding');
      } catch (err) {}
    }
    leave(a.href, a.dataset.wipe, a.dataset.wipeLabel);
  }));
  // Coming back via the browser's back/forward cache: make sure the curtain is lifted.
  window.addEventListener('pageshow', e => {
    if (e.persisted && window.gsap) { gsap.set(wipe, { clipPath: 'inset(100% 0% 0% 0%)' }); if (lenis) lenis.start(); }
  });

  /* ---------- Back-to-top button: appears after the hero, its ring fills with scroll progress ---------- */
  const toTop = $('.to-top');
  if (toTop) {
    const bar = $('.tt-bar', toTop), len = 2 * Math.PI * 26;
    const update = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, scrollY / max) : 0;
      if (bar) bar.style.strokeDashoffset = String(len * (1 - p));
      toTop.classList.toggle('is-on', scrollY > innerHeight * .8);
    };
    addEventListener('scroll', update, { passive: true }); update();
    toTop.addEventListener('click', () => {
      if (lenis) lenis.scrollTo(0, { duration: 1.8 });
      else scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

  if (!window.gsap || !window.ScrollTrigger) { html.classList.remove('entering'); return; }
  gsap.registerPlugin(ScrollTrigger);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  let caseY = null;
  try { caseY = sessionStorage.getItem('caseY'); sessionStorage.removeItem('caseY'); } catch (e) {}
  if (caseY === null) window.scrollTo(0, 0);

  /* ---------- Smooth scroll ---------- */
  var lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: x => Math.min(1, 1.001 - Math.pow(2, -10 * x)), smoothWheel: true });
    window.__lenis = lenis; // shared with ui.js (UI/UX case studies)
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- Text splitting ---------- */
  function splitWords(el) {
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          const wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = part;
          w.appendChild(wi); frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
    });
    walk(el);
    return $$('.wi', el);
  }
  function splitChars(el) {
    const text = el.textContent; el.textContent = '';
    [...text].forEach(ch => { const c = document.createElement('span'); c.className = 'c'; c.textContent = ch === ' ' ? ' ' : ch; el.appendChild(c); });
    return $$('.c', el);
  }
  $$('[data-chars]').forEach(splitChars);
  $$('[data-split], [data-fill]').forEach(splitWords);

  // The hero title never gets cut off: if it is wider than the space available
  // (long names, narrow screens, other languages), its font size is scaled down to fit.
  const fitTitle = () => {
    const el = $('.c-title'); if (!el) return;
    el.style.fontSize = '';
    const box = el.parentElement, cs = getComputedStyle(box);
    const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const w = el.scrollWidth;
    if (avail > 0 && w > avail) el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * avail / w * .98) + 'px';
  };
  fitTitle();
  let fitT; addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(fitTitle, 120); });

  /* ---------- Theme: the page background eases between section colours ---------- */
  const rootCS = getComputedStyle(html);
  const base = { bg: rootCS.getPropertyValue('--bg').trim(), fg: rootCS.getPropertyValue('--fg').trim() };
  gsap.set(document.body, { '--page-bg': base.bg, '--page-fg': base.fg });
  const themed = $$('[data-theme-bg]');
  const activeThemes = new Set();
  const applyTheme = () => {
    const last = themed.filter(s => activeThemes.has(s)).pop();
    const bg = last ? last.dataset.themeBg : base.bg, fg = last ? (last.dataset.themeFg || base.fg) : base.fg;
    gsap.to(document.body, { '--page-bg': bg, '--page-fg': fg, duration: .9, ease: 'power2.out', overwrite: 'auto' });
  };
  // A themed section switches on when it arrives and off when the next section arrives. Two separate
  // triggers (each measured on its own element) also cover the extra scroll length of pinned sections.
  themed.forEach(s => {
    const on = () => { activeThemes.add(s); applyTheme(); }, off = () => { activeThemes.delete(s); applyTheme(); };
    const next = s.nextElementSibling;
    ScrollTrigger.create({ trigger: s, start: 'top 55%', onEnter: on, onLeaveBack: off });
    if (next) ScrollTrigger.create({ trigger: next, start: 'top 55%', onEnter: off, onLeaveBack: on });
    else ScrollTrigger.create({ trigger: s, start: 'bottom 45%', onEnter: off, onLeaveBack: on });
  });

  /* ---------- Arrival: curtain lifts, hero settles, title rises ---------- */
  const titleChars = $$('.c-title .c');
  if (reduce) {
    html.classList.remove('entering');
  } else if (html.classList.contains('lang-switch')) {
    html.classList.remove('entering');
  } else {
    if (lenis) lenis.stop();
    gsap.set(titleChars, { yPercent: 110 });
    gsap.set('.c-kicker, .c-meta > div, .case-nav > *', { y: 30, autoAlpha: 0 });
    gsap.set('.c-hero-media > *', { scale: 1.35 });
    const tl = gsap.timeline({ delay: .1, onComplete: () => { if (lenis) lenis.start(); } });
    tl.to(wipe, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.25, ease: 'expo.inOut' }, 0)
      .add(() => html.classList.remove('entering'), 1.3)
      .to('.c-hero-media > *', { scale: 1, duration: 2.2, ease: 'expo.out' }, .35)
      .to(titleChars, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: .045 }, .7)
      .to('.c-kicker', { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out' }, .9)
      .to('.c-meta > div', { y: 0, autoAlpha: 1, duration: 1.1, ease: 'expo.out', stagger: .08 }, 1)
      .to('.case-nav > *', { y: 0, autoAlpha: 1, duration: 1.1, ease: 'expo.out', stagger: .06 }, 1.05);
  }

  /* ---------- Hero shrinks into a card as you scroll away ---------- */
  gsap.fromTo('.c-hero-media', { clipPath: 'inset(0% 0% 0% 0% round 0px)' }, {
    clipPath: 'inset(7% 5% 7% 5% round 32px)', ease: 'none',
    scrollTrigger: { trigger: '.c-hero', start: 'top top', end: 'bottom top', scrub: true }
  });
  gsap.to('.c-hero-media > *', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.c-hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.c-hero-ui', { y: -120, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '.c-hero', start: 'top top', end: '60% top', scrub: true } });

  /* ---------- Text reveals ---------- */
  $$('[data-split]').forEach(el => gsap.from($$('.wi', el), {
    yPercent: 115, rotate: rtl ? -3 : 3, duration: 1.2, ease: 'expo.out', stagger: .05,
    scrollTrigger: { trigger: el, start: 'top 88%' }
  }));
  $$('[data-fade]').forEach(el => gsap.from(el, {
    y: 40, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' }
  }));
  // Statements fill word by word: muted -> accent -> full colour, scrubbed with the scroll.
  $$('[data-fill]').forEach(el => {
    const words = $$('.wi', el);
    const muted = rootCS.getPropertyValue('--muted').trim(), accent = rootCS.getPropertyValue('--accent').trim();
    const fg = getComputedStyle(el).color;
    gsap.set(words, { color: muted });
    gsap.to(words, {
      keyframes: { color: [muted, accent, fg] }, stagger: .1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true }
    });
  });
  // Chapter headers: the outlined number slides in, the rule draws across.
  $$('.ch-head').forEach(h => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: h, start: 'top 80%' } });
    tl.from($('.ch-num', h), { xPercent: rtl ? 30 : -30, autoAlpha: 0, duration: 1.6, ease: 'expo.out' })
      .from($('.ch-line', h), { scaleX: 0, duration: 1.6, ease: 'expo.inOut' }, 0);
    gsap.to($('.ch-num', h), { yPercent: -25, ease: 'none', scrollTrigger: { trigger: h, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------- Images: unmask upwards, settle from a slight zoom, gentle parallax ---------- */
  $$('[data-reveal]').forEach(fig => {
    const img = $('img', fig);
    gsap.fromTo(fig, { clipPath: 'inset(100% 0% 0% 0% round 26px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 26px)', duration: 1.5, ease: 'expo.inOut',
      scrollTrigger: { trigger: fig, start: 'top 88%' }
    });
    gsap.fromTo(img, { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: fig, start: 'top bottom', end: 'bottom 30%', scrub: true } });
  });
  $$('[data-speed]').forEach(el => {
    const s = parseFloat(el.dataset.speed) || 0;
    gsap.fromTo(el, { yPercent: -s }, { yPercent: s, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------- Colour palette: bars grow up from the baseline, click to copy ---------- */
  const toast = $('.toast');
  $$('.c-palette').forEach(p => {
    const sw = $$('.swatch', p);
    gsap.from(sw, { scaleY: 0, duration: 1.4, ease: 'expo.inOut', stagger: .09, scrollTrigger: { trigger: p, start: 'top 80%' } });
    gsap.from($$('.swatch b, .swatch small', p), { y: 24, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .03, delay: .6, scrollTrigger: { trigger: p, start: 'top 80%' } });
  });
  $$('.swatch').forEach(s => s.addEventListener('click', () => {
    const hex = s.dataset.hex;
    (navigator.clipboard ? navigator.clipboard.writeText(hex) : Promise.reject()).catch(() => {}).finally(() => {
      toast.textContent = `${t('ui.copied', 'Copied')} ${hex}`;
      toast.classList.add('is-on'); clearTimeout(toast.t); toast.t = setTimeout(() => toast.classList.remove('is-on'), 1600);
    });
  }));

  /* ---------- Type specimens ---------- */
  $$('.spec').forEach(s => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: s, start: 'top 80%' } });
    tl.from($('.spec-glyph', s), { yPercent: 40, autoAlpha: 0, duration: 1.6, ease: 'expo.out' })
      .from($$('.spec-alpha, .spec-weights > *, .spec-desc', s), { y: 20, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .06 }, .2);
  });
  $$('.c-type-line span').forEach(span => gsap.fromTo(span, { xPercent: rtl ? -10 : 10 }, {
    xPercent: rtl ? 30 : -30, ease: 'none', scrollTrigger: { trigger: span, start: 'top bottom', end: 'bottom top', scrub: true }
  }));

  /* ---------- Desktop-only: pinned horizontal gallery + stacked cards ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 768px)', () => {
    $$('.c-hscroll').forEach(sec => {
      const track = $('.h-track', sec), slides = $$('.h-slide', sec), count = $('.h-count', sec);
      const dist = () => Math.max(0, track.scrollWidth - html.clientWidth);
      let cur = -1;
      const setSlide = i => {
        if (i === cur) return; cur = i;
        const sl = slides[i];
        if (sl.dataset.color) gsap.to(sec, { backgroundColor: sl.dataset.color, color: sl.dataset.ink || '#fff', duration: .9, ease: 'power2.out', overwrite: 'auto' });
        if (count) count.textContent = `${String(i + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
      };
      // Slides ease up to full size as they reach the centre of the screen.
      const shape = () => {
        const mid = html.clientWidth / 2;
        slides.forEach(sl => {
          const r = sl.getBoundingClientRect();
          const d = Math.min(1, Math.abs(r.left + r.width / 2 - mid) / html.clientWidth);
          gsap.set($('.c-fig', sl), { scale: 1 - d * .14, rotate: (r.left + r.width / 2 > mid ? 1 : -1) * d * 3 });
        });
      };
      setSlide(0);
      gsap.to(track, {
        x: () => (rtl ? dist() : -dist()), ease: 'none',
        scrollTrigger: {
          // refreshPriority: pinned sections are measured top-to-bottom before everything else, since
          // each pin adds scroll length that later triggers (themes, parallax, other pins) depend on.
          trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, refreshPriority: 100 - $$('.c-hscroll, [data-scrollshot], [data-viewer], [data-flow]').indexOf(sec),
          onUpdate: s => { setSlide(Math.round(s.progress * (slides.length - 1))); shape(); },
          onRefresh: shape
        }
      });
      return () => { gsap.set(sec, { clearProps: 'backgroundColor,color' }); };
    });

    // Stacked cards: each one sticks, and the one underneath recedes as the next slides over it.
    $$('.c-stack').forEach(st => {
      const cards = $$('.stack-card', st);
      cards.forEach((c, i) => {
        c.style.setProperty('--i', i);
        const next = cards[i + 1]; if (!next) return;
        const tl = gsap.timeline({ scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 20%', scrub: true } });
        tl.to($('.c-fig', c), { scale: .9, autoAlpha: .35, ease: 'none' }, 0)
          .to($('.label', c), { autoAlpha: 0, ease: 'none', duration: .4 }, 0);
      });
    });
  });

  /* ---------- Arched photos: rise out of their frame and settle from a slight zoom ---------- */
  $$('[data-arch]').forEach(a => {
    gsap.timeline({ scrollTrigger: { trigger: a, start: 'top 85%' } })
      .fromTo(a, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' })
      .from($('img', a), { scale: 1.2, duration: 2, ease: 'expo.out' }, .2);
  });

  /* ---------- Line drawings ([data-draw]): strokes draw themselves as you scroll ---------- */
  $$('[data-draw]').forEach(g => {
    const svg = g.ownerSVGElement;
    const lines = $$('line, path, polyline', g);
    lines.forEach(l => { const len = l.getTotalLength(); gsap.set(l, { strokeDasharray: len, strokeDashoffset: len }); });
    const face = $('.box-face', svg);
    const tl = gsap.timeline({ scrollTrigger: { trigger: svg, start: 'top 85%', end: 'center 45%', scrub: 1 } });
    tl.to(lines, { strokeDashoffset: 0, ease: 'none', stagger: .12 });
    if (face) tl.fromTo(face, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, ease: 'back.out(1.6)', duration: .6 }, '-=.3');
  });

  /* ---------- Full-bleed statement over an image ---------- */
  $$('.c-quote').forEach(q => {
    gsap.fromTo($('img', q), { yPercent: -6, scale: 1.15 }, { yPercent: 6, scale: 1, ease: 'none', scrollTrigger: { trigger: q, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------- Next project: floating preview follows the cursor ---------- */
  const nextLink = $('.c-next a'), preview = $('.next-preview');
  if (nextLink && preview && finePointer) {
    const px = gsap.quickTo(preview, 'x', { duration: .6, ease: 'power3' }), py = gsap.quickTo(preview, 'y', { duration: .6, ease: 'power3' });
    nextLink.addEventListener('mouseenter', () => gsap.to(preview, { autoAlpha: 1, scale: 1, rotate: -4, duration: .6, ease: 'expo.out' }));
    nextLink.addEventListener('mouseleave', () => gsap.to(preview, { autoAlpha: 0, scale: .6, rotate: 0, duration: .5, ease: 'expo.out' }));
    nextLink.addEventListener('mousemove', e => { px(e.clientX); py(e.clientY); });
  }
  gsap.from('.c-next .next-title', { yPercent: 60, autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.c-next', start: 'top 80%' } });

  /* ---------- Progress, cursor, magnetic ---------- */
  const bar = $('.progress');
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => gsap.set(bar, { scaleX: s.progress }) });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href')); if (!target) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(target, { duration: 1.6 }) : target.scrollIntoView({ behavior: 'smooth' });
  }));
  if (finePointer) {
    const dot = $('.cursor'), ring = $('.cursor-ring');
    const dx = gsap.quickTo(dot, 'x', { duration: .1 }), dy = gsap.quickTo(dot, 'y', { duration: .1 });
    const rx = gsap.quickTo(ring, 'x', { duration: .55, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: .55, ease: 'power3' });
    gsap.set([dot, ring], { autoAlpha: 0 });
    addEventListener('mousemove', e => { gsap.set([dot, ring], { autoAlpha: 1 }); dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }, { passive: true });
    document.addEventListener('mouseleave', () => gsap.set([dot, ring], { autoAlpha: 0 }));
    document.addEventListener('mouseover', e => {
      const view = e.target.closest('[data-cursor="view"]'), link = e.target.closest('a, button');
      ring.classList.toggle('is-view', !!view); ring.classList.toggle('is-link', !view && !!link);
    });
    $$('[data-magnetic]').forEach(el => {
      const mx = gsap.quickTo(el, 'x', { duration: .6, ease: 'power3' }), my = gsap.quickTo(el, 'y', { duration: .6, ease: 'power3' });
      el.addEventListener('mousemove', e => { const r = el.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * .3); my((e.clientY - r.top - r.height / 2) * .4); });
      el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, .4)' }));
    });
  }

  const refresh = () => {
    fitTitle();
    ScrollTrigger.sort(); // apply refreshPriority: pinned sections measured top-to-bottom first
    ScrollTrigger.refresh();
    if (caseY !== null) { const y = +caseY; caseY = null; lenis ? lenis.scrollTo(y, { immediate: true, force: true }) : scrollTo(0, y); }
  };
  document.fonts && document.fonts.ready.then(refresh);
  addEventListener('load', refresh);
})();
