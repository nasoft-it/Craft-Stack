import { CONFIG } from './config.js';
const $ = s => document.querySelector(s);
const configured = !!(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);
let sb = null, mode = 'signin', recovering = false, authedUser = null, inflight = null, onUnlock, onLock;

export const isAuthed = () => !!authedUser;
const say = (m, bad) => { const e = $('#authStatus'); e.textContent = m; e.dataset.bad = bad ? '1' : ''; };
const redirectUrl = () => (CONFIG.siteUrl || location.origin).replace(/\/+$/, '') + '/';
const busy = on => document.querySelectorAll('#providers button, #emailForm button, #emailForm input')
  .forEach(b => { if (!b.dataset.off) b.disabled = on; });

function showMode(m) {
  mode = m;
  $('#authSubmit').textContent = { signin: 'Sign in', signup: 'Create account', reset: 'Send reset link', recover: 'Set new password' }[m];
  $('#pwWrap').hidden = m === 'reset';
  $('#em').closest('label').hidden = m === 'recover';
  $('#mkWrap').hidden = $('#legal').hidden = m !== 'signup';
  $('#toReset').hidden = m !== 'signin';
  $('#pw').autocomplete = m === 'signin' ? 'current-password' : 'new-password';
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  if (m === 'recover') $('#emailForm').hidden = false;
}

function setSignedOut() { authedUser = null; $('#pw').value = ''; onLock(); }

// Never trust a stored session alone: ask the Supabase Auth server to validate the JWT.
function verify() {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { if ($('#authStatus').textContent === 'Checking your session…') say(''); return setSignedOut(); }
      const { data, error } = await sb.auth.getUser();
      if (error || !data.user) {
        await sb.auth.signOut({ scope: 'local' }).catch(() => {});
        setSignedOut(); say('Your session could not be verified. Please sign in again.', true); return;
      }
      authedUser = data.user; say(''); onUnlock(data.user);
    } catch (e) { setSignedOut(); say('Could not verify your session. Check your connection and reload.', true); }
    finally { inflight = null; }
  })();
  return inflight;
}

export async function signOut() {
  if (!sb) return;
  try { await sb.auth.signOut(); } finally { location.reload(); } // reload discards all protected UI state
}

// Ask Supabase which providers are actually enabled so we only start OAuth flows that can work.
async function applyProviderSettings() {
  let ext = null;
  try {
    const r = await fetch(CONFIG.supabaseUrl.replace(/\/+$/, '') + '/auth/v1/settings', { headers: { apikey: CONFIG.supabaseAnonKey } });
    if (r.ok) ext = (await r.json()).external || null;
  } catch (_) {}
  if (!ext) return;
  document.querySelectorAll('[data-provider]').forEach(b => {
    if (ext[b.dataset.provider] === false) { b.disabled = true; b.dataset.off = '1'; b.textContent += ' (not set up yet)'; }
  });
  if (ext.email === false) { const b = $('#showEmail'); b.disabled = true; b.dataset.off = '1'; b.textContent += ' (not set up yet)'; $('#emailForm').hidden = true; }
}

function urlError() {
  const p = new URLSearchParams(location.hash.slice(1) || location.search);
  const msg = p.get('error_description') || p.get('error');
  if (!msg) return '';
  history.replaceState(null, '', location.pathname);
  return msg.replace(/\+/g, ' ');
}

export async function initAuth(unlock, lock) {
  onUnlock = unlock; onLock = lock;
  $('#showEmail').onclick = () => { $('#emailForm').hidden = false; $('#em').focus(); };
  document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => showMode(b.dataset.mode));
  $('#toReset').onclick = () => showMode('reset');
  lock();
  if (!configured) {
    say('Sign-in is not set up yet. The site owner must add the Supabase URL and public key in js/config.js (see README.md).', true);
    document.querySelectorAll('#providers button, #emailForm button, #emailForm input').forEach(e => { e.disabled = true; e.dataset.off = '1'; });
    return;
  }
  const cancelled = urlError();
  say('Checking your session…'); busy(true);
  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
    sb = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  } catch (e) { say('Could not load the sign-in service. Check your connection and reload.', true); return; }

  sb.auth.onAuthStateChange((ev) => {
    // defer: calling Supabase methods inside this callback can deadlock
    setTimeout(() => {
      if (ev === 'PASSWORD_RECOVERY') { recovering = true; showMode('recover'); setSignedOut(); busy(false); say('Choose a new password.'); return; }
      if (recovering) return;
      if (ev === 'SIGNED_OUT') { authedUser ? location.reload() : setSignedOut(); return; }
      if (['INITIAL_SESSION', 'SIGNED_IN', 'TOKEN_REFRESHED', 'USER_UPDATED'].includes(ev)) verify();
    }, 0);
  });
  await applyProviderSettings();
  await verify();
  busy(false);
  if (!authedUser && cancelled) say('Sign-in was cancelled or failed: ' + cancelled, true);
  addEventListener('pageshow', e => { if (e.persisted && !authedUser) { busy(false); say(''); } });

  document.querySelectorAll('[data-provider]').forEach(b => b.onclick = async () => {
    if (b.dataset.off) return;
    busy(true); say('Redirecting to ' + b.dataset.provider[0].toUpperCase() + b.dataset.provider.slice(1) + '…');
    const { error } = await sb.auth.signInWithOAuth({ provider: b.dataset.provider, options: { redirectTo: redirectUrl() } });
    if (error) { say(error.message, true); busy(false); }
  });

  $('#emailForm').onsubmit = async e => {
    e.preventDefault();
    const email = $('#em').value.trim(), password = $('#pw').value;
    if (mode !== 'recover' && !/^\S+@\S+\.\S+$/.test(email)) return say('Enter a valid email address.', true);
    if (mode !== 'reset' && password.length < 8) return say('Password must be at least 8 characters.', true);
    busy(true); say('Working…');
    try {
      let r;
      if (mode === 'signin') {
        r = await sb.auth.signInWithPassword({ email, password });
        if (r.error) return say(/not confirmed/i.test(r.error.message) ? 'Please confirm your email first — check your inbox for the verification link.' : r.error.message, true);
      } else if (mode === 'signup') {
        r = await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl(), data: { marketing_opt_in: $('#mk').checked } } });
        if (r.error) return say(r.error.message, true);
        if (!r.data.session) return say('Check your email to verify your address, then sign in.');
      } else if (mode === 'reset') {
        r = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
        if (r.error) return say(r.error.message, true);
        return say('If an account exists for that email, a reset link is on its way.');
      } else {
        r = await sb.auth.updateUser({ password });
        if (r.error) return say(r.error.message, true);
        recovering = false; say('Password updated.'); await verify();
      }
    } catch (err) { say('Network error. Please try again.', true); }
    finally { busy(false); $('#pw').value = ''; }
  };
}
