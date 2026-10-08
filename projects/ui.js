/* UI/UX case-study components. Runs after case.js (uses its GSAP setup and window.__lenis). */
(() => {
  if (!window.gsap || !window.ScrollTrigger) return;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollToY = y => window.__lenis ? window.__lenis.scrollTo(y, { duration: 1.4 }) : window.scrollTo({ top: y, behavior: 'smooth' });

  // Pinned sections must be measured top-to-bottom, so each one adds its scroll length
  // before the ones below it are positioned (case.js uses the same ordering).
  const pinned = $$('.c-hscroll, [data-scrollshot], [data-viewer], [data-flow]');
  const prio = el => 100 - pinned.indexOf(el);
  const mm = gsap.matchMedia();
  const desktop = () => innerWidth >= 768;

  /* ---------- Counters ---------- */
  $$('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count), o = { v: 0 }, suffix = el.dataset.suffix || '';
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: reduce ? 0 : 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = Math.round(o.v) + suffix; } })
    });
  });

  // Scroll thumb inside a browser view: size = visible share, position = progress.
  const setThumb = (th, view, img, p) => {
    if (!th) return;
    const share = Math.min(1, view.clientHeight / Math.max(1, img.offsetHeight));
    th.style.height = (share * 100) + '%';
    th.style.transform = `translateY(${p * (1 / share - 1) * 100}%)`;
  };

  /* ---------- Multi-page viewer: tabs work everywhere, pinning only on desktop ---------- */
  const viewers = $$('[data-viewer]').map(sec => {
    const v = {
      sec, st: null, cur: -1,
      view: $('.vw-view', sec), shots: $$('.vw-shot', sec), tabs: $$('.vw-tab', sec), infos: $$('.vw-page-info', sec),
      minis: $$('.vw-mini img', sec), mini: $('.vw-mini', sec), frame: $('.vw-mini-frame', sec),
      url: $('.browser-url', sec), count: $('.vw-count b', sec), th: $('.ui-thumb i', sec)
    };
    v.show = i => {
      if (i === v.cur) return; v.cur = i;
      v.shots.forEach((s, k) => s.classList.toggle('is-on', k === i));
      v.infos.forEach((s, k) => s.classList.toggle('is-on', k === i));
      v.minis.forEach((s, k) => s.classList.toggle('is-on', k === i));
      v.tabs.forEach((t, k) => { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; });
      if (v.url) v.url.textContent = v.tabs[i].dataset.url;
      if (v.count) v.count.textContent = String(i + 1).padStart(2, '0');
      if (!desktop()) v.view.scrollTop = 0;
    };
    v.show(0);
    v.tabs.forEach((t, k) => t.addEventListener('click', () => {
      if (v.st) scrollToY(v.st.start + (k + .02) / v.shots.length * (v.st.end - v.st.start) + 2);
      else v.show(k);
    }));
    // Arrow keys move between page tabs.
    $('.vw-tabs', sec).addEventListener('keydown', e => {
      const i = v.tabs.indexOf(document.activeElement); if (i < 0) return;
      const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]; if (!d) return;
      e.preventDefault(); const n = (i + d + v.tabs.length) % v.tabs.length; v.tabs[n].focus(); v.tabs[n].click();
    });
    return v;
  });

  /* ---------- Flows: steps light up as the phone screen changes ---------- */
  const flows = $$('[data-flow]').map(sec => {
    const f = { sec, cur: -1, steps: $$('.flow-step', sec), shots: $$('.flow-shot', sec), rail: $('.flow-rail i', sec), device: $('.flow-device .phone', sec) || $('.flow-device', sec) };
    f.show = i => {
      if (i === f.cur) return;
      const dir = i > f.cur ? 1 : -1; f.cur = i;
      f.steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
      f.shots.forEach((s, k) => s.classList.toggle('is-on', k === i));
      if (!reduce) gsap.fromTo(f.device, { rotateY: dir * -10, rotateX: 4 }, { rotateY: 0, rotateX: 0, duration: 1.1, ease: 'expo.out', overwrite: 'auto' });
    };
    f.show(0);
    return f;
  });

  mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
    /* Single long page scrolling inside a browser, section stays pinned */
    $$('[data-scrollshot]').forEach(sec => {
      const view = $('.ss-view', sec), img = $('img', view), marks = $$('.ss-marks li', sec), th = $('.ui-thumb i', sec);
      const dist = () => Math.max(0, img.offsetHeight - view.clientHeight);
      const setMarks = p => marks.forEach((m, i) => {
        const at = +m.dataset.at, next = marks[i + 1] ? +marks[i + 1].dataset.at : 1.01;
        m.classList.toggle('is-on', p >= at && p < next);
      });
      setMarks(0); setThumb(th, view, img, 0);
      gsap.to(img, {
        y: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: sec, start: 'top top', end: () => '+=' + Math.max(innerHeight, dist() * .9), pin: true, scrub: 1,
          invalidateOnRefresh: true, refreshPriority: prio(sec),
          onUpdate: s => { setMarks(s.progress); setThumb(th, view, img, s.progress); }
        }
      });
    });

    /* Several long pages: each scrolls in turn, then hands over to the next */
    viewers.forEach(v => {
      const n = v.shots.length;
      // Hold briefly at the top and bottom of each page so the hand-over reads clearly.
      const dwell = t => gsap.utils.clamp(0, 1, (t - .08) / .84);
      v.st = ScrollTrigger.create({
        trigger: v.sec, start: 'top top', end: () => '+=' + innerHeight * 1.6 * n, pin: true,
        invalidateOnRefresh: true, refreshPriority: prio(v.sec),
        onUpdate: s => {
          const x = Math.min(n - 1e-4, s.progress * n), i = Math.floor(x), local = dwell(x - i);
          v.show(i);
          const img = v.shots[i], d = Math.max(0, img.offsetHeight - v.view.clientHeight), y = d * local;
          gsap.to(img, { y: -y, duration: .5, ease: 'power3.out', overwrite: true });
          setThumb(v.th, v.view, img, local);
          const mImg = v.minis[i];
          if (mImg && v.frame && img.offsetHeight) {
            const k = mImg.offsetHeight / img.offsetHeight;
            gsap.to(v.frame, { y: y * k, height: v.view.clientHeight * k, duration: .5, ease: 'power3.out', overwrite: true });
          }
        }
      });
    });

    /* Flows pinned: one screen per step */
    flows.forEach(f => {
      const n = f.steps.length;
      ScrollTrigger.create({
        trigger: f.sec, start: 'top top', end: () => '+=' + innerHeight * .8 * n, pin: true,
        invalidateOnRefresh: true, refreshPriority: prio(f.sec),
        onUpdate: s => { f.show(Math.min(n - 1, Math.floor(s.progress * n))); gsap.set(f.rail, { scaleY: s.progress }); }
      });
    });

    return () => {
      viewers.forEach(v => { v.st = null; v.shots.forEach(s => gsap.set(s, { clearProps: 'transform' })); });
    };
  });

  /* ---------- Wall of pages drifting at different speeds ---------- */
  if (!reduce) $$('.ui-wall').forEach(wall => {
    $$('.wall-col', wall).forEach(col => {
      const amt = parseFloat(col.dataset.drift) || 20;
      const [from, to] = amt > 0 ? [0, -amt] : [amt, 0];
      gsap.fromTo(col, { yPercent: from }, { yPercent: to, ease: 'none', scrollTrigger: { trigger: wall, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
  });

  /* ---------- Rails: rows of screens drift, faster while you scroll ---------- */
  $$('.rail').forEach(r => {
    const track = $('.rail-track', r);
    const clone = track.innerHTML; track.insertAdjacentHTML('beforeend', clone);
    [...track.children].slice(track.children.length / 2).forEach(el => { el.setAttribute('aria-hidden', 'true'); $$('img', el).forEach(i => { i.alt = ''; }); });
    if (reduce) return;
    const dir = parseFloat(r.dataset.dir) || 1;
    let x = dir < 0 ? -50 : 0;
    gsap.ticker.add((t, dt) => {
      const v = window.__lenis ? window.__lenis.velocity : 0;
      x -= (.012 + Math.min(Math.abs(v), 80) * .004) * dir * (dt / 16.7);
      if (x <= -50) x += 50; if (x > 0) x -= 50;
      gsap.set(track, { xPercent: x });
    });
  });

  /* ---------- Screens tilt up into place ---------- */
  if (!reduce) $$('[data-tilt]').forEach(el => gsap.fromTo(el,
    { rotateX: 26, y: 110, scale: .92, autoAlpha: .3 },
    { rotateX: 0, y: 0, scale: 1, autoAlpha: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 35%', scrub: true } }));

  // Pins created here must be measured in page order before everything else.
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
})();
