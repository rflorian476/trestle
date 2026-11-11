/* v16: (1) SW-018 partial profile state guard, (2) expiry reminders on one schedule, (3) honest dashboard numbers and first-run guidance. */
// (1) A signed-out /p/<id> page starts with only that profile's data (see client-pre.js). Any other page waits for the
// full public state first (one quick synchronous load), so search, other profiles and the home page never render from
// the slim copy.
if(typeof document!=="undefined"&&typeof render==="function"&&typeof __fullSync==="function"){const r16=render;render=function(){try{if(!__partOk())__fullSync()}catch(e){}return r16.apply(this,arguments)}}

// (2) Records: one expiry schedule, and vendor COIs that carry a real expiry date.
// Pros' own licenses and policies already get notices 60, 30 and 7 days out and on the day (v9Sweep); the server now runs
// that sweep for every account with dated records, not only pros who turned on payment reminders (see server.js).
// Customers and businesses who ask a pro for a certificate of insurance now get the policy's carrier, number and expiry
// (from the pro's general liability record), see it on their dashboard, get notices 30 and 7 days out and on the day,
// and can ask for an updated certificate in one tap.
function v16Gl(pid){return (DB.bdocs||[]).filter(d=>d.by===pid&&d.scope==="biz"&&d.kind==="gl"&&d.exp).sort((a,b)=>String(b.exp).localeCompare(String(a.exp)))[0]||null}
function v16Cois(m){const by=new Map();for(const c of (m&&m.cois)||[]){if(!c||!c.cid)continue;const p=by.get(c.cid);if(!p||(c.date||0)>=(p.date||0))by.set(c.cid,c)}return [...by.values()]}
function v16CoiState(c){if(c.status==="requested")return["req","Requested "+(typeof ago==="function"?ago(c.date):"")];if(!c.exp)return["ok","Received"+(c.at?" "+fmtD(new Date(c.at).toISOString().slice(0,10)):"")+" · no expiry on file"];
 const n=v7DaysTo(c.exp);if(n<0)return["bad","Expired "+fmtD(c.exp)];if(n<=30)return["warn","Expires in "+n+" day"+(n===1?"":"s")+" ("+fmtD(c.exp)+")"];return["ok","Valid to "+fmtD(c.exp)]}
if(typeof A!=="undefined"&&A.sendCOI){const os=A.sendCOI;A.sendCOI=function(rid){const m=me();const rq=m&&(m.coiReqs||[]).find(x=>x.id===rid);const r=os.apply(this,arguments);
 try{if(r&&r.ok&&rq){const c=U(rq.from);const e=c&&(c.cois||[]).filter(x=>x.cid===m.id&&x.status==="received").sort((a,b)=>(b.at||0)-(a.at||0))[0];const g=v16Gl(m.id);
  if(e){if(g){e.exp=g.exp;e.carrier=String(g.holder||"").slice(0,100);e.num=String(g.num||"").slice(0,60);e.policy=String(g.name||"General liability").slice(0,100)}else{delete e.exp}e.rem16=[];save()}
  if(!g)r.msg="COI sent. Add your general liability policy and its expiry under Office → Documents so customers see it's current.";
  else if(v7DaysTo(g.exp)<0)r.msg="COI sent, but your general liability shows as expired. Upload the renewal under Office → Documents."}}catch(x){}return r}}
if(typeof v9Sweep==="function"){const o9=v9Sweep;v9Sweep=function(m){let n=o9.apply(this,arguments)||0;try{if(m&&m.role==="customer"){for(const c of v16Cois(m)){if(c.status!=="received"||!c.exp)continue;const left=v7DaysTo(c.exp);const step=[0,7,30].find(x=>left<=x);if(step==null)continue;c.rem16=c.rem16||[];if(c.rem16.includes(step))continue;c.rem16.push(step);
  const nm=nameOf(U(c.cid));notify(m.id,left<0?`${nm}'s certificate of insurance expired ${fmtD(c.exp)}. Ask for an updated one before they're back on site.`:`${nm}'s certificate of insurance expires in ${left} day${left===1?"":"s"} (${fmtD(c.exp)}). Ask for an updated one before their next visit.`,"dash");n++}}}catch(e){}return n}}
if(typeof bizPanel==="function"){const ob=bizPanel;bizPanel=function(m){let h=ob.apply(this,arguments);try{const cs=v16Cois(m);
 const li=cs.map(c=>{const s=v16CoiState(c),u=U(c.cid);const due=s[0]==="bad"||s[0]==="warn";return`<li class="coi16 coi16-${s[0]}">${I("shield",14)}<span><b>${esc((u&&(u.biz||u.name))||"Pro")}</b><small>${esc([c.policy,c.carrier,c.num].filter(Boolean).join(" · "))}</small><em>${esc(s[1])}</em></span>${due?`<button class="btn sm" type="button" data-coi16="${esc(c.cid)}">Ask for an updated COI</button>`:""}</li>`}).join("");
 // the panel's Invoices list showed only finished Sawyer jobs, so a business with a real invoice to pay read "Invoices appear here when jobs complete"
 const bs=(DB.bills||[]).filter(b=>b.cuid===m.id&&b.type==="inv"&&b.status!=="draft"&&b.status!=="void").sort((a,b)=>(b.date||0)-(a.date||0));
 if(bs.length)h=h.replace(/<h4>Invoices<\/h4><ul class="v3list">[\s\S]*?<\/ul>/,()=>`<h4>Invoices</h4><ul class="v3list inv16-l">${bs.slice(0,4).map(b=>{const c=billCalc(b),open=c.bal>0.004,od=open&&b.due&&v7DaysTo(b.due)<0;return`<li>${I("dollar",14)}<a href="${open?href("pay",b.id):href("bills")}"><b>${esc(b.no||"Invoice")}</b><span>${esc(b.bizName||"")}</span><small>${open?v7$(c.bal)+(od?" overdue since "+fmtD(b.due):b.due?" due "+fmtD(b.due):" due"):"Paid · "+v7$(c.total)}</small></a></li>`}).join("")}</ul><a class="inv16-all" href="${href("bills")}">All invoices${bs.length>4?" ("+bs.length+")":""}</a>`);
 h=h.replace(/<h4>Certificates of insurance<\/h4><ul class="v3list">[\s\S]*?<\/ul>/,()=>`<h4>Certificates of insurance</h4><ul class="v3list coi16-l">${li||`<li class="muted small">Ask any pro for a certificate from their profile or below. We'll track its expiry and remind you 30 days out.</li>`}</ul>`)}catch(e){}return h}}
if(typeof AFTER!=="undefined"){const od=AFTER.dash;AFTER.dash=function(){const r=od&&od.apply(this,arguments);try{document.querySelectorAll("[data-coi16]").forEach(b=>b.onclick=()=>act(A.requestCOI(b.dataset.coi16,""),render))}catch(e){}return r}}
// demo data: the demo business holds Bluebonnet's certificate, which runs out with Bluebonnet's liability policy
function seedV16(){if(typeof DB==="undefined"||!DB||!DB.users)return;const b=U("b1"),g=v16Gl("c1");if(!b||!g||b.coi16seed)return;b.cois=(b.cois||[]).filter(c=>c.cid!=="c1");
 b.cois.push({cid:"c1",date:Date.now()-40*864e5,status:"received",at:Date.now()-39*864e5,exp:g.exp,carrier:String(g.holder||""),num:String(g.num||""),policy:String(g.name||"General liability"),rem16:[],demo:true});b.coi16seed=true;save()}
if(typeof __liveLoad==="undefined"){try{seedV16()}catch(e){}{const os=seed;seed=function(){const r=os.apply(this,arguments);try{seedV16()}catch(e){}return r}}}
// a renewed record starts its reminder schedule over (the old notices were for the old expiry date)
if(typeof A!=="undefined"&&A.saveDoc){const osd=A.saveDoc;A.saveDoc=function(o){const m=me();const prev=o&&o.id&&m&&(DB.bdocs||[]).find(x=>x.id===o.id&&x.by===m.id);const was=prev?prev.exp:undefined;const r=osd.apply(this,arguments);try{if(r&&r.ok!==false&&prev&&prev.exp!==was)prev.rem9=[]}catch(e){}return r}}

// (3) Honest dashboards and first-run guidance.
// Pro dashboard: "profile views · 30d" was a made-up number with a fixed "+12% vs last month". It now counts real views
// (server table, one per visitor per day) with a real 30-day sparkline. Decorative sparklines on the other tiles were
// random squiggles, even on zeros, so they're gone.
function v16Views(m){const pv=(m&&m.pv16)||{},D=864e5,now=Date.now(),day=t=>new Date(t).toISOString().slice(0,10);let a=0,b=0;const pts=[];
 for(let i=29;i>=0;i--){const n=+pv[day(now-i*D)]||0;a+=n;pts.push(n)}for(let i=30;i<60;i++)b+=+pv[day(now-i*D)]||0;
 const trend=a===0?"Share your card to get seen":b===0?"Your first month of views":a===b?"Same as the 30 days before":(a>b?"+":"−")+Math.round(Math.abs(a-b)/b*100)+"% vs the 30 days before";return{a,b,pts,trend}}
function v16Spark(pts){const mx=Math.max(1,...pts);return`<svg class="spark spark16" viewBox="0 0 100 28" aria-hidden="true"><path d="${pts.map((n,i)=>(i?"L":"M")+Math.round(i*100/(pts.length-1))+" "+(25-Math.round(n/mx*20))).join(" ")}" fill="none" stroke="currentColor" stroke-width="2"/></svg>`}
if(typeof VIEWS!=="undefined"&&VIEWS.dash){const od=VIEWS.dash;VIEWS.dash=function(){let h=od.apply(this,arguments);try{const m=me();if(!m)return h;
 if(m.role==="contractor"){const v=v16Views(m);h=h.replace(/<b data-count>[^<]*<\/b><span>profile views · 30d<\/span>(?:<small>[^<]*<\/small>)?<svg class="spark"[\s\S]*?<\/svg>/,()=>`<b data-count>${v.a}</b><span>profile views · 30d</span><small>${esc(v.trend)}</small>${v.a?v16Spark(v.pts):""}`)}
 // homeowner with nothing logged yet: "9 maintenance tasks due" read like an alarm on day one
 if(m.role==="customer"&&typeof h12Jobs==="function"&&typeof h12Data==="function"){const d=h12Data(m)||{};const fresh=!h12Jobs(m).length&&!Object.keys(d.tasks||{}).length&&!(typeof h12Warranties==="function"&&h12Warranties(m).length);
  if(fresh)h=h.replace(/(<a class="card h12-teaser"[^>]*>[\s\S]*?<b>Your home log<\/b>)<small>[\s\S]*?<\/small>/,(x,a)=>a+`<small>Jobs, warranties and seasonal upkeep in one place · <em class="h16-ok">Set up your maintenance plan</em></small>`)}
 // project manager with no projects: say how a crew comes together, next to the empty card
 if(m.role==="pm"&&!(DB.projects||[]).some(p=>p.pm===m.id))h=h.replace(/(<div class="upmgrid">[\s\S]*?<b>No projects yet<\/b>[\s\S]*?<\/div>)(<\/div>)/,(x,a,b)=>a+`<div class="pm16-guide"><b>How a crew comes together</b><ol><li><span>1</span><div><b>Post the project</b><small>Dates, location and how many of each trade, like 2 plumbers and 1 electrician for a pool build.</small></div></li><li><span>2</span><div><b>Fill each slot</b><small>Sawyer suggests licensed, insured pros who are free those dates. Invite them or book the whole crew.</small></div></li><li><span>3</span><div><b>Run it from one board</b><small>Crew chat, dates on a timeline, and milestone payments (test mode).</small></div></li></ol><a class="btn sm" href="${href("find")}">Browse pros by trade</a></div>`+b)
 }catch(e){}return h}}
if(typeof AFTER!=="undefined"&&typeof document!=="undefined"&&typeof fetch==="function"){const seen16={};const op=AFTER.pro;AFTER.pro=function(id){const r=op&&op.apply(this,arguments);
 try{const u=U(id),m=me();if(u&&u.role==="contractor"&&!(m&&m.id===u.id)&&!seen16[id]){seen16[id]=1;fetch("/api/pview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pid:id}),credentials:"same-origin"}).then(r=>r.text()).catch(()=>{})}}catch(e){}return r}}
