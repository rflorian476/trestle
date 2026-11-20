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
