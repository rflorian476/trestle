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
