/* ===== v38 ===== */
function v38Now(){return typeof __now==="function"?__now():Date.now()}
/* (1) QA SW-088: a hired job (completed, or canceled after a hire) leaves the catalog once nobody who was on it still has an
   account. Live jobs already block deletion (A.__delete13), and a job with one living party stays for that party's records
   (the pro's portfolio and reviews, the homeowner's My home). When the last party deletes, the job is removed outright with
   its quotes, the reviews written on it, the notices that pointed at it and its saved copies, so /job/<id> is the plain
   "Not found" page and the public counts go back to what they were. Called from A.__delete13 after the account is anonymized,
   and once at start for jobs left behind by accounts deleted before v38 (v38JobOrphans, server.js). Demo jobs are never touched. */
function v38Gone(id,live){return!id||!live.has(id)}
function v38Live(){return new Set((DB.users||[]).filter(u=>u&&u.id&&u.role!=="deleted").map(u=>u.id))}
function v38JobDemo(j){return!!(j&&(j.demo||/\(demo\)/i.test(String(j.title||""))))}
function v38Drop(drop){if(!drop.size)return 0;
 DB.jobs=(DB.jobs||[]).filter(j=>!(j&&drop.has(j.id)));DB.quotes=(DB.quotes||[]).filter(q=>!(q&&drop.has(q.job)));
 DB.reviews=(DB.reviews||[]).filter(r=>!(r&&r.job&&drop.has(r.job)));
 DB.notifs=(DB.notifs||[]).filter(n=>!(n&&typeof n.link==="string"&&n.link.startsWith("job:")&&drop.has(n.link.slice(4))));
 (DB.visits||[]).forEach(v=>{if(v&&v.job37&&drop.has(v.job37))delete v.job37});
 (DB.users||[]).forEach(u=>{if(u&&Array.isArray(u.saved))u.saved=u.saved.filter(x=>!drop.has(x));if(u&&u.home37&&u.home37.as)Object.keys(u.home37.as).forEach(k=>{if(drop.has(k.replace(/^job:/,"")))delete u.home37.as[k]})});
 return drop.size}
function v38JobsGone(uid){if(!uid)return 0;const live=v38Live(),drop=new Set();
 for(const j of (DB.jobs||[])){if(!j||v38JobDemo(j)||(j.cust!==uid&&j.hired!==uid))continue;if(!j.hired)continue;
  if(v38Gone(j.cust,live)&&v38Gone(j.hired,live))drop.add(j.id)}
 return v38Drop(drop)}
/* jobs whose parties were all deleted before v38 (the live jtcksnex shape: cust null or deleted, hired deleted) */
function v38JobOrphans(){const live=v38Live(),drop=new Set();
 for(const j of (DB.jobs||[])){if(!j||v38JobDemo(j)||!j.hired)continue;if(["hired","escrow"].includes(j.status))continue;
  if(v38Gone(j.cust,live)&&v38Gone(j.hired,live))drop.add(j.id)}
 return v38Drop(drop)}

const V2_ACTIONS38=["setTz38","w9Set38"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS38);

/* (2) Appointment times in the customer's own time zone (QA v37 idea 1). Sawyer is nationwide: a pro near a zone line, or a
   homeowner booking work at a lake cabin from another state, used to see the pro's clock with no label. A visit now remembers
   the pro's zone when it is saved (tz38, from the pro's ZIP or their own choice) and the customer's (ctz38). The customer sees
   every time on the Appointment card, tracker, dashboard, reschedule sheet and in the notices converted to their zone with a
   label ("arrive 8–10am CT"); times they offer are converted back before they're sent. The pro sees the customer's clock next
   to theirs when the zones differ. Zones come from the ZIP (3-digit prefix ranges, the main zone where a state is split) and
   anyone can pick theirs (setTz38). */
const V38_TZ=[["America/New_York","Eastern","ET"],["America/Chicago","Central","CT"],["America/Denver","Mountain","MT"],["America/Phoenix","Arizona (no DST)","MST"],["America/Los_Angeles","Pacific","PT"],["America/Anchorage","Alaska","AKT"],["Pacific/Honolulu","Hawaii","HT"],["America/Puerto_Rico","Atlantic","AT"]];
const V38_ZR=[[5,9,"America/Puerto_Rico"],[324,325,"America/Chicago"],[350,372,"America/Chicago"],[375,375,"America/Chicago"],[380,397,"America/Chicago"],[420,424,"America/Chicago"],[463,464,"America/Chicago"],[476,477,"America/Chicago"],
 [500,576,"America/Chicago"],[577,577,"America/Denver"],[580,588,"America/Chicago"],[590,599,"America/Denver"],[600,689,"America/Chicago"],[690,693,"America/Denver"],[700,797,"America/Chicago"],[798,799,"America/Denver"],
 [800,834,"America/Denver"],[835,835,"America/Los_Angeles"],[836,837,"America/Denver"],[838,838,"America/Los_Angeles"],[840,847,"America/Denver"],[850,865,"America/Phoenix"],[870,885,"America/Denver"],[889,961,"America/Los_Angeles"],
 [967,968,"Pacific/Honolulu"],[969,969,"Pacific/Honolulu"],[970,994,"America/Los_Angeles"],[995,999,"America/Anchorage"]];
function v38TzOk(tz){return V38_TZ.some(x=>x[0]===tz)}
function v38ZipTz(zip){const s=String(zip||"").trim();if(!/^\d{5}/.test(s))return"America/New_York";const p=+s.slice(0,3);for(const r of V38_ZR)if(p>=r[0]&&p<=r[1])return r[2];return"America/New_York"}
function v38UserTz(u){if(!u)return"America/New_York";if(u.tz38&&v38TzOk(u.tz38))return u.tz38;return v38ZipTz(u.zip)}
function v38Abbr(tz){const x=V38_TZ.find(z=>z[0]===tz);return x?x[2]:"ET"}
function v38Name(tz){const x=V38_TZ.find(z=>z[0]===tz);return x?x[1]:"Eastern"}
const V38_DTF={};function v38Fmt(tz){return V38_DTF[tz]||(V38_DTF[tz]=new Intl.DateTimeFormat("en-US",{timeZone:tz,hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}))}
function v38Parts(ms,tz){const o={};for(const p of v38Fmt(tz).formatToParts(new Date(ms)))o[p.type]=p.value;return{y:+o.year,mo:+o.month,d:+o.day,h:(+o.hour)%24,mi:+o.minute}}
function v38Off(tz,ms){const p=v38Parts(ms,tz);return(Date.UTC(p.y,p.mo-1,p.d,p.h,p.mi)-Math.floor(ms/6e4)*6e4)/6e4}
function v38Inst(date,time,tz){const[y,mo,d]=String(date).split("-").map(Number),[h,mi]=String(time||"00:00").split(":").map(Number);const w=Date.UTC(y,mo-1,d,h,mi);let t=w-v38Off(tz,w)*6e4;t=w-v38Off(tz,t)*6e4;return t}
function v38Wall(ms,tz){const p=v38Parts(ms,tz),z=n=>String(n).padStart(2,"0");return{date:p.y+"-"+z(p.mo)+"-"+z(p.d),start:z(p.h)+":"+z(p.mi)}}
function v38Conv(date,time,from,to){if(!date||!time||!from||!to||from===to)return{date,start:time};try{return v38Wall(v38Inst(date,time,from),to)}catch(e){return{date,start:time}}}
function v38TodayIn(tz){try{return new Intl.DateTimeFormat("en-CA",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(v38Now()))}catch(e){return null}}
/* SW-089: the picker's min is the later of the customer's today and the visit-zone's today, shown
   on the customer's clock, so it matches the server (visit-local "today"). Noon on the visit clock
   keeps that instant on visit-today in every US zone; midnight in a zone west of the visit would
   fall back a calendar day and the picker would still offer a morning the server refuses. */
function v38AskMin(v,tz){const ct=v38TodayIn(tz),from=v38VisTz(v),vt=v38TodayIn(from);let vd=vt;
 try{if(vt){const w=v38Wall(v38Inst(vt,"12:00",from),tz);if(w&&w.date)vd=w.date}}catch(e){}
 if(ct&&vd)return ct>vd?ct:vd;return vd||ct||null}
function v38VisTz(v){if(v&&v.tz38&&v38TzOk(v.tz38))return v.tz38;return v38UserTz(typeof U==="function"&&v?U(v.by):null)}
function v38CustTz(v){const u=typeof U==="function"&&v?U(v.cuid):null;if(u&&(u.tz38||u.zip))return v38UserTz(u);if(v&&v.ctz38&&v38TzOk(v.ctz38))return v.ctz38;return v38VisTz(v)}
/* a copy of the visit with its day, time and offered times on the customer's clock, labeled */
function v38Shadow(v,tz){if(!v)return v;const from=v38VisTz(v);tz=tz||v38CustTz(v);const c=v38Conv(v.date,v.start,from,tz);const s=Object.assign({},v,{date:c.date,start:c.start,__tzl:v38Abbr(tz),__tz:tz});
 const cf=v.conf37;if(cf&&Array.isArray(cf.slots))s.conf37=Object.assign({},cf,{slots:cf.slots.map(x=>Object.assign({},x,v38Conv(x.date,x.start,from,tz)))});return s}
{const or=v37Range;v37Range=function(v){const r=or.apply(this,arguments);return v&&v.__tzl?r+" "+v.__tzl:r}}
/* "today" for a visit is the visit's own local date (it was always Eastern) */
let V38_DAYTZ=null;{const ot=v37Today;v37Today=function(){if(V38_DAYTZ){const t=v38TodayIn(V38_DAYTZ);if(t)return t}return ot.apply(this,arguments)}}
function v38WithDay(v,fn){const prev=V38_DAYTZ;V38_DAYTZ=v?v38VisTz(v):null;try{return fn()}finally{V38_DAYTZ=prev}}
/* SW-092: listing and "is this visit still open?" must use the visit's zone, not Detroit v37Today().
   A 9pm Hawaii visit is still today (and upcoming) at 7:30pm HST, which is already 12:30am the next
   day in Eastern. Per-visit v38WithDay, because one job list can mix zones. */
{const oo=v37Open;v37Open=function(v){return v38WithDay(v,()=>oo.apply(this,arguments))}}
{const oj=v37JobVisits;v37JobVisits=function(j,m){if(!j||!m)return[];return(DB.visits||[]).filter(v=>v&&v.status!=="canceled"&&((j.cust===m.id&&v.cuid===m.id&&v.by===j.hired)||(j.hired===m.id&&v.by===m.id&&v.cuid===j.cust))&&(!v.job37||v.job37===j.id)&&(v38WithDay(v,()=>v.date>=v37Today())||["enroute","arrived"].includes(v.status))).sort((a,b)=>(a.date+a.start)<(b.date+b.start)?-1:1)}}
function v38FixNotes(v,nb){if(!v||!v.cuid)return;const raw=v37When(v),sh=v37When(v38Shadow(v));if(raw===sh)return;(DB.notifs||[]).slice(nb).forEach(n=>{if(n&&n.to===v.cuid&&n.link==="visit:"+v.id&&typeof n.text==="string")n.text=n.text.split(raw).join(sh)})}
{const os=A.saveVisit;A.saveVisit=function(o){const m=me(),nb=(DB.notifs||[]).length;const r=os.apply(this,arguments);try{if(!r||!r.ok||!r.id)return r;const v=v8Visit(r.id);if(!v||!m||v.by!==m.id)return r;
  v.tz38=v38UserTz(m);const cu=v.cuid?U(v.cuid):null;v.ctz38=cu?v38UserTz(cu):v.tz38;v38FixNotes(v,nb);save()}catch(e){}return r}}
{const op=A.visitPick37;A.visitPick37=function(id){const v=v8Visit(id),nb=(DB.notifs||[]).length;const r=v38WithDay(v,()=>op.apply(this,arguments));try{if(r&&r.ok&&v){v38FixNotes(v,nb);save()}}catch(e){}return r}}
{const oc=A.visitConfirm37;A.visitConfirm37=function(id){const v=v8Visit(id);return v38WithDay(v,()=>oc.apply(this,arguments))}}
/* 3 times per request, 6 requests in all: the 7th says so plainly (QA v37 idea 2) */
const V38_ASKS=6;
function v38AsksLeft(v){return Math.max(0,V38_ASKS-((v&&v.ask37n)||0))}
function v38LimitMsg(v){return`You've used all ${V38_ASKS} reschedule requests for this visit. Message ${v&&v.bizName||"your pro"} to find another time.`}
{const oa=A.visitAsk37;A.visitAsk37=function(id,slots,note){const m=me(),v=v8Visit(id);if(m&&v&&v.cuid===m.id&&v37Open(v)&&v38AsksLeft(v)<=0)return{ok:false,limit:true,msg:v38LimitMsg(v)};
  const r=v38WithDay(v,()=>oa.apply(this,arguments));if(r&&r.ok===false&&/^Offer up to 3 times\.?$/.test(r.msg||""))r.msg="Offer up to 3 times per request.";
  if(r&&r.ok&&v){const left=v38AsksLeft(v);if(left<=2)r.msg+=left?` ${left} reschedule request${left===1?"":"s"} left for this visit.`:" That was your last reschedule request for this visit."}return r}}
A.setTz38=function(tz){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};tz=String(tz||"");if(tz&&!v38TzOk(tz))return{ok:false,msg:"Pick one of the listed time zones."};
 if(tz)m.tz38=tz;else delete m.tz38;const z=v38UserTz(m);(DB.visits||[]).forEach(v=>{if(!v)return;if(v.cuid===m.id)v.ctz38=z});save();return{ok:true,tz:z,msg:"Times now show in "+v38Name(z)+" time ("+v38Abbr(z)+")."}};
/* SW-093: a profile ZIP change stores any well-formed 5-digit ZIP (v3 updateMe) and, when the
   account is still on Automatic, re-derives the zone from the new prefix onto their visits. */
function v38ApplyZipZone(m){if(!m||(m.tz38&&v38TzOk(m.tz38)))return m?v38UserTz(m):null;const z=v38UserTz(m);
 (DB.visits||[]).forEach(v=>{if(!v)return;if(v.cuid===m.id)v.ctz38=z;if(v.by===m.id)v.tz38=z});return z}
{const ou=A.updateMe;A.updateMe=function(o){const m=me(),before=m&&m.zip,r=ou.apply(this,arguments);try{if(r&&r.ok&&m&&m.zip&&m.zip!==before){v38ApplyZipZone(m);save()}}catch(e){}return r}}
if(typeof document!=="undefined"){
 /* the customer's card: their clock, a zone line, and the limit in plain words */
 {const oc=v37Card;v37Card=function(v){const m=me();if(!m||!v||v.cuid!==m.id)return oc.apply(this,arguments);const tz=v38UserTz(m),sv=v38Shadow(v,tz);let h=oc.call(this,sv);
   const pro=v38VisTz(v),tzl=`<p class="v38tz small muted"><span>${I("clock",13)} Times in ${esc(v38Name(tz))} time (${esc(v38Abbr(tz))})${pro!==tz?`. ${esc(v.bizName)} is on ${esc(v38Name(pro))} time.`:""}</span> <button type="button" class="linkbtn" data-v38tz>Change</button></p>`;
   if(v37Open(v)&&v38AsksLeft(v)<=0){h=h.replace(/<button type="button" class="btn( ghost sm)?" data-v37ask="[^"]*">[\s\S]*?<\/button>/,()=>"");
    h=h.replace('<div class="v37ap-a">',()=>`<p class="v38lim small" role="note">${I("info",14)}<span>You've used all ${V38_ASKS} reschedule requests for this visit. Message ${esc(v.bizName)} to find another time.</span></p><div class="v37ap-a">`)}
   const k=h.indexOf('<div class="v37ap-a">');return k<0?h:h.slice(0,k)+tzl+h.slice(k)}}
 {const on=v8Next;v8Next=function(m){const out=on.apply(this,arguments);try{if(!m||v7Pro(m))return out;const tz=v38UserTz(m);out.forEach(x=>{const id=x&&typeof x.link==="string"&&(x.link.match(/\/track\/([^/?#]+)/)||[])[1];const v=id&&v8Visit(decodeURIComponent(id));
   if(v&&v.cuid===m.id&&/^Confirm /.test(x.title||""))x.title="Confirm "+v37When(v38Shadow(v,tz))})}catch(e){}return out}}
 {const ov=VIEWS.track;VIEWS.track=function(id){let h=ov.apply(this,arguments);try{const m=me(),v=v8Visit(id);if(!m||!v||v.cuid!==m.id||v.status!=="scheduled")return h;const sv=v38Shadow(v,v38UserTz(m));
   h=h.replace(/(<span>(?:Arriving between|Scheduled for)<\/span><b>)([^<]*)(<\/b>)/,(x,a,b,c)=>a+esc(v37Range(sv).replace(/^(at|arrive) /,""))+c)}catch(e){}return h}}
 /* the reschedule sheet: the customer's clock in, the visit's clock out; requests left */
 {const om=v37AskModal;v37AskModal=function(v){const m=me();if(!m||v.cuid!==m.id)return om.apply(this,arguments);if(v38AsksLeft(v)<=0){toast(v38LimitMsg(v),"err");return}
   const tz=v38UserTz(m),from=v38VisTz(v),sv=v38Shadow(v,tz);const r=om.call(this,sv);try{const f=document.getElementById("v37as");if(!f)return r;const left=v38AsksLeft(v);
    const p=f.querySelector("p.muted.small");if(p)p.insertAdjacentHTML("beforeend",` <span class="v38left"><b>${left} of ${V38_ASKS}</b> requests left. Times are ${esc(v38Name(tz))} time (${esc(v38Abbr(tz))}).</span>`);
    const td=v38AskMin(v,tz);if(td)f.querySelectorAll('input[type=date]').forEach(i=>i.min=td);
    f.onsubmit=e=>{e.preventDefault();const slots=[0,1,2].map(i=>{const d=document.getElementById("v37d"+i).value,t=document.getElementById("v37t"+i).value;return d&&t?Object.assign({},v38Conv(d,t,tz,from)):{date:d,start:t}});
     const visToday=v38TodayIn(from);if(visToday&&slots.some(s=>s.date&&s.date<visToday)){document.getElementById("v37asE").textContent="Pick days from today up to 6 months out.";return}
     __when(A.visitAsk37(v.id,slots,document.getElementById("v37n").value),res=>{if(res&&res.ok===false){document.getElementById("v37asE").textContent=res.msg;return}closeModal();act(res,()=>{const y=scrollY;render();scrollTo(0,y)})})}}catch(e){console.warn(e)}return r}}
 function v38TzModal(){const m=me();if(!m)return;const cur=m.tz38&&v38TzOk(m.tz38)?m.tz38:"",auto=v38ZipTz(m.zip);
  modal(`<form id="v38tzf" class="v38tzf"><h2 id="mtitle">${I("clock",20)} Your time zone</h2><p class="muted small">Appointment times show on this clock. Automatic uses your ZIP${m.zip?" ("+esc(m.zip)+")":""}: ${esc(v38Name(auto))} time.</p>
   <div class="fld"><label for="v38tzs">Time zone</label><select id="v38tzs"><option value="">Automatic (${esc(v38Name(auto))}, ${esc(v38Abbr(auto))})</option>${V38_TZ.map(z=>`<option value="${z[0]}" ${z[0]===cur?"selected":""}>${esc(z[1])} (${z[2]})</option>`).join("")}</select></div>
   <div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div></form>`,"v33sheet");
  document.querySelectorAll("#modal [data-close]").forEach(x=>x.onclick=closeModal);
  document.getElementById("v38tzf").onsubmit=e=>{e.preventDefault();const r=A.setTz38(document.getElementById("v38tzs").value);closeModal();act(r,()=>{const y=scrollY;render();scrollTo(0,y)})}}
 function v38Bind(root){(root||document).querySelectorAll("[data-v38tz]").forEach(b=>b.onclick=()=>v38TzModal())}
 /* pro side: the customer's clock next to the pro's when they differ */
 {const om=v8VisitModal;v8VisitModal=function(v,pre){const r=om.apply(this,arguments);try{const m=me();if(!v||!v.id||!m||v.by!==m.id||!v.cuid)return r;const vw=document.querySelector(".vm8-v");if(!vw)return r;
   const pt=v38VisTz(v),ct=v.ctz38&&v38TzOk(v.ctz38)?v.ctz38:pt;if(ct===pt)return r;const sv=v38Shadow(v,ct);
   const st=vw.querySelector(".v37cf")||vw.querySelector(".vm8-st");const line=`<p class="v38ctz small" role="note">${I("clock",13)}<span>Your times are ${esc(v38Abbr(pt))}. ${esc(v.cname||"The customer")} sees <b>${esc(v37When(sv))}</b>.</span></p>`;
   if(st)st.insertAdjacentHTML("beforebegin",line);else vw.insertAdjacentHTML("beforeend",line)}catch(e){}return r}}
 /* (3) the "and N more" expander is a real disclosure: aria-expanded / aria-controls, and "Show fewer" collapses it again */
 {const ov=VIEWS.job;VIEWS.job=function(id,q){let h=ov.apply(this,arguments);try{if(h.indexOf('<div class="v37aps">')<0)return h;const m=me(),j=(DB.jobs||[]).find(x=>x&&x.id===id);
   h=h.replace('<div class="v37aps">','<div class="v37aps" id="v37aps">');
   h=h.replace(/<button type="button" class="linkbtn v37more" id="v37more" data-job="([^"]*)">([^<]*)<\/button>/,(x,jid,t)=>`<button type="button" class="linkbtn v37more" id="v37more" data-job="${jid}" aria-expanded="false" aria-controls="v37aps">${t}</button>`);
   if(j&&m&&v37ExpandJobs.has(j.id)&&v37JobVisits(j,m).length>3){const k=h.indexOf('<div class="v37aps" id="v37aps">');const e=k<0?-1:h.indexOf('</section></div>',k);
    const btn=`<button type="button" class="linkbtn v37more" id="v38less" data-job="${esc(j.id)}" aria-expanded="true" aria-controls="v37aps">Show fewer visits</button>`;
    if(e>0)h=h.slice(0,e+16)+btn+h.slice(e+16)}}catch(e){}return h}}
 let V38_FOCUS=null;
 {const oa=AFTER.job;AFTER.job=function(id,q){const r=oa&&oa.apply(this,arguments);try{v38Bind(document.getElementById("app"));const more=document.getElementById("v37more");
   if(more){const o=more.onclick;more.onclick=()=>{V38_FOCUS="v38less";o&&o()}}
   const less=document.getElementById("v38less");if(less)less.onclick=()=>{v37ExpandJobs.delete(less.dataset.job);V38_FOCUS="v37more";const y=scrollY;render();scrollTo(0,y)};
   if(V38_FOCUS){const f=document.getElementById(V38_FOCUS);V38_FOCUS=null;if(f)f.focus({preventScroll:true})}}catch(e){}return r}}
 {const oa=AFTER.track;AFTER.track=function(id){const r=oa&&oa.apply(this,arguments);try{v38Bind(document.getElementById("app"))}catch(e){}return r}}
}

/* (4) Tax records in the Office (Reports): the two filings a small contractor most often gets wrong, from records Sawyer
   already has. "Subs to 1099": receipts in the Subcontractor category grouped by who was paid, with the year's total, the
   IRS reporting line for that year (a year-keyed table: $600 through 2025, $2,000 from 2026; a later IRS change is a new
   row, not a new if) and a "W-9 on file" check per sub (w938, private to the pro, no tax IDs are stored). "Sales tax": by
   quarter, taxable and non-taxable sales on invoices issued, tax billed, and tax actually collected (each payment's share of
   the invoice's tax, by the date it was paid), bucketed with Intl in the pro's zone (ZIP or pick, otherwise America/Detroit)
   so a 2026-04-01T03:00Z invoice is Q1 in Detroit, not Q2 on a UTC host. Both download as formula-safe CSVs. Planning help,
   not tax advice. */
function v38Key(s){return String(s||"").trim().replace(/\s+/g," ").toLowerCase().slice(0,80)}
const V38_1099={2011:600,2026:2000};
function v38Line(y){y=+y;let line=600;for(const k of Object.keys(V38_1099).map(Number).sort((a,b)=>a-b)){if(k<=y)line=V38_1099[k]}return line}
function v38TaxTz(u){if(u&&u.tz38&&v38TzOk(u.tz38))return u.tz38;if(u&&u.zip)return v38ZipTz(u.zip);return"America/Detroit"}
function v38YMD(ms,tz){try{return new Intl.DateTimeFormat("en-CA",{timeZone:tz||"America/Detroit",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(ms))}catch(e){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Detroit",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(ms))}}
function v38PayYear(date,tz){const s=String(date||"");if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,4);const n=+date;if(Number.isFinite(n)&&n>1e11)return v38YMD(n,tz).slice(0,4);const t=Date.parse(s);return Number.isFinite(t)?v38YMD(t,tz).slice(0,4):""}
function v38Due(y){const d=new Date(Date.UTC(+y+1,0,31));const w=d.getUTCDay();if(w===6)d.setUTCDate(d.getUTCDate()+2);else if(w===0)d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)}
function v38Subs(m,y){const line=v38Line(y),by=new Map(),w9=(m&&m.w938&&typeof m.w938==="object")?m.w938:{};
 v7Mine("ledger",m).filter(l=>l&&l.kind==="exp"&&l.cat==="Subcontractor"&&v38PayYear(l.date,v38TaxTz(m))===String(y)).forEach(l=>{const k=v38Key(l.vendor)||"(no name)";const o=by.get(k)||{key:k,name:String(l.vendor||"").trim()||"No name on the receipt",n:0,c:0,last:""};o.n++;o.c+=Math.round((+l.amt||0)*100);if(String(l.date)>o.last)o.last=String(l.date);by.set(k,o)});
 const rows=[...by.values()].map(o=>Object.assign(o,{amt:o.c/100,need:o.c>=line*100&&o.key!=="(no name)",w9:!!w9[o.key]})).sort((a,b)=>b.c-a.c);
 return{y:String(y),line,due:v38Due(y),rows,need:rows.filter(r=>r.need).length,missing:rows.filter(r=>r.need&&!r.w9).length,total:rows.reduce((a,r)=>a+r.c,0)/100}}
function v38SubsCsv(m,y){const s=v38Subs(m,y);return[["Paid to","Payments","Total paid "+s.y,"Last payment","1099-NEC line","1099-NEC likely needed","W-9 on file"],...s.rows.map(r=>[r.name,r.n,r.amt.toFixed(2),r.last,s.line.toFixed(2),r.need?"Yes":"No",r.w9?"Yes":"No"])]}
function v38Q(ms,tz){const mo=+v38YMD(ms,tz).slice(5,7);return Math.floor((mo-1)/3)}
function v38Sales(m,y){const tz=v38TaxTz(m),Q=[0,1,2,3].map(i=>({q:"Q"+(i+1),taxable:0,exempt:0,billed:0,coll:0,n:0}));
 v7Mine("bills",m).filter(b=>b&&b.type==="inv"&&b.status!=="void"&&b.status!=="draft").forEach(b=>{const c=billCalc(b),sub=Math.round((c.total-c.tax)*100),tax=Math.round(c.tax*100),tot=Math.round(c.total*100);
  if(v38YMD(b.date,tz).slice(0,4)===String(y)){const q=Q[v38Q(b.date,tz)];q.n++;if(tax>0){q.taxable+=sub;q.billed+=tax}else q.exempt+=sub}
  if(tax>0&&tot>0)(b.payments||[]).forEach(p=>{if(!p||v38YMD(p.date,tz).slice(0,4)!==String(y))return;const pc=Math.round((+p.amt||0)*100);Q[v38Q(p.date,tz)].coll+=Math.round(pc*tax/tot)})});
 const T=Q.reduce((a,q)=>({taxable:a.taxable+q.taxable,exempt:a.exempt+q.exempt,billed:a.billed+q.billed,coll:a.coll+q.coll,n:a.n+q.n}),{taxable:0,exempt:0,billed:0,coll:0,n:0});return{y:String(y),Q,T}}
function v38SalesCsv(m,y){const s=v38Sales(m,y),f=c=>(c/100).toFixed(2);return[["Quarter","Invoices issued","Taxable sales","Non-taxable sales","Sales tax billed","Sales tax collected"],...s.Q.map(q=>[q.q+" "+s.y,q.n,f(q.taxable),f(q.exempt),f(q.billed),f(q.coll)]),["Total "+s.y,s.T.n,f(s.T.taxable),f(s.T.exempt),f(s.T.billed),f(s.T.coll)]]}
A.w9Set38=function(vendor,on){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};if(!v7Pro(m))return{ok:false,msg:"Tax records are for pros."};const k=v38Key(vendor);if(!k||k==="(no name)")return{ok:false,msg:"Pick a sub from the list."};
 if(!v7Mine("ledger",m).some(l=>l&&l.kind==="exp"&&l.cat==="Subcontractor"&&v38Key(l.vendor)===k))return{ok:false,msg:"That sub isn't in your receipts."};
 const w=(m.w938&&typeof m.w938==="object")?m.w938:{};if(on)w[k]=v38Now();else delete w[k];if(Object.keys(w).length>500)return{ok:false,msg:"That's a lot of subs."};m.w938=w;save();return{ok:true,msg:on?"W-9 marked on file":"W-9 unmarked"}};
function v38Fd(iso){const[y,mo,d]=String(iso).split("-").map(Number);return new Date(Date.UTC(y,mo-1,d)).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric",timeZone:"UTC"})}
function v38TaxCard(m,y){y=typeof v31Year==="function"?v31Year(m,y):String(y||new Date().getFullYear());const s=v38Subs(m,y),t=v38Sales(m,y),f=c=>v7$(c/100);
 const subs=s.rows.length?`<div class="o7-tw"><table class="o7t v38t"><caption class="sr-only">Subcontractors paid in ${esc(y)}</caption><thead><tr><th scope="col">Paid to</th><th class="num" scope="col">Total ${esc(y)}</th><th scope="col" class="hide-s">Status</th><th scope="col">W-9 on file</th></tr></thead><tbody>
  ${s.rows.map((r,i)=>`<tr class="${r.need?"v38need":""}"><th scope="row"><b>${esc(r.name)}</b><small class="muted">${r.n} payment${r.n===1?"":"s"} · last ${esc(v38Fd(r.last))}</small></th><td class="num">${v7$(r.amt)}</td><td class="hide-s">${r.need?`<span class="b7 ${r.w9?"b7-blue":"b7-gold"}">1099-NEC likely</span>`:`<span class="muted small">Under ${v7$0(s.line)}</span>`}</td>
  <td>${r.key==="(no name)"?`<span class="muted small">Add a name to the receipt</span>`:`<label class="v38w9"><input type="checkbox" data-v38w9="${esc(r.key)}" ${r.w9?"checked":""} aria-label="W-9 on file for ${esc(r.name)}"><span>${r.w9?"On file":"Not yet"}</span></label>`}</td></tr>`).join("")}</tbody></table></div>`
  :`<p class="muted small">No receipts in the <b>Subcontractor</b> category for ${esc(y)} yet. Log what you pay subs (Expenses &amp; mileage, or Quick log → More… → Subcontractor) and they add up here by name.</p>`;
 const sum=s.need?`<p class="v38sum ${s.missing?"warn":"good"}" role="status">${I(s.missing?"info":"check",15)}<span>${s.need} sub${s.need===1?"":"s"} reached ${v7$0(s.line)} in ${esc(y)}${s.missing?`; <b>${s.missing} W-9${s.missing===1?"":"s"} still to collect</b>`:", all W-9s on file"}. 1099-NEC forms go to them and the IRS by <b>${esc(v38Fd(s.due))}</b>.</span></p>`:"";
 const qt=`<div class="o7-tw"><table class="o7t v38t"><caption class="sr-only">Sales tax by quarter, ${esc(y)}</caption><thead><tr><th scope="col">Quarter</th><th class="num" scope="col">Taxable sales</th><th class="num hide-s" scope="col">Non-taxable</th><th class="num" scope="col">Tax billed</th><th class="num" scope="col">Tax collected</th></tr></thead><tbody>
  ${t.Q.map(q=>`<tr${q.n||q.coll?"":` class="v31pl-z"`}><th scope="row">${q.q}</th><td class="num">${f(q.taxable)}</td><td class="num hide-s">${f(q.exempt)}</td><td class="num">${f(q.billed)}</td><td class="num">${f(q.coll)}</td></tr>`).join("")}</tbody>
  <tfoot><tr><th scope="row">Total</th><td class="num">${f(t.T.taxable)}</td><td class="num hide-s">${f(t.T.exempt)}</td><td class="num">${f(t.T.billed)}</td><td class="num">${f(t.T.coll)}</td></tr></tfoot></table></div>`;
 return`<div class="card v38tax" id="v38tax"><div class="o7-sh"><h2>${I("doc",18)} Tax records · ${esc(y)}</h2><span class="muted small">From your receipts and invoices. Planning help, not tax advice.</span></div>
 <div class="v38tax-g"><section aria-labelledby="v38sh"><h3 id="v38sh">Subs to 1099</h3><p class="muted small">Pay a sub (not an employee) ${v7$0(s.line)} or more in ${esc(y)} and you'll likely owe them a 1099-NEC. Get a W-9 before the first check; Sawyer only keeps a yes/no, never tax IDs. Payments by card or a payment app are reported by the processor instead.</p>${sum}${subs}
 <div class="o9-tax-b"><button class="btn sm" id="v38SubCsv" data-y="${esc(y)}" ${s.rows.length?"":"disabled"}>${I("download",14)}1099 worksheet (CSV)</button></div></section>
 <section aria-labelledby="v38st"><h3 id="v38st">Sales tax</h3><p class="muted small">Billed is the tax on invoices you issued that quarter. Collected is the tax inside the payments you received, by the date paid: the number most states want on a cash-basis return.</p>${qt}
 <div class="o9-tax-b"><button class="btn sm" id="v38SalesCsv" data-y="${esc(y)}">${I("download",14)}Sales tax by quarter (CSV)</button></div></section></div></div>`}
if(typeof document!=="undefined"){
 {const ov=VIEWS.office;VIEWS.office=function(tab,q){let h=ov.apply(this,arguments);try{const m=me();if(m&&v7Pro(m)&&tab==="reports"){const i=h.indexOf('<div class="card o7-exp">');if(i>=0)h=h.slice(0,i)+v38TaxCard(m,(q||{}).y)+h.slice(i)}}catch(e){console.warn(e)}return h}}
 {const oa=AFTER.office;AFTER.office=function(tab,q){const r=oa&&oa.apply(this,arguments);try{const m=me();if(!m||tab!=="reports")return r;const $=s=>document.getElementById(s);
   const a=$("v38SubCsv");if(a)a.onclick=()=>{v7Download("sawyer-1099-worksheet-"+a.dataset.y+".csv",v7CSV(v38SubsCsv(m,a.dataset.y)));toast("1099 worksheet downloaded")};
   const b=$("v38SalesCsv");if(b)b.onclick=()=>{v7Download("sawyer-sales-tax-"+b.dataset.y+".csv",v7CSV(v38SalesCsv(m,b.dataset.y)));toast("Sales tax report downloaded")};
   document.querySelectorAll("[data-v38w9]").forEach(c=>c.onchange=()=>act(A.w9Set38(c.dataset.v38w9,c.checked),()=>{const y=scrollY;render();scrollTo(0,y)}))}catch(e){}return r}}
}
