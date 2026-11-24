/* ===== Настройки формы =====
   Способ отправки выбирается одной строкой FORM_ENDPOINT:
   1) ''                                   — открывается почтовая программа (режим по умолчанию)
   2) 'send.php'                           — свой обработчик на хостинге с PHP (файл send.php из архива)
   3) 'https://api.web3forms.com/submit'   — сервис Web3Forms, нужен ключ в WEB3FORMS_KEY
   В режиме 2 адрес получателя задаётся в send.php (массив $CONFIG), в режиме 3 — при получении ключа на сайте Web3Forms. */
const FORM_ENDPOINT = '';
const FORM_EMAIL = 'info@your-domain.ru';  // ЗАМЕНИТЬ: показывается в сообщении об ошибке и используется в режиме 1
const WEB3FORMS_KEY = '';                   // только для режима 3

(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- меню ---------- */
  const burger = $('.burger'), nav = $('#nav');
  const BURGER_W = 1280;                                    // ширина, до которой включается бургер (то же число в style.css)
  function setMenu(open) {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('noscroll', open);
  }
  function closeMenu() { if (nav) setMenu(false); }
  if (burger && nav) {
    burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
    addEventListener('resize', () => { if (innerWidth > BURGER_W) closeMenu(); });
    $$('a', nav).forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---------- прогресс и текущий раздел ---------- */
  const bar = $('.bar__p');
  let tick = false;
  function onScroll() {
    if (tick) return; tick = true;
    requestAnimationFrame(() => {
      const h = document.documentElement.scrollHeight - innerHeight;
      if (bar) bar.style.setProperty('--p', h > 0 ? Math.min(1, scrollY / h).toFixed(4) : 0);
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

  /* ---------- содержание страницы «О клубе»: подсветка текущего раздела ---------- */
  const tocLinks = $$('.toc a[href^="#"]');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const tocObs = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      tocLinks.forEach(a => { if (a.getAttribute('href') === '#' + e.target.id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    }), { rootMargin: '-30% 0px -60% 0px' });
    $$('.prose section[id]').forEach(x => tocObs.observe(x));
  }

  /* ---------- появление блоков ---------- */
  const rv = $$('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    const o = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); o.unobserve(e.target); } }), { threshold: .12 });
    rv.forEach(el => o.observe(el));
  } else rv.forEach(el => el.classList.add('in'));

  /* ---------- число локаций = число вкладок ---------- */
  (function () {
    const n = $$('.loc-tab').length, el = $('#stat-locs'), lb = $('#stat-locs-l');
    if (!el || !n) return;
    el.dataset.count = n; el.textContent = n;
    const m10 = n % 10, m100 = n % 100;
    lb.textContent = (m10 === 1 && m100 !== 11) ? 'локация' : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) ? 'локации' : 'локаций';
  })();

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
    const R = Math.random;
    // укрытия медленно «плавают» возле своих мест: bx,by — центр, ax,ay — размах, sp — скорость (рад/с)
    const OB = [[.10, .34, .10, .05], [.30, .56, .04, .17], [.40, .22, .13, .04], [.55, .50, .10, .05], [.70, .20, .04, .15], [.18, .74, .14, .04], [.82, .46, .06, .04]]
      .map((o, i) => ({ bx: o[0], by: o[1], w: o[2], h: o[3], x: o[0], y: o[1], ax: i % 2 ? .035 : .012, ay: i % 2 ? .012 : .03, sp: .12 + R() * .1, ph: R() * 6.28 }));
    // цели дрейфуют с постоянной скоростью (доли поля в секунду) и отскакивают от краёв и укрытий
    const TG = [[.22, .22], [.36, .42], [.48, .68], [.62, .32], [.78, .60], [.26, .56], [.86, .26]]
      .map(p => { const a = R() * 6.28, v = .006 + R() * .006; return { x: p[0], y: p[1], vx: Math.cos(a) * v, vy: Math.sin(a) * v, off: 0, flash: 0 }; });
    const OR = [.9, .8];
    const SIG = '95,224,47', HOT = '255,90,28', INK = '234,240,228';   // палитра из логотипа: зелёный луч, оранжевые попадания
    let W = 0, H = 0, dpr = 1, mouse = null, shots = 0, hits = 0, beams = [], sparks = [], lastUser = 0, visible = true, lastAuto = 0, lastT = 0;
    const CELL = 64;
    /* Экономия ресурсов: кадров не больше 30 в секунду, разрешение canvas не выше 1.5×, цикл стоит, пока первый экран не виден,
       вкладка скрыта или игра выключена кнопкой «Игра» рядом со счётчиком в первом экране. Выбор посетителя хранится в localStorage (ключ lt-game). */
    const FRAME_MS = 1000 / 30, DPR_MAX = 1.5, KEY = 'lt-game';
    const tgl = $('.gtgl');
    let raf = 0, tabVis = !document.hidden, lastDraw = 0, ready = false;
    const saved = (() => { try { return localStorage.getItem(KEY); } catch (_) { return null; } })();
    const weak = reduce || (navigator.connection && navigator.connection.saveData) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
    let on = saved === 'on' ? true : saved === 'off' ? false : !weak;   // без выбора: включено, кроме слабых устройств и «уменьшить движение»

    function resize() {
      const r = hero.getBoundingClientRect();
      dpr = Math.min(DPR_MAX, devicePixelRatio || 1);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!on && ready) render(performance.now());   // игра выключена: после смены размера рисуем статичный кадр
    }
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero); else addEventListener('resize', resize);

    const px = (rx, ry) => [rx * W, ry * H];
    const botEl = $('.hero__bot');
    function origin() { const x = OR[0] * W, lim = botEl ? botEl.offsetTop - 34 : H * .8; return [x, Math.min(OR[1] * H, lim)]; }
    function inObs(x, y, pad) {
      pad = pad || 0;
      for (const o of OB) {
        const ox = o.x * W, oy = o.y * H;
        if (x >= ox - pad && x <= ox + o.w * W + pad && y >= oy - pad && y <= oy + o.h * H + pad) return true;
      }
      return false;
    }
    function step(now) {
      const dt = lastT ? Math.min(.05, (now - lastT) / 1000) : 0; lastT = now;
      const t = now / 1000;
      for (const o of OB) { o.x = o.bx + o.ax * Math.sin(t * o.sp + o.ph); o.y = o.by + o.ay * Math.cos(t * o.sp * .8 + o.ph); }
      const P = 12;                                    // радиус цели: цель не заходит в укрытия
      for (const g of TG) {
        let nx = g.x + g.vx * dt, ny = g.y + g.vy * dt;
        if (nx < .04 || nx > .96) { g.vx = -g.vx; nx = g.x; }
        if (ny < .16 || ny > .82) { g.vy = -g.vy; ny = g.y; }
        if (inObs(nx * W, g.y * H, P)) { g.vx = -g.vx; nx = g.x; }
        if (inObs(nx * W, ny * H, P)) { g.vy = -g.vy; ny = g.y; }
        g.x = nx; g.y = ny;
        // укрытия двигаются сами: если укрытие наехало на цель, выталкиваем её к ближайшему краю
        for (let k = 0; k < 3; k++) {
          const px = g.x * W, py = g.y * H;
          const o = OB.find(o => { const ox = o.x * W, oy = o.y * H; return px >= ox - P && px <= ox + o.w * W + P && py >= oy - P && py <= oy + o.h * H + P; });
          if (!o) break;
          const ox = o.x * W, oy = o.y * H;
          const d = [px - (ox - P), (ox + o.w * W + P) - px, py - (oy - P), (oy + o.h * H + P) - py];
          const m = Math.min(...d), v = Math.hypot(g.vx, g.vy) || .008;
          if (m === d[0]) { g.x = (ox - P - 1) / W; g.vx = -Math.abs(g.vx || v); }
          else if (m === d[1]) { g.x = (ox + o.w * W + P + 1) / W; g.vx = Math.abs(g.vx || v); }
          else if (m === d[2]) { g.y = (oy - P - 1) / H; g.vy = -Math.abs(g.vy || v); }
          else { g.y = (oy + o.h * H + P + 1) / H; g.vy = Math.abs(g.vy || v); }
          g.x = Math.max(.04, Math.min(.96, g.x)); g.y = Math.max(.16, Math.min(.82, g.y));
        }
      }
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

    hero.addEventListener('pointermove', e => { if (on) mouse = pos(e); });
    hero.addEventListener('pointerleave', () => { mouse = null; });
    hero.addEventListener('pointerdown', e => {
      if (!on || e.target.closest('a,button')) return;
      const p = pos(e); mouse = p; lastUser = performance.now();
      shoot(p[0], p[1], true);
    });
    new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); }).observe(hero);

    function text(s, x, y, a, c) { ctx.fillStyle = 'rgba(' + (c || INK) + ',' + a + ')'; ctx.fillText(s, x, y); }

    function render(now) {
      if (on) step(now);
      ctx.clearRect(0, 0, W, H);
      // сетка
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(' + INK + ',.055)'; ctx.beginPath();
      for (let x = 0; x <= W; x += CELL) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); }
      for (let y = 0; y <= H; y += CELL) { ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); }
      ctx.stroke();
      ctx.font = '10px "IBM Plex Mono",monospace'; ctx.textBaseline = 'top';
      for (let i = 0, x = CELL; x < W; x += CELL, i++) text(String.fromCharCode(65 + (i % 26)), x + 6, 70, .3);
      for (let i = 1, y = CELL; y < H; y += CELL, i++) text(String(i + 1).padStart(2, '0'), 6, y + 6, .3);
      // укрытия
      for (const o of OB) {
        const x = o.x * W, y = o.y * H, w = o.w * W, h = o.h * H;
        ctx.fillStyle = 'rgba(' + INK + ',.045)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(' + INK + ',.22)'; ctx.strokeRect(x + .5, y + .5, w, h);
      }
      // мишени
      const pulse = !on ? 0 : (Math.sin(now / 520) + 1) / 2;
      for (const t of TG) {
        const x = t.x * W, y = t.y * H;
        if (t.flash > 0) t.flash = Math.max(0, t.flash - .03);
        const off = t.off > 0;
        ctx.strokeStyle = off ? 'rgba(' + HOT + ',' + (.2 + t.flash * .8) + ')' : 'rgba(' + INK + ',.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.2832); ctx.stroke();
        if (!off) {
          ctx.strokeStyle = 'rgba(' + SIG + ',' + (.2 + pulse * .3) + ')';
          ctx.beginPath(); ctx.arc(x, y, 12 + pulse * 5, 0, 6.2832); ctx.stroke();
          ctx.fillStyle = 'rgba(' + SIG + ',.95)'; ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.2832); ctx.fill();
        } else if (t.flash > 0) {
          ctx.fillStyle = 'rgba(' + HOT + ',' + t.flash * .5 + ')'; ctx.beginPath(); ctx.arc(x, y, 7 + (1 - t.flash) * 22, 0, 6.2832); ctx.fill();
        }
      }
      // тагер
      const [ox, oy] = origin();
      ctx.strokeStyle = 'rgba(' + INK + ',.7)'; ctx.lineWidth = 1.2; ctx.strokeRect(ox - 7, oy - 7, 14, 14);
      ctx.fillStyle = 'rgb(' + SIG + ')'; ctx.fillRect(ox - 2, oy - 2, 4, 4);
      text('ТАГЕР', ox - 17, oy + 14, .45);
      // прицел
      if (mouse) {
        const r = trace(ox, oy, mouse[0], mouse[1]);
        ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(' + SIG + ',.45)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(r.x, r.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(' + INK + ',.8)';
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
        ctx.beginPath(); ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y1);
        ctx.strokeStyle = 'rgba(' + SIG + ',' + a * .22 + ')'; ctx.lineWidth = 7 * a + 1; ctx.stroke();   // «свечение» без дорогого shadowBlur
        ctx.strokeStyle = 'rgba(' + SIG + ',' + a + ')'; ctx.lineWidth = 2 * a + .5; ctx.stroke();
      }
      sparks = sparks.filter(s => now - s.t < 500);
      for (const s of sparks) {
        const k = (now - s.t) / 500;
        ctx.strokeStyle = s.hit ? 'rgba(' + HOT + ',' + (1 - k) + ')' : 'rgba(' + INK + ',' + (.7 * (1 - k)) + ')';
        ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(s.x, s.y, 4 + k * 16, 0, 6.2832); ctx.stroke();
        if (s.hit) text('ПОПАДАНИЕ', s.x + 16, s.y - 6, 1 - k, HOT);
      }
      // автодемонстрация, пока человек не стрелял
      if (on && now - lastUser > 2600 && now - lastAuto > 2200 && W > 0) {
        const act = TG.filter(t => !t.off);
        if (act.length) { const t = act[Math.floor(Math.random() * act.length)]; shoot(t.x * W, t.y * H, false); }
        lastAuto = now;
      }
    }
    function loop(now) {
      raf = 0;
      if (!on || !visible || !tabVis) { lastT = 0; return; }
      if (now - lastDraw >= FRAME_MS - 2) { lastDraw = now; render(now); }
      raf = requestAnimationFrame(loop);
    }
    function kick() { if (!raf && on && visible && tabVis) raf = requestAnimationFrame(loop); }
    function setOn(v, save) {
      on = v;
      hero.classList.toggle('game-off', !v);
      if (tgl) {
        tgl.setAttribute('aria-checked', String(v));
      }
      if (save) { try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (_) {} }
      if (v) { lastUser = performance.now(); kick(); }
      else {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        mouse = null; beams = []; sparks = []; lastT = 0;
        render(performance.now());                        // один статичный кадр: поле остаётся на месте, но не движется
      }
    }
    if (tgl) tgl.addEventListener('click', () => setOn(!on, true));
    document.addEventListener('visibilitychange', () => { tabVis = !document.hidden; kick(); });
    ready = true;
    setOn(on, false);
  })();

  /* ---------- бесконечные CSS-анимации идут только пока видны на экране ---------- */
  (function pauseOffscreen() {
    if (!('IntersectionObserver' in window) || !document.getAnimations) return;
    const map = new Map();
    document.getAnimations().forEach(a => {
      const e = a.effect, t = e && e.target;
      if (!t || !e.getComputedTiming || e.getComputedTiming().iterations !== Infinity) return;
      if (!map.has(t)) map.set(t, []);
      map.get(t).push(a);
    });
    if (!map.size) return;
    const io = new IntersectionObserver(es => es.forEach(en => (map.get(en.target) || []).forEach(a => { try { en.isIntersecting ? a.play() : a.pause(); } catch (_) {} })));
    map.forEach((_, t) => io.observe(t));
  })();

  /* ---------- вкладки локаций ---------- */
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
  // ---------- плитки-навигация под первым экраном ----------
  // картинка: data-from="#id" (первое фото галереи блока) или data-thumb="путь"; раскладка по строкам без пустых мест
  const hubBox = $('#hubGrid'), hubTiles = hubBox ? $$('.hub-tile', hubBox) : [];
  function hubThumbs() {                                    // повторяется после подгрузки автогалерей (событие galfill)
    hubTiles.forEach(t => {
      if (t.hasAttribute('data-has-thumb')) return;
      let src = t.dataset.thumb || '';
      if (!src && t.dataset.from) { const im = $('.gal img', $(t.dataset.from) || document); if (im) src = im.getAttribute('src'); }
      if (src) { t.style.setProperty('--thumb', 'url("' + src + '")'); t.setAttribute('data-has-thumb', ''); }
    });
  }
  hubThumbs(); document.addEventListener('galfill', hubThumbs);
  hubTiles.forEach(t => {
    if (t.dataset.loc) t.addEventListener('click', () => { const i = tabs.findIndex(x => x.id === 't-' + t.dataset.loc); if (i >= 0) sel(i); });
  });
  // 9 → 3+3+3, 8 → 4+4, 7 → 3+4, 6 → 3+3, 5 → 2+3 (лишняя плитка достаётся нижним строкам); максимум в строке зависит от ширины
  function layoutHub() {
    if (!hubBox || !hubTiles.length) return;
    const n = hubTiles.length, W = hubBox.clientWidth, gap = 8, minW = innerWidth <= 560 ? 140 : innerWidth <= 960 ? 190 : 230;
    const max = Math.max(1, Math.min(4, Math.floor((W + gap) / (minW + gap))));
    const rows = Math.ceil(n / max), base = Math.floor(n / rows), extra = n % rows;
    const counts = []; for (let r = 0; r < rows; r++) counts.push(base + (r >= rows - extra ? 1 : 0));
    const gcd = (a, b) => b ? gcd(b, a % b) : a, lcm = (a, b) => a * b / gcd(a, b);
    const L = counts.reduce(lcm, 1);
    hubBox.style.gridTemplateColumns = 'repeat(' + L + ',minmax(0,1fr))';
    let k = 0;
    counts.forEach(c => { for (let j = 0; j < c; j++) hubTiles[k++].style.gridColumn = 'span ' + (L / c); });
  }
  layoutHub();
  let hubT; window.addEventListener('resize', () => { clearTimeout(hubT); hubT = setTimeout(layoutHub, 60); });
  if (tabs.length) sel(0);
  // ссылка на конкретную локацию (index.html#loc-dav, в том числе со страницы «О клубе») открывает нужную вкладку
  function hashTab() {
    const id = decodeURIComponent(location.hash.slice(1)), el = id && document.getElementById(id), pn = el && el.closest('.loc');
    const i = pn ? panels.indexOf(pn) : -1;
    if (i >= 0) { sel(i); el.scrollIntoView(); }
  }
  hashTab(); addEventListener('hashchange', hashTab);

  /* ---------- галерея: автоподбор фото, ровная раскладка, «прицел» и просмотр ---------- */
  // Сколько фото показывать в блоке на главной и «О клубе». Для одного блока своё число: data-limit="4" или data-limit="all" у <ul class="gal">
  const GAL_LIMIT = 6;
  const GAL_DIR = 'img/', GAL_THUMBS = 'img/thumbs/';
  // Подписи на кадрах (по имени файла). Нужна подпись к другому фото: добавьте строку 'имя-файла.jpg': 'подпись'
  const GAL_CAPS = {
    'bunker-01.jpg': 'игровая зона', 'bunker-04.jpg': 'Штаб',
    'davydkovo-01.jpg': 'игровая зона', 'davydkovo-04.jpg': 'Дом сказок',
    'party-01.jpg': 'квест', 'party-04.jpg': 'застолье',
    'gear-01.jpg': 'тагер', 'gear-04.jpg': 'лазерный тир'
  };
  const httpMode = location.protocol !== 'file:' && !!window.fetch;
  const galName = (p, i) => p + '-' + String(i).padStart(2, '0') + '.jpg';
  const imgOk = url => new Promise(res => { const im = new Image(); im.onload = () => res(true); im.onerror = () => res(false); im.src = url; });
  // есть ли файл: по HEAD-запросу (без скачивания фото); на file:// и там, где HEAD запрещён, пробуем загрузить как картинку
  function galExists(url) {
    if (!httpMode) return imgOk(url);
    return fetch(url, { method: 'HEAD', cache: 'no-cache' })
      .then(r => r.status === 405 ? imgOk(url) : (r.ok && /^image\//i.test(r.headers.get('content-type') || 'image/')))
      .catch(() => false);
  }
  // способ 1 (есть PHP): list.php отдаёт список имён одним запросом; способ 2 (PHP нет): перебор prefix-01.jpg, -02… до трёх пропусков подряд
  function phpList(prefixes) {
    if (!httpMode) return Promise.resolve(null);
    return fetch('list.php?prefix=' + encodeURIComponent(prefixes.join(',')), { cache: 'no-cache' })
      .then(r => r.ok ? r.json() : null)
      .then(j => (j && typeof j === 'object' && !Array.isArray(j)) ? j : null)
      .catch(() => null);
  }
  async function galProbe(prefix, need) {
    const out = []; let miss = 0, n = 1;
    while (miss < 3 && n < 400 && out.length < need) {
      const batch = []; for (let k = 0; k < 6; k++) batch.push(n++);
      const res = await Promise.all(batch.map(i => galExists(GAL_DIR + galName(prefix, i))));
      for (let k = 0; k < batch.length && miss < 3 && out.length < need; k++) {
        if (res[k]) { out.push(galName(prefix, batch[k])); miss = 0; } else miss++;
      }
    }
    return out;
  }
  const autoGals = $$('.gal[data-auto]');
  const galPrefixes = g => g.dataset.auto.split(',').map(s => s.trim()).filter(Boolean);
  const phpData = autoGals.length ? phpList(Array.from(new Set(autoGals.flatMap(galPrefixes)))) : null;
  const galNames = (p, need) => phpData.then(d => (d && Array.isArray(d[p])) ? d[p] : galProbe(p, need));
  // миниатюра из img/thumbs/, если её нет — само фото; заодно берём размеры кадра
  function galLoad(name) {
    return new Promise(res => {
      const ok = (im, src) => res(im.naturalWidth ? { src: src, w: im.naturalWidth, h: im.naturalHeight } : null);
      const t = new Image();
      t.onload = () => ok(t, GAL_THUMBS + name);
      t.onerror = () => { const f = new Image(); f.onload = () => ok(f, GAL_DIR + name); f.onerror = () => res(null); f.src = GAL_DIR + name; };
      t.src = GAL_THUMBS + name;
    });
  }
  // ровная раскладка рядами: каждый ряд ровно по ширине блока, высота ряда подбирается (динамическое программирование),
  // поэтому слева и справа края гладкие при любых пропорциях снимков, а нижний ряд тоже заполнен
  function galLayout(ul) {
    const W = ul.clientWidth;
    if (W < 40) return;                                   // блок скрыт (вкладка): раскладка сделается при показе
    const lis = Array.from(ul.children).filter(x => x.tagName === 'LI' && x._r);
    if (!lis.length || (ul._w === W && ul._n === lis.length)) return;
    ul._w = W; ul._n = lis.length;
    const gap = 6, H = W < 480 ? 120 : W < 800 ? 170 : 220, n = lis.length, r = lis.map(x => x._r);
    const hOf = (i, j) => { let s = 0; for (let k = i; k < j; k++) s += r[k]; return (W - gap * (j - i - 1)) / s; };
    const best = new Array(n + 1).fill(Infinity), prev = new Array(n + 1).fill(0); best[0] = 0;
    for (let j = 1; j <= n; j++) for (let i = Math.max(0, j - 10); i < j; i++) {
      const h = hOf(i, j), d = (h - H) / H;                // слишком низкий ряд (мелкие кадры) наказывается сильнее высокого
      const c = best[i] + (d < 0 ? 3 * d * d + (h < H * 0.8 ? 5 : 0) : d * d) + 0.03;
      if (c < best[j]) { best[j] = c; prev[j] = i; }
    }
    const rows = []; for (let j = n; j > 0; j = prev[j]) rows.unshift([prev[j], j]);
    let y = 0;
    rows.forEach(([i, j]) => {
      const cnt = j - i; let h = hOf(i, j), rowW = W, off = 0;
      if (h > H * 1.9) {                                  // 1–2 фото в ряду: не растягиваем на всю ширину, центруем
        h = H * 1.9; let s = 0; for (let k = i; k < j; k++) s += r[k];
        rowW = Math.round(h * s + gap * (cnt - 1)); off = Math.round((W - rowW) / 2);
      }
      const hh = Math.round(h), avail = rowW - gap * (cnt - 1);
      let s = 0; for (let k = i; k < j; k++) s += r[k];
      let acc = 0, prevX = 0;
      for (let k = i; k < j; k++) {
        acc += r[k]; const x = k === j - 1 ? avail : Math.round(acc / s * avail);
        const li = lis[k];
        li.style.left = (off + prevX + gap * (k - i)) + 'px'; li.style.top = y + 'px';
        li.style.width = (x - prevX) + 'px'; li.style.height = hh + 'px';
        prevX = x;
      }
      y += hh + gap;
    });
    ul.style.height = (y - gap) + 'px';
  }
  const galRO = window.ResizeObserver ? new ResizeObserver(es => es.forEach(e => galLayout(e.target))) : null;
  if (!galRO) addEventListener('resize', () => $$('.gal--j').forEach(galLayout));

  async function galFill(ul) {
    const prefixes = galPrefixes(ul), title = ul.dataset.gal || '';
    const lim = ul.dataset.limit === 'all' ? Infinity : (parseInt(ul.dataset.limit, 10) || GAL_LIMIT);
    ul.classList.add('gal--j', 'is-loading');
    const stat = Array.from(ul.children).filter(x => x.tagName === 'LI');      // готовые плитки (видео) остаются в начале
    stat.forEach(li => { const q = ($('a', li).dataset.ratio || '16/9').split('/'); li._r = (+q[0] || 16) / (+q[1] || 9); });
    let list = [];
    for (const p of prefixes) {
      if (list.length > lim) break;
      (await galNames(p, lim === Infinity ? Infinity : lim + 1 - list.length)).forEach(nm => list.push(nm));
    }
    const more = list.length > lim;
    list = list.slice(0, lim);
    const loaded = (await Promise.all(list.map(galLoad)));
    const lis = [];
    loaded.forEach((r, k) => {
      if (!r) return;
      const name = list[k], cap = GAL_CAPS[name];
      const li = document.createElement('li'), a = document.createElement('a'), im = document.createElement('img');
      a.href = GAL_DIR + name; if (cap) a.dataset.cap = cap;
      im.src = r.src; im.alt = 'Фото: ' + (cap ? title + ', ' + cap : title); im.decoding = 'async';
      a.appendChild(im); li.appendChild(a); li._r = r.w / r.h; lis.push(li);
    });
    lis.forEach(li => ul.appendChild(li));
    ul.classList.remove('is-loading');
    if (!lis.length && !stat.length) {                                          // фото нет: прячем весь блок
      (ul.closest('[data-gal-sec]') || ul.closest('.galw') || ul).hidden = true;
      galPrefixes(ul).forEach(p => $$('[data-chip="' + p + '"]').forEach(c => { c.hidden = true; }));
    } else {
      if (more && !ul.hasAttribute('data-nomore')) {
        const m = document.createElement('p'); m.className = 'more gal-more';
        const a = document.createElement('a'); a.href = ul.dataset.more || ('gallery.html#' + prefixes[0]);
        a.innerHTML = 'Все фото в галерее <i>→</i>'; m.appendChild(a); ul.insertAdjacentElement('afterend', m);
      }
      galLayout(ul); bindGal(ul);
      if (galRO) galRO.observe(ul);
    }
    document.dispatchEvent(new CustomEvent('galfill', { detail: ul }));
  }

  // видео ВКонтакте: принимает ссылку video_ext.php (из «Экспорт → код для вставки») или обычную ссылку vk.com/video-123_456
  function vkEmbed(href) {
    try {
      const u = new URL(href, location.href);
      if (!/^(www\.|m\.)?(vk\.com|vk\.ru|vkvideo\.ru)$/i.test(u.hostname)) return '';
      let oid, id, hash = u.searchParams.get('hash') || '';
      if (/video_ext\.php$/i.test(u.pathname)) { oid = u.searchParams.get('oid'); id = u.searchParams.get('id'); }
      else { const m = (u.pathname + u.search).match(/video(-?\d+)_(\d+)(?:_([0-9a-f]+))?/i); if (m) { oid = m[1]; id = m[2]; hash = hash || m[3] || ''; } }
      if (!/^-?\d+$/.test(oid || '') || !/^\d+$/.test(id || '')) return '';
      return 'https://vk.com/video_ext.php?oid=' + oid + '&id=' + id + (hash ? '&hash=' + hash : '') + '&hd=2&autoplay=1';
    } catch (e) { return ''; }
  }
  function bindGal(g) {
    const items = $$('a', g);
    items.forEach((a, i) => {
      if (a._bound) return; a._bound = true;
      const isV = a.hasAttribute('data-video');
      if (isV) {
        a.dataset.embed = vkEmbed(a.getAttribute('href'));
        a.classList.add('is-video');
        const pl = document.createElement('span'); pl.className = 'play'; pl.setAttribute('aria-hidden', 'true'); a.appendChild(pl);
        const pi = $('img', a);
        if (!pi) a.classList.add('nopost');
        a.setAttribute('aria-label', 'Видео: ' + (a.dataset.cap || g.dataset.gal || ''));
      }
      const poster = isV ? ($('img', a) ? $('img', a).getAttribute('src') : '') : a.getAttribute('href');
      if (poster) a.style.setProperty('--src', 'url("' + poster + '")');
      const c = document.createElement('span'); c.className = 'cap';
      c.innerHTML = '<b>' + String(i + 1).padStart(2, '0') + '</b>' + (a.dataset.cap ? ' · ' + a.dataset.cap : '');
      a.appendChild(c);
      const lens = e => {
        const r = a.getBoundingClientRect(), up = e.pointerType === 'touch' ? 46 : 0;   // на телефоне прицел выше пальца
        a.classList.add('is-lens');                       // слои прицела существуют только у кадра под курсором или пальцем
        a.style.setProperty('--mx', (e.clientX - r.left) + 'px'); a.style.setProperty('--my', (e.clientY - r.top - up) + 'px');
      };
      const off = () => { a.classList.remove('is-lens'); a.style.setProperty('--mx', '-999px'); a.style.setProperty('--my', '-999px'); };
      a.addEventListener('pointerdown', lens);
      a.addEventListener('pointermove', lens);
      a.addEventListener('pointerleave', off);
      a.addEventListener('pointercancel', off);
      a.addEventListener('pointerup', e => { if (e.pointerType === 'touch') setTimeout(off, 350); });
      a.addEventListener('click', e => { e.preventDefault(); openLb($$('a', g), $$('a', g).indexOf(a), g.dataset.gal || ''); });
    });
  }
  $$('.gal:not([data-auto])').forEach(bindGal);
  if (autoGals.length) {
    Promise.all(autoGals.map(galFill)).then(() => {
      if (location.hash.length > 1) { const t = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (t) t.scrollIntoView(); }
    });
  }
  $$('.gal-mode').forEach(b => b.addEventListener('click', () => {
    const w = b.closest('.galw'), on = !w.classList.contains('is-color');
    w.classList.toggle('is-color', on);
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? 'Вернуть прицел' : 'Показать в цвете';
  }));

  let lb = null;
  function openLb(items, idx, title) {
    if (lb) return;
    const opener = document.activeElement;
    let i = idx;
    lb = document.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Фото: ' + title);
    lb.innerHTML = '<div class="lb__top"><span class="lb__n"></span><span class="lb__c"></span><button class="lb__x" type="button" aria-label="Закрыть">×</button></div>' +
      '<button class="lb__a lb__prev" type="button" aria-label="Назад">←</button><figure class="lb__f"><img alt=""></figure><button class="lb__a lb__next" type="button" aria-label="Вперёд">→</button>';
    document.body.appendChild(lb); document.body.classList.add('noscroll');
    const img = $('img', lb), n = $('.lb__n', lb), c = $('.lb__c', lb);
    let zoomReset = function () {};
    function show(k) {
      i = (k + items.length) % items.length; zoomReset();
      const a = items[i], im = $('img', a);
      const old = $('iframe', lb); if (old) old.remove();          // уход с видео останавливает его
      lb.classList.toggle('is-video', a.classList.contains('is-video'));
      img.classList.remove('on');
      if (a.classList.contains('is-video')) {
        n.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
        c.textContent = title + (a.dataset.cap ? ' · ' + a.dataset.cap : '');
        const f = document.createElement('iframe');
        f.title = 'Видео: ' + (a.dataset.cap || title);
        f.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock';
        f.setAttribute('allowfullscreen', ''); f.referrerPolicy = 'strict-origin-when-cross-origin';
        const r = (a.dataset.ratio || '16/9').split('/');
        f.style.setProperty('--vr', String((+r[0] || 16) / (+r[1] || 9)));
        if (a.dataset.embed) f.src = a.dataset.embed;
        else { f.srcdoc = '<body style="margin:0;background:#0a0b0c;color:#aaa;font:14px sans-serif;display:grid;place-items:center;height:100vh">Видео недоступно: проверьте ссылку</body>'; }
        $('.lb__f', lb).appendChild(f);
        return;
      }
      img.onload = () => img.classList.add('on');
      img.src = a.getAttribute('href'); img.alt = im ? im.alt : '';
      n.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
      c.textContent = title + (a.dataset.cap ? ' · ' + a.dataset.cap : '');
      if (img.complete && img.naturalWidth) img.classList.add('on');
      [items[(i + 1) % items.length], items[(i - 1 + items.length) % items.length]].forEach(x => { if (x.classList.contains('is-video')) return; const p = new Image(); p.src = x.getAttribute('href'); });
    }
    function close() {
      document.removeEventListener('keydown', key); lb.remove(); lb = null;
      document.body.classList.remove('noscroll'); if (opener && opener.focus) opener.focus();
    }
    function key(e) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(i + 1);
      else if (e.key === 'ArrowLeft') show(i - 1);
      else if (e.key === 'Tab') {
        const f = $$('button', lb), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', key);
    $('.lb__x', lb).addEventListener('click', close);
    $('.lb__prev', lb).addEventListener('click', () => show(i - 1));
    $('.lb__next', lb).addEventListener('click', () => show(i + 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    /* масштаб и перемещение: два пальца, колесо мыши, двойное касание; зона зума занимает весь экран.
       Свайп листает кадры только при масштабе 1. Масштабирование идёт вокруг точки касания. */
    const fig = $('.lb__f', lb);
    let sc = 1, tx = 0, ty = 0, ptrs = new Map(), d0 = 0, sc0 = 1, sx = 0, sy = 0, lastTap = 0, lastTouch = 0, moved = false;
    const MAXZ = 6;
    function center() { return [img.offsetLeft + img.offsetWidth / 2, img.offsetTop + img.offsetHeight / 2]; }
    function clampAxis(t, c, size, view) {          // удерживает края фото в пределах экрана; меньшее экрана центрирует
      const half = size * sc / 2;
      return size * sc <= view ? view / 2 - c : Math.max(view - (c + half), Math.min(-(c - half), t));
    }
    function apply() {
      const c = center();
      tx = clampAxis(tx, c[0], img.offsetWidth, fig.clientWidth); ty = clampAxis(ty, c[1], img.offsetHeight, fig.clientHeight);
      img.style.transform = sc === 1 ? '' : 'translate(' + tx + 'px,' + ty + 'px) scale(' + sc + ')';
      fig.classList.toggle('zoomed', sc > 1); lb.classList.toggle('zoomed', sc > 1);
    }
    function reset() { sc = 1; tx = 0; ty = 0; apply(); }
    function zoomTo(ns, mx, my) {                   // mx,my: точка в координатах окна, остаётся под пальцами
      ns = Math.max(1, Math.min(MAXZ, ns));
      if (ns === 1) { reset(); return; }
      const r = fig.getBoundingClientRect(), c = center(), px = mx - r.left - c[0], py = my - r.top - c[1];
      tx = px - (px - tx) * ns / sc; ty = py - (py - ty) * ns / sc; sc = ns; apply();
    }
    function mid() { const p = Array.from(ptrs.values()); return [(p[0].x + p[1].x) / 2, (p[0].y + p[1].y) / 2]; }
    function dist() { const p = Array.from(ptrs.values()); return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); }
    let m0 = null;
    fig.addEventListener('pointerdown', e => {
      fig.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) { d0 = dist(); sc0 = sc; m0 = mid(); }
      sx = e.clientX; sy = e.clientY; moved = false;
    });
    fig.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 8) moved = true;
      if (ptrs.size === 2) {
        const m = mid(); tx += m[0] - m0[0]; ty += m[1] - m0[1]; m0 = m;   // перемещение двумя пальцами
        zoomTo(sc0 * dist() / d0, m[0], m[1]);
      } else if (sc > 1) { tx += dx; ty += dy; apply(); }
    });
    function up(e) {
      const had = ptrs.delete(e.pointerId);
      if (!had) return;
      if (ptrs.size === 1) { const r = Array.from(ptrs.values())[0]; sx = r.x; sy = r.y; }
      if (ptrs.size === 0 && e.type === 'pointerup') {
        if (e.pointerType === 'touch') lastTouch = Date.now();
        const dx = e.clientX - sx;
        if (sc === 1 && e.pointerType === 'touch' && Math.abs(dx) > 50 && Math.abs(e.clientY - sy) < 80) show(i + (dx < 0 ? 1 : -1));
        else if (!moved && e.pointerType === 'touch') {
          const now = Date.now();
          if (now - lastTap < 300) { if (sc > 1) reset(); else zoomTo(2.5, e.clientX, e.clientY); lastTap = 0; } else lastTap = now;
        }
      }
    }
    fig.addEventListener('pointerup', up); fig.addEventListener('pointercancel', up);
    fig.addEventListener('dblclick', e => { if (Date.now() - lastTouch < 800) return; if (sc > 1) reset(); else zoomTo(2.5, e.clientX, e.clientY); });
    fig.addEventListener('wheel', e => { e.preventDefault(); zoomTo(sc * (e.deltaY < 0 ? 1.15 : .87), e.clientX, e.clientY); }, { passive: false });
    window.addEventListener('resize', reset);
    img.addEventListener('load', reset);
    zoomReset = reset;
    show(i); $('.lb__x', lb).focus();
  }

  /* ---------- форматы -> форма ---------- */
  const fType = $('#f-type');
  $$('[data-type]').forEach(a => a.addEventListener('click', () => {
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
      if (r.ok && j.ok !== false && j.success !== false) { say('Спасибо! Мы свяжемся с Вами в ближайшее время.', 'ok'); form.reset(); }
      else if (r.status === 422 || r.status === 429) say(j.error || j.message || 'Проверьте данные и попробуйте позже.', 'err');
      else say('Не удалось отправить. Позвоните или напишите нам: 8 (977) 316-15-16, ' + FORM_EMAIL, 'err');
    } catch (_) {
      say('Не удалось отправить. Позвоните или напишите нам: 8 (977) 316-15-16, ' + FORM_EMAIL, 'err');
    } finally { clearTimeout(to); btn.disabled = false; }
  });
})();
