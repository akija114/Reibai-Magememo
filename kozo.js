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
/* 📐 天井高の範囲を自動で：図面の「CH=2400」など、メインの天井高と違う文字がある部屋に範囲を置く（作り直す時は自動で置いた物だけ消す）。
   範囲の中に違う天井高の文字がもう1つある時は、部屋がうまく取れていないので置かない */
function kzCeilAuto(){const P=PLAN;if(!P||!P.mmpp||!P.org||!P.segs||P.segs.length<50)return 0;const mm=P.mmpp,main=P.CH||bldCH(),bx=kzPlanBox();
 st.bld=st.bld.filter(o=>!(o.k==="ceil"&&o.auto==="ch"));
 const T2=(P.texts||[]).map(t=>{const s=String(t.s||"").replace(/[\s　]/g,"").replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)).replace(/[＝]/g,"=");const m=s.match(/C\.?H=?([1-6]\d{3})/i);return m?{v:+m[1],p:[t.x+(t.w||0)/2,t.y-(t.h||0)/2]}:null}).filter(Boolean);
 const inR=(p,r)=>p[0]>=r.x0&&p[0]<=r.x1&&p[1]>=r.y0&&p[1]<=r.y1,add=[];
 T2.forEach(t=>{if(Math.abs(t.v-main)<20)return;if(bx&&(t.p[0]<bx.x0||t.p[0]>bx.x1||t.p[1]<bx.y0||t.p[1]>bx.y1))return;
  const r=kzRoomAt(t.p);if(!r)return;if((r.x1-r.x0)*mm<500||(r.y1-r.y0)*mm<500)return;
  if(T2.some(q=>q!==t&&Math.abs(q.v-t.v)>=20&&inR(q.p,r)))return;
  const c=btWx([(r.x0+r.x1)/2,(r.y0+r.y1)/2]);if(st.bld.concat(add).some(o=>{if(o.k!=="ceil")return false;const th=o.r*Math.PI/180,dx=c[0]-o.x,dz=c[1]-o.z;return Math.abs(dx*Math.cos(th)+dz*Math.sin(th))<=o.w/2&&Math.abs(-dx*Math.sin(th)+dz*Math.cos(th))<=o.d/2}))return;
  const A=btWx([r.x0,r.y0]),B=btWx([r.x1,r.y0]),rr=normT(Math.round(Math.atan2(B[1]-A[1],B[0]-A[0])*180/Math.PI));
  add.push({k:"ceil",auto:"ch",x:Math.round(c[0]),z:Math.round(c[1]),w:Math.round((r.x1-r.x0)*mm),d:Math.round((r.y1-r.y0)*mm),h:t.v,y:0,r:rr,full:false,n:kzCHIn(r).nm||""})});
 if(add.length)btAdd(normBld(add));return add.length}
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
 if(k==="win"){if(BT.wy==null)BT.wy=900;if(BT.wh2==null)BT.wh2=1200;if(BT.wd==null)BT.wd=150;return wzBtn("kzWinAuto","🪟 図面の窓をまとめて置く","#0284c7","#fff","width:100%;margin-bottom:6px")+`<p>窓の<b>端と端</b>を2点タップ（壁の上）。窓の下と上は壁にします。</p>${wzInp("wy","窓の下端（床から）")}${wzInp("wh2","窓の高さ")}${wzInp("wd","壁の厚み")}<p style="font-size:12.5px;color:#64748b">図面には窓の高さが無いので、ここの値で置きます（現場の写真や立面図で確かめてください）。</p>`+done}
 if(k==="rack")return`<p>電気ラックの<b>端と端</b>を2点タップ。</p>${wzInp("rw","ラックの幅")}${wzInp("ry","下端の高さ（床から）")}<p style="font-size:12.5px;color:#64748b">配管がラックに当たると3Dで ⚠️ が出ます。</p>`+done;
 if(k==="drt"){const s0=kzDrStart();if(BT.dtop==null)BT.dtop=kzDrTopGuess()||3000;if(BT.dend==null)BT.dend=kzDrEndGuess();
  return(s0?"":`<p style="color:#b91c1c;font-size:13px"><b>先に「🧊 3Dで見る」</b>で室内機と配管を作ってから来てください（ドレン口の位置を使います）。</p>`)+
   `<p>現場で<b>実際に通したドレンのルート</b>を、ドレン口の近くから順番にタップ（曲がり角ごと）。縦・横はまっすぐに揃えます。</p>${wzInp("dtop","横引きの高さ FL+")}${wzInp("dend","終わりの高さ FL+（0＝下げない）")}
   <div style="font-size:13px;margin:4px 0">置いた点：<b>${BT.pts.length}</b>（「◀ 戻る」で1つ消す）</div>${BT.pts.length?wzBtn("kzDrOk","💧 このルートでドレンを作る","#0284c7","#fff","width:100%"):""}
   <p style="font-size:12.5px;color:#64748b;margin-top:6px">勾配は今の設定（1/${DRN().slope||100}）で下げます。終わりに高さを入れると、そこまで縦に下げます（ウォーターベストなど）。</p>`}
 if(k==="lgs")return"";
 if(k==="col")return`<div style="display:flex;gap:4px;margin-bottom:6px">${[["","⬛ 角柱"],["h","🏗 H鋼"]].map(([t,l])=>`<button data-kzc="${t}" style="flex:1;height:40px;border-radius:10px;font-weight:800;font-size:14px;border:1.5px solid #cbd5e1;background:${(BT.ct||"")===t?"#fbbf24":"#fff"}">${l}</button>`).join("")}</div>
  ${wzBtn("kzHAuto","🏗 図面のH鋼の柱（C2 など）をまとめて置く","#475569","#fff","width:100%;margin-bottom:6px")}<p>柱の<b>角と角（対角）</b>を2点タップ${BT.ct==="h"?"（H鋼：横の長さ＝フランジ幅、縦＝せい。3Dで向きを回せます）":""}。</p>`+done;
 return""}
function kzBind(){const q=s=>document.querySelectorAll(s);
 q("[data-kzt]").forEach(b=>b.onclick=()=>{BT.tool=b.dataset.kzt;BT.pts=[];wzRender();planDraw()});
 q("[data-kzc]").forEach(b=>b.onclick=()=>{BT.ct=b.dataset.kzc;wzRender()});
 const on=(id,f)=>{const e=document.getElementById(id);if(e)e.onclick=f};on("kzHAuto",kzPlaceH);on("kzDoorAuto",()=>kzDoors());on("kzWinAuto",()=>kzWindows());on("kzLgsAuto",()=>kzLgs());on("kzDrOk",kzDrMake);
 const ch=document.getElementById("kzCH");if(ch)ch.onchange=()=>kzSetCH(uParse(ch.value))}
/* タップ（planBldPlace から）。処理したら true */
function kzPlace(tool,p){
 if(tool==="ceiltap"){kzCeilTap(p);return true}
 if(tool==="drt"){kzDrtTap(p);return true}
 if(tool==="win"){BT.pts.push(p);if(BT.pts.length<2){wzRender();planDraw();return true}const A=btWx(BT.pts[0]),B=btWx(BT.pts[1]);BT.pts=[];if(Math.hypot(B[0]-A[0],B[1]-A[1])<200){toast("短すぎます");planDraw();return true}
  btAdd(normBld(kzWinPut(A,B,BT.wd||150,normT(Math.round(Math.atan2(B[1]-A[1],B[0]-A[0])*180/Math.PI)),BT.wy!=null?BT.wy:900,BT.wh2!=null?BT.wh2:1200)));toast("🪟 窓を置きました");return true}
 if(tool==="ceil2"||tool==="rack"){BT.pts.push(p);if(BT.pts.length<2){wzRender();planDraw();return true}const a=BT.pts[0],b=BT.pts[1];BT.pts=[];
  if(tool==="ceil2"){const r={x0:Math.min(a[0],b[0]),x1:Math.max(a[0],b[0]),y0:Math.min(a[1],b[1]),y1:Math.max(a[1],b[1])};if((r.x1-r.x0)*PLAN.mmpp<300||(r.y1-r.y0)*PLAN.mmpp<300){toast("小さすぎます。対角の2点をタップ");planDraw();return true}
   const c=kzCHIn(r);kzCeilPut(r,c.ch||BT.ch,c.nm);return true}
  const A=btWx(a),B=btWx(b),L=Math.hypot(B[0]-A[0],B[1]-A[1]);if(L<200){toast("短すぎます");planDraw();return true}
  btAdd(normBld([{k:"rack",x:Math.round((A[0]+B[0])/2),z:Math.round((A[1]+B[1])/2),w:Math.round(L),d:BT.rw||400,h:100,y:BT.ry||2800,r:normT(Math.round(Math.atan2(B[1]-A[1],B[0]-A[0])*180/Math.PI)),full:false}]));toast("⚡ 電気ラックを置きました");return true}
 return false}

/* ===== 🚪 扉マークから扉を置く =====
   開き戸の記号＝吊り元を中心にした 1/4 の円弧（半径＝扉の幅）＋吊り元から伸びる扉の線。
   CADの円弧は短い直線をつないで描かれていることが多いので、つながった短い線をたどって円に当てはめる（本当の曲線も使う）。
   吊り元から扉の線が伸びている方が「開いた側」、もう一方の弧の端が「閉じた位置」＝壁の開口。開口の真ん中を壁に合わせて開き戸を置く。
   近くに「H2000」などの書き込みがあれば、それを扉の高さにする */
function kzCircle(a,m,b){const ax=a[0],ay=a[1],bx=m[0],by=m[1],cx=b[0],cy=b[1],d=2*(ax*(by-cy)+bx*(cy-ay)+cx*(ay-by));if(Math.abs(d)<1e-9)return null;
 const ux=((ax*ax+ay*ay)*(by-cy)+(bx*bx+by*by)*(cy-ay)+(cx*cx+cy*cy)*(ay-by))/d,uy=((ax*ax+ay*ay)*(cx-bx)+(bx*bx+by*by)*(ax-cx)+(cx*cx+cy*cy)*(bx-ax))/d;return{x:ux,y:uy,r:Math.hypot(ax-ux,ay-uy)}}
function kzArcPieces(){const P=PLAN,mm=P.mmpp,S=P.segs||[],out=[],near=(p,q)=>Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1])<0.05;let ch=[];
 const flush=()=>{if(ch.length>=4){const pts=[[ch[0][0],ch[0][1]],...ch.map(s=>[s[2],s[3]])],a=pts[0],b=pts[pts.length-1],m=pts[pts.length>>1],c=kzCircle(a,m,b);
   if(c&&pts.every(p=>Math.abs(Math.hypot(p[0]-c.x,p[1]-c.y)-c.r)<=c.r*0.04+0.5))out.push({a,m,b,c,col:ch[0][4]})}ch=[]};
 for(let i=0;i<S.length;i++){const s=S[i],L=Math.hypot(s[2]-s[0],s[3]-s[1])*mm;if(L>250||L<1||!kzNeu(s[4])){flush();continue}
  if(ch.length){const p=ch[ch.length-1];if(!near([p[2],p[3]],[s[0],s[1]])||p[4]!==s[4]){flush()}}ch.push(s)}flush();
 (P.arcs||[]).forEach(o=>{if(!kzNeu(o.col))return;const c=kzCircle(o.a,o.m,o.b);if(c)out.push({...o,c})});return out}
function kzFindDoors(){const P=PLAN,mm=P.mmpp,pc=kzArcPieces().filter(o=>o.c.r*mm>=450&&o.c.r*mm<=1400),G=[];
 const ang=(c,p)=>Math.atan2(p[1]-c.y,p[0]-c.x),sweep=o=>{let d=Math.abs(ang(o.c,o.b)-ang(o.c,o.a));if(d>Math.PI)d=2*Math.PI-d;return d};
 pc.forEach(o=>{const g=G.find(g2=>Math.hypot(g2.c.x-o.c.x,g2.c.y-o.c.y)*mm<40&&Math.abs(g2.c.r-o.c.r)<o.c.r*0.04);if(g){g.P.push(o)}else G.push({c:o.c,P:[o]})});
 const D=[];G.forEach(g=>{const E=[];g.P.forEach(o=>[o.a,o.b].forEach(p=>{const k=E.findIndex(q=>Math.hypot(q[0]-p[0],q[1]-p[1])*mm<20);if(k>=0)E.splice(k,1);else E.push(p)}));
  if(E.length!==2)return;const sw=g.P.reduce((s,o)=>s+sweep(o),0)*180/Math.PI;if(sw<75||sw>105)return;const c=g.c,H=[c.x,c.y],r=c.r;
  /* 開いた側：吊り元から弧の端まで伸びる線がある方 */
  /* 扉の線：吊り元と弧の端の両方を通る線（扉の枠まで伸びていて長さが違ってもよい） */
  const dSeg=(q,A,B)=>{const vx=B[0]-A[0],vy=B[1]-A[1],L2=vx*vx+vy*vy||1,t=Math.max(0,Math.min(1,((q[0]-A[0])*vx+(q[1]-A[1])*vy)/L2));return Math.hypot(A[0]+vx*t-q[0],A[1]+vy*t-q[1])*mm};
  const leaf=p=>(P.segs||[]).some(s=>{const A=[s[0],s[1]],B=[s[2],s[3]],L=Math.hypot(B[0]-A[0],B[1]-A[1]);if(L<r*0.8)return false;return dSeg(H,A,B)<40&&dSeg(p,A,B)<40});
  const l0=leaf(E[0]),l1=leaf(E[1]);let C=null;if(l0&&!l1)C=E[1];else if(l1&&!l0)C=E[0];
  D.push({H,C,E,r:r*mm})});return D}
/* 1枚に図が2つある時の、ほかの図までのずれ（同じ名前の通り芯の差）。Oc に近い方の図から見た差の一覧 */
function kzPlanOffsets(Oc){const P=PLAN,G=P.grids||[],out=[];["X","Y"].forEach(ax=>{});
 const xs={},ys={};G.forEach(g=>{(g.ax==="X"?xs:ys)[g.n]=((g.ax==="X"?xs:ys)[g.n]||[]).concat([g.v])});
 const dx=[],dy=[];Object.values(xs).forEach(v=>{if(v.length<2)return;const me=v.reduce((b,x)=>Math.abs(x-Oc[0])<Math.abs(b-Oc[0])?x:b);v.forEach(x=>{if(x!==me)dx.push(me-x)})});
 Object.values(ys).forEach(v=>{if(v.length<2)return;const me=v.reduce((b,y)=>Math.abs(y-Oc[1])<Math.abs(b-Oc[1])?y:b);v.forEach(y=>{if(y!==me)dy.push(me-y)})});
 const md=a=>a.length?a.sort((p,q)=>p-q)[a.length>>1]:0;if(dx.length||dy.length)out.push([md(dx),md(dy)]);return out}
/* 扉の高さ：近くの「H2000」。1枚に図が2つある時は、もう一方の図の同じ所（通り芯の差だけずらした所）も見る */
function kzDoorH(Oc){const P=PLAN;const spots=[Oc,...kzPlanOffsets(Oc).map(o=>[Oc[0]-o[0],Oc[1]-o[1]])];
 const tg=(P.texts||[]).map(t=>({t,m:String(t.s||"").normalize("NFKC").replace(/\s/g,"").match(/^H(\d{4})$/)})).filter(o=>o.m&&+o.m[1]>=1500&&+o.m[1]<=3500).map(o=>({v:+o.m[1],d:Math.min(...spots.map(S2=>Math.hypot(o.t.x-S2[0],o.t.y-S2[1])))*P.mmpp})).filter(o=>o.d<1500).sort((a,b)=>a.d-b.d)[0];return tg?tg.v:2000}
/* ===== 🏛 H鋼のまわりの片付け =====
   H鋼の中を通る普通の壁（H鋼に重なって立っている図面の線）は消す。
   前のバージョンで自動で置いた「H鋼を囲む4面の囲い」（auto:"hlgs"）も消す。
   ※ H鋼のまわりのボード＋スタッドは、図面に描いてある線を kzLgs で読む（機械的な囲いは置かない） */
function kzHEnclose(quiet){const P=PLAN;if(!P)return 0;const Hs=st.bld.filter(o=>o.k==="col"&&o.m==="h");
 const inH=(x,z,c)=>{const th=c.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th),dx=x-c.x,dz=z-c.z;return Math.abs(dx*co+dz*si)<c.w/2&&Math.abs(-dx*si+dz*co)<c.d/2};
 const n0=st.bld.length;let nx=0;
 st.bld=st.bld.filter(o=>{if(o.auto==="hlgs")return false;if(!Hs.length||o.k!=="wall"||o.m==="lgs")return true;const wt=o.r*Math.PI/180,ux=Math.cos(wt),uz=Math.sin(wt);
  for(let t=-o.w/2;t<=o.w/2;t+=40){const x=o.x+t*ux,z=o.z+t*uz;if(Hs.some(c=>inH(x,z,c))){nx++;return false}}return true});
 if(st.bld.length!==n0)bldChanged();
 if(!quiet&&nx)toast("H鋼の中を通っていた壁を"+nx+"枚消しました");
 return nx}

/* ===== 🚪 引き戸 =====
   図面の引き戸＝細長い四角（戸板：幅20〜70mm・長さ450〜1600mm）が、同じ線の上（ずれ120mm以内）で2枚以上、少し重なって並んでいる所。
   戸板の端から端までを開口の幅にする（片引きの1枚だけの戸は、窓と見分けがつかないので置かない） */
function kzFindSlides(){const P=PLAN,mm=P.mmpp,{H,V}=kzLines(),out=[];
 [[H,1],[V,0]].forEach(([A,hz])=>{const Ls=A.filter(l=>{const L=(l.hi-l.lo)*mm;return L>=450&&L<=1600}).sort((a,b)=>a.c-b.c),pn=[];
  for(let i=0;i<Ls.length;i++)for(let j=i+1;j<Ls.length;j++){const a=Ls[i],b=Ls[j],t=(b.c-a.c)*mm;if(t>70)break;if(t<20)continue;
   if(Math.abs(a.lo-b.lo)*mm>15||Math.abs(a.hi-b.hi)*mm>15)continue;const p={c:(a.c+b.c)/2,t,lo:(a.lo+b.lo)/2,hi:(a.hi+b.hi)/2};
   if(!pn.some(q=>Math.abs(q.c-p.c)*mm<10&&Math.abs(q.lo-p.lo)*mm<20&&Math.abs(q.hi-p.hi)*mm<20))pn.push(p)}
  /* 戸板のまとまり：同じ線の上で、重なるか、すき間30mm以内 */
  const used=new Set();pn.forEach((p,i)=>{if(used.has(i))return;const g=[p];used.add(i);let grow=true;
   while(grow){grow=false;pn.forEach((q,j)=>{if(used.has(j))return;const L0=p.hi-p.lo,Lq=q.hi-q.lo;if(Math.abs(q.t-p.t)>10||Math.max(L0,Lq)>1.3*Math.min(L0,Lq))return;if(g.some(r=>Math.abs(r.c-q.c)*mm<=120&&Math.min(r.hi,q.hi)-Math.max(r.lo,q.lo)>-30/mm)){g.push(q);used.add(j);grow=true}})}
   if(g.length<2)return;const lo=Math.min(...g.map(x=>x.lo)),hi=Math.max(...g.map(x=>x.hi)),W=(hi-lo)*mm;if(W<600||W>4000)return;
   /* 2枚がほとんど同じ所にある（重なり8割以上）のは戸ではない */
   const ov=Math.min(g[0].hi,g[1].hi)-Math.max(g[0].lo,g[1].lo);if(ov>0.8*Math.min(g[0].hi-g[0].lo,g[1].hi-g[1].lo))return;
   const c=g.reduce((a,x)=>a+x.c,0)/g.length;out.push({hz,c,lo,hi,n:g.length,A:hz?[lo,c]:[c,lo],B:hz?[hi,c]:[c,hi]})})});
 return out}
function kzDoors(quiet){const P=PLAN;if(!P||!P.mmpp||!P.org){if(!quiet)toast("先に縮尺と原点を決めてください");return 0}
 const bx=kzPlanBox(),D=kzFindDoors().filter(d=>!bx||(d.H[0]>=bx.x0&&d.H[0]<=bx.x1&&d.H[1]>=bx.y0&&d.H[1]<=bx.y1)),walls=st.bld.filter(o=>o.k==="wall"),L=[];
 const onWall=q=>{let best=null,bd=1e9;walls.forEach(o=>{const th=o.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th),dx=q[0]-o.x,dz=q[1]-o.z,lx=dx*co+dz*si,lz=-dx*si+dz*co;
  if(Math.abs(lx)<=o.w/2+150&&Math.abs(lz)<=o.d/2+300&&Math.abs(lz)<bd){bd=Math.abs(lz);best={o,lx,co,si,bd}}});return best};
 D.forEach(d=>{/* 閉じた位置が分からない時は、壁に近い方の端 */
  /* 壁の線の上にある向き（吊り元→端 が壁と平行で、吊り元が壁の芯の近く）を「閉じた位置」にする */
  const lineWall=(E)=>{const Hw=btWx(d.H),Ew=btWx(E),a=Math.atan2(Ew[1]-Hw[1],Ew[0]-Hw[0])*180/Math.PI;let best=null,bd=1e9;
   walls.forEach(o=>{let da=Math.abs(((a-o.r)%180+180)%180);da=Math.min(da,180-da);if(da>6)return;const th=o.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th),lz=Math.abs(-(Hw[0]-o.x)*si+(Hw[1]-o.z)*co),fc=Math.abs(lz-o.d/2);   // 吊り元は壁の面にある：面がいちばん近い壁
    if(lz<=o.d/2+150&&fc<bd){bd=fc;best={o,co,si,bd}}});return best};
  let C=d.C,LW=null;if(!C){const w0=lineWall(d.E[0]),w1=lineWall(d.E[1]);if(w0&&!w1)C=d.E[0];else if(w1&&!w0)C=d.E[1];else if(w0&&w1)C=w0.bd<=w1.bd?d.E[0]:d.E[1];
   else{const v0=onWall(btWx(d.E[0])),v1=onWall(btWx(d.E[1]));C=!v1?d.E[0]:!v0?d.E[1]:(v0.bd<=v1.bd?d.E[0]:d.E[1])}}
  LW=lineWall(C);
  const Oc=[(d.H[0]+C[0])/2,(d.H[1]+C[1])/2],q=btWx(Oc),w=Math.round(d.r/10)*10;
  /* 高さ：近くの「H2000」。1枚に図が2つある時は、もう一方の図の同じ所（通り芯の差だけずらした所）も見る */
  const h=kzDoorH(Oc);
  if(st.bld.some(o=>o.k==="door"&&o.auto!=="door"&&!o.auto&&false)||L.some(o=>o.k==="door"&&Math.hypot(o.x-q[0],o.z-q[1])<400))return;
  /* 扉の所は壁が切れているので、同じ線の上にある壁（開口の両側）の向き・厚みを使う */
  let W2=null;if(LW){const o2=LW.o,dx=q[0]-o2.x,dz=q[1]-o2.z;W2={o:o2,lx:dx*LW.co+dz*LW.si,co:LW.co,si:LW.si,free:1}}
  if(!W2)W2=onWall(q);if(!W2){let bd=1e9;walls.forEach(o2=>{const th=o2.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th),dx=q[0]-o2.x,dz=q[1]-o2.z,lx=dx*co+dz*si,lz=-dx*si+dz*co;if(Math.abs(lz)<=o2.d/2+80&&Math.abs(lx)<=o2.w/2+w+600&&Math.abs(lz)<bd){bd=Math.abs(lz);W2={o:o2,lx,co,si,free:1}}})}
  let o;
  if(W2){const lx=W2.free?W2.lx:Math.max(-W2.o.w/2+w/2,Math.min(W2.o.w/2-w/2,W2.lx));o={k:"door",x:Math.round(W2.o.x+lx*W2.co),z:Math.round(W2.o.z+lx*W2.si),w,d:W2.o.d,h,y:0,r:W2.o.r,full:false,m:"swing"}}
  else{const A=btWx(d.H),B=btWx(C);const ra=Math.atan2(B[1]-A[1],B[0]-A[0])*180/Math.PI,sn=Math.round(ra/90)*90;   /* 弧の端が少しずれていても、ほぼ縦横なら縦横にそろえる */
   o={k:"door",x:Math.round(q[0]),z:Math.round(q[1]),w,d:100,h,y:0,r:normT(Math.round(Math.abs(ra-sn)<=8?sn:ra)),full:false,m:"swing"};
   /* 間仕切り：閉じた位置（開口の端）から、扉と同じ向きに伸びる図面の線を、薄い壁（その所の天井まで）にする */
   const pw=kzPartition(d.H,C);if(pw)L.push(pw)}
  L.push(o)});
 /* 引き戸：開口の真ん中・同じ線の上の壁の厚み（無ければ100） */
 kzFindSlides().forEach(S=>{const Oc=[(S.A[0]+S.B[0])/2,(S.A[1]+S.B[1])/2];if(bx&&(Oc[0]<bx.x0||Oc[0]>bx.x1||Oc[1]<bx.y0||Oc[1]>bx.y1))return;
  const A=btWx(S.A),B=btWx(S.B),q=btWx(Oc),w=Math.round(Math.hypot(B[0]-A[0],B[1]-A[1])/10)*10,r=normT(Math.round(Math.atan2(B[1]-A[1],B[0]-A[0])*180/Math.PI));
  if(L.some(o=>o.k==="door"&&Math.hypot(o.x-q[0],o.z-q[1])<Math.max(400,w/2)))return;
  let d=100,bd=1e9;walls.forEach(o=>{let da=Math.abs(((r-o.r)%180+180)%180);da=Math.min(da,180-da);if(da>6)return;const th=o.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th),dx=q[0]-o.x,dz=q[1]-o.z,lx=dx*co+dz*si,lz=Math.abs(-dx*si+dz*co);
   if(lz<=40&&Math.abs(lx)<=o.w/2+w/2+600&&lz<bd){bd=lz;d=o.d}});
  L.push({k:"door",x:Math.round(q[0]),z:Math.round(q[1]),w,d,h:kzDoorH(Oc),y:0,r,full:false,m:"slide"})});
 L.forEach(o=>o.auto="door");
 if(L.length){const Nd=L.filter(o=>o.k==="door");st.bld=st.bld.filter(o=>!(o.auto==="door")&&!(o.k==="door"&&Nd.some(n=>Math.hypot(n.x-o.x,n.z-o.z)<Math.max(900,n.w+200))));btAdd(normBld(L))}const Ld=L.filter(o=>o.k==="door"),np=L.length-Ld.length;if(!quiet)toast(Ld.length?"🚪 扉マークから扉を "+Ld.length+"か所 置きました（"+Ld.map(o=>(o.m==="slide"?"引き戸":"開き戸")+" 幅"+fmt(o.w)+"・高さ"+fmt(o.h)).join("／")+"）"+(np?"・間仕切りの壁 "+np+"枚":""):D.length?"扉はもう置いてあります":"扉マーク（開き戸の弧）が見つかりませんでした");return Ld.length}

/* 扉の開口の端 C から、吊り元 H と反対向きに伸びる線（間仕切り）→ 厚さ100の壁。天井高の範囲の中ならその高さまで */
function kzPartition(H,C){const P=PLAN,mm=P.mmpp,ux=(C[0]-H[0]),uy=(C[1]-H[1]),ul=Math.hypot(ux,uy)||1,u=[ux/ul,uy/ul];let F=null;
 (P.segs||[]).forEach(s=>{if(!kzNeu(s[4]))return;[[s[0],s[1],s[2],s[3]],[s[2],s[3],s[0],s[1]]].forEach(([ax,ay,bx,by])=>{if(Math.hypot(ax-C[0],ay-C[1])*mm>60)return;const vx=bx-ax,vy=by-ay,L=Math.hypot(vx,vy);if(L*mm<300)return;
  if(Math.abs((vx*u[1]-vy*u[0])/L)>0.05||(vx*u[0]+vy*u[1])<0)return;if(!F||L>F.L)F={x:bx,y:by,L}})});
 if(!F)return null;const A=btWx(C),B=btWx([F.x,F.y]),Lw=Math.hypot(B[0]-A[0],B[1]-A[1]);if(Lw<300)return null;
 const mx=(A[0]+B[0])/2,mz=(A[1]+B[1])/2,z=typeof ceilAt==="function"?ceilAt(mx,mz):null,o={k:"wall",x:Math.round(mx),z:Math.round(mz),w:Math.round(Lw),d:100,r:normT(Math.round(Math.atan2(B[1]-A[1],B[0]-A[0])*180/Math.PI)),y:0,full:!z,h:z?z.h:600};
 if(st.bld.some(w=>w.k==="wall"&&w.auto!=="door"&&Math.hypot(w.x-o.x,w.z-o.z)<200))return null;return o}

/* ===== 🪟 窓 =====
   図面の窓＝壁の切れ目（同じ線の上の壁と壁の間）に、壁の厚みの中を通る細い平行線（ガラス・サッシ）が2本以上ある所。扉の弧がある切れ目は扉なので除く。
   高さは図面に無いので、下端・高さは設定の値（初期：下端 FL+900・高さ 1200）。窓の下（腰壁）と上（垂れ壁）は壁にする */
function kzWinPut(A,B,d,r,sill,hw){const L=[],mx=(A[0]+B[0])/2,mz=(A[1]+B[1])/2,Lw=Math.hypot(B[0]-A[0],B[1]-A[1]),CH=(typeof bldCH==="function"?bldCH():2700);
 L.push({k:"win",x:Math.round(mx),z:Math.round(mz),w:Math.round(Lw),d:Math.round(d),h:hw,y:sill,r,full:false});
 if(sill>50)L.push({k:"wall",x:Math.round(mx),z:Math.round(mz),w:Math.round(Lw),d:Math.round(d),h:sill,y:0,r,full:false});
 const top=sill+hw;if(CH-top>50)L.push({k:"wall",x:Math.round(mx),z:Math.round(mz),w:Math.round(Lw),d:Math.round(d),h:CH-top,y:top,r,full:false});return L}
function kzWindows(quiet){const P=PLAN;if(!P||!P.mmpp||!P.org){if(!quiet)toast("先に縮尺と原点を決めてください");return 0}
 const mm=P.mmpp,W=st.bld.filter(o=>o.k==="wall"&&o.full!==false),D=st.bld.filter(o=>o.k==="door"),out=[],sill=BT.wy!=null?BT.wy:900,hw=BT.wh2!=null?BT.wh2:1200;
 const segW=(P.segs||[]).filter(s=>kzNeu(s[4])).map(s=>{const a=btWx([s[0],s[1]]),b=btWx([s[2],s[3]]);return{a,b}});
 for(let i=0;i<W.length;i++)for(let j=0;j<W.length;j++){if(i===j)continue;const p=W[i],q=W[j];if(Math.abs(((p.r-q.r)%180+180)%180)>2&&Math.abs(((p.r-q.r)%180+180)%180-180)>2)continue;
  const th=p.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th),loc=(x,z)=>[(x-p.x)*co+(z-p.z)*si,-(x-p.x)*si+(z-p.z)*co],lq=loc(q.x,q.z);if(Math.abs(lq[1])>60||Math.abs(p.d-q.d)>60)continue;
  /* p の右端と q の左端のあいだ（p より +x 側にある q だけ） */
  const e0=p.w/2,e1=lq[0]-q.w/2,gap=e1-e0;if(gap<400||gap>5000)continue;
  if(W.some(o=>{if(o===p||o===q)return false;const lo=loc(o.x,o.z);return Math.abs(lo[1])<60&&lo[0]+o.w/2>e0+50&&lo[0]-o.w/2<e1-50}))continue;   // 間に別の壁がある
  if(D.some(o=>{const lo=loc(o.x,o.z);return Math.abs(lo[1])<400&&lo[0]>e0-100&&lo[0]<e1+100}))continue;   // 扉の開口
  if(st.bld.some(o=>o.k==="win"&&(()=>{const lo=loc(o.x,o.z);return Math.abs(lo[1])<200&&lo[0]>e0&&lo[0]<e1})()))continue;
  /* 切れ目の中を通る、壁と平行な線（壁の厚みの中）が2本以上 */
  /* 同じ位置（5mm刻み）の線は足し合わせる（召し合わせで2本に分かれている窓など） */
  const half=Math.max(p.d,q.d)/2+40,acc={};segW.forEach(o=>{const A=loc(o.a[0],o.a[1]),B=loc(o.b[0],o.b[1]);if(Math.abs(A[1]-B[1])>15)return;const z=(A[1]+B[1])/2;if(Math.abs(z)>half)return;
   const lo=Math.max(Math.min(A[0],B[0]),e0),hi=Math.min(Math.max(A[0],B[0]),e1);if(hi-lo>20)(acc[Math.round(z/5)]=acc[Math.round(z/5)]||[]).push([lo,hi])});
  const cov=a=>{a.sort((x,y)=>x[0]-y[0]);let t=0,c=-1e9;a.forEach(([l,h])=>{if(h>c){t+=h-Math.max(l,c);c=h}});return t};
  if(Object.values(acc).filter(a=>cov(a)>=gap*0.7).length<2)continue;const pt=x=>[p.x+x*co,p.z+x*si];out.push(...kzWinPut(pt(e0),pt(e1),p.d,p.r,sill,hw))}
 if(out.length)btAdd(normBld(out));const n=out.filter(o=>o.k==="win").length;if(!quiet)toast(n?"🪟 窓を "+n+"か所 置きました（下端 FL+"+fmt(sill)+"・高さ "+fmt(hw)+"。高さは3Dか「窓を追加」で直せます）":"窓（壁の切れ目にガラスの線がある所）が見つかりませんでした。端と端を2点タップで置けます");return n}

/* ===== 🧱 軽量鉄骨（LGS）＋ボードの壁 =====
   図面：両側に、細い線が近く（15mm以内）に2本以上並ぶ束（ボードの重ね張り）があって、その間が40〜160mm空いている（スタッド）。
   → 外側の線から外側の線までを壁の厚み、間をスタッドの幅、束の線の数−1 をボードの枚数として置く。もう壁がある所には置かない */
/* 柱（H鋼・角柱）の近く？ c＝壁の中心（3Dの座標）、Lw＝壁の長さ */
function kzNearCol(c,Lw){return st.bld.some(o=>o.k==="col"&&Math.hypot(o.x-c[0],o.z-c[1])<Lw/2+Math.max(o.w,o.d)/2+1200)}
/* L字・コの字の角：軽量壁の端が、直角の軽量壁の面で止まっている時は、その壁の外の面まで伸ばして角を埋める */
function kzLgsCorners(W){const ax=o=>{const t=o.r*Math.PI/180;return[Math.cos(t),Math.sin(t)]};
 W.forEach(A=>{const[ux,uz]=ax(A);[-1,1].forEach(sg=>{const ex=A.x+sg*ux*A.w/2,ez=A.z+sg*uz*A.w/2;let best=0;
  W.forEach(B=>{if(B===A)return;let da=Math.abs(((A.r-B.r)%180+180)%180);da=Math.min(da,180-da);if(Math.abs(da-90)>5)return;const[bx,bz]=ax(B),dx=ex-B.x,dz=ez-B.z,lx=dx*bx+dz*bz,lz=-dx*bz+dz*bx;
   if(Math.abs(lx)>B.w/2+A.d/2+30)return;
   /* 端からBの中心線までの距離（Aの外向き）：Bの面の手前（〜面の少し先）で止まっている時だけ */
   const toC=-(dx*ux+dz*uz)*sg;if(toC<0||toC>B.d/2+60)return;const e=toC+B.d/2;if(e>best)best=e});
  if(best>0){A.x=Math.round(A.x+sg*ux*best/2);A.z=Math.round(A.z+sg*uz*best/2);A.w=Math.round(A.w+best)}})})}
function kzLgs(quiet){const P=PLAN;if(!P||!P.mmpp||!P.org){if(!quiet)toast("先に縮尺と原点を決めてください");return 0}
 const mm=P.mmpp,{H,V}=kzLines(),bx=kzPlanBox(),out=[],rpl=new Set();
 const cols=st.bld.filter(o=>o.k==="col"),inCol=c=>cols.some(o=>{const th=o.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th),dx=c[0]-o.x,dz=c[1]-o.z;return Math.abs(dx*co+dz*si)<o.w/2+5&&Math.abs(-dx*si+dz*co)<o.d/2+5});
 /* 1枚置く：e0〜e1＝壁の両面（図面の座標・線に直角の向き）、lo〜hi＝壁の範囲（線の向き）。置けたら true */
 /* 引き戸の所（戸板の線）は軽量壁にしない：戸の範囲を除いた所だけに置く */
 let SL=[];try{SL=kzFindSlides()}catch(e){}
 const put=(hz,e0,e1,lo,hi,gap,bl,br)=>{const m=(e0+e1)/2;let R=[[lo,hi]];
  SL.forEach(d=>{if(!d.hz!==!hz||Math.abs(d.c-m)*mm>(e1-e0)*mm/2+120)return;const a=d.lo-30/mm,b=d.hi+30/mm,N=[];R.forEach(([x,y])=>{if(b<=x||a>=y){N.push([x,y]);return}if(a>x)N.push([x,a]);if(b<y)N.push([b,y])});R=N});
  let ok=false;R.forEach(([x,y])=>{if(put1(hz,e0,e1,x,y,gap,bl,br))ok=true});return ok};
 const put1=(hz,e0,e1,lo,hi,gap,bl,br)=>{const ovl=(hi-lo)*mm;if(ovl<200)return false;const mid=(e0+e1)/2,Dw=(e1-e0)*mm;
  const p0=hz?[lo,mid]:[mid,lo],p1=hz?[hi,mid]:[mid,hi],pc=[(p0[0]+p1[0])/2,(p0[1]+p1[1])/2];if(bx&&(pc[0]<bx.x0||pc[0]>bx.x1||pc[1]<bx.y0||pc[1]>bx.y1))return false;
  const A2=btWx(p0),B2=btWx(p1),c=btWx(pc),Lw=Math.hypot(B2[0]-A2[0],B2[1]-A2[1]),r=normT(Math.round(Math.atan2(B2[1]-A2[1],B2[0]-A2[0])*180/Math.PI));
  /* H鋼・柱そのものの線（柱の中）は壁にしない */
  if(inCol(c))return false;
  /* 2本の線の間に文字（の枠）がかかる＝部屋名・天井高の枠（「WC CH=2400」など）なので壁にしない（配管の高さ「FL+2809」・寸法などの書き込みは除く） */
  if((P.texts||[]).some(t=>{const ts=String(t.s||"").trim();if(!ts||/^(FL|GL|[+\-±]?\d|φ|Φ|H-|C-|[A-Z]?\d+A\b)/i.test(ts))return false;const tx0=t.x,tx1=t.x+(t.w||0),ty0=t.y-(t.h||0),ty1=t.y,cu=hz?(tx0+tx1)/2:(ty0+ty1)/2,v0=hz?ty0:tx0,v1=hz?ty1:tx1;return cu>lo&&cu<hi&&v1>e0&&v0<e1}))return false;
  /* 短い軽量壁（50cm未満）は、H鋼・柱のまわり（柱の巻き）だけ読む */
  if(ovl<500&&!kzNearCol(c,Lw))return false;
  /* もう壁がある所：同じ所に重なる普通の壁は、図面のボードの線から読んだ軽量壁に置き換える。手で置いた軽量壁はそのまま */
  const ov=o=>{let da=Math.abs(((o.r-r)%180+180)%180);da=Math.min(da,180-da);if(da>5)return null;const th=r*Math.PI/180,co=Math.cos(th),si=Math.sin(th),dx=o.x-c[0],dz=o.z-c[1],lx=dx*co+dz*si,lz=-dx*si+dz*co;
   if(Math.abs(lz)>=(o.d+Dw)/2-15)return null;return Math.min(lx+o.w/2,Lw/2)-Math.max(lx-o.w/2,-Lw/2)};
  let skip=false;const rp=[];st.bld.forEach(o=>{if(o.k!=="wall"||o.auto==="lgs"||o.auto==="hlgs"||rpl.has(o))return;const v=ov(o);if(v===null||v<=100)return;
   if(o.m==="lgs"||v<0.5*o.w)skip=true;else rp.push(o)});
  if(skip)return false;
  if(out.some(o=>{const v=ov(o);return v!==null&&v>0.5*Math.min(o.w,Lw)}))return false;rp.forEach(o=>rpl.add(o));
  /* 高さは「天井まで」。天井高の範囲（WCなど）の中なら、3Dでその範囲の天井高で止まる */
  out.push({k:"wall",m:"lgs",auto:"lgs",x:Math.round(c[0]),z:Math.round(c[1]),w:Math.round(Lw),d:Math.round(Dw),r,y:0,full:true,h:2400,st:Math.round(gap/5)*5,bl:hz?bl:br,br:hz?br:bl});return true};   /* 3Dの左（bl）は、壁の向きの右回り90°側。縦の壁は図面の右側になるので入れ替える */
 /* lo〜hi のうち、同じ向き・同じ厚みの帯に置いた軽量壁（out）がまだ無い所 */
 const free=(hz,e0,e1,lo,hi)=>{const cv=[],m=(e0+e1)/2,hd=(e1-e0)/2;out.forEach(o=>{if((o.r%180===0)!==!!hz)return;const p=btP(o.x,o.z),al=hz?p[0]:p[1],pp=hz?p[1]:p[0];
   if(Math.abs(pp-m)>=o.d/2/mm+hd-15/mm)return;cv.push([al-o.w/2/mm-20/mm,al+o.w/2/mm+20/mm])});
  cv.sort((a,b)=>a[0]-b[0]);const R=[];let x=lo;cv.forEach(([a,b])=>{if(b<=x||a>=hi)return;if(a>x)R.push([x,a]);x=Math.max(x,b)});if(x<hi)R.push([x,hi]);return R.filter(([a,b])=>(b-a)*mm>=200)};
 [[H,1],[V,0]].forEach(([A,hz])=>{/* 柱（H鋼）を描いている線は壁の面にしない：線の真ん中が柱の中（＋15mm）にある線 */
  const onCol=l=>{const m=(l.lo+l.hi)/2,p=btWx(hz?[m,l.c]:[l.c,m]);return cols.some(o=>{const th=o.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th),dx=p[0]-o.x,dz=p[1]-o.z;return Math.abs(dx*co+dz*si)<o.w/2+15&&Math.abs(-dx*si+dz*co)<o.d/2+15})};
  /* 破線（通り芯・隠れ線）：同じ線の上に、短い線（60cm未満）が少しすき間（5〜120mm）をあけて続くもの → 壁の線にしない */
  const dash=new Set(),As=A.slice().sort((a,b)=>a.c-b.c||a.lo-b.lo);
  for(let i=0;i<As.length;i++)for(let j=i+1;j<As.length;j++){const a=As[i],b=As[j];if((b.c-a.c)*mm>1)break;const g=(b.lo>=a.hi?b.lo-a.hi:a.lo>=b.hi?a.lo-b.hi:-1)*mm;if(g>5&&g<120&&(a.hi-a.lo)*mm<600&&(b.hi-b.lo)*mm<600){dash.add(a);dash.add(b)}}
  const Ls=A.filter(l=>!dash.has(l)&&(l.hi-l.lo)*mm>=250&&!onCol(l)).sort((a,b)=>a.c-b.c),used=new Set(),inB=new Set(),B=[],EX=[];
  /* 束：近くに並ぶ平行な線（重なり60%以上）＝ボードの面（2本で1枚、3本で2枚貼り） */
  Ls.forEach((l,i)=>{if(used.has(i))return;const g=[l],gi=[i];used.add(i);for(let j=i+1;j<Ls.length;j++){const q=Ls[j];if((q.c-g[g.length-1].c)*mm>16)break;const ov=Math.min(q.hi,l.hi)-Math.max(q.lo,l.lo);if(ov>=0.6*Math.min(q.hi-q.lo,l.hi-l.lo)){g.push(q);gi.push(j);used.add(j)}}
   /* 同じ線の上で途中で切れている線（つなぎ目）は、1本の線にまとめる */
   const u=[];g.slice().sort((a,b)=>a.c-b.c||a.lo-b.lo).forEach(x=>{const q=u.find(y=>Math.abs(y.c-x.c)*mm<1&&x.lo<=y.hi+30/mm&&x.hi>=y.lo-30/mm);if(q){q.lo=Math.min(q.lo,x.lo);q.hi=Math.max(q.hi,x.hi)}else u.push({c:x.c,lo:x.lo,hi:x.hi})});
   if(u.length>=2){gi.forEach(k=>inB.add(k));const lo=Math.max(...u.map(x=>x.lo)),hi=Math.min(...u.map(x=>x.hi));B.push({c0:u[0].c,c1:u[u.length-1].c,n:u.length,lo,hi});
    /* 束の線のうち、束より先まで伸びている所（となりのボードが終わって、スタッドの面の線だけが続く所）は1本の線として使う */
    u.forEach(x=>{if((lo-x.lo)*mm>=200)EX.push({c:x.c,lo:x.lo,hi:lo});if((x.hi-hi)*mm>=200)EX.push({c:x.c,lo:hi,hi:x.hi})})}});
  B.sort((a,b)=>a.c0-b.c0);const usedB=new Map();
  /* ① 両面ボード：ボードの束と束の間（スタッド40〜160mm） */
  for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++){const a=B[i],b=B[j],gap=(b.c0-a.c1)*mm;if(gap<40)continue;if(gap>160)break;
   if(put(hz,a.c0,b.c1,Math.max(a.lo,b.lo),Math.min(a.hi,b.hi),gap,a.n-1,b.n-1)){usedB.set(i,1);usedB.set(j,-1);break}}
  /* ② 片面ボード（柱の巻き・壁のふかし）：ボードの束と、スタッドの面の線1本（間40〜110mm）。柱側・壁側にはボードが無い */
  const S1=Ls.filter((l,k)=>!inB.has(k)).concat(EX);
  /* 両面の壁に使ったボードの束も、線が長い時は別の所で片面の壁の面になる（相手の束と同じ側だけ見る） */
  B.forEach((a,i)=>{
   const cand=S1.map(l=>{const aft=l.c>a.c1,gap=(aft?l.c-a.c1:a.c0-l.c)*mm,lo=Math.max(a.lo,l.lo),hi=Math.min(a.hi,l.hi);return{l,aft,gap,lo,hi}}).filter(o=>o.gap>=40&&o.gap<=110&&(o.hi-o.lo)*mm>=200).sort((p,q)=>p.gap-q.gap);
   for(const o of cand){if(usedB.has(i)&&o.aft!==(usedB.get(i)>0))continue;const e0=o.aft?a.c0:o.l.c,e1=o.aft?o.l.c:a.c1;
    /* もう置いた軽量壁と重なる所は除いて、残りの所に置く（線が長く、となりの壁の下まで続いている時） */
    free(hz,e0,e1,o.lo,o.hi).forEach(([lo,hi])=>{put(hz,e0,e1,lo,hi,o.gap,o.aft?a.n-1:0,o.aft?0:a.n-1)})}})});
 /* 軽量壁のボードの面を、片側の面として使っている普通の壁（図面から読んだ壁）は間違い（ボードの線と、となりの別の壁の線の間を壁にしてしまったもの）→ 消す */
 let nx=0;const bad=o=>o.k==="wall"&&o.m!=="lgs"&&(!o.auto||o.auto==="w")&&out.some(L=>{let da=Math.abs(((o.r-L.r)%180+180)%180);da=Math.min(da,180-da);if(da>3)return false;
  const th=L.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th),dx=o.x-L.x,dz=o.z-L.z,lx=dx*co+dz*si,lz=Math.abs(-dx*si+dz*co);if(Math.abs(lz-(o.d+L.d)/2)>40)return false;
  const ov=Math.min(lx+o.w/2,L.w/2)-Math.max(lx-o.w/2,-L.w/2);if(ov<=0.5*o.w)return false;
  /* 反対側の面が「別の部屋の囲い」の時だけ：その面の線の両端から、軽量壁と反対向きに線が伸びている（部屋の角）。外壁の内側の軽量下地などは消さない */
  const sg=(-dx*si+dz*co)>0?1:-1,fx=o.x-sg*si*o.d/2,fz=o.z+sg*co*o.d/2,ox=Math.cos(o.r*Math.PI/180)*o.w/2,oz=Math.sin(o.r*Math.PI/180)*o.w/2,a=btP(fx-ox,fz-oz),b=btP(fx+ox,fz+oz);
  const hz=Math.abs(a[1]-b[1])<Math.abs(a[0]-b[0]),A=hz?H:V,c=hz?(a[1]+b[1])/2:(a[0]+b[0])/2,lo=Math.min(hz?a[0]:a[1],hz?b[0]:b[1]),hi=Math.max(hz?a[0]:a[1],hz?b[0]:b[1]);
  const F=A.filter(l=>Math.abs(l.c-c)*mm<=40&&Math.min(l.hi,hi)-Math.max(l.lo,lo)>=0.5*(hi-lo));if(F.length<2)return false;
  const Lp=btP(L.x,L.z),away=Math.sign(c-(hz?Lp[1]:Lp[0])),fc=F.reduce((t,l)=>t+l.c,0)/F.length,e0=Math.min(...F.map(l=>l.lo)),e1=Math.max(...F.map(l=>l.hi)),Pp=hz?V:H;
  const corner=e=>Pp.some(l=>Math.abs(l.c-e)*mm<=60&&(away>0?(Math.abs(l.lo-fc)*mm<=60&&(l.hi-fc)*mm>=300):(Math.abs(l.hi-fc)*mm<=60&&(fc-l.lo)*mm>=300)));
  return corner(e0)&&corner(e1)});
 kzLgsCorners(out);
 st.bld=st.bld.filter(o=>{if(o.auto==="lgs"||o.auto==="hlgs")return false;if(rpl.has(o)){nx++;return false}if(bad(o)){nx++;return false}return true});if(out.length)btAdd(normBld(out));else if(nx)bldChanged();
 if(!quiet)toast(out.length?"🧱 軽量鉄骨＋ボードの壁を "+out.length+"枚 置きました（"+out.map(o=>"厚"+fmt(o.d)+"・スタッド"+o.st).join("／")+"）"+(nx?"・軽量壁と重なる／となりの間違った壁を"+nx+"枚 消しました":""):"軽量鉄骨＋ボードの壁（両側にボードの線が並ぶ壁）が見つかりませんでした");return out.length}
