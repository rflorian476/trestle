/* ===== v44: signed-in /dash stylesheet subset =====
   The server sends a signed-in /dash with dash.<hash>.css (only the rules a dashboard uses, see lib/css-split.js) as
   <link id="css44" data-full="/css/dashx.<hash>.css">, so the first paint waits on ~13 KB instead of ~67 KB. The full sheet
   (dashx: every rule minus @font-face, so the font set and text layout don't change) is added after the subset once the page has been idle ~3s after load, or sooner the moment anything
   might need it: the first tap, click or key press, a route change, or any class name the dashboards were never seen
   to use (a modal, a toast, a state the demo data doesn't have). dashx has every rule in the original order and comes last, so the cascade is exactly the usual one. */
const CSS44={known:new Set(__DASH44_CLASSES__),done:false,why:""};
function css44Full(why){if(CSS44.done||typeof document==="undefined")return;CSS44.done=true;const l=document.getElementById("css44");if(!l||!l.dataset.full)return;CSS44.why=why||"";
 /* the subset stays (it holds the @font-face rules); the swap-in sheet has every other rule in order, after it */
 const f=document.createElement("link");f.rel="stylesheet";f.href=l.dataset.full;f.id="css44x";l.after(f)}
function css44Check(){if(CSS44.done)return;const l=document.getElementById("css44");if(!l){CSS44.done=true;return}
 if(typeof ROUTE!=="undefined"&&ROUTE&&ROUTE.v&&ROUTE.v!=="dash")return css44Full("route:"+ROUTE.v);
 for(const e of document.querySelectorAll("body [class]"))for(const c of e.classList)if(!CSS44.known.has(c))return css44Full("class:"+c)}
if(typeof window!=="undefined"&&typeof document!=="undefined"&&document.getElementById("css44")){
 const go=e=>css44Full("input:"+e.type);for(const t of["pointerdown","keydown","touchstart"])addEventListener(t,go,{capture:true,passive:true,once:true});
 let q=0;const mo=new MutationObserver(()=>{if(CSS44.done){mo.disconnect();return}if(q)return;q=1;requestAnimationFrame(()=>{q=0;css44Check()})});
 mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
 const idle=()=>setTimeout(()=>{const f=()=>css44Full("idle");window.requestIdleCallback?requestIdleCallback(f,{timeout:2000}):f()},3000);
 if(document.readyState==="complete")idle();else addEventListener("load",idle,{once:true})}
