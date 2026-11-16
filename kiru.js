/* ✂ 配管を切って分ける（曲げ共有だけ・APP==="bend"・2026-11-16 ユーザー：20mものはそのまま曲げられない。切って曲げてから差し込む）
   ・曲げたい所を選んでから（黄色）もう一度2回タップ → その所で切る。ほかの所の2回タップのメニューにも「✂ ここで切る」
   ・st.cut＝{f:全体の行, c:[切る所（始まりから芯の長さ mm）], i:-1＝全体／0〜＝その1本を出す}。i が 0 以上の時 st.rows はその1本（cutPieces）
     1本の終わりは a:0 の行（切った所まで）、次の1本の頭は残りの長さ＋元の曲げ。曲げの角から M mm はまっすぐを残す（cutFix）
   ・save() の頭で cutSync（1本を直したら全体 f と切る所 c を作り直す・全体を直したら f を今の行に）
   ・全体の時は3Dに赤い輪（切る所）。輪を指でずらすと長さが変わる。左上（支持の下）に「全体｜1本目｜2本目…」の切りかえ（#cutBar） */
(function(){
if (typeof APP === "undefined" || APP !== "bend") return;
const M = 100;   // 曲げの手前・後ろに残すまっすぐ（差し込む・ろう付けする所）
const cp = r => r.map(x => ({...x})), lenOf = r => r.reduce((s, x) => s + (+x.l || 0), 0);
const Rb = () => bR(SIZES[legSize("m")][1]), tn = a => !a ? 0 : a >= 180 ? Rb() : Rb()*Math.tan(a*Math.PI/360);
/* 全体の行 f を切る所 c で分ける */
function cutPieces(f, c){ const P = [[]]; let S = 0, ci = 0;
  for (const r of f){ let off = 0; while (ci < c.length && c[ci] > S + off + 1e-6 && c[ci] < S + r.l - 1e-6){ const L = c[ci] - S - off; P[P.length - 1].push({l:L, a:0, t:0, o:false}); P.push([]); off += L; ci++; } P[P.length - 1].push({...r, l:r.l - off}); S += r.l; }
  return P; }
/* 分けた物を1本にもどす（1本の終わりの a:0 の行と次の1本の頭をつなぐ） */
function cutJoin(P){ const R = cp(P[0] || []); for (let k = 1; k < P.length; k++){ const q = P[k]; if (!q.length) continue; const z = R[R.length - 1]; if (z && !z.a){ R.pop(); R.push({...q[0], l:z.l + q[0].l}); } else R.push({...q[0]}); for (let j = 1; j < q.length; j++) R.push({...q[j]}); } return R; }
/* 切る所を、曲げにかからない所へ（だめな時 null） */
function cutFix(f, x){ let S = 0; for (let k = 0; k < f.length; k++){ const r = f[k]; if (x <= S + r.l || k === f.length - 1){ const lo = S + tn(k ? f[k-1].a : 0) + M, hi = S + r.l - tn(r.a) - M; if (hi < lo) return null; return Math.round(Math.max(lo, Math.min(hi, x))/10)*10; } S += r.l; } return null; }
window.cutSync = function(){ const C = st.cut; if (!C) return; if (!Array.isArray(C.f) || !C.f.length || !Array.isArray(C.c)){ delete st.cut; return; }
  if (C.i >= 0){ const P = cutPieces(C.f, C.c); if (C.i >= P.length){ C.i = -1; st.rows = cp(C.f); return; } P[C.i] = cp(st.rows); C.f = cutJoin(P); C.c = []; let s = 0; for (let k = 0; k < P.length - 1; k++){ s += lenOf(P[k]); C.c.push(s); } }
  else { C.f = cp(st.rows); const L = lenOf(C.f); C.c = C.c.filter(x => x > 0 && x < L); }
  if (!C.c.length){ st.rows = cp(C.f); delete st.cut; } };
const off = () => { const C = st.cut; return C && C.i > 0 ? C.c[C.i - 1] : 0; };
/* 画面の点 → 今の行（st.rows）の始まりからの芯の長さ（いちばん近いまっすぐの所） */
function xAt(cx, cy, row){ if (!T || !T.segs || !T.cam || !T.legFr || !T.legFr.m) return null; const cv = $("#cv"), rc = cv.getBoundingClientRect(), px = cx - rc.left, py = cy - rc.top; T.cam.updateMatrixWorld();
  const sc = p => { const v = p.clone().project(T.cam); return v.z > 1 ? null : [(v.x*.5 + .5)*T.w, (-v.y*.5 + .5)*T.h]; }; let best = null, bd = 1e9;
  for (const sg of T.segs){ if (sg.g !== "m" || sg.row < 0 || (row != null && sg.row !== row)) continue; const a = sc(sg.a), b = sc(sg.b); if (!a || !b) continue; const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx*dx + dy*dy; let t = L2 < 1e-6 ? 0 : ((px - a[0])*dx + (py - a[1])*dy)/L2; t = Math.max(0, Math.min(1, t)); const d = Math.hypot(px - a[0] - dx*t, py - a[1] - dy*t); if (d < bd){ bd = d; best = {sg, t}; } }
  if (!best) return null; const k = best.sg.row, fr = T.legFr.m[k], r = st.rows[k]; if (!fr || !r) return null; const P = best.sg.a.clone().lerp(best.sg.b, best.t), s0 = fr.c.clone().addScaledVector(fr.d, -r.l);
  let S = 0; for (let j = 0; j < k; j++) S += st.rows[j].l; return S + Math.max(0, Math.min(r.l, P.sub(s0).dot(fr.d))); }
/* 今の行の芯の長さ x の所の3Dの点と向き */
function ptAt(x){ if (!T || !T.legFr || !T.legFr.m) return null; let S = 0; for (let k = 0; k < st.rows.length; k++){ const r = st.rows[k], fr = T.legFr.m[k]; if (!fr) return null; if (x <= S + r.l + 1e-6 || k === st.rows.length - 1){ const s0 = fr.c.clone().addScaledVector(fr.d, -r.l); return {p:s0.addScaledVector(fr.d, Math.min(r.l, x - S)), d:fr.d.clone()}; } S += r.l; } return null; }
function cutAdd(xf){ if (xf == null) return; if (!st.cut) st.cut = {f:cp(st.rows), c:[], i:-1}; else cutSync(); const C = st.cut || (st.cut = {f:cp(st.rows), c:[], i:-1}), x = cutFix(C.f, xf);
  if (x == null){ toast("曲げに近すぎて切れません。まっすぐの所（曲げから" + M + "mm以上はなれた所）を2回タップしてください"); if (!C.c.length) delete st.cut; return; }
  if (C.c.some(v => Math.abs(v - x) < M*2) || x < M || x > lenOf(C.f) - M){ toast("ほかの切る所・配管の端に近すぎます"); if (!C.c.length) delete st.cut; return; }
  C.c.push(x); C.c.sort((a, b) => a - b); C.i = -1; st.rows = cp(C.f); sel = 0; save(); render(); if (T){ build3D(); T.dirty = true; }
  let first = false; try { first = !localStorage.getItem("pbm_cut_tip"); localStorage.setItem("pbm_cut_tip", "1"); } catch(e){}
  toast(first ? "✂ ここで切りました。赤い輪を指でずらすと長さが変わります。左上の「1本目・2本目」で1本ずつ曲げを出せます" : "✂ " + C.c.length + "か所で切りました（" + (C.c.length + 1) + "本）"); }
function cutGo(j){ if (!st.cut) return; cutSync(); const C = st.cut; if (!C) { render(); if (T) build3D(); return; } const P = cutPieces(C.f, C.c); if (j >= P.length) j = -1; C.i = j; st.rows = cp(j < 0 ? C.f : P[j]); sel = 0; leg = "m"; save(); render(); if (T){ build3D(); fitT(true); T.dirty = true; } }
window.cutGo = cutGo;
/* 2回タップ：選んでいた所なら切る・ほかはいつものメニュー＋「✂ ここで切る」 */
const downs = []; { const cv = $("#cv"); if (cv) cv.addEventListener("pointerdown", () => { downs.push({t:Date.now(), sel, leg}); if (downs.length > 3) downs.shift(); }, true); }
if (typeof openPMenu === "function"){ const o0 = openPMenu; openPMenu = function(sg, cx, cy){ const pre = downs.length >= 2 ? downs[downs.length - 2] : null;
  if (sg && sg.g === "m" && sg.row >= 0 && !GUIDE && pre && Date.now() - pre.t < 1200 && pre.leg === "m" && pre.sel === sg.row){ const x = xAt(cx, cy, sg.row); if (x != null){ cutAdd(off() + x); return; } }
  o0.apply(this, arguments);
  if (sg && sg.g === "m" && sg.row >= 0 && !GUIDE){ const m = $("#pmenu"), t = m && m.querySelector(".pt"); if (t && !m.querySelector('[data-a="cut"]')){ const b = document.createElement("button"); b.className = "pm"; b.dataset.a = "cut"; b.textContent = "✂ ここで切る（2本に分ける）"; t.after(b);
    b.addEventListener("click", e => { e.stopPropagation(); closePMenu(); const x = xAt(cx, cy, sg.row); if (x != null) cutAdd(off() + x); }, true); } } }; }
/* 3D：切る所（赤い輪）・1本の時はつなぐ所の印 */
let MK = [];
function lab(txt, bg){ const s = label(txt, 1, bg, "#ffffff"); delete s.userData.lab; return s; }
function drawCut(){ MK = []; bar(); const C = st.cut; if (!C || !T || !T.grp) return; const L0 = (typeof LG !== "undefined" && LG.find(L => L.id === "m")) || {}, rd = L0.rad || 10;
  const ring = (p, d, col) => { const m = new THREE.Mesh(new THREE.TorusGeometry(rd*2.3, rd*0.55, 10, 28), new THREE.MeshBasicMaterial({color:col, depthTest:false, transparent:true, opacity:.95})); m.position.copy(p); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.clone().normalize()); m.renderOrder = 11; T.grp.add(m); return m; };
  if (C.i < 0){ C.c.forEach((x, j) => { const q = ptAt(x); if (!q) return; const r = ring(q.p, q.d, 0xdc2626), s = lab("✂ " + (j + 1) + "本目｜" + (j + 2) + "本目 ⇔", "#dc2626f2"); s.position.copy(q.p); pxl(s, 22, {t:"up"}, rd*4); T.grp.add(s); MK.push({j, p:q.p.clone(), r, s}); }); }
  else { const n = C.c.length + 1, tot = lenOf(st.rows);
    if (C.i > 0){ const q = ptAt(0); if (q){ ring(q.p, q.d, 0xea580c); const s = lab("✂ " + C.i + "本目とつなぐ", "#ea580cf2"); s.position.copy(q.p); pxl(s, 20, {t:"up"}, rd*4); T.grp.add(s); } }
    if (C.i < n - 1){ const q = ptAt(tot); if (q){ ring(q.p, q.d, 0xea580c); const s = lab("✂ " + (C.i + 2) + "本目とつなぐ", "#ea580cf2"); s.position.copy(q.p); pxl(s, 20, {t:"up"}, rd*4); T.grp.add(s); } } }
  T.dirty = true; }
if (typeof build3D === "function"){ const b0 = build3D; build3D = function(){ const v = b0.apply(this, arguments); try { drawCut(); } catch(e){ console.warn("cut", e); } return v; }; }
/* 左上の切りかえ（支持の下） */
function bar(live){ const stg = $("#stage"); if (!stg) return; let el = $("#cutBar"); const C = st.cut;
  if (!C){ if (el) el.remove(); return; }
  if (!el){ el = document.createElement("div"); el.id = "cutBar"; el.style.cssText = "position:absolute;left:8px;z-index:3;display:flex;gap:4px;align-items:center;max-width:calc(100% - 64px);overflow-x:auto;-webkit-overflow-scrolling:touch;padding:2px 2px 4px"; stg.appendChild(el);
    el.onclick = e => { const b = e.target.closest("[data-cj]"); if (b){ cutGo(+b.dataset.cj); return; } if (e.target.closest("[data-cx]")) askConfirm("切るのをやめて、1本の配管にもどしますか？", "↩ 1本にもどす", () => { cutSync(); const C2 = st.cut; if (C2){ st.rows = cp(C2.f); delete st.cut; } sel = 0; save(); render(); if (T){ build3D(); fitT(true); } toast("1本にもどしました"); }); };
    ["pointerdown", "touchstart"].forEach(ev => el.addEventListener(ev, e => e.stopPropagation(), {passive:true})); }
  const sp = $("#supPill"), vis = sp && sp.offsetParent && !stg.classList.contains("infohide"); el.style.top = (vis ? sp.offsetTop + sp.offsetHeight + 6 : (stg.classList.contains("full") ? 62 : 50)) + "px";
  const tot = lenOf(C.i < 0 ? st.rows : C.f), cs = live || C.c, ls = [...cs, tot].map((x, k) => x - (k ? cs[k - 1] : 0)), m = v => (v/1000).toFixed(1) + "m";
  const B = (on, col) => `flex:none;height:34px;border-radius:17px;padding:0 11px;font-size:13px;font-weight:800;border:2px solid ${on ? col : "#cbd5e1"};background:${on ? col : "#ffffffee"};color:${on ? "#fff" : "#0f172a"};box-shadow:0 2px 6px #0c4a6e33`;
  el.innerHTML = `<button data-cj="-1" style="${B(C.i < 0, "#0369a1")}">✂ 全体 ${m(tot)}</button>` + ls.map((v, k) => `<button data-cj="${k}" style="${B(C.i === k, "#dc2626")}">${k + 1}本目 ${m(v)}</button>`).join("") + (C.i < 0 ? `<button data-cx="1" aria-label="切るのをやめる" style="${B(false)};padding:0 9px;color:#64748b">↩</button>` : ""); }
window.addEventListener("resize", () => bar());
/* 赤い輪を指でずらす（全体の時） */
let DR = null; { const stg = $("#stage"); if (stg){
  stg.addEventListener("pointerdown", e => { const C = st.cut; if (!C || C.i >= 0 || !MK.length || GUIDE || (typeof DV !== "undefined" && DV) || e.target.closest("#cutBar") || !T || !T.cam) return; const cv = $("#cv"), rc = cv.getBoundingClientRect(); T.cam.updateMatrixWorld();
    let hit = null, hd = 34; for (const k of MK){ const v = k.p.clone().project(T.cam); if (v.z > 1) continue; const d = Math.hypot(rc.left + (v.x*.5 + .5)*rc.width - e.clientX, rc.top + (-v.y*.5 + .5)*rc.height - e.clientY); if (d < hd){ hd = d; hit = k; } }
    if (!hit) return; e.stopPropagation(); e.preventDefault(); DR = {k:hit, id:e.pointerId, c:C.c.slice()}; try { stg.setPointerCapture(e.pointerId); } catch(x){} try { navigator.vibrate && navigator.vibrate(15); } catch(x){} }, true);
  stg.addEventListener("pointermove", e => { if (!DR || e.pointerId !== DR.id) return; e.stopPropagation(); const C = st.cut, j = DR.k.j, x0 = xAt(e.clientX, e.clientY); if (x0 == null) return; let x = cutFix(C.f, x0); if (x == null) return;
    const lo = (j ? DR.c[j - 1] : 0) + M*2, hi = (j < DR.c.length - 1 ? DR.c[j + 1] : lenOf(C.f)) - M*2; if (x < lo || x > hi) return; DR.c[j] = x; const q = ptAt(x); if (q){ DR.k.r.position.copy(q.p); DR.k.r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), q.d); DR.k.s.position.copy(q.p); DR.k.p.copy(q.p); T.dirty = true; } bar(DR.c); }, true);
  const up = e => { if (!DR || e.pointerId !== DR.id) return; e.stopPropagation(); const C = st.cut; C.c = DR.c.slice(); DR = null; save(); render(); if (T){ build3D(); T.dirty = true; } };
  stg.addEventListener("pointerup", up, true); stg.addEventListener("pointercancel", up, true); } }
/* 開いた時：切ってあれば切りかえを出す */
setTimeout(() => { try { if (st.cut){ if (T) build3D(); else bar(); } } catch(e){} }, 0);
})();
