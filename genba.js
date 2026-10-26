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
 sec("📅 日時",d||s.time?[`${d}${s.end&&s.end>s.date?"〜"+dateTxt(s.end):""}${s.time?" "+timeTxt(s.time)+" 開始":""}`.trim()]:[]);
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
let cur=null,saveT=0,wk=null,backTo="";const urls=[];
function freeUrls(){while(urls.length)URL.revokeObjectURL(urls.pop())}
function save(){if(!cur)return;cur.updated=Date.now();clearTimeout(saveT);saveT=setTimeout(()=>putSite(cur).catch(()=>toast("保存できませんでした")),300)}
function go(id){location.hash=id?"#"+id:"";}
window.addEventListener("hashchange",route);
async function route(){clearTimeout(saveT);if(cur)await putSite(cur).catch(()=>{});const id=location.hash.slice(1);if(/^w\d{4}-\d\d-\d\d$/.test(id)){cur=null;wk=monday(id.slice(1));renderWeek();return}if(id){const s=await getSite(id);if(s){cur=s;renderEdit();return}}cur=null;renderList()}

async function renderList(){
 freeUrls();const ss=(await allSites()).sort((a,b)=>(b.date||"").localeCompare(a.date||"")||b.updated-a.updated);
 $("#app").innerHTML=`<h1><span class="grow">📋 現場</span><button class="btn pri" id="bNew">＋ 新しい現場</button></h1>
 <button class="btn" id="bWeek" style="width:100%;margin:0 0 4px">📅 週の割り振り（だれがどこ・休み・応援・人数）</button>
 ${ss.length?ss.map(s=>`<button class="site" data-id="${s.id}"><b>${esc(s.name||"（名前なし）")}</b><div class="sub">${esc(dateTxt(s.date))}${s.time?" "+timeTxt(s.time):""}${s.members.length?` ・ ${s.members.length}人`:""}${s.members.some(m=>m.star)?" ⭐"+esc(s.members.filter(m=>m.star).map(m=>m.n).join("・")):""}</div>${s.addr?`<div class="sub">📍 ${esc(s.addr)}</div>`:""}${s.need&&s.need.min?`<div class="need ${needSt(s,s.date).c}">${esc(needSt(s,s.date).t)}</div>`:""}</button>`).join(""):`<div class="empty">まだ現場がありません。<br>「＋ 新しい現場」で、現場名・住所・駐車場・メンバーなどを入れると、<br>LINEに送る文章を自動で作ります。</div>`}
 <div class="card"><h2>💾 バックアップ</h2><div class="note">現場のデータはこのiPhoneの中だけにあります。時々「書き出す」でファイルに残してください（写真も入ります）。</div>
 <div class="row" style="margin-top:8px"><button class="btn grow" id="bExp">書き出す</button><button class="btn grow" id="bImp">読み込む</button></div><input type="file" id="fImp" accept=".json,application/json" hidden></div>`;
 document.querySelector(".bar")?.remove();
 $("#bNew").onclick=async()=>{const s=newSite();await putSite(s);go(s.id)};
 $("#bWeek").onclick=()=>{backTo="";go("w"+monday())};
 $("#app").querySelectorAll(".site").forEach(b=>b.onclick=()=>go(b.dataset.id));
 $("#bExp").onclick=exportAll;$("#bImp").onclick=()=>$("#fImp").click();$("#fImp").onchange=e=>{const f=e.target.files[0];e.target.value="";if(f)importAll(f)};
}

const FIELD=(id,label,ph,area)=>`<label class="f" for="${id}">${label}</label>${area?`<textarea id="${id}" placeholder="${esc(ph)}"></textarea>`:`<input id="${id}" placeholder="${esc(ph)}">`}`;
function renderEdit(){
 const s=cur;freeUrls();
 $("#app").innerHTML=`<h1><button class="btn sm" id="bBack">${backTo?"← 週の割り振り":"← 一覧"}</button><span class="grow"></span><button class="btn sm" id="bDup">複製</button><button class="btn sm del" id="bDel">削除</button></h1>
 <div class="card"><h2>📅 日時・🏭 現場</h2>
  <div class="row"><div class="grow"><label class="f" for="fDate">日付</label><input id="fDate" type="date"></div><div style="width:120px"><label class="f" for="fTime">開始</label><input id="fTime" type="time"></div></div>
  <label class="f" for="fEnd">終わりの日（何日かかる時だけ）</label><input id="fEnd" type="date">
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
 <div class="card"><h2>🔧 作業内容</h2>${FIELD("fWork","1行に1つ（→ で始めると前の行の続き）","天吊10馬力の入替\n口元流用\nガス回収\n→ 必要なら新しい物に交換",true)}</div>
 <div class="card"><h2>🎒 持ち物・服装</h2>${FIELD("fBring","持ってきてほしい物（1行に1つ）","上履き\nヘルメット",true)}${FIELD("fProv","こちらで用意する物（※が付きます）","白衣などは小川設備で用意します",true)}</div>
 <div class="card"><h2>🔌 道具について</h2>${FIELD("fBorrow","","電動工具や脚立をお借りするかもしれません",true)}</div>
 <div class="card"><h2>⏰ 当日の予定</h2>${FIELD("fPlan","","その日のうちに終わらせる作業です。\n残業をお願いするかもしれません。",true)}</div>
 <div class="card"><h2>📝 自分用メモ</h2>${FIELD("fMemo","LINEの文章には入りません","",true)}</div>
 <div class="card"><h2>💬 LINEに送る文章</h2><pre class="out" id="out"></pre>
  <div class="row" style="margin-top:8px"><button class="btn grow" id="bCopy">📋 コピー</button><button class="btn grow" id="bCal">📅 カレンダーに追加</button></div></div>`;
 const bar=document.querySelector(".bar")||document.body.appendChild(Object.assign(document.createElement("div"),{className:"bar"}));
 bar.innerHTML=`<button class="btn line" id="bSend">💬 文章を送る</button><button class="btn" id="bSendPh">🅿️ 写真を送る</button>`;
 const F={fDate:"date",fEnd:"end",fTime:"time",fName:"name",fAddr:"addr",fWork:"work",fBring:"bring",fProv:"provided",fBorrow:"borrow",fPlan:"plan",fMemo:"memo"};
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
 $("#bBack").onclick=()=>{const b=backTo;backTo="";go(b)};
 if(!s.need)s.need={min:0,plus:0};if(!s.help)s.help=[];
 const fm=$("#fMin"),fp=$("#fPlus");fm.value=s.need.min||"";fp.value=s.need.plus||"";
 fm.oninput=()=>{s.need.min=Math.max(0,parseInt(fm.value)||0);save();upd()};fp.oninput=()=>{s.need.plus=Math.max(0,parseInt(fp.value)||0);save();upd()};
 $("#bHelp").onclick=()=>{s.help.push({co:"",n:1});save();renderHelps();upd();const a=$("#helps").querySelectorAll("input[data-co]");a[a.length-1]?.focus()};
 $("#bDup").onclick=async()=>{const n={...JSON.parse(JSON.stringify(s)),id:rid("s"),created:Date.now(),updated:Date.now()};n.park.photos=[];for(const pid of s.park.photos){const p=await getPhoto(pid);if(p){const id=rid("p");await putPhoto({...p,id,site:n.id});n.park.photos.push(id)}}await putSite(n);toast("複製しました（日付を直してください）");go(n.id)};
 $("#bDel").onclick=async e=>{const b=e.currentTarget;if(!b.dataset.ok){b.dataset.ok="1";b.textContent="本当に削除";setTimeout(()=>{b.dataset.ok="";b.textContent="削除"},3000);return}clearTimeout(saveT);for(const pid of s.park.photos)await delPhoto(pid).catch(()=>{});await delSite(s.id);cur=null;toast("削除しました");go("")};
 $("#bCopy").onclick=()=>copyText(lineText(s));
 $("#bSend").onclick=()=>shareText(lineText(s));
 $("#bSendPh").onclick=async()=>{const fs=[];for(const [i,pid] of s.park.photos.entries()){const p=await getPhoto(pid);if(p)fs.push(new File([p.blob],`駐車場${i+1}.jpg`,{type:"image/jpeg"}))}if(!fs.length){toast("駐車場の写真がありません");return}shareFiles(fs,"駐車場")};
 $("#bCal").onclick=()=>{const u=calUrl(s);if(!u){toast("日付を入れてください");return}window.open(u,"_blank")};
 renderMems();renderHelps();renderPhotos();upd();
}
function renderHelps(){
 const s=cur,box=$("#helps");box.innerHTML=s.help.length?s.help.map((h,i)=>`<div class="mem"><input data-co="${i}" placeholder="会社名（例：〇〇設備）" value="${esc(h.co)}" class="grow"><input data-hn="${i}" type="number" inputmode="numeric" min="0" value="${esc(h.n)}" style="width:64px"><span>名</span><button class="btn sm del" data-rmh="${i}" aria-label="外す">✕</button></div>`).join(""):`<div class="note">いません</div>`;
 box.oninput=e=>{const t=e.target;if(t.dataset.co!=null)s.help[+t.dataset.co].co=t.value;else if(t.dataset.hn!=null)s.help[+t.dataset.hn].n=Math.max(0,parseInt(t.value)||0);save();upd()};
 box.onclick=e=>{const b=e.target.closest("[data-rmh]");if(!b)return;s.help.splice(+b.dataset.rmh,1);save();renderHelps();upd()};
}
function addMem(v){v=v.trim();if(!v)return;cur.members.push({n:v,star:false});people(v);$("#fMem").value="";save();renderMems();upd()}
function renderMems(){
 const s=cur;$("#mems").innerHTML=s.members.length?s.members.map((m,i)=>`<div class="mem"><button class="star ${m.star?"on":""}" data-st="${i}" aria-label="現調に行った人">⭐</button><span class="nm">${esc(m.n)}${m.d?`<small class="dd">（${esc(m.d.map(x=>+x.slice(8)+"日").join("・"))}だけ）</small>`:""}</span><button class="btn sm" data-up="${i}" aria-label="上へ" ${i?"":"disabled"}>↑</button><button class="btn sm del" data-rm="${i}" aria-label="外す">✕</button></div>`).join(""):`<div class="note">まだいません。下で名前を入れて「追加」。</div>`;
 const used=new Set(s.members.map(m=>m.n));$("#chips").innerHTML=people().filter(n=>!used.has(n)).slice(0,20).map(n=>`<button class="chip" data-add="${esc(n)}">＋ ${esc(n)}</button>`).join("");
 $("#mems").onclick=e=>{const b=e.target.closest("button");if(!b)return;const d=b.dataset;
  if(d.st!=null){s.members[+d.st].star=!s.members[+d.st].star}
  else if(d.up!=null){const i=+d.up;[s.members[i-1],s.members[i]]=[s.members[i],s.members[i-1]]}
  else if(d.rm!=null){s.members.splice(+d.rm,1)}
  save();renderMems();upd()};
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
function cal(){let o={};try{o=JSON.parse(localStorage.getItem("genba_cal")||"{}")}catch(e){}if(!Array.isArray(o.staff))o.staff=[];if(!o.off||typeof o.off!=="object")o.off={};return o}
function calSave(o){try{localStorage.setItem("genba_cal",JSON.stringify(o))}catch(e){toast("保存できませんでした")}}
const pad2=n=>String(n).padStart(2,"0"),ymdOf=d=>`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const dOf=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
function monday(s){const d=s?dOf(s):new Date();d.setDate(d.getDate()-(d.getDay()+6)%7);return ymdOf(d)}
function addDay(s,n){const d=dOf(s);d.setDate(d.getDate()+n);return ymdOf(d)}
const endOf=s=>s.end&&s.end>s.date?s.end:s.date;
const onDay=(s,y)=>!!s.date&&s.date<=y&&y<=endOf(s);
const memOn=(m,y)=>!m.d||m.d.includes(y);
const memN=m=>{const k=String(m.n).match(/[（(]\s*(\d+)\s*名\s*[)）]/);return k?+k[1]:1};   /* 「服部さん（3名）」は3人 */
const baseNm=n=>String(n).replace(/[（(]\s*\d+\s*名\s*[)）]/,"").trim();
const helps=s=>(s.help||[]).filter(h=>h.co.trim()||+h.n);
function headcount(s,y){return s.members.filter(m=>m.n.trim()&&memOn(m,y)).reduce((a,m)=>a+memN(m),0)+helps(s).reduce((a,h)=>a+(+h.n||0),0)}
function needSt(s,y){const nd=s.need||{},n=headcount(s,y);if(!nd.min)return {n,c:"",t:`${n}名`};
 if(n<nd.min)return {n,c:"ng",t:`🔴 ${n}名／最低${nd.min}名 ・あと${nd.min-n}名 足りない`};
 const want=nd.min+(+nd.plus||0);if(n<want)return {n,c:"mid",t:`🟡 ${n}名／最低${nd.min}名はOK ・余裕がないので あと${want-n}名ほしい`};
 return {n,c:"ok",t:`🟢 ${n}名／最低${nd.min}名${nd.plus?`＋${nd.plus}名`:""} 余裕あり`}}
const SC=["#0369a1","#b45309","#15803d","#7c3aed","#be123c","#0f766e","#a16207","#4338ca"];
async function weekData(){
 const C=cal(),days=[...Array(7)].map((_,i)=>addDay(wk,i)),ss=(await allSites()).filter(s=>days.some(y=>onDay(s,y))).sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.time||"").localeCompare(b.time||"")||a.created-b.created);
 ss.forEach(s=>{if(!s.need)s.need={min:0,plus:0};if(!s.help)s.help=[]});
 const at={};for(const s of ss)for(const m of s.members){const n=baseNm(m.n);if(!n)continue;for(const y of days)if(onDay(s,y)&&memOn(m,y))((at[n]=at[n]||{})[y]=at[n][y]||[]).push(s)}
 const names=C.staff.length?C.staff:Object.keys(at).filter(n=>ss.some(s=>s.members.some(m=>baseNm(m.n)===n&&memN(m)===1)));
 return {C,days,ss,at,names}}
async function renderWeek(){
 freeUrls();document.querySelector(".bar")?.remove();
 const {C,days,ss,at,names}=await weekData(),col=s=>SC[ss.indexOf(s)%SC.length],sn=s=>(s.name||"現場").trim().slice(0,3)||"現場";
 const ng=ss.filter(s=>days.some(y=>onDay(s,y)&&needSt(s,y).c==="ng")).length;
 const cell=(n,y)=>{const a=(at[n]||{})[y]||[],off=(C.off[y]||[]).includes(n);
  if(off&&a.length)return `<td class="c warn" data-n="${esc(n)}" data-y="${y}">休⚠️</td>`;
  if(off)return `<td class="c off" data-n="${esc(n)}" data-y="${y}">休</td>`;
  if(a.length>1)return `<td class="c warn" data-n="${esc(n)}" data-y="${y}">⚠️${a.length}</td>`;
  if(a.length)return `<td class="c" data-n="${esc(n)}" data-y="${y}" style="background:${col(a[0])};color:#fff">${esc(sn(a[0]))}</td>`;
  return `<td class="c" data-n="${esc(n)}" data-y="${y}"></td>`};
 const today=ymdOf(new Date());
 $("#app").innerHTML=`<h1><button class="btn sm" id="bBack">← 一覧</button><span class="grow"></span><button class="btn sm" id="bPrev">‹ 前の週</button><button class="btn sm" id="bThis">今週</button><button class="btn sm" id="bNext">次の週 ›</button></h1>
 <div class="card"><h2>📅 ${esc(dateTxt(days[0]))}〜${esc(dateTxt(days[6]))}</h2>
  ${ng?`<div class="need ng">🔴 人が足りない現場が ${ng}件 あります</div>`:ss.length?`<div class="need ok">🟢 足りない現場はありません</div>`:""}
  <h2 style="margin-top:10px">👷 だれがどこに</h2>
  ${names.length?`<div class="wtab"><table><tr><th></th>${days.map(y=>`<th class="${y===today?"td":""}">${+y.slice(8)}<br>${WD[dOf(y).getDay()]}</th>`).join("")}</tr>
  ${names.map(n=>`<tr><th class="nm">${esc(n)}</th>${days.map(y=>cell(n,y)).join("")}</tr>`).join("")}</table></div>
  <div class="note">マスをタップ → 現場に入れる・外す・休みにする。⚠️＝休みの日に入っている／2つの現場に入っている。</div>`:`<div class="note">下の「社員の名前」に名前を入れると、ここに表が出ます。</div>`}
  ${ss.length?`<div class="chips">${ss.map(s=>`<span class="chip" style="border-color:${col(s)}"><span style="color:${col(s)}">■</span> ${esc(s.name||"（名前なし）")}</span>`).join("")}</div>`:""}</div>
 ${days.map(y=>{const here=ss.filter(s=>onDay(s,y)),off=C.off[y]||[],busy=new Set(Object.keys(at).filter(n=>(at[n][y]||[]).length)),free=names.filter(n=>!busy.has(n)&&!off.includes(n));
  return `<div class="card day${y===today?" today":""}"><h2><span class="grow">${esc(dateTxt(y))}${y===today?" ・今日":""}</span><button class="btn sm" data-new="${y}">＋ 現場</button></h2>
  ${here.map(s=>{const st=needSt(s,y),mm=s.members.filter(m=>m.n.trim()&&memOn(m,y)),hp=helps(s);
   return `<button class="site" data-id="${s.id}" style="border-left:6px solid ${col(s)}"><b>${esc(s.name||"（名前なし）")}</b>${s.time&&y===s.date?` <span class="sub">${timeTxt(s.time)}〜</span>`:""}${endOf(s)!==s.date?` <span class="sub">（${+s.date.slice(8)}日〜${+endOf(s).slice(8)}日）</span>`:""}
   <div class="need ${st.c}">${esc(st.t)}</div>
   <div class="sub">👷 ${mm.length?esc(mm.map(m=>m.n.trim()+(m.star?"⭐":"")).join("・")):"まだだれも入っていません"}</div>
   ${hp.length?`<div class="sub">🤝 応援：${esc(hp.map(h=>`${h.co.trim()||"（会社名なし）"} ${+h.n||0}名`).join("・"))}</div>`:""}</button>`}).join("")||`<div class="note">現場なし</div>`}
  ${(()=>{const w=Object.keys(at).filter(n=>(at[n][y]||[]).length&&(off.includes(n)||at[n][y].length>1));return w.length?`<div class="need ng">⚠️ ${esc(w.map(n=>n+(off.includes(n)?"（休みの日）":"（2つの現場）")).join("・"))}</div>`:""})()}
  ${off.length?`<div class="note">🏖 休み：${esc(off.join("・"))}</div>`:""}
  ${names.length&&here.length?`<div class="note">🙋 空いている人：${free.length?esc(free.join("・")):"いません"}</div>`:""}</div>`}).join("")}
 <div class="card"><h2>💬 この週の割り振りを送る</h2><pre class="out" id="out"></pre>
  <div class="row" style="margin-top:8px"><button class="btn grow" id="bCopy">📋 コピー</button><button class="btn line grow" id="bSend">💬 送る</button></div></div>
 <div class="card"><h2>👷 社員の名前（表に出す人）</h2><div class="note">会社のメンバーを入れておくと、だれが空いているか・休みかが分かります。応援さんは現場の「👥 人数・応援」に入れてください。</div>
  <div class="chips" id="staff">${C.staff.map((n,i)=>`<button class="chip" data-rs="${i}">${esc(n)} ✕</button>`).join("")||`<span class="note">まだいません</span>`}</div>
  <div class="row" style="margin-top:8px"><input id="fStaff" placeholder="名前（例：服部）" enterkeyhint="done"><button class="btn pri" id="bStaff">追加</button></div>
  <div class="chips" id="sugg">${[...new Set([...people().map(baseNm),...Object.keys(at)])].filter(n=>n&&!C.staff.includes(n)).slice(0,20).map(n=>`<button class="chip" data-as="${esc(n)}">＋ ${esc(n)}</button>`).join("")}</div></div>`;
 $("#out").textContent=weekText(C,days,ss);
 $("#bBack").onclick=()=>go("");
 $("#bPrev").onclick=()=>go("w"+addDay(wk,-7));$("#bNext").onclick=()=>go("w"+addDay(wk,7));$("#bThis").onclick=()=>go("w"+monday());
 $("#bCopy").onclick=()=>copyText(weekText(C,days,ss));$("#bSend").onclick=()=>shareText(weekText(C,days,ss));
 $("#app").querySelectorAll(".site").forEach(b=>b.onclick=()=>{backTo="w"+wk;go(b.dataset.id)});
 $("#app").querySelectorAll("[data-new]").forEach(b=>b.onclick=async()=>{const s=newSite();s.date=b.dataset.new;await putSite(s);backTo="w"+wk;go(s.id)});
 $("#app").querySelectorAll("td.c").forEach(td=>td.onclick=()=>pick(td.dataset.n,td.dataset.y,ss));
 const addStaff=v=>{v=baseNm(v||"");if(!v)return;const C2=cal();if(!C2.staff.includes(v))C2.staff.push(v);calSave(C2);renderWeek()};
 $("#bStaff").onclick=()=>addStaff($("#fStaff").value);$("#fStaff").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();addStaff($("#fStaff").value)}};
 $("#sugg").onclick=e=>{const b=e.target.closest("[data-as]");if(b)addStaff(b.dataset.as)};
 $("#staff").onclick=e=>{const b=e.target.closest("[data-rs]");if(!b)return;if(!b.dataset.ok){b.dataset.ok="1";b.textContent="消す？";setTimeout(()=>{if(b.isConnected){b.dataset.ok="";b.textContent=C.staff[+b.dataset.rs]+" ✕"}},2500);return}const C2=cal();C2.staff.splice(+b.dataset.rs,1);calSave(C2);renderWeek()};
}
/* 表のマスをタップ：その日の現場に入れる・外す、休み */
function pick(n,y,ss){
 const C=cal(),off=(C.off[y]||[]).includes(n),here=ss.filter(s=>onDay(s,y)),ov=document.createElement("div");ov.className="sheet";
 ov.innerHTML=`<div class="sbox"><h2>${esc(n)}　${esc(dateTxt(y))}</h2>
 ${here.map((s,i)=>{const on=s.members.some(m=>baseNm(m.n)===n&&memOn(m,y));return `<button class="btn ${on?"pri":""}" data-s="${i}">${on?"✓ ":""}🏭 ${esc(s.name||"（名前なし）")}${on?"（外す）":"に入れる"}</button>`}).join("")||`<div class="note">この日の現場はありません</div>`}
 <button class="btn ${off?"pri":""}" data-off="1">${off?"✓ 🏖 休み（消す）":"🏖 休みにする"}</button><button class="btn" data-x="1">閉じる</button></div>`;
 document.body.appendChild(ov);
 ov.onclick=async e=>{const b=e.target.closest("button");if(e.target===ov||(b&&b.dataset.x)){ov.remove();return}if(!b)return;
  if(b.dataset.off){const a=C.off[y]||[];C.off[y]=off?a.filter(x=>x!==n):[...a,n];if(!C.off[y].length)delete C.off[y];calSave(C)}
  else{const s=here[+b.dataset.s];toggleMem(s,n,y);await putSite(s)}
  ov.remove();renderWeek()};
}
function toggleMem(s,n,y){
 const span=[];for(let d=s.date;d<=endOf(s);d=addDay(d,1))span.push(d);
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
   L.push(`🏭 ${(s.name||"（名前なし）").trim()}${s.time&&y===s.date?" "+timeTxt(s.time)+"〜":""}`);
   L.push(`　＊${mm.length?mm.map(m=>m.n.trim()+(m.star?"⭐":"")).join("・"):"（まだ決まっていません）"}`);
   if(hp.length)L.push(`　＊応援：${hp.map(h=>`${h.co.trim()||"（会社名なし）"} ${+h.n||0}名`).join("・")}`);
   if(nd.min)L.push(`　＊${st.n}名／最低${nd.min}名${nd.plus?`（余裕がなければ＋${nd.plus}名）`:""}${st.c==="ng"?` 🔴あと${nd.min-st.n}名 足りない`:st.c==="mid"?` 🟡あと${nd.min+nd.plus-st.n}名ほしい`:""}`)}
  if(off.length)L.push("🏖 休み："+off.join("・"));
  L.push("")}
 if(L[L.length-1]==="")L.pop();if(L[L.length-1]!==SEP)L.push(SEP);
 L.push("","よろしくお願い致します🙏");return L.join("\n");
}

/* ===== バックアップ ===== */
const b64=blob=>new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(String(r.result).split(",")[1]);r.readAsDataURL(blob)});
async function exportAll(){
 const sites=await allSites(),photos=[];for(const s of sites)for(const pid of s.park.photos){const p=await getPhoto(pid);if(p)photos.push({id:p.id,site:p.site,t:p.t,type:p.blob.type,b64:await b64(p.blob)})}
 const d=new Date(),nm=`現場バックアップ_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}.json`;
 const f=new File([JSON.stringify({app:"genba",v:1,t:Date.now(),sites,photos,cal:cal()})],nm,{type:"application/json"});
 await shareFiles([f],"現場バックアップ");
}
async function importAll(file){
 try{const o=JSON.parse(await file.text());if(o.app!=="genba"||!Array.isArray(o.sites))throw new Error("現場のバックアップではありません");
  let n=0;for(const s of o.sites){if(!s||!s.id)continue;const old=await getSite(s.id);if(old&&old.updated>=s.updated)continue;await putSite(s);n++}
  for(const p of o.photos||[]){if(await getPhoto(p.id))continue;const bin=atob(p.b64),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);await putPhoto({id:p.id,site:p.site,t:p.t,blob:new Blob([u8],{type:p.type||"image/jpeg"})})}
  if(o.cal&&typeof o.cal==="object"){const C=cal();for(const n of o.cal.staff||[])if(!C.staff.includes(n))C.staff.push(n);for(const [y,a] of Object.entries(o.cal.off||{}))C.off[y]=[...new Set([...(C.off[y]||[]),...a])];calSave(C)}
  toast(`読み込みました（新しい・更新された現場 ${n}件）`);renderList()}
 catch(e){toast("読み込めませんでした："+(e.message||e))}
}

window.addEventListener("pagehide",()=>{if(cur){clearTimeout(saveT);putSite(cur)}});
route();
