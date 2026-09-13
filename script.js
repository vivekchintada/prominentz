/* ── Intersection Observer: reveal on scroll ───── */
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  }),
  { threshold: 0.12 }
);
reveals.forEach(el => observer.observe(el));

/* ── Nav: scroll state ──────────────────────────── */
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 60);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

/* ── Nav: mobile hamburger ──────────────────────── */
const hamburger = document.getElementById('hamburger');
const drawer = document.getElementById('nav-drawer');
hamburger.addEventListener('click', () => {
  const open = drawer.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', open);
  drawer.setAttribute('aria-hidden', !open);
});
drawer.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    drawer.classList.remove('open');
    hamburger.setAttribute('aria-expanded', false);
    drawer.setAttribute('aria-hidden', true);
  });
});

/* ── Counter ────────────────────────────────────── */
let guestCount = 2;
const counterVal = document.getElementById('counter-value');
const guestInput = document.getElementById('guest-count');
document.getElementById('counter-minus').addEventListener('click', () => {
  if (guestCount > 1) { guestCount--; counterVal.textContent = guestCount; guestInput.value = guestCount; }
});
document.getElementById('counter-plus').addEventListener('click', () => {
  if (guestCount < 20) { guestCount++; counterVal.textContent = guestCount; guestInput.value = guestCount; }
});

/* ── Animated number counters ───────────────────── */
function animateCount(el) {
  const target = parseInt(el.dataset.target, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1200;
  const start = performance.now();
  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(ease * target) + suffix;
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target + suffix;
  };
  requestAnimationFrame(update);
}
const statNums = document.querySelectorAll('.stat__num[data-target]');
const statsObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { animateCount(e.target); statsObserver.unobserve(e.target); }
  });
}, { threshold: 0.5 });
statNums.forEach(el => statsObserver.observe(el));

/* ── Gallery Lightbox ───────────────────────────── */
const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lightbox-img');
const lbCaption = document.getElementById('lightbox-caption');
let galleryItems = [];
let lbIndex = 0;

document.querySelectorAll('.gallery__item').forEach((item, i) => {
  const img = item.querySelector('img');
  const title = item.querySelector('.gallery__caption-title');
  const sub = item.querySelector('.gallery__caption-sub');
  galleryItems.push({ src: img.src, alt: img.alt, caption: title ? `${title.textContent} — ${sub.textContent}` : img.alt });
  item.addEventListener('click', () => openLightbox(i));
  item.setAttribute('role', 'button');
  item.setAttribute('tabindex', '0');
  item.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openLightbox(i); });
});

function openLightbox(index) {
  lbIndex = index;
  const item = galleryItems[lbIndex];
  lbImg.src = item.src;
  lbImg.alt = item.alt;
  lbCaption.textContent = item.caption;
  lightbox.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('lightbox-close').focus();
}
function closeLightbox() {
  lightbox.hidden = true;
  document.body.style.overflow = '';
}
function prevItem() { lbIndex = (lbIndex - 1 + galleryItems.length) % galleryItems.length; openLightbox(lbIndex); }
function nextItem() { lbIndex = (lbIndex + 1) % galleryItems.length; openLightbox(lbIndex); }

document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
document.getElementById('lightbox-prev').addEventListener('click', prevItem);
document.getElementById('lightbox-next').addEventListener('click', nextItem);
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', e => {
  if (lightbox.hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') prevItem();
  if (e.key === 'ArrowRight') nextItem();
});

/* ── Form ───────────────────────────────────────── */
const form = document.getElementById('reserve-form');
const submitBtn = document.getElementById('submit-btn');
const toast = document.getElementById('toast');

// Set min date to today
const dateInput = document.getElementById('guest-date');
const today = new Date().toISOString().split('T')[0];
dateInput.setAttribute('min', today);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.checkValidity()) {
    form.querySelectorAll('input[required], select[required]').forEach(field => {
      field.style.borderColor = field.value ? '' : '#d9534f';
      field.addEventListener('input', () => field.style.borderColor = '', { once: true });
    });
    return;
  }
  submitBtn.disabled = true;
  submitBtn.textContent = 'Confirming…';
  await new Promise(r => setTimeout(r, 1400));
  submitBtn.textContent = 'Reservation Confirmed';
  showToast('Reservation confirmed! Check your email.');
  setTimeout(() => {
    form.reset();
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirm Reservation';
    guestCount = 2;
    counterVal.textContent = 2;
    guestInput.value = 2;
  }, 4000);
});

function showToast(msg) {
  document.getElementById('toast-msg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

/* ── Smooth nav link active state ───────────────── */
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav__link');
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${e.target.id}`));
    }
  });
}, { threshold: 0.4 });
sections.forEach(s => sectionObserver.observe(s));
