(() => {
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const getJSON = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });
const page = document.body.dataset.page, home = page === 'home';
const link = t => (t.startsWith('#') && !home) ? 'index.html' + t : t;
const isExt = u => /^https?:/.test(u);
const socialUrl = value => {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
};
const chars = (s, cls = 'c') => [...s].map((c, i) => `<span class="${cls}" style="--i:${i}" aria-hidden="true">${c === ' ' ? '&nbsp;' : esc(c)}</span>`).join('');
const ini = s => [...String(s).trim()][0] || '';
const chipsHtml = a => a.map((x, j) => `<span class="chip" style="--i:${j}">${esc(x)}</span>`).join('');
/* image container: shows a placeholder letter until/unless the image loads */
const box = (src, alt, label, cls = '') =>
  `<figure class="ph ${cls}">${label ? `<span class="ph-i">${esc(label)}</span>` : ''}${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" onerror="this.remove()">` : ''}</figure>`;
const projectUrl = p => `project.html?id=${encodeURIComponent(p.id)}`;
let D, words = [], ticking = false, lastWordCount = -1;

/* ---------- helpers ---------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}), { threshold: .15 });
const watch = (root = document) => $$('.rv,.m', root).forEach(el => io.observe(el));
const setTheme = t => { if (t && document.body.dataset.theme !== t) document.body.dataset.theme = t; };

function type(el, text) {
  if (reduce) { el.textContent = text; el.classList.add('done'); return; }
  let i = 0;
  setTimeout(function t() {
    el.textContent = text.slice(0, ++i);
    if (i < text.length) setTimeout(t, 45);
    else setTimeout(() => el.classList.add('done'), 1800);
  }, 1300);
}

/* ---------- header + footer (every page) ---------- */
function ctaAttrs(a, c) {
  a.textContent = c.label; a.href = c.url;
  if (isExt(c.url)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
}

function renderChrome(site) {
  $('#logo').src = site.logo;
  $('#brandName').textContent = site.name;
  $('#brand').href = link('#home');
  $('#links').innerHTML = site.navigation.map(n => `<a class="nav-link" href="${esc(link(n.target))}">${esc(n.label)}</a>`).join('');
  ctaAttrs($('#ctaRequest'), site.ctas.request);
  ctaAttrs($('#ctaDonation'), site.ctas.donation);
  const toggle = $('.nav-toggle'), header = $('#header');
  const closeMenu = () => {
    header.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation');
  };
  toggle.addEventListener('click', () => {
    const open = header.classList.toggle('menu-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  $('#links').addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && header.classList.contains('menu-open')) { closeMenu(); toggle.focus(); }
  });
  document.addEventListener('click', e => { if (!header.contains(e.target)) closeMenu(); });
  matchMedia('(max-width: 900px)').addEventListener('change', closeMenu);
  if (page === 'devices') {
    const deviceLink = $('.nav-link[href="index.html#devices"]');
    if (deviceLink) { deviceLink.href = 'devices.html'; deviceLink.classList.add('active'); deviceLink.setAttribute('aria-current', 'page'); }
  }

  const rq = site.ctas.request, dn = site.ctas.donation;
  const ea = u => isExt(u) ? ' target="_blank" rel="noopener noreferrer"' : '';
  $('#footer').innerHTML = `<div class="wrap">
    <div class="f-top">
      <p class="f-sub rv">${esc(site.subtitle)}</p>
      <nav class="f-links rv" style="--d:.1s">${site.navigation.map(n => `<a href="${esc(link(n.target))}">${esc(n.label)}</a>`).join('')}</nav>
      <div class="f-cta rv" style="--d:.2s">
        <a class="btn req" href="${esc(rq.url)}"${ea(rq.url)}>${esc(rq.label)}</a>
        <a class="btn don" href="${esc(dn.url)}"${ea(dn.url)}>${esc(dn.label)}</a>
      </div>
    </div>
    <div class="f-word rv" style="--d:.1s" aria-hidden="true">${[...site.name].map(c => `<span class="pox-letter">${esc(c)}</span>`).join('')}</div>
    <div class="f-bottom"><span>© ${new Date().getFullYear()} ${esc(site.name)}</span><span>${esc(site.footer.note)}</span></div>
  </div>`;
}

/* ---------- devices ---------- */
/* A project supports a device when any supportedPhones entry contains the device name or its codename as a whole word. */
function projectsForDevice(d, projects) {
  const name = d.name.toLowerCase();
  const code = new RegExp(`(^|[^a-z0-9])${d.codename.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`);
  return projects.filter(p => (p.supportedPhones || []).some(s => { const t = s.toLowerCase(); return t.includes(name) || code.test(t); }));
}

function renderDevices(devices, projects) {
  const heading = home ? 'h2' : 'h1';
  $('#devicesWrap').innerHTML = `<div class="section-head rv">
    <p class="eyebrow">Built for your daily driver</p>
    <${heading} id="devicesTitle">Supported devices.</${heading}>
    <p>Hover a device to see every POX project that supports it.</p>
    ${home ? '<a class="device-link" href="devices.html">Explore all devices <span aria-hidden="true">↗</span></a>' : ''}
  </div>
  <div class="list">${devices.map((d, i) => {
    const label = `${d.name} (${d.codename})`, found = projectsForDevice(d, projects);
    return `<article class="row rv" style="--d:${i * .1}s" tabindex="0">
      <span class="name">${esc(d.name)}</span>
      <div class="reveal"><div class="rin"><div class="panel">
        <div class="device-art" aria-hidden="true"><div class="device-phone"><div class="device-screen"></div><div class="device-camera"></div></div></div>
        <div class="info">
          <p class="device-meta"><span>Supported</span><span>${esc(d.manufacturer)}</span><span>${esc(d.codename)}</span></p>
          <p class="k">${found.length ? `${found.length} POX project${found.length > 1 ? 's' : ''} for this device` : 'Projects for this device'}</p>
          ${found.length
            ? `<nav class="social-links" aria-label="Projects for ${esc(d.name)}">${found.map(p => `<a class="social-link" href="${projectUrl(p)}">${esc(p.name)} <span aria-hidden="true">→</span></a>`).join('')}</nav>`
            : '<p class="device-empty">No project lists this device yet.</p>'}
          <a class="device-link" href="request.html?device=${encodeURIComponent(label)}">Request a project for this device <span aria-hidden="true">↗</span></a>
        </div>
      </div></div></div>
    </article>`;
  }).join('')}</div>`;
}

/* ---------- home ---------- */
function renderRows(projects, L) {
  $('#projectsWrap').innerHTML = `<div class="list">${projects.map((p, i) => `
    <article class="row rv" style="--d:${i * .1}s" tabindex="0">
      <span class="name">${esc(p.name)}</span>
      <div class="reveal"><div class="rin"><div class="panel">
        ${box(p.image, p.name, ini(p.name), 'pimg')}
        <div class="info">
          <p>${esc(p.description)}</p>
          <div class="chips">${chipsHtml(p.supportedPhones)}</div>
        </div>
        <a class="btn go" href="${projectUrl(p)}">${esc(p.name)} ${esc(L.projectPage)} <span class="arr">→</span></a>
      </div></div></div>
    </article>`).join('')}</div>`;
}

/* 3D infinite wheel picker (used when there are many projects) */
function renderPicker(projects, L) {
  const N = projects.length, STEP = 26;
  $('#projectsWrap').innerHTML = `<div class="picker rv">
    <div class="wheel" id="wheel" tabindex="0" role="listbox" aria-label="Projects">
      ${projects.map((p, i) => `<div class="wi" id="project-option-${i}" data-i="${i}" role="option" aria-selected="false">${esc(p.name)}</div>`).join('')}
    </div>
    <div class="pdetail" id="pdetail"></div></div>`;
  const wheel = $('#wheel'), det = $('#pdetail'), items = $$('.wi', wheel);
  const showDetail = i => {
    const p = projects[i];
    det.innerHTML = `${box(p.image, p.name, ini(p.name), 'pimg')}<p class="pd-desc">${esc(p.description)}</p>
      <div class="chips">${chipsHtml(p.supportedPhones)}</div>
      <div><a class="btn go" href="${projectUrl(p)}">${esc(p.name)} ${esc(L.projectPage)} <span class="arr">→</span></a></div>`;
    det.classList.remove('swap'); void det.offsetWidth; det.classList.add('swap');
  };

  let pos = 0, target = 0, raf = 0, ih = 80, R = 200, cur = -1, detT, snapT, moved = 0;
  const mod = (a, n) => ((a % n) + n) % n;
  const measure = () => { ih = items[0].offsetHeight || 80; R = ih / (STEP * Math.PI / 180); };
  function frame() {
    raf = 0;
    pos += (target - pos) * .14;
    if (Math.abs(target - pos) < .0005) pos = target;
    items.forEach((el, i) => {
      let d = mod(i - pos, N); if (d > N / 2) d -= N;
      const ad = Math.abs(d);
      if (ad > 3.3) { el.style.visibility = 'hidden'; return; }
      el.style.visibility = 'visible';
      el.style.transform = `translateY(-50%) translateZ(${-R}px) rotateX(${-d * STEP}deg) translateZ(${R}px)`;
      el.style.opacity = Math.max(0, 1 - ad * .3).toFixed(3);
      el.classList.toggle('on', ad < .5);
      el.setAttribute('aria-selected', String(ad < .5));
    });
    const idx = mod(Math.round(pos), N);
    wheel.setAttribute('aria-activedescendant', `project-option-${idx}`);
    if (idx !== cur) { cur = idx; clearTimeout(detT); detT = setTimeout(() => showDetail(cur), cur === 0 && !det.innerHTML ? 0 : 90); }
    if (pos !== target) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const snapLater = () => { clearTimeout(snapT); snapT = setTimeout(() => { target = Math.round(target); kick(); }, 140); };

  wheel.addEventListener('wheel', e => {
    e.preventDefault();
    const dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
    target += Math.max(-1.5, Math.min(1.5, dy / (ih * 1.1)));
    kick(); snapLater();
  }, { passive: false });

  let drag = null;
  wheel.addEventListener('pointerdown', e => {
    drag = { lastY: e.clientY, lastT: performance.now(), v: 0 }; moved = 0;
  });
  addEventListener('pointermove', e => {
    if (!drag) return;
    const now = performance.now(), dy = e.clientY - drag.lastY, dt = Math.max(1, now - drag.lastT);
    target -= dy / (ih * .95); moved += Math.abs(dy);
    drag.v = .8 * drag.v + .2 * (-dy / (ih * .95)) / dt;
    drag.lastY = e.clientY; drag.lastT = now; kick();
  });
  addEventListener('pointerup', () => {
    if (!drag) return;
    target = Math.round(target + drag.v * 180); drag = null; kick();
  });

  items.forEach((el, i) => el.addEventListener('click', () => {
    if (moved > 6) { moved = 0; return; }
    let d = mod(i - Math.round(target), N); if (d > N / 2) d -= N;
    if (d === 0) location.href = projectUrl(projects[i]);
    else { target = Math.round(target) + d; kick(); }
  }));
  wheel.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); target = Math.round(target) + 1; kick(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); target = Math.round(target) - 1; kick(); }
    else if (e.key === 'Enter') location.href = projectUrl(projects[mod(Math.round(target), N)]);
  });
  addEventListener('resize', () => { measure(); kick(); });
  measure(); frame();
}

function renderHome({ site, projects, maintainers, devices }) {
  document.title = `${site.name} — ${site.subtitle}`;
  $('#title').setAttribute('aria-label', site.name);
  $('#title').innerHTML = [...site.name].map((c, i) =>
    `<span class="pox-letter" aria-hidden="true"><i style="--i:${i}">${esc(c)}</i></span>`).join('');
  type($('#subtitle'), site.subtitle);

  /* Social links come from site.json; entries without a valid URL are skipped. */
  const socials = (site.socials || []).map(s => ({ label: s.label, url: socialUrl(s.url || '') })).filter(s => s.label && s.url);
  if (socials.length) {
    const nav = $('#heroSocials');
    nav.innerHTML = socials.map((s, i) => `<a class="hero-social" style="--i:${i}" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(s.label)} (opens in a new tab)">${esc(s.label)} <span aria-hidden="true">↗</span></a>`).join('');
    nav.hidden = false;
  }

  $('#story').innerHTML = site.about.storyLiner.split(/\s+/).map(w => `<span class="w">${esc(w)}</span>`).join(' ');
  words = $$('.w');

  const min = (site.picker && site.picker.minProjects) || 5;
  const usePicker = projects.length > min && !reduce && matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine)').matches;
  if (usePicker) renderPicker(projects, site.labels); else renderRows(projects, site.labels);
  renderDevices(devices, projects);

  /* Maintainers: a strip of tall portraits with rotated names; the hovered one widens, the name straightens, and the profile appears. */
  $('#mlist').innerHTML = maintainers.map((m, i) => {
    const o = typeof m === 'string' ? { name: m } : m;
    const socials = (o.socials || []).map(s => ({ label: s.label, url: socialUrl(s.url) })).filter(s => s.label && s.url);
    return `<article class="mp rv" style="--d:${i * .08}s" tabindex="0" aria-label="${esc(o.name)}">
      ${box(o.image, o.name, ini(o.name), 'mp-img')}
      <div class="mp-body">
        ${o.description ? `<p class="mdesc">${esc(o.description)}</p>` : ''}
        ${socials.length ? `<nav class="social-links" aria-label="${esc(o.name)} social links">${socials.map(s => `<a class="social-link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(o.name)} on ${esc(s.label)} (opens in a new tab)">${esc(s.label)} <span aria-hidden="true">↗</span></a>`).join('')}</nav>` : ''}
      </div>
      <h3 class="mp-name">${esc(o.name)}</h3>
    </article>`;
  }).join('');
}

/* ---------- project page ---------- */
function renderProject({ site, projects }) {
  const L = site.labels, el = $('#detail');
  const p = projects.find(x => x.id === new URLSearchParams(location.search).get('id'));
  if (!p) {
    el.innerHTML = `<section class="dsec" data-theme="indigo"><div class="wrap"><a class="btn mint back" href="index.html#projects">${esc(L.back)}</a><p class="nf" style="margin-top:3rem">${esc(L.notFound)}</p></div></section>`;
    return;
  }
  const feats = p.features || [], shots = p.screenshots || [];
  document.title = `${site.name} — ${p.name}`;
  el.innerHTML = `
  <section class="dsec" data-theme="indigo"><div class="wrap">
    <a class="btn mint back" href="index.html#projects">${esc(L.back)}</a>
    <div class="d-head">
      <h1 aria-label="${esc(p.name)}">${chars(p.name)}</h1>
      <a class="btn coral" href="${esc(p.github)}" target="_blank" rel="noopener noreferrer">${esc(L.github)} <span class="arr">↗</span></a>
    </div>
    ${box(p.image, p.name, ini(p.name), 'cover rv')}
    <div class="sec rv"><p class="d-desc">${esc(p.description)}</p></div>
    <div class="sec rv">
      <h2 class="k">${esc(L.phones)}</h2>
      <div class="chips">${chipsHtml(p.supportedPhones)}</div>
    </div>
  </div></section>
  ${feats.length ? `<section class="dsec" data-theme="mint"><div class="wrap">
    <h2 class="k rv">${esc(L.features)}</h2>
    <div class="feats">${feats.map((f, i) => `
      <div class="feat rv" style="--d:${i * .06}s"><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></div>`).join('')}</div>
  </div></section>` : ''}
  ${shots.length ? `<section class="dsec" data-theme="indigo"><div class="wrap">
    <h2 class="k rv">${esc(L.screenshots)}</h2>
    <div class="shots" id="shots">${shots.map((s, i) => box(s, `${p.name} screenshot ${i + 1}`, i + 1, 'shot rv').replace('class="ph ', `style="--d:${i * .08}s" class="ph `)).join('')}</div>
  </div></section>` : ''}
  <section class="dsec" data-theme="light"><div class="wrap">
    <div class="sec rv">
      <h2 class="k">${esc(L.tutorial)}</h2>
      <div class="steps">${p.tutorial.map((t, i) => `
        <div class="step rv" style="--d:${i * .05}s">
          <span class="n">${esc(t.step)}</span>
          <div class="t"><h3>${esc(t.title)}</h3><p>${esc(t.instruction)}</p>${t.command ? `<div><code>${esc(t.command)}</code></div>` : ''}</div>
        </div>`).join('')}</div>
    </div>
  </div></section>`;

  // mouse drag-to-scroll for the screenshots strip
  const s = $('#shots');
  if (s) {
    let d = null;
    s.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; d = { x: e.clientX, l: s.scrollLeft }; s.style.scrollSnapType = 'none'; });
    addEventListener('pointermove', e => { if (d) s.scrollLeft = d.l - (e.clientX - d.x); });
    addEventListener('pointerup', () => { if (d) { d = null; s.style.scrollSnapType = ''; } });
  }
}

/* ---------- request page ---------- */
function renderRequest({ site, projects }) {
  const R = site.request, el = $('#request');
  document.title = `${site.name} — ${R.title}`;
  const pre = projects.find(x => x.id === new URLSearchParams(location.search).get('project'));
  const field = (f, i) => {
    let input;
    const req = f.required ? 'required' : '';
    if (f.type === 'textarea') input = `<textarea id="${f.id}" name="${f.id}" ${req}></textarea>`;
    else if (f.type === 'select') {
      const opts = [...(f.optionsFrom === 'projects' ? projects.map(p => p.name) : f.options || []), ...(f.extraOptions || [])];
      input = `<select id="${f.id}" name="${f.id}" ${req}><option value="">—</option>${opts.map(o =>
        `<option${pre && f.optionsFrom === 'projects' && o === pre.name ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    } else input = `<input id="${f.id}" name="${f.id}" type="${f.type || 'text'}" autocomplete="off" ${req}>`;
    return `<div class="field rv${f.type === 'select' ? ' sel' : ''}" style="--d:${i * .06}s"><label for="${f.id}">${esc(f.label)}${f.required ? ' *' : ''}</label>${input}<span class="ul"></span></div>`;
  };
  el.innerHTML = `
  <section class="rhead" data-theme="indigo">
    <h1 aria-label="${esc(R.title)}">${chars(R.title)}</h1>
    <p>${esc(R.subtitle)}</p>
  </section>
  <section class="rform" data-theme="light">
    <form id="form" novalidate>
      ${R.fields.map(field).join('')}
      <div class="actions rv">
        <button class="btn big" type="submit">${esc(R.submitLabel)} <span class="arr">→</span></button>
        <span class="status" id="status" role="status"></span>
      </div>
    </form>
  </section>`;

  const form = $('#form'), st = $('#status');
  const device = new URLSearchParams(location.search).get('device');
  if (device && form.elements.device) form.elements.device.value = device;
  form.addEventListener('input', e => e.target.closest('.field')?.classList.remove('err'));
  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true; const vals = [];
    R.fields.forEach(f => {
      const v = form.elements[f.id].value.trim(), w = form.elements[f.id].closest('.field');
      w.classList.remove('err');
      if (f.required && !v) { void w.offsetWidth; w.classList.add('err'); ok = false; }
      vals.push([f, v]);
    });
    if (!ok) { st.textContent = R.errorText; st.className = 'status bad'; return; }
    const title = `${R.submit.titlePrefix || ''} ${vals.filter(([f]) => f.inTitle).map(([, v]) => v).join(' — ')}`.trim();
    const md = vals.filter(([, v]) => v).map(([f, v]) => `**${f.label}:** ${v}`).join('\n\n');
    const plain = vals.filter(([, v]) => v).map(([f, v]) => `${f.label}: ${v}`).join('\n');
    st.textContent = R.successText; st.className = 'status good';
    if (R.submit.type === 'mailto') {
      location.href = `mailto:${R.submit.to}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(plain)}`;
    } else {
      window.open(`${R.submit.url}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(md)}`, '_blank', 'noopener');
    }
  });
}

/* ---------- scroll effects ---------- */
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    $('#header').classList.toggle('scrolled', y > 20);
    if (reduce) return;
    if (!home) {
      const c = $('.cover img');
      if (c && matchMedia('(min-width: 901px)').matches) { const r = c.parentElement.getBoundingClientRect(); c.style.transform = `translateY(${((r.top + r.height / 2 - vh / 2) / vh) * -30}px)`; }
      return;
    }
    const p = Math.min(1, y / vh), hi = $('#heroInner');
    hi.style.transform = `translateY(${p * 70}px) scale(${1 - p * .1})`;
    hi.style.opacity = Math.max(0, 1 - p * 1.1);
    const r = $('#story').getBoundingClientRect();
    const pr = Math.min(1, Math.max(0, (vh * .85 - r.top) / (r.height + vh * .35)));
    const n = Math.round(pr * words.length * 1.05);
    if (n !== lastWordCount) {
      words.forEach((w, i) => w.classList.toggle('on', i < n));
      lastWordCount = n;
    }
  });
}

function initScroll() {
  const so = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    setTheme(e.target.dataset.theme);
    if (home) $$('.nav-link').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-50% 0px -50% 0px' });
  $$('[data-theme]:not(body)').forEach(s => so.observe(s));
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initMagnetic() {
  if (!matchMedia('(hover:hover)').matches || reduce) return;
  document.addEventListener('mousemove', e => {
    const b = e.target.closest && e.target.closest('.btn');
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--mx', (e.clientX - r.left - r.width / 2) * .22 + 'px');
    b.style.setProperty('--my', (e.clientY - r.top - r.height / 2) * .35 + 'px');
  });
  document.addEventListener('mouseout', e => {
    const b = e.target.closest && e.target.closest('.btn');
    if (!b || b.contains(e.relatedTarget)) return;
    b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px');
  });
}

/* ---------- init ---------- */
(async () => {
  try {
    const [site, projects, maintainers, devices] = await Promise.all([
      getJSON('data/site.json'), getJSON('data/projects.json'), getJSON('data/maintainers.json'), getJSON('data/devices.json')]);
    D = { site, projects, maintainers, devices };
    renderChrome(site);
    if (home) renderHome(D); else if (page === 'project') renderProject(D); else if (page === 'devices') renderDevices(devices, projects); else renderRequest(D);
    watch();
    document.addEventListener('click', e => {
      const row = e.target.closest('.row');
      if (row && !e.target.closest('a')) row.classList.toggle('open');
    });
    initScroll();
    initMagnetic();
    if (home && location.hash.length > 1) {
      const t = $(location.hash);
      if (t) setTimeout(() => t.scrollIntoView({ behavior: 'auto' }), 30);
    }
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML('afterbegin',
      '<p style="padding:40px;position:relative;z-index:99">Could not load data. Serve this folder with a local server, e.g. <b>python3 -m http.server</b></p>');
  }
})();
})();
