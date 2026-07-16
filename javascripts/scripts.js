// Все JS-эффекты сайта. Размеры считаем в vw/%, чтобы всё масштабировалось
// под любую ширину экрана (правило проекта — никаких px, см. CLAUDE.md).
// При prefers-reduced-motion тяжёлые эффекты выключаются целиком.

document.addEventListener('DOMContentLoaded', () => {
  const REDUCE_MOTION = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;
  const FINE_POINTER = window.matchMedia('(pointer: fine)').matches;
  const DESKTOP = window.matchMedia('(min-width: 701px)');

  // ================================================================
  // Бургер-меню на мобилке: выезжает сбоку, закрывается по ссылке,
  // крестику-бургеру или тапу мимо панели.
  // ================================================================
  const burger = document.getElementById('burger');
  const menu = document.querySelector('.mainMenu');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      document.body.classList.toggle('menu-open');
    });
    menu.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () =>
        document.body.classList.remove('menu-open')
      )
    );
    document.addEventListener('click', (e) => {
      if (
        document.body.classList.contains('menu-open') &&
        !menu.contains(e.target) &&
        !burger.contains(e.target)
      ) {
        document.body.classList.remove('menu-open');
      }
    });
  }

  // ================================================================
  // Общий rAF-цикл: всё, что зависит от скролла/мыши, обновляется
  // одним кадром, без лишних перерисовок.
  // ================================================================
  const scrollFxs = [];
  let rafQueued = false;
  const queueUpdate = () => {
    if (rafQueued) return;
    rafQueued = true;
    requestAnimationFrame(() => {
      rafQueued = false;
      scrollFxs.forEach((fn) => fn());
    });
  };
  window.addEventListener('scroll', queueUpdate, { passive: true });
  window.addEventListener('resize', queueUpdate);

  // ================================================================
  // Полоска прогресса скролла — вертикальная, у правого края.
  // ================================================================
  const progressBar = document.createElement('div');
  progressBar.className = 'scrollProgress';
  document.body.appendChild(progressBar);
  scrollFxs.push(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    progressBar.style.transform = 'scaleY(' + p.toFixed(4) + ')';
  });

  // ================================================================
  // Смена темы по скроллу: страница разбита на цветовые зоны.
  // Тема берётся у последней секции с data-theme="pink|dark", чей верх
  // прошёл центр экрана, и действует до следующей такой секции —
  // цветные зоны сменяют друг друга без белых промежутков.
  // ================================================================
  const themedSections = [...document.querySelectorAll('[data-theme]')];
  if (themedSections.length) {
    scrollFxs.push(() => {
      const center = window.scrollY + window.innerHeight * 0.5;
      let theme = null;
      themedSections.forEach((s) => {
        if (s.offsetTop <= center) theme = s.dataset.theme;
      });
      document.body.classList.toggle('theme-pink', theme === 'pink');
      document.body.classList.toggle('theme-dark', theme === 'dark');
    });
  }

  // ================================================================
  // Подсветка активного пункта меню по скроллу (только на главной:
  // на страницах кейсов ссылки ведут на index.html#...).
  // ================================================================
  const spyPairs = [...document.querySelectorAll('.mainMenu a')]
    .filter((a) => (a.getAttribute('href') || '').startsWith('#'))
    .map((a) => ({ a, sec: document.querySelector(a.getAttribute('href')) }))
    .filter((p) => p.sec);
  if (spyPairs.length) {
    scrollFxs.push(() => {
      const pos = window.scrollY + window.innerHeight * 0.35;
      let current = null;
      spyPairs.forEach((p) => {
        if (p.sec.offsetTop <= pos) current = p.a;
      });
      spyPairs.forEach((p) => p.a.classList.toggle('active', p.a === current));
    });
  }

  // ================================================================
  // Параллакс в хиро: строки и фото едут с разной скоростью при
  // скролле и чуть сдвигаются за мышью (глубина). Только десктоп.
  // ================================================================
  if (!REDUCE_MOTION && FINE_POINTER && DESKTOP.matches) {
    const layers = [
      { el: document.querySelector('.hero__line--1'), s: 0.04, m: -0.6 },
      { el: document.querySelector('.hero__line--2'), s: 0.07, m: 0.9 },
      { el: document.querySelector('.hero__line--3'), s: 0.11, m: -1.2 },
      { el: document.querySelector('.hero__photo'), s: 0.16, m: 1.5 },
    ].filter((l) => l.el);
    if (layers.length) {
      let mx = 0;
      let my = 0;
      window.addEventListener('mousemove', (e) => {
        mx = e.clientX / window.innerWidth - 0.5;
        my = e.clientY / window.innerHeight - 0.5;
        queueUpdate();
      });
      scrollFxs.push(() => {
        // скролл переводим в vw, чтобы сдвиги масштабировались с экраном
        const syVw = (window.scrollY / window.innerWidth) * 100;
        if (syVw > 60) return; // герой уже уехал за экран
        layers.forEach(({ el, s, m }) => {
          const x = (mx * m).toFixed(3);
          const y = (syVw * s + my * m).toFixed(3);
          el.style.transform = 'translate(' + x + 'vw, ' + y + 'vw)';
        });
      });
    }
  }

  // ================================================================
  // Мобилка: лёгкий параллакс героя по скроллу — фото плавно уезжает
  // вниз и слегка уменьшается. Ховеров на таче нет, движение
  // добавляем именно на скролл.
  // ================================================================
  if (!REDUCE_MOTION && !DESKTOP.matches) {
    const photo = document.querySelector('.hero__photo');
    if (photo) {
      scrollFxs.push(() => {
        const syVw = (window.scrollY / window.innerWidth) * 100;
        if (syVw > 160) return; // герой давно уехал за экран
        const scale = Math.max(0.94, 1 - syVw * 0.0006);
        photo.style.transform =
          'translateY(' +
          (syVw * 0.1).toFixed(3) +
          'vw) scale(' +
          scale.toFixed(4) +
          ')';
      });
    }
  }

  queueUpdate(); // первый кадр сразу, не дожидаясь скролла

  // ================================================================
  // Появление блоков по скроллу: элементам вешается .js-reveal,
  // IntersectionObserver добавляет .is-visible, стаггер — по индексу
  // среди соседей через --reveal-delay.
  // ================================================================
  const revealEls = document.querySelectorAll(
    [
      '.section__title',
      '.about__title',
      '.about__text',
      '.achievement',
      '.method__step',
      '.casesMenu',
      '.caseCard',
      '.price',
      '.prices__intro',
      '.prices__note',
      '.resume__text',
      '.cv__heading',
      '.cv__item',
      '.cv__chip',
      '.resume__actions',
      '.contacts__text',
      '.contacts__actions',
      '.caseDetail__title',
      '.caseDetail__subtitle',
      '.caseDetail__meta',
      '.caseDetail__block',
      '.caseDetail__imgs img',
      '.caseDetail__next',
    ].join(', ')
  );
  if (!REDUCE_MOTION && revealEls.length && 'IntersectionObserver' in window) {
    const siblingCount = new Map();
    revealEls.forEach((el) => {
      const n = siblingCount.get(el.parentElement) || 0;
      siblingCount.set(el.parentElement, n + 1);
      el.style.setProperty('--reveal-delay', Math.min(n * 90, 540) + 'ms');
      el.classList.add('js-reveal');
      // после появления снимаем анимацию, чтобы transform был свободен
      // для ховеров (наклон карточек, магнитные кнопки)
      el.addEventListener(
        'animationend',
        () => el.classList.add('reveal-done'),
        { once: true }
      );
    });
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  // ================================================================
  // Магнитные кнопки: тянутся за курсором (сдвиг — в % от размера
  // кнопки), отпускаешь — пружинят обратно.
  // ================================================================
  if (!REDUCE_MOTION && FINE_POINTER) {
    document.querySelectorAll('.btn').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const relX = (e.clientX - r.left) / r.width - 0.5;
        const relY = (e.clientY - r.top) / r.height - 0.5;
        btn.style.transform =
          'translate(' +
          (relX * 24).toFixed(1) +
          '%, ' +
          (relY * 30).toFixed(1) +
          '%)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  // ================================================================
  // 3D-наклон карточек кейсов и цен за курсором.
  // ================================================================
  if (!REDUCE_MOTION && FINE_POINTER) {
    document.querySelectorAll('.caseCard, .price').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const relX = (e.clientX - r.left) / r.width - 0.5;
        const relY = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          'perspective(60vw) rotateX(' +
          (-relY * 6).toFixed(2) +
          'deg) rotateY(' +
          (relX * 6).toFixed(2) +
          'deg) translateY(-0.3vw)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  // ================================================================
  // Цены: числа отсчитываются от нуля, когда карточка попадает
  // в кадр («от 40 000 ₽» — крутится только число).
  // ================================================================
  const priceValues = document.querySelectorAll('.price__value');
  if (!REDUCE_MOTION && priceValues.length && 'IntersectionObserver' in window) {
    const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const priceObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          priceObserver.unobserve(entry.target);
          const el = entry.target;
          const original = el.textContent;
          const match = original.match(/\d[\d\s]*\d|\d/);
          if (!match) return; // «индивидуально» — нечего крутить
          const target = parseInt(match[0].replace(/\s/g, ''), 10);
          const start = performance.now();
          const dur = 1400;
          const tick = (now) => {
            const p = Math.min((now - start) / dur, 1);
            const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
            el.textContent = original.replace(
              match[0],
              fmt(Math.round(target * eased))
            );
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.6 }
    );
    priceValues.forEach((el) => priceObserver.observe(el));
  }

  // ================================================================
  // Кастомный курсор: точка как в таймлайне резюме вместо системной
  // стрелки. Цвет следует за темой (как лента за курсором), над
  // интерактивными элементами точка слегка растёт. Только для мыши.
  // ================================================================
  if (!REDUCE_MOTION && FINE_POINTER) {
    const dot = document.createElement('div');
    dot.className = 'cursorDot';
    document.body.appendChild(dot);
    document.body.classList.add('custom-cursor');

    // над чем точка увеличивается — всё кликабельное/хватательное
    const INTERACTIVE =
      'a, button, input, select, textarea, label, [role="button"], #burger, #casesMenuCanvas';

    document.addEventListener(
      'mousemove',
      (e) => {
        // координаты в vw, чтобы масштабировались как всё остальное
        const x = ((e.clientX / window.innerWidth) * 100).toFixed(3);
        const y = ((e.clientY / window.innerWidth) * 100).toFixed(3);
        dot.style.transform = 'translate3d(' + x + 'vw, ' + y + 'vw, 0)';
        dot.style.opacity = 1;
        const closest = (sel) => !!(e.target.closest && e.target.closest(sel));
        dot.classList.toggle('cursorDot--active', closest(INTERACTIVE));
        // над тёмной панелью кейсов точка белеет, иначе теряется
        // на чёрном; исключение — белая кнопка открытия кейса
        dot.classList.toggle(
          'cursorDot--onDark',
          closest('.casesMenu') && !closest('.casesMenu__btn')
        );
      },
      { passive: true }
    );

    // захват сферы кейсов: точка «прижимается» на pointerdown
    // и отпускается на release — вместо системного курсора-руки
    const grabArea = document.getElementById('casesMenuCanvas');
    if (grabArea) {
      grabArea.addEventListener('pointerdown', () => {
        dot.classList.add('cursorDot--grabbing');
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => {
        grabArea.addEventListener(type, () => {
          dot.classList.remove('cursorDot--grabbing');
        });
      });
    }
    // курсор ушёл за пределы окна — точка исчезает
    document.documentElement.addEventListener('mouseleave', () => {
      dot.style.opacity = 0;
    });

    // в полноэкранном режиме кейсов точку переносим внутрь
    // fullscreen-элемента (top layer перекрывает всё снаружи) —
    // кастомный курсор продолжает работать и там
    const syncCursorWithFullscreen = () => {
      const fs =
        document.fullscreenElement || document.webkitFullscreenElement;
      (fs || document.body).appendChild(dot);
    };
    document.addEventListener('fullscreenchange', syncCursorWithFullscreen);
    document.addEventListener(
      'webkitfullscreenchange',
      syncCursorWithFullscreen
    );
  }

  // ================================================================
  // Трейл за курсором: «комета» на 2D-канвасе. Хвост из сглаженных
  // точек тянется за мышью и сходит на нет; цвет следует за темой
  // (тот же, что у точки курсора). Только для мыши.
  // ================================================================
  if (!REDUCE_MOTION && FINE_POINTER) {
    const trail = document.createElement('canvas');
    trail.className = 'cursorTrail';
    document.body.appendChild(trail);
    const trailCtx = trail.getContext('2d');
    const TRAIL_DPR = Math.min(2, window.devicePixelRatio || 1);
    const sizeTrail = () => {
      trail.width = Math.round(window.innerWidth * TRAIL_DPR);
      trail.height = Math.round(window.innerHeight * TRAIL_DPR);
    };
    sizeTrail();
    window.addEventListener('resize', sizeTrail);

    // цвет хвоста по теме — как у точки курсора
    const TRAIL_RGB = {
      white: [255, 34, 152], // акцент на белом
      pink: [18, 18, 18], // чёрный на розовом
      dark: [255, 255, 255] // белый на тёмном
    };
    // курсор над тёмной панелью кейсов — хвост белеет, как и точка
    let overDarkPanel = false;
    const trailTarget = () => {
      if (overDarkPanel) return TRAIL_RGB.dark;
      if (document.body.classList.contains('theme-pink')) {
        return TRAIL_RGB.pink;
      }
      if (document.body.classList.contains('theme-dark')) {
        return TRAIL_RGB.dark;
      }
      return TRAIL_RGB.white;
    };

    const POINTS = 22;
    const pts = [];
    const trailColor = trailTarget().slice();
    const mousePos = { x: 0, y: 0 };
    let trailStarted = false;
    document.addEventListener(
      'mousemove',
      (e) => {
        mousePos.x = e.clientX;
        mousePos.y = e.clientY;
        // та же логика, что у точки курсора: над панелью кейсов
        // (кроме белой кнопки) хвост перекрашивается в белый
        const closest = (sel) => !!(e.target.closest && e.target.closest(sel));
        overDarkPanel = closest('.casesMenu') && !closest('.casesMenu__btn');
        if (!trailStarted) {
          // хвост стартует собранным в точке курсора
          trailStarted = true;
          for (let i = 0; i < POINTS; i++) {
            pts.push({ x: mousePos.x, y: mousePos.y });
          }
        }
      },
      { passive: true }
    );

    const drawTrail = () => {
      requestAnimationFrame(drawTrail);
      if (!trailStarted) return;
      // плавное перекрашивание под тему
      const target = trailTarget();
      for (let c = 0; c < 3; c++) {
        trailColor[c] += (target[c] - trailColor[c]) * 0.08;
      }
      // голова тянется к мыши, каждая точка хвоста — за предыдущей
      pts[0].x += (mousePos.x - pts[0].x) * 0.55;
      pts[0].y += (mousePos.y - pts[0].y) * 0.55;
      for (let i = 1; i < POINTS; i++) {
        pts[i].x += (pts[i - 1].x - pts[i].x) * 0.45;
        pts[i].y += (pts[i - 1].y - pts[i].y) * 0.45;
      }
      trailCtx.clearRect(0, 0, trail.width, trail.height);
      trailCtx.lineCap = 'round';
      trailCtx.lineJoin = 'round';
      // ширина головы ≈ 9px макета 1440, к хвосту сходит на нет
      const baseWidth = window.innerWidth * (9 / 1440) * TRAIL_DPR;
      const rgb = trailColor.map((c) => Math.round(c)).join(',');
      for (let i = 1; i < POINTS; i++) {
        const k = 1 - i / POINTS;
        trailCtx.strokeStyle =
          'rgba(' + rgb + ',' + (0.35 * k).toFixed(3) + ')';
        trailCtx.lineWidth = Math.max(1, baseWidth * k);
        trailCtx.beginPath();
        trailCtx.moveTo(pts[i - 1].x * TRAIL_DPR, pts[i - 1].y * TRAIL_DPR);
        trailCtx.lineTo(pts[i].x * TRAIL_DPR, pts[i].y * TRAIL_DPR);
        trailCtx.stroke();
      }
    };
    drawTrail();
  }
});
