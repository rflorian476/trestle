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

/* (2) Renewals on the dashboard: every license, insurance policy, bond, permit or wallet card that expires within 60 days
   (or already has) is listed by name with the days left, expired ones first, so a pro or traveler sees it without opening
   the Office. The bell reminders (60, 30 and 7 days out and on the day) keep working as before. The old one-line
   "N docs need attention" item in "Here's what's next" is dropped when this card shows, so it isn't said twice. */
function v30DocName(d){const k=((d.scope==="biz"?BIZ_KINDS:WALLET_KINDS).find(k=>k[0]===d.kind)||[,""])[1];if(d.scope!=="biz"&&k)return d.name&&d.name!==k?k+" · "+d.name:k;return d.name||k||"Document"}
function v30Renew(m){if(!m)return[];return (DB.bdocs||[]).filter(d=>d&&d.by===m.id&&d.exp&&(d.scope==="biz"?v7Pro(m):true)).map(d=>({d,left:v7DaysTo(d.exp)})).filter(x=>x.left<=60).sort((a,b)=>a.left-b.left)}
function v30RenewCard(m){const all=v30Renew(m);if(!all.length)return"";const ex=all.filter(x=>x.left<0).length,pro=v7Pro(m);
 const li=all.slice(0,4).map(({d,left})=>{const bad=left<0,soon=left>=0&&left<=7;const when=bad?`Expired ${fmtD(d.exp)}`:left===0?`Expires today`:`Expires in ${left} day${left===1?"":"s"} · ${fmtD(d.exp)}`;
  const link=d.scope==="biz"?href("office","compliance"):href("wallet");return`<li class="v30rn-${bad?"bad":soon?"soon":"warn"}"><a href="${link}"><span class="v30rn-i">${I("shield",16)}</span><span class="v30rn-t"><b>${esc(v30DocName(d))}</b><small>${esc(when)}</small></span><span class="v30rn-c">${bad?"Upload renewal":"Renew"}${I("chev",14)}</span></a></li>`}).join("");
 const more=all.length>4?`<a class="v30rn-more" href="${pro?href("office","compliance"):href("wallet")}">+${all.length-4} more</a>`:"";
 return`<section class="o7-wrap v30rn-w"><div class="card v30rn" id="v30renew" aria-labelledby="v30rnh"><div class="v30rn-h"><h2 id="v30rnh">${I("shield",18)} Renewals coming up</h2><span class="muted small">${ex?`${ex} expired · `:""}${all.length} in the next 60 days</span></div><ul class="v30rn-l">${li}</ul>${more}<p class="muted small v30rn-n">GCs and customers check these first. We also remind you in the bell 60, 30 and 7 days out and on the day.</p></div></section>`}
{const on=v8Next;v8Next=function(m){const r=on.apply(this,arguments);try{if(v30Renew(m).length)return r.filter(x=>!/license or insurance doc/.test(x.title))}catch(e){}return r}}

{const ov=VIEWS.dash;VIEWS.dash=function(){let h=ov.apply(this,arguments);try{const m=me();if(!m||m.staff||(typeof v12Staff==="function"&&v12Staff(m)))return h;
  const rn=v30RenewCard(m);if(rn){const i=h.indexOf('<section class="na8"'),j=i<0?-1:h.indexOf("</section>",i);
   if(j>0)h=h.slice(0,j+10)+rn+h.slice(j+10);else{const k=h.indexOf('<div class="v13-dtop">');h=k>=0?h.slice(0,k+22)+rn+h.slice(k+22):rn+h}}
 }catch(e){console.warn(e)}return h}}

/* (3) Project managers see, on each project card on their dashboard, how each trade is filling: "Concrete finishers ·
   1 of 3 filled", so they know exactly which slots are still open without opening the project. */
function v30Roles(p){const rs=(p.roles||[]).map(r=>({label:r.label||r.trade,need:+r.need||0,f:Math.min(+r.need||0,(r.filled||[]).length)})).filter(r=>r.need>0);
 rs.sort((a,b)=>(a.f>=a.need)-(b.f>=b.need));const sh=rs.slice(0,4);
 return`<ul class="v30tr">${sh.map(r=>`<li class="${r.f>=r.need?"done":r.f?"part":"open"}"><span>${esc(r.label)}</span><b>${r.f} of ${r.need} filled</b></li>`).join("")}${rs.length>4?`<li class="more"><span>+${rs.length-4} more trade${rs.length-4===1?"":"s"}</span></li>`:""}</ul>`}

{const ov=VIEWS.dash;VIEWS.dash=function(){let h=ov.apply(this,arguments);try{const m=me();if(!m||m.staff||(typeof v12Staff==="function"&&v12Staff(m)))return h;
  if(m.role==="pm")for(const p of (DB.projects||[]).filter(p=>p.pm===m.id)){const a=h.indexOf('<a class="upm" href="'+href("project",p.id)+'"');if(a<0)continue;const k=h.indexOf('<div class="meter">',a),e=k<0?-1:h.indexOf("</div>",k);if(e<0)continue;h=h.slice(0,e+6)+v30Roles(p)+h.slice(e+6)}
 }catch(e){console.warn(e)}return h}}

/* (4) Year-end records: the tax-year CSV now also lists every invoice issued that year (number, customer, issued, due,
   total, paid, still owed, status), with totals, so the file doubles as a year-end invoice register for a preparer. */
function v30InvYear(m,y){return v7Mine("bills",m).filter(b=>b.type==="inv"&&b.status!=="draft"&&b.status!=="void"&&b.date&&String(new Date(b.date).getFullYear())===y).sort((a,b)=>a.date-b.date)}
{const ot=v9TaxCsv;v9TaxCsv=function(m,y){let s=ot.apply(this,arguments);try{const q=v=>{const x=String(v==null?"":v);return/[",\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x},r=a=>a.map(q).join(","),f=n=>(Math.round(n*100)/100).toFixed(2);
  const inv=v30InvYear(m,String(y));let T=0,P=0,O=0;const rows=inv.map(b=>{const c=billCalc(b);const paid=Math.round((c.total-c.bal)*100)/100;T+=c.total;P+=paid;O+=c.bal;
   return r(["",new Date(b.date).toISOString().slice(0,10),b.no,b.cname,b.due||"",f(c.total),f(paid),f(c.bal),c.bal<=0.004?"Paid":b.due&&v7DaysTo(b.due)<0?"Overdue":"Open"])});
  s+="\n\n"+[r(["INVOICES ISSUED","Issued","Invoice","Customer","Due","Total","Paid","Still owed","Status"]),...rows,r(["TOTAL ("+inv.length+" invoice"+(inv.length===1?"":"s")+")","","","","",f(T),f(P),f(O),""])].join("\n")}catch(e){}return s}}
{const oc=v9TaxCard;v9TaxCard=function(m,y){let h=oc.apply(this,arguments);try{const ys=v9TaxYears(m);const yy=ys.includes(y)?y:ys[0];const n=v30InvYear(m,String(yy)).length;
  h=h.replace("Not tax advice.</p>",`Also lists the ${n} invoice${n===1?"":"s"} you issued in ${esc(String(yy))}, with what's paid and still owed. Not tax advice.</p>`)}catch(e){}return h}}
