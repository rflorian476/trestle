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

 //@@V21_MORE@@
 ok(errs.length===0,"no page errors",J(errs.slice(0,5)));
}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL);await stopApp(PUB)}
 console.log(failed?"FAIL v21-e2e: "+failed+" failed":"PASS v21-e2e: all checks passed");process.exit(failed?1:0)})();
