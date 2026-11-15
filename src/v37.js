/* ===== v37 ===== */
const V2_ACTIONS37=["visitConfirm37","visitAsk37","visitPick37"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS37);
function v37Now(){return typeof __now==="function"?__now():Date.now()}

/* (1) Appointments customers can count on (competitor-flaws #12: no-shows and unreliable scheduling).
   The pro's visit (v8 Schedule) gets an arrival window ("Arrive 8-10am"), can be tied to a hired job, and the customer sees it
   on that job's page, on the tracker and on their dashboard. The customer taps Confirm, or Ask to reschedule with up to 3 times
   that work for them plus a note; the pro picks one in a tap and the visit moves. Any time change by the pro asks the customer
   to confirm again. "On my way" (v8) keeps its live ETA. Everything stays between that pro and that customer: visits only reach
   their two parties in /api/state (server.js), and alerts go through the normal in-app notices (+ phone alerts when on). */
const V37_WIN=[[0,"Exact time"],[60,"1-hour window"],[120,"2-hour window"],[180,"3-hour window"],[240,"4-hour window"]];
function v37Win(v){const w=+(v&&v.win37);return V37_WIN.some(x=>x[0]===w)?w:0}
function v37Add(t,min){const[h,m]=String(t||"00:00").split(":").map(Number);const n=Math.min(23*60+59,h*60+m+min);return String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0")}
function v37Range(v){const w=v37Win(v);if(!w)return"at "+v8Fmt12(v.start);const a=v8Fmt12(v.start),b=v8Fmt12(v37Add(v.start,w)),am=s=>s.slice(-2);return"arrive "+(am(a)===am(b)?a.slice(0,-2):a)+"–"+b}
function v37When(v){return v7DateNice(v.date)+", "+v37Range(v)}
function v37Conf(v){const c=v&&v.conf37;return c&&["pending","ok","ask"].includes(c.s)?c:{s:"pending"}}
function v37Open(v){return v&&v.status==="scheduled"&&v.date>=v7Today()}
const V37CF={pending:["Waiting for the customer","b7-gold"],ok:["Confirmed","b7-good"],ask:["Asked to reschedule","b7-bad"]};
function v37Badge(v,cust){if(!v37Open(v))return v8Badge(v.status);const c=v37Conf(v);const t=cust?{pending:"Please confirm",ok:"You confirmed",ask:"Reschedule asked"}[c.s]:V37CF[c.s][0];return`<span class="b7 ${V37CF[c.s][1]}">${t}</span>`}
{const os=A.saveVisit;A.saveVisit=function(o){const m=me();o=o||{};
  if(o.win!==undefined&&o.win!==""&&o.win!==null&&!V37_WIN.some(x=>String(x[0])===String(o.win)))return{ok:false,msg:"Pick an arrival window"};
  const prev=o.id&&v8Visit(o.id),before=prev?[prev.date,prev.start,v37Win(prev)].join("|"):null,nb=(DB.notifs||[]).length;
  const r=os.apply(this,arguments);if(!r||!r.ok||!r.id)return r;
  try{const v=v8Visit(r.id);if(!v||!m||v.by!==m.id)return r;
   if(o.win!==undefined&&o.win!==""&&o.win!==null)v.win37=+o.win;else if(!prev)v.win37=0;
   if(o.job){const j=(DB.jobs||[]).find(x=>x&&x.id===o.job);if(j&&j.hired===m.id&&j.cust&&j.cust===v.cuid)v.job37=j.id}
   const now=v37Now(),moved=prev&&before!==[v.date,v.start,v37Win(v)].join("|");
   if(!prev||moved)v.conf37={s:"pending",at:now};
   if(!prev&&v.cuid){const n=(DB.notifs||[]).slice(nb).find(x=>x&&x.to===v.cuid&&x.link==="visit:"+v.id);if(n)n.text=`${v.bizName} scheduled "${v.title}" for ${v37When(v)}. Tap to confirm or ask for another time.`}
   if(moved&&v.cuid&&v.status==="scheduled")notify(v.cuid,`${v.bizName} moved "${v.title}" to ${v37When(v)}. Please confirm the new time.`,"visit:"+v.id);
   save()}catch(e){}return r}}
const v37Who=m=>String(m&&(m.acct==="business"&&m.biz?m.biz:(m.name||"Your customer"))).replace(/ \(demo\)$/,"");
A.visitConfirm37=function(id){const m=me(),v=v8Visit(id);if(!m)return{ok:false,need:"login",msg:"Sign in first"};if(!v||v.cuid!==m.id)return{ok:false,msg:"That appointment isn't yours."};
 if(!v37Open(v))return{ok:false,msg:"This visit isn't waiting on a time any more."};if(v37Conf(v).s==="ok")return{ok:true,msg:"Already confirmed"};
 v.conf37={s:"ok",at:v37Now(),by:"cust"};notify(v.by,`${v37Who(m)} confirmed ${v37When(v)}: ${v.title}`,"visit:"+v.id);save();return{ok:true,msg:"Confirmed. "+v.bizName+" can see it."}};
A.visitAsk37=function(id,slots,note){const m=me(),v=v8Visit(id);if(!m)return{ok:false,need:"login",msg:"Sign in first"};if(!v||v.cuid!==m.id)return{ok:false,msg:"That appointment isn't yours."};
 if(!v37Open(v))return{ok:false,msg:"This visit isn't waiting on a time any more."};if((v.ask37n||0)>=6)return{ok:false,msg:"You've asked a few times already. Message "+v.bizName+" instead."};
 const today=v7Today(),max=new Date(Date.now()+180*864e5).toISOString().slice(0,10),seen=new Set(),out=[];
 for(const s of (Array.isArray(slots)?slots:[]).slice(0,6)){const d=v7Date(s&&s.date),t=v8T(s&&s.start);if(!d&&!t)continue;if(!d||!t)return{ok:false,msg:"Give each time you offer a day and a time."};
  if(d<today||d>max)return{ok:false,msg:"Pick days from today up to 6 months out."};const k=d+" "+t;if(seen.has(k)||k===v.date+" "+v.start)continue;seen.add(k);out.push({date:d,start:t})}
 if(!out.length)return{ok:false,msg:"Offer at least one other time that works for you."};if(out.length>3)return{ok:false,msg:"Offer up to 3 times."};
 v.conf37={s:"ask",at:v37Now(),slots:out,note:v7S(note,300)};v.ask37n=(v.ask37n||0)+1;
 notify(v.by,`${v37Who(m)} asked to move "${v.title}" (${v7DateNice(v.date)}) and offered ${out.length} other time${out.length===1?"":"s"}.`,"visit:"+v.id);save();return{ok:true,msg:"Sent. "+v.bizName+" will pick one of your times."}};
A.visitPick37=function(id,i){const m=me(),v=v8Visit(id);if(!m||!v||v.by!==m.id)return{ok:false,msg:"Not your visit"};const c=v37Conf(v);
 if(v.status!=="scheduled"||c.s!=="ask")return{ok:false,msg:"There's no reschedule request on this visit."};const s=(c.slots||[])[+i];if(!s)return{ok:false,msg:"Pick one of the customer's times."};
 if(s.date<v7Today())return{ok:false,msg:"That day has passed. Edit the visit to pick a new time."};
 v.date=s.date;v.start=s.start;v.conf37={s:"ok",at:v37Now(),by:"pick"};if(v.cuid)notify(v.cuid,`${v.bizName} moved "${v.title}" to ${v37When(v)}, a time you offered. You're all set.`,"visit:"+v.id);
 save();return{ok:true,msg:"Moved to "+v37When(v)+". Customer told."}};
/* the customer's appointment card (job page, tracker) */
function v37Card(v){const c=v37Conf(v),open=v37Open(v),pro=U(v.by)||{},id=esc(v.id);
 const line=v.status==="enroute"?`${esc(v.bizName)} is on the way. About ${esc(String(v8Eta(v)))} min.`:v.status==="arrived"?`${esc(v.bizName)} is on site.`:v.status==="done"?"This visit is done.":v.status==="canceled"?"This visit was canceled.":!open?"This day has passed.":
  c.s==="ok"?`You confirmed. ${esc(v.bizName)} has it on their schedule.`:c.s==="ask"?`You offered ${(c.slots||[]).length} other time${(c.slots||[]).length===1?"":"s"}. ${esc(v.bizName)} will pick one, or message you.`:`Does this time work? ${esc(v.bizName)} is waiting for your answer.`;
 const acts=open?(c.s==="pending"?`<button type="button" class="btn primary" data-v37ok="${id}">${I("check",15)}Confirm this time</button><button type="button" class="btn" data-v37ask="${id}">${I("cal",15)}Ask to reschedule</button>`
  :c.s==="ok"?`<button type="button" class="btn ghost sm" data-v37ask="${id}">Need a different time?</button>`:`<button type="button" class="btn ghost sm" data-v37ask="${id}">Change the times I offered</button>`):"";
 return`<section class="card v37ap s-${esc(v.status)} c-${open?esc(c.s):"x"}" id="v37ap-${id}" aria-labelledby="v37ah-${id}"><div class="v37ap-h"><span class="o9-ic">${I(v.status==="enroute"?"truck":"cal",18)}</span><div class="v37ap-t"><span class="kick">Appointment</span><h2 id="v37ah-${id}">${esc(v.title)}</h2>
 <p class="v37ap-w"><b>${esc(v7DateNice(v.date))}</b> · ${esc(v37Range(v).replace(/^a/,"A"))}</p><small class="muted">${esc(v.bizName)}${v.hrs?" · about "+esc(String(v.hrs))+" hr"+(+v.hrs===1?"":"s"):""}</small></div>${v37Badge(v,true)}</div>
 <p class="v37ap-s" role="status" aria-live="polite">${line}</p>${open&&c.s==="ask"?`<ul class="v37ap-sl" aria-label="Times you offered">${(c.slots||[]).map(s=>`<li>${esc(v7DateNice(s.date))}, ${esc(v8Fmt12(s.start))}</li>`).join("")}</ul>`:""}
 <div class="v37ap-a">${acts}${["enroute","arrived"].includes(v.status)||open?`<a class="btn ${acts?"ghost sm":"primary"}" href="${href("track",v.id)}">${I("route",14)}${v.status==="enroute"?"Track":"Details"}</a>`:""}${pro.id?`<a class="btn ghost sm" href="${href("msgs",v.by)}">${I("chat",14)}Message</a>`:""}</div></section>`}
function v37JobVisits(j,m){if(!j||!m)return[];const today=v7Today();return(DB.visits||[]).filter(v=>v&&v.status!=="canceled"&&((j.cust===m.id&&v.cuid===m.id&&v.by===j.hired)||(j.hired===m.id&&v.by===m.id&&v.cuid===j.cust))&&(!v.job37||v.job37===j.id)&&(v.date>=today||["enroute","arrived"].includes(v.status))).sort((a,b)=>(a.date+a.start)<(b.date+b.start)?-1:1)}
function v37AskModal(v){const today=v7Today(),c=v37Conf(v),pre=c.s==="ask"?(c.slots||[]):[];const row=i=>{const s=pre[i]||{};return`<div class="v37as-r"><div class="fld"><label for="v37d${i}">Option ${i+1}: day</label><input id="v37d${i}" type="date" min="${today}" value="${esc(s.date||"")}" ${i?"":"required"}></div><div class="fld"><label for="v37t${i}">Time</label><input id="v37t${i}" type="time" step="900" value="${esc(s.start||"")}" ${i?"":"required"}></div></div>`};
 modal(`<form class="v37as" id="v37as" novalidate><h2 id="mtitle">${I("cal",20)} Ask to reschedule</h2><p class="muted small">Now: <b>${esc(v37When(v))}</b>. Offer up to 3 times that work for you; ${esc(v.bizName)} picks one and you're both set.</p>
 ${[0,1,2].map(row).join("")}<div class="fld"><label for="v37n">Anything ${esc(v.bizName)} should know? <span class="muted">(optional)</span></label><textarea id="v37n" rows="2" maxlength="300" placeholder="Mornings are best, gate code changes Friday">${esc(c.s==="ask"?c.note||"":"")}</textarea></div>
 <p class="small v37as-e" id="v37asE" role="alert"></p><div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary" id="v37asGo">${I("send",15)}Send times</button></div></form>`,"v33sheet");
 document.querySelectorAll("#modal [data-close]").forEach(x=>x.onclick=closeModal);
 document.getElementById("v37as").onsubmit=e=>{e.preventDefault();const slots=[0,1,2].map(i=>({date:document.getElementById("v37d"+i).value,start:document.getElementById("v37t"+i).value}));
  const r=A.visitAsk37(v.id,slots,document.getElementById("v37n").value);if(r&&r.ok===false){document.getElementById("v37asE").textContent=r.msg;return}closeModal();act(r,()=>{const y=scrollY;render();scrollTo(0,y)})}}
function v37Bind(root){(root||document).querySelectorAll("[data-v37ok]").forEach(b=>b.onclick=()=>{b.disabled=true;act(A.visitConfirm37(b.dataset.v37ok),()=>{const y=scrollY;render();scrollTo(0,y)})});
 (root||document).querySelectorAll("[data-v37ask]").forEach(b=>b.onclick=()=>{const v=v8Visit(b.dataset.v37ask);if(v)v37AskModal(v)})}
/* pro side on a hired job: visits for this job + Schedule a visit */
function v37ProCard(j,m){const vs=v37JobVisits(j,m);
 return`<section class="card v37pj" id="v37pj" aria-labelledby="v37pjh"><div class="o7-sh"><h2 class="h-sub" id="v37pjh">${I("cal",16)} Visits for this job</h2><button type="button" class="btn sm primary" id="v37new" data-job="${esc(j.id)}">${I("plus",14)}Schedule a visit</button></div>
 ${vs.length?`<ul class="v37pj-l">${vs.map(v=>`<li><a href="${href("schedule",null,{v:v.id})}"><b>${esc(v7DateNice(v.date))}</b><span>${esc(v37Range(v))} · ${esc(v.title)}</span></a>${v37Badge(v,false)}</li>`).join("")}</ul>`:`<p class="muted small">Give ${esc(String((U(j.cust)||{}).name||"the customer").split(" ")[0])} a day and an arrival window. They confirm in one tap or offer other times, and "On my way" tells them you're coming.</p>`}</section>`}
{const ov=VIEWS.job;VIEWS.job=function(id,q){let h=ov.apply(this,arguments);try{const m=me(),j=(DB.jobs||[]).find(x=>x&&x.id===id);if(!m||!j||!j.hired||!["hired","completed"].includes(j.status))return h;let card="";
  if(j.cust===m.id){const vs=v37JobVisits(j,m);if(!vs.length)return h;card=`<div class="v37aps">${vs.slice(0,3).map(v37Card).join("")}</div>`}else if(j.hired===m.id&&j.status==="hired"&&v7Pro(m))card=v37ProCard(j,m);else return h;
  const k=h.lastIndexOf("</section>");return k<0?h+card:h.slice(0,k)+card+h.slice(k)}catch(e){return h}}}
{const oa=AFTER.job;AFTER.job=function(id,q){const r=oa&&oa.apply(this,arguments);try{v37Bind(document.getElementById("app"));const b=document.getElementById("v37new");
  if(b)b.onclick=()=>{const j=(DB.jobs||[]).find(x=>x.id===b.dataset.job);const r=A.custFromJob(b.dataset.job);if(!r||!r.ok)return act(r);const pre={cust:r.id,title:j?j.title:"",job:b.dataset.job};go("schedule",null,Object.assign({new:1},pre));
   // the route change closes any open sheet (hashchange) and clears it 180 ms later, so open ours once that has run
   let n=0;const t=setInterval(()=>{if(++n>25)return clearInterval(t);if(n<3||ROUTE.v!=="schedule"||!document.querySelector(".sc8-desk,.sc8-mob"))return;clearInterval(t);if(!document.querySelector("#modal.on #vm8f"))v8VisitModal(null,pre)},100)}}catch(e){console.warn(e)}return r}}
{const ov=VIEWS.track;VIEWS.track=function(id){let h=ov.apply(this,arguments);try{const m=me(),v=v8Visit(id);if(!m||!v)return h;
  if(v.cuid===m.id&&v.by!==m.id){const a='<aside class="tk8-side">',k=h.indexOf(a);if(k>=0&&(v37Open(v)))h=h.slice(0,k+a.length)+v37Card(v)+h.slice(k+a.length)}
  if(v.status==="scheduled"){const s=v8Fmt12(v.start);h=h.replace(`<span>Scheduled for</span><b>${s}</b>`,()=>`<span>${v37Win(v)?"Arriving between":"Scheduled for"}</span><b>${esc(v37Range(v).replace(/^(at|arrive) /,""))}</b>`)}}catch(e){}return h}}
{const oa=AFTER.track;AFTER.track=function(id){const r=oa&&oa.apply(this,arguments);try{v37Bind(document.getElementById("app"))}catch(e){}return r}}
/* week calendar chips and the visit sheet */
{const oc=v8Chip;v8Chip=function(v){let h=oc.apply(this,arguments);try{if(v37Win(v))h=h.replace("<b>"+v8Fmt12(v.start)+" · ",()=>"<b>"+esc(v37Range(v).replace(/^arrive /,""))+" · ");
  if(v37Open(v)&&v.cuid){const c=v37Conf(v);const t={pending:["?","Not confirmed yet"],ok:["✓","Confirmed"],ask:["↻","Asked to reschedule"]}[c.s];
   h=h.replace(/aria-label="([^"]*)"/,(x,l)=>`aria-label="${l}, ${t[1]}"`).replace(/<\/button>$/,()=>`<i class="v37c v37c-${c.s}" aria-hidden="true" title="${t[1]}">${t[0]}</i></button>`)}}catch(e){}return h}}
{const om=v8VisitModal;v8VisitModal=function(v,pre){const r=om.apply(this,arguments);try{v=v||{};pre=pre||{};const f=document.getElementById("vm8f");if(!f)return r;
  const w=v.id?v37Win(v):(+pre.win||0),job=v.job37||pre.job||(typeof ROUTE!=="undefined"&&ROUTE.q&&ROUTE.q.job)||"";
  const fs=f.querySelector("fieldset");const box=`<div class="fld v37w"><label for="vm-w">Arrival window</label><select id="vm-w" name="win" aria-describedby="vm-wh">${V37_WIN.map(([k,l])=>`<option value="${k}" ${k===w?"selected":""}>${l}</option>`).join("")}</select><small id="vm-wh" class="muted">The customer sees "Arrive 8–10am" and confirms it, or offers other times.</small></div><input type="hidden" name="job" value="${esc(job)}">`;
  if(fs)fs.insertAdjacentHTML("beforebegin",box);else f.insertAdjacentHTML("afterbegin",box);
  const vw=document.querySelector(".vm8-v");if(vw&&v.id){const c=v37Conf(v);const dd=vw.querySelector(".o7-dl dd");if(dd&&v37Win(v))dd.textContent=v7DateNice(v.date)+", "+v37Range(v)+" · "+v.hrs+" hrs";
   if(v.cuid&&v37Open(v)){const blk=`<div class="v37cf c-${c.s}" role="status"><b>${I(c.s==="ok"?"check":c.s==="ask"?"repeat":"clock",15)} ${esc(V37CF[c.s][0])}</b>${c.s==="ask"?`<p class="small">${esc(v.cname)} offered:</p><ul class="v37cf-l">${(c.slots||[]).map((s,i)=>`<li><span>${esc(v7DateNice(s.date))}, ${esc(v8Fmt12(s.start))}</span><button type="button" class="btn sm primary" data-v37pick="${i}">Use this time</button></li>`).join("")}</ul>${c.note?`<p class="small muted v37cf-n">“${esc(c.note)}”</p>`:""}`:c.s==="pending"?`<p class="small muted">${esc(v.cname)} hasn't confirmed yet.</p>`:""}</div>`;
    const st=vw.querySelector(".vm8-st");if(st)st.insertAdjacentHTML("beforebegin",blk);else vw.insertAdjacentHTML("beforeend",blk);
    vw.querySelectorAll("[data-v37pick]").forEach(b=>b.onclick=()=>act(A.visitPick37(v.id,+b.dataset.v37pick),()=>{closeModal();render()}))}}}catch(e){console.warn(e)}return r}}
/* dashboard: an appointment waiting for the customer comes first */
{const on=v8Next;v8Next=function(m){let out=on.apply(this,arguments);try{if(!m||v7Pro(m))return out;const vs=(DB.visits||[]).filter(v=>v&&v.cuid===m.id&&v37Open(v)&&v37Conf(v).s==="pending").sort((a,b)=>(a.date+a.start)<(b.date+b.start)?-1:1);
  if(vs.length){const v=vs[0],l=href("track",v.id);out=out.filter(x=>x.link!==l);out.unshift({icon:"cal",tone:"gold",title:`Confirm ${v37When(v)}`,sub:`${v.bizName} · ${v.title}${vs.length>1?` · +${vs.length-1} more`:""}`,link:l,cta:"Confirm"});out=out.slice(0,5)}}catch(e){}return out}}
