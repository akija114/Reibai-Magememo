/* 冷媒配管の曲げ共有：mitsumori.js（🧾 材料拾い・見積もり）
   今の配管（冷媒・分岐・ドレン）から、要る材料を数えて一覧にする。見積もりは単価を入れると金額・消費税・合計まで出る。
   ・冷媒：サイズ（液×ガス）ごとの長さ → ペアコイル（20m巻）か直管（4m）の本数。切りしろ（初期10%）を足して、半端なら1本多く
   ・曲げ：ベンダーで曲げる所（5分まで）は角度ごとの数。7分から上はエルボ（ろう付け）で数える
   ・支持：吊り金具・立てバンド・全ねじ・ナット（支持のルールで数えた数）
   ・ドレン：サイズごとの長さ → 定尺4mの本数、継手（90°・45°・チーズ・ソケット・掃除口…）、吊りバンドをサイズごとに
     ACドレンは保温があるので、吊りバンドは1ランク大きいサイズ（AC40 → 50A用）
   ・単価・宛名・追加の行は、この端末（localStorage）に覚えておく */
(function(){
const LS=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},LSset=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const MT={tab:"mat",cut:LS("pbm_mt_cut",10)};
const BANDS=[20,25,30,40,50,65,75,100];
const bandUp=sz=>BANDS[Math.min(BANDS.length-1,BANDS.indexOf(sz)+1)]||sz;   // ACドレン：保温のぶん1ランク上
const bun=i=>{const n=SIZES[i]?SIZES[i][0]:"?";return n.replace(/\s*\(.*\)/,"")};
const phi=i=>SIZES[i]?SIZES[i][1]:0;
const esc=s=>String(s).replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
const nPipe=(len,unit)=>len>0?Math.ceil(len*(1+MT.cut/100)/unit-1e-9):0;   // 切りしろを足して、半端なら1本多く

/* ===== 数える ===== */
function mtCollect(){const G=[];const sec=(t,items,note)=>{if(items.length)G.push({t,items,note})};
 /* --- 冷媒 --- */
 const R=[],ids=typeof legIds==="function"?legIds():["m"],pair={},bends={},sup={h:0,v:0},supSz={};let ds=null;try{ds=legDirs()}catch(e){}
 ids.forEach(g=>{const L=legLen(g);if(!L)return;const lg=legLG(g),k=lg.liq+"|"+lg.gas;pair[k]=(pair[k]||0)+L;
  legRows(g).forEach((r,i)=>{if(!r.a)return;const big=Math.max(lg.liq,lg.gas)>=5,a=r.a===180?90:r.a,n=r.a===180?2:1;const key=(big?"E":"B")+"|"+a+"|"+k;bends[key]=(bends[key]||0)+n});
  let hv={h:0,v:0};try{hv=supHV(g,ds)}catch(e){}sup.h+=hv.h;sup.v+=hv.v;supSz[lg.gas]=(supSz[lg.gas]||0)+hv.h});
 Object.keys(pair).forEach(k=>{const[l,g]=k.split("|").map(Number),L=pair[k];
  if(Math.max(l,g)<=3)R.push({n:`ペアコイル ${bun(l)}${bun(g)}（液φ${phi(l)}×ガスφ${phi(g)}・保温付き）`,q:nPipe(L,20000),u:"巻",d:`配管 ${fmtM(L)}＋切りしろ${MT.cut}%（20m巻）`});
  else[[l,"液"],[g,"ガス"]].forEach(([s,t])=>{const lim=SIZES[s][2]||4000;R.push({n:`銅管 ${bun(s)}（φ${phi(s)}・${t}）${lim>=20000?"20m巻":"4m直管"}`,q:nPipe(L,lim),u:lim>=20000?"巻":"本",d:`${fmtM(L)}＋切りしろ${MT.cut}%`});
   R.push({n:`保温材 φ${phi(s)}用（${t}）`,q:Math.ceil(L*(1+MT.cut/100)/1000),u:"m",d:"配管と同じ長さ"})})});
 const bendInfo=[];Object.keys(bends).forEach(k=>{const[t,a,l,g]=k.split("|"),n=bends[k];
  if(t==="E")[[+l,"液"],[+g,"ガス"]].forEach(([s,tt])=>R.push({n:`エルボ ${a}° ${bun(s)}（φ${phi(s)}・${tt}）`,q:n,u:"個",d:"ろう付け"}));
  else bendInfo.push(`${a}°×${n}（${bun(+l)}${bun(+g)}）`)});
 const nBr=new Set((st.bl||[]).map(l=>l.p)).size;if(nBr)R.push({n:"冷媒分岐管（液・ガス1組）",q:nBr,u:"組",d:"機種・容量に合うものを"});
 const ends=1+(typeof leaves==="function"?leaves().length:1);if(R.length)R.push({n:"フレア接続（液・ガス）",q:ends*2,u:"か所",d:"フレアナットは機器付属を確認"});
 if(sup.h)Object.keys(supSz).forEach(gs=>{const n=supSz[gs];if(!n)return;R.push({n:`冷媒の吊り金具（共吊り・ガスφ${phi(+gs)}の保温外径）`,q:n,u:"個",d:"横引きの支持（縦は下の立てバンド）"})});
 if(sup.v)R.push({n:"立てバンド（冷媒）",q:sup.v,u:"個",d:"縦配管の支持"});
 sec("冷媒配管",R,bendInfo.length?"ベンダーで曲げる所："+bendInfo.join("・"):"");
 /* --- ドレン --- */
 const Dl=[];let dSup=0;
 if(st.drain&&typeof DRN==="function"&&DRN().rows.length&&DRN().show!==false){const D=DRN(),M=DR_MAT[D.mat],ac=D.mat==="AC",len={};let sz=D.sz;
  D.rows.forEach((r,i)=>{if(r.sz)sz=r.sz;let hs=false;try{hs=drHose()&&drHoseRow(i)}catch(e){}if(!hs)len[sz]=(len[sz]||0)+r.l});
  Object.keys(len).forEach(s=>{const L=len[s];Dl.push({n:`${ac?"ACドレン":"VP管"} ${M.s}${s}（定尺4m${ac?"・保温付き":""}）`,q:nPipe(L,4000),u:"本",d:`${fmtM(L)}＋切りしろ${MT.cut}%`});
   if(!ac)Dl.push({n:`ドレン保温材 VP${s}用`,q:Math.ceil(L*(1+MT.cut/100)/1000),u:"m",d:"室内の結露防止（屋外は不要な所も）"})});
  let RC=null;try{RC=drCalc()}catch(e){}
  if(RC)[...RC.fit.entries()].forEach(([k,n])=>Dl.push({n:k,q:n,u:"個",d:""}));
  let SP=[];try{SP=drSupports(drPath(new THREE.Vector3(),new THREE.Vector3(1,0,0)))}catch(e){}
  const bs={},vs={};SP.forEach(o=>{const s=o.sz||D.sz;if(o.k==="v")vs[s]=(vs[s]||0)+1;else bs[s]=(bs[s]||0)+1});
  Object.keys(bs).forEach(s=>{const b=ac?bandUp(+s):+s;Dl.push({n:`吊りバンド ${b}A用`,q:bs[s],u:"個",d:ac?`AC${s}（外径約${M.od[s]}mm）は保温のぶん1ランク上`:`VP${s}`})});
  Object.keys(vs).forEach(s=>{const b=ac?bandUp(+s):+s;Dl.push({n:`立てバンド ${b}A用`,q:vs[s],u:"個",d:ac?`AC${s}（1ランク上）`:`VP${s}`})});
  dSup=Object.values(bs).reduce((a,b)=>a+b,0);
  Dl.push({n:ac?"AC用 接着剤・テープ":"塩ビ用 接着剤",q:1,u:"缶",d:"在庫があれば不要"})}
 sec("ドレン配管",Dl,"");
 /* --- 吊り（冷媒＋ドレン） --- */
 const hang=sup.h+dSup,Hg=[];if(hang){Hg.push({n:"全ねじ W3/8",q:hang,u:"本",d:"長さは現場（スラブ・梁から）"});Hg.push({n:"ナット W3/8",q:hang*2,u:"個",d:"1本に2個"});Hg.push({n:"吊り元（インサート・ダクター用金具など）",q:hang,u:"個",d:"現場の吊り元に合わせて"})}
 sec("吊り・支持の金物",Hg,"");
 return G}

/* ===== 見積もり ===== */
const PR=()=>LS("pbm_mt_price",{}),setPR=p=>LSset("pbm_mt_price",p);
const EX=()=>LS("pbm_mt_extra",[{n:"配管工事費",q:1,u:"式",p:0},{n:"ドレン工事費",q:1,u:"式",p:0}]),setEX=v=>LSset("pbm_mt_extra",v);
const HD=()=>LS("pbm_mt_head",{to:"",from:"",tax:10,note:""}),setHD=v=>LSset("pbm_mt_head",v);
function mtRows(){const rows=[];mtCollect().forEach(g=>g.items.forEach(it=>{if(it.u==="か所")return;const v=TK.get(it.n);rows.push({...it,sec:g.t,p:v.p||0,pv:v})}));EX().forEach((e,i)=>rows.push({...e,sec:"工事費・その他",x:i}));return rows}
const yen=v=>"¥"+Math.round(v).toLocaleString("ja-JP");

/* ===== 画面 ===== */
function mtSheet(){let ov=document.getElementById("mtOv");if(ov)return ov;ov=document.createElement("div");ov.id="mtOv";ov.className="ov";ov.style.zIndex=75;
 ov.innerHTML=`<div class="sheet"><div class="shead"><h3>🧾 材料拾い・見積もり</h3><button id="mtClose">✕</button></div>
  <div style="display:flex;gap:6px;margin-bottom:8px">${[["mat","📦 材料"],["est","💴 見積もり"],["tk","💹 単価表"]].map(([k,l])=>`<button data-mt="${k}" style="flex:1;height:42px;border-radius:12px;font-weight:800;font-size:15px;border:1.5px solid #cbd5e1">${l}</button>`).join("")}</div>
  <div id="mtBody"></div></div>`;
 document.body.appendChild(ov);ov.addEventListener("click",e=>{if(e.target.id==="mtOv")ov.classList.remove("on")});ov.querySelector("#mtClose").onclick=()=>ov.classList.remove("on");
 ov.querySelectorAll("[data-mt]").forEach(b=>b.onclick=()=>{MT.tab=b.dataset.mt;mtRender()});
 const css=document.createElement("style");css.textContent=`#mtBody table{width:100%;border-collapse:collapse;font-size:13.5px}#mtBody td,#mtBody th{border-bottom:1px solid #e2e8f0;padding:6px 4px;text-align:left;vertical-align:top}#mtBody th{font-size:12px;color:#64748b;font-weight:700}
  #mtBody .q{text-align:right;white-space:nowrap;font-weight:800}#mtBody h4{margin:12px 0 4px;font-size:15px}#mtBody input{height:34px;border-radius:8px;border:1.5px solid #cbd5e1;padding:0 6px;font-size:15px}
  #mtPrint{display:none}@media print{body>*{display:none!important}#mtPrint{display:block!important;color:#000;font-size:11pt}#mtPrint table{width:100%;border-collapse:collapse}#mtPrint td,#mtPrint th{border:1px solid #555;padding:4px 6px}#mtPrint .r{text-align:right}}`;document.head.appendChild(css);
 return ov}
function mtRender(){const ov=mtSheet(),b=ov.querySelector("#mtBody");ov.querySelectorAll("[data-mt]").forEach(x=>{const on=x.dataset.mt===MT.tab;x.style.background=on?"#0f766e":"#fff";x.style.color=on?"#fff":"#0f172a"});
 if(MT.tab==="mat"){const G=mtCollect();
  if(!G.length){b.innerHTML=`<p>まだ配管がありません。曲げ共有で配管（とドレン）を入れると、ここに材料が出ます。</p>`;return}
  b.innerHTML=`<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13.5px">切りしろ <input id="mtCut" inputmode="numeric" value="${MT.cut}" style="width:56px"> %（足してから定尺で割り、半端なら1本多く）</div>`+
   G.map(g=>`<h4>${g.t}</h4><table><tr><th>品名</th><th class="q">数</th></tr>${g.items.map(it=>`<tr><td>${esc(it.n)}${it.d?`<br><small style="color:#64748b">${esc(it.d)}</small>`:""}</td><td class="q">${it.q} ${it.u}</td></tr>`).join("")}</table>${g.note?`<div style="font-size:12.5px;color:#475569;margin-top:4px">${esc(g.note)}</div>`:""}`).join("")+
   `<div style="display:flex;gap:6px;margin-top:10px"><button id="mtCopy" style="flex:1;height:44px;border-radius:12px;background:#0891b2;color:#fff;font-weight:800">📋 コピー（LINE・メモに貼る）</button></div>
   <p style="font-size:12px;color:#64748b;margin-top:6px">数は今の配管・支持のルールからの目安です。品番・サイズ・在庫は現場とメーカーで確認してください。</p>`;
  const c=b.querySelector("#mtCut");c.onchange=()=>{MT.cut=Math.max(0,Math.min(50,parseInt(c.value)||0));LSset("pbm_mt_cut",MT.cut);mtRender()};
  b.querySelector("#mtCopy").onclick=()=>{const t=mtText(G);try{navigator.clipboard.writeText(t).then(()=>toast("コピーしました"),()=>prompt("コピーしてください",t))}catch(e){prompt("コピーしてください",t)}};return}
 if(MT.tab==="tk"){TK.render(b,mtRender);return}
 /* 見積もり */
 const H=HD(),rows=mtRows(),sub=rows.reduce((a,r)=>a+r.q*(r.p||0),0),tax=Math.round(sub*(H.tax||0)/100);
 let cur="";b.innerHTML=`<div style="display:grid;grid-template-columns:auto 1fr;gap:6px;align-items:center;font-size:13.5px">宛名<input id="mtTo" value="${esc(H.to)}" placeholder="例：〇〇建設 御中">発行者<input id="mtFrom" value="${esc(H.from)}" placeholder="屋号・名前">消費税<span><input id="mtTax" inputmode="numeric" value="${H.tax}" style="width:56px"> %</span></div>
  <table style="margin-top:8px"><tr><th>品名</th><th class="q">数</th><th class="q">単価</th><th class="q">金額</th></tr>${rows.map((r,i)=>{const h=r.sec!==cur?`<tr><td colspan="4" style="background:#f1f5f9;font-weight:800">${esc(r.sec)}</td></tr>`:"";cur=r.sec;
   return h+`<tr><td>${r.x!=null?`<input data-xn="${r.x}" value="${esc(r.n)}" style="width:100%">`:esc(r.n)}</td><td class="q">${r.x!=null?`<input data-xq="${r.x}" inputmode="decimal" value="${r.q}" style="width:48px">`:r.q} ${esc(r.u)}</td><td class="q"><input ${r.x!=null?`data-xp="${r.x}"`:`data-pn="${esc(r.n)}"`} inputmode="numeric" value="${r.p||""}" placeholder="0" style="width:76px">${r.pv&&r.p?`<br><small style="color:${TK.isOld(r.n)?"#b45309":"#94a3b8"};font-weight:400">${TK.isOld(r.n)?"⚠️":""}${TK.dLab(r.pv)}</small>`:""}</td><td class="q">${yen(r.q*(r.p||0))}</td></tr>`}).join("")}
  <tr><td colspan="3" class="q">小計</td><td class="q">${yen(sub)}</td></tr><tr><td colspan="3" class="q">消費税（${H.tax}%）</td><td class="q">${yen(tax)}</td></tr><tr><td colspan="3" class="q" style="font-size:16px">合計</td><td class="q" style="font-size:16px">${yen(sub+tax)}</td></tr></table>
  <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button id="mtAdd" style="flex:1;height:42px;border-radius:12px;border:1.5px solid #cbd5e1;background:#fff;font-weight:800">＋ 行を足す</button><button id="mtDel" style="flex:1;height:42px;border-radius:12px;border:1.5px solid #cbd5e1;background:#fff;font-weight:800">－ 最後の行を消す</button></div>
  <div style="display:flex;gap:6px;margin-top:6px"><button id="mtPrintB" style="flex:1;height:46px;border-radius:12px;background:#0f766e;color:#fff;font-weight:800">🖨 見積書（印刷・PDF）</button><button id="mtCopyE" style="flex:1;height:46px;border-radius:12px;background:#0891b2;color:#fff;font-weight:800">📋 コピー</button></div>
  <p style="font-size:12px;color:#64748b;margin-top:6px">単価はこのiPhoneに覚えておきます（いつ直したかも）。値上げ・Excelの単価表・ネット相場は「💹 単価表」で。印刷の画面で「共有」→ PDFとして保存できます。</p>`;
 const hd=()=>{const h=HD();h.to=b.querySelector("#mtTo").value;h.from=b.querySelector("#mtFrom").value;h.tax=Math.max(0,parseInt(b.querySelector("#mtTax").value)||0);setHD(h)};
 ["#mtTo","#mtFrom"].forEach(s=>b.querySelector(s).onchange=hd);b.querySelector("#mtTax").onchange=()=>{hd();mtRender()};
 b.querySelectorAll("[data-pn]").forEach(i=>i.onchange=()=>{TK.set(i.dataset.pn,String(i.value).replace(/\D/g,""));mtRender()});
 const ex=(attr,f)=>b.querySelectorAll(`[${attr}]`).forEach(i=>i.onchange=()=>{const e=EX(),k=+i.getAttribute(attr);if(e[k]){f(e[k],i.value);setEX(e);mtRender()}});
 ex("data-xn",(o,v)=>o.n=String(v).slice(0,40));ex("data-xq",(o,v)=>o.q=Math.max(0,parseFloat(v)||0));ex("data-xp",(o,v)=>o.p=Math.max(0,parseInt(String(v).replace(/\D/g,""))||0));
 b.querySelector("#mtAdd").onclick=()=>{const e=EX();e.push({n:"",q:1,u:"式",p:0});setEX(e);mtRender()};
 b.querySelector("#mtDel").onclick=()=>{const e=EX();e.pop();setEX(e);mtRender()};
 b.querySelector("#mtCopyE").onclick=()=>{const t=mtEstText();try{navigator.clipboard.writeText(t).then(()=>toast("コピーしました"),()=>prompt("コピーしてください",t))}catch(e){prompt("コピーしてください",t)}};
 b.querySelector("#mtPrintB").onclick=mtPrint}
function mtHead(){const i=st.info||{};return[i.site?"現場："+i.site:"",i.line?"系統："+i.line:""].filter(Boolean).join("　")}
function mtText(G){return"材料拾い"+(mtHead()?"（"+mtHead()+"）":"")+"\n"+G.map(g=>"■"+g.t+"\n"+g.items.map(it=>"・"+it.n+"　"+it.q+it.u).join("\n")+(g.note?"\n（"+g.note+"）":"")).join("\n")}
function mtEstText(){const H=HD(),rows=mtRows(),sub=rows.reduce((a,r)=>a+r.q*(r.p||0),0),tax=Math.round(sub*(H.tax||0)/100);
 return"御見積書"+(H.to?"\n"+H.to:"")+(mtHead()?"\n"+mtHead():"")+"\n"+rows.map(r=>"・"+r.n+"　"+r.q+r.u+(r.p?" × "+yen(r.p)+" = "+yen(r.q*r.p):"")).join("\n")+`\n小計 ${yen(sub)}\n消費税(${H.tax}%) ${yen(tax)}\n合計 ${yen(sub+tax)}`+(H.from?"\n"+H.from:"")}
function mtPrint(){const H=HD(),rows=mtRows(),sub=rows.reduce((a,r)=>a+r.q*(r.p||0),0),tax=Math.round(sub*(H.tax||0)/100),d=new Date();
 let el=document.getElementById("mtPrint");if(!el){el=document.createElement("div");el.id="mtPrint";document.body.appendChild(el)}
 el.innerHTML=`<h2 style="text-align:center;letter-spacing:.5em">御見積書</h2><div style="display:flex;justify-content:space-between"><div style="font-size:14pt;border-bottom:1px solid #000">${esc(H.to||"　　　　　　　　御中")}</div><div>${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日</div></div>
  <p>${esc(mtHead())}</p><p style="font-size:15pt;border-bottom:2px solid #000;display:inline-block">御見積金額　${yen(sub+tax)}（税込）</p>
  <table><tr><th>品名</th><th>数量</th><th>単位</th><th>単価</th><th>金額</th></tr>${rows.map(r=>`<tr><td>${esc(r.n)}</td><td class="r">${r.q}</td><td>${esc(r.u)}</td><td class="r">${r.p?yen(r.p):""}</td><td class="r">${r.p?yen(r.q*r.p):""}</td></tr>`).join("")}
  <tr><td colspan="4" class="r">小計</td><td class="r">${yen(sub)}</td></tr><tr><td colspan="4" class="r">消費税（${H.tax}%）</td><td class="r">${yen(tax)}</td></tr><tr><td colspan="4" class="r"><b>合計</b></td><td class="r"><b>${yen(sub+tax)}</b></td></tr></table>
  <p style="text-align:right;margin-top:16px">${esc(H.from)}</p>`;
 setTimeout(()=>window.print(),50)}
window.mtOpen=function(){mtSheet().classList.add("on");mtRender()};
/* 「📋 長さと配管サイズ」の一番上にボタンを出す */
window.mtBtn=function(){const box=document.getElementById("tblBody");if(!box||box.querySelector("#mtOpenB"))return;const b=document.createElement("button");b.id="mtOpenB";b.textContent="🧾 材料拾い・見積もり";
 b.style.cssText="width:100%;min-height:48px;border-radius:12px;background:#0f766e;color:#fff;font-weight:800;font-size:16px;margin-bottom:10px;border:0";b.onclick=()=>{document.getElementById("tblOv").classList.remove("on");mtOpen()};box.prepend(b)};
window.mtCollect=mtCollect;
})();
