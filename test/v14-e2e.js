// v14 end-to-end: QA retest-1 fixes (SW-039 review author ids stay with the parties, SW-040 HTML 404 fits a phone)
// 
// usage: node test/v14-e2e.js http://localhost:8899 [shotdir]   (NODE_PATH must include playwright)
const {chromium}=require("playwright");const fs=require("fs"),path=require("path"),os=require("os"),cp=require("child_process");
const B=(process.argv[2]||"http://localhost:8899").replace(/\/$/,"");const OUT=process.argv[3]||"";let fail=0;const errs=[];
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)fail++};
if(OUT)fs.mkdirSync(OUT,{recursive:true});
const PW="sawyer-demo-2026",run=Date.now().toString(36);
async function req(base,p,{method="GET",body,cookie}={}){const h={};if(body!==undefined)h["Content-Type"]="application/json";if(cookie)h.Cookie=cookie;
 const r=await fetch(base+p,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body),redirect:"manual"});const t=await r.text();let j=null;try{j=JSON.parse(t)}catch(e){}
 const sc=(r.headers.get("set-cookie")||"").match(/swsid=([^;]*)/);return{code:r.status,j,t,cookie:sc&&sc[1]?"swsid="+sc[1]:null}}
const login=(email,base=B,pw=PW)=>req(base,"/api/login",{method:"POST",body:{email,password:pw}});
const act=(cookie,name,args,base=B)=>req(base,"/api/act",{method:"POST",cookie,body:{name,args}});
const signup=(kind,data,base=B)=>req(base,"/api/signup",{method:"POST",body:{kind,password:"v14-pass-"+run,data}});
(async()=>{const br=await chromium.launch();
const mk=async(w=1300)=>{const c=await br.newContext({viewport:{width:w,height:w<500?844:900},deviceScaleFactor:w<500?2:1});const p=await c.newPage();
 p.on("pageerror",e=>errs.push(String(e).slice(0,200)));p.on("console",m=>{if(m.type()==="error"&&!/Failed to load resource/.test(m.text()))errs.push(m.text().slice(0,200))});p.on("dialog",d=>d.accept());return p};
const as=async(email,w=1300)=>{const p=await mk(w);await p.goto(B+"/");const r=await p.evaluate(async e=>{const o=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,password:"sawyer-demo-2026"})});return o.json()},email);if(!r.ok)throw Error("login failed "+email);await p.reload();await p.waitForTimeout(400);return p};
const nav=async(p,r)=>{await p.goto(B+"/#"+r);await p.reload();await p.waitForTimeout(900)};
const shot=async(p,n,full)=>{if(OUT)await p.screenshot({path:OUT+"/"+n+".png",fullPage:!!full})};
const noX=p=>p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1);

// ---- SW-039: review author ids ----
{const s=(await req(B,"/api/state")).j.state;const ids=new Set(s.users.map(u=>u.id));const rv=s.reviews||[];
 ok(rv.length>0,"signed-out snapshot still has reviews ("+rv.length+")");
 ok(rv.every(r=>!ids.has(r.uid)),"signed-out: no review carries a real user id",JSON.stringify(rv.filter(r=>ids.has(r.uid)).slice(0,2)));
 ok(rv.every(r=>/^rv-/.test(r.uid)),"signed-out: author is a per-review token (rv-…)");
 ok(new Set(rv.map(r=>r.uid)).size===rv.length,"tokens don't link reviews by the same author");
 ok(rv.every(r=>typeof r.an==="string"&&/^\S+( \S\.)?$/.test(r.an)),"signed-out: short display name only (e.g. 'Pat H.')",JSON.stringify(rv.slice(0,3).map(r=>r.an)));
 const raw=await (await fetch(B+"/p/c1")).text();const i0=raw.indexOf("window.__ST=")+12;let st=null;
 try{const e0=raw.indexOf("</script>",i0);st=JSON.parse(raw.slice(i0,e0).replace(/;\s*$/,""))}catch(e){}
 ok(st&&st.reviews&&st.reviews.length&&st.reviews.every(r=>/^rv-/.test(r.uid)&&!ids.has(r.uid)),"signed-out /p/c1 inline state: reviews carry tokens, not user ids");
 ok(!/data-uid="(u|b|m)\d+"/.test(raw),"signed-out /p/c1 prerender has no customer ids in markup");
 // parties keep the author
 const H=await login("demo-homeowner@sawyer.test");const hs=H.j.state;const mine=hs.reviews.filter(r=>r.uid===hs.me);
 ok(mine.length>0,"the author still sees their own reviews with their id ("+mine.length+")");
 ok(hs.reviews.filter(r=>r.uid!==hs.me&&r.cid!==hs.me).every(r=>/^rv-/.test(r.uid)),"another customer's reviews are tokenized for a signed-in non-party");
 const P=await login("demo-pro@sawyer.test");const ps=P.j.state;const about=ps.reviews.filter(r=>r.cid===ps.me);
 ok(about.length>0&&about.every(r=>!/^rv-/.test(r.uid)&&ps.users.some(u=>u.id===r.uid)),"the reviewed pro sees who wrote each of their reviews");
 ok(ps.reviews.filter(r=>r.cid!==ps.me).every(r=>/^rv-/.test(r.uid)),"a pro doesn't get author ids on other pros' reviews");
 // the UI shows the short name for non-parties
 const pub=await mk();await pub.goto(B+"/p/c1",{waitUntil:"networkidle"});await pub.waitForTimeout(1200);
 const names=await pub.$$eval("article.review header b",bs=>bs.map(b=>b.textContent.trim()));
 ok(names.length>0&&names.every(n=>/^\S+ \S\.$|^Customer$|^Former Sawyer member$/.test(n)),"signed-out profile shows reviewer names as 'First L.'",JSON.stringify(names.slice(0,4)));
 await shot(pub,"sw039-profile-reviews",true);
 const hp=await as("demo-homeowner@sawyer.test");await nav(hp,"/dash");
 // a party view still renders the full author on the job page of a reviewed job
 const rj=hs.reviews.find(r=>r.uid===hs.me&&r.job);if(rj){await nav(hp,"/job/"+rj.job);const n=await hp.textContent("article.review header b").catch(()=>"");ok(/\S+ \S{2,}/.test(n),"job party sees the author's full name on the job page",n)}
 await hp.context().close();await pub.context().close()}

// ---- SW-040: HTML 404 fits a 390px phone, branded ----
for(const p0 of ["/homelog-nope","/p/nope-404","/does-not-exist"]){const r=await fetch(B+p0);const t=await r.text();
 ok(r.status===404&&/<title>Page not found · Sawyer<\/title>/.test(t)||(p0.startsWith("/p/")&&r.status===404),p0+" is an HTML 404",r.status);}
for(const w of [390,320,1440]){const p=await mk(w);await p.goto(B+"/does-not-exist",{waitUntil:"networkidle"});
 ok(await noX(p),"404 page has no horizontal scroll at "+w+"px",await p.evaluate(()=>document.documentElement.scrollWidth+" vs "+document.documentElement.clientWidth));
 ok(await p.$("main h1")!==null&&await p.$("main a.brand svg")!==null,"404 page has one H1 and the house logo at "+w+"px");
 const ff=await p.evaluate(()=>getComputedStyle(document.body).fontFamily);ok(/Plus Jakarta Sans/.test(ff),"404 page uses Plus Jakarta Sans",ff);
 const bg=await p.evaluate(()=>getComputedStyle(document.body).backgroundColor);ok(bg==="rgb(247, 246, 243)","404 page background is linen",bg);
 if(w===390)await shot(p,"sw040-404-390");await p.context().close()}

ok(errs.length===0,"zero console/page errors"+(errs.length?" :: "+errs.slice(0,3).join(" | "):""));
await br.close();console.log(fail?fail+" FAILED":"ALL PASS");process.exit(fail?1:0)})().catch(e=>{console.error("FAIL crashed:",e);process.exit(1)});
