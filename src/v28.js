/* ===== v28 ===== */
/* (1) SW-061: a quote started from an Office estimate keeps the cents. The price field gets the exact estimate total
   (2 decimals, the same billCalc total The Office shows), the picker label shows cents, and the note's line items, tax
   and total add up to that price. */
function v28$(n){n=Math.round(Number(n||0)*100)/100;const c=Math.abs(n%1)>0.0001;return"$"+n.toLocaleString("en-US",{minimumFractionDigits:c?2:0,maximumFractionDigits:2})}
v27EstNote=function(b){const on=b.lines.filter(l=>!l.opt||l.on),opt=b.lines.filter(l=>l.opt&&!l.on),c=billCalc(b);
 let t="From estimate "+b.no+": "+on.map(l=>(+l.q!==1?l.q+" × ":"")+l.d+" ("+v28$(l.q*l.r)+")").join("; ")+".";if(opt.length)t+=" Optional add-ons (not in the price): "+opt.map(l=>l.d+" ("+v28$(l.q*l.r)+")").join("; ")+".";
 if(b.tax)t+=" Subtotal "+v28$(c.sub)+" + "+b.tax+"% tax ("+v28$(c.tax)+") = "+v28$(c.total)+".";else t+=" Total "+v28$(c.total)+".";return t.length>1000?t.slice(0,997)+"…":t};
v27EstPick=function(m){const es=v27Ests(m);if(!es.length)return "";
 return`<div class="fld v27e"><label for="v27es">Start from an Office estimate (optional)</label><select id="v27es" name="est"><option value="">Don't use an estimate</option>${es.map(b=>`<option value="${esc(b.id)}">${esc(b.no)} · ${esc(b.title||"Estimate")} · ${v28$(billCalc(b).total)}</option>`).join("")}</select><small class="muted">Fills in the price and line items. You can still edit them.</small></div>`};
v27EstBind=function(f,pid,nid){const s=f&&f.querySelector("#v27es");if(!s)return;s.onchange=()=>{const b=(DB.bills||[]).find(x=>x.id===s.value);if(!b)return;const p=document.getElementById(pid),n=document.getElementById(nid);
 if(p)p.value=(Math.round(billCalc(b).total*100)/100).toFixed(2);if(n)n.value=v27EstNote(b)}};
// a quote with cents reads with cents on the pipeline card ("You quoted $308.51")
{const op=v27Pipe;v27Pipe=function(j,m){const h=op.apply(this,arguments);try{const q=m&&v27Mine(j,m);if(q&&q.price%1)return h.replace("You quoted "+money(q.price),"You quoted "+v28$(q.price))}catch(e){}return h}}

/* (2) SW-062: one tap, one quote, one toast. The quote sheet (#v27qs) and the job-page quote modal (#qf) ignore a second
   submit while the first is being sent: the send button is disabled on the first submit and stays disabled once the quote
   is sent; it comes back only if the quote was refused (so the pro can fix the price and try again). */
function v28Guard(f){if(!f||f.__v28g)return;const h=f.onsubmit;if(typeof h!=="function")return;f.__v28g=1;
 f.onsubmit=function(e){if(e&&e.preventDefault)e.preventDefault();if(f.__busy)return false;f.__busy=1;const bs=[...f.querySelectorAll('button:not([type="button"])')];bs.forEach(b=>{b.disabled=true;b.setAttribute("aria-busy","true")});
  const oq=A.quote;let sent=false;A.quote=function(){const r=oq.apply(this,arguments);sent=!!(r&&r.ok);return r};
  try{return h.call(this,e)}finally{A.quote=oq;if(!sent){f.__busy=0;bs.forEach(b=>{b.disabled=false;b.removeAttribute("aria-busy")})}}}}
{const oq=v27QuickQuote;v27QuickQuote=function(){const r=oq.apply(this,arguments);try{v28Guard(document.getElementById("v27qf"))}catch(e){}return r}}
{const oq=quoteModal;quoteModal=function(){const r=oq.apply(this,arguments);try{v28Guard(document.getElementById("qf"))}catch(e){}return r}}

/* (3) "Set a starting price" counts as done only when at least one service has a real "from" price (more than $0).
   Saving the menu with every price blank (the profile then shows the area's typical price) or $0 leaves the step open. */
function v28HasPrice(m){return Array.isArray(m&&m.menu12)&&m.menu12.some(x=>x&&Number(x.from)>0)}
{const os=v27Steps;v27Steps=function(m){const s=os.apply(this,arguments);try{const p=s.find(x=>x.k==="price");if(p){const ok=v28HasPrice(m),rows=Array.isArray(m.menu12)&&m.menu12.length>0;p.done=ok;
  p.meta=ok?"Starting prices set":rows?"No price above $0 yet":"Not set yet";if(!ok&&rows)p.why="Your services are listed, but none has a starting price yet. Add a \"from $X\" price to at least one service so customers see what you charge."}}catch(e){}return s}}

/* (4) /jobs SEO parity with /prices (66 -> 69). Lighthouse's image-alt audit doesn't apply to a page with no images, so the
   beta noindex weighed more on the job board. Its header now carries a small, labeled real stock photo (Pexels, credited on
   /credits), lazy and sized, so nothing shifts. Shown to signed-out visitors and customers (the prerendered page included). */
const V28JB={src:"/img/x-carpentry-sm.webp",alt:"A carpenter framing a house (stock photo)"};
{const ov=VIEWS.jobs;VIEWS.jobs=function(){const h=ov.apply(this,arguments);try{const m=me();if(m&&m.role!=="customer")return h;
  const img=`<img class="v28jb-ph" id="v28jbPh" src="${V28JB.src}" alt="${esc(V28JB.alt)}" width="400" height="300" loading="lazy" decoding="async">`;
  const k=h.indexOf('<header class="phx phx-jobs"');if(k>=0){const a='<div class="wrap phx-in">',i=h.indexOf(a,k);if(i>=0)return h.slice(0,i)+'<div class="wrap phx-in v28jb">'+img+h.slice(i+a.length)}
  return h.replace('<div class="pagehead">',()=>'<div class="pagehead v28jb">'+img)}catch(e){return h}}}

/* (5) The older "How Sawyer compares" table (/pros, /pricing, the pro dashboard) is dated and hedged like the v27
   Thumbtack/Jobber table: no exact third-party prices we haven't verified, "varies" wording instead, and a visible
   "checked November 2026" line. Sawyer's own terms stay exact. */
COMPETE.splice(0,COMPETE.length,
 ["__BRAND__","$20/mo flat","$0","Completed jobs only"],
 ["HomeAdvisor / Angi","Annual membership fee for pros (amount varies)","Pay per lead, varies by trade and area","Mixed"],
 ["Thumbtack","Free to list","Pay per lead, varies (you set a weekly budget)","Mixed"],
 ["Yelp Ads","Free listing; ads are optional","Ads billed per click, budget varies","Anyone with a Yelp account"]);
compareTable=function(){return`<div class="tablewrap"><table class="compare"><caption class="sr">How Sawyer compares, checked November 2026</caption><thead><tr><th scope="col">Platform</th><th scope="col">Membership</th><th scope="col">Lead fees</th><th scope="col">Who can review</th></tr></thead><tbody>${COMPETE.map((r,i)=>`<tr class="${i?"":"us"}"><th scope="row">${esc(r[0])}</th><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join("")}</tbody></table><p class="muted small v28cmp-n">From each company's public pages, checked November 2026. Lead prices and fees vary by trade, area and plan, and they change, so check each company's site for current details. Trademarks belong to their owners; Sawyer isn't affiliated with them.</p></div>`};

/* (6) In-app new-work notice for pros (email comes later). When a customer posts a job that matches a pro's trade or a
   service they list, inside their service radius, that pro gets a bell notice "New job in your area: <title>" linking
   to the job. The dashboard's "New jobs in your area" card counts the matching jobs posted since the pro's last
   dashboard visit and tags them "New". The last-visit time is private to the pro (never in another user's state,
   signed-out /api/state or prerendered HTML), and notices go only to that pro. */
const V2_ACTIONS28=["seenJobs28"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS28);
function v28Fits(j,u){if(!j||!u||u.role!=="contractor"||u.staff||j.cust===u.id)return false;const sub=j.sub&&(u.subs||[]).includes(j.sub);if(j.cat!==u.trade&&!sub)return false;return dist(u.zip,j.zip)<=(+u.radius||0)}
function v28NoteText(j){return"New job in your area: "+j.title+(j.urgent?" (urgent)":"")}
{const op=A.postJob;A.postJob=function(o){const before=DB.notifs.length;const r=op.apply(this,arguments);if(!r||!r.ok||!r.id)return r;try{const j=DB.jobs.find(x=>x.id===r.id);if(!j)return r;const told=new Set();
  DB.notifs.slice(before).forEach(n=>{if(n.link==="job:"+j.id&&/^New (URGENT )?job near you: /.test(n.text)){const u=U(n.to);if(u&&v28Fits(j,u)){n.text=v28NoteText(j);n.kind28="newjob";told.add(n.to)}}});
  PROS().forEach(u=>{if(!told.has(u.id)&&u.role==="contractor"&&v28Fits(j,u)&&!DB.notifs.slice(before).some(n=>n.to===u.id&&n.link==="job:"+j.id&&/^New /.test(n.text))){notify(u.id,v28NoteText(j),"job:"+j.id);const n=DB.notifs[DB.notifs.length-1];if(n)n.kind28="newjob";told.add(u.id)}});
  save()}catch(e){}return r}}
A.seenJobs28=function(){const m=me();if(!m||m.role!=="contractor")return{ok:false,msg:"Pros only"};m.jobsSeen28=Date.now();save();return{ok:true}};
let V28BASE=null;
function v28Base(m){if(!V28BASE||V28BASE.uid!==m.id)V28BASE={uid:m.id,t:+m.jobsSeen28||Math.max(+m.joined||0,Date.now()-14*864e5),marked:false};return V28BASE.t}
function v28NewJobs(m){const t=v28Base(m);return DB.jobs.filter(j=>j.status==="posted"&&!j.hired&&(+j.created||0)>t&&v28Fits(j,m)&&!(j.interested||[]).includes(m.id)&&!DB.quotes.some(q=>q.job===j.id&&q.cid===m.id))}
{const ov=VIEWS.dash;VIEWS.dash=function(){let h=ov.apply(this,arguments);try{const m=me();if(!m||m.role!=="contractor"||m.staff)return h;const nj=v28NewJobs(m),n=nj.length;
  const a='<div class="ud-h"><h2>New jobs in your area</h2>';const k=h.indexOf(a);if(k<0)return h;
  const badge=n?`<p class="v28new" id="v28new" role="status">${I("bell",14)}<b>${n} new</b> since your last visit</p>`:`<p class="v28new v28new-0" id="v28new" role="status">${I("check",14)}Nothing new since your last visit</p>`;
  const e=h.indexOf("</div>",k);if(e<0)return h;h=h.slice(0,e+6)+badge+h.slice(e+6);
  // tag the new cards ("New" chip on the pipeline strip)
  nj.forEach(j=>{const at=h.indexOf('href="'+href("job",j.id)+'"');if(at<0)return;const st=h.lastIndexOf('<article class="v27jc',at);if(st<0||h.indexOf("</article>",st)<at)return;
   const c=st+'<article class="v27jc'.length;h=h.slice(0,c)+" v28isnew"+h.slice(c);const u='<ul class="v27p-f" aria-label="Why this job fits">',ui=h.indexOf(u,at);const end=h.indexOf("</article>",at);
   if(ui>=0&&ui<end)h=h.slice(0,ui+u.length)+'<li class="v28tag">New</li>'+h.slice(ui+u.length)})}catch(e){}return h}}
{const oa=AFTER.dash;AFTER.dash=function(){const r=oa&&oa.apply(this,arguments);try{const m=me();if(m&&m.role==="contractor"&&!m.staff&&V28BASE&&V28BASE.uid===m.id&&!V28BASE.marked){V28BASE.marked=true;setTimeout(()=>{try{A.seenJobs28()}catch(e){}},600)}}catch(e){}return r}}
