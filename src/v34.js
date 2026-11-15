/* ===== v34 ===== */
/* (1) QA SW-072: a project whose owner deleted their account is never shown as an open listing. The server already leaves
   it out of everyone's state except its crew, applicants and staff; the browse list skips it for them too, and its page
   says plainly that it was closed. */
function v34Gone(p){if(!p)return true;if(p.ownerGone34)return true;if(!p.pm)return !p.demo;const u=U(p.pm);return !u||u.role==="deleted"}
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

/* (3) "Export my data" on the delete screen. Before typing DELETE, people can take a copy: one ZIP built on the device
   with the full JSON export (GET /api/account/export, the same privacy-filtered copy as Account -> Your data), readable
   spreadsheets of their jobs, quotes, messages and reviews, and, for anyone with Office records, the same CSV files as
   Office -> Reports -> "Back up everything". CSV cells go through csvCell (formula-safe), the ZIP through v31Zip. */
const v34D=t=>{const n=+t;return n?new Date(n).toISOString().slice(0,10):String(t||"")};
function v34Files(ex,m){const bom="\ufeff",C=rows=>bom+v7CSV(rows),me_=ex.account&&ex.account.id,files=[],counts=[];
 const nm=id=>{if(!id)return"";if(id===me_)return"You";const u=typeof U==="function"&&U(id);return u?(u.biz||nameOf(u)):id};
 const add=(file,label,head,list,row)=>{const L=Array.isArray(list)?list:[];files.push([file,C([head,...L.map(row)])]);counts.push([label,L.length])};
 add("jobs.csv","jobs",["Job","Title","Trade","Status","Posted","Customer","Hired pro","Budget"],ex.jobs,j=>[j.id,j.title,j.cat,j.status,v34D(j.date||j.created),nm(j.cust),nm(j.hired),j.budget]);
 add("quotes.csv","quotes",["Job","Pro","Price","Status","Sent","Note"],ex.quotes,q=>[q.job,nm(q.cid),q.price!=null?v31f(q.price):"",q.status,v34D(q.date),q.note]);
 add("messages.csv","messages",["Date","From","To","Message"],ex.msgs,x=>[v34D(x.date),nm(x.from),nm(x.from===x.a?x.b:x.a),x.text]);
 add("reviews.csv","reviews",["Date","Stars","Pro","Written by","Review","Reply"],ex.reviews,r=>[v34D(r.date),r.stars,nm(r.cid),nm(r.uid),r.text,r.reply]);
 let office=0;try{if(m&&typeof v31Backup==="function"){const b=v31Backup(m);office=b.counts.reduce((a,x)=>a+x[1],0);if(office)b.files.forEach(([n,t])=>files.push(["office/"+n,t]))}}catch(e){}
 const day=new Date().toISOString().slice(0,10);
 files.unshift(["sawyer-data.json",JSON.stringify(ex,null,2)],["README.txt",`Your Sawyer data, ${day}\r\n\r\nsawyer-data.json is the complete copy (profile, account, jobs, quotes, messages, reviews, invoices, alerts and photo links).\r\nThe .csv files open in Excel, Google Sheets or Numbers:\r\n${counts.map(([k,n])=>n+" "+k).join("\r\n")}${office?`\r\noffice/ has your Office records (${office}): customers, invoices, payments, expenses, mileage, timesheets, licenses and the P&L.`:""}\r\n\r\nPasswords, sign-in keys and session tokens are never included. Photos stay on Sawyer; the JSON lists their links.\r\nText that starts with = + - or @ is saved with a leading ' so a spreadsheet won't run it as a formula.\r\n`]);
 return{files,name:"sawyer-data-"+day+".zip"}}
async function v34Export(btn){if(btn){if(btn.__busy)return;btn.__busy=1;btn.disabled=true;btn.setAttribute("aria-busy","true")}
 const done=()=>{if(btn){btn.__busy=0;btn.disabled=false;btn.removeAttribute("aria-busy")}};
 try{const r=await fetch("/api/account/export",{credentials:"same-origin",headers:{Accept:"application/json"}});const ex=await r.json().catch(()=>({}));
  if(!r.ok||!ex||!ex.account){done();toast((ex&&ex.error)||"Couldn't build your export. Try again.","err");return null}
  const b=v34Files(ex,me()),blob=new Blob([v31Zip(b.files)],{type:"application/zip"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=b.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800);
  done();toast("Your data is downloading: "+b.files.length+" files");const s=document.getElementById("v34exs");if(s)s.textContent="Downloaded "+b.name+".";return b}catch(e){done();toast("Couldn't build your export. Try again.","err");return null}}
function v34ExBlock(){return`<div class="v34ex" id="v34ex"><div class="v34ex-t"><b>${I("download",16)} Take a copy first</b><p class="muted small">One ZIP with everything tied to your account: profile, jobs, quotes, messages, reviews${(()=>{try{const m=me();return m&&v7Mine("bills",m).length+v7Mine("ledger",m).length+v7Mine("bcust",m).length?" and your Office records":""}catch(e){return""}})()}. Passwords are never included.</p></div>
 <div class="v34ex-b"><button type="button" class="btn" id="v34zip">${I("download",15)}Export my data (ZIP)</button><a class="linkbtn" id="v34json" href="/api/account/export" download>JSON only</a></div><p class="muted small v34ex-s" id="v34exs" role="status"></p></div>`}
if(typeof document!=="undefined"){const oa=AFTER.account;AFTER.account=function(){const r=oa&&oa.apply(this,arguments);try{const g=document.getElementById("delGo");if(!g||g.__v34)return r;g.__v34=1;const o=g.onclick;
  g.onclick=function(){const x=o&&o.apply(this,arguments);try{const m=me()||{};const box=document.querySelector("#modal .mbox")||document.getElementById("modal");if(m.demo||!box||document.getElementById("v34ex"))return x;
   const f=document.getElementById("delTxt");const at=f&&f.closest(".fld");if(at)at.insertAdjacentHTML("beforebegin",v34ExBlock());else box.insertAdjacentHTML("beforeend",v34ExBlock());
   const z=document.getElementById("v34zip");if(z)z.onclick=()=>v34Export(z)}catch(e){}return x}}catch(e){}return r}}
