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
