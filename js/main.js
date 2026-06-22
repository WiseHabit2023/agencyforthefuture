// =============================================
// WISE HABIT AGENCY - Main JavaScript
// =============================================

document.addEventListener('DOMContentLoaded', () => {

  // ---- Mobile nav ----
  const hamburger = document.querySelector('.nav__hamburger');
  const mobileNav = document.querySelector('.nav__mobile');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
    });
  }

  // Close mobile nav on link click
  document.querySelectorAll('.nav__mobile-links a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger?.classList.remove('open');
      mobileNav?.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // ---- Facts Slider ----
  initFactsSlider();

  // ---- Portfolio Slider ----
  initPortfolioSlider();

  // ---- Active nav link ----
  setActiveNavLink();

});

// =============================================
// FACTS SLIDER
// =============================================
function initFactsSlider() {
  const track = document.querySelector('.facts-track');
  if (!track) return;

  const items = track.querySelectorAll('.fact-item');
  if (items.length === 0) return;

  let current = 0;
  const visible = window.innerWidth < 768 ? 1 : 3;

  const prevBtn = document.querySelector('.facts-prev');
  const nextBtn = document.querySelector('.facts-next');

  function update() {
    const itemWidth = items[0].offsetWidth + 1; // +1 for gap
    track.style.transform = `translateX(-${current * itemWidth}px)`;
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      current = Math.max(0, current - 1);
      update();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const max = items.length - visible;
      current = Math.min(max, current + 1);
      update();
    });
  }

  window.addEventListener('resize', update);
}

// =============================================
// PORTFOLIO SLIDER
// =============================================
function initPortfolioSlider() {
  const sliders = document.querySelectorAll('.portfolio-slider');

  sliders.forEach(slider => {
    const track = slider.querySelector('.portfolio-track');
    const slides = slider.querySelectorAll('.portfolio-slide');
    if (!track || slides.length === 0) return;

    const container = slider.closest('.portfolio');
    const prevBtn = container?.querySelector('.portfolio-prev');
    const nextBtn = container?.querySelector('.portfolio-next');
    const dots = container?.querySelectorAll('.portfolio__dot');

    let current = 0;

    function update() {
      const slideWidth = slides[0].offsetWidth;
      track.style.transform = `translateX(-${current * slideWidth}px)`;
      dots?.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        current = current > 0 ? current - 1 : slides.length - 1;
        update();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        current = current < slides.length - 1 ? current + 1 : 0;
        update();
      });
    }

    dots?.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        current = i;
        update();
      });
    });

    // Touch/swipe support
    let startX = 0;
    track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', e => {
      const diff = startX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) {
          current = current < slides.length - 1 ? current + 1 : 0;
        } else {
          current = current > 0 ? current - 1 : slides.length - 1;
        }
        update();
      }
    }, { passive: true });

    update();
    window.addEventListener('resize', update);
  });
}

// =============================================
// ACTIVE NAV LINK
// =============================================
function setActiveNavLink() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && href.includes(path) && path !== '') {
      link.closest('li')?.classList.add('active');
    }
  });
}
