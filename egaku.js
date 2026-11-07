/* ✏️ 描いて曲げ（曲げ共有だけ・2026-11-03 ユーザー：上下右の言葉では決めにくい・イメージしにくい。ふだん紙に描く曲げの絵をなぞりたい）
   立体の方眼（アイソメ）に指でなぞる → 線は「たて（上下）」「横（右奥・左手前）」「奥（左奥・右手前）」の6つの向きに吸い付く → 線ごとに長さ → 今の曲げの行 {l,a,t,o} に（向き t は zumen.js の polyToRows と同じ決め方）。
   🎙 まとめて入れる（キーボードのマイク）：「450の250の600のクランク」→ 形と長さ。形の言葉が無い時は、描いた線に順番に長さを入れる。よく使う形は名前を付けて登録（pbm_egaku）
   データ：EG.segs=[{d:向きの番号,n:方眼のます数,l:長さmm}]。向き 0:+x 1:-x 2:+y（上） 3:-y 4:+z 5:-z（3D：x＝右奥、z＝左奥、y＝上） */
(function(){
if(typeof APP==="undefined"||APP!=="bend")return;
const D3=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],OPP=[1,0,3,2,5,4],DN=["右手前へ","左奥へ","上へ","下へ","左手前へ","右奥へ"];
const EG={segs:[],cell:34,O:null,cur:null,undo:[]};
let ov=null,cv=null,cx=null,dpr=1;
const C30=Math.cos(Math.PI/6),S30=Math.sin(Math.PI/6);
/* 📷 写真に沿って（2026-11-04 ユーザー）：PH.ax＝写真の柱・横の線から決めた6つの向きの画面の向き（無い時は方眼） */
let PH=null;
const sv=k=>{if(PH&&PH.ax)return PH.ax[k];const d=D3[k];return[(d[0]-d[2])*C30,(d[0]+d[2])*S30-d[1]]};   // 向きの画面の上の向き（1ますの長さ1）
const scr=p=>{const a=sv(0),b=sv(2),c=sv(4);return[EG.O[0]+(p[0]*a[0]+p[1]*b[0]+p[2]*c[0])*EG.cell,EG.O[1]+(p[0]*a[1]+p[1]*b[1]+p[2]*c[1])*EG.cell]};
const add3=(a,d,n)=>[a[0]+d[0]*n,a[1]+d[1]*n,a[2]+d[2]*n];
/* 45°・30°の線（s.k）：前の線の向きへ 進み＝差÷tan も進む（差＝s.n ます・s.l mm）。2026-11-03 ユーザー：描いて曲げで45° */
const stp=(p,segs,i,v)=>{const s=segs[i],q=add3(p,D3[s.d],v);return s.k&&i>0?add3(q,D3[segs[i-1].d],v/Math.tan(s.k*Math.PI/180)):q};
const ends=()=>{let p=[0,0,0];const P=[p];EG.segs.forEach((s,i)=>{p=stp(p,EG.segs,i,s.n);P.push(p)});return P};
/* 画面 */
function build(){
 ov=document.createElement("div");ov.className="ov";ov.id="egOv";ov.style.alignItems="stretch";
 ov.innerHTML=`<div class="sheet" style="max-height:100vh;max-height:100dvh;height:100%;border-radius:0;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top,0px) + 8px) 10px calc(env(safe-area-inset-bottom,0px) + 8px)">
  <div class="shead" style="flex:none"><h3>✏️ 描いて曲げ</h3><button id="egClose">✕</button></div>
  <div class="note" id="egHint" style="flex:none;font-size:13px;margin:0 0 6px;height:3.1em;overflow:hidden;line-height:1.5">方眼の上を指でなぞってください。線は「たて・横・奥」に吸い付きます。紙に描く絵と同じでOK。</div>
  <div style="flex:1;min-height:180px;position:relative;border-radius:14px;overflow:hidden;background:#f8fafc;border:1.5px solid #cbd5e1"><canvas id="egCv" style="position:absolute;inset:0;width:100%;height:100%;touch-action:none"></canvas>
   <canvas id="egLp" style="position:absolute;left:8px;top:8px;width:120px;height:120px;border-radius:60px;display:none;box-shadow:0 2px 10px rgba(0,0,0,.35);pointer-events:none"></canvas><div id="egPad" style="position:absolute;left:8px;bottom:56px;width:150px;height:150px;display:none"></div>
   <div style="position:absolute;right:8px;bottom:8px;display:flex;gap:6px"><button class="sharebtn" id="egMot" style="height:40px;padding:0 9px;font-size:13px">📱</button><button class="sharebtn" id="egPho" style="height:40px;padding:0 9px;font-size:13px">📷</button><button class="sharebtn" id="egCmp" style="height:40px;padding:0 10px;font-size:13px">🧭 ボタン</button><button class="sharebtn" id="egRot" style="height:40px;padding:0 10px;font-size:13px">↻ 向き</button><button class="sharebtn" id="egUndo" style="height:40px;padding:0 10px;font-size:13px">↩ 戻す</button><button class="sharebtn" id="egClr" style="height:40px;padding:0 10px;font-size:13px">🗑 消す</button></div></div>
  <div style="flex:none;margin-top:8px">
   <div style="display:flex;gap:6px;align-items:center"><div style="flex:1;min-width:0;position:relative"><button type="button" id="egMic" aria-label="話して入れる" style="position:absolute;left:3px;top:3px;bottom:3px;width:44px;border:0;border-radius:10px;background:#dbeafe;font-size:22px;padding:0;z-index:1">🎙</button><input id="egSay" type="text" enterkeyhint="done" autocomplete="off" placeholder="まとめて：450の250の600のクランク" style="width:100%;padding-left:52px!important;box-sizing:border-box;height:46px;border-radius:12px;border:1.5px solid #cbd5e1;padding:0 10px;font-size:16px"></div><button class="sharebtn" id="egSayGo" style="height:46px;padding:0 12px;margin:0">入れる</button><button class="sharebtn" id="egPen" style="height:46px;padding:0 12px;margin:0">✍️ 書く</button></div>
   <div style="font-size:12px;color:#64748b;margin:3px 2px 6px">キーボードのマイク🎙を押して話すと入ります（イヤホンのマイクでもOK）。形の言葉：クランク・L・U・コの字・45のクランク・登録した名前</div>
   <div id="egList" style="display:flex;flex-wrap:wrap;gap:6px;max-height:32vh;overflow-y:auto;padding-bottom:4px"></div>
   <div style="display:flex;gap:8px;margin-top:6px"><button class="sharebtn" id="egReg" style="flex:1;height:46px;margin:0">🏷 形を登録</button><button class="primary" id="egGo" style="flex:1.6;height:46px;border-radius:12px;font-weight:800">✅ この形で曲げを作る</button></div>
  </div></div>`;
 document.body.appendChild(ov);cv=ov.querySelector("#egCv");cx=cv.getContext("2d");
 ov.querySelector("#egClose").onclick=close;
 ov.querySelector("#egUndo").onclick=()=>{if(EG.segs.length){EG.undo.push(JSON.stringify(EG.segs));EG.segs.pop();if(!EG.segs.length)EG.O=null;list();draw()}};
 ov.querySelector("#egClr").onclick=()=>{if(EG.segs.length)EG.undo.push(JSON.stringify(EG.segs));EG.segs=[];EG.O=null;EG.lock=null;list();draw()};
 ov.querySelector("#egRot").onclick=rot;ov.querySelector("#egPho").onclick=phMenu;ov.querySelector("#egMot").onclick=motOpen;
 /* 🧭 ボタンで描く（なぞるのが苦手な人）：6つの向きの矢印。同じ向きを押すとのびる・ちがう向きで曲がる */
 const pad=ov.querySelector("#egPad");pad.innerHTML=[2,5,0,3,4,1].map(k=>{const v=sv(k),a=Math.atan2(v[1],v[0])*180/Math.PI;return`<button data-k="${k}" style="position:absolute;left:${55+v[0]*52}px;top:${55+v[1]*52}px;width:40px;height:40px;border-radius:20px;border:0;background:#0f766e;color:#fff;font-size:18px;font-weight:900;box-shadow:0 2px 6px rgba(0,0,0,.3)"><span style="display:inline-block;transform:rotate(${a}deg)">➜</span></button>`}).join("")+`<div style="position:absolute;left:52px;top:63px;width:46px;text-align:center;font-size:10px;font-weight:800;color:#0f766e">押すと<br>のびる</div>`;
 pad.querySelectorAll("button").forEach(b=>b.onclick=()=>{const k=+b.dataset.k,L=EG.segs[EG.segs.length-1];if(L&&OPP[L.d]===k){toast("今の線と反対の向きにはもどれません（↩ 1つ戻すで短くできます）");return}EG.undo.push(JSON.stringify(EG.segs));
  if(!EG.segs.length){const W=cv.clientWidth,H=cv.clientHeight;EG.O=[W*0.35,H*0.6]}if(L&&L.d===k&&!L.l)L.n++;else EG.segs.push({d:k,n:2,l:0});list();draw()});
 ov.querySelector("#egCmp").onclick=()=>{const on2=pad.style.display==="none";pad.style.display=on2?"block":"none";ov.querySelector("#egCmp").style.background=on2?"#ccfbf1":""};
 ov.querySelector("#egGo").onclick=apply;
 ov.querySelector("#egReg").onclick=reg;
 ov.querySelector("#egPen").onclick=()=>{if(!EG.segs.length){toast("先に形を描くか、「クランク」などを入れてください");return}const i=EG.segs.findIndex(s=>!(s.l>0));penOpen(i>=0?i:EG.last||0)};
 const say=ov.querySelector("#egSay");ov.querySelector("#egSayGo").onclick=()=>{if(KM)KM.last=say.value;sayGo(say.value)};
 ov.querySelector("#egMic").onclick=()=>mic(say);
 say.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();if(KM)KM.last=say.value;sayGo(say.value);say.blur()}});
 /* キーボードのマイクで話している間：言葉が止まって1.5秒で入れる・欄から出た時も入れる */
 say.addEventListener("input",()=>{if(!KM)return;clearTimeout(KM.t);KM.t=setTimeout(()=>{if(KM&&say.value.trim()&&say.value!==KM.last){KM.last=say.value;sayGo(say.value)}},1500)});
 say.addEventListener("focus",()=>{const b=document.getElementById("egKm");if(KM&&b&&b.style.display!=="none"&&/タップして/.test(b.textContent))kbMic(say,0)});
 say.addEventListener("blur",()=>{if(!KM)return;clearTimeout(KM.t);const v=say.value;if(v.trim()&&v!==KM.last)sayGo(v);kmOff()});
 /* 指でなぞる */
 const pos=e=>{const r=cv.getBoundingClientRect(),t=e.touches?e.touches[0]||e.changedTouches[0]:e;return[t.clientX-r.left,t.clientY-r.top]};
 let on=false,gz=null;
 const two=e=>{const r=cv.getBoundingClientRect(),a=e.touches[0],b=e.touches[1];return{c:[(a.clientX+b.clientX)/2-r.left,(a.clientY+b.clientY)/2-r.top],d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)||1}};
 const down=e=>{e.preventDefault();if(PH&&PH.step&&!(e.touches&&e.touches.length>=2)){const p=pos(e);PH.ln=[p,p];draw();return}   // 写真の向き合わせ：線をなぞる
 if(e.touches&&e.touches.length>=2){if(PH&&PH.img)return;EG.pend=null;if(on&&EG.cur){on=false;EG.cur=null;if(!EG.segs.length)EG.O=null}const t=two(e);gz={...t,cell:EG.cell,O:(EG.O||[cv.clientWidth/2,cv.clientHeight/2]).slice()};lp(null);draw();return} // 2本指：広げる・動かす
  const p=pos(e);EG.tip=p;
  if(EG.segs.length&&!EG.cur){const k=hitSeg(p);if(k>=0&&!near(p)){const ip=ov.querySelector(`#egList input[data-i="${k}"]`);if(ip){ip.focus();return}}}
  if(!EG.segs.length){EG.O=p;EG.cur={V:[0,0,0],D:-1,n:0};on=true;draw();return}
  const P=ends(),E=scr(P[P.length-1]);
  if(!near(p)){EG.pend={p,O:(EG.O||[0,0]).slice(),mv:0};return} // 線の先から離れた所：1本指でずらす（動かさずに離したら案内）
  EG.undo.push(JSON.stringify(EG.segs));EG.cur={V:P[P.length-1],D:-1,n:0};on=true;draw()};
 const move=e=>{if(PH&&PH.step&&PH.ln){e.preventDefault();PH.ln[1]=pos(e);draw();return}
 if(gz&&e.touches&&e.touches.length>=2){e.preventDefault();const t=two(e),k=Math.max(10,Math.min(140,gz.cell*t.d/gz.d))/gz.cell;EG.cell=gz.cell*k;EG.O=[t.c[0]+(gz.O[0]-gz.c[0])*k,t.c[1]+(gz.O[1]-gz.c[1])*k];EG.zoomed=1;draw();return}
  if(EG.pend){e.preventDefault();const p=pos(e),q=EG.pend;if(Math.hypot(p[0]-q.p[0],p[1]-q.p[1])>8)q.mv=1;if(q.mv&&EG.O&&!(PH&&PH.img)){EG.O=[q.O[0]+p[0]-q.p[0],q.O[1]+p[1]-q.p[1]];EG.zoomed=1;draw()}return}
  if(!on)return;e.preventDefault();const p=pos(e);EG.tip=p;const c=EG.cur,V=scr(c.V),r=[p[0]-V[0],p[1]-V[1]],best=(rel,ex)=>{let bk=-1,ba=0;for(let k=0;k<6;k++){if(ex&&ex.includes(k))continue;const s=sv(k),a=(rel[0]*s[0]+rel[1]*s[1])/EG.cell;if(a>ba){ba=a;bk=k}}return[bk,ba]};
  if(c.D<0){const [k,a]=best(r,EG.segs.length?[OPP[EG.segs[EG.segs.length-1].d],EG.segs[EG.segs.length-1].d]:null);if(k>=0&&a>=0.5){c.D=k;c.n=Math.max(1,Math.round(a))}draw();return}
  const s=sv(c.D),al=(r[0]*s[0]+r[1]*s[1])/EG.cell,pp=Math.hypot(r[0]-s[0]*al*EG.cell,r[1]-s[1]*al*EG.cell)/EG.cell;if(pp<0.5)c.n=Math.max(1,Math.round(al)); // 指が線からそれている間（曲がり角）は、今の線の長さを変えない
  const E=scr(add3(c.V,D3[c.D],c.n)),re=[p[0]-E[0],p[1]-E[1]],[k,a]=best(re,[c.D,OPP[c.D]]);
  if(k>=0&&a>=0.8&&EG.segs.length<20){EG.segs.push({d:c.D,n:c.n,l:0});c.V=add3(c.V,D3[c.D],c.n);c.D=k;c.n=Math.max(1,Math.round(a));list()}   // 曲がり角
  draw()};
 const up=e=>{if(PH&&PH.step&&PH.ln){phLine();return}
 if(gz){if(!e.touches||e.touches.length<2)gz=null;return}lp(null);if(EG.pend){const q=EG.pend;EG.pend=null;if(!q.mv)toast("線の先（オレンジの丸）から続けて描いてください。図をずらす時は1本指で、広げる時は2本指で");return}if(!on)return;on=false;const c=EG.cur;if(c&&c.D>=0&&EG.segs.length<20)EG.segs.push({d:c.D,n:c.n,l:0});EG.cur=null;list();draw()};
 const near=p=>{const P=ends(),E=scr(P[P.length-1]);return Math.hypot(p[0]-E[0],p[1]-E[1])<=60};
 cv.addEventListener("touchstart",down,{passive:false});cv.addEventListener("touchmove",move,{passive:false});cv.addEventListener("touchend",up);cv.addEventListener("touchcancel",up);
 cv.addEventListener("mousedown",down);cv.addEventListener("mousemove",e=>{if(on||(PH&&PH.ln))move(e)});window.addEventListener("mouseup",up);
 window.addEventListener("resize",()=>{if(ov.classList.contains("on"))draw()});
}
function open(){if(!ov)build();ov.classList.add("on");const fr=fromRows();
 if(fr&&fr.length){if(EG.segs.length&&JSON.stringify(EG.segs.map(q=>[q.d,q.l]))!==JSON.stringify(fr.map(q=>[q.d,q.l])))EG.undo.push(JSON.stringify(EG.segs));EG.segs=fr;EG.O=null}   // 今の曲げ（図面から来た物・手で入れた物）を絵にして出す
 else{if(fr===null)setTimeout(()=>toast("今の曲げは絵にできない形です（描き直すと置きかえます）"),300);try{const s=JSON.parse(localStorage.getItem("pbm_egaku_cur")||"null");if(s&&Array.isArray(s.segs)&&!EG.segs.length){EG.segs=s.segs;EG.O=null}}catch(e){}}
 list();setTimeout(draw,30)}
/* 今の曲げの行 → 方眼の線（90°・180°・まっすぐと、45°・30°の斜め（前の線から上がる線＝s.k・長さは差）。toRows の逆：最初は右手前・上は上）。絵にできない時は null */
function fromRows(){const R=LR(),rows=R.filter((r,i)=>i<R.length-1||r.l>0);if(rows.length<2)return[]; /* まっすぐ1本だけ（新しく始めた時）は絵にしない */if(rows.some((r,i)=>i<rows.length-1&&r.a&&![30,45,90,180].includes(r.a)))return null;
 const cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],sn=v=>v.map(z=>Math.abs(z-Math.round(z))<1e-6?Math.round(z):z),rotA=(v,k,t)=>{const c=Math.cos(t),s2=Math.sin(t),kv=cr(k,v),kd=dot(k,v);return v.map((_,j)=>v[j]*c+kv[j]*s2+k[j]*kd*(1-c))};
 const ax=v=>D3.findIndex(z=>Math.abs(z[0]-v[0])<1e-6&&Math.abs(z[1]-v[1])<1e-6&&Math.abs(z[2]-v[2])<1e-6);
 let d=[1,0,0],u=[0,1,0],r=cr(d,u);const out=[],mx=Math.max(...rows.map(q=>q.l))||1,nn=l=>Math.max(1,Math.min(8,Math.round(l/mx*6)));
 for(let i=0;i<rows.length;i++){const q=rows[i];let k=ax(d);
  if(k>=0)out.push({d:k,n:nn(q.l),l:Math.round(q.l)||0});
  else{const pv=out[out.length-1];if(!pv||pv.k)return null;const pd=D3[pv.d],c=dot(d,pd),pe=d.map((z,j)=>z-pd[j]*c),pl=Math.hypot(...pe),pk=pl>1e-6?ax(pe.map(z=>z/pl)):-1,th=Math.round(Math.acos(Math.max(-1,Math.min(1,c)))*180/Math.PI);
   if(pk<0||(th!==45&&th!==30))return null;const H=Math.round(q.l*Math.sin(th*Math.PI/180));out.push({d:pk,k:th,n:Math.max(1,Math.round(nn(q.l)*Math.sin(th*Math.PI/180))),l:H})}
  if(i<rows.length-1&&q.a){const t=(typeof effT==="function"?effT(i,rows):q.t)*Math.PI/180,b=u.map((z,j)=>z*Math.cos(t)+r[j]*Math.sin(t)),a=q.a*Math.PI/180,d2=d.map((z,j)=>z*Math.cos(a)+b[j]*Math.sin(a));const ax2=cr(d,d2),al=Math.hypot(...ax2);
   if(al>1e-6){const k2=ax2.map(z=>z/al);u=rotA(u,k2,a);r=rotA(r,k2,a)}else{u=u.map(z=>-z);r=r.map(z=>-z)}d=sn(d2);u=sn(u);r=sn(r)}}
 return out}
function close(){kmOff();if(MO.on)motClose();if(ov)ov.classList.remove("on");try{localStorage.setItem("pbm_egaku_cur",JSON.stringify({segs:EG.segs}))}catch(e){}}
/* 絵 */
function draw(){if(!cv)return;dpr=window.devicePixelRatio||1;const W=cv.clientWidth,H=cv.clientHeight;if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}
 const x=cx;x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
 if(PH&&PH.img){const k=Math.min(W/PH.img.width,H/PH.img.height),w=PH.img.width*k,h=PH.img.height*k,ix=(W-w)/2,iy=(H-h)/2;
  if(PH.r&&(PH.r[0]!==ix||PH.r[1]!==iy||PH.r[2]!==k)){const f=k/PH.r[2];if(EG.O)EG.O=[ix+(EG.O[0]-PH.r[0])*f,iy+(EG.O[1]-PH.r[1])*f];EG.cell*=f}PH.r=[ix,iy,k];   /* 画面の大きさが変わって写真が動いたら、描いた線も一緒に動かす */x.globalAlpha=PH.step?1:.9;x.drawImage(PH.img,(W-w)/2,(H-h)/2,w,h);x.globalAlpha=1;
  if(PH.step){(PH.L||[]).concat(PH.ln?[PH.ln]:[]).forEach((l,i)=>{x.strokeStyle=["#22c55e","#ef4444","#3b82f6"][i]||"#fbbf24";x.lineWidth=5;x.lineCap="round";x.beginPath();x.moveTo(l[0][0],l[0][1]);x.lineTo(l[1][0],l[1][1]);x.stroke()});
   const h2=ov.querySelector("#egHint");h2.innerHTML=["","① <b style='color:#16a34a'>たての線</b>（柱・壁の角）をなぞってください","② <b style='color:#dc2626'>横の線</b>（天井と壁のさかい・梁）をなぞってください","③ もう1つの<b style='color:#2563eb'>奥へ行く横の線</b>をなぞってください"][PH.step];return}}
 if(EG.segs.length&&!EG.O&&PH&&PH.ax){EG.O=[W/2,H/2]}
 if(EG.segs.length&&!EG.O){EG.zoomed=0;/* 描いた形を真ん中に */const P=ends();EG.O=[0,0];const sp=P.map(scr),mx=Math.min(...sp.map(q=>q[0])),Mx=Math.max(...sp.map(q=>q[0])),my=Math.min(...sp.map(q=>q[1])),My=Math.max(...sp.map(q=>q[1]));
  const tp=MO.on&&MO.el?MO.el.offsetHeight+12:0,k=Math.min(1,(W-80)/Math.max(1,Mx-mx),(H-110-tp)/Math.max(1,My-my));EG.cell=Math.max(14,Math.round(34*k));const sp2=P.map(scr),m2=Math.min(...sp2.map(q=>q[0])),M2=Math.max(...sp2.map(q=>q[0])),n2=Math.min(...sp2.map(q=>q[1])),N2=Math.max(...sp2.map(q=>q[1]));EG.O=[W/2-(m2+M2)/2,(H-50+tp)/2-(n2+N2)/2]}
 if(!EG.segs.length&&!EG.cur&&!EG.zoomed)EG.cell=34;
 /* 立体の方眼（3つの向きの点線） */
 const c=EG.cell,o=EG.O||[W/2,H/2];x.lineWidth=1;
 x.strokeStyle=PH&&PH.ax?"rgba(0,0,0,0)":"#e2e8f0";x.beginPath();
 for(let i=-80;i<=80;i++){ // たて線（上下）
  const px=o[0]+i*c*C30;if(px<-5||px>W+5)continue;x.moveTo(px,0);x.lineTo(px,H)}
 for(const sg of[1,-1])for(let i=-160;i<=160;i++){ // 斜めの線（右奥・左奥）：傾き ±30°
  const b=o[1]+i*c-sg*o[0]*Math.tan(Math.PI/6);x.moveTo(0,b);x.lineTo(W,b+sg*W*Math.tan(Math.PI/6))}
 x.stroke();
 /* 向きの目印 */
 x.font="bold 12px -apple-system,sans-serif";x.fillStyle="#64748b";const g=[40,64];x.lineWidth=2;
 [[2,"上"],[5,"右奥"],[1,"左奥"]].forEach(([k,t])=>{const s=sv(k);x.strokeStyle="#94a3b8";x.beginPath();x.moveTo(g[0],g[1]);x.lineTo(g[0]+s[0]*26,g[1]+s[1]*26);x.stroke();x.fillText(t,g[0]+s[0]*30-8,g[1]+s[1]*30+4)});
 /* 描いた線 */
 const segs=EG.segs.slice();if(EG.cur&&EG.cur.D>=0)segs.push({d:EG.cur.D,n:EG.cur.n,l:0,live:1});
 let p=[0,0,0];x.lineCap="round";x.lineJoin="round";
 segs.forEach((s,i)=>{const a=scr(p),q=stp(p,segs,i,s.n),b=scr(q),hl=i===EG.hl&&!s.live;if(hl){x.strokeStyle="rgba(37,99,235,.28)";x.lineWidth=24;x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.stroke()} // 今、長さを入れている線を光らせる
  x.strokeStyle=s.live?"#f59e0b":hl?"#2563eb":s.k?"#dc2626":"#c2703a";x.lineWidth=hl?10:7;x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.stroke();
  const m=[(a[0]+b[0])/2,(a[1]+b[1])/2],t=(hl?"👉 ":"")+(i+1)+(s.k?"（"+s.k+"°）":"")+(s.l?"："+(s.k?"差"+s.l:s.l):hl?"：ここ":"");x.font="bold "+(hl?18:14)+"px -apple-system,sans-serif";const w=x.measureText(t).width+12;x.fillStyle=hl?"#2563eb":s.l?"#0f766e":"#334155";x.beginPath();const bh=hl?26:20;x.roundRect?x.roundRect(m[0]-w/2,m[1]-bh-2,w,bh,8):x.rect(m[0]-w/2,m[1]-bh-2,w,bh);x.fill();x.fillStyle="#fff";x.fillText(t,m[0]-w/2+6,m[1]-(hl?9:7));p=q});
 if(EG.O&&segs.length){const s0=scr([0,0,0]);x.fillStyle="#16a34a";x.beginPath();x.arc(s0[0],s0[1],8,0,7);x.fill();const P=ends(),e=scr(P[P.length-1]);if(!EG.cur){x.strokeStyle="#f97316";x.lineWidth=3;x.beginPath();x.arc(e[0],e[1],14,0,7);x.stroke()}}
 if(EG.cur&&EG.tip)lp(EG.tip);
 const h=ov.querySelector("#egHint");h.textContent=!EG.segs.length?"方眼の上を指でなぞってください。線は「たて・横・奥」に吸い付きます。紙に描く絵と同じでOK。":"線 "+EG.segs.length+"本・曲げ "+Math.max(0,EG.segs.length-1)+"か所。オレンジの丸から続けて描けます。下で長さを入れてください。"}
/* 線ごとの長さの欄 */
function list(){if(!ov)return;const L=ov.querySelector("#egList");L.innerHTML=EG.segs.map((s,i)=>`<label style="flex:none;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:12px;font-weight:800;color:#334155">${i+1}・${DN[s.d]}<input data-i="${i}" inputmode="numeric" pattern="[0-9]*" value="${s.l||""}" placeholder="${s.k?"差":"mm"}" style="width:78px;height:42px;border-radius:10px;border:1.5px solid ${s.k?"#eab308":s.l?"#0f766e":"#cbd5e1"};text-align:center;font-size:17px;font-weight:800">${i>0?`<button type="button" data-k="${i}" style="width:86px;height:30px;white-space:nowrap;border-radius:9px;border:1.5px solid ${s.k?"#dc2626":"#cbd5e1"};background:${s.k?"#fee2e2":"#fff"};color:${s.k?"#dc2626":"#475569"};font-size:12px;font-weight:800;padding:0">${s.k?s.k+"° 斜め"+(s.l?Math.round(s.l/Math.sin(s.k*Math.PI/180)):""):"90° ▸45°"}</button>`:""}</label>`).join("")||'<div style="font-size:13px;color:#94a3b8">描くと、ここに線ごとの長さの欄が出ます</div>';
 L.querySelectorAll("button[data-k]").forEach(b=>b.onclick=e=>{e.preventDefault();kTog(+b.dataset.k)});
 L.querySelectorAll("input").forEach(e=>{e.onfocus=()=>{e.select();EG.last=EG.hl=+e.dataset.i;e.style.boxShadow="0 0 0 3px #2563eb";draw();setTimeout(()=>show(EG.hl),350)};e.onblur=()=>{e.style.boxShadow="";setTimeout(()=>{if(!ov.querySelector("#egList input:focus")){EG.hl=-1;draw()}},80)};e.oninput=()=>{const s=EG.segs[+e.dataset.i];if(s){s.l=Math.max(0,Math.round(uParse(e.value)||0));e.style.borderColor=s.k?"#eab308":s.l?"#0f766e":"#cbd5e1";const kb=L.querySelector(`button[data-k="${e.dataset.i}"]`);if(kb&&s.k)kb.textContent=s.k+"° 斜め"+(s.l?Math.round(s.l/Math.sin(s.k*Math.PI/180)):"");draw()}};e.onkeydown=ev=>{if(ev.key==="Enter"){ev.preventDefault();const n=L.querySelector(`input[data-i="${+e.dataset.i+1}"]`);if(n)n.focus();else e.blur()}}})}
/* 線の角度を 90° → 45° → 30° → 90° と変える（その線＝斜めの線。長さの欄は「差（高さ）」、行には斜めの長さが入る） */
function kTog(i){const s=EG.segs[i],p=EG.segs[i-1],n=EG.segs[i+1];if(!s||!p)return;
 if(!s.k){if(p.k){toast("斜めの線のすぐ後は、斜めにできません");return}if(n&&n.d===OPP[p.d]){toast("この形は斜めにできません（前とうしろの線が反対向き）");return}}
 EG.undo.push(JSON.stringify(EG.segs));s.k=!s.k?45:s.k===45?30:0;if(!s.k)delete s.k;list();draw();
 if(s.k)toast(s.k+"°の斜めにしました。長さの欄には「差（ずらす高さ）」を入れてください");const e=ov.querySelector(`#egList input[data-i="${i}"]`);if(e)e.focus()}
/* 光らせた線を、キーボードに隠れない見えている所の真ん中へ寄せる */
function show(i){if(!cv||i<0||i>=EG.segs.length||!EG.O)return;const P=ends(),a=scr(P[i]),b=scr(P[i+1]),m=[(a[0]+b[0])/2,(a[1]+b[1])/2],r=cv.getBoundingClientRect(),vv=window.visualViewport,vt=vv?vv.offsetTop:0,vb=vv?vv.offsetTop+vv.height:window.innerHeight;
 const y0=Math.max(0,vt-r.top),y1=Math.min(r.height,vb-r.top);if(y1-y0<60)return;const ty=(y0+y1)/2,tx=r.width/2;if(m[1]>y0+30&&m[1]<y1-30&&m[0]>30&&m[0]<r.width-30)return;EG.O=[EG.O[0]+(tx-m[0]),EG.O[1]+(ty-m[1])];EG.zoomed=1;draw()}
/* 図の線をタップ：その線の番号 */
function hitSeg(p){const P=ends();let bk=-1,bd=22;for(let i=0;i<P.length-1;i++){const a=scr(P[i]),b=scr(P[i+1]),dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L2)),d=Math.hypot(a[0]+dx*t-p[0],a[1]+dy*t-p[1]);if(d<bd){bd=d;bk=i}}return bk}
/* 🔍 拡大の丸：なぞっている指の下を2倍で左上（指が左上の時は右上）に映す */
function lp(t){const c=ov&&ov.querySelector("#egLp");if(!c)return;if(!t){c.style.display="none";return}const W=cv.clientWidth,S=120,left=t[0]<S+30&&t[1]<S+30;c.style.left=left?"":"8px";c.style.right=left?"8px":"";c.style.display="block";
 const d=dpr;if(c.width!==S*d){c.width=S*d;c.height=S*d}const x=c.getContext("2d");x.setTransform(1,0,0,1,0,0);x.save();x.beginPath();x.arc(S*d/2,S*d/2,S*d/2,0,7);x.clip();x.fillStyle="#f8fafc";x.fillRect(0,0,S*d,S*d);
 x.drawImage(cv,(t[0]-S/4)*d,(t[1]-S/4)*d,S/2*d,S/2*d,0,0,S*d,S*d);x.strokeStyle="#ef4444";x.lineWidth=2*d;x.beginPath();x.moveTo(S*d/2-10*d,S*d/2);x.lineTo(S*d/2+10*d,S*d/2);x.moveTo(S*d/2,S*d/2-10*d);x.lineTo(S*d/2,S*d/2+10*d);x.stroke();x.restore();
 x.strokeStyle="#334155";x.lineWidth=3*d;x.beginPath();x.arc(S*d/2,S*d/2,S*d/2-1.5*d,0,7);x.stroke()}
/* ↻ 向きを変える：2本目から先を、1本目の線を軸に90°まわす（クランクの出る向きを上→横→下→…） */
function rot(){if(EG.segs.length<2){toast("2本以上描くと、曲げの向きを回せます");return}const ax=D3[EG.segs[0].d],cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
 EG.undo.push(JSON.stringify(EG.segs));for(const s of EG.segs.slice(1)){const v=D3[s.d],c=cr(ax,v),w=[c[0]+ax[0]*dot(ax,v),c[1]+ax[1]*dot(ax,v),c[2]+ax[2]*dot(ax,v)];s.d=D3.findIndex(q=>q[0]===Math.round(w[0])&&q[1]===Math.round(w[1])&&q[2]===Math.round(w[2]))}EG.O=null;draw();list()}
/* 📱 スマホを配管に沿って動かして曲げの向きを決める（2026-11-07 ユーザー：傾けるのではなく、スマホを自分に向けてまっすぐ持ち、配管のルートに沿って動かしたい）
   devicemotion の重さを除いた加速（acceleration・スマホの向きの x＝右・y＝上・z＝自分の方）を、動き始め（1.2m/s² 超え）から止まるまで足して速さにし、
   いちばん速かった時の向き＝動かした向き（いちばん大きい軸）。iPhone（`IOS`）では加速の向きが逆に出るので符号を逆にする（ほかのスマホはそのまま）（2026-11-07 ユーザー：全部逆）。止まった後 0.4秒は次の動きにしない（止める時のゆれ）。寸法は取れないのであとで欄に。
   向き：右＝−z（右奥）・左＝+z・上＝+y・下＝−y・向こう（スマホの後ろへ押す）＝−x（左奥）・手前＝+x（絵は配管のうしろから見る形・行の右＝d×u と合う） */
const MO={on:false,el:null,h:null,st:0,v:[0,0,0],pk:[0,0,0],t0:0,tq:0,cool:0,last:0,g:null,pause:false};
const MDN={5:"➡️ 右へ",4:"⬅️ 左へ",2:"⤴️ 上へ",3:"⤵️ 下へ",1:"⬆️ 向こうへ（奥）",0:"⬇️ 手前へ"};
/* 向きを逆に読むか：初めは iPhone だけ逆（iPhone は加速の向きが逆に出る）。「🔄 向きが逆に出る時」で入れかえてこの端末で覚える（pbm_motrev・2026-11-07 ユーザー：ほかのスマホでは逆かも） */
function motRev(){try{const v=localStorage.getItem("pbm_motrev");if(v==="1"||v==="0")return v==="1"}catch(e){}return IOS}
function motAxis(v){const a=v.map(Math.abs),i=a.indexOf(Math.max(...a));return i===0?(v[0]>0?5:4):i===1?(v[1]>0?2:3):(v[2]<0?1:0)}
async function motOpen(){
 try{if(typeof DeviceMotionEvent!=="undefined"&&typeof DeviceMotionEvent.requestPermission==="function"){const p=await DeviceMotionEvent.requestPermission();if(p!=="granted"){toast("動きのセンサーが許可されませんでした");return}}}catch(e){toast("動きのセンサーが使えませんでした");return}
 if(MO.on){motClose();return}
 if(EG.segs.length){if(!confirm("今の絵を消して、スマホを動かして描き直しますか？"))return;EG.undo.push(JSON.stringify(EG.segs));EG.segs=[];EG.O=null;list();draw()}
 Object.assign(MO,{on:true,st:0,cool:0,last:0,g:null,pause:false,got:0});
 const el=document.createElement("div");el.id="egMo";el.style.cssText="position:absolute;left:8px;right:8px;top:8px;z-index:5;background:#0f172add;color:#fff;border-radius:14px;padding:10px;font-weight:800";
 el.innerHTML=`<div id="egMoT" style="font-size:13px;line-height:1.4"></div><div style="display:flex;align-items:center;gap:6px;margin:4px 0 6px"><div id="egMoD" style="flex:1;font-size:20px;text-align:center">-</div><button id="egMoR" style="flex:none;border:1px solid #94a3b8;border-radius:10px;background:transparent;color:#e2e8f0;font-size:12px;font-weight:800;padding:5px 8px;line-height:1.2">🔄 逆に<br>出る時</button></div>
  <div style="display:flex;gap:6px"><button id="egMoX" style="flex:1;min-height:44px;border:0;border-radius:12px;background:#16a34a;color:#fff;font-weight:800;font-size:15px">✅ おわり</button><button id="egMoU" style="flex:1;min-height:44px;border:0;border-radius:12px;background:#475569;color:#fff;font-weight:800;font-size:15px">↩ 1本戻す</button><button id="egMoP" style="flex:1;min-height:44px;border:0;border-radius:12px;background:#64748b;color:#fff;font-weight:800;font-size:15px">⏸ 止める</button></div>`;
 cv.parentElement.appendChild(el);MO.el=el;
 {const lw=ov.querySelector("#egList").parentElement;lw.style.display="none";EG.O=null;setTimeout(draw,30)}   // 動かす間は下の欄をしまって絵を大きく（おわりで出す）
 el.querySelector("#egMoX").onclick=motClose;
 el.querySelector("#egMoR").onclick=()=>{const r=!motRev();try{localStorage.setItem("pbm_motrev",r?"1":"0")}catch(e){}   // 逆にする（この端末で覚える）・今まで入れた線も逆に
  if(EG.segs.length){EG.undo.push(JSON.stringify(EG.segs));EG.segs.forEach(q=>q.d=OPP[q.d]);EG.O=null;list();draw()}motUi("🔄 向きを逆にしました");toast("向きを逆にしました（この端末で覚えます）。今まで入れた線も逆にしました")};
 el.querySelector("#egMoU").onclick=()=>{if(EG.segs.length){EG.undo.push(JSON.stringify(EG.segs));EG.segs.pop();EG.O=null;list();draw()}MO.cool=performance.now()+600;motUi("")};
 el.querySelector("#egMoP").onclick=()=>{MO.pause=!MO.pause;MO.st=0;el.querySelector("#egMoP").textContent=MO.pause?"▶ 続ける":"⏸ 止める";motUi("")};
 MO.h=motEv;addEventListener("devicemotion",MO.h);
 motUi("");toast("右・左・上・下・向こう（前へ押す）・手前。寸法はあとで下の欄に・45°は「90° ▸45°」");setTimeout(()=>{if(MO.on&&!MO.got)toast("動きのセンサーが動いていません（パソコンでは使えません）")},2500)}
function motUi(msg){if(!MO.el)return;const t=MO.el.querySelector("#egMoT"),d=MO.el.querySelector("#egMoD");
 t.innerHTML=MO.pause?"⏸ 止めています（動かしても入りません）":`📱 スマホを<b>自分に向けて</b>持ち、<b>配管の通りに動かす</b>（1本ごとに止める）・線 ${EG.segs.length}本`;
 if(msg!=null)d.textContent=msg||"…"}
function motEv(e){MO.got=1;if(MO.pause)return;const now=performance.now(),dt=MO.tq?Math.min(0.1,(now-MO.tq)/1000):0.016;MO.tq=now;
 let a=e.acceleration&&e.acceleration.x!=null?[e.acceleration.x,e.acceleration.y,e.acceleration.z]:null;
 if(!a){const g=e.accelerationIncludingGravity;if(!g||g.x==null)return;const G=[g.x,g.y,g.z];MO.g=MO.g?MO.g.map((z,j)=>z*0.9+G[j]*0.1):G;a=G.map((z,j)=>z-MO.g[j])}   // 重さを除いた加速が無い時は、ゆっくり変わる分を重さとして引く
 const m=Math.hypot(...a);
 if(MO.st===0){if(now<MO.cool||m<1.2)return;MO.st=1;MO.v=[0,0,0];MO.pk=[0,0,0];MO.t0=now;MO.still=0}
 MO.v=MO.v.map((z,j)=>z+a[j]*dt);if(Math.hypot(...MO.v)>Math.hypot(...MO.pk))MO.pk=MO.v.slice();
 if(m<0.4)MO.still+=dt;else MO.still=0;
 if(MO.still>0.2||now-MO.t0>2500){MO.st=0;MO.cool=now+400;const dur=(now-MO.t0)/1000;if(Math.hypot(...MO.pk)<0.12||dur<0.15)return;motAdd(motAxis(motRev()?MO.pk.map(z=>-z):MO.pk))}}
function motAdd(k){const L=EG.segs[EG.segs.length-1];
 if(L&&k===OPP[L.d]){motUi("↩ 戻す動き（入れない）");return}
 EG.undo.push(JSON.stringify(EG.segs));if(L&&L.d===k)L.n++;else EG.segs.push({d:k,n:3,l:0});EG.O=null;list();draw();motUi(MDN[k]+(L&&L.d===k?"（のばす）":""));try{navigator.vibrate&&navigator.vibrate(40)}catch(e){}}
function motClose(){MO.on=false;if(MO.h)removeEventListener("devicemotion",MO.h);MO.h=null;if(MO.el)MO.el.remove();MO.el=null;try{ov.querySelector("#egList").parentElement.style.display="";EG.O=null;setTimeout(draw,30)}catch(e){}
 if(EG.segs.length>1)toast("向きが決まりました。下の欄に寸法を入れてください（✍️ 書く・🎙 でも）。45°にする線は「90° ▸45°」")}
/* 📷 写真：選ぶ → たての線・横の線・奥へ行く横の線をなぞる → その3つの向きに吸い付いて描ける（長さは自分で入れる。写真1枚では奥行きが分からない） */
function phMenu(){if(!PH||!PH.img){phPick();return}
 sheetMsg(`<b style="font-size:17px">📷 写真に沿って描く</b><div style="margin-top:4px">写真の上をなぞると、写真の向きに吸い付きます。長さは下の欄に入れます。</div>`,[["📷 写真を変える",phPick,"#2563eb","#fff"],["📐 向きを合わせ直す（線を3本なぞる）",()=>{PH.step=1;PH.L=[];PH.ax=null;draw()}],["🗑 写真をやめる（方眼にもどす）",()=>{PH=null;EG.O=null;draw()}],["とじる",null]])}
function phPick(){const f=document.createElement("input");f.type="file";f.accept="image/*";f.onchange=()=>{const fl=f.files&&f.files[0];if(!fl)return;const im=new Image();im.onload=()=>{PH={img:im,step:1,L:[],ax:null,ln:null};EG.zoomed=1;draw();toast("写真の上の、たての線をなぞってください（柱・壁の角など）")};im.onerror=()=>toast("写真を読めませんでした");im.src=URL.createObjectURL(fl)};f.click()}
function phLine(){const l=PH.ln;PH.ln=null;const dx=l[1][0]-l[0][0],dy=l[1][1]-l[0][1],L=Math.hypot(dx,dy);if(L<30){toast("もう少し長くなぞってください");draw();return}
 PH.L.push(l);PH.step++;
 if(PH.step>3){const u=(l2,f)=>{let a=(l2[1][0]-l2[0][0]),b=(l2[1][1]-l2[0][1]);const n=Math.hypot(a,b);a/=n;b/=n;if(f(a,b))return[-a,-b];return[a,b]};
  const up=u(PH.L[0],(a,b)=>b>0),h1=u(PH.L[1],(a,b)=>a<0),h2=u(PH.L[2],(a,b)=>a>0);   // 上＝画面の上向き・＋x＝右へ行く方・＋z＝左へ行く方
  const cr=Math.abs(h1[0]*h2[1]-h1[1]*h2[0]);if(cr<0.15){toast("横の線が2本とも同じ向きです。奥へ行く線をなぞり直してください");PH.L.pop();PH.step=3;draw();return}
  PH.ax=[h1,[-h1[0],-h1[1]],up,[-up[0],-up[1]],h2,[-h2[0],-h2[1]]];PH.step=0;EG.cell=12;if(EG.segs.length)EG.O=null;
  toast("向きを合わせました。写真の配管の上をなぞってください（長さは下の欄に）")}
 draw()}
/* 3Dの点の並び → 曲げの行（zumen.js の polyToRows と同じ：最初の向き＝d、上＝u、右＝d×u。最初がたての時は2本目の向きを上） */
function toRows(P,a45){const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],len=a=>Math.hypot(a[0],a[1],a[2]),nz=a=>{const l=len(a)||1;return[a[0]/l,a[1]/l,a[2]/l]},dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cr=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const rotA=(v,k,t)=>{const c=Math.cos(t),s=Math.sin(t),kv=cr(k,v),kd=dot(k,v);return[v[0]*c+kv[0]*s+k[0]*kd*(1-c),v[1]*c+kv[1]*s+k[1]*kd*(1-c),v[2]*c+kv[2]*s+k[2]*kd*(1-c)]};
 let d=nz(sub(P[1],P[0])),u=Math.abs(d[1])<0.9?[0,1,0]:(P.length>2?nz(sub(P[2],P[1])):[1,0,0]);u=nz(sub(u,d.map(z=>z*dot(u,d))));let r=cr(d,u);const rows=[];
 for(let i=0;i<P.length-1;i++){const seg=sub(P[i+1],P[i]),l=Math.round(len(seg));let a=0,t=0;
  if(i<P.length-2){const d1=nz(seg),d2=nz(sub(P[i+2],P[i+1])),c=Math.max(-1,Math.min(1,dot(d1,d2)));a=Math.round(Math.acos(c)*180/Math.PI);
   if(a>0){const b=nz(sub(d2,d1.map(z=>z*c)));t=normT(Math.round(Math.atan2(dot(b,r),dot(b,u))*180/Math.PI));const ax=nz(cr(d1,d2)),ang=Math.acos(c);u=rotA(u,ax,ang);r=rotA(r,ax,ang)}}
  rows.push({l,a:ANG.includes(a)?a:(a>60?90:45),t,o:false})}
 return rows}
/* ✅ この形で曲げを作る */
function apply(){if(!EG.segs.length){toast("先に形を描いてください（または上の欄に話す）");return}
 const bad=EG.segs.findIndex((s,i)=>s.k&&EG.segs[i+1]&&EG.segs[i-1]&&EG.segs[i+1].d===OPP[EG.segs[i-1].d]);if(bad>=0){toast((bad+1)+"本目の斜めの後が反対向きなので作れません（90°にもどすか描き直してください）");return}
 const miss=EG.segs.findIndex(s=>!(s.l>0));if(miss>=0){toast((miss+1)+"本目の長さを入れてください");const e=ov.querySelector(`#egList input[data-i="${miss}"]`);if(e)e.focus();return}
 let p=[0,0,0];const P=[p];EG.segs.forEach((s,i)=>{p=stp(p,EG.segs,i,s.l);P.push(p)});
 const nw=EG.segs.length===1?[{l:EG.segs[0].l,a:0,t:0,o:false}]:toRows(P);
 const rows=LR();rows.splice(0,rows.length,...nw);sel=0;save();close();render();if(T){T.dirty=true;try{build3D()}catch(e){}fitT(true)}
 toast("✅ 描いた形で曲げを作りました（"+nw.length+"本・曲げ "+(nw.length-1)+"か所）。違う時は ↩️ で戻せます")}
/* 🎙 を押すと話して入れる（2026-11-03 ユーザー：押してもできない）。ブラウザの音声認識（ja-JP）が使える時はそれで聞いて、終わったら sayGo。
   使えない時は欄にカーソルを入れて、キーボードのマイクの場所を案内する */
let REC=null;
/* iPhone・iPad（とくにホーム画面のアプリ）は音声認識が始まっても何も返さない（2026-11-04 ユーザー：話しても反応しない）→ キーボードのマイクで話してもらう */
const IOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
let KM=null;
function kbMic(say,tap){KM={last:say.value||"",t:0};if(!tap)say.focus();
 let bn=document.getElementById("egKm");if(!bn){bn=document.createElement("div");bn.id="egKm";bn.style.cssText="position:fixed;left:8px;right:8px;z-index:80;background:#1d4ed8;color:#fff;border-radius:14px;padding:10px 12px;font-size:16px;font-weight:800;line-height:1.45;box-shadow:0 4px 14px rgba(0,0,0,.35);pointer-events:none";document.body.appendChild(bn)}
 bn.innerHTML=tap?"👆 上の欄をタップして、キーボードの右下の 🎙 を押して話してください":"🎙 キーボードの<b>右下のマイク</b>を押して話してください<br><small style=\"font-weight:700\">話し終わると自動で入ります（「入れる」でもOK）</small><span style=\"position:absolute;right:18px;bottom:-14px;font-size:22px\">⬇️</span>";
 const pl=()=>{const vv=window.visualViewport,h=bn.offsetHeight||60;bn.style.top=Math.max(4,(vv?vv.offsetTop+vv.height:innerHeight)-h-14)+"px"};pl();setTimeout(pl,350);setTimeout(pl,800);
 if(window.visualViewport&&!kbMic.on){kbMic.on=1;visualViewport.addEventListener("resize",()=>{const b=document.getElementById("egKm");if(b&&b.style.display!=="none"){const vv=visualViewport;b.style.top=Math.max(4,vv.offsetTop+vv.height-(b.offsetHeight||60)-14)+"px"}})}
 bn.style.display="block"}
function kmOff(){KM=null;const b=document.getElementById("egKm");if(b)b.style.display="none"}
function mic(say){const SR=window.SpeechRecognition||window.webkitSpeechRecognition,b=ov.querySelector("#egMic");
 if(REC){try{REC.stop()}catch(e){}return}
 if(!SR||IOS){kbMic(say);return}
 let r;try{r=new SR()}catch(e){say.focus();toast("キーボードの右下のマイク🎙を押して話してください");return}
 REC=r;r.lang="ja-JP";r.interimResults=true;r.continuous=false;let fin="",got=0;const wd=setTimeout(()=>{if(REC===r&&!got){r.onend=null;try{r.abort()}catch(e){}REC=null;b.style.background="#dbeafe";b.textContent="🎙";say.placeholder="まとめて：450の250の600のクランク";kbMic(say,1)}},6000);
 b.style.background="#ef4444";b.textContent="⏹";say.value="";say.placeholder="🎙 聞いています… 話してください";
 r.onresult=e=>{got=1;let t="";fin="";for(const x of e.results){t+=x[0].transcript;if(x.isFinal)fin+=x[0].transcript}say.value=t};
 r.onerror=e=>{toast(e.error==="not-allowed"||e.error==="service-not-allowed"?"マイクが使えません（設定でマイクを許可するか、キーボードのマイク🎙で話してください）":e.error==="no-speech"?"声が聞こえませんでした。もう一度🎙を押してください":"うまく聞き取れませんでした。もう一度🎙を押してください")};
 r.onend=()=>{clearTimeout(wd);REC=null;b.style.background="#dbeafe";b.textContent="🎙";say.placeholder="まとめて：450の250の600のクランク";const v=(say.value||"").trim();if(v)sayGo(v)};
 try{r.start()}catch(e){REC=null;b.style.background="#dbeafe";b.textContent="🎙";say.focus();toast("キーボードの右下のマイク🎙を押して話してください")}}
/* 話した言葉の数字：「2500引く500」「350たす200」「300かける2」は計算して1つの数に（2026-11-03 ユーザー） */
function sayNums(txt){let t=String(txt).normalize("NFKC").replace(/(\d),(?=\d{3})/g,"$1")
  .replace(/\s*(引く|ひく|引いて|ひいて|マイナス|−|ー(?=\s*\d))\s*/g,"-").replace(/\s*(足す|たす|足して|たして|プラス)\s*/g,"+").replace(/\s*(かける|掛ける|×)\s*/g,"*").replace(/\s*(割る|わる|÷)\s*/g,"/").replace(/(\d)\s*([-+*/])\s*(?=\d)/g,"$1$2");
 return(t.match(/\d+(?:\.\d+)?(?:[-+*/]\d+(?:\.\d+)?)*/g)||[]).map(ex=>{const tk=ex.match(/\d+(?:\.\d+)?|[-+*/]/g);const st=[+tk[0]];for(let i=1;i<tk.length;i+=2){const o=tk[i],v=+tk[i+1];if(o==="*")st.push(st.pop()*v);else if(o==="/")st.push(v?st.pop()/v:st.pop());else st.push(o==="-"?-v:v)}return Math.round(st.reduce((a,b)=>a+b,0)*10)/10})}
/* 🎙 まとめて入れる：数字を順番に。最後に形の言葉があれば、その形を作る */
const SHAPES={クランク:[0,2,0],エル:[0,2],L:[0,2],直角:[0,2],U:[0,2,1],ユー:[0,2,1],コの字:[0,2,1]};
function sayGo(txt){txt=String(txt||"").normalize("NFKC").trim();if(!txt){toast("例：450の250の600のクランク");return}
 const nums=sayNums(txt);let shape=null,s45=false;
 const my=regs();for(const nm of Object.keys(my).sort((a,b)=>b.length-a.length))if(txt.includes(nm)){shape=my[nm].map(d=>({d,n:2,l:0}));break}
 if(!shape)for(const k of Object.keys(SHAPES))if(txt.toUpperCase().includes(k)){shape=SHAPES[k].map(d=>({d,n:2,l:0}));break}
 if(shape&&/クランク/.test(txt)&&/(^|\D)45(\D|$)/.test(txt)){s45=true;const i=nums.indexOf(45);if(i>=0&&nums.length>shape.length)nums.splice(i,1)}   // 「45のクランク」
 if(s45){const L=nums.slice(0,3);if(L.length<3){toast("45のクランクは長さを3つ（例：45の400の300の500のクランク）");return}
  const rows=LR();rows.splice(0,rows.length,{l:Math.round(L[0]),a:45,t:0,o:false},{l:Math.round(L[1]),a:45,t:180,o:false},{l:Math.round(L[2]),a:0,t:0,o:false});sel=0;save();close();render();if(T){T.dirty=true;try{build3D()}catch(e){}fitT(true)}
  toast("✅ 45°のクランク "+L.join("・")+" で曲げを作りました（向きは曲げの欄で変えられます）");return}
 if(shape){EG.undo.push(JSON.stringify(EG.segs));EG.segs=shape;EG.O=null}
 if(!EG.segs.length){toast("形を描くか、最後に「クランク」などの形の言葉を言ってください");return}
 EG.segs.forEach((s,i)=>{if(i<nums.length)s.l=Math.round(nums[i])});list();draw();
 const n=EG.segs.filter(s=>s.l>0).length;toast(n===EG.segs.length?"長さが全部入りました。よければ「✅ この形で曲げを作る」":"長さを "+n+" / "+EG.segs.length+" 本入れました")}
/* 🏷 形を登録（名前で呼べる） */
function regs(){try{return JSON.parse(localStorage.getItem("pbm_egaku")||"{}")||{}}catch(e){return{}}}
function reg(){if(EG.segs.length<2){toast("2本以上描いてから登録してください");return}const r=regs(),nm=prompt("この形の名前（声で呼ぶ時の言葉。例：いつもの2段）",Object.keys(r).length?"":"いつもの形");if(!nm||!nm.trim())return;r[nm.trim()]=EG.segs.map(s=>s.d);try{localStorage.setItem("pbm_egaku",JSON.stringify(r))}catch(e){}toast("🏷 「"+nm.trim()+"」を登録しました。「"+nm.trim()+" 450の300の600」のように呼べます")}
/* ✍️ なぞり書きで数字：書いた線を数字ごとに分けて（横に並ぶかたまり）、1つずつ形の見本と比べる → 候補を3つ（タップで決める）・「＋追加」は1番目をすぐ入れて次の線へ */
const DG={0:[[[.5,0],[.15,.2],[.05,.5],[.15,.85],[.5,1],[.85,.85],[.95,.5],[.85,.15],[.5,0]]],1:[[[.5,0],[.5,1]]],"1b":[[[.25,.25],[.5,0],[.5,1]]],2:[[[.1,.25],[.35,.02],[.7,.05],[.85,.3],[.6,.6],[.08,1],[.95,1]]],3:[[[.12,.1],[.5,0],[.85,.2],[.45,.48],[.9,.72],[.5,1],[.1,.9]]],"3b":[[[.15,.05],[.85,.05],[.45,.45],[.9,.7],[.5,1],[.1,.9]]],
 4:[[[.65,0],[.05,.68],[.95,.68]],[[.68,.3],[.68,1]]],"4b":[[[.65,0],[.05,.68],[.95,.68]],[[.68,0],[.68,1]]],5:[[[.85,0],[.25,0],[.15,.45],[.6,.38],[.9,.65],[.6,1],[.1,.9]]],"5b":[[[.25,0],[.15,.45],[.6,.38],[.9,.65],[.6,1],[.1,.9]],[[.25,0],[.85,0]]],6:[[[.75,0],[.35,.25],[.12,.65],[.35,1],[.8,.88],[.82,.6],[.45,.5],[.15,.7]]],
 7:[[[.05,0],[.95,0],[.4,1]]],"7b":[[[.05,.15],[.05,0],[.95,0],[.45,1]]],8:[[[.5,.48],[.15,.25],[.5,0],[.85,.25],[.5,.48],[.1,.75],[.5,1],[.9,.75],[.5,.48]]],9:[[[.88,.3],[.5,.55],[.12,.3],[.5,0],[.88,.25],[.8,1]]],"9b":[[[.88,.25],[.5,0],[.12,.25],[.5,.5],[.88,.25],[.88,1]]]};
const RS=20;
function feat(strokes){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const s of strokes)for(const p of s){x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1])}
 const sz=Math.max(x1-x0,y1-y0)||1,F=new Float32Array(RS*RS),put=(x,y)=>{for(let dx=-2;dx<=2;dx++)for(let dy=-2;dy<=2;dy++){const X=Math.round(x)+dx,Y=Math.round(y)+dy;if(X<0||Y<0||X>=RS||Y>=RS)continue;F[Y*RS+X]=Math.max(F[Y*RS+X],Math.exp(-(dx*dx+dy*dy)/2.2))}};
 const ar0=(x1-x0)/((y1-y0)||1),sw=ar0>0.3?(x1-x0)||1:sz,sh=ar0>0.3?(y1-y0)||1:sz,m=(RS-1)*0.9,ox=(RS-1-m*(x1-x0)/sw)/2,oy=(RS-1-m*(y1-y0)/sh)/2,T=p=>[ox+(p[0]-x0)/sw*m,oy+(p[1]-y0)/sh*m]; // 1（細い）のほかは縦横をそろえて比べる（字の細長さで迷わない）
 for(const s of strokes){if(s.length===1){const q=T(s[0]);put(q[0],q[1]);continue}for(let i=1;i<s.length;i++){const a=T(s[i-1]),b=T(s[i]),n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*2));for(let k=0;k<=n;k++)put(a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n)}}
 let nn=0;for(const v of F)nn+=v*v;nn=Math.sqrt(nn)||1;for(let i=0;i<F.length;i++)F[i]/=nn;return{F,ar:(x1-x0)/((y1-y0)||1)}}
let TPL=null;const tpl=()=>TPL||(TPL=Object.keys(DG).map(k=>({d:+String(k)[0],f:feat(DG[k].map(s=>s.map(p=>k==="1"||k==="1b"?[p[0]*.25,p[1]]:[p[0]*.65,p[1]])))})));
function rec1(strokes){const f=feat(strokes),sc=new Map();for(const t of tpl()){let v=0;for(let i=0;i<f.F.length;i++)v+=f.F[i]*t.f.F[i];if(f.ar<0.28&&t.d===1)v+=0.25;if(f.ar<0.28&&t.d!==1)v-=0.15;if(!sc.has(t.d)||sc.get(t.d)<v)sc.set(t.d,v)}return[...sc].sort((a,b)=>b[1]-a[1])}
function recNum(strokes){if(!strokes.length)return[];const bx=strokes.map(s=>{const xs=s.map(p=>p[0]),ys=s.map(p=>p[1]);return{s,x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys)}}).sort((a,b)=>a.x0-b.x0);
 const H=Math.max(...bx.map(b=>b.y1-b.y0))||1,G=[];for(const b of bx){const g=G[G.length-1];if(g&&b.x0<g.x1-Math.min(g.x1-g.x0,b.x1-b.x0)*0.35+H*0.05){g.s.push(b.s);g.x1=Math.max(g.x1,b.x1)}else G.push({s:[b.s],x0:b.x0,x1:b.x1})}   // 横に重なる線は同じ数字
 const R=G.map(g=>rec1(g.s)),best=R.map(r=>r[0]),out=[{n:best.map(r=>r[0]).join(""),v:0}];
 R.forEach((r,i)=>r.slice(1,3).forEach(([d,v])=>{const a=best.map(q=>q[0]);a[i]=d;out.push({n:a.join(""),v:best[i][1]-v})}));
 const seen=new Set();return out.sort((a,b)=>a.v-b.v).filter(o=>!seen.has(o.n)&&seen.add(o.n)).slice(0,3).map(o=>o.n.replace(/^0+(?=\d)/,""))}
let pen=null;
function penOpen(i){EG.pi=i;if(!pen){pen=document.createElement("div");pen.style.cssText="position:fixed;left:0;right:0;bottom:0;z-index:70;background:#fff;border-radius:18px 18px 0 0;box-shadow:0 -6px 24px rgba(0,0,0,.25);padding:10px 10px calc(env(safe-area-inset-bottom,0px) + 10px)";
  pen.innerHTML=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><b id="pnT" style="flex:1;font-size:15px"></b><button class="sharebtn" id="pnX" style="height:38px;margin:0;padding:0 12px">✕</button></div>
   <canvas id="pnC" style="display:block;width:100%;height:170px;border-radius:12px;background:#f8fafc;border:1.5px solid #cbd5e1;touch-action:none"></canvas>
   <div id="pnK" style="display:flex;gap:6px;margin-top:8px;min-height:50px"></div>
   <div style="display:flex;gap:6px;margin-top:6px"><button class="sharebtn" id="pnClr" style="flex:1;height:46px;margin:0">⌫ 書き直す</button><button class="primary" id="pnAdd" style="flex:1.4;height:46px;border-radius:12px;font-weight:800">＋ 追加（次の線へ）</button></div>
   <div style="font-size:12px;color:#64748b;margin-top:4px">数字を大きく書いてください。候補をタップで決める・自分の字に自信がある時は「＋追加」で1番目の候補をどんどん入れる</div>`;
  ov.appendChild(pen);const c=pen.querySelector("#pnC"),x=c.getContext("2d");let S2=[],on=false;
  const fit=()=>{const d=window.devicePixelRatio||1;c.width=Math.round(c.clientWidth*d);c.height=Math.round(c.clientHeight*d);x.setTransform(d,0,0,d,0,0)};
  const drw=()=>{x.clearRect(0,0,c.width,c.height);x.lineWidth=6;x.lineCap="round";x.lineJoin="round";x.strokeStyle="#0f172a";for(const s of S2){x.beginPath();s.forEach((p,k)=>k?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));if(s.length===1)x.lineTo(s[0][0]+.1,s[0][1]);x.stroke()}};
  const cand=()=>{const K=pen.querySelector("#pnK"),L=recNum(S2);pen.cand=L;K.innerHTML=L.map((n,k)=>`<button class="sharebtn" data-n="${n}" style="flex:1;height:50px;margin:0;font-size:22px;font-weight:800;${k===0?"background:#ccfbf1;border-color:#0f766e":""}">${n}</button>`).join("")||'<div style="font-size:13px;color:#94a3b8;align-self:center">ここに候補が出ます</div>';
   K.querySelectorAll("[data-n]").forEach(b=>b.onclick=()=>put(b.dataset.n))};
  const put=n=>{const s=EG.segs[EG.pi];if(!s||!(+n>0))return;s.l=+n;S2=[];drw();cand();list();draw();const j=EG.segs.findIndex((q,k)=>k>EG.pi&&!(q.l>0));if(j>=0){EG.pi=j;ttl()}else if(EG.pi<EG.segs.length-1){EG.pi++;ttl()}else{pen.remove();pen=null;toast("長さが全部入りました。よければ「✅ この形で曲げを作る」")}};
  pen.put=put;pen.reset=()=>{S2=[];fit();drw();cand()};
  const P=e=>{const r=c.getBoundingClientRect(),t=e.touches?e.touches[0]:e;return[t.clientX-r.left,t.clientY-r.top]};
  const dn=e=>{e.preventDefault();on=true;S2.push([P(e)]);drw()},mv=e=>{if(!on)return;e.preventDefault();S2[S2.length-1].push(P(e));drw()},upf=()=>{if(!on)return;on=false;cand()};
  c.addEventListener("touchstart",dn,{passive:false});c.addEventListener("touchmove",mv,{passive:false});c.addEventListener("touchend",upf);c.addEventListener("mousedown",dn);c.addEventListener("mousemove",mv);window.addEventListener("mouseup",upf);
  pen.querySelector("#pnX").onclick=()=>{pen.remove();pen=null};pen.querySelector("#pnClr").onclick=()=>pen.reset();pen.querySelector("#pnAdd").onclick=()=>{if(pen.cand&&pen.cand[0])put(pen.cand[0]);else toast("数字を書いてください")};
  pen.S=()=>S2;pen.setS=v=>{S2=v;drw();cand()}}
 const ttl=()=>{if(pen)pen.querySelector("#pnT").textContent="✍️ "+(EG.pi+1)+"本目（"+DN[EG.segs[EG.pi].d]+"）の長さを書く"};ttl();setTimeout(()=>pen&&pen.reset(),20)}
window.egRec=recNum;window.egPen=()=>pen;
window.egPH=()=>PH;window.egScr=p=>scr(p);window.egEnds=()=>ends();window.egOpen=open;window.egRows=toRows;window.egFrom=fromRows;window.egSay=sayGo;window.EG=EG;
const b=document.getElementById("egOpen");if(b)b.onclick=open;
})();
