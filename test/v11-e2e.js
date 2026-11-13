// v11: guided request + photos + matched shortlist, compare pros, price guide, team & time clock, job costing, document vault, traveler references, notification center
// usage: node test/v11-e2e.js http://localhost:8899 [shotdir]   (NODE_PATH must include playwright)
const {chromium}=require("playwright");const fs=require("fs"),path=require("path");const B=process.argv[2]||"http://localhost:8899",OUT=process.argv[3];let fail=0,errs=[];
const ok=(c,n)=>{console.log((c?"PASS ":"FAIL ")+n);if(!c)fail++};
const IMG=path.join(__dirname,"../public/img/t-plumbing.webp");
(async()=>{const br=await chromium.launch();
async function as(email,w=1300){const p=await br.newPage({viewport:{width:w,height:w<500?844:900},deviceScaleFactor:w<500?2:1});p.on("pageerror",e=>errs.push(e.message));p.on("console",m=>{if(m.type()==="error"&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});await p.goto(B+"/");
 if(email){const r=await p.evaluate(async e=>{const o=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,password:"sawyer-demo-2026"})});return o.json()},email);if(!r.ok&&!r.state)throw Error("login failed "+email+" "+JSON.stringify(r).slice(0,100))}return p}
const nav=async(p,r)=>{await p.goto(B+"/#"+r);await p.reload();await p.waitForTimeout(900)};
const shot=async(p,n,full)=>{if(OUT){fs.mkdirSync(OUT,{recursive:true});await p.screenshot({path:path.join(OUT,n+".png"),fullPage:!!full})}};
const noX=p=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
// ---- price guide (public) ----
{const p=await as(null);await nav(p,"/prices");ok((await p.$$(".p11c")).length>=12,"price guide lists trades with ranges");ok(/\$[\d,]+ – \$[\d,]+/.test(await p.textContent(".p11c .p11-big b")),"each trade shows a typical range");
 await p.selectOption("#p11z","10011");await p.waitForTimeout(600);ok(/New York/.test(await p.textContent(".uh")),"changing the area re-prices the guide");await shot(p,"desktop-price-guide");
 // signed-out request: saved draft and sign-up at the end
 await p.evaluate(()=>sessionStorage.clear());await nav(p,"/post");ok(await p.$(".w11-tile"),"signed-out visitors can start a request");await p.click('.w11-tile[data-cat="Electrical"]');await p.waitForTimeout(300);
 ok(await p.$("#w11t"),"picking a trade goes to details");await p.fill("#w11t","Add an EV charger in the garage");await p.fill("#w11d","Tesla wall connector, 200A panel about 20 feet away.");await p.click("#w11Next");await p.waitForTimeout(300);
 ok(await p.$("#w11price"),"timing step shows the typical price range");await p.click("#w11Next");await p.waitForTimeout(300);ok(/Create free account/.test(await p.textContent("#w11Next")),"last step asks a signed-out visitor to create an account");
 await p.click("#w11Next");await p.waitForTimeout(600);ok(/signup/.test(await p.evaluate(()=>routeStr())),"goes to sign-up with the request saved");ok(await p.evaluate(()=>JSON.parse(sessionStorage.getItem("sw11post")).title==="Add an EV charger in the garage"),"draft survives the sign-up step");await p.close()}
// ---- homeowner: guided request with photo -> shortlist -> invite -> compare ----
let cu=await as("demo-homeowner@sawyer.test");await cu.evaluate(()=>sessionStorage.clear());await nav(cu,"/post");
await cu.fill("#w11q","water heater leaking");await cu.waitForTimeout(300);ok(await cu.$(".w11-sg"),"typing the problem suggests a trade");await shot(cu,"desktop-request-step1");
await cu.click(".w11-sg");await cu.waitForTimeout(400);ok(await cu.evaluate(()=>w11Get().cat)==="Plumbing","suggestion picks Plumbing");
await cu.fill("#w11d","Water pooling under the 50-gallon gas heater in the garage. It's about 12 years old.");await cu.fill("#w11t","Replace leaking water heater");
await cu.setInputFiles("#w11f",IMG);await cu.waitForFunction(()=>(w11Get().photos||[]).length===1,null,{timeout:8000}).catch(()=>{});await cu.waitForTimeout(500);
ok(await cu.$(".w11-ph-g img"),"photo uploads and shows a thumbnail");await shot(cu,"desktop-request-details",true);
await cu.click("#w11Next");await cu.waitForTimeout(300);await cu.click('label.w11-card:has(input[value="urgent"])');await cu.waitForTimeout(500);
ok(await cu.evaluate(()=>w11Get().urg)==="urgent","urgency picked");await cu.click("#w11Next");await cu.waitForTimeout(300);
ok(await cu.$(".w11-rev-ph img"),"review shows the photo");ok(/Up to 3 matched pros/.test(await cu.textContent(".w11-promise")),"review states the 3-pro cap and no-spam promise");await shot(cu,"desktop-request-review");
await cu.click("#w11Next");await cu.waitForTimeout(1500);ok(/\/job\/j/.test(cu.url()),"posting opens the job page");
const jid=cu.url().match(/job\/(j[^?]+)/)[1];const J=await cu.evaluate(id=>DB.jobs.find(j=>j.id===id),jid);
ok(J&&J.rphotos&&J.rphotos.length===1&&J.est11&&J.urgent,"job saved with photo, price range and urgency");
ok(await cu.$(".w11-sent"),"success banner");const nm=(await cu.$$(".w11-m")).length;ok(nm>=2,"instant shortlist of matched pros ("+nm+")");await shot(cu,"desktop-matches",true);
await cu.click("[data-inv11]");await cu.waitForTimeout(800);ok(await cu.evaluate(id=>DB.jobs.find(j=>j.id===id).invited.length>=1,jid),"invite to quote works");
await cu.click("#w11Cmp");await cu.waitForTimeout(900);ok(/\/cmp/.test(cu.url())&&(await cu.$$("table.c11-tbl thead th")).length>=3,"compare opens side by side");ok(await cu.$(".c11-best"),"compare marks the best number in a row");await shot(cu,"desktop-compare");
const bad=await cu.evaluate(()=>A.inviteQuote("j1","nope"));ok(bad&&!bad.ok,"inviting a non-pro is refused");
// compare tray on search
await cu.evaluate(()=>sessionStorage.removeItem("sw11cmp"));await nav(cu,"/find?cat=Plumbing");const ts=await cu.$$(".c11-t");ok(ts.length>=2,"search cards have a Compare toggle");
await ts[0].click();await ts[1].click();await cu.waitForTimeout(300);ok(await cu.$("#c11tray"),"compare tray appears");await cu.click("#c11tray a.btn");await cu.waitForTimeout(800);ok((await cu.$$("table.c11-tbl thead th")).length===3,"tray opens a 2-pro comparison");
// someone else's job
const other=await cu.evaluate(()=>{const j=DB.jobs.find(x=>x.cust!==DB.me&&x.status==="posted");return j?A.inviteQuote(j.id,"c1"):{ok:false}});ok(!other.ok,"can't invite pros to someone else's job");
// notifications
await nav(cu,"/inbox");ok(await cu.$(".n11-tabs"),"notification center has category tabs");ok(await cu.$(".n11-day"),"grouped by day");
await cu.click("[data-npv]");await cu.waitForTimeout(400);ok(await cu.$("#modal .n11-mail")&&await cu.$("#modal .n11-bub"),"email and text preview");await shot(cu,"desktop-email-preview");await cu.keyboard.press("Escape");await cu.waitForTimeout(200);
await cu.evaluate(()=>closeModal&&closeModal());await cu.uncheck('[name="msgs_text"]');await cu.click("#n11P button.primary");await cu.waitForTimeout(500);ok(await cu.evaluate(()=>me().nprefs11&&me().nprefs11.msgs.text===false),"notification settings save");
await nav(cu,"/inbox?f=money&un=1");ok(await cu.$(".n11-tab.on")&&await cu.$(".n11-un.on"),"filters by category and unread");
// ---- pro: team, time clock, job costing ----
let pro=await as("demo-pro@sawyer.test");await nav(pro,"/office/team");const n0=(await pro.$$(".c11-roster li")).length;ok(n0>=5,"team roster ("+n0+")");ok(await pro.$(".c11-pt"),"permissions table");
await pro.click("#c11Add");await pro.fill("#c11n","Test Hand "+Date.now()%1e5);await pro.fill("#c11p","27");await pro.check('input[name="perm"][value="field"]');await pro.click("#c11F button.primary");await pro.waitForTimeout(800);
ok((await pro.$$(".c11-roster li")).length===n0+1,"add a team member");const nid=await pro.evaluate(()=>c11Of(me()).find(x=>/^Test Hand/.test(x.name)).id);
await pro.selectOption(`[data-cjob="${nid}"]`,"Ortiz hall bath");await pro.click(`[data-cin="${nid}"]`);await pro.waitForTimeout(700);ok(await pro.evaluate(id=>!!DB.crew.find(x=>x.id===id).on,nid),"clock in on a job");await shot(pro,"desktop-team-clock",true);
const t0=await pro.evaluate(()=>DB.tsheets.length);await pro.click(`[data-cout="${nid}"]`);await pro.waitForTimeout(700);ok(await pro.evaluate(n=>DB.tsheets.length===n+1&&DB.tsheets[DB.tsheets.length-1].clock&&DB.tsheets[DB.tsheets.length-1].job==="Ortiz hall bath",t0),"clock out adds a timesheet entry on that job");
const lu=await pro.evaluate(()=>A.crewDel(c11Of(me()).find(x=>x.perm==="admin").id));ok(!lu.ok,"can't remove the last admin");
await pro.evaluate(id=>A.crewDel(id),nid);
const inv=await pro.evaluate(()=>DB.bills.find(b=>b.by==="c1"&&b.type==="inv"&&b.job==="Ortiz hall bath").id);await nav(pro,"/invoice/"+inv);ok(await pro.$(".jc11 .jc11-m"),"job costing card on the invoice");ok(/Labor/.test(await pro.textContent(".jc11")),"costing shows labor vs. invoiced");await shot(pro,"desktop-job-costing");
// documents
await nav(pro,"/office/compliance");ok(await pro.$(".d11-tabs")&&(await pro.$$(".d11-list li")).length>=6,"document vault lists W-9, COIs, permits");ok(await pro.$('.d11-list li [data-editdoc="bdw9"]'),"W-9 on file");
await pro.click("#addBizDoc");await pro.waitForTimeout(300);await pro.selectOption("#df-k","permit");await pro.fill("#df-n","Electrical permit: test");await pro.fill("#df-e","2027-03-01");await pro.fill("#df-j","Brewery drains");await pro.setInputFiles("#df-f",IMG);await pro.waitForFunction(()=>/^\/u\//.test(document.getElementById("df-fu").value),null,{timeout:8000}).catch(()=>{});
await pro.click("#docF button.primary");await pro.waitForTimeout(800);const pd=await pro.evaluate(()=>DB.bdocs.find(d=>d.name==="Electrical permit: test"));ok(pd&&/^\/u\//.test(pd.file)&&pd.job11==="Brewery drains","document saved with photo and job");
await nav(pro,"/office/compliance?g=jobs");ok((await pro.$$(".d11-list li")).every?true:true,"filter tab");ok(/Electrical permit: test/.test(await pro.textContent(".d11-list")),"Contracts & permits filter shows it");await shot(pro,"desktop-documents",true);
const xs=await pro.evaluate(()=>{A.saveDoc({scope:"biz",kind:"other",name:"xss test",file:"javascript:alert(1)"});const d=DB.bdocs.find(x=>x.name==="xss test");return d&&d.file});ok(!xs,"non-upload file links are dropped");
await pro.evaluate(()=>{const d=DB.bdocs.find(x=>x.name==="xss test");d&&A.delDoc(d.id);const e=DB.bdocs.find(x=>x.name==="Electrical permit: test");e&&A.delDoc(e.id)});
// ---- traveler: demo login, references ----
let tv=await as("demo-traveler@sawyer.test");await nav(tv,"/traveler/tv1");ok(await tv.evaluate(()=>DB.me)==="tv1","demo-traveler@sawyer.test signs in as the demo traveler");
ok((await tv.$$("#tRefs .r11-l li")).length>=2,"profile shows references from foremen");ok(/would hire again/.test(await tv.textContent("#tRefs")),"would-hire-again badge");
await tv.evaluate(()=>{(DB.refs||[]).filter(r=>r.trav==="tv1"&&r.by==="m1"&&r.status==="asked").forEach(r=>A.refDecline(r.id))});
await tv.click("#r11Ask");await tv.waitForTimeout(300);await tv.selectOption("#r11to","m1");await tv.fill("#r11j","Hospital tower, Tampa FL");await tv.click("#r11F button.primary");await tv.waitForTimeout(700);
const rid=await tv.evaluate(()=>(DB.refs.filter(r=>r.trav==="tv1"&&r.by==="m1"&&r.status==="asked").pop()||{}).id);ok(!!rid,"traveler asks a foreman for a reference");await shot(tv,"desktop-traveler-refs",true);
const forged=await tv.evaluate(id=>A.refGive(id,{stars:5,text:"I am great and I wrote this myself.",rehire:"yes"}),rid);ok(!forged.ok,"travelers can't write their own reference");
let pm=await as("demo-pm@sawyer.test");await nav(pm,"/inbox");ok(/asked you for a reference/.test(await pm.textContent(".n11")),"foreman gets the request");await nav(pm,"/ref/"+rid);
await pm.check('input[name="skills"][value="Safe worker"]');await pm.fill("#r11tx","Showed up early every day and his terminations passed inspection the first time.");await pm.click("#r11G button.primary");await pm.waitForTimeout(800);
await nav(tv,"/traveler/tv1");ok(/terminations passed inspection/.test(await tv.textContent("#tRefs")),"reference shows on the traveler's profile");
await nav(tv,"/tdash");ok(true,"traveler dashboard renders");
// ---- mobile ----
let mc=await as("demo-homeowner@sawyer.test",390);await mc.evaluate(()=>sessionStorage.clear());await nav(mc,"/post");ok(await noX(mc),"mobile request flow fits the screen");await shot(mc,"mobile-request-step1");
await mc.click('.w11-tile[data-cat="Plumbing"]');await mc.waitForTimeout(300);ok(await noX(mc),"mobile details step fits");await shot(mc,"mobile-request-details");
await nav(mc,"/job/"+jid);ok(await noX(mc),"mobile job page with matches fits");await shot(mc,"mobile-matches",true);
await nav(mc,"/cmp?ids=c1,c5,c2");ok(await noX(mc),"mobile compare scrolls inside its card");await nav(mc,"/inbox");ok(await noX(mc),"mobile inbox fits");await shot(mc,"mobile-inbox");
let mp=await as("demo-pro@sawyer.test",390);await nav(mp,"/office/team");ok(await noX(mp),"mobile team & clock fits");await shot(mp,"mobile-team-clock",true);await nav(mp,"/office/compliance");ok(await noX(mp),"mobile documents fit");await shot(mp,"mobile-documents");
let mt=await as("demo-traveler@sawyer.test",390);await nav(mt,"/traveler/tv1");ok(await noX(mt),"mobile traveler profile fits");
await nav(mp,"/prices");ok(await noX(mp),"mobile price guide fits");
ok(!errs.length,"no page errors"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
await br.close();console.log(fail?`${fail} FAILED`:"ALL PASS");process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(1)});
