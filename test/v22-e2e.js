// v22 end-to-end. Self-contained: starts its own Sawyer server (local test mode) and a public-host simulation (RENDER=1).
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v22-"));
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
// and health 2.5.0-sawyer.
let LOCAL=null,PUB=null,br=null;
const attr=(tag,k)=>(new RegExp("\\s"+k+'="([^"]*)"').exec(tag)||[])[1];
(async()=>{try{
 LOCAL=await startApp(await freePort(),{});
 PUB=await startApp(await freePort(),{RENDER:"true"});
 br=await chromium.launch();
 const errs=[];
 const page=async(B,w,js)=>{const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900},javaScriptEnabled:js!==false});const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return p};
 const hz=(await req(LOCAL.port,"GET","/healthz")).json||{};ok(hz.v==="2.5.0-sawyer","healthz reports 2.5.0-sawyer",J(hz));

 for(const S of [LOCAL,PUB]){const tag=S===PUB?"public":"local";
  // ===== 1. SW-055: responsive cover on /p/<id> and /pro/<id> =====
  for(const u of ["/p/c1","/pro/c1"]){const r=await req(S.port,"GET",u);const h=r.body;
   const pre=(h.match(/<div id="pre11">[\s\S]*?<\/section><\/div>/)||[])[0]||"";const imgs=pre.match(/<img\b[^>]*>/g)||[];
   ok(r.status===200&&imgs.length>=1,tag+" "+u+": 200 with the prerendered cover",r.status+" "+imgs.length);
   const local=imgs.filter(t=>/src="\/img\//.test(t));
   ok(local.length&&local.every(t=>/\ssrcset="[^"]*-sm\.webp 400w/.test(t)&&/\ssizes="/.test(t)),tag+" "+u+": every built-in cover photo has srcset (with the -sm copy) and sizes",J(imgs));
   ok(imgs[0]&&!/loading="lazy"/.test(imgs[0])&&/fetchpriority="high"/.test(imgs[0]),tag+" "+u+": the first cover photo is eager and high priority",imgs[0]);
   ok(imgs.slice(1).every(t=>!(/fetchpriority="high"/.test(t)&&/loading="lazy"/.test(t))),tag+" "+u+": no cover photo is both lazy and high priority");
   const pl=(h.match(/<link rel="preload" as="image"[^>]*>/g)||[]);
   ok(pl.length===1&&/href="\/img\/[a-z0-9-]+-sm\.webp"/.test(pl[0])&&attr(pl[0],"imagesrcset")===attr(imgs[0],"srcset")&&attr(pl[0],"imagesizes")===attr(imgs[0],"sizes"),tag+" "+u+": one cover preload, -sm href, imagesrcset/imagesizes identical to the first <img>",J(pl));
   ok(h.indexOf(pl[0])>h.indexOf('<meta name="viewport"'),tag+" "+u+": the image preload comes after the viewport meta");
   ok(!/<link rel="preload" href="\/js\//.test(h),tag+" "+u+": no app-script preloads compete with the cover");
   ok(/<title>Bluebonnet Plumbing &amp; Drain: Plumbing in [^<]+ · Sawyer<\/title>/.test(h),tag+" "+u+": view-specific first-HTML title",(h.match(/<title>[^<]*/)||[])[0]);
   ok(/<link rel="canonical" href="[^"]*\/p\/c1">/.test(h),tag+" "+u+": canonical is /p/c1");
   ok(/<script>window\.__ST=/.test(h),tag+" "+u+": the slim per-profile state is inlined like /p/<id>")}
  // ===== 2. job / compare titles =====
  for(const [u,re] of [["/job/j1",/<title>[^<·]+ · Sawyer<\/title>/],["/compare/j1",/<title>Compare bids: [^<]+ · Sawyer<\/title>/]]){const r=await req(S.port,"GET",u);
   ok(r.status===200&&re.test(r.body)&&!/hire pros you&#39;d trust/.test((r.body.match(/<title>[^<]*/)||[""])[0]),tag+" "+u+": 200 with a view-specific title",(r.body.match(/<title>[^<]*/)||[])[0])}
  for(const u of ["/job/nope-x","/compare/nope-x","/pro/nope-x","/find","/prices","/credits","/faq","/signup","/p/c1","/t/t1"]){const r=await req(S.port,"GET",u);ok(r.status===200||(u==="/t/t1"&&r.status===404),tag+" "+u+" is served ("+r.status+")")}
  // ===== 3. /find prerender =====
  {const r=await req(S.port,"GET","/find");const h=r.body;const pre=(h.match(/<div id="pre11">[\s\S]*$/)||[""])[0];
   ok(r.status===200&&/<div id="pre11">/.test(h)&&/<h1 class="restitle">All pros/.test(pre)&&(pre.match(/class="pcard/g)||[]).length>=3,tag+" /find: first HTML has the results heading and cards");
   ok(/<header class="top[^"]*" id="top">[\s\S]*?<\/header>/.test(h)&&!/<header class="top" id="top"><\/header>/.test(h),tag+" /find: first HTML has the site header");
   ok(/class="skel-ov gone"/.test(pre)&&!/class="skel-ov"/.test(pre),tag+" /find: the loading skeleton starts hidden");
   ok(!/<link rel="preload" href="\/js\//.test(h),tag+" /find: no app-script preloads");
   ok(/plus-jakarta-sans-600\.woff2/.test(h)&&/plus-jakarta-sans-700\.woff2/.test(h),tag+" /find: the extra font weights are preloaded");
   const r2=await req(S.port,"GET","/find?cat=Plumbing");ok(/<h1 class="restitle">Plumbing/.test(r2.body),tag+" /find?cat=Plumbing prerenders the filtered results");
   const r3=await req(S.port,"GET","/find?unknownkey=1");ok(r3.status===200&&!/<div id="pre11">/.test(r3.body),tag+" /find with an unknown query key falls back to the app render");
   const r4=await req(S.port,"GET","/find?q="+encodeURIComponent('"><img src=x onerror=alert(1)><script>alert(2)</script>'));
   ok(r4.status===200&&!/<img src=x/.test(r4.body)&&!/<script>alert/.test(r4.body),tag+" /find escapes the search text in the prerender")}
 }

 // signed-in visitors get the plain app HTML (no prerender)
 {const lg=await req(LOCAL.port,"POST","/api/login",JH,J({email:"demo-homeowner@sawyer.test",password:"sawyer-demo-2026"}));const ck=(String(lg.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0];
  for(const u of ["/find","/pro/c1"]){const r=await req(LOCAL.port,"GET",u,{Cookie:ck});ok(r.status===200&&!/<div id="pre11">/.test(r.body),"signed in: "+u+" is not prerendered")}}

 // ===== 4. in the browser =====
 for(const w of [1440,390]){
  for(const u of ["/p/c1","/pro/c1"]){const p=await page(LOCAL.B,w);
   await p.addInitScript(()=>{document.addEventListener("DOMContentLoaded",()=>{const i=document.querySelector("#pre11 .px-cover img");if(i)i.dataset.v22orig="1"})});
   await p.goto(LOCAL.B+u);await p.waitForSelector("#app h1");await p.waitForTimeout(400);
   const o=await p.evaluate(()=>{const im=[...document.querySelectorAll("#app .px-cover img")];return{kept:!!document.querySelector("#app .px-cover img[data-v22orig]"),all:im.every(i=>i.getAttribute("srcset")&&i.getAttribute("sizes")),n:im.length,title:document.title,h1:(document.querySelector("#app h1")||{}).textContent,path:location.pathname,cur:(im[0]||{}).currentSrc||""}});
   ok(o.kept&&o.all&&o.n>=1,w+" "+u+": the painted cover is kept and keeps srcset/sizes after the app mounts",J(o));
   ok(/^Bluebonnet Plumbing & Drain: Plumbing in .+ · Sawyer$/.test(o.title)&&/Bluebonnet/.test(o.h1)&&o.path===u,w+" "+u+": title and heading stay profile-specific, pretty path kept",J(o));
   if(w===390)ok(/\/img\/t-[a-z-]+(-sm)?\.webp$/.test(o.cur),"390 "+u+": the browser picked a srcset candidate",o.cur);
   await p.context().close()}
  for(const [u,re] of [["/job/j1",/^[^·]+ · Sawyer$/],["/compare/j1",/^Compare bids: .+ · Sawyer$/]]){const p=await page(LOCAL.B,w);await p.goto(LOCAL.B+u);await p.waitForSelector("#app h1, #app h2");await p.waitForTimeout(400);
   const t=await p.title();ok(re.test(t)&&!/Hire pros you'd trust/.test(t),w+" "+u+": the app keeps the view-specific title",t);await p.context().close()}
  {const p=await page(LOCAL.B,w);await p.addInitScript(()=>{document.addEventListener("DOMContentLoaded",()=>{const i=document.querySelector("#pre11 .pcard img");if(i)i.dataset.v22orig="1"})});
   await p.goto(LOCAL.B+"/find");await p.waitForSelector("#app .pcard");await p.waitForTimeout(600);
   const o=await p.evaluate(()=>({kept:!!document.querySelector("#app .pcard img[data-v22orig]"),pre:!!document.getElementById("pre11"),h1:document.querySelectorAll("h1").length,sk:(document.querySelector("#app .skel-ov")||{}).className,cards:document.querySelectorAll("#app .pcard").length,title:document.title,ow:document.documentElement.scrollWidth>innerWidth+1}));
   ok(o.kept&&!o.pre&&o.h1===1&&/gone/.test(o.sk||"")&&o.cards>=3&&/^Find pros/.test(o.title)&&!o.ow,w+" /find: app mounts over the prerender (photo kept, one H1, skeleton hidden, no overflow)",J(o));
   // filters still work after mounting
   await p.goto(LOCAL.B+"/find?cat=Plumbing");await p.waitForSelector("#app .pcard");const h=await p.textContent("#app h1");ok(/^Plumbing/.test(h),w+" /find?cat=Plumbing shows plumbing",h);
   const a=await p.$("#app .pcard a[href^='/pro/']");if(a){await a.click();await p.waitForFunction(()=>location.pathname.startsWith("/pro/"));await p.waitForSelector("#app .px-cover");ok(true,w+" a result card opens the profile in place")}else ok(false,w+" result card link found");
   await p.goBack();await p.waitForFunction(()=>location.pathname==="/find");ok(/^Plumbing/.test(await p.textContent("#app h1")),w+" back returns to the filtered results");
   await p.context().close()}
  // no-JS first paint: content is there before any app script
  {const p=await page(LOCAL.B,w,false);await p.goto(LOCAL.B+"/find");const n=await p.$$eval("main .pcard",x=>x.length);const vis=await p.$eval("main .skel-ov",e=>getComputedStyle(e).visibility);ok(n>=3&&vis==="hidden",w+" /find paints results with JS off (skeleton hidden)",n+" "+vis);await p.context().close()}
 }
 // legacy #/ links still rewrite
 {const p=await page(LOCAL.B,1440);for(const [h,want] of [["/#/find","/find"],["/#/pro/c1","/pro/c1"],["/#/job/j1","/job/j1"],["/#/compare/j1","/compare/j1"],["/#/home","/"]]){await p.goto(LOCAL.B+h);await p.waitForTimeout(500);const u=new URL(p.url());ok(u.pathname===want&&!u.hash,"legacy "+h+" rewrites to "+want,p.url())}
  await p.goto(LOCAL.B+"/#/pro/c1");await p.waitForSelector("#app .px-cover");ok(/Bluebonnet/.test(await p.textContent("#app h1")),"legacy /#/pro/c1 shows the profile");await p.context().close()}

 ok(errs.length===0,"no page errors",J(errs.slice(0,5)));
}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL);await stopApp(PUB)}
 console.log(failed?"FAIL v22-e2e: "+failed+" failed":"PASS v22-e2e: all checks passed");process.exit(failed?1:0)})();
