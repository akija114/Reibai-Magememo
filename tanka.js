/* 冷媒配管の曲げ共有：tanka.js（💹 単価表）
   ・単価に「いつ直したか」を持たせる。半年（180日）より古い単価は色を変えて「見直し」の印
   ・まとめて値上げ：種類（冷媒管・ドレン・金物・全部）ごとに %
   ・ネット相場：楽天市場・Yahoo!ショッピングの公式の検索の仕組み（API）で、ネットの安値〜中くらいを参考に出す。
     キー（無料登録）はこのiPhoneにだけ保存。結果は参考で、使うかどうかは自分で決める
   ・Excel（.xlsx）・CSV の単価表を読み込んで、品名を自動で結び付けて反映。こちらの単価表は CSV（Excelで開ける）で書き出せる
     .xlsx はブラウザの機能だけで読む（外の部品を使わないので、電波が無くても読める）。古い .xls は読めないので .xlsx か CSV で */
(function(){
const LS=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},LSset=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const esc=s=>String(s==null?"":s).replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const OLD=180;
/* 単価の保存：{品名:{p:単価,d:"2026-10-14",s:"手入力|Excel|楽天|Yahoo|値上げ"}}（前の版の数字だけの形も読める） */
const ALL=()=>{const o=LS("pbm_mt_price",{}),r={};Object.keys(o).forEach(k=>{const v=o[k];r[k]=typeof v==="object"&&v?{p:+v.p||0,d:v.d||"",s:v.s||"",c:v.c||""}:{p:+v||0,d:"",s:"",c:""}});return r};
const SAVE=o=>LSset("pbm_mt_price",o);
/* 品番：入れた品番。無ければ品名の中の品番（DV-DL など）を使う */
const autoCode=n=>{const m=String(n).match(/\b((?:DV|CMY|SDP|KHRP|BKSP|PAC)-[A-Z0-9-]+)/i);return m?m[1]:""};
const get=n=>{const v=ALL()[n]||{p:0,d:"",s:"",c:""};return{...v,c:v.c||autoCode(n)}};
const setCode=(n,c)=>{const o=ALL();o[n]={...(o[n]||{p:0,d:"",s:""}),c:String(c||"").trim().slice(0,40)};SAVE(o)};
const set=(n,p,s)=>{const o=ALL();o[n]={p:Math.max(0,Math.round(+p||0)),d:today(),s:s||"手入力",c:(o[n]||{}).c||""};SAVE(o)};
const age=d=>{if(!d)return 9999;const t=Date.parse(d);return isFinite(t)?Math.floor((Date.now()-t)/864e5):9999};
const isOld=n=>{const v=get(n);return v.p>0&&age(v.d)>OLD};
const dLab=v=>v.p?(v.d?v.d.slice(0,7).replace("-","/"):"日付なし")+(v.s&&v.s!=="手入力"?"・"+v.s:""):"";

/* ===== 品名の「種類」と「サイズ」（Excelの品名と結び付ける・まとめて値上げの種類分け） ===== */
const N=s=>String(s||"").normalize("NFKC").replace(/\s+/g,"").replace(/[×xX＊*・･\/／]/g,m=>m==="/"||m==="／"?"/":"×");
const FR={"1/4":"2分","3/8":"3分","1/2":"4分","5/8":"5分","3/4":"6分","7/8":"7分"},PHI={"6.35":"2分","6.4":"2分","9.52":"3分","9.5":"3分","12.7":"4分","15.88":"5分","15.9":"5分","19.05":"6分","22.22":"7分","25.4":"8分","28.58":"28","31.75":"31","38.1":"38"};
const TYPES=[["ペアコイル",/ペアコイル|ペアチューブ|被覆銅管ペア|ペア管/],["分岐",/分岐/],["保温",/保温材|保温筒|断熱材|ドレン保温/],["エルボ90",/90°?エルボ|エルボ90|90L|DV-DL/],["エルボ45",/45°?エルボ|エルボ45|45L|DV-45L/],["Y",/45°?Y|DV-Y/],["異径",/異径|インクリーザ|レジューサ|INソケット/],["チーズ",/チーズ|DT\b|DV-DT/],["ソケット",/ソケット|DS\b|DV-DS/],["掃除口",/掃除口|CO\b/],["キャップ",/キャップ/],["吊りバンド",/吊りバンド|吊バンド|吊り金具|吊金具|ハンガー/],["立てバンド",/立てバンド|立バンド|管支持金具/],["全ねじ",/全ねじ|全ネジ|寸切|W3\/8ボルト/],["ナット",/ナット/],["吊り元",/インサート|ダクター|吊り元|吊元/],["接着",/接着|テープ/],["ACドレン",/ACドレン|AC管|保温付ドレン/],["VP管",/VP管|塩ビ管|硬質塩ビ/],["銅管",/銅管|直管|コイル/]];
function feat(s){const t=String(s||"").normalize("NFKC").replace(/\s+/g," ");let ty="";for(const[k,re]of TYPES){if(re.test(t.replace(/\s/g,""))){ty=k;break}}
 const sz=new Set();let m;const r1=/(\d)分/g;while((m=r1.exec(t)))sz.add(m[1]+"分");
 Object.keys(FR).forEach(f=>{if(t.includes(f))sz.add(FR[f])});const r2=/(\d{1,2}\.\d{1,2})/g;while((m=r2.exec(t)))if(PHI[m[1]])sz.add(PHI[m[1]]);
 const r3=/(VP|AC)(\d{2,3})/gi;while((m=r3.exec(t)))sz.add(m[1].toUpperCase()+m[2]);const r4=/(\d{2,3})A(?![C-Z])/g;while((m=r4.exec(t)))sz.add(m[1]+"A");
 /* 数字だけのサイズ（「ACドレン 40」「AC 90°エルボ 40」「吊バンド 50」）：AC・VP・バンドの時だけ呼び径にする */
 const bare=()=>{const r=/(?:^|[^\d.°/])(20|25|30|40|50|65|75|100)(?![\d.°分m/])/g;let x;while((x=r.exec(t)))return x[1];return null};
 const mat=/AC/i.test(t)?"AC":/VP|塩ビ/.test(t)?"VP":"";
 if(mat&&![...sz].some(z=>/^(VP|AC)/.test(z))&&ty!=="吊りバンド"&&ty!=="立てバンド"){const b=bare();if(b)sz.add(mat+b)}
 if((ty==="吊りバンド"||ty==="立てバンド")&&![...sz].some(z=>/A$/.test(z))){const b=bare();if(b)sz.add(b+"A")}
 return{ty,sz}}
function score(a,b){const A=feat(a),B=feat(b);if(!A.ty||A.ty!==B.ty)return 0;let s=5;A.sz.forEach(z=>{if(B.sz.has(z))s+=2;else s-=3});B.sz.forEach(z=>{if(!A.sz.has(z))s-=1});return s}
const CATS=[["all","全部",/./],["ref","冷媒（銅管・ペアコイル・保温・分岐）",/ペアコイル|銅管|保温材 φ|分岐管|エルボ .*φ/],["drn","ドレン（管・継手・接着剤）",/ドレン|VP|AC\d|エルボ|チーズ|ソケット|掃除口|異径|接着/],["hw","金物（バンド・全ねじ・ナット・吊り元）",/バンド|全ねじ|ナット|吊り/]];

/* ===== ネット相場 ===== */
const KEY=()=>LS("pbm_mt_keys",{rk:"",rka:"",yh:""}),setKEY=v=>LSset("pbm_mt_keys",v);
const kw=n=>{let k=String(n).replace(/（[^）]*）/g," ").replace(/\s+/g," ").trim();if(/ペアコイル/.test(n)&&!/\d+m/.test(k))k+=" 20m";return k};
async function netSearch(q){const K=KEY(),out=[],errs=[];
 const words=N(q).split(/(?=[^\x00-\x7f])|\s+/).filter(Boolean),qn=q.split(/\s+/).filter(Boolean).map(N);
 if(K.rk){try{let u="https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601?format=json&formatVersion=2&hits=30&applicationId="+encodeURIComponent(K.rk)+(K.rka?"&accessKey="+encodeURIComponent(K.rka):"")+"&keyword="+encodeURIComponent(q);
   let r=await fetch(u);if(!r.ok&&!K.rka){r=await fetch("https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601?format=json&formatVersion=2&hits=30&applicationId="+encodeURIComponent(K.rk)+"&keyword="+encodeURIComponent(q))}
   if(!r.ok)throw new Error("楽天 "+r.status);const j=await r.json();(j.Items||[]).forEach(it=>{const x=it.Item||it;out.push({src:"楽天",n:x.itemName,p:+x.itemPrice,shop:x.shopName,url:x.itemUrl,free:x.postageFlag===0})})}catch(e){errs.push(e.message||"楽天につながりませんでした")}}
 if(K.yh){try{const r=await fetch("https://shopping.yahooapis.jp/ShoppingWebService/V3/itemSearch?results=30&appid="+encodeURIComponent(K.yh)+"&query="+encodeURIComponent(q));if(!r.ok)throw new Error("Yahoo! "+r.status);const j=await r.json();
   (j.hits||[]).forEach(x=>out.push({src:"Yahoo!",n:x.name,p:+x.price,shop:x.seller&&x.seller.name,url:x.url,free:x.shipping&&x.shipping.code===2}))}catch(e){errs.push(e.message||"Yahoo!につながりませんでした")}}
 /* 検索した言葉が全部入っている商品だけ（部品・付属品を外す） */
 let L=out.filter(o=>o.p>0&&qn.every(w=>N(o.n).includes(w)));if(L.length<3)L=out.filter(o=>o.p>0);
 L.sort((a,b)=>a.p-b.p);const med=L.length?L[Math.floor(L.length/2)].p:0;return{L,med,min:L.length?L[0].p:0,errs}}

/* ===== Excel（.xlsx）・CSV を読む ===== */
async function unzip(buf){const dv=new DataView(buf),u8=new Uint8Array(buf);let e=-1;for(let i=buf.byteLength-22;i>=Math.max(0,buf.byteLength-70000);i--)if(dv.getUint32(i,true)===0x06054b50){e=i;break}
 if(e<0)throw new Error("Excelのファイルとして読めませんでした");const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const files={},td=new TextDecoder();
 for(let k=0;k<n;k++){const meth=dv.getUint16(p+10,true),csz=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),xl=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true),name=td.decode(u8.subarray(p+46,p+46+nl));
  files[name]={meth,csz,off};p+=46+nl+xl+cl}
 const read=async name=>{const f=files[name];if(!f)return null;const nl=dv.getUint16(f.off+26,true),xl=dv.getUint16(f.off+28,true),st=f.off+30+nl+xl,raw=u8.subarray(st,st+f.csz);
  if(f.meth===0)return td.decode(raw);if(typeof DecompressionStream==="undefined")throw new Error("このiPhoneではExcelを読めません。CSVで保存して読み込んでください");
  const s=new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"));return await new Response(s).text()};return{files,read}}
const colIdx=r=>{const m=String(r).match(/^([A-Z]+)/);if(!m)return 0;let n=0;for(const c of m[1])n=n*26+c.charCodeAt(0)-64;return n-1};
async function readXlsx(buf){const z=await unzip(buf),dp=new DOMParser(),ss=[],txt=el=>[...el.getElementsByTagName("t")].map(t=>t.textContent).join("");
 const sx=await z.read("xl/sharedStrings.xml");if(sx){const d=dp.parseFromString(sx,"application/xml");[...d.getElementsByTagName("si")].forEach(si=>ss.push(txt(si)))}
 const sheets=Object.keys(z.files).filter(f=>/^xl\/worksheets\/sheet\d+\.xml$/.test(f)).sort((a,b)=>parseInt(a.match(/\d+/))-parseInt(b.match(/\d+/))),rows=[];
 for(const sh of sheets){const d=dp.parseFromString(await z.read(sh),"application/xml");[...d.getElementsByTagName("row")].forEach(r=>{const row=[];[...r.getElementsByTagName("c")].forEach(c=>{const t=c.getAttribute("t"),v=c.getElementsByTagName("v")[0];let val="";
   if(t==="s")val=ss[+((v&&v.textContent)||0)]||"";else if(t==="inlineStr")val=txt(c);else val=v?v.textContent:"";row[colIdx(c.getAttribute("r"))]=val});rows.push(row.map(x=>x==null?"":x))});rows.push([])}
 return rows}
function readCsv(t){const rows=[];let row=[],cur="",q=false;for(let i=0;i<t.length;i++){const c=t[i];if(q){if(c==='"'){if(t[i+1]==='"'){cur+='"';i++}else q=false}else cur+=c}
  else if(c==='"')q=true;else if(c===","||c==="\t"){row.push(cur);cur=""}else if(c==="\n"||c==="\r"){if(c==="\r"&&t[i+1]==="\n")i++;row.push(cur);rows.push(row);row=[];cur=""}else cur+=c}
 if(cur||row.length){row.push(cur);rows.push(row)}return rows}
/* 表から「品名」と「単価」を取り出す（見出しの行を探す。無ければ文字の多い列と数字の多い列） */
function pickRows(rows){const num=v=>{const s=String(v).normalize("NFKC").replace(/[,¥円\s]/g,"");return/^\d+(\.\d+)?$/.test(s)?+s:NaN};let hi=-1,cN=-1,cS=[],cP=-1,cC=-1;
 for(let i=0;i<Math.min(rows.length,40);i++){const r=rows[i].map(x=>String(x).normalize("NFKC").replace(/\s/g,""));const n=r.findIndex(x=>/^(品名|商品名|名称|品目|摘要|材料名|品番名称)$/.test(x)),p=r.findIndex(x=>/^(単価|価格|売価|仕切|仕切単価|販売単価|見積単価|新単価|改定後)/.test(x));
  if(n>=0&&p>=0){hi=i;cN=n;cP=p;cS=r.map((x,k)=>/^(規格|サイズ|仕様|寸法)/.test(x)?k:-1).filter(k=>k>=0);cC=r.findIndex(x=>/^(品番|型番|コード|品目コード|商品コード|メーカー品番)/.test(x));break}}
 if(hi<0){const W=Math.max(...rows.map(r=>r.length),0),cnt=k=>rows.reduce((a,r)=>a+(isFinite(num(r[k]))?1:0),0),tx=k=>rows.reduce((a,r)=>a+(String(r[k]||"").length>2&&!isFinite(num(r[k]))?1:0),0);
  let bt=-1,bn=-1;for(let k=0;k<W;k++){if(bt<0||tx(k)>tx(bt))bt=k}for(let k=W-1;k>=0;k--){if(k!==bt&&(bn<0||cnt(k)>cnt(bn)))bn=k}cN=bt;cP=bn}
 const out=[];rows.slice(hi+1).forEach(r=>{const n=[r[cN],...cS.map(k=>r[k])].filter(Boolean).join(" ").trim(),p=num(r[cP]);if(n&&isFinite(p)&&p>0)out.push({n,p:Math.round(p),c:cC>=0?String(r[cC]||"").trim():""})});return out}
/* 読み込んだ行 → アプリの品名に結び付ける */
function matchAll(list,names){return list.map(o=>{let best=null,bs=0,second=0;names.forEach(nm=>{if(N(nm)===N(o.n)){best=nm;bs=99;return}const s=score(o.n,nm);if(s>bs){second=bs;bs=s;best=nm}else if(s>second)second=s});
 return{...o,to:bs>=5&&bs>second?best:(bs===99?best:""),sc:bs}})}

/* ===== 画面（材料拾い・見積もりの「💹 単価表」タブ） ===== */
const ST={imp:null,net:{}};
function names(){const s=new Set(Object.keys(ALL()));try{(window.mtCollect?mtCollect():[]).forEach(g=>g.items.forEach(it=>{if(it.u!=="か所")s.add(it.n)}))}catch(e){}return[...s]}
function render(b,rerender){const A=ALL(),L=names(),K=KEY();const nOld=L.filter(isOld).length;
 let h=`<div style="background:#f8fafc;border-radius:12px;padding:8px;margin-bottom:8px"><b>📈 まとめて値上げ</b><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:4px">
   <select id="tkCat" style="height:38px;border-radius:9px;font-size:14px;max-width:100%">${CATS.map(([k,l])=>`<option value="${k}">${l}</option>`).join("")}</select>
   <input id="tkPct" inputmode="decimal" placeholder="15" style="width:64px"> % <button id="tkUp" style="height:38px;padding:0 12px;border-radius:10px;background:#b45309;color:#fff;font-weight:800">上げる</button></div>
   <div style="font-size:12px;color:#64748b;margin-top:2px">単価が入っている品目だけ。下げる時は −5 のように入れます。</div></div>
  <div style="background:#f8fafc;border-radius:12px;padding:8px;margin-bottom:8px"><b>📥 Excel・CSV の単価表</b><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">
   <label style="flex:1;min-width:140px;height:42px;border-radius:10px;background:#16a34a;color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;text-align:center;padding:0 8px;line-height:1.2">📥 読み込む（.xlsx・.csv）<input id="tkFile" type="file" accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display:none"></label>
   <button id="tkExp" style="flex:1;min-width:140px;height:42px;border-radius:10px;border:1.5px solid #16a34a;background:#fff;color:#15803d;font-weight:800">書き出す（CSV）</button></div>
   <div style="font-size:12px;color:#64748b;margin-top:2px">問屋さんの単価表（品名・単価の列があるもの）を読むと、アプリの品名に自動で結び付けます。書き出したCSVはExcelで直して、また読み込めます。</div></div>`;
 if(ST.imp){const I=ST.imp;h+=`<div style="border:2px solid #16a34a;border-radius:12px;padding:8px;margin-bottom:8px"><b>📥 ${esc(I.file)}：${I.rows.length}行</b>（結び付いた ${I.rows.filter(r=>r.to).length}行）
   <table><tr><th>読み込んだ品名</th><th class="q">単価</th><th>→ アプリの品名</th></tr>${I.rows.slice(0,200).map((r,i)=>`<tr><td>${esc(r.n)}</td><td class="q">${r.p.toLocaleString()}</td><td><select data-imp="${i}" style="max-width:150px;height:32px;font-size:12px;border-radius:8px"><option value="">（使わない）</option>${L.map(nm=>`<option value="${esc(nm)}"${nm===r.to?" selected":""}>${esc(nm)}</option>`).join("")}<option value="__new"${r.to==="__new"?" selected":""}>＋この品名で新しく登録</option></select></td></tr>`).join("")}</table>
   <div style="display:flex;gap:6px;margin-top:6px"><button id="tkImpOk" style="flex:1;height:44px;border-radius:12px;background:#16a34a;color:#fff;font-weight:800">✅ 反映する</button><button id="tkImpNo" style="flex:1;height:44px;border-radius:12px;border:1.5px solid #cbd5e1;background:#fff;font-weight:800">やめる</button></div></div>`}
 h+=`<h4>💹 単価表${nOld?` <span style="font-size:12px;color:#b45309">（⚠️ 半年以上前の単価 ${nOld}件）</span>`:""}</h4><table><tr><th>品名</th><th class="q">単価</th><th></th></tr>${L.map(nm=>{const v=A[nm]||{p:0,d:""},old=isOld(nm),r=ST.net[nm];
   return`<tr${old?' style="background:#fff7ed"':""}><td>${esc(nm)}<br><small style="color:${old?"#b45309":"#64748b"}">${v.p?(old?"⚠️ ":"")+dLab(v)+(old?"（見直し）":""):"未入力"}</small><br><input data-tkc="${esc(nm)}" value="${esc(v.c||autoCode(nm))}" placeholder="品番" style="width:150px;height:28px;font-size:12px;margin-top:2px">${r?netHtml(nm,r):""}</td><td class="q"><input data-tk="${esc(nm)}" inputmode="numeric" value="${v.p||""}" placeholder="0" style="width:84px"></td><td><button data-net="${esc(nm)}" style="height:34px;padding:0 8px;border-radius:9px;border:1.5px solid #cbd5e1;background:#fff;font-weight:800">🔎</button></td></tr>`}).join("")}</table>`;
 h+=`<details style="background:#f8fafc;border-radius:12px;padding:8px;margin-bottom:8px"><summary style="font-weight:800">🔎 ネット相場の設定（楽天・Yahoo!）${K.rk||K.yh?" ✅":""}</summary>
   <div style="font-size:12.5px;color:#475569;margin:4px 0">無料登録でもらえるキーを入れると、品名の横の「🔎」でネットの値段を調べられます。キーはこのiPhoneにだけ保存します。<br>・楽天：<a href="https://webservice.rakuten.co.jp/" target="_blank" rel="noopener">楽天ウェブサービス</a>でアプリを登録（アプリID・アクセスキー。許可するサイトに <b>${esc(location.origin)}</b> を入れる）<br>・Yahoo!：<a href="https://e.developer.yahoo.co.jp/register" target="_blank" rel="noopener">Yahoo!デベロッパーネットワーク</a>でアプリを登録（Client ID）</div>
   <div style="display:grid;grid-template-columns:auto 1fr;gap:4px;align-items:center;font-size:13px">楽天 アプリID<input id="tkRk" value="${esc(K.rk)}" autocomplete="off">楽天 アクセスキー<input id="tkRka" value="${esc(K.rka)}" autocomplete="off">Yahoo! Client ID<input id="tkYh" value="${esc(K.yh)}" autocomplete="off"></div></details>`;
 b.innerHTML=h;
 const q=s=>b.querySelector(s),qa=s=>b.querySelectorAll(s);
 qa("[data-tk]").forEach(i=>i.onchange=()=>{set(i.dataset.tk,String(i.value).replace(/\D/g,""));rerender()});
 qa("[data-tkc]").forEach(i=>i.onchange=()=>{setCode(i.dataset.tkc,i.value)});
 q("#tkUp").onclick=()=>{const pc=parseFloat(String(q("#tkPct").value).normalize("NFKC"));if(!isFinite(pc)||!pc){toast("% を入れてください");return}const c=CATS.find(x=>x[0]===q("#tkCat").value),o=ALL();let n=0;
  Object.keys(o).forEach(k=>{if(o[k].p>0&&c[2].test(k)){o[k]={p:Math.round(o[k].p*(1+pc/100)),d:today(),s:"値上げ"+(pc>0?"+":"")+pc+"%"};n++}});SAVE(o);toast(n?c[1]+"の単価 "+n+"件を "+(pc>0?"+":"")+pc+"% にしました":"単価が入っている品目がありません");rerender()};
 q("#tkFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const buf=await f.arrayBuffer();let rows;
   if(/\.xlsx$/i.test(f.name)||new Uint8Array(buf.slice(0,2))[0]===0x50)rows=await readXlsx(buf);else if(/\.xls$/i.test(f.name)){toast("古いExcel（.xls）は読めません。Excelで「.xlsx」か「CSV」で保存し直してください");return}
   else{let t=new TextDecoder("utf-8").decode(buf);if(t.includes("�"))try{t=new TextDecoder("shift_jis").decode(buf)}catch(err){}rows=readCsv(t.replace(/^﻿/,""))}
   const list=pickRows(rows);if(!list.length){toast("品名と単価の列が見つかりませんでした（見出しに「品名」「単価」があると確実です）");return}
   ST.imp={file:f.name,rows:matchAll(list,names())};rerender()}catch(err){console.warn(err);toast(err.message||"読み込めませんでした")}e.target.value=""};
 if(ST.imp){qa("[data-imp]").forEach(s=>s.onchange=()=>{ST.imp.rows[+s.dataset.imp].to=s.value});
  q("#tkImpOk").onclick=()=>{const o=ALL();let n=0;ST.imp.rows.forEach(r=>{const k=r.to==="__new"?r.n:r.to;if(!k)return;o[k]={p:r.p,d:today(),s:"Excel",c:r.c||(o[k]||{}).c||""};n++});SAVE(o);toast("📥 単価を "+n+"件 反映しました");ST.imp=null;rerender()};
  q("#tkImpNo").onclick=()=>{ST.imp=null;rerender()}}
 q("#tkExp").onclick=()=>{const o=ALL(),rows=[["品名","品番","単価","更新日","メモ"],...names().map(k=>[k,(o[k]||{}).c||autoCode(k),(o[k]||{}).p||"",(o[k]||{}).d||"",(o[k]||{}).s||""])];
  const csv="﻿"+rows.map(r=>r.map(v=>{const s=String(v);return/[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}).join(",")).join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="単価表_"+today()+".csv";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000);toast("単価表を書き出しました（ファイル アプリに保存されます）")};
 const kk=()=>setKEY({rk:q("#tkRk").value.trim(),rka:q("#tkRka").value.trim(),yh:q("#tkYh").value.trim()});["#tkRk","#tkRka","#tkYh"].forEach(s=>q(s).onchange=kk);
 qa("[data-net]").forEach(bt=>bt.onclick=async()=>{const nm=bt.dataset.net,K2=KEY();if(!K2.rk&&!K2.yh){toast("先に「🔎 ネット相場の設定」で楽天かYahoo!のキーを入れてください");const d=b.querySelector("details");if(d)d.open=true;return}
  const kq=prompt("この言葉でネットを検索します（直してもOK）",kw(nm));if(!kq)return;bt.textContent="…";ST.net[nm]=await netSearch(kq);ST.net[nm].q=kq;rerender()});
 qa("[data-use]").forEach(bt=>bt.onclick=()=>{const[nm,p,src]=JSON.parse(bt.dataset.use);const o=ALL();o[nm]={p:+p,d:today(),s:src};SAVE(o);delete ST.net[nm];toast("単価を "+(+p).toLocaleString()+"円 にしました");rerender()})}
function netHtml(nm,r){if(!r.L.length)return`<div style="font-size:12px;color:#b91c1c;margin-top:4px">「${esc(r.q)}」でネットの値段が見つかりませんでした${r.errs.length?"（"+esc(r.errs.join("・"))+"）":""}</div>`;
 const u=(p,src)=>esc(JSON.stringify([nm,p,src]));
 return`<div style="font-size:12px;background:#eff6ff;border-radius:8px;padding:6px;margin-top:4px">🔎「${esc(r.q)}」${r.L.length}件：安値 <b>${r.min.toLocaleString()}</b>円／真ん中 <b>${r.med.toLocaleString()}</b>円（税込・送料は店ごと）
  <div style="display:flex;gap:4px;margin:4px 0"><button data-use="${u(r.min,"ネット安値")}" style="flex:1;height:30px;border-radius:8px;background:#2563eb;color:#fff;font-weight:800;font-size:12px">安値を使う</button><button data-use="${u(r.med,"ネット相場")}" style="flex:1;height:30px;border-radius:8px;background:#1d4ed8;color:#fff;font-weight:800;font-size:12px">真ん中を使う</button></div>
  ${r.L.slice(0,5).map(o=>`<div>・${o.p.toLocaleString()}円 <a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(String(o.n).slice(0,40))}</a>（${esc(o.src)}${o.shop?"・"+esc(o.shop):""}${o.free?"・送料無料":""}）</div>`).join("")}${r.errs.length?`<div style="color:#b91c1c">${esc(r.errs.join("・"))}</div>`:""}</div>`}
window.TK={get,set,setCode,names:()=>names(),isOld,dLab,render,readCsv,readXlsx,pickRows,matchAll,score,feat};
})();
