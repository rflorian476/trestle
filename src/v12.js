/* ===== v12: pro profile (priced services, real-photo portfolio + lightbox, response stats, service-area check, book a consult),
   home log (past jobs, warranties, maintenance), PM project board (staffing + Gantt-lite), profile completeness + Google/Facebook import (demo),
   marketing (share link + QR, review requests, embeddable widget), review reports + moderation queue ===== */
/* v13 perf: the home log, project board, moderation queue, marketing tab and import dialog ship in a separate
   file (src/v12-lazy.js) that loads only when one of those opens. The build fills in its hashed URL. */
const LZ12={ok:false,busy:false,cbs:[],src:"__LZ12_SRC__"};
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
const G12OK=s=>/^\/img\/g-[a-z0-9-]+\.webp$/.test(String(s||""))||UPLOAD_RE.test(String(s||""));
const g12Thumb=s=>/^\/img\/g-/.test(s)?s.replace(/\.webp$/,"-sm.webp"):s;
A.setGal12=function(list){const m=me();if(!m||m.role!=="contractor")return{ok:false,msg:"Pro accounts only"};const rows=(Array.isArray(list)?list:[]).slice(0,12).filter(x=>x&&G12OK(x.src)).map(x=>({src:String(x.src),cap:v7S(x.cap,90),tag:["before","after","finished","in-progress"].includes(x.tag)?x.tag:"finished",date:+x.date||Date.now()}));
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
 if((u.gal12||[]).length||own)h=h.replace(/<div class="gallery g\d">[\s\S]*?<\/div>/,()=>g12Grid(u,own));
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
  if(m.role==="pm")add("gantt","blue","Project board","Staffing and dates for every trade, across all your projects.",href("board"),"Open")}catch(e){}
 return extra.concat(out.filter(x=>!(m.role==="pm"&&x.icon==="layers"))).slice(0,5)}}
{const os=SHELL;SHELL=function(){os.apply(this,arguments);if(typeof document==="undefined"||!document.getElementById)return;const m=me();const am=document.getElementById("acctMenu");if(!am||!m||am.querySelector("[data-v12]"))return;
 const x=v12Staff(m)?`<a href="${href("mod")}" data-v12>${I("shield",16)}Moderation queue</a>`:m.role==="customer"?`<a href="${href("homelog")}" data-v12>${I("house",16)}Home log</a><a href="${href("consults")}" data-v12>${I("cal",16)}Consults</a>`:m.role==="pm"?`<a href="${href("board")}" data-v12>${I("gantt",16)}Project board</a>`:m.role==="contractor"?`<a href="${href("office","grow")}" data-v12>${I("megaphone",16)}Reviews &amp; marketing</a><a href="${href("consults")}" data-v12>${I("cal",16)}Consults</a>`:"";
 const first=am.querySelector("a");if(first)first.insertAdjacentHTML("afterend",x);else am.insertAdjacentHTML("afterbegin",x)}}
{const oi=v8Index;v8Index=function(){const R=oi();const m=me();const P=(t,l,ic,k)=>R.unshift({g:"Go to",t,s:"",l,ic,k:(t+" "+(k||"")).toLowerCase()});
 if(m&&m.role==="customer")P("Home log",href("homelog"),"house","warranties maintenance receipts past jobs");if(m&&m.role==="pm")P("Project board",href("board"),"gantt","gantt staffing schedule crew");if(m&&m.role==="contractor"){P("Reviews & marketing",href("office","grow"),"megaphone","qr code review requests widget share");P("Consults",href("consults"),"cal","booking calendar")}if(v12Staff(m))P("Moderation queue",href("mod"),"shield","reports disputes");return R}}
{const ov=VIEWS.schedule;VIEWS.schedule=(p,q)=>{const h=ov(p,q);const m=me();if(!m||m.role!=="contractor")return h;const x=cs12List(m,6);if(!x)return h;const k=h.indexOf('<div class="o7-wrap');return k>=0?h.slice(0,k)+x+h.slice(k):x+h}
 const oa=AFTER.schedule;AFTER.schedule=(...a)=>{oa&&oa(...a);cs12Bind()}}

/* ---- seed ---- */
function seedV12(){if(!DB||!DB.users)return;const now=Date.now(),D=864e5;
 if(!U("a1"))DB.users.push({id:"a1",role:"customer",name:"Sawyer Trust Team",zip:"78704",favs:[],staff:true,demo:true,joined:now-400*D});
 const c1=U("c1");if(c1){if(!c1.menu12)c1.menu12=[{s:"Water heaters",from:1450,unit:"job",note:"40–50 gal tank swap, haul-away and permit"},{s:"Tankless conversion",from:3900,unit:"job",note:"Gas line sizing and venting included"},{s:"Drain cleaning",from:189,unit:"job",note:"Main line, one cleanout"},{s:"Sewer line repair",from:2800,unit:"job",note:"Camera inspection first, $0 if we do the repair"},{s:"Sump pumps",from:650,unit:"job",note:"1/3 hp pump with check valve"},{s:"Frozen pipe thaw",from:225,unit:"visit",note:"Nights and weekends, same price"},{s:"Service call",from:95,unit:"hr",note:"Waived if you book the repair"}];
  if(!c1.gal12)c1.gal12=[["g-water-heater","Water heater in a utility closet, new venting","finished"],["g-pipe-wrench","Replacing a corroded supply line","in-progress"],["g-shower","Curbless shower valve and drain, Travis Heights","finished"],["g-radiator","Hydronic heat loop, new fittings","in-progress"],["g-wall-pipes","Old galvanized lines before a repipe","before"],["g-copper","Sweated copper on a 3/4\" main","finished"],["g-drain","Sink drain after a full snake and clean","after"]].map(([f,cap,tag],i)=>({src:"/img/"+f+".webp",cap,tag,date:now-(i*9+3)*D}));
  if(!c1.consult12)c1.consult12={on:true,modes:["onsite","video","phone"],times:["08:00","10:00","13:00","15:30"],days:[1,2,3,4,5,6],len:30}}
 const cs=v7Col("consults");if(!cs.length&&c1){const day=n=>{let d=new Date(now+n*D);while(d.getDay()===0)d=new Date(d.getTime()+D);return d.toISOString().slice(0,10)};
  cs.push({id:"cs1",pro:"c1",cu:"u2",date:day(2),time:"10:00",mode:"video",len:30,note:"Want to talk through a whole-house repipe before we buy.",zip:"78704",status:"requested",created:now-3*36e5,log:[{s:"requested",t:now-3*36e5}],demo:true},
   {id:"cs2",pro:"c1",cu:"u1",date:day(3),time:"13:00",mode:"onsite",len:30,note:"Tankless quote. The garage is unlocked, dog is friendly.",zip:"78704",status:"confirmed",created:now-D,log:[{s:"requested",t:now-D},{s:"confirmed",t:now-D+40*6e4}],demo:true});
  notify("c1","Chris Cottage booked a video call for "+v7DateNice(day(2))+", 10 am","consults")}
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
