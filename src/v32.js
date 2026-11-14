/* v32: opt-in browser alerts (standard Web Push, no paid service). Pros: a new job in their trade and service area, and
   "you're hired" / "the job filled". Homeowners: a new quote. Everyone: "New message from <name>" (never the text). One clear switch per device on the dashboard and in Inbox,
   per-kind switches in Inbox, an easy off switch, and a test alert. Alerts arrive through the browser's own push service
   even when no Sawyer tab is open. Signing out stops alerts to that device. Nothing here runs on the server. */
const V32H="sawyer_v32_dash_hide";
function v32Sup(){try{return typeof navigator!=="undefined"&&"serviceWorker" in navigator&&typeof PushManager!=="undefined"&&typeof Notification!=="undefined"&&typeof window!=="undefined"&&window.isSecureContext!==false}catch(e){return false}}
function v32Who(m){return !!(m&&!m.staff&&!(typeof v12Staff==="function"&&v12Staff(m))&&(m.role==="contractor"||m.role==="customer"))}
function v32Cats(m){return(m.role==="contractor"?[["jobs","New jobs in my trade and area"],["hires","I'm hired, or a job I quoted fills"]]:[["quotes","A pro sends me a quote"]]).concat([["msgs","Someone sends me a message"]])}
function v32Copy(m){return m.role==="contractor"?"Get a notification the moment a job in your trade and service area is posted, when you're hired or a job you quoted fills, and when a customer messages you. Works even with Sawyer closed.":"Get a notification as soon as a pro sends you a quote or a message. Works even with Sawyer closed."}
function v32Card(m,where){if(!v32Who(m))return "";const dash=where==="dash";
 return`<div class="card v32push${dash?" v32push-dash":""}" id="v32push-${dash?"dash":"inbox"}" data-v32push="${dash?"dash":"inbox"}"><div class="v32p-h"><span class="v32p-i" aria-hidden="true">${I("bell",18)}</span><div class="v32p-tx"><h2>Alerts on this device</h2><p class="small muted v32p-d">${v32Copy(m)}</p></div></div>
 <div class="v32p-s" data-v32s role="status" aria-live="polite"><span class="muted small">Checking this browser…</span></div>
 ${dash?"":`<fieldset class="v32p-c" data-v32c hidden><legend>Alert me when</legend>${v32Cats(m).map(([k,l])=>`<label class="o9-chk"><input type="checkbox" data-v32cat="${k}"><span>${l}</span></label>`).join("")}</fieldset>`}</div>`}
function v32Key(s){const b=atob(String(s).replace(/-/g,"+").replace(/_/g,"/")+"===".slice((String(s).length+3)%4));const a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
async function v32Post(p,o){const r=await fetch(p,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(o||{})});let j={};try{j=await r.json()}catch(e){}if(!r.ok)throw new Error(j.error||"That didn't work. Try again.");return j}
function v32Reg(){return Promise.race([navigator.serviceWorker.getRegistration("/").then(r=>r||navigator.serviceWorker.register("/sw.js")).then(()=>navigator.serviceWorker.ready),new Promise((_,no)=>setTimeout(()=>no(new Error("timeout")),8000))])}
async function v32State(){if(!v32Sup())return{sup:false};if(Notification.permission==="denied")return{sup:true,denied:true};
 let sub=null;try{const reg=await v32Reg();sub=await reg.pushManager.getSubscription()}catch(e){return{sup:false,err:true}}
 let st={};try{st=await v32Post("/api/push/status",{endpoint:sub?sub.endpoint:""})}catch(e){st={}}
 return{sup:true,sub,on:!!(sub&&st.on&&Notification.permission==="granted"),cats:st.cats||{},key:st.key,devices:st.devices||0}}
function v32Paint(){const els=[...document.querySelectorAll("[data-v32push]")];if(!els.length)return;const m=me();if(!v32Who(m))return;
 v32State().then(S=>{for(const el of els){if(!el.isConnected)continue;const dash=el.dataset.v32push==="dash",s=el.querySelector("[data-v32s]"),c=el.querySelector("[data-v32c]");el.classList.toggle("v32on",!!S.on);
  if(dash&&!S.on&&(()=>{try{return localStorage.getItem(V32H)==="1"}catch(e){return false}})()){el.closest(".v32push-w")?el.closest(".v32push-w").hidden=true:el.hidden=true;continue}
  if(!S.sup){s.innerHTML=`<p class="small v32p-x">${I("info",14)}<span>This browser can't show alerts${S.err?" right now":""}. On iPhone or iPad, add Sawyer to your Home Screen first (Share, then Add to Home Screen) and turn alerts on from there.</span></p>${dash?`<button class="linkbtn small" data-v32hide>Hide this</button>`:""}`;if(c)c.hidden=true}
  else if(S.denied){s.innerHTML=`<p class="small v32p-x">${I("info",14)}<span>Notifications are blocked for Sawyer in this browser, or this is a private window. Allow notifications for this site in a regular window, then come back here.</span></p>${dash?`<button class="linkbtn small" data-v32hide>Hide this</button>`:""}`;if(c)c.hidden=true}
  else if(S.on){s.innerHTML=`<p class="v32p-on"><b>${I("check",14)}On for this device</b>${S.devices>1?`<span class="muted small"> · ${S.devices} devices in all</span>`:""}</p><div class="v32p-b"><button class="btn sm" data-v32test>${I("bell",14)}Send a test alert</button><button class="btn sm" data-v32off>Turn off</button>${dash?`<a class="small" href="${href("inbox")}">Choose what alerts you</a>`:""}</div>`;
   if(c){c.hidden=false;c.querySelectorAll("[data-v32cat]").forEach(x=>{x.checked=!!S.cats[x.dataset.v32cat]})}}
  else{s.innerHTML=`<div class="v32p-b"><button class="btn sm primary" data-v32on>${I("bell",14)}Turn on alerts</button>${dash?`<button class="linkbtn small" data-v32hide>Not now</button>`:""}</div><p class="small muted v32p-f">Your browser will ask first. Turn them off any time, here or in Inbox.</p>`;if(c)c.hidden=true}
  el.onclick=e=>{const b=e.target.closest("button");if(!b||!el.contains(b))return;
   if(b.hasAttribute("data-v32on"))v32On(b,S);else if(b.hasAttribute("data-v32off"))v32Off(b,S);else if(b.hasAttribute("data-v32test"))v32Test(b,S);else if(b.hasAttribute("data-v32hide")){try{localStorage.setItem(V32H,"1")}catch(x){}const w=el.closest(".v32push-w")||el;w.hidden=true;toast("Hidden. You can turn alerts on any time in Inbox.")}};
  el.onchange=e=>{const x=e.target.closest("[data-v32cat]");if(!x)return;const cats={};el.querySelectorAll("[data-v32cat]").forEach(i=>cats[i.dataset.v32cat]=i.checked);
   v32Post("/api/push/prefs",{cats,endpoint:S.sub?S.sub.endpoint:""}).then(()=>toast("Alert choices saved")).catch(er=>toast(er.message,"err"))}}}).catch(()=>{})}
async function v32On(b,S){b.disabled=true;try{const perm=await Notification.requestPermission();if(perm!=="granted"){toast(perm==="denied"?"Notifications are blocked for this site. Allow them in your browser settings.":"No problem. Alerts stay off.",perm==="denied"?"err":"");return v32Paint()}
  const reg=await v32Reg();let key=S.key;if(!key){const r=await fetch("/api/push/key",{credentials:"same-origin"});key=(await r.json()).key}
  let sub=await reg.pushManager.getSubscription();
  if(sub){const k=sub.options&&sub.options.applicationServerKey;const same=k&&btoa(String.fromCharCode(...new Uint8Array(k))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")===key;if(!same){await sub.unsubscribe();sub=null}}
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:v32Key(key)});
  const m=me(),cats={};v32Cats(m).forEach(([k])=>cats[k]=true);await v32Post("/api/push/subscribe",{sub:sub.toJSON(),cats});
  try{localStorage.removeItem(V32H)}catch(e){}toast("Alerts are on for this device")}
 catch(e){toast(/timeout/.test(e.message)?"This browser didn't respond. Reload the page and try again.":e.message||"Couldn't turn alerts on. Try again.","err")}finally{b.disabled=false;v32Paint()}}
async function v32Off(b,S){b.disabled=true;try{const ep=S.sub&&S.sub.endpoint;if(S.sub)try{await S.sub.unsubscribe()}catch(e){}if(ep)await v32Post("/api/push/unsubscribe",{endpoint:ep});toast("Alerts are off for this device")}catch(e){toast(e.message,"err")}finally{b.disabled=false;v32Paint()}}
async function v32Test(b,S){b.disabled=true;try{const r=await v32Post("/api/push/test",{endpoint:S.sub&&S.sub.endpoint});toast(r.ok?"Test alert sent. It should pop up in a few seconds.":"The push service didn't take it. Turn alerts off and on again.",r.ok?"":"err")}catch(e){toast(e.message,"err")}finally{b.disabled=false}}
/* Dashboard (pros and homeowners): right under the "next up" strip, like the v30 renewals card. */
{const ov=VIEWS.dash;VIEWS.dash=function(){let h=ov.apply(this,arguments);try{const m=me();if(!v32Who(m))return h;const card=`<section class="o7-wrap v32push-w">${v32Card(m,"dash")}</section>`;
  const r=h.indexOf('<section class="o7-wrap v30rn-w">');if(r>=0){const e=h.indexOf("</section>",r);if(e>0)return h.slice(0,e+10)+card+h.slice(e+10)}
  const i=h.indexOf('<section class="na8"'),j=i<0?-1:h.indexOf("</section>",i);if(j>0)return h.slice(0,j+10)+card+h.slice(j+10);
  const k=h.indexOf('<div class="v13-dtop">');return k>=0?h.slice(0,k+22)+card+h.slice(k+22):card+h}catch(e){console.warn(e)}return h}}
{const oa=AFTER.dash;AFTER.dash=function(){const r=oa&&oa.apply(this,arguments);try{v32Paint()}catch(e){}return r}}
/* Inbox: the full card (with what-to-alert switches) at the top of the "How we reach you" column. */
{const ov=VIEWS.inbox;VIEWS.inbox=function(){let h=ov.apply(this,arguments);try{const m=me();if(!v32Who(m))return h;const a='<aside class="n11-side">',k=h.indexOf(a);if(k>=0)h=h.slice(0,k+a.length)+v32Card(m,"inbox")+h.slice(k+a.length)}catch(e){console.warn(e)}return h}}
{const oa=AFTER.inbox;AFTER.inbox=function(){const r=oa&&oa.apply(this,arguments);try{v32Paint()}catch(e){}return r}}
/* Signing out also drops this device's subscription in the browser (the server already forgets it with the session). */
if(typeof window!=="undefined"&&window.document&&typeof document.addEventListener==="function"&&v32Sup())document.addEventListener("click",e=>{try{if(e.target&&e.target.closest&&e.target.closest("#logoutBtn"))navigator.serviceWorker.getRegistration("/").then(r=>r&&r.pushManager.getSubscription()).then(s=>s&&s.unsubscribe()).catch(()=>{})}catch(x){}},true);
