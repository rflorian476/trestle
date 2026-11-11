// v19 end-to-end: public snapshot skips deleted accounts; honest signup errors;
// Verified badge is a Trust-team review of license + COI (never client-settable),
// expires when documents lapse; example trade photos (honest labels); price guide
// → compare quotes → hire path; pretty in-app URLs without breaking /p/:id or CSP.
// usage: node test/v19-e2e.js http://localhost:8899 [shotdir]
const {chromium}=require("playwright");const fs=require("fs");const path=require("path");
const B=(process.argv[2]||"http://localhost:8899").replace(/\/$/,"");const OUT=process.argv[3]||"";let fail=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)fail++};
if(OUT)fs.mkdirSync(OUT,{recursive:true});
const PW="sawyer-demo-2026",run=Date.now().toString(36);
const PNG=fs.readFileSync(path.join(__dirname,"fixtures/v16-plain.png"));
async function req(p,{method="GET",body,cookie,headers,raw}={}){const h=Object.assign({},headers||{});if(body!==undefined&&!h["Content-Type"]&&!raw)h["Content-Type"]="application/json";if(cookie)h.Cookie=cookie;
 const r=await fetch(B+p,{method,headers:h,body:raw?body:body===undefined?undefined:JSON.stringify(body),redirect:"manual"});const t=await r.text();let j=null;try{j=JSON.parse(t)}catch(e){}
 const sc=(r.headers.get("set-cookie")||"").match(/swsid=([^;]*)/);return{code:r.status,j,t,headers:r.headers,cookie:sc&&sc[1]?"swsid="+sc[1]:cookie||null}}
const login=email=>req("/api/login",{method:"POST",body:{email,password:PW}});
const act=(cookie,name,args)=>req("/api/act",{method:"POST",cookie,body:{name,args}});
const signup=(kind,data,pw)=>req("/api/signup",{method:"POST",body:{kind,password:pw||"v19-pass-"+run,data}});
const shot=async(p,n)=>{if(OUT)await p.screenshot({path:OUT+"/"+n+".png"})};
async function ctxFor(br,cookie,w){const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900},bypassCSP:true});if(cookie)await c.addCookies([{name:"swsid",value:cookie.replace(/^swsid=/,""),url:B}]);return c}
async function upload(cookie){const r=await fetch(B+"/api/upload",{method:"POST",headers:{"Content-Type":"image/png",Cookie:cookie},body:PNG});const j=await r.json().catch(()=>({}));return{code:r.status,j}}
const year=String(new Date().getFullYear()+2);
(async()=>{
// ===== 1. Deleted rows stay out of the signed-out snapshot; parties still see them =====
{const pub=(await req("/api/state")).j.state;
 const gone=(pub.users||[]).filter(u=>u.role==="deleted"||u.name==="Former Sawyer member");
 ok(gone.length===0,"signed-out /api/state has no Former Sawyer member rows ("+(pub.users||[]).length+" users)",JSON.stringify(gone.slice(0,3)));
 const em="v19-del-"+run+"@sawyer.test";
 const C=await signup("customer",{name:"Del Path",email:em,zip:"78704"},"delete-pass-123");
 ok(C.code===200&&C.cookie,"throwaway customer signs up",C.t.slice(0,160));
 const job=await act(C.cookie,"postJob",[{title:"Leaky kitchen tap",cat:"Plumbing",sub:"Faucets & fixtures",zip:"78704",desc:"The kitchen tap drips day and night and needs a new cartridge or a swap.",budget:"$200–400"}]);
 const jid=job.j&&job.j.res&&job.j.res.id||(job.j&&job.j.state&&(job.j.state.jobs||[]).slice(-1)[0]&&job.j.state.jobs.filter(x=>x.cust===job.j.state.me).sort((a,b)=>b.created-a.created)[0].id);
 ok(job.code===200&&jid,"customer posted a job to share with a pro",job.t.slice(0,200));
 const P=await signup("pro",{name:"Riley Review",email:"v19-del-pro-"+run+"@sawyer.test",biz:"Riley Review Plumbing",trade:"Plumbing",zip:"78704"});
 ok(P.code===200&&P.cookie,"throwaway pro signs up");
 const q=await act(P.cookie,"quote",[jid,350,"Cartridge swap, parts and labor, one-year warranty."]);
 ok(q.code===200&&q.j&&q.j.res&&q.j.res.ok!==false,"pro quoted the job",q.t.slice(0,200));
 const h=await act(C.cookie,"hire",[jid,P.j.state.me]);ok(h.code===200&&h.j.res&&h.j.res.ok!==false,"customer hired the pro");
 const done=await act(P.cookie,"complete",[jid]);ok(done.code===200,"pro marked the job complete");
 const conf=await act(C.cookie,"confirmDone",[jid]);
 const rv=await act(C.cookie,"review",[jid,{quality:5,communication:5,timeliness:5,value:5},"Showed up on time and the tap is dry."]);
 ok(rv.code===200&&rv.j.res&&rv.j.res.ok!==false,"customer left a verified review",rv.t.slice(0,200));
 const cid=C.j.state.me;
 const del=await req("/api/account/delete",{method:"POST",cookie:C.cookie,body:{confirm:"DELETE"}});
 ok(del.code===200,"customer account deletes");
 const afterPub=(await req("/api/state")).j.state;
 ok(!(afterPub.users||[]).some(u=>u.id===cid||u.role==="deleted"||u.name==="Former Sawyer member"),"signed-out snapshot still has no deleted rows after the delete");
 const pst=(await req("/api/state",{cookie:P.cookie})).j.state;
 const former=(pst.users||[]).find(u=>u.id===cid);
 ok(former&&former.name==="Former Sawyer member"&&former.role==="deleted"&&!former.email,"the hired pro still sees Former Sawyer member on the shared job",JSON.stringify(former));
}

// ===== 1b. Signup errors report real validation problems; exceptions would be 500 =====
{const bad=await signup("customer",{name:"Pat",email:"not-an-email",zip:"78704"},"valid-pass-123");
 ok(bad.code===400&&/email/i.test((bad.j&&bad.j.error)||bad.t),"bad email returns 400 naming the email",bad.t.slice(0,200));
 const short=await signup("customer",{name:"Pat Real",email:"v19-short-"+run+"@sawyer.test",zip:"78704"},"short");
 ok(short.code===400&&/8/i.test((short.j&&short.j.error)||short.t),"short password returns 400 with the length rule",short.t.slice(0,200));
 const first=await signup("customer",{name:"Pat Real",email:"v19-dup-"+run+"@sawyer.test",zip:"78704"},"valid-pass-123");
 const dup=await signup("customer",{name:"Pat Other",email:"v19-dup-"+run+"@sawyer.test",zip:"78704"},"valid-pass-123");
 ok(first.code===200&&dup.code===409&&/already has an account/i.test((dup.j&&dup.j.error)||dup.t),"duplicate email returns 409 with a real login hint",dup.t.slice(0,200));
 const src=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");
 ok(/signup exception/.test(src)&&/status:500/.test(src)||/send\(res,500,\{error:"Something went wrong on our side/.test(src),"signup exceptions are logged and returned as HTTP 500, not a generic 400 Sign-up failed")}

// ===== 2. Verified is a Trust-team review, never client-settable =====
{const st=(await req("/api/state")).j.state;const c1=st.users.find(u=>u.id==="c1");
 ok(c1&&c1.verified&&c1.verifiedAt&&c1.licState&&(c1.verifyChecked&&c1.verifyChecked.license),"seeded Bluebonnet is Verified with a check date, license state and what was checked",JSON.stringify({verified:c1&&c1.verified,at:c1&&c1.verifiedAt,st:c1&&c1.licState,chk:c1&&c1.verifyChecked}));
 ok(!c1.verifyBy&&!c1.verifyReject&&!c1.verifyNote,"signed-out viewers don't get staff ids or reject notes");
 const faq=await req("/faq");
 ok(faq.code===200&&!/Simulated in this demo/i.test(faq.t),"FAQ no longer says license checks are simulated");
 const Pro=await signup("pro",{name:"Sam Submit",email:"v19-ver-"+run+"@sawyer.test",biz:"Sam Submit Electric",trade:"Electrical",zip:"78704",license:"TX-99999",insurance:"Acme $1M",verified:true,staff:true});
 const me=Pro.j.state.users.find(u=>u.id===Pro.j.state.me);
 ok(Pro.code===200&&me&&me.verified!==true&&!me.staff,"a new pro cannot self-grant verified or staff on signup",JSON.stringify({verified:me&&me.verified,staff:me&&me.staff}));
 const grab=await act(Pro.cookie,"updatePro",[{license:"TX-888",insurance:"Acme $1M",verified:true,staff:true}]);
 const after=(await req("/api/state",{cookie:Pro.cookie})).j.state.users.find(u=>u.id===Pro.j.state.me);
 ok(after.verified!==true&&!after.staff,"updatePro still cannot set verified or staff",JSON.stringify({v:after.verified,s:after.staff,msg:grab.j&&grab.j.res}));
 const miss=await act(Pro.cookie,"submitVerify19",[{license:"TX-888",licState:"TX",licExp:year+"-06-30",insurance:"Acme Mutual, $1M general liability",insExp:year+"-06-30"}]);
 ok(miss.code===200&&miss.j.res&&miss.j.res.ok===false&&/certificate/i.test(miss.j.res.msg||""),"submit without a COI file is refused with a certificate message",JSON.stringify(miss.j&&miss.j.res));
 const up=await upload(Pro.cookie);ok(up.code===200&&up.j.url,"pro uploaded a certificate image",JSON.stringify(up.j));
 const sub=await act(Pro.cookie,"submitVerify19",[{license:"TX-888",licState:"TX",licExp:year+"-06-30",insurance:"Acme Mutual, $1M general liability",insExp:year+"-06-30",coiFile:up.j.url,coiNum:"POL-19",coiCarrier:"Acme Mutual"}]);
 ok(sub.code===200&&sub.j.res&&sub.j.res.ok,"complete packet submits to the Trust team",JSON.stringify(sub.j&&sub.j.res));
 const pend=(await req("/api/state",{cookie:Pro.cookie})).j.state.users.find(u=>u.id===Pro.j.state.me);
 ok(pend.verifyPending&&pend.verified!==true&&pend.license==="TX-888"&&pend.licState==="TX","packet is pending and the badge stays off",JSON.stringify({p:pend.verifyPending,v:pend.verified,lic:pend.license,st:pend.licState}));
 const pid=Pro.j.state.me;
 const thief=await act(Pro.cookie,"modVerify19",[pid,"approve","looks good"]);
 ok(thief.code===403||(thief.j&&thief.j.res&&thief.j.res.ok===false&&/Trust team only/i.test((thief.j.error||"")+(thief.j.res&&thief.j.res.msg||""))),"the pro cannot approve their own badge",thief.t.slice(0,220));
 const T=await login("demo-trust@sawyer.test");ok(T.code===200&&T.cookie,"staff demo-trust signs in locally");
 const rej=await act(T.cookie,"modVerify19",[pid,"reject","short"]);
 ok(rej.j&&rej.j.res&&rej.j.res.ok===false&&/reason/i.test(rej.j.res.msg||""),"reject without a real reason is refused",JSON.stringify(rej.j&&rej.j.res));
 const no=await act(T.cookie,"modVerify19",[pid,"reject","The certificate is cropped and the policy number is unreadable."]);
 ok(no.code===200&&no.j.res&&no.j.res.ok,"staff can reject with a reason");
 const denied=(await req("/api/state",{cookie:Pro.cookie})).j.state.users.find(u=>u.id===pid);
 ok(denied.verified!==true&&!denied.verifyPending&&/unreadable/i.test(denied.verifyReject||""),"the pro sees the rejection reason and is not Verified",JSON.stringify({v:denied.verified,p:denied.verifyPending,r:denied.verifyReject}));
 const again=await act(Pro.cookie,"submitVerify19",[{license:"TX-888",licState:"TX",licExp:year+"-06-30",insurance:"Acme Mutual, $1M general liability",insExp:year+"-06-30",coiFile:up.j.url}]);
 ok(again.code===200&&again.j.res&&again.j.res.ok,"pro can resubmit after a rejection");
 const yes=await act(T.cookie,"modVerify19",[pid,"approve","License matches the Texas lookup and the COI is current."]);
 ok(yes.code===200&&yes.j.res&&yes.j.res.ok,"staff can approve the packet");
 const on=(await req("/api/state",{cookie:Pro.cookie})).j.state.users.find(u=>u.id===pid);
 ok(on.verified===true&&on.verifiedAt&&on.verifyChecked&&on.verifyChecked.license&&on.verifyChecked.coi&&!on.verifyPending,"badge is on with a check date and what was reviewed",JSON.stringify({v:on.verified,at:on.verifiedAt,chk:on.verifyChecked}));
 const pub=(await req("/api/state")).j.state.users.find(u=>u.id===pid);
 ok(pub&&pub.verified===true&&pub.verifiedAt&&!pub.verifyReject,"signed-out visitors see the badge and check date, not the staff note");
 const tok=process.env.ADMIN_TOKEN;
 if(tok){const api=await req("/api/staff/verify",{method:"POST",headers:{"x-admin-token":tok,"Content-Type":"application/json"},body:{uid:pid,verified:false}});
  ok(api.code===200&&api.j.verified===false,"POST /api/staff/verify still works with the admin token");
  await req("/api/staff/verify",{method:"POST",headers:{"x-admin-token":tok,"Content-Type":"application/json"},body:{uid:pid,verified:true}})}
}

const br=await chromium.launch();
// ===== FAQ, profile trust panel, Find photos, quote path, pretty URLs =====
{const c=await ctxFor(br,null);const pg=await c.newPage();
 await pg.goto(B+"/faq",{waitUntil:"networkidle"});await pg.waitForTimeout(400);
 const faqTxt=await pg.evaluate(()=>document.body.textContent);
 ok(/Trust team/i.test(faqTxt)&&/certificate of insurance/i.test(faqTxt)&&!/Simulated in this demo/i.test(faqTxt),"FAQ describes the Trust-team license and COI review",faqTxt.slice(0,240));
 await shot(pg,"v19-faq-1440");await c.close()}

{const c=await ctxFor(br,null);const pg=await c.newPage();
 await pg.goto(B+"/p/c1",{waitUntil:"networkidle"});
 await pg.waitForFunction(()=>document.querySelector("h1"),null,{timeout:8000}).catch(()=>{});
 await pg.waitForTimeout(400);
 const info=await pg.evaluate(()=>{const t=(document.body.innerText||"");const coming=(t.match(/Job photos coming soon/gi)||[]).length;const ex=[...document.querySelectorAll("figcaption,.v19-ex,.v19-exh")].map(x=>x.textContent.trim());
  const trust=t.includes("Trust team")||t.includes("How we checked");const photoId=/Photo ID matched/i.test(t);const sim=/Simulated/i.test(t);
  return{coming,ex:ex.slice(0,6),trust,photoId,sim,hrefs:[...document.querySelectorAll("a[href]")].map(a=>a.getAttribute("href")).filter(h=>/c1|prices|find/.test(h||"")).slice(0,8)}});
 ok(info.coming===0,"c1 profile does not say Job photos coming soon",JSON.stringify(info));
 ok(info.ex.some(x=>/Example of Plumbing work/i.test(x)),"c1 profile labels example plumbing photos honestly",JSON.stringify(info.ex));
 ok(info.trust&&!info.photoId&&!info.sim,"trust panel claims a Trust-team review, not a simulated photo-ID check",JSON.stringify(info));
 await shot(pg,"v19-pro-c1-1440");
 const c3=await ctxFor(br,null,390);const p3=await c3.newPage();
 await p3.goto(B+"/p/c1",{waitUntil:"networkidle"});await p3.waitForTimeout(400);
 const over=await p3.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
 ok(!over,"c1 profile does not overflow at 390");await shot(p3,"v19-pro-c1-390");await c.close();await c3.close()}

{const c=await ctxFor(br,null);const pg=await c.newPage();
 await pg.goto(B+"/find",{waitUntil:"networkidle"});await pg.waitForTimeout(500);
 const find=await pg.evaluate(()=>{const t=document.body.innerText||"";return{coming:(t.match(/Job photos coming soon/gi)||[]).length,ex:[...document.querySelectorAll(".v19-ex")].map(x=>x.textContent.trim()),cards:document.querySelectorAll(".pcard,.pc13,.ecard").length}});
 ok(find.coming===0&&find.cards>5,"Find has pro cards and no Job photos coming soon",JSON.stringify(find));
 ok(find.ex.length>=1&&find.ex.every(x=>/^Example of .+ work$/.test(x)),"Find cards label example trade photos honestly",JSON.stringify(find.ex.slice(0,6)));
 await shot(pg,"v19-find-1440");
 const c3=await ctxFor(br,null,390);const p3=await c3.newPage();
 await p3.goto(B+"/find",{waitUntil:"networkidle"});await p3.waitForTimeout(400);
 await shot(p3,"v19-find-390");await c.close();await c3.close()}

{const H=await login("demo-homeowner@sawyer.test");ok(H.code===200,"demo homeowner signs in");
 const c=await ctxFor(br,H.cookie);const pg=await c.newPage();
 await pg.goto(B+"/job/j1",{waitUntil:"networkidle"});
 await pg.waitForFunction(()=>document.querySelector("h1"),null,{timeout:8000}).catch(()=>{});
 await pg.waitForTimeout(400);
 const job=await pg.evaluate(()=>{const t=document.body.innerText||"";const path=document.querySelector(".v19-path");
  const cmp=[...document.querySelectorAll("a[href]")].map(a=>a.getAttribute("href")).filter(h=>/compare/.test(h||""));
  return{hasPath:!!path,path:path&&path.innerText,hasGuide:/typical/i.test((path&&path.innerText)||t),cmp,t:t.slice(0,200)}});
 ok(job.hasPath&&/Compare \d+ quotes/i.test(job.path||""),"posted job with bids shows a Compare-quotes next step",JSON.stringify(job));
 ok(job.hasGuide&&job.cmp.length>=1,"the next step mentions the typical range and links to compare",JSON.stringify(job));
 await shot(pg,"v19-job-j1-1440");
 await pg.goto(B+"/compare/j1",{waitUntil:"networkidle"});await pg.waitForTimeout(400);
 const cmp=await pg.evaluate(()=>{const t=document.body.innerText||"";const hire=[...document.querySelectorAll("button,[data-chire]")].filter(b=>/Hire/i.test(b.textContent||"")).length;
  return{title:(document.querySelector("h1")||{}).textContent,guide:/typical/i.test(t)&&/price guide/i.test(t),hire,h1first:!!document.querySelector("h1")}});
 ok(cmp.h1first&&cmp.guide&&cmp.hire>=2,"compare page has the typical range, the price guide, and Hire buttons",JSON.stringify(cmp));
 await shot(pg,"v19-compare-j1-1440");
 const c3=await ctxFor(br,H.cookie,390);const p3=await c3.newPage();
 await p3.goto(B+"/job/j1",{waitUntil:"networkidle"});await p3.waitForTimeout(300);
 const over=await p3.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
 ok(!over,"job page does not overflow at 390");await shot(p3,"v19-job-j1-390");await c.close();await c3.close()}

// staff verification queue
{const T=await login("demo-trust@sawyer.test");
 const c=await ctxFor(br,T.cookie);const pg=await c.newPage();
 await pg.goto(B+"/mod?t=verify",{waitUntil:"networkidle"});
 await pg.waitForFunction(()=>document.querySelector("h1"),null,{timeout:8000}).catch(()=>{});
 await pg.waitForTimeout(400);
 const mod=await pg.evaluate(()=>{const h1=(document.querySelector("h1")||{}).textContent||"";const t=document.body.innerText||"";
  return{h1,hasQueue:/Verification/i.test(t),approve:[...document.querySelectorAll("[data-vd=approve]")].length}});
 ok(/Verification/i.test(mod.h1)&&mod.hasQueue,"staff /mod?t=verify is a verification queue with an H1",JSON.stringify(mod));
 await shot(pg,"v19-mod-verify-1440");await c.close()}

// ===== 5. Pretty URLs =====
{const prices=await req("/prices");ok(prices.code===200&&/Content-Security-Policy/i.test([...prices.headers.keys()].join("\n")+" " +(prices.headers.get("content-security-policy")||"")),"GET /prices is 200 with a CSP");
 ok(/noindex/i.test(prices.t)&&(prices.headers.get("x-robots-tag")||"").includes("noindex"),"pretty /prices stays noindex while SAWYER_INDEXABLE is off");
 const find=await req("/find");ok(find.code===200,"GET /find is 200");
 const prof=await req("/p/c1");ok(prof.code===200&&(prof.headers.get("content-security-policy")||"").includes("default-src"),"/p/c1 still works and keeps a strict CSP");
 const hash=await req("/#/prices"); // server sees path /
 const c=await ctxFor(br,null);const pg=await c.newPage();
 await pg.goto(B+"/prices",{waitUntil:"networkidle"});await pg.waitForTimeout(400);
 const at=await pg.evaluate(()=>({path:location.pathname,hash:location.hash,h1:(document.querySelector("h1")||{}).textContent||"",links:[...document.querySelectorAll("a[href^='/p/'],a[href^='/prices'],a[href^='/find']")].slice(0,5).map(a=>a.getAttribute("href"))}));
 ok((at.path==="/prices"||at.hash==="#/prices"||at.hash.startsWith("#/prices"))&&/price|cost/i.test(at.h1),"typed /prices opens the price guide (hash rewrite or pretty path)",JSON.stringify(at));
 await pg.goto(B+"/#/prices",{waitUntil:"networkidle"});await pg.waitForTimeout(300);
 const hashOk=await pg.evaluate(()=>({hash:location.hash,h1:(document.querySelector("h1")||{}).textContent||""}));
 ok(/price|cost/i.test(hashOk.h1),"legacy #/prices still opens the price guide",JSON.stringify(hashOk));
 await shot(pg,"v19-prices-1440");await c.close()}

{const c=await ctxFor(br,null);const pg=await c.newPage();
 await pg.goto(B+"/credits",{waitUntil:"networkidle"});await pg.waitForTimeout(300);
 const cred=await pg.evaluate(()=>document.body.innerText);
 ok(/Ksenia Chernaya/i.test(cred)&&/Ron Lach/i.test(cred)&&/José Andrés Pacheco Cortes|Jose Andres Pacheco Cortes/i.test(cred),"photo credits page lists the new Pexels photographers",cred.slice(0,200));
 await c.close()}

await br.close();
console.log(fail?`\n${fail} FAILED`:"\nALL PASS");
process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(1)});
