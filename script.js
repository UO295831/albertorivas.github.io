(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  /* ───────── Footer year ───────── */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ───────── Toast ───────── */
  const toast = $('#toast');
  let toastTimer;
  function showToast(message, variant = 'success') {
    toast.textContent = message;
    toast.dataset.variant = variant;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
  }

  /* ───────── Interactive network background ───────── */
  (() => {
    const canvas = $('#net');
    const ctx = canvas.getContext('2d');
    const LINK = 140;
    const MOUSE_R = 190;
    const mouse = { x: -9999, y: -9999 };
    let w = 0, h = 0, nodes = [], bursts = [], raf = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(110, Math.round((w * h) / 14000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
        r: Math.random() * 1.4 + .8,
      }));
      if (reduceMotion.matches) draw();
    }

    function move(n) {
      const dx = mouse.x - n.x, dy = mouse.y - n.y;
      const d = Math.hypot(dx, dy);
      if (d < MOUSE_R && d > 1) { n.vx += (dx / d) * .012; n.vy += (dy / d) * .012; }
      const speed = Math.hypot(n.vx, n.vy);
      if (speed > .9) { n.vx *= .9 / speed; n.vy *= .9 / speed; }
      n.x += n.vx; n.y += n.vy;
      if (n.x < -10) n.x = w + 10; else if (n.x > w + 10) n.x = -10;
      if (n.y < -10) n.y = h + 10; else if (n.y > h + 10) n.y = -10;
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const all = bursts.length ? nodes.concat(bursts) : nodes;

      ctx.lineWidth = 1;
      for (let i = 0; i < all.length; i++) {
        const a = all[i];
        for (let j = i + 1; j < all.length; j++) {
          const b = all[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(34, 211, 238, ${(1 - d / LINK) * .32})`;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const dm = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (dm < MOUSE_R) {
          ctx.strokeStyle = `rgba(167, 139, 250, ${(1 - dm / MOUSE_R) * .6})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      for (const n of all) {
        ctx.fillStyle = n.life ? `rgba(240, 171, 252, ${n.life / 90})` : 'rgba(165, 243, 252, .75)';
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    function frame() {
      nodes.forEach(move);
      bursts.forEach((b) => { b.x += b.vx; b.y += b.vy; b.vx *= .97; b.vy *= .97; b.life -= 1; });
      bursts = bursts.filter((b) => b.life > 0);
      draw();
      raf = requestAnimationFrame(frame);
    }

    function start() { if (!raf && !reduceMotion.matches) raf = requestAnimationFrame(frame); }
    function stop() { cancelAnimationFrame(raf); raf = 0; }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    window.addEventListener('pointerdown', (e) => {
      if (reduceMotion.matches || e.target.closest('a, button, input, textarea, label')) return;
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        bursts.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2, r: 1.8, life: 90 });
      }
    }, { passive: true });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    reduceMotion.addEventListener('change', () => { stop(); resize(); start(); });

    resize();
    start();
  })();

  /* ───────── Cursor glow + card spotlight ───────── */
  (() => {
    const glow = $('#cursor-glow');
    let gx = 0, gy = 0, pending = false;
    window.addEventListener('pointermove', (e) => {
      gx = e.clientX; gy = e.clientY;
      if (!pending) {
        pending = true;
        requestAnimationFrame(() => {
          glow.style.transform = `translate3d(${gx}px, ${gy}px, 0)`;
          glow.classList.add('is-on');
          pending = false;
        });
      }
      const card = e.target.closest && e.target.closest('.glass');
      if (card) {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      }
    }, { passive: true });
    document.addEventListener('pointerleave', () => glow.classList.remove('is-on'));
  })();

  /* ───────── Header, progress bar, timeline fill ───────── */
  (() => {
    const header = $('#header');
    const bar = $('#progress');
    const timeline = $('#timeline');
    let ticking = false;

    function update() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? clamp(window.scrollY / max, 0, 1) : 0})`;
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      if (timeline) {
        const r = timeline.getBoundingClientRect();
        const p = clamp((window.innerHeight * .65 - r.top) / r.height, 0, 1);
        timeline.style.setProperty('--p', p.toFixed(3));
      }
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  })();

  /* ───────── Mobile menu ───────── */
  (() => {
    const toggle = $('#nav-toggle');
    const menu = $('#mobile-menu');
    const iconUse = $('use', toggle);
    function setOpen(open) {
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      iconUse.setAttribute('href', open ? '#i-x' : '#i-menu');
    }
    toggle.addEventListener('click', () => setOpen(menu.hidden));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) { setOpen(false); toggle.focus(); }
    });
  })();

  /* ───────── Reveal on scroll + nav highlight + counters ───────── */
  (() => {
    const reveals = $$('.reveal');
    if (!('IntersectionObserver' in window)) {
      reveals.forEach((el) => el.classList.add('is-visible'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        });
      }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
      reveals.forEach((el) => io.observe(el));

      const links = new Map($$('.nav__link').map((a) => [a.getAttribute('href').slice(1), a]));
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          const link = links.get(en.target.id);
          if (link && en.isIntersecting) {
            links.forEach((l) => { l.classList.remove('is-active'); l.removeAttribute('aria-current'); });
            link.classList.add('is-active');
            link.setAttribute('aria-current', 'true');
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      $$('main section[id]').forEach((s) => spy.observe(s));
    }

    if (reduceMotion.matches || !('IntersectionObserver' in window)) return;
    const counters = $$('[data-count]');
    const co = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        co.unobserve(en.target);
        const end = Number(en.target.dataset.count);
        const t0 = performance.now();
        const tick = (now) => {
          const k = clamp((now - t0) / 1100, 0, 1);
          en.target.textContent = Math.round(end * (1 - Math.pow(1 - k, 3)));
          if (k < 1) requestAnimationFrame(tick);
        };
        en.target.textContent = '0';
        requestAnimationFrame(tick);
      });
    }, { threshold: .6 });
    counters.forEach((c) => co.observe(c));
  })();

  /* ───────── Role ticker ───────── */
  (() => {
    const el = $('#ticker');
    if (reduceMotion.matches) return;
    const roles = [
      'Artificial Intelligence Technician',
      'Process automation auditor',
      'Data and MLOps engineer',
      'Computer vision explorer',
    ];
    let r = 0, i = roles[0].length, deleting = true;
    function tick() {
      const word = roles[r];
      if (deleting) {
        i -= 1;
        if (i <= 0) { deleting = false; r = (r + 1) % roles.length; i = 0; }
      } else {
        i += 1;
        if (i >= roles[r].length) { deleting = true; el.textContent = roles[r]; return setTimeout(tick, 2200); }
      }
      el.textContent = (deleting ? word : roles[r]).slice(0, i);
      setTimeout(tick, deleting ? 28 : 55);
    }
    setTimeout(tick, 2600);
  })();

  /* ───────── Hero terminal ───────── */
  (() => {
    const body = $('#terminal');
    const lines = [
      ['p', '$ ', 'cmd', 'audit --scope enterprise'],
      ['', '', 'out', 'mapping automation workflows… done'],
      ['', '', 'out', 'measuring waiting time per step… done'],
      ['', '', 'warn', '! bottleneck found: approval step'],
      ['', '', 'out', 'queue upstream keeps growing'],
      ['p', '$ ', 'cmd', 'optimise --step approval'],
      ['', '', 'ok', '✔ workflow re-routed, waiting time down'],
      ['', '', 'ok', '✔ operational cost down, profitability up'],
    ];
    function render() {
      body.innerHTML = '';
      lines.forEach(([pClass, prefix, cls, text], idx) => {
        const row = document.createElement('div');
        row.className = 'term-line';
        row.style.setProperty('--d', `${500 + idx * 420}ms`);
        if (prefix) {
          const p = document.createElement('span');
          p.className = pClass; p.textContent = prefix;
          row.append(p);
        }
        const t = document.createElement('span');
        t.className = cls; t.textContent = text;
        row.append(t);
        body.append(row);
      });
    }
    render();
    $('#term-replay').addEventListener('click', render);
  })();

  /* ───────── Company logo fallbacks ───────── */
  $$('.t-logo').forEach((box) => {
    const img = $('img', box);
    const fallback = () => { box.textContent = box.dataset.fallback || ''; };
    if (!img) return fallback();
    img.addEventListener('error', fallback, { once: true });
    if (img.complete && img.naturalWidth === 0) fallback();
  });

  /* ───────── Projects: category + tool filters, URL state ───────── */
  (() => {
    const cards = $$('.project');
    const buttons = $$('.filter');
    const status = $('#tool-status');
    const toolLabel = $('#tool-label');
    const empty = $('#projects-empty');
    const params = new URLSearchParams(location.search);
    const state = { cat: params.get('cat') || 'all', tool: params.get('tool') || '' };
    if (!buttons.some((b) => b.dataset.cat === state.cat)) state.cat = 'all';

    $$('[data-n]').forEach((n) => {
      const c = n.dataset.n;
      n.textContent = c === 'all' ? cards.length : cards.filter((card) => card.dataset.cat === c).length;
    });

    function sync() {
      let shown = 0;
      cards.forEach((card) => {
        const okCat = state.cat === 'all' || card.dataset.cat === state.cat;
        const okTool = !state.tool || card.dataset.tools.split(' ').includes(state.tool);
        card.hidden = !(okCat && okTool);
        if (!card.hidden) shown += 1;
      });
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat)));
      status.hidden = !state.tool;
      if (state.tool) {
        const src = $(`.badge--tool[data-tool="${CSS.escape(state.tool)}"]`);
        toolLabel.textContent = src ? src.textContent : state.tool;
      }
      empty.hidden = shown > 0;
      $$('.badge--tool').forEach((b) => b.classList.toggle('badge--on', b.dataset.tool === state.tool));

      const next = new URLSearchParams();
      if (state.cat !== 'all') next.set('cat', state.cat);
      if (state.tool) next.set('tool', state.tool);
      const qs = next.toString();
      history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
    }

    buttons.forEach((b) => b.addEventListener('click', () => { state.cat = b.dataset.cat; sync(); }));
    $('#tool-clear').addEventListener('click', () => { state.tool = ''; sync(); });
    $$('.badge--tool').forEach((b) => b.addEventListener('click', () => {
      state.tool = state.tool === b.dataset.tool ? '' : b.dataset.tool;
      state.cat = 'all';
      sync();
      if (state.tool) $('#projects').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }));
    sync();
  })();

  /* ───────── Copy buttons ───────── */
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const t = document.createElement('textarea');
        t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.append(t); t.select();
        try { document.execCommand('copy'); } finally { t.remove(); }
      }
      const use = $('use', btn);
      btn.classList.add('is-done');
      use.setAttribute('href', '#i-check');
      showToast('Copied to clipboard');
      setTimeout(() => { btn.classList.remove('is-done'); use.setAttribute('href', '#i-copy'); }, 1600);
    });
  });

  /* ───────── Contact form (opens the email app) ───────── */
  (() => {
    const form = $('#contact-form');
    const status = $('#form-status');
    const fields = ['name', 'email', 'message'].map((k) => ({
      key: k, input: $(`#cf-${k}`), error: $(`#e-${k}`),
    }));
    const rules = {
      name: (v) => (v ? '' : 'Enter your name.'),
      email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter a valid email, like ada@example.com.'),
      message: (v) => (v.length >= 10 ? '' : 'Write at least 10 characters so I know how to help.'),
    };

    function check(f) {
      const msg = rules[f.key](f.input.value.trim());
      f.error.textContent = msg;
      f.input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      return msg;
    }
    fields.forEach((f) => f.input.addEventListener('blur', () => f.input.value && check(f)));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      status.textContent = ''; status.removeAttribute('data-state');
      const invalid = fields.filter((f) => check(f));
      if (invalid.length) {
        invalid[0].input.focus();
        status.dataset.state = 'error';
        status.textContent = 'Fix the highlighted fields and send again.';
        return;
      }
      const [name, email, message] = fields.map((f) => f.input.value.trim());
      const subject = encodeURIComponent(`Portfolio message from ${name}`);
      const body = encodeURIComponent(`${message}\n\n${name}\n${email}`);
      status.textContent = 'Opening your email app…';
      showToast('Opening your email app…');
      window.location.href = `mailto:albertorivasasal@gmail.com?subject=${subject}&body=${body}`;
    });
  })();
})();
