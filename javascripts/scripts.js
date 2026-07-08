// Бургер-меню на мобилке: выезжает сбоку, закрывается по ссылке,
// крестику-бургеру или тапу мимо панели.
document.addEventListener('DOMContentLoaded', () => {
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
});

// Плавная смена темы при скролле на блок «Обо мне»:
// фон → розовый, текст → белый; и обратно при уходе из блока.
document.addEventListener('DOMContentLoaded', () => {
  const about = document.querySelector('.about');
  if (!about || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        document.body.classList.toggle('theme-pink', entry.isIntersecting);
      });
    },
    // Триггер-полоса по центру экрана: тема включается, когда блок
    // доходит до середины вьюпорта, и выключается, когда уходит.
    { root: null, threshold: 0, rootMargin: '-35% 0px -35% 0px' }
  );

  observer.observe(about);
});
