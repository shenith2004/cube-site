/* =========================================================================
   CUBE — site behaviour (vanilla JS, no build step)
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
    subject: 'New project enquiry — CUBE website'
  }
};

(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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
    const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
    const sections = $$('main > section[id]');

    const setActive = (id) => {
      if (!byId.has(id)) return;
      links.forEach((a) => {
        const active = a === byId.get(id);
        a.classList.toggle('is-active', active);
        if (active) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => observer.observe(s));
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
  }

  /* ---------- Motion: hero entrance, reveals ---------- */
  function initMotion() {
    $$('[data-hero-step]').forEach((el, i) => el.style.setProperty('--i', i));
    requestAnimationFrame(() => document.body.classList.add('is-loaded'));

    const reveals = $$('.reveal');
    reveals.forEach((el) => {
      const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
      el.style.setProperty('--delay', `${(siblings.indexOf(el) % 4) * 80}ms`);
    });

    if (!('IntersectionObserver' in window)) {
      reveals.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => observer.observe(el));
  }

  /* ---------- Particle ribbons (hero, pricing, contact) ---------- */
  // Each ribbon is a smooth curve through `path` (fractions of the canvas
  // width and height), filled with fine strands of dots that drift along it.
  // `width` is its thickness at the start, middle and end, as a fraction of
  // the canvas's shorter side; `colors` follow the same three stops.
  const RIBBONS = {
    hero: [
      {
        path: [[1.06, -0.04], [0.95, 0.36], [0.84, 0.66], [0.66, 0.9], [0.45, 0.98], [0.22, 0.97], [0.06, 0.86], [-0.06, 0.7]],
        width: [0.3, 0.12, 0.24],
        colors: ['#de9070', '#a9a2bd', '#6b8ed6'],
        strands: 96,
        alpha: 1
      },
      {
        path: [[1.06, 0.18], [0.97, 0.52], [0.86, 0.8], [0.7, 1.04]],
        width: [0.14, 0.08, 0.05],
        colors: ['#e7a98f', '#c9a9a8', '#aaa3bf'],
        strands: 44,
        alpha: 0.7
      }
    ],
    corners: [
      {
        path: [[1.06, -0.08], [0.94, 0.12], [0.8, 0.32], [0.7, 0.5]],
        width: [0.26, 0.14, 0.05],
        colors: ['#de9070', '#dca592', '#cdb3b3'],
        strands: 64,
        alpha: 0.75
      },
      {
        path: [[-0.06, 0.44], [0.08, 0.7], [0.22, 0.92], [0.32, 1.06]],
        width: [0.06, 0.18, 0.26],
        colors: ['#a7b4d3', '#8aa2d6', '#6b8ed6'],
        strands: 72,
        alpha: 0.95
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
      const spacing = width < 700 ? 4 : 3;
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

    function draw(scene) {
      const { buf, width, height } = scene;
      const drift = time * 0.008;
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
            const x = sx[j] + (sx[j2] - sx[j]) * u + nx[j] * off;
            const y = sy[j] + (sy[j2] - sy[j]) * u + ny[j] * off;
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
      if (now - lastDraw < 33) return; // ~30fps is plenty for a slow drift
      time += Math.min(now - (last || now), 100) / 1000;
      last = now;
      lastDraw = now;
      active.forEach(draw);
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
      const scene = { ctx, visible: false, width: 0, height: 0, ribbons: null };
      scenes.push(scene);

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
            body: JSON.stringify({ access_key: web3formsKey.trim(), subject, from_name: 'CUBE website', replyto: data.email, ...data }),
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
          console.warn('[CUBE] Enquiry form is not connected. Set CUBE_CONFIG.form.web3formsKey or formspreeEndpoint in script.js.');
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
        console.error('[CUBE] Enquiry failed:', err);
        showStatus('error', 'Sorry, your enquiry could not be sent.',
          emailFallbackNodes('Please try again in a moment, or email us directly at'));
      } finally {
        submitBtn.disabled = false;
        submitLabel.textContent = 'Send enquiry';
      }
    });
  }

  applyConfig();
  initActiveNav();
  initMenu();
  initMotion();
  initParticles();
  initSelections();
  initForm();
})();
