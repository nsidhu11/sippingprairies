/* =================================================================
   SIPPING PRAIRIES — "The Long Light"
   Lenis + GSAP on one rAF loop. Everything gated for motion safety.
   ================================================================= */
(function () {
  'use strict';

  /* ----- IF YOU WANT TO COLLECT EMAILS: paste your form endpoint -----
     Create a free form at https://formspree.io (or use Netlify Forms) and
     paste the URL below. Until then the form shows a friendly confirmation
     without storing anything.                                            */
  const FORM_ENDPOINT = '';

  /* ----- Placeholder catalogue for the New Arrivals grid -------------
     Swap these for your real inventory later. Each row is:
     [ name, price, rating(1-5), reviewCount, size, badge('best'|'limited'|'') ] */
  const ARRIVALS = {
    whisky: [
      ['Prairie Reserve Single Malt', '72.00', 5, 18, '750ml', 'best'],
      ['Sundown Rye', '54.00', 4, 9, '750ml', ''],
      ['Cattle Trail Bourbon', '63.50', 5, 22, '750ml', 'best'],
      ['Twice-Barrelled Reserve', '88.00', 4, 6, '700ml', 'limited'],
      ['Old Fort Whisky', '46.00', 4, 14, '1L', ''],
      ['High Plains 12 Year', '110.00', 5, 11, '750ml', 'best'],
      ['Homestead Blend', '39.00', 3, 7, '750ml', ''],
    ],
    wine: [
      ['Prairie Vineyards Cabernet', '28.00', 5, 15, '750ml', 'best'],
      ['Golden Hour Chardonnay', '24.00', 4, 8, '750ml', ''],
      ['Sundown Rosé', '22.50', 4, 12, '750ml', ''],
      ['Harvest Reserve Merlot', '34.00', 5, 19, '750ml', 'best'],
      ['Open Range Pinot Noir', '41.00', 4, 6, '750ml', 'limited'],
      ['Wildflower Riesling', '19.00', 3, 5, '750ml', ''],
      ['Cellar Door Shiraz', '37.50', 5, 10, '750ml', 'best'],
    ],
    vodka: [
      ['Clear Creek Vodka', '26.00', 5, 14, '750ml', 'best'],
      ['Frost Line Vodka', '31.00', 4, 7, '1L', ''],
      ['Prairie Wheat Vodka', '23.50', 4, 11, '750ml', ''],
      ['Silver Spur Vodka', '45.00', 5, 9, '750ml', 'best'],
      ['Snowmelt Vodka', '29.00', 4, 6, '750ml', ''],
      ['Northern Light Vodka', '52.00', 5, 8, '700ml', 'limited'],
      ['Pure Plains Vodka', '21.00', 3, 4, '750ml', ''],
    ],
    beer: [
      ['Prairie Lager · 6 pack', '15.00', 5, 21, '6×355ml', 'best'],
      ['Saddle Up Pale Ale', '16.50', 4, 9, '6×355ml', ''],
      ['Wheatfield Wheat', '14.00', 4, 13, '6×355ml', ''],
      ['Dusty Trail IPA', '18.00', 5, 17, '6×355ml', 'best'],
      ['Campfire Amber', '17.00', 4, 7, '6×355ml', ''],
      ['Homestead Stout', '19.50', 5, 6, '4×440ml', 'limited'],
      ['Ranch Hand Pilsner', '13.50', 3, 5, '6×355ml', ''],
    ],
  };

  const root = document.documentElement;
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  const hasGSAP = !!(gsap && ST);
  if (hasGSAP) {
    gsap.registerPlugin(ST);
    if (window.CustomEase) {
      gsap.registerPlugin(window.CustomEase);
      window.CustomEase.create('longLight', 'M0,0 C0.16,1 0.3,1 1,1');
      window.CustomEase.create('press', 'M0,0 C0.22,1 0.36,1 1,1');
    }
    if (window.SplitText) gsap.registerPlugin(window.SplitText);
  }
  const EASE = (hasGSAP && window.CustomEase) ? 'longLight' : 'power3.out';

  const prefersReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const forcedReduce  = localStorage.getItem('sp-motion') === 'reduce';
  const REDUCE = prefersReduce || forcedReduce || !hasGSAP;

  if (!REDUCE) root.classList.add('anim');
  if (forcedReduce) root.classList.add('reduce');

  let lenis = null;
  let heroTl = null;

  /* ============================================================ */
  /* UNIVERSAL (works with or without motion)                     */
  /* ============================================================ */
  function lockScroll(on) { root.classList.toggle('is-locked', on); }

  function setupAnchors() {
    $$('a[href^="#"]').forEach((a) => {
      const id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      a.addEventListener('click', (e) => {
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        closeMenu();
        if (lenis) lenis.scrollTo(target, { offset: -64, duration: 1.1 });
        else target.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth' });
      });
    });
  }

  function setupMenu() {
    const nav = $('#nav');
    const burger = $('#navBurger');
    if (!burger) return;
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
  }
  function closeMenu() {
    const nav = $('#nav');
    if (!nav) return;
    nav.classList.remove('is-open');
    const b = $('#navBurger');
    if (b) b.setAttribute('aria-expanded', 'false');
  }

  function setupForm() {
    const form = $('#notifyForm');
    if (!form) return;
    const input = $('#email');
    const msg = $('#notify-msg');
    const field = $('.field');
    const hp = form.querySelector('.hp');

    const fail = () => {
      msg.textContent = 'Something went wrong — try again in a moment.';
      msg.className = 'notify__msg is-error';
    };
    const success = () => {
      msg.textContent = "You're on the list. See you at sundown.";
      msg.className = 'notify__msg is-ok';
      input.value = '';
      input.disabled = true;
      celebrate();
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      msg.className = 'notify__msg';
      if (hp && hp.value) return; // honeypot tripped → silently ignore
      const val = (input.value || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val)) {
        field.classList.add('is-invalid');
        msg.textContent = 'Please enter a valid email address.';
        msg.className = 'notify__msg is-error';
        input.focus();
        return;
      }
      field.classList.remove('is-invalid');
      if (FORM_ENDPOINT) {
        fetch(FORM_ENDPOINT, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) })
          .then((r) => (r.ok ? success() : fail()))
          .catch(fail);
      } else {
        success();
      }
    });
  }

  function celebrate() {
    const el = $('.notify__celebrate');
    if (!el || REDUCE || !hasGSAP) return;
    gsap.killTweensOf(el);
    gsap.fromTo(el,
      { autoAlpha: 0, scale: 0.5, y: 30 },
      { autoAlpha: 1, scale: 1, y: 0, duration: 0.7, ease: 'back.out(1.6)' });
    gsap.to(el, { autoAlpha: 0, duration: 0.6, delay: 2.4 });
  }

  function setupToggle() {
    const t = $('#motionToggle');
    if (!t) return;
    const isOn = localStorage.getItem('sp-motion') === 'reduce';
    t.setAttribute('aria-pressed', String(isOn));
    t.addEventListener('click', () => {
      if (localStorage.getItem('sp-motion') === 'reduce') localStorage.removeItem('sp-motion');
      else localStorage.setItem('sp-motion', 'reduce');
      location.reload();
    });
  }

  /* ============================================================ */
  /* AGE GATE                                                      */
  /* ============================================================ */
  function setupAgeGate() {
    const gate = $('#agegate');
    const under18 = $('#under18');
    if (!gate) { startBoot(); return; }

    if (sessionStorage.getItem('sp-age') === 'ok') {
      gate.style.display = 'none';
      startBoot();
      return;
    }

    lockScroll(true);
    // focus trap
    const focusables = $$('button, a[href]', gate);
    const first = focusables[0], last = focusables[focusables.length - 1];
    setTimeout(() => { const ok = gate.querySelector('[data-age="ok"]'); ok && ok.focus(); }, 80);
    gate.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    gate.addEventListener('click', (e) => {
      const choice = e.target.closest('[data-age]');
      if (!choice) return;
      if (choice.dataset.age === 'ok') {
        sessionStorage.setItem('sp-age', 'ok');
        dismissGate(gate);
      } else {
        gate.style.display = 'none';
        under18.hidden = false;
      }
    });
  }

  function dismissGate(gate) {
    const done = () => { gate.style.display = 'none'; startBoot(); };
    if (REDUCE || !hasGSAP) {
      gate.style.opacity = '0';
      gate.style.transition = 'opacity .4s';
      setTimeout(done, 400);
      return;
    }
    gsap.timeline({ onComplete: done })
      .to('.agegate__card', { y: -12, scale: 0.98, duration: 0.35, ease: 'press' })
      .to(gate, { autoAlpha: 0, duration: 0.6, ease: EASE }, '-=0.1');
  }

  /* ============================================================ */
  /* BOOT / PRELOADER                                              */
  /* ============================================================ */
  const sessionGet = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const sessionSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) {} };

  let booted = false;
  function startBoot() {
    if (booted) return;
    booted = true;
    lockScroll(true);

    const pl = $('#preloader');
    // The loader is a first-impression, not a per-page event. Once we've
    // booted in this session, later pages skip it and just fade in fast.
    const returning = sessionGet('sp-booted') === '1';
    const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();

    // Hand the page over once it's ready to be seen.
    const reveal = () => {
      lockScroll(false);
      if (lenis) lenis.start();
      if (heroTl) heroTl.play();
      ST.refresh();
      scrollToHashOnLoad();
    };

    if (REDUCE) {
      // No choreography — just reveal.
      const finish = () => { lockScroll(false); initReducedExtras(); };
      if (pl) {
        if (hasGSAP) gsap.to(pl, { autoAlpha: 0, duration: returning ? 0 : 0.4, onComplete: () => { pl.style.display = 'none'; finish(); } });
        else { pl.style.display = 'none'; finish(); }
      } else { finish(); }
      sessionSet('sp-booted', '1');
      return;
    }

    // Returning within the session → no loading screen. The CSS already
    // hides the preloader pre-paint; build motion and reveal immediately.
    if (returning) {
      if (pl) pl.style.display = 'none';
      buildMotion();
      reveal();
      return;
    }

    // First load of the session → the one and only choreographed preloader.
    sessionSet('sp-booted', '1');
    const fill = $('.preloader__fill');
    gsap.set('.preloader__wordmark', { autoAlpha: 0, y: 10 });
    gsap.set('.preloader__line', { autoAlpha: 0 });
    gsap.timeline()
      .to('.preloader__wordmark', { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE })
      .to(fill, { scaleX: 1, duration: 1.1, ease: 'power1.inOut' }, '-=0.25')
      .to('.preloader__line', { autoAlpha: 1, duration: 0.5 }, '-=0.7');

    Promise.all([fontsReady, wait(950)]).then(() => {
      buildMotion();
      const out = gsap.timeline();
      out.to(pl, { autoAlpha: 0, duration: 0.7, ease: EASE, onComplete: () => { if (pl) pl.style.display = 'none'; } })
         .add(reveal, '-=0.25');
    });
  }

  // Deep-link support: if the page loaded with a #hash, scroll to it after boot.
  function scrollToHashOnLoad() {
    const h = location.hash;
    if (!h || h.length < 2) return;
    let target;
    try { target = document.querySelector(h); } catch (e) { return; }
    if (!target) return;
    setTimeout(() => {
      if (lenis) lenis.scrollTo(target, { offset: -64, duration: 0.9, force: true });
      else target.scrollIntoView();
    }, 450);
  }

  /* ============================================================ */
  /* REDUCED-MOTION EXTRAS                                         */
  /* ============================================================ */
  function initReducedExtras() {
    const nav = $('#nav');
    const onScroll = () => {
      nav.classList.toggle('is-stuck', window.scrollY > 80);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      root.style.setProperty('--progress', h > 0 ? ((window.scrollY / h) * 100).toFixed(1) : '0');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    scrollToHashOnLoad();
  }

  /* ============================================================ */
  /* MOTION SUITE                                                  */
  /* ============================================================ */
  function buildMotion() {
    initLenis();
    setupMasterLight();
    setupNav();
    setupReveals();
    setupSplits();
    setupHero();
    setupHosts();
    setupOffers();

    // Desktop, fine-pointer, motion-on only
    gsap.matchMedia().add('(hover: hover) and (pointer: fine) and (min-width: 768px)', () => {
      setupMagnetic();
      setupMeet();
    });

    ST.refresh();
  }

  function initLenis() {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true, syncTouch: false, autoRaf: false });
    lenis.stop();
    lenis.on('scroll', ST.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  function setupMasterLight() {
    const blue = '.sky__layer--bluehour', gold = '.sky__layer--golden',
          dusk = '.sky__layer--dusk', night = '.sky__layer--night';
    gsap.set([gold, dusk, night], { opacity: 0 });
    gsap.set(blue, { opacity: 1 });
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 0.8 },
    });
    tl.to(blue, { opacity: 0, duration: 1 }, 0)
      .to(gold, { opacity: 1, duration: 1 }, 0)
      .to(gold, { opacity: 0, duration: 1 }, 1)
      .to(dusk, { opacity: 1, duration: 1 }, 1)
      .to(dusk, { opacity: 0, duration: 1 }, 2)
      .to(night, { opacity: 1, duration: 1 }, 2)
      .to('.sky__stars', { opacity: 0.9, duration: 1 }, 2.2);
    // Sun sinks + drifts across the whole journey
    gsap.to('.sky__sun', {
      yPercent: 130, xPercent: -14, opacity: 0.05, ease: 'none',
      scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: 1 },
    });
  }

  function setupNav() {
    const nav = $('#nav');
    ST.create({ start: 'top -90', end: 99999, toggleClass: { targets: nav, className: 'is-stuck' } });

    ST.create({
      trigger: root, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => root.style.setProperty('--progress', (self.progress * 100).toFixed(1)),
    });

    const moveNav = gsap.quickTo(nav, 'yPercent', { duration: 0.4, ease: EASE });
    ST.create({
      start: 0, end: 99999,
      onUpdate: (self) => {
        if (self.scroll() < 140) { moveNav(0); return; }
        const v = self.getVelocity();
        if (v > 250) moveNav(-130);
        else if (v < -150) moveNav(0);
      },
    });

    $$('.nav__links a').forEach((a) => {
      const sec = $(a.getAttribute('href'));
      if (!sec) return;
      ST.create({
        trigger: sec, start: 'top 55%', end: 'bottom 45%',
        onToggle: (self) => a.classList.toggle('is-current', self.isActive),
      });
    });
  }

  function setupReveals() {
    gsap.set('[data-reveal]', { y: 26 });
    ST.batch('[data-reveal]', {
      start: 'top 88%',
      once: true,
      onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.08, overwrite: true }),
    });
  }

  function setupSplits() {
    if (!window.SplitText) {
      $$('[data-split]').forEach((el) => gsap.set(el, { autoAlpha: 1 }));
      return;
    }
    $$('[data-split]').forEach((el) => {
      const split = new SplitText(el, { type: 'lines', linesClass: 'split-line', mask: 'lines' });
      gsap.set(split.lines, { yPercent: 115, autoAlpha: 1 });
      gsap.set(el, { autoAlpha: 1 });
      ST.create({
        trigger: el, start: 'top 86%', once: true,
        onEnter: () => gsap.to(split.lines, { yPercent: 0, duration: 1, ease: EASE, stagger: 0.09 }),
      });
    });
  }

  function setupHero() {
    const ins = $$('.hero__title .line__in');

    gsap.set(ins, { yPercent: 115 });
    gsap.set(['.hero__eyebrow', '.hero__sub', '.hero__cta', '.hero__scroll'], { autoAlpha: 0, y: 22 });
    gsap.set('.hero__bg', { scale: 1.1 });

    heroTl = gsap.timeline({ paused: true });
    heroTl
      .to('.hero__bg', { scale: 1.02, duration: 2.4, ease: EASE }, 0)
      .to('.hero__eyebrow', { autoAlpha: 1, y: 0, duration: 0.7, ease: EASE }, 0.25)
      .to(ins, { yPercent: 0, duration: 1.1, ease: EASE, stagger: 0.12 }, 0.35)
      .to('.hero__sub', { autoAlpha: 1, y: 0, duration: 0.8, ease: EASE }, 0.75)
      .to('.hero__cta', { autoAlpha: 1, y: 0, duration: 0.8, ease: EASE }, 0.95)
      .to('.hero__scroll', { autoAlpha: 1, y: 0, duration: 0.6 }, 1.15);

    // Gentle parallax drift on the photo as you leave the hero (within overscan)
    gsap.to('.hero__bg', {
      yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 0.8 },
    });
  }

  function setupHosts() {
    $$('[data-host]').forEach((host) => {
      gsap.set(host, { autoAlpha: 0, x: 44, y: 18 });
      ST.create({
        trigger: host, start: 'top 88%', once: true,
        onEnter: () => gsap.to(host, { autoAlpha: 1, x: 0, y: 0, duration: 1.1, ease: EASE }),
      });
    });

    // Shelf cards
    gsap.set('[data-card]', { y: 40 });
    ST.batch('[data-card]', {
      start: 'top 90%', once: true,
      onEnter: (els) => gsap.to(els, { autoAlpha: 1, y: 0, duration: 0.8, ease: EASE, stagger: 0.08 }),
    });

    // Heroes background ken-burns
    gsap.fromTo('.heroes__scene', { scale: 1.12 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.heroes', start: 'top bottom', end: 'bottom top', scrub: 1 },
    });
  }

  function setupOffers() {
    const sec = $('.offers');
    if (!sec) return;
    const numEl = $('.offers__num');
    const counter = { v: 0 };
    const tl = gsap.timeline({
      scrollTrigger: { trigger: sec, start: 'top 72%', end: 'center 45%', scrub: 0.7 },
    });
    tl.fromTo('.offers__glint', { xPercent: 0, autoAlpha: 0 },
        { xPercent: 380, autoAlpha: 1, ease: 'none', duration: 2 }, 0)
      .fromTo(counter, { v: 0 }, {
        v: 8, ease: 'none', duration: 1.4, snap: { v: 1 },
        onUpdate: () => { if (numEl) numEl.textContent = Math.round(counter.v); },
      }, 0)
      .from('.offers__pct', { autoAlpha: 0, x: -12, duration: 0.6 }, 0.7);

    // gentle oak depth
    gsap.to('.offers__stave', {
      yPercent: (i) => (i % 2 ? 6 : -6), ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: 1 },
    });
  }

  /* ---------- Desktop-only delight ---------- */
  function setupMagnetic() {
    $$('.btn--seal').forEach((btn) => {
      const mx = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3' });
      const my = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3' });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.3);
        my((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      btn.addEventListener('pointerleave', () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' });
      });
      btn.addEventListener('pointerdown', () => sealPop(btn));
    });
  }

  function sealPop(btn) {
    let pop = btn.querySelector('.seal-pop');
    if (!pop) { pop = document.createElement('span'); pop.className = 'seal-pop'; btn.appendChild(pop); }
    gsap.fromTo(pop, { scale: 0, autoAlpha: 0.9 },
      { scale: 1.35, autoAlpha: 0, duration: 0.6, ease: 'elastic.out(1,0.5)' });
  }

  function setupMeet() {
    const fig = $('.meet__figure'); const host = $('.meet__host');
    if (!fig || !host) return;
    const mx = gsap.quickTo(host, 'x', { duration: 0.5, ease: 'power3' });
    const my = gsap.quickTo(host, 'y', { duration: 0.5, ease: 'power3' });
    fig.addEventListener('pointermove', (e) => {
      const r = fig.getBoundingClientRect();
      mx((e.clientX - (r.left + r.width / 2)) * 0.14);
      my((e.clientY - (r.top + r.height / 2)) * 0.14);
    });
    fig.addEventListener('pointerleave', () => {
      gsap.to(host, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1,0.4)' });
    });
  }

  /* ============================================================ */
  /* GO                                                            */
  /* ============================================================ */
  let toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-show'), 2800);
  }

  function setupArrivals() {
    const grid = $('#arrivalsGrid');
    const promoCard = $('#promoCard');
    if (!grid) return;
    const tabs = $$('.arrivals__tabs .tab');
    const label = { whisky: 'Whisky', wine: 'Wine', vodka: 'Vodka', beer: 'Beer' };
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const pool = ['prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-rum', 'prod-whisky', 'prod-vodka', 'prod-tequila'];
    const offset = { whisky: 0, wine: 2, vodka: 4, beer: 6 };

    const card = (p, cat, i) => {
      const img = pool[((offset[cat] || 0) + i) % pool.length];
      const badge = p[5] === 'best' ? '<span class="pcard__badge pcard__badge--best">Best Seller</span>'
        : p[5] === 'limited' ? '<span class="pcard__badge pcard__badge--limited">Limited Edition</span>' : '';
      return `<article class="pcard">
        <div class="pcard__media">${badge}<img src="assets/img/${img}.webp" alt="${esc(p[0])}" loading="lazy" /></div>
        <div class="pcard__body">
          <p class="pcard__cat">${label[cat]}</p>
          <h3 class="pcard__name">${esc(p[0])}</h3>
          <p class="pcard__price">$${esc(p[1])}</p>
          <div class="pcard__meta"><span class="chip">${esc(p[4])}</span><span class="pcard__stock">In Stock</span></div>
        </div>
      </article>`;
    };

    const render = (cat) => {
      $$('.pcard:not(.pcard--promo)', grid).forEach((el) => el.remove());
      const html = (ARRIVALS[cat] || []).map((p, i) => card(p, cat, i)).join('');
      if (promoCard) promoCard.insertAdjacentHTML('beforebegin', html);
      else grid.insertAdjacentHTML('beforeend', html);
      if (hasGSAP && !REDUCE) {
        gsap.fromTo($$('.pcard:not(.pcard--promo)', grid), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.04, ease: EASE, overwrite: true });
      }
    };

    tabs.forEach((t) => t.addEventListener('click', () => {
      tabs.forEach((x) => { x.classList.remove('is-active'); x.setAttribute('aria-selected', 'false'); });
      t.classList.add('is-active'); t.setAttribute('aria-selected', 'true');
      render(t.dataset.cat);
    }));

    render('whisky');
  }

  // Promo cell: play the video, then hold the image 5s, then replay — looping.
  function setupPromoMedia() {
    const card = $('#promoCard');
    if (!card) return;
    const video = card.querySelector('.promo-media__video');
    const img = card.querySelector('.promo-media__img');
    if (!video || !img) return;
    if (REDUCE) { img.classList.add('is-show'); return; }

    // Ensure muted autoplay is permitted (property, not just attribute)
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    let imgTimer, started = false;
    const playVideo = () => {
      img.classList.remove('is-show');
      try { video.currentTime = 0; } catch (e) {}
      const pr = video.play();
      if (pr && pr.catch) pr.catch(() => {});
    };
    const showImage = () => {
      video.pause();
      img.classList.add('is-show');
      clearTimeout(imgTimer);
      imgTimer = setTimeout(playVideo, 5000);
    };
    video.addEventListener('ended', showImage);

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          if (!started) { started = true; playVideo(); }
          else if (!img.classList.contains('is-show')) { const pr = video.play(); if (pr && pr.catch) pr.catch(() => {}); }
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.25 });
    io.observe(card);
  }

  /* ---------- Shop page: filterable catalogue ---------- */
  function setupShop() {
    const grid = $('#shopGrid');
    if (!grid) return;
    const groupsEl = $('#shopFilterGroups');
    const filtersEl = $('#shopFilters');
    const countEl = $('#shopCount');
    const emptyEl = $('#shopEmpty');
    const sortEl = $('#shopSort');
    const overlay = $('#shopOverlay');
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    /* Placeholder catalogue — swap for real inventory later.
       { n: name, c: category, b: brand, p: price, s: size, y: age, badge } */
    const CATALOG = [
      { n: 'Prairie Reserve Single Malt', c: 'Whisky', b: 'Prairie Reserve', p: 72, s: '750ml', y: '12 Year', badge: 'best' },
      { n: 'Cattle Trail Bourbon', c: 'Whisky', b: 'Cattle Trail', p: 63, s: '750ml', y: '10 Year', badge: '' },
      { n: 'Old Fort Rye', c: 'Whisky', b: 'Old Fort', p: 46, s: '1L', y: 'No Age', badge: '' },
      { n: 'High Plains 12 Year', c: 'Whisky', b: 'High Plains', p: 110, s: '750ml', y: '12 Year', badge: 'best' },
      { n: 'High Plains 18 Year', c: 'Whisky', b: 'High Plains', p: 165, s: '750ml', y: '18 Year', badge: 'limited' },
      { n: 'Homestead Blend', c: 'Whisky', b: 'Homestead', p: 39, s: '750ml', y: 'No Age', badge: '' },
      { n: 'Cattle Trail 15 Year Reserve', c: 'Whisky', b: 'Cattle Trail', p: 92, s: '700ml', y: '15 Year', badge: '' },
      { n: 'Golden Hour Chardonnay', c: 'Wine', b: 'Golden Hour', p: 24, s: '750ml', y: 'No Age', badge: '' },
      { n: 'Sundown Rosé', c: 'Wine', b: 'Sundown', p: 22, s: '750ml', y: 'No Age', badge: '' },
      { n: 'Prairie Vineyards Cabernet', c: 'Wine', b: 'Prairie Reserve', p: 28, s: '750ml', y: 'No Age', badge: 'best' },
      { n: 'Golden Hour Merlot', c: 'Wine', b: 'Golden Hour', p: 34, s: '750ml', y: 'No Age', badge: '' },
      { n: 'Sundown Pinot Noir', c: 'Wine', b: 'Sundown', p: 41, s: '750ml', y: 'No Age', badge: 'limited' },
      { n: 'Clear Creek Vodka', c: 'Vodka', b: 'Clear Creek', p: 26, s: '750ml', y: 'No Age', badge: 'best' },
      { n: 'Silver Spur Vodka', c: 'Vodka', b: 'Silver Spur', p: 45, s: '750ml', y: 'No Age', badge: '' },
      { n: 'Clear Creek Reserve Vodka', c: 'Vodka', b: 'Clear Creek', p: 31, s: '1L', y: 'No Age', badge: '' },
      { n: 'Frost Line Vodka', c: 'Vodka', b: 'Silver Spur', p: 29, s: '1.75L', y: 'No Age', badge: '' },
      { n: 'Old Fort Spiced Rum', c: 'Rum', b: 'Old Fort', p: 34, s: '750ml', y: 'No Age', badge: '' },
      { n: 'Cattle Trail Dark Rum', c: 'Rum', b: 'Cattle Trail', p: 38, s: '750ml', y: '8 Year', badge: '' },
      { n: 'High Plains Aged Rum', c: 'Rum', b: 'High Plains', p: 52, s: '750ml', y: '10 Year', badge: 'best' },
      { n: 'Silver Spur Blanco', c: 'Tequila', b: 'Silver Spur', p: 44, s: '750ml', y: 'No Age', badge: '' },
      { n: 'Sundown Reposado', c: 'Tequila', b: 'Sundown', p: 58, s: '750ml', y: 'No Age', badge: 'limited' },
      { n: 'Golden Hour Añejo', c: 'Tequila', b: 'Golden Hour', p: 72, s: '750ml', y: 'No Age', badge: 'best' },
      { n: 'Clear Creek Dry Gin', c: 'Gin', b: 'Clear Creek', p: 33, s: '750ml', y: 'No Age', badge: '' },
      { n: 'Prairie Reserve Gin', c: 'Gin', b: 'Prairie Reserve', p: 39, s: '375ml', y: 'No Age', badge: '' },
      { n: 'Prairie Lager · 6 pack', c: 'Beer', b: 'Prairie Reserve', p: 15, s: '6-pack', y: 'No Age', badge: '' },
      { n: 'High Plains IPA · 6 pack', c: 'Beer', b: 'High Plains', p: 18, s: '6-pack', y: 'No Age', badge: 'best' },
    ];

    // assign an image per product (cycled within category)
    const CAT_IMG = {
      Whisky: ['prod-whisky', 'prod-1', 'prod-2'], Wine: ['prod-3', 'prod-2'], Vodka: ['prod-vodka'],
      Rum: ['prod-rum'], Tequila: ['prod-tequila'], Gin: ['prod-4'], Beer: ['prod-1'],
    };
    const catCounter = {};
    CATALOG.forEach((p) => { const l = CAT_IMG[p.c] || ['prod-1']; const i = (catCounter[p.c] = (catCounter[p.c] || 0) + 1) - 1; p.img = l[i % l.length]; });

    const order = (arr, ref) => ref.filter((v) => arr.includes(v)).concat(arr.filter((v) => !ref.includes(v)));
    const uniq = (key) => [...new Set(CATALOG.map((p) => p[key]))];
    const cats = uniq('c');
    const brands = uniq('b').sort();
    const sizes = order(uniq('s'), ['375ml', '750ml', '700ml', '1L', '1.75L', '6-pack']);
    const years = order(uniq('y'), ['No Age', '8 Year', '10 Year', '12 Year', '15 Year', '18 Year']);
    const maxP = Math.ceil(Math.max(...CATALOG.map((p) => p.p)) / 5) * 5;
    const minP = Math.floor(Math.min(...CATALOG.map((p) => p.p)));

    const drop = (title, name, values, isPrice) => {
      const body = isPrice
        ? `<input type="range" class="fprice" id="shopPrice" min="${minP}" max="${maxP}" value="${maxP}" aria-label="Maximum price"><p class="fprice__label">Up to <strong id="shopPriceVal">$${maxP}</strong></p>`
        : values.map((v) => `<label class="fopt"><input type="checkbox" name="${name}" value="${esc(v)}"><span>${esc(v)}</span></label>`).join('');
      return `<div class="fdrop" data-name="${name}">
        <button class="fdrop__btn" type="button" aria-expanded="false">${title}<span class="fdrop__count" data-count="${name}"></span>
          <svg class="fdrop__chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>
        <div class="fdrop__panel" hidden>${body}</div>
      </div>`;
    };
    filtersEl.innerHTML = drop('Category', 'category', cats) + drop('Price', 'price', [], true) +
      drop('Brands', 'brand', brands) + drop('Size', 'size', sizes) + drop('Years', 'year', years);

    // open/close the filter dropdowns
    const closeDrops = () => $$('.fdrop', filtersEl).forEach((d) => {
      d.classList.remove('is-open');
      d.querySelector('.fdrop__btn').setAttribute('aria-expanded', 'false');
      d.querySelector('.fdrop__panel').hidden = true;
    });
    $$('.fdrop__btn', filtersEl).forEach((btn) => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const d = btn.closest('.fdrop'); const open = d.classList.contains('is-open');
      closeDrops();
      if (!open) { d.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); d.querySelector('.fdrop__panel').hidden = false; }
    }));
    $$('.fdrop__panel', filtersEl).forEach((pn) => pn.addEventListener('click', (e) => e.stopPropagation()));
    document.addEventListener('click', closeDrops);

    let view = 'grid';
    const checked = (name) => [...filtersEl.querySelectorAll(`input[name="${name}"]:checked`)].map((i) => i.value);

    const card = (p) => {
      const badge = p.badge === 'best' ? '<span class="pcard__badge pcard__badge--best">Best Seller</span>'
        : p.badge === 'limited' ? '<span class="pcard__badge pcard__badge--limited">Limited Edition</span>' : '';
      const yearChip = p.y !== 'No Age' ? `<span class="chip">${esc(p.y)}</span>` : '';
      const media = `<div class="pcard__media">${badge}<img src="assets/img/${p.img}.webp" alt="${esc(p.n)}" loading="lazy"></div>`;
      if (view === 'list') {
        return `<article class="pcard pcard--list">${media}
          <div class="pcard__body">
            <p class="pcard__cat">${esc(p.c)} · ${esc(p.b)}</p>
            <h3 class="pcard__name">${esc(p.n)}</h3>
            <div class="pcard__meta"><span class="chip">${esc(p.s)}</span>${yearChip}<span class="pcard__stock">In Stock</span></div>
          </div>
          <p class="pcard__price">$${p.p.toFixed(2)}</p>
        </article>`;
      }
      return `<article class="pcard">${media}
        <div class="pcard__body">
          <p class="pcard__cat">${esc(p.c)} · ${esc(p.b)}</p>
          <h3 class="pcard__name">${esc(p.n)}</h3>
          <p class="pcard__price">$${p.p.toFixed(2)}</p>
          <div class="pcard__meta"><span class="chip">${esc(p.s)}</span>${yearChip}<span class="pcard__stock">In Stock</span></div>
        </div>
      </article>`;
    };

    const render = () => {
      const fc = checked('category'), fb = checked('brand'), fs = checked('size'), fy = checked('year');
      const priceEl = $('#shopPrice');
      const maxPrice = priceEl ? +priceEl.value : maxP;
      const setA = (name, n, active) => {
        const btn = filtersEl.querySelector(`.fdrop[data-name="${name}"] .fdrop__btn`);
        if (!btn) return;
        btn.querySelector('.fdrop__count').textContent = n ? ` (${n})` : '';
        btn.classList.toggle('is-active', !!active);
      };
      setA('category', fc.length, fc.length); setA('brand', fb.length, fb.length);
      setA('size', fs.length, fs.length); setA('year', fy.length, fy.length);
      setA('price', 0, maxPrice < maxP);
      const clearBtn = $('#shopClear'); if (clearBtn) clearBtn.hidden = !(fc.length || fb.length || fs.length || fy.length || maxPrice < maxP);
      let list = CATALOG.filter((p) =>
        (!fc.length || fc.includes(p.c)) && (!fb.length || fb.includes(p.b)) &&
        (!fs.length || fs.includes(p.s)) && (!fy.length || fy.includes(p.y)) && p.p <= maxPrice);
      const sort = sortEl.value;
      if (sort === 'price-asc') list = list.slice().sort((a, b) => a.p - b.p);
      else if (sort === 'price-desc') list = list.slice().sort((a, b) => b.p - a.p);
      else if (sort === 'name') list = list.slice().sort((a, b) => a.n.localeCompare(b.n));
      countEl.textContent = `${list.length} product${list.length !== 1 ? 's' : ''}`;
      grid.innerHTML = list.map(card).join('');
      emptyEl.hidden = list.length > 0;
      if (hasGSAP && !REDUCE) gsap.fromTo(grid.children, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.025, ease: EASE, overwrite: true });
    };

    filtersEl.addEventListener('change', render);
    filtersEl.addEventListener('input', (e) => {
      if (e.target.id === 'shopPrice') { $('#shopPriceVal').textContent = '$' + e.target.value; render(); }
    });
    sortEl.addEventListener('change', render);
    $$('.shop__view button').forEach((btn) => btn.addEventListener('click', () => {
      $$('.shop__view button').forEach((b) => { b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('is-active'); btn.setAttribute('aria-pressed', 'true');
      view = btn.dataset.view; grid.classList.toggle('shop__grid--list', view === 'list'); render();
    }));
    const clearAll = () => {
      filtersEl.querySelectorAll('input[type=checkbox]').forEach((c) => { c.checked = false; });
      const pr = $('#shopPrice'); if (pr) { pr.value = maxP; $('#shopPriceVal').textContent = '$' + maxP; }
      render();
    };
    $('#shopClear') && $('#shopClear').addEventListener('click', clearAll);
    $('#shopClear2') && $('#shopClear2').addEventListener('click', clearAll);

    const openF = () => { filtersEl.classList.add('is-open'); if (overlay) overlay.hidden = false; };
    const closeF = () => { filtersEl.classList.remove('is-open'); if (overlay) overlay.hidden = true; };
    $('#shopFilterToggle') && $('#shopFilterToggle').addEventListener('click', openF);
    $('#shopFilterClose') && $('#shopFilterClose').addEventListener('click', closeF);
    overlay && overlay.addEventListener('click', closeF);

    render();
  }

  function setupCountdown() {
    const timer = $('.deal__timer');
    if (!timer) return;
    const elD = timer.querySelector('[data-cd="days"]');
    const elH = timer.querySelector('[data-cd="hours"]');
    const elM = timer.querySelector('[data-cd="mins"]');
    const elS = timer.querySelector('[data-cd="secs"]');
    const pad = (n) => String(n).padStart(2, '0');
    // Offer end date comes from data-deadline (falls back to end of current month).
    let target = timer.dataset.deadline ? new Date(timer.dataset.deadline) : null;
    if (!target || isNaN(target.getTime())) {
      const n = new Date();
      target = new Date(n.getFullYear(), n.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    let id;
    const tick = () => {
      const diff = target - new Date();
      if (diff <= 0) {
        elD.textContent = elH.textContent = elM.textContent = elS.textContent = '00';
        if (id) clearInterval(id);
        return;
      }
      const s = Math.floor(diff / 1000);
      elD.textContent = pad(Math.floor(s / 86400));
      elH.textContent = pad(Math.floor((s % 86400) / 3600));
      elM.textContent = pad(Math.floor((s % 3600) / 60));
      elS.textContent = pad(s % 60);
    };
    tick();
    id = setInterval(tick, 1000);
  }

  function init() {
    setupAnchors();
    setupMenu();
    setupForm();
    setupToggle();
    setupCountdown();
    setupArrivals();
    setupPromoMedia();
    setupShop();
    setupAgeGate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
