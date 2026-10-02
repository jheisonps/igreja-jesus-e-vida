// Atualiza somente os arquivos da interface. Nunca altera os registros do Firebase.
const CACHE='iead-shell-v3-20261002';
const base=new URL('./',self.location.href);
const SHELL=['./','./index.html','./assets/app-20261002.js','./assets/style-20261002.css','./firebase-service.js?v=20261002','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL.map(p=>new URL(p,base).href))).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('iead-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const u=new URL(event.request.url);
 if(event.request.method!=='GET'||u.origin!==self.location.origin)return;
 if(u.pathname.endsWith('/firebase-config.js')){event.respondWith(fetch(event.request));return;}
 if(event.request.mode==='navigate'){
  event.respondWith(fetch(event.request).then(r=>{if(r.ok){const copy=r.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(new URL('./index.html',base).href,copy)))}return r}).catch(async()=>await caches.match(new URL('./index.html',base).href)||Response.error()));return;
 }
 if(u.pathname.includes('/assets/')||u.pathname.endsWith('/firebase-service.js')||/\.(png|webmanifest)$/.test(u.pathname))event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request).then(r=>{if(r.ok){const copy=r.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)))}return r})));
});
