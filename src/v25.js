/* ===== v25 ===== */
/* (1) Public job pages: the posted budget sits next to the price guide, and the guide is the sub-trade's own range
   when Sawyer has one (a water-heater swap, not "any plumbing job"). Sub-trade bases are typical U.S. ranges for one
   standard job of that kind; they get the same urgency and regional cost index as the trade-wide guide. Without a
   sub-trade base the trade-wide guide stays. Public job facts only (trade, sub-trade, ZIP, urgency, posted budget). */
const V25SUB={"Water heaters":[1100,2300],"Tankless water heaters":[2600,5200],"Sewer line repair":[1500,5500],"Drain cleaning":[150,450],"Septic systems":[600,3000],"Well pumps":[900,2500],"Sump pumps":[500,1300],"Leak detection":[150,500],"Repiping":[4000,12000],"Fixture install":[200,650],"Gas lines":[300,1200],"Water softeners & filtration":[900,2800],"Frozen pipe thaw":[150,500],
 "Panel upgrades":[1600,4000],"EV charger install":[800,2000],"Generator install":[6000,14000],"Lighting":[200,900],"Outlets & switches":[120,400],"Ceiling fans":[150,450],
 "Furnace repair":[150,650],"Furnace install":[3500,7500],"AC repair":[150,700],"AC install":[4000,8500],"Heat pumps":[5000,11000],"Mini-splits":[2500,6000],"Duct cleaning":[300,700],"Thermostats":[120,400],
 "Shingle roofs":[8000,16000],"Metal roofs":[14000,30000],"Roof repair":[350,1500],"Ice dam removal":[400,1200],"Gutters":[1000,2600],"Gutter guards":[900,2400],
 "Kitchen remodel":[18000,55000],"Bathroom remodel":[9000,25000],"Basement finishing":[20000,50000],
 "Interior painting":[400,1200],"Exterior painting":[3000,7500],"Cabinet painting":[3000,6500],
 "Hardwood install":[4500,9500],"Hardwood refinishing":[1500,3500],"LVP / vinyl":[2000,5500],"Tile":[1500,4500],"Carpet":[1500,4000],
 "Tree removal":[600,1800],"Tree trimming":[300,900],"Stump grinding":[150,450],"Sod & seeding":[1000,3500],
 "Driveway plowing":[45,120],"Roof snow removal":[300,800],
 "Deck building":[8000,20000],"Deck repair":[600,2500],"Dock install/removal":[300,900],"Boat lifts":[3500,9000],
 "Wood fence":[3000,6500],"Vinyl fence":[4000,8000],"Chain link":[1800,4000],
 "House cleaning":[120,300],"Deep cleaning":[250,550],"Move-out cleaning":[250,600],"Rental turnover":[100,250],"Gutter cleaning":[150,350],
 "TV mounting":[100,300],"Drywall patches":[150,450],"Furniture assembly":[90,250],
 "Rodents":[250,650],"Bed bugs":[1000,2500],"Bats":[400,1500],"Wildlife removal":[250,700],
 "Junk removal":[200,600],"Local moving":[700,2200],"Window replacement":[600,1400],"Home inspection":[350,600],"Radon testing":[150,300]};
function v25Guide(j){if(!j||typeof estimateRange!=="function")return null;const b=j.sub&&V25SUB[j.sub];
 if(b){const st=typeof ZIPS!=="undefined"&&ZIPS[j.zip]?ZIPS[j.zip][0].slice(-2):"";const rg=(typeof EST_REGION!=="undefined"&&EST_REGION[st])||1;const ur=(EST_URG[j.urgent?"urgent":"soon"]||[1])[0];
  const rd=n=>n<1000?Math.round(n/10)*10:Math.round(n/50)*50;return{low:rd(b[0]*ur*rg),high:rd(b[1]*ur*rg),sub:j.sub}}
 const r=typeof v14Range==="function"?v14Range(j):null;return r?{low:r.low,high:r.high,sub:null}:null}
// "$1,000–1,800" -> [1000,1800]; "Around $500" -> [500,500]; per-unit, TBD or blank budgets don't compare.
function v25Budget(s){s=String(s||"").trim();if(!/\d/.test(s)||/\bper\b|\/\s*(hr|hour|day|wk|week|mo|month|turn)\b/i.test(s))return null;
 const n=(s.match(/\d[\d,]*(?:\.\d+)?\s*k?/gi)||[]).map(x=>{const k=/k$/i.test(x.trim());return Number(x.replace(/[,k\s]/gi,""))*(k?1000:1)}).filter(x=>x>0);if(!n.length)return null;
 return[Math.min(...n.slice(0,2)),Math.max(...n.slice(0,2))]}
function v25Band(j,town){const g=v25Guide(j);if(!g)return "";const what=g.sub?String(g.sub).replace(/\b[A-Z][a-z]+/g,w=>w.toLowerCase()):"this kind of job";
 const bs=String(j.budget||"").trim(),b=v25Budget(bs);
 const note=!b?"":b[1]<g.low?"The posted budget is under the usual range, so quotes may come in higher.":b[0]>g.high?"The posted budget is above the usual range.":"The posted budget is within the usual range.";
 return `<div class="v25b">${b?`<p class="v25bi"><small>Posted budget</small><b>${esc(bs)}</b></p>`:""}<p class="v25bi"><small>Typical for ${esc(what)} near ${esc(town||"you")}</small><b>${money(g.low)} – ${money(g.high)}</b></p></div>
  <p class="v25n">${note?esc(note)+" ":""}A guide, not a quote.</p>`}
