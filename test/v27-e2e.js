// v27 end-to-end. Self-contained: starts its own Sawyer server (local test mode) and a public-host simulation (RENDER=1).
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v27-"));
 const env=Object.assign({},process.env,{HOST:"127.0.0.1",PORT:String(port),DATA_DIR:dir,RATE_X:"50"});
 for(const k of ["NODE_ENV","RENDER","AUTH_TEST_MODE","STAFF_DEMO_PASSWORD","RESEND_API_KEY","SENDGRID_API_KEY","EMAIL_FROM","MAIL_FROM","RESEND_API_URL","TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_FROM","TWILIO_MESSAGING_SERVICE_SID","TEST_NOW","SAWYER_BASE_URL","PUBLIC_URL","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","APPLE_CLIENT_ID","MICROSOFT_CLIENT_ID","FACEBOOK_APP_ID"])if(!extra||!(k in extra))delete env[k];
 if(extra)Object.assign(env,extra);
 const child=spawn(process.execPath,[path.join(ROOT,"server.js")],{env,stdio:["ignore","pipe","pipe"]});
 let log="";child.stdout.on("data",d=>{log+=d});child.stderr.on("data",d=>{log+=d});
 return new Promise((res,no)=>{const t=setTimeout(()=>no(new Error("server did not start\n"+log.slice(-400))),15000);
  const wait=()=>{if(/live on/.test(log)){clearTimeout(t);res({child,dir,log:()=>log,port,B:"http://127.0.0.1:"+port})}else setTimeout(wait,30)};
  child.on("exit",c=>{clearTimeout(t);no(new Error("server exited "+c+"\n"+log.slice(-400)))});wait()})}
function stopApp(s){return new Promise(res=>{if(!s)return res();const done=()=>{try{fs.rmSync(s.dir,{recursive:true,force:true})}catch(e){}res()};s.child.on("exit",done);s.child.kill("SIGTERM");setTimeout(()=>{try{s.child.kill("SIGKILL")}catch(e){}},3000)})}
function req(port,method,p,headers,body){return new Promise((res,no)=>{const r=http.request({hostname:"127.0.0.1",port,path:p,method,headers:headers||{}},rs=>{const ch=[];rs.on("data",c=>ch.push(c));rs.on("end",()=>{let buf=Buffer.concat(ch);const enc=rs.headers["content-encoding"];if(enc==="gzip")buf=zlib.gunzipSync(buf);else if(enc==="br")buf=zlib.brotliDecompressSync(buf);let json=null;try{json=JSON.parse(buf.toString("utf8"))}catch(e){}res({status:rs.statusCode,headers:rs.headers,body:buf.toString("utf8"),json,raw:buf})})});r.on("error",no);if(body)r.write(body);r.end()})}
const J=o=>JSON.stringify(o),JH={"Content-Type":"application/json"};
const toasts=p=>p.evaluate(()=>[...document.querySelectorAll("#toasts .toast")].map(t=>t.textContent.trim()));
// Covers: /join for a signed-in pro (server 302 + in-app) and the dashboard "Finish your profile" guided flow; the job board
// as a pipeline (why it fits, distance, spots left, two-tap quote, Office-estimate prefill); "not hired" notices with the
// owner's optional reason (visible only to that pro); /pros Thumbtack and Jobber columns; the /prices labeled example photo
// (SEO image-alt parity); health and SW cache (any Sawyer version, checked exactly in the current release suite).
let LOCAL=null,PUB=null,br=null;
const pre=h=>(h.match(/<div id="pre11">[\s\S]*$/)||[""])[0].replace(/<script[\s\S]*?<\/script>/g,"");
const login=async(port,email,pw)=>{const r=await req(port,"POST","/api/login",JH,J({email,password:pw||"sawyer-demo-2026"}));return {ck:(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0],st:(r.json&&r.json.state)||{}}};
const stateOf=r=>(r.json&&(r.json.state||r.json))||{};
const act=async(port,ck,name,args)=>{const r=await req(port,"POST","/api/act",Object.assign({Cookie:ck},JH),J({name,args}));return {res:(r.json&&r.json.res)||{},st:stateOf(r),status:r.status}};
(async()=>{try{
 LOCAL=await startApp(await freePort(),{});
 PUB=await startApp(await freePort(),{RENDER:"true"});
 br=await chromium.launch();
 const errs=[];
 const page=async(w,js,cookie,S)=>{const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900},javaScriptEnabled:js!==false});
  if(cookie){const [k,v]=cookie.split("=");await c.addCookies([{name:k,value:v,url:(S||LOCAL).B}])}
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return p};
 const hz=(await req(LOCAL.port,"GET","/healthz")).json||{};ok(/^2\.\d+\.\d+-sawyer$/.test(hz.v),"healthz reports a Sawyer version",J(hz));
 const sw=await req(LOCAL.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v\d+"/.test(sw.body),"service worker cache is versioned");

 // ===== 1. /join for a signed-in pro + guided setup =====
 const pro=await login(LOCAL.port,"demo-pro@sawyer.test"),ho=await login(LOCAL.port,"demo-homeowner@sawyer.test");
 {const r=await req(LOCAL.port,"GET","/join",{Cookie:pro.ck});ok(r.status===302&&r.headers.location==="/dash?setup=1","server: signed-in pro GET /join is a 302 to /dash?setup=1",r.status+" "+r.headers.location);
  const c=await req(LOCAL.port,"GET","/join",{Cookie:ho.ck});ok(c.status===200,"server: a signed-in customer still gets /join (200)",c.status);
  const s=await req(LOCAL.port,"GET","/join");ok(s.status===200,"server: signed-out /join is 200",s.status)}
 for(const w of [1440,390]){const p=await page(w,true,pro.ck);await p.goto(LOCAL.B+"/join",{waitUntil:"networkidle"});await p.waitForSelector("#v27guide");await p.waitForTimeout(300);
  const o=await p.evaluate(()=>({url:location.pathname+location.search,t:document.getElementById("v27guide").innerText.replace(/\s+/g," "),steps:[...document.querySelectorAll(".v27g-s")].map(s=>s.dataset.step+":"+s.className.replace(/\s+/g," ").trim()),wiz:/step 1 of 6/i.test(document.getElementById("app").innerText),h1:document.querySelectorAll("h1").length,ow:document.documentElement.scrollWidth>innerWidth+1,top:Math.round(document.getElementById("v27guide").getBoundingClientRect().top)}));
  ok(o.url==="/dash?setup=1"&&!o.wiz&&o.h1===1&&!o.ow,w+" pro opening /join lands on /dash?setup=1 (no blank wizard, one H1, no overflow)",J(o));
  ok(/nothing to sign up for again/.test(o.t)&&/Step 1 of 3: Add 3 job photos/.test(o.t)&&/0 of 3 added/.test(o.t)&&/2\/3/.test(o.t),w+" guided flow: note, current step is photos (0 of 3), 2/3 done",o.t.slice(0,240));
  ok(o.steps.length===3&&/^photos:.*\bon\b/.test(o.steps[0])&&/done/.test(o.steps[1])&&/done/.test(o.steps[2]),w+" three steps (photos current, price and Verified done)",J(o.steps));
  ok(o.top>=0&&o.top<400,w+" the setup flow is scrolled into view",o.top);
  if(w===1440){await p.click('[data-v27g="g12"]');await p.waitForSelector("#modal .mbox");ok(/photo/i.test(await p.textContent("#modal")),"'Add photos' opens the portfolio editor");await p.keyboard.press("Escape");
   await p.goto(LOCAL.B+"/find",{waitUntil:"networkidle"});await p.evaluate(()=>go("join"));await p.waitForTimeout(500);
   ok(await p.evaluate(()=>location.pathname+location.search==="/dash?setup=1"&&!!document.getElementById("v27guide")),"in-app navigation to /join also goes to the setup flow")}
  await p.context().close()}
 {const p=await page(1440,true,ho.ck);await p.goto(LOCAL.B+"/join",{waitUntil:"networkidle"});await p.waitForTimeout(300);ok(/step 1 of 6/i.test(await p.textContent("#app"))&&!(await p.$("#v27guide")),"a signed-in customer still sees the pro signup wizard on /join");await p.context().close()}
 {const p=await page(1440,true,null);await p.goto(LOCAL.B+"/join",{waitUntil:"networkidle"});await p.waitForTimeout(300);ok(/step 1 of 6/i.test(await p.textContent("#app")),"signed out /join is the normal wizard");await p.context().close()}
 // a brand-new pro starts at 0/3 with photos first; no guide once everything is done is covered by the "done" classes above
 const run=Math.random().toString(36).slice(2,8),npw="v27-correct-horse";
 const su=await req(LOCAL.port,"POST","/api/signup",JH,J({kind:"pro",password:npw,data:{name:"Vee Tester",biz:"V27 Plumbing "+run,email:"v27-"+run+"@example.com",trade:"Plumbing",zip:"78704",phone:"5125550100",plan:"founding"}}));
 const npro={ck:(String(su.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0]};ok(su.status===200&&!!npro.ck,"a new plumbing pro signs up (78704)",su.status+" "+(su.json&&su.json.error));
 {const p=await page(1440,true,npro.ck);await p.goto(LOCAL.B+"/dash",{waitUntil:"networkidle"});await p.waitForSelector("#v27guide");const t=(await p.textContent("#v27guide")).replace(/\s+/g," ");
  ok(/0\/3/.test(t)&&/Step 1 of 3: Add 3 job photos/.test(t)&&!/nothing to sign up for again/.test(t),"a new pro's dashboard shows the guided flow at 0/3 (no 'already have an account' note without ?setup=1)",t.slice(0,160));
  // full request: j1 already has 3 pros, so the new pro sees "Full" and no quote button
  await p.goto(LOCAL.B+"/jobs",{waitUntil:"networkidle"});const card=await p.evaluate(()=>{const a=document.querySelector('#app a.jobcard[href$="/job/j1"]');const c=a&&a.closest(".v27jc");return c?{t:c.innerText.replace(/\s+/g," "),q:!!c.querySelector("[data-v27q]")}:null});
  ok(card&&/Full: 3 of 3 pros/.test(card.t)&&!card.q&&/You list water heaters|Your trade: Plumbing/.test(card.t),"new pro: j1 card says why it fits and 'Full: 3 of 3 pros', no quote button",J(card));await p.context().close()}

 // ===== 2. pipeline cards + two-tap quote =====
 const pj=await act(LOCAL.port,ho.ck,"postJob",[{title:"V27 water heater pilot light keeps going out",cat:"Plumbing",sub:"Water heaters",desc:"Gas 50-gallon, pilot goes out every few days.",zip:"78704",budget:"$200–600",when:"This week"}]);
 const JP=pj.res&&pj.res.id;ok(pj.res.ok&&JP,"homeowner posts a plumbing job for the pipeline test",J(pj.res));
 for(const w of [1440,390]){const p=await page(w,true,pro.ck);await p.goto(LOCAL.B+"/jobs",{waitUntil:"networkidle"});await p.waitForSelector(".v27jc");
  const cs=await p.evaluate(()=>[...document.querySelectorAll(".v27jc")].map(c=>({h:(c.querySelector("a.jobcard")||{}).getAttribute("href"),t:c.querySelector(".v27p").innerText.replace(/\s+/g," "),q:!!c.querySelector("[data-v27q]")})));
  const j1=cs.find(c=>/\/job\/j1$/.test(c.h)),j4=cs.find(c=>/\/job\/j4$/.test(c.h));
  ok(j1&&/You list water heaters/.test(j1.t)&&/Inside your \d+ mi radius/.test(j1.t)&&/≈ \d+ mi away/.test(j1.t)&&/You're in · 3 of 3 pros/.test(j1.t)&&/You quoted \$1,450/.test(j1.t),w+" /jobs j1 card: fit (service, radius), distance, spots, own quote",J(j1));
  ok(j4&&/≈ \d+ mi away/.test(j4.t)&&/3 of 3 spots left/.test(j4.t)&&j4.q,w+" /jobs j4 card: distance, '3 of 3 spots left', Quote button",J(j4));
  const ow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);ok(!ow,w+" /jobs pipeline cards: no sideways scroll");
  if(w===390){await p.goto(LOCAL.B+"/dash",{waitUntil:"networkidle"});await p.waitForSelector(".v27jc");const d=await p.evaluate(()=>({sub:(document.querySelector(".v27p-sub")||{}).textContent||"",n:document.querySelectorAll(".v27jc [data-v27q], .v27jc .v27p").length}));
   ok(/Quote in two taps/.test(d.sub)&&d.n>0,"dashboard 'New jobs in your area' uses the pipeline cards",J(d));
   // two taps from the dashboard: Quote -> Send quote
   const btn=await p.$(`.v27jc [data-v27q="${JP}"]`);ok(!!btn,"dashboard has a Quote button for the new plumbing job");
   if(btn){await btn.click();await p.waitForSelector("#v27qf");const f=await p.evaluate(()=>({p:document.getElementById("v27qp").value,d:document.getElementById("v27qd").value,n:document.getElementById("v27qn").value,est:!!document.getElementById("v27es")}));
    ok(+f.p>0&&+f.d>0&&f.n.length>20,"quote sheet is prefilled (price, start days, note)",J(f));ok(f.est,"quote sheet offers 'Start from an Office estimate'");
    await p.click("#v27qs");await p.waitForTimeout(500);const st=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:pro.ck}));const q=(st.quotes||[]).find(x=>x.job===JP&&x.cid===st.me);
    ok(q&&q.price===+f.p&&q.days===+f.d,"second tap sends the quote (price and days saved)",J(q));
    ok(/You quoted/.test(await p.evaluate(jp=>{const a=document.querySelector('#app a.jobcard[href$="/job/'+jp+'"]');return a?a.closest(".v27jc").innerText:""},JP)),"the card now shows 'You quoted'")}}
  await p.context().close()}
 // Office estimate prefill on the job page quote modal (j2 is open; quote modal from the job page)
 {const p=await page(1440,true,pro.ck);await p.goto(LOCAL.B+"/job/j4",{waitUntil:"networkidle"});const b=await p.$("#doQuote");if(b){await b.click();await p.waitForSelector("#qf");
   const has=!!(await p.$("#v27es"));ok(has,"job-page quote modal offers 'Start from an Office estimate'");
   if(has){const v=await p.$$eval("#v27es option",x=>x.map(e=>e.value).filter(Boolean));await p.selectOption("#v27es",v[0]);const o=await p.evaluate(()=>({p:document.getElementById("qp").value,n:document.getElementById("qn").value}));
    ok(+o.p>0&&/^From estimate EST-\d+: /.test(o.n),"picking an estimate fills the price and line items",J(o))}}else ok(false,"job page has a quote button for the demo pro on j4");await p.context().close()}

 // ===== 3. not hired: optional reason, visible only to the pros it went to =====
 {const st=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:ho.ck}));const qs=(st.quotes||[]).filter(q=>q.job==="j1");const win=qs.find(q=>q.cid!=="c1");
  ok(qs.length===3&&!!win,"j1 has 3 quotes before hiring",J(qs.map(q=>q.cid)));
  const long=await act(LOCAL.port,ho.ck,"hire",["j1",win.cid,"x".repeat(141)]);ok(long.res.ok===false&&/140/.test(long.res.msg||""),"a reason over 140 characters is refused (nothing hired)",J(long.res));
  const p=await page(1440,true,ho.ck);await p.goto(LOCAL.B+"/job/j1",{waitUntil:"networkidle"});await p.click(`[data-hire="${win.cid}"]`);await p.waitForSelector("#v27hf");
  ok(await p.evaluate(()=>document.getElementById("v27hoF").offsetParent===null),"hire dialog: the free-text line is hidden until 'Something else' is picked");
  await p.selectOption("#v27hw","They could start sooner");await p.click("#cfHire");await p.waitForTimeout(600);await p.context().close();
  const ps=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:pro.ck}));const myq=(ps.quotes||[]).find(q=>q.job==="j1"&&q.cid===ps.me);
  ok(myq&&myq.status==="declined"&&myq.why==="They could start sooner","the pro who wasn't picked gets the reason on their quote",J(myq));
  ok((ps.notifs||[]).some(n=>n.link==="job:j1"&&/This job was filled/.test(n.text)&&/They could start sooner/.test(n.text)),"in-app notice (bell) names the reason",J((ps.notifs||[]).filter(n=>n.link==="job:j1").map(n=>n.text)));
  const other=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:(await login(LOCAL.port,"demo-remodeler@sawyer.test")).ck}));
  ok(!(other.quotes||[]).filter(q=>q.job==="j1").some(q=>"why" in q),"another pro (not on j1) never gets the reason",J((other.quotes||[]).filter(q=>q.job==="j1")));
  for(const S of [LOCAL]){const pub=stateOf(await req(S.port,"GET","/api/state"));ok(!J(pub.quotes||[]).includes("start sooner")&&!(pub.quotes||[]).some(q=>"why" in q),"signed-out /api/state has no reasons")}
  for(const w of [1440,390]){const pp=await page(w,true,pro.ck);await pp.goto(LOCAL.B+"/job/j1",{waitUntil:"networkidle"});await pp.waitForSelector("#v27nh");const t=(await pp.textContent("#v27nh")).replace(/\s+/g," ");
   ok(/You weren't hired this time/.test(t)&&/Their note: “They could start sooner”/.test(t)&&/See open Plumbing jobs/.test(t),w+" job page: 'You weren't hired this time' with the note",t);
   await pp.goto(LOCAL.B+"/dash",{waitUntil:"networkidle"});await pp.waitForSelector("#v27lost");const d=(await pp.textContent("#v27lost")).replace(/\s+/g," ");
   ok(/Not hired this time/.test(d)&&/Water heater leaking/.test(d)&&/They could start sooner/.test(d),w+" dashboard 'Not hired this time' card",d.slice(0,200));
   ok(!(await pp.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),w+" dashboard: no sideways scroll");await pp.context().close()}
  // the hired pro sees no "not hired" notice
  const wst=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:ho.ck}));ok((wst.jobs||[]).find(j=>j.id==="j1").hired===win.cid,"j1 is hired to the chosen pro")}

 // ===== 4. /pros: Thumbtack and Jobber columns =====
 for(const S of [LOCAL,PUB])for(const w of [1440,390]){const p=await page(w,true,null,S);await p.goto(S.B+"/pros",{waitUntil:"networkidle"});await p.waitForSelector("#vs");
  const o=await p.evaluate(()=>{const t=document.querySelector("#vs table");return{hd:[...t.querySelectorAll("thead th")].map(x=>x.textContent.trim()),rows:t.querySelectorAll("tbody tr").length,txt:document.getElementById("vs").innerText.replace(/\s+/g," "),ow:document.documentElement.scrollWidth>innerWidth+1,h1:document.querySelectorAll("h1").length}});
  ok(o.hd.slice(1).join("|")==="Sawyer|Thumbtack|Jobber"&&o.rows===6,(S===PUB?"public ":"local ")+w+" /pros comparison has Sawyer, Thumbtack and Jobber columns, 6 rows",J(o.hd));
  ok(/pay per lead/i.test(o.txt)&&/No built-in lead marketplace/.test(o.txt)&&/Monthly plans priced above \$20/.test(o.txt)&&/checked November 2026/.test(o.txt)&&!/Instant Book/i.test(o.txt),(S===PUB?"public ":"local ")+w+" claims are general and dated (pay per lead, no lead marketplace, above $20, no Instant Book)");
  ok(!o.ow&&o.h1===1,(S===PUB?"public ":"local ")+w+" /pros: no overflow, one H1",J({ow:o.ow,h1:o.h1}));await p.context().close()}

 // ===== 5. /prices: labeled example photo (SEO image-alt parity) =====
 for(const S of [LOCAL,PUB]){const h=pre((await req(S.port,"GET","/prices")).body);ok(/<img class="v27qc-ph"[^>]*src="\/img\/g-water-heater-sm\.webp"[^>]*alt="Example of plumbing work \(stock photo\)"[^>]*width="400" height="300"/.test(h),(S===PUB?"public":"local")+" /prices prerender has the labeled example photo",(h.match(/<img class="v27qc-ph[^>]*>/)||[""])[0])}
 for(const w of [1440,390]){const p=await page(w);await p.goto(LOCAL.B+"/prices",{waitUntil:"networkidle"});await p.waitForFunction(()=>!document.getElementById("pre11"));await p.waitForSelector("#v27qcPh");
  const a=await p.evaluate(()=>({imgs:[...document.querySelectorAll("img")].filter(i=>!i.hasAttribute("alt")).length,n:document.querySelectorAll("#app img").length}));ok(a.n>=1&&a.imgs===0,w+" /prices after hydration: has an image and every image has alt text",J(a));
  await p.selectOption("#v26qj","Roofing");await p.waitForTimeout(200);const r=await p.evaluate(()=>{const i=document.getElementById("v27qcPh");return{src:i.getAttribute("src"),alt:i.alt,ok:i.complete&&i.naturalWidth>0}});
  ok(/t-roofing-sm\.webp$/.test(r.src)&&r.alt==="Example of roofing work (stock photo)",w+" photo follows the job picker (roofing)",J(r));
  await p.fill("#v26qa","1500");await p.waitForTimeout(60);ok(/Your quote: \$1,500/.test(await p.textContent("#v26qO")),w+" quote check still works with the photo");await p.context().close()}

 // ===== 6. perf: signed-out /pros and /jobs arrive prerendered (heading paints before the app JS) =====
 for(const S of [LOCAL,PUB])for(const v of ["pros","jobs"]){const r=await req(S.port,"GET","/"+v);const h=pre(r.body);
  ok(r.status===200&&/<div id="pre11">/.test(r.body)&&(h.match(/<h1[\s>]/g)||[]).length===1&&!/<link rel="preload" href="\/js\//.test(r.body),(S===PUB?"public":"local")+" signed-out /"+v+" is prerendered (one H1, app JS not preloaded)",r.status);
  ok(!/@sawyer\.test|swsid|"me":"/.test(h),(S===PUB?"public":"local")+" /"+v+" prerender has no account data")}
 {const r=await req(LOCAL.port,"GET","/jobs",{Cookie:pro.ck});ok(!/<div id="pre11">/.test(r.body),"signed-in /jobs is not prerendered");
  const q=await req(LOCAL.port,"GET","/jobs?cat=Plumbing");ok(!/<div id="pre11">/.test(q.body),"/jobs with a query is not prerendered")}
 for(const v of ["pros","jobs"])for(const w of [1440,390]){const p=await page(w);await p.addInitScript(()=>{window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:"layout-shift",buffered:true})}catch(e){}});
  await p.goto(LOCAL.B+"/"+v,{waitUntil:"networkidle"});await p.waitForFunction(()=>!document.getElementById("pre11"));await p.waitForTimeout(300);
  const o=await p.evaluate(()=>({h1:document.querySelectorAll("h1").length,cls:window.__cls,ow:document.documentElement.scrollWidth>innerWidth+1}));
  ok(o.h1===1&&o.cls<0.1&&!o.ow,w+" /"+v+" hydrates in place (one H1, CLS < 0.1, no overflow)",J(o));await p.context().close()}

 ok(errs.length===0,"no page errors",J(errs.slice(0,5)));
}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL);await stopApp(PUB)}
 console.log(failed?"FAIL v27-e2e: "+failed+" failed":"PASS v27-e2e: all checks passed");process.exit(failed?1:0)})();
