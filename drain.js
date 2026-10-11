/* 冷媒配管の曲げ共有：drain.js（ドレン配管）
   ドレンは曲げずに継手でつなぐので、冷媒とは別に「区間（向き・長さ）」で入力する。
   ・材質：VP管 / ACドレン（保温付き。外径が1ランク大きい）
   ・下り勾配（1/100・1/50）で横引きの落差を出す。3Dも勾配を付けて描く
   ・継手（90°・45°エルボ、チーズ、ソケット、異径、掃除口）と吊りバンドの数を自動で数える
   ・3Dは冷媒と同じ空間に色分けで出す（VP＝グレー、AC＝水色）。始まりは室内機のドレン口 */
const DR_MAT={
 VP:{n:"VP管（硬質塩ビ）",s:"VP",col:0x9ca3af,od:{25:32,30:38,40:48,50:60},
  f:{e90:"DV-DL（90°エルボ）",e45:"DV-45L（45°エルボ）",tee:"DV-DT（チーズ）",sock:"DV-DS（ソケット）",red:"DV-INソケット（異径・インクリーザ）",co:"掃除口（CO）"}},
 AC:{n:"ACドレン（保温付き）",s:"AC",col:0x7dd3fc,od:{25:40,30:46,40:56,50:68},
  f:{e90:"AC用 90°エルボ",e45:"AC用 45°エルボ",tee:"AC用 チーズ",sock:"AC用 ソケット",red:"AC用 異径ソケット",co:"掃除口（CO）"}}};
const DR_SIZES=[25,30,40,50];
const DR_DIR={"前":[1,0,0],"右前":[1,0,1],"右":[0,0,1],"右後":[-1,0,1],"後":[-1,0,0],"左後":[-1,0,-1],"左":[0,0,-1],"左前":[1,0,-1],"上":[0,1,0],"下":[0,-1,0]};
const DR_ORDER=["前","右前","右","右後","後","左後","左","左前","上","下"];
function normDrain(d){d=d||{};
 return{v:1,mat:d.mat==="AC"?"AC":"VP",sz:DR_SIZES.includes(+d.sz)?+d.sz:25,slope:[50,100].includes(+d.slope)?+d.slope:100,span:[1000,1200,1500].includes(+d.span)?+d.span:1000,co:!!d.co,show:d.show!==false,
  rows:(Array.isArray(d.rows)?d.rows:[]).slice(0,40).map(r=>({d:DR_DIR[r.d]?r.d:"前",l:Math.max(0,Math.round(+r.l||0)),tee:!!r.tee,sz:DR_SIZES.includes(+r.sz)?+r.sz:0}))}}
const DRN=()=>{if(!st.drain||st.drain.v!==1)st.drain=normDrain(st.drain);return st.drain};
const drVec=k=>{const a=DR_DIR[k];const l=Math.hypot(...a);return a.map(x=>x/l)};
const drVert=k=>k==="上"||k==="下";

/* 計算：長さ・落差・継手・吊りバンド */
function drCalc(){const D=DRN(),M=DR_MAT[D.mat],R={hz:0,vt:0,up:0,drop:0,fit:new Map(),sup:0,vsup:0,segs:[],szEnd:D.sz};
 const add=(k,n)=>{if(n>0)R.fit.set(k,(R.fit.get(k)||0)+n)};let sz=D.sz,prev=null,fitN=0;
 D.rows.forEach((r,i)=>{const v=drVec(r.d),vert=drVert(r.d);
  if(r.sz&&r.sz!==sz){add(`${M.f.red} ${M.s}${sz}→${M.s}${r.sz}`,1);sz=r.sz}
  if(prev){const c=Math.max(-1,Math.min(1,prev[0]*v[0]+prev[1]*v[1]+prev[2]*v[2])),a=Math.round(Math.acos(c)*180/Math.PI);
   if(a>=30&&a<=60){add(`${M.f.e45} ${M.s}${sz}`,1);fitN++}else if(a>60&&a<=120){add(`${M.f.e90} ${M.s}${sz}`,1);fitN++}
   else if(a>120&&a<170){add(`${M.f.e90} ${M.s}${sz}`,1);add(`${M.f.e45} ${M.s}${sz}`,1);fitN+=2}else if(a>=170){add(`${M.f.e90} ${M.s}${sz}`,2);fitN+=2}}
  if(r.tee){add(`${M.f.tee} ${M.s}${sz}`,1);fitN++}
  add(`${M.f.sock} ${M.s}${sz}`,Math.max(0,Math.ceil(r.l/4000)-1));   // 定尺4mを超える所はソケットでつなぐ
  if(vert){R.vt+=r.l;if(r.d==="上")R.up+=r.l;R.vsup+=r.l>=1000?Math.ceil(r.l/1500):0}
  else{R.hz+=r.l;R.sup+=Math.max(0,Math.ceil(r.l/D.span)-1)}
  R.segs.push({...r,sz,drop:vert?0:r.l/D.slope});prev=v});
 R.sup+=fitN+(D.rows.length?1:0);   // 継手の近く（150mm以内）に1か所ずつ＋始まりに1か所
 if(D.co)add(M.f.co,1);
 R.drop=R.hz/D.slope;R.szEnd=sz;R.tot=R.hz+R.vt;return R}
const drBand=(D,sz)=>D.mat==="AC"?`AC${sz}用（保温付き・外径約${DR_MAT.AC.od[sz]}mm）吊りバンド`:`VP${sz}用 吊りバンド`;

/* 3D：冷媒と同じ空間に描く（core.js の build3D から呼ばれる） */
function addDrain3D(UN,bb){const D=st.drain?DRN():null;if(!D||!D.show||!D.rows.length||!T)return;
 const V=THREE.Vector3,u=(UN||[]).find(x=>x.t==="s"&&x.dr)||(UN||[]).find(x=>x.dr),S=u?u.dr.p.clone():new V(0,0,0);
 let p=S.clone(),sz=D.sz;const pts=[{p:p.clone(),sz}];
 D.rows.forEach(r=>{if(r.sz)sz=r.sz;const v=new V(...drVec(r.d)),q=p.clone().addScaledVector(v,r.l);if(!drVert(r.d))q.y-=r.l/D.slope;pts.push({p:q.clone(),sz,l:r.l,d:r.d});p=q});
 pts.forEach(o=>bb.expandByPoint(o.p));
 const ext=Math.max(...bb.getSize(new V()).toArray(),300),g=new THREE.Group();g.userData.drain=1;T.grp.add(g);
 const mat=new THREE.MeshStandardMaterial({color:DR_MAT[D.mat].col,roughness:.6}),jm=new THREE.MeshStandardMaterial({color:D.mat==="AC"?0x0ea5e9:0x6b7280,roughness:.5}),Y=new V(0,1,0);
 const rad=s2=>{const od=DR_MAT[D.mat].od[s2]||32;return Math.min(od/2*3,Math.max(od/2,ext*0.006))};
 for(let i=0;i<pts.length-1;i++){const a=pts[i].p,b=pts[i+1].p,L=a.distanceTo(b);if(L<1)continue;const r=rad(pts[i+1].sz);
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,L,16),mat);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(Y,b.clone().sub(a).normalize());g.add(m);
  const j=new THREE.Mesh(new THREE.SphereGeometry(r*1.3,14,10),jm);j.position.copy(b);g.add(j);
  try{const s=label("💧"+(i+1)+" "+fmt(pts[i+1].l)+(drVert(pts[i+1].d)?"":"（-"+fmt(pts[i+1].l/D.slope)+"）"),ext*0.028,"#e0f2fef2","#0c4a6e");s.position.copy(a).add(b).multiplyScalar(.5);s.userData.cat="drain";if(typeof pxl==="function")pxl(s,15);g.add(s)}catch(e){}}
 {const j=new THREE.Mesh(new THREE.SphereGeometry(rad(D.sz)*1.3,14,10),jm);j.position.copy(S);g.add(j)}
 try{const R=drCalc(),s=label("💧 ドレン "+DR_MAT[D.mat].s+D.sz+"　落差 "+fmt(R.drop)+"（1/"+D.slope+"）",ext*0.03,"#0c4a6ef2","#fff");s.position.copy(pts[pts.length-1].p);s.userData.cat="drain";if(typeof pxl==="function")pxl(s,16);g.add(s)}catch(e){}}

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
.drrow select,.drrow input,.drc select{height:42px;border-radius:10px;border:1.5px solid var(--line);background:var(--card);font-size:15px;font-weight:700;padding:0 6px;color:var(--ink)}
.drrow input{width:96px;text-align:right}
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
  if(m==="dr"){const D=DRN();if(!D.rows.length){D.rows=[{d:"前",l:1000,tee:false,sz:0}];D.show=true;save();drRedraw()}drRender()}
  try{setTimeout(sizeT,30)}catch(err){}};
 let rt=0;window.drRedraw=()=>{clearTimeout(rt);rt=setTimeout(()=>{if(T){build3D();T.dirty=true}},120)};
 pn.addEventListener("input",e=>{const el=e.target,i=+el.dataset.i,k=el.dataset.k,D=DRN();if(k==="l"&&D.rows[i]){D.rows[i].l=Math.max(0,parseInt(String(el.value).replace(/[^0-9]/g,""))||0);save(true);drSum();drRedraw()}});
 pn.addEventListener("change",e=>{const el=e.target,i=+el.dataset.i,k=el.dataset.k,D=DRN();
  if(k==="d"&&D.rows[i])D.rows[i].d=el.value;else if(k==="sz"&&D.rows[i])D.rows[i].sz=+el.value;else if(k==="msz")D.sz=+el.value;else if(k==="co")D.co=el.checked;else if(k==="show")D.show=el.checked;else return;
  save();drRender();drRedraw()});
 pn.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;const D=DRN(),i=+b.dataset.i,k=b.dataset.k;if(!k)return;
  if(k==="mat")D.mat=b.dataset.v;else if(k==="slope")D.slope=+b.dataset.v;else if(k==="span")D.span=+b.dataset.v;
  else if(k==="tee")D.rows[i].tee=!D.rows[i].tee;else if(k==="del"){D.rows.splice(i,1)}
  else if(k==="add"){const last=D.rows[D.rows.length-1];D.rows.push({d:last?last.d:"前",l:1000,tee:false,sz:0})}
  else if(k==="sum"){drSumOpen();return}else return;
  save();drRender();drRedraw()});
})();
function drStartName(){const u=T&&T.UN&&(T.UN.find(x=>x.t==="s"&&x.dr)||T.UN.find(x=>x.dr));return u?"室内機のドレン口（"+u.name+"）":"配管の始まり（室内機の模型をONにすると、ドレン口から始まります）"}
function drRender(){const pn=$("#drPanel");if(!pn)return;const D=DRN(),M=DR_MAT[D.mat];
 const seg=(k,list,cur)=>`<div class="drseg">${list.map(([v,l])=>`<button data-k="${k}" data-v="${v}" class="${String(cur)===String(v)?"on":""}">${l}</button>`).join("")}</div>`;
 let h=`<div class="drc"><h4>💧 ドレン配管の設定</h4>
 <div style="font-size:13px;color:var(--sub)">材質</div>${seg("mat",[["VP","VP管"],["AC","ACドレン（保温付き）"]],D.mat)}
 <div class="drnote">💡 <b>サイズ感の注意</b>：ACドレンは保温層があるので、外径が同じ呼び径のVP管より1ランク大きくなります（例：AC25 は外径 約${DR_MAT.AC.od[25]}mm で、VP30〜35 くらいの太さ）。吊りバンドはAC用（保温付き外径用）を使ってください。VP用だと保温が潰れます。外径は目安なので、メーカーの値で確認してください。</div>
 <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><label style="font-size:13px;color:var(--sub)">始まりのサイズ <select data-k="msz">${DR_SIZES.map(z=>`<option value="${z}"${z===D.sz?" selected":""}>${M.s}${z}（外径 約${M.od[z]}）</option>`).join("")}</select></label></div>
 <div style="font-size:13px;color:var(--sub);margin-top:8px">下り勾配</div>${seg("slope",[[100,"1/100"],[50,"1/50"]],D.slope)}
 <div style="font-size:13px;color:var(--sub)">吊りの間隔（横引き）</div>${seg("span",[[1000,"1.0m"],[1200,"1.2m"],[1500,"1.5m"]],D.span)}
 <label style="display:flex;gap:8px;align-items:center;font-size:14px;font-weight:700"><input type="checkbox" data-k="show" ${D.show?"checked":""} style="width:22px;height:22px">3Dにドレンを表示</label></div>
 <div class="drc"><h4>区間（ドレン口から順に）</h4><div style="font-size:12.5px;color:var(--sub);margin-bottom:4px">始まり：${drStartName()}<br>向きは3Dの矢印（前・右・上）が基準です。横の区間は勾配のぶん自動で下げて描きます。</div>`;
 D.rows.forEach((r,i)=>{h+=`<div class="drrow"><b>${i+1}</b><select data-k="d" data-i="${i}">${DR_ORDER.map(k=>`<option${k===r.d?" selected":""}>${k}</option>`).join("")}</select><input data-k="l" data-i="${i}" inputmode="numeric" value="${r.l}" aria-label="長さmm"><span style="font-size:13px">mm</span>
  <button data-k="tee" data-i="${i}" class="${r.tee?"on":""}">チーズ</button><select data-k="sz" data-i="${i}" aria-label="径を変える"><option value="0">径そのまま</option>${DR_SIZES.map(z=>`<option value="${z}"${r.sz===z?" selected":""}>ここから${M.s}${z}</option>`).join("")}</select><button data-k="del" data-i="${i}" aria-label="消す">🗑</button></div>`});
 h+=`<button class="drbig" data-k="add" style="background:var(--acc);color:#fff">➕ 区間を追加</button>
 <label style="display:flex;gap:8px;align-items:center;font-size:14px;font-weight:700;margin-top:10px"><input type="checkbox" data-k="co" ${D.co?"checked":""} style="width:22px;height:22px">最後に掃除口を付ける</label></div>
 <div class="drc" id="drSumBox"></div>
 <button class="drbig" data-k="sum" style="background:#0f766e;color:#fff">📋 冷媒＋ドレン まとめを見る</button>`;
 $("#drPanel").innerHTML=h;drSum()}
function drSumHtml(){const D=DRN(),R=drCalc(),M=DR_MAT[D.mat];
 let fit=[...R.fit.entries()].map(([k,n])=>`${k} ×${n}`).join("<br>")||"なし";
 const warn=R.up>500?`<div class="drnote">⚠️ 立ち上げが合計 ${fmt(R.up)}mm です。ドレンアップの上限（機種ごと。多くは天井面から500〜850mm）を確認してください。</div>`:"";
 return `<h4>📏 計算</h4><table class="drsum" style="width:100%;border-collapse:collapse">
 <tr><td>材質</td><td><b>${M.n}</b>　${M.s}${D.sz}${R.szEnd!==D.sz?" → "+M.s+R.szEnd:""}（外径 約${M.od[D.sz]}${R.szEnd!==D.sz?"→"+M.od[R.szEnd]:""}mm）</td></tr>
 <tr><td>直線の合計</td><td><b>${fmt(R.tot)}</b> mm（横引き ${fmt(R.hz)}・立て ${fmt(R.vt)}）</td></tr>
 <tr><td>必要な落差</td><td><b>${fmt(R.drop)}</b> mm（横引き ${fmt(R.hz)} × 1/${D.slope}）</td></tr>
 <tr><td>継手</td><td>${fit}</td></tr>
 <tr><td>吊り金具</td><td><b>${R.sup}</b> 個（${drBand(D,D.sz)}${R.szEnd!==D.sz?"／太い所は "+drBand(D,R.szEnd):""}）<br><small>横引き ${(D.span/1000).toFixed(1)}m おき＋継手の近く（150mm以内）に1か所ずつ</small>${R.vsup?`<br>立てバンド ${R.vsup} 個`:""}</td></tr>
 </table>${warn}<div style="font-size:12px;color:var(--sub);margin-top:6px">数は目安です。継手の品番・外径はメーカーで確認してください。ソケットは定尺4mを超える所の数です。</div>`}
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
/* 読み込み終わったら、ドレンも3Dに出す */
if(T){try{build3D();T.dirty=true}catch(e){}}
