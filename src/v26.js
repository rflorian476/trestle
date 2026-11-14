/* ===== v26 ===== */
/* (1) Quote check on /prices. Anyone with a quote in hand (from Sawyer or anywhere else) picks the job, when they need
   it and the price they were quoted, and sees where it lands against Sawyer's typical range for their area: the same
   sub-trade bases as the public job pages (V25SUB), the same trade-wide estimate as the price guide, the same urgency
   and regional cost index, and the same conservative bands as the fair-price check on bids (v14Fair). It runs on the
   page only: the price is never saved, sent or put in the URL. Public job pages link here with the job pre-picked. */
const V26URG=[["flexible","Flexible (2+ weeks)"],["soon","This week"],["urgent","Within 48 hours"],["emergency","Emergency / after hours"]];
let V26Q={k:"",u:"",a:""};
function v26Trades(){return (typeof P11SHOW!=="undefined"?P11SHOW:[]).filter(t=>typeof EST_BASE!=="undefined"&&EST_BASE[t])}
function v26Subs(t){return ((typeof CATS!=="undefined"&&CATS[t])||[]).filter(s=>typeof V25SUB!=="undefined"&&V25SUB[s])}
// a job key is a sub-trade with its own base ("Water heaters") or a trade ("Plumbing", for any other job in it)
function v26Key(k){k=String(k||"");if(typeof V25SUB!=="undefined"&&V25SUB[k]&&v26Trades().some(t=>v26Subs(t).includes(k)))return k;if(v26Trades().includes(k))return k;return "Water heaters"}
function v26QcKey(j){if(!j)return "";const s=j.sub&&typeof V25SUB!=="undefined"&&V25SUB[j.sub]?j.sub:"";return s&&v26Key(s)===s?s:(v26Trades().includes(j.cat)?j.cat:"")}
function v26TradeOf(k){if(v26Trades().includes(k))return k;return v26Trades().find(t=>v26Subs(t).includes(k))||"Plumbing"}
function v26Range(k,urg,zip){k=v26Key(k);const ur=(EST_URG[urg]||EST_URG.soon)[0],st=ZIPS[zip]?ZIPS[zip][0].slice(-2):"",rg=EST_REGION[st]||1;
 if(V25SUB[k]&&!v26Trades().includes(k)){const b=V25SUB[k],rd=n=>n<1000?Math.round(n/10)*10:Math.round(n/50)*50;return{low:rd(b[0]*ur*rg),high:rd(b[1]*ur*rg),what:k.replace(/\b[A-Z][a-z]+/g,w=>w.toLowerCase())}}
 const r=estimateRange({cat:k,size:"medium",urg:EST_URG[urg]?urg:"soon",zip});return{low:r.low,high:r.high,what:"a typical "+(/^[A-Z]{2,}$/.test(k)?k:k.toLowerCase())+" job"}}
function v26Amt(s){s=String(s||"").replace(/[\s$,]/g,"");const k=/k$/i.test(s);const n=Number(s.replace(/k$/i,""));return n>0&&isFinite(n)?Math.round(n*(k?1000:1)):0}
const V26ASK={ok:["Is it written and itemized (labor, materials, permit)?","Who pulls the permit, and is cleanup and haul-away included?","Is the pro licensed and insured for this work, and when do those expire?"],
 hi:["What's in it that a standard job wouldn't have (brand, size, extra work)?","Can they split labor and materials so you can compare line by line?","A second or third quote is the easiest check. Sawyer gets you up to 3, free."],
 lo:["Are materials, permits and disposal in the price?","How much is due before work starts? Avoid paying most of it up front.","Is the pro licensed and insured? Very low bids sometimes skip both."]};
function v26Out(k,urg,amt,zip){const r=v26Range(k,urg,zip),town=townOf(zip),a=v26Amt(amt),f=a?v14Fair(a,r):null;
 const head=`<p class="v26q-r"><small>Typical for ${esc(r.what)} near ${esc(town)}${urg&&urg!=="soon"?" · "+esc((EST_URG[urg]||EST_URG.soon)[1].toLowerCase()):""}</small><b>${money(r.low)} – ${money(r.high)}</b></p>`;
 if(!f)return head+`<p class="v26q-hint">${I("info",14)}<span>Enter the price you were quoted to see where it lands.</span></p>`;
 const max=Math.max(r.high*2.3,a*1.08),pc=n=>Math.max(0,Math.min(100,n/max*100)).toFixed(1);
 const asks=V26ASK[f.k==="hi2"?"hi":f.k]||V26ASK.ok,t=v26TradeOf(v26Key(k)),sub=v26Key(k)!==t?v26Key(k):"";
 return head+`<div class="v26q-m" aria-hidden="true"><i style="left:${pc(r.low)}%;width:${(pc(r.high)-pc(r.low)).toFixed(1)}%"></i><em class="v26q-${f.k}" style="left:${pc(a)}%"></em></div>
  <p class="v26q-v"><span class="v26q-c v26q-${f.k}">${I(f.k==="ok"?"check":"info",13)}${esc(f.t)}</span><span>Your quote: <b>${money(a)}</b>. ${esc(f.tip)}</span></p>
  <h3 class="v26q-h3">Ask before you hire</h3><ul class="v26q-l">${asks.map(x=>`<li>${I("check",14)}<span>${esc(x)}</span></li>`).join("")}</ul>
  <div class="v26q-a"><a class="btn primary" href="${href("post",null,Object.assign({cat:t},sub?{sub}:{}))}">Get up to 3 quotes, free</a><small>Pros on Sawyer pay no lead fees, so nobody pays to reach you and your number stays private.</small></div>`}
function v26Card(q,zip){const k=v26Key(V26Q.k||q.qc),u=EST_URG[V26Q.u||q.qu]?(V26Q.u||q.qu):"soon",a=V26Q.a||"";
 const opts=v26Trades().map(t=>`<optgroup label="${esc(t)}">${v26Subs(t).map(s=>`<option value="${esc(s)}" ${s===k?"selected":""}>${esc(s)}</option>`).join("")}<option value="${esc(t)}" ${t===k?"selected":""}>${v26Subs(t).length?"Other "+esc(/^[A-Z]{2,}$/.test(t)?t:t.toLowerCase())+" job":esc(t)+" (typical job)"}</option></optgroup>`).join("");
 return`<section class="card v26q" id="qc" aria-labelledby="v26q-t"><div class="v26q-in"><div class="v26q-hd"><span class="v24k">${I("dollar",14)}Quote check</span><h2 id="v26q-t">Got a quote? See if it's fair.</h2><p class="muted">From a pro on Sawyer or anyone else. Pick the job and enter the price to see where it lands against what this work usually costs near you.</p></div>
 <form class="v26q-f" id="v26qF" novalidate><div class="fld"><label for="v26qj">Job</label><select id="v26qj" name="job">${opts}</select></div>
 <div class="fld"><label for="v26qu">When</label><select id="v26qu" name="when">${V26URG.map(([v,l])=>`<option value="${v}" ${v===u?"selected":""}>${l}</option>`).join("")}</select></div>
 <div class="fld"><label for="v26qa">Quoted price</label><div class="v26q-amt"><span aria-hidden="true">$</span><input id="v26qa" name="amount" inputmode="decimal" autocomplete="off" maxlength="12" placeholder="1,850" value="${esc(a)}"></div></div></form>
 <div class="v26q-o" id="v26qO" aria-live="polite">${v26Out(k,u,a,zip)}</div>
 <p class="v26q-p">${I("lock",13)}<span>Checked on this page. Sawyer doesn't save or send the price you type.</span></p></div></section>`}
{const op=VIEWS.prices;VIEWS.prices=function(p,q){let h=op.apply(this,arguments);try{q=q||{};const m=me();const zip=ZIPS[q.zip]?q.zip:(m&&ZIPS[m.zip]?m.zip:"78704");
  const at=h.indexOf('<div class="p11-g">');if(at<0)return h;return h.slice(0,at)+v26Card(q,zip)+h.slice(at)}catch(e){return h}}}
{const oa=AFTER.prices;AFTER.prices=function(p,q){if(oa)oa.apply(this,arguments);q=q||{};const F=document.getElementById("v26qF"),O=document.getElementById("v26qO");if(!F||!O)return;
  const j=document.getElementById("v26qj"),u=document.getElementById("v26qu"),a=document.getElementById("v26qa"),z=document.getElementById("p11z");
  const upd=()=>{V26Q={k:j.value,u:u.value,a:a.value};O.innerHTML=v26Out(j.value,u.value,a.value,z&&ZIPS[z.value]?z.value:"78704")};
  j.onchange=upd;u.onchange=upd;a.oninput=upd;F.onsubmit=e=>{e.preventDefault();upd()};
  if(z)z.onchange=()=>{V26Q={k:j.value,u:u.value,a:a.value};go("prices",null,{zip:z.value,cat:q.cat||"",qc:q.qc?j.value:""})};
  // arriving from a job page: bring the check into view once the page has settled (the router scrolls to the top after render)
  if(q.qc&&!V26Q.a){let moved=false;const mv=()=>{moved=true};["wheel","touchstart","keydown","mousedown"].forEach(e=>addEventListener(e,mv,{once:true,passive:true}));
   const go26=()=>{const c=document.getElementById("qc");if(!c||moved||document.activeElement===a)return;c.scrollIntoView({block:"start",behavior:"instant"})};
   // once after the router's scroll-to-top, once more after fonts and photos settle (unless the visitor has scrolled, tapped or started typing)
   setTimeout(go26,120);setTimeout(go26,700)}}}
