/* ===== v35 ===== */
const V2_ACTIONS35=["pbSave35","pbDel35","pbImport35"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS35);
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
