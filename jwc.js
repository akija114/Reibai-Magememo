/* Jw_cad の昔の図面ファイル（.jwc・「jw_cad(c)data」で始まる）を DXF の文字に変える（2026-11-04 ユーザー：このファイルで開ける？）
   図面（zumen.js の planLoad）と図面編集（cad/index.html の readUpload）で使う。読めた物は DXF と同じに扱う。
   中の作り（ファイルを調べて分かった物）：
   ・頭の文字の2行目「線の数,円・円弧の数,文字の数,…」
   ・印 a0 b0 c0 d0 e0 f0 のすぐ後に 線（22バイト）：x1,y1,x2,y2（float）＋[線種,線色,レイヤ（上4ビット＝グループ・下4ビット＝レイヤ）,0,?,0]
   ・続けて 円・円弧（32バイト）：中心x,y・半径（float）・つぶれ（int16、10000＝真円）・始まりの角度・終わりの角度・傾き（それぞれ 小数 uint16＋度 int16）＋[線種,線色,レイヤ,…]
   ・続けて 文字（24バイト）：始まりx,y・終わりx,y（float・文字の下の線）・文字の場所（uint16、文字の表の頭から）＋[?,?,文字種,レイヤ,…]
   ・その後ろに 文字の表（Shift_JIS・0 で区切る）
   長さは紙の上の大きさなので、図面の寸法の数字（「8,500」など）と、その下の寸法の線の長さの比で、実寸（mm）に直す（多数決）。 */
(function(){
const JWC_ACI={1:4,2:7,3:3,4:2,5:6,6:5,7:7,8:1,9:8};   // Jw の線色 → DXF の色（1水色・2黒・3緑・4黄・5ピンク・6青・7黒・8赤・9灰）
function isJwc(u8){return u8&&u8.length>16&&String.fromCharCode(...u8.slice(0,13))==="jw_cad(c)data"}
function jwcToDxf(u8){
 if(!isJwc(u8))throw new Error("Jw_cad の図面ファイルではありません");
 const dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength),f=o=>dv.getFloat32(o,true);
 const head=new TextDecoder("ascii").decode(u8.slice(200,400)).split("\0")[0].split(",").map(Number),nL=head[0]|0,nA=head[1]|0,nT=head[2]|0;
 let L0=-1;for(let i=13;i<u8.length-6;i++){if(u8[i]===0xa0&&u8[i+1]===0xb0&&u8[i+2]===0xc0&&u8[i+3]===0xd0&&u8[i+4]===0xe0&&u8[i+5]===0xf0){L0=i+6;break}}
 if(L0<0||!(nL>=0)||L0+nL*22+nA*32+nT*24>u8.length)throw new Error("この Jw_cad のファイルは読めませんでした（新しい形の .jww は、Jw_cad で DXF に保存してください）");
 const ang=o=>dv.getInt16(o+2,true)+dv.getUint16(o,true)/65536;
 const lines=[],arcs=[],texts=[];
 for(let k=0;k<nL;k++){const o=L0+k*22;lines.push([f(o),f(o+4),f(o+8),f(o+12),u8[o+16],u8[o+17],u8[o+18]])}
 const A0=L0+nL*22;
 for(let k=0;k<nA;k++){const o=A0+k*32;arcs.push({x:f(o),y:f(o+4),r:f(o+8),fl:dv.getInt16(o+12,true)/10000,a0:ang(o+14),a1:ang(o+18),rot:ang(o+22),lt:u8[o+26],c:u8[o+27],ly:u8[o+28]})}
 const T0=A0+nA*32,S0=T0+nT*24,sj=new TextDecoder("shift_jis");
 for(let k=0;k<nT;k++){const o=T0+k*24,so=S0+dv.getUint16(o+16,true);let e=so;while(e<u8.length&&u8[e])e++;
  const s=sj.decode(u8.slice(so,e)).replace(/\s+$/,"");if(!s.trim())continue;texts.push({x1:f(o),y1:f(o+4),x2:f(o+8),y2:f(o+12),s,ly:u8[o+21]})}
 /* 文字の高さ：下の線の長さ ÷ 文字の幅の数（全角＝2・半角＝1）× 2 */
 const units=s=>{let n=0;for(const ch of s){const c=ch.charCodeAt(0);n+=(c>0x7f&&!(c>=0xff61&&c<=0xff9f))?2:1}return n||1};
 texts.forEach(t=>{const L=Math.hypot(t.x2-t.x1,t.y2-t.y1);t.L=L;t.h=Math.max(0.5,L/units(t.s)*2*0.85);t.rot=Math.atan2(t.y2-t.y1,t.x2-t.x1)*180/Math.PI});
 /* 縮尺：寸法の数字と、それに沿った寸法の線の長さの比（いちばん多い比） */
 const vote=new Map(),RS=[];
 texts.forEach(t=>{const m=t.s.replace(/[，,]/g,"").match(/^\s*(\d{3,6})\s*$/);if(!m||!t.L)return;const v=+m[1];if(v<100)return;
  const ux=(t.x2-t.x1)/t.L,uy=(t.y2-t.y1)/t.L,cx=(t.x1+t.x2)/2,cy=(t.y1+t.y2)/2,lim=t.h*2.2;let best=null;
  for(const l of lines){const dx=l[2]-l[0],dy=l[3]-l[1],ll=Math.hypot(dx,dy);if(ll<t.L)continue;if(Math.abs((dx*uy-dy*ux)/ll)>0.01)continue;
   const d=Math.abs((cx-l[0])*uy-(cy-l[1])*ux);if(d>lim)continue;const p0=(l[0]-cx)*ux+(l[1]-cy)*uy,p1=(l[2]-cx)*ux+(l[3]-cy)*uy;if(Math.min(p0,p1)>0||Math.max(p0,p1)<0)continue;
   if(!best||d<best.d)best={d,ll}}
  if(best){const q=v/best.ll,k=Math.round(Math.log(q)/Math.log(1.005));vote.set(k,(vote.get(k)||0)+1);RS.push([k,q])}});
 let K=0,kn=0,tot=0;vote.forEach((n,k)=>{tot+=n});vote.forEach((n,k)=>{const s=n+(vote.get(k-1)||0)+(vote.get(k+1)||0);if(s>kn){kn=s;K=k}});
 let scale=0;if(kn>=2){const q=RS.filter(r=>Math.abs(r[0]-K)<=1).map(r=>r[1]).sort((a,b)=>a-b);scale=q[q.length>>1]}   // いちばん多い比のまわりの真ん中の値
 const ok=!!scale;if(!scale)scale=1;
 /* レイヤを中身で分ける（2026-11-05 ユーザー：Jw で開くと「その他」しかない・PDFのように空調・ダクト・衛生に）。名前は「冷媒（レイヤ0-8）」のように頭に種類（図面・図面編集の振り分けが名前で決まるため）
    ① そのレイヤの文字の言葉 ② 同じグループのほかのレイヤが7割同じ種類（建築の図を写したグループなど）
    ③ 文字の無いレイヤで、ほとんどの物が空調機器のそば（1.5m）にある＝室内機の点検口・芯の印など（2026-11-05 ユーザー：室内機の点検口も空調）
    図形がほとんど無く文字だけのレイヤは「寸法・文字」。「150φ FL+3300」のような穴は スリーブ（穴の位置）（ダクトにしない） */
 const KW=[["ref",/冷媒|液管|ガス管|R410|R32|R22|\d+\.\d+A?\s*[,，、]\s*\d+\.\d+|^R$/,1],["drain",/ドレン|^D$|^D\s*\d|VP\s*\d|勾配|1\/100|⊿/,1],["acq",/PAC|室内機|室外機|RAC|エアコン|リモコン|空調機|AHU|FCU|PMAC|ビルマル|^AC$/i,2],
  ["slv",/\d{2,4}\s*[φΦ]|スリーブ|貫通/,1],
  ["duct",/CMH|ダクト|\bVD\b|\bFD\b|\bCD\b|吹出|吸込|ガラリ|VHS|全熱|換気扇|ロスナイ|\b[OES]A\b|^\d{2,4}\s*[x×X＊*]\s*\d{2,4}$/i,1],
  ["san",/給水|給湯|排水|汚水|雑排|通気|消火(?!栓\s*BOX)|衛生|水栓|グリース|マンホール|水勾配|雨水|ガス栓|HIVP|\bVU\b|\bSU\b|量水|SP配管|スプリンクラ/i,1],
  ["elec",/電灯|電源|コンセント|分電|照明|弱電|動力|幹線/,1],
  ["arch",/C\.?H\s*=?\s*\d|室$|ロビー|ホール|廊下|便所|トイレ|クローク|庫$|^Fix$|W\s*=|建築工事|ハッチ|ニッチ|^±|平面|詳細図|通り|新築工事|図面番号|下端|梁|鉄骨|^H-\d|柱|カーテン|天井|縦辷り|コン止め|^UB\d|点検口|^DL$|開口|消火栓\s*BOX/i,1],
  ["anno",/^\d{1,3}(,\d{3})+$|^\d{3,5}$/,1]];
 const kOf=t0=>{const t=t0.normalize("NFKC").trim(),v={};for(const[k,re,w]of KW){if(re.test(t))v[k]=(v[k]||0)+w}if(v.slv&&v.ref)delete v.slv;if(/FL\s*[+＋-]\s*\d/i.test(t))v.fl=1;return v};
 const LV=new Map(),add=(M,ly,v,w)=>{const m=M.get(ly)||{};for(const k in v)m[k]=(m[k]||0)+v[k]*w;M.set(ly,m)};
 texts.forEach(t=>{t.v=kOf(t.s);add(LV,t.ly,t.v,1)});
 LV.forEach(m=>{delete m.fl});   // 穴は「131φ」のように数字の後に φ（換気グリルの「(φ150)」は穴にしない）
 const PT=new Map(),addP=(ly,x,y)=>{(PT.get(ly)||PT.set(ly,[]).get(ly)).push([x,y])};   // レイヤごとの物の位置（線の真ん中・円の中心）
 lines.forEach(l=>addP(l[6],(l[0]+l[2])/2,(l[1]+l[3])/2));arcs.forEach(a=>addP(a.ly,a.x,a.y));
 const CATN={ref:"冷媒",drain:"ドレン",acq:"空調機器",slv:"スリーブ（穴の位置）",duct:"ダクト",san:"衛生",elec:"電気",arch:"建築",anno:"寸法・文字"},LC=new Map();
 const pick=(m,mn)=>{const e=Object.entries(m||{}).sort((a,b)=>b[1]-a[1]);return e.length&&e[0][1]>=mn&&(!e[1]||e[0][1]>=e[1][1]*1.4)?e[0][0]:null};
 const ALL=[...new Set([...LV.keys(),...PT.keys()])],nG=ly=>(PT.get(ly)||[]).length;
 ALL.forEach(ly=>{if(nG(ly)<5){if(LV.get(ly))LC.set(ly,"anno");return}const c=pick(LV.get(ly),1);if(c)LC.set(ly,c)});   // ① 自分の文字（図形が無い文字だけのレイヤは寸法・文字）
 const gC=new Map();ALL.forEach(ly=>{const c=LC.get(ly);if(!c||c==="anno")return;const g=ly>>4,m=gC.get(g)||{};m[c]=(m[c]||0)+1;gC.set(g,m)});   // ②
 ALL.forEach(ly=>{if(LC.has(ly))return;const m=gC.get(ly>>4);if(!m)return;const e=Object.entries(m).sort((a,b)=>b[1]-a[1]),tot=e.reduce((s2,x)=>s2+x[1],0);if(tot>=2&&e[0][1]>=tot*0.7)LC.set(ly,e[0][0])});
 {const R1=1500/(ok?scale:81),gA=new Map(),key=(x,y)=>Math.floor(x/R1)+","+Math.floor(y/R1);   // ③ 空調機器のそば
  ALL.forEach(ly=>{if(LC.get(ly)!=="acq")return;for(const[x,y]of PT.get(ly)||[]){const k=key(x,y);(gA.get(k)||gA.set(k,[]).get(k)).push([x,y])}});
  const near=(x,y)=>{const gx=Math.floor(x/R1),gy=Math.floor(y/R1);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const c=gA.get((gx+a)+","+(gy+b));if(c)for(const p of c)if(Math.hypot(p[0]-x,p[1]-y)<=R1)return true}return false};
  const bk=new Map();lines.forEach(l=>{const m=bk.get(l[6])||[0,0];m[1]++;if(l[5]===2||l[5]===7)m[0]++;bk.set(l[6],m)});arcs.forEach(q=>{const m=bk.get(q.ly)||[0,0];m[1]++;if(q.c===2||q.c===7)m[0]++;bk.set(q.ly,m)});
  if(gA.size)ALL.forEach(ly=>{if(LC.has(ly))return;const P=PT.get(ly)||[],m=bk.get(ly);if(P.length<4||P.length>3000||!m||m[0]>=m[1]*0.5)return;   /* 色の付いた線（設備の色）のレイヤだけ */let n=0;for(const[x,y]of P)if(near(x,y))n++;if(n>=P.length*0.7)LC.set(ly,"acq")})}
 {const blk=new Map(),cnt=(ly,c)=>{const m=blk.get(ly)||[0,0];m[1]++;if(c===2||c===7)m[0]++;blk.set(ly,m)};lines.forEach(l=>cnt(l[6],l[5]));arcs.forEach(a=>cnt(a.ly,a.c));   // ④ 黒い線だけのレイヤで、そのグループに空調の物が無い＝建築（建築の図を写したグループ）
  const acG=new Set();LC.forEach((c,ly)=>{if(["ref","drain","acq"].includes(c))acG.add(ly>>4)});
  ALL.forEach(ly=>{if(LC.has(ly)||acG.has(ly>>4))return;const m=blk.get(ly);if(m&&m[1]>=5&&m[0]>=m[1]*0.95)LC.set(ly,"arch")})}
 const lay=b=>{const nm0="レイヤ"+((b>>4)&15).toString(16).toUpperCase()+"-"+(b&15).toString(16).toUpperCase(),c=LC.get(b);return c?CATN[c]+"（"+nm0+"）":nm0};
 /* DXF にする */
 const out=["0","SECTION","2","ENTITIES"],n=v=>(Math.round(v*scale*100)/100).toString(),put=(...a)=>{for(const x of a)out.push(String(x))};
 const lyL=(lt,ly)=>lt===9?"補助線":lay(ly);
 lines.forEach(l=>{if(l[0]===l[2]&&l[1]===l[3])return;put("0","LINE","8",lyL(l[4],l[6]),"62",JWC_ACI[l[5]]||7,"10",n(l[0]),"20",n(l[1]),"30","0","11",n(l[2]),"21",n(l[3]),"31","0")});
 arcs.forEach(a=>{const ly=lyL(a.lt,a.ly),col=JWC_ACI[a.c]||7,full=Math.abs(((a.a1-a.a0)%360+360)%360)<1e-6||Math.abs(Math.abs(a.a1-a.a0)-360)<1e-6;
  if(Math.abs(a.fl-1)<1e-4){if(full)put("0","CIRCLE","8",ly,"62",col,"10",n(a.x),"20",n(a.y),"30","0","40",n(a.r));
   else put("0","ARC","8",ly,"62",col,"10",n(a.x),"20",n(a.y),"30","0","40",n(a.r),"50",(((a.a0%360)+360)%360).toFixed(4),"51",(((a.a1%360)+360)%360).toFixed(4));return}
  /* だ円は短い線でつなぐ */
  let s0=a.a0*Math.PI/180,s1=a.a1*Math.PI/180;if(full)s1=s0+2*Math.PI;else{while(s1<=s0)s1+=2*Math.PI}const N=Math.max(8,Math.ceil((s1-s0)/(Math.PI/24))),ro=a.rot*Math.PI/180,P=t=>{const x=a.r*Math.cos(t),y=a.r*a.fl*Math.sin(t);return[a.x+x*Math.cos(ro)-y*Math.sin(ro),a.y+x*Math.sin(ro)+y*Math.cos(ro)]};
  for(let i=0;i<N;i++){const p=P(s0+(s1-s0)*i/N),q=P(s0+(s1-s0)*(i+1)/N);put("0","LINE","8",ly,"62",col,"10",n(p[0]),"20",n(p[1]),"30","0","11",n(q[0]),"21",n(q[1]),"31","0")}});
 texts.forEach(t=>{put("0","TEXT","8",lay(t.ly),"62",7,"10",n(t.x1),"20",n(t.y1),"30","0","40",n(t.h),"50",(Math.round(t.rot*1000)/1000).toString(),"1",t.s.replace(/[\r\n]+/g," "))});
 out.push("0","ENDSEC","0","EOF");
 return{dxf:out.join("\n")+"\n",scale,ok,count:{lines:lines.length,arcs:arcs.length,texts:texts.length}};
}
/* File（.jwc）→ File（.dxf） */
async function jwcFile(file){const u8=new Uint8Array(await file.arrayBuffer()),r=jwcToDxf(u8);
 const nf=new File([r.dxf],file.name.replace(/\.jwc$/i,"")+".dxf",{type:"application/dxf"});nf.jwc=r;return nf}
window.isJwc=isJwc;window.jwcToDxf=jwcToDxf;window.jwcFile=jwcFile;
})();
