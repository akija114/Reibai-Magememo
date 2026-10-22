/* 冷媒配管の曲げ共有：LINEでログインして「チームに送る」と、誰が見たか（開いた／✅確認しました／いま見ています）
   ・LINE：LIFF（LINE MINI App「冷媒配管曲げ共有」）。最初だけLINEの名前を読み込み、仕事用の名前に変えられる（LINEのアイコン・IDは保存しない）
   ・チーム：送ったリンクを開いた人は自動でチームに入る（リンクが合言葉の代わり）。名簿があるので「まだ開いていない人」も分かる
   ・保存先：図面編集（cad）と同じ Firebase（守りのルールは cad/firestore.rules の teams）。名前・時刻・送った曲げデータだけ
   ・今までの「リンクにデータを入れて送る」はそのまま。ここは足すだけ（core.js は変えない）
   テスト用：window.__LIFFMOCK・window.__FXMOCK があればそれを使う */
(function(){
if(typeof APP==="undefined"||APP!=="bend")return;
const LIFF_IDS={dev:"2012159797-ecQ5rVYs",pub:"2012159799-UhRKMF8r"};
const LIFF_ID=LIFF_IDS.dev;   // LINE Developers で「公開（Published）」にしたら pub に変える（dev は自分とテスターだけ使える）
const LIFF_SDK="https://static.line-scdn.net/liff/edge/2/sdk.js";
const FB_CFG={"apiKey":"AIzaSyCnvx6kB7rR9L6QHYrjzS3mEBaqtL7LJnI","authDomain":"setubi-zumen.firebaseapp.com","projectId":"setubi-zumen","storageBucket":"setubi-zumen.firebasestorage.app","messagingSenderId":"337675527486","appId":"1:337675527486:web:3c4d16c3d838b66185386f"};
const FB_V="https://www.gstatic.com/firebasejs/10.14.1/";
const LIVE=70000;   // 最後の知らせから70秒以内なら「いま見ています」（開いている間は30秒ごとに知らせる）
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k)||"";localStorage.setItem(k,v)}catch(e){return ""}};
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rid=n=>{const a="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789",r=new Uint8Array(n);crypto.getRandomValues(r);return [...r].map(x=>a[x%a.length]).join("")};
const hm=t=>{const d=new Date(t);return (d.getMonth()+1)+"/"+d.getDate()+" "+d.getHours()+":"+String(d.getMinutes()).padStart(2,"0")};

/* ---------- Firebase（匿名でログイン。この端末の印だけで、個人の情報は入らない） ---------- */
let FX=null,fxP=null;
function fx(){if(FX)return Promise.resolve(FX);if(!fxP)fxP=(window.__FXMOCK?window.__FXMOCK():fxReal()).then(f=>FX=f).catch(e=>{fxP=null;throw e});return fxP}
async function fxReal(){
 const [A,Au,F]=await Promise.all([import(FB_V+"firebase-app.js"),import(FB_V+"firebase-auth.js"),import(FB_V+"firebase-firestore.js")]);
 const app=A.initializeApp(FB_CFG,"bend"),db=F.getFirestore(app),auth=Au.getAuth(app);
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
 const l=await liffSdk();if(!LF){await l.init({liffId:LIFF_ID});LF=l}
 if(!l.isLoggedIn()){l.login({redirectUri:location.href});return new Promise(()=>{})}   // LINEのログインへ（戻ってきたら続きから）
 try{const p=await l.getProfile();return p.displayName||""}catch(e){return ""}
}

/* ---------- 仕事用の名前（最初だけLINEの名前を出して、そのまま／書き換え） ---------- */
const myName=()=>ls("pbm_me");
function askName(def,first){return new Promise(res=>{let inp=null;
 const ok=()=>{const v=(inp.value||"").trim().slice(0,20)||def||"名前なし";ls("pbm_me",v);res(v)};
 const ov=sheetMsg(`<b style="font-size:17px">👤 仕事で使う名前</b><p style="margin:4px 0 8px">チームの人に見える名前です。${first?"LINEの名前のままでよければ、そのまま押してください。":""}あとから「👀 見た人を確認」で変えられます。</p><input id="tmName" maxlength="20" value="${esc(def)}" placeholder="例：山田（設備）" style="width:100%;height:50px;border:1.5px solid #cbd5e1;border-radius:12px;padding:0 12px;font-size:17px;color:#0f172a;background:#fff">`,[["✅ この名前にする",ok,"#16a34a","#fff"]]);
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

/* ---------- 送る（チームに置いて、LINEでリンクを送る） ---------- */
async function sendTeam(){
 closeSheets();toast("準備しています…");
 try{
  await ready();const tid=await myTeam(),f=await fx(),sid=rid(12);
  const title=[st.info.site,st.info.line].filter(Boolean).join(" ")||"曲げデータ";
  await f.set(`teams/${tid}/shares/${sid}`,{title,by:f.uid,byName:myName(),at:Date.now(),d:JSON.stringify(shareData())});
  const url=`https://miniapp.line.me/${LIFF_ID}?tm=${tid}&sh=${sid}`;
  const text=`📐 ${title}（${myName()}）\n見たら「✅ 確認しました」を押してください\n${url}`;
  /* LINEを開くのはボタンを押した時（iPhoneは、押した直後でないとLINEへ移れない） */
  sheetMsg(`<b style="font-size:17px">👥 チームに送る準備ができました</b><p style="margin-top:6px">LINEで送り先（グループなど）を選んでください。開いた人は自動でチームに入り、誰が見たかが「👀 見た人を確認」で分かります。</p>`,
   [["LINEで送る",()=>{const u="https://line.me/R/share?text="+encodeURIComponent(text);let w=null;try{w=window.open(u,"_blank")}catch(e){}if(!w)location.href=u},"#06c755","#fff"],["📋 リンクをコピー",async()=>{try{await navigator.clipboard.writeText(text);toast("コピーしました")}catch(e){toast("コピーできませんでした")}}],["閉じる"]]);
 }catch(e){console.warn("team send",e);toast("送れませんでした（電波・LINEのログインを確かめてください）")}
}

/* ---------- 開いた時（送られたリンク）：読み込み・開いた記録・いま見ています・確認しましたボタン ---------- */
let CUR=null,beatT=0;
function params(){const q=new URLSearchParams(location.search);let tm=q.get("tm"),sh=q.get("sh");const s=q.get("liff.state");
 if((!tm||!sh)&&s){const p=new URLSearchParams(s.replace(/^[^?]*\?/,""));tm=p.get("tm");sh=p.get("sh")}
 return /^[A-Za-z0-9]{8,32}$/.test(tm||"")&&/^[A-Za-z0-9]{8,32}$/.test(sh||"")?{tm,sh}:null}
async function openShared(tid,sid){
 try{
  await ready();await joinTeam(tid);
  const f=await fx(),s=await f.get(`teams/${tid}/shares/${sid}`);
  if(!s){toast("送られたデータが見つかりません");return}
  let d=null;try{d=JSON.parse(s.d)}catch(e){}
  if(!d||!applyData(d)){toast("読み込めませんでした");return}
  try{history.replaceState(null,"",location.pathname)}catch(e){}
  const vp=`teams/${tid}/shares/${sid}/views/${f.uid}`,v=await f.get(vp),now=Date.now();
  CUR={tid,sid,vp,title:s.title,by:s.byName,ok:v&&v.ok||0,mine:s.by===f.uid};
  await f.set(vp,{name:myName(),open:v&&v.open||now,last:now,ok:CUR.ok},true);   // 開いた（ボタンを押さなくても記録）
  banner();beat();
  toast("送られた「"+s.title+"」を開きました");
 }catch(e){console.warn("team open",e);toast("開けませんでした（電波を確かめてください）")}
}
async function beat(){clearTimeout(beatT);if(!CUR)return;if(!document.hidden){try{const f=await fx();await f.set(CUR.vp,{last:Date.now(),name:myName()},true)}catch(e){}}beatT=setTimeout(beat,30000)}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&CUR)beat()});
async function confirmSeen(){if(!CUR)return;try{const f=await fx(),t=Date.now();await f.set(CUR.vp,{ok:t,last:t,name:myName()},true);CUR.ok=t;banner();toast("「確認しました」を送りました")}catch(e){toast("送れませんでした（電波を確かめてください）")}}
function banner(){
 let b=document.getElementById("tmBan");if(!CUR){if(b)b.remove();return}
 if(!b){b=document.createElement("div");b.id="tmBan";b.style.cssText="position:fixed;left:10px;right:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 140px);z-index:58;display:flex;align-items:center;gap:8px;background:#0f172af2;color:#fff;border-radius:14px;padding:8px 8px 8px 12px;font-size:14px;font-weight:700;box-shadow:0 6px 20px #0005";document.body.appendChild(b)}
 b.innerHTML=`<span style="flex:1;min-width:0;line-height:1.35">📋 ${esc(CUR.title)}<br><small style="opacity:.8">${esc(CUR.by)}さんから</small></span>`+
  (CUR.ok?`<span style="height:44px;display:flex;align-items:center;padding:0 10px;border-radius:12px;background:#334155;font-size:13.5px">✅ 確認済み ${hm(CUR.ok)}</span>`:`<button id="tmOk" style="height:44px;padding:0 14px;border-radius:12px;background:#22c55e;color:#fff;font-weight:900;font-size:15px">✅ 確認しました</button>`)+
  `<button id="tmX" aria-label="閉じる" style="width:40px;height:44px;color:#cbd5e1;font-size:18px">✕</button>`;
 const o=b.querySelector("#tmOk");if(o)o.onclick=confirmSeen;b.querySelector("#tmX").onclick=()=>b.remove();
}

/* ---------- 見た人を確認（送った物ごとに、チームの人の様子） ---------- */
async function openStatus(){
 closeSheets();const tid=ls("pbm_team");
 if(!tid){toast("まだチームに送っていません（「👥 チームに送る」から）");return}
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
    return `<div style="border-top:1px solid #e2e8f0;padding:8px 0"><b>📋 ${esc(x.data.title)}</b> <small style="color:#64748b">${hm(x.data.at)}・${esc(x.data.byName)}　確認 ${cnt}/${rs.length}</small>`+
     (rs.length?rs.map(r=>`<div style="font-size:13.5px;padding:2px 0 2px 8px">${r[1]}</div>`).join(""):`<div style="font-size:13px;color:#64748b;padding-left:8px">まだ誰も開いていません（チームの人はリンクを開くと入ります）</div>`)+`</div>`}));
   const body=ov&&ov.querySelector("#tmList");if(body)body.innerHTML=parts.join("")||`<div style="color:#64748b">まだ送った物がありません</div>`;
  }catch(e){const body=ov&&ov.querySelector("#tmList");if(body)body.innerHTML=`<div style="color:#b91c1c">読み込めませんでした（電波を確かめてください）</div>`}
 };
 let tmr=0;const stop=()=>clearInterval(tmr);
 ov=sheetMsg(`<b style="font-size:17px">👀 見た人を確認</b><div style="font-size:13px;color:#475569;margin:2px 0 6px">✅確認しました　🟢いま見ています　👀開いただけ　⬜まだ　（20秒ごとに更新）<br>あなたの名前：<b>${esc(myName()||"未設定")}</b></div><div id="tmList" style="max-height:55vh;overflow-y:auto">読み込み中…</div>`,
  [["👤 名前を変える",async()=>{stop();const n=await askName(myName(),false);try{const f=await fx();await f.set(`teams/${tid}/members/${f.uid}`,{name:n,at:Date.now()},true);toast("名前を「"+n+"」にしました")}catch(e){}}],["閉じる",stop]]);
 draw();tmr=setInterval(()=>{if(!document.body.contains(ov))return stop();draw()},20000);
}

/* ---------- ボタン：送る画面（📤）と 保存・共有の画面に足す ---------- */
function closeSheets(){["#shareOv","#cloudOv"].forEach(q=>{const e=$(q);if(e)e.classList.remove("on")})}
function addBtns(after){const a=$(after);if(!a)return;
 const b1=document.createElement("button");b1.className="sharebtn tmSend";b1.style.cssText="background:#06c755;color:#fff";b1.textContent="👥 チームに送る（誰が見たか分かる・LINE）";b1.onclick=sendTeam;
 const b2=document.createElement("button");b2.className="sharebtn tmStat";b2.style.cssText="background:#ecfdf5;color:#065f46";b2.textContent="👀 見た人を確認";b2.onclick=openStatus;
 a.after(b1,b2)}
addBtns("#shSend");addBtns("#shareLink");
const P=params();if(P)setTimeout(()=>openShared(P.tm,P.sh),300);
window.__TM={sendTeam,openStatus,openShared,LIFF_ID};   // 確認・テスト用
})();
