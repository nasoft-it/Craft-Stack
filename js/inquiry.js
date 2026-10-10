import { CONFIG } from './config.js';
import { isAuthed } from './auth.js';
const $ = s => document.querySelector(s);
let step = 1;
const dlg = () => $('#inq'), form = () => $('#inqForm'), msg = (t, bad) => { const m = $('#inqMsg'); m.textContent = t; m.dataset.bad = bad ? '1' : ''; m.innerHTML += ''; };

function render() {
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
  if (step === 2 && v('description').length < 10) return 'Please describe what you want us to build (at least 10 characters).';
  return '';
}
async function send() {
  if (!isAuthed()) return msg('Please sign in to send an inquiry.', true);
  const data = Object.fromEntries(new FormData(form()));
  const mailto = () => `mailto:${CONFIG.contactEmail}?subject=${encodeURIComponent('Project inquiry: ' + data.category)}&body=${encodeURIComponent(Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n'))}`;
  if (!CONFIG.inquiryEndpoint) {
    msg('Online submission is not set up yet, so nothing has been sent. ', true);
    const a = document.createElement('a'); a.href = mailto(); a.textContent = 'Send this inquiry by email instead';
    $('#inqMsg').append(a); return;
  }
  $('#inqNext').disabled = true; msg('Sending…');
  try {
    const r = await fetch(CONFIG.inquiryEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) });
    if (!r.ok) throw new Error(r.status);
    form().reset(); step = 1; render();
    msg('Thank you — your inquiry was sent. We will reply to discuss your idea and pricing.');
  } catch (e) { msg(`We couldn't send your inquiry. Please try again or email ${CONFIG.contactEmail}.`, true); }
  $('#inqNext').disabled = false;
}
export function openInquiry(service) {
  if (!isAuthed()) return;
  if (service) form().elements.category.value = service;
  step = 1; msg(''); render();
  dlg().showModal();
}
export function initInquiry() {
  form().onsubmit = e => { e.preventDefault(); $('#inqNext').click(); };
  $('#inqClose').onclick = () => dlg().close();
  $('#inqBack').onclick = () => { step--; msg(''); render(); };
  $('#inqNext').onclick = () => {
    const e = valid(); if (e) return msg(e, true);
    msg(''); if (step < 3) { step++; render(); } else send();
  };
  form().elements.deadline.min = new Date().toISOString().slice(0, 10);
  dlg().addEventListener('click', e => { if (e.target === dlg()) dlg().close(); });
}
