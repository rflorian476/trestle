// v12 end-to-end: priced services, portfolio + lightbox, track record, service area, free consults,
// completeness + import, home log, PM project board, reviews & marketing (QR, review requests, widget),
// review reports + moderation, permission refusals, privacy, mobile fit.
// usage: node test/v12-e2e.js http://localhost:8899 [shotdir]   (NODE_PATH must include playwright)
const {chromium}=require("playwright");const fs=require("fs");const {execFileSync}=require("child_process");
const B=process.argv[2]||"http://localhost:8899";const OUT=process.argv[3]||"";let fail=0;const errs=[];
const ok=(c,n)=>{console.log((c?"PASS ":"FAIL ")+n);if(!c)fail++};
if(OUT)fs.mkdirSync(OUT,{recursive:true});
(async()=>{const br=await chromium.launch();
const mk=async(w=1280)=>{const c=await br.newContext({viewport:{width:w,height:w<500?844:900},deviceScaleFactor:w<500?2:1,acceptDownloads:true});const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));p.on("console",m=>{if(m.type()==="error"&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,200))});p.on("dialog",d=>d.accept());return p};
const as=async(email,w=1300)=>{const p=await mk(w);await p.goto(B+"/");const r=await p.evaluate(async e=>{const o=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,password:"sawyer-demo-2026"})});return o.json()},email);if(!r.ok&&!r.state)throw Error("login failed "+email);await p.reload();await p.waitForTimeout(400);return p};
const nav=async(p,r)=>{await p.goto(B+"/#"+r);await p.reload();await p.waitForTimeout(700)};
const shot=async(p,n,full)=>{if(OUT)await p.screenshot({path:OUT+"/"+n+".png",fullPage:!!full})};
const noX=p=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
const txt=(p,s)=>p.textContent(s).catch(()=>"");
// fixture: demo pro c1 gets a portfolio of its OWN uploads (SW-008: stock photos are never shown as a pro's work)
{const sp=await as("demo-pro@sawyer.test");const F=[["g-water-heater","Water heater in a utility closet, new venting","finished"],["g-pipe-wrench","Replacing a corroded supply line","in-progress"],["g-shower","Curbless shower valve and drain","finished"],["g-radiator","Hydronic heat loop, new fittings","in-progress"],["g-wall-pipes","Old galvanized lines before a repipe","before"],["g-copper","Sweated copper on a 3/4 inch main","finished"],["g-drain","Sink drain after a full snake and clean","after"]].map(([f,cap,tag])=>[fs.readFileSync(__dirname+"/../public/img/"+f+".webp").toString("base64"),cap,tag]);
 const r=await sp.evaluate(async F=>{const out=[];for(const [b,cap,tag] of F){const bin=Uint8Array.from(atob(b),c=>c.charCodeAt(0));const x=await (await fetch("/api/upload",{method:"POST",headers:{"Content-Type":"image/webp"},body:bin})).json();if(x.url)out.push({src:x.url,cap,tag})}return A.setGal12(out)},F);
 if(!r||!r.ok)throw Error("portfolio fixture failed "+JSON.stringify(r));await sp.context().close()}
// ---- public: profile ----
let pub=await mk();await pub.goto(B+"/p/c1",{waitUntil:"networkidle"});await pub.waitForTimeout(500);
ok(/^\/u\//.test(await pub.getAttribute(".px-cover img","src")||""),"profile cover uses the pro's own portfolio photos");
const menu=await pub.$$eval("#prices .m12-r",x=>x.map(e=>e.textContent));ok(menu.length>=5&&menu.filter(t=>/From \$\d/.test(t)).length>=5,"services & starting prices list ("+menu.length+")");
ok(await pub.$('a[href="#prices"]')!==null,"profile nav has a Prices link");
const tiles=await pub.$$(".g12 [data-g12]");ok(tiles.length===5,"portfolio grid shows 5 tiles ("+tiles.length+")");ok(/\+\d+ more/.test(await txt(pub,".g12")),"portfolio shows '+N more'");
await tiles[0].click();await pub.waitForTimeout(300);ok(await pub.$(".lb12box img")!==null,"lightbox opens");const s1=await pub.getAttribute(".lb12box img","src");await pub.keyboard.press("ArrowRight");await pub.waitForTimeout(200);ok(s1!==await pub.getAttribute(".lb12box img","src"),"arrow key moves to the next photo");await shot(pub,"desktop-portfolio-lightbox");await pub.keyboard.press("Escape");await pub.waitForTimeout(200);
const st=await pub.$$eval(".st12 > *",x=>x.map(e=>e.textContent));ok(st.length===6&&!st.some(t=>/undefined|NaN/.test(t)),"track record shows 6 clean stats");
ok((await pub.$$(".ar12-c span")).length>=3,"towns covered listed");
await pub.fill("#ar12z","78704");await pub.click('#ar12F button');await pub.waitForTimeout(200);ok(/yes|cover/i.test(await txt(pub,"#ar12o")),"ZIP inside the area says yes: "+(await txt(pub,"#ar12o")).slice(0,60));
await pub.fill("#ar12z","10011");await pub.click('#ar12F button');await pub.waitForTimeout(200);ok(/outside|not|unknown|don/i.test(await txt(pub,"#ar12o")),"ZIP far away says no: "+(await txt(pub,"#ar12o")).slice(0,60));
await pub.$eval("#prices",e=>e.scrollIntoView());await pub.waitForTimeout(200);await shot(pub,"desktop-prices-area");
await pub.evaluate(()=>scrollTo(0,0));await shot(pub,"desktop-pro-profile");
// signed-out consult: see times first, sign in at the end, come back to the same pick
await pub.click("#cs12Open");await pub.waitForTimeout(300);ok(await pub.$("#modal .cs12-t")!==null,"signed-out visitors can see consult times");
await pub.click("#modal .cs12-t:not([disabled])");await pub.waitForTimeout(150);ok(/Sign in to book/.test(await txt(pub,"#cs12Go")),"button asks to sign in at the end");
await pub.click("#cs12Go");await pub.waitForTimeout(500);ok(/signup|signin/.test(pub.url()),"goes to sign-up with the booking kept");
// embed widget route
const er=await pub.request.get(B+"/embed/c1");const eh=er.headers();const eb=await er.text();
ok(er.status()===200&&!eh["x-frame-options"]&&/frame-ancestors \*/.test(eh["content-security-policy"]||""),"widget can be framed by other sites");
ok(/Bluebonnet/.test(eb)&&/Verified job/.test(eb)&&/ref=widget/.test(eb)&&!/<script/i.test(eb),"widget shows name, verified reviews, link back, no scripts");
ok((await pub.request.get(B+"/embed/nope")).status()===404,"widget for unknown pro is 404");
ok((await pub.request.get(B+"/embed/u1")).status()===404,"widget only exists for pros");
// ---- homeowner ----
const cu=await as("demo-homeowner@sawyer.test");
await nav(cu,"/pro/c1");await cu.click("#cs12Open");await cu.waitForTimeout(300);
const days=await cu.$$("#modal .cs12-d:not([disabled])");await days[Math.min(2,days.length-1)].click();await cu.waitForTimeout(150);
const t0=await cu.getAttribute("#modal .cs12-t:not([disabled])","data-time");await cu.click("#modal .cs12-t:not([disabled])");await cu.fill("#cs12n","Want a quote to swap our tank for tankless");await shot(cu,"desktop-book-consult");
const nBefore=await cu.evaluate(()=>DB.consults.length);await cu.click("#cs12Go");await cu.waitForTimeout(500);
const mine=await cu.evaluate(()=>DB.consults.filter(c=>c.cu===me().id&&c.pro==="c1"));ok(mine.length===2&&mine.some(c=>c.time&&c.status==="confirmed"&&/tankless/.test(c.note||"")),"homeowner books a consult; demo pro confirms instantly");
const booked=mine.find(c=>/tankless/.test(c.note||""));
ok(!(await cu.evaluate(()=>A.consultBook("c1",{date:v7Today(),time:"10:00",mode:"video"}))).ok,"third live consult with the same pro is refused");
ok(!(await cu.evaluate(b=>A.consultBook("c1",{date:b.date,time:b.time,mode:"video"}),booked)).ok,"a taken slot can't be double-booked");
ok(!(await cu.evaluate(()=>A.consultBook("c1",{date:"2020-01-01",time:"10:00"}))).ok,"past dates are refused");
await nav(cu,"/dash");ok((await cu.$$("[data-ics12]")).length>=1,"dashboard lists confirmed consults with a calendar button");
const [dl]=await Promise.all([cu.waitForEvent("download"),cu.click("[data-ics12]")]);const ics=fs.readFileSync(await dl.path(),"utf8");ok(/BEGIN:VCALENDAR/.test(ics)&&/DTSTART/.test(ics),"calendar file downloads (.ics)");
// home log
await nav(cu,"/homelog");const k0=await txt(cu,".h12-k");ok(!/undefined|NaN/.test(await txt(cu,"main")),"home log renders cleanly");
const due0=await cu.$$eval("[data-h12t][data-do=done]",x=>x.length);await cu.click("[data-h12t][data-do=done]");await cu.waitForTimeout(400);
ok(await cu.evaluate(()=>Object.values(me().home12.tasks||{}).some(t=>t&&t.done&&Date.now()-t.done<6e4)),"marking a task done records it");await shot(cu,"desktop-home-log",true);
await nav(cu,"/homelog/warranty");const w0=await cu.$$eval(".h12-w",x=>x.length).catch(()=>0);
await cu.click("#h12Add");await cu.waitForTimeout(200);await cu.fill("#h12n","Tankless water heater");await cu.fill("#h12b","Rinnai");await cu.fill("#h12y","12");await cu.click("#h12F button.primary");await cu.waitForTimeout(400);
ok(await cu.evaluate(()=>(me().home12.items||[]).some(i=>i.name==="Tankless water heater"&&i.years===12)),"warranty added");ok(/Rinnai/.test(await txt(cu,"main")),"new warranty shows in the list");await shot(cu,"desktop-warranties");
await nav(cu,"/homelog/receipts");const [csv]=await Promise.all([cu.waitForEvent("download"),cu.click("#h12Csv")]);ok(/,/.test(fs.readFileSync(await csv.path(),"utf8").split("\n")[0]),"home log exports CSV");
// reporting a review
await nav(cu,"/pro/c3");const rb=await cu.$("[data-rp12]");ok(rb!==null,"reviews have a Report button");const rid=await rb.getAttribute("data-rp12");await rb.click();await cu.waitForTimeout(250);
await cu.check('#rp12F input[name=reason]');await cu.fill("#rp12n","Same wording as reviews on two other pros");await cu.click("#rp12F button.primary");await cu.waitForTimeout(400);
ok(await cu.evaluate(r=>(DB.reports12||[]).some(x=>x.rid===r&&x.by===me().id),rid),"report sent");ok(!(await cu.evaluate(r=>A.reportReview12(r,{reason:"fake"}),rid)).ok,"same person can't report twice");
const ownRev=await cu.evaluate(()=>(DB.reviews.find(r=>r.uid===me().id)||{}).id);if(ownRev)ok(!(await cu.evaluate(r=>A.reportReview12(r,{reason:"fake"}),ownRev)).ok,"can't report your own review");
// refusals + privacy
ok(!(await cu.evaluate(()=>A.modDecide12("report","rp1","remove","x"))).ok,"non-staff can't moderate");
ok(!(await cu.evaluate(()=>A.setRoleDates12((DB.projects[0]||{}).id,"x","2026-12-01","2026-12-02"))).ok,"non-PM can't change crew dates");
ok(!(await cu.evaluate(()=>A.setMenu12([{s:"Hack",from:1}]))).ok,"homeowner can't set a price menu");
ok(!(await cu.evaluate(()=>A.rreqSend12(["j1"],"hi"))).ok,"homeowner can't send review requests");
const priv=await cu.evaluate(()=>({h:DB.users.filter(u=>u.id!==me().id&&u.home12).length,n:DB.consults.filter(c=>c.cu!==me().id&&c.pro!==me().id&&(c.note||c.addr)).length,r:(DB.reports12||[]).filter(r=>r.by!==me().id).length,rm:(DB.rmrev12||[]).length}));
ok(priv.h===0&&priv.n===0&&priv.r===0&&priv.rm===0,"snapshot hides other people's home logs, consult notes and reports "+JSON.stringify(priv));
await nav(cu,"/mod");ok(/Trust team only|isn't|not available|sign in/i.test(await txt(cu,"main"))&&!(await cu.$("[data-mod12]")),"moderation page is staff-only");
// ---- pro ----
const pro=await as("demo-pro@sawyer.test");await nav(pro,"/dash");
ok((await pro.$$('[data-cs12][data-do=confirm]')).length>=1,"pro dashboard shows consult requests");await pro.click('[data-cs12][data-do=confirm]');await pro.waitForTimeout(400);
ok(await pro.evaluate(()=>DB.consults.find(c=>c.id==="cs1").status==="confirmed"),"pro confirms a consult");
ok(await pro.evaluate(b=>DB.consults.some(c=>c.id===b.id&&c.note),booked),"pro sees the customer's consult note");
await nav(pro,"/pro/c1");ok(await pro.$("#cm12, #onboard")!==null,"owner sees the completeness meter, or the setup checklist while steps are left (stock photos no longer count as verified work, SW-008)");ok(await pro.$("#cs12Set")!==null,"owner can set consult hours");
await pro.click("#m12Edit");await pro.waitForTimeout(250);await pro.fill('#m12F .m12-er:first-child input[name=from]',"159");await pro.click("#m12F button.primary");await pro.waitForTimeout(400);
ok(await pro.evaluate(()=>me().menu12[0].from===159),"pro edits a starting price");ok(/From \$159/.test(await txt(pro,"#prices")),"new price shows on the profile");
await pro.click("#g12Edit");await pro.waitForTimeout(250);ok((await pro.$$("#modal .g12m-r, #modal [data-gi]")).length>=1||/Portfolio|photos/i.test(await txt(pro,"#modal")),"portfolio manager opens");await shot(pro,"desktop-portfolio-manager");await pro.keyboard.press("Escape");await pro.waitForTimeout(200);
const g0=await pro.evaluate(()=>me().gal12.length);const g1=await pro.evaluate(()=>{A.setGal12(me().gal12.concat([{src:"/u/0123456789abcdef0123456789abcdef.jpg",cap:"not mine"},{src:"https://evil.example/x.jpg"}]));return me().gal12.length});ok(g1===g0,"portfolio rejects photos you don't own ("+g0+"→"+g1+")");
await pro.click("#cm12Imp");await pro.waitForTimeout(250);await pro.fill("#imp12u","https://maps.google.com/?cid=123");await pro.click("#imp12Go");await pro.waitForTimeout(250);ok(await pro.$("#imp12F")!==null,"import shows a preview to check");await shot(pro,"desktop-import-preview");
await pro.click("#imp12F button.primary");await pro.waitForTimeout(400);ok(await pro.evaluate(()=>!!me().imp12),"import saves the checked fields");ok(await pro.evaluate(()=>!(DB.reviews.some(r=>r.imp))),"no reviews were imported");
await pro.click("#cs12Set");await pro.waitForTimeout(250);await pro.click("#cs12S button.primary");await pro.waitForTimeout(300);ok(await pro.evaluate(()=>!!me().consult12),"consult hours save");
// reviews & marketing
await nav(pro,"/office/grow");ok(/Reviews & marketing/.test(await txt(pro,".otabs, main")),"office has a Reviews & marketing tab");
const qr=await pro.$("#sh12qr svg");ok(qr!==null,"share QR code renders");const url=await pro.inputValue("#sh12u");ok(/\/p\/c1\?ref=/.test(url),"share link points at the public profile");
let qrOk=null;if(OUT){try{const el=await pro.$("#sh12qr");await el.screenshot({path:"/tmp/v12qr.png"});const r=execFileSync("python3",["-c","import cv2;i=cv2.imread('/tmp/v12qr.png');i=cv2.copyMakeBorder(i,40,40,40,40,cv2.BORDER_CONSTANT,value=(255,255,255));t=cv2.QRCodeDetectorAruco().detectAndDecode(i)[0] or cv2.QRCodeDetector().detectAndDecode(i)[0];print(t)"]).toString().trim();qrOk=r.replace(/ref=\w+/,"")===url.replace(/ref=\w+/,"")}catch(e){qrOk=null}}
if(qrOk!==null)ok(qrOk,"QR code scans to the share link");
ok(/\/embed\/c1/.test(await pro.inputValue("#em12c")),"embed code points at the widget");ok(await pro.$("iframe[src*='/embed/c1']")!==null,"widget preview shows");
const rq0=await pro.evaluate(()=>(DB.rreq12||[]).length);const elig=await pro.$$("#rr12F input[name=job]");ok(elig.length>=1,"finished jobs without a review are listed ("+elig.length+")");
await pro.click("#rr12F button.primary");await pro.waitForTimeout(500);const rq1=await pro.evaluate(()=>(DB.rreq12||[]).length);ok(rq1>rq0,"review requests sent ("+(rq1-rq0)+")");
ok(!(await pro.evaluate(()=>{const x=DB.rreq12.find(r=>Date.now()-r.sent<6e4);return A.rreqRemind12(x.id)})).ok,"can't remind before 3 days");
await pro.click("[data-rr12rem]");await pro.waitForTimeout(400);ok(await pro.evaluate(()=>DB.rreq12.some(r=>(r.rem||[]).length)),"reminder sent for an older request");
ok(!(await pro.evaluate(()=>{const x=DB.rreq12.find(r=>(r.rem||[]).length);return A.rreqRemind12(x.id)})).ok,"only one reminder per request");
await shot(pro,"desktop-reviews-marketing",true);
const asked=await pro.evaluate(()=>[...new Set(DB.rreq12.filter(r=>r.by===me().id).map(r=>r.cu))]);console.log("  asked customers: "+asked.join(","));
const cuN=await as("demo-homeowner@sawyer.test");ok(await cuN.evaluate(a=>!a.includes(me().id)||(DB.notifs||[]).some(n=>n.to===me().id&&/review/i.test(n.text||"")),asked),"customer gets the review request in their inbox");
ok(await cuN.evaluate(()=>(DB.rreq12||[]).every(r=>r.cu===me().id||r.by===me().id)),"customers only see their own review requests");
ok(!(await pro.evaluate(r=>A.reportReview12(r,{reason:"fake"}),(await pro.evaluate(()=>DB.reviews.find(r=>r.cid===me().id).id)))).ok,"pros use Dispute, not Report, on their own reviews");
// ---- PM board ----
const pm=await as("demo-pm@sawyer.test");await nav(pm,"/board");ok((await pm.$$("[data-b12r]")).length>=3,"PM board shows crew bars");ok(!/undefined|NaN/.test(await txt(pm,"main")),"board text is clean");await shot(pm,"desktop-project-board",true);
const bar=await pm.getAttribute("[data-b12r]","data-b12r");const [pid,rlid]=bar.split("|");const pr=await pm.evaluate(i=>DB.projects.find(p=>p.id===i),pid);
await pm.click("[data-b12r]");await pm.waitForTimeout(250);await pm.fill("#b12s",pr.start);await pm.fill("#b12e",pr.start);await pm.click("#b12F button.primary");await pm.waitForTimeout(400);
ok(await pm.evaluate(([p,r])=>{const x=DB.projects.find(q=>q.id===p).roles.find(q=>q.id===r);return x.s12===x.e12&&!!x.s12},[pid,rlid]),"PM moves a crew's dates from the bar");
ok(!(await pm.evaluate(([p,r])=>A.setRoleDates12(p,r,"2001-01-01","2001-01-02"),[pid,rlid])).ok,"dates outside the project are refused");
ok((await pm.evaluate(([p,r])=>A.setRoleDates12(p,r,"",""),[pid,rlid])).ok,"dates reset to the phase plan");
// ---- trust team ----
const tt=await as("demo-trust@sawyer.test");await nav(tt,"/dash");await tt.waitForTimeout(200);ok(/\/mod/.test(tt.url())||await tt.$("[data-mod12]")!==null,"trust team lands on the moderation queue");
await nav(tt,"/mod");const open=await tt.$$("[data-mod12]");ok(open.length>=3,"queue has the seeded and new reports ("+open.length+")");await shot(tt,"desktop-moderation",true);
const rp1=await tt.evaluate(()=>DB.reports12.find(x=>x.id==="rp1").rid);const r0=await tt.evaluate(i=>{const r=DB.reviews.find(x=>x.id===i);return r?{id:i,pro:r.cid,n:DB.reviews.filter(x=>x.cid===r.cid).length}:null},rp1);ok(!!r0,"seeded reported review exists");
await tt.fill('[data-mod12="report|rp1"] input',"Copied text, no matching job photos");await tt.click('[data-mod12="report|rp1"] [data-md=remove]');await tt.waitForTimeout(500);
ok(await tt.evaluate(r=>!DB.reviews.some(x=>x.id===r.id)&&DB.reviews.filter(x=>x.cid===r.pro).length===r.n-1&&(DB.rmrev12||[]).some(x=>x.id===r.id),r0),"removing a review takes it off the pro's rating and archives it");
const dk=await tt.getAttribute('[data-mod12^="dispute|"]',"data-mod12");if(dk){await tt.click(`[data-mod12="${dk}"] [data-md=keep]`);await tt.waitForTimeout(300);ok(!!(await tt.$(`[data-mod12="${dk}"]`)),"a decision needs a note");await tt.fill(`[data-mod12="${dk}"] input`,"Pro's texts back up the timeline; review is the customer's honest experience");await tt.click(`[data-mod12="${dk}"] [data-md=keep]`);await tt.waitForTimeout(400);ok(!(await tt.$(`[data-mod12="${dk}"]`)),"dispute kept and closed")}
await nav(tt,"/mod?t=done");ok(/Removed|Kept/.test(await txt(tt,"main")),"decided tab shows the record");
ok(!(await tt.evaluate(()=>A.modDecide12("report","rp1","keep",""))).ok,"a decided report can't be decided again");
// ---- mobile ----
const mp=await mk(390);await mp.goto(B+"/p/c1",{waitUntil:"networkidle"});await mp.waitForTimeout(400);ok(await noX(mp),"mobile profile fits");await shot(mp,"mobile-pro-profile");await mp.$eval("#prices",e=>e.scrollIntoView());await mp.waitForTimeout(200);ok(await noX(mp),"mobile prices fit");await shot(mp,"mobile-prices");
const mc=await as("demo-homeowner@sawyer.test",390);await nav(mc,"/pro/c1");await mc.click("[data-cs12open]:visible, #cs12Open:visible");await mc.waitForTimeout(300);ok(await noX(mc),"mobile consult picker fits");await shot(mc,"mobile-consult");
await mc.keyboard.press("Escape");await nav(mc,"/homelog");ok(await noX(mc),"mobile home log fits");await shot(mc,"mobile-home-log");
await nav(mc,"/homelog/warranty");ok(await noX(mc),"mobile warranties fit");
const mm=await as("demo-pm@sawyer.test",390);await nav(mm,"/board");ok(await noX(mm),"mobile board fits (timeline scrolls inside)");await shot(mm,"mobile-board");
const mo=await as("demo-pro@sawyer.test",390);await nav(mo,"/office/grow");ok(await noX(mo),"mobile marketing fits");await shot(mo,"mobile-marketing");
await nav(mo,"/pro/c1");ok(await noX(mo),"mobile owner profile fits");
const mt=await as("demo-trust@sawyer.test",390);await nav(mt,"/mod");ok(await noX(mt),"mobile moderation fits");
ok(!errs.length,"no page errors"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
await br.close();console.log(fail?`${fail} FAILED`:"ALL PASS");process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(1)});
