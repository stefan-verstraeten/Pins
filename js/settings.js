// The Library sheet: where your memories are kept, whether the examples are shown, and
// who is recording on this phone.

import * as lib from './library.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pressed = (on) => `aria-pressed="${on ? 'true' : 'false'}"`;
const standalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;

function ago(t) {
  if (!t) return 'never';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString();
}

let waiting = 0;
let showCode = false;

async function render() {
  if ($('library').hidden) return;
  const s = lib.status();
  waiting = await lib.pendingPhotos();
  const n = lib.ownCount();
  let dropbox;
  if (!s.configured) {
    dropbox = `<p class="lib-status">Dropbox isn’t set up yet.</p>
      <p class="lib-sub">Pins needs its own Dropbox app key before it can sync. Until then, memories are kept on this device only.</p>`;
  } else if (!s.connected) {
    dropbox = `<p class="lib-status">Not connected.</p>
      <p class="lib-sub">Memories are kept on this device until you connect. Then they go to the Pins folder in your Dropbox, with the photos.</p>
      <div class="lib-actions">${standalone()
        ? '<button class="btn primary" id="lib-code-start">Connect Dropbox</button>'
        : '<button class="btn primary" id="lib-connect">Connect Dropbox</button><button class="btn" id="lib-code-start">Use a code instead</button>'}</div>
      ${showCode ? `<p class="lib-sub" style="margin-top:12px">Sign in in the window that opened, allow Pins, then copy the code Dropbox shows and paste it here.</p>
      <div class="lib-code"><input class="cap-input" id="lib-code" placeholder="Paste the code" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn primary" id="lib-code-go">Connect</button></div>` : ''}`;
  } else {
    const pending = [s.dirty ? 'changes' : '', waiting ? `${waiting} ${waiting === 1 ? 'photo' : 'photos'}` : ''].filter(Boolean).join(' and ');
    dropbox = `<p class="lib-status">${s.syncing ? 'Syncing…' : pending ? `Waiting to upload ${pending}.` : 'Up to date.'}</p>
      <p class="lib-sub">Dropbox${s.account ? ` · ${esc(s.account)}` : ''} · last synced ${ago(s.lastSync)}${navigator.onLine ? '' : ' · offline'}</p>
      <div class="lib-actions"><button class="btn primary" id="lib-sync" ${s.syncing ? 'disabled' : ''}>Sync now</button><button class="btn" id="lib-disconnect">Disconnect</button></div>`;
  }
  const me = lib.me();
  $('library-body').innerHTML = `
    <div class="f-group"><p class="eyebrow">Your memories</p>
      <p class="lib-status">${n ? `${n} ${n === 1 ? 'memory' : 'memories'} of your own.` : 'None yet. Tap + on the map to add the first.'}</p></div>
    <div class="f-group"><p class="eyebrow">Kept in</p>${dropbox}${s.error ? `<p class="lib-err">${esc(s.error)}</p>` : ''}</div>
    <div class="f-group"><p class="eyebrow">Examples</p>
      <button class="switch-row" id="lib-samples" role="switch" aria-checked="${lib.samplesShown()}">
        <span><span class="vt">Show the examples</span><br><span class="vs">${lib.SAMPLE_COUNT} invented memories that came with the prototype. They are never saved with yours.</span></span><i class="switch"></i>
      </button></div>
    <div class="f-group"><p class="eyebrow">On this phone, I am</p>
      <div class="seg" id="lib-me">${[['stefan', 'Stefan'], ['marleen', 'Marleen']].map(([v, l]) => `<button data-me="${v}" ${pressed(me === v)}>${l}</button>`).join('')}</div>
      <p class="f-hint" style="margin-top:10px">New memories are recorded by you, with you among those who were there.</p></div>`;
}

export function initSettings({ toast, onOpen }) {
  const dot = () => {
    const s = lib.status();
    const d = $('sync-dot');
    d.hidden = !(s.error || (s.configured && s.connected && s.dirty));
    d.classList.toggle('warn', !!s.error);
  };
  lib.onChange(() => { dot(); render(); });
  dot();

  $('btn-library').addEventListener('click', () => {
    const open = $('library').hidden;
    if (open) onOpen?.();
    $('library').hidden = !open;
    $('btn-library').setAttribute('aria-expanded', String(open));
    render();
    if (open) lib.sync();
  });

  $('library-body').addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    try {
      if (b.id === 'lib-connect') await lib.dropbox.connect();
      else if (b.id === 'lib-code-start') { showCode = true; await lib.dropbox.connectByCode(); render(); }
      else if (b.id === 'lib-code-go') {
        const code = $('lib-code').value.trim();
        if (!code) return;
        b.disabled = true;
        await lib.dropbox.connectWithCode(code);
        showCode = false;
        toast('Connected to Dropbox.');
        await lib.sync();
      } else if (b.id === 'lib-sync') await lib.sync();
      else if (b.id === 'lib-disconnect') {
        if (!confirm('Disconnect Dropbox on this phone? Your memories stay in Dropbox and on this phone.')) return;
        lib.dropbox.disconnect();
      } else if (b.id === 'lib-samples') lib.setShowSamples(!lib.samplesShown());
      else if (b.dataset.me) lib.setMe(b.dataset.me);
    } catch (err) {
      toast(err.message || String(err));
    }
    render();
  });
}

export function closeLibrary() {
  $('library').hidden = true;
  $('btn-library').setAttribute('aria-expanded', 'false');
}
