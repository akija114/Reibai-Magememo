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
.stage.genmode.gencam{background:#000}
.stage.genmode .hud,.stage.genmode .tools,.stage.genmode .suppill,.stage.genmode .toolsTab,.stage.genmode .infoTab,.stage.genmode .uitog,.stage.genmode .stinfo,.stage.genmode .hint,.stage.genmode #photoBg{display:none!important}
#genVid{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;display:none;pointer-events:none;background:#000}
.stage.genmode.gencam #genVid{display:block}
#genTop,#genBot{position:absolute;left:0;right:0;z-index:4;display:none;font-family:-apple-system,"Hiragino Sans",sans-serif}
.stage.genmode #genTop,.stage.genmode #genBot{display:flex}
#genTop{top:calc(env(safe-area-inset-top,0px) + 8px);padding:0 10px;gap:6px;align-items:center;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}#genTop::-webkit-scrollbar{display:none}
#genTop button{flex:none;height:40px;border-radius:20px;padding:0 11px;background:#0f172acc;color:#fff;font-size:14px;font-weight:700;white-space:nowrap}
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
#genRec{width:62px;background:#dc2626;font-size:14px}#genPhoto{width:58px;background:#0f766e;font-size:14px}
#genSleep{position:absolute;inset:0;z-index:5;display:none;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:#0f172ae6;color:#fff;text-align:center;padding:24px;font-weight:800}
#genSleep.on{display:flex}#genSleep b{font-size:20px}#genSleep span{font-size:14px;opacity:.85;font-weight:600;line-height:1.6}
#genStart{position:absolute;inset:0;z-index:6;display:none;flex-direction:column;justify-content:center;gap:12px;padding:24px 18px calc(env(safe-area-inset-bottom,0px) + 24px);background:#0f172af2;color:#fff}
#genStart.on{display:flex}#genStart h2{margin:0 0 6px;font-size:22px;text-align:center}
#genStart button{min-height:76px;border-radius:16px;background:#ffffff1f;color:#fff;text-align:left;padding:10px 16px;font-size:17px;font-weight:800;line-height:1.35}
#genStart button small{display:block;font-size:12.5px;font-weight:600;opacity:.85}
#genStart button.main{background:#0369a1}
#genRec.on{background:#fff;color:#dc2626}
#genStepB{width:54px;font-size:12.5px}
#genTot{color:#fff;font-size:13px;text-align:center;opacity:.92}
#genTot .ov{color:#fca5a5;font-weight:800}
#genOut{position:fixed;inset:0;z-index:80;background:#000d;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:20px calc(16px + env(safe-area-inset-right,0px)) calc(20px + env(safe-area-inset-bottom,0px)) calc(16px + env(safe-area-inset-left,0px))}
#genOut.on{display:flex}
#genOut video,#genOut img{max-width:100%;max-height:60vh;border-radius:12px;background:#000}
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
 top.innerHTML=`<button id="genEnd">✕ 終了</button><button id="genCam">📷 カメラ</button><button id="genGyro">📱 見回す</button><button id="genMic" aria-label="マイク（声も録る）">🎤</button><div id="genRecDot">● REC 0:00</div>`;
 stg.appendChild(top);
 const bot=document.createElement("div");bot.id="genBot";
 bot.innerHTML=`<div class="genR"><button id="genPrev" aria-label="前の直管">◀</button><div id="genSeg"></div><button id="genNext" aria-label="次の直管">▶</button></div>
<div class="genR"><button id="genMinus">− 10cm</button><button id="genPlus">＋ 10cm</button><button id="genStepB">単位<br>10cm</button><button id="genPhoto">📷<br>写真</button><button id="genRec">⏺<br>動画</button></div>
<div id="genTot"></div>`;
 stg.appendChild(bot);
 const sl=document.createElement("div");sl.id="genSleep";sl.innerHTML=`<b>💤 電池を守るため、カメラを止めました</b><span>しばらく触っていない時・ほかのアプリに切り替えた時は、自動で止まります。<br>タップで再開します。</span>`;stg.appendChild(sl);
 sl.onclick=()=>{sl.classList.remove("on");genCamOn()};
 const out=document.createElement("div");out.id="genOut";
 out.innerHTML=`<video id="genOutV" controls playsinline></video><img id="genOutI" alt="撮った写真"><p id="genOutMsg"></p><div class="b"><button id="genShare">📤 共有（LINEなど）</button><a id="genSave" download>💾 保存</a><button class="sub" id="genOutClose">閉じる</button></div>`;
 document.body.appendChild(out);
 const tb=document.createElement("button");tb.className="hb";tb.id="genBtn";tb.setAttribute("aria-label","現調モード（カメラで確認・録画）");
 tb.innerHTML=`<span style="font-size:22px;line-height:1">📹</span>`;
 const ar=$("#arBtn");ar.parentNode.insertBefore(tb,ar.nextSibling);
 tb.onclick=()=>genOpen({cam:true});
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
$("#genPhoto").onclick=genPhoto;
$("#genCam").onclick=()=>{GEN.stream?genCamOff(true):genCamOn()};
$("#genGyro").onclick=genGyroToggle;
$("#genOutClose").onclick=()=>{$("#genOut").classList.remove("on");const vv=$("#genOutV");vv.pause()};

/* 開くだけではカメラも録画も始めない。カメラは「📷 カメラ」、撮るのは「📷 写真」「⏺ 動画」を押した時だけ */
async function genOpen(opt){
 if(!T)return;opt=opt||{};
 GEN.on=true;GEN.wasFull=!!T.full;GEN.lastT=Date.now();
 if(!T.full)setFull(true);
 $("#stage").classList.add("genmode");document.body.classList.add("gen");
 GEN.fov0=T.cam.fov;T.cam.fov=60;T.cam.updateProjectionMatrix();
 /* 電池・熱対策：3Dの細かさを少し落とす（見た目はほぼ同じ） */
 try{T.rd.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));sizeT()}catch(e){}
 T.dirty=true;genUI();
 clearInterval(GEN.idle);GEN.idle=setInterval(genIdleCheck,15000);
 if(opt.cam)await genCamOn();else genCamUI();
}
async function genCamOn(){
 const v=$("#genVid");$("#genSleep").classList.remove("on");GEN.lastT=Date.now();
 if(GEN.stream){genCamUI();return}
 try{
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error("no gum");
  /* 1280×720・30コマまで（フルHDより電池と熱がかなり楽） */
  GEN.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}},audio:false});
  if(!GEN.on){GEN.stream.getTracks().forEach(t=>t.stop());GEN.stream=null;return}
  v.srcObject=GEN.stream;await v.play().catch(()=>{});
  toast("カメラを出しました。撮る時は「📷 写真」か「⏺ 動画」を押してください");
 }catch(e){
  console.warn(e);GEN.stream=null;
  toast("カメラが使えませんでした（設定→Safari→カメラ を「許可」に）。3Dだけで見られます");
 }
 genCamUI()}
function genCamOff(byUser){
 if(GEN.rec)genRecStop();
 if(GEN.stream){GEN.stream.getTracks().forEach(t=>t.stop());GEN.stream=null}
 const v=$("#genVid");try{v.pause()}catch(e){}v.srcObject=null;
 if(GEN.gyro)genGyroOff();
 genCamUI();if(byUser)toast("カメラを止めました（機械と配管だけ表示）")}
function genCamUI(){const on=!!GEN.stream,b=$("#genCam");if(b){b.classList.toggle("on",on);b.textContent=on?"📷 カメラON":"📷 カメラ"}$("#stage").classList.toggle("gencam",on)}
/* しばらく触っていない（3分）・アプリを切り替えた → カメラを止める */
function genSleep(){if(!GEN.on||!GEN.stream)return;genCamOff();$("#genSleep").classList.add("on")}
function genIdleCheck(){if(!GEN.on)return;if(!GEN.rec&&GEN.stream&&Date.now()-GEN.lastT>180000)genSleep()}
document.addEventListener("pointerdown",()=>{GEN.lastT=Date.now()},true);
document.addEventListener("visibilitychange",()=>{if(document.hidden&&GEN.on){if(GEN.rec)genRecStop();genSleep()}});
function genClose(){
 if(GEN.rec)genRecStop();
 GEN.on=false;
 if(GEN.gyro)genGyroOff();
 if(GEN.stream){GEN.stream.getTracks().forEach(t=>t.stop());GEN.stream=null}clearInterval(GEN.idle);
 const v=$("#genVid");v.pause();v.srcObject=null;$("#genSleep").classList.remove("on");
 try{T.rd.setPixelRatio(Math.min(window.devicePixelRatio||1,2));sizeT()}catch(e){}
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
 {const n=performance.now();if(n-(GY.t||0)<33)return;GY.t=n}   // 1秒に30回まで（電池対策）
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
 genCvs();
 let stream;
 try{stream=GEN.cvs.captureStream(24)}catch(e){toast("録画を始められませんでした");return}
 if(GEN.micOn){
  try{GEN.mic=await navigator.mediaDevices.getUserMedia({audio:true,video:false});GEN.mic.getAudioTracks().forEach(t=>stream.addTrack(t))}
  catch(e){toast("マイクが使えないので、音なしで録画します")}
 }
 genRecDraw();
 let rec;
 try{rec=new MediaRecorder(stream,mime?{mimeType:mime,videoBitsPerSecond:2.5e6}:{})}catch(e){try{rec=new MediaRecorder(stream)}catch(e2){toast("録画を始められませんでした");return}}
 GEN.chunks=[];GEN.rec=rec;GEN.t0=Date.now();
 rec.ondataavailable=e=>{if(e.data&&e.data.size)GEN.chunks.push(e.data)};
 rec.onstop=()=>{
  const type=(rec.mimeType||mime||"video/mp4").split(";")[0];
  const blob=new Blob(GEN.chunks,{type});GEN.chunks=[];
  if(GEN.mic){GEN.mic.getTracks().forEach(t=>t.stop());GEN.mic=null}
  genShowOut(blob,type);
 };
 window.__genRec=genFrame;rec.start(1000);
 $("#genRec").classList.add("on");$("#genRec").innerHTML="⏹<br>停止";GEN.lastT=Date.now();$("#genRecDot").classList.add("on");
 GEN.tick=setInterval(()=>{const s=Math.floor((Date.now()-GEN.t0)/1000);$("#genRecDot").textContent=`● REC ${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;T.dirty=true},250);
 T.dirty=true;
}
function genRecStop(){
 const rec=GEN.rec;if(!rec)return;GEN.rec=null;if(!GEN.shot)window.__genRec=null;
 clearInterval(GEN.tick);
 try{rec.stop()}catch(e){}
 $("#genRec").classList.remove("on");$("#genRec").innerHTML="⏺<br>動画";$("#genRecDot").classList.remove("on");$("#genRecDot").textContent="● REC 0:00";
}
function genCvs(){const cv=$("#cv"),w=cv.width&~1,h=cv.height&~1;if(!GEN.cvs)GEN.cvs=document.createElement("canvas");if(GEN.cvs.width!==w||GEN.cvs.height!==h){GEN.cvs.width=w;GEN.cvs.height=h}GEN.ctx=GEN.cvs.getContext("2d")}
/* 3Dを描いた直後に1回だけ呼ばれる：動画の1コマを描く・写真ならその絵を保存 */
function genFrame(){genRecDraw();if(GEN.shot){GEN.shot=false;const c=GEN.cvs;c.toBlob(b=>{if(b)genShowOut(b,"image/jpeg");else toast("写真を撮れませんでした")},"image/jpeg",0.9);if(!GEN.rec)window.__genRec=null}}
function genPhoto(){genCvs();GEN.shot=true;window.__genRec=genFrame;T.dirty=true;try{navigator.vibrate&&navigator.vibrate(20)}catch(e){}}
/* loop() の描画直後に呼ぶ（WebGLの絵が消える前に写す） */
function genRecDraw(){
 const x=GEN.ctx,cv=$("#cv"),W=GEN.cvs.width,H=GEN.cvs.height,v=$("#genVid");
 const camOn=!!(GEN.stream&&v.videoWidth&&v.readyState>=2);
 x.fillStyle=camOn?"#000":"#e0f2fe";x.fillRect(0,0,W,H);   // カメラなしの時は、いつもの3Dの背景色
 if(camOn){
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
 const img=type.indexOf("image")===0,ext=img?"jpg":type.indexOf("mp4")>=0?"mp4":"webm",d=new Date(),p=n=>String(n).padStart(2,"0");
 const name=`現調_${(st.info.site||"").replace(/[\\/:*?"<>|\s]/g,"")||"配管"}_${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
 const url=URL.createObjectURL(blob);
 if(GEN.outUrl)URL.revokeObjectURL(GEN.outUrl);GEN.outUrl=url;
 const vv=$("#genOutV"),im=$("#genOutI");vv.style.display=img?"none":"";im.style.display=img?"":"none";if(img){vv.removeAttribute("src");im.src=url}else vv.src=url;
 const a=$("#genSave");a.href=url;a.download=name;
 const file=new File([blob],name,{type});
 const canShare=!!(navigator.canShare&&navigator.canShare({files:[file]}));
 $("#genShare").style.display=canShare?"":"none";
 $("#genOutMsg").textContent=canShare?"「共有」→ LINE や「"+(img?"画像":"ビデオ")+"を保存」で写真アプリに入れられます":"「保存」で開いて、共有ボタンから保存・送信してください";
 $("#genShare").onclick=async()=>{try{await navigator.share({files:[file],title:name})}catch(e){if(e&&e.name!=="AbortError")toast("共有できませんでした。「保存」を使ってください")}};
 $("#genOut").classList.add("on");
}

/* ===== 📍 2点でルート（カメラの画面の中だけ・iPhoneでも）：①天井の室内機の真ん中をタップ ②穴の真下の床 ③穴（高さ）→ ルートの案（2026-10-27 ユーザー：全部AR上で・2か所決めたら簡単に）
   iPhoneのブラウザは床や天井を見つけられないので、スマホの傾き（genGyroQ）と「天井の高さ」「スマホを持つ高さ」から、タップした所の位置を計算する（立ったまま動かない）。
   長さはだいたい。「決める」で曲げの行（st.rows）に入れる（最初の横の向きを +x に回して gPolyRows） ===== */
function gPolyRows(P){
 const V=THREE.Vector3;let d=new V(1,0,0),u=new V(0,1,0),r=new V(0,0,1);const rows=[];
 for(let i=0;i<P.length-1;i++){const seg=P[i+1].clone().sub(P[i]),l=Math.round(seg.length());let a=0,t=0;
  if(i<P.length-2){const d1=seg.clone().normalize(),d2=P[i+2].clone().sub(P[i+1]).normalize(),c=Math.max(-1,Math.min(1,d1.dot(d2)));a=Math.round(Math.acos(c)*180/Math.PI);
   if(a>0){const b=d2.clone().addScaledVector(d1,-c).normalize();t=normT(Math.round(Math.atan2(b.dot(r),b.dot(u))*180/Math.PI));
    const ax=d1.clone().cross(d2).normalize(),ang=Math.acos(c);u=u.clone().applyAxisAngle(ax,ang);r=r.clone().applyAxisAngle(ax,ang);d=d2.clone()}}
  rows.push({l,a:ANG.includes(a)?a:(a>60?90:45),t,o:false})}
 return rows;
}
const AR2={ch:2600,ph:1400,fov:62};try{Object.assign(AR2,JSON.parse(localStorage.getItem("pbm_ar2")||"{}"))}catch(e){}
async function ar2Start(){
 try{if(typeof DeviceOrientationEvent!=="undefined"&&typeof DeviceOrientationEvent.requestPermission==="function"){const p=await DeviceOrientationEvent.requestPermission();if(p!=="granted"){toast("向きのセンサーが許可されませんでした");return}}}catch(e){toast("向きのセンサーが使えませんでした");return}
 let stream=null;try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},audio:false})}catch(e){toast("カメラが使えませんでした");return}
 if(st.gnd&&st.gnd.ch)AR2.ch=st.gnd.ch;
 const V=THREE.Vector3,ov=document.createElement("div");ov.id="ar2";ov.style.cssText="position:fixed;inset:0;z-index:400;background:#000;font-family:-apple-system,'Hiragino Sans',sans-serif;touch-action:none";
 ov.innerHTML=`<video id="ar2v" playsinline muted autoplay style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover"></video><canvas id="ar2c" style="position:absolute;inset:0;width:100%;height:100%"></canvas>
  <div id="ar2t" style="position:absolute;left:8px;right:8px;top:calc(env(safe-area-inset-top,0px) + 8px);background:#0f172add;color:#fff;border-radius:14px;padding:10px 12px;font-size:15px;font-weight:800;line-height:1.45"></div>
  <div id="ar2aim" style="position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border:2px solid #fbbf24;border-radius:50%;pointer-events:none"></div>
  <div id="ar2b" style="position:absolute;left:8px;right:8px;bottom:calc(env(safe-area-inset-bottom,0px) + 10px);display:flex;flex-direction:column;gap:6px"></div>`;
 document.body.appendChild(ov);const vid=ov.querySelector("#ar2v");vid.srcObject=stream;try{await vid.play()}catch(e){}
 const cv=ov.querySelector("#ar2c"),R=new THREE.WebGLRenderer({canvas:cv,alpha:true,antialias:true,preserveDrawingBuffer:true});R.setPixelRatio(Math.min(2,devicePixelRatio||1));
 const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(AR2.fov,1,10,60000);sc.add(new THREE.HemisphereLight(0xffffff,0x667788,1.0));
 const size=()=>{R.setSize(innerWidth,innerHeight,false);cam.aspect=innerWidth/innerHeight;cam.fov=AR2.fov;cam.updateProjectionMatrix()};size();addEventListener("resize",size);
 const X={step:1,U:null,F:null,h:AR2.ch+200,pick:0,routes:[],q:null,m:"",th:0,lock:false,pan:false,chTap:false},grp=new THREE.Group();sc.add(grp);
 /* 室内機の機種（2026-10-28 ユーザー：機械を選べる・配管は機種の配管の口から・回して決めたら固定・パネルだけ／全体）。模型は曲げ共有と同じ makeUnit の cas2（原点＝配管の口） */
 const C2=typeof CAS2M!=="undefined"?CAS2M:{};try{X.m=localStorage.getItem("pbm_ar2m")||""}catch(e){}if(!C2[X.m])X.m=C2[st.units.ms]?st.units.ms:(Object.keys(C2)[0]||"");
 let UG=null,UGm="";const unitG=()=>{if(!X.m||!C2[X.m]||typeof makeUnit!=="function")return null;if(UG&&UGm===X.m)return UG;
  try{const mk=makeUnit("cas2",{kind:st.info.kind,mm:X.m}),g=mk.g;g.traverse(o=>{if(o.userData&&(o.userData.dimcat||o.userData.lab)||o.isSprite)o.visible=false});UG={g,ceil:mk.c2.ceil};UGm=X.m}catch(e){console.warn(e);UG=null}return UG};
 const md=C2[X.m]||{L:840,W:840,H:250},cu=new THREE.MeshStandardMaterial({color:0xc2703a,metalness:.35,roughness:.4});
 /* 室内機を置く：天井の真ん中＝①の床の点の真上・天井の高さ。配管の口（模型の原点）を返す */
 const placeU=()=>{const u=unitG();if(!u||!X.U)return null;const g=u.g;g.rotation.set(0,X.th*Math.PI/180,0);g.position.set(0,0,0);g.updateMatrixWorld(true);const c=g.localToWorld(new V(...u.ceil));g.position.set(X.U.x-c.x,AR2.ch-c.y,X.U.z-c.z);g.updateMatrixWorld(true);
  g.traverse(o=>{if(!o.isMesh||(o.userData&&o.userData.dimcat))return;if(!X.pan){o.visible=true;return}const b=new THREE.Box3().setFromObject(o),cy=(b.min.y+b.max.y)/2;o.visible=cy<AR2.ch+5});   // パネルだけ：天井より下の物だけ
  return g};
 const portDir=()=>new V(Math.cos(X.th*Math.PI/180),0,-Math.sin(X.th*Math.PI/180));   // 配管の口から出る向き（模型の +x）
 const onOri=ev=>{if(ev.alpha==null&&ev.beta==null)return;X.q=genGyroQ(ev).clone()};addEventListener("deviceorientation",onOri);
 const ray=(cx,cy)=>{cam.position.set(0,AR2.ph,0);if(X.q)cam.quaternion.copy(X.q);cam.updateMatrixWorld();const rc=new THREE.Raycaster();rc.setFromCamera({x:cx/innerWidth*2-1,y:-(cy/innerHeight)*2+1},cam);return rc.ray};
 const hitY=(r,y)=>{if(Math.abs(r.direction.y)<1e-4)return null;const t=(y-r.origin.y)/r.direction.y;return t>0?r.origin.clone().addScaledVector(r.direction,t):null};
 const save2=()=>{try{localStorage.setItem("pbm_ar2",JSON.stringify({ch:AR2.ch,ph:AR2.ph,fov:AR2.fov}))}catch(e){}};
 /* ルートの案：天井の中（天井＋150）を通る。室内機の真上から出て、横に進み、穴の所で穴の高さへ。L字は始めた時の向き（スマホを向けた正面）にそろえる */
 const mkRoutes=()=>{const U=X.U,F=X.F;if(!U||!F)return[];const g=placeU(),P0=g?g.position.clone():null,P1=P0?P0.clone().addScaledVector(portDir(),300):null;   // 機種がある時は配管の口から、口の向きに300出してから
  const y0=P0?P0.y:AR2.ch+150,A=P1||new V(U.x,y0,U.z),H=new V(F.x,X.h,F.z),E=new V(F.x,y0,F.z),out=[],pre=P0?[P0]:[];
  const add=(nm,P)=>{const Q=[];P.forEach(p=>{const l=Q[Q.length-1];if(!l||l.distanceTo(p)>30)Q.push(p.clone())});for(let i=1;i+1<Q.length;i++){const a=Q[i].clone().sub(Q[i-1]).normalize(),b=Q[i+1].clone().sub(Q[i]).normalize();if(a.dot(b)>0.999){Q.splice(i,1);i--}}
   let L=0,back=false;for(let i=1;i<Q.length;i++)L+=Q[i].distanceTo(Q[i-1]);for(let i=1;i+1<Q.length;i++){const a=Q[i].clone().sub(Q[i-1]).normalize(),b=Q[i+1].clone().sub(Q[i]).normalize();if(a.dot(b)<-0.99)back=true}out.push({nm,P:Q,L,n:Math.max(0,Q.length-2),back})};   // back：口から出てすぐ真後ろへ折り返す（口の向きが穴と反対）
  add("L字（先に奥へ）",[...pre,A,new V(A.x,y0,E.z),E,H]);add("L字（先に横へ）",[...pre,A,new V(E.x,y0,A.z),E,H]);add("まっすぐ（ななめ）",[...pre,A,E,H]);
  return out};
 const drawAll=forQL=>{while(grp.children.length)grp.remove(grp.children[0]);const tube=(a,b,r,m)=>{const l=a.distanceTo(b);if(l<1)return;const c=new THREE.Mesh(new THREE.CylinderGeometry(r,r,l,14),m);c.position.copy(a).add(b).multiplyScalar(.5);c.quaternion.setFromUnitVectors(new V(0,1,0),b.clone().sub(a).normalize());grp.add(c)};
  if(X.U){const ug=placeU();if(ug)grp.add(ug);else{const b=new THREE.Mesh(new THREE.BoxGeometry(md.L,md.H,md.W),new THREE.MeshStandardMaterial({color:0xf1f5f9,transparent:true,opacity:.85}));b.position.set(X.U.x,AR2.ch+md.H/2-40,X.U.z);if(!X.pan)grp.add(b);
   const p=new THREE.Mesh(new THREE.BoxGeometry(md.L+80,20,md.W+80),new THREE.MeshStandardMaterial({color:0xffffff}));p.position.set(X.U.x,AR2.ch-10,X.U.z);grp.add(p)}
   const rm2=new THREE.MeshBasicMaterial({color:0xef4444});[[400,24],[24,400]].forEach(([a,b2])=>{const c=new THREE.Mesh(new THREE.BoxGeometry(a,4,b2),rm2);c.position.set(X.U.x,3,X.U.z);grp.add(c)});   // 床の芯：十字
   tube(new V(X.U.x,0,X.U.z),new V(X.U.x,AR2.ch,X.U.z),5,new THREE.MeshBasicMaterial({color:0xfbbf24}))}
  if(X.U&&X.F){const a=new V(X.U.x,2,X.U.z),b2=new V(X.F.x,2,X.F.z),n=Math.max(1,Math.round(a.distanceTo(b2)/250));for(let i=0;i<n;i+=2)tube(a.clone().lerp(b2,i/n),a.clone().lerp(b2,Math.min(1,(i+1)/n)),8,new THREE.MeshBasicMaterial({color:0xf59e0b}))}   // 床の点線：室内機 → 穴
  if(X.F){const rm=new THREE.MeshBasicMaterial({color:0xef4444});const ring=new THREE.Mesh(new THREE.TorusGeometry(70,12,8,28),rm);ring.rotation.x=Math.PI/2;ring.position.set(X.F.x,4,X.F.z);grp.add(ring);
   tube(new V(X.F.x,0,X.F.z),new V(X.F.x,X.h,X.F.z),6,new THREE.MeshBasicMaterial({color:0xfbbf24}));const hole=new THREE.Mesh(new THREE.TorusGeometry(60,14,8,28),rm);hole.position.set(X.F.x,X.h,X.F.z);grp.add(hole)}
  const r=X.routes[X.pick];if(r)for(let i=1;i<r.P.length;i++){tube(r.P[i-1],r.P[i],20,cu);const s2=new THREE.Mesh(new THREE.SphereGeometry(26,12,8),cu);s2.position.copy(r.P[i]);grp.add(s2)}
  /* だいたいの寸法（2026-10-28 ユーザー）：カメラの画面は文字の札、床に固定（ql）は数字の形 */
  dims().forEach(([t,p])=>grp.add(forQL?numMesh(t,p):lab(t,p)))};
 const dims=()=>{const D=[],r=X.routes[X.pick],k=v=>Math.round(v/10)*10;if(X.U)D.push(["天井 "+fmt(AR2.ch),new V(X.U.x,AR2.ch*0.55,X.U.z)]);
  if(X.F&&X.step>=3)D.push(["穴 床から "+fmt(X.h),new V(X.F.x,X.h+220,X.F.z)]);if(X.U&&X.F)D.push(["床で "+fmt(k(Math.hypot(X.F.x-X.U.x,X.F.z-X.U.z))),new V((X.U.x+X.F.x)/2,120,(X.U.z+X.F.z)/2)]);
  if(r)for(let i=1;i<r.P.length;i++){const a=r.P[i-1],b=r.P[i],l=a.distanceTo(b);if(l<150)continue;D.push([fmt(k(l)),a.clone().add(b).multiplyScalar(.5).add(new V(0,120,0))])}return D};
 const lab=(t,p)=>{const c=document.createElement("canvas"),x=c.getContext("2d");x.font="800 44px -apple-system,'Hiragino Sans',sans-serif";const w=Math.ceil(x.measureText(t).width)+36;c.width=w;c.height=64;
  x.font="800 44px -apple-system,'Hiragino Sans',sans-serif";x.fillStyle="rgba(15,23,42,.85)";x.fillRect(0,0,w,64);x.fillStyle="#fde68a";x.textBaseline="middle";x.fillText(t,18,34);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,sizeAttenuation:false}));sp.scale.set(0.05*w/64,0.05,1);sp.position.copy(p);sp.renderOrder=20;return sp};
 /* 数字の形（7つの棒）：床に固定の画面は文字が出せないので、数字だけを形にする（約・mm は付けない） */
 const SEG={0:"abcdef",1:"bc",2:"abged",3:"abgcd",4:"fgbc",5:"afgcd",6:"afgedc",7:"abc",8:"abcdefg",9:"abcdfg"};
 const numMesh=(t,p)=>{const s2=String(t).replace(/[^0-9]/g,""),h=170,w=h*.55,th=h*.13,g=new THREE.Group(),bm=new THREE.MeshBasicMaterial({color:0x111827}),wm=new THREE.MeshBasicMaterial({color:0xffffff});
  const bar=(sx,sy,x,y)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,12),bm);m.position.set(x,y,6);g.add(m)},n=s2.length,W2=n*(w+th*1.6);
  [...s2].forEach((d,i)=>{const x0=-W2/2+i*(w+th*1.6)+w/2,S=SEG[d]||"";if(S.includes("a"))bar(w,th,x0,h/2);if(S.includes("g"))bar(w,th,x0,0);if(S.includes("d"))bar(w,th,x0,-h/2);
   if(S.includes("f"))bar(th,h/2,x0-w/2,h/4);if(S.includes("b"))bar(th,h/2,x0+w/2,h/4);if(S.includes("e"))bar(th,h/2,x0-w/2,-h/4);if(S.includes("c"))bar(th,h/2,x0+w/2,-h/4)});
  const bg=new THREE.Mesh(new THREE.BoxGeometry(W2+60,h+70,6),wm);g.add(bg);g.position.copy(p);g.rotation.y=Math.atan2(-p.x,-p.z);return g};   // 立っている所（原点）の方を向く
 const B=(id,t,bg,fx)=>`<button id="${id}" style="flex:${fx||1};height:48px;border-radius:12px;border:0;font-weight:800;font-size:14.5px;background:${bg||"#ffffffee"};color:${bg?"#fff":"#0f172a"};padding:0 8px">${t}</button>`;
 const ui=()=>{const T2=ov.querySelector("#ar2t"),Bb=ov.querySelector("#ar2b"),r=X.routes[X.pick];
  T2.innerHTML=X.chTap?"📏 <b>室内機の上の天井</b>をタップ（床の十字の真上）<br><small style='font-weight:600;opacity:.85'>天井の高さが分からない時に。タップした所を天井の高さにします</small>":X.step===1?"① <b>室内機の真ん中の真下の床</b>をタップ<br><small style='font-weight:600;opacity:.85'>立ったまま動かないで使います（天井 "+fmt(AR2.ch)+"・スマホ "+fmt(AR2.ph)+"）</small>"
   :X.step===2?"② <b>穴の真下の床</b>をタップ":X.step===3?"③ <b>穴</b>をタップ（天井の中などで見えない時は ± で高さ）<br><small style='font-weight:600;opacity:.85'>穴の高さ 床から "+fmt(X.h)+"</small>"
   :`🧭 ルート ${X.pick+1}／${X.routes.length}：${r?r.nm:""}<br><b style="font-size:18px">冷媒配管 約${r?(r.L/1000).toFixed(1):"-"}m</b>（だいたい）・曲げ${r?r.n:0}<small style='font-weight:600;opacity:.85'>　穴 床から ${fmt(X.h)}</small>${r&&r.back?"<br><b style='color:#fca5a5'>⚠️ 配管の口が穴と反対向きです（↻ 回すで向きを変える）</b>":""}<br><small style='font-weight:700;color:#fde68a'>⚠️ この画面（カメラの画面）は、立ったまま首を振って見る物です。iPhoneのブラウザは歩いた分を測れないので、歩くと絵がついてきます。歩いても床に止まって見えるのは、下の「🧊 床に固定して見る」（iPhoneのAR）です</small>`;   // 歩いても動かないのは iPhone の AR（ql）だけ
  const uRow=X.step>=2?`<div style="display:flex;gap:6px">${B("aMd","🔩 "+(C2[X.m]?C2[X.m].n:"機種"),"",1.5)}${X.lock?B("aLk","🔒 向き決定"):B("aRt","↻ 回す")+B("aLk","🔓 向きを決める")}${B("aPn",X.pan?"👁 パネルだけ":"👁 全体")}</div>`:"";
  Bb.innerHTML=uRow+(X.step===4?`<div style="display:flex">${B("aQL","🧊 床に固定して見る（歩いても動かない）","#0891b2",2)}${B("aPh","📷 写真","#7c3aed")}</div>`:"")+(X.step>=3?`<div style="display:flex;gap:6px">${B("aHm","穴 −100")}${B("aHp","穴 ＋100")}${X.step===4?B("aNx","次のルート ›","#2563eb",1.4):B("aOk","この高さで決める","#2563eb",1.6)}</div>`:"")
   +(X.step===0?"":`<div style="display:flex;gap:6px">${X.step>1?B("aBk","‹ 1つ戻る"):""}${B("aSet","⚙ 高さ")}${X.step>=2?B("aCh","📏 天井"):""}${X.step===4?B("aUse","✓ 曲げに入れる","#16a34a",1.4):""}${B("aEnd","終了","#ef4444")}</div>`)
   +(X.set?`<div style="display:flex;gap:6px;flex-wrap:wrap;background:#0f172add;border-radius:12px;padding:8px">${[["ch","天井の高さ"],["ph","スマホの高さ"],["fov","画角（ずれる時）"]].map(([k,t])=>`<div style="flex:1 1 30%;color:#fff;font-size:12px;font-weight:800;text-align:center">${t}<br><button data-k="${k}" data-d="-1" style="width:34px;height:34px;border-radius:8px;border:0">−</button> <b style="font-size:14px">${k==="fov"?AR2.fov+"°":fmt(AR2[k])}</b> <button data-k="${k}" data-d="1" style="width:34px;height:34px;border-radius:8px;border:0">＋</button></div>`).join("")}</div>`:"");
  const on=(id,f)=>{const e=ov.querySelector("#"+id);if(e)e.onclick=ev=>{ev.stopPropagation();f()}};
  on("aHm",()=>{X.h=Math.max(100,X.h-100);if(X.step===4)X.routes=mkRoutes();drawAll();ui()});on("aHp",()=>{X.h=Math.min(8000,X.h+100);if(X.step===4)X.routes=mkRoutes();drawAll();ui()});
  on("aOk",()=>{X.step=4;X.routes=mkRoutes();X.pick=0;drawAll();ui()});on("aNx",()=>{X.pick=(X.pick+1)%Math.max(1,X.routes.length);drawAll();ui()});
  on("aBk",()=>{if(X.step===4)X.step=3;else if(X.step===3){X.step=2;X.F=null}else if(X.step===2){X.step=1;X.U=null}X.routes=[];drawAll();ui()});
  on("aSet",()=>{X.set=!X.set;ui()});on("aEnd",end);on("aUse",use);on("aQL",ql);on("aPh",photo);
  const re=()=>{if(X.step===4)X.routes=mkRoutes();drawAll();ui()};
  on("aRt",()=>{X.th=(X.th+90)%360;re()});on("aLk",()=>{X.lock=!X.lock;toast(X.lock?"室内機の向きを決めました（向きだけ。歩いても床に止まって見えるのは下の「🧊 床に固定して見る」）":"もう一度回せます",4500);ui()});on("aPn",()=>{X.pan=!X.pan;re()});
  on("aCh",()=>{X.chTap=!X.chTap;ui()});on("aMd",()=>{const ks=Object.keys(C2),sh=document.createElement("div");sh.style.cssText="position:absolute;inset:0;z-index:5;background:#0009;display:flex;align-items:flex-end";
   sh.innerHTML=`<div style="background:#fff;width:100%;max-height:75%;overflow:auto;border-radius:16px 16px 0 0;padding:12px"><b style="font-size:17px">🔩 室内機の機種</b><div style="font-size:12.5px;color:#475569">配管は、その機種の配管の口から出ます</div>${ks.map(k=>`<button data-m="${k}" style="display:block;width:100%;text-align:left;margin-top:6px;padding:10px;border-radius:10px;border:1.5px solid ${k===X.m?"#2563eb":"#cbd5e1"};background:${k===X.m?"#eff6ff":"#fff"};font-weight:800;font-size:14px">${C2[k].kind||""}　${C2[k].n}<div style="font-weight:600;font-size:12px;color:#64748b">${fmt(C2[k].L)}×${fmt(C2[k].W)}・高さ${fmt(C2[k].H)}</div></button>`).join("")}<button data-x="1" style="display:block;width:100%;margin-top:8px;height:46px;border-radius:12px;border:0;font-weight:800">閉じる</button></div>`;
   ov.appendChild(sh);sh.onclick=e=>{e.stopPropagation();const b=e.target.closest("button");if(e.target===sh||(b&&b.dataset.x)){sh.remove();return}if(b&&b.dataset.m){X.m=b.dataset.m;try{localStorage.setItem("pbm_ar2m",X.m)}catch(err){}sh.remove();re();toast(C2[X.m].n+" にしました")}}});
  ov.querySelectorAll("[data-k]").forEach(b=>b.onclick=ev=>{ev.stopPropagation();const k=b.dataset.k,d=+b.dataset.d;AR2[k]=k==="fov"?Math.max(40,Math.min(90,AR2.fov+d)):Math.max(k==="ch"?1800:500,Math.min(k==="ch"?6000:2200,AR2[k]+d*50));save2();size();if(X.step===4)X.routes=mkRoutes();drawAll();ui()});
  ov.querySelector("#ar2aim").style.display=X.step===4&&!X.chTap?"none":""};
 ov.addEventListener("click",e=>{if(e.target.closest("button"))return;const r=ray(e.clientX,e.clientY);
  if(X.chTap&&X.U){const o=r.origin,d=r.direction,hd=Math.hypot(d.x,d.z),t=hd<1e-3?0:((X.U.x-o.x)*d.x+(X.U.z-o.z)*d.z)/(hd*hd),y=o.y+d.y*t;   // 床の十字の真上の線の、タップした所の高さ
   if(hd<1e-3||t<=0||y<1800||y>6000){toast("室内機の上の天井をタップしてください（1800〜6000の間）");return}AR2.ch=Math.round(y/10)*10;save2();X.chTap=false;toast("天井の高さ "+fmt(AR2.ch)+" にしました");if(X.step===4)X.routes=mkRoutes();drawAll();ui();return}
  if(X.step===1){const p=hitY(r,0);if(!p){toast("床の方をタップしてください");return}X.U=p;X.step=2}   /* 室内機も床で決める（2026-10-27 ユーザー） */
  else if(X.step===2){const p=hitY(r,0);if(!p){toast("床の方をタップしてください");return}X.F=p;X.step=3}
  else if(X.step===3){const o=r.origin,d=r.direction,hd=Math.hypot(d.x,d.z);if(hd<1e-3)return;const t=((X.F.x-o.x)*d.x+(X.F.z-o.z)*d.z)/(hd*hd);if(t<=0)return;X.h=Math.max(100,Math.round((o.y+d.y*t)/50)*50);X.step=4;X.routes=mkRoutes();X.pick=0}   // 穴の真下の床から上へのばした線の、タップした所の高さ
  else return;drawAll();ui()});
 function use(){const r=X.routes[X.pick];if(!r)return;const a=r.P[1].clone().sub(r.P[0]),th=Math.atan2(a.z,a.x),P=r.P.map(p=>p.clone().sub(r.P[0]).applyAxisAngle(new V(0,1,0),th));   // 最初の横の向きを +x に
  st.rows=gPolyRows(P);save(true);build3D();try{fitT()}catch(e){}toast(`曲げに入れました：冷媒配管 約${(r.L/1000).toFixed(1)}m（だいたい）`);end()}
 /* 床に固定（iPhoneの実物大の見え方）：室内機の床の十字を真ん中にして、室内機・ルート・穴・床の印を1つの形にする。置いたら歩いても動かない・その画面で写真が撮れる */
 function ql(){const a0=document.createElement("a");if(!(a0.relList&&a0.relList.supports&&a0.relList.supports("ar"))){toast("床に固定して見るのは iPhone・iPad で使えます");return}
  drawAll(true);sc.updateMatrixWorld(true);const by={},bb=new THREE.Box3(),vis=o=>{for(let q=o;q;q=q.parent)if(!q.visible)return false;return true};
  grp.traverse(o=>{if(!o.isMesh||!vis(o))return;const g=o.geometry,pa=g.attributes.position,na=g.attributes.normal,ix=g.index,m=o.material,key=m.color.getHexString()+(m.transparent?"t":""),P=by[key]||(by[key]={col:[m.color.r,m.color.g,m.color.b],op:m.transparent?Math.max(.6,m.opacity):1,metal:(m.metalness||0)>0.3,pos:[],nrm:[],idx:[]}),base=P.pos.length/3,v=new V(),nm=new THREE.Matrix3().getNormalMatrix(o.matrixWorld);
   for(let k=0;k<pa.count;k++){v.fromBufferAttribute(pa,k).applyMatrix4(o.matrixWorld);P.pos.push(v.x,v.y,v.z);bb.expandByPoint(v);const n=na?new V().fromBufferAttribute(na,k).applyMatrix3(nm).normalize():new V(0,1,0);P.nrm.push(n.x,n.y,n.z)}
   if(ix)for(let k=0;k<ix.count;k++)P.idx.push(base+ix.getX(k));else for(let k=0;k<pa.count;k++)P.idx.push(base+k)});
  drawAll();const cx=X.U.x,cz=X.U.z,mx=Math.max(cx-bb.min.x,bb.max.x-cx,600)+300,mz=Math.max(cz-bb.min.z,bb.max.z-cz,600)+300,parts=Object.values(by);   // 床の板は室内機の十字を真ん中に左右同じ（置く時、十字がタップした所に来る）
  parts.push({col:[.8,.84,.88],op:.3,metal:false,pos:[cx-mx,0,cz-mz,cx+mx,0,cz-mz,cx+mx,0,cz+mz,cx-mx,0,cz+mz],nrm:[0,1,0,0,1,0,0,1,0,0,1,0],idx:[0,2,1,0,3,2]});
  parts.forEach(p=>{for(let k=0;k<p.pos.length;k+=3){p.pos[k]=(p.pos[k]-cx)/1000;p.pos[k+1]=p.pos[k+1]/1000;p.pos[k+2]=(p.pos[k+2]-cz)/1000}});
  try{const url=URL.createObjectURL(makeUSDZ(parts));a0.rel="ar";a0.href=url+"#allowsContentScaling=0";a0.appendChild(document.createElement("img"));a0.style.display="none";document.body.appendChild(a0);a0.click();setTimeout(()=>a0.remove(),3000);
   toast("室内機の真下の床をタップして置き、2本指で回して穴の向きに合わせてください。置いたら歩いても動きません。写真は下のまん中の白い丸（出ない時はiPhoneの横のボタン＋音量の上でスクリーンショット）")}catch(e){console.warn(e);toast("準備に失敗しました")}}
 /* 📷 この画面を写真に：カメラの映像＋配管・室内機・寸法の札を1枚に */
 function photo(){try{R.render(sc,cam);const dpr=Math.min(2,devicePixelRatio||1),W=Math.round(innerWidth*dpr),H=Math.round(innerHeight*dpr),c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");
  const vw=vid.videoWidth||W,vh=vid.videoHeight||H,s2=Math.max(W/vw,H/vh);try{x.drawImage(vid,(W-vw*s2)/2,(H-vh*s2)/2,vw*s2,vh*s2)}catch(e){}x.drawImage(cv,0,0,W,H);
  const r=X.routes[X.pick];x.fillStyle="rgba(15,23,42,.8)";x.fillRect(0,0,W,70*dpr);x.fillStyle="#fff";x.font=`800 ${20*dpr}px -apple-system,'Hiragino Sans',sans-serif`;x.fillText(`${C2[X.m]?C2[X.m].n:"室内機"}　冷媒配管 約${r?(r.L/1000).toFixed(1):"-"}m（だいたい）`,12*dpr,30*dpr);
  x.font=`700 ${15*dpr}px -apple-system,'Hiragino Sans',sans-serif`;x.fillText(`天井 ${fmt(AR2.ch)}・穴 床から ${fmt(X.h)}・${new Date().toLocaleString("ja-JP")}`,12*dpr,56*dpr);
  c.toBlob(b=>{if(!b){toast("写真にできませんでした");return}genShowOut(b,"image/jpeg");const o=$("#genOut");if(o)o.style.zIndex=500},"image/jpeg",.9)}catch(e){console.warn(e);toast("写真にできませんでした")}}
 function end(){removeEventListener("deviceorientation",onOri);removeEventListener("resize",size);try{stream.getTracks().forEach(t=>t.stop())}catch(e){}cancelAnimationFrame(X.raf);try{R.dispose()}catch(e){}ov.remove()}
 const loop2=()=>{X.raf=requestAnimationFrame(loop2);cam.position.set(0,AR2.ph,0);if(X.q)cam.quaternion.copy(X.q);R.render(sc,cam)};loop2();
 window.__AR2={X,grp,drawAll,mkRoutes,placeU};   // 確かめる用
 ui();toast("室内機の真下あたりに立って、天井を映してください");
}
