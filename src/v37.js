/* ===== v37 ===== */
const V2_ACTIONS37=["visitConfirm37","visitAsk37","visitPick37","home37Prop","home37PropDel","home37Assign","home37Note","home37NoteDel"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS37);
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

/* (2) My home: a home history per property. Every hired job, the bills that go with it, warranties, photos of the work and
   the owner's own notes (paint colors, filter sizes, where the shutoff is), filed by property: the main home (or business),
   a business's locations, and up to 10 more places a homeowner adds (a rental, a cabin). Jobs file themselves by ZIP and can be
   moved in one tap. Print it or save it as a PDF for a buyer, an insurer or the next owner, or download a CSV. Private to the
   account: it lives on the owner's own record (home37), which other accounts and signed-out visitors never get (server.js). */
const V37_PROPS_MAX=10,V37_NOTES_MAX=200;
function v37H(m){const h=m&&m.home37&&typeof m.home37==="object"?m.home37:{};return{props:Array.isArray(h.props)?h.props:[],as:h.as&&typeof h.as==="object"?h.as:{},notes:Array.isArray(h.notes)?h.notes:[]}}
function v37HomeOk(m){return!!(m&&m.role!=="contractor"&&m.role!=="deleted"&&!m.staff)}
const v37Zip=s=>((String(s||"").match(/\b(\d{5})(?:-\d{4})?\b(?!.*\b\d{5}\b)/)||[])[1]||"");
function v37Props(m){if(!m)return[];const biz=m.acct==="business";const out=[{id:"main",name:biz?(m.biz||"Your business"):"Your home",addr:townOf(m.zip||"")+(m.zip?" "+m.zip:""),zip:String(m.zip||""),main:true}];
 if(biz)(m.locations||[]).forEach(l=>{if(l&&l.id)out.push({id:"loc:"+l.id,name:l.name||"Location",addr:l.addr||"",zip:v37Zip(l.addr),loc:true})});
 v37H(m).props.forEach(p=>{if(p&&p.id)out.push({id:p.id,name:p.name,addr:p.addr||"",zip:p.zip||"",own:true})});return out}
function v37JobsOf(m){return(DB.jobs||[]).filter(j=>j&&j.cust===m.id&&j.hired&&["hired","completed"].includes(j.status))}
function v37BillsOf(m){return(DB.bills||[]).filter(b=>b&&b.cuid===m.id&&b.status!=="draft"&&b.status!=="void")}
function v37BillJob(b,jobs){return jobs.find(j=>j.hired===b.by&&(b.job&&b.job===j.title||b.title===j.title))||null}
function v37PropOf(m,kind,rec,props,jobs){const h=v37H(m),ids=new Set(props.map(p=>p.id)),pin=h.as[kind+":"+rec.id];if(pin&&ids.has(pin))return pin;
 if(kind==="bill"){const j=v37BillJob(rec,jobs);if(j)return v37PropOf(m,"job",j,props,jobs)}
 const z=kind==="job"?String(rec.zip||""):"";if(z){const p=props.find(p=>!p.main&&p.zip===z);if(p)return p.id}return"main"}
function v37File(m){const props=v37Props(m),jobs=v37JobsOf(m),bills=v37BillsOf(m),h=v37H(m),by={};props.forEach(p=>by[p.id]={p,jobs:[],bills:[],free:[],ws:[],notes:[],photos:[]});
 const q=j=>(DB.quotes||[]).find(x=>x.job===j.id&&x.status==="accepted");
 jobs.forEach(j=>{const pid=v37PropOf(m,"job",j,props,jobs);const rv=(DB.reviews||[]).find(r=>r.job===j.id);const at=j.status==="completed"?(j.doneAt||(rv&&rv.date)||j.created+5*864e5):(j.hiredAt||j.created);
  const jb=bills.filter(b=>v37BillJob(b,jobs)===j);const ph=(j.photos||[]).filter(p=>p&&UPLOAD_RE.test(String(p.src||""))).map(p=>({src:p.src,tag:p.kind,cap:p.cap||""})).concat(jb.flatMap(b=>(b.ph36||[]).map(p=>({src:p.src,tag:p.tag,cap:p.cap||""}))));
  const x={j,pro:U(j.hired),amt:q(j)?q(j).price:null,at,bills:jb,photos:ph,rv};by[pid].jobs.push(x);by[pid].photos.push(...ph)});
 bills.forEach(b=>{if(v37BillJob(b,jobs))return;const pid=v37PropOf(m,"bill",b,props,jobs);by[pid].free.push(b);by[pid].photos.push(...(b.ph36||[]).map(p=>({src:p.src,tag:p.tag,cap:p.cap||""})))});
 (typeof h12Warranties==="function"?h12Warranties(m):[]).forEach(w=>{let pid="main";if(w.own){const pin=h.as["item:"+w.id];if(pin&&by[pin])pid=pin}else{const no=String(w.src||"").replace(/^From /,"");const b=bills.find(x=>x.no===no);if(b){const j=v37BillJob(b,jobs);pid=j?v37PropOf(m,"job",j,props,jobs):v37PropOf(m,"bill",b,props,jobs)}}by[pid].ws.push(w)});
 h.notes.forEach(n=>{const pid=by[n.prop]?n.prop:"main";by[pid].notes.push(n);if(n.photo)by[pid].photos.push({src:n.photo,tag:"",cap:n.text.slice(0,80)})});
 Object.values(by).forEach(x=>{x.jobs.sort((a,b)=>b.at-a.at);x.free.sort((a,b)=>b.date-a.date);x.notes.sort((a,b)=>b.date-a.date)});return{props,by}}
function v37Paid(b){return(b.payments||[]).reduce((a,p)=>a+(+p.amt||0),0)}
A.home37Prop=function(o){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};if(!v37HomeOk(m))return{ok:false,msg:"My home is for homeowner and business accounts."};o=o||{};
 const name=v7S(o.name,60),addr=v7S(o.addr,160),zip=String(o.zip||"").trim();if(name.length<2)return{ok:false,msg:"Give the property a name, like \"Lake cabin\"."};if(zip&&!/^\d{5}$/.test(zip))return{ok:false,msg:"ZIP should be 5 digits."};
 m.home37=Object.assign({},v37H(m),m.home37||{});const P=m.home37.props=v37H(m).props;let p=o.id&&P.find(x=>x.id===o.id);
 if(!p){if(P.length>=V37_PROPS_MAX)return{ok:false,msg:"Up to "+V37_PROPS_MAX+" extra properties."};p={id:"hp"+uid(),date:v37Now()};P.push(p)}Object.assign(p,{name,addr,zip:zip||v37Zip(addr)});save();return{ok:true,id:p.id,msg:"Saved "+name}};
A.home37PropDel=function(id){const m=me();if(!v37HomeOk(m))return{ok:false,msg:"My home is for homeowner and business accounts."};const h=v37H(m),i=h.props.findIndex(x=>x.id===id);if(i<0)return{ok:false,msg:"Only properties you added can be removed."};
 h.props.splice(i,1);Object.keys(h.as).forEach(k=>{if(h.as[k]===id)delete h.as[k]});h.notes.forEach(n=>{if(n.prop===id)n.prop="main"});m.home37=Object.assign(m.home37||{},h);save();return{ok:true,msg:"Removed. Its jobs and notes moved back to "+v37Props(m)[0].name+"."}};
A.home37Assign=function(kind,id,prop){const m=me();if(!v37HomeOk(m))return{ok:false,msg:"My home is for homeowner and business accounts."};if(!["job","bill","item"].includes(kind))return{ok:false,msg:"Not allowed"};
 const mine=kind==="job"?v37JobsOf(m).some(j=>j.id===id):kind==="bill"?v37BillsOf(m).some(b=>b.id===id):((m.home12&&m.home12.items)||[]).some(i=>i&&i.id===id);if(!mine)return{ok:false,msg:"That record isn't yours."};
 const p=v37Props(m).find(x=>x.id===prop);if(!p)return{ok:false,msg:"Pick one of your properties."};const h=v37H(m);if(p.main)delete h.as[kind+":"+id];else h.as[kind+":"+id]=p.id;m.home37=Object.assign(m.home37||{},h);save();return{ok:true,msg:"Filed under "+p.name}};
A.home37Note=function(o){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};if(!v37HomeOk(m))return{ok:false,msg:"My home is for homeowner and business accounts."};o=o||{};
 const text=v7S(o.text,500);if(text.length<2)return{ok:false,msg:"Write the note first."};const p=v37Props(m).find(x=>x.id===o.prop);if(!p)return{ok:false,msg:"Pick one of your properties."};
 const h=v37H(m);if(h.notes.length>=V37_NOTES_MAX)return{ok:false,msg:"That's a lot of notes. Remove some first."};const n={id:"hn"+uid(),prop:p.id,text,photo:UPLOAD_RE.test(String(o.photo||""))?String(o.photo):"",date:v37Now()};
 h.notes.push(n);m.home37=Object.assign(m.home37||{},h);save();return{ok:true,id:n.id,msg:"Note saved to "+p.name}};
A.home37NoteDel=function(id){const m=me();if(!v37HomeOk(m))return{ok:false,msg:"My home is for homeowner and business accounts."};const h=v37H(m),i=h.notes.findIndex(x=>x.id===id);if(i<0)return{ok:false,msg:"Not found"};h.notes.splice(i,1);m.home37=Object.assign(m.home37||{},h);save();return{ok:true,msg:"Note removed"}};
function v37Sel(m,props,kind,id,cur){if(props.length<2)return"";const lid="v37mv-"+kind+"-"+esc(id);return`<span class="v37mv"><label for="${lid}" class="sr">Property for this record</label><select id="${lid}" data-v37mv="${kind}" data-id="${esc(id)}">${props.map(p=>`<option value="${esc(p.id)}" ${p.id===cur?"selected":""}>${esc(p.name)}</option>`).join("")}</select></span>`}
function v37Thumbs(ph,max){if(!ph.length)return"";const L=ph.slice(0,max||6);return`<ul class="v37th">${L.map(p=>`<li><img src="${esc(p.src)}" alt="${esc(p.cap||(p.tag?p.tag[0].toUpperCase()+p.tag.slice(1)+" photo":"Photo of the work"))}" loading="lazy" decoding="async" width="96" height="72">${p.tag?`<span class="v37th-t">${esc(p.tag[0].toUpperCase()+p.tag.slice(1))}</span>`:""}</li>`).join("")}${ph.length>L.length?`<li class="v37th-m">+${ph.length-L.length}</li>`:""}</ul>`}
VIEWS.myhome=function(pid){const m=me();if(!m)return VIEWS.signup(null,{next:"/myhome"});
 if(!v37HomeOk(m))return`<section class="page narrow">${empty("house","My home is for homeowners and businesses","It files every job, bill, warranty and photo by property.",`<a class="btn" href="${href("dash")}">Back to dashboard</a>`)}</section>`;
 const F=v37File(m),props=F.props,cur=props.find(p=>p.id===pid)||props[0],X=F.by[cur.id];
 const spent=X.jobs.reduce((a,x)=>a+(x.bills.length?x.bills.filter(b=>b.type==="inv").reduce((s,b)=>s+v37Paid(b),0):(x.j.status==="completed"&&x.amt?+x.amt:0)),0)+X.free.filter(b=>b.type==="inv").reduce((a,b)=>a+v37Paid(b),0);
 const live=X.ws.filter(w=>w.state!=="over").length,done=X.jobs.filter(x=>x.j.status==="completed").length;
 const jobRow=x=>{const t=x.j.archived||x.j.title==="Past job"?(x.j.sub||x.j.cat):x.j.title;return`<li class="v37jr"><span class="h12-dot" aria-hidden="true">${I(TRADE_ICON[x.j.cat]||"wrench",14)}</span><div class="v37jr-b"><div class="v37jr-h"><a href="${href("job",x.j.id)}"><b>${esc(t)}</b></a>${x.j.status==="hired"?'<span class="b7 b7-blue">In progress</span>':""}</div>
  <small class="muted">${esc(fmtDate(x.at))} · ${esc(x.pro?(x.pro.biz||nameOf(x.pro)).replace(/ \(demo\)$/,""):"Pro")} · ${esc(x.j.cat||"")}${x.amt?" · "+esc(v28$(x.amt)):""}</small>
  ${x.bills.length?`<div class="v37bl">${x.bills.map(b=>{const c=billCalc(b);return`<a class="v37b" href="${href("invoice",b.id)}">${I("receipt",12)}${esc(b.no)} · ${esc(v7$(c.total))}${b.type==="inv"?(c.bal<0.005?" · paid":" · "+esc(v7$(c.bal))+" due"):""}</a>`}).join("")}</div>`:""}
  ${v37Thumbs(x.photos,4)}${x.rv?`<small class="h12-rv">${starStr(x.rv.stars)} You reviewed this job</small>`:""}</div>${v37Sel(m,props,"job",x.j.id,cur.id)}</li>`};
 const tabs=`<nav class="v37tabs" aria-label="Your properties">${props.map(p=>`<a href="${href("myhome",p.main?null:p.id)}" class="${p.id===cur.id?"on":""}" ${p.id===cur.id?'aria-current="page"':""}>${I(p.main?"house":p.loc?"brief":"pin",14)}<span>${esc(p.name)}</span><small>${F.by[p.id].jobs.length}</small></a>`).join("")}<button type="button" class="v37add" id="v37addP">${I("plus",14)}<span>Add a property</span></button></nav>`;
 const notes=`<section class="card v37sec v37notes" aria-labelledby="v37nh"><div class="o7-sh"><h2 class="h-sub" id="v37nh">${I("pen",16)} Notes about this place</h2><span class="muted small">${X.notes.length}</span></div>
  <form id="v37nf" class="v37nf no-print"><div class="fld"><label for="v37nt">Add a note</label><textarea id="v37nt" rows="2" maxlength="500" placeholder="Paint: Agreeable Gray SW 7029 · furnace filter 16x25x1 · water shutoff behind the laundry panel"></textarea></div>
  <div class="v37nf-a"><label class="btn sm" for="v37np">${I("camera",14)}Add a photo</label><input id="v37np" type="file" accept="image/jpeg,image/png,image/webp" class="r10-in" hidden><span class="muted small" id="v37npS" role="status"></span><button class="btn sm primary" id="v37nGo">Save note</button></div></form>
  ${X.notes.length?`<ul class="v37nl">${X.notes.map(n=>`<li>${n.photo?`<img src="${esc(n.photo)}" alt="Photo with the note" loading="lazy" width="72" height="72">`:""}<div><p>${esc(n.text)}</p><small class="muted">${esc(fmtDate(n.date))}</small></div><button type="button" class="linkbtn no-print" data-v37nd="${esc(n.id)}" aria-label="Remove note from ${esc(fmtDate(n.date))}">${I("x",14)}</button></li>`).join("")}</ul>`:`<p class="muted small">Paint colors, filter sizes, where the shutoffs are. The things the next owner always asks.</p>`}</section>`;
 const ws=`<section class="card v37sec" aria-labelledby="v37wh"><div class="o7-sh"><h2 class="h-sub" id="v37wh">${I("shield",16)} Warranties</h2><a class="small no-print" href="${href("homelog","warranty")}">Add or edit in the home log</a></div>${X.ws.length?`<ul class="v37wl">${X.ws.map(w=>`<li class="${esc(w.state)}"><b>${esc(w.name)}</b><small class="muted">${esc([w.pro,w.src].filter(Boolean).join(" · "))}</small><span>${w.state==="over"?"Expired "+esc(fmtDate(w.end)):esc(String(w.years))+"-yr · until "+esc(fmtDate(w.end))}</span>${w.own?v37Sel(m,props,"item",w.id,cur.id):""}</li>`).join("")}</ul>`:`<p class="muted small">Warranties on your Sawyer invoices show up here by themselves.</p>`}</section>`;
 const free=X.free.length?`<section class="card v37sec" aria-labelledby="v37fh"><div class="o7-sh"><h2 class="h-sub" id="v37fh">${I("receipt",16)} Other bills</h2></div><ul class="v37fl">${X.free.map(b=>{const c=billCalc(b);return`<li><a href="${href("invoice",b.id)}"><b>${esc(b.no)}</b> <span>${esc(b.title||"")}</span></a><small class="muted">${esc(b.bizName||"")} · ${esc(fmtDate(b.date))} · ${esc(v7$(c.total))}${b.type==="inv"?(c.bal<0.005?" · paid":" · "+esc(v7$(c.bal))+" due"):""}</small>${v37Sel(m,props,"bill",b.id,cur.id)}</li>`}).join("")}</ul></section>`:"";
 const printed=new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
 return`<section class="v37" id="v37home"><div class="v37top"><div class="wrap"><span class="eyebrow">${I("house",14)}My home</span><h1>${esc(cur.name)}</h1><p class="muted">${esc(cur.addr||"Add an address so the printout says which place it is.")}</p>
 <p class="v37pr print-only">Home history printed ${esc(printed)} from __BRAND__. Work, bills and warranties recorded through __BRAND__, plus the owner's own notes.</p>
 <div class="h12-k"><div><b>${done}</b><small>jobs done</small></div><div><b>${esc(money(spent))}</b><small>paid through __BRAND__</small></div><div><b>${live}</b><small>active warranties</small></div><div><b>${X.photos.length}</b><small>photos</small></div></div>
 ${tabs}<div class="v37act no-print"><button type="button" class="btn sm primary" id="v37print">${I("printer",14)}Print or save as PDF</button><button type="button" class="btn sm" id="v37csv">${I("download",14)}Download (CSV)</button>${cur.own?`<button type="button" class="btn sm ghost" id="v37edit" data-id="${esc(cur.id)}">${I("edit",14)}Edit property</button>`:""}<span class="muted small">Private to you. Handy when you sell, insure or rent it out.</span></div></div></div>
 <div class="wrap v37body"><section class="card v37sec" aria-labelledby="v37jh"><div class="o7-sh"><h2 class="h-sub" id="v37jh">${I("wrench",16)} Work done here</h2><span class="muted small">${X.jobs.length} job${X.jobs.length===1?"":"s"}</span></div>
 ${X.jobs.length?`<ol class="v37jl">${X.jobs.map(jobRow).join("")}</ol>`:`<p class="muted small">${props.length>1?"No jobs filed under this property yet. Move one here with the picker next to it.":"Jobs you hire a pro for on __BRAND__ show up here with their bills and photos."}</p><a class="btn sm no-print" href="${href("post")}">Request a pro</a>`}</section>
 ${free}${ws}${notes}<p class="muted small v37ft">${I("lock",13)} Only you can see this page. Nothing here is shared with pros or buyers unless you print or send it yourself.</p></div></section>`};
if(typeof TITLES!=="undefined")TITLES.myhome="My home";
function v37Csv(m,cur,X){const c=typeof csvCell==="function"?csvCell:(x=>'"'+String(x==null?"":x).replace(/"/g,'""')+'"');const rows=[["Property",cur.name],["Address",cur.addr],[],["Date","Type","What","Pro / from","Trade","Amount","Bills","Photos"]];
 X.jobs.forEach(x=>rows.push([new Date(x.at).toISOString().slice(0,10),x.j.status==="completed"?"Job done":"Job in progress",x.j.title==="Past job"?(x.j.sub||x.j.cat):x.j.title,x.pro?(x.pro.biz||nameOf(x.pro)):"",x.j.cat||"",x.amt!=null?(+x.amt).toFixed(2):"",x.bills.map(b=>b.no).join(" "),x.photos.length]));
 X.free.forEach(b=>rows.push([new Date(b.date).toISOString().slice(0,10),"Bill",b.no+" "+(b.title||""),b.bizName||"","",billCalc(b).total.toFixed(2),b.no,(b.ph36||[]).length]));
 X.ws.forEach(w=>rows.push([new Date(w.start).toISOString().slice(0,10),"Warranty",w.name,w.pro||"","","",w.src||"","until "+new Date(w.end).toISOString().slice(0,10)]));
 X.notes.forEach(n=>rows.push([new Date(n.date).toISOString().slice(0,10),"Note",n.text,"","","","",n.photo?1:0]));
 return"\ufeff"+rows.map(r=>r.map(c).join(",")).join("\r\n")}
function v37PropModal(p){p=p||{};modal(`<form id="v37pf" class="v37pf"><h2 id="mtitle">${I("house",20)} ${p.id?"Edit property":"Add a property"}</h2><p class="muted small">A rental, a cabin, a parent's house you look after. Jobs in its ZIP file here by themselves.</p>
 <div class="fld"><label for="v37pn">Name</label><input id="v37pn" maxlength="60" required value="${esc(p.name||"")}" placeholder="Lake cabin"></div><div class="fld"><label for="v37pa">Address <span class="muted">(optional)</span></label><input id="v37pa" maxlength="160" autocomplete="street-address" value="${esc(p.addr||"")}" placeholder="410 Lakeshore Dr, Manistee, MI"></div>
 <div class="fld"><label for="v37pz">ZIP</label><input id="v37pz" inputmode="numeric" maxlength="5" pattern="[0-9]{5}" autocomplete="postal-code" value="${esc(p.zip||"")}"></div><p class="small v37as-e" id="v37pfE" role="alert"></p>
 <div class="actions">${p.id?`<button type="button" class="btn ghost" id="v37pDel">Remove property</button>`:""}<button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div></form>`,"v33sheet");
 document.querySelectorAll("#modal [data-close]").forEach(x=>x.onclick=closeModal);
 document.getElementById("v37pf").onsubmit=e=>{e.preventDefault();const r=A.home37Prop({id:p.id,name:document.getElementById("v37pn").value,addr:document.getElementById("v37pa").value,zip:document.getElementById("v37pz").value});if(r&&r.ok===false){document.getElementById("v37pfE").textContent=r.msg;return}closeModal();act(r,()=>go("myhome",r.id))};
 const d=document.getElementById("v37pDel");if(d)d.onclick=()=>{closeModal();act(A.home37PropDel(p.id),()=>go("myhome"))}}
AFTER.myhome=function(pid){const m=me();if(!m||!v37HomeOk(m))return;const F=v37File(m),cur=F.props.find(p=>p.id===pid)||F.props[0],X=F.by[cur.id];const $=id=>document.getElementById(id);
 const ap=$("v37addP");if(ap)ap.onclick=()=>v37PropModal(null);const ed=$("v37edit");if(ed)ed.onclick=()=>v37PropModal(v37H(m).props.find(p=>p.id===ed.dataset.id));
 const pr=$("v37print");if(pr)pr.onclick=()=>window.print();
 const cv=$("v37csv");if(cv)cv.onclick=()=>{const blob=new Blob([v37Csv(m,cur,X)],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="home-history-"+String(cur.name).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+".csv";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)};
 document.querySelectorAll("[data-v37mv]").forEach(s=>s.onchange=()=>act(A.home37Assign(s.dataset.v37mv,s.dataset.id,s.value),()=>{const y=scrollY;render();scrollTo(0,y)}));
 document.querySelectorAll("[data-v37nd]").forEach(b=>b.onclick=()=>act(A.home37NoteDel(b.dataset.v37nd),()=>{const y=scrollY;render();scrollTo(0,y)}));
 let photo="";const np=$("v37np"),ns=$("v37npS");if(np)np.onchange=async()=>{const f0=np.files&&np.files[0];if(!f0)return;if(ns)ns.textContent="Uploading…";try{const f=typeof r10shrink==="function"?await r10shrink(f0):f0;photo=await v2upload(f);if(ns)ns.textContent="Photo ready"}catch(e){photo="";if(ns)ns.textContent="";toast(e.message||"Upload failed","err")}};
 const nf=$("v37nf");if(nf)nf.onsubmit=e=>{e.preventDefault();const r=A.home37Note({prop:cur.id,text:$("v37nt").value,photo});act(r,()=>{photo="";const y=scrollY;render();scrollTo(0,y)})}};
/* links: home log header, account menu, dashboard, search palette */
// the home log view is swapped in by the lazy layer (v12-lazy), so the link goes in after each render
{const oa=AFTER.homelog;AFTER.homelog=function(){const r=oa&&oa.apply(this,arguments);try{const t=document.querySelector(".h12-top .wrap>p.muted");if(t&&!document.querySelector(".v37hl"))t.insertAdjacentHTML("afterend",`<p class="v37hl"><a class="btn sm" href="${href("myhome")}">${I("house",14)}Home history by property</a></p>`)}catch(e){}return r}}
{const os=SHELL;SHELL=function(){os.apply(this,arguments);if(typeof document==="undefined"||!document.getElementById)return;const m=me();const am=document.getElementById("acctMenu");if(!am||!v37HomeOk(m)||am.querySelector("[data-v37]"))return;
 const hl=am.querySelector('a[href="'+href("homelog")+'"],a[href="/homelog"]');const x=`<a href="${href("myhome")}" data-v37>${I("house",16)}My home</a>`;if(hl)hl.insertAdjacentHTML("afterend",x);else{const f=am.querySelector("a");if(f)f.insertAdjacentHTML("afterend",x)}}}
{const od=VIEWS.dash;VIEWS.dash=function(){let h=od.apply(this,arguments);try{const m=me();if(!v37HomeOk(m))return h;const F=v37File(m);const n=F.props.reduce((a,p)=>a+F.by[p.id].jobs.length,0);
  const card=`<a class="card v37dc" href="${href("myhome")}"><span class="h12-ti">${I("house",20)}</span><span><b>My home</b><small>${n} job${n===1?"":"s"} on file${F.props.length>1?" across "+F.props.length+" properties":""} · print a home history for a buyer or insurer</small></span>${I("chev",16)}</a>`;
  const k=h.indexOf('<a class="card h12-teaser"');if(k>=0){const e=h.indexOf("</a>",k);return h.slice(0,e+4)+`<div class="o7-wrap v37dw">`+card+`</div>`+h.slice(e+4)}return h}catch(e){return h}}}
/* phone alerts (v32): appointment updates are their own switch, on by default for everyone */
if(typeof v32Cats==="function"){const oc=v32Cats;v32Cats=function(m){const L=oc.apply(this,arguments);return L.some(x=>x[0]==="visits")?L:L.concat([["visits",m&&m.role==="contractor"?"A customer confirms or asks to move a visit":"My pro is on the way, or my appointment is set or moved"]])}}
