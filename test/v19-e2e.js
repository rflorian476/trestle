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
 ok(c1&&c1.verified&&c1.verifiedAt&&c1.verifyChecked&&c1.verifyChecked.license,"seeded Bluebonnet is Verified with a check date and what was checked",JSON.stringify({verified:c1&&c1.verified,at:c1&&c1.verifiedAt,chk:c1&&c1.verifyChecked}));
 ok(!c1.license&&!c1.licState&&!c1.insurance&&!c1.coiNum&&!c1.coiCarrier&&!c1.coiFile,"signed-out viewers do not get license numbers, insurer, policy numbers or a COI URL",JSON.stringify({license:c1.license,licState:c1.licState,insurance:c1.insurance,coiNum:c1.coiNum,coiFile:c1.coiFile}));
 ok(!c1.verifyBy&&!c1.verifyReject&&!c1.verifyNote&&!c1.verifyPending,"signed-out viewers don't get staff ids, reject notes or pending-packet flags");
 ok(!(c1.verifyChecked&&c1.verifyChecked.by),"public verifyChecked has no staff id");
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
 const pkt=["license","licState","insurance","coiNum","coiCarrier","coiFile","verifyReject","verifyBy","verifyNote"];
 ok(pkt.every(k=>pub[k]==null||pub[k]===""),"signed-out /api/state strips the verification packet for the approved pro",JSON.stringify(pkt.map(k=>[k,pub[k]])));
 const needles=["TX-888","POL-19","Acme Mutual", (up.j.url||"").replace(/^\/u\//,"")];
 const pubDump=JSON.stringify((await req("/api/state")).j.state);
 ok(needles.every(n=>!n||!pubDump.includes(n)),"signed-out /api/state body does not contain the license, policy, insurer or COI filename",needles.filter(n=>n&&pubDump.includes(n)).join(","));
 const other=await signup("customer",{name:"Other Viewer",email:"v19-other-"+run+"@sawyer.test",zip:"78704"});
 const otherU=(await req("/api/state",{cookie:other.cookie})).j.state.users.find(u=>u.id===pid);
 ok(otherU&&pkt.every(k=>otherU[k]==null||otherU[k]===""),"another signed-in customer does not see the packet",JSON.stringify(pkt.map(k=>[k,otherU&&otherU[k]])));
 const otherPro=await signup("pro",{name:"Other Pro",email:"v19-otherpro-"+run+"@sawyer.test",biz:"Other Pro Co",trade:"Plumbing",zip:"78704"});
 const otherPU=(await req("/api/state",{cookie:otherPro.cookie})).j.state.users.find(u=>u.id===pid);
 ok(otherPU&&pkt.every(k=>otherPU[k]==null||otherPU[k]===""),"another signed-in pro does not see the packet");
 const staffU=(await req("/api/state",{cookie:T.cookie})).j.state.users.find(u=>u.id===pid);
 ok(staffU&&staffU.license==="TX-888"&&staffU.coiNum==="POL-19"&&/\/api\/coi\//.test(staffU.coiFile||""),"staff still see the full packet, with the COI on the auth-checked route",JSON.stringify({license:staffU&&staffU.license,coi:staffU&&staffU.coiFile,num:staffU&&staffU.coiNum}));
 const ownerU=(await req("/api/state",{cookie:Pro.cookie})).j.state.users.find(u=>u.id===pid);
 ok(ownerU&&ownerU.license==="TX-888"&&/\/api\/coi\//.test(ownerU.coiFile||""),"the pro still sees their own packet on /api/coi/");
 const name=(up.j.url||"").split("/").pop();
 const anonU=await req("/u/"+name);ok(anonU.code===404,"unauthenticated GET /u/ of a COI is 404, not the certificate",String(anonU.code)+" "+String(anonU.t&&anonU.t.length));
 const anonC=await req("/api/coi/"+name);ok(anonC.code===401,"unauthenticated GET /api/coi/ is 401",String(anonC.code));
 const thiefC=await req("/api/coi/"+name,{cookie:other.cookie});ok(thiefC.code===404,"a different signed-in user GET /api/coi/ is 404",String(thiefC.code));
 const ownC=await req("/api/coi/"+name,{cookie:Pro.cookie});ok(ownC.code===200&&ownC.t&&ownC.t.length>100&&!/^\s*\{/.test(ownC.t),"the owner can download their COI from /api/coi/",String(ownC.code)+" "+(ownC.headers&&ownC.headers.get("content-type")));
 const stfC=await req("/api/coi/"+name,{cookie:T.cookie});ok(stfC.code===200&&stfC.t&&stfC.t.length>100,"staff can download the COI from /api/coi/",String(stfC.code));
 const stPage=await req("/p/"+pid);ok(stPage.code===200,"GET /p/:id for the approved pro is 200");
 const stMatch=stPage.t.match(/<script>window\.__ST=([\s\S]*?)<\/script>/);let stObj=null;if(stMatch){try{stObj=JSON.parse(stMatch[1])}catch(e){}}
 const stUser=stObj&&(stObj.users||[]).find(u=>u.id===pid);
 ok(stUser&&pkt.every(k=>stUser[k]==null||stUser[k]===""),"/p/:id inlined state strips the verification packet",stUser?JSON.stringify(pkt.map(k=>[k,stUser[k]])): "no __ST user");
 ok(!needles.some(n=>n&&stPage.t.includes(n)),"/p/:id HTML does not contain license, policy, insurer or COI filename");
 const home=await req("/");const hMatch=home.t.match(/<script>window\.__ST=([\s\S]*?)<\/script>/);let hObj=null;if(hMatch){try{hObj=JSON.parse(hMatch[1])}catch(e){}}
 const hUser=hObj&&(hObj.users||[]).find(u=>u.id===pid);
 ok(!hUser||pkt.every(k=>hUser[k]==null||hUser[k]===""),"home inlined state also strips the packet");

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
  return{coming,ex:ex.slice(0,6),trust,photoId,sim,t,hasLicNum:/DEMO-LIC|license #|#DEMO/i.test(t),hasInsFile:/Insurance on file/i.test(t)||/License verified/i.test(t),endOfDay:/end of that day/i.test(t),hrefs:[...document.querySelectorAll("a[href]")].map(a=>a.getAttribute("href")).filter(h=>/c1|prices|find/.test(h||"")).slice(0,8)}});
 ok(info.coming===0,"c1 profile does not say Job photos coming soon",JSON.stringify({coming:info.coming}));
 ok(info.ex.some(x=>/Example of Plumbing work/i.test(x)),"c1 profile labels example plumbing photos honestly",JSON.stringify(info.ex));
 ok(info.trust&&!info.photoId&&!info.sim,"trust panel claims a Trust-team review, not a simulated photo-ID check");
 ok(!info.hasLicNum&&info.hasInsFile,"public trust panel shows what was checked, not license or policy numbers",JSON.stringify({hasLicNum:info.hasLicNum,hasInsFile:info.hasInsFile,slice:(info.t||"").slice((info.t||"").indexOf("How we checked"), (info.t||"").indexOf("How we checked")+400)}));
 ok(info.endOfDay,"public trust panel says the badge comes off at the end of the expiry day");
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
  return{title:(document.querySelector("h1")||{}).textContent,guide:/typical/i.test(t)&&/price guide/i.test(t),hire,h1first:!!document.querySelector("h1"),rowRoles:document.querySelectorAll('article[role="row"],.cmp-col[role="row"]').length}});
 ok(cmp.h1first&&cmp.guide&&cmp.hire>=2,"compare page has the typical range, the price guide, and Hire buttons",JSON.stringify(cmp));
 ok(cmp.rowRoles===0,"compare bid columns are articles without role=row",JSON.stringify(cmp));
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
 const at=await pg.evaluate(()=>({path:location.pathname,hash:routeStr(),h1:(document.querySelector("h1")||{}).textContent||"",links:[...document.querySelectorAll("a[href^='/p/'],a[href^='/prices'],a[href^='/find']")].slice(0,5).map(a=>a.getAttribute("href"))}));
 ok((at.path==="/prices"||at.hash==="#/prices"||at.hash.startsWith("#/prices"))&&/price|cost/i.test(at.h1),"typed /prices opens the price guide (hash rewrite or pretty path)",JSON.stringify(at));
 await pg.goto(B+"/#/prices",{waitUntil:"networkidle"});await pg.waitForTimeout(300);
 const hashOk=await pg.evaluate(()=>({hash:routeStr(),h1:(document.querySelector("h1")||{}).textContent||""}));
 ok(/price|cost/i.test(hashOk.h1),"legacy #/prices still opens the price guide",JSON.stringify(hashOk));
 await shot(pg,"v19-prices-1440");await c.close()}

{const c=await ctxFor(br,null);const pg=await c.newPage();
 await pg.goto(B+"/credits",{waitUntil:"networkidle"});await pg.waitForTimeout(300);
 const cred=await pg.evaluate(()=>document.body.innerText);
 ok(/Ksenia Chernaya/i.test(cred)&&/Ron Lach/i.test(cred)&&/José Andrés Pacheco Cortes|Jose Andres Pacheco Cortes/i.test(cred),"photo credits page lists the new Pexels photographers",cred.slice(0,200));
 await c.close()}

await br.close();

// ===== SW-051: hiring notifies the other bidders, with no winner details =====
{const Cu=await signup("customer",{name:"Hire Path",email:"v19-hire-cu-"+run+"@sawyer.test",zip:"78704"});
 const Apro=await signup("pro",{name:"Ann Quote",email:"v19-hire-a-"+run+"@sawyer.test",biz:"Ann Quote Plumbing",trade:"Plumbing",zip:"78704"});
 const Bpro=await signup("pro",{name:"Bea Quote",email:"v19-hire-b-"+run+"@sawyer.test",biz:"Bea Quote Plumbing",trade:"Plumbing",zip:"78704"});
 const job=await act(Cu.cookie,"postJob",[{title:"Swap a bathroom faucet",cat:"Plumbing",sub:"Faucets & fixtures",zip:"78704",desc:"The downstairs bathroom faucet leaks at the handle and should be replaced this week.",budget:"$300–500"}]);
 const jid=job.j&&job.j.res&&job.j.res.id||((job.j.state.jobs||[]).filter(x=>x.cust===job.j.state.me).sort((a,b)=>b.created-a.created)[0]||{}).id;
 ok(jid,"throwaway job for the hire path",jid);
 await act(Apro.cookie,"quote",[jid,320,"Cartridge and faucet, one-year warranty."]);
 await act(Bpro.cookie,"quote",[jid,410,"Same-day swap, parts included."]);
 const hid=Apro.j.state.me,oid=Bpro.j.state.me;
 const hired=await act(Cu.cookie,"hire",[jid,hid]);
 ok(hired.code===200&&hired.j.res&&hired.j.res.ok!==false,"customer hired one of two bidders");
 const aN=(await req("/api/state",{cookie:Apro.cookie})).j.state.notifs||[];
 const bN=(await req("/api/state",{cookie:Bpro.cookie})).j.state.notifs||[];
 const aTxt=aN.map(n=>n.text).join(" | ");
 const bTxt=bN.map(n=>n.text).join(" | ");
 ok(/hired/i.test(aTxt),"the hired pro is notified they were hired",aTxt);
 ok(/filled/i.test(bTxt)&&/Swap a bathroom faucet/.test(bTxt),"the other bidder is told the job was filled",bTxt);
 ok(!/Ann Quote|Bea Quote|\$320|\$410|320|410/.test(bTxt)&&!/Hire Path/.test(bTxt),"the filled notice has no winner name, price or customer name",bTxt);
 const st=(await req("/api/state",{cookie:Cu.cookie})).j.state;
 const qs=(st.quotes||[]).filter(q=>q.job===jid);
 ok(qs.some(q=>q.cid===hid&&q.status==="accepted")&&qs.some(q=>q.cid===oid&&q.status==="declined"),"the other quote is declined and the winner is accepted");
}

// ===== SW-050: calendar expiry + TEST_NOW (own servers; ignored in production) =====
await (async()=>{
 const {spawn}=require("child_process"),http=require("http"),os=require("os");
 const ROOT=path.join(__dirname,"..");
 const PNG=fs.readFileSync(path.join(__dirname,"fixtures/v16-plain.png"));
 const freePort=()=>new Promise((ok,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>ok(p))});s.on("error",no)});
 function start(dir,extra){
  const portP=freePort();
  return portP.then(port=>{
   const env=Object.assign({},process.env,extra||{},{HOST:"127.0.0.1",PORT:String(port),DATA_DIR:dir,RATE_X:process.env.RATE_X||"50"});
   const child=spawn(process.execPath,[path.join(ROOT,"server.js")],{env,stdio:["ignore","pipe","pipe"]});
   let log="";child.stdout.on("data",d=>{log+=d});child.stderr.on("data",d=>{log+=d});
   return new Promise((ok,no)=>{
    const t=setTimeout(()=>no(new Error("expiry server did not start\n"+log)),12000);
    const wait=()=>{if(/live on/.test(log)){clearTimeout(t);ok({child,port,dir,log:()=>log})}else setTimeout(wait,40)};
    child.on("exit",()=>{clearTimeout(t);no(new Error("expiry server exited\n"+log))});
    wait();
   });
  });
 }
 const stop=s=>new Promise(ok=>{if(!s||!s.child)return ok();s.child.on("exit",()=>ok());s.child.kill("SIGTERM");setTimeout(()=>{try{s.child.kill("SIGKILL")}catch(e){}ok()},2000)});
 async function r(s,p,opt={}){const h=Object.assign({},opt.headers||{});if(opt.body!==undefined&&!h["Content-Type"]&&!opt.raw)h["Content-Type"]="application/json";if(opt.cookie)h.Cookie=opt.cookie;
  const res=await fetch("http://127.0.0.1:"+s.port+p,{method:opt.method||"GET",headers:h,body:opt.raw?opt.body:opt.body===undefined?undefined:JSON.stringify(opt.body)});
  const t=await res.text();let j=null;try{j=JSON.parse(t)}catch(e){}
  const sc=(res.headers.get("set-cookie")||"").match(/swsid=([^;]*)/);
  return{code:res.status,j,t,cookie:sc&&sc[1]?"swsid="+sc[1]:opt.cookie||null}}
 const login=(s,email,pw)=>r(s,"/api/login",{method:"POST",body:{email,password:pw||"v19-clock-pass"}});
 const act=(s,cookie,name,args)=>r(s,"/api/act",{method:"POST",cookie,body:{name,args}});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v19-exp-"));
 const EXP="2026-11-11",INSEXP="2027-06-30";
 async function boot(now){return start(dir,{TEST_NOW:now+"T15:00:00"})}
 let s=null,proCk=null,trustCk=null,pid=null;
 try{
  s=await boot("2026-09-12"); // 60 days before EXP
  const su=await r(s,"/api/signup",{method:"POST",body:{kind:"pro",password:"v19-clock-pass",data:{name:"Clock Pro",email:"v19-clock@sawyer.test",biz:"Clock Pro Electric",trade:"Electrical",zip:"78704"}}});
  proCk=su.cookie;pid=su.j.state.me;
  const up=await fetch("http://127.0.0.1:"+s.port+"/api/upload",{method:"POST",headers:{"Content-Type":"image/png",Cookie:proCk},body:PNG});
  const upj=await up.json();
  const sub=await act(s,proCk,"submitVerify19",[{license:"TX-CLOCK",licState:"TX",licExp:EXP,insurance:"Acme Mutual, $1M general liability",insExp:INSEXP,coiFile:upj.url}]);
  ok(sub.j&&sub.j.res&&sub.j.res.ok,"clock-test packet submitted",JSON.stringify(sub.j&&sub.j.res));
  const T=await login(s,"demo-trust@sawyer.test",PW);trustCk=T.cookie;
  const yes=await act(s,trustCk,"modVerify19",[pid,"approve","Current license and certificate."]);
  ok(yes.j&&yes.j.res&&yes.j.res.ok,"clock-test packet approved at 60 days out");
  const sw=await act(s,proCk,"sweepVerify19",[]);
  const n60=((await r(s,"/api/state",{cookie:proCk})).j.state.notifs||[]).map(x=>x.text).join(" | ");
  ok(/expires in 60 days/.test(n60)&&/2026-11-11/.test(n60),"60-day reminder fires on the 60-day mark",n60);
  const still=((await r(s,"/api/state",{cookie:proCk})).j.state.users.find(u=>u.id===pid)||{});
  ok(still.verified===true,"badge stays on 60 days before expiry");
  await stop(s);

  s=await boot("2026-10-12"); // 30 days
  proCk=(await login(s,"v19-clock@sawyer.test")).cookie;
  await act(s,proCk,"sweepVerify19",[]);
  const n30=((await r(s,"/api/state",{cookie:proCk})).j.state.notifs||[]).map(x=>x.text).join(" | ");
  ok(/expires in 30 days/.test(n30),"30-day reminder fires on the 30-day mark",n30);
  ok(((await r(s,"/api/state",{cookie:proCk})).j.state.users.find(u=>u.id===pid)||{}).verified===true,"badge stays on 30 days before expiry");
  await stop(s);

  s=await boot("2026-11-04"); // 7 days
  proCk=(await login(s,"v19-clock@sawyer.test")).cookie;
  await act(s,proCk,"sweepVerify19",[]);
  const n7=((await r(s,"/api/state",{cookie:proCk})).j.state.notifs||[]).map(x=>x.text).join(" | ");
  ok(/expires in 7 days/.test(n7),"7-day reminder fires on the 7-day mark",n7);
  await stop(s);

  s=await boot("2026-11-11"); // expiry date
  proCk=(await login(s,"v19-clock@sawyer.test")).cookie;
  await act(s,proCk,"sweepVerify19",[]);
  const st0=(await r(s,"/api/state",{cookie:proCk})).j.state;
  const n0=(st0.notifs||[]).map(x=>x.text).join(" | ");
  const u0=st0.users.find(u=>u.id===pid);
  ok(/expires today/.test(n0),"expires-today reminder fires on the expiry date",n0);
  ok(u0&&u0.verified===true&&!u0.verifyExpired,"badge stays on through the expiry date",JSON.stringify({v:u0&&u0.verified,ex:u0&&u0.verifyExpired}));
  await stop(s);

  s=await boot("2026-11-12"); // day after
  proCk=(await login(s,"v19-clock@sawyer.test")).cookie;
  await act(s,proCk,"sweepVerify19",[]);
  const stA=(await r(s,"/api/state",{cookie:proCk})).j.state;
  const uA=stA.users.find(u=>u.id===pid);
  const nA=(stA.notifs||[]).map(x=>x.text).join(" | ");
  ok(uA&&uA.verified===false&&uA.verifyExpired,"badge comes off the calendar day after the printed expiry date",JSON.stringify({v:uA&&uA.verified,ex:uA&&uA.verifyExpired}));
  ok(/came off|expired/.test(nA),"the pro is told the badge came off because the license expired",nA);
  trustCk=(await login(s,"demo-trust@sawyer.test",PW)).cookie;
  const again=await act(s,proCk,"submitVerify19",[{license:"TX-CLOCK",licState:"TX",licExp:EXP,insurance:"Acme Mutual, $1M general liability",insExp:INSEXP,coiFile:uA.coiFile}]);
  // resubmit with past licExp should be refused
  ok(again.j&&again.j.res&&again.j.res.ok===false,"resubmitting an already-expired license is refused",JSON.stringify(again.j&&again.j.res));
  const staffTry=await act(s,trustCk,"modVerify19",[pid,"approve","should not work"]);
  ok(staffTry.j&&staffTry.j.res&&staffTry.j.res.ok===false&&/expired/i.test(staffTry.j.res.msg||""),"staff cannot approve a packet whose printed date is already past",JSON.stringify(staffTry.j&&staffTry.j.res));
  await stop(s);

  // production ignores TEST_NOW (a 2099 clock would otherwise drop today's valid badges)
  s=await start(dir,{NODE_ENV:"production",TEST_NOW:"2099-01-01T15:00:00"});
  proCk=(await login(s,"v19-clock@sawyer.test")).cookie;
  // After the previous step the badge is already off (expired in the saved data). Use a seeded demo pro instead? The data dir has expired clock pro.
  // Seeded c1 should still be verified under real now (Nov 2026) even if TEST_NOW is 2099, if the clock is ignored.
  const c1=((await r(s,"/api/state")).j.state.users||[]).find(u=>u.id==="c1");
  ok(c1&&c1.verified===true,"NODE_ENV=production ignores TEST_NOW, so seeded Verified badges stay on",JSON.stringify({v:c1&&c1.verified,now:"2099"}));
  await stop(s);
 }catch(e){ok(false,"SW-050 clock tests ran without throwing",String(e&&e.stack||e).slice(0,400));if(s)try{await stop(s)}catch(x){}}
 try{fs.rmSync(dir,{recursive:true,force:true})}catch(e){}
})();

console.log(fail?`\n${fail} FAILED`:"\nALL PASS");
process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(1)});
