/* ---- LIVE: server-backed storage ---- */
const PREFKEY="sawyer_prefs";let LIVEV=0;
function __prefs(){try{return JSON.parse(localStorage.getItem(PREFKEY))||{}}catch(e){return{}}}
function save(){try{if(DB)localStorage.setItem(PREFKEY,JSON.stringify({theme:DB.theme,recent:DB.recent||[]}))}catch(e){}}
function __xhr(method,url,body){const x=new XMLHttpRequest();x.open(method,url,false);if(body)x.setRequestHeader("Content-Type","application/json");try{x.send(body?JSON.stringify(body):null)}catch(e){return{error:"Network error, please try again"}}let r;try{r=JSON.parse(x.responseText)}catch(e){r={error:"Server error ("+x.status+")"}}return r}
function __applyState(st){if(!st)return;const p=__prefs();st.theme=p.theme||"light";st.recent=Array.isArray(p.recent)?p.recent:[];DB=st;LIVEV=st._v||0}
function __liveLoad(){const r=__xhr("GET","/api/state");if(r&&r.state){const p=__prefs();r.state.theme=p.theme||"light";r.state.recent=p.recent||[];LIVEV=r.state._v||0;return r.state}return{v:1,users:[],jobs:[],reviews:[],msgs:[],quotes:[],notifs:[],projects:[],pmsgs:[],me:null,theme:"light",recent:[]}}
