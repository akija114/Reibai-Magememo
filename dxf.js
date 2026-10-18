/* ===== DXF（CADの図面データ）を読む =====
   ・線・円弧・ポリライン・文字・ブロック（INSERT）を、実寸（mm）で読み込む
   ・画層（レイヤー）の名前で「何の線か」を見分ける（冷媒管・ドレン管・ダクト・衛生配管・機器・建築）
   ・読み込んだら、PDFと同じ形（PLAN）にして、今までの「全部自動で読む」などをそのまま使えるようにする */
(function(){
const ACI=(()=>{const t=["#000000","#ff0000","#ffff00","#00ff00","#00ffff","#0000ff","#ff00ff","#000000","#808080","#c0c0c0"];
 for(let i=10;i<250;i++){const h=Math.floor((i-10)/10)*15,k=(i-10)%10,v=[1,1,.8,.8,.65,.65,.5,.5,.3,.3][Math.floor(k/2)*2]||1,s=k%2?.5:1;
  const f=n=>{const q=(n+h/60)%6;return v-v*s*Math.max(0,Math.min(q,4-q,1))};t[i]="#"+[f(5),f(3),f(1)].map(x=>("0"+Math.round(x*255).toString(16)).slice(-2)).join("")}
 [51,91,132,173,214,255].forEach((g,j)=>{const x=("0"+g.toString(16)).slice(-2);t[250+j]="#"+x+x+x});return t})();
/* 画層の名前 → 種類 */
/* 線の名前（画層）ごとに、人が決めた種類（図面の会社ごとに名前が違うので）：ref 冷媒・drain ドレン・acq 空調機器・duct・eisei・elec 電気・arch 建築・anno 寸法文字 */
let DXMAP=null;const dxMap=()=>{if(!DXMAP){try{DXMAP=JSON.parse(localStorage.getItem("pbm_dxfmap")||"{}")||{}}catch(e){DXMAP={}}}return DXMAP};
const ELEC_RE=/電気|電灯|動力|弱電|照明|コンセント|ｺﾝｾﾝﾄ|ケーブル|ｹｰﾌﾞﾙ|ラック|ﾗｯｸ|幹線|分電|配電|火報|自火報|感知器|放送|ＬＡＮ|LAN|電話|接地|配線|ELEC|ELE-|^E-?\d*電|LITE|LIGHT|POWR|POWER|CABLE|TRAY|ECLAIR|COURANT/i;
function dxfCat(L){L=L||"";const m=dxMap()[L];if(m)return["ref","drain","duct","eisei","elec"].includes(m)?m:"";
 /* 英語（M-REFR・M-HVAC-DUCT・P-DOMW・E-LITE など）・フランス語（GAINE・PLOMBERIE など）の名前も */
 if(/冷媒|REFR|REFRIG|FRIGO/i.test(L))return"ref";if(/ドレン|ﾄﾞﾚﾝ|CONDENSATE|DRAIN|\bDRN\b/i.test(L))return"drain";if(/ダクト|ﾀﾞｸﾄ|DUCT|GAINE/i.test(L))return"duct";
 if(/給水|給湯|汚水|雑排|排水|通気|消火|衛生|ガス管|ｶﾞｽ|上水|中水|雨水|PLUMB|PLOMB|SANR|SANIT|DOMW|SEWER|WATER|SPRINK|EAU/i.test(L))return"eisei";if(ELEC_RE.test(L))return"elec";return""}
/* 画層の名前 → 自動読み込み用の色（PDFの空調図と同じ色にそろえる：機器＝青、冷媒＝赤紫、ドレン＝オレンジ、建築＝グレー） */
function dxfAnaCol(L){L=L||"";const mp=dxMap()[L];if(mp==="acq")return"#0000ff";if(mp==="arch")return"#c0c0c0";if(mp==="anno")return"#000000";const c=dxfCat(L);
 if(c==="ref")return"#ff00ff";if(c==="drain")return"#ff7f00";if(c)return"#2a9d8f";
 if(/詳細図形/.test(L))return null;   // 機器の「詳細図形」は線が多く、PDFの空調図にも出ない（簡略図形だけ使う）
 if(/基準線|中心線|ｾﾝﾀｰ|センター/.test(L))return"#ff0000";
 if(/機器|ｽﾘｰﾌﾞ|スリーブ|メンテ|室内機|室外機|空調機|PAC/.test(L))return"#0000ff";
 if(/寸法|文字|枠|凡例|方位|^0$|Defpoints/i.test(L))return"#000000";return"#c0c0c0"}
window.dxfCat=dxfCat;
function dec(buf){const b=new Uint8Array(buf),head=new TextDecoder("latin1").decode(b.subarray(0,4000)),m=head.match(/\$ACADVER\s*\r?\n\s*1\s*\r?\n\s*AC(\d+)/);
 const v=m?+m[1]:1032;try{return new TextDecoder(v>=1021?"utf-8":"shift_jis",{fatal:v>=1021}).decode(b)}catch(e){return new TextDecoder("shift_jis").decode(b)}}
function clean(s){return String(s||"").replace(/\\U\+([0-9a-fA-F]{4})/g,(m,h)=>String.fromCharCode(parseInt(h,16))).replace(/%%[cC]/g,"φ").replace(/%%[dD]/g,"°").replace(/%%[pP]/g,"±").replace(/%%[uUoO]/g,"")}
function mtextClean(s){return clean(s).replace(/\\P/g," ").replace(/\\[ACFHQTWfhqtw][^;]*;/g,"").replace(/\\[LlOoKk]/g,"").replace(/[{}]/g,"").replace(/\\S([^;]*);/g,"$1")}
/* 読む：{segs:[[x1,y1,x2,y2,layer,col]], arcs:[{a,m,b,layer}], texts:[{s,x,y,h,r,layer}]} 単位は図面の単位（mm想定） */
function dxfParse(txt){
 const L=txt.split(/\r?\n/),N=L.length;let i=0;const nx=()=>{const c=+(L[i]||"").trim(),v=L[i+1]===undefined?"":L[i+1];i+=2;return[c,v]};
 const layers={},blocks={};let ents=[],sec="",cur=null,blk=null,inTab="";
 const push=(e)=>{if(blk)blk.e.push(e);else if(sec==="ENTITIES")ents.push(e)};
 while(i<N){const[c,v0]=nx(),v=v0.trim();
  if(c===0){
   if(v==="SECTION"){const[c2,v2]=nx();sec=v2.trim();cur=null;continue}
   if(v==="ENDSEC"){sec="";cur=null;continue}
   if(sec==="TABLES"){if(v==="TABLE"){cur=null;continue}if(v==="LAYER"){cur={t:"LAYER",g:{}};inTab="L";continue}cur=null;continue}
   if(sec==="BLOCKS"){if(v==="BLOCK"){blk={name:"",bx:0,by:0,e:[]};cur={t:"BLOCK",g:{},blk:blk};continue}if(v==="ENDBLK"){if(blk&&blk.name)blocks[blk.name]=blk;blk=null;cur=null;continue}}
   if(sec==="BLOCKS"||sec==="ENTITIES"){cur={t:v,g:{}};push(cur);continue}
   cur=null;continue}
  if(!cur)continue;
  if(cur.t==="LAYER"){if(c===2)cur.g.n=v;if(c===62)cur.g.c=+v;if(c===420)cur.g.tc=+v;if(cur.g.n!==undefined&&(c===62||c===420||c===2))layers[cur.g.n]=layers[cur.g.n]||{};if(cur.g.n!==undefined)layers[cur.g.n]={c:cur.g.c,tc:cur.g.tc};continue}
  if(cur.t==="BLOCK"){if(c===2&&!cur.blk.name)cur.blk.name=v;if(c===10)cur.blk.bx=+v;if(c===20)cur.blk.by=+v;continue}
  const g=cur.g;(g[c]=g[c]||[]).push(c===1||c===3||c===2||c===8?v0.replace(/\s+$/,""):v)}
 return{layers,blocks,ents}}
function layCol(lay,layers,e){const tc=e.g[420]?+e.g[420][0]:null;if(tc!=null)return"#"+("00000"+tc.toString(16)).slice(-6);
 const ci=e.g[62]?+e.g[62][0]:256;if(ci>0&&ci<256)return ACI[ci]||"#000000";const l=layers[lay]||{};if(l.tc!=null)return"#"+("00000"+l.tc.toString(16)).slice(-6);return ACI[Math.abs(l.c||7)]||"#000000"}
function dxfGeo(D){const segs=[],arcs=[],texts=[],MAX=400000;
 const f=(e,c,d)=>e.g[c]?+e.g[c][0]:(d||0);
 function walk(list,M,pl,depth){const[a,b,c,d,tx,ty]=M,P=(x,y)=>[a*x+c*y+tx,b*x+d*y+ty];
  for(const e of list){if(segs.length>MAX)return;if(e.g[67]&&e.g[67][0]==="1")continue;
   let lay=e.g[8]?e.g[8][0]:"0";if(lay==="0"&&pl)lay=pl;const col=layCol(lay,D.layers,e),t=e.t;
   const S=(p,q,cv)=>segs.push([p[0],p[1],q[0],q[1],lay,col,cv?1:0]);   // cv：円弧・円から作った線（PDFと同じく、自動読み込みの線には入れない）
   if(t==="LINE")S(P(f(e,10),f(e,20)),P(f(e,11),f(e,21)));
   else if(t==="ARC"||t==="CIRCLE"){const cx=f(e,10),cy=f(e,20),r=f(e,40);let s=t==="ARC"?f(e,50):0,en=t==="ARC"?f(e,51):360;if(en<=s)en+=360;
    const n=Math.max(4,Math.ceil((en-s)/12)),pt=k=>{const q=(s+(en-s)*k/n)*Math.PI/180;return P(cx+r*Math.cos(q),cy+r*Math.sin(q))};
    let p0=pt(0);for(let k=1;k<=n;k++){const p1=pt(k);S(p0,p1,1);p0=p1}
    if(t==="ARC")arcs.push({a:pt(0),m:pt(n/2),b:pt(n),lay,col})}
   else if(t==="LWPOLYLINE"){const xs=e.g[10]||[],ys=e.g[20]||[],bu=[];
    /* ふくらみ（bulge）は頂点の順に入っている */
    const cl=(+((e.g[70]||[0])[0])&1)===1,n=xs.length,bl=e.g[42]||[];
    const pts=[];for(let k=0;k<n;k++)pts.push([+xs[k],+ys[k]]);
    for(let k=0;k<(cl?n:n-1);k++){const p=pts[k],q=pts[(k+1)%n];S(P(p[0],p[1]),P(q[0],q[1]))}}
   else if(t==="ELLIPSE"){const cx=f(e,10),cy=f(e,20),mx=f(e,11),my=f(e,21),ra=f(e,40,1);let s=f(e,41,0),en=f(e,42,Math.PI*2);if(en<=s)en+=Math.PI*2;
    const n=24,pt=k=>{const q=s+(en-s)*k/n,co=Math.cos(q),si=Math.sin(q);return P(cx+mx*co-my*ra*si,cy+my*co+mx*ra*si)};let p0=pt(0);for(let k=1;k<=n;k++){const p1=pt(k);S(p0,p1,1);p0=p1}}
   else if(t==="SPLINE"){const xs=e.g[10]||[],ys=e.g[20]||[];for(let k=0;k+1<xs.length;k++)S(P(+xs[k],+ys[k]),P(+xs[k+1],+ys[k+1]))}
   else if(t==="TEXT"||t==="MTEXT"||t==="ATTRIB"){let s=t==="MTEXT"?mtextClean((e.g[3]||[]).join("")+(e.g[1]||[""]).join("")):clean((e.g[1]||[""])[0]);if(!s.trim())continue;
    const al=t!=="MTEXT"&&(f(e,72)||f(e,73))&&e.g[11],x=al?f(e,11):f(e,10),y=al?f(e,21):f(e,20),p=P(x,y),sc=Math.hypot(a,b);
    texts.push({s:s.trim(),x:p[0],y:p[1],h:f(e,40,2.5)*sc,r:(t==="MTEXT"?f(e,50)*180/Math.PI:f(e,50))+Math.atan2(b,a)*180/Math.PI,lay,col})}
   else if((t==="INSERT"||t==="DIMENSION")&&depth<8){const B=D.blocks[(e.g[2]||[""])[0]];if(!B)continue;
    const sx=t==="INSERT"?f(e,41,1):1,sy=t==="INSERT"?f(e,42,1):1,r=t==="INSERT"?f(e,50)*Math.PI/180:0,x0=t==="INSERT"?f(e,10):0,y0=t==="INSERT"?f(e,20):0;
    const dc=t==="INSERT"?f(e,44):0,dr=t==="INSERT"?f(e,45):0,nc=t==="INSERT"&&dc?Math.max(1,f(e,70,1)):1,nr=t==="INSERT"&&dr?Math.max(1,f(e,71,1)):1;
    for(let ic=0;ic<nc&&ic<50;ic++)for(let ir=0;ir<nr&&ir<50;ir++){const co=Math.cos(r),si=Math.sin(r),ox=x0+ic*dc*co-ir*dr*si,oy=y0+ic*dc*si+ir*dr*co;
     /* ブロックの中の点 p → ins + R*S*(p - 基点) */
     const m=[co*sx,si*sx,-si*sy,co*sy,ox-(co*sx*B.bx-si*sy*B.by),oy-(si*sx*B.bx+co*sy*B.by)];
     walk(B.e,[a*m[0]+c*m[1],b*m[0]+d*m[1],a*m[2]+c*m[3],b*m[2]+d*m[3],a*m[4]+c*m[5]+tx,b*m[4]+d*m[5]+ty],lay==="0"&&pl?pl:lay,depth+1)}}}}
 walk(D.ents,[1,0,0,1,0,0],null,0);return{segs,arcs,texts}}
window.dxfRead=async function(f){const txt=dec(await f.arrayBuffer()),D=dxfParse(txt),G=dxfGeo(D);
 const unit=+(((txt.match(/\$INSUNITS\s*\r?\n\s*70\s*\r?\n\s*(\d+)/)||[])[1])||4),k={1:25.4,2:304.8,4:1,5:10,6:1000}[unit]||1;
 if(k!==1){G.segs.forEach(s=>{for(let j=0;j<4;j++)s[j]*=k});G.arcs.forEach(o=>["a","m","b"].forEach(q=>{o[q]=[o[q][0]*k,o[q][1]*k]}));G.texts.forEach(t=>{t.x*=k;t.y*=k;t.h*=k})}
 return G};
/* PLAN を作る（PDFと同じ形）：px = (x - 左端)/mmpp、上下は反対 */
window.dxfToPlan=function(G,f){const S=G.segs.filter(s=>Math.hypot(s[2]-s[0],s[3]-s[1])>0.5);if(S.length<20)throw new Error("線がありません");
 const xs=[],ys=[];S.forEach(s=>{xs.push(s[0],s[2]);ys.push(s[1],s[3])});xs.sort((a,b)=>a-b);ys.sort((a,b)=>a-b);
 const q=(A,p)=>A[Math.min(A.length-1,Math.max(0,Math.round(p*(A.length-1))))],x0=q(xs,0),x1=q(xs,1),y0=q(ys,0),y1=q(ys,1),pad=Math.max(x1-x0,y1-y0)*0.01;
 const X0=x0-pad,Y1=y1+pad,Wm=x1-x0+2*pad,Hm=y1-y0+2*pad,mmpp=Math.max(Wm/3600,Hm/3600,Math.sqrt(Wm*Hm/7e6));
 const W=Math.round(Wm/mmpp),H=Math.round(Hm/mmpp),px=(x,y)=>[(x-X0)/mmpp,(Y1-y)/mmpp];
 const c=document.createElement("canvas");c.width=W;c.height=H;
 const texts=[];G.texts.forEach(t=>{const p=px(t.x,t.y),h=Math.max(1,t.h/mmpp);texts.push({s:t.s,x:p[0],y:p[1],w:h*0.9*t.s.length,h,lay:t.lay,r:t.r||0,col:t.col})});
 /* 画面に描く線（種類ごとに出し分けるので、px にして取っておく） */
 const dS=S.map(s=>{const a=px(s[0],s[1]),b=px(s[2],s[3]);return[a[0],a[1],b[0],b[1],s[5],dxfGrp(s[4]),s[4]]});
 const segs=S.map(s=>{const a=px(s[0],s[1]),b=px(s[2],s[3]);return[a[0],a[1],b[0],b[1],dxfAnaCol(s[4]),s[4]]}).filter((s,i)=>s[4]&&!S[i][6]&&Math.hypot(s[2]-s[0],s[3]-s[1])>0.3);
 const arcs=G.arcs.filter(o=>dxfAnaCol(o.lay)).map(o=>({a:px(o.a[0],o.a[1]),m:px(o.m[0],o.m[1]),b:px(o.b[0],o.b[1]),col:dxfAnaCol(o.lay),lay:o.lay}));
 /* 自動読み込みに使う文字は、空調（冷媒・ドレン・機器）と建築だけ（ダクト・衛生の「FL+3900」などを配管の高さと間違えないように） */
 const tAna=texts.filter(t=>{const k=dxfCat(t.lay);return k!=="duct"&&k!=="eisei"});
 const segAll=S.map(s=>{const a=px(s[0],s[1]),b=px(s[2],s[3]);return[a[0],a[1],b[0],b[1],"",s[4]]}).filter(s=>dxfCat(s[5]));
 const P={img:c,W,H0:H,segs,segAll,arcs,texts:tAna,textsAll:texts,mmpp,ptpx:0,den:0,dxf:1,dS,route:[],walls:[],show:true,fkey:f.name+"|"+f.size};dxfRender(P);return P};
/* 図面の線を「何の図か」で分ける：空調（冷媒・ドレン・機器）／ダクト／衛生／建築／寸法・文字 */
function dxfGrp(L){L=L||"";const mp=dxMap()[L];if(mp)return mp==="ref"||mp==="drain"||mp==="acq"?"ac":mp;const k=dxfCat(L);if(k==="ref"||k==="drain")return"ac";if(k)return k;
 if(/機器|ｽﾘｰﾌﾞ|スリーブ|メンテ|室内機|室外機|空調|冷媒|PAC|基準線|HVAC|EQPM|EQUIP|AIRCON|CLIM/i.test(L))return"ac";
 if(/寸法|文字|符号|枠|凡例|方位|補助線|表/.test(L))return"anno";return"arch"}
const DXV=[["ac","空調","#2563eb"],["duct","ダクト","#0d9488"],["eisei","衛生","#16a34a"],["elec","電気","#ca8a04"],["arch","建築","#64748b"],["anno","寸法・文字","#a16207"]];
const DXOPT=[["ref","冷媒"],["drain","ドレン"],["acq","空調機器"],["duct","ダクト"],["eisei","衛生"],["elec","電気"],["arch","建築"],["anno","寸法・文字"]];
/* 種類を変えた時：線の色（自動読み込み用）・種類・3D用の線を作り直す */
function dxfRegroup(P){if(!P||!P.dS)return;P.dS.forEach(s=>{s[5]=dxfGrp(s[6])});P.segs.forEach(s=>{const c=dxfAnaCol(s[5]);if(c)s[4]=c});(P.arcs||[]).forEach(o=>{const c=dxfAnaCol(o.lay);if(c)o.col=c});
 P.segAll=P.dS.filter(s=>dxfCat(s[6])).map(s=>[s[0],s[1],s[2],s[3],"",s[6]]);P.rects=null;P._ca=null;try{planAnalyze()}catch(e){}}
/* 線の名前の一覧（表示・非表示と、何の線かを選ぶ） */
window.dxfLayerSheet=function(){const P=typeof PLAN!=="undefined"?PLAN:null;if(!P||!P.dS)return;let ov=document.getElementById("dxfLay");if(ov)ov.remove();
 ov=document.createElement("div");ov.id="dxfLay";ov.style.cssText="position:fixed;inset:0;z-index:9000;background:rgba(15,23,42,.5);display:flex;align-items:flex-end;justify-content:center";
 const draw=()=>{const cnt={};P.dS.forEach(s=>{cnt[s[6]]=(cnt[s[6]]||0)+1});const hid=dxHid(),on=dxvOn(),mp=dxMap();
  const L=Object.keys(cnt).map(n=>({n,c:cnt[n],g:dxfGrp(n),v:mp[n]||(()=>{const k=dxfCat(n);if(k)return k;const g=dxfGrp(n);return g==="ac"?"acq":g})()}));
  const gOrd=DXV.map(x=>x[0]);L.sort((a,b)=>gOrd.indexOf(a.g)-gOrd.indexOf(b.g)||b.c-a.c);
  const esc=t=>String(t).replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
  let h=`<div style="background:#fff;color:#0f172a;width:100%;max-width:560px;max-height:82vh;border-radius:18px 18px 0 0;display:flex;flex-direction:column">
   <div style="display:flex;align-items:center;gap:8px;padding:14px 14px 8px"><b style="font-size:17px;flex:1">📋 線の名前ごと</b><button id="dxlClose" style="height:38px;padding:0 14px;border-radius:10px;font-weight:800;background:#e2e8f0;border:0">閉じる</button></div>
   <div style="font-size:12.5px;color:#475569;padding:0 14px 8px">CADの図面は、線ごとに名前（画層）が付いています。名前は会社・図面ごとに違うので、<b>何の線か</b>を選び直せます。左のボタンで1つずつ表示・非表示。自動読み込みも、表示している線だけを使います。</div>
   <div style="overflow-y:auto;-webkit-overflow-scrolling:touch;padding:0 10px calc(env(safe-area-inset-bottom,0px) + 12px)">`;
  let lg="";L.forEach(o=>{if(o.g!==lg){lg=o.g;const D=DXV.find(x=>x[0]===o.g)||["","その他","#475569"];h+=`<div style="margin:10px 4px 4px;font-weight:800;color:${D[2]}">${D[1]}${on(o.g)?"":"（今は非表示）"}</div>`}
   const vis=!hid.has(o.n);h+=`<div style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid #e2e8f0">
    <button data-lv="${esc(o.n)}" style="flex:none;width:40px;height:34px;border-radius:9px;font-weight:800;border:2px solid #475569;background:${vis?"#475569":"#fff"};color:${vis?"#fff":"#475569"}">${vis?"✓":"－"}</button>
    <div style="flex:1;min-width:0;font-size:13.5px;word-break:break-all">${esc(o.n)}<span style="color:#94a3b8;font-size:12px">（${o.c}本）</span></div>
    <select data-lg="${esc(o.n)}" style="flex:none;height:34px;border-radius:9px;font-size:13px;font-weight:700;max-width:110px">${DXOPT.map(([k,t])=>`<option value="${k}"${k===o.v?" selected":""}>${t}</option>`).join("")}</select></div>`});
  h+=`</div></div>`;ov.innerHTML=h;
  ov.querySelector("#dxlClose").onclick=()=>ov.remove();
  ov.querySelectorAll("[data-lv]").forEach(b=>b.onclick=()=>{const n=b.dataset.lv,H=dxHid();if(H.has(n))H.delete(n);else H.add(n);try{localStorage.setItem("pbm_dxfhide",JSON.stringify([...H]))}catch(e){}apply();draw()});
  ov.querySelectorAll("[data-lg]").forEach(sl=>sl.onchange=()=>{const n=sl.dataset.lg,M=dxMap();M[n]=sl.value;try{localStorage.setItem("pbm_dxfmap",JSON.stringify(M))}catch(e){}dxfRegroup(P);apply();draw()})};
 const apply=()=>{dxfRender(P);if(P.tex)P.tex.needsUpdate=true;const el=document.getElementById("dxfChips");if(el)el.dataset.k="";dxfChips();try{planDraw()}catch(e){}};
 ov.addEventListener("click",e=>{if(e.target===ov)ov.remove()});document.body.appendChild(ov);draw()};
const dxHid=()=>{let a=[];try{a=JSON.parse(localStorage.getItem("pbm_dxfhide")||"[]")||[]}catch(e){}return new Set(a)};
window.dxHid=dxHid;
const dxvOn=()=>{let o={};try{o=JSON.parse(localStorage.getItem("pbm_dxfv")||"{}")||{}}catch(e){}return k=>o[k]!==undefined?!!o[k]:(k!=="duct"&&k!=="eisei")};
function dxfRender(P){if(!P||!P.dS)return;const on=dxvOn(),c=P.img,g=c.getContext("2d");g.setTransform(1,0,0,1,0,0);g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.lineWidth=1;g.lineCap="round";
 const disp=col=>{const r=parseInt(col.slice(1,3),16),gg=parseInt(col.slice(3,5),16),b=parseInt(col.slice(5,7),16);return r>230&&gg>230&&b>230?"#000000":r>200&&gg>200&&b<80?"#b8a000":col};
 /* 出している種類が少ない時は、建築を薄く（主役の線が見やすいように） */
 const hid=dxHid(),by={};P.dS.forEach(s=>{if(!on(s[5])||hid.has(s[6]))return;const k=s[4]+"|"+(s[5]==="arch"&&(on("duct")||on("eisei")||on("ac"))?1:0);(by[k]=by[k]||[]).push(s)});
 Object.keys(by).forEach(k=>{const[col,fade]=k.split("|");g.globalAlpha=fade==="1"?0.45:1;g.strokeStyle=disp(col);g.beginPath();by[k].forEach(s=>{g.moveTo(s[0],s[1]);g.lineTo(s[2],s[3])});g.stroke()});g.globalAlpha=1;
 (P.textsAll||[]).forEach(t=>{const gr=dxfGrp(t.lay);if(!on(gr==="arch"?"anno":gr)||hid.has(t.lay))return;if(t.h<2)return;g.save();g.translate(t.x,t.y);g.rotate(-(t.r||0)*Math.PI/180);g.fillStyle=disp(t.col||"#000000");g.font=Math.round(t.h)+"px sans-serif";g.fillText(t.s,0,0);g.restore()});
 P._tex=(P._tex||0)+1}
window.dxfRender=dxfRender;window.dxfGrp=dxfGrp;
/* タップした所にいちばん近い線の画層を隠す（網目・ハッチなど） */
window.dxfPickHide=function(p,tolPx){const P=PLAN;if(!P||!P.dS)return false;const on=dxvOn(),hid=dxHid();let best=null,bd=tolPx;
 P.dS.forEach(s=>{if(!on(s[5])||hid.has(s[6]))return;const dx=s[2]-s[0],dy=s[3]-s[1],l2=dx*dx+dy*dy;let t=l2?((p[0]-s[0])*dx+(p[1]-s[1])*dy)/l2:0;t=Math.max(0,Math.min(1,t));const d=Math.hypot(s[0]+t*dx-p[0],s[1]+t*dy-p[1]);if(d<bd){bd=d;best=s}});
 window.DXF_PICK=false;if(!best){if(window.toast)toast("近くに線がありませんでした。線の上をタップしてください");dxfChips();return true}
 hid.add(best[6]);try{localStorage.setItem("pbm_dxfhide",JSON.stringify([...hid]))}catch(e){}const n=P.dS.filter(s=>s[6]===best[6]).length;
 dxfRender(P);if(P.tex)P.tex.needsUpdate=true;dxfChips();try{planDraw()}catch(e){}if(window.toast)toast("同じ種類の線（"+n+"本）を消しました。自動で読む時も使いません");return true};
/* 表示している線だけで自動読み込み：見えていない種類・消した線を、一時的に読み込みの材料から外す */
window.dxfVisible=function(P){const on=dxvOn(),hid=dxHid();return lay=>{if(hid.has(lay))return false;return on(dxfGrp(lay))}};
window.dxfFilterRun=function(fn){const P=PLAN;const vis=dxfVisible(P),bk={segs:P.segs,texts:P.texts,arcs:P.arcs,rects:P.rects};
 P.segs=P.segs.filter(s=>vis(s[5]));   // 文字（品番・高さ）は隠していても使う
 P.arcs=(P.arcs||[]).filter(o=>vis(o.lay));P.rects=null;P._ca=null;P._flt=1;
 try{try{planAnalyze()}catch(e){}return fn()}finally{P.segs=bk.segs;P.texts=bk.texts;P.arcs=bk.arcs;P.rects=null;P._ca=null;P._flt=0;try{planAnalyze()}catch(e){}}};
/* 図面画面の下の切りかえボタン（DXFの時だけ） */
window.dxfChips=function(){const wr=document.getElementById("plWrap");let el=document.getElementById("dxfChips");const P=typeof PLAN!=="undefined"?PLAN:null;
 if(!wr||!P||!P.dxf){if(el)el.remove();return}
 if(!el){el=document.createElement("div");el.id="dxfChips";el.style.cssText="position:absolute;left:8px;right:8px;bottom:8px;z-index:5;display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none";wr.appendChild(el)}
 const kk=P.fkey+"|"+(P._tex||0)+"|"+(window.DXF_PICK?1:0);if(el.dataset.k===kk)return;el.dataset.k=kk;
 const on=dxvOn(),has=new Set(P.dS.map(s=>s[5]));
 const nh=dxHid().size,pk=!!window.DXF_PICK,cs="flex:none;height:34px;padding:0 10px;border-radius:17px;font-weight:800;font-size:13px;";
 el.innerHTML=DXV.filter(([k])=>has.has(k)).map(([k,n,col])=>{const o=on(k);return `<button data-dv="${k}" style="${cs}border:2px solid ${col};background:${o?col:"#ffffffee"};color:${o?"#fff":col}">${o?"✓":"－"}${n}</button>`}).join("")+
  `<button data-dl2="1" style="${cs}border:2px solid #0f172a;background:#ffffffee;color:#0f172a">📋 名前ごと</button>`+`<button data-dp="1" style="${cs}border:2px solid #dc2626;background:${pk?"#dc2626":"#ffffffee"};color:${pk?"#fff":"#dc2626"}">✋ ${pk?"消したい線をタップ":"線をタップで消す"}</button>`+(nh?`<button data-dr="1" style="${cs}border:2px solid #475569;background:#ffffffee;color:#475569">↩ 消した線を戻す（${nh}）</button>`:"");
 el.querySelector("[data-dl2]").onclick=e=>{e.stopPropagation();dxfLayerSheet()};
 el.querySelector("[data-dp]").onclick=e=>{e.stopPropagation();window.DXF_PICK=!window.DXF_PICK;if(window.DXF_PICK&&window.toast)toast("消したい線（網目など）を1本タップしてください。同じ種類の線をまとめて消します");dxfChips()};
 {const r=el.querySelector("[data-dr]");if(r)r.onclick=e=>{e.stopPropagation();try{localStorage.removeItem("pbm_dxfhide")}catch(err){}dxfRender(P);if(P.tex)P.tex.needsUpdate=true;dxfChips();try{planDraw()}catch(err){}if(window.toast)toast("消した線を全部戻しました")}}
 el.querySelectorAll("[data-dv]").forEach(b=>b.onclick=e=>{e.stopPropagation();const k=b.dataset.dv;let o={};try{o=JSON.parse(localStorage.getItem("pbm_dxfv")||"{}")||{}}catch(err){}o[k]=!dvOn(k);try{localStorage.setItem("pbm_dxfv",JSON.stringify(o))}catch(err){}
  dxfRender(P);if(P.tex)P.tex.needsUpdate=true;dxfChips();try{planDraw()}catch(err){}try{if(typeof T!=="undefined"&&T)T.dirty=true}catch(err){}});
 function dvOn(k){return dxvOn()(k)}};

/* ===== 図面の配管・ダクトを3D用に取り出す（冷媒・ドレン・ダクト・衛生）=====
   ・図面に「平面図」「天井伏図」など何枚も描いてある時は、通り芯の記号（X1・Y2…）で図をわけ、原点のある図に合わせる
   ・原点のある図に無い種類（例：衛生配管は平面図だけ）は、ほかの図から通り芯でずらして持ってくる
   ・高さ：同じ種類の近くの「FL+3200」などの文字。無ければ天井の少し下（ダクトは天井の上） */
const DL_KINDS=[["duct","ダクト"],["eisei","衛生"]];
window.DL_KINDS=DL_KINDS;
function segCat(s){if(s[5]!==undefined)return dxfCat(s[5]);const c=s[4]||"";if(c.length<7)return"";const r=parseInt(c.slice(1,3),16),g=parseInt(c.slice(3,5),16),b=parseInt(c.slice(5,7),16);
 return r>200&&g<80&&b>200?"ref":r>200&&g>90&&g<170&&b<60?"drain":""}   // PDF：赤紫＝冷媒、オレンジ＝ドレン（#ff7f00・#ff7e00 など少し違っても）
function txtCat(t){return t.lay!==undefined?dxfCat(t.lay):""}
window.planViews=planViews;function planViews(P){const lab=(P.textsAll||P.texts||[]).map(t=>{const m=String(t.s).trim().replace(/[ＸＹ０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)).match(/^([XY])\s*(\d{1,2})$/);return m?{n:m[1]+m[2],ax:m[1],x:t.x,y:t.y}:null}).filter(Boolean);
 /* X の記号は同じ高さに横並び、Y の記号は同じ位置に縦並び。並びの中で同じ名前が出たら別の図 */
 const mm=P.mmpp,tol=400/mm,grp=(A,ax)=>{const rows=[];A.forEach(l=>{const k=ax==="X"?l.y:l.x;let r=rows.find(r=>Math.abs(r.k-k)<tol);if(!r){r={k,L:[]};rows.push(r)}r.L.push(l)});
   const G=[];rows.forEach(r=>{let g=null;r.L.sort((p,q)=>ax==="X"?p.x-q.x:p.y-q.y).forEach(l=>{const o=ax==="X"?l.x:l.y,last=g&&g.L[g.L.length-1];
    if(!g||g.L.some(q=>q.n===l.n)||Math.abs((ax==="X"?last.x:last.y)-o)>15000/mm){g={k:r.k,L:[]};G.push(g)}g.L.push(l)})});return G};
 const GX=grp(lab.filter(l=>l.ax==="X"),"X"),GY=grp(lab.filter(l=>l.ax==="Y"),"Y"),V=[],pad=1800/mm;
 GX.forEach(gx=>{const x0=Math.min(...gx.L.map(l=>l.x)),x1=Math.max(...gx.L.map(l=>l.x));let best=null,bd=1e18;
  GY.forEach(gy=>{if(gy.used)return;const y0=Math.min(...gy.L.map(l=>l.y)),y1=Math.max(...gy.L.map(l=>l.y)),dx=Math.abs(gy.k-x0),okx=gy.k>x0-6000/mm&&gy.k<x1+6000/mm,oky=Math.min(Math.abs(y0-gx.k),Math.abs(y1-gx.k))<6000/mm;
   if(!okx||!oky)return;const d=dx+Math.min(Math.abs(y0-gx.k),Math.abs(y1-gx.k));if(d<bd){bd=d;best=gy}});
  if(!best)return;best.used=1;const L=gx.L.concat(best.L),xs=L.map(q=>q.x),ys=L.map(q=>q.y);V.push({L,b:[Math.min(...xs)-pad,Math.min(...ys)-pad,Math.max(...xs)+pad,Math.max(...ys)+pad]})});
 return V}
window.planDrawLines=function(){const P=PLAN;if(!P||!P.org||!P.mmpp||!P.segs)return null;
 const V=planViews(P),inB=(b,x,y)=>x>=b[0]&&x<=b[2]&&y>=b[1]&&y<=b[3],o=P.org;
 let main=V.find(v=>inB(v.b,o[0],o[1]));
 const own=(x,y)=>{let best=null,bd=1e18;V.forEach(v=>{if(!inB(v.b,x,y))return;const cx=(v.b[0]+v.b[2])/2,cy=(v.b[1]+v.b[3])/2,d=Math.hypot(x-cx,y-cy);if(d<bd){bd=d;best=v}});return best};
 /* ほかの図 → 原点の図へのずれ（同じ名前の通り芯で） */
 const off=v=>{if(!main||v===main)return[0,0];const dx=[],dy=[];v.L.forEach(l=>{const m=main.L.find(q=>q.n===l.n);if(!m)return;if(l.ax==="X")dx.push(m.x-l.x);else dy.push(m.y-l.y)});
  if(!dx.length||!dy.length)return null;const md=a=>a.sort((p,q)=>p-q)[a.length>>1];return[md(dx),md(dy)]};
 /* 冷媒・ドレンはアプリで作るので、図面の線は出さない */
 const by={duct:[],eisei:[]};(P.segAll||P.segs).forEach(s=>{const k=segCat(s);if(!k)return;if(s[5]===undefined&&Math.hypot(s[2]-s[0],s[3]-s[1])*P.mmpp>4500)return;   // PDF：とても長い色の線（延焼ラインなど）は配管ではない
if(!by[k])return;if(P.dxf&&!dxfVisible(P)(s[5]))return;const v=main?own((s[0]+s[2])/2,(s[1]+s[3])/2):null;if(main&&!v)return;by[k].push({s,v,lay:s[5]})});
 const CH=(st.gnd&&st.gnd.ch)||P.CH||2700,defH={ref:CH-150,drain:CH-250,duct:CH+300,eisei:CH-300};
 const FLt=(P.textsAll||P.texts||[]).map(t=>{const z=String(t.s).replace(/[＋]/g,"+").replace(/[－−ー]/g,"-").replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248));if(/下端|上端|梁|H-\d|C-\d/.test(z))return null;const m=z.match(/FL\s*([+\-])\s*(\d{2,4})/);return m?{x:t.x,y:t.y,h:(m[1]==="-"?-1:1)*+m[2],k:txtCat(t)}:null}).filter(Boolean);
 const out={};
 Object.keys(by).forEach(k=>{let L0=by[k];if(!L0.length)return;
  /* 画層ごとに：原点の図にあればそれ、無ければほかの図から通り芯でずらして持ってくる（同じ物を2回出さない） */
  const gs={};L0.forEach(q=>{const g=q.s[5]!==undefined?q.s[5]:k;(gs[g]=gs[g]||[]).push(q)});let L=[];
  Object.values(gs).forEach(G=>{if(!main){L=L.concat(G);return}const inMain=G.filter(q=>q.v===main);
   /* 原点の図に少しだけある（縦管の記号など）時は、たくさん描いてある図の方を使う */
   const cnt={};G.forEach(q=>{if(q.v!==main&&off(q.v))cnt[V.indexOf(q.v)]=(cnt[V.indexOf(q.v)]||0)+1});const mx=Math.max(0,...Object.values(cnt));
   if(inMain.length&&inMain.length>=mx*0.8){L=L.concat(inMain);return}
   const vs=[...new Set(G.map(q=>q.v))];let bestV=null,bn=0;vs.forEach(v=>{const n=G.filter(q=>q.v===v).length;if(n>bn&&off(v)){bn=n;bestV=v}});if(!bestV)return;const d=off(bestV);
   L=L.concat(G.filter(q=>q.v===bestV).map(q=>({s:[q.s[0]+d[0],q.s[1]+d[1],q.s[2]+d[0],q.s[3]+d[1]],v:main,moved:1,o:q.s,lay:q.lay})))});
  const near=(x,y,src)=>{let b=null,bd=2500/P.mmpp;FLt.forEach(t=>{if(t.k&&t.k!==k)return;if(!t.k&&P.dxf)return;const d=Math.hypot(t.x-x,t.y-y);if(d<bd){bd=d;b=t}});return b};
  /* 大きさの文字：「200φ」＝丸、「300×150」＝角（幅×高さ）。近く（1.5m）の同じ種類の文字 */
  const SZ=(P.textsAll||P.texts||[]).map(t=>{const z=String(t.s).replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)).replace(/[Φø]/g,"φ");let m=z.match(/(\d{2,4})\s*[×xX*＊]\s*(\d{2,4})/);if(m&&!/H-|C-|下端/.test(z))return{x:t.x,y:t.y,r:0,a:+m[1],b:+m[2],k:txtCat(t)};m=z.match(/(\d{2,4})\s*φ/);return m?{x:t.x,y:t.y,r:1,a:+m[1],k:txtCat(t)}:null}).filter(Boolean);
  const nearSz=(x,y)=>{let b=null,bd=1500/P.mmpp;SZ.forEach(t=>{if(P.dxf&&t.k&&t.k!==k)return;const d=Math.hypot(t.x-x,t.y-y);if(d<bd){bd=d;b=t}});return b};
  const sub=lay=>/給水|給湯|上水|中水/.test(lay||"")?0:/汚水|排水|雑排|雨水/.test(lay||"")?1:/通気/.test(lay||"")?2:3;
  /* 平行な線から太さを出す（区間ごとに組を作る）：
     ・線の向き・画層ごとに、線の端の位置で区間に切り、その区間にある線を横に並べて、左右の外形線を組にする
     ・近くに「200φ」「300×150」などがあれば、その太さに合う組を選ぶ。無ければ、間の線が真ん中（中心線）だけの、いちばん外側の組
     ・同じ太さの区間はつなげる（継ぎ目・フランジで線が切れていても1本に） */
  const mm=P.mmpp,wMax=(k==="duct"?1300:260)/mm,wFree=(k==="duct"?700:200)/mm,wMin=(k==="duct"?70:12)/mm;   // wFree：大きさの文字が無い時の最大の太さ
  const items=L.slice(0,9000).map(q=>{const s=q.s,dx=s[2]-s[0],dy=s[3]-s[1],l=Math.hypot(dx,dy);if(l*mm<8)return null;let deg=Math.round(Math.atan2(dy,dx)*180/Math.PI);deg=((deg%180)+180)%180;const th=deg*Math.PI/180;
   const ux=Math.cos(th),uy=Math.sin(th),t0=s[0]*ux+s[1]*uy,t1=s[2]*ux+s[3]*uy;return{q,deg,ux,uy,d:-s[0]*uy+s[1]*ux,lo:Math.min(t0,t1),hi:Math.max(t0,t1),l,used:0}}).filter(Boolean);
  const grp={};items.forEach(it=>{const key=(it.q.lay||"")+"|"+it.deg;(grp[key]=grp[key]||[]).push(it)});
  const solids=[],lines=[],hAt=(x,y)=>{const t=near(x,y);return t?t.h:defH[k]},W=(x,y)=>btWx([x,y]);
  const wTxt=(x,y)=>{const t=nearSz(x,y);if(!t)return null;return t.r?{r:1,w:[t.a],t}:{r:0,w:[t.a,t.b],t}};
  Object.values(grp).forEach(G=>{if(G.length<2)return;const ux=G[0].ux,uy=G[0].uy,xy=(t,d)=>[t*ux-d*uy,t*uy+d*ux];
   const bp=[...new Set(G.flatMap(it=>[it.lo,it.hi]).map(v=>Math.round(v*4)/4))].sort((a,b)=>a-b),pcs=[];
   for(let n=0;n+1<bp.length;n++){const ta=bp[n],tb=bp[n+1];if((tb-ta)*mm<10)continue;
    const act=G.filter(it=>it.lo<=ta+0.3&&it.hi>=tb-0.3).sort((a,b)=>a.d-b.d);if(act.length<2)continue;
    const A2=[];act.forEach(it=>{if(!A2.length||it.d-A2[A2.length-1].d>0.4)A2.push(it)});
    let i=0;while(i<A2.length-1){const di=A2[i].d;let pick=-1;
     const c=xy((ta+tb)/2,di),tw=wTxt(c[0],c[1]);
     if(tw){let be=1e9;for(let j=i+1;j<A2.length;j++){const g=(A2[j].d-di)*mm;if(g>wMax*mm)break;tw.w.forEach(w=>{const e=Math.abs(g-w)/w;if(e<0.25&&e<be){be=e;pick=j}})}}
     if(pick<0)for(let j=A2.length-1;j>i;j--){const g=A2[j].d-di;if(g>wFree||g<wMin)continue;const mid=(A2[j].d+di)/2;let ok=true;for(let m=i+1;m<j;m++)if(Math.abs(A2[m].d-mid)>g*0.08){ok=false;break}if(ok){pick=j;break}}
     if(pick<0){i++;continue}
     pcs.push({dl:di,dr:A2[pick].d,ta,tb,tw});for(let m=i;m<=pick;m++)A2[m].used=1;i=pick+1}}
   /* となりの区間で同じ太さならつなげる */
   pcs.sort((a,b)=>a.dl-b.dl||a.dr-b.dr||a.ta-b.ta);const M=[];
   pcs.forEach(p=>{const l=M[M.length-1];if(l&&Math.abs(l.dl-p.dl)<1&&Math.abs(l.dr-p.dr)<1&&p.ta-l.tb<=150/mm){l.tb=Math.max(l.tb,p.tb);l.tw=l.tw||p.tw}else M.push({...p})});
   /* 短すぎる物（器具・掃除口などの記号の線）は捨てる：長さが太さの（ダクト0.8倍・配管2倍）未満、または10cm未満 */
   M.forEach(p=>{const lm=(p.tb-p.ta)*mm,wm0=(p.dr-p.dl)*mm;if(lm<100||lm<wm0*(k==="duct"?0.8:2))return;const dc=(p.dl+p.dr)/2,p1=xy(p.ta,dc),p2=xy(p.tb,dc),wm=(p.dr-p.dl)*mm,cm=xy((p.ta+p.tb)/2,dc);
    const src=G[0].q.o?null:cm;   // ほかの図から持ってきた物は、高さの文字を元の図で探す
    const so=G[0].q.o?[cm[0]+(G[0].q.o[0]-G[0].q.s[0]),cm[1]+(G[0].q.o[1]-G[0].q.s[1])]:cm;
    const tz=p.tw&&p.tw.t;let sh=k==="duct"?(wm<=330?0:1):0,hh=wm;
    if(k==="duct"&&tz){if(tz.r)sh=Math.abs(wm-tz.a)>tz.a*0.35&&wm>330?1:0;else{sh=1;hh=Math.abs(tz.b-wm)<Math.abs(tz.a-wm)?tz.a:tz.b}}
    if(k==="duct"&&sh===1&&(!tz||tz.r))hh=Math.min(wm,tz&&tz.r?tz.a+100:300);
    const a=W(p1[0],p1[1]),b=W(p2[0],p2[1]);solids.push([Math.round(a[0]),Math.round(a[1]),Math.round(b[0]),Math.round(b[1]),Math.round(hAt(so[0],so[1])),sh,Math.round(wm),Math.round(hh),sub(G[0].q.lay)])})});
  /* 組にならなかった線（曲がり・継手・記号など）は細い線で */
  items.forEach(m=>{if(m.used||m.l*mm<40)return;const s=m.q.s,src=m.q.o||s,a=W(s[0],s[1]),b=W(s[2],s[3]);lines.push([Math.round(a[0]),Math.round(a[1]),Math.round(b[0]),Math.round(b[1]),Math.round(hAt((src[0]+src[2])/2,(src[1]+src[3])/2))])});
  out[k]=lines;out[k+"S"]=solids});
 return out};
})();
