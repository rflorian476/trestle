/* ===== v41 ===== */
/* (1) Fit check for traveler calls. A contractor hiring travelers sees, on every applicant, whether that person can
   actually work the call: a license card for the call's state (or one from a state the call says it accepts by
   reciprocity) at the level the call asks for, whether they're free by the start date, their safety card and how many
   foremen references they have. Shown on the call's Applicants list, on the pipeline cards and as a one-line summary
   ("2 of 3 active applicants fit the license and start date"). The traveler sees the same check for themselves on
   the call page before applying, so nobody drives 900 miles on a card the job can't use. Nothing is hidden or sorted
   away: the contractor still decides, the check only says what Sawyer can see from the posting and the profile. */
const V41_ST=["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","PR","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const V41_LV=["apprentice","journeyman","master"];
function v41Now(){try{if(typeof window!=="undefined"&&typeof window.__now==="function")return window.__now()}catch(e){}try{if(typeof __now==="function")return __now()}catch(e){}return Date.now()}
function v41Norm(s){return String(s||"").trim().toLowerCase()}
/* full names, case-insensitive. Codes (any case) only count in a list of 2+ states or a reciprocity-phrase sentence. */
const V41_NAME={alabama:"AL",alaska:"AK",arizona:"AZ",arkansas:"AR",california:"CA",colorado:"CO",connecticut:"CT",delaware:"DE","district of columbia":"DC",florida:"FL",georgia:"GA",hawaii:"HI",idaho:"ID",illinois:"IL",indiana:"IN",iowa:"IA",kansas:"KS",kentucky:"KY",louisiana:"LA",maine:"ME",maryland:"MD",massachusetts:"MA",michigan:"MI",minnesota:"MN",mississippi:"MS",missouri:"MO",montana:"MT",nebraska:"NE",nevada:"NV","new hampshire":"NH","new jersey":"NJ","new mexico":"NM","new york":"NY","north carolina":"NC","north dakota":"ND",ohio:"OH",oklahoma:"OK",oregon:"OR",pennsylvania:"PA","puerto rico":"PR","rhode island":"RI","south carolina":"SC","south dakota":"SD",tennessee:"TN",texas:"TX",utah:"UT",vermont:"VT",virginia:"VA",washington:"WA","west virginia":"WV",wisconsin:"WI",wyoming:"WY"};
function v41IsSt(c){return V41_ST.includes(String(c||"").toUpperCase())}
/* v42 (SW-102): "Washington DC", "Washington, D.C." and a bare "D.C." mean the District, not Washington state. They are
   rewritten to "District of Columbia" before parsing; "Washington state" and plain "Washington" still mean WA. */
function v42DcNorm(t){return String(t||"").replace(/\bwashington\s*,?\s*d\.?\s?c\b\.?/gi,"District of Columbia").replace(/(^|[^a-z.])d\.c\.(?![a-z])/gi,(m,a)=>a+"District of Columbia")}
function v41ParseRecip(txt){const raw=v42DcNorm(txt);if(!raw.trim())return[];if(/\bno reciprocity\b|\breciprocity not accepted\b/i.test(raw))return[];
 const names=Object.keys(V41_NAME).sort((a,b)=>b.length-a.length),nameRe=new RegExp("\\b("+names.join("|")+")\\b","gi"),out=[];
 const add=c=>{c=String(c||"").toUpperCase();if(v41IsSt(c)&&!out.includes(c))out.push(c)};
 let m;while((m=nameRe.exec(raw)))add(V41_NAME[m[1].toLowerCase()]);
 const tokRe=new RegExp("\\b(?:"+names.join("|")+"|[A-Za-z]{2})\\b","gi"),toks=[];
 tokRe.lastIndex=0;while((m=tokRe.exec(raw))){const w=m[0],code=w.length===2?w.toUpperCase():V41_NAME[w.toLowerCase()];if(code&&v41IsSt(code))toks.push({code,i:m.index,j:m.index+w.length})}
 const gapOk=(a,b)=>/^\s*([,\/]|and|,?\s*and)\s*$/i.test(raw.slice(a.j,b.i));
 for(let i=0;i<toks.length;){let j=i;while(j+1<toks.length&&gapOk(toks[j],toks[j+1]))j++;if(j>i){for(let k=i;k<=j;k++)add(toks[k].code);i=j+1}else i++}
 const phrase=/\b(reciprocity|licensed in|accepts?|accepted)\b/i;
 const word=new Set("or in me hi id la an at be by do if is it my no of on so to up us we am he as".split(" "));
 if(phrase.test(raw)){for(const sent of raw.split(/(?<=[.!?])\s+/)){if(!phrase.test(sent))continue;const tr=/\b([A-Za-z]{2})\b/g;let x;while((x=tr.exec(sent))){if(word.has(x[1].toLowerCase())&&x[1]!==x[1].toUpperCase())continue;if(v41IsSt(x[1]))add(x[1])}}}
 return out}
/* states a call accepts: structured recipStates when the poster picked them, otherwise parsed from the reciprocity line (full names, or codes in a list / reciprocity phrase). */
function v41Accepts(c){const own=String(c&&c.lstate||"").toUpperCase();
 if(Array.isArray(c&&c.recipStates)&&c.recipStates.length){return{own,recip:[...new Set(c.recipStates.map(s=>String(s||"").toUpperCase()).filter(s=>v41IsSt(s)&&s!==own))]}}
 return{own,recip:v41ParseRecip(c&&c.recip).filter(s=>s!==own)}}
/* calendar days to the start date in the call's zone (job state, else the poster's), not UTC midnight. */
function v41StateZip(st){st=String(st||"").toUpperCase();if(!st||typeof ZIPS!=="object"||!ZIPS)return"";for(const z of Object.keys(ZIPS)){const lab=String((ZIPS[z]&&ZIPS[z][0])||"");if(lab.slice(-2)===st||lab.slice(-3,-1)===st)return z}return""}
function v41CallTz(c){const st=c&&(c.state||c.lstate);const z=v41StateZip(st);if(z&&typeof v38ZipTz==="function")return v38ZipTz(z);const u=typeof U==="function"&&c?U(c.by):null;if(typeof v38UserTz==="function")return v38UserTz(u);return"America/New_York"}
function v41TodayIn(tz){try{return new Intl.DateTimeFormat("en-CA",{timeZone:tz||"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(v41Now()))}catch(e){return new Intl.DateTimeFormat("en-CA",{year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(v41Now()))}}
function v41CalDays(start,today){const a=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(start||"")),b=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(today||""));if(!a||!b)return NaN;return Math.round((Date.UTC(+a[1],+a[2]-1,+a[3])-Date.UTC(+b[1],+b[2]-1,+b[3]))/864e5)}
function v41TDays(c){if(!c||!/^\d{4}-\d{2}-\d{2}$/.test(String(c.start||"")))return NaN;return v41CalDays(c.start,v41TodayIn(v41CallTz(c)))}
function v41LvOk(have,need){const h=v41Norm(have),n=v41Norm(need);if(!n)return true;if(h===n)return true;const hi=V41_LV.indexOf(h),ni=V41_LV.indexOf(n);return hi>=0&&ni>=0&&hi>=ni}
function v41Day(d){return/^\d{4}-\d{2}-\d{2}$/.test(String(d||""))?new Date(d+"T12:00:00").getTime():0}
function v41Fit(c,t){t=t||{};const lic=Array.isArray(t.lic)?t.lic:[],A_=v41Accepts(c),need=String(c&&c.lic||"").trim(),out={};
 /* license */
 if(!A_.own){out.lic={ok:null,k:"ask",txt:"No license state on the call. Ask which cards they take."}}
 else{const inState=lic.filter(l=>String(l.state||"").toUpperCase()===A_.own),rec=lic.filter(l=>A_.recip.includes(String(l.state||"").toUpperCase()));
  const a=inState.find(l=>v41LvOk(l.type,need)),b=rec.find(l=>v41LvOk(l.type,need));
  if(a)out.lic={ok:true,k:"state",txt:`${a.type} card in ${A_.own}`};
  else if(b)out.lic={ok:true,k:"recip",txt:`${b.state} ${String(b.type).toLowerCase()} card, accepted by reciprocity`};
  else if(inState.length||rec.length){const l=inState[0]||rec[0];out.lic={ok:false,k:"level",txt:`${l.type} card (${l.state}); the call asks for ${need}`}}
  else{const have=[...new Set(lic.map(l=>String(l.state||"").toUpperCase()).filter(Boolean))];
   out.lic={ok:false,k:"none",txt:have.length?`No ${A_.own} card; ${have.join(", ")} ${have.length>1?"aren't":"isn't"} on the accepted list`:`No license on the profile`}}}
 /* start date */
 const start=v41Day(c&&c.start),st=typeof t10St==="function"?t10St(t):(t.availNow?"now":"soon"),free=v41Day(t.availDate),now=v41Now();
 if(st==="off")out.start={ok:false,k:"off",txt:"Marked not looking"};
 else if(st==="now"||(free&&free<=now))out.start={ok:true,k:"now",txt:"Free now"};
 else if(!free)out.start={ok:null,k:"ask",txt:"No free date on the profile"};
 else if(!start||free<=start)out.start={ok:true,k:"before",txt:`Free ${fmtD(t.availDate)}${start?", before the "+fmtD(c.start)+" start":""}`};
 else{const late=Math.round((free-start)/864e5);out.start={ok:false,k:"late",txt:`Free ${fmtD(t.availDate)}, ${late} day${late===1?"":"s"} after the start`}}
 out.osha=t.osha&&t.osha!=="None"?String(t.osha):"";
 out.fits=out.lic.ok===true&&out.start.ok===true;return out}
function v41Refs(uid){return(DB.refs||[]).filter(r=>r&&r.trav===uid&&r.status==="given").length}
function v41Chip(f){const cls=f.ok===true?"v41-ok":f.ok===false?"v41-no":"v41-ask";return`<span class="v41c ${cls}">${I(f.ok===true?"check":f.ok===false?"x":"info",12)}<span>${esc(f.txt)}</span></span>`}
function v41Chips(c,u){if(!u||!u.trav)return"";const f=v41Fit(c,u.trav),n=v41Refs(u.id);
 return`<div class="v41fit" data-fit="${f.fits?"yes":"no"}" data-lic="${f.lic.k}" data-start="${f.start.k}">${v41Chip(f.lic)}${v41Chip(f.start)}${f.osha?`<span class="v41c v41-n">${I("shield",12)}<span>${esc(f.osha)}</span></span>`:""}<span class="v41c v41-n">${I("award",12)}<span>${n} reference${n===1?"":"s"}</span></span></div>`}
function v41Active(c){return(c.apps||[]).filter(a=>a&&(a.status==="pending"||a.status==="short"))}
function v41FitCount(c){const act=v41Active(c);let n=0;for(const a of act){const u=U(a.uid);if(u&&u.trav&&v41Fit(c,u.trav).fits)n++}return{n,of:act.length}}
function v41Sum(c){const s=v41FitCount(c);if(!s.of)return"";return`<p class="v41sum small" id="v41sum">${I(s.n?"check":"info",14)}<span><b>${s.n} of ${s.of}</b> active applicant${s.of===1?"":"s"} ${s.n===1?"fits":"fit"} the license and start date. ${esc(v41AccTxt(c))}</span></p>`}
function v41AccTxt(c){const A_=v41Accepts(c);if(!A_.own)return"";return`This call takes ${c.lic?esc(c.lic).toLowerCase()+" ":""}cards from ${[A_.own,...A_.recip].join(", ")}.`}
if(typeof VIEWS!=="undefined"&&VIEWS.tcall){const ov=VIEWS.tcall;VIEWS.tcall=function(id){let h=ov.apply(this,arguments);try{const c=TC(id),m=me();if(!c||!m)return h;
  if(m.id===c.by){h=h.replace(/(<div class="member t5app">[\s\S]*?<a href="#\/traveler\/([^"?#\/]+)"[\s\S]*?<\/small>)/g,(all,pre,uid)=>pre+v41Chips(c,U(decodeURIComponent(uid))));
   const k=h.indexOf('<div class="card t5apps">');if(k>=0)h=h.slice(0,k)+v41Sum(c)+h.slice(k);return h}
  if(m.trav&&c.status==="open"){const k=h.indexOf('<div class="t6recip card">');if(k<0)return h;const e=h.indexOf("</p>",k);if(e<0)return h;const f=v41Fit(c,m.trav);
   const head=f.fits?"You fit this call":f.lic.ok===false?"Check your license first":f.start.ok===false?"Check your dates first":"How you fit this call";
   h=h.slice(0,e+4)+`<div class="v41me ${f.fits?"is-ok":f.lic.ok===false||f.start.ok===false?"is-no":""}" id="v41me"><b>${head}</b>${v41Chips(c,m)}<a class="small" href="${href("travme")}">Update your licenses or dates</a></div>`+h.slice(e+4)}}catch(e){}return h}}
if(typeof tKCard==="function"){const ok_=tKCard;tKCard=function(c,a,st){let h=ok_.apply(this,arguments);try{const u=U(a.uid),k=h.indexOf('<div class="t6k-a">');if(u&&k>=0)h=h.slice(0,k)+v41Chips(c,u)+h.slice(k)}catch(e){}return h}}

/* (2) "Your traveler calls" on the dashboard. Anyone who can post traveler calls (contractors and PMs) and who has posted them sees each open call with spots
   hired / needed, active applicants and how many of them fit, days to start, and one tap to the pipeline. An electrical
   (or other traveling-trade) account with no calls yet gets a short "Post a traveler call" card instead. */
function v41MyCalls(m){return(DB.tcalls||[]).filter(c=>c&&c.by===m.id&&!c.ownerGone36).sort((a,b)=>(a.status==="open"?0:1)-(b.status==="open"?0:1)||String(a.start||"").localeCompare(String(b.start||"")))}
function v41DashBlock(m){const calls=v41MyCalls(m),trav=typeof TRADES_T!=="undefined"&&TRADES_T[m.trade];if(!calls.length&&!trav)return"";
 if(!calls.length)return`<section class="v41calls" id="v41calls"><div class="ud-h"><h2>Traveler calls</h2><a href="${href("traveling")}">How it works</a></div><div class="v41cta card">${I("truck",22)}<div><b>Need hands for a big job?</b><small>Post the rate, per diem and license up front. Travelers apply free, no recruiter in the middle, no hiring fee.</small></div><a class="btn primary sm" href="${href("newtravel")}">${I("plus",14)}Post a traveler call</a></div></section>`;
 const open=calls.filter(c=>c.status==="open"),rows=calls.slice(0,4).map(c=>{const hired=tHiredN(c),s=v41FitCount(c),days=v41TDays(c);
  const when=!Number.isFinite(days)?"":days>1?`starts in ${days} days`:days===1?"starts tomorrow":days===0?"starts today":"started";
  return`<li class="v41row" data-call="${esc(c.id)}"><a class="v41row-m" href="${href("tcall",c.id)}"><b>${esc(c.title)}</b><small>${esc(c.loc||"")}${c.state?", "+esc(c.state):""} · ${tMoney(c.rate)}/hr + ${tMoney(c.perDiem)}/day${when?" · "+when:""}${c.status!=="open"?" · "+(c.status==="filled"?"filled":"closed"):""}</small></a>
  <span class="v41meter" role="img" aria-label="${hired} of ${c.need} hired"><i style="--f:${Math.min(100,Math.round(hired/Math.max(1,c.need)*100))}%"></i><span><b>${hired}</b>/${c.need} hired</span></span>
  <span class="v41apps">${s.of?`<b>${s.of}</b> active · <b class="${s.n?"v41g":""}">${s.n}</b> fit`:`<span class="muted">No active applicants</span>`}</span>
  <a class="btn sm" href="${href("tdash",null,{call:c.id})}">${I("users",14)}Pipeline</a></li>`}).join("");
 const act=open.reduce((a,c)=>a+v41FitCount(c).of,0);
 return`<section class="v41calls" id="v41calls"><div class="ud-h"><h2>Your traveler calls</h2><a href="${href("newtravel")}">${I("plus",14)}Post a call</a></div><div class="card v41list"><p class="small muted v41lead">${open.length} open call${open.length===1?"":"s"} · ${act} active applicant${act===1?"":"s"} to review. Fit = license (or reciprocity) for the call's state and free by the start date.</p><ul>${rows}</ul>${calls.length>4?`<a class="small" href="${href("tdash")}">All ${calls.length} calls</a>`:""}</div></section>`}
function v41DashInsert(h,block){if(!block||!h)return h;const marks=['<div class="ud-h"><h2>Project crews</h2>','<div class="ud-h"><h2>Your projects</h2>'];
 for(const a of marks){const k=h.indexOf(a);if(k>=0)return h.slice(0,k)+block+h.slice(k)}
 const g=h.indexOf('<div class="ud-grid">');if(g>=0)return h.slice(0,g)+block+h.slice(g);
 const w=h.indexOf('<div class="wrap ud-body">');if(w>=0){const i=h.indexOf(">",w);if(i>=0)return h.slice(0,i+1)+block+h.slice(i+1)}
 return h+block}
if(typeof VIEWS!=="undefined"&&VIEWS.dash){const ov=VIEWS.dash;VIEWS.dash=function(){let h=ov.apply(this,arguments);try{const m=me();if(!m||m.staff||(typeof canPostT==="function"?!canPostT(m):(m.role!=="contractor"&&m.role!=="pm")))return h;
  return v41DashInsert(h,v41DashBlock(m))}catch(e){}return h}}
