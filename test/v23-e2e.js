// v23 end-to-end. Self-contained: starts its own Sawyer server (local test mode) and a public-host simulation (RENDER=1).
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v23-"));
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
// Covers: SW-055 (responsive prerendered /p/<id> cover + preload, kept through hydration), /pro/<id> first HTML like
// /p/<id>, view-specific first-HTML titles for /job/<id> and /compare/<id>, the signed-out /find prerender, legacy #/ links,
// Covers: SW-056 and the shared title helper (first-HTML <title> === document.title after mount on every pretty route,
// "Sign up · Sawyer" on /signup, no tagline appended after mount), the signed-out /job/<id> prerender (public info only,
// never on /compare/<id> or for signed-in visitors), the -sm headshot copies, health 2.6.0-sawyer and SW cache sawyer-v23.
let LOCAL=null,PUB=null,br=null;
const tt=h=>((h.match(/<title>([^<]*)<\/title>/)||[])[1]||"").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,"<").replace(/&gt;/g,">");
const ROUTES=[["/","Sawyer — Hire pros you'd trust with your house."],["/find","Find pros · Sawyer"],["/find?cat=Plumbing","Find pros · Sawyer"],["/prices","Price guide · Sawyer"],["/faq","FAQ · Sawyer"],["/credits","Photo credits · Sawyer"],["/signup","Sign up · Sawyer"],["/pricing","Pricing · Sawyer"],["/pros","For pros · Sawyer"],["/about","About · Sawyer"],["/jobs","Job board · Sawyer"],["/post","Request a pro · Sawyer"],["/travel","Traveling electricians · Sawyer"],["/join","Pro signup · Sawyer"],["/pro/c1",/^Bluebonnet Plumbing & Drain: Plumbing in .+ · Sawyer$/],["/p/c1",/^Bluebonnet Plumbing & Drain: Plumbing in .+ · Sawyer$/],["/job/j1","Water heater leaking, replace 40-gal · Sawyer"],["/compare/j1","Compare bids: Water heater leaking, replace 40-gal · Sawyer"],["/pro/nope-x","Pro profile · Sawyer"],["/t/tcd1",/^.+: .+ · Sawyer$/]];
const match=(t,want)=>want instanceof RegExp?want.test(t):t===want;
(async()=>{try{
 LOCAL=await startApp(await freePort(),{});
 PUB=await startApp(await freePort(),{RENDER:"true"});
 br=await chromium.launch();
 const errs=[];
 const page=async(w,js)=>{const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900},javaScriptEnabled:js!==false});const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return p};
 const hz=(await req(LOCAL.port,"GET","/healthz")).json||{};ok(hz.v==="2.6.0-sawyer","healthz reports 2.6.0-sawyer",J(hz));
 const sw=await req(LOCAL.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v23"/.test(sw.body),"service worker cache is sawyer-v23");

 // ===== 1-2. first-HTML titles (local and public host) =====
 const first={};
 for(const S of [LOCAL,PUB]){const tag=S===PUB?"public":"local";
  for(const [u,want] of ROUTES){const r=await req(S.port,"GET",u);const t=tt(r.body);if(S===LOCAL)first[u]=t;
   ok(r.status===200&&match(t,want),tag+" "+u+": first-HTML title",r.status+" "+t);
   if(u!=="/")ok(!/Hire pros you'd trust/i.test(t),tag+" "+u+": no tagline in a view title",t)}
  const su=await req(S.port,"GET","/signup");ok(!/<title>Join · Sawyer/.test(su.body),tag+" SW-056: /signup no longer says Join")}

 // ===== the app keeps exactly the first-HTML title after it mounts =====
 for(const w of [1440,390]){const p=await page(w);
  for(const [u] of ROUTES){if(w===390&&!["/","/find","/signup","/prices","/job/j1","/p/c1"].includes(u))continue;
   await p.goto(LOCAL.B+u);await p.waitForSelector("#app h1, #app h2",{timeout:15000});await p.waitForTimeout(500);
   const t=await p.title();ok(t===first[u],w+" "+u+": title after mount matches the first HTML",J({first:first[u],now:t}))}
  // in-app navigation uses the same helper
  await p.goto(LOCAL.B+"/");await p.waitForSelector("#app h1");const a=p.locator('a[href="/find"]:visible').first();
  if(await a.count()){await a.click();await p.waitForFunction(()=>location.pathname==="/find");await p.waitForTimeout(400);ok(await p.title()==="Find pros · Sawyer",w+" in-app nav to /find sets 'Find pros · Sawyer'",await p.title())}
  else{await p.evaluate(()=>{history.pushState(null,"","/signup");dispatchEvent(new PopStateEvent("popstate"))});await p.waitForTimeout(500);ok(await p.title()==="Sign up · Sawyer",w+" in-app nav to /signup sets 'Sign up · Sawyer'",await p.title())}
  await p.context().close()}

 // ===== 3. signed-out /job/<id> prerender =====
 const lg=await req(LOCAL.port,"POST","/api/login",JH,J({email:"demo-homeowner@sawyer.test",password:"sawyer-demo-2026"}));const ck=(String(lg.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0];
 const own=(lg.json&&lg.json.state)||{};const me=own.me;const mine=new Set((own.jobs||[]).filter(j=>j.cust===me).map(j=>j.id));
 const secrets=(own.quotes||[]).filter(q=>mine.has(q.job)&&q.note&&q.note.length>12).map(q=>q.note.slice(0,24));
 ok(!!ck&&mine.has("j1")&&secrets.length>=1,"owner sees private quote notes on j1 (baseline for the leak check)",J({me,n:secrets.length}));
 for(const S of [LOCAL,PUB]){const tag=S===PUB?"public":"local";
  for(const id of ["j1","j2"]){const r=await req(S.port,"GET","/job/"+id);const h=r.body;const pre=(h.match(/<div id="pre11">[\s\S]*$/)||[""])[0];
   const h1=(pre.match(/<h1[^>]*>([^<]*)<\/h1>/)||[])[1]||"";
   ok(r.status===200&&/<div id="pre11">/.test(h)&&!/class="sk11/.test(h),tag+" /job/"+id+": first HTML has the real job page instead of the skeleton");
   ok(h1&&tt("<title>"+h1+"</title>")+" · Sawyer"===tt(h),tag+" /job/"+id+": the prerendered H1 matches the title",h1+" | "+tt(h));
   ok(/<header class="top[^"]*" id="top">[\s\S]*?<\/header>/.test(h)&&!/<header class="top" id="top"><\/header>/.test(h),tag+" /job/"+id+": first HTML has the site header");
   ok(!/<link rel="preload" href="\/js\//.test(h),tag+" /job/"+id+": no app-script preloads compete with the first paint");
   const body=pre.replace(/<script[\s\S]*?<\/script>/g,"");ok(!/<script/i.test(body.split("</main>")[0]),tag+" /job/"+id+": no scripts inside the prerendered job");
   ok(!secrets.some(s=>h.includes(s))&&!/escrow|"cases"/i.test(body),tag+" /job/"+id+": no owner-only data (quote notes, escrow, cases) in public HTML")}
  {const r=await req(S.port,"GET","/compare/j1");ok(r.status===200&&!/<div id="pre11">/.test(r.body)&&!secrets.some(s=>r.body.includes(s)),tag+" /compare/j1 is never prerendered and carries no quote notes")}
  {const r=await req(S.port,"GET","/job/nope-x");ok(r.status===200&&!/<div id="pre11">/.test(r.body)&&tt(r.body)==="Job · Sawyer",tag+" /job/nope-x falls back to the app shell",tt(r.body))}}
 {const r=await req(LOCAL.port,"GET","/job/j1",{Cookie:ck});ok(r.status===200&&!/<div id="pre11">/.test(r.body),"signed in: /job/j1 is not prerendered")}
 for(const w of [1440,390]){
  {const p=await page(w);await p.goto(LOCAL.B+"/job/j2");await p.waitForSelector("#app h1");await p.waitForTimeout(800);
   const o=await p.evaluate(()=>({pre:!!document.getElementById("pre11"),h1:document.querySelectorAll("h1").length,t:(document.querySelector("#app h1")||{}).textContent,title:document.title,ow:document.documentElement.scrollWidth>innerWidth+1,cta:!!document.querySelector("#app .btn")}));
   ok(!o.pre&&o.h1===1&&o.title===o.t+" · Sawyer"&&!o.ow&&o.cta,w+" /job/j2: the app mounts over the prerender (one H1, same title, no overflow)",J(o));await p.context().close()}
  {const p=await page(w,false);await p.goto(LOCAL.B+"/job/j2");const o=await p.evaluate(()=>({h1:(document.querySelector("main h1")||{}).textContent||"",vis:getComputedStyle(document.querySelector("main h1")||document.body).visibility}));ok(o.h1.length>3&&o.vis==="visible",w+" /job/j2 paints the job with JS off",J(o));await p.context().close()}}

 // ===== 4. -sm headshot copies =====
 for(const n of [1,2,3]){const r=await req(LOCAL.port,"GET","/img/pro-"+n+"-sm.webp");ok(r.status===200&&/image\/webp/.test(r.headers["content-type"]||""),"/img/pro-"+n+"-sm.webp is served",r.status)}
 {const r=await req(LOCAL.port,"GET","/find");const t=(r.body.match(/<img\b[^>]*src="\/img\/pro-\d\.webp"[^>]*>/)||[])[0]||"";ok(/srcset="\/img\/pro-\d-sm\.webp 240w, \/img\/pro-\d\.webp 480w"/.test(t)&&/\ssizes="/.test(t),"/find headshots carry srcset with the -sm copy",t)}

 ok(errs.length===0,"no page errors",J(errs.slice(0,5)));
}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL);await stopApp(PUB)}
 console.log(failed?"FAIL v23-e2e: "+failed+" failed":"PASS v23-e2e: all checks passed");process.exit(failed?1:0)})();
