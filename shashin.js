/* 冷媒配管の曲げ共有：shashin.js（📷 写真で測る）
   写真に写っている「寸法のわかる四角」（天カセのパネル・点検口・A4の紙など）の4つの角を合わせると、
   その四角と同じ平らな面（天井なら天井面、壁なら壁面）の上の寸法を実寸で測れる（写真の斜めのゆがみを計算で戻す）。
   ・天井モード：壁と壁の間＋真ん中、照明の端から端まで など
   ・壁モード：床から天井まで（床と壁の境目・天井と壁の境目に線を引く）
   写真は長い辺1600pxに縮めて、この端末（IndexedDB）に保存する。高さ方向（梁の成など）は1枚の写真では測れない */
(function(){
const PRE={ceil:[["天カセのパネル 950角",950,950],["点検口 450角",450,450],["点検口 600角",600,600],["システム天井 600角",600,600],["システム天井 640角",640,640],["天井ボード 910×1820",910,1820],["天井ボード 455×910",455,910]],
 wall:[["A4の紙（壁に貼る）",210,297],["A3の紙（壁に貼る）",297,420],["コンセント・スイッチのプレート（約）",70,120]]};
const MAXPX=1600,CIRC="①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";
const fm=v=>Math.round(v).toLocaleString("ja-JP");
const tst=m=>{try{toast(m)}catch(e){}};
let R=null,IMG=null,tool=null,pend=[],view={s:1,ox:0,oy:0},cv=null,ctx=null,drag=null,mag=null,saveT=0;
const PT=new Map();
/* ---------- 保存（IndexedDB） ---------- */
function db(mode,fn){return new Promise((ok,ng)=>{const q=indexedDB.open("shashinDB",1);q.onupgradeneeded=()=>{q.result.createObjectStore("p",{keyPath:"id"})};
 q.onerror=()=>ng(q.error);q.onsuccess=()=>{const d=q.result,t=d.transaction("p",mode),s=t.objectStore("p");let r;try{r=fn(s)}catch(e){ng(e);return}t.oncomplete=()=>ok(r&&r.result!==undefined?r.result:r);t.onerror=()=>ng(t.error)}})}
const dbAll=()=>db("readonly",s=>s.getAll()).catch(()=>[]);
function save(now){clearTimeout(saveT);const go=()=>{if(!R)return;const o=Object.assign({},R);db("readwrite",s=>s.put(o)).catch(e=>console.warn("shashin save",e))};if(now)go();else saveT=setTimeout(go,400)}
/* ---------- 計算：4点→4点の変換（ホモグラフィー） ---------- */
function solve(A,b){const n=b.length;for(let i=0;i<n;i++){let p=i;for(let r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;if(Math.abs(A[p][i])<1e-12)return null;
  [A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];for(let r=0;r<n;r++){if(r===i)continue;const f=A[r][i]/A[i][i];for(let c=i;c<n;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i]}}
 return b.map((v,i)=>v/A[i][i])}
function homog(S,D){const A=[],b=[];for(let k=0;k<4;k++){const[x,y]=S[k],[u,v]=D[k];A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v)}
 const h=solve(A,b);return h?[...h,1]:null}
const ap=(H,[x,y])=>{const w=H[6]*x+H[7]*y+H[8];return[(H[0]*x+H[1]*y+H[2])/w,(H[3]*x+H[4]*y+H[5])/w]};
/* 基準の四角：角を時計回り（左上から）に並べて、長い辺どうし・短い辺どうしを合わせる */
function refInfo(){if(!R||!R.ref||R.ref.pts.length<4)return null;const P=R.ref.pts,c=P.reduce((a,p)=>[a[0]+p[0]/4,a[1]+p[1]/4],[0,0]);
 let o=P.map(p=>p.slice()).sort((a,b)=>Math.atan2(a[1]-c[1],a[0]-c[0])-Math.atan2(b[1]-c[1],b[0]-c[0]));
 const st=o.reduce((bi,p,i)=>p[0]+p[1]<o[bi][0]+o[bi][1]?i:bi,0);o=o.slice(st).concat(o.slice(0,st));
 const d=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]),e0=d(o[0],o[1])+d(o[2],o[3]),e1=d(o[1],o[2])+d(o[3],o[0]);
 let W=R.ref.W,Hh=R.ref.H;const lng=Math.max(W,Hh),sht=Math.min(W,Hh);if(e0>=e1){W=lng;Hh=sht}else{W=sht;Hh=lng}if(R.ref.sw){const t=W;W=Hh;Hh=t}
 /* 凸の四角か（角が交差していないか） */
 for(let i=0;i<4;i++){const a=o[i],b=o[(i+1)%4],q=o[(i+2)%4],cr=(b[0]-a[0])*(q[1]-b[1])-(b[1]-a[1])*(q[0]-b[0]);if(cr<=0)return null}
 const H=homog(o,[[0,0],[W,0],[W,Hh],[0,Hh]]),Hi=homog([[0,0],[W,0],[W,Hh],[0,Hh]],o);if(!H||!Hi)return null;return{H,Hi,W,Hh,o}}
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1],len=a=>Math.hypot(a[0],a[1]);
function lineDist(p,a,b){const d=sub(b,a),L=len(d)||1;return((p[0]-a[0])*d[1]-(p[1]-a[1])*d[0])/L}   // 符号付き
function proj(p,a,b){const d=sub(b,a),t=dot(sub(p,a),d)/(dot(d,d)||1);return[a[0]+d[0]*t,a[1]+d[1]*t]}
/* 1つの測定の結果（実寸） */
function calc(m,I){if(!I)return null;const w=m.pts.map(p=>ap(I.H,p)),far=Math.max(...w.map(p=>len(sub(p,[I.W/2,I.Hh/2]))))>6*Math.max(I.W,I.Hh);
 if(m.k==="p2"&&w.length===2){return{L:len(sub(w[1],w[0])),mid:[(w[0][0]+w[1][0])/2,(w[0][1]+w[1][1])/2],far}}
 if(m.k==="ll"&&w.length===4){const[a,b,c,d]=w,dd=[Math.abs(lineDist(c,a,b)),Math.abs(lineDist(d,a,b)),Math.abs(lineDist(a,c,d)),Math.abs(lineDist(b,c,d))],L=dd.reduce((x,y)=>x+y)/4;
  const u=sub(b,a),v=sub(d,c),ang=Math.acos(Math.min(1,Math.abs(dot(u,v))/((len(u)*len(v))||1)))*180/Math.PI;
  const m1=[(a[0]+proj(a,c,d)[0])/2,(a[1]+proj(a,c,d)[1])/2],m2=[(b[0]+proj(b,c,d)[0])/2,(b[1]+proj(b,c,d)[1])/2];
  const ctr=[I.W/2,I.Hh/2],off=lineDist(ctr,m1,m2),sA=Math.sign(lineDist(a,m1,m2))||1;
  return{L,ang,m1,m2,off:Math.abs(off),offA:Math.sign(off)===sA,far}}
 return null}
/* ---------- 画面 ---------- */
function css(){if(document.getElementById("shCss"))return;const s=document.createElement("style");s.id="shCss";s.textContent=`
#shOv{position:fixed;inset:0;z-index:90;background:#0b1220;display:none;flex-direction:column;color:#0f172a;font-family:inherit}
#shOv.on{display:flex}
#shTop{display:flex;gap:6px;align-items:center;padding:calc(env(safe-area-inset-top,0px) + 6px) 8px 6px;background:#0f172a;color:#fff}
#shTop b{flex:1;font-size:16px}
#shTop button{white-space:nowrap;height:38px;border-radius:10px;border:0;background:#1e293b;color:#fff;font-weight:800;font-size:14px;padding:0 10px}
#shTop .seg button.on{background:#2563eb}
#shCv{flex:1;min-height:0;touch-action:none;display:block;width:100%}
#shBot{flex:none;max-height:46vh;overflow-y:auto;background:#f8fafc;border-radius:16px 16px 0 0;padding:10px 10px calc(env(safe-area-inset-bottom,0px) + 10px)}
#shBot .row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
#shBot .tb{flex:1 1 0;min-width:0;height:48px;border-radius:12px;border:1.5px solid #cbd5e1;background:#fff;font-weight:800;font-size:14px;color:#0f172a}
#shBot .tb.on{background:#2563eb;color:#fff;border-color:#2563eb}
#shBot .big{width:100%;min-height:52px;border-radius:14px;border:0;background:#2563eb;color:#fff;font-weight:800;font-size:16px;margin-bottom:8px}
#shBot .note{font-size:13px;line-height:1.5;background:#eef2ff;color:#1e3a8a;border-radius:10px;padding:8px 10px;margin-bottom:8px}
#shBot .warn{background:#fef3c7;color:#92400e}
#shBot select,#shBot input{height:40px;border-radius:10px;border:1.5px solid #cbd5e1;font-size:15px;font-weight:700;padding:0 8px;background:#fff;color:#0f172a}
#shBot .res{display:flex;gap:8px;align-items:center;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:8px 10px;margin-bottom:6px;font-size:14px}
#shBot .res .v{font-size:20px;font-weight:900;color:#0f172a}
#shBot .res small{color:#475569;font-size:12.5px;line-height:1.4}
#shBot .res button{margin-left:auto;flex:none;height:36px;width:40px;border-radius:10px;border:1.5px solid #e2e8f0;background:#fff;font-size:16px}
#shList{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
#shList div{position:relative;border-radius:10px;overflow:hidden;background:#e2e8f0;aspect-ratio:1}
#shList img{width:100%;height:100%;object-fit:cover;display:block}
#shList span{position:absolute;left:0;right:0;bottom:0;background:#0f172acc;color:#fff;font-size:11px;padding:2px 4px}
#shList button{position:absolute;top:4px;right:4px;width:30px;height:30px;border-radius:8px;border:0;background:#fff;font-size:14px}`;document.head.appendChild(s)}
function build(){if(document.getElementById("shOv"))return;css();const o=document.createElement("div");o.id="shOv";
 o.innerHTML=`<div id="shTop"><button id="shX">✕</button><b>📷 写真で測る</b><span class="seg" id="shMode"></span></div><canvas id="shCv"></canvas><div id="shBot"></div>
 <input type="file" id="shIn" accept="image/*" style="display:none">`;document.body.appendChild(o);
 cv=o.querySelector("#shCv");ctx=cv.getContext("2d");
 o.querySelector("#shX").onclick=()=>{save(true);o.classList.remove("on")};
 o.querySelector("#shIn").onchange=e=>{const f=e.target.files&&e.target.files[0];e.target.value="";if(f)loadFile(f)};
 o.querySelector("#shMode").onclick=e=>{const b=e.target.closest("button");if(!b||!R)return;R.mode=b.dataset.m;if(R.ref){const p=PRE[R.mode][0];if(!R.ref.cu)Object.assign(R.ref,{n:p[0],W:p[1],H:p[2]})}save();ui();draw()};
 cv.addEventListener("pointerdown",pDown);cv.addEventListener("pointermove",pMove);cv.addEventListener("pointerup",pUp);cv.addEventListener("pointercancel",pUp);
 window.addEventListener("resize",()=>{if(o.classList.contains("on")){fit();draw()}})}
function open(){build();document.getElementById("shOv").classList.add("on");if(!R||!IMG)home();else{ui();fit();draw()}}
window.openShashin=open;
/* 写真の一覧（はじめの画面） */
async function home(){R=null;IMG=null;tool=null;pend=[];ui();draw();const L=(await dbAll()).sort((a,b)=>b.t-a.t),bx=document.getElementById("shHome");if(!bx)return;
 bx.innerHTML=L.length?`<div style="font-size:13px;color:#475569;margin:4px 0 6px">保存した写真（${L.length}枚）：押すと続きから測れます</div><div id="shList">${L.map(p=>`<div data-id="${p.id}"><img src="${p.th}" alt=""><span>${p.mode==="wall"?"壁":"天井"}・${new Date(p.t).toLocaleDateString("ja-JP")}・${(p.ms||[]).length}か所</span><button data-del="${p.id}">🗑</button></div>`).join("")}</div>`:"";
 bx.onclick=async e=>{const del=e.target.closest("[data-del]");if(del){e.stopPropagation();if(!confirm("この写真を消しますか？"))return;await db("readwrite",s=>s.delete(+del.dataset.del)).catch(()=>{});home();return}
  const d=e.target.closest("[data-id]");if(!d)return;const p=L.find(x=>x.id===+d.dataset.id);if(p)openRec(p)}}
function openRec(p){R=p;const u=URL.createObjectURL(p.img),im=new Image();im.onload=()=>{IMG=im;tool=R.ref?null:"ref";if(!R.ref)newRef();pend=[];ui();fit();draw()};im.src=u}
function loadFile(f){tst("写真を読み込み中…");const u=URL.createObjectURL(f),im=new Image();
 im.onload=()=>{const k=Math.min(1,MAXPX/Math.max(im.naturalWidth,im.naturalHeight)),w=Math.round(im.naturalWidth*k),h=Math.round(im.naturalHeight*k),c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(im,0,0,w,h);URL.revokeObjectURL(u);
  const tk=200/Math.max(w,h),tc=document.createElement("canvas");tc.width=Math.round(w*tk);tc.height=Math.round(h*tk);tc.getContext("2d").drawImage(c,0,0,tc.width,tc.height);
  c.toBlob(b=>{if(!b){tst("写真を読み込めませんでした");return}openRec({id:Date.now(),t:Date.now(),mode:"ceil",img:b,w,h,th:tc.toDataURL("image/jpeg",.7),ref:null,ms:[]});save(true)},"image/jpeg",.85)};
 im.onerror=()=>{URL.revokeObjectURL(u);tst("写真を読み込めませんでした")};im.src=u}
/* 下の欄 */
function ui(){const bot=document.getElementById("shBot"),md=document.getElementById("shMode");if(!bot)return;
 md.innerHTML=R?[["ceil","天井"],["wall","壁"]].map(([m,l])=>`<button data-m="${m}" class="${R.mode===m?"on":""}">${l}</button>`).join(""):"";
 if(!R){bot.innerHTML=`<button class="big" id="shPick">📷 写真を撮る・選ぶ</button>
 <div class="note">💡 <b>天井</b>：壁と壁の間・照明の端から端まで など。天カセのパネルや点検口が写るように、下から少し斜めに撮ってください。<br>💡 <b>壁</b>：床から天井まで。壁にA4の紙を貼って、床と天井の両方が入るように正面寄りから撮ってください。</div><div id="shHome"></div>`;
  bot.querySelector("#shPick").onclick=()=>document.getElementById("shIn").click();return}
 const I=refInfo(),pr=PRE[R.mode],wall=R.mode==="wall";
 let h=`<div class="row"><button class="tb${tool==="ref"?" on":""}" data-t="ref">🟨 基準の四角</button><button class="tb${tool==="p2"?" on":""}" data-t="p2">📏 2点</button><button class="tb${tool==="ll"?" on":""}" data-t="ll">${wall?"↕ 床〜天井":"↔ 線と線"}</button></div>`;
 if(tool==="ref"||!R.ref){const cur=R.ref?R.ref.n:"";h+=`<div class="note">🟨 黄色の四角の<b>4つの角</b>を、写真の基準の四角（${wall?"壁に貼った紙など":"パネル・点検口など"}）の角に指で合わせてください。指を当てると拡大鏡が出ます。</div>
  <div class="row"><select id="shPre" style="flex:1 1 100%">${pr.map(p=>`<option${p[0]===cur?" selected":""}>${p[0]}</option>`).join("")}<option value="cu"${R.ref&&R.ref.cu?" selected":""}>自分で測った寸法を入れる</option></select></div>
  ${R.ref&&R.ref.cu?`<div class="row" style="align-items:center;font-size:14px;font-weight:700">横<input id="shCW" inputmode="numeric" value="${R.ref.W}" style="width:90px">×縦<input id="shCH" inputmode="numeric" value="${R.ref.H}" style="width:90px">mm</div>`:""}
  ${R.ref&&R.ref.W!==R.ref.H?`<div class="row"><button class="tb" id="shSw">↻ 縦と横を入れかえる</button></div>`:""}
  ${R.ref&&!I?`<div class="note warn">⚠️ 四角の角が交差しています。4つの角を、四角の形になるように動かしてください。</div>`:""}`}
 else if(!I)h+=`<div class="note warn">⚠️ 基準の四角がおかしいです。「🟨 基準の四角」で角を直してください。</div>`;
 if(tool==="p2")h+=`<div class="note">📏 測りたい<b>端と端</b>を順にタップ（照明の端〜端など）。あとから点を動かせます。真ん中の位置も出します。</div>`;
 if(tool==="ll")h+=`<div class="note">${wall?"↕ <b>床と壁の境目</b>に2点、<b>天井と壁の境目</b>に2点をタップ。線と線の間が天井高です。":"↔ <b>片方の壁と天井の境目</b>に2点、<b>反対の壁</b>に2点をタップ。間の寸法と真ん中の線を出します。"}</div>`;
 if(tool&&pend.length)h+=`<div class="row"><button class="tb" id="shUn">↩ 置いた点を1つ戻す</button></div>`;
 (R.ms||[]).forEach((m,i)=>{const c=calc(m,I);if(!c)return;const no=CIRC[i]||i+1;
  if(m.k==="p2")h+=`<div class="res"><div><div>${no} 📏 2点</div><div class="v">${fm(c.L)} mm</div><small>真ん中まで ${fm(c.L/2)} mm${c.far?"<br>⚠️ 基準から遠いので誤差が大きめ":""}</small></div><button data-del="${i}">🗑</button></div>`;
  else h+=`<div class="res"><div><div>${no} ${wall?"↕ 床〜天井":"↔ 線と線"}</div><div class="v">${fm(c.L)} mm</div><small>${wall?"":"真ん中まで "+fm(c.L/2)+" mm"}${!wall&&c.off>=5?`<br>基準の四角の中心は、真ん中から 線${c.offA?"A":"B"}側へ ${fm(c.off)} mm`:(!wall?"<br>基準の四角の中心は、ほぼ真ん中です":"")}${c.ang>3?`<br>⚠️ 2本の線が ${c.ang.toFixed(0)}° 平行からずれています。線を合わせ直してください`:""}${c.far?"<br>⚠️ 基準から遠いので誤差が大きめ":""}</small></div><button data-del="${i}">🗑</button></div>`});
 if(R.ref&&I)h+=`<div class="note" style="background:#f1f5f9;color:#334155">誤差の目安：基準の四角の近くで ±1〜3cm。基準から離れるほど、また斜めに撮るほど大きくなります。${wall?"天井高は、基準の紙が壁と平行に貼れていることが大事です。":"梁の成や天井高など、高さ方向は天井の写真では測れません。"}</div>`;
 h+=`<div class="row"><button class="tb" id="shExp">📤 寸法入りの画像</button><button class="tb" id="shNew">📷 別の写真</button></div>`;
 bot.innerHTML=h;
 bot.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{const t=b.dataset.t;pend=[];tool=tool===t?null:t;if(t==="ref"&&!R.ref)newRef();if((t==="p2"||t==="ll")&&!refInfo()){tool="ref";if(!R.ref)newRef();tst("先に基準の四角を合わせてください")}ui();draw()});
 const ps=bot.querySelector("#shPre");if(ps)ps.onchange=()=>{if(!R.ref)newRef();if(ps.value==="cu"){R.ref.cu=1;R.ref.n="自分で入力"}else{const p=pr.find(x=>x[0]===ps.value);Object.assign(R.ref,{n:p[0],W:p[1],H:p[2],cu:0,sw:0})}save();ui();draw()};
 [["#shCW","W"],["#shCH","H"]].forEach(([s,k])=>{const el=bot.querySelector(s);if(el)el.oninput=()=>{const v=parseInt(String(el.value).replace(/[^0-9]/g,""))||0;if(v>0){R.ref[k]=v;save();draw();clearTimeout(window._shT);window._shT=setTimeout(()=>{const a=document.activeElement;ui();const n=bot.querySelector(s);if(n&&a&&a.id===n.id){n.focus();n.setSelectionRange(99,99)}},800)}}});
 const sw=bot.querySelector("#shSw");if(sw)sw.onclick=()=>{R.ref.sw=R.ref.sw?0:1;save();ui();draw()};
 const un=bot.querySelector("#shUn");if(un)un.onclick=()=>{pend.pop();ui();draw()};
 bot.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{R.ms.splice(+b.dataset.del,1);save();ui();draw()});
 bot.querySelector("#shExp").onclick=exportImg;
 bot.querySelector("#shNew").onclick=()=>{save(true);home()}}
function newRef(){const s=Math.min(R.w,R.h)*0.15,cx=R.w/2,cy=R.h/2,p=PRE[R.mode][0];R.ref={pts:[[cx-s,cy-s],[cx+s,cy-s],[cx+s,cy+s],[cx-s,cy+s]],n:p[0],W:p[1],H:p[2],cu:0,sw:0};save()}
/* ---------- 表示（拡大・移動） ---------- */
function fit(){if(!cv)return;const r=cv.getBoundingClientRect(),dp=window.devicePixelRatio||1;cv.width=Math.max(1,Math.round(r.width*dp));cv.height=Math.max(1,Math.round(r.height*dp));
 if(!R)return;const s=Math.min(r.width/R.w,r.height/R.h);view={s,ox:(r.width-R.w*s)/2,oy:(r.height-R.h*s)/2}}
const toS=([x,y],V=view)=>[x*V.s+V.ox,y*V.s+V.oy],toI=([x,y])=>[(x-view.ox)/view.s,(y-view.oy)/view.s];
function lbl(c,t,x,y,u,bg){c.font=`800 ${14*u}px -apple-system,system-ui,sans-serif`;const w=c.measureText(t).width+12*u,h=22*u;c.fillStyle=bg||"#0f172ae6";
 c.beginPath();c.roundRect?c.roundRect(x-w/2,y-h/2,w,h,6*u):c.rect(x-w/2,y-h/2,w,h);c.fill();c.fillStyle="#fff";c.textAlign="center";c.textBaseline="middle";c.fillText(t,x,y+1*u)}
function dot2(c,p,col,u,r){c.beginPath();c.arc(p[0],p[1],(r||7)*u,0,7);c.fillStyle=col;c.fill();c.lineWidth=2*u;c.strokeStyle="#fff";c.stroke()}
function scene(c,V,u){const I=refInfo(),S=p=>toS(p,V);
 if(R.ref){const P=R.ref.pts.map(S);c.beginPath();P.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle="#facc1533";c.fill();c.lineWidth=2.5*u;c.strokeStyle=I?"#facc15":"#ef4444";c.stroke();
  if(I){const ct=S(ap(I.Hi,[I.W/2,I.Hh/2]));c.beginPath();c.arc(ct[0],ct[1],4*u,0,7);c.fillStyle="#facc15";c.fill();lbl(c,`基準 ${fm(I.W)}×${fm(I.Hh)}`,ct[0],ct[1]-16*u,u,"#a16207e6")}
  if(tool==="ref")P.forEach(p=>dot2(c,p,"#facc15",u,9))}
 (R.ms||[]).forEach((m,i)=>{const r=calc(m,I),no=CIRC[i]||i+1,P=m.pts.map(S);
  if(m.k==="p2"){c.lineWidth=3*u;c.strokeStyle="#22d3ee";c.beginPath();c.moveTo(...P[0]);c.lineTo(...P[1]);c.stroke();P.forEach(p=>dot2(c,p,"#22d3ee",u));
   if(r&&I){const mp=S(ap(I.Hi,r.mid));c.save();c.translate(...mp);c.rotate(Math.PI/4);c.fillStyle="#22c55e";c.fillRect(-5*u,-5*u,10*u,10*u);c.restore();const lp=[(P[0][0]+P[1][0])/2,(P[0][1]+P[1][1])/2];lbl(c,`${no} ${fm(r.L)}`,lp[0],lp[1]-18*u,u,"#0e7490e6")}}
  else{c.lineWidth=3*u;c.strokeStyle="#fb923c";[[0,1],[2,3]].forEach(([a,b],k)=>{c.beginPath();c.moveTo(...P[a]);c.lineTo(...P[b]);c.stroke();lbl(c,k?"B":"A",P[a][0],P[a][1]-16*u,u,"#c2410ce6")});P.forEach(p=>dot2(c,p,"#fb923c",u));
   if(r&&I){const a=S(ap(I.Hi,r.m1)),b=S(ap(I.Hi,r.m2));if(R.mode!=="wall"){c.setLineDash([10*u,7*u]);c.lineWidth=3*u;c.strokeStyle="#22c55e";c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();c.setLineDash([])}
    const lp=[(a[0]+b[0])/2,(a[1]+b[1])/2];lbl(c,`${no} ${fm(r.L)}${R.mode==="wall"?"":"（真ん中 "+fm(r.L/2)+"）"}`,lp[0],lp[1],u,"#15803de6")}}});
 if(pend.length){const P=pend.map(S);c.lineWidth=3*u;c.strokeStyle=tool==="ll"?"#fb923c":"#22d3ee";if(P.length>=2){c.beginPath();c.moveTo(...P[0]);c.lineTo(...P[1]);c.stroke()}P.forEach(p=>dot2(c,p,"#f472b6",u))}}
function draw(){if(!ctx)return;const dp=window.devicePixelRatio||1,rc=cv.getBoundingClientRect(),bw=Math.max(1,Math.round(rc.width*dp)),bh=Math.max(1,Math.round(rc.height*dp));if(cv.width!==bw||cv.height!==bh){cv.width=bw;cv.height=bh}const W=bw/dp,H=bh/dp;ctx.setTransform(dp,0,0,dp,0,0);ctx.fillStyle="#0b1220";ctx.fillRect(0,0,W,H);
 if(!R||!IMG){ctx.fillStyle="#94a3b8";ctx.font="700 15px -apple-system,system-ui,sans-serif";ctx.textAlign="center";ctx.fillText("下の「📷 写真を撮る・選ぶ」から始めます",W/2,H/2);return}
 ctx.drawImage(IMG,view.ox,view.oy,R.w*view.s,R.h*view.s);scene(ctx,view,1);
 /* 拡大鏡：指で点を動かしている間、指の反対側の上に3倍で出す */
 if(mag){const p=toS(mag),r=62,cx=p[0]<W/2?W-r-10:r+10,cy=r+10,k=3;ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.clip();ctx.fillStyle="#000";ctx.fillRect(cx-r,cy-r,2*r,2*r);
  const V={s:view.s*k,ox:cx-mag[0]*view.s*k,oy:cy-mag[1]*view.s*k};ctx.drawImage(IMG,V.ox,V.oy,R.w*V.s,R.h*V.s);ctx.strokeStyle="#f43f5e";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(cx-r,cy);ctx.lineTo(cx+r,cy);ctx.moveTo(cx,cy-r);ctx.lineTo(cx,cy+r);ctx.stroke();ctx.restore();
  ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.lineWidth=3;ctx.strokeStyle="#fff";ctx.stroke()}}
/* ---------- 指の操作：点を動かす／1本指で移動／2本指で拡大 ---------- */
function handles(){const H=[];if(R.ref&&tool==="ref")R.ref.pts.forEach((p,i)=>H.push(p));(R.ms||[]).forEach(m=>m.pts.forEach(p=>H.push(p)));pend.forEach(p=>H.push(p));return H}
function xy(e){const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]}
function pDown(e){if(!R||!IMG)return;cv.setPointerCapture(e.pointerId);const p=xy(e);PT.set(e.pointerId,p);
 if(PT.size===2){const[a,b]=[...PT.values()];drag={k:"pinch",d0:Math.hypot(a[0]-b[0],a[1]-b[1]),c0:[(a[0]+b[0])/2,(a[1]+b[1])/2],v0:Object.assign({},view)};mag=null;draw();return}
 let best=null,bd=26;handles().forEach(h=>{const s=toS(h),d=Math.hypot(s[0]-p[0],s[1]-p[1]);if(d<bd){bd=d;best=h}});
 if(best){drag={k:"pt",h:best,off:[toS(best)[0]-p[0],toS(best)[1]-p[1]]};mag=best;draw()}else drag={k:"pan",p0:p,v0:Object.assign({},view),mv:false}}
function pMove(e){if(!PT.has(e.pointerId)||!drag)return;const p=xy(e);PT.set(e.pointerId,p);
 if(drag.k==="pinch"&&PT.size>=2){const[a,b]=[...PT.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]),c=[(a[0]+b[0])/2,(a[1]+b[1])/2],v=drag.v0,s=Math.max(0.05,Math.min(40,v.s*d/drag.d0)),ix=(drag.c0[0]-v.ox)/v.s,iy=(drag.c0[1]-v.oy)/v.s;view={s,ox:c[0]-ix*s,oy:c[1]-iy*s};draw()}
 else if(drag.k==="pt"){const q=toI([p[0]+drag.off[0],p[1]+drag.off[1]]);drag.h[0]=Math.max(0,Math.min(R.w,q[0]));drag.h[1]=Math.max(0,Math.min(R.h,q[1]));mag=drag.h;draw()}
 else if(drag.k==="pan"){const dx=p[0]-drag.p0[0],dy=p[1]-drag.p0[1];if(Math.hypot(dx,dy)>8)drag.mv=true;if(drag.mv){view={s:drag.v0.s,ox:drag.v0.ox+dx,oy:drag.v0.oy+dy};draw()}}}
function pUp(e){if(!PT.has(e.pointerId))return;PT.delete(e.pointerId);const d=drag;
 if(d&&d.k==="pinch"){if(PT.size===0)drag=null;else{const p=[...PT.values()][0];drag={k:"pan",p0:p,v0:Object.assign({},view),mv:true}}return}
 drag=null;mag=null;if(!d){draw();return}
 if(d.k==="pt"){save();ui();draw();return}
 if(d.k==="pan"&&!d.mv&&(tool==="p2"||tool==="ll")){const q=toI(d.p0);if(q[0]<0||q[1]<0||q[0]>R.w||q[1]>R.h)return;pend.push(q);const need=tool==="p2"?2:4;
  if(pend.length>=need){R.ms=R.ms||[];R.ms.push({k:tool,pts:pend});pend=[];save();tst(tool==="p2"?"📏 測りました。点は指で動かせます":"↔ 測りました。点は指で動かせます")}ui()}
 draw()}
/* ---------- 寸法入りの画像を書き出す ---------- */
function exportImg(){if(!R||!IMG)return;const c=document.createElement("canvas");c.width=R.w;c.height=R.h;const x=c.getContext("2d");x.drawImage(IMG,0,0,R.w,R.h);const u=Math.max(R.w,R.h)/900;scene(x,{s:1,ox:0,oy:0},u);
 const I=refInfo();let y=12*u;x.textAlign="left";(R.ms||[]).forEach((m,i)=>{const r=calc(m,I);if(!r)return;const t=`${CIRC[i]||i+1} ${m.k==="p2"?"2点":R.mode==="wall"?"床〜天井":"線と線"} ${fm(r.L)}mm`;x.font=`800 ${16*u}px -apple-system,system-ui,sans-serif`;const w=x.measureText(t).width+14*u;x.fillStyle="#0f172ae0";x.fillRect(10*u,y,w,26*u);x.fillStyle="#fff";x.textBaseline="middle";x.fillText(t,17*u,y+13*u);y+=30*u});
 c.toBlob(async b=>{if(!b)return;const f=new File([b],"写真寸法_"+new Date().toISOString().slice(0,10)+".jpg",{type:"image/jpeg"});
  try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:"寸法入りの写真"});return}}catch(e){if(e&&e.name==="AbortError")return}
  const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=f.name;document.body.appendChild(a);a.click();a.remove()},"image/jpeg",.9)}
})();
