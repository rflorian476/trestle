/* ===== v38 ===== */
function v38Now(){return typeof __now==="function"?__now():Date.now()}
/* (1) QA SW-088: a hired job (completed, or canceled after a hire) leaves the catalog once nobody who was on it still has an
   account. Live jobs already block deletion (A.__delete13), and a job with one living party stays for that party's records
   (the pro's portfolio and reviews, the homeowner's My home). When the last party deletes, the job is removed outright with
   its quotes, the reviews written on it, the notices that pointed at it and its saved copies, so /job/<id> is the plain
   "Not found" page and the public counts go back to what they were. Called from A.__delete13 after the account is anonymized,
   and once at start for jobs left behind by accounts deleted before v38 (v38JobOrphans, server.js). Demo jobs are never touched. */
function v38Gone(id,live){return!id||!live.has(id)}
function v38Live(){return new Set((DB.users||[]).filter(u=>u&&u.id&&u.role!=="deleted").map(u=>u.id))}
function v38JobDemo(j){return!!(j&&(j.demo||/\(demo\)/i.test(String(j.title||""))))}
function v38Drop(drop){if(!drop.size)return 0;
 DB.jobs=(DB.jobs||[]).filter(j=>!(j&&drop.has(j.id)));DB.quotes=(DB.quotes||[]).filter(q=>!(q&&drop.has(q.job)));
 DB.reviews=(DB.reviews||[]).filter(r=>!(r&&r.job&&drop.has(r.job)));
 DB.notifs=(DB.notifs||[]).filter(n=>!(n&&typeof n.link==="string"&&n.link.startsWith("job:")&&drop.has(n.link.slice(4))));
 (DB.visits||[]).forEach(v=>{if(v&&v.job37&&drop.has(v.job37))delete v.job37});
 (DB.users||[]).forEach(u=>{if(u&&Array.isArray(u.saved))u.saved=u.saved.filter(x=>!drop.has(x));if(u&&u.home37&&u.home37.as)Object.keys(u.home37.as).forEach(k=>{if(drop.has(k.replace(/^job:/,"")))delete u.home37.as[k]})});
 return drop.size}
function v38JobsGone(uid){if(!uid)return 0;const live=v38Live(),drop=new Set();
 for(const j of (DB.jobs||[])){if(!j||v38JobDemo(j)||(j.cust!==uid&&j.hired!==uid))continue;if(!j.hired)continue;
  if(v38Gone(j.cust,live)&&v38Gone(j.hired,live))drop.add(j.id)}
 return v38Drop(drop)}
/* jobs whose parties were all deleted before v38 (the live jtcksnex shape: cust null or deleted, hired deleted) */
function v38JobOrphans(){const live=v38Live(),drop=new Set();
 for(const j of (DB.jobs||[])){if(!j||v38JobDemo(j)||!j.hired)continue;if(["hired","escrow"].includes(j.status))continue;
  if(v38Gone(j.cust,live)&&v38Gone(j.hired,live))drop.add(j.id)}
 return v38Drop(drop)}
