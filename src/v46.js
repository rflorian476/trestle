/* ===== v46 ===== */
/* Bills to pay (Office -> Expenses & mileage, top card). The other half of "who owes you": the supplier invoices, sub
   bills, shop rent and truck notes a pro has to pay. Each bill has a vendor, amount, due date, category and optional job
   and vendor invoice number, and can repeat monthly. Marking a bill paid logs it as an ordinary expense on the date paid
   (same category, vendor and job), so the P&L, the tax file, job costing, "Bill job costs" and the 1099 sub totals all
   include it without a second entry; a monthly bill then opens next month's copy. Undo paid takes the expense back off
   (refused while that receipt is billed on a live invoice). Deleting that expense in the log reopens the bill. Reminders
   come from the hourly server sweep: 3 days before, on the day, and the day after it's late (once each, in the bell).
   The Office overview lists late and due-soon bills. Private to the pro (user field ap46, in PRO_PRIVATE); the actions are
   server-allowlisted (apSave46, apPay46, apUndo46, apDel46) and other accounts can't reach anyone else's bills. */
const V2_ACTIONS46=["apSave46","apPay46","apUndo46","apDel46"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS46);
const AP46_MAX=300;
function ap46All(m){return m&&Array.isArray(m.ap46)?m.ap46:[]}
function ap46Open(m){return ap46All(m).filter(x=>x&&!x.paid).sort((a,b)=>String(a.due).localeCompare(String(b.due))||a.dt-b.dt)}
function ap46Paid(m){return ap46All(m).filter(x=>x&&x.paid).sort((a,b)=>String(b.paid.date).localeCompare(String(a.paid.date))||b.paid.t-a.paid.t)}
function ap46AddMonth(s){const [y,mo,d]=String(s).split("-").map(Number);const t=new Date(Date.UTC(y,mo,1));const last=new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0)).getUTCDate();return t.getUTCFullYear()+"-"+String(t.getUTCMonth()+1).padStart(2,"0")+"-"+String(Math.min(d,last)).padStart(2,"0")}
function ap46When(x){const d=v7DaysTo(x.due);if(d==null)return["","No due date"];if(d<0)return["bad",(-d)+" day"+(d===-1?"":"s")+" late"];if(d===0)return["warn","Due today"];if(d<=7)return["warn","Due in "+d+" day"+(d===1?"":"s")];return["","Due "+fmtD(x.due)]}
function ap46Sum(m){const o=ap46Open(m);const r=a=>Math.round(a.reduce((s,x)=>s+x.amt,0)*100)/100;const late=o.filter(x=>v7DaysTo(x.due)<0),soon=o.filter(x=>{const d=v7DaysTo(x.due);return d>=0&&d<=7});return{open:o,total:r(o),late,lateAmt:r(late),soon,soonAmt:r(soon)}}
function ap46Name(x){return x.vendor+(x.ref?" #"+x.ref:"")}
/* the expense row a paid bill created (if it is still in the log) */
function ap46Led(x){return x&&x.paid&&x.paid.led?(DB.ledger||[]).find(l=>l&&l.id===x.paid.led):null}
function ap46BilledOn(lid){return(DB.bills||[]).find(b=>b&&b.status!=="void"&&(b.lines||[]).some(l=>l&&l.l36===lid))||null}
A.apSave46=function(o){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};if(!v7Pro(m))return{ok:false,msg:"Bills to pay are part of The Office for pro accounts."};o=o||{};
 const vendor=v7S(o.vendor,80);if(!vendor)return{ok:false,msg:"Who is the bill from? Add the vendor or sub."};
 const amt=v7N(o.amt,0.01,1e6);if(amt==null)return{ok:false,msg:"Enter the amount due, from $0.01 to $1,000,000."};
 const due=v7Date(o.due);if(!due)return{ok:false,msg:"Pick the date it's due."};const yr=+due.slice(0,4),now=new Date().getFullYear();if(yr<now-2||yr>now+3)return{ok:false,msg:"That due date looks off. Pick a date within a few years."};
 const cat=EXP_CATS.includes(o.cat)?o.cat:"Materials";const rec={vendor,amt:Math.round(amt*100)/100,due,cat,job:v7S(o.job,80),ref:v7S(o.ref,40),note:v7S(o.note,200),every:o.every==="month"?"month":""};
 m.ap46=ap46All(m);
 if(o.id){const x=m.ap46.find(y=>y&&y.id===String(o.id));if(!x)return{ok:false,msg:"That bill wasn't found."};if(x.paid)return{ok:false,msg:"That bill is already paid. Undo paid first to change it."};
  const moved=x.due!==rec.due;Object.assign(x,rec);if(moved)x.rem46=[];delete x.demo;save();return{ok:true,id:x.id,msg:"Bill from "+vendor+" updated."}}
 if(ap46Open(m).length>=AP46_MAX)return{ok:false,msg:"You have "+AP46_MAX+" open bills. Pay or delete some first."};
 const x=Object.assign({id:"ap"+uid(),dt:Date.now(),rem46:[]},rec);m.ap46.push(x);
 const paid=ap46Paid(m);if(paid.length>AP46_MAX){const keep=new Set(paid.slice(0,AP46_MAX).map(y=>y.id));m.ap46=m.ap46.filter(y=>!y.paid||keep.has(y.id))}
 save();const d=v7DaysTo(due);return{ok:true,id:x.id,msg:"Bill from "+vendor+" for "+v7$(x.amt)+" added. "+(d<0?"It's already "+(-d)+" day"+(d===-1?"":"s")+" late.":d===0?"It's due today.":"Due "+fmtD(due)+". Sawyer reminds you 3 days before.")}};
A.apPay46=function(id,o){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};const x=ap46All(m).find(y=>y&&y.id===String(id||""));if(!x||!v7Pro(m))return{ok:false,msg:"That bill wasn't found."};
 if(x.paid)return{ok:false,msg:"That bill is already marked paid."};o=o||{};const date=v7Date(o.date)||v7Today();if(v7DaysTo(date)>0)return{ok:false,msg:"The date paid can't be in the future."};
 const led={id:"l"+uid(),by:m.id,kind:"exp",date,amt:x.amt,cat:x.cat,vendor:x.vendor,job:x.job||"",note:v7S("Bill to pay"+(x.ref?" #"+x.ref:"")+(x.note?": "+x.note:""),200),photo:null,dt:Date.now(),ap46:x.id};
 v7Col("ledger").push(led);x.paid={date,t:Date.now(),led:led.id};let next=null;
 if(x.every==="month"){const nd=ap46AddMonth(x.due);if(!ap46All(m).some(y=>y&&y.from46===x.id)){next={id:"ap"+uid(),dt:Date.now(),rem46:[],vendor:x.vendor,amt:x.amt,due:nd,cat:x.cat,job:x.job,ref:"",note:x.note,every:"month",from46:x.id};m.ap46.push(next)}}
 save();return{ok:true,led:led.id,next:next&&next.id,msg:"Paid "+v7$(x.amt)+" to "+x.vendor+". Logged as a "+x.cat+" expense on "+fmtD(date)+"."+(next?" Next month's bill is due "+fmtD(next.due)+".":"")}};
A.apUndo46=function(id){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};const x=ap46All(m).find(y=>y&&y.id===String(id||""));if(!x||!v7Pro(m))return{ok:false,msg:"That bill wasn't found."};
 if(!x.paid)return{ok:false,msg:"That bill isn't marked paid."};const l=ap46Led(x);if(l){const b=ap46BilledOn(l.id);if(b)return{ok:false,msg:"That expense is billed to "+(b.cname||"a customer")+" on "+b.no+". Take the line off "+b.no+" (or void it) first."};DB.ledger.splice(DB.ledger.indexOf(l),1)}
 delete x.paid;/* a monthly copy that hasn't been touched goes away with the payment that opened it */const n=ap46All(m).find(y=>y&&y.from46===x.id&&!y.paid&&!y.edited46);if(n)m.ap46=m.ap46.filter(y=>y!==n);
 save();return{ok:true,msg:"Bill from "+x.vendor+" is open again"+(l?" and its expense was taken off the log":"")+"."}};
A.apDel46=function(id){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};const x=ap46All(m).find(y=>y&&y.id===String(id||""));if(!x||!v7Pro(m))return{ok:false,msg:"That bill wasn't found."};
 if(x.paid)return{ok:false,msg:"That bill is paid, so it's part of your expenses. Undo paid first if it was a mistake."};m.ap46=m.ap46.filter(y=>y!==x);save();return{ok:true,msg:"Bill from "+x.vendor+" deleted."}};
/* an edit marks a monthly copy as the pro's own, so undoing last month's payment won't remove it */
{const os=A.apSave46;A.apSave46=function(o){const r=os.apply(this,arguments);try{if(r&&r.ok&&o&&o.id){const x=ap46All(me()).find(y=>y&&y.id===String(o.id));if(x&&x.from46){x.edited46=true;save()}}}catch(e){}return r}}
/* deleting the expense a payment logged reopens the bill */
{const od=A.delLedger;A.delLedger=function(id){const m=me();const l=(DB.ledger||[]).find(x=>x&&x.id===id&&m&&x.by===m.id);const r=od.apply(this,arguments);
 try{if(r&&r.ok&&l&&l.ap46){const x=ap46All(m).find(y=>y&&y.id===l.ap46&&y.paid&&y.paid.led===l.id);if(x){delete x.paid;save();r.msg=(r.msg||"Deleted")+". The bill from "+x.vendor+" is back in Bills to pay."}}}catch(e){}return r}}
/* reminders on the hourly server sweep: 3 days before, on the day, the day after it's due. Sample (demo) bills are quiet. */
function ap46Sweep(m){if(!v7Pro(m))return 0;let n=0;for(const x of ap46Open(m)){if(x.demo)continue;const d=v7DaysTo(x.due);if(d==null)continue;x.rem46=Array.isArray(x.rem46)?x.rem46:[];
  const k=d<0?"late":d===0?"d0":d<=3?"d3":null;if(!k||x.rem46.includes(k))continue;if(k==="d3"&&(x.rem46.includes("d0")||x.rem46.includes("late")))continue;if(k==="d0"&&x.rem46.includes("late"))continue;
  x.rem46.push(k);n++;notify(m.id,k==="late"?`Bill from ${ap46Name(x)} (${v7$(x.amt)}) is ${-d} day${d===-1?"":"s"} late. Mark it paid in Bills to pay once it's sent.`:k==="d0"?`Bill from ${ap46Name(x)} (${v7$(x.amt)}) is due today.`:`Bill from ${ap46Name(x)} (${v7$(x.amt)}) is due in ${d} day${d===1?"":"s"}, on ${fmtD(x.due)}.`,"office/money")}
 if(n)save();return n}
if(typeof v9Sweep==="function"){const o9=v9Sweep;v9Sweep=function(m){let n=o9.apply(this,arguments)||0;try{n+=ap46Sweep(m)}catch(e){}return n}}
/* sample bills for the demo pro, so the card shows how it works on first open */
function ap46SeedDemo(){const p=(DB.users||[]).find(u=>u.id==="c1");if(p&&!Array.isArray(p.ap46)){const t=Date.now();
 p.ap46=[{id:"apd1",dt:t,rem46:[],vendor:"Ferguson Plumbing Supply",amt:1386.42,due:v7Day(5),cat:"Materials",job:"Water heater swap",ref:"FG-55120",note:"Net 30 on account",every:"",demo:true},
  {id:"apd2",dt:t,rem46:[],vendor:"Ruiz Drywall",amt:850,due:v7Day(12),cat:"Subcontractor",job:"",ref:"",note:"Patch and texture after repipe",every:"",demo:true},
  {id:"apd3",dt:t,rem46:[],vendor:"Southside Storage (shop rent)",amt:675,due:v7Day(19),cat:"Office",job:"",ref:"",note:"",every:"month",demo:true}]}}
{const os=seed;seed=function(){const r=os.apply(this,arguments);try{ap46SeedDemo()}catch(e){}return r}}
/* the server's first seed runs before this layer loads (same as seedV7 in v7) */
if(typeof DB!=="undefined"&&DB&&Array.isArray(DB.users)&&DB.users.some(u=>u&&u.id==="c1"&&u.demo!==false)&&!DB.users.some(u=>u&&Array.isArray(u.ap46))){try{ap46SeedDemo()}catch(e){}}
/* ---------- UI ---------- */
function ap46Card(m,q){const s=ap46Sum(m),paid=ap46Paid(m).slice(0,8),jobs=[...new Set(v7Mine("bills",m).map(b=>b.job).filter(Boolean))];const ed=q&&q.ap?ap46Open(m).find(x=>x.id===q.ap):null,f=ed||{};
 const row=x=>{const w=ap46When(x);return`<li class="ap46-r" data-ap="${esc(x.id)}"><div class="ap46-m"><b>${esc(x.vendor)}</b>${v7Demo(x)}<small class="muted">${esc(x.cat)}${x.job?" · "+esc(x.job):""}${x.ref?" · #"+esc(x.ref):""}${x.every?" · monthly":""}</small></div>
  <span class="ap46-w ${w[0]?"ap46-"+w[0]:""}">${esc(w[1])}</span><b class="num ap46-a">${v7$(x.amt)}</b>
  <div class="ap46-b"><button class="btn sm primary" data-ap46pay="${esc(x.id)}">${I("check",14)}Mark paid</button><a class="btn sm" href="${href("office","money",{ap:x.id})}#ap46" aria-label="Edit bill from ${esc(x.vendor)}">${I("edit",14)}Edit</a><button class="linkbtn" data-ap46del="${esc(x.id)}" aria-label="Delete bill from ${esc(x.vendor)}">${I("x",14)}</button></div></li>`};
 const head=s.open.length?`${v7$(s.total)} open on ${s.open.length} bill${s.open.length===1?"":"s"}`:"Nothing to pay";
 return`<div class="card ap46" id="ap46"><div class="o7-sh"><h2>${I("calc",18)} Bills to pay</h2><span class="muted small" id="ap46Head">${head}</span></div>
 <p class="muted small ap46-lead">Supplier invoices, sub bills, rent and truck notes. Marking one paid logs it as an expense, so your P&amp;L, tax file and job costs stay right without typing it twice.</p>
 ${s.open.length?`<div class="ap46-k"><div class="${s.late.length?"ap46-kbad":""}"><span>Late</span><b>${v7$(s.lateAmt)}</b><small>${s.late.length} bill${s.late.length===1?"":"s"}</small></div><div><span>Due in 7 days</span><b>${v7$(s.soonAmt)}</b><small>${s.soon.length} bill${s.soon.length===1?"":"s"}</small></div><div><span>All open</span><b>${v7$(s.total)}</b><small>${s.open.length} bill${s.open.length===1?"":"s"}</small></div></div>`:""}
 <form id="ap46F" class="o7-inl">${ed?`<input type="hidden" name="id" value="${esc(ed.id)}">`:""}<div class="fld"><label for="ap-v">From (vendor or sub)</label><input id="ap-v" name="vendor" maxlength="80" required placeholder="Ferguson" value="${esc(f.vendor||"")}"></div><div class="fld"><label for="ap-a">Amount due</label><input id="ap-a" name="amt" inputmode="decimal" required placeholder="0.00" value="${f.amt!=null?esc(f.amt.toFixed(2)):""}"></div><div class="fld"><label for="ap-d">Due date</label><input id="ap-d" type="date" name="due" required value="${esc(f.due||v7Day(14))}"></div><div class="fld"><label for="ap-c">Category</label><select id="ap-c" name="cat">${EXP_CATS.map(c=>`<option${(f.cat||"Materials")===c?" selected":""}>${c}</option>`).join("")}</select></div><div class="fld"><label for="ap-j">Job</label><input id="ap-j" name="job" list="jobsL46" maxlength="80" placeholder="Optional" value="${esc(f.job||"")}"></div><div class="fld"><label for="ap-r">Their invoice #</label><input id="ap-r" name="ref" maxlength="40" placeholder="Optional" value="${esc(f.ref||"")}"></div><label class="ap46-rep"><input type="checkbox" name="every" value="month" ${f.every==="month"?"checked":""}> Repeats monthly</label><button class="btn primary sm">${ed?"Save bill":"Add bill"}</button>${ed?`<a class="btn sm" href="${href("office","money")}">Cancel</a>`:""}</form>
 <datalist id="jobsL46">${jobs.map(j=>`<option value="${esc(j)}">`).join("")}</datalist>
 ${s.open.length?`<ul class="ap46-l" id="ap46Open">${s.open.map(row).join("")}</ul>`:`<p class="muted ap46-none">No bills waiting. Add one when a supplier invoice or sub bill comes in, and Sawyer reminds you before it's due.</p>`}
 ${paid.length?`<details class="ap46-p"><summary>Paid recently (${ap46Paid(m).length})</summary><ul class="ap46-l">${paid.map(x=>`<li class="ap46-r ap46-done"><div class="ap46-m"><b>${esc(x.vendor)}</b><small class="muted">Paid ${esc(fmtD(x.paid.date))} · logged as ${esc(x.cat)} expense${ap46Led(x)?"":" (expense since deleted)"}</small></div><b class="num ap46-a">${v7$(x.amt)}</b><div class="ap46-b"><button class="btn sm" data-ap46undo="${esc(x.id)}">Undo paid</button></div></li>`).join("")}</ul></details>`:""}
 <div class="row wrapr ap46-x"><button class="btn sm" id="ap46Csv" type="button">Bills to pay (CSV)</button></div></div>`}
function ap46Csv(m){const rows=[["Vendor","Their invoice #","Category","Job","Due","Amount","Status","Paid on","Repeats"]].concat(ap46All(m).slice().sort((a,b)=>String(a.due).localeCompare(String(b.due))).map(x=>[x.vendor,x.ref,x.cat,x.job,x.due,x.amt.toFixed(2),x.paid?"Paid":(v7DaysTo(x.due)<0?"Late":"Open"),x.paid?x.paid.date:"",x.every?"Monthly":""]));
 return rows.map(r=>r.map(v=>csvCell(v)).join(",")).join("\r\n")+"\r\n"}
function ap46PayModal(id){const m=me(),x=ap46All(m).find(y=>y.id===id);if(!x)return;
 modal(`<h2>Mark paid</h2><p class="muted">${esc(x.vendor)} · ${v7$(x.amt)}${x.ref?" · #"+esc(x.ref):""}</p><form id="ap46PF"><div class="fld"><label for="ap46pd">Date paid</label><input id="ap46pd" type="date" name="date" value="${v7Today()}" max="${v7Today()}" required></div>
 <p class="muted small">Logs a ${esc(x.cat)} expense of ${v7$(x.amt)} from ${esc(x.vendor)}${x.job?" on "+esc(x.job):""} on that date.${x.every?" Next month's bill opens automatically.":""}</p><div class="row wrapr"><button class="btn primary" type="submit">${I("check",16)}Mark paid</button><button class="btn" type="button" data-close>Cancel</button></div></form>`);
 const f=document.getElementById("ap46PF");f.onsubmit=e=>{e.preventDefault();const bt=f.querySelector("[type=submit]");if(bt.disabled)return;bt.disabled=true;act(A.apPay46(id,readForm(f)),()=>{closeModal();const y=scrollY;render();scrollTo(0,y)});setTimeout(()=>{bt.disabled=false},1500)};
 f.querySelector("[data-close]").onclick=()=>closeModal()}
if(typeof oMoney==="function"){const om=oMoney;oMoney=function(m){const h=om.apply(this,arguments);try{return ap46Card(m,(typeof ROUTE!=="undefined"&&ROUTE.v==="office"&&ROUTE.q)||{})+h}catch(e){return h}}}
{const oa=AFTER.office;AFTER.office=(tab,q)=>{oa&&oa(tab,q);if(tab!=="money")return;const m=me();if(!m)return;const $=s=>document.getElementById(s);const f=$("ap46F");if(!f)return;
 f.onsubmit=e=>{e.preventDefault();const bt=f.querySelector("button.primary");if(bt.disabled)return;bt.disabled=true;const o=readForm(f);o.every=f.querySelector("[name=every]").checked?"month":"";
  act(A.apSave46(o),()=>{if(o.id)go("office","money");else{const y=scrollY;render();scrollTo(0,y)}});setTimeout(()=>{bt.disabled=false},1500)};
 document.querySelectorAll("[data-ap46pay]").forEach(b=>b.onclick=()=>ap46PayModal(b.dataset.ap46pay));
 document.querySelectorAll("[data-ap46undo]").forEach(b=>b.onclick=()=>{if(b.disabled)return;b.disabled=true;act(A.apUndo46(b.dataset.ap46undo),()=>{const y=scrollY;render();scrollTo(0,y)});setTimeout(()=>{b.disabled=false},1500)});
 document.querySelectorAll("[data-ap46del]").forEach(b=>b.onclick=()=>{const x=ap46All(m).find(y=>y.id===b.dataset.ap46del);if(!x||!confirm("Delete the bill from "+x.vendor+" for "+v7$(x.amt)+"?"))return;act(A.apDel46(x.id),()=>{const y=scrollY;render();scrollTo(0,y)})});
 if($("ap46Csv"))$("ap46Csv").onclick=()=>v7Download("bills-to-pay-"+v7Today()+".csv",ap46Csv(m));
 if(q&&q.ap){const el=$("ap46");el&&el.scrollIntoView({block:"start"});const v=$("ap-v");v&&v.focus({preventScroll:true})}}}
/* Office overview: late and due-soon bills sit with the other alerts */
if(typeof oAlerts==="function"){const oal=oAlerts;oAlerts=function(m){const a=oal.apply(this,arguments);try{for(const x of ap46Open(m)){const d=v7DaysTo(x.due);if(d==null||d>3)continue;
 a.push([d<0?"bad":"warn",`Bill from ${esc(ap46Name(x))} (${v7$(x.amt)}) is ${d<0?(-d)+" day"+(d===-1?"":"s")+" late":d===0?"due today":"due in "+d+" day"+(d===1?"":"s")}.`,`<a class="btn sm" href="${href("office","money")}#ap46">Bills to pay</a>`])}}catch(e){}return a}}
/* Back up everything (v31 ZIP) includes the bills to pay */
if(typeof v31Backup==="function"){const ob=v31Backup;v31Backup=function(m){const r=ob.apply(this,arguments);try{if(ap46All(m).length&&r&&Array.isArray(r.files))r.files.push(["bills-to-pay.csv","\ufeff"+ap46Csv(m)])}catch(e){}return r}}
/* QA v42 idea 9: a void invoice's timeline ends with "Voided" (the badge already said so). The time is kept from v46 on. */
{const ovb=A.voidBill;A.voidBill=function(id){const r=ovb.apply(this,arguments);try{if(r&&r.ok){const b=v7Bill(id);if(b&&b.status==="void"&&!b.voided46){b.voided46=Date.now();save()}}}catch(e){}return r}}
{const ov=VIEWS.invoice;VIEWS.invoice=(id,q)=>{let h=ov(id,q);try{const b=v7Bill(id);if(b&&b.status==="void"){const t=h.indexOf('<ul class="o7-tl">');if(t>=0){const z=h.indexOf("</ul>",t);if(z>=0)h=h.slice(0,z)+`<li class="v46void">Voided${b.voided46?" "+ago(b.voided46):""}</li>`+h.slice(z)}}}catch(e){}return h}}
