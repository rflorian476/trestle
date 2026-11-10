/* v14: (1) fair-price check on quotes and bid comparison. */
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

