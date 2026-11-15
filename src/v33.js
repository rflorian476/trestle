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

/* the pro dashboard card goes right under "Here's what's next" */
{const ov=VIEWS.dash;VIEWS.dash=function(){let h=ov.apply(this,arguments);try{const m=me();if(!m||m.role!=="contractor"||m.staff||(typeof v12Staff==="function"&&v12Staff(m)))return h;
  const add=v33FuCard(m);const i=h.indexOf('<section class="na8"'),j=i<0?-1:h.indexOf("</section>",i);
  if(j>0)h=h.slice(0,j+10)+add+h.slice(j+10);else{const k=h.indexOf('<div class="v13-dtop">');h=k>=0?h.slice(0,k+22)+add+h.slice(k+22):add+h}
 }catch(e){console.warn(e)}return h}}
{const oa=AFTER.dash;AFTER.dash=function(){const r=oa&&oa.apply(this,arguments);try{
  document.querySelectorAll("[data-v33fu]").forEach(b=>b.onclick=()=>v33FuModal(b.dataset.v33fu));}catch(e){}return r}}

