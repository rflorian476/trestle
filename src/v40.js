/* ===== v40 ===== */
/* (1) Honest fallbacks (follows SW-095). Where a sign-in route is unavailable, Sawyer names only what this server can complete
   right now, from the same facts as GET /api/auth/methods (window.__AUTHM): a code only once email or text delivery is ready,
   a password and a passkey, and a linked account only if a provider is live. The server's OAuth / demo 404 pages do the same
   (lib/auth.js altWays). In local test mode, or once codes are delivered, the copy stays "Use email or a password". */
function v40Ways(noPk,M){try{M=M||(typeof authMethods==="function"?authMethods():null)}catch(e){M=null}M=M||{};const r=M.ready||{},w=[];
 if(r.email&&r.sms)w.push("a sign-in code by email or text");else if(r.email)w.push("an email sign-in code");else if(r.sms)w.push("a text sign-in code");
 w.push("your password");if(!noPk)w.push("a passkey");if(M.oauth&&Object.keys(M.oauth).some(k=>M.oauth[k]==="live"))w.push("a linked account");
 return w.length>1?w.slice(0,-1).join(", ")+" or "+w[w.length-1]:w[0]}
function v40PkCopy(t){t=String(t||"");try{if(typeof v39CodesReady!=="function"||v39CodesReady())return t;const ways=v40Ways(true);
  return t.replace(/keep using email or a password/g,()=>"keep using "+ways).replace(/Use email or a password/g,()=>"Use "+ways).replace(/use email or a password/g,()=>"use "+ways)}catch(e){return t}}
if(typeof pkFriendly==="function"){const of=pkFriendly;pkFriendly=function(){return v40PkCopy(of.apply(this,arguments))}}

/* (2) Edit a 1099 payment or credit in place (Tax records, The Office → Reports). Each sub in "Subs to 1099" has
   "Edit entries": a small sheet lists that sub's payments and credits / refunds for the year, and Edit opens the entry with
   amount, date and note. Same rules as logging a credit (v39): integer cents (c39), the date stays in the entry's own
   calendar year (move it to another year by deleting it and logging it again), and the sub's total for the year can't go
   below $0.00 after credits, whether a credit grows or a payment shrinks. The sub's name isn't edited here (it's how
   payments group), so the 1099 worksheet CSV stays formula-safe through csvCell. Pro-private like every ledger row;
   server-allowlisted (editLedger40). */
const V2_ACTIONS40=["editLedger40"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS40);
function v40DayOk(d){d=v7Date(d);if(!d)return null;const t=new Date(d+"T12:00:00Z");return!isNaN(t)&&t.toISOString().slice(0,10)===d?d:null}
function v40IsCredit(l){return!!(l&&(l.credit39||v39LC(l)<0))}
function v40SubEntries(m,key,y){const tz=v38TaxTz(m);return v7Mine("ledger",m).filter(l=>l&&l.kind==="exp"&&l.cat==="Subcontractor"&&v38Key(l.vendor)===key&&v38PayYear(l.date,tz)===String(y)).sort((a,b)=>String(a.date).localeCompare(String(b.date))||((a.dt||0)-(b.dt||0)))}
function v40Cap(m,l,cents){const tz=v38TaxTz(m),y=v38PayYear(l.date,tz),key=v38Key(l.vendor),total=v39SubTotal(m,key,y),old=v39LC(l),cr=v40IsCredit(l),nw=cr?-cents:cents;
 return{y,key,total,old,cr,nw,after:total-old+nw,room:total-old}}
A.editLedger40=function(id,o){o=o||{};const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};if(typeof v7Pro==="function"&&!v7Pro(m))return{ok:false,msg:"Tax records are for pros."};
 const l=(DB.ledger||[]).find(x=>x&&x.id===String(id||"")&&x.by===m.id);if(!l||l.kind!=="exp")return{ok:false,msg:"Not found"};
 if(l.cat!=="Subcontractor")return{ok:false,msg:"Only subcontractor payments and credits are edited in Tax records. Edit other receipts in Expenses & mileage."};
 const cr=v40IsCredit(l),c=v39Cents(o.amt);if(!c||c<1||c>1e8)return{ok:false,field:"amt",msg:cr?"Enter the credit amount, like 150.00.":"Enter the payment amount, like 1200.00."};
 const tz=v38TaxTz(m),y=v38PayYear(l.date,tz),date=o.date==null||o.date===""?String(l.date):v40DayOk(o.date);
 if(!date)return{ok:false,field:"date",msg:"Pick a real date."};if(date.slice(0,4)!==y)return{ok:false,field:"date",msg:`Keep the date in ${y}. To move it to another year, delete it and log it again in that year.`};
 const k=v40Cap(m,l,c),name=String(l.vendor||"").trim()||"this sub";
 if(k.after<0){if(cr)return{ok:false,field:"amt",max:k.room,msg:`That's more than the ${v39$c(k.room)} paid to ${name} in ${y}. A credit can bring the total down to $0.00, not below.`};
  return{ok:false,field:"amt",min:k.old-k.total,msg:`Credits to ${name} in ${y} add up to more than that. The payment has to be at least ${v39$c(k.old-k.total)}, or lower a credit first: the ${y} total can't go below $0.00.`}}
 l.c39=k.nw;l.amt=k.nw/100;l.date=date;if(o.note!=null)l.note=v7S(o.note,200);l.edited40=Date.now();save();
 return{ok:true,id:l.id,msg:`${cr?"Credit":"Payment"} saved. ${name}'s ${y} total: ${v39$c(k.after)}.`}};
if(typeof document!=="undefined"){
 {const ot=v38TaxCard;v38TaxCard=function(m,y){let h=ot.apply(this,arguments);try{
   h=h.replace(/(<button type="button" class="linkbtn v39cr" data-v39cr="([^"]*)" data-v39n="([^"]*)" data-v39y="([^"]*)"[^>]*>Credit \/ refund<\/button>)/g,(x,b,k,n,yy)=>`${b}<button type="button" class="linkbtn v40ent" data-v40ent="${k}" data-v40n="${n}" data-v40y="${yy}" aria-label="Edit ${n}'s ${yy} payments and credits">Edit entries</button>`)}catch(e){console.warn(e)}return h}}
 const v40Re=()=>{const yy=scrollY;render();scrollTo(0,yy)};
 /* the sheets swap in place; Escape / Close / Done go back to this sub's "Edit entries" button (looked up when the sheet closes, since saving re-renders the card) */
 const v40Back=key=>{try{const f=()=>{const b=[...document.querySelectorAll("[data-v40ent]")].find(x=>x.dataset.v40ent===key);if(b)b.focus()};
  /* a background sync can re-render the card right after the sheet closes: focus again if it fell back to <body> */
  modalReturn={focus(){f();for(const ms of [120,400])setTimeout(()=>{const a=document.activeElement;if((!a||a===document.body)&&document.getElementById("modal").hidden!==false)f()},ms)}}}catch(e){}};
 function v40EntList(key,name,y,focusId){const m=me();if(!m)return;const L=v40SubEntries(m,key,y),tot=v39SubTotal(m,key,y);
  modal(`<div class="v40ent-s"><h2 id="mtitle">${I("doc",20)} ${esc(name)} · ${esc(String(y))}</h2><p class="muted small">Payments and credits / refunds in ${esc(String(y))}. Total after credits: <b>${v39$c(Math.max(0,tot))}</b>.</p>
   <ul class="v40el">${L.map(l=>{const cr=v40IsCredit(l),c=Math.abs(v39LC(l)),what=cr?"Credit / refund":"Payment";return`<li><span class="v40el-d">${esc(v38Fd(l.date))}</span><span class="v40el-m"><b class="${cr?"v40cr":""}">${cr?"−":""}${esc(v39$c(c))}</b><small class="muted">${what}${l.note?" · "+esc(l.note):""}${l.edited40?" · edited":""}</small></span><button type="button" class="btn sm" data-v40ed="${esc(l.id)}" aria-label="Edit ${what.toLowerCase()} of ${esc(v39$c(c))} on ${esc(v38Fd(l.date))}">Edit</button></li>`}).join("")}</ul>
   <div class="actions"><button type="button" class="btn primary" data-close>Done</button></div></div>`,"v33sheet");
  v40Back(key);
  document.querySelectorAll("#modal [data-v40ed]").forEach(b=>b.onclick=()=>v40EditForm(b.dataset.v40ed,key,name,y));
  setTimeout(()=>{const f=focusId&&document.querySelector(`#modal [data-v40ed="${CSS.escape(focusId)}"]`)||document.querySelector("#modal [data-v40ed]");if(f)f.focus()},40)}
 function v40EditForm(id,key,name,y){const m=me(),l=m&&(DB.ledger||[]).find(x=>x&&x.id===id&&x.by===m.id);if(!l)return;const cr=v40IsCredit(l),c=Math.abs(v39LC(l)),k=v40Cap(m,l,c);
  modal(`<form id="v40lf" class="v39crf" novalidate><h2 id="mtitle">${I("edit",20)} Edit ${cr?"credit / refund":"payment"} · ${esc(name)}</h2>
   <p class="muted small">${cr?`A credit lowers ${esc(name)}'s ${esc(String(y))} total, down to $0.00 at most. Paid before this credit: <b>${v39$c(k.room)}</b>.`:`Paid to ${esc(name)} in ${esc(String(y))}, after credits: <b>${v39$c(Math.max(0,k.total))}</b>.${k.total-k.old<0?` Credits mean this payment can't go under <b>${v39$c(k.old-k.total)}</b>.`:""}`} The date stays in ${esc(String(y))}.</p>
   <div class="row2"><div class="fld"><label for="v40la">Amount</label><input id="v40la" inputmode="decimal" required autocomplete="off" value="${(c/100).toFixed(2)}" aria-describedby="v40lE"></div><div class="fld"><label for="v40ld">Date</label><input id="v40ld" type="date" value="${esc(String(l.date))}" min="${esc(String(y))}-01-01" max="${esc(String(y))}-12-31" aria-describedby="v40lE"></div></div>
   <div class="fld"><label for="v40ln">Note (optional)</label><input id="v40ln" maxlength="200" value="${esc(l.note||"")}"></div><p class="v39ze" id="v40lE" role="alert" hidden></p>
   <div class="actions"><button type="button" class="btn ghost" id="v40lBack">Back</button><button class="btn primary">Save</button></div></form>`,"v33sheet");
  v40Back(key);
  const $=s=>document.getElementById(s),E=$("v40lE"),say=(t,f)=>{E.textContent=t||"";E.hidden=!t;["v40la","v40ld"].forEach(x=>{if(t&&x===f)$(x).setAttribute("aria-invalid","true");else $(x).removeAttribute("aria-invalid")})};
  ["v40la","v40ld","v40ln"].forEach(x=>{$(x).addEventListener("input",()=>say(""));$(x).addEventListener("change",()=>say(""))});
  $("v40lBack").onclick=()=>v40EntList(key,name,y,id);setTimeout(()=>{const a=$("v40la");if(a){a.focus();a.select()}},40);
  $("v40lf").onsubmit=e=>{e.preventDefault();const cc=v39Cents($("v40la").value);if(!cc){say(cr?"Enter the credit amount, like 150.00.":"Enter the payment amount, like 1200.00.","v40la");$("v40la").focus();return}
   const d=$("v40ld").value;if(d&&String(d).slice(0,4)!==String(y)){say(`Keep the date in ${y}. To move it to another year, delete it and log it again in that year.`,"v40ld");$("v40ld").focus();return}
   const kk=v40Cap(m,l,cc);if(kk.after<0){say(cr?`That's more than the ${v39$c(kk.room)} paid to ${name} in ${y}. A credit can bring the total down to $0.00, not below.`:`Credits to ${name} in ${y} add up to more than that. The payment has to be at least ${v39$c(kk.old-kk.total)}, or lower a credit first: the ${y} total can't go below $0.00.`,"v40la");$("v40la").focus();return}
   __when(A.editLedger40(id,{amt:(cc/100).toFixed(2),date:d,note:$("v40ln").value}),r=>{if(r&&r.ok===false){say(r.msg||"That didn't save.",r.field==="date"?"v40ld":"v40la");return}
   act(r,()=>{v40Re();v40EntList(key,name,y,id)})})}}
 {const oa=AFTER.office;AFTER.office=function(tab){const r=oa&&oa.apply(this,arguments);try{if(tab==="reports")document.querySelectorAll("[data-v40ent]").forEach(b=>b.onclick=()=>v40EntList(b.dataset.v40ent,b.dataset.v40n,b.dataset.v40y))}catch(e){}return r}}
}

/* (3) Prerendered sign-in handoff. Signed-out /signup (v40) and /myhome (v38) arrive prerendered (#pre11), so a visitor can
   open "Sign in or join with a password", pick a role or start typing before the app mounts. When the app's first render
   replaces the prerendered card, what they did carries over: open/closed sections, typed values, the chosen role and the
   focused field (with its caret), instead of snapping back to the defaults. */
if(typeof document!=="undefined"&&typeof render==="function"){const or=render;render=function(){const pre=document.getElementById("pre11"),box=pre&&pre.querySelector("#authBox");
  if(!box)return or.apply(this,arguments);let st=null;
  try{const ds=[...pre.querySelectorAll("details[id]")].map(d=>[d.id,d.open]),ins=[...pre.querySelectorAll("input[id],select[id],textarea[id]")].filter(i=>i.type!=="file"&&i.type!=="hidden").map(i=>[i.id,i.type==="radio"||i.type==="checkbox"?null:i.value,i.checked,i.type==="radio"||i.type==="checkbox"?i.checked!==i.defaultChecked:i.value!==i.defaultValue]);
   const ae=document.activeElement,fo=ae&&pre.contains(ae)&&ae.id?ae.id:null;let sel=null;try{if(fo&&typeof ae.selectionStart==="number")sel=[ae.selectionStart,ae.selectionEnd]}catch(e){}const rs=[...pre.querySelectorAll("input[type=radio][name]")].filter(i=>i.checked&&!i.defaultChecked).map(i=>[i.name,i.value]);st={ds,ins,rs,fo,sel}}catch(e){}
  const r=or.apply(this,arguments);
  if(st)try{for(const [id,open] of st.ds){const d=document.getElementById(id);if(d&&d.tagName==="DETAILS"&&d.open!==open)d.open=open}
   for(const [id,v,ck,changed] of st.ins){if(!changed)continue;const i=document.getElementById(id);if(!i)continue;if(i.type==="radio"||i.type==="checkbox"){if(i.checked!==ck){i.checked=ck;i.dispatchEvent(new Event("change",{bubbles:true}))}}else if(i.value!==v){i.value=v;i.dispatchEvent(new Event("input",{bubbles:true}))}}
   for(const [n,v] of st.rs){const i=[...document.querySelectorAll("input[type=radio]")].find(x=>x.name===n&&x.value===v);if(i&&!i.checked){i.checked=true;i.dispatchEvent(new Event("change",{bubbles:true}))}}
   if(st.fo){const f=document.getElementById(st.fo);if(f){f.focus({preventScroll:true});if(st.sel)try{f.setSelectionRange(st.sel[0],st.sel[1])}catch(e){}}}}catch(e){}
  return r}}
