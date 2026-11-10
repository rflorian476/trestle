/* v13 design pass: home storytelling (hero trust cards, proof band, one "How it works", homeowner + pro
   comparison, stories after the proof), calmer dashboards, quieter search helpers, folded traveler map. */
if(typeof ZIPS!=="undefined"&&!ZIPS["78734"])ZIPS["78734"]=["Lakeway, TX",30.3635,-97.9795];
{const oh=VIEWS.home;VIEWS.home=(...a)=>{let h=oh(...a);try{
 const cut=(re)=>{const m=h.match(re);if(!m)return"";h=h.replace(m[0],"");return m[0]};
 // hero copy
 h=h.replace("<h1>The right pro for every home project</h1>","<h1>Pros you'd trust with your house keys.</h1>")
  .replace(/<p class="v4sub">[^<]*<\/p>/,'<p class="v4sub">Licensed, insured local pros. At most 3 quotes, no spam calls, and you pay by milestone, only after you sign off.</p>');
 // hero trust cards: a real top-rated pro from the directory + how money moves
 const tl=searchPros({zip:"78704",miles:120,sort:"rating"}).filter(x=>x.r.n&&x.u.verified),top=tl.find(x=>(x.u.gal12||[]).length)||tl[0];
 if(top){const {u,r}=top;h=h.replace(/(<div class="v4hero-img">[\s\S]*?)(<\/div><\/div><\/section>)/,(m,a,b)=>a+`<a class="v13hc v13hc-pro" href="${href("pro",u.id)}">${avatar(u)}<span><b>${esc(u.biz||nameOf(u))}</b><small>${I("star",13)} ${r.avg.toFixed(1)} · ${r.n} verified review${r.n>1?"s":""}</small></span><em>${I("check",13)}License + insurance checked</em></a><div class="v13hc v13hc-pay" aria-hidden="true"><span class="v13hc-i">${I("lock",16)}</span><span><b>Milestone held</b><small>Released when you approve</small></span></div>`+b)}
 // proof band instead of small counts
 h=h.replace(/<section class="v4band"[\s\S]*?<\/section>/,()=>`<section class="v4band v13band" aria-label="What you get with __BRAND__"><div class="v4w v4stats">${[["dollar","$0","lead fees for pros, ever"],["users","3 max","pros per request, shown openly"],["lock","Private","your number, until you share it"],["shield","Escrow","milestone payments, test mode"]].map(([ic,b,s])=>`<div><span class="v13b-i">${I(ic,18)}</span><b>${b}</b><span>${s}</span></div>`).join("")}</div></section>`);
 // one "How it works": the tabbed homeowner/pro/traveler steps live in the .v4how band
 const how=cut(/<section class="wrap t6how" id="homeHow">[\s\S]*?<\/section>/);
 if(how)h=h.replace(/<section class="v4sec v4alt v4how">[\s\S]*?<\/section>/,()=>`<section class="v4sec v4alt v4how"><div class="v4w">${how.replace('<section class="wrap t6how" id="homeHow">','<div class="t6how" id="homeHow">').replace(/<\/section>$/,"</div>")}</div></section>`);
 // comparison right after "Why": homeowners and pros
 const vs=cut(/<section class="wrap t6vs" id="homeVs">[\s\S]*?<\/section>/);
 if(vs){const ho=[["What it costs you","Free to post and message","Free to request"],["Who contacts you","Up to 3 pros, shown openly","Matched pros, often several"],["Your phone number","Private, chat in the app","Shared with matched pros"],["Paying the pro","Milestone escrow, released on your OK","Arranged with the pro"]];
  const tbl=`<div class="t6vs-t card" role="table" aria-label="__BRAND__ compared with Angi, for homeowners" id="vsH"><div class="t6vs-r hd" role="row"><span role="columnheader"><span class="sr">Feature</span></span><span role="columnheader" class="me">__BRAND__</span><span role="columnheader">Angi</span></div>${ho.map(([k,x,y])=>`<div class="t6vs-r" role="row"><span role="rowheader">${k}</span><span role="cell" class="me">${I("check",16)}${x}</span><span role="cell">${y}</span></div>`).join("")}</div>`;
  let v=vs.replace("<h2>__BRAND__ vs. Angi, for pros.</h2>",`<h2>__BRAND__ vs. Angi.</h2><div class="v13vs-tabs" role="tablist" aria-label="Compare for"><button type="button" role="tab" aria-selected="true" class="on" data-vs13="H">${I("home",16)}For homeowners</button><button type="button" role="tab" aria-selected="false" data-vs13="P">${I("wrench",16)}For pros</button></div>`)
   .replace('<div class="t6vs-t card" role="table" aria-label="__BRAND__ compared with Angi"',tbl+'<div class="t6vs-t card" role="table" aria-label="__BRAND__ compared with Angi, for pros" id="vsP" hidden')
   .replace("Angi column reflects its publicly described pay-per-lead model for service pros;","Angi column reflects its publicly described model: requests are matched to pros, who pay per lead;");
  const w=h.indexOf('<section class="v4sec v4w" id="whySawyer"');const we=w<0?-1:h.indexOf("</section>",w);if(we>0)h=h.slice(0,we+10)+v+h.slice(we+10);else h+=v}
 // stories after the top pros, travel work for contractors last before the final CTAs
 const proof=cut(/<section class="t6proof" id="homeProof">[\s\S]*?<\/div><\/div><\/section>/);
 if(proof){const f=h.indexOf('<section class="v4sec v4alt v4feat"');const fe=f<0?-1:h.indexOf("</section>",h.indexOf('<div class="v4pro-g">',f));if(fe>0)h=h.slice(0,fe+10)+proof+h.slice(fe+10);else h+=proof}
 const trav=cut(/<section class="v4sec v4w t5home" id="travelHome">[\s\S]*?<\/section>/);
 if(trav){const s=h.indexOf('<section class="v4w v4split"');h=s<0?h+trav:h.slice(0,s)+trav+h.slice(s)}
 // top-rated pros: the pro's own first photo, or the honest tile (never a stock photo posing as their work)
 h=h.replace(/(<a class="v4pro" href="#\/pro\/([^"]+)"><div class="v4pro-img">)<img [^>]*>/g,(m,a,id)=>{const u=U(id);return u&&typeof v13CardImg==="function"?a+v13CardImg(u):m});
 }catch(e){}return h}}
{const oa=AFTER.home;AFTER.home=(...a)=>{oa&&oa(...a);const tabs=[...document.querySelectorAll("[data-vs13]")];tabs.forEach(b=>b.onclick=()=>tabs.forEach(x=>{const on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-selected",on);const t=document.getElementById("vs"+x.dataset.vs13);if(t)t.hidden=!on}))}}
/* traveler board: calls first; the state map stays folded until someone opens it (remembered for the session) */
{const oa=AFTER.travel;AFTER.travel=(...a)=>{oa&&oa(...a);try{const m=document.getElementById("tMap");if(!m)return;m.open=sessionStorage.tMapO==="1";m.addEventListener("toggle",()=>{sessionStorage.tMapO=m.open?"1":"0"})}catch(e){}}}
/* dashboards: town instead of a bare ZIP, "property log" for businesses, no second "invoices due" card when what's-next already has Pay */
{const od=VIEWS.dash;VIEWS.dash=(...a)=>{let h=od(...a);try{const m=me();if(!m)return h;
 h=h.replace(/(<p class="uh-s">)(\d{5})( ·)/,(x,a,z,b)=>a+esc(townOf(z)||z)+b);
 if(m.biz&&m.role==="customer")h=h.replace("<b>Your home log</b>","<b>Your property log</b>");
 if(/<div class="v13-dtop">[\s\S]*?href="#\/pay\//.test(h)&&!/estimates? waiting for your approval/.test(h))h=h.replace(/<div class="o7-wrap"><a class="card v7billcard"[\s\S]*?<\/a><\/div>/,"");
 }catch(e){}return h}}
/* QA sweep-1 SW-011/SW-022: every view has exactly one H1 (visually hidden when the design has none), Find cards sit
   under an H2, and unknown routes get a real "Page not found" H1 + document title */
VIEWS.notfound=()=>`<section class="page narrow"><div class="empty nf13">${I("map",28)}<h1>Page not found</h1><p class="muted">That link doesn't go anywhere. It may have moved, or the address has a typo.</p><div class="row wrapr"><a class="btn primary" href="#/home">Go home</a><a class="btn ghost" href="${href("find")}">Find a pro</a></div></div></section>`;
if(typeof document!=="undefined"&&typeof render==="function"){const or=render;render=function(){const r=or.apply(this,arguments);try{const app=document.getElementById("app");if(!app)return r;
 if(!VIEWS[ROUTE.v]){document.title="Page not found · Sawyer"}
 if(!app.querySelector("h1")){const t=(document.title||"Sawyer").split(" · ")[0].split(": ")[0];app.insertAdjacentHTML("afterbegin",`<h1 class="sr" data-h13>${esc(t)}</h1>`)}
 /* QA SW-012 + axe: aria-pressed only on button roles, tabs inside tablists, named icon buttons, focusable scrollers */
 app.querySelectorAll("a[aria-pressed]:not([role])").forEach(a=>a.setAttribute("role","button"));
 app.querySelectorAll('[role=tablist]>a:not([role])').forEach(a=>{a.setAttribute("role","tab");if(!a.hasAttribute("aria-selected"))a.setAttribute("aria-selected",a.classList.contains("on")||a.getAttribute("aria-current")==="page"?"true":"false")});
 app.querySelectorAll("button[data-view]:not([aria-label])").forEach(b=>b.setAttribute("aria-label",b.dataset.view==="map"?"Map view":"Grid view"));
 app.querySelectorAll(".tablewrap,.j9steps,ol").forEach(e=>{if(e.scrollWidth>e.clientWidth+2&&!e.querySelector("a,button,input,select,textarea,[tabindex]"))e.tabIndex=0});
 app.querySelectorAll('[role=columnheader]').forEach(e=>{if(!e.textContent.trim())e.innerHTML='<span class="sr">Feature</span>'});
 const res=app.querySelector(".fx-res");if(res&&!res.querySelector("h2")&&res.querySelector("h3"))res.insertAdjacentHTML("afterbegin",'<h2 class="sr">Results</h2>');
 }catch(e){}return r}}
