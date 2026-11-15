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
