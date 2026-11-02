/* v4 redesign: photo hero, one search, clean sections */
const V4IMG={Plumbing:"t-plumbing",Electrical:"t-electrical",HVAC:"t-hvac",Roofing:"t-roofing",Remodeling:"t-remodel",Painting:"t-painting"};
const v4img=(n,alt,cls,eager)=>`<img class="${cls||""}" src="/img/${n}.webp" alt="${esc(alt||"")}" ${eager?'fetchpriority="high"':'loading="eager"'} decoding="async">`;
const v4stars=r=>r.n?`<span class="v4rt">${I("star",14)}<b>${r.avg.toFixed(1)}</b><span>(${r.n})</span></span>`:`<span class="v4rt v4new">New</span>`;
VIEWS.home=()=>{const m=me(),z=(m&&m.zip)||"78704";let top=searchPros({zip:z,miles:120,sort:"rating"}).filter(x=>x.r.n);if(top.length<4)top=searchPros({zip:z,miles:5000,sort:"rating"}).filter(x=>x.r.n);
 const seen=new Set();top=top.filter(x=>x.u.trade!=="Property Management"&&!seen.has(x.u.trade)&&seen.add(x.u.trade)).slice(0,4);
 const pros=PROS(),cities=new Set(pros.map(u=>townOf(u.zip))).size,vj=DB.jobs.filter(j=>typeof confirmedJob==="function"?confirmedJob(j):j.status==="done").length;
 const cats=Object.keys(V4IMG),more=TRADES.filter(c=>!V4IMG[c]).slice(0,10);let pi=0;
 return`<section class="v4hero"><div class="v4w v4hero-g"><div class="v4hero-t">
 <p class="v4eye">${I("shield",16)}Licensed, insured, reviewed</p>
 <h1>The right pro for every home project</h1>
 <p class="v4sub">Find trusted local pros for any job. Compare up to 3 quotes, chat without sharing your number, and pay only when the work is done.</p>
 <form class="v4search" id="hsf" role="search"><label class="v4f v4f-q"><span>What</span><input id="hq" name="q" placeholder="Plumber, roof repair, panel upgrade" autocomplete="off"></label><label class="v4f v4f-z"><span>Where</span><select id="hz" name="zip">${zipOpts(z)}</select></label><button class="v4go" aria-label="Search">${I("search",20)}<span>Search</span></button></form>
 <ul class="v4ticks"><li>${I("check",16)}Free for homeowners</li><li>${I("check",16)}No spam calls</li><li>${I("check",16)}Max 3 pros per job</li></ul>
 </div><div class="v4hero-img">${v4img("hero","Electrician installing a light fixture in a bright kitchen","",1)}</div></div></section>
 <section class="v4band" aria-label="__BRAND__ by the numbers"><div class="v4w v4stats"><div><b>${pros.length}</b><span>licensed pros</span></div><div><b>${cities}</b><span>cities</span></div><div><b>${vj}</b><span>verified jobs</span></div><div><b>$0</b><span>lead fees, ever</span></div></div></section>
 <section class="v4sec v4w v4cats"><div class="v4head"><h2>Popular services</h2><a class="v4link" href="${href("find")}">See all trades ${I("arrow",16)}</a></div>
 <div class="v4cat-g">${cats.map(c=>`<a class="v4cat" href="${href("find",null,{cat:c})}">${v4img(V4IMG[c],c+" pro at work")}<span>${esc(c)}</span></a>`).join("")}</div>
 <div class="v4more">${more.map(c=>`<a href="${href("find",null,{cat:c})}">${I((typeof TRADE_ICON!=="undefined"&&TRADE_ICON[c])||"wrench",18)}${esc(c)}</a>`).join("")}</div></section>
 <section class="v4sec v4alt v4how"><div class="v4w"><div class="v4head v4c"><h2>How it works</h2><p>Three steps. No phone tag, no surprise fees.</p></div><ol class="v4steps">
 <li><i>1</i><h3>Tell us the job</h3><p>Search or describe it in plain English. Add a photo for a ballpark price in seconds.</p></li>
 <li><i>2</i><h3>Compare up to 3 pros</h3><p>See licenses, insurance, verified reviews and price ranges. Chat in the app, your number stays private.</p></li>
 <li><i>3</i><h3>Hire and pay safely</h3><p>Funds release by milestone, only after you sign off. Then leave a review that actually counts.</p></li></ol></div></section>
 <section class="v4sec v4w" id="whySawyer"><div class="v4head v4c"><h2>Why homeowners and pros choose __BRAND__</h2><p>We fixed what people hate about lead marketplaces.</p></div><div class="v4why">
 ${[["dollar","No lead fees. Ever.","Pros pay a flat $20/mo with one-click cancel. No pay-per-lead, so nobody inflates your quote to cover it."],["users","Max 3 pros per job","Your request goes to at most 3 pros, shown openly. No bidding wars, no flood of calls."],["lock","Your number stays private","Message pros in the app. Share your phone only if and when you choose. No-spam promise."],["shield","Verified reviews only","Reviews come from finished jobs. Pros can reply, and disputes are handled by a person."]].map(([ic,t,d])=>`<article class="v4why-c"><span class="v4ic">${I(ic,22)}</span><h3>${t}</h3><p>${d}</p></article>`).join("")}</div>
 <p class="v4c v4fine"><a class="v4link" href="${href("pricing")}">See how we compare ${I("arrow",16)}</a></p></section>
 <section class="v4sec v4alt v4feat"><div class="v4w"><div class="v4head"><h2>Top-rated pros near ${esc(townOf(z).split(",")[0])}</h2><a class="v4link" href="${href("find",null,{sort:"rating",zip:z})}">Browse all ${I("arrow",16)}</a></div><div class="v4pro-g">
 ${top.map(({u,r})=>{const im=V4IMG[u.trade]||["pro-1","pro-2","pro-3"][pi++%3];return`<a class="v4pro" href="${href("pro",u.id)}"><div class="v4pro-img">${v4img(im,u.trade)}${u.verified?`<span class="v4ver">${I("check",14)}Verified</span>`:""}</div><div class="v4pro-b"><div class="v4pro-h"><b>${esc(u.biz||nameOf(u))}</b>${v4stars(r)}</div><small>${esc(u.trade)} · ${esc(townOf(u.zip))}</small></div></a>`}).join("")}</div></div></section>
 <section class="v4w v4split"><a class="v4cta" href="${href("post")}">${v4img("home-ext","A finished craftsman home at dusk")}<div><small>For homeowners & businesses</small><h3>Get your project done right.</h3><span class="v4btn v4btn-acc">Post a job free ${I("arrow",16)}</span></div></a>
 <a class="v4cta" href="${href("join")}">${v4img("pro-1","A smiling general contractor on a job site")}<div><small>For pros</small><h3>$20 a month. Every lead included.</h3><span class="v4btn v4btn-w">Join as a pro ${I("arrow",16)}</span></div></a></section>`};
{const oa=AFTER.home;AFTER.home=(...a)=>{try{oa&&oa(...a)}catch(e){}}}
let V4N={},V4Q=0;
{const oart=art;art=function(seed,trade,label){if(typeof document==="undefined")return oart(seed,trade,label);const own=V4IMG[trade],pool=own?[own,"t-remodel","home-ext","t-painting"]:["t-remodel","home-ext","t-painting"];if(!V4Q){V4Q=1;setTimeout(()=>{V4N={};V4Q=0})}const k=V4N[trade]=(V4N[trade]||0)+1;const n=pool[(k-1)%pool.length];
 return`<img class="art v4art" src="/img/${n}.webp" alt="${esc(label||trade+" project photo")}" loading="lazy" decoding="async">`}}
