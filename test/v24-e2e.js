// v24 end-to-end. Self-contained: starts its own Sawyer server (local test mode) and a public-host simulation (RENDER=1).
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v24-"));
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
// Covers: SW-057 (signup divider and small muted labels: no body tracking, extra word space, divider never squeezes),
// shorter traveler-call titles ("<call> · <town, ST> · Sawyer", identical in first HTML and after mount), the public job
// panel for pros and homeowners (prerendered, public data only, right CTA for open vs full jobs, hidden for the owner
// and for pros), measured median reply time on profiles, health 2.7.0-sawyer and SW cache sawyer-v24.
let LOCAL=null,PUB=null,br=null;
const tt=h=>((h.match(/<title>([^<]*)<\/title>/)||[])[1]||"").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,"<").replace(/&gt;/g,">");
const login=async(port,email)=>{const r=await req(port,"POST","/api/login",JH,J({email,password:"sawyer-demo-2026"}));return {ck:(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0],st:(r.json&&r.json.state)||{}}};
(async()=>{try{
 LOCAL=await startApp(await freePort(),{});
 PUB=await startApp(await freePort(),{RENDER:"true"});
 br=await chromium.launch();
 const errs=[];
 const page=async(w,js,cookie)=>{const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900},javaScriptEnabled:js!==false});
  if(cookie){const [k,v]=cookie.split("=");await c.addCookies([{name:k,value:v,url:LOCAL.B}])}
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return p};
 const hz=(await req(LOCAL.port,"GET","/healthz")).json||{};ok(hz.v==="2.7.0-sawyer","healthz reports 2.7.0-sawyer",J(hz));
 const sw=await req(LOCAL.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v24"/.test(sw.body),"service worker cache is sawyer-v24");

 // ===== 1. SW-057: the signup divider reads as separate words =====
 for(const w of [1440,390]){const p=await page(w);await p.goto(LOCAL.B+"/signup");await p.waitForSelector(".v3or span");await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);
  const o=await p.evaluate(()=>{const s=document.querySelector(".v3or span"),c=getComputedStyle(s),t=s.firstChild;
   // width of each real space in "or get … by email", measured with a Range on the text node
   const gaps=[];const txt=t&&t.nodeType===3?t.textContent:"";for(let i=0;i<txt.length;i++)if(txt[i]===" "){const r=document.createRange();r.setStart(t,i);r.setEnd(t,i+1);gaps.push(+r.getBoundingClientRect().width.toFixed(2))}
   const fam=getComputedStyle(document.body).fontFamily;
   return {text:s.textContent,ls:c.letterSpacing,ws:parseFloat(c.wordSpacing)||0,wsp:c.whiteSpace,fs:c.flexShrink,minGap:Math.min(...gaps),sw:s.scrollWidth,cw:s.clientWidth,ow:document.documentElement.scrollWidth>innerWidth+1,jakarta:/Jakarta/.test(fam)&&document.fonts.check("13px 'Plus Jakarta Sans'")}});
  ok(/^or get a one-time code( by email)?$/.test(o.text),w+" signup divider text is exact ('by email' when text codes are off, as on the public host)",J(o));
  ok((o.ls==="normal"||o.ls==="0px")&&o.ws>=1.5&&o.wsp==="nowrap"&&o.fs==="0",w+" SW-057: divider has no negative tracking, extra word space, nowrap and no shrink",J(o));
  ok(o.jakarta&&o.minGap>=3.6,w+" SW-057: every space in the divider is at least 3.6px wide (was about 2.8px) in Plus Jakarta Sans",J(o));
  ok(o.sw<=o.cw+1&&!o.ow,w+" divider is not clipped and the page has no sideways scroll",J(o));
  await p.close()}
 {// the public host shows the full "… by email" line (text codes are off there)
  const p=await br.newPage({viewport:{width:390,height:844}});await p.goto(PUB.B+"/signup");await p.waitForSelector(".v3or span");await p.evaluate(()=>document.fonts.ready);
  const o=await p.evaluate(()=>{const s=document.querySelector(".v3or span");return {t:s.textContent,sw:s.scrollWidth,cw:s.clientWidth,ow:document.documentElement.scrollWidth>innerWidth+1,ws:getComputedStyle(s).wordSpacing}});
  ok(o.t==="or get a one-time code by email"&&o.sw<=o.cw+1&&!o.ow&&parseFloat(o.ws)>=1.5,"public 390 /signup: 'or get a one-time code by email' fits with the extra word space",J(o));await p.close()}
 {// other small muted labels drop the body's negative tracking too
  const p=await page(1440);await p.goto(LOCAL.B+"/p/c1");await p.waitForSelector("#app .px-stats small");await p.waitForTimeout(300);
  const o=await p.evaluate(()=>{const bad=[];for(const e of document.querySelectorAll("#app small")){const c=getComputedStyle(e);if(c.textTransform==="uppercase")continue;const ls=parseFloat(c.letterSpacing)||0;if(ls<0&&parseFloat(c.fontSize)<=13.5)bad.push(e.textContent.slice(0,30)+" "+c.letterSpacing)}return {n:document.querySelectorAll("#app small").length,bad:bad.slice(0,5)}});
  ok(o.n>3&&o.bad.length===0,"small muted labels on a profile have no negative tracking",J(o));await p.close()}

 // ===== 2. traveler-call titles =====
 const T1="Hyperscale data center: journeyman wiremen · Ashburn, VA · Sawyer";
 for(const S of [LOCAL,PUB]){const tag=S===PUB?"public":"local";
  const r=await req(S.port,"GET","/t/tcd1");const t=tt(r.body);ok(r.status===200&&t===T1,tag+" /t/tcd1 first-HTML title is the short form",t);
  const og=((r.body.match(/<meta property="og:title" content="([^"]*)"/)||[])[1]||"").replace(/&amp;/g,"&");ok(og===T1,tag+" /t/tcd1 og:title matches",og);
  for(const id of ["tcd2","tcd3","tcd4","tcd5","tcd6"]){const x=tt((await req(S.port,"GET","/t/"+id)).body);ok(/^[^·]+ · [^·]+, [A-Z]{2} · Sawyer$/.test(x)&&(x.match(/:/g)||[]).length<=1&&!/\(demo\)/i.test(x),tag+" /t/"+id+": one colon at most, no (demo), town and state",x)}}
 for(const w of [1440,390]){const p=await page(w);for(const id of ["tcd1","tcd2"]){const first=tt((await req(LOCAL.port,"GET","/t/"+id)).body);await p.goto(LOCAL.B+"/t/"+id);await p.waitForSelector("#app h1");await p.waitForTimeout(500);
   const t=await p.title(),h1=await p.textContent("#app h1");ok(t===first,w+" /t/"+id+": title after mount matches the first HTML",J({first,t}));ok(/\(demo\)/.test(h1),w+" /t/"+id+": the page itself still marks the call as a demo",h1)}
  // in-app navigation to a call sets the same short title
  await p.goto(LOCAL.B+"/travel");await p.waitForSelector("#app h1");await p.evaluate(()=>{history.pushState(null,"","/t/tcd1");dispatchEvent(new PopStateEvent("popstate"))});await p.waitForTimeout(600);
  ok(await p.title()===T1,w+" in-app nav to /t/tcd1 sets the short title",await p.title());await p.context().close()}

 // ===== 3. public job panel =====
 const own=await login(LOCAL.port,"demo-homeowner@sawyer.test");const me=own.st.me;const mine=new Set((own.st.jobs||[]).filter(j=>j.cust===me).map(j=>j.id));
 const secrets=(own.st.quotes||[]).filter(q=>mine.has(q.job)&&q.note&&q.note.length>12).map(q=>q.note.slice(0,24));
 ok(!!own.ck&&mine.has("j1")&&secrets.length>=1,"owner sees private quote notes on j1 (baseline for the leak check)",J({me,n:secrets.length}));
 for(const S of [LOCAL,PUB]){const tag=S===PUB?"public":"local";
  {const h=(await req(S.port,"GET","/job/j1")).body;const pre=(h.match(/<div id="pre11">[\s\S]*$/)||[""])[0];
   ok(/<div class="v24pub">/.test(pre),tag+" /job/j1: the pro + homeowner panel is in the first HTML");
   ok(!/Sign in to quote/.test(h)&&/href="\/jobs\?cat=Plumbing"[^>]*>See open Plumbing jobs/.test(pre),tag+" /job/j1 (full): points pros to open Plumbing jobs instead of 'Sign in to quote'");
   ok(/href="\/post\?cat=Plumbing&amp;sub=Water%20heaters"[^>]*>Post a similar job/.test(pre)||/href="\/post\?cat=Plumbing&(amp;)?sub=Water(%20|\+)heaters"/.test(pre),tag+" /job/j1: 'Post a similar job' carries the trade",(pre.match(/href="\/post[^"]*"/)||[""])[0]);
   ok(/<img class="v24-ph"[^>]*alt="Example of Plumbing work"[^>]*loading="lazy"/.test(pre)&&/src="\/img\/[a-z0-9-]+\.webp"/.test((pre.match(/<img class="v24-ph"[^>]*>/)||[""])[0]),tag+" /job/j1: a real example photo, labeled as an example, lazy-loaded");
   ok(/Typical for [^<]{3,60} near Austin, TX/.test(pre)&&/\$[\d,]+ – \$[\d,]+/.test(pre),tag+" /job/j1: typical local price range shown");
   ok(!secrets.some(s=>h.includes(s))&&!/escrow|"cases"/i.test(pre.replace(/<script[\s\S]*?<\/script>/g,"")),tag+" /job/j1: still no owner-only data in public HTML")}
  {const h=(await req(S.port,"GET","/job/j2")).body;ok(/href="\/signup\?next=%2Fjob%2Fj2"[^>]*>Sign in to send a quote/.test(h)&&/3 spots left on this one/.test(h),tag+" /job/j2 (open): 'Sign in to send a quote' and the spots left",(h.match(/href="\/signup[^"]*"/)||[""])[0])}
  {const h=(await req(S.port,"GET","/job/x1")).body;ok(/<div class="v24pub">/.test(h)&&/This one's taken/.test(h)&&!/Sign in to (send a )?quote/.test(h),tag+" /job/x1 (completed): no quote button, points to open jobs")}}
 for(const w of [1440,390]){
  {const p=await page(w);await p.goto(LOCAL.B+"/job/j1");await p.waitForSelector("#app .v24pub");await p.waitForTimeout(600);
   const o=await p.evaluate(()=>({pre:!!document.getElementById("pre11"),h1:document.querySelectorAll("h1").length,h2:[...document.querySelectorAll("#app .v24pub h2")].map(x=>x.textContent),title:document.title,ow:document.documentElement.scrollWidth>innerWidth+1,img:(()=>{const i=document.querySelector("#app .v24-ph");return i?{alt:i.alt,w:Math.round(i.getBoundingClientRect().width)}:null})()}));
   ok(!o.pre&&o.h1===1&&o.h2.length===2&&o.title==="Water heater leaking, replace 40-gal · Sawyer"&&!o.ow&&o.img&&o.img.w>100,w+" /job/j1: app mounts with the panel (one H1, two H2s, same title, no overflow)",J(o));
   await p.click("#app .v24pub a:has-text('Post a similar job')");await p.waitForFunction(()=>location.pathname==="/post");await p.waitForSelector("#app h1, #app h2");ok(/cat=Plumbing/.test(p.url()),w+" 'Post a similar job' opens the request flow for that trade",p.url());
   await p.context().close()}
  {const p=await page(w,false);await p.goto(LOCAL.B+"/job/j2");const n=await p.$$eval("main .v24pub .v24c",x=>x.length);ok(n===2,w+" /job/j2 paints both panel cards with JS off",n);await p.context().close()}}
 {const p=await page(1440,true,own.ck);await p.goto(LOCAL.B+"/job/j1");await p.waitForSelector("#app h1");await p.waitForTimeout(500);ok(!(await p.$("#app .v24pub")),"the job owner doesn't see the public panel");await p.context().close()}
 {const pro=await login(LOCAL.port,"demo-pro@sawyer.test");const p=await page(1440,true,pro.ck);await p.goto(LOCAL.B+"/job/j2");await p.waitForSelector("#app h1");await p.waitForTimeout(500);ok(!(await p.$("#app .v24pub")),"a signed-in pro sees the normal quote tools, not the panel");await p.context().close()}

 // ===== 4. measured reply time on profiles =====
 for(const w of [1440,390]){const p=await page(w);await p.goto(LOCAL.B+"/p/c1");await p.waitForSelector("#app .px-stats");await p.waitForTimeout(400);
  const o=await p.evaluate(()=>{const d=[...document.querySelectorAll("#app .px-stats>div")].map(x=>({b:(x.querySelector("b")||{}).textContent,s:(x.querySelector("small")||{}).textContent}));const t=document.querySelector("#app").innerText;return {d,med:(t.match(/Median first reply ([^\n]+)/)||[])[1]||"",usually:(t.match(/Usually replies [^\n]+/g)||[])}});
  const st=o.d.find(x=>x.s==="median reply");ok(!!st&&st.b===o.med.trim()&&/min|hr/.test(st.b),w+" /p/c1: the reply stat is the measured median",J(o));
  ok(o.usually.every(x=>!/within an hour/.test(x)),w+" /p/c1: 'Usually replies' lines use the measured time",J(o.usually));await p.close()}
 {const p=await page(1440);await p.goto(LOCAL.B+"/p/c6");await p.waitForSelector("#app .px-stats");await p.waitForTimeout(300);
  const s=await p.$$eval("#app .px-stats small",x=>x.map(e=>e.textContent));ok(s.includes("typical reply")&&!s.includes("median reply"),"a pro with no measured replies keeps the stated reply time",J(s));await p.context().close()}

 ok(errs.length===0,"no page errors",J(errs.slice(0,5)));
}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL);await stopApp(PUB)}
 console.log(failed?"FAIL v24-e2e: "+failed+" failed":"PASS v24-e2e: all checks passed");process.exit(failed?1:0)})();
