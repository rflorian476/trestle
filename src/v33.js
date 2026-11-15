/* ===== v33 ===== */
const V2_ACTIONS33=["followUp33"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS33);

/* (1) Quote follow-ups. A quote that has had no answer for 2+ days shows on the pro dashboard under "Quotes waiting for an
   answer" with a one-tap "Follow up": a friendly, editable check-in that goes to the homeowner as a normal Sawyer message
   (so they get the usual "New message" notice / alert). One follow-up per quote, enforced by the server, so nobody gets
   pestered. Jobs that were hired, filled or closed, and threads where the homeowner already wrote back, don't show. */
const V33_WAIT=2*864e5;
function v33Now(){return typeof __now==="function"?__now():Date.now()}
function v33First(s){return String(s||"").trim().split(/\s+/)[0]||"there"}
function v33Waiting(m){if(!m||m.role!=="contractor")return[];const now=v33Now();
 return (DB.quotes||[]).filter(q=>q&&q.cid===m.id&&q.status==="sent"&&!q.fu33&&now-(q.date||0)>=V33_WAIT).map(q=>({q,j:(DB.jobs||[]).find(x=>x.id===q.job)}))
  .filter(({q,j})=>j&&j.status==="posted"&&!j.hired&&j.cust&&!(DB.msgs||[]).some(x=>x.from===j.cust&&(x.a===j.cust&&x.b===m.id)&&(x.date||0)>(q.date||0)))
  .sort((a,b)=>(a.q.date||0)-(b.q.date||0))}
function v33Days(t){const d=Math.floor((v33Now()-(t||0))/864e5);return d<=1?"2 days ago":d+" days ago"}
function v33Msg(q,j,m){const c=U(j.cust)||{};return`Hi ${v33First(c.name)}, just checking in on my quote for "${String(j.title||"your job").slice(0,90)}" (${v28$(q.price)}). Happy to answer any questions, adjust the scope, or come take a look. No pressure either way. - ${v33First(m.name)}, ${m.biz||nameOf(m)}`}
A.followUp33=function(qid,text){const m=me();if(!m||m.role!=="contractor")return{ok:false,msg:"Only pros can follow up on a quote."};
 const q=(DB.quotes||[]).find(x=>x&&x.id===qid&&x.cid===m.id);if(!q)return{ok:false,msg:"That quote wasn't found."};
 const j=(DB.jobs||[]).find(x=>x.id===q.job);if(!j||q.status!=="sent"||j.status!=="posted"||j.hired||!j.cust)return{ok:false,msg:"This job isn't open any more."};
 if(q.fu33)return{ok:false,msg:"You already followed up on this quote. One check-in per quote keeps it friendly."};
 if(v33Now()-(q.date||0)<V33_WAIT)return{ok:false,msg:"Give them 2 days to look at your quote first."};
 const t=String(text==null?"":text).replace(/\r/g,"").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();if(!t)return{ok:false,msg:"Type a message"};if(t.length>1000)return{ok:false,msg:"Keep the message under 1,000 characters."};
 const r=A.send(j.cust,t);if(!r||r.ok===false)return r||{ok:false,msg:"That didn't send. Try again."};
 q.fu33=Date.now();save();return{ok:true,msg:"Follow-up sent to "+v33First((U(j.cust)||{}).name)+"."}};
function v33FuCard(m){const all=v33Waiting(m);if(!all.length)return"";const sh=all.slice(0,3);
 const li=sh.map(({q,j})=>{const c=U(j.cust)||{};return`<li><div class="v33fu-t"><a href="${href("job",j.id)}"><b>${esc(j.title||"Job")}</b></a><small>${esc(v33First(c.name))} · You quoted ${esc(v28$(q.price))} · ${esc(v33Days(q.date))}</small></div><button type="button" class="btn sm" data-v33fu="${esc(q.id)}">${I("chat",14)}Follow up</button></li>`}).join("");
 return`<section class="o7-wrap v33fu-w"><div class="card v33fu" id="v33fu" aria-labelledby="v33fuh"><div class="v33fu-h"><h2 id="v33fuh">${I("clock",18)} Quotes waiting for an answer</h2><span class="muted small">${all.length} with no reply in 2+ days</span></div>
 <p class="muted small v33fu-s">A friendly check-in wins more jobs than a lower price. One follow-up per quote, so nobody gets pestered.</p><ul class="v33fu-l">${li}</ul>${all.length>3?`<p class="muted small v33fu-m">+${all.length-3} more. Follow up on these first and the rest move up.</p>`:""}</div></section>`}
function v33FuModal(qid){const m=me(),q=(DB.quotes||[]).find(x=>x.id===qid),j=q&&(DB.jobs||[]).find(x=>x.id===q.job);if(!m||!q||!j)return;const c=U(j.cust)||{},fn=v33First(c.name);
 modal(`<div class="v33fm"><h2 id="mtitle">Follow up with ${esc(fn)}</h2><p class="muted">${esc(j.title||"")} · You quoted ${esc(v28$(q.price))} ${esc(v33Days(q.date))}</p>
 <form id="v33ff" class="form"><div class="fld"><label for="v33ft">Message</label><textarea id="v33ft" name="text" rows="6" maxlength="1000" required>${esc(v33Msg(q,j,m))}</textarea><small class="muted">Goes to ${esc(fn)} as a Sawyer message, with the usual notification. You can follow up once on each quote.</small></div>
 <p class="err" id="v33fe" role="alert"></p><div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary" id="v33fs">${I("send",16)}Send follow-up</button></div></form></div>`);
 document.querySelectorAll("#modal [data-close]").forEach(x=>x.onclick=closeModal);
 const f=document.getElementById("v33ff");f.onsubmit=e=>{e.preventDefault();if(f.__busy)return;f.__busy=1;const b=document.getElementById("v33fs");b.disabled=true;b.setAttribute("aria-busy","true");
  const r=A.followUp33(qid,document.getElementById("v33ft").value);if(r&&r.ok){closeModal();act(r,()=>render())}else{f.__busy=0;b.disabled=false;b.removeAttribute("aria-busy");document.getElementById("v33fe").textContent=(r&&r.msg)||"That didn't send. Try again."}}}

/* (2) Quick log from the dashboard. Pros log a receipt or a trip in a few taps without opening The Office (built for the
   phone at the supply house: the amount field opens the number pad, category is one tap, the receipt photo opens the camera).
   It uses the same addLedger records as Office -> Expenses & mileage, so reports, the P&L and the tax file pick it up.
   After saving, the sheet says what was logged with Undo, Log another and Done. Trips can be doubled for a round trip. */
const V33_CATS=["Materials","Fuel","Tools","Permits","Meals","Dump fees"];
{const ol=A.addLedger;A.addLedger=function(o){const m=me();const before=new Set((DB.ledger||[]).map(l=>l.id));const r=ol.apply(this,arguments);
  try{if(r&&r.ok&&m){const l=(DB.ledger||[]).find(x=>x.by===m.id&&!before.has(x.id));if(l)r.id=l.id}}catch(e){}return r}}
function v33Month(m){const k=v7Today().slice(0,7);const l=v7Mine("ledger",m).filter(x=>String(x.date||"").slice(0,7)===k);
 return{exp:l.filter(x=>x.kind==="exp").reduce((a,x)=>a+(+x.amt||0),0),mi:l.filter(x=>x.kind==="mile").reduce((a,x)=>a+(+x.miles||0),0),n:l.length}}
function v33QlCard(m){const s=v33Month(m);
 return`<section class="o7-wrap v33ql-w"><div class="card v33ql" id="v33ql"><div class="v33ql-tx"><h2>${I("receipt",18)} Quick log</h2><p class="muted small" id="v33qls">${s.n?`This month: ${esc(v7$(s.exp))} in receipts · ${esc((Math.round(s.mi*10)/10).toLocaleString("en-US"))} mi`:"Log a receipt or a trip in seconds. It goes straight into The Office, your reports and your tax file."}</p></div>
 <div class="v33ql-b"><button type="button" class="btn primary" data-v33ql="exp">${I("receipt",16)}Receipt</button><button type="button" class="btn" data-v33ql="mile">${I("truck",16)}Trip</button></div></div></section>`}
function v33Opts(m,k){return[...new Set(v7Mine(k==="job"?"bills":"ledger",m).map(x=>k==="job"?x.job:x.vendor).filter(Boolean))].slice(0,30)}
function v33QlForm(kind){const m=me();const lastFrom=(v7Mine("ledger",m).filter(l=>l.kind==="mile").sort((a,b)=>(b.dt||0)-(a.dt||0))[0]||{}).from||"Shop";
 const jobs=`<datalist id="v33jl">${v33Opts(m,"job").map(j=>`<option value="${esc(j)}">`).join("")}</datalist>`;
 if(kind==="mile")return`<h2 id="mtitle">${I("truck",20)} Log a trip</h2><form id="v33qf" class="form v33qf" novalidate><input type="hidden" name="kind" value="mile">${jobs}
  <div class="v33q-2"><div class="fld"><label for="v33mi">Miles</label><input id="v33mi" name="miles" inputmode="decimal" autocomplete="off" placeholder="0.0" required></div><div class="fld"><label for="v33dt">Date</label><input id="v33dt" type="date" name="date" value="${v7Today()}"></div></div>
  <label class="v33rt"><input type="checkbox" id="v33rt" name="rt"> Round trip (doubles the miles)</label>
  <div class="v33q-2"><div class="fld"><label for="v33fr">From</label><input id="v33fr" name="from" value="${esc(lastFrom)}" maxlength="80"></div><div class="fld"><label for="v33to">To</label><input id="v33to" name="to" placeholder="Job site or supplier" maxlength="80"></div></div>
  <div class="fld"><label for="v33jb">Job (optional)</label><input id="v33jb" name="job" list="v33jl" maxlength="80"></div>
  <p class="muted small">Deduction estimate: ${Math.round(MILE_RATE*100)}¢ a mile, the same rate as your Office reports. Not tax advice.</p>
  <p class="err" id="v33qe" role="alert"></p><div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary" id="v33qs">Log trip</button></div></form>`;
 return`<h2 id="mtitle">${I("receipt",20)} Log a receipt</h2><form id="v33qf" class="form v33qf" novalidate><input type="hidden" name="kind" value="exp">${jobs}<datalist id="v33vl">${v33Opts(m,"vendor").map(v=>`<option value="${esc(v)}">`).join("")}</datalist>
  <div class="v33q-2"><div class="fld"><label for="v33am">Total</label><div class="v33amt"><span aria-hidden="true">$</span><input id="v33am" name="amt" inputmode="decimal" autocomplete="off" placeholder="0.00" required></div></div><div class="fld"><label for="v33dt">Date</label><input id="v33dt" type="date" name="date" value="${v7Today()}"></div></div>
  <fieldset class="v33cats"><legend>Category</legend>${V33_CATS.map((c,i)=>`<label><input type="radio" name="cat" value="${esc(c)}" ${i?"":"checked"}><span>${esc(c)}</span></label>`).join("")}<label class="v33oth"><span class="sr">Other category</span><select name="catx" id="v33cx" aria-label="Other category"><option value="">More…</option>${EXP_CATS.filter(c=>!V33_CATS.includes(c)).map(c=>`<option>${esc(c)}</option>`).join("")}</select></label></fieldset>
  <div class="v33q-2"><div class="fld"><label for="v33vn">Vendor</label><input id="v33vn" name="vendor" list="v33vl" placeholder="Supply house" maxlength="80"></div><div class="fld"><label for="v33jb">Job (optional)</label><input id="v33jb" name="job" list="v33jl" maxlength="80"></div></div>
  <div class="fld v33ph"><label for="v33pf">${I("camera",16)} Receipt photo (optional)</label><input id="v33pf" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"></div>
  <p class="err" id="v33qe" role="alert"></p><div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary" id="v33qs">Log receipt</button></div></form>`}
function v33QlOpen(kind){modal(`<div class="v33qm">${v33QlForm(kind)}</div>`,"v33sheet");v33QlBind(kind)}
function v33QlBind(kind){document.querySelectorAll("#modal [data-close]").forEach(x=>x.onclick=closeModal);const f=document.getElementById("v33qf");if(!f)return;
 const first=document.getElementById(kind==="mile"?"v33mi":"v33am");if(first)setTimeout(()=>{try{first.focus()}catch(e){}},60);
 const cx=document.getElementById("v33cx");if(cx)cx.onchange=()=>{if(cx.value)f.querySelectorAll('input[name="cat"]').forEach(r=>r.checked=false)};
 f.querySelectorAll('input[name="cat"]').forEach(r=>r.onchange=()=>{if(cx)cx.value=""});
 f.oninput=()=>{const e=document.getElementById("v33qe");if(e&&e.textContent)e.textContent=""};
 f.onsubmit=async e=>{e.preventDefault();if(f.__busy)return;const err=t=>{document.getElementById("v33qe").textContent=t};const o=readForm(f);
  if(kind==="mile"){const n=parseFloat(String(o.miles||"").replace(/,/g,""));if(!(n>0))return err("Enter the miles driven.");o.miles=o.rt?Math.round(n*2*10)/10:n;if(o.rt&&o.to)o.to=o.to+" and back"}
  else{const n=parseFloat(String(o.amt||"").replace(/[$,\s]/g,""));if(!(n>0))return err("Enter the receipt total.");o.amt=Math.round(n*100)/100;if(o.catx)o.cat=o.catx}
  delete o.rt;delete o.catx;f.__busy=1;const b=document.getElementById("v33qs");b.disabled=true;b.setAttribute("aria-busy","true");
  const fi=document.getElementById("v33pf");if(fi&&fi.files&&fi.files[0]){try{o.photo=await v2upload(fi.files[0])}catch(x){f.__busy=0;b.disabled=false;b.removeAttribute("aria-busy");return err(x.message||"The photo didn't upload. Try again.")}}
  const r=A.addLedger(o);if(!r||!r.ok){f.__busy=0;b.disabled=false;b.removeAttribute("aria-busy");return err((r&&r.msg)||"That didn't save. Try again.")}
  const what=kind==="mile"?`${(Math.round(o.miles*10)/10).toLocaleString("en-US")} mi${o.to?" to "+o.to:""} · about ${v7$(o.miles*MILE_RATE)} deduction`:`${v7$(o.amt)} · ${o.cat||"Materials"}${o.vendor?" · "+o.vendor:""}`;
  const box=document.querySelector("#modal .v33qm");if(!box)return;
  box.innerHTML=`<div class="v33done" role="status"><span class="v33ok">${I("check",22)}</span><h2 id="mtitle">${kind==="mile"?"Trip logged":"Receipt logged"}</h2><p>${esc(what)}</p><p class="muted small">It's in The Office under Expenses &amp; mileage.</p>
   <div class="actions v33da"><button type="button" class="btn ghost" id="v33un">Undo</button><button type="button" class="btn" id="v33ag">Log another</button><button type="button" class="btn primary" id="v33dn">Done</button></div></div>`;
  const id=r.id;document.getElementById("v33dn").onclick=()=>{closeModal();render()};document.getElementById("v33ag").onclick=()=>{box.innerHTML=v33QlForm(kind);v33QlBind(kind)};
  document.getElementById("v33un").onclick=()=>{const u=id?A.delLedger(id):{ok:false,msg:"Delete it in The Office."};if(u&&u.ok){closeModal();toast(kind==="mile"?"Trip removed":"Receipt removed");render()}else toast((u&&u.msg)||"Couldn't undo","err")};
  document.getElementById("v33dn").focus()}}

/* both pro dashboard cards go right under "Here's what's next" */
{const ov=VIEWS.dash;VIEWS.dash=function(){let h=ov.apply(this,arguments);try{const m=me();if(!m||m.role!=="contractor"||m.staff||(typeof v12Staff==="function"&&v12Staff(m)))return h;
  const add=v33QlCard(m)+v33FuCard(m);const i=h.indexOf('<section class="na8"'),j=i<0?-1:h.indexOf("</section>",i);
  if(j>0)h=h.slice(0,j+10)+add+h.slice(j+10);else{const k=h.indexOf('<div class="v13-dtop">');h=k>=0?h.slice(0,k+22)+add+h.slice(k+22):add+h}
 }catch(e){console.warn(e)}return h}}
{const oa=AFTER.dash;AFTER.dash=function(){const r=oa&&oa.apply(this,arguments);try{
  document.querySelectorAll("[data-v33fu]").forEach(b=>b.onclick=()=>v33FuModal(b.dataset.v33fu));
  document.querySelectorAll("[data-v33ql]").forEach(b=>b.onclick=()=>v33QlOpen(b.dataset.v33ql))}catch(e){}return r}}

/* (3) Project managers reuse a project as a template. Pool builders and GCs post the same kind of multi-trade job again
   and again; "Reuse as template" (on the project page, and "Start from one of your projects" in Post a project) copies the
   trades, crew counts, role names, phases, budget, notes and town into a new draft. Dates start blank and the title gets
   "(copy)", so nothing is posted until the PM has looked it over on the Review step. Crew, applicants and chat aren't copied. */
function v33Mine(m){return m?(DB.projects||[]).filter(p=>p.pm===m.id).sort((a,b)=>(b.created||0)-(a.created||0)):[]}
function v33Tpl(pid){const p=PJ(pid),m=me();if(!p||!m||p.pm!==m.id)return false;const base=String(p.title||"").replace(/^Demo:\s*/i,"").replace(/\s*\(copy\)$/i,"");
 NP={step:0,type:PTPL[p.type]?p.type:"custom",title:(base+" (copy)").slice(0,120),zip:p.zip||m.zip||"78704",start:"",end:"",budget:p.budget&&p.budget!=="Open"?p.budget:"",desc:String(p.desc||""),
  roles:(p.roles||[]).filter(r=>r&&r.trade).map(r=>({trade:r.trade,label:String(r.label||r.trade),need:Math.max(1,Math.min(20,+r.need||1))})),phases:(p.phases&&p.phases.length?p.phases:PTPL[PTPL[p.type]?p.type:"custom"].phases).slice(),from33:p.id};
 if(!NP.roles.length)NP.roles=PTPL[NP.type].roles.map(([trade,label,need])=>({trade,label,need}));return true}
function v33TplSum(p){const n=(p.roles||[]).reduce((a,r)=>a+(+r.need||0),0);return`${(p.roles||[]).length} trade${(p.roles||[]).length===1?"":"s"} · ${n} crew · ${(p.phases||[]).length} phases`}
{const ov=VIEWS.project;VIEWS.project=function(id){let h=ov.apply(this,arguments);try{const m=me(),p=PJ(id);if(!m||!p||p.pm!==m.id)return h;
  const btn=`<button type="button" class="btn ghost" id="v33tpl" data-v33tpl="${esc(p.id)}">${I("layers",16)}Reuse as template</button>`;
  for(const k of ['<div class="upj-act">','<button class="btn" id="advPhase">']){const a=h.indexOf(k);if(a<0)continue;const e=h.indexOf("</div>",a);if(e>0)return h.slice(0,e)+btn+h.slice(e)}
  for(const k of ['<div class="utabs"','<div class="pjtabs"']){const t=h.indexOf(k);if(t>=0)return h.slice(0,t)+`<div class="upj-act v33tpl-r">${btn}</div>`+h.slice(t)}
 }catch(e){console.warn(e)}return h}}
{const oa=AFTER.project;AFTER.project=function(){const r=oa&&oa.apply(this,arguments);try{const b=document.getElementById("v33tpl");if(b)b.onclick=()=>{if(v33Tpl(b.dataset.v33tpl)){go("newproject");toast("Copied. Check the title and dates, then post.")}}}catch(e){}return r}}
{const ov=VIEWS.newproject;VIEWS.newproject=function(){let h=ov.apply(this,arguments);try{const m=me();if(!m||!NP||NP.step!==0)return h;const ps=v33Mine(m);if(!ps.length)return h;
  const src=NP.from33&&PJ(NP.from33);
  const pick=`<div class="v33tp${src?" on":""}" id="v33tp"><div class="fld"><label for="v33ps">${I("layers",16)} Start from one of your projects</label><select id="v33ps"><option value="">Choose a project to copy…</option>${ps.slice(0,30).map(p=>`<option value="${esc(p.id)}" ${src&&src.id===p.id?"selected":""}>${esc(p.title)} (${esc(v33TplSum(p))})</option>`).join("")}</select></div>
   ${src?`<p class="v33tp-n" role="status">${I("check",14)}<span>Copied from <b>${esc(src.title)}</b>: ${esc(v33TplSum(src))}. Crew, applicants and chat aren't copied. Set new dates on the next step.</span></p>`:`<p class="muted small v33tp-n">Copies the trades, crew counts, phases and notes. You set new dates.</p>`}</div>`;
  const k=h.indexOf('<form id="npf" class="form card" novalidate>');if(k>=0){const e=k+'<form id="npf" class="form card" novalidate>'.length;return h.slice(0,e)+pick+h.slice(e)}
 }catch(e){console.warn(e)}return h}}
{const oa=AFTER.newproject;AFTER.newproject=function(){const r=oa&&oa.apply(this,arguments);try{const s=document.getElementById("v33ps");if(s)s.onchange=()=>{if(!s.value)return;if(v33Tpl(s.value))render();const n=document.getElementById("np-title");if(n)n.focus()}}catch(e){}return r}}
