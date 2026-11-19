/* ===== Настройки формы ===== */
const FORM_ENDPOINT = '';                   // 'send.php' на хостинге с PHP. Пусто = открывается почтовая программа
const FORM_EMAIL = 'info@your-domain.ru';  // ЗАМЕНИТЬ: реальный адрес клуба
const WEB3FORMS_KEY = '';                   // нужен только если FORM_ENDPOINT = 'https://api.web3forms.com/submit'

(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- меню ---------- */
  const burger = $('.burger'), nav = $('#nav');
  function closeMenu() { nav.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(open));
  });
  $$('a', nav).forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- прогресс и текущий раздел ---------- */
  const bar = $('.bar__p');
  let tick = false;
  function onScroll() {
    if (tick) return; tick = true;
    requestAnimationFrame(() => {
      const h = document.documentElement.scrollHeight - innerHeight;
      bar.style.setProperty('--p', h > 0 ? Math.min(1, scrollY / h).toFixed(4) : 0);
      tick = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const links = $$('.nav a[href^="#"]');
  if ('IntersectionObserver' in window) {
    const secObs = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(a => {
          if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    $$('main section[id]').forEach(s => secObs.observe(s));
  }

  /* ---------- появление блоков ---------- */
  const rv = $$('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    const o = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); o.unobserve(e.target); } }), { threshold: .12 });
    rv.forEach(el => o.observe(el));
  } else rv.forEach(el => el.classList.add('in'));

  /* ---------- счётчики ---------- */
  $$('[data-count]').forEach(el => {
    const to = +el.dataset.count;
    if (reduce || !('IntersectionObserver' in window)) return;
    el.textContent = '0';
    const o = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return; o.disconnect();
      const t0 = performance.now(), d = 1100;
      (function f(t) {
        const k = Math.min(1, (t - t0) / d);
        el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(f);
      })(t0);
    });
    o.observe(el);
  });

  /* ---------- поле в первом экране ---------- */
  (function initField() {
    const hero = $('#hero'), cv = $('#field');
    if (!hero || !cv || !cv.getContext) return;
    const ctx = cv.getContext('2d');
    const hShots = $('#h-shots'), hHits = $('#h-hits'), hAcc = $('#h-acc');
    // относительные координаты: [x, y, w, h]
    const OB = [[.10, .34, .10, .05], [.30, .56, .04, .17], [.40, .22, .13, .04], [.55, .50, .10, .05], [.70, .20, .04, .15], [.18, .74, .14, .04], [.82, .46, .06, .04]];
    const TG = [[.22, .22], [.36, .42], [.48, .68], [.62, .32], [.78, .60], [.26, .56], [.86, .26]].map(p => ({ x: p[0], y: p[1], off: 0, flash: 0 }));
    const OR = [.9, .8];
    let W = 0, H = 0, dpr = 1, mouse = null, shots = 0, hits = 0, beams = [], sparks = [], lastUser = 0, visible = true, lastAuto = 0;
    const CELL = 64;

    function resize() {
      const r = hero.getBoundingClientRect();
      dpr = Math.min(2, devicePixelRatio || 1);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero); else addEventListener('resize', resize);

    const px = (rx, ry) => [rx * W, ry * H];
    const botEl = $('.hero__bot');
    function origin() { const x = OR[0] * W, lim = botEl ? botEl.offsetTop - 34 : H * .8; return [x, Math.min(OR[1] * H, lim)]; }
    function inObs(x, y) {
      for (const o of OB) {
        const ox = o[0] * W, oy = o[1] * H;
        if (x >= ox && x <= ox + o[2] * W && y >= oy && y <= oy + o[3] * H) return true;
      }
      return false;
    }
    function trace(x0, y0, x1, y1) {
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      const max = Math.hypot(W, H);
      let x = x0, y = y0;
      for (let d = 4; d < max; d += 3) {
        x = x0 + ux * d; y = y0 + uy * d;
        if (x < 0 || y < 0 || x > W || y > H) return { x, y, hit: null, blocked: false };
        if (inObs(x, y)) return { x, y, hit: null, blocked: true };
        for (const t of TG) {
          if (t.off > 0) continue;
          if (Math.hypot(x - t.x * W, y - t.y * H) < 12) return { x, y, hit: t, blocked: false };
        }
      }
      return { x, y, hit: null, blocked: false };
    }
    function shoot(tx, ty, count) {
      const [ox, oy] = origin();
      const r = trace(ox, oy, tx, ty);
      beams.push({ x0: ox, y0: oy, x1: r.x, y1: r.y, t: performance.now(), hit: !!r.hit });
      if (r.hit) { r.hit.off = 1; r.hit.flash = 1; setTimeout(() => { r.hit.off = 0; }, 1600); }
      if (r.hit || r.blocked) sparks.push({ x: r.x, y: r.y, t: performance.now(), hit: !!r.hit });
      if (count) {
        shots++; if (r.hit) hits++;
        hShots.textContent = shots; hHits.textContent = hits;
        hAcc.textContent = Math.round(hits / shots * 100) + '%';
      }
    }
    function pos(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }

    hero.addEventListener('pointermove', e => { mouse = pos(e); });
    hero.addEventListener('pointerleave', () => { mouse = null; });
    hero.addEventListener('pointerdown', e => {
      if (e.target.closest('a,button')) return;
      const p = pos(e); mouse = p; lastUser = performance.now();
      shoot(p[0], p[1], true);
    });
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) requestAnimationFrame(frame); }).observe(hero);

    function text(s, x, y, a) { ctx.fillStyle = 'rgba(235,233,228,' + a + ')'; ctx.fillText(s, x, y); }

    function frame(now) {
      if (!visible) return;
      ctx.clearRect(0, 0, W, H);
      // сетка
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(235,233,228,.055)'; ctx.beginPath();
      for (let x = 0; x <= W; x += CELL) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); }
      for (let y = 0; y <= H; y += CELL) { ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); }
      ctx.stroke();
      ctx.font = '10px "IBM Plex Mono",monospace'; ctx.textBaseline = 'top';
      for (let i = 0, x = CELL; x < W; x += CELL, i++) text(String.fromCharCode(65 + (i % 26)), x + 6, 70, .3);
      for (let i = 1, y = CELL; y < H; y += CELL, i++) text(String(i + 1).padStart(2, '0'), 6, y + 6, .3);
      // укрытия
      for (const o of OB) {
        const x = o[0] * W, y = o[1] * H, w = o[2] * W, h = o[3] * H;
        ctx.fillStyle = 'rgba(235,233,228,.045)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(235,233,228,.22)'; ctx.strokeRect(x + .5, y + .5, w, h);
      }
      // мишени
      const pulse = reduce ? 0 : (Math.sin(now / 520) + 1) / 2;
      for (const t of TG) {
        const x = t.x * W, y = t.y * H;
        if (t.flash > 0) t.flash = Math.max(0, t.flash - .03);
        const off = t.off > 0;
        ctx.strokeStyle = off ? 'rgba(255,74,28,' + (.2 + t.flash * .8) + ')' : 'rgba(235,233,228,.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.2832); ctx.stroke();
        if (!off) {
          ctx.strokeStyle = 'rgba(255,74,28,' + (.15 + pulse * .25) + ')';
          ctx.beginPath(); ctx.arc(x, y, 12 + pulse * 5, 0, 6.2832); ctx.stroke();
          ctx.fillStyle = 'rgba(255,74,28,.9)'; ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.2832); ctx.fill();
        } else if (t.flash > 0) {
          ctx.fillStyle = 'rgba(255,74,28,' + t.flash * .5 + ')'; ctx.beginPath(); ctx.arc(x, y, 7 + (1 - t.flash) * 22, 0, 6.2832); ctx.fill();
        }
      }
      // тагер
      const [ox, oy] = origin();
      ctx.strokeStyle = 'rgba(235,233,228,.7)'; ctx.lineWidth = 1.2; ctx.strokeRect(ox - 7, oy - 7, 14, 14);
      ctx.fillStyle = '#ff4a1c'; ctx.fillRect(ox - 2, oy - 2, 4, 4);
      text('ТАГЕР', ox - 17, oy + 14, .45);
      // прицел
      if (mouse) {
        const r = trace(ox, oy, mouse[0], mouse[1]);
        ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255,74,28,.4)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(r.x, r.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(235,233,228,.8)';
        ctx.beginPath(); ctx.arc(mouse[0], mouse[1], 9, 0, 6.2832);
        ctx.moveTo(mouse[0] - 15, mouse[1]); ctx.lineTo(mouse[0] - 5, mouse[1]); ctx.moveTo(mouse[0] + 5, mouse[1]); ctx.lineTo(mouse[0] + 15, mouse[1]);
        ctx.moveTo(mouse[0], mouse[1] - 15); ctx.lineTo(mouse[0], mouse[1] - 5); ctx.moveTo(mouse[0], mouse[1] + 5); ctx.lineTo(mouse[0], mouse[1] + 15);
        ctx.stroke();
        if (r.blocked) text('БЛОК', r.x + 8, r.y + 6, .6);
      }
      // лучи
      beams = beams.filter(b => now - b.t < 320);
      for (const b of beams) {
        const a = 1 - (now - b.t) / 320;
        ctx.strokeStyle = 'rgba(255,74,28,' + a + ')'; ctx.lineWidth = 2 * a + .5;
        ctx.shadowColor = '#ff4a1c'; ctx.shadowBlur = 12 * a;
        ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1); ctx.stroke();
        ctx.shadowBlur = 0;
      }
      sparks = sparks.filter(s => now - s.t < 500);
      for (const s of sparks) {
        const k = (now - s.t) / 500;
        ctx.strokeStyle = s.hit ? 'rgba(255,74,28,' + (1 - k) + ')' : 'rgba(235,233,228,' + (.7 * (1 - k)) + ')';
        ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(s.x, s.y, 4 + k * 16, 0, 6.2832); ctx.stroke();
        if (s.hit) text('ПОПАДАНИЕ', s.x + 16, s.y - 6, 1 - k);
      }
      // автодемонстрация, пока человек не стрелял
      if (!reduce && now - lastUser > 2600 && now - lastAuto > 2200 && W > 0) {
        const act = TG.filter(t => !t.off);
        if (act.length) { const t = act[Math.floor(Math.random() * act.length)]; shoot(t.x * W, t.y * H, false); }
        lastAuto = now;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  })();

  /* ---------- схемы полигонов ---------- */
  function rng(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function buildPlan(el) {
    const r = rng(+el.dataset.seed || 1), kind = el.dataset.kind;
    const f = n => n.toFixed(1);
    let s = '<svg viewBox="0 0 100 62" preserveAspectRatio="xMidYMid meet" aria-hidden="true">';
    for (let x = 10; x < 100; x += 10) s += '<line class="gl" x1="' + x + '" y1="0" x2="' + x + '" y2="62"/>';
    for (let y = 10; y < 62; y += 10) s += '<line class="gl" x1="0" y1="' + y + '" x2="100" y2="' + y + '"/>';
    s += '<rect class="bd" x="1" y="1" width="98" height="60"/>';
    for (let i = 0; i < 9; i++) s += '<text x="' + (8 + i * 10) + '" y="4.6">' + String.fromCharCode(65 + i) + '</text>';
    for (let i = 1; i < 6; i++) s += '<text x="2" y="' + (i * 10 + 1) + '">' + String(i + 1).padStart(2, '0') + '</text>';
    const rect = (x, y, w, h, c) => '<rect class="' + (c || 'ob') + '" x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '"/>';
    const circ = (x, y, rr) => '<circle class="ob" cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(rr) + '"/>';
    const rx = (a, b) => a + r() * (b - a);

    if (kind === 'bunker') {
      s += '<rect class="wl" x="5" y="8" width="60" height="48" fill="none"/>';
      s += '<rect class="zone" x="65" y="8" width="30" height="48"/>';
      for (let i = 0; i < 6; i++) s += rect(rx(12, 54), rx(14, 46), rx(5, 10), rx(2.5, 4));
      for (let i = 0; i < 3; i++) s += rect(rx(10, 58), rx(12, 48), rx(1.8, 2.6), rx(8, 14));
      s += '<path class="tr" d="M70 16 H90 V26 H74 V38 H92 V48"/>';
      for (let i = 0; i < 3; i++) s += rect(rx(72, 88), rx(14, 46), 3.5, 3.5);
    } else if (kind === 'open') {
      s += '<rect class="zone" x="6" y="8" width="88" height="48"/>';
      for (let i = 0; i < 16; i++) s += circ(rx(14, 86), rx(12, 52), rx(1.2, 2.6));
      for (let i = 0; i < 4; i++) s += rect(rx(18, 78), rx(14, 46), rx(5, 8), rx(3, 5));
    } else if (kind === 'rooms') {
      s += '<rect class="wl" x="6" y="8" width="88" height="48" fill="none"/>';
      s += '<path class="wl" d="M35 8 V22 M35 30 V56 M64 8 V34 M64 42 V56 M6 32 H20 M28 32 H35 M35 32 H48 M56 32 H64 M64 32 H80 M88 32 H94"/>';
      for (let i = 0; i < 9; i++) s += rect(rx(10, 86), rx(11, 50), rx(2.5, 5), rx(2, 4));
    } else {
      s += '<rect class="zone" x="6" y="8" width="88" height="48"/>';
      for (let i = 0; i < 7; i++) s += rect(rx(14, 80), rx(12, 48), rx(4, 9), rx(2.5, 5));
      for (let i = 0; i < 8; i++) s += circ(rx(14, 86), rx(12, 52), rx(1.2, 2.2));
      s += '<path class="tr" d="M30 56 V40 H52 V24 H78"/>';
    }
    s += '<rect class="sp" x="2.6" y="29" width="3.2" height="3.2"/><text class="sp-t" x="2.2" y="36.5">A</text>';
    s += '<rect class="sp" x="94.2" y="29" width="3.2" height="3.2"/><text class="sp-t" x="94.6" y="36.5">B</text>';
    el.innerHTML = s + '</svg>';
  }
  $$('.plan[data-kind]').forEach(buildPlan);

  /* ---------- вкладки полигонов ---------- */
  const tabs = $$('.loc-tab'), panels = $$('.loc');
  function sel(i, focus) {
    tabs.forEach((t, j) => {
      const on = i === j;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; panels[j].hidden = !on;
    });
    if (focus) tabs[i].focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => sel(i));
    t.addEventListener('keydown', e => {
      const n = tabs.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); sel((i + 1) % n, true); }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); sel((i - 1 + n) % n, true); }
    });
  });
  if (tabs.length) sel(0);

  /* ---------- форматы -> форма ---------- */
  const fType = $('#f-type');
  $$('.row[data-type]').forEach(a => a.addEventListener('click', () => {
    if (!fType) return;
    const v = a.dataset.type;
    for (const o of fType.options) if (o.text === v) fType.value = o.value || o.text;
  }));

  /* ---------- форма заявки ---------- */
  const form = $('#form'), st = $('#fstatus');
  function say(msg, cls) { st.textContent = msg; st.className = 'fstatus' + (cls ? ' ' + cls : ''); }
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(form);
    if (fd.get('website')) return;                         // ловушка для ботов
    const data = { name: (fd.get('name') || '').trim(), contact: (fd.get('contact') || '').trim(), type: fd.get('type') || '', message: (fd.get('message') || '').trim() };
    if (!data.name || !data.contact) { say('Укажите имя и телефон или Email.', 'err'); return; }
    if (!form.consent.checked) { say('Нужно согласие на обработку персональных данных.', 'err'); return; }

    if (!FORM_ENDPOINT) {                                  // режим по умолчанию: почтовая программа
      const body = 'Имя: ' + data.name + '\nКонтакт: ' + data.contact + '\nТип: ' + data.type + '\n\n' + data.message;
      say('Открываем почтовую программу…');
      location.href = 'mailto:' + FORM_EMAIL + '?subject=' + encodeURIComponent('Заявка с сайта: ' + data.type) + '&body=' + encodeURIComponent(body);
      return;
    }
    const payload = Object.assign({}, data);
    if (WEB3FORMS_KEY) payload.access_key = WEB3FORMS_KEY;
    const ac = new AbortController(), to = setTimeout(() => ac.abort(), 12000);
    const btn = form.querySelector('button[type=submit]'); btn.disabled = true; say('Отправляем…');
    try {
      const r = await fetch(FORM_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload), signal: ac.signal });
      let j = {}; try { j = await r.json(); } catch (_) {}
      if (r.ok && j.ok !== false) { say('Спасибо! Мы свяжемся с вами в ближайшее время.', 'ok'); form.reset(); }
      else if (r.status === 422 || r.status === 429) say(j.error || j.message || 'Проверьте данные и попробуйте позже.', 'err');
      else say('Не удалось отправить. Позвоните или напишите нам: 8 (977) 316-15-16, ' + FORM_EMAIL, 'err');
    } catch (_) {
      say('Не удалось отправить. Позвоните или напишите нам: 8 (977) 316-15-16, ' + FORM_EMAIL, 'err');
    } finally { clearTimeout(to); btn.disabled = false; }
  });
})();
