/* 冷媒配管の曲げ共有：図面編集から受け取った配管の一覧（曲げ共有の画面だけ・APP==="bend"）
   ・図面編集の3Dの「曲げ共有へ」→ IndexedDB pbmShare / f / "pipes" → index.html?from=cadpipes で受け取る
   ・受け取った物は localStorage「pbm_mp」に別に持つ（st の形は変えない）。{name, ch, walls, ubs, units, pipes:[{nm, P:[[x, y, 高さ]...], ui}], cur}
     長さは mm・図面の座標（x 右・y 上）、高さは床から
   ・配管を選ぶ（一覧のボタン・3Dで灰色の配管をタップ）と、その配管の始まり（室内機の配管の口）を起点にして st を作り直す：
     st.rows（点の並びから曲げを出す）・st.bld（壁・ユニットバス・ほかの室内機）・st.units（始まりの室内機の機種）・st.gnd（起点の高さ・天井高）
   ・ほかの配管は3Dに灰色の管で出す（build3D のあとに足す） */
(function(){
if (typeof APP === "undefined" || APP !== "bend") return;
const MPK = "pbm_mp";
let MP = null; try { MP = JSON.parse(localStorage.getItem(MPK) || "null"); } catch(e){ MP = null; }
const mpSave = () => { try { if (MP) localStorage.setItem(MPK, JSON.stringify(MP)); else localStorage.removeItem(MPK); } catch(e){} };
const pLen = P => P.reduce((a, p, i) => i ? a + Math.hypot(p[0] - P[i-1][0], p[1] - P[i-1][1], p[2] - P[i-1][2]) : 0, 0);
/* 配管 i の始まりを原点、最初の向きを +x にする置きかえ（図面の x, y → 3D の x, z） */
function mpXf(i){ const P = MP.pipes[i].P, X0 = P[0][0], Y0 = P[0][1], H0 = P[0][2];
  let k = 1; while (k < P.length - 1 && Math.hypot(P[k][0] - X0, P[k][1] - Y0) < 1) k++; // 最初が上下（たて管）の時は、次の横の向き
  const ph = Math.atan2(-(P[k][1] - Y0), P[k][0] - X0), c = Math.cos(ph), s = Math.sin(ph);
  return {ph, H0, W:(x, y) => { const wx = x - X0, wz = -(y - Y0); return [wx*c + wz*s, -wx*s + wz*c]; }}; }
/* 点の並び → 曲げの行（zumen.js の polyToRows と同じ考え方：起点は +x 向き・上が +y） */
function mpRows(Pv){ const V = THREE.Vector3; let u = new V(0, 1, 0), r = new V(0, 0, 1); const rows = [];
  for (let i = 0; i < Pv.length - 1; i++){ const seg = Pv[i+1].clone().sub(Pv[i]), l = Math.round(seg.length()); let a = 0, t = 0;
    if (i < Pv.length - 2){ const d1 = seg.clone().normalize(), d2 = Pv[i+2].clone().sub(Pv[i+1]).normalize(), cc = Math.max(-1, Math.min(1, d1.dot(d2))); a = Math.round(Math.acos(cc)*180/Math.PI);
      if (a > 0){ const b = d2.clone().addScaledVector(d1, -cc).normalize(); t = normT(Math.round(Math.atan2(b.dot(r), b.dot(u))*180/Math.PI));
        const ax = d1.clone().cross(d2).normalize(), ang = Math.acos(cc); u = u.clone().applyAxisAngle(ax, ang); r = r.clone().applyAxisAngle(ax, ang); } }
    rows.push({l, a:ANG.includes(a) ? a : (a > 60 ? 90 : 45), t, o:false}); }
  return rows.filter(x => x.l > 0); }
function mpApply(i, quiet){
  if (!MP || !MP.pipes[i]) return; const p = MP.pipes[i], X = mpXf(i), V = THREE.Vector3, deg = v => -Math.round(v*180/Math.PI);
  const Pv = p.P.map(q => { const w = X.W(q[0], q[1]); return new V(w[0], q[2] - X.H0, w[1]); }), rows = mpRows(Pv);
  if (!rows.length){ toast("この配管は短すぎて曲げを出せません"); return; }
  const un = p.ui >= 0 ? MP.units[p.ui] : null, CH = un ? un.ch : (MP.ch || st.gnd.ch), bld = [];
  for (const w of MP.walls || []){ const c = X.W((w[0] + w[2])/2, (w[1] + w[3])/2); bld.push({k:"wall", x:c[0], z:c[1], w:w[2] - w[0], d:w[3] - w[1], h:CH, y:0, r:deg(X.ph), full:true, auto:"cad"}); }
  for (const b of MP.ubs || []){ const H = Math.min(2100, b.ch || CH), T2 = 40; // ユニットバス：4方の壁（上はあける）
    for (const q of [[b.x0, b.y0, b.x1, b.y0 + T2], [b.x0, b.y1 - T2, b.x1, b.y1], [b.x0, b.y0, b.x0 + T2, b.y1], [b.x1 - T2, b.y0, b.x1, b.y1]]){ const c = X.W((q[0] + q[2])/2, (q[1] + q[3])/2); bld.push({k:"wall", x:c[0], z:c[1], w:q[2] - q[0], d:q[3] - q[1], h:H, y:0, r:deg(X.ph), full:false, auto:"ub"}); } }
  (MP.units || []).forEach((o, j) => { if (j === p.ui) return; const c = X.W(o.x, o.y); bld.push({k:"ind", x:c[0], z:c[1], w:o.w, d:o.d, h:300, y:0, r:deg(o.th + X.ph), full:false, m:o.mk && CAS2M[o.mk] ? o.mk : ""}); }); // ほかの室内機（始まりの室内機はアプリの模型で出る）
  st.rows = normRows(rows, [{l:500, a:0, t:0, o:false}]); st.bl = []; st.bld = normBld(bld);
  st.units = normUnits({...st.units, on:true, s:un && un.mk && CAS2M[un.mk] ? "cas2" : st.units.s, ms:un && un.mk && CAS2M[un.mk] ? un.mk : st.units.ms, e:""});
  st.gnd = normGnd({...st.gnd, on:true, mode:"start", h:Math.round(X.H0), c:true, ch:Math.round(CH)}); st.nopipe = false;
  leg = "m"; sel = 0; MP.cur = i; mpSave(); save(); render();
  if (T){ build3D(); const bb = new THREE.Box3(); Pv.forEach(v => bb.expandByPoint(v)); bb.expandByScalar(800); bb.getCenter(T.center); const sz = bb.getSize(new V()); T.ext = Math.max(2500, sz.x, sz.y, sz.z)*1.3; fitT(true); } // 見る所：選んだ配管のまわり
  mpBar();
  if (!quiet) toast(`${p.nm}（${(pLen(p.P)/1000).toFixed(2)}m）の曲げを出しました`);
}
/* 3D：今の配管のほかの配管を灰色の管で（タップで選ぶ） */
function mpDraw(){ if (!MP || MP.cur == null || MP.cur < 0 || !T || !T.grp || !MP.pipes[MP.cur]) return; const X = mpXf(MP.cur), V = THREE.Vector3, GY0 = 0;
  const mat = new THREE.MeshStandardMaterial({color:0x9ca3af, transparent:true, opacity:.85, roughness:.6}), R = 14;
  MP.pipes.forEach((p, j) => { if (j === MP.cur) return; const Pv = p.P.map(q => { const w = X.W(q[0], q[1]); return new V(w[0], q[2] - X.H0 + GY0, w[1]); });
    for (let i = 1; i < Pv.length; i++){ const a = Pv[i-1], b = Pv[i], L = a.distanceTo(b); if (L < 1) continue; const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 10), mat); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new V(0, 1, 0), b.clone().sub(a).normalize()); m.userData.mp = j + 1; T.grp.add(m); }
    Pv.forEach(q => { const k = new THREE.Mesh(new THREE.SphereGeometry(R, 10, 8), mat); k.position.copy(q); k.userData.mp = j + 1; T.grp.add(k); }); });
  T.dirty = true; }
/* 一覧のボタン（3Dの上） */
function mpBar(){ let el = document.getElementById("mpBar"); const stg = document.getElementById("stage"); if (!stg) return;
  if (!MP || !MP.pipes || !MP.pipes.length){ if (el) el.remove(); return; }
  if (!el){ el = document.createElement("div"); el.id = "mpBar"; el.style.cssText = "display:flex;gap:6px;align-items:center;overflow-x:auto;padding:6px 2px;margin:0 0 6px;-webkit-overflow-scrolling:touch"; stg.parentNode.insertBefore(el, stg);
    el.onclick = e => { const b = e.target.closest("[data-mp]"); if (b){ mpApply(+b.dataset.mp); return; } if (e.target.closest("[data-mpx]")) askConfirm("図面編集から受け取った配管の一覧を閉じます（今の曲げのデータはそのまま残ります）", "閉じる", () => { MP = null; mpSave(); mpBar(); if (T){ build3D(); } }); }; }
  const un = j => { const p = MP.pipes[j], o = p.ui >= 0 && MP.units[p.ui]; return o && o.mk && CAS2M[o.mk] ? CAS2M[o.mk].n : "室内機なし"; };
  el.innerHTML = `<b style="flex:none;font-size:13px;color:#334155">📐 図面の配管</b>` + MP.pipes.map((p, j) => `<button data-mp="${j}" style="flex:none;height:40px;border-radius:12px;padding:0 12px;font-size:13px;font-weight:800;border:2px solid ${j === MP.cur ? "#2563eb" : "#cbd5e1"};background:${j === MP.cur ? "#dbeafe" : "#fff"};color:#0f172a">${p.nm}・${(pLen(p.P)/1000).toFixed(1)}m<span style="font-weight:500;font-size:11px;color:#64748b">（${un(j)}）</span></button>`).join("") + `<button data-mpx="1" aria-label="一覧を閉じる" style="flex:none;height:40px;border-radius:12px;padding:0 10px;border:1px solid #cbd5e1;background:#fff;color:#64748b">✕</button>`; }
/* build3D のあとに、ほかの配管を足す（build3D の中は変えない） */
if (typeof build3D === "function"){ const b0 = build3D; build3D = function(){ const v = b0.apply(this, arguments); try { mpDraw(); } catch(e){ console.warn("mp", e); } return v; }; }
/* 3Dで灰色の配管を軽くタップ → その配管を選ぶ */
(function(){ const cv = document.getElementById("cv"); if (!cv) return; let d = null;
  cv.addEventListener("pointerdown", e => { d = {x:e.clientX, y:e.clientY, t:Date.now(), n:(d && Date.now() - d.t < 50) ? 2 : 1}; });
  cv.addEventListener("pointerup", e => { if (!d || !MP || MP.cur == null || !T || !T.cam) return; const q = d; d = null; if (Math.hypot(e.clientX - q.x, e.clientY - q.y) > 6 || Date.now() - q.t > 450) return;
    const rc = cv.getBoundingClientRect(), v = new THREE.Vector2((e.clientX - rc.left)/rc.width*2 - 1, -(e.clientY - rc.top)/rc.height*2 + 1), ray = new THREE.Raycaster(); ray.setFromCamera(v, T.cam);
    const hit = ray.intersectObjects(T.grp.children.filter(o => o.userData && o.userData.mp), false)[0]; if (hit) mpApply(hit.object.userData.mp - 1); }); })();
/* 受け取る：index.html?from=cadpipes */
(async () => { let q; try { q = new URLSearchParams(location.search); } catch(e){ return; } if (q.get("from") !== "cadpipes"){ if (MP) mpBar(); return; }
  try { const r = await new Promise((ok, ng) => { const o = indexedDB.open("pbmShare", 1); o.onupgradeneeded = () => o.result.createObjectStore("f"); o.onerror = () => ng(o.error);
      o.onsuccess = () => { try { const t = o.result.transaction("f", "readonly").objectStore("f").get("pipes"); t.onsuccess = () => ok(t.result); t.onerror = () => ng(t.error); } catch(e){ ok(null); } }; });
    try { history.replaceState(null, "", location.pathname); } catch(e){}
    if (!r || !Array.isArray(r.pipes) || !r.pipes.length){ toast("図面編集から配管が届いていません。図面編集の3Dの「曲げ共有へ」から開いてください"); if (MP) mpBar(); return; }
    askConfirm(`図面編集の「${r.name || "図面"}」から 配管 ${r.pipes.length}本・壁・ユニットバス・室内機 ${(r.units || []).length}台 を受け取りました。\n今の配管と建物（壁など）を、配管1に置きかえます。よろしいですか？`, "📐 置きかえる", () => { MP = {...r, cur:-1}; mpSave(); mpApply(0); });
  } catch(e){ console.warn(e); toast("図面編集から受け取れませんでした（" + (e.message || e) + "）"); } })();
window.mpApply = mpApply;
})();
