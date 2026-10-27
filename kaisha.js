/* 🏢 会社のなかま（現場の画面・genba.html）：社員どうし・許可した人と個人情報をオンラインで一緒に見る
   ・会社を作った人＝社長。招待のリンク（genba.html?co=番号）を開いた人は「許可待ち」で入り、社長・番頭が許可する
   ・社長・番頭が、なかまごとに役割（番頭／なかま）と「見ていい物」（CATS）・「直していい」（edit）を決める。チェックの無い物は相手のスマホに届かない（守りのルール：cad/firestore.rules の cos）
   ・人を消す・社員⇄協力会社を移す・なかまを外す・許可を変えるのは社長・番頭だけ
   ・保存先：team.js と同じ Firebase（同じログイン）。cos/{会社}/mem/{なかま}、cos/{会社}/c/{種類}/p/{人}、資格証の写真は cos/{会社}/lph/{写真}
   ・この端末の名簿（genba_cal）と、ネットの名簿を「そろえる」：直していい人は変わった所だけ上げる（pbm_co_h に前に上げた形）→ ネットの名簿を読んで入れる
   genba.js は変えずに、ここで包んで足すだけ（renderPeople・renderPerson・calSave） */
(function(){
if(typeof renderPeople!=="function"||typeof cal!=="function")return;
const CATS=[["base","名前・電話（社員／協力会社・会社名）"],["pro","ふりがな・ニックネーム・役職"],["body","生年月日・年齢・血液型"],["health","健康診断・血圧"],["em","緊急連絡先"],["skill","職種・経験・タグ"],["lic","資格（資格証の写真も）"]];
const ROLE={boss:"👑 社長",bantou:"🧭 番頭",mem:"👷 なかま"};
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k)||"";if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){return ""}};
const lj=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||"")||d}catch(e){return d}};
const fx=()=>window.__TM&&__TM.fx?__TM.fx():Promise.reject(new Error("ネットにつながる準備ができていません"));
const K={cid:ls("pbm_co"),co:null,me:null,mems:[],at:+ls("pbm_co_at")||0,busy:false,err:""};
const ok=()=>!!(K.me&&K.me.st==="ok");
const adm=()=>ok()&&(K.me.role==="boss"||K.me.role==="bantou");
const can=k=>adm()||(ok()&&!!(K.me.perms||{})[k]);
/* genba.js から使う：会社に入っていない時は今までどおり何でもできる */
window.coOn=()=>!!(K.cid&&ok());
window.coAdm=()=>!coOn()||adm();
window.coEdit=()=>!coOn()||can("edit");
window.coCan=k=>!coOn()||can(k);

/* ---- 人の情報を種類ごとに分ける・戻す ---- */
const pick=(o,ks)=>{const r={};for(const k of ks)r[k]=o[k]==null?"":o[k];return r};
function pack(C,n,cat){const p=C.prof[n]||{};
 if(cat==="base")return {name:n,tel:p.tel||"",kind:C.helpers.includes(n)?"h":"s",co:p.co||"",ord:C.staff.indexOf(n)};
 if(cat==="pro")return pick(p,["kana","nick","role"]);
 if(cat==="body")return pick(p,["birth","blood"]);
 if(cat==="health")return pick(p,["hc","bpH","bpL"]);
 if(cat==="em")return {em:{...(p.em||{})}};
 if(cat==="skill")return {trades:(p.trades||[]).map(t=>({n:t.n,since:t.since||""})),tags:(p.tags||[]).map(id=>{const t=C.tags.find(x=>x.id===id);return t?{n:t.n,c:t.c,hide:!!t.hide}:null}).filter(Boolean)};
 if(cat==="lic")return {lic:(p.lic||[]).map(l=>({n:l.n,no:l.no||"",ph:[...(l.ph||[])]}))};
 return {}}
function unpack(C,n,cat,d){const p=prof(C,n);
 if(cat==="base"){p.tel=d.tel||"";if(d.kind==="h")p.co=d.co||""}
 else if(cat==="pro")Object.assign(p,pick(d,["kana","nick","role"]));
 else if(cat==="body")Object.assign(p,pick(d,["birth","blood"]));
 else if(cat==="health")Object.assign(p,pick(d,["hc","bpH","bpL"]));
 else if(cat==="em")p.em={...(d.em||{})};
 else if(cat==="skill"){p.trades=(d.trades||[]).map(t=>({n:t.n,since:t.since||""}));p.tags=(d.tags||[]).map(t=>{let x=C.tags.find(q=>q.n===t.n);if(!x){x={id:rid("t"),n:t.n,c:t.c||"#64748b",hide:!!t.hide};C.tags.push(x)}return x.id})}
 else if(cat==="lic")p.lic=(d.lic||[]).map(l=>({n:l.n,no:l.no||"",ph:[...(l.ph||[])]}))}
function clear(C,n,cat){const p=prof(C,n);   /* 見てはいけなくなった物は、この端末からも消す */
 if(cat==="pro"){p.kana="";p.nick="";p.role=""}else if(cat==="body"){p.birth="";p.blood=""}else if(cat==="health"){p.hc="";p.bpH="";p.bpL=""}
 else if(cat==="em")p.em={};else if(cat==="skill"){p.trades=[];p.tags=[]}else if(cat==="lic")p.lic=[]}
const pid=(C,n)=>{const p=prof(C,n);if(!p.id)p.id=rid("u");return p.id};
const H=()=>lj("pbm_co_h",{}),setH=h=>ls("pbm_co_h",JSON.stringify(h));

/* ---- そろえる：読む → 上げる（直していい人） ---- */
let pushT=0;
async function sync(silent){
 if(!K.cid||K.busy)return;K.busy=true;K.err="";
 try{const f=await fx(),base=`cos/${K.cid}`;
  K.uid=f.uid;K.co=await f.get(base);K.me=await f.get(`${base}/mem/${f.uid}`);
  if(!K.co){K.err="会社が見つかりません（消されたかもしれません）";return}
  if(!K.me){K.err="この会社から外れています。社長・番頭に聞いてください";return}
  if(!ok())return;
  K.mems=adm()?(await f.list(`${base}/mem`)).map(d=>({uid:d.id,...d.data})):[];
  const before=localStorage.getItem("genba_cal");let C=cal(),h=H();const live=new Set();
  for(const n of [...C.staff,...C.helpers])pid(C,n);
  /* ① 読む（先に読む）：この端末で直してまだ上げていない種類（前にそろえた形 h とちがう）は、読んだ物で上書きしない */
  const dirty=(n,id,cat)=>h[id]&&h[id][cat]!==undefined&&h[id][cat]!==JSON.stringify(pack(C,n,cat));
  const got={};
  for(const [cat] of CATS){if(!can(cat))continue;for(const d of await f.list(`${base}/c/${cat}/p`))(got[d.id]=got[d.id]||{})[cat]=d.data}
  const byId={};for(const n of Object.keys(C.prof))if(C.prof[n].id)byId[C.prof[n].id]=n;
  const dels=adm()?lj("pbm_co_del",[]):[];   // この端末で消したばかりの人（このあとネットからも消す）は読み直さない
  for(const [id,g] of Object.entries(got)){const b=g.base;if(!b||!b.name||dels.includes(id))continue;live.add(id);let n=byId[id];
   if(n&&!C.staff.includes(n)&&!C.helpers.includes(n))n=null;
   if(!n&&(C.staff.includes(b.name)||C.helpers.includes(b.name)))n=b.name;   // 同じ名前の人がいれば、その人を同じ人にする
   if(n&&n!==b.name&&!dirty(n,id,"base")&&!C.staff.includes(b.name)&&!C.helpers.includes(b.name)){C.prof[b.name]=C.prof[n];delete C.prof[n];C.staff=C.staff.map(x=>x===n?b.name:x);C.helpers=C.helpers.map(x=>x===n?b.name:x);n=b.name}
   n=n||b.name;const p=prof(C,n);p.id=id;p.cid=K.cid;h[id]=h[id]||{};
   if(!dirty(n,id,"base")){const to=b.kind==="h"?C.helpers:C.staff,fr=b.kind==="h"?C.staff:C.helpers;if(fr.includes(n))fr.splice(fr.indexOf(n),1);if(!to.includes(n))to.push(n)}   // 社員⇄協力会社が変わった時だけ動かす
   for(const [cat] of CATS){if(!can(cat)){if(cat!=="base")clear(C,n,cat);delete h[id][cat];continue}const d=g[cat];if(!d||dirty(n,id,cat))continue;const {at,...dd}=d;unpack(C,n,cat,dd);h[id][cat]=JSON.stringify(pack(C,n,cat))}}
  /* ネットから消えた人（社長・番頭が消した）は、この端末からも消す */
  for(const n of [...C.staff,...C.helpers]){const p=C.prof[n]||{};if(p.cid===K.cid&&p.id&&!live.has(p.id)&&can("base")){C.staff=C.staff.filter(x=>x!==n);C.helpers=C.helpers.filter(x=>x!==n);delete C.prof[n]}}
  if(!adm()){const o={};for(const g of Object.values(got))if(g.base)o[g.base.name]=g.base.ord;C.staff.sort((a,b)=>(o[a]??1e6)-(o[b]??1e6))}   // 並びは社長・番頭の並び
  if(K.co.myco!=null&&!adm()){C.myco=K.co.myco;C.coInfo=K.co.coInfo||{}}
  /* ② 上げる：直していい人だけ。この端末だけの人（まだ会社に無い）と、直した種類だけ */
  if(can("edit")){
   for(const n of [...C.staff,...C.helpers]){const p=C.prof[n],id=p.id;if(p.cid&&p.cid!==K.cid)continue;const fresh=p.cid!==K.cid;h[id]=h[id]||{};
    for(const [cat] of CATS){if(!can(cat))continue;const d=pack(C,n,cat),sj=JSON.stringify(d);if(!(fresh||dirty(n,id,cat)))continue;await f.set(`${base}/c/${cat}/p/${id}`,{...d,at:Date.now()});h[id][cat]=sj}
    if(can("lic"))for(const l of p.lic||[])for(const ph of l.ph||[]){if(h[id]["ph_"+ph])continue;const x=await getPhoto(ph);if(!x)continue;await f.set(`${base}/lph/${ph}`,{pid:id,type:x.blob.type,b64:await b64(x.blob),at:Date.now()});h[id]["ph_"+ph]=1}
    p.cid=K.cid}
   /* 消した人（社長・番頭だけ）：この端末で消えた人をネットからも消す */
   if(adm())for(const id of lj("pbm_co_del",[])){for(const [cat] of CATS)await f.del(`${base}/c/${cat}/p/${id}`).catch(()=>{});delete h[id]}
   if(adm())await f.set(base,{myco:C.myco||"",coInfo:C.coInfo||{},name:C.myco||K.co.name||""},true)}
  ls("pbm_co_del","[]");
  /* 資格証の写真：この端末に無い物を持ってくる */
  if(can("lic"))for(const n of [...C.staff,...C.helpers])for(const l of (C.prof[n]||{}).lic||[])for(const ph of l.ph||[]){if(await getPhoto(ph))continue;const x=await f.get(`${base}/lph/${ph}`);if(!x)continue;
   const bin=atob(x.b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);await putPhoto({id:ph,site:"person:"+n,blob:new Blob([u],{type:x.type||"image/jpeg"}),t:Date.now()})}
  calRaw(C);setH(h);K.at=Date.now();ls("pbm_co_at",String(K.at));
  if(before!==localStorage.getItem("genba_cal"))redraw()}
 catch(e){console.warn("co sync",e);K.err=(e&&(e.code||e.message))||String(e);if(!silent)toast("そろえられませんでした（"+K.err+"）")}
 finally{K.busy=false;card()}}
/* 書く：genba.js の calSave を包む。消えた人を覚えて、少し待って上げる */
const calRaw=calSave;let lastIds=null;
const idsOf=C=>{const m={};for(const n of [...C.staff,...C.helpers]){const p=C.prof[n];if(p&&p.id&&p.cid===K.cid)m[p.id]=n}return m};
window.calSave=function(o){if(K.cid&&ok()){const prev=idsOf(cal()),now=idsOf(o),del=lj("pbm_co_del",[]);for(const id in prev)if(!now[id]&&!Object.values(o.prof||{}).some(p=>p&&p.id===id))del.push(id);ls("pbm_co_del",JSON.stringify([...new Set(del)]))}
 calRaw(o);if(K.cid&&ok()&&can("edit")){clearTimeout(pushT);pushT=setTimeout(()=>sync(true),1500)}};
function redraw(){const a=document.activeElement;if(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return;const h=location.hash;if(h==="#people")renderPeople();else if(/^#p./.test(h)&&h!=="#people")renderPerson()}

/* ---- 画面：個人情報の一覧に「🏢 会社のなかま」・直せない人は入れる欄を閉じる ---- */
function card(){const box=document.getElementById("coCard");if(!box)return;const C=cal();
 if(!K.cid){box.innerHTML=`<h2>🏢 会社のなかま（オンラインで一緒に見る）</h2><div class="note">社長が会社を作って、招待のリンクをLINEで送ります。開いた人は社長・番頭が許可すると、許可した物だけ見られます（名前と電話だけ、など）。</div>
  <button class="btn pri" id="coMake" style="width:100%;margin-top:8px">🏢 会社を作る（自分が社長）</button>`;box.querySelector("#coMake").onclick=makeCo;return}
 const nm=(K.co&&K.co.name)||C.myco||"会社";
 if(!K.me){box.innerHTML=`<h2>🏢 ${esc(nm)}</h2><div class="need ng">${esc(K.err||"読んでいます…")}</div><button class="btn" id="coLeave" style="width:100%;margin-top:8px">この会社の印を消す</button>`;box.querySelector("#coLeave").onclick=leave;return}
 if(!ok()){box.innerHTML=`<h2>🏢 ${esc(nm)}</h2><div class="need mid">⏳ 社長・番頭の許可を待っています（${esc(K.me.name||"")}）</div><div class="note">許可されたら、ここを開くと見られます。</div><div class="row" style="margin-top:8px"><button class="btn grow" id="coSync">🔄 もう一度見る</button><button class="btn" id="coLeave">やめる</button></div>`;
  box.querySelector("#coSync").onclick=()=>sync();box.querySelector("#coLeave").onclick=leave;return}
 const wait=K.mems.filter(m=>m.st==="wait").length,mine=CATS.filter(([k])=>can(k)).map(([,t])=>t);
 box.innerHTML=`<h2>🏢 ${esc(nm)} <span class="role">${ROLE[K.me.role]||""}</span></h2>
  <div class="note">${adm()?"全部見られます・直せます・人を消せます。":`見ていい物：${esc(mine.join("・")||"なし")}${can("edit")?"・✏️ 直していい":"（見るだけ）"}`}</div>
  <div class="note">${K.busy?"🔄 そろえています…":K.err?`<span style="color:var(--danger)">⚠️ ${esc(K.err)}</span>${/permission/i.test(K.err)&&adm()?` <a href="#" id="coRules">→ 守りのルールを入れる</a>`:""}`:K.at?"☁️ "+new Date(K.at).toLocaleString("ja-JP",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})+" にそろえました":""}</div>
  ${adm()?`<div class="row" style="margin-top:8px;gap:6px"><button class="btn grow" id="coInv">📨 招待のリンクを送る</button><button class="btn grow" id="coMem">👥 なかまと許可${wait?` <b style="color:var(--danger)">（許可待ち ${wait}）</b>`:""}</button></div>`:""}
  <div class="row" style="margin-top:6px;gap:6px"><button class="btn grow" id="coSync">🔄 今すぐそろえる</button><button class="btn" id="coLeave">${K.me.role==="boss"?"この端末を外す":"抜ける"}</button></div>`;
 box.querySelector("#coSync").onclick=()=>sync();box.querySelector("#coLeave").onclick=leave;
 if(adm()){box.querySelector("#coInv").onclick=invite;box.querySelector("#coMem").onclick=members}{const r=box.querySelector("#coRules");if(r)r.onclick=e=>{e.preventDefault();rulesHelp()}}}
/* ネットの守りのルール（初めの1回だけ・社長）：まだ入っていないと「許可がありません（permission-denied）」になる。写して Firebase の画面に貼る */
function rulesHelp(){const ov=document.createElement("div");ov.className="sheet";ov.innerHTML=`<div class="sbox" style="max-height:88vh"><h2>🔐 まだ準備ができていません</h2>
 <div class="note" style="color:var(--ink)">会社のなかまの機能は、<b>このアプリを作った人（管理する人）が1回だけ</b>準備をすると、だれでも「会社を作る」を押すだけで使えるようになります。<br>ほかの会社の社長・社員さんは、何もしなくて大丈夫です。少し待ってから、もう一度押してください。</div>
 <details style="margin-top:6px"><summary class="note" style="font-weight:800">（アプリを作った人へ）1回だけの準備のしかた</summary><div class="note" style="color:var(--ink)">
 1. 下の「📋 ルールを写す」<br>2.「🌐 ネットの保管場所の画面を開く」（アプリを作った時のグーグルのアカウントで入る）<br>3. 出てきた文を全部消して貼り付け →「公開」<br>これで終わりです。次からはだれも、この画面を見ません。</div>
 <button class="btn pri" data-c="1" style="width:100%;margin-top:6px">📋 ルールを写す</button><a class="btn" href="https://console.firebase.google.com/project/setubi-zumen/firestore/rules" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;width:100%;margin-top:6px;text-decoration:none">🌐 ネットの保管場所の画面を開く</a></details>
 <button class="btn" data-x="1">閉じる</button></div>`;
 document.body.appendChild(ov);ov.onclick=async e=>{const b=e.target.closest("button");if(e.target===ov||(b&&b.dataset.x)){ov.remove();return}if(b&&b.dataset.c){try{const t=await (await fetch("cad/firestore.rules",{cache:"no-store"})).text();await navigator.clipboard.writeText(t);toast("写しました。保管場所の画面のルールに貼り付けて「公開」")}catch(err){toast("写せませんでした（"+err.message+"）")}}}}
const denied=e=>/permission/i.test((e&&(e.code||e.message))||"");
async function makeCo(){const C=cal(),nm=(prompt("会社名（屋号）",C.myco||"")||"").trim();if(!nm)return;
 try{const f=await fx(),cid=rid("c").replace(/[^A-Za-z0-9]/g,"");await f.set(`cos/${cid}`,{owner:f.uid,name:nm,myco:nm,coInfo:C.coInfo||{},at:Date.now()});
  await f.set(`cos/${cid}/mem/${f.uid}`,{name:(prompt("あなたの名前（なかまに見える）","社長")||"社長").trim(),st:"ok",role:"boss",perms:{},at:Date.now()});
  K.cid=cid;ls("pbm_co",cid);ls("pbm_co_h","{}");C.myco=nm;calRaw(C);toast("会社を作りました。名簿を上げています…");await sync()}catch(e){if(denied(e))rulesHelp();else toast("作れませんでした（"+((e&&(e.code||e.message))||e)+"）")}}
function invUrl(){return location.origin+location.pathname.replace(/[^/]*$/,"")+"genba.html?co="+K.cid}
function invite(){const nm=(K.co&&K.co.name)||"会社";shareText(`【${nm}】のなかまに招待します。\n下のリンクを、ふだん使っている「曲げ共有」のアプリ（ホーム画面のアプリ）で開いてください。開いたら社長・番頭が許可します。\n${invUrl()}`)}
async function members(){const f=await fx().catch(()=>null);if(f)K.mems=(await f.list(`cos/${K.cid}/mem`).catch(()=>[])).map(d=>({uid:d.id,...d.data}));
 const ov=document.createElement("div");ov.className="sheet";const draw=()=>{const L=K.mems.slice().sort((a,b)=>(a.st==="wait"?0:1)-(b.st==="wait"?0:1)||(a.role==="boss"?-1:0));
  ov.innerHTML=`<div class="sbox" style="max-height:88vh"><h2>👥 なかまと許可</h2><div class="note">名前を押すと、役割と見ていい物を決められます。チェックの無い物は、その人のスマホに届きません。</div>
  ${L.map(m=>`<button class="site" data-u="${esc(m.uid)}"><b>${esc(m.name||"（名前なし）")}</b> <span class="role">${m.st==="wait"?"⏳ 許可待ち":ROLE[m.role]||""}</span>${m.uid===K.uid?" <span class='sub'>（自分）</span>":""}
   <div class="sub">${m.role==="boss"||m.role==="bantou"?"全部見られる・直せる":CATS.filter(([k])=>(m.perms||{})[k]).map(([,t])=>t.split("（")[0]).join("・")+((m.perms||{}).edit?"・✏️直す":"")||"まだ何も見られません"}</div></button>`).join("")||`<div class="note">まだいません。「📨 招待のリンクを送る」で呼んでください。</div>`}
  <button class="btn" data-x="1">閉じる</button></div>`};
 draw();document.body.appendChild(ov);
 ov.onclick=e=>{const b=e.target.closest("button");if(e.target===ov||(b&&b.dataset.x)){ov.remove();card();return}if(b&&b.dataset.u){ov.remove();permSheet(K.mems.find(m=>m.uid===b.dataset.u))}}}
function permSheet(m){if(!m)return;const isOwner=K.co&&K.co.owner===m.uid,ov=document.createElement("div");ov.className="sheet";const P={...(m.perms||{})};let role=m.role||"mem";
 const draw=()=>{ov.innerHTML=`<div class="sbox" style="max-height:88vh"><h2>${esc(m.name||"（名前なし）")}</h2>
  ${isOwner?`<div class="note">👑 会社を作った社長です（いつも全部見られます）</div>`:`<label class="f">役割</label><select data-r="1">${[["mem","👷 なかま（決めた物だけ）"],["bantou","🧭 番頭（全部見られる・直せる・許可を決められる・人を消せる）"]].map(([v,t])=>`<option value="${v}" ${role===v?"selected":""}>${t}</option>`).join("")}</select>
  ${role==="mem"?`<div class="note" style="margin-top:6px">見ていい物（チェックした物だけ見られます）</div>${CATS.map(([k,t])=>`<label class="ck"><input type="checkbox" data-k="${k}" ${P[k]?"checked":""}> ${t}</label>`).join("")}
   <label class="ck" style="margin-top:6px"><input type="checkbox" data-k="edit" ${P.edit?"checked":""}> ✏️ 個人情報を直していい（見ていい物だけ）</label>
   <div class="row" style="gap:6px;margin-top:4px"><button class="btn sm grow" data-pre="tel">名前と電話だけ</button><button class="btn sm grow" data-pre="all">全部見ていい</button></div>`:""}
  <button class="btn pri" data-save="1">${m.st==="wait"?"✅ 許可する":"💾 これで決める"}</button><button class="btn del" data-rm="1">${m.st==="wait"?"断る":"なかまから外す"}</button>`}
  <button class="btn" data-x="1">閉じる</button></div>`};
 draw();document.body.appendChild(ov);
 ov.onchange=e=>{const t=e.target;if(t.dataset.r){role=t.value;draw()}else if(t.dataset.k){P[t.dataset.k]=t.checked}};
 ov.onclick=async e=>{const b=e.target.closest("button");if(e.target===ov||(b&&b.dataset.x)){ov.remove();return}if(!b)return;
  if(b.dataset.pre){for(const [k] of CATS)P[k]=b.dataset.pre==="all"||k==="base";if(b.dataset.pre==="tel")P.edit=false;draw();return}
  try{const f=await fx(),path=`cos/${K.cid}/mem/${m.uid}`;
   if(b.dataset.save){const perms={};for(const k of [...CATS.map(c=>c[0]),"edit"])if(P[k])perms[k]=true;await f.set(path,{st:"ok",role,perms,at:Date.now()},true);toast("決めました");ov.remove();members()}
   else if(b.dataset.rm){if(!b.dataset.ok){b.dataset.ok="1";b.textContent="本当に？";return}await f.del(path);toast("外しました");ov.remove();members()}}
  catch(err){toast("できませんでした（"+((err&&(err.code||err.message))||err)+"）")}}}
async function leave(){const boss=!!(K.me&&K.me.role==="boss");
 if(!confirm(boss?"この端末を会社から外しますか？（会社のデータはネットに残ります。もう一度入るには招待のリンクを開いてください）":"この会社から抜けますか？（この端末に入っている会社の人の情報も消えます）"))return;
 try{const f=await fx();if(!boss)await f.del(`cos/${K.cid}/mem/${f.uid}`).catch(()=>{})}catch(e){}
 if(!boss){const C=cal();for(const n of [...C.staff,...C.helpers]){const p=C.prof[n]||{};if(p.cid===K.cid){C.staff=C.staff.filter(x=>x!==n);C.helpers=C.helpers.filter(x=>x!==n);delete C.prof[n]}}calRaw(C)}
 K.cid="";K.me=null;K.co=null;ls("pbm_co",null);ls("pbm_co_h",null);ls("pbm_co_del",null);renderPeople()}
/* 招待のリンク（genba.html?co=番号）を開いた時 */
async function joinFromUrl(){let cid="";try{cid=new URLSearchParams(location.search).get("co")||""}catch(e){}if(!cid)return;try{history.replaceState(null,"",location.pathname+location.hash)}catch(e){}
 if(K.cid===cid){sync();return}
 try{const f=await fx(),co=await f.get(`cos/${cid}`);if(!co){toast("招待の会社が見つかりませんでした");return}
  const me=await f.get(`cos/${cid}/mem/${f.uid}`);if(me){K.cid=cid;ls("pbm_co",cid);location.hash="#people";sync();return}
  const nm=(prompt(`【${co.name||"会社"}】に入ります。あなたの名前（社長・番頭に見える名前）`,"")||"").trim();if(!nm)return;
  await f.set(`cos/${cid}/mem/${f.uid}`,{name:nm,st:"wait",role:"mem",perms:{},at:Date.now()});
  K.cid=cid;ls("pbm_co",cid);ls("pbm_co_h","{}");toast("入りました。社長・番頭の許可を待ってください");location.hash="#people";sync()}
 catch(e){toast("入れませんでした（"+((e&&(e.code||e.message))||e)+"）")}}
/* 社長・番頭以外：人を消す・移すボタンを出さない。直していない人は入れる欄を閉じる。見てはいけない欄は出さない */
const rp=renderPeople;window.renderPeople=function(){const r=rp.apply(this,arguments);const app=document.getElementById("app");
 const box=document.createElement("div");box.className="card";box.id="coCard";const h1=app.querySelector("h1");(app.querySelector("#bCImp")||h1).after(box);card();
 if(coOn()){if(!coAdm())app.querySelectorAll("[data-mv]").forEach(b=>b.remove());
  if(!coEdit())["fStaff","bStaff","sugg","fHelper","bHelper","fHco","bCImp","bPImp","fMyco","fMyEmp"].forEach(id=>{const el=document.getElementById(id);if(el)(el.closest(".row")||el).style.display="none"});
  app.querySelectorAll("[data-emp]").forEach(el=>el.disabled=!coEdit())}
 if(K.cid&&Date.now()-K.at>20000)sync(true);return r};
const rq=renderPerson;window.renderPerson=async function(){const r=await rq.apply(this,arguments);if(!coOn())return r;const app=document.getElementById("app"),hide=el=>{if(el)el.style.display="none"};
 const C=cal(),n=typeof pName!=="undefined"?pName:"",mine=((C.prof[n]||{}).cid===K.cid);if(!mine)return r;   // 自分だけの人（会社の名簿に無い人）はそのまま
 if(!coAdm()){hide(document.getElementById("bDelP"));hide(document.getElementById("bKind"))}
 const card2=t=>[...app.querySelectorAll(".card")].find(c=>{const h=c.querySelector("h2");return h&&h.textContent.includes(t)});
 const fld=id=>{const el=document.getElementById(id);if(!el)return;const lb=app.querySelector(`label[for="${id}"]`);hide(lb);const row=el.closest(".row");hide(row&&row.querySelectorAll("input,select").length<=2?row:el)};
 if(!coCan("pro"))["pKs","pKm","pNick","pRole"].forEach(fld);if(!coCan("body")){fld("pBirth");fld("pBlood")}if(!coCan("health")){const r=document.getElementById("pHc");hide(r&&r.closest(".row"));hide(document.getElementById("pHcA"))}
 if(!coCan("em"))hide(card2("緊急連絡先"));if(!coCan("skill")){hide(card2("職種と経験"));hide(card2("タグ"))}if(!coCan("lic"))hide(card2("保持資格"));
 if(!coEdit()){app.querySelectorAll(".card input,.card select,.card textarea").forEach(el=>{if(!/^x[PELT]$/.test(el.id))el.disabled=true});
  ["bTrade","fTrade","tradeSug","bLic","fLic","licSug","bTag","fTag","tagSug","pSei","pMei"].forEach(id=>{const el=document.getElementById(id);if(el)(/^p(Sei|Mei)$/.test(id)?el.disabled=true:(el.closest(".row")||el).style.display="none")});
  app.querySelectorAll("[data-trm],[data-rl],[data-t],[data-pa],[data-tc],[data-th],[data-td]").forEach(b=>b.disabled=true);
  const n2=document.createElement("div");n2.className="note";n2.style.cssText="margin:0 4px 6px;color:var(--danger)";n2.textContent="🔒 見るだけです（直すには社長・番頭の許可がいります）";app.querySelector("h1").after(n2)}
 return r};
/* 会社のメニューにも：許可待ちがいる時 */
const rm=typeof renderMenu==="function"?renderMenu:null;if(rm)window.renderMenu=async function(){const r=await rm.apply(this,arguments);if(K.cid&&ok()){const b=document.getElementById("mPeople");if(b){const d=document.createElement("div");d.className="sub";d.textContent="🏢 会社のなかまとオンラインで一緒に見ています";b.appendChild(d)}}return r};
addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&K.cid&&Date.now()-K.at>60000)sync(true)});
setTimeout(()=>{const h=location.hash;if(h==="#people")renderPeople();else if(/^#p./.test(h))renderPerson();   // 開いた時にもう出ていた画面に、会社の欄・見せない所を入れ直す
 joinFromUrl();if(K.cid&&!/[?&]co=/.test(location.search))sync(true)},400);
window.__CO={K,sync,pack,unpack};   // 確かめる用
})();
