"use strict";
/* ===== v12: pro profile (priced services, real-photo portfolio + lightbox, response stats, service-area check, book a consult),
   home log (past jobs, warranties, maintenance), PM project board (staffing + Gantt-lite), profile completeness + Google/Facebook import (demo),
   marketing (share link + QR, review requests, embeddable widget), review reports + moderation queue ===== */
/* v13 perf: the home log, project board, moderation queue, marketing tab and import dialog ship in a separate
   file (src/v12-lazy.js) that loads only when one of those opens. The build fills in its hashed URL. */
const LZ12={ok:false,busy:false,cbs:[],src:"/js/lz12.357881aad9.js"};
function lz12(cb){if(LZ12.ok){cb&&cb();return}if(cb)LZ12.cbs.push(cb);if(LZ12.busy||typeof document==="undefined")return;LZ12.busy=true;
 const e=document.createElement("script");e.src=LZ12.src;e.async=true;e.onload=()=>{LZ12.ok=true;LZ12.busy=false;const c=LZ12.cbs.splice(0);c.forEach(f=>{try{f()}catch(x){console.error(x)}})};
 e.onerror=()=>{LZ12.busy=false;LZ12.cbs.length=0;e.remove();if(typeof toast==="function")toast("That page didn't load. Check your connection and try again.","err")};document.head.appendChild(e)}
const lz12Sk=()=>`<div class="lz12" aria-busy="true" aria-live="polite"><span class="sr-only">Loading…</span><i style="height:30px;width:38%"></i><i style="height:16px;width:62%"></i><div class="lz12-r"><i></i><i></i><i></i><i></i></div><i style="height:260px"></i></div>`;
function lz12View(k,a){const m=me();if(!m)return VIEWS.signup(null,{next:"/"+k});const r=ROUTE&&ROUTE.v;lz12(()=>{if(typeof ROUTE==="undefined"||!ROUTE||ROUTE.v===r)v12Rerender()});return`<section class="page"><div class="wrap">${lz12Sk()}</div></section>`}
/* warm the cache once the page is idle for people likely to need it */
if(typeof window!=="undefined"&&window.addEventListener)window.addEventListener("load",()=>{const go=()=>{try{const m=me();if(m&&(m.role==="customer"||m.role==="pm"||m.staff||m.role==="contractor")){const l=document.createElement("link");l.rel="prefetch";l.as="script";l.href=LZ12.src;document.head.appendChild(l)}}catch(e){}};setTimeout(()=>window.requestIdleCallback?requestIdleCallback(go,{timeout:4000}):go(),2500)});
const V12_ACTIONS=["setMenu12","setGal12","setConsult12","consultBook","consultSet","homeTask12","homeItem12","homeItemDel12","importProfile12","rreqSend12","rreqRemind12","reportReview12","modDecide12","setRoleDates12"];
if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V12_ACTIONS);
Object.assign(IP,Object.fromEntries(Object.entries({
 megaphone:'<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 8a5 5 0 0 1 0 8M18 5a9 9 0 0 1 0 14"/>',
 qr:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
 flag:'<path d="M4 22V4M4 4h12l-2 4 2 4H4"/>',
 code:'<path d="m8 6-6 6 6 6M16 6l6 6-6 6"/>',
 copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
 gantt:'<path d="M3 4v16h18"/><rect x="6" y="6" width="8" height="3" rx="1"/><rect x="9" y="11" width="9" height="3" rx="1"/><rect x="7" y="16" width="6" height="2" rx="1"/>',
 tool:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
 download:'<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
 printer:'<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
 left:'<path d="m15 18-6-6 6-6"/>',
 right:'<path d="m9 18 6-6-6-6"/>',
 import:'<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/>',
 cal:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
 house:'<path d="M3 11 12 3l9 8"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>'
}).filter(([k])=>!IP[k])));
const v12E=s=>esc(String(s==null?"":s));
const v12Nm=u=>u?String(u.biz||nameOf(u)).replace(/ \(demo\)$/,""):"Someone";
const v12Origin=()=>{try{return location.origin&&/^https?:/.test(location.origin)?location.origin:"https://sawyer.app"}catch(e){return"https://sawyer.app"}};
const v12PubUrl=(u,src)=>v12Origin()+"/p/"+u.id+(src?"?ref="+src:"");
const v12Day=t=>new Date(t).toISOString().slice(0,10);
function v12Copy(t,msg){try{navigator.clipboard&&navigator.clipboard.writeText(t).catch(()=>{})}catch(e){}toast(msg||"Copied")}
function v12Rerender(){const y=scrollY;render();scrollTo(0,y)}

/* ------------------------------------------------------------------ */
/* 1) PRO PROFILE: priced services, photo portfolio, stats, area, consults */
/* ------------------------------------------------------------------ */
const M12UNITS={job:"per job",hr:"per hour",visit:"per visit",sqft:"per sq ft"};
function v12Menu(u){const set=Array.isArray(u.menu12)&&u.menu12.length>0;const base=(EST_BASE[u.trade]||[150,900])[0];
 return{set,base,rows:set?u.menu12:(u.subs||[]).map(s=>({s,from:null,unit:"job",note:""}))}}
const v12Price=(x,base)=>x.from!=null&&x.from!==""?`<b class="m12-p">From ${money(x.from)}</b><small>${esc(M12UNITS[x.unit]||"per job")}</small>`:`<b class="m12-p m12-typ">Typical ${money(base)}+</b><small>Sawyer price guide</small>`;
function v12MenuHTML(u,own){const mn=v12Menu(u);const subs=CATS[u.trade]||[];
 return`<div class="m12">${mn.rows.length?mn.rows.map(x=>`<div class="m12-r"><div class="m12-n"><b>${esc(x.s)}</b>${x.note?`<small>${esc(x.note)}</small>`:""}</div><div class="m12-pr">${v12Price(x,mn.base)}</div>${own?"":`<a class="btn sm" href="${href("post",null,{invite:u.id,cat:u.trade,sub:subs.includes(x.s)?x.s:"",title:x.s})}" aria-label="Request ${esc(x.s)}">Request</a>`}</div>`).join(""):`<p class="muted">No services listed yet.</p>`}</div>
 <p class="small muted m12-note">${I("info",13)} ${mn.set?"Starting prices set by "+esc(v12Nm(u))+". Your final quote depends on the job; it's always written down before work starts.":"This pro hasn't set prices yet, so these are typical starting prices for the area from Sawyer's price guide."}</p>${own?`<button class="btn sm" id="m12Edit" type="button">${I("edit",14)}${mn.set?"Edit prices":"Set your prices"}</button>`:""}`}
A.setMenu12=function(list){const m=me();if(!m||m.role!=="contractor")return{ok:false,msg:"Pro accounts only"};const rows=(Array.isArray(list)?list:[]).slice(0,20).map(x=>({s:v7S(x&&x.s,60).replace(/\s+/g," "),from:x&&String(x.from==null?"":x.from).trim()!==""?v7N(x.from,0,1e6,null):null,unit:M12UNITS[x&&x.unit]?x.unit:"job",note:v7S(x&&x.note,120)})).filter(x=>x.s.length>=2);
 if(!rows.length)return{ok:false,msg:"Add at least one service"};m.menu12=rows;save();return{ok:true,msg:"Prices saved. Customers see them on your profile."}};
function m12Modal(){const m=me();const mn=v12Menu(m);const row=(x,i)=>`<div class="m12-er" data-i="${i}"><input name="s" aria-label="Service" value="${esc(x.s||"")}" maxlength="60" placeholder="Service"><span class="m12-cur">$</span><input name="from" aria-label="Starting price" inputmode="decimal" value="${x.from==null?"":esc(x.from)}" placeholder="${mn.base}"><select name="unit" aria-label="Price unit">${Object.entries(M12UNITS).map(([k,v])=>`<option value="${k}" ${x.unit===k?"selected":""}>${v}</option>`).join("")}</select><input name="note" aria-label="Note" value="${esc(x.note||"")}" maxlength="120" placeholder="What's included (optional)"><button type="button" class="iconbtn" data-m12x aria-label="Remove ${esc(x.s||"row")}">${I("x",16)}</button></div>`;
 modal(`<h2>Your services &amp; starting prices</h2><p class="muted small">Customers hate surprise pricing. A "from" price sets expectations; you still quote every job. Leave a price blank to show the area's typical range.</p><form id="m12F"><div id="m12L">${mn.rows.map(row).join("")}</div><button type="button" class="linkbtn" id="m12Add">${I("plus",14)}Add a service</button><div class="row end m12-act"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save prices</button></div></form>`,"wide");
 const L=document.getElementById("m12L");const bind=()=>L.querySelectorAll("[data-m12x]").forEach(b=>b.onclick=()=>b.closest(".m12-er").remove());bind();
 document.getElementById("m12Add").onclick=()=>{L.insertAdjacentHTML("beforeend",row({s:"",from:null,unit:"job",note:""},L.children.length));bind();L.lastElementChild.querySelector("input").focus()};
 document.querySelectorAll("#modal [data-close]").forEach(b=>b.onclick=closeModal);
 document.getElementById("m12F").onsubmit=e=>{e.preventDefault();const list=[...L.querySelectorAll(".m12-er")].map(r=>({s:r.querySelector('[name="s"]').value,from:r.querySelector('[name="from"]').value,unit:r.querySelector('[name="unit"]').value,note:r.querySelector('[name="note"]').value}));act(A.setMenu12(list),()=>{closeModal();v12Rerender()})}}

/* portfolio: real photos (pro uploads), lightbox */
const G12OK=s=>UPLOAD_RE.test(String(s||""));/* SW-008: only the pro's own uploads */
const g12Thumb=s=>/^\/img\/g-/.test(s)?s.replace(/\.webp$/,"-sm.webp"):s;
A.setGal12=function(list){const m=me();if(!m||m.role!=="contractor")return{ok:false,msg:"Pro accounts only"};const rows=(Array.isArray(list)?list:[]).slice(0,12).filter(x=>x&&G12OK(x.src)).map(x=>({src:String(x.src),cap:v7S(x.cap,90),tag:["before","after","finished","in-progress"].includes(x.tag)?x.tag:"finished",date:+x.date||Date.now()}));
 if(Array.isArray(list)&&list.length&&!rows.length)return{ok:false,msg:"Those photos couldn't be added. Upload them again from your device."};/* v13 SW-037: only an explicit [] clears */
 m.gal12=rows;save();return{ok:true,msg:rows.length?"Portfolio saved":"Portfolio cleared"}};
function g12Grid(u,own){const g=u.gal12||[];const vp=typeof verifiedPhotos==="function"?verifiedPhotos(u.id).filter(p=>UPLOAD_RE.test(p.src||"")):[];const all=g.map(x=>({src:x.src,cap:x.cap,tag:x.tag,ver:false})).concat(vp.map(p=>({src:p.src,cap:p.cap||"",tag:p.kind,ver:true})));
 if(!all.length)return own?`<div class="g12-empty">${I("camera",22)}<div><b>Add photos of your work</b><small>Real job photos are the #1 thing customers look at. Up to 12.</small></div><button class="btn sm primary" id="g12Edit" type="button">Add photos</button></div>`:"";
 const TAG={before:"Before",after:"After",finished:"Finished","in-progress":"In progress"};
 return`<div class="g12" data-n="${all.length}">${all.slice(0,5).map((x,i)=>`<button type="button" class="g12-i ${i===0?"g12-big":""}" data-g12="${i}"><img src="${esc(i===0?x.src:g12Thumb(x.src))}" alt="Open photo ${i+1} of ${all.length}: ${esc(x.cap||u.trade+" job photo")}" loading="lazy" decoding="async" width="${i===0?640:320}" height="${i===0?480:240}">${x.ver?`<span class="g12-ver">${I("check",11)}Customer-confirmed</span>`:`<span class="g12-tag">${TAG[x.tag]||"Finished"}</span>`}${i===4&&all.length>5?`<span class="g12-more">+${all.length-5} more</span>`:""}</button>`).join("")}</div>
 <p class="small muted g12-n">${I("camera",13)} ${all.length} photo${all.length>1?"s":""}${vp.length?` · ${vp.length} confirmed by customers after the job`:""}. Tap any photo to see it full size.</p>${own?`<button class="btn sm" id="g12Edit" type="button">${I("edit",14)}Manage photos</button>`:""}`}
function g12All(u){const vp=typeof verifiedPhotos==="function"?verifiedPhotos(u.id).filter(p=>UPLOAD_RE.test(p.src||"")):[];return(u.gal12||[]).map(x=>({src:x.src,cap:x.cap})).concat(vp.map(p=>({src:p.src,cap:(p.cap||"")+" · confirmed by the customer"})))}
function g12Light(u,i){const all=g12All(u);if(!all.length)return;let k=Math.max(0,Math.min(all.length-1,i));
 const draw=()=>{const x=all[k];modal(`<h2 class="sr-only">Photo ${k+1} of ${all.length}</h2><figure class="lb12"><img src="${esc(x.src)}" alt="${esc(x.cap||"Job photo")}"><figcaption><b>${esc(x.cap||"")}</b><span>${k+1} / ${all.length}</span></figcaption></figure>${all.length>1?`<button class="lb12-nav lb12-p" type="button" aria-label="Previous photo">${I("left",22)}</button><button class="lb12-nav lb12-n" type="button" aria-label="Next photo">${I("right",22)}</button>`:""}`,"lb12box");
  const p=document.querySelector(".lb12-p"),n=document.querySelector(".lb12-n");if(p)p.onclick=()=>{k=(k-1+all.length)%all.length;draw()};if(n)n.onclick=()=>{k=(k+1)%all.length;draw()}};
 draw();const key=e=>{const md=document.getElementById("modal");if(!md||md.hidden||!document.querySelector(".lb12")){removeEventListener("keydown",key);return}if(e.key==="ArrowLeft"){k=(k-1+all.length)%all.length;draw()}if(e.key==="ArrowRight"){k=(k+1)%all.length;draw()}};addEventListener("keydown",key)}
function g12Modal(){const m=me();let g=(m.gal12||[]).map(x=>Object.assign({},x));
 const draw=()=>{modal(`<h2>Your work photos</h2><p class="muted small">Real photos of your own jobs, up to 12. The first one is your cover. Photos customers confirm after a job are added automatically and marked "Customer-confirmed".</p>
  <ul class="g12-ed">${g.map((x,i)=>`<li><img src="${esc(g12Thumb(x.src))}" alt="" width="96" height="72"><input aria-label="Caption for photo ${i+1}" data-cap="${i}" value="${esc(x.cap||"")}" maxlength="90" placeholder="Caption, e.g. 50-gal water heater swap"><select aria-label="Photo type" data-tag="${i}">${[["finished","Finished"],["before","Before"],["after","After"],["in-progress","In progress"]].map(([k,t])=>`<option value="${k}" ${x.tag===k?"selected":""}>${t}</option>`).join("")}</select><div class="g12-eb">${i?`<button type="button" class="iconbtn" data-up="${i}" aria-label="Move photo ${i+1} up">${I("left",15)}</button>`:""}<button type="button" class="iconbtn" data-rm="${i}" aria-label="Remove photo ${i+1}">${I("x",15)}</button></div></li>`).join("")||`<li class="muted small">No photos yet.</li>`}</ul>
  ${g.length<12?`<label class="btn sm" for="g12f">${I("camera",15)}Add photos</label><input id="g12f" type="file" accept="image/jpeg,image/png,image/webp" multiple class="sr-only">`:""}<p class="small muted" id="g12s" aria-live="polite"></p><div class="row end"><button type="button" class="btn ghost" data-close>Cancel</button><button type="button" class="btn primary" id="g12Save">Save photos</button></div>`,"wide");
  const pull=()=>{document.querySelectorAll("[data-cap]").forEach(e=>g[+e.dataset.cap].cap=e.value);document.querySelectorAll("[data-tag]").forEach(e=>g[+e.dataset.tag].tag=e.value)};
  document.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{pull();g.splice(+b.dataset.rm,1);draw()});
  document.querySelectorAll("[data-up]").forEach(b=>b.onclick=()=>{pull();const i=+b.dataset.up;[g[i-1],g[i]]=[g[i],g[i-1]];draw()});
  const fi=document.getElementById("g12f");if(fi)fi.onchange=async()=>{pull();const st=document.getElementById("g12s");const files=[...fi.files].slice(0,12-g.length);let n=0;for(const f0 of files){st.textContent=`Uploading ${++n} of ${files.length}…`;try{const f1=typeof r10shrink==="function"?await r10shrink(f0):f0;g.push({src:await v2upload(f1),cap:"",tag:"finished",date:Date.now()})}catch(err){toast(err.message,"err")}}draw()};
  document.getElementById("g12Save").onclick=()=>{pull();act(A.setGal12(g),()=>{closeModal();v12Rerender()})};document.querySelectorAll("#modal [data-close]").forEach(b=>b.onclick=closeModal)};draw()}

/* response + track-record stats, all computed from real activity */
function v12Stats(u){const rs=respStats(u.id)||{n:0};const D90=Date.now()-90*864e5;const qs=(DB.quotes||[]).filter(q=>q.cid===u.id);const q90=qs.filter(q=>q.date>D90).length;const acc=qs.filter(q=>q.status==="accepted").length;
 const done=(DB.jobs||[]).filter(j=>j.hired===u.id&&j.status==="completed");const per={};done.forEach(j=>per[j.cust]=(per[j.cust]||0)+1);const repeat=Object.values(per).filter(n=>n>1).length;
 const out=[["zap",rs.n?mins(rs.med):"Not yet",rs.n?`median first reply (${rs.n} conversation${rs.n>1?"s":""})`:"reply time shows after a few customers reach out"],
  ["shield",String(typeof verifiedJobs==="function"?verifiedJobs(u.id):done.length),"jobs confirmed done by the customer"],["quote",String(q90),"quotes sent in the last 90 days"],["check",qs.length>=3?Math.round(acc/qs.length*100)+"%":"–",qs.length>=3?"of quotes turned into a hire":"hire rate shows after 3 quotes"],
  ["users",String(repeat),repeat===1?"customer hired them again":"customers hired them again"],["cal",u.joined?new Date(u.joined).toLocaleDateString("en-US",{month:"short",year:"numeric"}):"–","on Sawyer since"]];
 return`<div class="st12" role="list">${out.map(([ic,b,s])=>`<div class="st12-i" role="listitem"><span>${I(ic,17)}</span><b>${esc(b)}</b><small>${esc(s)}</small></div>`).join("")}</div>`}

/* service area: towns covered + "do you come to my ZIP?" */
function v12Towns(u){const r=+u.radius||25;const seen=new Set();return Object.keys(ZIPS).map(z=>({z,d:dist(u.zip,z),t:ZIPS[z][0]})).filter(x=>x.d<=r&&!seen.has(x.t)&&seen.add(x.t)).sort((a,b)=>a.d-b.d).slice(0,14)}
function v12AreaHTML(u){const ts=v12Towns(u);return`<div class="ar12"><div class="ar12-t"><b>${I("pin",15)}Towns covered</b><div class="ar12-c">${ts.map(x=>`<span>${esc(x.t.replace(/, [A-Z]{2}$/,""))}<small>${x.d} mi</small></span>`).join("")}</div></div>
 <form class="ar12-f" id="ar12F"><label for="ar12z">Do they come to you?</label><div class="row"><input id="ar12z" inputmode="numeric" maxlength="5" placeholder="Your ZIP" autocomplete="postal-code"><button class="btn sm">Check</button></div><p id="ar12o" class="small" aria-live="polite"></p></form></div>`}

/* book a consult */
const CS12MODES={onsite:["home","On-site estimate","They come look at the job"],video:["play","Video call","Show them on your phone camera"],phone:["phone","Phone call","Talk it through first"]};
const CS12TIMES=["08:00","10:00","13:00","15:30"];
const v12T12=t=>{const[h,mm]=String(t).split(":").map(Number);return((h%12)||12)+(mm?":"+String(mm).padStart(2,"0"):"")+(h<12?" am":" pm")};
function cs12Cfg(u){const c=u.consult12||{};const av=u.avail||[];const days=Array.isArray(c.days)&&c.days.length?c.days:(av.includes("Weekends")||av.includes("Emergency 24/7")?[1,2,3,4,5,6]:[1,2,3,4,5]);
 return{on:c.on!==false,modes:(Array.isArray(c.modes)&&c.modes.length?c.modes:["onsite","video","phone"]).filter(k=>CS12MODES[k]),times:(Array.isArray(c.times)&&c.times.length?c.times:CS12TIMES).filter(t=>/^\d\d:\d\d$/.test(t)),days,len:[15,30,45,60].includes(+c.len)?+c.len:30}}
const cs12Live=c=>c.status==="requested"||c.status==="confirmed";
function cs12Slots(u){const c=cs12Cfg(u);const taken=new Set((DB.consults||[]).filter(x=>x.pro===u.id&&cs12Live(x)).map(x=>x.date+" "+x.time));const out=[];
 for(let i=1;i<=14;i++){const d=new Date(Date.now()+i*864e5);const ds=d.toISOString().slice(0,10);const dow=new Date(ds+"T12:00").getDay();if(!c.days.includes(dow))continue;out.push({date:ds,times:c.times.map(t=>({t,free:!taken.has(ds+" "+t)}))})}return out}
Object.assign(A,{
 setConsult12(o){const m=me();if(!m||m.role!=="contractor")return{ok:false,msg:"Pro accounts only"};o=o||{};const modes=(Array.isArray(o.modes)?o.modes:[]).filter(k=>CS12MODES[k]);const times=(Array.isArray(o.times)?o.times:[]).filter(t=>/^\d\d:\d\d$/.test(t)).slice(0,8);const days=(Array.isArray(o.days)?o.days:[]).map(Number).filter(n=>n>=0&&n<=6);
  if(o.on!==false&&(!modes.length||!times.length||!days.length))return{ok:false,msg:"Pick at least one day, time and type"};m.consult12={on:o.on!==false,modes,times,days,len:[15,30,45,60].includes(+o.len)?+o.len:30};save();return{ok:true,msg:o.on===false?"Consult booking turned off":"Consult hours saved"}},
 consultBook(pro,o){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in to book"};const u=U(pro);if(!u||u.role!=="contractor")return{ok:false,msg:"Pro not found"};if(m.id===u.id)return{ok:false,msg:"You can't book yourself"};if(m.role==="contractor")return{ok:false,msg:"Consults are booked from a customer or PM account"};
  o=o||{};const c=cs12Cfg(u);if(!c.on)return{ok:false,msg:"This pro isn't taking consult bookings right now. Send a quote request instead."};const sl=cs12Slots(u).find(s=>s.date===o.date);const t=sl&&sl.times.find(x=>x.t===o.time);
  if(!t)return{ok:false,msg:"Pick a day and time from the calendar"};if(!t.free)return{ok:false,msg:"That time was just taken. Pick another."};const mode=c.modes.includes(o.mode)?o.mode:c.modes[0];
  if((DB.consults||[]).filter(x=>x.cu===m.id&&x.pro===u.id&&cs12Live(x)).length>=2)return{ok:false,msg:"You already have consults booked with "+v12Nm(u)};
  const x={id:"cs"+uid(),pro:u.id,cu:m.id,date:o.date,time:o.time,mode,len:c.len,note:v7S(o.note,400),zip:ZIPS[m.zip]?m.zip:u.zip,status:"requested",created:Date.now(),log:[{s:"requested",t:Date.now()}]};
  if(u.demo){x.status="confirmed";x.log.push({s:"confirmed",t:Date.now()});x.auto=true}
  v7Col("consults").push(x);notify(u.id,`${nameOf(m)} booked a ${CS12MODES[mode][1].toLowerCase()} for ${v7DateNice(x.date)}, ${v12T12(x.time)}`,"consults");if(x.status==="confirmed")notify(m.id,`${v12Nm(u)} confirmed your ${CS12MODES[mode][1].toLowerCase()}: ${v7DateNice(x.date)}, ${v12T12(x.time)}`,"consults");save();
  return{ok:true,id:x.id,msg:x.status==="confirmed"?`Booked: ${v7DateNice(x.date)} at ${v12T12(x.time)}. It's on your dashboard.`:`Requested ${v7DateNice(x.date)} at ${v12T12(x.time)}. ${v12Nm(u)} will confirm.`}},
 consultSet(id,what,note){const m=me();const x=(DB.consults||[]).find(c=>c.id===id);if(!m||!x||(x.pro!==m.id&&x.cu!==m.id))return{ok:false,msg:"Consult not found"};const isPro=x.pro===m.id;
  if(!cs12Live(x))return{ok:false,msg:"That consult is already "+x.status};const ok=isPro?["confirm","decline","cancel"]:["cancel"];if(!ok.includes(what))return{ok:false,msg:"Not allowed"};
  if(what==="confirm"&&x.status==="confirmed")return{ok:false,msg:"Already confirmed"};x.status={confirm:"confirmed",decline:"declined",cancel:"canceled"}[what];x.why=v7S(note,200);x.log=(x.log||[]).concat({s:x.status,t:Date.now(),by:m.id});
  const other=isPro?x.cu:x.pro;const when=`${v7DateNice(x.date)}, ${v12T12(x.time)}`;notify(other,isPro?`${v12Nm(m)} ${x.status} your consult for ${when}${x.why?": "+x.why:""}`:`${nameOf(m)} canceled the consult for ${when}`,"consults");save();
  return{ok:true,msg:{confirmed:"Confirmed. The customer has been notified.",declined:"Declined. The customer can pick another time.",canceled:"Consult canceled"}[x.status]}}});
function cs12Modal(pid,pre){const u=U(pid);const m=me();const c=cs12Cfg(u);const sl=cs12Slots(u);pre=pre||{};let day=pre.date&&sl.some(s=>s.date===pre.date)?pre.date:(sl.find(s=>s.times.some(t=>t.free))||{}).date;let time=pre.time||null,mode=c.modes.includes(pre.mode)?pre.mode:c.modes[0];if(pre.note)cs12Modal.note=pre.note;
 const draw=()=>{const d=sl.find(s=>s.date===day);modal(`<h2>Book a free consult with ${esc(v12Nm(u))}</h2><p class="muted small">${c.len} minutes, free, no obligation. ${u.demo?"Demo pros confirm instantly.":"They confirm, usually "+respText(u.resp)+"."}</p>
  <fieldset class="cs12-f"><legend>Type</legend><div class="cs12-modes">${c.modes.map(k=>`<label class="cs12-m ${mode===k?"on":""}"><input type="radio" name="mode" value="${k}" ${mode===k?"checked":""}>${I(CS12MODES[k][0],18)}<b>${CS12MODES[k][1]}</b><small>${CS12MODES[k][2]}</small></label>`).join("")}</div></fieldset>
  <fieldset class="cs12-f"><legend>Day</legend><div class="cs12-days" role="radiogroup" aria-label="Day">${sl.map(s=>{const dt=new Date(s.date+"T12:00");const n=s.times.filter(t=>t.free).length;return`<button type="button" role="radio" aria-checked="${s.date===day}" class="cs12-d ${s.date===day?"on":""}" data-day="${s.date}" ${n?"":"disabled"}><small>${dt.toLocaleDateString("en-US",{weekday:"short"})}</small><b>${dt.getDate()}</b><small>${n?n+" open":"Full"}</small></button>`}).join("")}</div></fieldset>
  <fieldset class="cs12-f"><legend>Time${d?" on "+esc(v7DateNice(d.date)):""}</legend><div class="cs12-times">${d?d.times.map(t=>`<button type="button" class="cs12-t ${time===t.t?"on":""}" data-time="${t.t}" ${t.free?"":"disabled"} aria-pressed="${time===t.t}">${v12T12(t.t)}${t.free?"":" · taken"}</button>`).join(""):`<p class="muted small">No open days in the next 2 weeks. Send a quote request instead.</p>`}</div></fieldset>
  <div class="fld"><label for="cs12n">What's the job? <span class="muted">(optional)</span></label><textarea id="cs12n" rows="2" maxlength="400" placeholder="e.g. Want a quote to swap our 50-gal tank for tankless">${esc(cs12Modal.note||"")}</textarea></div>
  <p class="small muted">${I("lock",12)} They see your first name and town. Your address is shared only for an on-site visit once they confirm.</p>
  <div class="row end"><button type="button" class="btn ghost" data-close>Cancel</button><button type="button" class="btn primary" id="cs12Go" ${time?"":"disabled"}>${I("cal",15)}${!time?"Pick a time":m?"Book "+esc(v7DateNice(day))+", "+v12T12(time):"Sign in to book "+esc(v7DateNice(day))+", "+v12T12(time)}</button></div>`,"wide");
  const n=document.getElementById("cs12n");n.oninput=()=>cs12Modal.note=n.value;
  document.querySelectorAll("[data-day]").forEach(b=>b.onclick=()=>{day=b.dataset.day;time=null;draw()});document.querySelectorAll("[data-time]").forEach(b=>b.onclick=()=>{time=b.dataset.time;draw()});
  document.querySelectorAll('.cs12-m input').forEach(i=>i.onchange=()=>{mode=i.value;draw()});document.querySelectorAll("#modal [data-close]").forEach(b=>b.onclick=closeModal);
  const g=document.getElementById("cs12Go");g.onclick=()=>{if(!me()){try{sessionStorage.setItem("sw12cs",JSON.stringify({pid,date:day,time,mode,note:n.value}))}catch(e){}closeModal();go("signup",null,{next:"/pro/"+pid+"?book=1"});return}act(A.consultBook(pid,{date:day,time,mode,note:n.value}),()=>{cs12Modal.note="";try{sessionStorage.removeItem("sw12cs")}catch(e){}closeModal();v12Rerender()})}};draw()}
function cs12Ics(x){const u=U(x.pro);const d=x.date.replace(/-/g,""),t=x.time.replace(":","")+"00";const[h,mm]=x.time.split(":").map(Number);const e=new Date(2000,0,1,h,mm+(x.len||30));const te=String(e.getHours()).padStart(2,"0")+String(e.getMinutes()).padStart(2,"0")+"00";
 const ics=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Sawyer//Consult//EN","BEGIN:VEVENT","UID:"+x.id+"@sawyer","DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").slice(0,15)+"Z","DTSTART:"+d+"T"+t,"DTEND:"+d+"T"+te,"SUMMARY:"+(CS12MODES[x.mode]||CS12MODES.onsite)[1]+" with "+v12Nm(u),"DESCRIPTION:"+String(x.note||"Booked on Sawyer").replace(/[\r\n,;]/g," "),"END:VEVENT","END:VCALENDAR"].join("\r\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([ics],{type:"text/calendar"}));a.download="sawyer-consult-"+x.date+".ics";document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function cs12List(m,limit){const isPro=m.role==="contractor";const xs=(DB.consults||[]).filter(x=>(isPro?x.pro:x.cu)===m.id&&cs12Live(x)&&x.date>=v7Today()).sort((a,b)=>(a.date+a.time)<(b.date+b.time)?-1:1).slice(0,limit||6);if(!xs.length)return"";
 return`<section class="o7-wrap cs12-dash" aria-labelledby="cs12h"><div class="card"><div class="cs12-dh"><h2 id="cs12h">${I("cal",17)}${isPro?"Consult requests":"Your upcoming consults"}</h2><span class="muted small">${xs.length} upcoming</span></div><ul class="cs12-l">${xs.map(x=>{const o=U(isPro?x.cu:x.pro);return`<li><div class="cs12-when"><b>${new Date(x.date+"T12:00").getDate()}</b><small>${new Date(x.date+"T12:00").toLocaleDateString("en-US",{month:"short"})}</small></div><div class="cs12-what"><b>${esc((CS12MODES[x.mode]||CS12MODES.onsite)[1])} · ${v12T12(x.time)}</b><small>${isPro?esc(nameOf(o))+" · "+esc(townOf(x.zip)):esc(v12Nm(o))}${x.note?" · “"+esc(x.note.slice(0,80))+"”":""}</small></div><span class="badge ${x.status==="confirmed"?"b-ver":"b-urg"}">${x.status==="confirmed"?"Confirmed":"Needs reply"}</span><div class="cs12-btns">${isPro&&x.status==="requested"?`<button class="btn sm primary" data-cs12="${x.id}" data-do="confirm">Confirm</button><button class="btn sm ghost" data-cs12="${x.id}" data-do="decline">Decline</button>`:""}${x.status==="confirmed"?`<button class="btn sm ghost" data-ics12="${x.id}">${I("download",14)}Calendar</button>`:""}<button class="btn sm ghost" data-cs12="${x.id}" data-do="cancel">Cancel</button></div></li>`}).join("")}</ul></div></section>`}
function cs12Bind(){document.querySelectorAll("[data-cs12]").forEach(b=>b.onclick=()=>{const w=b.dataset.do;if(w==="cancel"&&!confirm("Cancel this consult?"))return;act(A.consultSet(b.dataset.cs12,w),v12Rerender)});document.querySelectorAll("[data-ics12]").forEach(b=>b.onclick=()=>{const x=(DB.consults||[]).find(c=>c.id===b.dataset.ics12);if(x)cs12Ics(x)})}
VIEWS.consults=()=>{const m=me();if(!m)return VIEWS.signup(null,{next:"/consults"});return`<section class="page"><div class="pagehead"><div class="wrap"><h1>Free consults</h1><p class="muted">${m.role==="contractor"?"Customers who booked a free visit or call from your profile.":"Free visits and calls you booked with pros."}</p></div></div>${cs12List(m,30)||`<div class="wrap">${empty("cal","No upcoming consults",m.role==="contractor"?"When customers book a free consult from your profile, it shows up here.":"Book a free consult from any pro's profile.",m.role==="contractor"?`<a class="btn" href="${href("pro",m.id)}">View my profile</a>`:`<a class="btn primary" href="${href("find")}">Find a pro</a>`)}</div>`}</section>`};
TITLES.consults="Consults";AFTER.consults=cs12Bind;
const CS12ALLT=["07:00","08:00","09:00","10:00","11:00","13:00","14:00","15:30","17:00","18:30"];
function cs12SetModal(){const m=me();const c=cs12Cfg(m);const DN=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
 modal(`<h2>Free consult booking</h2><p class="muted small">Customers pick an open slot on your profile. You confirm each one (or decline with a reason). Slots you've already given away disappear for everyone else.</p><form id="cs12S">
 <label class="chk"><input type="checkbox" name="on" ${c.on?"checked":""}> Let customers book free consults</label>
 <fieldset class="cs12-f"><legend>Types you offer</legend>${Object.entries(CS12MODES).map(([k,v])=>`<label class="chk"><input type="checkbox" name="modes" data-multi value="${k}" ${c.modes.includes(k)?"checked":""}> ${v[1]}</label>`).join("")}</fieldset>
 <fieldset class="cs12-f"><legend>Days</legend><div class="cs12-chips">${DN.map((d,i)=>`<label class="chk"><input type="checkbox" name="days" data-multi value="${i}" ${c.days.includes(i)?"checked":""}> ${d}</label>`).join("")}</div></fieldset>
 <fieldset class="cs12-f"><legend>Start times</legend><div class="cs12-chips">${CS12ALLT.map(t=>`<label class="chk"><input type="checkbox" name="times" data-multi value="${t}" ${c.times.includes(t)?"checked":""}> ${v12T12(t)}</label>`).join("")}</div></fieldset>
 <div class="fld"><label for="cs12len">Length</label><select id="cs12len" name="len">${[15,30,45,60].map(n=>`<option value="${n}" ${c.len===n?"selected":""}>${n} minutes</option>`).join("")}</select></div>
 <div class="row end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save</button></div></form>`);
 document.querySelectorAll("#modal [data-close]").forEach(b=>b.onclick=closeModal);
 document.getElementById("cs12S").onsubmit=e=>{e.preventDefault();const o=readForm(e.target);act(A.setConsult12({on:!!o.on,modes:o.modes||[],days:(o.days||[]).map(Number),times:o.times||[],len:+o.len}),()=>{closeModal();v12Rerender()})}}
/* profile completeness: extends the v2 setup list */
{const op=proSetup;proSetup=function(u){const s=op(u);const mn=v12Menu(u);s.splice(3,0,["tag","Set starting prices",mn.set,"Customers hate surprise pricing. A \"from\" price builds trust."]);s.splice(5,0,["camera","Add 3+ photos of your work",(u.gal12||[]).length>=3,"Real job photos are what customers look at first."]);s.push(["cal","Offer free consults",cs12Cfg(u).on&&!!u.consult12,"Let customers book a slot on your profile."]);return s}}
function v12Meter(u){const s=proSetup(u),d=s.filter(x=>x[2]).length,pct=Math.round(d/s.length*100);const next=s.find(x=>!x[2]);
 return`<div class="cm12 card" id="cm12"><div class="cm12-h"><div class="cm12-ring" style="--p:${pct}" role="img" aria-label="Profile ${pct}% complete"><b>${pct}%</b></div><div><b>${pct===100?"Your profile is complete":"Your profile is "+pct+"% complete"}</b><small>${next?"Next: "+esc(next[1])+". "+esc(next[3]):"Customers see everything they need to hire you."}</small></div></div>
 <div class="cm12-a"><button class="btn sm primary" type="button" id="cm12Imp">${I("import",14)}Import from Google or Facebook</button>${next?`<button class="btn sm" type="button" id="cm12Next" data-k="${esc(next[1])}">${esc(next[1])}</button>`:""}</div></div>`}
{const ov=VIEWS.pro;VIEWS.pro=(id,...r)=>{let h=ov(id,...r);const u=U(id);if(!u||u.role!=="contractor")return h;const m=me(),own=!!(m&&m.id===u.id);const c=cs12Cfg(u);
 try{
 const setupDone=own&&proSetup(u).every(x=>x[2]);
 if((u.gal12||[]).length>=3)h=h.replace(/<div class="px-cover c\d">[\s\S]*?<div class="px-shade">/,()=>`<div class="px-cover c3">${u.gal12.slice(0,3).map((x,i)=>`<div><img class="art v4art" src="${esc(x.src)}" alt="${esc(x.cap||u.trade)}" ${i?'loading="lazy" decoding="async"':'fetchpriority="high"'}></div>`).join("")}<div class="px-shade">`);
 if(h.includes("<b>Rapid responder</b>"))h=h.replace(/<div class="bb"><svg(?:(?!<\/svg>)[\s\S])*<\/svg><div><b>Fast responder<\/b><small>[^<]*<\/small><\/div><\/div>/,"");
 const hasGal=!!(u.gal12||[]).length||g12All(u).some(x=>/^\/u\//.test(x.src||""));
 /* v13: no stock photos dressed up as a pro's work. Without their own photos: decorative cover, honest empty state, no stock before/after */
 if(!hasGal){h=h.replace(/<div class="px-cover[^"]*">[\s\S]*?<div class="px-shade">/,x=>x.replace(/ alt="[^"]*"/g,' alt=""'));
  if(!own)h=h.replace(/<div class="gallery g\d">[\s\S]*?<\/div>/,()=>`<div class="g12-soon sec-soon"><span class="g12-si">${I("camera",22)}</span><div><b>Job photos coming soon</b><small>${esc(v12Nm(u))} hasn't added photos of their work yet. Ask for pictures of similar jobs when you request a quote.</small></div><a class="btn sm ghost" href="${href("post",null,{invite:u.id})}">Request a quote</a></div>`);
  {const a=h.indexOf('<section class="wrap v2pro">');const b=a<0?-1:h.indexOf("</section>",a);if(b>0&&!/src="\/u\//.test(h.slice(a,b)))h=h.slice(0,a)+h.slice(b+10)}}
 if(hasGal||own)h=h.replace(/<div class="gallery g\d">[\s\S]*?<\/div>/,()=>g12Grid(u,own));
 if(setupDone)h=h.replace('<div class="pmain">',()=>'<div class="pmain">'+v12Meter(u));
 h=h.replace(/<section class="wrap pxsvc">/,'<section class="wrap pxsvc" id="prices">').replace(/(<section class="wrap pxsvc"[^>]*><div class="ehead"><span class="kick">[\s\S]*?<\/span><h2>)What [^<]* takes on(<\/h2>)/,"$1Services &amp; starting prices$2");
 h=h.replace(/<div class="svc-g">[\s\S]*?<\/div>/,()=>v12MenuHTML(u,own));
 h=h.replace(/<div class="v2stats">(?:<div class="v2stat[^"]*">[\s\S]*?<\/div>){3}<\/div>/,"");
 if((u.gal12||[]).length&&!g12All(u).some(x=>/confirmed by the customer/.test(x.cap))){const a=h.indexOf('<section class="wrap v2pro">');const b=a<0?-1:h.indexOf("</section>",a);if(b>0)h=h.slice(0,a)+h.slice(b+10)}
 if(setupDone)h=h.replace(/<section class="wrap pxown">[\s\S]*?<\/section>/,"");
 else if(own)h=h.replace(/(<section class="wrap pxown">[\s\S]*?id="onboard"[\s\S]*?<\/b><\/div>)/,(x)=>x+`<p class="cm12-imp small">${I("import",14)}Have a Google or Facebook business page? <button type="button" class="linkbtn" id="cm12Imp">Import your details</button></p>`);
 h=h.replace(/<div class="pxresp"><div>[\s\S]*?<\/div><div>[\s\S]*?<\/div><\/div>/,()=>`<h3 class="st12-h">Track record on Sawyer</h3>`+v12Stats(u));
 h=h.replace('<a href="#area">Service area</a>','<a href="#prices">Prices</a><a href="#area">Service area</a>');
 {const k=h.indexOf('<h2 class="h-sub" id="reviews"');if(k>0)h=h.slice(0,k)+v12AreaHTML(u)+h.slice(k)}
 const fr='<p class="muted small center">Free for customers. No obligation.</p>';
 if(!own&&c.on)h=h.replace(fr,()=>`<button class="btn block cs12-btn" id="cs12Open" type="button">${I("cal",16)}Book a free consult</button>`+fr.replace("No obligation.","No obligation. Consults are "+c.len+" min."));
 if(own)h=h.replace(/(<a class="btn primary block" href="#\/dash">[\s\S]*?<\/a>)/,`$1<button class="btn block" id="cs12Set" type="button">${I("cal",16)}${c.on&&u.consult12?"Consult hours":"Turn on consult booking"}</button>`);
 if(u.rate)h=h.replace(/(<div class="pxcta"[^>]*><div>)(<b>)/,(x,a,b)=>a+`<b class="pxr12">${esc(u.rate)}</b>`+b);
 if(!own&&c.on)h=h.replace(/(<div class="pxcta"[^>]*>[\s\S]*?)(<a class="btn primary" id="pxQuote")/,`$1<button class="btn ghost pxcs12" type="button" data-cs12open aria-label="Book a free consult">${I("cal",17)}</button>$2`);
 }catch(e){console.warn("v12 pro",e)}return h}}
{const oa=AFTER.pro;AFTER.pro=(id,...r)=>{oa&&oa(id,...r);const u=U(id);if(!u)return;const $=x=>document.getElementById(x);
 $("m12Edit")&&($("m12Edit").onclick=m12Modal);document.querySelectorAll("#g12Edit").forEach(b=>b.onclick=g12Modal);
 document.querySelectorAll("[data-g12]").forEach(b=>b.onclick=()=>g12Light(u,+b.dataset.g12));
 const f=$("ar12F");if(f)f.onsubmit=e=>{e.preventDefault();const z=$("ar12z").value.trim(),o=$("ar12o");if(!/^\d{5}$/.test(z)){o.textContent="Enter a 5-digit ZIP.";o.className="small err";return}if(!ZIPS[z]){o.textContent="That ZIP isn't on the beta map yet. Ask them in a message.";o.className="small muted";return}const d=dist(u.zip,z),r=+u.radius||25;o.className="small "+(d<=r?"ok12":"err");o.textContent=d<=r?`Yes. ${townOf(z)} is ${d} mi away, inside their ${r}-mile area.`:`${townOf(z)} is ${d} mi away, outside their ${r}-mile area. You can still ask; some pros travel for bigger jobs.`};
 document.querySelectorAll("#cs12Open,[data-cs12open]").forEach(b=>b.onclick=()=>cs12Modal(id));const q=r[0]||{};if(q.book==="1"&&me()&&$("cs12Open")){let pre={};try{pre=JSON.parse(sessionStorage.getItem("sw12cs"))||{}}catch(e){}if(pre.pid!==id)pre={};history.replaceState(null,"","#/pro/"+id);setTimeout(()=>cs12Modal(id,pre),60)}$("cs12Set")&&($("cs12Set").onclick=cs12SetModal);
 $("cm12Imp")&&($("cm12Imp").onclick=imp12Modal);const nx=$("cm12Next");if(nx)nx.onclick=()=>{const k=nx.dataset.k;if(/prices/.test(k))return m12Modal();if(/photos/.test(k))return g12Modal();if(/consult/.test(k))return cs12SetModal();go("dash")}}}
/* import from Google Business Profile / Facebook Page (test mode: sample data, every field reviewed before saving) */
function imp12Modal(){lz12(()=>imp12Modal())}
A.importProfile12=function(o){const m=me();if(!m||m.role!=="contractor")return{ok:false,msg:"Pro accounts only"};o=o||{};let n=0;
 if(o.bio&&String(o.bio).trim().length>=20){m.bio=v7S(o.bio,600);n++}
 if(o.phone){const p=v7S(o.phone,24).replace(/[^\d()+\-. ]/g,"");if(p.replace(/\D/g,"").length>=10){m.phone=p;n++}}
 if(Array.isArray(o.hours)){const ok=["Weekdays","Weekends","Evenings","Emergency 24/7"];const h=o.hours.filter(x=>ok.includes(x));if(h.length){m.avail=h;n++}}
 if(Array.isArray(o.subs)){const ok=CATS[m.trade]||[];const s=o.subs.filter(x=>ok.includes(x));if(s.length){m.subs=[...new Set((m.subs||[]).concat(s))].slice(0,12);n++}}
 if(o.years!=null){const y=v7N(o.years,0,80,null);if(y!=null){m.years=y;n++}}
 if(o.web&&/^https:\/\/\S+$/.test(String(o.web))){m.web12=v7S(o.web,200);n++}
 if(!n)return{ok:false,msg:"Nothing selected to import"};m.imp12={src:o.src==="facebook"?"facebook":"google",date:Date.now(),n};save();return{ok:true,msg:`Imported ${n} field${n>1?"s":""}. Check your profile.`}};
/* ------------------------------------------------------------------ */
/* 2) HOME LOG: past jobs, pros, receipts, warranties, maintenance      */
/* ------------------------------------------------------------------ */
const H12TASKS=[["filter","Replace the HVAC filter",90,"HVAC","","Clogged filters drive up bills and wear out the blower.",true],
 ["hvac","Heating & cooling tune-up",365,"HVAC","AC tune-up","Catches small problems before the first hot or cold snap."],
 ["wh","Flush the water heater",365,"Plumbing","Water heaters","Sediment shortens tank life. Most last 8 to 12 years."],
 ["sump","Test the sump pump",180,"Plumbing","Sump pumps","Pour a bucket in the pit before the spring thaw."],
 ["smoke","Test smoke and CO alarms",180,"","","Press test on each one. Replace any older than 10 years.",true],
 ["gutter","Clean the gutters",180,"Gutters","","Overflowing gutters are a top cause of basement leaks."],
 ["roof","Roof check after storm season",365,"Roofing","Roof inspection","Look for lifted shingles and flashing gaps."],
 ["dryer","Clean the dryer vent",365,"Handyman","","Lint build-up is a leading cause of house fires."],
 ["panel","Electrical safety check",1825,"Electrical","Panel upgrades","Every 5 years, or sooner in an older home."]];
const h12Cat=t=>t&&CATS[t]?t:t==="Gutters"?(CATS.Gutters?"Gutters":"Handyman"):t;
function h12Data(m){const h=m.home12||{};return{tasks:h.tasks||{},items:h.items||[]}}
function h12Jobs(m){return(DB.jobs||[]).filter(j=>j.cust===m.id&&j.status==="completed").map(j=>{const q=(DB.quotes||[]).find(q=>q.job===j.id&&q.status==="accepted");const rv=(DB.reviews||[]).find(r=>r.job===j.id);const at=j.doneAt||(rv&&rv.date)||j.created+5*864e5;
 return{j,pro:U(j.hired),amt:q?q.price:null,at,rv}}).sort((a,b)=>b.at-a.at)}
function h12Tasks(m){const d=h12Data(m);const jobs=h12Jobs(m);const now=Date.now();
 return H12TASKS.map(([id,t,every,trade,sub,why,diy])=>{const st=d.tasks[id]||{};const last=Math.max(st.done||0,...jobs.filter(x=>trade&&x.j.cat===trade&&(!sub||x.j.sub===sub||!x.j.sub)).map(x=>x.at),0);
  let due=last?last+every*864e5:now;if(st.snooze&&new Date(st.snooze+"T12:00").getTime()>due)due=new Date(st.snooze+"T12:00").getTime();const days=Math.round((due-now)/864e5);
  return{id,t,every,trade:h12Cat(trade),sub,why,diy:!!diy,last,due,days,state:days<0?"over":days<=30?"soon":"later"}}).sort((a,b)=>a.due-b.due)}
function h12Warranties(m){const d=h12Data(m);const out=[];
 (DB.bills||[]).filter(b=>b.cuid===m.id&&(b.type==="inv"&&b.status!=="draft"&&b.status!=="void"||["approved","converted"].includes(b.status))).forEach(b=>(b.lines||[]).forEach(l=>{const x=/(\d+)[- ]?(?:yr|year)s?\.?\s+(?:parts\s+)?warranty/i.exec(l.d||"");if(x&&(!l.opt||l.on))out.push({id:"b"+b.id+(l.d||"").length,name:String(l.d).replace(/,?\s*\d+[- ]?(?:yr|year)s?\.?\s+(?:parts\s+)?warranty/i,""),years:+x[1],start:b.date,pro:b.bizName,src:"From "+b.no,auto:true})}));
 d.items.filter(i=>i.kind==="warranty").forEach(i=>out.push({id:i.id,name:i.name+(i.brand?" · "+i.brand:""),years:+i.years||1,start:new Date((i.installed||v7Today())+"T12:00").getTime(),pro:i.pro||"",src:i.model?"Model "+i.model:"Added by you",photo:i.photo,own:true}));
 return out.map(w=>{const end=w.start+w.years*365.25*864e5;const days=Math.round((end-Date.now())/864e5);return Object.assign(w,{end,days,state:days<0?"over":days<=90?"soon":"ok"})}).sort((a,b)=>a.end-b.end)}
Object.assign(A,{
 homeTask12(id,what){const m=me();if(!m||m.role==="contractor")return{ok:false,msg:"Home accounts only"};if(!H12TASKS.some(t=>t[0]===id))return{ok:false,msg:"Unknown task"};m.home12=m.home12||{};m.home12.tasks=m.home12.tasks||{};const st=m.home12.tasks[id]=m.home12.tasks[id]||{};
  if(what==="done"){st.done=Date.now();delete st.snooze}else if(what==="snooze"){st.snooze=v7Day(30)}else if(what==="undo"){delete st.done;delete st.snooze}else return{ok:false,msg:"Not allowed"};save();return{ok:true,msg:what==="done"?"Nice. We'll remind you next time.":what==="snooze"?"Snoozed for 30 days":"Undone"}},
 homeItem12(o){const m=me();if(!m||m.role==="contractor")return{ok:false,msg:"Home accounts only"};o=o||{};const name=v7S(o.name,80);if(name.length<2)return{ok:false,msg:"What is it? (e.g. Water heater)"};
  m.home12=m.home12||{};const items=m.home12.items=m.home12.items||[];if(!o.id&&items.length>=60)return{ok:false,msg:"That's a lot of items. Remove some first."};
  const f={kind:"warranty",name,brand:v7S(o.brand,60),model:v7S(o.model,60),installed:v7Date(o.installed)||v7Today(),years:v7N(o.years,0,50,1),pro:v7S(o.pro,80),note:v7S(o.note,300),photo:UPLOAD_RE.test(String(o.photo||""))?String(o.photo):""};
  let x=o.id&&items.find(i=>i.id===o.id);if(x)Object.assign(x,f);else{x=Object.assign({id:"hi"+uid(),date:Date.now()},f);items.push(x)}save();return{ok:true,id:x.id,msg:"Saved to your home log"}},
 homeItemDel12(id){const m=me();const items=m&&m.home12&&m.home12.items;const i=items?items.findIndex(x=>x.id===id):-1;if(i<0)return{ok:false,msg:"Not found"};items.splice(i,1);save();return{ok:true,msg:"Removed"}}});
VIEWS.homelog=(...a)=>lz12View("homelog",a);
TITLES.homelog="Home log";
AFTER.homelog=()=>{document.querySelectorAll("[data-h12t]").forEach(b=>b.onclick=()=>act(A.homeTask12(b.dataset.h12t,b.dataset.do),v12Rerender));
 document.querySelectorAll("[data-h12del]").forEach(b=>b.onclick=()=>{if(confirm("Remove this warranty?"))act(A.homeItemDel12(b.dataset.h12del),v12Rerender)});
 const a=document.getElementById("h12Add");if(a)a.onclick=h12Modal;const c=document.getElementById("h12Csv");if(c)c.onclick=h12Csv};
/* ------------------------------------------------------------------ */
/* 3) PM PROJECT BOARD: staffing per trade, crew counts, Gantt-lite     */
/* ------------------------------------------------------------------ */
const b12T=s=>new Date(s+"T12:00").getTime();
function b12Win(p,r,i){if(v7Date(r.s12)&&v7Date(r.e12))return[r.s12,r.e12,true];const ph=p.phases||[];const s=b12T(p.start),e=b12T(p.end);if(!(e>s))return[p.start,p.end,false];
 const n=Math.max(1,ph.length);const key=String(r.trade||"").toLowerCase().replace(/&.*/,"").trim().slice(0,5);let k=ph.findIndex(x=>key&&String(x).toLowerCase().includes(key));
 if(k<0&&/concrete|mason/i.test(r.trade))k=ph.findIndex(x=>/concrete|shell|found|slab|deck|seawall/i.test(x));if(k<0&&/carp|fram/i.test(r.trade))k=ph.findIndex(x=>/fram|cabinet|carp/i.test(x));if(k<0&&/paint|drywall|plaster/i.test(r.trade))k=ph.findIndex(x=>/paint|drywall|finish/i.test(x));if(k<0&&/landsc|fenc/i.test(r.trade))k=ph.findIndex(x=>/fence|landsc/i.test(x));
 if(k<0)k=Math.min(n-1,Math.floor(i*n/Math.max(1,(p.roles||[]).length)));const seg=(e-s)/n;const a=new Date(s+k*seg).toISOString().slice(0,10),b=new Date(s+(k+1)*seg-864e5).toISOString().slice(0,10);return[a,b,false]}
function b12Stats(p){const rs=p.roles||[];const need=rs.reduce((a,r)=>a+(+r.need||0),0),fill=rs.reduce((a,r)=>a+Math.min(+r.need||0,(r.filled||[]).length),0);const apps=rs.reduce((a,r)=>a+(r.apps||[]).filter(x=>x.status==="pending").length,0);const inv=rs.reduce((a,r)=>a+(r.invites||[]).filter(x=>x.status==="invited").length,0);return{need,fill,apps,inv,open:need-fill,pct:need?Math.round(fill/need*100):0}}
function b12Conflicts(ps){const by={};ps.forEach(p=>(p.roles||[]).forEach((r,i)=>{const w=b12Win(p,r,i);(r.filled||[]).forEach(c=>(by[c]=by[c]||[]).push({p,r,w}))}));const out=[];
 Object.entries(by).forEach(([c,xs])=>{for(let i=0;i<xs.length;i++)for(let j=i+1;j<xs.length;j++){const a=xs[i],b=xs[j];if(a.p.id!==b.p.id&&a.w[0]<=b.w[1]&&b.w[0]<=a.w[1])out.push({c,a,b})}});return out}
A.setRoleDates12=function(pid,rid,s,e){const m=me();const p=(DB.projects||[]).find(x=>x.id===pid);if(!m||!p||p.pm!==m.id)return{ok:false,msg:"Only the project's PM can change dates"};const r=(p.roles||[]).find(x=>x.id===rid);if(!r)return{ok:false,msg:"Slot not found"};
 if(!s&&!e){delete r.s12;delete r.e12;save();return{ok:true,msg:"Dates reset to the phase plan"}}const a=v7Date(s),b=v7Date(e);if(!a||!b||b<a)return{ok:false,msg:"Pick a start and an end after it"};if(a<p.start||b>p.end)return{ok:false,msg:"Keep it inside the project: "+fmtD(p.start)+" – "+fmtD(p.end)};
 r.s12=a;r.e12=b;save();return{ok:true,msg:`${r.label||r.trade}: ${fmtD(a)} – ${fmtD(b)}`}};
VIEWS.board=(...a)=>lz12View("board",a);
TITLES.board="Project board";
AFTER.board=()=>{document.querySelectorAll("[data-b12r]").forEach(b=>{const open=()=>{const[pid,rid]=b.dataset.b12r.split("|");const p=(DB.projects||[]).find(x=>x.id===pid);const r=p&&(p.roles||[]).find(x=>x.id===rid);if(!r)return;const w=b12Win(p,r,(p.roles||[]).indexOf(r));
 modal(`<h2>Dates for ${esc(r.label||r.trade)}</h2><p class="muted small">${esc(p.title.replace(/^Demo: /,""))} runs ${fmtD(p.start)} – ${fmtD(p.end)}. Booked pros and the crew builder use these dates.</p><form id="b12F"><div class="row2"><div class="fld"><label for="b12s">On site from</label><input id="b12s" type="date" name="s" value="${w[0]}" min="${p.start}" max="${p.end}"></div><div class="fld"><label for="b12e">Until</label><input id="b12e" type="date" name="e" value="${w[1]}" min="${p.start}" max="${p.end}"></div></div><div class="row end">${w[2]?`<button type="button" class="btn ghost" id="b12Reset">Use phase plan</button>`:""}<button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Save dates</button></div></form>`);
 document.querySelectorAll("#modal [data-close]").forEach(x=>x.onclick=closeModal);const rs=document.getElementById("b12Reset");if(rs)rs.onclick=()=>act(A.setRoleDates12(pid,rid,"",""),()=>{closeModal();v12Rerender()});
 document.getElementById("b12F").onsubmit=e=>{e.preventDefault();const o=readForm(e.target);act(A.setRoleDates12(pid,rid,o.s,o.e),()=>{closeModal();v12Rerender()})}};b.onclick=open;b.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}}})};
/* ------------------------------------------------------------------ */
/* 4) MARKETING (Office → Get reviews & share): link + QR, review requests, embeddable widget */
/* ------------------------------------------------------------------ */
function rr12Eligible(m){return(DB.jobs||[]).filter(j=>j.hired===m.id&&j.status==="completed"&&!(DB.reviews||[]).some(r=>r.job===j.id)).map(j=>({j,c:U(j.cust),rq:(DB.rreq12||[]).find(x=>x.job===j.id&&x.by===m.id)}))}
const RR12TPL="Hi {first}, thanks for choosing {biz} for \"{job}\". Would you leave a quick review on Sawyer? It takes a minute and helps your neighbors find honest pros. {link}";
const rr12Fill=(t,m,c,j)=>String(t||RR12TPL).replace(/\{first\}/g,String(nameOf(c)).split(" ")[0]).replace(/\{biz\}/g,v12Nm(m)).replace(/\{job\}/g,j.archived||j.title==="Past job"?(j.sub||j.cat):j.title).replace(/\{link\}/g,v12Origin()+"/#/job/"+j.id+"?review=1");
Object.assign(A,{
 rreqSend12(ids,text,ch){const m=me();if(!m||m.role!=="contractor")return{ok:false,msg:"Pro accounts only"};const el=rr12Eligible(m);const pick=(Array.isArray(ids)?ids:[]).slice(0,40).map(id=>el.find(x=>x.j.id===id)).filter(Boolean);
  if(!pick.length)return{ok:false,msg:"Pick at least one finished job"};const t=v7S(text,600)||RR12TPL;if(!/\{link\}/.test(t))return{ok:false,msg:"Keep {link} in the message so they can find the review form"};const chan=["email","text","both"].includes(ch)?ch:"email";let n=0,skip=0;
  pick.forEach(x=>{if(x.rq){skip++;return}v7Col("rreq12").push({id:"rq"+uid(),by:m.id,cu:x.j.cust,job:x.j.id,ch:chan,text:rr12Fill(t,m,x.c,x.j),sent:Date.now(),rem:[],status:"sent"});notify(x.j.cust,`${v12Nm(m)} asked for a review of "${x.j.archived||x.j.title==="Past job"?(x.j.sub||x.j.cat):x.j.title}"`,"review:"+x.j.id);n++});m.rrTpl12=t===RR12TPL?undefined:t;save();
  return n?{ok:true,msg:`Asked ${n} customer${n>1?"s":""}${skip?` (${skip} already asked)`:""}. Test mode: ${chan==="text"?"texts":chan==="both"?"emails and texts":"emails"} aren't actually sent; they get a Sawyer notification.`}:{ok:false,msg:"Those customers were already asked. Send a reminder instead."}},
 rreqRemind12(id){const m=me();const x=(DB.rreq12||[]).find(r=>r.id===id&&m&&r.by===m.id);if(!x)return{ok:false,msg:"Request not found"};if((DB.reviews||[]).some(r=>r.job===x.job))return{ok:false,msg:"They already left a review"};
  if((x.rem||[]).length>=1)return{ok:false,msg:"One reminder per customer, so nobody gets nagged"};const last=Math.max(x.sent,...(x.rem||[]));if(Date.now()-last<3*864e5)return{ok:false,msg:"Give them 3 days before a reminder"};
  x.rem=(x.rem||[]).concat(Date.now());const j=(DB.jobs||[]).find(y=>y.id===x.job);notify(x.cu,`Reminder: ${v12Nm(m)} would love a review of "${j?(j.archived||j.title==="Past job"?(j.sub||j.cat):j.title):"your job"}"`,"review:"+x.job);save();return{ok:true,msg:"Reminder sent (test mode: as a Sawyer notification)"}}});
function g12Tab(){lz12(v12Rerender);return lz12Sk()}
if(typeof OTABS!=="undefined"&&!OTABS.some(t=>t[0]==="grow")){const i=OTABS.findIndex(t=>t[0]==="reports");OTABS.splice(i<0?OTABS.length:i,0,["grow","Reviews & marketing","megaphone"])}
{const ov=VIEWS.office;VIEWS.office=(tab,q)=>{const m=me();if(tab==="grow"&&m&&m.role==="contractor")return oShell("grow",g12Tab(m,q||{}),m);if(tab==="grow"&&m&&m.role==="pm")return oShell("grow",`<div class="card">${empty("megaphone","Reviews & marketing is for contractors","Project managers are reviewed by the crews they hire.","")}</div>`,m);return ov(tab,q)}}
{const oa=AFTER.office;AFTER.office=(tab,q)=>{oa&&oa(tab,q);try{const t=document.querySelector(".o7-tabs a.on"),n=t&&t.parentElement;if(n&&n.scrollWidth>n.clientWidth)n.scrollLeft=t.offsetLeft-n.clientWidth/2+t.offsetWidth/2}catch(e){}if(tab!=="grow")return;const m=me();if(!m)return;const $=x=>document.getElementById(x);
 const f=$("rr12F");if(f){const pv=$("rr12pv"),ta=$("rr12m");const el=rr12Eligible(m).find(x=>!x.rq);const up=()=>{if(pv&&ta&&el)pv.innerHTML=`<b>Preview for ${esc(nameOf(el.c))}:</b> ${esc(rr12Fill(ta.value,m,el.c,el.j))}`};if(ta)ta.oninput=up;up();
  f.onsubmit=e=>{e.preventDefault();const o=readForm(f);act(A.rreqSend12(o.job||[],o.text,o.ch),v12Rerender)}}
 document.querySelectorAll("[data-rr12rem]").forEach(b=>b.onclick=()=>act(A.rreqRemind12(b.dataset.rr12rem),v12Rerender));
 $("sh12c")&&($("sh12c").onclick=()=>v12Copy($("sh12u").value,"Profile link copied"));$("em12b")&&($("em12b").onclick=()=>v12Copy($("em12c").value,"Widget code copied"));
 const dl=(blob,name)=>{const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)};
 const svg=()=>qrSVG12(v12PubUrl(m,"qr"),600);$("sh12svg")&&($("sh12svg").onclick=()=>dl(new Blob([svg()],{type:"image/svg+xml"}),"sawyer-qr.svg"));
 $("sh12png")&&($("sh12png").onclick=()=>{const img=new Image();img.onload=()=>{const c=document.createElement("canvas");c.width=c.height=600;c.getContext("2d").drawImage(img,0,0,600,600);c.toBlob(b=>b&&dl(b,"sawyer-qr.png"),"image/png")};img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg())});
 $("sh12p")&&($("sh12p").onclick=()=>{document.body.classList.add("print12");const done=()=>{document.body.classList.remove("print12");removeEventListener("afterprint",done)};addEventListener("afterprint",done);setTimeout(()=>{window.print();setTimeout(done,1500)},50)})}}
/* ------------------------------------------------------------------ */
/* 5) TRUST: report a review, moderation queue (Sawyer trust team)       */
/* ------------------------------------------------------------------ */
const RP12={fake:"Not a real customer, or a fake review",wrong:"Wrong business or wrong job",paid:"Paid for, or offered a discount for it",abuse:"Offensive, threatening or shares personal info",conflict:"Written by a competitor, family member or employee",other:"Something else"};
const v12Staff=m=>!!(m&&m.staff);
Object.assign(A,{
 reportReview12(rid,o){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in to report"};const r=(DB.reviews||[]).find(x=>x.id===rid);if(!r)return{ok:false,msg:"Review not found"};o=o||{};
  if(r.uid===m.id)return{ok:false,msg:"That's your own review. You can edit it from the job page."};if(r.cid===m.id)return{ok:false,msg:"Use \"Dispute\" on reviews of your own business"};
  if(!RP12[o.reason])return{ok:false,msg:"Pick a reason"};const note=v7S(o.note,600);if(o.reason==="other"&&note.length<10)return{ok:false,msg:"Tell us what's wrong in a sentence"};
  if((DB.reports12||[]).some(x=>x.rid===rid&&x.by===m.id&&x.status==="open"))return{ok:false,msg:"You already reported this review. We'll let you know what we decide."};
  if((DB.reports12||[]).filter(x=>x.by===m.id&&Date.now()-x.date<864e5).length>=10)return{ok:false,msg:"That's a lot of reports today. Try again tomorrow."};
  v7Col("reports12").push({id:"rp"+uid(),rid,cid:r.cid,by:m.id,reason:o.reason,note,date:Date.now(),status:"open"});DB.users.filter(v12Staff).forEach(s=>notify(s.id,`New review report: ${RP12[o.reason]}`,"mod"));save();
  return{ok:true,msg:"Thanks. A person on Sawyer's trust team reviews it within 3 business days. The review stays up until then."}},
 modDecide12(kind,id,what,note){const m=me();if(!v12Staff(m))return{ok:false,msg:"Trust team only"};note=v7S(note,400);
  let r,rep=null;if(kind==="report"){rep=(DB.reports12||[]).find(x=>x.id===id);if(!rep||rep.status!=="open"&&rep.status!=="asked")return{ok:false,msg:"Already decided"};r=(DB.reviews||[]).find(x=>x.id===rep.rid)}else if(kind==="dispute"){r=(DB.reviews||[]).find(x=>x.id===id);if(!r||!r.dispute||r.dispute.status!=="open"&&r.dispute.status!=="asked")return{ok:false,msg:"Already decided"}}else return{ok:false,msg:"Unknown item"};
  if(!["keep","remove","ask"].includes(what))return{ok:false,msg:"Not allowed"};if(what!=="ask"&&note.length<5)return{ok:false,msg:"Add a short note for the record"};
  const pro=r?U(r.cid):null;const rel=(DB.reports12||[]).filter(x=>r&&x.rid===r.id&&(x.status==="open"||x.status==="asked"));
  if(what==="ask"){if(!r)return{ok:false,msg:"That review is gone"};notify(r.uid,`Sawyer's trust team has a question about your review of ${v12Nm(pro)}. Reply with a photo or receipt from the job.`,"job:"+r.job);if(rep)rep.status="asked";if(kind==="dispute")r.dispute.status="asked";save();return{ok:true,msg:"Asked the reviewer for proof. The item stays in the queue."}}
  const dec={by:m.id,at:Date.now(),what,note};
  if(what==="remove"&&r){const i=DB.reviews.indexOf(r);if(i>=0)DB.reviews.splice(i,1);v7Col("rmrev12").push(Object.assign({},r,{removed:dec}));notify(r.uid,`Your review of ${v12Nm(pro)} was removed after a trust review: ${note}`,"dash");if(pro)notify(pro.id,`A review on your profile was removed after a trust review.`,"dash")}
  else if(what==="keep"&&pro&&kind==="dispute")notify(pro.id,`We reviewed your dispute and the review stays up: ${note}`,"dash");
  rel.forEach(x=>{x.status=what==="remove"?"removed":"kept";x.dec=dec;notify(x.by,what==="remove"?"Thanks for your report. We removed that review.":"Thanks for your report. We checked that review and it stays up.","dash")});if(rep&&!rel.includes(rep)){rep.status=what==="remove"?"removed":"kept";rep.dec=dec}
  if(r&&r.dispute&&(r.dispute.status==="open"||r.dispute.status==="asked"))r.dispute.status=what==="remove"?"upheld":"rejected",r.dispute.dec=dec;save();
  return{ok:true,msg:what==="remove"?"Review removed. The pro's rating updates everywhere.":"Review kept. Everyone involved has been told."}}});
/* "Report" link on every review (not your own, not your business: pros use Dispute) */
{const orv=reviewItem;reviewItem=function(r,canReply){const h=orv(r,canReply);const m=me();if(m&&(r.uid===m.id||r.cid===m.id))return h;const k=h.lastIndexOf("</article>");if(k<0)return h;return h.slice(0,k)+`<button type="button" class="linkbtn rp12" data-rp12="${esc(r.id)}">${I("flag",13)}Report</button>`+h.slice(k)}}
function rp12Modal(rid){const m=me();if(!m){go("signup",null,{next:location.hash.slice(1)});return}
 modal(`<h2>Report this review</h2><p class="muted small">Reviews on Sawyer come only from finished, hired jobs, but tell us if something looks off. A person checks every report.</p><form id="rp12F"><fieldset class="rp12-r"><legend class="sr-only">Reason</legend>${Object.entries(RP12).map(([k,t],i)=>`<label class="chk"><input type="radio" name="reason" value="${k}" ${i?"":"required"}> ${t}</label>`).join("")}</fieldset>
 <div class="fld"><label for="rp12n">Anything we should know? <span class="muted">(optional)</span></label><textarea id="rp12n" name="note" rows="3" maxlength="600"></textarea></div><div class="row end"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">${I("flag",14)}Send report</button></div></form>`);
 document.querySelectorAll("#modal [data-close]").forEach(b=>b.onclick=closeModal);document.getElementById("rp12F").onsubmit=e=>{e.preventDefault();act(A.reportReview12(rid,readForm(e.target)),()=>closeModal())}}
if(typeof document!=="undefined"&&document.addEventListener)document.addEventListener("click",e=>{const b=e.target&&e.target.closest&&e.target.closest("[data-rp12]");if(b){e.preventDefault();rp12Modal(b.dataset.rp12)}});
VIEWS.mod=(...a)=>lz12View("mod",a);
TITLES.mod="Moderation";
AFTER.mod=()=>{document.querySelectorAll("[data-mod12]").forEach(f=>{const[k,id]=f.dataset.mod12.split("|");f.onsubmit=e=>e.preventDefault();f.querySelectorAll("[data-md]").forEach(b=>b.onclick=()=>{const w=b.dataset.md;if(w==="remove"&&!confirm("Remove this review? The pro's rating changes everywhere."))return;act(A.modDecide12(k,id,w,f.querySelector("input").value),v12Rerender)})})};
/* ------------------------------------------------------------------ */
/* 6) WIRING: dashboards, next actions, account menu, search, schedule  */
/* ------------------------------------------------------------------ */
function v12DashCards(m){let h="";
 if(m.role==="customer"&&!v12Staff(m)){const ts=h12Tasks(m).filter(t=>t.state!=="later"),ws=h12Warranties(m).filter(w=>w.state==="soon");h+=cs12List(m,4);
  h+=`<section class="o7-wrap"><a class="card h12-teaser" href="${href("homelog")}"><span class="h12-ti">${I("house",20)}</span><span><b>Your home log</b><small>${h12Jobs(m).length} finished jobs · ${h12Warranties(m).filter(w=>w.state!=="over").length} warranties${ts.length?` · <em>${ts.length} maintenance task${ts.length>1?"s":""} due</em>`:""}${ws.length?` · ${ws.length} warranty ending soon`:""}</small></span><span class="na8-c">Open${I("chev",14)}</span></a></section>`}
 if(m.role==="contractor")h+=cs12List(m,4);
 if(m.role==="pm"){const ps=(DB.projects||[]).filter(p=>p.pm===m.id&&p.status!=="closed"&&p.status!=="done");if(ps.length){const t=ps.map(b12Stats).reduce((a,s)=>({f:a.f+s.fill,n:a.n+s.need}),{f:0,n:0});h+=`<section class="o7-wrap"><a class="card h12-teaser" href="${href("board")}"><span class="h12-ti">${I("gantt",20)}</span><span><b>Project board</b><small>${ps.length} projects · ${t.f}/${t.n} crew booked · staffing and dates for every trade on one screen</small></span><span class="na8-c">Open${I("chev",14)}</span></a></section>`}}
 return h}
{const od=VIEWS.dash;VIEWS.dash=(...a)=>{const m=me();if(v12Staff(m))return VIEWS.mod(null,{});let h=od(...a);if(!m)return h;let x="";try{x=v12DashCards(m)}catch(e){console.warn(e)}if(!x)return h;
 const k=h.indexOf('<section class="na8"');const e=k>=0?h.indexOf("</section>",k):-1;return e>=0?h.slice(0,e+10)+x+h.slice(e+10):x+h}
 const oa=AFTER.dash;AFTER.dash=(...a)=>{const m=me();if(v12Staff(m))return AFTER.mod();oa&&oa(...a);cs12Bind()}}
{const on=v8Next;v8Next=function(m){let out=on(m);if(!m)return out;const extra=[];const add=(icon,tone,title,sub,link,cta)=>extra.push({icon,tone,title,sub,link,cta});
 try{if(m.role==="contractor"){const rq=(DB.consults||[]).filter(x=>x.pro===m.id&&x.status==="requested");if(rq.length)add("cal","p",`${rq.length} consult request${rq.length>1?"s":""} to confirm`,`${v7DateNice(rq[0].date)}, ${v12T12(rq[0].time)} · ${nameOf(U(rq[0].cu))}`,href("consults"),"Reply");
   const el=rr12Eligible(m).filter(x=>!x.rq);if(el.length)add("star","gold",`Ask ${el.length} customer${el.length>1?"s":""} for a review`,`"${el[0].j.archived||el[0].j.title==="Past job"?(el[0].j.sub||el[0].j.cat):el[0].j.title}" is done. Fresh jobs get the most reviews.`,href("office","grow"),"Ask")}
  else if(m.role==="customer"){const ts=h12Tasks(m).filter(t=>t.state==="over");if(ts.length)add("house","gold",`${ts[0].t}`,ts.length>1?`Plus ${ts.length-1} more home maintenance task${ts.length>2?"s":""} due`:ts[0].why,href("homelog"),"See")}
  }catch(e){}
 return extra.concat(out).slice(0,5)}}
{const os=SHELL;SHELL=function(){os.apply(this,arguments);if(typeof document==="undefined"||!document.getElementById)return;const m=me();const am=document.getElementById("acctMenu");if(!am||!m||am.querySelector("[data-v12]"))return;
 const x=v12Staff(m)?`<a href="${href("mod")}" data-v12>${I("shield",16)}Moderation queue</a>`:m.role==="customer"?`<a href="${href("homelog")}" data-v12>${I("house",16)}Home log</a><a href="${href("consults")}" data-v12>${I("cal",16)}Consults</a>`:m.role==="pm"?`<a href="${href("board")}" data-v12>${I("gantt",16)}Project board</a>`:m.role==="contractor"?`<a href="${href("office","grow")}" data-v12>${I("megaphone",16)}Reviews &amp; marketing</a><a href="${href("consults")}" data-v12>${I("cal",16)}Consults</a>`:"";
 const first=am.querySelector("a");if(first)first.insertAdjacentHTML("afterend",x);else am.insertAdjacentHTML("afterbegin",x)}}
{const oi=v8Index;v8Index=function(){const R=oi();const m=me();const P=(t,l,ic,k)=>R.unshift({g:"Go to",t,s:"",l,ic,k:(t+" "+(k||"")).toLowerCase()});
 if(m&&m.role==="customer")P("Home log",href("homelog"),"house","warranties maintenance receipts past jobs");if(m&&m.role==="pm")P("Project board",href("board"),"gantt","gantt staffing schedule crew");if(m&&m.role==="contractor"){P("Reviews & marketing",href("office","grow"),"megaphone","qr code review requests widget share");P("Consults",href("consults"),"cal","booking calendar")}if(v12Staff(m))P("Moderation queue",href("mod"),"shield","reports disputes");return R}}
{const ov=VIEWS.schedule;VIEWS.schedule=(p,q)=>{const h=ov(p,q);const m=me();if(!m||m.role!=="contractor")return h;const x=cs12List(m,6);if(!x)return h;const k=h.indexOf('<div class="o7-wrap o7-body">');return k>=0?h.slice(0,k)+x+h.slice(k):h+x}
 const oa=AFTER.schedule;AFTER.schedule=(...a)=>{oa&&oa(...a);cs12Bind()}}

/* ---- seed ---- */
function seedV12(){if(!DB||!DB.users)return;const now=Date.now(),D=864e5;
 for(const u of DB.users||[])if(Array.isArray(u.gal12)&&u.gal12.some(x=>!UPLOAD_RE.test(String(x&&x.src||""))))u.gal12=u.gal12.filter(x=>UPLOAD_RE.test(String(x&&x.src||"")));
 if(!U("a1"))DB.users.push({id:"a1",role:"customer",name:"Sawyer Trust Team",zip:"78704",favs:[],staff:true,demo:true,joined:now-400*D});
 const c1=U("c1");if(c1){if(!c1.menu12)c1.menu12=[{s:"Water heaters",from:1450,unit:"job",note:"40–50 gal tank swap, haul-away and permit"},{s:"Tankless conversion",from:3900,unit:"job",note:"Gas line sizing and venting included"},{s:"Drain cleaning",from:189,unit:"job",note:"Main line, one cleanout"},{s:"Sewer line repair",from:2800,unit:"job",note:"Camera inspection first, $0 if we do the repair"},{s:"Sump pumps",from:650,unit:"job",note:"1/3 hp pump with check valve"},{s:"Frozen pipe thaw",from:225,unit:"visit",note:"Nights and weekends, same price"},{s:"Service call",from:95,unit:"hr",note:"Waived if you book the repair"}];
  /* SW-008 (hotfix-sec): stock photos are never a pro's portfolio. No seeded stock gallery; stock entries saved earlier are dropped. */
  if(!c1.consult12)c1.consult12={on:true,modes:["onsite","video","phone"],times:["08:00","10:00","13:00","15:30"],days:[1,2,3,4,5,6],len:30}}
 const cs=v7Col("consults");if(!cs.length&&c1){const day=n=>{let d=new Date(now+n*D);while(d.getDay()===0)d=new Date(d.getTime()+D);return d.toISOString().slice(0,10)};
  cs.push({id:"cs1",pro:"c1",cu:"u2",date:day(2),time:"10:00",mode:"video",len:30,note:"Want to talk through a whole-house repipe before we buy.",zip:"78704",status:"requested",created:now-3*36e5,log:[{s:"requested",t:now-3*36e5}],demo:true},
   {id:"cs2",pro:"c1",cu:"u1",date:day(3),time:"13:00",mode:"onsite",len:30,note:"Tankless quote. The garage is unlocked, dog is friendly.",zip:"78704",status:"confirmed",created:now-D,log:[{s:"requested",t:now-D},{s:"confirmed",t:now-D+40*6e4}],demo:true});
  notify("c1","Chris Calloway booked a video call for "+v7DateNice(day(2))+", 10 am","consults")}
 const u1=U("u1");if(u1&&!u1.home12){const j6=(DB.jobs||[]).find(j=>j.id==="j6"),j10=(DB.jobs||[]).find(j=>j.id==="j10");u1.home12={tasks:{filter:{done:now-112*D},smoke:{done:now-40*D}},items:[
  {id:"hi1",kind:"warranty",name:"Gas furnace",brand:"Carrier",model:"59SC5A060E17",installed:v12Day(j6?j6.created+4*D:now-200*D),years:10,pro:"Cedar Park Heating & Air",note:"Parts warranty, registered online",photo:"",date:now-100*D},
  {id:"hi2",kind:"warranty",name:"Sump pump",brand:"Zoeller",model:"M53",installed:v12Day(j10?j10.created+2*D:now-30*D),years:3,pro:"Bluebonnet Plumbing & Drain",note:"",photo:"",date:now-20*D},
  {id:"hi3",kind:"warranty",name:"Dishwasher",brand:"Bosch",model:"SHX78CM5N",installed:v12Day(now-(365*2-50)*D),years:2,pro:"Home Depot",note:"",photo:"",date:now-300*D}]}}
 if(c1&&!(DB.jobs||[]).some(j=>j.id==="j12a")){const u2=U("u2");if(u2){DB.jobs.push({id:"j12a",cust:"u2",title:"Kitchen faucet and disposal swap",cat:"Plumbing",sub:"Faucets & fixtures",zip:"78704",budget:"$300–500",desc:"Leaky pull-down faucet and a disposal that hums but won't spin.",status:"completed",hired:"c1",interested:[],invited:[],urgent:false,created:now-9*D,doneAt:now-6*D,when:"This week",custConfirmed:true,photos:[],demo:true});
  DB.quotes.push({id:uid(),job:"j12a",cid:"c1",price:420,days:1,note:"Moen faucet supplied, 3/4 hp disposal.",status:"accepted",date:now-8*D});
  v7Col("rreq12").push({id:"rq1",by:"c1",cu:"u2",job:"j12a",ch:"email",text:"",sent:now-4*D,rem:[],status:"sent",demo:true})}}
 const rp=v7Col("reports12");if(!rp.length){const rv=(DB.reviews||[]).find(r=>r.id==="j19mvuk")||(DB.reviews||[]).find(r=>r.cid==="c3");if(rv)rp.push({id:"rp1",rid:rv.id,cid:rv.cid,by:"u7",reason:"conflict",note:"I think this reviewer works for the company. Same last name as the owner.",date:now-26*36e5,status:"open",demo:true});
  const dv=(DB.reviews||[]).find(r=>r.id==="v4x8u9r")||(DB.reviews||[]).find(r=>r.cid==="c4"&&r.stars<=3&&!r.dispute)||(DB.reviews||[]).find(r=>r.cid==="c4"&&!r.dispute);if(dv&&!dv.dispute)dv.dispute={reason:"The customer moved the install date twice and we came the first morning the weather allowed. Texts attached on request.",status:"open",date:now-50*36e5}}
 v7Col("rmrev12")}
if(typeof DB!=="undefined"&&DB&&DB.users&&!Array.isArray(DB.consults)){try{seedV12();save()}catch(e){console.warn("seedV12",e)}}
{const os=seed;seed=function(){const r=os.apply(this,arguments);try{seedV12();save()}catch(e){}return r}}
/* signed-out consult booking: keep the pick through sign-in / sign-up */
function cs12Pending(){try{const x=JSON.parse(sessionStorage.getItem("sw12cs"));const u=x&&U(x.pid);return u&&u.role==="contractor"&&x.date&&x.time?Object.assign({u},x):null}catch(e){return null}}
const cs12PendHTML=(x,signedIn)=>`<div class="wrap cs12-pend" role="status"><span>${I("cal",18)}</span><p><b>${signedIn?"Finish booking":"Sign in to finish booking"}</b> your free consult with ${esc(v12Nm(x.u))}: ${esc(v7DateNice(x.date))}, ${v12T12(x.time)}.${signedIn?"":" We'll bring you right back to it."}</p>${signedIn?`<a class="btn sm primary" href="${href("pro",x.pid,{book:"1"})}">Finish booking</a>`:""}</div>`;
{const os=VIEWS.signup;VIEWS.signup=(p,q)=>{const h=os(p,q);const x=q&&/\?book=1$/.test(q.next||"")?cs12Pending():null;return x&&!me()?cs12PendHTML(x,false)+h:h}}
if(VIEWS.account){const oa=VIEWS.account;VIEWS.account=(...a)=>{const h=oa(...a);const x=me()&&cs12Pending();return x?cs12PendHTML(x,true)+h:h}}
/* v13 perf: the server sends signed-out /p/<id> visits with the pro's cover already in <main> (#pre11).
   When the app mounts, keep those painted images instead of swapping in identical new ones. */
if(typeof document!=="undefined"&&typeof render==="function"){const or=render;let keep=null,until=0;render=function(){const pre=document.getElementById("pre11");const pc=pre&&pre.querySelector(".px-cover");if(pc){keep=pc;until=Date.now()+5000}const r=or.apply(this,arguments);
 if(keep){if(Date.now()>until)keep=null;else try{const nu=document.querySelector("#app .px-cover");const k=e=>[...e.querySelectorAll("img")].map(i=>i.getAttribute("src")).join("|");if(nu&&nu!==keep&&k(nu)===k(keep)&&nu.className===keep.className){const bl=nu.querySelector(".backlink"),ob=keep.querySelector(".backlink");if(bl&&ob)ob.replaceWith(bl);nu.replaceWith(keep)}}catch(e){}}return r}}
/* v13: search cards show the pro's own first portfolio photo; without one, the plain trade photo as decoration (no caption
   pretending it is their job). */
function v13CardImg(u){const g=(u.gal12||[])[0];if(g&&G12OK(g.src))return`<img class="art v4art" src="${esc(g.src)}" alt="${esc(g.cap||"")}" loading="lazy" decoding="async">`;
 /* v13: no stock photo standing in for a pro's work (repeated houses looked fake): a branded tile with the trade icon and initials */
 const nm=String(u.biz||nameOf(u)||"").replace(/\(demo\)/i,"").trim(),ini=nm.split(/\s+/).filter(w=>/^[A-Za-z]/.test(w)).slice(0,2).map(w=>w[0].toUpperCase()).join("");
 return`<div class="pc13-tile" aria-hidden="true"><span class="pc13-i">${I((typeof TRADE_ICON!=="undefined"&&TRADE_ICON[u.trade])||"wrench",26)}</span><b>${esc(ini)}</b><small>Job photos coming soon</small></div>`}
if(typeof PROCARD==="function"){const oc=PROCARD;PROCARD=function(x){const h=oc(x);try{return h.replace(/(<div class="pc-img">(?:<button[\s\S]*?<\/button>)?)<img class="art v4art"[^>]*>/,(m,a)=>a+v13CardImg(x.u))}catch(e){return h}}}
/* v13 polish: the dashboard opens with its own header ("Your home", "Your business"...), then what's next, then the rest.
   Cards that earlier layers put above the header move just below it. */
{const od=VIEWS.dash;VIEWS.dash=(...a)=>{const h=od(...a);try{const i=h.indexOf('<header class="uh"');if(i<0)return h;const s=h.lastIndexOf("<section",i);if(s<=0)return h;
 const pre=h.slice(0,s);if(!pre.trim())return h;const e=h.indexOf("</header>",i);if(e<0)return h;const rest=h.slice(s,e+9),tail=h.slice(e+9);return rest+`<div class="v13-dtop">${pre}</div>`+tail}catch(x){return h}}}

/* v13 design pass: home storytelling (hero trust cards, proof band, one "How it works", homeowner + pro
   comparison, stories after the proof), calmer dashboards, quieter search helpers, folded traveler map. */
if(typeof ZIPS!=="undefined"&&!ZIPS["78734"])ZIPS["78734"]=["Lakeway, TX",30.3635,-97.9795];
{const oh=VIEWS.home;VIEWS.home=(...a)=>{let h=oh(...a);try{
 const cut=(re)=>{const m=h.match(re);if(!m)return"";h=h.replace(m[0],"");return m[0]};
 // hero copy
 h=h.replace("<h1>The right pro for every home project</h1>","<h1>Pros you'd trust with your house keys.</h1>")
  .replace(/<p class="v4sub">[^<]*<\/p>/,'<p class="v4sub">Licensed, insured local pros. At most 3 quotes, no spam calls, and you pay by milestone, only after you sign off.</p>');
 // hero trust cards: a real top-rated pro from the directory + how money moves
 const tl=searchPros({zip:"78704",miles:120,sort:"rating"}).filter(x=>x.r.n&&x.u.verified),top=tl.find(x=>(x.u.gal12||[]).length)||tl[0];
 if(top){const {u,r}=top;h=h.replace(/(<div class="v4hero-img">[\s\S]*?)(<\/div><\/div><\/section>)/,(m,a,b)=>a+`<a class="v13hc v13hc-pro" href="${href("pro",u.id)}">${avatar(u)}<span><b>${esc(u.biz||nameOf(u))}</b><small>${I("star",13)} ${r.avg.toFixed(1)} · ${r.n} verified review${r.n>1?"s":""}</small></span><em>${I("check",13)}License + insurance checked</em></a><div class="v13hc v13hc-pay" aria-hidden="true"><span class="v13hc-i">${I("lock",16)}</span><span><b>Milestone held</b><small>Released when you approve</small></span></div>`+b)}
 // proof band instead of small counts
 h=h.replace(/<section class="v4band"[\s\S]*?<\/section>/,()=>`<section class="v4band v13band" aria-label="What you get with Sawyer"><div class="v4w v4stats">${[["dollar","$0","lead fees for pros, ever"],["users","3 max","pros per request, shown openly"],["lock","Private","your number, until you share it"],["shield","Escrow","milestone payments, test mode"]].map(([ic,b,s])=>`<div><span class="v13b-i">${I(ic,18)}</span><b>${b}</b><span>${s}</span></div>`).join("")}</div></section>`);
 // one "How it works": the tabbed homeowner/pro/traveler steps live in the .v4how band
 const how=cut(/<section class="wrap t6how" id="homeHow">[\s\S]*?<\/section>/);
 if(how)h=h.replace(/<section class="v4sec v4alt v4how">[\s\S]*?<\/section>/,()=>`<section class="v4sec v4alt v4how"><div class="v4w">${how.replace('<section class="wrap t6how" id="homeHow">','<div class="t6how" id="homeHow">').replace(/<\/section>$/,"</div>")}</div></section>`);
 // comparison right after "Why": homeowners and pros
 const vs=cut(/<section class="wrap t6vs" id="homeVs">[\s\S]*?<\/section>/);
 if(vs){const ho=[["What it costs you","Free to post and message","Free to request"],["Who contacts you","Up to 3 pros, shown openly","Matched pros, often several"],["Your phone number","Private, chat in the app","Shared with matched pros"],["Paying the pro","Milestone escrow, released on your OK","Arranged with the pro"]];
  const tbl=`<div class="t6vs-t card" role="table" aria-label="Sawyer compared with Angi, for homeowners" id="vsH"><div class="t6vs-r hd" role="row"><span role="columnheader"><span class="sr">Feature</span></span><span role="columnheader" class="me">Sawyer</span><span role="columnheader">Angi</span></div>${ho.map(([k,x,y])=>`<div class="t6vs-r" role="row"><span role="rowheader">${k}</span><span role="cell" class="me">${I("check",16)}${x}</span><span role="cell">${y}</span></div>`).join("")}</div>`;
  let v=vs.replace("<h2>Sawyer vs. Angi, for pros.</h2>",`<h2>Sawyer vs. Angi.</h2><div class="v13vs-tabs" role="tablist" aria-label="Compare for"><button type="button" role="tab" aria-selected="true" class="on" data-vs13="H">${I("home",16)}For homeowners</button><button type="button" role="tab" aria-selected="false" data-vs13="P">${I("wrench",16)}For pros</button></div>`)
   .replace('<div class="t6vs-t card" role="table" aria-label="Sawyer compared with Angi"',tbl+'<div class="t6vs-t card" role="table" aria-label="Sawyer compared with Angi, for pros" id="vsP" hidden')
   .replace("Angi column reflects its publicly described pay-per-lead model for service pros;","Angi column reflects its publicly described model: requests are matched to pros, who pay per lead;");
  const w=h.indexOf('<section class="v4sec v4w" id="whySawyer"');const we=w<0?-1:h.indexOf("</section>",w);if(we>0)h=h.slice(0,we+10)+v+h.slice(we+10);else h+=v}
 // stories after the top pros, travel work for contractors last before the final CTAs
 const proof=cut(/<section class="t6proof" id="homeProof">[\s\S]*?<\/div><\/div><\/section>/);
 if(proof){const f=h.indexOf('<section class="v4sec v4alt v4feat"');const fe=f<0?-1:h.indexOf("</section>",h.indexOf('<div class="v4pro-g">',f));if(fe>0)h=h.slice(0,fe+10)+proof+h.slice(fe+10);else h+=proof}
 const trav=cut(/<section class="v4sec v4w t5home" id="travelHome">[\s\S]*?<\/section>/);
 if(trav){const s=h.indexOf('<section class="v4w v4split"');h=s<0?h+trav:h.slice(0,s)+trav+h.slice(s)}
 // top-rated pros: the pro's own first photo, or the honest tile (never a stock photo posing as their work)
 h=h.replace(/(<a class="v4pro" href="#\/pro\/([^"]+)"><div class="v4pro-img">)<img [^>]*>/g,(m,a,id)=>{const u=U(id);return u&&typeof v13CardImg==="function"?a+v13CardImg(u):m});
 }catch(e){}return h}}
{const oa=AFTER.home;AFTER.home=(...a)=>{oa&&oa(...a);const tabs=[...document.querySelectorAll("[data-vs13]")];tabs.forEach(b=>b.onclick=()=>tabs.forEach(x=>{const on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-selected",on);const t=document.getElementById("vs"+x.dataset.vs13);if(t)t.hidden=!on}))}}
/* traveler board: calls first; the state map stays folded until someone opens it (remembered for the session) */
{const oa=AFTER.travel;AFTER.travel=(...a)=>{oa&&oa(...a);try{const m=document.getElementById("tMap");if(!m)return;m.open=sessionStorage.tMapO==="1";m.addEventListener("toggle",()=>{sessionStorage.tMapO=m.open?"1":"0"})}catch(e){}}}
/* dashboards: town instead of a bare ZIP, "property log" for businesses, no second "invoices due" card when what's-next already has Pay */
{const od=VIEWS.dash;VIEWS.dash=(...a)=>{let h=od(...a);try{const m=me();if(!m)return h;
 h=h.replace(/(<p class="uh-s">)(\d{5})( ·)/,(x,a,z,b)=>a+esc(townOf(z)||z)+b);
 if(m.biz&&m.role==="customer")h=h.replace("<b>Your home log</b>","<b>Your property log</b>");
 if(/<div class="v13-dtop">[\s\S]*?href="#\/pay\//.test(h)&&!/estimates? waiting for your approval/.test(h))h=h.replace(/<div class="o7-wrap"><a class="card v7billcard"[\s\S]*?<\/a><\/div>/,"");
 }catch(e){}return h}}
/* QA sweep-1 SW-011/SW-022: every view has exactly one H1 (visually hidden when the design has none), Find cards sit
   under an H2, and unknown routes get a real "Page not found" H1 + document title */
VIEWS.notfound=()=>`<section class="page narrow"><div class="empty nf13">${I("map",28)}<h1>Page not found</h1><p class="muted">That link doesn't go anywhere. It may have moved, or the address has a typo.</p><div class="row wrapr"><a class="btn primary" href="#/home">Go home</a><a class="btn ghost" href="${href("find")}">Find a pro</a></div></div></section>`;
if(typeof document!=="undefined"&&typeof render==="function"){const or=render;render=function(){const r=or.apply(this,arguments);try{const app=document.getElementById("app");if(!app)return r;
 if(!VIEWS[ROUTE.v]){document.title="Page not found · Sawyer"}
 if(!app.querySelector("h1")){const t=(document.title||"Sawyer").split(" · ")[0].split(": ")[0];app.insertAdjacentHTML("afterbegin",`<h1 class="sr" data-h13>${esc(t)}</h1>`)}
 /* QA SW-012 + axe: aria-pressed only on button roles, tabs inside tablists, named icon buttons, focusable scrollers */
 app.querySelectorAll("a[aria-pressed]:not([role])").forEach(a=>a.setAttribute("role","button"));
 app.querySelectorAll('[role=tablist]>a:not([role])').forEach(a=>{a.setAttribute("role","tab");if(!a.hasAttribute("aria-selected"))a.setAttribute("aria-selected",a.classList.contains("on")||a.getAttribute("aria-current")==="page"?"true":"false")});
 app.querySelectorAll("button[data-view]:not([aria-label])").forEach(b=>b.setAttribute("aria-label",b.dataset.view==="map"?"Map view":"Grid view"));
 app.querySelectorAll(".tablewrap,.j9steps,ol").forEach(e=>{if(e.scrollWidth>e.clientWidth+2&&!e.querySelector("a,button,input,select,textarea,[tabindex]"))e.tabIndex=0});
 app.querySelectorAll('[role=columnheader]').forEach(e=>{if(!e.textContent.trim())e.innerHTML='<span class="sr">Feature</span>'});
 const res=app.querySelector(".fx-res");if(res&&!res.querySelector("h2")&&res.querySelector("h3"))res.insertAdjacentHTML("afterbegin",'<h2 class="sr">Results</h2>');
 }catch(e){}return r}}
/* QA SW-034: account deletion. The server endpoint (/api/account/delete) calls this after its own checks, then removes
   the login, sessions, passkeys and uploads. Not in ACTIONS, so /api/act can't call it directly. */
A.__delete13=function(){const m=me();if(!m)return{ok:false,msg:"Sign in first"};if(m.demo)return{ok:false,msg:"Demo accounts can't be deleted."};
 const live=(DB.jobs||[]).filter(j=>(j.cust===m.id||j.hired===m.id)&&j.hired&&j.status!=="completed"&&j.status!=="posted");
 if(live.length)return{ok:false,msg:`Finish or cancel your ${live.length===1?"active job":live.length+" active jobs"} first, so nobody is left with money held in escrow.`};
 const gone=new Set((DB.jobs||[]).filter(j=>j.cust===m.id&&j.status==="posted"&&!j.hired).map(j=>j.id));
 DB.jobs=(DB.jobs||[]).filter(j=>!gone.has(j.id));DB.quotes=(DB.quotes||[]).filter(q=>!gone.has(q.job)&&!(q.cid===m.id&&q.status==="sent"));
 const keep={id:m.id,created:m.created};for(const k of Object.keys(m))delete m[k];
 Object.assign(m,keep,{name:"Former Sawyer member",role:"deleted",email:"",zip:"",deleted13:Date.now()});
 if(typeof save==="function")save();return{ok:true,msg:"Account deleted"}};
if(typeof document!=="undefined"){
 {const ov=VIEWS.account;if(ov)VIEWS.account=function(){const h=ov.apply(this,arguments);const m=me();if(!m||!/id="signinMethods"/.test(h))return h;
  const card=`<div class="card del13" id="delAcct"><h2 class="h-sub">${I("x",16)} Delete account</h2><p class="muted small">This signs you out everywhere, removes your sign-in methods, photos and contact details, and takes your profile out of search. Reviews you wrote stay, credited to “Former Sawyer member”. This can't be undone.</p><button class="btn ghost danger13" id="delGo" type="button">Delete my account</button></div>`;
  const k=h.lastIndexOf("</section>");return k<0?h+card:h.slice(0,k)+card+h.slice(k)}}
 {const oa=AFTER.account;AFTER.account=function(){if(oa)oa.apply(this,arguments);const $=s=>document.getElementById(s);
  if(sessionStorage.getItem("pw13")==="1"&&$("setPw")){clearTimeout(window.__pw13t);window.__pw13t=setTimeout(()=>{const b=document.getElementById("setPw");if(!b||document.getElementById("npw")||sessionStorage.getItem("pw13")!=="1")return;sessionStorage.removeItem("pw13");b.click();const c=document.getElementById("cpw");if(c){const f=c.closest(".fld");if(f)f.remove();document.querySelectorAll("h2").forEach(h=>{if(h.textContent==="Change your password")h.textContent="Set a new password"})}toast("You're signed in with a one-time code. Set a new password now.")},700)}
  const g=$("delGo");if(!g)return;g.onclick=()=>{const m=me()||{};openModal(`<h2>Delete your account?</h2><p class="muted">${m.demo?"Demo accounts are shared, so they can't be deleted. Create your own account to try this.":"Everything tied to your login is removed and you'll be signed out on every device. Type <b>DELETE</b> to confirm."}</p>${m.demo?"":`<div class="fld"><label for="delTxt">Type DELETE</label><input id="delTxt" autocomplete="off" autocapitalize="characters"></div><button class="btn primary block danger13" id="delYes" type="button" disabled>Delete my account</button>`}`,()=>{const t=$("delTxt"),y=$("delYes");if(!t)return;t.oninput=()=>{y.disabled=t.value.trim()!=="DELETE"};
   y.onclick=async()=>{y.disabled=true;const r=await jpost("/api/account/delete",{confirm:t.value.trim()});if(r.error){y.disabled=false;toast(r.error,"err");return}closeModal();if(r.state&&typeof __applyState==="function")__applyState(r.state);toast("Your account was deleted. Sorry to see you go.");location.hash="#/home";setTimeout(()=>location.reload(),600)}})}}}
 /* QA SW-033: "Forgot password?" sends a one-time sign-in code to the account email, then opens Set a password. */
 {const or2=render;render=function(){const r=or2.apply(this,arguments);try{if(sessionStorage.getItem("pw13")==="1"&&me()&&ROUTE.v!=="account")location.hash="#/account"}catch(e){}return r}}
}

/* v14: (1) fair-price check on quotes and bid comparison, (2) a traveler-first dashboard for traveling-trade accounts. */
// (1) Fair-price check: each quote is read against Sawyer's typical range for that job (the range the request wizard
// stored, or the same rules-based estimate the price guide uses). Owners see where every bid lands; pros see the range
// before they quote. Shown only while the job is open, so a finished job is never relabeled after the fact.
// Common jobs whose real installed cost sits far from the trade-wide base range (U.S. average, before the regional
// index). v14 feeds these into estimateRange itself, so the request wizard, the price guide examples, the stored
// est11 range and the quote check all agree.
const V14JOBS=[[["Plumbing"],/tankless/,2500,5200,"tankless water heater"],[["Plumbing"],/water heater/,1200,2600,"water heater replacement"],
 [["Plumbing","Well & Water"],/sump pump/,600,1800,"sump pump"],[["Plumbing"],/repipe/,4000,12000,"whole-house repipe"],[["Plumbing"],/sewer line|main line/,3000,9000,"sewer line work"],
 [["Electrical"],/panel|\b200 ?a(mp)?\b|service upgrade/,1800,4500,"panel upgrade"],[["Electrical"],/ev charger|car charger/,800,2200,"EV charger install"],[["Electrical"],/generator/,4000,12000,"standby generator"],
 [["HVAC"],/mini[- ]?split/,3000,8000,"mini-split install"],[["HVAC"],/\b(replace|replacement|new)\b.*\b(furnace|ac|a\/c|system|heat pump)\b|\b(furnace|ac|heat pump) (replacement|install)/,5500,13000,"system replacement"],
 [["Roofing"],/roof (replace|replacement)|full roof|re-?roof/,8000,20000,"roof replacement"],[["Remodeling"],/kitchen remodel/,20000,60000,"kitchen remodel"],[["Remodeling"],/bath(room)? remodel/,9000,28000,"bathroom remodel"],
 [["Decks & Docks"],/dock (removal|take ?out)|dock (in|out)\b/,250,900,"seasonal dock in/out"],[["Fencing"],/new fence|fence (install|replace)/,1800,6000,"fence install"]];
if(typeof estimateRange==="function"){const oe=estimateRange;estimateRange=function(o){const r=oe(o);try{o=o||{};const d=String(o.desc||"").toLowerCase();const hit=V14JOBS.find(([cats,re])=>cats.includes(r.cat)&&re.test(d));if(!hit)return r;
 const ur=EST_URG[o.urg]||EST_URG.soon,st=ZIPS[o.zip]?ZIPS[o.zip][0].slice(-2):"",rg=EST_REGION[st]||1,m=ur[0]*rg,rd=n=>n<1000?Math.round(n/10)*10:Math.round(n/50)*50;
 return{cat:r.cat,low:rd(hit[2]*m),high:rd(hit[3]*m),mult:Math.round(m*100)/100,job:hit[4],factors:[{k:"Typical installed cost: "+hit[4],v:money(hit[2])+"–"+money(hit[3])},{k:"Urgency: "+ur[1],x:ur[0]},{k:"Regional cost index"+(st?" ("+st+")":""),x:rg}]}}catch(e){return r}}}
function v14Range(j){if(!j)return null;
 try{const r=estimateRange({cat:j.cat,size:j.size11||"medium",urg:j.urgent?"urgent":"soon",zip:j.zip,desc:(j.title||"")+" "+(j.desc||"")});return r&&r.low>0&&r.high>=r.low?{low:r.low,high:r.high}:null}catch(x){return null}}
// Conservative bands: a bid has to be clearly outside the range before it's called out, so honest pros aren't penalized
// for scope the estimate can't see.
function v14Fair(price,rg){if(!rg||!(price>0))return null;
 if(price>rg.high*2)return{k:"hi2",t:"Well above typical",tip:"Ask what's included before you hire. It may cover extra work."};
 if(price>rg.high*1.25)return{k:"hi",t:"Above typical",tip:"Over the usual range for this job. Ask what's included."};
 if(price<rg.low*0.5)return{k:"lo",t:"Well below typical",tip:"Confirm the scope, materials and permits are included."};
 return{k:"ok",t:"In typical range",tip:"Close to what this job usually costs nearby."}}
const v14Chip=f=>f?`<span class="fp14 fp14-${f.k}" title="${esc(f.tip)}">${I(f.k==="ok"?"check":"info",12)}${esc(f.t)}</span>`:"";
const v14Num=s=>+String(s).replace(/[^0-9.]/g,"");
const v14Band=(j,rg,who)=>`<div class="fp14-band" role="note">${I("dollar",16)}<span><b>Typical for this job near ${esc(townOf(j.zip||"78704"))}: ${money(rg.low)} – ${money(rg.high)}</b><small>${who==="pro"?"Based on what similar jobs cost nearby. Customers see where each quote lands.":"Based on what similar jobs cost nearby. Each quote is marked against it. It's a guide, not a quote."}</small></span></div>`;
{const oj=VIEWS.job;VIEWS.job=function(id,q){let h=oj.apply(this,arguments);try{const j=(DB.jobs||[]).find(x=>x.id===id),m=me();
  if(!j||!m||j.status!=="posted")return h;const owner=m.id===j.cust,pro=m.role==="contractor";if(!owner&&!pro)return h;const rg=v14Range(j);if(!rg)return h;
  // one range on the page: the v11 "Typical range for this job" line (stored when posted) gives way to the band below
  h=h.replace(/<p class="w11-jrange">[\s\S]*?<\/p>/,"");
  h=h.replace(/<b class="qprice">([^<]*)<\/b>/g,(x,p)=>x+v14Chip(v14Fair(v14Num(p),rg)));
  const k=h.search(/<h2 class="h-sub">Quotes \(/);if(k>=0)h=h.slice(0,k)+v14Band(j,rg,owner?"owner":"pro")+h.slice(k);
  else if(pro&&h.includes('id="doQuote"'))h=h.replace(/<div class="actions"><button class="btn primary" id="doQuote"/,x=>v14Band(j,rg,"pro")+x);// function replacer: the band's "$1,400" must not read as a capture reference
 }catch(e){}return h}}
{const oc=VIEWS.compare;VIEWS.compare=function(jid){let h=oc.apply(this,arguments);try{const j=(DB.jobs||[]).find(x=>x.id===jid),m=me();
  if(!j||!m||m.id!==j.cust||j.status!=="posted")return h;const rg=v14Range(j);if(!rg||!h.includes('class="cmp-price"'))return h;
  h=h.replace(/(<b class="cmp-price">([^<]*)<\/b>)/g,(x,a,p)=>a+v14Chip(v14Fair(v14Num(p),rg)));
  h=h.replace('<div class="wrap"><div class="cmp"',()=>'<div class="wrap">'+v14Band(j,rg,"owner")+'<div class="cmp"');
 }catch(e){}return h}}

// (2) Traveler-first dashboard: a traveling-trade account opens on its work (matching calls, applications, invites,
// references) instead of the homeowner shell. Home tools stay below, under "Your home".
function v14TravStats(m){const t=m.trav||{},calls=(DB.tcalls||[]).filter(c=>c.status==="open"||!c.status);
 const st=new Set(t.states||[]),any=st.has("ANY");
 const mine=c=>(c.apps||[]).find(a=>a.uid===m.id&&a.status!=="withdrawn");
 const match=calls.filter(c=>c.trade===t.trade&&(any||!st.size||st.has(c.state))&&!mine(c)&&c.by!==m.id);
 const apps=(DB.tcalls||[]).map(c=>({c,a:mine(c)})).filter(x=>x.a);
 const inv=calls.filter(c=>(c.invites||[]).includes(m.id)&&!mine(c));
 const refs=(DB.refs||[]).filter(r=>r&&r.trav===m.id&&r.status==="given");
 const wk=c=>{try{return tWeekly(c)}catch(e){return 0}};
 match.sort((a,b)=>(inv.includes(b)-inv.includes(a))||(wk(b)-wk(a)));
 return{t,match,apps,inv,refs,active:apps.filter(x=>x.a.status==="pending"||x.a.status==="short").length,hired:apps.filter(x=>x.a.status==="hired").length,wk}}
function v14TravBlock(m){const s=v14TravStats(m),t=s.t;
 const tile=(n,l,ic,to)=>`<a class="tv14-t" href="${to}"><span class="tv14-ti">${I(ic,16)}</span><b>${n}</b><small>${l}</small></a>`;
 const row=c=>`<li><a href="${href("tcall",c.id)}"><span class="tv14-c"><b>${esc(c.title)}</b><small>${esc(c.loc||"")}${c.state?", "+esc(c.state):""} · ${esc(c.lic||"")}${c.weeks?" · "+c.weeks+" wks":""}</small></span><span class="tv14-p"><b>${tMoney(+c.rate||0)}/hr</b><small>${c.perDiem?"+$"+esc(c.perDiem)+"/day per diem":"No per diem"}</small></span>${s.inv.includes(c)?`<em class="tv14-inv">Invited</em>`:""}</a></li>`;
 const list=s.match.slice(0,3);
 return`<section class="tv14 wrap" aria-labelledby="tv14h"><div class="tv14-hd"><h2 id="tv14h">Your travel work</h2><a href="${href("tdash",null,{view:"me"})}">Traveler dashboard ${I("chev",14)}</a></div>
 <div class="tv14-tiles">${tile(s.match.length,s.match.length===1?"open call fits your trade and states":"open calls fit your trade and states","zap",href("travel"))}${tile(s.active,"active applications","send",href("tdash",null,{view:"me"}))}${tile(s.inv.length,s.inv.length===1?"invite from a contractor":"invites from contractors","bell",href("tdash",null,{view:"me"}))}${tile(s.refs.length,s.refs.length===1?"reference from a foreman":"references from foremen","award",href("traveler",m.id))}</div>
 <div class="tv14-grid"><div class="tv14-m card"><h3>Best matches for you</h3>${list.length?`<ul class="tv14-l">${list.map(row).join("")}</ul>`:`<p class="muted small">No open ${esc((t.trade||"").toLowerCase())} calls in your states right now. Add more states to your profile or set an alert.</p>`}<a class="btn primary" href="${href("travel")}">${I("search",16)}See all calls</a></div>
 <div class="tv14-q card"><h3>Your status</h3><p class="tv14-av">${t.availNow?`<span class="badge b-now"><i class="pulse"></i>Available now</span>`:t.availDate?`<span class="badge">${I("clock",12)}Available from ${esc(fmtD(t.availDate))}</span>`:`<span class="badge">Availability not set</span>`}</p><p class="small muted">${esc(t.trade||"")}${t.yrs?" · "+t.yrs+" yrs":""}${(t.lic||[]).length?" · "+esc(t.lic.map(l=>l.type+(l.state?" "+l.state:"")).join(", ")):""}</p>
 <nav class="tv14-links" aria-label="Travel tools"><a href="${href("traveler",m.id)}">${I("user",15)}My traveler profile</a><a href="${href("lodging")}">${I("home",15)}Lodging board</a><a href="${href("perdiem")}">${I("calc",15)}Per diem guide</a></nav></div></div></section>`}
const v14IsTrav=m=>!!(m&&m.trav&&m.role!=="contractor"&&m.role!=="pm");
{const od=VIEWS.dash;VIEWS.dash=function(){let h=od.apply(this,arguments);try{const m=me();if(!v14IsTrav(m))return h;
  const t=m.trav||{};
  h=h.replace(/(<span class="uh-k">[\s\S]*?<\/svg>) Homeowner<\/span><h1>[^<]*<\/h1><p class="uh-s">[^<]*<\/p>/,(x,a)=>`${a.replace(/<svg[\s\S]*<\/svg>/,I("truck",14))} Traveler</span><h1>Your travel work</h1><p class="uh-s">${esc(t.headline||t.trade||"Traveling trades")}${t.home?" · home base "+esc(t.home):""}</p>`);
  h=h.replace(/(<div class="uh-r">)<a class="btn primary lg" href="[^"]*">[\s\S]*?<\/a><a class="btn glass" href="[^"]*">[\s\S]*?<\/a>/,(x,a)=>`${a}<a class="btn primary lg" href="${href("travel")}">${I("search",16)}Find calls</a><a class="btn glass" href="${href("post")}">${I("plus",16)}Post a home job</a>`);
  const k=h.indexOf("</header>");if(k<0)return h;
  return h.slice(0,k+9)+v14TravBlock(m)+`<div class="wrap tv14-home"><h2>Your home</h2></div>`+h.slice(k+9);
 }catch(e){}return h}}

/* v16: (1) SW-018 partial profile state guard, (2) expiry reminders on one schedule, (3) honest dashboard numbers and first-run guidance. */
// (1) A signed-out /p/<id> page starts with only that profile's data (see client-pre.js). Any other page waits for the
// full public state first (one quick synchronous load), so search, other profiles and the home page never render from
// the slim copy.
if(typeof document!=="undefined"&&typeof render==="function"&&typeof __fullSync==="function"){const r16=render;render=function(){try{if(!__partOk())__fullSync()}catch(e){}return r16.apply(this,arguments)}}

// (2) Records: one expiry schedule, and vendor COIs that carry a real expiry date.
// Pros' own licenses and policies already get notices 60, 30 and 7 days out and on the day (v9Sweep); the server now runs
// that sweep for every account with dated records, not only pros who turned on payment reminders (see server.js).
// Customers and businesses who ask a pro for a certificate of insurance now get the policy's carrier, number and expiry
// (from the pro's general liability record), see it on their dashboard, get notices 30 and 7 days out and on the day,
// and can ask for an updated certificate in one tap.
function v16Gl(pid){return (DB.bdocs||[]).filter(d=>d.by===pid&&d.scope==="biz"&&d.kind==="gl"&&d.exp).sort((a,b)=>String(b.exp).localeCompare(String(a.exp)))[0]||null}
function v16Cois(m){const by=new Map();for(const c of (m&&m.cois)||[]){if(!c||!c.cid)continue;const p=by.get(c.cid);if(!p||(c.date||0)>=(p.date||0))by.set(c.cid,c)}return [...by.values()]}
function v16CoiState(c){if(c.status==="requested")return["req","Requested "+(typeof ago==="function"?ago(c.date):"")];if(!c.exp)return["ok","Received"+(c.at?" "+fmtD(new Date(c.at).toISOString().slice(0,10)):"")+" · no expiry on file"];
 const n=v7DaysTo(c.exp);if(n<0)return["bad","Expired "+fmtD(c.exp)];if(n<=30)return["warn","Expires in "+n+" day"+(n===1?"":"s")+" ("+fmtD(c.exp)+")"];return["ok","Valid to "+fmtD(c.exp)]}
if(typeof A!=="undefined"&&A.sendCOI){const os=A.sendCOI;A.sendCOI=function(rid){const m=me();const rq=m&&(m.coiReqs||[]).find(x=>x.id===rid);const r=os.apply(this,arguments);
 try{if(r&&r.ok&&rq){const c=U(rq.from);const e=c&&(c.cois||[]).filter(x=>x.cid===m.id&&x.status==="received").sort((a,b)=>(b.at||0)-(a.at||0))[0];const g=v16Gl(m.id);
  if(e){if(g){e.exp=g.exp;e.carrier=String(g.holder||"").slice(0,100);e.num=String(g.num||"").slice(0,60);e.policy=String(g.name||"General liability").slice(0,100)}else{delete e.exp}e.rem16=[];save()}
  if(!g)r.msg="COI sent. Add your general liability policy and its expiry under Office → Documents so customers see it's current.";
  else if(v7DaysTo(g.exp)<0)r.msg="COI sent, but your general liability shows as expired. Upload the renewal under Office → Documents."}}catch(x){}return r}}
if(typeof v9Sweep==="function"){const o9=v9Sweep;v9Sweep=function(m){let n=o9.apply(this,arguments)||0;try{if(m&&m.role==="customer"){for(const c of v16Cois(m)){if(c.status!=="received"||!c.exp)continue;const left=v7DaysTo(c.exp);const step=[0,7,30].find(x=>left<=x);if(step==null)continue;c.rem16=c.rem16||[];if(c.rem16.includes(step))continue;c.rem16.push(step);
  const nm=nameOf(U(c.cid));notify(m.id,left<0?`${nm}'s certificate of insurance expired ${fmtD(c.exp)}. Ask for an updated one before they're back on site.`:`${nm}'s certificate of insurance expires in ${left} day${left===1?"":"s"} (${fmtD(c.exp)}). Ask for an updated one before their next visit.`,"dash");n++}}}catch(e){}return n}}
if(typeof bizPanel==="function"){const ob=bizPanel;bizPanel=function(m){let h=ob.apply(this,arguments);try{const cs=v16Cois(m);
 const li=cs.map(c=>{const s=v16CoiState(c),u=U(c.cid);const due=s[0]==="bad"||s[0]==="warn";return`<li class="coi16 coi16-${s[0]}">${I("shield",14)}<span><b>${esc((u&&(u.biz||u.name))||"Pro")}</b><small>${esc([c.policy,c.carrier,c.num].filter(Boolean).join(" · "))}</small><em>${esc(s[1])}</em></span>${due?`<button class="btn sm" type="button" data-coi16="${esc(c.cid)}">Ask for an updated COI</button>`:""}</li>`}).join("");
 // the panel's Invoices list showed only finished Sawyer jobs, so a business with a real invoice to pay read "Invoices appear here when jobs complete"
 const bs=(DB.bills||[]).filter(b=>b.cuid===m.id&&b.type==="inv"&&b.status!=="draft"&&b.status!=="void").sort((a,b)=>(b.date||0)-(a.date||0));
 if(bs.length)h=h.replace(/<h4>Invoices<\/h4><ul class="v3list">[\s\S]*?<\/ul>/,()=>`<h4>Invoices</h4><ul class="v3list inv16-l">${bs.slice(0,4).map(b=>{const c=billCalc(b),open=c.bal>0.004,od=open&&b.due&&v7DaysTo(b.due)<0;return`<li>${I("dollar",14)}<a href="${open?href("pay",b.id):href("bills")}"><b>${esc(b.no||"Invoice")}</b><span>${esc(b.bizName||"")}</span><small>${open?v7$(c.bal)+(od?" overdue since "+fmtD(b.due):b.due?" due "+fmtD(b.due):" due"):"Paid · "+v7$(c.total)}</small></a></li>`}).join("")}</ul><a class="inv16-all" href="${href("bills")}">All invoices${bs.length>4?" ("+bs.length+")":""}</a>`);
 h=h.replace(/<h4>Certificates of insurance<\/h4><ul class="v3list">[\s\S]*?<\/ul>/,()=>`<h4>Certificates of insurance</h4><ul class="v3list coi16-l">${li||`<li class="muted small">Ask any pro for a certificate from their profile or below. We'll track its expiry and remind you 30 days out.</li>`}</ul>`)}catch(e){}return h}}
if(typeof AFTER!=="undefined"){const od=AFTER.dash;AFTER.dash=function(){const r=od&&od.apply(this,arguments);try{document.querySelectorAll("[data-coi16]").forEach(b=>b.onclick=()=>act(A.requestCOI(b.dataset.coi16,""),render))}catch(e){}return r}}
// demo data: the demo business holds Bluebonnet's certificate, which runs out with Bluebonnet's liability policy
function seedV16(){if(typeof DB==="undefined"||!DB||!DB.users)return;const b=U("b1"),g=v16Gl("c1");if(!b||!g||b.coi16seed)return;b.cois=(b.cois||[]).filter(c=>c.cid!=="c1");
 b.cois.push({cid:"c1",date:Date.now()-40*864e5,status:"received",at:Date.now()-39*864e5,exp:g.exp,carrier:String(g.holder||""),num:String(g.num||""),policy:String(g.name||"General liability"),rem16:[],demo:true});b.coi16seed=true;save()}
if(typeof __liveLoad==="undefined"){try{seedV16()}catch(e){}{const os=seed;seed=function(){const r=os.apply(this,arguments);try{seedV16()}catch(e){}return r}}}
// a renewed record starts its reminder schedule over (the old notices were for the old expiry date)
if(typeof A!=="undefined"&&A.saveDoc){const osd=A.saveDoc;A.saveDoc=function(o){const m=me();const prev=o&&o.id&&m&&(DB.bdocs||[]).find(x=>x.id===o.id&&x.by===m.id);const was=prev?prev.exp:undefined;const r=osd.apply(this,arguments);try{if(r&&r.ok!==false&&prev&&prev.exp!==was)prev.rem9=[]}catch(e){}return r}}

// (3) Honest dashboards and first-run guidance.
// Pro dashboard: "profile views · 30d" was a made-up number with a fixed "+12% vs last month". It now counts real views
// (server table, one per visitor per day) with a real 30-day sparkline. Decorative sparklines on the other tiles were
// random squiggles, even on zeros, so they're gone.
function v16Views(m){const pv=(m&&m.pv16)||{},D=864e5,now=Date.now(),day=t=>new Date(t).toISOString().slice(0,10);let a=0,b=0;const pts=[];
 for(let i=29;i>=0;i--){const n=+pv[day(now-i*D)]||0;a+=n;pts.push(n)}for(let i=30;i<60;i++)b+=+pv[day(now-i*D)]||0;
 const trend=a===0?"Share your card to get seen":b===0?"Your first month of views":a===b?"Same as the 30 days before":(a>b?"+":"−")+Math.round(Math.abs(a-b)/b*100)+"% vs the 30 days before";return{a,b,pts,trend}}
function v16Spark(pts){const mx=Math.max(1,...pts);return`<svg class="spark spark16" viewBox="0 0 100 28" aria-hidden="true"><path d="${pts.map((n,i)=>(i?"L":"M")+Math.round(i*100/(pts.length-1))+" "+(25-Math.round(n/mx*20))).join(" ")}" fill="none" stroke="currentColor" stroke-width="2"/></svg>`}
if(typeof VIEWS!=="undefined"&&VIEWS.dash){const od=VIEWS.dash;VIEWS.dash=function(){let h=od.apply(this,arguments);try{const m=me();if(!m)return h;
 if(m.role==="contractor"){const v=v16Views(m);h=h.replace(/<b data-count>[^<]*<\/b><span>profile views · 30d<\/span>(?:<small>[^<]*<\/small>)?<svg class="spark"[\s\S]*?<\/svg>/,()=>`<b data-count>${v.a}</b><span>profile views · 30d</span><small>${esc(v.trend)}</small>${v.a?v16Spark(v.pts):""}`)}
 // homeowner with nothing logged yet: "9 maintenance tasks due" read like an alarm on day one
 if(m.role==="customer"&&typeof h12Jobs==="function"&&typeof h12Data==="function"){const d=h12Data(m)||{};const fresh=!h12Jobs(m).length&&!Object.keys(d.tasks||{}).length&&!(typeof h12Warranties==="function"&&h12Warranties(m).length);
  if(fresh)h=h.replace(/(<a class="card h12-teaser"[^>]*>[\s\S]*?<b>Your home log<\/b>)<small>[\s\S]*?<\/small>/,(x,a)=>a+`<small>Jobs, warranties and seasonal upkeep in one place · <em class="h16-ok">Set up your maintenance plan</em></small>`)}
 // project manager with no projects: say how a crew comes together, next to the empty card
 if(m.role==="pm"&&!(DB.projects||[]).some(p=>p.pm===m.id))h=h.replace(/(<div class="upmgrid">[\s\S]*?<b>No projects yet<\/b>[\s\S]*?<\/div>)(<\/div>)/,(x,a,b)=>a+`<div class="pm16-guide"><b>How a crew comes together</b><ol><li><span>1</span><div><b>Post the project</b><small>Dates, location and how many of each trade, like 2 plumbers and 1 electrician for a pool build.</small></div></li><li><span>2</span><div><b>Fill each slot</b><small>Sawyer suggests licensed, insured pros who are free those dates. Invite them or book the whole crew.</small></div></li><li><span>3</span><div><b>Run it from one board</b><small>Crew chat, dates on a timeline, and milestone payments (test mode).</small></div></li></ol><a class="btn sm" href="${href("find")}">Browse pros by trade</a></div>`+b)
 }catch(e){}return h}}
if(typeof AFTER!=="undefined"&&typeof document!=="undefined"&&typeof fetch==="function"){const seen16={};const op=AFTER.pro;AFTER.pro=function(id){const r=op&&op.apply(this,arguments);
 try{const u=U(id),m=me();if(u&&u.role==="contractor"&&!(m&&m.id===u.id)&&!seen16[id]){seen16[id]=1;fetch("/api/pview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({pid:id}),credentials:"same-origin"}).then(r=>r.text()).catch(()=>{})}}catch(e){}return r}}

/* ===== v18 layer ===== */
/* SW-036 follow-through: the same field limits the server enforces (lib/limits.js), applied in the browser so people see
   them while typing. A field gets a maxlength the first time it's focused (if it has none), and a quiet counter appears
   once it's 80% full. Free-text boxes without a known name get the message limit (2,000). */
const V18LIM={name:80,biz:80,company:80,first:40,last:40,title:120,headline:120,tagline:120,trade:60,phone:30,zip:10,email:254,city:80,loc:80,license:120,insurance:160,rate:40,budget:60,cap:120,bio:1500,about:1500,desc:2000,description:2000,note:1000,notes:2000,reason:1000,text:2000,body:2000,msg:2000};
const V18ID={mtxt:2000};/* the chat composer */
function v18Max(el){if(el.maxLength>0)return el.maxLength;if(V18ID[el.id])return V18ID[el.id];if(el.name==="t"&&el.closest&&el.closest("form[data-reply]"))return 1000;const n=String(el.name||"").toLowerCase();if(Object.prototype.hasOwnProperty.call(V18LIM,n))return V18LIM[n];return el.tagName==="TEXTAREA"?2000:0}
function v18Count(el){const max=el.maxLength;if(!(max>0))return;let c=el.nextElementSibling&&el.nextElementSibling.classList&&el.nextElementSibling.classList.contains("v18-cnt")?el.nextElementSibling:null;
 const n=el.value.length,show=n>=Math.floor(max*.8);if(!show){if(c)c.hidden=true;return}
 if(!c){c=document.createElement("small");c.className="v18-cnt";c.setAttribute("aria-live","polite");el.insertAdjacentElement("afterend",c)}
 c.hidden=false;c.textContent=(max-n).toLocaleString("en-US")+" characters left";c.classList.toggle("v18-full",n>=max)}
if(typeof document!=="undefined"&&document.addEventListener&&typeof window!=="undefined"&&!window.__v18lim){window.__v18lim=1;
 const ok=el=>el&&(el.tagName==="TEXTAREA"||(el.tagName==="INPUT"&&/^(text|search|email|tel|url|)$/.test(el.type||"")));
 document.addEventListener("focusin",e=>{const el=e.target;if(!ok(el)||el.maxLength>0)return;const m=v18Max(el);if(m>0)el.maxLength=m});
 document.addEventListener("input",e=>{const el=e.target;if(ok(el)&&el.maxLength>0)v18Count(el)})}
/* Account → Your data: download a JSON copy of your account (GET /api/account/export), next to Delete account. */
if(typeof document!=="undefined"&&typeof VIEWS!=="undefined"){const ov=VIEWS.account;if(ov)VIEWS.account=function(){const h=ov.apply(this,arguments);const m=me();if(!m||!/id="delAcct"/.test(h))return h;
 const card=`<div class="card ex18" id="dataExport"><h2 class="h-sub">${I("download",16)} Your data</h2><p class="muted small">Download a copy of your profile, jobs, quotes, messages, reviews, invoices and photo links as one JSON file. Passwords and sign-in keys are never included.</p><a class="btn" id="exportGo" href="/api/account/export" download>${I("download",15)}Download my data</a></div>`;
 return h.replace('<div class="card del13" id="delAcct">',card+'<div class="card del13" id="delAcct">')}}
/* Settings: a real Change password dialog (sweep-2 improvement 9). Current password with "Forgot your current password?",
   new + confirm with show/hide, inline errors that say what to fix, Save enabled only when the form is valid, and Enter submits.
   "Forgot" emails (or texts) a one-time code to the account; a code session may set a new password without the old one
   (server rule from the SW-033 hotfix). Shared demo accounts get a plain explanation instead of a form. */
function pw18Eye(id){return `<button type="button" class="pw18-eye" data-eye="${id}" aria-controls="${id}" aria-pressed="false">Show</button>`}
function pw18Bind(){document.querySelectorAll("#modal [data-eye]").forEach(b=>b.onclick=()=>{const i=document.getElementById(b.dataset.eye);if(!i)return;const show=i.type==="password";i.type=show?"text":"password";b.textContent=show?"Hide":"Show";b.setAttribute("aria-pressed",String(show));i.focus()})}
function pw18Open(mode){const m=me()||{};
 if(m.demo){openModal(`<h2>Change your password</h2><p class="muted">Demo accounts are shared, so their password can't be changed. Create your own account to try this.</p><button class="btn block" type="button" id="pw18Ok">OK</button>`,()=>{const b=document.getElementById("pw18Ok");if(b)b.onclick=()=>closeModal()});return}
 const has=mode==="change",title=mode==="reset"?"Set a new password":has?"Change your password":"Add a password";
 openModal(`<h2>${title}</h2><form id="pw18" class="pw18" novalidate>
 ${has?`<div class="fld"><label for="cpw">Current password</label><div class="pw18-in"><input id="cpw" type="password" autocomplete="current-password" maxlength="200" required>${pw18Eye("cpw")}</div><button type="button" class="linkbtn pw18-forgot" id="pw18Forgot">Forgot your current password?</button></div>`:""}
 <div class="fld"><label for="npw">New password</label><div class="pw18-in"><input id="npw" type="password" autocomplete="new-password" minlength="8" maxlength="200" aria-describedby="npwHint" required>${pw18Eye("npw")}</div><p class="small muted pw18-hint" id="npwHint">At least 8 characters. A short phrase is easy to remember and hard to guess.</p></div>
 <div class="fld"><label for="npw2">Confirm new password</label><div class="pw18-in"><input id="npw2" type="password" autocomplete="new-password" maxlength="200" required>${pw18Eye("npw2")}</div></div>
 <p class="pw18-err" id="pw18Err" role="alert" hidden></p>
 ${has?`<p class="muted small">Other devices signed in to this account are signed out.</p>`:""}
 <button class="btn primary block" id="npwGo" type="submit" disabled>Save password</button></form>`,()=>{pw18Bind();
  const $=s=>document.getElementById(s),f=$("pw18"),go=$("npwGo"),err=$("pw18Err");
  const say=t=>{err.textContent=t||"";err.hidden=!t};
  const check=()=>{const c=$("cpw"),n=$("npw").value,n2=$("npw2").value;let msg="";
   if(n&&n.length<8)msg=`${8-n.length} more character${8-n.length===1?"":"s"} to go.`;else if(n2&&n!==n2)msg="The two new passwords don't match yet.";else if(c&&n&&c.value&&c.value===n)msg="Pick a new password that's different from your current one.";
   $("npwHint").textContent=msg||"At least 8 characters. A short phrase is easy to remember and hard to guess.";$("npwHint").classList.toggle("pw18-warn",!!msg);
   go.disabled=!!msg||n.length<8||n!==n2||(c&&!c.value);return !go.disabled};
  f.addEventListener("input",()=>{say("");check()});
  if($("pw18Forgot"))$("pw18Forgot").onclick=()=>pw18Forgot();
  f.onsubmit=async e=>{e.preventDefault();if(!check())return;go.disabled=true;go.textContent="Saving…";
   const r=await jpost("/api/account/password",{password:$("npw").value,current:$("cpw")?$("cpw").value:""});
   go.textContent="Save password";if(r.error){say(r.error);check();const c=$("cpw");if(c&&/current/i.test(r.error)){c.focus();c.select()}return}
   closeModal();toast(has?"Password changed. Other devices were signed out.":"Password saved");render()};
  setTimeout(()=>{const first=$("cpw")||$("npw");if(first&&!f.contains(document.activeElement))first.focus()},60)})}
function pw18Forgot(){let info={};try{info=__xhr("GET","/api/account")||{}}catch(e){}
 const ch=info.email?"email":info.phone?"sms":"",to=info.email||info.phone||"";
 if(!ch){openModal(`<h2>Forgot your current password?</h2><p class="muted">This account has no email or phone for a one-time code. Sign out and use "Forgot password?" on the sign-in page, or sign in with a passkey or a linked account.</p>`);return}
 openModal(`<h2>Reset with a one-time code</h2><p class="muted">We'll ${ch==="email"?"email":"text"} a 6-digit code to <b>${esc(to)}</b>. Enter it here, then set a new password. You won't need the old one.</p>
 <button class="btn primary block" type="button" id="pw18Send">${ch==="email"?"Email":"Text"} me a code</button>
 <form id="pw18Code" class="pw18" hidden novalidate><div class="fld"><label for="pw18c">6-digit code</label><input id="pw18c" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></div><p class="small muted" id="pw18Note"></p><p class="pw18-err" id="pw18Err" role="alert" hidden></p><button class="btn primary block" type="submit" id="pw18Verify">Verify code</button></form>`,()=>{
  const $=s=>document.getElementById(s),say=t=>{const e=$("pw18Err");e.textContent=t||"";e.hidden=!t};
  $("pw18Send").onclick=async()=>{const b=$("pw18Send");b.disabled=true;const r=await jpost("/api/auth/start",{channel:ch,to});b.disabled=false;
   if(r.error){toast(r.error,"err");return}b.textContent="Send a new code";b.classList.remove("primary");$("pw18Code").hidden=false;
   $("pw18Note").textContent=r.test&&r.code?"Test mode: no "+(ch==="email"?"email":"text")+" provider is set up on this server, so your code is "+r.code+".":"Sent. It expires in 10 minutes.";$("pw18c").focus()};
  $("pw18Code").onsubmit=async e=>{e.preventDefault();const code=$("pw18c").value.replace(/\D/g,"");if(code.length!==6){say("Enter the 6 digits from the code.");return}
   const r=await jpost("/api/auth/verify",{channel:ch,to,code});if(r.error){say(r.error);return}pw18Open("reset")}})}
if(typeof AFTER!=="undefined"){const oa=AFTER.account;AFTER.account=function(){if(oa)oa.apply(this,arguments);const b=document.getElementById("setPw");if(!b)return;b.onclick=()=>pw18Open(/Change/.test(b.textContent)?"change":"add")}}

/* ===== hotfix-sec layer (QA sweep 1) ===== */
/* SW-003: no inline event handlers (the Content-Security-Policy blocks them). Buttons carry data-csp + data-arg instead. */
if(typeof document!=="undefined"&&document.addEventListener&&typeof window!=="undefined"&&!window.__secCsp){window.__secCsp=1;
 const CSP_FN={shareLink:a=>shareLink(a),contactPro:a=>contactPro(a),messagePro:a=>messagePro(a),toggleFav:(a,el)=>toggleFav(a,el),uShareApp:()=>uShareApp()};
 document.addEventListener("click",e=>{const b=e.target&&e.target.closest&&e.target.closest("[data-csp]");if(!b)return;const f=CSP_FN[b.dataset.csp];if(!f)return;e.preventDefault();try{f(b.dataset.arg,b)}catch(x){console.warn(x)}});
 document.addEventListener("submit",e=>{const f=e.target;if(!f||!f.matches||!f.matches("form[data-reply]"))return;e.preventDefault();act(A.reply(f.dataset.reply,(f.t&&f.t.value)||""))})}
/* SW-007: typed or shared pretty URLs (/prices, /find?cat=Roofing, /job/j12) open the same view as the #/ route */
if(typeof location!=="undefined"&&typeof history!=="undefined"&&typeof window!=="undefined"&&window.addEventListener){try{const pn=location.pathname;if(pn&&pn!=="/"&&pn!=="/index.html"&&!/^\/[pt]\/[\w-]+$/.test(pn)&&(!location.hash||location.hash.length<3)&&/^\/[a-z0-9]+(\/[\w.-]+)?\/?$/.test(pn))history.replaceState(null,"","/#"+pn.replace(/\/$/,"")+location.search)}catch(x){}}
/* SW-005: one light Linen & Navy theme. Anything saved from the old dark toggle is ignored. */
if(typeof document!=="undefined"&&document.documentElement){try{document.documentElement.dataset.theme="light";if(typeof DB==="object"&&DB)DB.theme="light"}catch(x){}}
/* SW-008: stock photos are never shown as a pro's own work. Profiles without the pro's own uploaded job photos get an
   honest "Job photos coming soon" state; cover and search-card photos stay purely decorative (empty alt, no captions). */
function secOwnPhotos(u){return (DB.jobs||[]).some(j=>j.hired===u.id&&(j.photos||[]).some(p=>/^\/u\//.test(String(p.src||""))))}
if(typeof VIEWS!=="undefined"&&VIEWS.pro){const ov=VIEWS.pro;VIEWS.pro=function(id){let h=ov.apply(this,arguments);try{const u=U(id);if(!u||u.role!=="contractor")return h;const m=me(),own=!!(m&&m.id===u.id);
 h=h.replace(/<div class="px-cover[^"]*">[\s\S]*?<div class="px-shade">/,x=>x.replace(/ alt="[^"]*"/g,' alt=""'));
 if(!secOwnPhotos(u))h=h.replace(/<div class="gallery g\d">[\s\S]*?<\/div>/,()=>`<div class="sec-soon"><span class="sec-si">${I("camera",22)}</span><div><b>${own?"Add photos of your work":"Job photos coming soon"}</b><small>${own?"Photos you add to a job you were hired for show here once the customer confirms it's done.":esc(u.biz||"This pro")+" hasn't added photos of their own jobs yet. Ask for pictures of similar work when you request a quote."}</small></div></div>`);
 }catch(e){}return h}}
if(typeof PROCARD==="function"){const oc=PROCARD;PROCARD=function(x){const h=oc.apply(this,arguments);try{return h.replace(/(<div class="pc-img">(?:<button[\s\S]*?<\/button>)?)(<img class="art v4art"[^>]*?) alt="[^"]*"/,'$1$2 alt=""')}catch(e){return h}}}
/* SW-030: messages need a real account and a real connection. Anyone may contact a business (public pro profile);
   everyone else only through a job, quote, project crew, traveler call, invoice, visit, case, reference, lodging listing
   or an existing conversation. Missing ids are refused, so no orphan threads (SW-031). */
if(typeof A!=="undefined")A.canMessage=function(to){const m=me(),u=U(to);if(!m||!u||u.id===m.id)return false;const a=m.id,b=u.id;
 if(u.role==="contractor")return true;
 if((DB.msgs||[]).some(x=>(x.a===a&&x.b===b)||(x.a===b&&x.b===a)))return true;
 if((u.sharedWith||[]).includes(a)||(m.sharedWith||[]).includes(b))return true;
 const job=(c,p)=>(DB.jobs||[]).some(j=>j.cust===c&&(j.hired===p||(j.interested||[]).includes(p)||(j.invited||[]).includes(p)||(DB.quotes||[]).some(q=>q.job===j.id&&q.cid===p)));if(job(a,b)||job(b,a))return true;
 if((DB.projects||[]).some(p=>{if(p.pm!==a&&p.pm!==b)return false;const o=p.pm===a?b:a;return(p.roles||[]).some(r=>(r.filled||[]).includes(o)||(r.done||[]).includes(o)||(r.apps||[]).some(x=>x.cid===o)||(r.invites||[]).some(x=>x.cid===o))}))return true;
 const tc=(by,o)=>(DB.tcalls||[]).some(c=>c.by===by&&((c.apps||[]).some(x=>x.uid===o)||(c.invites||[]).includes(o)));if(tc(a,b)||tc(b,a))return true;
 if(u.trav&&(m.role==="contractor"||m.role==="pm"))return true;
 if((DB.lodging||[]).some(l=>l.by===b))return true;
 const pair=(x,k1,k2)=>(x||[]).some(r=>(r[k1]===a&&r[k2]===b)||(r[k1]===b&&r[k2]===a));
 return pair(DB.bills,"by","cuid")||pair(DB.bcust,"by","uid")||pair(DB.visits,"by","cuid")||pair(DB.cases,"cu","pro")||pair(DB.refs,"trav","by")};

/* v19: honest Verified review workflow, example trade photos, quote-path prompts, pretty in-app URLs. */
const V19_ACTIONS=["submitVerify19","modVerify19","sweepVerify19"];
if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V19_ACTIONS);
if(typeof TITLES!=="undefined")Object.assign(TITLES,{verify:"Get Verified",compare:"Compare bids"});

const V19_STATES={"AL":"Alabama","AK":"Alaska","AZ":"Arizona","AR":"Arkansas","CA":"California","CO":"Colorado","CT":"Connecticut","DE":"Delaware","DC":"District of Columbia","FL":"Florida","GA":"Georgia","HI":"Hawaii","ID":"Idaho","IL":"Illinois","IN":"Indiana","IA":"Iowa","KS":"Kansas","KY":"Kentucky","LA":"Louisiana","ME":"Maine","MD":"Maryland","MA":"Massachusetts","MI":"Michigan","MN":"Minnesota","MS":"Mississippi","MO":"Missouri","MT":"Montana","NE":"Nebraska","NV":"Nevada","NH":"New Hampshire","NJ":"New Jersey","NM":"New Mexico","NY":"New York","NC":"North Carolina","ND":"North Dakota","OH":"Ohio","OK":"Oklahoma","OR":"Oregon","PA":"Pennsylvania","RI":"Rhode Island","SC":"South Carolina","SD":"South Dakota","TN":"Tennessee","TX":"Texas","UT":"Utah","VT":"Vermont","VA":"Virginia","WA":"Washington","WV":"West Virginia","WI":"Wisconsin","WY":"Wyoming"};
const v19St=z=>{const t=ZIPS[z]&&ZIPS[z][0];return t?String(t).slice(-2):""};
/* SW-050: calendar-day difference. The badge stays on through the printed expiry date
   and comes off at the start of the next calendar day (end of that day). "Expires today"
   fires when left===0. TEST_NOW (via __now) is honored only outside production. */
function v19Now(){try{if(typeof __now==="function")return __now()}catch(e){}return Date.now()}
function v19Ymd(ms){const d=new Date(ms);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function v19When(v){if(v==null||v==="")return 0;if(typeof v==="number"&&isFinite(v))return v>1e12?v:v>1e9?v*1000:0;
 const s=String(v).trim();if(/^\d{4}-\d{2}-\d{2}/.test(s)){const t=Date.parse(s.slice(0,10)+"T12:00:00");return isFinite(t)?t:0}
 const n=+s;return isFinite(n)&&n>1e9?n:0}
function v19Day(v){if(v==null||v==="")return"";const s=String(v).trim();if(/^\d{4}-\d{2}-\d{2}/.test(s))return s.slice(0,10);
 const t=v19When(v);return t?v19Ymd(t):""}
function v19Left(v){const day=v19Day(v);if(!day)return null;const p=day.split("-").map(Number),now=new Date(v19Now());
 return Math.round((Date.UTC(p[0],p[1]-1,p[2])-Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()))/864e5)}
function v19S(v,n){return String(v==null?"":v).trim().slice(0,n)}
function v19Lookup(st){const k=String(st||"").toUpperCase();
 const map={TX:"https://www.tdlr.texas.gov/LicenseSearch/",FL:"https://www.myfloridalicense.com/wl11.asp?mode=0",CA:"https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/CheckLicense.aspx",NY:"https://www.dos.ny.gov/licensing/",MI:"https://www.lara.mi.gov/",OH:"https://elicense.ohio.gov/",IL:"https://online-dfpr.micropact.com/",GA:"https://sos.ga.gov/index.php/licensing",WA:"https://secure.lni.wa.gov/verify/",CO:"https://apps.colorado.gov/dora/licensing/Lookup/LicenseLookup.aspx",AZ:"https://roc.az.gov/",PA:"https://www.dos.pa.gov/ProfessionalLicensing",NC:"https://www.nclicensing.org/",TN:"https://www.tn.gov/commerce/regboards.html",VA:"https://www.dpor.virginia.gov/License-Lookup",MA:"https://www.mass.gov/check-a-professional-license",NJ:"https://newjersey.mylicense.com/verification/",MN:"https://www.dli.mn.gov/",WI:"https://licensesearch.wi.gov/",OR:"https://www.oregon.gov/ccb",NV:"https://www.nvcontractorsboard.com/"};
 return map[k]||("https://www.google.com/search?q="+encodeURIComponent(k+" contractor license lookup"))}

function v19Status(u){if(!u||u.role!=="contractor")return "none";
 const licL=v19Left(u.licExp),insL=v19Left(u.insExp);
 if(u.verified){if((licL!=null&&licL<0)||(insL!=null&&insL<0))return "expired";return "verified"}
 if(u.verifyPending)return "pending";
 if(u.verifyExpired)return "expired";
 if(u.verifyReject)return "rejected";
 return (u.license&&u.licState&&u.insurance)?"submitted":"none"}

function v19Expire(u){if(!u||u.role!=="contractor"||!u.verified)return false;
 const licL=v19Left(u.licExp),insL=v19Left(u.insExp);
 if(!((licL!=null&&licL<0)||(insL!=null&&insL<0)))return false;
 u.verified=false;u.verifyPending=false;u.verifyExpired=true;u.verifyChecked=u.verifyChecked||{};u.verifyChecked.expiredAt=v19Now();
 const which=licL!=null&&licL<0&&insL!=null&&insL<0?"license and insurance":licL!=null&&licL<0?"license":"insurance certificate";
 notify(u.id,"Your Verified badge came off because your "+which+" expired. Submit the renewal so the Trust team can put it back on.","verify");
 return true}

function v19Remind(u){if(!u||u.role!=="contractor")return 0;let n=0;
 [["licExp","license"],["insExp","insurance certificate"]].forEach(([k,label])=>{const left=v19Left(u[k]);if(left==null)return;
  const step=[0,7,30,60].find(x=>left<=x);if(step==null)return;
  u.verifyRem19=u.verifyRem19||{};const key=k+":"+(v19Day(u[k])||"") +":"+step;if(u.verifyRem19[key])return;
  u.verifyRem19[key]=v19Now();
  const badge=u.verified;
  const when=left<0?`Your ${label} expired ${v19Day(u[k])}. ${badge?"Your Verified badge comes off until the Trust team reviews the renewal.":"Upload the renewal and resubmit for review."}`
   :left===0?`Your ${label} expires today (${v19Day(u[k])}). ${badge?"The Verified badge stays on through today and comes off at the end of the day. Renew it and resubmit so the badge can stay on.":"Renew it today and resubmit for review."}`
   :`Your ${label} expires in ${left} day${left===1?"":"s"} (${v19Day(u[k])}). ${badge?"Renew it and resubmit so your Verified badge stays on.":"Renew it before it lapses."}`;
  notify(u.id,when,"verify");
  n++});
 return n}

Object.assign(A,{
 submitVerify19(o){const m=me();if(!m||m.role!=="contractor")return{ok:false,msg:"Only pro accounts can submit license and insurance"};
  o=o&&typeof o==="object"?o:{};const license=v19S(o.license,80),licState=v19S(o.licState,2).toUpperCase(),insurance=v19S(o.insurance,160);
  const licExp=v19S(o.licExp,10),insExp=v19S(o.insExp||o.coiExp,10),coiFile=v19S(o.coiFile,80),coiNum=v19S(o.coiNum,80),coiCarrier=v19S(o.coiCarrier,80);
  if(!license||license.length<3)return{ok:false,msg:"Enter your license number"};
  if(!V19_STATES[licState])return{ok:false,msg:"Pick the state that issued the license"};
  if(!v19When(licExp)||v19Left(licExp)<0)return{ok:false,msg:"Enter a license expiry date that hasn't passed"};
  if(!insurance)return{ok:false,msg:"Enter the insurer and coverage, for example the carrier and $1M general liability"};
  if(!v19When(insExp)||v19Left(insExp)<0)return{ok:false,msg:"Enter an insurance expiry date that hasn't passed"};
  if(!/^\/(?:u|api\/coi)\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(coiFile))return{ok:false,msg:"Upload a photo or PDF-style image of your certificate of insurance (JPEG, PNG or WebP)"};
  const changed=m.license!==license||m.licState!==licState||m.insurance!==insurance||m.coiFile!==coiFile||v19Day(m.licExp)!==licExp||v19Day(m.insExp)!==insExp;
  m.license=license;m.licState=licState;m.licExp=licExp;m.insurance=insurance;m.insExp=insExp;m.coiFile=coiFile;if(coiNum)m.coiNum=coiNum;if(coiCarrier)m.coiCarrier=coiCarrier;
  if(m.verified&&changed)m.verified=false;
  m.verifyPending=true;m.verifyExpired=false;m.verifyReject="";m.verifySubmitted=v19Now();
  (DB.users||[]).filter(u=>u.staff).forEach(s=>notify(s.id,`${m.biz||nameOf(m)} submitted a license and insurance certificate for review`,"mod?t=verify"));
  save();return{ok:true,msg:"Submitted to Sawyer's Trust team. A person reviews your license and certificate of insurance, then the badge shows what was checked and when."}},
 modVerify19(uid,what,note){const m=me();if(!m||!m.staff)return{ok:false,msg:"Trust team only"};
  const u=U(uid);if(!u||u.role!=="contractor")return{ok:false,msg:"Unknown pro"};
  note=v19S(note,400);what=String(what||"");
  if(what==="approve"){if(!u.license||!u.licState||!u.insurance)return{ok:false,msg:"This packet is missing a license number, state or insurer"};
   if(v19Left(u.licExp)<0||v19Left(u.insExp)<0)return{ok:false,msg:"The license or insurance has already expired. Ask them to resubmit a current packet."};
   u.verified=true;u.verifyPending=false;u.verifyExpired=false;u.verifyReject="";u.verifiedAt=v19Now();u.verifyBy=m.id;u.verifyNote=note;
   u.verifyChecked={license:true,coi:true,at:u.verifiedAt,by:m.id};save();
   notify(u.id,"You're Verified. The Trust team reviewed your "+(u.licState||"")+" license and certificate of insurance. The badge shows what was checked and when.","pro:"+u.id);
   return{ok:true,msg:"Approved. The Verified badge is on and shows the check date."}}
  if(what==="reject"){if(note.length<8)return{ok:false,msg:"Add a short reason the pro will see (8+ characters)"};
   u.verified=false;u.verifyPending=false;u.verifyReject=note;u.verifyBy=m.id;u.verifyNote=note;u.verifyDecided=v19Now();save();
   notify(u.id,"The Trust team couldn't verify you yet: "+note+" Update your license or certificate and submit again.","verify");
   return{ok:true,msg:"Rejected, and the pro was told why."}}
  return{ok:false,msg:"Pick approve or reject"}},
 sweepVerify19(){const m=me();if(!m)return{ok:true,n:0};let n=0;if(v19Expire(m))n++;n+=v19Remind(m);if(n)save();return{ok:true,n}}});

{const os=A.sweep9;if(typeof os==="function")A.sweep9=function(){const r=os.apply(this,arguments);try{const x=A.sweepVerify19();if(r&&typeof r==="object")r.n=(r.n||0)+((x&&x.n)||0)}catch(e){}return r}}
{const ou=A.updatePro;A.updatePro=function(patch){const m=me();const was=m&&[m.license||"",m.insurance||"",m.licState||"",v19Day(m.licExp),v19Day(m.insExp)];
  const r=ou.apply(this,arguments);if(!r||!r.ok||!m)return r;
  const now=[m.license||"",m.insurance||"",m.licState||"",v19Day(m.licExp),v19Day(m.insExp)];
  if(was&&was.some((x,i)=>x!==now[i])){if(m.verified){m.verified=false;m.verifyPending=!!(m.license&&m.insurance)}else if(m.license&&m.insurance)m.verifyPending=m.verifyPending||false;
   /* changing details never grants the badge; it only queues a fresh review once they resubmit the full packet */
   save();if(m.verified===false)r.msg="Profile saved. License or insurance changes come off the Verified badge until the Trust team reviews the new packet."}
  return r}}

function seedV19(){if(!DB||!DB.users)return;const now=Date.now();
 (DB.users||[]).forEach(u=>{if(u.role!=="contractor")return;
  if(!u.licState)u.licState=v19St(u.zip)||"TX";
  if(!u.licExp&&u.license)u.licExp=v19Day(now+800*864e5);
  if(u.insExp&&!v19When(u.insExp)&&String(u.insExp).length>=10){/* keep YYYY-MM-DD */}
  else if(!u.insExp&&u.insurance)u.insExp=u.insExp||"2027-06-30";
  if(u.verified){u.verifiedAt=u.verifiedAt||u.verAt9||(u.joined||now-200*864e5)+3*864e5;u.verifyPending=false;u.verifyExpired=false;
   u.verifyChecked=u.verifyChecked||{license:!!u.license,coi:!!u.insurance,at:u.verifiedAt}}
  v19Expire(u)})}
if(typeof DB!=="undefined"&&DB&&DB.users){try{seedV19()}catch(e){}}
{const os=seed;seed=function(){const r=os.apply(this,arguments);try{seedV19()}catch(e){}return r}}

/* ---- FAQ and copy: tell the truth about Verified ---- */
if(typeof FAQS!=="undefined"){const i=FAQS.findIndex(x=>/check licenses and insurance/i.test(x[0])||/licenses and insurance/i.test(x[0]));
 const ans="Pros submit their license number, the state that issued it, the expiry date, and a photo of a current certificate of insurance. A person on Sawyer's Trust team reviews the packet, checks the license against the state's public lookup, and approves or rejects it with a reason you can see. The Verified badge then shows what was checked and the date of the review. It stays on through the expiry date and comes off at the end of that day. The pro gets reminders 60, 30 and 7 days ahead, and one on the expiry date. Nobody can turn the badge on from their own profile.";
 if(i>=0)FAQS[i][1]=ans;else FAQS.splice(3,0,["How do you check licenses and insurance?",ans])}

/* ---- Trust panel: only claim what we actually check ---- */
function v19MonthYear(t){if(!t)return"";const d=new Date(t);return d.toLocaleString("en-US",{month:"short",year:"numeric"})}
function v9Trust(u){if(!u||u.role!=="contractor")return"";const rs=(DB.reviews||[]).filter(r=>r.cid===u.id),n=rs.length||u.reviews||0;
 const st=v19Status(u),licL=v19Left(u.licExp),insL=v19Left(u.insExp);
 const checked=u.verifyChecked&&u.verifyChecked.at||u.verifiedAt;
 const viewer=typeof me==="function"?me():null;const insider=!!(viewer&&(viewer.id===u.id||viewer.staff));
 const ok=(t,b,s,on)=>`<li class="${on?"on":"off"}"><span class="o9-ti">${I(on?"check":"x",14)}</span><div><b>${t}</b><small>${b}</small>${s?`<em>${s}</em>`:""}</div></li>`;
 const exp=d=>d?`expires ${v19Day(d)}`:"";
 const licLine=insider&&u.license?(u.licState?`${u.licState} #${u.license}`:`#${u.license}`)+(u.licExp?" · "+exp(u.licExp):"")
  :st==="verified"?`License verified ${v19MonthYear(checked)}${u.licExp?", "+exp(u.licExp):""}`
  :st==="expired"?"License expired — the badge is off until a current one is reviewed"
  :"License is reviewed by the Trust team before the Verified badge appears";
 const licSub=st==="verified"&&checked?`Reviewed by Sawyer's Trust team on ${fmtDate(checked)}` : st==="pending"&&insider?"Submitted, waiting on the Trust team":st==="expired"?"Expired — the badge is off until a current license is reviewed":st==="rejected"&&insider?"Needs an update before another review":"The public profile shows only what was checked and when, not license numbers or documents.";
 const insLine=insider&&u.insurance?(u.coiCarrier||u.insurance)+(u.insExp?" · "+exp(u.insExp):"")
  :st==="verified"?`Insurance on file${u.insExp?", "+exp(u.insExp):""}`
  :st==="expired"?"Insurance expired — the badge is off until a current certificate is reviewed"
  :"A current certificate of insurance is reviewed before the badge appears";
 const insOn=st==="verified"&&((insider&&!!u.insurance)||(!insider&&u.verifyChecked&&u.verifyChecked.coi))&&!(insL!=null&&insL<0);
 const licOn=st==="verified"&&((insider&&!!u.license)||(!insider&&u.verifyChecked&&u.verifyChecked.license))&&!(licL!=null&&licL<0);
 return`<section class="wrap o9-trust" id="trust"><div class="card"><div class="o9-trh"><span class="o9-ic big">${I("shield",22)}</span><div><h2>How we checked ${esc(u.biz||nameOf(u))}</h2><p class="muted small">The Verified badge means a person on Sawyer's Trust team reviewed this license and certificate of insurance. The badge stays on through the expiry date and comes off at the end of that day.</p></div></div>
 <ul class="o9-trl">${ok("State license",licLine,licSub,licOn)}${ok("Certificate of insurance",insLine,insOn&&checked?`Reviewed ${fmtDate(checked)}`:(insL!=null&&insL<0?"Expired":st==="pending"?"Submitted with the license packet":""),insOn)}${u.bg?ok("Background check","Owner passed a 7-year county + national check","",true):""}${ok("Reviews",n?`${n} review${n===1?"":"s"}, every one from a hired job on Sawyer`:"No reviews yet","No paid reviews. No review gating. Pros can't delete reviews; disputes go to a person.",true)}</ul>
 <p class="small muted o9-trf">${I("info",14)}Something wrong with a verification? <a href="${href("msgs","a1")}">Tell the Trust team</a> and a person re-checks it.</p></div></section>`}

/* ---- Pro: submit packet; staff: review queue ---- */
function v19PacketForm(m){const st=v19Status(m);
 const banner=st==="verified"?`<div class="v19-note ok">${I("shield",16)}<div><b>You're Verified</b><small>Checked ${m.verifiedAt?fmtDate(m.verifiedAt):""}. The badge stays on through the expiry date and comes off at the end of that day. Submit a renewal before then.</small></div></div>`
  :st==="pending"?`<div class="v19-note">${I("clock",16)}<div><b>In review</b><small>The Trust team has your packet. You'll get a notification when they approve it or ask for a change.</small></div></div>`
  :st==="rejected"?`<div class="v19-note bad">${I("info",16)}<div><b>Needs an update</b><small>${esc(m.verifyReject||"The Trust team asked you to resubmit.")}</small></div></div>`
  :st==="expired"?`<div class="v19-note bad">${I("info",16)}<div><b>Your badge came off</b><small>A license or certificate expired. Submit the renewal to get Verified again.</small></div></div>`
  :`<div class="v19-note">${I("shield",16)}<div><b>Get the Verified badge</b><small>Submit your license number, state, expiry and a current certificate of insurance. A person on the Trust team reviews it. You can't turn the badge on yourself.</small></div></div>`;
 const states=Object.keys(V19_STATES).map(k=>`<option value="${k}" ${m.licState===k?"selected":""}>${k} — ${V19_STATES[k]}</option>`).join("");
 return`${banner}<form class="card form" id="v19vf"><h2 class="h-sub">License and insurance packet</h2>
  <div class="two"><div class="fld"><label for="v19-lic">License number</label><input id="v19-lic" name="license" required maxlength="80" value="${esc(m.license||"")}"></div>
  <div class="fld"><label for="v19-st">Issuing state</label><select id="v19-st" name="licState" required><option value="">Select</option>${states}</select></div></div>
  <div class="two"><div class="fld"><label for="v19-lex">License expires</label><input id="v19-lex" name="licExp" type="date" required value="${esc(v19Day(m.licExp))}"></div>
  <div class="fld"><label for="v19-iex">Insurance expires</label><input id="v19-iex" name="insExp" type="date" required value="${esc(v19Day(m.insExp))}"></div></div>
  <div class="fld"><label for="v19-ins">Insurer and coverage</label><input id="v19-ins" name="insurance" required maxlength="160" value="${esc(m.insurance||"")}" placeholder="Carrier, $1M general liability"></div>
  <div class="two"><div class="fld"><label for="v19-car">Carrier <span class="muted">(optional)</span></label><input id="v19-car" name="coiCarrier" maxlength="80" value="${esc(m.coiCarrier||"")}"></div>
  <div class="fld"><label for="v19-num">Policy number <span class="muted">(optional)</span></label><input id="v19-num" name="coiNum" maxlength="80" value="${esc(m.coiNum||"")}"></div></div>
  <div class="fld"><label for="v19-coi">Certificate of insurance (JPEG, PNG or WebP)</label>
   ${m.coiFile?`<p class="muted small">Current file on file. Upload a new one to replace it.</p><img class="v19-coi" src="${esc(m.coiFile)}" alt="Certificate on file">`:""}
   <input id="v19-coi" name="coi" type="file" accept="image/jpeg,image/png,image/webp" ${m.coiFile?"":"required"}></div>
  <div class="actions"><button class="btn primary" type="submit" id="v19vGo">${I("send",16)}${st==="pending"?"Update submission":"Submit for review"}</button></div></form>`}

VIEWS.verify=()=>{const m=me();if(!m)return VIEWS.signup(null,{next:"/verify"});if(m.role!=="contractor")return`<section class="page narrow">${empty("shield","Verified is for pros","Customers don't have a license packet to submit. Reviews still only come from finished, hired jobs.")}</section>`;
 return`<section class="page narrow v19-verify"><div class="pagehead"><h1>Get Verified</h1><p class="muted">A person on Sawyer's Trust team reviews your state license and certificate of insurance. The badge then shows what was checked and when, and it comes off when either document expires.</p></div>${v19PacketForm(m)}</section>`};
AFTER.verify=()=>{const f=document.getElementById("v19vf");if(!f)return;
 f.onsubmit=async e=>{e.preventDefault();const b=document.getElementById("v19vGo");b.disabled=true;try{const o=readForm(f);const file=(document.getElementById("v19-coi")||{}).files&&document.getElementById("v19-coi").files[0];
  if(file){if(typeof v2upload!=="function")throw Error("Photo upload isn't available");o.coiFile=await v2upload(file,{kind:"coi"})}else o.coiFile=(me()&&me().coiFile)||"";
  act(A.submitVerify19(o),()=>go("verify"))}catch(err){toast(err.message||"Upload failed","err");b.disabled=false}}};

function v19ModHtml(m,q){const pending=(DB.users||[]).filter(u=>u.role==="contractor"&&u.verifyPending).sort((a,b)=>(a.verifySubmitted||0)-(b.verifySubmitted||0));
 const recent=(DB.users||[]).filter(u=>u.role==="contractor"&&!u.verifyPending&&(u.verifiedAt||u.verifyDecided||u.verifyChecked)).sort((a,b)=>(b.verifiedAt||b.verifyDecided||(b.verifyChecked&&b.verifyChecked.at)||0)-(a.verifiedAt||a.verifyDecided||(a.verifyChecked&&a.verifyChecked.at)||0)).slice(0,8);
 const tab="verify";
 const card=u=>{const st=v19Status(u);const look=v19Lookup(u.licState);
  return`<article class="card mod12-i v19-mc"><header class="mod12-h"><span class="badge ${st==="pending"?"b-urg":st==="verified"?"b-ver":""}">${I("shield",12)}${st==="pending"?"Needs review":st==="verified"?"Approved":st==="rejected"?"Rejected":st}</span><span class="muted small">${esc(u.biz||nameOf(u))} · ${esc(u.trade||"")} · ${esc(townOf(u.zip))}</span></header>
  <div class="mod12-g"><div><ul class="v19-pkt"><li><b>License</b> ${esc(u.licState||"—")} #${esc(u.license||"—")} · expires ${esc(v19Day(u.licExp)||"—")} ${look?`<a href="${esc(look)}" target="_blank" rel="noopener">Open ${esc(u.licState||"")} lookup</a>`:""}</li>
   <li><b>Insurance</b> ${esc(u.insurance||"—")} · expires ${esc(v19Day(u.insExp)||"—")}${u.coiNum?" · policy "+esc(u.coiNum):""}</li>
   ${u.coiFile?`<li><b>Certificate</b><div><img class="v19-coi" src="${esc(u.coiFile)}" alt="Certificate of insurance for ${esc(u.biz||nameOf(u))}"></div></li>`:`<li><b>Certificate</b> No file on this packet${u.demo?" (demo listing; sample data)":""}</li>`}</ul></div>
   <div>${st==="pending"?`<form class="mod12-f" data-v19mod="${esc(u.id)}"><label class="sr-only" for="vn${u.id}">Decision note</label><input id="vn${u.id}" name="note" maxlength="400" placeholder="Note or rejection reason (the pro sees this)">
    <div class="row"><button type="button" class="btn sm primary" data-vd="approve">${I("check",14)}Approve Verified</button><button type="button" class="btn sm danger12" data-vd="reject">${I("x",14)}Reject</button></div></form>`
    :`<p class="small mod12-dec">${I(st==="verified"?"check":"x",13)}<b>${st==="verified"?"Approved":"Closed"}</b>${u.verifiedAt||u.verifyDecided?" "+ago(u.verifiedAt||u.verifyDecided):""}${u.verifyNote?": "+esc(u.verifyNote):""}</p>`}</div></div></article>`};
 const nRep=((typeof DB.reports12!=="undefined"?DB.reports12:[])||[]).filter(x=>x.status==="open"||x.status==="asked").length;
 const nDisp=((DB.reviews||[]).filter(r=>r.dispute&&(r.dispute.status==="open"||r.dispute.status==="asked"))).length;
 const nOpen=nRep+nDisp;
 return`<section class="mod12"><div class="b12-top"><div class="wrap"><span class="eyebrow">${I("shield",14)}Trust &amp; safety</span><h1>Verification queue</h1><p class="muted">Approve or reject a pro's license and certificate of insurance. The Verified badge only turns on here, and it shows the check date on their profile.</p>
  <nav class="h12-tabs" aria-label="Queue"><a href="${href("mod")}" class="">${I("flag",15)}<span>Open reviews (${nOpen})</span></a><a href="${href("mod",null,{t:"done"})}">${I("check",15)}<span>Decided reviews</span></a><a href="${href("mod",null,{t:"verify"})}" class="on" aria-current="page">${I("shield",15)}<span>Verification (${pending.length})</span></a></nav></div></div>
  <div class="wrap mod12-body"><h2 class="h-sub">Waiting on review (${pending.length})</h2>${pending.map(card).join("")||empty("check","Verification queue is clear","New license and insurance packets show up here.","")}
  ${recent.length?`<h2 class="h-sub">Recently decided</h2>${recent.map(card).join("")}`:""}</div></section>`}

function v19HookMod(){if(!VIEWS||!VIEWS.mod||VIEWS.mod._v19)return;if(String(VIEWS.mod).includes("lz12View"))return;
 const ov=VIEWS.mod;VIEWS.mod=function(p,q){const m=me();q=q||{};if(m&&m.staff&&q.t==="verify")return v19ModHtml(m,q);
  let h=ov(p,q);if(!m||!m.staff||typeof h!=="string")return h;
  const n=(DB.users||[]).filter(u=>u.role==="contractor"&&u.verifyPending).length;
  const tab=`<a href="${href("mod",null,{t:"verify"})}" class="">${I("shield",15)}<span>Verification (${n})</span></a>`;
  if(h.includes("Verification ("))return h;
  h=h.replace("</nav>",tab+"</nav>");
  return h};
 VIEWS.mod._v19=1;
 const oa=AFTER.mod;AFTER.mod=function(){oa&&oa();document.querySelectorAll("[data-v19mod]").forEach(f=>{const id=f.dataset.v19mod;f.onsubmit=e=>e.preventDefault();f.querySelectorAll("[data-vd]").forEach(b=>b.onclick=()=>{const w=b.dataset.vd;const note=(f.querySelector("input")||{}).value||"";
  if(w==="reject"&&String(note).trim().length<8){toast("Add a short reason the pro will see","err");return}
  act(A.modVerify19(id,w,note),()=>{if(typeof v12Rerender==="function")v12Rerender();else render()})})})}

}
/* Wrap lz12 so the verification tab hooks after /mod loads. Never call lz12()
   here — that would fetch the lazy bundle on every page (v13 SW-018). */
if(typeof lz12==="function"&&!lz12._v19wrap){const ol=lz12;lz12=function(cb){return ol(function(){v19HookMod();cb&&cb()})};lz12._v19wrap=1}
if(typeof LZ12==="object"&&LZ12&&LZ12.ok)v19HookMod();

/* ---- Dashboard / account entry points ---- */
{const on=typeof v8Next==="function"?v8Next:null;if(on)v8Next=function(m){const out=on(m);if(!m||m.role!=="contractor")return out;
  const st=v19Status(m);if(st==="pending")out.unshift({icon:"shield",tone:"gold",title:"Verification in review",sub:"The Trust team has your license and certificate of insurance.",link:href("verify"),cta:"View"});
  else if(st==="rejected"||st==="expired"||st==="none"||st==="submitted")out.unshift({icon:"shield",tone:st==="rejected"||st==="expired"?"bad":"p",title:st==="rejected"?"Update your verification packet":st==="expired"?"Renew to get Verified again":"Get the Verified badge",sub:st==="rejected"?String(m.verifyReject||"The Trust team asked for an update"):"Submit your license, state, expiry and a current certificate of insurance.",link:href("verify"),cta:"Submit"});
  return out}}
{const op=typeof proSetup==="function"?proSetup:null;if(op)proSetup=function(u){const s=op(u);const st=v19Status(u);const done=st==="verified";
  const row=["shield","Get Verified (license + certificate of insurance)",done,done?"The Trust team reviewed your packet.":"Submit your license number, state, expiry and a COI photo."];
  const i=s.findIndex(x=>/license|Verified/i.test(String(x[1]||x[0]||"")));if(i>=0)s[i]=row;else s.unshift(row);return s}}

/* Join wizard: license no longer "unlocks" a self-serve badge */
{const ov=VIEWS.join;if(ov)VIEWS.join=(...a)=>{let h=ov(...a);
  h=h.replace(/Add these to earn the <b>Verified<\/b> badge\. Verified pros get about 3× more profile views \(demo estimate\)\./g,"Add your license now, then submit a certificate of insurance after you join. A person on the Trust team reviews the packet before the Verified badge appears.");
  h=h.replace(/License number \(unlocks the Verified badge\)/g,"License number");
  h=h.replace(/Insurance \(unlocks the Verified badge\)/g,"Insurance");
  h=h.replace(/Get the Verified badge/g,"License &amp; insurance");
  h=h.replace(/<div class="uobp-badges">[\s\S]*?<\/div>/,m=>m.replace(/class="badge b-ver"[^>]*>[\s\S]*?Verified<\/span>/,'class="badge">'+I("shield",12)+' After Trust team review</span>'));
  return h}}

/* ========================================================================
   Example trade photos (honest labels; never claimed as a specific pro's work)
   ======================================================================== */

const V19CRED=[
 ["x-hvac-2","Repairman repairing an outdoor air conditioner","José Andrés Pacheco Cortes","https://www.pexels.com/photo/repairman-repairing-a-air-conditioner-5463587/"],
 ["x-roof-2","Workers installing terra cotta roof tiles","Jim McLain","https://www.pexels.com/photo/workers-installing-roof-11467876/"],
 ["x-paint-2","Person painting a wall","Ksenia Chernaya","https://www.pexels.com/photo/person-painting-on-wall-6474471/"],
 ["x-carpentry","Carpenter working on a house's wooden structure","Ron Lach","https://www.pexels.com/photo/a-man-working-at-a-construction-site-8830265/"],
 ["x-flooring","Installing laminate flooring","K","https://www.pexels.com/photo/crop-man-installing-laminate-flooring-4263067/"],
 ["x-drywall","Builder applying joint compound","Tima Miroshnichenko","https://www.pexels.com/photo/unrecognizable-male-builder-installing-laminate-floor-5691594/"],
 ["x-concrete","Construction workers pouring concrete on site","Sài Gòn Production-Trading JSC","https://www.pexels.com/photo/construction-workers-pouring-concrete-on-site-37121400/"],
 ["x-fence","Carpenter working on a wooden fence","Los Muertos Crew","https://www.pexels.com/photo/woman-repairing-wood-fence-8447799/"],
 ["x-deck","Wooden deck with table and chairs","Curtis Adams","https://www.pexels.com/photo/wooden-deck-with-table-and-chairs-12700434/"],
 ["x-windows","Man installing a window","Ksenia Chernaya","https://www.pexels.com/photo/man-installing-window-in-room-5691516/"]
];
if(typeof V4CRED!=="undefined")V19CRED.forEach(r=>{if(!V4CRED.some(x=>x[0]===r[0]))V4CRED.push(r)});

const V19EX={
 Electrical:["/img/t-electrical.webp","/img/tr-panel.webp","/img/tr-wire.webp","/img/hero-sm.webp"],
 Plumbing:["/img/t-plumbing.webp","/img/g-pipe-wrench.webp","/img/g-water-heater.webp","/img/g-shower.webp","/img/g-radiator.webp","/img/g-wall-pipes.webp"],
 HVAC:["/img/t-hvac.webp","/img/x-hvac-2.webp"],
 Roofing:["/img/t-roofing.webp","/img/x-roof-2.webp"],
 Remodeling:["/img/t-remodel.webp","/img/home-ext.webp","/img/g-shower.webp"],
 Painting:["/img/t-painting.webp","/img/x-paint-2.webp"],
 Carpentry:["/img/x-carpentry.webp","/img/home-ext.webp","/img/t-remodel.webp"],
 Flooring:["/img/x-flooring.webp","/img/t-remodel.webp"],
 Landscaping:["/img/pro-3.webp"],
 "Solar & Energy":["/img/tr-solar.webp","/img/tr-solar2.webp"],
 Handyman:["/img/pro-1.webp","/img/home-ext.webp","/img/t-remodel.webp"],
 "Concrete & Masonry":["/img/x-concrete.webp","/img/home-ext.webp"],
 "Fencing":["/img/x-fence.webp","/img/pro-3.webp"],
 "Decks & Docks":["/img/x-deck.webp","/img/home-ext.webp"],
 "Siding & Exterior":["/img/home-ext.webp","/img/t-roofing.webp"],
 "Windows & Glass":["/img/x-windows.webp","/img/home-ext.webp"],
 "Drywall & Plaster":["/img/x-drywall.webp","/img/t-painting.webp","/img/x-paint-2.webp"],
 Cleaning:["/img/t-remodel.webp","/img/g-shower.webp"],
 "Pools & Hot Tubs":["/img/g-shower.webp","/img/x-deck.webp"],
 "Well & Water":["/img/t-plumbing.webp","/img/g-water-heater.webp"],
 Insulation:["/img/x-carpentry.webp","/img/home-ext.webp"],
 "Appliance Repair":["/img/g-water-heater.webp","/img/t-hvac.webp"]
};
function v19ExList(trade){return (V19EX[trade]||V19EX.Handyman||["/img/home-ext.webp"]).slice()}
function v19ExPick(u,i){const a=v19ExList(u&&u.trade),h=typeof hash==="function"?hash(String((u&&u.id)||"x")+"|"+i):i;return a[Math.abs(h)%a.length]}
function v19OwnPhotos(u){if(!u)return [];const g=(u.gal12||[]).filter(x=>x&&x.src&&/^\/u\//.test(x.src));
 const vp=typeof verifiedPhotos==="function"?verifiedPhotos(u.id).filter(p=>p&&p.src&&/^\/u\//.test(p.src)):[];
 return g.concat(vp)}
function v19CardImg(u){const own=v19OwnPhotos(u)[0];
 if(own)return`<img class="art v4art" src="${esc(own.src)}" alt="${esc(own.cap||"")}" loading="lazy" decoding="async">`;
 const src=v19ExPick(u,0);const label="Example of "+(u.trade||"trade")+" work";
 return`<img class="art v4art" src="${esc(src)}" alt="" loading="lazy" decoding="async"><span class="v19-ex">${esc(label)}</span>`}
if(typeof v13CardImg==="function")v13CardImg=v19CardImg;

function v19Gallery(u,own){const mine=v19OwnPhotos(u);
 if(mine.length)return""; /* existing gallery already rendered */
 const photos=[0,1,2].map(i=>({src:v19ExPick(u,i),i})).filter((x,idx,arr)=>arr.findIndex(y=>y.src===x.src)===idx);
 const trade=u.trade||"trade";
 const label=own?`These are example ${trade} photos until you add pictures of your own jobs.`:`Example of ${trade} work — not photos from this pro. Ask for pictures of similar jobs when you request a quote.`;
 return`<div class="v19-exgal" aria-label="Example ${esc(trade)} photos"><div class="v19-exh"><span class="badge">${I("camera",12)}Example photos</span><small>${esc(label)}</small></div>
  <div class="v19-g">${photos.map((p,i)=>`<figure><img class="art v4art" src="${esc(p.src)}" alt="Example of ${esc(trade)} work" ${i?'loading="lazy" decoding="async"':'fetchpriority="high"' }><figcaption>Example of ${esc(trade)} work</figcaption></figure>`).join("")}</div>
  ${own?`<a class="btn sm" href="${href("pro",u.id)}#photos">Add photos of your work</a>`:`<a class="btn sm ghost" href="${href("post",null,{invite:u.id})}">Request a quote</a>`}</div>`}

function v19ReplaceSoon(h,html){const re=/<div class="(?:g12-soon )?sec-soon">/g;let m,out="",last=0;
 while((m=re.exec(h))){let i=m.index+m[0].length,depth=1;
  while(i<h.length&&depth){const a=h.indexOf("<div",i),b=h.indexOf("</div>",i);if(b<0){i=h.length;break}
   if(a>=0&&a<b&&(h[a+4]===" "||h[a+4]===">")){depth++;i=a+4}else{depth--;i=b+6}}
  out+=h.slice(last,m.index)+html;last=i;re.lastIndex=i}
 return out+h.slice(last)}
{const ov=VIEWS.pro;VIEWS.pro=(id,...r)=>{let h=ov(id,...r);const u=U(id);if(!u||u.role!=="contractor")return h;
  const mine=me()&&me().id===u.id;
  if(/class="(?:g12-soon )?sec-soon"/.test(h))h=v19ReplaceSoon(h,v19Gallery(u,mine));
  if(!v19OwnPhotos(u).length&&!h.includes("v19-exgal")){
   const k=h.search(/<h2[^>]*>[^<]*Job photos/);
   if(k>=0){const end=h.indexOf("</section>",k);if(end>0)h=h.slice(0,end)+v19Gallery(u,mine)+h.slice(end)}
   else{const t=h.indexOf('id="trust"');h=t>0?h.slice(0,t)+v19Gallery(u,mine)+h.slice(t):h+v19Gallery(u,mine)}
  }
  return h}}

/* ========================================================================
   Quote path: price guide → compare → hire, with no dead ends
   ======================================================================== */
function v19Range(j){if(!j)return null;
 if(j.est11&&j.est11.low!=null&&j.est11.high!=null)return{low:j.est11.low,high:j.est11.high};
 if(typeof estimateRange!=="function")return null;
 try{return estimateRange({cat:j.cat,size:j.size11||"medium",urg:j.urgent?"urgent":"soon",zip:j.zip,desc:(j.title||"")+" "+(j.desc||"")})}catch(e){return null}}
function v19Next(j,m){if(!j||!m||m.id!==j.cust)return"";
 const qs=(DB.quotes||[]).filter(q=>q.job===j.id&&q.price!=null&&q.status!=="declined");
 const rng=v19Range(j);const band=rng?`${typeof money==="function"?money(rng.low):rng.low} – ${typeof money==="function"?money(rng.high):rng.high}`:"";
 const town=townOf(j.zip);
 if(j.status==="hired"||j.status==="completed"){
  const pro=U(j.hired);return`<aside class="v19-path" aria-label="Next step"><span class="v19-pi">${I("check",20)}</span><div><b>${j.status==="completed"?"This job is complete":"You hired "+esc((pro&&(pro.biz||nameOf(pro)))||"a pro")}</b><small>${j.status==="completed"?"Leave a review after you're happy with the work.":"Message them about timing, then use milestone escrow when you're ready."}</small></div><a class="btn sm primary" href="${j.status==="completed"?href("job",j.id):href("msgs",j.hired)}">${j.status==="completed"?"Open the job":"Message"}</a></aside>`}
 if(qs.length>=2)return`<aside class="v19-path go" aria-label="Next step"><span class="v19-pi">${I("layers",20)}</span><div><b>Compare ${qs.length} quotes, then hire</b><small>${band?`Typical for this job near ${esc(town)}: ${band}. `:""}Line them up on price, timeline, warranty and what's included.</small></div><a class="btn sm primary" href="${href("compare",j.id)}">${I("layers",14)}Compare side by side</a></aside>`;
 if(qs.length===1)return`<aside class="v19-path" aria-label="Next step"><span class="v19-pi">${I("quote",20)}</span><div><b>You have a first quote</b><small>${band?`Typical range near ${esc(town)} is ${band}. `:""}Invite one or two more matches so you can compare, or hire this pro if you're ready.</small></div><div class="v19-pa"><a class="btn sm" href="${href("prices",null,{cat:j.cat,zip:j.zip})}">Price guide</a><a class="btn sm primary" href="#matches">Invite another pro</a></div></aside>`;
 return`<aside class="v19-path" aria-label="Next step"><span class="v19-pi">${I("tag",20)}</span><div><b>Know the typical price, then invite matches</b><small>${band?`Jobs like this near ${esc(town)} usually run ${band}. `:""}Invite two or three nearby pros so you can compare quotes side by side.</small></div><div class="v19-pa"><a class="btn sm" href="${href("prices",null,{cat:j.cat,zip:j.zip})}">Open the price guide</a><a class="btn sm primary" href="#matches">See matches</a></div></aside>`}

{const ov=VIEWS.job;VIEWS.job=(id,q)=>{let h=ov(id,q);const j=(DB.jobs||[]).find(x=>x.id===id);if(!j)return h;h=h.replace('class="w11-short-h"','id="matches" class="w11-short-h"');const m=me();const box=v19Next(j,m);if(!box)return h;
  /* put the next-step strip just after the facts / actions card */
  const k=h.indexOf("</dl>");if(k>0){const end=h.indexOf("</div>",k);if(end>0)return h.slice(0,end+6)+box+h.slice(end+6)}
  return box+h}}
{const ov=VIEWS.compare;VIEWS.compare=(jid,...r)=>{let h=ov(jid,...r);const j=(DB.jobs||[]).find(x=>x.id===jid);if(!j)return h;
  const rng=v19Range(j);
  const hasBand=/fp14-band|Typical for this job/.test(h);
  const range=rng?`Typical for this job near ${esc(townOf(j.zip))}: <b>${money(rng.low)} – ${money(rng.high)}</b>. `:"";
  const tip=`<p class="v19-cmpg muted">${I("tag",14)} ${hasBand?"":range}<a href="${href("prices",null,{cat:j.cat,zip:j.zip})}">See the price guide</a>. Hire from this page when you're ready — the other bidders are told the job is filled.</p>`;
  return h.replace("</h1>", "</h1>"+tip).replace(/side by side on price, timeline, reputation and proof of work\./,m=>m+" Hire in one tap when you've picked a pro.")}}
{const oa=AFTER.post;AFTER.post=(...a)=>{oa&&oa(...a);const m=me();if(!m)return;
  const last=(DB.jobs||[]).filter(j=>j.cust===m.id).sort((a,b)=>b.created-a.created)[0];
  const el=document.getElementById("pjf")||document.getElementById("w11f");
  /* after a successful post, existing handlers go to the job; the job page now carries the path */}}

/* Home / price guide already deep-link into post; keep a cue on the posted-job dashboard cards */
{const ov=VIEWS.dash;VIEWS.dash=(...a)=>{let h=ov(...a);const m=me();if(!m||m.role!=="customer"||m.staff||(typeof v12Staff==="function"&&v12Staff(m)))return h;
  const open=(DB.jobs||[]).filter(j=>j.cust===m.id&&j.status==="posted");
  const ripe=open.filter(j=>(DB.quotes||[]).filter(q=>q.job===j.id&&q.price!=null&&q.status!=="declined").length>=2);
  if(!ripe.length)return h;
  const j=ripe[0],n=(DB.quotes||[]).filter(q=>q.job===j.id&&q.price!=null&&q.status!=="declined").length;
  const cue=`<aside class="v19-path go v19-dash"><span class="v19-pi">${I("layers",20)}</span><div><b>Compare ${n} quotes on “${esc(j.title)}”</b><small>Price guide, side-by-side comparison, then hire — that's the default path.</small></div><a class="btn sm primary" href="${href("compare",j.id)}">Compare and hire</a></aside>`;
  const k=h.indexOf('<section class="na8"');return k>=0?h.slice(0,k)+cue+h.slice(k):cue+h}}

/* Pretty in-app URLs (SW-016) are deferred so existing #/ links and tests keep working. Typed /prices and /p/:id still open via the existing hash rewrite. Indexing stays off. */

/* ---- LIVE: route actions to the server ---- */
(function(){
const LIVE=["updatePro","fav","postJob","interest","quote","hire","complete","review","reply","send","readNotifs","postProject","applyRole","acceptApp","declineApp","markDone","reviewCrew","advancePhase","crewSend"].concat(typeof V2_ACTIONS!=="undefined"?V2_ACTIONS:[]);
LIVE.forEach(n=>{if(!A[n])return;A[n]=(...args)=>{const r=__xhr("POST","/api/act",{name:n,args});if(r.state)__applyState(r.state);if(r.error)return{ok:false,msg:r.error,need:r.need};return r.res===undefined?{ok:true}:r.res}});
function signup(kind,o,pw){const r=__xhr("POST","/api/signup",{kind,data:o,password:pw});if(r.state)__applyState(r.state);if(r.error)return{ok:false,msg:r.error};return r.res}
A.signupCustomer=(name,email,zip)=>signup("customer",{name,email,zip},(document.getElementById("cu-p")||{}).value||"");
A.signupPM=o=>signup("pm",o,(document.getElementById("pms-p")||{}).value||"");
A.signupPro=o=>{const pw=o.password||"";const d=Object.assign({},o);delete d.password;return signup("pro",d,pw)};
A.login=()=>({ok:false,msg:"Demo sign-in is off in the beta. Create an account or log in."});
A.logout=()=>{const r=__xhr("POST","/api/logout",{});if(r.state)__applyState(r.state);return{ok:true,msg:"Signed out"}};
A.reset=()=>{};
const onm=nameOf;nameOf=u=>onm(u)+(u&&u.demo?" (demo)":"");
const ov=VIEWS.signup,oa=AFTER.signup;
const LOGINF=`<form class="card form liveauth livelogin" id="loginf"><h2>Log in</h2><p class="muted small">Already joined the beta? Log in with your email and password.</p><div class="fld"><label for="li-e">Email</label><input id="li-e" name="email" type="email" autocomplete="email" required></div><div class="fld"><label for="li-p">Password</label><input id="li-p" name="password" type="password" autocomplete="current-password" required></div><div class="row wrapr li13"><button class="btn primary" type="submit">Log in</button><button type="button" class="linkbtn" id="liForgot">Forgot password?</button></div></form><h2 class="h-sub" style="margin-top:22px">New here? Create an account</h2>`;
AFTER.signup=(p,q)=>{try{oa(p,q)}catch(e){console.warn("signup after",e)}if(!document.getElementById("loginf")){const g=document.querySelector("#app .authgrid");if(g)g.insertAdjacentHTML("beforebegin",LOGINF)}const fg=document.getElementById("liForgot");if(fg)fg.onclick=()=>{/* v13 QA SW-033 */const em=(document.getElementById("li-e")||{}).value||"";const to=document.getElementById("au-to"),tab=document.getElementById("tab-email");if(!to){location.hash="#/signup";return}if(tab&&tab.getAttribute("aria-selected")!=="true")tab.click();const to2=document.getElementById("au-to")||to;to2.value=em.trim();try{sessionStorage.setItem("pw13","1")}catch(e){}const box=document.getElementById("authBox");if(box)box.scrollIntoView({behavior:"smooth",block:"start"});to2.focus();toast(em?"Tap Send code. We'll email a one-time code, then you can set a new password.":"Enter your email and tap Send code. Then you can set a new password.")};const f=document.getElementById("loginf");if(f)f.onsubmit=e=>{e.preventDefault();try{sessionStorage.removeItem("pw13")}catch(x){}const r=__xhr("POST","/api/login",{email:document.getElementById("li-e").value,password:document.getElementById("li-p").value});if(r.state)__applyState(r.state);if(r.error){toast(r.error,"err");return}act({ok:true,msg:"Signed in as "+nameOf(me())},()=>{if(q&&q.next)location.hash="#"+q.next;else go("dash")})}};
let busy=false;
setInterval(()=>{if(busy||document.hidden)return;busy=true;const x=new XMLHttpRequest();x.open("GET","/api/state?v="+LIVEV);x.onload=()=>{busy=false;try{const r=JSON.parse(x.responseText);if(r.state&&r.state._v!==LIVEV){const was=DB.me;__applyState(r.state);const ae=document.activeElement,typing=ae&&/INPUT|TEXTAREA|SELECT/.test(ae.tagName),modalOpen=document.querySelector("#modal .mbox");if(was!==DB.me){render()}else if(["msgs","dash","job","project","estimate","compare"].includes(ROUTE.v)||typing||modalOpen){if(window.onData)window.onData()}else{const y=scrollY;render();scrollTo(0,y)}if(typeof SHELL==="function"&&!document.querySelector("#acctMenu:not([hidden])"))SHELL()}}catch(e){}};x.onerror=()=>{busy=false};x.send()},4000);
})();
