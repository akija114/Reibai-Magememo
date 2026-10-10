/* 冷媒配管の曲げ共有：core.js（src/build.py で作成） */
const SIZES=[
 ["2分 (1/4)",6.35,20000],["3分 (3/8)",9.52,20000],["4分 (1/2)",12.7,20000],["5分 (5/8)",15.88,20000],["6分 (3/4)",19.05,20000],
 ["7分 (7/8)",22.22,4000],["1インチ (8分)",25.4,4000],["28",28.58,4000],["31",31.75,4000],["38",38.1,4000],["44",44.45,4000]];
const ANG=[0,15,30,45,90,180];
const ANGC={15:"#16a34a",30:"#0891b2",45:"#7c3aed",90:"#dc2626",180:"#db2777"};
const TW=[[0,"⬆️"],[90,"➡️"],[180,"⬇️"],[270,"⬅️"]];
const DIR8=["上","右上","右","右下","下","左下","左","左上"],ARR8=["⬆️","↗️","➡️","↘️","⬇️","↙️","⬅️","↖️"];
const normT=t=>((Math.round(+t||0)%360)+360)%360;
const d8=t=>Math.round(normT(t)/45)%8;
const dirName=t=>{t=normT(t);return t%45===0?DIR8[t/45]:DIR8[d8(t)]+"寄り "+t+"°"};
const dirIco=(t,off)=>{const a=normT(t),x=50+26*Math.sin(a*Math.PI/180),y=50-26*Math.cos(a*Math.PI/180);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="g" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#63b8ff"/><stop offset=".6" stop-color="#2078f0"/><stop offset="1" stop-color="#0b57d0"/></radialGradient><linearGradient id="r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8fafc"/><stop offset="1" stop-color="#8b9bb0"/></linearGradient></defs><circle cx="50" cy="50" r="49" fill="url(#r)"/><circle cx="50" cy="50" r="42" fill="url(#g)"${off?' opacity=".45"':""}/><ellipse cx="36" cy="25" rx="22" ry="9" fill="#fff" opacity=".3" transform="rotate(-25 36 25)"/><circle cx="50" cy="50" r="30" fill="none" stroke="#fff" stroke-width="4"/>${[0,90,180,270].map(k=>{const s1=Math.sin(k*Math.PI/180),c1=Math.cos(k*Math.PI/180);return `<line x1="${50+24*s1}" y1="${50-24*c1}" x2="${50+30*s1}" y2="${50-30*c1}" stroke="#fff" stroke-width="4"/>`}).join("")}${off?"":`<line x1="50" y1="50" x2="${x}" y2="${y}" stroke="#ef4444" stroke-width="8" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="8" fill="#ef4444" stroke="#fff" stroke-width="3"/>`}<circle cx="50" cy="50" r="6" fill="#fff"/></svg>`;
 return `<img alt="" src="data:image/svg+xml;base64,${btoa(svg)}" style="width:30px;height:30px;flex:none">`};
const dirShort2=t=>{t=normT(t);return t%45===0?DIR8[t/45]:t+"°"};
const dirShort=t=>{t=normT(t);return ARR8[d8(t)]+(t%45===0?"":t+"°")};
const NUM="①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";
const nm=i=>i<20?NUM[i]:String(i+1);
const $=s=>document.querySelector(s);
/* ===== 単位（mm／インチ）と英語表記 ===== */
let UNIT=(()=>{try{return localStorage.getItem("pbm_unit")==="in"?"in":"mm"}catch(e){return "mm"}})();
let LANG=(()=>{try{const v=localStorage.getItem("pbm_lang");return["en","es","de"].includes(v)?v:"ja"}catch(e){return "ja"}})();
const IN=()=>UNIT==="in";
function fmtIn(mm){const neg=mm<0;let s=Math.round(Math.abs(mm)/25.4*16),ft=0;if(s>=192){ft=Math.floor(s/192);s-=ft*192}
 const w=Math.floor(s/16);let f=s%16,d=16;while(f&&f%2===0){f/=2;d/=2}
 const ins=(w||!f?String(w):"")+(f?(w?"-":"")+f+"/"+d:"");return(neg?"-":"")+(ft?ft+"' "+ins+'"':ins+'"')}
function parseIn(s){s=String(s).replace(/[″"]/g,"").trim();let ft=0;const m=s.match(/^(\d+(?:\.\d+)?)\s*['′]\s*(.*)$/);if(m){ft=+m[1];s=m[2]}
 let inch=0,ok=!!m;const f=s.match(/(\d+)\s*\/\s*(\d+)\s*$/);if(f){inch+=(+f[1])/((+f[2])||1);s=s.slice(0,f.index);ok=true}
 const w=s.match(/\d+(?:\.\d+)?/);if(w){inch+=+w[0];ok=true}return ok?Math.round((ft*12+inch)*25.4):NaN}
const uVal=mm=>IN()?String(+(mm/25.4).toFixed(2)):String(Math.round(mm));
const uParse=v=>IN()?parseIn(v):parseInt(String(v).replace(/[^0-9]/g,""));
const EN_DICT=window.EN_DICT||[],ES_DICT=window.ES_DICT||[],DE_DICT=window.DE_DICT||[];/* 翻訳データは lang.js（日本語以外の時だけ読み込む） */
let TRX=null,TRM=null;const BU=["","1/8","1/4","3/8","1/2","5/8","3/4","7/8","1"];
function trBuild(){TRM=new Map({en:EN_DICT,es:ES_DICT,de:DE_DICT}[LANG]||EN_DICT);TRX=new RegExp([...TRM.keys()].sort((a,b)=>b.length-a.length).map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|"),"g")}
function trS(s){if(typeof s!=="string"||!s)return s;
 if(LANG!=="ja"&&/[\u3040-\u30ff\u4e00-\u9fff\uff01-\uff5e\u3001\u3002\u300c\u300d\u301c]/.test(s)){if(!TRX)trBuild();
  s=s.replace(TRX,m=>TRM.get(m)).replace(/(\d+)分\s*\(([^)]+)\)/g,'$2"').replace(/(\d+)分/g,(m,n)=>+n>=1&&+n<=8?BU[+n]+'"':m);
  s=s.replace(/（/g," (").replace(/）/g,")").replace(/：/g,": ").replace(/、/g,", ").replace(/。/g,". ").replace(/[「」]/g,'"').replace(/〜/g,"–").replace(/＝/g," = ").replace(/／/g," / ").replace(/＋/g,"+").replace(/−/g,"−").replace(/　/g," ").replace(/[ ]{2,}/g," ").replace(/\( /g,"(").replace(/ \)/g,")").replace(/([^\s(\[])\(/g,"$1 (")}
 if(UNIT==="in"&&s.indexOf("mm")>=0)s=s.replace(/(-?\d[\d,]*(?:\.\d+)?)\s*mm\b/g,(m,n)=>fmtIn(+n.replace(/,/g,""))).replace(/(["'])\s*mm\b/g,"$1").replace(/\bmm\b/g,"in");
 return s}
const TR_ON=()=>LANG!=="ja"||UNIT==="in",TRA=["placeholder","title","aria-label"];
function trNode(n){
 if(n.nodeType===3){const v=n.nodeValue;if(n.__t!==undefined&&v===n.__t)return;let t=trS(v);if(t!==v&&LANG!=="ja"){const ps=n.previousSibling,ns=n.nextSibling;if(ps&&ps.nodeType===1&&/^[A-Za-z0-9(¿¡\u00c0-\u00ff]/.test(t))t=" "+t;if(ns&&ns.nodeType===1&&ns.tagName!=="BR"&&/[A-Za-z0-9.,:)\u00c0-\u00ff]$/.test(t))t=t+" "}n.__t=t;if(t!==v)n.nodeValue=t;return}
 if(n.nodeType!==1)return;const tg=n.tagName;if(tg==="SCRIPT"||tg==="STYLE"||n.hasAttribute("data-notr"))return;
 for(const a of TRA){if(!n.hasAttribute(a))continue;const v=n.getAttribute(a),k="__a_"+a;if(n[k]===v)continue;const t=trS(v);n[k]=t;if(t!==v)n.setAttribute(a,t)}
 if(tg==="INPUT"&&IN()&&n.getAttribute("inputmode")==="numeric"){n.setAttribute("inputmode","decimal");n.removeAttribute("pattern")}
 if(tg!=="TEXTAREA")for(const c of n.childNodes)trNode(c)}
if(LANG!=="ja")document.documentElement.classList.add("lx");
if(TR_ON()){
 try{const C=CanvasRenderingContext2D.prototype;["fillText","strokeText","measureText"].forEach(f=>{const o=C[f];C[f]=function(t,...a){return o.call(this,trS(String(t)),...a)}})}catch(e){}
 ["alert","confirm","prompt"].forEach(f=>{const o=window[f];if(o)window[f]=function(m,...a){return o.call(window,trS(String(m==null?"":m)),...a)}});
 const go=()=>{trNode(document.body);document.title=trS(document.title);if(LANG!=="ja")document.documentElement.lang=LANG;
  new MutationObserver(ms=>{for(const m of ms){if(m.type==="characterData")trNode(m.target);else if(m.type==="attributes")trNode(m.target);else m.addedNodes.forEach(trNode)}}).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:TRA})};
 if(document.body)go();else document.addEventListener("DOMContentLoaded",go);
}
function setUnitLang(u,l){try{if(u)localStorage.setItem("pbm_unit",u);if(l)localStorage.setItem("pbm_lang",l)}catch(e){}location.reload()}
const fmt=n=>IN()?fmtIn(n):Math.round(n).toLocaleString("ja-JP");
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const ROWICO={"shoe": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cmVjdCB4PSIxMiIgeT0iNTMiIHdpZHRoPSI3NiIgaGVpZ2h0PSIxNCIgcng9IjciIGZpbGw9IiM1YTI4MDgiLz48cmVjdCB4PSIxMy41IiB5PSI1NC41IiB3aWR0aD0iNzMiIGhlaWdodD0iMTEiIHJ4PSI1LjUiIGZpbGw9InVybCgjY3V2KSIvPjxyZWN0IHg9IjE2IiB5PSI1NiIgd2lkdGg9IjY4IiBoZWlnaHQ9IjIuNCIgcng9IjEuMiIgZmlsbD0iI2ZmZjRlMCIgb3BhY2l0eT0iLjgiLz48cmVjdCB4PSI0NyIgeT0iNDYiIHdpZHRoPSI2IiBoZWlnaHQ9IjI4IiByeD0iMiIgZmlsbD0iI2RjMjYyNiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxwb2x5Z29uIHBvaW50cz0iMzgsMjIgNjIsMjIgNTAsNDAiIGZpbGw9IiNmZmYiLz48cG9seWdvbiBwb2ludHM9IjQyLDI1IDU4LDI1IDUwLDM2IiBmaWxsPSIjZGMyNjI2Ii8+PC9zdmc+", "pull": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cmVjdCB4PSIxMiIgeT0iNTUiIHdpZHRoPSI3NiIgaGVpZ2h0PSIxNCIgcng9IjciIGZpbGw9IiM1YTI4MDgiLz48cmVjdCB4PSIxMy41IiB5PSI1Ni41IiB3aWR0aD0iNzMiIGhlaWdodD0iMTEiIHJ4PSI1LjUiIGZpbGw9InVybCgjY3V2KSIvPjxyZWN0IHg9IjE2IiB5PSI1OCIgd2lkdGg9IjY4IiBoZWlnaHQ9IjIuNCIgcng9IjEuMiIgZmlsbD0iI2ZmZjRlMCIgb3BhY2l0eT0iLjgiLz48ZyBmaWxsPSIjZmZmIj48cG9seWdvbiBwb2ludHM9IjQ0LDM2IDMwLDI4IDMwLDQ0Ii8+PHJlY3QgeD0iMTQiIHk9IjMzIiB3aWR0aD0iMTciIGhlaWdodD0iNiIgcng9IjIiLz48cG9seWdvbiBwb2ludHM9IjU2LDM2IDcwLDI4IDcwLDQ0Ii8+PHJlY3QgeD0iNjkiIHk9IjMzIiB3aWR0aD0iMTciIGhlaWdodD0iNiIgcng9IjIiLz48L2c+PHJlY3QgeD0iNDcuNSIgeT0iMjQiIHdpZHRoPSI1IiBoZWlnaHQ9IjI0IiByeD0iMiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==", "cum": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cmVjdCB4PSIxMiIgeT0iNTUiIHdpZHRoPSI3NiIgaGVpZ2h0PSIxNCIgcng9IjciIGZpbGw9IiM1YTI4MDgiLz48cmVjdCB4PSIxMy41IiB5PSI1Ni41IiB3aWR0aD0iNzMiIGhlaWdodD0iMTEiIHJ4PSI1LjUiIGZpbGw9InVybCgjY3V2KSIvPjxyZWN0IHg9IjE2IiB5PSI1OCIgd2lkdGg9IjY4IiBoZWlnaHQ9IjIuNCIgcng9IjEuMiIgZmlsbD0iI2ZmZjRlMCIgb3BhY2l0eT0iLjgiLz48cmVjdCB4PSIxNCIgeT0iMjYiIHdpZHRoPSI1IiBoZWlnaHQ9IjIyIiByeD0iMiIgZmlsbD0iI2ZmZiIvPjxyZWN0IHg9IjE4IiB5PSIzMyIgd2lkdGg9IjQ0IiBoZWlnaHQ9IjYiIHJ4PSIyIiBmaWxsPSIjZmZmIi8+PHBvbHlnb24gcG9pbnRzPSI3MiwzNiA1OCwyNyA1OCw0NSIgZmlsbD0iI2ZmZiIvPjxyZWN0IHg9IjczIiB5PSI0NCIgd2lkdGg9IjUiIGhlaWdodD0iMjYiIHJ4PSIyIiBmaWxsPSIjZGMyNjI2IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMS4yIi8+PC9zdmc+", "uw": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cGF0aCBkPSJNMzAgMzQgVjYwIEEyMCAyMCAwIDAgMCA3MCA2MCBWMzQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzVhMjgwOCIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTMwIDM0IFY2MCBBMjAgMjAgMCAwIDAgNzAgNjAgVjM0IiBmaWxsPSJub25lIiBzdHJva2U9InVybCgjY3UpIiBzdHJva2Utd2lkdGg9IjkiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxnIGZpbGw9IiNmZmYiPjxyZWN0IHg9IjMwIiB5PSIxOSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjUiIHJ4PSIyIi8+PHBvbHlnb24gcG9pbnRzPSIyNCwyMS41IDM0LDE1IDM0LDI4Ii8+PHBvbHlnb24gcG9pbnRzPSI3NiwyMS41IDY2LDE1IDY2LDI4Ii8+PC9nPjwvc3ZnPg==", "ofs": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cGF0aCBkPSJNMTQgNjYgSDM0IEw1NiAzOCBIODYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzVhMjgwOCIgc3Ryb2tlLXdpZHRoPSIxMSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTE0IDY2IEgzNCBMNTYgMzggSDg2IiBmaWxsPSJub25lIiBzdHJva2U9InVybCgjY3UpIiBzdHJva2Utd2lkdGg9IjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxnIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyLjUiIGZpbGw9IiNmZmYiPjxsaW5lIHgxPSI3NiIgeTE9IjQ0IiB4Mj0iNzYiIHkyPSI2MiIgc3Ryb2tlLWRhc2hhcnJheT0iMCIvPjxwb2x5Z29uIHBvaW50cz0iNzYsNDIgNzIsNDkgODAsNDkiIHN0cm9rZT0ibm9uZSIvPjxwb2x5Z29uIHBvaW50cz0iNzYsNjQgNzIsNTcgODAsNTciIHN0cm9rZT0ibm9uZSIvPjwvZz48dGV4dCB4PSI4MCIgeT0iNzgiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EsQXJpYWwiIGZvbnQtd2VpZ2h0PSI5MDAiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuW3rjwvdGV4dD48L3N2Zz4="};
const RI=k=>`<img alt="" src="${ROWICO[k]}" style="width:1.3em;height:1.3em;vertical-align:-0.32em;margin-right:2px">`;
let st={s:2,rows:[{l:1000,a:0,t:0}]};
try{const j=JSON.parse(localStorage.getItem("pbm1"));if(j&&Array.isArray(j.rows)&&j.rows.length&&SIZES[j.s])st=j}catch(e){}
function normInfo(i){i=i||{};return{site:String(i.site||"").slice(0,40),line:String(i.line||"").slice(0,40),kind:(i.kind==="液"||i.kind==="ガス")?i.kind:""}}
st.info=normInfo(st.info);
st.ps=SIZES[st.ps]?st.ps:null;
const normGoal=g=>Math.max(0,Math.round(+g||0));
st.goal=normGoal(st.goal);
const UNIT_KEYS=["","out","cas","cas2","ceil","wall","flr"];
/* メーカー機種（天井カセット）。メーカー図面の寸法（mm）。天井面＝0、配管は長手（L）の+x側端面から出る。
   L×W×H=本体（長手×奥行×高さ）、top=天井面から本体天面、pa×pb×pt=パネル、oa×ob=天井開口、ba×bb=吊りボルトピッチ、
   nk=天井面からネコ（吊り金具）、liq/gas/dr=端面での位置（z：端面を正面に見て右が−、y：天井面から） */
const MI2=(n,A,B,C,D,g,l)=>({mk:"mitsu",kind:"2方向",n,L:C,W:650,H:267,top:290,pa:A,pb:710,pt:45,oa:B,ob:670,ba:D,bb:574,nk:100,gas:{z:-173,y:168},liq:{z:-103,y:168},dr:{z:175,y:235},g,l,mi:1,tg:"（端から152mm）",tl:"（端から222mm）",td:"（端から500mm）"});
const DK2=(n,L,pa,oa,ba,g,l)=>({mk:"daikin",kind:"2方向",sub:"エコ・ダブルフロー",n,L,W:620,H:305,top:350,pa,pb:700,pt:45,oa,ob:640,ba,bb:520,nk:160,liq:{z:35,y:215},gas:{z:-50,y:215},dr:{z:-190,y:270},g,l,tg:"（中心から右50mm）",tl:"（中心から左35mm）",td:"（中心から右190mm）"});
const CAS2M={
 "40":MI2("PL-RP40LA18",1080,1040,770,824,"12.7","6.35"),
 "56":MI2("PL-RP45/50/56/63LA18",1250,1210,940,994,"12.7","6.35"),
 "80":MI2("PL-RP71/80LA18",1250,1210,940,994,"15.88","9.52"),
 dk_fhgp50:DK2("FHGP50FB",775,1070,1030,820,"12.7","6.4"),
 dk_fhgp80:DK2("FHGP80FB",990,1285,1245,1035,"15.9","9.5"),
 dk_fhgp160:DK2("FHGP140GA / FHGP160FB",1445,1740,1700,1490,"15.9","9.5"),
 dk_fhcp80:{mk:"daikin",kind:"4方向",sub:"S-ラウンドフロー",n:"FHCP80EM",L:840,W:840,H:288,top:288,pa:950,pb:950,pt:50,oa:885,ob:885,oTxt:"860〜910",ba:710,bb:780,nk:130,liq:{z:-280,y:125},gas:{z:-330,y:165},dr:{z:340,y:175},g:"15.9",l:"9.5",tg:"（中心から右330mm）",tl:"（中心から右280mm）",td:"（中心から左340mm）"},
 dk_fhkp80:{mk:"daikin",kind:"1方向",sub:"シングルフロー（SZRK160CDの室内機×2）",n:"FHKP80GA",L:1200,W:598,H:185,top:185,pa:1380,pb:658,pt:45,oa:1340,ob:618,ba:1250,bb:432,nk:99,liq:{z:161,y:69},gas:{z:98,y:137},dr:{z:8,y:175},g:"15.9",l:"9.5",tg:"（中心から左98mm）",tl:"（中心から左161mm）",td:""}};
/* 三菱 フリービルトイン形（ハウジングエアコン）MBZ-5022AS-IN：外形図 GA-MBZ5022AS（2ページ目）より。
   本体 高さ230×幅770(+65 電気品箱)×奥行450。冷媒配管・ドレンは「背面」から出る（背面図）：
   ガス：電気品箱側の本体端から44mm・本体下面から145mm／液：同99mm・下面から121mm／ドレンホース接続部：同100mm・下面から200mm。
   吊りボルトピッチ 777（幅方向）×398（奥行方向）。吹出しは正面（ダクト）、吸込みは上面3か所と背面（574×190）。
   模型の向き：配管の出る方向=+x（＝本体の背面）、本体の幅（770）は z 方向、電気品箱は +z 側。本体の下面＝天井面（基準の高さ）として描く。 */
CAS2M.mbz5022={mk:"mitsu",kind:"フリービルトイン",sub:"ハウジングエアコン・システムマルチ用",bi:1,n:"MBZ-5022AS-IN",L:450,W:770,H:230,top:230,pa:450,pb:835,pt:0,oa:450,ob:835,ba:398,bb:777,nk:180,
 gas:{z:341,y:145},liq:{z:286,y:121},dr:{z:285,y:200},g:"9.52",l:"6.35",dn:"ドレン VP20（ホース接続部・電気品箱側の端から100mm）",tg:"（電気品箱側の端から44mm）",tl:"（電気品箱側の端から99mm）",eb:[300,200,65,-30,130,417],
 spec:"冷房5.0kW／単相200V（電源は室外ユニットから供給）／質量18kg／電線：内外接続 VVFφ2.0×3本（S1・S2・S3、条件を満たせばφ1.6も可）／配管・ドレンは本体の背面から（フレア接続）／ドレン VP20（ドレンホース有効長166・断熱材外径φ32・接続部内径φ25、立ち上げは本体下面から500以下、その先は下り勾配1/100以上）／吊りボルトピッチ 777×398／設計圧力4.15MPa／接続室外機 MXZ-6821〜10221AS／外形 230×770(+65)×450"};
/* 三菱 4方向天井カセット PL-ZRP80HA5（据付工事説明書 bh79f170h01 の5・6ページ）
   本体840×840・天井面から天面298（本体281＋天井とのすき間17）／化粧パネル950×950（天井面から35下）／天井開口860〜910／吊ボルトピッチ795（配管の出る面と平行）×660／ネコは天井面から105（50〜70は全ねじの出寸法）
   配管の出る面を正面に見て：ガスφ15.88 中心から左271・天井から140、液φ9.52 中心から左331・天井から170、ドレンVP-25 中心から右357・天井から190。接続口は角の切り欠きの奥（側面から約77〜80mm内側） */
CAS2M.mi_zrp80={mk:"mitsu",kind:"4方向",sub:"スリム（ZRPシリーズ）",n:"PL-ZRP80HA5",L:840,W:840,H:281,top:298,pa:950,pb:950,pt:35,oa:885,ob:885,oTxt:"860〜910",ba:660,bb:795,nk:105,
 gas:{z:271,y:140},liq:{z:331,y:170},dr:{z:-357,y:190},pin:78,g:"15.88",l:"9.52",tg:"（中心から左271mm）",tl:"（中心から左331mm）",td:"（中心から右357mm・天井から190mm）",
 doc:"https://dl.mitsubishielectric.co.jp/dl/ldg/wink/ssl/wink_doc/m_contents/wink/PAC_IM/bh79f170h01.pdf"};
const CAS2_MAKERS=[["mitsu","三菱電機"],["daikin","ダイキン"]];
const CAS2_ORDER=["40","56","80","mi_zrp80","mbz5022","dk_fhgp50","dk_fhgp80","dk_fhgp160","dk_fhcp80","dk_fhkp80"];
/* 室外機の種類。w=幅(mm) h=高さ d=奥行 f=ファン(front=正面 / top=上吹き) 大きさは目安 */
const OUTM={
 room:{py:100,pz:-75,n:"ルームエアコン",sub:"ハウジング",w:800,h:550,d:290,f:"front",nf:1},
 p40:{py:200,pz:0,n:"パッケージ P40〜63",sub:"小型",w:950,h:800,d:350,f:"front",nf:1},
 p80:{py:200,pz:0,n:"パッケージ P80",sub:"ファン1個",w:990,h:1330,d:370,f:"front",nf:1},
 dk160:{py:410,pz:0,n:"ダイキン RZRP160C",sub:"P160・SZRK160CDの室外機",w:940,h:1080,d:320,f:"front",nf:1},
 p112:{py:200,pz:0,n:"パッケージ P112〜160",sub:"ファン2段",w:1000,h:1690,d:370,f:"front",nf:2},
 vrv:{py:250,pz:0,n:"ビルマルチ 小",sub:"上吹き1ファン",w:930,h:1690,d:765,f:"top",nf:1},
 vrv2:{py:250,pz:0,n:"ビルマルチ 大",sub:"上吹き2ファン",w:1700,h:1690,d:765,f:"top",nf:2},
 ghp:{py:250,pz:0,n:"GHP",sub:"ガスヒートポンプ",w:1000,h:1800,d:1100,f:"top",nf:1,ghp:true}
};
const OUT_PKG=["p40","p80","p112","dk160"];
const OUT_X={s:"右側面（前から50mm内側）",f:"正面（表）",b:"背面（裏）",d:"真下（手前）",l:"左下（正面からまっすぐ）",m:"真下（左・手前）"};
const OUT_VRV=["vrv","vrv2"];
const outAllow=mk=>OUT_PKG.includes(mk)?["s","f","b","d"]:mk==="room"?["b"]:OUT_VRV.includes(mk)?["l","m"]:mk==="ghp"?["f"]:["s"];
const OUT_XORDER=["s","f","b","d"];
/* 自然な向き→配管口基準の向きへの回転（自然のx,y,z軸が移る先） */
const OUT_R={s:[[1,0,0],[0,1,0],[0,0,1]],f:[[0,0,-1],[0,1,0],[1,0,0]],b:[[0,0,1],[0,1,0],[-1,0,0]],d:[[0,0,-1],[-1,0,0],[0,1,0]],m:[[0,0,-1],[-1,0,0],[0,1,0]],l:[[0,0,-1],[0,1,0],[1,0,0]]};
function outExitKey(mk,k){const a=outAllow(mk);return a.includes(k)?k:a[0]}
function outPort(mk,k){
 const m=OUTM[mk]||OUTM.room,W=m.w,D=m.d;
 if(mk==="room")return[W/2+45,100,-30]; // 右側面の外側45mm、後ろ向きに出る
 if(mk==="ghp")return[-W/2+120,150,D/2];
 if(OUT_VRV.includes(mk))return k==="m"?[-W/2+120,0,D/2-60]:[-W/2+180,175,D/2];
 if(mk==="dk160")return k==="f"?[W/2-70,410,D/2]:k==="b"?[W/2-70,410,-D/2]:k==="d"?[W/2-70,0,D/2-75]:[W/2,410,D/2-75];   // 閉鎖弁は右前・高さ400〜417
 if(!OUT_PKG.includes(mk))return[W/2,m.py,m.pz];
 return k==="f"?[W/2-120,200,D/2]:k==="b"?[W/2-120,200,-D/2]:k==="d"?[W/2-120,0,D/2-60]:[W/2,200,D/2-50];
}
const OUT_ORDER=["room","p40","p80","p112","vrv","vrv2","ghp","dk160"];
const WALLX={
 rb:{n:"右後ろ",k:"b",p:[290,-60,0]},rs:{n:"右横",k:"r",p:[400,-60,60]},rd:{n:"右下",k:"d",p:[290,-145,60]},
 lb:{n:"左後ろ",k:"b",p:[-290,-60,0]},ls:{n:"左横",k:"l",p:[-400,-60,60]},ld:{n:"左下",k:"d",p:[-290,-145,60]}};
const WALL_ORDER=["rb","rs","rd","lb","ls","ld"];
const DIRN={b:[0,0,-1],r:[1,0,0],l:[-1,0,0],d:[0,-1,0]};
function wrot(k,x,y,z){
 if(k==="d")return[-y,x,z];
 if(k==="b")return[-z,y,x];
 if(k==="l")return[-x,y,-z];
 return[x,y,z];
}
function wallPose(key){
 const w=WALLX[key]||WALLX.rb,k=w.k,pr=wrot(k,w.p[0],w.p[1],w.p[2]),pos=[-pr[0],-pr[1],-pr[2]];
 let sx=0,n=0,mx=-1e9,my=-1e9;
 [-400,400].forEach(x=>[-145,145].forEach(y=>[0,215].forEach(z=>{
  const q=wrot(k,x,y,z),X=q[0]+pos[0],Y=q[1]+pos[1];sx+=X;n++;mx=Math.max(mx,X);my=Math.max(my,Y)})));
 const dd=DIRN[k];
 return{k,pos,cx:sx/n,top:my,maxX:mx,dir:wrot(k,dd[0],dd[1],dd[2]),name:w.n};
}
const MAKERS=[["daikin","ダイキン",-1,1],["mitsu","三菱電機",1,1],["pana","パナソニック",-1,1],["hitachi","日立",1,1],["toshiba","東芝",-1,1],["mhi","三菱重工",1,1]];
const BR_ICO="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjQ1IiBzdG9wLWNvbG9yPSIjZTg5MDNmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjOWE0YTEyIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48ZyBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiPgoKPHBhdGggZD0iTTUwIDUwIEM2MCA1MCA2NCAzMiA3NiAzMCBMODQgMjkiIHN0cm9rZT0iIzVhMjgwOCIgc3Ryb2tlLXdpZHRoPSIxMCIvPjxwYXRoIGQ9Ik01MCA1MCBDNjAgNTAgNjQgNjggNzYgNzAgTDg0IDcxIiBzdHJva2U9IiM1YTI4MDgiIHN0cm9rZS13aWR0aD0iMTAiLz4KPHBhdGggZD0iTTUwIDUwIEM2MCA1MCA2NCAzMiA3NiAzMCBMODQgMjkiIHN0cm9rZT0idXJsKCNjdSkiIHN0cm9rZS13aWR0aD0iNyIvPjxwYXRoIGQ9Ik01MCA1MCBDNjAgNTAgNjQgNjggNzYgNzAgTDg0IDcxIiBzdHJva2U9InVybCgjY3UpIiBzdHJva2Utd2lkdGg9IjciLz4KCjxwYXRoIGQ9Ik01MCA0Ny41IEM1OSA0Ny41IDYzIDMwIDc2IDI3LjUgTDg0IDI2LjUiIHN0cm9rZT0iI2ZmZjRlMCIgc3Ryb2tlLXdpZHRoPSIxLjYiIG9wYWNpdHk9Ii43NSIvPgo8cGF0aCBkPSJNNTIgNDggQzYwIDQ5IDY0IDY2IDc2IDY3LjUgTDg0IDY4LjUiIHN0cm9rZT0iI2ZmZjRlMCIgc3Ryb2tlLXdpZHRoPSIxLjYiIG9wYWNpdHk9Ii42Ii8+CjwvZz4KPHJlY3QgeD0iOSIgeT0iNDMuNSIgd2lkdGg9IjM2IiBoZWlnaHQ9IjEzIiByeD0iNi41IiBmaWxsPSIjNWEyODA4Ii8+PHJlY3QgeD0iMTAuNSIgeT0iNDUiIHdpZHRoPSIzMyIgaGVpZ2h0PSIxMCIgcng9IjUiIGZpbGw9InVybCgjY3UpIi8+PHJlY3QgeD0iMTIiIHk9IjQ2IiB3aWR0aD0iMzAiIGhlaWdodD0iMiIgcng9IjEiIGZpbGw9IiNmZmY0ZTAiIG9wYWNpdHk9Ii44Ii8+CjxyZWN0IHg9IjM2IiB5PSI0MSIgd2lkdGg9IjIwIiBoZWlnaHQ9IjE4IiByeD0iNiIgZmlsbD0iIzVhMjgwOCIvPjxyZWN0IHg9IjM3LjUiIHk9IjQyLjUiIHdpZHRoPSIxNyIgaGVpZ2h0PSIxNSIgcng9IjUiIGZpbGw9InVybCgjY3UpIi8+PHJlY3QgeD0iMzkiIHk9IjQ0IiB3aWR0aD0iMTQiIGhlaWdodD0iMyIgcng9IjEuNSIgZmlsbD0iI2ZmZjRlMCIgb3BhY2l0eT0iLjc1Ii8+Cjwvc3ZnPg==";
const BRI=(h)=>`<img alt="" src="${BR_ICO}" style="width:${h||"1.35em"};height:${h||"1.35em"};vertical-align:-0.35em;margin-right:4px">`;
const LEGIDS="abcdefghijklmnopqrstuvwx".split("");
function normUnits(u){u=u||{};const o={he:Array.isArray(u.he)&&u.he.length===2&&u.he.every(isFinite)?u.he.map(Number):null,on:u.on!==false,s:UNIT_KEYS.includes(u.s)?u.s:"",e:UNIT_KEYS.includes(u.e)?u.e:"",ws:WALLX[u.ws]?u.ws:"rb",we:WALLX[u.we]?u.we:"rb",mk:MAKERS.some(m=>m[0]===u.mk)?u.mk:"daikin",flip:!!u.flip,os:OUTM[u.os]?u.os:"room",oe:OUTM[u.oe]?u.oe:"room",xs:OUT_X[u.xs]?u.xs:"s",xe:OUT_X[u.xe]?u.xe:"s",cs:u.cs==="r"?"r":"f",ce:u.ce==="r"?"r":"f",ms:CAS2M[u.ms]?u.ms:"56",me:CAS2M[u.me]?u.me:"56"};
 LEGIDS.forEach(id=>{const k="L"+id;if(u[k]===undefined)return;
  o[k]=UNIT_KEYS.includes(u[k])?u[k]:"";o["wL"+id]=WALLX[u["wL"+id]]?u["wL"+id]:"rb";o["oL"+id]=OUTM[u["oL"+id]]?u["oL"+id]:"room";o["xL"+id]=OUT_X[u["xL"+id]]?u["xL"+id]:"s";o["cL"+id]=u["cL"+id]==="r"?"r":"f";o["mL"+id]=CAS2M[u["mL"+id]]?u["mL"+id]:"56"});
 return o}
/* 旧データ（枝A・枝Bだけ）→ 新形式（枝の一覧）へ */
function migrateLegacy(o){
 if(!o||!o.br||o.bl)return;
 const b=o.br;o.bl=[];
 if(b.on){
  o.bl=[{id:"a",p:"m",s:b.a&&b.a.s,rows:b.a&&b.a.rows},{id:"b",p:"m",s:b.b&&b.b.s,rows:b.b&&b.b.rows}];
  const u=o.units=o.units||{};
  [["a","e"],["b","f"]].forEach(([id,k])=>{u["L"+id]=u[k]===undefined?"":u[k];u["wL"+id]=u["w"+k];u["oL"+id]=u["o"+k];u["xL"+id]=u["x"+k];u["cL"+id]=u["c"+k]});
 }
 delete o.br;
}
function unitSide(cas){const m=MAKERS.find(x=>x[0]===st.units.mk)||MAKERS[0];return(cas?m[2]:1)*(st.units.flip?-1:1)}
const sideName=s=>s<0?"左":"右";
migrateLegacy(st);
st.units=normUnits(st.units);
/* 支持：曲げの間の長さごとの本数・位置ルール */
const SUPD={on:true,t1:300,t2:600,t3:1500,t4:2000,off:300,gap:1000,vt1:400,vt2:600,vt3:1000,vt4:1500,voff:300,vgap:1500};
function normSup(x){x=x||{};const n=k=>{const v=Math.round(+x[k]);return isFinite(v)&&v>=0&&v<=20000?v:SUPD[k]};
 return{on:x.on!==false,t1:n("t1"),t2:n("t2"),t3:n("t3"),t4:n("t4"),off:n("off"),gap:Math.max(100,n("gap")),vt1:n("vt1"),vt2:n("vt2"),vt3:n("vt3"),vt4:n("vt4"),voff:n("voff"),vgap:Math.max(100,n("vgap"))}}
st.sup=normSup(st.sup);
/* 地面：基準の決め方 auto=一番低い所 / start=起点の高さ / unit=室内機の下面の高さ */
function normGnd(x){x=x||{};const h=Math.round(+x.h);return{on:x.on!==false,mode:["auto","start","unit","pipe"].includes(x.mode)?x.mode:"auto",g:typeof x.g==="string"?x.g.slice(0,2):"m",r:Math.max(0,Math.round(+x.r)||0),h:isFinite(h)&&h>=0&&h<=50000?h:2500,c:!!x.c,ch:(+x.ch>=500&&+x.ch<=20000)?Math.round(+x.ch):2500,unit:typeof x.unit==="string"?x.unit.slice(0,4):""}}
st.gnd=normGnd(st.gnd);
/* 支持の位置：横走り管と立て管（vert）で別のルール */
function supPos(l,vert){
 const S=st.sup,g=k=>S[(vert?"v":"")+k];if(!S.on||l<=0||l<=g("t1"))return[];
 if(l<=g("t2"))return[l/2];
 const off=Math.min(g("off"),l/2),span=l-2*off,p=[off,l-off];
 let n=Math.max(0,Math.ceil(span/Math.max(100,g("gap"))-1e-9)-1);
 if(l>g("t3"))n=Math.max(n,1);
 for(let k=1;k<=n;k++)p.push(off+span*k/(n+1));
 return p.sort((a,b)=>a-b);
}
const supCount=g=>{const x=supHV(g);return x.h+x.v};
/* 各行の直管の向き（3Dと同じ計算を軽く）→ 縦管か横管か */
function legDirs(){
 const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],crs=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const nrm=a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]},add=(a,b,k)=>[a[0]+b[0]*k,a[1]+b[1]*k,a[2]+b[2]*k];
 const rot=(v,n,t)=>{const c=Math.cos(t),s=Math.sin(t),k=crs(n,v),d=dot(n,v);return[v[0]*c+k[0]*s+n[0]*d*(1-c),v[1]*c+k[1]*s+n[1]*d*(1-c),v[2]*c+k[2]*s+n[2]*d*(1-c)]};
 const U=st.units,w0=WALLX[U.ws]||WALLX.rb;
 const down=(U.on&&U.s==="wall"&&w0.k==="d")||(U.on&&U.s==="out"&&["d","m"].includes(outExitKey(U.os,U.xs)));
 const ex=down?[0,-1,0]:[1,0,0];let up=[0,1,0];if(Math.abs(dot(ex,up))>0.95)up=[0,0,1];
 const ey=nrm(add(up,ex,-dot(up,ex))),ez=crs(ex,ey);
 const out={},endF={};
 const run=(g,F)=>{let [d,u,r]=F;const rows=legRows(g),ds=[];
  rows.forEach((row,i)=>{ds.push(d);if(!row.a)return;const th=row.a*Math.PI/180,tw=effT(i,rows)*Math.PI/180;
   const b=add(u.map(x=>x*Math.cos(tw)),r,Math.sin(tw)),n=nrm(crs(d,b));d=rot(d,n,th);u=rot(u,n,th);r=rot(r,n,th)});
  out[g]=ds;endF[g]=[d,u,r]};
 run("m",[ex,ey,ez]);
 st.bl.forEach(l=>run(l.id,endF[l.p]||[ex,ey,ez]));
 return out;
}
const isVert=d=>Math.abs(d[1])>0.8;
function supHV(g,dirs){
 dirs=dirs||legDirs();const ds=dirs[g]||[];let h=0,v=0;
 legRows(g).forEach((r,i)=>{const vt=!!(ds[i]&&isVert(ds[i])),n=supPos(r.l,vt).length;if(vt)v+=n;else h+=n});
 return{h,v};
}
function effT(i,rows){rows=rows||LR();const r=rows[i];return(r.o&&i>0)?(effT(i-1,rows)+180)%360:r.t}
/* 分岐管：メイン(st.rows)＋枝の一覧(st.bl)。いま編集している配管が leg */
function normRows(rows,def){
 if(!Array.isArray(rows)||!rows.length)return def;
 return rows.slice(0,60).map(r=>({l:Math.max(0,+r.l||0),a:ANG.includes(+r.a)?+r.a:0,t:normT(r.t),o:!!r.o}));
}
const DEFROWS=side=>[{l:500,a:45,t:side,o:false},{l:800,a:0,t:0,o:false}];
function normBL(arr){
 if(!Array.isArray(arr))return[];
 const ids=new Set(["m"]),out=[];
 arr.slice(0,24).forEach(x=>{
  if(!x||!LEGIDS.includes(x.id)||ids.has(x.id)||!ids.has(x.p))return;
  ids.add(x.id);out.push({id:x.id,p:x.p,s:SIZES[x.s]?x.s:2,ps:SIZES[x.ps]?x.ps:null,rows:normRows(x.rows,DEFROWS(90))});
 });
 return out;
}
st.bl=normBL(st.bl);
let leg="m";
let GUIDE=null;   // 曲げ手順（ベンダー）モード
let GUIDE_H=750;try{GUIDE_H=+localStorage.getItem("pbm_bh")||750}catch(e){}   // ベンダーの台の高さ（床から配管まで）
/* 使うベンダー：曲げ半径R（配管の中心）をサイズごとに持つ。表にないサイズは R=外径×4（4D）。バック＝R×角度/90 */
const BENDERS={
 ta515:{n:"ギアベンダー TA515",sub:"TASCO 青い本体・クランク・三脚・7分〜44（R=4D）",R:{},S:[22.22,25.4,28.58,31.75,38.1,44.45]},
 g4d:{n:"ラチェット式",sub:"TASCO ギア式直管ベンダー・三脚・7/8・1・1-1/8（R=4D）",R:{},S:[22.22,25.4,28.58]},
 ek:{n:"電動 TA515EK-N",sub:"TASCO 電動・三脚・7/8〜1-1/2（ダイスの刻印R）",R:{"22.22":98,"25.4":101,"28.58":102},S:[22.22,25.4,28.58,31.75,38.1]},
 mb:{n:"手動ミニ TA515MB",sub:"TASCO 直管ミニベンダー・1/2〜1-1/4（R=4D）",R:{},S:[12.7,15.88,19.05,22.22,25.4,28.58,31.75]},
 lev:{n:"レバー式 TA540G",sub:"TASCO 2段式クイックアクションカラーベンダー・3分〜6分（メーカーR）",R:{"9.52":23.8,"12.7":38,"15.88":57.2,"19.05":76.2},S:[9.52,12.7,15.88,19.05]},
 levb:{n:"レバー式 TA540B",sub:"TASCO 2段式クイックアクション（青）・4分〜7分・R未確認（仮に外径×4）",R:{},S:[12.7,15.88,19.05,22.22],unk:1},
 rat:{n:"ラチェットベンダー TA512AX",sub:"TASCO ラチェットベンダーセット・2分〜7分・R未確認（仮に外径×4）",R:{},S:[6.35,9.52,12.7,15.88,19.05,22.22],unk:1},
 my:{n:"マイベンダー",sub:"自分でRを入れる・全サイズ",R:{}}};
let BENDER="ta515",MYR={};try{const b=localStorage.getItem("pbm_bender");if(BENDERS[b])BENDER=b;MYR=JSON.parse(localStorage.getItem("pbm_myR")||"{}")||{}}catch(e){}
const isStr=D=>{const z=SIZES.find(x=>x[1]===D);return !!z&&z[2]<=4000};   // 4m直管のサイズ（7分〜）
const benOn=D=>BENDER==="my"||(BENDERS[BENDER].S||[]).includes(D);   // ベンダーごとの対応サイズだけ。対応外は標準（外径×4）
const szName=D=>(SIZES.find(x=>x[1]===D)||[""])[0];
const bR=D=>{if(!benOn(D))return 4*D;const t=BENDER==="my"?MYR:BENDERS[BENDER].R,v=+t[String(D)];return v>0?v:4*D};
const bRtxt=D=>{if(!benOn(D))return "外径×4";if(BENDERS[BENDER].unk)return "R未確認・仮に外径×4";const t=BENDER==="my"?MYR:BENDERS[BENDER].R;return +t[String(D)]>0?"R"+fmt(bR(D)):"外径×4"};
let DIE_R=false;try{DIE_R=localStorage.getItem("pbm_die")==="R"}catch(e){}   // ダイスが後ろから見て右側
const legObj=g=>st.bl.find(l=>l.id===g);
const legRows=g=>g==="m"?st.rows:(legObj(g)||{rows:st.rows}).rows;
const legSize=g=>g==="m"?st.s:(legObj(g)||{s:st.s}).s;
const legName=g=>g==="m"?"メイン":"枝"+g.toUpperCase();
const brOn=()=>st.bl.length>0;
const legIds=()=>["m",...st.bl.map(l=>l.id)];
const kids=g=>st.bl.filter(l=>l.p===g);
const leafSlot=g=>st.bl.length===0?"e":"L"+g;
const leaves=()=>legIds().filter(g=>kids(g).length===0);
const slotName=k=>k==="s"?"起点":k==="e"?"終点":"終点"+k.slice(1).toUpperCase()+"（枝"+k.slice(1).toUpperCase()+"）";
const LEGPAL=["#0d9488","#7c3aed","#0891b2","#4f46e5","#65a30d","#a21caf","#0f766e","#be185d","#1d4ed8","#7e22ce","#047857","#9333ea"];
const drawnKind=()=>st.info.kind==="液"?"液":"ガス";
const defPartner=s=>drawnKind()==="ガス"?Math.max(0,s-2):Math.min(SIZES.length-1,s+2);
const legPS=g=>{const v=g==="m"?st.ps:(legObj(g)||{}).ps;return SIZES[v]?v:defPartner(legSize(g))};
const legLG=g=>drawnKind()==="液"?{liq:legSize(g),gas:legPS(g)}:{liq:legPS(g),gas:legSize(g)};
function setLegKind(g,kind,v){const o=g==="m"?st:legObj(g);if(!o)return;if(kind===drawnKind())o.s=v;else o.ps=v}
const legLen=g=>legRows(g).reduce((a,r)=>a+r.l,0);
const szN=i=>SIZES[i][0];
const fmtM=mm=>IN()?(mm/304.8).toFixed(1)+"ft":(mm/1000).toFixed(2)+"m";
function szSelect(val,on){const sel=document.createElement("select");sel.className="tsz";sel.innerHTML=SIZES.map((z,i)=>`<option value="${i}"${i===val?" selected":""}>${z[0]}</option>`).join("");sel.onchange=()=>on(+sel.value);return sel}
const legColor=g=>g==="m"?"#2563eb":LEGPAL[Math.max(0,st.bl.findIndex(l=>l.id===g))%LEGPAL.length];
const LR=()=>legRows(leg);
let hist=null,hi=0,histT=0;
const save=(merge)=>{
 const j=JSON.stringify(st);
 try{localStorage.setItem("pbm1",j)}catch(e){}
 if(!hist||j===hist[hi])return;
 const now=Date.now();
 if(merge&&hi>0&&hi===hist.length-1&&now-histT<1500)hist[hi]=j;
 else{hist.length=hi+1;hist.push(j);hi++;if(hist.length>100){hist.shift();hi--}}
 histT=now;updUndoUI();
};
function updUndoUI(){const u=$("#undoBtn"),r=$("#redoBtn");if(!u||!r)return;u.disabled=!(hist&&hi>0);r.disabled=!(hist&&hi<hist.length-1)}
function histGo(d){
 if(!hist)return;const n=hi+d;if(n<0||n>=hist.length)return;
 hi=n;const o=JSON.parse(hist[hi]);
 st={s:SIZES[o.s]?o.s:2,rows:normRows(o.rows,[{l:500,a:90,t:0,o:false}]),ps:SIZES[o.ps]?o.ps:null,bl:normBL(o.bl),sup:normSup(o.sup),gnd:normGnd(o.gnd),info:normInfo(o.info),goal:normGoal(o.goal),units:normUnits(o.units),bld:normBld(o.bld),bldXf:o.bldXf||null,bldKey:o.bldKey||"",bldHide:!!o.bldHide,nopipe:!!o.nopipe,scan:o.scan||st.scan};
 if(!legIds().includes(leg))leg="m";
 try{localStorage.setItem("pbm1",JSON.stringify(st))}catch(e){}
 histT=0;sel=0;render();if(T)fitT(true);updUndoUI();
 toast(d<0?"↩️ 1つ前に戻しました":"↪️ 1つ先に進めました");
}
function renderInfo(){
 const i=st.info,z=SIZES[st.s];
 const kind=i.kind==="液"?"💧液管":i.kind==="ガス"?"💨ガス管":"";
 const parts=[i.site&&"🏢 "+i.site,i.line&&"🔢 "+i.line,kind&&kind+" "+z[0]].filter(Boolean);
 const el=$("#stInfo");el.classList.toggle("on",parts.length>0&&LABC.info!==false);
 el.innerHTML="";
 parts.forEach(p=>{const d=document.createElement("div");d.textContent=p;el.appendChild(d)});
}
const cur=g=>{const z=SIZES[legSize(g||leg)];return{D:z[1],lim:z[2]}};
let sel=0,T=null;

function toast(msg){
 const t=$("#toast");t.textContent=msg;t.style.pointerEvents="";t.classList.add("on");
 clearTimeout(toast._h);toast._h=setTimeout(()=>t.classList.remove("on"),2000);
}
/* 消した直後だけ「↶ 元に戻す」を出す（4秒） */
function toastUndo(msg){
 const t=$("#toast");t.innerHTML=msg+' <button style="margin-left:8px;background:#fbbf24;color:#111827;font-weight:800;border-radius:12px;padding:5px 11px;font-size:13px">↶ 元に戻す</button>';
 t.style.pointerEvents="auto";t.classList.add("on");
 t.querySelector("button").onclick=()=>{histGo(-1);t.classList.remove("on");t.style.pointerEvents=""};
 clearTimeout(toast._h);toast._h=setTimeout(()=>{t.classList.remove("on");t.style.pointerEvents=""},4000);
}

function calc(g){
 g=g||leg;const {D,lim}=cur(g);let cum=0,tot=0;
 const out=legRows(g).map(r=>{const back=bR(D)*r.a/90,shoe=r.l-back;cum+=shoe;tot+=r.l;return{back,shoe,cum,over:tot>lim}});
 return{out,tot,lim};
}

const HID=new Set();
let lastTab={g:"",t:0};
function toggleHide(g){
 if(HID.has(g))HID.delete(g);else HID.add(g);
 renderLegBar();if(T){build3D();T.dirty=true}
 toast(legName(g)+(HID.has(g)?" を非表示にしました（もう一度2回タップで表示）":" を表示しました"));
}
function setAllHid(h){
 HID.clear();if(h)legIds().forEach(g=>HID.add(g));
 renderLegBar();if(T){build3D();T.dirty=true}
 toast(h?"配管をすべて非表示にしました":"配管をすべて表示しました");
}
const szShort=i=>SIZES[i][0].split(" ")[0];
function renderLegBar(){
 if(!legIds().includes(leg))leg="m";
 const box=$("#legbar");box.innerHTML="";
 {const nb=document.createElement("button");nb.className="legundo legnew";nb.innerHTML='<span style="font-size:15px;line-height:1">🆕</span><small>新規</small>';nb.setAttribute("aria-label","新規作成");nb.onclick=openNew;box.appendChild(nb)}
 [["undoBtn","↩️","1つ前に戻る",-1],["redoBtn","↪️","1つ先に進む",1]].forEach(([id,ic,lab,d])=>{
  const b=document.createElement("button");b.className="legundo";b.id=id;b.textContent=ic;b.setAttribute("aria-label",lab);b.onclick=()=>histGo(d);box.appendChild(b);
 });
 updUndoUI();
 if(!brOn()){
  const b=document.createElement("button");b.className="legadd";b.innerHTML=BRI()+"分岐管を追加（メイン → 枝A・枝B）";
  b.onclick=addBranch;box.appendChild(b);
 }else{
  const wrap=document.createElement("div");wrap.className="legtabs";box.appendChild(wrap);
  let act=null;
  legIds().forEach(g=>{
   const col=legColor(g),b=document.createElement("button");b.className="legtab"+(leg===g?" on":"");
   if(leg===g){b.style.background=col;act=b}else b.style.borderColor=col+"88";
   b.innerHTML=`<i class="dot" style="background:${col}"></i>${legName(g)}<small>${szShort(legSize(g))}</small>`;
   if(HID.has(g))b.classList.add("off");
   b.onclick=()=>{const now=Date.now();
    if(lastTab.g===g&&now-lastTab.t<450){lastTab={g:"",t:0};toggleHide(g)}
    else{lastTab={g,t:now};setLeg(g)}};
   wrap.appendChild(b);
  });
  [["👁 全表示",()=>setAllHid(false)],["🙈 全非表示",()=>setAllHid(true)]].forEach(([t,f])=>{const b=document.createElement("button");b.className="legall";b.textContent=t;b.onclick=f;wrap.appendChild(b)});
  if(act)wrap.scrollLeft=Math.max(0,act.offsetLeft-70);
  const c=document.createElement("button");c.className="legctx";
  if(kids(leg).length){c.classList.add("del");c.textContent="🗑 "+legName(leg)+"の先の分岐を削除";c.onclick=removeBranch}
  else{
   const used=new Set(st.bl.map(l=>l.id)),fr=LEGIDS.filter(x=>!used.has(x));
   c.innerHTML=BRI()+legName(leg)+"の先に分岐を追加"+(fr.length>=2?"（→ 枝"+fr[0].toUpperCase()+"・枝"+fr[1].toUpperCase()+"）":"");
   c.onclick=addBranch;
  }
  box.appendChild(c);
 }
 $("#sz").value=legSize(leg);
}
function setLeg(g){if(leg===g)return;leg=g;sel=0;render();if(T){T.dirty=true;focusLeg(g)}}
/* 選んだ配管が全体に映るようにカメラを動かす（向きはそのまま） */
function focusLeg(g){
 if(!T||!T.legBox||!T.legBox[g])return;
 const V=THREE.Vector3,b=T.legBox[g],c=b.getCenter(new V()),sz=b.getSize(new V());
 const e=Math.max(sz.x,sz.y,sz.z,600);
 const d=(e/2)/Math.tan(THREE.MathUtils.degToRad(T.cam.fov/2))*1.8;
 const t0=T.tg.clone(),d0=T.dist,s0=performance.now();
 cancelAnimationFrame(focusLeg.h);
 const step=()=>{const k=Math.min(1,(performance.now()-s0)/750),q=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;T.tg.copy(t0).lerp(c,q);T.dist=d0+(d-d0)*q;T.dirty=true;if(k<1)focusLeg.h=requestAnimationFrame(step)};
 step();
}
function addBranch(){
 const g=leg;if(kids(g).length)return;
 const used=new Set(st.bl.map(l=>l.id)),free=LEGIDS.filter(x=>!used.has(x));
 if(free.length<2){toast("これ以上は増やせません");return}
 const [a,b]=free,sz=Math.max(0,legSize(g)-1),u=st.units,gk=leafSlot(g);
 st.bl.push({id:a,p:g,s:sz,rows:DEFROWS(90)},{id:b,p:g,s:sz,rows:DEFROWS(270)});
 [a,b].forEach(id=>{u["L"+id]=u[gk]||"";u["wL"+id]=u["w"+gk];u["oL"+id]=u["o"+gk];u["xL"+id]=u["x"+gk];u["cL"+id]=u["c"+gk]});
 st.units=normUnits(u);
 sel=0;save();render();if(T){build3D();fitT()}
 toast("🔀 "+legName(g)+"の先に枝"+a.toUpperCase()+"・枝"+b.toUpperCase()+"を追加しました");
}
function askConfirm(msg,okLabel,cb){
 $("#cfMsg").textContent=msg;$("#cfOk").textContent=okLabel;
 $("#cfOk").onclick=()=>{$("#cfOv").classList.remove("on");cb()};
 $("#cfOv").classList.add("on");
}
$("#cfNo").onclick=()=>$("#cfOv").classList.remove("on");
$("#cfOv").addEventListener("click",e=>{if(e.target.id==="cfOv")$("#cfOv").classList.remove("on")});
function removeBranch(){
 const g=leg,sub=new Set(),walk=x=>kids(x).forEach(k=>{sub.add(k.id);walk(k.id)});walk(g);
 if(!sub.size)return;
 askConfirm(legName(g)+"の先の分岐管を削除しますか？\n"+[...sub].map(legName).join("・")+" の入力と機器も消えます。","🗑 削除する",()=>{
  st.bl=st.bl.filter(l=>!sub.has(l.id));
  const u=st.units;[...sub].forEach(id=>["L","wL","oL","xL","cL"].forEach(p=>delete u[p+id]));
  st.units=normUnits(u);
  sel=0;save();render();if(T){build3D();fitT()}
  toast("分岐管を削除しました（↩️で元に戻せます）");
 });
}

$("#sz").innerHTML='<optgroup label="コイル管 20m">'+SIZES.slice(0,5).map((z,i)=>`<option value="${i}">${z[0]}</option>`).join("")+'</optgroup><optgroup label="直管 4m">'+SIZES.slice(5).map((z,i)=>`<option value="${i+5}">${z[0]}</option>`).join("")+"</optgroup>";
$("#sz").value=st.s;
$("#sz").onchange=e=>{const v=+e.target.value;if(leg==="m")st.s=v;else legObj(leg).s=v;save();renderLegBar();upd()};

function render(){
 renderLegBar();
 const box=$("#rows");box.innerHTML="";
 sel=clamp(sel,0,LR().length-1);
 LR().forEach((r,i)=>{
  const el=document.createElement("div");el.className="row";
  el.innerHTML=`<div class="m"><b>${nm(i)}</b><input inputmode="numeric" pattern="[0-9]*" value="${uVal(r.l)}" aria-label="配管長mm"><button class="ang" aria-label="角度"${r.a?` style="background:${ANGC[r.a]};color:#fff"`:""}>${r.a?r.a+"°":"直管"}</button><button class="twb${r.a?"":" off"}" ${r.a?"":"disabled"} aria-label="曲げ向きを配管の視点で決める">${r.a?dirIco(effT(i))+`<span class="twt">${dirShort2(effT(i))}</span>`:dirIco(0,true)}</button><button class="del" aria-label="削除">🗑️</button></div>${r.a?gaugeHTML(effT(i)):""}<div class="inf"></div>`;
  const ib=document.createElement("button");ib.className="ins";ib.textContent="＋曲げ";ib.setAttribute("aria-label","この上に曲げを追加");
  ib.onpointerdown=e=>e.stopPropagation();ib.onclick=e=>{e.stopPropagation();insertRow(i)};el.appendChild(ib);
  const inp=el.querySelector("input");
  el.addEventListener("pointerdown",()=>{if(sel!==i){sel=i;upd()}});
  inp.oninput=()=>{r.l=Math.max(0,uParse(inp.value)||0);save(true);upd()};
  inp.onfocus=()=>{sel=i;upd();inp.select()};
  el.querySelector(".ang").onclick=()=>{sel=i;r.a=ANG[(ANG.indexOf(r.a)+1)%ANG.length];save();render()};
  const tb=el.querySelector(".twb");if(tb&&r.a)tb.onclick=e=>{e.stopPropagation();sel=i;openDirView(i)};
  const gi=el.querySelector(".gauge input");
  if(gi){
   gi.addEventListener("pointerdown",e=>{e.stopPropagation();if(sel!==i){sel=i;upd()}});
   gi.oninput=()=>{let v=+gi.value;const m=Math.round(v/45)*45;if(Math.abs(v-m)<=6)v=m;gi.value=v;
    r.t=normT(v);r.o=false;el.querySelector(".twb").innerHTML=dirIco(r.t)+`<span class="twt">${dirShort2(r.t)}</span>`;el.querySelector(".gval").textContent=dirName(r.t);sel=i;save(true);upd()};
  }
  el.querySelector(".del").onclick=()=>{const nn=nm(i);if(LR().length>1)LR().splice(i,1);else LR()[0]={l:0,a:0,t:0};save();render();if(T)fitT();toastUndo(nn+" を削除しました")};
  box.appendChild(el);
 });
 upd();
}

function gaugeHTML(t){
 const ticks=Array.from({length:9},(_,k)=>`<i style="left:${k*12.5}%"></i>`).join("");
 const labs=(LANG==="ja"?["上","右上","右","右下","下","左下","左","左上","上"]:["↑","↗","→","↘","↓","↙","←","↖","↑"]).map((n,k)=>`<span style="left:${k*12.5}%">${n}</span>`).join("");
 return `<div class="gauge"><div class="ghead">向き <b class="gval">${dirName(t)}</b></div><div class="gbox"><div class="gtrk">${ticks}</div><input type="range" min="0" max="360" step="1" value="${normT(t)}" aria-label="曲げる向き"></div><div class="glab">${labs}</div></div>`;
}
function insertRow(i){
 const rows=LR(),old=rows[i].l,half=Math.round(old/2);
 rows.splice(i,0,{l:half,a:90,t:0,o:false});
 rows[i+1].l=old-half;
 sel=i;save();render();if(T)T.dirty=true;
 toast(nm(i)+" に曲げを入れました（前後の長さは半分ずつ）");
}
function upd(){
 const c=calc(),DS=st.sup.on?(legDirs()[leg]||[]):[];
 [...$("#rows").children].forEach((el,i)=>{
  const o=c.out[i],r=LR()[i];
  el.classList.toggle("over",o.over);el.classList.toggle("sel",i===sel);
  el.querySelector(".inf").innerHTML=
   `<span class="${o.shoe<0?"neg":""}">${RI("shoe")}シュー<b>${fmt(o.shoe)}</b></span><span>${RI("cum")}累計<b>${fmt(o.cum)}</b></span>`+
   (r.a?`<span>${RI("pull")}引き<b>${fmt(o.back)}</b></span>`:"")+(r.a>=180?`<span>${RI("uw")}U幅<b>${fmt(8*cur().D)}</b></span>`:"")+(r.o&&r.a?`<span>${RI("ofs")}差<b>${fmt(r.l*Math.sin(r.a*Math.PI/180))}</b></span><span>↩️反対向き自動</span>`:"")+(st.sup.on&&supPos(r.l,!!(DS[i]&&isVert(DS[i]))).length?`<span><img alt="" src="${$("#supBtn img").src}" style="width:1.3em;height:1.3em;vertical-align:-0.32em;margin-right:2px">${DS[i]&&isVert(DS[i])?"縦":"横"}<b>${supPos(r.l,!!(DS[i]&&isVert(DS[i]))).length}</b></span>`:"")+(o.over?`<span class="w">⚠️定尺超え</span>`:"");
 });
 const over=c.tot>c.lim;
 $("#tot").className="tot"+(over?" over":"");
 const gl=st.goal||0,df=gl-c.tot;
 $("#tot").innerHTML=(brOn()?`<small>${legName(leg)}</small><br>`:"")+`📏<b>${fmt(c.tot)}</b>/${fmt(c.lim)}`+(over?`<br><b style="color:#dc2626">⚠️${fmt(c.tot-c.lim)}オーバー</b>`:`<br><span style="color:#15803d">残り<b>${fmt(c.lim-c.tot)}</b></span>`)+(gl?`<br>🎯<b>${fmt(gl)}</b> ${df>0?"あと"+fmt(df):df===0?"ぴったり✅":"超過"+fmt(-df)}`:"");
 $("#bar").className="bar"+(over?" over":"");
 $("#bar i").style.width=Math.min(100,c.tot/c.lim*100)+"%";
 renderInfo();updSupUI();
 if(T){build3D();T.dirty=true}
}

/* 曲げを追加：今の先端（最後の行）の終わりで曲げて、その先に直管を足す。先端はいつも真っ直ぐ */
$("#add").onclick=()=>{
 const rows=LR(),last=rows[rows.length-1];
 if(last&&!last.a&&T){const bi=rows.length-1;sel=bi;render();
  setTimeout(()=>openDirView(bi,{add:true}),60);   // 曲げと次の直管は、カメラが寄り終わってから出す
 }else{rows.push({l:500,a:0,t:0,o:false});sel=rows.length-1;save();render();if(T)fitT(true)}
 $("#rows").lastElementChild.scrollIntoView({block:"nearest",behavior:"smooth"});
};

/* ---------- 3D ---------- */
function initT(){
 const cv=$("#cv");
 const rd=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});
 rd.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
 const sc=new THREE.Scene();rd.setClearColor(0x000000,0);
 const cam=new THREE.PerspectiveCamera(45,1,1,1e6);
 sc.add(new THREE.HemisphereLight(0xffffff,0x8fb4d4,0.95));
 const l1=new THREE.DirectionalLight(0xffffff,0.9);l1.position.set(1,2,1.4);sc.add(l1);
 const l2=new THREE.DirectionalLight(0xbfdcff,0.5);l2.position.set(-1.5,.6,-1);sc.add(l2);
 const grp=new THREE.Group();sc.add(grp);
 const bgrp=new THREE.Group();sc.add(bgrp);   // 曲げ手順のベンダー模型（世界に固定）
 const gs=new THREE.Scene(),gcam=new THREE.PerspectiveCamera(40,1,0.1,50);
 const gax=(dir,color,txt)=>{
  const mt=new THREE.MeshBasicMaterial({color});
  const sh=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,1,10),mt);
  sh.position.copy(dir).multiplyScalar(.5);sh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir);gs.add(sh);
  const cn=new THREE.Mesh(new THREE.ConeGeometry(.15,.3,12),mt);
  cn.position.copy(dir).multiplyScalar(1.12);cn.quaternion.copy(sh.quaternion);gs.add(cn);
  const lb=label(txt,.6,"#ffffffdd","#"+color.toString(16).padStart(6,"0"));lb.position.copy(dir).multiplyScalar(1.65);gs.add(lb);
 };
 gax(new THREE.Vector3(1,0,0),0xdc2626,"前");gax(new THREE.Vector3(0,1,0),0x16a34a,"上");gax(new THREE.Vector3(0,0,1),0x2563eb,"右");
 gs.add(new THREE.Mesh(new THREE.SphereGeometry(.1,10,8),new THREE.MeshBasicMaterial({color:0x64748b})));
 T={rd,sc,cam,grp,bgrp,gs,gcam,w:1,h:1,vi:0,th:.8,ph:1.1,dist:1000,tg:new THREE.Vector3(),ext:1000,center:new THREE.Vector3(),dirty:true};

 const ptrs=new Map();let pm=null,pd=0;
 const snap=()=>{const a=[...ptrs.values()];if(a.length===2){pm={x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2};pd=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1}};
 const pan=(dx,dy)=>{
  cam.updateMatrix();
  const rt=new THREE.Vector3().setFromMatrixColumn(cam.matrix,0),up=new THREE.Vector3().setFromMatrixColumn(cam.matrix,1);
  const k=T.dist*0.0016;
  T.tg.addScaledVector(rt,-dx*k).addScaledVector(up,dy*k);
 };
 let lp=null;   // 建物・障害物：長押し（または動かすモードで箱にタッチ）→ 指で動かす
 cv.addEventListener("pointerdown",e=>{cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});snap();
  clearTimeout(lp&&lp.t);lp=null;if(ptrs.size!==1||GUIDE||typeof pickBld!=="function"||APP!=="zumen")return;
  const x=e.clientX,y=e.clientY,bi=pickBld(x,y);if(bi<0)return;
  if(BMODE===bi){bldDragStart(bi,x,y);return}
  lp={x,y,t:setTimeout(()=>{if(lp&&ptrs.size===1){bldDragStart(bi,lp.x,lp.y);try{navigator.vibrate&&navigator.vibrate(30)}catch(err){}}},450)}});
 const end=e=>{ptrs.delete(e.pointerId);snap();clearTimeout(lp&&lp.t);lp=null;if(BDRAG&&ptrs.size===0)bldDragEnd()};
 cv.addEventListener("pointerup",end);cv.addEventListener("pointercancel",end);
 cv.addEventListener("pointermove",e=>{
  const p=ptrs.get(e.pointerId);if(!p)return;
  const ox=p.x,oy=p.y;p.x=e.clientX;p.y=e.clientY;
  if(lp&&Math.hypot(p.x-lp.x,p.y-lp.y)>8){clearTimeout(lp.t);lp=null}
  if(BDRAG){if(ptrs.size===1)bldDragMove(p.x,p.y);return}
  if(ptrs.size===1){
   const dx=p.x-ox,dy=p.y-oy;
   if(e.buttons&2||e.shiftKey)pan(dx,dy);
   else{T.th-=dx*0.008;T.ph=clamp(T.ph-dy*0.008,0.05,3.09)}
  }else if(ptrs.size===2){
   const a=[...ptrs.values()];
   const m={x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2},d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1;
   T.dist=clamp(T.dist*pd/d,T.ext*0.05,T.ext*20);
   pan(m.x-pm.x,m.y-pm.y);pm=m;pd=d;
  }
  T.dirty=true;
 });
 cv.addEventListener("wheel",e=>{e.preventDefault();T.dist=clamp(T.dist*Math.exp(e.deltaY*0.001),T.ext*0.05,T.ext*20);T.dirty=true},{passive:false});
 cv.addEventListener("contextmenu",e=>e.preventDefault());
 /* スマホで3Dを回転・拡大している最中に、画面全体が引っ張られてスクロール／拡大しないようにする */
 ["#cv","#dirOv","#gdGrab","#chip","#supPill","#tools"].forEach(q=>{const el=$(q);if(!el)return;
  el.addEventListener("touchmove",e=>{if(e.cancelable)e.preventDefault()},{passive:false});
  if(q==="#cv")el.addEventListener("touchstart",e=>{if(e.touches.length>1&&e.cancelable)e.preventDefault()},{passive:false})});
 ["gesturestart","gesturechange"].forEach(t=>document.addEventListener(t,e=>{if(e.target&&e.target.closest&&e.target.closest("#stage"))e.preventDefault()},{passive:false}));
 new ResizeObserver(sizeT).observe($("#stage"));
 loop();
}

/* 右のボタンを縦1列にギリギリ収まる大きさにする */
function fitTools(){
 const t=$("#tools");if(!t)return;
 const n=t.querySelectorAll(".hb").length,full=$("#stage").classList.contains("full"),mx=full?42:36;
 const avail=t.clientHeight;if(!avail||!n)return;
 let g=6,sz=Math.floor((avail-g*(n-1))/n);
 if(sz<mx){g=4;sz=Math.floor((avail-g*(n-1))/n)}
 sz=Math.max(22,Math.min(mx,sz));
 t.style.setProperty("--hb",sz+"px");t.style.setProperty("--hg",g+"px");
}
window.addEventListener("resize",()=>setTimeout(fitTools,50));
setTimeout(fitTools,0);
function sizeT(){
 fitTools();
 const cv=$("#cv"),w=cv.clientWidth,h=cv.clientHeight;
 if(!T||!w||!h)return;
 T.w=w;T.h=h;
 T.rd.setSize(w,h,false);T.cam.aspect=w/h;T.cam.updateProjectionMatrix();T.dirty=true;
}

const NOPSIG=JSON.stringify([{l:300,a:0,t:0,o:false}]);
function frameFor(ex,hint){
 ex=ex.clone().normalize();
 let up=new THREE.Vector3(0,1,0);if(Math.abs(ex.dot(up))>0.95)up=hint&&Math.hypot(hint[0],hint[1])>0.5?new THREE.Vector3(hint[0],0,hint[1]):new THREE.Vector3(0,0,1);
 const ey=up.clone().addScaledVector(ex,-up.dot(ex)).normalize();
 return{ex,ey,ez:ex.clone().cross(ey)};
}
function rbox(sx,sy,sz,r){
 try{
  const sh=new THREE.Shape(),x=sx/2,y=sz/2;
  sh.moveTo(-x+r,-y);sh.lineTo(x-r,-y);sh.quadraticCurveTo(x,-y,x,-y+r);sh.lineTo(x,y-r);sh.quadraticCurveTo(x,y,x-r,y);
  sh.lineTo(-x+r,y);sh.quadraticCurveTo(-x,y,-x,y-r);sh.lineTo(-x,-y+r);sh.quadraticCurveTo(-x,-y,-x+r,-y);
  const g=new THREE.ExtrudeGeometry(sh,{depth:sy,bevelEnabled:false,curveSegments:6});
  g.rotateX(-Math.PI/2);g.center();return g;
 }catch(e){return new THREE.BoxGeometry(sx,sy,sz)}
}
function makeUnit(type,opt){
 opt=opt||{};
 const g=new THREE.Group();let tg=g;
 const M=c=>new THREE.MeshStandardMaterial({color:c,roughness:.5,metalness:.1});
 const put=(geo,x,y,z,c)=>{const m=new THREE.Mesh(geo,M(c));m.position.set(x,y,z);tg.add(m);return m};
 const edge=(m,geo)=>{try{m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo,25),new THREE.LineBasicMaterial({color:0x1f2937})))}catch(e){}};
 const bx=(sx,sy,sz,x,y,z,c)=>{const geo=new THREE.BoxGeometry(sx,sy,sz),m=put(geo,x,y,z,c);if(Math.min(sx,sy,sz)>12)edge(m,geo);return m};
 const rb=(sx,sy,sz,r,x,y,z,c)=>{const geo=rbox(sx,sy,sz,r),m=put(geo,x,y,z,c);edge(m,geo);return m};
 const cyl=(r,hh,x,y,z,c,sg)=>put(new THREE.CylinderGeometry(r,r,hh,sg||24),x,y,z,c);
 const WH=0xf1f5f9,DK=0x334155,MD=0x94a3b8;
 let name="",top=0,cx=0;
 if(type==="out"){
  /* 自然な向きで作る：幅Wはx、奥行Dはz（正面=+z）、床=y0。配管口Pnは機種・選んだ位置で決まる。
     最後に「配管口が原点、配管の向きが+x」になるように箱ごと回す */
  const om=OUTM[opt.om]||OUTM.room,W=om.w,H=om.h,D=om.d,B=0,X=0,top0=H,FZ=D/2;
  const xk=outExitKey(opt.om,opt.ox),Pn=outPort(opt.om,xk),RB=OUT_R[xk];
  const R=v=>[v[0]*RB[0][0]+v[1]*RB[1][0]+v[2]*RB[2][0],v[0]*RB[0][1]+v[1]*RB[1][1]+v[2]*RB[2][1],v[0]*RB[0][2]+v[1]*RB[1][2]+v[2]*RB[2][2]];
  const body=new THREE.Group();g.add(body);tg=body;
  body.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...RB[0]),new THREE.Vector3(...RB[1]),new THREE.Vector3(...RB[2])));
  {const q=R(Pn);body.position.set(-q[0],-q[1],-q[2])}
  name=om.n;
  {const q=R([0,H+(om.f==="top"?60:0)-Pn[1],0]),q0=R([-Pn[0],0,-Pn[2]]);cx=q[0]+q0[0];top=q[1]+q0[1];opt.cz=q[2]+q0[2]}
  rb(W,H,D,Math.min(24,D/8),X,H/2,0,WH);bx(W*.94,40,D*.9,X,B-20,0,0x475569);
  const fan=(fx,fy,fz,r,face)=>{
   if(face==="front"){ // 正面(+z)向き
    const c=cyl(r,8,fx,fy,FZ+2,DK,40);c.rotation.x=Math.PI/2;
    put(new THREE.TorusGeometry(r,6,6,40),fx,fy,FZ+5,MD);
    bx(r*2,6,6,fx,fy,FZ+9,MD);bx(6,r*2,6,fx,fy,FZ+9,MD);
    const q=r*1.25;bx(q*2,5,5,fx,fy+q,FZ+4,MD);bx(q*2,5,5,fx,fy-q,FZ+4,MD);
   }else{ // 上向き
    cyl(r,8,fx,fy,fz,DK,40);
    const ring=put(new THREE.TorusGeometry(r,6,6,40),fx,fy+2,fz,MD);ring.rotation.x=Math.PI/2;
    bx(r*2,6,6,fx,fy+6,fz,MD);bx(6,6,r*2,fx,fy+6,fz,MD);
   }
  };
  if(om.f==="front"){
   const r=Math.min(om.nf===2?290:330,W*.38,H*(om.nf===2?.17:.3));
   for(let i=0;i<om.nf;i++){
    const y=om.nf===2?B+H*(i?.25:.72):B+H*.55;
    fan(X,y,0,r,"front");
   }
   // 左右の側面と背面は吸込みスリット
   for(let i=0;i<10;i++){const y=B+40+i*(H-80)/9;bx(6,5,D*.8,X-W/2-1,y,0,MD);bx(W*.8,5,6,X,y,-FZ-1,MD)}
  }else{
   const nf=om.nf,r=Math.min(D,W/nf)*.4;
   for(let i=0;i<nf;i++)fan(nf===1?X:X+(i?1:-1)*W*.25,top0+2,0,r,"top");
   for(let i=0;i<16;i++){const y=B+60+i*(H-120)/15;bx(W*.9,5,6,X,y,FZ+1,MD);bx(W*.9,5,6,X,y,-FZ-1,MD)}
   for(let i=0;i<14;i++){const y=B+60+i*(H-120)/13;bx(6,5,D*.85,X-W/2-1,y,0,MD)}
   if(om.ghp){bx(W*.4,H*.5,6,X+W*.1,B+H*.3,FZ+3,0xcbd5e1);bx(W*.5,200,6,X,B+H*.78,FZ+3,0xfacc15)}
  }
  // 正面の目印：正面の上端に赤い帯
  bx(W*.5,18,6,X,H-45,FZ+3,0xdc2626);
  // 配管の接続部（バルブカバー）：配管口のまわりの面
  if(opt.om==="room"){ // 右側面のカバーから出て、側面に沿って後ろ向きに伸びる
   const[px,py,pz]=Pn;
   bx(8,200,200,W/2+3,py,pz,MD);
   const st=cyl(15,px-W/2,W/2+(px-W/2)/2,py,pz,0xb8860b,16);st.rotation.z=Math.PI/2;
  }else{const[px,py,pz]=Pn,hz=Math.max(40,Math.min(80,D/2+pz-6,D/2-pz-6)),hh=Math.min(100,py*.5+60);
   if(xk==="s")bx(8,hh*2,hz*2,px+3,py,pz,MD);
   else if(xk==="f"||xk==="l")bx(hz*2,hh*2,8,px,py,pz+3,MD);
   else if(xk==="b")bx(hz*2,hh*2,8,px,py,pz-3,MD);
   else bx(hz*2,8,hz*2,px,py-3,pz,MD)}
  tg=g;
 }else if(type==="cas"){
  const m=unitSide(true),X=-520,Z=-m*310,Y0=-35,CU=0xc2703a,BR=0xb8860b;
  name="天カセ（4方向） 配管:"+sideName(m);cx=X;top=Y0+125;
  bx(840,250,840,X,Y0,Z,0x9ca3af);rb(950,46,950,46,X,Y0-148,Z,WH);
  bx(560,4,560,X,Y0-173,Z,0xdfe3e8);
  for(let i=-4;i<=4;i++){bx(540,2,5,X,Y0-176,Z+i*60,MD);bx(5,2,540,X+i*60,Y0-176,Z,MD)}
  bx(700,5,70,X,Y0-174,Z+390,DK);bx(700,5,70,X,Y0-174,Z-390,DK);bx(70,5,700,X+390,Y0-174,Z,DK);bx(70,5,700,X-390,Y0-174,Z,DK);
  // 冷媒配管の接続口（角の出っ張り）。配管の起点＝選んだ配管の先端
  bx(120,160,200,-80,-10,0,0xd5dbe3);
  const thick=opt.kind!=="液",rA=thick?13:8,rB=thick?8:13,zB=-m*72;
  [[rA,0],[rB,zB]].forEach(([r,z])=>{
   const s=cyl(r,80,-40,0,z,CU,16);s.rotation.z=Math.PI/2;
   const n=cyl(r*1.6,16,-8,0,z,BR,6);n.rotation.z=Math.PI/2;
  });
  // ドレン口（反対側の角）
  const zd=-m*620;
  bx(70,90,100,-95,Y0-70,zd,0xd5dbe3);
  const dr=cyl(16,80,-60,Y0-70,zd,0x9ca3af,16);dr.rotation.z=Math.PI/2;
 }else if(type==="cas2"){
  /* メーカー機種の天井カセット。自然な向き：長手=x、配管は+x側の端面から+xへ出る。天井面=y0。 */
  const md=CAS2M[opt.mm]||CAS2M["56"],sd=st.units.flip?-1:1,Lb=md.L,Wb=md.W,HB=md.H,TOP=md.top,YT=TOP+420,yH=md.nk;
  const gas=opt.kind!=="液",G0={z:md.gas.z*sd,y:md.gas.y},L0={z:md.liq.z*sd,y:md.liq.y},D0r={z:md.dr.z*sd,y:md.dr.y},sel=gas?G0:L0;
  const PX=Lb/2-(md.pin||0),Pn=[PX+60,sel.y,sel.z];
  const body=new THREE.Group();g.add(body);tg=body;body.position.set(-Pn[0],-Pn[1],-Pn[2]);
  const CU=0xc2703a,BRS=0xb8860b,OR=0xf97316,RD=0xdc2626,mkN=(CAS2_MAKERS.find(x=>x[0]===md.mk)||["",""])[1];
  name=mkN+" "+md.kind+" "+md.n;cx=-Pn[0];top=TOP+430-Pn[1];opt.cz=-Pn[2];
  bx(Lb,HB,Wb,0,TOP-HB/2,0,0x9ca3af);                                                      // 本体（天井裏）
  if(!md.bi)rb(md.pa,md.pt,md.pb,20,0,-md.pt/2,0,WH);                                                  // パネル
  const py=-md.pt-2,sl=(lx,lz,x,z,rx,rz)=>{bx(lx,5,lz,x,py,z,DK);const f=bx(lx*.97,6,lz*.97+8,x,py-5,z,0xf8fafc);if(rx)f.rotation.x=rx;if(rz)f.rotation.z=rz};
  if(md.kind==="4方向"){const q=md.pa/2-80,ln=md.pa*.6;sl(ln,60,0,q,0,q,0.5);sl(ln,60,0,-q,0,-0.5);sl(60,ln,q,0,0,0,-0.5);sl(60,ln,-q,0,0,0,0.5);
   bx(md.pa*.5,4,md.pb*.5,0,py+1,0,0xdfe3e8);for(let i=-5;i<=5;i++)bx(md.pa*.48,2,5,0,py-2,i*md.pb*.045,MD)}
  else if(md.kind==="1方向"){const q=md.pb/2-80;sl(md.pa*.8,62,0,-q,-0.5);
   bx(md.pa*.82,4,md.pb*.5,0,py+1,md.pb*.12,0xdfe3e8);for(let i=-5;i<=5;i++)bx(md.pa*.8,2,5,0,py-2,md.pb*.12+i*md.pb*.045,MD)}
  else if(md.bi){const yb=TOP-HB;
   bx(6,150,604,-Lb/2-3,yb+110,0,DK);                                                       // 正面の吹出し口（ダクト接続）
   bx(6,190*.9,574,Lb/2+3,yb+117,-sd*70,0xe8edf2);for(let i=-6;i<=6;i++)bx(8,4,560,Lb/2+5,yb+117+i*13,-sd*70,MD);   // 背面の吸込み口
   [[-260,45],[0,115],[260,45]].forEach(([z,w])=>bx(170,6,w*1.6,-40,TOP+3,sd*z,MD))}             // 上面の吸込み口（3か所）
  else{const q=md.pb/2-93;[-1,1].forEach(k=>sl(md.pa*.82,62,0,k*q,k*0.5));
   bx(md.pa*.62,4,md.pb*.46,0,py+1,0,0xdfe3e8);for(let i=-5;i<=5;i++)bx(md.pa*.6,2,5,0,py-2,i*md.pb*.042,MD)}
  // 天井開口（オレンジの枠）
  if(!md.bi){const ow=16,oy=3,oa=md.oa,ob=md.ob;bx(oa+ow,4,ow,0,oy,ob/2,OR);bx(oa+ow,4,ow,0,oy,-ob/2,OR);bx(ow,4,ob,oa/2,oy,0,OR);bx(ow,4,ob,-oa/2,oy,0,OR)}
  // 吊りボルト（赤）とネコ（吊り金具）
  const out=md.ba/2>Lb/2+5;
  [-1,1].forEach(k=>[-1,1].forEach(w=>{const x=k*md.ba/2,z=w*md.bb/2;
   if(out){bx(8,90,70,k*(Lb/2+4),yH+35,z,0x64748b);bx(md.ba/2-Lb/2+30,8,70,k*(Lb/2+(md.ba/2-Lb/2+30)/2),yH,z,0x64748b)}   // 端面から外へ出る金具
   else bx(90,8,90,x,yH,z,0x64748b);                                                                                  // 角の金具
   cyl(10,YT-yH+40,x,(YT+yH-40)/2,z,RD,10);cyl(17,14,x,yH+12,z,BRS,6);cyl(17,14,x,yH-12,z,BRS,6)}));
  bx(md.ba,4,4,0,YT,md.bb/2,RD);bx(md.ba,4,4,0,YT,-md.bb/2,RD);bx(4,4,md.bb,md.ba/2,YT,0,RD);bx(4,4,md.bb,-md.ba/2,YT,0,RD);
  /* 寸法線（矢印つき）と半割の印：A×Bの四角の、長手はz=sz側・短手はx=sx側の外に出す */
  const dimR=(A,B,y,col,sz,sx,off)=>{const ar=(x,z,rx,rz)=>{const c=put(new THREE.ConeGeometry(14,44,12),x,y,z,col);c.rotation.x=rx||0;c.rotation.z=rz||0},A2=A/2,B2=B/2,zl=sz*(B2+off),xl=sx*(A2+off),e=off+40;
   bx(A,6,6,0,y,zl,col);bx(6,6,e,-A2,y,sz*(B2+e/2),col);bx(6,6,e,A2,y,sz*(B2+e/2),col);ar(-A2+22,zl,0,Math.PI/2);ar(A2-22,zl,0,-Math.PI/2);bx(6,6,90,0,y,zl,col);
   bx(6,6,B,xl,y,0,col);bx(e,6,6,sx*(A2+e/2),y,-B2,col);bx(e,6,6,sx*(A2+e/2),y,B2,col);ar(xl,-B2+22,-Math.PI/2,0);ar(xl,B2-22,Math.PI/2,0);bx(90,6,6,xl,y,0,col)};
  const tagD=(c,f)=>{const n=tg.children.length;f();for(let i=n;i<tg.children.length;i++)tg.children[i].userData.dimcat=c};
  tagD("ubolt",()=>dimR(md.ba,md.bb,YT,0x7c3aed,1,-1,170));                 // 吊りピッチ（紫・ボルトの上）
  if(!md.bi){tagD("uopen",()=>dimR(md.oa,md.ob,8,0xf97316,-1,1,150));                  // 天井開口（オレンジ・天井の高さ）
  tagD("upanel",()=>dimR(md.pa,md.pb,-md.pt-8,0x0284c7,1,-1,150))}            // パネル（青・パネルの下）
  // 配管接続口とドレン
  if(md.mi)bx(10,140,185,Lb/2+4,TOP-116,-sd*(Wb/2-189),MD);
  else if(md.pin){bx(md.pin+4,Math.abs(G0.y-L0.y)+110,Math.abs(G0.z-L0.z)+130,Lb/2-md.pin/2+2,(G0.y+L0.y)/2,(G0.z+L0.z)/2,DK);bx(10,Math.abs(G0.y-L0.y)+90,Math.abs(G0.z-L0.z)+90,PX+4,(G0.y+L0.y)/2,(G0.z+L0.z)/2,MD)}   // 角の切り欠きの奥に接続口
  else bx(10,Math.abs(G0.y-L0.y)+90,Math.abs(G0.z-L0.z)+90,Lb/2+4,(G0.y+L0.y)/2,(G0.z+L0.z)/2,MD);
  [[G0,gas?13:9],[L0,gas?9:13]].forEach(([q,r])=>{const c=cyl(r*.75,60,PX+30,q.y,q.z,CU,16);c.rotation.z=Math.PI/2;const n=cyl(r*1.5,16,PX+12,q.y,q.z,BRS,6);n.rotation.z=Math.PI/2});
  if(md.eb)bx(md.eb[0],md.eb[1],md.eb[2],md.eb[3],md.eb[4],md.eb[5]*sd,0x6b7280);
  if(!md.nodr){bx(10,70,70,Lb/2+4,D0r.y,D0r.z,MD);const d=cyl(17,90,Lb/2+45,D0r.y,D0r.z,0xe5e7eb,16);d.rotation.z=Math.PI/2;
   if(md.mi){const w=cyl(14,14,Lb/2+8,TOP-163,D0r.z,0xe5e7eb,16);w.rotation.z=Math.PI/2;const pl=cyl(13,14,Lb/2+8,TOP-260,-sd*(Wb/2-530),0x94a3b8,16);pl.rotation.z=Math.PI/2}}
  const L=(t,x,y,z,c)=>({t,c,p:[x-Pn[0],y-Pn[1],z-Pn[2]]}),hw=v=>v%2?(v/2).toFixed(1):fmt(v/2);
  opt.c2={ceil:[-Pn[0],-Pn[1],-Pn[2]],neko:[md.ba/2-Pn[0],yH-Pn[1],md.bb/2-Pn[2]],top:TOP,nkTxt:md.nkTxt||"",bolts:[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,w])=>[u*md.ba/2-Pn[0],yH-Pn[1],w*md.bb/2-Pn[2]]),ba:md.ba,bb:md.bb};
  const oh=t=>{const m=String(t).match(/(\d+)〜(\d+)/);return m?hw(+m[1])+"〜"+hw(+m[2]):hw(+t)};
  const _bi=md.bi;opt.labs=[L("天井開口 "+(md.oTxt||fmt(md.oa))+"（半割 "+(md.oTxt?oh(md.oTxt):hw(md.oa))+"）",0,70,-md.ob/2-150,"uopen"),L("天井開口 "+(md.oTxt||fmt(md.ob))+"（半割 "+(md.oTxt?oh(md.oTxt):hw(md.ob))+"）",md.oa/2+150,70,0,"uopen"),L("吊りピッチ "+fmt(md.ba)+"（半割 "+hw(md.ba)+"）",0,YT+60,md.bb/2+170,"ubolt"),L("吊りピッチ "+fmt(md.bb)+"（半割 "+hw(md.bb)+"）",-md.ba/2-170,YT+60,0,"ubolt"),
   L("ガスφ"+md.g+(md.tg||"")+(md.bi?" 本体下面から":" 天井から")+fmt(md.gas.y)+"mm",Lb/2+90,Math.max(G0.y,L0.y)+150,G0.z,"upipe"),L("液φ"+md.l+(md.tl||"")+(md.bi?" 本体下面から":" 天井から")+fmt(md.liq.y)+"mm",Lb/2+90,Math.min(G0.y,L0.y)-110,L0.z,"upipe"),
   L(md.dn||("ドレン VP-25"+(md.td||"")),Lb/2+90,TOP+70,D0r.z,"upipe"),L("パネル "+fmt(md.pa)+"（半割 "+hw(md.pa)+"）",0,-md.pt-80,md.pb/2+150,"upanel"),L("パネル "+fmt(md.pb)+"（半割 "+hw(md.pb)+"）",-md.pa/2-150,-md.pt-80,0,"upanel")].filter(l=>!_bi||(l.c!=="uopen"&&l.c!=="upanel"));
  tg=g;
 }else if(type==="flr"){
  /* 床置き（目安 600×1850×350）：箱の下面が床（y0）、正面=+z。配管は裏面右下 または 右側面の下から */
  const W=600,H=1850,D=350,ck=opt.ck==="r"?"r":"f",Pn=ck==="r"?[W/2,150,-D/2+100]:[W/2-100,150,-D/2];
  const RB=ck==="r"?OUT_R.s:OUT_R.b;
  const R=v=>[0,1,2].map(j=>v[0]*RB[0][j]+v[1]*RB[1][j]+v[2]*RB[2][j]);
  const body=new THREE.Group();g.add(body);tg=body;
  body.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...RB[0]),new THREE.Vector3(...RB[1]),new THREE.Vector3(...RB[2])));
  {const q=R(Pn);body.position.set(-q[0],-q[1],-q[2])}
  name="床置き（配管："+(ck==="r"?"右側面・下":"裏面・右下")+"）";
  {const q=R([-Pn[0],H+200-Pn[1],-Pn[2]]);cx=q[0];top=q[1];opt.cz=q[2]}
  rb(W,H,D,24,0,H/2,0,WH);
  bx(W*.84,H*.14,8,0,H-170,D/2+2,DK);for(let i=0;i<6;i++)bx(W*.8,6,10,0,H-250+i*30,D/2+5,MD);                 // 上の吹出口
  bx(W*.84,H*.32,6,0,H*.25,D/2+2,0xe8edf2);for(let i=0;i<12;i++)bx(W*.8,4,8,0,H*.12+i*H*.022,D/2+4,MD);         // 下の吸込みグリル
  bx(110,40,6,0,H*.62,D/2+3,0x38bdf8);bx(W-20,40,D-20,0,20,0,0x475569);                                           // 表示部・台
  if(ck==="r")bx(8,180,140,Pn[0]+3,Pn[1],Pn[2],MD);else bx(140,180,8,Pn[0],Pn[1],Pn[2]-3,MD);                        // 配管カバー
  tg=g;
 }else if(type==="ceil"){
  /* 天吊：箱は中心が原点。正面=+z、吹出口は正面の下向き。配管は正面から見て右端の後ろ・下から出る */
  const W=1240,H=210,D=690,ck=opt.ck==="r"?"r":"f",Pn=ck==="r"?[W/2,-H/2+55,-D/2+90]:[W/2-80,-H/2+55,-D/2];
  const RB=ck==="r"?OUT_R.s:OUT_R.b;
  const R=v=>[0,1,2].map(j=>v[0]*RB[0][j]+v[1]*RB[1][j]+v[2]*RB[2][j]);
  const body=new THREE.Group();g.add(body);tg=body;
  body.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...RB[0]),new THREE.Vector3(...RB[1]),new THREE.Vector3(...RB[2])));
  {const q=R(Pn);body.position.set(-q[0],-q[1],-q[2])}
  name="天吊（配管："+(ck==="r"?"右端・裏":"裏面・右下")+"）";
  {const q=R([-Pn[0],H/2+300-Pn[1],-Pn[2]]);cx=q[0];top=q[1];opt.cz=q[2]}
  rb(W,H,D,28,0,0,0,WH);
  bx(W*.9,4,D*.78,0,-H/2-3,-D*.04,0xe8edf2);                                  // 下面の吸込みパネル
  for(let i=-5;i<=5;i++)bx(W*.84,2,5,0,-H/2-6,-D*.04+i*40,MD);
  bx(W*.9,54,8,0,22,D/2+1,DK);                                                  // 正面の吹出口（暗い開口）
  const fl=bx(W*.9,8,86,0,-12,D/2+30,0xf8fafc);fl.rotation.x=0.75;               // 風向フラップ（前・下向き）
  bx(W*.9,10,8,0,52,D/2+2,MD);
  [-W/2+100,W/2-100].forEach(x=>[-D/2+100,D/2-100].forEach(z=>cyl(8,300,x,H/2+150,z,0x64748b,10)));
  if(ck==="r")bx(8,100,170,Pn[0]+3,Pn[1],Pn[2],MD);else bx(170,100,8,Pn[0],Pn[1],Pn[2]-3,MD);   // 配管カバー
  tg=g;
 }else{
  const P=wallPose(opt.wx),ig=new THREE.Group(),keep=tg;tg=ig;
  bx(800,290,215,0,0,107.5,WH);bx(740,16,110,0,-137,165,DK);bx(700,6,60,0,142,60,MD);bx(70,24,4,260,40,216,0x38bdf8);
  tg=keep;
  if(P.k==="d")ig.rotation.z=Math.PI/2;else ig.rotation.y=P.k==="b"?-Math.PI/2:P.k==="l"?Math.PI:0;
  ig.position.set(P.pos[0],P.pos[1],P.pos[2]);g.add(ig);
  name="壁掛け（"+P.name+"）";cx=P.cx;top=P.top;
 }
 return{g,name,top,cx,cz:opt.cz||0,labs:opt.labs,c2:opt.c2};
}
/* 今回の機器・天井・ネコのアイコン（青い丸・銀の縁で統一） */
const NICO={"plan":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJ3IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjY2JkNWUxIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImJyIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmRlNjhhIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjYTE2MjA3Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDkiIGZpbGw9InVybCgjcikiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MiIgZmlsbD0idXJsKCNnKSIvPjxlbGxpcHNlIGN4PSIzNiIgY3k9IjI1IiByeD0iMjIiIHJ5PSI5IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIuMyIgdHJhbnNmb3JtPSJyb3RhdGUoLTI1IDM2IDI1KSIvPjxyZWN0IHg9IjIwIiB5PSIyMiIgd2lkdGg9IjUyIiBoZWlnaHQ9IjU4IiByeD0iMyIgZmlsbD0iI2UwZjJmZSIgc3Ryb2tlPSIjMzM0MTU1IiBzdHJva2Utd2lkdGg9IjIuNSIvPjxnIHN0cm9rZT0iIzAzNjlhMSIgc3Ryb2tlLXdpZHRoPSIyLjUiIGZpbGw9Im5vbmUiPjxwYXRoIGQ9Ik0yNiAzMiBINTAgVjQ4IEg2NiIvPjxwYXRoIGQ9Ik0yNiA1OCBINDAgVjcyIi8+PHJlY3QgeD0iNTIiIHk9IjU4IiB3aWR0aD0iMTQiIGhlaWdodD0iMTQiLz48L2c+PHBhdGggZD0iTTM0IDQ0IEg0NCBWNjYgSDU4IiBzdHJva2U9IiNlYTU4MGMiIHN0cm9rZS13aWR0aD0iNCIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGcgdHJhbnNmb3JtPSJyb3RhdGUoNDAgNzIgMzApIj48cmVjdCB4PSI2NiIgeT0iMTIiIHdpZHRoPSIxMCIgaGVpZ2h0PSIzNCIgcng9IjIiIGZpbGw9IiNmYmJmMjQiIHN0cm9rZT0iIzc4MzUwZiIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBvbHlnb24gcG9pbnRzPSI2Niw0NiA3Niw0NiA3MSw1NSIgZmlsbD0iI2ZkZTY4YSIgc3Ryb2tlPSIjNzgzNTBmIiBzdHJva2Utd2lkdGg9IjIiLz48L2c+PC9zdmc+","ar":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJ3IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjY2JkNWUxIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImJyIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmRlNjhhIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjYTE2MjA3Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDkiIGZpbGw9InVybCgjcikiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MiIgZmlsbD0idXJsKCNnKSIvPjxlbGxpcHNlIGN4PSIzNiIgY3k9IjI1IiByeD0iMjIiIHJ5PSI5IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIuMyIgdHJhbnNmb3JtPSJyb3RhdGUoLTI1IDM2IDI1KSIvPjxnIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiPjxwYXRoIGQ9Ik0yMCAzNCBWMjIgSDMyIi8+PHBhdGggZD0iTTY4IDIyIEg4MCBWMzQiLz48cGF0aCBkPSJNODAgNjYgVjc4IEg2OCIvPjxwYXRoIGQ9Ik0zMiA3OCBIMjAgVjY2Ii8+PC9nPjxwYXRoIGQ9Ik01MCAzMCBMNjggNDAgTDY4IDYwIEw1MCA3MCBMMzIgNjAgTDMyIDQwIFoiIGZpbGw9InVybCgjdykiIHN0cm9rZT0iIzMzNDE1NSIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNMzIgNDAgTDUwIDUwIEw2OCA0MCBNNTAgNTAgVjcwIiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzQxNTUiIHN0cm9rZS13aWR0aD0iMi41IiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHRleHQgeD0iNTAiIHk9IjkyIiBmb250LXNpemU9IjAiLz48L3N2Zz4=","u_flr":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJ3IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjY2JkNWUxIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImJyIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmRlNjhhIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjYTE2MjA3Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDkiIGZpbGw9InVybCgjcikiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MiIgZmlsbD0idXJsKCNnKSIvPjxlbGxpcHNlIGN4PSIzNiIgY3k9IjI1IiByeD0iMjIiIHJ5PSI5IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIuMyIgdHJhbnNmb3JtPSJyb3RhdGUoLTI1IDM2IDI1KSIvPjxyZWN0IHg9IjM0IiB5PSIxNiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjY0IiByeD0iNCIgZmlsbD0idXJsKCN3KSIgc3Ryb2tlPSIjMzM0MTU1IiBzdHJva2Utd2lkdGg9IjIuNSIvPjxnIHN0cm9rZT0iIzFlMjkzYiIgc3Ryb2tlLXdpZHRoPSIyLjUiPjxsaW5lIHgxPSIzOSIgeTE9IjI0IiB4Mj0iNjEiIHkyPSIyNCIvPjxsaW5lIHgxPSIzOSIgeTE9IjI5IiB4Mj0iNjEiIHkyPSIyOSIvPjxsaW5lIHgxPSIzOSIgeTE9IjM0IiB4Mj0iNjEiIHkyPSIzNCIvPjwvZz48ZyBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMiI+PGxpbmUgeDE9IjM5IiB5MT0iNTYiIHgyPSI2MSIgeTI9IjU2Ii8+PGxpbmUgeDE9IjM5IiB5MT0iNjEiIHgyPSI2MSIgeTI9IjYxIi8+PGxpbmUgeDE9IjM5IiB5MT0iNjYiIHgyPSI2MSIgeTI9IjY2Ii8+PGxpbmUgeDE9IjM5IiB5MT0iNzEiIHgyPSI2MSIgeTI9IjcxIi8+PC9nPjxyZWN0IHg9IjIyIiB5PSI4MCIgd2lkdGg9IjU2IiBoZWlnaHQ9IjYiIHJ4PSIyIiBmaWxsPSIjZDZjM2ExIiBzdHJva2U9IiM3YTVhMmEiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==","u_cas2": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJ3IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjY2JkNWUxIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImJyIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmRlNjhhIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjYTE2MjA3Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDkiIGZpbGw9InVybCgjcikiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MiIgZmlsbD0idXJsKCNnKSIvPjxlbGxpcHNlIGN4PSIzNiIgY3k9IjI1IiByeD0iMjIiIHJ5PSI5IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIuMyIgdHJhbnNmb3JtPSJyb3RhdGUoLTI1IDM2IDI1KSIvPjxyZWN0IHg9IjI4IiB5PSIyNiIgd2lkdGg9IjQ0IiBoZWlnaHQ9IjI0IiByeD0iMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMzM0MTU1IiBzdHJva2Utd2lkdGg9IjIuNSIvPjxyZWN0IHg9IjE2IiB5PSI1MCIgd2lkdGg9IjY4IiBoZWlnaHQ9IjExIiByeD0iMyIgZmlsbD0idXJsKCN3KSIgc3Ryb2tlPSIjMzM0MTU1IiBzdHJva2Utd2lkdGg9IjIuNSIvPjxyZWN0IHg9IjIxIiB5PSI1NCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjMuNSIgcng9IjEuNSIgZmlsbD0iIzFlMjkzYiIvPjxyZWN0IHg9IjYxIiB5PSI1NCIgd2lkdGg9IjE4IiBoZWlnaHQ9IjMuNSIgcng9IjEuNSIgZmlsbD0iIzFlMjkzYiIvPjxnIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9Im5vbmUiPjxwYXRoIGQ9Ik0yOSA2NiBMMjEgNzYiLz48cGF0aCBkPSJNNzEgNjYgTDc5IDc2Ii8+PC9nPjxwb2x5Z29uIHBvaW50cz0iMTYsODAgMTgsNzAgMjYsNzYiIGZpbGw9IiNmZmYiLz48cG9seWdvbiBwb2ludHM9Ijg0LDgwIDgyLDcwIDc0LDc2IiBmaWxsPSIjZmZmIi8+PC9zdmc+", "u_cas": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJ3IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjY2JkNWUxIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImJyIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmRlNjhhIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjYTE2MjA3Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDkiIGZpbGw9InVybCgjcikiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MiIgZmlsbD0idXJsKCNnKSIvPjxlbGxpcHNlIGN4PSIzNiIgY3k9IjI1IiByeD0iMjIiIHJ5PSI5IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIuMyIgdHJhbnNmb3JtPSJyb3RhdGUoLTI1IDM2IDI1KSIvPjxyZWN0IHg9IjIwIiB5PSIyMCIgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiByeD0iNiIgZmlsbD0idXJsKCN3KSIgc3Ryb2tlPSIjMzM0MTU1IiBzdHJva2Utd2lkdGg9IjIuNSIvPjxyZWN0IHg9IjM2IiB5PSIzNiIgd2lkdGg9IjI4IiBoZWlnaHQ9IjI4IiByeD0iMiIgZmlsbD0iI2UyZThmMCIgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjIiLz48ZyBmaWxsPSIjMWUyOTNiIj48cmVjdCB4PSIzMCIgeT0iMjYiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0IiByeD0iMiIvPjxyZWN0IHg9IjMwIiB5PSI3MCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQiIHJ4PSIyIi8+PHJlY3QgeD0iMjYiIHk9IjMwIiB3aWR0aD0iNCIgaGVpZ2h0PSI0MCIgcng9IjIiLz48cmVjdCB4PSI3MCIgeT0iMzAiIHdpZHRoPSI0IiBoZWlnaHQ9IjQwIiByeD0iMiIvPjwvZz48L3N2Zz4=", "u_out": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJ3IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjY2JkNWUxIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImJyIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmRlNjhhIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjYTE2MjA3Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDkiIGZpbGw9InVybCgjcikiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MiIgZmlsbD0idXJsKCNnKSIvPjxlbGxpcHNlIGN4PSIzNiIgY3k9IjI1IiByeD0iMjIiIHJ5PSI5IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIuMyIgdHJhbnNmb3JtPSJyb3RhdGUoLTI1IDM2IDI1KSIvPjxyZWN0IHg9IjE4IiB5PSIyNiIgd2lkdGg9IjY0IiBoZWlnaHQ9IjQ4IiByeD0iNSIgZmlsbD0idXJsKCN3KSIgc3Ryb2tlPSIjMzM0MTU1IiBzdHJva2Utd2lkdGg9IjIuNSIvPjxjaXJjbGUgY3g9IjQ0IiBjeT0iNTAiIHI9IjE2IiBmaWxsPSIjMzM0MTU1Ii8+PGNpcmNsZSBjeD0iNDQiIGN5PSI1MCIgcj0iMTYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLXdpZHRoPSIzIi8+PHBhdGggZD0iTTQ0IDM2IFY2NCBNMzAgNTAgSDU4IiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMyIvPjxnIHN0cm9rZT0iIzk0YTNiOCIgc3Ryb2tlLXdpZHRoPSIyLjUiPjxsaW5lIHgxPSI2NiIgeTE9IjM0IiB4Mj0iNzYiIHkyPSIzNCIvPjxsaW5lIHgxPSI2NiIgeTE9IjQwIiB4Mj0iNzYiIHkyPSI0MCIvPjxsaW5lIHgxPSI2NiIgeTE9IjQ2IiB4Mj0iNzYiIHkyPSI0NiIvPjwvZz48cmVjdCB4PSIyNCIgeT0iNzQiIHdpZHRoPSIxMCIgaGVpZ2h0PSI1IiBmaWxsPSIjMzM0MTU1Ii8+PHJlY3QgeD0iNjYiIHk9Ijc0IiB3aWR0aD0iMTAiIGhlaWdodD0iNSIgZmlsbD0iIzMzNDE1NSIvPjwvc3ZnPg==", "u_ceil": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJ3IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjY2JkNWUxIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImJyIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmRlNjhhIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjYTE2MjA3Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDkiIGZpbGw9InVybCgjcikiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MiIgZmlsbD0idXJsKCNnKSIvPjxlbGxpcHNlIGN4PSIzNiIgY3k9IjI1IiByeD0iMjIiIHJ5PSI5IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIuMyIgdHJhbnNmb3JtPSJyb3RhdGUoLTI1IDM2IDI1KSIvPjxnIHN0cm9rZT0iI2UyZThmMCIgc3Ryb2tlLXdpZHRoPSIzLjUiPjxsaW5lIHgxPSIyOCIgeTE9IjE4IiB4Mj0iMjgiIHkyPSI0MCIvPjxsaW5lIHgxPSI3MiIgeTE9IjE4IiB4Mj0iNzIiIHkyPSI0MCIvPjwvZz48cmVjdCB4PSIxNiIgeT0iMzgiIHdpZHRoPSI2OCIgaGVpZ2h0PSIyNiIgcng9IjYiIGZpbGw9InVybCgjdykiIHN0cm9rZT0iIzMzNDE1NSIgc3Ryb2tlLXdpZHRoPSIyLjUiLz48cmVjdCB4PSIyMiIgeT0iNTYiIHdpZHRoPSI1NiIgaGVpZ2h0PSI1IiByeD0iMiIgZmlsbD0iIzFlMjkzYiIvPjxwYXRoIGQ9Ik0zMCA2OCBMMjYgNzggTTUwIDY4IFY3OSBNNzAgNjggTDc0IDc4IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMy41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L3N2Zz4=", "u_wall": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJ3IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjY2JkNWUxIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImJyIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmRlNjhhIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjYTE2MjA3Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDkiIGZpbGw9InVybCgjcikiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MiIgZmlsbD0idXJsKCNnKSIvPjxlbGxpcHNlIGN4PSIzNiIgY3k9IjI1IiByeD0iMjIiIHJ5PSI5IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIuMyIgdHJhbnNmb3JtPSJyb3RhdGUoLTI1IDM2IDI1KSIvPjxyZWN0IHg9IjE0IiB5PSIxOCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjY0IiBmaWxsPSIjZDZjM2ExIiBzdHJva2U9IiM3YTVhMmEiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjI0IiB5PSIzMiIgd2lkdGg9IjYyIiBoZWlnaHQ9IjI4IiByeD0iOCIgZmlsbD0idXJsKCN3KSIgc3Ryb2tlPSIjMzM0MTU1IiBzdHJva2Utd2lkdGg9IjIuNSIvPjxyZWN0IHg9IjMwIiB5PSI1NCIgd2lkdGg9IjUwIiBoZWlnaHQ9IjQiIHJ4PSIyIiBmaWxsPSIjMWUyOTNiIi8+PHJlY3QgeD0iNzAiIHk9IjM4IiB3aWR0aD0iOSIgaGVpZ2h0PSI0IiByeD0iMiIgZmlsbD0iIzM4YmRmOCIvPjxwYXRoIGQ9Ik00MiA2NCBMMzggNzQgTTU2IDY0IFY3NiBNNzAgNjQgTDc0IDc0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMy41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L3N2Zz4=", "u_none": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJ3IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjY2JkNWUxIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImJyIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmRlNjhhIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjYTE2MjA3Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDkiIGZpbGw9InVybCgjcikiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MiIgZmlsbD0idXJsKCNnKSIvPjxlbGxpcHNlIGN4PSIzNiIgY3k9IjI1IiByeD0iMjIiIHJ5PSI5IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIuMyIgdHJhbnNmb3JtPSJyb3RhdGUoLTI1IDM2IDI1KSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjIyIiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iNyIvPjxsaW5lIHgxPSIzNSIgeTE9IjY1IiB4Mj0iNjUiIHkyPSIzNSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjciIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjwvc3ZnPg==", "ceilh": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJ3IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjY2JkNWUxIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImJyIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmRlNjhhIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjYTE2MjA3Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDkiIGZpbGw9InVybCgjcikiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MiIgZmlsbD0idXJsKCNnKSIvPjxlbGxpcHNlIGN4PSIzNiIgY3k9IjI1IiByeD0iMjIiIHJ5PSI5IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIuMyIgdHJhbnNmb3JtPSJyb3RhdGUoLTI1IDM2IDI1KSIvPjxyZWN0IHg9IjE2IiB5PSIyMCIgd2lkdGg9IjY4IiBoZWlnaHQ9IjEwIiByeD0iMiIgZmlsbD0iI2RiZWFmZSIgc3Ryb2tlPSIjMWUzYThhIiBzdHJva2Utd2lkdGg9IjIuNSIvPjxnIHN0cm9rZT0iIzkzYzVmZCIgc3Ryb2tlLXdpZHRoPSIyIj48bGluZSB4MT0iMzgiIHkxPSIyMCIgeDI9IjM4IiB5Mj0iMzAiLz48bGluZSB4MT0iNjEiIHkxPSIyMCIgeDI9IjYxIiB5Mj0iMzAiLz48L2c+PHJlY3QgeD0iMTYiIHk9IjcyIiB3aWR0aD0iNjgiIGhlaWdodD0iOSIgcng9IjIiIGZpbGw9IiNkNmMzYTEiIHN0cm9rZT0iIzdhNWEyYSIgc3Ryb2tlLXdpZHRoPSIyLjUiLz48bGluZSB4MT0iNTAiIHkxPSI0MCIgeDI9IjUwIiB5Mj0iNjIiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSI2IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cG9seWdvbiBwb2ludHM9IjUwLDMyIDM5LDQ1IDYxLDQ1IiBmaWxsPSIjZmZmIi8+PHBvbHlnb24gcG9pbnRzPSI1MCw3MCAzOSw1NyA2MSw1NyIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg==", "neko": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJ3IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjY2JkNWUxIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImJyIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmRlNjhhIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjYTE2MjA3Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDkiIGZpbGw9InVybCgjcikiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MiIgZmlsbD0idXJsKCNnKSIvPjxlbGxpcHNlIGN4PSIzNiIgY3k9IjI1IiByeD0iMjIiIHJ5PSI5IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIuMyIgdHJhbnNmb3JtPSJyb3RhdGUoLTI1IDM2IDI1KSIvPjxyZWN0IHg9IjE0IiB5PSI2OCIgd2lkdGg9IjcyIiBoZWlnaHQ9IjgiIHJ4PSIyIiBmaWxsPSIjZGJlYWZlIiBzdHJva2U9IiMxZTNhOGEiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjE2IiB5PSIzNCIgd2lkdGg9IjI2IiBoZWlnaHQ9IjMwIiByeD0iMiIgZmlsbD0iI2NiZDVlMSIgc3Ryb2tlPSIjMzM0MTU1IiBzdHJva2Utd2lkdGg9IjIuNSIvPjxyZWN0IHg9IjQwIiB5PSIzOCIgd2lkdGg9IjUiIGhlaWdodD0iMTgiIGZpbGw9IiM2NDc0OGIiLz48cmVjdCB4PSI0MCIgeT0iNTIiIHdpZHRoPSIzMCIgaGVpZ2h0PSI2IiByeD0iMSIgZmlsbD0iIzY0NzQ4YiIgc3Ryb2tlPSIjMWUyOTNiIiBzdHJva2Utd2lkdGg9IjEuNSIvPjxsaW5lIHgxPSI2MCIgeTE9IjE0IiB4Mj0iNjAiIHkyPSI2NiIgc3Ryb2tlPSIjZWY0NDQ0IiBzdHJva2Utd2lkdGg9IjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPjxwb2x5Z29uIHBvaW50cz0iNTMsNDYgNjcsNDYgNjksNTAgNjcsNTEgNTMsNTEgNTEsNTAiIGZpbGw9InVybCgjYnIpIiBzdHJva2U9IiM3MTNmMTIiIHN0cm9rZS13aWR0aD0iMS4yIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLC0xKSIvPjxwb2x5Z29uIHBvaW50cz0iNTMsNTkgNjcsNTkgNjksNjIgNjcsNjQgNTMsNjQgNTEsNjIiIGZpbGw9InVybCgjYnIpIiBzdHJva2U9IiM3MTNmMTIiIHN0cm9rZS13aWR0aD0iMS4yIi8+PC9zdmc+", "udim": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJ3IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZmZmZmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjY2JkNWUxIi8+PC9saW5lYXJHcmFkaWVudD48bGluZWFyR3JhZGllbnQgaWQ9ImJyIiB4MT0iMCIgeTE9IjAiIHgyPSIxIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmRlNjhhIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjYTE2MjA3Ii8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDkiIGZpbGw9InVybCgjcikiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MiIgZmlsbD0idXJsKCNnKSIvPjxlbGxpcHNlIGN4PSIzNiIgY3k9IjI1IiByeD0iMjIiIHJ5PSI5IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIuMyIgdHJhbnNmb3JtPSJyb3RhdGUoLTI1IDM2IDI1KSIvPjxyZWN0IHg9IjIyIiB5PSIzNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjM4IiByeD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmI5MjNjIiBzdHJva2Utd2lkdGg9IjUiLz48cmVjdCB4PSIzMSIgeT0iNDQiIHdpZHRoPSIzOCIgaGVpZ2h0PSIyMiIgcng9IjIiIGZpbGw9IiNjYmQ1ZTEiIHN0cm9rZT0iIzMzNDE1NSIgc3Ryb2tlLXdpZHRoPSIyIi8+PGxpbmUgeDE9IjI0IiB5MT0iMjQiIHgyPSI3NiIgeTI9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMy41Ii8+PHBvbHlnb24gcG9pbnRzPSIyMCwyNCAzMCwxOCAzMCwzMCIgZmlsbD0iI2ZmZiIvPjxwb2x5Z29uIHBvaW50cz0iODAsMjQgNzAsMTggNzAsMzAiIGZpbGw9IiNmZmYiLz48L3N2Zz4="};
const NI=(k,h)=>`<img alt="" src="${NICO[k]}" style="width:${h||"1.45em"};height:${h||"1.45em"};vertical-align:-0.4em;margin-right:4px">`;
const NIMG={};try{Object.keys(NICO).forEach(k=>{const im=new Image();im.onload=()=>{clearTimeout(NIMG._t);NIMG._t=setTimeout(()=>{if(T&&T.grp&&!GUIDE&&!DV)try{build3D();T.dirty=true}catch(e){}},120)};im.src=NICO[k];NIMG[k]=im})}catch(e){}
function label(txt,h,bg,fg,ik){
 const c=document.createElement("canvas"),x=c.getContext("2d");
 const f='bold 44px -apple-system,"Hiragino Sans",sans-serif';
 const im=ik&&NIMG[ik]&&NIMG[ik].complete&&NIMG[ik].naturalWidth?NIMG[ik]:null,ip=im?62:0;
 x.font=f;const w=Math.ceil(x.measureText(txt).width)+40+ip;
 c.width=w;c.height=76;
 x.font=f;x.fillStyle=bg;x.beginPath();
 if(x.roundRect)x.roundRect(0,0,w,76,22);else x.rect(0,0,w,76);
 x.fill();if(im)try{x.drawImage(im,10,8,60,60)}catch(e){}x.fillStyle=fg;x.textBaseline="middle";x.fillText(txt,20+ip,41);
 const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,transparent:true}));
 s.scale.set(h*w/76,h,1);s.renderOrder=10;s.userData.lab=1;s.userData.ar=w/76;return s;
}
function pxl(s,px,off,rad){s.userData.px=px;s.userData.off=off||null;s.userData.rad=rad||0;return s}
/* ラベルを画面上で一定の大きさにして、配管の横へずらして置く（拡大しても配管を隠さない） */
function fixLabels(cam,W,H){
 const kpx=2*Math.tan(cam.fov*Math.PI/360)/H;
 const sc=P=>{const v=P.clone().project(cam);return[v.x*W/2,v.y*H/2]};
 const each=f=>{T.grp.traverse(f);if(T.bgrp)T.bgrp.traverse(f)};
 each(o=>{
  const u=o.userData;if(!u||!u.px)return;
  const dist=Math.max(1e-3,cam.position.distanceTo(o.position)),wpp=kpx*dist;
  const hpx=u.px,wpx=u.px*(u.ar||3);
  o.scale.set(wpx*wpp,hpx*wpp,1);
  const f=u.off;if(!f||!o.center)return;
  let n=[0,1];
  if(f.t==="perp"){
   const a=sc(f.a),b=sc(f.b),dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy);
   if(L>1){n=[-dy/L,dx/L];if(n[1]<-1e-6||(Math.abs(n[1])<=1e-6&&n[0]<0))n=[-n[0],-n[1]]}
  }else if(f.t==="out"){
   const a=sc(o.position),b=sc(o.position.clone().addScaledVector(f.o,T.ext*0.05)),dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy);
   if(L>0.5)n=[dx/L,dy/L];
  }
  if(f.dn)n=[-n[0],-n[1]];
  const off=(u.rad||0)/wpp+7+Math.abs(n[0])*wpx/2+Math.abs(n[1])*hpx/2;
  o.center.set(0.5-n[0]*off/wpx,0.5-n[1]*off/hpx);
 });
}

function build3D(){
 const V=THREE.Vector3,br=brOn();
 const GM=!!(GUIDE&&GUIDE.on);
 if(st.nopipe&&JSON.stringify(st.rows)!==NOPSIG)st.nopipe=false;
 const HIDX=new Set(HID);if(st.nopipe)HIDX.add("m");if(GM)legIds().forEach(x=>{if(x!==GUIDE.g)HIDX.add(x)});
 const RW=(g,rows)=>GM&&g===GUIDE.g?rows.map((r,j)=>j<GUIDE.i?r:j===GUIDE.i&&GUIDE.prog>0?{...r,a:r.a*Math.min(1,GUIDE.prog)}:{...r,a:0}):rows;
 if(T.bgrp)while(T.bgrp.children.length){const o=T.bgrp.children.pop();o.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material)n.material.dispose()})}
 while(T.grp.children.length){const o=T.grp.children.pop();o.traverse(n=>{if(n.userData&&n.userData.keep)return;if(n.geometry)n.geometry.dispose();if(n.material){if(n.material.map)n.material.map.dispose();n.material.dispose()}})}
 const w0=WALLX[st.units.ws]||WALLX.rb;
 const outDown=t=>st.units.on&&st.units[t]==="out"&&["d","m"].includes(outExitKey(st.units["o"+t],st.units["x"+t]));
 const D0=((st.units.on&&st.units.s==="wall"&&w0.k==="d")||outDown("s"))?new V(0,-1,0):new V(1,0,0);
 const F0=frameFor(D0);
 /* 1本分の配管をたどる */
 function trace(rows,p0,d0,u0,r0,Dl){
  const R=bR(Dl);
  let d=d0.clone(),u=u0.clone(),r=r0.clone(),C=p0.clone(),pos=p0.clone();
  const P=[],dims=[],bends={},ofsL=[],angL=[],frames=[];
  const seg=(a,b,row,arc)=>{P.push({a:a.clone(),b:b.clone(),row,arc})};
  rows.forEach((row,i)=>{
   C=C.clone().addScaledVector(d,row.l);
   frames[i]={c:C.clone(),d:d.clone(),u:u.clone(),r:r.clone()};
   const th=row.a*Math.PI/180;
   if(!row.a){seg(pos,C,i,-1);if(row.l>0)dims.push({a:pos.clone(),b:C.clone(),l:row.l,i});pos=C.clone();return}
   const Tn=row.a>=180?R:R*Math.tan(th/2);
   let e=C.clone().addScaledVector(d,-Tn);
   if(e.clone().sub(pos).dot(d)<0)e=pos.clone();
   seg(pos,e,i,-1);if(row.l>0)dims.push({a:pos.clone(),b:C.clone(),l:row.l,i});
   const tw=effT(i,rows)*Math.PI/180;
   if(row.o)ofsL.push({a:pos.clone(),b:C.clone(),v:row.l*Math.sin(th),i});
   const b=u.clone().multiplyScalar(Math.cos(tw)).addScaledVector(r,Math.sin(tw));
   bends[i]={e:e.clone(),b:b.clone(),u:u.clone(),r:r.clone()};
   const cen=e.clone().addScaledVector(b,R);
   let prev=e.clone();
   const N=Math.max(3,Math.ceil(row.a/6));
   for(let k=1;k<=N;k++){
    const ph=th*k/N;
    const q=cen.clone().addScaledVector(b,-R*Math.cos(ph)).addScaledVector(d,R*Math.sin(ph));
    seg(prev,q,-1,i);prev=q;
   }
   {const ph=th/2,mid=cen.clone().addScaledVector(b,-R*Math.cos(ph)).addScaledVector(d,R*Math.sin(ph));
    angL.push({p:mid,o:mid.clone().sub(cen).normalize(),a:row.a,i});}
   if(row.a>=180)C=C.clone().addScaledVector(b,2*R);
   const n=d.clone().cross(b).normalize();
   d=d.clone().applyAxisAngle(n,th);u=u.clone().applyAxisAngle(n,th);r=r.clone().applyAxisAngle(n,th);
   pos=prev.clone();
  });
  return{P,dims,bends,ofsL,angL,frames,pos,d,u,r};
 }
const LG=[];
 {const z=SIZES[st.s],t=trace(RW("m",st.rows),new V(),F0.ex,F0.ey,F0.ez,z[1]);
  LG.push({id:"m",tag:"",col:0x2563eb,css:"#2563eb",rows:st.rows,z,D:z[1],lim:z[2],par:null,...t});}
 st.bl.forEach(o=>{
  const par=LG.find(x=>x.id===o.p),z=SIZES[o.s],t=trace(RW(o.id,o.rows),par.pos,par.d,par.u,par.r,z[1]),css=legColor(o.id);
  LG.push({id:o.id,tag:o.id.toUpperCase(),col:parseInt(css.slice(1),16),css,rows:o.rows,z,D:z[1],lim:z[2],par:o.p,...t});
 });
 T.segs=[];
 T.legFr={};LG.forEach(L=>{T.legFr[L.id]=L.frames});
 T.legBox={};LG.forEach(L=>{const b=new THREE.Box3();L.P.forEach(p=>{b.expandByPoint(p.a);b.expandByPoint(p.b)});b.expandByPoint(L.pos);T.legBox[L.id]=b});
 const hasKid=L=>LG.some(x=>x.par===L.id),LEAF=LG.filter(L=>!hasKid(L));
 LG.forEach(L=>{L.sum=L.rows.reduce((s,x)=>s+x.l,0);L.over=L.sum>L.lim});
 const bb=new THREE.Box3();
 LG.forEach(L=>L.P.forEach(p=>{bb.expandByPoint(p.a);bb.expandByPoint(p.b)}));
 bb.expandByPoint(new V());
 const endEx=(t,L)=>{
  const k=st.units[t],wk=st.units["w"+t];
  if((k==="wall"&&(WALLX[wk]||WALLX.rb).k==="d")||outDown(t))return new V(0,-1,0);
  let h=new V(-L.d.x,0,-L.d.z);
  if(h.length()<0.2){h=null;
   for(let i=L.P.length-1;i>=0;i--){const q=L.P[i].b.clone().sub(L.P[i].a);q.y=0;if(q.length()>1e-3){h=q.negate();break}}
   if(!h)h=new V(-1,0,0)}
  return h.normalize();
 };
 const UN=[];
 if(st.units.on&&!GM){
  const ul=[["s",new V(),D0,LG[0]]];
  LEAF.forEach(L=>{const k=br?"L"+L.id:"e";ul.push([k,L.pos.clone(),endEx(k,L),L])});
  ul.forEach(([t,org,ex,L])=>{
   const type=st.units[t];if(!type)return;
   try{
    const mk=makeUnit(type,{kind:st.info.kind,wx:st.units["w"+t],om:st.units["o"+t],ox:st.units["x"+t],ck:st.units["c"+t],mm:st.units["m"+t]}),f=frameFor(ex,t==="e"?st.units.he:null);
    mk.g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.ex,f.ey,f.ez));
    mk.g.position.copy(org);mk.g.updateMatrixWorld(true);
    bb.union(new THREE.Box3().setFromObject(mk.g));
    const c2=mk.c2?{cy:mk.g.localToWorld(new V(...mk.c2.ceil)).y,ctr:mk.g.localToWorld(new V(...mk.c2.ceil)),nk:mk.g.localToWorld(new V(...mk.c2.neko)),bolts:mk.c2.bolts.map(b=>mk.g.localToWorld(new V(...b))),ba:mk.c2.ba,bb:mk.c2.bb,nkTxt:mk.c2.nkTxt||""}:null;
    UN.push({g:mk.g,name:mk.name,top:mk.top,cx:mk.cx,cz:mk.cz||0,labs:mk.labs||[],c2,org,f,L,t});
   }catch(err){console.warn("unit",err)}
  });
 }
 let GY=null,CY=null;
 const C2=UN.find(u=>u.c2);
 const SCV=typeof SCAN!=="undefined"&&SCAN&&SCAN.obj&&st.scan&&st.scan.show;
 if((st.gnd.on||st.gnd.c||(st.bld&&st.bld.length&&!st.bldHide)||SCV)&&!GM){
  const G=st.gnd,IN=["cas","cas2","ceil","wall","flr"];
  if(G.mode==="auto"&&C2)GY=C2.c2.cy-G.ch;   // 天カセ2方向があれば：その天井面＝天井、地面は天井高さぶん下
  else if(G.mode==="start")GY=-G.h;
  else if(G.mode==="pipe"){
   const L=LG.find(x=>x.id===G.g);
   if(L){const sg=L.P.find(p=>p.row===G.r&&p.arc<0&&p.a.distanceTo(p.b)>1e-3);const y=sg?(sg.a.y+sg.b.y)/2:L.pos.y;GY=y-G.h}
  }
  else if(G.mode==="unit"){
   const u=UN.find(x=>x.t===G.unit&&IN.includes(st.units[x.t]))||UN.find(x=>IN.includes(st.units[x.t]));
   if(u){const b=new THREE.Box3().setFromObject(u.g);GY=b.min.y-G.h}
  }
  if(GY===null)GY=bb.min.y;
  if(G.c)CY=(G.mode==="auto"&&C2)?C2.c2.cy:GY+G.ch;
  {const c0=bb.getCenter(new V());if(G.on)bb.expandByPoint(new V(c0.x,GY,c0.z));if(CY!==null)bb.expandByPoint(new V(c0.x,CY,c0.z))}
 }
 if(GY!==null&&st.bld&&st.bld.length&&!st.bldHide){const CHb=CY!==null?CY-GY:st.gnd.ch;st.bld.forEach(o=>{const h=o.full?CHb:o.h,y0=GY+(o.full?0:o.y),R2=Math.hypot(o.w,o.d)/2;bb.expandByPoint(new V(o.x-R2,y0,o.z-R2));bb.expandByPoint(new V(o.x+R2,y0+h,o.z+R2))})}
 T.GYr=GY;if(SCV&&GY!==null&&!GM){try{scanApply();bb.union(new THREE.Box3().setFromObject(SCAN.obj))}catch(e){}}
 try{updNop()}catch(e){}
 T.gy=st.gnd.on?GY:null;T.cy=CY;T.UN=UN;T.GYr=GY;T.CHh=GY!==null&&CY!==null?CY-GY:st.gnd.ch;
 const sz=bb.getSize(new V()),ctr=bb.getCenter(new V());T.ctr=ctr;
 const ext=Math.max(sz.x,sz.y,sz.z,300);
 const Dmax=Math.max(...LG.map(L=>L.D));
 LG.forEach(L=>{L.rad=GM?L.D*0.6:Math.min(L.D/2*4,Math.max(L.D/2,ext*0.0065*Math.pow(L.D/Dmax,0.9)))});
 const rad=Math.max(...LG.map(L=>L.rad));
 T.ext=ext;T.center.copy(ctr);
 const omat=new THREE.MeshBasicMaterial({color:0x0b1f4d,side:THREE.BackSide});
 const hi=new THREE.MeshStandardMaterial({color:0xfbbf24,metalness:0.3,roughness:0.35});
 const Y=new V(0,1,0);
 LG.forEach(L=>{
  if(HIDX.has(L.id))return;
  const rd=L.rad,tg=L.tag;
  const mat=new THREE.MeshStandardMaterial({color:L.col,metalness:0.35,roughness:0.32});
  const matO=new THREE.MeshStandardMaterial({color:0xf97316,metalness:0.35,roughness:0.32});
  let acc=0;
  const cyl=(pa,pb,mt,sph,rowi)=>{
   const len=pa.distanceTo(pb);if(len<1e-6)return;
   T.segs.push({g:L.id,a:pa.clone(),b:pb.clone(),row:rowi});
   const m=new THREE.Mesh(new THREE.CylinderGeometry(rd,rd,len,20,1),mt);
   m.position.copy(pa).add(pb).multiplyScalar(0.5);
   m.quaternion.setFromUnitVectors(Y,pb.clone().sub(pa).normalize());
   T.grp.add(m);
   const ol=new THREE.Mesh(new THREE.CylinderGeometry(rd*1.16,rd*1.16,len,20,1,true),omat);
   ol.position.copy(m.position);ol.quaternion.copy(m.quaternion);T.grp.add(ol);
   if(sph){
    const s=new THREE.Mesh(new THREE.SphereGeometry(rd,14,10),mt);s.position.copy(pb);T.grp.add(s);
    const so=new THREE.Mesh(new THREE.SphereGeometry(rd*1.16,14,10),omat);so.position.copy(pb);T.grp.add(so);
   }
  };
  L.P.forEach(p=>{
   const len=p.a.distanceTo(p.b);
   const hl=L.id===leg&&(p.row===sel||p.arc===sel),sph=p.arc>=0;
   if(len<1e-6){return}
   const ri=p.row>=0?p.row:p.arc;
   if(hl)cyl(p.a,p.b,hi,sph,ri);
   else if(acc>=L.lim)cyl(p.a,p.b,matO,sph,ri);
   else if(acc+len>L.lim){
    const pt=p.a.clone().lerp(p.b,(L.lim-acc)/len);
    cyl(p.a,pt,mat,false,ri);cyl(pt,p.b,matO,sph,ri);
   }else cyl(p.a,p.b,mat,sph,ri);
   acc+=len;
  });
  const cs=L.id===leg;
  L.dims.forEach(dm=>{
   const on=cs&&dm.i===sel;
   const s=label(tg+nm(dm.i)+" "+fmt(dm.l)+"mm",ext*0.042,on?"#fef3c7f2":"#ffffffee","#0c4a6e");
   s.position.copy(dm.a).add(dm.b).multiplyScalar(0.5);
   s.userData.cat="dim";pxl(s,on?24:20,{t:"perp",a:dm.a,b:dm.b},rd);
   T.grp.add(s);
  });
  if(st.sup.on&&!GM)L.dims.forEach(dm=>{
   const dir=dm.b.clone().sub(dm.a);if(dir.length()<1e-6)return;dir.normalize();
   const p0=dm.b.clone().addScaledVector(dir,-dm.l);
   supPos(dm.l,Math.abs(dir.y)>0.8).forEach(x=>{
    const ring=new THREE.Mesh(new THREE.TorusGeometry(rd*1.55,rd*0.32,10,24),new THREE.MeshStandardMaterial({color:Math.abs(dir.y)>0.8?0x7c3aed:0xe11d48,metalness:.2,roughness:.45}));
    ring.position.copy(p0).addScaledVector(dir,x);ring.quaternion.setFromUnitVectors(new V(0,0,1),dir);T.grp.add(ring);
   });
  });
  L.angL.forEach(g=>{
   const on=cs&&g.i===sel;
   const s=label(g.a+"°"+(g.a>=180?" 返し":""),ext*(on?0.065:0.052),ANGC[g.a]||"#475569","#ffffff");
   s.position.copy(g.p);s.userData.cat="ang";pxl(s,on?26:22,{t:"out",o:g.o},rd);T.grp.add(s);
  });
  L.ofsL.forEach(o=>{const s=label("↔ 差 "+fmt(o.v)+"mm",ext*0.035,"#ede9fef2","#5b21b6");s.position.copy(o.a).add(o.b).multiplyScalar(0.5);s.userData.cat="ofs";pxl(s,19,{t:"perp",a:o.a,b:o.b,dn:true},rd);T.grp.add(s)});
  if(br){
   /* 配管サイズの表示：いちばん長い直管の真ん中 */
   let best=null,bl=0;L.P.forEach(p=>{if(p.arc<0){const l=p.a.distanceTo(p.b);if(l>bl){bl=l;best=p}}});
   if(best){
    const s=label(legName(L.id)+" "+L.z[0],ext*0.045,L.css+"f2","#ffffff");
    s.position.copy(best.a).add(best.b).multiplyScalar(0.5);s.userData.cat="size";
    pxl(s,22,{t:"perp",a:best.a,b:best.b,dn:true},rd);T.grp.add(s);
   }
  }
 });
LG.filter(L=>!GM&&hasKid(L)&&!HIDX.has(L.id)).forEach(P0=>{
  /* 分岐の継手 */
  const jr=P0.rad*1.4;
  const jm=new THREE.Mesh(new THREE.SphereGeometry(jr,18,14),new THREE.MeshStandardMaterial({color:0xb45309,metalness:.6,roughness:.35}));
  jm.position.copy(P0.pos);T.grp.add(jm);
  const s=label("🔀 分岐",ext*0.045,"#fef3c7f2","#92400e");
  s.position.copy(P0.pos);s.userData.cat="size";pxl(s,22,{t:"up"},jr);T.grp.add(s);
 });
 const cl=LG.find(x=>x.id===leg)||LG[0],bd=(GM||HIDX.has(cl.id))?null:cl.bends[sel];
 if(bd){
  const rd=cl.rad,L=ext*0.11,am=new THREE.MeshStandardMaterial({color:0xef4444,roughness:.4});
  const q=new THREE.Quaternion().setFromUnitVectors(Y,bd.b);
  const sh=new THREE.Mesh(new THREE.CylinderGeometry(rd*0.4,rd*0.4,L*0.7,10),am);
  sh.position.copy(bd.e).addScaledVector(bd.b,L*0.35);sh.quaternion.copy(q);T.grp.add(sh);
  const cn=new THREE.Mesh(new THREE.ConeGeometry(rd*1.1,L*0.3,14),am);
  cn.position.copy(bd.e).addScaledVector(bd.b,L*0.85);cn.quaternion.copy(q);T.grp.add(cn);
  const row=cl.rows[sel],NM=["上","右","下","左"],si=[0,90,180,270].indexOf(effT(sel,cl.rows));
  const s=label(dirName(effT(sel,cl.rows))+"へ "+row.a+"°",ext*0.045,"#fee2e2f2","#7f1d1d");
  s.position.copy(bd.e).addScaledVector(bd.b,L*1.2);s.userData.cat="bend";pxl(s,22);T.grp.add(s);
  // 進行方向から見た 上・右・下・左 の目印（曲げ始めの位置）
  const cr=Math.max(rd*3.4,ext*0.06);
  const dirs=[bd.u,bd.r,bd.u.clone().negate(),bd.r.clone().negate()];
  dirs.forEach((v,k)=>{
   const on=k===si,gm=new THREE.MeshBasicMaterial({color:on?0xef4444:0x94a3b8});
   const sp=new THREE.Mesh(new THREE.CylinderGeometry(rd*0.14,rd*0.14,cr,6),gm);
   sp.position.copy(bd.e).addScaledVector(v,cr/2);sp.quaternion.setFromUnitVectors(Y,v);T.grp.add(sp);
   const dot=new THREE.Mesh(new THREE.SphereGeometry(rd*(on?0.8:0.5),12,8),gm);
   dot.position.copy(bd.e).addScaledVector(v,cr);T.grp.add(dot);
   if(!on){const t=label(NM[k],ext*0.032,"#ffffffcc","#475569");t.position.copy(bd.e).addScaledVector(v,cr*1.4);t.userData.cat="bend";pxl(t,17);T.grp.add(t)}
  });
 }
 UN.forEach(u=>{
  T.grp.add(u.g);
  const rd=u.L.rad;
  try{
   const sq=new THREE.Quaternion().setFromUnitVectors(Y,u.f.ex);
   const ins=new THREE.Mesh(new THREE.CylinderGeometry(rd*1.9,rd*1.9,120,20),new THREE.MeshStandardMaterial({color:0x374151,roughness:.8}));
   ins.position.copy(u.org).addScaledVector(u.f.ex,-10);ins.quaternion.copy(sq);T.grp.add(ins);
   const nut=new THREE.Mesh(new THREE.CylinderGeometry(rd*2.4,rd*2.4,16,6),new THREE.MeshStandardMaterial({color:0xb8860b,metalness:.6,roughness:.35}));
   nut.position.copy(u.org).addScaledVector(u.f.ex,38);nut.quaternion.copy(sq);T.grp.add(nut);
  }catch(err){console.warn("stub",err)}
  const s=label("🏠 "+(br&&u.t!=="s"?u.t.slice(1).toUpperCase()+" ":"")+u.name,ext*0.045,"#ffffffee","#0c4a6e");
  s.position.copy(u.org).addScaledVector(u.f.ex,u.cx).addScaledVector(u.f.ey,u.top).addScaledVector(u.f.ez,u.cz);s.userData.cat="unit";pxl(s,24,{t:"up"},0);T.grp.add(s);
  (u.labs||[]).forEach(q=>{const w=u.g.localToWorld(new V(q.p[0],q.p[1],q.p[2])),b=label(q.t,ext*0.035,"#fff7edf2","#9a3412","udim");b.position.copy(w);b.userData.cat=q.c||"udim";pxl(b,18);T.grp.add(b)});
 });
 const flag=(pt,txt,bg,fg,col)=>{
  const h=ext*0.13;
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(rad*0.28,rad*0.28,h,8),new THREE.MeshStandardMaterial({color:col,roughness:.5}));
  pole.position.copy(pt);pole.position.y+=h/2;T.grp.add(pole);
  const ball=new THREE.Mesh(new THREE.SphereGeometry(rad*0.8,14,10),new THREE.MeshStandardMaterial({color:col,roughness:.4}));
  ball.position.copy(pt);ball.position.y+=h;T.grp.add(ball);
  const s=label(txt,ext*0.05,bg,fg);s.position.copy(pt);s.position.y+=h;s.userData.cat="flag";pxl(s,26,{t:"up"},rad*0.8);T.grp.add(s);
 };
 if(typeof PLAN!=="undefined"&&PLAN&&PLAN.show&&PLAN.map&&!GM){try{addPlan3D()}catch(e){console.warn("plan3d",e)}}
 if(CY!==null){ // 天井（青みのある白・半透明）
  const size=Math.max(sz.x,sz.z)*1.5+1500;
  if(THREE.PlaneGeometry){
   const pl=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({color:0x93c5fd,transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}));
   pl.rotation.x=-Math.PI/2;pl.position.set(ctr.x,CY,ctr.z);pl.renderOrder=-1;T.grp.add(pl);
  }
  if(THREE.GridHelper){
   const gh=new THREE.GridHelper(size,Math.max(4,Math.round(size/910)),0x2563eb,0x60a5fa);
   gh.material.transparent=true;gh.material.opacity=.22;gh.material.depthWrite=false;gh.position.set(ctr.x,CY-0.5,ctr.z);T.grp.add(gh);
  }
  const s=label("天井"+(GY!==null?" 地面から "+fmt(CY-GY):""),ext*0.035,"#dbeafef2","#1e3a8a","ceilh");
  s.position.set(ctr.x-size*0.3,CY,ctr.z-size*0.3);s.userData.cat="gnd";pxl(s,18);T.grp.add(s);
 }
 if(SCV&&GY!==null&&!GM){try{addScan3D()}catch(e){console.warn("scan",e)}}
 if(GY!==null){try{addBld3D(GY,CY!==null?CY-GY:st.gnd.ch,ext)}catch(e){console.warn("bld",e)}}else T.bldM=[];
 UN.forEach(u=>{if(!u.c2)return; // ネコ（吊り金具）の高さ
  const p=u.c2.nk,parts=[];
  if(GY!==null&&(st.gnd.on||st.gnd.c))parts.push("地面から "+fmt(p.y-GY));
  parts.push("天井から "+(u.c2.nkTxt||fmt(CY!==null?p.y-CY:100)));
  const s=label("ネコ（吊り金具） "+parts.join(" ／ "),ext*0.035,"#fef9c3f2","#713f12","neko");
  s.position.copy(p);s.userData.cat="neko";pxl(s,19,{t:"up"},0);T.grp.add(s);
  if(GY!==null&&(st.gnd.on||st.gnd.c)&&p.y-GY>200){ // 地面→ネコの矢印（ネコの色）
   const c=u.c2.ctr,dx=p.x-c.x,dz=p.z-c.z,dl=Math.hypot(dx,dz)||1,ax=p.x+dx/dl*160,az=p.z+dz/dl*160,H=p.y-GY,col=0xca8a04,
    mk=(geo,y)=>{const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:col}));m.position.set(ax,y,az);m.userData.dimcat="neko";T.grp.add(m);return m};
   mk(new THREE.BoxGeometry(8,Math.max(1,H-100),8),GY+H/2);
   mk(new THREE.ConeGeometry(20,60,12),p.y-30);const dn=mk(new THREE.ConeGeometry(20,60,12),GY+30);dn.rotation.x=Math.PI;
   [[GY,1],[p.y,0]].forEach(([y])=>{const t=new THREE.Mesh(new THREE.BoxGeometry(120,6,120),new THREE.MeshBasicMaterial({color:col}));t.position.set(ax,y,az);t.userData.dimcat="neko";T.grp.add(t)});
   const k=new THREE.Mesh(new THREE.BoxGeometry(6,6,1),new THREE.MeshBasicMaterial({color:col}));k.position.set((ax+p.x)/2,p.y,(az+p.z)/2);k.scale.z=160;k.rotation.y=Math.atan2(dx,dz);k.userData.dimcat="neko";T.grp.add(k);
   const m=label("↕ 地面→ネコ "+fmt(H),ext*0.035,"#fef9c3f2","#713f12","neko");m.position.set(ax,GY+H/2,az);m.userData.cat="neko";pxl(m,18);T.grp.add(m);
  }
 });
 if(GY!==null&&st.gnd.on){
  const size=Math.max(sz.x,sz.z)*1.5+1500;
  if(THREE.PlaneGeometry){
   const pl=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({color:0x7c8f5a,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));
   pl.rotation.x=-Math.PI/2;pl.position.set(ctr.x,GY,ctr.z);pl.renderOrder=-1;T.grp.add(pl);
  }
  if(THREE.GridHelper){
   const gh=new THREE.GridHelper(size,Math.max(4,Math.round(size/500)),0x55663a,0x8a9a6a);
   gh.material.transparent=true;gh.material.opacity=.28;gh.material.depthWrite=false;gh.position.set(ctr.x,GY+0.5,ctr.z);T.grp.add(gh);
  }
  /* 地面からの高さ（曲げの角・起点・終点） */
  const pts=[],seen=new Set(),addP=(p,rd,end)=>{const k=[p.x,p.y,p.z].map(v=>Math.round(v/5)).join(",");if(seen.has(k))return;seen.add(k);pts.push({p,rd,end})};
  /* 高さが変わった所だけ表示（起点は必ず） */
  const lastH={};
  LG.forEach(L=>{
   let prev=L.id==="m"?0:(lastH[L.par]!==undefined?lastH[L.par]:null);
   const chk=(p,end)=>{const h=p.y;if(prev===null||Math.abs(h-prev)>10){if(!HIDX.has(L.id))addP(p,L.rad,end);prev=h}else if(end&&!HIDX.has(L.id))pts.push({p,rd:L.rad,end,nolab:true})};
   if(L.id==="m"&&!HIDX.has("m"))addP(new V(),L.rad,true);
   L.dims.forEach(dm=>chk(dm.b,false));
   if(!hasKid(L))chk(L.pos,true);
   lastH[L.id]=prev;
  });
  const lm=new THREE.MeshBasicMaterial({color:0x64748b,transparent:true,opacity:.6});
  pts.forEach(({p,rd,end,nolab})=>{
   const h=p.y-GY;
   if(h>1&&(end||!nolab)){
    const ln=new THREE.Mesh(new THREE.CylinderGeometry(rad*0.12,rad*0.12,h,6),lm);ln.position.set(p.x,GY+h/2,p.z);T.grp.add(ln);
    const ft=new THREE.Mesh(new THREE.SphereGeometry(rad*0.45,10,8),lm);ft.position.set(p.x,GY,p.z);T.grp.add(ft);
   }
   if(nolab)return;
   const s=label("↕ "+fmt(h),ext*0.035,"#ecfccbf2","#365314");
   s.position.set(p.x,GY+Math.max(h,0)/2,p.z);s.userData.cat="gnd";pxl(s,17);T.grp.add(s);
  });

 }
 if(!GM&&!HIDX.has("m"))flag(new V(),"🟢 起点","#dcfce7f2","#14532d",0x16a34a);
 LEAF.filter(L=>!GM&&!HIDX.has(L.id)).forEach(L=>flag(L.pos,br?"🔴 終点"+L.tag:"🔴 終点","#fee2e2f2","#7f1d1d",0xdc2626));
 const anyOver=LG.some(L=>L.over);
 $("#chip").className="chip"+(anyOver?" over":"");
 $("#chip").innerHTML=ICO(RULER_ICO)+(br?LG.map(L=>legName(L.id)+" "+fmt(L.sum)).join(" ／ ")+(anyOver?" ⚠️":""):`${fmt(LG[0].sum)}mm`+(st.goal?` 🎯${fmt(st.goal)}`:"")+(anyOver?" ⚠️":""));
  updSupUI();
 T.grp.traverse(o=>{if(o.userData&&o.userData.lab)o.visible=!GM&&labShow(o);else if(o.userData&&o.userData.dimcat)o.visible=LABC[o.userData.dimcat]!==false});
 try{T.grp.quaternion.set(0,0,0,1)}catch(e){}T.grp.position.set(0,0,0);
 if(GM){
  /* 曲げ手順：これから曲げる所をベンダーの上に置いた向きにする（台の面＝水平） */
  const L=LG.find(x=>x.id===GUIDE.g),rows=legRows(GUIDE.g),i=GUIDE.i,row=rows[i],fr=L&&L.frames[i];
  if(L&&fr&&row){
   const t=effT(i,rows)*Math.PI/180,b=fr.u.clone().multiplyScalar(Math.cos(t)).addScaledVector(fr.r,Math.sin(t));
   const sg=DIE_R?-1:1,n=fr.d.clone().cross(b).normalize().multiplyScalar(sg),e3=fr.d.clone().cross(n).normalize();
   const Dl=L.D,R=bR(Dl),Tn=row.a>=180?R:R*Math.tan(row.a*Math.PI/360);
   const rev=!!(GUIDE.rev&&GUIDE.rev[i]),TnOf=aa=>aa>=180?R:R*Math.tan(aa*Math.PI/360);
   const traceR=rx=>{if(GUIDE.g==="m")return trace(rx,new V(),F0.ex,F0.ey,F0.ez,Dl);const o=legObj(GUIDE.g),par=LG.find(x=>x.id===o.p);return trace(rx,par.pos,par.d,par.u,par.r,Dl)};
   /* 配管の置き方（ベンダーに対する向き）。rev＝逆向き（反対から差し込む）：まだ真っ直ぐな残りをガイド側に置き、曲げた側がシューに巻き付く */
   const poseOf=(aCur,rv)=>{
    const th=aCur*Math.PI/180,c=Math.cos(th),s2=Math.sin(th),e=fr.c.clone().addScaledVector(fr.d,-TnOf(aCur));
    let X,Yv,Z,anc;
    if(!rv){X=fr.d.clone();Yv=n.clone();Z=e3.clone();anc=e}
    else{const d2=fr.d.clone().multiplyScalar(c).addScaledVector(b,s2),b2=b.clone().multiplyScalar(c).addScaledVector(fr.d,-s2);
     anc=e.clone().addScaledVector(b,R).addScaledVector(b2,-R);X=d2.negate();Yv=n.clone().negate();Z=X.clone().cross(Yv)}
    const q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X,Yv,Z)).invert();
    return{q,pos:new V(-Tn,0,0).sub(anc.clone().applyQuaternion(q))};
   };
   const rowsAt=aa=>rows.map((r,j)=>j<i?r:j===i?{...r,a:aa}:{...r,a:0});
   const toW=(p,P)=>p.clone().applyQuaternion(P.q).add(P.pos);
   // 曲げた後の形（うすいオレンジ）：ベンダーに対する最後の置き方で表示
   try{if(!(GUIDE.prog>0)){
    const tg=traceR(rowsAt(row.a)),PF=poseOf(row.a,rev);
    const gm=new THREE.MeshBasicMaterial({color:0xf97316,transparent:true,opacity:.35,depthWrite:false});
    tg.P.forEach(p=>{const mv=rev?(p.row>=0&&p.row<=i)||(p.arc>=0&&p.arc<=i):(p.row>i||p.arc===i);if(!mv)return;
     const A=toW(p.a,PF),B=toW(p.b,PF),len=A.distanceTo(B);if(len<1e-6)return;
     const m=new THREE.Mesh(new THREE.CylinderGeometry(L.rad,L.rad,len,14,1),gm);m.position.copy(A).add(B).multiplyScalar(0.5);m.quaternion.setFromUnitVectors(Y,B.clone().sub(A).normalize());(T.bgrp||T.grp).add(m)});
   }}catch(err){}
   // 床に当たらないか（曲げている途中も含めて）
   let minN=1e9,minR=1e9;
   try{[0,.25,.5,.75,1].forEach(k=>{const tk=traceR(rowsAt(row.a*k));[false,true].forEach(rv=>{const P=poseOf(row.a*k,rv);let m=1e9;tk.P.forEach(p=>{m=Math.min(m,toW(p.a,P).y,toW(p.b,P).y)});if(rv)minR=Math.min(minR,m);else minN=Math.min(minN,m)})})}catch(err){}
   // ギアベンダーの模型（ベンダーの座標：x＝配管の進む向き、y＝上、z＝ダイスと反対側）
   const bg=new THREE.Group();
   const metal=new THREE.MeshStandardMaterial({color:0xb8c0c8,metalness:.55,roughness:.35}),blue=new THREE.MeshStandardMaterial({color:0x2b8be8,roughness:.5}),dark=new THREE.MeshStandardMaterial({color:0x475569,metalness:.4,roughness:.4}),red=new THREE.MeshStandardMaterial({color:0xef4444,roughness:.4});
   const add=(g,m,x,y,z)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z*sg);bg.add(o);return o};
   /* TA515のような形：青い本体（左右に長い）の上に、左にシュー（半円）、右にガイド。右端にハンドル、下に三脚。
      配管は前後（x）に通り、シューとガイドの間にはさむ。シューは配管の左（ダイス側）、ハンドルは右。 */
   const lg0=new THREE.MeshStandardMaterial({color:0x1f2937,roughness:.6});
   const BMOD=["g4d","ek","mb","lev","levb","rat"].includes(BENDER)?BENDER:"std";   // 選んだベンダーの模型（対応外サイズでも形は見せる）
   const blk=new THREE.MeshStandardMaterial({color:0x1f2937,metalness:.3,roughness:.5});
   const legTo=(x0,y0,z0,x1,z1,rr,mat)=>{const p0=new V(x0,y0,z0*sg),p1=new V(x1,-GUIDE_H,z1*sg),l=new THREE.Mesh(new THREE.CylinderGeometry(rr,rr,p0.distanceTo(p1),8),mat);l.position.copy(p0).add(p1).multiplyScalar(.5);l.quaternion.setFromUnitVectors(Y,p1.clone().sub(p0).normalize());bg.add(l)};
   const rod=(x0,y0,z0,x1,y1,z1,rr,mat)=>{const p0=new V(x0,y0,z0*sg),p1=new V(x1,y1,z1*sg),l=new THREE.Mesh(new THREE.CylinderGeometry(rr,rr,p0.distanceTo(p1),10),mat);l.position.copy(p0).add(p1).multiplyScalar(.5);l.quaternion.setFromUnitVectors(Y,p1.clone().sub(p0).normalize());bg.add(l)};
   if(BMOD==="g4d"){
   /* 手動ギア式直管ベンダー（TASCO）：黒い本体、シューの下に黒いギア（歯付き）と銀の分度盤、
      シューの軸の上にソケット＋ラチェットハンドル、反対側にガイド、下に三脚 */
    add(new THREE.CylinderGeometry(R,R,Dl*1.25,40,1,false,0,Math.PI),metal,-Tn,0,-R);                          // シュー
    add(new THREE.CylinderGeometry(R*1.45,R*1.45,Dl*0.55,40,1,false,0,Math.PI),blk,-Tn,-Dl*0.95,-R);              // ギア
    for(let k=0;k<=18;k++){const t=k*Math.PI/18,tt=add(new THREE.BoxGeometry(R*0.12,Dl*0.55,R*0.12),blk,-Tn+Math.sin(t)*R*1.5,-Dl*0.95,-R+Math.cos(t)*R*1.5)}
    add(new THREE.CylinderGeometry(R*1.8,R*1.8,Dl*0.12,48,1,false,0,Math.PI),metal,-Tn,-Dl*1.3,-R);               // 分度盤（銀）
    for(let k=0;k<=12;k++){const t=k*Math.PI/12;add(new THREE.BoxGeometry(R*0.03,Dl*0.14,R*0.03),dark,-Tn+Math.sin(t)*R*1.7,-Dl*1.24,-R+Math.cos(t)*R*1.7)}
    add(new THREE.CylinderGeometry(R*0.17,R*0.17,R*0.75,14),metal,-Tn,Dl*0.62+R*0.37,-R);                         // ソケット
    rod(-Tn,Dl*0.62+R*0.7,-R,-Tn+R*1.6,Dl*0.62+R*1.5,R*3.4,R*0.07,metal);                                         // ラチェットハンドル
    rod(-Tn+R*1.25,Dl*0.62+R*1.33,R*2.6,-Tn+R*1.6,Dl*0.62+R*1.5,R*3.4,R*0.11,red);                               // にぎり
    add(new THREE.BoxGeometry(R*1.6,Dl*1.3,Dl*1.4),blk,-Tn-R*0.85,0,Dl*1.25);                                      // ガイド
    const kb=add(new THREE.CylinderGeometry(R*0.32,R*0.32,R*0.35,20),blk,-Tn-R*1.9,0,Dl*1.25);kb.rotation.z=Math.PI/2; // ガイドのつまみ
    const top=-Dl*1.4,BH=R*0.55;
    add(new THREE.BoxGeometry(R*3.6,BH,R*3.2),blk,-Tn-R*0.3,top-BH/2,-R*0.5);                                     // 本体
    add(new THREE.CylinderGeometry(R*0.16,R*0.16,R*1.6,10),blk,-Tn-R*0.3,top-BH-R*0.8,-R*0.5);                     // 支柱
    [0,2.1,4.2].forEach(k=>legTo(-Tn-R*0.3,top-BH-R*1.5,-R*0.5,-Tn-R*0.3+Math.cos(k)*R*3.2,-R*0.5+Math.sin(k)*R*3.2,R*0.07,lg0));
   }else if(BMOD==="lev"||BMOD==="levb"){
   /* レバー式（2段式クイックアクション）：色付きの丸いシュー＋フック、固定ハンドルと動くハンドル（ガイド付き）。手に持って使う */
    const cc=BMOD==="levb"?0x1e40af:Dl<11?0xdc2626:Dl<14?0xeab308:Dl<17?0x1d4ed8:0x0f766e,col=new THREE.MeshStandardMaterial({color:cc,roughness:.45,metalness:.2});
    add(new THREE.CylinderGeometry(R,R,Dl*1.25,40),col,-Tn,0,-R);                                                   // シュー（丸）
    add(new THREE.CylinderGeometry(R*0.25,R*0.25,Dl*1.5,16),metal,-Tn,0,-R);                                        // 中心
    add(new THREE.BoxGeometry(R*0.5,Dl*1.2,Dl*0.5),metal,-Tn-R*0.6,0,Dl*0.75);                                      // フック
    const gc=new THREE.MeshStandardMaterial({color:BMOD==="levb"?0x3b5bdb:0x111827,roughness:.6});
    rod(-Tn,Dl*0.9,-R,-Tn-R*1.2-Math.max(R*5,300),Dl*0.9,-R*0.6,Math.max(Dl*0.28,5),metal);                        // 固定ハンドル
    rod(-Tn-R*1.2-Math.max(R*5,300)*0.75,Dl*0.9,-R*0.7,-Tn-R*1.2-Math.max(R*5,300),Dl*0.9,-R*0.6,Math.max(Dl*0.45,8),gc);
    add(new THREE.BoxGeometry(R*0.9,Dl*1.4,Dl*1.3),metal,-Tn+R*0.35,0,Dl*1.15);                                      // ガイド
    rod(-Tn,-Dl*0.9,-R,-Tn+R*1.2+Math.max(R*5,300),-Dl*0.9,Dl*1.4,Math.max(Dl*0.28,5),metal);                       // 動くハンドル
    rod(-Tn+R*1.2+Math.max(R*5,300)*0.75,-Dl*0.9,Dl*1.25,-Tn+R*1.2+Math.max(R*5,300),-Dl*0.9,Dl*1.4,Math.max(Dl*0.45,8),gc);
   }else if(BMOD==="rat"){
   /* ラチェットベンダー TA512AX：金色の半円シュー、黒い本体（ラチェットレバー）、反対側にローラーのガイド枠。手に持って使う */
    const gd=new THREE.MeshStandardMaterial({color:0xc8a24a,metalness:.6,roughness:.3});
    add(new THREE.CylinderGeometry(R,R,Dl*1.25,40,1,false,0,Math.PI),gd,-Tn,0,-R);                                  // シュー
    const L5=Math.max(R*5,260);
    add(new THREE.BoxGeometry(R*0.8,Dl*1.1,L5),blk,-Tn,Dl*1.0,-R-L5/2);                                               // 本体（シューの後ろへ）
    rod(-Tn,Dl*1.6,-R-L5*0.4,-Tn+R*0.4,Dl*1.6+R*0.2,-R-L5*1.05,Math.max(Dl*0.2,4),metal);                             // ラチェットレバー
    add(new THREE.BoxGeometry(R*3.2,Dl*0.6,Dl*1.0),blk,-Tn-R*0.2,-Dl*0.9,Dl*1.15);                                    // ガイド枠
    [-1,0,1].forEach(k=>{const r1=add(new THREE.CylinderGeometry(Dl*0.55,Dl*0.55,Dl*1.2,16),dark,-Tn-R*0.2+k*R*1.2,0,Dl*1.15)});  // ローラー
    rod(-Tn,-Dl*0.6,-R,-Tn-R*0.2,-Dl*0.6,Dl*1.15,Math.max(Dl*0.25,5),dark);                                            // 枠の腕
   }else if(BMOD==="mb"){
   /* 手動式直管ミニベンダー TA515MB：銀のアルミ本体（横に黒い取っ手）、上に銀のシュー（フック付き）、
      ガイドを送りねじで押す、端に青いクランクハンドル。テーブルクランプで作業台の端に固定 */
    add(new THREE.CylinderGeometry(R,R,Dl*1.25,40,1,false,0,Math.PI),metal,-Tn,0,-R);                          // シュー
    add(new THREE.CylinderGeometry(R*0.3,R*0.3,Dl*1.4,6),metal,-Tn,Dl*0.1,-R);                                     // シューの軸
    add(new THREE.BoxGeometry(R*0.45,Dl*1.25,R*0.3),metal,-Tn+R*0.95,0,-R*1.15);                                   // フック
    const al=new THREE.MeshStandardMaterial({color:0xd7dde3,metalness:.6,roughness:.3}),bt=-Dl*0.75,bh=R*1.15;
    add(new THREE.BoxGeometry(R*1.55,bh,R*2.8),al,-Tn,bt-bh/2,R*0.05);                                             // 本体
    add(new THREE.BoxGeometry(R*0.14,R*0.32,R*1.2),blk,-Tn+R*0.84,bt-bh*0.55,-R*0.2);                              // 横の取っ手
    const brs=new THREE.MeshStandardMaterial({color:0xb08d57,metalness:.5,roughness:.4});
    add(new THREE.BoxGeometry(R*0.9,Dl*1.3,Dl*1.4),brs,-Tn-R*0.15,0,Dl*1.25);                                      // ガイド
    add(new THREE.BoxGeometry(R*0.6,R*0.45,R*0.4),blk,-Tn,Dl*0.6+R*0.2,Dl*1.25+R*0.35);                            // ガイドの押さえ
    rod(-Tn,bt+Dl*0.3,Dl*1.25+R*0.3,-Tn,bt+Dl*0.3,R*1.45,Dl*0.2,metal);                                             // 送りねじ
    add(new THREE.BoxGeometry(R*1.0,R*0.9,R*0.22),blk,-Tn,bt-R*0.25,R*1.5);                                         // 端の板
    const bl=new THREE.MeshStandardMaterial({color:0x1d4ed8,roughness:.45});
    rod(-Tn,bt-R*0.05,R*1.6,-Tn,bt-R*0.05,R*2.15,R*0.09,bl);rod(-Tn,bt-R*0.05,R*2.15,-Tn,bt-R*2.3,R*2.25,R*0.09,bl); // クランク
    rod(-Tn,bt-R*2.3,R*2.25,-Tn,bt-R*2.3,R*3.0,R*0.13,blk);                                                          // にぎり
    const wd=new THREE.MeshStandardMaterial({color:0xc8a26a,roughness:.8}),ty=bt-bh;
    add(new THREE.BoxGeometry(R*6,R*0.25,R*7),wd,-Tn,ty-R*0.125,-R*2.2);                                              // 作業台（端に固定）
    add(new THREE.BoxGeometry(R*0.8,R*0.9,R*0.35),blk,-Tn,ty-R*0.6,R*1.1);                                            // テーブルクランプ
    add(new THREE.CylinderGeometry(R*0.22,R*0.22,R*0.2,14),blk,-Tn,ty-R*1.15,R*1.1);
    [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([u,w])=>legTo(-Tn+u*R*2.6,ty-R*0.25,-R*2.2+w*R*3.2,-Tn+u*R*2.6,-R*2.2+w*R*3.2,R*0.09,wd));
   }else if(BMOD==="ek"){
   /* 電動ベンダー TA515EK-N：黒いヘッドの上にダイス（7/8・1は黄色、1-1/8は銀）、茶色の曲げアームとノブ、
      黄色のモーター＋黒いグリップ、後ろに持ち運び枠。三脚に立てて使う */
    const dc=Dl<28?new THREE.MeshStandardMaterial({color:0xfacc15,roughness:.5}):metal;
    add(new THREE.CylinderGeometry(R,R,Dl*1.25,40,1,false,0,Math.PI),dc,-Tn,0,-R);                             // ダイス
    add(new THREE.CylinderGeometry(R*1.3,R*1.3,Dl*0.7,40),blk,-Tn,-Dl*1.0,-R);                                       // ヘッド
    add(new THREE.BoxGeometry(R*0.28,R*0.4,R*0.28),dark,-Tn,Dl*0.62+R*0.2,-R);                                        // 角軸
    const brn=new THREE.MeshStandardMaterial({color:0x7c3f2a,roughness:.6});
    add(new THREE.BoxGeometry(R*0.75,Dl*0.45,R*2.9),brn,-Tn,Dl*0.62+R*0.05,-R*0.05);                                // 曲げアーム
    add(new THREE.BoxGeometry(R*1.4,Dl*1.3,Dl*1.4),blk,-Tn-R*0.7,0,Dl*1.25);                                         // ガイド（シューガイド）
    add(new THREE.CylinderGeometry(R*0.07,R*0.07,R*0.9,10),dark,-Tn,Dl*0.62+R*0.5,R*1.25);                           // ノブの軸
    add(new THREE.SphereGeometry(R*0.2,16,12),blk,-Tn,Dl*0.62+R*1.0,R*1.25);                                         // ノブ
    const my2=-Dl*1.0-R*0.15;
    add(new THREE.BoxGeometry(R*1.6,R*0.75,R*1.3),blk,-Tn,my2,R*0.9);                                                 // ギアボックス
    const mo=add(new THREE.CylinderGeometry(R*0.5,R*0.5,R*2.3,24),new THREE.MeshStandardMaterial({color:0xfacc15,roughness:.45}),-Tn,my2,R*2.7);mo.rotation.x=Math.PI/2; // モーター
    const gr=add(new THREE.CylinderGeometry(R*0.32,R*0.36,R*1.9,18),blk,-Tn,my2,R*4.8);gr.rotation.x=Math.PI/2;      // グリップ
    rod(-Tn,my2,R*5.75,-Tn+R*1.4,my2-R*0.5,R*6.3,R*0.05,blk);                                                        // コード
    rod(-Tn-R*0.9,my2-R*0.2,-R*2.4,-Tn+R*0.9,my2-R*0.2,-R*2.4,R*0.06,blk);                                            // 持ち運び枠
    rod(-Tn-R*0.9,my2-R*0.2,-R*2.4,-Tn-R*0.9,my2-R*0.2,-R*1.2,R*0.06,blk);rod(-Tn+R*0.9,my2-R*0.2,-R*2.4,-Tn+R*0.9,my2-R*0.2,-R*1.2,R*0.06,blk);
    add(new THREE.BoxGeometry(R*1.8,R*0.3,R*1.8),blk,-Tn,my2-R*0.55,R*0.3);                                              // 三脚の受け台
    add(new THREE.CylinderGeometry(R*0.16,R*0.16,R*1.6,10),blk,-Tn,my2-R*1.45,R*0.3);                                    // 支柱
    [0,2.1,4.2].forEach(k=>legTo(-Tn,my2-R*2.1,R*0.3,-Tn+Math.cos(k)*R*3.2,R*0.3+Math.sin(k)*R*3.2,R*0.07,lg0));         // 三脚
   }else{
   const top=-Dl*0.75,BH=R*1.15,BX0=-Tn-R*1.7,BX1=-Tn+R*1.2,BZ0=-R*1.35,BZ1=R*4.2;
   add(new THREE.BoxGeometry(BX1-BX0,BH,BZ1-BZ0),blue,(BX0+BX1)/2,top-BH/2,(BZ0+BZ1)/2);                       // 本体
   const sh=add(new THREE.CylinderGeometry(R,R,Dl*1.25,40,1,false,0,Math.PI),metal,-Tn,0,-R);                   // シュー（半円）
   add(new THREE.CylinderGeometry(R*0.22,R*0.22,Dl*1.5,18),dark,-Tn,0,-R);                                      // シューの軸
   add(new THREE.BoxGeometry(R*1.5,Dl*1.3,Dl*1.4),dark,-Tn-R*0.8,0,Dl*1.25);                                    // ガイド
   add(new THREE.BoxGeometry(R*0.5,Dl*0.9,R*1.4),dark,-Tn-R*0.8,top+Dl*0.45,Dl*1.25+R*0.75);                     // ガイド送り
   const ax=add(new THREE.CylinderGeometry(R*0.1,R*0.1,R*0.5,10),dark,(BX0+BX1)/2,top-BH*0.45,BZ1+R*0.25);ax.rotation.x=Math.PI/2;  // ハンドル軸
   add(new THREE.BoxGeometry(R*0.16,R*1.2,R*0.16),blue,(BX0+BX1)/2,top-BH*0.45-R*0.5,BZ1+R*0.5);                 // ハンドル腕
   const gp=add(new THREE.CylinderGeometry(R*0.11,R*0.11,R*0.6,10),dark,(BX0+BX1)/2,top-BH*0.45-R*1.05,BZ1+R*0.8);gp.rotation.x=Math.PI/2; // にぎり
   const lg=new THREE.MeshStandardMaterial({color:0x1f2937,roughness:.6});
   [[0,1],[2.1,1],[4.2,1]].forEach(([k])=>{const a=k,len=R*7,lx=Math.cos(a)*R*2.2,lz=Math.sin(a)*R*2.2;
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(R*0.07,R*0.07,len,8),lg);
    const p0=new V((BX0+BX1)/2,top-BH,(BZ0+BZ1)/2*sg),p1=p0.clone().add(new V(lx,-len*0.95,lz*sg));
    leg.position.copy(p0).add(p1).multiplyScalar(0.5);leg.quaternion.setFromUnitVectors(Y,p1.clone().sub(p0).normalize());bg.add(leg)});
   }
   const mk=add(new THREE.TorusGeometry(Dl*0.8,Dl*0.2,10,24),red,-Tn,0,0);mk.rotation.y=Math.PI/2;
   try{
    (T.bgrp||T.grp).add(bg);
    const P0=poseOf(row.a*Math.min(1,GUIDE.prog||0),rev);T.grp.quaternion.copy(P0.q);T.grp.position.copy(P0.pos);
    // 床（ベンダーの台の高さから下）
    const H=GUIDE_H,fl=new THREE.Mesh(new THREE.PlaneGeometry(R*120,R*120),new THREE.MeshBasicMaterial({color:(rev?minR:minN)<-H+L.rad?0xef4444:0x94a3b8,transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));
    fl.rotation.x=-Math.PI/2;fl.position.set(0,-H,0);T.bgrp.add(fl);
    /* 3Dの吹き出し：曲げ寸法（前の角→この角）と、赤いラインからのバック／前に出す寸法 */
    const Cw=toW(fr.c,P0),Pw=toW(fr.c.clone().addScaledVector(fr.d,-row.l),P0),upv=new V(0,R*1.1,0);
    const a1=Pw.clone().add(upv),b1=Cw.clone().add(upv),dm=new THREE.MeshBasicMaterial({color:0x0c4a6e});
    const ln=new THREE.Mesh(new THREE.CylinderGeometry(Dl*0.12,Dl*0.12,a1.distanceTo(b1),6),dm);ln.position.copy(a1).add(b1).multiplyScalar(.5);ln.quaternion.setFromUnitVectors(Y,b1.clone().sub(a1).normalize());T.bgrp.add(ln);
    [[Pw,a1],[Cw,b1]].forEach(([p,q])=>{const tk=new THREE.Mesh(new THREE.CylinderGeometry(Dl*0.1,Dl*0.1,p.distanceTo(q),6),dm);tk.position.copy(p).add(q).multiplyScalar(.5);tk.quaternion.setFromUnitVectors(Y,q.clone().sub(p).normalize());T.bgrp.add(tk)});
    const s1=label("曲げ寸法 "+fmt(row.l)+"mm",R*0.6,"#ffffffee","#0c4a6e");s1.position.copy(a1).add(b1).multiplyScalar(.5);pxl(s1,24,{t:"perp",a:a1,b:b1},Dl*0.2);T.bgrp.add(s1);
    const bk=R*row.a/90,s2=label(rev?"赤いラインから 前に出す "+fmt(bk/2)+"mm":"赤いラインから バック "+fmt(bk)+"mm",R*0.6,rev?"#ea580cf2":"#dc2626f2","#ffffff");
    s2.position.set(-Tn,0,0);pxl(s2,24,{t:"up",dn:true},R*0.5);T.bgrp.add(s2);
   }catch(e){(T.bgrp||T.grp).add(bg)}
   // 前の曲げ（もう曲げた配管）が、配管の後ろから見てどっちを向くか
   let j=-1;for(let k=i-1;k>=0;k--){if(rows[k].a){j=k;break}}
   GUIDE.geo={R,Tn,D:Dl,a:row.a,prev:null,sg,rev,minN,minR,rad:L.rad};
   if(j>=0&&L.frames[j]){const v=L.frames[j].d.clone().negate();GUIDE.geo.prev={j,y:v.dot(n)*(rev?-1:1),z:v.dot(e3)}}
  }
 }
}

function updSupUI(){
const S=st.sup,p=$("#supPill");if(!p)return;
 if(!S.on){p.innerHTML=ICO($("#supBtn img").src,"1.5em")+"支持 OFF ⚙️";p.style.color="#64748b"}
 else{p.style.color="";p.innerHTML=ICO($("#supBtn img").src,"1.5em")+"支持 "+supShort()+" ⚙️"}
 $("#supBtn").style.opacity=S.on?1:.55;
}
function supShort(){
 const ds=legDirs(),ids=legIds();let H=0,V=0;ids.forEach(g=>{const x=supHV(g,ds);H+=x.h;V+=x.v});
 const cur=supHV(leg,ds),hv=(h,v)=>"横"+h+"・縦"+v;
 const all="計"+(H+V)+"箇所（"+hv(H,V)+"）";
 return ids.length===1?all:all+" ／ "+legName(leg)+" "+hv(cur.h,cur.v);
}
function supSummary(){
 const ds=legDirs(),ids=legIds(),c=ids.map(g=>supHV(g,ds));let H=0,V=0;c.forEach(x=>{H+=x.h;V+=x.v});
 const s0="計"+(H+V)+"箇所（横"+H+"・縦"+V+"）";
 return ids.length===1?s0:s0+"（"+ids.map((g,i)=>legName(g)+" 横"+c[i].h+"・縦"+c[i].v).join("／")+"）";
}

function fitT(keep){
 T.tg.copy(T.center);
 if(!keep){T.vi=0;T.th=0.8;T.ph=1.1}
 T.dist=(T.ext/2)/Math.tan(THREE.MathUtils.degToRad(T.cam.fov/2))*1.5;
 T.cam.near=Math.max(1,T.ext*0.01);T.cam.far=T.ext*100;T.cam.updateProjectionMatrix();
 T.dirty=true;
}

function loop(){
 if(window.__genRec)T.dirty=true;   // 現調モードの録画中は毎フレーム描く
 if(T.dirty){
  T.dirty=false;
  const {cam,th,ph,dist}=T;let tg=T.tg;
  if(T.custom){tg=T.custom.tg;cam.up.copy(T.custom.up);cam.position.copy(T.custom.pos);cam.lookAt(tg)}
  else{cam.up.set(0,1,0);cam.position.set(tg.x+dist*Math.sin(ph)*Math.sin(th),tg.y+dist*Math.cos(ph),tg.z+dist*Math.sin(ph)*Math.cos(th));cam.lookAt(tg)}
  const rd=T.rd,W=T.w,H=T.h;
  cam.updateMatrixWorld();fixLabels(cam,W,H);
  rd.setScissorTest(false);rd.setViewport(0,0,W,H);rd.render(T.sc,cam);
  const g=Math.round(Math.min(104,Math.min(W,H)*0.34)),gx=W-g-4-(T.full?0:(()=>{const t=$("#tools");return t.classList.contains("hide")?0:t.offsetWidth+6})()),gy=4;
  T.gcam.position.copy(cam.position).sub(tg).normalize().multiplyScalar(4.4);
  T.gcam.up.copy(cam.up);T.gcam.lookAt(0,0,0);
  rd.setViewport(gx,gy,g,g);rd.setScissor(gx,gy,g,g);rd.setScissorTest(true);
  rd.autoClear=false;rd.clearDepth();rd.render(T.gs,T.gcam);rd.autoClear=true;rd.setScissorTest(false);
  if(window.__genRec)window.__genRec();
 }
 requestAnimationFrame(loop);
}

const setFull=b=>{if(T)T.full=b;$("#stage").classList.toggle("full",b);setTimeout(sizeT,30)};
$("#expand").onclick=()=>setFull(true);
$("#close3").onclick=()=>setFull(false);
const VIEWS=[["斜め",.8,1.1],["正面（横から）",0,Math.PI/2],["真上",0,0.05],["側面（前から）",Math.PI/2,Math.PI/2]];
$("#viewBtn").onclick=()=>{
 if(!T)return;T.vi=(T.vi+1)%VIEWS.length;
 const v=VIEWS[T.vi];fitT(true);T.th=v[1];T.ph=v[2];T.dirty=true;toast("🔄 "+v[0]);
};
/* 文字のオンオフ */
const LABCATS=[["dim","📏 寸法（500mm など）"],["ang","📐 角度（90° など）"],["size","🔵 配管サイズ・分岐の名前"],["ofs","↔ 差（ずらす距離）"],["bend","🧭 曲げ方向（上・右・下・左）"],["unit","🏠 機器の名前"],["ubolt","@udim|吊りピッチ（紫の矢印）"],["uopen","@udim|天井開口（オレンジの矢印）"],["upanel","@udim|パネル（青の矢印）"],["upipe","@udim|ガス・液・ドレンの位置"],["udim","@udim|その他の機器の寸法"],["neko","@neko|ネコ（吊り金具）の高さ"],["bld","🧱 建物・障害物の名前と大きさ"],["flag","🚩 起点・終点の旗"],["gnd","↕ 地面からの高さ"],["info","📝 現場情報（左下）"]];
let LABC={};
const LABDEF=()=>{const o={};LABCATS.forEach(([k])=>o[k]=["dim","ang","udim","neko","ubolt","uopen","upipe","bld"].includes(k));return o};
try{const v=localStorage.getItem("pbm_labc");LABC=Object.assign(LABDEF(),v?(JSON.parse(v)||{}):{})}catch(e){LABC=LABDEF()}
const labShow=o=>LABC[o.userData.cat||"other"]!==false;
function applyLabels(){
 if(T){T.grp.traverse(o=>{if(o.userData&&o.userData.lab)o.visible=labShow(o);else if(o.userData&&o.userData.dimcat)o.visible=LABC[o.userData.dimcat]!==false});T.dirty=true}
 const any=LABCATS.some(([k])=>LABC[k]!==false);
 $("#labBtn").style.opacity=any?1:.55;renderInfo();
 try{localStorage.setItem("pbm_labc",JSON.stringify(LABC))}catch(e){}
}
function renderLabSheet(){
 const box=$("#labList");box.innerHTML="";
 LABCATS.forEach(([k,n])=>{
  const on=LABC[k]!==false,r=document.createElement("div");r.className="labrow";
  r.innerHTML=`<span>${n[0]==="@"?NI(n.slice(1,n.indexOf("|")))+n.slice(n.indexOf("|")+1):n}</span><button class="lsw${on?" on":""}">${on?"表示":"非表示"}</button>`;
  r.querySelector("button").onclick=()=>{LABC[k]=!on;applyLabels();renderLabSheet()};
  box.appendChild(r);
 });
}
$("#labBtn").onclick=()=>{renderLabSheet();$("#labOv").classList.add("on")};
[...$("#unitSw").children].forEach(b=>{b.classList.toggle("on",b.dataset.v===UNIT);b.onclick=()=>{if(b.dataset.v!==UNIT)setUnitLang(b.dataset.v,null)}});
[...$("#langSw").children].forEach(b=>{b.classList.toggle("on",b.dataset.v===LANG);b.onclick=()=>{if(b.dataset.v!==LANG)setUnitLang(null,b.dataset.v)}});
$("#closeLab").onclick=()=>$("#labOv").classList.remove("on");
$("#labOv").addEventListener("click",e=>{if(e.target.id==="labOv")$("#labOv").classList.remove("on")});
$("#labAll").onclick=()=>{LABCATS.forEach(([k])=>LABC[k]=true);applyLabels();renderLabSheet()};
$("#labDef").onclick=()=>{LABC=LABDEF();applyLabels();renderLabSheet()};
$("#labNone").onclick=()=>{LABCATS.forEach(([k])=>LABC[k]=false);applyLabels();renderLabSheet()};
$("#labBtn").style.opacity=LABCATS.some(([k])=>LABC[k]!==false)?1:.55;
/* 機器の模型 */
const UNIT_LIST=[["","なし","u_none"],["out","室外機","u_out"],["cas","4方向","u_cas"],["cas2","2方向","u_cas2"],["ceil","天吊","u_ceil"],["wall","壁掛け","u_wall"],["flr","床置き","u_flr"]];
function unitRefresh(){if(T){build3D();fitT(true)}}
/* メーカー機種を選んだら、その機種の配管サイズ（ガス・液）を配管に合わせる */
function applyModelPipe(slot,key){
 const m=CAS2M[key];if(!m||!m.g||!m.l)return;
 const idx=v=>{v=parseFloat(v);let b=-1,bd=0.3;SIZES.forEach((z,i)=>{const d=Math.abs(z[1]-v);if(d<bd){bd=d;b=i}});return b};
 const gi=idx(m.g),li=idx(m.l);if(gi<0||li<0)return;
 const g=slot==="s"||slot==="e"?"m":slot.slice(1),o=g==="m"?st:legObj(g);if(!o)return;
 const liq=drawnKind()==="液";o.s=liq?li:gi;o.ps=liq?gi:li;
 if(g===leg)$("#sz").value=o.s;try{renderLegBar()}catch(e){}upd();
 toast("配管サイズを機種に合わせました（"+(liq?"液 ":"ガス ")+SIZES[o.s][0]+"）");
}
const cas2Grp=m=>!m?"cas2":m.bi?"bi":m.kind==="4方向"?"cas":m.kind==="1方向"?"one":"cas2";
function unitGrp(k){const u=st.units[k];return u==="cas2"?cas2Grp(CAS2M[st.units["m"+k]]):u}
function renderUnitSheet(){
 const nop=!!st.nopipe;$("#uTtl").textContent=nop?"❄️ 室内機を選ぶ":"🏠 機器の模型";$("#uDone").style.display=nop?"":"none";$("#uOn").style.display=nop?"none":"";
 [...$("#uOn").children].forEach(b=>b.classList.toggle("on",(b.dataset.v==="1")===st.units.on));
 const mb=$("#uMk");mb.innerHTML="";
 MAKERS.forEach(([v,n,sd])=>{const b=document.createElement("button");b.className="ubtn"+(st.units.mk===v?" on":"");
  b.innerHTML=n+'<small style="font-weight:600;opacity:.75">配管 '+sideName(sd*(st.units.flip?-1:1))+'</small>';
  b.onclick=()=>{st.units.mk=v;save();renderUnitSheet();unitRefresh()};mb.appendChild(b)});
 [...$("#uFlip").children].forEach(b=>b.classList.toggle("on",(b.dataset.v==="1")===st.units.flip));
 const mk=MAKERS.find(x=>x[0]===st.units.mk);
 $("#uMkNote").textContent=mk[1]+"の4方向（天カセ）は、冷媒配管の接続口が「"+sideName(mk[2]*(st.units.flip?-1:1))+"」です。メーカーで変わるのは天カセだけで、壁掛けは下の「配管の出る位置」で選びます。左右が実物と合わない時は「左右反転」で直せます。";
const SLOTS=[["s","起点"],...(st.nopipe?[]:brOn()?leaves().map(g=>["L"+g,slotName("L"+g)]):[["e","終点"]])];const SLOTS0=()=>SLOTS.map(z=>z[0]);
 {const mb2=$("#uMkBox"),home=$("#uFlipBox");if(mb2){mb2.dataset.slot="";mb2.style.display="none";if(home)home.parentNode.insertBefore(mb2,home)}
  const anyC=SLOTS0().some(k=>st.units[k]==="cas"||st.units[k]==="cas2");if(home)home.style.display=anyC?"":"none"}
 {const SL=$("#uSlots");SL.innerHTML="";
  SLOTS.forEach(([k,lab])=>{const sec=document.createElement("div");
   sec.innerHTML=`<div class="ctitle">${k==="s"?(st.nopipe?"❄️ 室内機の種類":"🟢 起点（配管の始まり）"):"🔴 "+lab}</div><div class="ugrid" id="u${k}"></div><div id="uO${k}"></div><div id="uW${k}"></div>`;SL.appendChild(sec)});}
  SLOTS.map(([k,lab])=>[k,"#uO"+k,"o"+k,lab]).forEach(([k,q,ok,lab])=>{
  const box=$(q);box.innerHTML="";
  if(st.units[k]==="flr"){
   const ck="c"+k,t3=document.createElement("div");t3.className="ctitle";t3.innerHTML=NI("u_flr")+"床置き：配管をつなぐ位置（"+lab+"）";box.appendChild(t3);
   const g3=document.createElement("div");g3.className="ugrid";
   [["f","裏面（右下）"],["r","右側面（下）"]].forEach(([key,nm])=>{const b=document.createElement("button");b.className="ubtn"+(st.units[ck]===key?" on":"");b.textContent=nm;
    b.onclick=()=>{st.units[ck]=key;save();renderUnitSheet();unitRefresh()};g3.appendChild(b)});
   box.appendChild(g3);
   const n=document.createElement("div");n.className="note";n.textContent="床置き形（目安：幅600×高さ1850×奥行350）。床に置いた形で表示し、地面は機器の下面になります。機種の図面があれば寸法どおりに作れます。";box.appendChild(n);return;
  }
  if(st.units[k]==="ceil"){
   const ck="c"+k,t3=document.createElement("div");t3.className="ctitle";t3.textContent="🔧 天吊：配管をつなぐ位置（"+lab+"）";box.appendChild(t3);
   const g3=document.createElement("div");g3.className="ugrid";
   [["f","裏面（右下）"],["r","右端・裏（サブ）"]].forEach(([key,nm])=>{const b=document.createElement("button");b.className="ubtn"+(st.units[ck]===key?" on":"");b.textContent=nm;
    b.onclick=()=>{st.units[ck]=key;save();renderUnitSheet();unitRefresh()};g3.appendChild(b)});
   box.appendChild(g3);return;
  }
  if(st.units[k]==="cas2"){
   const mk2="m"+k,cur=CAS2M[st.units[mk2]]||CAS2M["56"],grp=cas2Grp(cur),inG=x=>cas2Grp(CAS2M[x])===grp;
   const t3=document.createElement("div");t3.className="ctitle";t3.innerHTML=NI("u_cas2")+(grp==="bi"?"ビルトインの機種":grp==="cas"?"4方向の機種（寸法入り）":grp==="one"?"1方向の機種":"2方向の機種")+"（"+lab+"）";box.appendChild(t3);
   if(grp==="cas"){const bb=document.createElement("button");bb.className="sharebtn";bb.style.cssText="width:100%;margin:0 0 8px";bb.textContent="← メーカー別（大きさは目安）の4方向に戻す";bb.onclick=()=>{st.units[k]="cas";save();renderUnitSheet();unitRefresh()};box.appendChild(bb)}
   const mks=CAS2_MAKERS.filter(([mk])=>CAS2_ORDER.some(x=>inG(x)&&CAS2M[x].mk===mk));
   {const tl=document.createElement("div");tl.style.cssText="font-size:12.5px;color:#64748b;margin:0 0 4px";tl.textContent="① メーカー";box.appendChild(tl)}
   {const tb=document.createElement("div");tb.className="seg";tb.style.marginBottom="8px";
   mks.forEach(([mk,mn])=>{const b=document.createElement("button");b.textContent=mn;if(cur.mk===mk)b.classList.add("on");
    b.onclick=()=>{if(cur.mk===mk)return;st.units[mk2]=CAS2_ORDER.find(x=>inG(x)&&CAS2M[x].mk===mk);applyModelPipe(k,st.units[mk2]);save();renderUnitSheet();unitRefresh()};tb.appendChild(b)});
   box.appendChild(tb)}
   {const tl=document.createElement("div");tl.style.cssText="font-size:12.5px;color:#64748b;margin:0 0 4px";tl.textContent="② 品番";box.appendChild(tl)}
   const g3=document.createElement("div");g3.className="ugrid mdl";
   CAS2_ORDER.filter(x=>inG(x)&&CAS2M[x].mk===cur.mk).forEach(key=>{const m=CAS2M[key],b=document.createElement("button");b.className="ubtn"+(st.units[mk2]===key?" on":"");
    b.innerHTML=m.n.split(" / ").map(t=>"<b"+(t.length>14?' style="font-size:12.5px"':"")+">"+t+"</b>").join("")+'<small>'+m.kind+'<br>ガスφ'+m.g+'・液φ'+m.l+'</small>';
    b.onclick=()=>{st.units[mk2]=key;applyModelPipe(k,key);save();renderUnitSheet();unitRefresh()};g3.appendChild(b)});
   box.appendChild(g3);
   const m=cur,n=document.createElement("div");n.className="note";
   if(m.bi)n.textContent=(CAS2_MAKERS.find(x=>x[0]===m.mk)||["",""])[1]+" "+m.n+"（"+m.kind+"形・"+m.sub+"）　"+m.spec+"。配管ガスφ"+m.g+"・液φ"+m.l+"。外形図（GA-MBZ5022AS）の寸法で作っています。高さの基準（天井高さ）は本体の下面です。左右が逆なら上の「左右反転」で直せます。";
   else n.textContent=(CAS2_MAKERS.find(x=>x[0]===m.mk)||["",""])[1]+" "+m.n+"（天井カセット形 "+m.kind+(m.sub?"・"+m.sub:"")+"）　図面寸法：本体 "+m.L+"×"+m.W+"（天井面から天面まで"+m.top+"）／パネル "+m.pa+"×"+m.pb+"／天井開口 "+(m.oTxt?m.oTxt+"×"+m.oTxt:m.oa+"×"+m.ob)+"／吊りボルト "+m.ba+"×"+m.bb+"／ネコ（吊り金具）は天井面から"+(m.nkTxt||m.nk)+"上／配管 ガスφ"+m.g+"・液φ"+m.l+"・ドレンVP-25（配管とドレンは同じ端面）。左右が逆なら上の「左右反転」で直せます。";
   box.appendChild(n);
   if(m.doc){const db=document.createElement("button");db.className="sharebtn";db.style.cssText="width:100%;margin:8px 0 0;background:#1e40af;color:#fff";db.textContent="📘 据付工事説明書を開く（メーカーのPDF）";db.onclick=()=>{try{window.open(m.doc,"_blank")}catch(e){location.href=m.doc}};box.appendChild(db)}
   {const sb=document.createElement("button");sb.className="sharebtn";sb.style.cssText="width:100%;margin:8px 0 0";sb.textContent="📄 仕様書（PDF）を読む";sb.onclick=()=>openSpecReader();box.appendChild(sb)}
   return;
  }
  if(st.units[k]==="cas"){const mb2=$("#uMkBox");if(mb2&&!box.contains(mb2)&&mb2.dataset.slot!=="done"){box.appendChild(mb2);mb2.style.display="";mb2.dataset.slot="done"}
   const f4=CAS2_ORDER.filter(x=>cas2Grp(CAS2M[x])==="cas");
   if(f4.length){const t4=document.createElement("div");t4.className="ctitle";t4.textContent="📐 寸法入りの4方向の機種（あれば）";box.appendChild(t4);const g4=document.createElement("div");g4.className="ugrid mdl";
    f4.forEach(key=>{const m=CAS2M[key],b=document.createElement("button");b.className="ubtn";b.innerHTML='<small>'+(CAS2_MAKERS.find(x=>x[0]===m.mk)||["",""])[1]+'</small><b>'+m.n+'</b><small>ガスφ'+m.g+'・液φ'+m.l+'</small>';
     b.onclick=()=>{st.units[k]="cas2";st.units["m"+k]=key;applyModelPipe(k,key);save();renderUnitSheet();unitRefresh()};g4.appendChild(b)});box.appendChild(g4)}
   return}
  if(st.units[k]!=="out")return;
  const t=document.createElement("div");t.className="ctitle";t.textContent="🌀 室外機の種類・馬力（"+lab+"）";box.appendChild(t);
  const gr=document.createElement("div");gr.className="ugrid";
  OUT_ORDER.forEach(key=>{const m=OUTM[key],b=document.createElement("button");b.className="ubtn"+(st.units[ok]===key?" on":"");
   b.innerHTML=m.n+'<small style="font-weight:600;opacity:.75">'+m.sub+'</small>';
   b.onclick=()=>{st.units[ok]=key;save();renderUnitSheet();unitRefresh()};gr.appendChild(b)});
  box.appendChild(gr);
  const xk="x"+k,mkey=st.units[ok];
  if(outAllow(mkey).length>1){
   const t2=document.createElement("div");t2.className="ctitle";t2.textContent="🔧 配管をつなぐ位置（"+(OUT_VRV.includes(mkey)?"左下":"右下")+"・"+lab+"）";box.appendChild(t2);
   const g2=document.createElement("div");g2.className="ugrid";
   outAllow(mkey).forEach(key=>{const b=document.createElement("button");b.className="ubtn"+(outExitKey(mkey,st.units[xk])===key?" on":"");b.textContent=OUT_X[key];
    b.onclick=()=>{st.units[xk]=key;save();renderUnitSheet();unitRefresh()};g2.appendChild(b)});
   box.appendChild(g2);
  }
  const n=document.createElement("div");n.className="note";n.textContent=OUT_PKG.includes(mkey)?"大きさは目安です。パッケージの配管は、正面から見て右下から出ます。":mkey==="ghp"?"大きさは目安です。GHPの配管は、正面から見て左下の真正面から出ます。":OUT_VRV.includes(mkey)?"大きさは目安です。ビルマルチの配管は、正面から見て左下から出ます。":"大きさは目安です。配管は、正面から見て右の側面から出ます（ルームエアコンは右側面の外側から後ろ向き・下から100mm上）。";box.appendChild(n);
 });
 SLOTS.map(([k,lab])=>[k,"#uW"+k,"w"+k,lab]).forEach(([k,q,wk,lab])=>{
  const box=$(q);box.innerHTML="";
  if(st.units[k]!=="wall")return;
  const t=document.createElement("div");t.className="ctitle";t.textContent="🧱 壁掛け：配管の出る位置（"+lab+"）";box.appendChild(t);
  const gr=document.createElement("div");gr.className="ugrid";
  WALL_ORDER.forEach(key=>{
   const b=document.createElement("button");b.className="ubtn"+(st.units[wk]===key?" on":"");b.textContent=WALLX[key].n;
   b.onclick=()=>{st.units[wk]=key;save();renderUnitSheet();unitRefresh()};gr.appendChild(b);
  });
  box.appendChild(gr);
 });
 SLOTS.map(([k])=>[k,"#u"+k]).forEach(([k,q])=>{
  const box=$(q);box.innerHTML="";
  const gk=unitGrp(k);
  const UL=[];UNIT_LIST.forEach(z=>{UL.push(z);if(z[0]==="cas2")UL.push(["one","1方向","u_cas2"])});UL.push(["bi","ビルトイン","u_cas2"]);
  UL.forEach(([v,n,ic])=>{
   if(st.nopipe&&(v===""||v==="out"))return;
   const b=document.createElement("button");b.className="ubtn"+(gk===v?" on":"");
   if(v==="bi"||v==="cas2"||v==="one"){b.innerHTML=`<span><img alt="" src="${NICO[ic]}" style="width:30px;height:30px;display:block;margin:0 auto 2px"></span>${n}`;
    b.onclick=()=>{if(gk===v)return;const key=CAS2_ORDER.find(x=>cas2Grp(CAS2M[x])===v);st.units[k]="cas2";st.units["m"+k]=key;st.units.on=true;applyModelPipe(k,key);save();renderUnitSheet();unitRefresh()};box.appendChild(b);return}
   b.innerHTML=`<span><img alt="" src="${NICO[ic]}" style="width:30px;height:30px;display:block;margin:0 auto 2px"></span>${n}`;
   b.onclick=()=>{st.units[k]=v;if(v)st.units.on=true;if(v==="cas2")applyModelPipe(k,st.units["m"+k]||"56");save();renderUnitSheet();unitRefresh()};
   box.appendChild(b);
  });
 });
}
$("#unitBtn").onclick=()=>{renderUnitSheet();$("#unitOv").classList.add("on")};
$("#uDone").onclick=()=>{$("#unitOv").classList.remove("on");toast("室内機を置きました。配管は下のボタンからあとで出せます")};
$("#closeUnit").onclick=()=>$("#unitOv").classList.remove("on");
$("#unitOv").addEventListener("click",e=>{if(e.target.id==="unitOv")$("#unitOv").classList.remove("on")});
$("#uFlip").onclick=e=>{const b=e.target.closest("button");if(!b)return;st.units.flip=b.dataset.v==="1";save();renderUnitSheet();unitRefresh()};
$("#uOn").onclick=e=>{const b=e.target.closest("button");if(!b)return;st.units.on=b.dataset.v==="1";save();renderUnitSheet();unitRefresh()};
const RULER_ICO="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48ZyB0cmFuc2Zvcm09InJvdGF0ZSgtNDAgNTAgNTApIj48cmVjdCB4PSIxNCIgeT0iMzgiIHdpZHRoPSI3MiIgaGVpZ2h0PSIyNCIgcng9IjQiIGZpbGw9IiNmZmYiLz48ZyBzdHJva2U9IiMyNTYzZWIiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIj48bGluZSB4MT0iMjQiIHkxPSIzOCIgeDI9IjI0IiB5Mj0iNTAiLz48bGluZSB4MT0iMzQiIHkxPSIzOCIgeDI9IjM0IiB5Mj0iNDYiLz48bGluZSB4MT0iNDQiIHkxPSIzOCIgeDI9IjQ0IiB5Mj0iNTAiLz48bGluZSB4MT0iNTQiIHkxPSIzOCIgeDI9IjU0IiB5Mj0iNDYiLz48bGluZSB4MT0iNjQiIHkxPSIzOCIgeDI9IjY0IiB5Mj0iNTAiLz48bGluZSB4MT0iNzQiIHkxPSIzOCIgeDI9Ijc0IiB5Mj0iNDYiLz48L2c+PC9nPjwvc3ZnPg==";
const ICO=(src,h)=>`<img alt="" src="${src}" style="height:${h||"1.25em"};width:${h||"1.25em"};vertical-align:-0.28em;margin-right:5px;border-radius:50%">`;
const UI_EYE="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cGF0aCBkPSJNMTYgNTAgUTUwIDIwIDg0IDUwIFE1MCA4MCAxNiA1MCBaIiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iMTIiIGZpbGw9IiMyNTYzZWIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1LjUiIGZpbGw9IiMwYjJhNjYiLz48L3N2Zz4=",UI_EYEOFF="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cGF0aCBkPSJNMTYgNTAgUTUwIDIwIDg0IDUwIFE1MCA4MCAxNiA1MCBaIiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iMTIiIGZpbGw9IiMyNTYzZWIiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1LjUiIGZpbGw9IiMwYjJhNjYiLz48bGluZSB4MT0iMjQiIHkxPSI3NiIgeDI9Ijc2IiB5Mj0iMjQiIHN0cm9rZT0iIzBiNTdkMCIgc3Ryb2tlLXdpZHRoPSIxMSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGxpbmUgeDE9IjI0IiB5MT0iNzYiIHgyPSI3NiIgeTI9IjI0IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iNiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+";
/* 3Dのボタンをまとめて隠す／出す */
$("#uiTog").onclick=()=>{const h=$("#stage").classList.toggle("uihide");$("#uiTog").firstChild.src=h?UI_EYEOFF:UI_EYE;toast(h?"ボタンを隠しました（左下の👁で戻す）":"ボタンを表示しました")};
/* 曲げ向きを「配管の視点」で決める（進む方向を向いて見た図＋ダイヤル） */
let DV=null;
const DVICO={"ceil": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cmVjdCB4PSIxOCIgeT0iMjAiIHdpZHRoPSI2NCIgaGVpZ2h0PSI5IiByeD0iMiIgZmlsbD0iI2UyZThmMCIgc3Ryb2tlPSIjNDc1NTY5IiBzdHJva2Utd2lkdGg9IjIiLz48ZyBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMiI+PGxpbmUgeDE9IjI0IiB5MT0iMjAiIHgyPSIzMCIgeTI9IjE0Ii8+PGxpbmUgeDE9IjM2IiB5MT0iMjAiIHgyPSI0MiIgeTI9IjE0Ii8+PGxpbmUgeDE9IjQ4IiB5MT0iMjAiIHgyPSI1NCIgeTI9IjE0Ii8+PGxpbmUgeDE9IjYwIiB5MT0iMjAiIHgyPSI2NiIgeTI9IjE0Ii8+PGxpbmUgeDE9IjcyIiB5MT0iMjAiIHgyPSI3OCIgeTI9IjE0Ii8+PC9nPjxyZWN0IHg9IjQ1IiB5PSI0NCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjM0IiByeD0iMyIgZmlsbD0iI2ZmZiIvPjxwb2x5Z29uIHBvaW50cz0iNTAsMzIgMzQsNTIgNjYsNTIiIGZpbGw9IiNmZmYiLz48L3N2Zz4=", "floor": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cmVjdCB4PSIxOCIgeT0iNzEiIHdpZHRoPSI2NCIgaGVpZ2h0PSI5IiByeD0iMiIgZmlsbD0iI2Q2YzNhMSIgc3Ryb2tlPSIjN2E1YTJhIiBzdHJva2Utd2lkdGg9IjIiLz48ZyBzdHJva2U9IiNhMzg0NWEiIHN0cm9rZS13aWR0aD0iMiI+PGxpbmUgeDE9IjI0IiB5MT0iODYiIHgyPSIzMCIgeTI9IjgwIi8+PGxpbmUgeDE9IjM2IiB5MT0iODYiIHgyPSI0MiIgeTI9IjgwIi8+PGxpbmUgeDE9IjQ4IiB5MT0iODYiIHgyPSI1NCIgeTI9IjgwIi8+PGxpbmUgeDE9IjYwIiB5MT0iODYiIHgyPSI2NiIgeTI9IjgwIi8+PGxpbmUgeDE9IjcyIiB5MT0iODYiIHgyPSI3OCIgeTI9IjgwIi8+PC9nPjxyZWN0IHg9IjQ1IiB5PSIyMiIgd2lkdGg9IjEwIiBoZWlnaHQ9IjM0IiByeD0iMyIgZmlsbD0iI2ZmZiIvPjxwb2x5Z29uIHBvaW50cz0iNTAsNjggMzQsNDggNjYsNDgiIGZpbGw9IiNmZmYiLz48L3N2Zz4=", "start": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cmVjdCB4PSIyMiIgeT0iMzAiIHdpZHRoPSI0NiIgaGVpZ2h0PSI0MCIgcng9IjUiIGZpbGw9IiNmOGZhZmMiIHN0cm9rZT0iIzQ3NTU2OSIgc3Ryb2tlLXdpZHRoPSIyLjUiLz48Y2lyY2xlIGN4PSI0MCIgY3k9IjUwIiByPSIxMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzM0MTU1IiBzdHJva2Utd2lkdGg9IjMiLz48bGluZSB4MT0iNDAiIHkxPSI0MCIgeDI9IjQwIiB5Mj0iNjAiIHN0cm9rZT0iIzMzNDE1NSIgc3Ryb2tlLXdpZHRoPSIyIi8+PGxpbmUgeDE9IjMwIiB5MT0iNTAiIHgyPSI1MCIgeTI9IjUwIiBzdHJva2U9IiMzMzQxNTUiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjcyIiBjeT0iMzAiIHI9IjEwIiBmaWxsPSIjMTZhMzRhIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMyIvPjxyZWN0IHg9IjY2IiB5PSI1OCIgd2lkdGg9IjIyIiBoZWlnaHQ9IjkiIHJ4PSI0LjUiIGZpbGw9IiM1YTI4MDgiLz48cmVjdCB4PSI2Ny41IiB5PSI1OS41IiB3aWR0aD0iMTkiIGhlaWdodD0iNiIgcng9IjMiIGZpbGw9InVybCgjY3V2KSIvPjwvc3ZnPg==", "prev": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cGF0aCBkPSJNMjQgNzYgVjUyIEExNiAxNiAwIDAgMSA0MCAzNiBINzAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzVhMjgwOCIgc3Ryb2tlLXdpZHRoPSIxMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTI0IDc2IFY1MiBBMTYgMTYgMCAwIDEgNDAgMzYgSDcwIiBmaWxsPSJub25lIiBzdHJva2U9InVybCgjY3UpIiBzdHJva2Utd2lkdGg9IjkiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxwYXRoIGQ9Ik03OCA1OCBBMTYgMTYgMCAxIDEgNjIgNzIiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48cG9seWdvbiBwb2ludHM9IjU2LDY2IDY2LDc4IDcwLDY0IiBmaWxsPSIjZmZmIi8+PC9zdmc+"};
function openDirView(i,opt){
 const rows=LR(),r=rows[i];if(!r||!T)return;
 const wasFull=$("#stage").classList.contains("full");
 DV={i,g:leg,add:!!(opt&&opt.add),pushed:false,orig:{a:r.a,t:r.t,o:r.o},cam:{th:T.th,ph:T.ph,dist:T.dist,tg:T.tg.clone()},wasFull,t:r.a?effT(i,rows):0};
 setFull(true);$("#stage").classList.add("dirmode");
 setTimeout(()=>{build3D();
  const fr=(T.legFr&&T.legFr[DV.g]||[])[DV.i];if(!fr){closeDirView(false);return}
  const D=Math.max(900,T.ext*0.32),to={pos:fr.c.clone().addScaledVector(fr.d,-D).addScaledVector(fr.u,D*0.08),tg:fr.c.clone(),up:fr.u.clone()};
  const from={pos:T.cam.position.clone(),tg:(T.custom?T.custom.tg:T.tg).clone(),up:T.cam.up.clone()};
  flyCam(from,to,1100,()=>{
   if(!DV)return;
   const rr=LR()[DV.i];if(!rr.a){rr.a=90;rr.t=DV.t;rr.o=false}
   if(DV.add&&!DV.pushed){LR().push({l:500,a:0,t:0,o:false});DV.pushed=true}
   build3D();placeDirCam();$("#dirOv").classList.add("on");setupDirLens();drawDial()});
 },80);
}
/* カメラをゆっくり動かす（ふわっと寄っていく） */
let flyH=0;
function flyCam(from,to,ms,done){
 cancelAnimationFrame(flyH);const s0=performance.now();
 const ease=k=>k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;
 const step=()=>{const k=Math.min(1,(performance.now()-s0)/ms),q=ease(k);
  const up=from.up.clone().lerp(to.up,q);if(up.length()<1e-3)up.copy(to.up);up.normalize();
  T.custom={pos:from.pos.clone().lerp(to.pos,q),tg:from.tg.clone().lerp(to.tg,q),up};T.dirty=true;
  if(k<1)flyH=requestAnimationFrame(step);else if(done)done()};
 step();
}
function placeDirCam(){
 const fr=(T.legFr&&T.legFr[DV.g]||[])[DV.i];if(!fr){closeDirView(false);return}
 const D=Math.max(900,T.ext*0.32);
 const pos=fr.c.clone().addScaledVector(fr.d,-D).addScaledVector(fr.u,D*0.08);
 T.custom={pos,tg:fr.c.clone(),up:fr.u.clone()};T.dirty=true;
 T.cam.up.copy(fr.u);T.cam.position.copy(pos);T.cam.lookAt(fr.c);T.cam.updateMatrixWorld();
 const v=fr.c.clone().project(T.cam);DV.cx=(v.x*.5+.5)*T.w;DV.cy=(-v.y*.5+.5)*T.h;
}
function drawDial(){
 const svg=$("#dirSvg"),W=T.w,H=T.h,R=Math.round(Math.min(W*0.27,H*0.22)),cx=clamp(DV.cx,R+70,W-R-70),cy=clamp(DV.cy,R+100,Math.max(R+100,H-R-300));
 DV.R=R;DV.sx=cx;DV.sy=cy;
 svg.setAttribute("width",W);svg.setAttribute("height",H);svg.style.left="0";svg.style.top="0";
 const t=DV.t,pt=(a,rr)=>[cx+rr*Math.sin(a*Math.PI/180),cy-rr*Math.cos(a*Math.PI/180)];
 let h=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="#0c1a331a" stroke="#fff" stroke-width="3"/>`;
 for(let a=0;a<360;a+=15){const big=a%45===0,[x1,y1]=pt(a,R-(big?16:8)),[x2,y2]=pt(a,R);h+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${big?"#ef4444":"#fff"}" stroke-width="${big?4:2}" stroke-linecap="round"/>`}
 ["上","右上","右","右下","下","左下","左","左上"].forEach((n,k)=>{const [x,y]=pt(k*45,R+18);h+=`<text x="${x}" y="${y+5}" text-anchor="middle" font-size="14" font-weight="800" fill="#fff" stroke="#0c1a33" stroke-width="3" paint-order="stroke">${n}</text>`});
 /* 向きの目印：天井・床、起点の方、前の配管が来た方 */
 const FR=(T.legFr&&T.legFr[DV.g])||[],fr=FR[DV.i];
 if(fr){
  const V=THREE.Vector3,ang=v=>{const p=v.clone().addScaledVector(fr.d,-v.dot(fr.d));if(p.length()<1e-3*Math.max(1,v.length()))return null;return normT(Math.atan2(p.dot(fr.r),p.dot(fr.u))*180/Math.PI)};
  const mk=(a,txt,col,ic)=>{if(a===null)return;const [x,y]=pt(a,R+48),[x1,y1]=pt(a,R+2),[x2,y2]=pt(a,R+28);const w=txt.length*13+40;
   h+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="4" stroke-dasharray="4 3"/><rect x="${x-w/2}" y="${y-14}" width="${w}" height="28" rx="14" fill="${col}"/><image href="${DVICO[ic]}" x="${x-w/2+1}" y="${y-13}" width="26" height="26"/><text x="${x-w/2+32}" y="${y+5}" font-size="12.5" font-weight="800" fill="#fff">${txt}</text>`};
  const up=new V(0,1,0);
  if(Math.abs(fr.d.y)<0.95){const a=ang(up);mk(a,"天井","#0284c7","ceil");if(a!==null)mk((a+180)%360,"床・地面","#65a30d","floor")}
  const st0=ang(new V(0,0,0).sub(fr.c));if(st0!==null&&fr.c.length()>1)mk(st0,"起点側","#16a34a","start");
  const pv=FR[DV.i-1],pv2=FR[DV.i-2];
  if(pv&&pv2){const a=ang(pv2.c.clone().sub(pv.c));if(a!==null)mk(a,"前の配管","#ea580c","prev")}
 }
 const [hx,hy]=pt(t,R-4),[ax,ay]=pt(t,R*0.25);
 h+=`<line x1="${ax}" y1="${ay}" x2="${hx}" y2="${hy}" stroke="#ef4444" stroke-width="7" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="8" fill="#fff" stroke="#ef4444" stroke-width="3"/><circle cx="${hx}" cy="${hy}" r="15" fill="#ef4444" stroke="#fff" stroke-width="3"/>`;
 svg.innerHTML=h;
 const r=LR()[DV.i];
 $("#dirTop").innerHTML=`🔍 進む方向を向いて見た図（${legName(DV.g)} ${nm(DV.i)} の曲げ）<br><small>赤い丸を指で回して向きを決めます。色付きの目印（天井・床・起点側・前の配管）を手がかりにしてください</small>`;
 $("#dirVal").innerHTML=`向き <b>${dirName(t)}</b>　／　曲げ角度 <b>${r.a}°${r.a>=180?"（返し）":""}</b>`;
 const ab=$("#dirAngs");ab.innerHTML="";
 [15,30,45,90,180].forEach(a=>{const b=document.createElement("button");b.textContent=a+"°";if(r.a===a){b.classList.add("on");b.style.background=ANGC[a]}
  b.onclick=()=>{r.a=a;applyDV();drawDial()};ab.appendChild(b)});
}
function setupDirLens(){
 const rows=LR(),i=DV.i,r=rows[i],n=rows[i+1];
 $("#dirL1t").textContent=nm(i)+(i>0?" 前回の曲げからの長さ mm":" 起点からの長さ mm");$("#dirL1").value=uVal(r.l);
 const l2=$("#dirL2").parentElement;l2.style.display=n?"":"none";
 if(n){$("#dirL2t").textContent=nm(i+1)+" 曲げた後の長さ mm";$("#dirL2").value=uVal(n.l)}
 const on=(inp,row,re)=>{inp.onfocus=()=>inp.select();inp.oninput=()=>{row.l=Math.max(0,uParse(inp.value)||0);build3D();if(re)placeDirCam();T.dirty=true;drawDial()}};
 on($("#dirL1"),r,true);if(n)on($("#dirL2"),n,false);
}
let dvRAF=0;
function applyDV(){const r=LR()[DV.i];r.t=normT(DV.t);r.o=false;if(!dvRAF)dvRAF=requestAnimationFrame(()=>{dvRAF=0;build3D();T.dirty=true})}
/* 3Dで配管を1回タップ → その行を選んで、リストの一番上に出す（3Dの色も変わる） */
function selectFromTap(sg){
 if(sg.g!==leg){leg=sg.g;}
 if(sg.row>=0)sel=sg.row;
 render();
 const box=$("#rows"),el=box.children[sel];
 if(el)box.scrollTo({top:el.offsetTop-box.children[0].offsetTop,behavior:"smooth"});
}
function closeDirView(ok){
 if(!DV)return;
 const r=LR()[DV.i];
 if(!ok&&r){r.a=DV.orig.a;r.t=DV.orig.t;r.o=DV.orig.o;if(DV.pushed&&LR().length>DV.i+1)LR().pop()}
 if(ok)sel=DV.i;
 const c=DV.cam,wf=DV.wasFull;
 $("#dirOv").classList.remove("on");
 const back={tg:c.tg.clone(),up:new THREE.Vector3(0,1,0),pos:new THREE.Vector3(c.tg.x+c.dist*Math.sin(c.ph)*Math.sin(c.th),c.tg.y+c.dist*Math.cos(c.ph),c.tg.z+c.dist*Math.sin(c.ph)*Math.cos(c.th))};
 const from=T.custom?{pos:T.custom.pos.clone(),tg:T.custom.tg.clone(),up:T.custom.up.clone()}:null;
 DV=null;if(ok)save();render();
 const fin=()=>{T.custom=null;T.th=c.th;T.ph=c.ph;T.dist=c.dist;T.tg.copy(c.tg);$("#stage").classList.remove("dirmode");if(!wf)setFull(false);T.dirty=true};
 if(from)flyCam(from,back,800,fin);else fin();
 if(ok)toast("向きを決めました");
}
(function(){
 const svg=$("#dirSvg");let drag=false;
 const ang=e=>{const rc=$("#stage").getBoundingClientRect(),x=e.clientX-rc.left-DV.sx,y=e.clientY-rc.top-DV.sy;let a=normT(Math.atan2(x,-y)*180/Math.PI);const m=Math.round(a/45)*45;if(Math.abs(a-m)<=6)a=m%360;return a};
 $("#dirOv").addEventListener("pointerdown",e=>{if(!DV||e.target.closest(".dirbot")||e.target.closest(".dirtop"))return;drag=true;try{$("#dirOv").setPointerCapture(e.pointerId)}catch(x){}DV.t=ang(e);applyDV();drawDial()});
 $("#dirOv").addEventListener("pointermove",e=>{if(!drag||!DV)return;DV.t=ang(e);applyDV();drawDial()});
 const end=()=>{drag=false};$("#dirOv").addEventListener("pointerup",end);$("#dirOv").addEventListener("pointercancel",end);
 $("#dirOk").onclick=()=>closeDirView(true);
 $("#dirNo").onclick=()=>closeDirView(false);
})();
/* 曲げ手順（ギアベンダーで曲げる順番に、1つずつ見せる） */
function openGuide(){
 if(!T){toast("3Dが使えません");return}
 const rows=LR(),steps=rows.map((r,j)=>r.a?j:-1).filter(j=>j>=0);
 if(!steps.length){toast("まだ曲げがありません。「➕ 曲げを追加」で曲げを入れてください");return}
 const k=0;   // 毎回1つ目の曲げから（前回の状態は持ち越さない）
 gdBusy=false;["#gdPrev","#gdNext"].forEach(q=>{const b=$(q);if(b)b.disabled=false});setGdMini(true);
 GUIDE={on:true,prog:0,rev:{},g:leg,steps,k,i:steps[k],wasFull:$("#stage").classList.contains("full"),cam:{th:T.th,ph:T.ph,dist:T.dist,tg:T.tg.clone()}};
 setFull(true);$("#stage").classList.add("guidemode");$("#gdOv").classList.add("on");setGdMini(true);
 setTimeout(showGuideStep,80);
}
function showGuideStep(){
 if(!GUIDE)return;
 GUIDE.i=GUIDE.steps[GUIDE.k];sel=GUIDE.i;
 build3D();
 const G=GUIDE.geo||{R:50,Tn:0,D:10,a:90,prev:null},R=G.R;
 T.custom=null;T.tg.set(-G.Tn*0.5,-R*0.3,R*0.6*(DIE_R?-1:1));T.th=DIE_R?-1.95:-1.2;T.ph=0.95;T.dist=R*45;
 T.cam.near=Math.max(1,R*0.03);T.cam.far=Math.max(T.ext*60,R*400);T.cam.updateProjectionMatrix();T.dirty=true;
 const rows=LR(),i=GUIDE.i,c=calc(GUIDE.g).out[i],N=GUIDE.steps.length;
 $("#gdTop").innerHTML=`<img alt="" src="${icoSrc("bender")}" style="width:22px;height:22px;vertical-align:-5px;margin-right:4px">曲げ手順 ${GUIDE.k+1}／${N}：${brOn()?legName(GUIDE.g)+" の ":""}${nm(i)} の曲げ`;
 $("#gdLeg").textContent=(DIE_R?"シューが右・ガイドが左・ハンドルが左端":"シューが左・ガイドが右・ハンドルが右端")+"（台が水平）。赤い輪＝赤いライン（シューの0）、うすいオレンジ＝曲げた後の形";
 drawGuideFront();
 const p=G.prev;let how;
 if(!p)how="1つ目の曲げ：向きは自由。台に置いて曲げるだけ";
 else{
  const el=Math.round(Math.atan2(Math.abs(p.y),Math.abs(p.z))*180/Math.PI),side=(DIE_R?p.z>0:p.z<0)?"ダイス側":"ダイスと反対側",ud=p.y>=0?"上":"下";
  const pn=G.rev?"前の配管（シュー側の先）":"前の配管";how=el<=2?`${pn}は台の上に寝かせる（${side}）`:el>=88?`${pn}は真${ud}に向ける`:`${pn}を台の面から ${ud}へ ${el}°（${side}）`;
 }
 const Dg=SIZES[legSize(GUIDE.g)][1],aa=rows[i].a,back=bR(Dg)*aa/90,fwd=back/2,rv2=!!GUIDE.rev[i];
 $("#gdTxt").innerHTML=`曲げ寸法 <b>${fmt(rows[i].l)}</b>mm<br><small>（${i>0?"前の曲げの角から":"端から"}、この曲げの角まで）</small><br>`+
  `印を赤いライン（シューの0）に合わせて<br>`+(rv2?`<b class="fw">前に出す ${fmt(fwd)}mm</b><small>（逆向き：${bRtxt(Dg)}÷2${aa!==90?"×"+aa+"/90":""}）</small>`:`<b class="bk">バック ${fmt(back)}mm</b><small>（${bRtxt(Dg)}${aa!==90?"×"+aa+"/90":""}）</small>`)+
  `<br>曲げ角度 <b>${aa}°${aa>=180?"（返し）":""}</b> <small>（戻り分 1〜2°多めに）</small><span class="big">${how}</span><small style="color:#94a3b8">シュー位置で印をつける時：前の印から ${fmt(c.shoe)}（端から ${fmt(c.cum)}）</small>`;
 $("#gdBen").innerHTML=`<img alt="" src="${icoSrc("bender")}" style="width:20px;height:20px;vertical-align:-5px;margin-right:4px">ベンダー：${benOn(Dg)?BENDERS[BENDER].n+"（"+bRtxt(Dg)+"）":"⚠️ "+BENDERS[BENDER].n+"は "+szName(Dg)+" 非対応（標準 外径×4で表示）"} ▸`;
 $("#gdDie").textContent="ダイスの位置：後ろから見て "+(DIE_R?"右 ▶（タップで左）":"◀ 左（タップで右）");
 const rv=!!GUIDE.rev[i],gb=$("#gdRev");gb.classList.toggle("on",rv);gb.textContent=rv?"🔄 逆向きで曲げる（ON）":"🔄 逆向きにする（反対から差す）";
 $("#gdH").value=uVal(GUIDE_H);
 const H=GUIDE_H,rr=G.rad||0,hitN=G.minN<-H+rr,hitR=G.minR<-H+rr,w=$("#gdWarn");
 if(hitN||hitR){w.className="gdwarn on "+((rv?hitR:hitN)?"bad":"ok");
  w.textContent=(rv?hitR:hitN)?("⚠️ このままだと床に当たります（約"+fmt(-H+rr-(rv?G.minR:G.minN))+"mm）"+((rv?hitN:hitR)?"。逆にしても当たるので、置き方を工夫してください":"。「🔄 "+(rv?"逆向きをやめる":"逆向き")+"」なら当たりません")):("✅ この置き方なら床に当たりません"+(rv?"（逆向き）":""));}
 else{w.className="gdwarn";w.textContent=""}
 if(!benOn(Dg)){const t0=(hitN||hitR)?" "+w.textContent:"";w.className="gdwarn on bad";w.textContent="⚠️ "+BENDERS[BENDER].n+"は "+szName(Dg)+" に対応していません（計算は標準 外径×4）。"+t0}
 const hitNow=rv?hitR:hitN;
 $("#gdMini").innerHTML=`<span>${nm(i)} 曲げ寸法 ${fmt(rows[i].l)}</span><span class="${rv?"fw":"bk"}">${rv?"前に出す":"バック"} ${fmt(rv?fwd:back)}</span><span>${rows[i].a}°${rows[i].a>=180?"返し":""}</span>${hitNow?'<span class="warn">⚠️床</span>':""}<button class="more" id="gdMore">詳細 ▲</button>`;
 $("#gdMore").onclick=()=>setGdMini(false);
 $("#gdPrev").disabled=GUIDE.k===0;$("#gdNext").textContent=GUIDE.k>=N-1?"✅ 終わり":"次の曲げ ▶";if(!gdBusy)$("#gdNext").disabled=false;
}
function drawGuideFront(){
 const p=GUIDE.geo&&GUIDE.geo.prev,cx=75,cy=78,R=54;
 const pt=(deg,r)=>[cx+r*Math.cos(deg*Math.PI/180),cy-r*Math.sin(deg*Math.PI/180)];
 let h=`<text x="75" y="14" text-anchor="middle" font-size="10.5" font-weight="800" fill="#475569">配管の後ろから見た図</text>`;
 h+=`<path d="M${cx-R} ${cy} A${R} ${R} 0 0 1 ${cx+R} ${cy} A${R} ${R} 0 0 1 ${cx-R} ${cy}" fill="#fff" stroke="#cbd5e1" stroke-width="1.5"/>`;
 for(let a=0;a<360;a+=15){const big=a%45===0,[x1,y1]=pt(a,R-(big?9:5)),[x2,y2]=pt(a,R);h+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${big?"#0f172a":"#94a3b8"}" stroke-width="${big?2:1}"/>`}
 [[0,"0"],[45,"45"],[90,"90"],[135,"45"],[180,"0"],[225,"45"],[270,"90"],[315,"45"]].forEach(([a,t])=>{const [x,y]=pt(a,R-17);h+=`<text x="${x}" y="${y+3.5}" text-anchor="middle" font-size="9" font-weight="700" fill="#64748b">${t}</text>`});
 h+=`<line x1="4" y1="${cy}" x2="146" y2="${cy}" stroke="#2b8be8" stroke-width="4"/><text x="${DIE_R?4:146}" y="${cy+14}" text-anchor="${DIE_R?"start":"end"}" font-size="9.5" font-weight="800" fill="#2b8be8">台の面</text>`;
 const dx=DIE_R?150-12:12,ax=DIE_R?122:28,tip=DIE_R?126:24,bk=DIE_R?117:33,lx=DIE_R?106:44;
 h+=`<rect x="${dx-8}" y="${cy-16}" width="16" height="32" rx="4" fill="#b8c0c8" stroke="#64748b"/><text x="${dx}" y="${cy-20}" text-anchor="middle" font-size="9" font-weight="800" fill="#475569">ダイス</text>`;
 h+=`<line x1="${cx}" y1="${cy}" x2="${ax}" y2="${cy}" stroke="#16a34a" stroke-width="3"/><polygon points="${tip},${cy} ${bk},${cy-5} ${bk},${cy+5}" fill="#16a34a"/><text x="${lx}" y="${cy+14}" text-anchor="middle" font-size="9" font-weight="800" fill="#16a34a">曲がる</text>`;
 if(p){const a=Math.atan2(p.y,p.z)*180/Math.PI,[x,y]=pt(a,R-4);
  h+=`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#ea580c" stroke-width="6" stroke-linecap="round"/><circle cx="${x}" cy="${y}" r="6" fill="#ea580c" stroke="#fff" stroke-width="2"/>`;
  const el=Math.round(Math.atan2(Math.abs(p.y),Math.abs(p.z))*180/Math.PI),[lx,ly]=pt(a,R+0);
  h+=`<text x="${cx}" y="${cy+R+16}" text-anchor="middle" font-size="10" font-weight="800" fill="#ea580c">前の配管 ${el}°</text>`;
 }
 h+=`<circle cx="${cx}" cy="${cy}" r="9" fill="#e08a3c" stroke="#7a3a0e" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="4" fill="#3b1a06"/>`;
 $("#gdFront").innerHTML=h;
}
function setGdMini(m){$("#gdBot").classList.toggle("mini",m)}
(function(){const g=$("#gdGrab"),bot=$("#gdBot");let sy=null;
 g.addEventListener("pointerdown",e=>{sy=e.clientY});
 g.addEventListener("pointerup",e=>{if(sy===null)return;const dy=e.clientY-sy;sy=null;if(dy>25)setGdMini(true);else if(dy<-25)setGdMini(false);else setGdMini(!bot.classList.contains("mini"))});
 bot.addEventListener("touchstart",e=>{bot._y=e.touches[0].clientY},{passive:true});
 bot.addEventListener("touchend",e=>{if(bot._y==null)return;const dy=e.changedTouches[0].clientY-bot._y;bot._y=null;if(dy>60)setGdMini(true);else if(dy<-60)setGdMini(false)},{passive:true});
})();
function closeGuide(){
 if(!GUIDE)return;const c=GUIDE.cam,wf=GUIDE.wasFull;GUIDE=null;gdBusy=false;["#gdPrev","#gdNext"].forEach(q=>{const b=$(q);if(b)b.disabled=false});
 $("#gdOv").classList.remove("on");$("#stage").classList.remove("guidemode");
 build3D();T.th=c.th;T.ph=c.ph;T.dist=c.dist;T.tg.copy(c.tg);fitT(true);
 if(!wf)setFull(false);render();
}
$("#gdPrev").onclick=()=>{if(GUIDE&&!gdBusy&&GUIDE.k>0){GUIDE.prog=0;GUIDE.k--;showGuideStep()}};
/* 次の曲げへ：今の曲げを動画みたいに曲げてから、配管を次の向きに持ち替える */
let gdBusy=false;
function animGuideNext(){
 if(!GUIDE||gdBusy)return;gdBusy=true;
 const btns=[$("#gdPrev"),$("#gdNext")];btns.forEach(b=>b.disabled=true);
 const s0=performance.now(),MS=1400,last=GUIDE.k>=GUIDE.steps.length-1;
 const ease=k=>k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
 const bend=()=>{if(!GUIDE){gdBusy=false;return}
  const k=Math.min(1,(performance.now()-s0)/MS);GUIDE.prog=Math.max(0.001,ease(k));build3D();T.dirty=true;
  if(k<1){requestAnimationFrame(bend);return}
  if(last){setTimeout(()=>{gdBusy=false;GUIDE.prog=0;closeGuide()},700);return}
  // 持ち替え：配管だけ次の曲げの向きへ回す（ベンダーは動かさない）
  const q0=T.grp.quaternion.clone(),p0=T.grp.position.clone();
  GUIDE.prog=0;GUIDE.k++;showGuideStep();
  const q1=T.grp.quaternion.clone(),p1=T.grp.position.clone(),t0=performance.now();
  T.grp.quaternion.copy(q0);T.grp.position.copy(p0);
  const turn=()=>{if(!GUIDE){gdBusy=false;return}const k2=Math.min(1,(performance.now()-t0)/900),q=ease(k2);
   T.grp.quaternion.copy(q0).slerp(q1,q);T.grp.position.copy(p0).lerp(p1,q);T.dirty=true;
   if(k2<1)requestAnimationFrame(turn);else{gdBusy=false;$("#gdPrev").disabled=GUIDE.k===0;$("#gdNext").disabled=false}};
  setTimeout(()=>requestAnimationFrame(turn),250);
 };
 requestAnimationFrame(bend);
}
$("#gdNext").onclick=animGuideNext;
$("#gdEnd").onclick=closeGuide;
$("#gdRev").onclick=()=>{if(!GUIDE||gdBusy)return;GUIDE.rev[GUIDE.i]=!GUIDE.rev[GUIDE.i];showGuideStep()};
$("#gdH").onfocus=e=>e.target.select();
$("#gdH").onchange=()=>{const v=uParse($("#gdH").value);if(v>0){GUIDE_H=Math.min(3000,v);try{localStorage.setItem("pbm_bh",String(GUIDE_H))}catch(e){}if(GUIDE)showGuideStep()}};
function benChanged(){try{localStorage.setItem("pbm_bender",BENDER);localStorage.setItem("pbm_myR",JSON.stringify(MYR))}catch(e){}try{upd()}catch(e){}if(T){try{build3D();T.dirty=true}catch(e){}}if(GUIDE)showGuideStep()}
function renderBenSheet(){
 $("#benTtl").innerHTML=`<img alt="" src="${icoSrc("bender")}" style="width:26px;height:26px;vertical-align:-7px;margin-right:6px">使うベンダー`;
 const L=$("#benList");L.innerHTML="";
 Object.keys(BENDERS).forEach(k=>{const b=BENDERS[k],e=document.createElement("button");e.className="ubtn";
  e.style.cssText="width:100%;height:54px;margin-bottom:6px;flex-direction:column;align-items:flex-start;justify-content:center;padding:0 14px;font-size:14.5px"+(BENDER===k?";background:#2563eb;color:#fff;border-color:#2563eb":"");
  e.innerHTML=b.n+'<small style="font-weight:600;opacity:.8">'+b.sub+'</small>';e.onclick=()=>{BENDER=k;benChanged();renderBenSheet()};L.appendChild(e)});
 const T2=$("#benTbl");let h='<div class="ctitle" style="margin-top:10px">サイズごとの曲げ半径R・90°のバック（mm）</div><table style="width:100%;border-collapse:collapse;font-size:14px">';
 h+='<tr style="color:#64748b;font-size:12px"><td>サイズ</td><td>R</td><td style="text-align:right">バック90°</td><td style="text-align:right">45°</td></tr>';
 SIZES.forEach(([n,D])=>{const r=bR(D),my=BENDER==="my";
  if(!my&&!benOn(D)){h+=`<tr style="border-top:1px solid #e2e8f0;color:#94a3b8"><td style="padding:7px 0">${n}</td><td colspan="3" style="font-size:12px">対応外（このベンダーでは曲げられない）</td></tr>`;return}
  h+=`<tr style="border-top:1px solid #e2e8f0"><td style="padding:7px 0">${n}</td><td>${my?`<input data-d="${D}" inputmode="decimal" value="${MYR[String(D)]||""}" placeholder="${fmt(4*D)}" style="width:76px;height:34px;border:1.5px solid #cbd5e1;border-radius:9px;padding:0 8px;font-size:15px">`:fmt(r)+(BENDERS[BENDER].R[String(D)]?"":'<small style="color:#94a3b8">（4D）</small>')}</td><td style="text-align:right;font-weight:800">${fmt(r)}</td><td style="text-align:right">${fmt(r/2)}</td></tr>`});
 T2.innerHTML=h+'</table>';
 T2.querySelectorAll("input").forEach(i=>{i.onfocus=()=>i.select();i.onchange=()=>{const v=parseFloat(i.value);if(v>0)MYR[i.dataset.d]=Math.min(2000,v);else delete MYR[i.dataset.d];benChanged();renderBenSheet()}});
}
function openBenSheet(){renderBenSheet();$("#benOv").classList.add("on")}
$("#gdBen").onclick=openBenSheet;
$("#closeBen").onclick=()=>$("#benOv").classList.remove("on");
$("#benOv").addEventListener("click",e=>{if(e.target.id==="benOv")$("#benOv").classList.remove("on")});
$("#gdDie").onclick=()=>{DIE_R=!DIE_R;try{localStorage.setItem("pbm_die",DIE_R?"R":"L")}catch(e){}showGuideStep()};
/* 3Dの配管を2回タップ → 吹き出しメニュー */
function pickLeg(cx,cy){
 if(!T||!T.segs||!T.segs.length||!T.w)return null;
 const cv=$("#cv"),r=cv.getBoundingClientRect(),px=cx-r.left,py=cy-r.top;
 T.cam.updateMatrixWorld();
 const sc=p=>{const v=p.clone().project(T.cam);return v.z>1?null:[(v.x*.5+.5)*T.w,(-v.y*.5+.5)*T.h]};
 let best=null,bd=1e9;
 T.segs.forEach(sg=>{
  const a=sc(sg.a),b=sc(sg.b);if(!a||!b)return;
  const dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy;
  let t=L2<1e-6?0:((px-a[0])*dx+(py-a[1])*dy)/L2;t=Math.max(0,Math.min(1,t));
  const d=Math.hypot(px-(a[0]+dx*t),py-(a[1]+dy*t));
  if(d<bd){bd=d;best=sg}
 });
 return bd<=26?best:null;
}
const closePMenu=()=>$("#pmenu").classList.remove("on");
function placeMenu(html,cx,cy,act){
 const m=$("#pmenu"),stg=$("#stage").getBoundingClientRect();
 m.innerHTML=html+'<div class="tail"></div>';m.classList.add("on");m.style.maxHeight=Math.max(160,stg.height-16)+"px";m.style.overflowY="auto";m.scrollTop=0;
 const W=stg.width,H=stg.height,mw=218,mh=m.offsetHeight||190,x=cx-stg.left,y=cy-stg.top,big=mh>H-60;
 const left=Math.max(8,Math.min(W-mw-8,x-mw/2));
 const up=!big&&y>mh+30,top=big?8:up?y-mh-14:Math.min(H-mh-8,y+14);
 m.style.left=left+"px";m.style.top=Math.max(8,top)+"px";
 const tl=m.querySelector(".tail");tl.style.left=Math.max(14,Math.min(mw-30,x-left-8))+"px";
 tl.style.display=big?"none":"";
 if(big){const mo=document.createElement("div");mo.className="pmore";mo.textContent="▼ 下にもあります";m.appendChild(mo);m.onscroll=()=>{mo.style.opacity=m.scrollTop+m.clientHeight>=m.scrollHeight-8?0:1}}else m.onscroll=null;if(up)tl.style.bottom="-7px";else tl.style.top="-7px";
 m.onclick=e=>{if(e.target.closest(".pt")&&!e.target.closest(".pt2")){closePMenu();openTable();return}const b=e.target.closest("button");if(!b)return;closePMenu();act(b.dataset.a)};
}
const ALLROW='<button class="pm" data-a="tbl">📋 長さと配管サイズの表</button><div class="pr"><button class="pm" data-a="all">👁 配管 全表示</button><button class="pm" data-a="none">🙈 全非表示</button></div>';
function openPMenu(sg,cx,cy){
 const g=sg.g,col=legColor(g);
 leg=g;if(sg.row>=0)sel=sg.row;render();
 placeMenu(`<div class="pt"><i style="background:${col}"></i>${legName(g)}　${SIZES[legSize(g)][0]}</div>
  <button class="pm" data-a="solo">👁 この配管だけ表示</button>
  <button class="pm red" data-a="hide">🙈 この配管を非表示</button>
  <button class="pm" data-a="ght">📏 この配管の高さを指定</button>`+ALLROW,cx,cy,a=>{
  if(a==="tbl"){openTable();return}
  if(a==="ght"){const G=st.gnd;G.on=true;G.mode="pipe";G.g=g;G.r=Math.max(0,sg.row);gndChanged();openGndSheet();setTimeout(()=>{const i=$("#gndBody input");if(i)i.focus()},250);return}
  if(a==="solo"){HID.clear();legIds().forEach(x=>{if(x!==g)HID.add(x)});renderLegBar();if(T){build3D();T.dirty=true}toast(legName(g)+" だけ表示しています")}
  else if(a==="hide")toggleHide(g);
  else setAllHid(a==="none");
 });
}
function openEmptyMenu(cx,cy){
 const on=st.units.on;
 placeMenu(`<div class="pt">⚙️ 表示の設定</div>
  <button class="pm${on?" red":""}" data-a="unit">${on?"🙈 機器の模型を隠す":"👁 機器の模型を表示"}</button>
  <div class="pr"><button class="pm${st.gnd.on?" red":""}" data-a="gnd">${st.gnd.on?"🙈 地面を隠す":"👁 地面を表示"}</button><button class="pm" data-a="gset">📐 地面の高さ</button></div>
  <div class="pr"><button class="pm${st.gnd.c?" red":""}" data-a="ceil">${st.gnd.c?"🙈 天井を隠す":NI("ceilh")+"天井を表示"}</button><button class="pm" data-a="cset">${NI("ceilh")}天井の高さ</button></div>
${APP==="zumen"?`  <div class="pt pt2" style="margin-top:10px;font-size:13px">🧱 ここに置く（建物・障害物）</div>
  <div class="pr"><button class="pm" data-a="b_col">🏛 柱</button><button class="pm" data-a="b_wall">🧱 壁</button></div>
  <div class="pr"><button class="pm" data-a="b_beam">🟫 梁</button><button class="pm" data-a="b_box">📦 障害物</button></div>
  <button class="pm" data-a="b_ind">❄️ 室内機（複数置けます）</button>
  <button class="pm" data-a="scan">${typeof SCAN!=="undefined"&&SCAN&&SCAN.obj?"📡 部屋のスキャン（位置合わせ・表示）":"📡 部屋のスキャンを読み込む"}</button>${st.bld&&st.bld.length?`<button class="pm${st.bldHide?"":" red"}" data-a="bhide">${st.bldHide?"👁 建物・障害物を表示":"🙈 建物・障害物を隠す"}（${st.bld.length}）</button>`:""}
  <button class="pm" data-a="route">🧭 ルートおまかせ（始点と終点から）</button>
  <button class="pm" data-a="plan"><img alt="" src="${NICO.plan}" style="width:1.45em;height:1.45em;vertical-align:-0.4em;margin-right:4px">図面を読み込む・なぞる</button>${typeof PLAN!=="undefined"&&PLAN&&PLAN.map?`<button class="pm${PLAN.show?" red":""}" data-a="plan3d">${PLAN.show?"🙈 図面と壁を3Dで隠す":"👁 図面と壁を3Dで表示"}</button>`:""}
`:`${st.bld&&st.bld.length?`<button class="pm${st.bldHide?"":" red"}" data-a="bhide">${st.bldHide?"👁 建物・障害物を表示":"🙈 建物・障害物を隠す"}（${st.bld.length}）</button>`:""}`}  <button class="pm" data-a="ben"><img alt="" src="${icoSrc("bender")}" style="width:1.45em;height:1.45em;vertical-align:-0.4em;margin-right:4px">ベンダー：${BENDERS[BENDER].n}</button>
  <button class="pm${LABC.neko!==false?" red":""}" data-a="neko">${LABC.neko!==false?"🙈 ネコの高さを隠す":NI("neko")+"ネコ（吊り金具）の高さを表示"}</button>`+ALLROW,cx,cy,a=>{
  if(a==="tbl"){openTable();return}
  if(a==="unit"){st.units.on=!on;save();unitRefresh();toast(st.units.on?"機器の模型を表示しました":"機器の模型を隠しました")}
  else if(a==="gnd"){st.gnd.on=!st.gnd.on;save();unitRefresh();toast(st.gnd.on?"地面を表示しました":"地面を隠しました")}
  else if(a==="gset")openGndSheet();
  else if(a==="ceil"){st.gnd.c=!st.gnd.c;save();unitRefresh();toast(st.gnd.c?"天井を表示しました":"天井を隠しました")}
  else if(a==="cset"){st.gnd.c=true;gndChanged();openGndSheet();setTimeout(()=>{const i=$("#ceilH");if(i){i.scrollIntoView({block:"center"});i.focus()}},250)}
  else if(a==="ben")openBenSheet();
  else if(a==="plan")openDraw();
  else if(a==="route")openRoute();
  else if(a.startsWith("b_"))bldAddAt(a.slice(2),cx,cy);
  else if(a==="scan")openScan();
  else if(a==="bhide"){st.bldHide=!st.bldHide;save();unitRefresh()}
  else if(a==="plan3d"){PLAN.show=!PLAN.show;unitRefresh()}
  else if(a==="neko"){LABC.neko=LABC.neko===false;applyLabels();toast(LABC.neko?"ネコの高さを表示しました":"ネコの高さを隠しました")}
  else setAllHid(a==="none");
 });
}
(function(){
 const cv=$("#cv");let d0=null,last=null,n=0;
 cv.addEventListener("pointerdown",e=>{n++;d0=n===1?{x:e.clientX,y:e.clientY,t:Date.now()}:null;closePMenu()});
 const up=e=>{
  const was=n;n=Math.max(0,n-1);
  if(was!==1||!d0)return;
  const mv=Math.hypot(e.clientX-d0.x,e.clientY-d0.y),dt=Date.now()-d0.t;d0=null;
  if(mv>10||dt>350){last=null;return}
  const now=Date.now();
  if(last&&now-last.t<380&&Math.hypot(e.clientX-last.x,e.clientY-last.y)<36){
   last=null;if(GUIDE)return;const sg=pickLeg(e.clientX,e.clientY);if(sg)openPMenu(sg,e.clientX,e.clientY);else{const bi=APP==="zumen"?pickBld(e.clientX,e.clientY):-1;if(bi>=0)openBld(bi);else openEmptyMenu(e.clientX,e.clientY)}
  }else{last={x:e.clientX,y:e.clientY,t:now};if(GUIDE)return;const sg=pickLeg(e.clientX,e.clientY);if(sg)selectFromTap(sg)}
 };
 cv.addEventListener("pointerup",up);
 cv.addEventListener("pointercancel",()=>{n=0;d0=null});
})();
/* 左上の文字（寸法の合計・支持の数）：左へスワイプでしまう／▶で出す */
(function(){
 const st0=$("#stage"),tab=$("#infoTab");
 const set=h=>{st0.classList.toggle("infohide",h);try{localStorage.setItem("pbm_info",h?"1":"0")}catch(e){}};
 let sx=null,sy=0,sw=0;
 const down=e=>{sx=e.clientX;sy=e.clientY};
 const up=(e,dir)=>{if(sx===null)return false;const dx=e.clientX-sx,dy=e.clientY-sy;sx=null;
  if(Math.abs(dx)>30&&Math.abs(dx)>Math.abs(dy)*1.2&&(dir<0?dx<0:dx>0)){set(dir<0);sw=Date.now();return true}return false};
 [$("#chip"),$("#supPill")].forEach(el=>{
  el.addEventListener("pointerdown",down);
  el.addEventListener("pointerup",e=>{up(e,-1)});
  el.addEventListener("pointercancel",()=>{sx=null});
  el.addEventListener("click",e=>{if(Date.now()-sw<400){e.stopImmediatePropagation();e.preventDefault()}},true);
 });
 tab.addEventListener("pointerdown",down);
 tab.addEventListener("pointerup",e=>{if(!up(e,1))set(false)});
 try{if(localStorage.getItem("pbm_info")==="1")set(true)}catch(e){}
})();
/* ボタン列：右へスワイプでしまう／◀を左へスワイプ(タップ)で出す */
(function(){
 const tl=$("#tools"),tab=$("#toolsTab");
 const setHide=h=>{tl.classList.toggle("hide",h);tab.classList.toggle("on",h);try{localStorage.setItem("pbm_tools",h?"1":"0")}catch(e){}};
 let sx=null,sy=0,sw=0;
 const down=e=>{sx=e.clientX;sy=e.clientY};
 const up=(e,hide)=>{if(sx===null)return;const dx=e.clientX-sx,dy=e.clientY-sy;sx=null;
  if(Math.abs(dx)>30&&Math.abs(dx)>Math.abs(dy)*1.2){setHide(dx>0?true:false);sw=Date.now();return true}};
 tl.addEventListener("click",e=>{if(Date.now()-sw<400){e.stopPropagation();e.preventDefault()}},true);
 tl.addEventListener("pointerdown",down);
 tl.addEventListener("pointerup",e=>{up(e)});
 tl.addEventListener("pointercancel",()=>{sx=null});
 tab.addEventListener("pointerdown",down);
 tab.addEventListener("pointerup",e=>{if(!up(e))setHide(false)});
 try{if(localStorage.getItem("pbm_tools")==="1")setHide(true)}catch(e){}
})();
/* 使い方（チュートリアル） */
const TICO2={"calc": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cmVjdCB4PSIyNyIgeT0iMTgiIHdpZHRoPSI0NiIgaGVpZ2h0PSI2NCIgcng9IjgiIGZpbGw9IiNmOGZhZmMiIHN0cm9rZT0iIzQ3NTU2OSIgc3Ryb2tlLXdpZHRoPSIyLjUiLz48cmVjdCB4PSIzMyIgeT0iMjQiIHdpZHRoPSIzNCIgaGVpZ2h0PSIxNCIgcng9IjMiIGZpbGw9IiMxZTNhNWYiLz48dGV4dCB4PSI2NCIgeT0iMzUiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EsQXJpYWwiIGZvbnQtd2VpZ2h0PSI4MDAiIGZvbnQtc2l6ZT0iMTAiIGZpbGw9IiM3ZGQzZmMiIHRleHQtYW5jaG9yPSJlbmQiPjRSPC90ZXh0PjxyZWN0IHg9IjMzIiB5PSI0MyIgd2lkdGg9IjkiIGhlaWdodD0iOCIgcng9IjIiIGZpbGw9IiM5NGEzYjgiLz48cmVjdCB4PSI0NSIgeT0iNDMiIHdpZHRoPSI5IiBoZWlnaHQ9IjgiIHJ4PSIyIiBmaWxsPSIjOTRhM2I4Ii8+PHJlY3QgeD0iNTciIHk9IjQzIiB3aWR0aD0iOSIgaGVpZ2h0PSI4IiByeD0iMiIgZmlsbD0iIzk0YTNiOCIvPjxyZWN0IHg9IjMzIiB5PSI1NCIgd2lkdGg9IjkiIGhlaWdodD0iOCIgcng9IjIiIGZpbGw9IiM5NGEzYjgiLz48cmVjdCB4PSI0NSIgeT0iNTQiIHdpZHRoPSI5IiBoZWlnaHQ9IjgiIHJ4PSIyIiBmaWxsPSIjOTRhM2I4Ii8+PHJlY3QgeD0iNTciIHk9IjU0IiB3aWR0aD0iOSIgaGVpZ2h0PSI4IiByeD0iMiIgZmlsbD0iIzk0YTNiOCIvPjxyZWN0IHg9IjMzIiB5PSI2NSIgd2lkdGg9IjkiIGhlaWdodD0iOCIgcng9IjIiIGZpbGw9IiM5NGEzYjgiLz48cmVjdCB4PSI0NSIgeT0iNjUiIHdpZHRoPSI5IiBoZWlnaHQ9IjgiIHJ4PSIyIiBmaWxsPSIjOTRhM2I4Ii8+PHJlY3QgeD0iNTciIHk9IjY1IiB3aWR0aD0iOSIgaGVpZ2h0PSI4IiByeD0iMiIgZmlsbD0iI2Y5NzMxNiIvPjwvc3ZnPg==", "memo": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cmVjdCB4PSIyNiIgeT0iMjIiIHdpZHRoPSI0OCIgaGVpZ2h0PSI2MCIgcng9IjYiIGZpbGw9IiNkNmE1NjUiIHN0cm9rZT0iIzdhNGExYSIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iMzEiIHk9IjI4IiB3aWR0aD0iMzgiIGhlaWdodD0iNTAiIHJ4PSIzIiBmaWxsPSIjZmZmIi8+PHJlY3QgeD0iNDAiIHk9IjE2IiB3aWR0aD0iMjAiIGhlaWdodD0iMTIiIHJ4PSIzIiBmaWxsPSIjOTRhM2I4IiBzdHJva2U9IiM0NzU1NjkiIHN0cm9rZS13aWR0aD0iMiIvPjxnIHN0cm9rZT0iIzI1NjNlYiIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiPjxwYXRoIGQ9Ik0zNSA0MCBsMyAzIGw1IC02Ii8+PHBhdGggZD0iTTM1IDUzIGwzIDMgbDUgLTYiLz48L2c+PGcgc3Ryb2tlPSIjOTRhM2I4IiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCI+PGxpbmUgeDE9IjQ3IiB5MT0iNDAiIHgyPSI2NCIgeTI9IjQwIi8+PGxpbmUgeDE9IjQ3IiB5MT0iNTMiIHgyPSI2NCIgeTI9IjUzIi8+PGxpbmUgeDE9IjM2IiB5MT0iNjYiIHgyPSI2NCIgeTI9IjY2Ii8+PC9nPjwvc3ZnPg==", "help": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48dGV4dCB4PSI1MCIgeT0iNjgiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EsQXJpYWwsc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjkwMCIgZm9udC1zaXplPSI1NCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSI+PzwvdGV4dD48L3N2Zz4=", "offset": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cGF0aCBkPSJNMTQgNjYgSDM0IEw1NiAzOCBIODYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzVhMjgwOCIgc3Ryb2tlLXdpZHRoPSIxMSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTE0IDY2IEgzNCBMNTYgMzggSDg2IiBmaWxsPSJub25lIiBzdHJva2U9InVybCgjY3UpIiBzdHJva2Utd2lkdGg9IjgiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjxnIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyLjUiIGZpbGw9IiNmZmYiPjxsaW5lIHgxPSI3NiIgeTE9IjQ0IiB4Mj0iNzYiIHkyPSI2MiIgc3Ryb2tlLWRhc2hhcnJheT0iMCIvPjxwb2x5Z29uIHBvaW50cz0iNzYsNDIgNzIsNDkgODAsNDkiIHN0cm9rZT0ibm9uZSIvPjxwb2x5Z29uIHBvaW50cz0iNzYsNjQgNzIsNTcgODAsNTciIHN0cm9rZT0ibm9uZSIvPjwvZz48dGV4dCB4PSI4MCIgeT0iNzgiIGZvbnQtZmFtaWx5PSJIZWx2ZXRpY2EsQXJpYWwiIGZvbnQtd2VpZ2h0PSI5MDAiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiNmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuW3rjwvdGV4dD48L3N2Zz4=", "goal": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cmVjdCB4PSIxNCIgeT0iNTIiIHdpZHRoPSI3MiIgaGVpZ2h0PSIxMyIgcng9IjYuNSIgZmlsbD0iIzVhMjgwOCIvPjxyZWN0IHg9IjE1LjUiIHk9IjUzLjUiIHdpZHRoPSI2OSIgaGVpZ2h0PSIxMCIgcng9IjUiIGZpbGw9InVybCgjY3V2KSIvPjxyZWN0IHg9IjE4IiB5PSI1NSIgd2lkdGg9IjYyIiBoZWlnaHQ9IjIuMiIgcng9IjEuMSIgZmlsbD0iI2ZmZjRlMCIgb3BhY2l0eT0iLjgiLz48ZyBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMi41Ij48bGluZSB4MT0iMTgiIHkxPSIzNCIgeDI9IjE4IiB5Mj0iNDgiLz48bGluZSB4MT0iODIiIHkxPSIzNCIgeDI9IjgyIiB5Mj0iNDgiLz48bGluZSB4MT0iMjIiIHkxPSI0MSIgeDI9Ijc4IiB5Mj0iNDEiLz48L2c+PHBvbHlnb24gcG9pbnRzPSIxOCw0MSAyNiwzNyAyNiw0NSIgZmlsbD0iI2ZmZiIvPjxwb2x5Z29uIHBvaW50cz0iODIsNDEgNzQsMzcgNzQsNDUiIGZpbGw9IiNmZmYiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjI4IiByPSI5IiBmaWxsPSIjZmZmIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSIyOCIgcj0iNS41IiBmaWxsPSIjZGMyNjI2Ii8+PGNpcmNsZSBjeD0iNTAiIGN5PSIyOCIgcj0iMiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg=="};
const TICO=Object.assign(TICO2,{"bend": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cGF0aCBkPSJNMzIgNzggVjU0IEExOCAxOCAwIDAgMSA1MCAzNiBINzYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzVhMjgwOCIgc3Ryb2tlLXdpZHRoPSIxNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PHBhdGggZD0iTTMyIDc4IFY1NCBBMTggMTggMCAwIDEgNTAgMzYgSDc2IiBmaWxsPSJub25lIiBzdHJva2U9InVybCgjY3UpIiBzdHJva2Utd2lkdGg9IjEyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNMjguNSA3NiBWNTQgQTIxLjUgMjEuNSAwIDAgMSA1MCAzMi41IEg3NCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmNGUwIiBzdHJva2Utd2lkdGg9IjIuMiIgb3BhY2l0eT0iLjc1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L3N2Zz4=", "size": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIyNyIgZmlsbD0iIzFmMjkzNyIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjI3IiBmaWxsPSJub25lIiBzdHJva2U9IiM0NzU1NjkiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0zMyAzOCBBMjEgMjEgMCAwIDEgNjIgMzAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzZiNzI4MCIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIxNSIgZmlsbD0idXJsKCNjdSkiIHN0cm9rZT0iIzVhMjgwOCIgc3Ryb2tlLXdpZHRoPSIyIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iOSIgZmlsbD0iIzNiMWEwNiIvPjxwYXRoIGQ9Ik00MSA0NSBBMTAgMTAgMCAwIDEgNTAgMzkiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZjRlMCIgc3Ryb2tlLXdpZHRoPSIyIiBvcGFjaXR5PSIuOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PC9zdmc+", "bender": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cGF0aCBkPSJNNDUgNTUgTDgwIDgyIiBzdHJva2U9IiMzMzQxNTUiIHN0cm9rZS13aWR0aD0iOSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTTQ1IDU1IEw4MCA4MiIgc3Ryb2tlPSJ1cmwoI2FnKSIgc3Ryb2tlLXdpZHRoPSI2IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48Y2lyY2xlIGN4PSI0NSIgY3k9IjU1IiByPSIyMSIgZmlsbD0idXJsKCNhZykiIHN0cm9rZT0iIzQ3NTU2OSIgc3Ryb2tlLXdpZHRoPSIzIi8+PGNpcmNsZSBjeD0iNDUiIGN5PSI1NSIgcj0iNSIgZmlsbD0iIzQ3NTU2OSIvPjxwYXRoIGQ9Ik0xNCA3NiBINDUgQTIxIDIxIDAgMCAwIDY2IDU1IFYyMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNWEyODA4IiBzdHJva2Utd2lkdGg9IjExIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNMTQgNzYgSDQ1IEEyMSAyMSAwIDAgMCA2NiA1NSBWMjIiIGZpbGw9Im5vbmUiIHN0cm9rZT0idXJsKCNjdSkiIHN0cm9rZS13aWR0aD0iOCIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+", "tape": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cmVjdCB4PSI2MCIgeT0iNTYiIHdpZHRoPSIyNyIgaGVpZ2h0PSIxMCIgZmlsbD0iI2ZkZTA0NyIgc3Ryb2tlPSIjYTE2MjA3IiBzdHJva2Utd2lkdGg9IjEuNSIvPjxnIHN0cm9rZT0iI2ExNjIwNyIgc3Ryb2tlLXdpZHRoPSIxLjQiPjxsaW5lIHgxPSI2NiIgeTE9IjU2IiB4Mj0iNjYiIHkyPSI2MSIvPjxsaW5lIHgxPSI3MiIgeTE9IjU2IiB4Mj0iNzIiIHkyPSI2MyIvPjxsaW5lIHgxPSI3OCIgeTE9IjU2IiB4Mj0iNzgiIHkyPSI2MSIvPjxsaW5lIHgxPSI4NCIgeTE9IjU2IiB4Mj0iODQiIHkyPSI2MyIvPjwvZz48cmVjdCB4PSI4NSIgeT0iNTMiIHdpZHRoPSI1IiBoZWlnaHQ9IjE2IiByeD0iMS41IiBmaWxsPSIjNjQ3NDhiIi8+PHJlY3QgeD0iMTgiIHk9IjI4IiB3aWR0aD0iNDYiIGhlaWdodD0iNDYiIHJ4PSIxMiIgZmlsbD0iI2ZhY2MxNSIgc3Ryb2tlPSIjYTE2MjA3IiBzdHJva2Utd2lkdGg9IjIuNSIvPjxjaXJjbGUgY3g9IjQxIiBjeT0iNTEiIHI9IjExIiBmaWxsPSIjMWYyOTM3Ii8+PGNpcmNsZSBjeD0iNDEiIGN5PSI1MSIgcj0iNCIgZmlsbD0iIzljYTNhZiIvPjxyZWN0IHg9IjIyIiB5PSIzMSIgd2lkdGg9IjIyIiBoZWlnaHQ9IjUiIHJ4PSIyLjUiIGZpbGw9IiNmZmYiIG9wYWNpdHk9Ii41Ii8+PC9zdmc+", "tap": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cmVjdCB4PSIxMiIgeT0iNjAiIHdpZHRoPSI3NiIgaGVpZ2h0PSIxMiIgcng9IjYiIGZpbGw9IiM1YTI4MDgiLz48cmVjdCB4PSIxMy41IiB5PSI2MS41IiB3aWR0aD0iNzMiIGhlaWdodD0iOSIgcng9IjQuNSIgZmlsbD0idXJsKCNjdXYpIi8+PHBhdGggZD0iTTMwIDYwIEEyMCAyMCAwIDAgMSA3MCA2MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjMiIG9wYWNpdHk9Ii43NSIvPjxwYXRoIGQ9Ik0zOCA2MCBBMTIgMTIgMCAwIDEgNjIgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIzIiBvcGFjaXR5PSIuOSIvPjxyZWN0IHg9IjQ0IiB5PSIyNCIgd2lkdGg9IjEyIiBoZWlnaHQ9IjM2IiByeD0iNiIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjNjQ3NDhiIiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSIzNiIgeT0iMTIiIHdpZHRoPSIzMCIgaGVpZ2h0PSIyNCIgcng9IjkiIGZpbGw9IiNmZmYiIHN0cm9rZT0iIzY0NzQ4YiIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iNDUiIHk9IjI2IiB3aWR0aD0iMTAiIGhlaWdodD0iMTIiIGZpbGw9IiNmZmYiLz48L3N2Zz4=", "send": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48cmFkaWFsR3JhZGllbnQgaWQ9ImciIGN4PSIuMzUiIGN5PSIuMyIgcj0iLjkiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iIzYzYjhmZiIvPjxzdG9wIG9mZnNldD0iLjYiIHN0b3AtY29sb3I9IiMyMDc4ZjAiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiMwYjU3ZDAiLz48L3JhZGlhbEdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iciIgeDE9IjAiIHkxPSIwIiB4Mj0iMCIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2Y4ZmFmYyIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzhiOWJiMCIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJjdSIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2ZmZTFiNSIvPjxzdG9wIG9mZnNldD0iLjUiIHN0b3AtY29sb3I9IiNlODkwM2YiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiM5YTRhMTIiLz48L2xpbmVhckdyYWRpZW50PjxsaW5lYXJHcmFkaWVudCBpZD0iY3V2IiB4MT0iMCIgeTE9IjAiIHgyPSIwIiB5Mj0iMSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjZmZlMWI1Ii8+PHN0b3Agb2Zmc2V0PSIuNSIgc3RvcC1jb2xvcj0iI2U4OTAzZiIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzlhNGExMiIvPjwvbGluZWFyR3JhZGllbnQ+PGxpbmVhckdyYWRpZW50IGlkPSJhZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPjxzdG9wIG9mZnNldD0iMCIgc3RvcC1jb2xvcj0iI2YxZjVmOSIvPjxzdG9wIG9mZnNldD0iMSIgc3RvcC1jb2xvcj0iIzk0YTNiOCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjQ5IiBmaWxsPSJ1cmwoI3IpIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDIiIGZpbGw9InVybCgjZykiLz48ZWxsaXBzZSBjeD0iMzYiIGN5PSIyNSIgcng9IjIyIiByeT0iOSIgZmlsbD0iI2ZmZiIgb3BhY2l0eT0iLjMiIHRyYW5zZm9ybT0icm90YXRlKC0yNSAzNiAyNSkiLz48cGF0aCBkPSJNMjggMjIgSDcyIEExMCAxMCAwIDAgMSA4MiAzMiBWNTYgQTEwIDEwIDAgMCAxIDcyIDY2IEg0NiBMMzIgNzggTDM1IDY2IEgyOCBBMTAgMTAgMCAwIDEgMTggNTYgVjMyIEExMCAxMCAwIDAgMSAyOCAyMiBaIiBmaWxsPSIjZmZmIiBzdHJva2U9IiM5NGEzYjgiIHN0cm9rZS13aWR0aD0iMiIvPjxwYXRoIGQ9Ik0zNCA1NiBWNDYgQTggOCAwIDAgMSA0MiAzOCBINjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzVhMjgwOCIgc3Ryb2tlLXdpZHRoPSI5IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz48cGF0aCBkPSJNMzQgNTYgVjQ2IEE4IDggMCAwIDEgNDIgMzggSDY2IiBmaWxsPSJub25lIiBzdHJva2U9InVybCgjY3UpIiBzdHJva2Utd2lkdGg9IjYiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg=="});
const icoSrc=k=>TICO[k]||(k[0]==="r"&&ROWICO[k.slice(1)])||({view:"#viewBtn",photo:"#photoBtn",unit:"#unitBtn",abc:"#labBtn",band:"#supBtn"}[k]?$({view:"#viewBtn",photo:"#photoBtn",unit:"#unitBtn",abc:"#labBtn",band:"#supBtn"}[k]+" img").src:k==="eye"?UI_EYE:k==="ruler"?RULER_ICO:k==="branch"?BR_ICO:"");
const TI=k=>`<img alt="" src="${icoSrc(k)}" style="width:1.45em;height:1.45em;vertical-align:-0.4em;margin-right:3px">`;
const TUT=[
{i:"bend",t:"冷媒配管の曲げ共有へようこそ",h:`<p>ギアベンダー（<b>4R基準</b>）の曲げ寸法を計算して、<b>3Dで形を確認</b>できるアプリです。</p>
<div class="tbox">{bender}長さと角度を入れる<br>→ {rshoe}シュー位置・{rpull}引きを自動計算<br>→ {view}3Dで確認 → 📤 仲間に送る</div>
<p class="tsub">右下の「次へ」で使い方を見られます（1分くらい）。</p>`},
{i:"size",t:"① 配管サイズを選ぶ",h:`<p>画面左上のプルダウンで、<b>曲げる配管のサイズ</b>を選びます。</p>
<div class="tbox"><span class="tchip">2分 (1/4) ⌄</span><br><small>コイル管（20m）と直管（4m）から選べます</small></div>
<p>右上には <b>合計の長さ／定尺</b> が出ます。定尺を超えるとオレンジ色になります。</p>`},
{i:"bender",t:"② 曲げを入力する",h:`<p>1行が「<b>直管の長さ ＋ そこでの曲げ</b>」です。</p>
<div class="tbox trow"><b>①</b> <span class="tchip">500</span> <span class="tchip red">90°</span> <span class="tchip">↗️</span> 🗑</div>
<ul><li><b>長さ</b>：曲げの角から次の角まで（mm）</li>
<li><b>角度</b>：タップするたび 直管→15°→30°→45°→90°→180° と変わります</li>
<li><b>向き</b>：進む方向から見て、どっちへ曲げるか。ゲージを左右に動かすか、<b>🔍ボタン</b>で配管の視点にしてダイヤルを回して決めます（45°ごとに止まりやすい）</li>
<li>最初は直管だけ。下の「<b>➕ 曲げを追加</b>」で先端を曲げて、その先に直管が足されます（向きを決める画面が開きます）</li><li>行の上の「<b>＋曲げ</b>」で間に追加</li></ul>`},
{i:"tape",t:"③ 計算結果の見方",h:`<div class="tbox" style="text-align:left">{rshoe}<b>シュー</b>：曲げ始めの印をつける位置<br>{rcum}<b>累計</b>：端からの印の位置（続けて印をつける時）<br>{rpull}<b>引き</b>：曲げで縮む長さ<br>{band}<b>支持</b>：その区間の支持の数<br>⚠️ <b>定尺超え</b>：継手が必要な所</div>
<p class="tsub">下の「{bender}曲げ手順」で、ギアベンダーで曲げる順番に1つずつ（印の位置・曲げ角度・前の配管の向き）を確認できます。</p>
<p class="tsub">上の{calc}で「右に300・上に150」のようなずらしの角度と斜め長や「合計を目標に合わせる」計算もできます。</p>`},
{i:"view",t:"④ 3Dで確認する",h:`<ul><li><b>1本指</b>で回転、<b>2本指</b>で拡大・移動</li>
<li>「<b>🧊 3D全画面</b>」で大きく見られます</li></ul>
<div class="tbox" style="text-align:left">右の青い丸ボタン（上から）<br>{view}視点の切り替え（全体が見える位置に戻る）<br>{photo}背景に現場の写真<br>{unit}室内機・室外機の模型<br>{abc}文字の表示の切り替え<br>{band}支持の表示</div>
<p class="tsub">ボタン列は右へスワイプでしまえます。左下の{eye}で全部隠せます。</p>`},
{i:"branch",t:"⑤ 分岐管を使う",h:`<ul><li>曲げ入力の上の「<b>${BRI()}分岐管を追加</b>」で、メインが <b>枝A・枝B</b> に分かれます</li>
<li>タブで配管を切り替え。<b>枝ごとにサイズと曲げ</b>を入れられます</li>
<li>枝の先でさらに分岐できます（何回でも）</li>
<li>タブを<b>2回タップ</b>すると、その配管を3Dで隠せます</li></ul>`},
{i:"tap",t:"⑥ 3Dで2回タップ",h:`<div class="tbox" style="text-align:left"><b>配管を2回タップ</b><br>・この配管だけ表示／隠す<br>・この配管の高さを指定（地面から）<br>・📋 長さと配管サイズの表</div>
<div class="tbox" style="text-align:left"><b>空いている所を2回タップ</b><br>・機器の模型の表示／隠す<br>・地面の表示と高さの設定<br>・配管の全表示／全非表示</div>
<p class="tsub">📋の表は、液管サイズ別の長さが出るので材料の拾いやガスの追加充填に使えます。</p>`},
{i:"send",t:"⑦ 送る・読み込む",h:`<p>右下の緑の <b>📤</b> から：</p>
<ul><li><b>🌐 アプリのURLを送る</b>：このアプリを仲間に教える</li>
<li><b>📋 テキストをコピー</b>：曲げデータをLINEなどに貼って送る</li>
<li><b>📥 貼り付けて読込</b>：もらったテキストを貼ると同じ図が開く</li></ul>
<div class="tbox">📱 <b>ホーム画面に追加</b>すると<br>アプリのように使えます<br><small>Safariの共有ボタン →「ホーム画面に追加」</small></div>
<p class="tsub">この説明は、いつでも上の <b>❓</b> から見られます。</p>`}
];
let tutI=0;
function renderTut(){
 const s=TUT[tutI];
 $("#tutBody").innerHTML=`<div class="ticon"><img alt="" src="${icoSrc(s.i)}" style="width:72px;height:72px"></div><h3 class="ttl">${s.t}</h3>${s.h.replace(/\{(\w+)\}/g,(m,k)=>TI(k))}`;
 $("#tutBody").scrollTop=0;
 $("#tutDots").innerHTML=TUT.map((_,k)=>`<i class="${k===tutI?"on":""}"></i>`).join("");
 $("#tutPrev").style.visibility=tutI?"visible":"hidden";
 $("#tutNext").textContent=tutI===TUT.length-1?"はじめる ✅":"次へ ▶";
}
function openTut(){tutI=0;renderTut();$("#tutOv").classList.add("on")}
function closeTut(){$("#tutOv").classList.remove("on");try{localStorage.setItem("pbm_tut","1")}catch(e){}}
$("#tutNext").onclick=()=>{if(tutI<TUT.length-1){tutI++;renderTut()}else closeTut()};
$("#tutPrev").onclick=()=>{if(tutI>0){tutI--;renderTut()}};
$("#tutSkip").onclick=closeTut;
$("#helpBtn").onclick=openTut;
(function(){let sx=null,sy=0;const el=$("#tutCard");
 el.addEventListener("touchstart",e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY},{passive:true});
 el.addEventListener("touchend",e=>{if(sx===null)return;const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;sx=null;
  if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5){if(dx<0)$("#tutNext").click();else $("#tutPrev").click()}},{passive:true});
})();
try{if(APP==="bend"&&!localStorage.getItem("pbm_tut")&&!location.hash.match(/^#p=/))setTimeout(openTut,400)}catch(e){}

/* 長さと配管サイズの表（材料・ガス充填量用） */
function kindSeg(box,after){
 const sg=document.createElement("div");sg.className="seg";sg.style.marginBottom="8px";
 [["液","💧 液管"],["ガス","💨 ガス管"]].forEach(([k,n])=>{const b=document.createElement("button");b.textContent="曲げているのは "+n;b.className=drawnKind()===k?"on":"";
  b.onclick=()=>{if(drawnKind()===k)return;
   const ids=legIds(),old=ids.map(g=>legLG(g));st.info.kind=k;
   ids.forEach((g,i)=>{const o=g==="m"?st:legObj(g),z=old[i];if(k==="液"){o.s=z.liq;o.ps=z.gas}else{o.s=z.gas;o.ps=z.liq}});
   save();render();after()};sg.appendChild(b)});
 box.appendChild(sg);
}
function renderTable(){
 const box=$("#tblBody");box.innerHTML="";
 kindSeg(box,renderTable);
 const t=document.createElement("table");t.className="tbl";
 t.innerHTML="<tr><th>配管</th><th style='text-align:right'>長さ</th><th>💧 液管</th><th>💨 ガス管</th></tr>";
 let tot=0;const byL={},byG={};
 legIds().forEach(g=>{
  const len=legLen(g),sz=legLG(g);tot+=len;byL[sz.liq]=(byL[sz.liq]||0)+len;byG[sz.gas]=(byG[sz.gas]||0)+len;
  const tr=document.createElement("tr");
  tr.innerHTML=`<td><i class="dot" style="background:${legColor(g)}"></i>${legName(g)}</td><td class="n">${fmtM(len)}</td><td></td><td></td>`;
  tr.children[2].appendChild(szSelect(sz.liq,v=>{setLegKind(g,"液",v);save();render();renderTable()}));
  tr.children[3].appendChild(szSelect(sz.gas,v=>{setLegKind(g,"ガス",v);save();render();renderTable()}));
  t.appendChild(tr);
 });
 const tr=document.createElement("tr");tr.className="tot";tr.innerHTML=`<td>合計（全体）</td><td class="n">${fmtM(tot)}</td><td colspan="2" style="font-size:12px;color:var(--sub)">液管・ガス管 各 ${fmtM(tot)}</td>`;t.appendChild(tr);
 box.appendChild(t);
 const sum=(title,obj)=>{const d=document.createElement("div");d.innerHTML=`<div class="ctitle">${title}</div>`;
  const tb=document.createElement("table");tb.className="tbl";
  Object.keys(obj).map(Number).sort((a,b)=>a-b).forEach(i=>{tb.insertAdjacentHTML("beforeend",`<tr><td>${szN(i)}</td><td class="n">${fmtM(obj[i])}</td><td class="n" style="color:var(--sub)">${fmt(obj[i])}mm</td></tr>`)});
  d.appendChild(tb);box.appendChild(d)};
 sum("💧 液管サイズ別の長さ（追加充填量の計算に）",byL);
 sum("💨 ガス管サイズ別の長さ",byG);
 box.insertAdjacentHTML("beforeend",'<div class="note">長さは各行の長さ（曲げの角から角まで）の合計です。曲げている配管のサイズは上のプルダウンと同じで、もう片方のサイズはここで選べます。</div>');
}
function openTable(){renderTable();$("#tblOv").classList.add("on")}
$("#chip").addEventListener("click",()=>openTable());
$("#chip").style.cursor="pointer";
$("#closeTbl").onclick=()=>$("#tblOv").classList.remove("on");
$("#tblOv").addEventListener("click",e=>{if(e.target.id==="tblOv")$("#tblOv").classList.remove("on")});
/* 支持の集計（バンドのサイズ用） */
let supTab="sum";
function renderSupSum(){
 const box=$("#supSum");box.innerHTML="";
 if(!st.sup.on){box.innerHTML='<div class="note">支持が「隠す」になっています。「表示する」にすると集計が出ます。</div>';return}
 kindSeg(box,()=>{renderSupSum();updSupUI()});
 const ds=legDirs(),t=document.createElement("table");t.className="tbl";
 t.innerHTML="<tr><th>配管</th><th>💧 液管</th><th>💨 ガス管</th><th style='text-align:right'>横</th><th style='text-align:right'>縦</th></tr>";
 let H=0,V=0;const byL={},byG={},byP={};
 const addTo=(o,k,x)=>{o[k]=o[k]||{h:0,v:0};o[k].h+=x.h;o[k].v+=x.v};
 legIds().forEach(g=>{const x=supHV(g,ds),sz=legLG(g);H+=x.h;V+=x.v;addTo(byL,sz.liq,x);addTo(byG,sz.gas,x);addTo(byP,sz.liq+"/"+sz.gas,x);
  t.insertAdjacentHTML("beforeend",`<tr><td><i class="dot" style="background:${legColor(g)}"></i>${legName(g)}</td><td>${szN(sz.liq)}</td><td>${szN(sz.gas)}</td><td class="n">${x.h}</td><td class="n">${x.v}</td></tr>`)});
 t.insertAdjacentHTML("beforeend",`<tr class="tot"><td colspan="3">合計 ${H+V}箇所</td><td class="n">${H}</td><td class="n">${V}</td></tr>`);
 box.appendChild(t);
 box.insertAdjacentHTML("beforeend",'<div class="note">🔴 横の支持（横走り管）／🟣 縦の支持（立て管）。3Dの輪っかも同じ色です。</div>');
 const sec=(title,obj,lab)=>{let h=`<div class="ctitle">${title}</div><table class="tbl"><tr><th>サイズ</th><th style='text-align:right'>横</th><th style='text-align:right'>縦</th></tr>`;
  Object.keys(obj).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(k=>{const x=obj[k];if(x.h||x.v)h+=`<tr><td>${lab(k)}</td><td class="n">${x.h}</td><td class="n">${x.v}</td></tr>`});box.insertAdjacentHTML("beforeend",h+"</table>")};
 sec("🔗 液管とガス管を共吊りする時（組み合わせ別）",byP,k=>{const [a,b]=k.split("/").map(Number);return "💧"+szN(a)+" ＋ 💨"+szN(b)});
 sec("💧 液管サイズ別（別々に吊る時）",byL,k=>szN(+k));
 sec("💨 ガス管サイズ別（別々に吊る時）",byG,k=>szN(+k));
 box.insertAdjacentHTML("beforeend",'<div class="note">縦管＝上下に立ち上がる直管（傾きが約53°より急なもの）。もう片方の配管サイズは「📋 長さと配管サイズ」の表で変えられます。</div>');
}
function showSupTab(){[...$("#supTab").children].forEach(b=>b.classList.toggle("on",b.dataset.v===supTab));$("#supSum").style.display=supTab==="sum"?"":"none";$("#supRule").style.display=supTab==="rule"?"":"none";if(supTab==="sum")renderSupSum()}
$("#supTab").onclick=e=>{const b=e.target.closest("button");if(!b)return;supTab=b.dataset.v;showSupTab()};
/* 地面の設定 */
const GMODES=[["auto","🤖 自動（いちばん低い所が地面）"],["start","🟢 起点の高さで決める"],["unit","🏠 室内機の下面の高さで決める"],["pipe","📏 配管の高さで決める"]];
function openGndSheet(){renderGndSheet();$("#gndOv").classList.add("on")}
function gndChanged(merge){save(merge);if(T){build3D();T.dirty=true}}
function renderGndSheet(){
 const G=st.gnd;
 [...$("#ceilOn").children].forEach(b=>b.classList.toggle("on",(b.dataset.v==="1")===G.c));
 {const i=$("#ceilH");if(document.activeElement!==i)i.value=uVal(G.ch)}
 $("#ceilNote").textContent=UNIT_KEYS.length&&Object.keys(st.units).some(k=>st.units[k]==="cas2")?"メーカー機種（天カセ）がある時（高さの決め方が「自動」）は、天カセの天井面＝天井に合わせて、地面は天井高さぶん下に置きます。ネコの高さは機種ごとの図面の値です。ネコの高さは文字の表示設定か、3Dの何もない所を2回タップでオンオフできます。":"天井は青い半透明で表示します。3Dの何もない所を2回タップ →「📐 天井の高さ」でも変えられます。";
 [...$("#gndOn").children].forEach(b=>b.classList.toggle("on",(b.dataset.v==="1")===G.on));
 const mb=$("#gndMode");mb.innerHTML="";
 GMODES.forEach(([k,n])=>{const b=document.createElement("button");b.className="ubtn";b.style.cssText="width:100%;height:48px;margin-bottom:6px;flex-direction:row;justify-content:flex-start;padding:0 14px;font-size:14.5px"+(G.mode===k?";background:#2563eb;color:#fff;border-color:#2563eb":"");b.textContent=n;
  b.onclick=()=>{G.mode=k;gndChanged();renderGndSheet()};mb.appendChild(b)});
 const bd=$("#gndBody");bd.innerHTML="";
 if(G.mode==="auto"){bd.innerHTML='<div class="note">配管と機器のいちばん低い所を地面にします。室外機を置いている時はこれが便利です。</div>';return}
 if(G.mode==="pipe"){
  if(!legIds().includes(G.g)){G.g=leg;G.r=sel}
  bd.insertAdjacentHTML("beforeend",`<div class="note" style="font-size:14px">📏 基準の配管：<b>${legName(G.g)} の ${nm(Math.min(G.r,legRows(G.g).length-1))}</b>（その直管の真ん中の高さ）<br>3Dで配管を2回タップ →「📏 この配管の高さを指定」で選び直せます。</div>`);
  const b2=document.createElement("button");b2.className="sharebtn";b2.style.cssText="width:100%;margin:0 0 10px";b2.textContent="✏️ いま選んでいる行（"+legName(leg)+" "+nm(sel)+"）にする";
  b2.onclick=()=>{G.g=leg;G.r=sel;gndChanged();renderGndSheet()};bd.appendChild(b2);
 }
 const f=document.createElement("div");f.className="field";
 f.innerHTML=`<label>${G.mode==="start"?"起点（配管の始まり）の地面からの高さ":G.mode==="pipe"?"その配管の地面からの高さ（天井内なら天井高さ−下がり寸法など）":"室内機の下面の地面からの高さ"}（mm）</label><input inputmode="numeric" pattern="[0-9]*" value="${uVal(G.h)}">`;
 const inp=f.querySelector("input");inp.onfocus=()=>inp.select();
 inp.oninput=()=>{const v=uParse(inp.value);if(!isFinite(v))return;G.h=Math.min(50000,v);gndChanged(true)};
 inp.onblur=()=>{inp.value=uVal(G.h)};
 bd.appendChild(f);
 if(G.mode==="unit"){
  const IN=["cas","cas2","ceil","wall","flr"],slots=[["s","起点"],...(brOn()?leaves().map(g=>["L"+g,slotName("L"+g)]):[["e","終点"]])].filter(([k])=>IN.includes(st.units[k]));
  if(!slots.length){bd.insertAdjacentHTML("beforeend",'<div class="note">⚠️ 室内機（天カセ・天吊・壁掛け）がまだありません。🏠 機器の模型で選ぶと使えます。それまでは自動で決めます。</div>');return}
  const cur=slots.some(([k])=>k===G.unit)?G.unit:slots[0][0];
  const t=document.createElement("div");t.className="ctitle";t.textContent="🏠 どの室内機で決める？";bd.appendChild(t);
  const gr=document.createElement("div");gr.className="ugrid";
  slots.forEach(([k,n])=>{const nm=(UNIT_LIST.find(x=>x[0]===st.units[k])||["","",""])[1],b=document.createElement("button");b.className="ubtn"+(cur===k?" on":"");b.innerHTML=n+'<small style="font-weight:600;opacity:.75">'+nm+'</small>';
   b.onclick=()=>{G.unit=k;gndChanged();renderGndSheet()};gr.appendChild(b)});
  bd.appendChild(gr);
  if(!st.units.on)bd.insertAdjacentHTML("beforeend",'<div class="note">⚠️ 機器の模型が「隠す」になっていると、室内機の下面で決められません（自動になります）。</div>');
 }
}
$("#closeGnd").onclick=()=>$("#gndOv").classList.remove("on");
$("#gndOv").addEventListener("click",e=>{if(e.target.id==="gndOv")$("#gndOv").classList.remove("on")});
$("#ceilTtl").innerHTML=NI("ceilh")+"天井";$("#ceilOnB").innerHTML=NI("ceilh","1.3em")+"天井を表示";
$("#ceilOn").onclick=e=>{const b=e.target.closest("button");if(!b)return;st.gnd.c=b.dataset.v==="1";gndChanged();renderGndSheet()};
{const i=$("#ceilH");i.onfocus=()=>i.select();i.oninput=()=>{const v=uParse(i.value);if(!isFinite(v)||v<500)return;st.gnd.ch=Math.min(20000,v);gndChanged(true)};i.onblur=()=>{i.value=uVal(st.gnd.ch)}}
$("#gndOn").onclick=e=>{const b=e.target.closest("button");if(!b)return;st.gnd.on=b.dataset.v==="1";gndChanged();renderGndSheet()};
/* 支持 */
const SUPF=[["t1","この長さ以下は、支持なし"],["t2","この長さ以下は、中央に1箇所"],["t3","この長さ以下は、両端に2箇所"],["t4","この長さ以下は、両端＋中央に1箇所"],["off","両端の支持の位置（曲げの端から）"],["gap","支持の間隔の上限（これ以上あけない。超える分は自動で追加）"]];
function supCnt(){$("#supCnt").textContent=st.sup.on?"合計 "+supSummary().replace(/^計/,""):""}
function supChanged(){save();upd();supCnt()}
function renderSupSheet(){
 [...$("#supOn").children].forEach(b=>b.classList.toggle("on",(b.dataset.v==="1")===st.sup.on));
 const box=$("#supFields");box.innerHTML="";
 [["","🔴 横走り管（横の支持）"],["v","🟣 立て管・縦管（縦の支持）"]].forEach(([P,title])=>{
 box.insertAdjacentHTML("beforeend",`<div class="ctitle" style="margin-top:8px">${title}</div>`);
 SUPF.forEach(([k0,lab])=>{const k=P+k0;
  const f=document.createElement("div");f.className="field";
  f.innerHTML=`<label>${lab}（mm）</label><input inputmode="numeric" pattern="[0-9]*" value="${uVal(st.sup[k])}">`;
  const inp=f.querySelector("input");
  inp.onfocus=()=>inp.select();
  inp.oninput=()=>{const v=uParse(inp.value);if(!isFinite(v))return;st.sup[k]=Math.min(20000,v);save(true);upd();supCnt()};
  inp.onblur=()=>{inp.value=uVal(st.sup[k])};
  box.appendChild(f);
 });
 });
 supCnt();showSupTab();
}
$("#supBtn").onclick=()=>{st.sup.on=!st.sup.on;save();upd();toast(st.sup.on?"🔩 支持を表示":"🔩 支持を隠す")};
$("#supPill").onclick=()=>{renderSupSheet();$("#supOv").classList.add("on")};
$("#closeSup").onclick=()=>$("#supOv").classList.remove("on");
$("#supOv").addEventListener("click",e=>{if(e.target.id==="supOv")$("#supOv").classList.remove("on")});
$("#supOn").onclick=e=>{const b=e.target.closest("button");if(!b)return;st.sup.on=b.dataset.v==="1";supChanged();renderSupSheet()};
$("#supReset").onclick=()=>{st.sup={...SUPD};supChanged();renderSupSheet()};
/* 背景写真 */
const PH_KEY="pbm_photo",PO_KEY="pbm_photo_op";
function showPhoto(url,op){
 const pv=$("#photoPrev"),pm=$("#photoMsg");
 if(url){pv.src=url;pv.style.display="block";pm.textContent="✅ 背景に使っています"}
 else{pv.style.display="none";pv.removeAttribute("src");pm.textContent="写真はまだありません"}
 const b=$("#photoBg");
 if(url){b.style.backgroundImage='url("'+url+'")';b.style.display="block";b.style.opacity=op/100}
 else{b.style.display="none";b.style.backgroundImage=""}
}
(function(){
 let u=null,o=85;
 try{u=localStorage.getItem(PH_KEY);o=+localStorage.getItem(PO_KEY)||85}catch(e){}
 $("#photoOp").value=o;showPhoto(u,o);
})();
$("#photoBtn").onclick=()=>$("#photoOv").classList.add("on");
/* AR（iPhoneのARクイックルック）：今の3D（配管・機器）をUSDZにして、カメラ越しに実物大で置く。
   床（地面の設定があればその高さ）を一番下にするので、天井の機器は床から設定の高さに浮いて見える */
$("#arBtn").innerHTML=`<img alt="" src="${NICO.ar}" style="width:100%;height:100%;display:block;pointer-events:none">`;
const CRC_T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC_T[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
/* parts=[{col:[r,g,b],op,pos:[x,y,z,...](m),nrm:[...]|null,idx:[...]}] → USDZ（無圧縮zip・64バイト境界） */
function makeUSDZ(parts){
 const f=v=>(Math.round(v*10000)/10000).toString();
 let mats="",meshes="";
 parts.forEach((p,i)=>{
  mats+=`  def Material "M${i}"\n  {\n   token outputs:surface.connect = </Root/Materials/M${i}/S.outputs:surface>\n   def Shader "S"\n   {\n    uniform token info:id = "UsdPreviewSurface"\n    color3f inputs:diffuseColor = (${f(p.col[0])}, ${f(p.col[1])}, ${f(p.col[2])})\n    float inputs:roughness = 0.55\n    float inputs:metallic = ${p.metal?0.4:0}\n    float inputs:opacity = ${f(p.op)}\n    token outputs:surface\n   }\n  }\n`;
  const pts=[],nr=[];for(let k=0;k<p.pos.length;k+=3){pts.push(`(${f(p.pos[k])}, ${f(p.pos[k+1])}, ${f(p.pos[k+2])})`);if(p.nrm)nr.push(`(${f(p.nrm[k])}, ${f(p.nrm[k+1])}, ${f(p.nrm[k+2])})`)}
  meshes+=` def Mesh "G${i}" (\n  prepend apiSchemas = ["MaterialBindingAPI"]\n )\n {\n  uniform bool doubleSided = 1\n  int[] faceVertexCounts = [${new Array(p.idx.length/3).fill(3).join(",")}]\n  int[] faceVertexIndices = [${p.idx.join(",")}]\n  point3f[] points = [${pts.join(", ")}]\n`+(p.nrm?`  normal3f[] normals = [${nr.join(", ")}] (\n   interpolation = "vertex"\n  )\n`:"")+`  uniform token subdivisionScheme = "none"\n  rel material:binding = </Root/Materials/M${i}>\n }\n`;
 });
 const usda=`#usda 1.0\n(\n defaultPrim = "Root"\n metersPerUnit = 1\n upAxis = "Y"\n)\n\ndef Xform "Root"\n{\n def Scope "Materials"\n {\n${mats} }\n${meshes}}\n`;
 const data=new TextEncoder().encode(usda),name=new TextEncoder().encode("model.usda"),crc=crc32(data);
 const ext=64-((30+name.length)%64||64),lh=new DataView(new ArrayBuffer(30+name.length+ext));
 const w32=(v,o,x)=>v.setUint32(o,x,true),w16=(v,o,x)=>v.setUint16(o,x,true);
 w32(lh,0,0x04034b50);w16(lh,4,20);w16(lh,6,0);w16(lh,8,0);w16(lh,10,0);w16(lh,12,0x21);w32(lh,14,crc);w32(lh,18,data.length);w32(lh,22,data.length);w16(lh,26,name.length);w16(lh,28,ext);
 new Uint8Array(lh.buffer).set(name,30);if(ext>=4){w16(lh,30+name.length,0x1986);w16(lh,32+name.length,ext-4)}
 const cd=new DataView(new ArrayBuffer(46+name.length));
 w32(cd,0,0x02014b50);w16(cd,4,20);w16(cd,6,20);w16(cd,8,0);w16(cd,10,0);w16(cd,12,0);w16(cd,14,0x21);w32(cd,16,crc);w32(cd,20,data.length);w32(cd,24,data.length);w16(cd,28,name.length);w16(cd,30,0);w16(cd,32,0);w16(cd,34,0);w16(cd,36,0);w32(cd,38,0);w32(cd,42,0);
 new Uint8Array(cd.buffer).set(name,46);
 const cdOff=lh.byteLength+data.length,end=new DataView(new ArrayBuffer(22));
 w32(end,0,0x06054b50);w16(end,4,0);w16(end,6,0);w16(end,8,1);w16(end,10,1);w32(end,12,cd.byteLength);w32(end,16,cdOff);w16(end,20,0);
 return new Blob([lh.buffer,data,cd.buffer,end.buffer],{type:"model/vnd.usdz+zip"});
}
/* 今の3Dから形を集める（文字・線・半透明の地面と天井・輪郭は除く）。色ごとにまとめる */
function collectAR(roots){
 const V=THREE.Vector3;T.grp.updateMatrixWorld(true);roots=roots||[T.grp];
 const inv=new THREE.Matrix4().copy(T.grp.matrixWorld).invert(),by={},bb=new THREE.Box3();
 const vis=o=>{for(let q=o;q&&q!==T.grp;q=q.parent)if(q.visible===false)return false;return true};
 roots.forEach(rt=>rt.traverse(o=>{
  if(!o.isMesh||!o.geometry||!o.geometry.attributes||!o.geometry.attributes.position||Array.isArray(o.material)||!vis(o))return;
  const m0=o.material;if(!m0||m0.side===THREE.BackSide||(m0.transparent&&m0.opacity<0.6))return;
  const M=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld),N=new THREE.Matrix3().getNormalMatrix(M);
  const pa=o.geometry.attributes.position,na=o.geometry.attributes.normal,ix=o.geometry.index;
  const key=m0.color?m0.color.getHexString():"cccccc";
  const P=by[key]||(by[key]={col:m0.color?[m0.color.r,m0.color.g,m0.color.b]:[.8,.8,.8],op:1,metal:(m0.metalness||0)>0.3,pos:[],nrm:[],idx:[]});
  const base=P.pos.length/3,v=new V(),n=new V();
  for(let k=0;k<pa.count;k++){v.fromBufferAttribute(pa,k).applyMatrix4(M);P.pos.push(v.x,v.y,v.z);bb.expandByPoint(v);
   if(na){n.fromBufferAttribute(na,k).applyMatrix3(N).normalize();P.nrm.push(n.x,n.y,n.z)}else P.nrm.push(0,1,0)}
  if(ix)for(let k=0;k<ix.count;k++)P.idx.push(base+ix.getX(k));else for(let k=0;k<pa.count;k++)P.idx.push(base+k);
 }));
 return{parts:Object.values(by),bb};
}
/* 床・天井に置く目印（三角形の集まり）：十字＋丸、四角の線 */
function arMarks(){
 const P={col:[.86,.15,.15],op:1,metal:false,pos:[],nrm:[],idx:[]},Q={col:[.98,.45,.09],op:1,metal:false,pos:[],nrm:[],idx:[]};
 const quad=(M,pts,y)=>{const b=M.pos.length/3;pts.forEach(([x,z])=>{M.pos.push(x,y,z);M.nrm.push(0,1,0)});M.idx.push(b,b+2,b+1,b,b+3,b+2)};
 const bar=(M,x1,z1,x2,z2,w,y)=>{const dx=x2-x1,dz=z2-z1,l=Math.hypot(dx,dz)||1,nx=-dz/l*w/2,nz=dx/l*w/2;quad(M,[[x1+nx,z1+nz],[x2+nx,z2+nz],[x2-nx,z2-nz],[x1-nx,z1-nz]],y)};
 const ring=(M,x,z,r,w,y)=>{for(let i=0;i<48;i++){const a=i/48*Math.PI*2,b2=(i+1)/48*Math.PI*2,c=Math.cos,s2=Math.sin;
  quad(M,[[x+c(a)*(r+w/2),z+s2(a)*(r+w/2)],[x+c(b2)*(r+w/2),z+s2(b2)*(r+w/2)],[x+c(b2)*(r-w/2),z+s2(b2)*(r-w/2)],[x+c(a)*(r-w/2),z+s2(a)*(r-w/2)]],y)}};
 const cross=(M,x,z,L,w,r,y)=>{bar(M,x-L,z,x+L,z,w,y);bar(M,x,z-L,x,z+L,w,y);ring(M,x,z,r,w,y)};
 return{P,Q,bar,ring,cross};
}
function openAR(){
 if(!T||!T.grp){toast("先に3Dを表示してください");return}
 if(GUIDE){toast("曲げ手順を閉じてから使ってください");return}
 const r=(openAR.anchor||$("#arBtn")).getBoundingClientRect();
 if(typeof XR_AR!=="undefined"&&XR_AR){   // Android（Chrome）：本格AR。機器を置いて、タップで配管を引く
  placeMenu(`<div class="pt" style="pointer-events:none"><img alt="" src="${NICO.ar}" style="width:1.4em;height:1.4em;vertical-align:-.35em;margin-right:4px">ARで見る</div>
   <button class="pm" data-a="xr">機器を置いて配管を引く</button>`,r.left,r.top+r.height/2,()=>startXR());return}
 const a0=document.createElement("a");
 if(!(a0.relList&&a0.relList.supports&&a0.relList.supports("ar"))){toast("ARはiPhone・iPadのSafari、またはAndroidのChromeで使えます");return}
 placeMenu(`<div class="pt" style="pointer-events:none"><img alt="" src="${NICO.ar}" style="width:1.4em;height:1.4em;vertical-align:-.35em;margin-right:4px">ARで見る</div>
  <button class="pm" data-a="all">配管と機器</button><button class="pm" data-a="unit">機器だけ（芯と吊りピッチ）</button>`,r.left,r.top+r.height/2,k=>runAR(k==="unit"));
}
function runAR(onlyUnit){
 const IN=["cas","cas2","ceil","wall","flr"],UN=(T.UN||[]).filter(u=>u.g),U=UN.find(u=>u.t==="s"&&IN.includes(st.units[u.t]))||UN.find(u=>IN.includes(st.units[u.t]));
 if(onlyUnit&&!UN.length){toast("機器の模型を選んでください");return}
 const a=document.createElement("a");
 try{
  const {parts,bb}=collectAR(onlyUnit?UN.map(u=>u.g):null);if(!parts.length){toast("表示する形がありません");return}
  const inv=new THREE.Matrix4().copy(T.grp.matrixWorld).invert(),toL=v=>v.clone().applyMatrix4(T.grp.matrixWorld).applyMatrix4(inv);
  let ctr=null,bolts=null;
  if(U){if(U.c2){ctr=toL(U.c2.ctr);bolts=U.c2.bolts.map(toL)}else{const b=new THREE.Box3().setFromObject(U.g),c=b.getCenter(new THREE.Vector3());ctr=c.applyMatrix4(inv)}}
  const fy=T.gy!=null?Math.min(T.gy,bb.min.y):bb.min.y;
  const cx=ctr?ctr.x:(bb.min.x+bb.max.x)/2,cz=ctr?ctr.z:(bb.min.z+bb.max.z)/2;
  /* 芯（室内機の中心）を真ん中にするため、床の板は芯を中心に左右対称の大きさ */
  const mx=Math.max(cx-bb.min.x,bb.max.x-cx,600)+300,mz=Math.max(cz-bb.min.z,bb.max.z-cz,600)+300;
  const plate=(y,col,op)=>({col,op,metal:false,pos:[-mx+cx,y,-mz+cz, mx+cx,y,-mz+cz, mx+cx,y,mz+cz, -mx+cx,y,mz+cz],nrm:[0,1,0,0,1,0,0,1,0,0,1,0],idx:[0,2,1,0,3,2]});
  parts.push(plate(fy,[.8,.84,.88],.35));                                   // 床（ここを床に合わせて置く）
  if(T.cy!=null)parts.push(plate(T.cy,[.58,.77,.99],.18));                   // 天井
  const mk=arMarks(),fy2=fy+3;
  mk.cross(mk.P,cx,cz,450,24,160,fy2);                                         // 床の芯：十字＋丸
  if(T.cy!=null||ctr)mk.cross(mk.P,cx,cz,300,18,110,(T.cy!=null?T.cy:ctr.y)-3);  // 天井の芯
  if(bolts){bolts.forEach(b=>mk.cross(mk.Q,b.x,b.z,90,14,45,fy2));             // 床に吊りボルトの位置
   for(let i=0;i<4;i++){const b1=bolts[i],b2=bolts[(i+1)%4];mk.bar(mk.Q,b1.x,b1.z,b2.x,b2.z,10,fy2)}}
  parts.push(mk.P);if(mk.Q.idx.length)parts.push(mk.Q);
  parts.forEach(p=>{for(let k=0;k<p.pos.length;k+=3){p.pos[k]=(p.pos[k]-cx)/1000;p.pos[k+1]=(p.pos[k+1]-fy)/1000;p.pos[k+2]=(p.pos[k+2]-cz)/1000}});
  const url=URL.createObjectURL(makeUSDZ(parts));
  a.rel="ar";a.href=url+"#allowsContentScaling=0";a.appendChild(document.createElement("img"));a.style.display="none";document.body.appendChild(a);a.click();
  setTimeout(()=>{a.remove()},3000);
  toast(ctr?"床の赤い十字＝室内機の芯。床の芯に合わせて置いてください"+(bolts?"（オレンジ＝吊りボルト "+U.c2.ba+"×"+U.c2.bb+"）":""):"床を映してタップすると、実物大で置けます");
 }catch(e){console.warn(e);toast("ARの準備に失敗しました")}
}
/* ===== 建物（壁・柱・梁・障害物）：3Dに箱で置く。位置は起点（配管の始まり）からのmm、高さは床から ===== */
const BLDK={col:{n:"柱",c:0x64748b,i:"🏛"},wall:{n:"壁",c:0x94a3b8,i:"🧱"},beam:{n:"梁",c:0xa16207,i:"🟫"},box:{n:"障害物",c:0xf97316,i:"📦"},ind:{n:"室内機",c:0x2563eb,i:"❄️"},hole:{n:"穴",c:0x111827,i:"🕳️"},out:{n:"室外機",c:0x94a3b8,i:"🌀"},spot:{n:"室外機置場",c:0x22c55e,i:"🟩"},door:{n:"扉",c:0xb45309,i:"🚪"}};
function normBld(a){const n=v=>Math.round(+v||0);return(Array.isArray(a)?a:[]).slice(0,1500).filter(o=>o&&typeof o==="object").map(o=>{const k=BLDK[o.k]?o.k:"box";
 return{k,x:n(o.x),z:n(o.z),w:Math.max(10,n(o.w)||600),d:Math.max(10,n(o.d)||600),h:Math.max(10,n(o.h)||600),y:n(o.y),r:normT(o.r||0),full:k==="col"||k==="wall"?o.full!==false:false,m:k==="ind"?(CAS2M[o.m]?o.m:(o.m===""?"":"56")):k==="out"?(OUTM[o.m]?o.m:"p40"):k==="door"?(o.m==="swing"?"swing":"slide"):""}})}
st.bld=normBld(st.bld);
const bldCH=()=>T&&T.CHh?T.CHh:st.gnd.ch;
function bldNew(k,p){const CH=bldCH();
 const o=k==="col"?{w:600,d:600,h:CH,y:0,full:true}:k==="wall"?{w:3000,d:150,h:CH,y:0,full:true}:k==="beam"?{w:4000,d:400,h:700,y:CH+300,full:false}:k==="ind"?{w:840,d:840,h:300,y:0,full:false,m:CAS2M[RP.im]?RP.im:"56"}:k==="hole"?{w:65,d:150,h:65,y:2200,full:false}:k==="door"?{w:800,d:150,h:2000,y:0,full:false,m:"slide"}:{w:500,d:500,h:300,y:CH+100,full:false};
 return normBld([{k,x:p?p.x:0,z:p?p.z:0,r:0,...o}])[0]}
/* 3Dに描く（build3Dから呼ぶ。GY＝床の高さ） */
function addBld3D(GY,CH,ext){
 T.bldM=[];if(!st.bld||!st.bld.length||st.bldHide)return;
 st.bld.forEach((o,i)=>{const K=BLDK[o.k],h=o.full?CH:o.h,y0=GY+(o.full?0:o.y);
  if(o.k==="ind"){const CYd=GY+CH,ib=indMesh(o,CYd);T.grp.add(ib.g);ib.g.userData.bld=i+1;
   T.bldM.push({i,k:"ind",c:new THREE.Vector3(ib.cx,ib.y0+ib.h/2,ib.cz),hw:ib.hw,hd:ib.hd,hh:ib.h/2,r:o.r,y0:ib.y0,h:ib.h,port:ib.port});
   const nm=o.m?(CAS2M[o.m]?CAS2M[o.m].n:"室内機"):fmt(o.w)+"×"+fmt(o.d);
   const s2=label("❄️ 室内機 "+nm,ext*0.03,"#dbeafef2","#1d4ed8");s2.position.set(ib.cx,CYd+120,ib.cz);s2.userData.cat="bld";pxl(s2,17);T.grp.add(s2);return}
  if(o.k==="hole"){const g=new THREE.Group(),L=o.d+30,cy=new THREE.Mesh(new THREE.CylinderGeometry(o.w/2,o.w/2,L,28),new THREE.MeshBasicMaterial({color:0x111827}));cy.rotation.x=Math.PI/2;g.add(cy);
   [-1,1].forEach(sg=>{const t=new THREE.Mesh(new THREE.TorusGeometry(o.w/2,Math.max(4,o.w*.07),8,28),new THREE.MeshBasicMaterial({color:0xfacc15}));t.position.z=sg*(o.d/2+16);g.add(t)});
   g.position.set(o.x,GY+o.y,o.z);g.rotation.y=-o.r*Math.PI/180;g.userData.bld=i+1;T.grp.add(g);
   T.bldM.push({i,k:"hole",c:new THREE.Vector3(o.x,GY+o.y,o.z),hw:o.w/2+30,hd:o.d/2+20,hh:o.w/2+30,r:o.r,y0:GY+o.y-o.w/2,h:o.w});
   const s3=label("🕳️ 穴 φ"+fmt(o.w)+" 床から"+fmt(o.y),ext*0.026,"#fef9c3f2","#713f12");s3.position.set(o.x,GY+o.y+o.w/2+ext*0.03,o.z);s3.userData.cat="bld";pxl(s3,15);T.grp.add(s3);return}
  if(o.k==="door"){const g=new THREE.Group(),th=-o.r*Math.PI/180,W2=o.w,H2=o.h||2000,D2=o.d||150,wood=new THREE.MeshStandardMaterial({color:0xc08a4a,roughness:.7}),fr=new THREE.MeshStandardMaterial({color:0x6b4423,roughness:.6});
   const bx2=(w,h2,d,x,y,z,mt)=>{const mm=new THREE.Mesh(new THREE.BoxGeometry(w,h2,d),mt);mm.position.set(x,y,z);g.add(mm);return mm};
   bx2(40,H2,D2+20,-W2/2-20,H2/2,0,fr);bx2(40,H2,D2+20,W2/2+20,H2/2,0,fr);bx2(W2+80,40,D2+20,0,H2+20,0,fr);   // 枠
   if(o.m==="swing"){const p=new THREE.Group();p.position.set(-W2/2,0,D2/2);const pn=new THREE.Mesh(new THREE.BoxGeometry(W2,H2-10,40),wood);pn.position.set(W2/2,H2/2,20);p.add(pn);p.rotation.y=-0.5;g.add(p);
    for(let k=0;k<10;k++){const a0=k/10*Math.PI/2,a1=(k+1)/10*Math.PI/2,ax=-W2/2+W2*Math.cos(a0),az=D2/2+W2*Math.sin(a0),bx3=-W2/2+W2*Math.cos(a1),bz=D2/2+W2*Math.sin(a1),L2=Math.hypot(bx3-ax,bz-az);
     const sg=bx2(L2,6,14,(ax+bx3)/2,4,(az+bz)/2,new THREE.MeshBasicMaterial({color:0xb45309}));sg.rotation.y=-Math.atan2(bz-az,bx3-ax)}}
   else{bx2(W2,H2-10,35,W2*0.35,H2/2,D2/2+30,wood);bx2(W2*2,20,30,W2/2,H2+5,D2/2+30,fr)}   // 引き戸：少し開いた戸と上のレール
   g.position.set(o.x,y0,o.z);g.rotation.y=th;g.userData.bld=i+1;g.traverse(c=>{c.userData.bld=i+1});T.grp.add(g);
   T.bldM.push({i,k:"door",c:new THREE.Vector3(o.x,y0+H2/2,o.z),hw:W2/2,hd:D2/2,hh:H2/2,r:o.r,y0,h:H2});
   const s4=label("🚪 "+(o.m==="swing"?"開き戸":"引き戸")+" 幅"+fmt(W2),ext*0.026,"#fef3c7f2","#78350f");s4.position.set(o.x,y0+H2+ext*0.03,o.z);s4.userData.cat="bld";pxl(s4,15);T.grp.add(s4);return}
  const isW=o.k==="wall";
  const m=new THREE.Mesh(new THREE.BoxGeometry(o.w,h,o.d),new THREE.MeshStandardMaterial({color:isW?0xe2e8f0:K.c,transparent:true,opacity:o.k==="box"||o.k==="out"?.7:o.k==="spot"?.3:isW?.22:.45,depthWrite:false,roughness:.8}));
  m.position.set(o.x,y0+h/2,o.z);m.rotation.y=-o.r*Math.PI/180;m.renderOrder=-1;m.userData.bld=i+1;T.grp.add(m);
  try{if(THREE.EdgesGeometry){const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),new THREE.LineBasicMaterial({color:isW?0x334155:K.c}));e.position.copy(m.position);e.rotation.y=m.rotation.y;e.userData.bld=i+1;T.grp.add(e)}}catch(err){}
  T.bldM.push({i,k:o.k,c:new THREE.Vector3(o.x,y0+h/2,o.z),hw:o.w/2,hd:o.d/2,hh:h/2,r:o.r,y0,h});
  const t=K.i+" "+K.n+" "+(o.k==="out"?(OUTM[o.m]?OUTM[o.m].n:"")+" "+fmt(o.w)+"×"+fmt(o.d):o.k==="spot"?fmt(o.w)+"×"+fmt(o.d):o.k==="beam"?fmt(o.d)+"×"+fmt(o.h)+" 梁下"+fmt(o.y):o.k==="box"?fmt(o.w)+"×"+fmt(o.d)+"×"+fmt(o.h)+" 下面"+fmt(o.y):o.k==="wall"?"厚"+fmt(o.d)+" 長"+fmt(o.w):fmt(o.w)+"×"+fmt(o.d));
  const s=label(t,ext*0.03,"#f1f5f9f2","#334155","bld");s.position.set(o.x,y0+h+40,o.z);s.userData.cat="bld";pxl(s,17);T.grp.add(s)});
 try{indDims(ext)}catch(e){console.warn("indDims",e)}
 try{pipeHits(ext)}catch(e){console.warn("hits",e)}
}
/* 配管が壁・柱・梁・障害物・機器に当たっていないか調べて、当たっていたら ⚠️ を出す（穴の所は通ってOK） */
let HIT_SIG="";
function pipeHits(ext){T.hits=[];if(!T.segs||!T.segs.length||!T.bldM||!T.bldM.length)return;
 const solid=T.bldM.filter(m=>["wall","col","beam","box","out","ind"].includes(m.k)),holes=T.bldM.filter(m=>m.k==="hole"||m.k==="door");
 const inBox=(m,p,mg)=>{const th=m.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th),dx=p.x-m.c.x,dz=p.z-m.c.z,lx=dx*co+dz*si,lz=-dx*si+dz*co;
  return Math.abs(lx)<m.hw+mg&&Math.abs(lz)<m.hd+mg&&Math.abs(p.y-m.c.y)<m.hh+mg};
 const inHole=p=>holes.some(hm=>{const o=st.bld[hm.i];if(!o)return false;if(hm.k==="door")return inBox(hm,p,0);const th=hm.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th),dx=p.x-hm.c.x,dz=p.z-hm.c.z,lx=dx*co+dz*si,lz=-dx*si+dz*co;
  return Math.abs(lz)<hm.hd+60&&Math.hypot(lx,p.y-hm.c.y)<o.w/2+30});
 const tot=T.segs.reduce((a,s2)=>a+s2.a.distanceTo(s2.b),0);let run=0;const hit=new Map();
 T.segs.forEach(sg=>{const L=sg.a.distanceTo(sg.b),n=Math.max(1,Math.ceil(L/40));
  for(let k=0;k<=n;k++){const t=k/n,d=run+L*t;if(d<200||tot-d<200)continue;const p=sg.a.clone().lerp?sg.a.clone().multiplyScalar(1-t).add(sg.b.clone().multiplyScalar(t)):sg.a;
   for(const m of solid){if(hit.has(m.i))continue;if(inBox(m,p,-5)&&!inHole(p)){hit.set(m.i,{p:p.clone(),row:sg.row,g:sg.g});}}}
  run+=L});
 hit.forEach((h,i)=>{const o=st.bld[i];if(!o)return;T.hits.push({i,k:o.k,row:h.row,g:h.g});
  const s5=label("⚠️ ここで"+(BLDK[o.k]?BLDK[o.k].n:"")+"に当たります",ext*0.032,"#fee2e2f2","#b91c1c");s5.position.copy(h.p);s5.userData.cat="hit";pxl(s5,18,{t:"up"},0);T.grp.add(s5);
  const b=new THREE.Mesh(new THREE.SphereGeometry(Math.max(40,ext*0.008),16,12),new THREE.MeshBasicMaterial({color:0xef4444,transparent:true,opacity:.85,depthTest:false}));b.position.copy(h.p);b.renderOrder=9;T.grp.add(b);
  T.grp.children.forEach(c=>{if(c.userData&&c.userData.bld===i+1&&c.material&&c.material.color&&c.material.color.setHex){c.material=c.material.clone();c.material.color.setHex(0xef4444);if(c.material.opacity!==undefined&&c.material.transparent)c.material.opacity=Math.max(c.material.opacity,.45)}})});
 const sig=T.hits.map(h=>h.i+":"+h.row).join(",");
 if(sig&&sig!==HIT_SIG){const names=[...new Set(T.hits.map(h=>BLDK[h.k]?BLDK[h.k].n:""))].join("・");setTimeout(()=>toast("⚠️ 配管が "+names+" に当たっています（赤い所）"),300)}
 HIT_SIG=sig}
/* 室内機（天井に付く）：機種ならその模型、機種なしなら箱。天井面の真ん中が (x,z) */
function indMesh(o,CYd){const V=THREE.Vector3,th=-o.r*Math.PI/180;
 if(!o.m){const h=o.h,g=new THREE.Group(),m=new THREE.Mesh(new THREE.BoxGeometry(o.w,h,o.d),new THREE.MeshStandardMaterial({color:0x60a5fa,roughness:.6}));
  m.position.set(0,-h/2,0);g.add(m);try{const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry),new THREE.LineBasicMaterial({color:0x1d4ed8}));e.position.copy(m.position);g.add(e)}catch(err){}
  g.rotation.y=th;g.position.set(o.x,CYd-o.y,o.z);g.updateMatrixWorld(true);
  return{g,cx:o.x,cz:o.z,hw:o.w/2,hd:o.d/2,h,y0:CYd-o.y-h,port:null}}
 const mk=makeUnit("cas2",{kind:st.info.kind,mm:o.m,ck:st.units.cs}),g=mk.g;
 g.rotation.y=0;g.position.set(0,0,0);g.updateMatrixWorld(true);
 const c0=g.localToWorld(new V(...mk.c2.ceil)),b0=uBox(g),bc=b0.getCenter(new V()),ox=bc.x-c0.x,oz=bc.z-c0.z,hw=(b0.max.x-b0.min.x)/2,hd=(b0.max.z-b0.min.z)/2,hy0=b0.min.y-c0.y,hy1=b0.max.y-c0.y;
 g.rotation.y=th;g.updateMatrixWorld(true);
 const c=g.localToWorld(new V(...mk.c2.ceil));g.position.set(o.x-c.x,CYd-c.y,o.z-c.z);g.updateMatrixWorld(true);
 const co=Math.cos(-th),si=Math.sin(-th);   // 向き r（度）で回した先
 const cx=o.x+ox*Math.cos(th)+oz*Math.sin(th),cz=o.z-ox*Math.sin(th)+oz*Math.cos(th);
 return{g,cx,cz,hw,hd,h:Math.min(hy1,0)-hy0,y0:CYd+hy0,port:g.position.clone()}}
/* 壁・柱・障害物・ほかの室内機までの距離を、室内機のまわりに出す */
const IND_SIDE={px:"配管側",nx:"反対側",pz:"右側",nz:"左側"},IND_KN={col:"柱",wall:"壁",box:"障害物",ind:"室内機"};
function indDims(ext){
 const ms=T.bldM;if(!ms)return;
 ms.forEach(a=>{if(a.k!=="ind")return;
  const th=a.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th);
  const toL=(x,z)=>{const dx=x-a.c.x,dz=z-a.c.z;return[dx*co+dz*si,-dx*si+dz*co]},toW=(lx,lz)=>[a.c.x+lx*co-lz*si,a.c.z+lx*si+lz*co];
  const best={};
  ms.forEach(b=>{if(b===a||b.k==="beam")return;
   if(!(b.y0+b.h>a.y0+1&&b.y0<a.y0+a.h-1))return;
   const bt=b.r*Math.PI/180,bc=Math.cos(bt),bs=Math.sin(bt);let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
   [-1,1].forEach(sx=>[-1,1].forEach(sz=>{const l=toL(b.c.x+sx*b.hw*bc-sz*b.hd*bs,b.c.z+sx*b.hw*bs+sz*b.hd*bc);x0=Math.min(x0,l[0]);x1=Math.max(x1,l[0]);z0=Math.min(z0,l[1]);z1=Math.max(z1,l[1])}));
   const zo0=Math.max(z0,-a.hd),zo1=Math.min(z1,a.hd),xo0=Math.max(x0,-a.hw),xo1=Math.min(x1,a.hw),put=(k,g,mid,q)=>{if(!best[k]||g<best[k].g)best[k]={g:Math.round(g),mid,k:b.k,q}};
   if(zo1-zo0>1){if(x0>=a.hw-1)put("px",x0-a.hw,(zo0+zo1)/2,x0);if(x1<=-a.hw+1)put("nx",-a.hw-x1,(zo0+zo1)/2,x1)}
   if(xo1-xo0>1){if(z0>=a.hd-1)put("pz",z0-a.hd,(xo0+xo1)/2,z0);if(z1<=-a.hd+1)put("nz",-a.hd-z1,(xo0+xo1)/2,z1)}});
  a.gaps=best;
  const y=a.y0+a.h*0.5,th2=Math.max(6,ext*0.004);
  Object.keys(best).forEach(k=>{const q=best[k],ax=k[1]==="x",sg=k[0]==="p"?1:-1;
   const f=ax?[sg*a.hw,q.mid]:[q.mid,sg*a.hd],t=ax?[q.q,q.mid]:[q.mid,q.q],p1=toW(f[0],f[1]),p2=toW(t[0],t[1]),len=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]);if(len<1)return;
   const m=new THREE.Mesh(new THREE.BoxGeometry(th2,th2,len),new THREE.MeshBasicMaterial({color:0xdc2626,depthTest:false,transparent:true}));
   m.position.set((p1[0]+p2[0])/2,y,(p1[1]+p2[1])/2);m.rotation.y=Math.atan2(p2[0]-p1[0],p2[1]-p1[1]);m.renderOrder=9;m.userData.bld=a.i+1;T.grp.add(m);
   const lb=label(IND_KN[q.k]+"まで "+fmt(q.g),ext*0.026,"#fef2f2f2","#b91c1c");lb.position.set((p1[0]+p2[0])/2,y+th2*3,(p1[1]+p2[1])/2);lb.userData.cat="bld";lb.userData.bld=a.i+1;pxl(lb,14);T.grp.add(lb)})})}
/* 室内機から壁・柱までの距離の一覧（エディタ用） */
function indGapHtml(i){const m=T&&T.bldM&&T.bldM.find(q=>q.i===i);
 const g=m&&m.gaps?Object.keys(m.gaps).map(k=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e2e8f0;font-size:15px"><span>${IND_SIDE[k]}（${IND_KN[m.gaps[k].k]}）</span><b>${fmt(m.gaps[k].g)} mm</b></div>`).join(""):"";
 return `<div class="ctitle">まわりまでの距離（室内機の端から）</div>${g||'<div class="note" style="margin:0 0 8px">近くに壁・柱・障害物がありません。壁や柱を置くと、ここと3Dに距離が出ます。</div>'}
  <button class="sharebtn" id="indPipe" style="width:100%;margin:10px 0 0;background:#2563eb;color:#fff">🧭 この室内機から配管を出す</button>
  <div class="note" style="margin:4px 0 8px">この室内機の配管口を「起点」にして、ルートおまかせを開きます。壁・柱もそれに合わせて動きます。</div>`}
/* この室内機を起点にして、配管を出す（ほかの建物は起点からの位置に直す） */
function indToPipe(i,noUI){const o=st.bld[i],m=T&&T.bldM&&T.bldM.find(q=>q.i===i);if(!o||!m||!m.port){toast("機種を選んだ室内機で使えます（機種なし＝箱は配管口がありません）");return}
 const P=m.port,r=o.r,th=r*Math.PI/180,co=Math.cos(th),si=Math.sin(th),yP=P.y;
 const rest=st.bld.filter((_,j)=>j!==i).map(b=>{const dx=b.x-P.x,dz=b.z-P.z;return{...b,x:Math.round(dx*co+dz*si),z:Math.round(-dx*si+dz*co),r:normT(b.r-r)}});
 {const f=xfOf(),R=f.r*Math.PI/180;st.bldXf={x:Math.round(f.x+P.x*Math.cos(R)-P.z*Math.sin(R)),z:Math.round(f.z+P.x*Math.sin(R)+P.z*Math.cos(R)),r:normT(f.r+r)}}
 const model=o.m;st.bld=rest;st.nopipe=false;
 st.units.on=true;st.units.s="cas2";st.units.ms=model;st.units.e="";st.rows=[{l:1000,a:0,t:0,o:false}];
 const g=st.gnd;g.on=true;g.mode="auto";g.c=true;g.ch=Math.round(bldCH())||g.ch;RP.it="cas2";RP.im=model;RP.ch=g.ch;rpSave();
 $("#bldOv").classList.remove("on");BMODE=-1;try{bmBar(0,false)}catch(e){}
 save();render();if(T){build3D();fitT(true)}
 if(noUI)return true;
 RTM="pos";RPLIVE=false;openRoute();toast("この室内機を起点にしました。室外機の位置を入れて、ルートを作ってください")}
/* 穴まで配管：起点から穴までの距離を「配管の長さから」に入れる */
function holeToPipe(i){const o=st.bld[i];if(!o)return;
 if(!st.units.on||!st.units.s){toast("先に室内機の「この室内機から配管を出す」で、配管の起点を決めてください");return}
 const V=THREE.Vector3,GY=T&&T.GYr!=null?T.GYr:0,D0=(st.units.s==="wall"&&(WALLX[st.units.ws]||WALLX.rb).k==="d")?new V(0,-1,0):new V(1,0,0),F=frameFor(D0),p=new V(o.x,GY+o.y,o.z);
 RT.X=Math.round(p.dot(F.ex));RT.Y=Math.round(p.dot(F.ey));RT.Z=Math.round(p.dot(F.ez));
 $("#bldOv").classList.remove("on");RTM="rel";RPLIVE=false;openRoute();toast("起点から穴までの距離を入れました。「ルートを作る」を押してください")}
/* 画面の点 → 床の上の点 */
function bldFloorAt(cx,cy){try{
 const cv=$("#cv"),r=cv.getBoundingClientRect(),nx=((cx-r.left)/T.w)*2-1,ny=-((cy-r.top)/T.h)*2+1;T.cam.updateMatrixWorld();
 const a=new THREE.Vector3(nx,ny,-1).unproject(T.cam),b=new THREE.Vector3(nx,ny,1).unproject(T.cam),GY=T.GYr!=null?T.GYr:0;
 const dy=b.y-a.y;if(Math.abs(dy)<1e-6)return null;const t=(GY-a.y)/dy;if(t<0)return null;
 return{x:Math.round((a.x+(b.x-a.x)*t)/10)*10,z:Math.round((a.z+(b.z-a.z)*t)/10)*10}}catch(e){return null}}
/* 画面の点の下にある建物（いちばん手前） */
function pickBld(cx,cy){
 if(!T||!T.bldM||!T.bldM.length||!T.w)return -1;
 const cv=$("#cv"),r=cv.getBoundingClientRect(),px=cx-r.left,py=cy-r.top;T.cam.updateMatrixWorld();
 let best=-1,bz=1e9;
 T.bldM.forEach(b=>{const th=b.r*Math.PI/180,co=Math.cos(th),si=Math.sin(th);let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,zz=0,ok=true;
  [-1,1].forEach(sx=>[-1,1].forEach(sz=>[-1,1].forEach(sy=>{const lx=sx*b.hw,lz=sz*b.hd,v=new THREE.Vector3(b.c.x+lx*co-lz*si,b.c.y+sy*b.hh,b.c.z+lx*si+lz*co).project(T.cam);
   if(v.z>1)ok=false;const X=(v.x*.5+.5)*T.w,Y=(-v.y*.5+.5)*T.h;x0=Math.min(x0,X);x1=Math.max(x1,X);y0=Math.min(y0,Y);y1=Math.max(y1,Y);zz+=v.z})));
  if(ok&&px>=x0&&px<=x1&&py>=y0&&py<=y1&&zz<bz){bz=zz;best=b.i}});
 return best}
let BI=-1,BSTEP=100;
function bldChanged(){save(true);if(T){build3D();T.dirty=true}}
function openBld(i){BI=i;renderBld();$("#bldOv").classList.add("on")}
function renderBld(){
 const o=st.bld[BI];if(!o){$("#bldOv").classList.remove("on");return}
 const K=BLDK[o.k],box=$("#bldBody");
 const num=(f,lab)=>`<div class="field" style="margin-bottom:8px;flex:1;min-width:120px"><label>${lab}</label><input data-f="${f}" inputmode="numeric" value="${uVal(Math.abs(o[f]))}"></div>`;
 const sgn=(f,lab,a)=>`<div class="field" style="margin-bottom:8px"><label>${lab}</label><div style="display:flex;gap:6px"><select data-sg="${f}" style="height:44px;border-radius:12px;font-size:15px;font-weight:700;padding:0 8px"><option value="1"${o[f]>=0?" selected":""}>${a[0]}</option><option value="-1"${o[f]<0?" selected":""}>${a[1]}</option></select><input data-f="${f}" inputmode="numeric" value="${uVal(Math.abs(o[f]))}" style="flex:1"></div></div>`;
 const full=o.k==="col"||o.k==="wall";
 box.innerHTML=`<div class="seg" id="bldK" style="margin-bottom:10px;flex-wrap:wrap">${Object.keys(BLDK).map(k=>`<button data-v="${k}" class="${k===o.k?"on":""}" style="font-size:14px;flex:1 1 28%">${BLDK[k].i} ${BLDK[k].n}</button>`).join("")}</div>
  <div class="ctitle">大きさ（mm）</div><div style="display:flex;gap:8px;flex-wrap:wrap">
  ${o.k==="ind"?`<div class="field" style="margin-bottom:8px;flex:1 1 100%"><label>機種</label><select id="indM" style="height:44px;border-radius:12px;font-size:14px;font-weight:700;width:100%"><option value=""${o.m?"":" selected"}>（機種なし・箱で置く）</option>${CAS2_MAKERS.map(([mm,mn])=>`<optgroup label="${mn}">`+CAS2_ORDER.filter(k=>CAS2M[k].mk===mm).map(k=>`<option value="${k}"${k===o.m?" selected":""}>${CAS2M[k].n}（${CAS2M[k].kind}）</option>`).join("")+"</optgroup>").join("")}</select><button class="sharebtn" id="indSpec" style="width:100%;margin:6px 0 0">📄 仕様書（PDF）を読む</button></div>`+(o.m?"":num("w","幅")+num("d","奥行")+num("h","高さ")+num("y","天井からの下がり")):""}
  ${o.k==="ind"?"":o.k==="hole"?num("w","穴の直径")+num("d","壁の厚み")+num("y","穴の中心の高さ（床から）"):o.k==="wall"?num("w","長さ")+num("d","厚さ"):o.k==="beam"?num("w","長さ")+num("d","幅")+num("h","梁せい"):num("w","幅")+num("d","奥行")+(o.k==="box"?num("h","高さ"):"")}</div>
  ${full?`<label style="display:flex;align-items:center;gap:8px;font-size:14px;margin:2px 0 8px"><input id="bldFull" type="checkbox" ${o.full?"checked":""} style="width:22px;height:22px">床から天井まで</label>${o.full?"":num("h","高さ")}`:""}
  ${o.k==="ind"?"":""}${o.k==="beam"?num("y","梁下の高さ（床から）"):o.k==="box"?num("y","下の面の高さ（床から）"):""}
  <div class="ctitle">向き：${o.r}°</div>
  <div class="seg" id="bldRot" style="margin-bottom:10px"><button data-v="-15">↺ 15°</button><button data-v="90">↻ 90°</button><button data-v="15">↻ 15°</button></div>
  <div class="ctitle">位置</div>
  <button class="sharebtn" id="bldHand" style="width:100%;margin:0 0 8px;background:#2563eb;color:#fff">✋ 3Dで指で動かす</button>
  <div style="font-size:12.5px;color:#64748b;margin:-2px 0 8px">3Dで箱を長押ししても、そのまま指で動かせます。細かい調整は下のボタンで。</div>
  <div class="seg" id="bldStep" style="margin-bottom:6px">${[10,50,100,500].map(v=>`<button data-v="${v}" class="${v===BSTEP?"on":""}" style="font-size:14px">${fmt(v)}</button>`).join("")}</div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:8px" id="bldMove"><span></span><button class="sharebtn" data-v="f" style="margin:0">⬆️ 奥へ</button><span></span><button class="sharebtn" data-v="l" style="margin:0">⬅️ 左へ</button><button class="sharebtn" data-v="b" style="margin:0">⬇️ 手前へ</button><button class="sharebtn" data-v="r" style="margin:0">➡️ 右へ</button></div>
  ${sgn("x","起点から（配管が出る向き）",["前へ","後ろへ"])}${sgn("z","起点から（左右）",["右へ","左へ"])}
  ${o.k==="ind"?indGapHtml(BI):""}${o.k==="hole"?`<button class="sharebtn" id="holePipe" style="width:100%;margin:10px 0 0;background:#2563eb;color:#fff">🧭 この穴まで配管を出す</button><div class="note" style="margin:4px 0 8px">配管の起点（室内機）から、この穴までのルートおまかせを開きます。先に室内機の「この室内機から配管を出す」で起点を決めておいてください。</div>`:""}
  <div style="display:flex;gap:8px;margin-top:4px"><button class="sharebtn" id="bldDup" style="flex:1;margin:0">📄 複製して隣に</button><button class="sharebtn" id="bldDel" style="flex:1;margin:0;background:#fee2e2;color:#b91c1c">🗑 削除する</button></div>`;
 $("#bldTtl").textContent=K.i+" "+K.n+"（"+(BI+1)+"／"+st.bld.length+"）";
 $("#bldK").onclick=e=>{const b=e.target.closest("button");if(!b||b.dataset.v===o.k)return;const n=bldNew(b.dataset.v,{x:o.x,z:o.z});n.r=o.r;st.bld[BI]=n;bldChanged();renderBld()};
 box.querySelectorAll("[data-f]").forEach(inp=>{inp.onfocus=()=>inp.select();inp.oninput=()=>{const f=inp.dataset.f,v=uParse(inp.value);if(!isFinite(v))return;const sg=box.querySelector(`[data-sg="${f}"]`);o[f]=sg?(+sg.value)*Math.abs(v):(f==="y"?v:Math.max(10,v));bldChanged()}});
 box.querySelectorAll("[data-sg]").forEach(s=>s.onchange=()=>{const f=s.dataset.sg;o[f]=(+s.value)*Math.abs(o[f]);bldChanged()});
 const fu=$("#bldFull");if(fu)fu.onchange=()=>{o.full=fu.checked;if(!o.full)o.h=Math.round(bldCH());bldChanged();renderBld()};
 $("#bldRot").onclick=e=>{const b=e.target.closest("button");if(!b)return;o.r=normT(o.r+(+b.dataset.v));bldChanged();renderBld()};
 $("#bldStep").onclick=e=>{const b=e.target.closest("button");if(!b)return;BSTEP=+b.dataset.v;renderBld()};
 $("#bldMove").onclick=e=>{const b=e.target.closest("button");if(!b)return;
  let fx=1,fz=0;try{const d=new THREE.Vector3();T.cam.getWorldDirection(d);if(Math.abs(d.x)>=Math.abs(d.z)){fx=Math.sign(d.x)||1;fz=0}else{fx=0;fz=Math.sign(d.z)||1}}catch(err){}
  const rx=-fz,rz=fx,m={f:[fx,fz],b:[-fx,-fz],r:[rx,rz],l:[-rx,-rz]}[b.dataset.v];o.x+=m[0]*BSTEP;o.z+=m[1]*BSTEP;bldChanged();
  const ix=box.querySelector('[data-f="x"]'),iz=box.querySelector('[data-f="z"]');ix.value=uVal(Math.abs(o.x));iz.value=uVal(Math.abs(o.z));box.querySelector('[data-sg="x"]').value=o.x<0?-1:1;box.querySelector('[data-sg="z"]').value=o.z<0?-1:1};
 $("#bldHand").onclick=()=>bldMoveMode(BI);
 {const im=$("#indM");if(im)im.onchange=()=>{o.m=im.value;bldChanged();renderBld()}}
 {const sb=$("#indSpec");if(sb)sb.onclick=()=>openSpecReader(o)}
 {const cb=$("#indPipe");if(cb)cb.onclick=()=>indToPipe(BI)}
 {const hp=$("#holePipe");if(hp)hp.onclick=()=>holeToPipe(BI)}
 $("#bldDup").onclick=()=>{const th=o.r*Math.PI/180,bm=T&&T.bldM&&T.bldM.find(q=>q.i===BI),W=bm?bm.hw*2+200:o.w+300,n={...o,x:o.x+Math.round(Math.cos(th)*W),z:o.z+Math.round(Math.sin(th)*W)};st.bld.push(n);BI=st.bld.length-1;bldChanged();renderBld();toast("複製しました")};
 $("#bldDel").onclick=()=>{BMODE=-1;bmBar(0,false);st.bld.splice(BI,1);bldChanged();$("#bldOv").classList.remove("on");toast("削除しました（↩️で戻せます）")};
}
$("#closeBld").onclick=()=>$("#bldOv").classList.remove("on");
$("#bldOv").addEventListener("click",e=>{if(e.target.id==="bldOv")$("#bldOv").classList.remove("on")});
/* 指で動かす */
let BDRAG=null,BMODE=-1;
function bldPlaneAt(cx,cy,yy){try{const cv=$("#cv"),r=cv.getBoundingClientRect(),nx=((cx-r.left)/T.w)*2-1,ny=-((cy-r.top)/T.h)*2+1;T.cam.updateMatrixWorld();
 const a=new THREE.Vector3(nx,ny,-1).unproject(T.cam),b=new THREE.Vector3(nx,ny,1).unproject(T.cam),dy=b.y-a.y;if(Math.abs(dy)<1e-6)return null;const t=(yy-a.y)/dy;if(t<0)return null;
 return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}}catch(e){return null}}
function bldDragStart(i,cx,cy){const o=st.bld[i],m=T.bldM.find(q=>q.i===i);if(!o||!m)return;const yy=m.y0,p=bldPlaneAt(cx,cy,yy);if(!p)return;
 BDRAG={i,yy,p0:p,x0:o.x,z0:o.z,ms:[]};T.grp.traverse(n=>{if(n.userData&&n.userData.bld===i+1)BDRAG.ms.push({n,x:n.position.x,z:n.position.z})});
 BDRAG.ms.forEach(q=>{if(q.n.material&&q.n.material.opacity!=null){q.op=q.n.material.opacity;q.n.material.opacity=Math.min(1,q.op+.3)}});
 bmBar(i,true);T.dirty=true}
function bldDragMove(cx,cy){const D=BDRAG,p=bldPlaneAt(cx,cy,D.yy);if(!p)return;const o=st.bld[D.i];
 o.x=Math.round((D.x0+p.x-D.p0.x)/10)*10;o.z=Math.round((D.z0+p.z-D.p0.z)/10)*10;
 D.ms.forEach(q=>{q.n.position.x=q.x+(o.x-D.x0);q.n.position.z=q.z+(o.z-D.z0)});bmInfo(o);T.dirty=true}
function bldDragEnd(){const D=BDRAG;BDRAG=null;if(!D)return;bldChanged();bmBar(D.i,BMODE===D.i)}
const bmPos=o=>"起点から "+(o.x>=0?"前へ":"後ろへ")+fmt(Math.abs(o.x))+"mm・"+(o.z>=0?"右へ":"左へ")+fmt(Math.abs(o.z))+"mm";
function bmInfo(o){const b=$("#bmBar");if(b)b.querySelector("span").textContent=BLDK[o.k].i+" "+bmPos(o)}
function bmBar(i,on){let b=$("#bmBar");
 if(!on){if(b)b.remove();return}
 if(!b){b=document.createElement("div");b.id="bmBar";b.style.cssText="position:absolute;left:50%;top:8px;transform:translateX(-50%);z-index:8;background:#fff;border-radius:14px;box-shadow:0 4px 16px #0c4a6e55;padding:6px 8px 6px 12px;display:flex;gap:8px;align-items:center;font-size:13px;font-weight:800;color:#0c4a6e;max-width:92%";
  b.innerHTML='<span></span><button style="height:34px;border-radius:10px;background:#2563eb;color:#fff;font-weight:800;padding:0 12px;white-space:nowrap">✅ 終わり</button>';$("#stage").appendChild(b);
  b.querySelector("button").onclick=()=>{BMODE=-1;bmBar(0,false);toast("位置を決めました")}}
 bmInfo(st.bld[i])}
function bldMoveMode(i){BMODE=i;$("#bldOv").classList.remove("on");bmBar(i,true);toast("箱を指で押さえたまま動かしてください")}
/* 新規作成 */
/* 機械だけのとき：配管を出すボタン */
function updNop(){let b=$("#nopBar");
 if(!st.nopipe||!T){if(b)b.remove();return}
 if(!b){b=document.createElement("div");b.id="nopBar";b.style.cssText="position:absolute;left:50%;bottom:10px;transform:translateX(-50%);z-index:8;display:flex;gap:6px;max-width:96%";
  b.innerHTML='<button data-t="ind" style="height:44px;border-radius:14px;background:#2563eb;color:#fff;font-weight:800;padding:0 12px;font-size:13px;white-space:nowrap;box-shadow:0 4px 14px #0c4a6e66">❄️ 室内機を追加</button><button data-t="wall" style="height:44px;border-radius:14px;background:#64748b;color:#fff;font-weight:800;padding:0 12px;font-size:13px;white-space:nowrap;box-shadow:0 4px 14px #0c4a6e66">🧱 壁</button><button data-t="col" style="height:44px;border-radius:14px;background:#64748b;color:#fff;font-weight:800;padding:0 12px;font-size:13px;white-space:nowrap;box-shadow:0 4px 14px #0c4a6e66">🏛 柱</button>';
  $("#stage").appendChild(b);
  b.querySelectorAll("button").forEach(x=>x.onclick=()=>bldAddAt(x.dataset.t))}}
function openNew(){$("#newOv").classList.add("on")}
function newPlan(mode){
 const md=mode==="model",mc=mode==="machine";
 st={s:st.s,rows:mc?[{l:300,a:0,t:0,o:false}]:[{l:1000,a:0,t:0,o:false}],info:normInfo({}),goal:0,units:normUnits(mc?{on:true,s:"",e:""}:md?{on:true,s:RP.it||"cas2",ms:RP.im,e:"out",oe:RP.oe,xe:RP.ox}:{on:st.units.on}),ps:null,bl:[],sup:st.sup,gnd:normGnd(mc?{...st.gnd,on:true,c:true,mode:"start",h:st.gnd.ch}:{...st.gnd,on:md?true:st.gnd.on,c:md?true:st.gnd.c}),bld:[],nopipe:mc,scan:st.scan};
 leg="m";sel=0;HID.clear();BMODE=-1;try{bmBar(0,false)}catch(e){}
 $("#newOv").classList.remove("on");
 const stp=(n,f)=>{try{f()}catch(e){console.warn(n,e);try{toast("エラー（"+n+"）："+(e&&e.message||e))}catch(_){}}};
 stp("保存",()=>save());stp("表",()=>{$("#sz").value=st.s;render()});stp("3D",()=>{if(T){build3D();fitT(true)}});
 if(mc){stp("室内機",()=>{if(T)bldAddAt("ind")});toast("室内機を置きました。壁・柱は下のボタンから。室内機はいくつでも置けます")}else if(md){RTM="pos";RPLIVE=true;openRoute();toast("まず室内機と室外機の位置を決めてね")}else toast("新しく作りました。長さと曲げを入れてね")}
$("#closeNew").onclick=()=>$("#newOv").classList.remove("on");
$("#newOv").addEventListener("click",e=>{if(e.target.id==="newOv")$("#newOv").classList.remove("on")});
$("#newPipe").onclick=()=>newPlan("pipe");$("#newModel").onclick=()=>newPlan("model");$("#newMachine").onclick=()=>newPlan("machine");
function bldAddAt(k,cx,cy){if(!T)return;let p=cx!=null?bldFloorAt(cx,cy):null;if(!p){const c=T.ctr||{x:0,z:0};p={x:Math.round(c.x/10)*10,z:Math.round(c.z/10)*10}}
 st.bld.push(bldNew(k,p));st.bldHide=false;bldChanged();openBld(st.bld.length-1)}
$("#closePhoto").onclick=()=>$("#photoOv").classList.remove("on");
$("#photoOv").addEventListener("click",e=>{if(e.target.id==="photoOv")$("#photoOv").classList.remove("on")});
$("#photoIn").onchange=e=>{
 const f=e.target.files&&e.target.files[0];if(!f)return;
 toast("写真を読み込み中…");
 const fr=new FileReader();
 fr.onerror=()=>toast("写真を読み込めませんでした");
 fr.onload=()=>{
  const img=new Image();
  img.onload=()=>{
   const k=Math.min(1,1280/Math.max(img.width,img.height)),c=document.createElement("canvas");
   c.width=Math.max(1,Math.round(img.width*k));c.height=Math.max(1,Math.round(img.height*k));
   let d;
   try{c.getContext("2d").drawImage(img,0,0,c.width,c.height);d=c.toDataURL("image/jpeg",0.72)}
   catch(err){d=fr.result}
   try{localStorage.setItem(PH_KEY,d)}catch(err){toast("写真は今回だけ表示（保存容量不足）")}
   showPhoto(d,+$("#photoOp").value);toast("✅ 背景に追加しました");
  };
  img.onerror=()=>toast("この形式の写真は読み込めません（JPEG/PNGで）");
  img.src=fr.result;
 };
 fr.readAsDataURL(f);
};
$("#photoOp").oninput=e=>{
 $("#photoBg").style.opacity=e.target.value/100;
 try{localStorage.setItem(PO_KEY,e.target.value)}catch(err){}
};
$("#rmPhoto").onclick=()=>{
 try{localStorage.removeItem(PH_KEY)}catch(e){}
 showPhoto(null,0);toast("写真を消しました");
};

if(window.THREE){initT();render();sizeT();fitT()}
else{$("#stage").style.display="none";$("#open3").style.display="none";render()}

/* ---------- クラウド保存・共有 ---------- */
let DB=null,plans=[];
function sizeLabel(i){return SIZES[i]?SIZES[i][0]:"?"}
function planMeta(p){
 const total=(p.rows||[]).reduce((s,r)=>s+(r.l||0),0);
 return `${p.dateLabel||""}　${sizeLabel(p.s)}　全長${fmt(total)}mm`;
}
function renderPlans(){
 const box=$("#planList");
 if(!plans.length){box.innerHTML='<div class="pempty">保存されたプランはまだありません</div>';return}
 box.innerHTML="";
 plans.forEach(p=>{
  const el=document.createElement("div");el.className="pcard";
  el.innerHTML=`<button class="pmain"><b></b><span></span></button><button class="pdel" aria-label="削除">🗑️</button>`;
  el.querySelector(".pmain b").textContent=p.title||"無題プラン";
  el.querySelector(".pmain span").textContent=planMeta(p);
  el.querySelector(".pmain").onclick=()=>openPlan(p);
  el.querySelector(".pdel").onclick=(ev)=>{ev.stopPropagation();deletePlan(p)};
  box.appendChild(el);
 });
}
function openPlan(p){
 if(!SIZES[p.s]||!Array.isArray(p.rows)||!p.rows.length){toast("読み込めませんでした");return}
 st.s=p.s;st.rows=JSON.parse(JSON.stringify(p.rows));migrateLegacy(p);st.bl=normBL(p.bl);leg="m";st.info=normInfo(p.info);st.goal=normGoal(p.goal);st.units=normUnits(p.units);sel=0;save();
 $("#sz").value=st.s;render();if(T)fitT();
 closeCloud();toast("「"+(p.title||"無題プラン")+"」を開きました");
}
function deletePlan(p){
 if(!DB)return;
 if(!confirm((p.title||"無題プラン")+" を削除しますか？"))return;
 DB.doc("plans/"+p.id).delete().catch(()=>toast("削除できませんでした（権限がない可能性）"));
}
function noCloud(){
 ["#planList",".saverow","#cloudNote"].forEach(s=>{const e=$(s);if(e)e.style.display="none"});
 $("#cloudTitle").textContent="📤 共有";$("#cloudBtn").textContent="📋";
}
async function initCloud(){
 if(!window.claude){noCloud();return}
 try{DB=await window.claude.use("db")}catch(e){DB=null}
 if(!DB){noCloud();return}
 DB.collection("plans").orderBy("savedAt","desc").limit(30).onSnapshot(
  snap=>{plans=snap.docs.map(d=>({id:d.id,...(d.data()||{})}));renderPlans()},
  ()=>{}
 );
}
const openCloud=()=>{$("#cloudOv").classList.add("on")};
const closeCloud=()=>{$("#cloudOv").classList.remove("on")};
$("#cloudBtn").onclick=openCloud;
$("#closeCloud").onclick=closeCloud;
$("#cloudOv").addEventListener("click",e=>{if(e.target.id==="cloudOv")closeCloud()});
$("#savePlan").onclick=async ()=>{
 if(!DB){toast("保存機能が使えません");return}
 const title=($("#planTitle").value||"").trim()||st.info.site||"無題プラン";
 const now=new Date();
 const dateLabel=now.toLocaleDateString("ja-JP",{month:"numeric",day:"numeric",weekday:"short"});
 try{
  await DB.collection("plans").add({title,dateLabel,savedAt:Date.now(),s:st.s,rows:JSON.parse(JSON.stringify(st.rows)),bl:JSON.parse(JSON.stringify(st.bl)),info:{...st.info},goal:st.goal||0,units:{...st.units}});
  $("#planTitle").value="";
  toast("保存しました");
 }catch(e){
  toast(e&&e.code==="invalid_argument"?"閲覧専用のため保存できません":"保存に失敗しました");
 }
};
const markKind=()=>[...$("#fKind").children].forEach(b=>b.classList.toggle("on",b.dataset.k===st.info.kind));
const closeInfo=()=>$("#infoOv").classList.remove("on");
$("#infoBtn").onclick=()=>{
 $("#fSite").value=st.info.site;$("#fLine").value=st.info.line;markKind();
 $("#infoOv").classList.add("on");
};
$("#fSite").oninput=e=>{st.info.site=e.target.value.slice(0,40);save();renderInfo()};
$("#fLine").oninput=e=>{st.info.line=e.target.value.slice(0,40);save();renderInfo()};
$("#fKind").onclick=e=>{
 const b=e.target.closest("button");if(!b)return;
 st.info.kind=st.info.kind===b.dataset.k?"":b.dataset.k;save();markKind();renderInfo();
};
$("#closeInfo").onclick=closeInfo;
$("#doneInfo").onclick=closeInfo;
$("#infoOv").addEventListener("click",e=>{if(e.target.id==="infoOv")closeInfo()});

function shareUrl(){
 const data=encodeURIComponent(JSON.stringify({s:st.s,rows:st.rows,ps:st.ps,bl:st.bl,sup:st.sup,gnd:st.gnd,info:st.info,goal:st.goal,units:st.units}));
 const base=location.origin&&location.origin!=="null"?location.origin+location.pathname:location.href.split("#")[0];
 return base+"#p="+data;
}
async function shareNow(){
 const url=await shareLinkZ();
 if(navigator.share){
  try{await navigator.share({title:"冷媒配管の曲げ共有",text:"🕒 "+nowStr()+" に送信\n"+shareSummary()+"\n▼タップでアプリに開く",url});return}
  catch(e){if(e&&e.name==="AbortError")return}
 }
 try{await navigator.clipboard.writeText(url);toast("リンクをコピーしました。LINEなどに貼り付けてください")}
 catch(e){toast("コピーできませんでした")}
}
const APP_URL="https://akija114.github.io/Reibai-Magememo/";
async function sendOrCopy(opt,okMsg){
 if(navigator.share){
  try{await navigator.share(opt);return}
  catch(e){if(e&&e.name==="AbortError")return}
 }
 const t=opt.url||opt.text;
 try{await navigator.clipboard.writeText(t);toast(okMsg)}
 catch(e){$("#shareOv").classList.remove("on");$("#impTxt").value=t;$("#impOv").classList.add("on");$("#impTxt").select();toast("長押しでコピーしてください")}
}
const closeShare=()=>$("#shareOv").classList.remove("on");
$("#quickShare").onclick=()=>$("#shareOv").classList.add("on");
$("#closeShare").onclick=closeShare;
$("#shareOv").addEventListener("click",e=>{if(e.target.id==="shareOv")closeShare()});
$("#shApp").onclick=()=>sendOrCopy({title:"冷媒配管の曲げ共有",text:"冷媒配管の曲げ共有📐 ",url:APP_URL},"URLをコピーしました");
$("#shCopy").onclick=async()=>{
 const t=await exportTextZ();
 try{await navigator.clipboard.writeText(t);toast("コピーしました。LINEなどに貼り付けてください")}
 catch(e){closeShare();$("#impTxt").value=t;$("#impOv").classList.add("on");$("#impTxt").select();toast("長押しでコピーしてください")}
};
$("#shSend").onclick=()=>shareNow();
$("#shPaste").onclick=()=>{closeShare();$("#impTxt").value="";$("#impOv").classList.add("on")};
$("#shMore").onclick=()=>{closeShare();$("#cloudBtn").click()};
/* 寸法計算 */
const OFS=[45,30,15];
let ofsMode="add";
function ofsVal(){
 const sx=+($("#ofsH .on")||{dataset:{v:1}}).dataset.v,sy=+($("#ofsV .on")||{dataset:{v:1}}).dataset.v;
 const x=Math.max(0,uParse($("#ofsX").value)||0)*sx,y=Math.max(0,uParse($("#ofsY").value)||0)*sy;
 const d=Math.hypot(x,y),t=normT(Math.atan2(x,y)*180/Math.PI);
 return{x,y,d,t};
}
function renderCalc(){
 const k=sel,{x,y,d,t}=ofsVal(),box=$("#ofsCards");
 box.innerHTML="";
 $("#ofsRes").innerHTML=d>0?`合わせた差 <b>${fmt(d)}mm</b>　曲げる向き <b>${dirName(t)}</b>`+(x&&y?`<br><small>（${x>0?"右":"左"}${fmt(Math.abs(x))}・${y>0?"上":"下"}${fmt(Math.abs(y))} → 斜めに${fmt(d)}ずらす）</small>`:""):"ずらしたい寸法を入れてください";
 [...$("#ofsMode").children].forEach(b=>b.classList.toggle("on",b.dataset.v===ofsMode));
 OFS.forEach(deg=>{
  const th=deg*Math.PI/180,b=document.createElement("button");b.className="card2";
  b.innerHTML=`<i>${deg}°</i><span>斜め<b>${d?fmt(d/Math.sin(th)):"-"}</b></span><span>進み<b>${d?fmt(d/Math.tan(th)):"-"}</b></span>`;
  b.onclick=()=>applyOffset(deg);box.appendChild(b);
 });
 $("#ofsNote").innerHTML=TI("tap")+(ofsMode==="add"?"角度をタップすると、最後に「曲げ→斜め→曲げ戻し→直管」を追加します":(k<1?"2行目以降の行を選んでから使います":`タップで ${nm(k-1)} の曲げと ${nm(k)} の斜めに入れます（${nm(k)}は反対向きで戻す）`));
 const g=st.goal||0,c=calc(),rest=c.tot-LR()[k].l,need=g-rest,gr=$("#goalRes"),ga=$("#goalApply");
 if(!g){gr.textContent="目標の合計を入れると、選んだ行の長さを自動で出します";ga.style.display="none";return}
 ga.style.display="block";
 if(need<0){gr.textContent=`⚠️ ${nm(k)}以外だけで ${fmt(rest)}mm あり、目標を超えています`;ga.disabled=true;ga.textContent="入れられません"}
 else{gr.innerHTML=`今の合計 <b>${fmt(c.tot)}</b> → ${nm(k)} を <b>${fmt(need)}mm</b> にすると <b>${fmt(g)}</b> に合います`;ga.disabled=false;ga.textContent=`✅ ${nm(k)} を ${fmt(need)}mm にする`}
}
function applyOffset(deg){
 const {d,t}=ofsVal();
 if(d<=0){toast("ずらしたい寸法を入れてください");return}
 const L=Math.round(d/Math.sin(deg*Math.PI/180)),rows=LR();
 if(ofsMode==="add"){
  const last=rows[rows.length-1];
  if(last&&!last.a){last.a=deg;last.t=t;last.o=false}else rows.push({l:300,a:deg,t:t,o:false});
  rows.push({l:L,a:deg,t:0,o:true},{l:500,a:0,t:0,o:false});
  sel=rows.length-2;
  save();render();if(T)fitT(true);$("#calcOv").classList.remove("on");
  toast(`最後に ${deg}°・${dirName(t)} のずらし（斜め${fmt(L)}mm）を追加しました`);
  return;
 }
 const k=sel;if(k<1){toast("2行目以降の行を選んでください");return}
 const pv=rows[k-1],cu=rows[k];
 pv.a=deg;pv.t=t;pv.o=false;cu.a=deg;cu.l=L;cu.o=true;
 save();render();if(T)fitT(true);$("#calcOv").classList.remove("on");
 toast(`${nm(k)} を ${fmt(L)}mm・${deg}° に（${nm(k-1)}も${deg}°・${dirName(t)}）`);
}
["#ofsH","#ofsV","#ofsMode"].forEach(q=>$(q).onclick=e=>{const b=e.target.closest("button");if(!b)return;
 if(q==="#ofsMode")ofsMode=b.dataset.v;else[...$(q).children].forEach(x=>x.classList.toggle("on",x===b));renderCalc()});
$("#calcBtn").onclick=()=>{$("#goalIn").value=st.goal?uVal(st.goal):"";if(IN()&&!$("#ofsX").dataset.u){$("#ofsX").value=uVal(300);$("#ofsX").dataset.u=1}renderCalc();$("#calcOv").classList.add("on")};
$("#closeCalc").onclick=()=>$("#calcOv").classList.remove("on");
$("#calcOv").addEventListener("click",e=>{if(e.target.id==="calcOv")$("#calcOv").classList.remove("on")});
$("#ofsX").oninput=renderCalc;$("#ofsY").oninput=renderCalc;$("#ofsX").onfocus=e=>e.target.select();$("#ofsY").onfocus=e=>e.target.select();
$("#goalIn").oninput=e=>{st.goal=normGoal(uParse(e.target.value)||0);save();upd();renderCalc()};
$("#goalApply").onclick=()=>{
 const k=sel,need=(st.goal||0)-(calc().tot-LR()[k].l);
 if(need<0)return;
 LR()[k].l=need;save();render();$("#calcOv").classList.remove("on");toast(`${nm(k)} を ${fmt(need)}mm にしました`);
};
function enc(o){return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")}
function dec(s){s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";return JSON.parse(decodeURIComponent(escape(atob(s))))}
/* 送るデータ：JSONを圧縮（deflate）して短い文字にする。古い #PBM: も読める */
const b64u=u=>{let s2="";for(let i=0;i<u.length;i+=8192)s2+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(s2).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")};
const ub64=s2=>{s2=s2.replace(/-/g,"+").replace(/_/g,"/");while(s2.length%4)s2+="=";const b=atob(s2),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
async function encZ(o){const raw=new TextEncoder().encode(JSON.stringify(o));
 if(typeof CompressionStream==="undefined")return "j"+b64u(raw);
 const cs=new Blob([raw]).stream().pipeThrough(new CompressionStream("deflate-raw"));return "z"+b64u(new Uint8Array(await new Response(cs).arrayBuffer()))}
async function decZ(s2){const t=s2[0],u=ub64(s2.slice(1));let bytes=u;
 if(t==="z"){const ds=new Blob([u]).stream().pipeThrough(new DecompressionStream("deflate-raw"));bytes=new Uint8Array(await new Response(ds).arrayBuffer())}
 return JSON.parse(new TextDecoder().decode(bytes))}
const shareData=()=>{const d={s:st.s,ps:st.ps,rows:st.rows,bl:st.bl,gnd:st.gnd,sup:st.sup,info:st.info,goal:st.goal,units:st.units};if(st.bld&&st.bld.length)d.bld=st.bld;return d};
async function shareLinkZ(){return APP_URL+"#z="+await encZ(shareData())}
function shareSummary(){
 const i=st.info,kind=i.kind==="液"?"液管":i.kind==="ガス"?"ガス管":"";
 const head=[i.site,i.line,kind,brOn()?"分岐あり":SIZES[st.s][0]].filter(Boolean).join(" / ");
 const ar={0:"⬆️",90:"➡️",180:"⬇️",270:"⬅️"};let n=0;const MAX=30;
 const legText=g=>{const c=calc(g),rows=legRows(g);
  const ls=rows.map((r,k)=>`${nm(k)} ${fmt(r.l)}mm ${r.a?r.a+"°"+(ar[effT(k,rows)]||dirShort(effT(k,rows))):"直管"} シュー${fmt(c.out[k].shoe)}`).filter(()=>++n<=MAX);
  return (brOn()?`■${legName(g)} ${SIZES[legSize(g)][0]}\n`:"")+ls.join("\n")};
 const tot=legIds().reduce((a,g)=>a+legRows(g).length,0);
 return `📐曲げ共有 ${head}\n${legIds().map(legText).filter(Boolean).join("\n")}${tot>MAX?"\n…ほか"+(tot-MAX)+"本":""}${bldSummary()}`}
function bldSummary(){const B=st.bld||[];if(!B.length)return "";
 const pos=o=>"（原点から 横"+fmt(o.x)+"・縦"+fmt(o.z)+"）",MAXK=8;
 const fm={wall:o=>"長さ"+fmt(o.w)+" 厚"+fmt(o.d)+(o.full?" 天井まで":" 高さ"+fmt(o.h)),col:o=>fmt(o.w)+"×"+fmt(o.d),beam:o=>"長さ"+fmt(o.w)+" 幅"+fmt(o.d)+"×せい"+fmt(o.h)+" 梁下"+fmt(o.y),
  box:o=>fmt(o.w)+"×"+fmt(o.d)+"×高さ"+fmt(o.h)+" 下面"+fmt(o.y),ind:o=>(o.m&&CAS2M[o.m]?CAS2M[o.m].n:fmt(o.w)+"×"+fmt(o.d)),hole:o=>"φ"+fmt(o.w)+" 中心の高さ"+fmt(o.y),
  out:o=>(OUTM[o.m]?OUTM[o.m].n:"")+" "+fmt(o.w)+"×"+fmt(o.d),spot:o=>fmt(o.w)+"×"+fmt(o.d),door:o=>(o.m==="swing"?"開き戸":"引き戸")+" 幅"+fmt(o.w)+"×高さ"+fmt(o.h)};
 const out=[];["ind","wall","door","col","beam","box","hole","out","spot"].forEach(k=>{const L=B.filter(o=>o.k===k);if(!L.length)return;const K=BLDK[k];
  out.push(K.i+" "+K.n+" "+L.length+"個");L.slice(0,MAXK).forEach(o=>out.push("　・"+fm[k](o)+pos(o)));if(L.length>MAXK)out.push("　…ほか"+(L.length-MAXK)+"個")});
 return "\n"+out.join("\n")}
const nowStr=()=>{const d=new Date(),p=n=>("0"+n).slice(-2);return d.getFullYear()+"/"+(d.getMonth()+1)+"/"+d.getDate()+"（"+"日月火水木金土"[d.getDay()]+"） "+d.getHours()+":"+p(d.getMinutes())};
async function exportTextZ(){return "🕒 "+nowStr()+" にコピー\n"+shareSummary()+(T&&T.hits&&T.hits.length?"\n⚠️ 配管が当たっている所："+T.hits.map(h=>(BLDK[h.k]?BLDK[h.k].n:"")).join("・"):"")+"\n――――――――\n📥 アプリの「貼り付けて読込」に、この文章を丸ごと貼り付けると同じ図が開きます（下のリンクをタップしても開きます）\n"+await shareLinkZ()}
function exportText(){
 const i=st.info;
 const kind=i.kind==="液"?"液管":i.kind==="ガス"?"ガス管":"";
 const head=[i.site,i.line,kind,brOn()?"分岐あり":SIZES[st.s][0]].filter(Boolean).join(" / ");
 const ar={0:"⬆️",90:"➡️",180:"⬇️",270:"⬅️"};
 const legText=g=>{
  const c=calc(g),rows=legRows(g);
  const ls=rows.map((r,k)=>`${nm(k)} ${fmt(r.l)}mm ${r.a?r.a+"°"+(ar[effT(k,rows)]||dirShort(effT(k,rows))):"直管"} シュー${fmt(c.out[k].shoe)} 累計${fmt(c.out[k].cum)}`);
  return (brOn()?`■${legName(g)} ${SIZES[legSize(g)][0]}\n`:"")+ls.join("\n");
 };
 const body=legIds().map(legText).join("\n");
 const supLine=st.sup.on?"🔩支持 "+supSummary()+"\n":"";
 return `📐曲げ共有 ${head}\n${body}\n${supLine}（アプリの「📥貼り付けて読込」に、この下の行ごと貼り付け）\n#PBM:${enc({s:st.s,ps:st.ps,rows:st.rows,bl:st.bl,gnd:st.gnd,sup:st.sup,info:st.info,goal:st.goal,units:st.units,bld:st.bld})}`;
}
function applyData(d){
 if(!d||!SIZES[d.s]||!Array.isArray(d.rows)||!d.rows.length)return false;
 migrateLegacy(d);
 st={s:d.s,rows:d.rows.slice(0,60).map(r=>({l:Math.max(0,+r.l||0),a:ANG.includes(+r.a)?+r.a:0,t:normT(r.t),o:!!r.o})),info:normInfo(d.info),goal:normGoal(d.goal),units:normUnits(d.units),ps:SIZES[d.ps]?d.ps:null,bl:normBL(d.bl),sup:d.sup?normSup(d.sup):st.sup,gnd:d.gnd?normGnd(d.gnd):st.gnd,bld:normBld(d.bld),scan:st.scan};
 leg="m";sel=0;save();$("#sz").value=st.s;render();if(T)fitT();return true;
}
async function importTextZ(txt){const m=txt.match(/[#&]z=([jz][A-Za-z0-9_\-]+)/);if(m){try{return applyData(await decZ(m[1]))}catch(e){return false}}return importText(txt)}
function importText(txt){
 let d=null;
 {const b=txt.indexOf("#BLD:");if(b>=0){try{let j=JSON.parse(txt.slice(b+5).trim());if(!Array.isArray(j))j=j.bld;const a=normBld(j);if(a.length){st.bld=a;st.bldHide=false;save();render();if(T){build3D();fitT(true)}return true}}catch(e){}return false}}
 try{
  const m=txt.match(/#PBM:([A-Za-z0-9_\-]+)/);
  if(m)d=dec(m[1]);
  else{const u=txt.match(/#p=([^\s]+)/);if(u)d=JSON.parse(decodeURIComponent(u[1]))}
 }catch(e){}
 return applyData(d);
}
$("#copyTxt").onclick=async()=>{
 const t=shareSummary()+"\n"+await shareLinkZ();
 try{await navigator.clipboard.writeText(t);toast("コピーしました。LINEなどに貼り付けてください")}
 catch(e){closeCloud();$("#impTxt").value=t;$("#impOv").classList.add("on");$("#impTxt").select();toast("長押しでコピーしてください")}
};
$("#pasteTxt").onclick=()=>{closeCloud();$("#impTxt").value="";$("#impOv").classList.add("on")};
$("#closeImp").onclick=()=>$("#impOv").classList.remove("on");
$("#impOv").addEventListener("click",e=>{if(e.target.id==="impOv")$("#impOv").classList.remove("on")});
$("#doImp").onclick=async()=>{
 if(await importTextZ($("#impTxt").value)){$("#impOv").classList.remove("on");toast("読み込みました")}
 else toast("読み込めませんでした。テキストを確認してください");
};
$("#shareLink").onclick=shareNow;
const IS_APP=(()=>{try{return window.navigator.standalone===true||matchMedia("(display-mode: standalone)").matches}catch(e){return false}})();
function sheetMsg(html,btns){const ov=document.createElement("div");ov.style.cssText="position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:flex-end;justify-content:center";
 ov.innerHTML=`<div style="background:#fff;color:#0f172a;width:100%;max-width:520px;border-radius:18px 18px 0 0;padding:16px 16px calc(env(safe-area-inset-bottom,0px) + 16px);font-size:14.5px;line-height:1.6">${html}<div class="smb" style="display:flex;flex-direction:column;gap:8px;margin-top:12px"></div></div>`;
 const B=ov.querySelector(".smb");btns.forEach(([t,f,bg,fg])=>{const b=document.createElement("button");b.textContent=t;b.style.cssText=`min-height:48px;border-radius:12px;font-weight:800;font-size:15px;border:0;background:${bg||"#e2e8f0"};color:${fg||"#0f172a"}`;b.onclick=()=>{ov.remove();f&&f()};B.appendChild(b)});
 document.body.appendChild(ov);return ov}
(async function(){const m=location.hash.match(/^#z=([jz][A-Za-z0-9_\-]+)/);if(!m)return;const code=m[1];
 try{const d=await decZ(code);if(applyData(d)){history.replaceState(null,"",location.pathname);toast("送られたプランを開きました");
  if(!IS_APP)setTimeout(()=>sheetMsg(`<b style="font-size:17px">📲 ホーム画面のアプリで開くには</b><p style="margin-top:6px">iPhoneは、リンクをタップすると必ずSafariで開きます（ホーム画面のアプリには直接届きません）。</p><p><b>① 下の「アプリ用にコピー」</b>を押す<br><b>② ホーム画面の「曲げ共有」</b>を開く<br><b>③ 上に出る「📋 コピーしたプランを開く」</b>を押す</p>`,
   [["📋 アプリ用にコピー",async()=>{try{await navigator.clipboard.writeText(APP_URL+"#z="+code);toast("コピーしました。ホーム画面のアプリを開いてください")}catch(e){toast("コピーできませんでした")}},"#16a34a","#fff"],["このままSafariで見る"]]),600)}}
 catch(e){toast("リンクのデータを読めませんでした")}})();
/* ホーム画面のアプリ：開いた時・戻ってきた時に「コピーしたプランを開く」を出す（iPhoneはタップしないとコピーを読めない） */
let PASTE_T=0;
function pasteBanner(){if(!IS_APP||document.hidden)return;if(Date.now()-PASTE_T<4000)return;PASTE_T=Date.now();
 let b=$("#pasteBan");if(!b){b=document.createElement("button");b.id="pasteBan";b.style.cssText="position:fixed;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 8px);z-index:9998;min-height:50px;border-radius:14px;border:0;background:#16a34a;color:#fff;font-weight:800;font-size:15px;box-shadow:0 6px 20px rgba(0,0,0,.3);transition:opacity .3s";document.body.appendChild(b)}
 b.textContent="📋 LINEなどでコピーしたプランを開く";b.style.opacity="1";b.style.display="block";clearTimeout(b._t);b._t=setTimeout(()=>{b.style.opacity="0";setTimeout(()=>b.style.display="none",300)},7000);
 b.onclick=async()=>{b.style.display="none";let t="";try{t=await navigator.clipboard.readText()}catch(e){toast("コピーを読めませんでした（「ペースト」を押してください）");return}
  if(!/[#&]z=[jz]|#PBM:|#p=/.test(t)){toast("コピーされているのは、プランのリンクではありません");return}
  sheetMsg(`<b style="font-size:17px">📥 コピーしたプランを開きますか？</b><p style="margin-top:6px">今の内容は、送られてきたプランに置きかわります。</p>`,[["開く",async()=>{if(await importTextZ(t))toast("開きました");else toast("読み込めませんでした")},"#16a34a","#fff"],["やめる"]])}}
if(IS_APP){setTimeout(pasteBanner,800);document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(pasteBanner,300)})}
(function loadFromHash(){
 const m=location.hash.match(/^#p=(.+)$/);
 if(!m)return;
 try{
  const d=JSON.parse(decodeURIComponent(m[1]));
  if(SIZES[d.s]&&Array.isArray(d.rows)&&d.rows.length){
   applyData(d);
   $("#sz").value=st.s;render();if(T)fitT();
   history.replaceState(null,"",location.pathname);
   toast("送られたプランを開きました");
  }
 }catch(e){}
})();
hist=[JSON.stringify(st)];hi=0;updUndoUI();
$("#open3").innerHTML=`<img alt="" src="${icoSrc("bender")}" style="width:26px;height:26px;vertical-align:-7px;margin-right:4px">曲げ手順`;
$("#open3").onclick=openGuide;
initCloud();

/* ほかのアプリにある機能を、このアプリから呼ばれた時の案内 */
(function(){const go=(n,u)=>()=>{if(confirm(n+"は「"+(u==="zumen.html"?"📐 図面":"📹 現調")+"」アプリにあります。開きますか？"))location.href=u};
 const F={openSpecReader:["仕様書（PDF）を読む機能","zumen.html"],openDraw:["図面の読み込み","zumen.html"],openRoute:["ルートおまかせ","zumen.html"],openScan:["部屋のスキャン","zumen.html"],startXR:["AR","genchou.html"]};
 for(const k in F)if(typeof window[k]!=="function")window[k]=go(...F[k]);})();
