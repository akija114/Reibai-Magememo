/* オフライン用：一度開けば、電波がなくても開ける。更新したら VER の数字を上げる */
const VER="pbm-v238",CORE=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png","./zumen.html","./genchou.html","./kiki.html","./core.js?v=238","./drain.js?v=228","./dxf.js?v=237","./genchou.js?v=228","./kabe.js?v=228","./kozo.js?v=228","./mitsumori.js?v=228","./models.js?v=228","./shashin.js?v=228","./sumi.js?v=228","./tanka.js?v=228","./zumen.js?v=228"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VER).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("pbm-")&&k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 const u=new URL(e.request.url);
 /* 同じサイトのファイル：ネット優先（更新がすぐ届く）、だめなら保存分 */
 if(u.origin===location.origin){
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(VER).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(m=>m||caches.match("./index.html"))));
  return;
 }
 /* 3D部品など外のファイル：保存分優先 */
 e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{const c=r.clone();caches.open(VER).then(x=>x.put(e.request,c));return r})));
});
