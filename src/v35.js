/* ===== v35 ===== */
const V2_ACTIONS35=["pbSave35","pbDel35","pbImport35","leadFilters35","stmt35"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS35);
function v35Now(){return typeof __now==="function"?__now():Date.now()}
const v35r2=n=>Math.round((Number(n)||0)*100)/100;
const v35OnServer=()=>typeof navigator!=="undefined"&&navigator&&navigator.userAgent==="node";

/* (1) Price book. Pros save the things they sell (labor rate, trip charge, a water heater, a permit) with their own price, and
   tap them into any estimate, invoice or change order instead of retyping. "Add from your past invoices" builds it from line
   items already sent. Items used on a saved bill rise to the top, and the editor's Quick add chips are the pro's own top 4.
   Private to the pro (m.pb35, in PRO_PRIVATE on the server). Same Office, same $20 plan. */
const V35_UNITS=["each","hour","day","job","ft","sq ft","yd","gal","lb"];
const V35_CATS=["Labor","Materials","Equipment","Fees","Other"];
const V35_PBMAX=300;
function v35Pb(m){return Array.isArray(m&&m.pb35)?m.pb35:[]}
function v35PbSorted(m){return v35Pb(m).slice().sort((a,b)=>(b.n||0)-(a.n||0)||(b.used||0)-(a.used||0)||String(a.d).localeCompare(String(b.d)))}
function v35Desc(s){return String(s==null?"":s).replace(/[|\r\n\t]+/g," ").replace(/\s{2,}/g," ").trim()}
function v35Guess(d){return/labor|hour|install|service|diagnos|inspect|jet|clean|pump/i.test(d)?"Labor":/permit|fee|trip|dump|disposal|haul/i.test(d)?"Fees":/rental|lift|equipment|machine/i.test(d)?"Equipment":"Materials"}
function v35PbCands(m){const have=new Set(v35Pb(m).map(x=>String(x.d).toLowerCase()));const by=new Map();
 (DB.bills||[]).filter(b=>m&&b.by===m.id&&b.status!=="void").sort((a,b)=>(a.date||0)-(b.date||0)).forEach(b=>(b.lines||[]).forEach(l=>{const d=v35Desc(l&&l.d).slice(0,120);const r=v35r2(l&&l.r);if(!d||!(r>0)||/^progress billing|deposit on|% deposit/i.test(d))return;const k=d.toLowerCase();if(have.has(k))return;const o=by.get(k)||{d,r,n:0};o.r=r;o.n++;by.set(k,o)}));
 return[...by.values()].sort((a,b)=>b.n-a.n)}
A.pbSave35=function(o){const m=me();if(!v7Pro(m))return{ok:false,msg:"The price book is part of The Office for pro accounts."};o=o||{};
 const d=v35Desc(o.d);if(!d)return{ok:false,msg:"Name the item, for example \"Labor\" or \"50-gal water heater\".",field:"d"};if(d.length>120)return{ok:false,msg:"Keep the item name under 120 characters.",field:"d"};
 const r=parseFloat(String(o.r==null?"":o.r).replace(/[$,\s]/g,""));if(!Number.isFinite(r)||r<0||r>1e6)return{ok:false,msg:"Enter a price from $0 to $1,000,000.",field:"r"};
 const unit=V35_UNITS.includes(o.unit)?o.unit:"each",cat=V35_CATS.includes(o.cat)?o.cat:v35Guess(d);
 m.pb35=v35Pb(m);let it=o.id&&m.pb35.find(x=>x.id===o.id);const dup=m.pb35.find(x=>x!==it&&String(x.d).toLowerCase()===d.toLowerCase());
 if(dup&&!it)it=dup;else if(dup)return{ok:false,msg:"You already have \""+dup.d+"\" in your price book.",field:"d"};
 if(it){Object.assign(it,{d,r:v35r2(r),unit,cat,upd:v35Now()});save();return{ok:true,msg:"Saved \""+d+"\"",id:it.id}}
 if(m.pb35.length>=V35_PBMAX)return{ok:false,msg:"Your price book holds "+V35_PBMAX+" items. Remove one you don't use first."};
 it={id:"pb"+uid(),d,r:v35r2(r),unit,cat,n:0,used:0,upd:v35Now()};m.pb35.push(it);save();return{ok:true,msg:"Added \""+d+"\" to your price book",id:it.id}};
A.pbDel35=function(id){const m=me();if(!v7Pro(m))return{ok:false,msg:"Pros only"};const L=v35Pb(m),i=L.findIndex(x=>x.id===id);if(i<0)return{ok:false,msg:"That item isn't in your price book."};const d=L[i].d;L.splice(i,1);m.pb35=L;save();return{ok:true,msg:"Removed \""+d+"\""}};
A.pbImport35=function(){const m=me();if(!v7Pro(m))return{ok:false,msg:"Pros only"};const c=v35PbCands(m);if(!c.length)return{ok:false,msg:"Nothing new to add. Every priced line on your invoices is already in your price book."};
 m.pb35=v35Pb(m);const room=Math.max(0,V35_PBMAX-m.pb35.length);const add=c.slice(0,room);add.forEach(x=>m.pb35.push({id:"pb"+uid(),d:x.d,r:x.r,unit:/^labor/i.test(x.d)?"hour":"each",cat:v35Guess(x.d),n:x.n,used:0,upd:v35Now()}));save();
 return{ok:true,n:add.length,msg:"Added "+add.length+" item"+(add.length===1?"":"s")+" from your past invoices"}};
// a saved bill counts toward "most used"
{const os=A.saveBill;A.saveBill=function(o){const r=os.apply(this,arguments);try{const m=me();if(r&&r.ok&&m&&Array.isArray(m.pb35)&&m.pb35.length){const b=(DB.bills||[]).find(x=>x.id===r.id);if(b){const ks=new Set((b.lines||[]).map(l=>v35Desc(l.d).toLowerCase()));let hit=0;m.pb35.forEach(x=>{if(ks.has(String(x.d).toLowerCase())){x.n=(x.n||0)+1;x.used=v35Now();hit++}});if(hit)save()}}}catch(e){}return r}}
if(typeof OTABS!=="undefined"&&!OTABS.some(t=>t[0]==="pricebook")){const i=OTABS.findIndex(t=>t[0]==="estimates");OTABS.splice(i<0?OTABS.length:i+1,0,["pricebook","Price book","tag"])}
function v35PbRow(x){return`<li class="v35pb-i" data-v35pbq="${esc((x.d+" "+x.cat).toLowerCase())}" data-v35cat="${esc(x.cat)}"><div class="v35pb-t"><b>${esc(x.d)}</b><small class="muted">${esc(x.cat)}${x.n?` · used ${x.n}×`:""}</small></div><span class="v35pb-p v35n">${esc(v7$(x.r))}<small>/${esc(x.unit)}</small></span><span class="v35pb-a"><button type="button" class="btn sm ghost" data-v35pbe="${esc(x.id)}" aria-label="Edit ${esc(x.d)}">${I("edit",14)}<span>Edit</span></button><button type="button" class="btn sm ghost" data-v35pbx="${esc(x.id)}" aria-label="Remove ${esc(x.d)}">${I("x",14)}</button></span></li>`}
function oPricebook(m){const L=v35PbSorted(m),c=v35PbCands(m);const cats=V35_CATS.filter(k=>L.some(x=>x.cat===k));
 return`<div class="v35pb"><div class="card v35pb-h"><div><h2>${I("tag",18)} Your price book</h2><p class="muted small">Save what you sell at your price once. Tap it into any estimate, invoice or change order. No retyping, no add-on fee.</p></div><div class="v35pb-n"><b>${L.length}</b><small>item${L.length===1?"":"s"}</small></div></div>
 ${c.length?`<div class="card v35pb-imp" id="v35imp"><span class="o9-ic">${I("import",18)}</span><div><b>${c.length} priced item${c.length===1?"":"s"} found on your past invoices</b><p class="muted small">${esc(c.slice(0,3).map(x=>x.d).join(" · "))}${c.length>3?" …":""}</p></div><button type="button" class="btn primary sm" id="v35impB">${I("plus",14)}Add them</button></div>`:""}
 <form class="card v35pb-f" id="v35pbF" novalidate><h3>Add an item</h3><div class="v35pb-g"><div class="fld v35pb-d"><label for="v35d">Item</label><input id="v35d" name="d" maxlength="120" placeholder="Labor, trip charge, 50-gal water heater…" required></div>
 <div class="fld"><label for="v35r">Price</label><div class="v33amt"><span aria-hidden="true">$</span><input id="v35r" name="r" inputmode="decimal" placeholder="0.00" required></div></div>
 <div class="fld"><label for="v35u">Per</label><select id="v35u" name="unit">${V35_UNITS.map(u=>`<option>${u}</option>`).join("")}</select></div>
 <div class="fld"><label for="v35c">Category</label><select id="v35c" name="cat"><option value="">Pick for me</option>${V35_CATS.map(u=>`<option>${u}</option>`).join("")}</select></div>
 <button class="btn primary v35pb-s">${I("plus",16)}Add</button></div><p class="err" id="v35pbE" role="alert"></p></form>
 <div class="card"><div class="v35pb-bar"><div class="fld v35pb-q"><label for="v35q" class="sr">Search your price book</label><input id="v35q" type="search" placeholder="Search ${L.length} item${L.length===1?"":"s"}…" autocomplete="off"></div>${cats.length>1?`<div class="chips7" role="group" aria-label="Category">${["All",...cats].map((k,i)=>`<button type="button" class="chip7 ${i?"":"on"}" data-v35cf="${esc(k)}" aria-pressed="${i?"false":"true"}">${esc(k)}</button>`).join("")}</div>`:""}</div>
 ${L.length?`<ul class="v35pb-l" id="v35pbL">${L.map(v35PbRow).join("")}</ul><p class="muted small v35pb-none" id="v35none" hidden>No items match.</p>`:empty("tag","Your price book is empty","Add your labor rate, trip charge and the parts you install most. They show up as one-tap buttons on every estimate and invoice.","")}</div></div>`}
function v35PbEdit(id){const m=me(),x=v35Pb(m).find(i=>i.id===id);if(!x)return;
 modal(`<h2 id="mtitle">Edit price book item</h2><form id="v35peF" class="form" novalidate><div class="fld"><label for="v35pd">Item</label><input id="v35pd" name="d" maxlength="120" value="${esc(x.d)}" required></div>
 <div class="row2"><div class="fld"><label for="v35pr">Price</label><div class="v33amt"><span aria-hidden="true">$</span><input id="v35pr" name="r" inputmode="decimal" value="${esc(x.r)}"></div></div><div class="fld"><label for="v35pu">Per</label><select id="v35pu" name="unit">${V35_UNITS.map(u=>`<option ${x.unit===u?"selected":""}>${u}</option>`).join("")}</select></div></div>
 <div class="fld"><label for="v35pc">Category</label><select id="v35pc" name="cat">${V35_CATS.map(u=>`<option ${x.cat===u?"selected":""}>${u}</option>`).join("")}</select></div>
 <p class="muted small">Changing a price here doesn't change invoices you already sent.</p><p class="err" id="v35peE" role="alert"></p><div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div></form>`);
 document.querySelectorAll("#modal [data-close]").forEach(b=>b.onclick=closeModal);const f=document.getElementById("v35peF");
 f.onsubmit=e=>{e.preventDefault();const o=readForm(f);o.id=id;const r=A.pbSave35(o);if(r&&r.ok){closeModal();act(r,()=>{const y=scrollY;render();scrollTo(0,y)})}else document.getElementById("v35peE").textContent=(r&&r.msg)||"That didn't save."}}
function v35PbBind(){const $=s=>document.getElementById(s);const f=$("v35pbF");if(!f)return;
 f.onsubmit=e=>{e.preventDefault();const o=readForm(f);const r=A.pbSave35(o);if(r&&r.ok){act(r,()=>{render();const d=$("v35d");if(d)d.focus()})}else $("v35pbE").textContent=(r&&r.msg)||"That didn't save."};
 f.oninput=()=>{const e=$("v35pbE");if(e&&e.textContent)e.textContent=""};
 if($("v35impB"))$("v35impB").onclick=()=>act(A.pbImport35(),()=>{const y=scrollY;render();scrollTo(0,y)});
 let cat="All";const filt=()=>{const q=String(($("v35q")||{}).value||"").trim().toLowerCase();let n=0;document.querySelectorAll("#v35pbL [data-v35pbq]").forEach(li=>{const on=(!q||li.dataset.v35pbq.includes(q))&&(cat==="All"||li.dataset.v35cat===cat);li.hidden=!on;if(on)n++});const no=$("v35none");if(no)no.hidden=n>0};
 if($("v35q"))$("v35q").oninput=filt;
 document.querySelectorAll("[data-v35cf]").forEach(b=>b.onclick=()=>{cat=b.dataset.v35cf;document.querySelectorAll("[data-v35cf]").forEach(x=>{const on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-pressed",on?"true":"false")});filt()});
 document.querySelectorAll("[data-v35pbe]").forEach(b=>b.onclick=()=>v35PbEdit(b.dataset.v35pbe));
 document.querySelectorAll("[data-v35pbx]").forEach(b=>b.onclick=()=>act(A.pbDel35(b.dataset.v35pbx),()=>{const y=scrollY;render();scrollTo(0,y)}))}
// editor: Quick add = your own top 4, a "Price book" picker, and item names auto-fill the rate
{const ov=VIEWS.invedit;VIEWS.invedit=function(id,q){let h=ov.apply(this,arguments);try{const m=me();if(!m||!v7Pro(m)||h.indexOf('id="bedF"')<0)return h;const L=v35PbSorted(m);
  const a='<span class="muted small">Quick add:</span>',i=h.indexOf(a);if(i<0)return h;const e=h.indexOf("</div>",i);if(e<0)return h;
  const chips=L.length?L.slice(0,4).map(x=>`<button type="button" class="chip7" data-ql="${esc(v35Desc(x.d)+"|1|"+x.r)}" title="${esc(v7$(x.r)+" per "+x.unit)}">${esc(x.d.length>28?x.d.slice(0,27)+"…":x.d)}</button>`).join(""):null;
  const pick=`<button type="button" class="btn sm v35pk" id="v35pk">${I("tag",14)}Price book${L.length?` <small>${L.length}</small>`:""}</button>`;
  h=chips?h.slice(0,i)+pick+a+chips+h.slice(e):h.slice(0,i)+pick+h.slice(i);
  if(L.length)h=h.replace('<form id="bedF" class="o7-ed">',()=>`<datalist id="v35pbl">${L.map(x=>`<option value="${esc(x.d)}">${esc(v7$(x.r)+" / "+x.unit)}</option>`).join("")}</datalist><form id="bedF" class="o7-ed">`);
 }catch(e){console.warn(e)}return h}}
function v35AddLine(x){const f=document.getElementById("bedF");if(!f||!BED)return;try{f.oninput&&f.oninput({target:f})}catch(e){}const b=BED;const d=v35Desc(x.d);const e=b.lines.find(l=>!l.d&&!l.r);if(e)Object.assign(e,{d,q:1,r:x.r});else b.lines.push({d,q:1,r:x.r,opt:false,on:true});const y=scrollY;render();scrollTo(0,y)}
function v35Picker(){const m=me(),L=v35PbSorted(m);
 modal(`<div class="v35pkm"><h2 id="mtitle">${I("tag",20)} Add from your price book</h2>${L.length?`<div class="fld"><label for="v35pq" class="sr">Search</label><input id="v35pq" type="search" placeholder="Search ${L.length} item${L.length===1?"":"s"}…" autocomplete="off"></div>
 <ul class="v35pk-l" id="v35pkL">${L.map(x=>`<li data-v35pbq="${esc((x.d+" "+x.cat).toLowerCase())}"><button type="button" class="v35pk-b" data-v35add="${esc(x.id)}"><span><b>${esc(x.d)}</b><small class="muted">${esc(x.cat)}</small></span><span class="v35n">${esc(v7$(x.r))}<small>/${esc(x.unit)}</small></span>${I("plus",16)}</button></li>`).join("")}</ul><p class="muted small">Adds a line with quantity 1. You can change the quantity and price on the bill.</p>`
 :`<p class="muted">Your price book is empty. Save your labor rate and the parts you use most, then add them here in one tap.</p><a class="btn primary" href="${href("office","pricebook")}">Open the price book</a>`}<div class="actions"><button type="button" class="btn ghost" data-close>Done</button></div></div>`,"v33sheet");
 document.querySelectorAll("#modal [data-close]").forEach(b=>b.onclick=closeModal);const q=document.getElementById("v35pq");
 if(q)q.oninput=()=>{const s=q.value.trim().toLowerCase();document.querySelectorAll("#v35pkL [data-v35pbq]").forEach(li=>li.hidden=!!s&&!li.dataset.v35pbq.includes(s))};
 document.querySelectorAll("[data-v35add]").forEach(b=>b.onclick=()=>{const x=L.find(i=>i.id===b.dataset.v35add);if(!x)return;closeModal();v35AddLine(x);toast("Added "+x.d)})}
{const oa=AFTER.invedit;AFTER.invedit=function(id,q){const r=oa&&oa.apply(this,arguments);try{const m=me();const f=document.getElementById("bedF");if(!f||!m)return r;const L=v35Pb(m);
  const pk=document.getElementById("v35pk");if(pk)pk.onclick=()=>v35Picker();
  if(L.length)f.querySelectorAll('input[data-f="d"]').forEach(inp=>{inp.setAttribute("list","v35pbl");inp.addEventListener("change",()=>{const x=L.find(i=>String(i.d).toLowerCase()===inp.value.trim().toLowerCase());if(!x)return;const rr=f.querySelector(`input[data-l="${inp.dataset.l}"][data-f="r"]`);if(rr&&!(parseFloat(rr.value)>0)){rr.value=x.r;try{f.oninput&&f.oninput({target:rr})}catch(e){}}})})}catch(e){console.warn(e)}return r}}

/* demo data: a price book for the demo pro (server-side, once per database; fictional like all seed data) */
function seedPb35(){try{if(!DB||!Array.isArray(DB.users))return false;let ch=false;const now=v35Now();
 const c1=DB.users.find(u=>u.id==="c1"&&u.role==="contractor");if(c1&&!Array.isArray(c1.pb35)){c1.pb35=[["Labor",95,"hour","Labor",14],["Trip charge",65,"job","Fees",9],["Water heater permit (city)",150,"job","Fees",4],["50-gal gas water heater, 6-yr warranty",1180,"each","Materials",3],["Angle stop + supply line",68,"each","Materials",6],["Expansion tank",145,"each","Materials",3],["Camera inspection with report",250,"job","Labor",2],["Jet drain line, up to 60 ft",420,"job","Labor",2],["P-trap, 1-1/2\" PVC",85,"each","Materials",2]].map(([d,r,unit,cat,n],i)=>({id:"pbd"+i,d,r,unit,cat,n,used:now-i*864e5,upd:now,demo:true}));ch=true}
 if(ch)save();return ch}catch(e){return false}}
if(v35OnServer()&&typeof DB!=="undefined"&&DB&&DB.users){seedPb35()}
{const os=seed;seed=function(){const r=os.apply(this,arguments);try{if(v35OnServer())seedPb35()}catch(e){}return r}}
{const ov=VIEWS.office;VIEWS.office=(tab,q)=>{const m=me();if(m&&v7Pro(m)&&tab==="pricebook")return oShell("pricebook",oPricebook(m),m);return ov(tab,q)}}
{const oa=AFTER.office;AFTER.office=(tab,q)=>{oa&&oa(tab,q);try{if(tab==="pricebook")v35PbBind()}catch(e){console.warn(e)}}}
// the Office backup ZIP carries the price book too
if(typeof v31Backup==="function"){const ob=v31Backup;v31Backup=function(m){const r=ob.apply(this,arguments);try{const L=v35PbSorted(m);if(L.length&&r&&Array.isArray(r.files))r.files.push(["price-book.csv","\ufeff"+v7CSV([["Item","Price","Per","Category","Times used"],...L.map(x=>[x.d,Number(x.r).toFixed(2),x.unit,x.cat,x.n||0])])])}catch(e){}return r}}

/* (2) Who owes you. Office -> Invoices opens with an aging card: open balances by how late they are (not due yet, 1-30,
   31-60, 61-90, 90+ days) and one row per customer with the oldest late invoice. "Statement" lists that customer's open
   invoices with totals; send it in Sawyer (the customer gets a notice and a statement page with Pay buttons), copy it as
   text, or download a CSV. One statement per customer per day, checked on the server. Payments stay in test mode. */
const V35_BK=[["cur","Not due yet"],["d30","1–30 days late"],["d60","31–60 days late"],["d90","61–90 days late"],["d90p","90+ days late"]];
function v35Late(b){const d=b.due?v7DaysTo(b.due):null;return d==null||d>=0?0:-d}
function v35Bk(n){return n<=0?"cur":n<=30?"d30":n<=60?"d60":n<=90?"d90":"d90p"}
function v35Open(by,cust){return(DB.bills||[]).filter(b=>b.by===by&&b.type==="inv"&&b.status!=="draft"&&b.status!=="void"&&(!cust||b.cust===cust)&&billCalc(b).bal>0.004)}
function v35Aging(m){const open=v35Open(m.id),bk={cur:0,d30:0,d60:0,d90:0,d90p:0},cs=new Map();let tot=0,late=0;
 open.forEach(b=>{const bal=billCalc(b).bal,n=v35Late(b);bk[v35Bk(n)]+=bal;tot+=bal;if(n>0)late+=bal;const c=cs.get(b.cust)||{id:b.cust,name:b.cname,bal:0,late:0,oldest:0,n:0};c.bal+=bal;if(n>0)c.late+=bal;c.oldest=Math.max(c.oldest,n);c.n++;cs.set(b.cust,c)});
 const rows=[...cs.values()].map(c=>Object.assign(c,{cu:v7Cust(c.id)||{}})).sort((a,b)=>b.oldest-a.oldest||b.bal-a.bal);Object.keys(bk).forEach(k=>bk[k]=v35r2(bk[k]));return{bk,tot:v35r2(tot),late:v35r2(late),rows,n:open.length}}
function v35AgingCard(m){const a=v35Aging(m);if(!a.n)return`<div class="card v35ar v35ar-0" id="v35ar"><h2>${I("wallet",18)} Who owes you</h2><p class="muted small">Nothing outstanding. Every invoice you sent is paid.</p></div>`;
 const bar=V35_BK.filter(([k])=>a.bk[k]>0).map(([k,t])=>`<i class="v35b-${k}" style="flex:${Math.max(a.bk[k]/a.tot,0.02).toFixed(4)}" title="${esc(t+": "+v7$(a.bk[k]))}"></i>`).join("");
 const rows=a.rows.slice(0,6).map(c=>`<li><div class="v35ar-c"><b>${esc(c.name)}</b><small class="muted">${c.n} open invoice${c.n===1?"":"s"}${c.oldest?` · oldest ${c.oldest} day${c.oldest===1?"":"s"} late`:" · not due yet"}${c.cu.stmt35?` · statement sent ${esc(v35Fmt(new Date(c.cu.stmt35).toISOString().slice(0,10)))}`:""}</small></div><b class="v35n ${c.late?"v35late":""}">${esc(v7$(c.bal))}</b><button type="button" class="btn sm" data-v35st="${esc(c.id)}">${I("doc",14)}Statement</button></li>`).join("");
 return`<div class="card v35ar" id="v35ar" aria-labelledby="v35arh"><div class="v35ar-h"><div><h2 id="v35arh">${I("wallet",18)} Who owes you</h2><p class="muted small">${a.n} open invoice${a.n===1?"":"s"} · ${esc(v7$(a.late))} of it late</p></div><b class="v35ar-t v35n">${esc(v7$(a.tot))}</b></div>
 <div class="v35bar" role="img" aria-label="${esc(V35_BK.filter(([k])=>a.bk[k]>0).map(([k,t])=>t+" "+v7$(a.bk[k])).join(", "))}">${bar}</div>
 <dl class="v35bk">${V35_BK.map(([k,t])=>`<div class="${a.bk[k]?"":"z"}"><dt><i class="v35b-${k}"></i>${esc(t)}</dt><dd class="v35n">${esc(v7$(a.bk[k]))}</dd></div>`).join("")}</dl>
 <ul class="v35ar-l">${rows}</ul>${a.rows.length>6?`<p class="muted small">+${a.rows.length-6} more customers with an open balance.</p>`:""}</div>`}
function v35StmtRows(by,cust){return v35Open(by,cust).sort((a,b)=>(a.date||0)-(b.date||0)).map(b=>{const c=billCalc(b);return{b,no:b.no,title:b.title||"",issued:v31D?v31D(b.date):new Date(b.date).toISOString().slice(0,10),due:b.due||"",total:c.total,paid:v35r2(c.total-c.bal),bal:c.bal,late:v35Late(b)}})}
function v35StmtText(m,c,rows){const tot=rows.reduce((a,r)=>a+r.bal,0);return`Statement from ${m.biz||nameOf(m)} for ${c.name}, ${v7Today()}\n\n`+rows.map(r=>`${r.no} · ${r.title} · issued ${r.issued}${r.due?" · due "+r.due:""} · total ${v7$(r.total)} · paid ${v7$(r.paid)} · balance ${v7$(r.bal)}${r.late?" ("+r.late+" days late)":""}`).join("\n")+`\n\nTotal open: ${v7$(tot)}\nThank you!`}
A.stmt35=function(cid){const m=me();if(!v7Pro(m))return{ok:false,msg:"Statements are part of The Office for pro accounts."};const c=v7Cust(cid);if(!c||c.by!==m.id)return{ok:false,msg:"That customer wasn't found."};
 if(!c.uid||!U(c.uid))return{ok:false,msg:c.name+" isn't on __BRAND__ yet. Copy the statement and text or email it."};
 const rows=v35StmtRows(m.id,c.id);if(!rows.length)return{ok:false,msg:c.name+" has no open invoices."};
 if(c.stmt35&&v35Now()-c.stmt35<864e5)return{ok:false,msg:"You sent "+c.name+" a statement in the last 24 hours. One a day keeps it friendly."};
 const tot=rows.reduce((a,r)=>a+r.bal,0);notify(c.uid,`${m.biz||nameOf(m)} sent you a statement: ${v7$(tot)} open on ${rows.length} invoice${rows.length===1?"":"s"}`,"stmt35:"+m.id);c.stmt35=v35Now();save();
 return{ok:true,msg:"Statement sent to "+c.name+" in __BRAND__"}};
function v35Csv(name,rows){try{const blob=new Blob(["\ufeff"+v7CSV(rows)],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}catch(e){toast("Couldn't download the file","err")}}
function v35StmtModal(cid){const m=me(),c=v7Cust(cid);if(!m||!c)return;const rows=v35StmtRows(m.id,cid),tot=v35r2(rows.reduce((a,r)=>a+r.bal,0)),txt=v35StmtText(m,c,rows);
 const sentAt=c.stmt35&&v35Now()-c.stmt35<864e5;
 modal(`<div class="v35sm"><h2 id="mtitle">Statement for ${esc(c.name)}</h2><p class="muted small">${esc(m.biz||nameOf(m))} · ${esc(v7Today())}</p>
 <div class="tablewrap"><table class="v35st"><thead><tr><th scope="col">Invoice</th><th scope="col">Due</th><th scope="col" class="v35n v35st-x">Total</th><th scope="col" class="v35n v35st-x">Paid</th><th scope="col" class="v35n">Balance</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${esc(r.no)}<small class="muted">${esc(r.title)}</small></th><td>${esc(r.due?v35Fmt(r.due):"—")}${r.late?`<small class="v35late">${r.late} days late</small>`:""}</td><td class="v35n v35st-x">${esc(v7$(r.total))}</td><td class="v35n v35st-x">${esc(v7$(r.paid))}</td><td class="v35n"><b>${esc(v7$(r.bal))}</b></td></tr>`).join("")}</tbody><tfoot><tr><th scope="row" colspan="2">Total open</th><td class="v35st-x"></td><td class="v35st-x"></td><td class="v35n"><b>${esc(v7$(tot))}</b></td></tr></tfoot></table></div>
 <label class="sr" for="v35stx">Statement text</label><textarea id="v35stx" class="v35stx" rows="4" readonly>${esc(txt)}</textarea>
 <p class="err" id="v35stE" role="alert"></p><div class="actions v35sm-a">${c.uid?`<button type="button" class="btn primary" id="v35stS" ${sentAt?"disabled":""}>${I("send",16)}${sentAt?"Sent today":"Send in __BRAND__"}</button>`:`<span class="muted small v35sm-n">${esc(c.name)} isn't on __BRAND__. Copy it and text or email it.</span>`}<button type="button" class="btn" id="v35stC">${I("copy",16)}Copy text</button><button type="button" class="btn" id="v35stD">${I("download",16)}CSV</button><button type="button" class="btn ghost" data-close>Close</button></div></div>`);
 document.querySelectorAll("#modal [data-close]").forEach(b=>b.onclick=closeModal);const $=s=>document.getElementById(s);
 if($("v35stS"))$("v35stS").onclick=()=>{const b=$("v35stS");b.disabled=true;const r=A.stmt35(cid);if(r&&r.ok){closeModal();act(r,()=>{const y=scrollY;render();scrollTo(0,y)})}else{$("v35stE").textContent=(r&&r.msg)||"That didn't send.";b.disabled=false}};
 $("v35stC").onclick=()=>{const t=$("v35stx");const done=()=>toast("Statement copied");try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(done,()=>{t.select();document.execCommand("copy");done()});else{t.select();document.execCommand("copy");done()}}catch(e){t.select()}};
 $("v35stD").onclick=()=>v35Csv("statement-"+String(c.name).replace(/[^a-z0-9]+/gi,"-").toLowerCase().replace(/^-|-$/g,"")+"-"+v7Today()+".csv",[["Invoice","Title","Issued","Due","Total","Paid","Balance","Days late"],...rows.map(r=>[r.no,r.title,r.issued,r.due,r.total.toFixed(2),r.paid.toFixed(2),r.bal.toFixed(2),r.late]),["Total open","","","","","",tot.toFixed(2),""]])}
// customer side: /statement/<pro id> lists what's open with that pro, with Pay buttons (test mode)
VIEWS.statement=function(pid){const m=me();if(!m)return VIEWS.signup(null,{next:"/statement/"+(pid||"")});const p=U(pid);
 const bs=(DB.bills||[]).filter(b=>b.by===pid&&b.cuid===m.id&&b.type==="inv"&&b.status!=="draft"&&b.status!=="void"&&billCalc(b).bal>0.004).sort((a,b)=>(a.date||0)-(b.date||0));
 const tot=v35r2(bs.reduce((a,b)=>a+billCalc(b).bal,0)),biz=(bs[0]&&bs[0].bizName)||(p&&nameOf(p))||"Your pro";
 return`<section class="page narrow v35cs"><a class="backlink" href="${href("bills")}">${I("back",16)}My invoices</a><h1>Statement from ${esc(biz)}</h1><p class="muted">${esc(v7Today())} · ${bs.length} open invoice${bs.length===1?"":"s"}</p>
 ${bs.length?`<div class="card"><ul class="v35cs-l">${bs.map(b=>{const c=billCalc(b),n=v35Late(b);return`<li><div><b>${esc(b.no)} · ${esc(b.title||"Invoice")}</b><small class="muted">${b.due?"Due "+esc(b.due):""}${n?` · <span class="v35late">${n} days late</span>`:""}</small></div><b class="v35n">${esc(v7$(c.bal))}</b><a class="btn sm primary" href="${href("pay",b.id)}">${I("lock",14)}Pay</a></li>`}).join("")}</ul><div class="v35cs-t"><span>Total open</span><b class="v35n">${esc(v7$(tot))}</b></div></div><p class="muted small">Payments are in test mode during the beta. No real money moves.</p>`
 :`<div class="card">${empty("check","You're all paid up","Nothing is open with "+esc(biz)+".","")}</div>`}</section>`};
if(typeof TITLES!=="undefined")Object.assign(TITLES,{statement:"Statement"});
{const ol=linkTo;linkTo=function(l){const[a,b]=String(l||"").split(":");if(a==="stmt35"&&b)return go("statement",b);return ol(l)}}

{const ov=VIEWS.office;VIEWS.office=(tab,q)=>{const m=me();if(m&&v7Pro(m)&&tab==="invoices"){const h=ov(tab,q);const a='<div class="o7-bar">',i=h.indexOf(a);return i<0?h:h.slice(0,i)+v35AgingCard(m)+h.slice(i)}return ov(tab,q)}}
{const oa=AFTER.office;AFTER.office=(tab,q)=>{oa&&oa(tab,q);try{document.querySelectorAll("[data-v35st]").forEach(b=>b.onclick=()=>v35StmtModal(b.dataset.v35st))}catch(e){console.warn(e)}}}

/* (3) Lead filters. A pro decides which posted jobs are worth their time: how far (inside their radius), the smallest job
   (by the posted budget), whether to include jobs with no budget or urgent / same-day jobs, and the job types they skip.
   Jobs outside the filters don't ring the bell, don't send a phone alert and don't count as "new"; on the dashboard and
   /jobs they stay visible, tagged "Outside your filters: …", so nothing is hidden behind a paywall. Private to the pro. */
const V35_MI=[0,10,15,25,50],V35_MIN=[0,250,500,1000,2500,5000];
function v35Lf(u){const f=u&&u.lf35;return f&&typeof f==="object"?f:null}
function v35Budget(j){const s=String(j&&j.budget||"");if(!s||/\b(per|each|an? hour|\/\s*(hr|hour|day|turn|visit))\b|tbd|open/i.test(s))return null;let mx=null;
 for(const x of s.matchAll(/\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?/gi)){let n=parseFloat(x[1].replace(/,/g,""));if(!Number.isFinite(n))continue;if(x[2])n*=1000;if(mx==null||n>mx)mx=n}return mx}
function v35Why(j,u){const f=v35Lf(u);if(!f||!j)return"";const out=[];
 if(f.mi>0&&dist(u.zip,j.zip)>f.mi)out.push("farther than "+f.mi+" mi");
 const b=v35Budget(j);if(f.min>0&&b!=null&&b<f.min)out.push("budget under $"+f.min.toLocaleString("en-US"));
 if(f.nob===false&&b==null)out.push("no budget given");
 if(f.urg===false&&j.urgent)out.push("urgent job");
 if(Array.isArray(f.skip)&&j.sub&&f.skip.includes(j.sub))out.push("you skip "+j.sub.toLowerCase());
 return out.join(", ")}
{const base=v28Fits;v28Fits=function(j,u){return base(j,u)&&!v35Why(j,u)}}
function v35BaseFits(j,u){if(!j||!u||u.role!=="contractor"||u.staff||j.cust===u.id)return false;const sub=j.sub&&(u.subs||[]).includes(j.sub);if(j.cat!==u.trade&&!sub)return false;return dist(u.zip,j.zip)<=(+u.radius||0)}
function v35Hidden(m){return(DB.jobs||[]).filter(j=>j.status==="posted"&&!j.hired&&v35BaseFits(j,m)&&v35Why(j,m))}
// a pro whose filters rule a new job out gets no "New job" bell for it (so no phone alert either)
{const op=A.postJob;A.postJob=function(o){const before=new Set((DB.notifs||[]).map(n=>n.id));const r=op.apply(this,arguments);try{if(r&&r.ok&&r.id){const j=(DB.jobs||[]).find(x=>x.id===r.id);
  if(j){const n0=DB.notifs.length;DB.notifs=DB.notifs.filter(n=>{if(before.has(n.id)||n.link!=="job:"+j.id||!/^New /.test(String(n.text||"")))return true;const u=U(n.to);return!(u&&v35Lf(u)&&v35Why(j,u))});if(DB.notifs.length!==n0)save()}}}catch(e){}return r}}
A.leadFilters35=function(o){const m=me();if(!m||m.role!=="contractor"||m.staff)return{ok:false,msg:"Lead filters are for pro accounts."};o=o||{};
 const mi=V35_MI.includes(+o.mi)?+o.mi:0,min=V35_MIN.includes(+o.min)?+o.min:0;const subs=(typeof CATS!=="undefined"&&CATS[m.trade])||[];
 const skip=(Array.isArray(o.skip)?o.skip:[]).filter(s=>subs.includes(s)).slice(0,20);const f={mi,min,nob:o.nob!==false,urg:o.urg!==false,skip,at:v35Now()};
 const any=mi||min||!f.nob||!f.urg||skip.length;if(!any){delete m.lf35;save();return{ok:true,msg:"Lead filters off. You'll hear about every job in your trade and radius."}}
 m.lf35=f;save();const pass=(DB.jobs||[]).filter(j=>j.status==="posted"&&!j.hired&&v35BaseFits(j,m)&&!v35Why(j,m)).length;
 return{ok:true,msg:"Lead filters saved. "+pass+" open job"+(pass===1?"":"s")+" near you pass them."}};
function v35LfSum(m){const f=v35Lf(m);if(!f)return"Off: you hear about every job in your trade inside "+(+m.radius||0)+" mi";const p=[];
 if(f.mi)p.push("within "+f.mi+" mi");if(f.min)p.push("$"+f.min.toLocaleString("en-US")+"+ jobs");if(!f.nob)p.push("budget required");if(!f.urg)p.push("no urgent jobs");if(f.skip&&f.skip.length)p.push("skipping "+f.skip.length+" job type"+(f.skip.length===1?"":"s"));return p.join(" · ")}
function v35LfBar(m,where){const f=v35Lf(m),hid=v35Hidden(m).length;
 return`<div class="v35lf ${f?"on":""}" id="v35lf"><span class="v35lf-i">${I("sliders",16)}</span><div class="v35lf-t"><b>Lead filters</b><small>${esc(v35LfSum(m))}${f&&hid?` · ${hid} open job${hid===1?"":"s"} outside them`:""}</small></div><button type="button" class="btn sm" id="v35lfB">${f?"Edit":"Set filters"}</button></div>`}
function v35LfModal(){const m=me();if(!m)return;const f=v35Lf(m)||{mi:0,min:0,nob:true,urg:true,skip:[]};const subs=(typeof CATS!=="undefined"&&CATS[m.trade])||[];
 modal(`<div class="v35lfm"><h2 id="mtitle">${I("sliders",20)} Lead filters</h2><p class="muted small">Only get alerts for the jobs you want. Jobs outside your filters still show on the job board, tagged, so you never miss one by accident. No lead fees either way.</p>
 <form id="v35lfF" class="form" novalidate><div class="row2"><div class="fld"><label for="v35mi">How far</label><select id="v35mi" name="mi">${V35_MI.filter(x=>!x||x<(+m.radius||0)).map(x=>`<option value="${x}" ${+f.mi===x?"selected":""}>${x?"Within "+x+" mi":"Anywhere in my "+(+m.radius||0)+" mi radius"}</option>`).join("")}</select></div>
 <div class="fld"><label for="v35min">Smallest job</label><select id="v35min" name="min">${V35_MIN.map(x=>`<option value="${x}" ${+f.min===x?"selected":""}>${x?"Budget $"+x.toLocaleString("en-US")+" or more":"Any size"}</option>`).join("")}</select></div></div>
 <label class="o7-chk"><input type="checkbox" name="nob" ${f.nob!==false?"checked":""}> Include jobs with no budget posted</label>
 <label class="o7-chk"><input type="checkbox" name="urg" ${f.urg!==false?"checked":""}> Include urgent and same-day jobs</label>
 ${subs.length?`<fieldset class="v35sk"><legend>Job types you skip <small class="muted">(${esc(m.trade||"")})</small></legend><div class="v35sk-g">${subs.map(s=>`<label><input type="checkbox" name="skip" value="${esc(s)}" data-multi ${(f.skip||[]).includes(s)?"checked":""}><span>${esc(s)}</span></label>`).join("")}</div></fieldset>`:""}
 <p class="err" id="v35lfE" role="alert"></p><div class="actions"><button type="button" class="btn ghost" id="v35lfOff">Turn off</button><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save filters</button></div></form></div>`,"v33sheet");
 document.querySelectorAll("#modal [data-close]").forEach(b=>b.onclick=closeModal);const F=document.getElementById("v35lfF");
 const done=r=>{if(r&&r.ok){closeModal();act(r,()=>{const y=scrollY;render();scrollTo(0,y)})}else document.getElementById("v35lfE").textContent=(r&&r.msg)||"That didn't save."};
 F.onsubmit=e=>{e.preventDefault();const o=readForm(F);done(A.leadFilters35({mi:+o.mi,min:+o.min,nob:!!o.nob,urg:!!o.urg,skip:o.skip||[]}))};
 document.getElementById("v35lfOff").onclick=()=>done(A.leadFilters35({}))}
{const op=v27Pipe;v27Pipe=function(j,m){let h=op.apply(this,arguments);try{if(!h||!m)return h;const w=v35Why(j,m);if(!w)return h;const u='<ul class="v27p-f" aria-label="Why this job fits">',i=h.indexOf(u);
  const li=`<li class="v35out">${I("sliders",12)}Outside your filters: ${esc(w)}</li>`;if(i>=0)return h.slice(0,i+u.length)+li+h.slice(i+u.length);return h+`<p class="v35out">${esc("Outside your filters: "+w)}</p>`}catch(e){}return h}}
{const ov=VIEWS.dash;VIEWS.dash=function(){let h=ov.apply(this,arguments);try{const m=me();if(!m||m.role!=="contractor"||m.staff)return h;const k=h.indexOf('id="v28new"');if(k<0)return h;const e=h.indexOf("</p>",k);if(e<0)return h;return h.slice(0,e+4)+v35LfBar(m,"dash")+h.slice(e+4)}catch(e){}return h}}
{const ov=VIEWS.jobs;VIEWS.jobs=function(){let h=ov.apply(this,arguments);try{const m=me();if(!m||m.role!=="contractor"||m.staff)return h;const a='<form class="filterbar" id="jf">',k=h.indexOf(a);if(k<0)return h;return h.slice(0,k)+v35LfBar(m,"jobs")+h.slice(k)}catch(e){}return h}}
for(const v of ["dash","jobs"]){const oa=AFTER[v];AFTER[v]=function(){const r=oa&&oa.apply(this,arguments);try{const b=document.getElementById("v35lfB");if(b)b.onclick=()=>v35LfModal()}catch(e){}return r}}

