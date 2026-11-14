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
/* ---- Back up everything: a stored (uncompressed) ZIP, written by hand so there is no library and no upload ---- */
const V31CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function v31Crc(b){let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=V31CRC[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0}
function v31Zip(files){const enc=new TextEncoder(),parts=[],cd=[];let off=0;const d=new Date();
 const dt=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF,dd=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
 for(const [name,text] of files){const nb=enc.encode(name),data=enc.encode(text),crc=v31Crc(data);
  const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint16(10,dt,true);h.setUint16(12,dd,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,nb.length,true);h.setUint16(28,0,true);
  const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,0,true);c.setUint16(12,dt,true);c.setUint16(14,dd,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,nb.length,true);c.setUint32(42,off,true);
  parts.push(new Uint8Array(h.buffer),nb,data);cd.push(new Uint8Array(c.buffer),nb);off+=30+nb.length+data.length}
 const cdLen=cd.reduce((a,x)=>a+x.length,0),e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cdLen,true);e.setUint32(16,off,true);
 const all=[...parts,...cd,new Uint8Array(e.buffer)],out=new Uint8Array(all.reduce((a,x)=>a+x.length,0));let p=0;for(const x of all){out.set(x,p);p+=x.length}return out}
const V31DOC={license:"License",gl:"General liability",wc:"Workers' comp",bond:"Bond",auto:"Commercial auto",other:"Permit / other",coi:"Certificate of insurance"};
const v31D=t=>t?new Date(t).toISOString().slice(0,10):"";
function v31Backup(m){const bom="\ufeff",C=rows=>bom+v7CSV(rows),y=v31Year(m),bills=v7Mine("bills",m),led=v7Mine("ledger",m);
 const TY={inv:"Invoice",est:"Estimate",co:"Change order",rv:"Recurring"};
 const cust=[["Name","Email","Phone","Billing address","Job site","Added","Notes"],...v7Mine("bcust",m).map(c=>[c.name,c.email,c.phone,c.addr,c.site,v31D(c.date),(c.notes||[]).map(n=>n.t).join(" | ")])];
 const bl=[["Number","Type","Customer","Issued","Due","Status","Tax %","Total","Paid","Balance","P.O.","Job"]],li=[["Number","Type","Description","Qty","Rate","Amount","Optional","Included"]];
 bills.forEach(b=>{const c=billCalc(b),paid=v31r2(c.total-c.bal);bl.push([b.no,TY[b.type]||b.type,b.cname,v31D(b.date),b.due||"",b.status||"",b.tax||0,v31f(c.total),v31f(paid),v31f(c.bal),b.po||"",b.job||""]);
  (b.lines||[]).forEach(l=>li.push([b.no,TY[b.type]||b.type,l.d,l.q,v31f(l.r),v31f(l.q*l.r),l.opt?"Y":"N",!l.opt||l.on?"Y":"N"]))});
 const pay=[["Invoice","Customer","Date","Amount","Method","Processor fee"]];bills.filter(b=>b.type==="inv").forEach(b=>(b.payments||[]).forEach(p=>pay.push([b.no,b.cname,v31D(p.date),v31f(p.amt),p.method||"",p.fee!=null?v31f(p.fee):""])));
 const ex=[["Date","Vendor","Category","Job","Amount","Note","Receipt photo"]];led.filter(l=>l.kind==="exp").forEach(l=>ex.push([l.date,l.vendor,l.cat,l.job,v31f(l.amt),l.note,l.photo?"Y":"N"]));
 const mi=[["Date","From","To","Job","Miles","Purpose"]];led.filter(l=>l.kind==="mile").forEach(l=>mi.push([l.date,l.from,l.to,l.job,l.miles,l.note||"Business"]));
 const ts=[["Date","Person","Role","Job","Hours","Rate","Approved"]];v7Mine("tsheets",m).forEach(t=>ts.push([t.date,t.who,t.role,t.job,t.hrs,t.rate,t.ok?"Y":"N"]));
 const dc=[["Type","Name","Number","State","Expires","Holder","Kept in"]];v7Mine("bdocs",m).forEach(d=>dc.push([V31DOC[d.kind]||d.kind,d.name,d.num,d.state,d.exp||"",d.holder||"",d.scope==="biz"?"Compliance file":"Wallet"]));
 const who=m.biz||nameOf(m),today=v7Today();
 const files=[["customers.csv",C(cust)],["invoices-and-estimates.csv",C(bl)],["invoice-lines.csv",C(li)],["payments.csv",C(pay)],["expenses.csv",C(ex)],["mileage.csv",C(mi)],["timesheets.csv",C(ts)],["licenses-and-insurance.csv",C(dc)],["profit-and-loss-"+y+".csv",C(v31PlRows(m,y))]];
 const counts=[["customers",cust.length-1],["invoices and estimates",bl.length-1],["payments",pay.length-1],["expenses",ex.length-1],["mileage trips",mi.length-1],["timesheet entries",ts.length-1],["licenses and policies",dc.length-1]];
 files.unshift(["README.txt",`${who}: Sawyer Office backup, ${today}\r\n\r\nPlain CSV files. They open in Excel, Google Sheets or Numbers, and import into most bookkeeping tools.\r\n\r\n${counts.map(([k,n])=>n+" "+k).join("\r\n")}\r\n\r\nprofit-and-loss-${y}.csv is cash basis (payments by the date paid, costs by their date, mileage at $${MILE_RATE.toFixed(2)}/mi). Not tax advice.\r\nText that starts with = + - or @ is saved with a leading ' so a spreadsheet won't run it as a formula.\r\nPhotos and uploaded files are not inside this ZIP; they stay in your Sawyer account.\r\n`]);
 return{files,counts,name:"sawyer-backup-"+today+".zip"}}
function v31BackupCard(m){const n=v7Mine("bills",m).length+v7Mine("ledger",m).length+v7Mine("bcust",m).length+v7Mine("tsheets",m).length+v7Mine("bdocs",m).length;
 return`<div class="v31bk" id="v31bk"><div><b>${I("shield",16)} Back up everything</b><p class="muted small">One ZIP of plain spreadsheets: customers, invoices and estimates with every line, payments, expenses, mileage, timesheets, licenses and insurance, and this year's P&amp;L. ${n} record${n===1?"":"s"} today. It's built on your device; nothing is uploaded.</p></div><button class="btn sm" id="v31Zip">${I("download",14)}Download backup (ZIP)</button></div>`}
{const ov=VIEWS.office;VIEWS.office=(tab,q)=>{let h=ov(tab,q);try{const m=me();if(m&&v7Pro(m)&&tab==="reports"){
  const i=h.indexOf('<div class="card o7-exp">');if(i>=0)h=h.slice(0,i)+v31PlCard(m,(q||{}).y)+h.slice(i);
  const k=h.indexOf('<p class="muted small">The invoice file uses QuickBooks');if(k>=0)h=h.slice(0,k)+v31BackupCard(m)+h.slice(k)}}catch(e){}return h}}
{const oa=AFTER.office;AFTER.office=function(tab,q){const r=oa&&oa.apply(this,arguments);try{const m=me();if(!m)return r;const $=s=>document.getElementById(s);
  const pc=$("v31PlCsv");if(pc)pc.onclick=()=>{v7Download("sawyer-profit-loss-"+pc.dataset.y+".csv",v7CSV(v31PlRows(m,pc.dataset.y)));toast("P&L downloaded")};
  const z=$("v31Zip");if(z)z.onclick=()=>{try{const b=v31Backup(m),blob=new Blob([v31Zip(b.files)],{type:"application/zip"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=b.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800);toast("Backup downloaded: "+b.files.length+" files")}catch(e){toast("Couldn't build the backup. Try again.","err")}}}catch(e){}return r}}
