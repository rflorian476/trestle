/* ===== v22 ===== */
/* Titles: the server now sends view-specific first-HTML titles for /p/<id>, /pro/<id>, /job/<id> and /compare/<id>.
   The app sets the same text after every render (v8Meta used to run once on a timer, which could fire before the
   first render, so /p/<id> fell back to "Pro profile · Sawyer — …" after mounting). */
function v22Title(){if(typeof document==="undefined"||typeof ROUTE==="undefined"||!ROUTE)return;const v=ROUTE.v,p=ROUTE.p;
 if(v==="job"||v==="compare"){const j=(DB.jobs||[]).find(x=>x.id===p);if(j&&j.title)document.title=(v==="compare"?"Compare bids: ":"")+String(j.title).slice(0,120)+" · Sawyer"}}
if(typeof document!=="undefined"&&typeof render==="function"){const or=render;render=function(){const r=or.apply(this,arguments);try{if(typeof v8Meta==="function")v8Meta();v22Title()}catch(e){}return r}}
/* Perf: signed-out /find arrives prerendered (#pre11). On the first app render, the photos that already painted are kept
   (same element, the app's attributes copied on), so the largest paint doesn't restart when the app mounts. */
if(typeof document!=="undefined"&&typeof render==="function"){const or=render;let first=true;render=function(){
 const pre=first&&document.getElementById("pre11");first=false;const olds=pre&&ROUTE_IS_FIND()?[...pre.querySelectorAll("img")]:null;const r=or.apply(this,arguments);
 if(olds&&olds.length){try{const pool=new Map();for(const o of olds){const k=o.getAttribute("src")+"|"+(o.getAttribute("srcset")||"");if(!pool.has(k))pool.set(k,[]);pool.get(k).push(o)}
  for(const nu of document.querySelectorAll("#app img")){const k=nu.getAttribute("src")+"|"+(nu.getAttribute("srcset")||"");const q=pool.get(k);if(!q||!q.length)continue;const old=q.shift();
   for(const a of [...nu.attributes])if(a.name!=="loading"&&a.name!=="fetchpriority"&&old.getAttribute(a.name)!==a.value)old.setAttribute(a.name,a.value);nu.replaceWith(old)}
  // the results already painted, so the app's 380 ms loading skeleton doesn't flash over them
  document.querySelectorAll("#app .skel-ov").forEach(x=>x.classList.add("gone"))}catch(e){}}
 return r}}
function ROUTE_IS_FIND(){const p=String(location.pathname||"").replace(/\/+$/,"");return !location.hash&&p==="/find"}
