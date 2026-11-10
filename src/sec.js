/* ===== hotfix-sec layer (QA sweep 1) ===== */
/* SW-003: no inline event handlers (the Content-Security-Policy blocks them). Buttons carry data-csp + data-arg instead. */
if(typeof document!=="undefined"&&document.addEventListener&&typeof window!=="undefined"&&!window.__secCsp){window.__secCsp=1;
 const CSP_FN={shareLink:a=>shareLink(a),contactPro:a=>contactPro(a),messagePro:a=>messagePro(a),toggleFav:(a,el)=>toggleFav(a,el),uShareApp:()=>uShareApp()};
 document.addEventListener("click",e=>{const b=e.target&&e.target.closest&&e.target.closest("[data-csp]");if(!b)return;const f=CSP_FN[b.dataset.csp];if(!f)return;e.preventDefault();try{f(b.dataset.arg,b)}catch(x){console.warn(x)}});
 document.addEventListener("submit",e=>{const f=e.target;if(!f||!f.matches||!f.matches("form[data-reply]"))return;e.preventDefault();act(A.reply(f.dataset.reply,(f.t&&f.t.value)||""))})}
/* SW-007: typed or shared pretty URLs (/prices, /find?cat=Roofing, /job/j12) open the same view as the #/ route */
if(typeof location!=="undefined"&&typeof history!=="undefined"&&typeof window!=="undefined"&&window.addEventListener){try{const pn=location.pathname;if(pn&&pn!=="/"&&pn!=="/index.html"&&!/^\/[pt]\/[\w-]+$/.test(pn)&&(!location.hash||location.hash.length<3)&&/^\/[a-z0-9]+(\/[\w.-]+)?\/?$/.test(pn))history.replaceState(null,"","/#"+pn.replace(/\/$/,"")+location.search)}catch(x){}}
/* SW-005: one light Linen & Navy theme. Anything saved from the old dark toggle is ignored. */
if(typeof document!=="undefined"&&document.documentElement){try{document.documentElement.dataset.theme="light";if(typeof DB==="object"&&DB)DB.theme="light"}catch(x){}}
/* SW-008: stock photos are never shown as a pro's own work. Profiles without the pro's own uploaded job photos get an
   honest "Job photos coming soon" state; cover and search-card photos stay purely decorative (empty alt, no captions). */
function secOwnPhotos(u){return (DB.jobs||[]).some(j=>j.hired===u.id&&(j.photos||[]).some(p=>/^\/u\//.test(String(p.src||""))))}
if(typeof VIEWS!=="undefined"&&VIEWS.pro){const ov=VIEWS.pro;VIEWS.pro=function(id){let h=ov.apply(this,arguments);try{const u=U(id);if(!u||u.role!=="contractor")return h;const m=me(),own=!!(m&&m.id===u.id);
 h=h.replace(/<div class="px-cover[^"]*">[\s\S]*?<div class="px-shade">/,x=>x.replace(/ alt="[^"]*"/g,' alt=""'));
 if(!secOwnPhotos(u))h=h.replace(/<div class="gallery g\d">[\s\S]*?<\/div>/,()=>`<div class="sec-soon"><span class="sec-si">${I("camera",22)}</span><div><b>${own?"Add photos of your work":"Job photos coming soon"}</b><small>${own?"Photos you add to a job you were hired for show here once the customer confirms it's done.":esc(u.biz||"This pro")+" hasn't added photos of their own jobs yet. Ask for pictures of similar work when you request a quote."}</small></div></div>`);
 }catch(e){}return h}}
if(typeof PROCARD==="function"){const oc=PROCARD;PROCARD=function(x){const h=oc.apply(this,arguments);try{return h.replace(/(<div class="pc-img">(?:<button[\s\S]*?<\/button>)?)(<img class="art v4art"[^>]*?) alt="[^"]*"/,'$1$2 alt=""')}catch(e){return h}}}
/* SW-030: messages need a real account and a real connection. Anyone may contact a business (public pro profile);
   everyone else only through a job, quote, project crew, traveler call, invoice, visit, case, reference, lodging listing
   or an existing conversation. Missing ids are refused, so no orphan threads (SW-031). */
if(typeof A!=="undefined")A.canMessage=function(to){const m=me(),u=U(to);if(!m||!u||u.id===m.id)return false;const a=m.id,b=u.id;
 if(u.role==="contractor")return true;
 if((DB.msgs||[]).some(x=>(x.a===a&&x.b===b)||(x.a===b&&x.b===a)))return true;
 if((u.sharedWith||[]).includes(a)||(m.sharedWith||[]).includes(b))return true;
 const job=(c,p)=>(DB.jobs||[]).some(j=>j.cust===c&&(j.hired===p||(j.interested||[]).includes(p)||(j.invited||[]).includes(p)||(DB.quotes||[]).some(q=>q.job===j.id&&q.cid===p)));if(job(a,b)||job(b,a))return true;
 if((DB.projects||[]).some(p=>{if(p.pm!==a&&p.pm!==b)return false;const o=p.pm===a?b:a;return(p.roles||[]).some(r=>(r.filled||[]).includes(o)||(r.done||[]).includes(o)||(r.apps||[]).some(x=>x.cid===o)||(r.invites||[]).some(x=>x.cid===o))}))return true;
 const tc=(by,o)=>(DB.tcalls||[]).some(c=>c.by===by&&((c.apps||[]).some(x=>x.uid===o)||(c.invites||[]).includes(o)));if(tc(a,b)||tc(b,a))return true;
 if(u.trav&&(m.role==="contractor"||m.role==="pm"))return true;
 if((DB.lodging||[]).some(l=>l.by===b))return true;
 const pair=(x,k1,k2)=>(x||[]).some(r=>(r[k1]===a&&r[k2]===b)||(r[k1]===b&&r[k2]===a));
 return pair(DB.bills,"by","cuid")||pair(DB.bcust,"by","uid")||pair(DB.visits,"by","cuid")||pair(DB.cases,"cu","pro")||pair(DB.refs,"trav","by")};
