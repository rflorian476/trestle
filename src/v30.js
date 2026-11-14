/* ===== v30 ===== */
/* (1) Pro dashboard: a compact "Sawyer vs pay-per-lead" card. It reuses the same savings() math and COMPETE rows as the
   /pros and /pricing calculator and comparison table, carries the same "checked November 2026" hedge, and names no
   exact competitor prices. Its sliders have their own ids so they never clash with the /pros calculator. */
function v30CmpNote(){try{const m=compareTable().match(/<p class="[^"]*v28cmp-n[^"]*">([\s\S]*?)<\/p>/);if(m)return m[1]}catch(e){}return "From each company's public pages, checked November 2026. Lead prices and fees vary by trade, area and plan, and they change, so check each company's site for current details. Trademarks belong to their owners; Sawyer isn't affiliated with them."}
function v30CmpOut(l,c){const s=savings(l,c);return`<div><span>Pay-per-lead, at these numbers</span><b class="bad">${money(s.lead)}/yr</b></div><div><span>Sawyer, first year</span><b>${money(s.ours)}/yr</b></div><div class="win"><span>You'd keep</span><b>${money(Math.max(0,s.saved))}</b></div>`}
function v30CmpCard(){const rows=(typeof COMPETE!=="undefined"?COMPETE:[]).map((r,i)=>`<li class="${i?"":"us"}"><b>${esc(r[0])}</b><span>${esc(r[1])}</span><span>${esc(r[2])}</span></li>`).join("");
 return`<div class="ucard v30cmp" id="v30cmp"><h3>${I("calc",16)} Sawyer vs pay-per-lead</h3><p class="muted small v30cmp-s">What the same leads would cost on a pay-per-lead site. You pay $0 per lead here.</p>
 <div class="fld"><label for="v30cl">Leads a month: <b id="v30clv">8</b></label><input id="v30cl" type="range" min="1" max="40" value="8"></div>
 <div class="fld"><label for="v30cc">Cost per lead: <b id="v30ccv">$45</b></label><input id="v30cc" type="range" min="10" max="150" step="5" value="45"></div>
 <div class="v30cmp-o" id="v30out" aria-live="polite">${v30CmpOut(8,45)}</div>
 <p class="muted small v30cmp-n" id="v30cmpN">Starts at an example of 8 leads a month at $45 a lead, checked November 2026. Lead prices vary a lot by trade, area and site, so set the sliders to what you actually pay.</p>
 <details class="v30cmp-d"><summary>How Sawyer compares</summary><ul class="v30cmp-l">${rows}</ul><p class="muted small v30cmp-f">${v30CmpNote()}</p></details>
 <a class="v30cmp-a" href="${href("pros")}">Full comparison ${I("chev",14)}</a></div>`}
function v30BindCmp(){const l=document.getElementById("v30cl"),c=document.getElementById("v30cc");if(!l||!c||l.__v30)return;l.__v30=1;
 const u=()=>{document.getElementById("v30clv").textContent=l.value;document.getElementById("v30ccv").textContent="$"+c.value;document.getElementById("v30out").innerHTML=v30CmpOut(+l.value,+c.value)};l.oninput=c.oninput=u}

{const ov=VIEWS.dash;VIEWS.dash=function(){let h=ov.apply(this,arguments);try{const m=me();if(!m||m.staff||(typeof v12Staff==="function"&&v12Staff(m)))return h;
  if(m.role==="contractor"){const before=h;h=h.replace(/(<aside[^>]*>[\s\S]*?)(<div class="ucard)/,(x,a,b)=>a+v30CmpCard()+b);if(h===before)h=h.replace(/(<aside[^>]*>)/,"$1"+v30CmpCard())}
 }catch(e){console.warn(e)}return h}}
{const oa=AFTER.dash;AFTER.dash=function(){const r=oa&&oa.apply(this,arguments);try{v30BindCmp()}catch(e){}return r}}

