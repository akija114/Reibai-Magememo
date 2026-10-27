/* 🏢 会社で現場を一緒に見る（現場の画面・genba.html）：社員みんなで現場カード・だれがどこ・休みを一緒に見る・直す
   ・会社を作った人＝社長。招待のリンク（genba.html?co=番号）を開いた人は「許可待ち」で入り、社長・番頭が「直せる」か「見るだけ」で許可する
   ・番頭は社長が決める（何人でも）。番頭は許可・直せる／見るだけを決められるが、番頭を決める・外すのは社長だけ
   ・届く物：現場カード（自分用メモ・駐車場の写真・交通費は除く）・だれがどこ・休み・名簿（ニックネーム。無い人は名字だけ・社員／協力会社・会社名）
     個人情報（電話・生年月日・健康・緊急連絡先・資格証など）は送らない（2026-10-27 ユーザー：個人情報はネットに置かない）
   ・残業・交通費・人工の決まり（締め日など）は社長・番頭だけ（money・会社の設定）。ほかの人は 📊 人工の画面も見られない
   ・保存先：team.js と同じ Firebase（同じログイン）。cos/{会社}/mem/{なかま}、cos/{会社}/c/{種類}/p/{番号}（種類：ros 名簿・site 現場・off 休み（月ごと）・money 残業（t＋月）・交通費（c＋現場））
   ・名前はこの端末の名前のまま送らず、名簿の番号（@u…）にして送る。受け取った端末は番号→その端末の名前（無い人は名簿のニックネームで足す・fromCo）
   ・そろえる：前にそろえた形（pbm_co_h2）とくらべて、この端末で変わった所（項目ごと）だけ上げる。ほかの所はネットの物にする
   genba.js は変えずに、ここで包んで足すだけ（renderMenu・renderList・renderEdit・renderWeek・renderKosu・renderPeople・renderPerson・pick・save・calSave） */
(function(){
if(typeof renderMenu!=="function"||typeof cal!=="function")return;
const ROLE={boss:"👑 社長",bantou:"🧭 番頭",mem:"👷 なかま"};
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k)||"";if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v)}catch(e){return ""}};
const lj=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||"")||d}catch(e){return d}};
const fx=()=>window.__TM&&__TM.fx?__TM.fx():Promise.reject(new Error("ネットにつながる準備ができていません"));
const K={cid:ls("pbm_co"),co:null,me:null,mems:[],at:+ls("pbm_co_at")||0,busy:false,err:"",uid:""};
const ok=()=>!!(K.me&&K.me.st==="ok");
const owner=()=>!!(K.co&&K.uid&&K.co.owner===K.uid);
const adm=()=>ok()&&(owner()||K.me.role==="boss"||K.me.role==="bantou");
const can=k=>adm()||(ok()&&!!(K.me.perms||{})[k]);
/* genba.js から使う：会社に入っていない時は今までどおり何でもできる */
window.coOn=()=>!!(K.cid&&ok());
window.coAdm=()=>!coOn()||adm();
window.coEdit=()=>!coOn()||can("edit");
const MEMP=ed=>({site:true,ros:true,off:true,...(ed?{edit:true}:{})});   // なかまに許可する物（直せる／見るだけ）
const OLD=["base","pro","body","health","em","skill","lic"];   // 前の版の個人情報の種類（ネットから消す）

/* ---- 形をそろえる：キーの順番をそろえた文字（くらべる用） ---- */
const cj=o=>JSON.stringify(o,(k,v)=>v&&typeof v==="object"&&!Array.isArray(v)?Object.keys(v).sort().reduce((a,x)=>(a[x]=v[x],a),{}):v);
const cl=o=>o===undefined?undefined:JSON.parse(cj(o));
/* ---- 名前 ⇄ 名簿の番号 ---- */
let BY={};
const pid=(C,n)=>{const p=prof(C,n);if(!p.id)p.id=rid("u");return p.id};
const mine=C=>[...C.staff,...C.helpers].filter(n=>!(C.prof[n]||{}).coX);
const mapIds=C=>{BY={};for(const n of mine(C)){const p=C.prof[n];if(p&&p.id)BY[p.id]=n}};
const enc=(C,n)=>{n=String(n);const b=baseNm(n),p=(C.staff.includes(b)||C.helpers.includes(b))&&C.prof[b];return p&&p.id&&!p.coX?"@"+p.id+(n.startsWith(b)?n.slice(b.length):""):n};
const dec=v=>{const m=/^@(u[a-z0-9]+)(.*)$/i.exec(String(v));return m&&BY[m[1]]?BY[m[1]]+m[2]:String(v)};
const dnOf=(C,n)=>{const p=C.prof[n]||{};return String(p.nick||"").trim()||nmSp(n)[0]||n};
const uniq=(C,v)=>{let k=v||"（名前なし）",i=2;while(C.staff.includes(k)||C.helpers.includes(k)||C.prof[k])k=`${v}（${i++}）`;return k};

/* ---- 種類ごとの形 ---- */
const packR=(C,n)=>{const h=C.helpers.includes(n);return {dn:dnOf(C,n),k:h?"h":"s",co:h?String((C.prof[n]||{}).co||""):""}};
function applyR(C,id,d){let n=BY[id];
 if(!n){n=uniq(C,d.dn);(d.k==="h"?C.helpers:C.staff).push(n);C.prof[n]={id,cid:K.cid,fromCo:1,nick:d.dn,co:d.co||"",em:{},lic:[],tags:[]};BY[id]=n;return}
 const p=prof(C,n),to=d.k==="h"?C.helpers:C.staff,fr=d.k==="h"?C.staff:C.helpers;
 if(fr.includes(n)){fr.splice(fr.indexOf(n),1);if(!to.includes(n))to.push(n);if(d.k==="h"&&C.pin)C.pin=C.pin.filter(x=>x!==n)}
 if(p.fromCo||d.dn!==dnOf(C,n))p.nick=d.dn;if(d.k==="h")p.co=d.co||""}
function removeR(C,id){const n=BY[id];if(!n)return;const p=C.prof[n]||{};delete BY[id];
 if(p.fromCo){C.staff=C.staff.filter(x=>x!==n);C.helpers=C.helpers.filter(x=>x!==n);if(C.pin)C.pin=C.pin.filter(x=>x!==n);delete C.prof[n]}else p.coX=1}
function packS(C,s){const o=JSON.parse(JSON.stringify(s));delete o.memo;delete o.cost;delete o.updated;delete o.loc;o.park={...(o.park||{}),photos:[]};
 o.members=(o.members||[]).map(m=>({...m,n:enc(C,m.n)}));return cl(o)}
function unS(d,old){const o=JSON.parse(JSON.stringify(d));o.members=(o.members||[]).map(m=>({...m,n:dec(m.n)}));
 o.memo=old?old.memo||"":"";if(old&&old.cost)o.cost=old.cost;o.park={...(o.park||{}),photos:old&&old.park?old.park.photos||[]:[]};o.updated=Date.now();return o}
const ymOf=y=>y.slice(0,7);
function packMonth(src,ym,f){const o={};for(const y of Object.keys(src||{}).sort())if(ymOf(y)===ym){const v=f(src[y]);if(v!==undefined)o[y]=v}return Object.keys(o).length?o:undefined}
const encMap=(C,m)=>{const o={};for(const k in m||{})o[enc(C,k)]=m[k];return Object.keys(o).length?o:undefined};
const decMap=m=>{const o={};for(const k in m||{})o[dec(k)]=m[k];return o};
const SETK=["cut","otU","otR","satWork","nohol","myco","coInfo"];
const pickSet=o=>{const r={};for(const k of SETK)if(o&&o[k]!==undefined&&o[k]!==null)r[k]=o[k];return cl(r)};

/* ---- そろえる（1種類）：L＝この端末の形、R＝ネットの形（null の時は変わった物だけ1つずつ読む）、h＝前にそろえた形 ----
   この端末で変わっていない → ネットの物にする。変わった → 直せる人は項目ごとに混ぜて上げる（ほかの人の直した項目は消さない）。直せない人はネットの物にもどす */
async function two(f,h,pre,path,L,R,ed,apply,remove){let ch=false;
 const keys=new Set([...Object.keys(L),...(R?Object.keys(R):[]),...Object.keys(h).filter(x=>x.startsWith(pre)).map(x=>x.slice(pre.length))]);
 for(const k of keys){const loc=L[k],lj2=loc===undefined?undefined:cj(loc),bj=h[pre+k];
  if(!R&&lj2===bj)continue;
  let rem;if(R)rem=R[k];else{rem=await f.get(path(k))||undefined;if(rem&&rem.gone)rem=undefined;if(rem){rem={...rem};delete rem.at}}
  rem=cl(rem);const rj=rem===undefined?undefined:cj(rem);
  if(lj2===bj||(!ed&&(rem!==undefined||bj!==undefined))){   // この端末で変わっていない・直せない人：ネットの物にする
   if(rj!==lj2){if(rem!==undefined)await apply(k,rem);else await remove(k);ch=true}
   if(rem!==undefined)h[pre+k]=rj;else delete h[pre+k];continue}
  if(!ed)continue;   // この端末だけの物（見るだけの人）はそのまま
  if(loc===undefined){if(rem!==undefined){if(adm())await f.del(path(k));else await f.set(path(k),{gone:true,at:Date.now()})}delete h[pre+k];continue}
  let m=loc;if(rem!==undefined){const b=bj?JSON.parse(bj):{};m={};for(const x of new Set([...Object.keys(loc),...Object.keys(rem)]))m[x]=cj(loc[x])!==cj(b[x])?loc[x]:rem[x];m=cl(m)}
  const mj=cj(m);if(mj!==rj)await f.set(path(k),{...m,at:Date.now()});if(mj!==lj2){await apply(k,m);ch=true}h[pre+k]=mj}
 return ch}
const H=()=>lj("pbm_co_h2",{}),setH=h=>ls("pbm_co_h2",JSON.stringify(h));
const lst=async(f,p)=>{const o={};for(const d of await f.list(p)){if(d.data&&d.data.gone)continue;const x={...d.data};delete x.at;o[d.id]=x}return o};

/* ---- そろえる：full＝ネットを全部読む（開いた時・1分ごと）、そうでない時はこの端末で変わった物だけ上げる ---- */
let again=false;
async function sync(silent,full){
 if(!K.cid)return;if(K.busy){again=true;return}K.busy=true;K.err="";let changed=false;
 try{const f=await fx(),base=`cos/${K.cid}`,P=(c,k)=>`${base}/c/${c}/p/${k}`;
  K.uid=f.uid;if(full||!K.me){K.co=await f.get(base);K.me=await f.get(`${base}/mem/${f.uid}`)}
  if(!K.co){K.err="会社が見つかりません（消されたかもしれません）";return}
  if(!K.me){K.err="この会社から外れています。社長・番頭に聞いてください";return}
  if(!ok())return;
  if(adm()&&full)K.mems=(await f.list(`${base}/mem`)).map(d=>({uid:d.id,...d.data}));
  let h=H();const C=cal(),before=cj(C),ed=can("edit");
  /* はじめてそろえる時：この端末にある現場・名簿をみんなに見せるか聞く */
  const ss0=await allSites();
  if(!ls("pbm_co_h2")&&ed){const a=ss0.filter(s=>!s.loc).length,b=mine(C).length;
   if((a||b)&&!confirm(`この端末にある 現場 ${a}件・名簿 ${b}人 を、会社のみんなと一緒に見ますか？\n（キャンセル：今ある物はこの端末だけに残します。これから作る物は一緒に見ます）`)){for(const s of ss0)if(!s.loc){s.loc=1;await putSite(s)}for(const n of mine(C))prof(C,n).coX=1}}
  for(const n of mine(C))pid(C,n);mapIds(C);
  /* ① 名簿（ニックネーム・社員／協力会社・会社名） */
  const L1={};for(const n of mine(C))L1[C.prof[n].id]=packR(C,n);
  const Rr=full&&can("ros")?await lst(f,`${base}/c/ros/p`):null,ord=Rr?Rr._ord:undefined;if(Rr)delete Rr._ord;
  if(can("ros"))changed=await two(f,h,"r:",k=>P("ros",k),L1,Rr,ed,async(k,d)=>applyR(C,k,d),async k=>removeR(C,k))||changed;
  mapIds(C);
  /* 社員の並び：社長・番頭の並び */
  {const ids=C.staff.map(n=>(C.prof[n]||{}).id).filter(id=>id&&h["r:"+id]!==undefined),oj=cj({a:ids});
   const sortBy=a=>{const ix=n=>{const i=a.indexOf((C.prof[n]||{}).id);return i<0?1e6:i};C.staff=C.staff.map((n,i)=>[n,i]).sort((x,y)=>ix(x[0])-ix(y[0])||x[1]-y[1]).map(x=>x[0])};
   const rj=ord?cj({a:ord.a||[]}):undefined;   // 社長・番頭がこの端末で並べ替えた時だけ上げる（はじめての端末は先にネットの並びにする）
   if(adm()&&(h.ord!==undefined?oj!==h.ord:!ord)){await f.set(P("ros","_ord"),{a:ids,at:Date.now()});h.ord=oj}
   else if(rj&&rj!==h.ord){sortBy(ord.a||[]);h.ord=rj}}
  /* ② 現場カード */
  const SM={};for(const s of ss0)SM[s.id]=s;
  const L2={};for(const s of ss0)if(!s.loc)L2[s.id]=packS(C,s);
  const Rs=full&&can("site")?await lst(f,`${base}/c/site/p`):null;
  if(can("site"))changed=await two(f,h,"s:",k=>P("site",k),L2,Rs,ed,async(k,d)=>{const s=unS(d,SM[k]);SM[k]=s;await putSite(s);if(typeof cur!=="undefined"&&cur&&cur.id===k)Object.assign(cur,s)},
   async k=>{const s=SM[k];if(s)for(const ph of (s.park||{}).photos||[])await delPhoto(ph).catch(()=>{});delete SM[k];await delSite(k);if(typeof cur!=="undefined"&&cur&&cur.id===k)cur=null})||changed;
  /* ③ 休み（月ごと） */
  const yms=new Set(Object.keys(C.off||{}).map(ymOf)),L3={};for(const ym of yms){const v=packMonth(C.off,ym,a=>{const b=(a||[]).map(n=>enc(C,n)).filter(x=>x[0]==="@");return b.length?b:undefined});if(v)L3[ym]=v}
  const Ro=full&&can("off")?await lst(f,`${base}/c/off/p`):null;
  const setMonth=(obj,ym,d,fn)=>{for(const y of Object.keys(obj))if(ymOf(y)===ym)delete obj[y];for(const y in d||{})obj[y]=fn(d[y])};
  const offMonth=(C,ym,d)=>{const keep={};for(const y of Object.keys(C.off))if(ymOf(y)===ym){const a=C.off[y].filter(n=>enc(C,n)[0]!=="@");if(a.length)keep[y]=a;delete C.off[y]}   // 名簿に無い人の休みはこの端末のまま
   for(const y of new Set([...Object.keys(d||{}),...Object.keys(keep)])){const a=[...new Set([...(d[y]||[]).map(dec),...(keep[y]||[])])];if(a.length)C.off[y]=a}};
  if(can("off"))changed=await two(f,h,"o:",k=>P("off",k),L3,Ro,ed,async(k,d)=>offMonth(C,k,d),async k=>offMonth(C,k,{}))||changed;
  /* ④ 残業・交通費・会社の決まり（社長・番頭だけ） */
  if(adm()){C.ot=C.ot||{};
   const Rm=full?await lst(f,`${base}/c/money/p`):null,RT=Rm?{}:null,RC=Rm?{}:null;if(Rm)for(const k in Rm)(k[0]==="t"?RT:RC)[k.slice(1)]=Rm[k];
   const L4={};for(const ym of new Set(Object.keys(C.ot).map(ymOf))){const v=packMonth(C.ot,ym,m=>encMap(C,m));if(v)L4[ym]=v}
   changed=await two(f,h,"t:",k=>P("money","t"+k),L4,RT,true,async(k,d)=>setMonth(C.ot,k,d,decMap),async k=>setMonth(C.ot,k,{},x=>x))||changed;
   const L5={};for(const id in SM){const s=SM[id];if(s.loc)continue;const v=encMap(C,s.cost);if(v)L5[id]=v}
   changed=await two(f,h,"c:",k=>P("money","c"+k),L5,RC,true,async(k,d)=>{const s=SM[k];if(!s)return;s.cost=decMap(d);await putSite(s);if(typeof cur!=="undefined"&&cur&&cur.id===k)cur.cost=s.cost},async k=>{const s=SM[k];if(s&&s.cost){s.cost={};await putSite(s)}})||changed;
   if(h.set===undefined){const r=pickSet(K.co);Object.assign(C,r);h.set=cj(r)}   // はじめての端末：先に会社の決まりを入れる（空の決まりで上書きしない）
   const sj=cj(pickSet(C));if(sj!==h.set){await f.set(base,{...pickSet(C),name:C.myco||K.co.name||""},true);h.set=sj}
   else if(full){const rj=cj(pickSet(K.co));if(rj!==h.set){Object.assign(C,pickSet(K.co));h.set=rj;changed=true}}
   /* 前の版の個人情報がネットに残っていたら消す（1回だけ） */
   if(full&&!ls("pbm_co_clean")){for(const c of OLD)for(const d of await f.list(`${base}/c/${c}/p`).catch(()=>[]))await f.del(P(c,d.id)).catch(()=>{});for(const d of await f.list(`${base}/lph`).catch(()=>[]))await f.del(`${base}/lph/${d.id}`).catch(()=>{});ls("pbm_co_clean","1")}}
  else if(full){const r=pickSet(K.co),rj=cj(r);if(rj!==cj(pickSet(C))||rj!==h.set){Object.assign(C,r);h.set=rj}}   // 社長・番頭でない人は、いつも会社の決まりにそろえる
  if(cj(C)!==before){calRaw(C);changed=true}
  setH(h);if(full){K.at=Date.now();ls("pbm_co_at",String(K.at))}}
 catch(e){console.warn("co sync",e);K.err=(e&&(e.code||e.message))||String(e);if(!silent)toast("そろえられませんでした（"+K.err+"）")}
 finally{K.busy=false;card();if(changed)redraw();if(again){again=false;setTimeout(()=>sync(true),300)}}}
/* 直した時：少し待って、変わった物だけ上げる */
let pushT=0,quiet=0;
const soon=()=>{if(!K.cid||!ok()||!can("edit")||Date.now()<quiet)return;clearTimeout(pushT);pushT=setTimeout(()=>sync(true),1500)};
const calRaw=calSave;
window.calSave=function(o){calRaw(o);soon()};
const sv=save;window.save=function(){const r=sv.apply(this,arguments);soon();return r};
function redraw(){const a=document.activeElement;if(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return;if(document.querySelector(".sheet"))return;quiet=Date.now()+2500;route()}

/* ---- 画面：現場メニューに「🏢 会社で現場を一緒に見る」 ---- */
function card(){const box=document.getElementById("coCard");if(!box)return;const C=cal();
 if(!K.cid){box.innerHTML=`<h2>🏢 会社で現場を一緒に見る</h2><div class="note">社長が会社を作って、招待のリンクをLINEで送ります。開いた人を社長・番頭が「直せる」か「見るだけ」で許可すると、現場カード・だれがどこ・休みをみんなで見られます。<br>名前はニックネーム（無い人は名字だけ）。電話・健康などの個人情報は送りません。</div>
  <button class="btn pri" id="coMake" style="width:100%;margin-top:8px">🏢 会社を作る（自分が社長）</button>`;box.querySelector("#coMake").onclick=makeCo;return}
 const nm=(K.co&&K.co.name)||C.myco||"会社";
 if(!K.me){box.innerHTML=`<h2>🏢 ${esc(nm)}</h2><div class="need ${K.err?"ng":""}">${esc(K.err||"読んでいます…")}</div><button class="btn" id="coLeave" style="width:100%;margin-top:8px">この会社の印を消す</button>`;box.querySelector("#coLeave").onclick=leave;return}
 if(!ok()){box.innerHTML=`<h2>🏢 ${esc(nm)}</h2><div class="need mid">⏳ 社長・番頭の許可を待っています（${esc(K.me.name||"")}）</div><div class="note">許可されたら、ここを開くと見られます。</div><div class="row" style="margin-top:8px"><button class="btn grow" id="coSync">🔄 もう一度見る</button><button class="btn" id="coLeave">やめる</button></div>`;
  box.querySelector("#coSync").onclick=()=>sync(false,true);box.querySelector("#coLeave").onclick=leave;return}
 const wait=K.mems.filter(m=>m.st==="wait").length,r=owner()?"boss":K.me.role;
 box.innerHTML=`<h2>🏢 ${esc(nm)} <span class="role">${ROLE[r]||""}</span></h2>
  <div class="note">${adm()?"みんなで現場を見ています。残業・交通費・📊人工は社長・番頭だけが見られます。":can("edit")?"✏️ 現場・だれがどこ・休みを直せます":"👀 見るだけです（直すには社長・番頭の許可がいります）"}</div>
  <div class="note">${K.busy?"🔄 そろえています…":K.err?`<span style="color:var(--danger)">⚠️ ${esc(K.err)}</span>${/permission/i.test(K.err)&&adm()?` <a href="#" id="coRules">→ 守りのルールを入れる</a>`:""}`:K.at?"☁️ "+new Date(K.at).toLocaleString("ja-JP",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})+" にそろえました":""}</div>
  ${adm()?`<div class="row" style="margin-top:8px;gap:6px"><button class="btn grow" id="coInv">📨 招待のリンクを送る</button><button class="btn grow" id="coMem">👥 なかまと許可${wait?` <b style="color:var(--danger)">（許可待ち ${wait}）</b>`:""}</button></div>`:""}
  <div class="row" style="margin-top:6px;gap:6px"><button class="btn grow" id="coSync">🔄 今すぐそろえる</button><button class="btn" id="coLeave">${owner()?"この端末を外す":"抜ける"}</button></div>`;
 box.querySelector("#coSync").onclick=()=>sync(false,true);box.querySelector("#coLeave").onclick=leave;
 if(adm()){box.querySelector("#coInv").onclick=invite;box.querySelector("#coMem").onclick=members}{const a=box.querySelector("#coRules");if(a)a.onclick=e=>{e.preventDefault();rulesHelp()}}}
/* ネットの守りのルール（初めの1回だけ・アプリを作った人）：まだ入っていないと「許可がありません（permission-denied）」になる。写して Firebase の画面に貼る */
function rulesHelp(){const ov=document.createElement("div");ov.className="sheet";ov.innerHTML=`<div class="sbox" style="max-height:88vh"><h2>🔐 まだ準備ができていません</h2>
 <div class="note" style="color:var(--ink)">この機能は、<b>このアプリを作った人（管理する人）が1回だけ</b>準備をすると、だれでも「会社を作る」を押すだけで使えるようになります。<br>ほかの会社の社長・社員さんは、何もしなくて大丈夫です。少し待ってから、もう一度押してください。</div>
 <details style="margin-top:6px"><summary class="note" style="font-weight:800">（アプリを作った人へ）1回だけの準備のしかた</summary><div class="note" style="color:var(--ink)">
 1. 下の「📋 ルールを写す」<br>2.「🌐 ネットの保管場所の画面を開く」（アプリを作った時のグーグルのアカウントで入る）<br>3. 出てきた文を全部消して貼り付け →「公開」<br>これで終わりです。次からはだれも、この画面を見ません。</div>
 <button class="btn pri" data-c="1" style="width:100%;margin-top:6px">📋 ルールを写す</button><a class="btn" href="https://console.firebase.google.com/project/setubi-zumen/firestore/rules" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;width:100%;margin-top:6px;text-decoration:none">🌐 ネットの保管場所の画面を開く</a></details>
 <button class="btn" data-x="1">閉じる</button></div>`;
 document.body.appendChild(ov);ov.onclick=async e=>{const b=e.target.closest("button");if(e.target===ov||(b&&b.dataset.x)){ov.remove();return}if(b&&b.dataset.c){try{const t=await (await fetch("cad/firestore.rules",{cache:"no-store"})).text();await navigator.clipboard.writeText(t);toast("写しました。保管場所の画面のルールに貼り付けて「公開」")}catch(err){toast("写せませんでした（"+err.message+"）")}}}}
const denied=e=>/permission/i.test((e&&(e.code||e.message))||"");
async function makeCo(){const C=cal(),nm=(prompt("会社名（屋号）",C.myco||"")||"").trim();if(!nm)return;
 try{const f=await fx(),cid=(rid("c")+Math.random().toString(36).slice(2,10)).replace(/[^A-Za-z0-9]/g,"");await f.set(`cos/${cid}`,{owner:f.uid,name:nm,myco:nm,at:Date.now()});
  await f.set(`cos/${cid}/mem/${f.uid}`,{name:(prompt("あなたの名前（なかまに見える）","社長")||"社長").trim(),st:"ok",role:"boss",perms:{},at:Date.now()});
  K.cid=cid;ls("pbm_co",cid);ls("pbm_co_h2",null);C.myco=nm;calRaw(C);toast("会社を作りました。現場を上げています…");await sync(false,true)}catch(e){if(denied(e))rulesHelp();else toast("作れませんでした（"+((e&&(e.code||e.message))||e)+"）")}}
function invUrl(){return location.origin+location.pathname.replace(/[^/]*$/,"")+"genba.html?co="+K.cid}
function invite(){const nm=(K.co&&K.co.name)||"会社";shareText(`【${nm}】の現場をみんなで見るための招待です。\n下のリンクを、ふだん使っている「曲げ共有」のアプリ（ホーム画面のアプリ）で開いてください。開いたら社長・番頭が許可します。\n${invUrl()}`)}
async function members(){const f=await fx().catch(()=>null);if(f)K.mems=(await f.list(`cos/${K.cid}/mem`).catch(()=>[])).map(d=>({uid:d.id,...d.data}));
 const ov=document.createElement("div");ov.className="sheet";const isO=m=>K.co&&K.co.owner===m.uid,rl=m=>isO(m)?"boss":m.role;
 const draw=()=>{const L=K.mems.slice().sort((a,b)=>(a.st==="wait"?0:1)-(b.st==="wait"?0:1)||(isO(b)-isO(a))||((rl(b)==="bantou")-(rl(a)==="bantou")));
  ov.innerHTML=`<div class="sbox" style="max-height:88vh"><h2>👥 なかまと許可</h2><div class="note">名前を押すと、許可・直せる／見るだけ・番頭（社長だけが決められます）を変えられます。</div>
  ${L.map(m=>`<button class="site" data-u="${esc(m.uid)}"><b>${esc(m.name||"（名前なし）")}</b> <span class="role">${m.st==="wait"?"⏳ 許可待ち":ROLE[rl(m)]||""}</span>${m.uid===K.uid?" <span class='sub'>（自分）</span>":""}
   <div class="sub">${m.st==="wait"?"押して許可する":rl(m)!=="mem"?"全部見られる・直せる（残業・交通費・人工も）":(m.perms||{}).edit?"✏️ 直せる":"👀 見るだけ"}</div></button>`).join("")||`<div class="note">まだいません。「📨 招待のリンクを送る」で呼んでください。</div>`}
  <button class="btn" data-x="1">閉じる</button></div>`};
 draw();document.body.appendChild(ov);
 ov.onclick=e=>{const b=e.target.closest("button");if(e.target===ov||(b&&b.dataset.x)){ov.remove();card();return}if(b&&b.dataset.u){ov.remove();permSheet(K.mems.find(m=>m.uid===b.dataset.u))}}}
function permSheet(m){if(!m)return;const isO=K.co&&K.co.owner===m.uid,ov=document.createElement("div");ov.className="sheet";let role=m.role||"mem";const wait=m.st==="wait";
 const locked=!owner()&&role!=="mem";   // 番頭・社長は社長だけが変えられる
 const draw=()=>{ov.innerHTML=`<div class="sbox" style="max-height:88vh"><h2>${esc(m.name||"（名前なし）")}</h2>
  ${isO?`<div class="note">👑 会社を作った社長です（いつも全部見られます）</div>`:locked?`<div class="note">${ROLE[role]||""}です。番頭を決める・外すのは社長だけです。</div>`:`
  ${owner()?`<label class="f">役割</label><select data-r="1">${[["mem","👷 なかま"],["bantou","🧭 番頭（全部見られる・直せる・許可を決める・残業・交通費・人工も）"]].map(([v,t])=>`<option value="${v}" ${role===v?"selected":""}>${t}</option>`).join("")}</select>`:""}
  ${role==="mem"?(wait?`<div class="note" style="margin-top:6px">どちらで許可しますか？（あとから変えられます）</div><button class="btn pri" data-ok="1">✏️ 直せる人として許可</button><button class="btn" data-ok="0">👀 見るだけで許可（新人さん・スマホが苦手な人）</button>`
   :`<div class="note" style="margin-top:6px">${(m.perms||{}).edit?"今は ✏️ 直せる":"今は 👀 見るだけ"}</div><button class="btn ${(m.perms||{}).edit?"":"pri"}" data-ok="1">✏️ 直せるにする</button><button class="btn ${(m.perms||{}).edit?"pri":""}" data-ok="0">👀 見るだけにする</button>`)
   :`<button class="btn pri" data-ok="b">${wait?"✅ 番頭として許可":"💾 番頭にする"}</button>`}
  <button class="btn del" data-rm="1">${wait?"断る":"なかまから外す"}</button>`}
  <button class="btn" data-x="1">閉じる</button></div>`};
 draw();document.body.appendChild(ov);
 ov.onchange=e=>{const t=e.target;if(t.dataset.r){role=t.value;draw()}};
 ov.onclick=async e=>{const b=e.target.closest("button");if(e.target===ov||(b&&b.dataset.x)){ov.remove();return}if(!b)return;
  try{const f=await fx(),path=`cos/${K.cid}/mem/${m.uid}`;
   if(b.dataset.ok!=null){const bt=b.dataset.ok==="b";await f.set(path,{st:"ok",role:bt?"bantou":"mem",perms:bt?{}:MEMP(b.dataset.ok==="1"),at:Date.now()},true);toast(bt?"番頭にしました":b.dataset.ok==="1"?"✏️ 直せるにしました":"👀 見るだけにしました");ov.remove();members()}
   else if(b.dataset.rm){if(!b.dataset.sure){b.dataset.sure="1";b.textContent="本当に？";return}await f.del(path);toast("外しました");ov.remove();members()}}
  catch(err){toast("できませんでした（"+((err&&(err.code||err.message))||err)+"）")}}}
async function leave(){const boss=owner();
 if(!confirm(boss?"この端末を会社から外しますか？（会社のデータはネットに残ります。もう一度入るには招待のリンクを開いてください）":"この会社から抜けますか？（会社の名簿から入った人は、この端末から消えます。現場カードは残ります）"))return;
 try{const f=await fx();if(!boss)await f.del(`cos/${K.cid}/mem/${f.uid}`).catch(()=>{})}catch(e){}
 const C=cal();for(const n of [...C.staff,...C.helpers]){const p=C.prof[n]||{};if(p.fromCo){C.staff=C.staff.filter(x=>x!==n);C.helpers=C.helpers.filter(x=>x!==n);if(C.pin)C.pin=C.pin.filter(x=>x!==n);delete C.prof[n]}else if(p.coX)delete p.coX}calRaw(C);
 for(const s of await allSites())if(s.loc){delete s.loc;await putSite(s)}
 K.cid="";K.me=null;K.co=null;ls("pbm_co",null);ls("pbm_co_h2",null);ls("pbm_co_at",null);renderMenu()}
/* 招待のリンク（genba.html?co=番号）を開いた時 */
async function joinFromUrl(){let cid="";try{cid=new URLSearchParams(location.search).get("co")||""}catch(e){}if(!cid)return;try{history.replaceState(null,"",location.pathname+location.hash)}catch(e){}
 if(K.cid===cid){sync(false,true);return}
 if(K.cid&&!confirm("ほかの会社に入っています。この会社に入りなおしますか？"))return;
 try{const f=await fx(),co=await f.get(`cos/${cid}`);if(!co){toast("招待の会社が見つかりませんでした");return}
  const me=await f.get(`cos/${cid}/mem/${f.uid}`);if(me){K.cid=cid;ls("pbm_co",cid);location.hash="";sync(false,true);return}
  const nm=(prompt(`【${co.name||"会社"}】に入ります。あなたの名前（社長・番頭に見える名前）`,"")||"").trim();if(!nm)return;
  await f.set(`cos/${cid}/mem/${f.uid}`,{name:nm,st:"wait",role:"mem",perms:{},at:Date.now()});
  K.cid=cid;K.me=null;ls("pbm_co",cid);ls("pbm_co_h2",null);toast("入りました。社長・番頭の許可を待ってください");location.hash="";sync(false,true)}
 catch(e){toast("入れませんでした（"+((e&&(e.code||e.message))||e)+"）")}}

/* ---- 画面を包む：見るだけの人は直すボタンを出さない・社長・番頭以外は残業・交通費・人工を出さない ---- */
const hide=el=>{if(el)el.style.display="none"};
const viewNote=()=>{const n=document.createElement("div");n.className="note";n.style.cssText="margin:0 4px 6px;color:var(--danger)";n.textContent="👀 見るだけです（直すには社長・番頭の許可がいります）";const h=document.querySelector("#app h1");if(h)h.after(n)};
const wrap=(name,after)=>{const o=window[name];if(typeof o!=="function")return;window[name]=function(){const r=o.apply(this,arguments);return r&&r.then?r.then(v=>{after.apply(this,arguments);return v}):(after.apply(this,arguments),r)}};
wrap("renderMenu",()=>{const app=document.getElementById("app"),at=app&&(app.querySelector("#mPeople")||app.querySelector("h1"));if(!at)return;const box=document.createElement("div");box.className="card";box.id="coCard";box.style.marginTop="10px";at.after(box);card();
 if(K.cid&&Date.now()-K.at>20000)sync(true,true)});
wrap("renderList",()=>{if(coOn()){if(!coEdit())hide(document.getElementById("bNew"));soon()}});
wrap("renderEdit",()=>{if(!coOn())return;const app=document.getElementById("app");
 if(!coAdm()){const c=document.getElementById("costs");hide(c&&c.closest(".card"))}
 if(!coEdit()){app.querySelectorAll("input,select,textarea").forEach(el=>{if(el.id!=="fMemo")el.disabled=true});
  ["bDel","bDup","bHere","bParkClr","bPh","bMem","bHelp","chips"].forEach(id=>hide(document.getElementById(id)));
  app.querySelectorAll("#mems button,#helps button,#phs button,#dCal button").forEach(b=>b.disabled=true);viewNote()}
 soon()});
wrap("renderWeek",()=>{if(!coOn())return;if(!coAdm())hide(document.getElementById("bKosu"));
 if(!coEdit()){hide(document.getElementById("bAddP"));document.querySelectorAll("#app [data-new]").forEach(hide)}soon()});
const rk=renderKosu;window.renderKosu=async function(){if(coOn()&&!adm()){document.querySelector(".bar")?.remove();
  $("#app").innerHTML=`<h1><button class="btn sm" id="bBk">← 戻る</button></h1><div class="card"><h2>📊 人工・⏱ 残業・🚗 交通費</h2><div class="note">社長・番頭だけが見られます。</div></div>`;$("#bBk").onclick=()=>history.back();return}
 return rk.apply(this,arguments)};
wrap("renderPeople",()=>{if(coOn()&&!coAdm())document.querySelectorAll("#app [data-mv]").forEach(b=>b.remove())});
wrap("renderPerson",()=>{if(!coOn())return;const C=cal(),n=typeof pName!=="undefined"?pName:"",p=C.prof[n]||{},h=H();
 if(!coAdm()){const s=document.getElementById("pSum");hide(s&&s.closest(".card"));if(p.id&&h["r:"+p.id]!==undefined){hide(document.getElementById("bDelP"));hide(document.getElementById("bKind"))}}});
const pk=pick;window.pick=function(){if(coOn()&&!coEdit()){toast("👀 見るだけです（直すには社長・番頭の許可がいります）");return}const r=pk.apply(this,arguments);
 if(coOn()&&!coAdm()){const ov=document.body.lastElementChild,o=ov&&ov.querySelector("[data-oh]");hide(o&&o.closest("div[style*='border-top']"))}return r};
addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&K.cid&&Date.now()-K.at>30000)sync(true,true)});
setInterval(()=>{if(document.visibilityState==="visible"&&K.cid&&Date.now()-K.at>60000)sync(true,true)},15000);
setTimeout(()=>{if(!location.hash&&document.getElementById("mPeople")&&!document.getElementById("coCard"))renderMenu();   // 開いた時にもう出ていたメニューに、会社の欄を入れ直す
 joinFromUrl();if(K.cid&&!/[?&]co=/.test(location.search))sync(true,true)},400);
window.__CO={K,sync,packS,cj};   // 確かめる用
})();
