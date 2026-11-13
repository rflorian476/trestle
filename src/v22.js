/* ===== v22 ===== */
/* Titles: the server now sends view-specific first-HTML titles for /p/<id>, /pro/<id>, /job/<id> and /compare/<id>.
   The app sets the same text after every render (v8Meta used to run once on a timer, which could fire before the
   first render, so /p/<id> fell back to "Pro profile · Sawyer — …" after mounting). */
function v22Title(){if(typeof document==="undefined"||typeof ROUTE==="undefined"||!ROUTE)return;const v=ROUTE.v,p=ROUTE.p;
 if(v==="job"||v==="compare"){const j=(DB.jobs||[]).find(x=>x.id===p);if(j&&j.title)document.title=(v==="compare"?"Compare bids: ":"")+String(j.title).slice(0,120)+" · Sawyer"}}
if(typeof document!=="undefined"&&typeof render==="function"){const or=render;render=function(){const r=or.apply(this,arguments);try{if(typeof v8Meta==="function")v8Meta();v22Title()}catch(e){}return r}}
