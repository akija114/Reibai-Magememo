/* 冷媒配管の曲げ共有：drain.js（ドレン配管）
   ドレンは曲げずに継手でつなぐので、冷媒とは別に「区間（向き・長さ）」で入力する。
   ・材質：VP管 / ACドレン（保温付き。外径が1ランク大きい）
   ・下り勾配（1/100・1/50）で横引きの落差を出す。3Dも勾配を付けて描く
   ・継手（90°・45°エルボ、チーズ、ソケット、異径、掃除口）と吊りバンドの数を自動で数える
   ・3Dは冷媒と同じ空間に色分けで出す（VP＝グレー、AC＝水色）。始まりは室内機のドレン口 */
const DR_MAT={
 VP:{n:"VP管（硬質塩ビ）",s:"VP",col:0x9ca3af,od:{25:32,30:38,40:48,50:60},
  f:{e90:"DV-DL（90°エルボ）",e45:"DV-45L（45°エルボ）",tee:"DV-DT（チーズ）",rtee:"DV-DT 異径チーズ",sock:"DV-DS（ソケット）",red:"DV-INソケット（異径・インクリーザ）",co:"掃除口（CO）"}},
 AC:{n:"ACドレン（保温付き）",s:"AC",col:0x7dd3fc,od:{25:40,30:46,40:56,50:68},
  f:{e90:"AC用 90°エルボ",e45:"AC用 45°エルボ",tee:"AC用 チーズ",rtee:"AC用 異径チーズ",sock:"AC用 ソケット",red:"AC用 異径ソケット",co:"掃除口（CO）"}}};
const DR_SIZES=[25,30,40,50];
const DR_DIR={"前":[1,0,0],"右前":[1,0,1],"右":[0,0,1],"右後":[-1,0,1],"後":[-1,0,0],"左後":[-1,0,-1],"左":[0,0,-1],"左前":[1,0,-1],"上":[0,1,0],"下":[0,-1,0]};
const DR_ORDER=["前","右前","右","右後","後","左後","左","左前","上","下"];
function normDrain(d){d=d||{};const tr=d.tr||{};
 const sl=d.sl||{};
 return{v:2,du:Math.max(0,Math.round(+d.du||0)),up:Math.round(+d.up||0),sl:{h:Math.max(0,Math.round(+sl.h||0)),L:Math.max(0,Math.round(+sl.L||0)),p:Math.max(0,Math.round(+sl.p||0))},tr:{H:Math.max(0,Math.round(+tr.H||600)),W:Math.max(0,Math.round(+tr.W||600)),F:Math.max(0,Math.round(+tr.F||800)),R:Math.max(0,Math.round(+tr.R||1500)),S:Math.max(0,Math.round(+tr.S||150)),on:!!tr.on},mat:d.mat==="AC"?"AC":"VP",sz:DR_SIZES.includes(+d.sz)?+d.sz:25,slope:[50,100].includes(+d.slope)?+d.slope:100,span:[1000,1200,1500].includes(+d.span)?+d.span:1000,co:!!d.co,show:d.show!==false,
  rows:(Array.isArray(d.rows)?d.rows:[]).slice(0,40).map(r=>({l:Math.max(0,Math.round(+r.l||0)),a:[0,45,90].includes(+r.a)?+r.a:0,t:normT(r.t),j:["co","mg"].includes(r.j)?r.j:(r.tee?"mg":""),bsz:DR_SIZES.includes(+r.bsz)?+r.bsz:25,bl:Math.max(0,Math.round(+r.bl||600)),bs:["L","R","L45","R45"].includes(r.bs)?r.bs:"L",sz:DR_SIZES.includes(+r.sz)?+r.sz:0,tr:!!r.tr}))}}
const DRN=()=>{if(!st.drain||!st.drain._ok){st.drain=normDrain(st.drain);Object.defineProperty(st.drain,"_ok",{value:1})}return st.drain};   // 読み込んだデータは1回だけ整える（_okは保存されない）
/* 区間の並び（長さ・その先の曲げ角・向き）→ 3Dの点。向きは冷媒と同じ：配管の進む方を見て 上=0・右=90・下=180・左=270 */
function drPath(start,dir0){const V=THREE.Vector3,D=DRN();let d=dir0.clone().normalize(),u=Math.abs(d.y)>0.9?new V(-1,0,0):new V(0,1,0);u=u.sub(d.clone().multiplyScalar(u.dot(d))).normalize();let r=d.clone().cross(u).normalize();
 const pts=[start.clone()],dirs=[];let p=start.clone();
 D.rows.forEach((row,i)=>{dirs.push(d.clone());p=p.clone().addScaledVector(d,row.l);pts.push(p.clone());
  if(row.a&&i<D.rows.length-1){const a=row.a*Math.PI/180,t=row.t*Math.PI/180,b=u.clone().multiplyScalar(Math.cos(t)).addScaledVector(r,Math.sin(t)).normalize(),ax=d.clone().cross(b).normalize();
   d.applyAxisAngle(ax,a).normalize();u.applyAxisAngle(ax,a).normalize();r=d.clone().cross(u).normalize()}});
 /* 横の区間は勾配のぶん下げる（そこから先も全部下がる） */
 let drop=0;const out=[pts[0].clone()];for(let i=1;i<pts.length;i++){const dv=dirs[i-1];if(Math.abs(dv.y)<0.5)drop+=D.rows[i-1].l*Math.sqrt(1-dv.y*dv.y)/D.slope;const q=pts[i].clone();q.y-=drop;out.push(q)}
 return{pts:out,dirs}}
/* 鳥居（逆U）：口から少し横 → 立ち上げH → 頂点の横W → 落とし込み F → 接続先まで R */
function drTorii(){const D=DRN(),T0=D.tr,M=[[T0.S,90,0],[T0.H,90,180],[T0.W,90,180],[T0.F,90,0],[T0.R,0,0]];
 D.rows=M.map(([l,a,t])=>({l,a,t,j:"",bsz:25,bl:600,bs:"L",sz:0,tr:true}));D.tr.on=true}
const drVec=k=>{const a=DR_DIR[k];const l=Math.hypot(...a);return a.map(x=>x/l)};
const drVert=k=>k==="上"||k==="下";

/* 計算：長さ・落差・継手・吊りバンド */
/* ドレンアップの上限：機種の値（天井の仕上げ面から）。自分で入れた値があればそれを使う */
function drUnit(){const u=st.units||{};if(!u.on)return null;if(u.s==="cas2"&&CAS2M[u.ms])return{m:CAS2M[u.ms]};if(u.s==="cas")return{generic4:true};return null}
function drUpLimit(){const D=DRN(),U=drUnit(),bi=U&&U.m&&U.m.bi,ref=bi?"本体の下面":"天井の仕上げ面";
 if(D.du)return{lim:D.du,ref,src:"自分で入力"};
 if(U&&U.m&&U.m.du)return{lim:U.m.du,ref,src:U.m.n};
 if(U&&(U.generic4||(U.m&&U.m.kind==="4方向")))return{lim:850,ref,src:"4方向の目安"};
 return null}
/* 図面より太くする（例：図面VP30 → VP40）：始まり・径変更・合流の枝を全部1ランクずつ */
function drRank(n){const D=DRN(),mv=z=>DR_SIZES[Math.max(0,Math.min(DR_SIZES.length-1,DR_SIZES.indexOf(z)+n))];
 D.sz=mv(D.sz);D.rows.forEach(r=>{if(r.sz)r.sz=mv(r.sz);if(r.bsz)r.bsz=mv(r.bsz)});D.up+=n}
/* スリーブ穴から逆算（オートレベル）：出口の高さ＋横引き×勾配＝ドレン口に必要な高さ */
function drPortFL(){const D=DRN(),U=drUnit();if(D.sl.p)return{v:D.sl.p,auto:false};const ch=st.gnd&&st.gnd.ch;if(U&&U.m&&U.m.dr&&ch&&!U.m.bi)return{v:Math.round(ch+U.m.dr.y),auto:true};return null}
function drLevel(){const D=DRN();if(!D.sl.h)return null;const R=drCalc(),L=D.sl.L||R.hz,drop=L/D.slope,need=Math.round(D.sl.h+drop),P=drPortFL();
 return{L,auto:!D.sl.L,drop:Math.round(drop),need,port:P?P.v:null,pauto:P?P.auto:false,margin:P?P.v-need:null}}
/* 勾配が足りない時：鳥居で何mm立ち上げればよいか（頂点から出口まで勾配が取れる高さ） */
function drToriiFix(){const D=DRN(),Lv=drLevel();if(!Lv||Lv.margin==null||Lv.margin>=0)return null;const T0=D.tr,H=Math.max(100,Math.ceil((-Lv.margin+30)/10)*10),R=Math.max(300,Lv.L-T0.S-T0.W);
 const F=Math.max(0,Math.round(Lv.port+H-T0.W/D.slope-(D.sl.h+R/D.slope)));return{H,R,F}}
/* ドレンがいちばん高くなる所：仕上げ面から何mmか（ドレン口の高さ＋立ち上げ） */
function drRise(){const D=DRN(),U=drUnit(),y0=U&&U.m&&U.m.dr?U.m.dr.y:0;let mx=0;
 try{drPath(new THREE.Vector3(),new THREE.Vector3(1,0,0)).pts.forEach(p=>{if(p.y>mx)mx=p.y})}catch(e){}
 return{top:Math.round(y0+mx),y0,up:Math.round(mx)}}
function drCalc(){const D=DRN(),M=DR_MAT[D.mat],R={hz:0,vt:0,up:0,drop:0,fit:new Map(),sup:0,vsup:0,s200:0,nco:0,nmg:0,br:0,szEnd:D.sz,tr:D.tr.on&&D.rows.some(r=>r.tr)};
 const add=(k,n)=>{if(n>0)R.fit.set(k,(R.fit.get(k)||0)+n)};let sz=D.sz,fitN=0;
 let dirs=null;try{dirs=drPath(new THREE.Vector3(),new THREE.Vector3(1,0,0)).dirs}catch(e){dirs=D.rows.map(()=>({y:0}))}
 D.rows.forEach((r,i)=>{if(r.sz&&r.sz!==sz){add(`${M.f.red} ${M.s}${sz}→${M.s}${r.sz}`,1);sz=r.sz}
  /* 掃除口：チーズ＋45°（流れと逆向き＝上流側へ立ち上げ）＋キャップ＋チーズから200mmの支持 */
  if(r.j==="co"){add(`${M.f.tee} ${M.s}${sz}`,1);add(`${M.f.e45} ${M.s}${sz}（掃除口の立ち上げ）`,1);add(`掃除口キャップ ${M.s}${sz}`,1);R.s200++;R.nco++}
  /* 合流：ほかの室内機のドレンをチーズで割り込ませる（枝が細ければ異径チーズ）＋チーズから200mmの支持 */
  if(r.j==="mg"){const b=Math.min(r.bsz||sz,sz),y45=r.bs==="L45"||r.bs==="R45",yn=D.mat==="VP"?"DV-Y（45°Y）":"AC用 45°Y";
   add(y45?`${yn} ${M.s}${sz}${b<sz?"×"+b:""}`:(b<sz?`${M.f.rtee} ${M.s}${sz}×${b}`:`${M.f.tee} ${M.s}${sz}`),1);R.s200++;R.nmg++;R.br+=r.bl}
  add(`${M.f.sock} ${M.s}${sz}`,Math.max(0,Math.ceil(r.l/4000)-1));   // 定尺4mを超える所はソケットでつなぐ
  const dy=dirs[i]?dirs[i].y:0;
  if(Math.abs(dy)>0.7){R.vt+=r.l;if(dy>0)R.up+=r.l;R.vsup+=r.l>=1000?Math.ceil(r.l/1500):0}
  else{R.hz+=r.l;R.sup+=Math.max(0,Math.ceil(r.l/D.span)-1)}
  if(r.a&&i<D.rows.length-1){if(!(r.j==="co"&&r.a===90))add(`${r.a===45?M.f.e45:M.f.e90} ${M.s}${sz}`,1);fitN++}});   // 角の掃除口は、チーズが曲がりを兼ねる（エルボは要らない）
 R.sup+=fitN+(D.rows.length?1:0);   // 継手の近く（150mm以内）に1か所ずつ＋始まりに1か所
 if(R.tr){add("フレキシブルドレンホース（本体接続・ジャバラ）",1);add("鳥居の頂点の吊り金具セット（吊りボルト＋ハンガー＋断熱保護カバー）",1)}
 if(D.co)add(M.f.co,1);
 R.drop=R.hz/D.slope;R.szEnd=sz;R.tot=R.hz+R.vt;return R}
const drBand=(D,sz)=>D.mat==="AC"?`AC${sz}用（保温付き・外径約${DR_MAT.AC.od[sz]}mm）吊りバンド`:`VP${sz}用 吊りバンド`;

/* 3D：冷媒と同じ空間に描く（core.js の build3D から呼ばれる） */
function addDrain3D(UN,bb){T.drSegs=[];const D=st.drain?DRN():null;if(!D||!D.show||!D.rows.length||!T)return;
 const V=THREE.Vector3,u=(UN||[]).find(x=>x.t==="s"&&x.dr)||(UN||[]).find(x=>x.dr),S=u?u.dr.p.clone():new V(0,0,0);
 const d0=u?new V(u.dr.d.x,0,u.dr.d.z):new V(1,0,0);if(d0.lengthSq()<1e-6)d0.set(1,0,0);
 const PA=drPath(S,d0);let sz=D.sz;const pts=[{p:PA.pts[0],sz}];
 D.rows.forEach((r,i)=>{if(r.sz)sz=r.sz;pts.push({p:PA.pts[i+1],sz,l:r.l,vert:Math.abs(PA.dirs[i].y)>0.7})});
 pts.forEach(o=>bb.expandByPoint(o.p));
 const ext=Math.max(...bb.getSize(new V()).toArray(),300),g=new THREE.Group();g.userData.drain=1;T.grp.add(g);
 const mat=new THREE.MeshStandardMaterial({color:DR_MAT[D.mat].col,roughness:.6}),jm=new THREE.MeshStandardMaterial({color:D.mat==="AC"?0x0ea5e9:0x6b7280,roughness:.5}),Y=new V(0,1,0),selMat=new THREE.MeshStandardMaterial({color:0xfacc15,roughness:.5,emissive:0x3a2a00});
 const rad=s2=>(DR_MAT[D.mat].od[s2]||32)/2;   // 実際の外径どおり（VP25＝32、VP40＝48、ACは保温込み）。サイズごとに太さが変わる
 for(let i=0;i<pts.length-1;i++){const a=pts[i].p,b=pts[i+1].p,L=a.distanceTo(b);if(L<1)continue;const r=rad(pts[i+1].sz);
  (T.drSegs=T.drSegs||[]).push({a:a.clone(),b:b.clone(),r:(DR_MAT[D.mat].od[pts[i+1].sz]||32)/2,dr:1,i});
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,L,16),i===DR_SEL?selMat:mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(Y,b.clone().sub(a).normalize());g.add(m);
  const j=new THREE.Mesh(new THREE.SphereGeometry(r*1.18,14,10),jm);j.position.copy(b);g.add(j);
  try{const s=label("💧"+(i+1)+" "+fmt(pts[i+1].l)+(pts[i+1].vert?"":"（-"+fmt(pts[i+1].l/D.slope)+"）"),ext*0.028,"#e0f2fef2","#0c4a6e");s.position.copy(a).add(b).multiplyScalar(.5);s.userData.cat="drain";if(typeof pxl==="function")pxl(s,15);g.add(s)}catch(e){}}
 {const j=new THREE.Mesh(new THREE.SphereGeometry(rad(D.sz)*1.18,14,10),jm);j.position.copy(S);g.add(j)}
 /* 掃除口・合流（チーズ）と、チーズから200mmの支持 */
 {const pm=new THREE.MeshStandardMaterial({color:0x7c3aed}),cap=new THREE.MeshStandardMaterial({color:0xf97316}),up=new V(0,1,0),cyl=(a,b,r,m)=>{const L=a.distanceTo(b);if(L<1)return;const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,L,14),m);c.position.copy(a).add(b).multiplyScalar(.5);c.quaternion.setFromUnitVectors(Y,b.clone().sub(a).normalize());g.add(c)};
  let szc=D.sz;D.rows.forEach((r,i)=>{if(r.sz)szc=r.sz;if(!r.j)return;const P=PA.pts[i+1],d=PA.dirs[i].clone(),dh=new V(d.x,0,d.z);if(dh.lengthSq()<1e-6)return;dh.normalize();
   const nd=(PA.dirs[i+1]||PA.dirs[i]).clone(),ndh=new V(nd.x,0,nd.z).normalize(),R0=rad(szc),side=dh.clone().cross(up).normalize();
   /* チーズから200mm（流れの先）に支持 */
   const S2=P.clone().addScaledVector(ndh,200);S2.y-=200/D.slope;const rodL=Math.max(250,ext*0.05);
   cyl(S2,S2.clone().add(new V(0,rodL,0)),5,pm);   // 全ねじ（W3/8 くらいの太さ）const ring=new THREE.Mesh(new THREE.TorusGeometry(R0*1.5,R0*0.3,8,18),pm);ring.position.copy(S2);ring.lookAt(S2.clone().add(ndh));g.add(ring);
   const T2=new THREE.Mesh(new THREE.BoxGeometry(R0*2.3,R0*2.3,R0*2.3),jm);T2.position.copy(P);g.add(T2);   // チーズ
   if(r.j==="co"){/* 掃除口：チーズから、曲がった後の管（下流）をまっすぐ逆向きに短く出して、45°で斜め上へ立ち上げ、キャップ
       （曲がる方向・勾配と逆側。角でも直線でも、下流の管の延長線上の上流側） */
    const back=ndh.clone().negate(),M=P.clone().addScaledVector(back,Math.max(60,R0*2.5)),cd=back.clone().add(up).normalize(),E=M.clone().addScaledVector(cd,Math.max(120,R0*5));
    cyl(P,M,R0,mat);const el=new THREE.Mesh(new THREE.SphereGeometry(R0*1.15,12,8),jm);el.position.copy(M);g.add(el);cyl(M,E,R0,mat);   // チーズ→短管→45°エルボ→立ち上げ
    const c=new THREE.Mesh(new THREE.CylinderGeometry(R0*1.35,R0*1.35,R0*0.8,16),cap);c.position.copy(E);c.quaternion.setFromUnitVectors(Y,cd);g.add(c);
    try{const s2=label("🧹 掃除口（逆向き45°）・200mmで支持",ext*0.026,"#ffedd5f2","#9a3412");s2.position.copy(E);s2.userData.cat="drain";if(typeof pxl==="function")pxl(s2,14);g.add(s2)}catch(e){}}
   else{const sg=(r.bs==="R"||r.bs==="R45")?1:-1,y45=r.bs==="L45"||r.bs==="R45",bd=side.clone().multiplyScalar(sg);if(y45)bd.addScaledVector(dh,-1).normalize();   // 45°Yは上流側から斜めに入る
    const E=P.clone().addScaledVector(bd,r.bl);E.y+=r.bl/D.slope;cyl(P,E,rad(Math.min(r.bsz,szc)),mat);   // 枝も下り勾配（合流点がいちばん低い）
    const n=D.rows.slice(0,i+1).filter(x=>x.j==="mg").length+1;try{const s2=label("🔀 合流（系統"+n+"）"+DR_MAT[D.mat].s+Math.min(r.bsz,szc),ext*0.026,"#e0e7fff2","#3730a3");s2.position.copy(E);s2.userData.cat="drain";if(typeof pxl==="function")pxl(s2,14);g.add(s2)}catch(e){}}})}
 /* 鳥居：頂点の横の真ん中を上から吊る（吊りボルト）＋ 保温の範囲を半透明で */
 if(D.tr.on&&D.rows.length>=3&&D.rows[2].tr){const a=PA.pts[2],b=PA.pts[3],m=a.clone().add(b).multiplyScalar(.5),rodL=Math.max(300,ext*0.06);
  const rod=new THREE.Mesh(new THREE.CylinderGeometry(rad(D.sz)*0.35,rad(D.sz)*0.35,rodL,8),new THREE.MeshStandardMaterial({color:0x7c3aed}));rod.position.copy(m).add(new V(0,rodL/2,0));g.add(rod);
  const hg=new THREE.Mesh(new THREE.TorusGeometry(rad(D.sz)*1.6,rad(D.sz)*0.35,8,20),new THREE.MeshStandardMaterial({color:0x7c3aed}));hg.position.copy(m);hg.lookAt(b);g.add(hg);
  const ins=new THREE.MeshStandardMaterial({color:0xf8fafc,transparent:true,opacity:.35,depthWrite:false});
  for(let i=1;i<=3;i++){const p0=PA.pts[i],p1=PA.pts[i+1],L=p0.distanceTo(p1);if(L<1)continue;const c=new THREE.Mesh(new THREE.CylinderGeometry(rad(D.sz)*2,rad(D.sz)*2,L,16),ins);c.position.copy(p0).add(p1).multiplyScalar(.5);c.quaternion.setFromUnitVectors(Y,p1.clone().sub(p0).normalize());g.add(c)}
  try{const s=label("⛩ 頂点を吊る（"+fmt(D.tr.W)+"の真ん中）",ext*0.028,"#ede9fef2","#5b21b6");s.position.copy(m).add(new V(0,rodL,0));s.userData.cat="drain";if(typeof pxl==="function")pxl(s,15);g.add(s)}catch(e){}}
 const PF=drPortFL(),endFL=PF?Math.round(PF.v+(pts[pts.length-1].p.y-S.y)):null;
 try{const R=drCalc(),s=label("💧 ドレン "+DR_MAT[D.mat].s+D.sz+"　落差 "+fmt(R.drop)+"（1/"+D.slope+"）"+(endFL!=null?"　出口 FL+"+fmt(endFL)+(D.sl.h?"（スリーブ FL+"+fmt(D.sl.h)+(endFL>=D.sl.h-5?" ✅":" ⚠️スリーブより低い")+"）":""):""),ext*0.03,"#0c4a6ef2","#fff");s.position.copy(pts[pts.length-1].p);s.userData.cat="drain";if(typeof pxl==="function")pxl(s,16);g.add(s)}catch(e){}}

/* ===== 画面（曲げ共有のみ）：「🔧 冷媒｜💧 ドレン」の切り替え ===== */
if(typeof APP!=="undefined"&&APP==="bend")(function(){
 const css=document.createElement("style");css.textContent=`
#mtog{flex:none;display:flex;gap:4px;margin:0 0 6px;background:var(--card);border:1.5px solid var(--line);border-radius:12px;padding:3px}
#mtog button{flex:1;height:36px;border-radius:9px;font-weight:800;font-size:14px;color:var(--sub)}
#mtog button.on{background:var(--acc);color:#fff}
#drPanel{display:none;flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:4px 2px 12px}
body.drmode #legbar,body.drmode #rows,body.drmode .dock{display:none!important}
body.drmode #drPanel{display:block}
.drc{background:var(--card);border:1.5px solid var(--line);border-radius:14px;padding:10px 12px;margin-bottom:8px}
.drc h4{margin:0 0 6px;font-size:14px}
.drseg{display:flex;gap:6px;margin:4px 0 8px}.drseg button{flex:1;min-height:40px;border-radius:10px;border:1.5px solid var(--line);font-weight:800;font-size:13.5px;background:var(--card)}
.drseg button.on{background:var(--acc);color:#fff;border-color:var(--acc)}
.drnote{font-size:12.5px;line-height:1.55;background:#fff7ed;color:#9a3412;border-radius:10px;padding:8px 10px;margin:4px 0 8px}
.drrow{display:flex;gap:6px;align-items:center;padding:8px 0;border-top:1px solid var(--line);flex-wrap:wrap}
.drrow b{width:24px;text-align:center;color:var(--acc)}
.drrow.sel{background:#fef9c3;border-radius:12px;box-shadow:0 0 0 2px #facc15 inset;padding-left:6px;padding-right:6px}
.drdrop{font-size:12.5px;color:#0369a1;font-weight:800;white-space:nowrap}
.drrow select,.drrow input:not([type=range]),.drc select{height:42px;border-radius:10px;border:1.5px solid var(--line);background:var(--card);font-size:15px;font-weight:700;padding:0 6px;color:var(--ink)}
.drrow input:not([type=range]){width:96px;text-align:right}
.drrow button{height:40px;border-radius:10px;border:1.5px solid var(--line);padding:0 8px;font-weight:800;font-size:13px;background:var(--card)}
.drrow button.on{background:#0ea5e9;color:#fff;border-color:#0ea5e9}
.drsum td{padding:5px 2px;border-top:1px solid var(--line);font-size:14px;vertical-align:top}.drsum td:first-child{color:var(--sub);white-space:nowrap;width:1%;padding-right:8px}
.drsum b{font-size:16px}
.drbig{width:100%;min-height:48px;border-radius:12px;font-weight:800;font-size:15px;margin-top:6px}
#drSumOv{position:fixed;inset:0;z-index:80;background:#0f172a99;display:none;align-items:flex-end;justify-content:center}
#drSumOv.on{display:flex}
#drSumOv .sh{background:var(--card);color:var(--ink);width:100%;max-width:560px;max-height:88vh;overflow-y:auto;border-radius:18px 18px 0 0;padding:14px 14px calc(env(safe-area-inset-bottom,0px) + 16px)}`;
 document.head.appendChild(css);
 const tg=document.createElement("div");tg.id="mtog";tg.innerHTML='<button data-m="ref" class="on">🔧 冷媒</button><button data-m="dr">💧 ドレン</button><button data-m="sum">📋 まとめ</button>';
 $("#legbar").before(tg);
 const pn=document.createElement("div");pn.id="drPanel";$("#rows").after(pn);
 const ov=document.createElement("div");ov.id="drSumOv";ov.innerHTML='<div class="sh" id="drSumSh"></div>';document.body.appendChild(ov);
 ov.addEventListener("click",e=>{if(e.target===ov)ov.classList.remove("on")});
 tg.onclick=e=>{const b=e.target.closest("button");if(!b)return;const m=b.dataset.m;
  if(m==="sum"){drSumOpen();return}
  tg.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b));document.body.classList.toggle("drmode",m==="dr");
  if(m==="dr"){const D=DRN();if(!D.rows.length){D.rows=[{l:1000,a:0,t:0,j:"",sz:0}];D.show=true;save();drRedraw()}drRender()}
  try{setTimeout(sizeT,30)}catch(err){}};
 let rt=0;window.drRedraw=()=>{clearTimeout(rt);rt=setTimeout(()=>{if(T){build3D();T.dirty=true;drSum()}},120)};
 pn.addEventListener("input",e=>{const el=e.target,i=+el.dataset.i,k=el.dataset.k,D=DRN();
  if(k==="l"&&D.rows[i]){D.rows[i].l=Math.max(0,parseInt(String(el.value).replace(/[^0-9]/g,""))||0);save(true);drSum();drRedraw()}
  else if(k==="t"&&D.rows[i]){let v=+el.value;const m=Math.round(v/45)*45;if(Math.abs(v-m)<=6)v=m;el.value=v;D.rows[i].t=normT(v);const gv=el.closest(".gauge").querySelector(".gval");if(gv)gv.textContent=dirName(v);save(true);drRedraw()}
  else if(k==="bl"&&D.rows[i]){D.rows[i].bl=Math.max(0,parseInt(String(el.value).replace(/[^0-9]/g,""))||0);save(true);drSum();drRedraw()}
  else if(/^sl[hLp]$/.test(k)){D.sl[k.slice(2)]=Math.max(0,parseInt(String(el.value).replace(/[^0-9]/g,""))||0);save(true);drSum();drLvRender()}
  else if(k==="du"){D.du=Math.max(0,parseInt(String(el.value).replace(/[^0-9]/g,""))||0);save(true);drSum()}
  else if(/^tr[HWFRS]$/.test(k)){D.tr[k.slice(2)]=Math.max(0,parseInt(String(el.value).replace(/[^0-9]/g,""))||0);save(true)}
  else if(k==="rjg"&&st.rj&&typeof rjApply==="function"){st.rj.gap=Math.max(0,Math.min(300,parseInt(String(el.value).replace(/[^0-9]/g,""))||0));clearTimeout(window._rjT);window._rjT=setTimeout(()=>rjApply(),300)}});
 pn.addEventListener("change",e=>{const el=e.target,i=+el.dataset.i,k=el.dataset.k,D=DRN();
  if(k==="j"&&D.rows[i])D.rows[i].j=el.value;else if(k==="bsz"&&D.rows[i])D.rows[i].bsz=+el.value;else if(k==="bs"&&D.rows[i])D.rows[i].bs=el.value;else if(k==="sz"&&D.rows[i])D.rows[i].sz=+el.value;else if(k==="msz")D.sz=+el.value;else if(k==="rjf"&&st.rj&&typeof rjApply==="function"){st.rj.from=el.value==="auto"?"auto":+el.value;const J=rjApply();if(!J&&st.rj.mode!=="sep")toast("そこからは沿わせられません（図面で並んで走る区間の外です）");drRender();return}else if(k==="co")D.co=el.checked;else if(k==="show")D.show=el.checked;else return;
  save();drRender();drRedraw()});
 pn.addEventListener("pointerdown",e=>{const r=e.target.closest(".drrow");if(r&&+r.dataset.r!==DR_SEL){DR_SEL=+r.dataset.r;document.querySelectorAll(".drrow.sel").forEach(x=>x.classList.remove("sel"));r.classList.add("sel");drRedraw()}});
 pn.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const D=DRN(),i=+b.dataset.i,k=b.dataset.k;if(!k)return;
  if(k==="mat")D.mat=b.dataset.v;else if(k==="slope")D.slope=+b.dataset.v;else if(k==="span")D.span=+b.dataset.v;
  else if(k==="del"){D.rows.splice(i,1);if(!D.rows.some(r=>r.tr))D.tr.on=false}
  else if(k==="ang"){const A=[0,90,45];D.rows[i].a=A[(A.indexOf(D.rows[i].a)+1)%A.length]}
  else if(k==="add"){D.rows.push({l:1000,a:0,t:0,j:"",sz:0});const pv=D.rows[D.rows.length-2];if(pv&&!pv.a)pv.a=90}
  else if(k==="torii"){if(D.rows.length&&!D.rows.every(r=>r.tr)&&!confirm("今の区間を、鳥居の形に置きかえます。よろしいですか？"))return;drTorii();toast("⛩ 鳥居の形にしました。3Dで確認してください")}
  else if(k==="rk"){drRank(+b.dataset.v);toast(+b.dataset.v>0?"⬆ 全部1ランク上げました（始まり "+DR_MAT[D.mat].s+D.sz+"）":"⬇ 1ランク下げました")}
  else if(k==="lvfix"){const f=drToriiFix();if(!f)return;Object.assign(D.tr,{H:f.H,R:f.R,F:f.F});drTorii();toast("⛩ 立ち上げ "+f.H+"mm の鳥居にしました")}
  else if(k==="trOff"){D.tr.on=false;D.rows.forEach(r=>r.tr=false)}
  else if(k==="sum"){drSumOpen();return}
  else if(k==="rj"&&st.rj&&typeof rjApply==="function"){st.rj.mode=b.dataset.v;const J=rjApply();if(st.rj.mode!=="sep"&&!J)toast("図面では冷媒とドレンが並んで走る区間がないので、別ルートのままです");drRender();return}else return;
  save();drRender();drRedraw()});
})();
function drStartName(){const u=T&&T.UN&&(T.UN.find(x=>x.t==="s"&&x.dr)||T.UN.find(x=>x.dr));return u?"室内機のドレン口（"+u.name+"）":"配管の始まり（室内機の模型をONにすると、ドレン口から始まります）"}
function drRender(){const pn=$("#drPanel");if(!pn)return;const D=DRN(),M=DR_MAT[D.mat];
 const seg=(k,list,cur)=>`<div class="drseg">${list.map(([v,l])=>`<button data-k="${k}" data-v="${v}" class="${String(cur)===String(v)?"on":""}">${l}</button>`).join("")}</div>`;
 let h=`<div class="drc"><h4>💧 ドレン配管の設定</h4>
 <div style="font-size:13px;color:var(--sub)">材質</div>${seg("mat",[["VP","VP管"],["AC","ACドレン（保温付き）"]],D.mat)}
 <div class="drnote">💡 <b>サイズ感の注意</b>：ACドレンは保温層があるので、外径が同じ呼び径のVP管より1ランク大きくなります（例：AC25 は外径 約${DR_MAT.AC.od[25]}mm で、VP30〜35 くらいの太さ）。吊りバンドはAC用（保温付き外径用）を使ってください。VP用だと保温が潰れます。外径は目安なので、メーカーの値で確認してください。</div>
 <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label style="font-size:13px;color:var(--sub)">始まりのサイズ <select data-k="msz">${DR_SIZES.map(z=>`<option value="${z}"${z===D.sz?" selected":""}>${M.s}${z}（外径 約${M.od[z]}）</option>`).join("")}</select></label></div>
 <div style="font-size:13px;color:var(--sub);margin-top:8px">下り勾配</div>${seg("slope",[[100,"1/100（1mで10mm下げ）"],[50,"1/50（1mで20mm下げ）"]],D.slope)}
 <div style="font-size:13px;color:var(--sub)">吊りの間隔（横引き）</div>${seg("span",[[1000,"1.0m"],[1200,"1.2m"],[1500,"1.5m"]],D.span)}
 ${(()=>{const L=drUpLimit();return `<div style="font-size:13px;color:var(--sub);margin:4px 0 8px">ドレンアップ上限：<b style="color:var(--ink)">${L?L.ref+"から "+fmt(L.lim)+"mm（"+L.src+"）":"機種の値なし"}</b><br><label>自分で入れる（0＝機種の値）<input data-k="du" inputmode="numeric" value="${D.du||0}" style="width:90px;height:38px;border-radius:10px;border:1.5px solid var(--line);font-size:15px;font-weight:700;padding:0 8px;text-align:right;margin-left:6px">mm</label></div>`})()}
 <label style="display:flex;gap:8px;align-items:center;font-size:14px;font-weight:700"><input type="checkbox" data-k="show" ${D.show?"checked":""} style="width:22px;height:22px">3Dにドレンを表示</label></div>
 ${st.rj&&typeof rjApply==="function"?`<div class="drc"><h4>🔗 冷媒の通し方</h4>${seg("rj",[["sep","別ルート"],["tomo","とも巻き"],["rod","全ねじの上（横掴み）"]],st.rj.mode)}
 ${st.rj.mode==="rod"?`<label style="font-size:13px;color:var(--sub)">ドレンと冷媒の間 <input data-k="rjg" inputmode="numeric" value="${st.rj.gap}" style="width:80px;height:38px;border-radius:10px;border:1.5px solid var(--line);font-size:15px;font-weight:700;padding:0 8px;text-align:right">mm</label><div style="font-size:12px;color:var(--sub)">天井裏が狭い時は詰める・広い時は100mmなど</div>`:""}
 ${st.rj.mode!=="sep"?`<label style="display:block;font-size:13px;color:var(--sub);margin-top:6px">沿わせ始める所 <select data-k="rjf" style="height:38px;border-radius:10px;font-size:14px;font-weight:700">${[["auto","自動（ヤグラを降りた所から）"],...D.rows.slice(0,-1).map((r,i)=>[i,"💧"+(i+1)+" の後"+(r.a?"（"+r.a+"°の角）":"")])].map(([v,l])=>`<option value="${v}"${String(st.rj.from==null?"auto":st.rj.from)===String(v)?" selected":""}>${l}</option>`).join("")}</select></label>`:""}
 <div class="drnote">${st.rj.mode==="sep"?"冷媒は図面どおり、ドレンとは別のルートです。":st.rj.len?`冷媒をドレンの上に通しています（並んで走る区間 約${fmt(st.rj.len)}mm）。${st.rj.mode==="tomo"?"ドレンの上に載せて一緒に巻きます。":"ドレンの全ねじに横掴みバンドで付けます。"}分かれた所から先は図面どおり。`:"図面では、冷媒とドレンが並んで走る区間がありません（別の穴から出ています）。"}</div></div>`:""}
 <div class="drc"><h4>📐 サイズを図面より上げる</h4><div style="font-size:12.5px;color:var(--sub)">図面はVP30だけど40にしてほしい、という時に。始まり・径変更・合流の枝を全部まとめて変えます。</div>
 <div class="drseg"><button data-k="rk" data-v="1">⬆ 全部1ランク上げる</button><button data-k="rk" data-v="-1">⬇ 1ランク下げる</button></div>${D.up?`<div class="drnote" style="background:#eef2ff;color:#3730a3">図面より <b>${D.up>0?"+":""}${D.up}ランク</b>（今の始まり ${M.s}${D.sz}）</div>`:""}</div>
 <div class="drc"><h4>🕳 スリーブ穴から逆算（オートレベル）</h4><div style="font-size:12.5px;color:var(--sub);margin-bottom:6px">出口（外壁のスリーブ穴など）の高さから、勾配で上流へ上っていって、室内機のドレン口に必要な高さを出します。</div>
 <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;font-size:13px">${[["h","スリーブ穴の高さ FL+","0＝使わない"],["L","配管の長さ（横）","0＝区間から自動"],["p","ドレン口の高さ FL+","0＝機種と天井高から自動"]].map(([k,l,ph])=>`<label>${l}<br><input data-k="sl${k}" inputmode="numeric" value="${D.sl[k]}" style="width:100%;height:40px;border-radius:10px;border:1.5px solid var(--line);font-size:15px;font-weight:700;padding:0 8px;text-align:right"><small>${ph}</small></label>`).join("")}</div>
 <div id="drLvBox"></div></div>
 <div class="drc"><h4>⛩ 鳥居（ドレンアップ・梁越え）</h4>
 <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 10px;font-size:13px">${[["S","口から横へ"],["H","立ち上げ H"],["W","頂点の横 W"],["F","落とし込み"],["R","接続先まで"]].map(([k,l])=>`<label>${l}<br><input data-k="tr${k}" inputmode="numeric" value="${D.tr[k]}" style="width:100%;height:40px;border-radius:10px;border:1.5px solid var(--line);font-size:15px;font-weight:700;padding:0 8px;text-align:right">mm</label>`).join("")}</div>
 <button class="drbig" data-k="torii" style="background:#7c3aed;color:#fff">⛩ この寸法で鳥居を作る</button>${D.tr.on?`<button class="drbig" data-k="trOff" style="background:var(--bg)">鳥居の扱いをやめる（区間はそのまま）</button>`:""}</div>
 <div class="drc"><h4>区間（ドレン口から順に）</h4><div style="font-size:12.5px;color:var(--sub);margin-bottom:4px">始まり：${drStartName()}<br>曲げの向きは冷媒と同じで、配管の進む方を見て「上・右・下・左」をゲージで選びます。横の区間は勾配のぶん自動で下げて描きます。</div>`;
 let DP=null;try{DP=drPath(new THREE.Vector3(),new THREE.Vector3(1,0,0)).dirs}catch(e){}let cum=0;
 D.rows.forEach((r,i)=>{const last=i===D.rows.length-1,hz=!DP||!DP[i]||Math.abs(DP[i].y)<0.5,dr=hz?r.l/D.slope:0;cum+=dr;
  h+=`<div class="drrow${i===DR_SEL?" sel":""}" data-r="${i}"><b>${i+1}</b><input data-k="l" data-i="${i}" inputmode="numeric" value="${r.l}" aria-label="長さmm"><span style="font-size:13px">mm</span><span class="drdrop">${hz?`↘ −${fmt(dr)}（計 −${fmt(cum)}）`:(DP&&DP[i]&&DP[i].y>0?"⬆ 立ち上げ":"⬇ 立て")}</span>
  ${last?"":`<button data-k="ang" data-i="${i}" style="${r.a?"background:"+(r.a===90?"#dc2626":"#7c3aed")+";color:#fff;border-color:transparent":""}">${r.a?r.a+"°で曲げ":"直管"}</button>`}
  <select data-k="j" data-i="${i}" aria-label="先の継手"><option value="">継手なし</option><option value="co"${r.j==="co"?" selected":""}>🧹 掃除口（チーズ＋45°逆向き）</option><option value="mg"${r.j==="mg"?" selected":""}>🔀 合流（ほかの室内機）</option></select>
  ${r.j==="mg"?`<div style="flex:1 1 100%;display:flex;gap:6px;flex-wrap:wrap;align-items:center;background:#eef2ff;border-radius:10px;padding:6px 8px;font-size:13px">枝<select data-k="bsz" data-i="${i}">${DR_SIZES.map(z=>`<option value="${z}"${r.bsz===z?" selected":""}>${M.s}${z}</option>`).join("")}</select><input data-k="bl" data-i="${i}" inputmode="numeric" value="${r.bl}" style="width:80px" aria-label="枝の長さ">mm<select data-k="bs" data-i="${i}">${[["L","左から90°"],["R","右から90°"],["L45","左から45°（Y）"],["R45","右から45°（Y）"]].map(([v,l])=>`<option value="${v}"${r.bs===v?" selected":""}>${l}</option>`).join("")}</select></div>`:""}<select data-k="sz" data-i="${i}" aria-label="径を変える"><option value="0">径そのまま</option>${DR_SIZES.map(z=>`<option value="${z}"${r.sz===z?" selected":""}>ここから${M.s}${z}</option>`).join("")}</select><button data-k="del" data-i="${i}" aria-label="消す">🗑</button>
  ${r.a&&!last?`<div style="flex:1 1 100%">${gaugeHTML(r.t).replace('<input type="range"',`<input type="range" data-k="t" data-i="${i}"`)}</div>`:""}</div>`});
 h+=`<button class="drbig" data-k="add" style="background:var(--acc);color:#fff">➕ 区間を追加</button>
 <label style="display:flex;gap:8px;align-items:center;font-size:14px;font-weight:700;margin-top:10px"><input type="checkbox" data-k="co" ${D.co?"checked":""} style="width:22px;height:22px">最後に掃除口を付ける</label></div>
 <div class="drc" id="drSumBox"></div>
 <button class="drbig" data-k="sum" style="background:#0f766e;color:#fff">📋 冷媒＋ドレン まとめを見る</button>`;
 $("#drPanel").innerHTML=h;drSum();drLvRender()}
function drLvRender(){const b=$("#drLvBox");if(!b)return;const Lv=drLevel(),D=DRN();if(!Lv){b.innerHTML="";return}
 let h=`<table class="drsum" style="width:100%;border-collapse:collapse;margin-top:6px"><tr><td>落差</td><td><b>${fmt(Lv.drop)}</b> mm（${fmt(Lv.L)}${Lv.auto?"（区間の横引き）":""} × 1/${D.slope}）</td></tr>
 <tr><td>必要な高さ</td><td>ドレン口が <b>FL+${fmt(Lv.need)}</b> 以上</td></tr>
 <tr><td>ドレン口</td><td>${Lv.port!=null?`<b>FL+${fmt(Lv.port)}</b>${Lv.pauto?"（天井高＋機種のドレン口）":""}`:"分からない（ドレン口の高さを入れてください）"}</td></tr></table>`;
 if(Lv.margin!=null){if(Lv.margin>=0)h+=`<div class="drnote" style="background:#ecfdf5;color:#065f46">✅ 勾配OK：あと <b>${fmt(Lv.margin)}mm</b> 余裕があります</div>`;
  else{const f=drToriiFix(),L=drUpLimit(),U=drUnit(),y0=U&&U.m&&U.m.dr?U.m.dr.y:0,over=f&&L&&y0+f.H>L.lim;
   h+=`<div class="drnote" style="background:#fee2e2;color:#991b1b">⚠️ <b>勾配不足です！</b>室内機を <b>${fmt(-Lv.margin)}mm</b> 上げるか、鳥居（ドレンアップ）が必要です。</div>`;
   if(f)h+=`<button class="drbig" data-k="lvfix" style="background:#7c3aed;color:#fff">⛩ 鳥居で解決（立ち上げ ${fmt(f.H)}mm）</button>${over?`<div class="drnote">⚠️ 立ち上げ ${fmt(f.H)}mm だと、ドレンアップの上限（${L.ref}から${fmt(L.lim)}mm）を超えます。スリーブを下げるか、ルートを短くしてください。</div>`:""}`}}
 b.innerHTML=h}
function drSumHtml(){const D=DRN(),R=drCalc(),M=DR_MAT[D.mat];
 let fit=[...R.fit.entries()].map(([k,n])=>`${k} ×${n}`).join("<br>")||"なし";
 const trw=R.tr?`<div class="drnote" style="background:#f5f3ff;color:#4c1d95">⛩ <b>鳥居の注意</b><br>・<b>エア噛み</b>：頂点に空気が溜まると流れなくなります。頂点の横は短く、落とし込み側へ下り勾配を付けてください（機種によってはエア抜きが必要）。<br>・<b>結露</b>：立ち上げ〜頂点〜落とし込みは、専用の断熱カバー（または厚手の保温材）をすき間なく。3Dの白い所が保温の範囲です。<br>・<b>支持</b>：頂点が下がると勾配が狂います。頂点の真ん中を上から吊って、鳥居全体を支えてください（3Dの紫の吊り）。<br>・立ち上げ H ${fmt(D.tr.H)}mm が、室内機のドレンアップの上限以内か確認してください。</div>`:"";
 const Lv=drLevel(),lvw=Lv&&Lv.margin!=null?(Lv.margin>=0?`<div class="drnote" style="background:#ecfdf5;color:#065f46">🕳 スリーブ FL+${fmt(D.sl.h)} から逆算：ドレン口に必要 FL+${fmt(Lv.need)}／今 FL+${fmt(Lv.port)}（余裕 ${fmt(Lv.margin)}mm）</div>`:`<div class="drnote" style="background:#fee2e2;color:#991b1b">🕳 ⚠️ 勾配不足：スリーブ FL+${fmt(D.sl.h)} まで1/${D.slope}で流すには、ドレン口が FL+${fmt(Lv.need)} 必要（今 FL+${fmt(Lv.port)}、${fmt(-Lv.margin)}mm 足りない）</div>`):"";
 const sys=1+R.nmg,mgw=R.nmg?`<div class="drnote" style="background:#eef2ff;color:#3730a3">🔀 <b>合流（${sys}台ぶん）</b><br>・枝も1/${D.slope}以上の下り勾配で、合流点がいちばん低くなるように（逆勾配にしない）<br>・本管の横か上から入れる（下から入れない）。45°Yで流れに沿わせると流れやすい<br>・チーズから200mmの所で支持（荷重・たわみ防止）${sys>=3&&R.szEnd<30?`<br>・<b>3台以上をまとめる時は、合流の後をVP30以上にするのが目安</b>（「ここから30」で太くできます）`:""}<br>・合流の枝 合計 ${fmt(R.br)}mm</div>`:"";
 const cow=R.nco?`<div class="drnote" style="background:#ffedd5;color:#9a3412">🧹 <b>掃除口 ${R.nco}か所</b>：チーズから流れと逆向き（上流側）へ45°で立ち上げてキャップ。点検でキャップを外す時に負荷がかかるので、チーズから200mmの所で必ず支持。</div>`:"";
 const L=drUpLimit(),RS=drRise();
 const upTxt=RS.up>0?(L?(RS.top>L.lim?`<div class="drnote">⚠️ <b>ドレンアップの上限を超えています</b>：${L.ref}から <b>${fmt(RS.top)}</b>mm（ドレン口${fmt(RS.y0)}＋立ち上げ${fmt(RS.up)}）。上限は <b>${fmt(L.lim)}</b>mm（${L.src}）です。</div>`:`<div class="drnote" style="background:#ecfdf5;color:#065f46">✅ ドレンアップ：${L.ref}から ${fmt(RS.top)}mm（上限 ${fmt(L.lim)}mm 以内・${L.src}）</div>`):`<div class="drnote">ℹ️ 立ち上げ ${fmt(RS.up)}mm。この機種のドレンアップ上限が分からないので、下の「ドレンアップ上限」に入れるとチェックします。</div>`):"";
 const warn=upTxt;
 const cw=T&&T.ceilWarn,dmin=(T&&T.drSegs||[]).length&&ceilY()!=null?(()=>{let m=null;T.drSegs.forEach(d=>{const L=d.a.distanceTo(d.b);if(L<50||Math.abs(d.b.y-d.a.y)>L*0.3)return;const c=Math.round(Math.min(d.a.y,d.b.y)-d.r-ceilY());if(c<-40)return;if(m===null||c<m)m=c});return m})():null;
 const ceilTxt=dmin===null?"":dmin<CEIL_R?`<div class="drnote" style="background:#fee2e2;color:#991b1b">⛔ <b>高さ注意</b>：ドレンの下側が天井の仕上げから <b>${dmin}mm</b>。30mm未満はシングルバー・ダブルバーに当たります。70mm以上上げてください。</div>`:dmin<CEIL_Y?`<div class="drnote" style="background:#fef9c3;color:#854d0e">⚠️ <b>親バー注意</b>：ドレンの下側が天井の仕上げから <b>${dmin}mm</b>。70mm未満は、親バーの向きによっては当たります。</div>`:`<div class="drnote" style="background:#ecfdf5;color:#065f46">✅ 天井の仕上げから ${dmin}mm（70mm以上）</div>`;
 return `<h4>📏 計算</h4><table class="drsum" style="width:100%;border-collapse:collapse">
 <tr><td>材質</td><td>${D.up?`<span style="color:#3730a3;font-weight:800">図面より${D.up>0?"+":""}${D.up}ランク　</span>`:""}<b>${M.n}</b>　${M.s}${D.sz}${R.szEnd!==D.sz?" → "+M.s+R.szEnd:""}（外径 約${M.od[D.sz]}${R.szEnd!==D.sz?"→"+M.od[R.szEnd]:""}mm）</td></tr>
 <tr><td>直線の合計</td><td><b>${fmt(R.tot)}</b> mm（横引き ${fmt(R.hz)}・立て ${fmt(R.vt)}）</td></tr>
 <tr><td>必要な落差</td><td><b>${fmt(R.drop)}</b> mm（横引き ${fmt(R.hz)} × 1/${D.slope}）</td></tr>
 <tr><td>継手</td><td>${fit}</td></tr>
 <tr><td>吊り金具</td><td><b>${R.sup}</b> 個（${drBand(D,D.sz)}${R.szEnd!==D.sz?"／太い所は "+drBand(D,R.szEnd):""}）<br><small>横引き ${(D.span/1000).toFixed(1)}m おき＋継手の近く（150mm以内）に1か所ずつ</small>${R.s200?`<br>＋ <b>チーズから200mmの支持金具 ${R.s200} セット</b>（掃除口・合流の所）`:""}${R.vsup?`<br>立てバンド ${R.vsup} 個`:""}</td></tr>
 </table>${lvw}${ceilTxt}${mgw}${cow}${trw}${warn}<div style="font-size:12px;color:var(--sub);margin-top:6px">数は目安です。継手の品番・外径はメーカーで確認してください。ソケットは定尺4mを超える所の数です。</div>`}
function drSum(){const b=$("#drSumBox");if(b)b.innerHTML=drSumHtml()}
/* 📋 まとめ：冷媒とドレンを1つの画面で */
function drSumOpen(){const sh=$("#drSumSh");if(!sh)return;
 let h=`<div style="display:flex;align-items:center;justify-content:space-between"><h3 style="margin:0">📋 冷媒＋ドレン まとめ</h3><button id="drSumX" style="width:40px;height:40px;border-radius:20px;font-size:18px;background:var(--bg)">✕</button></div>`;
 h+=`<div class="drc" style="margin-top:10px"><h4>🔧 冷媒配管</h4>`;
 legIds().forEach(g=>{const c=calc(g),rows=legRows(g),bends=rows.filter(r=>r.a>0),by={};bends.forEach(r=>by[r.a]=(by[r.a]||0)+1);
  const ps=legPS(g);
  h+=`<div style="padding:6px 0;border-top:1px solid var(--line)"><b>${legName(g)}</b>　${SIZES[legSize(g)][0]}${SIZES[ps]?"／"+SIZES[ps][0]:""}<br>長さ <b>${fmt(c.tot)}</b> mm・曲げ <b>${bends.length}</b> か所${Object.keys(by).length?"（"+Object.keys(by).map(a=>a+"°×"+by[a]).join("・")+"）":""}
   <div style="font-size:13px;color:var(--sub);margin-top:2px">${rows.map((r,i)=>(i+1)+"："+fmt(r.l)+(r.a?"→"+r.a+"°":"")).join("　")}</div></div>`});
 h+=`</div>`;
 const D=DRN();h+=`<div class="drc">${D.rows.length?drSumHtml():"<h4>💧 ドレン配管</h4><div style='color:var(--sub)'>まだ入力されていません（「💧 ドレン」で入力）</div>"}</div>`;
 h+=`<div class="drc"><h4>3Dに表示</h4><div class="drseg"><button id="drSV1" class="${HID.size?"":"on"}">🔧 冷媒</button><button id="drSV2" class="${D.show?"on":""}">💧 ドレン</button></div></div>`;
 sh.innerHTML=h;$("#drSumOv").classList.add("on");
 $("#drSumX").onclick=()=>$("#drSumOv").classList.remove("on");
 $("#drSV1").onclick=()=>{setAllHid(!HID.size);drSumOpen()};
 $("#drSV2").onclick=()=>{D.show=!D.show;save();drRedraw&&drRedraw();drSumOpen()}}
/* ===== 3Dのドレンをタップ → その区間を選ぶ（冷媒と同じく黄色にして、下の欄をその区間に） ===== */
let DR_SEL=-1;
function drPick(cx,cy){if(!T||!T.drSegs||!T.drSegs.length||!T.w)return null;const cv=$("#cv"),r=cv.getBoundingClientRect(),px=cx-r.left,py=cy-r.top;T.cam.updateMatrixWorld();
 const sc=p=>{const v=p.clone().project(T.cam);return v.z>1?null:[(v.x*.5+.5)*T.w,(-v.y*.5+.5)*T.h]};let best=null,bd=1e9;
 T.drSegs.forEach(sg=>{const a=sc(sg.a),b=sc(sg.b);if(!a||!b)return;const dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy;let t=L2<1e-6?0:((px-a[0])*dx+(py-a[1])*dy)/L2;t=Math.max(0,Math.min(1,t));const d=Math.hypot(px-(a[0]+dx*t),py-(a[1]+dy*t));if(d<bd){bd=d;best=sg}});
 return best&&bd<=26?{i:best.i,d:bd}:null}
function drSelect(i,quiet){if(i===DR_SEL&&quiet)return;DR_SEL=i;if(i<0){if(T){build3D();T.dirty=true}return}
 if(typeof APP!=="undefined"&&APP==="bend"&&!document.body.classList.contains("drmode")){const b=document.querySelector('#mtog [data-m="dr"]');if(b)b.click()}
 if(T){build3D();T.dirty=true}
 if($("#drPanel")){drRender();const row=document.querySelector(`.drrow[data-r="${i}"]`);if(row){row.scrollIntoView({block:"center",behavior:"smooth"})}}
 if(!quiet)toast("💧 ドレン "+(i+1)+" を選びました")}
/* ===== 天井（仕上げ面）との離れのチェック：軽天の下地に当たらないか =====
   配管の下側が仕上げ面から 70mm未満＝黄色（親バーの向きによっては当たる）、30mm未満＝赤（シングル・ダブルバーに当たる） */
const CEIL_Y=70,CEIL_R=30;
function ceilY(){if(T&&T.cy!=null)return T.cy;const u=T&&T.UN&&T.UN.find(x=>x.c2);return u?u.c2.cy:null}
function ceilCheck3D(){if(!T||!T.grp||(typeof GUIDE!=="undefined"&&GUIDE))return;const CY=ceilY();T.ceilWarn={red:[],yel:[],min:null};if(CY==null)return;
 const V=THREE.Vector3,list=[];
 (T.segs||[]).forEach(sg=>{let od=12.7;try{od=SIZES[legSize(sg.g)][1]}catch(e){}list.push({a:sg.a,b:sg.b,r:od/2+10,k:"冷媒",g:sg.g,row:sg.row})});   // 冷媒は保温10mmぶん足す
 (T.drSegs||[]).forEach(d=>list.push({a:d.a,b:d.b,r:d.r,k:"ドレン"}));
 const ext=T.ext||3000,seen=new Set();
 list.forEach(o=>{const L=o.a.distanceTo(o.b);if(L<50)return;if(Math.abs(o.b.y-o.a.y)>L*0.3)return;   // 横に走る所だけ
  const low=Math.min(o.a.y,o.b.y)-o.r,c=Math.round(low-CY);if(c<-40)return;   // 天井より下（露出）は見ない
  if(T.ceilWarn.min===null||c<T.ceilWarn.min)T.ceilWarn.min=c;
  if(c>=CEIL_Y)return;const red=c<CEIL_R;(red?T.ceilWarn.red:T.ceilWarn.yel).push({k:o.k,c,row:o.row,g:o.g});
  const m=o.a.clone().add(o.b).multiplyScalar(.5),key=Math.round(m.x/200)+","+Math.round(m.z/200);if(seen.has(key))return;seen.add(key);
  const sl=new THREE.Mesh(new THREE.CylinderGeometry(Math.max(o.r*1.8,ext*0.008),Math.max(o.r*1.8,ext*0.008),L,16),new THREE.MeshBasicMaterial({color:red?0xef4444:0xfacc15,transparent:true,opacity:.45,depthWrite:false}));
  sl.position.copy(m);sl.quaternion.setFromUnitVectors(new V(0,1,0),o.b.clone().sub(o.a).normalize());T.grp.add(sl);
  try{const t=(red?"⛔ 高さ注意 ":"⚠️ 親バー注意 ")+o.k+"：天井から"+c+"mm",s2=label(t,ext*0.028,red?"#fee2e2f2":"#fef9c3f2",red?"#b91c1c":"#854d0e");s2.position.copy(m);s2.userData.cat="hit";if(typeof pxl==="function")pxl(s2,15,{t:"up"},0);T.grp.add(s2)}catch(e){}});
 const sig=T.ceilWarn.red.length+"/"+T.ceilWarn.yel.length;
 if(sig!==ceilCheck3D.sig&&(T.ceilWarn.red.length||T.ceilWarn.yel.length))setTimeout(()=>toast(T.ceilWarn.red.length?"⛔ 天井の仕上げから30mm未満の配管があります（シングル・ダブルバーに当たります）":"⚠️ 天井の仕上げから70mm未満の配管があります（親バーの向きによっては当たります）"),350);
 ceilCheck3D.sig=sig}
(function(){const orig=build3D;build3D=function(){const r=orig.apply(this,arguments);try{ceilCheck3D()}catch(e){console.warn("ceil",e)}return r}})();
/* 読み込み終わったら、ドレンも3Dに出す */
if(T){try{build3D();T.dirty=true}catch(e){}}
