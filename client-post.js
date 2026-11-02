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
const LOGINF=`<form class="card form liveauth livelogin" id="loginf"><h2>Log in</h2><p class="muted small">Already joined the beta? Log in with your email and password.</p><div class="fld"><label for="li-e">Email</label><input id="li-e" name="email" type="email" autocomplete="email" required></div><div class="fld"><label for="li-p">Password</label><input id="li-p" name="password" type="password" autocomplete="current-password" required></div><button class="btn primary" type="submit">Log in</button></form><h2 class="h-sub" style="margin-top:22px">New here? Create an account</h2>`;
AFTER.signup=(p,q)=>{try{oa(p,q)}catch(e){console.warn("signup after",e)}if(!document.getElementById("loginf")){const g=document.querySelector("#app .authgrid");if(g)g.insertAdjacentHTML("beforebegin",LOGINF)}const f=document.getElementById("loginf");if(f)f.onsubmit=e=>{e.preventDefault();const r=__xhr("POST","/api/login",{email:document.getElementById("li-e").value,password:document.getElementById("li-p").value});if(r.state)__applyState(r.state);if(r.error){toast(r.error,"err");return}act({ok:true,msg:"Signed in as "+nameOf(me())},()=>{if(q&&q.next)location.hash="#"+q.next;else go("dash")})}};
let busy=false;
setInterval(()=>{if(busy||document.hidden)return;busy=true;const x=new XMLHttpRequest();x.open("GET","/api/state?v="+LIVEV);x.onload=()=>{busy=false;try{const r=JSON.parse(x.responseText);if(r.state&&r.state._v!==LIVEV){const was=DB.me;__applyState(r.state);const ae=document.activeElement,typing=ae&&/INPUT|TEXTAREA|SELECT/.test(ae.tagName),modalOpen=document.querySelector("#modal .mbox");if(was!==DB.me){render()}else if(["msgs","dash","job","project","estimate","compare"].includes(ROUTE.v)||typing||modalOpen){if(window.onData)window.onData()}else{const y=scrollY;render();scrollTo(0,y)}if(typeof SHELL==="function"&&!document.querySelector("#acctMenu:not([hidden])"))SHELL()}}catch(e){}};x.onerror=()=>{busy=false};x.send()},4000);
try{render()}catch(e){}
})();
