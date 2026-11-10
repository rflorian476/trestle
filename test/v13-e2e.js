// v13 end-to-end: lazy-loaded heavy pages (home log, project board, moderation, marketing), pre-rendered
// signed-out profile cover, non-overlapping map labels, honest "photos coming soon" for pros without a
// portfolio, search-card photos, dashboard header order, mobile fit, no page errors.
// usage: node test/v13-e2e.js http://localhost:8899 [shotdir]   (NODE_PATH must include playwright)
const {chromium}=require("playwright");const fs=require("fs");
const B=process.argv[2]||"http://localhost:8899";const OUT=process.argv[3]||"";let fail=0;const errs=[];
const ok=(c,n)=>{console.log((c?"PASS ":"FAIL ")+n);if(!c)fail++};
if(OUT)fs.mkdirSync(OUT,{recursive:true});
(async()=>{const br=await chromium.launch();
const mk=async(w=1300)=>{const c=await br.newContext({viewport:{width:w,height:w<500?844:900},deviceScaleFactor:w<500?2:1});const p=await c.newPage();p.lz=[];p.on("request",r=>{if(/\/js\/lz\d+\./.test(r.url()))p.lz.push(r.url())});p.on("pageerror",e=>errs.push(String(e).slice(0,200)));p.on("console",m=>{if(m.type()==="error"&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,200))});p.on("dialog",d=>d.accept());return p};
const as=async(email,w=1300)=>{const p=await mk(w);await p.goto(B+"/");const r=await p.evaluate(async e=>{const o=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,password:"sawyer-demo-2026"})});return o.json()},email);if(!r.ok&&!r.state)throw Error("login failed "+email);await p.reload();await p.waitForTimeout(400);return p};
const nav=async(p,r)=>{await p.goto(B+"/#"+r);await p.reload();await p.waitForTimeout(800)};
const shot=async(p,n,full)=>{if(OUT)await p.screenshot({path:OUT+"/"+n+".png",fullPage:!!full})};
const noX=p=>p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
const txt=(p,s)=>p.textContent(s).catch(()=>"");
const labelsClear=p=>p.$$eval(".usmap .m-town text",ts=>{const b=ts.map(t=>t.getBoundingClientRect());let bad=0;for(let i=0;i<b.length;i++)for(let j=i+1;j<b.length;j++){const a=b[i],c=b[j];if(a.left<c.right-1&&a.right>c.left+1&&a.top<c.bottom-1&&a.bottom>c.top+1)bad++}return{n:b.length,bad}});
// ---- 1. signed-out profile is pre-rendered, cover first ----
const pub=await mk();
const raw=await (await pub.request.get(B+"/p/c1")).text();
ok(/<div id="pre11"><section class="px">/.test(raw)&&/px-cover/.test(raw),"signed-out /p/c1 HTML already contains the profile cover");
ok(/<link rel="?preload"? as="?image"?[^>]*fetchpriority="?high/.test(raw),"cover photo is preloaded with high priority");
ok(!/<link[^>]+rel=["']?(preload|modulepreload)["']?[^>]+\/js\//.test(raw),"no script preloads compete with the cover");
ok(!/<script[^>]*>[^<]*<script/i.test(raw.slice(raw.indexOf('id="pre11"'),raw.indexOf('id="pre11"')+20000).replace(/<script>if\(location[\s\S]*?<\/script>/,"")),"pre-rendered cover has no injected scripts");
await pub.goto(B+"/p/c1",{waitUntil:"networkidle"});await pub.waitForTimeout(3500);
ok(pub.lz.length===0,"profile page never downloads the lazy home-log/board/moderation/marketing code");
ok(await pub.$(".g12 [data-g12]")!==null&&await pub.$("#prices")!==null,"full profile takes over after load (portfolio + prices)");
ok(!(await pub.evaluate(()=>typeof h12Csv==="function")),"home-log code is not in the profile page");
await shot(pub,"desktop-pro-profile");
let m=await labelsClear(pub);ok(m.n>=3&&m.bad===0,"c1 map: "+m.n+" town names, none overlap");
await (await pub.$(".usmap")).scrollIntoViewIfNeeded();await pub.waitForTimeout(200);await shot(pub,"desktop-map-c1");
await pub.goto(B+"/p/c9",{waitUntil:"networkidle"});await pub.waitForTimeout(800);m=await labelsClear(pub);ok(m.bad===0,"c9 map: "+m.n+" town names, none overlap");
await pub.goto(B+"/",{waitUntil:"networkidle"});await pub.waitForTimeout(3000);ok(pub.lz.length===0,"home page doesn't download the lazy code either");
// ---- 2. pros without their own photos ----
await pub.goto(B+"/p/c3",{waitUntil:"networkidle"});await pub.waitForTimeout(800);
ok(await pub.$(".g12-soon")!==null&&/Job photos coming soon/.test(await txt(pub,".g12-soon")),"pro without a portfolio shows 'Job photos coming soon'");
ok(await pub.$(".g12-soon a[href*='post']")!==null,"empty state offers 'Request a quote'");
ok(await pub.$(".gallery")===null&&await pub.$("section.v2pro")===null,"no stock 'Recent work' or before/after photos");
ok((await pub.$$eval(".px-cover img",x=>x.map(i=>i.alt))).every(a=>a===""),"stock cover photos carry no made-up captions");
const fr=await pub.evaluate(()=>({f:(document.body.innerText.match(/Fast responder/g)||[]).length,r:(document.body.innerText.match(/Rapid responder/g)||[]).length}));ok(!(fr.f&&fr.r),"no 'Fast responder' + 'Rapid responder' double badge");
ok(!/undefined|NaN/.test(await txt(pub,"main")),"c3 profile text is clean");
await shot(pub,"desktop-photos-coming-soon");
// search cards: own photo with its caption, or a plain trade image with no caption
await nav(pub,"/find");const cards=await pub.$$eval(".pc-img",x=>x.map(d=>{const i=d.querySelector("img");return{img:!!i,s:i?i.getAttribute("src")||"":"",a:i?i.alt:"",tile:!!d.querySelector(".pc13-tile")}}));
ok(cards.length>=4&&cards.every(c=>c.img?(/\/img\/g-|\/u\//.test(c.s)&&c.a.length>0):c.tile),"search cards: own photos with captions, otherwise a 'photos coming soon' tile ("+cards.length+")");
ok(cards.some(c=>c.tile)&&cards.some(c=>c.img),"search mixes real portfolios and honest placeholders, no repeated stock photos");
await shot(pub,"desktop-search");
// ---- 3. mobile ----
const mob=await mk(390);await mob.goto(B+"/p/c2",{waitUntil:"networkidle"});await mob.waitForTimeout(800);
m=await labelsClear(mob);ok(m.bad===0,"mobile c2 map: "+m.n+" town names, none overlap");ok(await noX(mob),"mobile profile fits the screen");
await (await mob.$(".usmap")).scrollIntoViewIfNeeded();await mob.waitForTimeout(200);await shot(mob,"mobile-map-c2");
await mob.goto(B+"/p/c3",{waitUntil:"networkidle"});await mob.waitForTimeout(800);ok(await noX(mob),"mobile c3 fits");await mob.$eval(".g12-soon",e=>e.scrollIntoView({block:"center"}));await shot(mob,"mobile-photos-coming-soon");
// ---- 4. lazy pages load when opened, as each role ----
const lazy=async(email,route,sel,name,w=1300)=>{const p=await as(email,w);await nav(p,route);await p.waitForSelector(sel,{timeout:8000}).catch(()=>{});
 ok(await p.$(sel)!==null,route+" loads its code on demand and renders ("+email.split("@")[0]+", "+w+"px)");ok(p.lz.length>=1,route+" fetched the lazy bundle");
 ok(!/undefined|NaN/.test(await txt(p,"main")),route+" text is clean");if(w<500)ok(await noX(p),route+" fits a phone");await shot(p,name,w<500);return p};
const cu=await lazy("demo-homeowner@sawyer.test","/homelog",".h12-k","desktop-home-log");
ok(await cu.evaluate(()=>typeof h12Csv==="function"),"home-log code present after opening it");
await nav(cu,"/homelog/warranty");await cu.click("#h12Add");await cu.waitForTimeout(300);ok(await cu.$("#h12F")!==null,"warranty form opens from the lazy code");
await lazy("demo-homeowner@sawyer.test","/homelog",".h12-k","mobile-home-log",390);
const pm=await lazy("demo-pm@sawyer.test","/board",".b12",  "desktop-project-board");
await lazy("demo-pm@sawyer.test","/board",".b12","mobile-project-board",390);
await lazy("demo-trust@sawyer.test","/mod",".mod12","desktop-moderation");
const pro=await lazy("demo-pro@sawyer.test","/office/grow","#em12c, #rr12F, #pc12","desktop-marketing");
// ---- 5. dashboards open with their own header ----
for(const [e,n] of [["demo-homeowner","homeowner"],["demo-pro","pro"],["demo-pm","pm"],["demo-business","business"],["demo-remodeler","remodeler"]]){
 for(const w of [1300,390]){const p=await as(e+"@sawyer.test",w);await nav(p,"/dash");
  const o=await p.evaluate(()=>{const h=document.querySelector("main header.uh, main .uh");if(!h)return{h:0};const d=document.querySelector(".v13-dtop");const firstNa=document.querySelector("main .na8");return{h:1,ok:!firstNa||!!(h.compareDocumentPosition(firstNa)&Node.DOCUMENT_POSITION_FOLLOWING),dup:document.querySelectorAll("main .uh").length,boards:[...document.querySelectorAll("main .na8 a, main .na8 button")].filter(x=>/Project board/.test(x.textContent)).length}});
  ok(o.h&&o.ok&&o.dup===1,n+" dashboard ("+w+"px) starts with its own header, next steps below");if(n==="pm")ok(o.boards<=1,"pm dashboard lists the project board once");
  if(w<500)ok(await noX(p),n+" dashboard fits a phone");if(w===1300&&(n==="pm"||n==="homeowner"))await shot(p,"desktop-dash-"+n);if(w<500&&n==="pro")await shot(p,"mobile-dash-pro",true);await p.context().close()}}
// ---- 6. QA sweep-1 Medium/Low fixes ----
const q=await mk();await q.goto(B+"/#/no-such-page");await q.waitForTimeout(900);
ok((await q.$$eval("h1",x=>x.map(e=>e.textContent))).join("|")==="Page not found"&&/^Page not found · Sawyer/.test(await q.title()),"unknown routes: one H1 'Page not found' and a matching title (SW-011/022)");
await q.goto(B+"/#/find");await q.waitForTimeout(900);ok((await q.$$("h1")).length===1&&await q.$(".fx-res h2")!==null&&(await q.$$("main main, #app main")).length===0,"Find: one H1, results under an H2, no nested main (SW-011)");
ok(await q.$('#fRapid[role="button"][aria-pressed]')!==null,"Rapid responder toggle is a button role (SW-012)");
const foot=await txt(q,"#foot");ok(!/real beta users|Demo prototype/.test(foot)&&/fictional sample data/.test(foot),"footer copy is accurate about the fictional seed (SW-014/020)");
ok(await q.evaluate(()=>getComputedStyle(document.body).fontFamily.startsWith('"Plus Jakarta Sans"')),"font family is named Plus Jakarta Sans (SW-023)");
ok(await q.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue("--bg").trim().toUpperCase()==="#F8F6F1"),"light theme background is linen (SW-013)");
ok(!(await q.evaluate(()=>JSON.stringify(DB.users.map(u=>u.name)))).match(/Fakeson|Placeholder|Testwell|Mockler|Faux|Dummy|Testcase|Sampleton|Mocksen|Notreal|Pretend|Imagin|Fictional|Synthetic|Pseudo|Notaname|Madeup|Sparkfake|Placebo|Fakowski/),"seed names read as real people (SW-024)");
const up=await q.evaluate(async()=>{const r=await fetch("/api/upload",{method:"POST",headers:{"Content-Type":"image/png"},body:"x"});return [r.status,(await r.json()).status]});ok(up[0]===401&&up[1]===401,"signed-out upload returns HTTP 401 (SW-019) "+up);
ok((await q.request.get(B+"/icons/icon-dark-512.png")).status()===404,"unused dark icon no longer shipped (SW-025)");
ok(!(await cu.evaluate(()=>A.updatePro({bio:"hacked"}))).ok,"homeowners can't use the pro-profile editor (SW-017)");
// ---- 7. QA sweep-2 validation (SW-035..SW-038) ----
{const pp=await as("demo-pro@sawyer.test",1300);await nav(pp,"/dash");
 const g0=await pp.evaluate(()=>(DB.users.find(u=>u.id==="c1").gal12||[]).length);
 const r1=await pp.evaluate(()=>A.setGal12([{src:"/u/0123456789abcdef0123456789abcdef.jpg",cap:"x"},{src:"https://example.com/a.jpg"}]));
 const g1=await pp.evaluate(()=>(DB.users.find(u=>u.id==="c1").gal12||[]).length);
 ok(!r1.ok&&g0>0&&g1===g0,"a portfolio save with only rejected photos is refused and keeps the gallery (SW-037) "+g0+"/"+g1);
 const r2=await pp.evaluate(()=>{const keep=(DB.users.find(u=>u.id==="c1").gal12||[]);return A.setGal12(keep)});ok(r2.ok,"re-saving the existing portfolio still works");
 const jq=await pp.evaluate(()=>{const p=DB.jobs.find(j=>j.status==="posted"),h=DB.jobs.find(j=>j.status!=="posted"&&j.hired);return[A.quote(p.id,"abc"),A.quote(p.id,"99999999"),A.quote(p.id,"-50"),h?A.quote(h.id,"500"):{ok:false,msg:"none"}]});
 ok(jq.every(r=>!r.ok),"quotes reject text, negative and huge prices, and closed jobs (SW-035) "+jq.map(r=>r.msg).join(" | "));
 await pp.context().close()}
{const r=await cu.evaluate(()=>A.postJob({title:"A".repeat(200),cat:"plumbing",zip:"78704",desc:"Leaky tap"}));ok(!r.ok&&/90/.test(r.msg),"job titles are capped at 90 characters (SW-036)")}
ok(require("fs").readFileSync(__dirname+"/../app-logic.js","utf8").includes('file.size>5*1024*1024')&&require("fs").readFileSync(__dirname+"/../app-logic.js","utf8").includes('(e&&e.message)||"Upload failed'),"message photo pre-check matches the 5 MB server limit and shows the real error (SW-038)");
// ---- 8. QA sweep-2 accounts: forgot password (SW-033) and delete account (SW-034) ----
{const em="forgot13-"+Date.now()+"@example.com",post=(p,u,b)=>p.evaluate(async([u,b])=>{const r=await fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(b)});return r.json()},[u,b]);
 const code=async p=>{await p.click("#au-send");await p.waitForSelector("#tcVal");const c=(await p.textContent("#tcVal")).trim();await p.fill("#au-code",c);await p.click("#au-verify")};
 const p=await mk();await p.goto(B+"/#/signup");await p.waitForSelector("#authBox");await p.check("input[name=au-role][value=homeowner]",{force:true});await p.fill("#au-to",em);await code(p);
 await p.waitForFunction(()=>!!DB.me,null,{timeout:8000});ok((await post(p,"/api/account/password",{password:"first-pass-123"})).ok,"new account sets a password");
 await post(p,"/api/logout",{});await p.goto(B+"/#/signup");await p.reload();await p.waitForSelector("#authBox");
 await p.evaluate(()=>{const d=document.getElementById("pwSection");if(d)d.open=true});ok(await p.isVisible("#liForgot"),"password sign-in has a 'Forgot password?' link (SW-033)");
 await p.fill("#li-e",em);await p.click("#liForgot");ok((await p.inputValue("#au-to"))===em,"forgot password pre-fills the one-time code form");await code(p);
 await p.waitForSelector("#npw",{timeout:8000});await p.waitForTimeout(900);await p.waitForSelector("#npw");ok(/#\/account/.test(await p.evaluate(()=>location.hash)),"after the code, the account page opens Set a password");
 await p.fill("#npw","second-pass-456");await p.click("#npwGo");await p.waitForTimeout(500);await post(p,"/api/logout",{});
 ok((await post(p,"/api/login",{email:em,password:"second-pass-456"})).ok&&!(await post(p,"/api/login",{email:em,password:"first-pass-123"})).ok,"the new password works and the old one doesn't");
 await p.goto(B+"/#/account");await p.reload();await p.waitForSelector("#delGo",{timeout:8000});const uid=await p.evaluate(()=>DB.me);
 await p.click("#delGo");await p.waitForSelector("#delTxt");ok(await p.isDisabled("#delYes"),"delete stays disabled until you type DELETE (SW-034)");
 await p.fill("#delTxt","DELETE");await p.click("#delYes");await p.waitForTimeout(1500);
 const after=await p.evaluate(async id=>{const s=(await (await fetch("/api/state")).json()).state;const u=(s.users||[]).find(x=>x.id===id)||{};return{me:s.me||null,name:u.name,role:u.role,email:u.email||null}},uid);
 ok(!after.me&&after.name==="Former Sawyer member"&&after.role==="deleted"&&!after.email,"deleting signs you out and anonymizes the profile "+JSON.stringify(after));
 ok(!(await post(p,"/api/login",{email:em,password:"second-pass-456"})).ok,"a deleted account can't sign in");
 const dp=await as("demo-homeowner@sawyer.test");ok(/can't be deleted/.test((await post(dp,"/api/account/delete",{confirm:"DELETE"})).error||""),"shared demo accounts can't be deleted");
 ok(await dp.evaluate(()=>typeof A.__delete13==="function")&&/Unknown action/.test(JSON.stringify(await post(dp,"/api/act",{name:"__delete13",args:[]}))),"the delete action isn't reachable through /api/act");
 await dp.context().close();await p.context().close()}
// signed-in profile is the live app, not the pre-render
const sraw=await (await cu.request.get(B+"/p/c1")).text();ok(!/id="pre11"/.test(sraw),"signed-in visitors get the live profile, not the pre-rendered one");
ok(errs.length===0,"no page errors ("+errs.length+")"+(errs.length?": "+errs.slice(0,3).join(" | "):""));
await br.close();console.log(fail?`\n${fail} FAILED`:"\nALL PASS");process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(1)});
