/* 冷媒配管の曲げ共有：shita.js（🚽 下の図面）
   空調の図面（今の図面）とは別に、衛生などの「下の図面」（DXF）をもう1枚読み込んで、3Dの床に映す。今の図面は天井の高さへ。
   ・位置は、2枚の図面にある通り芯の記号（X1・Y2…）で合わせる（同じ記号どうしのずれで、いちばん多いずれ）。無い時はDXFの座標どうしで合わせる
   ・3Dの下のボタンで「天井の図面」「下の図面」を別々に表示・非表示
   ・ファイルはこの端末（IndexedDB pbmPlanDB の "f2"）に覚えておき、今の図面を開き直した時に一緒に開く */
let PLAN2=null;
function shitaLabels(X){return(X.textsAll||X.texts||[]).map(t=>{const n=String(t.s).normalize("NFKC").replace(/\s+/g,"").toUpperCase();return /^[XY]\d{1,2}$/.test(n)?{n,x:(t.x+(t.w||0)/2)*X.mmpp,y:(t.y-(t.h||0)/2)*X.mmpp}:null}).filter(Boolean)}
/* 下の図面の点（その図面の px×mmpp）＋off＝今の図面の px×mmpp */
function shitaAlign(P,Q){
 const A=shitaLabels(P),B=shitaLabels(Q),vote=new Map();
 for(const a of A)for(const b of B){if(a.n!==b.n)continue;const d=[a.x-b.x,a.y-b.y],k=Math.round(d[0]/300)+","+Math.round(d[1]/300);const v=vote.get(k)||{n:0,x:0,y:0};v.n++;v.x+=d[0];v.y+=d[1];vote.set(k,v)}
 let best=null;for(const v of vote.values())if(!best||v.n>best.n)best=v;
 if(best&&best.n>=2)return{o:[best.x/best.n,best.y/best.n],by:"記号 "+best.n+"か所"};
 if(P.dX0!=null&&Q.dX0!=null)return{o:[Q.dX0-P.dX0,P.dY1-Q.dY1],by:"DXFの座標"};   // 同じ建物の図面なら、DXFの座標はそろっていることが多い
 return null}
async function shitaLoad(f,quiet){
 const P=typeof PLAN!=="undefined"?PLAN:null;
 if(!(P&&P.img&&P.mmpp)){if(!quiet)toast("先に「📄 図面」で空調の図面を読み込んで、縮尺を決めてください");return false}
 if(!/\.dxf$/i.test(f.name)){if(!quiet)toast("下の図面は、今はDXFだけ読めます");return false}
 try{const G=await dxfRead(f),Q=dxfToPlan(G,f),al=shitaAlign(P,Q);
  if(!al){if(!quiet)toast("2枚の図面に同じ通り芯の記号（X1・Y2など）が見つからず、位置を合わせられませんでした");return false}
  PLAN2={img:Q.img,W:Q.W,H0:Q.H0,mmpp:Q.mmpp,off:al.o,show:true,name:f.name,tex:null};
  let ceil=true;try{ceil=localStorage.getItem("pbm_plan_ceil")!=="0"}catch(e){}P.atCeil=ceil;
  if(!quiet){try{plDB("readwrite",o=>o.put({blob:f,name:f.name,type:f.type,t:Date.now()},"f2")).catch(()=>{})}catch(e){}toast(`下の図面「${f.name}」を床に映しました（${al.by}で位置合わせ）。今の図面は天井の高さへ`)}
  shitaRedraw();return true}
 catch(e){console.warn(e);if(!quiet)toast("下の図面を読み込めませんでした");return false}}
function shitaRedraw(){try{save()}catch(e){}try{if(window.zUpFloor)zUpFloor()}catch(e){}if(typeof build3D==="function"&&T){build3D();T.dirty=true}else if(typeof dlBar==="function")dlBar()}
function shitaRemove(){PLAN2=null;if(PLAN)PLAN.atCeil=false;try{plDB("readwrite",o=>o.delete("f2")).catch(()=>{})}catch(e){}shitaRedraw();toast("下の図面を外しました。今の図面は床に戻しました")}
/* 3Dに映す（core.js の build3D から呼ぶ） */
function addPlan3D2(){const P=PLAN,Q=PLAN2;if(!Q||!Q.show||!P||P.map||!P.mmpp||!P.org)return;
 const cx=(Q.W/2*Q.mmpp+Q.off[0])/P.mmpp,cy=(Q.H0/2*Q.mmpp+Q.off[1])/P.mmpp,c=btWx([cx,cy]),th=xfOf().r*Math.PI/180;
 if(!Q.tex)Q.tex=new THREE.CanvasTexture(Q.img);
 const g=new THREE.PlaneGeometry(Q.W*Q.mmpp,Q.H0*Q.mmpp);g.rotateX(-Math.PI/2);
 const pl=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:Q.tex,transparent:true,opacity:P.planOp!=null?P.planOp:.4,side:THREE.DoubleSide,depthWrite:false}));
 pl.position.set(c[0],(T&&T.GYr!=null?T.GYr:-(P.H||2400))+1,c[1]);pl.rotation.y=th;pl.renderOrder=-3;pl.userData.planFloor2=true;T.grp.add(pl)}
/* 図面画面の「🚽 下の図面」ボタン */
function shitaMenu(){
 const pick=()=>{const i=document.createElement("input");i.type="file";i.accept=".dxf";i.onchange=()=>{const f=i.files[0];if(f)shitaLoad(f)};i.click()};
 if(!PLAN2){pick();return}
 const P=PLAN,ov=document.createElement("div");ov.style.cssText="position:fixed;inset:0;z-index:60;background:rgba(15,23,42,.45);display:flex;align-items:flex-end;justify-content:center";
 const b=(a,t,c)=>`<button data-a="${a}" style="width:100%;height:48px;margin-top:8px;border-radius:12px;border:1.5px solid ${c||"#cbd5e1"};background:#fff;color:${c||"#0f172a"};font:inherit;font-weight:800;font-size:15px">${t}</button>`;
 ov.innerHTML=`<div style="background:#fff;color:#0f172a;width:100%;max-width:520px;border-radius:18px 18px 0 0;padding:14px 14px calc(env(safe-area-inset-bottom,0px) + 14px)"><div style="font-weight:800;font-size:16px">🚽 下の図面：${String(PLAN2.name).replace(/[<>&]/g,"")}</div>
  ${b("show",PLAN2.show?"🙈 下の図面を隠す":"🗺 下の図面を映す")}${b("ceil",P&&P.atCeil?"⬇ 今の図面を床に戻す":"⬆ 今の図面を天井へ")}${b("re","📄 別の下の図面を読み込む")}${b("rm","🗑 下の図面を外す","#dc2626")}${b("x","閉じる")}</div>`;
 document.body.appendChild(ov);
 ov.onclick=e=>{const a=e.target===ov?"x":e.target.closest("[data-a]")?.dataset.a;if(!a)return;ov.remove();
  if(a==="show"){PLAN2.show=!PLAN2.show;shitaRedraw()}
  else if(a==="ceil"&&P){P.atCeil=!P.atCeil;try{localStorage.setItem("pbm_plan_ceil",P.atCeil?"1":"0")}catch(err){}shitaRedraw()}
  else if(a==="re")pick();else if(a==="rm")shitaRemove()};
}
/* 今の図面を開いた（開き直した）時に、覚えておいた下の図面も一緒に開く */
(function(){if(typeof planLoad!=="function")return;const o=planLoad;
 planLoad=async function(...a){PLAN2=null;const r=await o.apply(this,a);try{const s=await plDB("readonly",q=>q.get("f2"));if(s&&s.blob&&PLAN&&PLAN.mmpp)await shitaLoad(new File([s.blob],s.name,{type:s.type||"application/dxf"}),true)}catch(e){}return r}})();
