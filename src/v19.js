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

// v21: when the license and the insurance certificate share an expiry date, each reminder step (60, 30, 7 days and the
// expiry date) sends ONE notice (and so one email) covering both, as the FAQ promises, instead of two identical ones.
function v19Remind(u){if(!u||u.role!=="contractor")return 0;let n=0;
 const due=[];[["licExp","license"],["insExp","insurance certificate"]].forEach(([k,label])=>{const left=v19Left(u[k]);if(left==null)return;
  const step=[0,7,30,60].find(x=>left<=x);if(step==null)return;
  u.verifyRem19=u.verifyRem19||{};const key=k+":"+(v19Day(u[k])||"") +":"+step;if(u.verifyRem19[key])return;
  due.push({k,label,left,step,key,day:v19Day(u[k])})});
 const groups=[];for(const d of due){const g=groups.find(x=>x[0].day===d.day&&x[0].step===d.step&&x[0].left===d.left);if(g)g.push(d);else groups.push([d])}
 for(const g of groups){const d=g[0],both=g.length>1,label=both?"license and insurance certificate":d.label,left=d.left,badge=u.verified;
  g.forEach(x=>{u.verifyRem19[x.key]=v19Now()});
  const when=left<0?`Your ${label} expired ${d.day}. ${badge?"Your Verified badge comes off until the Trust team reviews the renewal.":"Upload the renewal and resubmit for review."}`
   :left===0?`Your ${label} ${both?"expire":"expires"} today (${d.day}). ${badge?"The Verified badge stays on through today and comes off at the end of the day. Renew "+(both?"them":"it")+" and resubmit so the badge can stay on.":"Renew "+(both?"them":"it")+" today and resubmit for review."}`
   :`Your ${label} ${both?"expire":"expires"} in ${left} day${left===1?"":"s"} (${d.day}). ${badge?"Renew "+(both?"them":"it")+" and resubmit so your Verified badge stays on.":"Renew "+(both?"them":"it")+" before "+(both?"they lapse":"it lapses")+"."}`;
  notify(u.id,when,"verify");
  n++}
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
  <div class="v19-g">${photos.map((p,i)=>`<figure><img class="art v4art" src="${esc(p.src)}" alt="Example of ${esc(trade)} work" loading="lazy" decoding="async"><figcaption>Example of ${esc(trade)} work</figcaption></figure>`).join("")}</div>
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
