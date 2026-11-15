/* ===== v36 ===== */
const V2_ACTIONS36=["mk36","billPhotos36"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS36);
function v36Now(){return typeof __now==="function"?__now():Date.now()}
const v36r2=n=>Math.round((Number(n)||0)*100)/100;

/* (1) QA SW-082: a deleted contractor's traveler calls leave the catalog, the same tidy as SW-072 for crew projects.
   A call nobody was hired on (open, or filled and later emptied) is deleted outright, with the notices that pointed at it
   and travelers' saved copies. A call with a hire (or a traveler review) stays only as a closed, unlisted record without its
   description, so the hired travelers keep their pay terms and hours log ("Check your check"). The server shows such a call
   to its hired travelers and staff only, never in signed-out state, and /t/<id> is the generic "Not found" page for everyone
   else (server.js). Called from A.__delete13 and once at start for owners deleted before v36 (v36CallOrphans). */
function v36CallHired(c){return(c.apps||[]).filter(a=>a&&a.status==="hired").map(a=>a.uid)}
function v36CallKeep(c){return v36CallHired(c).length>0||(DB.creviews||[]).some(r=>r&&r.call===c.id)}
function v36CallsGone(uid){const drop=new Set(),closed=new Set();if(!uid)return{deleted:0,closed:0};
 for(const c of (DB.tcalls||[])){if(!c||c.by!==uid||c.ownerGone36)continue;
  if(!v36CallKeep(c)){drop.add(c.id);continue}
  const hired=v36CallHired(c);c.status="closed";c.ownerGone36=v36Now();c.desc="";c.tools="";c.recip="";c.invites=[];
  (c.apps||[]).forEach(a=>{if(a&&a.status!=="hired"&&a.status!=="declined"&&a.status!=="withdrawn")a.status="closed"});
  hired.forEach(t=>{if(t&&t!==uid)notify(t,`${c.title} was closed: the contractor deleted their __BRAND__ account. Your pay terms and hours log stay with you.`,"tcall:"+c.id)});closed.add(c.id)}
 if(drop.size||closed.size)DB.notifs=(DB.notifs||[]).filter(n=>{if(!n||typeof n.link!=="string"||!n.link.startsWith("tcall:"))return true;const id=n.link.slice(6);if(drop.has(id))return false;
  if(closed.has(id)){const c=(DB.tcalls||[]).find(x=>x&&x.id===id);return!!(c&&v36CallHired(c).includes(n.to))}return true});
 if(drop.size){DB.tcalls=(DB.tcalls||[]).filter(c=>!drop.has(c&&c.id));(DB.users||[]).forEach(u=>{if(u&&Array.isArray(u.tsaved))u.tsaved=u.tsaved.filter(x=>!drop.has(x))})}
 return{deleted:drop.size,closed:closed.size}}
/* calls whose poster is gone: deleted before v36, or the account row is missing (demo calls are never touched) */
function v36CallOrphans(){const gone=new Set((DB.users||[]).filter(u=>u&&u.role==="deleted").map(u=>u.id)),have=new Set((DB.users||[]).map(u=>u&&u.id));let n=0;
 const demo=c=>!!(c.demo||/\(demo\)/i.test(String(c.title||"")));
 for(const id of new Set((DB.tcalls||[]).filter(c=>c&&c.by&&!c.ownerGone36&&!demo(c)&&(gone.has(c.by)||!have.has(c.by))).map(c=>c.by))){const r=v36CallsGone(id);n+=r.deleted+r.closed}return n}
{const ov=VIEWS.tcall;if(ov)VIEWS.tcall=function(id){let h=ov.apply(this,arguments);try{const c=TC(id);if(!c||!c.ownerGone36)return h;
  const note=`<p class="v34gone v36gone" role="note">${I("x",15)}<span>This call is closed. The contractor deleted their __BRAND__ account, so it no longer takes applications. Your pay terms and hours stay here for your records.</span></p>`;
  const k=h.indexOf("<h1");if(k>=0){const e=h.indexOf("</h1>",k);if(e>0)return h.slice(0,e+5)+note+h.slice(e+5)}return note+h}catch(e){}return h}}
