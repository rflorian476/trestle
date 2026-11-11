/* ---- LIVE: server-backed storage ---- */
const PREFKEY="sawyer_prefs";let LIVEV=0;
function __prefs(){try{return JSON.parse(localStorage.getItem(PREFKEY))||{}}catch(e){return{}}}
function save(){try{if(DB)localStorage.setItem(PREFKEY,JSON.stringify({recent:DB.recent||[]}))}catch(e){}}
function __xhr(method,url,body){const x=new XMLHttpRequest();x.open(method,url,false);if(body)x.setRequestHeader("Content-Type","application/json");try{x.send(body?JSON.stringify(body):null)}catch(e){return{error:"Network error, please try again"}}let r;try{r=JSON.parse(x.responseText)}catch(e){r={error:"Server error ("+x.status+")"}}return r}
function __applyState(st){if(!st)return;if(!st.partial)__PART=null;const p=__prefs();st.theme="light";st.recent=Array.isArray(p.recent)?p.recent:[];DB=st;LIVEV=st._v||0}
// v16 (SW-018): a signed-out /p/<id> page arrives with only that profile's data (state.partial = the pro id). The full
// public state loads in the background right after the page has loaded, and synchronously before any other page renders.
let __PART=null;
function __fullSync(){if(!__PART)return;const r=__xhr("GET","/api/state");if(r&&r.state&&!r.state.partial)__applyState(r.state)}
function __partOk(){if(!__PART)return true;const h=String(location.hash||"").replace(/\?.*$/,"");return(h===""||h==="#"||h==="#/")?location.pathname==="/p/"+__PART:h==="#/pro/"+encodeURIComponent(__PART)}
function __fullLater(){const f=()=>setTimeout(()=>{if(!__PART)return;const x=new XMLHttpRequest();x.open("GET","/api/state");x.onload=()=>{try{const r=JSON.parse(x.responseText);if(__PART&&r.state&&!r.state.partial){__applyState(r.state);if(typeof SHELL==="function")SHELL()}}catch(e){}};x.send()},60);if(document.readyState==="complete")f();else addEventListener("load",f,{once:true})}
function __liveLoad(){const r=window.__ST?{state:window.__ST}:__xhr("GET","/api/state");window.__ST=null;if(r&&r.state&&r.state.partial){__PART=r.state.partial;__fullLater()}if(r&&r.state){const p=__prefs();r.state.theme="light";r.state.recent=p.recent||[];LIVEV=r.state._v||0;return r.state}return{v:1,users:[],jobs:[],reviews:[],msgs:[],quotes:[],notifs:[],projects:[],pmsgs:[],me:null,theme:"light",recent:[]}}
