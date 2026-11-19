/* ===== v45 ===== */
/* (1) Late fees on overdue invoices. A pro can turn on one late fee (a flat amount or a percent of the balance, after a
   grace period of 0-60 days past the due date). The terms are printed on every invoice sent while it is on, and a fee
   can only be added to an invoice that carried those terms when it was sent, so a customer is never surprised. One fee
   per invoice (no stacking or compounding). The pro adds it with one tap on an overdue invoice, or Sawyer adds it
   automatically on the hourly sweep once the grace period has passed. The fee is its own line ("Late fee"), not taxed,
   never copied by Duplicate or a repeating invoice, and the pro can waive it any time before the balance is paid.
   Private to the pro: server-allowlisted (lateSet45, lateAdd45, lateWaive45); customers can't call them.
   (2) Hire pages: /hire/<trade>/<city> ("Plumbers in Austin, TX"), /hire/<trade> and /hire. Real pros near the city
   (same search as Find, 40 miles), the local price range from the price guide, common jobs, an FAQ, nearby cities and
   other trades. The server prerenders them and adds Service / LocalBusiness / FAQ / Breadcrumb structured data once
   indexing is on, and only for pages that list at least one real (non-demo) pro. */
const V2_ACTIONS45=["lateSet45","lateAdd45","lateWaive45"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS45);
/* ---------- late fees ---------- */
function lf45Of(m){const o=m&&m.lf45;if(!o||!o.on)return null;return{kind:o.kind==="pct"?"pct":"flat",amt:+o.amt||0,grace:Math.max(0,Math.min(60,Math.round(+o.grace||0))),auto:!!o.auto}}
function lf45Terms(t){if(!t)return"";const a=t.kind==="pct"?(+t.amt)+"% of the unpaid balance":v7$(t.amt);return"Late fee: "+a+", added once if the invoice is still unpaid "+(t.grace?t.grace+" day"+(t.grace===1?"":"s")+" after":"the day after")+" the due date."}
function lf45Line(b){return(b&&b.lines||[]).find(l=>l&&l.lf45)||null}
function lf45Late(b){if(!b||!b.due)return 0;const d=v7DaysTo(b.due);return d==null?0:Math.max(0,-d)}
/* why a fee can't be added right now (or "" when it can) */
function lf45Why(b){if(!b||b.type!=="inv")return"Late fees are for invoices.";if(b.status==="draft")return"Send the invoice first.";if(b.status==="void")return b.no+" is void.";
 if(lf45Line(b))return"A late fee is already on "+b.no+".";if(b.lf45waived)return"You waived the late fee on "+b.no+", so it stays off.";const c=billCalc(b);if(c.bal<=0.004)return b.no+" is paid in full.";if(!b.due)return b.no+" is due on receipt, so there's no due date to be late from.";
 if(!b.lf45)return b.no+" was sent before you turned on late fees, so "+(b.cname||"the customer")+" never saw the terms. Late fees only go on invoices sent with them.";
 const late=lf45Late(b);if(late<1)return b.no+" isn't past due yet.";if(late<=b.lf45.grace)return b.no+" is "+late+" day"+(late===1?"":"s")+" late. The fee can be added after the "+b.lf45.grace+"-day grace period.";return""}
function lf45Amt(b){const t=b.lf45,c=billCalc(b);if(!t)return 0;const a=t.kind==="pct"?Math.round(c.bal*t.amt)/100:+t.amt;return Math.max(1,Math.round(a*100)/100)}
function lf45Apply(b,how){const fee=lf45Amt(b),late=lf45Late(b);b.lines=(b.lines||[]).concat({d:"Late fee ("+late+" day"+(late===1?"":"s")+" past due)",q:1,r:fee,lf45:true});
 b.lf45log=(b.lf45log||[]).concat({k:"add",t:Date.now(),amt:fee,how});const c=billCalc(b);
 if(b.cuid)notify(b.cuid,`${b.bizName} added a ${v7$(fee)} late fee to invoice ${b.no} (${late} day${late===1?"":"s"} past due, per the terms on the invoice). Balance now ${v7$(c.bal)}.`,"bill:"+b.id);return fee}
A.lateSet45=function(o){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};if(!v7Pro(m))return{ok:false,msg:"Late fees are part of The Office for pro accounts."};o=o||{};
 if(!o.on){m.lf45=Object.assign({},m.lf45||{},{on:false});save();return{ok:true,msg:"Late fees off. Invoices you send from now on won't show late-fee terms."}}
 const kind=o.kind==="pct"?"pct":"flat";const amt=kind==="pct"?v7N(o.amt,0.5,10):v7N(o.amt,1,500);
 if(amt==null)return{ok:false,msg:kind==="pct"?"Enter a percent from 0.5 to 10.":"Enter a flat fee from $1 to $500."};
 const g=v7N(o.grace,0,60);if(g==null)return{ok:false,msg:"Grace period is 0 to 60 days."};
 m.lf45={on:true,kind,amt:Math.round(amt*100)/100,grace:Math.round(g),auto:!!o.auto,set:Date.now()};save();
 return{ok:true,msg:"Late fees on. "+lf45Terms(m.lf45)+" This prints on invoices you send from now on."+(m.lf45.auto?" Sawyer adds it automatically.":"")}};
A.lateAdd45=function(id){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};const b=v7Bill(String(id||""));if(!b||b.by!==m.id||!v7Pro(m))return{ok:false,msg:"That invoice wasn't found."};
 const why=lf45Why(b);if(why)return{ok:false,msg:why};const fee=lf45Apply(b,"pro");save();return{ok:true,amt:fee,msg:v7$(fee)+" late fee added to "+b.no+(b.cuid?". "+b.cname+" was notified.":".")}};
A.lateWaive45=function(id){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};const b=v7Bill(String(id||""));if(!b||b.by!==m.id||!v7Pro(m))return{ok:false,msg:"That invoice wasn't found."};
 const l=lf45Line(b);if(!l)return{ok:false,msg:"There's no late fee on "+b.no+"."};const c=billCalc(b);if(c.bal<=0.004)return{ok:false,msg:b.no+" is paid in full, so the late fee was already paid. Refund it outside Sawyer if you want to."};
 const keep=(b.lines||[]).filter(x=>x!==l);const t=billCalc(Object.assign({},b,{lines:keep}));if(t.total+0.004<c.paid)return{ok:false,msg:"The customer already paid part of the late fee, so it can't be removed."};
 b.lines=keep;b.lf45waived=true;b.lf45log=(b.lf45log||[]).concat({k:"waive",t:Date.now(),amt:l.r});if(b.cuid)notify(b.cuid,`${b.bizName} waived the late fee on invoice ${b.no}. Balance now ${v7$(billCalc(b).bal)}.`,"bill:"+b.id);save();
 return{ok:true,msg:"Late fee waived on "+b.no+"."}};
/* terms go on the invoice when it is sent (server side; the browser's sendBill is a call to /api/act) */
{const os=A.sendBill;A.sendBill=function(id){const r=os.apply(this,arguments);try{if(r&&r.ok){const m=me(),b=v7Bill(id),t=lf45Of(m);if(b&&m&&b.by===m.id&&b.type==="inv"&&t&&!b.lf45&&!b.lf45waived)b.lf45={kind:t.kind,amt:t.amt,grace:t.grace};if(b&&b.lf45)save()}}catch(e){}return r}}
/* automatic: the hourly server sweep (sweep9) adds the fee once the grace period has passed */
function lf45Sweep(m){const t=lf45Of(m);if(!t||!t.auto||!v7Pro(m))return 0;let n=0;
 (DB.bills||[]).filter(b=>b&&b.by===m.id&&b.type==="inv"&&b.lf45&&!b.lf45waived).forEach(b=>{if(lf45Why(b))return;lf45Apply(b,"auto");notify(m.id,`Late fee of ${v7$(lf45Line(b).r)} added to ${b.no} for ${b.cname} (${lf45Late(b)} days past due).`,"bill:"+b.id);n++});return n}
if(typeof v9Sweep==="function"){const o9=v9Sweep;v9Sweep=function(m){let n=o9.apply(this,arguments)||0;try{n+=lf45Sweep(m)}catch(e){}return n}}
/* the invoice paper: terms under the totals, and the fee line marked */
if(typeof billDoc==="function"){const ob=billDoc;billDoc=function(b){let h=ob.apply(this,arguments);try{if(b&&b.type==="inv"&&b.lf45&&b.status!=="void"){const l=lf45Line(b);
 const note=`<p class="v45lf-terms">${I("clock",14)}<span>${esc(lf45Terms(b.lf45))}${l?` <b>Added ${esc(fmtD(new Date(((b.lf45log||[]).filter(x=>x.k==="add").slice(-1)[0]||{}).t||Date.now()).toISOString().slice(0,10)))}.</b>`:b.lf45waived?" Waived.":""}</span></p>`;
 const k=h.lastIndexOf("</article>");h=k<0?h+note:h.slice(0,k)+note+h.slice(k)}}catch(e){}return h}}
/* the pro's invoice page: Add late fee / Waive late fee */
{const ov=VIEWS.invoice;VIEWS.invoice=(id,q)=>{const h=ov(id,q);try{const m=me(),b=v7Bill(id);if(!m||!b||b.by!==m.id||b.type!=="inv"||b.status==="void"||b.status==="draft")return h;
 const c=billCalc(b),l=lf45Line(b),why=lf45Why(b);let btn="";
 if(l&&c.bal>0.004)btn=`<button class="btn" id="v45lfWaive">${I("x",16)}Waive late fee</button>`;
 else if(!why)btn=`<button class="btn" id="v45lfAdd">${I("clock",16)}Add ${esc(v7$(lf45Amt(b)))} late fee</button>`;
 else if(c.st==="overdue"&&!l&&b.lf45)btn=`<p class="muted small v45lf-why">${esc(why)}</p>`;
 else if(c.st==="overdue"&&!l&&!b.lf45&&!lf45Of(m))btn=`<p class="muted small v45lf-why"><a href="${href("office","recurring")}#v45lf">Turn on late fees</a> for invoices you send from now on.</p>`;
 if(!btn)return h;const a='<div class="o7-acts">';const k=h.indexOf(a);return k<0?h:h.slice(0,k+a.length)+btn+h.slice(k+a.length)}catch(e){return h}}}
{const oa=AFTER.invoice;AFTER.invoice=(id,q)=>{oa&&oa(id,q);const $=s=>document.getElementById(s);
 if($("v45lfAdd"))$("v45lfAdd").onclick=e=>{const bt=e.currentTarget;if(bt.disabled)return;bt.disabled=true;act(A.lateAdd45(id),()=>render())};
 if($("v45lfWaive"))$("v45lfWaive").onclick=e=>{const bt=e.currentTarget;if(bt.disabled)return;bt.disabled=true;act(A.lateWaive45(id),()=>render())}}}
/* Office -> Recurring: the late-fee settings card, under Auto payment reminders */
function lf45Card(m){const o=m.lf45||{},on=!!o.on,kind=o.kind==="pct"?"pct":"flat";
 return`<div class="card v45lf" id="v45lf"><div class="o9-auto-h"><span class="o9-ic">${I("clock",20)}</span><div><h2>Late fees</h2><p class="muted small">One fee per invoice, added only after the grace period and only on invoices that showed the terms when you sent them. Check your state's limits on late fees before you turn this on.</p></div></div>
 <form id="v45lfF" class="v45lf-f"><label class="v45lf-on"><input type="checkbox" name="on" ${on?"checked":""}> <b>Charge a late fee on overdue invoices</b></label>
 <div class="v45lf-g"><div class="fld"><label for="v45lfK">Fee type</label><select id="v45lfK" name="kind"><option value="flat" ${kind==="flat"?"selected":""}>Flat amount ($)</option><option value="pct" ${kind==="pct"?"selected":""}>Percent of balance (%)</option></select></div>
 <div class="fld"><label for="v45lfA">Amount</label><input id="v45lfA" name="amt" inputmode="decimal" value="${esc(String(o.amt!=null?o.amt:25))}" aria-describedby="v45lfAh"><small class="muted" id="v45lfAh">$1–$500, or 0.5–10%</small></div>
 <div class="fld"><label for="v45lfG">Grace period (days after due)</label><input id="v45lfG" name="grace" inputmode="numeric" value="${esc(String(o.grace!=null?o.grace:7))}"></div></div>
 <label class="v45lf-on"><input type="checkbox" name="auto" ${o.auto?"checked":""}> Add it automatically when the grace period ends (you get a notice)</label>
 ${on?`<p class="v45lf-terms">${I("clock",14)}<span>Printed on new invoices: ${esc(lf45Terms(lf45Of(m)))}</span></p>`:""}
 <div class="row wrapr"><button class="btn primary" type="submit">Save late fees</button></div></form></div>`}
if(typeof oRecurring==="function"){const orr=oRecurring;oRecurring=function(m){const h=orr.apply(this,arguments);try{const a='<div class="card"><div class="o7-sh"><h2>Repeating invoices</h2>';const k=h.indexOf(a);const c=lf45Card(m);return k<0?h+c:h.slice(0,k)+c+h.slice(k)}catch(e){return h}}}
{const oa=AFTER.office;AFTER.office=(tab,q)=>{oa&&oa(tab,q);const f=document.getElementById("v45lfF");if(!f)return;f.onsubmit=e=>{e.preventDefault();const o=readForm(f);o.on=!!f.querySelector("[name=on]").checked;o.auto=!!f.querySelector("[name=auto]").checked;act(A.lateSet45(o),()=>{const y=scrollY;render();scrollTo(0,y)})}}}

