/* Olimpíadas IN-NOVA · service worker
   - Torna o site instalável como app.
   - A página é sempre buscada no servidor primeiro (versão nova na hora);
     a cópia guardada só é usada sem internet.
   - Não mexe em nada do Supabase (dados, login, tempo real): só arquivos
     do próprio site passam por aqui. */
const VERSAO = 'olimp-app-v1';
const BASE = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './favicon-64.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => Promise.all(BASE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // Supabase, fontes e bibliotecas: direto, sem cache aqui

  if (req.mode === 'navigate') {   // a página: sempre a versão mais nova; sem internet, a última guardada
    e.respondWith(
      fetch(req, {cache: 'no-cache'})
        .then(res => { if (res.ok) { const cp = res.clone(); caches.open(VERSAO).then(c => c.put('./', cp)); } return res; })
        .catch(() => caches.match('./').then(r => r || caches.match(req)))
    );
    return;
  }
  /* ícones e manifesto: do cache, atualizando por trás */
  e.respondWith(
    caches.match(req).then(salvo => {
      const rede = fetch(req).then(res => { if (res.ok) { const cp = res.clone(); caches.open(VERSAO).then(c => c.put(req, cp)); } return res; }).catch(() => salvo);
      return salvo || rede;
    })
  );
});
