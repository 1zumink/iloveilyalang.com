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
  // Смена темы по скроллу: секции с data-theme="pink|dark" красят
  // <body> в свой цвет, когда доходят до центра экрана (как «Обо мне»).
  // ================================================================
  const themedSections = document.querySelectorAll('[data-theme]');
  if (themedSections.length && 'IntersectionObserver' in window) {
    const themeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          document.body.classList.toggle(
            'theme-' + entry.target.dataset.theme,
            entry.isIntersecting
          );
        });
      },
      // Триггер-полоса по центру экрана: тема включается, когда блок
      // доходит до середины вьюпорта, и выключается, когда уходит.
      { root: null, threshold: 0, rootMargin: '-35% 0px -35% 0px' }
    );
    themedSections.forEach((s) => themeObserver.observe(s));
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
});
