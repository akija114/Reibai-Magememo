/* 冷媒配管の曲げ共有：genchou.js（現調・AR） */
/* ===== Android（Chrome）のWebXR：床をタップして機器を置き、曲げ位置をタップして配管を引く ===== */
let XR_AR=false;try{if(navigator.xr&&navigator.xr.isSessionSupported)navigator.xr.isSessionSupported("immersive-ar").then(v=>{XR_AR=!!v}).catch(()=>{})}catch(e){}
function startXR(){
 const V=THREE.Vector3,UP=new V(0,1,0);
 const ov=document.createElement("div");ov.id="xrOv";
 ov.style.cssText='position:fixed;inset:0;z-index:999;pointer-events:none;font-family:-apple-system,"Hiragino Sans",sans-serif;color:#fff';
 ov.innerHTML=`<div id="xrTop" style="position:absolute;left:10px;right:10px;top:10px;background:#0f172acc;border-radius:14px;padding:10px 12px;font-size:14px;line-height:1.45;pointer-events:auto"></div>
  <div id="xrBot" style="position:absolute;left:8px;right:8px;bottom:14px;display:flex;flex-wrap:wrap;gap:6px;justify-content:center;pointer-events:auto"></div>`;
 document.body.appendChild(ov);
 ov.addEventListener("beforexrselect",e=>{if(e.target.closest("#xrTop,#xrBot"))e.preventDefault()});
 const B=(id,txt,bg)=>`<button id="${id}" style="min-width:64px;height:46px;padding:0 12px;border-radius:14px;border:0;font-weight:800;font-size:14px;background:${bg||"#ffffffee"};color:#0f172a">${txt}</button>`;
 const IN=["cas","cas2","ceil","wall","flr"],slot=IN.includes(st.units.s)?"s":["e",...Object.keys(st.units).filter(k=>/^L[a-x]$/.test(k))].find(k=>IN.includes(st.units[k]));
 const D=SIZES[legSize("m")][1],szN=SIZES[legSize("m")][0];
 const X={yaw:0,floorY:null,hit:null,ctr:null,route:[],mode:slot?"place":"pipe",hMode:"unit",ch:st.gnd.ch||2500,unit:null,L0:null,ref:"ceil"};
 navigator.xr.requestSession("immersive-ar",{requiredFeatures:["hit-test"],optionalFeatures:["dom-overlay"],domOverlay:{root:ov}}).then(async session=>{
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  renderer.setPixelRatio(window.devicePixelRatio||1);renderer.setSize(innerWidth,innerHeight);renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType("local");
  renderer.domElement.style.display="none";document.body.appendChild(renderer.domElement);
  await renderer.xr.setSession(session);
  const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera();
  scene.add(new THREE.HemisphereLight(0xffffff,0x667788,1.0));{const dl=new THREE.DirectionalLight(0xffffff,0.6);dl.position.set(1,3,2);scene.add(dl)}
  const red=new THREE.MeshBasicMaterial({color:0xef4444}),cu=new THREE.MeshStandardMaterial({color:0xc2703a,metalness:.35,roughness:.35}),gh=new THREE.MeshBasicMaterial({color:0xfbbf24,transparent:true,opacity:.7});
  const mark=(r)=>{const g=new THREE.Group();const ring=new THREE.Mesh(new THREE.RingGeometry(r*.85,r,40),red);ring.rotation.x=-Math.PI/2;g.add(ring);
   [0,1].forEach(k=>{const b=new THREE.Mesh(new THREE.BoxGeometry(k?r*0.08:r*2.6,0.002,k?r*2.6:r*0.08),red);g.add(b)});return g};
  const reticle=mark(0.1);reticle.matrixAutoUpdate=false;reticle.visible=false;scene.add(reticle);
  const viewer=await session.requestReferenceSpace("viewer"),hitSrc=await session.requestHitTestSource({space:viewer}),ref=renderer.xr.getReferenceSpace();
  const pipeG=new THREE.Group();scene.add(pipeG);let ctrMark=null,ghost=null;
  const rad=Math.max(D/2000,0.006);
  const seg=(a,b,m,r)=>{const l=a.distanceTo(b);if(l<1e-4)return null;const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,l,12),m);c.position.copy(a).add(b).multiplyScalar(.5);c.quaternion.setFromUnitVectors(UP,b.clone().sub(a).normalize());return c};
  // 機器の模型
  if(slot){const k=slot,mk=makeUnit(st.units[k],{kind:st.info.kind,wx:st.units["w"+k],om:st.units["o"+k],ox:st.units["x"+k],ck:st.units["c"+k],mm:st.units["m"+k]});
   X.unit=mk.g;X.name=mk.name;X.c2=mk.c2;
   if(mk.c2){X.L0=new V(...mk.c2.ceil);X.ref="ceil"}
   else{const bb=new THREE.Box3().setFromObject(mk.g),c=bb.getCenter(new V()),t=st.units[k];
    if(t==="flr"){X.L0=new V(c.x,bb.min.y,c.z);X.ref="floor"}else if(t==="wall"){X.L0=new V(c.x,bb.min.y,c.z);X.ref="wall"}else{X.L0=new V(c.x,bb.max.y,c.z);X.ref="ceil"}}
   X.unit.scale.setScalar(0.001);X.unit.visible=false;scene.add(X.unit)}
  const port=()=>{X.unit.updateMatrixWorld(true);return X.unit.localToWorld(new V(0,0,0))};
  const placeUnit=()=>{if(!X.unit||!X.ctr)return;const ay=X.ref==="floor"?0:X.ref==="wall"?1.8:X.ch/1000;
   const l=X.L0.clone().multiplyScalar(0.001).applyAxisAngle(UP,X.yaw);X.unit.rotation.set(0,X.yaw,0);
   X.unit.position.set(X.ctr.x-l.x,X.floorY+ay-l.y,X.ctr.z-l.z);X.unit.visible=true;
   if(ctrMark)scene.remove(ctrMark);ctrMark=mark(0.18);ctrMark.position.set(X.ctr.x,X.floorY+0.002,X.ctr.z);scene.add(ctrMark);
   if(X.route.length)X.route[0]=port();else X.route=[port()];drawPipe()};
  const drawPipe=()=>{while(pipeG.children.length)pipeG.remove(pipeG.children[0]);
   for(let i=1;i<X.route.length;i++){const c=seg(X.route[i-1],X.route[i],cu,rad);if(c)pipeG.add(c);const s2=new THREE.Mesh(new THREE.SphereGeometry(rad*1.4,12,8),cu);s2.position.copy(X.route[i]);pipeG.add(s2)}
   info()};
  const nextPt=()=>{if(!X.hit)return null;const p=X.hit.clone();if(X.hMode==="unit"&&X.route.length)p.y=X.route[X.route.length-1].y;return p};
  const lens=()=>{const a=[];for(let i=1;i<X.route.length;i++)a.push(Math.round(X.route[i-1].distanceTo(X.route[i])*1000/10)*10);return a};
  const info=()=>{const L=lens(),tot=L.reduce((a,b)=>a+b,0);
   const step=X.mode==="place"?"① 室内機の<b>芯の真下の床</b>を映して、赤い十字が出たらタップ（"+(X.ref==="ceil"?"天井高 "+fmt(X.ch)+" に浮かせて置きます":X.ref==="wall"?"床から1800に置きます":"床に置きます")+"）"
    :"② 曲げる位置をタップすると配管が伸びます"+(X.route.length?"":"（最初のタップが起点）")+"。高さ："+(X.hMode==="unit"?"前の点と同じ（水平）":"タップした面（壁・床）");
   $("#xrTop").innerHTML=(X.name?`<div style="font-weight:800">${X.name}</div>`:"")+step+`<div style="margin-top:4px">配管 ${szN}：${L.length?L.map((v,i)=>(i+1)+")"+fmt(v)).join(" ")+"　<b>合計 約"+fmt(tot)+"mm</b>":"まだありません"}</div>`;
   $("#xrBot").innerHTML=(X.unit?B("xrPlace",X.mode==="place"?"機器を置く中":"機器を置き直す",X.mode==="place"?"#fbbf24":"")+B("xrRot","↻ 90°"):"")+
    (X.unit&&X.ref==="ceil"?B("xrChM","天井−50")+B("xrChP","天井＋50"):"")+B("xrPipe",X.mode==="pipe"?"配管を引く中":"配管を引く",X.mode==="pipe"?"#fbbf24":"")+
    B("xrH",X.hMode==="unit"?"高さ：水平":"高さ：面")+B("xrUndo","1つ戻す")+B("xrEnd","終了","#ef4444");
   const on=(id,f)=>{const e=document.getElementById(id);if(e)e.onclick=f};
   on("xrPlace",()=>{X.mode="place";info()});on("xrRot",()=>{X.yaw+=Math.PI/2;placeUnit();info()});
   on("xrChM",()=>{X.ch=Math.max(1800,X.ch-50);placeUnit();info()});on("xrChP",()=>{X.ch=Math.min(6000,X.ch+50);placeUnit();info()});
   on("xrPipe",()=>{X.mode="pipe";info()});on("xrH",()=>{X.hMode=X.hMode==="unit"?"surf":"unit";info()});
   on("xrUndo",()=>{if(X.route.length>(X.unit&&X.unit.visible?1:0))X.route.pop();drawPipe()});on("xrEnd",()=>session.end())};
  session.addEventListener("select",()=>{if(!X.hit)return;
   if(X.mode==="place"&&X.unit){X.ctr=X.hit.clone();X.floorY=X.hit.y;placeUnit();X.mode="pipe";info();return}
   const p=nextPt();if(p){X.route.push(p);drawPipe()}});
  session.addEventListener("end",()=>{renderer.setAnimationLoop(null);try{renderer.dispose()}catch(e){}renderer.domElement.remove();ov.remove();
   const L=lens();if(L.length){const tot=L.reduce((a,b)=>a+b,0);window.LAST_AR={size:szN,lens:L,tot};toast("ARの配管："+szN+" 約"+fmt(tot)+"mm（"+L.length+"区間）")}});
  info();
  renderer.setAnimationLoop((t,frame)=>{
   if(frame){const r=frame.getHitTestResults(hitSrc);
    if(r.length){const pose=r[0].getPose(ref);reticle.visible=true;reticle.matrix.fromArray(pose.transform.matrix);X.hit=new V().setFromMatrixPosition(reticle.matrix)}else{reticle.visible=false;X.hit=null}}
   if(ghost){scene.remove(ghost);ghost=null}
   if(X.mode==="pipe"&&X.route.length&&X.hit){const p=nextPt();ghost=seg(X.route[X.route.length-1],p,gh,rad*0.8);if(ghost)scene.add(ghost)}
   renderer.render(scene,cam)});
 }).catch(e=>{console.warn(e);ov.remove();toast("ARを開始できませんでした（ARCore対応のAndroidのChromeで使えます）")});
}
$("#arBtn").onclick=openAR;
/* ===== 📹 現調モード（iPhoneのSafariだけで動く簡易AR）=====
   カメラの映像の上に今の3D（配管・機器）を重ねる。
   ・＋／−ボタンで、選んだ直管を10cm（または1cm）ずつ伸び縮み → 寸法・合計がすぐ連動
   ・📱見回す：スマホの向きに合わせて3Dの見る向きが変わる（床に固定はされない＝歩くと一緒についてくる）
   ・⏺録画：カメラ＋3D＋寸法の文字をまとめて動画にし、LINEなどへ共有 */
const GEN={on:false,stream:null,mic:null,gyro:false,rec:null,chunks:[],cvs:null,ctx:null,step:100,micOn:false,t0:0,fov0:45,wasFull:false,rep:null};
(function(){
 const css=document.createElement("style");
 css.textContent=`
.stage.genmode{background:#000}
.stage.genmode .hud,.stage.genmode .tools,.stage.genmode .suppill,.stage.genmode .toolsTab,.stage.genmode .infoTab,.stage.genmode .uitog,.stage.genmode .stinfo,.stage.genmode .hint,.stage.genmode #photoBg{display:none!important}
#genVid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;display:none;pointer-events:none;background:#000}
.stage.genmode #genVid{display:block}
#genTop,#genBot{position:absolute;left:0;right:0;z-index:4;display:none;font-family:-apple-system,"Hiragino Sans",sans-serif}
.stage.genmode #genTop,.stage.genmode #genBot{display:flex}
#genTop{top:calc(env(safe-area-inset-top,0px) + 8px);padding:0 10px;gap:6px;align-items:center}
#genTop button{flex:none;height:40px;border-radius:20px;padding:0 12px;background:#0f172acc;color:#fff;font-size:14px;font-weight:700;white-space:nowrap}
#genTop button.on{background:#0369a1}
#genRecDot{position:absolute;right:10px;top:48px;background:#dc2626;color:#fff;border-radius:14px;padding:5px 10px;font-size:13px;font-weight:800;display:none}
#genRecDot.on{display:block;animation:genBl 1s infinite}
@keyframes genBl{50%{opacity:.45}}
#genBot{bottom:0;flex-direction:column;gap:8px;padding:10px 10px calc(env(safe-area-inset-bottom,0px) + 10px);background:linear-gradient(#0000,#0f172ae6 22%)}
.genR{display:flex;gap:8px;align-items:stretch}
.genR button{border-radius:14px;font-weight:800;color:#fff;background:#ffffff26;min-height:48px;font-size:16px}
#genSeg{flex:1;min-width:0;text-align:center;color:#fff;line-height:1.15;display:flex;flex-direction:column;justify-content:center}
#genSeg small{font-size:12.5px;opacity:.85}
#genSeg b{font-size:26px;font-variant-numeric:tabular-nums}
#genPrev,#genNext{width:52px;font-size:20px}
#genMinus,#genPlus{flex:1;font-size:22px;min-height:62px;touch-action:none;user-select:none;-webkit-user-select:none}
#genMinus{background:#475569}#genPlus{background:#0369a1}
#genRec{width:76px;background:#dc2626;font-size:15px}
#genRec.on{background:#fff;color:#dc2626}
#genStepB{width:64px;font-size:13px}
#genTot{color:#fff;font-size:13px;text-align:center;opacity:.92}
#genTot .ov{color:#fca5a5;font-weight:800}
#genOut{position:fixed;inset:0;z-index:80;background:#000d;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px calc(16px + env(safe-area-inset-right,0px)) calc(20px + env(safe-area-inset-bottom,0px)) calc(16px + env(safe-area-inset-left,0px))}
#genOut.on{display:flex}
#genOut video{max-width:100%;max-height:60vh;border-radius:12px;background:#000}
#genOut .b{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
#genOut button,#genOut a{height:48px;border-radius:14px;padding:0 18px;font-weight:800;font-size:15px;background:#0369a1;color:#fff;text-decoration:none;display:flex;align-items:center}
#genOut .sub{background:#475569}
body.gen .toast{bottom:calc(env(safe-area-inset-bottom,0px) + 200px)}
#genOut p{color:#e2e8f0;font-size:13px;margin:0;text-align:center;max-width:420px;line-height:1.5}`;
 document.head.appendChild(css);
 const stg=$("#stage");
 const v=document.createElement("video");v.id="genVid";v.muted=true;v.setAttribute("muted","");v.setAttribute("playsinline","");v.setAttribute("autoplay","");
 stg.insertBefore(v,$("#cv"));
 const top=document.createElement("div");top.id="genTop";top.setAttribute("data-notr","");
 top.innerHTML=`<button id="genEnd">✕ 終了</button><button id="genGyro">📱 見回す</button><button id="genMic" aria-label="マイク（声も録る）">🎤</button><div id="genRecDot">● REC 0:00</div>`;
 stg.appendChild(top);
 const bot=document.createElement("div");bot.id="genBot";
 bot.innerHTML=`<div class="genR"><button id="genPrev" aria-label="前の直管">◀</button><div id="genSeg"></div><button id="genNext" aria-label="次の直管">▶</button></div>
<div class="genR"><button id="genMinus">− 10cm</button><button id="genPlus">＋ 10cm</button><button id="genStepB">単位<br>10cm</button><button id="genRec">⏺<br>録画</button></div>
<div id="genTot"></div>`;
 stg.appendChild(bot);
 const out=document.createElement("div");out.id="genOut";
 out.innerHTML=`<video id="genOutV" controls playsinline></video><p id="genOutMsg"></p><div class="b"><button id="genShare">📤 共有（LINEなど）</button><a id="genSave" download>💾 保存</a><button class="sub" id="genOutClose">閉じる</button></div>`;
 document.body.appendChild(out);
 const tb=document.createElement("button");tb.className="hb";tb.id="genBtn";tb.setAttribute("aria-label","現調モード（カメラで確認・録画）");
 tb.innerHTML=`<span style="font-size:22px;line-height:1">📹</span>`;
 const ar=$("#arBtn");ar.parentNode.insertBefore(tb,ar.nextSibling);
 tb.onclick=genOpen;
})();

function genSegText(){
 const rows=LR();sel=clamp(sel,0,rows.length-1);
 const r=rows[sel],c=calc();
 const nmx=(brOn()?legName(leg)+" ":"")+"直管"+nm(sel);
 return{r,c,nmx,ang:r.a?`（先で${r.a}°曲げ）`:""};
}
function genUI(){
 if(!GEN.on)return;
 const {r,c,nmx,ang}=genSegText();
 $("#genSeg").innerHTML=`<small>${nmx}${ang}　${sel+1}/${LR().length}</small><b>${fmt(r.l)}<small style="font-size:14px"> mm</small></b>`;
 const ov=c.tot>c.lim;
 $("#genTot").innerHTML=`合計 <b>${fmt(c.tot)}</b> mm ／ 上限 ${fmt(c.lim)}`+(ov?` <span class="ov">⚠️${fmt(c.tot-c.lim)}オーバー</span>`:"")+(st.goal?`　🎯${fmt(st.goal)}`:"");
 const s=GEN.step/10;
 $("#genMinus").textContent=`− ${s}cm`;$("#genPlus").textContent=`＋ ${s}cm`;$("#genStepB").innerHTML=`単位<br>${s}cm`;
}
function genBump(d){
 const r=LR()[sel];if(!r)return;
 const nl=Math.max(0,r.l+d*GEN.step);if(nl===r.l)return;
 r.l=nl;save(true);upd();genUI();
 try{navigator.vibrate&&navigator.vibrate(8)}catch(e){}
}
function genRepeat(btn,d){
 const stop=()=>{if(GEN.rep){clearTimeout(GEN.rep.t);clearInterval(GEN.rep.i);GEN.rep=null}};
 btn.addEventListener("pointerdown",e=>{e.preventDefault();stop();genBump(d);
  GEN.rep={t:setTimeout(()=>{GEN.rep.i=setInterval(()=>genBump(d),140)},450)}});
 ["pointerup","pointercancel","pointerleave"].forEach(t=>btn.addEventListener(t,stop));
 btn.addEventListener("contextmenu",e=>e.preventDefault());
}
genRepeat($("#genMinus"),-1);genRepeat($("#genPlus"),1);
$("#genStepB").onclick=()=>{GEN.step=GEN.step===100?10:100;genUI()};
$("#genPrev").onclick=()=>{
 if(sel>0){sel--;upd()}else if(brOn()){const ids=legIds();leg=ids[(ids.indexOf(leg)-1+ids.length)%ids.length];sel=LR().length-1;render()}
 genUI()};
$("#genNext").onclick=()=>{
 if(sel<LR().length-1){sel++;upd()}else if(brOn()){const ids=legIds();leg=ids[(ids.indexOf(leg)+1)%ids.length];sel=0;render()}
 genUI()};
$("#genEnd").onclick=genClose;
$("#genMic").onclick=()=>{if(GEN.rec){toast("録画中はマイクを切り替えられません");return}GEN.micOn=!GEN.micOn;$("#genMic").textContent=GEN.micOn?"🎤 ON":"🎤";toast(GEN.micOn?"声も一緒に録画します":"音なしで録画します");$("#genMic").classList.toggle("on",GEN.micOn)};
$("#genRec").onclick=()=>{GEN.rec?genRecStop():genRecStart()};
$("#genGyro").onclick=genGyroToggle;
$("#genOutClose").onclick=()=>{$("#genOut").classList.remove("on");const vv=$("#genOutV");vv.pause()};

async function genOpen(){
 if(!T)return;
 GEN.on=true;GEN.wasFull=!!T.full;
 if(!T.full)setFull(true);
 $("#stage").classList.add("genmode");document.body.classList.add("gen");
 GEN.fov0=T.cam.fov;T.cam.fov=60;T.cam.updateProjectionMatrix();T.dirty=true;
 genUI();
 const v=$("#genVid");
 try{
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error("no gum");
  GEN.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1080}},audio:false});
  if(!GEN.on){GEN.stream.getTracks().forEach(t=>t.stop());GEN.stream=null;return}
  v.srcObject=GEN.stream;await v.play().catch(()=>{});
  toast("＋／−で選んだ直管が伸び縮みします。📱見回すでスマホの向きに合わせて回ります");
 }catch(e){
  console.warn(e);
  toast("カメラが使えませんでした（設定→Safari→カメラ を「許可」に）。3Dだけで操作・録画はできます");
 }
}
function genClose(){
 if(GEN.rec)genRecStop();
 GEN.on=false;
 if(GEN.gyro)genGyroOff();
 if(GEN.stream){GEN.stream.getTracks().forEach(t=>t.stop());GEN.stream=null}
 const v=$("#genVid");v.pause();v.srcObject=null;
 $("#stage").classList.remove("genmode");document.body.classList.remove("gen");
 T.cam.fov=GEN.fov0;T.cam.updateProjectionMatrix();T.custom=null;
 if(APP==="genchou"){location.href="index.html";return}
 if(!GEN.wasFull)setFull(false);
 render();T.dirty=true;
}

/* 📱 見回す：スマホの傾き・向き（ジャイロ）でカメラの向きを動かす。左右の向きは押した時の3Dの向きに合わせる */
const GY={q:new THREE.Quaternion(),e:new THREE.Euler(),q1:new THREE.Quaternion(-Math.sqrt(.5),0,0,Math.sqrt(.5)),qz:new THREE.Quaternion(),yaw:null,pos:null,h0:null,d0:0,th0:0,on:null};
function genGyroQ(ev){
 const r=THREE.MathUtils.degToRad,ori=r((screen.orientation&&screen.orientation.angle)||window.orientation||0);
 GY.e.set(r(ev.beta||0),r(ev.alpha||0),-r(ev.gamma||0),"YXZ");
 GY.q.setFromEuler(GY.e);GY.q.multiply(GY.q1);GY.q.multiply(GY.qz.setFromAxisAngle(new THREE.Vector3(0,0,1),-ori));
 return GY.q;
}
function genGyroEv(ev){
 if(ev.alpha==null&&ev.beta==null)return;
 const V=THREE.Vector3,q=genGyroQ(ev),fd=new V(0,0,-1).applyQuaternion(q);
 if(GY.yaw===null){
  const fc=new V(0,0,-1).applyQuaternion(T.cam.quaternion);
  GY.yaw=Math.atan2(fc.x,fc.z)-Math.atan2(fd.x,fd.z);
  GY.pos=T.cam.position.clone();GY.h0=new V(fc.x,0,fc.z);if(GY.h0.lengthSq()<1e-6)GY.h0.set(0,0,-1);GY.h0.normalize();
  GY.d0=T.dist;GY.th0=T.th;
 }
 const yaw=GY.yaw-(T.th-GY.th0);   // 1本指で左右になぞると、模型の向きを回せる
 const Q=new THREE.Quaternion().setFromAxisAngle(new V(0,1,0),yaw).multiply(q);
 const fw=new V(0,0,-1).applyQuaternion(Q),up=new V(0,1,0).applyQuaternion(Q);
 const pos=GY.pos.clone().addScaledVector(GY.h0,GY.d0-T.dist);   // 2本指で広げる＝前に進む
 T.custom={pos,tg:pos.clone().addScaledVector(fw,Math.max(100,T.dist)),up};T.dirty=true;
}
async function genGyroToggle(){
 if(GEN.gyro){genGyroOff();toast("見回すをオフにしました（指で回せます）");return}
 try{
  if(typeof DeviceOrientationEvent!=="undefined"&&typeof DeviceOrientationEvent.requestPermission==="function"){
   const p=await DeviceOrientationEvent.requestPermission();
   if(p!=="granted"){toast("向きのセンサーが許可されませんでした");return}
  }
 }catch(e){toast("向きのセンサーが使えませんでした");return}
 GY.yaw=null;GY.on=genGyroEv;window.addEventListener("deviceorientation",GY.on);
 GEN.gyro=true;$("#genGyro").classList.add("on");
 toast("今の向きを正面にしました。スマホを動かして見回せます（2本指で前後に進む）");
}
function genGyroOff(){
 if(GY.on)window.removeEventListener("deviceorientation",GY.on);GY.on=null;
 GEN.gyro=false;$("#genGyro").classList.remove("on");
 T.custom=null;T.dirty=true;
}

/* ⏺ 録画：カメラ映像＋3D＋寸法の文字を1枚の絵にまとめて動画にする */
function genRecMime(){
 if(typeof MediaRecorder==="undefined")return null;
 const c=["video/mp4;codecs=avc1","video/mp4","video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];
 for(const m of c){try{if(MediaRecorder.isTypeSupported(m))return m}catch(e){}}
 return "";
}
async function genRecStart(){
 const mime=genRecMime();
 if(mime===null){toast("このブラウザは録画に対応していません。iPhoneの「画面収録」を使ってください");return}
 const cv=$("#cv"),w=cv.width&~1,h=cv.height&~1;
 if(!GEN.cvs)GEN.cvs=document.createElement("canvas");
 GEN.cvs.width=w;GEN.cvs.height=h;GEN.ctx=GEN.cvs.getContext("2d");
 let stream;
 try{stream=GEN.cvs.captureStream(30)}catch(e){toast("録画を始められませんでした");return}
 if(GEN.micOn){
  try{GEN.mic=await navigator.mediaDevices.getUserMedia({audio:true,video:false});GEN.mic.getAudioTracks().forEach(t=>stream.addTrack(t))}
  catch(e){toast("マイクが使えないので、音なしで録画します")}
 }
 genRecDraw();
 let rec;
 try{rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:5e6}:{})}catch(e){try{rec=new MediaRecorder(stream)}catch(e2){toast("録画を始められませんでした");return}}
 GEN.chunks=[];GEN.rec=rec;GEN.t0=Date.now();
 rec.ondataavailable=e=>{if(e.data&&e.data.size)GEN.chunks.push(e.data)};
 rec.onstop=()=>{
  const type=(rec.mimeType||mime||"video/mp4").split(";")[0];
  const blob=new Blob(GEN.chunks,{type});GEN.chunks=[];
  if(GEN.mic){GEN.mic.getTracks().forEach(t=>t.stop());GEN.mic=null}
  genShowOut(blob,type);
 };
 window.__genRec=genRecDraw;rec.start(1000);
 $("#genRec").classList.add("on");$("#genRec").innerHTML="⏹<br>停止";$("#genRecDot").classList.add("on");
 GEN.tick=setInterval(()=>{const s=Math.floor((Date.now()-GEN.t0)/1000);$("#genRecDot").textContent=`● REC ${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;T.dirty=true},250);
 T.dirty=true;
}
function genRecStop(){
 const rec=GEN.rec;if(!rec)return;GEN.rec=null;window.__genRec=null;
 clearInterval(GEN.tick);
 try{rec.stop()}catch(e){}
 $("#genRec").classList.remove("on");$("#genRec").innerHTML="⏺<br>録画";$("#genRecDot").classList.remove("on");$("#genRecDot").textContent="● REC 0:00";
}
/* loop() の描画直後に呼ぶ（WebGLの絵が消える前に写す） */
function genRecDraw(){
 const x=GEN.ctx,cv=$("#cv"),W=GEN.cvs.width,H=GEN.cvs.height,v=$("#genVid");
 x.fillStyle="#000";x.fillRect(0,0,W,H);
 if(v.videoWidth&&v.readyState>=2){
  const s=Math.max(W/v.videoWidth,H/v.videoHeight),dw=v.videoWidth*s,dh=v.videoHeight*s;
  x.drawImage(v,(W-dw)/2,(H-dh)/2,dw,dh);
 }
 x.drawImage(cv,0,0,W,H);
 /* 文字：上＝日時・現場、下＝選んだ直管と合計 */
 const k=W/400,pad=10*k;
 const {r,c,nmx,ang}=genSegText(),i=st.info;
 const d=new Date(),ds=`${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`;
 const t1=[ds,i.site&&"🏢"+i.site,i.line&&"🔢"+i.line,i.kind&&(i.kind==="液"?"液管":"ガス管")+" "+SIZES[legSize(leg)][0]].filter(Boolean).join("  ");
 x.font=`700 ${13*k}px -apple-system,"Hiragino Sans",sans-serif`;x.textBaseline="middle";
 const w1=x.measureText(t1).width;
 x.fillStyle="#0f172acc";x.fillRect(pad,pad,w1+pad*1.6,26*k);x.fillStyle="#fff";x.fillText(t1,pad*1.8,pad+13*k);
 const bh=64*k,by=H-bh-pad;
 x.fillStyle="#0f172ad9";x.fillRect(pad,by,W-pad*2,bh);
 x.fillStyle="#fff";x.font=`700 ${13*k}px -apple-system,"Hiragino Sans",sans-serif`;x.fillText(nmx+ang,pad*2,by+15*k);
 x.font=`800 ${26*k}px -apple-system,"Hiragino Sans",sans-serif`;x.fillText(fmt(r.l)+" mm",pad*2,by+42*k);
 const ov=c.tot>c.lim,t2="合計 "+fmt(c.tot)+" mm"+(ov?" ⚠️オーバー":"");
 x.font=`700 ${14*k}px -apple-system,"Hiragino Sans",sans-serif`;x.textAlign="right";x.fillStyle=ov?"#fca5a5":"#fff";x.fillText(t2,W-pad*2,by+42*k);x.textAlign="left";
}
function genShowOut(blob,type){
 const ext=type.indexOf("mp4")>=0?"mp4":"webm",d=new Date(),p=n=>String(n).padStart(2,"0");
 const name=`現調_${(st.info.site||"").replace(/[\\/:*?"<>|\s]/g,"")||"配管"}_${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
 const url=URL.createObjectURL(blob);
 if(GEN.outUrl)URL.revokeObjectURL(GEN.outUrl);GEN.outUrl=url;
 const vv=$("#genOutV");vv.src=url;
 const a=$("#genSave");a.href=url;a.download=name;
 const file=new File([blob],name,{type});
 const canShare=!!(navigator.canShare&&navigator.canShare({files:[file]}));
 $("#genShare").style.display=canShare?"":"none";
 $("#genOutMsg").textContent=canShare?"「共有」→ LINE や「ビデオを保存」で写真アプリに入れられます":"「保存」で動画を開いて、共有ボタンから保存・送信してください";
 $("#genShare").onclick=async()=>{try{await navigator.share({files:[file],title:name})}catch(e){if(e&&e.name!=="AbortError")toast("共有できませんでした。「保存」を使ってください")}};
 $("#genOut").classList.add("on");
}
