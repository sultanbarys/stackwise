/* ============================================
   STACKWISE — Animations & Interactions
   ============================================ */

(function () {
  'use strict';

  // ----- Navigation scroll behavior -----
  const nav = document.getElementById('nav');
  let lastScroll = 0;

  function handleNavScroll() {
    const scrollY = window.scrollY;
    if (scrollY > 80) {
      nav.classList.add('nav--scrolled');
    } else {
      nav.classList.remove('nav--scrolled');
    }
    lastScroll = scrollY;
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });


  // ----- Mobile menu toggle -----
  const hamburger = document.querySelector('.nav__hamburger');
  const mobileMenu = document.querySelector('.nav__mobile');
  const mobileLinks = document.querySelectorAll('.nav__mobile-link, .nav__mobile .btn');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function () {
      const isOpen = hamburger.getAttribute('aria-expanded') === 'true';
      hamburger.setAttribute('aria-expanded', String(!isOpen));
      hamburger.setAttribute('aria-label', isOpen ? 'Open menu' : 'Close menu');
      mobileMenu.setAttribute('aria-hidden', String(isOpen));

      // Prevent body scroll when menu is open
      document.body.style.overflow = isOpen ? '' : 'hidden';
    });

    // Close menu when clicking a link
    mobileLinks.forEach(function (link) {
      link.addEventListener('click', function () {
        hamburger.setAttribute('aria-expanded', 'false');
        hamburger.setAttribute('aria-label', 'Open menu');
        mobileMenu.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      });
    });
  }


  // ----- Smooth scroll for anchor links -----
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80; // nav height
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      }
    });
  });


  // ----- Intersection Observer — scroll animations -----
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion) {
    // General fade-in observer
    const fadeObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            fadeObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    // Observe all animated elements
    document.querySelectorAll('.anim-fade').forEach(function (el) {
      fadeObserver.observe(el);
    });

    // ----- Stagger children in grids -----
    function addStaggerClasses() {
      const grids = document.querySelectorAll(
        '.problem__grid, .losses__grid, .features__grid, .usecases__grid, .pricing__grid, .previews__grid, .trust__grid'
      );

      grids.forEach(function (grid) {
        const children = grid.querySelectorAll('.anim-fade');
        children.forEach(function (child, index) {
          // Remove any existing stagger classes to prevent duplicates
          for (var i = 1; i <= 5; i++) {
            child.classList.remove('anim-stagger-' + i);
          }
          child.classList.add('anim-stagger-' + Math.min(index + 1, 5));
        });
      });
    }

    addStaggerClasses();


    // ----- Hero diagram step-by-step animation -----
    const diagramObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateDiagram(entry.target);
            diagramObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    const heroDiagram = document.querySelector('.hero__diagram');
    if (heroDiagram) {
      diagramObserver.observe(heroDiagram);
    }

    function animateDiagram(container) {
      const steps = container.querySelectorAll('.diagram-step');
      const arrows = container.querySelectorAll('.diagram-arrow');

      // Sequence: step1 → arrow1 → step2 → arrow2 → step3 + step4
      var delays = [0, 400, 600, 1000, 1400, 1400];
      var elements = [steps[0], arrows[0], steps[1], arrows[1], steps[2], steps[3]];

      elements.forEach(function (el, i) {
        if (el) {
          setTimeout(function () {
            el.classList.add('is-visible');
          }, delays[i]);
        }
      });
    }


    // ----- Demand chart animation -----
    const chartObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateChart(entry.target);
            chartObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );

    const demandChart = document.querySelector('.demand__chart-container');
    if (demandChart) {
      chartObserver.observe(demandChart);
    }

    function animateChart(container) {
      const forecastLine = container.querySelector('.chart-line-forecast');
      const reorderMarker = container.querySelector('.chart-reorder-marker');

      // Draw the forecast line
      if (forecastLine) {
        setTimeout(function () {
          forecastLine.classList.add('is-visible');
        }, 300);
      }

      // Show reorder marker after line draws
      if (reorderMarker) {
        setTimeout(function () {
          reorderMarker.classList.add('is-visible');
        }, 1500);
      }
    }


    // ----- FAQ accordion subtle animation -----
    document.querySelectorAll('.faq__item').forEach(function (item) {
      item.addEventListener('toggle', function () {
        const answer = item.querySelector('.faq__answer');
        if (!answer) return;

        if (item.open) {
          answer.style.maxHeight = '0px';
          answer.style.opacity = '0';
          answer.style.overflow = 'hidden';
          answer.style.transition = 'max-height 400ms cubic-bezier(0.25, 0.1, 0.25, 1), opacity 300ms ease';

          // Force reflow then animate
          requestAnimationFrame(function () {
            answer.style.maxHeight = answer.scrollHeight + 'px';
            answer.style.opacity = '1';
          });
        }
      });
    });

  } else {
    // If reduced motion is preferred, make everything visible immediately
    document.querySelectorAll('.anim-fade, .diagram-step, .diagram-arrow, .chart-line-forecast, .chart-reorder-marker').forEach(function (el) {
      el.classList.add('is-visible');
    });
  }


  // ----- Subtle parallax on hero (desktop only) -----
  if (!prefersReducedMotion && window.innerWidth >= 960) {
    const heroVisual = document.querySelector('.hero__visual');

    window.addEventListener('scroll', function () {
      if (heroVisual) {
        var scrollY = window.scrollY;
        if (scrollY < 800) {
          heroVisual.style.transform = 'translateY(' + (scrollY * 0.15) + 'px)';
        }
      }
    }, { passive: true });
  }

})();
