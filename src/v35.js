/* ===== v35 ===== */
const V2_ACTIONS35=["pbSave35","pbDel35","pbImport35","leadFilters35","stmt35","tlogDay35","tlogCheck35","tlogSet35"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS35);
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
 f.onsubmit=e=>{e.preventDefault();const o=readForm(f);o.id=id;__when(A.pbSave35(o),r=>{if(r&&r.ok){closeModal();act(r,()=>{const y=scrollY;render();scrollTo(0,y)})}else document.getElementById("v35peE").textContent=(r&&r.msg)||"That didn't save."})}}
function v35PbBind(){const $=s=>document.getElementById(s);const f=$("v35pbF");if(!f)return;
 f.onsubmit=e=>{e.preventDefault();const o=readForm(f);__when(A.pbSave35(o),r=>{if(r&&r.ok){act(r,()=>{render();const d=$("v35d");if(d)d.focus()})}else $("v35pbE").textContent=(r&&r.msg)||"That didn't save."})};
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
   text, or download a CSV. One in-app statement per customer account per 24 hours, keyed on (pro, target uid) so a
   second customer row can't get around it. Payments stay in test mode. */
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
function v35StmtRecent(proId,target){return!!(target&&(DB.bcust||[]).some(x=>x&&x.by===proId&&x.uid===target&&x.stmt35&&v35Now()-x.stmt35<864e5))}
A.stmt35=function(cid){const m=me();if(!v7Pro(m))return{ok:false,msg:"Statements are part of The Office for pro accounts."};const c=v7Cust(cid);if(!c||c.by!==m.id)return{ok:false,msg:"That customer wasn't found."};
 /* v36 (SW-081): a row linked to a staff account (before the fix) gets the same "not on Sawyer" answer; nothing is delivered. */
 {const tu=c.uid&&U(c.uid);if(!tu||tu.staff||tu.role!=="customer")return{ok:false,msg:c.name+" isn't on __BRAND__ yet. Copy the statement and text or email it."}}
 const rows=v35StmtRows(m.id,c.id);if(!rows.length)return{ok:false,msg:c.name+" has no open invoices."};
 /* SW-077: one in-app statement per (pro, target uid) per 24h — a second customer row for the same person can't bypass it. */
 if(v35StmtRecent(m.id,c.uid))return{ok:false,msg:"You sent "+c.name+" a statement in the last 24 hours. One a day keeps it friendly."};
 const tot=rows.reduce((a,r)=>a+r.bal,0),at=v35Now();notify(c.uid,`${m.biz||nameOf(m)} sent you a statement: ${v7$(tot)} open on ${rows.length} invoice${rows.length===1?"":"s"}`,"stmt35:"+m.id);
 (DB.bcust||[]).forEach(x=>{if(x&&x.by===m.id&&x.uid===c.uid)x.stmt35=at});save();
 return{ok:true,msg:"Statement sent to "+c.name+" in __BRAND__"}};
/* v36 (SW-081): customer rows (and unpaid bills) that were linked to a staff account before the fix are unlinked once at start. */
function v36StaffUnlink(){const st=new Set((DB.users||[]).filter(u=>u&&u.staff).map(u=>u.id));if(!st.size)return 0;let n=0;
 (DB.bcust||[]).forEach(c=>{if(c&&c.uid&&st.has(c.uid)){c.uid=null;n++}});(DB.bills||[]).forEach(b=>{if(b&&b.cuid&&st.has(b.cuid)&&!(b.payments||[]).length){b.cuid=null;n++}});return n}
function v35Csv(name,rows){try{const blob=new Blob(["\ufeff"+v7CSV(rows)],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}catch(e){toast("Couldn't download the file","err")}}
function v35StmtModal(cid){const m=me(),c=v7Cust(cid);if(!m||!c)return;const rows=v35StmtRows(m.id,cid),tot=v35r2(rows.reduce((a,r)=>a+r.bal,0)),txt=v35StmtText(m,c,rows);
 const sentAt=v35StmtRecent(m.id,c.uid)||(c.stmt35&&v35Now()-c.stmt35<864e5);
 modal(`<div class="v35sm"><h2 id="mtitle">Statement for ${esc(c.name)}</h2><p class="muted small">${esc(m.biz||nameOf(m))} · ${esc(v7Today())}</p>
 <div class="tablewrap"><table class="v35st"><thead><tr><th scope="col">Invoice</th><th scope="col">Due</th><th scope="col" class="v35n v35st-x">Total</th><th scope="col" class="v35n v35st-x">Paid</th><th scope="col" class="v35n">Balance</th></tr></thead><tbody>${rows.map(r=>`<tr><th scope="row">${esc(r.no)}<small class="muted">${esc(r.title)}</small></th><td>${esc(r.due?v35Fmt(r.due):"—")}${r.late?`<small class="v35late">${r.late} days late</small>`:""}</td><td class="v35n v35st-x">${esc(v7$(r.total))}</td><td class="v35n v35st-x">${esc(v7$(r.paid))}</td><td class="v35n"><b>${esc(v7$(r.bal))}</b></td></tr>`).join("")}</tbody><tfoot><tr><th scope="row" colspan="2">Total open</th><td class="v35st-x"></td><td class="v35st-x"></td><td class="v35n"><b>${esc(v7$(tot))}</b></td></tr></tfoot></table></div>
 <label class="sr" for="v35stx">Statement text</label><textarea id="v35stx" class="v35stx" rows="4" readonly>${esc(txt)}</textarea>
 <p class="err" id="v35stE" role="alert"></p><div class="actions v35sm-a">${c.uid?`<button type="button" class="btn primary" id="v35stS" ${sentAt?"disabled":""}>${I("send",16)}${sentAt?"Sent today":"Send in __BRAND__"}</button>`:`<span class="muted small v35sm-n">${esc(c.name)} isn't on __BRAND__. Copy it and text or email it.</span>`}<button type="button" class="btn" id="v35stC">${I("copy",16)}Copy text</button><button type="button" class="btn" id="v35stD">${I("download",16)}CSV</button><button type="button" class="btn ghost" data-close>Close</button></div></div>`);
 document.querySelectorAll("#modal [data-close]").forEach(b=>b.onclick=closeModal);const $=s=>document.getElementById(s);
 if($("v35stS"))$("v35stS").onclick=()=>{const b=$("v35stS");b.disabled=true;__when(A.stmt35(cid),r=>{if(r&&r.ok){closeModal();act(r,()=>{const y=scrollY;render();scrollTo(0,y)})}else{$("v35stE").textContent=(r&&r.msg)||"That didn't send.";b.disabled=false}})};
 $("v35stC").onclick=()=>{const t=$("v35stx");const done=()=>toast("Statement copied");try{if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(done,()=>{t.select();document.execCommand("copy");done()});else{t.select();document.execCommand("copy");done()}}catch(e){t.select()}};
 $("v35stD").onclick=()=>v35Csv("statement-"+String(c.name).replace(/[^a-z0-9]+/gi,"-").toLowerCase().replace(/^-|-$/g,"")+"-"+v7Today()+".csv",[["Invoice","Title","Issued","Due","Total","Paid","Balance","Days late"],...rows.map(r=>[r.no,r.title,r.issued,r.due,r.total.toFixed(2),r.paid.toFixed(2),r.bal.toFixed(2),r.late]),["Total open","","","","","",tot.toFixed(2),""]])}
// customer side: /statement/<pro id> lists what's open with that pro, with Pay buttons (test mode)
VIEWS.statement=function(pid){const m=me();if(!m)return VIEWS.signup(null,{next:"/statement/"+(pid||"")});
 const bs=(DB.bills||[]).filter(b=>b.by===pid&&b.cuid===m.id&&b.type==="inv"&&b.status!=="draft"&&b.status!=="void"&&billCalc(b).bal>0.004).sort((a,b)=>(a.date||0)-(b.date||0));
 /* Idea 4: with nothing open, use the same generic empty page whether or not the pro exists (don't leak a business name). */
 if(!bs.length)return`<section class="page narrow v35cs"><a class="backlink" href="${href("bills")}">${I("back",16)}My invoices</a><h1>Statement</h1><p class="muted">${esc(v7Today())}</p>
 <div class="card">${empty("check","You're all paid up","Nothing is open on this statement.","")}</div></section>`;
 const tot=v35r2(bs.reduce((a,b)=>a+billCalc(b).bal,0)),biz=(bs[0]&&bs[0].bizName)||"Your pro";
 return`<section class="page narrow v35cs"><a class="backlink" href="${href("bills")}">${I("back",16)}My invoices</a><h1>Statement from ${esc(biz)}</h1><p class="muted">${esc(v7Today())} · ${bs.length} open invoice${bs.length===1?"":"s"}</p>
 <div class="card"><ul class="v35cs-l">${bs.map(b=>{const c=billCalc(b),n=v35Late(b);return`<li><div><b>${esc(b.no)} · ${esc(b.title||"Invoice")}</b><small class="muted">${b.due?"Due "+esc(b.due):""}${n?` · <span class="v35late">${n} days late</span>`:""}</small></div><b class="v35n">${esc(v7$(c.bal))}</b><a class="btn sm primary" href="${href("pay",b.id)}">${I("lock",14)}Pay</a></li>`}).join("")}</ul><div class="v35cs-t"><span>Total open</span><b class="v35n">${esc(v7$(tot))}</b></div></div><p class="muted small">Payments are in test mode during the beta. No real money moves.</p></section>`};
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
function v35Budget(j){const s=String(j&&j.budget||"");if(!s||/\b(per|each|an? hour|\/\s*(hr|hour|day|turn|visit))\b|tbd|open/i.test(s))return null;
 /* SW-079: a leading minus (e.g. "-500") is not a comparable amount — same as TBD. */
 /* v36 (SW-080): the same check for a Unicode minus (U+2212) and leading en/em dashes, via v25Neg. */
 if(v25Neg(s))return null;let mx=null;
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


/* (4) Check your check (traveling electricians). A hired traveler logs hours by day on the call page. Sawyer works out what
   the week should pay from the posted terms (rate, OT at 1.5x after 40 a week or after 8 a day, per diem by its posted unit)
   and, once the check stub is typed in, says whether it matches or is short, by how much. "Message <contractor>" sends a
   plain, polite summary through Sawyer; the log downloads as a CSV. Private to the traveler (m.tlog35). Not payroll or tax
   advice: it checks the math against the posting. */
function v35Iso(s){return/^\d{4}-\d{2}-\d{2}$/.test(String(s||""))?String(s):null}
function v35Add(s,n){const d=new Date(s+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function v35Mon(s){const d=new Date(s+"T12:00:00Z");const k=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-k);return d.toISOString().slice(0,10)}
function v35Hired(c,m){return!!(c&&m&&(c.apps||[]).some(a=>a&&a.uid===m.id&&a.status==="hired"))}
function v35Log(m,cid){const L=m&&m.tlog35&&m.tlog35[cid];return L&&typeof L==="object"?L:{d:{},chk:{},ot:"40w"}}
function v35Shape(c){const s=String(c.hours||"");let x=s.match(/(\d)\s*x\s*(\d{1,2})/i);if(x)return{days:Math.min(7,+x[1]),per:Math.min(16,+x[2])};const h=(typeof tHrs==="function"?tHrs(s):0)||50;const per=h>=50?10:8;return{days:Math.max(1,Math.min(7,Math.round(h/per))),per}}
function v35Week(c,L,mon){const x=tX(c),days=[0,1,2,3,4,5,6].map(i=>v35Add(mon,i)),hrs=days.map(d=>Math.max(0,+(L.d||{})[d]||0)),tot=hrs.reduce((a,h)=>a+h,0);
 let ot=0;if(L.ot==="8d"){ot=hrs.reduce((a,h)=>a+Math.max(h-8,0),0);const st0=tot-ot;if(st0>40)ot+=st0-40}else ot=Math.max(tot-40,0);const st=tot-ot;
 const wage=v35r2(st*c.rate+ot*c.rate*1.5),worked=hrs.filter(h=>h>0).length,u7=String(x.pdUnit||"").startsWith("7"),pdDays=u7?(worked?7:0):worked,pd=v35r2(pdDays*(+c.perDiem||0));
 const ck=(L.chk||{})[mon]||null;let dw=null,dp=null,diff=null;if(ck){if(ck.g!=null)dw=v35r2(ck.g-wage);if(ck.pd!=null)dp=v35r2(ck.pd-pd);if(dw!=null||dp!=null)diff=v35r2((dw||0)+(dp||0))}
 return{mon,days,hrs,tot:v35r2(tot),st:v35r2(st),ot:v35r2(ot),wage,worked,pdDays,u7,pd,exp:v35r2(wage+pd),ck,dw,dp,diff,unit:x.pdUnit}}
function v35Verdict(w){if(w.diff==null)return null;if(Math.abs(w.diff)<1)return{k:"ok",t:"Matches the posting"};return w.diff<0?{k:"short",t:"Short "+v7$(-w.diff)}:{k:"over",t:v7$(w.diff)+" more than expected"}}
A.tlogDay35=function(cid,date,hrs){const m=me(),c=TC(cid);if(!m)return{ok:false,need:"login",msg:"Sign in first"};if(!c||!v35Hired(c,m))return{ok:false,msg:"You can log hours on calls you were hired on."};
 const d=v35Iso(date);if(!d)return{ok:false,msg:"Pick a day."};const now=new Date(v35Now()).toISOString().slice(0,10);/* v36: the message says exactly what is checked: no day after the server's today (shown), none more than 400 days back. */
 if(d>now||d<v35Add(now,-400))return{ok:false,msg:"Log days up to today ("+v35Fmt(now)+"), from the last 400 days."};
 const raw=hrs===""||hrs==null?"":String(hrs).trim();
 /* SW-078: a leading minus is refused (HTTP 400) instead of being stripped to a positive number. */
 if(/^[-−]/.test(raw))return{ok:false,msg:"Hours must be from 0 to 24.",status:400};
 const n=raw===""?0:parseFloat(raw.replace(/[^0-9.]/g,""));if(!Number.isFinite(n)||n<0||n>24)return{ok:false,msg:"Hours must be from 0 to 24."};
 m.tlog35=m.tlog35&&typeof m.tlog35==="object"?m.tlog35:{};const L=m.tlog35[cid]=Object.assign({d:{},chk:{},ot:"40w"},m.tlog35[cid]||{});L.d=L.d||{};if(n>0)L.d[d]=Math.round(n*4)/4;else delete L.d[d];
 const ks=Object.keys(L.d).sort();while(ks.length>400)delete L.d[ks.shift()];save();return{ok:true}};
A.tlogCheck35=function(cid,mon,g,pd){const m=me(),c=TC(cid);if(!m)return{ok:false,need:"login",msg:"Sign in first"};if(!c||!v35Hired(c,m))return{ok:false,msg:"You can check pay on calls you were hired on."};
 const w=v35Iso(mon);if(!w||v35Mon(w)!==w)return{ok:false,msg:"Pick a week."};const num=v=>v===""||v==null?null:parseFloat(String(v).replace(/[$,\s]/g,""));const G=num(g),P=num(pd);
 if((G!=null&&(!Number.isFinite(G)||G<0||G>100000))||(P!=null&&(!Number.isFinite(P)||P<0||P>20000)))return{ok:false,msg:"Enter the amounts from your check stub (numbers only)."};
 m.tlog35=m.tlog35&&typeof m.tlog35==="object"?m.tlog35:{};const L=m.tlog35[cid]=Object.assign({d:{},chk:{},ot:"40w"},m.tlog35[cid]||{});L.chk=L.chk||{};
 if(G==null&&P==null)delete L.chk[w];else L.chk[w]={g:G==null?null:v35r2(G),pd:P==null?null:v35r2(P),at:v35Now()};const ks=Object.keys(L.chk).sort();while(ks.length>60)delete L.chk[ks.shift()];save();
 return{ok:true,msg:G==null&&P==null?"Check cleared":"Check saved"}};
A.tlogSet35=function(cid,o){const m=me(),c=TC(cid);if(!m)return{ok:false,need:"login",msg:"Sign in first"};if(!c||!v35Hired(c,m))return{ok:false,msg:"Only for calls you were hired on."};o=o||{};
 m.tlog35=m.tlog35&&typeof m.tlog35==="object"?m.tlog35:{};const L=m.tlog35[cid]=Object.assign({d:{},chk:{},ot:"40w"},m.tlog35[cid]||{});L.ot=o.ot==="8d"?"8d":"40w";save();return{ok:true,msg:L.ot==="8d"?"Overtime after 8 hours a day (and 40 a week)":"Overtime after 40 hours a week"}};
const V35_DN=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
function v35Fmt(s){try{return new Date(s+"T12:00:00Z").toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"UTC"})}catch(e){return s}}
function v35Hrs(n){return(Math.round(n*100)/100).toLocaleString("en-US")}
function v35Msg(c,w,m){const p=U(c.by)||{},first=String(p.name||nameOf(p)||"there").split(/\s+/)[0];
 return`Hi ${first}, checking my check for the week of ${v35Fmt(w.mon)} on "${String(c.title||"").replace(/\s*\(demo\)\s*$/i,"")}". I logged ${v35Hrs(w.tot)} hrs (${v35Hrs(w.st)} straight + ${v35Hrs(w.ot)} OT at 1.5x) at ${v7$(c.rate)}/hr = ${v7$(w.wage)} in wages, plus ${v7$(w.pd)} per diem (${w.pdDays} days at ${v7$(c.perDiem||0)}).`+
 (w.ck?` The check showed ${w.ck.g!=null?v7$(w.ck.g)+" wages":""}${w.ck.g!=null&&w.ck.pd!=null?" and ":""}${w.ck.pd!=null?v7$(w.ck.pd)+" per diem":""}${w.diff!=null&&Math.abs(w.diff)>=1?", "+(w.diff<0?v7$(-w.diff)+" short":v7$(w.diff)+" over"):""}.`:"")+` Could you take a look? Thanks, ${String(m.name||"").split(/\s+/)[0]||"me"}`}
function v35CheckCard(c,m,q){const L=v35Log(m,c.id),today=new Date(v35Now()).toISOString().slice(0,10),cur=v35Mon(today);const off=Math.max(-52,Math.min(0,parseInt((q||{}).w35,10)||0));const mon=v35Add(cur,off*7);
 const w=v35Week(c,L,mon),v=v35Verdict(w),sh=v35Shape(c),p=U(c.by)||{};
 const weeks=[...new Set(Object.keys(L.d||{}).concat(Object.keys(L.chk||{})).map(v35Mon))].sort().reverse().slice(0,4);
 const grid=w.days.map((d,i)=>`<div class="v35d ${d===today?"today":""} ${d>today?"fut":""}"><label for="v35h${i}">${V35_DN[i]}<small>${esc(v35Fmt(d))}</small></label><input id="v35h${i}" data-v35day="${d}" inputmode="decimal" value="${w.hrs[i]?esc(v35Hrs(w.hrs[i])):""}" placeholder="0" ${d>today?"disabled":""} aria-label="Hours worked ${V35_DN[i]} ${esc(v35Fmt(d))}"></div>`).join("");
 return`<section class="card v35cc" id="v35cc" aria-labelledby="v35cch"><div class="o7-sh"><h2 id="v35cch">${I("calc",18)} Check your check</h2><span class="muted small">${esc(v7$(c.rate))}/hr · ${esc(v7$(c.perDiem||0))} per diem, ${esc(String(w.unit||"").toLowerCase())}</span></div>
 <p class="muted small">Log your hours each day. __BRAND__ works out what the week should pay from the posted terms, then checks your stub against it. Only you see this.</p>
 <div class="v35wk"><a class="btn sm ghost" href="${href("tcall",c.id,{w35:off-1})}" aria-label="Previous week">${I("left",16)}</a><b>Week of ${esc(v35Fmt(mon))}${off===0?" (this week)":""}</b>${off<0?`<a class="btn sm ghost" href="${href("tcall",c.id,off+1?{w35:off+1}:null)}" aria-label="Next week">${I("right",16)}</a>`:`<span class="v35wk-sp"></span>`}</div>
 ${c.start&&v35Add(mon,6)<c.start?`<p class="v35pre" role="note">${I("info",14)}This week is before the posted start date (${esc(v35Fmt(c.start))}). Log it if you started early or had paid orientation.</p>`:""}<div class="v35days">${grid}</div>
 <div class="v35tools"><button type="button" class="btn sm" id="v35fill" data-days="${sh.days}" data-per="${sh.per}">${I("timer",14)}Fill ${sh.days}×${sh.per}s</button><label class="v35ot"><span>Overtime</span><select id="v35ot" aria-label="Overtime rule"><option value="40w" ${L.ot!=="8d"?"selected":""}>after 40 hrs a week</option><option value="8d" ${L.ot==="8d"?"selected":""}>after 8 hrs a day</option></select></label></div>
 <dl class="v35sum"><div><dt>Hours</dt><dd>${esc(v35Hrs(w.tot))}<small>${esc(v35Hrs(w.st))} straight · ${esc(v35Hrs(w.ot))} OT</small></dd></div><div><dt>Wages (before tax)</dt><dd>${esc(v7$(w.wage))}</dd></div><div><dt>Per diem</dt><dd>${esc(v7$(w.pd))}<small>${w.pdDays} day${w.pdDays===1?"":"s"} × ${esc(v7$(c.perDiem||0))}</small></dd></div><div class="tot"><dt>Should pay</dt><dd>${esc(v7$(w.exp))}</dd></div></dl>
 <form class="v35chk" id="v35chk" novalidate><h3>What the check said</h3><div class="v35chk-g"><div class="fld"><label for="v35cg">Gross wages</label><div class="v33amt"><span aria-hidden="true">$</span><input id="v35cg" name="g" inputmode="decimal" value="${w.ck&&w.ck.g!=null?esc(w.ck.g.toFixed(2)):""}" placeholder="0.00"></div></div><div class="fld"><label for="v35cp">Per diem paid</label><div class="v33amt"><span aria-hidden="true">$</span><input id="v35cp" name="pd" inputmode="decimal" value="${w.ck&&w.ck.pd!=null?esc(w.ck.pd.toFixed(2)):""}" placeholder="0.00"></div></div><button class="btn primary sm">Check it</button></div>
 ${v?`<p class="v35v v35v-${v.k}" role="status">${I(v.k==="ok"?"check":"alertTri",16)}<b>${esc(v.t)}</b>${v.k!=="ok"?`<span>${w.dw!=null&&Math.abs(w.dw)>=1?`Wages ${w.dw<0?"short "+esc(v7$(-w.dw)):"over "+esc(v7$(w.dw))}. `:""}${w.dp!=null&&Math.abs(w.dp)>=1?`Per diem ${w.dp<0?"short "+esc(v7$(-w.dp)):"over "+esc(v7$(w.dp))}.`:""}</span>`:""}</p>`:""}<p class="err" id="v35ccE" role="alert"></p></form>
 <div class="v35cc-a">${w.tot>0?`<button type="button" class="btn sm" id="v35msg">${I("chat",14)}Message ${esc(String(p.name||nameOf(p)||"the contractor").split(/\s+/)[0])} about this week</button>`:""}${Object.keys(L.d||{}).length?`<button type="button" class="btn sm ghost" id="v35csv">${I("download",14)}Download hours (CSV)</button>`:""}</div>
 ${weeks.length?`<div class="v35rw"><h3>Recent weeks</h3><ul>${weeks.map(k=>{const x=v35Week(c,L,k),vv=v35Verdict(x),o=Math.round((new Date(k+"T12:00:00Z")-new Date(cur+"T12:00:00Z"))/(7*864e5));return`<li class="${k===mon?"on":""}"><a href="${href("tcall",c.id,o?{w35:o}:null)}">${esc(v35Fmt(k))}</a><span>${esc(v35Hrs(x.tot))} hrs</span><span class="v35n">${esc(v7$(x.exp))}</span>${vv?`<span class="v35v-${vv.k} v35tag">${esc(vv.t)}</span>`:`<span class="muted small">no check yet</span>`}</li>`}).join("")}</ul></div>`:""}
 <p class="muted small v35cc-n">Checks the math against the posting. It isn't payroll or tax advice; taxes and deductions come out of the gross.</p></section>`}
{const ov=VIEWS.tcall;VIEWS.tcall=(id,q)=>{let h=ov(id,q);try{const c=TC(id),m=me();if(!c||!m||!v35Hired(c,m))return h;const card=v35CheckCard(c,m,q);
  const k=h.indexOf('<section class="card v7trip">');if(k>=0){const e=h.indexOf("</section>",k);if(e>0)return h.slice(0,e+10)+card+h.slice(e+10)}
  const i=h.indexOf('<dl class="t5facts">');return i>=0?h.slice(0,i)+card+h.slice(i):h+card}catch(e){console.warn(e)}return h}}
{const oa=AFTER.tcall;AFTER.tcall=(id,q)=>{oa&&oa(id,q);try{const c=TC(id),m=me();if(!c||!m||!document.getElementById("v35cc"))return;const $=s=>document.getElementById(s);const keep=()=>{const y=scrollY;render();scrollTo(0,y)};
  document.querySelectorAll("[data-v35day]").forEach(inp=>inp.onchange=()=>{__when(A.tlogDay35(id,inp.dataset.v35day,inp.value),r=>{if(r&&r.ok){setTimeout(()=>{const f=document.activeElement&&document.activeElement.id;keep();if(f&&/^v35h\d$/.test(f)){const e=document.getElementById(f);if(e)try{e.focus({preventScroll:true})}catch(x){}}},0)}else{$("v35ccE").textContent=(r&&r.msg)||"That didn't save."}})});
  if($("v35fill"))$("v35fill").onclick=()=>{const n=+$("v35fill").dataset.days,per=+$("v35fill").dataset.per;const today=new Date(v35Now()).toISOString().slice(0,10);
   const jobs=[...document.querySelectorAll("[data-v35day]")].slice(0,n).filter(inp=>!(inp.disabled||inp.dataset.v35day>today||inp.value)).map(inp=>Promise.resolve(A.tlogDay35(id,inp.dataset.v35day,per)));
   Promise.all(jobs).then(rs=>{const bad=rs.find(r=>!r||!r.ok);if(bad)toast(bad.msg||"Some days didn't save","err");keep()})};
  if($("v35ot"))$("v35ot").onchange=()=>act(A.tlogSet35(id,{ot:$("v35ot").value}),keep);
  if($("v35chk"))$("v35chk").onsubmit=e=>{e.preventDefault();const o=readForm($("v35chk"));const L=v35Log(m,id),today=new Date(v35Now()).toISOString().slice(0,10),off=Math.max(-52,Math.min(0,parseInt((q||{}).w35,10)||0)),mon=v35Add(v35Mon(today),off*7);
   __when(A.tlogCheck35(id,mon,o.g,o.pd),r=>{if(r&&r.ok)act(r,keep);else $("v35ccE").textContent=(r&&r.msg)||"That didn't save."})};
  if($("v35msg"))$("v35msg").onclick=()=>{const L=v35Log(m,id),today=new Date(v35Now()).toISOString().slice(0,10),off=Math.max(-52,Math.min(0,parseInt((q||{}).w35,10)||0)),w=v35Week(c,L,v35Add(v35Mon(today),off*7));const p=U(c.by)||{};
   modal(`<h2 id="mtitle">Message ${esc(nameOf(p))}</h2><form id="v35mF" class="form"><div class="fld"><label for="v35mt">Message</label><textarea id="v35mt" rows="7" maxlength="2000">${esc(v35Msg(c,w,m))}</textarea><small class="muted">Goes to ${esc(nameOf(p))} as a __BRAND__ message. Edit anything first.</small></div><p class="err" id="v35mE" role="alert"></p><div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary" id="v35mS">${I("send",16)}Send</button></div></form>`);
   document.querySelectorAll("#modal [data-close]").forEach(b=>b.onclick=closeModal);const F=$("v35mF");F.onsubmit=ev=>{ev.preventDefault();if(F.__busy)return;F.__busy=1;$("v35mS").disabled=true;__when(A.send(c.by,$("v35mt").value),r=>{if(r&&r.ok!==false){closeModal();toast("Sent to "+nameOf(p))}else{F.__busy=0;$("v35mS").disabled=false;$("v35mE").textContent=(r&&r.msg)||"That didn't send."}})}};
  if($("v35csv"))$("v35csv").onclick=()=>{const L=v35Log(m,id);const days=Object.keys(L.d||{}).sort();const rows=[["Date","Day","Hours","Call","Rate","Per diem"]];days.forEach(d=>rows.push([d,V35_DN[(new Date(d+"T12:00:00Z").getUTCDay()+6)%7],L.d[d],c.title,c.rate,c.perDiem||0]));
   const ws=[...new Set(days.map(v35Mon))].sort();rows.push([]);rows.push(["Week of","Hours","Straight","OT","Wages","Per diem","Should pay","Check wages","Check per diem","Difference"]);ws.forEach(k=>{const x=v35Week(c,L,k);rows.push([k,x.tot,x.st,x.ot,x.wage.toFixed(2),x.pd.toFixed(2),x.exp.toFixed(2),x.ck&&x.ck.g!=null?x.ck.g.toFixed(2):"",x.ck&&x.ck.pd!=null?x.ck.pd.toFixed(2):"",x.diff!=null?x.diff.toFixed(2):""])});
   v35Csv("hours-"+String(c.title||"call").replace(/\(demo\)/i,"").replace(/[^a-z0-9]+/gi,"-").toLowerCase().replace(/^-|-$/g,"").slice(0,40)+".csv",rows)}}catch(e){console.warn(e)}}}
// the traveler dashboard points at it
{const ov=VIEWS.tdash;if(typeof ov==="function")VIEWS.tdash=function(p,q){let h=ov.apply(this,arguments);try{const m=me();if(!m||!m.trav)return h;const cs=(DB.tcalls||[]).filter(c=>v35Hired(c,m));if(!cs.length)return h;
  const today=new Date(v35Now()).toISOString().slice(0,10),mon=v35Mon(today);const li=cs.slice(0,3).map(c=>{const w=v35Week(c,v35Log(m,c.id),mon);return`<li><a href="${href("tcall",c.id)}"><b>${esc(String(c.title).replace(/\s*\(demo\)$/i,""))}</b><small class="muted">This week: ${esc(v35Hrs(w.tot))} hrs logged · should pay ${esc(v7$(w.exp))}</small></a></li>`}).join("");
  const card=`<div class="wrap v35td-w"><section class="card v35td" id="v35td"><h2>${I("calc",18)} Check your check</h2><ul>${li}</ul><p class="muted small">Log hours on the call page and compare your stub with the posted terms.</p></section></div>`;
  const k=h.indexOf("</h1>");if(k<0)return h+card;const e=h.indexOf("</header>",k);const at=e>0?e+9:-1;return at>0?h.slice(0,at)+card+h.slice(at):h+card}catch(e){}return h}}

/* demo data: last week logged (6x10s) with a stub $230 short for the demo traveler (server-side, once per database) */
function seedTlog35(){try{if(!DB||!Array.isArray(DB.users))return false;let ch=false;const now=v35Now();
 const tv=DB.users.find(u=>u.id==="tv1"&&u.demo),c=(DB.tcalls||[]).find(x=>x.id==="tcd1");
 if(tv&&c&&!tv.tlog35&&v35Hired(c,tv)){const today=new Date(now).toISOString().slice(0,10),mon=v35Mon(today),last=v35Add(mon,-7),d={};for(let i=0;i<6;i++)d[v35Add(last,i)]=10;for(let i=0;i<7;i++){const k=v35Add(mon,i);if(k<today&&i<6)d[k]=10}
  const L={d,chk:{},ot:"40w"};const w=v35Week(c,L,last);L.chk[last]={g:v35r2(w.wage-230),pd:w.pd,at:now};tv.tlog35={[c.id]:L};ch=true}
 if(ch)save();return ch}catch(e){return false}}
if(v35OnServer()&&typeof DB!=="undefined"&&DB&&DB.users){seedTlog35()}
{const os=seed;seed=function(){const r=os.apply(this,arguments);try{if(v35OnServer())seedTlog35()}catch(e){}return r}}
