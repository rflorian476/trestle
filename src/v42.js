/* ===== v42 ===== */
/* Duplicate an invoice or estimate ("Bill again"). Pros who bill the same customer for the same work every month (a
   dental office's quarterly backflow test, a property manager's turnover cleans, a retainer) used to retype every line.
   Now any invoice or estimate has Duplicate on its page, and Office -> Invoices opens with a "Bill again" card for the
   last invoice sent. Duplicate makes a new draft with its own number: same customer, title, job, site, kind, line items,
   tax, deposit and notes; today's date; the same payment terms (due in as many days as the original gave, 1-120, else 14);
   the estimate's same validity. Not copied: payments, reminders, sent / viewed / approved history, photos of the work,
   the P.O. number (a new bill usually needs a new P.O.) and job-cost lines (receipts and trips can be billed once; Bill
   job costs adds new ones). The draft opens in the editor with a note saying what was copied, and nothing is sent until
   the pro presses Send. Private to the pro: server-allowlisted (dupBill42), owner-only, customers can't call it. */
if(typeof IP!=="undefined"&&IP&&!IP.copy)IP.copy='<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>';
const V2_ACTIONS42=["dupBill42"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS42);
function v42Today(m){try{if(typeof v41TodayIn==="function"&&typeof v38UserTz==="function")return v41TodayIn(v38UserTz(m))}catch(e){}return new Date(typeof v41Now==="function"?v41Now():Date.now()).toISOString().slice(0,10)}
function v42AddDays(ymd,n){const a=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd||""));if(!a)return"";return new Date(Date.UTC(+a[1],+a[2]-1,+a[3])+n*864e5).toISOString().slice(0,10)}
function v42Terms(b,key,def){const d=/^\d{4}-\d{2}-\d{2}$/.test(String(b&&b[key]||""))?b[key]:"";if(!d||!b.date)return def;
 const t0=new Date(b.sent||b.date);const s=new Date(Date.UTC(t0.getUTCFullYear(),t0.getUTCMonth(),t0.getUTCDate()));const n=Math.round((Date.parse(d+"T00:00:00Z")-s.getTime())/864e5);
 return Number.isFinite(n)&&n>=1&&n<=120?n:def}
function v42CanDup(b,m){return!!(b&&m&&b.by===m.id&&(b.type==="inv"||b.type==="est")&&b.status!=="void")}
/* the newest invoice the pro actually sent (not a draft, not void) whose customer is still in their list */
function v42LastInv(m){if(!m)return null;return(DB.bills||[]).filter(b=>b&&b.by===m.id&&b.type==="inv"&&b.status!=="draft"&&b.status!=="void"&&(DB.bcust||[]).some(c=>c&&c.id===b.cust&&c.by===m.id)).sort((a,b)=>(b.sent||b.date||0)-(a.sent||a.date||0))[0]||null}
const V42_DUP_MS=15000;const v42DupLock=typeof Map==="function"?new Map():null;
A.dupBill42=function(id,key){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};if(!v7Pro(m))return{ok:false,msg:"Invoices are part of The Office for pro accounts."};
 const src=v7Bill(String(id||""));if(!src||src.by!==m.id)return{ok:false,msg:"That invoice wasn't found."};
 if(src.status==="void")return{ok:false,msg:src.no+" is void, so it can't be duplicated."};
 if(src.type==="co")return{ok:false,msg:"A change order belongs to one estimate. Start a new change order from that estimate instead."};if(!v42CanDup(src,m))return{ok:false,msg:"That invoice wasn't found."};
 const c=v7Cust(src.cust);if(!c||c.by!==m.id)return{ok:false,msg:(src.cname||"That customer")+" is no longer in your customers, so "+src.no+" can't be copied. Start a new "+(src.type==="inv"?"invoice":"estimate")+" instead."};
 const all=(src.lines||[]),keep=all.filter(l=>l&&!l.l36),skipped=all.length-keep.length;
 if(!keep.length)return{ok:false,msg:"Every line on "+src.no+" is a job cost (a receipt or trip), and those can only be billed once. Use Bill job costs for new ones."};
 const doneMsg=(b)=> (b?b.no:"A draft")+" drafted from "+src.no+". Check the dates, then send."+(skipped?" "+skipped+" job-cost line"+(skipped===1?" was":"s were")+" left off.":"");
 const reuse=b=>({ok:true,id:b.id,no:b.no||"",msg:doneMsg(b)});
 const lockK=m.id+"\0"+src.id;
 const keyS=key==null||key===""?"":String(key).slice(0,80);
 /* SW-105: an optional idempotency key always returns the same draft. A short per-source lock (15s) makes two parallel
    calls — or a double-click that bypassed the UI busy-guard — return the draft that is already in flight. */
 if(keyS){const same=(DB.bills||[]).find(b=>b&&b.by===m.id&&b.dup42&&b.dup42.key===keyS);if(same)return reuse(same)}
 const held=v42DupLock&&v42DupLock.get(lockK);if(held&&held.id&&Date.now()-held.t<V42_DUP_MS){const ex=v7Bill(held.id);if(ex&&ex.by===m.id&&ex.status==="draft")return reuse(ex)}
 const recent=(DB.bills||[]).find(b=>b&&b.by===m.id&&b.status==="draft"&&b.dup42&&b.dup42.from===src.id&&(Date.now()-(b.date||0))<V42_DUP_MS);
 if(recent){if(v42DupLock)v42DupLock.set(lockK,{id:recent.id,t:Date.now()});return reuse(recent)}
 const today=v42Today(m),inv=src.type==="inv";
 const o={type:src.type,cust:src.cust,title:src.title,site:src.site,po:"",kind:src.kind||"standard",pct:src.kind==="progress"?src.pct:null,
  lines:keep.map(l=>({d:l.d,q:l.q,r:l.r,opt:!!l.opt,on:l.opt?!!l.on:true})),tax:src.tax,deposit:inv?0:(src.deposit||0),notes:src.notes||"",job:src.job||"",parent:null,
  due:inv?v42AddDays(today,v42Terms(src,"due",14)):null,valid:inv?null:v42AddDays(today,v42Terms(src,"valid",30))};
 const r=A.saveBill(o);if(!r||!r.ok||!r.id)return r||{ok:false,msg:"That didn't save."};
 const b=v7Bill(r.id);if(b){b.dup42={no:String(src.no||""),from:src.id,skipped};if(keyS)b.dup42.key=keyS;if(!b.date||b.date<Date.now()-6e4)b.date=Date.now();if(v42DupLock)v42DupLock.set(lockK,{id:b.id,t:Date.now()});save()}
 return{ok:true,id:r.id,no:b?b.no:"",msg:doneMsg(b)}};
if(typeof document!=="undefined"){
 const v42Go=(id,btn)=>{if(btn){if(btn.__busy)return;btn.__busy=1;btn.disabled=true;btn.setAttribute("aria-busy","true")}
  __when(A.dupBill42(id),r=>{if(btn){btn.__busy=0;btn.disabled=false;btn.removeAttribute("aria-busy")}if(r&&r.ok&&r.id){BED=null;act(r,()=>go("invedit",r.id))}else act(r||{ok:false,msg:"That didn't copy."})})};
 /* invoice / estimate page (pro): Duplicate in Actions, "Duplicated from" in the timeline */
 {const ov=VIEWS.invoice;VIEWS.invoice=function(id){let h=ov.apply(this,arguments);try{const m=me(),b=v7Bill(id);if(!v42CanDup(b,m))return h;
   const k=h.indexOf('<button class="btn" data-print>');if(k>=0)h=h.slice(0,k)+`<button type="button" class="btn" id="bDup42" aria-describedby="bDup42d">${I("copy",16)}Duplicate</button>`+h.slice(k);
   const e=h.indexOf("</div></div>",h.indexOf('<div class="o7-acts">'));if(e>=0&&k>=0)h=h.slice(0,e)+`</div><p class="small muted v42dup-d" id="bDup42d">Makes a new draft for ${esc(b.cname)} with today's date. Payments, history, photos and the P.O. aren't copied.</p>`+h.slice(e+6);
   if(b.dup42&&b.dup42.no){const t=h.indexOf('<ul class="o7-tl"><li>');if(t>=0){const z=h.indexOf("</li>",t);if(z>=0)h=h.slice(0,z+5)+`<li>Duplicated from ${esc(b.dup42.no)}</li>`+h.slice(z+5)}}}catch(e){}return h}}
 {const oa=AFTER.invoice;AFTER.invoice=function(id){const r=oa&&oa.apply(this,arguments);const x=document.getElementById("bDup42");if(x)x.onclick=()=>v42Go(id,x);return r}}
 /* Office -> Invoices: "Bill again" for the last invoice sent */
 if(typeof oBills==="function"){const ob=oBills;oBills=function(m,type){let h=ob.apply(this,arguments);try{if(type!=="inv")return h;const b=v42LastInv(m);if(!b)return h;const c=billCalc(b);
   const card=`<div class="card v42again" id="v42again"><span class="o9-ic" aria-hidden="true">${I("copy",20)}</span><div class="v42again-t"><b>Bill ${esc(b.cname)} again?</b><small class="muted">Your last invoice: ${esc(b.no)} · ${esc(b.title||"Invoice")} · ${esc(v7$(c.total))}. Duplicate it as a new draft dated today, then check it and send.</small></div><button type="button" class="btn primary sm" id="v42againB" data-dup42="${esc(b.id)}">${I("copy",14)}Duplicate last invoice</button></div>`;
   return card+h}catch(e){return h}}}
 {const oa=AFTER.office;AFTER.office=function(){const r=oa&&oa.apply(this,arguments);const x=document.getElementById("v42againB");if(x)x.onclick=()=>v42Go(x.dataset.dup42,x);return r}}
 /* the editor: what was copied (on a duplicated draft), and "Duplicate instead" on a bill locked by payments */
 {const ov=VIEWS.invedit;VIEWS.invedit=function(id,q){let h=ov.apply(this,arguments);try{const m=me(),ex=id&&id!=="new"?v7Bill(id):null;if(!ex||!m||ex.by!==m.id)return h;const f='<form id="bedF" class="o7-ed">';const k=h.indexOf(f);if(k<0)return h;
   if(ex.dup42&&ex.dup42.no&&ex.status==="draft"){const sk=ex.dup42.skipped||0;h=h.slice(0,k+f.length)+`<div class="card v42dupn" role="note" id="v42dupn">${I("copy",16)}<span><b>Copied from ${esc(ex.dup42.no)}.</b> New number, dated today, ${ex.type==="inv"?`due ${esc(fmtD(ex.due))}`:`good until ${esc(fmtD(ex.valid))}`}. Payments, reminders, history, photos and the P.O. weren't copied${sk?`, and ${sk} job-cost line${sk===1?" was":"s were"} left off (receipts and trips bill once)`:""}. Check the lines, then save or send.</span></div>`+h.slice(k+f.length)}
   else if((ex.payments||[]).length&&v42CanDup(ex,m)){const b='<span class="b7 b7-gold">Has payments: read only</span>';const j=h.indexOf(b);if(j>=0)h=h.slice(0,j+b.length)+`<button type="button" class="btn sm" id="v42lockDup" data-dup42="${esc(ex.id)}">${I("copy",14)}Duplicate instead</button>`+h.slice(j+b.length)}}catch(e){}return h}}
 {const oa=AFTER.invedit;AFTER.invedit=function(){const r=oa&&oa.apply(this,arguments);const x=document.getElementById("v42lockDup");if(x)x.onclick=()=>v42Go(x.dataset.dup42,x);return r}}
}
