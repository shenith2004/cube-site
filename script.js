/* =========================================================================
   CobWebZ — site behaviour (vanilla JS, no build step)
   ========================================================================= */

/* -------------------------------------------------------------------------
   CONFIGURATION — edit these values before going live.
   Empty values are hidden on the page, so nothing fake is ever shown.
   ------------------------------------------------------------------------- */
const CUBE_CONFIG = {
  availability: 'Available for new projects',

  contact: {
    email: '',       // e.g. 'hello@yourdomain.com'
    phone: '',       // e.g. '+94 77 123 4567'
    whatsapp: ''     // international format, digits only, e.g. '94771234567'
  },

  social: {
    instagram: '',   // full URLs, e.g. 'https://instagram.com/yourhandle'
    facebook: '',
    linkedin: '',
    github: ''
  },

  /* Enquiry delivery. The site is static, so a form service is required to
     actually receive enquiries. Configure ONE of these:
       - web3formsKey: free access key from https://web3forms.com
       - formspreeEndpoint: e.g. 'https://formspree.io/f/abcdwxyz'
     With neither set, the form falls back to opening the visitor's email app
     (if contact.email is set) — it never claims an enquiry was delivered. */
  form: {
    web3formsKey: '',
    formspreeEndpoint: '',
    subject: 'New project enquiry — CobWebZ website'
  }
};

(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- Config → DOM ---------- */
  function getConfig(path) {
    return path.split('.').reduce((obj, key) => (obj ? obj[key] : ''), CUBE_CONFIG) || '';
  }

  function hrefFor(path, value) {
    if (path === 'contact.email') return `mailto:${value}`;
    if (path === 'contact.phone') return `tel:${value.replace(/[^\d+]/g, '')}`;
    if (path === 'contact.whatsapp') return `https://wa.me/${value.replace(/\D/g, '')}`;
    return value;
  }

  function applyConfig() {
    $$('[data-config-item]').forEach((item) => {
      const path = item.dataset.configItem;
      const value = getConfig(path).trim();
      item.hidden = !value;
      if (!value) return;
      $$(`[data-config-link="${path}"]`, item).forEach((link) => {
        link.href = hrefFor(path, value);
        if (!link.textContent.trim()) {
          link.textContent = path === 'contact.whatsapp' ? `+${value.replace(/\D/g, '')}` : value;
        }
      });
    });

    const contactList = $('[data-contact-list]');
    if (contactList) contactList.hidden = !$$('[data-config-item]', contactList).some((li) => !li.hidden);

    const social = $('[data-social-block]');
    if (social) social.hidden = !Object.values(CUBE_CONFIG.social).some((v) => v.trim());

    $$('[data-config-text]').forEach((el) => {
      const value = getConfig(el.dataset.configText);
      if (value) el.textContent = value;
    });

    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- Active nav link ---------- */
  function initActiveNav() {
    const links = $$('[data-nav]');
    const sections = $$('main > section[id]');
    if (!links.length || !sections.length) return;

    const setActive = (id) => {
      links.forEach((a) => {
        const href = a.getAttribute('href') || '';
        const targetId = href.includes('#') ? href.split('#')[1] : href;
        const active = targetId === id;
        a.classList.toggle('is-active', active);
        if (active) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };

    setActive('overview');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: '-30% 0px -50% 0px' });
    sections.forEach((s) => observer.observe(s));
  }

  /* ---------- Header: tightens up once the page scrolls ---------- */
  // .is-scrolled also folds the links into the menu button on wide screens (style.css);
  // --i / --n stagger the links as they go and come back
  function initHeaderScroll() {
    const header = $('[data-header]') || $('.site-header');
    if (!header) return;
    const items = $$('.site-nav__list > li', header);
    items.forEach((li, i) => li.style.setProperty('--i', i));
    header.style.setProperty('--n', items.length);
    const update = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 30);
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ---------- Theme toggle (Light / Dark mode) ---------- */
  function initTheme() {
    const toggle = $('[data-theme-toggle]');
    if (!toggle) return;
    const sunIcon = $('.theme-icon-sun', toggle);
    const moonIcon = $('.theme-icon-moon', toggle);

    const saved = localStorage.getItem('theme');
    const theme = saved || 'light';

    const meta = $('meta[name="theme-color"]');

    function apply(t) {
      document.documentElement.setAttribute('data-theme', t);
      if (sunIcon && moonIcon) {
        sunIcon.hidden = t === 'dark';
        moonIcon.hidden = t !== 'dark';
      }
      if (meta) meta.setAttribute('content', t === 'dark' ? '#0c0d10' : '#f0f1f3'); // browser UI colour
      localStorage.setItem('theme', t);
    }

    apply(theme);

    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(current);
    });
  }

  /* ---------- Menu (dropdown under the Menu pill) ---------- */
  function initMenu() {
    const toggle = $('[data-menu-toggle]');
    const panel = $('[data-menu]');
    if (!toggle || !panel) return;
    const root = toggle.parentElement;

    let closeTimer;
    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';

    function open() {
      clearTimeout(closeTimer);
      panel.hidden = false;
      void panel.offsetWidth; // commit the hidden→visible change before animating
      panel.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
    }

    function close({ restoreFocus = false } = {}) {
      if (!isOpen()) return;
      panel.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      closeTimer = setTimeout(() => { panel.hidden = true; }, reduceMotion.matches ? 0 : 250);
      if (restoreFocus) toggle.focus({ preventScroll: true });
    }

    toggle.addEventListener('click', () => (isOpen() ? close() : open()));
    $$('a', panel).forEach((link) => link.addEventListener('click', () => close()));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) close({ restoreFocus: true });
    });
    // Close on a click outside, or once keyboard focus leaves the menu
    document.addEventListener('click', (e) => { if (!root.contains(e.target)) close(); });
    root.addEventListener('focusout', (e) => {
      if (e.relatedTarget && !root.contains(e.relatedTarget)) close();
    });
    // On wide screens the button folds away when you're back at the top; the menu goes with it
    const header = toggle.closest('.site-header');
    const wide = window.matchMedia('(min-width: 1100px)'); // the links bar breakpoint in style.css
    if (header) {
      new MutationObserver(() => {
        if (wide.matches && !header.classList.contains('is-scrolled')) close();
      }).observe(header, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ---------- Split text into words or letters ---------- */
  // Wraps each word (unit 'word') or letter (unit 'char') in a span with --i = its position,
  // keeping inner elements such as .accent, and sets --n = the count on the element.
  function splitText(root, unit) {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) { walk(child); return; }
        if (child.nodeType !== Node.TEXT_NODE) return;
        const frag = document.createDocumentFragment();
        const parts = unit === 'char' ? [...child.textContent] : child.textContent.split(/(\s+)/);
        parts.forEach((part) => {
          if (!part) return;
          if (!part.trim()) { frag.append(part); return; }
          const span = document.createElement('span');
          span.className = unit;
          span.style.setProperty('--i', i++);
          span.textContent = part;
          frag.append(span);
        });
        child.replaceWith(frag);
      });
    };
    walk(root);
    root.style.setProperty('--n', i);
  }

  function initSplitText() {
    $$('[data-split-words], [data-scrub-words]').forEach((el) => splitText(el, 'word'));
    $$('[data-split-letters]').forEach((el) => {
      splitText(el, 'char');
      el.classList.add('is-split');
    });
  }

  /* ---------- Motion: hero entrance, reveals ---------- */
  function initMotion() {
    $$('[data-hero-step]').forEach((el, i) => el.style.setProperty('--i', i));
    // Children of [data-stagger] reveal one after another
    $$('[data-stagger]').forEach((group) => [...group.children].forEach((el, i) => el.style.setProperty('--i', i)));
    requestAnimationFrame(() => document.body.classList.add('is-loaded'));

    const reveals = $$('.reveal');
    reveals.forEach((el) => {
      const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      el.style.setProperty('--delay', `${(siblings.indexOf(el) % 4) * 80}ms`);
    });
    // [data-reveal] gets the same is-visible trigger without the default fade-up
    const extras = $$('[data-reveal]');

    if (!('IntersectionObserver' in window)) {
      [...reveals, ...extras].forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const revealOn = (elements, options) => {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, options);
      elements.forEach((el) => observer.observe(el));
    };
    revealOn(reveals, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    // The footer word sits flush with the bottom of the page, so any visible sliver counts
    revealOn(extras, { threshold: 0 });
  }

  /* ---------- Scroll-linked: [data-scrub] ---------- */
  // Each [data-scrub] element gets --p from 0 (its top approaches the screen bottom) to
  // 1 (comfortably centered in view); CSS turns that into the effect.
  function initScrollEffects() {
    const scrubs = $$('[data-scrub]');
    if (!scrubs.length) return;
    let queued = false;

    function update() {
      queued = false;
      const vh = window.innerHeight;
      scrubs.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) return; // far off screen: nothing to update
        const p = (vh * 1.05 - r.top) / (vh * 0.32 + r.height);
        el.style.setProperty('--p', Math.min(1, Math.max(0, p)).toFixed(3));
      });
    }
    const queue = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    update();
  }

  /* ---------- About: the spider mark you can pull on its web ---------- */
  // CSS spins the mark in from --p. Once it has landed (--p > .8) the spider leans toward
  // the pointer, can be dragged (it springs back on release) and hops when tapped. Its
  // back legs are the W's inner threads, so their ends are re-plotted to stay attached.
  function initSpiderMark() {
    const root = $('[data-spider]');
    if (!root) return;
    const svg = $('svg', root);
    const bug = $('.spider__bug', root);
    const arms = $$('.spider__arm', root);
    const scrub = root.closest('[data-scrub]');
    const C = { x: 387.5, y: 281 }; // body centre, in viewBox units
    // M x y C x y x y x y C x y x y x y → 14 numbers per arm
    const base = arms.map((arm) => arm.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number));
    const REACH = 170; // how far the spider can be pulled before the thread resists

    let x = 0, y = 0, vx = 0, vy = 0, angle = 0; // current pose
    let tx = 0, ty = 0;                          // where it wants to be
    let frame = 0;
    let drag = null;

    const live = () => root.classList.contains('is-live');
    const toSvg = (e) => new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());

    function render() {
      bug.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
      const rad = (angle * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      // A point on the body, after the body has moved and turned
      const pin = (px, py) => [
        C.x + x + (px - C.x) * cos - (py - C.y) * sin,
        C.y + y + (px - C.x) * sin + (py - C.y) * cos
      ];
      // The thread stays anchored at the bottom of the W. Its middle (the join and the two
      // handles either side of it) moves half as far as the spider, all together so the
      // curve stays smooth; its last handle and end ride on the body.
      const r = (n) => n.toFixed(1);
      const mid = (px, py) => `${r(px + x * 0.5)} ${r(py + y * 0.5)}`;
      arms.forEach((arm, i) => {
        const b = base[i];
        const [c2x, c2y] = pin(b[10], b[11]);
        const [ex, ey] = pin(b[12], b[13]);
        arm.setAttribute('d', `M${b[0]} ${b[1]} C${r(b[2] + x * 0.15)} ${r(b[3] + y * 0.15)} ` +
          `${mid(b[4], b[5])} ${mid(b[6], b[7])} C${mid(b[8], b[9])} ${r(c2x)} ${r(c2y)} ${r(ex)} ${r(ey)}`);
      });
    }

    function tick() {
      if (drag) {
        const px = x;
        const py = y;
        x += (tx - x) * 0.35;
        y += (ty - y) * 0.35;
        vx = x - px;
        vy = y - py;
      } else {
        // Springy for everyone else; settles without wobbling for reduced motion
        const damping = reduceMotion.matches ? 0.55 : 0.86;
        vx = (vx + (tx - x) * 0.09) * damping;
        vy = (vy + (ty - y) * 0.09) * damping;
        x += vx;
        y += vy;
      }
      // Leans into the direction it's being pulled, and swings with its momentum
      const ta = Math.max(-20, Math.min(20, x * 0.18 + vx * 1.6));
      angle += (ta - angle) * 0.2;
      root.classList.toggle('is-scuttling', Math.hypot(vx, vy) > 0.5);
      render();

      const settled = !drag && Math.abs(tx - x) + Math.abs(ty - y) < 0.05 &&
        Math.abs(vx) + Math.abs(vy) < 0.05 && Math.abs(ta - angle) < 0.05;
      frame = settled ? 0 : requestAnimationFrame(tick);
    }
    const wake = () => { if (!frame) frame = requestAnimationFrame(tick); };

    // Live only once the scroll animation has finished drawing it
    function syncLive() {
      const p = reduceMotion.matches ? 1 : parseFloat(scrub?.style.getPropertyValue('--p') || '1');
      const on = p > 0.72;
      if (on === live()) return;
      root.classList.toggle('is-live', on);
      if (!on && !drag) { tx = ty = 0; wake(); }
    }
    // After initScrollEffects has written this frame's --p
    window.addEventListener('scroll', () => requestAnimationFrame(syncLive), { passive: true });
    syncLive();

    // Mouse: it watches the pointer, leaning a little toward it
    if (finePointer.matches && scrub) {
      scrub.addEventListener('pointermove', (e) => {
        if (drag || !live() || reduceMotion.matches) return;
        const p = toSvg(e);
        const dx = p.x - C.x;
        const dy = p.y - C.y;
        const d = Math.hypot(dx, dy) || 1;
        const lean = Math.min(26, d * 0.07);
        tx = (dx / d) * lean;
        ty = (dy / d) * lean;
        wake();
      });
      scrub.addEventListener('pointerleave', () => {
        if (drag) return;
        tx = ty = 0;
        wake();
      });
    }

    bug.addEventListener('pointerdown', (e) => {
      if (!live() || e.button > 0) return;
      e.preventDefault();
      bug.setPointerCapture(e.pointerId);
      const p = toSvg(e);
      drag = { id: e.pointerId, gx: p.x - x, gy: p.y - y, sx: p.x, sy: p.y, moved: false };
      root.classList.add('is-dragging', 'is-touched');
      wake();
    });
    bug.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const p = toSvg(e);
      const nx = p.x - drag.gx;
      const ny = p.y - drag.gy;
      // The further it's pulled, the harder the thread pulls back
      const d = Math.hypot(nx, ny);
      const k = d ? (REACH * Math.tanh(d / REACH)) / d : 0;
      tx = nx * k;
      ty = ny * k;
      if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 6) drag.moved = true;
      wake();
    });
    const release = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved && !reduceMotion.matches) vy -= 16; // a tap makes it hop
      drag = null;
      tx = ty = 0;
      root.classList.remove('is-dragging');
      wake();
    };
    bug.addEventListener('pointerup', release);
    bug.addEventListener('pointercancel', release);
  }

  /* ---------- Our Services: the spider walks the web to each service ---------- */
  // Draws the web into [data-services-silk] (viewBox -300…300, hub at 0 0): 12 spokes and
  // 8 rings that dip between the spokes. Each service point sits on the ring of radius PATH_R
  // at its angle --a (CSS places the buttons from the same angle). Scrolling through the
  // section moves from one service to the next; each change walks the spider round that ring
  // to it, laying a thread behind it, rolls the number in the hub and shows its panel.
  function initServices() {
    const root = $('[data-services]');
    if (!root) return;
    const web = $('.services__web', root);
    const silk = $('[data-services-silk]', root);
    const spider = $('[data-services-spider]', root);
    const count = $('[data-services-count]', root);
    const tabs = $$('[data-service-tab]', root);
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
    if (!web || !silk || !spider || !tabs.length) return;

    const SPOKES = 12;
    const PATH_R = 195;
    const RINGS = [84, 112, 140, 168, PATH_R, 224, 254, 284];
    const SAG = 0.955; // how far each span between two spokes dips toward the hub
    const f = (n) => n.toFixed(1);
    const at = (r, deg) => [r * Math.cos((deg * Math.PI) / 180), r * Math.sin((deg * Math.PI) / 180)];
    const ring = (r) => {
      let d = '';
      for (let k = 0; k <= SPOKES; k++) {
        const [x, y] = at(r, (k * 360) / SPOKES);
        if (!k) { d += `M${f(x)} ${f(y)}`; continue; }
        const [cx, cy] = at(r * SAG, ((k - 0.5) * 360) / SPOKES);
        d += `Q${f(cx)} ${f(cy)} ${f(x)} ${f(y)}`;
      }
      return d;
    };

    let svg = '<circle class="s-hub" r="58" pathLength="1"/>';
    for (let k = 0; k < SPOKES; k++) {
      const [x1, y1] = at(58, (k * 360) / SPOKES);
      const [x2, y2] = at(296, (k * 360) / SPOKES);
      svg += `<path class="s-spoke" pathLength="1" style="--i: ${k}" d="M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}"/>`;
    }
    RINGS.forEach((r, i) => {
      svg += `<path class="s-ring${r === PATH_R ? ' s-path' : ''}" pathLength="1" style="--i: ${i}" d="${ring(r)}"/>`;
    });
    svg += `<path class="services__trail" pathLength="1" d="${ring(PATH_R)}"/>` +
      '<line class="services__drop is-gone" x1="0" y1="-300" x2="0" y2="-300"/>';
    silk.innerHTML = svg;
    const trail = $('.services__trail', silk);
    const drop = $('.services__drop', silk);

    // The logo's spider: three left legs [path, pivot x, pivot y], mirrored for the right
    const legs = [
      ['M352 254C322 240 308 205 316 170C320 155 326 145 332 138', 352, 254],
      ['M346 280C315 272 285 255 278 228C274 212 271 200 270 188', 346, 280],
      ['M352 318C335 328 326 345 327 368C328 388 334 400 342 410', 352, 318]
    ];
    const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${775 - x} ${y}`);
    spider.innerHTML = '<svg viewBox="255 125 265 300">' +
      legs.map(([d, x, y], i) => {
        const swing = i % 2 ? -9 : 9;
        return `<path class="services__leg" style="--o: ${x}px ${y}px; --s: ${swing}deg" d="${d}"/>` +
          `<path class="services__leg" style="--o: ${775 - x}px ${y}px; --s: ${-swing}deg" d="${mirror(d)}"/>`;
      }).join('') +
      '<path class="services__body" fill-rule="evenodd" d="M347 244A40 40 0 0 1 427 244L427 318A40 40 0 0 1 347 318Z' +
      'M373 249A14 20 0 1 0 401 249A14 20 0 1 0 373 249ZM374 318A13 15 0 1 0 400 318A13 15 0 1 0 374 318Z"/></svg>';

    // A point on the walked ring, p = 0…1 of the way round from angle 0 (clockwise on screen);
    // it follows the same curves as the drawn ring, so the spider stays on the thread
    const ringPoint = (p) => {
      const u = (((p % 1) + 1) % 1) * SPOKES;
      const k = Math.floor(u);
      const t = u - k;
      const [x0, y0] = at(PATH_R, (k * 360) / SPOKES);
      const [x1, y1] = at(PATH_R, ((k + 1) * 360) / SPOKES);
      const [cx, cy] = at(PATH_R * SAG, ((k + 0.5) * 360) / SPOKES);
      const s = 1 - t;
      return [s * s * x0 + 2 * s * t * cx + t * t * x1, s * s * y0 + 2 * s * t * cy + t * t * y1];
    };
    // Which way the spider faces when heading round the ring in direction dir (±1); 0 = up
    const facing = (p, dir) => {
      const [x0, y0] = ringPoint(p);
      const [x1, y1] = ringPoint(p + dir * 0.002);
      return (Math.atan2(x1 - x0, -(y1 - y0)) * 180) / Math.PI;
    };
    const stops = tabs.map((tab) => (((parseFloat(tab.style.getPropertyValue('--a')) || 0) % 360) + 360) % 360 / 360);
    const place = (x, y, h) => {
      spider.style.left = `${50 + (x / 600) * 100}%`;
      spider.style.top = `${50 + (y / 600) * 100}%`;
      spider.style.setProperty('--h', `${h.toFixed(1)}deg`);
    };

    let current = 0;
    let pos = stops[0];
    let walk = 0;
    let landed = false; // until the spider has dropped onto the web

    function walkTo(target, done) {
      cancelAnimationFrame(walk);
      let d = target - pos;
      if (d > 0.5) d -= 1;
      if (d <= -0.5) d += 1;
      const dir = d < 0 ? -1 : 1;
      if (reduceMotion.matches || Math.abs(d) < 1e-4) {
        pos = target;
        const [x, y] = ringPoint(pos);
        place(x, y, facing(pos, dir));
        done?.();
        return;
      }
      const from = pos;
      const ms = Math.max(600, Math.abs(d) * 3600); // a quarter of the way round takes 0.9s
      const t0 = performance.now();
      spider.classList.add('is-walking');
      trail.classList.add('is-on');
      const step = (now) => {
        const t = Math.min(1, (now - t0) / ms);
        const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
        pos = from + d * e;
        const [x, y] = ringPoint(pos);
        place(x, y, facing(pos, dir));
        // The thread it lays, from where it set off to where it is (dashes repeat every lap)
        const len = Math.abs(pos - from);
        trail.style.strokeDasharray = `${len.toFixed(4)} ${(1 - len).toFixed(4)}`;
        trail.style.strokeDashoffset = (-(dir > 0 ? from : pos)).toFixed(4);
        if (t < 1) {
          walk = requestAnimationFrame(step);
          return;
        }
        pos = ((target % 1) + 1) % 1;
        spider.classList.remove('is-walking');
        trail.classList.remove('is-on'); // the thread fades
        done?.();
      };
      walk = requestAnimationFrame(step);
    }

    function rollCount(text) {
      if (!count || count.textContent === text) return;
      if (reduceMotion.matches) { count.textContent = text; return; }
      count.classList.add('is-out');
      setTimeout(() => {
        count.textContent = text;
        count.classList.replace('is-out', 'is-in');
        void count.offsetWidth; // start the roll in from below
        count.classList.remove('is-in');
      }, 220);
    }

    function select(i) {
      if (i < 0 || i === current) return;
      current = i;
      tabs.forEach((tab, j) => {
        const on = j === i;
        tab.classList.toggle('is-active', on);
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
      });
      panels.forEach((panel, j) => {
        if (!panel) return;
        panel.classList.toggle('is-active', j === i);
        if (pinned()) panel.inert = j !== i; // stacked panels all stay readable
      });
      rollCount(String(i + 1).padStart(2, '0'));
      if (landed) walkTo(stops[i]); // before it lands, it simply drops onto the right one
    }

    // Scrolling picks the service. Wide, tall screens pin the section (.is-pinned, style.css)
    // and share its scroll out evenly between the services; narrower ones stack the panels
    // under a sticky web, and the panel passing the lower part of the screen is the one.
    const section = root.closest('.services') || root;
    const roomy = window.matchMedia('(min-width: 960px) and (min-height: 620px)');
    const pinned = () => section.classList.contains('is-pinned');
    section.style.setProperty('--steps', tabs.length);

    let queued = false;
    function fromScroll() {
      queued = false;
      if (!pinned()) return;
      const r = section.getBoundingClientRect();
      const range = r.height - window.innerHeight;
      if (range <= 0) return;
      const p = Math.min(0.9999, Math.max(0, -r.top / range));
      select(Math.floor(p * tabs.length));
    }
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(fromScroll);
    };
    function setMode() {
      section.classList.toggle('is-pinned', roomy.matches);
      panels.forEach((panel, j) => { if (panel) panel.inert = pinned() && j !== current; });
      onScroll();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    roomy.addEventListener('change', setMode);
    if ('IntersectionObserver' in window) {
      const band = new IntersectionObserver((entries) => entries.forEach((entry) => {
        if (!pinned() && entry.isIntersecting) select(panels.indexOf(entry.target));
      }), { rootMargin: '-62% 0px -36% 0px' });
      panels.forEach((panel) => panel && band.observe(panel));
    }
    setMode();

    // Choosing a service scrolls to its place, so the page and the web always agree; the
    // spider walks there as the page goes by
    function go(i) {
      const behavior = reduceMotion.matches ? 'auto' : 'smooth';
      if (pinned()) {
        const r = section.getBoundingClientRect();
        const range = r.height - window.innerHeight;
        window.scrollTo({ top: window.scrollY + r.top + ((i + 0.5) / tabs.length) * range, behavior });
      } else {
        panels[i]?.scrollIntoView({ block: 'center', behavior });
      }
    }
    tabs.forEach((tab, i) => tab.addEventListener('click', () => go(i)));
    $('.services__nodes', root)?.addEventListener('keydown', (e) => {
      const steps = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      let next = null;
      if (e.key in steps) next = (current + steps[e.key] + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next === null) return;
      e.preventDefault();
      go(next);
      tabs[next].focus({ preventScroll: true });
    });

    // The web leans toward the pointer, and shivers when a point is touched
    if (finePointer.matches) {
      web.addEventListener('pointermove', (e) => {
        if (reduceMotion.matches) return;
        const r = web.getBoundingClientRect();
        web.style.setProperty('--rx', `${(((e.clientY - r.top) / r.height - 0.5) * -8).toFixed(2)}deg`);
        web.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 8).toFixed(2)}deg`);
      });
      web.addEventListener('pointerleave', () => {
        web.style.removeProperty('--rx');
        web.style.removeProperty('--ry');
      });
    }
    tabs.forEach((tab) => tab.addEventListener('pointerenter', () => {
      if (reduceMotion.matches || web.getAnimations().some((a) => a.id === 'shiver')) return;
      web.animate([{ scale: '1' }, { scale: '1.012 0.988' }, { scale: '0.994 1.006' }, { scale: '1' }],
        { duration: 700, easing: 'ease-out', id: 'shiver' });
    }));

    // Threads stay about a pixel wide whatever size the web is drawn at
    const fit = () => silk.style.setProperty('--sw', (600 / (silk.clientWidth || 600)).toFixed(3));
    fit();
    window.addEventListener('resize', fit);

    // The first time it's on screen: the web spins (CSS), then the spider drops onto the
    // service the scroll has reached on a thread, bounces and turns to face along the web
    let introduced = false;
    function land(at) {
      landed = true;
      pos = at;
      const [x, y] = ringPoint(pos);
      place(x, y, facing(pos, 1));
      spider.classList.add('is-ready');
      if (stops[current] !== at) walkTo(stops[current]); // scrolled on while it was dropping
    }
    function intro() {
      introduced = true;
      if (reduceMotion.matches) {
        land(stops[current]);
        return;
      }
      setTimeout(() => {
        const at = stops[current];
        const [x, y] = ringPoint(at);
        const top = -300; // the web's top edge
        const t0 = performance.now();
        drop.setAttribute('x1', f(x));
        drop.setAttribute('x2', f(x));
        drop.classList.remove('is-gone');
        spider.classList.add('is-ready');
        const step = (now) => {
          const t = Math.min(1, (now - t0) / 1100);
          const e = 1 + 2.7 * (t - 1) ** 3 + 1.7 * (t - 1) ** 2; // overshoots a touch, then settles
          const cy = top + (y - top) * e;
          place(x, cy, 0);
          drop.setAttribute('y2', f(cy));
          if (t < 1) {
            requestAnimationFrame(step);
            return;
          }
          drop.classList.add('is-gone');
          land(at);
        };
        requestAnimationFrame(step);
      }, 1500);
    }
    if ('IntersectionObserver' in window) {
      const seen = new IntersectionObserver((entries) => {
        if (!introduced && entries.some((entry) => entry.isIntersecting)) {
          seen.disconnect();
          intro();
        }
      }, { threshold: 0.3 });
      seen.observe(root);
    } else {
      intro();
    }
  }

  /* ---------- Cobwebs in the page corners ---------- */
  // Each [data-cobweb] gets a quarter web, drawn for the top-left corner (viewBox 0–100) and
  // mirrored into place by CSS. [data-reveal] marks it is-visible on screen, which spins it
  // in. data-cobweb="spider" also hangs the logo's spider, small, on a thread from it.
  function initCobwebs() {
    const webs = $$('[data-cobweb]');
    if (!webs.length) return;
    const r = (n) => Math.round(n * 10) / 10;

    // The logo's spider: three left legs [path, pivot x, pivot y], mirrored for the right
    const legs = [
      ['M352 254C322 240 308 205 316 170C320 155 326 145 332 138', 352, 254],
      ['M346 280C315 272 285 255 278 228C274 212 271 200 270 188', 346, 280],
      ['M352 318C335 328 326 345 327 368C328 388 334 400 342 410', 352, 318]
    ];
    const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${775 - x} ${y}`);
    const spider = '<svg class="cobweb__spider" viewBox="255 125 265 300">' +
      legs.map(([d, x, y], i) => {
        const swing = i % 2 ? -9 : 9;
        return `<path class="cobweb__leg" style="--o: ${x}px ${y}px; --s: ${swing}deg" d="${d}"/>` +
          `<path class="cobweb__leg" style="--o: ${775 - x}px ${y}px; --s: ${-swing}deg" d="${mirror(d)}"/>`;
      }).join('') +
      '<path class="cobweb__body" fill-rule="evenodd" d="M347 244A40 40 0 0 1 427 244L427 318A40 40 0 0 1 347 318Z' +
      'M373 249A14 20 0 1 0 401 249A14 20 0 1 0 373 249ZM374 318A13 15 0 1 0 400 318A13 15 0 1 0 374 318Z"/></svg>';

    webs.forEach((host, w) => {
      // Seeded jitter: every web is a little different, but the same on every visit
      let seed = 7 + w * 101;
      const wobble = (n) => {
        seed = (seed * 16807) % 2147483647;
        return (seed / 2147483647 - 0.5) * n;
      };
      const at = (radius, a) => [radius * Math.cos(a), radius * Math.sin(a)];
      const angles = [9, 27, 45, 63, 81].map((deg) => ((deg + wobble(7)) * Math.PI) / 180);

      const spokes = angles.map((a, i) => {
        const [x, y] = at(97 + wobble(6), a);
        return `<path class="cobweb__spoke" pathLength="1" style="--i: ${i}" d="M0 0L${r(x)} ${r(y)}"/>`;
      });
      // Each ring runs wall to wall through every spoke, each span sagging toward the corner
      const rings = [18, 33, 49, 65, 82].map((radius, i) => {
        const pts = [[radius + wobble(4), 0], ...angles.map((a) => at(radius + wobble(4), a)), [0, radius + wobble(4)]];
        const d = pts.map(([x, y], j) => {
          if (!j) return `M${r(x)} ${r(y)}`;
          const [px, py] = pts[j - 1];
          const sag = 0.84 + wobble(0.06);
          return `Q${r(((px + x) / 2) * sag)} ${r(((py + y) / 2) * sag)} ${r(x)} ${r(y)}`;
        }).join('');
        return `<path class="cobweb__ring" pathLength="1" style="--i: ${i}" d="${d}"/>`;
      });

      host.style.setProperty('--w', w);
      host.innerHTML = '<svg class="cobweb__web" viewBox="0 0 100 100">' +
        '<path class="cobweb__hit" d="M0 0H100A100 100 0 0 1 0 100Z"/>' +
        `<g class="cobweb__shake"><g class="cobweb__sway">${spokes.join('')}${rings.join('')}</g></g></svg>`;

      if (host.dataset.cobweb === 'spider') {
        // Hangs from the middle spoke, two thirds of the way out
        const [x, y] = at(64, angles[2]);
        const left = host.matches('.cobweb--tr, .cobweb--br') ? 100 - x : x;
        host.insertAdjacentHTML('beforeend', `<div class="cobweb__drop" style="left: ${r(left)}%; top: ${r(y)}%">` +
          `<span class="cobweb__silk"></span>${spider}</div>`);
      }

      // Brushing past a web makes it shiver
      const shake = $('.cobweb__shake', host);
      $('.cobweb__hit', host).addEventListener('pointerenter', () => {
        if (reduceMotion.matches || !host.classList.contains('is-visible') || shake.getAnimations().length) return;
        shake.animate([
          { transform: 'scale(1)' },
          { transform: 'scale(1.035, 0.97)' },
          { transform: 'scale(0.98, 1.02)' },
          { transform: 'scale(1.012, 0.99)' },
          { transform: 'scale(1)' }
        ], { duration: 1000, easing: 'ease-out' });
      });
    });

    // Threads stay about a pixel wide whatever size each web is drawn at
    const fit = () => webs.forEach((host) => host.style.setProperty('--sw', (100 / (host.offsetWidth || 100)).toFixed(3)));
    fit();
    window.addEventListener('resize', fit);
  }

  /* ---------- Tech stack rows: drift, follow the scroll, slow under the pointer ---------- */
  function initMarquees() {
    const rows = $$('[data-marquee]').map((row) => ({
      row,
      track: $('.marquee__track', row),
      dir: row.dataset.marquee === 'reverse' ? -1 : 1,
      x: 0,
      loop: 0,
      hover: 0,
      hovered: false
    }));
    if (!rows.length) return;

    // Repeat the items until one copy spans the screen, then double that, so shifting the
    // track by half its width loops seamlessly. Copies are hidden from screen readers.
    rows.forEach((r) => {
      const items = [...r.track.children];
      const append = (nodes) => nodes.forEach((li) => {
        const copy = li.cloneNode(true);
        copy.classList.add('is-clone');
        copy.setAttribute('aria-hidden', 'true');
        r.track.append(copy);
      });
      const minWidth = Math.max(window.innerWidth, screen.width || 0);
      for (let n = 0; n < 8 && r.track.scrollWidth < minWidth; n++) append(items);
      append([...r.track.children]);
      new ResizeObserver(() => { r.loop = r.track.scrollWidth / 2; }).observe(r.track);
      r.row.addEventListener('pointerenter', () => { r.hovered = true; });
      r.row.addEventListener('pointerleave', () => { r.hovered = false; });
    });

    const BASE_SPEED = 36; // px per second at rest
    let visible = false;
    let frame = 0;
    let last = 0;
    let lastY = 0;
    let velocity = 0; // smoothed scroll speed, px per second

    function tick(now) {
      frame = 0;
      if (!visible || reduceMotion.matches) return;
      const dt = Math.min(now - (last || now), 64) / 1000;
      last = now;
      velocity += ((dt ? (window.scrollY - lastY) / dt : 0) - velocity) * 0.12;
      lastY = window.scrollY;
      rows.forEach((r) => {
        if (!r.loop) return;
        r.hover += ((r.hovered ? 1 : 0) - r.hover) * 0.08;
        // Scrolling down speeds the rows up; scrolling up pushes them back the other way
        const speed = (BASE_SPEED + velocity * 0.35) * r.dir * (1 - 0.8 * r.hover);
        r.x = (((r.x + speed * dt) % r.loop) + r.loop) % r.loop;
        r.track.style.transform = `translate3d(${-r.x}px, 0, 0)`;
      });
      frame = requestAnimationFrame(tick);
    }
    function start() {
      if (frame || !visible || reduceMotion.matches) return;
      last = 0;
      lastY = window.scrollY;
      frame = requestAnimationFrame(tick);
    }

    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    }).observe(rows[0].row.parentElement);
    reduceMotion.addEventListener('change', () => {
      if (reduceMotion.matches) rows.forEach((r) => { r.track.style.transform = ''; });
      else start();
    });
  }

  /* ---------- "View" bubble that trails the pointer over [data-cursor] ---------- */
  function initCursorBadge() {
    const targets = $$('[data-cursor]');
    if (!targets.length || !finePointer.matches || reduceMotion.matches) return;

    const badge = document.createElement('div');
    badge.className = 'cursor-badge';
    badge.setAttribute('aria-hidden', 'true');
    document.body.append(badge);
    document.documentElement.classList.add('has-cursor-badge');

    let x = 0;
    let y = 0;
    let tx = 0;
    let ty = 0;
    let frame = 0;
    let shown = false;
    const follow = () => {
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;
      badge.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.2 ? requestAnimationFrame(follow) : 0;
    };

    targets.forEach((el) => {
      el.addEventListener('pointerenter', (e) => {
        badge.textContent = `${el.dataset.cursor} ↗`;
        if (!shown) { // appear under the pointer rather than flying in from the last spot
          x = tx = e.clientX;
          y = ty = e.clientY;
          follow();
        }
        shown = true;
        badge.classList.add('is-active');
      });
      el.addEventListener('pointermove', (e) => {
        tx = e.clientX;
        ty = e.clientY;
        if (!frame) frame = requestAnimationFrame(follow);
      });
      el.addEventListener('pointerleave', () => {
        shown = false;
        badge.classList.remove('is-active');
      });
    });
  }

  /* ---------- Magnetic buttons: lean toward the pointer ---------- */
  function initMagnetic() {
    if (!finePointer.matches) return;
    $$('[data-magnetic]').forEach((el) => {
      let rect = null;
      el.addEventListener('pointerenter', () => { rect = el.getBoundingClientRect(); });
      el.addEventListener('pointermove', (e) => {
        if (!rect || reduceMotion.matches) return;
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        el.style.translate = `${dx * 0.25}px ${dy * 0.35}px`;
      });
      el.addEventListener('pointerleave', () => {
        rect = null;
        el.style.translate = '';
      });
    });
  }

  /* ---------- Our Work: scroll-down previews ---------- */
  // Marks each preview frame is-inview while it's on screen; style.css scrolls the home
  // cards' screenshots then (and the work page's on touch screens), restarting from the
  // top each time you come back to them.
  function initWorkPreviews() {
    const frames = $$('[data-preview]');
    if (!frames.length || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-inview', entry.isIntersecting));
    }, { threshold: 0.4 });
    frames.forEach((frame) => observer.observe(frame));
  }

  /* ---------- Particle ribbon (hero) ---------- */
  // Each ribbon is a smooth curve through `path` (fractions of the canvas
  // width and height), filled with fine strands of dots that drift along it.
  // `width` is its thickness at the start, middle and end, as a fraction of
  // the canvas's shorter side; `colors` follow the same three stops.
  const RIBBONS = {
    hero: [
      {
        path: [[1.06, -0.04], [0.95, 0.36], [0.84, 0.66], [0.66, 0.9], [0.45, 0.98], [0.22, 0.97], [0.06, 0.86], [-0.06, 0.7]],
        width: [0.3, 0.12, 0.24],
        colors: ['#7c8089', '#a3a7ae', '#5f636b'],
        strands: 60,
        alpha: 1
      },
      {
        path: [[1.06, 0.18], [0.97, 0.52], [0.86, 0.8], [0.7, 1.04]],
        width: [0.14, 0.08, 0.05],
        colors: ['#9a9ea6', '#b4b7bd', '#c3c6cb'],
        strands: 28,
        alpha: 0.7
      }
    ]
  };

  function initParticles() {
    const canvases = $$('[data-particles]');
    if (!canvases.length) return;

    const SAMPLES = 1024; // points along each ribbon's centre line
    const SIN = new Float32Array(4096); // lookup table: tens of thousands of dots per frame
    for (let i = 0; i < SIN.length; i++) SIN[i] = Math.sin((i / SIN.length) * Math.PI * 2);
    const SIN_SCALE = SIN.length / (Math.PI * 2);
    const scenes = [];
    let time = 0;
    let last = 0;
    let lastDraw = 0;
    let scrollingUntil = 0;
    let frame = 0;

    const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    // Piecewise-linear value through three stops (start, middle, end)
    const stop3 = (stops, t) => (t < 0.5
      ? stops[0] + (stops[1] - stops[0]) * t * 2
      : stops[1] + (stops[2] - stops[1]) * (t - 0.5) * 2);

    // Catmull-Rom spline through the control points, t in 0…1
    function pointAt(pts, t) {
      const n = pts.length - 1;
      const f = Math.min(t * n, n - 1e-6);
      const i = Math.floor(f);
      const u = f - i;
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, n)];
      const cr = (a, b, c, d) => 0.5 * (2 * b + (c - a) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (3 * b - a - 3 * c + d) * u * u * u);
      return [cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])];
    }

    function buildRibbon(spec, width, height) {
      const pts = spec.path.map(([x, y]) => [x * width, y * height]);
      const side = Math.min(width, height);
      const colors = spec.colors.map(rgb);
      const sx = new Float32Array(SAMPLES);
      const sy = new Float32Array(SAMPLES);
      const nx = new Float32Array(SAMPLES);
      const ny = new Float32Array(SAMPLES);
      const half = new Float32Array(SAMPLES);
      const color = new Uint32Array(SAMPLES);
      const fade = new Float32Array(SAMPLES);

      for (let j = 0; j < SAMPLES; j++) [sx[j], sy[j]] = pointAt(pts, j / (SAMPLES - 1));

      let length = 0;
      for (let j = 0; j < SAMPLES; j++) {
        const t = j / (SAMPLES - 1);
        const a = Math.max(j - 1, 0);
        const b = Math.min(j + 1, SAMPLES - 1);
        const len = Math.hypot(sx[b] - sx[a], sy[b] - sy[a]) || 1;
        nx[j] = -(sy[b] - sy[a]) / len;
        ny[j] = (sx[b] - sx[a]) / len;
        if (j) length += Math.hypot(sx[j] - sx[j - 1], sy[j] - sy[j - 1]);
        half[j] = (stop3(spec.width, t) * side) / 2;
        const [cr, cg, cb] = [0, 1, 2].map((c) => Math.round(stop3(colors.map((col) => col[c]), t)));
        color[j] = (cb << 16) | (cg << 8) | cr; // RGBA bytes read as a little-endian uint32
        fade[j] = Math.min(1, t / 0.08, (1 - t) / 0.08);
      }

      // Fewer, sparser dots on small screens keep the frame cost down
      const spacing = width < 700 ? 5 : 4;
      const strands = Math.max(24, Math.round(spec.strands * Math.min(1, side / 900)));
      const perStrand = Math.max(40, Math.round(length / spacing));
      const count = perStrand * strands;
      const along = new Float32Array(count);  // 0…1 along the ribbon
      const across = new Float32Array(count); // -1…1 across it
      const alpha = new Float32Array(count);
      const phase = new Float32Array(strands);
      for (let s = 0; s < strands; s++) {
        phase[s] = Math.random() * Math.PI * 2;
        const lane = -1 + (2 * (s + 0.5)) / strands;
        for (let i = 0; i < perStrand; i++) {
          const k = s * perStrand + i;
          along[k] = (i + Math.random()) / perStrand;
          across[k] = lane + (Math.random() - 0.5) * (1.6 / strands);
          alpha[k] = spec.alpha * (0.45 + Math.random() * 0.55) * (1 - 0.45 * lane * lane);
        }
      }
      return { sx, sy, nx, ny, half, color, fade, along, across, alpha, phase, perStrand, strands };
    }

    // Dots near the pointer are pushed aside with a slight swirl, like a hand through smoke
    const PUSH_RADIUS = 150;
    const PUSH = 70;

    function draw(scene) {
      const { buf, width, height } = scene;
      const drift = time * 0.008;
      const { x: px, y: py, power } = scene.pointer;
      const r2 = PUSH_RADIUS * PUSH_RADIUS;
      buf.fill(0);
      for (const rb of scene.ribbons) {
        const { sx, sy, nx, ny, half, color, fade, along, across, alpha, phase, perStrand } = rb;
        for (let s = 0; s < rb.strands; s++) {
          const ph = phase[s];
          for (let k = s * perStrand, end = k + perStrand; k < end; k++) {
            let t = along[k] + drift;
            t -= Math.floor(t);
            const f = t * (SAMPLES - 1);
            const j = f | 0;
            const u = f - j;
            const j2 = j < SAMPLES - 1 ? j + 1 : j;
            const wobble = SIN[((t * 16 + time * 0.5 + ph) * SIN_SCALE | 0) & 4095];
            const off = (across[k] + wobble * 0.07) * half[j];
            let x = sx[j] + (sx[j2] - sx[j]) * u + nx[j] * off;
            let y = sy[j] + (sy[j2] - sy[j]) * u + ny[j] * off;
            if (power > 0.01) {
              const dx = x - px;
              const dy = y - py;
              const d2 = dx * dx + dy * dy;
              if (d2 < r2 && d2 > 1) {
                const d = Math.sqrt(d2);
                const fall = 1 - d / PUSH_RADIUS;
                const k = (fall * fall * PUSH * power) / d;
                x += (dx - dy * 0.4) * k;
                y += (dy + dx * 0.4) * k;
              }
            }
            if (x < 0 || y < 0 || x >= width || y >= height) continue;
            const a = (alpha[k] * fade[j] * 255) | 0;
            const idx = (y | 0) * width + (x | 0);
            if (a > buf[idx] >>> 24) buf[idx] = (a << 24) | color[j];
          }
        }
      }
      scene.ctx.putImageData(scene.image, 0, 0);
    }

    function tick(now) {
      frame = 0;
      const active = scenes.filter((sc) => sc.visible && sc.ribbons);
      if (!active.length || reduceMotion.matches) return;
      frame = requestAnimationFrame(tick);
      // Hold still while the page scrolls, so scrolling never competes with drawing
      if (now < scrollingUntil) return;
      // The drift moves about a pixel per frame at ~15fps, so that's enough at rest;
      // full rate just after the pointer moves
      const stirring = active.some((sc) => now - sc.pointer.movedAt < 600);
      if (now - lastDraw < (stirring ? 15 : 66)) return;
      time += Math.min(now - (last || now), 100) / 1000;
      last = now;
      lastDraw = now;
      active.forEach((sc) => {
        const p = sc.pointer;
        p.x += (p.tx - p.x) * 0.3;
        p.y += (p.ty - p.y) * 0.3;
        p.power += ((p.inside ? 1 : 0) - p.power) * 0.08;
        draw(sc);
      });
    }
    function start() {
      if (frame || reduceMotion.matches) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    }

    canvases.forEach((canvas) => {
      const specs = RIBBONS[canvas.dataset.particles];
      const ctx = canvas.getContext('2d');
      if (!specs || !ctx) return;
      const scene = {
        ctx, visible: false, width: 0, height: 0, ribbons: null,
        pointer: { x: 0, y: 0, tx: 0, ty: 0, power: 0, inside: false, movedAt: 0 }
      };
      scenes.push(scene);

      // The canvas ignores the pointer, so follow it over the canvas's section instead
      const host = canvas.parentElement;
      host.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        const r = canvas.getBoundingClientRect();
        const p = scene.pointer;
        p.tx = e.clientX - r.left;
        p.ty = e.clientY - r.top;
        if (!p.inside && p.power < 0.01) { // start where the pointer is, not where it left
          p.x = p.tx;
          p.y = p.ty;
        }
        p.inside = true;
        p.movedAt = performance.now();
        start();
      });
      host.addEventListener('pointerleave', () => { scene.pointer.inside = false; });

      // One canvas pixel per CSS pixel, so the dots read as fine grain
      new ResizeObserver(() => {
        const width = Math.round(canvas.clientWidth);
        const height = Math.round(canvas.clientHeight);
        if (!width || !height || (width === scene.width && height === scene.height)) return;
        canvas.width = width;
        canvas.height = height;
        scene.width = width;
        scene.height = height;
        scene.image = ctx.createImageData(width, height);
        scene.buf = new Uint32Array(scene.image.data.buffer);
        scene.ribbons = specs.map((spec) => buildRibbon(spec, width, height));
        draw(scene); // with reduced motion, this static frame is all that's drawn
      }).observe(canvas);

      new IntersectionObserver(([entry]) => {
        scene.visible = entry.isIntersecting;
        if (scene.visible) start();
      }).observe(canvas);
    });

    window.addEventListener('scroll', () => { scrollingUntil = performance.now() + 150; }, { passive: true });
    reduceMotion.addEventListener('change', start);
  }

  /* ---------- Enquiry selections (plan / service) ---------- */
  const form = $('[data-enquiry-form]');
  const packageSelect = $('[data-package-select]');
  const typeSelect = $('#f-type');

  function buildFormOptions() {
    $$('[data-package]').forEach((card) => {
      const name = card.dataset.package;
      const price = $('.price__price', card)?.textContent.replace(/\s+/g, ' ').trim() || '';
      packageSelect.add(new Option(price ? `${name} — ${price}` : name, name));
    });
  }

  function flash(select) {
    const field = select.closest('.field');
    field.classList.remove('is-flash');
    void field.offsetWidth;
    field.classList.add('is-flash');
    setTimeout(() => field.classList.remove('is-flash'), 1300);
  }

  function setSelect(select, value) {
    if (!select || ![...select.options].some((o) => o.value === value)) return false;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    flash(select);
    return true;
  }

  function syncSelectedCards() {
    $$('[data-package]').forEach((c) => c.classList.toggle('is-selected', c.dataset.package === packageSelect.value));
  }

  function initSelections() {
    if (!form) return;
    buildFormOptions();

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-select-package], [data-select-type]');
      if (!trigger) return;
      if (trigger.dataset.selectPackage) setSelect(packageSelect, trigger.dataset.selectPackage);
      if (trigger.dataset.selectType) setSelect(typeSelect, trigger.dataset.selectType);
      // The link's own href (#contact) handles scrolling
    });

    packageSelect.addEventListener('change', syncSelectedCards);

    // Support deep links, e.g. ?package=Dynamic%20Applications#contact
    const params = new URLSearchParams(window.location.search);
    if (params.get('package')) setSelect(packageSelect, params.get('package'));
    if (params.get('type')) setSelect(typeSelect, params.get('type'));
  }

  /* ---------- Enquiry form: validation + submission ---------- */
  function initForm() {
    if (!form) return;
    const status = $('[data-form-status]', form);
    const submitBtn = $('[data-submit]', form);
    const submitLabel = $('[data-submit-label]', form);
    const message = $('#f-message', form);
    const counter = $('[data-char-count]', form);
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const rules = {
      name: (v) => (v.trim().length < 2 ? 'Please enter your name.' : ''),
      email: (v) => (!v.trim() ? 'Please enter your email address.' : !EMAIL_RE.test(v.trim()) ? 'Please enter a valid email address, e.g. name@example.com.' : ''),
      project_type: (v) => (!v ? 'Please choose a service.' : ''),
      message: (v) => (v.trim().length < 20 ? `Please describe your project in at least 20 characters (${v.trim().length} so far).` : '')
    };

    function validateField(field) {
      const rule = rules[field.name];
      if (!rule) return true;
      const error = rule(field.value);
      const errorEl = document.getElementById(`${field.id}-err`);
      if (errorEl) errorEl.textContent = error;
      field.setAttribute('aria-invalid', error ? 'true' : 'false');
      return !error;
    }

    Object.keys(rules).forEach((name) => {
      const field = form.elements[name];
      field.addEventListener('blur', () => { if (field.value) validateField(field); });
      field.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') validateField(field); });
      field.addEventListener('change', () => { if (field.getAttribute('aria-invalid') === 'true') validateField(field); });
    });

    const updateCount = () => { counter.textContent = message.value.length; };
    message.addEventListener('input', updateCount);

    function showStatus(type, heading, body = '') {
      status.className = `form-status form-status--${type}`;
      status.innerHTML = `<div><strong></strong>${body ? '<p></p>' : ''}</div>`;
      $('strong', status).textContent = heading;
      if (body) {
        const p = $('p', status);
        if (typeof body === 'string') p.textContent = body;
        else p.append(...body);
      }
      status.hidden = false;
      status.focus({ preventScroll: true });
      status.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'nearest' });
    }

    function emailFallbackNodes(prefix) {
      const email = CUBE_CONFIG.contact.email.trim();
      if (!email) return ['Please try again in a moment.'];
      const link = document.createElement('a');
      link.href = `mailto:${email}`;
      link.textContent = email;
      return [`${prefix} `, link, '.'];
    }

    function collect() {
      const data = Object.fromEntries(new FormData(form).entries());
      delete data.botcheck;
      return data;
    }

    function summary(data) {
      return [
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Business: ${data.business || '—'}`,
        `Service: ${data.project_type}`,
        `Plan: ${data.package || 'Not sure yet'}`,
        `Budget (LKR): ${data.budget || 'Prefer not to say'}`,
        '',
        data.message
      ].join('\n');
    }

    async function send(data) {
      const { web3formsKey, formspreeEndpoint, subject } = CUBE_CONFIG.form;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        let res;
        if (web3formsKey.trim()) {
          res = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ access_key: web3formsKey.trim(), subject, from_name: 'CobWebZ website', replyto: data.email, ...data }),
            signal: controller.signal
          });
        } else {
          res = await fetch(formspreeEndpoint.trim(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ _subject: subject, _replyto: data.email, ...data }),
            signal: controller.signal
          });
        }
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) throw new Error(json.message || `HTTP ${res.status}`);
      } finally {
        clearTimeout(timeout);
      }
    }

    function resetForm() {
      form.reset();
      updateCount();
      syncSelectedCards();
      $$('[aria-invalid]', form).forEach((f) => f.removeAttribute('aria-invalid'));
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fields = Object.keys(rules).map((name) => form.elements[name]);
      const invalid = fields.filter((f) => !validateField(f));
      if (invalid.length) {
        showStatus('error', `Please check ${invalid.length === 1 ? '1 field' : `${invalid.length} fields`} highlighted above.`);
        invalid[0].focus();
        return;
      }

      // Bots fill the hidden field; quietly drop the submission
      if (form.elements.botcheck.value) { resetForm(); return; }

      const data = collect();
      const { web3formsKey, formspreeEndpoint } = CUBE_CONFIG.form;

      if (!web3formsKey.trim() && !formspreeEndpoint.trim()) {
        const email = CUBE_CONFIG.contact.email.trim();
        if (email) {
          const subject = encodeURIComponent(CUBE_CONFIG.form.subject);
          window.location.href = `mailto:${email}?subject=${subject}&body=${encodeURIComponent(summary(data))}`;
          showStatus('info', 'Your email app should now open with your enquiry filled in.',
            'It has not been sent yet — please press Send in your email app to deliver it.');
        } else {
          console.warn('[CobWebZ] Enquiry form is not connected. Set CUBE_CONFIG.form.web3formsKey or formspreeEndpoint in script.js.');
          showStatus('error', 'Online enquiries are not connected yet.',
            CUBE_CONFIG.contact.phone.trim() || CUBE_CONFIG.contact.whatsapp.trim()
              ? 'Your message was not sent. Please contact us directly using the details on this page.'
              : 'Your message was not sent. Please try again later.');
        }
        return;
      }

      submitBtn.disabled = true;
      submitLabel.textContent = 'Sending…';
      try {
        await send(data);
        showStatus('success', `Thanks, ${data.name.split(' ')[0]} — your enquiry has been sent.`,
          `We'll reply to ${data.email} as soon as possible.`);
        resetForm();
      } catch (err) {
        console.error('[CobWebZ] Enquiry failed:', err);
        showStatus('error', 'Sorry, your enquiry could not be sent.',
          emailFallbackNodes('Please try again in a moment, or email us directly at'));
      } finally {
        submitBtn.disabled = false;
        submitLabel.textContent = 'Send enquiry';
      }
    });
  }

  /* ---------- Why Choose Us interactive spotlight and telemetry ---------- */
  function initWhyChooseUs() {
    const grid = $('[data-why-grid]');
    if (!grid) return;
    const cards = $$('[data-why-card]', grid);

    // Dynamic Spotlight following cursor
    grid.addEventListener('mousemove', (e) => {
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    });

    // Card 1: Interactive Bézier Wireframe morph on mouse move
    const craftStage = $('[data-craft-stage]');
    if (craftStage) {
      const curve = $('.craft-curve', craftStage);
      const fill = $('.craft-curve-fill', craftStage);
      const node2 = $('.craft-node--2', craftStage);
      craftStage.addEventListener('mousemove', (e) => {
        const rect = craftStage.getBoundingClientRect();
        const px = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const py = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        const cy = Math.round(15 + py * 55);
        const cx = Math.round(50 + px * 60);
        if (curve && fill) {
          const d = `M 10 90 Q ${cx} ${cy} 140 60 T 270 30`;
          curve.setAttribute('d', d);
          fill.setAttribute('d', `${d} L 270 120 L 10 120 Z`);
        }
        if (node2) {
          node2.style.setProperty('--nx', `${cx}px`);
          node2.style.setProperty('--ny', `${cy}px`);
        }
      });
      craftStage.addEventListener('mouseleave', () => {
        if (curve && fill) {
          const d = 'M 10 90 Q 70 20 140 60 T 270 30';
          curve.setAttribute('d', d);
          fill.setAttribute('d', `${d} L 270 120 L 10 120 Z`);
        }
        if (node2) {
          node2.style.setProperty('--nx', '70px');
          node2.style.setProperty('--ny', '20px');
        }
      });
    }

    // Card 2: Interactive benchmark telemetry trigger
    const speedBtn = $('[data-speed-trigger]');
    const speedVal = $('[data-speed-val]');
    const ttfbVal = $('[data-ttfb-val]');
    if (speedBtn && speedVal) {
      let running = false;
      speedBtn.addEventListener('click', () => {
        if (running) return;
        running = true;
        speedBtn.classList.add('is-running');
        speedVal.textContent = '..';
        if (ttfbVal) ttfbVal.textContent = '...';
        let count = 20;
        const timer = setInterval(() => {
          count += 8;
          if (count >= 100) {
            clearInterval(timer);
            speedVal.textContent = '100';
            if (ttfbVal) ttfbVal.textContent = '14ms';
            speedBtn.classList.remove('is-running');
            speedBtn.classList.add('is-finished');
            setTimeout(() => {
              speedBtn.classList.remove('is-finished');
              running = false;
            }, 2500);
          } else {
            speedVal.textContent = String(count);
          }
        }, 30);
      });
    }
  }

  applyConfig();
  initTheme();
  initSplitText(); // before initMotion, so the words exist when the hero starts animating
  initActiveNav();
  initHeaderScroll();
  initMenu();
  initCobwebs(); // before initMotion, so the webs exist before they're marked is-visible
  initMotion();
  initScrollEffects();
  initSpiderMark();
  initServices();
  initWorkPreviews();
  initParticles();
  initMarquees();
  initCursorBadge();
  initMagnetic();
  initSelections();
  initWhyChooseUs();
  initForm();
})();
