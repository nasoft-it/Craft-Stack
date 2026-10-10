import { CONFIG } from './config.js';
const $ = s => document.querySelector(s);
let step = 1;
const dlg = () => $('#inq'), form = () => $('#inqForm'), msg = (t, bad) => { const m = $('#inqMsg'); m.textContent = t; m.dataset.bad = bad ? '1' : ''; m.innerHTML += ''; };

const opts = () => [...document.querySelectorAll('#catUl li')];
let act = -1;
function syncCat() {
  const v = form().elements.category.value;
  $('#catVal').textContent = v || 'Choose…'; $('#catBtn').dataset.empty = v ? '' : '1';
  opts().forEach(li => li.setAttribute('aria-selected', li.dataset.v === v));
}
function hl(scroll) {
  const o = opts(); o.forEach((l, i) => l.classList.toggle('act', i === act));
  if (o[act]) { $('#catBtn').setAttribute('aria-activedescendant', o[act].id); if (scroll) o[act].scrollIntoView({ block: 'nearest' }); }
}
function catOpen(open) {
  $('#catBtn').setAttribute('aria-expanded', open); $('#catList').classList.toggle('open', open);
  if (open) { act = Math.max(0, opts().findIndex(l => l.dataset.v === form().elements.category.value)); hl(false); }
  else { act = -1; $('#catBtn').removeAttribute('aria-activedescendant'); opts().forEach(l => l.classList.remove('act')); }
}
const catIsOpen = () => $('#catList').classList.contains('open');
function catPick(v) { form().elements.category.value = v; syncCat(); catOpen(false); $('#catBtn').focus(); }
function initCategory() {
  const btn = $('#catBtn'), list = $('#catList');
  btn.onclick = () => catOpen(!catIsOpen());
  list.addEventListener('mousedown', e => e.preventDefault());
  list.addEventListener('click', e => { const li = e.target.closest('li'); if (li) catPick(li.dataset.v); });
  list.addEventListener('mousemove', e => { const li = e.target.closest('li'); if (li) { const i = opts().indexOf(li); if (i !== act) { act = i; hl(false); } } });
  btn.addEventListener('keydown', e => {
    const n = opts().length;
    if (e.key === 'Escape') { if (catIsOpen()) { e.preventDefault(); e.stopPropagation(); catOpen(false); } return; }
    if (e.key === 'Tab') { catOpen(false); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(e.key)) e.preventDefault(); else return;
    if (!catIsOpen()) { catOpen(true); return; }
    if (e.key === 'ArrowDown') act = (act + 1) % n;
    else if (e.key === 'ArrowUp') act = (act - 1 + n) % n;
    else if (e.key === 'Home') act = 0;
    else if (e.key === 'End') act = n - 1;
    else return catPick(opts()[act].dataset.v);
    hl(true);
  });
  document.addEventListener('click', e => { if (catIsOpen() && !e.target.closest('#catField')) catOpen(false); });
  dlg().addEventListener('close', () => catOpen(false));
}

function render() {
  syncCat();
  form().querySelectorAll('fieldset').forEach(f => f.hidden = +f.dataset.step !== step);
  $('#inqStep').textContent = `Step ${step} of 3`;
  $('#inqBack').hidden = step === 1;
  $('#inqNext').textContent = step === 3 ? 'Send inquiry' : 'Next';
}
function valid() {
  const v = n => form().elements[n].value.trim();
  if (step === 1) {
    if (!v('name')) return 'Please enter your name.';
    if (!/^\S+@\S+\.\S+$/.test(v('email'))) return 'Please enter a valid email address.';
    if (!v('category')) return 'Please choose a project category.';
  }
  if (step === 3 && v('deadline')) {
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(v('deadline'));
    const dt = m && new Date(+m[3], +m[2] - 1, +m[1]);
    if (!m || dt.getMonth() !== +m[2] - 1 || dt.getDate() !== +m[1]) return 'Please enter the deadline as dd-mm-yyyy, for example 25-12-2026.';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (dt < today) return 'The deadline cannot be in the past.';
  }
  if (step === 2 && v('description').length < 10) return 'Please describe what you want us to build (at least 10 characters).';
  return '';
}
async function send() {
  const data = Object.fromEntries(new FormData(form()));
  const payload = { ...data, _subject: 'CRAFTSTACK inquiry: ' + data.category, _template: 'table', _captcha: 'false' };
  const mailto = () => `mailto:${CONFIG.contactEmail}?subject=${encodeURIComponent('Project inquiry: ' + data.category)}&body=${encodeURIComponent(Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n'))}`;
  if (!CONFIG.inquiryEndpoint) {
    msg('Online submission is not set up yet, so nothing has been sent. ', true);
    const a = document.createElement('a'); a.href = mailto(); a.textContent = 'Send this inquiry by email instead';
    $('#inqMsg').append(a); return;
  }
  $('#inqNext').disabled = true; msg('Sending…');
  try {
    const r = await fetch(CONFIG.inquiryEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
    const res = await r.json().catch(() => ({}));
    if (!r.ok || res.success === false || res.success === 'false') throw new Error(res.message || r.status);
    form().reset(); step = 1; render();
    msg('Thank you — your inquiry was sent. We will reply to discuss your idea and pricing.');
  } catch (e) { msg(`We couldn't send your inquiry. Please try again or email ${CONFIG.contactEmail}.`, true); }
  $('#inqNext').disabled = false;
}
export function openInquiry(service) {
  if (service) form().elements.category.value = service;
  step = 1; msg(''); render();
  dlg().showModal();
}
export function initInquiry() {
  initCategory();
  form().onsubmit = e => { e.preventDefault(); $('#inqNext').click(); };
  $('#inqClose').onclick = () => dlg().close();
  $('#inqBack').onclick = () => { step--; msg(''); render(); };
  $('#inqNext').onclick = () => {
    const e = valid(); if (e) return msg(e, true);
    msg(''); if (step < 3) { step++; render(); } else send();
  };
  form().elements.deadline.addEventListener('input', e => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 8);
    e.target.value = d.slice(0, 2) + (d.length > 2 ? '-' + d.slice(2, 4) : '') + (d.length > 4 ? '-' + d.slice(4) : '');
  });
  dlg().addEventListener('click', e => { if (e.target === dlg()) dlg().close(); });
}
