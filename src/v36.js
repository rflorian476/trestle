/* ===== v36 ===== */
const V2_ACTIONS36=["mk36","billPhotos36"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS36);
function v36Now(){return typeof __now==="function"?__now():Date.now()}
const v36r2=n=>Math.round((Number(n)||0)*100)/100;

/* (1) QA SW-082: a deleted contractor's traveler calls leave the catalog, the same tidy as SW-072 for crew projects.
   A call nobody was hired on (open, or filled and later emptied) is deleted outright, with the notices that pointed at it
   and travelers' saved copies. A call with a hire (or a traveler review) stays only as a closed, unlisted record without its
   description, so the hired travelers keep their pay terms and hours log ("Check your check"). The server shows such a call
   to its hired travelers and staff only, never in signed-out state, and /t/<id> is the generic "Not found" page for everyone
   else (server.js). Called from A.__delete13 and once at start for owners deleted before v36 (v36CallOrphans). */
function v36CallHired(c){return(c.apps||[]).filter(a=>a&&a.status==="hired").map(a=>a.uid)}
function v36CallKeep(c){return v36CallHired(c).length>0||(DB.creviews||[]).some(r=>r&&r.call===c.id)}
function v36CallsGone(uid){const drop=new Set(),closed=new Set();if(!uid)return{deleted:0,closed:0};
 for(const c of (DB.tcalls||[])){if(!c||c.by!==uid||c.ownerGone36)continue;
  if(!v36CallKeep(c)){drop.add(c.id);continue}
  const hired=v36CallHired(c);c.status="closed";c.ownerGone36=v36Now();c.desc="";c.tools="";c.recip="";c.invites=[];
  (c.apps||[]).forEach(a=>{if(a&&a.status!=="hired"&&a.status!=="declined"&&a.status!=="withdrawn")a.status="closed"});
  hired.forEach(t=>{if(t&&t!==uid)notify(t,`${c.title} was closed: the contractor deleted their __BRAND__ account. Your pay terms and hours log stay with you.`,"tcall:"+c.id)});closed.add(c.id)}
 if(drop.size||closed.size)DB.notifs=(DB.notifs||[]).filter(n=>{if(!n||typeof n.link!=="string"||!n.link.startsWith("tcall:"))return true;const id=n.link.slice(6);if(drop.has(id))return false;
  if(closed.has(id)){const c=(DB.tcalls||[]).find(x=>x&&x.id===id);return!!(c&&v36CallHired(c).includes(n.to))}return true});
 if(drop.size){DB.tcalls=(DB.tcalls||[]).filter(c=>!drop.has(c&&c.id));(DB.users||[]).forEach(u=>{if(u&&Array.isArray(u.tsaved))u.tsaved=u.tsaved.filter(x=>!drop.has(x))})}
 return{deleted:drop.size,closed:closed.size}}
/* calls whose poster is gone: deleted before v36, or the account row is missing (demo calls are never touched) */
function v36CallOrphans(){const gone=new Set((DB.users||[]).filter(u=>u&&u.role==="deleted").map(u=>u.id)),have=new Set((DB.users||[]).map(u=>u&&u.id));let n=0;
 const demo=c=>!!(c.demo||/\(demo\)/i.test(String(c.title||"")));
 for(const id of new Set((DB.tcalls||[]).filter(c=>c&&c.by&&!c.ownerGone36&&!demo(c)&&(gone.has(c.by)||!have.has(c.by))).map(c=>c.by))){const r=v36CallsGone(id);n+=r.deleted+r.closed}return n}
{const ov=VIEWS.tcall;if(ov)VIEWS.tcall=function(id){let h=ov.apply(this,arguments);try{const c=TC(id);if(!c||!c.ownerGone36)return h;
  const note=`<p class="v34gone v36gone" role="note">${I("x",15)}<span>This call is closed. The contractor deleted their __BRAND__ account, so it no longer takes applications. Your pay terms and hours stay here for your records.</span></p>`;
  const k=h.indexOf("<h1");if(k>=0){const e=h.indexOf("</h1>",k);if(e>0)return h.slice(0,e+5)+note+h.slice(e+5)}return note+h}catch(e){}return h}}

/* (2) Bill job costs. Receipts and trips a pro already logs (Office -> Expenses & mileage, or the v33 Quick log) go onto an
   invoice in one step: the invoice editor's "Job costs" lists what isn't billed yet (the job tag picks the right ones), with an
   optional markup on materials (0-100%, remembered), and mileage at the Office mileage rate. Each line remembers the receipt it
   came from (l36), so a receipt can be on one live invoice only; the Expenses list says "Billed on INV-…" and voiding the invoice
   frees it again. The customer sees ordinary line items (the server strips l36 from their copy). Markup is private (mk36). */
function v36BillLive(id){const b=v7Bill(id);return!!(b&&b.status!=="void")}
function v36Billed(L){return L&&L.billed36&&v36BillLive(L.billed36)?v7Bill(L.billed36):null}
function v36Mk(m){const n=Number(m&&m.mk36);return Number.isFinite(n)&&n>=0&&n<=100?n:0}
function v36Unbilled(m,billId){return v7Mine("ledger",m).filter(L=>L&&(L.kind==="exp"||L.kind==="mile")&&(!v36Billed(L)||L.billed36===billId)).sort((a,b)=>String(b.date).localeCompare(String(a.date)))}
function v36CostLine(L,mk){const dt=v35Fmt(String(L.date||"").slice(0,10));
 if(L.kind==="mile")return{d:v35Desc(`Mileage: ${L.from||"Shop"} → ${L.to||"job site"}, ${dt}`).slice(0,160),q:v36r2(L.miles),r:MILE_RATE,l36:L.id};
 const amt=v36r2(L.amt*(1+(mk||0)/100));return{d:v35Desc(`${L.cat||"Materials"}: ${L.vendor||"receipt"}, ${dt}`).slice(0,160),q:1,r:amt,l36:L.id}}
A.mk36=function(p){const m=me();if(!v7Pro(m))return{ok:false,msg:"Job costs are part of The Office for pro accounts."};const n=parseFloat(String(p==null?"":p).replace(/[%\s]/g,""));
 if(!Number.isFinite(n)||n<0||n>100||/^[\s]*[-\u2212]/.test(String(p)))return{ok:false,msg:"Markup must be from 0% to 100%."};m.mk36=v36r2(n);save();return{ok:true,msg:"Markup saved: "+m.mk36+"%"}};
{const os=A.saveBill;A.saveBill=function(o){const m=me();const src=(o&&Array.isArray(o.lines)?o.lines:[]).slice(0,40);
  const want=src.filter(l=>v7Lines([l]).length===1).map(l=>l&&typeof l.l36==="string"&&/^l[a-z0-9]{1,30}$/i.test(l.l36)?l.l36:null);
  const r=os.apply(this,arguments);if(!r||!r.ok||!r.id)return r;
  try{const b=v7Bill(r.id);if(!b||!m||b.by!==m.id)return r;const used=new Set();
   (b.lines||[]).forEach((l,i)=>{delete l.l36;const id=want[i];if(!id||used.has(id))return;const L=(DB.ledger||[]).find(x=>x&&x.id===id&&x.by===m.id&&(x.kind==="exp"||x.kind==="mile"));
    if(!L||(L.billed36&&L.billed36!==b.id&&v36BillLive(L.billed36)))return;l.l36=id;used.add(id)});
   (DB.ledger||[]).forEach(L=>{if(!L||L.by!==m.id)return;if(used.has(L.id))L.billed36=b.id;else if(L.billed36===b.id)delete L.billed36});
   if(used.size)r.costs36=used.size;save()}catch(e){}return r}}
{const ov=A.voidBill;A.voidBill=function(id){const r=ov.apply(this,arguments);try{if(r&&r.ok){const m=me();(DB.ledger||[]).forEach(L=>{if(L&&m&&L.by===m.id&&L.billed36===id)delete L.billed36});save()}}catch(e){}return r}}
function v36JcModal(){const m=me(),b=BED;if(!m||!b)return;const all=v36Unbilled(m,null).filter(L=>!(b.lines||[]).some(l=>l.l36===L.id));
 const jobs=[...new Set(all.map(L=>L.job).filter(Boolean))];let job=b.job&&jobs.includes(b.job)?b.job:"";const st={mk:v36Mk(m),sel:new Set(),job};
 const rows=()=>all.filter(L=>!st.job||L.job===st.job);
 const pre=()=>{st.sel=new Set(rows().map(L=>L.id))};pre();
 const draw=()=>{const R=rows();const tot=R.filter(L=>st.sel.has(L.id)).reduce((a,L)=>{const x=v36CostLine(L,st.mk);a.n++;a.bill+=x.q*x.r;a.cost+=L.kind==="mile"?x.q*x.r:L.amt;return a},{n:0,bill:0,cost:0});
  const box=document.getElementById("v36jcL");if(!box)return;
  box.innerHTML=R.length?R.map(L=>{const x=v36CostLine(L,st.mk);return`<li><label class="v36jc-r"><input type="checkbox" data-v36c="${esc(L.id)}" ${st.sel.has(L.id)?"checked":""}><span class="v36jc-t"><b>${esc(L.kind==="mile"?`${L.miles} mi · ${L.from||"Shop"} → ${L.to||"job site"}`:(L.vendor||L.cat||"Receipt"))}</b><small class="muted">${esc(v35Fmt(String(L.date).slice(0,10)))} · ${esc(L.kind==="mile"?"Mileage at "+v7$(MILE_RATE)+"/mi":(L.cat||"Materials"))}${L.job?" · "+esc(L.job):""}</small></span><span class="v36jc-a"><b>${esc(v7$(x.q*x.r))}</b>${L.kind!=="mile"&&st.mk?`<small class="muted">cost ${esc(v7$(L.amt))}</small>`:""}</span></label></li>`}).join("")
   :`<li class="muted small v36jc-e">Nothing unbilled${st.job?" for "+esc(st.job):""}. Log receipts and trips in Expenses & mileage or with Quick log on your dashboard.</li>`;
  const s=document.getElementById("v36jcS");if(s)s.textContent=tot.n?`Adds ${tot.n} line${tot.n===1?"":"s"} · ${v7$(tot.bill)}${tot.bill-tot.cost>0.004?` (cost ${v7$(tot.cost)} + markup ${v7$(tot.bill-tot.cost)})`:""}`:"Pick the costs to bill";
  const go_=document.getElementById("v36jcGo");if(go_)go_.disabled=!tot.n;
  box.querySelectorAll("[data-v36c]").forEach(c=>c.onchange=()=>{if(c.checked)st.sel.add(c.dataset.v36c);else st.sel.delete(c.dataset.v36c);draw()})};
 modal(`<div class="v36jc"><h2 id="mtitle">${I("receipt",20)} Bill job costs</h2><p class="muted small">Receipts and trips you logged that aren't on an invoice yet. Each one can go on one invoice; voiding the invoice frees it again.</p>
 <div class="v36jc-f"><div class="fld"><label for="v36jcJ">Job</label><select id="v36jcJ"><option value="">All unbilled (${all.length})</option>${jobs.map(j=>`<option value="${esc(j)}" ${j===st.job?"selected":""}>${esc(j)} (${all.filter(L=>L.job===j).length})</option>`).join("")}</select></div>
 <div class="fld"><label for="v36jcM">Markup on receipts</label><div class="v36jc-m"><input id="v36jcM" inputmode="decimal" value="${esc(String(st.mk))}" aria-describedby="v36jcMh"><span aria-hidden="true">%</span></div><small id="v36jcMh" class="muted">Mileage is billed at ${esc(v7$(MILE_RATE))}/mi, no markup.</small></div></div>
 <div class="v36jc-chips" role="group" aria-label="Markup presets">${[0,10,15,20,25].map(n=>`<button type="button" class="chip7" data-v36mk="${n}">${n}%</button>`).join("")}</div>
 <ul class="v36jc-l" id="v36jcL"></ul><p class="v36jc-s" id="v36jcS" role="status"></p>
 <div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button><button type="button" class="btn primary" id="v36jcGo">${I("plus",16)}Add to invoice</button></div></div>`,"v33sheet");
 document.querySelectorAll("#modal [data-close]").forEach(x=>x.onclick=closeModal);
 const J=document.getElementById("v36jcJ");J.onchange=()=>{st.job=J.value;pre();draw()};
 const M=document.getElementById("v36jcM");const setMk=v=>{const n=parseFloat(String(v).replace(/[%\s]/g,""));st.mk=Number.isFinite(n)&&n>=0&&n<=100&&!/^\s*[-\u2212]/.test(String(v))?n:0;draw()};M.oninput=()=>setMk(M.value);
 document.querySelectorAll("[data-v36mk]").forEach(x=>x.onclick=()=>{M.value=x.dataset.v36mk;setMk(M.value)});
 document.getElementById("v36jcGo").onclick=()=>{const pick=rows().filter(L=>st.sel.has(L.id)).sort((a,b)=>String(a.date).localeCompare(String(b.date))||(a.kind==="mile")-(b.kind==="mile"));if(!pick.length)return;try{const f=document.getElementById("bedF");f&&f.oninput&&f.oninput({target:f})}catch(e){}
  b.lines=(b.lines||[]).filter(l=>l.d||l.r);pick.forEach(L=>b.lines.push(Object.assign(v36CostLine(L,st.mk),{opt:false,on:true})));if(!b.job&&st.job)b.job=st.job;
  if(st.mk!==v36Mk(m)){const r=A.mk36(st.mk);if(r&&r.ok===false)toast(r.msg,"err")}
  closeModal();const y=scrollY;render();scrollTo(0,y);toast(`Added ${pick.length} job cost${pick.length===1?"":"s"}`)};
 draw()}
{const ov=VIEWS.invedit;VIEWS.invedit=function(id,q){let h=ov.apply(this,arguments);try{const m=me();if(!m||!v7Pro(m)||!BED||BED.type!=="inv"||h.indexOf('id="bedF"')<0)return h;
  const n=v36Unbilled(m,id!=="new"?id:null).filter(L=>!(BED.lines||[]).some(l=>l.l36===L.id)).length,on=(BED.lines||[]).filter(l=>l.l36).length;
  const btn=`<button type="button" class="btn sm v36jcb" id="v36jc">${I("receipt",14)}Job costs${n?` <small>${n}</small>`:""}</button>`;
  const a='<button type="button" class="btn sm v35pk" id="v35pk">';const k=h.indexOf(a);h=k>=0?h.slice(0,k)+btn+h.slice(k):h.replace('<span class="muted small">Quick add:</span>',()=>btn+'<span class="muted small">Quick add:</span>');
  if(on)h=h.replace('<div class="o7-tot">',()=>`<p class="muted small v36jc-on" id="v36jcOn">${I("receipt",14)} ${on} line${on===1?"":"s"} from your logged receipts and trips. Removing a line frees that receipt again.</p><div class="o7-tot">`);
 }catch(e){console.warn(e)}return h}}
{const oa=AFTER.invedit;AFTER.invedit=function(id,q){const r=oa&&oa.apply(this,arguments);try{const b=document.getElementById("v36jc");if(b)b.onclick=()=>v36JcModal();
  if(b&&q&&q.jc36&&!BED.__jc36){BED.__jc36=1;setTimeout(v36JcModal,60)}}catch(e){console.warn(e)}return r}}
// Expenses & mileage: billed / not billed, and one button to bill what's left
{const ov=VIEWS.office;VIEWS.office=function(tab,q){let h=ov.apply(this,arguments);try{const m=me();if(tab!=="money"||!m||!v7Pro(m))return h;
  const L=v7Mine("ledger",m);L.forEach(x=>{const b=v36Billed(x);if(!b)return;const a=`<button class="linkbtn" data-delled="${x.id}"`;h=h.split(a).join(`<a class="v36bl" href="${href("invoice",b.id)}">${I("check",12)}Billed on ${esc(b.no)}</a>`+a)});
  const un=v36Unbilled(m,null).filter(x=>!v36Billed(x)),jobbed=un.filter(x=>x.job),amt=un.reduce((a,x)=>a+(x.kind==="mile"?x.miles*MILE_RATE:x.amt),0);
  if(un.length){const card=`<div class="card v36ub" id="v36ub"><div class="v36ub-t"><b>${I("receipt",16)} Not billed yet: ${esc(v7$(amt))}</b><span class="muted small">${un.length} receipt${un.length===1?"":"s"} and trip${un.length===1?"":"s"}${jobbed.length?`, ${jobbed.length} tagged to a job`:""}. Put them on an invoice so job costs don't come out of your pocket.</span></div><a class="btn sm primary" href="${href("invedit","new",{type:"inv",jc36:1})}">${I("plus",14)}Bill job costs</a></div>`;
   const k=h.indexOf('<div class="o7-g2">');h=k>=0?h.slice(0,k)+card+h.slice(k):card+h}
 }catch(e){console.warn(e)}return h}}

