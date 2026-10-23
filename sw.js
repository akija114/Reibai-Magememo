/* オフライン用：一度開けば、電波がなくても開ける。更新したら（main に入れる時は毎回）VER の数字を上げる。
   VER が変わると、開いている画面に「新しい版があります」が出る（index.html）。❓の画面の下に今の版が出る */
const VER="pbm-v277",CORE=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png","./zumen.html","./genchou.html","./kiki.html","./genba.html","./genba.js?v=1","./core.js?v=275","./team.js?v=255","./drain.js?v=268","./dxf.js?v=271","./genchou.js?v=228","./kabe.js?v=228","./kozo.js?v=228","./mitsumori.js?v=268","./models.js?v=228","./shashin.js?v=228","./sumi.js?v=228","./tanka.js?v=228","./zumen.js?v=269","./shita.js?v=251","./yomi.js?v=250"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VER).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("pbm-")&&k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 const u=new URL(e.request.url);
 /* 同じサイトのファイル：ネット優先（更新がすぐ届く）、だめなら保存分 */
 if(u.origin===location.origin){
  /* no-cache：ブラウザのHTTPキャッシュ（GitHub Pages は約10分）を使わず、毎回サーバーに新しいか聞く（変わっていなければ通信は小さい） */
  const req=e.request.mode==="navigate"?new Request(e.request.url,{cache:"no-cache",credentials:"same-origin"}):new Request(e.request,{cache:"no-cache"});
  e.respondWith(fetch(req).then(r=>{const c=r.clone();caches.open(VER).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(m=>m||caches.match("./index.html"))));
  return;
 }
 /* 3D部品など外のファイル：保存分優先 */
 e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{const c=r.clone();caches.open(VER).then(x=>x.put(e.request,c));return r})));
});
/* 今の版を画面に教える（❓の画面に出す） */
self.addEventListener("message",e=>{if(e.data==="ver"&&e.source)e.source.postMessage({ver:VER})});
