// Dropbox, straight from the browser: OAuth 2 with PKCE (no secret), a refresh token kept
// on the device, and the handful of API calls Pins needs.

import { DROPBOX_APP_KEY } from './config.js';

const AUTH_KEY = 'pins.dropbox';
const PKCE_KEY = 'pins.dropbox.pkce';
const API = 'https://api.dropboxapi.com';
const CONTENT = 'https://content.dropboxapi.com';

let auth = null;
try { auth = JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { /* private mode */ }
const saveAuth = () => { try { if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth)); else localStorage.removeItem(AUTH_KEY); } catch { /* private mode */ } };

export const configured = () => !!DROPBOX_APP_KEY;
export const connected = () => !!auth?.refresh;
export const account = () => auth?.name || '';

// The page itself is the redirect target; add both the GitHub Pages address and
// http://localhost:8010/ as redirect URIs in the Dropbox app console.
const redirectUri = () => location.origin + location.pathname;

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function authorizeUrl(withRedirect) {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  try { localStorage.setItem(PKCE_KEY, JSON.stringify({ verifier, withRedirect })); } catch { /* private mode */ }
  const q = new URLSearchParams({
    client_id: DROPBOX_APP_KEY, response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256',
    token_access_type: 'offline', ...(withRedirect ? { redirect_uri: redirectUri() } : {}),
  });
  return `https://www.dropbox.com/oauth2/authorize?${q}`;
}

// In Safari: leave for Dropbox and come back to this page with ?code=…
export async function connect() { location.href = await authorizeUrl(true); }

// From the home-screen app, a round trip through Safari can land outside the app, so
// Dropbox shows a code instead, which is pasted back in (connectWithCode). The sign-in
// page is offered as a plain link: iOS blocks windows that a script opens after a delay.
export const codeLoginUrl = () => authorizeUrl(false);

async function exchange(code) {
  let pkce = {};
  try { pkce = JSON.parse(localStorage.getItem(PKCE_KEY)) || {}; } catch { /* private mode */ }
  if (!pkce.verifier) throw new Error('Start connecting again: the sign-in was opened on another device or in another app.');
  const body = new URLSearchParams({ code, grant_type: 'authorization_code', client_id: DROPBOX_APP_KEY, code_verifier: pkce.verifier, ...(pkce.withRedirect ? { redirect_uri: redirectUri() } : {}) });
  const r = await fetch(`${API}/oauth2/token`, { method: 'POST', body });
  if (!r.ok) throw new Error(`Dropbox refused the sign-in (${r.status}).`);
  const t = await r.json();
  auth = { refresh: t.refresh_token, access: t.access_token, expires: Date.now() + (t.expires_in - 60) * 1000 };
  try { localStorage.removeItem(PKCE_KEY); } catch { /* private mode */ }
  saveAuth();
  try { const me = await call('/2/users/get_current_account', null); auth.name = me.name?.display_name || me.email || ''; saveAuth(); } catch { /* name is a nicety */ }
}
export const connectWithCode = (code) => exchange(code.trim());

// Called once at start-up: finishes a sign-in that redirected back here.
export async function finishRedirect() {
  const q = new URLSearchParams(location.search);
  const code = q.get('code');
  if (!code) return false;
  history.replaceState(null, '', location.pathname);
  await exchange(code);
  return true;
}

export function disconnect() {
  const token = auth?.access;
  auth = null; saveAuth();
  if (token) fetch(`${API}/2/auth/token/revoke`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
}

async function token() {
  if (!auth) throw new Error('Not connected to Dropbox.');
  if (auth.access && Date.now() < auth.expires) return auth.access;
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: auth.refresh, client_id: DROPBOX_APP_KEY });
  const r = await fetch(`${API}/oauth2/token`, { method: 'POST', body });
  if (r.status === 400 || r.status === 401) { auth = null; saveAuth(); throw new Error('Dropbox sign-in expired. Connect again.'); }
  if (!r.ok) throw new Error(`Dropbox is unreachable (${r.status}).`);
  const t = await r.json();
  auth.access = t.access_token;
  auth.expires = Date.now() + (t.expires_in - 60) * 1000;
  saveAuth();
  return auth.access;
}

// Dropbox-API-Arg travels in a header, which must be ASCII.
const argHeader = (o) => JSON.stringify(o).replace(/[\u007f-￿]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);

export class DropboxError extends Error {
  constructor(status, body) { super(body?.error_summary || `Dropbox error ${status}`); this.status = status; this.body = body; }
  get notFound() { return this.status === 409 && /not_found/.test(this.message); }
  get conflict() { return this.status === 409 && /conflict/.test(this.message); }
}
async function fail(r) {
  let body = null;
  try { body = await r.json(); } catch { /* not JSON */ }
  return new DropboxError(r.status, body);
}

async function call(path, args) {
  const r = await fetch(API + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await token()}`, ...(args ? { 'Content-Type': 'application/json' } : {}) },
    body: args ? JSON.stringify(args) : undefined,
  });
  if (!r.ok) throw await fail(r);
  return r.json();
}

// → { blob, meta } or null if the file doesn't exist.
export async function download(path) {
  const r = await fetch(`${CONTENT}/2/files/download`, { method: 'POST', headers: { Authorization: `Bearer ${await token()}`, 'Dropbox-API-Arg': argHeader({ path }) } });
  if (!r.ok) { const e = await fail(r); if (e.notFound) return null; throw e; }
  return { blob: await r.blob(), meta: JSON.parse(r.headers.get('Dropbox-API-Result') || '{}') };
}

// rev: overwrite only if the file is still at this revision (null: only if it doesn't exist yet).
export async function upload(path, blob, { rev, overwrite = false } = {}) {
  const mode = overwrite ? 'overwrite' : rev ? { '.tag': 'update', update: rev } : 'add';
  const r = await fetch(`${CONTENT}/2/files/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': argHeader({ path, mode, autorename: false, mute: true }) },
    body: blob,
  });
  if (!r.ok) throw await fail(r);
  return r.json();
}

// Dropbox renders smaller versions of photos itself; size is one of its presets.
export async function thumbnail(path, size) {
  const r = await fetch(`${CONTENT}/2/files/get_thumbnail_v2`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await token()}`, 'Dropbox-API-Arg': argHeader({ resource: { '.tag': 'path', path }, format: 'jpeg', size, mode: 'fitone_bestfit' }) },
  });
  if (!r.ok) throw await fail(r);
  return r.blob();
}
