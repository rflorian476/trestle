/* ===================== v47 ===================== */
/* (1) SEO: one description per page. server.js calls sawyerDesc() from the app sandbox for the first HTML, and v8Meta
   calls the same function after every in-app render, so the description never flips and never falls back to the home
   page's text. Record pages (pro, job, project, traveler call, traveler profile, hire pages) are built from public
   facts only: no customer names, no job or project descriptions, no contact details. Search indexing is unchanged
   (noindex until launch). */
const V47_DESC={
 home:"Hire licensed local pros with reviews only from finished jobs. Free for customers. Pros pay a flat $20/mo with no lead fees, business tools included.",
 find:"Search licensed, reviewed local pros by trade and distance. Compare reply times, typical prices and verified licenses. Free for customers.",
 prices:"Typical prices for common home projects, adjusted for your ZIP code: water heaters, roofs, panels, HVAC and more, so you know a fair quote when you see one.",
 pricing:"__BRAND__ is free for customers. Pros pay a flat $20 a month with no lead fees, no per-seat charges and no contract. Invoices, estimates and records are included.",
 pros:"A flat $20/month gets you a profile, job-board leads and the business tools: invoices, estimates, expenses, timesheets and license tracking. No lead fees.",
 faq:"Answers about getting quotes, how reviews stay honest, paying a pro, verified licenses, the $20 pro plan and what happens to your data on __BRAND__.",
 about:"Why __BRAND__ exists: reviews only from finished jobs, licenses checked by a person, no pay-to-rank and no lead fees. Built for homeowners and the trades.",
 jobs:"Open jobs from homeowners and businesses near you, with budgets and timing up front. Pros quote free: no lead fees and no bidding for contact details.",
 post:"Describe your project in four steps and get quotes from licensed local pros. See the typical price for your ZIP before you hire. Free for customers.",
 travel:"Traveler calls for electricians with the rate, per diem, hours, length and layoff risk up front. Apply direct to the contractor, with no agency markup.",
 signup:"Sign in or join __BRAND__ free with a one-time code, a password, a passkey or Google, Apple, Microsoft or Facebook. Customers are free; pros pay $20/mo.",
 credits:"Credits for the real Pexels photos used on __BRAND__, with links to each photographer. No AI-generated images of tradespeople or homes.",
 projects:"Multi-trade projects that need crews: the trades, the dates and how many of each are still needed. Pros apply free.",
 newproject:"Post a multi-trade project, list how many of each trade you need, and book the whole crew in one place.",
 join:"List your business for a flat $20/mo with no lead fees. Invoices, estimates, expenses and license tracking are included.",
 cmp:"Compare up to three pros side by side: rating, typical price, distance, reply time and license.",
 estimate:"Get a typical price range for your project from a few details and a photo, before you ask for quotes.",
 newtravel:"Post a call for traveling electricians with the rate, per diem, hours and dates up front.",
 perdiem:"Per diem guide for traveling electricians: what a day rate covers, 7-day vs. days-worked per diem, and what a call really pays after lodging and travel.",
 lodging:"Lodging notes for traveling electricians: RV pads, extended-stay rates and rooms near job sites, shared by travelers who worked there.",
 travme:"Your traveling electrician profile: license cards, references, availability and saved calls.",
 tdash:"Applicants and hires for your traveler calls: who fits the license and start date, who you hired, and who is still waiting on an answer.",
 wallet:"Your document wallet: license cards, OSHA and safety tickets, with expiry reminders 60, 30 and 7 days ahead.",
 welcome:"Welcome to __BRAND__. Set up your account in a minute: your ZIP, what you need done or the trade you work, and how you want to hear from us.",
 track:"Track a visit from your pro: the arrival window on your own clock, on-the-way notices, and a way to confirm or ask for a new time.",
 "case":"A resolution case on __BRAND__: what happened, what each side asked for, and the Trust team's answer, in one place.",
 ref:"A reference request on __BRAND__: a contractor or foreman answers for a traveling electrician they worked with, from their own sign-in.",
 verify:"Get the Verified badge on __BRAND__: send your license number and a current certificate of insurance, and a person on our Trust team reviews it.",
 myhome:"Your home's maintenance schedule, warranties, past jobs and the pros you've hired, in one place.",
 dash:"Your __BRAND__ dashboard: new jobs and quotes, messages, appointments, invoices to pay and what needs your attention next.",
 account:"Your __BRAND__ account: sign-in methods, password, contact details, alerts and a copy of your data.",
 office:"Invoices, estimates, customers, expenses, timesheets, payroll and licenses for your business.",
 bills:"Invoices from the pros you hired, with one place to pay.",
 inbox:"Your notices from __BRAND__: jobs and quotes, money, messages, crew and travel, and records, with per-category alert settings.",
 msgs:"Your messages on __BRAND__ with pros, customers and crews.",
 saved:"Pros you saved on __BRAND__, ready to compare or ask for a quote.",
 schedule:"Your appointments and visits, with arrival windows on each customer's own clock.",
 homelog:"Maintenance, warranties and receipts for your home.",
 statement:"A statement of open invoices from one business, with what is due, what is late and a link to pay each one.",
 consults:"Your booked consults with pros on __BRAND__.",
 board:"Every project's crew slots on one timeline: crew counts, open slots and double-booking warnings.",
 mod:"__BRAND__ Trust team queue."
};
V47_DESC.traveling=V47_DESC.travel;
function v47Clip(s,n){n=n||160;s=String(s||"").replace(/\s+/g," ").trim();if(s.length<=n)return s;const c=s.slice(0,n-1);const k=c.lastIndexOf(" ");return (k>n-40?c.slice(0,k):c).replace(/[,.;:\-–\s]+$/,"")+"…"}
/* builds a description from whole sentences: the first always, the rest only while the text stays within n characters */
function v47Fit(parts,n){n=n||160;let out="";for(const x of parts.filter(Boolean)){const y=String(x).replace(/\s+/g," ").trim();if(!out){out=y;continue}if((out+" "+y).length<=n)out+=" "+y}return v47Clip(out,n)}
function v47An(w){w=String(w||"");return /^[A-Z]{2,}/.test(w)?(/^[AEFHILMNORSX]/.test(w)?"an":"a"):/^[aeiou]/i.test(w)?"an":"a"}
function v47Trade(t){t=String(t||"home services");return /^[A-Z]{2,}/.test(t)?t:t.toLowerCase()}
function v47Town(z){try{return z?String(townOf(z)||""):""}catch(e){return ""}}
function v47Clean(t){return String(t||"").replace(/\s*\(demo\)/gi,"").replace(/^demo:\s*/i,"").trim()}
const v47Month=iso=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso||""));if(!m)return "";return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m[2]-1]+" "+(+m[3])+", "+m[1]};
function sawyerDesc(v,p,db){const d=db||(typeof DB!=="undefined"?DB:null)||{};try{
 if(v==="pro"&&p){const u=(d.users||[]).find(x=>x.id===p&&x.role==="contractor");if(u){const name=v47Clean(u.biz||u.name||"This pro"),t=v47Town(u.zip),tr=v47Trade(u.trade);
  const rv=(d.reviews||[]).filter(r=>r.cid===u.id&&!r.removed),n=rv.length,avg=n?rv.reduce((a,r)=>a+(+r.stars||0),0)/n:0;
  return v47Fit([`${name} is ${v47An(tr)} ${tr} pro${t?" in "+t:""}.`,n?`${avg.toFixed(1)} stars from ${n} review${n>1?"s":""} of finished jobs.`:"",u.verified?"License checked by __BRAND__.":"",+u.years>1?`${+u.years} years in business.`:"","Free quotes, no lead fees."])}}
 if((v==="job"||v==="compare")&&p){const j=(d.jobs||[]).find(x=>x.id===p);if(j){const t=v47Town(j.zip),ti=v47Clean(j.title).slice(0,80),cat=j.cat?String(j.cat).charAt(0).toUpperCase()+String(j.cat).slice(1):"Home";
  return v47Clip(v==="compare"?`Compare the bids on "${ti}"${t?" in "+t:""} side by side: price, timing, reviews from finished jobs and license, on __BRAND__.`:`${cat} job${t?" in "+t:""}: ${ti}. Local pros quote free, and the customer compares bids side by side on __BRAND__.`)}}
 if(v==="project"&&p){const pj=(d.projects||[]).find(x=>x.id===p);if(pj){const t=v47Town(pj.zip),ti=v47Clean(pj.title).slice(0,70)||"Multi-trade project",rs=pj.roles||[];
  const need=rs.reduce((a,r)=>a+(+r.need||0),0),open=rs.reduce((a,r)=>a+Math.max(0,(+r.need||0)-(r.filled||[]).length),0),trades=[...new Set(rs.filter(r=>(+r.need||0)>(r.filled||[]).length).map(r=>r.trade).filter(Boolean))];
  if(pj.status==="closed"||pj.ownerGone34)return v47Clip(`${ti}${t?" in "+t:""}: this crew project is closed. Browse other projects that need crews on __BRAND__.`);
  const when=pj.start?` Starts ${v47Month(pj.start)}.`:"";
  return v47Fit([`${ti}${t&&!ti.includes(t.replace(/, [A-Z]{2}$/,""))?" in "+t:""}: ${open?open+" of "+need+" crew spots open":"crew full"}${trades.length?" for "+trades.slice(0,4).join(", ")+(trades.length>4?" and more":""):""}.`,when.trim(),"Pros apply free on __BRAND__."])}}
 if(v==="tcall"&&p){const c=(d.tcalls||[]).find(x=>x.id===p);if(c){const ti=v47Clean(c.title).slice(0,70)||"Traveler call",w=[c.loc,c.state].filter(Boolean).join(", ");
  return v47Fit([`${ti}${w?" in "+w:""}: $${c.rate}/hr${c.perDiem?" + $"+c.perDiem+"/day per diem":""}, about ${c.weeks} weeks.`,c.hours?`Hours: ${c.hours}.`:"",c.lic?`${c.lic} license${c.lstate?" ("+c.lstate+")":""}.`:"","Rate, per diem and layoff risk up front."])}}
 if(v==="traveler"&&p){const u=(d.users||[]).find(x=>x.id===p&&x.trav);if(u){const t=u.trav,lic=(t.lic||[]).filter(l=>l&&l.state);const lt=lic.length?` ${lic[0].type||"License"} card${lic.length>1?"s":""} in ${[...new Set(lic.map(l=>l.state))].slice(0,5).join(", ")}.`:"";
  const tr=String(t.trade||"Electrical")==="Electrical"?"electrician":String(t.trade).toLowerCase()+" hand";
  return v47Fit([`Traveling ${tr}${t.home?" from "+t.home:""}${t.headline?": "+v47Clean(t.headline).replace(/^./,x=>x.toLowerCase()):""}.`,lt.trim(),+t.yrs?(+t.yrs)+" years in the trade.":"","References from foremen on __BRAND__."])}}
 if(v==="hire"&&typeof h45Desc==="function"){const x=String(h45Desc(p||"")||"");if(x)return x}
 }catch(e){}
 return V47_DESC[v]||null}

/* page titles for crew projects and traveler profiles (were "Project" / "Traveler"); same function on the server and in the app */
if(typeof sawyerTitle==="function"){const st0=sawyerTitle;sawyerTitle=function(v,p,db){const d=db||(typeof DB!=="undefined"?DB:null)||{},S=" · __BRAND__";try{
 if(v==="project"&&p){const pj=(d.projects||[]).find(x=>x.id===p);if(pj&&pj.title)return v47Clean(pj.title).slice(0,90)+": crew openings"+S}
 if(v==="traveler"&&p){const u=(d.users||[]).find(x=>x.id===p&&x.trav);if(u){const t=u.trav,tr=String(t.trade||"Electrical")==="Electrical"?"electrician":v47Trade(t.trade)+" hand";return "Traveling "+tr+(t.home?" from "+String(t.home).slice(0,40):"")+S}}}catch(e){}
 return st0.apply(this,arguments)}}

/* (2) QA v42 idea 3: a reciprocity line that is only one two-letter state code ("DC", "VA", "va.") means that state.
   Lists, full names and "licensed in / accepts" phrases already worked; a lone code used to be ignored. */
if(typeof v41ParseRecip==="function"){const rp0=v41ParseRecip;v41ParseRecip=function(txt){const r=rp0.apply(this,arguments);if(r&&r.length)return r;
 const s=String(txt||"").trim().replace(/[.!]+$/,"").trim();if(/^[A-Za-z]{2}$/.test(s)&&typeof v41IsSt==="function"&&v41IsSt(s))return[s.toUpperCase()];return r||[]}}

/* (3) QA v42 idea 5: "Your traveler calls" on the dashboard listed only the first 4 calls, so with several live calls one
   (say, a Hawaii call) fell off the card. Open calls now come first by days to start on each call's own calendar, the
   first 4 show, and "Show N more calls" opens the rest in place (aria-expanded). Rows use inline display so the
   dashboard's stylesheet subset needs no new rule. */
let V47_CALLS_OPEN=false;
function v47CallRow(c,more,hide){const hired=tHiredN(c),s=v41FitCount(c),days=v41TDays(c);
 const when=!Number.isFinite(days)?"":days>1?`starts in ${days} days`:days===1?"starts tomorrow":days===0?"starts today":"started";
 return`<li class="v41row${more?" v47more":""}" data-call="${esc(c.id)}"${hide?' style="display:none"':""}><a class="v41row-m" href="${href("tcall",c.id)}"><b>${esc(c.title)}</b><small>${esc(c.loc||"")}${c.state?", "+esc(c.state):""} · ${tMoney(c.rate)}/hr + ${tMoney(c.perDiem)}/day${when?" · "+when:""}${c.status!=="open"?" · "+(c.status==="filled"?"filled":"closed"):""}</small></a>
 <span class="v41meter" role="img" aria-label="${hired} of ${c.need} hired"><i style="--f:${Math.min(100,Math.round(hired/Math.max(1,c.need)*100))}%"></i><span><b>${hired}</b>/${c.need} hired</span></span>
 <span class="v41apps">${s.of?`<b>${s.of}</b> active · <b class="${s.n?"v41g":""}">${s.n}</b> fit`:`<span class="muted">No active applicants</span>`}</span>
 <a class="btn sm" href="${href("tdash",null,{call:c.id})}">${I("users",14)}Pipeline</a></li>`}
if(typeof v41DashBlock==="function"){const db0=v41DashBlock;v41DashBlock=function(m){try{const calls=v41MyCalls(m);if(calls.length<=4)return db0.apply(this,arguments);
  const dd=c=>{const d=v41TDays(c);return Number.isFinite(d)?d:1e6};
  const sorted=calls.slice().sort((a,b)=>(a.status==="open"?0:1)-(b.status==="open"?0:1)||dd(a)-dd(b)||String(a.start||"").localeCompare(String(b.start||"")));
  const open=sorted.filter(c=>c.status==="open"),act=open.reduce((a,c)=>a+v41FitCount(c).of,0),n=sorted.length-4;
  return`<section class="v41calls" id="v41calls"><div class="ud-h"><h2>Your traveler calls</h2><a href="${href("newtravel")}">${I("plus",14)}Post a call</a></div><div class="card v41list"><p class="small muted v41lead">${open.length} open call${open.length===1?"":"s"} · ${act} active applicant${act===1?"":"s"} to review. Fit = license (or reciprocity) for the call's state and free by the start date.</p><ul id="v47callul">${sorted.map((c,i)=>v47CallRow(c,i>=4,i>=4&&!V47_CALLS_OPEN)).join("")}</ul><p class="small v47callsmore"><button type="button" class="linkbtn small" data-v47calls="1" aria-expanded="${V47_CALLS_OPEN}" aria-controls="v47callul">${V47_CALLS_OPEN?"Show fewer calls":`Show ${n} more call${n===1?"":"s"}`}</button> · <a class="small" href="${href("tdash")}">All ${sorted.length} calls in the pipeline</a></p></div></section>`}catch(e){return db0.apply(this,arguments)}}}
if(typeof document!=="undefined"&&document.addEventListener)document.addEventListener("click",e=>{const b=e.target&&e.target.closest&&e.target.closest("[data-v47calls]");if(!b)return;e.preventDefault();
 const open=b.getAttribute("aria-expanded")!=="true",sec=b.closest(".v41calls");if(!sec)return;const rows=sec.querySelectorAll(".v47more");rows.forEach(r=>r.style.display=open?"":"none");
 V47_CALLS_OPEN=open;b.setAttribute("aria-expanded",open?"true":"false");b.textContent=open?"Show fewer calls":`Show ${rows.length} more call${rows.length===1?"":"s"}`;if(open&&rows[0]){const a=rows[0].querySelector("a");a&&a.focus({preventScroll:false})}});

/* (4) Payroll (Office -> Time & payroll, top card). Timesheets and the time clock already fed job costing; this closes the
   loop to the books. Pick a pay week (Mon–Sun): approved, unpaid hours by person, overtime at 1.5x the regular rate past
   40 hours in that week (hours already paid earlier in the same week count toward the 40), and gross pay. "Mark week
   paid" asks for the date paid and how (check, direct deposit, cash, payroll service, other), logs each person's gross
   as a Wages expense on that date (no job tag, because job costing already counts labor from the timesheets), and
   locks those timesheet entries. So the P&L, the tax file (Schedule C line 26) and the backup include labor without a
   second entry. Undo takes the expenses back off and unlocks the hours. A pay summary per run prints, and Payroll (CSV)
   downloads every run by person. Sawyer doesn't withhold taxes or file payroll; it says so on the card.
   Private to the pro (user field pr47, in PRO_PRIVATE). Server-allowlisted pr47Pay / pr47Undo; only the owner's own
   timesheet entries can be paid, so another account can't reach anyone else's hours or runs. */
const V2_ACTIONS47=["pr47Pay","pr47Undo"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS47);
const PR47_METHODS=["Check","Direct deposit","Cash","Payroll service","Other"],PR47_MAX=520;
if(typeof V9SCHC!=="undefined"&&V9SCHC&&!V9SCHC.Wages)V9SCHC.Wages="Line 26 Wages";
if(typeof OTABS!=="undefined"){const t=OTABS.find(x=>x[0]==="time");if(t)t[1]="Time & payroll"}
const pr47D=iso=>new Date(String(iso)+"T00:00:00Z");
const pr47Add=(iso,n)=>{const d=pr47D(iso);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const pr47Mon=iso=>{const d=pr47D(iso);if(isNaN(d))return null;d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10)};
const PR47_MO=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function pr47Wk(wk){const a=pr47D(wk),b=pr47D(pr47Add(wk,6));const ma=PR47_MO[a.getUTCMonth()],mb=PR47_MO[b.getUTCMonth()];return ma+" "+a.getUTCDate()+" – "+(mb!==ma?mb+" ":"")+b.getUTCDate()+(b.getUTCFullYear()!==new Date().getUTCFullYear()?", "+b.getUTCFullYear():"")}
const pr47Key=w=>String(w||"").trim().toLowerCase().replace(/\s+/g," ");
const pr47R2=n=>Math.round(n*100)/100;
function pr47Runs(m){return m&&Array.isArray(m.pr47)?m.pr47:[]}
/* what a week owes: approved, unpaid entries grouped by person */
function pr47Calc(m,wk){const end=pr47Add(wk,6);const all=v7Mine("tsheets",m).filter(t=>t&&t.date>=wk&&t.date<=end);
 let ok=all.filter(t=>t.ok&&!t.pr47);const wait=all.filter(t=>!t.ok&&!t.pr47),paid=all.filter(t=>t.pr47);const P={};
 const own=pr47Key(m.name||""),own2=pr47Key(typeof nameOf==="function"?nameOf(m):""),isOwner=t=>(String(t.role||"").toLowerCase()==="owner"||pr47Key(t.who)===own||pr47Key(t.who)===own2)&&!(+t.rate>0);const owner=ok.filter(isOwner);ok=ok.filter(t=>!isOwner(t));
 for(const t of ok){const k=pr47Key(t.who);const p=P[k]=P[k]||{who:t.who,role:t.role||"",hrs:0,straight:0,noRate:0,ts:[],prior:0};p.hrs+=+t.hrs||0;p.straight+=(+t.hrs||0)*(+t.rate||0);if(!(+t.rate>0))p.noRate++;p.ts.push(t.id);if(!p.role&&t.role)p.role=t.role}
 for(const t of paid){const p=P[pr47Key(t.who)];if(p)p.prior+=+t.hrs||0}
 const lines=Object.values(P).map(p=>{const hrs=pr47R2(p.hrs),otAll=Math.max(0,p.prior+hrs-40),otPrior=Math.max(0,p.prior-40),ot=pr47R2(Math.min(hrs,otAll-otPrior)),rr=hrs?p.straight/hrs:0;
  return{key:pr47Key(p.who),who:p.who,role:p.role,hrs,reg:pr47R2(hrs-ot),ot,prior:pr47R2(p.prior),rate:pr47R2(rr),gross:pr47R2(p.straight+0.5*rr*ot),noRate:p.noRate,ts:p.ts}}).sort((a,b)=>a.who.localeCompare(b.who));
 return{wk,end,lines,total:pr47R2(lines.reduce((a,l)=>a+l.gross,0)),hrs:pr47R2(lines.reduce((a,l)=>a+l.hrs,0)),ot:pr47R2(lines.reduce((a,l)=>a+l.ot,0)),wait:wait.length,waitHrs:pr47R2(wait.reduce((a,t)=>a+(+t.hrs||0),0)),noRate:lines.filter(l=>l.noRate).map(l=>l.who),owner:{n:owner.length,hrs:pr47R2(owner.reduce((a,t)=>a+(+t.hrs||0),0)),who:[...new Set(owner.map(t=>t.who))]}}}
/* weeks with approved hours that aren't paid yet, newest first */
function pr47Open(m){const s=new Set();for(const t of v7Mine("tsheets",m))if(t&&t.ok&&!t.pr47&&v7Date(t.date)){const w=pr47Mon(t.date);if(w)s.add(w)}return[...s].sort().reverse()}
A.pr47Pay=function(wk,o){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};if(!v7Pro(m))return{ok:false,msg:"Payroll is part of The Office for pro accounts."};o=o||{};
 wk=v7Date(wk);if(!wk||pr47Mon(wk)!==wk)return{ok:false,msg:"Pick a pay week."};if(wk>v7Today())return{ok:false,msg:"That week hasn't started yet."};
 const date=v7Date(o.date)||v7Today();if(v7DaysTo(date)>0)return{ok:false,field:"date",msg:"The date paid can't be in the future."};if(date<wk)return{ok:false,field:"date",msg:"The date paid can't be before the week starts ("+fmtD(wk)+")."};
 const rates=o.rates&&typeof o.rates==="object"?o.rates:{};const end=pr47Add(wk,6);let filled=0;
 for(const t of v7Mine("tsheets",m))if(t&&t.ok&&!t.pr47&&t.date>=wk&&t.date<=end&&!(+t.rate>0)){const r=v7N(rates[pr47Key(t.who)],1,500);if(r!=null){t.rate=pr47R2(r);filled++}}
 const c=pr47Calc(m,wk);if(!c.lines.length){if(filled)save();return{ok:false,msg:"No approved hours in the week of "+pr47Wk(wk)+" are waiting to be paid."+(c.wait?" Approve the "+c.wait+" waiting entr"+(c.wait===1?"y":"ies")+" first.":"")}}
 if(c.noRate.length){if(filled)save();return{ok:false,field:"rate",msg:"Add a pay rate for "+c.noRate.join(", ")+" first ($1–$500 an hour)."}}
 const method=PR47_METHODS.includes(o.method)?o.method:"Check";m.pr47=pr47Runs(m);if(m.pr47.length>=PR47_MAX)m.pr47.splice(0,m.pr47.length-PR47_MAX+1);
 const run={id:"pr"+uid(),wk,date,method,t:Date.now(),lines:[],total:c.total,hrs:c.hrs,ot:c.ot};
 for(const l of c.lines){let led=null;if(l.gross>0){led={id:"l"+uid(),by:m.id,kind:"exp",date,amt:l.gross,cat:"Wages",vendor:v7S(l.who,80),job:"",note:v7S("Payroll, week of "+pr47Wk(wk)+": "+l.hrs+" hrs"+(l.ot?" ("+l.ot+" OT)":"")+", "+method,200),photo:null,dt:Date.now(),pr47:run.id};v7Col("ledger").push(led)}
  run.lines.push({who:l.who,role:l.role,hrs:l.hrs,reg:l.reg,ot:l.ot,rate:l.rate,gross:l.gross,ts:l.ts.slice(),led:led&&led.id})}
 const ids=new Set(c.lines.flatMap(l=>l.ts));for(const t of v7Mine("tsheets",m))if(ids.has(t.id))t.pr47=run.id;
 m.pr47.push(run);save();
 return{ok:true,id:run.id,msg:"Week of "+pr47Wk(wk)+" marked paid: "+v7$(c.total)+" gross to "+c.lines.length+" "+(c.lines.length===1?"person":"people")+", logged as Wages expenses on "+fmtD(date)+"."}};
A.pr47Undo=function(id){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};const run=pr47Runs(m).find(r=>r&&r.id===String(id||""));if(!run||!v7Pro(m))return{ok:false,msg:"That payroll run wasn't found."};
 const leds=(DB.ledger||[]).filter(l=>l&&l.by===m.id&&l.pr47===run.id);
 for(const l of leds){const b=typeof ap46BilledOn==="function"?ap46BilledOn(l.id):null;if(b)return{ok:false,msg:"Wages for "+l.vendor+" are billed to "+(b.cname||"a customer")+" on "+b.no+". Take the line off "+b.no+" (or void it) first."}}
 DB.ledger=(DB.ledger||[]).filter(l=>!(l&&l.by===m.id&&l.pr47===run.id));
 for(const t of v7Mine("tsheets",m))if(t.pr47===run.id)delete t.pr47;
 m.pr47=pr47Runs(m).filter(r=>r!==run);save();
 return{ok:true,msg:"Payroll for the week of "+pr47Wk(run.wk)+" undone. "+(leds.length?"Its "+leds.length+" Wages expense"+(leds.length===1?" was":"s were")+" taken off the log and t":"T")+"he hours can be edited again."}};
/* paid hours are locked: unapprove, delete or edit the run first */
{const oa=A.approveTime;A.approveTime=function(id){const m=me(),t=(DB.tsheets||[]).find(x=>x&&x.id===id&&m&&x.by===m.id);if(t&&t.pr47){const r=pr47Runs(m).find(x=>x.id===t.pr47);return{ok:false,msg:"Those hours are on the payroll for the week of "+(r?pr47Wk(r.wk)+", paid "+fmtD(r.date):"a paid week")+". Undo that payroll run first."}}return oa.apply(this,arguments)}}
{const od=A.delTime;A.delTime=function(id){const m=me(),t=(DB.tsheets||[]).find(x=>x&&x.id===id&&m&&x.by===m.id);if(t&&t.pr47){const r=pr47Runs(m).find(x=>x.id===t.pr47);return{ok:false,msg:"Those hours are on the payroll for the week of "+(r?pr47Wk(r.wk)+", paid "+fmtD(r.date):"a paid week")+". Undo that payroll run first."}}return od.apply(this,arguments)}}
{const od=A.delLedger;A.delLedger=function(id){const m=me(),l=(DB.ledger||[]).find(x=>x&&x.id===id&&m&&x.by===m.id);if(l&&l.pr47)return{ok:false,msg:"That's payroll for "+(l.vendor||"your crew")+". Undo the payroll run in Office → Time & payroll instead, so the hours unlock too."};return od.apply(this,arguments)}}
if(A.editLedger40){const oe=A.editLedger40;A.editLedger40=function(id){const m=me(),l=(DB.ledger||[]).find(x=>x&&x.id===id&&m&&x.by===m.id);if(l&&l.pr47)return{ok:false,msg:"That's a payroll entry. Undo the payroll run in Office → Time & payroll to change it."};return oe.apply(this,arguments)}}
function pr47Csv(m){const rows=[["Week start","Week end","Date paid","Method","Person","Role","Regular hours","Overtime hours","Regular rate","Gross pay"]];
 for(const r of pr47Runs(m).slice().sort((a,b)=>a.wk.localeCompare(b.wk)||a.t-b.t))for(const l of r.lines)rows.push([r.wk,pr47Add(r.wk,6),r.date,r.method,l.who,l.role,l.reg,l.ot,l.rate.toFixed(2),l.gross.toFixed(2)]);
 return rows.map(r=>r.map(v=>csvCell(v)).join(",")).join("\r\n")+"\r\n"}
/* ---------- UI ---------- */
function pr47Card(m,q){const open=pr47Open(m),runs=pr47Runs(m).slice().sort((a,b)=>b.wk.localeCompare(a.wk)||b.t-a.t),cur=pr47Mon(v7Today());
 /* v49: open on the newest week with someone to pay (a week holding only the owner's no-rate hours, e.g. on a Monday, is skipped) */let wk=q&&v7Date(q.wk)&&pr47Mon(q.wk)===q.wk&&q.wk<=v7Today()?q.wk:(open.find(w=>pr47Calc(m,w).lines.length)||open[0]||cur);const c=pr47Calc(m,wk);
 const weeks=[...new Set([wk,...open,cur])].sort().reverse();
 const rows=c.lines.map(l=>`<tr><td><b>${esc(l.who)}</b><small class="muted">${esc(l.role||"")}${l.prior?" · "+l.prior+" hrs paid earlier this week":""}</small></td><td class="num">${l.reg.toFixed(2)}</td><td class="num">${l.ot?`<span class="bad7">${l.ot.toFixed(2)}</span>`:"–"}</td><td class="num">${l.noRate?`<label class="sr-only" for="pr47r-${esc(l.key)}">Pay rate for ${esc(l.who)}</label><input class="pr47-rate" id="pr47r-${esc(l.key)}" data-pr47rate="${esc(l.key)}" inputmode="decimal" placeholder="$/hr" maxlength="7">`:v7$(l.rate)}</td><td class="num"><b>${l.noRate?"–":v7$(l.gross)}</b></td></tr>`);
 const paidRow=r=>`<li class="ap46-r ap46-done"><div class="ap46-m"><b>Week of ${esc(pr47Wk(r.wk))}</b><small class="muted">Paid ${esc(fmtD(r.date))} · ${esc(r.method)} · ${r.lines.length} ${r.lines.length===1?"person":"people"} · ${r.hrs} hrs${r.ot?" ("+r.ot+" OT)":""}</small></div><b class="num ap46-a">${v7$(r.total)}</b><div class="ap46-b"><button class="btn sm" type="button" data-pr47stub="${esc(r.id)}">${I("print",14)}Pay summary</button><button class="btn sm" type="button" data-pr47undo="${esc(r.id)}">Undo</button></div></li>`;
 return`<div class="card pr47" id="pr47"><div class="o7-sh"><h2>${I("wallet",18)} Payroll</h2><div class="fld pr47-wk"><label for="pr47wk" class="small muted">Pay week (Mon–Sun)</label><select id="pr47wk">${weeks.map(w=>`<option value="${w}"${w===wk?" selected":""}>${esc(pr47Wk(w))}${open.includes(w)?" · ready":""}${w===cur?" (this week)":""}</option>`).join("")}</select></div></div>
 <p class="muted small pr47-lead">Approved hours × pay rate, with overtime at 1.5× the regular rate past 40 hours in the week. Marking a week paid logs each person's gross pay as a Wages expense, so your P&amp;L and tax file include labor. Sawyer doesn't withhold taxes or file payroll: hand the CSV to your payroll service or accountant.</p>
 ${c.lines.length?`<div class="ap46-k"><div><span>Gross pay</span><b id="pr47Tot">${v7$(c.total)}</b><small>${c.lines.length} ${c.lines.length===1?"person":"people"}</small></div><div><span>Hours</span><b>${c.hrs}</b><small>${c.ot?c.ot+" overtime":"no overtime"}</small></div><div class="${c.wait?"ap46-kbad":""}"><span>Waiting for approval</span><b>${c.wait}</b><small>${c.wait?c.waitHrs+" hrs not included":"all approved"}</small></div></div>
 <div class="o7-tw"><table class="o7t pr47-tbl"><thead><tr><th>Person</th><th class="num"><span class="pr47-lg">Regular hrs</span><span class="pr47-sm" aria-hidden="true">Reg</span></th><th class="num"><span class="pr47-lg">Overtime hrs</span><span class="pr47-sm" aria-hidden="true">OT</span></th><th class="num">Rate</th><th class="num"><span class="pr47-lg">Gross pay</span><span class="pr47-sm" aria-hidden="true">Gross</span></th></tr></thead><tbody>${rows.join("")}</tbody></table></div>
 ${c.owner.n?`<p class="small muted pr47-own">${I("info",14)} ${esc(c.owner.who.join(", "))} (owner): ${c.owner.hrs} hrs with no pay rate are left off payroll, since owners usually take a draw. They still count in job costing. Log owner hours with a $/hr rate to pay them as wages.</p>`:""}${c.noRate.length?`<p class="small pr47-warn" role="note">${I("info",14)} ${esc(c.noRate.join(", "))} ${c.noRate.length===1?"has":"have"} hours with no pay rate. Type the hourly rate in the row (it's saved on those entries), or set it in Team for the time clock.</p>`:""}
 <form id="pr47F" class="o7-inl"><input type="hidden" name="wk" value="${wk}"><div class="fld"><label for="pr47d">Date paid</label><input id="pr47d" type="date" name="date" value="${v7Today()}" min="${wk}" max="${v7Today()}" required></div><div class="fld"><label for="pr47m">Paid by</label><select id="pr47m" name="method">${PR47_METHODS.map(x=>`<option>${x}</option>`).join("")}</select></div><button class="btn primary sm" type="submit">${I("check",14)}Mark week paid</button><button class="btn sm" type="button" data-pr47stub="preview">${I("print",14)}Preview pay summary</button></form>`
 :`<p class="muted pr47-none">${c.wait?`No approved hours to pay for this week yet. ${c.wait} entr${c.wait===1?"y is":"ies are"} waiting for approval below.`:`Nothing to pay for this week. Hours you approve below (or from the time clock in Team) show up here.`}</p>`}
 ${runs.length?`<details class="ap46-p pr47-p"${q&&q.wk&&!c.lines.length?" open":""}><summary>Paid weeks (${runs.length})</summary><ul class="ap46-l">${runs.slice(0,12).map(paidRow).join("")}</ul></details>`:""}
 <div class="row wrapr ap46-x"><button class="btn sm" id="pr47Csv" type="button"${runs.length?"":" disabled"}>Payroll (CSV)</button></div></div>`}
function pr47Stub(m,id){let r=id==="preview"?null:pr47Runs(m).find(x=>x.id===id),wk,lines,date,method;
 if(r){wk=r.wk;lines=r.lines;date=r.date;method=r.method}else{const f=document.getElementById("pr47F");wk=f?f.wk.value:pr47Mon(v7Today());const c=pr47Calc(m,wk);lines=c.lines;date=null;method=null}
 const ts=v7Mine("tsheets",m);const biz=m.biz||nameOf(m);
 const per=l=>{const es=ts.filter(t=>(l.ts||[]).includes(t.id)).sort((a,b)=>a.date.localeCompare(b.date));return`<section class="pr47-stub"><div class="pr47-sh"><div><b>${esc(l.who)}</b><small class="muted">${esc(l.role||"")}</small></div><div class="num"><small class="muted">Gross pay</small><b>${l.noRate?"Needs a rate":v7$(l.gross)}</b></div></div>
  <table class="o7t pr47-t"><thead><tr><th>Date</th><th>Job</th><th class="num">Hours</th><th class="num">Rate</th></tr></thead><tbody>${es.map(t=>`<tr><td>${esc(fmtD(t.date))}</td><td>${esc(t.job||"")}</td><td class="num">${t.hrs}</td><td class="num">${+t.rate>0?v7$(+t.rate):"–"}</td></tr>`).join("")}</tbody></table>
  <p class="small">Regular ${l.reg} hrs · Overtime ${l.ot} hrs at 1.5× the regular rate of ${v7$(l.rate)} · <b>Gross ${v7$(l.gross)}</b></p></section>`};
 modal(`<div class="pr47-print"><h2 id="mtitle">Pay summary · week of ${esc(pr47Wk(wk))}</h2><p class="muted small">${esc(biz)} · ${date?`Paid ${esc(fmtD(date))} by ${esc(method)}`:"Preview: not paid yet"}. Gross pay before taxes and deductions. Sawyer doesn't withhold or file payroll taxes.</p>${lines.map(per).join("")||`<p class="muted">No hours.</p>`}</div>
  <div class="row wrapr no-print"><button class="btn primary" type="button" id="pr47Print">${I("print",16)}Print / PDF</button><button class="btn" type="button" data-close>Close</button></div>`);
 const pb=document.getElementById("pr47Print");if(pb)pb.onclick=()=>{document.body.classList.add("print47");const off=()=>{document.body.classList.remove("print47");removeEventListener("afterprint",off)};addEventListener("afterprint",off);window.print();setTimeout(off,60000)};
 document.querySelectorAll("#modal [data-close]").forEach(x=>x.onclick=()=>closeModal())}
if(typeof oTime==="function"){const ot=oTime;oTime=function(m){let h=ot.apply(this,arguments);try{
 // paid entries in the log read "Paid" and lose Approve / Delete (undo the run to change them)
 for(const t of v7Mine("tsheets",m))if(t&&t.pr47){h=h.replace(new RegExp('<button class="btn sm ?[a-z]*" data-apt="'+t.id+'">[^<]*</button><button class="linkbtn" data-delt="'+t.id+'"[^>]*>[\\s\\S]*?</button>'),'<span class="b7 b7-good" title="On a paid payroll week">Paid</span>')}
 return pr47Card(m,(typeof ROUTE!=="undefined"&&ROUTE.v==="office"&&ROUTE.q)||{})+h}catch(e){console.warn(e);return h}}}
{const oa=AFTER.office;AFTER.office=(tab,q)=>{oa&&oa(tab,q);if(tab!=="time")return;const m=me();if(!m)return;const $=s=>document.getElementById(s);
 const ws=$("pr47wk");if(ws)ws.onchange=()=>go("office","time",{wk:ws.value});
 const f=$("pr47F");if(f)f.onsubmit=e=>{e.preventDefault();const bt=f.querySelector("button[type=submit]");if(bt.disabled)return;const o=readForm(f);const rates={};document.querySelectorAll("[data-pr47rate]").forEach(i=>{if(i.value.trim())rates[i.dataset.pr47rate]=i.value.trim()});o.rates=rates;
  const c=pr47Calc(m,o.wk);if(!confirm("Mark the week of "+pr47Wk(o.wk)+" paid"+(c.noRate.length?"":": "+v7$(c.total)+" gross to "+c.lines.length+" "+(c.lines.length===1?"person":"people"))+"?"))return;bt.disabled=true;
  act(A.pr47Pay(o.wk,o),()=>{const y=scrollY;render();scrollTo(0,y)});setTimeout(()=>{bt.disabled=false},1500)};
 document.querySelectorAll("[data-pr47undo]").forEach(b=>b.onclick=()=>{const r=pr47Runs(m).find(x=>x.id===b.dataset.pr47undo);if(!r||!confirm("Undo payroll for the week of "+pr47Wk(r.wk)+" ("+v7$(r.total)+")? Its Wages expenses come off the log."))return;if(b.disabled)return;b.disabled=true;act(A.pr47Undo(r.id),()=>{const y=scrollY;render();scrollTo(0,y)});setTimeout(()=>{b.disabled=false},1500)});
 document.querySelectorAll("[data-pr47stub]").forEach(b=>b.onclick=()=>pr47Stub(m,b.dataset.pr47stub));
 if($("pr47Csv"))$("pr47Csv").onclick=()=>{v7Download("payroll-"+v7Today()+".csv",pr47Csv(m));toast("Download started")}}}
/* Office overview: last week's approved hours not marked paid yet */
if(typeof oAlerts==="function"){const oal=oAlerts;oAlerts=function(m){const a=oal.apply(this,arguments);try{const cur=pr47Mon(v7Today());const w=pr47Open(m).find(x=>x<cur);if(w){const c=pr47Calc(m,w);if(c.lines.length)a.push(["warn",`Payroll for the week of ${esc(pr47Wk(w))} is ready: ${c.lines.length} ${c.lines.length===1?"person":"people"}, ${c.hrs} approved hours, not marked paid.`,`<a class="btn sm" href="${href("office","time",{wk:w})}">Payroll</a>`])}}catch(e){}return a}}
/* Back up everything (v31 ZIP) includes payroll */
if(typeof v31Backup==="function"){const ob=v31Backup;v31Backup=function(m){const r=ob.apply(this,arguments);try{if(pr47Runs(m).length&&r&&Array.isArray(r.files))r.files.push(["payroll.csv","\ufeff"+pr47Csv(m)])}catch(e){}return r}}
