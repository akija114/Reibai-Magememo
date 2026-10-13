/* 冷媒配管の曲げ共有：sumi.js（🎯 機械の位置：通り芯から何mm ＝ 床の墨出し用）
   図面に置いた室内機・室外機（st.bld の ind / out）の「芯」と、室内機の「吊りボルト4本」を、
   近くのX通り芯・Y通り芯から何mmかで出す。
   ・タップ：機械をタップ → その機械だけ（寸法線を図面に出す）
   ・全部：置いてある機械を全部、一覧に
   ・通り芯は近い所を自動で選ぶ。「▶ 別の通り芯」で X2 / Y2 などに切り替えられる
   ・逃げ墨（返り墨）：通り芯から何mmずらして墨を打ったかを入れると、逃げ墨からの寸法になる
   ・通り芯が読めない図面では、原点（緑の十字）からの寸法を出す
   ・右・左・上・下は図面の向き */
const SM={sel:-1,g:{},bolt:true,nige:false};
/* 機械の一覧（室内機 → 室外機、図面の上から順） */
function smItems(){const P=PLAN;if(!P||!P.org||!P.mmpp)return[];
 const L=[];(st.bld||[]).forEach((o,i)=>{if(o.k!=="ind"&&o.k!=="out")return;const c=btP(o.x,o.z);L.push({i,o,c})});
 L.sort((a,b)=>a.o.k===b.o.k?(Math.round(a.c[1]*P.mmpp/500)-Math.round(b.c[1]*P.mmpp/500)||a.c[0]-b.c[0]):a.o.k==="ind"?-1:1);
 let ni=0,no=0;L.forEach(e=>{e.no=e.o.k==="ind"?"内"+(++ni):"外"+(++no)});
 L.forEach(e=>{e.bolts=smBolts(e.o)});return L}
/* 室内機の吊りボルト4本（図面の座標）。機種の吊りピッチ ba×bb が分かる時だけ */
function smBolts(o){if(o.k!=="ind"||!o.m||typeof CAS2M==="undefined")return null;const m=CAS2M[o.m];if(!m||!m.ba||!m.bb)return null;
 const r=(o.r||0)*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
 const B=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,w])=>{const lx=u*m.ba/2,lz=w*m.bb/2;return btP(o.x+lx*c-lz*s,o.z+lx*s+lz*c)});
 /* 図面の見た目で 左上・右上・右下・左下 の順に並べる */
 const cx=B.reduce((a,p)=>a+p[0],0)/4,cy=B.reduce((a,p)=>a+p[1],0)/4,nm=p=>(p[1]<cy?"上":"下")+(p[0]<cx?"左":"右");
 const ord={"上左":0,"上右":1,"下右":2,"下左":3};const R=B.map(p=>({p,n:nm(p)})).sort((a,b)=>ord[a.n]-ord[b.n]);
 R.forEach(b=>b.n=b.n[1]+b.n[0]);   // 「左上」の言い方に
 return{L:R,ba:m.ba,bb:m.bb}}
/* 使う通り芯（近い所。SM.g で切り替え） */
function smGrids(ax){const G=(PLAN.grids||[]).filter(g=>g.ax===ax);const ok=G.filter(g=>g.ok);return ok.length?ok:G}
function smPick(e,ax){const G=smGrids(ax);if(!G.length)return null;const k=(SM.g[e.i]||{})[ax],v=ax==="X"?e.c[0]:e.c[1];
 if(k!=null&&G[k])return G[k];return G.reduce((b,g)=>!b||Math.abs(g.v-v)<Math.abs(b.v-v)?g:b,null)}
const smNige=n=>{const P=PLAN;P.nige=P.nige||{};return P.nige[n]||{dir:MSUM[n[0]].dir,mm:MSUM[n[0]].mm}};
/* 1点（図面の座標）の、X・Y通り芯からの寸法 */
function smMeas(p,gx,gy){const P=PLAN,mm=P.mmpp,R={};
 if(gx){const d=(p[0]-gx.v)*mm,n=smNige(gx.n);R.x={g:gx.n,d,dn:n.mm?d-n.dir*n.mm:null,n}}else R.x={g:"原点",d:(p[0]-P.org[0])*mm,dn:null};
 if(gy){const d=(p[1]-gy.v)*mm,n=smNige(gy.n);R.y={g:gy.n,d,dn:n.mm?d-n.dir*n.mm:null,n}}else R.y={g:"原点",d:(p[1]-P.org[1])*mm,dn:null};
 return R}
const smFx=v=>(v>=0?"右へ ":"左へ ")+fmt(Math.round(Math.abs(v))),smFy=v=>(v>=0?"下へ ":"上へ ")+fmt(Math.round(Math.abs(v)));
function smOne(r,ax){const f=ax==="x"?smFx:smFy,q=r[ax];if(q.dn==null)return`${q.g}から ${f(q.d)}`;
 return`逃げ墨（${q.g} ${ax==="x"?(q.n.dir>0?"右":"左"):(q.n.dir>0?"下":"上")}${fmt(q.n.mm)}）から ${f(q.dn)}`}
function smName(o){if(o.k==="ind")return"室内機"+(o.m&&CAS2M[o.m]?" "+CAS2M[o.m].n:"");const m=typeof OUTM!=="undefined"&&OUTM[o.m];return"室外機"+(m?" "+m.n:"")}
function smCalc(e){const gx=smPick(e,"X"),gy=smPick(e,"Y");return{gx,gy,c:smMeas(e.c,gx,gy),b:e.bolts?e.bolts.L.map(b=>({n:b.n,p:b.p,m:smMeas(b.p,gx,gy)})):null}}
function smTxt(e){const R=smCalc(e);let t=`${e.no} ${smName(e.o)}\n　芯：${smOne(R.c,"x")}・${smOne(R.c,"y")}`;
 if(SM.bolt&&R.b)t+=`\n　吊りボルト（ピッチ ${fmt(e.bolts.ba)}×${fmt(e.bolts.bb)}）`+R.b.map(b=>`\n　　${b.n}：${smOne(b.m,"x")}・${smOne(b.m,"y")}`).join("");
 return t}
/* 吹き出しの中身 */
function smHTML(){const P=PLAN;if(!P||!P.org)return`<p style="color:#b91c1c">先に原点を決めてください。</p>`;
 const L=smItems();if(!L.length)return`<p>まだ室内機・室外機が置いてありません。</p><p style="font-size:14px"><b>図面の室内機（四角）の真ん中をタップ</b>すると、その場で室内機を置いて寸法を出します。</p><p style="font-size:12.5px;color:#475569">室外機は「🌀 室外機を追加」で置いてください。</p>`;
 const hasG=(P.grids||[]).length,show=SM.sel>=0?L.filter(e=>e.i===SM.sel):L;
 let h=`<p style="font-size:13.5px">床の墨出し用に、<b>機械の芯</b>と<b>吊りボルト</b>が<b>通り芯から何mm</b>かを出します。機械を<b>タップ</b>するとその機械だけ、図面に寸法線を出します。</p>`+(L.some(e=>e.o.k==="ind")?"":`<p style="font-size:13px;background:#fef9c3;border-radius:8px;padding:4px 8px">室内機がまだ置いてありません。<b>図面の室内機の真ん中をタップ</b>すると置いて寸法を出します。</p>`);
 if(!hasG)h+=`<p style="font-size:12.5px;color:#b45309">通り芯（X1・Y1など）が図面から読めなかったので、<b>原点（緑の十字）から</b>の寸法を出しています。</p>`;
 h+=`<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0">${SM.sel>=0?wzBtn("smAllB","📋 全部の機械を出す","#7c3aed","#fff","flex:1 1 100%"):""}${wzBtn("smBoltB",SM.bolt?"🔩 吊りボルト ON":"🔩 吊りボルト OFF",SM.bolt?"#ede9fe":"","#5b21b6","flex:1")}${hasG?wzBtn("smNigeB","↔ 逃げ墨","","","flex:1"):""}${wzBtn("smCopyB","📋 コピー","#0891b2","#fff","flex:1")}</div>`;
 if(SM.nige&&hasG)h+=`<div style="background:#f1f5f9;border-radius:10px;padding:6px 8px;margin-bottom:6px;font-size:12.5px;color:#334155">逃げ墨（返り墨）：通り芯から何mmずらして墨を打ったか（例：X1 右1000）。入れると、逃げ墨からの寸法になります。<br>`+
  (P.grids||[]).map(g=>{const n=smNige(g.n);return`<span style="display:inline-flex;align-items:center;gap:3px;margin:2px 6px 2px 0">${g.n}<select data-smg="${g.n}" data-k="dir" style="height:30px;border-radius:8px">${g.ax==="X"?`<option value="1"${n.dir>0?" selected":""}>右</option><option value="-1"${n.dir<0?" selected":""}>左</option>`:`<option value="1"${n.dir>0?" selected":""}>下</option><option value="-1"${n.dir<0?" selected":""}>上</option>`}</select><input data-smg="${g.n}" data-k="mm" inputmode="numeric" value="${n.mm?uVal(n.mm):""}" placeholder="0" style="width:58px;height:30px;border-radius:8px;border:1px solid #cbd5e1;padding:0 4px">mm</span>`}).join("")+`</div>`;
 show.forEach(e=>{const R=smCalc(e),GX=smGrids("X"),GY=smGrids("Y");
  const sw=(ax,g)=>{const G=ax==="X"?GX:GY;return G.length>1?` <button onclick="smSwap(${e.i},'${ax}')" style="height:28px;padding:0 8px;border-radius:8px;border:1.5px solid #cbd5e1;background:#fff;font-weight:800;font-size:12px">▶ 別の通り芯</button>`:""};
  const big=(r,ax)=>{const q=r[ax],f=ax==="x"?smFx:smFy;return q.dn==null?`${q.g}から <b style="font-size:17px">${f(q.d)}</b>`:`<span style="color:#64748b">${q.g}から ${f(q.d)}</span><br><b style="color:#0e7490">逃げ墨（${q.g} ${ax==="x"?(q.n.dir>0?"右":"左"):(q.n.dir>0?"下":"上")}${fmt(q.n.mm)}）から <span style="font-size:17px">${f(q.dn)}</span></b>`};
  h+=`<div style="border-top:1px solid #e2e8f0;padding:6px 0;font-size:13.5px"><b style="color:#dc2626">${e.no}</b> ${smName(e.o)}<br>
   <span style="color:#475569">芯 左右：</span>${big(R.c,"x")}${sw("X")}<br><span style="color:#475569">芯 上下：</span>${big(R.c,"y")}${sw("Y")}`;
  if(SM.bolt&&R.b)h+=`<div style="margin-top:4px;background:#f5f3ff;border-radius:8px;padding:4px 6px;font-size:12.5px"><b style="color:#6d28d9">🔩 吊りボルト</b>（ピッチ ${fmt(e.bolts.ba)}×${fmt(e.bolts.bb)}）<table style="width:100%;border-collapse:collapse">${R.b.map(b=>`<tr><td style="padding:2px 4px 2px 0;font-weight:800;white-space:nowrap">${b.n}</td><td style="padding:2px 4px">${smOne(b.m,"x")}</td><td style="padding:2px 0">${smOne(b.m,"y")}</td></tr>`).join("")}</table></div>`;
  else if(SM.bolt&&e.o.k==="ind")h+=`<div style="font-size:12px;color:#64748b">吊りボルト：機種が決まっていないので出せません（3Dで機種を選ぶと出ます）</div>`;
  h+=`</div>`});
 h+=`<p style="font-size:12px;color:#64748b;margin-top:4px">右・左・上・下は図面の向きです。図面の線から計算した目安なので、大事な所は図面の寸法でも確認してください。吊りボルトは登録してある機種の吊りピッチから出しています。</p>`;
 return h}
function smBind(){const on=(id,f)=>{const e=document.getElementById(id);if(e)e.onclick=f};
 on("smAllB",()=>{SM.sel=-1;wzRender();planDraw()});on("smBoltB",()=>{SM.bolt=!SM.bolt;wzRender();planDraw()});on("smNigeB",()=>{SM.nige=!SM.nige;wzRender()});on("smCopyB",smCopy);
 document.querySelectorAll("[data-smg]").forEach(el=>el.onchange=()=>{const P=PLAN,n=el.dataset.smg,o={...smNige(n)};if(el.dataset.k==="dir")o.dir=+el.value;else o.mm=Math.max(0,uParse(el.value)||0);P.nige[n]=o;wzRender();planDraw()})}
function smSwap(i,ax){const G=smGrids(ax);if(G.length<2)return;const e=smItems().find(z=>z.i===i);if(!e)return;const cur=smPick(e,ax),k=G.indexOf(cur);SM.g[i]=SM.g[i]||{};SM.g[i][ax]=(k+1)%G.length;wzRender();planDraw()}
function smCopy(){const L=smItems(),show=SM.sel>=0?L.filter(e=>e.i===SM.sel):L;if(!show.length){toast("機械が置いてありません");return}
 const t="機械の位置（通り芯から・墨出し用）\n"+show.map(smTxt).join("\n");try{navigator.clipboard.writeText(t).then(()=>toast("コピーしました"),()=>prompt("コピーしてください",t))}catch(e){prompt("コピーしてください",t)}}
/* タップ：いちばん近い機械を選ぶ */
function smTap(p){const P=PLAN;if(!P||!P.org){toast("先に原点を決めてください");return}
 const L=smItems();let best=null;const hi=bldHit(btWx(p));if(hi>=0)best=L.find(e=>e.i===hi)||null;
 if(!best){let bd=60/PV.z;L.forEach(e=>{const d=Math.hypot(e.c[0]-p[0],e.c[1]-p[1]);if(d<bd){bd=d;best=e}})}
 if(!best){const n=smPlace(p);if(n<0){toast("ここに室内機の四角が見つかりませんでした。室内機の真ん中をタップするか「❄️ 室内機を追加」で置いてください");planDraw();return}
  best=smItems().find(e=>e.i===n);if(!best){planDraw();return}}
 if(SM.sel===best.i){SM.sel=-1;W.fold=false}else{SM.sel=best.i;W.fold=true;smFocus(best)}wzRender();planDraw()}
/* 選んだ機械と通り芯が画面に入るように動かす */
function smFocus(e){const wr=document.getElementById("plWrap");if(!wr)return;const R=smCalc(e),P=PLAN,vx=R.gx?R.gx.v:P.org[0],vy=R.gy?R.gy.v:P.org[1];
 const x0=Math.min(vx,e.c[0]),x1=Math.max(vx,e.c[0]),y0=Math.min(vy,e.c[1]),y1=Math.max(vy,e.c[1]),W2=wr.clientWidth,H2=wr.clientHeight,pad=60/P.mmpp*10;
 const z=Math.min(W2*0.85/Math.max(x1-x0+pad,1),H2*0.55/Math.max(y1-y0+pad,1));if(PV.z>z*1.05||PV.z<z*0.4)PV.z=Math.max(0.05,Math.min(30,z));
 PV.ox=W2/2-(x0+x1)/2*PV.z;PV.oy=H2*0.62-(y0+y1)/2*PV.z}
/* 小さくした時の1行（選んだ機械の芯） */
function smMini(){if(SM.sel<0)return`<div style="font-size:13px;color:#475569">機械をタップすると、ここに寸法が出ます。</div>`;const e=smItems().find(z=>z.i===SM.sel);if(!e)return"";const R=smCalc(e);
 return`<div style="font-size:13.5px"><b style="color:#dc2626">${e.no}</b> ${smName(e.o)}<br>芯：<b style="font-size:16px">${smOne(R.c,"x")}</b>・<b style="font-size:16px">${smOne(R.c,"y")}</b></div>
 <div style="display:flex;gap:6px;margin-top:4px">${e.o.k==="ind"&&R.b?`<button onclick="W.fold=false;wzRender()" style="flex:1;height:38px;border-radius:10px;background:#ede9fe;color:#5b21b6;font-weight:800">🔩 吊りボルトも見る</button>`:""}<button onclick="SM.sel=-1;W.fold=false;wzRender();planDraw()" style="flex:1;height:38px;border-radius:10px;background:#e2e8f0;font-weight:800">📋 全部の機械</button></div>`}
/* 図面に描く：芯の十字・吊りボルトの点・通り芯からの寸法線 */
function smDraw(x,sp){if(!W.on||W.step!=="t:sumi"||!PLAN||!PLAN.org)return;const L=smItems();if(!L.length)return;
 const P=PLAN,one=(e,dim)=>{const R=smCalc(e),q=sp(e.c),col="#dc2626";
  if(SM.bolt&&R.b)R.b.forEach(b=>{const Q=sp(b.p);x.fillStyle="#7c3aed";x.beginPath();x.arc(Q[0],Q[1],5,0,7);x.fill();x.strokeStyle="#fff";x.lineWidth=1.5;x.stroke()});
  x.strokeStyle=col;x.lineWidth=2.5;x.beginPath();x.moveTo(q[0]-16,q[1]);x.lineTo(q[0]+16,q[1]);x.moveTo(q[0],q[1]-16);x.lineTo(q[0],q[1]+16);x.stroke();
  x.fillStyle=col;x.beginPath();x.arc(q[0]+16,q[1]-16,11,0,7);x.fill();x.fillStyle="#fff";x.font="bold 10px sans-serif";x.textAlign="center";x.textBaseline="middle";x.fillText(e.no,q[0]+16,q[1]-15.5);x.textBaseline="alphabetic";
  /* 寸法線（通り芯 → 芯） */
  if(dim){const LB=[],dl=(a,b,t,c2)=>{const A=sp(a),B=sp(b);x.save();x.strokeStyle=c2;x.lineWidth=2;x.setLineDash([]);x.beginPath();x.moveTo(A[0],A[1]);x.lineTo(B[0],B[1]);x.stroke();
    const hor=Math.abs(A[1]-B[1])<Math.abs(A[0]-B[0]),tk=7;x.lineWidth=3;x.beginPath();[A,B].forEach(Q=>{if(hor){x.moveTo(Q[0],Q[1]-tk);x.lineTo(Q[0],Q[1]+tk)}else{x.moveTo(Q[0]-tk,Q[1]);x.lineTo(Q[0]+tk,Q[1])}});x.stroke();
    x.restore();LB.push(()=>{x.save();const mx=(A[0]+B[0])/2,my=(A[1]+B[1])/2;x.font="bold 13px sans-serif";const w=x.measureText(t).width+8;x.fillStyle="rgba(255,255,255,.93)";x.fillRect(mx-w/2,my-9,w,18);x.strokeStyle=c2;x.lineWidth=1.5;x.strokeRect(mx-w/2,my-9,w,18);
    x.fillStyle=c2;x.textAlign="center";x.textBaseline="middle";x.fillText(t,mx,my+1);x.textBaseline="alphabetic";x.restore()})};
   const tx=r=>fmt(Math.round(Math.abs(r.dn!=null?r.dn:r.d))),base=(r,g,o)=>g?g.v+(r.dn!=null?r.n.dir*r.n.mm/P.mmpp:0):o,nm=(r,g)=>(g?g.n:"原点")+(r.dn!=null?"逃げ墨":"");
   const vx=base(R.c.x,R.gx,P.org[0]),vy=base(R.c.y,R.gy,P.org[1]);
   if(R.c.x.dn!=null){const A=sp([vx,e.c[1]-1500/P.mmpp]),B=sp([vx,e.c[1]+1500/P.mmpp]);x.save();x.strokeStyle="#0e7490";x.lineWidth=2;x.setLineDash([10,4,2,4]);x.beginPath();x.moveTo(A[0],A[1]);x.lineTo(B[0],B[1]);x.stroke();x.restore()}
   if(R.c.y.dn!=null){const A=sp([e.c[0]-1500/P.mmpp,vy]),B=sp([e.c[0]+1500/P.mmpp,vy]);x.save();x.strokeStyle="#0e7490";x.lineWidth=2;x.setLineDash([10,4,2,4]);x.beginPath();x.moveTo(A[0],A[1]);x.lineTo(B[0],B[1]);x.stroke();x.restore()}
   dl([vx,e.c[1]],e.c,nm(R.c.x,R.gx)+" "+tx(R.c.x),R.c.x.dn!=null?"#0e7490":"#7c3aed");dl([e.c[0],vy],e.c,nm(R.c.y,R.gy)+" "+tx(R.c.y),R.c.y.dn!=null?"#0e7490":"#7c3aed");LB.forEach(f=>f());
   if(SM.bolt&&R.b&&SM.sel===e.i){R.b.forEach(b=>{const Q=sp(b.p);x.save();x.font="bold 11px sans-serif";const t=b.n+" "+tx(b.m.x)+"・"+tx(b.m.y),w=x.measureText(t).width+6,ox=b.p[0]<e.c[0]?-w-8:8,oy=b.p[1]<e.c[1]?-14:6;
    x.fillStyle="rgba(245,243,255,.95)";x.fillRect(Q[0]+ox,Q[1]+oy,w,15);x.fillStyle="#5b21b6";x.textAlign="left";x.textBaseline="middle";x.fillText(t,Q[0]+ox+3,Q[1]+oy+8);x.restore()})}}
};
 L.forEach(e=>{if(SM.sel>=0&&e.i!==SM.sel)return;one(e,SM.sel>=0||L.length<=6)})}
/* まだ置いていない室内機：タップした所の四角（閉じた四角、無ければ上下・左右の平行な線の組）を探して、室内機を置く。置いた st.bld の番号を返す（無ければ -1） */
function smFindBox(p){const P=PLAN,mm=P.mmpp;if(!P.rects){try{planAnalyze()}catch(e){}}
 const ok=(w,h)=>w>=500&&h>=500&&w<=1900&&h<=1900;let b=null;
 (P.rects||[]).forEach(r=>{if(p[0]<r.x0||p[0]>r.x1||p[1]<r.y0||p[1]>r.y1)return;const w=(r.x1-r.x0)*mm,h=(r.y1-r.y0)*mm;if(!ok(w,h))return;if(!b||w*h<b.w*b.h)b={cx:(r.x0+r.x1)/2,cy:(r.y0+r.y1)/2,w,h}});
 if(b)return b;
 /* 角が欠けた記号（4方向カセットなど）：タップした所を上下・左右からはさむ、同じ色の平行な線 */
 const H=[],V=[];(P.segs||[]).forEach(s=>{const dx=Math.abs(s[2]-s[0]),dy=Math.abs(s[3]-s[1]);if(dy<0.6&&dx*mm>=200&&Math.min(s[0],s[2])<=p[0]&&Math.max(s[0],s[2])>=p[0])H.push({v:(s[1]+s[3])/2,c:s[4]});else if(dx<0.6&&dy*mm>=200&&Math.min(s[1],s[3])<=p[1]&&Math.max(s[1],s[3])>=p[1])V.push({v:(s[0]+s[2])/2,c:s[4]})});
 const pair=(A,t)=>{const R=[];A.filter(a=>a.v<t).forEach(a=>A.filter(c=>c.v>t&&c.c===a.c).forEach(c=>{const d=(c.v-a.v)*mm;if(d>=500&&d<=1900&&Math.abs((a.v+c.v)/2-t)*mm<d*0.3)R.push({a:a.v,b:c.v,d,c:a.c})}));return R};
 const PH=pair(H,p[1]),PV2=pair(V,p[0]);let best=null;
 PH.forEach(h=>PV2.forEach(v=>{if(h.c!==v.c)return;const sc=Math.abs(h.d-v.d)/Math.max(h.d,v.d)+(smModel(v.d,h.d)?0:0.5)+Math.max(h.d,v.d)/20000;if(!best||sc<best.sc)best={sc,cx:(v.a+v.b)/2,cy:(h.a+h.b)/2,w:v.d,h:h.d}}));
 return best}
/* 大きさから機種を探す（いま選んでいる機種が合えば、それを優先） */
function smModel(w,h){const near=(a,b)=>Math.abs(a-b)/b<0.07,hit=[];
 Object.keys(CAS2M).forEach(k=>{const m=CAS2M[k];(m.bi?[[m.L,m.W]]:[[m.pa,m.pb],[m.oa,m.ob],[m.L,m.W]]).forEach(([a,b])=>{if(((near(w,a)&&near(h,b))||(near(w,b)&&near(h,a)))&&!hit.includes(k))hit.push(k)})});
 if(!hit.length)return null;return typeof RP!=="undefined"&&hit.includes(RP.im)?RP.im:hit[0]}
function smPlace(p){const P=PLAN,b=smFindBox(p);if(!b)return -1;const q=btW([b.cx,b.cy]),k=smModel(b.w,b.h),o=bldNew("ind",{x:q[0],z:q[1]});
 if(k){const m=CAS2M[k],mx=m.bi?m.L>=m.W:m.pa>=m.pb;o.m=k;o.r=Math.abs(b.w-b.h)<40||mx===(b.w>=b.h)?0:90}else{o.m="";o.w=Math.round(b.w/10)*10;o.d=Math.round(b.h/10)*10}
 btAdd([normBld([o])[0]]);toast("室内機を置きました"+(k?"（"+CAS2M[k].n+"）":"（"+fmt(o.w)+"×"+fmt(o.d)+"）")+"。機種は3Dで変えられます");
 const q2=btP(o.x,o.z);let n=-1,bd=1e18;st.bld.forEach((z,i)=>{if(z.k!=="ind")return;const c=btP(z.x,z.z),d=Math.hypot(c[0]-q2[0],c[1]-q2[1]);if(d<bd){bd=d;n=i}});return n}
