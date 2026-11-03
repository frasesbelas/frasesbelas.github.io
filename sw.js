'use strict';
const CACHE='fb-shell-v12';
const RUNTIME='fb-runtime-v12';
const SHELL=['./','index.html','privacidade.html','manifest.json','avisos.json','data/fundos.json','data/puzzles.json','icon-180.png','icon-192.png','icon-512.png','icon-maskable-512.png'];
const MAX_RUNTIME_ITEMS=190;
async function trimCache(cache,max){const keys=await cache.keys();if(keys.length>max){await Promise.all(keys.slice(0,keys.length-max).map(k=>cache.delete(k)));}}
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE&&key!==RUNTIME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin)return;
 const path=url.pathname;
 const isImage=/\.(?:jpg|jpeg|webp|png|avif)$/i.test(path);
 const isData=/\.json$/i.test(path);
 const isShell=SHELL.some(item=>path.endsWith(item.replace('./','/')))||path==='/'||path.endsWith('/index.html');
 if(!isImage&&!isData&&!isShell)return;
 event.respondWith((async()=>{
  const cache=await caches.open(isImage||isData?RUNTIME:CACHE);
  const cached=await cache.match(request);
  // Images use cache-first: do not spend mobile data revalidating every view.
  if(isImage&&cached)return cached;
  // JSON uses network-first so updates are seen, with an offline cached fallback.
  if(isData){
   try{const response=await fetch(request);if(response&&response.ok){await cache.put(request,response.clone());event.waitUntil(trimCache(cache,MAX_RUNTIME_ITEMS));}return response;}
   catch(error){if(cached)return cached;return Response.error();}
  }
  if(cached)return cached;
  try{const response=await fetch(request);if(response&&response.ok)event.waitUntil(cache.put(request,response.clone()));return response;}
  catch(error){if(path.endsWith('/index.html')||path==='/')return (await caches.open(CACHE)).match('index.html')||Response.error();return Response.error();}
 })());
});
