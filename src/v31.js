/* v31: Office > Reports gets (1) a month-by-month profit & loss for the picked tax year and (2) "Back up everything":
   one ZIP of plain CSV files (customers, invoices + estimates, invoice lines, payments, expenses, mileage, timesheets,
   licenses & insurance, the P&L) built in the browser from the pro's own records. Nothing is uploaded or sent anywhere.
   Every cell goes through csvCell (formula-safe, SW-066). */
const V31MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const v31r2=n=>Math.round((Number(n)||0)*100)/100,v31f=n=>v31r2(n).toFixed(2);
function v31Year(m,y){const ys=v9TaxYears(m);return ys.includes(String(y))?String(y):ys[0]}
/* Cash basis, same sources and math as the tax-year file: payments by the date they were paid, processor fees,
   expenses and mileage (miles x MILE_RATE) by their date. The 12-month total equals the tax card's net. */
function v31Pl(m,y){y=String(y);const mo=V31MON.map((l,i)=>({l,i,inc:0,fee:0,ex:0,mi:0,n:0}));
 v7Mine("bills",m).filter(b=>b.type==="inv").forEach(b=>(b.payments||[]).forEach(p=>{const d=new Date(p.date);if(String(d.getFullYear())!==y)return;const x=mo[d.getMonth()];x.inc+=p.amt||0;x.fee+=p.fee||0;x.n++}));
 v7Mine("ledger",m).forEach(l=>{if(!l.date||!l.date.startsWith(y))return;const x=mo[(+l.date.slice(5,7)||1)-1];if(!x)return;if(l.kind==="exp"){x.ex+=l.amt||0;x.n++}else{x.mi+=l.miles||0;x.n++}});
 const now=new Date(),last=String(now.getFullYear())===y?now.getMonth():11;
 const first=mo.findIndex(x=>x.n),from=first<0?last:Math.min(first,last);
 /* Months before the first money in or out are left off (a pro who joined in August sees Aug onward). */
 const rows=mo.filter(x=>(x.i>=from&&x.i<=last)||x.n).map(x=>{const mded=v31r2(x.mi*MILE_RATE);return Object.assign(x,{mded,net:v31r2(x.inc-x.fee-x.ex-mded)})});
 const T=rows.reduce((a,x)=>({inc:a.inc+x.inc,fee:a.fee+x.fee,ex:a.ex+x.ex,mi:a.mi+x.mi,mded:a.mded+x.mded}),{inc:0,fee:0,ex:0,mi:0,mded:0});T.net=v31r2(T.inc-T.fee-T.ex-T.mded);
 return{y,rows,T,from}}
function v31PlRows(m,y){const p=v31Pl(m,y);return[["Month","Collected","Processing fees","Expenses","Miles","Mileage deduction","Net"],...p.rows.map(x=>[x.l+" "+p.y,v31f(x.inc),v31f(x.fee),v31f(x.ex),v31f(x.mi),v31f(x.mded),v31f(x.net)]),["Total "+p.y,v31f(p.T.inc),v31f(p.T.fee),v31f(p.T.ex),v31f(p.T.mi),v31f(p.T.mded),v31f(p.T.net)]]}
function v31PlCard(m,y){y=v31Year(m,y);const p=v31Pl(m,y);const mx=Math.max(1,...p.rows.map(x=>Math.abs(x.net)));const best=p.rows.reduce((a,x)=>!a||x.net>a.net?x:a,null);
 return`<div class="card v31pl" id="v31pl"><div class="o7-sh"><h2>${I("chart",18)} Profit &amp; loss, month by month · ${esc(y)}</h2><span class="muted small">Cash basis: money in when it was paid, costs on their date.</span></div>
 <div class="o7-tw"><table class="o7t v31pl-t"><caption class="sr-only">Profit and loss by month, ${esc(y)}</caption><thead><tr><th scope="col">Month</th><th class="num" scope="col">Collected</th><th class="num hide-s" scope="col">Fees</th><th class="num" scope="col">Expenses</th><th class="num hide-s" scope="col">Mileage</th><th class="num" scope="col">Net</th></tr></thead><tbody>
 ${p.rows.map(x=>`<tr${x.n?"":` class="v31pl-z"`}><th scope="row">${x.l}</th><td class="num">${v7$(x.inc)}</td><td class="num hide-s">${v7$(x.fee)}</td><td class="num">${v7$(x.ex)}</td><td class="num hide-s">${v7$(x.mded)}</td><td class="num v31pl-n ${x.net<0?"bad7":""}"><span class="v31pl-b" aria-hidden="true"><i class="${x.net<0?"neg":""}" style="width:${Math.round(Math.abs(x.net)/mx*100)}%"></i></span>${v7$(x.net)}</td></tr>`).join("")}
 </tbody><tfoot><tr><th scope="row">Total</th><td class="num">${v7$(p.T.inc)}</td><td class="num hide-s">${v7$(p.T.fee)}</td><td class="num">${v7$(p.T.ex)}</td><td class="num hide-s">${v7$(p.T.mded)}</td><td class="num ${p.T.net<0?"bad7":""}">${v7$(p.T.net)}</td></tr></tfoot></table></div>
 <p class="muted small v31pl-s">${best&&best.net>0?`Best month: <b>${best.l}</b> (${v7$(best.net)} net). `:""}${p.from>0?`Starts in ${V31MON[p.from]}, the first month with money in or out. `:""}Mileage at $${MILE_RATE.toFixed(2)}/mi. The total matches the tax-year file above. An estimate for planning, not tax advice.</p>
 <div class="o9-tax-b"><button class="btn sm" id="v31PlCsv" data-y="${esc(y)}">${I("download",14)}Download P&amp;L (CSV)</button></div></div>`}
{const ov=VIEWS.office;VIEWS.office=(tab,q)=>{let h=ov(tab,q);try{const m=me();if(m&&v7Pro(m)&&tab==="reports"){
  const i=h.indexOf('<div class="card o7-exp">');if(i>=0)h=h.slice(0,i)+v31PlCard(m,(q||{}).y)+h.slice(i);}}catch(e){}return h}}
{const oa=AFTER.office;AFTER.office=function(tab,q){const r=oa&&oa.apply(this,arguments);try{const m=me();if(!m)return r;const $=s=>document.getElementById(s);
  const pc=$("v31PlCsv");if(pc)pc.onclick=()=>{v7Download("sawyer-profit-loss-"+pc.dataset.y+".csv",v7CSV(v31PlRows(m,pc.dataset.y)));toast("P&L downloaded")}}catch(e){}return r}}
