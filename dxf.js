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
function dxfGeo(D){const segs=[],arcs=[],texts=[],circ=[],MAX=400000;
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
    if(t==="ARC")arcs.push({a:pt(0),m:pt(n/2),b:pt(n),lay,col});
    if(t==="CIRCLE"){const c0=P(cx,cy),p0=pt(0);circ.push({x:c0[0],y:c0[1],r:Math.hypot(p0[0]-c0[0],p0[1]-c0[1]),lay})}}   // 円（たて管の記号など）
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
 walk(D.ents,[1,0,0,1,0,0],null,0);return{segs,arcs,texts,circ}}
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
 const circ=(G.circ||[]).map(o=>{const p=px(o.x,o.y);return{x:p[0],y:p[1],r:o.r/mmpp,lay:o.lay}});
 const P={dX0:X0,dY1:Y1,img:c,W,H0:H,segs,segAll,arcs,circ,texts:tAna,textsAll:texts,mmpp,ptpx:0,den:0,dxf:1,dS,route:[],walls:[],show:true,fkey:f.name+"|"+f.size};dxfRender(P);return P};
/* 図面の線を「何の図か」で分ける：空調（冷媒・ドレン・機器）／ダクト／衛生／建築／寸法・文字 */
function dxfGrp(L){L=L||"";const mp=dxMap()[L];if(mp)return mp==="ref"||mp==="drain"||mp==="acq"?"ac":mp;const k=dxfCat(L);if(k==="ref"||k==="drain")return"ac";if(k)return k;
 if(/機器|ｽﾘｰﾌﾞ|スリーブ|メンテ|室内機|室外機|空調|冷媒|PAC|基準線|HVAC|EQPM|EQUIP|AIRCON|CLIM/i.test(L))return"ac";
 if(/寸法|文字|符号|枠|凡例|方位|補助線|表/.test(L))return"anno";return"arch"}
const DXV=[["ac","空調","#2563eb"],["duct","ダクト","#0d9488"],["eisei","衛生","#16a34a"],["elec","電気","#ca8a04"],["arch","建築","#64748b"],["anno","その他","#a16207"]];
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
  let lg="";L.forEach(o=>{if(o.g!==lg){lg=o.g;const D=DXV.find(x=>x[0]===o.g)||["","その他","#475569"];const allOn=L.filter(q=>q.g===o.g).every(q=>!hid.has(q.n));h+=`<div style="display:flex;align-items:center;gap:8px;margin:12px 4px 4px"><b style="flex:1;color:${D[2]}">${D[1]}</b><button data-lgall="${o.g}" style="height:30px;padding:0 10px;border-radius:9px;font-weight:800;font-size:12.5px;border:1.5px solid ${D[2]};background:#fff;color:${D[2]}">${allOn?"全部消す":"全部表示"}</button></div>`}
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
/* 図面画面の下の切りかえボタン（DXFの時だけ）：
   グループ（空調・ダクト・衛生・電気・建築・その他）のボタン。押す＝グループ全体のオンオフ、▾＝その中のレイヤーを1つずつ選ぶ列を出す */
window.dxfChips=function(){const wr=document.getElementById("plWrap");let el=document.getElementById("dxfChips");const P=typeof PLAN!=="undefined"?PLAN:null;
 if(!wr||!P||!P.dxf){if(el)el.remove();return}
 if(!el){el=document.createElement("div");el.id="dxfChips";el.style.cssText="position:absolute;left:8px;right:8px;bottom:8px;z-index:5;display:flex;flex-direction:column;gap:6px";wr.appendChild(el)}
 const op=window.DXF_OPEN||"";const kk=P.fkey+"|"+(P._tex||0)+"|"+(window.DXF_PICK?1:0)+"|"+op;if(el.dataset.k===kk)return;el.dataset.k=kk;
 const hid=dxHid(),nh=hid.size,pk=!!window.DXF_PICK,cs="flex:none;height:34px;padding:0 10px;border-radius:17px;font-weight:800;font-size:13px;";
 const cnt={};P.dS.forEach(s=>{cnt[s[6]]=(cnt[s[6]]||0)+1});
 const esc=t=>String(t).replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c]));
 const G=DXV.map(([k,n,col])=>{const ls=Object.keys(cnt).filter(l=>dxfGrp(l)===k).sort((a,b)=>cnt[b]-cnt[a]);return{k,n,col,ls,on:ls.filter(l=>!hid.has(l)).length}}).filter(g=>g.ls.length);
 const row="display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;align-items:center";
 const og=G.find(g=>g.k===op);
 let h="";
 if(og)h+=`<div style="${row};background:#ffffffee;border:2px solid ${og.col};border-radius:20px;padding:4px">`+
  `<button data-gt="${og.k}" style="${cs}height:30px;border:0;background:${og.col};color:#fff">${og.on===og.ls.length?"全部消す":"全部表示"}</button>`+
  og.ls.map(n=>{const o=!hid.has(n);return `<button data-ln="${esc(n)}" style="${cs}height:30px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:2px solid ${og.col};background:${o?og.col:"#fff"};color:${o?"#fff":og.col}">${o?"✓":"－"}${esc(n)}<small style="opacity:.7;font-weight:600">（${cnt[n]}）</small></button>`}).join("")+`</div>`;
 h+=`<div style="${row}">`+
  `<button data-dl2="1" style="${cs}border:2px solid #0f172a;background:#0f172a;color:#fff">📋 一覧</button>`+
  G.map(g=>{const all=g.on===g.ls.length,none=!g.on,bg=all?g.col:"#ffffffee",fg=all?"#fff":g.col,bs=none?"dashed":"solid",isO=g.k===op;
   return `<span style="flex:none;display:flex;border-radius:17px;overflow:hidden;border:2px ${bs} ${g.col};${isO?"box-shadow:0 0 0 2px #fff,0 0 0 4px "+g.col:""}"><button data-gt="${g.k}" style="${cs}border-radius:0;border:0;background:${bg};color:${fg}">${all?"✓":none?"－":"◐"}${g.n}<small style="font-weight:600;opacity:.8"> ${g.on}/${g.ls.length}</small></button><button data-go="${g.k}" aria-label="${g.n}のレイヤーを選ぶ" style="${cs}border-radius:0;border:0;border-left:1.5px solid ${all?"#ffffff88":g.col+"66"};padding:0 9px;background:${bg};color:${fg}">${isO?"▴":"▾"}</button></span>`}).join("")+
  `<button data-dp="1" style="${cs}border:2px solid #dc2626;background:${pk?"#dc2626":"#ffffffee"};color:${pk?"#fff":"#dc2626"}">✋ ${pk?"消したい線をタップ":"タップで消す"}</button>`+
  (nh?`<button data-dr="1" style="${cs}border:2px solid #475569;background:#ffffffee;color:#475569">↩ 全部表示（${nh}）</button>`:"")+`</div>`;
 const keepSc=[...el.children].map(c=>c.scrollLeft);el.innerHTML=h;
 const rows=[...el.children];if(rows.length===keepSc.length)rows.forEach((c,i)=>c.scrollLeft=keepSc[i]);else if(rows.length)rows[rows.length-1].scrollLeft=keepSc[keepSc.length-1]||0;
 const save=H=>{try{localStorage.setItem("pbm_dxfhide",JSON.stringify([...H]))}catch(err){}},redraw=()=>{dxfRender(P);if(P.tex)P.tex.needsUpdate=true;dxfChips();try{planDraw()}catch(err){}try{if(typeof T!=="undefined"&&T)T.dirty=true}catch(err){}};
 el.querySelectorAll("[data-ln]").forEach(b=>b.onclick=e=>{e.stopPropagation();const n=b.dataset.ln,H=dxHid();if(H.has(n))H.delete(n);else H.add(n);save(H);redraw()});
 el.querySelectorAll("[data-gt]").forEach(b=>b.onclick=e=>{e.stopPropagation();const g=G.find(x=>x.k===b.dataset.gt);if(!g)return;const H=dxHid(),allOn=g.ls.every(n=>!H.has(n));g.ls.forEach(n=>{if(allOn)H.add(n);else H.delete(n)});save(H);redraw();if(window.toast)toast(g.n+"を"+(allOn?"消しました":"表示しました"))});
 el.querySelectorAll("[data-go]").forEach(b=>b.onclick=e=>{e.stopPropagation();window.DXF_OPEN=window.DXF_OPEN===b.dataset.go?"":b.dataset.go;dxfChips()});
 el.querySelector("[data-dl2]").onclick=e=>{e.stopPropagation();dxfLayerSheet()};
 el.querySelector("[data-dp]").onclick=e=>{e.stopPropagation();window.DXF_PICK=!window.DXF_PICK;if(window.DXF_PICK&&window.toast)toast("消したい線（網目など）を1本タップしてください。同じ種類の線をまとめて消します");dxfChips()};
 {const r=el.querySelector("[data-dr]");if(r)r.onclick=e=>{e.stopPropagation();save(new Set());redraw();if(window.toast)toast("全部の線を表示しました")}}};

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
 const DU=k==="duct",ES=k==="eisei",LBK=DU||ES,lowD=o=>o.sub===4&&/#下$/.test(o.lay),ceilD=o=>ES&&o.sub===4&&!/#下$/.test(o.lay);EQ=DU&&Array.isArray(EQ)?EQ:[];   // ceilD：図面の天井のドレン（アプリが室内機から作るので3Dには出さない。たて管の高さを知るためだけに使う）。   // LBK：図面の文字（太さ・高さ）を使う種類
 /* 機器（ロスナイなど）の箱の中にほとんど入っている物は、機器の中の線なので捨てる（上を横切る長いダクトは残す） */
 if(EQ.length)S=S.filter(o=>{let ins=0;const n=20;for(let q=0;q<=n;q++){const x=o.a[0]+(o.b[0]-o.a[0])*q/n,z=o.a[1]+(o.b[1]-o.a[1])*q/n;if(EQ.some(e=>{if(!(e.P&&e.P.length))return false;const dx=x-e.x,dz=z-e.z,lx=dx*e.c-dz*e.s,lz=dx*e.s+dz*e.c;return Math.abs(lx)<e.w/2-10&&Math.abs(lz)<e.d/2-10}))ins++}return ins/(n+1)<0.7});   // 衛生配管は今まで通り（ダクトだけ、中に入る物・角の四角を捨てる／端は1回だけつなぐ）
 if(LBK)dropIn();
 /* ① 一直線につなぐ */
 let ch=true,guard=0;while(ch&&guard++<20){ch=false;
  for(let i=0;i<S.length;i++)for(let j=i+1;j<S.length;j++){const A=S[i],B=S[j];if(!A||!B||A.sh!==B.sh||A.sub!==B.sub||A.lay!==B.lay)continue;if(Math.abs(cr(A.u,B.u))>0.035)continue;
   const W=Math.max(A.w,B.w);if(Math.abs(A.w-B.w)>(ES?0.7:0.2)*W)continue;const lat=Math.abs(cr(A.u,sub(B.a,A.a))),lat2=Math.abs(cr(A.u,sub(B.b,A.a)));if(Math.max(lat,lat2)>0.35*W+10)continue;
   const t1=dt(sub(B.a,A.a),A.u),t2=dt(sub(B.b,A.a),A.u),lo=Math.min(t1,t2),hi=Math.max(t1,t2),gap=Math.max(lo-A.L,0-hi,0);if(gap>Math.max(800,4*W))continue;
   const n0=Math.min(0,lo),n1=Math.max(A.L,hi),off=(lat+lat2)/4*Math.sign(cr(A.u,sub(B.a,A.a))||1);
   const ox=-A.u[1]*off,oz=A.u[0]*off;A.a=[A.a[0]+A.u[0]*n0+ox,A.a[1]+A.u[1]*n0+oz];A.b=[A.a[0]+A.u[0]*(n1-n0),A.a[1]+A.u[1]*(n1-n0)];
   A.h=A.L>=B.L?A.h:B.h;A.L=n1-n0;A.w=Math.max(A.w,B.w);A.hh=Math.max(A.hh,B.hh);S[j]=null;ch=true}
  S=S.filter(Boolean)}
 if(LBK)dropIn();
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
 /* 衛生：床下のドレン（「#下」）をたて管の丸の所で切る。汚水の方の半分だけ残す（反対側は天井のドレンを2回描いた物） */
 const RSV=[];if(ES&&LB&&Array.isArray(LB.rs))LB.rs.forEach(R=>{const p=[R.x,R.z];let bi=-1,bt=0,bd=1e9;S.forEach((o,i)=>{if(!lowD(o))return;const v=sub(p,o.a),t=dt(v,o.u),l=Math.abs(cr(o.u,v));if(t<-60||t>o.L+60||l>Math.max(60,o.w))return;const sc=l-Math.min(o.L,3000)*0.02;if(sc<bd){bd=sc;bi=i;bt=t}});   // 長い管を優先（丸の十字を選ばない）
  if(bi<0)return;const o=S[bi],pt=t=>[o.a[0]+o.u[0]*t,o.a[1]+o.u[1]*t],P0=pt(Math.max(0,Math.min(o.L,bt)));
  const far=(q,skip)=>{let m=1e9;S.forEach((c,j)=>{if(skip.includes(j)||!(lowD(c)||c.sub===1))return;const v=sub(q,c.a),t=Math.max(0,Math.min(c.L,dt(v,c.u))),d=Math.hypot(c.a[0]+c.u[0]*t-q[0],c.a[1]+c.u[1]*t-q[1]);if(d<m)m=d});return m};
  if(bt>o.w&&bt<o.L-o.w){const N=Object.assign({},o,{a:P0.slice(),b:o.b.slice(),lbs:null,cn:0});const bOld=o.b.slice();o.b=P0.slice();const rl=q=>{q.L=Math.hypot(q.b[0]-q.a[0],q.b[1]-q.a[1])};rl(o);rl(N);S.push(N);par.push(S.length-1);
   const n=S.length-1,dA=far(o.a,[bi,n]),dB=far(bOld,[bi,n]);if(dA<=dB){N.dead=1;RSV.push({i:bi,en:"b",p:P0})}else{o.dead=1;RSV.push({i:n,en:"a",p:P0})}}
  else RSV.push({i:bi,en:bt<o.L/2?"a":"b",p:P0})});
 if(RSV.length)S=S.map(o=>o.dead?Object.assign(o,{L:0,cn:0,lay:"#dead"}):o);
 /* 図面の文字（「OA 150φ FL+3900」）：同じ画層で、向きが同じで、近く（文字の横 70cm 以内）のダクトに付ける。大きさはその場で直す */
 const segD=(p,o)=>{const t=Math.max(0,Math.min(o.L,dt(sub(p,o.a),o.u)));return Math.hypot(o.a[0]+o.u[0]*t-p[0],o.a[1]+o.u[1]*t-p[1])};
 if(LBK&&Array.isArray(LB))LB.forEach(lb=>{let best=null,bd=1e9;
  if(lb.tip){S.forEach(o=>{if(o.lay!==lb.lay)return;const d=segD(lb.tip,o);if(d<Math.max(o.w,60)+40&&d<bd){bd=d;best=o}});if(best){if(lb.h){best.lh=lb.h;(best.lbs=best.lbs||[]).push({t:dt(sub(lb.tip,best.a),best.u),h:lb.h})}if(lb.sz){best.lsz=lb.sz;if(lb.sz.r){best.sh=0;best.w=best.hh=lb.sz.a}else{best.sh=1;best.w=lb.sz.a;best.hh=lb.sz.b}}return}}   // 引出線の先の管
  S.forEach(o=>{if(o.lay!==lb.lay)return;if(DU&&lb.u&&Math.abs(cr(o.u,lb.u))>0.35)return;const v=sub([lb.x,lb.z],o.a),t=dt(v,o.u),l=Math.abs(cr(o.u,v));
   const LR=ES?1200:800;if(ES&&o.sub===0&&(t<0||t>o.L||(LB.cs||[]).some(c=>Math.hypot(c.x-o.a[0]-o.u[0]*t,c.z-o.a[1]-o.u[1]*t)<3*o.w+150)))return;/* 給水・給湯：引出線の無い文字は、管の横に並んでいる物だけ。たて管の丸（チーズ・上下の印）のすぐ横の文字は、そこから上下・枝に出る管の物なので付けない */if(t<-LR||t>o.L+LR||l>Math.max(ES?1200:700,o.w/2+500))return;const d=l+Math.max(0,-t,t-o.L)*1.5+(lb.sz?Math.abs(o.w-lb.sz.a)*2:0)-Math.min(o.L,2000)*0.01;if(d<bd){bd=d;best=o}});   // 太さの合う物・長い物を優先（となりの箱・チャンバーに付けない）
  if(!best)return;if(lb.h)best.lh=lb.h;if(lb.sz){best.lsz=lb.sz;if(lb.sz.r){best.sh=0;best.w=best.hh=lb.sz.a}else{best.sh=1;best.w=lb.sz.a;best.hh=lb.sz.b}};if(lb.h)(best.lbs=best.lbs||[]).push({t:dt(sub([lb.x,lb.z],best.a),best.u),h:lb.h})});
 /* 1本のダクトに高さのちがう文字が2つ以上ある時（ロスナイの上だけ上げる、など）：文字と文字の間で切って、それぞれの高さにする。
    切る所は、間にある段差の記号（ダクトの上の半円の線）。無ければ文字と文字の真ん中 */
 if(LBK){const MK=(LB&&LB.mk)||[],n0=S.length;for(let i=0;i<n0;i++){const o=S[i];if(!o.lbs||o.lbs.length<2)continue;const L=o.lbs.sort((p,q)=>p.t-q.t);if(L.every(q=>q.h===L[0].h))continue;
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
 /* ダクトを横にずらして、芯が口の真ん中を通るようにする（図面の線は少しずれて描いてあることが多い）。一直線につながっている物も一緒に */
 const slide=(i,off)=>{if(Math.hypot(off[0],off[1])<1)return;const seen=new Set([i]),qq=[i];
  while(qq.length){const c=qq.shift(),o=S[c];o.a=[o.a[0]+off[0],o.a[1]+off[1]];o.b=[o.b[0]+off[0],o.b[1]+off[1]];
   LKs.forEach(q=>{const j=q.i===c?q.j:q.j===c?q.i:-1;if(j<0||seen.has(j)||Math.abs(cr(S[j].u,o.u))>0.05)return;seen.add(j);q.p=[q.p[0]+off[0],q.p[1]+off[1]];qq.push(j)})}};
 const mkPort=(i,en,T,dir,y,d)=>{const o=S[i];   // T：口の先、dir：口から外向き、o の端 en を口につなぐ
  const far=en==="a"?o.b:o.a,len=dt(sub(far,T),dir);if(len<20)return;
  if(len<=260){if(en==="a")o.a=T.slice();else o.b=T.slice();reL(o);o.fh=y;o.pd=d;o.pe=en;if(d&&Math.abs(d-o.w)>10)o.tp={e:en,w:d};usedE.add(i+en);o.cn++;return}
  const LP=160,X=[T[0]+dir[0]*LP,T[1]+dir[1]*LP],tx=dt(sub(X,o.a),o.u),Xo=[o.a[0]+o.u[0]*tx,o.a[1]+o.u[1]*tx];
  if(en==="a")o.a=Xo;else o.b=Xo;reL(o);
  const N={a:T.slice(),b:Xo.slice(),h:y,sh:o.sh,w:o.w,hh:o.hh,sub:o.sub,lay:o.lay,L:0,u:dir.slice(),id:0,cn:1,fh:y,pd:d,pe:"a"};reL(N);if(d&&Math.abs(d-o.w)>10)N.tp={e:"a",w:d};
  S.push(N);par.push(S.length-1);const n=S.length-1;usedE.add(n+"a");addLink(n,"b",i,en,Xo)};
 EQ.forEach(e=>{
  if(e.P&&e.P.length){e.P.forEach(pt=>{let best=null,bd=300;
    S.forEach((o,i)=>{if(Math.abs(cr(o.u,pt.u))>0.3)return;["a","b"].forEach(en=>{if(usedE.has(i+en))return;const p=o[en],v=sub([pt.x,pt.z],p),lat=Math.abs(cr(o.u,v)),al=Math.abs(dt(v,o.u));
     if(al<bd&&lat<Math.max(80,o.w*0.7)){bd=al;best={i,en}}})});
    if(!best)return;const o=S[best.i],t=dt(sub([pt.x,pt.z],o.a),o.u),pj=[o.a[0]+o.u[0]*t,o.a[1]+o.u[1]*t];slide(best.i,[pt.x-pj[0],pt.z-pj[1]]);mkPort(best.i,best.en,[pt.x,pt.z],pt.u,pt.y,pt.d)});return}
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
 const sameNet=(A,B)=>!A.dead&&!B.dead&&A.lay===B.lay||!A.dead&&!B.dead&&(ES&&((lowD(A)&&B.sub===1)||(A.sub===1&&lowD(B))));
 const cand=[];for(let i=0;i<S.length;i++)for(let j=i+1;j<S.length;j++){if(!sameNet(S[i],S[j]))continue;const r=geo(S[i],S[j]);if(r)cand.push({i,j,g:r.g})}
 cand.sort((p,q)=>p.g-q.g);
 cand.forEach(({i,j})=>{const A=S[i],B=S[j];A.u=[(A.b[0]-A.a[0])/A.L,(A.b[1]-A.a[1])/A.L];B.u=[(B.b[0]-B.a[0])/B.L,(B.b[1]-B.a[1])/B.L];const r=geo(A,B);if(!r)return;
  const ea=r.endA?i+r.ka:null,eb=r.endB?j+r.kb:null;if(LBK&&((ea&&usedE.has(ea))||(eb&&usedE.has(eb))))return;
  const X=r.X;
  if(r.endA){if(r.ka==="a")A.a=[X[0],X[1]];else A.b=[X[0],X[1]];usedE.add(ea)}
  if(r.endB){if(r.kb==="a")B.a=[X[0],X[1]];else B.b=[X[0],X[1]];usedE.add(eb)}
  [A,B].forEach(o=>{o.L=Math.hypot(o.b[0]-o.a[0],o.b[1]-o.a[1]);o.cn++});un(i,j);J.push({p:X,i,j,el:r.endA&&r.endB})});
 /* ③ 高さ：図面の文字のあるダクトはその高さ。文字の無いダクトは、つながりをたどって一番近い文字の高さ（口の管は口の高さのまま）。
    つながりの中に文字が無ければ、口の高さ → 無ければ多い方の高さ */
 const adj=S.map(()=>[]),adjT=S.map(()=>[]);J.forEach(q=>{adj[q.i].push(q.j);adj[q.j].push(q.i);adjT[q.i].push([q.j,0.4]);adjT[q.j].push([q.i,0.4])});LKs.forEach(q=>{adj[q.i].push(q.j);adj[q.j].push(q.i);adjT[q.i].push([q.j,0.15]);adjT[q.j].push([q.i,0.15])});
 const grp={};S.forEach((o,i)=>{const r=fd(i);(grp[r]=grp[r]||[]).push(i)});
 const CS=ES&&LB&&Array.isArray(LB.cs)?LB.cs:[],cAt=new Set();if(CS.length)J.forEach(q=>{const w=Math.max(S[q.i].w,S[q.j].w,60);if(CS.some(c=>Math.hypot(c.x-q.p[0],c.z-q.p[1])<w))cAt.add(Math.min(q.i,q.j)+"|"+Math.max(q.i,q.j))});
 const ok1g=(i,j)=>!CS.length||!cAt.has(Math.min(i,j)+"|"+Math.max(i,j));
 Object.values(grp).forEach(G=>{let src=G.filter(i=>S[i].lh&&!S[i].fh).map(i=>[i,S[i].lh]);if(!src.length)src=G.filter(i=>S[i].fh).map(i=>[i,S[i].fh]);
  if(!src.length){const v={},G2=G.some(i=>!lowD(S[i]))?G.filter(i=>!lowD(S[i])):G;G2.forEach(i=>{const hk=Math.round(S[i].h/10)*10;v[hk]=(v[hk]||0)+S[i].L});const hb=+Object.keys(v).sort((a,b)=>v[b]-v[a])[0];G.forEach(i=>S[i].h=hb);return}
  const seen=new Map(),qq=[];src.forEach(([i,h])=>{if(!seen.has(i)){seen.set(i,h);qq.push(i)}});
  /* 衛生：たて管の丸の所のつながりは、先に丸を越えずに広げてから、残った物だけ越える */
  const ok1=ok1g;
  while(qq.length){const i=qq.shift();adj[i].forEach(j=>{if(seen.has(j)||!ok1(i,j))return;seen.set(j,seen.get(i));qq.push(j)})}
  if(CS.length){[...seen.keys()].forEach(i=>qq.push(i));while(qq.length){const i=qq.shift();adj[i].forEach(j=>{if(seen.has(j))return;seen.set(j,seen.get(i));qq.push(j)})}}
  G.forEach(i=>{const o=S[i];if(o.fh)o.h=o.fh;else if(o.lh)o.h=o.lh;else if(seen.has(i))o.h=seen.get(i)})});
 /* 衛生：文字の無い短いかけら（継手・丸の十字のあまり）は、つながっている長い管の高さにそろえる（変なたて管を作らない） */
 if(ES)S.forEach((o,i)=>{if(o.lh||o.fh||o.L>=Math.max(3*o.w,250))return;let b=null;adj[i].forEach(j=>{const c=S[j];if(c.sub===o.sub&&c.L>o.L&&(!b||c.L>b.L))b=c});if(b)o.h=b.h});
 /* 衛生：太さは図面の文字（25A・100A など）を、つながりをたどって文字の無い管にも（途中で太さが変わらないように）。
    文字が1つも無いつながりは、近い規格の外径にそろえる */
 const ODS=[21.7,27.2,34,42.7,48.6,60.5,76.3,89.1,114.3,139.8,165.2,216.3];
 if(ES){const sq=new Map(),qq=[];S.forEach((o,i)=>{if(o.lsz){sq.set(i,o.lsz.a);qq.push(i)}});
  while(qq.length){const i=qq.shift();adj[i].forEach(j=>{if(sq.has(j)||S[j].lsz||S[j].sub!==S[i].sub)return;sq.set(j,sq.get(i));qq.push(j)})}
  const dLB=(LB||[]).filter(l=>/ドレン|ﾄﾞﾚﾝ|DRAIN|DRN/i.test(l.lay)&&!/#下$/.test(l.lay));
  S.forEach((o,i)=>{o.sh=0;if(sq.has(i)){o.w=o.hh=sq.get(i);return}if(lowD(o)){let b=null,bd=1e9;dLB.forEach(l=>{if(!l.sz)return;const d=Math.hypot(l.x-o.a[0],l.z-o.a[1]);if(d<bd){bd=d;b=l}});if(b){o.w=o.hh=b.sz.a;return}}const v=ODS.reduce((p,q)=>Math.abs(q-o.w)<Math.abs(p-o.w)?q:p,ODS[0]);o.w=o.hh=v})}
 /* 衛生：空調のドレンが汚水・排水に落ちる所（図面では丸＝たて管）。ドレンの端の近く（40cm）に汚水があれば、
    ドレンの高さから汚水の高さまでたて管を下ろし、汚水の管につなぐ（合流） */
 const DRV=RSV.filter(r=>S[r.i]&&!S[r.i].dead);
 /* 太さ：文字の無いダクトは、つながっている文字のあるダクトの太さに（曲がりの先は4割、一直線に続く物は1.5割までのちがい。それ以上＝箱・チャンバーはそのまま） */
 if(!ES){const seen=new Map(),qq=[];S.forEach((o,i)=>{if(o.lsz){seen.set(i,o);qq.push(i)}});
  while(qq.length){const i=qq.shift(),m=seen.get(i);adjT[i].forEach(([j,tl])=>{if(seen.has(j))return;const o=S[j];if(o.lsz||o.fh||o.sh!==m.sh||Math.abs(o.w-m.w)>tl*Math.max(o.w,m.w))return;o.w=m.w;o.hh=m.hh;seen.set(j,m);qq.push(j)})}}
 /* 太さをそろえる：文字の無い丸ダクトは、近い規格の太さ（100・125・150・175・200・250…）に。
    一直線に続く物（つなぎ目でつながる物）は、文字のある方・長い方の太さにそろえる（途中で太くなったり細くなったりしない） */
 if(DU){const STD=[75,100,125,150,175,200,225,250,275,300,350,400,450,500,550,600,650,700,750,800,900,1000];
  S.forEach(o=>{if(o.sh!==0||o.lsz||o.pd)return;const v=STD.reduce((p,q)=>Math.abs(q-o.w)<Math.abs(p-o.w)?q:p,STD[0]);if(Math.abs(v-o.w)<=0.2*v)o.w=o.hh=v});
  const pa=S.map((_,i)=>i),f2=i=>pa[i]===i?i:(pa[i]=f2(pa[i]));LKs.forEach(q=>{const A=S[q.i],B=S[q.j];if(A&&B&&A.sh===0&&B.sh===0&&!A.pd&&!B.pd&&Math.abs(A.w-B.w)<=0.35*Math.max(A.w,B.w))pa[f2(q.i)]=f2(q.j)});
  const run={};S.forEach((o,i)=>{if(o.sh!==0||o.pd)return;const r=f2(i),c=run[r]||(run[r]={lab:null,ws:{}});if(o.lsz)c.lab=o.lsz.a;c.ws[o.w]=(c.ws[o.w]||0)+o.L});
  S.forEach((o,i)=>{if(o.sh!==0||o.pd||o.lsz)return;const c=run[f2(i)];if(!c)return;const w=c.lab||+Object.keys(c.ws).sort((p,q)=>c.ws[q]-c.ws[p])[0];if(w)o.w=o.hh=w})}
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
 /* 図面に太さの文字（150φ など）がある時は、図面の太さのまま。口の所の短い管だけ、口の太さへ細くする（レジューサー） */
 const lab={};S.forEach((o,i)=>{if(o.lsz)lab[fd(i)]=1});
 S.forEach((o,i)=>{if(!o.pd||o.sh!==0||!lab[fd(i)])return;const nb=adjT[i].map(([j])=>S[j]).find(q=>q.sh===0&&!q.pd),w0=nb?(nb.lsz?nb.lsz.a:nb.w):o.w;o.w=o.hh=w0;o.tp=Math.abs(o.pd-w0)>10?{e:o.pe||"a",w:o.pd}:null;o.pd=0});
 S.forEach((o,i)=>{if(!o.pd||o.sh!==0)return;const nb=adjT[i].map(([j])=>S[j]).find(q=>q.sh===0&&!q.pd),w0=nb?(nb.lsz?nb.lsz.a:nb.w):o.w,d=o.pd;/* 続くダクトの太さ（図面の文字）を基準に */o.tp=null;o.w=o.hh=d;const seen=new Set([i]),qq=[i];
  while(qq.length){const c=qq.shift();adjT[c].forEach(([j])=>{if(seen.has(j))return;seen.add(j);const q=S[j];if(q.sh!==0||q.pd)return;
   if(Math.abs(q.w-w0)<=0.15*w0){q.w=q.hh=d;qq.push(j)}else if(!q.lsz)qq.push(j)})}});
 /* ⑤ 高さのちがうつなぎ目（曲がり・一直線）：その場所で上げ下げする。丸い物は「曲がり → たて管 → 曲がり」、角は たての箱
    ・ほんの少し（太さの1/4 以下）しかちがわない時は、口の管をダクトの高さに合わせるだけ */
 const VJ=[],VS=[];
 J.filter(q=>q.el).concat(LKs.map(q=>Object.assign(q,{lin:1}))).forEach(q=>{const A=S[q.i],B=S[q.j];if(!keep[q.i]||!keep[q.j]||ceilD(A)||ceilD(B))return;
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
 const R0=Math.round,outS=[],outJ=[];
 S.forEach((o,i)=>{if(ceilD(o))o.hide=1});
 /* 衛生：ドレンのたて管（天井のドレンの高さ → 床下のドレンの高さ） */
 DRV.forEach(({i,p})=>{const o=S[i];if(!keep[i])return;let top=null,bd=1e9;S.forEach((c,j)=>{if(c.sub!==4||lowD(c)||c.dead||!keep[j])return;const v=sub(p,c.a),t=Math.max(0,Math.min(c.L,dt(v,c.u))),d=Math.hypot(c.a[0]+c.u[0]*t-p[0],c.a[1]+c.u[1]*t-p[1]);if(d<bd){bd=d;top=c.h}});if(bd>600)top=null;
  if(top===null){let b2=1e9;(LB||[]).forEach(l=>{if(!l.h||!/ドレン|ﾄﾞﾚﾝ|DRAIN|DRN/i.test(l.lay)||/#下$/.test(l.lay))return;const d=Math.hypot(l.x-p[0],l.z-p[1]);if(d<b2){b2=d;top=l.h}})}if(top===null)top=o.h+2500;if(Math.abs(top-o.h)<5)return;const w=o.w;
  outS.push([R0(p[0]),R0(p[1]),R0(p[0]),R0(p[1]),R0(top),0,R0(w),R0(w),4,R0(o.h)]);
  outJ.push([R0(p[0]),R0(p[1]),R0(top),0,R0(w*1.15),R0(w*1.15),4,0,0]);outJ.push([R0(p[0]),R0(p[1]),R0(o.h),0,R0(w*1.15),R0(w*1.15),4,0,0])});
S.forEach((o,i)=>{if(!keep[i]||o.L<5||o.hide)return;let a=o.a,b=o.b,w2=null;
  if(o.tp){if(o.tp.e==="a"){a=o.b;b=o.a}w2=o.tp.w}
  const row=[R0(a[0]),R0(a[1]),R0(b[0]),R0(b[1]),R0(o.h),o.sh,R0(o.w),R0(o.hh),o.sub];if(w2)row.push(R0(o.h),R0(w2));outS.push(row)});
 VS.forEach(([P,h1,h2,sh,w,hh,sb])=>outS.push([R0(P[0]),R0(P[1]),R0(P[0]),R0(P[1]),R0(h1),sh,R0(w),R0(hh),sb,R0(h2)]));
 const f4=x=>+(+x).toFixed(4);
 VJ.forEach(([P,h,w,sb,a,b,r])=>{const A3=a.length===2&&b.length===2&&b[0]===0&&Math.abs(b[1])===1;   // a：横の向き、b：[0,±1]＝上下
  outJ.push([R0(P[0]),R0(P[1]),R0(h),0,R0(w),R0(w),sb,1,f4(a[0]),f4(a[1]),0,0,R0(r),0,f4(b[1])])});
 J.forEach(q=>{const A=S[q.i],B=S[q.j];if(!keep[q.i]||!keep[q.j]||q.jog||A.hide||B.hide)return;const w=Math.round(Math.max(A.w,B.w));
  if(q.el){outJ.push([R0(q.p[0]),R0(q.p[1]),R0(A.h),0,w,w,A.sub,1,f4(q.ua[0]),f4(q.ua[1]),f4(q.ub[0]),f4(q.ub[1]),R0(q.tl)]);return}
  if(outJ.some(o=>!o[7]&&Math.hypot(o[0]-q.p[0],o[1]-q.p[1])<w*0.6))return;
  /* 角ダクトの曲がりは、角の箱をダクトの向きにそろえる */
  const ang=A.sh===1?Math.atan2(A.u[0],A.u[1]):0;
  /* 衛生の分岐：端が分かれ目にある方＝枝管、まん中に当たる方＝本管。直角＝チーズ（1）、斜め＝Y（45°合流・2）。[9]種類 [10,11]本管の向き [12,13]枝の向き [14]本管の太さ [15]枝の太さ */
  let ex=[];if(ES&&!A.sh&&!B.sh){const dE=o=>Math.min(Math.hypot(o.a[0]-q.p[0],o.a[1]-q.p[1]),Math.hypot(o.b[0]-q.p[0],o.b[1]-q.p[1])),bA=dE(A)<=dE(B),Br=bA?A:B,Mn=bA?B:A;
   const far=Math.hypot(Br.a[0]-q.p[0],Br.a[1]-q.p[1])>Math.hypot(Br.b[0]-q.p[0],Br.b[1]-q.p[1])?Br.a:Br.b,bl=Math.hypot(far[0]-q.p[0],far[1]-q.p[1])||1,bu=[(far[0]-q.p[0])/bl,(far[1]-q.p[1])/bl];
   const ml=Math.hypot(Mn.b[0]-Mn.a[0],Mn.b[1]-Mn.a[1])||1,mu=[(Mn.b[0]-Mn.a[0])/ml,(Mn.b[1]-Mn.a[1])/ml],c=Math.abs(mu[0]*bu[0]+mu[1]*bu[1]);
   if(c<0.95)ex=[c<0.35?1:2,f4(mu[0]),f4(mu[1]),f4(bu[0]),f4(bu[1]),R0(Mn.w),R0(Br.w)]}
  outJ.push([R0(q.p[0]),R0(q.p[1]),R0(A.h),A.sh,w,R0(Math.max(A.hh,B.hh)),A.sub,0,f4(ang),...ex])});
 return{S:outS,J:outJ}}
/* ===== 衛生の仕上げ（S：管 [x1,z1,x2,z2,h,sh,w,hh,sub,h2,w2,印]・J：継手）=====
   ① 空調ドレン（図面の・sub4）の床下（FL±0より下）は衛生の仕事 → 衛生の排水（sub1）にする。床をまたぐたて管は床で分ける（床から上は空調）
   ② 床下の汚水・排水の管の、どこにもつながっていない端＝器具（便器・流し・洗面など）への立ち上がり → 床から100mm出す（印 "fl"）
   ③（②の前にする）汚水・排水・通気の管の、どこにもつながっていない端が、平面で「もっと低い汚水・排水の管」の上にある所
      （図面のたて管の丸＝下の本管にチーズで合流）→ そこで本管の高さまで下ろして、本管に上から入るチーズ（J[16]=1 枝が上向き）。
      汚水は上流から必ず下り勾配で流れてくるので、本管より高い所から来た物は上から合流する */
function dlEisei(S,J,CS){
 const add=[];S.forEach(s=>{if(s[8]!==4)return;const h1=s[4],h2=typeof s[9]==="number"?s[9]:h1;
  if(Math.max(h1,h2)<=0){s[8]=1;return}
  if(Math.min(h1,h2)<0&&s[0]===s[2]&&s[1]===s[3]){const lo=Math.min(h1,h2),hi=Math.max(h1,h2);s[4]=0;s[9]=hi;add.push([s[0],s[1],s[2],s[3],lo,s[5],s[6],s[7],1,0])}});
 S.push(...add);
 const dS=(x,z,t)=>{const dx=t[2]-t[0],dz=t[3]-t[1],l2=dx*dx+dz*dz;let u=l2?((x-t[0])*dx+(z-t[1])*dz)/l2:0;u=Math.max(0,Math.min(1,u));return Math.hypot(t[0]+dx*u-x,t[1]+dz*u-z)};
 const hz=t=>!(t[0]===t[2]&&t[1]===t[3]),hEnd=(t,e)=>e?(typeof t[9]==="number"?t[9]:t[4]):t[4],gone=new Set();
 const E=(t,e)=>e?[t[2],t[3]]:[t[0],t[1]],setH=(t,e,h)=>{if(typeof t[9]!=="number")t[9]=t[4];if(e)t[9]=h;else t[4]=h};
 /* 管の端を r だけ短くする（曲がりの分）。[向き（端から管の中へ）, 短くした長さ] */
 const cut=(t,e,r)=>{const [x,z]=E(t,e),[ox,oz]=E(t,1-e),L=Math.hypot(ox-x,oz-z);if(L<1)return[[0,0],0];const u=[(ox-x)/L,(oz-z)/L],rr=Math.round(Math.min(r,L*0.45));if(e){t[2]=Math.round(x+u[0]*rr);t[3]=Math.round(z+u[1]*rr)}else{t[0]=Math.round(x+u[0]*rr);t[1]=Math.round(z+u[1]*rr)}return[u,rr]};
 /* 曲がり（エルボ）の継手：a＝横の向き（角から管の中へ）、b＝もう片方の向き [x,上下,z] */
 const elb=(x,z,h,a,b,w,sub,r)=>[x,z,h,0,w,w,sub,1,+a[0].toFixed(4),+a[1].toFixed(4),+b[0].toFixed(4),+b[2].toFixed(4),r,0,b[1]];
 /* ⑤ 通気管の床下と天井の中を1本に：通気の端どうしが平面でほぼ同じ所（30cm以内・図面のたて管の丸）にあって、高さが50cm以上ちがう時は、
    上の管の端を下の端の真上にそろえて、低い方から高い方までたて管を立てる（上下はエルボ）。丸の中の短いかけら（15cm未満）は相手にしない */
 {const V=S.filter(t=>t[8]===2&&hz(t)),used=new Set();
  V.forEach((a,i)=>[0,1].forEach(ea=>{if(used.has(i+":"+ea))return;const pa=E(a,ea),ha=hEnd(a,ea);let best=null,bd=300;
   V.forEach((b,j)=>{if(j===i||Math.hypot(b[2]-b[0],b[3]-b[1])<150)return;[0,1].forEach(eb=>{if(used.has(j+":"+eb))return;const pb=E(b,eb),d=Math.hypot(pb[0]-pa[0],pb[1]-pa[1]);if(d<=bd&&Math.abs(hEnd(b,eb)-ha)>=500){bd=d;best={b,j,eb}}})});
   if(!best)return;used.add(i+":"+ea);used.add(best.j+":"+best.eb);
   let lo={t:a,e:ea},hi={t:best.b,e:best.eb};if(hEnd(hi.t,hi.e)<hEnd(lo.t,lo.e)){const x=lo;lo=hi;hi=x}
   const [x,z]=E(lo.t,lo.e),hL=hEnd(lo.t,lo.e),hH=hEnd(hi.t,hi.e),w=Math.max(lo.t[6],hi.t[6]);
   if(hi.e){hi.t[2]=x;hi.t[3]=z}else{hi.t[0]=x;hi.t[1]=z}
   const r=Math.round(w*1.2),[ul,rl]=cut(lo.t,lo.e,r),[uh,rh]=cut(hi.t,hi.e,r);
   S.push([x,z,x,z,hL+rl,0,w,w,2,hH-rh,w]);J.push(elb(x,z,hL,ul,[0,1,0],w,2,rl),elb(x,z,hH,uh,[0,-1,0],w,2,rh))}))}
 /* ④ 分岐の継手の直し（汚水・排水・通気）：
    ・2本の管の端が同じ点で会うだけ（突き抜ける管が無い）＝曲がり → エルボ（45°の曲がりもエルボ。Y・チーズにしない）
    ・本管が通る所＝チーズ・Y → 継手は本管の高さ。枝は勾配で本管の高さまで下げて入る（継手が本管から浮かない） */
 /* 給水・給湯も、2本の管の端が会うだけ（同じ高さ・突き抜ける管が無い）の所はエルボ（チーズにしない）。本管の高さの直しは汚水・通気だけ */
 J.slice().forEach(q=>{const W0=q[6]===0;if(q[7]||!(q[9]===1||q[9]===2)||q[16]||q[17]||(q[6]!==1&&q[6]!==2&&!W0))return;const p=[q[0],q[1]],tol=Math.max(q[4]*0.6,40),ends=[],thru=[];
  S.forEach(t=>{if(W0?t[8]!==0||(!hz(t)&&Math.hypot(t[0]-p[0],t[1]-p[1])<tol&&thru.push(t)):!hz(t)||(t[8]!==1&&t[8]!==2))return;let en=false;[0,1].forEach(e=>{const [x,z]=E(t,e);if(Math.hypot(x-p[0],z-p[1])<tol){ends.push([t,e]);en=true}});if(!en&&dS(p[0],p[1],t)<tol)thru.push(t)});
  if(ends.length===2&&!thru.length&&(!W0||ends.every(([t,e])=>Math.abs(hEnd(t,e)-q[2])<30))){const [[t1,e1],[t2,e2]]=ends,L1=Math.hypot(t1[2]-t1[0],t1[3]-t1[1]),L2=Math.hypot(t2[2]-t2[0],t2[3]-t2[1]),r=Math.min(0.8*Math.max(t1[6],t2[6]),L1*0.45,L2*0.45);if(r<5)return;
   const [u1,r1]=cut(t1,e1,r),[u2]=cut(t2,e2,r1);J[J.indexOf(q)]=elb(q[0],q[1],q[2],u1,[u2[0],0,u2[1]],q[4],q[6],r1);return}
  if(thru.length&&!W0){const M=thru[0],dx=M[2]-M[0],dz=M[3]-M[1],l2=dx*dx+dz*dz,u=Math.max(0,Math.min(1,((p[0]-M[0])*dx+(p[1]-M[1])*dz)/l2)),mh=Math.round(M[4]+(hEnd(M,1)-M[4])*u);q[2]=mh;
   ends.forEach(([t,e])=>{const he=hEnd(t,e);if(he>mh&&he-mh<600)setH(t,e,mh)})}});
 /* ③ 上から合流（高さの差が本管の太さより小さい時は、勾配で横から入るチーズ） */
 const nE=S.length;for(let i=0;i<nE;i++){const s=S[i];if(gone.has(s)||!hz(s)||(s[8]!==1&&s[8]!==2))continue;
  [0,1].forEach(e=>{if(gone.has(s))return;let x=e?s[2]:s[0],z=e?s[3]:s[1];const h=hEnd(s,e),tol=Math.max(s[6],60);
   if(J.some(q=>Math.hypot(q[0]-x,q[1]-z)<tol&&Math.abs(q[2]-h)<Math.max(30,s[6])))return;   // もう継手がある
   if(S.some((t,j)=>j!==i&&!gone.has(t)&&(t[0]===x&&t[1]===z||t[2]===x&&t[3]===z||Math.hypot(t[0]-x,t[1]-z)<tol&&Math.abs(t[4]-h)<30||Math.hypot(t[2]-x,t[3]-z)<tol&&Math.abs(hEnd(t,1)-h)<30)))return;   // 同じ高さでつながっている
   let best=null,bd=1e9;S.forEach((t,j)=>{if(j===i||gone.has(t)||!hz(t)||t[8]!==1)return;const th=Math.max(t[4],hEnd(t,1));if(th>h-30)return;const T2=Math.max(t[6],s[6],60),d=dS(x,z,t);if(d<T2&&d<bd){bd=d;best=t}});
   if(!best)return;
   /* 本管の真上に沿った短いかけら（図面のたて管の丸の中の継手の線）は使わず、その手前の角（丸の所）で下ろす */
   const ox=e?s[0]:s[2],oz=e?s[1]:s[3],sL=Math.hypot(s[2]-s[0],s[3]-s[1]),T2=Math.max(best[6],s[6],60);
   let side=e;if(sL<Math.max(3*s[6],250)&&dS(ox,oz,best)<T2){const k=J.findIndex(q=>Math.hypot(q[0]-ox,q[1]-oz)<tol&&Math.abs(q[2]-h)<Math.max(30,s[6]));if(k>=0){x=J[k][0];z=J[k][1];J.splice(k,1);gone.add(s);side=null}}   // 角（曲がりの所）で下ろす
   const dx=best[2]-best[0],dz=best[3]-best[1],l2=dx*dx+dz*dz,u=Math.max(0,Math.min(1,((x-best[0])*dx+(z-best[1])*dz)/l2)),px=Math.round(best[0]+dx*u),pz=Math.round(best[1]+dz*u),mh=Math.round(best[4]+(hEnd(best,1)-best[4])*u),l=Math.sqrt(l2),mw=Math.max(best[6],s[6]);
   let pr=null,pe=0;   // 本管の真上まで来る横の管とその端（下ろす所の曲がりのため）
   if(side!==null){if(side){s[2]=px;s[3]=pz}else{s[0]=px;s[1]=pz}pr=s;pe=side}   // 横の管の端を本管の真上に
   else{let t=null,td=2*tol;S.forEach(q=>{if(gone.has(q)||!hz(q)||q===s||q[8]!==s[8])return;const d=Math.min(Math.hypot(q[0]-x,q[1]-z),Math.hypot(q[2]-x,q[3]-z));if(d<td){td=d;t=q}});if(t){if(Math.hypot(t[0]-x,t[1]-z)<Math.hypot(t[2]-x,t[3]-z)){t[0]=px;t[1]=pz;pe=0}else{t[2]=px;t[3]=pz;pe=1}pr=t}}   // 角の手前の管を本管の真上まで
   if(h-mh<best[6]&&side!==null){   // 少しだけ高い：勾配で下げて、横から入るチーズ
    if(side){if(typeof s[9]!=="number")s[9]=s[4];s[9]=mh}else{if(typeof s[9]!=="number")s[9]=s[4];s[4]=mh}
    const fx=side?s[0]:s[2],fz=side?s[1]:s[3],bl=Math.hypot(fx-px,fz-pz)||1;
    J.push([px,pz,mh,0,mw,mw,1,0,0,1,+(dx/l).toFixed(4),+(dz/l).toFixed(4),+((fx-px)/bl).toFixed(4),+((fz-pz)/bl).toFixed(4),best[6],s[6]]);return}
   if(S.some(q=>!hz(q)&&q[8]===s[8]&&Math.hypot(q[0]-px,q[1]-pz)<tol))return;   // もう下ろしてある
   const [ud,rd]=pr?cut(pr,pe,Math.min(0.8*s[6],(h-mh)*0.45)):[[0,0],0];
   S.push([px,pz,px,pz,mh,0,s[6],s[6],s[8],h-rd]);
   J.push(rd?elb(px,pz,h,ud,[0,-1,0],s[6],s[8],rd):[px,pz,h,0,Math.round(s[6]*1.15),Math.round(s[6]*1.15),s[8],0,0]);   // 横 → 下の曲がり（エルボ）
   J.push([px,pz,mh,0,mw,mw,1,0,0,1,+(dx/l).toFixed(4),+(dz/l).toFixed(4),0,0,best[6],s[6],1])})}   // 本管に上から入るチーズ
 for(let i=S.length-1;i>=0;i--)if(gone.has(S[i]))S.splice(i,1);
 /* ② 器具への立ち上がり（汚水・排水・通気の、どこにもつながっていない床下の端）：エルボで曲げて床から100mm。
    つながっている＝継手がある・エルボの口がある・同じ種類の管が近い（給水など別の管が近いだけではつながっていない） */
 const elEnds=q=>[[q[0]+q[8]*q[12],q[1]+q[9]*q[12]],[q[0]+q[10]*q[12],q[1]+q[11]*q[12]]];
 const n=S.length;for(let i=0;i<n;i++){const s=S[i];if((s[8]!==1&&s[8]!==2)||!hz(s))continue;const tol=Math.max(s[6],60);
  [0,1].forEach(e=>{const [x,z]=E(s,e),h=hEnd(s,e);if(h>=0)return;
   if(J.some(q=>q[7]!==1&&Math.hypot(q[0]-x,q[1]-z)<tol))return;
   if(J.some(q=>q[7]===1&&q.length>=13&&elEnds(q).some(([a,b])=>Math.hypot(a-x,b-z)<tol)))return;
   if(S.some((t,j)=>j!==i&&t[8]===s[8]&&dS(x,z,t)<tol))return;
   const [u,r]=cut(s,e,Math.min(0.8*s[6],(100-h)*0.45));
   S.push([x,z,x,z,h+r,0,s[6],s[6],s[8],100,s[6],"fl"]);J.push(r?elb(x,z,h,u,[0,1,0],s[6],s[8],r):[x,z,h,0,s[6],s[6],s[8],0,0])})}
 /* ⑧ たて管の下と横の管が会うだけの所（空調ドレンが床下に下りて横に行く所など）は玉でなくエルボ */
 J.slice().forEach(q=>{if(q[7]===1||q[9]===1||q[9]===2||q[16]||![1,2,4].includes(q[6]))return;const tol=Math.max(q[4],60);
  const V=S.filter(t=>!hz(t)&&Math.hypot(t[0]-q[0],t[1]-q[1])<5&&Math.abs(Math.min(t[4],hEnd(t,1))-q[2])<5),H=[];
  S.forEach(t=>{if(!hz(t)||![1,2,4].includes(t[8]))return;[0,1].forEach(e=>{const [x,z]=E(t,e);if(Math.hypot(x-q[0],z-q[1])<tol&&Math.abs(hEnd(t,e)-q[2])<30)H.push([t,e])})});
  if(V.length!==1||H.length!==1)return;const v=V[0],[t,e]=H[0],vt=Math.max(v[4],hEnd(v,1)),r0=Math.min(0.8*t[6],(vt-q[2])*0.45);if(r0<5)return;
  const [u,r]=cut(t,e,r0);if(!r)return;if(v[4]<=hEnd(v,1))v[4]=q[2]+r;else v[9]=q[2]+r;
  J[J.indexOf(q)]=elb(q[0],q[1],q[2],u,[0,1,0],t[6],t[8],r)})
 /* ⑥ 給水・給湯：たて管（図面の丸）の所まで来ているのに、どこにもつながっていない横の管は、たて管をのばしてつなぐ。
    たて管が通りぬける所はチーズ（本管がたて・[17]=1）、たて管の端はエルボ。管の端が丸を少し越えて描いてある時は丸の所まで */
 const vP=[];S.forEach(t=>{if(t[8]!==0||hz(t))return;const p=vP.find(v=>Math.hypot(v.x-t[0],v.z-t[1])<5);const lo=Math.min(t[4],hEnd(t,1)),hi=Math.max(t[4],hEnd(t,1));if(p){p.lo=Math.min(p.lo,lo);p.hi=Math.max(p.hi,hi);p.w=Math.max(p.w,t[6])}else vP.push({x:t[0],z:t[1],lo,hi,w:t[6]})});
 vP.forEach(v=>{const at=q=>Math.hypot(q[0]-v.x,q[1]-v.z)<5;
  S.slice().forEach(s=>{if(s[8]!==0||!hz(s))return;const w=s[6],tol=Math.max(w,40);if(dS(v.x,v.z,s)>tol)return;
   const e=Math.hypot(s[0]-v.x,s[1]-v.z)<=Math.hypot(s[2]-v.x,s[3]-v.z)?0:1,[ex,ez]=E(s,e);if(Math.hypot(ex-v.x,ez-v.z)>3*w+100)return;
   const h=hEnd(s,e);if(J.some(q=>at(q)&&Math.abs(q[2]-h)<Math.max(30,w)&&(q[17]||q[7]===1&&q.length>=13&&Math.hypot(v.x+q[8]*q[12]-ex,v.z+q[9]*q[12]-ez)<tol)))return;   // もうエルボ・チーズでつながっている
   const [ox,oz]=E(s,1-e),L=Math.hypot(ox-v.x,oz-v.z);if(L<2*w)return;const u=[(ox-v.x)/L,(oz-v.z)/L];
   const EL=J.filter(q=>at(q)&&q[7]===1&&q.length>=13),f4=x=>+x.toFixed(4);
   const tee=(hh,bu,bw)=>J.push([v.x,v.z,Math.round(hh),0,v.w,v.w,0,0,0,1,0,0,f4(bu[0]),f4(bu[1]),v.w,bw,0,1]);
   if(h<v.lo-5||h>v.hi+5){const dn=h<v.lo,eh=dn?v.lo:v.hi,k=EL.findIndex(q=>Math.abs(q[2]-eh)<Math.max(40,2*v.w)&&q[14]===(dn?1:-1));
    const r=Math.round(Math.min(0.8*w,L*0.45,Math.abs(h-eh)*0.45));if(k>=0){const q=EL[k];J.splice(J.indexOf(q),1);tee(q[2],[q[8],q[9]],q[4]);S.push([v.x,v.z,v.x,v.z,q[2],0,v.w,v.w,0,dn?h+r:h-r])}else return;
    if(e){s[2]=Math.round(v.x+u[0]*r);s[3]=Math.round(v.z+u[1]*r)}else{s[0]=Math.round(v.x+u[0]*r);s[1]=Math.round(v.z+u[1]*r)}
    J.push(elb(v.x,v.z,h,u,[0,dn?1:-1,0],w,0,r));if(dn)v.lo=h;else v.hi=h}
   else{if(e){s[2]=v.x;s[3]=v.z}else{s[0]=v.x;s[1]=v.z}tee(h,u,w)}})})
 /* ⑨ 給水・給湯：どこにもつながっていない横の管の端が、ほかの給水の管の途中に当たる所（少し越えて描いてある時も）で、図面に丸がある所はチーズ（高さがちがう時は下の⑦で上下に出す） */
 if(Array.isArray(CS))S.slice().forEach(s=>{if(s[8]!==0||!hz(s))return;const w=s[6],tol=Math.max(w,40);[0,1].forEach(e=>{const [x,z]=E(s,e),[ox,oz]=E(s,1-e);
  if(J.some(q=>Math.hypot(q[0]-x,q[1]-z)<tol+(q[12]||0)))return;if(S.some(t=>t!==s&&t[8]===0&&(Math.hypot(t[0]-x,t[1]-z)<tol||Math.hypot(t[2]-x,t[3]-z)<tol)))return;
  const L=Math.hypot(x-ox,z-oz);if(L<2*w)return;const u=[(x-ox)/L,(z-oz)/L];
  S.some(M=>{if(M===s||M[8]!==0||!hz(M))return false;const mx=M[2]-M[0],mz=M[3]-M[1],ml=Math.hypot(mx,mz),mu=[mx/ml,mz/ml],c=u[0]*mu[1]-u[1]*mu[0];if(Math.abs(c)<0.5)return false;
   const tS=((M[0]-ox)*mu[1]-(M[1]-oz)*mu[0])/c,tM=((M[0]-ox)*u[1]-(M[1]-oz)*u[0])/c;if(tM<M[6]||tM>ml-M[6]||Math.abs(tS-L)>3*w+100||tS<2*w)return false;
   const px=Math.round(ox+u[0]*tS),pz=Math.round(oz+u[1]*tS);if(!CS.some(c=>Math.hypot(c.x-px,c.z-pz)<Math.max(M[6],60)))return false;   // 図面の丸（チーズ・上下の印）がある所だけ（ただ上下で交差している所はつながない）
   const mh=Math.round(M[4]+(hEnd(M,1)-M[4])*tM/ml);if(e){s[2]=px;s[3]=pz}else{s[0]=px;s[1]=pz}
   J.push([px,pz,mh,0,M[6],M[6],0,0,0,1,+mu[0].toFixed(4),+mu[1].toFixed(4),+(-u[0]).toFixed(4),+(-u[1]).toFixed(4),M[6],w]);return true})})});
 /* ⑦ 給水・給湯：チーズの枝の高さが本管とちがう時（図面の丸）は、チーズから上下に出して、エルボで枝へ（[16]：1＝上へ、-1＝下へ） */
 J.slice().forEach(q=>{if(q[6]!==0||q[7]||q[9]!==1||q[16]||q[17])return;const tol=Math.max(q[4],40);
  S.slice().forEach(s=>{if(s[8]!==0||!hz(s))return;[0,1].forEach(e=>{const [x,z]=E(s,e),h=hEnd(s,e),w=s[6];if(Math.hypot(x-q[0],z-q[1])>tol||Math.abs(h-q[2])<Math.max(30,w))return;
   const [ox,oz]=E(s,1-e),L=Math.hypot(ox-q[0],oz-q[1]);if(L<2*w)return;const u=[(ox-q[0])/L,(oz-q[1])/L],dn=h<q[2],r=Math.round(Math.min(0.8*w,L*0.45,Math.abs(h-q[2])*0.45));
   q[12]=+u[0].toFixed(4);q[13]=+u[1].toFixed(4);q[16]=dn?-1:1;if(e){s[2]=Math.round(q[0]+u[0]*r);s[3]=Math.round(q[1]+u[1]*r)}else{s[0]=Math.round(q[0]+u[0]*r);s[1]=Math.round(q[1]+u[1]*r)}
   S.push([q[0],q[1],q[0],q[1],q[2],0,w,w,0,dn?h+r:h-r]);J.push(elb(q[0],q[1],h,u,[0,dn?1:-1,0],w,0,r))})})})}
/* ===== 図面の配管・ダクトを3D用に取り出す（冷媒・ドレン・ダクト・衛生）=====
   ・図面に「平面図」「天井伏図」など何枚も描いてある時は、通り芯の記号（X1・Y2…）で図をわけ、原点のある図に合わせる
   ・原点のある図に無い種類（例：衛生配管は平面図だけ）は、ほかの図から通り芯でずらして持ってくる
   ・高さ：同じ種類の近くの「FL+3200」などの文字。無ければ天井の少し下（ダクトは天井の上） */
const DL_KINDS=[["duct","ダクト"],["eisei","衛生"]];
/* 読み方の版：衛生・ダクトの読み方を直したら1つ上げる（図面の画面で前の図面を開いた時、古い版で作った3Dは自動で読み直す） */
const DL_VER=4;window.DL_VER=DL_VER;
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
 const by={duct:[],eisei:[]};(P.segAll||P.segs).forEach(s=>{let k=segCat(s);if(!k)return;if(s[5]===undefined&&Math.hypot(s[2]-s[0],s[3]-s[1])*P.mmpp>4500)return;   // PDF：とても長い色の線（延焼ラインなど）は配管ではない
const k0=k;if(k==='drain'&&P.dxf&&s[5]!==undefined)k='eisei';if(!by[k])return;if(P.dxf&&!dxfVisible(P)(s[5]))return;const v=main?own((s[0]+s[2])/2,(s[1]+s[3])/2):null;if(main&&!v)return;by[k].push({s,v,lay:s[5],c:s[6]===1})});
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
  /* 空調ドレンが衛生の図（汚水がたくさん描いてある図）にも描いてある時：そっちのドレンは床下で汚水に合流する所なので、別の線（「#下」）として持ってくる */
  const RS=[];if(k==="eisei"&&main){const sv={};L0.forEach(q=>{if(/汚水|排水/.test(q.lay||"")&&q.v)sv[V.indexOf(q.v)]=(sv[V.indexOf(q.v)]||0)+1});const vi=+Object.keys(sv).sort((a,b)=>sv[b]-sv[a])[0],ev=V[vi];
   if(ev)Object.values(gs).forEach(G=>{if(!/ドレン|ﾄﾞﾚﾝ|DRAIN|DRN/i.test(G[0].lay||""))return;const lv=layV[G[0].lay];if(!lv||lv.v===ev)return;const d=off(ev);if(!d)return;
    L=L.concat(G.filter(q=>q.v===ev).map(q=>({s:[q.s[0]+d[0],q.s[1]+d[1],q.s[2]+d[0],q.s[3]+d[1]],v:main,moved:1,o:q.s,lay:q.lay+"#下",c:q.c})));
    /* たて管の丸（ドレンの線の上の小さい円）：ここでドレンが天井から下りてくる */
    (P.circ||[]).forEach(c=>{if(c.lay!==G[0].lay||c.x<ev.b[0]||c.x>ev.b[2]||c.y<ev.b[1]||c.y>ev.b[3])return;const rm=c.r*P.mmpp;if(rm<15||rm>200)return;const w=btWx([c.x+d[0],c.y+d[1]]);if(!RS.some(r=>Math.hypot(r.x-w[0],r.z-w[1])<60))RS.push({x:w[0],z:w[1]})})})}
  /* 通気管：床の図（床下）と天井の図（天井の中）に分けて描いてある1本の管。選んだ図のほかの図の通気も「#他」として持ってくる（高さは元の図の文字で）。つなぐのは dlEisei ⑤ */
  if(k==="eisei"&&main)Object.values(gs).forEach(G=>{if(!/通気/.test(G[0].lay||""))return;const lv=layV[G[0].lay];if(!lv)return;
   [...new Set(G.map(q=>q.v))].forEach(v=>{if(!v||v===lv.v)return;const d=off(v);if(!d)return;L=L.concat(G.filter(q=>q.v===v).map(q=>v===main?{...q,lay:q.lay+"#他"}:{s:[q.s[0]+d[0],q.s[1]+d[1],q.s[2]+d[0],q.s[3]+d[1]],v:main,moved:1,o:q.s,lay:q.lay+"#他",c:q.c}))})});
  const near=(x,y,src)=>{let b=null,bd=2500/P.mmpp;FLt.forEach(t=>{if(t.k&&t.k!==k)return;if(!t.k&&P.dxf)return;const d=Math.hypot(t.x-x,t.y-y);if(d<bd){bd=d;b=t}});return b};
  /* 大きさの文字：「200φ」＝丸、「300×150」＝角（幅×高さ）。近く（1.5m）の同じ種類の文字 */
  const SZ=(P.textsAll||P.texts||[]).map(t=>{const z=String(t.s).replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)).replace(/[Φø]/g,"φ");let m=z.match(/(\d{2,4})\s*[×xX*＊]\s*(\d{2,4})/);if(m&&!/H-|C-|下端/.test(z))return{x:t.x,y:t.y,r:0,a:+m[1],b:+m[2],k:txtCat(t)};m=z.match(/(\d{2,4})\s*φ/);return m?{x:t.x,y:t.y,r:1,a:+m[1],k:txtCat(t)}:null}).filter(Boolean);
  const nearSz=(x,y)=>{let b=null,bd=1500/P.mmpp;SZ.forEach(t=>{if(P.dxf&&t.k&&t.k!==k)return;const d=Math.hypot(t.x-x,t.y-y);if(d<bd){bd=d;b=t}});return b};
  const sub=lay=>/ドレン|ﾄﾞﾚﾝ|DRAIN|DRN/i.test(lay||"")?4:/給水|給湯|上水|中水/.test(lay||"")?0:/汚水|排水|雑排|雨水/.test(lay||"")?1:/通気/.test(lay||"")?2:3;
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
  Object.values(grp).forEach(G=>{if(G.length<2&&!(k==="eisei"&&G[0].q.c))return;const hasC=G.some(it=>it.q.c);G.forEach(it=>{if(it.q.c)it.used=1});const ux=G[0].ux,uy=G[0].uy,xy=(t,d)=>[t*ux-d*uy,t*uy+d*ux];
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
   /* 衛生：中心線（一点鎖線）が描いてある管は、中心線をそのまま管の芯にする（外形の線の組は継手・フランジで切れて形がくずれるので）。
      太さは、その中心線をはさむ外形の線の組から。中心線の無い所だけ、今まで通り外形の線の組を使う。
      たて管の丸の上の十字（短い中心線）は管ではないので使わない */
   if(k==="eisei"&&hasC){const C=G.filter(it=>it.q.c).sort((a,b)=>a.d-b.d||a.lo-b.lo),runs=[],dT=15/mm,gT=60/mm;
    C.forEach(it=>{const r=runs.find(r=>Math.abs(r.d-it.d)<dT&&it.lo<=r.hi+gT&&it.hi>=r.lo-gT);if(r){r.lo=Math.min(r.lo,it.lo);r.hi=Math.max(r.hi,it.hi);r.n++;r.d=(r.d*(r.n-1)+it.d)/r.n}else runs.push({d:it.d,lo:it.lo,hi:it.hi,n:1})});
    const mv=G[0].q.o?[G[0].q.s[0]-G[0].q.o[0],G[0].q.s[1]-G[0].q.o[1]]:[0,0],CI=(P.circ||[]).filter(c=>c.lay===String(G[0].q.lay||"").replace(/#下$/,"")).map(c=>({x:c.x+mv[0],y:c.y+mv[1],r:c.r}));
    runs.forEach(r=>{const m=xy((r.lo+r.hi)/2,r.d),len=r.hi-r.lo;if(CI.some(c=>Math.hypot(c.x-m[0],c.y-m[1])<Math.max(c.r*1.2,8/mm)&&len<Math.max(c.r*5,300/mm)))return;
     let best=null,bo=0;M.forEach(p=>{const pc=(p.dl+p.dr)/2,pw=p.dr-p.dl;if(Math.abs(pc-r.d)>Math.max(pw*0.35,10/mm))return;const ov=Math.min(p.tb,r.hi)-Math.max(p.ta,r.lo);if(ov>0){p.cov=(p.cov||0)+ov;if(ov>bo){bo=ov;best=p}}});
     const hw=best?(best.dr-best.dl)/2:25/mm;r.p={dl:r.d-hw,dr:r.d+hw,ta:r.lo,tb:r.hi,tw:best&&best.tw,cen:1}});
    for(let i=M.length-1;i>=0;i--)if((M[i].cov||0)>0.4*(M[i].tb-M[i].ta))M.splice(i,1);
    runs.forEach(r=>{if(r.p)M.push(r.p)})}
   /* 短すぎる物（器具・掃除口などの記号の線）は捨てる：長さが太さの（ダクト0.8倍・配管2倍）未満、または10cm未満 */
   M.forEach(p=>{const lm=(p.tb-p.ta)*mm,wm0=(p.dr-p.dl)*mm;if(k==="duct"?(lm<40||lm<wm0*0.3):(lm<40||(!p.cen&&lm<wm0*0.8)))return;   /* 短い物も一度残して、あとでつなげてから捨てる */const dc=(p.dl+p.dr)/2,p1=xy(p.ta,dc),p2=xy(p.tb,dc),wm=(p.dr-p.dl)*mm,cm=xy((p.ta+p.tb)/2,dc);
    const src=G[0].q.o?null:cm;   // ほかの図から持ってきた物は、高さの文字を元の図で探す
    const so=G[0].q.o?[cm[0]+(G[0].q.o[0]-G[0].q.s[0]),cm[1]+(G[0].q.o[1]-G[0].q.s[1])]:cm;
    const tz=p.tw&&p.tw.t;let sh=k==="duct"?(wm<=330?0:1):0,hh=wm;
    if(k==="duct"&&tz){if(tz.r)sh=Math.abs(wm-tz.a)>tz.a*0.35&&wm>330?1:0;else{sh=1;hh=Math.abs(tz.b-wm)<Math.abs(tz.a-wm)?tz.a:tz.b}}
    if(k==="duct"&&sh===1&&(!tz||tz.r))hh=Math.min(wm,tz&&tz.r?tz.a+100:300);
    const a=W(p1[0],p1[1]),b=W(p2[0],p2[1]);solids.push([Math.round(a[0]),Math.round(a[1]),Math.round(b[0]),Math.round(b[1]),Math.round(hAt(so[0],so[1])),sh,Math.round(wm),Math.round(hh),sub(G[0].q.lay),G[0].q.lay||""])})});
  /* 組にならなかった線（曲がり・継手・記号など）は細い線で */
  items.forEach(m=>{if(m.used||m.l*mm<40)return;const s=m.q.s,src=m.q.o||s,a=W(s[0],s[1]),b=W(s[2],s[3]);lines.push([Math.round(a[0]),Math.round(a[1]),Math.round(b[0]),Math.round(b[1]),Math.round(hAt((src[0]+src[2])/2,(src[1]+src[3])/2))])});
  /* 機器（登録のある換気機器）の外形とダクト口（向き・高さ）。ロスナイ：左 EA・OA、右 RA・SA、奥行の端から L と L＋K、高さは下から 94／289 */
  const EQ=[];try{(st.bld||[]).forEach(o=>{if(o.k!=="eq")return;const th=-(o.r||0)*Math.PI/180,c=Math.cos(th),sn=Math.sin(th),e={x:o.x,z:o.z,w:o.w,d:o.d,c,s:sn,P:[]};
   const V=typeof VENTM!=="undefined"&&VENTM[o.m];if(V){const tip=(V.A-14)/2+V.J+7;[[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([sx,sz])=>{const lx=sx*tip,lz=-V.B/2+V.L+(sz>0?V.K:0);   /* 奥行の端から L・L＋K（メーカー外形図。真ん中から ±K/2 ではない） */
    e.P.push({x:o.x+lx*c+lz*sn,z:o.z-lx*sn+lz*c,y:Math.round(o.y+V.C*94/289),u:[c*sx,-sn*sx],d:V.d||0})})}EQ.push(e)})}catch(err){}
  /* ダクトの文字：「OA」「150φ」「FL+3900」のように別々の文字が横に並んでいるのを、1つにまとめる（同じ画層・同じ向き・70cm 以内） */
  const AOD={15:21.7,20:27.2,25:34,32:42.7,40:48.6,50:60.5,65:76.3,75:89.1,80:89.1,100:114.3,125:139.8,150:165.2,200:216.3};
  const LB=[];if((k==="duct"||k==="eisei")&&P.dxf){const TT=(P.textsAll||[]).filter(t=>{const c=dxfCat(t.lay);return c===k||(k==="eisei"&&c==="drain")});const nz=t=>String(t.s).replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)).replace(/[＋]/g,"+").replace(/[Φø]/g,"φ").trim();
   const used=new Set(),toW=(t,x,y)=>{const lv=layV[t.lay];if(main){if(!lv)return null;const v=lv.v;if(v===main){if(own(x,y)!==main)return null}else if(!(x>=v.b[0]&&x<=v.b[2]&&y>=v.b[1]&&y<=v.b[3]))return null;x+=lv.d[0];y+=lv.d[1]}return W(x,y)};
   const isH=z=>/FL\s*[+\-]\s*\d{3,4}/.test(z)&&!/下端|上端/.test(z),isA=z=>k==="eisei"&&/^(?:[A-Z]{0,3}\s*)?(\d{2,3})\s*A$/.test(z)&&!!AOD[+z.match(/(\d{2,3})\s*A$/)[1]],isS=z=>isA(z)||/(\d{2,4})\s*φ/.test(z)||/(\d{2,4})\s*[×xX*]\s*(\d{2,4})/.test(z);
   const mk=(seed)=>{const g=[seed];TT.forEach(u=>{if(u===seed||used.has(u)||u.lay!==seed.lay||Math.abs(((u.r||0)-(seed.r||0)+540)%180-0)>4&&Math.abs(((u.r||0)-(seed.r||0)+540)%180-180)>4)return;if(Math.hypot(u.x-seed.x,u.y-seed.y)*mm<700&&(isH(nz(u))||isS(nz(u))))g.push(u)});
    let h=0,sz=null;g.forEach(u=>{const z=nz(u);let m=z.match(/FL\s*([+\-])\s*(\d{3,4})/);if(m&&isH(z)&&!h)h=(m[1]==="-"?-1:1)*+m[2];m=z.match(/(\d{2,4})\s*[×xX*]\s*(\d{2,4})/);if(m&&!sz)sz={r:0,a:+m[1],b:+m[2]};m=z.match(/(\d{2,4})\s*φ/);if(m&&!sz)sz={r:1,a:+m[1]};if(isA(z)&&!sz)sz={r:1,a:AOD[+z.match(/(\d{2,3})\s*A$/)[1]]}});
    g.forEach(u=>used.add(u));const cx=g.reduce((a,u)=>a+u.x,0)/g.length,cy=g.reduce((a,u)=>a+u.y,0)/g.length,p=toW(seed,cx,cy);if(!p)return;
    const rr=(seed.r||0)*Math.PI/180,p2=toW(seed,cx+Math.cos(rr)*20,cy-Math.sin(rr)*20);let u=null;if(p2){const dx=p2[0]-p[0],dz=p2[1]-p[1],l=Math.hypot(dx,dz);if(l>0)u=[dx/l,dz/l]}
    /* 衛生：引出線（文字の下の線＋そこから斜めに出る線）があれば、その先の点（どの管の文字か） */
    let tip=null;if(k==="eisei"){const d=[Math.cos(rr),-Math.sin(rr)],ts=g.map(q=>(q.x-cx)*d[0]+(q.y-cy)*d[1]),t0=Math.min(...ts)-400/mm,t1=Math.max(...ts)+800/mm,SG=(P.segAll||P.segs).filter(q=>q[5]===seed.lay&&q[6]!==1);
     SG.some(q=>{const L=Math.hypot(q[2]-q[0],q[3]-q[1]);if(L*mm<100||Math.abs(((q[2]-q[0])*d[1]-(q[3]-q[1])*d[0])/L)>0.05)return false;const ta=(q[0]-cx)*d[0]+(q[1]-cy)*d[1],tb=(q[2]-cx)*d[0]+(q[3]-cy)*d[1];
      if(Math.max(ta,tb)<t0||Math.min(ta,tb)>t1||Math.abs(((q[0]+q[2])/2-cx)*-d[1]+((q[1]+q[3])/2-cy)*d[0])*mm>250)return false;
      return[[q[0],q[1]],[q[2],q[3]]].some(E=>SG.some(r=>{if(r===q)return false;const L2=Math.hypot(r[2]-r[0],r[3]-r[1]);const sn=Math.abs(((r[2]-r[0])*d[1]-(r[3]-r[1])*d[0])/L2);if(L2*mm<50||L2*mm>2000||sn<0.26||sn>0.97)return false;   // 引出線は斜め（15〜75°）
       const e0=Math.hypot(r[0]-E[0],r[1]-E[1])*mm<5,e1=Math.hypot(r[2]-E[0],r[3]-E[1])*mm<5;if(!e0&&!e1)return false;tip=e0?toW(seed,r[2],r[3]):toW(seed,r[0],r[1]);return!!tip}))})}
    if(h||sz)LB.push({x:p[0],z:p[1],lay:seed.lay,h,sz,u,tip})};
   TT.filter(t=>isH(nz(t))).forEach(t=>{if(!used.has(t))mk(t)});TT.filter(t=>isS(nz(t))).forEach(t=>{if(!used.has(t))mk(t)})
   /* 段差の記号（ダクトの線の半円）の場所 */
   LB.mk=(P.segAll||P.segs).filter(q=>{if(dxfCat(q[5])!=="duct")return false;const dx=q[2]-q[0],dy=q[3]-q[1],l=Math.hypot(dx,dy);if(!l||l*mm>150)return false;return Math.abs(2*dx*dy)/(l*l)>0.3}).map(q=>{const p=toW({lay:q[5]},(q[0]+q[2])/2,(q[1]+q[3])/2);return p?{x:p[0],z:p[1],lay:q[5]}:null}).filter(Boolean)}
  /* 登録のない機械（換気扇など）：口は近くのダクトの所に作る（高さは箱の真ん中） */
  EQ.forEach((e,n)=>{const o=(st.bld||[]).filter(q=>q.k==="eq")[n];if(o&&!e.P.length){e.fan=1;e.py=Math.round((o.y||0)+(o.h||250)/2);e.pd=o.pd||0}});
  LB.rs=RS;
  /* 衛生：たて管の丸（高さが変わる所）。文字の高さをつながりで広げる時、ここは越えない */
  if(k==="eisei")try{LB.cs=(P.circ||[]).filter(c=>dxfCat(c.lay)==="eisei"&&c.r*mm>=15&&c.r*mm<=200).map(c=>{const lv=layV[c.lay];if(main&&!lv)return null;const w=btWx([c.x+(lv?lv.d[0]:0),c.y+(lv?lv.d[1]:0)]);return{x:w[0],z:w[1]}}).filter(Boolean)}catch(e){}
  const T=dlTidy(solids,k,EQ,LB);if(k==="eisei")try{dlEisei(T.S,T.J,LB.cs)}catch(e){console.warn("eisei",e)}out[k]=lines;out[k+"S"]=T.S;out[k+"J"]=T.J});
 /* ベントキャップ（「VC200(FD)」「VC150」など）：文字のいちばん近くの、どこにもつながっていないダクト・配管の端に付ける。
    向きは管の先（外向き）。out.vc＝[x, z, 高さ, 向きx, 向きz, 呼び径, FD付き(1/0), 種類] */
 try{const VT=(P.textsAll||[]).map(t=>{const z=String(t.s).replace(/[０-９Ａ-Ｚ（）]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)).replace(/\s/g,"");const m=z.match(/^VC(\d{2,3})(.*)$/i);if(!m)return null;
   let x=t.x,y=t.y;if(main){const v=own(x,y);if(!v)return null;if(v!==main){const d=off(v);if(!d)return null;x+=d[0];y+=d[1]}}const w=btWx([x,y]);return{x:w[0],z:w[1],n:+m[1],fd:/FD/i.test(m[2])?1:0}}).filter(Boolean);
  if(VT.length){const E=[];["duct","eisei"].forEach(k=>{const S=out[k+"S"]||[],J=out[k+"J"]||[];const hz=S.filter(r=>(r[0]!==r[2]||r[1]!==r[3])&&(k==="duct"||r[8]===2));   // 衛生は通気管だけ
    hz.forEach(r=>{[[0,1,2,3],[2,3,0,1]].forEach(([a,b,c,d])=>{const p=[r[a],r[b]],q=[r[c],r[d]],L=Math.hypot(p[0]-q[0],p[1]-q[1]);if(L<20)return;const t1=Math.max(30,r[6]*0.6),t2=Math.max(60,r[6]*1.2);   // t1：管の端どうし、t2：曲がり・分岐の芯
     const used=S.some(o=>o!==r&&(Math.hypot(o[0]-p[0],o[1]-p[1])<t1||Math.hypot(o[2]-p[0],o[3]-p[1])<t1))||J.some(j=>Math.hypot(j[0]-p[0],j[1]-p[1])<t2&&(j[0]-p[0])*(p[0]-q[0])+(j[1]-p[1])*(p[1]-q[1])>-10*L);   // 曲がりの芯は端の先にあるif(used)return;
     E.push({x:p[0],z:p[1],h:r[4],u:[(p[0]-q[0])/L,(p[1]-q[1])/L],w:r[6],k})})})});
   const taken=new Set();out.vc=[];VT.sort((a,b)=>b.n-a.n).forEach(t=>{let b=null,bd=t.n>=100?3500:1200;E.forEach((e,i)=>{if(taken.has(i))return;if(t.n>=100&&e.k!=="duct")return;const d=Math.hypot(e.x-t.x,e.z-t.z)+Math.abs(e.w-t.n)*3;if(d<bd){bd=d;b=i}});
    if(b===null)return;taken.add(b);const e=E[b];out.vc.push([Math.round(e.x),Math.round(e.z),Math.round(e.h),+e.u[0].toFixed(4),+e.u[1].toFixed(4),t.n,t.fd,e.k])})}}catch(err){console.warn("vc",err)}
 /* ダクトの機器（吹出口・吸込口・換気扇など）：図面の「VHS-200□」「VHS(F)-200□」「VD-20ZVC7」のような機器の文字を、いちばん近くのどこにもつながっていないダクトの端に付ける。
    形は箱（□・× の大きさがあればその大きさ、無ければ 300角）。近くの「150CMH」も一緒に出す。out.eq2＝[x, z, 高さ, 向きx, 向きz, 幅, 奥行, 種類(g＝口・f＝そのほか), 文字, 天井の高さ] */
 try{const nz=s0=>String(s0).replace(/[０-９Ａ-Ｚａ-ｚ（）－×]/g,c=>c==="×"?"×":String.fromCharCode(c.charCodeAt(0)-65248)).replace(/[\s　]/g,"");
  const pos=t=>{let x=t.x,y=t.y;if(main){const v=own(x,y);if(!v)return null;if(v!==main){const d=off(v);if(!d)return null;x+=d[0];y+=d[1]}}const w=btWx([x,y]);return{x:w[0],z:w[1]}};
  const TX=(P.textsAll||[]).map(t=>({t,z:nz(t.s)}));
  const CM=TX.filter(o=>/^\d{2,4}CMH$/i.test(o.z)).map(o=>Object.assign(pos(o.t)||{},{s:o.z})).filter(o=>o.x!==undefined);
  const EQT=TX.map(o=>{const m=o.z.match(/^([A-Z]{1,4}(?:\([A-Z]{1,2}\))?)(-?)(\d{2,4})([A-Z0-9]*)(□|×(\d{2,4}))?$/);if(m)m.splice(2,1,...[]);if(!m||!/-|□|×/.test(o.z)||/^(VC|FL|SA|RA|OA|EA|PL|PLA|PC|PEA|PUZ|PUHY|PKA|SD|CH)$/.test(m[1]))return null;   // VC・高さ・ダクトの種類・室内外機の品番は別
   const p=pos(o.t);if(!p)return null;const n=+m[2],sq=m[4]?1:0;return{x:p.x,z:p.z,s:o.z,g:/^(V?H?S|HS|VHS|H|V|AH|SH|PH)/.test(m[1])&&sq?1:0,w:sq?n:300,d:sq?(+m[5]||n):300}}).filter(Boolean);
  const S=out.ductS||[],J=out.ductJ||[],E=[];S.filter(r=>r[0]!==r[2]||r[1]!==r[3]).forEach(r=>{[[0,1,2,3],[2,3,0,1]].forEach(([a,b,c,d])=>{const p=[r[a],r[b]],q=[r[c],r[d]],L=Math.hypot(p[0]-q[0],p[1]-q[1]);if(L<20)return;
   const used=S.some(o=>o!==r&&(Math.hypot(o[0]-p[0],o[1]-p[1])<Math.max(30,r[6]*0.6)||Math.hypot(o[2]-p[0],o[3]-p[1])<Math.max(30,r[6]*0.6)))||J.some(j=>Math.hypot(j[0]-p[0],j[1]-p[1])<Math.max(60,r[6]*1.2))||(out.vc||[]).some(v=>Math.hypot(v[0]-p[0],v[1]-p[1])<60);if(used)return;
   E.push({x:p[0],z:p[1],h:r[4],u:[(p[0]-q[0])/L,(p[1]-q[1])/L],w:r[6]})})});
  const CH0=(st.gnd&&st.gnd.ch)||P.CH||2700,taken=new Set();out.eq2=[];
  EQT.forEach(t=>{let b=null,bd=1500;E.forEach((e,i)=>{if(taken.has(i))return;const d=Math.hypot(e.x-t.x,e.z-t.z);if(d<bd){bd=d;b=i}});if(b===null)return;taken.add(b);const e=E[b];
   let cm=null,cd=900;CM.forEach(c=>{const d=Math.hypot(c.x-t.x,c.z-t.z);if(d<cd){cd=d;cm=c}});
   out.eq2.push([Math.round(e.x),Math.round(e.z),Math.round(e.h),+e.u[0].toFixed(4),+e.u[1].toFixed(4),t.w,t.d,t.g?"g":"f",t.s+(cm?" "+cm.s:""),CH0])})}catch(err){console.warn("eq2",err)}
 out.ver=DL_VER;return out};
})();
