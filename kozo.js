/* 冷媒配管の曲げ共有：kozo.js（図面から現場をもっと細かく：H鋼の柱・天井高の範囲・電気ラック・ドレンの実際のルート）
   ・🏛 H鋼の柱：図面の「C2」「C11」などの柱記号のそばの H 形（フランジ2本＋ウェブ）を読んで、その大きさ・向きで柱を置く
   ・📐 天井高を分ける：部屋の中をタップ → まわりの壁（2本線）までを範囲にして、その中の「CH=2400」をその範囲の天井高にする
   ・⚡ 電気ラック：両端を2点タップ。幅と下端の高さ（FL+）を入れる。配管が当たると ⚠️
   ・💧 ドレンを実際のルートで：現場で図面と違う所を通した時、通したルートを図面の上でなぞって3Dのドレンを作り直す */
const KZ={last:-1};
const kzNeu=c=>{if(!c||c.length<7)return true;const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);return Math.max(r,g,b)-Math.min(r,g,b)<24};
/* 図面の線を、縦・横に分けて持っておく（グレー・黒だけ） */
function kzLines(){const P=PLAN;const key=(P.fkey||"")+"|"+P.segs.length;if(P._kz&&P._kz.k===key)return P._kz.v;const H=[],V=[];
 P.segs.forEach(s=>{if(!kzNeu(s[4]))return;const dx=s[2]-s[0],dy=s[3]-s[1];if(Math.abs(dy)<0.6&&Math.abs(dx)>1)H.push({c:(s[1]+s[3])/2,lo:Math.min(s[0],s[2]),hi:Math.max(s[0],s[2])});else if(Math.abs(dx)<0.6&&Math.abs(dy)>1)V.push({c:(s[0]+s[2])/2,lo:Math.min(s[1],s[3]),hi:Math.max(s[1],s[3])})});
 P._kz={k:key,v:{H,V}};return P._kz.v}

/* ===== 🏛 H鋼の柱 ===== */
function kzFindH(){const P=PLAN,mm=P.mmpp,{H,V}=kzLines(),out=[];
 const labs=(P.texts||[]).filter(t=>/^C\d{1,2}$/i.test(String(t.s||"").replace(/[\s　]/g,"")));
 labs.forEach(t=>{const tx=t.x+(t.w||0)/2,ty=t.y-(t.h||0)/2,R=1500/mm;let best=null;
  [[H,V,1],[V,H,0]].forEach(([F,Wb,hz])=>{
   const near=F.filter(f=>{const L=(f.hi-f.lo)*mm;if(L<120||L>600)return false;const m=(f.lo+f.hi)/2,cx=hz?m:f.c,cy=hz?f.c:m;return Math.hypot(cx-tx,cy-ty)<R});
   for(let i=0;i<near.length;i++)for(let j=0;j<near.length;j++){if(i===j)continue;const a=near[i],b=near[j];if(b.c<=a.c)continue;const La=a.hi-a.lo,Lb=b.hi-b.lo,sep=(b.c-a.c)*mm;
    if(Math.abs(La-Lb)>La*0.1||sep<120||sep>1000)continue;const ma=(a.lo+a.hi)/2,mb=(b.lo+b.hi)/2;if(Math.abs(ma-mb)>La*0.1)continue;
    /* ウェブ：フランジの真ん中で、2本の間を結ぶ線 */
    const web=Wb.some(w=>Math.abs(w.c-(ma+mb)/2)<La*0.15&&w.lo<=a.c+(b.c-a.c)*0.3&&w.hi>=b.c-(b.c-a.c)*0.3);if(!web)continue;
    const cx=hz?(ma+mb)/2:(a.c+b.c)/2,cy=hz?(a.c+b.c)/2:(ma+mb)/2,d=Math.hypot(cx-tx,cy-ty),o={cx,cy,B:La*mm,D:sep,hz,d};
    /* 一番外側の面どうし（2重線なら外側）を選ぶ。記号に近いものを優先 */
    if(!best||d<best.d-200/mm||(Math.abs(d-best.d)<=200/mm&&sep>best.D))best=o}});
  if(best&&!out.some(o=>Math.hypot(o.cx-best.cx,o.cy-best.cy)*mm<400))out.push({...best,n:String(t.s).trim()})});
 return out}
/* 原点のある図の範囲（1枚に図が2つある時、となりの図の柱を拾わない）。通り芯が無ければ null */
function kzPlanBox(){const P=PLAN;if(!P.org||!P.grids||!P.grids.length||typeof smGrids!=="function")return null;const e={c:P.org},X=smGrids("X",e),Y=smGrids("Y",e);if(!X.length||!Y.length)return null;
 const pad=2500/P.mmpp,xs=X.map(g=>g.v),ys=Y.map(g=>g.v);return{x0:Math.min(...xs)-pad,x1:Math.max(...xs)+pad,y0:Math.min(...ys)-pad,y1:Math.max(...ys)+pad}}
function kzPlaceH(){const P=PLAN;if(!P||!P.mmpp||!P.org){toast("先に縮尺と原点を決めてください");return}
 const bx=kzPlanBox(),F=kzFindH().filter(f=>!bx||(f.cx>=bx.x0&&f.cx<=bx.x1&&f.cy>=bx.y0&&f.cy<=bx.y1));if(!F.length){toast("図面の柱（C2 などの記号のそばの H 形）が見つかりませんでした。角を2点タップで置いてください");return}
 const L=[];F.forEach(f=>{const c=btWx([f.cx,f.cy]),e=btWx(f.hz?[f.cx+10,f.cy]:[f.cx,f.cy+10]),r=normT(Math.round(Math.atan2(e[1]-c[1],e[0]-c[0])*180/Math.PI));
  if(st.bld.some(o=>o.k==="col"&&Math.hypot(o.x-c[0],o.z-c[1])<300))return;
  L.push({k:"col",m:"h",x:Math.round(c[0]),z:Math.round(c[1]),w:Math.round(f.B/5)*5,d:Math.round(f.D/5)*5,r,full:true,h:600,y:0})});
 if(!L.length){toast("もう置いてあります");return}btAdd(normBld(L));toast("🏛 H鋼の柱を"+L.length+"本置きました（"+F.map(f=>f.n+" "+fmt(Math.round(f.D/5)*5)+"×"+fmt(Math.round(f.B/5)*5)).join("・")+"）")}

/* ===== 📐 天井高を分ける ===== */
/* p から上下左右に、いちばん近い「壁」（平行な線が40〜350mm向こうにある線）を探す */
function kzRoomAt(p){const P=PLAN,mm=P.mmpp,{H,V}=kzLines(),max=15000/mm;
 /* 壁＝長さ1m以上の線で、その向こう40〜350mmに、重なって平行な長い線がある（部屋名の枠などの短い線は使わない） */
 const hit=(A,along,cross,sg)=>{const C=A.filter(l=>along>=l.lo-1&&along<=l.hi+1&&(l.hi-l.lo)*mm>=1000&&sg*(l.c-cross)>20/mm&&sg*(l.c-cross)<max).sort((a,b)=>sg*(a.c-b.c));
  for(const l of C){const pr=A.find(q=>{const g=sg*(q.c-l.c)*mm;return g>=40&&g<=350&&(q.hi-q.lo)*mm>=500&&Math.min(q.hi,l.hi)-Math.max(q.lo,l.lo)>300/mm});if(pr)return l.c}return null};
 const x0=hit(V,p[1],p[0],-1),x1=hit(V,p[1],p[0],1),y0=hit(H,p[0],p[1],-1),y1=hit(H,p[0],p[1],1);
 if(x0==null||x1==null||y0==null||y1==null)return null;return{x0,x1,y0,y1}}
/* 範囲の中の「CH=2400」と部屋の名前 */
function kzCHIn(r){const P=PLAN;let ch=0,nm="";const T2=(P.texts||[]).map(t=>({t,s:String(t.s||"").replace(/[\s　]/g,"").replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)).replace(/[＝]/g,"=")}));
 T2.forEach(o=>{const cx=o.t.x+(o.t.w||0)/2,cy=o.t.y-(o.t.h||0)/2;if(cx<r.x0||cx>r.x1||cy<r.y0||cy>r.y1)return;const m=o.s.match(/C\.?H=?([1-6]\d{3})/i);if(!m)return;ch=+m[1];
  const nmT=T2.filter(q=>q!==o&&Math.abs((q.t.x+(q.t.w||0)/2)-cx)<(o.t.w||40)*1.5&&o.t.y-q.t.y>0&&o.t.y-q.t.y<(o.t.h||10)*2.6&&!/\d{3}/.test(q.s)&&q.s.length<=8).sort((a,b)=>b.t.y-a.t.y)[0];if(nmT)nm=nmT.s});
 return{ch,nm}}
function kzCeilPut(r,ch,nm){const P=PLAN,mm=P.mmpp,c=btWx([(r.x0+r.x1)/2,(r.y0+r.y1)/2]),A=btWx([r.x0,r.y0]),B=btWx([r.x1,r.y0]),rr=normT(Math.round(Math.atan2(B[1]-A[1],B[0]-A[0])*180/Math.PI));
 const o={k:"ceil",x:Math.round(c[0]),z:Math.round(c[1]),w:Math.round((r.x1-r.x0)*mm),d:Math.round((r.y1-r.y0)*mm),h:ch||BT.ch||2400,y:0,r:rr,full:false,n:nm||""};
 btAdd(normBld([o]));KZ.last=st.bld.length-1;const fx=kzFixMainCH(),mainCH=(P.CH||bldCH());
 toast("📐 天井高の範囲を置きました："+(nm?nm+" ":"")+"CH"+fmt(o.h)+"（"+fmt(o.w)+"×"+fmt(o.d)+"）・メインは CH"+fmt(mainCH)+(fx?"（図面に合わせて直しました）":"")+(Math.abs(mainCH-o.h)<20?"。⚠️ メインと同じ高さなので3Dで差が出ません":""));wzRender()}
/* メインの天井高が「天井高の範囲」（WCなど）と同じになっている時は、図面にあるほかの CH（範囲の外の部屋）に戻す。直したら true */
function kzFixMainCH(){const P=PLAN;if(!P)return false;const Z=(st.bld||[]).filter(o=>o.k==="ceil");if(!Z.length)return false;const cur=P.CH||st.gnd.ch;if(!Z.some(z=>Math.abs(z.h-cur)<20))return false;
 const L=(P.chList||[]).map(Number).filter(v=>v>=1800&&v<=9000&&!Z.some(z=>Math.abs(z.h-v)<20));if(!L.length)return false;const v=Math.max(...L);P.CH=v;st.gnd.ch=v;try{wzSave()}catch(e){}try{save()}catch(e){}return true}
function kzCeilTap(p){const P=PLAN;if(!P.segs||P.segs.length<50){toast("線のデータがある図面で使えます。「2点で範囲」で置いてください");return}
 const r=kzRoomAt(p);if(!r){toast("まわりの壁が見つかりませんでした。「2点で範囲」に切り替えて、対角を2点タップしてください");planDraw();return}
 const c=kzCHIn(r);kzCeilPut(r,c.ch,c.nm)}
/* 置いた範囲の天井高を直す */
function kzSetCH(v){const o=st.bld[KZ.last];if(!o||o.k!=="ceil")return;o.h=Math.max(1000,Math.min(9000,Math.round(v)||o.h));bldChanged();planDraw()}

/* ===== 💧 ドレンを実際のルートで ===== */
function kzDrStart(){if(typeof T==="undefined"||!T||!T.UN)return null;const u=T.UN.find(x=>x.t==="s"&&x.dr)||T.UN.find(x=>x.dr);if(!u)return null;return{u,S:u.dr.p.clone(),d0:new THREE.Vector3(u.dr.d.x,0,u.dr.d.z).normalize(),GY:T.GYr}}
/* なぞる点：前の点と縦・横がだいたい揃っていたら、まっすぐに直す */
function kzDrtTap(p){const P=PLAN,L=BT.pts;let q=p.slice();if(L.length){const a=L[L.length-1],dx=q[0]-a[0],dy=q[1]-a[1],ang=Math.abs(Math.atan2(dy,dx)*180/Math.PI)%90;if(ang<10||ang>80){if(Math.abs(dx)>=Math.abs(dy))q[1]=a[1];else q[0]=a[0]}}
 L.push(q);wzRender();planDraw()}
function kzDrMake(){const P=PLAN,s0=kzDrStart();if(!s0){toast("先に「3Dで見る」で、室内機と配管を作ってください（ドレン口の位置が必要です）");return}
 if(BT.pts.length<1){toast("ドレンを通したルートを、ドレン口の近くから順番にタップしてください");return}
 const V=THREE.Vector3,{S,d0,GY}=s0,top=BT.dtop||3256,end=BT.dend||0,y=GY+top,W=BT.pts.map(btWx);
 const pts=[{p:S.clone()}];if(Math.abs(y-S.y)>=30)pts.push({p:new V(S.x,y,S.z)});
 const a=pts[pts.length-1].p,ax=Math.abs(d0.x)>=Math.abs(d0.z);pts.push({p:ax?new V(W[0][0],y,a.z):new V(a.x,y,W[0][1])});pts.push({p:new V(W[0][0],y,W[0][1])});
 for(let i=1;i<W.length;i++)pts.push({p:new V(W[i][0],y,W[i][1])});
 const D=DRN();if(end){let Lh=0;for(let i=1;i<pts.length;i++){const u2=pts[i].p,v2=pts[i-1].p;if(Math.abs(u2.y-v2.y)<1)Lh+=Math.hypot(u2.x-v2.x,u2.z-v2.z)}
  const yEnd=y-Lh/(D.slope||100),dy=GY+end-yEnd;if(dy<=-30){const l=pts[pts.length-1].p;pts.push({p:new V(l.x,l.y+dy,l.z)})}}
 const rows=drRowsFromPts(pts,d0);if(!rows.length){toast("ルートが短すぎます");return}
 D.rows=rows.slice(0,40);D.show=true;D.tr.on=false;D.up=0;BT.pts=[];save();try{render()}catch(e){}if(T){build3D();T.dirty=true}
 toast("💧 実際のルートでドレンを作りました（"+D.rows.length+"区間・横引き FL+"+fmt(top)+(end?"・終わり FL+"+fmt(end):"")+"）");wzRender();planDraw()}
/* ドレンの横引きの高さ（初期値）：図面の「FL+」で一番高いドレンの文字 */
function kzDrTopGuess(){const P=PLAN;let m=0;(P&&P.texts||[]).forEach(t=>{const s=String(t.s||"").replace(/[\s　]/g,"");const k=s.match(/^FL\+(\d{4})$/);if(k&&+k[1]>m&&+k[1]<6000)m=+k[1]});return m||0}
function kzDrEndGuess(){const P=PLAN,T2=(P&&P.texts||[]);const vb=T2.find(t=>/ベスト|ウォーター|排水/.test(String(t.s||"")));if(!vb)return 0;
 const near=T2.filter(t=>/^FL\+\d{3,4}$/.test(String(t.s||"").replace(/[\s　]/g,""))&&Math.hypot(t.x-vb.x,t.y-vb.y)<(vb.h||10)*6).sort((a,b)=>Math.hypot(a.x-vb.x,a.y-vb.y)-Math.hypot(b.x-vb.x,b.y-vb.y))[0];
 return near?+String(near.s).replace(/\D/g,"").slice(-4):0}

/* ===== ウィザードの吹き出し ===== */
function kzHTML(k,done){const P=PLAN;
 if(k==="tenjo"){const o=st.bld[KZ.last],on=o&&o.k==="ceil";
  return`<div style="display:flex;gap:4px;margin-bottom:6px">${[["ceiltap","👆 部屋をタップ"],["ceil2","📐 2点で範囲"]].map(([t,l])=>`<button data-kzt="${t}" style="flex:1;height:40px;border-radius:10px;font-weight:800;font-size:14px;border:1.5px solid #cbd5e1;background:${BT.tool===t?"#fbbf24":"#fff"}">${l}</button>`).join("")}</div>`+
   (BT.tool==="ceil2"?`<p>天井高を変える範囲の<b>対角を2点</b>タップ。</p>${wzInp("ch","天井高（床から）")}`:`<p>天井の高さが違う<b>部屋の中をタップ</b>。まわりの壁までを範囲にして、図面の「CH=2400」などを読みます。</p>`)+
   (on?`<div style="background:#e0f2fe;border-radius:10px;padding:8px;margin-top:6px">置いた範囲：<b>${o.n?o.n+" ":""}${fmt(o.w)}×${fmt(o.d)}</b><br><label style="font-size:13px">天井高 CH <input id="kzCH" inputmode="numeric" value="${uVal(o.h)}" style="width:80px;height:36px;border-radius:9px;border:1.5px solid #0284c7;padding:0 6px;font-size:16px;font-weight:800"> mm</label></div>`:"")+
   `<p style="font-size:12.5px;color:#64748b;margin-top:6px">範囲の外は、いつもの天井高（${fmt(bldCH())}）のままです。範囲の中の室内機は、その天井高に付きます。</p>`+done}
 if(k==="rack")return`<p>電気ラックの<b>端と端</b>を2点タップ。</p>${wzInp("rw","ラックの幅")}${wzInp("ry","下端の高さ（床から）")}<p style="font-size:12.5px;color:#64748b">配管がラックに当たると3Dで ⚠️ が出ます。</p>`+done;
 if(k==="drt"){const s0=kzDrStart();if(BT.dtop==null)BT.dtop=kzDrTopGuess()||3000;if(BT.dend==null)BT.dend=kzDrEndGuess();
  return(s0?"":`<p style="color:#b91c1c;font-size:13px"><b>先に「🧊 3Dで見る」</b>で室内機と配管を作ってから来てください（ドレン口の位置を使います）。</p>`)+
   `<p>現場で<b>実際に通したドレンのルート</b>を、ドレン口の近くから順番にタップ（曲がり角ごと）。縦・横はまっすぐに揃えます。</p>${wzInp("dtop","横引きの高さ FL+")}${wzInp("dend","終わりの高さ FL+（0＝下げない）")}
   <div style="font-size:13px;margin:4px 0">置いた点：<b>${BT.pts.length}</b>（「◀ 戻る」で1つ消す）</div>${BT.pts.length?wzBtn("kzDrOk","💧 このルートでドレンを作る","#0284c7","#fff","width:100%"):""}
   <p style="font-size:12.5px;color:#64748b;margin-top:6px">勾配は今の設定（1/${DRN().slope||100}）で下げます。終わりに高さを入れると、そこまで縦に下げます（ウォーターベストなど）。</p>`}
 if(k==="col")return`<div style="display:flex;gap:4px;margin-bottom:6px">${[["","⬛ 角柱"],["h","🏗 H鋼"]].map(([t,l])=>`<button data-kzc="${t}" style="flex:1;height:40px;border-radius:10px;font-weight:800;font-size:14px;border:1.5px solid #cbd5e1;background:${(BT.ct||"")===t?"#fbbf24":"#fff"}">${l}</button>`).join("")}</div>
  ${wzBtn("kzHAuto","🏗 図面のH鋼の柱（C2 など）をまとめて置く","#475569","#fff","width:100%;margin-bottom:6px")}<p>柱の<b>角と角（対角）</b>を2点タップ${BT.ct==="h"?"（H鋼：横の長さ＝フランジ幅、縦＝せい。3Dで向きを回せます）":""}。</p>`+done;
 return""}
function kzBind(){const q=s=>document.querySelectorAll(s);
 q("[data-kzt]").forEach(b=>b.onclick=()=>{BT.tool=b.dataset.kzt;BT.pts=[];wzRender();planDraw()});
 q("[data-kzc]").forEach(b=>b.onclick=()=>{BT.ct=b.dataset.kzc;wzRender()});
 const on=(id,f)=>{const e=document.getElementById(id);if(e)e.onclick=f};on("kzHAuto",kzPlaceH);on("kzDrOk",kzDrMake);
 const ch=document.getElementById("kzCH");if(ch)ch.onchange=()=>kzSetCH(uParse(ch.value))}
/* タップ（planBldPlace から）。処理したら true */
function kzPlace(tool,p){
 if(tool==="ceiltap"){kzCeilTap(p);return true}
 if(tool==="drt"){kzDrtTap(p);return true}
 if(tool==="ceil2"||tool==="rack"){BT.pts.push(p);if(BT.pts.length<2){wzRender();planDraw();return true}const a=BT.pts[0],b=BT.pts[1];BT.pts=[];
  if(tool==="ceil2"){const r={x0:Math.min(a[0],b[0]),x1:Math.max(a[0],b[0]),y0:Math.min(a[1],b[1]),y1:Math.max(a[1],b[1])};if((r.x1-r.x0)*PLAN.mmpp<300||(r.y1-r.y0)*PLAN.mmpp<300){toast("小さすぎます。対角の2点をタップ");planDraw();return true}
   const c=kzCHIn(r);kzCeilPut(r,c.ch||BT.ch,c.nm);return true}
  const A=btWx(a),B=btWx(b),L=Math.hypot(B[0]-A[0],B[1]-A[1]);if(L<200){toast("短すぎます");planDraw();return true}
  btAdd(normBld([{k:"rack",x:Math.round((A[0]+B[0])/2),z:Math.round((A[1]+B[1])/2),w:Math.round(L),d:BT.rw||400,h:100,y:BT.ry||2800,r:normT(Math.round(Math.atan2(B[1]-A[1],B[0]-A[0])*180/Math.PI)),full:false}]));toast("⚡ 電気ラックを置きました");return true}
 return false}
