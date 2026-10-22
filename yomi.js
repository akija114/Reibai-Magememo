/* 冷媒配管の曲げ共有：yomi.js（📋 読み取りチェック）
   「全部自動」で図面から読めた物を、✓／✗の表と「3Dにできた度 ○%」で出す。%は項目ごとの大事さで点数を付けた目安（正解の3Dと比べた精度ではない）
   足りない物には、どうすれば直るかを書く */
function yomiItems(r,n){const P=typeof PLAN!=="undefined"?PLAN:null,lab=P&&typeof shitaLabels==="function"?shitaLabels(P):[],gx=new Set(lab.filter(l=>l.n[0]==="X").map(l=>l.n)),gy=new Set(lab.filter(l=>l.n[0]==="Y").map(l=>l.n));
 const rows=(typeof st!=="undefined"&&st.rows)||[],chT=!!(P&&P.chList&&P.chList.length);
 return[
  [25,"室内機",!!r.ind,r.ind?String(r.ind):"","図面の室内機の近くに品番（例 PL-ZRP80HA5）が無いか、機器の色の線になっていません。「🧱 柱・壁・梁・室内機を置く」で手で置けます"],
  [25,"冷媒配管のルート",rows.length>1,rows.length>1?`曲げ ${rows.length-1}か所・${(rows.reduce((a,x)=>a+(+x.l||0),0)).toLocaleString()}mm`:"","冷媒管の線（ピンク・冷媒管のレイヤー）が読めませんでした。「📄 図面」でなぞって作れます"],
  [10,"配管の高さ（FL+○○）",!!r.pipeH,r.pipeH?"FL+"+r.pipeH:"","配管の近くに「FL+3200」などの文字がありません。仮の高さで作っています"],
  [10,"室外機",!!r.out,r.out?`${fmt(r.out[0])}×${fmt(r.out[1])}`:"","図面に室外機が見つからないので、仮の場所に置いています。3Dで動かしてください"],
  [10,"天井高（CH=○○）",chT,chT?"CH "+fmt(r.CH):"","図面に「CH=3000」などの文字が無いので、仮の天井高です"],
  [10,"壁",n.nw>0||n.nl>0,`壁 ${n.nw}本${n.nl?"・軽量壁 "+n.nl+"枚":""}`,"壁の線が読めませんでした。DXFなら壁の種類の線を表示にしてください"],
  [5,"通り芯",gx.size>=1&&gy.size>=1,[...gx].concat([...gy]).join("・"),"X1・Y1などの通り芯の記号が見つかりません"],
  [5,"扉・窓・点検口・機器",(n.nd+n.nwn+n.ni+n.neq.length)>0,[n.nd?"扉 "+n.nd:"",n.nwn?"窓 "+n.nwn:"",n.ni?"点検口 "+n.ni:"",n.neq.length?"機器 "+n.neq.length:""].filter(Boolean).join("・"),"扉・窓などは見つかりませんでした（無くても配管は作れます）"]]}
function yomiCheck(r,n){
 const it=yomiItems(r,n),pc=Math.round(it.reduce((a,x)=>a+(x[2]?x[0]:0),0));
 const col=pc>=80?"#15803d":pc>=50?"#b45309":"#dc2626",ov=document.createElement("div");
 ov.style.cssText="position:fixed;inset:0;z-index:60;background:rgba(15,23,42,.45);display:flex;align-items:flex-end;justify-content:center";
 ov.innerHTML=`<div style="background:#fff;color:#0f172a;width:100%;max-width:560px;max-height:82vh;overflow:auto;border-radius:18px 18px 0 0;padding:14px 14px calc(env(safe-area-inset-bottom,0px) + 14px)">
  <div style="display:flex;align-items:center;gap:10px"><div style="font-weight:800;font-size:16px;flex:1">📋 読み取りチェック</div><div style="font-weight:900;font-size:26px;color:${col}">${pc}%</div></div>
  <div style="height:8px;border-radius:4px;background:#e2e8f0;margin:6px 0 2px"><div style="height:8px;border-radius:4px;width:${pc}%;background:${col}"></div></div>
  <div style="font-size:12px;color:#64748b">図面から3Dに要る物がどれだけ読めたかの目安です（大事な物ほど点数が大きい）</div>
  ${it.map(([w,nm,ok,v,how])=>`<div style="display:flex;gap:8px;padding:9px 0;border-top:1px solid #e2e8f0"><div style="font-size:18px;line-height:1.2">${ok?"✅":"⚠️"}</div><div style="flex:1;min-width:0"><div style="font-weight:800;font-size:14.5px">${nm}<span style="color:#94a3b8;font-weight:600;font-size:12px">（${w}点）</span></div><div style="font-size:13px;color:${ok?"#334155":"#b45309"};line-height:1.5">${ok?String(v).replace(/[<>&]/g,""):how}</div></div></div>`).join("")}
  <button data-x style="width:100%;height:48px;margin-top:8px;border-radius:12px;border:0;background:#0369a1;color:#fff;font:inherit;font-weight:800;font-size:15px">3Dを見る</button></div>`;
 document.body.appendChild(ov);ov.onclick=e=>{if(e.target===ov||e.target.closest("[data-x]"))ov.remove()};
 return pc}
