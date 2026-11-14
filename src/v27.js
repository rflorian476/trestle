/* ===== v27 ===== */
/* (1) A signed-in pro never restarts signup. Opening /join (a bookmark, the "Join as a pro" link, an old email) takes a
   pro account straight to the dashboard's setup flow instead of a blank 6-step wizard; the server does the same with a
   302 for a full page load. The dashboard's guided flow covers the three things that win the first jobs, one step at a
   time: add 3 job photos, set a starting price, submit the Verified packet (license + certificate of insurance). */
function v27Steps(m){const g=(m.gal12||[]).length,mn=typeof v12Menu==="function"?v12Menu(m):{set:false},st=typeof v19Status==="function"?v19Status(m):"none";
 const vDone=st==="verified"||st==="pending",vNote=st==="verified"?"Verified by the Trust team.":st==="pending"?"In review. The Trust team usually answers within 2 business days.":st==="rejected"?"The Trust team asked for an update: "+String(m.verifyReject||"see the note on the Verified page")+".":st==="expired"?"Your license or insurance date has passed. Send the renewed one.":"Your license number, state, expiry and a photo of a current certificate of insurance.";
 return[
  {k:"photos",icon:"camera",t:"Add 3 job photos",done:g>=3,meta:Math.min(g,3)+" of 3 added",why:"Real photos of your own work are the first thing customers look at. Before/after shots work best.",cta:g?"Add more photos":"Add photos",act:"g12"},
  {k:"price",icon:"tag",t:"Set a starting price",done:!!mn.set,meta:mn.set?"Starting prices set":"Not set yet",why:"A \"from $X\" price on your main services builds trust and filters out jobs that don't fit.",cta:"Set starting prices",act:"m12"},
  {k:"verify",icon:"shield",t:"Submit the Verified packet",done:vDone,meta:st==="verified"?"Verified":st==="pending"?"Submitted, in review":"Not submitted",why:vNote,cta:st==="rejected"||st==="expired"?"Update packet":"Submit packet",act:"verify"}]}
function v27Guide(m,q){if(!m||m.role!=="contractor")return "";q=q||{};const s=v27Steps(m),d=s.filter(x=>x.done).length,cur=s.find(x=>!x.done),from=q.setup==="1";
 if(!cur&&!from)return "";
 const pct=Math.round(d/s.length*100);
 return`<section class="o7-wrap v27g-w"><div class="card v27g" id="v27guide" aria-labelledby="v27g-t">
 ${from?`<p class="v27g-note" role="status">${I("info",15)}<span>You already have a Sawyer pro account, so there's nothing to sign up for again. ${cur?"Here's what's left to finish your profile.":"Your profile setup is done."}</span></p>`:""}
 <div class="v27g-h"><div><span class="v24k">${I("sparkle",14)}Finish your profile</span><h2 id="v27g-t">${cur?`Step ${s.indexOf(cur)+1} of ${s.length}: ${esc(cur.t)}`:"All three steps are done"}</h2>
 <p class="muted">${cur?"Three steps that win first jobs. Each one takes a couple of minutes.":"Photos, a starting price and the Verified packet are in. Customers see a complete profile."}</p></div>
 <div class="v27g-p"><b>${d}/${s.length}</b><div class="v27g-m" role="progressbar" aria-label="Profile setup steps done" aria-valuemin="0" aria-valuemax="${s.length}" aria-valuenow="${d}"><i style="width:${pct}%"></i></div></div></div>
 <ol class="v27g-l">${s.map((x,i)=>{const on=x===cur;return`<li class="v27g-s ${x.done?"done":""} ${on?"on":""}" data-step="${x.k}" ${on?'aria-current="step"':""}><span class="v27g-n">${x.done?I("check",15):i+1}</span><div class="v27g-b"><b>${esc(x.t)}</b><small>${esc(x.meta)}</small>${on?`<p>${esc(x.why)}</p>`:""}</div>
  <div class="v27g-a">${x.act==="verify"?`<a class="btn sm ${on?"primary":""}" href="${href("verify")}" data-v27g="verify">${esc(x.done?"View":x.cta)}</a>`:`<button type="button" class="btn sm ${on?"primary":""}" data-v27g="${x.act}">${esc(x.done?(x.k==="photos"?"Edit photos":"Edit prices"):x.cta)}</button>`}</div></li>`}).join("")}</ol></div></section>`}
{const ov=VIEWS.dash;VIEWS.dash=function(p,q){let h=ov.apply(this,arguments);try{const m=me();if(!m||m.role!=="contractor"||m.staff)return h;const g=v27Guide(m,q);if(!g)return h;
  const k=h.indexOf('<div class="v13-dtop">');if(k>=0){const at=k+'<div class="v13-dtop">'.length;return h.slice(0,at)+g+h.slice(at)}
  const e=h.indexOf("</header>");return e<0?g+h:h.slice(0,e+9)+g+h.slice(e+9)}catch(e){return h}}}
{const oa=AFTER.dash;AFTER.dash=function(p,q){const r=oa&&oa.apply(this,arguments);try{document.querySelectorAll("[data-v27g]").forEach(b=>{if(b.dataset.v27g==="g12")b.onclick=()=>g12Modal();else if(b.dataset.v27g==="m12")b.onclick=()=>m12Modal()});
  if(q&&q.setup==="1"&&!window.__v27gs){window.__v27gs=1;const c=document.getElementById("v27guide");if(c)setTimeout(()=>{c.scrollIntoView({block:"start",behavior:"instant"});const f=c.querySelector(".v27g-s.on [data-v27g]")||c.querySelector("h2");if(f)f.focus({preventScroll:true})},60)}}catch(e){}return r}}
// /join for a signed-in pro: the dashboard setup flow, not a second signup
{const ov=VIEWS.join;if(ov)VIEWS.join=function(){const m=me();if(m&&m.role==="contractor")return VIEWS.dash(null,{setup:"1"});return ov.apply(this,arguments)}}
{const oa=AFTER.join;AFTER.join=function(){const m=me();if(m&&m.role==="contractor"){window.__v27gs=0;nav(href("dash",null,{setup:"1"}),true);return}return oa&&oa.apply(this,arguments)}}
