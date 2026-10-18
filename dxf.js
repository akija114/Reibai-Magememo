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
function dxfCat(L){L=L||"";
 if(/冷媒/.test(L))return"ref";if(/ドレン|ﾄﾞﾚﾝ/.test(L))return"drain";if(/ダクト|ﾀﾞｸﾄ/.test(L))return"duct";
 if(/給水|給湯|汚水|雑排|排水|通気|消火|衛生|ガス管|ｶﾞｽ|上水|中水|雨水/.test(L))return"eisei";return""}
/* 画層の名前 → 自動読み込み用の色（PDFの空調図と同じ色にそろえる：機器＝青、冷媒＝赤紫、ドレン＝オレンジ、建築＝グレー） */
function dxfAnaCol(L){L=L||"";const c=dxfCat(L);
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
 const dS=S.map(s=>{const a=px(s[0],s[1]),b=px(s[2],s[3]);return[a[0],a[1],b[0],b[1],s[5],dxfGrp(s[4])]});
 const segs=S.map(s=>{const a=px(s[0],s[1]),b=px(s[2],s[3]);return[a[0],a[1],b[0],b[1],dxfAnaCol(s[4]),s[4]]}).filter((s,i)=>s[4]&&!S[i][6]&&Math.hypot(s[2]-s[0],s[3]-s[1])>0.3);
 const arcs=G.arcs.filter(o=>dxfAnaCol(o.lay)).map(o=>({a:px(o.a[0],o.a[1]),m:px(o.m[0],o.m[1]),b:px(o.b[0],o.b[1]),col:dxfAnaCol(o.lay),lay:o.lay}));
 /* 自動読み込みに使う文字は、空調（冷媒・ドレン・機器）と建築だけ（ダクト・衛生の「FL+3900」などを配管の高さと間違えないように） */
 const tAna=texts.filter(t=>{const k=dxfCat(t.lay);return k!=="duct"&&k!=="eisei"});
 const segAll=S.map(s=>{const a=px(s[0],s[1]),b=px(s[2],s[3]);return[a[0],a[1],b[0],b[1],"",s[4]]}).filter(s=>dxfCat(s[5]));
 const P={img:c,W,H0:H,segs,segAll,arcs,texts:tAna,textsAll:texts,mmpp,ptpx:0,den:0,dxf:1,dS,route:[],walls:[],show:true,fkey:f.name+"|"+f.size};dxfRender(P);return P};
/* 図面の線を「何の図か」で分ける：空調（冷媒・ドレン・機器）／ダクト／衛生／建築／寸法・文字 */
function dxfGrp(L){L=L||"";const k=dxfCat(L);if(k==="ref"||k==="drain")return"ac";if(k)return k;
 if(/機器|ｽﾘｰﾌﾞ|スリーブ|メンテ|室内機|室外機|空調|冷媒|PAC|基準線/.test(L))return"ac";
 if(/寸法|文字|符号|枠|凡例|方位|補助線|表/.test(L))return"anno";return"arch"}
const DXV=[["ac","空調","#2563eb"],["duct","ダクト","#0d9488"],["eisei","衛生","#16a34a"],["arch","建築","#64748b"],["anno","寸法・文字","#a16207"]];
const dxvOn=()=>{let o={};try{o=JSON.parse(localStorage.getItem("pbm_dxfv")||"{}")||{}}catch(e){}return k=>o[k]!==undefined?!!o[k]:(k!=="duct"&&k!=="eisei")};
function dxfRender(P){if(!P||!P.dS)return;const on=dxvOn(),c=P.img,g=c.getContext("2d");g.setTransform(1,0,0,1,0,0);g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.lineWidth=1;g.lineCap="round";
 const disp=col=>{const r=parseInt(col.slice(1,3),16),gg=parseInt(col.slice(3,5),16),b=parseInt(col.slice(5,7),16);return r>230&&gg>230&&b>230?"#000000":r>200&&gg>200&&b<80?"#b8a000":col};
 /* 出している種類が少ない時は、建築を薄く（主役の線が見やすいように） */
 const by={};P.dS.forEach(s=>{if(!on(s[5]))return;const k=s[4]+"|"+(s[5]==="arch"&&(on("duct")||on("eisei")||on("ac"))?1:0);(by[k]=by[k]||[]).push(s)});
 Object.keys(by).forEach(k=>{const[col,fade]=k.split("|");g.globalAlpha=fade==="1"?0.45:1;g.strokeStyle=disp(col);g.beginPath();by[k].forEach(s=>{g.moveTo(s[0],s[1]);g.lineTo(s[2],s[3])});g.stroke()});g.globalAlpha=1;
 (P.textsAll||[]).forEach(t=>{const gr=dxfGrp(t.lay);if(!on(gr==="arch"?"anno":gr))return;if(t.h<2)return;g.save();g.translate(t.x,t.y);g.rotate(-(t.r||0)*Math.PI/180);g.fillStyle=disp(t.col||"#000000");g.font=Math.round(t.h)+"px sans-serif";g.fillText(t.s,0,0);g.restore()});
 P._tex=(P._tex||0)+1}
window.dxfRender=dxfRender;
/* 図面画面の下の切りかえボタン（DXFの時だけ） */
window.dxfChips=function(){const wr=document.getElementById("plWrap");let el=document.getElementById("dxfChips");const P=typeof PLAN!=="undefined"?PLAN:null;
 if(!wr||!P||!P.dxf){if(el)el.remove();return}
 if(!el){el=document.createElement("div");el.id="dxfChips";el.style.cssText="position:absolute;left:8px;right:8px;bottom:8px;z-index:5;display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none";wr.appendChild(el)}
 if(el.dataset.k===P.fkey+"|"+(P._tex||0))return;el.dataset.k=P.fkey+"|"+(P._tex||0);
 const on=dxvOn(),has=new Set(P.dS.map(s=>s[5]));
 el.innerHTML=DXV.filter(([k])=>has.has(k)).map(([k,n,col])=>{const o=on(k);return `<button data-dv="${k}" style="flex:none;height:34px;padding:0 10px;border-radius:17px;font-weight:800;font-size:13px;border:2px solid ${col};background:${o?col:"#ffffffee"};color:${o?"#fff":col}">${o?"✓":"－"}${n}</button>`}).join("");
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
if(!by[k])return;const v=main?own((s[0]+s[2])/2,(s[1]+s[3])/2):null;if(main&&!v)return;by[k].push({s,v,lay:s[5]})});
 const CH=(st.gnd&&st.gnd.ch)||P.CH||2700,defH={ref:CH-150,drain:CH-250,duct:CH+300,eisei:CH-300};
 const FLt=(P.textsAll||P.texts||[]).map(t=>{const z=String(t.s).replace(/[＋]/g,"+").replace(/[－−ー]/g,"-").replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248));if(/下端|上端|梁|H-\d|C-\d/.test(z))return null;const m=z.match(/FL\s*([+\-])\s*(\d{2,4})/);return m?{x:t.x,y:t.y,h:(m[1]==="-"?-1:1)*+m[2],k:txtCat(t)}:null}).filter(Boolean);
 const out={};
 Object.keys(by).forEach(k=>{let L0=by[k];if(!L0.length)return;
  /* 画層ごとに：原点の図にあればそれ、無ければほかの図から通り芯でずらして持ってくる（同じ物を2回出さない） */
  const gs={};L0.forEach(q=>{const g=q.s[5]!==undefined?q.s[5]:k;(gs[g]=gs[g]||[]).push(q)});let L=[];
  Object.values(gs).forEach(G=>{if(!main){L=L.concat(G);return}const inMain=G.filter(q=>q.v===main);if(inMain.length){L=L.concat(inMain);return}
   const vs=[...new Set(G.map(q=>q.v))];let bestV=null,bn=0;vs.forEach(v=>{const n=G.filter(q=>q.v===v).length;if(n>bn&&off(v)){bn=n;bestV=v}});if(!bestV)return;const d=off(bestV);
   L=L.concat(G.filter(q=>q.v===bestV).map(q=>({s:[q.s[0]+d[0],q.s[1]+d[1],q.s[2]+d[0],q.s[3]+d[1]],v:main,moved:1,o:q.s,lay:q.lay})))});
  const near=(x,y,src)=>{let b=null,bd=2500/P.mmpp;FLt.forEach(t=>{if(t.k&&t.k!==k)return;if(!t.k&&P.dxf)return;const d=Math.hypot(t.x-x,t.y-y);if(d<bd){bd=d;b=t}});return b};
  /* 大きさの文字：「200φ」＝丸、「300×150」＝角（幅×高さ）。近く（1.5m）の同じ種類の文字 */
  const SZ=(P.textsAll||P.texts||[]).map(t=>{const z=String(t.s).replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)).replace(/[Φø]/g,"φ");let m=z.match(/(\d{2,4})\s*[×xX*＊]\s*(\d{2,4})/);if(m&&!/H-|C-|下端/.test(z))return{x:t.x,y:t.y,r:0,a:+m[1],b:+m[2],k:txtCat(t)};m=z.match(/(\d{2,4})\s*φ/);return m?{x:t.x,y:t.y,r:1,a:+m[1],k:txtCat(t)}:null}).filter(Boolean);
  const nearSz=(x,y)=>{let b=null,bd=1500/P.mmpp;SZ.forEach(t=>{if(P.dxf&&t.k&&t.k!==k)return;const d=Math.hypot(t.x-x,t.y-y);if(d<bd){bd=d;b=t}});return b};
  const sub=lay=>/給水|給湯|上水|中水/.test(lay||"")?0:/汚水|排水|雑排|雨水/.test(lay||"")?1:/通気/.test(lay||"")?2:3;
  /* 平行な線をまとめて、外形の2本（間の中心線も）から太さを出す：線の向きごと・画層ごとに、となりとの間が近い線を1つの束に */
  const mm=P.mmpp,gapMax=(k==="duct"?260:90)/mm,wMax=(k==="duct"?1300:220)/mm,wMin=(k==="duct"?60:12)/mm;
  const items=L.slice(0,8000).map(q=>{const s=q.s,dx=s[2]-s[0],dy=s[3]-s[1],l=Math.hypot(dx,dy);if(l<1)return null;let th=Math.atan2(dy,dx);if(th<0)th+=Math.PI;if(th>=Math.PI-1e-6)th=0;
   const ux=Math.cos(th),uy=Math.sin(th),t0=s[0]*ux+s[1]*uy,t1=s[2]*ux+s[3]*uy;return{q,th,ux,uy,d:-s[0]*uy+s[1]*ux,lo:Math.min(t0,t1),hi:Math.max(t0,t1),l}}).filter(Boolean);
  const grp={};items.forEach(it=>{const key=(it.q.lay||"")+"|"+Math.round(it.th*180/Math.PI)%180;(grp[key]=grp[key]||[]).push(it)});
  const solids=[],lines=[],hAt=(x,y)=>{const t=near(x,y);return t?t.h:defH[k]};
  const W=(x,y)=>btWx([x,y]);
  Object.values(grp).forEach(G=>{G.sort((a,b)=>a.d-b.d);const used=new Set();
   G.forEach((A,i)=>{if(used.has(i))return;const C=[i];used.add(i);
    for(let j=i+1;j<G.length;j++){if(used.has(j))continue;const B=G[j],last=G[C[C.length-1]];if(B.d-last.d>gapMax)break;if(B.d-A.d>wMax)break;
     const ov=Math.min(A.hi,B.hi)-Math.max(A.lo,B.lo);if(ov<Math.min(A.hi-A.lo,B.hi-B.lo)*0.6)continue;C.push(j);used.add(j)}
    const M=C.map(j=>G[j]),w=M[M.length-1].d-M[0].d;
    if(M.length>=2&&w>=wMin){const lo=Math.max(...M.map(m=>m.lo)),hi=Math.min(...M.map(m=>m.hi));if(hi-lo<2)return;const dc=(M[0].d+M[M.length-1].d)/2,ux=A.ux,uy=A.uy;
     const p1=[lo*ux-dc*uy,lo*uy+dc*ux],p2=[hi*ux-dc*uy,hi*uy+dc*ux],src=A.q.o?[(A.q.o[0]+A.q.o[2])/2,(A.q.o[1]+A.q.o[3])/2]:[(p1[0]+p2[0])/2,(p1[1]+p2[1])/2];
     const wm=w*mm,tz=nearSz(src[0],src[1]);let sh=k==="duct"?(wm<=330?0:1):0,hh=wm;
     if(k==="duct"&&tz){if(tz.r)sh=Math.abs(wm-tz.a)>tz.a*0.35?1:0;else{sh=1;hh=Math.abs(tz.b-wm)<Math.abs(tz.a-wm)?tz.a:tz.b}}if(k==="duct"&&sh===1&&tz&&tz.r)hh=Math.min(wm,tz.a+100);   // 「200φ」の近くでも太さが合わない物（ボックス・チャンバー）は角if(k==="duct"&&sh===1&&!tz)hh=Math.min(wm,300);
     const a=W(p1[0],p1[1]),b=W(p2[0],p2[1]);solids.push([Math.round(a[0]),Math.round(a[1]),Math.round(b[0]),Math.round(b[1]),Math.round(hAt(src[0],src[1])),sh,Math.round(wm),Math.round(hh),sub(A.q.lay)])}
    else M.forEach(m=>{if(m.l*mm<40)return;const s=m.q.s,src=m.q.o||s,a=W(s[0],s[1]),b=W(s[2],s[3]);lines.push([Math.round(a[0]),Math.round(a[1]),Math.round(b[0]),Math.round(b[1]),Math.round(hAt((src[0]+src[2])/2,(src[1]+src[3])/2))])})})});
  out[k]=lines;out[k+"S"]=solids});
 return out};
})();
