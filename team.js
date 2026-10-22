/* LINEでログインして「チームに送る」と、誰が見たか（開いた／✅確認しました／いま見ています）。曲げ共有（index.html）と 現場（genba.html）で使う
   ・LINE：LIFF（LINE MINI App「冷媒配管曲げ共有」）。最初だけLINEの名前を読み込み、仕事用の名前に変えられる（LINEのアイコン・ID・LINEの名前は保存しない）
   ・チーム：送ったリンクを開いた人は自動でチームに入る（リンクが合言葉の代わり）。名簿があるので「まだ開いていない人」も分かる。曲げと現場でチームは共通
   ・保存先：図面編集（cad）と同じ Firebase（守りのルールは cad/firestore.rules の teams）。仕事用の名前・時刻・送った中身だけ
     曲げ：曲げデータ（今までのリンク共有と同じ物）。現場：現場カード（「自分用メモ」と写真は送らない）
   ・今までの送り方（リンクにデータを入れる・文章を送る）はそのまま。ここは足すだけ（core.js・genba.js は変えない）
   ・LINEのリンクは本番の入口（index.html）に届く。現場のリンク（k=g）なら genba.html へ移る
   テスト用：window.__LIFFMOCK・window.__FXMOCK があればそれを使う */
(function(){
const PAGE=typeof APP!=="undefined"&&APP==="bend"?"bend":(typeof renderEdit==="function"&&typeof putSite==="function"?"genba":"");
if(!PAGE)return;
const LIFF_IDS={dev:"2012159797-ecQ5rVYs",pub:"2012159799-UhRKMF8r"};
const LIFF_ID=LIFF_IDS.pub;   // 公開用（だれでも使える）。dev は自分とテスターだけ（公開用で始められない時だけ dev で続ける）
const LIFF_SDK="https://static.line-scdn.net/liff/edge/2/sdk.js";
const FB_CFG={"apiKey":"AIzaSyCnvx6kB7rR9L6QHYrjzS3mEBaqtL7LJnI","authDomain":"setubi-zumen.firebaseapp.com","projectId":"setubi-zumen","storageBucket":"setubi-zumen.firebasestorage.app","messagingSenderId":"337675527486","appId":"1:337675527486:web:3c4d16c3d838b66185386f"};
const FB_V="https://www.gstatic.com/firebasejs/10.14.1/";
const LIVE=70000;   // 最後の知らせから70秒以内なら「いま見ています」（開いている間は30秒ごとに知らせる）
const q=s=>document.querySelector(s);
const say=m=>{try{toast(m)}catch(e){}};
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k)||"";localStorage.setItem(k,v)}catch(e){return ""}};
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rid=n=>{const a="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789",r=new Uint8Array(n);crypto.getRandomValues(r);return [...r].map(x=>a[x%a.length]).join("")};
const hm=t=>{const d=new Date(t);return (d.getMonth()+1)+"/"+d.getDate()+" "+d.getHours()+":"+String(d.getMinutes()).padStart(2,"0")};
/* 下から出る画面（どちらのページでも使えるように、ここに持つ） */
function sheet(html,btns){const ov=document.createElement("div");ov.className="tmSheet";ov.style.cssText="position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center";
 ov.innerHTML=`<div style="background:#fff;color:#0f172a;width:100%;max-width:520px;border-radius:18px 18px 0 0;padding:16px 16px calc(env(safe-area-inset-bottom,0px) + 16px);font-size:14.5px;line-height:1.6">${html}<div class="smb" style="display:flex;flex-direction:column;gap:8px;margin-top:12px"></div></div>`;
 const B=ov.querySelector(".smb");btns.forEach(([t,f,bg,fg])=>{const b=document.createElement("button");b.textContent=t;b.style.cssText=`min-height:48px;border-radius:12px;font-weight:800;font-size:15px;border:0;background:${bg||"#e2e8f0"};color:${fg||"#0f172a"}`;b.onclick=()=>{ov.remove();f&&f()};B.appendChild(b)});
 document.body.appendChild(ov);return ov}

/* ---------- Firebase（匿名でログイン。この端末の印だけで、個人の情報は入らない） ---------- */
let FX=null,fxP=null;
function fx(){if(FX)return Promise.resolve(FX);if(!fxP)fxP=(window.__FXMOCK?window.__FXMOCK():fxReal()).then(f=>FX=f).catch(e=>{fxP=null;throw e});return fxP}
async function fxReal(){
 const [A,Au,F]=await Promise.all([import(FB_V+"firebase-app.js"),import(FB_V+"firebase-auth.js"),import(FB_V+"firebase-firestore.js")]);
 const app=A.initializeApp(FB_CFG,"team"),db=F.getFirestore(app),auth=Au.getAuth(app);
 const u=await new Promise((res,rej)=>{let tried=false;const off=Au.onAuthStateChanged(auth,x=>{if(x){off();res(x)}else if(!tried){tried=true;Au.signInAnonymously(auth).catch(e=>{off();rej(e)})}},rej)});
 const R=p=>F.doc(db,p);
 return{uid:u.uid,
  get:async p=>{const s=await F.getDoc(R(p));return s.exists()?s.data():null},
  set:(p,d,m)=>F.setDoc(R(p),d,m?{merge:true}:{}),
  list:async(p,n)=>{const c=F.collection(db,p),s=await F.getDocs(n?F.query(c,F.orderBy("at","desc"),F.limit(n)):c);return s.docs.map(d=>({id:d.id,data:d.data()}))}};
}

/* ---------- LINE（LIFF）：名前を読み込むだけ ---------- */
let LF=null;
function liffSdk(){if(window.__LIFFMOCK)return Promise.resolve(window.__LIFFMOCK);if(window.liff)return Promise.resolve(window.liff);
 return new Promise((res,rej)=>{const s=document.createElement("script");s.src=LIFF_SDK;s.onload=()=>res(window.liff);s.onerror=rej;document.head.appendChild(s)})}
async function liffName(){
 const l=await liffSdk();if(!LF){try{await l.init({liffId:LIFF_ID})}catch(e){console.warn("liff pub",e);await l.init({liffId:LIFF_IDS.dev})}LF=l}
 if(!l.isLoggedIn()){l.login({redirectUri:location.href});return new Promise(()=>{})}   // LINEのログインへ（戻ってきたら続きから）
 try{const p=await l.getProfile();return p.displayName||""}catch(e){return ""}
}

/* ---------- 仕事用の名前（最初だけLINEの名前を出して、そのまま／書き換え） ---------- */
const myName=()=>ls("pbm_me");
function askName(def,first){return new Promise(res=>{let inp=null;
 const ok=()=>{const v=(inp.value||"").trim().slice(0,20)||def||"名前なし";ls("pbm_me",v);res(v)};
 const ov=sheet(`<b style="font-size:17px">👤 仕事で使う名前</b><p style="margin:4px 0 8px">チームの人に見える名前です。${first?"LINEの名前のままでよければ、そのまま押してください。":""}あとから「👀 見た人を確認」で変えられます。</p><input id="tmName" maxlength="20" value="${esc(def)}" placeholder="例：山田（設備）" style="width:100%;height:50px;border:1.5px solid #cbd5e1;border-radius:12px;padding:0 12px;font-size:17px;color:#0f172a;background:#fff">`,[["✅ この名前にする",ok,"#16a34a","#fff"]]);
 inp=ov.querySelector("#tmName");inp.addEventListener("keydown",e=>{if(e.key==="Enter"){ov.remove();ok()}});
})}
async function ready(){if(myName())return myName();const n=await liffName();return askName(n,true)}

/* ---------- チーム（送ったリンクを開いた人が入る） ---------- */
async function joinTeam(tid){const f=await fx();await f.set(`teams/${tid}/members/${f.uid}`,{name:myName(),at:Date.now()},true);ls("pbm_team",tid)}
async function myTeam(){
 const f=await fx();let tid=ls("pbm_team");
 if(tid){try{if(await f.get("teams/"+tid)){await joinTeam(tid);return tid}}catch(e){}}
 tid=rid(16);await f.set("teams/"+tid,{owner:f.uid,at:Date.now()});await joinTeam(tid);return tid;
}

/* ---------- 送る中身（ページごと） ---------- */
function payload(){
 if(PAGE==="bend")return{k:"b",title:[st.info.site,st.info.line].filter(Boolean).join(" ")||"曲げデータ",d:JSON.stringify(shareData())};
 const s=JSON.parse(JSON.stringify(cur));s.memo="";s.park.photos=[];   // 自分用メモと写真は送らない
 return{k:"g",title:(s.name||"現場")+(s.date?"（"+dateTxt(s.date)+"）":""),d:JSON.stringify(s)};
}

/* ---------- 送る（チームに置いて、LINEでリンクを送る） ---------- */
async function sendTeam(){
 closeSheets();say("準備しています…");
 try{
  if(PAGE==="genba"&&!cur){say("送る現場を開いてください");return}
  await ready();const tid=await myTeam(),f=await fx(),sid=rid(12),P=payload();
  await f.set(`teams/${tid}/shares/${sid}`,{k:P.k,title:P.title,by:f.uid,byName:myName(),at:Date.now(),d:P.d});
  const url=`https://miniapp.line.me/${LIFF_ID}?tm=${tid}&sh=${sid}&k=${P.k}`;
  const text=`${P.k==="g"?"📋":"📐"} ${P.title}（${myName()}）\n見たら「✅ 確認しました」を押してください\n${url}`;
  /* LINEを開くのはボタンを押した時（iPhoneは、押した直後でないとLINEへ移れない）。アプリの画面はそのまま残す */
  sheet(`<b style="font-size:17px">👥 チームに送る準備ができました</b><p style="margin-top:6px">LINEで送り先（グループなど）を選んでください。開いた人は自動でチームに入り、誰が見たかが「👀 見た人を確認」で分かります。</p>`,
   [["LINEで送る",()=>{const u="https://line.me/R/share?text="+encodeURIComponent(text);let w=null;try{w=window.open(u,"_blank")}catch(e){}if(!w)location.href=u},"#06c755","#fff"],["📋 リンクをコピー",async()=>{try{await navigator.clipboard.writeText(text);say("コピーしました")}catch(e){say("コピーできませんでした")}}],["閉じる"]]);
 }catch(e){console.warn("team send",e);say("送れませんでした（電波・LINEのログインを確かめてください）")}
}

/* ---------- 開いた時（送られたリンク）：読み込み・開いた記録・いま見ています・確認しましたボタン ---------- */
let CUR=null,beatT=0;
function params(){const u=new URLSearchParams(location.search);let tm=u.get("tm"),sh=u.get("sh"),k=u.get("k");const s=u.get("liff.state");
 if((!tm||!sh)&&s){const p=new URLSearchParams(s.replace(/^[^?]*\?/,""));tm=p.get("tm");sh=p.get("sh");k=p.get("k")}
 return /^[A-Za-z0-9]{8,32}$/.test(tm||"")&&/^[A-Za-z0-9]{8,32}$/.test(sh||"")?{tm,sh,k:k==="g"?"g":"b"}:null}
const toGenba=(tm,sh)=>location.replace("genba.html?tm="+tm+"&sh="+sh+"&k=g");
async function loadInto(s,sid){
 let d=null;try{d=JSON.parse(s.d)}catch(e){}if(!d)return false;
 if(PAGE==="bend"){if(!applyData(d))return false;try{history.replaceState(null,"",location.pathname)}catch(e){}return true}
 /* 現場：受け取った現場カードとして保存（同じ物をもう一度開いたら上書き。自分で書いた自分用メモは残す） */
 const id="t"+sid,old=await getSite(id).catch(()=>null);
 const n=Object.assign(newSite(),d,{id,updated:Date.now(),memo:old?old.memo:"",from:s.byName});n.park=Object.assign({note:"",lat:null,lng:null,url:"",photos:[]},d.park||{},{photos:old?old.park.photos:[]});
 await putSite(n);try{history.replaceState(null,"",location.pathname+"#"+id)}catch(e){}await route();return true;
}
async function openShared(tid,sid,k){
 if(k==="g"&&PAGE==="bend"){toGenba(tid,sid);return}
 try{
  await ready();await joinTeam(tid);
  const f=await fx(),s=await f.get(`teams/${tid}/shares/${sid}`);
  if(!s){say("送られたデータが見つかりません");return}
  if((s.k||"b")==="g"&&PAGE==="bend"){toGenba(tid,sid);return}
  if(!(await loadInto(s,sid))){say("読み込めませんでした");return}
  const vp=`teams/${tid}/shares/${sid}/views/${f.uid}`,v=await f.get(vp),now=Date.now();
  CUR={tid,sid,vp,title:s.title,by:s.byName,ok:v&&v.ok||0};
  await f.set(vp,{name:myName(),open:v&&v.open||now,last:now,ok:CUR.ok},true);   // 開いた（ボタンを押さなくても記録）
  banner();beat();
  say("送られた「"+s.title+"」を開きました");
 }catch(e){console.warn("team open",e);say("開けませんでした（電波を確かめてください）")}
}
async function beat(){clearTimeout(beatT);if(!CUR)return;if(!document.hidden){try{const f=await fx();await f.set(CUR.vp,{last:Date.now(),name:myName()},true)}catch(e){}}beatT=setTimeout(beat,30000)}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&CUR)beat()});
async function confirmSeen(){if(!CUR)return;try{const f=await fx(),t=Date.now();await f.set(CUR.vp,{ok:t,last:t,name:myName()},true);CUR.ok=t;banner();say("「確認しました」を送りました")}catch(e){say("送れませんでした（電波を確かめてください）")}}
function banner(){
 let b=document.getElementById("tmBan");if(!CUR){if(b)b.remove();return}
 if(!b){b=document.createElement("div");b.id="tmBan";b.style.cssText="position:fixed;left:10px;right:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 140px);z-index:58;display:flex;align-items:center;gap:8px;background:#0f172af2;color:#fff;border-radius:14px;padding:8px 8px 8px 12px;font-size:14px;font-weight:700;box-shadow:0 6px 20px #0005";document.body.appendChild(b)}
 b.innerHTML=`<span style="flex:1;min-width:0;line-height:1.35">${PAGE==="genba"?"📋":"📐"} ${esc(CUR.title)}<br><small style="opacity:.8">${esc(CUR.by)}さんから</small></span>`+
  (CUR.ok?`<span style="height:44px;display:flex;align-items:center;padding:0 10px;border-radius:12px;background:#334155;font-size:13.5px">✅ 確認済み ${hm(CUR.ok)}</span>`:`<button id="tmOk" style="height:44px;padding:0 14px;border-radius:12px;border:0;background:#22c55e;color:#fff;font-weight:900;font-size:15px">✅ 確認しました</button>`)+
  `<button id="tmX" aria-label="閉じる" style="width:40px;height:44px;border:0;background:none;color:#cbd5e1;font-size:18px">✕</button>`;
 const o=b.querySelector("#tmOk");if(o)o.onclick=confirmSeen;b.querySelector("#tmX").onclick=()=>b.remove();
}

/* ---------- 見た人を確認（送った物ごとに、チームの人の様子。曲げも現場も一緒に） ---------- */
async function openStatus(){
 closeSheets();const tid=ls("pbm_team");
 if(!tid){say("まだチームに送っていません（「👥 チームに送る」から）");return}
 let ov=null;
 const draw=async()=>{
  try{
   const f=await fx(),[mem,sh]=await Promise.all([f.list(`teams/${tid}/members`),f.list(`teams/${tid}/shares`,10)]);
   const now=Date.now(),names={};mem.forEach(m=>names[m.id]=m.data.name||"名前なし");
   const parts=await Promise.all(sh.map(async x=>{
    const vs=await f.list(`teams/${tid}/shares/${x.id}/views`),V={};vs.forEach(v=>V[v.id]=v.data);
    const who=Object.keys(names).filter(u=>u!==x.data.by);Object.keys(V).forEach(u=>{if(u!==x.data.by&&!who.includes(u))who.push(u)});
    const row=u=>{const v=V[u],n=esc((v&&v.name)||names[u]||"名前なし");
     if(v&&v.ok)return [0,`✅ ${n}　確認しました ${hm(v.ok)}`+(now-v.last<LIVE?"　🟢 いま見ています":"")];
     if(v&&now-v.last<LIVE)return [1,`🟢 ${n}　いま見ています（確認ボタンはまだ）`];
     if(v)return [2,`👀 ${n}　開いただけ ${hm(v.open)}（確認ボタンはまだ）`];
     return [3,`⬜ ${n}　まだ開いていません`]};
    const rs=who.map(row).sort((a,b)=>a[0]-b[0]),cnt=rs.filter(r=>r[0]===0).length;
    return `<div style="border-top:1px solid #e2e8f0;padding:8px 0"><b>${x.data.k==="g"?"📋 現場":"🔧 曲げ"}：${esc(x.data.title)}</b> <small style="color:#64748b">${hm(x.data.at)}・${esc(x.data.byName)}　確認 ${cnt}/${rs.length}</small>`+
     (rs.length?rs.map(r=>`<div style="font-size:13.5px;padding:2px 0 2px 8px">${r[1]}</div>`).join(""):`<div style="font-size:13px;color:#64748b;padding-left:8px">まだ誰も開いていません（チームの人はリンクを開くと入ります）</div>`)+`</div>`}));
   const body=ov&&ov.querySelector("#tmList");if(body)body.innerHTML=parts.join("")||`<div style="color:#64748b">まだ送った物がありません</div>`;
  }catch(e){const body=ov&&ov.querySelector("#tmList");if(body)body.innerHTML=`<div style="color:#b91c1c">読み込めませんでした（電波を確かめてください）</div>`}
 };
 let tmr=0;const stop=()=>clearInterval(tmr);
 ov=sheet(`<b style="font-size:17px">👀 見た人を確認</b><div style="font-size:13px;color:#475569;margin:2px 0 6px">✅確認しました　🟢いま見ています　👀開いただけ　⬜まだ　（20秒ごとに更新）<br>あなたの名前：<b>${esc(myName()||"未設定")}</b></div><div id="tmList" style="max-height:55vh;overflow-y:auto">読み込み中…</div>`,
  [["👤 名前を変える",async()=>{stop();const n=await askName(myName(),false);try{const f=await fx();await f.set(`teams/${tid}/members/${f.uid}`,{name:n,at:Date.now()},true);say("名前を「"+n+"」にしました")}catch(e){}}],["閉じる",stop]]);
 draw();tmr=setInterval(()=>{if(!document.body.contains(ov))return stop();draw()},20000);
}

/* ---------- ボタン ---------- */
function closeSheets(){["#shareOv","#cloudOv"].forEach(s=>{const e=q(s);if(e)e.classList.remove("on")})}
function mk(cls,txt,css,fn){const b=document.createElement("button");b.className=cls;b.style.cssText=css;b.textContent=txt;b.onclick=fn;return b}
if(PAGE==="bend"){
 /* 曲げ共有：📤（送る・読み込む）と 保存・共有の画面に足す */
 const add=after=>{const a=q(after);if(a)a.after(mk("sharebtn tmSend","👥 チームに送る（誰が見たか分かる・LINE）","background:#06c755;color:#fff",sendTeam),mk("sharebtn tmStat","👀 見た人を確認","background:#ecfdf5;color:#065f46",openStatus))};
 add("#shSend");add("#shareLink");
 /* 短いリンク：今までの長いリンク（#z= に曲げデータを全部入れた物）は、LINE で途中が「…」と切られて Android で開けない。
    曲げデータを Firebase に置いて「…/?s=番号」の短いリンクにする。作れない時（電波が無い等）は今までの長いリンクのまま。
    iPhone は押してから時間がたつと共有画面を出せないので、📤・保存の画面を開いた時に先に作っておく */
 const longLink=shareLinkZ,SL={code:"",url:"",p:null};
 const wait=(p,ms)=>Promise.race([p,new Promise((_,ng)=>setTimeout(()=>ng(new Error("timeout")),ms))]);
 const makeShort=code=>{if(SL.code===code&&(SL.url||SL.p))return SL.p||Promise.resolve(SL.url);SL.code=code;SL.url="";
  SL.p=(async()=>{const f=await fx(),id=rid(10);await f.set("links/"+id,{z:code,at:Date.now()});SL.url=APP_URL+"?s="+id;return SL.url})().catch(e=>{if(SL.code===code)SL.code="";throw e}).finally(()=>{SL.p=null});return SL.p};
 window.shareLinkZ=async function(){const L=await longLink(),code=L.split("#z=")[1];if(!code)return L;try{return await wait(makeShort(code),2500)}catch(e){return L}};
 const pre=async()=>{try{const L=await longLink();makeShort(L.split("#z=")[1]).catch(()=>{})}catch(e){}};
 ["#shareOv","#cloudOv"].forEach(s=>{const e=q(s);if(e)new MutationObserver(()=>{if(e.classList.contains("on"))pre()}).observe(e,{attributes:true,attributeFilter:["class"]})});
 /* 短いリンクを開いた時 */
 const sid=new URLSearchParams(location.search).get("s");
 if(/^[A-Za-z0-9]{6,20}$/.test(sid||""))setTimeout(async()=>{
  try{const f=await fx(),x=await f.get("links/"+sid);if(!x||!x.z){say("リンクの曲げデータが見つかりません");return}
   if(applyData(await decZ(x.z))){try{history.replaceState(null,"",location.pathname)}catch(e){}say("送られたプランを開きました")}else say("リンクのデータを読めませんでした")}
  catch(e){console.warn("short link",e);say("開けませんでした（電波を確かめてください）")}},200);
}else{
 /* 現場：カードの下の段に「👥 チームに送る」、一覧に「👀 見た人を確認」（genba.js の画面作りの後に足す） */
 const re=renderEdit,rl=renderList;
 window.renderEdit=function(){re.apply(this,arguments);const bar=q(".bar");if(bar&&!bar.querySelector(".tmSend"))bar.prepend(mk("btn tmSend","👥 チームに送る","background:#06c755;border-color:#06c755;color:#fff",sendTeam))};
 window.renderList=async function(){await rl.apply(this,arguments);const h=q("#app h1");if(h&&!q("#app .tmStat"))h.after(mk("btn tmStat","👀 見た人を確認（チームに送った現場）","width:100%;margin:0 0 10px;background:#ecfdf5;border-color:#a7f3d0;color:#065f46",openStatus))};
 if(cur)window.renderEdit();else if(!location.hash)window.renderList();
}
const P=params();if(P)setTimeout(()=>openShared(P.tm,P.sh,P.k),PAGE==="bend"&&P.k==="g"?0:300);
window.__TM={sendTeam,openStatus,openShared,LIFF_ID,PAGE};   // 確認・テスト用
})();
