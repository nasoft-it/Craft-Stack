import { CONFIG } from './config.js';
const $ = s => document.querySelector(s);
let step = 1;
const dlg = () => $('#inq'), form = () => $('#inqForm'), msg = (t, bad) => { const m = $('#inqMsg'); m.textContent = t; m.dataset.bad = bad ? '1' : ''; m.innerHTML += ''; };

function render() {
  form().querySelectorAll('fieldset[data-step]').forEach(f => f.hidden = +f.dataset.step !== step);
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
  if (step === 2 && v('description').length < 10) return 'Please describe what you want us to build (at least 10 characters).';
  return '';
}
async function send() {
  const data = Object.fromEntries(new FormData(form()));
  const honey = data._honey; delete data._honey;
  const mailto = () => `mailto:${CONFIG.contactEmail}?subject=${encodeURIComponent('Project inquiry: ' + data.category)}&body=${encodeURIComponent(Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n'))}`;
  const fallback = text => { const a = document.createElement('a'); a.href = mailto(); a.textContent = text; $('#inqMsg').append(a); };
  if (!CONFIG.inquiryEndpoint) { msg('Online submission is not set up yet, so nothing has been sent. ', true); fallback('Send this inquiry by email instead'); return; }
  $('#inqNext').disabled = true; msg('Sending…');
  try {
    const r = await fetch(CONFIG.inquiryEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ ...data, _honey: honey || '', _subject: 'New CRAFTSTACK inquiry: ' + data.category, _template: 'table', _captcha: 'false' }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || String(j.success) === 'false') throw new Error(j.message || r.status);
    form().reset(); step = 1; render();
    form().classList.add('sent'); $('#inqDone').hidden = false;
    msg('Thank you — your inquiry was sent. We will reply by email to discuss your idea and pricing.');
  } catch (e) { msg(`We couldn't send your inquiry. Please try again or email us. `, true); fallback(CONFIG.contactEmail); }
  $('#inqNext').disabled = false;
}
function closeDlg() {
  const d = dlg(); if (!d.open || d.classList.contains('closing')) return;
  d.classList.add('closing');
  setTimeout(() => { d.close(); d.classList.remove('closing'); }, 220);
}
export function openInquiry(service) {
  if (service) form().elements.category.value = service;
  step = 1; msg(''); render();
  form().classList.remove('sent'); $('#inqDone').hidden = true;
  dlg().showModal();
}
export function initInquiry() {
  form().onsubmit = e => { e.preventDefault(); $('#inqNext').click(); };
  $('#inqClose').onclick = closeDlg; $('#inqDone').onclick = closeDlg;
  dlg().addEventListener('cancel', e => { e.preventDefault(); closeDlg(); });
  $('#inqBack').onclick = () => { step--; msg(''); render(); };
  $('#inqNext').onclick = () => {
    const e = valid(); if (e) return msg(e, true);
    msg(''); if (step < 3) { step++; render(); } else send();
  };
  form().elements.deadline.min = new Date().toISOString().slice(0, 10);
  dlg().addEventListener('click', e => { if (e.target === dlg()) closeDlg(); });
}
