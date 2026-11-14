/* ===== v28 ===== */
/* (1) SW-061: a quote started from an Office estimate keeps the cents. The price field gets the exact estimate total
   (2 decimals, the same billCalc total The Office shows), the picker label shows cents, and the note's line items, tax
   and total add up to that price. */
function v28$(n){n=Math.round(Number(n||0)*100)/100;const c=Math.abs(n%1)>0.0001;return"$"+n.toLocaleString("en-US",{minimumFractionDigits:c?2:0,maximumFractionDigits:2})}
v27EstNote=function(b){const on=b.lines.filter(l=>!l.opt||l.on),opt=b.lines.filter(l=>l.opt&&!l.on),c=billCalc(b);
 let t="From estimate "+b.no+": "+on.map(l=>(+l.q!==1?l.q+" × ":"")+l.d+" ("+v28$(l.q*l.r)+")").join("; ")+".";if(opt.length)t+=" Optional add-ons (not in the price): "+opt.map(l=>l.d+" ("+v28$(l.q*l.r)+")").join("; ")+".";
 if(b.tax)t+=" Subtotal "+v28$(c.sub)+" + "+b.tax+"% tax ("+v28$(c.tax)+") = "+v28$(c.total)+".";else t+=" Total "+v28$(c.total)+".";return t.length>1000?t.slice(0,997)+"…":t};
v27EstPick=function(m){const es=v27Ests(m);if(!es.length)return "";
 return`<div class="fld v27e"><label for="v27es">Start from an Office estimate (optional)</label><select id="v27es" name="est"><option value="">Don't use an estimate</option>${es.map(b=>`<option value="${esc(b.id)}">${esc(b.no)} · ${esc(b.title||"Estimate")} · ${v28$(billCalc(b).total)}</option>`).join("")}</select><small class="muted">Fills in the price and line items. You can still edit them.</small></div>`};
v27EstBind=function(f,pid,nid){const s=f&&f.querySelector("#v27es");if(!s)return;s.onchange=()=>{const b=(DB.bills||[]).find(x=>x.id===s.value);if(!b)return;const p=document.getElementById(pid),n=document.getElementById(nid);
 if(p)p.value=(Math.round(billCalc(b).total*100)/100).toFixed(2);if(n)n.value=v27EstNote(b)}};
// a quote with cents reads with cents on the pipeline card ("You quoted $308.51")
{const op=v27Pipe;v27Pipe=function(j,m){const h=op.apply(this,arguments);try{const q=m&&v27Mine(j,m);if(q&&q.price%1)return h.replace("You quoted "+money(q.price),"You quoted "+v28$(q.price))}catch(e){}return h}}

/* (2) SW-062: one tap, one quote, one toast. The quote sheet (#v27qs) and the job-page quote modal (#qf) ignore a second
   submit while the first is being sent: the send button is disabled on the first submit and stays disabled once the quote
   is sent; it comes back only if the quote was refused (so the pro can fix the price and try again). */
function v28Guard(f){if(!f||f.__v28g)return;const h=f.onsubmit;if(typeof h!=="function")return;f.__v28g=1;
 f.onsubmit=function(e){if(e&&e.preventDefault)e.preventDefault();if(f.__busy)return false;f.__busy=1;const bs=[...f.querySelectorAll('button:not([type="button"])')];bs.forEach(b=>{b.disabled=true;b.setAttribute("aria-busy","true")});
  const oq=A.quote;let sent=false;A.quote=function(){const r=oq.apply(this,arguments);sent=!!(r&&r.ok);return r};
  try{return h.call(this,e)}finally{A.quote=oq;if(!sent){f.__busy=0;bs.forEach(b=>{b.disabled=false;b.removeAttribute("aria-busy")})}}}}
{const oq=v27QuickQuote;v27QuickQuote=function(){const r=oq.apply(this,arguments);try{v28Guard(document.getElementById("v27qf"))}catch(e){}return r}}
{const oq=quoteModal;quoteModal=function(){const r=oq.apply(this,arguments);try{v28Guard(document.getElementById("qf"))}catch(e){}return r}}
