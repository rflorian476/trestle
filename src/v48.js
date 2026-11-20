/* ===================== v48 ===================== */
/* (1) QA v47 ideas 1-2. The traveling-electricians guide (VIEWS.traveling) now lives at /travel?tab=how: /traveling is a
   single 301 there (server.js), and the in-app links point at it directly, so a reload or a shared link opens the same
   page. Canonical stays /travel. */
{const ov=VIEWS.travel;VIEWS.travel=(p,q)=>q&&q.tab==="how"&&VIEWS.traveling?VIEWS.traveling(p,q):ov(p,q)}
{const oa=AFTER.travel;AFTER.travel=(p,q)=>{if(q&&q.tab==="how"){AFTER.traveling&&AFTER.traveling(p,q);return}oa&&oa(p,q)}}

/* (2) Customer links for invoices, estimates and change orders. Before v48, a bill for a customer without a Sawyer
   account said "Copy the link and text it", but /invoice/<id> only opens for the linked account, so the customer hit a
   dead end. Now each sent bill gets a private link, /i/<24-char random token> (made on the server with crypto, never
   chosen by the browser), that opens the bill without signing in: the same paper the app shows, the balance, the pro.
   Paying or approving takes a free account; the bill is then added to that account (claim48) and the pro is told.
   The link is noindex, no-store, no-referrer; the pro can turn it off by making a new one; void bills don't open; a
   copied bill (Duplicate, recurring) never inherits the link (tk48b must equal the bill's own id). The pro sees when
   the customer first opened it. Payments stay in test mode. */
const V2_ACTIONS48=["link48","claim48"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS48);
const V48TOK=/^[A-Za-z0-9_-]{24}$/;
function v48Ok(b){return !!(b&&typeof b.tk48==="string"&&V48TOK.test(b.tk48)&&b.tk48b===b.id)}
function v48Find(tok){tok=String(tok||"");if(!V48TOK.test(tok))return null;return(DB.bills||[]).find(b=>b&&b.tk48===tok&&b.tk48b===b.id&&b.status!=="draft")||null}
function v48Kind(b){return b.type==="inv"?"invoice":b.type==="est"?"estimate":"change order"}
function v48Name(b){return b.type==="inv"?(KINDNAME[b.kind]||"Invoice"):BILLNAME[b.type]||"Bill"}
function v48Set(b,tok){b.tk48=tok;b.tk48b=b.id;b.tk48at=Date.now()}
A.link48=function(id,reset,tok){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};const b=v7Bill(id);
 if(!b||b.by!==m.id||!BILLNAME[b.type])return{ok:false,msg:"Not found"};
 if(b.status==="draft")return{ok:false,msg:"Send it first, then share the customer link."};
 if(b.status==="void")return{ok:false,msg:"This one is void, so it has no customer link."};
 if(v48Ok(b)&&!reset)return{ok:true,tok:b.tk48,msg:"Customer link ready"};
 if(!V48TOK.test(String(tok||"")))return{ok:false,msg:"Couldn't make a link. Try again."};
 const had=v48Ok(b);v48Set(b,tok);save();return{ok:true,tok,msg:had?"New link made. The old link doesn't open this "+v48Kind(b)+" anymore.":"Customer link ready"}};
/* the server passes a fresh token as the 2nd argument; a bill for a customer without an account gets its link on send */
{const os=A.sendBill;A.sendBill=function(id,tok){const r=os.call(this,id);try{const m=me(),b=v7Bill(id);
 if(r&&r.ok&&m&&b&&b.by===m.id&&!b.cuid&&b.status!=="void"&&!v48Ok(b)&&V48TOK.test(String(tok||""))){v48Set(b,tok);save()}
 if(r&&r.ok&&b&&!b.cuid&&v48Ok(b))r.msg="Marked sent. Text or email "+b.cname+" the customer link";}catch(e){}return r}}
A.claim48=function(tok){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};const b=v48Find(tok);
 if(!b)return{ok:false,msg:"This link isn't active. Ask the pro to send it again."};
 if(b.by===m.id)return{ok:false,msg:"This is your own "+v48Kind(b)+". Your customer pays or approves it at this link."};
 if(m.demo)return{ok:false,msg:"Demo accounts are shared, so they can't hold a real "+v48Kind(b)+". Create your own free account."};
 if(b.status==="void")return{ok:false,msg:"This "+v48Kind(b)+" was voided."};
 if(b.cuid===m.id)return{ok:true,id:b.id,type:b.type,msg:"It's already in your account"};
 const c=v7Cust(b.cust);const other=b.cuid||(c&&c.by===b.by&&c.uid&&c.uid!==m.id?c.uid:null);
 if(other)return{ok:false,msg:"This "+v48Kind(b)+" is already in another Sawyer account. Ask "+b.bizName+" to resend it."};
 b.cuid=m.id;b.cl48=m.id;b.viewed=b.viewed||Date.now();if(c&&c.by===b.by&&!c.uid){c.uid=m.id;c.cl48=m.id}
 notify(b.by,`${nameOf(m)} added ${v48Kind(b)} ${b.no} to their Sawyer account${b.type==="inv"?" and can pay in the app":" and can approve it in the app"}`,"bill:"+b.id);
 save();return{ok:true,id:b.id,type:b.type,msg:BILLNAME[b.type]+" "+b.no+" is in your account now"}};
/* a claimed bill stays with the person who claimed it when the pro edits it (saveBill re-reads the customer record) */
{const os=A.saveBill;A.saveBill=function(o){const prev=o&&o.id?v7Bill(o.id):null;const keep=prev&&prev.cl48&&prev.cuid===prev.cl48?{cuid:prev.cuid,cust:prev.cust}:null;
 const r=os.apply(this,arguments);try{if(keep&&r&&r.ok){const b=v7Bill(r.id);if(b&&b.cust===keep.cust&&!b.cuid){b.cuid=keep.cuid;save()}}}catch(e){}return r}}
/* server only: the guest copy for GET /i/<token>. Marks the first customer view (and tells the pro once). */
function v48View(tok,viewer,bot){const b=v48Find(tok);if(!b)return null;
 if(viewer!==b.by&&!bot){const first=!b.viewed;const now=Date.now();if(first)b.viewed=now;if(first||!b.gv48||now-b.gv48>6e5){b.gv48=now;save()}
  if(first)notify(b.by,`${b.cname} opened ${v48Kind(b)} ${b.no} from your link`,"bill:"+b.id)}
 const o=JSON.parse(JSON.stringify(b));for(const k of ["tk48","tk48b","tk48at","cust","cuid","cl48","rec9","recFrom9","autoRem9","reminders","gv48","demo","lf45log"])delete o[k];
 o.lines=(o.lines||[]).map(l=>{if(l&&typeof l==="object"){delete l.l36;delete l.cost}return l});
 const nm=v48Name(b);
 return{tok,b:o,claimed:!!b.cuid,title:nm+" "+b.no+" from "+b.bizName,desc:"View "+(b.type==="inv"?"and pay ":"and approve ")+v48Kind(b)+" "+b.no+" from "+b.bizName+" on __BRAND__. No account needed to look; paying or approving takes a free account."}}

if(typeof document!=="undefined"){
 const G48=()=>window.__INV48||null;
 /* the tab keeps the bill's own title ("Invoice INV-1004 from …") after the app mounts, like the first HTML */
 {const ot=sawyerTitle;sawyerTitle=function(v,p,db){const g=G48();if(v==="i"&&g&&g.tok===p)return g.title+" · __BRAND__";return ot.apply(this,arguments)}}
 VIEWS.i=(tok,q)=>{const g=G48();if(!g||g.tok!==tok)return`<section class="page narrow">${empty("receipt","Opening the "+"link…","One moment.")}</section>`;
  const b=g.b,m=me(),own=!!(m&&m.id===b.by),c=billCalc(b),kind=v48Kind(b),pro=U(b.by),mine=!!(m&&(DB.bills||[]).some(x=>x.id===b.id&&x.cuid===m.id));
  const st=c.st,live=st!=="void";
  let box;
  if(b.type==="inv"){box=c.bal>0&&live?`<small class="muted">Balance due${b.due?" by "+fmtD(b.due):""}</small><b class="o7-big">${v7$(c.bal)}</b><button class="btn primary lg" id="i48Go">${I("lock",16)}${mine?"Open in my account":"Pay "+v7$(c.bal)}</button><p class="muted small i48-how">${own?"Your customer's button. It asks them for a free account, then they pay by card or bank.":m?"Adds this invoice to your "+"__BRAND__ account, then you pay by card or bank (test mode in the beta).":"Pay by card or bank (test mode in the beta). It takes a free account, about 30 seconds, and your receipt stays with your home's records."} __BRAND__ adds no fees to your bill.</p>`:`<span class="o7-paid">${I("check",22)}</span><b>${live?"Paid in full. Thank you!":"This invoice was voided"}</b>`}
  else{const can=b.status==="sent"||b.status==="viewed";box=can&&live?`<small class="muted">Your total</small><b class="o7-big">${v7$(c.total)}</b><button class="btn primary lg" id="i48Go">${I("check",16)}${mine?"Open in my account":"Review and approve"}</button><p class="muted small i48-how">${own?"Your customer's button. It asks them for a free account, then they pick options and approve.":"Pick any optional items and approve with a free account. Nothing is charged until "+esc(b.bizName)+" invoices you."}</p>`:`<b>${(V7ST[b.status]||[b.status])[0]}</b>`}
  const due=b.type==="inv"?(c.bal>0&&live?[`Balance due${b.due?" by "+fmtD(b.due):""}`,v7$(c.bal),mine?"Open":"Pay now"]:null):((b.status==="sent"||b.status==="viewed")&&live?["Your total",v7$(c.total),mine?"Open":"Review"]:null);
  const top=due?`<div class="i48-top"><div><small>${due[0]}</small><b>${due[1]}</b></div><button class="btn primary" data-i48go>${due[2]}</button></div>`:"";
  return`<section class="o7c i48"><div class="o7-wrap">${top}${own?`<p class="i48-own">${I("info",16)} This is what ${esc(b.cname)} sees at this link. <a href="${href("invoice",b.id)}">Back to ${esc(b.no)}</a></p>`:""}
  <div class="o7-docg"><div>${billDoc(b,false)}</div><aside class="o7-side"><div class="card o7-paybox">${box}</div>
  <div class="card"><div class="o7-pro">${avatar(pro||{id:b.by,name:b.bizName},"")}<div><b>${esc(b.bizName)}</b><small class="muted">Questions about this ${kind}?</small></div></div><div class="row wrapr">${pro&&pro.role==="contractor"?`<a class="btn sm" href="${href("pro",b.by)}">${I("user",14)}See their profile</a>`:""}<a class="btn sm" href="${href("msgs",b.by)}">${I("chat",14)}Message</a><button class="btn sm" data-print>${I("print",14)}Print / PDF</button></div></div>
  <p class="i48-trust muted small">${I("lock",14)} A private link from ${esc(b.bizName)}. Only people who have it can open this ${kind}, and search engines never list it.</p></aside></div></div></section>`};
 AFTER.i=(tok,q)=>{const g=G48();if(!g||g.tok!==tok){let k="i48r:"+tok;try{if(!sessionStorage.getItem(k)){sessionStorage.setItem(k,"1");location.replace("/i/"+encodeURIComponent(tok)+(location.search||""))}}catch(e){}return}
  try{document.title=g.title+" · __BRAND__"}catch(e){}
  document.querySelectorAll("[data-print]").forEach(x=>x.onclick=()=>window.print());
  const bt=document.getElementById("i48Go");if(!bt)return;const b=g.b;
  document.querySelectorAll("[data-i48go]").forEach(x=>x.onclick=()=>bt.click());
  bt.onclick=()=>{const m=me();if(m&&m.id===b.by){toast("This is your own "+v48Kind(b)+". Your customer uses this button.");return}
   if(m&&(DB.bills||[]).some(x=>x.id===b.id&&x.cuid===m.id)){go(b.type==="inv"&&billCalc(b).bal>0?"pay":"invoice",b.id);return}
   if(!m){try{sessionStorage.setItem("inv48",JSON.stringify({tok,at:Date.now()}))}catch(e){}go("signup",null,{next:"/i/"+tok});return}
   bt.disabled=true;v48Claim(tok,()=>{bt.disabled=false})};
  if(q&&q.add==="1"&&me())bt.click()};
 let v48Busy=false;
 function v48Claim(tok,done){if(v48Busy)return;v48Busy=true;try{sessionStorage.removeItem("inv48")}catch(e){}
  __when(A.claim48(tok),r=>{v48Busy=false;done&&done(r);if(r&&r.ok){toast(r.msg);const b=v7Bill(r.id);go(r.type==="inv"&&b&&billCalc(b).bal>0?"pay":"invoice",r.id)}else if(r&&r.msg)toast(r.msg,"err")})}
 /* after any sign-in path (code, password, passkey, Google/Apple...) the invoice the guest wanted to pay is added */
 {const os=SHELL;SHELL=function(){const r=os.apply(this,arguments);try{if(me()&&!v48Busy){const p=JSON.parse(sessionStorage.getItem("inv48")||"null");
  if(p&&p.tok){if(Date.now()-(+p.at||0)>36e5)sessionStorage.removeItem("inv48");else setTimeout(()=>v48Claim(p.tok),0)}}}catch(e){}return r}}
 /* the pro's side: the share card on a bill for a customer without an account */
 function v48Url(b){return location.origin+"/i/"+b.tk48}
 function v48Card(b){const kind=v48Kind(b),first=String(b.cname||"").split(/\s+/)[0]||"there";
  if(b.status==="draft")return`<b>${I("share",15)} Customer link</b><p class="muted small">${esc(b.cname)} has no __BRAND__ account yet. Send the ${kind} first, then text or email them a private link that opens without signing in.</p>`;
  if(b.status==="void")return`<b>${I("share",15)} Customer link off</b><p class="muted small">A void ${kind} doesn't open from its link.</p>`;
  if(!v48Ok(b))return`<b>${I("share",15)} Customer link</b><p class="muted small">${esc(b.cname)} has no __BRAND__ account yet. Get a private link that opens this ${kind} without signing in.</p><button class="btn sm primary" id="i48Make">${I("share",14)}Get customer link</button>`;
  const u=v48Url(b),c=billCalc(b),amt=b.type==="inv"?v7$(c.bal>0?c.bal:c.total):v7$(c.total);
  const msg=`Hi ${first}, here's ${kind} ${b.no} from ${b.bizName} for ${amt}${b.type==="inv"&&b.due&&c.bal>0?", due "+fmtD(b.due):""}: ${u}`;
  const em=(v7Cust(b.cust)||{}).email||"",ph=String((v7Cust(b.cust)||{}).phone||"").replace(/[^\d+]/g,"");
  return`<b>${I("share",15)} Customer link</b><p class="muted small">Opens this ${kind} without signing in. ${esc(b.cname)} pays or approves with a free account, and it moves into their account.</p>
  <div class="i48-link"><label class="sr-only" for="i48Url">Customer link</label><input id="i48Url" readonly value="${esc(u)}"><button class="btn sm" id="i48Copy">${I("copy",14)}Copy</button></div>
  <div class="row wrapr i48-send"><a class="btn sm" id="i48Sms" href="sms:${esc(ph)}?&body=${encodeURIComponent(msg)}">${I("chat",14)}Text it</a><a class="btn sm" id="i48Mail" href="mailto:${esc(encodeURIComponent(em).replace(/%40/g,"@"))}?subject=${encodeURIComponent(v48Name(b)+" "+b.no+" from "+b.bizName)}&body=${encodeURIComponent(msg)}">${I("mail",14)}Email it</a><a class="btn sm ghost" href="/i/${esc(b.tk48)}" target="_blank" rel="noopener noreferrer">${I("out",14)}Preview</a></div>
  <p class="muted small i48-seen">${b.viewed?I("check",13)+" Opened by "+esc(first)+" "+ago(b.viewed):"Not opened yet."} <button class="linkbtn" id="i48Reset">Turn off this link and make a new one</button></p>`}
 {const oa=AFTER.invoice;AFTER.invoice=function(id){const r=oa&&oa.apply(this,arguments);try{const m=me(),b=v7Bill(id);if(!m||!b||b.by!==m.id||b.cuid)return r;
  const old=document.getElementById("bCopy");const card=old&&old.closest(".o7-tip");if(!card)return r;card.classList.add("i48-card");card.innerHTML=v48Card(b);
  const $=s=>document.getElementById(s),R=()=>{const y=scrollY;render();scrollTo(0,y)};
  if($("i48Make"))$("i48Make").onclick=()=>act(A.link48(id,false),R);
  if($("i48Reset"))$("i48Reset").onclick=()=>{if(confirm("Turn off the current link? Anyone who has it, including "+b.cname+", won't be able to open this "+v48Kind(b)+" until you send the new one."))act(A.link48(id,true),R)};
  if($("i48Copy"))$("i48Copy").onclick=()=>{const u=$("i48Url").value;(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>toast("Link copied"),()=>{$("i48Url").select();toast("Press and hold to copy the link")})};
  if($("i48Url"))$("i48Url").onfocus=e=>e.target.select()}catch(e){}return r}}
}
