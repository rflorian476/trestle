/* ===== v34 ===== */
/* (1) QA SW-072: a project whose owner deleted their account is never shown as an open listing. The server already leaves
   it out of everyone's state except its crew, applicants and staff; the browse list skips it for them too, and its page
   says plainly that it was closed. */
function v34Gone(p){if(!p)return true;if(p.ownerGone34)return true;const u=p.pm&&U(p.pm);return !!(p.pm&&(!u||u.role==="deleted"))}
{const ov=VIEWS.projects;if(ov)VIEWS.projects=function(){const all=DB.projects;try{DB.projects=(all||[]).filter(p=>!v34Gone(p));return ov.apply(this,arguments)}finally{DB.projects=all}}}
{const ov=VIEWS.project;if(ov)VIEWS.project=function(id){let h=ov.apply(this,arguments);try{const p=PJ(id);if(!p||!v34Gone(p))return h;
  const note=`<p class="v34gone" role="note">${I("x",15)}<span>This project is closed. Its project manager deleted their Sawyer account, so it no longer takes applications.</span></p>`;
  h=h.split(">Hiring crew</b>").join(">Closed</b>").split("Hiring crew</span>").join("Closed</span>");
  const dol=" · "+I("dollar",14)+" ";h=h.split(dol+"</p>").join("</p>").split(dol+" · ").join(" · ");
  const k=h.indexOf("<h1");if(k>=0){const e=h.indexOf("</h1>",k);if(e>0)return h.slice(0,e+5)+note+h.slice(e+5)}return note+h}catch(e){}return h}}

/* (2) While the server's data isn't on a persistent disk (state.beta34.persistent === false, see lib/persist.js), sign-up,
   the pro sign-up wizard and Account carry one plain line so nobody trusts this beta with real work yet. It goes away by
   itself once a disk is attached (README: "Keep data between deploys"). */
const V34_BETA="This beta resets from time to time — don't store real jobs here yet.";
function v34Ephemeral(){return!!(typeof DB!=="undefined"&&DB&&DB.beta34&&DB.beta34.persistent===false)}
function v34Note(){return`<p class="v34beta" role="note" id="v34beta">${I("info",15)}<span>${esc(V34_BETA)}</span></p>`}
function v34After(h,anchor,from){const a=h.indexOf(from||anchor);if(a<0)return null;const k=from?h.indexOf(anchor,a):a;if(k<0)return null;return h.slice(0,k+anchor.length)+v34Note()+h.slice(k+anchor.length)}
{const ov=VIEWS.signup;if(ov)VIEWS.signup=function(){const h=ov.apply(this,arguments);try{if(!v34Ephemeral()||/id="v34beta"/.test(h))return h;return v34After(h,"</p>",'id="authBox"')||v34After(h,"</h1>")||h}catch(e){return h}}}
{const ov=VIEWS.join;if(ov)VIEWS.join=function(){const h=ov.apply(this,arguments);try{if(!v34Ephemeral()||/id="v34beta"/.test(h)||!/<h2>About you<\/h2>/.test(h))return h;return v34After(h,"</h2>",'id="obf"')||h}catch(e){return h}}}
{const ov=VIEWS.account;if(ov)VIEWS.account=function(){const h=ov.apply(this,arguments);try{if(!v34Ephemeral()||/id="v34beta"/.test(h))return h;return v34After(h,"</div>",'<div class="pagehead">')||h}catch(e){return h}}}
