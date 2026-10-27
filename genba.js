/* 📋 現場：現場カード（日時・現場名・住所・駐車場・メンバー⭐・作業内容…）と、LINEに送る文章
   データはこのiPhoneの中（IndexedDB「genba」）。sites＝現場1件ずつ（id つき）、photos＝写真（縮めたJPEG）。
   あとでネットに保存する（販売する）時も、この形のまま送れるようにしておく。バックアップの書き出し・読み込みつき */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
let toastT=0;function toast(m){let t=$(".toast");if(!t){t=document.createElement("div");t.className="toast";document.body.appendChild(t)}t.textContent=m;t.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>t.hidden=true,Math.min(6000,1800+m.length*40))}

/* ===== 保存（IndexedDB） ===== */
let dbP=null;
function db(){if(!dbP)dbP=new Promise((ok,ng)=>{const o=indexedDB.open("genba",1);o.onupgradeneeded=()=>{const d=o.result;if(!d.objectStoreNames.contains("sites"))d.createObjectStore("sites",{keyPath:"id"});if(!d.objectStoreNames.contains("photos"))d.createObjectStore("photos",{keyPath:"id"})};o.onsuccess=()=>ok(o.result);o.onerror=()=>ng(o.error)});return dbP}
async function dbDo(store,mode,fn){const d=await db();return new Promise((ok,ng)=>{const tx=d.transaction(store,mode),st=tx.objectStore(store);let r;try{r=fn(st)}catch(e){ng(e);return}tx.oncomplete=()=>ok(r&&"result"in r?r.result:undefined);tx.onerror=()=>ng(tx.error);tx.onabort=()=>ng(tx.error)})}
const allSites=()=>dbDo("sites","readonly",s=>s.getAll());
const getSite=id=>dbDo("sites","readonly",s=>s.get(id));
const putSite=x=>dbDo("sites","readwrite",s=>s.put(x));
const delSite=id=>dbDo("sites","readwrite",s=>s.delete(id));
const getPhoto=id=>dbDo("photos","readonly",s=>s.get(id));
const putPhoto=x=>dbDo("photos","readwrite",s=>s.put(x));
const delPhoto=id=>dbDo("photos","readwrite",s=>s.delete(id));

function newSite(){const d=new Date();d.setDate(d.getDate()+1);const ymd=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
 return {id:rid("s"),v:1,created:Date.now(),updated:Date.now(),date:ymd,time:"08:00",name:"",addr:"",park:{note:"",lat:null,lng:null,url:"",photos:[]},members:[],work:"",bring:"",provided:"",borrow:"",plan:"",memo:""}}

/* よく使う名前（メンバーをタップで足す用） */
function people(add){let a=[];try{a=JSON.parse(localStorage.getItem("genba_people")||"[]")}catch(e){}if(add){a=[add].concat(a.filter(x=>x!==add)).slice(0,40);try{localStorage.setItem("genba_people",JSON.stringify(a))}catch(e){}}return a}

/* ===== 地図のリンク・日付 ===== */
const mapQ=q=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q);
const addrUrl=a=>a.trim()?mapQ(a.trim()):"";
function parkUrl(p){if(p.lat!=null&&p.lng!=null)return mapQ(`${p.lat},${p.lng}`);return (p.url||"").trim()}
function parseMapUrl(u){ // 貼ったGoogleマップのリンクから緯度経度を取る（取れない短いリンクはそのまま使う）
 const m=u.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/)||u.match(/[?&](?:q|query|ll|center|destination)=(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/)||u.match(/^\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
 return m?{lat:+(+m[1]).toFixed(6),lng:+(+m[2]).toFixed(6)}:null}
const WD="日月火水木金土";
function dateTxt(s){if(!s)return "";const [y,m,d]=s.split("-").map(Number);if(!y)return s;return `${m}月${d}日(${WD[new Date(y,m-1,d).getDay()]})`}
const timeTxt=t=>t?String(+t.slice(0,2))+":"+t.slice(3,5):"";
const lines=s=>String(s||"").split(/\r?\n/).map(x=>x.replace(/\s+$/,"")).filter(x=>x.trim());

/* ===== LINEに送る文章 ===== */
function lineText(s){
 const L=[],SEP="━━━━━━━━━━━━",d=dateTxt(s.date);
 L.push("お疲れ様です🙇‍♂️",`${d?d+"の":""}現場の詳細です。`,"",SEP);
 const sec=(head,body)=>{if(body.length){L.push(head,...body,"")}};
 sec("📅 日時",d||s.time?[`${s.days&&s.days.length>1?daysTxt(s.days):d+(endOf(s)>s.date?"〜"+dateTxt(endOf(s)):"")}${s.time?" "+timeTxt(s.time)+(s.tend?"〜"+timeTxt(s.tend):" 開始"):""}${(shIco(s)?"（"+shTx(s).replace(/^[☀️🌙]+/u,"")+"）":"")}`.trim()]:[]);
 sec("🏭 現場名",s.name.trim()?[s.name.trim()]:[]);
 sec("📍 住所",s.addr.trim()?[s.addr.trim(),addrUrl(s.addr)]:[]);
 const pu=parkUrl(s.park),pb=[...lines(s.park.note)];if(pu)pb.push(pu);if(s.park.photos.length)pb.push("（駐車場の写真を別で送ります📷）");sec("🅿️ 駐車場",pb);
 const mem=s.members.filter(m=>m.n.trim()),hp=helps(s);if(mem.length||hp.length){const b=mem.map(m=>"＊"+m.n.trim()+(m.star?" ⭐":"")+(m.d?`（${m.d.map(x=>+x.slice(8)+"日").join("・")}）`:""));hp.forEach(h=>b.push(`＊応援：${h.co.trim()||"（会社名なし）"} ${+h.n||0}名`));if(mem.some(m=>m.star))b.push("⭐＝現調に行った人（分からない事はこの人に）");sec("👷 メンバー",b)}
 if(L[L.length-1]==="")L.pop();L.push(SEP,"");
 const it=x=>/^[\s　]*(→|↑|※|・|＊|\*)/.test(x)?x.replace(/^[\s　]*(→|↑)/,"　$1").replace(/^[\s　]*\*/,"＊"):"＊"+x.trim(); // 1行ずつ＊。→・↑・※で始まる行はそのまま（前の行の続き）
 sec("🔧 作業内容",lines(s.work).map(it));
 sec("🎒 持ち物・服装",[...lines(s.bring).map(it),...lines(s.provided).map(x=>/^[\s　]*※/.test(x)?x.trim():"※"+x.trim())]);
 sec("🔌 道具について",lines(s.borrow));
 sec("⏰ 当日の予定",lines(s.plan));
 if(L[L.length-1]==="")L.pop();
 if(L[L.length-1]!==SEP)L.push(SEP);
 L.push("","よろしくお願い致します🙏");
 return L.join("\n");
}

/* ===== Googleカレンダー（予定を追加の画面を開くだけ。ログインや設定は要らない） ===== */
function calUrl(s){
 const ymd=(s.date||"").replace(/-/g,"");if(!ymd)return "";
 let dates;
 if(s.time){const [h,mi]=s.time.split(":").map(Number);const st=new Date(+ymd.slice(0,4),+ymd.slice(4,6)-1,+ymd.slice(6,8),h,mi),en=new Date(st.getTime()+9*3600e3);const f=x=>`${x.getFullYear()}${String(x.getMonth()+1).padStart(2,"0")}${String(x.getDate()).padStart(2,"0")}T${String(x.getHours()).padStart(2,"0")}${String(x.getMinutes()).padStart(2,"0")}00`;dates=f(st)+"/"+f(en)}
 else{const n=new Date(+ymd.slice(0,4),+ymd.slice(4,6)-1,+ymd.slice(6,8)+1);dates=ymd+"/"+`${n.getFullYear()}${String(n.getMonth()+1).padStart(2,"0")}${String(n.getDate()).padStart(2,"0")}`}
 const q=new URLSearchParams({action:"TEMPLATE",text:s.name.trim()||"現場",dates,ctz:"Asia/Tokyo",location:s.addr.trim(),details:lineText(s).slice(0,1500)});
 return "https://calendar.google.com/calendar/render?"+q.toString();
}

/* ===== 送る・コピー ===== */
async function shareText(t){
 if(navigator.share){try{await navigator.share({text:t});return}catch(e){if(e&&e.name==="AbortError")return}}
 copyText(t);
}
async function copyText(t){try{await navigator.clipboard.writeText(t);toast("コピーしました。LINEに貼り付けてください")}catch(e){toast("コピーできませんでした")}}
async function shareFiles(files,title){
 try{if(navigator.canShare&&navigator.canShare({files})){await navigator.share({files,title});return}}catch(e){if(e&&e.name==="AbortError")return}
 for(const f of files){const a=document.createElement("a");a.href=URL.createObjectURL(f);a.download=f.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},3000)}
}

/* ===== 写真：長い辺 1600px の JPEG に縮めて保存 ===== */
function shrink(file){return new Promise((ok,ng)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const k=Math.min(1,1600/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement("canvas");c.width=Math.round(im.naturalWidth*k);c.height=Math.round(im.naturalHeight*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(b=>b?ok(b):ng(new Error("写真を読めませんでした")),"image/jpeg",.85)};im.onerror=()=>{URL.revokeObjectURL(u);ng(new Error("写真を読めませんでした"))};im.src=u})}

/* ===== 画面 ===== */
let cur=null,saveT=0,wk=null,backTo="",pPer="";const urls=[];
function freeUrls(){while(urls.length)URL.revokeObjectURL(urls.pop())}
function save(){if(!cur)return;cur.updated=Date.now();clearTimeout(saveT);saveT=setTimeout(()=>putSite(cur).catch(()=>toast("保存できませんでした")),300)}
function go(id){location.hash=id?"#"+id:"";}
window.addEventListener("hashchange",route);
async function route(){clearTimeout(saveT);if(cur)await putSite(cur).catch(()=>{});const id=location.hash.slice(1);if(id==="list"){cur=null;renderList();return}if(id==="people"){cur=null;renderPeople();return}if(id[0]==="p"&&id.length>1){cur=null;try{pName=decodeURIComponent(id.slice(1))}catch(e){pName=""}renderPerson();return}if(/^ky?\d{4}-\d\d-\d\d$/.test(id)){cur=null;const y=id[1]==="y";renderKosu(id.slice(y?2:1),y);return}if(/^w\d{4}-\d\d-\d\d$/.test(id)){cur=null;wk=monday(id.slice(1));renderWeek();return}if(id){const s=await getSite(id);if(s){cur=s;renderEdit();return}}cur=null;renderMenu()}
/* 📋 現場のはじめの画面：現場一覧・週の割り振り・個人情報から選ぶ（2026-10-27 ユーザー：いきなり現場を出さずに選ばせて） */
async function renderMenu(){
 freeUrls();document.querySelector(".bar")?.remove();const ss=await allSites(),C=cal(),t=ymdOf(new Date()),now=ss.filter(s=>onDay(s,t)).length;
 const big=(id,ico,h,sub)=>`<button class="site" id="${id}" style="padding:16px 14px"><b style="font-size:19px">${ico} ${h}</b><div class="sub">${sub}</div></button>`;
 $("#app").innerHTML=`<h1><span class="grow">📋 現場</span></h1>
 ${big("mList","📋","現場一覧",`現場カード ${ss.length}件${now?`・今日の現場 ${now}件`:""}（日時・住所・駐車場・メンバー・LINEに送る）`)}
 ${big("mWeek","📅","週の割り振り","だれがどこ・休み・応援・人数・残業・📊人工")}
 ${big("mPeople","👤","個人情報",`${(()=>{const k=[...C.staff,...C.helpers].filter(n=>hcSt((C.prof[n]||{}).hc).c==="ng").length;return k?`<b style="color:var(--danger)">🩺 健康診断の更新が必要：${k}人</b><br>`:""})()}社員 ${C.staff.length}人・応援さん ${C.helpers.length}人（名前・ふりがな・生年月日・電話・緊急連絡先・資格証・交通費のまとめ）`)}
 <button class="btn" id="mStat" style="width:100%;margin:6px 0 10px;background:#ecfdf5;border-color:#a7f3d0;color:#065f46">👀 見た人を確認（チームに送った現場）</button>
 <div class="card"><h2>💾 バックアップ</h2><div class="note">現場のデータ・個人情報はこのiPhoneの中だけにあります。時々「書き出す」でファイルに残してください（写真も入ります）。</div>
 <div class="row" style="margin-top:8px"><button class="btn grow" id="bExp">書き出す</button><button class="btn grow" id="bImp">読み込む</button></div><input type="file" id="fImp" accept=".json,application/json" hidden></div>`;
 $("#mList").onclick=()=>go("list");$("#mWeek").onclick=()=>{backTo="";go("w"+monday())};$("#mPeople").onclick=()=>go("people");
 $("#mStat").onclick=()=>{if(window.__TM&&__TM.openStatus)__TM.openStatus();else toast("少し待ってからもう一度押してください")};
 $("#bExp").onclick=exportAll;$("#bImp").onclick=()=>$("#fImp").click();$("#fImp").onchange=e=>{const f=e.target.files[0];e.target.value="";if(f)importAll(f)};
}
/* 社員⇄応援さんを移す（入れまちがえた時）。個人情報（C.prof）はそのまま */
function moveKind(n,to){const C=cal();if(to==="h"){C.staff=C.staff.filter(x=>x!==n);if(!C.helpers.includes(n))C.helpers.push(n);if(C.pin)C.pin=C.pin.filter(x=>x!==n)}else{C.helpers=C.helpers.filter(x=>x!==n);if(!C.staff.includes(n))C.staff.push(n)}calSave(C)}
/* 👤 個人情報：社員の一覧（📌・順番は週の割り振りと同じ）。タップでその人のページ（個人情報・緊急連絡先・資格証・人工・残業・交通費） */
function renderPeople(){
 freeUrls();document.querySelector(".bar")?.remove();const C=cal();
 $("#app").innerHTML=`<h1><button class="btn sm" id="bBack">← 現場メニュー</button><span class="grow"></span></h1>
 <button class="btn pri" id="bCImp" style="width:100%;margin:0 0 8px">📇 スマホの連絡帳から読み込む（確かめてから入れる）</button><input type="file" id="fCImp" accept=".vcf,text/vcard,text/x-vcard" multiple hidden>
 <div class="card"><h2>👤 個人情報（社員）</h2>
  <label class="f" for="fMyco">🏢 会社名（屋号）・従業員の数</label><div class="row" style="margin:0 0 6px;gap:6px"><input id="fMyco" placeholder="自分の会社名（例：小川設備）" value="${esc(C.myco)}" class="grow"><input id="fMyEmp" type="number" inputmode="numeric" placeholder="従業員" value="${(C.coInfo[C.myco]||{}).emp||""}" style="width:80px"><span class="note">人</span></div>
  <div class="note">名前をタップ → 個人情報・緊急連絡先・資格証の写真・タグ、その人の人工・残業・交通費。ここに入れた人が週の割り振りの表に出ます。</div>
  <div id="staff">${ordNames(C,C.staff).map(n=>{const p=C.prof[n]||{},nl=(p.lic||[]).length,em=p.em||{};return `<div class="prow"><button class="site" data-pp="${esc(n)}"><b>${(C.pin||[]).includes(n)?"📌":""}${esc(n)}</b>${p.nick?` <span class="sub">「${esc(p.nick)}」</span>`:""}${p.kana?` <span class="sub">${esc(p.kana)}</span>`:""}${ageOf(p.birth)!==""?` <span class="sub">${ageOf(p.birth)}歳</span>`:""}
   ${p.role?` <span class="role">${esc(p.role)}</span>`:""}${(p.trades||[]).length?`<div class="sub">${(p.trades||[]).map(t=>"🔧"+esc(t.n)+(t.since&&expOf(t.since)?" "+expOf(t.since):"")).join(" ")}</div>`:""}<div class="sub">${p.tel?"📞 "+esc(p.tel)+" ":""}${em.n||em.tel?"🚑 緊急連絡先あり ":""}${nl?"📜 資格 "+nl+"件":""}${!p.tel&&!(em.n||em.tel)&&!nl?"まだ入っていません":""}</div><div>${tagHtml(tagsOf(C,n))}</div>${hcSt(p.hc).c?`<div class="need ${hcSt(p.hc).c}" style="font-size:12.5px">${esc(hcSt(p.hc).c==="ng"?"🩺 健康診断の更新が必要（1年過ぎ）":hcSt(p.hc).t)}</div>`:""}</button><button class="btn sm mv" data-mv="${esc(n)}" data-to="h">→ 🤝<br>応援へ</button></div>`}).join("")||`<span class="note">まだいません。下で名前を入れてください。</span>`}</div>
  <div class="row" style="margin-top:8px"><input id="fStaff" placeholder="名前（例：服部）" enterkeyhint="done"><button class="btn pri" id="bStaff">追加</button></div>
  <div class="chips" id="sugg">${[...new Set(people().map(baseNm))].filter(n=>n&&!C.staff.includes(n)&&!C.helpers.includes(n)).slice(0,20).map(n=>`<button class="chip" data-as="${esc(n)}">＋ ${esc(n)}</button>`).join("")}</div>
  <button class="btn" id="bPImp" style="width:100%;margin-top:8px">📥 受け取った人を入れる</button><input type="file" id="fPImp" accept=".json,application/json" hidden>
  <button class="btn" id="bVcfAll" style="width:100%;margin-top:8px">📇 社員みんなをスマホの連絡先に入れる</button></div>
 <div class="card"><h2>🤝 応援さん</h2><div class="note">ほかの会社から来てくれる人。名前をタップ → 会社名・電話・緊急連絡先・資格証など（社員と同じ）。現場に入れると週の割り振りの表に「（応援）」で出て、人工・交通費も数えます。</div>
  <div id="helpers">${(()=>{const G=new Map();for(const n of C.helpers){const k=((C.prof[n]||{}).co||"").trim();if(!G.has(k))G.set(k,[]);G.get(k).push(n)}   /* 会社ごと（会社名＝その人の「会社名（屋号）」）。会社名なしは下 */
   return [...G.keys()].sort((a,b)=>(!a)-(!b)||a.localeCompare(b,"ja")).map(k=>`<div class="row" style="margin:10px 0 4px"><b class="grow">🏢 ${k?esc(k):"会社名なし"}（登録 ${G.get(k).length}人）</b>${k?`<button class="btn sm" data-addco="${esc(k)}">＋ この会社に足す</button>`:""}</div>
   ${k?`<div class="row" style="margin:0 0 4px;gap:6px"><span class="note">従業員の数</span><input data-emp="${esc(k)}" type="number" inputmode="numeric" placeholder="—" value="${(C.coInfo[k]||{}).emp||""}" style="width:80px"><span class="note">人</span></div>`:""}
   ${G.get(k).map(n=>{const p=C.prof[n]||{},nl=(p.lic||[]).length,em=p.em||{};return `<div class="prow"><button class="site" data-pp="${esc(n)}"><b>${esc(n)}</b>${p.role?` <span class="role">${esc(p.role)}</span>`:""}${p.nick?` <span class="sub">「${esc(p.nick)}」</span>`:""}${p.kana?` <span class="sub">${esc(p.kana)}</span>`:""}
    <div class="sub">${p.tel?"📞 "+esc(p.tel)+" ":""}${em.n||em.tel?"🚑 緊急連絡先あり ":""}${nl?"📜 資格 "+nl+"件":""}${!p.tel&&!(em.n||em.tel)&&!nl?"まだ入っていません":""}</div>${hcSt(p.hc).c?`<div class="need ${hcSt(p.hc).c}" style="font-size:12.5px">${esc(hcSt(p.hc).c==="ng"?"🩺 健康診断の更新が必要（1年過ぎ）":hcSt(p.hc).t)}</div>`:""}</button><button class="btn sm mv" data-mv="${esc(n)}" data-to="s">→ 👤<br>社員へ</button></div>`}).join("")}`).join("")})()||`<span class="note">まだいません。下で会社名と名前を入れてください。</span>`}</div>
  <label class="f" for="fHco" style="margin-top:10px">会社名（屋号）</label><input id="fHco" placeholder="例：〇〇設備" list="coList">
  <datalist id="coList">${[...new Set(C.helpers.map(n=>((C.prof[n]||{}).co||"").trim()).filter(Boolean))].map(x=>`<option value="${esc(x)}">`).join("")}</datalist>
  <div class="row" style="margin-top:6px"><input id="fHelper" placeholder="名前（例：田中）" enterkeyhint="done"><button class="btn pri" id="bHelper">追加</button></div></div>
 <div class="note" style="margin:0 4px">個人情報はこのiPhoneの中だけに残ります（現場メニューの「💾 バックアップ」で書き出しに入ります）。</div>`;
 $("#bBack").onclick=()=>go("");
 const add=v=>{v=baseNm(v||"");if(!v)return;const C2=cal();if(!C2.staff.includes(v))C2.staff.push(v);calSave(C2);backTo="people";go("p"+encodeURIComponent(v))};   // 足したらすぐ、その人のページで入れる
 $("#bStaff").onclick=()=>add($("#fStaff").value);$("#fStaff").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();add($("#fStaff").value)}};
 $("#sugg").onclick=e=>{const b=e.target.closest("[data-as]");if(b)add(b.dataset.as)};
 $("#staff").onclick=$("#helpers").onclick=e=>{const m=e.target.closest("[data-mv]");if(m){moveKind(m.dataset.mv,m.dataset.to);renderPeople();toast(m.dataset.to==="h"?"応援さんへ移しました":"社員へ移しました");return}
  const c=e.target.closest("[data-addco]");if(c){$("#fHco").value=c.dataset.addco;$("#fHelper").scrollIntoView({behavior:"smooth",block:"center"});setTimeout(()=>$("#fHelper").focus(),350);return}
  const b=e.target.closest("[data-pp]");if(b){backTo="people";go("p"+encodeURIComponent(b.dataset.pp))}};
 const addH=v=>{v=baseNm(v||"");if(!v)return;const C2=cal();if(C2.staff.includes(v)){toast("社員に同じ名前の人がいます");return}if(!C2.helpers.includes(v))C2.helpers.push(v);const co=$("#fHco").value.trim();if(co)prof(C2,v).co=co;calSave(C2);backTo="people";go("p"+encodeURIComponent(v))};
 $("#bHelper").onclick=()=>addH($("#fHelper").value);$("#fHelper").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();addH($("#fHelper").value)}};
 $("#bPImp").onclick=()=>$("#fPImp").click();$("#fPImp").onchange=e=>{const f=e.target.files[0];e.target.value="";if(f)importAll(f)};
 $("#fMyco").onchange=e=>{const C2=cal(),old=C2.myco,v=e.target.value.trim();if(old&&C2.coInfo[old]&&!C2.coInfo[v])C2.coInfo[v]=C2.coInfo[old];C2.myco=v;calSave(C2);toast("会社名を入れました")};
 $("#fMyEmp").oninput=e=>{const C2=cal(),k=C2.myco||"";(C2.coInfo[k]=C2.coInfo[k]||{}).emp=Math.max(0,parseInt(e.target.value)||0);calSave(C2)};
 $("#helpers").oninput=e=>{const t=e.target;if(t.dataset.emp==null)return;const C2=cal();(C2.coInfo[t.dataset.emp]=C2.coInfo[t.dataset.emp]||{}).emp=Math.max(0,parseInt(t.value)||0);calSave(C2)};
 $("#bCImp").onclick=pickContacts;$("#fCImp").onchange=async e=>{const fs=[...e.target.files];e.target.value="";let a=[];for(const f of fs)a=a.concat(parseVcf(await f.text()));reviewContacts(a)};
 $("#bVcfAll").onclick=()=>{if(!C.staff.length){toast("社員がいません");return}addContacts(ordNames(C,C.staff))};
}
/* 📇 スマホの連絡帳から読み込む：アンドロイド（連絡先を選ぶ画面がある時）は選んだ人、無い時（iPhone）は連絡先のファイル（.vcf）を選ぶ。
   読んだ後に「確かめて入れる」画面：社員／応援さん・名前などを直して、足りない所（ふりがな・電話・誕生日・緊急連絡先・職種）を見せる。同じ名前の人がいる時は空いている所だけ入れる */
function vUnesc(v){return String(v).replace(/\\n/gi,"\n").replace(/\\([,;\\])/g,"$1").trim()}
function parseVcf(t){const L=String(t).replace(/\r\n|\r/g,"\n").replace(/\n[ \t]/g,"").split("\n"),out=[];let c=null;
 for(const ln of L){const i=ln.indexOf(":");if(i<0)continue;const k0=ln.slice(0,i),v=ln.slice(i+1),k=k0.toUpperCase().replace(/^ITEM\d+\./,""),key=k.split(";")[0];
  if(key==="BEGIN"){c={tels:[]};continue}if(!c)continue;if(key==="END"){out.push(c);c=null;continue}
  if(key==="FN")c.fn=vUnesc(v);else if(key==="N"){const a=v.split(";").map(vUnesc);c.n=((a[0]||"")+" "+(a[1]||"")).trim()}
  else if(key==="X-PHONETIC-LAST-NAME")c.kl=vUnesc(v);else if(key==="X-PHONETIC-FIRST-NAME")c.kf=vUnesc(v);else if(key==="SORT-STRING"&&!c.kl)c.kl=vUnesc(v);
  else if(key==="NICKNAME")c.nick=vUnesc(v);else if(key==="ORG")c.co=vUnesc(v.split(";")[0]);else if(key==="TITLE")c.role=vUnesc(v);
  else if(key==="TEL")c.tels.push({v:vUnesc(v),cell:/CELL|IPHONE|MOBILE/.test(k)});
  else if(key==="BDAY"){const m=v.replace(/-/g,"").match(/^(\d{4})(\d{2})(\d{2})/);if(m&&m[1]!=="1604")c.birth=`${m[1]}-${m[2]}-${m[3]}`}}   // 年の無い誕生日（iPhone）は入れない
 return out.map(c=>({name:(c.fn||c.n||"").replace(/\s+/g," ").trim(),kana:[c.kl,c.kf].filter(Boolean).join(" "),nick:c.nick||"",co:c.co||"",role:c.role||"",tel:((c.tels.find(t=>t.cell)||c.tels[0])||{}).v||"",birth:c.birth||""})).filter(o=>o.name)}
async function pickContacts(){
 if(navigator.contacts&&navigator.contacts.select){try{const props=await navigator.contacts.getProperties().catch(()=>["name","tel"]),r=await navigator.contacts.select(props.filter(x=>["name","tel"].includes(x)),{multiple:true});
   reviewContacts(r.map(o=>({name:((o.name||[])[0]||"").trim(),kana:"",nick:"",co:"",role:"",tel:(o.tel||[])[0]||"",birth:""})).filter(o=>o.name));return}catch(e){if(e&&e.name==="AbortError"||e&&e.name==="InvalidStateError")return}}
 const ios=/iPhone|iPad|iPod/.test(navigator.userAgent),ov=document.createElement("div");ov.className="sheet";ov.innerHTML=`<div class="sbox" style="max-height:88vh"><h2>📇 連絡帳から読み込む</h2>
 ${ios?`<div class="note" style="color:var(--ink)"><b>① 連絡先から直接選ぶ（おすすめ・初めの1回だけ設定）</b><br>iPhoneは、そのままでは連絡先を開けない作りです。iPhoneの設定で次をオンにすると、このボタンで連絡先の一覧が開いて選べるようになります。<br>
  <b>設定 → アプリ → Safari → 詳細 → 機能フラグ →「Contact Picker API」をオン</b><br>（古いiPhoneは「設定 → Safari → 詳細 → 機能フラグ」）<br>オンにしたら、このアプリを閉じて開き直し、もう一度「📇 スマホの連絡帳から読み込む」を押してください。</div>
 <div class="note" style="color:var(--ink);border-top:1px solid var(--line);padding-top:8px"><b>② ファイルで入れる</b>（設定を変えたくない時）<br>1. <b>先に</b>連絡先のアプリで入れたい人を開く → 下の「連絡先を送信」→「"ファイル"に保存」<br>2. このアプリに戻って、下のボタン → 保存したファイル（名前.vcf）を選ぶ<br>※ ファイルを保存していないと、ボタンを押しても「最近使った項目なし」と出ます。</div>`
 :`<div class="note" style="color:var(--ink)">このスマホでは連絡先の一覧を開けませんでした。連絡先のアプリ → 人を選ぶ → 共有 →「ファイルに保存」（.vcf）してから、下のボタンで選んでください。</div>`}
 <button class="btn pri" data-f="1">📂 連絡先のファイルを選ぶ</button><button class="btn" data-x="1">閉じる</button></div>`;
 document.body.appendChild(ov);ov.onclick=e=>{const b=e.target.closest("button");if(e.target===ov||(b&&b.dataset.x)){ov.remove();return}if(b&&b.dataset.f){ov.remove();$("#fCImp").click()}}}
function reviewContacts(a){if(!a.length){toast("連絡先が読めませんでした");return}const C=cal(),ov=document.createElement("div");ov.className="sheet";
 a.forEach(o=>{o.on=true;o.k=o.co&&C.myco&&o.co.trim()!==C.myco.trim()?"h":"s";o.ex=C.staff.includes(o.name)||C.helpers.includes(o.name)});
 const miss=o=>{const p=o.ex?(C.prof[o.name]||{}):{},em=p.em||{},m=[];if(!(o.kana||p.kana))m.push("ふりがな");if(!(o.tel||p.tel))m.push("電話");if(!(o.birth||p.birth))m.push("生年月日");if(!(em.n||em.tel))m.push("緊急連絡先");if(!(p.trades||[]).length)m.push("職種・経験");if(o.k==="h"&&!(o.co||p.co))m.push("会社名");return m};
 const draw=()=>{ov.innerHTML=`<div class="sbox" style="max-height:88vh"><h2>📇 確かめて入れる（${a.length}人）</h2><div class="note">入れない人はチェックを外す。社員か応援さんかを選んで、名前などを直してください。<b style="color:var(--danger)">赤い字</b>は、入れた後にその人のページで足してほしい所です。</div>
  ${a.map((o,i)=>`<div style="border-top:1px solid var(--line);padding:8px 0;${o.on?"":"opacity:.45"}"><div class="row"><label style="display:flex;align-items:center;gap:6px;flex:1"><input type="checkbox" style="width:auto" data-on="${i}" ${o.on?"checked":""}><b>${esc(o.name)}</b></label>
   <select data-k="${i}" style="width:auto"><option value="s" ${o.k==="s"?"selected":""}>👤 社員</option><option value="h" ${o.k==="h"?"selected":""}>🤝 応援さん</option></select></div>${o.ex?`<div class="note">（もう入っています → 空いている所だけ足します）</div>`:""}
   <div class="row" style="flex-wrap:wrap;gap:4px;margin-top:4px">${[["name","名前"],["kana","ふりがな"],["nick","ニックネーム"],["role","役職"],["tel","電話"]].concat(o.k==="h"?[["co","会社名"]]:[]).map(([f,t])=>`<input data-i="${i}" data-fd="${f}" value="${esc(o[f]||"")}" placeholder="${t}" style="flex:1 1 45%;min-width:0;font-size:15px;padding:7px 8px">`).join("")}
    <input data-i="${i}" data-fd="birth" type="date" value="${esc(o.birth||"")}" style="flex:1 1 45%;min-width:0;font-size:15px;padding:7px 8px"></div>
   ${miss(o).length?`<div class="note" style="color:var(--danger)">足りない所：${miss(o).join("・")}</div>`:`<div class="note" style="color:#15803d">そろっています</div>`}</div>`).join("")}
  <button class="btn pri" data-go="1">✅ チェックした ${a.filter(o=>o.on).length}人 を入れる</button><button class="btn" data-x="1">やめる</button></div>`};
 draw();document.body.appendChild(ov);
 ov.onchange=e=>{const t=e.target;if(t.dataset.on!=null){a[+t.dataset.on].on=t.checked;draw()}else if(t.dataset.k!=null){a[+t.dataset.k].k=t.value;draw()}else if(t.dataset.fd){const o=a[+t.dataset.i];o[t.dataset.fd]=t.value.trim();if(t.dataset.fd==="name"){o.name=baseNm(o.name);o.ex=C.staff.includes(o.name)||C.helpers.includes(o.name)}draw()}};
 ov.onclick=e=>{const b=e.target.closest("button");if(e.target===ov||(b&&b.dataset.x)){ov.remove();return}if(!b||!b.dataset.go)return;
  const C2=cal();let nA=0,nU=0;for(const o of a){if(!o.on||!o.name)continue;const n=o.name,had=C2.staff.includes(n)||C2.helpers.includes(n);
   if(!had){(o.k==="h"?C2.helpers:C2.staff).push(n);nA++}else nU++;const p=prof(C2,n);for(const f of ["kana","nick","role","tel","birth"])if(o[f]&&!p[f])p[f]=o[f];if(o.k==="h"&&o.co&&!p.co)p.co=o.co}
  calSave(C2);ov.remove();toast(`入れました：新しく ${nA}人${nU?`・足した ${nU}人`:""}。足りない所は名前をタップして入れてください`);renderPeople()}}
/* 📇 スマホの連絡先に入れる：連絡先のファイル（vCard 3.0）を作って開く。iPhone は開くと「新規連絡先を作成」（何人もの時は「○件の連絡先をすべて追加」）、
   アンドロイドは保存したファイルを開くと連絡先のアプリで入る。名前・ふりがな・ニックネーム・会社名・電話・誕生日、職種・経験・血液型・緊急連絡先はメモに */
function vcardOf(C,n){const p=prof(C,n),e=v=>String(v||"").replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/[,;]/g,m=>"\\"+m),L=["BEGIN:VCARD","VERSION:3.0",`N:${e(n)};;;;`,`FN:${e(n)}`];
 if(p.kana)L.push(`X-PHONETIC-LAST-NAME:${e(p.kana)}`,`SORT-STRING:${e(p.kana)}`);if(p.nick)L.push(`NICKNAME:${e(p.nick)}`);if(coOf(C,n))L.push(`ORG:${e(coOf(C,n))}`);if(p.role)L.push(`TITLE:${e(p.role)}`);if(p.tel)L.push(`TEL;TYPE=CELL:${e(p.tel)}`);if(p.birth)L.push(`BDAY:${p.birth}`);
 const m=[];for(const t of p.trades||[])m.push(`職種：${t.n}${t.since?`（${ymdJ(t.since)}から・経験${expOf(t.since)||"1か月未満"}）`:""}`);if(p.blood)m.push(`血液型：${p.blood}型`);
 const em=p.em||{};if(em.n||em.tel)m.push(`緊急連絡先：${em.n||""}${em.rel?`（${em.rel}）`:""} ${em.tel||""}`.trim());if(m.length)L.push(`NOTE:${e(m.join("\n"))}`);
 if(em.n&&em.tel){L.push(`item1.TEL:${e(em.tel)}`,`item1.X-ABLABEL:緊急連絡先（${e(em.n)}）`)}
 L.push("END:VCARD");return L.join("\r\n")}
function addContacts(ns){const C=cal(),txt=ns.map(n=>vcardOf(C,n)).join("\r\n")+"\r\n",nm=(ns.length===1?"contact":"contacts_"+ns.length)+".vcf",bl=new Blob([txt],{type:"text/vcard;charset=utf-8"}),u=URL.createObjectURL(bl);
 if(/iPhone|iPad|iPod/.test(navigator.userAgent)){location.href=u}   // iPhone：開くと連絡先の画面
 else{const a=document.createElement("a");a.href=u;a.download=nm;document.body.appendChild(a);a.click();a.remove();toast("連絡先のファイルを保存しました。開くと連絡先に入ります")}
 setTimeout(()=>URL.revokeObjectURL(u),60000)}

async function renderList(){
 freeUrls();const ss=(await allSites()).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||b.updated-a.updated);
 $("#app").innerHTML=`<h1><button class="btn sm" id="bMenu">← 現場メニュー</button><span class="grow"></span><button class="btn pri" id="bNew">＋ 新しい現場</button></h1>
 <h2 style="margin:4px 4px 8px">📋 現場一覧</h2>
 ${ss.length?ss.map(s=>`<button class="site" data-id="${s.id}"><b>${esc(s.name||"（名前なし）")}</b><div class="sub">${esc(dateTxt(s.date))}${s.time?" "+timeTxt(s.time):""}${s.members.length?` ・ ${s.members.length}人`:""}${s.members.some(m=>m.star)?" ⭐"+esc(s.members.filter(m=>m.star).map(m=>m.n).join("・")):""}</div>${s.addr?`<div class="sub">📍 ${esc(s.addr)}</div>`:""}${s.need&&s.need.min?`<div class="need ${needSt(s,s.date).c}">${esc(needSt(s,s.date).t)}</div>`:""}</button>`).join(""):`<div class="empty">まだ現場がありません。<br>「＋ 新しい現場」で、現場名・住所・駐車場・メンバーなどを入れると、<br>LINEに送る文章を自動で作ります。</div>`}
 `;
 document.querySelector(".bar")?.remove();
 $("#bMenu").onclick=()=>go("");
 $("#bNew").onclick=async()=>{const s=newSite();await putSite(s);go(s.id)};
 $("#app").querySelectorAll(".site").forEach(b=>b.onclick=()=>{backTo="list";go(b.dataset.id)});
}

const FIELD=(id,label,ph,area)=>`<label class="f" for="${id}">${label}</label>${area?`<textarea id="${id}" placeholder="${esc(ph)}"></textarea>`:`<input id="${id}" placeholder="${esc(ph)}">`}`;
function renderEdit(){
 const s=cur;freeUrls();
 $("#app").innerHTML=`<h1><button class="btn sm" id="bBack">${backTo&&backTo!=="list"?"← 週の割り振り":"← 一覧"}</button><span class="grow"></span><button class="btn sm" id="bDup">複製</button><button class="btn sm del" id="bDel">削除</button></h1>
 <div class="card"><h2>📅 日時・🏭 現場</h2>
  <div class="row"><div class="grow"><label class="f" for="fDate">日付</label><input id="fDate" type="date"></div><div style="width:120px"><label class="f" for="fTime">開始</label><input id="fTime" type="time"></div></div>
  <div class="row"><div class="grow"><label class="f" for="fTend">終わり（何時まで・1日に何件もある時）</label><input id="fTend" type="time"></div><div style="width:120px"><label class="f" for="fShift">昼／夜</label><select id="fShift"><option value="">☀️ 日勤</option><option value="night">🌙 夜勤</option></select></div></div>
  <label class="f" for="fEnd">終わりの日（何日かかる時だけ）</label><input id="fEnd" type="date">
  <details id="dPick" style="margin-top:8px"><summary class="note" style="font-weight:800">📆 飛び飛びの日を選ぶ（今日と来週・2週間後、土日はほかの現場など）</summary><div id="dCal"></div></details>
  ${FIELD("fName","現場名","例：カゴメ小牧工場")}
  ${FIELD("fAddr","📍 住所","例：愛知県小牧市〇〇町〇〇")}<div id="addrLink"></div></div>
 <div class="card"><h2>🅿️ 駐車場</h2>
  <div class="row"><button class="btn grow" id="bHere">📍 今いる場所で登録</button><button class="btn" id="bParkClr">消す</button></div>
  <div class="note" id="parkInfo"></div>
  ${FIELD("fParkUrl","Googleマップのリンク（共有で出るリンクを貼る）","https://maps.app.goo.gl/… など")}
  ${FIELD("fParkNote","場所のメモ","例：正門を入って左側の来客用駐車場",true)}
  <label class="f">写真</label><div class="photos" id="phs"></div>
  <div class="row" style="margin-top:8px"><button class="btn grow" id="bPh">📷 写真を足す</button></div><input type="file" id="fPh" accept="image/*" multiple hidden></div>
 <div class="card"><h2>👷 メンバー</h2><div class="note">⭐を押すと「現調に行った人」。分からない事を誰に聞けばいいか分かります。</div>
  <div id="mems" style="margin-top:6px"></div>
  <div class="row" style="margin-top:8px"><input id="fMem" placeholder="名前（例：服部さん（3名））" enterkeyhint="done"><button class="btn pri" id="bMem">追加</button></div>
  <div class="chips" id="chips"></div></div>
 <div class="card"><h2>👥 人数・応援</h2>
  <div class="row"><div class="grow"><label class="f" for="fMin">最低これだけ要る</label><input id="fMin" type="number" inputmode="numeric" min="0" placeholder="例：3"></div><div class="grow"><label class="f" for="fPlus">余裕がなければ＋</label><input id="fPlus" type="number" inputmode="numeric" min="0" placeholder="例：2"></div></div>
  <div class="note" id="needInfo"></div>
  <label class="f">🤝 応援さん（どこの会社から・何人）</label><div id="helps"></div>
  <div class="row" style="margin-top:8px"><button class="btn grow" id="bHelp">＋ 応援を足す</button></div></div>
 <div class="card"><h2>🚗 交通費（1日・往復）</h2><div class="note">人ごとに住んでいる所がちがうので、高速代・ガソリン代をこの現場に1日行くといくらかを入れてください。📊 人工の画面で月ごと・人ごと・現場ごとに合計します。</div><div id="costs"></div></div>
 <div class="card"><h2>🔧 作業内容</h2>${FIELD("fWork","1行に1つ（→ で始めると前の行の続き）","天吊10馬力の入替\n口元流用\nガス回収\n→ 必要なら新しい物に交換",true)}</div>
 <div class="card"><h2>🎒 持ち物・服装</h2>${FIELD("fBring","持ってきてほしい物（1行に1つ）","上履き\nヘルメット",true)}${FIELD("fProv","こちらで用意する物（※が付きます）","白衣などは小川設備で用意します",true)}</div>
 <div class="card"><h2>🔌 道具について</h2>${FIELD("fBorrow","","電動工具や脚立をお借りするかもしれません",true)}</div>
 <div class="card"><h2>⏰ 当日の予定</h2>${FIELD("fPlan","","その日のうちに終わらせる作業です。\n残業をお願いするかもしれません。",true)}</div>
 <div class="card"><h2>📝 自分用メモ</h2>${FIELD("fMemo","LINEの文章には入りません","",true)}</div>
 <div class="card"><h2>💬 LINEに送る文章</h2><pre class="out" id="out"></pre>
  <div class="row" style="margin-top:8px"><button class="btn grow" id="bCopy">📋 コピー</button><button class="btn grow" id="bCal">📅 カレンダーに追加</button></div></div>`;
 const bar=document.querySelector(".bar")||document.body.appendChild(Object.assign(document.createElement("div"),{className:"bar"}));
 bar.innerHTML=`<button class="btn line" id="bSend">💬 文章を送る</button><button class="btn" id="bSendPh">🅿️ 写真を送る</button>`;
 const F={fDate:"date",fEnd:"end",fTime:"time",fTend:"tend",fShift:"shift",fName:"name",fAddr:"addr",fWork:"work",fBring:"bring",fProv:"provided",fBorrow:"borrow",fPlan:"plan",fMemo:"memo"};
 for(const [id,k] of Object.entries(F)){const el=$("#"+id);el.value=s[k]||"";el.oninput=()=>{s[k]=el.value;save();upd()}}
 const pu=$("#fParkUrl"),pn=$("#fParkNote");pu.value=s.park.lat!=null?"":s.park.url;pn.value=s.park.note;
 pu.oninput=()=>{const v=pu.value.trim(),ll=parseMapUrl(v);if(ll){s.park.lat=ll.lat;s.park.lng=ll.lng;s.park.url=""}else{s.park.url=v;if(v){s.park.lat=null;s.park.lng=null}}save();upd()};
 pn.oninput=()=>{s.park.note=pn.value;save();upd()};
 $("#bHere").onclick=()=>{if(!navigator.geolocation){toast("このブラウザでは位置が取れません");return}toast("位置を調べています…");
  navigator.geolocation.getCurrentPosition(p=>{s.park.lat=+p.coords.latitude.toFixed(6);s.park.lng=+p.coords.longitude.toFixed(6);s.park.url="";pu.value="";save();upd();toast(`駐車場の位置を登録しました（誤差 約${Math.round(p.coords.accuracy)}m）`)},
   e=>toast(e.code===1?"位置情報が許可されていません。設定 → Safari（またはこのアプリ）→ 位置情報 を許可してください":"位置が取れませんでした。空が見える所でもう一度"),{enableHighAccuracy:true,timeout:20000,maximumAge:0})};
 $("#bParkClr").onclick=()=>{s.park.lat=null;s.park.lng=null;s.park.url="";pu.value="";save();upd()};
 $("#bPh").onclick=()=>$("#fPh").click();
 $("#fPh").onchange=async e=>{const fs=[...e.target.files];e.target.value="";for(const f of fs){try{const b=await shrink(f),id=rid("p");await putPhoto({id,site:s.id,blob:b,t:Date.now()});s.park.photos.push(id)}catch(err){toast(err.message)}}save();renderPhotos();upd()};
 $("#bMem").onclick=()=>addMem($("#fMem").value);$("#fMem").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();addMem($("#fMem").value)}};
 $("#bBack").onclick=()=>{const b=backTo;backTo="";go(b||"list")};
 if(!s.need)s.need={min:0,plus:0};if(!s.help)s.help=[];
 const fm=$("#fMin"),fp=$("#fPlus");fm.value=s.need.min||"";fp.value=s.need.plus||"";
 fm.oninput=()=>{s.need.min=Math.max(0,parseInt(fm.value)||0);save();upd()};fp.oninput=()=>{s.need.plus=Math.max(0,parseInt(fp.value)||0);save();upd()};
 $("#bHelp").onclick=()=>{s.help.push({co:"",n:1});save();renderHelps();upd();const a=$("#helps").querySelectorAll("input[data-co]");a[a.length-1]?.focus()};
 $("#bDup").onclick=async()=>{const n={...JSON.parse(JSON.stringify(s)),id:rid("s"),created:Date.now(),updated:Date.now()};n.park.photos=[];for(const pid of s.park.photos){const p=await getPhoto(pid);if(p){const id=rid("p");await putPhoto({...p,id,site:n.id});n.park.photos.push(id)}}await putSite(n);toast("複製しました（日付を直してください）");go(n.id)};
 $("#bDel").onclick=async e=>{const b=e.currentTarget;if(!b.dataset.ok){b.dataset.ok="1";b.textContent="本当に削除";setTimeout(()=>{b.dataset.ok="";b.textContent="削除"},3000);return}clearTimeout(saveT);for(const pid of s.park.photos)await delPhoto(pid).catch(()=>{});await delSite(s.id);cur=null;toast("削除しました");go("list")};
 $("#bCopy").onclick=()=>copyText(lineText(s));
 $("#bSend").onclick=()=>shareText(lineText(s));
 $("#bSendPh").onclick=async()=>{const fs=[];for(const [i,pid] of s.park.photos.entries()){const p=await getPhoto(pid);if(p)fs.push(new File([p.blob],`駐車場${i+1}.jpg`,{type:"image/jpeg"}))}if(!fs.length){toast("駐車場の写真がありません");return}shareFiles(fs,"駐車場")};
 $("#bCal").onclick=()=>{const u=calUrl(s);if(!u){toast("日付を入れてください");return}window.open(u,"_blank")};
 renderMems();renderHelps();renderPhotos();renderCosts();renderDays();upd();
 $("#dPick").open=!!(s.days&&s.days.length);
 for(const id of ["fDate","fEnd"]){const el=$("#"+id),f0=el.oninput;el.oninput=()=>{if(s.days&&s.days.length){s.days=null;toast("飛び飛びの日をやめて、続けての日にしました")}f0();renderDays()}}
}
/* 📆 飛び飛びの日：その月のカレンダーで日をタップ（入れる・外す）。最初にタップした時は今の続けての日から始める */
let dcM=null;
function renderDays(){const s=cur,box=$("#dCal");if(!box)return;const sel=new Set(siteDays(s));if(!dcM||dcM.id!==s.id)dcM={id:s.id,m:(s.date||ymdOf(new Date())).slice(0,7)};
 const [Y,M]=dcM.m.split("-").map(Number),first=new Date(Y,M-1,1),nd=new Date(Y,M,0).getDate(),pad=(first.getDay()+6)%7,cells=[];
 for(let i=0;i<pad;i++)cells.push("<td></td>");for(let d=1;d<=nd;d++){const y=`${Y}-${String(M).padStart(2,"0")}-${String(d).padStart(2,"0")}`,w=dOf(y).getDay();cells.push(`<td class="c dc ${sel.has(y)?"on":""} ${w===0||w===6?"we":""}" data-dc="${y}">${d}</td>`)}
 const rows=[];for(let i=0;i<cells.length;i+=7)rows.push("<tr>"+cells.slice(i,i+7).join("")+"</tr>");
 box.innerHTML=`<div class="row" style="align-items:center;margin:6px 0"><button class="btn sm" data-dm="-1">‹</button><b class="grow" style="text-align:center">${Y}年${M}月</b><button class="btn sm" data-dm="1">›</button></div>
 <div class="wtab"><table><tr>${["月","火","水","木","金","土","日"].map(x=>`<th>${x}</th>`).join("")}</tr>${rows.join("")}</table></div>
 <div class="note">${s.days&&s.days.length?`選んだ日：${s.days.length}日（${esc(s.days.map(y=>+y.slice(5,7)+"/"+ +y.slice(8)).join("・"))}）`:"日をタップすると、その日だけ入る現場になります（今は続けての日）"}</div>
 <div class="row" style="margin-top:6px"><button class="btn grow" data-da="we">土日を外す</button><button class="btn grow" data-da="clr">続けての日に戻す</button></div>`;
 box.onclick=e=>{const b=e.target.closest("[data-dm],[data-dc],[data-da]");if(!b)return;
  if(b.dataset.dm){const d=new Date(Y,M-1+ +b.dataset.dm,1);dcM.m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;renderDays();return}
  let a=siteDays(s);
  if(b.dataset.dc){const y=b.dataset.dc;a=a.includes(y)?a.filter(x=>x!==y):[...a,y].sort();if(!a.length){toast("1日は残してください");return}}
  else if(b.dataset.da==="we"){a=a.filter(y=>{const w=dOf(y).getDay();return w!==0&&w!==6});if(!a.length){toast("土日しかありません");return}}
  else{s.days=null;s.end=s.end||"";save();renderDays();upd();return}
  s.days=a;s.date=a[0];s.end=a.length>1?a[a.length-1]:"";$("#fDate").value=s.date;$("#fEnd").value=s.end;
  for(const m of s.members)if(m.d){m.d=m.d.filter(x=>a.includes(x));if(!m.d.length||a.every(x=>m.d.includes(x)))delete m.d}   // 外した日の分は人からも消す
  save();renderDays();upd()};
}
/* 🚗 交通費：s.cost[名前]={hw:高速代, gas:ガソリン代}（円・1日の往復） */
function renderCosts(){const s=cur,box=$("#costs");if(!box)return;s.cost=s.cost||{};const ns=[...new Set(s.members.filter(m=>memN(m)===1).map(m=>baseNm(m.n)).filter(Boolean))];
 box.innerHTML=ns.length?ns.map(n=>{const c=s.cost[n]||{};return `<div style="border-top:1px solid var(--line);padding:6px 0"><b>${esc(n)}</b><div style="display:flex;align-items:center;gap:4px;margin-top:4px"><span class="note">高速</span><input data-hw="${esc(n)}" type="number" inputmode="numeric" placeholder="0" value="${c.hw||""}" style="flex:1;min-width:0">円<span class="note" style="margin-left:6px">ガソリン</span><input data-gas="${esc(n)}" type="number" inputmode="numeric" placeholder="0" value="${c.gas||""}" style="flex:1;min-width:0">円</div></div>`}).join(""):`<div class="note">先にメンバーを入れてください</div>`;
 box.oninput=e=>{const t=e.target,n=t.dataset.hw||t.dataset.gas;if(!n)return;const c=s.cost[n]=s.cost[n]||{};c[t.dataset.hw?"hw":"gas"]=Math.max(0,parseInt(t.value)||0);if(!c.hw&&!c.gas)delete s.cost[n];save()}}
function renderHelps(){
 const s=cur,box=$("#helps");box.innerHTML=s.help.length?s.help.map((h,i)=>`<div class="mem"><input data-co="${i}" placeholder="会社名（例：〇〇設備）" value="${esc(h.co)}" class="grow"><input data-hn="${i}" type="number" inputmode="numeric" min="0" value="${esc(h.n)}" style="width:64px"><span>名</span><button class="btn sm del" data-rmh="${i}" aria-label="外す">✕</button></div>`).join(""):`<div class="note">いません</div>`;
 box.oninput=e=>{const t=e.target;if(t.dataset.co!=null)s.help[+t.dataset.co].co=t.value;else if(t.dataset.hn!=null)s.help[+t.dataset.hn].n=Math.max(0,parseInt(t.value)||0);save();upd()};
 box.onclick=e=>{const b=e.target.closest("[data-rmh]");if(!b)return;s.help.splice(+b.dataset.rmh,1);save();renderHelps();upd()};
}
function addMem(v){v=v.trim();if(!v)return;cur.members.push({n:v,star:false});people(v);$("#fMem").value="";save();renderMems();renderCosts();upd()}
function renderMems(){
 const s=cur;$("#mems").innerHTML=s.members.length?s.members.map((m,i)=>`<div class="mem"><button class="star ${m.star?"on":""}" data-st="${i}" aria-label="現調に行った人">⭐</button><span class="nm">${esc(m.n)}${m.d?`<small class="dd">（${esc(m.d.map(x=>+x.slice(8)+"日").join("・"))}だけ）</small>`:""}</span><button class="btn sm" data-up="${i}" aria-label="上へ" ${i?"":"disabled"}>↑</button><button class="btn sm del" data-rm="${i}" aria-label="外す">✕</button></div>`).join(""):`<div class="note">まだいません。下で名前を入れて「追加」。</div>`;
 const used=new Set(s.members.map(m=>m.n));$("#chips").innerHTML=people().filter(n=>!used.has(n)).slice(0,20).map(n=>`<button class="chip" data-add="${esc(n)}">＋ ${esc(n)}</button>`).join("");
 $("#mems").onclick=e=>{const b=e.target.closest("button");if(!b)return;const d=b.dataset;
  if(d.st!=null){s.members[+d.st].star=!s.members[+d.st].star}
  else if(d.up!=null){const i=+d.up;[s.members[i-1],s.members[i]]=[s.members[i],s.members[i-1]]}
  else if(d.rm!=null){s.members.splice(+d.rm,1)}
  save();renderMems();renderCosts();upd()};
 $("#chips").onclick=e=>{const b=e.target.closest("[data-add]");if(b)addMem(b.dataset.add)};
}
async function renderPhotos(){
 const s=cur,box=$("#phs");freeUrls();let h="";
 for(const pid of s.park.photos){const p=await getPhoto(pid);if(!p)continue;const u=URL.createObjectURL(p.blob);urls.push(u);h+=`<div class="ph"><img src="${u}" alt="駐車場の写真"><button data-rmp="${pid}" aria-label="写真を消す">✕</button></div>`}
 if(cur!==s)return;box.innerHTML=h||`<div class="note">写真なし</div>`;
 box.onclick=async e=>{const b=e.target.closest("[data-rmp]");if(!b)return;const pid=b.dataset.rmp;s.park.photos=s.park.photos.filter(x=>x!==pid);await delPhoto(pid).catch(()=>{});save();renderPhotos();upd()};
}
function upd(){
 const s=cur;$("#out").textContent=lineText(s);
 $("#addrLink").innerHTML=s.addr.trim()?`<div class="note"><a class="map" href="${esc(addrUrl(s.addr))}" target="_blank" rel="noopener">🗺 地図で確かめる</a></div>`:"";
 const u=parkUrl(s.park);$("#parkInfo").innerHTML=s.park.lat!=null?`登録済み：${s.park.lat}, ${s.park.lng}　<a class="map" href="${esc(u)}" target="_blank" rel="noopener">🗺 地図で確かめる</a>`:u?`リンクを使います　<a class="map" href="${esc(u)}" target="_blank" rel="noopener">🗺 開く</a>`:"まだ登録されていません";
 $("#bSendPh").disabled=!s.park.photos.length;
 const st=needSt(s,s.date);$("#needInfo").innerHTML=s.need.min?`<span class="need ${st.c}">${esc(st.t)}</span>`:`今は ${st.n}名（メンバー＋応援）。最低の人数を入れると、足りているか分かります。`;
}

/* ===== 📅 週の割り振り：だれがどの現場か・休み・応援さん・人数（最低○名・余裕がなければ＋○名）
   社員の名前と休みは localStorage「genba_cal」（{staff:[名前], off:{"2026-10-27":[名前]}}）。現場の方は sites に end（終わりの日）・need {min,plus}・help [{co,n}]、
   メンバーに d（入る日だけ。無い時は現場の日ぜんぶ） ===== */
function cal(){let o={};try{o=JSON.parse(localStorage.getItem("genba_cal")||"{}")}catch(e){}if(!Array.isArray(o.staff))o.staff=[];if(!o.off||typeof o.off!=="object")o.off={};if(!Array.isArray(o.tags))o.tags=[];if(!o.prof||typeof o.prof!=="object")o.prof={};if(!Array.isArray(o.helpers))o.helpers=[];if(typeof o.myco!=="string")o.myco="";if(!o.coInfo||typeof o.coInfo!=="object")o.coInfo={};return o}   /* myco：自分の会社名（社員の会社）・coInfo[会社名]={emp:従業員の数} */
const coOf=(C,n)=>C.helpers.includes(n)?((C.prof[n]||{}).co||""):C.myco||"";   /* その人の会社：社員は自分の会社・応援さんはその人の会社名 */
const ROLEP=["社長","副社長","専務","常務","部長","課長","係長","主任","職長","現場代理人","親方","番頭","職人","見習い"];   /* helpers：🤝 応援さん（ほかの会社の人・個人情報は社員と同じ C.prof） */
function calSave(o){try{localStorage.setItem("genba_cal",JSON.stringify(o))}catch(e){toast("保存できませんでした")}}
const pad2=n=>String(n).padStart(2,"0"),ymdOf=d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const dOf=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
function monday(s){const d=s?dOf(s):new Date();d.setDate(d.getDate()-(d.getDay()+6)%7);return ymdOf(d)}
function addDay(s,n){const d=dOf(s);d.setDate(d.getDate()+n);return ymdOf(d)}
/* 日程：続けての日（date〜end）か、飛び飛びの日（s.days＝選んだ日の並び。今日・来週・2週間後、土日はほかの現場など）。days がある時は date＝最初・end＝最後の日にそろえる */
const endOf=s=>s.days&&s.days.length?s.days[s.days.length-1]:s.end&&s.end>s.date?s.end:s.date;
const onDay=(s,y)=>s.days&&s.days.length?s.days.includes(y):!!s.date&&s.date<=y&&y<=endOf(s);
const daysTxt=a=>{const R=[];let i=0;while(i<a.length){let j=i;while(j+1<a.length&&a[j+1]===addDay(a[j],1))j++;R.push(dateTxt(a[i])+(j>i?"〜"+dateTxt(a[j]):""));i=j+1}return R.join("・")};   /* 続いている日は「〜」でまとめる */
const siteDays=s=>{if(s.days&&s.days.length)return s.days.slice();const a=[];if(s.date)for(let d=s.date;d<=endOf(s);d=addDay(d,1))a.push(d);return a};
const memOn=(m,y)=>!m.d||m.d.includes(y);
const memN=m=>{const k=String(m.n).match(/[（(]\s*(\d+)\s*名\s*[)）]/);return k?+k[1]:1};   /* 「服部さん（3名）」は3人 */
const baseNm=n=>String(n).replace(/[（(]\s*\d+\s*名\s*[)）]/,"").trim();
const helps=s=>(s.help||[]).filter(h=>h.co.trim()||+h.n);
function headcount(s,y){return s.members.filter(m=>m.n.trim()&&memOn(m,y)).reduce((a,m)=>a+memN(m),0)+helps(s).reduce((a,h)=>a+(+h.n||0),0)}
function needSt(s,y){const nd=s.need||{},n=headcount(s,y);if(!nd.min)return {n,c:"",t:`${n}名`};
 if(n<nd.min)return {n,c:"ng",t:`🔴 ${n}名／最低${nd.min}名 ・あと${nd.min-n}名 足りない`};
 const want=nd.min+(+nd.plus||0);if(n<want)return {n,c:"mid",t:`🟡 ${n}名／最低${nd.min}名はいる ・余裕がないので あと${want-n}名ほしい`};
 return {n,c:"ok",t:`🟢 ${n}名／最低${nd.min}名${nd.plus?`＋${nd.plus}名`:""} 余裕あり`}}
/* 昼と夜：現場ごとに「日勤／夜勤」を選ぶ（時刻では決めない：18時からの夜勤などもあるため・2026-10-26 ユーザー）。選んでいない時は日勤。開始〜終わりの時刻がかぶらなければ、1日に何件でも入れる */
const shiftOf=s=>s.shift==="night"?"night":"day";   /* 昼夜連続はやめた（2026-10-26 ユーザー：計算が面倒・代わりに残業を書く）。前に昼夜連続にした現場は日勤 */
const shIco=s=>shiftOf(s)==="night"?"🌙":"",shTx=s=>shiftOf(s)==="night"?"🌙夜勤":"";
/* ⏱ 残業：人ごと・日ごとに日勤の残業 d・夜勤の残業 n（分）を C.ot[日付][名前] に書く。単位 C.otU（分：1・15・30・60、初めは30）、端数は切り捨て（C.otR：down・round・up） */
const otOf=(C,y,n)=>((C.ot||{})[y]||{})[n]||{d:0,n:0};
const otRnd=(C,m)=>{const u=+C.otU||30,r=C.otR||"down";return (r==="up"?Math.ceil(m/u):r==="round"?Math.round(m/u):Math.floor(m/u))*u};
const hmTxt=m=>m?(Math.floor(m/60)?Math.floor(m/60)+"時間":"")+(m%60?m%60+"分":""):"0時間";
const spanTxt=s=>s.time?timeTxt(s.time)+"〜"+(s.tend?timeTxt(s.tend):""):"";
const tMin=t=>+t.slice(0,2)*60+ +t.slice(3,5);
function clash(a,b){if(a.time&&a.tend&&b.time&&b.tend){const r=s=>{const x=tMin(s.time);let y=tMin(s.tend);if(y<=x)y+=1440;return [x,y]},[a0,a1]=r(a),[b0,b1]=r(b);return a0<b1&&b0<a1}const A=shiftOf(a),B=shiftOf(b);return A===B}
const clashIn=a=>a.some((x,i)=>a.some((y,j)=>j>i&&clash(x,y)));
/* 名前の順番：📌（C.pin）の人がいちばん上、あとは社員の順（C.staff）、社員に入れていない人は下 */
const ordNames=(C,ns)=>{const pin=C.pin||[],st=C.staff,ix=n=>{const i=st.indexOf(n);return i<0?1e6:i};return ns.slice().sort((a,b)=>(pin.includes(b)-pin.includes(a))||ix(a)-ix(b))};
const SC=["#0369a1","#b45309","#15803d","#7c3aed","#be123c","#0f766e","#a16207","#4338ca"];
async function weekData(){
 const C=cal(),days=[...Array(7)].map((_,i)=>addDay(wk,i)),ss=(await allSites()).filter(s=>days.some(y=>onDay(s,y))).sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.time||"").localeCompare(b.time||"")||a.created-b.created);
 ss.forEach(s=>{if(!s.need)s.need={min:0,plus:0};if(!s.help)s.help=[]});
 const at={};for(const s of ss)for(const m of s.members){const n=baseNm(m.n);if(!n)continue;for(const y of days)if(onDay(s,y)&&memOn(m,y))((at[n]=at[n]||{})[y]=at[n][y]||[]).push(s)}
 const oth=Object.keys(at).filter(n=>!C.staff.includes(n)&&ss.some(s=>s.members.some(m=>baseNm(m.n)===n&&memN(m)===1))),names=ordNames(C,[...C.staff,...oth]);   /* 社員＋この週に現場に入っている人（社員に入れていない人も・何人でも） */
 for(const n in at)for(const y in at[n])at[n][y].sort((a,b)=>(a.time||"").localeCompare(b.time||""));
 return {C,days,ss,at,names}}
async function renderWeek(){
 freeUrls();document.querySelector(".bar")?.remove();
 const {C,days,ss,at,names}=await weekData(),col=s=>SC[ss.indexOf(s)%SC.length],sn=s=>(s.name||"現場").trim().slice(0,3)||"現場";
 const ng=ss.filter(s=>days.some(y=>onDay(s,y)&&needSt(s,y).c==="ng")).length;
 const cell=(n,y)=>{const o=otOf(C,y,n),t=o.d||o.n?`<span class="ot">⏱</span>`:"";return cell0(n,y).replace("</td>",t+"</td>")},cell0=(n,y)=>{const a=(at[n]||{})[y]||[],off=(C.off[y]||[]).includes(n);
  if(off&&a.length)return `<td class="c warn" data-n="${esc(n)}" data-y="${y}">休⚠️</td>`;
  if(off)return `<td class="c off" data-n="${esc(n)}" data-y="${y}">休</td>`;
  if(a.length>1&&clashIn(a))return `<td class="c warn" data-n="${esc(n)}" data-y="${y}">⚠️${a.length}</td>`;
  if(a.length>1)return `<td class="c multi" data-n="${esc(n)}" data-y="${y}">${a.map(s=>`<div style="background:${col(s)}">${shIco(s)}${esc(sn(s).slice(0,2))}</div>`).join("")}</td>`;   /* 時間がかぶらない何件か：上から時間の順 */
  if(a.length)return `<td class="c" data-n="${esc(n)}" data-y="${y}" style="background:${col(a[0])};color:#fff">${shIco(a[0])}${esc(sn(a[0]))}</td>`;
  return `<td class="c" data-n="${esc(n)}" data-y="${y}"></td>`};
 const today=ymdOf(new Date());
 $("#app").innerHTML=`<h1><button class="btn sm" id="bBack">← メニュー</button><span class="grow"></span><button class="btn sm" id="bPrev">‹ 前の週</button><button class="btn sm" id="bThis">今週</button><button class="btn sm" id="bNext">次の週 ›</button></h1>
 <button class="btn" id="bKosu" style="width:100%;margin:0 0 8px">📊 人工・⏱ 残業（月ごと・年ごと）</button>
 <div class="card"><h2>📅 ${esc(dateTxt(days[0]))}〜${esc(dateTxt(days[6]))}</h2>
  ${ng?`<div class="need ng">🔴 人が足りない現場が ${ng}件 あります</div>`:ss.length?`<div class="need ok">🟢 足りない現場はありません</div>`:""}
  ${ss.length?`<h2 style="margin-top:10px">🏭 現場ごとの予定</h2><div class="wtab"><table class="gt"><tr><th></th>${days.map(y=>`<th class="${y===today?"td":""}">${+y.slice(8)}<br>${WD[dOf(y).getDay()]}</th>`).join("")}</tr>
  ${ss.map(s=>`<tr><th class="nm"><button class="gnm" data-sd="${s.id}"><span style="color:${col(s)}">■</span>${esc(s.name||"（名前なし）")}</button></th>${days.map(y=>{if(!onDay(s,y))return `<td class="g"></td>`;const st=needSt(s,y);return `<td class="c g on ${st.c==="ng"?"gng":""}" data-gy="${y}" style="background:${col(s)}">${st.c==="ng"?"🔴":""}${st.n}名</td>`}).join("")}</tr>`).join("")}</table></div>
  <div class="note">色のマス＝その日にある現場（数字は入っている人数・🔴は足りない）。マスをタップ → その日の現場、名前をタップ → くわしく。</div>`:""}
  <h2 style="margin-top:10px">👷 だれがどこに</h2>
  ${C.tags.some(t=>!t.hide&&names.some(n=>tagsOf(C,n).some(x=>x.id===t.id)))?`<div class="chips" style="margin:0 0 6px">${C.tags.filter(t=>!t.hide&&names.some(n=>tagsOf(C,n).some(x=>x.id===t.id))).map(t=>`<button class="chip" data-wt="${t.id}" style="${wTag===t.id?`background:${t.c};border-color:${t.c};color:#fff`:`border-color:${t.c}`}">🏷 ${esc(t.n)}</button>`).join("")}</div>`:""}
  ${names.length?`<div class="wtab"><table><tr><th></th>${days.map(y=>`<th class="${y===today?"td":""}">${+y.slice(8)}<br>${WD[dOf(y).getDay()]}</th>`).join("")}</tr>
  ${names.map(n=>`<tr class="${wTag&&!tagsOf(C,n).some(t=>t.id===wTag)?"dim":""}"><th class="nm" data-nm="${esc(n)}">${(C.pin||[]).includes(n)?"📌":""}${esc(n)}${C.staff.includes(n)?"":`<div class="sub" style="font-size:10px">${C.helpers.includes(n)?"（応援）":"（社員外）"}</div>`}${tagsOf(C,n).length?`<div class="dots">${tagsOf(C,n).map(t=>`<i style="background:${t.c}"></i>`).join("")}</div>`:""}</th>${days.map(y=>cell(n,y)).join("")}</tr>`).join("")}</table></div>
  <div class="note">マスをタップ → 現場に入れる・外す・休みにする。名前をタップ → 📌固定・順番。⚠️＝休みの日に入っている／時間のかぶる現場に入っている。🌙＝夜勤・⏱＝残業あり。${names.some(n=>!C.staff.includes(n))?"「（社員外）」の人は、現場に入っているけれど、下の「社員」に入れていない人です。":""}</div><button class="btn sm" id="bAddP" style="margin-top:6px">＋ 人を足す（何人でも）</button>`:`<div class="note">下の「社員の名前」に名前を入れると、ここに表が出ます。</div>`}
  ${ss.length?`<div class="chips">${ss.map(s=>`<button class="chip" data-sd="${s.id}" style="border-color:${col(s)}"><span style="color:${col(s)}">■</span> ${esc(s.name||"（名前なし）")} ›</button>`).join("")}</div>`:""}</div>
 ${days.map(y=>{const here=ss.filter(s=>onDay(s,y)),off=C.off[y]||[],busy=new Set(Object.keys(at).filter(n=>(at[n][y]||[]).length)),free=names.filter(n=>!busy.has(n)&&!off.includes(n));
  return `<div class="card day${y===today?" today":""}" id="d${y}"><h2><span class="grow">${esc(dateTxt(y))}${y===today?" ・今日":""}</span><button class="btn sm" data-new="${y}">＋ 現場</button></h2>
  ${here.map(s=>{const st=needSt(s,y),mm=s.members.filter(m=>m.n.trim()&&memOn(m,y)),hp=helps(s);
   return `<button class="site" data-id="${s.id}" style="border-left:6px solid ${col(s)}"><b>${esc(s.name||"（名前なし）")}</b>${s.time?` <span class="sub">${(shIco(s)?shTx(s)+" ":"")}${spanTxt(s)}</span>`:shIco(s)?` <span class="sub">${shTx(s)}</span>`:""}${endOf(s)!==s.date?` <span class="sub">（${+s.date.slice(8)}日〜${+endOf(s).slice(8)}日）</span>`:""}
   <div class="need ${st.c}">${esc(st.t)}</div>
   <div class="sub">👷 ${mm.length?esc(mm.map(m=>m.n.trim()+(m.star?"⭐":"")).join("・")):"まだだれも入っていません"}</div>
   ${hp.length?`<div class="sub">🤝 応援：${esc(hp.map(h=>`${h.co.trim()||"（会社名なし）"} ${+h.n||0}名`).join("・"))}</div>`:""}</button>`}).join("")||`<div class="note">現場なし</div>`}
  ${(()=>{const w=Object.keys(at).filter(n=>(at[n][y]||[]).length&&(off.includes(n)||clashIn(at[n][y])));return w.length?`<div class="need ng">⚠️ ${esc(w.map(n=>n+(off.includes(n)?"（休みの日）":"（時間のかぶる現場）")).join("・"))}</div>`:""})()}
  ${off.length?`<div class="note">🏖 休み：${esc(off.join("・"))}</div>`:""}
  ${names.length&&here.length?`<div class="note">🙋 空いている人：${free.length?esc(free.join("・")):"いません"}</div>`:""}</div>`}).join("")}
 <div class="card"><h2>💬 この週の割り振りを送る</h2><pre class="out" id="out"></pre>
  <div class="row" style="margin-top:8px"><button class="btn grow" id="bCopy">📋 コピー</button><button class="btn line grow" id="bSend">💬 送る</button></div></div>
 <div class="card"><h2>👷 社員（表に出す人）</h2><div class="note">会社のメンバーを入れておくと、だれが空いているか・休みかが分かります。名前をタップ → タグ・個人情報・緊急連絡先・資格証。応援さんは現場の「👥 人数・応援」に入れてください。</div>
  <div id="staff">${ordNames(C,C.staff).map(n=>{const p=C.prof[n]||{},nl=(p.lic||[]).length;return `<button class="site" data-pp="${esc(n)}"><b>${(C.pin||[]).includes(n)?"📌":""}${esc(n)}</b>${ageOf(p.birth)!==""?` <span class="sub">${ageOf(p.birth)}歳</span>`:""}${nl?` <span class="sub">📜${nl}</span>`:""}<div>${tagHtml(tagsOf(C,n))}</div></button>`}).join("")||`<span class="note">まだいません</span>`}</div>
  <button class="btn" id="bPImp" style="width:100%;margin-top:8px">📥 受け取った人を入れる</button><input type="file" id="fPImp" accept=".json,application/json" hidden>
  <div class="row" style="margin-top:8px"><input id="fStaff" placeholder="名前（例：服部）" enterkeyhint="done"><button class="btn pri" id="bStaff">追加</button></div>
  <div class="chips" id="sugg">${[...new Set([...people().map(baseNm),...Object.keys(at)])].filter(n=>n&&!C.staff.includes(n)).slice(0,20).map(n=>`<button class="chip" data-as="${esc(n)}">＋ ${esc(n)}</button>`).join("")}</div></div>`;
 $("#out").textContent=weekText(C,days,ss);
 $("#bBack").onclick=()=>go("");
 $("#bPrev").onclick=()=>go("w"+addDay(wk,-7));$("#bNext").onclick=()=>go("w"+addDay(wk,7));$("#bThis").onclick=()=>go("w"+monday());
 $("#bCopy").onclick=()=>copyText(weekText(C,days,ss));$("#bSend").onclick=()=>shareText(weekText(C,days,ss));
 $("#app").querySelectorAll(".site").forEach(b=>b.onclick=()=>{backTo="w"+wk;go(b.dataset.id)});
 $("#app").querySelectorAll("[data-new]").forEach(b=>b.onclick=async()=>{const s=newSite();s.date=b.dataset.new;await putSite(s);backTo="w"+wk;go(s.id)});
 $("#app").querySelectorAll("td.c[data-n]").forEach(td=>td.onclick=()=>pick(td.dataset.n,td.dataset.y,ss));
 $("#app").querySelectorAll("th[data-nm]").forEach(th=>th.onclick=()=>nameSheet(th.dataset.nm));
 $("#bKosu").onclick=()=>{backTo="w"+wk;go("k"+kPeriod(cal(),wk)[0])};
 $("#app").querySelectorAll("[data-sd]").forEach(b=>b.onclick=()=>siteSheet(ss.find(s=>s.id===b.dataset.sd),days));
 $("#app").querySelectorAll("[data-gy]").forEach(td=>td.onclick=()=>{const el=document.getElementById("d"+td.dataset.gy);if(el)el.scrollIntoView({behavior:"smooth",block:"start"})});
 {const b=$("#bAddP");if(b)b.onclick=()=>{const f=$("#fStaff");f.scrollIntoView({behavior:"smooth",block:"center"});setTimeout(()=>f.focus(),350)}}
 const addStaff=v=>{v=baseNm(v||"");if(!v)return;const C2=cal();if(!C2.staff.includes(v))C2.staff.push(v);calSave(C2);renderWeek()};
 $("#bStaff").onclick=()=>addStaff($("#fStaff").value);$("#fStaff").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();addStaff($("#fStaff").value)}};
 $("#sugg").onclick=e=>{const b=e.target.closest("[data-as]");if(b)addStaff(b.dataset.as)};
 $("#staff").onclick=e=>{const b=e.target.closest("[data-pp]");if(b)go("p"+encodeURIComponent(b.dataset.pp))};
 $("#bPImp").onclick=()=>$("#fPImp").click();$("#fPImp").onchange=e=>{const f=e.target.files[0];e.target.value="";if(f)importAll(f)};
 $("#app").querySelectorAll("[data-wt]").forEach(b=>b.onclick=()=>{wTag=wTag===b.dataset.wt?"":b.dataset.wt;renderWeek()});
}
/* 表の名前をタップ：📌固定・順番（上へ・下へ）・社員に入れる・個人のページ */
function nameSheet(n){const C=cal(),pin=C.pin||[],ov=document.createElement("div");ov.className="sheet";const st=C.staff.includes(n),on=pin.includes(n);
 ov.innerHTML=`<div class="sbox"><h2>${on?"📌":""}${esc(n)}</h2>
 <button class="btn ${on?"pri":""}" data-a="pin">${on?"📌 固定を外す":"📌 いちばん上に固定する"}</button>
 ${st?`<div class="row"><button class="btn grow" data-a="up">▲ 上へ</button><button class="btn grow" data-a="dn">▼ 下へ</button></div><button class="btn" data-a="top">⤒ ${on?"固定の中で":""}いちばん上へ</button><button class="btn" data-a="pp">👤 個人のページ</button>`:C.helpers.includes(n)?`<button class="btn" data-a="pp">👤 個人のページ（🤝 応援さん）</button>`:`<button class="btn" data-a="add">＋ 社員に入れる（順番を変えられるように）</button>`}
 <div class="note">📌の人はいつも表のいちばん上（📌どうしは社員の順）。▲▼で社員の順番を変えます。</div><button class="btn" data-a="x">閉じる</button></div>`;
 document.body.appendChild(ov);
 ov.onclick=e=>{const b=e.target.closest("button");if(e.target===ov||(b&&b.dataset.a==="x")){ov.remove();return}if(!b)return;const a=b.dataset.a,C2=cal();C2.pin=C2.pin||[];
  if(a==="pp"){ov.remove();go("p"+encodeURIComponent(n));return}
  if(a==="pin")C2.pin=C2.pin.includes(n)?C2.pin.filter(x=>x!==n):[...C2.pin,n];
  else if(a==="add"){if(!C2.staff.includes(n))C2.staff.push(n)}
  else{/* 見えている並び（📌が上）の中で1つ動かして、社員の順に戻す */const vis=ordNames(C2,C2.staff),i=vis.indexOf(n),grp=vis.filter(x=>C2.pin.includes(x)===C2.pin.includes(n)),k=grp.indexOf(n);
   if(a==="up"&&k>0)[grp[k-1],grp[k]]=[grp[k],grp[k-1]];else if(a==="dn"&&k>=0&&k<grp.length-1)[grp[k+1],grp[k]]=[grp[k],grp[k+1]];else if(a==="top"&&k>0){grp.splice(k,1);grp.unshift(n)}
   const other=vis.filter(x=>C2.pin.includes(x)!==C2.pin.includes(n));C2.staff=C2.pin.includes(n)?[...grp,...other]:[...other,...grp];if(i<0)return}
  calSave(C2);ov.remove();if(location.hash.startsWith("#k"))route();else renderWeek()}}
/* 📊 人工：期間（C.cut 日から1か月＝締め日の次の日から・初めは1日＝月末締め。会社ごとにちがうので1〜27日締めと月末締めから選ぶ）の人ごとの ☀️日勤・🌙夜勤・🎌休日出勤（土日・祝日。土曜を出勤日にもできる）・🏖休み（仕事の入っていない日）。
   1日に昼と夜の両方なら2人工 */
const HOL=new Set(["2026-01-01","2026-01-12","2026-02-11","2026-02-23","2026-03-20","2026-04-29","2026-05-03","2026-05-04","2026-05-05","2026-05-06","2026-07-20","2026-08-11","2026-09-21","2026-09-22","2026-09-23","2026-10-12","2026-11-03","2026-11-23",
 "2027-01-01","2027-01-11","2027-02-11","2027-02-23","2027-03-21","2027-03-22","2027-04-29","2027-05-03","2027-05-04","2027-05-05","2027-07-19","2027-08-11","2027-09-20","2027-09-23","2027-10-11","2027-11-03","2027-11-23"]);
const isHol=(C,y)=>{const w=dOf(y).getDay();return w===0||(w===6&&!C.satWork)||(C.nohol?false:HOL.has(y))};
function kPeriod(C,y){const cut=+C.cut||1,d=dOf(y);let a=new Date(d.getFullYear(),d.getMonth(),cut);if(d<a)a=new Date(d.getFullYear(),d.getMonth()-1,cut);const b=new Date(a.getFullYear(),a.getMonth()+1,cut-1);return [ymdOf(a),ymdOf(b)]}
async function kosuData(C,a,b){const days=[];for(let y=a;y<=b;y=addDay(y,1))days.push(y);const ss=(await allSites()).filter(s=>s.date&&s.date<=b&&endOf(s)>=a),R={};
 const one=n=>R[n]=R[n]||{d:0,nt:0,h:0,off:0,mk:0,od:0,on:0,hw:0,gas:0,site:{},list:[]};
 for(const y of days)for(const n in (C.ot||{})[y]||{})one(n);
 for(const s of ss)for(const m of s.members){const n=baseNm(m.n);if(!n||memN(m)!==1)continue;one(n)}C.staff.forEach(one);
 for(const n in R){const r=R[n];for(const y of days){const w=ss.filter(s=>onDay(s,y)&&s.members.some(m=>baseNm(m.n)===n&&memOn(m,y))),hol=isHol(C,y),sh=new Set(w.map(shiftOf));
   const o=otOf(C,y,n);r.od+=otRnd(C,o.d||0);r.on+=otRnd(C,o.n||0);
   if(!w.length){r.off++;if((C.off[y]||[]).includes(n))r.mk++;if(o.d||o.n)r.list.push({y,hol,w,o});continue}
   if(hol)r.h+=sh.size;else{if(sh.has("day"))r.d++;if(sh.has("night"))r.nt++}
   for(const s of w){r.site[s.id]=(r.site[s.id]||0)+1;const c=(s.cost||{})[n];if(c){r.hw+=+c.hw||0;r.gas+=+c.gas||0}}   // 現場ごとの回数・交通費（1日の往復×入った日）
   r.list.push({y,hol,w,o})}}
 /* 現場ごと：入った日数・延べ人数（社員＋応援）・交通費 */
 const ST=ss.map(s=>{let dn=0,pd=0,hp=0;for(const y of days)if(onDay(s,y)){const k=s.members.filter(m=>m.n.trim()&&memOn(m,y)).reduce((a2,m)=>a2+memN(m),0),h2=helps(s).reduce((a2,h)=>a2+(+h.n||0),0);if(k+h2){dn++;pd+=k;hp+=h2}}
  let hw=0,gas=0;for(const n in R){const c=(s.cost||{})[n],t=R[n].site[s.id]||0;if(c&&t){hw+=(+c.hw||0)*t;gas+=(+c.gas||0)*t}}return {s,dn,pd,hp,hw,gas}}).filter(o=>o.dn);
 return {days,R,ST,names:ordNames(C,Object.keys(R))}}
const yen=v=>"¥"+Math.round(v).toLocaleString("ja-JP");
/* 1人分のまとめ（人工・残業・現場ごとの回数・交通費）：人工の画面の名前タップと、個人のページで使う */
function personHtml(n,r,ST){const nm=id=>{const o=ST.find(q=>q.s.id===id);return o?(o.s.name||"（名前なし）").trim():"（消した現場）"};
 return `<div class="sub">☀️日勤 ${r.d}日・🌙夜勤 ${r.nt}日・🎌休日出勤 ${r.h}日・🏖休み ${r.off}日 ＝ <b>${r.d+r.nt+r.h}人工</b></div>
 <div class="sub">⏱ 残業：日勤 ${hmTxt(r.od)}・夜勤 ${hmTxt(r.on)}（計 ${hmTxt(r.od+r.on)}）</div>
 <div class="sub">🏭 現場ごと：${Object.entries(r.site).sort((a,b)=>b[1]-a[1]).map(([id,t])=>`${esc(nm(id))} ${t}回`).join("・")||"なし"}</div>
 <div class="sub">🚗 交通費：高速 ${yen(r.hw)}・ガソリン ${yen(r.gas)}（計 ${yen(r.hw+r.gas)}）</div>`}
async function renderKosu(y0,yr){   /* yr：1年（1月の期間〜12月の期間） */
 freeUrls();document.querySelector(".bar")?.remove();const C=cal(),cY=+C.cut||1,Y=+y0.slice(0,4),[a,b]=yr?[kPeriod(C,`${Y}-01-${String(cY).padStart(2,"0")}`)[0],kPeriod(C,`${Y}-12-${String(cY).padStart(2,"0")}`)[1]]:kPeriod(C,y0),{days,R,ST,names}=await kosuData(C,a,b);
 const otS=n=>R[n].od+R[n].on,sum=k=>names.reduce((s2,n)=>s2+R[n][k],0);
 const tot=n=>R[n].d+R[n].nt+R[n].h,cuts=[1,...Array.from({length:27},(_,i)=>i+2)];   /* 締め日：月末（1日から）・1〜27日（その次の日から） */
 const txt=()=>[`📊 人工・残業 ${yr?Y+"年 ":""}${dateTxt(a)}〜${dateTxt(b)}`,...names.map(n=>`${n}：日勤${R[n].d}日・夜勤${R[n].nt}日・休日出勤${R[n].h}日・休み${R[n].off}日（計${tot(n)}人工）・残業 日勤${hmTxt(R[n].od)}／夜勤${hmTxt(R[n].on)}（計${hmTxt(otS(n))}）`),`合計 ${names.reduce((s2,n)=>s2+tot(n),0)}人工・残業 ${hmTxt(sum("od")+sum("on"))}`,"",...ST.map(o=>`🏭 ${(o.s.name||"（名前なし）").trim()}：${o.dn}日・延べ${o.pd+o.hp}人${o.hp?`（応援${o.hp}人）`:""}${o.hw+o.gas?`・高速${yen(o.hw)}・ガソリン${yen(o.gas)}`:""}`),...(sum("hw")+sum("gas")?["","🚗 交通費",...names.filter(n=>R[n].hw+R[n].gas).map(n=>`${n}：高速${yen(R[n].hw)}・ガソリン${yen(R[n].gas)}（計${yen(R[n].hw+R[n].gas)}）`)]:[])].join("\n");
 $("#app").innerHTML=`<h1><button class="btn sm" id="bBack">← 戻る</button><span class="grow"></span><button class="btn sm" id="bPrev">‹ 前</button><button class="btn sm" id="bNext">次 ›</button></h1>
 <div class="chips" style="margin:0 0 8px"><button class="chip" id="kMon" style="${yr?"":"background:var(--acc);border-color:var(--acc);color:#fff"}">1か月</button><button class="chip" id="kYr" style="${yr?"background:var(--acc);border-color:var(--acc);color:#fff":""}">1年（${Y}年）</button></div>
 <div class="card"><h2>📊 人工 ${yr?Y+"年 ":""}${esc(dateTxt(a))}〜${esc(dateTxt(b))}</h2>
  <div class="row" style="align-items:center;gap:6px;flex-wrap:wrap"><label class="note" for="kCut">締め日</label><select id="kCut" style="width:auto">${cuts.map(c=>`<option value="${c}" ${c===(+C.cut||1)?"selected":""}>${c===1?"月末締め（1日〜月末）":(c-1)+"日締め（"+c+"日〜翌月"+(c-1)+"日）"}</option>`).join("")}</select>
   <label class="note" style="display:inline-flex;align-items:center;gap:4px"><input type="checkbox" style="width:auto" id="kSat" ${C.satWork?"checked":""}> 土曜は出勤日</label><label class="note" style="display:inline-flex;align-items:center;gap:4px"><input type="checkbox" style="width:auto" id="kHol" ${C.nohol?"":"checked"}> 祝日は休日</label></div>
  ${names.length?`<div class="wtab"><table class="kt"><tr><th></th><th>☀️<br>日勤</th><th>🌙<br>夜勤</th><th>🎌<br>休日出勤</th><th>🏖<br>休み</th><th>人工<br>計</th></tr>
  ${names.map(n=>`<tr><th class="nm" data-kn="${esc(n)}">${(C.pin||[]).includes(n)?"📌":""}${esc(n)}</th><td class="k">${R[n].d}</td><td class="k">${R[n].nt}</td><td class="k">${R[n].h}</td><td class="k">${R[n].off}</td><td class="k"><b>${tot(n)}</b></td></tr>`).join("")}
  <tr><th class="nm">合計</th>${["d","nt","h","off"].map(k=>`<td class="k">${names.reduce((s2,n)=>s2+R[n][k],0)}</td>`).join("")}<td class="k"><b>${names.reduce((s2,n)=>s2+tot(n),0)}</b></td></tr></table></div>
  <div class="note">休日出勤＝日曜${C.satWork?"":"・土曜"}${C.nohol?"":"・祝日"}に入った日。休み＝現場の入っていない日（🏖休みの印のない日も）。昼と夜の両方の日は2人工。昼／夜は現場カードで選んだ物（選んでいない時は日勤）。名前をタップ → 日ごと。</div>`:`<div class="note">この期間に現場に入っている人がいません</div>`}
  ${names.length?`<h2 style="margin-top:12px">⏱ 残業</h2><div class="wtab"><table class="kt"><tr><th></th><th>☀️ 日勤の<br>残業</th><th>🌙 夜勤の<br>残業</th><th>合計</th></tr>
  ${names.map(n=>`<tr><th class="nm" data-kn="${esc(n)}">${(C.pin||[]).includes(n)?"📌":""}${esc(n)}</th><td class="k">${hmTxt(R[n].od)}</td><td class="k">${hmTxt(R[n].on)}</td><td class="k"><b>${hmTxt(otS(n))}</b></td></tr>`).join("")}
  <tr><th class="nm">合計</th><td class="k">${hmTxt(sum("od"))}</td><td class="k">${hmTxt(sum("on"))}</td><td class="k"><b>${hmTxt(sum("od")+sum("on"))}</b></td></tr></table></div>`:""}
  <div class="row" style="align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px"><label class="note" for="kOtU">残業の単位</label><select id="kOtU" style="width:auto">${[[1,"1分ごと"],[15,"15分ごと"],[30,"30分ごと"],[60,"1時間ごと"]].map(([v,t])=>`<option value="${v}" ${v===(+C.otU||30)?"selected":""}>${t}</option>`).join("")}</select>
   <select id="kOtR" style="width:auto">${[["down","端数は切り捨て"],["round","端数は四捨五入"],["up","端数は切り上げ"]].map(([v,t])=>`<option value="${v}" ${v===(C.otR||"down")?"selected":""}>${t}</option>`).join("")}</select></div>
  ${ST.length?`<h2 style="margin-top:12px">🏭 現場ごと</h2><div class="wtab"><table class="kt"><tr><th></th><th>入った<br>日数</th><th>延べ<br>人数</th><th>高速代</th><th>ガソリン</th></tr>
  ${ST.map(o=>`<tr><th class="nm">${esc((o.s.name||"（名前なし）").trim())}</th><td class="k">${o.dn}</td><td class="k">${o.pd+o.hp}${o.hp?`<div class="note" style="font-size:10px">応援${o.hp}</div>`:""}</td><td class="k" style="font-size:12px">${yen(o.hw)}</td><td class="k" style="font-size:12px">${yen(o.gas)}</td></tr>`).join("")}</table></div>`:""}
  ${names.length&&sum("hw")+sum("gas")?`<h2 style="margin-top:12px">🚗 交通費（人ごと）</h2><div class="wtab"><table class="kt"><tr><th></th><th>高速代</th><th>ガソリン</th><th>合計</th></tr>
  ${names.map(n=>`<tr><th class="nm" data-kn="${esc(n)}">${esc(n)}</th><td class="k" style="font-size:12px">${yen(R[n].hw)}</td><td class="k" style="font-size:12px">${yen(R[n].gas)}</td><td class="k" style="font-size:12px"><b>${yen(R[n].hw+R[n].gas)}</b></td></tr>`).join("")}
  <tr><th class="nm">合計</th><td class="k" style="font-size:12px">${yen(sum("hw"))}</td><td class="k" style="font-size:12px">${yen(sum("gas"))}</td><td class="k" style="font-size:12px"><b>${yen(sum("hw")+sum("gas"))}</b></td></tr></table></div>`:""}
  <div class="note">残業は「だれがどこに」の表のマスをタップして、日勤の残業・夜勤の残業を選びます（⏱の印が付きます）。単位を変えると、前に入れた残業も合計の時に単位に合わせます。</div>
  <div id="kDet"></div></div>
 <div class="card"><h2>💬 送る</h2><pre class="out" id="out"></pre><div class="row" style="margin-top:8px"><button class="btn grow" id="bCopy">📋 コピー</button><button class="btn line grow" id="bSend">💬 送る</button></div></div>`;
 $("#out").textContent=txt();
 $("#bBack").onclick=()=>{const t=backTo;backTo="";go(t||"")};
 $("#bPrev").onclick=()=>go(yr?"ky"+(Y-1)+"-01-01":"k"+kPeriod(C,addDay(a,-1))[0]);$("#bNext").onclick=()=>go(yr?"ky"+(Y+1)+"-01-01":"k"+addDay(b,1));
 $("#kMon").onclick=()=>{const t=ymdOf(new Date());go("k"+kPeriod(C,yr?(t>=a&&t<=b?t:Y+"-01-15"):a)[0])};$("#kYr").onclick=()=>go("ky"+(+kPeriod(C,a)[1].slice(0,4)===Y?Y:Y)+"-01-01");
 $("#kOtU").onchange=e=>{const C2=cal();C2.otU=+e.target.value;calSave(C2);renderKosu(y0,yr)};$("#kOtR").onchange=e=>{const C2=cal();C2.otR=e.target.value;calSave(C2);renderKosu(y0,yr)};
 $("#kCut").onchange=e=>{const C2=cal();C2.cut=+e.target.value;calSave(C2);const t=ymdOf(new Date()),r=t>=a&&t<=b?t:addDay(a,14),h="k"+kPeriod(C2,r)[0];if(yr){renderKosu(y0,yr);return}if(location.hash==="#"+h)renderKosu(h.slice(1));else go(h)};   // 今日（この期間でない時は期間のまん中）を含む期間へ
 $("#kSat").onchange=e=>{const C2=cal();C2.satWork=e.target.checked;calSave(C2);renderKosu(y0,yr)};$("#kHol").onchange=e=>{const C2=cal();C2.nohol=!e.target.checked;calSave(C2);renderKosu(y0,yr)};
 $("#bCopy").onclick=()=>copyText(txt());$("#bSend").onclick=()=>shareText(txt());
 $("#app").querySelectorAll("[data-kn]").forEach(th=>th.onclick=()=>{const n=th.dataset.kn,r=R[n];
  $("#kDet").innerHTML=`<h2 style="margin-top:12px">${esc(n)}</h2>${personHtml(n,r,ST)}<h2 style="margin-top:8px">日ごと</h2>${r.list.map(o=>`<div class="sub">${esc(dateTxt(o.y))}${o.hol?" 🎌":""}：${o.w.map(s=>`${(shIco(s)||"☀️")}${esc((s.name||"現場").trim())}${s.time?" "+esc(spanTxt(s)):""}`).join("／")||"（現場なし）"}${o.o&&(o.o.d||o.o.n)?` ⏱${o.o.d?"日勤"+hmTxt(o.o.d):""}${o.o.n?" 夜勤"+hmTxt(o.o.n):""}`:""}</div>`).join("")||`<div class="note">現場に入った日はありません</div>`}`;
  $("#kDet").scrollIntoView({behavior:"smooth",block:"start"})});
}
/* 現場の名前をタップ：くわしく（日にち・時間・住所・その週の日ごとの人数と人・作業内容）→ 現場カードへ */
function siteSheet(s,days){if(!s)return;const ov=document.createElement("div");ov.className="sheet";
 const dd=days.filter(y=>onDay(s,y));
 ov.innerHTML=`<div class="sbox"><h2>🏭 ${esc(s.name||"（名前なし）")}</h2>
 <div class="sub">📅 ${esc(dateTxt(s.date))}${endOf(s)!==s.date?"〜"+esc(dateTxt(endOf(s))):""}${s.days&&s.days.length>1?`（飛び飛び ${s.days.length}日）`:""}${s.time?" "+esc(spanTxt(s)):""}${" "+(shTx(s)||"☀️日勤")}</div>
 ${s.addr?`<div class="sub">📍 ${esc(s.addr)}</div>`:""}
 ${dd.map(y=>{const st=needSt(s,y),mm=s.members.filter(m=>m.n.trim()&&memOn(m,y)),hp=helps(s);return `<div style="border-top:1px solid var(--line);padding-top:6px"><b>${esc(dateTxt(y))}</b> <span class="need ${st.c}" style="display:inline">${esc(st.t)}</span>
  <div class="sub">👷 ${mm.length?esc(mm.map(m=>m.n.trim()+(m.star?"⭐":"")).join("・")):"まだだれも入っていません"}</div>${hp.length?`<div class="sub">🤝 応援：${esc(hp.map(h=>`${h.co.trim()||"（会社名なし）"} ${+h.n||0}名`).join("・"))}</div>`:""}</div>`}).join("")}
 ${s.work?`<div class="sub" style="white-space:pre-wrap">🛠 ${esc(String(s.work).slice(0,200))}</div>`:""}
 <button class="btn pri" data-open="1">📋 現場カードを開く</button><button class="btn" data-x="1">閉じる</button></div>`;
 document.body.appendChild(ov);
 ov.onclick=e=>{const b=e.target.closest("button");if(e.target===ov||(b&&b.dataset.x)){ov.remove();return}if(b&&b.dataset.open){ov.remove();backTo="w"+wk;go(s.id)}};
}
/* 表のマスをタップ：その日の現場に入れる・外す、休み */
function pick(n,y,ss){
 const C=cal(),off=(C.off[y]||[]).includes(n),here=ss.filter(s=>onDay(s,y)),ov=document.createElement("div");ov.className="sheet";
 ov.innerHTML=`<div class="sbox"><h2>${esc(n)}　${esc(dateTxt(y))}</h2>${tagsOf(C,n).length?`<div>${tagHtml(tagsOf(C,n))}</div>`:""}
 ${here.map((s,i)=>{const on=s.members.some(m=>baseNm(m.n)===n&&memOn(m,y));return `<button class="btn ${on?"pri":""}" data-s="${i}">${on?"✓ ":""}🏭 ${esc(s.name||"（名前なし）")}${on?"（外す）":"に入れる"}</button>`}).join("")||`<div class="note">この日の現場はありません</div>`}
 <button class="btn ${off?"pri":""}" data-off="1">${off?"✓ 🏖 休み（消す）":"🏖 休みにする"}</button>
 <div style="border-top:1px solid var(--line);padding-top:8px"><b>⏱ 残業</b> <span class="note">（${hmTxt(+C.otU||30)}ごと）</span>${[["d","☀️ 日勤の残業"],["n","🌙 夜勤の残業"]].map(([k,t])=>{const m=otOf(C,y,n)[k]||0,u=+C.otU||30;
  return `<div class="row" style="align-items:center;gap:6px;margin-top:6px"><span style="width:110px;font-weight:700">${t}</span><select data-oh="${k}" style="width:auto">${[...Array(13)].map((_,h)=>`<option value="${h}" ${Math.floor(m/60)===h?"selected":""}>${h}時間</option>`).join("")}</select>${u<60?`<select data-om="${k}" style="width:auto">${[...Array(60/u)].map((_,i)=>i*u).concat(m%60&&(m%60)%u?[m%60]:[]).sort((a,b)=>a-b).map(v=>`<option value="${v}" ${m%60===v?"selected":""}>${v}分</option>`).join("")}</select>`:""}</div>`}).join("")}</div>
 <button class="btn" data-x="1">閉じる</button></div>`;
 document.body.appendChild(ov);
 const otSet=k=>{const h=+ov.querySelector(`[data-oh="${k}"]`).value,mi=ov.querySelector(`[data-om="${k}"]`),C2=cal();C2.ot=C2.ot||{};const o={...otOf(C2,y,n)};o[k]=h*60+(mi?+mi.value:0);
  if(o.d||o.n)(C2.ot[y]=C2.ot[y]||{})[n]=o;else if(C2.ot[y]){delete C2.ot[y][n];if(!Object.keys(C2.ot[y]).length)delete C2.ot[y]}calSave(C2);ov.dataset.ch=1};
 ov.querySelectorAll("[data-oh],[data-om]").forEach(el=>el.onchange=()=>otSet(el.dataset.oh||el.dataset.om));
 ov.onclick=async e=>{const b=e.target.closest("button");if(e.target===ov||(b&&b.dataset.x)){ov.remove();if(ov.dataset.ch)renderWeek();return}if(!b)return;
  if(b.dataset.off){const C2=cal(),a=C2.off[y]||[];C2.off[y]=off?a.filter(x=>x!==n):[...a,n];if(!C2.off[y].length)delete C2.off[y];calSave(C2)}
  else{const s=here[+b.dataset.s];toggleMem(s,n,y);await putSite(s)}
  ov.remove();renderWeek()};
}
function toggleMem(s,n,y){
 const span=siteDays(s);
 const i=s.members.findIndex(m=>baseNm(m.n)===n);s.updated=Date.now();
 if(i<0){s.members.push(span.length>1?{n,star:false,d:[y]}:{n,star:false});people(n);return}
 const m=s.members[i];
 if(memOn(m,y)){m.d=(m.d||span).filter(x=>x!==y);if(!m.d.length)s.members.splice(i,1)}
 else{m.d=[...new Set([...(m.d||[]),y])].sort();if(span.every(x=>m.d.includes(x)))delete m.d}
}
function weekText(C,days,ss){
 const L=[],SEP="━━━━━━━━━━━━";L.push("お疲れ様です🙇‍♂️",`${dateTxt(days[0])}〜${dateTxt(days[6])}の割り振りです。`,"",SEP);
 for(const y of days){const here=ss.filter(s=>onDay(s,y)),off=C.off[y]||[];if(!here.length&&!off.length)continue;
  L.push("📅 "+dateTxt(y));
  for(const s of here){const mm=s.members.filter(m=>m.n.trim()&&memOn(m,y)),hp=helps(s),nd=s.need||{},st=needSt(s,y);
   L.push(`🏭 ${(s.name||"（名前なし）").trim()}${s.time?" "+spanTxt(s):""}${(shIco(s)?" "+shTx(s):"")}`);
   L.push(`　＊${mm.length?mm.map(m=>m.n.trim()+(m.star?"⭐":"")).join("・"):"（まだ決まっていません）"}`);
   if(hp.length)L.push(`　＊応援：${hp.map(h=>`${h.co.trim()||"（会社名なし）"} ${+h.n||0}名`).join("・")}`);
   if(nd.min)L.push(`　＊${st.n}名／最低${nd.min}名${nd.plus?`（余裕がなければ＋${nd.plus}名）`:""}${st.c==="ng"?` 🔴あと${nd.min-st.n}名 足りない`:st.c==="mid"?` 🟡あと${nd.min+nd.plus-st.n}名ほしい`:""}`)}
  if(off.length)L.push("🏖 休み："+off.join("・"));
  L.push("")}
 if(L[L.length-1]==="")L.pop();if(L[L.length-1]!==SEP)L.push(SEP);
 L.push("","よろしくお願い致します🙏");return L.join("\n");
}

/* ===== 👤 社員の情報：タグ（自由に作れる・🙈で隠せる）・個人情報（危険予知の用紙用）・緊急連絡先・保持資格（資格証の写真）
   genba_cal の tags [{id,n,c,hide}]・prof {名前:{kana,birth,blood,tel,em:{n,kana,rel,addr,tel},lic:[{n,no,ph:[写真id]}],tags:[id]}}。写真は photos（site:"person:名前"）
   渡す：文章・資格証の写真・相手のアプリに入れるファイル（app:"genba-person"） ===== */
const TAGC=["#0369a1","#15803d","#b45309","#be123c","#7c3aed","#0f766e","#64748b","#a16207"];
const TAGP=["溶接できる","溶接は苦手","電気工事士 1種","電気工事士 2種","職長","玉掛け","高所作業車","フォークリフト","冷媒フロン取扱技術者","新人"];
const LICP=["第一種電気工事士","第二種電気工事士","冷媒フロン類取扱技術者","第一種冷媒フロン類取扱技術者","高所作業車運転","玉掛け","小型移動式クレーン","フォークリフト運転","ガス溶接","アーク溶接","職長・安全衛生責任者","足場の組立て等作業主任者","フルハーネス型墜落制止用器具"];
let wTag="",pName="";
function prof(C,n){const p=C.prof[n]=C.prof[n]||{};p.em=p.em||{};p.lic=p.lic||[];p.tags=p.tags||[];return p}
function tagsOf(C,n,all){const p=C.prof[n];if(!p||!p.tags)return [];return C.tags.filter(t=>p.tags.includes(t.id)&&(all||!t.hide))}
const tagHtml=(ts,cls)=>ts.map(t=>`<span class="tg ${cls||""}" style="background:${t.c}">${t.hide?"🙈":""}${esc(t.n)}</span>`).join("");
/* 経験：始めた日から今日まで「○年○か月」 */
function expOf(d){if(!d)return "";const a=dOf(d),t=new Date();let m=(t.getFullYear()-a.getFullYear())*12+t.getMonth()-a.getMonth();if(t.getDate()<a.getDate())m--;if(m<0)return "";return (Math.floor(m/12)?Math.floor(m/12)+"年":"")+(m%12?m%12+"か月":Math.floor(m/12)?"":"1か月未満")}
const TRADEP=["空調工事","冷媒配管","ダクト工事","保温工事","電気工事","管工事（給排水・衛生）","設備工事","板金","内装","建築","鳶","解体"];
/* 🩺 健康診断：受けた日から1年過ぎたら赤（更新して）、1か月前から黄色。{c:"ng"|"mid"|"",t} */
function hcSt(d){if(!d)return {c:"",t:""};const a=dOf(d),due=new Date(a.getFullYear()+1,a.getMonth(),a.getDate()),t=new Date();t.setHours(0,0,0,0);const left=Math.round((due-t)/864e5);
 if(left<0)return {c:"ng",t:`🩺 健康診断から1年過ぎました（${-left}日）。更新してください`};if(left<=30)return {c:"mid",t:`🩺 あと${left}日で健康診断から1年です`};return {c:"",t:`🩺 次の健康診断は ${ymdJ(ymdOf(due))} までに`}}
function ageOf(b){if(!b)return "";const d=dOf(b),t=new Date();let a=t.getFullYear()-d.getFullYear();if(t.getMonth()<d.getMonth()||(t.getMonth()===d.getMonth()&&t.getDate()<d.getDate()))a--;return a>=0&&a<130?a:""}
const ymdJ=s=>{if(!s)return "";const [y,m,d]=s.split("-").map(Number);return `${y}年${m}月${d}日`};
async function renderPerson(){
 freeUrls();document.querySelector(".bar")?.remove();
 const C=cal(),n=pName,isH=C.helpers.includes(n);if(!C.staff.includes(n)&&!isH){go(wk?"w"+wk:"w"+monday());return}
 const p=prof(C,n),ok=()=>calSave(C);
 const F2=(id,label,v,ph,type)=>`<label class="f" for="${id}">${label}</label><input id="${id}" ${type?`type="${type}"`:""} placeholder="${esc(ph||"")}" value="${esc(v||"")}">`;
 $("#app").innerHTML=`<h1><button class="btn sm" id="bBack">${backTo==="people"?"← 個人情報の一覧":"← 週の割り振り"}</button><span class="grow"></span><button class="btn sm del" id="bDelP">この人を消す</button></h1>
 <div class="note" style="margin:0 4px 6px;display:flex;align-items:center;gap:8px"><span class="grow">${isH?"🤝 応援さん":"👤 社員"}</span><button class="btn sm" id="bKind">${isH?"👤 社員にする":"🤝 応援さんにする"}</button></div>
 <div class="card"><h2 style="display:flex;align-items:center;gap:6px"><span class="grow">📊 ${esc(n)} の人工・残業・交通費</span><button class="btn sm" id="pSp">‹</button><button class="btn sm" id="pSn">›</button></h2><div id="pSum" class="note">集計しています…</div></div>
 <div class="card"><h2>🏷 タグ</h2><div class="note">タップでつける・外す。🙈の付いたタグは、この画面だけに出ます（表・送る文章には出ません）。</div>
  <div class="chips" id="ptags">${C.tags.map(t=>{const on=p.tags.includes(t.id);return `<button class="chip ${on?"on":""}" data-t="${t.id}" style="${on?`background:${t.c};border-color:${t.c};color:#fff`:`border-color:${t.c}`}">${t.hide?"🙈":""}${esc(t.n)}</button>`}).join("")||`<span class="note">まだタグがありません。下で作ってください。</span>`}</div>
  <details style="margin-top:10px"><summary class="note" style="font-weight:800">🏷 タグを作る・直す</summary>
   <div id="tagEd">${C.tags.map((t,i)=>`<div class="mem"><button class="btn sm" data-tc="${i}" style="background:${t.c};border-color:${t.c};width:34px" aria-label="色を変える"></button><input data-tn="${i}" value="${esc(t.n)}" class="grow"><button class="btn sm" data-th="${i}">${t.hide?"🙈 隠す":"👁 出す"}</button><button class="btn sm del" data-td="${i}" aria-label="消す">✕</button></div>`).join("")}</div>
   <div class="row" style="margin-top:8px"><input id="fTag" placeholder="新しいタグ（例：溶接できる）" enterkeyhint="done"><button class="btn pri" id="bTag">作る</button></div>
   <div class="chips" id="tagSug">${TAGP.filter(x=>!C.tags.some(t=>t.n===x)).map(x=>`<button class="chip" data-ts="${esc(x)}">＋ ${esc(x)}</button>`).join("")}</div></details></div>
 <div class="card"><h2>👤 個人情報</h2>
  ${F2("pN","名前",n,"例：服部 太郎")}${F2("pKana","ふりがな",p.kana,"例：はっとり たろう")}${F2("pNick","ニックネーム（呼び名）",p.nick,"例：はっちゃん")}<label class="f" for="pRole">役職</label><input id="pRole" list="roleList" placeholder="例：社長・職長" value="${esc(p.role||"")}"><datalist id="roleList">${ROLEP.map(x=>`<option value="${x}">`).join("")}</datalist>
  ${isH?F2("pCo","会社名（屋号）",p.co,"例：小川設備"):`<div class="note" style="margin-top:6px">🏢 会社：${C.myco?esc(C.myco):"（まだ入っていません）"}（社員の会社名は、個人情報の一覧の上で入れます）</div>`}
  <div class="row"><div class="grow">${F2("pBirth","生年月日",p.birth,"","date")}</div><div style="width:110px"><label class="f">年齢</label><div class="age" id="pAge"></div></div></div>
  <label class="f" for="pBlood">血液型</label><select id="pBlood">${["","A","B","O","AB"].map(x=>`<option value="${x}" ${p.blood===x?"selected":""}>${x?x+"型":"（入れない）"}</option>`).join("")}</select>
  <div class="row" style="gap:6px"><div class="grow">${F2("pHc","🩺 健康診断の日",p.hc,"","date")}</div><div style="width:150px"><label class="f">血圧（上／下）</label><div class="row" style="gap:4px"><input id="pBpH" type="number" inputmode="numeric" placeholder="上" value="${esc(p.bpH||"")}"><span>/</span><input id="pBpL" type="number" inputmode="numeric" placeholder="下" value="${esc(p.bpL||"")}"></div></div></div>
  <div id="pHcA"></div>
  ${F2("pTel","電話番号",p.tel,"例：090-1234-5678","tel")}<div id="pTelA"></div></div>
 <div class="card"><h2>🔧 職種と経験</h2><div class="note">どの工事を・いつから始めたかを入れると、経験年数を出します（今日まで）。</div>
  <div id="trades"></div>
  <div class="row" style="margin-top:8px"><input id="fTrade" placeholder="職種（例：空調工事）" list="tradeList" enterkeyhint="done"><button class="btn pri" id="bTrade">追加</button></div>
  <datalist id="tradeList">${TRADEP.map(x=>`<option value="${esc(x)}">`).join("")}</datalist>
  <div class="chips" id="tradeSug">${TRADEP.filter(x=>!(p.trades||[]).some(t=>t.n===x)).slice(0,8).map(x=>`<button class="chip" data-tr="${esc(x)}">＋ ${esc(x)}</button>`).join("")}</div></div>
 <div class="card"><h2>🚑 緊急連絡先</h2>
  ${F2("eN","名前",p.em.n,"例：服部 花子")}${F2("eKana","ふりがな",p.em.kana,"例：はっとり はなこ")}${F2("eRel","続柄",p.em.rel,"例：妻")}
  ${F2("eAddr","住所",p.em.addr,"例：愛知県小牧市〇〇町〇〇")}${F2("eTel","電話番号",p.em.tel,"例：090-1234-5678","tel")}<div id="eTelA"></div></div>
 <div class="card"><h2>📜 保持資格</h2><div class="note">資格証の写真（表・裏）を入れておくと、いつでもここで見られます。</div>
  <div id="lics"></div>
  <div class="row" style="margin-top:8px"><input id="fLic" placeholder="資格の名前" list="licList" enterkeyhint="done"><button class="btn pri" id="bLic">追加</button></div>
  <datalist id="licList">${LICP.map(x=>`<option value="${esc(x)}">`).join("")}</datalist>
  <div class="chips" id="licSug">${LICP.filter(x=>!p.lic.some(l=>l.n===x)).slice(0,8).map(x=>`<button class="chip" data-ls="${esc(x)}">＋ ${esc(x)}</button>`).join("")}</div>
  <input type="file" id="fLicPh" accept="image/*" multiple hidden></div>
 <div class="card"><h2>📤 渡す</h2><div class="note">送る物を選んでください。個人情報なので、送る相手に気をつけてください。</div>
  <label class="ck"><input type="checkbox" id="xP" checked> 個人情報</label><label class="ck"><input type="checkbox" id="xE" checked> 緊急連絡先</label><label class="ck"><input type="checkbox" id="xL" checked> 保持資格（資格証の写真も）</label><label class="ck"><input type="checkbox" id="xT"> タグ（🙈の付いていない物だけ）</label>
  <pre class="out" id="pOut" style="margin-top:8px"></pre>
  <div class="row" style="margin-top:8px"><button class="btn line grow" id="bPSend">💬 文章を送る</button><button class="btn grow" id="bPPh">📷 資格証の写真</button></div>
  <button class="btn" id="bPFile" style="width:100%;margin-top:8px">📲 相手のアプリに入れられるファイルで送る</button>
  <button class="btn pri" id="bVcf" style="width:100%;margin-top:8px">📇 スマホの連絡先に入れる（iPhone・アンドロイド）</button>
  <div class="note">相手は 📋 現場 →「📅 週の割り振り」→ 社員の欄の「📥 受け取った人を入れる」で読み込めます。</div></div>`;
 const reP=()=>{ok();renderPerson()};
 $("#bKind").onclick=()=>{if(isH){C.helpers=C.helpers.filter(x=>x!==n);if(!C.staff.includes(n))C.staff.push(n)}else{C.staff=C.staff.filter(x=>x!==n);if(!C.helpers.includes(n))C.helpers.push(n);if(C.pin)C.pin=C.pin.filter(x=>x!==n)}reP()};
 /* この人の期間（締め日）のまとめ：‹ › で前後の期間 */
 const pSum=async()=>{const [a,b]=kPeriod(C,pPer||ymdOf(new Date())),{R,ST}=await kosuData(C,a,b),r=R[n];$("#pSum").innerHTML=`<b>${esc(dateTxt(a))}〜${esc(dateTxt(b))}</b>`+(r?personHtml(n,r,ST):`<div class="sub">この期間は現場に入っていません</div>`)};
 $("#pSp").onclick=()=>{pPer=addDay(kPeriod(C,pPer||ymdOf(new Date()))[0],-1);pSum()};$("#pSn").onclick=()=>{pPer=addDay(kPeriod(C,pPer||ymdOf(new Date()))[1],1);pSum()};pSum();
 $("#bBack").onclick=()=>{const t=backTo==="people"?"people":"";backTo="";go(t||"w"+(wk||monday()))};
 $("#ptags").onclick=e=>{const b=e.target.closest("[data-t]");if(!b)return;const id=b.dataset.t;p.tags=p.tags.includes(id)?p.tags.filter(x=>x!==id):[...p.tags,id];reP()};
 const addTag=v=>{v=v.trim();if(!v)return;let t=C.tags.find(x=>x.n===v);if(!t){t={id:rid("t"),n:v,c:TAGC[C.tags.length%TAGC.length],hide:false};C.tags.push(t)}if(!p.tags.includes(t.id))p.tags.push(t.id);reP()};
 $("#bTag").onclick=()=>addTag($("#fTag").value);$("#fTag").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();addTag($("#fTag").value)}};
 $("#tagSug").onclick=e=>{const b=e.target.closest("[data-ts]");if(b)addTag(b.dataset.ts)};
 const te=$("#tagEd");te.onchange=e=>{const t=e.target;if(t.dataset.tn!=null){const v=t.value.trim();if(v)C.tags[+t.dataset.tn].n=v;reP()}};
 te.onclick=e=>{const b=e.target.closest("button");if(!b)return;const d=b.dataset;
  if(d.tc!=null){const t=C.tags[+d.tc];t.c=TAGC[(TAGC.indexOf(t.c)+1)%TAGC.length];reP()}
  else if(d.th!=null){const t=C.tags[+d.th];t.hide=!t.hide;reP()}
  else if(d.td!=null){if(!b.dataset.ok){b.dataset.ok="1";b.textContent="消す？";return}const id=C.tags[+d.td].id;C.tags.splice(+d.td,1);for(const q of Object.values(C.prof))if(q.tags)q.tags=q.tags.filter(x=>x!==id);reP()}};
 $("#app").querySelector("details").open=sessionStorage.getItem("genba_tagEd")==="1";$("#app").querySelector("details").ontoggle=e=>{try{sessionStorage.setItem("genba_tagEd",e.target.open?"1":"")}catch(_){}};
 const bind=(id,set)=>{const el=$("#"+id);el.oninput=()=>{set(el.value);ok();pUpd()}};
 bind("pKana",v=>p.kana=v);bind("pNick",v=>p.nick=v);if(isH)bind("pCo",v=>p.co=v);bind("pRole",v=>p.role=v.trim());bind("pBirth",v=>p.birth=v);bind("pHc",v=>p.hc=v);bind("pBpH",v=>p.bpH=v.trim());bind("pBpL",v=>p.bpL=v.trim());bind("pTel",v=>p.tel=v);$("#pBlood").onchange=e=>{p.blood=e.target.value;ok();pUpd()};
 bind("eN",v=>p.em.n=v);bind("eKana",v=>p.em.kana=v);bind("eRel",v=>p.em.rel=v);bind("eAddr",v=>p.em.addr=v);bind("eTel",v=>p.em.tel=v);
 $("#pN").onchange=e=>{const v=baseNm(e.target.value);if(!v||v===n){e.target.value=n;return}if(C.staff.includes(v)||C.helpers.includes(v)){toast("同じ名前の人がいます");e.target.value=n;return}
  if(isH)C.helpers[C.helpers.indexOf(n)]=v;else C.staff[C.staff.indexOf(n)]=v;C.prof[v]=p;delete C.prof[n];for(const y in C.off)C.off[y]=C.off[y].map(x=>x===n?v:x);ok();toast("名前を変えました（現場のメンバーの名前はそのままです）");pName=v;location.replace("#p"+encodeURIComponent(v))};
 $("#bDelP").onclick=async e=>{const b=e.currentTarget;if(!b.dataset.ok){b.dataset.ok="1";b.textContent="本当に消す";setTimeout(()=>{if(b.isConnected){b.dataset.ok="";b.textContent="この人を消す"}},3000);return}
  for(const l of p.lic)for(const id of l.ph||[])await delPhoto(id).catch(()=>{});C.staff=C.staff.filter(x=>x!==n);C.helpers=C.helpers.filter(x=>x!==n);delete C.prof[n];ok();toast("消しました");const t=backTo==="people"?"people":"";backTo="";go(t||"w"+(wk||monday()))};
 const addLic=v=>{v=v.trim();if(!v)return;p.lic.push({n:v,no:"",ph:[]});$("#fLic").value="";reP()};
 $("#bLic").onclick=()=>addLic($("#fLic").value);$("#fLic").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();addLic($("#fLic").value)}};
 $("#licSug").onclick=e=>{const b=e.target.closest("[data-ls]");if(b)addLic(b.dataset.ls)};
 let phTo=-1;$("#fLicPh").onchange=async e=>{const fs=[...e.target.files];e.target.value="";const l=p.lic[phTo];if(!l)return;for(const f of fs){try{const bl=await shrink(f),id=rid("p");await putPhoto({id,site:"person:"+n,blob:bl,t:Date.now()});l.ph.push(id)}catch(err){toast(err.message)}}reP()};
 let h="";for(const [i,l] of p.lic.entries()){let ph="";for(const id of l.ph||[]){const x=await getPhoto(id);if(!x)continue;const u=URL.createObjectURL(x.blob);urls.push(u);ph+=`<div class="ph"><img src="${u}" alt="資格証" data-big="${u}"><button data-rmp="${i}:${id}" aria-label="写真を消す">✕</button></div>`}
  h+=`<div class="lic"><div class="row"><b class="grow">📜 ${esc(l.n)}</b><button class="btn sm del" data-rl="${i}" aria-label="消す">✕</button></div><input data-no="${i}" placeholder="番号・取った日など（なくてもよい）" value="${esc(l.no||"")}" style="margin-top:6px"><div class="photos">${ph}<button class="btn" data-ap="${i}" style="height:96px;width:96px;white-space:normal">📷<br>資格証の写真</button></div></div>`}
 if(pName!==n)return;
 const lb=$("#lics");lb.innerHTML=h||`<div class="note" style="margin-top:6px">まだありません。下で資格を追加してください。</div>`;
 lb.oninput=e=>{const t=e.target;if(t.dataset.no!=null){p.lic[+t.dataset.no].no=t.value;ok();pUpd()}};
 lb.onclick=async e=>{const t=e.target;if(t.dataset.big){showBig(t.dataset.big);return}const b=t.closest("button");if(!b)return;const d=b.dataset;
  if(d.ap!=null){phTo=+d.ap;$("#fLicPh").click()}
  else if(d.rmp){const [i,id]=d.rmp.split(":");p.lic[+i].ph=p.lic[+i].ph.filter(x=>x!==id);await delPhoto(id).catch(()=>{});reP()}
  else if(d.rl!=null){if(!b.dataset.ok){b.dataset.ok="1";b.textContent="消す？";return}for(const id of p.lic[+d.rl].ph||[])await delPhoto(id).catch(()=>{});p.lic.splice(+d.rl,1);reP()}};
 const opt=()=>({P:$("#xP").checked,E:$("#xE").checked,L:$("#xL").checked,T:$("#xT").checked});
 ["xP","xE","xL","xT"].forEach(id=>$("#"+id).onchange=pUpd);
 function pUpd(){const a=ageOf(p.birth);$("#pAge").textContent=a!==""?a+"歳":"—";
  {const h=hcSt(p.hc);$("#pHcA").innerHTML=h.t?`<div class="need ${h.c||"ok"}" style="${h.c?"":"font-weight:600;color:var(--sub)"}">${esc(h.t)}</div>`:`<div class="note">健康診断の日を入れると、1年過ぎた時に赤でお知らせします</div>`}
  $("#pTelA").innerHTML=p.tel?`<div class="note"><a class="map" href="tel:${esc(p.tel.replace(/[^\d+]/g,""))}">📞 電話をかける</a></div>`:"";
  $("#eTelA").innerHTML=p.em.tel?`<div class="note"><a class="map" href="tel:${esc(p.em.tel.replace(/[^\d+]/g,""))}">📞 電話をかける</a></div>`:"";
  $("#pOut").textContent=personText(C,n,opt());$("#bPPh").disabled=!(opt().L&&p.lic.some(l=>(l.ph||[]).length))}
 pUpd();
 /* 🔧 職種：p.trades=[{n:職種, since:始めた日}] */
 const trs=()=>p.trades=p.trades||[],tradeDraw=()=>{$("#trades").innerHTML=trs().map((t,i)=>`<div style="border-top:1px solid var(--line);padding:6px 0"><div class="row"><b class="grow">${esc(t.n)}</b><span class="age" style="height:auto;font-size:16px" data-te="${i}">${t.since&&expOf(t.since)?"経験 "+expOf(t.since):""}</span><button class="btn sm del" data-trm="${i}" aria-label="消す">✕</button></div>
   <div class="row" style="margin-top:4px"><label class="note" for="trS${i}" style="white-space:nowrap">始めた日</label><input id="trS${i}" type="date" data-ts2="${i}" value="${esc(t.since||"")}"></div></div>`).join("")||`<div class="note">まだありません</div>`};tradeDraw();
 const addTrade=v=>{v=(v||"").trim();if(!v)return;if(!trs().some(t=>t.n===v))trs().push({n:v,since:""});ok();renderPerson()};
 $("#bTrade").onclick=()=>addTrade($("#fTrade").value);$("#fTrade").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();addTrade($("#fTrade").value)}};
 $("#tradeSug").onclick=e=>{const b=e.target.closest("[data-tr]");if(b)addTrade(b.dataset.tr)};
 $("#trades").oninput=e=>{const t=e.target;if(t.dataset.ts2==null)return;const i=+t.dataset.ts2;trs()[i].since=t.value;ok();const x=$("#trades").querySelector(`[data-te="${i}"]`);if(x)x.textContent=t.value&&expOf(t.value)?"経験 "+expOf(t.value):"";pUpd()};
 $("#trades").onclick=e=>{const b=e.target.closest("[data-trm]");if(!b)return;if(!b.dataset.ok){b.dataset.ok="1";b.textContent="消す？";return}trs().splice(+b.dataset.trm,1);ok();renderPerson()};
 $("#bPSend").onclick=()=>shareText(personText(C,n,opt()));
 $("#bPPh").onclick=async()=>{const fs=[];for(const l of p.lic)for(const [k,id] of (l.ph||[]).entries()){const x=await getPhoto(id);if(x)fs.push(new File([x.blob],`${n}_${l.n}${k?"_"+(k+1):""}.jpg`.replace(/[\\/:*?"<>|\s]/g,""),{type:"image/jpeg"}))}if(!fs.length){toast("資格証の写真がありません");return}shareFiles(fs,n+"の資格証")};
 $("#bVcf").onclick=()=>addContacts([n]);
 $("#bPFile").onclick=async()=>{const o=opt(),q={};if(o.P)Object.assign(q,{nick:p.nick||"",kana:p.kana||"",birth:p.birth||"",blood:p.blood||"",hc:p.hc||"",bpH:p.bpH||"",bpL:p.bpL||"",tel:p.tel||"",co:coOf(C,n),role:p.role||"",trades:(p.trades||[]).map(t=>({...t}))});if(o.E)q.em={...p.em};const photos=[];
  if(o.L){q.lic=[];for(const l of p.lic){q.lic.push({n:l.n,no:l.no||"",ph:[...(l.ph||[])]});for(const id of l.ph||[]){const x=await getPhoto(id);if(x)photos.push({id,type:x.blob.type,b64:await b64(x.blob)})}}}
  const tags=o.T?tagsOf(C,n).map(t=>({n:t.n,c:t.c})):[];
  shareFiles([new File([JSON.stringify({app:"genba-person",v:1,t:Date.now(),name:n,prof:q,tags,photos})],`${n}_社員の情報.json`.replace(/[\\/:*?"<>|\s]/g,""),{type:"application/json"})],n+"の情報")};
}
function personText(C,n,o){const p=prof(C,n),L=[`【${n}さんの情報】`];
 if(o.P){L.push("","👤 個人情報",`名前：${n}${p.kana?`（${p.kana}）`:""}`);if(p.nick)L.push(`ニックネーム：${p.nick}`);if(p.birth){const a=ageOf(p.birth);L.push(`生年月日：${ymdJ(p.birth)}${a!==""?`（${a}歳）`:""}`)}if(p.blood)L.push(`血液型：${p.blood}型`);if(p.hc)L.push(`健康診断：${ymdJ(p.hc)}${hcSt(p.hc).c==="ng"?"（1年過ぎ・更新が必要）":""}`);if(p.bpH||p.bpL)L.push(`血圧：${p.bpH||"—"}／${p.bpL||"—"}`);if(p.tel)L.push(`電話番号：${p.tel}`);if(coOf(C,n))L.push(`会社名（屋号）：${coOf(C,n)}`);if(p.role)L.push(`役職：${p.role}`);for(const t of p.trades||[])L.push(`職種：${t.n}${t.since?`（${ymdJ(t.since)}から・経験${expOf(t.since)||"1か月未満"}）`:""}`)}
 if(o.E&&(p.em.n||p.em.tel||p.em.addr)){L.push("","🚑 緊急連絡先");if(p.em.n)L.push(`名前：${p.em.n}${p.em.kana?`（${p.em.kana}）`:""}${p.em.rel?`・${p.em.rel}`:""}`);if(p.em.addr)L.push(`住所：${p.em.addr}`);if(p.em.tel)L.push(`電話番号：${p.em.tel}`)}
 if(o.L&&p.lic.length){L.push("","📜 保持資格",...p.lic.map(l=>`＊${l.n}${l.no?`（${l.no}）`:""}`));if(p.lic.some(l=>(l.ph||[]).length))L.push("（資格証の写真を別で送ります📷）")}
 if(o.T){const ts=tagsOf(C,n);if(ts.length)L.push("","🏷 "+ts.map(t=>t.n).join("・"))}
 return L.join("\n")}
function showBig(u){const ov=document.createElement("div");ov.className="sheet big";ov.innerHTML=`<img src="${u}" alt="資格証"><button class="btn" style="position:absolute;right:12px;top:calc(env(safe-area-inset-top,0px) + 12px)">✕ 閉じる</button>`;ov.onclick=()=>ov.remove();document.body.appendChild(ov)}
async function importPerson(o){
 const C=cal(),n=baseNm(o.name||"");if(!n)throw new Error("名前がありません");
 const had=C.staff.includes(n),p=prof(C,n),q=o.prof||{};if(!had)C.staff.push(n);
 for(const k of ["kana","nick","birth","blood","hc","bpH","bpL","tel","co","role"])if(q[k])p[k]=q[k];if(Array.isArray(q.trades)&&q.trades.length)p.trades=q.trades.map(t=>({n:String(t.n||""),since:String(t.since||"")})).filter(t=>t.n);if(q.em)p.em={...p.em,...q.em};
 const idm={};for(const x of o.photos||[]){const bin=atob(x.b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);const id=rid("p");idm[x.id]=id;await putPhoto({id,site:"person:"+n,t:Date.now(),blob:new Blob([u8],{type:x.type||"image/jpeg"})})}
 for(const l of q.lic||[]){const ph=(l.ph||[]).map(x=>idm[x]).filter(Boolean),old=p.lic.find(x=>x.n===l.n);if(old){if(l.no)old.no=l.no;old.ph.push(...ph)}else p.lic.push({n:l.n,no:l.no||"",ph})}
 for(const t of o.tags||[]){let x=C.tags.find(y=>y.n===t.n);if(!x){x={id:rid("t"),n:t.n,c:t.c||TAGC[C.tags.length%TAGC.length],hide:false};C.tags.push(x)}if(!p.tags.includes(x.id))p.tags.push(x.id)}
 calSave(C);return {n,had}}

/* ===== バックアップ ===== */
const b64=blob=>new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(",")[1]);r.readAsDataURL(blob)});
async function exportAll(){
 const sites=await allSites(),photos=[],pids=[];for(const s of sites)pids.push(...s.park.photos);for(const q of Object.values(cal().prof))for(const l of q.lic||[])pids.push(...(l.ph||[]));for(const pid of pids){const p=await getPhoto(pid);if(p)photos.push({id:p.id,site:p.site,t:p.t,type:p.blob.type,b64:await b64(p.blob)})}
 const d=new Date(),nm=`現場バックアップ_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}.json`;
 const f=new File([JSON.stringify({app:"genba",v:1,t:Date.now(),sites,photos,cal:cal()})],nm,{type:"application/json"});
 await shareFiles([f],"現場バックアップ");
}
async function importAll(file){
 try{const o=JSON.parse(await file.text());if(o.app==="genba-person"){const r=await importPerson(o);toast(r.had?`${r.n}さんの情報を足しました`:`${r.n}さんを入れました`);if(location.hash.startsWith("#w"))renderWeek();else go("w"+monday());return}if(o.app!=="genba"||!Array.isArray(o.sites))throw new Error("現場のバックアップではありません");
  let n=0;for(const s of o.sites){if(!s||!s.id)continue;const old=await getSite(s.id);if(old&&old.updated>=s.updated)continue;await putSite(s);n++}
  for(const p of o.photos||[]){if(await getPhoto(p.id))continue;const bin=atob(p.b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);await putPhoto({id:p.id,site:p.site,t:p.t,blob:new Blob([u8],{type:p.type||"image/jpeg"})})}
  if(o.cal&&typeof o.cal==="object"){const C=cal();for(const n of o.cal.staff||[])if(!C.staff.includes(n))C.staff.push(n);for(const n of o.cal.helpers||[])if(!C.helpers.includes(n)&&!C.staff.includes(n))C.helpers.push(n);for(const [y,a] of Object.entries(o.cal.off||{}))C.off[y]=[...new Set([...(C.off[y]||[]),...a])];for(const t of o.cal.tags||[])if(!C.tags.some(x=>x.id===t.id))C.tags.push(t);for(const [k,q] of Object.entries(o.cal.prof||{}))if(!C.prof[k])C.prof[k]=q;calSave(C)}
  toast(`読み込みました（新しい・更新された現場 ${n}件）`);if(location.hash)go("");else renderList()}
 catch(e){toast("読み込めませんでした："+(e.message||e))}
}

window.addEventListener("pagehide",()=>{if(cur){clearTimeout(saveT);putSite(cur)}});
route();
