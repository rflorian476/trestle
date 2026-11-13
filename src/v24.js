/* ===== v24 ===== */
/* (1) Public job pages work for both sides. A signed-out visitor who lands on /job/<id> (a shared link, the job board)
   sees what a pro gets (no lead fee to quote, at most 3 pros per request, contact details private) and what a homeowner
   gets (the typical local price for this kind of job, post a similar job free). A full or closed request no longer says
   "Sign in to quote": it points to open jobs in the same trade instead. Only public job facts are used (trade, town,
   status, lead slots), so the server prerender stays public-data only. */
function v24JobPanel(j,m){const cat=j.cat||"",town=String(townOf(j.zip||"")||""),s=typeof leadSlots==="function"?leadSlots(j):{n:0,cap:3};
 const open=j.status==="posted"&&s.n<s.cap,rg=typeof v14Range==="function"?v14Range(j):null;
 const pics=typeof v19ExList==="function"?v19ExList(cat):[];const pic=pics[0]||"/img/home-ext.webp";
 const left=Math.max(0,s.cap-s.n),catQ=cat&&typeof CATS!=="undefined"&&CATS[cat]?{cat}:{};
 const pro=!m?`<div class="v24c"><span class="v24k">${I("wrench",14)}For pros</span><h2>${open?"Quote this job without a lead fee":"This one's taken. Others are open."}</h2>
  <ul class="v24l"><li>${I("check",14)}<span>No lead fees. One flat $20/mo. Founding pros get their first 3 months free.</span></li><li>${I("check",14)}<span>Every request goes to at most ${s.cap} pros${open?`. ${left} spot${left===1?"":"s"} left on this one`:""}.</span></li><li>${I("check",14)}<span>The customer's phone and email stay private until they reply.</span></li></ul>
  <div class="v24a">${open?`<a class="btn primary" href="${href("signup",null,{next:"/job/"+j.id})}">Sign in to send a quote</a>`:`<a class="btn primary" href="${href("jobs",null,catQ)}">See open ${esc(cat||"")} jobs</a>`}<a class="btn" href="${href("pros")}">How it works for pros</a></div></div>`:"";
 const home=(!m||m.role==="customer")&&m?.id!==j.cust?`<div class="v24c v24h"><img class="v24-ph" src="${pic}" alt="Example of ${esc(cat||"home")} work" loading="lazy" decoding="async" width="800" height="533"><span class="v24k">${I("home",14)}For homeowners</span><h2>Need this done too?</h2>
  ${rg?`<p class="v24r"><b>${money(rg.low)} – ${money(rg.high)}</b><small>Typical for this kind of job near ${esc(town||"you")}. A guide, not a quote.</small></p>`:""}
  <p class="muted">Post it free. At most ${s.cap} local pros see it, they quote up front, and your number is never handed out.</p>
  <div class="v24a"><a class="btn primary" href="${href("post",null,Object.assign({},catQ,j.sub?{sub:j.sub}:{}))}">Post a similar job</a><a class="btn" href="${href("prices")}">See the price guide</a></div></div>`:"";
 if(!pro&&!home)return "";return `<div class="v24pub">${pro}${home}</div>`}
{const oj=VIEWS.job;VIEWS.job=function(id,q){let h=oj.apply(this,arguments);try{const j=(DB.jobs||[]).find(x=>x.id===id),m=me();if(!j)return h;
  if(m&&(m.id===j.cust||m.role!=="customer"))return h;
  const s=typeof leadSlots==="function"?leadSlots(j):{n:0,cap:3};const open=j.status==="posted"&&s.n<s.cap;
  // signed out: the panel carries the call to action, so the bare "Sign in to quote or respond" button goes (on a full request it
  // also contradicted the "This request is full" note right above it)
  if(!m)h=h.replace(/<div class="actions"><a class="btn primary" href="[^"]*">Sign in to quote or respond<\/a><\/div>/,"");
  const panel=v24JobPanel(j,m);if(!panel)return h;const k=h.lastIndexOf("</section>");return k<0?h+panel:h.slice(0,k)+panel+h.slice(k)}catch(e){return h}}}
/* (2) Reply times are measured, not self-reported. When Sawyer has measured a pro's first replies (messages, invited
   quotes, crew invites), the profile's "typical reply" stat and the "Usually replies …" lines show that median.
   A pro with no measured replies yet keeps the time they gave at signup. */
{const ov=VIEWS.pro;VIEWS.pro=function(id){let h=ov.apply(this,arguments);try{const u=U(id);if(!u||u.role!=="contractor"||typeof respStats!=="function")return h;
  const r=respStats(u.id);if(!r||!(r.n>=2)||r.med==null)return h;const t=mins(r.med);
  h=h.replace(/<div><b>[^<]*<\/b><small>typical reply<\/small><\/div>/,()=>`<div><b>${esc(t)}</b><small>median reply</small></div>`);
  h=h.replace(/Usually replies (within an hour|within \d+ hours|same day|within a day)/g,()=>"Usually replies in "+t);
 }catch(e){}return h}}
