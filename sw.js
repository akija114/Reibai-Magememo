/* オフライン用：一度開けば、電波がなくても開ける。更新したら VER の数字を上げる */
const VER="pbm-v178",CORE=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png","./zumen.html","./genchou.html","./kiki.html","./models.js?v=178","./core.js?v=178","./drain.js?v=178","./zumen.js?v=178","./genchou.js?v=178","./shashin.js?v=178","./kabe.js?v=178","./sumi.js?v=178","./kozo.js?v=178","./tanka.js?v=178","./mitsumori.js?v=178"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VER).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
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
