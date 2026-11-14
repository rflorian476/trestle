/* ===== v27 ===== */
/* (1) A signed-in pro never restarts signup. Opening /join (a bookmark, the "Join as a pro" link, an old email) takes a
   pro account straight to the dashboard's setup flow instead of a blank 6-step wizard; the server does the same with a
   302 for a full page load. The dashboard's guided flow covers the three things that win the first jobs, one step at a
   time: add 3 job photos, set a starting price, submit the Verified packet (license + certificate of insurance). */
function v27Steps(m){const g=(m.gal12||[]).length,mn=typeof v12Menu==="function"?v12Menu(m):{set:false},st=typeof v19Status==="function"?v19Status(m):"none";
 const vDone=st==="verified"||st==="pending",vNote=st==="verified"?"Verified by the Trust team.":st==="pending"?"In review. The Trust team usually answers within 2 business days.":st==="rejected"?"The Trust team asked for an update: "+String(m.verifyReject||"see the note on the Verified page")+".":st==="expired"?"Your license or insurance date has passed. Send the renewed one.":"Your license number, state, expiry and a photo of a current certificate of insurance.";
 return[
  {k:"photos",icon:"camera",t:"Add 3 job photos",done:g>=3,meta:Math.min(g,3)+" of 3 added",why:"Real photos of your own work are the first thing customers look at. Before/after shots work best.",cta:g?"Add more photos":"Add photos",act:"g12"},
  {k:"price",icon:"tag",t:"Set a starting price",done:!!mn.set,meta:mn.set?"Starting prices set":"Not set yet",why:"A \"from $X\" price on your main services builds trust and filters out jobs that don't fit.",cta:"Set starting prices",act:"m12"},
  {k:"verify",icon:"shield",t:"Submit the Verified packet",done:vDone,meta:st==="verified"?"Verified":st==="pending"?"Submitted, in review":"Not submitted",why:vNote,cta:st==="rejected"||st==="expired"?"Update packet":"Submit packet",act:"verify"}]}
function v27Guide(m,q){if(!m||m.role!=="contractor")return "";q=q||{};const s=v27Steps(m),d=s.filter(x=>x.done).length,cur=s.find(x=>!x.done),from=q.setup==="1";
 if(!cur&&!from)return "";
 const pct=Math.round(d/s.length*100);
 return`<section class="o7-wrap v27g-w"><div class="card v27g" id="v27guide" aria-labelledby="v27g-t">
 ${from?`<p class="v27g-note" role="status">${I("info",15)}<span>You already have a Sawyer pro account, so there's nothing to sign up for again. ${cur?"Here's what's left to finish your profile.":"Your profile setup is done."}</span></p>`:""}
 <div class="v27g-h"><div><span class="v24k">${I("sparkle",14)}Finish your profile</span><h2 id="v27g-t">${cur?`Step ${s.indexOf(cur)+1} of ${s.length}: ${esc(cur.t)}`:"All three steps are done"}</h2>
 <p class="muted">${cur?"Three steps that win first jobs. Each one takes a couple of minutes.":"Photos, a starting price and the Verified packet are in. Customers see a complete profile."}</p></div>
 <div class="v27g-p"><b>${d}/${s.length}</b><div class="v27g-m" role="progressbar" aria-label="Profile setup steps done" aria-valuemin="0" aria-valuemax="${s.length}" aria-valuenow="${d}"><i style="width:${pct}%"></i></div></div></div>
 <ol class="v27g-l">${s.map((x,i)=>{const on=x===cur;return`<li class="v27g-s ${x.done?"done":""} ${on?"on":""}" data-step="${x.k}" ${on?'aria-current="step"':""}><span class="v27g-n">${x.done?I("check",15):i+1}</span><div class="v27g-b"><b>${esc(x.t)}</b><small>${esc(x.meta)}</small>${on?`<p>${esc(x.why)}</p>`:""}</div>
  <div class="v27g-a">${x.act==="verify"?`<a class="btn sm ${on?"primary":""}" href="${href("verify")}" data-v27g="verify">${esc(x.done?"View":x.cta)}</a>`:`<button type="button" class="btn sm ${on?"primary":""}" data-v27g="${x.act}">${esc(x.done?(x.k==="photos"?"Edit photos":"Edit prices"):x.cta)}</button>`}</div></li>`}).join("")}</ol></div></section>`}
{const ov=VIEWS.dash;VIEWS.dash=function(p,q){let h=ov.apply(this,arguments);try{const m=me();if(!m||m.role!=="contractor"||m.staff)return h;const g=v27Guide(m,q);if(!g)return h;
  const k=h.indexOf('<div class="v13-dtop">');if(k>=0){const at=k+'<div class="v13-dtop">'.length;return h.slice(0,at)+g+h.slice(at)}
  const e=h.indexOf("</header>");return e<0?g+h:h.slice(0,e+9)+g+h.slice(e+9)}catch(e){return h}}}
{const oa=AFTER.dash;AFTER.dash=function(p,q){const r=oa&&oa.apply(this,arguments);try{document.querySelectorAll("[data-v27g]").forEach(b=>{if(b.dataset.v27g==="g12")b.onclick=()=>g12Modal();else if(b.dataset.v27g==="m12")b.onclick=()=>m12Modal()});
  if(q&&q.setup==="1"&&!window.__v27gs){window.__v27gs=1;const c=document.getElementById("v27guide");if(c)setTimeout(()=>{c.scrollIntoView({block:"start",behavior:"instant"});const f=c.querySelector(".v27g-s.on [data-v27g]")||c.querySelector("h2");if(f)f.focus({preventScroll:true})},60)}}catch(e){}return r}}
// /join for a signed-in pro: the dashboard setup flow, not a second signup
{const ov=VIEWS.join;if(ov)VIEWS.join=function(){const m=me();if(m&&m.role==="contractor")return VIEWS.dash(null,{setup:"1"});return ov.apply(this,arguments)}}
{const oa=AFTER.join;AFTER.join=function(){const m=me();if(m&&m.role==="contractor"){window.__v27gs=0;nav(href("dash",null,{setup:"1"}),true);return}return oa&&oa.apply(this,arguments)}}

/* (2) The job board as a pipeline. For a signed-in pro, every job card (dashboard "New jobs in your area" and /jobs)
   says why the job fits (trade, the exact service, inside the service radius), roughly how far it is, how many of the 3
   pro spots are left, and offers a quote in two taps: "Quote" opens a short sheet with a suggested price (the pro's own
   starting price for that service, else the middle of the typical local range) and a default note; "Send quote" sends it.
   When the customer hires someone else, the pro gets an in-app "not hired" notice (bell, dashboard, job page), with the
   owner's one-line reason if they chose to share one. The reason is visible only to the owner and the pros it went to. */
const V27WHY=["Went with a lower price","They could start sooner","They were closer","Already worked with them before","Their quote covered more of the job"];
function v27Fit(j,m){const out=[];const d=dist(m.zip,j.zip),r=+m.radius||0,subs=m.subs||[];
 if(j.cat===m.trade)out.push(j.sub&&subs.includes(j.sub)?"You list "+j.sub.toLowerCase():"Your trade: "+j.cat);
 else if(j.sub&&subs.includes(j.sub))out.push("You list "+j.sub.toLowerCase());
 if(r&&d<=r)out.push("Inside your "+r+" mi radius");
 return{why:out,d}}
function v27Mine(j,m){return DB.quotes.find(q=>q.job===j.id&&q.cid===m.id&&q.status!=="declined")}
function v27Range(j){try{const k=typeof v26QcKey==="function"?v26QcKey(j):"";if(k)return v26Range(k,j.urgent?"urgent":"soon",j.zip);return typeof v14Range==="function"?v14Range(j):null}catch(e){return null}}
function v27Suggest(j,m){const mn=Array.isArray(m.menu12)?m.menu12:[];const row=mn.find(x=>x&&x.from>0&&j.sub&&String(x.s).toLowerCase()===String(j.sub).toLowerCase());
 if(row)return{price:Math.round(+row.from),src:"your starting price for "+row.s.toLowerCase()};const rg=v27Range(j);
 if(rg&&rg.low>0){const mid=(rg.low+rg.high)/2;return{price:mid<1000?Math.round(mid/10)*10:Math.round(mid/50)*50,src:"the middle of the typical local range"}}return{price:0,src:""}}
function v27Pipe(j,m){if(!m||m.role!=="contractor"||j.status!=="posted"||j.cust===m.id)return "";const f=v27Fit(j,m),s=leadSlots(j),eng=engaged(j).has(m.id),mine=v27Mine(j,m),left=Math.max(0,s.cap-s.n);
 const spots=eng?`${I("users",13)}You're in · ${s.n} of ${s.cap} pros`:left?`${I("users",13)}${left} of ${s.cap} spots left`:`${I("users",13)}Full: ${s.cap} of ${s.cap} pros`;
 const act=mine?`<a class="btn sm" href="${href("job",j.id)}">You quoted ${money(mine.price)} · Update</a>`:(eng||left)?`<button type="button" class="btn sm primary" data-v27q="${esc(j.id)}">${I("send",14)}Quote</button>`:`<a class="btn sm" href="${href("jobs",null,{cat:j.cat})}">More ${esc(j.cat)} jobs</a>`;
 return`<div class="v27p"><ul class="v27p-f" aria-label="Why this job fits">${f.why.map(x=>`<li>${I("check",13)}${esc(x)}</li>`).join("")}<li>${I("pin",13)}≈ ${f.d} mi away</li><li class="${left||eng?"":"full"}">${spots}</li></ul><div class="v27p-a">${act}</div></div>`}
{const oc=jobCard;jobCard=function(j,o){const h=oc.apply(this,arguments);try{const m=me();if(!m||m.role!=="contractor"||!j||j.status!=="posted")return h;const p=v27Pipe(j,m);if(!p)return h;return`<article class="v27jc ${j.urgent?"urgent":""}">${h}${p}</article>`}catch(e){return h}}}
function v27QuickQuote(jid){const j=DB.jobs.find(x=>x.id===jid),m=me();if(!j||!m)return;const sg=v27Suggest(j,m),rg=v27Range(j);
 const note=`Covers labor and standard materials for: ${j.sub||j.title}. I'll confirm the final price after a quick look on site.`;
 modal(`<div class="v27q"><h2 id="mtitle">Quote: ${esc(j.title)}</h2><p class="muted">${esc(townOf(j.zip))} · budget ${esc(j.budget)}${rg?` · typical ${money(rg.low)} – ${money(rg.high)}`:""}</p>
 <form id="v27qf" class="form">${v27EstPick(m)}<div class="v27q-row"><div class="fld"><label for="v27qp">Your price (USD)</label><input id="v27qp" name="price" inputmode="decimal" required value="${sg.price||""}"></div><div class="fld"><label for="v27qd">Can start in (days)</label><input id="v27qd" name="days" inputmode="numeric" value="${j.urgent?1:3}"></div></div>
 ${sg.src?`<p class="v27q-s muted small">${I("info",13)}Suggested from ${esc(sg.src)}. Change anything before you send.</p>`:""}
 <div class="fld"><label for="v27qn">What's included</label><textarea id="v27qn" name="note" rows="3" maxlength="1000">${esc(note)}</textarea></div>
 <div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary" id="v27qs">${I("send",16)}Send quote</button></div><p class="muted small">No lead fee. Quoting is included in your plan.</p></form></div>`);
 document.querySelectorAll("#modal [data-close]").forEach(x=>x.onclick=closeModal);v27EstBind(document.getElementById("v27qf"),"v27qp","v27qn");
 const f=document.getElementById("v27qf");f.onsubmit=e=>{e.preventDefault();const o=readForm(f);const r=A.quote(jid,o.price,o.note,o.days);if(r&&r.ok){closeModal();act(r,render)}else act(r)};
 setTimeout(()=>{const b=document.getElementById("v27qs");b&&b.focus()},30)}
function v27BindQ(){document.querySelectorAll("[data-v27q]").forEach(b=>b.onclick=e=>{e.preventDefault();v27QuickQuote(b.dataset.v27q)})}
{const oa=AFTER.dash;AFTER.dash=function(){const r=oa&&oa.apply(this,arguments);try{v27BindQ()}catch(e){}return r}}
{const oa=AFTER.jobs;AFTER.jobs=function(){const r=oa&&oa.apply(this,arguments);try{v27BindQ()}catch(e){}return r}}
// Start from an Office estimate: a pro who already priced the work in The Office picks that estimate and the quote's price
// (the estimate total with the optional lines it has switched on) and line items are filled in. Nothing else changes.
function v27Ests(m){return m?(DB.bills||[]).filter(b=>b.by===m.id&&b.type==="est"&&b.status!=="void"&&(b.lines||[]).length).sort((a,b)=>(b.date||0)-(a.date||0)).slice(0,20):[]}
function v27EstNote(b){const $=n=>money(Math.round(n));const on=b.lines.filter(l=>!l.opt||l.on),opt=b.lines.filter(l=>l.opt&&!l.on);
 let t="From estimate "+b.no+": "+on.map(l=>(+l.q!==1?l.q+" × ":"")+l.d+" ("+$(l.q*l.r)+")").join("; ")+".";if(opt.length)t+=" Optional add-ons: "+opt.map(l=>l.d+" ("+$(l.q*l.r)+")").join("; ")+".";
 if(b.tax)t+=" Includes "+b.tax+"% tax.";return t.length>1000?t.slice(0,997)+"…":t}
function v27EstPick(m){const es=v27Ests(m);if(!es.length)return "";
 return`<div class="fld v27e"><label for="v27es">Start from an Office estimate (optional)</label><select id="v27es" name="est"><option value="">Don't use an estimate</option>${es.map(b=>`<option value="${esc(b.id)}">${esc(b.no)} · ${esc(b.title||"Estimate")} · ${money(Math.round(billCalc(b).total))}</option>`).join("")}</select><small class="muted">Fills in the price and line items. You can still edit them.</small></div>`}
function v27EstBind(f,pid,nid){const s=f&&f.querySelector("#v27es");if(!s)return;s.onchange=()=>{const b=(DB.bills||[]).find(x=>x.id===s.value);if(!b)return;const p=document.getElementById(pid),n=document.getElementById(nid);
 if(p)p.value=String(Math.round(billCalc(b).total));if(n)n.value=v27EstNote(b)}}
{const oq=quoteModal;quoteModal=function(jid){oq.apply(this,arguments);try{const f=document.getElementById("qf"),m=me();if(!f||!m||f.querySelector("#v27es"))return;const x=v27EstPick(m);if(!x)return;f.insertAdjacentHTML("afterbegin",x);v27EstBind(f,"qp","qn")}catch(e){}}}
// dashboard section: matched-job explainer + recent "not hired" outcomes
function v27Lost(m){const t=Date.now()-30*864e5;return DB.quotes.filter(q=>q.cid===m.id&&q.status==="declined").map(q=>({q,j:DB.jobs.find(x=>x.id===q.job)})).filter(x=>x.j&&x.j.hired&&x.j.hired!==m.id&&(x.q.declinedAt||x.j.hiredAt||x.j.created||0)>=t).sort((a,b)=>(b.q.declinedAt||b.j.hiredAt||0)-(a.q.declinedAt||a.j.hiredAt||0))}
function v27LostCard(m){const l=v27Lost(m).slice(0,3);if(!l.length)return "";
 return`<div class="v27nh-c" id="v27lost"><div class="ud-h"><h2>Not hired this time</h2></div>${l.map(({q,j})=>`<a class="v27nh-i" href="${href("job",j.id)}"><span class="v27nh-ic">${I("info",16)}</span><div><b>${esc(j.title)}</b><small>The customer hired another pro${j.hiredAt?" · "+ago(j.hiredAt):""}. No lead fee was charged.</small>${q.why?`<span class="v27why">Their note: “${esc(q.why)}”</span>`:""}</div></a>`).join("")}</div>`}
{const ov=VIEWS.dash;VIEWS.dash=function(){let h=ov.apply(this,arguments);try{const m=me();if(!m||m.role!=="contractor"||m.staff)return h;
  h=h.replace('<div class="ud-h"><h2>New jobs in your area</h2>',x=>x.replace("</h2>",'</h2><small class="v27p-sub">Matched to your trade, services and radius. Quote in two taps.</small>'));
  const lc=v27LostCard(m);if(lc){const k=h.indexOf('<div class="ud-h"><h2>Your pipeline</h2>');if(k>=0)h=h.slice(0,k)+lc+h.slice(k)}}catch(e){}return h}}
// hiring: optional one-line reason for the pros who weren't picked
{const oh=A.hire;A.hire=function(jid,cid,why){why=typeof why==="string"?why.replace(/\s+/g," ").trim():"";if(why.length>140)return{ok:false,msg:"Keep the note under 140 characters."};
  const before=DB.notifs.length;const r=oh.call(this,jid,cid);if(!r||!r.ok)return r;try{const j=DB.jobs.find(x=>x.id===jid);const now=Date.now();
  DB.quotes.forEach(q=>{if(q.job!==jid||q.cid===cid||q.status!=="declined")return;q.declinedAt=now;if(why)q.why=why});
  const told=new Set(DB.notifs.slice(before).map(n=>n.to));
  // pros who only marked "interested" (no quote) hear it too
  (j.interested||[]).forEach(p=>{if(p!==cid&&!told.has(p)){notify(p,"This job was filled: "+j.title+". The customer hired another pro.","job:"+jid);told.add(p)}});
  if(why)DB.notifs.slice(before).forEach(n=>{if(n.link==="job:"+jid&&/^This job was filled/.test(n.text))n.text+=" Their note: “"+why+"”"});save()}catch(e){}return r}}
function v27HireModal(jid,u,after,bid){modal(`<div class="v27q"><h2 id="mtitle">Hire ${esc(u.biz)}?</h2><p>The other pros will be told the job is filled. You can message ${esc(String(u.name||"").split(" ")[0])} to set a start date.</p>
 <form id="v27hf" class="form"><div class="fld"><label for="v27hw">Tell the other pros why? (optional)</label><select id="v27hw" name="why"><option value="">Don't share a reason</option>${V27WHY.map(x=>`<option>${esc(x)}</option>`).join("")}<option value="__o">Something else…</option></select></div>
 <div class="fld" id="v27hoF" hidden><label for="v27ho">One line, no names or prices</label><input id="v27ho" name="other" maxlength="140" autocomplete="off"></div>
 <p class="muted small">Only the pros who quoted see it. It helps them quote better next time.</p>
 <div class="actions"><button type="button" class="btn ghost" data-close>Not yet</button><button class="btn primary" id="${bid||"cfHire"}">${I("check",16)}Yes, hire</button></div></form></div>`);
 document.querySelectorAll("#modal [data-close]").forEach(x=>x.onclick=closeModal);const s=document.getElementById("v27hw"),of=document.getElementById("v27hoF");s.onchange=()=>{of.hidden=s.value!=="__o"};
 document.getElementById("v27hf").onsubmit=e=>{e.preventDefault();const w=s.value==="__o"?document.getElementById("v27ho").value:s.value;closeModal();act(A.hire(jid,u.id,w),after)}}
{const oa=AFTER.job;AFTER.job=function(id){const r=oa&&oa.apply(this,arguments);try{document.querySelectorAll("[data-hire]").forEach(b=>b.onclick=()=>{const u=U(b.dataset.hire);if(u)v27HireModal(id,u,render,"cfHire")})}catch(e){}return r}}
{const oa=AFTER.compare;if(oa)AFTER.compare=function(jid){const r=oa.apply(this,arguments);try{document.querySelectorAll("[data-chire]").forEach(b=>b.onclick=()=>{const u=U(b.dataset.chire);if(u)v27HireModal(jid,u,()=>go("job",jid),"cfCHire")})}catch(e){}return r}}
// the job page for a pro who quoted and wasn't picked
{const ov=VIEWS.job;VIEWS.job=function(id){let h=ov.apply(this,arguments);try{const m=me(),j=DB.jobs.find(x=>x.id===id);if(!m||m.role!=="contractor"||!j||!j.hired||j.hired===m.id)return h;
  const q=DB.quotes.find(x=>x.job===id&&x.cid===m.id);if(!q&&!(j.interested||[]).includes(m.id))return h;
  const box=`<div class="callout v27nh" id="v27nh">${I("info",20)}<div><b>You weren't hired this time.</b> The customer hired another pro${j.hiredAt?" "+ago(j.hiredAt):""}. No lead fee was charged.${q&&q.why?`<span class="v27why">Their note: “${esc(q.why)}”</span>`:""}<div class="v27nh-a"><a class="btn sm" href="${href("jobs",null,{cat:j.cat})}">See open ${esc(j.cat)} jobs</a></div></div></div>`;
  const re=/<div class="callout">(?:<svg[\s\S]*?<\/svg>)?<div>This job has been filled\.<\/div><\/div>/;return re.test(h)?h.replace(re,box):h}catch(e){return h}}}

/* (3) "Is Sawyer like Thumbtack or like Jobber?" Pros ask both. /pros now compares the two side by side with Sawyer:
   a lead marketplace (Thumbtack: pay per lead, often several pros on a request) and field-service software (Jobber:
   quotes, scheduling and invoicing, no built-in lead marketplace, monthly plans above $20). General, factual claims from
   each company's public pages (checked Nov 2026); the one price cited is hedged and dated. */
const V27VS=[
 ["What it is","A marketplace for finding work, plus the office tools to run it","A marketplace where customers find and contact pros","Software to run a service business: quotes, scheduling, invoices"],
 ["How new customers find you","Homeowners post jobs and search; you quote from the job board","Customers find you in search and reach out","No built-in lead marketplace. You bring your own customers"],
 ["What a lead costs","$0. No lead fees, no credits","You pay per lead, at a price you set inside a weekly budget","Nothing to buy, because it doesn't sell leads"],
 ["Pros per request","At most 3","Customers often contact several pros","Not a marketplace"],
 ["Quotes, invoices, records","Included (The Office: estimates, invoices, expenses, timesheets, documents)","Focused on leads and messaging, not a full back office","Yes. That's the core product"],
 ["Monthly price","$20/mo flat. Founding pros get 3 months free","No membership fee; you pay for leads instead","Monthly plans priced above $20 (Core lists from $29/mo billed annually, Nov 2026)"]];
function v27Vs(){return`<section class="wrap sec v27vs" id="vs"><span class="eyebrow">${I("target",14)} Thumbtack or Jobber?</span><h2>A lead marketplace and an office app, at one flat price</h2>
 <p class="muted">Pros ask us whether Sawyer is like Thumbtack or like Jobber. It's both: the jobs come to you without lead fees, and the quoting and billing tools are built in.</p>
 <div class="card v27vs-c"><table class="v27vs-t"><caption class="sr">Sawyer compared with Thumbtack and Jobber</caption><thead><tr><th scope="col"><span class="sr">Question</span></th><th scope="col" class="us">Sawyer</th><th scope="col">Thumbtack</th><th scope="col">Jobber</th></tr></thead>
 <tbody>${V27VS.map(([k,a,b,c])=>`<tr><th scope="row">${esc(k)}</th><td class="us" data-l="Sawyer">${I("check",14)}<span>${esc(a)}</span></td><td data-l="Thumbtack"><span>${esc(b)}</span></td><td data-l="Jobber"><span>${esc(c)}</span></td></tr>`).join("")}</tbody></table>
 <p class="muted small v27vs-n">From each company's public pages, checked November 2026. Plans and features change, so check their sites for current details. Thumbtack and Jobber are trademarks of their owners; Sawyer isn't affiliated with either.</p></div></section>`}
{const ov=VIEWS.pros;VIEWS.pros=function(){let h=ov.apply(this,arguments);try{const k=h.indexOf('<section class="wrap t5pros');if(k>=0)return h.slice(0,k)+v27Vs()+h.slice(k);
  const e=h.indexOf('<section class="v7cmp"');return e>=0?h.slice(0,e)+v27Vs()+h.slice(e):h+v27Vs()}catch(e){return h}}}

/* (4) /prices SEO parity. Lighthouse's image-alt audit doesn't apply to a page with no images, so the beta noindex weighed
   more on /prices (66 vs 69 elsewhere, the same cause as /job in v24). The quote check now carries a small, labeled real
   photo of the kind of work picked (an example photo, never a pro's portfolio), which also helps people see what they're
   pricing. It follows the job picker. noindex stays until SAWYER_INDEXABLE=1. */
function v27QcPic(k){try{const t=v26TradeOf(v26Key(k));const sub=/water heater/i.test(k)?"/img/g-water-heater.webp":/ev charger|panel/i.test(k)?"/img/tr-panel.webp":"";
  const src=(sub||(typeof v19ExList==="function"?v19ExList(t)[0]:"")||"/img/home-ext.webp").replace(/\.webp$/,"-sm.webp");
  return{src,alt:"Example of "+(/^[A-Z]{2,}$/.test(t)?t:t.toLowerCase())+" work (stock photo)"}}catch(e){return{src:"/img/home-ext-sm.webp",alt:"Example of home repair work (stock photo)"}}}
{const ov=VIEWS.prices;VIEWS.prices=function(p,q){let h=ov.apply(this,arguments);try{q=q||{};const k=v26Key(V26Q.k||q.qc),ph=v27QcPic(k);
  return h.replace('<div class="v26q-hd">',()=>`<div class="v26q-hd"><img class="v27qc-ph" id="v27qcPh" src="${ph.src}" alt="${esc(ph.alt)}" width="400" height="300" loading="lazy" decoding="async">`)}catch(e){return h}}}
{const oa=AFTER.prices;AFTER.prices=function(){const r=oa&&oa.apply(this,arguments);try{const j=document.getElementById("v26qj"),im=document.getElementById("v27qcPh");
  if(j&&im)j.addEventListener("change",()=>{const ph=v27QcPic(j.value);if(im.getAttribute("src")!==ph.src){im.src=ph.src;im.alt=ph.alt}})}catch(e){}return r}}
