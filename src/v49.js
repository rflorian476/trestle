/* ===================== v49 ===================== */
/* (1) QA v48 idea 3: a void bill's customer link still opens it (marked void, no Pay or Approve) for anyone who has it.
   The pro's card says so (src/v48.js) and off49 turns the link off without making a new one, so the bill stops opening
   from it. Owner only; works for any status; a void bill still can't get a new link (link48). */
const V2_ACTIONS49=["off49"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS49);
A.off49=function(id){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};const b=v7Bill(id);
 if(!b||b.by!==m.id||!BILLNAME[b.type])return{ok:false,msg:"Not found"};
 if(!v48Ok(b))return{ok:true,msg:"This link is already off"};
 delete b.tk48;delete b.tk48b;delete b.tk48at;save();return{ok:true,msg:"Link turned off. It doesn't open this "+v48Kind(b)+" anymore."}};

/* (2) Reminders that reach customers without an account. Before v49, Send reminder on an invoice for a customer with no
   __BRAND__ account said "Reminder sent", but the in-app nudge had nobody to go to. Now that every such invoice has a
   customer link (v48), the Customer link card has a Payment reminder with Text reminder / Email reminder: the pro's own
   messages or mail app opens with a short, friendly note, the balance, the due date and the link (nothing is sent by
   __BRAND__). Tapping one logs the reminder on the invoice's timeline. remindBill without a channel is refused for these
   customers with an honest message, and the auto-reminder sweep tells the pro instead of logging a nudge nobody got. */
{const or=A.remindBill;A.remindBill=function(id,via){const m=me(),b=v7Bill(id);
 if(m&&b&&b.by===m.id&&b.type==="inv"&&!b.cuid&&b.status!=="draft"&&b.status!=="void"&&billCalc(b).bal>0){
  if(via!=="sms"&&via!=="email")return{ok:false,msg:b.cname+" has no __BRAND__ account, so __BRAND__ can't deliver a reminder. Open "+b.no+" and text or email one from the Customer link card."};
  if(!v48Ok(b))return{ok:false,msg:"Get the customer link on "+b.no+" first, then text or email the reminder."};
  const app=via==="sms"?"messages":"email",last=(b.reminders||[]).slice(-1)[0];
  if(last&&Date.now()-last<20*36e5)return{ok:true,msg:"Reminder ready in your "+app+" app. One is already logged today."};
  const r=or.call(this,id);if(r&&r.ok)r.msg="Reminder logged. Send it from your "+app+" app.";return r}
 return or.apply(this,arguments)}}
function v49Rem(b,u,first){if(b.type!=="inv"||b.status==="draft"||b.status==="void")return"";const c=billCalc(b);if(c.bal<=0)return"";
 const late=!!b.due&&v7DaysTo(b.due)<0,last=(b.reminders||[]).slice(-1)[0],cu=v7Cust(b.cust)||{},ph=String(cu.phone||"").replace(/[^\d+]/g,""),em=cu.email||"";
 const msg=`Hi ${first}, a friendly reminder from ${b.bizName}: invoice ${b.no} has ${v7$(c.bal)} due${b.due?(late?" (it was due "+fmtD(b.due)+")":" by "+fmtD(b.due)):""}. You can see it and pay here: ${u}`;
 return`<div class="i49-rem" id="i49Rem"><b>${I("bell",14)} ${late?"Overdue: send a reminder":"Payment reminder"}</b><p class="muted small">${esc(first)} has no __BRAND__ account, so __BRAND__ can't deliver a reminder. Text or email this one from your phone. It has the link.${last?" Last reminder "+ago(last)+".":""}</p>
  <div class="row wrapr"><a class="btn sm${late?" primary":""}" id="i49Sms" data-via="sms" href="sms:${esc(ph)}?&body=${encodeURIComponent(msg)}">${I("chat",14)}Text reminder</a><a class="btn sm" id="i49Mail" data-via="email" href="mailto:${esc(encodeURIComponent(em).replace(/%40/g,"@"))}?subject=${encodeURIComponent("Reminder: invoice "+b.no+" from "+b.bizName)}&body=${encodeURIComponent(msg)}">${I("mail",14)}Email reminder</a></div></div>`}
function v49RemWire(b,R,q){const $=s=>document.getElementById(s),card=document.querySelector(".i48-card");
 document.querySelectorAll("#i49Rem [data-via]").forEach(a=>a.addEventListener("click",()=>act(A.remindBill(b.id,a.dataset.via),R)));
 const show=()=>{if(!card)return;card.scrollIntoView({block:"center"});const f=$("i49Sms")||$("i48Make");if(f)f.focus()};
 if($("bRemind")&&!b.cuid)$("bRemind").onclick=show;
 if(q&&q.rem==="1")setTimeout(show,0)}
/* the Office overview's "Send reminder" on an overdue invoice for a customer without an account opens that card */
{const oo=AFTER.office;AFTER.office=function(){const r=oo&&oo.apply(this,arguments);try{document.querySelectorAll("[data-remind]").forEach(x=>{const b=v7Bill(x.dataset.remind);if(b&&!b.cuid)x.onclick=()=>go("invoice",b.id,{rem:"1"})})}catch(e){}return r}}
