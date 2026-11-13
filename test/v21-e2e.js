// v21 end-to-end. Self-contained: starts its own Sawyer servers (a local test-mode one, and a
// public-host simulation with RENDER=1 where OAuth, SMS and email are off).
// Covers: SW-053 (no dead sign-in buttons), SW-054 (friendly passkey errors), first-paint
// performance changes (external CSS, no inlined snapshot, fewer preloads, image srcset, caching),
// SW-016 (pretty in-app URLs, old #/ links still work), and one reminder email when license and
// insurance expire on the same date.
// usage: NODE_PATH=/path/with/playwright node test/v21-e2e.js
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v21-"));
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
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let LOCAL=null,PUB=null,br=null;
(async()=>{try{
 LOCAL=await startApp(await freePort(),{});
 PUB=await startApp(await freePort(),{RENDER:"true"});
 br=await chromium.launch();
 const errs=[];
 const page=async(B,w)=>{const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900}});const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));p.B=B;return p};

 // ===== 1. SW-053: only offer sign-in options this server can complete =====
 {const m=(await req(PUB.port,"GET","/api/auth/methods")).json||{};
  ok(m.sms==="off"&&Object.values(m.oauth||{}).every(v=>v==="off"),"public-host simulation reports SMS and every OAuth provider off",J(m));
  for(const w of [1440,390]){const p=await page(PUB.B,w);await p.goto(PUB.B+"/signup");await p.waitForSelector("#authBox");
   const o=await p.evaluate(()=>({oauth:document.querySelectorAll(".v3o[data-p],a[href*='/auth/oauth/']").length,sms:!!document.getElementById("tab-sms"),tabs:!!document.querySelector(".v3tabs"),send:!!document.getElementById("au-send"),email:(document.getElementById("au-to")||{}).type,pk:!!document.getElementById("au-passkey")}));
   ok(o.oauth===0,w+": no 'Continue with …' buttons when every provider is off",J(o));
   ok(!o.sms&&!o.tabs,w+": no Phone / text-message tab when SMS is off",J(o));
   ok(o.send&&o.email==="email"&&o.pk,w+": the email-code form and the passkey button stay",J(o));
   if(w===1440){await p.fill("#au-to","v21-nobody@example.com");await p.click("#au-send");await p.waitForTimeout(700);const t=await toasts(p);const u=new URL(p.url());
    ok(t.some(x=>/isn't|aren't|not (fully )?(enabled|available)|use .*password/i.test(x))&&!t.some(x=>/\b\d{6}\b/.test(x)),"email code on a host without a provider shows the friendly 503 message",J(t));
    ok(/signup/.test(u.pathname+u.hash)&&(await p.$("#authBox"))!==null,"the person stays on the sign-up view (no 404 page)",p.url())}
   await p.context().close()}
  // account page "Link …" buttons follow the same rule
  const lg=await req(PUB.port,"POST","/api/login",JH,J({email:"demo-homeowner@sawyer.test",password:"sawyer-demo-2026"}));const ck=(String(lg.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0];
  ok(lg.status===200&&ck,"public-sim demo homeowner signs in");
  {const c=await br.newContext({viewport:{width:1440,height:900}});await c.addCookies([{name:"swsid",value:ck.split("=")[1],url:PUB.B}]);const p=await c.newPage();await p.goto(PUB.B+"/account");await p.waitForSelector("#signinMethods");
   const n=await p.$$eval("#signinMethods a[href*='/auth/oauth/']",x=>x.length);ok(n===0,"account page offers no 'Link Google/Apple/…' buttons when providers are off",n);await c.close()}
  // local test mode still shows the four demo providers and the Phone tab
  const p=await page(LOCAL.B);await p.goto(LOCAL.B+"/signup");await p.waitForSelector("#authBox");
  const o=await p.evaluate(()=>({oauth:[...document.querySelectorAll(".v3o[data-p]")].map(e=>e.dataset.p+":"+!!e.querySelector(".v3demo")),sms:!!document.getElementById("tab-sms")}));
  ok(o.oauth.join()==="google:true,apple:true,microsoft:true,facebook:true"&&o.sms,"local test mode keeps the four demo providers and the Phone tab",J(o));await p.context().close()}

 // ===== 2. SW-054: friendly passkey errors, raw text only in the console =====
 {const p=await page(PUB.B);const cons=[];p.on("console",m=>cons.push(m.text()));await p.goto(PUB.B+"/signup");await p.waitForSelector("#au-passkey");
  const RAW="Resident credentials or empty 'allowCredentials' lists are not supported at this time.";
  const tryErr=async(name,msg)=>{await p.evaluate(([n,m])=>{document.querySelectorAll("#toasts .toast").forEach(t=>t.remove());navigator.credentials.get=async()=>{throw new DOMException(m,n)}},[name,msg]);await p.click("#au-passkey");await p.waitForTimeout(500);return toasts(p)};
  let t=await tryErr("NotSupportedError",RAW);
  ok(t.length&&t.every(x=>!/Resident|allowCredentials/.test(x))&&t.some(x=>/Passkeys aren't available in this browser, or none is set up\. Use email or a password\./.test(x)),"NotSupportedError shows fixed friendly copy, not the raw WebAuthn string",J(t));
  ok(cons.some(x=>/passkey error/.test(x)&&/Resident/.test(x)),"the raw name/message is logged to the console",J(cons.slice(-3)));
  t=await tryErr("NotAllowedError","The operation either timed out or was not allowed. See: https://www.w3.org/TR/webauthn-2/#sctn-privacy-considerations-client.");
  ok(t.some(x=>/cancelled or timed out/.test(x))&&!t.some(x=>/w3\.org|operation either/.test(x)),"NotAllowedError shows the cancelled/timed-out copy",J(t));
  t=await tryErr("SecurityError","The relying party ID is not a registrable domain suffix of, nor equal to the current domain.");
  ok(t.some(x=>/Passkeys aren't available/.test(x))&&!t.some(x=>/relying party/.test(x)),"SecurityError is mapped too",J(t));
  await p.evaluate(()=>{document.querySelectorAll("#toasts .toast").forEach(t=>t.remove());delete window.PublicKeyCredential;window.PublicKeyCredential=undefined});await p.click("#au-passkey");await p.waitForTimeout(400);t=await toasts(p);
  ok(t.some(x=>/Passkeys aren't available/.test(x)),"a browser without WebAuthn gets the same friendly copy",J(t));
  ok(/signup/.test(p.url()),"stays on sign-up after a passkey failure",p.url());await p.context().close();
  // server: parser/crypto internals never reach the person
  const bad=await req(PUB.port,"POST","/api/passkey/login/verify",JH,J({id:"x",clientDataJSON:"%%%not-base64%%%",authenticatorData:"",signature:""}));
  ok(bad.status===400&&bad.json&&/That passkey didn't work/.test(bad.json.error)&&!/Unexpected|JSON|token|position/i.test(bad.json.error),"server maps a malformed passkey response to fixed copy",bad.body);
  const forged=await req(PUB.port,"POST","/api/passkey/login/verify",JH,J({id:"x",clientDataJSON:Buffer.from(J({type:"webauthn.get",challenge:"nope",origin:PUB.B})).toString("base64url"),authenticatorData:"",signature:""}));
  ok(forged.json&&/Challenge expired/.test(forged.json.error),"known friendly server messages (Challenge expired) are kept",forged.body)}

 // ===== 3. First-paint performance: external CSS, no inlined snapshot, fewer preloads, smaller photos, caching =====
 {const H={};for(const u of ["/","/prices","/p/c1","/find"])H[u]=await req(LOCAL.port,"GET",u,{"Accept-Encoding":"br"});
  for(const u of ["/","/prices","/p/c1"]){const t=H[u].body;const st=[...t.matchAll(/<style>([\s\S]*?)<\/style>/g)].reduce((n,m)=>n+m[1].length,0);
   ok(st<2048,u+": no big inline <style> (was ~311 KB)",st);ok(t.length<45000,u+": first HTML is small ("+t.length+" bytes, was ~415 KB)",t.length);
   ok(!/<link rel="preload" href="\/js\//.test(t),u+": no app-script preloads compete with the prerendered first paint")}
  ok(/<link rel="preload" href="\/js\/a0\.[0-9a-f]{10}\.js" as="script">/.test(H["/find"].body),"app-rendered pages (/find) still preload the app scripts they need to paint");
  for(const u of ["/","/prices"])ok(!/<script>window\.__ST=/.test(H[u].body)&&/window\.__STP=fetch\("\/api\/state"/.test(H[u].body),u+": the ~92 KB public snapshot is fetched, not inlined");
  {const m=H["/p/c1"].body.match(/<script>window\.__ST=([\s\S]*?)<\/script>/);let st=null;try{st=JSON.parse(m[1])}catch(e){}ok(st&&st.partial==="c1"&&m[1].length<30000,"/p/c1 keeps its slim inline state ("+(m?m[1].length:0)+" bytes)")}
  const home=H["/"].body;ok(home.indexOf('rel="preload" as="image" href="/img/hero-sm.webp"')>home.indexOf('<meta name="viewport"'),"hero preload sits after the viewport meta (so phones pick the 800w file)");
  const cm=home.match(/<link rel="stylesheet" href="(\/css\/app\.[0-9a-f]{10}\.css)">/);ok(!!cm,"home links one hashed stylesheet",home.slice(0,400));
  if(cm){const c=await req(LOCAL.port,"GET",cm[1],{"Accept-Encoding":"br"});ok(c.status===200&&/text\/css/.test(c.headers["content-type"])&&/max-age=31536000/.test(c.headers["cache-control"])&&/immutable/.test(c.headers["cache-control"]),"stylesheet is served as immutable text/css",c.status+" "+c.headers["cache-control"]);
   const css=c.body;ok(/--bg:#F8F6F1/i.test(css)&&/--acc:#AE4718/i.test(css)&&/#0F2A44/i.test(css)&&/Plus Jakarta Sans/.test(css),"final Linen & Navy tokens and Plus Jakarta Sans are in the CSS");
   ok(!/--bg:#F7F6F3/i.test(css)&&!/--bg:#FFFFFF/i.test(css)&&!/--acc:#B5532F/i.test(css)&&!/--acc:#C2531E/i.test(css),"historic :root theme values that were always overridden are gone");
   ok(/font-family:"?Sawyer WM"?[^}]*font-display:swap/.test(css)&&!/font-display:block/.test(css),"Sawyer wordmark font uses font-display: swap");
   const bad=await req(LOCAL.port,"GET","/css/app.0000000000.css");ok(bad.status===404,"unknown stylesheet hash is 404")}
  const im=await req(LOCAL.port,"GET","/img/t-roofing-sm.webp");const ma=+((im.headers["cache-control"]||"").match(/max-age=(\d+)/)||[])[1];
  ok(im.status===200&&ma>=2592000,"/img/* is cached for 30+ days ("+im.headers["cache-control"]+")");
  // browser: phone-sized home and profile
  const c=await br.newContext({viewport:{width:412,height:860},deviceScaleFactor:1.75,isMobile:true});const p=await c.newPage();const got=[];let syncState=0;
  p.on("request",r=>{const u=new URL(r.url());if(u.pathname.startsWith("/img/"))got.push(u.pathname);if(u.pathname==="/api/state"&&!u.search)syncState++});p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p.goto(LOCAL.B+"/");await p.waitForSelector("#app .v4cat img",{timeout:15000});await p.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await p.waitForTimeout(1500);
  const o=await p.evaluate(()=>({users:(DB.users||[]).length,h1:!!document.querySelector("#app h1"),tiles:[...document.querySelectorAll(".v4cat img")].map(i=>[i.getAttribute("srcset")||"",i.currentSrc.replace(location.origin,"")]),both:[...document.querySelectorAll("img")].filter(i=>i.getAttribute("fetchpriority")==="high"&&i.loading==="lazy").length}));
  ok(o.users>40&&o.h1,"app boots from the prefetched snapshot ("+o.users+" users)");
  ok(syncState===1,"home asks for /api/state once (the head prefetch), no extra synchronous load",syncState);
  ok(o.tiles.length>=6&&o.tiles.every(([s])=>/-sm\.webp 400w/.test(s)),"trade tiles carry a srcset with the 400w copy",J(o.tiles.slice(0,2)));
  ok(o.tiles.filter(([,cur])=>cur).every(([,cur])=>/-sm\.webp$/.test(cur)),"a 412 px phone downloads the small trade tiles",J(o.tiles.map(x=>x[1])));
  ok(got.includes("/img/hero-sm.webp")&&!got.includes("/img/hero.webp"),"phone home loads only the 800w hero",J(got.filter(x=>/hero/.test(x))));
  ok(o.both===0,"no image on home is both fetchpriority=high and loading=lazy",o.both);
  await c.close();const c1=await br.newContext({viewport:{width:412,height:860},deviceScaleFactor:1.75,isMobile:true});const p1=await c1.newPage();p1.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p1.goto(LOCAL.B+"/p/c1");await p1.waitForTimeout(2500);await p1.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await p1.waitForTimeout(800);
  const g=await p1.evaluate(()=>({both:[...document.querySelectorAll("img")].filter(i=>i.getAttribute("fetchpriority")==="high"&&i.loading==="lazy").map(i=>i.getAttribute("src")),gal:[...document.querySelectorAll(".v19-g img")].map(i=>i.currentSrc.replace(location.origin,"")),sz:[...document.querySelectorAll(".v19-g img")].map(i=>i.getAttribute("sizes"))}));
  ok(g.both.length===0,"/p/c1: no gallery image is both fetchpriority=high and loading=lazy",J(g.both));
  ok(g.gal.length===0||g.gal.every(x=>!x||/-(sm|md)\.webp$/.test(x)),"/p/c1: example gallery photos use a smaller copy",J(g));
  await c1.close();
  // signed-in boot uses the same prefetch (private state, never inlined)
  const lg=await req(LOCAL.port,"POST","/api/login",JH,J({email:"demo-homeowner@sawyer.test",password:"sawyer-demo-2026"}));const ck=(String(lg.headers["set-cookie"]||"").match(/swsid=([^;]+)/)||[])[1];
  const sh=await req(LOCAL.port,"GET","/",{Cookie:"swsid="+ck});ok(!/<script>window\.__ST=/.test(sh.body)&&/window\.__STP=/.test(sh.body),"signed-in pages never inline state; they prefetch it");
  const c2=await br.newContext({viewport:{width:1440,height:900}});await c2.addCookies([{name:"swsid",value:ck,url:LOCAL.B}]);const p2=await c2.newPage();await p2.goto(LOCAL.B+"/find");await p2.waitForTimeout(2000);
  ok(await p2.evaluate(()=>!!(DB.me&&DB.users.length)),"signed-in boot gets the private snapshot from the prefetch");await c2.close()}

 //@@V21_MORE@@
 ok(errs.length===0,"no page errors",J(errs.slice(0,5)));
}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL);await stopApp(PUB)}
 console.log(failed?"FAIL v21-e2e: "+failed+" failed":"PASS v21-e2e: all checks passed");process.exit(failed?1:0)})();
