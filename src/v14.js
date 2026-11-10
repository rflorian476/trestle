/* v14: (1) fair-price check on quotes and bid comparison, (2) a traveler-first dashboard for traveling-trade accounts. */
// (1) Fair-price check: each quote is read against Sawyer's typical range for that job (the range the request wizard
// stored, or the same rules-based estimate the price guide uses). Owners see where every bid lands; pros see the range
// before they quote. Shown only while the job is open, so a finished job is never relabeled after the fact.
// Common jobs whose real installed cost sits far from the trade-wide base range (U.S. average, before the regional
// index). v14 feeds these into estimateRange itself, so the request wizard, the price guide examples, the stored
// est11 range and the quote check all agree.
const V14JOBS=[[["Plumbing"],/tankless/,2500,5200,"tankless water heater"],[["Plumbing"],/water heater/,1200,2600,"water heater replacement"],
 [["Plumbing","Well & Water"],/sump pump/,600,1800,"sump pump"],[["Plumbing"],/repipe/,4000,12000,"whole-house repipe"],[["Plumbing"],/sewer line|main line/,3000,9000,"sewer line work"],
 [["Electrical"],/panel|\b200 ?a(mp)?\b|service upgrade/,1800,4500,"panel upgrade"],[["Electrical"],/ev charger|car charger/,800,2200,"EV charger install"],[["Electrical"],/generator/,4000,12000,"standby generator"],
 [["HVAC"],/mini[- ]?split/,3000,8000,"mini-split install"],[["HVAC"],/\b(replace|replacement|new)\b.*\b(furnace|ac|a\/c|system|heat pump)\b|\b(furnace|ac|heat pump) (replacement|install)/,5500,13000,"system replacement"],
 [["Roofing"],/roof (replace|replacement)|full roof|re-?roof/,8000,20000,"roof replacement"],[["Remodeling"],/kitchen remodel/,20000,60000,"kitchen remodel"],[["Remodeling"],/bath(room)? remodel/,9000,28000,"bathroom remodel"],
 [["Decks & Docks"],/dock (removal|take ?out)|dock (in|out)\b/,250,900,"seasonal dock in/out"],[["Fencing"],/new fence|fence (install|replace)/,1800,6000,"fence install"]];
if(typeof estimateRange==="function"){const oe=estimateRange;estimateRange=function(o){const r=oe(o);try{o=o||{};const d=String(o.desc||"").toLowerCase();const hit=V14JOBS.find(([cats,re])=>cats.includes(r.cat)&&re.test(d));if(!hit)return r;
 const ur=EST_URG[o.urg]||EST_URG.soon,st=ZIPS[o.zip]?ZIPS[o.zip][0].slice(-2):"",rg=EST_REGION[st]||1,m=ur[0]*rg,rd=n=>n<1000?Math.round(n/10)*10:Math.round(n/50)*50;
 return{cat:r.cat,low:rd(hit[2]*m),high:rd(hit[3]*m),mult:Math.round(m*100)/100,job:hit[4],factors:[{k:"Typical installed cost: "+hit[4],v:money(hit[2])+"–"+money(hit[3])},{k:"Urgency: "+ur[1],x:ur[0]},{k:"Regional cost index"+(st?" ("+st+")":""),x:rg}]}}catch(e){return r}}}
function v14Range(j){if(!j)return null;
 try{const r=estimateRange({cat:j.cat,size:j.size11||"medium",urg:j.urgent?"urgent":"soon",zip:j.zip,desc:(j.title||"")+" "+(j.desc||"")});return r&&r.low>0&&r.high>=r.low?{low:r.low,high:r.high}:null}catch(x){return null}}
// Conservative bands: a bid has to be clearly outside the range before it's called out, so honest pros aren't penalized
// for scope the estimate can't see.
function v14Fair(price,rg){if(!rg||!(price>0))return null;
 if(price>rg.high*2)return{k:"hi2",t:"Well above typical",tip:"Ask what's included before you hire. It may cover extra work."};
 if(price>rg.high*1.25)return{k:"hi",t:"Above typical",tip:"Over the usual range for this job. Ask what's included."};
 if(price<rg.low*0.5)return{k:"lo",t:"Well below typical",tip:"Confirm the scope, materials and permits are included."};
 return{k:"ok",t:"In typical range",tip:"Close to what this job usually costs nearby."}}
const v14Chip=f=>f?`<span class="fp14 fp14-${f.k}" title="${esc(f.tip)}">${I(f.k==="ok"?"check":"info",12)}${esc(f.t)}</span>`:"";
const v14Num=s=>+String(s).replace(/[^0-9.]/g,"");
const v14Band=(j,rg,who)=>`<div class="fp14-band" role="note">${I("dollar",16)}<span><b>Typical for this job near ${esc(townOf(j.zip||"78704"))}: ${money(rg.low)} – ${money(rg.high)}</b><small>${who==="pro"?"Based on what similar jobs cost nearby. Customers see where each quote lands.":"Based on what similar jobs cost nearby. Each quote is marked against it. It's a guide, not a quote."}</small></span></div>`;
{const oj=VIEWS.job;VIEWS.job=function(id,q){let h=oj.apply(this,arguments);try{const j=(DB.jobs||[]).find(x=>x.id===id),m=me();
  if(!j||!m||j.status!=="posted")return h;const owner=m.id===j.cust,pro=m.role==="contractor";if(!owner&&!pro)return h;const rg=v14Range(j);if(!rg)return h;
  h=h.replace(/<b class="qprice">([^<]*)<\/b>/g,(x,p)=>x+v14Chip(v14Fair(v14Num(p),rg)));
  const k=h.search(/<h2 class="h-sub">Quotes \(/);if(k>=0)h=h.slice(0,k)+v14Band(j,rg,owner?"owner":"pro")+h.slice(k);
  else if(pro&&h.includes('id="doQuote"'))h=h.replace(/(<div class="actions"><button class="btn primary" id="doQuote")/,v14Band(j,rg,"pro")+"$1");
 }catch(e){}return h}}
{const oc=VIEWS.compare;VIEWS.compare=function(jid){let h=oc.apply(this,arguments);try{const j=(DB.jobs||[]).find(x=>x.id===jid),m=me();
  if(!j||!m||m.id!==j.cust||j.status!=="posted")return h;const rg=v14Range(j);if(!rg||!h.includes('class="cmp-price"'))return h;
  h=h.replace(/(<b class="cmp-price">([^<]*)<\/b>)/g,(x,a,p)=>a+v14Chip(v14Fair(v14Num(p),rg)));
  h=h.replace('<div class="wrap"><div class="cmp"','<div class="wrap">'+v14Band(j,rg,"owner")+'<div class="cmp"');
 }catch(e){}return h}}

// (2) Traveler-first dashboard: a traveling-trade account opens on its work (matching calls, applications, invites,
// references) instead of the homeowner shell. Home tools stay below, under "Your home".
function v14TravStats(m){const t=m.trav||{},calls=(DB.tcalls||[]).filter(c=>c.status==="open"||!c.status);
 const st=new Set(t.states||[]),any=st.has("ANY");
 const mine=c=>(c.apps||[]).find(a=>a.uid===m.id&&a.status!=="withdrawn");
 const match=calls.filter(c=>c.trade===t.trade&&(any||!st.size||st.has(c.state))&&!mine(c)&&c.by!==m.id);
 const apps=(DB.tcalls||[]).map(c=>({c,a:mine(c)})).filter(x=>x.a);
 const inv=calls.filter(c=>(c.invites||[]).includes(m.id)&&!mine(c));
 const refs=(DB.refs||[]).filter(r=>r&&r.trav===m.id&&r.status==="given");
 const wk=c=>{try{return tWeekly(c)}catch(e){return 0}};
 match.sort((a,b)=>(inv.includes(b)-inv.includes(a))||(wk(b)-wk(a)));
 return{t,match,apps,inv,refs,active:apps.filter(x=>x.a.status==="pending"||x.a.status==="short").length,hired:apps.filter(x=>x.a.status==="hired").length,wk}}
function v14TravBlock(m){const s=v14TravStats(m),t=s.t;
 const tile=(n,l,ic,to)=>`<a class="tv14-t" href="${to}"><span class="tv14-ti">${I(ic,16)}</span><b>${n}</b><small>${l}</small></a>`;
 const row=c=>`<li><a href="${href("tcall",c.id)}"><span class="tv14-c"><b>${esc(c.title)}</b><small>${esc(c.loc||"")}${c.state?", "+esc(c.state):""} · ${esc(c.lic||"")}${c.weeks?" · "+c.weeks+" wks":""}</small></span><span class="tv14-p"><b>${tMoney(+c.rate||0)}/hr</b><small>${c.perDiem?"+$"+esc(c.perDiem)+"/day per diem":"No per diem"}</small></span>${s.inv.includes(c)?`<em class="tv14-inv">Invited</em>`:""}</a></li>`;
 const list=s.match.slice(0,3);
 return`<section class="tv14 wrap" aria-labelledby="tv14h"><div class="tv14-hd"><h2 id="tv14h">Your travel work</h2><a href="${href("tdash",null,{view:"me"})}">Traveler dashboard ${I("chev",14)}</a></div>
 <div class="tv14-tiles">${tile(s.match.length,s.match.length===1?"open call fits your trade and states":"open calls fit your trade and states","zap",href("travel"))}${tile(s.active,"active applications","send",href("tdash",null,{view:"me"}))}${tile(s.inv.length,s.inv.length===1?"invite from a contractor":"invites from contractors","bell",href("tdash",null,{view:"me"}))}${tile(s.refs.length,s.refs.length===1?"reference from a foreman":"references from foremen","award",href("traveler",m.id))}</div>
 <div class="tv14-grid"><div class="tv14-m card"><h3>Best matches for you</h3>${list.length?`<ul class="tv14-l">${list.map(row).join("")}</ul>`:`<p class="muted small">No open ${esc((t.trade||"").toLowerCase())} calls in your states right now. Add more states to your profile or set an alert.</p>`}<a class="btn primary" href="${href("travel")}">${I("search",16)}See all calls</a></div>
 <div class="tv14-q card"><h3>Your status</h3><p class="tv14-av">${t.availNow?`<span class="badge b-now"><i class="pulse"></i>Available now</span>`:t.availDate?`<span class="badge">${I("clock",12)}Available from ${esc(fmtD(t.availDate))}</span>`:`<span class="badge">Availability not set</span>`}</p><p class="small muted">${esc(t.trade||"")}${t.yrs?" · "+t.yrs+" yrs":""}${(t.lic||[]).length?" · "+esc(t.lic.map(l=>l.type+(l.state?" "+l.state:"")).join(", ")):""}</p>
 <nav class="tv14-links" aria-label="Travel tools"><a href="${href("traveler",m.id)}">${I("user",15)}My traveler profile</a><a href="${href("lodging")}">${I("home",15)}Lodging board</a><a href="${href("perdiem")}">${I("calc",15)}Per diem guide</a></nav></div></div></section>`}
const v14IsTrav=m=>!!(m&&m.trav&&m.role!=="contractor"&&m.role!=="pm");
{const od=VIEWS.dash;VIEWS.dash=function(){let h=od.apply(this,arguments);try{const m=me();if(!v14IsTrav(m))return h;
  const t=m.trav||{};
  h=h.replace(/(<span class="uh-k">[\s\S]*?<\/svg>) Homeowner<\/span><h1>[^<]*<\/h1><p class="uh-s">[^<]*<\/p>/,(x,a)=>`${a.replace(/<svg[\s\S]*<\/svg>/,I("truck",14))} Traveler</span><h1>Your travel work</h1><p class="uh-s">${esc(t.headline||t.trade||"Traveling trades")}${t.home?" · home base "+esc(t.home):""}</p>`);
  h=h.replace(/(<div class="uh-r">)<a class="btn primary lg" href="[^"]*">[\s\S]*?<\/a><a class="btn glass" href="[^"]*">[\s\S]*?<\/a>/,(x,a)=>`${a}<a class="btn primary lg" href="${href("travel")}">${I("search",16)}Find calls</a><a class="btn glass" href="${href("post")}">${I("plus",16)}Post a home job</a>`);
  const k=h.indexOf("</header>");if(k<0)return h;
  return h.slice(0,k+9)+v14TravBlock(m)+`<div class="wrap tv14-home"><h2>Your home</h2></div>`+h.slice(k+9);
 }catch(e){}return h}}
