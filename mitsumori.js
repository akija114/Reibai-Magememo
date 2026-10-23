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
/* 図面の曲がり（エルボ）の角度：売っている角度のいちばん近い物に（衛生 90・45・22.5°、ダクト 90・60・45・30・15°）。q[8..11]・q[13..14]＝角から管の中への向き */
const elbDeg=(q,D=[90,45,22.5])=>{const a=[q[8],q[13]||0,q[9]],b=[q[10],q[14]||0,q[11]],la=Math.hypot(...a)||1,lb=Math.hypot(...b)||1,c=(a[0]*b[0]+a[1]*b[1]+a[2]*b[2])/la/lb,d=180-Math.acos(Math.max(-1,Math.min(1,c)))*180/Math.PI;return D.reduce((p,x)=>Math.abs(x-d)<Math.abs(p-d)?x:p)};
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
 /* --- 図面の衛生配管（図面画面で読んだ物）：管の長さ・エルボ・チーズ（本管×枝）・Y（45°合流）・床からの立ち上がり。空調ドレンの床から上は空調で別に --- */
 try{const D=st.dln,S=D&&D.eiseiS,J=(D&&D.eiseiJ)||[];if(Array.isArray(S)&&S.length){
  const OD=[[21.7,15],[27.2,20],[34,25],[42.7,32],[48.6,40],[60.5,50],[76.3,65],[89.1,80],[114.3,100],[139.8,125],[165.2,150],[216.3,200]],A=od=>OD.reduce((p,q)=>Math.abs(q[0]-od)<Math.abs(p[0]-od)?q:p)[1];
  const SN=["給水・給湯","汚水・排水","通気","その他","空調ドレン（床から上）"],len={},cnt={},put=(m,k,v)=>{m[k]=(m[k]||0)+v};
  S.forEach(s=>{const h2=typeof s[9]==="number"?s[9]:s[4],L=Math.hypot(s[2]-s[0],s[3]-s[1],h2-s[4]);if(L<1)return;put(len,(s[8]||0)+"|"+A(s[6]),L);if(s[11]==="fl")put(cnt,"立ち上がり|"+(s[8]||0)+"|"+A(s[6]),1)});
  /* 排水（汚水・排水）は排水用の継手（DV）：90°は大曲がりエルボ、チーズは90°Y。通気・給水はふつうのエルボ・チーズ */
  J.forEach(q=>{const sb=q[6]===4&&q[2]<0?1:q[6]||0,dv=+sb===1;   /* 空調ドレンの床下の継手は衛生（汚水へ）で数える */if(q[7]===1){const a=elbDeg(q);put(cnt,(a===90&&dv?"90°大曲がりエルボ（DV）":a+"°エルボ")+"|"+sb+"|"+A(q[4]),1)}else if(q[9]===1||q[9]===2){const m=A(q[14]||q[4]),b=A(q[15]||q[4]);put(cnt,(q[9]===1?(dv?"90°Y（DV・排水のチーズ）":"チーズ"):"45°Y（合流）")+"|"+sb+"|"+(m===b?m:m+"×"+b),1)}});
  const Es=[],Ac=[],to=sb=>+sb===4?Ac:Es;
  /* 空調ドレンのたて管（図面・床から上）は空調のドレンの続き。外へ出るので VP（保温付きの ACドレンから変更）。ドレン配管の所に入れる */
  const VI=typeof drVPinfo==="function"?drVPinfo():null,vp=a=>VI?VI.sz:a===32?30:a;   // たて管の VP の太さ：アプリのドレンから（AC40 → VP50。ACの外径は1つ上のVPと同じ）。ドレンが無い時は図面の太さ
  const tl=VI&&VI.ac?`外へ出るので AC${VI.acSz}→VP${VI.sz}に変更`:"外へ出るので VP";
  Object.keys(len).sort().forEach(k=>{const[sb,a]=k.split("|");if(+sb===4){const L=len[k];Ac.push({n:`VP管 VP${vp(+a)}（空調ドレンのたて管・${tl}）`,q:nPipe(L,4000),u:"本",d:`図面から ${fmtM?fmtM(L):Math.round(L)+"mm"}＋切りしろ${MT.cut}%（定尺4m）`});Ac.push({n:`立てバンド ${vp(+a)}A用（空調ドレンのたて管）`,q:Math.max(1,Math.ceil(L/1500)),u:"個",d:"縦の支持（1.5mごと）"});return}
   to(sb).push({n:`${SN[sb]||"衛生"} ${a}A`,q:Math.round(len[k]/100)/10,u:"m",d:`図面から ${fmtM?fmtM(len[k]):Math.round(len[k])+"mm"}（定尺4mなら ${Math.ceil(len[k]/4000)}本）`})});
  Object.keys(cnt).sort().forEach(k=>{const[t,sb,sz]=k.split("|");if(+sb===4){Ac.push({n:`${t} VP${vp(+sz)}（空調ドレン・VP）`,q:cnt[k],u:"個",d:""});return}to(sb).push({n:`${t==="立ち上がり"?"床からの立ち上がり（器具へ・床から100mm）":t} ${sz}${/×/.test(sz)?"":"A"}（${SN[sb]||"衛生"}）`,q:cnt[k],u:t==="立ち上がり"?"か所":"個",d:""})});
  const nV=S.filter(s=>s[8]===4&&s[0]===s[2]&&s[1]===s[3]&&Math.max(s[4],typeof s[9]==="number"?s[9]:s[4])>0).length;if(nV){const sz=vp(A(S.find(s=>s[8]===4)[6]));
   if(VI&&VI.ac){Ac.push({n:`AC用 90°エルボ AC${VI.acSz}（たて管の上・立ち下げ）`,q:nV,u:"個",d:"ACのままエルボで下へ向ける"});Ac.push({n:`VP${sz} ソケット（AC${VI.acSz}→VP${sz}の切りかえ）`,q:nV,u:"個",d:`AC${VI.acSz}の外径はVP${sz}と同じなので、VP${sz}のソケットに差し込める`})}
   else Ac.push({n:`90°エルボ VP${sz}（たて管の上・ドレンの端とつなぐ）`,q:nV,u:"個",d:""});if(!(st.drain&&typeof DRN==="function"&&DRN().mat==="VP"))Ac.push({n:"塩ビ用 接着剤（VPのたて管）",q:1,u:"缶",d:"在庫があれば不要"})}
  sec("衛生配管（図面から）",Es,"図面の衛生配管を読んだ数です。空調ドレンの床下の部分も衛生に入れています");
  if(Ac.length){const g=G.find(g=>g.t==="ドレン配管"),nt=VI&&VI.ac?`🔁 変更：空調ドレンのたて管（図面）は外へ出るので VP${VI.sz}。AC${VI.acSz}をエルボで立ち下げて、VP${VI.sz}のソケットで切りかえ（AC${VI.acSz}とVP${VI.sz}は外径が同じ）`:"🔁 変更：空調ドレンのたて管（図面）は外へ出るので VP にしています";if(g){g.items.push(...Ac);g.note=(g.note?g.note+"／":"")+nt}else sec("ドレン配管",Ac,nt)}}}catch(e){console.warn("mt eisei",e)}
 /* --- 図面のダクト（図面画面で読んだ物）：丸＝スパイラルダクト、角＝角ダクト。長さ・エルボ（角度ごと）・径違い・ベントキャップ・つなぎ目 --- */
 try{const D=st.dln,S=D&&D.ductS,J=(D&&D.ductJ)||[];if(Array.isArray(S)&&S.length){const Dt=[],len={},cnt={},put=(m,k,v)=>{m[k]=(m[k]||0)+v};let joint=0;
  const nm=(sh,w,hh)=>sh===1?`${Math.round(w)}×${Math.round(hh)}`:`φ${Math.round(w)}`;
  S.forEach(s=>{const h2=typeof s[9]==="number"?s[9]:s[4],w2=typeof s[10]==="number"?s[10]:s[6],L=Math.hypot(s[2]-s[0],s[3]-s[1],h2-s[4]);
   if(Math.abs(w2-s[6])>1){put(cnt,"径違い（レジューサ）|"+nm(s[5],Math.max(s[6],w2),s[7])+"×"+Math.round(Math.min(s[6],w2)),1);joint+=2;return}
   if(L<1)return;put(len,s[5]+"|"+nm(s[5],s[6],s[7]),L)});
  J.forEach(q=>{if(q[7]===1&&q.length>=13){put(cnt,elbDeg(q,[90,60,45,30,15])+"°エルボ|"+nm(q[3],q[4],q[5]),1);joint+=2}else{put(cnt,"分岐・つなぎ（図面で確認）|"+nm(q[3],q[4],q[5]),1);joint+=3}});
  (D.eq2||[]).forEach(e=>{put(cnt,(e[7]==="g"?"吹出口・吸込口":"ダクトの機器")+"|"+e[8],1);joint++});   // 図面の機器の文字から（VHS-200□・換気扇など）
  (D.vc||[]).forEach(v=>{if(v[7]!=="duct")return;put(cnt,"ベントキャップ（深型"+(v[6]?"・FD付":"")+"）|φ"+v[5],1);joint++});
  Object.keys(len).sort().forEach(k=>{const[sh,n]=k.split("|"),L=len[k];Dt.push({n:`${+sh===1?"角ダクト":"スパイラルダクト"} ${n}`,q:Math.round(L/100)/10,u:"m",d:`図面から ${fmtM?fmtM(L):Math.round(L)+"mm"}${+sh===1?"":`（定尺4mなら ${Math.ceil(L/4000)}本）`}`})});
  Object.keys(cnt).sort().forEach(k=>{const[t,n]=k.split("|");Dt.push({n:`${t} ${n}`,q:cnt[k],u:"個",d:""})});
  if(joint)Dt.push({n:"つなぎ目（差し込み・ビス止め・アルミテープ巻き）",q:joint,u:"か所",d:"アルミテープ・ビスの量の目安"});
  sec("ダクト（図面から）",Dt,"図面のダクトを読んだ数です。吊り（間隔）・保温・フレキは現場の仕様書で確認してください")}}catch(e){console.warn("mt duct",e)}
 /* --- 吊り（冷媒＋ドレン） --- */
 const hang=sup.h+dSup,Hg=[];if(hang){Hg.push({n:"全ねじ W3/8",q:hang,u:"本",d:"長さは現場（スラブ・梁から）"});Hg.push({n:"ナット W3/8",q:hang*2,u:"個",d:"1本に2個"});Hg.push({n:"吊り元（インサート・ダクター用金具など）",q:hang,u:"個",d:"現場の吊り元に合わせて"})}
 sec("吊り・支持の金物",Hg,"");
 return G}

/* ===== 見積もり ===== */
const PR=()=>LS("pbm_mt_price",{}),setPR=p=>LSset("pbm_mt_price",p);
const EX=()=>LS("pbm_mt_extra",[{n:"配管工事費",q:1,u:"式",p:0},{n:"ドレン工事費",q:1,u:"式",p:0}]),setEX=v=>LSset("pbm_mt_extra",v);
const HD=()=>LS("pbm_mt_head",{to:"",from:"",tax:10,note:""}),setHD=v=>LSset("pbm_mt_head",v);
function mtRows(){const rows=[];mtCollect().forEach(g=>g.items.forEach(it=>{if(it.u==="か所")return;const v=TK.get(it.n);rows.push({...it,sec:g.t,p:v.p||0,pv:v,c:v.c})}));
 const E=EX();E.forEach((e,i)=>{if(!e.mat)return;const v=TK.get(e.n);rows.push({...e,sec:"追加の材料",x:i,p:v.p||e.p||0,pv:v,c:v.c})});   // 追加の材料：単価・品番は単価表から（直すと単価表にも覚える）
 E.forEach((e,i)=>{if(e.mat)return;rows.push({...e,sec:"工事費・その他",x:i})});return rows}
/* 材料を追加する時の候補（単価表にある品目＋よく使う物） */
const MT_CAT=["化粧カバー 直管","化粧カバー コーナー","化粧カバー 壁面取り出し","ウォールキャップ","配管穴 スリーブ","パテ（シールパテ）","ビニルテープ（配管用）","非粘着テープ","インシュロック（結束バンド）","サドルバンド","VVF 2.0-3C","VVF 1.6-3C","冷媒用フレアナット","ろう材","窒素ガス","真空引き・気密試験","冷媒ガス 追加充填","ドレンホース","ドレン 逆止弁","防振ゴム","架台（室外機）","ブロック","ボンド・コーキング","アンカー","高所作業車","産廃処分"];
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
  <label style="display:inline-flex;align-items:center;gap:6px;margin-top:6px;font-weight:800;font-size:14px"><input id="mtCode" type="checkbox" ${H.code?"checked":""} style="width:22px;height:22px"> 品番を表示（見積書・コピーにも）</label>
  <table style="margin-top:8px"><tr><th>品名</th><th class="q">数</th><th class="q">単価</th><th class="q">金額</th></tr>${rows.map((r,i)=>{const h=r.sec!==cur?`<tr><td colspan="4" style="background:#f1f5f9;font-weight:800">${esc(r.sec)}</td></tr>`:"";cur=r.sec;
   return h+`<tr><td>${r.x!=null?`<input data-xn="${r.x}" value="${esc(r.n)}" style="width:100%">`:esc(r.n)}${H.code&&r.c?`<br><small style="color:#0369a1;font-weight:700">品番 ${esc(r.c)}</small>`:H.code&&r.mat!=null?"":""}${H.code&&!r.c&&r.pv?`<br><small style="color:#94a3b8">品番 －</small>`:""}</td><td class="q">${r.x!=null?`<input data-xq="${r.x}" inputmode="decimal" value="${r.q}" style="width:48px">`:r.q} ${esc(r.u)}</td><td class="q"><input ${r.x!=null?`data-xp="${r.x}"`:`data-pn="${esc(r.n)}"`} inputmode="numeric" value="${r.p||""}" placeholder="0" style="width:76px">${r.pv&&r.p?`<br><small style="color:${TK.isOld(r.n)?"#b45309":"#94a3b8"};font-weight:400">${TK.isOld(r.n)?"⚠️":""}${TK.dLab(r.pv)}</small>`:""}</td><td class="q">${yen(r.q*(r.p||0))}</td></tr>`}).join("")}
  <tr><td colspan="3" class="q">小計</td><td class="q">${yen(sub)}</td></tr><tr><td colspan="3" class="q">消費税（${H.tax}%）</td><td class="q">${yen(tax)}</td></tr><tr><td colspan="3" class="q" style="font-size:16px">合計</td><td class="q" style="font-size:16px">${yen(sub+tax)}</td></tr></table>
  <div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:12px;padding:8px;margin-top:8px"><b>＋ 材料を追加</b>（自動で数えていない物）
   <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px"><input id="mtMn" list="mtDl" placeholder="品名（選ぶか打つ）" style="flex:1 1 180px;min-width:0"><datalist id="mtDl">${[...new Set([...TK.names(),...MT_CAT])].map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
   <input id="mtMq" inputmode="decimal" value="1" style="width:56px"><select id="mtMu" style="height:34px;border-radius:8px">${["個","本","m","巻","組","箱","缶","式","台","枚"].map(u=>`<option>${u}</option>`).join("")}</select>
   <button id="mtMadd" style="height:36px;padding:0 14px;border-radius:10px;background:#b45309;color:#fff;font-weight:800">追加</button></div>
   <div style="font-size:12px;color:#92400e;margin-top:2px">単価表にある品名なら、単価・品番が入ります。</div></div>
  <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button id="mtAdd" style="flex:1;height:42px;border-radius:12px;border:1.5px solid #cbd5e1;background:#fff;font-weight:800">＋ 工事費・その他の行</button><button id="mtDel" style="flex:1;height:42px;border-radius:12px;border:1.5px solid #cbd5e1;background:#fff;font-weight:800">－ 最後に足した行を消す</button></div>
  <div style="display:flex;gap:6px;margin-top:6px"><button id="mtPrintB" style="flex:1;height:46px;border-radius:12px;background:#0f766e;color:#fff;font-weight:800">🖨 見積書（印刷・PDF）</button><button id="mtCopyE" style="flex:1;height:46px;border-radius:12px;background:#0891b2;color:#fff;font-weight:800">📋 コピー</button></div>
  <p style="font-size:12px;color:#64748b;margin-top:6px">単価はこのiPhoneに覚えておきます（いつ直したかも）。値上げ・Excelの単価表・ネット相場は「💹 単価表」で。印刷の画面で「共有」→ PDFとして保存できます。</p>`;
 const hd=()=>{const h=HD();h.to=b.querySelector("#mtTo").value;h.from=b.querySelector("#mtFrom").value;h.tax=Math.max(0,parseInt(b.querySelector("#mtTax").value)||0);setHD(h)};
 ["#mtTo","#mtFrom"].forEach(s=>b.querySelector(s).onchange=hd);b.querySelector("#mtTax").onchange=()=>{hd();mtRender()};
 b.querySelectorAll("[data-pn]").forEach(i=>i.onchange=()=>{TK.set(i.dataset.pn,String(i.value).replace(/\D/g,""));mtRender()});
 const ex=(attr,f)=>b.querySelectorAll(`[${attr}]`).forEach(i=>i.onchange=()=>{const e=EX(),k=+i.getAttribute(attr);if(e[k]){f(e[k],i.value);setEX(e);mtRender()}});
 ex("data-xn",(o,v)=>o.n=String(v).slice(0,40));ex("data-xq",(o,v)=>o.q=Math.max(0,parseFloat(v)||0));ex("data-xp",(o,v)=>{o.p=Math.max(0,parseInt(String(v).replace(/\D/g,""))||0);if(o.mat&&o.n)TK.set(o.n,o.p)});
 b.querySelector("#mtCode").onchange=e=>{const h=HD();h.code=e.target.checked;setHD(h);mtRender()};
 b.querySelector("#mtMadd").onclick=()=>{const n=String(b.querySelector("#mtMn").value).trim().slice(0,40);if(!n){toast("品名を入れてください");return}const e=EX();e.push({n,q:Math.max(0,parseFloat(String(b.querySelector("#mtMq").value).normalize("NFKC"))||1),u:b.querySelector("#mtMu").value,p:0,mat:true});setEX(e);toast("「"+n+"」を追加しました");mtRender()};
 b.querySelector("#mtAdd").onclick=()=>{const e=EX();e.push({n:"",q:1,u:"式",p:0});setEX(e);mtRender()};
 b.querySelector("#mtDel").onclick=()=>{const e=EX();e.pop();setEX(e);mtRender()};
 b.querySelector("#mtCopyE").onclick=()=>{const t=mtEstText();try{navigator.clipboard.writeText(t).then(()=>toast("コピーしました"),()=>prompt("コピーしてください",t))}catch(e){prompt("コピーしてください",t)}};
 b.querySelector("#mtPrintB").onclick=mtPrint}
function mtHead(){const i=st.info||{};return[i.site?"現場："+i.site:"",i.line?"系統："+i.line:""].filter(Boolean).join("　")}
function mtText(G){return"材料拾い"+(mtHead()?"（"+mtHead()+"）":"")+"\n"+G.map(g=>"■"+g.t+"\n"+g.items.map(it=>"・"+it.n+"　"+it.q+it.u).join("\n")+(g.note?"\n（"+g.note+"）":"")).join("\n")}
function mtEstText(){const H=HD(),rows=mtRows(),sub=rows.reduce((a,r)=>a+r.q*(r.p||0),0),tax=Math.round(sub*(H.tax||0)/100);
 return"御見積書"+(H.to?"\n"+H.to:"")+(mtHead()?"\n"+mtHead():"")+"\n"+rows.map(r=>"・"+r.n+(H.code&&r.c?"［"+r.c+"］":"")+"　"+r.q+r.u+(r.p?" × "+yen(r.p)+" = "+yen(r.q*r.p):"")).join("\n")+`\n小計 ${yen(sub)}\n消費税(${H.tax}%) ${yen(tax)}\n合計 ${yen(sub+tax)}`+(H.from?"\n"+H.from:"")}
function mtPrint(){const H=HD(),rows=mtRows(),sub=rows.reduce((a,r)=>a+r.q*(r.p||0),0),tax=Math.round(sub*(H.tax||0)/100),d=new Date();
 let el=document.getElementById("mtPrint");if(!el){el=document.createElement("div");el.id="mtPrint";document.body.appendChild(el)}
 el.innerHTML=`<h2 style="text-align:center;letter-spacing:.5em">御見積書</h2><div style="display:flex;justify-content:space-between"><div style="font-size:14pt;border-bottom:1px solid #000">${esc(H.to||"　　　　　　　　御中")}</div><div>${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日</div></div>
  <p>${esc(mtHead())}</p><p style="font-size:15pt;border-bottom:2px solid #000;display:inline-block">御見積金額　${yen(sub+tax)}（税込）</p>
  <table><tr><th>品名</th>${H.code?"<th>品番</th>":""}<th>数量</th><th>単位</th><th>単価</th><th>金額</th></tr>${rows.map(r=>`<tr><td>${esc(r.n)}</td>${H.code?`<td>${esc(r.c||"")}</td>`:""}<td class="r">${r.q}</td><td>${esc(r.u)}</td><td class="r">${r.p?yen(r.p):""}</td><td class="r">${r.p?yen(r.q*r.p):""}</td></tr>`).join("")}
  <tr><td colspan="${H.code?5:4}" class="r">小計</td><td class="r">${yen(sub)}</td></tr><tr><td colspan="${H.code?5:4}" class="r">消費税（${H.tax}%）</td><td class="r">${yen(tax)}</td></tr><tr><td colspan="${H.code?5:4}" class="r"><b>合計</b></td><td class="r"><b>${yen(sub+tax)}</b></td></tr></table>
  <p style="text-align:right;margin-top:16px">${esc(H.from)}</p>`;
 setTimeout(()=>window.print(),50)}
window.mtOpen=function(){mtSheet().classList.add("on");mtRender()};
/* 「📋 長さと配管サイズ」の一番上にボタンを出す */
window.mtBtn=function(){const box=document.getElementById("tblBody");if(!box||box.querySelector("#mtOpenB"))return;const b=document.createElement("button");b.id="mtOpenB";b.textContent="🧾 材料拾い・見積もり";
 b.style.cssText="width:100%;min-height:48px;border-radius:12px;background:#0f766e;color:#fff;font-weight:800;font-size:16px;margin-bottom:10px;border:0";b.onclick=()=>{document.getElementById("tblOv").classList.remove("on");mtOpen()};box.prepend(b)};
window.mtCollect=mtCollect;
/* 曲げ共有の画面（図面の画面はボタンの並びに入れてある）：3Dの下に「🧾 材料拾い・見積もり」 */
function mtMainBtn(){if(document.getElementById("zdock")||document.getElementById("mtMainB"))return;const lb=document.getElementById("legbar");if(!lb)return;const b=document.createElement("button");b.id="mtMainB";b.textContent="🧾 材料拾い・見積もり・単価表";
 b.style.cssText="width:100%;min-height:46px;border-radius:14px;background:#b45309;color:#fff;font-weight:800;font-size:15.5px;border:0;margin:6px 0";b.onclick=()=>mtOpen();lb.before(b)}
/* 曲げ共有の画面のボタンは「📋 まとめ」の中に入れた（drain.js の drSumOpen）。ここでは出さない */
})();
