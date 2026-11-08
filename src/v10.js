/* ===== v10: e-signed estimates that turn into invoices, receipt photo capture (camera + compression, thumbnails, upload fix), traveler availability status + "Open to travel" badge, server-side recurring sweep ===== */
const V10_ACTIONS=["signEst","travStatus"];
if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V10_ACTIONS);
Object.assign(IP,Object.fromEntries(Object.entries({
 pen:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
 camera:'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
 plane:'<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>'
}).filter(([k])=>!IP[k])));
const V10SIGPATH=/^[ML][0-9ML. ]{2,7999}$/;
let V10SIGN=false;
/* ---- traveler status ---- */
const T10ST={now:["Available now","b-now"],soon:["Available soon",""],onjob:["On a call",""],off:["Not looking",""]};
function t10St(t){if(!t)return"off";if(t.st10&&T10ST[t.st10]){if(t.st10==="now"&&!t.availNow)return"soon";return t.st10}return t.availNow?"now":"soon"}
function t10Open(t){const s=t10St(t);if(s==="off")return false;if(s==="now")return true;const d=t.availDate?new Date(t.availDate+"T12:00").getTime():0;return !d||d-Date.now()<=45*864e5}
function t10Badge(t){const s=t10St(t);if(s==="now")return`<span class="badge b-now"><i class="pulse"></i>Available now</span>`;if(s==="off")return`<span class="badge b10-off">Not looking</span>`;if(s==="onjob")return`<span class="badge b10-job">${I("brief",12)}On a call${t.availDate?" until "+fmtD(t.availDate):""}</span>`;return`<span class="badge">${I("clock",12)}From ${fmtD(t.availDate)}</span>`}
const t10OpenB=t=>t10Open(t)?`<span class="b10-open" title="Willing to travel for work in the next 45 days">${I("plane",12)}Open to travel</span>`:"";
Object.assign(A,{
 travStatus(st,date){const m=me();if(!m||!m.trav)return{ok:false,msg:"Create your traveler profile first"};if(!T10ST[st])return{ok:false,msg:"Pick a status"};const d=v7Date(date);
  if((st==="soon"||st==="onjob")&&!d)return{ok:false,msg:st==="onjob"?"Add the date this call ends":"Add the date you're free"};if(d&&d<v7Today()&&st!=="now")return{ok:false,msg:"Pick a date from today on"};
  m.trav.st10=st;m.trav.availNow=st==="now";if(d&&st!=="now"&&st!=="off")m.trav.availDate=d;m.trav.updated=Date.now();save();
  return{ok:true,msg:{now:"You're marked available now. Contractors see you first.",soon:"Available from "+fmtD(d)+". You'll show as open to travel.",onjob:"On a call until "+fmtD(d)+". We'll show contractors when you're free.",off:"Hidden from \"Open to travel\". Your profile stays listed."}[st]}},
 /* ---- e-signed approval ---- */
 signEst(id,on,sig){const m=me(),b=v7Bill(id);if(!m)return{ok:false,need:"login",msg:"Sign in first"};if(!b||b.type==="inv"||b.cuid!==m.id)return{ok:false,msg:"This isn't addressed to your account"};
  sig=sig&&typeof sig==="object"?sig:{};const name=String(sig.name||"").replace(/\s+/g," ").trim().slice(0,80);const path=String(sig.path||"");
  if(name.length<3||!/\s/.test(name))return{ok:false,msg:"Type your full name to sign",field:"name"};if(!sig.agree)return{ok:false,msg:"Tick the box to agree to sign electronically",field:"agree"};
  if(path&&!V10SIGPATH.test(path))return{ok:false,msg:"Draw your signature again"};
  V10SIGN=true;let r;try{r=V10AE(id,on)}finally{V10SIGN=false}if(!r||!r.ok)return r;
  b.sig10={name,path:path||null,at:Date.now(),by:m.id,total:billCalc(b).total};save();
  notify(b.by,`${name} e-signed ${b.no}. Turn it into an invoice in one tap.`,"bill:"+b.id);
  return{ok:true,msg:`Signed and approved. ${b.bizName} has been told${b.deposit?" and will send the deposit invoice":""}.`}}
});
const V10AE=A.approveEst;A.approveEst=function(id,on){if(V10SIGN)return V10AE(id,on);return{ok:false,msg:"Sign below to approve"}};
{const oc=A.convertEst;A.convertEst=function(id){const b=v7Bill(id);const r=oc(id);if(r&&r.ok&&b){const inv=v7Bill(r.id);if(inv){inv.fromEst10={id:b.id,no:b.no,name:b.sig10?b.sig10.name:null,at:b.sig10?b.sig10.at:b.approved||null};save()}}return r}}
/* receipts: uploads live at /u/<hash>; older builds only accepted /uploads, so receipt photos were silently dropped */
{const ol=A.addLedger;A.addLedger=function(o){o=o||{};const ph=/^\/u\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(String(o.photo||""))?o.photo:null;const n0=(DB.ledger||[]).length;const r=ol(o);
 if(r&&r.ok&&ph&&o.kind==="exp"&&DB.ledger.length>n0){const l=DB.ledger[DB.ledger.length-1];if(l&&l.kind==="exp"){l.photo=ph;save()}}return r}}
{const os=A.travAvail;A.travAvail=function(on){const r=os(on);const m=me();if(r&&r.ok&&m&&m.trav){m.trav.st10=on?"now":(m.trav.st10==="now"||!m.trav.st10?"soon":m.trav.st10);if(!on&&!m.trav.availDate)m.trav.availDate=v7Today();save()}return r}}
/* ---- views ---- */
function sig10Block(s,label){if(!s)return"";return`<section class="s10-doc" aria-label="Electronic signature"><div class="s10-ink">${s.path?`<svg viewBox="0 0 400 120" role="img" aria-label="Signature of ${esc(s.name)}"><path d="${esc(s.path)}"/></svg>`:`<span class="s10-typed">${esc(s.name)}</span>`}</div><div class="s10-meta"><b>${I("check",14)}${label||"Approved and signed electronically"}</b><span>${esc(s.name)} · ${new Date(s.at).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})}${s.total!=null?" · "+v7$(s.total):""}</span><small class="muted">Signed in the ${BRAND} app under the customer's own sign-in. Valid under the U.S. ESIGN Act.</small></div></section>`}
{const ob=billDoc;billDoc=function(b,forCust){let h=ob(b,forCust);let add="";if(b.sig10)add=sig10Block(b.sig10);
 else if(b.fromEst10)add=`<section class="s10-doc s10-from"><div class="s10-meta"><b>${I("doc",14)}Based on estimate ${esc(b.fromEst10.no)}</b><span>${b.fromEst10.name?"Signed by "+esc(b.fromEst10.name)+" on "+fmtDate(b.fromEst10.at):"Approved "+(b.fromEst10.at?fmtDate(b.fromEst10.at):"")}</span></div></section>`;
 if(add){const i=h.lastIndexOf("</article>");if(i>0)h=h.slice(0,i)+add+h.slice(i)}return h}}
{const ov=VIEWS.invoice;VIEWS.invoice=(id,q)=>{let h=ov(id,q);const m=me(),b=v7Bill(id);if(!m||!b||b.type==="inv")return h;
 if(b.cuid===m.id&&b.status==="sent"){const what=b.type==="co"?"change order":"estimate";const i=h.indexOf('<button class="btn primary lg" id="bApprove">');if(i<0)return h;const j=h.indexOf("</button>",i)+9;
  const pad=`<form class="s10" id="s10F" novalidate><h3>${I("pen",16)}Sign to approve</h3><div class="fld"><label for="s10n">Your full name</label><input id="s10n" name="name" autocomplete="name" value="${esc(nameOf(m))}" required></div>
  <div class="s10-padw"><canvas id="s10c" width="800" height="240" aria-label="Signature pad. Draw your signature, or skip it and your typed name is used."></canvas><span class="s10-x" aria-hidden="true">✕</span><span class="s10-hint" id="s10h">Draw your signature (optional)</span><button type="button" class="linkbtn s10-clr" id="s10clr">Clear</button></div>
  <label class="s10-agree"><input type="checkbox" id="s10a" name="agree"><span>I agree to sign electronically and approve this ${what} for <b data-ctot>${v7$(billCalc(b).total)}</b>.</span></label>
  <button class="btn primary lg block" id="s10go">${I("check",16)}Sign and approve</button></form>`;
  h=h.slice(0,i)+pad+h.slice(j).replace(/<p class="muted small">Tick the optional items you want first\. ?/,'<p class="muted small s10-note">Tick any optional items above before you sign. ')}
 else if(b.by===m.id&&b.status==="sent")h=h.replace('<aside class="o7-side">','<aside class="o7-side"><div class="card s10-wait"><b>'+I("pen",16)+'Waiting for e-signature</b><p class="muted small">'+esc(b.cname)+' signs from their phone. You get a notice the moment they do, and the invoice is one tap away.</p></div>');
 return h}}
{const oa=AFTER.invoice;AFTER.invoice=(id,q)=>{oa&&oa(id,q);const f=document.getElementById("s10F");if(!f)return;const cv=document.getElementById("s10c"),cx=cv.getContext("2d");let strokes=[],cur=null;
 cx.lineWidth=5;cx.lineCap="round";cx.lineJoin="round";cx.strokeStyle="#0F2A44";
 const pt=e=>{const r=cv.getBoundingClientRect();return[Math.round((e.clientX-r.left)/r.width*400),Math.round((e.clientY-r.top)/r.height*120)]};
 const draw=()=>{cx.clearRect(0,0,800,240);strokes.forEach(s=>{cx.beginPath();s.forEach(([x,y],k)=>k?cx.lineTo(x*2,y*2):cx.moveTo(x*2,y*2));if(s.length===1)cx.lineTo(s[0][0]*2+1,s[0][1]*2);cx.stroke()});document.getElementById("s10h").hidden=strokes.length>0};
 cv.onpointerdown=e=>{e.preventDefault();cv.setPointerCapture(e.pointerId);cur=[pt(e)];strokes.push(cur);draw()};cv.onpointermove=e=>{if(!cur)return;const p=pt(e),l=cur[cur.length-1];if(Math.abs(p[0]-l[0])+Math.abs(p[1]-l[1])>=2){cur.push(p);draw()}};
 cv.onpointerup=cv.onpointercancel=()=>{cur=null};document.getElementById("s10clr").onclick=()=>{strokes=[];draw()};
 f.onsubmit=e=>{e.preventDefault();const b=v7Bill(id);const on=[...document.querySelectorAll("[data-pick]")].filter(p=>p.checked).map(p=>+p.dataset.pick);
  let path=strokes.map(s=>"M"+s.map(p=>p.join(" ")).join("L")).join("");if(path.length>7999)path="";
  act(A.signEst(id,on,{name:document.getElementById("s10n").value,agree:document.getElementById("s10a").checked,path}),()=>render())}}}
/* office: receipt capture */
async function r10shrink(file){if(!file||!/^image\//.test(file.type)||file.size<350*1024&&/jpeg|webp/.test(file.type))return file;
 try{const bm=await createImageBitmap(file);const k=Math.min(1,1600/Math.max(bm.width,bm.height));const c=document.createElement("canvas");c.width=Math.round(bm.width*k);c.height=Math.round(bm.height*k);c.getContext("2d").drawImage(bm,0,0,c.width,c.height);
  const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",.82));return blob&&blob.size<file.size?new File([blob],"receipt.jpg",{type:"image/jpeg"}):file}catch(e){return file}}
{const ov=VIEWS.office;VIEWS.office=(tab,q)=>{let h=ov(tab,q);if(tab!=="money")return h;
 h=h.replace('<div class="fld o7-file"><label for="ex-p">Receipt photo</label><input id="ex-p" type="file" accept="image/jpeg,image/png,image/webp"></div>','<div class="fld o7-file r10-cap"><span class="r10-l">Receipt photo</span><label for="ex-p" class="r10-btn"><span id="r10prev" class="r10-prev">'+I("camera",22)+'</span><span><b id="r10t">Snap or upload</b><small class="muted">Opens your camera on a phone</small></span></label><input id="ex-p" class="r10-in" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"></div>');
 h=h.replace(/<a href="(\/(?:u|uploads|img)\/[\w.\-]+)" target="_blank" rel="noopener">Receipt<\/a>/g,(x,u)=>`<a class="r10-th" href="${u}" target="_blank" rel="noopener" aria-label="Open receipt photo"><img src="${u}" alt="" loading="lazy" width="40" height="40"></a>`);return h}}
{const oa=AFTER.office;AFTER.office=(tab,q)=>{oa&&oa(tab,q);const fi=document.getElementById("ex-p");if(!fi)return;fi.addEventListener("change",async()=>{const f0=fi.files[0];if(!f0)return;const f=await r10shrink(f0);
 if(f!==f0&&typeof DataTransfer!=="undefined"){try{const dt=new DataTransfer();dt.items.add(f);fi.files=dt.files}catch(e){}}
 const pv=document.getElementById("r10prev"),t=document.getElementById("r10t");if(pv){const u=URL.createObjectURL(f);pv.innerHTML=`<img src="${u}" alt="Receipt preview">`}if(t)t.textContent="Photo added · "+Math.max(1,Math.round(f.size/1024))+" KB";})}}
/* traveler board: status picker + open-to-travel badge/filter */
{const oc=tTravCard;tTravCard=function(u,m){let h=oc(u,m);const t=u.trav;h=h.replace(tAvail(t),t10Badge(t));const ob=t10OpenB(t);if(ob)h=h.replace('<p class="small t6tv-meta">','<p class="small t10-ob">'+ob+'</p><p class="small t6tv-meta">');return h}}
{const ov=VIEWS.travel;VIEWS.travel=(p,q)=>{q=q||{};const tab=q.tab==="travelers"?"travelers":"jobs";let h;
 if(tab==="travelers"&&q.open==="1"){const all=DB.users,mm=me();DB.users=all.filter(u=>!u.trav||u===mm||t10Open(u.trav));try{h=ov(p,q)}finally{DB.users=all}
  if(mm&&mm.trav&&!t10Open(mm.trav)){const parts=h.split('<article class="t5card');const keep=parts.filter((x,k)=>!k||!x.slice(0,x.indexOf("</article>")).includes(href("traveler",mm.id)+'"'));if(keep.length<parts.length){h=keep.join('<article class="t5card');h=h.replace(/<p class="t5count" aria-live="polite"><b>(\d+)<\/b> traveler(s?) listed/,(x,n)=>{const k=+n-1;return`<p class="t5count" aria-live="polite"><b>${k}</b> traveler${k===1?"":"s"} listed`})}}}
 else h=ov(p,q);
 if(tab==="travelers")h=h.replace('<span>Own truck</span></label>','<span>Own truck</span></label><label class="t5tog"><input type="checkbox" name="open" value="1" '+(q.open==="1"?"checked":"")+'><span>Open to travel</span></label>');
 const m=me();if(m&&m.trav){const t=m.trav,s=t10St(t);const i=h.indexOf('<div class="t5avail card">');if(i>=0){const j=h.indexOf("</label></div>",i)+14;
  const pick=`<div class="t10st card" id="t10St"><div class="t10st-h"><div><b>Your status</b><p class="small muted">Shown on your card. "Open to travel" appears when you're free within 45 days.</p></div>${t10Badge(t)}${t10OpenB(t)}</div>
  <div class="t10seg" role="radiogroup" aria-label="Your availability">${Object.entries(T10ST).map(([k,v])=>`<label class="${s===k?"on":""}"><input type="radio" name="st10" value="${k}" ${s===k?"checked":""}><span>${v[0]}</span></label>`).join("")}</div>
  <div class="t10st-d" ${s==="soon"||s==="onjob"?"":"hidden"} id="t10D"><label for="t10d" id="t10dl">${s==="onjob"?"This call ends":"Free from"}</label><input type="date" id="t10d" value="${esc(t.availDate||"")}" min="${v7Today()}"><button type="button" class="btn sm primary" id="t10save">Save</button></div>
  <label class="t10-quick"><input type="checkbox" id="tAvail" ${t.availNow?"checked":""} role="switch" aria-label="Available now"><span>Quick switch: available now</span></label></div>`;
  h=h.slice(0,i)+pick+h.slice(j)}}
 return h}}
{const oa=AFTER.travel;AFTER.travel=(p,q)=>{oa&&oa(p,q);const box=document.getElementById("t10St");if(!box)return;const D=document.getElementById("t10D"),dl=document.getElementById("t10dl"),di=document.getElementById("t10d");
 const keep=()=>{const y=scrollY;render();scrollTo(0,y)};
 box.querySelectorAll("input[name=st10]").forEach(r=>r.onchange=()=>{box.querySelectorAll(".t10seg label").forEach(l=>l.classList.toggle("on",l.contains(r)));const v=r.value;if(v==="now"||v==="off")return act(A.travStatus(v,""),keep);D.hidden=false;dl.textContent=v==="onjob"?"This call ends":"Free from";di.focus()});
 document.getElementById("t10save").onclick=()=>{const r=box.querySelector("input[name=st10]:checked");act(A.travStatus(r?r.value:"soon",di.value),keep)}}}
{const ov=VIEWS.traveler;if(ov)VIEWS.traveler=(id,q)=>{let h=ov(id,q);const u=U(id);if(!u||!u.trav)return h;const ob=t10OpenB(u.trav);if(ob)h=h.replace('<h1>',ob.replace('b10-open','b10-open b10-lg')+'<h1>');return h}}
