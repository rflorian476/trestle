/* ---- LIVE: server-backed storage ---- */
const PREFKEY="sawyer_prefs";let LIVEV=0;
function __prefs(){try{return JSON.parse(localStorage.getItem(PREFKEY))||{}}catch(e){return{}}}
function save(){try{if(DB)localStorage.setItem(PREFKEY,JSON.stringify({recent:DB.recent||[]}))}catch(e){}}
function __xhr(method,url,body){const o={method:method,credentials:"same-origin"};if(body){o.headers={"Content-Type":"application/json"};o.body=JSON.stringify(body)}return fetch(url,o).then(function(x){return x.json().then(function(r){return r},function(){return{error:"Server error ("+x.status+")"}})}).catch(function(){return{error:"Network error, please try again"}})}
function __when(r,fn){return r&&typeof r.then==="function"?r.then(fn):fn(r)}
function __applyState(st){if(!st)return;if(!st.partial)__PART=null;const p=__prefs();st.theme="light";st.recent=Array.isArray(p.recent)?p.recent:[];DB=st;LIVEV=st._v||0}
// v16 (SW-018): a signed-out /p/<id> page arrives with only that profile's data (state.partial = the pro id). The full
// public state loads in the background right after the page has loaded, and synchronously before any other page renders.
let __PART=null;
function __fullSync(){if(!__PART)return Promise.resolve();return __xhr("GET","/api/state").then(function(r){if(r&&r.state&&!r.state.partial)__applyState(r.state)})}
function __partOk(){if(!__PART)return true;const h=String(typeof routeStr==="function"?routeStr():location.hash||"").replace(/\?.*$/,"");return h==="#/pro/"+encodeURIComponent(__PART)||h==="#/pro/"+__PART}
function __fullLater(){const f=()=>setTimeout(()=>{if(!__PART)return;const x=new XMLHttpRequest();x.open("GET","/api/state");x.onload=()=>{try{const r=JSON.parse(x.responseText);if(__PART&&r.state&&!r.state.partial){__applyState(r.state);if(typeof SHELL==="function")SHELL()}}catch(e){}};x.send()},60);if(document.readyState==="complete")f();else addEventListener("load",f,{once:true})}
function __liveLoad(){const empty={v:1,users:[],jobs:[],reviews:[],msgs:[],quotes:[],notifs:[],projects:[],pmsgs:[],me:null,theme:"light",recent:[]};
 function take(st){if(!st)return empty;if(st.partial){__PART=st.partial;__fullLater()}const p=__prefs();st.theme="light";st.recent=Array.isArray(p.recent)?p.recent:(p.recent||[]);LIVEV=st._v||0;return st}
 function fromRes(r){return take(r&&r.state?r.state:(r&&r.users?r:null))}
 if(window.__ST){const st=window.__ST;window.__ST=null;return take(st)}
 let req=window.__STP||(typeof __xhr==="function"?__xhr("GET","/api/state"):null);
 window.__STP=null;
 // v42 (SW-101): a signed-in /account page also starts GET /api/account from <head>; wait for both so the first paint has the sign-in methods.
 if(req&&window.__ACP&&typeof window.__ACP.then==="function"){const ap=window.__ACP;window.__ACP=null;req=Promise.all([req,ap.then(function(a){window.__ACI=a;return a},function(){return null})]).then(function(x){return x[0]})}
 return __when(req||{},fromRes)}
