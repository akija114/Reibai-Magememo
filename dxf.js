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
  if(cur.t==="LAYER"){if(c===2)cur.g.n=v;if(c===62)cur.g.c=+v;if(c===420)cur.g.tc=+v;if(c===6)cur.g.lt=v;if(cur.g.n!==undefined&&(c===62||c===420||c===2))layers[cur.g.n]=layers[cur.g.n]||{};if(cur.g.n!==undefined)layers[cur.g.n]={c:cur.g.c,tc:cur.g.tc,lt:cur.g.lt};continue}
  if(cur.t==="BLOCK"){if(c===2&&!cur.blk.name)cur.blk.name=v;if(c===10)cur.blk.bx=+v;if(c===20)cur.blk.by=+v;continue}
  const g=cur.g;(g[c]=g[c]||[]).push(c===1||c===3||c===2||c===8?v0.replace(/\s+$/,""):v)}
 return{layers,blocks,ents}}
function layCol(lay,layers,e){const tc=e.g[420]?+e.g[420][0]:null;if(tc!=null)return"#"+("00000"+tc.toString(16)).slice(-6);
 const ci=e.g[62]?+e.g[62][0]:256;if(ci>0&&ci<256)return ACI[ci]||"#000000";const l=layers[lay]||{};if(l.tc!=null)return"#"+("00000"+l.tc.toString(16)).slice(-6);return ACI[Math.abs(l.c||7)]||"#000000"}
function dxfGeo(D){const segs=[],arcs=[],texts=[],MAX=400000;
 const f=(e,c,d)=>e.g[c]?+e.g[c][0]:(d||0);
 function walk(list,M,pl,depth,plt){const[a,b,c,d,tx,ty]=M,P=(x,y)=>[a*x+c*y+tx,b*x+d*y+ty];
  for(const e of list){if(segs.length>MAX)return;if(e.g[67]&&e.g[67][0]==="1")continue;
   let lay=e.g[8]?e.g[8][0]:"0";if(lay==="0"&&pl)lay=pl;const col=layCol(lay,D.layers,e),t=e.t;
   /* 線の種類：一点鎖線（CENTER など）＝ダクト・配管の中心線。外形の線と組にしない */
   let lt=e.g[6]?e.g[6][0]:"BYLAYER";if(/^BYBLOCK$/i.test(lt))lt=plt||"BYLAYER";if(/^BYLAYER$/i.test(lt))lt=(D.layers[lay]||{}).lt||"";const cen=/CENTER|DASHDOT|CHAIN|一点|中心/i.test(lt)?1:0;
   const S=(p,q,cv)=>segs.push([p[0],p[1],q[0],q[1],lay,col,cv?1:0,cen]);   // cv：円弧・円から作った線（PDFと同じく、自動読み込みの線には入れない）
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
     walk(B.e,[a*m[0]+c*m[1],b*m[0]+d*m[1],a*m[2]+c*m[3],b*m[2]+d*m[3],a*m[4]+c*m[5]+tx,b*m[4]+d*m[5]+ty],lay==="0"&&pl?pl:lay,depth+1,e.g[6]?e.g[6][0]:plt)}}}}
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
 const segAll=S.map(s=>{const a=px(s[0],s[1]),b=px(s[2],s[3]);return[a[0],a[1],b[0],b[1],"",s[4],s[7]?1:0]}).filter(s=>dxfCat(s[5]));
 /* はじめて使う時だけ：ダクト・衛生・電気の線は隠しておく（空調の図として見やすく） */
 try{if(localStorage.getItem("pbm_dxfhide")===null){const H=[...new Set(S.map(s=>s[4]).filter(l=>["duct","eisei","elec"].includes(dxfGrp(l))))];localStorage.setItem("pbm_dxfhide",JSON.stringify(H))}}catch(e){}
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
  let lg="";L.forEach(o=>{if(o.g!==lg){lg=o.g;const D=DXV.find(x=>x[0]===o.g)||["","その他","#475569"];const allOn=L.filter(q=>q.g===o.g).every(q=>!hid.has(q.n));h+=`<div style="display:flex;align-items:center;gap:8px;margin:12px 4px 4px"><b style="flex:1;color:${D[2]}">${D[1]}</b><button data-lgall="${o.g}" style="height:30px;padding:0 10px;border-radius:9px;font-weight:800;font-size:12.5px;border:1.5px solid ${D[2]};background:#fff;color:${D[2]}">${allOn?"まとめて消す":"まとめて表示"}</button></div>`}
   const vis=!hid.has(o.n);h+=`<div style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid #e2e8f0">
    <button data-lv="${esc(o.n)}" style="flex:none;width:40px;height:34px;border-radius:9px;font-weight:800;border:2px solid #475569;background:${vis?"#475569":"#fff"};color:${vis?"#fff":"#475569"}">${vis?"✓":"－"}</button>
    <div style="flex:1;min-width:0;font-size:13.5px;word-break:break-all">${esc(o.n)}<span style="color:#94a3b8;font-size:12px">（${o.c}本）</span></div>
    <select data-lg="${esc(o.n)}" style="flex:none;height:34px;border-radius:9px;font-size:13px;font-weight:700;max-width:110px">${DXOPT.map(([k,t])=>`<option value="${k}"${k===o.v?" selected":""}>${t}</option>`).join("")}</select></div>`});
  h+=`</div></div>`;ov.innerHTML=h;
  ov.querySelector("#dxlClose").onclick=()=>ov.remove();
  ov.querySelectorAll("[data-lgall]").forEach(b=>b.onclick=()=>{const g=b.dataset.lgall,H=dxHid(),ns=L.filter(q=>q.g===g).map(q=>q.n),allOn=ns.every(n=>!H.has(n));ns.forEach(n=>{if(allOn)H.add(n);else H.delete(n)});try{localStorage.setItem("pbm_dxfhide",JSON.stringify([...H]))}catch(e){}apply();draw()});
  ov.querySelectorAll("[data-lv]").forEach(b=>b.onclick=()=>{const n=b.dataset.lv,H=dxHid();if(H.has(n))H.delete(n);else H.add(n);try{localStorage.setItem("pbm_dxfhide",JSON.stringify([...H]))}catch(e){}apply();draw()});
  ov.querySelectorAll("[data-lg]").forEach(sl=>sl.onchange=()=>{const n=sl.dataset.lg,M=dxMap();M[n]=sl.value;try{localStorage.setItem("pbm_dxfmap",JSON.stringify(M))}catch(e){}dxfRegroup(P);apply();draw()})};
 const apply=()=>{dxfRender(P);if(P.tex)P.tex.needsUpdate=true;const el=document.getElementById("dxfChips");if(el)el.dataset.k="";dxfChips();try{planDraw()}catch(e){}};
 ov.addEventListener("click",e=>{if(e.target===ov)ov.remove()});document.body.appendChild(ov);draw()};
const dxHid=()=>{let a=[];try{a=JSON.parse(localStorage.getItem("pbm_dxfhide")||"[]")||[]}catch(e){}return new Set(a)};
window.dxHid=dxHid;
/* 表示・非表示は線の名前（画層）ごとだけで決める（種類でまとめて隠すのは一覧の「まとめて」ボタンで） */
const dxvOn=()=>()=>true;
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
 const hid=dxHid(),nh=hid.size,pk=!!window.DXF_PICK,cs="flex:none;height:34px;padding:0 10px;border-radius:17px;font-weight:800;font-size:13px;";
 /* CADの線の名前をそのまま：種類の順（空調→ダクト→衛生→電気→建築→寸法・文字）、同じ種類は線の多い順 */
 const cnt={};P.dS.forEach(s=>{cnt[s[6]]=(cnt[s[6]]||0)+1});const gOrd=DXV.map(x=>x[0]);
 const LN=Object.keys(cnt).sort((a,b)=>gOrd.indexOf(dxfGrp(a))-gOrd.indexOf(dxfGrp(b))||cnt[b]-cnt[a]);
 const esc=t=>String(t).replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
 el.innerHTML=`<button data-dl2="1" style="${cs}border:2px solid #0f172a;background:#0f172a;color:#fff">📋 一覧</button>`+`<button data-dp="1" style="${cs}border:2px solid #dc2626;background:${pk?"#dc2626":"#ffffffee"};color:${pk?"#fff":"#dc2626"}">✋ ${pk?"消したい線をタップ":"タップで消す"}</button>`+(nh?`<button data-dr="1" style="${cs}border:2px solid #475569;background:#ffffffee;color:#475569">↩ 全部表示（${nh}）</button>`:"")+
  LN.map(n=>{const col=(DXV.find(x=>x[0]===dxfGrp(n))||["","","#475569"])[2],o=!hid.has(n);return `<button data-ln="${esc(n)}" style="${cs}max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:2px solid ${col};background:${o?col:"#ffffffee"};color:${o?"#fff":col}">${o?"✓":"－"}${esc(n)}</button>`}).join("");
 el.querySelectorAll("[data-ln]").forEach(b=>b.onclick=e=>{e.stopPropagation();const n=b.dataset.ln,H=dxHid();if(H.has(n))H.delete(n);else H.add(n);try{localStorage.setItem("pbm_dxfhide",JSON.stringify([...H]))}catch(err){}
  const sl=el.scrollLeft;dxfRender(P);if(P.tex)P.tex.needsUpdate=true;dxfChips();el.scrollLeft=sl;try{planDraw()}catch(err){}try{if(typeof T!=="undefined"&&T)T.dirty=true}catch(err){}});
 el.querySelector("[data-dl2]").onclick=e=>{e.stopPropagation();dxfLayerSheet()};
 el.querySelector("[data-dp]").onclick=e=>{e.stopPropagation();window.DXF_PICK=!window.DXF_PICK;if(window.DXF_PICK&&window.toast)toast("消したい線（網目など）を1本タップしてください。同じ種類の線をまとめて消します");dxfChips()};
 {const r=el.querySelector("[data-dr]");if(r)r.onclick=e=>{e.stopPropagation();try{localStorage.setItem("pbm_dxfhide","[]")}catch(err){}dxfRender(P);if(P.tex)P.tex.needsUpdate=true;dxfChips();try{planDraw()}catch(err){}if(window.toast)toast("全部の線を表示しました")}}
 function dvOn(k){return dxvOn()(k)}};

/* ===== 立体のダクト・配管をつなげて整える =====
   ① 同じ向き・同じ太さで一直線に並ぶ物は1本につなぐ（フランジ・ダンパー・文字などで線が切れていても）
   ② 向きの違う物の端どうしが近ければ、芯の交わる所までのばして曲がり（エルボ）を付ける。途中にぶつかる時は分岐（チーズ）
   ③ つながった物は同じ高さにそろえる（近くの「FL+3700」などの多い方）
   ④ どこにもつながらない短い物（記号のかけら）は捨てる */
function dlTidy(S0,k,EQ,LB){let S=S0.map(s=>{const[x1,z1,x2,z2,h,sh,w,hh,sub,lay]=s,L=Math.hypot(x2-x1,z2-z1);return{a:[x1,z1],b:[x2,z2],h,sh,w,hh,sub,lay:lay||"",L,u:[(x2-x1)/L,(z2-z1)/L],id:0,cn:0}}).filter(o=>o.L>1);
 const par=S.map((_,i)=>i),fd=i=>par[i]===i?i:(par[i]=fd(par[i])),un=(i,j)=>{par[fd(i)]=fd(j)};
 const cr=(u,v)=>u[0]*v[1]-u[1]*v[0],dt=(u,v)=>u[0]*v[0]+u[1]*v[1],sub=(p,q)=>[p[0]-q[0],p[1]-q[1]];
 /* 0) ほかのダクトの中にすっぽり入る物は捨てる：フランジ・ダンパーの線（ダクトを横切る短い線の組）や、太いダクトの中の細い線の組。
    色（線の名前＝画層）がちがうダクトどうしは別物なので、同じ画層の中だけで見る */
 const inside=(A,B,ex)=>{const tol=Math.max(20,B.w*0.12),n=[-A.u[1],A.u[0]],hw=A.w/2,e=ex||0;
  return [[A.a,1],[A.a,-1],[A.b,1],[A.b,-1]].every(([p,sg])=>{const q=[p[0]+n[0]*hw*sg,p[1]+n[1]*hw*sg],d=sub(q,B.a),t=dt(d,B.u),l=Math.abs(cr(B.u,d));return t>-tol-e&&t<B.L+tol+e&&l<=B.w/2+tol})};
 /* 曲がりの角の四角（中心線と外形の線が組になった、太さと同じくらいの短い物）：直角のダクトの先にくっついている物も捨てる */
 const corner=(A,B)=>A.L<=1.3*A.w&&Math.abs(cr(A.u,B.u))>0.9&&Math.abs(A.w-B.w)<=0.25*B.w&&inside(A,B,B.w*1.1);
 const dropIn=()=>{S=S.filter((A,i)=>!S.some((B,j)=>j!==i&&B.lay===A.lay&&B.sh===A.sh&&B.sub===A.sub&&(A.L*A.w<B.L*B.w||(A.L*A.w===B.L*B.w&&j<i))&&(inside(A,B)||corner(A,B))))};
 const DU=k==="duct";EQ=DU&&Array.isArray(EQ)?EQ:[];
 /* 機器（ロスナイなど）の箱の中にほとんど入っている物は、機器の中の線なので捨てる（上を横切る長いダクトは残す） */
 if(EQ.length)S=S.filter(o=>{let ins=0;const n=20;for(let q=0;q<=n;q++){const x=o.a[0]+(o.b[0]-o.a[0])*q/n,z=o.a[1]+(o.b[1]-o.a[1])*q/n;if(EQ.some(e=>{if(!(e.P&&e.P.length))return false;const dx=x-e.x,dz=z-e.z,lx=dx*e.c-dz*e.s,lz=dx*e.s+dz*e.c;return Math.abs(lx)<e.w/2-10&&Math.abs(lz)<e.d/2-10}))ins++}return ins/(n+1)<0.7});   // 衛生配管は今まで通り（ダクトだけ、中に入る物・角の四角を捨てる／端は1回だけつなぐ）
 if(DU)dropIn();
 /* ① 一直線につなぐ */
 let ch=true,guard=0;while(ch&&guard++<20){ch=false;
  for(let i=0;i<S.length;i++)for(let j=i+1;j<S.length;j++){const A=S[i],B=S[j];if(!A||!B||A.sh!==B.sh||A.sub!==B.sub||A.lay!==B.lay)continue;if(Math.abs(cr(A.u,B.u))>0.035)continue;
   const W=Math.max(A.w,B.w);if(Math.abs(A.w-B.w)>0.2*W)continue;const lat=Math.abs(cr(A.u,sub(B.a,A.a))),lat2=Math.abs(cr(A.u,sub(B.b,A.a)));if(Math.max(lat,lat2)>0.35*W+10)continue;
   const t1=dt(sub(B.a,A.a),A.u),t2=dt(sub(B.b,A.a),A.u),lo=Math.min(t1,t2),hi=Math.max(t1,t2),gap=Math.max(lo-A.L,0-hi,0);if(gap>Math.max(800,4*W))continue;
   const n0=Math.min(0,lo),n1=Math.max(A.L,hi),off=(lat+lat2)/4*Math.sign(cr(A.u,sub(B.a,A.a))||1);
   const ox=-A.u[1]*off,oz=A.u[0]*off;A.a=[A.a[0]+A.u[0]*n0+ox,A.a[1]+A.u[1]*n0+oz];A.b=[A.a[0]+A.u[0]*(n1-n0),A.a[1]+A.u[1]*(n1-n0)];
   A.h=A.L>=B.L?A.h:B.h;A.L=n1-n0;A.w=Math.max(A.w,B.w);A.hh=Math.max(A.hh,B.hh);S[j]=null;ch=true}
  S=S.filter(Boolean)}
 if(DU)dropIn();
 const P=S.map((_,i)=>i);P.forEach(i=>par[i]=i);
 /* ② 曲がり・分岐（同じ画層＝同じ色のダクトどうしだけ）
    近い組から順につなぐ。端は1回しか使わない（となりに並ぶ箱・チャンバーの端まで、遠くの物とつないで分岐にしない） */
 const J=[],usedE=new Set(),LKs=[];   // LKs：一直線のつなぎ目（高さがちがう時は、ここで上げ下げする）
 const geo=(A,B)=>{const c=cr(A.u,B.u);if(Math.abs(c)<0.5)return null;   // 30°以上ちがう向き
  const t=cr(sub(B.a,A.a),B.u)/c,X=[A.a[0]+A.u[0]*t,A.a[1]+A.u[1]*t],tb=dt(sub(X,B.a),B.u),R=Math.max(A.w,B.w)*1.5+250;
  const dA=t<0?-t:t>A.L?t-A.L:0,dB=tb<0?-tb:tb>B.L?tb-B.L:0;if(dA>R||dB>R)return null;
  const endA=t<R||A.L-t<R,endB=tb<R||B.L-tb<R;if(!endA&&!endB)return null;   // 交わる所がどちらの端にも近くない＝ただ横切っているだけ
  const gA=endA?Math.min(Math.abs(t),Math.abs(A.L-t)):0,gB=endB?Math.min(Math.abs(tb),Math.abs(B.L-tb)):0;
  return{t,tb,X,endA,endB,g:gA+gB,ka:t<A.L/2?"a":"b",kb:tb<B.L/2?"a":"b"}};
 /* 一直線にすぐ続く物（太さのちがう箱・チャンバー・口の短い管）は、その端どうしをつながっている扱いにする（遠くのダクトと分岐にしない） */
 if(DU)for(let i=0;i<S.length;i++)for(let j=i+1;j<S.length;j++){const A=S[i],B=S[j];if(A.lay!==B.lay||Math.abs(cr(A.u,B.u))>0.05)continue;const W=Math.max(A.w,B.w);if(Math.abs(cr(A.u,sub(B.a,A.a)))>0.35*W+10)continue;
  let bd=1e9,ea=null,eb=null;[["a","a"],["a","b"],["b","a"],["b","b"]].forEach(([p,q])=>{const d=Math.hypot(A[p][0]-B[q][0],A[p][1]-B[q][1]);if(d<bd){bd=d;ea=p;eb=q}});
  if(bd<Math.max(60,0.75*W)){usedE.add(i+ea);usedE.add(j+eb);un(i,j);A.cn++;B.cn++;
   /* すき間は真ん中で突き合わせる（軸の上で） */const m=[(A[ea][0]+B[eb][0])/2,(A[ea][1]+B[eb][1])/2],pj=(o,q)=>{const t=dt(sub(q,o.a),o.u);return[o.a[0]+o.u[0]*t,o.a[1]+o.u[1]*t]};
   const pa=pj(A,m),pb=pj(B,m);A[ea]=pa;B[eb]=pb;[A,B].forEach(o=>{o.L=Math.hypot(o.b[0]-o.a[0],o.b[1]-o.a[1])});LKs.push({i,j,p:m})}}
 /* 図面の文字（「OA 150φ FL+3900」）：同じ画層で、向きが同じで、近く（文字の横 70cm 以内）のダクトに付ける。大きさはその場で直す */
 if(DU&&Array.isArray(LB))LB.forEach(lb=>{let best=null,bd=1e9;S.forEach(o=>{if(o.lay!==lb.lay)return;if(lb.u&&Math.abs(cr(o.u,lb.u))>0.35)return;const v=sub([lb.x,lb.z],o.a),t=dt(v,o.u),l=Math.abs(cr(o.u,v));
   if(t<-800||t>o.L+800||l>Math.max(700,o.w/2+500))return;const d=l+Math.max(0,-t,t-o.L)*1.5+(lb.sz?Math.abs(o.w-lb.sz.a)*2:0)-Math.min(o.L,2000)*0.01;if(d<bd){bd=d;best=o}});   // 太さの合う物・長い物を優先（となりの箱・チャンバーに付けない）
  if(!best)return;if(lb.h)best.lh=lb.h;if(lb.sz){best.lsz=lb.sz;if(lb.sz.r){best.sh=0;best.w=best.hh=lb.sz.a}else{best.sh=1;best.w=lb.sz.a;best.hh=lb.sz.b}};if(lb.h)(best.lbs=best.lbs||[]).push({t:dt(sub([lb.x,lb.z],best.a),best.u),h:lb.h})});
 /* 1本のダクトに高さのちがう文字が2つ以上ある時（ロスナイの上だけ上げる、など）：文字と文字の間で切って、それぞれの高さにする。
    切る所は、間にある段差の記号（ダクトの上の半円の線）。無ければ文字と文字の真ん中 */
 if(DU){const MK=(LB&&LB.mk)||[],n0=S.length;for(let i=0;i<n0;i++){const o=S[i];if(!o.lbs||o.lbs.length<2)continue;const L=o.lbs.sort((p,q)=>p.t-q.t);if(L.every(q=>q.h===L[0].h))continue;
  const cut=[];for(let m=0;m+1<L.length;m++){if(L[m].h===L[m+1].h)continue;const t0=L[m].t,t1=L[m+1].t;
   const ms=MK.filter(k=>k.lay===o.lay).map(k=>({t:dt(sub([k.x,k.z],o.a),o.u),l:Math.abs(cr(o.u,sub([k.x,k.z],o.a)))})).filter(k=>k.l<o.w&&k.t>Math.min(t0,t1)+50&&k.t<Math.max(t0,t1)-50);
   /* 記号は「⌒⌒」の2本で1組：低い方の文字に近い方で切る（上がり始め） */
   /* 斜めの短い線（半円をつくる線）が 3本以上かたまっている所だけ */
   ms.sort((p,q)=>p.t-q.t);const cl=[];ms.forEach(k=>{const c=cl[cl.length-1];if(c&&k.t-c.t1<60){c.t1=k.t;c.n++;c.s+=k.t}else cl.push({t1:k.t,n:1,s:k.t})});ms.length=0;cl.filter(c=>c.n>=3).forEach(c=>ms.push({t:c.s/c.n}));
   let tc=(t0+t1)/2;if(ms.length){const lowFirst=L[m].h<L[m+1].h;ms.sort((p,q)=>p.t-q.t);tc=lowFirst?ms[0].t:ms[ms.length-1].t}
   cut.push({t:Math.max(o.w,Math.min(o.L-o.w,tc)),h0:L[m].h,h1:L[m+1].h})}
  if(!cut.length)continue;const pt=t=>[o.a[0]+o.u[0]*t,o.a[1]+o.u[1]*t],bOld=o.b.slice();let prev=i;
  o.lh=cut[0].h0;o.b=pt(cut[0].t);o.L=cut[0].t;
  cut.forEach((c,m)=>{const t1=m+1<cut.length?cut[m+1].t:null,N=Object.assign({},o,{a:pt(c.t),b:t1!==null?pt(t1):bOld,lh:c.h1,lbs:null,cn:0});N.L=Math.hypot(N.b[0]-N.a[0],N.b[1]-N.a[1]);
   S.push(N);par.push(S.length-1);const n=S.length-1;usedE.add(prev+"b");usedE.add(n+"a");un(prev,n);S[prev].cn++;N.cn++;LKs.push({i:prev,j:n,p:N.a.slice()});
   /* 前の「b」の端につないであった物は、最後の切れはしにつけかえる */
   if(m===cut.length-1&&usedE.has(i+"b#"))usedE.add(n+"b");prev=n});
  LKs.forEach(q=>{if(q.i!==i&&q.j!==i)return;if(Math.hypot(q.p[0]-bOld[0],q.p[1]-bOld[1])<Math.hypot(q.p[0]-o.a[0],q.p[1]-o.a[1])&&Math.hypot(q.p[0]-bOld[0],q.p[1]-bOld[1])<o.w){if(q.i===i)q.i=prev;else q.j=prev;usedE.add(prev+"b")}})}}
 /* 機器のダクト口：
    ・ロスナイ（登録のある機種）：口の近く（30cm）に向かってくるダクトを口の先までのばし、口の所は口の太さ（φ100 など）からダクトの太さへ広げる管にする
    ・登録のない機械（換気扇など）：箱の近く（45cm）で終わるダクトを、箱の面の真ん中の高さの口につなぐ
    ・口の所の管は口の高さ、その先のダクトは図面の高さ。ちがう時は、つなぎ目で上げ下げする */
 const addLink=(i,ea,j,eb,p)=>{usedE.add(i+ea);usedE.add(j+eb);un(i,j);S[i].cn++;S[j].cn++;LKs.push({i,j,p})};
 const reL=o=>{o.L=Math.hypot(o.b[0]-o.a[0],o.b[1]-o.a[1]);if(o.L>0.5)o.u=[(o.b[0]-o.a[0])/o.L,(o.b[1]-o.a[1])/o.L]};
 const mkPort=(i,en,T,dir,y,d)=>{const o=S[i];   // T：口の先、dir：口から外向き、o の端 en を口につなぐ
  const far=en==="a"?o.b:o.a,len=dt(sub(far,T),dir);if(len<20)return;
  if(len<=260){if(en==="a")o.a=T.slice();else o.b=T.slice();reL(o);o.fh=y;o.pd=d;if(d&&Math.abs(d-o.w)>10)o.tp={e:en,w:d};usedE.add(i+en);o.cn++;return}
  const LP=160,X=[T[0]+dir[0]*LP,T[1]+dir[1]*LP],tx=dt(sub(X,o.a),o.u),Xo=[o.a[0]+o.u[0]*tx,o.a[1]+o.u[1]*tx];
  if(en==="a")o.a=Xo;else o.b=Xo;reL(o);
  const N={a:T.slice(),b:Xo.slice(),h:y,sh:o.sh,w:o.w,hh:o.hh,sub:o.sub,lay:o.lay,L:0,u:dir.slice(),id:0,cn:1,fh:y,pd:d};reL(N);if(d&&Math.abs(d-o.w)>10)N.tp={e:"a",w:d};
  S.push(N);par.push(S.length-1);const n=S.length-1;usedE.add(n+"a");addLink(n,"b",i,en,Xo)};
 EQ.forEach(e=>{
  if(e.P&&e.P.length){e.P.forEach(pt=>{let best=null,bd=300;
    S.forEach((o,i)=>{if(Math.abs(cr(o.u,pt.u))>0.3)return;["a","b"].forEach(en=>{if(usedE.has(i+en))return;const p=o[en],v=sub([pt.x,pt.z],p),lat=Math.abs(cr(o.u,v)),al=Math.abs(dt(v,o.u));
     if(al<bd&&lat<Math.max(80,o.w*0.7)){bd=al;best={i,en}}})});
    if(!best)return;const o=S[best.i],t=dt(sub([pt.x,pt.z],o.a),o.u);mkPort(best.i,best.en,[o.a[0]+o.u[0]*t,o.a[1]+o.u[1]*t],pt.u,pt.y,pt.d)});return}
  if(!e.fan)return;
  /* 換気扇など：箱の近くで終わるダクトの端を探して、その面に口を作る */
  const loc=p=>{const dx=p[0]-e.x,dz=p[1]-e.z;return[dx*e.c-dz*e.s,dx*e.s+dz*e.c]},wrl=(lx,lz)=>[e.x+lx*e.c+lz*e.s,e.z-lx*e.s+lz*e.c];
  let best=null,bd=450;S.forEach((o,i)=>["a","b"].forEach(en=>{if(usedE.has(i+en))return;const q=loc(o[en]),ox=Math.max(0,Math.abs(q[0])-e.w/2),oz=Math.max(0,Math.abs(q[1])-e.d/2),d=Math.hypot(ox,oz);if(!d&&Math.min(e.w/2-Math.abs(q[0]),e.d/2-Math.abs(q[1]))>60)return;if(d<bd){bd=d;best={i,en,q}}}));
  if(!best)return;const q=best.q,sx=Math.abs(q[0])/e.w>Math.abs(q[1])/e.d;   // どちらの面か
  const nl=sx?[Math.sign(q[0])||1,0]:[0,Math.sign(q[1])||1],face=sx?[nl[0]*(e.w/2+30),Math.max(-e.d/2+60,Math.min(e.d/2-60,q[1]))]:[Math.max(-e.w/2+60,Math.min(e.w/2-60,q[0])),nl[1]*(e.d/2+30)];
  const T=wrl(face[0],face[1]),dir=[nl[0]*e.c+nl[1]*e.s,-nl[0]*e.s+nl[1]*e.c],o=S[best.i],end=o[best.en],dd=dt(sub(end,T),dir);
  if(dd<-150)return;   // 箱の中で終わっている
  const dX=Math.max(dd,o.w*0.8),X=[T[0]+dir[0]*dX,T[1]+dir[1]*dX],N={a:T.slice(),b:X,h:e.py,sh:o.sh,w:o.w,hh:o.hh,sub:o.sub,lay:o.lay,L:0,u:dir.slice(),id:0,cn:1,fh:e.py};reL(N);
  if(e.pd&&Math.abs(e.pd-o.w)>10)N.tp={e:"a",w:e.pd};
  if(best.en==="a")o.a=X.slice();else o.b=X.slice();reL(o);S.push(N);par.push(S.length-1);const n=S.length-1;usedE.add(n+"a");addLink(n,"b",best.i,best.en,X)});
 const cand=[];for(let i=0;i<S.length;i++)for(let j=i+1;j<S.length;j++){if(S[i].lay!==S[j].lay)continue;const r=geo(S[i],S[j]);if(r)cand.push({i,j,g:r.g})}
 cand.sort((p,q)=>p.g-q.g);
 cand.forEach(({i,j})=>{const A=S[i],B=S[j];A.u=[(A.b[0]-A.a[0])/A.L,(A.b[1]-A.a[1])/A.L];B.u=[(B.b[0]-B.a[0])/B.L,(B.b[1]-B.a[1])/B.L];const r=geo(A,B);if(!r)return;
  const ea=r.endA?i+r.ka:null,eb=r.endB?j+r.kb:null;if(DU&&((ea&&usedE.has(ea))||(eb&&usedE.has(eb))))return;
  const X=r.X;
  if(r.endA){if(r.ka==="a")A.a=[X[0],X[1]];else A.b=[X[0],X[1]];usedE.add(ea)}
  if(r.endB){if(r.kb==="a")B.a=[X[0],X[1]];else B.b=[X[0],X[1]];usedE.add(eb)}
  [A,B].forEach(o=>{o.L=Math.hypot(o.b[0]-o.a[0],o.b[1]-o.a[1]);o.cn++});un(i,j);J.push({p:X,i,j,el:r.endA&&r.endB})});
 /* ③ 高さ：図面の文字のあるダクトはその高さ。文字の無いダクトは、つながりをたどって一番近い文字の高さ（口の管は口の高さのまま）。
    つながりの中に文字が無ければ、口の高さ → 無ければ多い方の高さ */
 const adj=S.map(()=>[]),adjT=S.map(()=>[]);J.forEach(q=>{adj[q.i].push(q.j);adj[q.j].push(q.i);adjT[q.i].push([q.j,0.4]);adjT[q.j].push([q.i,0.4])});LKs.forEach(q=>{adj[q.i].push(q.j);adj[q.j].push(q.i);adjT[q.i].push([q.j,0.15]);adjT[q.j].push([q.i,0.15])});
 const grp={};S.forEach((o,i)=>{const r=fd(i);(grp[r]=grp[r]||[]).push(i)});
 Object.values(grp).forEach(G=>{let src=G.filter(i=>S[i].lh&&!S[i].fh).map(i=>[i,S[i].lh]);if(!src.length)src=G.filter(i=>S[i].fh).map(i=>[i,S[i].fh]);
  if(!src.length){const v={};G.forEach(i=>{const hk=Math.round(S[i].h/10)*10;v[hk]=(v[hk]||0)+S[i].L});const hb=+Object.keys(v).sort((a,b)=>v[b]-v[a])[0];G.forEach(i=>S[i].h=hb);return}
  const seen=new Map(),qq=[];src.forEach(([i,h])=>{if(!seen.has(i)){seen.set(i,h);qq.push(i)}});
  while(qq.length){const i=qq.shift();adj[i].forEach(j=>{if(seen.has(j))return;seen.set(j,seen.get(i));qq.push(j)})}
  G.forEach(i=>{const o=S[i];if(o.fh)o.h=o.fh;else if(o.lh)o.h=o.lh;else if(seen.has(i))o.h=seen.get(i)})});
 /* 太さ：文字の無いダクトは、つながっている文字のあるダクトの太さに（曲がりの先は4割、一直線に続く物は1.5割までのちがい。それ以上＝箱・チャンバーはそのまま） */
 {const seen=new Map(),qq=[];S.forEach((o,i)=>{if(o.lsz){seen.set(i,o);qq.push(i)}});
  while(qq.length){const i=qq.shift(),m=seen.get(i);adjT[i].forEach(([j,tl])=>{if(seen.has(j))return;const o=S[j];if(o.lsz||o.fh||o.sh!==m.sh||Math.abs(o.w-m.w)>tl*Math.max(o.w,m.w))return;o.w=m.w;o.hh=m.hh;seen.set(j,m);qq.push(j)})}}
 /* ④ 短いかけらを捨てる */
 const keep=S.map(o=>(o.cn>0||o.L>=Math.max(300,2*o.w))&&!(DU&&o.sh===1&&!o.lsz&&!o.fh&&o.L<o.w*0.6));   // 角の短い物（太さの6割より短い）はダンパーなどの記号
 /* 短くても、残す物と一直線にすぐ続いている物（機器のダクト口の短い管など）は残す */
 S.forEach((o,i)=>{if(keep[i])return;keep[i]=S.some((c,j)=>j!==i&&keep[j]&&c.lay===o.lay&&Math.abs(cr(o.u,c.u))<0.05&&Math.abs(cr(c.u,sub(o.a,c.a)))<0.35*Math.max(o.w,c.w)+10&&
  Math.min(...[[o.a,c.a],[o.a,c.b],[o.b,c.a],[o.b,c.b]].map(([p,q])=>Math.hypot(p[0]-q[0],p[1]-q[1])))<Math.max(60,0.5*Math.max(o.w,c.w)))});
 const endKey=(o,p)=>Math.hypot(o.a[0]-p[0],o.a[1]-p[1])<=Math.hypot(o.b[0]-p[0],o.b[1]-p[1])?"a":"b";
 const far=(o,e)=>e==="a"?o.b:o.a;
 const use={};J.forEach(q=>{if(!keep[q.i]||!keep[q.j])return;[[q.i,S[q.i]],[q.j,S[q.j]]].forEach(([n,o])=>{const kk=n+endKey(o,q.p);use[kk]=(use[kk]||0)+1})});
 /* ④' 機器の口につながるダクトは、口の太さ（ロスナイ N15 なら φ100）にそろえる。
    口から同じ太さで続く所まで（図面の文字で太さが変わる所＝OA 200φ などから先はそのまま）。途中の箱・チャンバー（文字の無い太い物）は通りぬける */
 S.forEach((o,i)=>{if(!o.pd||o.sh!==0)return;const nb=adjT[i].map(([j])=>S[j]).find(q=>q.sh===0&&!q.pd),w0=nb?(nb.lsz?nb.lsz.a:nb.w):o.w,d=o.pd;/* 続くダクトの太さ（図面の文字）を基準に */o.tp=null;o.w=o.hh=d;const seen=new Set([i]),qq=[i];
  while(qq.length){const c=qq.shift();adjT[c].forEach(([j])=>{if(seen.has(j))return;seen.add(j);const q=S[j];if(q.sh!==0||q.pd)return;
   if(Math.abs(q.w-w0)<=0.15*w0){q.w=q.hh=d;qq.push(j)}else if(!q.lsz)qq.push(j)})}});
 /* ⑤ 高さのちがうつなぎ目（曲がり・一直線）：その場所で上げ下げする。丸い物は「曲がり → たて管 → 曲がり」、角は たての箱
    ・ほんの少し（太さの1/4 以下）しかちがわない時は、口の管をダクトの高さに合わせるだけ */
 const VJ=[],VS=[];
 J.filter(q=>q.el).concat(LKs.map(q=>Object.assign(q,{lin:1}))).forEach(q=>{const A=S[q.i],B=S[q.j];if(!keep[q.i]||!keep[q.j])return;
  const dh=B.h-A.h,W=Math.max(A.w,B.w);if(Math.abs(dh)<1)return;
  if(Math.abs(dh)<Math.max(30,0.25*W)){if(A.fh&&!B.fh)A.h=B.h;else if(B.fh&&!A.fh)B.h=A.h;return}
  q.jog=1;q.el=false;const ea=endKey(A,q.p),eb=endKey(B,q.p),P=[(A[ea][0]+B[eb][0])/2,(A[ea][1]+B[eb][1])/2];
  const ua0=sub(far(A,ea),P),ub0=sub(far(B,eb),P),la=Math.hypot(...ua0),lb=Math.hypot(...ub0);if(la<1||lb<1)return;
  const ua=[ua0[0]/la,ua0[1]/la],ub=[ub0[0]/lb,ub0[1]/lb],v=Math.sign(dh);
  if(A.sh===0&&B.sh===0){const r=Math.max(10,Math.min(W,Math.abs(dh)/2,la*0.45,lb*0.45));
   if(ea==="a")A.a=[P[0]+ua[0]*r,P[1]+ua[1]*r];else A.b=[P[0]+ua[0]*r,P[1]+ua[1]*r];if(eb==="a")B.a=[P[0]+ub[0]*r,P[1]+ub[1]*r];else B.b=[P[0]+ub[0]*r,P[1]+ub[1]*r];
   [A,B].forEach(o=>{o.L=Math.hypot(o.b[0]-o.a[0],o.b[1]-o.a[1])});
   VJ.push([P,A.h,A.w,A.sub,ua,[0,v],r],[P,B.h,B.w,B.sub,ub,[0,-v],r]);   // 曲がり2つ（横 → たて、たて → 横）
   if(Math.abs(dh)-2*r>1)VS.push([P,A.h+v*r,B.h-v*r,0,B.w,B.hh,B.sub])}
  else{if(ea==="a")A.a=P.slice();else A.b=P.slice();if(eb==="a")B.a=P.slice();else B.b=P.slice();[A,B].forEach(o=>{o.L=Math.hypot(o.b[0]-o.a[0],o.b[1]-o.a[1])});
   const hm=Math.max(A.hh,B.hh)/2;VS.push([P,A.h-v*hm,B.h+v*hm,1,Math.max(A.w,B.w),Math.max(A.hh,B.hh),B.sub])}});
 /* ⑥ 丸い物の曲がり（エルボ）：まっすぐの所を曲がりの分だけ短くして、曲がった管でつなぐ（両方の管の端が角で重なって見えないように）
    ・同じ端に3本以上集まる所は分岐なので、今まで通り（玉） */
 J.forEach(q=>{const A=S[q.i],B=S[q.j];q.ea=endKey(A,q.p);q.eb=endKey(B,q.p);
  if(!q.el||A.sh!==0||B.sh!==0||!keep[q.i]||!keep[q.j]||use[q.i+q.ea]>1||use[q.j+q.eb]>1){q.el=false;return}
  const ua=sub(far(A,q.ea),q.p),ub=sub(far(B,q.eb),q.p),la=Math.hypot(...ua),lb=Math.hypot(...ub);if(la<1||lb<1){q.el=false;return}
  q.ua=[ua[0]/la,ua[1]/la];q.ub=[ub[0]/lb,ub[1]/lb];const phi=Math.PI-Math.acos(Math.max(-1,Math.min(1,dt(q.ua,q.ub))));if(phi<0.15){q.el=false;return}
  /* 曲がりの前後で太さが少しだけちがう時（図面の描き方のずれ）は、細い方にそろえる */
  if(!A.lsz&&!B.lsz&&Math.min(A.w,B.w)>=0.6*Math.max(A.w,B.w)){const m=Math.min(A.w,B.w);A.w=A.hh=B.w=B.hh=m}
  const w=Math.max(A.w,B.w),tn=Math.tan(phi/2);let tl=w*1.0*tn;tl=Math.min(tl,la*0.45,lb*0.45);q.tl=tl;q.phi=phi;
  const cut=(o,e,u)=>{if(e==="a")o.a=[q.p[0]+u[0]*tl,q.p[1]+u[1]*tl];else o.b=[q.p[0]+u[0]*tl,q.p[1]+u[1]*tl];o.L=Math.hypot(o.b[0]-o.a[0],o.b[1]-o.a[1])};
  cut(A,q.ea,q.ua);cut(B,q.eb,q.ub)});
 /* 出力：S＝[x1,z1,x2,z2,高さ,形(0丸1角),太さ,高さ方向の太さ,種類, (終わりの高さ), (終わりの太さ)]
          J＝[x,z,高さ,形,太さ,…,種類, 1(曲がり), 向きA(x,z), 向きB(x,z), 曲がりの長さ, 向きAのたて, 向きBのたて] */
 const R0=Math.round,outS=[],outJ=[];S.forEach((o,i)=>{if(!keep[i]||o.L<5)return;let a=o.a,b=o.b,w2=null;
  if(o.tp){if(o.tp.e==="a"){a=o.b;b=o.a}w2=o.tp.w}
  const row=[R0(a[0]),R0(a[1]),R0(b[0]),R0(b[1]),R0(o.h),o.sh,R0(o.w),R0(o.hh),o.sub];if(w2)row.push(R0(o.h),R0(w2));outS.push(row)});
 VS.forEach(([P,h1,h2,sh,w,hh,sb])=>outS.push([R0(P[0]),R0(P[1]),R0(P[0]),R0(P[1]),R0(h1),sh,R0(w),R0(hh),sb,R0(h2)]));
 const f4=x=>+(+x).toFixed(4);
 VJ.forEach(([P,h,w,sb,a,b,r])=>{const A3=a.length===2&&b.length===2&&b[0]===0&&Math.abs(b[1])===1;   // a：横の向き、b：[0,±1]＝上下
  outJ.push([R0(P[0]),R0(P[1]),R0(h),0,R0(w),R0(w),sb,1,f4(a[0]),f4(a[1]),0,0,R0(r),0,f4(b[1])])});
 J.forEach(q=>{const A=S[q.i],B=S[q.j];if(!keep[q.i]||!keep[q.j]||q.jog)return;const w=Math.round(Math.max(A.w,B.w));
  if(q.el){outJ.push([R0(q.p[0]),R0(q.p[1]),R0(A.h),0,w,w,A.sub,1,f4(q.ua[0]),f4(q.ua[1]),f4(q.ub[0]),f4(q.ub[1]),R0(q.tl)]);return}
  if(outJ.some(o=>!o[7]&&Math.hypot(o[0]-q.p[0],o[1]-q.p[1])<w*0.6))return;
  /* 角ダクトの曲がりは、角の箱をダクトの向きにそろえる */
  const ang=A.sh===1?Math.atan2(A.u[0],A.u[1]):0;
  outJ.push([R0(q.p[0]),R0(q.p[1]),R0(A.h),A.sh,w,R0(Math.max(A.hh,B.hh)),A.sub,0,f4(ang)])});
 return{S:outS,J:outJ}}
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
if(!by[k])return;if(P.dxf&&!dxfVisible(P)(s[5]))return;const v=main?own((s[0]+s[2])/2,(s[1]+s[3])/2):null;if(main&&!v)return;by[k].push({s,v,lay:s[5],c:s[6]===1})});
 const CH=(st.gnd&&st.gnd.ch)||P.CH||2700,defH={ref:CH-150,drain:CH-250,duct:CH+300,eisei:CH-300};
 const FLt=(P.textsAll||P.texts||[]).map(t=>{const z=String(t.s).replace(/[＋]/g,"+").replace(/[－−ー]/g,"-").replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248));if(/下端|上端|梁|H-\d|C-\d/.test(z))return null;const m=z.match(/FL\s*([+\-])\s*(\d{2,4})/);return m?{x:t.x,y:t.y,h:(m[1]==="-"?-1:1)*+m[2],k:txtCat(t)}:null}).filter(Boolean);
 const out={};
 Object.keys(by).forEach(k=>{let L0=by[k];if(!L0.length)return;
  /* 画層ごとに：原点の図にあればそれ、無ければほかの図から通り芯でずらして持ってくる（同じ物を2回出さない） */
  const gs={};L0.forEach(q=>{const g=q.s[5]!==undefined?q.s[5]:k;(gs[g]=gs[g]||[]).push(q)});let L=[];const layV={};   // 画層ごとに、どの図から持ってきたか（文字も同じだけずらす）
  Object.values(gs).forEach(G=>{if(!main){L=L.concat(G);return}const inMain=G.filter(q=>q.v===main);
   /* 原点の図に少しだけある（縦管の記号など）時は、たくさん描いてある図の方を使う */
   const cnt={};G.forEach(q=>{if(q.v!==main&&off(q.v))cnt[V.indexOf(q.v)]=(cnt[V.indexOf(q.v)]||0)+1});const mx=Math.max(0,...Object.values(cnt));
   if(inMain.length&&inMain.length>=mx*0.8){L=L.concat(inMain);layV[G[0].lay]={v:main,d:[0,0]};return}
   const vs=[...new Set(G.map(q=>q.v))];let bestV=null,bn=0;vs.forEach(v=>{const n=G.filter(q=>q.v===v).length;if(n>bn&&off(v)){bn=n;bestV=v}});if(!bestV)return;const d=off(bestV);layV[G[0].lay]={v:bestV,d};
   L=L.concat(G.filter(q=>q.v===bestV).map(q=>({s:[q.s[0]+d[0],q.s[1]+d[1],q.s[2]+d[0],q.s[3]+d[1]],v:main,moved:1,o:q.s,lay:q.lay,c:q.c})))});
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
  const items=L.slice(0,9000).map(q=>{const s=q.s,dx=s[2]-s[0],dy=s[3]-s[1],l=Math.hypot(dx,dy);if(l*mm<8)return null;let deg=Math.atan2(dy,dx)*180/Math.PI;deg=((deg%180)+180)%180;deg=deg<=3||deg>=177?0:Math.abs(deg-90)<=3?90:(Math.round(deg/2)*2)%180;const th=deg*Math.PI/180;   // ほぼ縦・横（±3°）はそろえる
   const ux=Math.cos(th),uy=Math.sin(th),t0=s[0]*ux+s[1]*uy,t1=s[2]*ux+s[3]*uy;return{q,deg,ux,uy,d:-s[0]*uy+s[1]*ux,lo:Math.min(t0,t1),hi:Math.max(t0,t1),l,used:0}}).filter(Boolean);
  const grp={};items.forEach(it=>{const key=(it.q.lay||"")+"|"+it.deg;(grp[key]=grp[key]||[]).push(it)});
  const solids=[],lines=[],hAt=(x,y)=>{const t=near(x,y);return t?t.h:defH[k]},W=(x,y)=>btWx([x,y]);
  const wTxt=(x,y)=>{const t=nearSz(x,y);if(!t)return null;return t.r?{r:1,w:[t.a],t}:{r:0,w:[t.a,t.b],t}};
  Object.values(grp).forEach(G=>{if(G.length<2)return;const hasC=k==="duct"&&G.some(it=>it.q.c);G.forEach(it=>{if(it.q.c)it.used=1});const ux=G[0].ux,uy=G[0].uy,xy=(t,d)=>[t*ux-d*uy,t*uy+d*ux];
   const bp=[...new Set(G.flatMap(it=>[it.lo,it.hi]).map(v=>Math.round(v*4)/4))].sort((a,b)=>a-b),pcs=[];
   for(let n=0;n+1<bp.length;n++){const ta=bp[n],tb=bp[n+1];if((tb-ta)*mm<10)continue;
    const act0=G.filter(it=>it.lo<=ta+0.3&&it.hi>=tb-0.3).sort((a,b)=>a.d-b.d),cen=act0.filter(it=>it.q.c),act=act0.filter(it=>!it.q.c);if(act.length<2)continue;
    /* 中心線（一点鎖線）が描いてある図面では、真ん中に中心線がある2本だけを組にする（記号の線と外形の線をまちがえて組にしない） */
    const cOK=(d1,d2)=>!hasC||cen.some(it=>Math.abs(it.d-(d1+d2)/2)<Math.max((d2-d1)*0.08,15/mm));
    const A2=[];act.forEach(it=>{if(!A2.length||it.d-A2[A2.length-1].d>0.4)A2.push(it)});
    let i=0;while(i<A2.length-1){const di=A2[i].d;let pick=-1;
     const c=xy((ta+tb)/2,di),tw=wTxt(c[0],c[1]);
     if(tw){let be=1e9;for(let j=i+1;j<A2.length;j++){const g=(A2[j].d-di)*mm;if(g>wMax*mm)break;tw.w.forEach(w=>{const e=Math.abs(g-w)/w;if(e<0.25&&e<be&&cOK(di,A2[j].d)){be=e;pick=j}})}}
     if(pick<0)for(let j=A2.length-1;j>i;j--){const g=A2[j].d-di;if(g>wFree||g<wMin)continue;if(!cOK(di,A2[j].d))continue;const mid=(A2[j].d+di)/2;let ok=true;for(let m=i+1;m<j;m++)if(Math.abs(A2[m].d-mid)>g*0.08){ok=false;break}if(ok){pick=j;break}}
     if(pick<0){i++;continue}
     pcs.push({dl:di,dr:A2[pick].d,ta,tb,tw});for(let m=i;m<=pick;m++)A2[m].used=1;i=pick+1}}
   /* となりの区間で同じ太さならつなげる */
   pcs.sort((a,b)=>Math.round(a.dl)-Math.round(b.dl)||Math.round(a.dr)-Math.round(b.dr)||a.ta-b.ta);   /* 位置は1px単位でそろえて並べる（小数の差で別物にしない） */const M=[];
   pcs.forEach(p=>{const l=M[M.length-1];if(l&&Math.abs(l.dl-p.dl)<1&&Math.abs(l.dr-p.dr)<1&&p.ta-l.tb<=150/mm){l.tb=Math.max(l.tb,p.tb);l.tw=l.tw||p.tw}else M.push({...p})});
   /* 短すぎる物（器具・掃除口などの記号の線）は捨てる：長さが太さの（ダクト0.8倍・配管2倍）未満、または10cm未満 */
   M.forEach(p=>{const lm=(p.tb-p.ta)*mm,wm0=(p.dr-p.dl)*mm;if(k==="duct"?(lm<40||lm<wm0*0.3):(lm<40||lm<wm0*0.8))return;   /* 短い物も一度残して、あとでつなげてから捨てる */const dc=(p.dl+p.dr)/2,p1=xy(p.ta,dc),p2=xy(p.tb,dc),wm=(p.dr-p.dl)*mm,cm=xy((p.ta+p.tb)/2,dc);
    const src=G[0].q.o?null:cm;   // ほかの図から持ってきた物は、高さの文字を元の図で探す
    const so=G[0].q.o?[cm[0]+(G[0].q.o[0]-G[0].q.s[0]),cm[1]+(G[0].q.o[1]-G[0].q.s[1])]:cm;
    const tz=p.tw&&p.tw.t;let sh=k==="duct"?(wm<=330?0:1):0,hh=wm;
    if(k==="duct"&&tz){if(tz.r)sh=Math.abs(wm-tz.a)>tz.a*0.35&&wm>330?1:0;else{sh=1;hh=Math.abs(tz.b-wm)<Math.abs(tz.a-wm)?tz.a:tz.b}}
    if(k==="duct"&&sh===1&&(!tz||tz.r))hh=Math.min(wm,tz&&tz.r?tz.a+100:300);
    const a=W(p1[0],p1[1]),b=W(p2[0],p2[1]);solids.push([Math.round(a[0]),Math.round(a[1]),Math.round(b[0]),Math.round(b[1]),Math.round(hAt(so[0],so[1])),sh,Math.round(wm),Math.round(hh),sub(G[0].q.lay),G[0].q.lay||""])})});
  /* 組にならなかった線（曲がり・継手・記号など）は細い線で */
  items.forEach(m=>{if(m.used||m.l*mm<40)return;const s=m.q.s,src=m.q.o||s,a=W(s[0],s[1]),b=W(s[2],s[3]);lines.push([Math.round(a[0]),Math.round(a[1]),Math.round(b[0]),Math.round(b[1]),Math.round(hAt((src[0]+src[2])/2,(src[1]+src[3])/2))])});
  /* 機器（登録のある換気機器）の外形とダクト口（向き・高さ）。ロスナイ：左 EA・OA、右 RA・SA、奥行の中心から ±K/2、高さは下から 94／289 */
  const EQ=[];try{(st.bld||[]).forEach(o=>{if(o.k!=="eq")return;const th=-(o.r||0)*Math.PI/180,c=Math.cos(th),sn=Math.sin(th),e={x:o.x,z:o.z,w:o.w,d:o.d,c,s:sn,P:[]};
   const V=typeof VENTM!=="undefined"&&VENTM[o.m];if(V){const tip=(V.A-14)/2+V.J+7;[[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz])=>{const lx=sx*tip,lz=sz*V.K/2;
    e.P.push({x:o.x+lx*c+lz*sn,z:o.z-lx*sn+lz*c,y:Math.round(o.y+V.C*94/289),u:[c*sx,-sn*sx],d:V.d||0})})}EQ.push(e)})}catch(err){}
  /* ダクトの文字：「OA」「150φ」「FL+3900」のように別々の文字が横に並んでいるのを、1つにまとめる（同じ画層・同じ向き・70cm 以内） */
  const LB=[];if(k==="duct"&&P.dxf){const TT=(P.textsAll||[]).filter(t=>dxfCat(t.lay)==="duct");const nz=t=>String(t.s).replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)).replace(/[＋]/g,"+").replace(/[Φø]/g,"φ").trim();
   const used=new Set(),toW=(t,x,y)=>{const lv=layV[t.lay];if(main){if(!lv)return null;const v=lv.v;if(v===main){if(own(x,y)!==main)return null}else if(!(x>=v.b[0]&&x<=v.b[2]&&y>=v.b[1]&&y<=v.b[3]))return null;x+=lv.d[0];y+=lv.d[1]}return W(x,y)};
   const isH=z=>/FL\s*[+\-]\s*\d{3,4}/.test(z)&&!/下端|上端/.test(z),isS=z=>/(\d{2,4})\s*φ/.test(z)||/(\d{2,4})\s*[×xX*]\s*(\d{2,4})/.test(z);
   const mk=(seed)=>{const g=[seed];TT.forEach(u=>{if(u===seed||used.has(u)||u.lay!==seed.lay||Math.abs(((u.r||0)-(seed.r||0)+540)%180-0)>4&&Math.abs(((u.r||0)-(seed.r||0)+540)%180-180)>4)return;if(Math.hypot(u.x-seed.x,u.y-seed.y)*mm<700&&(isH(nz(u))||isS(nz(u))))g.push(u)});
    let h=0,sz=null;g.forEach(u=>{const z=nz(u);let m=z.match(/FL\s*([+\-])\s*(\d{3,4})/);if(m&&isH(z)&&!h)h=(m[1]==="-"?-1:1)*+m[2];m=z.match(/(\d{2,4})\s*[×xX*]\s*(\d{2,4})/);if(m&&!sz)sz={r:0,a:+m[1],b:+m[2]};m=z.match(/(\d{2,4})\s*φ/);if(m&&!sz)sz={r:1,a:+m[1]}});
    g.forEach(u=>used.add(u));const cx=g.reduce((a,u)=>a+u.x,0)/g.length,cy=g.reduce((a,u)=>a+u.y,0)/g.length,p=toW(seed,cx,cy);if(!p)return;
    const rr=(seed.r||0)*Math.PI/180,p2=toW(seed,cx+Math.cos(rr)*20,cy-Math.sin(rr)*20);let u=null;if(p2){const dx=p2[0]-p[0],dz=p2[1]-p[1],l=Math.hypot(dx,dz);if(l>0)u=[dx/l,dz/l]}
    if(h||sz)LB.push({x:p[0],z:p[1],lay:seed.lay,h,sz,u})};
   TT.filter(t=>isH(nz(t))).forEach(t=>{if(!used.has(t))mk(t)});TT.filter(t=>isS(nz(t))).forEach(t=>{if(!used.has(t))mk(t)})
   /* 段差の記号（ダクトの線の半円）の場所 */
   LB.mk=(P.segAll||P.segs).filter(q=>{if(dxfCat(q[5])!=="duct")return false;const dx=q[2]-q[0],dy=q[3]-q[1],l=Math.hypot(dx,dy);if(!l||l*mm>150)return false;return Math.abs(2*dx*dy)/(l*l)>0.3}).map(q=>{const p=toW({lay:q[5]},(q[0]+q[2])/2,(q[1]+q[3])/2);return p?{x:p[0],z:p[1],lay:q[5]}:null}).filter(Boolean)}
  /* 登録のない機械（換気扇など）：口は近くのダクトの所に作る（高さは箱の真ん中） */
  EQ.forEach((e,n)=>{const o=(st.bld||[]).filter(q=>q.k==="eq")[n];if(o&&!e.P.length){e.fan=1;e.py=Math.round((o.y||0)+(o.h||250)/2);e.pd=o.pd||0}});
  const T=dlTidy(solids,k,EQ,LB);out[k]=lines;out[k+"S"]=T.S;out[k+"J"]=T.J});
 return out};
})();
