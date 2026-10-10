/* =====================================================================
   YOUTH RESOURCE CENTRE — shared script (used by every page)
   It does four small things:
     1. Opens/closes the ☰ menu on phones
     2. Highlights the current page in the top menu
     3. Fades sections in as you scroll ("reveal" animation)
     4. Highlights the section you're reading in the "Jump to" side menu
   Nothing here sends data anywhere.
   ===================================================================== */

document.documentElement.classList.remove('no-js');

// 1. Phone menu --------------------------------------------------------
const menuBtn  = document.querySelector('.menu-btn');
const navLinks = document.querySelector('.nav-links');
if (menuBtn && navLinks) {
  menuBtn.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.textContent = open ? '✕' : '☰';
  });
}

// 2. Current page in the top menu --------------------------------------
const here = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  if (a.getAttribute('href') === here) a.classList.add('active');
});

// 3. Fade-in on scroll -------------------------------------------------
const revealer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); revealer.unobserve(e.target); }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => revealer.observe(el));

// 4. "Jump to" side menu: highlight the section on screen ---------------
const sideLinks = document.querySelectorAll('.side a[href^="#"]');
if (sideLinks.length) {
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      sideLinks.forEach(a => {
        const on = a.getAttribute('href') === '#' + e.target.id;
        a.classList.toggle('active', on);
        if (on && window.innerWidth < 1000) a.scrollIntoView({ inline: 'center', block: 'nearest' });
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sideLinks.forEach(a => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) spy.observe(target);
  });
}
