/* ===== v21 ===== */
/* Perf: responsive photos. Every built-in photo under /img/ that has smaller copies (NAME-sm 400w, NAME-md 640/800w,
   generated from the same Pexels originals) gets a srcset and a sizes hint for where it sits, so a 184 px trade tile
   no longer downloads an 800 px photo. Below-the-fold photos must not also ask for high fetch priority. */
const V21IMGW=__IMGW__;
const V21SIZES=[[/\bv4cat\b/,"(max-width: 700px) 46vw, 240px"],[/\bv19-g\b|\bg12\b/,"(max-width: 700px) 46vw, 260px"],[/\bpx-cover\b/,"100vw"],[/\bpc-img\b/,"(max-width: 700px) 82vw, 340px"],[/\bv4pro-img\b|\bt5home-img\b|\bv4cta\b|\bt6simc\b/,"(max-width: 700px) 92vw, 380px"]];
// the closest known container class before the <img> decides the hint (lists repeat the container per card)
function v21Sizes(before,own){let best=-1,out="(max-width: 700px) 92vw, 420px";for(const[re,s]of V21SIZES){if(re.test(own))return s;const g=new RegExp(re.source,"g");let m,last=-1;while((m=g.exec(before)))last=m.index;if(last>best){best=last;out=s}}return out}
function IMGSET(h){h=String(h==null?"":h);if(h.indexOf("/img/")<0&&h.indexOf("fetchpriority")<0)return h;
 return h.replace(/<img\b[^>]*>/g,(t,at)=>{let o=t;
  if(/\bfetchpriority="high"/.test(o)&&/\bloading="lazy"/.test(o))o=o.replace(/\s*fetchpriority="high"/,"");
  const m=/\ssrc="\/img\/([a-z0-9-]+)\.webp"/.exec(o);if(!m||/\ssrcset=/.test(o))return o;const set=V21IMGW[m[1]];if(!set||set.length<2)return o;
  const before=(h.slice(Math.max(0,at-1200),at).match(/class="[^"]*"/g)||[]).join(" ");const own=(/\sclass="([^"]*)"/.exec(o)||[])[1]||"";
  return o.replace(/\ssrc="/,` srcset="${set.map(([f,w])=>"/img/"+f+".webp "+w+"w").join(", ")}" sizes="${v21Sizes(before,own)}" src="`)})}
/* SW-016: pretty in-app links. Templates keep building "#/…" strings (older layers patch them by text), and every link is
   rewritten to its pretty form when it reaches the page: href="#/find?cat=Roofing" becomes href="/find?cat=Roofing" and
   href="#/home" becomes href="/". A click on a same-origin app link navigates in place (pushState) instead of reloading.
   Modified clicks (new tab/window), downloads, target=_blank and non-app paths (/api, /auth, /u, files) behave normally. */
function v21PrettyLinks(root){if(!root||!root.querySelectorAll)return;const fix=a=>{const h=a.getAttribute("href");if(h&&h.startsWith("#/"))a.setAttribute("href",prettyOf(h))};
 if(root.matches&&root.matches('a[href^="#/"]'))fix(root);root.querySelectorAll('a[href^="#/"]').forEach(fix)}
function v21AppPath(p){if(p==="/"||p==="/index.html")return true;const m=/^\/([a-z0-9]{1,20})(?:\/|$)/.exec(p);if(!m)return false;if(m[1]==="p"||m[1]==="t")return /^\/[pt]\/[\w-]{1,40}\/?$/.test(p);
 return m[1]!=="api"&&m[1]!=="auth"&&m[1]!=="notfound"&&Object.prototype.hasOwnProperty.call(VIEWS,m[1])}
if(typeof document!=="undefined"&&document.addEventListener&&typeof MutationObserver!=="undefined"){
 new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.nodeType===1)v21PrettyLinks(n)}).observe(document.documentElement,{childList:true,subtree:true});
 document.addEventListener("DOMContentLoaded",()=>v21PrettyLinks(document.body));
 document.addEventListener("click",e=>{if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const a=e.target&&e.target.closest&&e.target.closest("a[href]");if(!a||(a.target&&a.target!=="_self")||a.hasAttribute("download"))return;
  let raw=a.getAttribute("href")||"";if(raw.startsWith("#/"))raw=prettyOf(raw);if(raw[0]!=="/"||raw[1]==="/")return;
  let u;try{u=new URL(raw,location.origin)}catch(x){return}if(u.origin!==location.origin||!v21AppPath(u.pathname))return;
  e.preventDefault();const was=location.pathname+location.search;
  if(was===u.pathname+u.search&&!location.hash){if(u.hash&&u.hash.length>1){const t=document.getElementById(u.hash.slice(1));if(t)t.scrollIntoView({behavior:"smooth",block:"start"})}else render();return}
  try{history.pushState(null,"",u.pathname+u.search+(u.hash&&!u.hash.startsWith("#/")?u.hash:""))}catch(x){location.href=u.href;return}
  try{window.dispatchEvent(new HashChangeEvent("hashchange"))}catch(x){render()}
  if(u.hash&&u.hash.length>1&&!u.hash.startsWith("#/"))setTimeout(()=>{const t=document.getElementById(u.hash.slice(1));if(t)t.scrollIntoView({block:"start"})},50)});
 // Back/forward between pretty entries: same listeners as a hash change (render, close the modal and menus, …).
 // A traversal that only changes a #/ hash already fires a native hashchange, so it is not sent twice.
 let v21Last=location.pathname+location.search+location.hash;
 window.addEventListener("hashchange",()=>{v21Last=location.pathname+location.search+location.hash});
 window.addEventListener("popstate",()=>{const now=location.pathname+location.search+location.hash;const onlyHash=now.split("#")[0]===v21Last.split("#")[0]&&now!==v21Last;v21Last=now;if(!onlyHash){try{window.dispatchEvent(new HashChangeEvent("hashchange"))}catch(x){render()}}})}
