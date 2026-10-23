/* CAD図面編集：オフライン用。一度開けば電波がなくても開ける。更新したら VER を上げる */
const VER="cad-v23",CORE=["./","./index.html","./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(VER).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("cad-")&&k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET")return;
 const u=new URL(e.request.url);
 if(u.origin===location.origin){
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(VER).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(m=>m||caches.match("./index.html"))));
  return;
 }
 // 共有（Firebase）の通信はさわらない。決まったCDNのファイルだけ保存しておく
 if(!/^(www\.gstatic\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname))return;
 if(u.hostname==="www.gstatic.com"&&!u.pathname.startsWith("/firebasejs/"))return;
 e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{const c=r.clone();caches.open(VER).then(x=>x.put(e.request,c));return r})));
});
