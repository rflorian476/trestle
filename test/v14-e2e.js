// v14 end-to-end: QA retest-1 fixes (SW-039 review author ids stay with the parties, SW-040 HTML 404 fits a phone)
// plus v14 features: fair-price check on quotes and bid comparison, traveler-first dashboard, first-contact message cap.
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

// ---- Fair-price check ----
{const C=await signup("customer",{name:"Fair Price "+run,email:"v14-cust-"+run+"@example.com",zip:"78704"});ok(C.code===200&&C.cookie,"throwaway customer signs up",C.code);
 const r=await act(C.cookie,"postJob",[{title:"Replace 50-gallon water heater "+run.slice(-4),cat:"Plumbing",desc:"Old tank is rusting at the base, want a new one installed with permit.",zip:"78704"}]);
 const jid=r.j&&r.j.res&&r.j.res.id;ok(!!jid,"customer posts a water-heater job",JSON.stringify(r.j&&r.j.res));
 const job=r.j.state.jobs.find(j=>j.id===jid);ok(job&&job.est11&&job.est11.low>=1000,"stored typical range uses the job-specific cost (water heater ≥ $1,000)",JSON.stringify(job&&job.est11));
 // pro D: no quote yet, sees the range once and quotes through the normal form (jobs take 3 quotes)
 {const D=await signup("pro",{name:"Fair Pro d",biz:"Fair Plumbing D "+run,email:"v14-pro-d-"+run+"@example.com",trade:"Plumbing",zip:"78704"});
  for(const w of [1300,390]){const dp=await mk(w);await dp.goto(B+"/");await dp.context().addCookies([{name:"swsid",value:D.cookie.split("=")[1],url:B}]);await nav(dp,"/job/"+jid);
   ok((await dp.$$("[id=doQuote]")).length===1&&(await dp.$$(".fp14-band")).length===1,"pro before quoting: one band, one Send a quote button ("+w+"px)",(await dp.$$("[id=doQuote]")).length+"/"+(await dp.$$(".fp14-band")).length);
   {const bt=await dp.textContent(".fp14-band").catch(()=>"");ok(/: \$[\d,]+ – \$[\d,]+/.test(bt)&&await dp.$(".fp14-band #doQuote")===null,"band text keeps its dollar amounts and holds no form markup",bt)}
   ok(await dp.$(".w11-jrange")===null,"only one typical-range line on the page");
   if(w===1300){await dp.click("#doQuote");await dp.fill("#qp","1650");await dp.fill("#qd","2");await dp.fill("#qn","50-gal tank, haul-away, permit");await dp.click("#qf button.primary");await dp.waitForTimeout(800);
    const st=(await req(B,"/api/state",{cookie:D.cookie})).j.state;const q=st.quotes.find(x=>x.job===jid&&x.cid===st.me);ok(q&&q.price===1650&&/haul-away/.test(q.note||""),"pro quotes $1,650 through the form (in range)",JSON.stringify(q))}
   await dp.context().close()}}
 const pros=[];for(const [k,price] of [["a",9800],["b",300]]){const P=await signup("pro",{name:"Fair Pro "+k,biz:"Fair Plumbing "+k.toUpperCase()+" "+run,email:"v14-pro-"+k+"-"+run+"@example.com",trade:"Plumbing",zip:"78704"});
  const q=await act(P.cookie,"quote",[jid,price,"Price includes haul-away "+k]);ok(q.j&&q.j.res&&q.j.res.ok,"pro "+k+" quotes $"+price,JSON.stringify(q.j&&q.j.res));pros.push(P)}
 const p=await mk();await p.goto(B+"/");await p.context().addCookies([{name:"swsid",value:C.cookie.split("=")[1],url:B}]);await nav(p,"/job/"+jid);
 const band=await p.textContent(".fp14-band").catch(()=>"");ok(/Typical for this job near Austin, TX: \$[\d,]+ – \$[\d,]+/.test(band),"owner sees the typical range above the quotes",band);
 const chips=await p.$$eval(".quote .fp14",cs=>cs.map(c=>c.className.replace("fp14 ","")+":"+c.textContent.trim()));
 ok(chips.length===3,"every quote gets a price check chip ("+chips.length+")",JSON.stringify(chips));
 ok(chips.some(c=>/fp14-ok:In typical range/.test(c)),"$1,650 (form quote) reads 'In typical range'",JSON.stringify(chips));
 ok(chips.some(c=>/fp14-hi2:Well above typical/.test(c)),"$9,800 reads 'Well above typical'",JSON.stringify(chips));
 ok(chips.some(c=>/fp14-lo:Well below typical/.test(c)),"$300 reads 'Well below typical'",JSON.stringify(chips));
 ok(await p.$eval(".quote .fp14-hi2",e=>!!e.getAttribute("title")),"chips explain themselves on hover (title)");
 await shot(p,"fair-price-job",true);
 await nav(p,"/compare/"+jid);const cc=await p.$$eval(".cmp .fp14",cs=>cs.length);ok(cc===3&&(await p.$$(".fp14-band")).length===1,"compare bids shows the range once and a chip per bid ("+cc+")");
 await shot(p,"fair-price-compare",true);
 const m=await mk(390);await m.goto(B+"/");await m.context().addCookies([{name:"swsid",value:C.cookie.split("=")[1],url:B}]);await nav(m,"/job/"+jid);
 ok(await noX(m)&&(await m.$$(".quote .fp14")).length===3,"price chips fit at 390px");await shot(m,"fair-price-job-390",true);await m.context().close();
 // a pro sees the range before quoting, never the other bids' checks
 const pp=await mk();await pp.goto(B+"/");await pp.context().addCookies([{name:"swsid",value:pros[0].cookie.split("=")[1],url:B}]);await nav(pp,"/job/"+jid);
 ok(await pp.$(".fp14-band")!==null,"the quoting pro sees the typical range");ok((await pp.$$(".quote .fp14")).length<=1,"a pro only sees a check on their own quote");await pp.context().close();
 // after hire the labels go away (never relabel a hired job)
 const hire=await act(C.cookie,"hire",[jid,pros[0].j.state.me]);ok(hire.j.res&&hire.j.res.ok,"customer hires pro A",JSON.stringify(hire.j.res));
 await nav(p,"/job/"+jid);ok(await p.$(".fp14")===null&&await p.$(".fp14-band")===null,"hired job no longer shows price checks");await p.context().close();
 // price guide now agrees with the job-specific range
 const g=await mk();await nav(g,"/prices");const wh=await g.$$eval(".p11-ex li",ls=>(ls.find(l=>/water heater/i.test(l.textContent))||{}).textContent||"");
 const lo=+((wh.match(/\$([\d,]+)/)||[])[1]||"0").replace(/,/g,"");ok(lo>=1000,"price guide: 'Replace a water heater' starts at $1,000+",wh);await g.context().close()}

// ---- Traveler-first dashboard ----
{const t=await as("demo-traveler@sawyer.test");await nav(t,"/dash");
 ok(/Your travel work/.test(await t.textContent("h1").catch(()=>"")),"traveler dashboard H1 is 'Your travel work'");
 ok((await t.$$("h1")).length===1,"traveler dashboard has exactly one H1");
 ok((await t.$$(".tv14-t")).length===4,"four travel tiles (matches, applications, invites, references)");
 const best=await t.$$eval(".tv14-l a",as=>as.map(a=>a.getAttribute("href")));ok(best.length>=1&&best.every(h=>/#\/tcall\//.test(h)),"best matches link to traveler calls ("+best.length+")",JSON.stringify(best));
 const rates=await t.$$eval(".tv14-p b",bs=>bs.map(b=>b.textContent));ok(rates.length&&rates.every(x=>/^\$\d+(\.\d+)?\/hr$/.test(x)),"match rates read like $45/hr",JSON.stringify(rates));
 ok(/Traveler/.test(await t.textContent(".uh-k").catch(()=>"")),"header kicker says Traveler");
 ok(await t.$(".tv14-home h2")!==null&&await t.$(".na8")!==null,"home tools stay below under 'Your home'");
 ok(await t.$('.uh-r a[href="#/travel"]')!==null,"primary header action is Find calls");
 await shot(t,"traveler-dash",true);
 await t.click(".tv14-l a");await t.waitForTimeout(700);ok(/#\/tcall\//.test(t.url()),"tapping a match opens the call");
 await t.context().close();
 const tm=await as("demo-traveler@sawyer.test",390);await nav(tm,"/dash");ok(await noX(tm)&&(await tm.$$(".tv14-t")).length===4,"traveler dashboard fits at 390px");await shot(tm,"traveler-dash-390",true);await tm.context().close();
 const h=await as("demo-homeowner@sawyer.test");await nav(h,"/dash");ok(await h.$(".tv14")===null&&/Your home/.test(await h.textContent("h1").catch(()=>"")),"homeowners keep the 'Your home' dashboard");await h.context().close();
 const pr=await as("demo-pro@sawyer.test");await nav(pr,"/dash");ok(await pr.$(".tv14")===null,"pros don't get the traveler block");await pr.context().close()}

// ---- First-contact cap (own server: RATE_X=1, NEW_THREAD_MAX=2) ----
{const port=8990+Math.floor(Math.random()*8),base="http://127.0.0.1:"+port,dir=fs.mkdtempSync(path.join(os.tmpdir(),"sw14-"));
 const srv=cp.spawn(process.execPath,[path.join(__dirname,"..","server.js")],{env:Object.assign({},process.env,{HOST:"127.0.0.1",PORT:String(port),DATA_DIR:dir,RATE_X:"1",NEW_THREAD_MAX:"2"}),stdio:"ignore"});
 try{let up=false;for(let i=0;i<60&&!up;i++){try{up=(await fetch(base+"/healthz")).ok}catch(e){await new Promise(r=>setTimeout(r,200))}}ok(up,"cap test server starts");
  const C=await signup("customer",{name:"Cap Test",email:"v14-cap-"+run+"@example.com",zip:"78704"},base);
  const missing=m=>(m.j&&m.j.res&&m.j.res.msg)||(m.j&&m.j.error)||"";
  const missBefore=await act(C.cookie,"send",["no-such-user","x"],base);
  ok(missBefore.code!==429&&/doesn't exist/i.test(missing(missBefore)),"SW-041: a missing recipient under the cap returns the normal error, not 429",missBefore.code+" "+JSON.stringify(missBefore.j));
  const s1=await act(C.cookie,"send",["c1","Hi, can you look at a leak?"],base);ok(s1.code===200&&s1.j.res.ok!==false,"1st new conversation is allowed (a failed missing-id send did not count)",JSON.stringify(s1.j));
  const s2=await act(C.cookie,"send",["c2","Hi, can you look at a leak?"],base);ok(s2.code===200&&s2.j.res.ok!==false,"2nd new conversation is allowed");
  const s3=await act(C.cookie,"send",["c3","Hi, can you look at a leak?"],base);ok(s3.code===429&&/new conversations today/.test(s3.j.error||""),"3rd new conversation in 24 h is refused with 429",s3.code+" "+JSON.stringify(s3.j&&s3.j.error));
  ok(!s3.j.state.msgs.some(m=>m.a==="c3"||m.b==="c3"),"no thread is created when refused");
  const s4=await act(C.cookie,"send",["c1","Following up on the leak"],base);ok(s4.code===200&&s4.j.res.ok!==false,"replies in an existing thread are never capped");
  const missAfter=await act(C.cookie,"send",["no-such-user","x"],base);
  ok(missAfter.code===missBefore.code&&missAfter.code!==429&&/doesn't exist/i.test(missing(missAfter)),"SW-041: over the cap, a missing recipient still returns the same normal error, not 429",missAfter.code+" "+JSON.stringify(missAfter.j));
  const s5=await act(C.cookie,"send",["c4","hello"],base);ok(s5.code===429,"refused sends don't free up a slot");
 }finally{srv.kill();try{fs.rmSync(dir,{recursive:true,force:true})}catch(e){}}}

ok(errs.length===0,"zero console/page errors"+(errs.length?" :: "+errs.slice(0,3).join(" | "):""));
await br.close();console.log(fail?fail+" FAILED":"ALL PASS");process.exit(fail?1:0)})().catch(e=>{console.error("FAIL crashed:",e);process.exit(1)});
