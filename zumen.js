/* 冷媒配管の曲げ共有：zumen.js（図面アプリ） */
/* ===== 図面（PDF・写真）を読み込んで、なぞって配管にする／CADのPDFは線に吸い付き・壁と天井高を自動で拾う ===== */
let PLAN=null;   // {img:canvas, W,H, segs:[[x1,y1,x2,y2]], texts:[{s,x,y}], mmpp, den, route:[[x,y]], walls:[], CH, H, map, show}
$("#planBtn").innerHTML=`<img alt="" src="${NICO.plan}" style="width:100%;height:100%;display:block;pointer-events:none">`;
$("#planBtn").onclick=()=>openDraw();
/* 仕様書（PDF）から 形名・能力・電源・外形・配管径・電線 を読む */
function parseSpecLines(lines){
 const L=lines.map(x=>x.replace(/\s+/g,"")),all=L.join("\n"),g=(re,i)=>{const m=all.match(re);return m?m[i||1]:""},R={};
 R.name=g(/形名[^A-Z\n]*([A-Z][A-Z0-9]*-[A-Z0-9-]+)/);
 R.cool=g(/冷房能力(?:kW)?([\d.]+)/);R.src=g(/電源(?:単相|三相)[・･]?\d+V/,0)||g(/電源([^\n]*?\d+V)/);
 {const m=all.match(/外形寸法[^\n]*?(\d+)[×x](\d+)(?:\(\+(\d+)\))?[×x](\d+)/);if(m)R.dim={h:+m[1],w:+m[2],eb:+(m[3]||0),d:+m[4]}}
 R.liq=g(/液管外径[^φΦ\n]*[φΦ]([\d.]+)/);R.gas=g(/ガス管外径[^φΦ\n]*[φΦ]([\d.]+)/);R.drain=g(/ドレン接続口サイズ[−\-ー－]*([^\n]*)/).replace(/^[−\-ー－]+/,"");
 R.kg=g(/(?:製品)?質量(?:kg)?(\d+(?:\.\d+)?)/);R.wire=g(/(?:VVF|CV|内外接続電線)[^φΦ\n]*[φΦ]([\d.]+)/);R.wn=g(/内外接続電線[^\d\n]*(\d)本/);R.press=g(/設計圧力は?([\d.]+)MPa/);
 return R}
function openSpecReader(o){
 const inp=document.createElement("input");inp.type="file";inp.accept="application/pdf,.pdf";
 inp.onchange=async()=>{const f=inp.files&&inp.files[0];if(!f)return;toast("仕様書を読んでいます…");
  try{const lib=await loadPdfJs(),doc=await lib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;let lines=[];
   for(let n=1;n<=Math.min(doc.numPages,3);n++){const pg=await doc.getPage(n),tc=await pg.getTextContent(),rows=[];
    tc.items.forEach(it=>{if(!it.str||!it.str.trim())return;const y=it.transform[5],x=it.transform[4];let r=rows.find(q=>Math.abs(q.y-y)<3);if(!r){r={y,a:[]};rows.push(r)}r.a.push([x,it.str])});
    rows.sort((a,b)=>b.y-a.y).forEach(r=>lines.push(r.a.sort((p,q)=>p[0]-q[0]).map(z=>z[1]).join(" ")))}
   const R=parseSpecLines(lines);specSheet(R,o)}catch(e){toast("PDFを読めませんでした："+(e&&e.message||e))}};
 toast("iPhoneの「ファイル」が開きます。保存してある仕様書のPDFを選んでください");inp.click()}
function specSheet(R,o){
 const ov=document.createElement("div");ov.style.cssText="position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center";
 const key=Object.keys(CAS2M).find(k=>R.name&&CAS2M[k].n.replace(/\s/g,"").toUpperCase().split("/").some(x=>R.name.toUpperCase().indexOf(x.slice(0,8))>=0&&x.length>=6));
 const row=(k,v)=>v?`<tr><td style="padding:5px 8px;color:#64748b;white-space:nowrap">${k}</td><td style="padding:5px 8px;font-weight:700">${v}</td></tr>`:"";
 const D=R.dim;
 ov.innerHTML=`<div style="background:var(--card,#fff);width:100%;max-width:520px;max-height:85vh;overflow:auto;border-radius:18px 18px 0 0;padding:16px">
 <div style="font-weight:800;font-size:17px;margin-bottom:8px">📄 仕様書から読み取った内容</div>
 <table style="width:100%;font-size:14px;border-collapse:collapse">${row("形名",R.name)}${row("冷房能力",R.cool?R.cool+" kW":"")}${row("電源",R.src)}${row("外形（高さ×幅×奥行）",D?D.h+" × "+D.w+(D.eb?"（＋"+D.eb+"）":"")+" × "+D.d+" mm":"")}${row("液管",R.liq?"φ"+R.liq:"")}${row("ガス管",R.gas?"φ"+R.gas:"")}${row("ドレン",R.drain)}${row("質量",R.kg?R.kg+" kg":"")}${row("内外接続電線",R.wire?"φ"+R.wire+" mm"+(R.wn?" × "+R.wn+"本":""):"")}${row("設計圧力",R.press?R.press+" MPa":"")}</table>
 <div style="font-size:12.5px;color:#64748b;margin:8px 0">${R.name||R.liq||R.gas?"読み取れた項目だけ表示しています。":"読み取れる文字がありませんでした（スキャン画像のPDFかもしれません）。"}</div>
 <div id="spBtns" style="display:flex;flex-direction:column;gap:8px"></div></div>`;
 document.body.appendChild(ov);const B=ov.querySelector("#spBtns"),add=(t,f,c)=>{const b=document.createElement("button");b.className="sharebtn";b.style.cssText="width:100%;margin:0"+(c?";background:"+c+";color:#fff":"");b.textContent=t;b.onclick=f;B.appendChild(b)};
 const close=()=>ov.remove();ov.onclick=e=>{if(e.target===ov)close()};
 if(key&&o)add("この機種（"+CAS2M[key].n+"）を選ぶ",()=>{o.m=key;bldChanged();close();renderBld()},"#2563eb");
 if(R.liq&&R.gas)add("配管サイズ（液φ"+R.liq+"・ガスφ"+R.gas+"）をいまの配管に合わせる",()=>{const idx=v=>{v=parseFloat(v);let b=-1,bd=0.3;SIZES.forEach((z,i)=>{const d=Math.abs(z[1]-v);if(d<bd){bd=d;b=i}});return b},gi=idx(R.gas),li=idx(R.liq);
  if(gi<0||li<0){toast("このアプリにないサイズです");return}const liq=drawnKind()==="液";st.s=liq?li:gi;st.ps=liq?gi:li;save();try{render()}catch(e){}toast("配管サイズを合わせました");close()});
 add("閉じる",close);
}
function loadPdfJs(){return new Promise((res,rej)=>{if(window.pdfjsLib)return res(window.pdfjsLib);const sc=document.createElement("script");
 sc.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";sc.onload=()=>{try{pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";res(pdfjsLib)}catch(e){rej(e)}};sc.onerror=rej;document.head.appendChild(sc)})}
function openDraw(){
 let ov=$("#planOv");
 if(!ov){ov=document.createElement("div");ov.id="planOv";
  ov.style.cssText="position:fixed;inset:0;z-index:80;background:#0f172a;display:flex;flex-direction:column;color:#fff;font-family:-apple-system,'Hiragino Sans',sans-serif";
  const bt=(id,t,st2)=>`<button id="${id}" style="height:40px;padding:0 10px;border-radius:12px;font-weight:800;font-size:13px;background:#ffffffee;color:#0f172a;flex:none;${st2||""}">${t}</button>`;
  ov.innerHTML=`<div style="display:flex;gap:6px;align-items:center;padding:calc(env(safe-area-inset-top,0px) + 8px) 8px 6px;overflow-x:auto">
   <label style="height:40px;padding:0 12px;border-radius:12px;font-weight:800;font-size:13px;background:#2563eb;display:flex;align-items:center;flex:none">📄 図面を開く<input id="plFile" type="file" accept="application/pdf,image/*,.dxf,application/dxf,image/vnd.dxf,application/octet-stream" style="display:none"></label>
   ${bt("plPrev","◀")}<span id="plPg" style="font-size:13px;flex:none"></span>${bt("plNext","▶")}<span style="flex:1"></span>${bt("plHelp","❓ 使い方","background:#fbbf24")}${bt("plClose","✕ 閉じる")}</div>
   <div id="plSteps" style="display:flex;gap:5px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:0 8px 6px;flex:none"></div>
   <div id="plInfo" style="padding:0 10px 4px;font-size:12px;line-height:1.4;color:#cbd5e1;max-height:2.9em;overflow:hidden;flex:none"></div>
   <div id="plPanel" style="display:none;max-height:30vh;overflow-y:auto;flex:none;background:#f8fafc;color:#0f172a;padding:10px;font-size:13.5px"></div>
   <div id="plWrap" style="flex:1;min-height:40vh;position:relative;overflow:hidden;background:#e2e8f0"><canvas id="plCv" style="position:absolute;inset:0;width:100%;height:100%;touch-action:none"></canvas>
   <div id="wzBal" style="position:absolute;top:8px;left:8px;right:8px;max-height:calc(100% - 16px);overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-y;border-radius:16px;display:none;z-index:3"></div>
   <div id="plFloat" style="position:absolute;top:8px;right:8px;display:none;gap:6px;z-index:2"><button id="plFUndo" style="height:40px;padding:0 12px;border-radius:12px;font-weight:800;font-size:13px;background:#fff;color:#0f172a;box-shadow:0 2px 8px rgba(0,0,0,.25)">↩ 1つ戻す</button><button id="plFCancel" style="height:40px;padding:0 12px;border-radius:12px;font-weight:800;font-size:13px;background:#dc2626;color:#fff;box-shadow:0 2px 8px rgba(0,0,0,.25)">✖ やめる</button></div></div>
   <div id="wzBar" style="display:none;gap:8px;padding:8px 8px calc(env(safe-area-inset-bottom,0px) + 8px);background:#0f172a;flex:none">
    <button id="wzBack" style="flex:1;white-space:nowrap;height:52px;border-radius:14px;font-weight:800;font-size:16px;background:#fff;color:#0f172a">◀ 戻る</button>
    <button id="wzCancel" style="flex:1.2;white-space:nowrap;height:52px;border-radius:14px;font-weight:800;font-size:15px;background:#dc2626;color:#fff">✖ キャンセル</button>
    <button id="wzNext" style="flex:1.4;white-space:nowrap;height:52px;border-radius:14px;font-weight:800;font-size:15px;background:#16a34a;color:#fff">次へ ▶</button></div>
   <div id="plBar" style="display:flex;gap:6px;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:8px 8px calc(env(safe-area-inset-bottom,0px) + 8px);background:#0f172a;flex:none">
    ${bt("plWz","🧭 かんたん画面","background:#16a34a;color:#fff")}${bt("plMove","✋ 動かす")}${bt("plCal","📏 縮尺を2点で")}${bt("plTrace","✏️ なぞる")}${bt("plBld","🏗 壁・柱・室内機・穴を置く","background:#f97316;color:#fff")}${bt("plFind","🔍 室内機を探す","background:#7c3aed;color:#fff")}${bt("plList","📋 墨出しリスト","background:#0891b2;color:#fff")}${bt("plCol","🎨 色で絞る")}${bt("plUndo","1つ戻す")}${bt("plClear","消す")}
    <select id="plDen" style="flex:none;height:40px;border-radius:12px;font-weight:800;font-size:13px;padding:0 6px;color:#0f172a;background:#fff"><option value="">縮尺</option><option>30</option><option>50</option><option>60</option><option>100</option><option>150</option><option>200</option></select>
    <button data-ph="den" style="flex:none;width:30px;height:40px;border-radius:12px;background:#334155;color:#fff;font-weight:800">?</button>
    <label style="display:flex;align-items:center;gap:4px;font-size:12px;flex:none;white-space:nowrap"><span data-ph="H" style="text-decoration:underline dotted">配管の高さ ⓘ</span><input id="plH" inputmode="numeric" style="width:64px;height:36px;border-radius:10px;border:0;padding:0 6px;font-size:14px;color:#0f172a;background:#fff">mm</label>
    <label style="display:flex;align-items:center;gap:4px;font-size:12px;flex:none;white-space:nowrap"><span data-ph="CH" style="text-decoration:underline dotted">天井高 ⓘ</span><input id="plCH" inputmode="numeric" style="width:64px;height:36px;border-radius:10px;border:0;padding:0 6px;font-size:14px;color:#0f172a;background:#fff">mm</label>
    ${bt("plMake","🧊 3Dにする","background:#16a34a;color:#fff")}</div>`;
  document.body.appendChild(ov);
  $("#plClose").onclick=()=>{ov.style.display="none"};
  $("#plHelp").onclick=()=>planHelp();
  $("#wzBack").onclick=()=>wzBack();$("#wzNext").onclick=()=>wzNext();$("#wzCancel").onclick=()=>wzCancel();
  $("#plWz").onclick=()=>{W.on=true;try{localStorage.removeItem("pbmPlanClassic")}catch(e){}const pn=$("#plPanel");if(pn)pn.style.display="none";PV.bldPanelOn=false;W.img=PLAN&&PLAN.img;wzStart()};
  ov.addEventListener("click",e=>{const h=e.target.closest&&e.target.closest("[data-ph]");if(h){e.preventDefault();e.stopPropagation();planHelp(h.dataset.ph)}},true);
  $("#plFUndo").onclick=()=>planUndo1();$("#plFCancel").onclick=()=>planCancel();
  $("#plInfo").onclick=()=>{const e=$("#plInfo");e.style.maxHeight=e.style.maxHeight==="none"?"2.9em":"none";setTimeout(planDraw,30)};
  $("#plFile").onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)planLoad(f);e.target.value=""};
  $("#plPrev").onclick=()=>{if(PLAN&&PLAN.pdf&&PLAN.page>1)planPage(PLAN.page-1)};$("#plNext").onclick=()=>{if(PLAN&&PLAN.pdf&&PLAN.page<PLAN.pdf.numPages)planPage(PLAN.page+1)};
  const md=m=>{PV.mode=m;PV.cal=[];BT.pts=[];["plMove","plCal","plTrace","plCol"].forEach(id=>$("#"+id).style.background=({plMove:"move",plCal:"cal",plTrace:"trace",plCol:"col"}[id]===m?"#fbbf24":"#ffffffee"));$("#plBld").style.background=m==="bld"?"#fbbf24":"#f97316";$("#plBld").style.color=m==="bld"?"#0f172a":"#fff";
   if(m==="bld")planBldPanel();else if(PV.bldPanelOn){$("#plPanel").style.display="none";PV.bldPanelOn=false}planInfo();planDraw()};
  $("#plBld").onclick=()=>md("bld");
  $("#plCol").onclick=()=>{if(PLAN&&PLAN.fcol){PLAN.fcol=null;toast("色の絞り込みを解除しました");md("trace")}else md("col")};
  $("#plMove").onclick=()=>md("move");$("#plCal").onclick=()=>md("cal");$("#plTrace").onclick=()=>md("trace");PV.md=md;
  $("#plUndo").onclick=()=>planUndo1();
  $("#plClear").onclick=()=>{if(PLAN){PLAN.route=[];planDraw()}};
  $("#plDen").onchange=e=>{if(!PLAN)return;const d=+e.target.value;if(d&&PLAN.ptpx){PLAN.den=d;PLAN.mmpp=25.4/72/PLAN.ptpx*d;planWalls();planDraw()}else if(d)toast("写真の図面は「縮尺を2点で」で合わせてください")};
  $("#plH").onchange=e=>{if(PLAN)PLAN.H=Math.max(0,parseInt(e.target.value)||0)};$("#plCH").onchange=e=>{if(PLAN)PLAN.CH=Math.max(0,parseInt(e.target.value)||0)};
  $("#plMake").onclick=planMake;
  $("#plFind").onclick=()=>planFindUI();$("#plList").onclick=()=>planListUI();
  planGestures();
 }
 ov.style.display="flex";PV.md(PLAN&&PLAN.mmpp?"trace":"move");planFit();planDraw();
 W.img=PLAN&&PLAN.img;wzStart();
}
/* ===== かんたん図面（順番に進むだけ）：①図面 → ②縮尺 → ③原点 → ④何を追加？ → 各作業（戻る・次へ・キャンセルだけ） ===== */
const W={on:true,step:"open",sub:"",img:null,s0:0,cand:null,pick:null,im:""};
try{if(localStorage.getItem("pbmPlanClassic")==="1")W.on=false}catch(e){}
const WZ_ADD=[["auto","⚡","全部自動で読む","縮尺・原点・壁・室内機・室外機・配管・穴をまとめて"],["read","🤖","品番と配管から機器・配管を作る","品番・CH・配管の色と高さから、室内機・室外機・配管をまとめて作ります"],["kabe","📏","配管の位置（壁から何mm）","配管をタップ → 両側の壁から配管の芯まで。全部まとめて一覧も"],["sumi","🎯","機械の位置（通り芯から）","床の墨出し用：室内機・室外機の芯と吊りボルトを、X・Y通り芯から何mm"],["wallpick","🧱","壁をお手本で取り込む","壁の2本線の間をタップ → 同じ厚さの壁を画面の範囲から全部"],["ind","❄️","室内機を追加","図面の室内機の四角をタップ → 同じ大きさをまとめて置けます"],["ins","🔲","点検口を追加","図面の点検口の四角をタップ → 同じ大きさをまとめて置けます"],["eq","🌀","機器を追加（ロスナイ・箱）","機種を選んで、置く所の真ん中をタップ"],["wall","🧱","壁を追加","部屋をぐるっと／1本ずつ／図面の壁を取り込む"],["beam","🟫","梁を追加","梁の中心線を2点タップ"],["col","🏛","柱を追加","柱の角を対角に2点タップ"],["out","🌀","室外機を追加","室外機の真ん中をタップ（機種を選んで）"],["hole","🕳️","配管を通す穴を追加","壁の上の穴の位置をタップ"],["spot","🟩","室外機の置き場を追加","置く場所の範囲を対角に2点タップ"],["door","🚪","扉を追加","壁の上の扉の真ん中をタップ（引き戸・開き戸）"],["tenjo","📐","天井高を分ける","部屋の中をタップ → その部屋だけ天井高（CH=2400 など）"],["win","🪟","窓を追加","図面の窓をまとめて／端と端を2点タップ"],["rack","⚡","電気ラックを追加","ラックの端と端を2点タップ（幅・高さを入れる）"],["drt","💧","ドレンを実際のルートで","現場で通したルートを図面の上でなぞる"]];
function wzShowWalls(){return !W.on||W.step==="t:auto"||(W.step==="t:wall"&&BT.tool==="rng")}
function calApply(v){const P=PLAN;if(!P||PV.cal.length<2)return false;const d=Math.hypot(PV.cal[1][0]-PV.cal[0][0],PV.cal[1][1]-PV.cal[0][1]);
 if(!(v>0&&d>0)){toast("長さを数字で入れてください");return false}P.mmpp=v/d;P.den=0;P.autoScale=0;try{$("#plDen").value=""}catch(e){}try{planWalls()}catch(e){}PV.cal=[];toast("縮尺を合わせました（この2点＝"+fmt(v)+"mm）");if(W.on)setTimeout(wzCalDone,10);planDraw();return true}
function askNum(title,def,ok,cancel){const ov=document.createElement("div");ov.style.cssText="position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center";
 ov.innerHTML=`<div style="background:#fff;color:#0f172a;width:100%;max-width:520px;border-radius:18px 18px 0 0;padding:16px 16px calc(env(safe-area-inset-bottom,0px) + 16px)"><b style="font-size:17px">${title}</b>
  <div style="display:flex;align-items:center;gap:8px;margin:12px 0"><input id="askV" inputmode="numeric" value="${uVal(def)}" style="flex:1;height:52px;border-radius:12px;border:2px solid #2563eb;padding:0 12px;font-size:22px;font-weight:800"><b>mm</b></div>
  <div style="display:flex;gap:8px"><button id="askNo" style="flex:1;height:50px;border-radius:12px;font-weight:800;font-size:16px;background:#e2e8f0;border:0">やめる</button><button id="askOk" style="flex:2;height:50px;border-radius:12px;font-weight:800;font-size:16px;background:#16a34a;color:#fff;border:0">決定</button></div></div>`;
 document.body.appendChild(ov);const i=ov.querySelector("#askV");setTimeout(()=>{try{i.focus();i.select()}catch(e){}},50);
 ov.querySelector("#askOk").onclick=()=>{const v=uParse(i.value);ov.remove();ok(v)};ov.querySelector("#askNo").onclick=()=>{ov.remove();cancel&&cancel()}}
function wzMem(){try{return JSON.parse(localStorage.getItem("pbmPlanMem")||"{}")||{}}catch(e){return{}}}
function wzKey(){const P=PLAN;return P&&P.fkey?P.fkey+"|"+(P.page||1):""}
function wzSave(){const P=PLAN,k=wzKey();if(!k||!P||!P.mmpp)return;const m=wzMem();m[k]={mmpp:P.mmpp,den:P.den||0,org:P.org||null,CH:P.CH||0,t:Date.now()};
 const ks=Object.keys(m).sort((a,b)=>(m[b].t||0)-(m[a].t||0));ks.slice(30).forEach(x=>delete m[x]);try{localStorage.setItem("pbmPlanMem",JSON.stringify(m))}catch(e){}}
function wzMode(m,tool){PV.mode=m;PV.cal=[];BT.pts=[];if(tool)BT.tool=tool}
function wzApplyUI(){const on=W.on,ids=["plBar","plInfo","plSteps","plPanel","plFloat"];
 ids.forEach(id=>{const e=$("#"+id);if(!e)return;if(on)e.style.display="none";else if(id==="plBar"||id==="plInfo")e.style.display=id==="plBar"?"flex":"block";else if(id==="plSteps")e.style.display="flex"});
 const b=$("#wzBar"),bl=$("#wzBal");if(b)b.style.display=on?"flex":"none";if(bl)bl.style.display=on?"block":"none"}
function wzStart(){wzApplyUI();if(!W.on)return;const P=PLAN;
 if(!P||!P.img){W.step="open";wzMode("move")}else if(W.img!==P.img){W.img=null;wzSync();return}
 else if(!P.mmpp)wzGo("scale");else if(!P.org)wzGo("org");else wzGo("menu");wzRender()}
function wzSync(){if(!W.on)return;const P=PLAN;if(!P||!P.img||W.img===P.img)return;W.img=P.img;
 if(st.bld&&st.bld.length&&st.bldKey!==wzKey())setTimeout(()=>sheetMsg(`<b style="font-size:17px">🧹 前に置いた物が残っています</b><p>室内機・壁など <b>${st.bld.length}個</b> が残っています。この図面用に、消してから始めますか？</p>`,
  [["消してから始める",()=>{st.bld=[];st.bldXf=null;st.bldKey=wzKey();BT.stack=[];bldChanged();wzRender();planDraw();toast("前の物を消しました")},"#dc2626","#fff"],["残して続ける",()=>{st.bldKey=wzKey();save()}]]),400);
 const m=wzMem()[wzKey()];
 if(W.resume&&m&&m.mmpp&&m.org){W.resume=false;P.mmpp=m.mmpp;P.den=m.den||0;P.autoScale=0;try{$("#plDen").value=m.den||""}catch(e){}try{planWalls()}catch(e){}P.org=m.org.slice();if(m.CH)P.CH=m.CH;
  toast("前の図面の続きから開きました（縮尺・原点もそのまま）");setTimeout(()=>wzGo("menu"),0);return}
 W.resume=false;
 /* 図面に「1/60」などが書いてあって、前回の縮尺と違う時は、図面の表記を使う（前回の値が古い・間違いのことがある） */
 if(m&&m.mmpp&&P.denTxt&&P.den&&m.den!==P.den){if(m.org&&!P.org)P.org=m.org.slice();setTimeout(()=>wzGo("scale"),0)}
 else if(m&&m.mmpp){P.mmpp=m.mmpp;P.den=m.den||0;P.autoScale=0;try{$("#plDen").value=m.den||""}catch(e){}try{planWalls()}catch(e){}if(m.org)P.org=m.org.slice();if(m.CH)P.CH=m.CH;
  toast("前回の縮尺"+(m.den?"（1/"+m.den+"）":"")+"が入っています。合っていれば「この縮尺でOK」");setTimeout(()=>wzGo("scale"),0)}
 else setTimeout(()=>wzGo("scale"),0)}
function wzGo(step,sub){if(!step.startsWith("t:"))W.fold=false;W.step=step;W.sub=sub||"";W.cand=null;W.pick=null;
 if(step==="org")wzMode("bld","org");
 else if(step==="cal")wzMode("cal");
 else if(step.startsWith("t:")){W.s0=BT.stack.length;const k=step.slice(2);
  const tl={kabe:"kabe",sumi:"sumi",tenjo:"ceiltap",rack:"rack",drt:"drt",win:"win",wallpick:"wallpick",ind:"indpick",ins:"inspick",eq:"eqone",wall:"room",beam:"beam",col:"col",out:"out",hole:"hole",spot:"spot",door:"door",auto:"none",del:"del",pipe:"pipeind"}[k];if(k==="pipe"){W.psub="ind";W.pi=-1;W.ph=[];W.po=-1}if(k==="sumi")SM.sel=-1;W.sel=[];W.delStack=[];W.autoRes=null;wzMode("bld",tl);if(k==="ind"||k==="ins")W.sub="pick"}
 else wzMode("move");
 wzRender();planDraw()}
function wzInp(k,l,u){return`<label style="display:inline-flex;align-items:center;gap:4px;font-size:13px;margin:3px 8px 3px 0">${l}<input data-wz="${k}" inputmode="numeric" value="${uVal(BT[k])}" style="width:70px;height:36px;border-radius:9px;border:1.5px solid #cbd5e1;padding:0 6px;font-size:15px">${u||"mm"}</label>`}
function wzBtn(id,t,bg,fg,ex){return`<button id="${id}" style="min-height:44px;padding:6px 12px;border-radius:12px;font-weight:800;font-size:14px;background:${bg||"#fff"};color:${fg||"#0f172a"};border:1.5px solid ${bg&&bg!=="#fff"?bg:"#94a3b8"};box-shadow:0 1px 3px rgba(0,0,0,.12);${ex||""}">${t}</button>`}
function wzRender(){const bl=$("#wzBal");if(!bl||!W.on)return;const P=PLAN,s=W.step;let h="",title="",bk=true,nx=true,nxT="次へ ▶";
 const cnt=k=>st.bld.filter(o=>o.k===k).length,sess=()=>{let n=0;for(let i=W.s0;i<BT.stack.length;i++)n+=BT.stack[i];return n};
 if(s==="open"){title="① 図面を開く";bk=false;nx=false;
  h=(PL_LAST?`<div style="background:#ecfdf5;border-radius:12px;padding:8px;margin-bottom:8px">${wzBtn("wzResume","↩ 前の図面の続きから","#16a34a","#fff","width:100%")}<div style="font-size:12.5px;color:#166534;margin-top:4px">${PL_LAST.name.replace(/[<>&]/g,"")}（${new Date(PL_LAST.t).toLocaleDateString("ja-JP")}に開いた図面）。置いた物・縮尺・原点もそのまま続けて編集できます。</div></div><p style="font-size:13px;color:#475569;margin-bottom:4px">ちがう図面を開く時はこちら：</p>`:"")+`<p>図面のPDFかDXFを開きます。<b>CADのDXF</b>がいちばん正確です（実寸なので縮尺合わせもいりません）。CADから書き出したPDF・写真の図面も開けます。</p>${wzBtn("wzOpen","📄 図面を開く（ファイルを選ぶ）","#2563eb","#fff","width:100%")}<p style="font-size:12.5px;color:#64748b;margin-top:6px">iPhoneの「ファイル」が開くので、保存してあるPDFを選んでください。</p>`}
 else if(s==="scale"){title="② 縮尺を決める";nx=!!(P&&P.mmpp);
  const den=P&&P.den,canDen=P&&P.ptpx;
  h=`<p>図面の<b>1mmが実際の何mmか</b>を決めます。ここがズレると、壁も室内機も全部ズレます。</p>`+
   (P&&P.mmpp?`<div style="background:#ecfdf5;border-radius:10px;padding:8px;margin-bottom:8px">いまの縮尺：<b>${den?"1/"+den:P.dxf?"DXF（実寸）":"2点で合わせ済み"}</b>${P.autoScale?"（通り芯の寸法と一致）":den&&P.denTxt?"（図面の表記から）":""}</div>${wzBtn("wzOkScale",planCanAuto()?"✅ この縮尺でOK → ⚡ 残りは全部自動":"✅ この縮尺でOK（次へ）","#16a34a","#fff","width:100%;margin-bottom:6px")+(planCanAuto()?`<div style="font-size:12.5px;color:#475569;margin:-2px 0 8px">縮尺だけ確かめてください。OKを押すと、原点・壁・室内機・室外機・配管・穴を自動で作ります。</div>`:"")}`:`<div style="background:#fef2f2;border-radius:10px;padding:8px;margin-bottom:8px;color:#b91c1c">縮尺がまだ決まっていません</div>`)+
   (canDen?`<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:6px"><span style="font-size:13px">縮尺を選ぶ：</span>${[30,50,60,100,150,200].map(d=>`<button data-den="${d}" style="height:40px;padding:0 10px;border-radius:10px;font-weight:800;border:1.5px solid #cbd5e1;background:${den===d?"#fbbf24":"#fff"}">1/${d}</button>`).join("")}</div>`:"")+
   wzBtn("wzCal","📏 長さの分かる2点で合わせる（いちばん確実）","#2563eb","#fff","width:100%;margin-top:4px")}
 else if(s==="cal"){title="② 縮尺：2点で合わせる";nx=false;
  h=PV.cal.length<2?`<p>長さの分かる2点（<b>通り芯と通り芯</b>、寸法の書いてある壁の端など）を、1点ずつタップ。</p><p style="font-size:14px;font-weight:800;color:#2563eb">置いた点：${PV.cal.length} / 2</p><p style="font-size:12.5px;color:#475569">2本指で拡大すると正確に置けます。間違えたら「◀ 戻る」。</p>`:
   `<p>✅ 2点を置きました。<b>この2点の実際の長さ</b>を入れて「決定」。</p><div style="display:flex;align-items:center;gap:8px;margin:6px 0"><input id="wzCalV" inputmode="numeric" placeholder="例：3200" style="flex:1;min-width:0;width:100%;height:50px;border-radius:12px;border:2px solid #2563eb;padding:0 12px;font-size:20px;font-weight:800"><b>mm</b></div>${wzBtn("wzCalOk","✅ 決定（縮尺を合わせる）","#16a34a","#fff","width:100%")}<p style="font-size:12.5px;color:#475569;margin-top:4px">2点目の位置を直すなら、もう一度タップ。</p>`}
 else if(s==="org"){title="③ 原点（0,0）を決める";nx=!!(P&&P.org);
  const m=wzMem()[wzKey()];
  h=`<p>位置を測る<b>基準の点</b>です。現場で測れる所（<b>柱の角・部屋の角・通り芯の交点</b>）をタップ。壁や室内機の位置は、ここから何mmで出ます。</p>`+
   (!st.nopipe&&!(st.bld||[]).length?`<p style="font-size:12.5px;color:#b45309">※いまの配管と位置を合わせたい時は、配管の始まり（起点の室内機）の場所を原点にしてください。「🔧 配管を自動で引く」を使う時は、どこでも大丈夫です。</p>`:"")+
   (P&&P.org?`<div style="background:#ecfdf5;border-radius:10px;padding:8px">✅ 原点を置きました（緑の十字）。置き直すなら、もう一度タップ。よければ「次へ」。</div>`:"")+
   (m&&m.org&&!(P&&P.org)?wzBtn("wzOldOrg","前回の原点を使う","#16a34a","#fff","width:100%;margin-top:6px"):"")}
 else if(s==="menu"){title="④ 何を追加しますか？";nxT="🧊 3Dで見る ▶";
  const c={ins:cnt("ins"),ind:cnt("ind"),wall:cnt("wall"),beam:cnt("beam"),col:cnt("col"),out:cnt("out"),hole:cnt("hole"),spot:cnt("spot")};
  h=`<p style="margin-bottom:6px">追加したいものを選んでください。終わったら「3Dで見る」。</p><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${WZ_ADD.map(([k,i,t])=>`<button data-add="${k}" style="min-height:56px;padding:6px;border-radius:12px;font-weight:800;font-size:14px;background:#fff;border:1.5px solid #cbd5e1;text-align:left;line-height:1.25"><span style="font-size:20px">${i}</span> ${t}${c[k]?`<br><span style="font-size:11.5px;color:#16a34a">置いた数：${c[k]}</span>`:""}</button>`).join("")}</div>
   ${wzBtn("wzPipeGo","🔧 室内機から配管を自動で引く（穴を通して室外機へ）","#0f766e","#fff","width:100%;margin-top:8px")}
   <div style="display:flex;gap:6px;margin-top:8px">${wzBtn("wzAutoGo","✨ 図面から自動で読み込む","#7c3aed","#fff","flex:1")}${wzBtn("wzDelGo","🗑 間違いを消す","#dc2626","#fff","flex:1")}</div>
   <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${st.bld.length?wzBtn("wzClearAll","🧹 置いた物を全部消す"):""}${wzBtn("wzDL","🧩 図面のダクト・衛生配管を3Dに")}${wzBtn("wzList","📋 墨出しリスト")}${wzBtn("wzRedo","📐 縮尺・原点をやり直す")}${wzBtn("wzClassic","🔧 細かい道具（なぞる等）")}</div>`}
 else if(s==="t:auto"){title="✨ 図面から自動で読み込む";nxT="✅ 終わり ▶";const R=W.autoRes;
  const ck=(k,l,v)=>`<label style="display:inline-flex;align-items:center;gap:6px;margin:2px 12px 2px 0;font-weight:800"><input type="checkbox" data-ak="${k}" ${v!==false?"checked":""} style="width:22px;height:22px">${l}</label>`;
  h=`<p>図面の線から、<b>壁・柱・室内機</b>を自動で見つけて置きます。間違っていたら、あとで「🗑 間違いを消す」で消せます。</p><div>${ck("aw","🧱 壁",W.aw)}${ck("ac","🏛 柱",W.ac)}${ck("ai","❄️ 室内機",W.ai)}</div>`+wzInp("wh","壁の高さ（0＝天井まで）")+
   `<div style="display:flex;gap:6px;margin-top:6px">${wzBtn("wzAutoAll","図面ぜんぶから","#7c3aed","#fff","flex:1")}${wzBtn("wzAutoRng","範囲を2点で選ぶ","","","flex:1")}</div>`+
   (BT.tool==="autorng"?`<p style="color:#7c3aed;font-weight:800;margin-top:6px">範囲の対角を2点タップしてください（${BT.pts.length}/2）</p>`:"")+
   `<p style="font-size:12.5px;color:#64748b;margin-top:6px">室内機は、大きさが登録してある機種と合うものだけ自動で置きます。見つからない時は「室内機を追加」で四角を1つタップしてください。</p>`+
   (R?`<div style="background:#ecfdf5;border-radius:10px;padding:8px;margin-top:6px">読み込んだ数：壁 ${R.nw}・柱 ${R.nc}・室内機 ${R.ni}（「◀ 戻る」で取り消し）</div>`:"")}
 else if(s==="t:kabe"){title="📏 配管の位置（壁から何mm）";nxT="✅ 終わり ▶";h=kbHTML()}
 else if(s==="t:sumi"){title="🎯 機械の位置（通り芯から）";nxT="✅ 終わり ▶";h=smHTML()}
 else if(s==="t:wallpick"){title="🧱 壁をお手本で取り込む";nxT="✅ 終わり ▶";
  h=`<p style="font-size:13.5px;line-height:1.55">① 取り込みたい範囲が画面に入るように、図面を動かす（拡大・縮小）<br>② 壁の<b>2本の線の間</b>を1か所タップ<br>→ その壁と<b>同じ厚さ</b>の壁を、画面に見えている範囲から全部取り込みます。</p><p style="font-size:12px;color:#64748b;margin-top:4px">厚さの違う壁（間仕切りなど）は、その壁の間をもう一度タップ。違う物を拾ったら「🗑 間違いを消す」で消せます。</p>`}
 else if(s==="t:pipe"){title="🔧 配管を自動で引く";nxT="✅ 終わり ▶";const ind=st.bld[W.pi],cntH=(W.ph||[]).length;
  const stepL=(n,t,on,done)=>`<div style="display:flex;gap:6px;align-items:center;padding:4px 0;${on?"font-weight:800;color:#0f766e":done?"color:#16a34a":"color:#94a3b8"}">${done?"✅":on?"👉":"・"} ${n} ${t}</div>`;
  h=stepL("①","室内機をタップ",W.psub==="ind",W.pi>=0)+stepL("②","通す穴をタップ（何個でも・なくてもOK）",W.psub==="hole",W.psub==="out"||W.psub==="done")+stepL("③","室外機をタップ",W.psub==="out",W.psub==="done");
  if(W.psub==="ind")h+=`<p style="font-size:13px;color:#475569">配管を出す室内機を図面でタップしてください。</p>`;
  if(W.psub==="model")h+=`<p style="color:#b91c1c;font-weight:800">この室内機は機種が決まっていません（配管口の位置が分からない）。機種を選んでください。</p><select id="wzPipeM" style="height:42px;border-radius:10px;font-size:14px;font-weight:700;max-width:100%"><option value="">機種を選ぶ</option>${CAS2_ORDER.map(x=>`<option value="${x}">${(CAS2_MAKERS.find(z=>z[0]===CAS2M[x].mk)||["",""])[1]} ${CAS2M[x].n}（${CAS2M[x].kind}）</option>`).join("")}</select> ${wzBtn("wzPipeBox","決定","#0f766e","#fff")}`;
  if(W.psub==="hole")h+=`<p style="font-size:13px;color:#475569">配管を通す穴（スリーブ）を、通る順にタップ。選んだ穴：<b>${cntH}個</b></p><div style="display:flex;gap:6px">${cntH?wzBtn("wzPipeHoleOk","穴はこれでOK → 室外機へ","#0f766e","#fff","flex:1"):wzBtn("wzPipeNoHole","穴は通さない → 室外機へ","","","flex:1")}</div>`;
  if(W.psub==="out")h+=`<p style="font-size:13px;color:#475569">つなぐ室外機をタップ。タップすると配管ルートを作って3Dで見せます。</p>`;
  h+=`<div style="margin-top:6px">${wzBtn("wzPipeRedo","最初から選び直す")}</div><p style="font-size:12px;color:#64748b;margin-top:6px">配管は90°曲げで、穴は壁に直角に通します。作ったあと、行の長さや曲げは普通に直せます。</p>`}
 else if(s==="t:del"){title="🗑 間違いを消す";nxT="✅ 終わり ▶";const sel=(W.sel||[]).filter(i=>st.bld[i]);
  h=`<div style="display:flex;gap:4px;margin-bottom:6px">${[["del","1つずつ"],["delrng","範囲でまとめて"]].map(([t,l])=>`<button data-dt="${t}" style="flex:1;height:40px;border-radius:10px;font-weight:800;font-size:13px;border:1.5px solid #cbd5e1;background:${BT.tool===t?"#fbbf24":"#fff"}">${l}</button>`).join("")}</div>`+
   `<p>${BT.tool==="del"?"消したい物（壁・柱・室内機など）を<b>タップ</b>すると赤くなります。":"消したい範囲の<b>対角を2点</b>タップ。中にある物が全部赤くなります。"+` （${BT.pts.length}/2）`}</p>`+
   (sel.length?`<div style="background:#fef2f2;border-radius:10px;padding:8px;margin:6px 0">${sel.length===1?bldDesc(st.bld[sel[0]]):sel.length+"個 選んでいます"}</div><div style="display:flex;gap:6px">${wzBtn("wzDelOk","🗑 "+(sel.length>1?sel.length+"個 ":"")+"消す","#dc2626","#fff","flex:1")}${wzBtn("wzDelNo","選ぶのをやめる","","","flex:1")}</div>`:"")+
   `<p style="font-size:12.5px;color:#64748b;margin-top:6px">消したあと「◀ 戻る」で元に戻せます。「✖ キャンセル」でこの作業で消した物を全部戻します。</p>`}
 else if(s.startsWith("t:")){const k=s.slice(2),A=WZ_ADD.find(z=>z[0]===k)||["","",""];title=A[1]+" "+A[2];nxT="✅ 終わり ▶";
  const n=sess(),done=n?`<div style="font-size:12.5px;color:#16a34a;margin-top:6px">この作業で置いた数：${n}（「戻る」で1つ取り消し、「キャンセル」で全部取り消し）</div>`:"";
  const irBtn=()=>`<div style="display:flex;gap:6px;margin:6px 0">${wzBtn("wzIr","↻ 向きを90°回す（今 "+(W.ir||0)+"°）","#fff7ed","#9a3412","flex:1")}</div>`,
   lastInd=()=>{for(let i=st.bld.length-1;i>=0;i--)if(st.bld[i].k==="ind")return i;return -1},rotLast=()=>n&&lastInd()>=0?wzBtn("wzIrLast","↻ 最後に置いた室内機を90°回す","","","width:100%;margin-top:6px")+'<div style="font-size:12px;color:#9a3412;margin-top:2px">図面のオレンジの矢印＝配管の出る向き</div>':"";
  const mdlSel=()=>`<label style="display:block;font-size:13px;margin:4px 0">機種：<select id="wzIm" style="height:40px;border-radius:10px;font-size:14px;font-weight:700;max-width:100%"><option value="">（機種なし・四角の大きさの箱）</option>${CAS2_MAKERS.map(([mm,mn])=>`<optgroup label="${mn}">`+CAS2_ORDER.filter(x=>CAS2M[x].mk===mm).map(x=>`<option value="${x}"${x===W.im?" selected":""}>${CAS2M[x].n}（${CAS2M[x].kind}）</option>`).join("")+"</optgroup>").join("")}</select></label>`;
  const szB=()=>`<div style="display:flex;gap:6px;align-items:center;margin:6px 0;flex-wrap:wrap"><b style="font-size:13px">大きさ：</b>${[300,450,600].map(v=>`<button data-isz="${v}" style="height:38px;padding:0 12px;border-radius:10px;font-weight:800;font-size:14px;border:1.5px solid #cbd5e1;background:${(W.isz||450)===v?"#99f6e4":"#fff"}">${v}角</button>`).join("")}</div>`;
  if(k==="eq"){const CH0=(st.gnd&&st.gnd.ch)||P.CH||2700;if(W.eqy==null)W.eqy=CH0+50;
   h=`<p>置きたい機器を選んで、図面の上の<b>機器の真ん中をタップ</b>してください。</p><label style="display:block;font-size:13px;margin:4px 0">機種：<select id="wzEqM" style="height:40px;border-radius:10px;font-size:14px;font-weight:700;max-width:100%"><optgroup label="ロスナイ（三菱電機）">${VENT_ORDER.map(x=>`<option value="${x}"${W.eqm===x?" selected":""}>${VENTM[x].n}（${VENTM[x].A}×${VENTM[x].B}×${VENTM[x].C}）</option>`).join("")}</optgroup><option value="box"${W.eqm==="box"?" selected":""}>箱（大きさを入れる）</option></select></label>`+
    (W.eqm==="box"?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0">${[["eqw","幅"],["eqd","奥行"],["eqh","高さ"]].map(([q,l])=>`<label style="font-size:12.5px">${l}<input data-eq="${q}" inputmode="numeric" value="${W[q]||({eqw:600,eqd:600,eqh:300})[q]}" style="width:70px;height:36px;border-radius:8px;border:1.5px solid #cbd5e1;padding:0 6px;font-weight:700">mm</label>`).join("")}</div>`:"")+
    `<label style="display:block;font-size:12.5px;margin:4px 0">下端の高さ FL+<input data-eq="eqy" inputmode="numeric" value="${W.eqy}" style="width:80px;height:36px;border-radius:8px;border:1.5px solid #cbd5e1;padding:0 6px;font-weight:700">mm（天井の上に置く時は 天井高＋50 くらい）</label>`+
    `<div style="display:flex;gap:6px;margin:6px 0">${wzBtn("wzEqR","↻ 向きを90°回す（今 "+(W.eqr||0)+"°）","#fff7ed","#9a3412","flex:1")}</div>`+done}
  else if(k==="ins"){
   if(W.sub==="confirm"){const g=W.cand||[],r=W.pick;const w=r?insSnap((r.x1-r.x0)*P.mmpp):0,d=r?insSnap((r.y1-r.y0)*P.mmpp):0;
    h=`<p>${fmt(w)}×${fmt(d)} の点検口が <b style="font-size:17px;color:#dc2626">${g.length}個</b> 見つかりました（図面で<b style="color:#dc2626">赤く</b>光っている所）。${W.photo?"<br><small>写真から読んだので、大きさは目安です</small>":""}</p>
     <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${wzBtn("wzInsAll","🔲 "+g.length+"個ぜんぶ置く","#0d9488","#fff","flex:1 1 100%")}${g.length>1?wzBtn("wzInsOnly","この1つだけ","","","flex:1"):""}${wzBtn("wzInsRepick","違う・選び直す","","","flex:1")}</div>`}
   else if(W.sub==="notfound")h=`<p style="color:#b91c1c;font-weight:800">タップした所に、点検口くらいの大きさの四角が見つかりませんでした。</p>${szB()}<div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">${wzBtn("wzInsTap","🔲 タップした所に1つ置く","#0d9488","#fff")}${wzBtn("wzInsRepick","別の所をタップし直す")}</div>`;
   else if(W.sub==="one")h=`<p><b>点検口の真ん中をタップ</b>すると1つ置きます。</p>${szB()}<button id="wzInsPickMode" style="background:none;border:0;color:#2563eb;font-weight:800;font-size:13px;padding:4px 0">← 図面の四角から選ぶ方法に戻る</button>`+done;
   else h=`<p><b>図面の上の、点検口の四角を1つタップ</b>してください。同じ大きさの四角をまとめて探します。</p><p style="font-size:12.5px;color:#475569">2本指で拡大すると選びやすいです。点検口は天井の高さに置きます（天井高を分けた部屋は、その高さ）。</p><button id="wzInsOne" style="background:none;border:0;color:#2563eb;font-weight:800;font-size:13px;padding:4px 0">四角がない図面なら → タップした所に1つずつ置く</button>`+done}
  else if(k==="ind"){
   if(W.sub==="pick")h=`<p><b>図面の上の、室内機の四角を1つタップ</b>してください。同じ大きさの四角をまとめて探します。</p><p style="font-size:12.5px;color:#475569">2本指で拡大すると選びやすいです。</p><p style="font-size:12.5px;color:#475569">写真の図面でも、色の付いた室内機の記号（赤紫・青など）ならタップで見つけます。</p><button id="wzOne" style="background:none;border:0;color:#2563eb;font-weight:800;font-size:13px;padding:4px 0">四角がない図面なら → タップした所に1台ずつ置く</button>`+rotLast()+done;
   else if(W.sub==="notfound")h=`<p style="color:#b91c1c;font-weight:800">タップした所に、室内機くらいの大きさの四角が見つかりませんでした。</p><p style="font-size:13px">（図面の室内機が四角の線や色のかたまりで描かれていないと見つかりません）</p>${mdlSel()}${irBtn()}<div style="display:flex;flex-direction:column;gap:6px;margin-top:6px">${wzBtn("wzTapPlace","❄️ タップした所に1台置く","#2563eb","#fff")}${wzBtn("wzRepick","別の所をタップし直す")}</div>`;
   else if(W.sub==="confirm"){const g=W.cand||[],r=W.pick;const w=r?Math.round((r.x1-r.x0)*P.mmpp/10)*10:0,d=r?Math.round((r.y1-r.y0)*P.mmpp/10)*10:0;
    h=`<p>${fmt(w)}×${fmt(d)} の四角が <b style="font-size:17px;color:#dc2626">${g.length}個</b> 見つかりました（図面で<b style="color:#dc2626">赤く</b>光っている所）。${W.photo?"<br><small>写真から読んだので、大きさは目安です。機種を確かめてください</small>":""}</p>${mdlSel()}${irBtn()}
     <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">${wzBtn("wzAll","❄️ "+g.length+"台ぜんぶ置く","#2563eb","#fff","flex:1 1 100%")}${g.length>1?wzBtn("wzOnly","この1台だけ","","","flex:1"):""}${wzBtn("wzRepick","違う・選び直す","","","flex:1")}</div>`}
   else h=`<p><b>室内機の真ん中をタップ</b>すると1台置きます。</p>${mdlSel()}${irBtn()}${W.im?"":wzInp("ih","箱の高さ")}<button id="wzPickMode" style="background:none;border:0;color:#2563eb;font-weight:800;font-size:13px;padding:4px 0">← 図面の四角から選ぶ方法に戻る</button>`+done}
  else if(k==="wall"){const seg=[["room","🏠 部屋をぐるっと"],["wall","🧱 1本ずつ"],["rng","📥 図面の壁を取り込む"]];
   h=wzBtn("kzLgsAuto","🧱 軽量鉄骨＋ボードの壁を図面から置く","#475569","#fff","width:100%;margin-bottom:6px")+`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px">${seg.map(([t,l])=>`<button data-wt="${t}" style="height:40px;padding:0 9px;border-radius:10px;font-weight:800;font-size:13px;border:1.5px solid #cbd5e1;background:${BT.tool===t?"#fbbf24":"#fff"}">${l}</button>`).join("")}</div>`+
    `<p>${BT.tool==="room"?"部屋の<b>内側の角</b>を順番にタップ。全部置いたら下の「壁を作る」。":BT.tool==="wall"?"壁の面の<b>端と端</b>を2点タップ。":"範囲の<b>対角を2点</b>タップ。その中の図面の壁（青い帯）をまとめて壁にします。"}</p>`+
    `<div style="display:flex;gap:4px;margin:2px 0 4px">${[["","普通の壁"],["lgs","軽量（スタッド）＋ボード"]].map(([t,l])=>`<button data-wk="${t}" style="flex:1;height:38px;border-radius:10px;font-weight:800;font-size:13px;border:1.5px solid #cbd5e1;background:${(BT.wk||"")===t?"#fbbf24":"#fff"}">${l}</button>`).join("")}</div>`+
    (BT.wk==="lgs"?`<div style="font-size:13px;margin:2px 0">スタッド：${[45,50,65,75,90,100].map(v=>`<button data-ls="${v}" style="height:34px;min-width:40px;margin:2px;border-radius:9px;font-weight:800;border:1.5px solid #cbd5e1;background:${BT.ls===v?"#fbbf24":"#fff"}">${v}</button>`).join("")}</div>
     <div style="font-size:13px;margin:2px 0;display:flex;gap:6px;flex-wrap:wrap;align-items:center">ボード（12.5mm）：${wzBtn("wzLbl","片側 "+BT.lbl+"枚")}${wzBtn("wzLbr","反対側 "+BT.lbr+"枚")}</div>
     <div style="font-size:13px;margin:2px 0">→ 壁の厚み <b>${fmt(btTh())}</b>mm（3Dでスタッド@455・ランナー・ボードを出します）</div>`:wzInp("t","厚み"))+wzInp("wh","高さ（0＝天井まで）")+
    (BT.tool==="wall"?`<div>${wzBtn("wzSide","厚みを付ける側："+(BT.side>0?"右":"左")+"（押して切替）")}</div>`:"")+
    (BT.tool==="room"?`<div style="font-size:13px;margin-top:4px">置いた角：${BT.pts.length}</div>${BT.pts.length>=3?wzBtn("wzRoom","✅ 角を置き終わった → 壁を作る","#16a34a","#fff","width:100%;margin-top:4px"):""}`:"")+done}
  else if(k==="beam")h=`<p>梁の<b>中心線の端と端</b>を2点タップ。</p>${wzInp("bw","梁の幅")}${wzInp("bd","梁せい")}${wzInp("bb","梁下の高さ（床から）")}<p style="font-size:12.5px;color:#64748b">梁下の高さ：床から梁の下の面まで。天井より上なら天井高より大きい数字（いまの天井高 ${fmt((P&&P.CH)||st.gnd.ch||2400)}）。</p>`+done;
  else if(k==="col")h=kzHTML("col",done);
  else if(k==="tenjo"||k==="rack"||k==="drt"||k==="win")h=kzHTML(k,done);
  else if(k==="out")h=`<p>室外機の<b>真ん中</b>をタップ。</p><label style="display:block;font-size:13px;margin:4px 0">機種：<select id="wzOm" style="height:40px;border-radius:10px;font-size:14px;font-weight:700;max-width:100%">${Object.keys(OUTM).map(x=>`<option value="${x}"${x===BT.om?" selected":""}>${OUTM[x].n}（${OUTM[x].w}×${OUTM[x].d}×高さ${OUTM[x].h}）</option>`).join("")}</select></label>
   <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">${wzBtn("wzORot","向き：正面が"+["下","左","上","右"][((BT.or||0)/90)%4]+"（押して回す）")}${wzInp("oy","置く高さ（床から）")}</div>`+done;
  else if(k==="hole")h=(cnt("wall")?`<p>壁の上の、<b>穴を開ける位置</b>をタップ。</p>`:`<p style="color:#b91c1c"><b>先に壁が必要です。</b>「キャンセル」→「壁を追加」で壁を置いてから来てください。</p>`)+wzInp("hd","穴の直径")+wzInp("hy","穴の中心の高さ（床から）")+done;
  else if(k==="spot")h=`<p>室外機を置く<b>場所の範囲</b>を、対角に2点タップ（バルコニーや架台など）。</p>`+done;
  else if(k==="door")h=wzBtn("kzDoorAuto","🚪 図面の扉マークからまとめて置く","#b45309","#fff","width:100%;margin-bottom:6px")+`<div style="display:flex;gap:4px;margin-bottom:6px">${[["slide","引き戸"],["swing","開き戸"]].map(([t,l])=>`<button data-dt2="${t}" style="flex:1;height:40px;border-radius:10px;font-weight:800;font-size:14px;border:1.5px solid #cbd5e1;background:${BT.dt===t?"#fbbf24":"#fff"}">${l}</button>`).join("")}</div>`+
   (cnt("wall")?`<p>壁の上の、<b>扉の真ん中</b>をタップ。壁に吸い付きます。</p>`:`<p style="color:#b91c1c"><b>先に壁が必要です。</b>「キャンセル」→「壁を追加」で壁を置いてから来てください。</p>`)+wzInp("dw","扉の幅")+wzInp("dh","扉の高さ")+done}
 bl.innerHTML=`<div style="background:#fff;color:#0f172a;border-radius:16px;padding:10px 12px;box-shadow:0 6px 24px rgba(0,0,0,.28);font-size:14px;line-height:1.5;position:relative;touch-action:pan-y">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><b style="font-size:16px;flex:1">${title}</b><button id="wzFold" style="height:30px;padding:0 9px;border-radius:9px;background:#e2e8f0;font-weight:800;font-size:12px">${W.fold?"▼ 開く":"▲ 小さく"}</button></div>
  ${W.fold&&s==="t:kabe"&&typeof kbMini==="function"?kbMini():""}${W.fold&&s==="t:sumi"&&typeof smMini==="function"?smMini():""}<div style="display:${W.fold?"none":"block"}">${h}</div></div><div style="width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;border-top:12px solid #fff;margin-left:28px"></div>`;
 const B=$("#wzBack"),N=$("#wzNext");if(B){B.disabled=!bk;B.style.opacity=bk?1:.4}if(N){N.disabled=!nx;N.style.opacity=nx?1:.4;N.textContent=nxT}
 const on=(id,f)=>{const e=$("#"+id);if(e)e.onclick=f};if(s==="t:kabe")kbBind();if(typeof kzBind==="function")kzBind();if(s==="t:sumi")smBind();
 on("wzFold",()=>{W.fold=!W.fold;if(!W.fold&&typeof KB!=="undefined")KB.foc=null;wzRender();planDraw()});
 on("wzOpen",()=>$("#plFile").click());on("wzResume",()=>plResume());
 on("wzCalOk",()=>{const v=uParse(($("#wzCalV")||{}).value||"");calApply(v)});
 on("wzOkScale",()=>{P.userScale=1;wzSave();if(planCanAuto()){planAutoAll();return}wzGo(P.org?"menu":"org")});on("wzCal",()=>wzGo("cal"));
 bl.querySelectorAll("[data-den]").forEach(b=>b.onclick=()=>{const d=+b.dataset.den;if(P&&P.ptpx){P.den=d;P.autoScale=0;P.mmpp=25.4/72/P.ptpx*d;try{$("#plDen").value=d}catch(e){}try{planWalls()}catch(e){}wzRender();planDraw();toast("縮尺を1/"+d+"にしました")}});
 on("wzOldOrg",()=>{const m=wzMem()[wzKey()];if(m&&m.org){P.org=m.org.slice();wzRender();planDraw()}});
 bl.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const k=b.dataset.add;if(k==="read"){planReadAll();return}if(k==="auto"){planAutoAll();return}wzGo("t:"+k)});
 on("wzAutoGo",()=>wzGo("t:auto"));
 on("wzDL",()=>{const P=PLAN;if(!P||!P.org){toast("先に原点を決めてください");return}let D=null;try{D=planDrawLines()}catch(e){console.warn(e)}
  const n=D?DL_KINDS.filter(([k])=>(D[k]&&D[k].length)||(D[k+"S"]&&D[k+"S"].length)):[];if(!n.length){toast(P.dxf?"図面にダクト・衛生配管の画層が見つかりませんでした":"PDFではダクト・衛生配管を見分けられません（DXFなら画層の名前で出せます）");return}
  st.dln=D;save();try{if(T){build3D();T.dirty=true}}catch(e){}toast("図面の"+n.map(([k,nm])=>nm).join("・")+"を3Dに出しました（丸ダクト・角ダクト・配管）。3Dの下のボタンで表示・非表示")});on("wzPipeGo",()=>wzGo("t:pipe"));
 on("wzClearAll",()=>sheetMsg(`<b style="font-size:17px">🧹 置いた物を全部消しますか？</b><p>壁・柱・室内機・室外機など ${st.bld.length}個を消します。</p>`,[["全部消す",()=>{st.bld=[];st.bldXf=null;st.bldKey="";BT.stack=[];bldChanged();wzRender();planDraw();toast("全部消しました")},"#dc2626","#fff"],["やめる"]]));
 on("wzPipeBox",()=>{const e=$("#wzPipeM");const v=e&&e.value;if(!v){toast("機種を選んでください");return}const o=st.bld[W.pi];if(o){o.m=v;st.bld=normBld(st.bld);bldChanged();W.psub="hole";BT.tool="pipehole";wzRender()}});
 on("wzPipeNoHole",()=>{W.psub="out";BT.tool="pipeout";wzRender()});on("wzPipeHoleOk",()=>{W.psub="out";BT.tool="pipeout";wzRender()});
 on("wzPipeRedo",()=>{W.psub="ind";W.pi=-1;W.ph=[];W.po=-1;BT.tool="pipeind";wzRender();planDraw()});on("wzDelGo",()=>wzGo("t:del"));
 bl.querySelectorAll("[data-ak]").forEach(c=>c.onchange=()=>{W[c.dataset.ak]=c.checked});
 on("wzAutoAll",()=>{BT.tool="none";BT.pts=[];wzAuto(null,null)});on("wzAutoRng",()=>{BT.tool="autorng";BT.pts=[];wzRender()});
 bl.querySelectorAll("[data-dt]").forEach(b=>b.onclick=()=>{BT.tool=b.dataset.dt;BT.pts=[];W.sel=[];wzRender();planDraw()});
 on("wzDelOk",()=>wzDel(W.sel||[]));on("wzDelNo",()=>{W.sel=[];wzRender();planDraw()});
 on("wzList",()=>wzGo("t:sumi"));
 on("wzRedo",()=>{if(P){P.org=null}wzGo("scale")});
 on("wzClassic",()=>{W.on=false;try{localStorage.setItem("pbmPlanClassic","1")}catch(e){}wzApplyUI();PV.md("move");toast("細かい道具の画面です。下の「🧭 かんたん画面」で戻れます")});
 on("wzOne",()=>{W.sub="one";BT.tool="indone";BT.pts=[];wzRender()});on("wzPickMode",()=>{W.sub="pick";BT.tool="indpick";wzRender()});
 on("wzAll",()=>wzPlaceCand(W.cand||[]));
 on("wzInsAll",()=>wzPlaceIns(W.cand||[]));
 {const s=$("#wzEqM");if(s){if(!W.eqm)W.eqm=s.value;s.onchange=()=>{W.eqm=s.value;wzRender()}}}on("wzEqR",()=>{W.eqr=((W.eqr||0)+90)%360;wzRender()});
 bl.querySelectorAll("[data-eq]").forEach(i=>i.oninput=()=>{const v=uParse(i.value);if(isFinite(v))W[i.dataset.eq]=Math.round(v)});on("wzInsOnly",()=>wzPlaceIns([W.pick]));on("wzInsRepick",()=>{W.sub="pick";W.cand=null;W.pick=null;W.tap=null;BT.tool="inspick";wzRender();planDraw()});
 on("wzInsOne",()=>{W.sub="one";BT.tool="insone";BT.pts=[];wzRender()});on("wzInsPickMode",()=>{W.sub="pick";BT.tool="inspick";wzRender()});
 on("wzInsTap",()=>{const p=W.tap;if(!p)return;insAt(p);W.sub="pick";W.tap=null;BT.tool="inspick";wzRender();planDraw()});
 bl.querySelectorAll("[data-isz]").forEach(b=>b.onclick=()=>{W.isz=+b.dataset.isz;wzRender()});
 on("wzIr",()=>{W.ir=((W.ir||0)+90)%360;wzRender();planDraw()});
 on("wzIrLast",()=>{let i=-1;for(let k=st.bld.length-1;k>=0;k--)if(st.bld[k].k==="ind"){i=k;break}if(i<0)return;st.bld[i].r=normT((st.bld[i].r||0)+90);st.bld=normBld(st.bld);bldChanged();planDraw();toast("向き "+st.bld[i].r+"°")});
 on("wzTapPlace",()=>{const p=W.tap;if(!p)return;const q=btW(p),o=bldNew("ind",{x:q[0],z:q[1]});o.m=W.im||"";o.r=W.ir||0;o.h=Math.max(10,BT.ih||300);btAdd([normBld([o])[0]]);W.sub="pick";W.tap=null;BT.tool="indpick";wzRender();planDraw();toast("室内機を置きました")});on("wzOnly",()=>wzPlaceCand([W.pick]));on("wzRepick",()=>{W.sub="pick";W.cand=null;W.pick=null;BT.tool="indpick";wzRender();planDraw()});
 {const e=$("#wzIm");if(e)e.onchange=()=>{W.im=e.value;wzRender()}}
 {const e=$("#wzOm");if(e)e.onchange=()=>{BT.om=e.value}}
 on("wzORot",()=>{BT.or=((BT.or||0)+90)%360;wzRender()});
 bl.querySelectorAll("[data-wt]").forEach(b=>b.onclick=()=>{BT.tool=b.dataset.wt;BT.pts=[];wzRender();planDraw()});
 on("wzSide",()=>{BT.side*=-1;wzRender()});
 bl.querySelectorAll("[data-wk]").forEach(b=>b.onclick=()=>{BT.wk=b.dataset.wk;wzRender()});
 bl.querySelectorAll("[data-ls]").forEach(b=>b.onclick=()=>{BT.ls=+b.dataset.ls;wzRender()});
 on("wzLbl",()=>{BT.lbl=(BT.lbl+1)%4;wzRender()});on("wzLbr",()=>{BT.lbr=(BT.lbr+1)%4;wzRender()});
 bl.querySelectorAll("[data-dt2]").forEach(b=>b.onclick=()=>{BT.dt=b.dataset.dt2;wzRender()});on("wzRoom",()=>{planBldRoom();wzRender()});
 bl.querySelectorAll("[data-wz]").forEach(i=>i.oninput=()=>{const v=uParse(i.value);if(isFinite(v))BT[i.dataset.wz]=Math.abs(v)});
}
/* 室内機：タップした所の四角 → 同じ大きさの四角をまとめる */
function wzPick(p){const P=PLAN;if(!P.rects){try{planAnalyze()}catch(e){}}const R=P.rects||[];
 const okSz=r=>{const a=(r.x1-r.x0)*P.mmpp,b=(r.y1-r.y0)*P.mmpp;return Math.max(a,b)>=250&&Math.max(a,b)<=2000&&Math.min(a,b)>=150};   // 室内機くらいの大きさの四角だけ（部屋の枠などは使わない）
 const inn=R.filter(r=>p[0]>=r.x0-2&&p[0]<=r.x1+2&&p[1]>=r.y0-2&&p[1]<=r.y1+2&&okSz(r));
 let r=inn.sort((a,b)=>(a.x1-a.x0)*(a.y1-a.y0)-(b.x1-b.x0)*(b.y1-b.y0))[0];
 if(!r){const tol=40/PV.z;let bd=1e9;R.forEach(q=>{const dx=Math.max(q.x0-p[0],0,p[0]-q.x1),dy=Math.max(q.y0-p[1],0,p[1]-q.y1),d=Math.hypot(dx,dy);if(d<tol&&d<bd&&okSz(q)){bd=d;r=q}})}
 if(!r){const ph=wzPickPhoto(p);if(ph){W.pick=ph;W.cand=[ph];W.sub="confirm";W.photo=1;wzGuessModel(ph);wzRender();planDraw();return}
  W.tap=p.slice();W.sub="notfound";wzRender();planDraw();return}
 W.photo=0;
 /* 室内機の記号は、外の大きい四角（パネル）より、内側にある本体の四角を選ぶことがあるので、いちばん外側の四角を優先 */
 const outer=inn.filter(q=>q!==r&&okSz(q)).sort((a,b)=>(b.x1-b.x0)*(b.y1-b.y0)-(a.x1-a.x0)*(a.y1-a.y0))[0];
 if(outer&&(outer.x1-outer.x0)<(r.x1-r.x0)*1.6)r=outer;
 const w0=(r.x1-r.x0),h0=(r.y1-r.y0),tl=Math.max(2,30/P.mmpp),same=q=>q.col===r.col&&((Math.abs((q.x1-q.x0)-w0)<tl&&Math.abs((q.y1-q.y0)-h0)<tl)||(Math.abs((q.x1-q.x0)-h0)<tl&&Math.abs((q.y1-q.y0)-w0)<tl));
 const g=[],tol2=300/P.mmpp;R.filter(same).forEach(q=>{const cx=(q.x0+q.x1)/2,cy=(q.y0+q.y1)/2;if(!g.some(z=>Math.hypot((z.x0+z.x1)/2-cx,(z.y0+z.y1)/2-cy)<tol2))g.push(q)});
 W.pick=r;W.cand=g;W.sub="confirm";
 wzGuessModel(r);wzRender();planDraw()}
/* 大きさから機種を推測（写真は線が太く大きさがずれるので、ゆるめに） */
function wzGuessModel(r){const P=PLAN,wm=(r.x1-r.x0)*P.mmpp,hm=(r.y1-r.y0)*P.mmpp,tol=W.photo?0.12:0.07,near=(a,b)=>Math.abs(a-b)/b<tol;let hit="",bd=1e9;
 Object.keys(CAS2M).forEach(k=>{const m=CAS2M[k];(m.bi?[[m.L,m.W],[m.L,m.W+65]]:[[m.pa,m.pb],[m.oa,m.ob],[m.L,m.W]]).forEach(([a,b])=>{[[a,b],[b,a]].forEach(([u,v])=>{if(near(wm,u)&&near(hm,v)){const d=Math.abs(wm-u)/u+Math.abs(hm-v)/v;if(d<bd){bd=d;hit=k}}})})});
 if(hit)W.im=hit}
/* 写真の図面：タップした所の「色のかたまり」から室内機の四角を探す（線のデータが無い時）。
   ・タップの近く（30cm以内）に色の付いた線（赤紫・青など）があれば、その色と同じ色の点だけを見る。無ければ黒っぽい線
   ・2ピクセルまでのすき間はつなげて、ひとかたまりの外枠（四角）を室内機の大きさにする。室内機くらいの大きさでなければ見つからない */
/* 点検口：図面の四角（300〜600角くらい）をタップ → 同じ大きさをまとめる。大きさは 300/450/600 に近ければそろえる */
const insSnap=v=>{for(const s of [300,450,600])if(Math.abs(v-s)/s<0.12)return s;return Math.round(v/10)*10};
function insAt(p){const q=btW(p),s=W.isz||450,o=bldNew("ins",{x:q[0],z:q[1]});o.w=s;o.d=s;btAdd([normBld([o])[0]]);toast("点検口を置きました")}
function wzPickIns(p){const P=PLAN;if(!P.rects){try{planAnalyze()}catch(e){}}const R=P.rects||[];
 const okSz=r=>{const a=(r.x1-r.x0)*P.mmpp,b=(r.y1-r.y0)*P.mmpp,mx=Math.max(a,b),mn=Math.min(a,b);return mx>=200&&mx<=900&&mn>=150&&mx/mn<1.8};
 const inn=R.filter(r=>p[0]>=r.x0-2&&p[0]<=r.x1+2&&p[1]>=r.y0-2&&p[1]<=r.y1+2&&okSz(r));
 let r=inn.sort((a,b)=>(b.x1-b.x0)*(b.y1-b.y0)-(a.x1-a.x0)*(a.y1-a.y0))[0];
 if(!r){const tol=40/PV.z;let bd=1e9;R.forEach(q=>{const dx=Math.max(q.x0-p[0],0,p[0]-q.x1),dy=Math.max(q.y0-p[1],0,p[1]-q.y1),d=Math.hypot(dx,dy);if(d<tol&&d<bd&&okSz(q)){bd=d;r=q}})}
 if(!r){const ph=wzPickPhoto(p,[200,900,150]);if(ph){W.pick=ph;W.cand=[ph];W.sub="confirm";W.photo=1;wzRender();planDraw();return}
  W.tap=p.slice();W.sub="notfound";wzRender();planDraw();return}
 W.photo=0;
 const w0=(r.x1-r.x0),h0=(r.y1-r.y0),tl=Math.max(2,25/P.mmpp),same=q=>q.col===r.col&&((Math.abs((q.x1-q.x0)-w0)<tl&&Math.abs((q.y1-q.y0)-h0)<tl)||(Math.abs((q.x1-q.x0)-h0)<tl&&Math.abs((q.y1-q.y0)-w0)<tl));
 const g=[],tol2=200/P.mmpp;R.filter(same).forEach(q=>{const cx=(q.x0+q.x1)/2,cy=(q.y0+q.y1)/2;if(!g.some(z=>Math.hypot((z.x0+z.x1)/2-cx,(z.y0+z.y1)/2-cy)<tol2))g.push(q)});
 W.pick=r;W.cand=g;W.sub="confirm";wzRender();planDraw()}
/* 全部自動で読む：室内機のまわり（6m以内）の、機器の色（青）の 300〜650角の四角を点検口として置く */
function planAutoIns(I){const P=PLAN;if(!P.rects){try{planAnalyze()}catch(e){}}const R=P.rects||[],mm=P.mmpp,c=I&&I.c;if(!c)return 0;
 const blue=col=>{const[r,g,b]=rgbOf(col);return b>150&&r<90&&g<90};
 const C=R.filter(r=>{const a=(r.x1-r.x0)*mm,b=(r.y1-r.y0)*mm,cx=(r.x0+r.x1)/2,cy=(r.y0+r.y1)/2;return blue(r.col)&&Math.max(a,b)<=650&&Math.min(a,b)>=300&&Math.max(a,b)/Math.min(a,b)<1.15&&Math.hypot(cx-c.cx,cy-c.cy)*mm<6000&&!(cx>c.x0&&cx<c.x1&&cy>c.y0&&cy<c.y1)});
 const L=insFromRects(C);if(L.length)btAdd(L);return L.length}
/* 全部自動で読む：室内機のほかの機器（ロスナイ・全熱交換器など）を箱で置く。
   品番（LGH-N15RXW3 など）の文字の近く（60cm以内）に「FL+3080下端」「FL+3370上端」があり、品番が機器の色の四角の中にある物 */
function planAutoEquip(r){const P=PLAN,mm=P.mmpp,T2=P.textsAll||P.texts||[],nm=t=>normTx(t.s).trim(),R=P.rects||[],out=[],CH=(st.gnd&&st.gnd.ch)||P.CH||2700;
 const blue=col=>{const[a,g,b]=rgbOf(col);return b>150&&a<90&&g<90};
 T2.forEach(t=>{const s=nm(t);if(!/^[A-Z]{2,5}[-‐−][A-Z0-9]{3,}/.test(s)||(r&&r.ind&&s.includes(r.ind)))return;
  if(/[□◻]\s*$/.test(s)||/^(VHS|VH|HS|NK|SH|NS|AB|VS)[-‐−]/.test(s))return;   // 吹出口・吸込口（「200□」）は機械ではない
  const vk=typeof ventFind==="function"?ventFind(s):"",V=vk?VENTM[vk]:null;
  const near=re=>T2.find(u=>re.test(nm(u))&&Math.hypot(u.x-t.x,u.y-t.y)*mm<700);const lo=near(/FL\s*[+＋]\s*\d{3,4}\s*下端/),hi=near(/FL\s*[+＋]\s*\d{3,4}\s*上端/);
  let y0=lo?+(nm(lo).match(/(\d{3,4})/)||[])[1]:0,y1=hi?+(nm(hi).match(/(\d{3,4})/)||[])[1]:0;
  const cx=t.x+(t.w||0)/2,cy=t.y-(t.h||0)/2;let rc=null,ba=1e18;
  R.forEach(q=>{if(!blue(q.col))return;const a=(q.x1-q.x0)*mm,b=(q.y1-q.y0)*mm;if(Math.max(a,b)<300||Math.max(a,b)>3500||Math.min(a,b)<200)return;if(cx<q.x0-2||cx>q.x1+2||cy<q.y0-2||cy>q.y1+2)return;const ar=a*b;if(ar<ba){ba=ar;rc=q}});
  /* 四角が閉じていない時（フランジの出っ張りなど）：近くの青い線をつながりごとにまとめて、品番を囲むかたまりの外形 */
  if(!rc){const lim=2200/mm,B=P.segs.filter(s2=>blue(s2[4])&&Math.hypot((s2[0]+s2[2])/2-cx,(s2[1]+s2[3])/2-cy)<lim),par=B.map((_,i)=>i),fd=i=>par[i]===i?i:(par[i]=fd(par[i])),tol=25/mm;
   for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++){const a=B[i],b=B[j];if([[a[0],a[1]],[a[2],a[3]]].some(p=>[[b[0],b[1]],[b[2],b[3]]].some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<tol)))par[fd(i)]=fd(j)}
   const G={};B.forEach((s2,i)=>{const k=fd(i);const g=G[k]=G[k]||{x0:1e9,y0:1e9,x1:-1e9,y1:-1e9,n:0};g.x0=Math.min(g.x0,s2[0],s2[2]);g.x1=Math.max(g.x1,s2[0],s2[2]);g.y0=Math.min(g.y0,s2[1],s2[3]);g.y1=Math.max(g.y1,s2[1],s2[3]);g.n++});
   Object.values(G).forEach(q=>{const a=(q.x1-q.x0)*mm,b=(q.y1-q.y0)*mm;if(q.n<4||Math.max(a,b)<300||Math.max(a,b)>3500||Math.min(a,b)<200)return;if(cx<q.x0||cx>q.x1||cy<q.y0||cy>q.y1)return;if(a*b<ba){ba=a*b;rc=q}})}
  /* 品番が機械の外にある（引出線で離して書いてある）時：近く（6m）の、機器の色の小さい四角（20〜80cm）で、ダクトの端がすぐ横にある物（換気扇など） */
  let far=false;if(!rc&&!V){const DS=(P.segAll||[]).filter(s2=>dxfCat&&dxfCat(s2[5])==="duct"),lim=6000/mm,tol=60/mm;
   /* 機器の色の線を、つながり（角が丸くて少しすき間があってもよい）ごとにまとめて外形を出す */
   const B=P.segs.filter(s2=>blue(s2[4])&&Math.hypot((s2[0]+s2[2])/2-cx,(s2[1]+s2[3])/2-cy)<lim),par=B.map((_,i)=>i),fd=i=>par[i]===i?i:(par[i]=fd(par[i]));
   for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++){const a=B[i],b=B[j];if(Math.max(a[0],a[2])<Math.min(b[0],b[2])-tol||Math.max(b[0],b[2])<Math.min(a[0],a[2])-tol||Math.max(a[1],a[3])<Math.min(b[1],b[3])-tol||Math.max(b[1],b[3])<Math.min(a[1],a[3])-tol)continue;
    if([[a[0],a[1]],[a[2],a[3]]].some(p=>[[b[0],b[1]],[b[2],b[3]]].some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<tol)))par[fd(i)]=fd(j)}
   const G={};B.forEach((s2,i)=>{const k=fd(i);const g=G[k]=G[k]||{x0:1e9,y0:1e9,x1:-1e9,y1:-1e9,n:0};g.x0=Math.min(g.x0,s2[0],s2[2]);g.x1=Math.max(g.x1,s2[0],s2[2]);g.y0=Math.min(g.y0,s2[1],s2[3]);g.y1=Math.max(g.y1,s2[1],s2[3]);g.n++});
   Object.values(G).forEach(q=>{const a=(q.x1-q.x0)*mm,b=(q.y1-q.y0)*mm;if(q.n<4||Math.max(a,b)>800||Math.min(a,b)<200||Math.max(a,b)/Math.min(a,b)>1.6)return;
    const qx=(q.x0+q.x1)/2,qy=(q.y0+q.y1)/2,d=Math.hypot(qx-cx,qy-cy);
    if(st.bld.some(o=>o.k==="eq"&&o.m&&Math.hypot(...((p2=>[o.x-p2[0],o.z-p2[1]])(btW([qx,qy]))))<600))return;
    /* すぐ横（40cm）でダクトが終わっている物だけ（点検口などとまちがえない） */
    const pad=400/mm,nearD=DS.some(s2=>[[s2[0],s2[1]],[s2[2],s2[3]]].some(p2=>p2[0]>q.x0-pad&&p2[0]<q.x1+pad&&p2[1]>q.y0-pad&&p2[1]<q.y1+pad&&!(p2[0]>q.x0&&p2[0]<q.x1&&p2[1]>q.y0&&p2[1]<q.y1)));if(!nearD)return;
    if(d<ba){ba=d;rc=q;far=true}})}
  if(!rc&&!V)return;   // 形も機種も分からない文字は置かない
  const c=rc?btW([(rc.x0+rc.x1)/2,(rc.y0+rc.y1)/2]):btW([cx,cy]);/* 前の読み込みで置いた機械があれば、今の読み方（高さ・機種・大きさ）で置き直す */const old=st.bld.find(o=>o.k==="eq"&&Math.hypot(o.x-c[0],o.z-c[1])<300);if(old&&out.length&&out.includes(old.n))return;
  const wD=rc?Math.round((rc.x1-rc.x0)*mm/10)*10:0,dD=rc?Math.round((rc.y1-rc.y0)*mm/10)*10:0;let o;
  if(V){/* 登録してある機種：本体の大きさは寸法表。向きは図面の外形（差し込み口込みの幅 A＋2J）に近い方 */
   const AA=V.A+2*V.J,rr=rc&&(Math.abs(wD-V.B)+Math.abs(dD-AA))<(Math.abs(wD-AA)+Math.abs(dD-V.B))?90:0;
   if(!y0)y0=y1?y1-V.C:CH+50;
   o=normBld([{k:"eq",m:vk,x:c[0],z:c[1],w:rr?V.B:V.A+2*V.J,d:rr?V.A+2*V.J:V.B,h:V.C,y:y0,r:rr,n:"ロスナイ "+V.n}])[0]}
  else{/* 登録していない機械：図面の外形の箱（高さは文字から、無ければ300） */
   /* 高さ：「FL+2400」だけの時（天井の換気扇など）は、それを下の面にする。本体の高さは 250（仮） */
   if(!y0){const fl=near(/^FL\s*[+＋]\s*\d{3,4}$/);if(fl)y0=+(nm(fl).match(/(\d{3,4})/)||[])[1]}
   const fan=/^(VD|FY|EK|EX|V|VL|BFHS|FHS|DVF)[-‐−]/.test(s);if(!y0)y0=CH+50;if(!(y1>y0))y1=y0+(fan?250:300);
   o=normBld([{k:"eq",x:c[0],z:c[1],w:wD,d:dD,h:y1-y0,y:y0,r:0,n:(fan?"換気扇 ":"")+s}])[0];
   /* 同じ所に点検口として置いてしまった四角は消す */
   st.bld=st.bld.filter(q=>!(q.k==="ins"&&Math.abs(q.x-o.x)<o.w/2&&Math.abs(q.z-o.z)<o.d/2))}
  if(old)st.bld=st.bld.filter(q=>q!==old);btAdd([o]);out.push(o.n)});
 return out}
function insFromRects(list){const P=PLAN,L=[],have=st.bld.filter(o=>o.k==="ins");
 list.forEach(r=>{if(!r)return;const q=btW([(r.x0+r.x1)/2,(r.y0+r.y1)/2]);if(have.some(o=>Math.hypot(o.x-q[0],o.z-q[1])<200)||L.some(o=>Math.hypot(o.x-q[0],o.z-q[1])<200))return;
  const o=bldNew("ins",{x:q[0],z:q[1]});o.w=insSnap((r.x1-r.x0)*P.mmpp);o.d=insSnap((r.y1-r.y0)*P.mmpp);L.push(normBld([o])[0])});return L}
function wzPlaceIns(list){const L=insFromRects(list);
 if(!L.length){toast("もう置いてあります");return}
 btAdd(L);W.sub="pick";W.cand=null;W.pick=null;BT.tool="inspick";wzRender();planDraw();
 toast("点検口を"+L.length+"個置きました。ほかの大きさもあればタップ、終わったら「✅ 終わり」")}
function wzPickPhoto(p,rng){const [LO,HI,LO2]=rng||[250,2000,150];const P=PLAN;if(!P||!P.img||!P.mmpp||!P.img.getContext)return null;
 const mm=P.mmpp,Rw=Math.min(700,Math.round(2300/mm)),x0=Math.max(0,Math.round(p[0])-Rw),y0=Math.max(0,Math.round(p[1])-Rw),x1=Math.min(P.img.width,Math.round(p[0])+Rw),y1=Math.min(P.img.height,Math.round(p[1])+Rw),w=x1-x0,h=y1-y0;if(w<8||h<8)return null;
 let D;try{D=P.img.getContext("2d").getImageData(x0,y0,w,h).data}catch(e){return null}
 const hue=(r,g,b)=>{const mx=Math.max(r,g,b),mn=Math.min(r,g,b),c=mx-mn;if(!c)return 0;let H=mx===r?((g-b)/c)%6:mx===g?(b-r)/c+2:(r-g)/c+4;return(H*60+360)%360};
 const px=(x,y)=>{const i=(y*w+x)*4;return[D[i],D[i+1],D[i+2]]},sat=c=>Math.max(...c)-Math.min(...c);
 /* 種の色：タップの近くの色の付いた点の色相（いちばん多い30°の区切り） */
 const r0=Math.max(4,Math.round(300/mm)),cx=Math.round(p[0])-x0,cy=Math.round(p[1])-y0,bins=new Array(12).fill(0);let nS=0;
 for(let y=Math.max(0,cy-r0);y<Math.min(h,cy+r0);y++)for(let x=Math.max(0,cx-r0);x<Math.min(w,cx+r0);x++){const c=px(x,y);if(sat(c)>=70&&Math.max(...c)>90){bins[Math.floor(hue(...c)/30)%12]++;nS++}}
 let mask;
 if(nS>=8){const bi=bins.indexOf(Math.max(...bins)),hc=bi*30+15,dh=a=>{const d=Math.abs(a-hc)%360;return Math.min(d,360-d)};mask=(x,y)=>{const c=px(x,y);return sat(c)>=55&&Math.max(...c)>80&&dh(hue(...c))<=35}}
 else mask=(x,y)=>{const c=px(x,y);return(c[0]+c[1]+c[2])/3<110&&sat(c)<60};
 /* かたまり：タップに近い点から、すき間2ピクセルまでつなげる */
 const seen=new Uint8Array(w*h),Q=[];let s0=-1,bd=1e9;
 for(let y=Math.max(0,cy-r0);y<Math.min(h,cy+r0);y++)for(let x=Math.max(0,cx-r0);x<Math.min(w,cx+r0);x++)if(mask(x,y)){const d=Math.hypot(x-cx,y-cy);if(d<bd){bd=d;s0=y*w+x}}
 if(s0<0)return null;
 let bx0=1e9,by0=1e9,bx1=-1,by1=-1,n=0;const lim=Math.round((HI+200)/mm);seen[s0]=1;Q.push(s0);
 while(Q.length){const k=Q.pop(),x=k%w,y=(k-x)/w;n++;if(x<bx0)bx0=x;if(x>bx1)bx1=x;if(y<by0)by0=y;if(y>by1)by1=y;
  if(bx1-bx0>lim||by1-by0>lim)return null;   // 大きすぎ＝壁などにつながっている
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const X=x+dx,Y=y+dy;if(X<0||Y<0||X>=w||Y>=h)continue;const j=Y*w+X;if(seen[j])continue;seen[j]=1;if(mask(X,Y))Q.push(j)}}
 const r={x0:x0+bx0,y0:y0+by0,x1:x0+bx1+1,y1:y0+by1+1,col:"photo"},a=(r.x1-r.x0)*mm,b=(r.y1-r.y0)*mm;
 if(n<20||Math.max(a,b)<LO||Math.max(a,b)>HI||Math.min(a,b)<LO2)return null;return r}
function wzPlaceCand(list){const P=PLAN,L=[],have=st.bld.filter(o=>o.k==="ind");
 list.forEach(r=>{if(!r)return;const q=btW([(r.x0+r.x1)/2,(r.y0+r.y1)/2]);if(have.some(o=>Math.hypot(o.x-q[0],o.z-q[1])<300)||L.some(o=>Math.hypot(o.x-q[0],o.z-q[1])<300))return;
  const w=Math.round((r.x1-r.x0)*P.mmpp/10)*10,d=Math.round((r.y1-r.y0)*P.mmpp/10)*10,o=bldNew("ind",{x:q[0],z:q[1]});
  o.m=W.im||"";o.w=Math.max(10,w);o.d=Math.max(10,d);o.h=Math.max(10,BT.ih||300);
  if(o.m){const m=CAS2M[o.m],mx=m.bi?m.L>=m.W:m.pa>=m.pb;o.r=Math.abs(w-d)<40||mx===(w>=d)?0:90}
  o.r=normT((o.r||0)+(W.ir||0));   // 「↻ 向き」で回した分
  L.push(normBld([o])[0])});
 if(!L.length){toast("もう置いてあります");return}
 P.units=(P.units||[]);list.forEach(r=>{if(!r)return;const cx=(r.x0+r.x1)/2,cy=(r.y0+r.y1)/2;if(!P.units.some(u=>Math.hypot(u.cx-cx,u.cy-cy)<300/P.mmpp))P.units.push({cx,cy,w:Math.round((r.x1-r.x0)*P.mmpp/10)*10,h:Math.round((r.y1-r.y0)*P.mmpp/10)*10})});P.unitsChosen=1;
 btAdd(L);W.sub="pick";W.cand=null;W.pick=null;BT.tool="indpick";wzRender();planDraw();
 toast("室内機を"+L.length+"台置きました。ほかの大きさの室内機もあればタップ、終わったら「✅ 終わり」")}
/* ===== 自動読み込み・消す ===== */
function bldFoot(o,i){let hw=o.w/2,hd=o.d/2,cx=o.x,cz=o.z;
 if(o.k==="ind"){const m=T&&T.bldM&&T.bldM.find(z=>z.i===i);if(m){hw=m.hw;hd=m.hd;cx=m.c.x;cz=m.c.z}}
 if(o.k==="hole"){hw=o.w/2+40;hd=o.d/2+40}
 return{cx,cz,hw:Math.max(hw,60),hd:Math.max(hd,60),th:o.r*Math.PI/180}}
function bldHit(q){let best=-1,ba=1e18;st.bld.forEach((o,i)=>{const f=bldFoot(o,i),co=Math.cos(f.th),si=Math.sin(f.th),dx=q[0]-f.cx,dz=q[1]-f.cz,lx=dx*co+dz*si,lz=-dx*si+dz*co;
  if(Math.abs(lx)<=f.hw+80&&Math.abs(lz)<=f.hd+80){const a=f.hw*f.hd+(o.k==="hole"?-1e12:0);if(a<ba){ba=a;best=i}}});return best}
function bldDesc(o){const K=BLDK[o.k]||{i:"",n:""};return K.i+" "+K.n+"（"+(o.k==="wall"?(o.m==="lgs"?"軽量＋ボード ":"")+"厚"+fmt(o.d)+"・長さ"+fmt(o.w):o.k==="hole"?"φ"+fmt(o.w):o.k==="door"?(o.m==="swing"?"開き戸":"引き戸")+" 幅"+fmt(o.w):fmt(o.w)+"×"+fmt(o.d))+"）"}
function wzDel(idx){if(!idx.length)return;const s=[...new Set(idx)].sort((a,b)=>b-a),rec=s.map(i=>({i,o:st.bld[i]}));s.forEach(i=>st.bld.splice(i,1));
 (W.delStack=W.delStack||[]).push(rec.reverse());BT.stack=[];W.s0=0;W.sel=[];bldChanged();wzRender();planDraw();toast(s.length+"個 消しました（「◀ 戻る」で元に戻せます）")}
function wzUndel(){const r=W.delStack&&W.delStack.pop();if(!r)return false;r.forEach(({i,o})=>st.bld.splice(Math.min(i,st.bld.length),0,o));bldChanged();wzRender();planDraw();toast("元に戻しました");return true}
function wzAuto(a,b){const P=PLAN;if(!P||!P.mmpp||!P.org){toast("先に縮尺と原点を決めてください");return}
 if(!P.rects){try{planAnalyze()}catch(e){}}
 const inR=(x,y)=>!a||(x>=Math.min(a[0],b[0])&&x<=Math.max(a[0],b[0])&&y>=Math.min(a[1],b[1])&&y<=Math.max(a[1],b[1]));
 const L=[],has=(k,x,z,d)=>st.bld.concat(L).some(o=>o.k===k&&Math.hypot(o.x-x,o.z-z)<d);let nw=0,nc=0,ni=0;
 if(W.aw!==false)(P.walls||[]).forEach(w=>{const mx=(w.a[0]+w.b[0])/2,my=(w.a[1]+w.b[1])/2;if(!inR(mx,my))return;
  const A=btW(w.a),B=btW(w.b),t=Math.max(50,Math.round(w.t/10)*10),o=btWall(A,B,t,0,false);if(!o)return;o.x=Math.round((A[0]+B[0])/2);o.z=Math.round((A[1]+B[1])/2);
  if(BT.wh>0){o.full=false;o.h=BT.wh}if(has("wall",o.x,o.z,120))return;L.push(o);nw++});
 if(W.ac!==false)(P.rects||[]).forEach(r=>{const w=(r.x1-r.x0)*P.mmpp,h=(r.y1-r.y0)*P.mmpp,c=r.col;
  const gray=!c||(Math.max(...[1,3,5].map(k=>parseInt(c.slice(k,k+2),16)))-Math.min(...[1,3,5].map(k=>parseInt(c.slice(k,k+2),16))))<24;
  if(!(gray&&w>=500&&w<=1300&&h>=500&&h<=1300&&Math.abs(w-h)<200))return;const cx=(r.x0+r.x1)/2,cy=(r.y0+r.y1)/2;if(!inR(cx,cy))return;
  const q=btW([cx,cy]);if(has("col",q[0],q[1],300))return;L.push({k:"col",x:q[0],z:q[1],w:Math.round(w/10)*10,d:Math.round(h/10)*10,h:600,y:0,r:0,full:true});nc++});
 if(W.ai!==false){try{planClassify()}catch(e){}(P.cand||[]).filter(g=>g.hit&&!g.neu).forEach(g=>{const tol=300/P.mmpp,seen=[];g.list.forEach(r=>{const cx=(r.x0+r.x1)/2,cy=(r.y0+r.y1)/2;if(!inR(cx,cy)||seen.some(s=>Math.hypot(s[0]-cx,s[1]-cy)<tol))return;seen.push([cx,cy]);
  const q=btW([cx,cy]);if(has("ind",q[0],q[1],400))return;const o=bldNew("ind",{x:q[0],z:q[1]}),m=CAS2M[g.hit.k],mx=m.bi?m.L>=m.W:m.pa>=m.pb;o.m=g.hit.k;o.r=Math.abs(g.w-g.h)<40||mx===(g.w>=g.h)?0:90;L.push(normBld([o])[0]);ni++})})}
 if(!L.length){toast("新しく読み込めるものはありませんでした");return}
 btAdd(normBld(L));W.autoRes={nw,nc,ni};wzRender();planDraw();toast("読み込みました：壁"+nw+"・柱"+nc+"・室内機"+ni)}
function wzDraw(x,sp){if(!W.on)return;try{kbDraw(x,sp)}catch(e){console.warn("kabe",e)}try{if(typeof smDraw==="function")smDraw(x,sp)}catch(e){console.warn("sumi",e)}
 if(W.step==="t:pipe"&&PLAN&&PLAN.org){const mark=(i,col,t)=>{const o=st.bld[i];if(!o)return;const q=sp(btP(o.x,o.z));x.fillStyle=col;x.beginPath();x.arc(q[0],q[1],13,0,7);x.fill();x.fillStyle="#fff";x.font="bold 13px sans-serif";x.textAlign="center";x.fillText(t,q[0],q[1]+4.5)};
  if(W.pi>=0)mark(W.pi,"#0f766e","①");(W.ph||[]).forEach((i,k)=>mark(i,"#f59e0b",String(k+1)));if(W.po>=0)mark(W.po,"#dc2626","③")}
 if(W.sel&&W.sel.length&&PLAN&&PLAN.org)W.sel.forEach(i=>{const o=st.bld[i];if(!o)return;const f=bldFoot(o,i),co=Math.cos(f.th),si=Math.sin(f.th);const pts=[[-f.hw,-f.hd],[f.hw,-f.hd],[f.hw,f.hd],[-f.hw,f.hd]].map(([a,b])=>sp(btP(f.cx+a*co-b*si,f.cz+a*si+b*co)));
  x.beginPath();pts.forEach((q,j)=>j?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]));x.closePath();x.fillStyle="rgba(239,68,68,.45)";x.fill();x.strokeStyle="#dc2626";x.lineWidth=4;x.stroke()});
 if(BT.pts.length===1&&(BT.tool==="delrng"||BT.tool==="autorng")){const q=sp(BT.pts[0]);x.fillStyle="#dc2626";x.beginPath();x.arc(q[0],q[1],8,0,7);x.fill()}
 if(!W.cand)return;
 W.cand.forEach(r=>{const a=sp([r.x0,r.y0]),b=sp([r.x1,r.y1]);x.fillStyle="rgba(239,68,68,.35)";x.fillRect(a[0],a[1],b[0]-a[0],b[1]-a[1]);x.strokeStyle="#dc2626";x.lineWidth=r===W.pick?4:2.5;x.strokeRect(a[0]-3,a[1]-3,b[0]-a[0]+6,b[1]-a[1]+6)})}
function wzBack(){const s=W.step;
 if(s==="t:kabe"){if(KB.res.length){KB.res.pop();wzRender();planDraw()}else wzGo("menu");return}
 if(s==="t:sumi"){if(SM.sel>=0){SM.sel=-1;wzRender();planDraw()}else wzGo("menu");return}
 if(s==="t:pipe"){if(W.psub==="out"){W.psub="hole";BT.tool="pipehole";wzRender();planDraw();return}if(W.psub==="hole"&&W.ph.length){W.ph.pop();wzRender();planDraw();return}if(W.psub==="hole"||W.psub==="model"){W.psub="ind";W.pi=-1;BT.tool="pipeind";wzRender();planDraw();return}wzGo("menu");return}
 if(s==="scale")wzGo("open");else if(s==="cal"){if(PV.cal.length){PV.cal.pop();wzRender();planDraw()}else wzGo("scale")}
 else if(s==="org")wzGo("scale");else if(s==="menu")wzGo("org");
 else if(s==="t:del"){if(BT.pts.length){BT.pts.pop();wzRender();planDraw();return}if(W.sel&&W.sel.length){W.sel=[];wzRender();planDraw();return}if(!wzUndel())toast("戻せるものがありません")}
 else if(s.startsWith("t:")){
  if(W.sub==="confirm"||W.sub==="notfound"){W.sub="pick";W.cand=null;W.pick=null;W.tap=null;BT.tool=s==="t:ins"?"inspick":"indpick";wzRender();planDraw();return}
  if(BT.pts.length){BT.pts.pop();wzRender();planDraw();return}
  if(BT.stack.length>W.s0){planBldUndo();wzRender();return}
  toast("この作業で置いたものはありません（「キャンセル」で選ぶ画面に戻ります）")}}
function wzNext(){const s=W.step,P=PLAN;
 if(s==="scale"){if(P&&P.mmpp){wzSave();wzGo(P.org?"menu":"org")}}
 else if(s==="org"){if(P&&P.org){wzSave();wzGo("menu")}else toast("原点をタップしてください")}
 else if(s==="menu")wz3D();
 else if(s.startsWith("t:")){if(BT.tool==="room"&&BT.pts.length>=3)planBldRoom();BT.pts=[];wzGo("menu")}}
function wzCancel(){const s=W.step;
 if(s==="t:del"){let n=0;while(W.delStack&&W.delStack.length){wzUndel();n++}W.sel=[];BT.pts=[];wzGo("menu");return}
 if(s.startsWith("t:")){let n=0;while(BT.stack.length>W.s0){const k=BT.stack.pop();st.bld.splice(st.bld.length-k,k);n+=k}BT.pts=[];if(n){bldChanged();toast("この作業で置いた"+n+"個を取り消しました")}wzGo("menu");return}
 if(s==="cal"){wzGo("scale");return}
 $("#planOv").style.display="none"}
/* 室内機 → 穴（順に・壁に直角に通す）→ 室外機 の配管を90°曲げで作る */
function wzMakePipe(again){const ind=st.bld[W.pi],out=st.bld[W.po];if(!ind||!out){toast("室内機と室外機を選んでください");return}
 /* 向きを変えて作り直せるように、作る前の状態を取っておく */
 if(!again)W.snap=JSON.stringify({bld:st.bld,bldXf:st.bldXf||null,units:st.units,rows:st.rows,gnd:st.gnd,nopipe:!!st.nopipe});
 if(!indToPipe(W.pi,true)){return}
 /* indToPipeで位置が配管口基準に変わったので、同じ物を探し直す（並び順は室内機が抜けた分だけずれる） */
 const shift=i=>i>W.pi?i-1:i,O=st.bld[shift(W.po)],H=(W.ph||[]).map(i=>st.bld[shift(i)]).filter(Boolean);
 const V=THREE.Vector3,GY=T&&T.GYr!=null?T.GYr:-(st.gnd.ch||2400),S=300,MIN=250;
 /* 天井の中を走る高さ：配管（保温込み）の下側が天井の仕上げから70mm以上（軽天の親バーに当たらない） */
 const RR=(SIZES[st.s]?SIZES[st.s][1]/2:8)+10,CYc=typeof ceilY==="function"?ceilY():null,YRUN=CYc!=null?Math.max(0,CYc+70+RR):0;
 /* 配管口（原点）から +x に出る。天井の中（配管口の高さ）を横に走り、壁の手前で上下して穴を通す */
 const P=[new V(0,0,0),new V(S,0,0)];if(YRUN>1)P.push(new V(S,YRUN,0));const cur=()=>P[P.length-1],dirNow=()=>cur().clone().sub(P[P.length-2]).normalize();
 const go=v=>{if(v.length()<1)return;const c=cur(),n=c.clone().add(v);
  if(P.length>=2){const d0=dirNow(),d1=v.clone().normalize();if(d0.dot(d1)>0.999){c.copy(n);return}}P.push(n)};
 const toY=y=>go(new V(0,y-cur().y,0));
 /* 横移動：直角の2本（どちらを先にするかは、今の向きと逆戻りしない方） */
 const hmove=(tgt,ax)=>{const d=new V(tgt.x-cur().x,0,tgt.z-cur().z);if(d.length()<1)return;
  const u=ax.clone().setY(0).normalize(),w=new V(-u.z,0,u.x),A=u.clone().multiplyScalar(d.dot(u)),B=w.clone().multiplyScalar(d.dot(w));
  const dn=P.length>=2?dirNow():new V(0,0,0),bad=v=>v.length()>1&&v.clone().normalize().dot(dn)<-0.999,good=v=>v.length()>1&&v.clone().normalize().dot(dn)>0.999;
  let first=A,second=B;if(bad(A)||(good(B)&&!good(A)))[first,second]=[B,A];
  if(bad(first)&&second.length()<1){const j=w.clone().multiplyScalar(300);go(j);go(first);go(j.clone().negate());return}
  go(first);go(second)};
 /* 横移動して、最後は向き fd で目標に入る（逆向きになる時はコの字でまわる） */
 const hmoveInto=(tgt,fd)=>{const u=fd.clone().setY(0).normalize(),d=new V(tgt.x-cur().x,0,tgt.z-cur().z),du=d.dot(u);
  if(du>=100){const L=Math.min(MIN,du);hmove(tgt.clone().addScaledVector(u,-L),u);go(u.clone().multiplyScalar(L))}
  else{const Q=tgt.clone().addScaledVector(u,-MIN);Q.y=cur().y;go(u.clone().multiplyScalar(Q.clone().sub(cur()).dot(u)));const w=new V(-u.z,0,u.x);go(w.clone().multiplyScalar(Q.clone().sub(cur()).dot(w)));go(u.clone().multiplyScalar(MIN))}};
 let outN=null;
 H.forEach(h=>{const th=h.r*Math.PI/180,t=new V(Math.cos(th),0,Math.sin(th)),n=new V(-Math.sin(th),0,Math.cos(th)),C=new V(h.x,GY+h.y,h.z);
  const sg=C.clone().sub(cur()).dot(n)>=0?1:-1,nO=n.clone().multiplyScalar(sg),off=(h.d||150)/2+250,A=C.clone().addScaledVector(nO,-off),B=C.clone().addScaledVector(nO,off);
  const Ah=A.clone();Ah.y=cur().y;hmove(Ah,t);   // 今の高さのまま、穴の手前の真上（真下）まで
  toY(A.y);go(B.clone().sub(cur()));outN=nO});  // 穴の高さまで上下して、壁に直角に通す
 if(O){const th=O.r*Math.PI/180,lx=new V(Math.cos(th),0,Math.sin(th)),lz=new V(-Math.sin(th),0,Math.cos(th)),op=outPort(O.m||"p40"),
   T0=new V(O.x,GY+(O.y||0),O.z).addScaledVector(lx,op[0]).addScaledVector(lz,op[2]).add(new V(0,op[1],0)),Ap=T0.clone().addScaledVector(lx,250);
  if(outN){toY(T0.y);hmoveInto(T0,lx.clone().negate())}   // 穴から出たら、壁ぞいに室外機の高さまで下りて、横から入る
  else{const Ah=Ap.clone();Ah.y=cur().y;hmove(Ah,lx);toY(Ap.y)}   // 穴なし：天井の中を室外機の真上まで行って下りる
  go(T0.clone().sub(cur()))}
 const D0=new V(1,0,0),F=frameFor(D0),Pf=P.map(p=>new V(p.dot(F.ex),p.dot(F.ey),p.dot(F.ez)));
 const rows=polyToRows(Pf).filter(r=>r.l>0);if(!rows.length){toast("ルートを作れませんでした");return}
 st.rows=normRows(rows,[{l:1000,a:0,t:0,o:false}]);sel=0;st.units.e="";save();render();if(T){build3D();fitT(true)}
 W.psub="done";wzRender();wzOriBar(true);
 setTimeout(()=>{const po=$("#planOv");if(po)po.style.display="none";toast("配管ルートを作りました（曲げ"+rows.filter(r=>r.a).length+"か所・合計"+fmt(rows.reduce((a,r)=>a+r.l,0))+"mm）。室内機の向きは下のボタンで変えられます")},300)}
/* 作ったあと：室内機の向き（配管の出る側）を90°ずつ変えて作り直す */
function wzOriBar(on){let b=$("#wzOri");
 if(!on){if(b)b.remove();return}
 if(!b){b=document.createElement("div");b.id="wzOri";b.style.cssText="position:absolute;left:50%;transform:translateX(-50%);bottom:10px;z-index:6;display:flex;gap:6px;align-items:center;background:#0f172ae6;color:#fff;border-radius:16px;padding:6px 8px;font-weight:800;font-size:13px;white-space:nowrap;box-shadow:0 4px 14px #0003";
  b.innerHTML='<span style="padding:0 4px">❄️ 室内機の向き</span><button data-v="90" style="height:40px;border-radius:12px;background:#2563eb;color:#fff;font-weight:800;padding:0 12px">↻ 90°回す</button><button data-v="ok" style="height:40px;border-radius:12px;background:#16a34a;color:#fff;font-weight:800;padding:0 12px">✅ OK</button>';
  $("#stage").appendChild(b);
  b.onclick=e=>{const x=e.target.closest("button");if(!x)return;if(x.dataset.v==="ok"){W.snap=null;wzOriBar(false);return}wzRotateInd(90)}}}
function wzRotateInd(deg){if(!W.snap){wzOriBar(false);return}
 const o=JSON.parse(W.snap);st.bld=o.bld;st.bldXf=o.bldXf;st.units=o.units;st.rows=o.rows;st.gnd=o.gnd;st.nopipe=o.nopipe;
 const ind=st.bld[W.pi];if(!ind){wzOriBar(false);return}ind.r=normT(ind.r+deg);
 W.snap=JSON.stringify({...o,bld:st.bld});
 if(T)build3D();wzMakePipe(true)}
function wzCalDone(){if(!W.on||W.step!=="cal")return;PLAN.userScale=1;wzSave();if(planCanAuto()){planAutoAll();return}wzGo(PLAN.org?"menu":"org")}
function wz3D(){const P=PLAN;try{if(typeof kzFixMainCH==="function"&&kzFixMainCH())toast("天井高：メインを CH"+fmt(P.CH)+" に直しました（WCなどの範囲と同じになっていたため）")}catch(e){}if(P&&P.CH){st.gnd.ch=P.CH;if(st.nopipe){st.gnd.on=true;st.gnd.c=true;st.gnd.h=P.CH}}st.bldHide=false;wzSave();save();$("#planOv").style.display="none";
 try{render()}catch(e){}if(T){build3D();fitT(true)}toast("3Dで表示しました。図面に戻るときは、もう一度図面を開いてください")}

/* ===== 図面画面：手順バー・使い方・戻す／やめる ===== */
const PL_HELP=[
 ["need","📄 用意するもの","CADから書き出した図面のPDFがいちばん正確です（線と文字が入っているもの）。写真やスキャンの図面も開けますが、その時は「縮尺を2点で」で長さを合わせる必要があります。iPhoneの「ファイル」に保存しておくと選べます。"],
 ["den","📐 縮尺（1/50 など）","図面の1mmが実際の何mmかの設定です。PDFに「1/50」などの表記があれば自動で入ります。印刷用に縮小されたPDFだとズレることがあるので、通り芯の寸法など長さの分かる所で「📏 縮尺を2点で」をすると確実です。これが合っていないと、壁も室内機も大きさが全部ズレます。"],
 ["cal","📏 縮尺を2点で","図面の上の、長さが分かっている2点（通り芯と通り芯など）をタップして、その実際の長さ（mm）を入れます。これで図面の縮尺がピッタリ合います。"],
 ["org","🎯 原点","図面の上で「ここを0（ゼロ）にする」点です。部屋の角や柱の角など、現場で測れる場所を選びます。壁・柱・室内機の位置は、ぜんぶこの点からの距離（mm）で記録されます。図面を開き直したら、同じ場所にもう一度置いてください。"],
 ["H","📏 配管の高さ","「✏️ なぞる」で配管ルートを描いた時に、その配管を床から何mmの高さに通すかです（3Dにした時の高さ）。壁や室内機を置くだけなら気にしなくて大丈夫です。"],
 ["CH","🏠 天井高","床から天井までの高さです。図面の「CH=2400」などから自動で入ります。「床から天井まで」の壁や柱の高さ、室内機を吊る高さに使います。"],
 ["room","🏠 部屋の内側","部屋の角を順番にタップしていき、最後に「✅ 閉じて壁を作る」で、部屋をぐるっと囲む壁がまとめてできます。"],
 ["wall","🧱 壁1本","壁の端と端の2点をタップすると壁が1本できます。「厚みを付ける側」で、線のどちら側に壁の厚みを付けるか選べます。"],
 ["rng","📥 図面の壁を取り込む","範囲の2つの角をタップすると、その中で図面から見つけた壁（青い線）をまとめて壁にします。"],
 ["t","壁の厚み","作る壁の厚さ（mm）です。"],
 ["wh","壁の高さ（0＝天井まで）","0のままだと床から天井まで立ちます。腰壁などは高さをmmで入れてください。"],
 ["col","🏛 柱","柱の角を2点（対角）タップすると、その大きさの柱ができます。"],
 ["box","📦 障害物","ダクトや配管など、ぶつかる物を箱で置きます。対角の2点をタップ。「高さ」と「下面の高さ」で位置を決めます。"],
 ["ind","❄️ 室内機","室内機の中心をタップすると置けます。あとで3Dの編集で機種を選べます。"],
 ["ih","箱の高さ","機種を選ぶ前の、室内機の仮の箱の高さです。機種を選ぶとその寸法に変わります。"],
 ["hole","🕳️ 穴","壁の穴（スリーブ）の位置をタップします。壁の近くをタップすると壁に吸い付きます。「穴の直径」「中心の高さ（床から）」を先に入れておきます。"],
 ["find","🔍 室内機を探す","図面の中の四角を大きさごとに集めて一覧にします。室内機の四角（大きさ・個数で見分けます）にチェックしてOKすると、全部まとめて置けます。"],
 ["trace","✏️ なぞる","配管ルートを図面の上でなぞって、長さを測ったり3Dにしたりします。"],
 ["colf","🎨 色で絞る","なぞりたい配管の線の色をタップすると、その色の線にだけ吸い付くようになります。"],
 ["list","📋 墨出しリスト","置いた室内機などの位置を、原点からの距離の一覧で出します。現場の墨出しに使えます。"],
 ["undo","↩ 1つ戻す／✖ やめる","「1つ戻す」は直前に置いた点や物を取り消します。「✖ やめる」は今やりかけの操作（途中までの点など）を全部やめて、図面を動かすだけの状態に戻ります。"],
 ["make","🧊 3Dにする","置いた壁・柱・室内機を3Dで見られます。"]];
function planHelp(key){
 let ov=$("#plHelpOv");if(ov)ov.remove();ov=document.createElement("div");ov.id="plHelpOv";
 ov.style.cssText="position:fixed;inset:0;z-index:120;background:rgba(15,23,42,.6);display:flex;align-items:flex-end;justify-content:center";
 const steps=[["①","図面を開く","「📄 図面を開く」でPDFを選ぶ"],["②","縮尺を決める","表記どおりなら「この縮尺でOK」。前回決めた図面なら自動で使います"],["③","原点を決める","現場で測れる角をタップ（前回の原点も使えます）"],["④","何を追加するか選ぶ","室内機・壁・梁・柱・室外機・穴・室外機の置き場"],["⑤","図面の上でタップ","吹き出しの説明どおりに。下は「◀ 戻る（1つ取り消し）」「✖ キャンセル（この作業を全部やめる）」「次へ／終わり」だけ"],["⑥","3Dで見る","④の画面で「🧊 3Dで見る」"]];
 ov.innerHTML=`<div style="background:#fff;color:#0f172a;width:100%;max-width:560px;max-height:88vh;overflow:auto;border-radius:18px 18px 0 0;padding:16px 16px calc(env(safe-area-inset-bottom,0px) + 16px);font-size:14px;line-height:1.55">
  <div style="display:flex;align-items:center;margin-bottom:8px"><b style="font-size:18px;flex:1">❓ 図面の使い方</b><button id="plHelpX" style="height:38px;padding:0 14px;border-radius:11px;font-weight:800;background:#0f172a;color:#fff">閉じる</button></div>
  <div style="background:#eff6ff;border-radius:12px;padding:10px;margin-bottom:10px">図面（PDF）から、<b>壁・柱・障害物・室内機の位置</b>を取り出して3Dにします。室内機が壁や柱から何mmかも出ます。</div>
  <b>やること（上から順番に）</b>
  <div style="margin:6px 0 12px">${steps.map(z=>`<div style="display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #e2e8f0"><b style="color:#2563eb;font-size:16px">${z[0]}</b><div><b>${z[1]}</b><br><span style="color:#475569;font-size:13px">${z[2]}</span></div></div>`).join("")}</div>
  <div style="font-size:13px;color:#475569;margin-bottom:10px">吹き出しに、いまやることが出ます。邪魔なときは吹き出しの「▲ 小さく」。なぞる等の細かい道具は、④の画面の「🔧 細かい道具」から使えます。</div>
  <b>ボタン・設定の意味</b>
  <div style="margin-top:6px">${PL_HELP.map(([k,t,d])=>`<div id="plh_${k}" style="padding:8px;border-radius:10px;margin-bottom:4px;${k===key?"background:#fef3c7;outline:2px solid #f59e0b":""}"><b>${t}</b><br><span style="font-size:13px;color:#334155">${d}</span></div>`).join("")}</div></div>`;
 document.body.appendChild(ov);ov.onclick=e=>{if(e.target===ov)ov.remove()};$("#plHelpX").onclick=()=>ov.remove();
 if(key){const el=$("#plh_"+key);if(el)setTimeout(()=>el.scrollIntoView({block:"center"}),30)}}
function planUndo1(){
 if(PV.mode==="cal"&&PV.cal.length){PV.cal.pop();planDraw();return}
 if(PV.mode==="bld"){planBldUndo();return}
 if(PLAN&&PLAN.route.length){PLAN.route.pop();planDraw();return}
 toast("取り消せるものがありません")}
function planCancel(){
 const busy=(PV.cal&&PV.cal.length)||(BT.pts&&BT.pts.length);
 PV.cal=[];BT.pts=[];if(PLAN){PLAN.wantPlace=false}
 const pn=$("#plPanel");if(pn&&pn.style.display!=="none"&&!PV.bldPanelOn)pn.style.display="none";
 if(busy&&PV.mode==="bld"){planDraw();toast("やりかけの点を消しました");return}
 PV.md("move");toast("やめました（図面を動かすだけの状態です）")}
let PL_SIG="";
function planSteps(){const el=$("#plSteps");if(!el)return;const P=PLAN;
 const d=[!!(P&&P.img),!!(P&&P.mmpp),!!(P&&P.org),st.bld.some(o=>o.k==="wall"||o.k==="col"),st.bld.some(o=>o.k==="ind"),false];
 const nx=d.findIndex(v=>!v),sig=d.join()+nx+PV.mode;
 const fl=$("#plFloat");if(fl)fl.style.display=!W.on&&["cal","trace","bld","col"].includes(PV.mode)?"flex":"none";
 if(sig===PL_SIG)return;PL_SIG=sig;
 const S=[["①図面を開く","need"],["②縮尺","cal"],["③原点","org"],["④壁・柱","room"],["⑤室内機","find"],["⑥3D","make"]];
 el.innerHTML=`<span style="flex:none;align-self:center;font-size:12px;color:#94a3b8;font-weight:800">手順</span>`+S.map(([t],i)=>`<button data-st="${i}" style="flex:none;height:32px;padding:0 9px;border-radius:16px;font-weight:800;font-size:12.5px;border:0;background:${d[i]?"#16a34a":i===nx?"#fbbf24":"#334155"};color:${i===nx?"#0f172a":"#fff"}">${d[i]?"✅ ":""}${t}${i===nx?" ←次":""}</button>`).join("");
 el.querySelectorAll("[data-st]").forEach(b=>b.onclick=()=>planStepGo(+b.dataset.st))}
function planStepGo(i){const P=PLAN;
 if(i===0){$("#plFile").click();return}
 if(!P||!P.img){toast("まず「📄 図面を開く」でPDFを選んでください");return}
 if(i===1){PV.md("cal");toast("長さの分かる2点（通り芯どうしなど）をタップ → 実際の長さを入れます。表記の縮尺で合っていればこのままでOK");return}
 if(!P.mmpp){toast("先に②縮尺を合わせてください");PV.md("cal");return}
 if(i===2){BT.tool="org";PV.md("bld");toast("基準にする点（部屋の角・柱の角など）をタップ");return}
 if(!P.org){toast("先に③原点を決めてください");BT.tool="org";PV.md("bld");return}
 if(i===3){BT.tool="room";PV.md("bld");toast("部屋の角を順にタップ →「✅ 閉じて壁を作る」。壁1本ずつなら「🧱 壁1本」");return}
 if(i===4){PV.md("bld");setTimeout(()=>{const b=$("#btAutoInd");if(b)b.click()},50);return}
 if(i===5){planMake()}}

/* ===== 図面の上から、壁・柱・障害物・室内機・穴を置く（図面の上の点 → 原点からのmm） ===== */
const BT={ch:2400,rw:400,ry:2800,ct:"",tool:"org",t:150,wh:0,ih:300,side:1,bh:500,by:0,hd:65,hy:2200,bw:400,bd:700,bb:2700,om:"p40",or:0,oy:0,dw:800,dh:2000,dt:"slide",wk:"",ls:65,lbl:1,lbr:1,pts:[],stack:[]};
/* 壁の種類：軽量（スタッド）＋ボード の時は、スタッド幅＋ボード12.5mm×枚数 が厚み */
function btTh(){return BT.wk==="lgs"?Math.round(BT.ls+(BT.lbl+BT.lbr)*12.5):BT.t}
function btLgs(o){if(o&&BT.wk==="lgs"){o.m="lgs";o.bl=BT.lbl;o.br=BT.lbr;o.st=Math.abs(o.d-btTh())<=2?BT.ls:Math.max(30,Math.round(o.d-(BT.lbl+BT.lbr)*12.5))}return o}
const BT_TOOLS=[["org","🎯 原点"],["room","🏠 部屋の内側"],["wall","🧱 壁1本"],["rng","📥 図面の壁を取り込む"],["col","🏛 柱"],["box","📦 障害物"],["ind","❄️ 室内機"],["hole","🕳️ 穴"]];
const BT_HELP={eqone:"機器の真ん中をタップ。",inspick:"図面の点検口の四角をタップ。",insone:"点検口の真ん中をタップ。",org:"原点（0,0）にする点をタップ。部屋の基準にする角や、室内機の位置など。最初に1回決めます。",room:"部屋の「内側」の角を順にタップ。最初の点の近くをもう一度タップ（または下の「閉じる」）で、外側に壁ができます。",wall:"壁の面の両端を2点タップ。厚みは「壁の厚み」で、付ける側は下のボタンで切り替え。",rng:"図面から自動で見つけた壁（青い帯）を、四角の範囲でまとめて取り込みます。範囲の対角を2点タップ。",col:"柱の対角の2点をタップ（柱の角から角）。",box:"障害物（ダクト・設備など）の対角の2点をタップ。高さは下の欄。",ind:"室内機の中心をタップ。機種はあとで3Dの編集画面で変えられます。",hole:"配管を通す穴を、壁の近くでタップ。壁の厚みに合わせて向きが決まります。"};
function planBldPanel(){if(W.on){wzRender();return}const el=$("#plPanel");if(!el)return;PV.bldPanelOn=true;el.style.display="block";
 const inp=(k,l,w)=>`<label style="display:flex;align-items:center;gap:4px;font-size:12.5px"><span data-ph="${k==="hd"||k==="hy"?"hole":k==="bh"||k==="by"?"box":k}" style="text-decoration:underline dotted">${l} ⓘ</span><input data-bt="${k}" inputmode="numeric" value="${uVal(BT[k])}" style="width:${w||62}px;height:34px;border-radius:9px;border:1px solid #cbd5e1;padding:0 6px;font-size:14px">mm</label>`;
 const mini=!!PV.bldMini;
 el.innerHTML=`<div style="display:flex;gap:6px;margin-bottom:${mini?0:8}px;align-items:center"><div style="display:flex;flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;gap:6px;flex:1;min-width:0">${BT_TOOLS.map(([k,t])=>`<button data-bk="${k}" style="flex:none;height:38px;padding:0 10px;border-radius:11px;font-weight:800;font-size:13px;border:1.5px solid #cbd5e1;background:${k===BT.tool?"#fbbf24":"#fff"}">${t}</button>`).join("")}</div><button id="btMini" style="flex:none;height:38px;padding:0 8px;border-radius:11px;font-weight:800;font-size:12px;background:#334155;color:#fff">${mini?"▼ 開く":"▲ たたむ"}</button></div>
  <div style="display:${mini?"none":"block"}"><div style="font-size:12.5px;color:#334155;margin-bottom:8px">${BT_HELP[BT.tool]} <span data-ph="${BT.tool}" style="color:#2563eb;font-weight:800">（くわしく）</span>${PLAN&&PLAN.org?"":"<br><b style='color:#b91c1c'>※まず「🎯 原点」を決めてください</b>"}${PLAN&&PLAN.mmpp?"":"<br><b style='color:#b91c1c'>※縮尺が未設定です（「縮尺を2点で」）</b>"}</div>
  <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">${["room","wall","rng"].includes(BT.tool)?inp("t","壁の厚み")+inp("wh","壁の高さ（0＝天井まで）",72):""}${BT.tool==="ind"?inp("ih","箱の高さ（機種を選ぶと変わります）"):""}${BT.tool==="box"?inp("bh","高さ")+inp("by","下面の高さ"):""}${BT.tool==="hole"?inp("hd","穴の直径")+inp("hy","中心の高さ（床から）"):""}
  ${BT.tool==="wall"?`<button id="btSide" style="height:34px;padding:0 10px;border-radius:9px;font-weight:800;font-size:12.5px;border:1.5px solid #cbd5e1;background:#fff">厚みを付ける側：${BT.side>0?"進行方向の右":"進行方向の左"}（押して切替）</button>`:""}
  ${BT.tool==="room"?`<button id="btClose" style="height:34px;padding:0 12px;border-radius:9px;font-weight:800;font-size:13px;background:#16a34a;color:#fff">✅ 閉じて壁を作る</button>`:""}</div>
  <button id="btAutoInd" style="width:100%;height:42px;margin-top:8px;border-radius:11px;background:#7c3aed;color:#fff;font-weight:800;font-size:13.5px">🔍❄️ 図面から室内機を探して、ぜんぶ置く</button>
  <div style="font-size:12px;color:#64748b;margin-top:6px">置いた数：${st.bld.length}　（「1つ戻す」で直前の操作を取り消し）</div></div>`;
 {const mb=$("#btMini");if(mb)mb.onclick=()=>{PV.bldMini=!PV.bldMini;planBldPanel();setTimeout(planDraw,30)}}
 el.querySelectorAll("[data-bk]").forEach(b=>b.onclick=()=>{BT.tool=b.dataset.bk;BT.pts=[];planBldPanel();planDraw();if(PV.bldMini)toast(BT_HELP[BT.tool])});
 el.querySelectorAll("[data-bt]").forEach(i=>i.oninput=()=>{const v=uParse(i.value);if(isFinite(v))BT[i.dataset.bt]=Math.abs(v)});
 {const ai=$("#btAutoInd");if(ai)ai.onclick=()=>{const P=PLAN;if(!P||!P.mmpp){toast("先に縮尺を合わせてください");return}if(!P.org){toast("先に「🎯 原点」を決めてください");return}
  if(P.units&&P.units.length&&!P.redoFind){planPlaceUnits();return}P.wantPlace=true;P.redoFind=false;planFindUI()}}
 const sd=$("#btSide");if(sd)sd.onclick=()=>{BT.side*=-1;planBldPanel()};const cl=$("#btClose");if(cl)cl.onclick=()=>planBldRoom()}
/* 図面(原点からのmm) ⇔ 3Dの位置。「この室内機から配管」で3Dの基準を配管口に移した時は st.bldXf でずれを覚えておく */
const xfOf=()=>{const f=st.bldXf;return f&&isFinite(f.x)?f:{x:0,z:0,r:0}};
const btW=(q)=>{const f=xfOf(),px=(q[0]-PLAN.org[0])*PLAN.mmpp-f.x,pz=(q[1]-PLAN.org[1])*PLAN.mmpp-f.z,t=f.r*Math.PI/180,c=Math.cos(t),s2=Math.sin(t);
 return[Math.round((px*c+pz*s2)/10)*10,Math.round((-px*s2+pz*c)/10)*10]};
const btWx=(q)=>{const f=xfOf(),px=(q[0]-PLAN.org[0])*PLAN.mmpp-f.x,pz=(q[1]-PLAN.org[1])*PLAN.mmpp-f.z,t=f.r*Math.PI/180,c=Math.cos(t),s2=Math.sin(t);return[px*c+pz*s2,-px*s2+pz*c]};   // 丸めない版（自動読み込みで、読み直すたびに数mmずつずれないように）
const btP=(x,z)=>{const f=xfOf(),t=f.r*Math.PI/180,c=Math.cos(t),s2=Math.sin(t),px=x*c-z*s2+f.x,pz=x*s2+z*c+f.z;return[PLAN.org[0]+px/PLAN.mmpp,PLAN.org[1]+pz/PLAN.mmpp]};
function btAdd(list){if(!list.length)return;try{if(PLAN&&PLAN.fkey)st.bldKey=wzKey()}catch(e){}const n0=st.bld.length;list.forEach(o=>st.bld.push(o));st.bld=normBld(st.bld);st.bldHide=false;BT.stack.push(st.bld.length-n0);bldChanged();planBldPanel();planDraw()}
function btWall(a,b,t,side,ext){const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz);if(L<50)return null;const ux=dx/L,uz=dz/L,nx=-uz*side,nz=ux*side;
 return{k:"wall",x:Math.round((a[0]+b[0])/2+nx*t/2),z:Math.round((a[1]+b[1])/2+nz*t/2),w:Math.round(L+(ext?t:0)),d:t,h:BT.wh>0?BT.wh:600,y:0,r:normT(Math.round(Math.atan2(dz,dx)*180/Math.PI)),full:!(BT.wh>0)}}
function planBldRoom(){const P=PLAN;if(BT.pts.length<3){toast("角を3つ以上タップしてください");return}
 const W=BT.pts.map(btW);let A=0;W.forEach((q,i)=>{const r=W[(i+1)%W.length];A+=q[0]*r[1]-r[0]*q[1]});
 const out=A>0?-1:1,t=Math.max(50,btTh()||150),L=[];
 W.forEach((q,i)=>{const w=btLgs(btWall(q,W[(i+1)%W.length],t,out,true));if(w)L.push(w)});
 BT.pts=[];btAdd(L);toast("部屋の壁を"+L.length+"枚つくりました（3Dで確認）")}
function planBldUndo(){if(BT.pts.length){BT.pts.pop();planDraw();return}
 const n=BT.stack.pop();if(!n){toast("取り消せるものがありません");return}st.bld.splice(st.bld.length-n,n);bldChanged();planBldPanel();planDraw();toast("取り消しました")}
function planBldPlace(p){const P=PLAN;if(!P.mmpp){toast("先に縮尺を合わせてください");planDraw();return}
 const tool=BT.tool;
 if(tool==="kabe"){kbTap(p);return}
 if(tool==="sumi"){smTap(p);return}
 if(tool==="org"){P.org=p.slice();toast("原点を決めました（ここが 0,0）");planBldPanel();planDraw();return}
 if(!P.org){toast("先に「🎯 原点」を決めてください");planDraw();return}
 if(tool==="room"){if(BT.pts.length>=3&&Math.hypot(p[0]-BT.pts[0][0],p[1]-BT.pts[0][1])*PV.z<24){planBldRoom();return}BT.pts.push(p);if(W.on)wzRender();planDraw();return}
 if(tool==="indpick"){wzPick(p);return}
 if(tool==="inspick"){wzPickIns(p);return}
 if(tool==="insone"){insAt(p);wzRender();planDraw();return}
 if(tool==="eqone"){const q=btW(p),m=W.eqm||VENT_ORDER[0],V=VENTM[m],r=W.eqr||0;let o;
  if(V){const AA=V.A+2*V.J;o={k:"eq",m,x:q[0],z:q[1],w:r%180?V.B:AA,d:r%180?AA:V.B,h:V.C,y:W.eqy||0,r,n:"ロスナイ "+V.n}}
  else{const w=W.eqw||600,d=W.eqd||600;o={k:"eq",x:q[0],z:q[1],w:r%180?d:w,d:r%180?w:d,h:W.eqh||300,y:W.eqy||0,r:0,n:"機器"}}
  btAdd([normBld([o])[0]]);toast((o.n||"機器")+"を置きました");wzRender();planDraw();return}
 if(tool==="pipeind"||tool==="pipehole"||tool==="pipeout"){const q=btW(p),want=tool==="pipeind"?"ind":tool==="pipehole"?"hole":"out";let best=-1,bd=1e18;
  st.bld.forEach((o,i)=>{if(o.k!==want)return;const d=Math.hypot(o.x-q[0],o.z-q[1]);if(d<bd){bd=d;best=i}});
  if(best<0||bd>Math.max(1500,40*PLAN.mmpp/PV.z)){toast(want==="ind"?"室内機の上をタップしてください":want==="hole"?"穴の上をタップしてください（先に「穴を追加」で穴を置いてください）":"室外機の上をタップしてください（先に「室外機を追加」で置いてください）");return}
  if(want==="ind"){W.pi=best;if(!st.bld[best].m){W.psub="model";BT.tool="none";wzRender();return}W.psub="hole";BT.tool="pipehole";wzRender();planDraw();return}
  if(want==="hole"){if(!W.ph.includes(best))W.ph.push(best);wzRender();planDraw();return}
  W.po=best;wzMakePipe();return}
 if(tool==="wallpick"){planWallLearn(p);return}
 if(tool==="none")return;
 if(tool==="del"){const i=bldHit(btW(p));if(i<0){toast("ここには何もありません。消したい物の上をタップ");return}W.sel=[i];wzRender();planDraw();return}
 if(tool==="delrng"||tool==="autorng"){BT.pts.push(p);if(BT.pts.length<2){wzRender();planDraw();return}const a=BT.pts[0],b=BT.pts[1];BT.pts=[];
  if(tool==="autorng"){BT.tool="none";wzAuto(a,b);return}
  const A=btW(a),B=btW(b),x0=Math.min(A[0],B[0]),x1=Math.max(A[0],B[0]),z0=Math.min(A[1],B[1]),z1=Math.max(A[1],B[1]);
  W.sel=st.bld.map((o,i)=>[o,i]).filter(([o,i])=>{const f=bldFoot(o,i);return f.cx>=x0&&f.cx<=x1&&f.cz>=z0&&f.cz<=z1}).map(z=>z[1]);
  if(!W.sel.length)toast("この範囲には何もありません");wzRender();planDraw();return}
 if(tool==="indone"){const q=btW(p),o=bldNew("ind",{x:q[0],z:q[1]});o.m=W.im||"";o.r=W.ir||0;o.h=Math.max(10,BT.ih||300);btAdd([normBld([o])[0]]);toast("室内機を置きました");return}
 if(tool==="out"){const q=btW(p),m=OUTM[BT.om]||OUTM.p40;btAdd(normBld([{k:"out",x:q[0],z:q[1],w:m.w,d:m.d,h:m.h,y:BT.oy||0,r:BT.or||0,m:BT.om}]));toast("室外機を置きました（3Dで向きや位置を直せます）");return}
 if(typeof kzPlace==="function"&&kzPlace(tool,p))return;
 BT.pts.push(p);const n=BT.pts.length;
 if(tool==="beam"){if(n<2){planDraw();return}const a=btW(BT.pts[0]),b=btW(BT.pts[1]);BT.pts=[];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<100){toast("短すぎます");planDraw();return}
  btAdd(normBld([{k:"beam",x:Math.round((a[0]+b[0])/2),z:Math.round((a[1]+b[1])/2),w:Math.round(L),d:BT.bw||400,h:BT.bd||700,y:BT.bb||2700,r:normT(Math.round(Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI)),full:false}]));toast("梁を置きました");return}
 if(tool==="spot"){if(n<2){planDraw();return}const a=btW(BT.pts[0]),b=btW(BT.pts[1]);BT.pts=[];const w=Math.abs(b[0]-a[0]),d=Math.abs(b[1]-a[1]);if(w<100||d<100){toast("小さすぎます。対角の2点をタップ");planDraw();return}
  btAdd(normBld([{k:"spot",x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,w,d,h:20,y:0,r:0,full:false}]));toast("室外機の置き場を置きました");return}
 if(tool==="wall"){if(n<2){planDraw();return}const w=btLgs(btWall(btW(BT.pts[0]),btW(BT.pts[1]),Math.max(50,btTh()),BT.side,false));BT.pts=[];if(w){btAdd([w]);toast(w.m==="lgs"?"軽量＋ボードの壁を置きました（厚"+fmt(w.d)+"）":"壁を置きました")}else{toast("短すぎます");planDraw()}return}
 if(tool==="col"||tool==="box"){if(n<2){planDraw();return}const a=btW(BT.pts[0]),b=btW(BT.pts[1]);BT.pts=[];const w=Math.abs(b[0]-a[0]),d=Math.abs(b[1]-a[1]);if(w<30||d<30){toast("小さすぎます。対角の2点をタップしてください");planDraw();return}
  const o={k:tool,m:tool==="col"&&BT.ct==="h"?"h":"",x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,w,d,r:0,full:tool==="col",h:tool==="col"?600:BT.bh,y:tool==="col"?0:BT.by};btAdd([o]);toast(tool==="col"?"柱を置きました":"障害物を置きました");return}
 if(tool==="ind"){const q=btW(BT.pts[0]);BT.pts=[];const o=bldNew("ind",{x:q[0],z:q[1]});o.h=Math.max(10,BT.ih||300);btAdd([normBld([o])[0]]);toast("室内機を置きました。3Dで機種や向きを直せます");return}
 if(tool==="door"){const q=btW(BT.pts[0]);BT.pts=[];let best=null,bd=1e9;
  st.bld.forEach(o=>{if(o.k!=="wall")return;const th=o.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th),dx=q[0]-o.x,dz=q[1]-o.z,lx=dx*co+dz*si,lz=-dx*si+dz*co;
   if(Math.abs(lx)<=o.w/2+100&&Math.abs(lz)<=o.d/2+400&&Math.abs(lz)<bd){bd=Math.abs(lz);best={o,lx,co,si}}});
  if(!best){toast("壁の近くをタップしてください（先に壁を置いてください）");planDraw();return}
  const o=best.o,dw=Math.max(300,BT.dw||800),lx=Math.max(-o.w/2+dw/2,Math.min(o.w/2-dw/2,best.lx));
  btAdd(normBld([{k:"door",x:Math.round(o.x+lx*best.co),z:Math.round(o.z+lx*best.si),w:dw,d:o.d,h:Math.max(500,BT.dh||2000),y:0,r:o.r,full:false,m:BT.dt}]));toast((BT.dt==="swing"?"開き戸":"引き戸")+"を置きました");return}
 if(tool==="hole"){const q=btW(BT.pts[0]);BT.pts=[];let best=null,bd=1e9;
  st.bld.forEach(o=>{if(o.k!=="wall")return;const th=o.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th),dx=q[0]-o.x,dz=q[1]-o.z,lx=dx*co+dz*si,lz=-dx*si+dz*co;
   if(Math.abs(lx)<=o.w/2+100&&Math.abs(lz)<=o.d/2+400&&Math.abs(lz)<bd){bd=Math.abs(lz);best={o,lx,co,si}}});
  if(!best){toast("壁の近くをタップしてください（先に壁を置いてください）");planDraw();return}
  const o=best.o,h=bldNew("hole",{x:Math.round(o.x+best.lx*best.co),z:Math.round(o.z+best.lx*best.si)});h.r=o.r;h.d=o.d;h.w=Math.max(10,BT.hd);h.y=BT.hy;btAdd([normBld([h])[0]]);toast("穴を置きました（3Dで高さや大きさを直せます）");return}
 if(tool==="rng"){if(n<2){planDraw();return}const a=BT.pts[0],b=BT.pts[1];BT.pts=[];const x0=Math.min(a[0],b[0]),x1=Math.max(a[0],b[0]),y0=Math.min(a[1],b[1]),y1=Math.max(a[1],b[1]);
  const L=[];(P.walls||[]).forEach(w=>{const mx=(w.a[0]+w.b[0])/2,my=(w.a[1]+w.b[1])/2;if(mx<x0||mx>x1||my<y0||my>y1)return;
   const A=btW(w.a),B=btW(w.b),t=Math.max(50,Math.round(w.t/10)*10),o=btWall(A,B,t,0,false);if(o){o.x=Math.round((A[0]+B[0])/2);o.z=Math.round((A[1]+B[1])/2);L.push(btLgs(o))}});
  if(!L.length){toast("この範囲に、自動で見つかった壁（青い帯）がありません。「部屋の内側」で置いてください");planDraw();return}
  btAdd(L);toast("図面の壁を"+L.length+"枚取り込みました");return}}
/* 「室内機を探す」で選んだ四角を、3Dの室内機（箱）として置く */
function planPlaceUnits(){const P=PLAN;if(!P||!P.units||!P.units.length){toast("室内機の四角が選ばれていません");return}
 const L=[],have=st.bld.filter(o=>o.k==="ind");
 P.units.forEach(u=>{const q=btW([u.cx,u.cy]);if(have.some(o=>Math.hypot(o.x-q[0],o.z-q[1])<300)||L.some(o=>Math.hypot(o.x-q[0],o.z-q[1])<300))return;
  const o=bldNew("ind",{x:q[0],z:q[1]});o.m="";o.w=Math.max(10,Math.round(u.w/10)*10);o.d=Math.max(10,Math.round(u.h/10)*10);o.h=Math.max(10,BT.ih||300);L.push(normBld([o])[0])});
 if(!L.length){toast("新しく置ける室内機はありませんでした（もう置いてあります）");return}
 btAdd(L);toast("室内機を"+L.length+"台置きました（箱の大きさは図面の四角どおり。3Dで機種や高さを直せます）")}
function planBldDraw(x,sp){const P=PLAN;if((PV.mode!=="bld"&&!W.on)||!P||!P.mmpp)return;
 if(P.org){const q=sp(P.org);x.strokeStyle="#16a34a";x.lineWidth=3;x.beginPath();x.moveTo(q[0]-14,q[1]);x.lineTo(q[0]+14,q[1]);x.moveTo(q[0],q[1]-14);x.lineTo(q[0],q[1]+14);x.stroke();x.fillStyle="#16a34a";x.font="bold 12px sans-serif";x.textAlign="left";x.fillText("原点",q[0]+8,q[1]-8);
  const col={col:"#64748b",wall:"#2563eb",beam:"#a16207",box:"#f97316",ind:"#2563eb",hole:"#111827",out:"#475569",spot:"#16a34a",door:"#b45309",ceil:"#0ea5e9",rack:"#64748b",win:"#0284c7",ins:"#0d9488",eq:"#475569"};
  st.bld.forEach((o,i)=>{const th=o.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th);let hw=o.w/2,hd=o.d/2;if(o.k==="ind"){const m=T&&T.bldM&&T.bldM.find(z=>z.i===i);if(m){hw=m.hw;hd=m.hd}}if(o.k==="hole"){hw=o.w/2+20;hd=o.d/2}
   const cx=o.k==="ind"&&T&&T.bldM&&T.bldM.find(z=>z.i===i)?T.bldM.find(z=>z.i===i).c.x:o.x,cz=o.k==="ind"&&T&&T.bldM&&T.bldM.find(z=>z.i===i)?T.bldM.find(z=>z.i===i).c.z:o.z;
   const pts=[[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]].map(([a,b])=>sp(btP(cx+a*co-b*si,cz+a*si+b*co)));
   x.beginPath();pts.forEach((q,j)=>j?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1]));x.closePath();x.fillStyle=(col[o.k]||"#64748b")+(o.k==="hole"?"ff":o.k==="ceil"?"1f":"55");x.fill();x.strokeStyle=col[o.k]||"#64748b";x.lineWidth=o.k==="ceil"?2.5:1.5;if(o.k==="ceil")x.setLineDash([10,6]);x.stroke();x.setLineDash([]);
   if(o.k==="ceil"){const q=sp(btP(o.x,o.z));x.fillStyle="#0369a1";x.font="bold 13px sans-serif";x.textAlign="center";x.fillText("📐 CH"+fmt(o.h)+(o.n?" "+o.n:""),q[0],q[1])}
   if(o.k==="ins"){const q=sp(btP(o.x,o.z));x.fillStyle="#115e59";x.font="bold 12px sans-serif";x.textAlign="center";x.fillText("🔲 点検口",q[0],q[1]+4)}
   if(o.k==="ind"||o.k==="hole"){const q=sp(btP(o.x,o.z));x.fillStyle=o.k==="ind"?"#1d4ed8":"#713f12";x.font="bold 12px sans-serif";x.textAlign="center";x.fillText(o.k==="ind"?"❄️":"🕳️",q[0],q[1]-8)}
   /* 室内機：配管の出る向きの矢印（配管口へ） */
   if(o.k==="ind"){const m=T&&T.bldM&&T.bldM.find(z=>z.i===i),E=m&&m.port?[m.port.x,m.port.z]:[cx+(hw+120)*co,cz+(hw+120)*si],a=sp(btP(cx,cz)),b=sp(btP(E[0],E[1])),L=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(L>6){const ux=(b[0]-a[0])/L,uy=(b[1]-a[1])/L,tip=[b[0]+ux*14,b[1]+uy*14];x.strokeStyle="#ea580c";x.lineWidth=4;x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(tip[0],tip[1]);x.stroke();
     x.fillStyle="#ea580c";x.beginPath();x.moveTo(tip[0]+ux*10,tip[1]+uy*10);x.lineTo(tip[0]-uy*8,tip[1]+ux*8);x.lineTo(tip[0]+uy*8,tip[1]-ux*8);x.closePath();x.fill();
     x.font="bold 11px sans-serif";x.textAlign="center";x.fillText("配管",tip[0]+ux*22,tip[1]+uy*22+4)}}})}
 if(BT.pts.length){x.strokeStyle="#dc2626";x.lineWidth=2.5;x.beginPath();BT.pts.forEach((p,i)=>{const q=sp(p);i?x.lineTo(q[0],q[1]):x.moveTo(q[0],q[1])});x.stroke();BT.pts.forEach(p=>{const q=sp(p);x.fillStyle="#dc2626";x.beginPath();x.arc(q[0],q[1],5,0,7);x.fill()})}}
const PV={z:1,ox:0,oy:0,mode:"move",cal:[]};
/* 最後に開いた図面をこの端末（IndexedDB）に覚えておく。ページを移ったりアプリを閉じても、「前の図面の続き」で開き直せる */
function plDB(mode,fn){return new Promise((ok,ng)=>{try{const q=indexedDB.open("pbmPlanDB",1);q.onupgradeneeded=()=>{q.result.createObjectStore("f")};q.onerror=()=>ng(q.error);
 q.onsuccess=()=>{const t=q.result.transaction("f",mode),st2=t.objectStore("f");let r;try{r=fn(st2)}catch(e){ng(e);return}t.oncomplete=()=>ok(r&&r.result!==undefined?r.result:undefined);t.onerror=()=>ng(t.error)}}catch(e){ng(e)}})}
let PL_LAST=null;   // {name,size,type,page,t}（ファイル本体は読む時だけ出す）
async function plLastInfo(){try{const r=await plDB("readonly",o=>o.get("last"));PL_LAST=r?{name:r.name,size:r.size,type:r.type,page:r.page||1,t:r.t}:null}catch(e){PL_LAST=null}return PL_LAST}
function plSaveLast(f){try{plDB("readwrite",o=>o.put({blob:f,name:f.name,size:f.size,type:f.type,page:1,t:Date.now()},"last")).then(()=>plLastInfo()).catch(()=>{})}catch(e){}}
function plSavePage(n){try{plDB("readwrite",o=>{const g=o.get("last");g.onsuccess=()=>{const r=g.result;if(r){r.page=n;o.put(r,"last")}}}).catch(()=>{})}catch(e){}}
async function plResume(){let r=null;try{r=await plDB("readonly",o=>o.get("last"))}catch(e){}if(!r||!r.blob){toast("前の図面が見つかりませんでした。もう一度ファイルから開いてください");return}
 const f=new File([r.blob],r.name,{type:r.type||"application/pdf"});W.resume=true;W.resumePage=r.page||1;await planLoad(f,true)}
plLastInfo();
/* ===== ほかのアプリ（図面修正アプリなど）から図面を受け取る =====
   ・zumen.html?from=fix … 同じサイト（akija114.github.io）の IndexedDB「pbmShare」の「f」→ キー「dxf」に入れた {blob, name, hide} を開く
   ・zumen.html?dxf=<URL> … その URL の DXF / PDF を開く（相手のサイトが読み出しを許可している時）
   hide：隠しておく線の名前（画層）の一覧（無くてもよい） */
(async()=>{let q;try{q=new URLSearchParams(location.search)}catch(e){return}if(!q.has("from")&&!q.has("dxf"))return;
 try{let r=null;
  if(q.has("dxf")){const u=q.get("dxf"),res=await fetch(u);if(!res.ok)throw new Error("HTTP "+res.status);const bl=await res.blob();r={blob:bl,name:decodeURIComponent((u.split("?")[0].split("/").pop())||"zumen.dxf")}}
  else r=await new Promise((ok,ng)=>{const o=indexedDB.open("pbmShare",1);o.onupgradeneeded=()=>o.result.createObjectStore("f");o.onerror=()=>ng(o.error);
   o.onsuccess=()=>{try{const t=o.result.transaction("f","readonly").objectStore("f").get("dxf");t.onsuccess=()=>ok(t.result);t.onerror=()=>ng(t.error)}catch(e){ok(null)}}});
  if(!r||!r.blob){toast("図面修正アプリから図面が届いていません。図面修正アプリの「曲げ共有で開く」から開いてください");return}
  if(Array.isArray(r.hide))try{localStorage.setItem("pbm_dxfhide",JSON.stringify(r.hide))}catch(e){}
  openDraw();const nm=r.name||"zumen.dxf",f=new File([r.blob],nm,{type:r.type||(/\.pdf$/i.test(nm)?"application/pdf":"application/dxf")});await planLoad(f);
  toast("図面修正アプリから「"+nm+"」を受け取りました");try{history.replaceState(null,"",location.pathname)}catch(e){}}
 catch(e){console.warn(e);toast("図面を受け取れませんでした（"+(e.message||e)+"）")}})();
async function planLoad(f,resume){
 try{
  if(!resume){W.resume=false;plSaveLast(f)}
  if(/\.dxf$/i.test(f.name)){
   toast("DXFを読み込んでいます…");const G=await dxfRead(f),Q=dxfToPlan(G,f);
   PLAN={...Q,H:(PLAN&&PLAN.H)||2400,CH:(PLAN&&PLAN.CH)||0};const P=PLAN;
   const all=P.texts.map(t=>t.s).join(" ").replace(/[０-９]/g,c2=>String.fromCharCode(c2.charCodeAt(0)-65248)).replace(/[＝：]/g,"=");
   const ch={};(all.match(/C\.?\s?H\s*=?\s*([1-6][0-9]{3})/gi)||[]).concat(all.match(/天井高\D{0,4}([1-6][0-9]{3})/g)||[]).forEach(x=>{const v=+(x.match(/([1-6][0-9]{3})/)||[])[1];if(v)ch[v]=(ch[v]||0)+1});
   const best=Object.keys(ch).sort((a,b)=>ch[b]-ch[a]||b-a)[0];if(best)P.CH=+best;P.chList=Object.keys(ch);
   try{$("#plPg").textContent="DXF";$("#plDen").value=""}catch(e){}
   try{planAnalyze()}catch(e){console.warn("analyze",e)}planWalls();planFit();PV.md("trace");planDraw();
   toast("DXFを読み込みました（実寸なので縮尺合わせはいりません）");
  }else if(/pdf/i.test(f.type)||/\.pdf$/i.test(f.name)){
   toast("図面を読み込んでいます…");const lib=await loadPdfJs(),buf=await f.arrayBuffer();
   const pdf=await lib.getDocument({data:buf,cMapUrl:"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/cmaps/",cMapPacked:true}).promise;
   PLAN={pdf,page:1,route:[],walls:[],segs:[],texts:[],H:(PLAN&&PLAN.H)||2400,CH:(PLAN&&PLAN.CH)||0,show:true,fkey:f.name+"|"+f.size};await planPage(resume&&W.resumePage&&W.resumePage>1?Math.min(W.resumePage,pdf.numPages):1);
  }else{
   const im=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=URL.createObjectURL(f)});
   const sc=Math.min(1,3000/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*sc);c.height=Math.round(im.height*sc);c.getContext("2d").drawImage(im,0,0,c.width,c.height);
   PLAN={img:c,W:c.width,H0:c.height,route:[],walls:[],segs:[],texts:[],mmpp:0,ptpx:0,H:(PLAN&&PLAN.H)||2400,CH:(PLAN&&PLAN.CH)||0,show:true,fkey:f.name+"|"+f.size};
   $("#plPg").textContent="写真";PV.md("cal");planFit();planDraw();toast("まず「縮尺を2点で」：長さが分かる2点をタップしてください");
  }
 }catch(e){console.warn(e);toast("図面を読み込めませんでした（ネットにつながっているか確認してください）")}
}
async function planPage(n){
 const P=PLAN,page=await P.pdf.getPage(n),v0=page.getViewport({scale:1}),sc=Math.min(4,3200/Math.max(v0.width,v0.height),Math.sqrt(6e6/(v0.width*v0.height))),vp=page.getViewport({scale:sc});
 const c=document.createElement("canvas");c.width=Math.round(vp.width);c.height=Math.round(vp.height);
 await page.render({canvasContext:c.getContext("2d"),viewport:vp}).promise;
 P.page=n;if(n!==1||!W.resume)plSavePage(n);P.img=c;P.W=c.width;P.H0=c.height;P.ptpx=sc;P.segs=[];P.arcs=[];P.texts=[];P.walls=[];P.route=[];
 /* 線（CADのPDFならデータで入っている） */
 try{const ol=await page.getOperatorList(),O=pdfjsLib.OPS,mul=(m,n2)=>[m[0]*n2[0]+m[2]*n2[1],m[1]*n2[0]+m[3]*n2[1],m[0]*n2[2]+m[2]*n2[3],m[1]*n2[2]+m[3]*n2[3],m[0]*n2[4]+m[2]*n2[5]+m[4],m[1]*n2[4]+m[3]*n2[5]+m[5]];
  let ctm=vp.transform.slice(),col="#000000";const stk=[],cst=[],hx=a2=>"#"+[0,1,2].map(k=>("0"+(Math.round(+a2[k])|0).toString(16)).slice(-2)).join(""),tp=(x,y)=>[ctm[0]*x+ctm[2]*y+ctm[4],ctm[1]*x+ctm[3]*y+ctm[5]];
  for(let i=0;i<ol.fnArray.length&&P.segs.length<150000;i++){const fn=ol.fnArray[i],a=ol.argsArray[i];
   if(fn===O.save){stk.push(ctm.slice());cst.push(col)}else if(fn===O.restore){if(stk.length)ctm=stk.pop();if(cst.length)col=cst.pop()}
   else if(fn===O.setStrokeRGBColor){try{col=hx(a)}catch(e){}}else if(fn===O.transform)ctm=mul(ctm,a);
   else if(fn===O.constructPath){const ops=a[0],ar=a[1];let k=0,cur=null,st0=null;
    for(const op of ops){if(op===O.moveTo){cur=tp(ar[k],ar[k+1]);st0=cur;k+=2}
     else if(op===O.lineTo){const p2=tp(ar[k],ar[k+1]);if(cur)P.segs.push([cur[0],cur[1],p2[0],p2[1],col]);cur=p2;k+=2}
     else if(op===O.rectangle){const x=ar[k],y=ar[k+1],w=ar[k+2],h=ar[k+3],q=[tp(x,y),tp(x+w,y),tp(x+w,y+h),tp(x,y+h)];for(let j=0;j<4;j++){const A=q[j],B2=q[(j+1)%4];P.segs.push([A[0],A[1],B2[0],B2[1],col])}cur=q[0];st0=q[0];k+=4}
     else if(op===O.curveTo||op===O.curveTo2||op===O.curveTo3){   /* 曲線（扉の弧など）：始点・真ん中・終点を覚えておく */
      let c1,c2,e;if(op===O.curveTo){c1=tp(ar[k],ar[k+1]);c2=tp(ar[k+2],ar[k+3]);e=tp(ar[k+4],ar[k+5]);k+=6}else{const q=tp(ar[k],ar[k+1]);e=tp(ar[k+2],ar[k+3]);if(op===O.curveTo2){c1=cur||q;c2=q}else{c1=q;c2=e}k+=4}
      if(cur&&P.arcs.length<20000)P.arcs.push({a:cur,m:[(cur[0]+3*c1[0]+3*c2[0]+e[0])/8,(cur[1]+3*c1[1]+3*c2[1]+e[1])/8],b:e,col});cur=e}
     else if(op===O.closePath){if(cur&&st0)P.segs.push([cur[0],cur[1],st0[0],st0[1],col]);cur=st0}}}}
  P.segs=P.segs.filter(s2=>Math.hypot(s2[2]-s2[0],s2[3]-s2[1])>1.5);
 }catch(e){console.warn("ops",e)}
 /* 文字：天井高（CH=2500 など）と縮尺（1/50 など） */
 try{const tc=await page.getTextContent();tc.items.forEach(it=>{const m=pdfjsLib.Util.transform(vp.transform,it.transform);P.texts.push({s:it.str,x:m[4],y:m[5],w:(it.width||0)*sc,h:Math.hypot(it.transform[2],it.transform[3])*sc})});
  const all=P.texts.map(t=>t.s).join(" ").replace(/[０-９]/g,c2=>String.fromCharCode(c2.charCodeAt(0)-65248)).replace(/[＝：]/g,"=");
  const ch={};(all.match(/C\.?\s?H\s*=?\s*([1-6][0-9]{3})/gi)||[]).concat(all.match(/天井高\D{0,4}([1-6][0-9]{3})/g)||[]).forEach(x=>{const v=+(x.match(/([1-6][0-9]{3})/)||[])[1];if(v)ch[v]=(ch[v]||0)+1});
  const best=Object.keys(ch).sort((a,b)=>ch[b]-ch[a]||b-a)[0];   // 同じ数なら高い方（WCなどの低い天井より、メインの部屋の方が高いことが多い）
 if(best)P.CH=+best;P.chList=Object.keys(ch);
  /* 「A1-1/30 A3-1/60」のように用紙ごとの縮尺が書いてある時は、このPDFの用紙の大きさに合う方を使う */
  let dm=null;{const pl=[...all.matchAll(/A\s*([0-4])\s*[-‐ー−:：]?\s*(?:S\s*=?\s*)?1\s*[\/／:]\s*(\d{2,3})/gi)];
   if(pl.length){const L=Math.max(v0.width,v0.height),paper=[3370,2384,1684,1191,842],k=paper.reduce((bi,v,i)=>Math.abs(v-L)<Math.abs(paper[bi]-L)?i:bi,0),hit=pl.find(m2=>+m2[1]===k);dm=hit?[0,hit[2]]:null}}
  if(!dm)dm=all.match(/(?:S\s*=?\s*)?1\s*[\/／:]\s*(30|50|60|100|150|200)\b/);if(dm){P.den=+dm[1];P.mmpp=25.4/72/sc*P.den;P.denTxt=1}
 }catch(e){console.warn("text",e)}
 $("#plPg").textContent=n+"/"+P.pdf.numPages+"ページ";$("#plDen").value=P.den?String(P.den):"";
 try{planAnalyze()}catch(e){console.warn("analyze",e)}planWalls();planFit();PV.md(P.mmpp?"trace":"cal");planDraw();
 toast(P.segs.length>50?"CADの図面です。線に吸い付きます"+(P.den?"（縮尺 1/"+P.den+"）":"。縮尺を選ぶか2点で合わせてください"):"線のデータがない図面です（スキャン）。縮尺を2点で合わせてなぞってください");
}
/* 壁：グレー・黒の平行な2本線（間隔90〜300mm・長さ1500mm以上）を壁とみなす */
function planWalls(){
 const P=PLAN;P.walls=[];if(!P||!P.mmpp||P.segs.length<4)return;
 const neu=c=>{if(!c||c.length<7)return true;const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);return Math.max(r,g,b)-Math.min(r,g,b)<24};
 const mm=P.mmpp,L=P.segs.filter(s2=>neu(s2[4])).map(s2=>{const dx=s2[2]-s2[0],dy=s2[3]-s2[1],l=Math.hypot(dx,dy);return{s:s2,l,ux:dx/l,uy:dy/l}}).filter(o=>o.l*mm>=1500).sort((a,b)=>b.l-a.l).slice(0,2500);
 const used=new Set();
 for(let i=0;i<L.length;i++){if(used.has(i))continue;const A=L[i];
  for(let j=i+1;j<L.length;j++){if(used.has(j))continue;const B2=L[j];if(Math.abs(A.ux*B2.uy-A.uy*B2.ux)>0.03)continue;
   const d=Math.abs((B2.s[0]-A.s[0])*(-A.uy)+(B2.s[1]-A.s[1])*A.ux)*mm;if(d<90||d>300)continue;
   const pr=(x,y)=>(x-A.s[0])*A.ux+(y-A.s[1])*A.uy,b1=pr(B2.s[0],B2.s[1]),b2=pr(B2.s[2],B2.s[3]),lo=Math.max(0,Math.min(b1,b2)),hi=Math.min(A.l,Math.max(b1,b2));
   if((hi-lo)*mm<1500)continue;
   const sg=((B2.s[0]-A.s[0])*(-A.uy)+(B2.s[1]-A.s[1])*A.ux)>0?1:-1,off=d/mm/2*sg,nx=-A.uy*off,ny=A.ux*off;
   /* 表や文字の枠を壁と間違えない：①2本の線の間に、数字以外の文字（表の文字）がある ②同じ始まり・終わりの線が何本も並ぶ（表の行） */
   {const dpx=d/mm,inGap=(x,y)=>{const t=(x-A.s[0])*A.ux+(y-A.s[1])*A.uy,n=((x-A.s[0])*(-A.uy)+(y-A.s[1])*A.ux)*sg;return t>=lo-2&&t<=hi+2&&n>dpx*0.1&&n<dpx*0.9};
    const word=t=>/[ぁ-んァ-ヶ一-龠]{2,}/.test(t)&&!/^[\s\d,.+\-=FLCHφ()（）]+$/.test(t);
    if(P.texts&&P.texts.some(tx=>tx.s&&word(tx.s)&&inGap(tx.x+(tx.w||0)/2,tx.y-(tx.h||0)/2)))continue;
    const tol=Math.max(3,dpx*0.15);let rowN=0;
    for(let k=0;k<L.length&&rowN<2;k++){if(k===i||k===j)continue;const C=L[k];if(Math.abs(A.ux*C.uy-A.uy*C.ux)>0.03)continue;
     const dc=Math.abs((C.s[0]-A.s[0])*(-A.uy)+(C.s[1]-A.s[1])*A.ux),q=dc/dpx,qr=Math.round(q);if(qr<1||qr>4||Math.abs(q-qr)>0.12||Math.abs(dc-dpx)<dpx*0.12)continue;const c1=pr(C.s[0],C.s[1]),c2=pr(C.s[2],C.s[3]);
     if(Math.abs(Math.min(c1,c2))<tol&&Math.abs(Math.max(c1,c2)-A.l)<tol)rowN++}
    if(rowN>=2)continue}
   P.walls.push({a:[A.s[0]+A.ux*lo+nx,A.s[1]+A.uy*lo+ny],b:[A.s[0]+A.ux*hi+nx,A.s[1]+A.uy*hi+ny],t:d});used.add(i);used.add(j);break}}
}
function planFit(){const P=PLAN,wr=$("#plWrap");if(!P||!wr)return;const W=wr.clientWidth,H=wr.clientHeight;PV.z=Math.min(W/P.W,H/P.H0)*0.95;PV.ox=(W-P.W*PV.z)/2;PV.oy=(H-P.H0*PV.z)/2}
const plLen=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1])*(PLAN.mmpp||0);
function planInfo(){const P=PLAN,el=$("#plInfo");if(!el)return;try{planSteps()}catch(e){}
 if(!P){el.textContent="PDF（CADから書き出したもの）か写真の図面を開いてください。";return}
 const tot=P.route.reduce((s2,p,i)=>i?s2+plLen(P.route[i-1],p):0,0);
 el.innerHTML=(PV.mode==="bld"?"🏗 下のパネルで置くものを選び、十字を図面の点に合わせて離すと置けます（緑の◯＝線に吸い付き）。置いたものは図にも3Dにも出ます。":PV.mode==="col"?"🎨 十字をなぞりたい配管の線に合わせて離す → その色の線だけに吸い付きます":PV.mode==="cal"?"📏 十字を長さの分かる2点に合わせて離す → 実際の長さを入力（2本指で拡大）":PV.mode==="trace"?"✏️ 指を置くと少し上に十字が出ます。十字を曲がり角に合わせて離すと点が置けます（緑の◯＝線に吸い付き）。2本指で拡大・移動":"✋ 指で動かす・2本指で拡大")+
  "<br>縮尺："+(P.mmpp?(P.autoScale?"通り芯の寸法から自動で合わせ済み（"+P.autoScale+"か所一致）":P.den?"1/"+P.den+(P.denTxt?"<span style='color:#fcd34d'>（図面の表記。印刷で縮んでいることがあるので、通り芯の寸法などで「縮尺を2点で」確認がおすすめ）</span>":""):"2点で合わせ済み"):"<b style='color:#fca5a5'>未設定</b>")+(P.fcol?"　絞り込み：<span style='display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-1px;background:"+P.fcol+"'></span>":"")+"　線："+P.segs.length+"本　壁："+P.walls.length+"か所"+(P.CH?"　天井高："+P.CH+(P.chList&&P.chList.length>1?"（候補 "+P.chList.join("・")+"）":""):"")+
  (P.route.length>1?"<br>配管："+P.route.slice(1).map((p,i)=>fmt(Math.round(plLen(P.route[i],p)/10)*10)).join("→")+"　<b>合計 約"+fmt(Math.round(tot/10)*10)+"mm</b>":"");
 $("#plH").value=P.H||"";$("#plCH").value=P.CH||"";
}
function planDraw(){
 const cv=$("#plCv");if(!cv)return;try{wzSync()}catch(e){}try{if(window.dxfChips)dxfChips()}catch(e){}planInfo();const wr=$("#plWrap"),dpr=window.devicePixelRatio||1,W=wr.clientWidth,H=wr.clientHeight;
 if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr)}
 const x=cv.getContext("2d");x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
 const P=PLAN;if(!P||!P.img)return;
 x.save();x.translate(PV.ox,PV.oy);x.scale(PV.z,PV.z);x.drawImage(P.img,0,0);
 x.strokeStyle="rgba(37,99,235,.55)";x.lineCap="round";(wzShowWalls()?P.walls:[]).forEach(w=>{x.lineWidth=Math.max(2/PV.z,w.t/(P.mmpp||1));x.beginPath();x.moveTo(...w.a);x.lineTo(...w.b);x.stroke()});
 x.restore();
 const sp=p=>[p[0]*PV.z+PV.ox,p[1]*PV.z+PV.oy];
 if(P.grids){x.font="bold 12px sans-serif";x.textAlign="center";
  P.grids.forEach(g=>{x.strokeStyle="rgba(147,51,234,.55)";x.lineWidth=1.5;x.setLineDash([8,5]);x.beginPath();
   const lo=g.lo!=null?g.lo:0,hi=g.hi!=null?g.hi:(g.ax==="X"?P.H0:P.W);   // 図が2つある時は、その図の線の範囲だけ
   if(g.ax==="X"){const a=sp([g.v,lo]),b=sp([g.v,hi]);x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1])}else{const a=sp([lo,g.v]),b=sp([hi,g.v]);x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1])}x.stroke();x.setLineDash([])})}
 if(P.cols)P.cols.forEach(c=>{const q=sp([c.cx,c.cy]);x.strokeStyle="#64748b";x.lineWidth=1.5;x.beginPath();x.moveTo(q[0]-6,q[1]);x.lineTo(q[0]+6,q[1]);x.moveTo(q[0],q[1]-6);x.lineTo(q[0],q[1]+6);x.stroke()});
 if(P.units&&!W.on)P.units.forEach((u,i)=>{const q=sp([u.cx,u.cy]);x.strokeStyle="#dc2626";x.lineWidth=2;x.beginPath();x.arc(q[0],q[1],9,0,7);x.moveTo(q[0]-14,q[1]);x.lineTo(q[0]+14,q[1]);x.moveTo(q[0],q[1]-14);x.lineTo(q[0],q[1]+14);x.stroke();
  x.fillStyle="#dc2626";x.font="bold 12px sans-serif";x.textAlign="left";x.fillText(String(i+1),q[0]+10,q[1]-10)});
 if(P.route.length){x.strokeStyle="#ea580c";x.lineWidth=5;x.lineJoin="round";x.beginPath();P.route.forEach((p,i)=>{const q=sp(p);i?x.lineTo(...q):x.moveTo(...q)});x.stroke();
  P.route.forEach((p,i)=>{const q=sp(p);x.fillStyle=i?"#ea580c":"#16a34a";x.beginPath();x.arc(q[0],q[1],i?6:8,0,7);x.fill()});
  x.font="bold 13px sans-serif";x.textAlign="center";
  for(let i=1;i<P.route.length;i++){if(!P.mmpp)break;const a=sp(P.route[i-1]),b=sp(P.route[i]),t=fmt(Math.round(plLen(P.route[i-1],P.route[i])/10)*10);
   const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;x.fillStyle="#fff";x.fillRect(mx-x.measureText(t).width/2-4,my-17,x.measureText(t).width+8,18);x.fillStyle="#9a3412";x.fillText(t,mx,my-4)}}
 planBldDraw(x,sp);try{wzDraw(x,sp)}catch(e){}
 if(PV.cal.length){x.fillStyle="#2563eb";PV.cal.forEach(p=>{const q=sp(p);x.beginPath();x.arc(q[0],q[1],7,0,7);x.fill()})}
}
/* タップした点を吸い付かせる：線の端 → 線の上 → 前の区間から15°刻み */
function planSnap(p){
 const P=PLAN,th=14/PV.z,SG=P.fcol?P.segs.filter(s2=>s2[4]===P.fcol):P.segs;let best=null,bd=th;
 for(const s2 of SG){for(const e of [[s2[0],s2[1]],[s2[2],s2[3]]]){const d=Math.hypot(e[0]-p[0],e[1]-p[1]);if(d<bd){bd=d;best=e}}}
 if(best)return best.slice();
 let bp=null;bd=9/PV.z;
 for(const s2 of SG){const dx=s2[2]-s2[0],dy=s2[3]-s2[1],l2=dx*dx+dy*dy;if(!l2)continue;let t=((p[0]-s2[0])*dx+(p[1]-s2[1])*dy)/l2;t=Math.max(0,Math.min(1,t));const q=[s2[0]+dx*t,s2[1]+dy*t],d=Math.hypot(q[0]-p[0],q[1]-p[1]);if(d<bd){bd=d;bp=q}}
 if(bp)return bp;
 const R=P.route;if(R.length){const a=R[R.length-1],ref=R.length>1?Math.atan2(a[1]-R[R.length-2][1],a[0]-R[R.length-2][0]):0;let an=Math.atan2(p[1]-a[1],p[0]-a[0]);
  const st2=Math.PI/12,k=Math.round((an-ref)/st2);an=ref+k*st2;const l=Math.hypot(p[0]-a[0],p[1]-a[1]);return[a[0]+Math.cos(an)*l,a[1]+Math.sin(an)*l]}
 return p;
}
function planGestures(){
 /* 1本指：「動かす」モードは移動、それ以外は狙い点（指の少し上の十字）を動かして、離した所に置く（拡大鏡つき）
    2本指：拡大・縮小と移動（指の真ん中を中心に） */
 const cv=$("#plCv"),wr=$("#plWrap"),pts=new Map();let st0=null,moved=false,pinch=null,aim=null,raf=0;
 const OFF=70,rel=e=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]},toImg=q=>[(q[0]-PV.ox)/PV.z,(q[1]-PV.oy)/PV.z];
 const redraw=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;planDraw();if(aim)drawAim()})};
 const drawAim=()=>{const x=cv.getContext("2d"),dpr=window.devicePixelRatio||1,P=PLAN;x.setTransform(dpr,0,0,dpr,0,0);
  const q=aim.s,ip=aim.snap,sq=[ip[0]*PV.z+PV.ox,ip[1]*PV.z+PV.oy];
  // 拡大鏡（左上か右上）
  const R=62,cx=q[0]<cv.clientWidth/2?cv.clientWidth-R-10:R+10,cy=R+10,mag=3;
  x.save();x.beginPath();x.arc(cx,cy,R,0,7);x.closePath();x.fillStyle="#fff";x.fill();x.clip();
  x.translate(cx,cy);x.scale(PV.z*mag,PV.z*mag);x.translate(-ip[0],-ip[1]);if(P&&P.img)x.drawImage(P.img,0,0);x.restore();
  x.strokeStyle="#0f172a";x.lineWidth=3;x.beginPath();x.arc(cx,cy,R,0,7);x.stroke();
  x.strokeStyle="#dc2626";x.lineWidth=1.5;x.beginPath();x.moveTo(cx-R,cy);x.lineTo(cx+R,cy);x.moveTo(cx,cy-R);x.lineTo(cx,cy+R);x.stroke();
  // 狙い点
  x.strokeStyle="#dc2626";x.lineWidth=2;x.beginPath();x.moveTo(sq[0]-18,sq[1]);x.lineTo(sq[0]+18,sq[1]);x.moveTo(sq[0],sq[1]-18);x.lineTo(sq[0],sq[1]+18);x.stroke();
  x.beginPath();x.arc(sq[0],sq[1],aim.snapped?8:5,0,7);x.strokeStyle=aim.snapped?"#16a34a":"#dc2626";x.stroke();
  x.strokeStyle="rgba(15,23,42,.35)";x.setLineDash([3,3]);x.beginPath();x.moveTo(aim.f[0],aim.f[1]);x.lineTo(q[0],q[1]);x.stroke();x.setLineDash([]);
  if(P&&P.route.length&&PV.mode==="trace"&&P.mmpp){const L=P.route[P.route.length-1],l=Math.round(Math.hypot(ip[0]-L[0],ip[1]-L[1])*P.mmpp/10)*10,lq=[L[0]*PV.z+PV.ox,L[1]*PV.z+PV.oy];
   x.strokeStyle="rgba(234,88,12,.7)";x.lineWidth=3;x.beginPath();x.moveTo(lq[0],lq[1]);x.lineTo(sq[0],sq[1]);x.stroke();
   x.font="bold 14px sans-serif";x.fillStyle="#9a3412";x.fillText(fmt(l)+"mm",sq[0]+12,sq[1]-12)}
 };
 const setAim=f=>{const q=[f[0],f[1]-OFF],ip=toImg(q),sn=PV.mode==="col"?ip:planSnap(ip);aim={f,s:q,snap:sn,snapped:Math.hypot(sn[0]-ip[0],sn[1]-ip[1])>0.01};redraw()};
 /* 指の操作はタッチイベントで直接扱う（iPhoneで一番安定）。マウスはポインターで扱う */
 const place=p=>{if(!PLAN)return;
  if(window.DXF_PICK&&PLAN.dxf)return;   // 線を消すタップ中は置かない
  if(PV.mode==="cal"){if(PV.cal.length>=2)PV.cal[1]=p;else PV.cal.push(p);planDraw();
   if(W.on){wzRender();return}
   if(PV.cal.length===2)askNum("この2点の実際の長さ（mm）は？",1000,v=>{if(!calApply(v)){PV.cal=[];planDraw()}else PV.md("trace")},()=>{PV.cal=[];planDraw()})}
  else if(PV.mode==="col"){let bp=null,bd=14/PV.z;for(const s2 of PLAN.segs){const dx=s2[2]-s2[0],dy=s2[3]-s2[1],l2=dx*dx+dy*dy;if(!l2)continue;let t=((p[0]-s2[0])*dx+(p[1]-s2[1])*dy)/l2;t=Math.max(0,Math.min(1,t));const d=Math.hypot(s2[0]+dx*t-p[0],s2[1]+dy*t-p[1]);if(d<bd){bd=d;bp=s2}}
    if(bp&&bp[4]){PLAN.fcol=bp[4];toast("この色の線だけに吸い付きます（もう一度押すと解除）");PV.md("trace")}else toast("線の上に十字を合わせて離してください");planDraw()}
  else if(PV.mode==="bld"){planBldPlace(p)}
  else if(PV.mode==="trace"){if(!PLAN.mmpp){toast("先に縮尺を合わせてください");planDraw();return}PLAN.route.push(p);planDraw()}
  else planDraw()};
 let G=null;   // 今のジェスチャー：{n:指の数, base:{c,d,z,ox,oy}}
 const tp=t=>{const r=cv.getBoundingClientRect();return[t.clientX-r.left,t.clientY-r.top]};
 const startG=ts=>{if(ts.length>=2){const a=tp(ts[0]),b=tp(ts[1]);G={n:2,c:[(a[0]+b[0])/2,(a[1]+b[1])/2],d:Math.hypot(a[0]-b[0],a[1]-b[1])||1,z:PV.z,ox:PV.ox,oy:PV.oy};aim=null}
  else if(ts.length===1){const a=tp(ts[0]);G={n:1,p:a,ox:PV.ox,oy:PV.oy,aimOk:G===null};if(PV.mode!=="move"&&PLAN&&G.aimOk)setAim(a)}else G=null;redraw()};
 cv.addEventListener("touchstart",e=>{e.preventDefault();startG(e.touches)},{passive:false});
 cv.addEventListener("touchmove",e=>{e.preventDefault();if(!G)return;const ts=e.touches;
  if(G.n===2&&ts.length>=2){const a=tp(ts[0]),b=tp(ts[1]),c=[(a[0]+b[0])/2,(a[1]+b[1])/2],z=Math.max(0.03,Math.min(30,G.z*Math.hypot(a[0]-b[0],a[1]-b[1])/G.d));
   PV.ox=c[0]-(G.c[0]-G.ox)*z/G.z;PV.oy=c[1]-(G.c[1]-G.oy)*z/G.z;PV.z=z;redraw();return}
  if(G.n===1&&ts.length===1){const p=tp(ts[0]);if(aim){setAim(p);return}if(PV.mode==="move"){PV.ox=G.ox+p[0]-G.p[0];PV.oy=G.oy+p[1]-G.p[1];redraw()}}},{passive:false});
 const tend=e=>{e.preventDefault();const ts=e.touches;
  if(G&&G.n===1&&ts.length===0&&aim&&e.type==="touchend"){const p=aim.snap;aim=null;G=null;place(p);return}
  if(ts.length===0){G=null;aim=null;redraw();return}
  // 指が減った：残りの指の今の位置から取り直す（位置が飛ばない）。2本→1本のあとは狙いを出さない
  if(ts.length===1){const a=tp(ts[0]);G={n:1,p:a,ox:PV.ox,oy:PV.oy,aimOk:false};aim=null;redraw()}else startG(ts)};
 cv.addEventListener("touchend",tend,{passive:false});cv.addEventListener("touchcancel",tend,{passive:false});
 /* DXF「線をタップで消す」：指1本（マウスも）の短いタップで、いちばん近い線の種類を隠す */
 let pk0=null;const pkGo=(x,y)=>{if(!window.DXF_PICK||!PLAN||!PLAN.dxf||!window.dxfPickHide)return;const r=cv.getBoundingClientRect();dxfPickHide([(x-r.left-PV.ox)/PV.z,(y-r.top-PV.oy)/PV.z],16/PV.z)};
 cv.addEventListener("touchstart",e=>{pk0=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()}:null},{passive:true});
 cv.addEventListener("touchend",e=>{const c=e.changedTouches&&e.changedTouches[0];if(pk0&&c&&e.touches.length===0&&Math.hypot(c.clientX-pk0.x,c.clientY-pk0.y)<12&&Date.now()-pk0.t<700)pkGo(c.clientX,c.clientY);pk0=null},{passive:true});
 cv.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse")pk0={x:e.clientX,y:e.clientY,t:Date.now()}});
 cv.addEventListener("pointerup",e=>{if(e.pointerType!=="mouse"||!pk0)return;if(Math.hypot(e.clientX-pk0.x,e.clientY-pk0.y)<6)pkGo(e.clientX,e.clientY);pk0=null});
 /* マウス（パソコン） */
 cv.addEventListener("pointerdown",e=>{if(e.pointerType!=="mouse")return;cv.setPointerCapture(e.pointerId);const p=rel(e);st0={p,ox:PV.ox,oy:PV.oy};moved=false;if(PV.mode!=="move"&&PLAN)setAim(p)});
 cv.addEventListener("pointermove",e=>{if(e.pointerType!=="mouse"||!st0)return;const p=rel(e);if(aim){setAim(p);return}if(PV.mode==="move"){PV.ox=st0.ox+p[0]-st0.p[0];PV.oy=st0.oy+p[1]-st0.p[1];redraw()}});
 cv.addEventListener("pointerup",e=>{if(e.pointerType!=="mouse")return;st0=null;if(aim){const p=aim.snap;aim=null;place(p)}});
 cv.addEventListener("wheel",e=>{e.preventDefault();const r=cv.getBoundingClientRect(),cx=e.clientX-r.left,cy=e.clientY-r.top,z=Math.max(0.03,Math.min(30,PV.z*Math.exp(-e.deltaY*0.0015)));PV.ox=cx-(cx-PV.ox)*z/PV.z;PV.oy=cy-(cy-PV.oy)*z/PV.z;PV.z=z;redraw()},{passive:false});
 /* iPhoneの画面ごとの拡大（ピンチ・ダブルタップ）を止める：これが「違う所が拡大される」原因 */
 const ov=$("#planOv");["touchstart","touchmove"].forEach(t=>wr.addEventListener(t,e=>{if(e.target&&e.target.closest&&e.target.closest("#wzBal,#plFloat,#dxfChips"))return;if(e.cancelable)e.preventDefault()},{passive:false}));
 ["gesturestart","gesturechange","gestureend"].forEach(t=>ov.addEventListener(t,e=>e.preventDefault(),{passive:false}));
 window.addEventListener("resize",()=>{if(ov.style.display!=="none")planDraw()});
}
/* ===== ルートおまかせ：始点（室内機の配管口）と終点（室外機）から、配管ルートを何パターンか作る ===== */
/* 3Dの折れ線 → 曲げ共有の行（長さ＝角から角、角度、向き t：0上・90右・180下・270左） */
function polyToRows(P){
 const V=THREE.Vector3;let d=new V(1,0,0),u=new V(0,1,0),r=new V(0,0,1);const rows=[];
 for(let i=0;i<P.length-1;i++){const seg=P[i+1].clone().sub(P[i]),l=Math.round(seg.length());let a=0,t=0;
  if(i<P.length-2){const d1=seg.clone().normalize(),d2=P[i+2].clone().sub(P[i+1]).normalize(),c=Math.max(-1,Math.min(1,d1.dot(d2)));a=Math.round(Math.acos(c)*180/Math.PI);
   if(a>0){const b=d2.clone().addScaledVector(d1,-c).normalize();t=normT(Math.round(Math.atan2(b.dot(r),b.dot(u))*180/Math.PI));
    const ax=d1.clone().cross(d2).normalize(),ang=Math.acos(c);u=u.clone().applyAxisAngle(ax,ang);r=r.clone().applyAxisAngle(ax,ang);d=d2.clone()}}
  rows.push({l,a:ANG.includes(a)?a:(a>60?90:45),t,o:false})}
 return rows;
}
function autoRoutes(X,Y,Z,o){
 const V=THREE.Vector3,S=Math.max(150,o.stub||300),M=150,out=[];
 const mk=(name,legs)=>{const P=[new V()];legs.forEach(v=>{if(v.length()<1)return;const last=P[P.length-1],prevDir=P.length>1?last.clone().sub(P[P.length-2]).normalize():null,nd=v.clone().normalize();
   if(prevDir&&prevDir.dot(nd)>0.999)last.add(v);else P.push(last.clone().add(v))});
  for(let i=1;i<P.length-1;i++)if(P[i].distanceTo(P[i-1])<M||P[i+1].distanceTo(P[i])<M)return;   // 曲げと曲げの間が短すぎるものは除く
  if(P[1]&&P[1].distanceTo(P[0])<Math.min(S,150))return;
  let L=0;for(let i=1;i<P.length;i++)L+=P[i].distanceTo(P[i-1]);
  const key=P.map(p=>[p.x,p.y,p.z].map(Math.round).join(",")).join("|");if(out.some(x=>x.key===key))return;
  out.push({name,P,L:Math.round(L/10)*10,n:P.length-2,key})};
 const x=new V(1,0,0),y=new V(0,1,0),z=new V(0,0,1);
 const fx=X>=S?X:S,rx=X-fx;   // 前に出る分（足りなければ最初のまっすぐだけ出して、あとで戻る）
 mk("前→横→上下",[x.clone().multiplyScalar(fx),z.clone().multiplyScalar(Z),x.clone().multiplyScalar(rx),y.clone().multiplyScalar(Y)]);
 mk("前→上下→横",[x.clone().multiplyScalar(fx),y.clone().multiplyScalar(Y),z.clone().multiplyScalar(Z),x.clone().multiplyScalar(rx)]);
 mk("少し出て横→前→上下",[x.clone().multiplyScalar(S),z.clone().multiplyScalar(Z),x.clone().multiplyScalar(X-S),y.clone().multiplyScalar(Y)]);
 mk("少し出て上下→前→横",[x.clone().multiplyScalar(S),y.clone().multiplyScalar(Y),x.clone().multiplyScalar(X-S),z.clone().multiplyScalar(Z)]);
 mk("少し出て上下→横→前",[x.clone().multiplyScalar(S),y.clone().multiplyScalar(Y),z.clone().multiplyScalar(Z),x.clone().multiplyScalar(X-S)]);
 if(o.d45){const az=Math.abs(Z),sz=Math.sign(Z)||1;
  if(az>=M&&X-S-az>=0){mk("45°で寄せて→前→上下",[x.clone().multiplyScalar(S),new V(az,0,sz*az),x.clone().multiplyScalar(X-S-az),y.clone().multiplyScalar(Y)]);
   mk("前→45°で寄せて→上下",[x.clone().multiplyScalar(X-az),new V(az,0,sz*az),y.clone().multiplyScalar(Y)])}}
 out.forEach(r=>{r.rows=polyToRows(r.P)});
 return out.filter(r=>r.rows.every(w=>w.l>0)).sort((a,b)=>a.L-b.L||a.n-b.n);
}
const RT={X:3000,Y:-500,Z:1000,stub:300,d45:true};
let RTM="pos";
function openRoute(){
 $("#routeList").innerHTML="";$("#routeOv").classList.add("on");
 $("#rtTab").innerHTML=[["pos","📍 機器の位置から"],["rel","📏 配管口からの距離"]].map(([k,t])=>`<button data-v="${k}" class="${RTM===k?"on":""}" style="font-size:14px">${t}</button>`).join("");
 $("#rtTab").onclick=e=>{const b=e.target.closest("button");if(!b)return;RTM=b.dataset.v;openRoute()};
 $("#rtNote").textContent=RTM==="pos"?"先に室内機と室外機を置いてから、配管口どうしをつなぐルートを何パターンか作ります。":"室内機の配管口から見た、室外機（終点）の位置を入れると、配管ルートを何パターンか作ります。";
 if(RTM==="pos")openRoutePos();else openRouteRel();
}
function openRouteRel(){
 const box=$("#routeIn");
 const fld=(k,lab,opts)=>`<div class="field" style="margin-bottom:8px"><label>${lab}</label><div style="display:flex;gap:6px"><select data-s="${k}" style="height:44px;border-radius:12px;font-size:15px;font-weight:700;padding:0 8px">${opts.map(([v,t])=>`<option value="${v}"${(RT[k]>=0?1:-1)===v?" selected":""}>${t}</option>`).join("")}</select><input data-k="${k}" inputmode="numeric" value="${uVal(Math.abs(RT[k]))}" style="flex:1"></div></div>`;
 box.innerHTML=fld("X","前後（配管が出る向きが「前」）",[[1,"前へ"],[-1,"後ろへ"]])+fld("Z","左右（配管口から前を見て）",[[1,"右へ"],[-1,"左へ"]])+fld("Y","上下",[[-1,"下へ"],[1,"上へ"]])+
  `<div class="field" style="margin-bottom:8px"><label>最初のまっすぐ（配管口から最初の曲げまで・mm）</label><input data-k="stub" inputmode="numeric" value="${uVal(RT.stub)}"></div>
   <label style="display:flex;align-items:center;gap:8px;font-size:14px;margin:4px 0 10px"><input id="rt45" type="checkbox" ${RT.d45?"checked":""} style="width:22px;height:22px">45°の曲げも使う</label>
   <button class="sharebtn" id="rtGo" style="width:100%;margin:0 0 10px;background:#2563eb;color:#fff">🧭 ルートを作る</button>`;
 const read=()=>{box.querySelectorAll("[data-k]").forEach(i=>{const k=i.dataset.k,v=Math.abs(uParse(i.value)||0);if(k==="stub")RT.stub=v;else{const sg=+box.querySelector(`[data-s="${k}"]`).value;RT[k]=sg*v}});RT.d45=$("#rt45").checked};
 $("#rtGo").onclick=()=>{read();renderRoutes(autoRoutes(RT.X,RT.Y,RT.Z,{stub:RT.stub,d45:RT.d45}))};
}
/* ===== 斜め上から見た3D風の図（軽いSVG）：機器の箱・床・配管・曲げの番号 ===== */
const CIRC=["①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩","⑪","⑫"];
function isoSvg(o,W,H,small,rot){
 const ang=(rot||0)*Math.PI/4+0.0,ca=Math.cos(ang),sa=Math.sin(ang);
 const pr=(x,y,z)=>{const a=x*ca-z*sa,b=x*sa+z*ca;return[(a-b)*0.866,(a+b)*0.5-y*0.9,a+b]};
 const pts=o.pipe.slice();const bxs=o.boxes||[];
 const corners=b=>{const c=[];for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z])c.push({x,y,z});return c};
 bxs.forEach(b=>b.c=corners(b));
 const all=pts.concat(...bxs.map(b=>b.c));
 let x0=Math.min(...all.map(p=>p.x))-250,x1=Math.max(...all.map(p=>p.x))+250,z0=Math.min(...all.map(p=>p.z))-250,z1=Math.max(...all.map(p=>p.z))+250;
 const fy=o.floorY;const hasF=fy!=null;
 const sp=[];all.forEach(p=>sp.push(pr(p.x,p.y,p.z)));
 if(hasF)[[x0,z0],[x1,z0],[x1,z1],[x0,z1]].forEach(([x,z])=>sp.push(pr(x,fy,z)));
 const mnx=Math.min(...sp.map(p=>p[0])),mxx=Math.max(...sp.map(p=>p[0])),mny=Math.min(...sp.map(p=>p[1])),mxy=Math.max(...sp.map(p=>p[1])),pad=small?6:16;
 const sc=Math.min((W-2*pad)/Math.max(1,mxx-mnx),(H-2*pad)/Math.max(1,mxy-mny)),ox=(W-(mxx-mnx)*sc)/2-mnx*sc,oy=(H-(mxy-mny)*sc)/2-mny*sc;
 const P=(x,y,z)=>{const q=pr(x,y,z);return[(q[0]*sc+ox).toFixed(1),(q[1]*sc+oy).toFixed(1)]},J=a=>a.map(p=>p.join(",")).join(" ");
 let s=`<svg viewBox="0 0 ${W} ${H}" style="width:${small?W+"px":"100%"};height:${small?H+"px":"auto"};background:#f1f5f9;border-radius:${small?10:12}px;flex:none;touch-action:none">`;
 if(hasF){s+=`<polygon points="${J([[x0,z0],[x1,z0],[x1,z1],[x0,z1]].map(([x,z])=>P(x,fy,z)))}" fill="#dbe4ee" stroke="#94a3b8" stroke-width="1"/>`;
  if(!small){let g="";for(let x=Math.ceil(x0/1000)*1000;x<=x1;x+=1000)g+=`<polyline points="${J([P(x,fy,z0),P(x,fy,z1)])}"/>`;for(let z=Math.ceil(z0/1000)*1000;z<=z1;z+=1000)g+=`<polyline points="${J([P(x0,fy,z),P(x1,fy,z)])}"/>`;s+=`<g fill="none" stroke="#b6c4d4" stroke-width=".7">${g}</g>`}
  s+=`<polyline points="${J(pts.map(p=>P(p.x,fy,p.z)))}" fill="none" stroke="#64748b" stroke-width="${small?1.5:2}" stroke-dasharray="4 3" opacity=".7"/>`;
  if(!small)pts.forEach((p,i)=>{if(i>0&&i<pts.length-1||i===pts.length-1)s+=`<line x1="${P(p.x,p.y,p.z)[0]}" y1="${P(p.x,p.y,p.z)[1]}" x2="${P(p.x,fy,p.z)[0]}" y2="${P(p.x,fy,p.z)[1]}" stroke="#64748b" stroke-width="1" stroke-dasharray="2 3"/>`})}
 bxs.forEach(b=>{const C=b.c,id=(i,j,k)=>C[i*4+j*2+k];
  const F=[[id(0,0,0),id(0,0,1),id(0,1,1),id(0,1,0)],[id(1,0,0),id(1,0,1),id(1,1,1),id(1,1,0)],[id(0,0,0),id(1,0,0),id(1,0,1),id(0,0,1)],[id(0,1,0),id(1,1,0),id(1,1,1),id(0,1,1)],[id(0,0,0),id(1,0,0),id(1,1,0),id(0,1,0)],[id(0,0,1),id(1,0,1),id(1,1,1),id(0,1,1)]];
  F.map((f,n)=>{const c=f.reduce((a,p)=>({x:a.x+p.x/4,y:a.y+p.y/4,z:a.z+p.z/4}),{x:0,y:0,z:0}),q=pr(c.x,c.y,c.z);return{f,n,d:q[2]*0.5+c.y*0.9}}).sort((a,b)=>a.d-b.d).forEach(({f,n})=>{
   s+=`<polygon points="${J(f.map(p=>P(p.x,p.y,p.z)))}" fill="${b.col}" fill-opacity="${n===3?.75:.5}" stroke="${b.line}" stroke-width="1.2" stroke-linejoin="round"/>`});
  if(!small){const t=P((b.min.x+b.max.x)/2,b.max.y,(b.min.z+b.max.z)/2);s+=`<text x="${t[0]}" y="${(+t[1]-6).toFixed(1)}" font-size="11" font-weight="800" fill="${b.line}" text-anchor="middle" stroke="#fff" stroke-width="3" paint-order="stroke">${b.name}</text>`}});
 const pl=pts.map(p=>P(p.x,p.y,p.z));
 s+=`<polyline points="${J(pl)}" fill="none" stroke="#fff" stroke-width="${small?6:8}" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${J(pl)}" fill="none" stroke="#c2703a" stroke-width="${small?3.5:5}" stroke-linejoin="round" stroke-linecap="round"/>`;
 s+=`<circle cx="${pl[0][0]}" cy="${pl[0][1]}" r="${small?4:6}" fill="#16a34a" stroke="#fff" stroke-width="1.5"/><circle cx="${pl[pl.length-1][0]}" cy="${pl[pl.length-1][1]}" r="${small?4:6}" fill="#dc2626" stroke="#fff" stroke-width="1.5"/>`;
 if(!small)for(let i=1;i<pl.length-1;i++)s+=`<circle cx="${pl[i][0]}" cy="${pl[i][1]}" r="9" fill="#1e293b" stroke="#fff" stroke-width="1.5"/><text x="${pl[i][0]}" y="${pl[i][1]}" font-size="11" font-weight="800" fill="#fff" text-anchor="middle" dy="4">${i}</text>`;
 return s+"</svg>"}
/* 選んだルートを大きく見て、よければ実行 */
function routeConfirm(r,idx,ro,doIt){
 let rot=0;const ov=document.createElement("div");ov.className="ov on";ov.style.zIndex="90";
 const rows=r.rows.map((w,i)=>`<div style="display:flex;gap:6px;padding:3px 0;border-bottom:1px solid #e2e8f0;font-size:15px"><b style="width:26px">${i<r.rows.length-1?(i+1):"終"}</b><span><b>${fmt(w.l)}</b>mm${w.a?"　→　"+w.a+"°"+dirShort2(w.t):"（ここまで）"}</span></div>`).join("");
 ov.innerHTML=`<div class="sheet" style="overflow-y:auto"><div class="shead"><h3>👀 このルートでいい？</h3><button class="rcX">✕</button></div>
  <div style="font-size:15px;font-weight:800;margin-bottom:6px">${String.fromCharCode(65+idx)}：${r.name}　合計 ${fmt(r.L)}mm・曲げ ${r.n}回</div>
  <div class="rcView"></div>
  <div style="display:flex;gap:8px;margin:8px 0"><button class="sharebtn rcL" style="flex:1;margin:0">↺ 左にまわす</button><button class="sharebtn rcR" style="flex:1;margin:0">↻ 右にまわす</button></div>
  <div class="note" style="margin:0 0 8px">緑＝配管の始まり、赤＝室外機側の終わり。丸の数字＝曲げの順番（下の表と同じ）。点線は床への影です。</div>
  <div class="ctitle">曲げ共有</div>${rows}
  <div style="display:flex;gap:8px;margin-top:12px"><button class="sharebtn rcB" style="flex:1;margin:0">← 戻って選びなおす</button><button class="sharebtn rcOk" style="flex:1;margin:0;background:#16a34a;color:#fff">✅ これで実行</button></div></div>`;
 document.body.appendChild(ov);
 const draw=()=>{ov.querySelector(".rcView").innerHTML=ro.big?ro.big(r,rot):""};draw();
 const close=()=>ov.remove();
 ov.querySelector(".rcL").onclick=()=>{rot=(rot+7)%8;draw()};ov.querySelector(".rcR").onclick=()=>{rot=(rot+1)%8;draw()};
 ov.querySelector(".rcX").onclick=close;ov.querySelector(".rcB").onclick=close;ov.addEventListener("click",e=>{if(e.target===ov)close()});
 ov.querySelector(".rcOk").onclick=()=>{close();doIt()}}
function renderRoutes(L,ro){
 ro=ro||{};const box=$("#routeList");
 const relIso=(r,W,H,small,rot)=>isoSvg({pipe:r.P.map(p=>({x:p.x,y:p.y,z:p.z})),boxes:[],floorY:null},W,H,small,rot);
 if(!ro.proj){ro.proj=r=>relIso(r,150,96,true,0);ro.big=(r,rot)=>relIso(r,340,240,false,rot)}
 if(!L.length){box.innerHTML='<div class="note">ルートが作れませんでした。距離が短すぎる（曲げと曲げの間が150mmより短い）ときは作れません。</div>';return}
 const svg=r=>{const P=r.P,xs=P.map(p=>p.x),zs=P.map(p=>p.z),ys=P.map(p=>p.y),mn=Math.min(...xs,...zs.map(z=>z*0)),W=120,Hh=70;
  // 上から見た図（横＝前、縦＝右）と、上下の量
  const minx=Math.min(...xs),maxx=Math.max(...xs),minz=Math.min(...zs),maxz=Math.max(...zs),sc=Math.min((W-16)/Math.max(1,maxx-minx),(Hh-16)/Math.max(1,maxz-minz));
  const pt=p=>[8+(p.x-minx)*sc,8+(p.z-minz)*sc];
  return `<svg viewBox="0 0 ${W} ${Hh}" style="width:120px;height:70px;background:#f1f5f9;border-radius:10px;flex:none"><polyline points="${P.map(p=>pt(p).join(",")).join(" ")}" fill="none" stroke="#c2703a" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${pt(P[0])[0]}" cy="${pt(P[0])[1]}" r="5" fill="#16a34a"/><circle cx="${pt(P[P.length-1])[0]}" cy="${pt(P[P.length-1])[1]}" r="5" fill="#dc2626"/></svg>`};
 box.innerHTML='<div class="ctitle">できたルート（短い順）　押すと、3Dで確認できます</div>'+L.map((r,i)=>`<button class="ubtn" data-i="${i}" style="width:100%;height:auto;min-height:84px;flex-direction:row;justify-content:flex-start;gap:10px;padding:8px;margin-bottom:6px;text-align:left">${ro.proj?ro.proj(r):svg(r)}<span style="display:flex;flex-direction:column;gap:2px"><b style="font-size:15px">${String.fromCharCode(65+i)}：${r.name}</b><span style="font-size:13px">合計 <b>${fmt(r.L)}mm</b>・曲げ ${r.n}回</span><small style="font-weight:600;opacity:.75">${r.rows.map(w=>fmt(w.l)+(w.a?"→"+w.a+"°"+dirShort2(w.t):"")).join(" ")}</small></span></button>`).join("")+
  `<div class="note">${ro.note||"斜め上から見た図（緑＝配管の始まり、赤＝終わり）。押すと大きく見られて、そこで「実行」できます。"}今の配管（メイン）を置き換えます（↩️で戻せます）。</div>`;
 box.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{const r=L[+b.dataset.i];routeConfirm(r,+b.dataset.i,ro,()=>{st.nopipe=false;if(leg!=="m")leg="m";if(ro.apply)ro.apply(r);st.rows=normRows(r.rows.map(w=>({...w})),[{l:500,a:0,t:0,o:false}]);sel=0;save();render();
  $("#routeOv").classList.remove("on");if(T){build3D();fitT(true)}toast(String.fromCharCode(65+(+b.dataset.i))+"：「"+r.name+"」にしました（合計 "+fmt(r.L)+"mm）。別のパターンはもう一度ルートおまかせから")})});
}
/* ===== 機器の位置から：室内機と室外機を先に置いて、配管口どうしをつなぐルートを作る ===== */
const RPD=()=>({it:"cas2",im:"56",ws:"rb",d:1,ch:2500,top:2400,oe:"p40",ox:"s",of:2,mx:3000,mz:1500,hb:0,hs:1,S:300,S2:300,d45:true});
let RP=(()=>{try{return Object.assign(RPD(),JSON.parse(localStorage.getItem("pbm_rp")||"{}"))}catch(e){return RPD()}})();
const rpSave=()=>{try{localStorage.setItem("pbm_rp",JSON.stringify(RP))}catch(e){}};
const MDIR=[[0,-1],[1,0],[0,1],[-1,0]],cwM=a=>[-a[1],a[0]];
/* 機器の外形（寸法線などは除く） */
function uBox(g){g.updateMatrixWorld(true);const b=new THREE.Box3();
 g.traverse(o=>{if(o.geometry&&!(o.userData&&o.userData.dimcat)&&!(o.userData&&o.userData.lab))b.union(new THREE.Box3().setFromObject(o))});return b}
/* 置き方を計算：ワールド（配管の始点＝室内機の配管口＝原点）での両方の配管口・外形 */
function rpGeom(){
 const V=THREE.Vector3,up=new V(0,1,0),R=RP;
 const D0=(R.it==="wall"&&(WALLX[R.ws]||WALLX.rb).k==="d")?new V(0,-1,0):new V(1,0,0),F0=frameFor(D0);
 const mi=makeUnit(R.it,{kind:st.info.kind,wx:R.ws,ck:st.units.cs,mm:R.im});
 mi.g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(F0.ex,F0.ey,F0.ez));mi.g.position.set(0,0,0);
 const bi=uBox(mi.g),ci=bi.getCenter(new V());
 let GY;if(mi.c2){mi.g.updateMatrixWorld(true);GY=mi.g.localToWorld(new V(...mi.c2.ceil)).y-R.ch}else GY=bi.max.y-R.top;
 /* 図（上から見た図・mm、下向きが+）とワールドの対応：ワールド+x → A、+z → A を時計回り */
 const A=MDIR[R.d],B=cwM(A);
 const w2m=(x,z)=>[x*A[0]+z*B[0],x*A[1]+z*B[1]],m2w=(mx,my)=>[mx*A[0]+my*A[1],mx*B[0]+my*B[1]];
 /* 室外機：正面の向き（図）→ ワールド → 配管口の向き ex */
 const ox=outExitKey(R.oe,R.ox),fm=MDIR[R.of],fw=m2w(fm[0],fm[1]),front=new V(fw[0],0,fw[1]),fl=OUT_R[ox][2];
 let ex,ey;
 if(["d","m"].includes(ox)){ex=new V(0,-1,0);ey=front.clone()}
 else{ex=Math.abs(fl[0])>0.5?front.clone().multiplyScalar(fl[0]):up.clone().cross(front).multiplyScalar(fl[2]);ey=up.clone()}
 const ez=ex.clone().cross(ey);
 const mo=makeUnit("out",{kind:st.info.kind,om:R.oe,ox});
 mo.g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ex,ey,ez));mo.g.position.set(0,0,0);
 const bo=uBox(mo.g),co=bo.getCenter(new V());
 const off=m2w(R.mx,-R.mz),Cw=new V(ci.x+off[0],0,ci.z+off[1]);
 const E=new V(Cw.x-co.x,GY+R.hs*R.hb-bo.min.y,Cw.z-co.z),Ap=E.clone().addScaledVector(ex,Math.max(150,R.S2));
 const loc=p=>new V(p.dot(F0.ex),p.dot(F0.ey),p.dot(F0.ez)),wor=p=>F0.ex.clone().multiplyScalar(p.x).addScaledVector(F0.ey,p.y).addScaledVector(F0.ez,p.z);
 return{D0,F0,GY,bi,bo,E,Ap,ex,front,ox,w2m,m2w,loc,wor,cas2:!!mi.c2,inName:mi.name,outName:mo.name,
  hIn:-GY,hOut:E.y-GY};
}
/* 始点（+x向きに出る）から A を通って E に入るルート。座標は始点の向きの座標（x前・y上・z右） */
function autoRoutes2(A,E,o){
 const V=THREE.Vector3,S=Math.max(150,o.stub||300),M=150,out=[],ax=[new V(1,0,0),new V(0,1,0),new V(0,0,1)];
 const mk=(name,legs)=>{const P=[new V()];
  for(const v of legs){if(v.length()<1)continue;const last=P[P.length-1],pd=P.length>1?last.clone().sub(P[P.length-2]).normalize():null,nd=v.clone().normalize();
   if(pd&&pd.dot(nd)>0.999){last.add(v);continue}if(pd&&pd.dot(nd)<-0.999)return;P.push(last.clone().add(v))}
  if(P.length<2)return;
  for(let i=1;i<P.length-1;i++){if(P[i].distanceTo(P[i-1])<M||P[i+1].distanceTo(P[i])<M)return;
   const c=P[i].clone().sub(P[i-1]).normalize().dot(P[i+1].clone().sub(P[i]).normalize()),a=Math.acos(Math.max(-1,Math.min(1,c)))*180/Math.PI;if(!ANG.some(g=>g>0&&Math.abs(g-a)<0.5))return}
  if(P[1].distanceTo(P[0])<Math.min(S,150))return;
  let L=0;for(let i=1;i<P.length;i++)L+=P[i].distanceTo(P[i-1]);
  const key=P.map(p=>[p.x,p.y,p.z].map(Math.round).join(",")).join("|");if(out.some(x=>x.key===key))return;
  out.push({name,P,L:Math.round(L/10)*10,n:P.length-2,key})};
 const st0=new V(S,0,0),dv=A.clone().sub(st0),fin=E.clone().sub(A),comp=[dv.x,dv.y,dv.z];
 const NM=["前後","上下","左右"],perms=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
 perms.forEach(pm=>{
  mk(pm.map(i=>NM[i]).join("→"),[st0.clone(),...pm.map(i=>ax[i].clone().multiplyScalar(comp[i])),fin.clone()]);
  if(o.d45){const ix=pm.indexOf(0),iz=pm.indexOf(2);
   if(Math.abs(ix-iz)===1){const a=Math.abs(comp[0]),b=Math.abs(comp[2]),m=Math.min(a,b);
    if(m>=M){const dg=new V(Math.sign(comp[0])*m,0,Math.sign(comp[2])*m),rest=a>b?new V(comp[0]-Math.sign(comp[0])*m,0,0):new V(0,0,comp[2]-Math.sign(comp[2])*m),y=ax[1].clone().multiplyScalar(comp[1]),k=Math.min(ix,iz);
     [[dg,rest],[rest,dg]].forEach(([p,q],j)=>{const seq=[];let used=false;pm.forEach((i,n)=>{if(i===1)seq.push(y);else if(!used){seq.push(p,q);used=true}});
      mk(pm.filter(i=>i!==2).map(i=>i===0?(j?"まっすぐ→45°":"45°→まっすぐ"):NM[i]).join("→"),[st0.clone(),...seq,fin.clone()])})}}}
 });
 out.forEach(r=>{r.rows=polyToRows(r.P)});
 return out.filter(r=>r.rows.every(w=>w.l>0)).sort((a,b)=>a.L-b.L||a.n-b.n).slice(0,8);
}
function rpIso(G,r,W,H,small,rot){const V=THREE.Vector3;
 return isoSvg({pipe:r.P.map(p=>{const w=G.wor(p);return{x:w.x,y:w.y,z:w.z}}),floorY:G.GY,boxes:[
  {min:G.bi.min,max:G.bi.max,col:"#60a5fa",line:"#1d4ed8",name:"室内機"},
  {min:G.bo.min.clone().add(G.E),max:G.bo.max.clone().add(G.E),col:"#f87171",line:"#b91c1c",name:"室外機"}]},W,H,small,rot)}
/* 図：両方の機器の外形と配管口、ルート */
function rpSvg(G,routes,W,H,small){
 const V=THREE.Vector3,pts=[];
 const rect=b=>{const c=[[b.min.x,b.min.z],[b.max.x,b.min.z],[b.max.x,b.max.z],[b.min.x,b.max.z]].map(([x,z])=>G.w2m(x,z));c.forEach(p=>pts.push(p));return c};
 const ri=rect(G.bi),ro=rect({min:G.bo.min.clone().add(G.E),max:G.bo.max.clone().add(G.E)});
 const pI=G.w2m(0,0),pE=G.w2m(G.E.x,G.E.z);pts.push(pI,pE);
 const rl=(routes||[]).map(r=>r.P.map(p=>{const w=G.wor(p);const m=G.w2m(w.x,w.z);pts.push(m);return m}));
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),mnx=Math.min(...xs),mxx=Math.max(...xs),mny=Math.min(...ys),mxy=Math.max(...ys),pad=small?8:22;
 const sc=Math.min((W-2*pad)/Math.max(1,mxx-mnx),(H-2*pad)/Math.max(1,mxy-mny)),ox=(W-(mxx-mnx)*sc)/2,oy=(H-(mxy-mny)*sc)/2;
 const P=p=>[(ox+(p[0]-mnx)*sc).toFixed(1),(oy+(p[1]-mny)*sc).toFixed(1)],poly=a=>a.map(p=>P(p).join(",")).join(" ");
 const ci=G.bi.getCenter(new V()),cI=P(G.w2m(ci.x,ci.z)),co=G.bo.getCenter(new V()).add(G.E),cO=P(G.w2m(co.x,co.z));
 const fs=G.front,fm=G.w2m(fs.x,fs.z),half=Math.abs(fs.x)*(G.bo.max.x-G.bo.min.x)+Math.abs(fs.z)*(G.bo.max.z-G.bo.min.z);
 const fp=P([G.w2m(co.x,co.z)[0]+fm[0]*half/2,G.w2m(co.x,co.z)[1]+fm[1]*half/2]);
 const d0=G.D0.y<-0.5?null:P([pI[0]+G.w2m(1,0)[0]*250,pI[1]+G.w2m(1,0)[1]*250]);
 let s=`<svg viewBox="0 0 ${W} ${H}" style="width:${small?W+"px":"100%"};height:${small?H+"px":"auto"};background:#f1f5f9;border-radius:12px;flex:none;touch-action:none">`;
 s+=`<polygon points="${poly(ri)}" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/><polygon points="${poly(ro)}" fill="#fee2e2" stroke="#dc2626" stroke-width="2"/>`;
 if(!small){s+=`<line x1="${cO[0]}" y1="${cO[1]}" x2="${fp[0]}" y2="${fp[1]}" stroke="#dc2626" stroke-width="3"/><text x="${(+fp[0]+fm[0]*16).toFixed(1)}" y="${(+fp[1]+fm[1]*14).toFixed(1)}" font-size="11" font-weight="800" fill="#991b1b" text-anchor="middle" dy="4">正面</text>`;
  s+=`<text x="${cI[0]}" y="${cI[1]}" font-size="12" font-weight="800" fill="#1e3a8a" text-anchor="middle" dy="4">室内機</text><text x="${cO[0]}" y="${cO[1]}" font-size="12" font-weight="800" fill="#7f1d1d" text-anchor="middle" dy="4">室外機</text>`;
  if(d0)s+=`<line x1="${P(pI)[0]}" y1="${P(pI)[1]}" x2="${d0[0]}" y2="${d0[1]}" stroke="#16a34a" stroke-width="3" stroke-dasharray="4 3"/>`}
 rl.forEach((r,i)=>{s+=`<polyline points="${poly(r)}" fill="none" stroke="${small||i===0?"#c2703a":"#c2703a55"}" stroke-width="${small?4:i===0?4:2.5}" stroke-linejoin="round" stroke-linecap="round"/>`});
 s+=`<circle cx="${P(pI)[0]}" cy="${P(pI)[1]}" r="${small?4:6}" fill="#16a34a"/><circle cx="${P(pE)[0]}" cy="${P(pE)[1]}" r="${small?4:6}" fill="#dc2626"/></svg>`;
 return{s,toMap:(px,py)=>[(px-ox)/sc+mnx,(py-oy)/sc+mny]};
}
let RPLIVE=false;
function openRoutePos(){
 const box=$("#routeIn"),R=RP;
 const opt=(a,v)=>a.map(([k,t])=>`<option value="${k}"${k===v?" selected":""}>${t}</option>`).join("");
 const dirs=(k,v)=>`<div class="seg" data-dir="${k}" style="margin-bottom:8px">${["↑","→","↓","←"].map((t,i)=>`<button data-v="${i}" class="${i===v?"on":""}" style="height:42px">${t}</button>`).join("")}</div>`;
 const num=(k,lab,v)=>`<div class="field" style="margin-bottom:8px"><label>${lab}</label><input data-n="${k}" inputmode="numeric" value="${uVal(v)}"></div>`;
 const sgn=(k,lab,a,v,sv)=>`<div class="field" style="margin-bottom:8px"><label>${lab}</label><div style="display:flex;gap:6px"><select data-sg="${k}" style="height:44px;border-radius:12px;font-size:15px;font-weight:700;padding:0 8px">${a.map(([q,t])=>`<option value="${q}"${q===sv?" selected":""}>${t}</option>`).join("")}</select><input data-n="${k}" inputmode="numeric" value="${uVal(v)}" style="flex:1"></div></div>`;
 const IT=[["cas2","メーカー機種（2方向・ビルトイン等）"],["cas","4方向（メーカー別・目安）"],["ceil","天吊"],["wall","壁掛け"],["flr","床置き"]];
 const ims=CAS2_MAKERS.map(([m,mn])=>`<optgroup label="${mn}">`+CAS2_ORDER.filter(k=>CAS2M[k].mk===m).map(k=>`<option value="${k}"${k===R.im?" selected":""}>${CAS2M[k].n}（${CAS2M[k].kind}）</option>`).join("")+"</optgroup>").join("");
 const ox=outExitKey(R.oe,R.ox);
 box.innerHTML=`<div class="ctitle">① 室内機</div>
  <div class="field" style="margin-bottom:8px"><label>種類</label><select data-s="it" style="height:44px;border-radius:12px;font-size:15px;font-weight:700;width:100%">${opt(IT,R.it)}</select></div>
  ${R.it==="cas2"?`<div class="field" style="margin-bottom:8px"><label>機種</label><select data-s="im" style="height:44px;border-radius:12px;font-size:14px;font-weight:700;width:100%">${ims}</select></div>`:""}
  ${R.it==="wall"?`<div class="field" style="margin-bottom:8px"><label>配管の出し方</label><select data-s="ws" style="height:44px;border-radius:12px;font-size:15px;font-weight:700;width:100%">${opt(WALL_ORDER.map(k=>[k,WALLX[k].n]),R.ws)}</select></div>`:""}
  <label style="font-size:13px;font-weight:700">配管が出る向き（図で見て）</label>${dirs("d",R.d)}
  ${R.it==="cas2"?num("ch","天井高さ（床から・mm）",R.ch):num("top","室内機の上の面の高さ（床から・mm）",R.top)}
  <div class="ctitle">② 室外機</div>
  <div class="field" style="margin-bottom:8px"><label>種類</label><select data-s="oe" style="height:44px;border-radius:12px;font-size:15px;font-weight:700;width:100%">${opt(OUT_ORDER.map(k=>[k,OUTM[k].n]),R.oe)}</select></div>
  ${outAllow(R.oe).length>1?`<div class="field" style="margin-bottom:8px"><label>配管口</label><select data-s="ox" style="height:44px;border-radius:12px;font-size:15px;font-weight:700;width:100%">${opt(outAllow(R.oe).map(k=>[k,OUT_X[k]]),ox)}</select></div>`:""}
  <label style="font-size:13px;font-weight:700">室外機の正面の向き（図で見て）</label>${dirs("of",R.of)}
  ${sgn("mx","室内機の真ん中から（図で見て）",[[1,"右へ"],[-1,"左へ"]],Math.abs(R.mx),R.mx<0?-1:1)}
  ${sgn("mz","（奥・手前）",[[1,"奥（図の上）へ"],[-1,"手前（図の下）へ"]],Math.abs(R.mz),R.mz<0?-1:1)}
  ${sgn("hb","室外機を置く面（床からの高さ・mm）",[[1,"上へ"],[-1,"下へ"]],R.hb,R.hs)}
  <div id="rpMap" style="margin:6px 0 4px"></div><div class="note" style="margin:0 0 10px">図をタップすると、そこに室外機を置きます（50mmきざみ）。緑＝室内機の配管口、赤＝室外機の配管口</div>
  <div class="ctitle">③ ルート</div>
  ${num("S","室内機の配管口から最初の曲げまで（mm）",R.S)}${num("S2","室外機の配管口の手前のまっすぐ（mm）",R.S2)}
  <label style="display:flex;align-items:center;gap:8px;font-size:14px;margin:4px 0 10px"><input id="rp45" type="checkbox" ${R.d45?"checked":""} style="width:22px;height:22px">45°の曲げも使う</label>
  <button class="sharebtn" id="rpGo" style="width:100%;margin:0 0 10px;background:#2563eb;color:#fff">🧭 ルートを作る</button>`;
 let G=null,MP=null;
 const rpApply=()=>{st.nopipe=false;const U=st.units;U.on=true;U.s=R.it;if(R.it==="cas2")U.ms=R.im;if(R.it==="wall")U.ws=R.ws;U.e="out";U.oe=R.oe;U.xe=outExitKey(R.oe,R.ox);U.he=[G.front.x,G.front.z];
    const g=st.gnd;g.on=true;if(G.cas2){g.mode="auto";g.ch=R.ch;g.c=true}else{g.mode="start";g.h=Math.max(0,Math.round(G.hIn))}};
 /* 新規（模型から）のときは、設定を変えるたびに、いちばん短いルートで機器・地面を3Dに置く */
 let pvT=0;const preview=()=>{clearTimeout(pvT);pvT=setTimeout(()=>{if(!RPLIVE||!G)return;try{const L=autoRoutes2(G.loc(G.Ap),G.loc(G.E),{stub:R.S,d45:R.d45});if(!L.length)return;
   rpApply();leg="m";st.rows=normRows(L[0].rows.map(w=>({...w})),[{l:500,a:0,t:0,o:false}]);sel=0;save();render();if(T){build3D();fitT(true)}}catch(e){console.warn(e)}},300)};
 const draw=(routes)=>{try{G=rpGeom();if(!routes)preview();const r=rpSvg(G,routes,340,250,false);$("#rpMap").innerHTML=r.s+`<div style="font-size:12px;font-weight:700;color:#475569;margin-top:4px">配管口の高さ：室内機 床から ${fmt(Math.round(G.hIn))}・室外機 床から ${fmt(Math.round(G.hOut))}</div>`;MP=r.toMap}catch(e){console.warn(e);$("#rpMap").innerHTML='<div class="note">図が作れませんでした</div>'}};
 box.querySelectorAll("[data-s]").forEach(s=>s.onchange=()=>{const k=s.dataset.s;R[k]=s.value;if(k==="oe")R.ox=outAllow(R.oe)[0];rpSave();openRoutePos()});
 box.querySelectorAll("[data-dir]").forEach(sg=>sg.onclick=e=>{const b=e.target.closest("button");if(!b)return;R[sg.dataset.dir]=+b.dataset.v;rpSave();[...sg.children].forEach(c=>c.classList.toggle("on",c===b));$("#routeList").innerHTML="";draw()});
 const rd=()=>{box.querySelectorAll("[data-n]").forEach(i=>{const k=i.dataset.n,v=Math.min(50000,Math.abs(uParse(i.value)||0)),sg=box.querySelector(`[data-sg="${k}"]`);
  if(k==="hb"){R.hb=v;R.hs=+sg.value}else if(sg)R[k]=(+sg.value)*v;else R[k]=v});R.ch=Math.max(500,R.ch||2500);R.d45=$("#rp45").checked;rpSave()};
 box.querySelectorAll("[data-n]").forEach(i=>{i.onfocus=()=>i.select();i.oninput=()=>{rd();$("#routeList").innerHTML="";draw()}});
 box.querySelectorAll("[data-sg]").forEach(s=>s.onchange=()=>{rd();$("#routeList").innerHTML="";draw()});
 $("#rpMap").onclick=e=>{const sv=e.target.closest("svg");if(!sv||!MP||!G)return;const rc=sv.getBoundingClientRect(),px=(e.clientX-rc.left)*340/rc.width,py=(e.clientY-rc.top)*250/rc.height,m=MP(px,py);
  const ci=G.bi.getCenter(new THREE.Vector3()),c=G.w2m(ci.x,ci.z),dx=Math.round((m[0]-c[0])/50)*50,dz=-Math.round((m[1]-c[1])/50)*50;
  R.mx=dx;R.mz=dz;rpSave();box.querySelector('[data-n="mx"]').value=uVal(Math.abs(dx));box.querySelector('[data-sg="mx"]').value=dx<0?-1:1;box.querySelector('[data-n="mz"]').value=uVal(Math.abs(dz));box.querySelector('[data-sg="mz"]').value=dz<0?-1:1;$("#routeList").innerHTML="";draw()};
 $("#rpGo").onclick=()=>{rd();draw();if(!G)return;
  const L=autoRoutes2(G.loc(G.Ap),G.loc(G.E),{stub:R.S,d45:R.d45});draw(L);
  renderRoutes(L,{proj:r=>rpIso(G,r,150,96,true,0),big:(r,rot)=>rpIso(G,r,340,250,false,rot),note:"斜め上から見た図（青＝室内機、赤＝室外機、灰色の面＝床）。押すと大きく見られて、「実行」すると機器・地面・天井もこの置き方にします（↩️で戻せます）。",
   apply:()=>{RPLIVE=false;rpApply()}})};
 draw();
}
/* ===== 部屋のスキャン（OBJ・STL・GLB）を3Dの背景に読み込む。形はこの端末（IndexedDB）に保存 ===== */
var SCAN={obj:null,name:"",tri:0,size:null};
st.scan=Object.assign({x:0,y:0,z:0,r:0,u:1000,op:0.5,show:true},st.scan||{});
const scanDB=(mode,fn)=>new Promise((res,rej)=>{try{const q=indexedDB.open("pbm_scan",1);q.onupgradeneeded=()=>q.result.createObjectStore("f");
 q.onsuccess=()=>{try{const tx=q.result.transaction("f",mode),s=tx.objectStore("f"),r=fn(s);tx.oncomplete=()=>res(r&&r.result);tx.onerror=()=>rej(tx.error)}catch(e){rej(e)}};q.onerror=()=>rej(q.error)}catch(e){rej(e)}});
function parseOBJ(txt){const v=[],out=[];let i=0;const L=txt.split("\n");
 for(const ln of L){const c=ln.charCodeAt(0);if(c===118&&ln.charCodeAt(1)===32){const p=ln.trim().split(/\s+/);v.push(+p[1],+p[2],+p[3])}
  else if(c===102&&ln.charCodeAt(1)===32){const p=ln.trim().split(/\s+/).slice(1).map(s=>{let k=parseInt(s,10);return k<0?v.length/3+k:k-1});
   for(let j=1;j<p.length-1;j++)for(const k of [p[0],p[j],p[j+1]])out.push(v[k*3],v[k*3+1],v[k*3+2])}}
 return new Float32Array(out)}
function parseSTL(buf){const dv=new DataView(buf),n=dv.getUint32(80,true);
 if(84+n*50===buf.byteLength){const a=new Float32Array(n*9);for(let i=0;i<n;i++)for(let j=0;j<9;j++)a[i*9+j]=dv.getFloat32(84+i*50+12+j*4,true);return a}
 const t=new TextDecoder().decode(buf),out=[];t.replace(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/g,(m,a,b,c)=>{out.push(+a,+b,+c);return""});return new Float32Array(out)}
function loadScript(u){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=u;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
async function scanBuild(name,buf){
 const ext=(name.split(".").pop()||"").toLowerCase();let obj;
 const mat=()=>new THREE.MeshStandardMaterial({color:0xd6c7b0,roughness:.9,transparent:true,opacity:st.scan.op,side:THREE.DoubleSide,depthWrite:false});
 if(ext==="obj"||ext==="stl"){const a=ext==="obj"?parseOBJ(new TextDecoder().decode(buf)):parseSTL(buf);if(!a.length)throw new Error("empty");
  const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.BufferAttribute(a,3));try{g.computeVertexNormals()}catch(e){}
  obj=new THREE.Mesh(g,mat());SCAN.tri=a.length/9}
 else if(ext==="glb"||ext==="gltf"){
  if(!THREE.GLTFLoader)await loadScript("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js");
  const gl=await new Promise((res,rej)=>new THREE.GLTFLoader().parse(buf,"",res,rej));obj=gl.scene;SCAN.tri=0;
  obj.traverse(n=>{if(n.isMesh){const m=n.material;(Array.isArray(m)?m:[m]).forEach(q=>{q.transparent=true;q.opacity=st.scan.op;q.depthWrite=false;q.side=THREE.DoubleSide});
   const p=n.geometry&&n.geometry.attributes.position;if(p)SCAN.tri+=(n.geometry.index?n.geometry.index.count:p.count)/3}})}
 else throw new Error("type");
 obj.traverse(n=>{n.userData.keep=1});
 const g2=new THREE.Group();g2.add(obj);g2.userData.keep=1;
 const b=new THREE.Box3().setFromObject(obj),c=b.getCenter(new THREE.Vector3());obj.position.set(-c.x,-b.min.y,-c.z);   // 中心を原点・いちばん下を0に
 SCAN.obj=g2;SCAN.name=name;SCAN.size=b.getSize(new THREE.Vector3());
}
function scanApply(){if(!SCAN.obj)return;const o=SCAN.obj,s=st.scan;o.scale.set(s.u,s.u,s.u);o.rotation.x=0;o.rotation.y=-s.r*Math.PI/180;o.rotation.z=0;
 const GY=T&&T.GYr!=null?T.GYr:0;o.position.set(s.x,GY+s.y,s.z);
 o.traverse(n=>{if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(q=>{q.opacity=s.op})})}
function addScan3D(){if(!SCAN.obj||!st.scan.show)return;scanApply();T.grp.add(SCAN.obj)}
(async()=>{try{const r=await scanDB("readonly",s=>s.get("scan"));if(r&&r.buf){await scanBuild(r.name,r.buf);if(T){build3D();T.dirty=true}}}catch(e){}})();
function scanFile(f){const fr=new FileReader();toast("スキャンを読み込み中…");
 fr.onload=async()=>{try{await scanBuild(f.name,fr.result);
  const sz=SCAN.size,mx=Math.max(sz.x,sz.y,sz.z);st.scan.u=mx<200?1000:mx<2000?10:1;   // m・cm・mm を大きさから推定
  const c=T&&T.ctr?T.ctr:{x:0,z:0};st.scan.x=Math.round(c.x/10)*10;st.scan.z=Math.round(c.z/10)*10;st.scan.y=0;st.scan.r=0;st.scan.show=true;save();
  try{await scanDB("readwrite",s=>s.put({name:f.name,buf:fr.result},"scan"))}catch(e){toast("この端末に保存できませんでした（今回だけ表示）")}
  if(T){build3D();fitT(true)}renderScan();toast("✅ スキャンを読み込みました")}catch(e){toast(e&&e.message==="type"?"OBJ・STL・GLBのファイルを選んでください":"スキャンを読み込めませんでした")}};
 fr.onerror=()=>toast("スキャンを読み込めませんでした");fr.readAsArrayBuffer(f)}
let SSTEP=100;
function scanChanged(){save(true);if(T){scanApply();build3D();T.dirty=true}}
function openScan(){renderScan();$("#scanOv").classList.add("on")}
function renderScan(){
 const s=st.scan,box=$("#scanBody");
 if(!SCAN.obj){box.innerHTML=`<div class="note" style="margin-top:0">部屋をスキャンするアプリ（3d Scanner App・Polycam・Scaniverse など）で撮って、<b>OBJ・STL・GLB</b> で書き出したファイルを選んでください。3Dの背景に部屋の形が出ます。</div>
  <label class="sharebtn" style="display:flex;align-items:center;justify-content:center;width:100%;margin:0 0 10px;background:#2563eb;color:#fff">📂 スキャンのファイルを選ぶ<input type="file" id="scanIn" accept=".obj,.stl,.glb,.gltf,model/*,application/octet-stream" style="display:none"></label>`;
  $("#scanIn").onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)scanFile(f)};return}
 const sz=SCAN.size,U=s.u;
 box.innerHTML=`<div class="note" style="margin-top:0">📄 ${SCAN.name}　${SCAN.tri?Math.round(SCAN.tri).toLocaleString()+"面・":""}大きさ ${fmt(sz.x*U)}×${fmt(sz.z*U)}×高さ${fmt(sz.y*U)}mm</div>
  <div class="field" style="margin-bottom:8px"><label>スキャンの単位（大きさがおかしい時に変える）</label><div class="seg" id="scanU">${[[1000,"m"],[10,"cm"],[1,"mm"]].map(([v,t])=>`<button data-v="${v}" class="${v===U?"on":""}">${t}</button>`).join("")}</div></div>
  <div class="seg" style="margin-bottom:8px" id="scanShow"><button data-v="1" class="${s.show?"on":""}">👁 表示</button><button data-v="0" class="${s.show?"":"on"}">🙈 隠す</button></div>
  <div class="field" style="margin-bottom:8px"><label>濃さ</label><input type="range" id="scanOp" min="0.1" max="1" step="0.05" value="${s.op}" style="width:100%"></div>
  <div class="ctitle">向き：${s.r}°</div>
  <div class="seg" id="scanRot" style="margin-bottom:10px"><button data-v="-15">↺15°</button><button data-v="-1">↺1°</button><button data-v="1">↻1°</button><button data-v="15">↻15°</button><button data-v="90">↻90°</button></div>
  <div class="ctitle">位置（画面の向きで動かす）</div>
  <div class="seg" id="scanStep" style="margin-bottom:6px">${[10,50,100,500].map(v=>`<button data-v="${v}" class="${v===SSTEP?"on":""}" style="font-size:14px">${fmt(v)}</button>`).join("")}</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px" id="scanMove"><button class="sharebtn" data-v="u" style="margin:0">⏫ 上へ</button><button class="sharebtn" data-v="f" style="margin:0">⬆️ 奥へ</button><button class="sharebtn" data-v="d" style="margin:0">⏬ 下へ</button><button class="sharebtn" data-v="l" style="margin:0">⬅️ 左へ</button><button class="sharebtn" data-v="b" style="margin:0">⬇️ 手前へ</button><button class="sharebtn" data-v="r" style="margin:0">➡️ 右へ</button></div>
  <button class="sharebtn" id="scanFloor" style="width:100%;margin:0 0 8px">📐 いちばん下を床に合わせる</button>
  <div style="display:flex;gap:8px"><label class="sharebtn" style="flex:1;margin:0;display:flex;align-items:center;justify-content:center">📂 別のファイル<input type="file" id="scanIn" accept=".obj,.stl,.glb,.gltf,model/*,application/octet-stream" style="display:none"></label><button class="sharebtn" id="scanDel" style="flex:1;margin:0;background:#fee2e2;color:#b91c1c">🗑 消す</button></div>`;
 $("#scanIn").onchange=e=>{const f=e.target.files&&e.target.files[0];if(f)scanFile(f)};
 $("#scanU").onclick=e=>{const b=e.target.closest("button");if(!b)return;s.u=+b.dataset.v;scanChanged();renderScan()};
 $("#scanShow").onclick=e=>{const b=e.target.closest("button");if(!b)return;s.show=b.dataset.v==="1";scanChanged();renderScan()};
 $("#scanOp").oninput=e=>{s.op=+e.target.value;scanApply();if(T)T.dirty=true;save(true)};
 $("#scanRot").onclick=e=>{const b=e.target.closest("button");if(!b)return;s.r=normT(s.r+(+b.dataset.v));scanChanged();renderScan()};
 $("#scanStep").onclick=e=>{const b=e.target.closest("button");if(!b)return;SSTEP=+b.dataset.v;renderScan()};
 $("#scanMove").onclick=e=>{const b=e.target.closest("button");if(!b)return;const k=b.dataset.v;
  if(k==="u"||k==="d"){s.y+=(k==="u"?1:-1)*SSTEP;scanChanged();return}
  let fx=1,fz=0;try{const d=new THREE.Vector3();T.cam.getWorldDirection(d);if(Math.abs(d.x)>=Math.abs(d.z)){fx=Math.sign(d.x)||1;fz=0}else{fx=0;fz=Math.sign(d.z)||1}}catch(err){}
  const rx=-fz,rz=fx,m={f:[fx,fz],b:[-fx,-fz],r:[rx,rz],l:[-rx,-rz]}[k];s.x+=m[0]*SSTEP;s.z+=m[1]*SSTEP;scanChanged()};
 $("#scanFloor").onclick=()=>{s.y=0;scanChanged();toast("床に合わせました")};
 $("#scanDel").onclick=async()=>{SCAN.obj=null;try{await scanDB("readwrite",q=>q.delete("scan"))}catch(e){}save();if(T){build3D();T.dirty=true}renderScan();toast("スキャンを消しました")};
}
$("#closeScan").onclick=()=>$("#scanOv").classList.remove("on");
$("#scanOv").addEventListener("click",e=>{if(e.target.id==="scanOv")$("#scanOv").classList.remove("on")});
$("#closeRoute").onclick=()=>{RPLIVE=false;$("#routeOv").classList.remove("on")};
$("#routeOv").addEventListener("click",e=>{if(e.target.id==="routeOv"){RPLIVE=false;$("#routeOv").classList.remove("on")}});
/* ===== 図面の解析：通り芯（X・Y）・縮尺の自動合わせ・四角（室内機・柱）・墨出しリスト ===== */
function planAnalyze(){
 const P=PLAN,T2=P.texts.map(t=>({s:(t.s||"").replace(/[\s　]/g,"").replace(/[Ｘｘ]/g,"X").replace(/[Ｙｙ]/g,"Y").replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)),cx:t.x+(t.w||0)/2,cy:t.y-(t.h||0)/2,h:t.h||10}));
 /* 通り芯：X1・Y5などの記号の真ん中を通る、長い縦線・横線 */
 const lab={};T2.forEach(t=>{const m=t.s.match(/^([XY])(\d{1,2})$/);if(m){const k=m[1]+m[2];(lab[k]=lab[k]||[]).push(t)}});
 Object.keys(lab).forEach(k=>{if(lab[k].length>12)delete lab[k]});   // 壁の記号（X2-A など）が何十個も出る図面は、通り芯とみなさない
 const grids=[];
 /* 1枚に図が2つ以上（平面図と天井伏図など）並んでいると、同じ X1 が何か所も出る。記号の場所ごとに分けて、それぞれの線を探す */
 const gapT=P.mmpp?1500/P.mmpp:60;
 Object.keys(lab).forEach(k=>{const ax=k[0],pos=t=>ax==="X"?t.cx:t.cy,oth=t=>ax==="X"?t.cy:t.cx,grp=[];
  /* 記号ごとに、記号の真ん中を通る線（縦 or 横）を探す */
  lab[k].forEach(t=>{const c=pos(t),tol=Math.max(8,t.h*1.2),acc={},seg={};
   P.segs.forEach(s2=>{const vert=Math.abs(s2[0]-s2[2])<0.8,hor=Math.abs(s2[1]-s2[3])<0.8;let k2=null,lo,hi;
    if(ax==="X"&&vert&&Math.abs(s2[0]-c)<tol){k2=Math.round(s2[0]*4)/4;lo=Math.min(s2[1],s2[3]);hi=Math.max(s2[1],s2[3])}
    if(ax==="Y"&&hor&&Math.abs(s2[1]-c)<tol){k2=Math.round(s2[1]*4)/4;lo=Math.min(s2[0],s2[2]);hi=Math.max(s2[0],s2[2])}
    if(k2!=null){acc[k2]=(acc[k2]||0)+hi-lo;(seg[k2]=seg[k2]||[]).push([lo,hi])}});
   const best=Object.keys(acc).sort((a,b)=>acc[b]-acc[a])[0],okL=best!=null&&acc[best]>(ax==="X"?P.H0:P.W)*0.15,v=okL?+best:c;
   /* 線のひと続きの範囲（点線のすき間はつなぐ。となりの図の線とは分ける）のうち、記号にいちばん近いもの */
   let ext=null;if(best!=null){const S=seg[best].sort((a,b)=>a[0]-b[0]),R=[];S.forEach(q=>{const r=R[R.length-1];if(r&&q[0]-r[1]<gapT)r[1]=Math.max(r[1],q[1]);else R.push(q.slice())});
    const o=oth(t),dist=r=>o<r[0]?r[0]-o:o>r[1]?o-r[1]:0;ext=R.sort((a,b)=>dist(a)-dist(b))[0]}
   /* 同じ線・同じ範囲の記号（線の両端に記号がある図）は1本にまとめる */
   const same=grp.find(g=>Math.abs(g.v-v)<2&&(!ext||g.lo==null||(ext[0]<=g.hi&&ext[1]>=g.lo)));
   if(same){if(ext&&same.lo!=null){same.lo=Math.min(same.lo,ext[0]);same.hi=Math.max(same.hi,ext[1])}}
   else grp.push({ax,n:k,v,ok:best!=null,lo:ext?ext[0]:null,hi:ext?ext[1]:null})});
  grp.forEach(g=>grids.push(g))});
 grids.sort((a,b)=>a.ax===b.ax?a.v-b.v:a.ax<b.ax?-1:1);P.grids=grids;
 /* 縮尺の自動合わせ：となりの通り芯の間に書いてある寸法（14650など）から */
 const rs=[];["X","Y"].forEach(ax=>{const G=grids.filter(g=>g.ax===ax);for(let i=0;i<G.length-1;i++){const a=G[i].v,b=G[i+1].v,mid=(a+b)/2,d=b-a;if(d<20)continue;
  const LB=Object.keys(lab).filter(k=>k[0]===ax).flatMap(k=>lab[k]),hh=LB.length?LB[0].h:10;
  T2.forEach(t=>{const v=+t.s.replace(/,/g,"");if(!(v>=500&&v<=30000)||!/^[0-9,]+$/.test(t.s))return;const p=ax==="X"?t.cx:t.cy,q=ax==="X"?t.cy:t.cx;
   if(Math.abs(p-mid)<d*0.2&&LB.some(l=>Math.abs((ax==="X"?l.cy:l.cx)-q)<hh*8))rs.push(v/d)})}});
 if(rs.length>=2){let med=0,ok=0;rs.forEach(r=>{const c=rs.filter(q=>Math.abs(q/r-1)<0.015);if(c.length>ok){ok=c.length;med=c.reduce((x,y)=>x+y,0)/c.length}});
  /* 図面に書いてある縮尺（1/50など）や、よくある縮尺とかけ離れた結果は採用しない */
  const base=25.4/72/(P.ptpx||1),est=med/base,STD=[20,25,30,40,50,60,75,100,150,200,250,300,500],near=STD.some(d=>Math.abs(est/d-1)<0.07),agree=P.denTxt&&P.den?Math.abs(med/P.mmpp-1)<0.08:near;
  if(ok>=2&&agree&&!P.dxf){P.mmpp=med;P.den=0;P.denTxt=0;P.autoScale=ok}}
 /* 四角（閉じた長方形）を線から探す */
 const H=[],V=[];P.segs.forEach(s2=>{if(Math.abs(s2[1]-s2[3])<0.6&&Math.abs(s2[2]-s2[0])>4)H.push([Math.min(s2[0],s2[2]),Math.max(s2[0],s2[2]),s2[1],s2[4]]);else if(Math.abs(s2[0]-s2[2])<0.6&&Math.abs(s2[3]-s2[1])>4)V.push([Math.min(s2[1],s2[3]),Math.max(s2[1],s2[3]),s2[0],s2[4]])});
 const vx={};V.forEach(v=>{const k=Math.round(v[2]*2);(vx[k]=vx[k]||[]).push(v)});
 const hasV=(x,y0,y1)=>{for(const d of [-1,0,1]){for(const v of vx[Math.round(x*2)+d]||[])if(v[0]<=y0+0.8&&v[1]>=y1-0.8)return true}return false};
 const grp={};H.forEach(h=>{const k=Math.round(h[0]*2)+":"+Math.round(h[1]*2);(grp[k]=grp[k]||[]).push(h)});
 const rects=[];Object.values(grp).forEach(g=>{if(g.length<2)return;g.sort((a,b)=>a[2]-b[2]);const L=g[0][1]-g[0][0];
  for(let i=0;i<g.length;i++)for(let j=i+1;j<g.length;j++){const dy=g[j][2]-g[i][2];if(dy<0.3*L||dy>3*L)continue;
   if(hasV(g[i][0],g[i][2],g[j][2])&&hasV(g[i][1],g[i][2],g[j][2])){rects.push({x0:g[i][0],x1:g[i][1],y0:g[i][2],y1:g[j][2],col:g[i][3]});break}}});
 P.rects=rects;planClassify();
}
function planClassify(){
 const P=PLAN;if(!P.rects||!P.mmpp){P.cand=[];return}
 const mm=P.mmpp,neu=c=>{if(!c)return true;const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);return Math.max(r,g,b)-Math.min(r,g,b)<24};
 const gs={};P.rects.forEach(r=>{const w=Math.round((r.x1-r.x0)*mm/10)*10,h=Math.round((r.y1-r.y0)*mm/10)*10;if(Math.max(w,h)<300||Math.max(w,h)>2200)return;
  const k=w+"x"+h+"|"+(r.col||"");(gs[k]=gs[k]||{w,h,col:r.col,neu:neu(r.col),list:[]}).list.push(r)});
 const near=(a,b)=>Math.abs(a-b)/b<0.07;
 P.cand=Object.values(gs).filter(g=>g.list.length>=1).map(g=>{let hit=null;
  Object.keys(CAS2M).forEach(k=>{const m=CAS2M[k];(m.bi?[[m.L,m.W,"本体"],[m.L,m.W+65,"本体＋電気品箱"]]:[[m.pa,m.pb,"パネル"],[m.oa,m.ob,"開口"],[m.L,m.W,"本体"]]).forEach(([a,b,t])=>{if(!hit&&((near(g.w,a)&&near(g.h,b))||(near(g.w,b)&&near(g.h,a))))hit={k,t}})});
  if(!hit&&!g.neu&&Math.abs(g.w-g.h)<60&&g.w>=820&&g.w<=980)hit={k:"dk_fhcp80",t:"4方向の形"};
  return{...g,hit}}).sort((a,b)=>(b.hit?1:0)-(a.hit?1:0)||b.list.length-a.list.length).slice(0,12);
}
const MSUM={X:{dir:1,mm:0},Y:{dir:1,mm:0}};   // 逃げ墨の初期値（通り芯ごとに上書きできる）
function planFindUI(){
 const P=PLAN,pn=$("#plPanel");if(!P){toast("先に図面を開いてください");return}
 if(!P.mmpp){toast("先に縮尺を合わせてください");return}
 if(!P.rects){try{planAnalyze()}catch(e){}}
 planClassify();
 if(!P.cand||!P.cand.length){pn.style.display="block";pn.innerHTML="四角い記号が見つかりませんでした（スキャンの図面や、四角が線で描かれていない図面では探せません）。";return}
 const cn=c=>"<span style='display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-1px;background:"+(c||"#000")+"'></span>";
 pn.style.display="block";
 pn.innerHTML="<b>🔍 図面の中の四角（大きさ別）</b>　室内機の四角を選んでください（複数OK）<br>"+P.cand.map((g,i)=>`<label style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #e2e8f0"><input type="checkbox" data-i="${i}" ${g.sel||(!P.unitsChosen&&g.hit&&!g.neu)?"checked":""} style="width:22px;height:22px">${cn(g.col)} <b>${fmt(g.w)}×${fmt(g.h)}</b>・${g.list.length}個 ${g.hit?"<span style='color:#7c3aed'>→ "+CAS2M[g.hit.k].n+"（"+g.hit.t+"に近い）</span>":g.neu?"<span style='color:#64748b'>（グレー：柱など）</span>":""}</label>`).join("")+
  `<div style="display:flex;gap:6px;margin-top:8px"><button id="plFindOk" style="flex:1;height:42px;border-radius:12px;background:#7c3aed;color:#fff;font-weight:800">この四角を室内機にする</button><button id="plFindClose" style="height:42px;padding:0 14px;border-radius:12px;background:#e2e8f0;font-weight:800">閉じる</button></div>
   <div style="margin-top:6px;color:#475569;font-size:12px">グレーで600〜1300くらいの四角は柱として、柱芯にも使います。</div>`;
 $("#plFindClose").onclick=()=>{P.wantPlace=false;if(PV.mode==="bld")planBldPanel();else pn.style.display="none"};
 $("#plFindOk").onclick=()=>{const ch=[...pn.querySelectorAll("input[type=checkbox]")];P.units=[];P.cols=[];
  P.cand.forEach((g,i)=>{g.sel=ch[i].checked;if(g.sel)g.list.forEach(r=>P.units.push({cx:(r.x0+r.x1)/2,cy:(r.y0+r.y1)/2,w:g.w,h:g.h,k:g.hit&&g.hit.k}))});
  P.rects.forEach(r=>{const w=(r.x1-r.x0)*P.mmpp,h=(r.y1-r.y0)*P.mmpp,c=r.col;const gray=!c||(Math.max(...[1,3,5].map(k=>parseInt(c.slice(k,k+2),16)))-Math.min(...[1,3,5].map(k=>parseInt(c.slice(k,k+2),16))))<24;
   if(gray&&w>=600&&w<=1300&&h>=600&&h<=1300&&Math.abs(w-h)<200)P.cols.push({cx:(r.x0+r.x1)/2,cy:(r.y0+r.y1)/2})});
  {const tol=300/P.mmpp,U2=[];P.units.forEach(u=>{if(!U2.some(v=>Math.hypot(v.cx-u.cx,v.cy-u.cy)<tol))U2.push(u)});P.units=U2}   // 二重の四角（パネルと本体など）は1台にまとめる
  {const tol=300/P.mmpp,C2=[];P.cols.forEach(u=>{if(!C2.some(v=>Math.hypot(v.cx-u.cx,v.cy-u.cy)<tol))C2.push(u)});P.cols=C2}
  P.units.sort((a,b)=>Math.round(a.cy*P.mmpp/1000)-Math.round(b.cy*P.mmpp/1000)||a.cx-b.cx);P.unitsChosen=1;planDraw();
  if(P.wantPlace){P.wantPlace=false;P.redoFind=true;planBldPanel();planPlaceUnits();return}planListUI()};
}
function planListUI(){
 const P=PLAN,pn=$("#plPanel");if(!P||!P.units||!P.units.length){toast("先に「室内機を探す」で室内機を選んでください");return}
 P.nige=P.nige||{};const nige=n=>P.nige[n]||{dir:MSUM[n[0]].dir,mm:MSUM[n[0]].mm};
 const mm=P.mmpp,GX=(P.grids||[]).filter(g=>g.ax==="X"),GY=(P.grids||[]).filter(g=>g.ax==="Y"),useCol=P.refCol&&P.cols&&P.cols.length;
 const near=(arr,v)=>arr.reduce((b,g)=>!b||Math.abs(g.v-v)<Math.abs(b.v-v)?g:b,null);
 const fx=v=>(v>=0?"右へ ":"左へ ")+fmt(Math.round(Math.abs(v))),fy=v=>(v>=0?"下へ ":"上へ ")+fmt(Math.round(Math.abs(v)));
 const rows=P.units.map((u,i)=>{let a="",b="",tx="";
  if(useCol){const c=P.cols.reduce((b2,c2)=>!b2||Math.hypot(c2.cx-u.cx,c2.cy-u.cy)<Math.hypot(b2.cx-u.cx,b2.cy-u.cy)?c2:b2,null);
   a="柱芯から "+fx((u.cx-c.cx)*mm);b=fy((u.cy-c.cy)*mm);tx=`${i+1}) 柱芯から ${fx((u.cx-c.cx)*mm)}・${fy((u.cy-c.cy)*mm)}`}
  else{const gx=near(GX,u.cx),gy=near(GY,u.cy);
   if(gx){const d=(u.cx-gx.v)*mm,n=nige(gx.n),dn=d-n.dir*n.mm;a=`${gx.n}から ${fx(d)}`+(n.mm?`<br><b style="color:#0e7490">逃げ墨（${gx.n} ${n.dir>0?"右":"左"}${fmt(n.mm)}）から ${fx(dn)}</b>`:"")}
   if(gy){const d=(u.cy-gy.v)*mm,n=nige(gy.n),dn=d-n.dir*n.mm;b=`${gy.n}から ${fy(d)}`+(n.mm?`<br><b style="color:#0e7490">逃げ墨（${gy.n} ${n.dir>0?"下":"上"}${fmt(n.mm)}）から ${fy(dn)}</b>`:"")}
   tx=`${i+1}) `+(gx?`${gx.n}${(()=>{const d=(u.cx-gx.v)*mm,n=nige(gx.n);return n.mm?"逃げ墨("+(n.dir>0?"右":"左")+fmt(n.mm)+")から"+fx(d-n.dir*n.mm):"から"+fx(d)})()}`:"")+"・"+(gy?`${gy.n}${(()=>{const d=(u.cy-gy.v)*mm,n=nige(gy.n);return n.mm?"逃げ墨("+(n.dir>0?"下":"上")+fmt(n.mm)+")から"+fy(d-n.dir*n.mm):"から"+fy(d)})()}`:"")}
  return{h:`<tr style="border-top:1px solid #e2e8f0"><td style="padding:6px 4px;font-weight:800;color:#dc2626">${i+1}</td><td style="padding:6px 4px">${a}</td><td style="padding:6px 4px">${b}</td></tr>`,tx}});
 const gl=(P.grids||[]).map(g=>{const n=nige(g.n);return`<span style="display:inline-flex;align-items:center;gap:3px;margin:2px 6px 2px 0">${g.n}<select data-g="${g.n}" data-k="dir" style="height:30px;border-radius:8px">${g.ax==="X"?`<option value="1"${n.dir>0?" selected":""}>右</option><option value="-1"${n.dir<0?" selected":""}>左</option>`:`<option value="1"${n.dir>0?" selected":""}>下</option><option value="-1"${n.dir<0?" selected":""}>上</option>`}</select><input data-g="${g.n}" data-k="mm" inputmode="numeric" value="${n.mm?uVal(n.mm):""}" placeholder="0" style="width:58px;height:30px;border-radius:8px;border:1px solid #cbd5e1;padding:0 4px">mm</span>`}).join("");
 pn.style.display="block";
 pn.innerHTML=`<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><b>📋 墨出しリスト（室内機の芯）</b><span style="flex:1"></span>
   <button id="plRef" style="height:34px;padding:0 10px;border-radius:10px;background:#e0f2fe;font-weight:800">${useCol?"基準：柱芯":"基準：通り芯"}</button><button id="plCopy" style="height:34px;padding:0 10px;border-radius:10px;background:#0891b2;color:#fff;font-weight:800">コピー</button><button id="plLClose" style="height:34px;padding:0 10px;border-radius:10px;background:#e2e8f0;font-weight:800">閉じる</button></div>
  ${useCol?"":`<div style="margin:6px 0;font-size:12.5px;color:#334155">逃げ墨（返り墨）：通り芯から何mmずらして墨を打ったか（例：X2 右1000）。入れると、逃げ墨からの寸法を計算します。<br>${gl||"通り芯（X1・Y1など）が見つかりませんでした"}</div>`}
  <table style="width:100%;border-collapse:collapse;font-size:13px"><tr style="color:#64748b;font-size:12px"><td>No</td><td>左右（X）</td><td>上下（Y）</td></tr>${rows.map(r=>r.h).join("")}</table>
  <div style="font-size:12px;color:#64748b;margin-top:6px">右・左・上・下は図面の向きです。寸法は図面の線から計算した値（目安）なので、大事な所は図面の寸法でも確認してください。</div>`;
 pn.querySelectorAll("[data-g]").forEach(el=>el.onchange=()=>{const n=el.dataset.g,o=P.nige[n]||nige(n);if(el.dataset.k==="dir")o.dir=+el.value;else o.mm=Math.max(0,uParse(el.value)||0);P.nige[n]={...o};planListUI()});
 $("#plRef").onclick=()=>{if(!P.cols||!P.cols.length){toast("柱（グレーの四角）が見つかりませんでした");return}P.refCol=!P.refCol;planListUI()};
 $("#plCopy").onclick=()=>{const t="墨出しリスト（室内機の芯）\n"+rows.map(r=>r.tx).join("\n");try{navigator.clipboard.writeText(t).then(()=>toast("コピーしました"),()=>prompt("コピーしてください",t))}catch(e){prompt("コピーしてください",t)}};
 $("#plLClose").onclick=()=>{pn.style.display="none"};
}
/* なぞった線 → 曲げ共有の行（水平の配管として）。図面の起点＝配管の起点、最初の区間＝+x */
function planToWorld(p){const M=PLAN.map,dx=(p[0]-M.P0[0])*PLAN.mmpp,dy=(p[1]-M.P0[1])*PLAN.mmpp,c=Math.cos(M.th),s2=Math.sin(M.th);return[dx*c+dy*s2,-dx*s2+dy*c]}
function planMake(){
 const P=PLAN;if(!P||P.route.length<2){toast("配管を2点以上なぞってください");return}
 const R=P.route;P.map={P0:R[0].slice(),th:Math.atan2(R[1][1]-R[0][1],R[1][0]-R[0][0])};
 const W=R.map(planToWorld),rows=[],warn=[];
 for(let i=0;i<W.length-1;i++){const l=Math.round(Math.hypot(W[i+1][0]-W[i][0],W[i+1][1]-W[i][1])/10)*10;let a=0,t=0;
  if(i<W.length-2){const d1=[W[i+1][0]-W[i][0],W[i+1][1]-W[i][1]],d2=[W[i+2][0]-W[i+1][0],W[i+2][1]-W[i+1][1]],n1=Math.hypot(...d1),n2=Math.hypot(...d2);
   const ang=Math.acos(Math.max(-1,Math.min(1,(d1[0]*d2[0]+d1[1]*d2[1])/(n1*n2))))*180/Math.PI,cr=d1[0]*d2[1]-d1[1]*d2[0];
   if(ang>3){a=[15,30,45,90].reduce((b,v)=>Math.abs(v-ang)<Math.abs(b-ang)?v:b,90);if(Math.abs(a-ang)>5)warn.push((i+1)+"番目の曲げ "+Math.round(ang)+"°→"+a+"°");t=cr>0?90:270}}
  rows.push({l,a,t,o:false})}
 const go=()=>{
  if(leg!=="m")leg="m";st.rows=normRows(rows,[{l:500,a:0,t:0,o:false}]);sel=0;
  st.gnd.on=true;st.gnd.mode="start";st.gnd.h=P.H||2400;if(P.CH){st.gnd.c=true;st.gnd.ch=P.CH}
  P.show=true;save();render();$("#planOv").style.display="none";if(T){build3D();fitT(true)}
  toast("図面から配管を作りました（"+rows.length+"区間"+(warn.length?"・角度を丸めた所あり："+warn.join("、"):"")+"）");
 };
 askConfirm("今の配管（メイン）を、なぞった配管に置き換えます。よろしいですか？\n配管の高さ："+(P.H||2400)+"mm"+(P.CH?"・天井高："+P.CH+"mm":""),"🧊 置き換える",go);
}
/* 3Dに図面（床）と壁を出す */
function addPlan3D(){
 const P=PLAN,M=P.map,H=P.H||2400,fy=-H;
 /* 図面の映し方：古い方式（配管をなぞった P.map）か、今の方式（縮尺・原点＝btWx と同じ座標）のどちらか */
 const XF=M?{c:planToWorld([P.W/2,P.H0/2]),th:M.th}:{c:btWx([P.W/2,P.H0/2]),th:xfOf().r*Math.PI/180};
 const w=P.W*P.mmpp,h=P.H0*P.mmpp;
 if(!P.tex){P.tex=new THREE.CanvasTexture(P.img)}
 const g=new THREE.PlaneGeometry(w,h);g.rotateX(-Math.PI/2);
 /* 図面は「地面（床）」に映す。半透明の度合いは P.planOp（ボタンで変える） */
 const CYp=P.atCeil&&typeof ceilY==="function"?ceilY():null,floorY=CYp!=null?CYp-3:(T&&T.GYr!=null?T.GYr:fy),op=P.planOp!=null?P.planOp:.4;   // 下の図面がある時は天井の高さへ（P.atCeil）
 const pl=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:P.tex,transparent:true,opacity:op,side:THREE.DoubleSide,depthWrite:false}));
 const c=XF.c;pl.position.set(c[0],floorY+2,c[1]);pl.rotation.y=XF.th;pl.renderOrder=-2;pl.userData.planFloor=true;T.grp.add(pl);
 if(M&&P.walls.length&&!(st.bld&&st.bld.some(o=>o.k==="wall"))){const CH=P.CH||2500,wm=new THREE.MeshStandardMaterial({color:0xcbd5e1,transparent:true,opacity:.35,depthWrite:false});
  P.walls.forEach(wl=>{const a=planToWorld(wl.a),b=planToWorld(wl.b),L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<1)return;
   const m=new THREE.Mesh(new THREE.BoxGeometry(L,CH,wl.t),wm);m.position.set((a[0]+b[0])/2,fy+CH/2,(a[1]+b[1])/2);
   m.rotation.y=M.th-Math.atan2(wl.b[1]-wl.a[1],wl.b[0]-wl.a[0]);T.grp.add(m)})}
}

/* ===== 🤖 図面から自動で読む：CADの色と文字から、室内機・室外機・冷媒配管をまとめて作る =====
   ・機器＝青い線のかたまり。真ん中に品番（例 PL-ZRP80HA5）があれば、その機種の室内機にする
   ・冷媒配管＝マゼンタ（赤紫）の線。近くの「FL+3200」を配管の高さ、「15.9φ×9.5φ」を配管サイズにする
   ・室外機＝配管のもう一方の端にある青い四角。大きさは図面の通り
   ・天井高＝室内機にいちばん近い「CH=3000」 */
const rgbOf=c=>!c||c.length<7?[0,0,0]:[1,3,5].map(k=>parseInt(c.slice(k,k+2),16));
const isBlue=c=>{const[r,g,b]=rgbOf(c);return b>170&&r<90&&g<90},isMag=c=>{const[r,g,b]=rgbOf(c);return r>170&&b>170&&g<90};
const normTx=s=>String(s||"").replace(/[０-９Ａ-Ｚａ-ｚ]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)).replace(/[＋]/g,"+").replace(/[＝]/g,"=");
function planClusters(test){const P=PLAN,S=P.segs.filter(s=>test(s[4])),n=S.length,par=[...Array(n).keys()],f=i=>{while(par[i]!==i){par[i]=par[par[i]];i=par[i]}return i};
 const g=new Map(),key=(x,y)=>Math.floor(x/3)+","+Math.floor(y/3);
 S.forEach((s,i)=>[[s[0],s[1]],[s[2],s[3]]].forEach(([x,y])=>{const k=key(x,y);if(!g.has(k))g.set(k,[]);g.get(k).push([x,y,i])}));
 S.forEach((s,i)=>[[s[0],s[1]],[s[2],s[3]]].forEach(([x,y])=>{const gx=Math.floor(x/3),gy=Math.floor(y/3);
  for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)(g.get((gx+a)+","+(gy+b))||[]).forEach(([x2,y2,j])=>{if(Math.abs(x-x2)<2&&Math.abs(y-y2)<2)par[f(i)]=f(j)})}));
 const m=new Map();S.forEach((s,i)=>{const r=f(i);if(!m.has(r))m.set(r,{x0:1e9,y0:1e9,x1:-1e9,y1:-1e9,n:0});const c=m.get(r);c.n++;c.x0=Math.min(c.x0,s[0],s[2]);c.x1=Math.max(c.x1,s[0],s[2]);c.y0=Math.min(c.y0,s[1],s[3]);c.y1=Math.max(c.y1,s[1],s[3])});
 return[...m.values()].map(c=>({...c,cx:(c.x0+c.x1)/2,cy:(c.y0+c.y1)/2,w:(c.x1-c.x0)*P.mmpp,h:(c.y1-c.y0)*P.mmpp}))}
/* マゼンタの2本線（ガス管・液管）→ 真ん中の1本のルート（図面の点の並び） */
function planPipeRoute(start){const P=PLAN,mm=P.mmpp;
 const L=P.segs.filter(s=>isMag(s[4])).map(s=>{const dx=s[2]-s[0],dy=s[3]-s[1],l=Math.hypot(dx,dy);return{s,l,h:Math.abs(dy)<=Math.max(1,l*0.03),v:Math.abs(dx)<=Math.max(1,l*0.03)}}).filter(o=>o.l*mm>=120&&(o.h||o.v));
 /* 平行な線をまとめて1本の配管にする（2本の外形線、液管・ガス管が並んだ3本線など）。真ん中＝いちばん外側の2本の間 */
 const used=new Set(),mids=[],pos=o=>o.h?(o.s[1]+o.s[3])/2:(o.s[0]+o.s[2])/2,rng=o=>o.h?[Math.min(o.s[0],o.s[2]),Math.max(o.s[0],o.s[2])]:[Math.min(o.s[1],o.s[3]),Math.max(o.s[1],o.s[3])];
 L.forEach((A,i)=>{if(used.has(i))return;used.add(i);const C=[A];
  for(let k=0;k<C.length;k++){const Q=C[k],qr=rng(Q);L.forEach((B,j)=>{if(used.has(j)||B.h!==A.h)return;const d=Math.abs(pos(B)-pos(Q));if(d*mm>180||d<0.5)return;const br=rng(B);
   if(Math.min(qr[1],br[1])-Math.max(qr[0],br[0])<Math.min(qr[1]-qr[0],br[1]-br[0])*0.5)return;used.add(j);C.push(B)})}
  const ps=C.map(pos),c=(Math.min(...ps)+Math.max(...ps))/2,lo=Math.min(...C.map(o=>rng(o)[0])),hi=Math.max(...C.map(o=>rng(o)[1]));
  mids.push(A.h?{h:1,a:[lo,c],b:[hi,c]}:{h:0,a:[c,lo],b:[c,hi]})});
 if(!mids.length)return null;
 const dist=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);let bi=0,bend=0,bd=1e18;
 mids.forEach((m2,i)=>[m2.a,m2.b].forEach((p,e)=>{const d=dist(p,start);if(d<bd){bd=d;bi=i;bend=e}}));
 const done=new Set([bi]);let cur=mids[bi];const pts=bend===0?[cur.a.slice(),cur.b.slice()]:[cur.b.slice(),cur.a.slice()];
 for(;;){const e=pts[pts.length-1];let nj=-1,ne=0,nd=1e18;
  mids.forEach((m2,j)=>{if(done.has(j))return;[m2.a,m2.b].forEach((p,k)=>{const d=dist(p,e);if(d<nd){nd=d;nj=j;ne=k}})});
  if(nj<0||nd*mm>450)break;done.add(nj);const n=mids[nj],far=ne===0?n.b:n.a;
  if(n.h!==cur.h){const cnr=n.h?[e[0],n.a[1]]:[n.a[0],e[1]];pts[pts.length-1]=cur.h?[cnr[0],e[1]]:[e[0],cnr[1]];pts.push(n.h?[far[0],n.a[1]]:[n.a[0],far[1]])}
  else{pts.push(ne===0?n.a.slice():n.b.slice());pts.push(far.slice())}
  cur=n}
 return pts}
function planNearText(re,x,y,maxPx,skip){let best=null,bd=1e18;(PLAN.texts||[]).forEach(t=>{const s=normTx(t.s);if(!re.test(s)||(skip&&skip.test(s)))return;const cx=t.x+t.w/2,cy=t.y-t.h/2,d=Math.hypot(cx-x,cy-y);if(d<bd&&d<=maxPx){bd=d;best=t}});return best}
/* 冷媒の高さの文字と縦管の印：route（図面の点）の各点の位置 s（mm）、近くの「FL+○○」、ピンクの丸い端（半円）のある点 */
function planRefHeights(route,pipeH){const P=PLAN,mm=P.mmpp,px=v=>v/mm,S=[0];for(let i=1;i<route.length;i++)S.push(S[i-1]+v2l(v2s(route[i],route[i-1]))*mm);
 const proj=q=>{let b=null;for(let i=1;i<route.length;i++){const r=v2pd(q,route[i-1],route[i]);if(!b||r.d<b.d)b={d:r.d,s:S[i-1]+r.tc*(S[i]-S[i-1])}}return b};
 const labs=[];(P.texts||[]).forEach(t=>{const st2=normTx(t.s).trim();const m=st2.match(/^FL\s*\+\s*(\d{3,4})$/);if(!m)return;const r=proj([t.x+t.w/2,t.y-t.h/2]);if(r&&r.d*mm<=600)labs.push({s:r.s,FL:+m[1]})});
 labs.sort((a,b)=>a.s-b.s);
 /* 丸い端：マゼンタの短い線の点を集めて円を当てはめ、半分以上まわっていて半径1〜7cm */
 const SP=P.segs.filter(s=>isMag(s[4])&&Math.hypot(s[2]-s[0],s[3]-s[1])*mm<40).flatMap(s=>[[s[0],s[1]],[s[2],s[3]]]),used=new Array(SP.length).fill(false),caps=[];
 for(let i=0;i<SP.length;i++){if(used[i])continue;const cl=[i];used[i]=true;for(let k=0;k<cl.length;k++)for(let j=0;j<SP.length;j++)if(!used[j]&&v2l(v2s(SP[j],SP[cl[k]]))*mm<=25){used[j]=true;cl.push(j)}
  let pts=cl.map(k=>SP[k]),c=null;if(pts.length<6)continue;
  for(let it=0;it<5;it++){c=fitCircle(pts);if(!c)break;const tol=Math.max(0.4,c.r*0.15),np=pts.filter(p=>Math.abs(v2l(v2s(p,c))-c.r)<=tol);if(np.length===pts.length)break;
   if(np.length<6){const res=pts.map(p=>Math.abs(v2l(v2s(p,c))-c.r)),mx=Math.max(...res);pts=pts.filter((p,k)=>res[k]<mx);if(pts.length<6){c=null;break}}else pts=np}   // 外れた点（となりの曲げの円弧）を除きながら当てはめ直す
  if(!c||c.r*mm<10||c.r*mm>70)continue;
  const ang=pts.map(p=>Math.atan2(p[1]-c[1],p[0]-c[0])).sort((a,b)=>a-b);let gap=ang[0]+2*Math.PI-ang[ang.length-1];for(let k=1;k<ang.length;k++)gap=Math.max(gap,ang[k]-ang[k-1]);
  if(gap>4.1)continue;   // 4分の1の円（曲げの角、すき間約270°）は除く。半円（管の丸い端、少し欠けても可）と丸
  let bj=-1,bd=1e18;route.forEach((q,j)=>{const d=v2l(v2s(q,c));if(d<bd){bd=d;bj=j}});if(bj>=0&&bd*mm<=300&&!caps.includes(bj))caps.push(bj)}
 /* DXF：丸い端は円弧（ARC）のまま P.arcs に入っている（線には入れていない）ので、半円の円弧も見る */
 (P.arcs||[]).forEach(o=>{if(!isMag(o.col))return;const c=fitCircle([o.a,o.m,o.b]);if(!c||c.r*mm<10||c.r*mm>70)return;if(v2l(v2s(o.a,o.b))<c.r*1.9)return;   // 弦が直径に近い＝半円（4分の1の曲げの円弧は除く）
  let bj=-1,bd=1e18;route.forEach((q,j)=>{const d=v2l(v2s(q,c));if(d<bd){bd=d;bj=j}});if(bj>=0&&bd*mm<=300&&!caps.includes(bj))caps.push(bj)});
 caps.sort((a,b)=>a-b);return{s:S,labs,caps}}
/* 室外機側の上げ下げの位置：外壁を出たら、すぐに室外機の配管口の高さへ上げ下げする。
   図面は平面なので「どこで下りるか」は描いてない。外で横に回してから下りると、外壁から離れた空中を走ってしまうため。
   src＝3Dの配管の点（配管口基準）、yT＝室外機の配管口の高さ、walls＝壁。いちばん最後に通る壁（＝外壁）の外側 壁厚/2+250mm で上げ下げ。
   変えられない時（壁を通らない・もう同じ高さ）は null */
function pipeDropOut(src,yT,walls){const V=THREE.Vector3;let hit=null;
 for(let i=1;i<src.length;i++){const A=src[i-1],B=src[i];if(Math.abs(B.y-A.y)>1)continue;
  walls.forEach(w=>{const th=w.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th),loc=p=>[(p.x-w.x)*co+(p.z-w.z)*si,-(p.x-w.x)*si+(p.z-w.z)*co],La=loc(A),Lb=loc(B);
   if(La[1]*Lb[1]>=0)return;const u=La[1]/(La[1]-Lb[1]),lx=La[0]+(Lb[0]-La[0])*u;if(Math.abs(lx)>w.w/2)return;
   if(!hit||i>hit.i||(i===hit.i&&u>hit.u))hit={i,u,w}})}
 if(!hit)return null;const A=src[hit.i-1],B=src[hit.i];if(Math.abs(A.y-yT)<1)return null;
 /* 外壁の後に、まだ高さが変わる所（ピンクの丸い端の上げ下げ）がある時は、図面の印どおりにする */
 for(let i=hit.i;i<src.length-1;i++){if(Math.abs(src[i+1].y-src[i].y)>1&&Math.abs(src[i+1].y-yT)>1)return null}
 const L=B.clone().sub(A).length(),dir=B.clone().sub(A).normalize(),X=A.clone().lerp(B,hit.u),off=(hit.w.d||150)/2+250;
 const E=off>=L*(1-hit.u)?B.clone():X.clone().addScaledVector(dir,off);
 let pts=src.slice(0,hit.i).map(p=>p.clone()).concat([E,new V(E.x,yT,E.z)],src.slice(hit.i).map(p=>new V(p.x,yT,p.z)));
 /* 同じ点・まっすぐ続く点をまとめる */
 const out=[];pts.forEach(p=>{if(out.length&&out[out.length-1].distanceTo(p)<1)return;
  if(out.length>=2){const a=out[out.length-2],b=out[out.length-1],d0=b.clone().sub(a).normalize(),d1=p.clone().sub(b).normalize();if(d0.dot(d1)>0.999){b.copy(p);return}}out.push(p.clone())});
 return out}
function planReadAll(){const P=PLAN;if(!P||!P.segs||P.segs.length<50){toast("線のデータがある図面（CADのPDF）で使えます");return}
 if(!P.mmpp||!P.org){toast("先に縮尺と原点を決めてください");return}
 const mm=P.mmpp,BL=planClusters(isBlue),norm=s=>normTx(s).toUpperCase().replace(/[\s\-‐ー－]/g,"");
 const models=Object.keys(CAS2M).map(k=>({k,n:norm(CAS2M[k].n)})).filter(m=>m.n.length>=6);
 /* ① 室内機：品番の文字 → それを囲む青いかたまり */
 const inds=[];
 (P.texts||[]).forEach(t=>{const nt=norm(t.s);if(nt.length<6)return;const hit=models.find(m=>m.n===nt||(nt.length>=8&&(m.n.startsWith(nt)||nt.startsWith(m.n))));if(!hit)return;
  const tx=t.x+t.w/2,ty=t.y-t.h/2,c=BL.filter(c2=>tx>=c2.x0&&tx<=c2.x1&&ty>=c2.y0&&ty<=c2.y1&&Math.max(c2.w,c2.h)>=CAS2M[hit.k].L*0.6&&Math.max(c2.w,c2.h)<=CAS2M[hit.k].L*1.8).sort((a,b)=>a.w*a.h-b.w*b.h)[0];
  if(c&&!inds.some(o=>o.c===c))inds.push({c,k:hit.k,t})});
 if(!inds.length){toast("品番の分かる室内機が見つかりませんでした（青い記号の中に品番が必要です）");return}
 const I=inds[0],ctr=[I.c.cx,I.c.cy];
 /* ② 冷媒配管：室内機にいちばん近い所から、マゼンタの線をたどる */
 const route=planPipeRoute(ctr);
 if(!route||route.length<2){toast("冷媒配管（赤紫の線）が見つかりませんでした");return}
 const r0=route[0],rN=route[route.length-1];
 const segD=(x,y)=>Math.min(...route.slice(1).map((b,i)=>{const a=route[i],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy||1,u=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/l2));return Math.hypot(a[0]+u*dx-x,a[1]+u*dy-y)}));
 let pipeH=0,szG=-1,szL=-1;
 {let best=1e18;(P.texts||[]).forEach(t=>{const s=normTx(t.s);const m=s.match(/FL\s*\+\s*(\d{3,4})(?!\s*[下上])/);if(!m||/[下上]端/.test(s))return;const d=segD(t.x+t.w/2,t.y-t.h/2);if(d<best&&d*mm<900){best=d;pipeH=+m[1]}})}
 {let best=1e18;(P.texts||[]).forEach(t=>{const s=normTx(t.s);if(!/[φΦ]/.test(s))return;const d=segD(t.x+t.w/2,t.y-t.h/2);if(d>=best||d*mm>900)return;
   const nums=(s.match(/\d+(?:\.\d+)?/g)||[]).map(Number).filter(v=>v>=5&&v<=45);if(!nums.length)return;best=d;
   const idx=v=>SIZES.reduce((bi,z,i)=>Math.abs(z[1]-v)<Math.abs(SIZES[bi][1]-v)?i:bi,0);const sv=nums.map(idx).sort((a,b)=>b-a);szG=sv[0];szL=sv.length>1?sv[sv.length-1]:-1})}
 /* ③ 室外機：配管のもう一方の端にいちばん近い青い四角（室内機以外） */
 const oc=BL.filter(c2=>!inds.some(o=>o.c===c2)&&c2.w>=300&&c2.w<=2000&&c2.h>=200&&c2.h<=2000).map(c2=>{const dx=Math.max(c2.x0-rN[0],0,rN[0]-c2.x1),dy=Math.max(c2.y0-rN[1],0,rN[1]-c2.y1);return{c2,d:Math.hypot(dx,dy)*mm}}).filter(o=>o.d<700).sort((a,b)=>a.d-b.d)[0];
 /* ④ 天井高と機器の高さ：機器は仕上げ天井に合わせるのが基本
    ・天井高（仕上げ面）＝室内機にいちばん近い「CH=3000」
    ・天カセ：「FL+3000下端」＝本体の下面＝パネルの設置面＝仕上げ天井（パネルはその下に付く）。CH=が無い時だけ、これを天井高にする
    ・ビルトイン：天井裏にしまうので、図面の「下端」どおりの高さに置く（天井高は変えない）
    ・下端の文字は、その室内機の記号の中にあるものを使う（近くのほかの機器＝ロスナイ等の下端を拾わない） */
 const RX_BOT=/FL\s*\+\s*(\d{3,4})\s*下端/,inC=t=>{const x=t.x+t.w/2,y=t.y-t.h/2;return x>=I.c.x0-3&&x<=I.c.x1+3&&y>=I.c.y0-3&&y<=I.c.y1+3};
 const chT=planNearText(/C\.?\s?H\s*=?\s*\d{4}/,ctr[0],ctr[1],1e9),bot=(P.texts||[]).filter(t=>RX_BOT.test(normTx(t.s))).find(inC)||planNearText(RX_BOT,ctr[0],ctr[1],1000/mm);
 const BI=!!CAS2M[I.k].bi,botFL=bot?+normTx(bot.s).match(RX_BOT)[1]:null;
 let CH=chT?+normTx(chT.s).match(/(\d{4})/)[1]:(P.CH||st.gnd.ch||2500);if(!chT&&!BI&&botFL>=1800&&botFL<=6000)CH=botFL;
 const indY=BI&&botFL>=1000&&botFL<=8000?CH-botFL:0;   // 室内機の基準点（天カセ＝パネルの設置面、ビルトイン＝本体の下面）を、天井から何mm下げるか（－は上げる）
 /* 前に作った物（同じ所の室内機・室外機）は置きかえる */
 const W0=btWx(ctr),near=(o,q,d)=>Math.hypot(o.x-q[0],o.z-q[1])<d;
 st.bld=st.bld.filter(o=>!((o.k==="ind"&&near(o,W0,800))||(o.k==="out"&&oc&&near(o,btW([oc.c2.cx,oc.c2.cy]),800))));
 P.CH=CH;st.gnd.ch=CH;st.gnd.on=true;st.gnd.c=true;
 /* 壁がまだ無ければ、まわりの壁を取り込む（図面のほかの部分は拾わない） */
 if(!P._kzOnly&&!st.bld.some(o=>o.k==="wall")){const xs=[...route.map(p=>p[0]),I.c.x0,I.c.x1],ys=[...route.map(p=>p[1]),I.c.y0,I.c.y1],pad=3500/mm;
  const sv={aw:W.aw,ac:W.ac,ai:W.ai};W.aw=true;W.ac=false;W.ai=false;const tst=window.toast;window.toast=()=>{};
  try{wzAuto([Math.min(...xs)-pad,Math.min(...ys)-pad],[Math.max(...xs)+pad,Math.max(...ys)+pad])}catch(e){console.warn(e)}window.toast=tst;Object.assign(W,sv)}
 /* 室内機を置く（配管の出口が、図面の配管の始まりの方を向くように4方向から選ぶ） */
 const io=bldNew("ind",{x:W0[0],z:W0[1]});io.m=I.k;io.y=indY;st.bld.push(io);st.bld=normBld(st.bld);const ii=st.bld.length-1;
 const RW=route.map(btW);let bestR=0,bestD=1e18;
 {const lg=RW.length>=2?[RW[1][0]-RW[0][0],RW[1][1]-RW[0][1]]:[1,0],ll=Math.hypot(lg[0],lg[1])||1;
  for(const r of[0,90,180,270]){st.bld[ii].r=r;try{build3D()}catch(e){}const m=T&&T.bldM&&T.bldM.find(q=>q.i===ii);if(!m||!m.port)continue;
   /* 室内機の向き r も配管の向き lg も3Dの座標（前回の読み込みでずれた分 st.bldXf は btW で戻してある）。ここに st.bldXf の回転を足すと、2回目に読むたびに向きが反対になる */
   const th=r*Math.PI/180,ex=[Math.cos(th),Math.sin(th)],dot=(ex[0]*lg[0]+ex[1]*lg[1])/ll;   // 配管口から出る向きと、図面の配管の向きが合うか
   const d=Math.hypot(m.port.x-RW[0][0],m.port.z-RW[0][1])+(dot>0.7?0:dot>-0.3?600:2000);if(d<bestD){bestD=d;bestR=r}}}
 st.bld[ii].r=bestR;
 /* 室外機を置く（大きさは図面の通り。配管口が配管の端に近い向き） */
 let oi=-1;if(oc){const c2=oc.c2,lw=Math.max(c2.w,c2.h),ld=Math.min(c2.w,c2.h),mk=Object.keys(OUTM).filter(k=>k!=="dk160").reduce((b,k)=>Math.hypot(OUTM[k].w-lw,OUTM[k].d-ld)<Math.hypot(OUTM[b].w-lw,OUTM[b].d-ld)?k:b,"p40"),q=btW([c2.cx,c2.cy]),f=xfOf();
  const base=(c2.w>=c2.h?0:90)-f.r,end=RW[RW.length-1];let br=normT(base),bd2=1e18;
  for(const r of[normT(base),normT(base+180)]){const th=r*Math.PI/180,lx=[Math.cos(th),Math.sin(th)],lz=[-Math.sin(th),Math.cos(th)],op=outPort(mk);const px=q[0]+lx[0]*op[0]+lz[0]*op[2],pz=q[1]+lx[1]*op[0]+lz[1]*op[2];const d=Math.hypot(px-end[0],pz-end[1]);if(d<bd2){bd2=d;br=r}}
  st.bld.push({k:"out",x:Math.round(q[0]),z:Math.round(q[1]),w:Math.round(lw/10)*10,d:Math.round(ld/10)*10,h:OUTM[mk].h,y:0,r:br,m:mk});st.bld=normBld(st.bld);oi=st.bld.length-1}
 const H=pipeH||(CH+200);
 st.bld=normBld(st.bld);bldChanged();
 if(szG>=0){st.s=szG;st.ps=szL>=0&&szL!==szG?szL:null;try{$("#sz").value=st.s}catch(e){}}
 /* 3Dの配管：配管口 → （天井の中）図面の配管の始まり → 配管の高さ → 図面どおり → 室外機の真上で下りて、配管口に横から入る */
 const pi=st.bld.findIndex(o=>o.k==="ind"&&o.m===I.k&&near(o,W0,50));if(pi<0){toast("室内機を置けませんでした");return}
 try{build3D()}catch(e){}const m=T.bldM.find(q=>q.i===pi);if(!m||!m.port){toast("室内機の配管口が分かりませんでした");return}
 const Pp=m.port,rr=st.bld[pi].r,th0=rr*Math.PI/180,c0=Math.cos(th0),s0=Math.sin(th0),loc=p=>[(p[0]-Pp.x)*c0+(p[1]-Pp.z)*s0,-(p[0]-Pp.x)*s0+(p[1]-Pp.z)*c0];
 const RL=RW.map(loc),outIdx=oi>=0?oi:-1,outObj=outIdx>=0?st.bld[outIdx]:null;
 if(!indToPipe(pi,true))return;
 const O=outObj?st.bld.find(o=>o.k==="out"&&o.m===outObj.m&&o.w===outObj.w&&o.d===outObj.d):null;
 const V=THREE.Vector3,GY=T&&T.GYr!=null?T.GYr:-CH,CYc=typeof ceilY==="function"?ceilY():null,RR=(szG>=0?SIZES[szG][1]/2:8)+10,Yp=Math.max(GY+H,CYc!=null?CYc+70+RR:-1e9);   // 天井の仕上げから70mm以上
 const PP=[new V(0,0,0)],cur=()=>PP[PP.length-1],go=v=>{if(v.length()<1)return;const c=cur(),n=c.clone().add(v);if(PP.length>=2){const d0=c.clone().sub(PP[PP.length-2]).normalize();if(d0.dot(v.clone().normalize())>0.999){c.copy(n);return}}PP.push(n)};
 const toXZ=(x,z)=>{const d=new V(x-cur().x,0,z-cur().z);if(d.length()<1)return;const ax=Math.abs(d.x)>=Math.abs(d.z);go(ax?new V(d.x,0,0):new V(0,0,d.z));go(ax?new V(0,0,d.z):new V(d.x,0,0))};
 /* 図面の配管の始まりを、配管口の線に合わせる（ズレが30cm未満なら真っすぐにする。図面の配管は機器の記号の横に描かれるので少しズレる） */
 if(RL.length>=2){const ax=Math.abs(RL[1][0]-RL[0][0])>=Math.abs(RL[1][1]-RL[0][1]),k=ax?1:0;if(Math.abs(RL[0][k])<300){RL[0][k]=0;RL[1][k]=0}}
 /* 室外機の配管口（横から入る） */
 let T0=null,Ap=null;if(O){const th=O.r*Math.PI/180,lx=new V(Math.cos(th),0,Math.sin(th)),lz=new V(-Math.sin(th),0,Math.cos(th)),op=outPort(O.m||"p40");
  T0=new V(O.x,GY+(O.y||0),O.z).addScaledVector(lx,op[0]).addScaledVector(lz,op[2]).add(new V(0,op[1],0));Ap=T0.clone().addScaledVector(lx,250)}
 /* 区間ごとの高さ：図面の「FL+○○」が2つ以上あれば区間ごとに。変わる所＝ピンクの丸い端（縦管の印）、無ければ2つの文字の中間の角
    室外機側の丸い端（緑の丸の所）＝そこで室外機の配管口の高さへ上げ下げして、そのまま横から入る */
 const RH=planRefHeights(route,pipeH),Yl=fl=>Math.max(GY+fl,CYc!=null?CYc+70+RR:-1e9),hA=route.map(()=>RH.labs.length?Yl(RH.labs[0].FL):Yp);
 RH.labs.forEach((L,k)=>{if(!k)return;const A=RH.labs[k-1];if(Math.abs(A.FL-L.FL)<50)return;
  const c=RH.caps.find(j=>RH.s[j]>A.s&&RH.s[j]<=L.s+1)??RH.s.findIndex(v=>v>=(A.s+L.s)/2);if(c<0)return;for(let i=c;i<hA.length;i++)hA[i]=Yl(L.FL)});
 const capO=T0?RH.caps.filter(j=>j>=1&&RH.s[j]>500).pop():undefined;if(capO!=null)for(let i=capO;i<hA.length;i++)hA[i]=T0.y;
 if(Math.abs(hA[0])<100){const h0=hA[0];for(let i=0;i<hA.length;i++)if(hA[i]===h0)hA[i]=0}
 go(new V(0,hA[0],0));   // 配管口から配管の高さへ（10cm未満の差は、曲げられないので同じ高さで通す）
 {const ax=RL.length>=2&&Math.abs(RL[1][0]-RL[0][0])>=Math.abs(RL[1][1]-RL[0][1]);if(ax)go(new V(0,0,RL[0][1]));else go(new V(RL[0][0],0,0));go(new V(RL[0][0]-cur().x,0,RL[0][1]-cur().z))}
 for(let i=1;i<RL.length;i++){go(new V(RL[i][0]-cur().x,0,RL[i][1]-cur().z));if(Math.abs(hA[i]-cur().y)>=1)go(new V(0,hA[i]-cur().y,0))}
 if(T0){const out=Ap.clone().sub(T0).normalize(),d=T0.clone().sub(cur()),a=d.dot(out);
  if(Math.abs(d.y)<1&&a<=-50){const al=out.clone().multiplyScalar(a);go(d.clone().sub(al));go(al)}   // もう口の高さ：横のずれを合わせてから、まっすぐ口へ（行き過ぎて戻らない）
  else{const toAp=Ap.clone().sub(cur());toAp.y=0;const al=out.clone().multiplyScalar(toAp.dot(out));go(al);go(toAp.clone().sub(al));go(new V(0,T0.y-cur().y,0));go(T0.clone().sub(cur()))}}   // 口の向きに出る→横を合わせる→（上げ下げ）→口へ
 /* 外壁を出たらすぐ室外機の高さへ（壁がまだ無い時は、全部自動で壁を読んだ後にもう一度） */
 const PP0=PP.map(p=>p.clone()),dropOut=()=>{if(!T0||capO!=null)return false;const n=pipeDropOut(PP0,T0.y,st.bld.filter(o=>o.k==="wall"&&o.m!=="lgs"&&o.auto!=="lgs"));if(!n)return false;PP.length=0;n.forEach(p=>PP.push(p));return true};dropOut();
 /* スリーブ（穴）：出来上がった3Dの冷媒が壁を通る所に、その高さで開ける（図面の線は配管口に合わせて少しずらすので、図面の線の位置だと合わない） */
 /* 穴：線（点の並び）が壁を横切る所に、その高さで開ける。dia＝穴の直径、tag＝冷媒1・ドレン2、near＝ほかの穴とこれより近ければ開けない */
 const holesOn=(L,dia,tag,near)=>{const walls=st.bld.filter(o=>o.k==="wall");
  for(let i=1;i<L.length;i++){const A=L[i-1],B=L[i],hl=Math.hypot(B.x-A.x,B.z-A.z);if(hl<1||Math.abs(B.y-A.y)>hl*0.1)continue;   // 横の区間だけ（ドレンの勾配はよい）
   walls.forEach(w=>{const th=w.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th),loc=p=>[(p.x-w.x)*co+(p.z-w.z)*si,-(p.x-w.x)*si+(p.z-w.z)*co],La=loc(A),Lb=loc(B);
    if(La[1]*Lb[1]>=0)return;const u=La[1]/(La[1]-Lb[1]),lx=La[0]+(Lb[0]-La[0])*u;if(Math.abs(lx)>w.w/2)return;const X=A.x+(B.x-A.x)*u,Z=A.z+(B.z-A.z)*u,Y=A.y+(B.y-A.y)*u-GY;
    if(st.bld.some(o=>o.k==="hole"&&Math.hypot(o.x-X,o.z-Z)<near&&Math.abs(o.y-Y)<near))return;
    st.bld.push({k:"hole",x:Math.round(X),z:Math.round(Z),r:w.r,w:dia,d:w.d,h:dia,y:Math.round(Y),full:false,auto:tag})})}};
 /* ドレンの穴の直径：管の外径＋20mm 以上のスリーブ（50・65・75・100・125） */
 const drHoleDia=()=>{const D=DRN(),M=DR_MAT[D.mat]||DR_MAT.VP,szs=[D.sz,...D.rows.map(r=>r.sz)].filter(v=>DR_SIZES.includes(v)),od=Math.max(...szs.map(v=>M.od[v]||48),48);return[50,65,75,100,125].find(v=>v>=od+20)||150};
 const mkHoles=()=>{st.bld=st.bld.filter(o=>!(o.k==="hole"&&o.auto));holesOn(PP,75,1,200);
  /* ドレンも壁を通る所に穴（冷媒の穴とほぼ同じ所＝一緒に通す時は、冷媒の穴を使う） */
  try{const D=st.drain?DRN():null,u=T&&T.UN&&(T.UN.find(x=>x.t==="s"&&x.dr)||T.UN.find(x=>x.dr));
   if(D&&D.show&&D.rows.length&&u){const DP=drPath(u.dr.p.clone(),new THREE.Vector3(u.dr.d.x,0,u.dr.d.z)).pts;holesOn(DP,drHoleDia(),2,120)}}catch(e){console.warn("drain holes",e)}
  st.bld=normBld(st.bld);bldChanged()};mkHoles();P._mkHoles=mkHoles;   /* 全部自動では、軽量壁を読んだ後にもう一度開け直す（消えた壁の穴が残らないように） */
 const F=frameFor(new V(1,0,0)),Pf=PP.map(p=>new V(p.dot(F.ex),p.dot(F.ey),p.dot(F.ez)));
 const rows=polyToRows(Pf).filter(r=>r.l>0);if(!rows.length){toast("ルートを作れませんでした");return}
 st.rows=normRows(rows,[{l:1000,a:0,t:0,o:false}]);sel=0;st.units.e="";save();render();if(T){build3D();fitT(true)}
 /* ドレン：図面のオレンジの管から自動で作る（冷媒と同じ3Dに出す） */
 let DRr=null;try{DRr=planReadDrain(pipeH||null);if(DRr){mkHoles();save();render();if(T){build3D();fitT(true)}}}catch(e){console.warn("drain read",e)}   // ドレンが壁を通る所にも穴
 /* 冷媒の通し方：図面で冷媒とドレンが並んで走っていれば、ドレンの上（全ねじの横掴み・50mm）に通す */
 let RJ=null;if(DRr){try{RJ=rjInit(Pf)}catch(e){console.warn("rj",e)}}else st.rj=null;
 P._dropOut=()=>{if(!dropOut())return false;const F2=frameFor(new V(1,0,0)),Pf2=PP.map(p=>new V(p.dot(F2.ex),p.dot(F2.ey),p.dot(F2.ez))),rows2=polyToRows(Pf2).filter(r=>r.l>0);if(!rows2.length)return false;
  st.rows=normRows(rows2,[{l:1000,a:0,t:0,o:false}]);sel=0;if(DRr){try{rjInit(Pf2)}catch(e){console.warn("rj",e)}}save();render();if(T){build3D();fitT(true)}return true};
 const po=$("#planOv");if(po)po.style.display="none";
 toast("読み込みました：室内機 "+CAS2M[I.k].n+"（天井 "+fmt(CH)+(BI&&botFL?"・本体下面 FL+"+fmt(botFL):"")+"）"+(O?"・室外機 "+fmt(O.w)+"×"+fmt(O.d):"")+"・配管 "+(szG>=0?SIZES[szG][0].split(" ")[0]+(szL>=0?"／"+SIZES[szL][0].split(" ")[0]:""):"")+(pipeH?" FL+"+pipeH:"")+"（合計"+fmt(rows.reduce((a,r)=>a+r.l,0))+"mm）"+(RJ&&RJ.mode!=="sep"?"・冷媒はドレンの上（全ねじ・"+RJ.gap+"mm）":"")+(DRr?"・ドレン "+DRr.sizes.map(z=>z+"A").join("／")+" "+fmt(DRr.len)+"mm（1/"+DRr.slope+(DRr.co?"・掃除口 "+DRr.co:"")+"）":""));
 return{ind:CAS2M[I.k].n,CH,botFL,indY,drain:DRr,rj:RJ&&{mode:RJ.mode,gap:RJ.gap,len:RJ.len},pipeH,szG,szL,out:O?[O.w,O.d,O.m]:null,rows:rows.length}}
/* ===== 💧 ドレン配管を図面から読む =====
   ・ドレン＝オレンジの2本線（1本だけのオレンジ線＝延焼ラインなどは拾わない）
   ・「40A」＋「FL+3220」＝その所の管のサイズと高さ（引出線の先。無ければいちばん近い管）
   ・オレンジの小さい丸＝縦の管（そこで下がる・上がる）。チーズから先が短くて行き止まり＝掃除口
   ・始まり＝室内機のドレン口にいちばん近い端。高さの差は、勾配（文字から1/100か1/50）と縦管で合わせる */
const isOrg=c=>{const[r,g,b]=rgbOf(c);return r>200&&g>=80&&g<=175&&b<80};
const v2s=(a,b)=>[a[0]-b[0],a[1]-b[1]],v2d=(a,b)=>a[0]*b[0]+a[1]*b[1],v2l=a=>Math.hypot(a[0],a[1]);
const v2pd=(p,a,b)=>{const d=v2s(b,a),l2=v2d(d,d)||1,t=v2d(v2s(p,a),d)/l2,tc=Math.max(0,Math.min(1,t)),q=[a[0]+d[0]*tc,a[1]+d[1]*tc];return{d:v2l(v2s(p,q)),t,tc,q}};
function planDrainGraph(){const P=PLAN,mm=P.mmpp,px=v=>v/mm,dirOf=c=>{const d=v2s(c.b,c.a),l=v2l(d)||1;return[d[0]/l,d[1]/l]};
 const O=P.segs.filter(s=>isOrg(s[4])).map(s=>{const a=[s[0],s[1]],b=[s[2],s[3]],l=v2l(v2s(b,a));return l*mm<12?null:{a,b,l,u:[(b[0]-a[0])/l,(b[1]-a[1])/l]}}).filter(Boolean);
 if(O.length<4)return null;
 /* ① 平行な2本線（間隔20〜120mm）→ 管の中心線 */
 let C=[];
 for(let i=0;i<O.length;i++){const A=O[i],n=[-A.u[1],A.u[0]];
  for(let j=i+1;j<O.length;j++){const B=O[j];if(Math.abs(A.u[0]*B.u[1]-A.u[1]*B.u[0])>0.03)continue;
   const d=v2d(v2s(B.a,A.a),n),w=Math.abs(d)*mm;if(w<20||w>120)continue;
   const t0=v2d(v2s(B.a,A.a),A.u),t1=v2d(v2s(B.b,A.a),A.u),o0=Math.max(0,Math.min(t0,t1)),o1=Math.min(A.l,Math.max(t0,t1));if((o1-o0)*mm<12)continue;
   C.push({a:[A.a[0]+A.u[0]*o0+n[0]*d/2,A.a[1]+A.u[1]*o0+n[1]*d/2],b:[A.a[0]+A.u[0]*o1+n[0]*d/2,A.a[1]+A.u[1]*o1+n[1]*d/2],w})}}
 /* ② 一直線に並ぶ中心線をつなぐ（継手のすき間 30cm まで） */
 const merge=L=>{for(let again=true;again;){again=false;
   outer:for(let i=0;i<L.length;i++)for(let j=i+1;j<L.length;j++){const A=L[i],B=L[j],u=dirOf(A),ub=dirOf(B);if(Math.abs(u[0]*ub[1]-u[1]*ub[0])>0.05)continue;
    const n=[-u[1],u[0]];if(Math.max(Math.abs(v2d(v2s(B.a,A.a),n)),Math.abs(v2d(v2s(B.b,A.a),n)))>px(25))continue;
    const la=v2l(v2s(A.b,A.a)),tb=[v2d(v2s(B.a,A.a),u),v2d(v2s(B.b,A.a),u)],gap=Math.max(Math.min(...tb)-la,-Math.max(...tb),0);if(gap>px(300))continue;
    const lo=Math.min(0,...tb),hi=Math.max(la,...tb),M=la>=v2l(v2s(B.b,B.a))?A:B;
    L[i]={a:[A.a[0]+u[0]*lo,A.a[1]+u[1]*lo],b:[A.a[0]+u[0]*hi,A.a[1]+u[1]*hi],w:M.w};L.splice(j,1);again=true;break outer}}
  return L};
 C=merge(C);
 /* 継手の輪郭（太い管の中に入っている短い線）と、短すぎる切れはしを捨てる */
 C=C.filter(c=>{const L=v2l(v2s(c.b,c.a)),u=dirOf(c),m=[(c.a[0]+c.b[0])/2,(c.a[1]+c.b[1])/2];
  if(L*mm<Math.max(80,c.w*1.5))return false;
  return!C.some(e=>{if(e===c)return false;if(Math.abs(v2d(u,dirOf(e)))>0.5||v2l(v2s(e.b,e.a))<=L)return false;const q=v2pd(m,e.a,e.b);return q.t>0&&q.t<1&&q.d<=px(e.w/2+8)})});
 C=merge(C);if(!C.length)return null;
 /* ③ 角・チーズ：向きの違う中心線の交わる所（端から15cm以内） */
 const LN=C.map(c=>({c,u:dirOf(c),L:v2l(v2s(c.b,c.a)),ts:[{t:0,j:false},{t:v2l(v2s(c.b,c.a)),j:false}]}));
 for(let i=0;i<LN.length;i++)for(let j=i+1;j<LN.length;j++){const A=LN[i],B=LN[j],cr=A.u[0]*B.u[1]-A.u[1]*B.u[0];if(Math.abs(cr)<0.3)continue;
  const d=v2s(B.c.a,A.c.a),ta=(d[0]*B.u[1]-d[1]*B.u[0])/cr,tb=(d[0]*A.u[1]-d[1]*A.u[0])/cr,tol=px(150);
  if(ta<-tol||ta>A.L+tol||tb<-tol||tb>B.L+tol)continue;A.ts.push({t:ta,j:true});B.ts.push({t:tb,j:true})}
 const N=[],E=[],nodeAt=p=>{for(let k=0;k<N.length;k++)if(v2l(v2s(N[k].p,p))<=px(40))return k;N.push({p:p.slice(),circ:false});return N.length-1};
 LN.forEach(L=>{const ts=L.ts.slice().sort((a,b)=>a.t-b.t),keep=[];
  ts.forEach(o=>{const last=keep[keep.length-1];if(last&&(o.t-last.t)*mm<80){if(o.j&&!last.j)keep[keep.length-1]=o;return}keep.push(o)});
  const pt=t=>[L.c.a[0]+L.u[0]*t,L.c.a[1]+L.u[1]*t];
  for(let k=0;k<keep.length-1;k++){const a=nodeAt(pt(keep[k].t)),b=nodeAt(pt(keep[k+1].t));if(a!==b)E.push({a,b,w:L.c.w})}});
 /* ④ 小さい丸（縦の管）：オレンジの短い線の点を集めて円を当てはめる */
 const SP=P.segs.filter(s=>isOrg(s[4])&&Math.hypot(s[2]-s[0],s[3]-s[1])*mm<40).flatMap(s=>[[s[0],s[1]],[s[2],s[3]]]);
 const used=new Array(SP.length).fill(false),circles=[];
 for(let i=0;i<SP.length;i++){if(used[i])continue;const cl=[i];used[i]=true;
  for(let k=0;k<cl.length;k++)for(let j=0;j<SP.length;j++)if(!used[j]&&v2l(v2s(SP[j],SP[cl[k]]))*mm<=25){used[j]=true;cl.push(j)}
  let pts=cl.map(k=>SP[k]);if(pts.length<8)continue;
  let c=null;for(let it=0;it<4;it++){c=fitCircle(pts);if(!c)break;const res=pts.map(p=>Math.abs(v2l(v2s(p,c))-c.r));const tol=Math.max(0.3,c.r*0.15);const np=pts.filter((p,k)=>res[k]<=tol);if(np.length===pts.length)break;pts=np;if(pts.length<8){c=null;break}}
  if(!c||c.r*mm<12||c.r*mm>70)continue;
  const ang=pts.map(p=>Math.atan2(p[1]-c[1],p[0]-c[0])).sort((a,b)=>a-b);let gap=ang[0]+2*Math.PI-ang[ang.length-1];for(let k=1;k<ang.length;k++)gap=Math.max(gap,ang[k]-ang[k-1]);
  if(gap>2.1)continue;circles.push({p:[c[0],c[1]],r:c.r})}
 circles.forEach(ci=>{let bn=-1,bd=1e18;N.forEach((n,k)=>{const d=v2l(v2s(n.p,ci.p));if(d<bd){bd=d;bn=k}});
  if(bn>=0&&bd<=ci.r+px(60)){N[bn].circ=true;return}
  let be=-1,bq=null,bed=1e18;E.forEach((e,k)=>{const q=v2pd(ci.p,N[e.a].p,N[e.b].p);if(q.d<bed&&q.tc>0&&q.tc<1){bed=q.d;be=k;bq=q.q}});
  if(be<0||bed>ci.r+px(40))return;const e=E[be],k=N.length;N.push({p:bq,circ:true});E.splice(be,1,{a:e.a,b:k,w:e.w},{a:k,b:e.b,w:e.w})});
 E.forEach(e=>e.len=v2l(v2s(N[e.a].p,N[e.b].p))*mm);
 return{N,E,circles}}
function fitCircle(pts){let sx=0,sy=0,sxx=0,syy=0,sxy=0,sxz=0,syz=0,sz=0;const n=pts.length;
 pts.forEach(([x,y])=>{const z=x*x+y*y;sx+=x;sy+=y;sxx+=x*x;syy+=y*y;sxy+=x*y;sxz+=x*z;syz+=y*z;sz+=z});
 const M=[[sxx,sxy,sx],[sxy,syy,sy],[sx,sy,n]],R=[-sxz,-syz,-sz],det=m=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
 const D0=det(M);if(Math.abs(D0)<1e-9)return null;const col=(k)=>M.map((row,i)=>row.map((v,j)=>j===k?R[i]:v));
 const D=det(col(0))/D0,Ee=det(col(1))/D0,F=det(col(2))/D0,cx=-D/2,cy=-Ee/2,r2=cx*cx+cy*cy-F;if(r2<=0)return null;const c=[cx,cy];c.r=Math.sqrt(r2);return c}
/* 区間の点（3D）→ ドレンの区間（長さ・曲げ角・向き）。drPath と同じ決まりで向きを回す */
function drRowsFromPts(pts,d0){const V=THREE.Vector3;let d=d0.clone().normalize(),u=Math.abs(d.y)>0.9?new V(-1,0,0):new V(0,1,0);u=u.sub(d.clone().multiplyScalar(u.dot(d))).normalize();let r=d.clone().cross(u).normalize();
 const mv=[];let base=pts[0].p;for(let i=1;i<pts.length;i++){const v=pts[i].p.clone().sub(base),l=v.length();if(l<20){if(pts[i].co&&mv.length)mv[mv.length-1].co=true;continue}base=pts[i].p;const n=v.normalize(),last=mv[mv.length-1];
  if(last&&last.n.dot(n)>0.999&&!last.co&&!pts[i].sz){last.l+=l;last.co=pts[i].co;continue}mv.push({n,l,co:!!pts[i].co,sz:pts[i-1].sz||0})}
 if(!mv.length)return[];
 if(mv[0].n.dot(d)<0.999)mv.unshift({n:d.clone(),l:0,co:false,sz:0});
 const rows=mv.map(m=>({l:Math.round(m.l),a:0,t:0,j:m.co?"co":"",bsz:25,bl:600,bs:"L",sz:m.sz,tr:false}));
 for(let k=0;k<mv.length-1;k++){const n=mv[k+1].n,c=Math.max(-1,Math.min(1,d.dot(n)));if(c>0.999)continue;
  const a=Math.acos(c)*180/Math.PI<67.5?45:90,b=n.clone().addScaledVector(d,-c);if(b.lengthSq()<1e-9)continue;b.normalize();
  rows[k].a=a;rows[k].t=normT(Math.atan2(b.dot(r),b.dot(u))*180/Math.PI);
  const ax=d.clone().cross(b).normalize(),ar=a*Math.PI/180;d.applyAxisAngle(ax,ar).normalize();u.applyAxisAngle(ax,ar).normalize();r=d.clone().cross(u).normalize()}
 return rows}
/* 図面からドレンを作る（planReadAll の最後に呼ぶ。冷媒を作った後なので、btW＝3Dの座標） */
function planReadDrain(refFL){const P=PLAN,mm=P.mmpp,px=v=>v/mm;if(!T||!T.UN)return null;
 const u=T.UN.find(x=>x.t==="s"&&x.dr)||T.UN.find(x=>x.dr);if(!u)return null;
 const G=planDrainGraph();if(!G||!G.E.length)return null;const{N,E}=G,V=THREE.Vector3;
 const S=u.dr.p.clone(),d0=new V(u.dr.d.x,0,u.dr.d.z).normalize(),Sp=btP(S.x,S.z),GY=T.GYr!=null?T.GYr:null;if(GY==null)return null;
 const adj=N.map(()=>[]);E.forEach((e,k)=>{adj[e.a].push({to:e.b,e:k});adj[e.b].push({to:e.a,e:k})});
 /* 始まり：ドレン口にいちばん近い端（3m以内） */
 let s0=-1,sd=1e18;N.forEach((n,k)=>{if(adj[k].length!==1)return;const d=v2l(v2s(n.p,Sp))*mm;if(d<sd){sd=d;s0=k}});
 if(s0<0||sd>3000)return null;
 /* 本管：いちばん長く続く方へ。わき道は、短い行き止まり＝掃除口、長い＝ほかからの合流 */
 const depth=(k,from,seen)=>{let m=0;adj[k].forEach(o=>{if(o.to===from||seen.has(o.to))return;seen.add(o.to);m=Math.max(m,E[o.e].len+depth(o.to,k,seen))});return m};
 const path=[{k:s0,co:false}],seenM=new Set([s0]);let cur=s0,prev=-1,nco=0;
 for(let guard=0;guard<500;guard++){const nx=adj[cur].filter(o=>o.to!==prev&&!seenM.has(o.to)).map(o=>({...o,dp:E[o.e].len+depth(o.to,cur,new Set([cur,o.to]))})).sort((a,b)=>b.dp-a.dp);
  if(!nx.length)break;nx.slice(1).forEach(o=>{if(o.dp>=80&&o.dp<=600){path[path.length-1].co=true;nco++}});
  prev=cur;cur=nx[0].to;seenM.add(cur);path.push({k:cur,co:false,w:E[nx[0].e].w})}
 if(path.length<2)return null;
 /* 本管の長さの位置（s） */
 let acc=0;path.forEach((o,i)=>{if(i)acc+=v2l(v2s(N[o.k].p,N[path[i-1].k].p))*mm;o.s=acc;o.p=N[o.k].p;o.circ=N[o.k].circ});
 const proj=q=>{let best=null;for(let i=1;i<path.length;i++){const a=path[i-1].p,b=path[i].p,r=v2pd(q,a,b);if(!best||r.d<best.d)best={d:r.d,s:path[i-1].s+r.tc*v2l(v2s(b,a))*mm,i,q:r.q}}return best};
 /* 文字：「40A」＋「FL+3220」（同じ行）。引出線の先の管に付ける */
 const TX=(P.texts||[]).map(t=>({t,s:normTx(t.s).trim()})),SZ=TX.filter(o=>/^\d{2,3}\s*A$/.test(o.s)),FLs=TX.filter(o=>/^FL\s*\+\s*\d{3,4}$/.test(o.s));
 const blk=P.segs.filter(s=>!isOrg(s[4])&&!isBlue(s[4])&&!isMag(s[4])),usedFL=new Set(),labs=[];
 FLs.forEach(f=>{const z=SZ.find(o=>Math.abs(o.t.y-f.t.y)<=f.t.h*0.6&&f.t.x-(o.t.x+o.t.w)>=-2&&f.t.x-(o.t.x+o.t.w)<=px(400));
  const x0=z?z.t.x:f.t.x,y0=f.t.y,FL=+f.s.match(/(\d{3,4})/)[1],sz=z?+z.s.match(/\d+/)[0]:0;
  let anc=null;blk.forEach(s=>{const e1=[s[0],s[1]],e2=[s[2],s[3]],L=v2l(v2s(e2,e1));if(L*mm<80||L*mm>3000)return;[[e1,e2],[e2,e1]].forEach(([n,fr])=>{if(v2l(v2s(n,[x0,y0+1]))*mm>80)return;const r=proj(fr);if(r&&r.d*mm<=120&&(!anc||r.d<anc.d))anc=r})});
  if(!anc){const r=proj([x0+((z?f.t.x+f.t.w:f.t.x+f.t.w)-x0)/2,y0-f.t.h/2]);if(r&&r.d*mm<=800)anc=r}
  if(!anc)return;usedFL.add(f);labs.push({s:anc.s,FL,sz,i:anc.i})});
 labs.sort((a,b)=>a.s-b.s);
 /* 勾配：となりの文字どうしの差から（縦管が無い所で 1/30〜1/300 のもの）→ 1/50 か 1/100 */
 const D=DRN(),sl=[];for(let i=1;i<labs.length;i++){const dh=labs[i-1].FL-labs[i].FL,ds=labs[i].s-labs[i-1].s;if(dh>3&&ds>800){const k=ds/dh;if(k>=30&&k<=300&&!path.some(o=>o.circ&&o.s>labs[i-1].s&&o.s<labs[i].s))sl.push(k)}}
 const slope=sl.length?(sl.sort((a,b)=>a-b)[sl.length>>1]<75?50:100):D.slope;
 /* 縦管：高さが勾配で合わない所に、丸（縦の管）があればそこ、無ければ前の文字の所で上げ下げ */
 const portFL=S.y-GY,ev=[];let hs=0,hFL=portFL,top=null;
 /* ヤグラ（ドレンアップのトップ）：ドレン口から、メインの管・機械側の配管（冷媒）のどちらよりも高い所まで上げる（＋100mm）。
    トップから勾配で出て、メインに入るチーズの手前で下げて、メインの高さでチーズに入る */
 const YG=100,L1=labs[0];let rest=labs;
 if(L1){const tee=path.find(o=>o.s>1&&o.co&&o.s<=L1.s+300),sJ=tee?tee.s:L1.s,mainJ=L1.FL+(L1.s-sJ)/slope;
  if(sJ>=150){const TOP=Math.round(Math.max(mainJ+sJ/slope,portFL,refFL||0)+YG),sD=Math.max(sJ*0.6,sJ-150),dyUp=TOP-portFL,dyDn=(mainJ+(sJ-sD)/slope)-(TOP-sD/slope);
   if(dyUp>=30){ev.push({s:0,dy:Math.round(dyUp)});if(dyDn<=-30)ev.push({s:sD,dy:Math.round(dyDn)});top={FL:TOP,sD:Math.round(sD),sJ:Math.round(sJ)};hs=sJ;hFL=mainJ;rest=labs.slice(1)}}}
 rest.forEach(L=>{const exp=hFL-(L.s-hs)/slope,cand=path.filter(o=>o.circ&&o.s>hs+1&&o.s<=L.s+1);const at=cand.length?cand[cand.length-1].s:hs;
  const dy=L.FL+(L.s-at)/slope-(hFL-(at-hs)/slope);if(Math.abs(dy)>=30)ev.push({s:at,dy:Math.round(dy)});hs=L.s;hFL=Math.abs(dy)>=30?L.FL:exp});
 /* 終わり：丸（縦の管）で終わっていて、近く（1.5m）に「ウォーターベスト／排水」と高さ → そこまで下げる */
 const last=path[path.length-1];let endFL=null;
 if(last.circ){const c=FLs.filter(f=>!usedFL.has(f)&&v2l(v2s([f.t.x+f.t.w/2,f.t.y-f.t.h/2],last.p))*mm<=1500).map(f=>{const above=TX.find(o=>o!==f&&Math.abs(o.t.x-f.t.x)<=px(150)&&f.t.y-o.t.y>0&&f.t.y-o.t.y<=f.t.h*2.2);return{f,pr:above&&/ベスト|排水|ドレン|VB|ウォーター/.test(above.s)?0:1,d:v2l(v2s([f.t.x,f.t.y],last.p))}}).sort((a,b)=>a.pr-b.pr||a.d-b.d)[0];
  if(c){endFL=+c.f.s.match(/(\d{3,4})/)[1];const h=hFL-(last.s-hs)/slope,dy=endFL-h;if(dy<=-30)ev.push({s:last.s,dy:Math.round(dy)})}}
 /* サイズ：文字の付いた区間はその太さ。付いていない区間は、図面の太さが同じ区間に合わせる */
 const segSz=path.map(()=>0);labs.forEach(L=>{if(L.sz)segSz[L.i]=L.sz});
 for(let i=1;i<path.length;i++)if(!segSz[i]){let b=null;for(let j=1;j<path.length;j++)if(segSz[j]&&Math.abs((path[j].w||0)-(path[i].w||0))<=10&&(!b||Math.abs(j-i)<Math.abs(b-i)))b=j;segSz[i]=b?segSz[b]:0}
 for(let i=1;i<path.length;i++)if(!segSz[i])segSz[i]=segSz[i-1];
 const sz0=DR_SIZES.includes(segSz[1])?segSz[1]:D.sz;
 /* 3Dの点：ドレン口 → 図面の始まり → 本管（縦管を入れる） */
 const W=path.map(o=>btW(o.p));
 {const ax=Math.abs(d0.x)>=Math.abs(d0.z),k=ax?1:0,S2=[S.x,S.z];if(W.length>=2){const fx=Math.abs(W[1][0]-W[0][0])>=Math.abs(W[1][1]-W[0][1]);if(fx===ax&&Math.abs(W[0][k]-S2[k])<300){W[0][k]=S2[k];W[1][k]=S2[k]}}}
 const pts=[{p:S.clone()}];let y=S.y;const addV=dy=>{if(!dy)return;y+=dy;pts.push({p:new V(pts[pts.length-1].p.x,y,pts[pts.length-1].p.z)})};
 const evAt=s=>ev.filter(e=>Math.abs(e.s-s)<1).reduce((a,e)=>a+e.dy,0),evMid=[];ev.forEach(e=>{if(!path.some(o=>Math.abs(o.s-e.s)<1))evMid.push(e)});
 addV(evAt(0));
 {const a=pts[pts.length-1].p,ax=Math.abs(d0.x)>=Math.abs(d0.z);if(ax){pts.push({p:new V(W[0][0],y,a.z)})}else{pts.push({p:new V(a.x,y,W[0][1])})}pts.push({p:new V(W[0][0],y,W[0][1]),co:path[0].co})}
 for(let i=1;i<path.length;i++){
  evMid.filter(e=>e.s>path[i-1].s&&e.s<path[i].s).forEach(e=>{const f=(e.s-path[i-1].s)/Math.max(1,path[i].s-path[i-1].s);pts.push({p:new V(W[i-1][0]+(W[i][0]-W[i-1][0])*f,y,W[i-1][1]+(W[i][1]-W[i-1][1])*f)});addV(e.dy)});
  pts.push({p:new V(W[i][0],y,W[i][1]),co:path[i].co,sz:i<path.length-1&&segSz[i+1]!==segSz[i]&&DR_SIZES.includes(segSz[i+1])?segSz[i+1]:0});
  if(i<path.length-1)addV(evAt(path[i].s))}
 addV(evAt(last.s));
 const rows=drRowsFromPts(pts,d0);if(!rows.length)return null;
 D.rows=rows.slice(0,40);D.sz=sz0;D.slope=slope;D.show=true;D.tr.on=false;D.up=0;
 /* ヤグラの区間（ドレン口 → 立ち上げ → トップ → 下げるまで）に印。ドレンホースに切り替える時はこの区間をホースにする */
 if(top){try{const dirs=drPath(new V(),d0.clone()).dirs;let up=-1,dn=-1;for(let i=0;i<D.rows.length;i++){const y=dirs[i]?dirs[i].y:0;if(up<0&&y>0.7)up=i;else if(up>=0&&y<-0.7){dn=i;break}}
   if(up>=0&&dn>up)for(let i=0;i<=dn;i++)D.rows[i].yg=true}catch(e){console.warn(e)}}
 return{rows:D.rows.length,len:Math.round(D.rows.reduce((a,r)=>a+r.l,0)),co:nco,sizes:[...new Set(segSz.filter(Boolean))],slope,labs:labs.map(l=>[Math.round(l.s),l.FL,l.sz]),ev,endFL,portFL:Math.round(portFL),top}}
/* ===== 🔗 冷媒をドレンに沿わせる（図面で同じ穴から出る時） =====
   ・別ルート：図面の冷媒のまま
   ・とも巻き：ドレンの上に冷媒を載せて一緒に巻く（間 0）
   ・全ねじの上（横掴みバンド）：ドレンを吊った全ねじに横掴みバンドで、ドレンの上に間を空けて通す（初期 50mm）
   並んで走る区間＝図面の冷媒がドレンから40cm以内の所。分かれた所から先は図面どおり室外機へ */
function rjJoin(B,gap,from){if(!T||!T.UN)return null;const u=T.UN.find(x=>x.t==="s"&&x.dr)||T.UN.find(x=>x.dr),D=st.drain?DRN():null;if(!u||!D||!D.rows.length)return null;
 const V=THREE.Vector3,DP=drPath(u.dr.p.clone(),new V(u.dr.d.x,0,u.dr.d.z)).pts;if(DP.length<2)return null;
 /* ドレンの点ごとの位置（横の長さ s） */
 const S=[0];for(let i=1;i<DP.length;i++)S.push(S[i-1]+Math.hypot(DP[i].x-DP[i-1].x,DP[i].z-DP[i-1].z));
 const xz=p=>[p.x,p.z],near=q=>{let b=null;for(let i=1;i<DP.length;i++){const a=xz(DP[i-1]),c=xz(DP[i]),L=S[i]-S[i-1],r=v2pd(q,a,c);if(!b||r.d<b.d-1)b={d:r.d,s:S[i-1]+r.tc*L}}return b};
 /* 図面の冷媒（B[2]〜）がドレンに沿う所 */
 let k0=-1,m=-1;for(let k=2;k<B.length;k++){const r=near(xz(B[k]));if(r.d<=400){if(k0<0)k0=k;m=k}else if(k0>=0)break}
 if(k0<0)return null;const sA=near(xz(B[k0])).s,sM=near(xz(B[m])).s;if(sM-sA<800)return null;
 /* 沿わせ始める所：ドレンの角を選んだ時はそこ。自動＝ヤグラ（立ち上げ）を降りた所。降りる所が無ければ並び始める所 */
 let sJ=sA,iJ=-1;
 if(typeof from==="number"&&DP[from+1]){iJ=from+1;sJ=S[iJ]}
 else{for(let i=1;i<DP.length;i++){if(S[i]-S[i-1]<1&&DP[i-1].y-DP[i].y>50&&S[i]>=sA-400&&S[i]<sM){iJ=i;sJ=S[i];break}}}
 if(from==="auto"&&sM-sJ<800){sJ=sA;iJ=-1}   // 降りた後に並ぶ所がほとんど無ければ、並び始める所から
 if(sJ<sA-400)sJ=sA;if(sM-sJ<300)return null;
 const rD=(DR_MAT[D.mat].od[D.sz]||32)/2,rR=(SIZES[st.s]?SIZES[st.s][1]/2:8)+10,off=rD+gap+rR;
 /* ドレンの s の所の点（同じ s に縦管があれば、下の方＝降りた後） */
 const at=s=>{let p=null;for(let i=1;i<DP.length;i++){if(s>=S[i-1]-0.5&&s<=S[i]+0.5){const L=S[i]-S[i-1],t=L<1?1:Math.max(0,Math.min(1,(s-S[i-1])/L));p=DP[i-1].clone().lerp(DP[i],t)}}return p};
 const J0=iJ>=0?DP[iJ].clone():at(sJ);if(!J0)return null;
 const PP=[new V(0,0,0)],cur=()=>PP[PP.length-1],go=v=>{if(v.length()<1)return;const c=cur(),n=c.clone().add(v);if(PP.length>=2){const d0=c.clone().sub(PP[PP.length-2]).normalize();if(d0.dot(v.clone().normalize())>0.999){c.copy(n);return}}PP.push(n)};
 const toXZ=(x,z)=>{const d=new V(x-cur().x,0,z-cur().z);if(d.length()<1)return;const ax=Math.abs(d.x)>=Math.abs(d.z);go(ax?new V(d.x,0,0):new V(0,0,d.z));go(ax?new V(0,0,d.z):new V(d.x,0,0))};
 /* ① 沿わせ始める所までは、図面の冷媒のまま */
 let kj=1;for(let k=2;k<=m;k++){if(near(xz(B[k])).s<sJ-100)kj=k;else break}   // 合流点の手前まで（通り過ぎて戻らない）
 for(let k=1;k<=kj;k++)go(B[k].clone().sub(cur()));
 /* ② 合流：その高さのまま真上まで行き、ドレンの上（＋間）へ上げ下げ */
 toXZ(J0.x,J0.z);go(new V(0,J0.y+off-cur().y,0));
 /* ③ ドレンに沿う（勾配・縦管もドレンと一緒） */
 for(let i=1;i<DP.length;i++){if(S[i]<=sJ+0.5||(iJ>=0&&i<=iJ))continue;if(S[i-1]>=sM)break;
  const t=S[i]>sM&&S[i]-S[i-1]>=1?(sM-S[i-1])/(S[i]-S[i-1]):1,p=DP[i-1].clone().lerp(DP[i],t);if(iJ>=0&&i<=iJ)continue;go(new V(p.x,p.y+off,p.z).sub(cur()));if(t<1)break}
 /* ④ 分かれる所：図面の冷媒の高さへ上げ下げしてから、残りは図面どおり */
 const rest=B.slice(m);if(rest.length){go(new V(0,rest[0].y-cur().y,0));toXZ(rest[0].x,rest[0].z);for(let i=1;i<rest.length;i++)go(rest[i].clone().sub(cur()))}
 return{PP,len:Math.round(sM-sJ),sJ:Math.round(sJ),iJ}}
function rjApply(){const R=st.rj;if(!R||!R.base||R.base.length<2)return null;const V=THREE.Vector3,B=R.base.map(a=>new V(a[0],a[1],a[2]));
 let PP=B,J=null;if(R.mode!=="sep"){J=rjJoin(B,R.mode==="tomo"?0:R.gap,R.from==null?"auto":R.from);if(J)PP=J.PP}R.len=J?J.len:0;
 const rows=polyToRows(PP).filter(r=>r.l>0);if(!rows.length)return null;st.rows=normRows(rows,[{l:1000,a:0,t:0,o:false}]);sel=0;save();render();if(T){build3D();T.dirty=true}return J}
/* 自動読み込みの後：図面で沿っていれば「全ねじの上・50mm」、沿っていなければ別ルート */
function rjInit(PP){const keep=st.rj&&st.rj.gap!=null?st.rj.gap:50;st.rj={mode:"sep",gap:keep,from:"auto",base:PP.map(p=>[Math.round(p.x),Math.round(p.y),Math.round(p.z)]),len:0};
 let J=null;try{J=rjJoin(PP,keep,"auto")}catch(e){console.warn(e)}if(J){st.rj.mode="rod";rjApply()}return st.rj}
/* ===== 🧱 壁のお手本：壁の中（2本の線の間）をタップ → その厚さ・色の壁を、画面に見えている範囲から全部取り込む ===== */
function planWallLearn(p,rg,quiet){const P=PLAN,mm=P.mmpp;
 const neu=c=>{const[r,g,b]=rgbOf(c);return Math.max(r,g,b)-Math.min(r,g,b)<24};   // 壁はグレーか黒の線（色付きの線は設備なので見ない）
 const L=P.segs.filter(s=>neu(s[4])).map(s=>{const dx=s[2]-s[0],dy=s[3]-s[1],l=Math.hypot(dx,dy);return{s,l,ux:dx/l,uy:dy/l}}).filter(o=>o.l*mm>=300);
 /* タップした所から、線に直角に左右を見て、いちばん近い平行な2本を探す */
 let best=null;
 for(const ang of[0,90]){const ux=ang?0:1,uy=ang?1:0,nx=-uy,ny=ux;let neg=null,pos=null;
  L.forEach(o=>{if(Math.abs(o.ux*uy-o.uy*ux)>0.03)return;const t0=(o.s[0]-p[0])*ux+(o.s[1]-p[1])*uy,t1=(o.s[2]-p[0])*ux+(o.s[3]-p[1])*uy;if(Math.min(t0,t1)>2||Math.max(t0,t1)<-2)return;
   const d=(o.s[0]-p[0])*nx+(o.s[1]-p[1])*ny;if(d<0&&(!neg||d>neg.d))neg={d,o};if(d>0&&(!pos||d<pos.d))pos={d,o}});
  if(neg&&pos){const t=(pos.d-neg.d)*mm;if(t>=50&&t<=600&&(!best||t<best.t))best={t,ang,col:pos.o.s[4],c2:neg.o.s[4]}}}
 if(!best){if(!quiet)toast("壁が見つかりませんでした。壁の2本の線の「間」をタップしてください");return 0}
 const t0=best.t,cols=new Set([best.col,best.c2]);
 /* 画面に見えている範囲 */
 const wr=$("#plWrap"),Wv=wr?wr.clientWidth:800,Hv=wr?wr.clientHeight:800;let vx0=(0-PV.ox)/PV.z,vy0=(0-PV.oy)/PV.z,vx1=(Wv-PV.ox)/PV.z,vy1=(Hv-PV.oy)/PV.z;if(rg)[vx0,vy0,vx1,vy1]=rg;const inV=(x,y)=>x>=vx0&&x<=vx1&&y>=vy0&&y<=vy1;
 const C=L.filter(o=>cols.has(o.s[4])&&o.l*mm>=500&&(Math.abs(o.ux)>0.999||Math.abs(o.uy)>0.999)&&(inV(o.s[0],o.s[1])||inV(o.s[2],o.s[3])));
 const found=[];
 C.forEach((A,i)=>{const hz=Math.abs(A.uy)<0.01,a0=hz?Math.min(A.s[0],A.s[2]):Math.min(A.s[1],A.s[3]),a1=hz?Math.max(A.s[0],A.s[2]):Math.max(A.s[1],A.s[3]),ca=hz?A.s[1]:A.s[0];
  C.forEach((B,j)=>{if(j<=i)return;const hz2=Math.abs(B.uy)<0.01;if(hz!==hz2)return;const cb=hz?B.s[1]:B.s[0],d=Math.abs(cb-ca)*mm;if(Math.abs(d-t0)>Math.max(25,t0*0.15))return;
   const b0=hz?Math.min(B.s[0],B.s[2]):Math.min(B.s[1],B.s[3]),b1=hz?Math.max(B.s[0],B.s[2]):Math.max(B.s[1],B.s[3]),lo=Math.max(a0,b0),hi=Math.min(a1,b1);if((hi-lo)*mm<500)return;
   found.push({hz,c:(ca+cb)/2,lo,hi})})});
 /* 同じ壁（仕上げの線が何本も重なる）をまとめる */
 const merged=[];found.sort((a,b)=>a.hz-b.hz||a.c-b.c||a.lo-b.lo).forEach(f=>{const m=merged.find(g=>g.hz===f.hz&&Math.abs(g.c-f.c)*mm<t0*0.6&&f.lo<=g.hi+200/mm&&f.hi>=g.lo-200/mm);if(m){m.lo=Math.min(m.lo,f.lo);m.hi=Math.max(m.hi,f.hi)}else merged.push({...f})});
 const add=[];merged.forEach(g=>{const a=g.hz?[g.lo,g.c]:[g.c,g.lo],b=g.hz?[g.hi,g.c]:[g.c,g.hi],A=btW(a),B=btW(b),t=Math.max(50,Math.round(t0/10)*10),o=btWall(A,B,t,0,false);if(!o)return;
  o.x=Math.round((A[0]+B[0])/2);o.z=Math.round((A[1]+B[1])/2);if(st.bld.concat(add).some(q=>q.k==="wall"&&Math.hypot(q.x-o.x,q.z-o.z)<Math.max(150,t*0.7)&&Math.abs(normT(q.r-o.r)%180)<5))return;add.push(o)});
 if(!add.length){if(!quiet)toast("この厚さ（"+fmt(t0)+"mm）の新しい壁は見つかりませんでした");return 0}
 btAdd(normBld(add));if(quiet)return add.length;wzRender();planDraw();toast("厚さ "+fmt(t0)+"mm の壁を "+add.length+"本 取り込みました（違う物は「消す」で消せます）");return add.length}

/* ===== 🤖 全部自動：縮尺 → 原点 → 壁（配管が通る壁の厚さをお手本に）→ 室内機・室外機・配管・穴 → 3D ===== */
function planFindInd(){const P=PLAN,BL=planClusters(isBlue),norm=s=>normTx(s).toUpperCase().replace(/[\s\-‐ー－]/g,""),models=Object.keys(CAS2M).map(k=>({k,n:norm(CAS2M[k].n)})).filter(m=>m.n.length>=6);
 for(const t of P.texts||[]){const nt=norm(t.s);if(nt.length<6)continue;const hit=models.find(m=>m.n===nt||(nt.length>=8&&(m.n.startsWith(nt)||nt.startsWith(m.n))));if(!hit)continue;
  const tx=t.x+t.w/2,ty=t.y-t.h/2,L=CAS2M[hit.k].L,c=BL.filter(c2=>tx>=c2.x0&&tx<=c2.x1&&ty>=c2.y0&&ty<=c2.y1&&Math.max(c2.w,c2.h)>=L*0.3&&Math.max(c2.w,c2.h)<=L*3.5).sort((a,b)=>a.w*a.h-b.w*b.h)[0];if(c)return{c,k:hit.k}}
 /* 品番が図面に書いてない時：青い四角のうち、室内機くらいの大きさ（500〜1200mm・ほぼ正方形）のものを拾い、
    いちばん近い大きさの4方向の機種を「仮」で置く（型番を全部入れなくてもよいように）。ほかは品番で探す */
 if(!P.mmpp)return null;
 const sq=BL.filter(c2=>{const big=Math.max(c2.w,c2.h),sm=Math.min(c2.w,c2.h);return big>=500&&big<=1200&&sm>=big*0.75&&c2.n>=4}).sort((a,b)=>b.w*b.h-a.w*a.h)[0];
 if(!sq)return null;
 const meas=Math.max(sq.w,sq.h),four=Object.keys(CAS2M).filter(k=>CAS2M[k].kind==="4方向"&&!CAS2M[k].bi&&CAS2M[k].L);
 if(!four.length)return null;
 const k=four.reduce((b,q)=>Math.abs(CAS2M[q].L-meas)<Math.abs(CAS2M[b].L-meas)?q:b,four[0]);
 return{c:sq,k,prov:true}}
/* 縮尺の確かめ：室内機の記号の大きさが、その機種の本体（パネル）とだいたい同じになるはず。大きく違えば、合う縮尺に直す */
function planScaleByUnit(I){const P=PLAN,m=CAS2M[I.k],meas=Math.max(I.c.w,I.c.h),ref=[m.L,m.W,m.pa||0,m.pb||0].filter(Boolean),ok=v=>ref.some(r=>v>=r*0.8&&v<=r*1.25);
 if(ok(meas))return false;const D=[20,25,30,40,50,60,75,80,100,120,150,200,250,300];if(!P.den)return false;
 const cand=D.map(d=>({d,v:meas*d/P.den})).filter(o=>ok(o.v)).map(o=>({...o,e:Math.min(...ref.map(r=>Math.abs(Math.log(o.v/r))))})).sort((a,b)=>a.e-b.e)[0];   // 機種の寸法にいちばん近くなる縮尺if(!cand)return false;
 if(P.userScale){toast("⚠️ 室内機の大きさが合いません。縮尺は 1/"+cand.d+" ではないですか？（縮尺を直してからもう一度）");return "ng"}
 const k=cand.d/P.den;P.mmpp*=k;P.den=cand.d;try{$("#plDen").value=String(cand.d)}catch(e){}try{planWalls()}catch(e){}try{wzSave()}catch(e){}
 toast("室内機の大きさから、縮尺を 1/"+cand.d+" に直しました");return true}
function planCanAuto(){const P=PLAN;if(!P)return false;const key=P.mmpp+"|"+(P.segs||[]).length;if(P._ca&&P._ca.k===key)return P._ca.v;let v=false;try{v=!!(P&&P.segs&&P.segs.length>50&&P.mmpp&&P.segs.some(s2=>isMag(s2[4]))&&planFindInd())}catch(e){}P._ca={k:key,v};return v}
function planAutoAll(){const P=PLAN;
 /* DXF：表示している種類・線だけで読む。空調を出していない時は、ダクト・衛生だけ3Dに出す */
 if(P&&P.dxf&&!P._flt&&window.dxfFilterRun){const vis=dxfVisible(P);if(!P.segs.some(s=>vis(s[5])&&dxfGrp(s[5])==="ac")){
   /* 原点がまだ無い時は、図面ぜんぶ（隠している線も）から室内機を探して、その真ん中を原点にする */
   if(!P.org){let I=null;try{I=planFindInd()}catch(e){}if(I){P.org=[Math.round(I.c.cx),Math.round(I.c.cy)];try{wzSave()}catch(e){}}else{toast("原点が決まっていません。「③ 原点」で基準の点をタップしてください");try{wzGo("org")}catch(e){}return null}}
   let D=null;try{D=planDrawLines()}catch(e){console.warn(e)}
   const hk=D?DL_KINDS.filter(([k])=>(D[k]&&D[k].length)||(D[k+"S"]&&D[k+"S"].length)):[];
   if(hk.length){st.dln=D;save();try{if(T){build3D();T.dirty=true}}catch(e){}toast("表示している "+hk.map(([k,n])=>n).join("・")+" だけを3Dに出しました")}else toast("空調・ダクト・衛生のどれかを表示してから押してください");return null}
  return dxfFilterRun(planAutoAll)}
 if(!P||!P.segs||P.segs.length<50){toast("線のデータがある図面（CADのPDF）で使えます。写真の図面は、縮尺と原点を手で決めてください");return}
 if(!P.mmpp){toast("縮尺が分かりませんでした。縮尺を選ぶか「縮尺を2点で」で合わせてから、もう一度押してください");try{wzGo("scale")}catch(e){}return}
 let I=planFindInd();if(!I){toast("室内機が見つかりませんでした（青い四角の記号が必要です）");return}
 if(I.prov)toast("図面に品番が無いので、仮の機種（"+CAS2M[I.k].n+"）で置きます。違えば機械の欄で機種を変えてください");
 {const r=planScaleByUnit(I);if(r==="ng"){try{wzGo("scale")}catch(e){}return}if(r)I=planFindInd()||I}
 if(!P.org){P.org=[Math.round(I.c.cx),Math.round(I.c.cy)];try{wzSave()}catch(e){}}
 const mm=P.mmpp,route=planPipeRoute([I.c.cx,I.c.cy]);
 /* （H鋼のまわりは機械的に囲わず、図面のボード＋スタッドの線を kzLgs で読む） */
 /* 壁：配管が横切るグレーの線のうち、間隔8〜45cmの2本＝壁。その厚さをお手本に、まわりの壁を取り込む */
 /* （古いやり方）軽量壁の読み取り（kzLgs）が使えない時・何も見つからない時だけ使う。天井ボードの割付線などを壁と間違えやすいため */
 let nw=0;const learnWalls=()=>{if(!(route&&route.length>=2))return;const xs=[...route.map(p=>p[0]),I.c.x0,I.c.x1],ys=[...route.map(p=>p[1]),I.c.y0,I.c.y1],pad=4500/mm,rg=[Math.min(...xs)-pad,Math.min(...ys)-pad,Math.max(...xs)+pad,Math.max(...ys)+pad];
  const neu=c=>{const[r,g,b]=rgbOf(c);return Math.max(r,g,b)-Math.min(r,g,b)<24},done=[];
  for(let i=0;i<route.length-1;i++){const a=route[i],b=route[i+1],hz=Math.abs(b[1]-a[1])<Math.abs(b[0]-a[0]),lo=hz?Math.min(a[0],b[0]):Math.min(a[1],b[1]),hi=hz?Math.max(a[0],b[0]):Math.max(a[1],b[1]),c=hz?a[1]:a[0];
   const cut=P.segs.filter(s2=>neu(s2[4])).filter(s2=>{const l=Math.hypot(s2[2]-s2[0],s2[3]-s2[1])*mm;if(l<800)return false;
     if(hz){if(Math.abs(s2[0]-s2[2])>1)return false;const y0=Math.min(s2[1],s2[3]),y1=Math.max(s2[1],s2[3]);return s2[0]>lo&&s2[0]<hi&&c>=y0&&c<=y1}
     if(Math.abs(s2[1]-s2[3])>1)return false;const x0=Math.min(s2[0],s2[2]),x1=Math.max(s2[0],s2[2]);return s2[1]>lo&&s2[1]<hi&&c>=x0&&c<=x1}).map(s2=>hz?s2[0]:s2[1]).sort((u,v)=>u-v);
   for(let j=0;j<cut.length-1;j++){const g=(cut[j+1]-cut[j])*mm;if(g<80||g>450)continue;if(done.some(t=>Math.abs(t-g)<25))continue;done.push(g);
    const m=(cut[j]+cut[j+1])/2,p=hz?[m,c]:[c,m];nw+=planWallLearn(p,rg,true)||0}}};
 const KZ=typeof kzLgs==="function";if(!KZ)learnWalls();
 P._kzOnly=KZ;P._mkHoles=null;P._dropOut=null;let r;try{r=planReadAll()}finally{P._kzOnly=false}
 let nd=0,nwn=0,nh=0;try{if(r&&typeof kzPlaceH==="function"){const n0=st.bld.filter(o=>o.k==="col").length,tst=window.toast;window.toast=()=>{};try{kzPlaceH()}finally{window.toast=tst}nh=st.bld.filter(o=>o.k==="col").length-n0}}catch(e){console.warn("hcol",e)}
 try{if(r&&typeof kzHEnclose==="function")kzHEnclose(true)}catch(e){console.warn("henc",e)}
let nl=0;try{if(r&&typeof kzLgs==="function")nl=kzLgs(true)}catch(e){console.warn("lgs",e)}
 /* 図面の軽量壁が読めたら、前の読み込みで置いた「印の無い壁」（天井ボードの線などを壁と間違えた物）を、その範囲から消す。読めなければ古いやり方で読む */
 let nrm=0;if(r&&KZ){const LG=st.bld.filter(o=>o.k==="wall"&&o.auto==="lgs");
  if(LG.length){const x0=Math.min(...LG.map(o=>o.x))-500,x1=Math.max(...LG.map(o=>o.x))+500,z0=Math.min(...LG.map(o=>o.z))-500,z1=Math.max(...LG.map(o=>o.z))+500,n0=st.bld.length;
   st.bld=st.bld.filter(o=>!(o.k==="wall"&&!o.auto&&o.m!=="lgs"&&o.x>=x0&&o.x<=x1&&o.z>=z0&&o.z<=z1));nrm=n0-st.bld.length;
   /* 古い壁が重なっていて置けなかった軽量壁があるので、消した後にもう一度読む */
   if(nrm){try{nl=kzLgs(true)}catch(e){console.warn("lgs2",e)}}}
  else{learnWalls()}
  /* 外壁など（軽量壁でない壁）：古いやり方で探し、軽量壁のまわり（外周）にある物だけ足す。部屋の中の物（天井ボードの線）は捨てる */
  if(typeof kzExtFilter==="function"&&st.bld.some(o=>o.auto==="lgs")){st.bld=st.bld.filter(o=>o.auto!=="ext");const n0=st.bld.length;nw=0;try{learnWalls()}catch(e){console.warn("ext",e)}
   /* 足した物は後ろに並ぶ（normBld で作り直されるので、物そのものではなく並び順で見分ける） */
   const NEW=st.bld.slice(n0).filter(o=>o.k==="wall"),keep=new Set(kzExtFilter(NEW));st.bld=st.bld.slice(0,n0).concat(st.bld.slice(n0).filter(o=>keep.has(o)));keep.forEach(o=>o.auto="ext");nw=keep.size;st.bld=normBld(st.bld)}
  /* 外壁が読めたので、室外機側は外壁を出てすぐ上げ下げするルートに直す */
  try{if(P._dropOut)P._dropOut()}catch(e){console.warn("dropout",e)}
  /* 配管の穴（スリーブ）を、今の壁で開け直す */
  try{if(P._mkHoles)P._mkHoles()}catch(e){console.warn("holes",e)}}
 /* 天井高の範囲：メインと違う「CH=2400」などの部屋に自動で置く（範囲の中の壁・ボード・スタッドはその高さで止まる） */
 let nc=0;try{if(r&&typeof kzCeilAuto==="function"){nc=kzCeilAuto();if(typeof kzFixMainCH==="function")kzFixMainCH()}}catch(e){console.warn("ceil",e)}
 try{if(r&&typeof kzDoors==="function")nd=kzDoors(true)}catch(e){console.warn("doors",e)}try{if(r&&typeof kzWindows==="function")nwn=kzWindows(true)}catch(e){console.warn("win",e)}
 /* 点検口（室内機の近くの、機器の色の 300〜600角の四角）と、図面の配管・ダクト（3Dに出して種類ごとに表示・非表示） */
 let ni=0,ndl="",neq=[];if(r){try{ni=planAutoIns(I)}catch(e){console.warn("ins",e)}try{neq=planAutoEquip(r)}catch(e){console.warn("eq",e)}
  try{const D=planDrawLines&&planDrawLines();const hk=D?DL_KINDS.filter(([k])=>(D[k]&&D[k].length)||(D[k+"S"]&&D[k+"S"].length)):[];if(hk.length){st.dln=D;ndl=hk.map(([k,n])=>n).join("・");save()}}catch(e){console.warn("dl",e)}
  try{if(T){build3D();T.dirty=true}else if(typeof dlBar==="function")dlBar()}catch(e){}}
 if(r&&typeof yomiCheck==="function")setTimeout(()=>{try{yomiCheck(r,{nw,nh,nl,nc,nd,nwn,ni,neq,ndl})}catch(e){console.warn("yomi",e)}},400);   // 📋 読み取りチェック（yomi.js）
 else if(r){setTimeout(()=>toast("全部自動で読みました：室内機 "+r.ind+"・天井 "+fmt(r.CH)+(r.out?"・室外機 "+fmt(r.out[0])+"×"+fmt(r.out[1]):"")+"・配管 FL+"+(r.pipeH||"?")+"・壁 "+nw+"本"+(nh?"・H鋼の柱 "+nh+"本":"")+(nl?"・軽量壁 "+nl+"枚":"")+(nrm?"（前の読み込みの壁 "+nrm+"枚は消しました）":"")+(nc?"・天井高の範囲 "+st.bld.filter(o=>o.k==="ceil"&&o.auto==="ch").map(o=>(o.n||"")+"CH"+fmt(o.h)).join("/"):"")+(nd?"・扉 "+nd+"か所":"")+(nwn?"・窓 "+nwn+"か所":"")+(ni?"・点検口 "+ni+"個":"")+(neq.length?"・機器 "+neq.join("・"):"")+(ndl?"・図面の"+ndl:"")+"。違う所は図面画面で直せます"),400)}
 return r}

/* 読み込み終わったら、建物・図面・スキャンを3Dに出し直す */
if(T){build3D();T.dirty=true}
if(window.zUpFloor)window.zUpFloor();
