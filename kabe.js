/* 冷媒配管の曲げ共有：kabe.js（📏 配管の位置：壁から何mm）
   CADのPDFの線から、配管（冷媒＝ピンク、ドレン＝オレンジの2本線）の芯が、壁の線から何mmの所を通っているかを出す。
   ・タップ：配管をタップした所で、両側（上下 or 左右）のいちばん近い壁の線までの寸法
   ・まとめて：図面の配管の直線（区間）ごとに、真ん中の所で同じように出して一覧にする
   ・壁の線は「グレー・黒の長い線」。仕上げ・LGS・躯体など何本も並ぶので、「▶ 別の線」で切り替えられる
   ・通り芯（X1・Y2 など）が読めていれば、通り芯からの寸法も出す
   ・上下左右は図面の向き。寸法は配管の芯（2本線の真ん中）まで */
const KB={res:[],all:null,key:""};
const kbNeu=c=>{if(!c||c.length<7)return true;const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);return Math.max(r,g,b)-Math.min(r,g,b)<24};
const kbK=()=>{const P=PLAN;return P?(P.fkey||"")+"|"+(P.page||1)+"|"+P.segs.length+"|"+P.mmpp:""};
/* 配管の芯：同じ色の平行な2本線の真ん中。継手で切れている所（30cm以内）はつなぐ */
function kbPipes(){const P=PLAN,mm=P.mmpp;if(P._kbP&&P._kbP.k===kbK())return P._kbP.v;const out=[];
 [["冷媒",c=>isMag(c)],["ドレン",c=>isOrg(c)]].forEach(([kind,test])=>{
  const L=P.segs.filter(s=>test(s[4])).map(s=>{const dx=s[2]-s[0],dy=s[3]-s[1],l=Math.hypot(dx,dy);return{s,l,h:Math.abs(dy)<=Math.max(1,l*0.03),v:Math.abs(dx)<=Math.max(1,l*0.03)}}).filter(o=>o.l*mm>=150&&(o.h||o.v));
  const used=new Set(),rg=o=>o.h?[Math.min(o.s[0],o.s[2]),Math.max(o.s[0],o.s[2])]:[Math.min(o.s[1],o.s[3]),Math.max(o.s[1],o.s[3])],cc=o=>o.h?(o.s[1]+o.s[3])/2:(o.s[0]+o.s[2])/2;
  L.sort((a,b)=>b.l-a.l).forEach((A,i)=>{if(used.has(i))return;used.add(i);const[a0,a1]=rg(A);let best=-1,bd=1e9;
   L.forEach((B,j)=>{if(used.has(j)||A.h!==B.h)return;const d=Math.abs(cc(B)-cc(A));if(d<0.5||d*mm>180)return;const[b0,b1]=rg(B);if(Math.min(a1,b1)-Math.max(a0,b0)<Math.min(a1-a0,b1-b0)*0.5)return;if(d<bd){bd=d;best=j}});
   if(best<0)return;   // 1本だけの線（太い枠線など）は配管とみなさない
   const B=L[best],[b0,b1]=rg(B);used.add(best);const c=(cc(A)+cc(B))/2,lo=Math.min(a0,b0),hi=Math.max(a1,b1);
   /* 同じ芯の上で重なる区間はまとめる */
   const dup=out.find(o=>o.kind===kind&&o.h===A.h&&Math.abs(o.c-c)*mm<15&&Math.min(o.hi,hi)-Math.max(o.lo,lo)>-300/mm);
   if(dup){dup.lo=Math.min(dup.lo,lo);dup.hi=Math.max(dup.hi,hi)}else out.push({kind,h:A.h,c,lo,hi})})});
 P._kbP={k:kbK(),v:out};return out}
/* 壁の候補：グレー・黒の、縦か横の長い線（引き出し線の下線＝文字のすぐ下の線は除く） */
function kbLines(){const P=PLAN,mm=P.mmpp;if(P._kbL&&P._kbL.k===kbK())return P._kbL.v;const out=[];
 const T=(P.texts||[]).filter(t=>t.s&&t.s.trim()&&t.w>0);
 P.segs.forEach(s=>{if(!kbNeu(s[4]))return;const dx=s[2]-s[0],dy=s[3]-s[1],l=Math.hypot(dx,dy);if(l*mm<500)return;const h=Math.abs(dy)<=l*0.01,v=Math.abs(dx)<=l*0.01;if(!h&&!v)return;
  const c=h?(s[1]+s[3])/2:(s[0]+s[2])/2,lo=h?Math.min(s[0],s[2]):Math.min(s[1],s[3]),hi=h?Math.max(s[0],s[2]):Math.max(s[1],s[3]);
  if(h&&T.some(t=>Math.abs(t.y-c)<t.h*0.7&&t.x>=lo-t.h&&t.x+t.w<=hi+t.h&&l<t.w*3))return;   // 文字の下線（引き出し線）
  out.push({h,c,lo,hi})});
 P._kbL={k:kbK(),v:out};return out}
/* 配管 m の、位置 t（配管に沿った座標）での両側の線の候補 */
function kbAt(m,t){const P=PLAN,mm=P.mmpp,L=kbLines(),sides={a:[],b:[]};
 L.forEach(l=>{if(l.h!==m.h||t<l.lo-1||t>l.hi+1)return;const d=l.c-m.c,dm=Math.abs(d)*mm;if(dm<20||dm>12000)return;(d<0?sides.a:sides.b).push({c:l.c,d:dm,lo:l.lo,hi:l.hi})});
 const fin=a=>{a.sort((x,y)=>x.d-y.d);const u=[];a.forEach(o=>{if(!u.length||o.d-u[u.length-1].d>=3)u.push(o)});
  u.forEach((o,i)=>{const n=u.find((q,j)=>j>i&&q.d-o.d>=40&&q.d-o.d<=350);o.wall=n?Math.round((n.d-o.d)/5)*5:0});
  const pick=Math.max(0,u.findIndex(o=>o.wall));return{L:u.slice(0,8),i:Math.min(pick,7)}};
 const r={m,t,a:fin(sides.a),b:fin(sides.b)};
 const G=(P.grids||[]).filter(g=>g.ok&&g.ax===(m.h?"Y":"X"));if(G.length){const g=G.reduce((b2,g2)=>!b2||Math.abs(g2.v-m.c)<Math.abs(b2.v-m.c)?g2:b2,null);r.g={n:g.n,d:(m.c-g.v)*mm}}
 return r}
const kbSide=(m,s)=>m.h?(s==="a"?"上":"下"):(s==="a"?"左":"右");
const kbDir=m=>m.h?"横":"縦";
function kbTxt(r,no){const m=r.m,f=s=>{const S=r[s];if(!S.L.length)return`${kbSide(m,s)}：線なし`;const o=S.L[S.i];return`${kbSide(m,s)}の${o.wall?"壁":"線"}から ${fmt(Math.round(o.d))}`};
 return`${no} ${m.kind}（${kbDir(m)}の管）　${f("a")}／${f("b")}`+(r.g?`／${r.g.n}から${m.h?(r.g.d>=0?"下へ":"上へ"):(r.g.d>=0?"右へ":"左へ")} ${fmt(Math.round(Math.abs(r.g.d)))}`:"")}
/* タップ：いちばん近い配管の上で測る */
function kbTap(p){const P=PLAN;if(!P||!P.mmpp){toast("先に縮尺を合わせてください");return}
 if(!P.segs||P.segs.length<50){toast("線のデータがある図面（CADのPDF）で使えます");planDraw();return}
 const M=kbPipes();let best=null,bd=28/PV.z;
 M.forEach(m=>{const t=Math.max(m.lo,Math.min(m.hi,m.h?p[0]:p[1])),q=m.h?[t,m.c]:[m.c,t],d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<bd){bd=d;best={m,t}}});
 if(!best){toast(M.length?"配管（ピンク・オレンジの2本線）の上をタップしてください":"この図面では、ピンク（冷媒）・オレンジ（ドレン）の配管が見つかりませんでした");planDraw();return}
 KB.res.push(kbAt(best.m,best.t));kbSync();wzRender();planDraw()}
/* まとめて：配管の区間ごとに、真ん中で測る */
function kbAll(){const P=PLAN;if(!P||!P.mmpp){toast("先に縮尺を合わせてください");return}
 if(KB.all){KB.all=null;kbSync();wzRender();planDraw();return}
 const M=kbPipes().filter(m=>(m.hi-m.lo)*P.mmpp>=300);if(!M.length){toast("この図面では、ピンク（冷媒）・オレンジ（ドレン）の配管が見つかりませんでした");return}
 M.sort((a,b)=>a.kind===b.kind?(a.h===b.h?a.c-b.c:a.h?-1:1):a.kind==="冷媒"?-1:1);
 KB.all=M.map(m=>kbAt(m,(m.lo+m.hi)/2));kbSync();wzRender();planDraw();toast("📋 配管の区間 "+KB.all.length+"か所を出しました")}
/* 別の線：吹き出しを小さくして、その寸法が見える所へ図面を動かし、選んでいる線を黄色で光らせる。小さい吹き出しの ◀ ▶ でも切り替えられる */
function kbNext(w,i,s,dir){const r=(w==="all"?KB.all:KB.res)[i];if(!r)return;const S=r[s];if(S.L.length<2)return;S.i=(S.i+(dir||1)+S.L.length)%S.L.length;KB.foc={w,i,s};W.fold=true;kbSync();kbFocus();wzRender();planDraw()}
function kbFocus(){const f=KB.foc;if(!f)return;const r=(f.w==="all"?KB.all:KB.res)||[];const R=r[f.i];if(!R)return;const m=R.m,o=R[f.s].L[R[f.s].i],p0=m.h?[R.t,m.c]:[m.c,R.t],p1=m.h?[R.t,o.c]:[o.c,R.t];
 const wr=document.getElementById("plWrap");if(!wr)return;const W2=wr.clientWidth,H2=wr.clientHeight,len=Math.hypot(p1[0]-p0[0],p1[1]-p0[1])||1;
 /* 寸法線が画面の半分くらいに見える拡大（今より小さくはしない程度に） */
 const want=Math.min(W2,H2*0.6)*0.55/len;if(PV.z<want*0.6||PV.z>want*3)PV.z=Math.max(0.05,Math.min(30,want));
 const cx=(p0[0]+p1[0])/2,cy=(p0[1]+p1[1])/2;PV.ox=W2/2-cx*PV.z;PV.oy=H2*0.6-cy*PV.z}
function kbMini(){const f=KB.foc;if(!f)return"";const R=((f.w==="all"?KB.all:KB.res)||[])[f.i];if(!R)return"";const S=R[f.s],o=S.L[S.i],no=f.w==="all"?(CIRC[f.i]||f.i+1):"T"+(f.i+1);
 return`<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><span style="flex:1 1 140px;font-size:13.5px"><b style="color:#7c3aed">${no}</b> ${R.m.kind}・${kbSide(R.m,f.s)}の${o.wall?"壁":"線"}から <b style="font-size:17px">${fmt(Math.round(o.d))}</b> <span style="color:#64748b">（${S.i+1}/${S.L.length}）</span></span>
  <button id="kbPrevB" style="height:40px;padding:0 12px;border-radius:10px;border:1.5px solid #cbd5e1;background:#fff;font-weight:800">◀ 前の線</button><button id="kbNextB" style="height:40px;padding:0 12px;border-radius:10px;border:1.5px solid #cbd5e1;background:#fff;font-weight:800">次の線 ▶</button><button id="kbOkB" style="height:40px;padding:0 12px;border-radius:10px;background:#16a34a;color:#fff;font-weight:800">✓ これにする</button></div>`}

function kbClear(){KB.res=[];KB.all=null;kbSync();wzRender();planDraw()}
function kbCopy(){const L=[...KB.res.map((r,i)=>kbTxt(r,"T"+(i+1))),...(KB.all||[]).map((r,i)=>kbTxt(r,CIRC[i]||String(i+1)))];if(!L.length){toast("まだ測っていません");return}
 const t="配管の位置（壁から・配管の芯まで）\n"+L.join("\n");try{navigator.clipboard.writeText(t).then(()=>toast("コピーしました"),()=>prompt("コピーしてください",t))}catch(e){prompt("コピーしてください",t)}}
function kbHTML(){if(KB.key!==kbK()){KB.res=[];KB.all=null;KB.key=kbK()}const P=PLAN,row=(r,i,w,no)=>{const m=r.m,sd=s=>{const S=r[s];if(!S.L.length)return`<span style="color:#94a3b8">${kbSide(m,s)}：線なし</span>`;const o=S.L[S.i];
   return`<span style="white-space:nowrap">${kbSide(m,s)}の${o.wall?`<b>壁</b>`:"線"}から <b style="font-size:16px">${fmt(Math.round(o.d))}</b></span>${S.L.length>1?` <button onclick="kbNext('${w}',${i},'${s}')" style="height:30px;padding:0 8px;border-radius:8px;border:1.5px solid #cbd5e1;background:#fff;font-weight:800;font-size:12px">▶ 別の線 ${S.i+1}/${S.L.length}</button>`:""}`};
  return`<div style="border-top:1px solid #e2e8f0;padding:6px 0;font-size:13.5px"><b style="color:${w==="all"?"#7c3aed":"#0f766e"}">${no}</b> ${m.kind}（${kbDir(m)}の管）<br>${sd("a")}<br>${sd("b")}${r.g?`<br><span style="color:#7c3aed">${r.g.n}から${m.h?(r.g.d>=0?"下へ":"上へ"):(r.g.d>=0?"右へ":"左へ")} ${fmt(Math.round(Math.abs(r.g.d)))}</span>`:""}</div>`};
 let h=`<p style="font-size:13.5px">配管（ピンク・オレンジ）を<b>タップ</b>すると、その所で両側の壁から<b>配管の芯</b>までの寸法を出します。「別の線」で仕上げ・LGS・躯体の線を切り替えられます。</p>
 <div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">${wzBtn("kbAllB",KB.all?"📋 一覧を消す":"📋 配管を全部まとめて出す","#7c3aed","#fff","flex:1 1 100%")}${wzBtn("kbCopyB","📋 コピー","#0891b2","#fff","flex:1")}${wzBtn("kbClrB","🧹 全部消す","","","flex:1")}</div>`;
 KB.res.forEach((r,i)=>h+=row(r,i,"res","T"+(i+1)));(KB.all||[]).forEach((r,i)=>h+=row(r,i,"all",CIRC[i]||String(i+1)));
 if(!KB.res.length&&!KB.all)h+=`<p style="font-size:12.5px;color:#64748b">「壁」＝その線の向こうに平行な線があって、壁の厚さ（40〜350mm）になっている所。図面の線から計算した目安なので、大事な所は図面の寸法でも確認してください。上下左右は図面の向きです。</p>`;
 return h}
function kbBind(){const on=(id,f)=>{const e=document.getElementById(id);if(e)e.onclick=f};on("kbAllB",kbAll);on("kbCopyB",kbCopy);on("kbClrB",kbClear);const F=KB.foc;
 on("kbPrevB",()=>F&&kbNext(F.w,F.i,F.s,-1));on("kbNextB",()=>F&&kbNext(F.w,F.i,F.s,1));on("kbOkB",()=>{KB.foc=null;W.fold=false;wzRender();planDraw()})}
function kbDraw(x,sp){if(!W.on||W.step!=="t:kabe"||!PLAN)return;
 {const f=KB.foc,R=f&&((f.w==="all"?KB.all:KB.res)||[])[f.i];if(R){const m=R.m,S=R[f.s];
  S.L.forEach((o,k)=>{const a=sp(m.h?[o.lo!=null?o.lo:R.t-200,o.c]:[o.c,o.lo!=null?o.lo:R.t-200]),b=sp(m.h?[o.hi!=null?o.hi:R.t+200,o.c]:[o.c,o.hi!=null?o.hi:R.t+200]);
   x.save();if(k===S.i){x.strokeStyle="rgba(250,204,21,.85)";x.lineWidth=9}else{x.strokeStyle="rgba(100,116,139,.55)";x.lineWidth=2;x.setLineDash([6,5])}x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.stroke();x.restore()})}}
 const one=(r,lab,col)=>{const m=r.m,p0=m.h?[r.t,m.c]:[m.c,r.t],q0=sp(p0);
  ["a","b"].forEach(s=>{const S=r[s];if(!S.L.length)return;const o=S.L[S.i],q1=sp(m.h?[r.t,o.c]:[o.c,r.t]);
   x.strokeStyle=col;x.lineWidth=2;x.beginPath();x.moveTo(q0[0],q0[1]);x.lineTo(q1[0],q1[1]);x.stroke();
   const tk=6;x.beginPath();if(m.h){x.moveTo(q1[0]-tk,q1[1]);x.lineTo(q1[0]+tk,q1[1])}else{x.moveTo(q1[0],q1[1]-tk);x.lineTo(q1[0],q1[1]+tk)}x.lineWidth=3;x.stroke();
   const t=fmt(Math.round(o.d)),mx=(q0[0]+q1[0])/2,my=(q0[1]+q1[1])/2;x.font="bold 13px sans-serif";const w=x.measureText(t).width+8;
   x.fillStyle="rgba(255,255,255,.92)";x.fillRect(mx-w/2,my-9,w,18);x.strokeStyle=col;x.lineWidth=1.5;x.strokeRect(mx-w/2,my-9,w,18);x.fillStyle=col;x.textAlign="center";x.textBaseline="middle";x.fillText(t,mx,my+1)});
  x.fillStyle=col;x.beginPath();x.arc(q0[0],q0[1],10,0,7);x.fill();x.fillStyle="#fff";x.font="bold 11px sans-serif";x.textAlign="center";x.textBaseline="middle";x.fillText(lab,q0[0],q0[1]+0.5);x.textBaseline="alphabetic"};
 (KB.all||[]).forEach((r,i)=>one(r,CIRC[i]||String(i+1),"#7c3aed"));KB.res.forEach((r,i)=>one(r,"T"+(i+1),"#0f766e"))}

/* 3Dに出す：測った寸法を st.kabe に保存（原点からのmm・図面の向き）。3D（曲げ共有・図面どちらでも）は core.js の addKabe3D が描く */
function kbSync(){const P=PLAN;if(!P||!P.org||!P.mmpp)return;const mm=P.mmpp,toM=q=>[Math.round((q[0]-P.org[0])*mm),Math.round((q[1]-P.org[1])*mm)],L=[];
 const one=(r,no)=>{const m=r.m;["a","b"].forEach(sd=>{const S=r[sd];if(!S.L.length)return;const o=S.L[S.i],p0=m.h?[r.t,m.c]:[m.c,r.t],p1=m.h?[r.t,o.c]:[o.c,r.t];
  L.push({k:m.kind,a:toM(p0),b:toM(p1),v:Math.round(o.d),w:o.wall?1:0,n:no})})};
 KB.res.forEach((r,i)=>one(r,"T"+(i+1)));(KB.all||[]).forEach((r,i)=>one(r,CIRC[i]||String(i+1)));
 const nw=kbWalls();st.kabe=L;if(nw){st.bldHide=false;bldChanged();toast("🧱 測った壁を3Dに "+nw+"枚 置きました（壁が無い所だけ）")}save();if(T){build3D();T.dirty=true}}
/* 測った線が3Dの壁に無い時は、その線を面にした壁を置く（3Dで「何も無い所から寸法」にならないように）。厚さは向こう側の平行な線まで、無ければ100mm。すでに壁がある所には置かない */
function kbWalls(){const P=PLAN;if(!P||!P.org||!P.mmpp||typeof btW!=="function")return 0;const mm=P.mmpp;let n=0;
 [...KB.res,...(KB.all||[])].forEach(r=>{const m=r.m;["a","b"].forEach(sd=>{const S=r[sd];if(!S.L.length)return;const o=S.L[S.i];if(o.lo==null)return;
  const t=Math.max(50,Math.min(400,o.wall||100)),sg=Math.sign(o.c-m.c)||1,cc=o.c+sg*(t/mm)/2,a=m.h?[o.lo,cc]:[cc,o.lo],b=m.h?[o.hi,cc]:[cc,o.hi],q=btW(m.h?[r.t,cc]:[cc,r.t]);
  const hit=bldHit(q);if(hit>=0&&st.bld[hit]&&st.bld[hit].k==="wall")return;
  const A=btWx(a),B=btWx(b),L=Math.hypot(B[0]-A[0],B[1]-A[1]);if(L<300)return;const w=bldNew("wall");
  Object.assign(w,{x:Math.round((A[0]+B[0])/2),z:Math.round((A[1]+B[1])/2),w:Math.round(L),d:Math.round(t),r:normT(Math.round(Math.atan2(B[1]-A[1],B[0]-A[0])*180/Math.PI))});st.bld.push(w);n++})});
 if(n)st.bld=normBld(st.bld);return n}
