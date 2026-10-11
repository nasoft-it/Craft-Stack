import { initInquiry, openInquiry } from './inquiry.js';
const $ = s => document.querySelector(s), root = document.documentElement;
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

const SERVICES = [
  { id: 'apps', name: 'Apps', cta: 'Discuss an App Idea', cat: 'Apps',
    h: 'Apps built around your idea.',
    p: 'Custom mobile apps, Android apps and other applications, shaped by your requirements. Bring an original concept — even an unusual or ambitious one.',
    l: ['Productivity & utility apps', 'Entertainment & games', 'Business apps', 'Original app concepts'],
    m: '<i></i><i></i><i></i><i></i><i></i><i></i>' },
  { id: 'os', name: 'OS', cta: 'Discuss an OS Idea', cat: 'OS',
    h: 'Operating-system projects, taken seriously.',
    p: 'We accept projects involving operating systems and OS-related software. Hardware support, drivers, security and compatibility all shape what is realistic — we work through them with you before committing to scope.',
    l: ['Custom OS concepts', 'Specialized system software', 'Desktop environments', 'Related digital experiences'],
    m: '<b></b><b></b><b></b><b></b>' },
  { id: 'web', name: 'Web', cta: 'Discuss a Website', cat: 'Web',
    h: 'From a simple site to a full platform.',
    p: 'Websites and web applications of any size. Ask for a single page or propose something far bigger — we scope it honestly with you.',
    l: ['Business websites & landing pages', 'E-commerce concepts', 'Dashboards & web platforms', 'Browser-based tools & custom web apps'],
    m: '<u></u><b></b><b></b><b></b>' },
  { id: 'account', name: 'Account', cta: 'Discuss an Account Project', cat: 'Account',
    h: 'Accounts your users can trust.',
    p: 'Account-based software built with proper, standards-based security: sign-in systems for your own product, user dashboards and account-management interfaces. We never build tools to bypass third-party security or access accounts without authorization.',
    l: ['Authentication for your product', 'User dashboards', 'Account management interfaces', 'Custom account-related software'],
    m: '<em></em><b></b><b></b><s></s>' },
  { id: 'social', name: 'Social', cta: 'Discuss a Social Project', cat: 'Social',
    h: 'Software that brings people together.',
    p: 'Community platforms, social applications, messaging concepts and collaboration tools. Integrations with external platforms are assessed case by case — we confirm what is possible before promising it.',
    l: ['Community platforms', 'Social applications', 'Messaging concepts', 'Collaboration tools'],
    m: '<em></em><em></em><em></em>' }
];
const servicesHTML = () => SERVICES.map((s, i) => `
<section class="svc svc-${s.id}${i % 2 ? ' flip' : ''}" id="${s.id}" aria-labelledby="${s.id}T">
  <div class="svc-text">
    <p class="eyebrow" data-reveal>${s.name}</p>
    <h2 id="${s.id}T" data-reveal style="--d:.08s">${s.h}</h2>
    <p class="lead" data-reveal style="--d:.16s">${s.p}</p>
    <ul data-reveal style="--d:.24s">${s.l.map(x => `<li>${x}</li>`).join('')}</ul>
    <div data-reveal style="--d:.32s"><button class="btn" data-inquiry="${s.cat}">${s.cta}</button></div>
  </div>
  <div class="motif m-${s.id}" aria-hidden="true" data-reveal style="--d:.2s">${s.m}</div>
</section>`).join('');

// Bidirectional reveal: toggles with viewport presence, so it replays on every scroll direction.
function initReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  if (REDUCE || !('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
  const io = new IntersectionObserver(es => es.forEach(e => {
    const t = e.target;
    if (e.isIntersecting) t.classList.remove('up'), t.classList.add('in');
    else { t.classList.remove('in'); t.classList.toggle('up', e.boundingClientRect.top < 0); }
  }), { rootMargin: '-8% 0px -8% 0px', threshold: 0 });
  els.forEach(e => io.observe(e));
}

// Scroll-linked reveal for the imagination phrase, only computed while the section is on screen.
function initImagine() {
  const sec = $('#imagine'), p = $('#imaginePhrase');
  const set = k => { p.style.opacity = .04 + .96 * k; p.style.filter = `blur(${((1 - k) * 7).toFixed(1)}px)`; p.style.letterSpacing = `${(1 - k) * .04}em`; };
  if (REDUCE) return set(1);
  let on = false, tick = false;
  const update = () => {
    tick = false;
    const r = sec.getBoundingClientRect(), vh = innerHeight;
    const d = Math.abs((r.top + r.height / 2) - vh / 2) / (vh * .55);
    const k = Math.min(1, Math.max(0, 1 - d)); set(k * k * (3 - 2 * k));
  };
  const req = () => { if (!tick) { tick = true; requestAnimationFrame(update); } };
  new IntersectionObserver(e => { on = e[0].isIntersecting; if (on) { addEventListener('scroll', req, { passive: true }); req(); } else removeEventListener('scroll', req); }, { rootMargin: '10% 0px' }).observe(sec);
  set(0);
}

const btn = $('#menuBtn'), menu = $('#menu');
$('#services').innerHTML = servicesHTML();
const setMenu = o => { menu.classList.toggle('open', o); btn.setAttribute('aria-expanded', o); btn.setAttribute('aria-label', o ? 'Close menu' : 'Open menu'); };
btn.onclick = () => setMenu(!menu.classList.contains('open'));
menu.addEventListener('click', e => { if (e.target.closest('a,button')) setMenu(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
initInquiry();
document.addEventListener('click', e => { const t = e.target.closest('[data-inquiry]'); if (t) openInquiry(t.dataset.inquiry); });
$('#yr').textContent = new Date().getFullYear();
initReveal(); initImagine();
import('./scene.js').catch(() => { $('#loader').textContent = '3D unavailable'; });
