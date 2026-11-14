/* ===== v29 ===== */
/* (1) SW-063 is fixed in place: every quote amount (job-page "You quoted" callout, the homeowner's "sent a quote" bell,
   quote list, Compare bids, "Hire for", pipeline card, CRM card, Earned/Booked/Invoices, quote check) goes through v28$,
   so $308.51 reads $308.51 and whole dollars still read $309. */

/* (3) The /pros (and /pricing) savings calculator is an example, not a claim: its 8 leads x $45 starting point is dated
   and hedged like the comparison table, and the result is labeled "at these numbers". No exact competitor prices. */
calcWidget=function(){return`<div class="calc card"><h2 class="h-sub">${I("calc",20)} How much would you save?</h2><div class="two"><div class="fld"><label for="cl">Leads you buy per month: <b id="clv">8</b></label><input id="cl" type="range" min="1" max="40" value="8"></div><div class="fld"><label for="cc">Average cost per lead: <b id="ccv">$45</b></label><input id="cc" type="range" min="10" max="150" step="5" value="45"></div></div><p class="muted small v29calc-n" id="v29calcN">Starts at an example of 8 leads a month at $45 a lead, checked November 2026. Lead prices vary a lot by trade, area and site, so move the sliders to what you actually pay. Sawyer's first year is $20/mo with 3 months free for founding pros.</p><div class="calcout" id="calcOut" aria-live="polite"></div></div>`};
{const fix=()=>{try{const o=document.getElementById("calcOut");const s=o&&o.querySelector("div span");if(s&&s.textContent==="Pay-per-lead sites")s.textContent="Pay-per-lead, at these numbers"}catch(e){}};
 for(const k of ["pros","pricing"]){const oa=AFTER[k];AFTER[k]=function(){const r=oa&&oa.apply(this,arguments);try{fix();const cl=document.getElementById("cl"),cc=document.getElementById("cc");if(cl&&cc&&!cl.__v29){cl.__v29=1;const a=cl.oninput;cl.oninput=cc.oninput=function(){const x=a&&a.apply(this,arguments);fix();return x}}}catch(e){}return r}}}

