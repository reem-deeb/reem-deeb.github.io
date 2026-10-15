/* All-projects page: 3D project wheel, filters, index with cursor preview, and the project viewer.
   Runs after case.js (GSAP, ScrollTrigger and window.__lenis are ready). */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const A = window.ARCHIVE;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lenis = () => window.__lenis;

  /* ---------- Viewer ---------- */
  const lb = $('#lb'), lbImg = $('#lbImg'), lbPanel = $('.lb-panel', lb);
  let cur = 0, opener = null, open = false;
  const fill = i => {
    const p = A.further[i];
    lbImg.src = `../assets/More/${p.id}.jpg`; lbImg.alt = p.name;
    $('#lbCat').textContent = A.L(A.CAT[p.cat]);
    $('#lbTitle').textContent = p.name;
    $('#lbSub').textContent = A.L(p.sub);
    $('#lbDesc').textContent = A.L(p.desc);
    $('#lbCount').textContent = `${String(i + 1).padStart(2, '0')} / ${String(A.further.length).padStart(2, '0')}`;
    // Projects with their own page get a link to the full case study.
    const cs = $('#lbCase');
    cs.hidden = !p.href;
    if (p.href) {
      cs.href = p.href; cs.dataset.wipe = p.wipe; cs.dataset.wipeLabel = p.name;
      cs.firstElementChild.textContent = A.L(A.UI.viewCase);
    }
  };
  const openLb = (i, from) => {
    cur = i; opener = from || document.activeElement; fill(i);
    lb.hidden = false; open = true;
    if (lenis()) lenis().stop();
    history.replaceState(null, '', '#' + A.further[i].id);
    if (hasGsap && !reduce) {
      gsap.timeline()
        .fromTo('.lb-backdrop', { opacity: 0 }, { opacity: 1, duration: .5, ease: 'power2.out' }, 0)
        .fromTo(lbPanel, { clipPath: 'inset(12% 10% 12% 10% round 40px)', y: 40 }, { clipPath: 'inset(0% 0% 0% 0% round 24px)', y: 0, duration: 1, ease: 'expo.out' }, 0)
        .fromTo(lbImg, { scale: 1.2 }, { scale: 1, duration: 1.4, ease: 'expo.out' }, 0)
        .fromTo($$('.lb-info > *', lb), { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .9, ease: 'expo.out', stagger: .06 }, .15);
    }
    $('.lb-close', lb).focus();
  };
  const closeLb = () => {
    if (!open) return; open = false;
    const done = () => { lb.hidden = true; if (lenis()) lenis().start(); if (opener) opener.focus({ preventScroll: true }); };
    history.replaceState(null, '', location.pathname + location.search);
    if (hasGsap && !reduce) {
      gsap.timeline({ onComplete: done })
        .to(lbPanel, { clipPath: 'inset(10% 8% 10% 8% round 40px)', y: 30, autoAlpha: 0, duration: .5, ease: 'power3.in' }, 0)
        .to('.lb-backdrop', { opacity: 0, duration: .5 }, .1)
        .set(lbPanel, { autoAlpha: 1 });
    } else done();
  };
  // Previous / next: the image slides out and the next one slides in from the same side.
  const step = d => {
    const n = A.further.length; const next = (cur + d + n) % n;
    if (!hasGsap || reduce) { cur = next; fill(cur); history.replaceState(null, '', '#' + A.further[cur].id); return; }
    const x = d * 60 * (document.documentElement.dir === 'rtl' ? -1 : 1);
    gsap.timeline()
      .to([lbImg, ...$$('.lb-info > :not(.lb-nav)', lb)], { x: -x, autoAlpha: 0, duration: .3, ease: 'power2.in', stagger: .02 })
      .add(() => { cur = next; fill(cur); history.replaceState(null, '', '#' + A.further[cur].id); })
      .fromTo([lbImg, ...$$('.lb-info > :not(.lb-nav)', lb)], { x }, { x: 0, autoAlpha: 1, duration: .7, ease: 'expo.out', stagger: .04 });
  };
  $$('[data-close]', lb).forEach(b => b.addEventListener('click', closeLb));
  $('#lbPrev').addEventListener('click', () => step(-1));
  $('#lbNext').addEventListener('click', () => step(1));
  document.addEventListener('keydown', e => {
    if (!open) return;
    const rtl = document.documentElement.dir === 'rtl';
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowRight') step(rtl ? -1 : 1);
    else if (e.key === 'ArrowLeft') step(rtl ? 1 : -1);
    else if (e.key === 'Tab') {
      // Keep focus inside the viewer.
      const f = $$('button, a.lb-case', lb).filter(b => b.offsetParent !== null), first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  $$('[data-open]').forEach(b => b.addEventListener('click', () => openLb(+b.dataset.open, b)));

  /* ---------- The wheel ---------- */
  const ring = $('#ring'), cards = $$('.ring-card', ring), filters = $$('.filter');
  const nameEl = $('#ringName'), countEl = $('#ringCount');
  let visible = cards.slice(), st = null, front = 0;
  const state = { rot: 0 };
  const geo = () => {
    const n = visible.length, w = cards[0].offsetWidth || 400;
    return { n, w, step: 360 / n, r: n > 2 ? (w / 2) / Math.tan(Math.PI / n) + w * .16 : w * .7 };
  };
  const setCaption = i => {
    const c = visible[i]; if (!c) return;
    nameEl.textContent = A.further[+c.dataset.i].name;
    countEl.textContent = `${String(i + 1).padStart(2, '0')} / ${String(visible.length).padStart(2, '0')}`;
  };
  // Draw the ring at the current rotation: cards facing away fade and dim.
  const render = () => {
    const { n, step, r } = geo();
    ring.style.transform = `translateZ(${-r}px) rotateY(${state.rot}deg)`;
    let best = 0, bestCos = -2;
    visible.forEach((c, j) => {
      let a = (j * step + state.rot) % 360; if (a > 180) a -= 360; if (a < -180) a += 360;
      const cos = Math.cos(a * Math.PI / 180);
      if (cos > bestCos) { bestCos = cos; best = j; }
      c.style.opacity = String(.15 + .85 * Math.pow(Math.max(0, (cos + 1) / 2), 2.2));
      c.style.filter = `brightness(${.45 + .55 * Math.max(0, cos)})`;
    });
    if (best !== front || !visible[front] || !visible[front].classList.contains('is-front')) {
      front = best;
      cards.forEach(c => c.classList.remove('is-front'));
      visible[front].classList.add('is-front');
      setCaption(front);
    }
  };
  // Each card's place on the ring. The transform is written by hand because the order matters:
  // rotate around the ring's centre first, then push out to the rim (GSAP would translate first).
  const pos = new Map();
  const write = c => {
    const p = pos.get(c);
    c.style.transform = `rotateY(${p.a}deg) translateZ(${p.z}px) scale(${p.s})`;
    c.style.visibility = p.s < .02 ? 'hidden' : '';
  };
  const place = animate => {
    const { step, r } = geo();
    cards.forEach(c => {
      const j = visible.indexOf(c);
      const prevA = pos.has(c) ? pos.get(c).a : 0;
      const to = j < 0 ? { a: prevA, z: r * .4, s: 0 } : { a: j * step, z: r, s: 1 };
      c.hidden = j < 0 && !desktopWheel();
      if (!pos.has(c)) pos.set(c, { ...to, s: j < 0 ? 0 : 1 });
      if (animate && hasGsap) gsap.to(pos.get(c), { ...to, duration: 1.1, ease: 'expo.inOut', overwrite: 'auto', onUpdate: () => write(c) });
      else { Object.assign(pos.get(c), to); write(c); }
    });
  };
  const desktopWheel = () => innerWidth >= 768 && hasGsap && !reduce;

  const buildScroll = () => {
    if (st) { st.kill(); st = null; }
    if (!desktopWheel()) return;
    const { n, step } = geo();
    state.rot = 0;
    st = ScrollTrigger.create({
      trigger: '#wheel', start: 'top top', end: () => '+=' + innerHeight * .5 * Math.max(2, n), pin: true, invalidateOnRefresh: true,
      refreshPriority: 10,
      onUpdate: s => gsap.to(state, { rot: -s.progress * (n - 1) * step, duration: .8, ease: 'power3.out', overwrite: true, onUpdate: render })
    });
    render();
  };

  const applyFilter = (f, animate) => {
    filters.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === f)));
    visible = cards.filter(c => f === 'all' || c.dataset.cat === f);
    if (!desktopWheel()) { cards.forEach(c => { c.hidden = !visible.includes(c); }); ring.scrollLeft = 0; return; }
    place(animate);
    buildScroll();
    ScrollTrigger.refresh();
    if (animate) {
      // Bring the wheel back to its first card.
      const y = st.start + 2;
      lenis() ? lenis().scrollTo(y, { duration: 1 }) : scrollTo(0, y);
    }
  };
  filters.forEach(b => b.addEventListener('click', () => applyFilter(b.dataset.filter, true)));

  // A side card turns the wheel to it; the front card opens the viewer.
  cards.forEach(c => c.addEventListener('click', () => {
    const j = visible.indexOf(c);
    if (!st || j === front) { openLb(+c.dataset.i, c); return; }
    const y = st.start + (j / Math.max(1, visible.length - 1)) * (st.end - st.start);
    lenis() ? lenis().scrollTo(y, { duration: 1.2 }) : scrollTo(0, y);
  }));

  if (hasGsap) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
      cards.forEach(c => { c.hidden = false; });
      place(false); buildScroll();
      // The wheel rises into view.
      // Animate the stage, not the ring: the ring's own transform carries the rotation.
      gsap.from('.ring-stage', { y: 120, scale: .85, autoAlpha: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '#wheel', start: 'top 70%' } });
      return () => { if (st) st.kill(); st = null; pos.clear(); cards.forEach(c => { c.style.transform = ''; c.style.visibility = ''; c.style.opacity = ''; c.style.filter = ''; }); ring.style.transform = ''; };
    });
    ScrollTrigger.sort(); ScrollTrigger.refresh();
  }
  if (!desktopWheel()) setCaption(0);

  /* ---------- Index: rows rise in; a preview follows the cursor ---------- */
  if (hasGsap && !reduce) {
    $$('.ix-list').forEach(list => gsap.from($$('.ix-row', list), {
      y: 50, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: .06, scrollTrigger: { trigger: list, start: 'top 85%' }
    }));
  }
  const prev = $('.ix-preview'), pImg = $('#ixImg');
  if (prev && finePointer && hasGsap) {
    const px = gsap.quickTo(prev, 'x', { duration: .55, ease: 'power3' }), py = gsap.quickTo(prev, 'y', { duration: .55, ease: 'power3' });
    let lastX = 0;
    $$('.ix-row').forEach(r => {
      r.addEventListener('mouseenter', () => {
        pImg.src = `../assets/thumbs/${r.dataset.thumb}.jpg`;
        gsap.to(prev, { autoAlpha: 1, scale: 1, duration: .5, ease: 'expo.out', overwrite: 'auto' });
      });
      r.addEventListener('mouseleave', () => gsap.to(prev, { autoAlpha: 0, scale: .6, duration: .4, ease: 'expo.out', overwrite: 'auto' }));
      r.addEventListener('mousemove', e => {
        px(e.clientX); py(e.clientY);
        // Tilt with horizontal speed for a little life.
        gsap.to(prev, { rotate: gsap.utils.clamp(-10, 10, (e.clientX - lastX) * .6), duration: .5, overwrite: 'auto' });
        lastX = e.clientX;
      });
    });
  }

  /* ---------- Open a project straight from the URL (links from the homepage menu) ---------- */
  const fromHash = () => {
    const i = A.further.findIndex(p => '#' + p.id === location.hash);
    if (i >= 0) setTimeout(() => openLb(i), html().classList.contains('entering') ? 1500 : 200);
  };
  const html = () => document.documentElement;
  fromHash();
})();
