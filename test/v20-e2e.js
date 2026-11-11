// v20: real Resend email delivery for sign-in / forgot-password codes and Verified reminders,
// plus COI uploads marked kind=coi at POST time.
// Self-contained: starts a mock Resend server and Sawyer with RESEND_API_URL (honored only
// outside production). Usage: node test/v20-e2e.js
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const ROOT=path.join(__dirname,"..");
const PNG=fs.readFileSync(path.join(__dirname,"fixtures/v16-plain.png"));
const FAKE_KEY="re_test_v20_mock_key_not_real";
let failed=0;
function assert(cond,msg,extra){
 if(!cond){failed++;console.error("FAIL",msg+(extra!==undefined?" :: "+String(extra).slice(0,200):""))}
 else console.log("ok",msg);
}

function freePort(){return new Promise((ok,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>ok(p))});s.on("error",no)})}

function startMock({mode="ok",delay=0}={}){
 const inbox=[];
 const server=http.createServer((req,res)=>{
  if(req.method!=="POST"||req.url!=="/emails"&&req.url!=="/"){
   // Accept POST /emails (full path) or the path after the origin.
  }
  const chunks=[];req.on("data",c=>chunks.push(c));req.on("end",()=>{
   let body="";try{body=Buffer.concat(chunks).toString("utf8")}catch(e){body=""}
   let json=null;try{json=JSON.parse(body)}catch(e){}
   const rec={method:req.method,url:req.url,auth:req.headers.authorization||"",type:req.headers["content-type"]||"",json,body,at:Date.now()};
   inbox.push(rec);
   const reply=()=>{
    if(mode==="403"){res.writeHead(403,{"Content-Type":"application/json"});return res.end(JSON.stringify({statusCode:403,name:"validation_error",message:"You can only send testing emails to your own email address."}))}
    if(mode==="500"){res.writeHead(500,{"Content-Type":"application/json"});return res.end(JSON.stringify({statusCode:500,message:"temporary"}))}
    res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify({id:"mock_"+inbox.length}));
   };
   if(mode==="hang")return; // never reply — the client should time out
   if(delay)setTimeout(reply,delay);else reply();
  });
 });
 return new Promise((ok,no)=>{
  server.listen(0,"127.0.0.1",()=>ok({server,port:server.address().port,inbox,url:"http://127.0.0.1:"+server.address().port+"/emails",close:()=>new Promise(r=>{server.close(()=>r())})}));
  server.on("error",no);
 });
}

function startApp(port,extra){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v20-"));
 const env=Object.assign({},process.env,{HOST:"127.0.0.1",PORT:String(port),DATA_DIR:dir,RATE_X:"50",SAWYER_BASE_URL:"http://127.0.0.1:"+port});
 for(const k of ["NODE_ENV","RENDER","AUTH_TEST_MODE","STAFF_DEMO_PASSWORD","RESEND_API_KEY","SENDGRID_API_KEY","EMAIL_FROM","MAIL_FROM","RESEND_API_URL","TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_FROM","TWILIO_MESSAGING_SERVICE_SID","TEST_NOW"])if(!extra||!(k in extra))delete env[k];
 if(extra)Object.assign(env,extra);
 const child=spawn(process.execPath,[path.join(ROOT,"server.js")],{env,stdio:["ignore","pipe","pipe"]});
 let log="";child.stdout.on("data",d=>{log+=d});child.stderr.on("data",d=>{log+=d});
 return new Promise((ok,no)=>{
  const t=setTimeout(()=>{no(new Error("server did not start\n"+log.slice(-400)))},10000);
  const wait=()=>{if(/live on/.test(log)){clearTimeout(t);ok({child,dir,log:()=>log,port})}else setTimeout(wait,30)};
  child.on("exit",c=>{clearTimeout(t);no(new Error("server exited "+c+"\n"+log.slice(-400)))});
  wait();
 });
}
function stopApp(s){return new Promise(ok=>{if(!s)return ok();const done=()=>{try{fs.rmSync(s.dir,{recursive:true,force:true})}catch(e){}ok()};s.child.on("exit",()=>done());s.child.kill("SIGTERM");setTimeout(()=>{try{s.child.kill("SIGKILL")}catch(e){}},3000)})}

function req(port,method,p,headers,body,raw){
 return new Promise((ok,no)=>{
  const r=http.request({hostname:"127.0.0.1",port,path:p,method,headers:headers||{}},res=>{
   const chunks=[];res.on("data",c=>chunks.push(c));res.on("end",()=>{
    let buf=Buffer.concat(chunks);const enc=res.headers["content-encoding"];
    if(enc==="gzip")buf=zlib.gunzipSync(buf);else if(enc==="br")buf=zlib.brotliDecompressSync(buf);
    let json=null;try{json=JSON.parse(buf.toString("utf8"))}catch(e){}
    ok({status:res.statusCode,headers:res.headers,body:buf.toString("utf8"),json,raw:buf});
   });
  });
  r.on("error",no);if(body)r.write(body);r.end();
 });
}
function cookieJar(res,jar){const raw=res.headers["set-cookie"];const list=Array.isArray(raw)?raw:raw?[raw]:[];
 for(const c of list){const kv=c.split(";")[0];const i=kv.indexOf("=");if(i>0)jar[kv.slice(0,i).trim()]=kv.slice(i+1).trim()}return jar}
function cookieHeader(jar){return Object.entries(jar).map(([k,v])=>k+"="+v).join("; ")}
function jsonHeaders(extra){return Object.assign({"Content-Type":"application/json"},extra||{})}
function leak(j,body){
 const s=JSON.stringify(j||{})+"\n"+String(body||"");
 if(j&&(j.code||j.link||j.test||("exists" in j)))return true;
 if(/\/auth\/magic\?t=/.test(s)&&!/expires in 10 minutes/i.test(s))return true;
 if(/"code"\s*:\s*"\d{6}"/.test(s))return true;
 return false;
}
function codeFrom(mail){
 const text=(mail&&mail.json&&(mail.json.text||""))||"";
 const m=text.match(/\b(\d{6})\b/);
 return m?m[1]:null;
}

(async()=>{
 const mailer=require("../lib/mailer");

 // ----- unit: URL override is ignored in production / on RENDER -----
 {const saved={NODE_ENV:process.env.NODE_ENV,RENDER:process.env.RENDER,RESEND_API_URL:process.env.RESEND_API_URL,MAIL_FROM:process.env.MAIL_FROM,EMAIL_FROM:process.env.EMAIL_FROM,RESEND_API_KEY:process.env.RESEND_API_KEY};
  const set=(k,v)=>{if(v==null)delete process.env[k];else process.env[k]=v};
  try{
   set("NODE_ENV","");set("RENDER","");set("RESEND_API_URL","http://127.0.0.1:9/emails");
   assert(mailer._test.apiUrl()==="http://127.0.0.1:9/emails","RESEND_API_URL is honored outside production");
   set("NODE_ENV","production");set("RENDER","");
   assert(mailer._test.apiUrl()===mailer._test.DEFAULT_URL,"RESEND_API_URL is ignored when NODE_ENV=production");
   set("NODE_ENV","production");set("RENDER","true");set("RESEND_API_URL","http://127.0.0.1:9/emails");
   assert(mailer._test.apiUrl()===mailer._test.DEFAULT_URL,"RESEND_API_URL is ignored on a production Render host");
   set("NODE_ENV","");set("RENDER","true");set("RESEND_API_URL","http://127.0.0.1:9/emails");
   assert(mailer._test.apiUrl()==="http://127.0.0.1:9/emails","RESEND_API_URL still works with RENDER set when NODE_ENV is not production (test hook)");
   set("NODE_ENV","");set("RENDER","");set("MAIL_FROM","");set("EMAIL_FROM","");
   assert(mailer._test.fromAddress()===mailer._test.DEFAULT_FROM,"MAIL_FROM defaults to Sawyer onboarding@resend.dev");
   set("MAIL_FROM","Sawyer <hello@example.com>");
   assert(mailer._test.fromAddress()==="Sawyer <hello@example.com>","MAIL_FROM is used when set");
   assert(mailer.mailable("pat@example.com")&&!mailer.mailable("demo-pro@sawyer.test")&&!mailer.mailable("c1@demo.invalid")&&!mailer.mailable("sms-1@phone.invalid"),"mailable() accepts real addresses and skips demo domains");
   const auth=mailer.authEmail({brand:"Sawyer",code:"123456",magicUrl:"http://127.0.0.1/auth/magic?t=abc"});
   assert(/123456/.test(auth.text)&&/123456/.test(auth.html)&&/10 minutes/.test(auth.text)&&/10 minutes/.test(auth.html),"auth email includes the code and 10-minute expiry in text and HTML");
   assert(/Sign in with one tap/.test(auth.html)&&/auth\/magic\?t=abc/.test(auth.text),"auth email includes the magic link");
   assert(/#0E1B2B/.test(auth.html)&&/#F7F6F3/.test(auth.html)&&/Sawyer/.test(auth.html),"auth email uses Linen & Navy and the Sawyer wordmark");
   assert(!/https?:\/\/[^"'\s]+\/(icons|img|logo)/.test(auth.html),"auth email does not host images");
  }finally{for(const k of Object.keys(saved)){if(saved[k]==null)delete process.env[k];else process.env[k]=saved[k]}}
 }

 // ----- public host, no provider: still 503, no code -----
 {const port=await freePort();const app=await startApp(port,{NODE_ENV:"production"});
  try{
   const a=await req(port,"POST","/api/auth/start",jsonHeaders(),JSON.stringify({channel:"email",to:"v20-none@example.com"}));
   const b=await req(port,"POST","/api/auth/start",jsonHeaders(),JSON.stringify({channel:"email",to:"demo-homeowner@sawyer.test"}));
   assert(a.status===503&&b.status===503&&a.body===b.body&&!leak(a.json,a.body),"public host without a provider: identical 503, no code or link",a.status+" "+a.body.slice(0,160));
   assert(/email or text provider/i.test(a.json&&a.json.error||""),"public host without a provider explains that a provider is needed");
   const sms=await req(port,"POST","/api/auth/start",jsonHeaders(),JSON.stringify({channel:"sms",to:"5125550199"}));
   assert(sms.status===503&&/text message codes aren't available yet/i.test(sms.json&&sms.json.error||"")&&/email/i.test(sms.json.error)&&!leak(sms.json,sms.body),"public host SMS: 503 says texts aren't available yet and to use email",sms.body.slice(0,180));
   const methods=(await req(port,"GET","/api/auth/methods")).json;
   assert(methods&&methods.email==="off"&&methods.sms==="off","public host without a provider reports email and sms as off");
  }finally{await stopApp(app)}
 }

 // ----- success on a public-host simulation (RENDER, not production, so the mock URL is honored) -----
 {const mock=await startMock({mode:"ok"});
  const port=await freePort();
  const app=await startApp(port,{RENDER:"true",RESEND_API_KEY:FAKE_KEY,RESEND_API_URL:mock.url,MAIL_FROM:"Sawyer <onboarding@resend.dev>"});
  try{
   const to="v20-ok-"+Date.now()+"@example.com";
   const a=await req(port,"POST","/api/auth/start",jsonHeaders(),JSON.stringify({channel:"email",to,role:"homeowner"}));
   const b=await req(port,"POST","/api/auth/start",jsonHeaders(),JSON.stringify({channel:"email",to:"nobody-v20@example.com"}));
   // second start is a different target; just need first success + no leakage
   assert(a.status===200&&a.json&&a.json.ok&&a.json.sent&&!a.json.test&&!leak(a.json,a.body),"public host + Resend success: 200 sent, no code or link in the response",a.status+" "+a.body.slice(0,160));
   assert(mock.inbox.length>=1,"mock Resend received the sign-in email");
   const mail=mock.inbox[0];
   assert(mail.auth==="Bearer "+FAKE_KEY,"Resend request uses a Bearer token");
   assert(mail.json&&mail.json.from==="Sawyer <onboarding@resend.dev>"&&Array.isArray(mail.json.to)&&mail.json.to[0]===to,"from and to are set");
   assert(/sign-in code/i.test(mail.json.subject||""),"subject names the sign-in code without needing to print it");
   const code=codeFrom(mail);
   assert(/^\d{6}$/.test(code||""),"delivered text includes a 6-digit code");
   assert(/10 minutes/.test(mail.json.text||"")&&/10 minutes/.test(mail.json.html||""),"email says the code expires in 10 minutes");
   assert(/\/auth\/magic\?t=/.test(mail.json.text||"")&&/\/auth\/magic\?t=/.test(mail.json.html||""),"email includes a magic link");
   assert(/#0E1B2B/.test(mail.json.html||"")&&/Sawyer/.test(mail.json.html||""),"HTML email is branded Linen & Navy");
   const log=app.log();
   assert(!log.includes(FAKE_KEY),"server log does not contain the API key");
   assert(!new RegExp("\\b"+code+"\\b").test(log),"server log does not contain the full code");

   const v=await req(port,"POST","/api/auth/verify",jsonHeaders(),JSON.stringify({channel:"email",to,code,role:"homeowner",name:"V20 Mail"}));
   const jar={};cookieJar(v,jar);
   assert(v.status===200&&v.json&&v.json.ok&&jar.swsid,"the emailed code signs the person in");

   const methods=(await req(port,"GET","/api/auth/methods")).json;
   assert(methods&&methods.email==="live"&&methods.sms==="off","with Resend configured, email is live and sms stays off");

   // forgot-password is the same start() path: a second code to the same inbox, still no leakage
   const forgot=await req(port,"POST","/api/auth/start",jsonHeaders(),JSON.stringify({channel:"email",to}));
   assert(forgot.status===200&&forgot.json&&forgot.json.sent&&!leak(forgot.json,forgot.body),"forgot-password / second code: 200 sent, no code in the response");
   assert(mock.inbox.length>=2,"a second email was delivered for the new code");
  }finally{await stopApp(app);await mock.close()}
 }

 // ----- 403: unverified domain -----
 {const mock=await startMock({mode:"403"});
  const port=await freePort();
  const app=await startApp(port,{RENDER:"true",RESEND_API_KEY:FAKE_KEY,RESEND_API_URL:mock.url});
  try{
   const a=await req(port,"POST","/api/auth/start",jsonHeaders(),JSON.stringify({channel:"email",to:"v20-403@example.com"}));
   const b=await req(port,"POST","/api/auth/start",jsonHeaders(),JSON.stringify({channel:"email",to:"other-403@example.com"}));
   assert(a.status===503&&b.status===503&&!leak(a.json,a.body)&&!leak(b.json,b.body),"Resend 403: friendly 503, no code in the response",a.status+" "+a.body.slice(0,180));
   assert(/email delivery isn't fully enabled yet/i.test(a.json&&a.json.error||""),"Resend 403 surfaces the unverified-domain message",a.body.slice(0,180));
   const log=app.log();
   assert(/403/.test(log)&&/isn't fully enabled yet/i.test(log),"Resend 403 is logged server-side");
   assert(!log.includes(FAKE_KEY),"403 log does not contain the API key");
   assert(!/v20-403@example.com/.test(JSON.stringify(a.json)),"403 response does not add extra account detail");
  }finally{await stopApp(app);await mock.close()}
 }

 // ----- timeout -----
 {const mock=await startMock({mode:"hang"});
  const port=await freePort();
  const app=await startApp(port,{RENDER:"true",RESEND_API_KEY:FAKE_KEY,RESEND_API_URL:mock.url});
  try{
   const t0=Date.now();
   const a=await req(port,"POST","/api/auth/start",jsonHeaders(),JSON.stringify({channel:"email",to:"v20-to@example.com"}));
   const dt=Date.now()-t0;
   assert(a.status===502&&!leak(a.json,a.body),"Resend timeout: friendly 502, no code in the response",a.status+" "+a.body.slice(0,180));
   assert(/couldn't send the (email|code)/i.test(a.json&&a.json.error||""),"timeout message is friendly",a.body.slice(0,180));
   assert(dt>=mailer.TIMEOUT_MS-200&&dt<20000,"timeout fires around the mailer limit, not a hang",dt+"ms");
   const log=app.log();
   assert(/timed out/i.test(log)&&!log.includes(FAKE_KEY),"timeout is logged and the key is not");
  }finally{await stopApp(app);await mock.close()}
 }

 // ----- COI kind at POST time, plus a Verified expiry reminder email -----
 {const mock=await startMock({mode:"ok"});
  const port=await freePort();
  const app=await startApp(port,{RENDER:"true",RESEND_API_KEY:FAKE_KEY,RESEND_API_URL:mock.url,MAIL_FROM:"Sawyer <onboarding@resend.dev>"});
  try{
   const em="v20-pro-"+Date.now()+"@example.com";
   const su=await req(port,"POST","/api/signup",jsonHeaders(),JSON.stringify({kind:"pro",password:"v20-pass-word-9",data:{name:"Vera Pro",email:em,biz:"Vera Pro Electric",trade:"Electrical",zip:"78704"}}));
   const jar={};cookieJar(su,jar);
   assert(su.status===200&&jar.swsid,"throwaway pro signs up for COI + reminder tests",su.status);
   const ck=cookieHeader(jar);

   const photo=await req(port,"POST","/api/upload",{"Content-Type":"image/png",Cookie:ck},PNG);
   assert(photo.status===200&&photo.json&&/^\/u\/[a-f0-9]{32}\.png$/.test(photo.json.url),"a regular photo upload still returns /u/…",photo.body.slice(0,160));

   const coi=await req(port,"POST","/api/upload",{"Content-Type":"image/png","x-sawyer-upload":"coi",Cookie:ck},PNG);
   assert(coi.status===200&&coi.json&&/^\/api\/coi\/[a-f0-9]{32}\.png$/.test(coi.json.url),"COI upload with x-sawyer-upload: coi returns /api/coi/… at POST time",coi.body.slice(0,200));
   const name=coi.json.url.replace(/^\/api\/coi\//,"");
   const asOut=await req(port,"GET","/u/"+name);
   const asApiOut=await req(port,"GET","/api/coi/"+name);
   const asOwn=await req(port,"GET","/api/coi/"+name,{Cookie:ck});
   assert(asOut.status===404&&asApiOut.status===401&&asOwn.status===200,"COI is private from the moment it is posted ( /u 404, signed-out 401, owner 200 )",asOut.status+" "+asApiOut.status+" "+asOwn.status);

   const qCoi=await req(port,"POST","/api/upload?kind=coi",{"Content-Type":"image/png",Cookie:ck},PNG);
   assert(qCoi.status===200&&qCoi.json&&/^\/api\/coi\//.test(qCoi.json.url),"COI upload also works with ?kind=coi");

   const day=d=>{const t=new Date(Date.now()+d*864e5);return t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0")};
   const sub=await req(port,"POST","/api/act",jsonHeaders({Cookie:ck}),JSON.stringify({name:"submitVerify19",args:[{license:"QA-V20-LIC",licState:"TX",insurance:"Test Mutual, $1M GL",licExp:day(7),insExp:day(200),coiFile:coi.json.url}]}));
   assert(sub.status===200&&sub.json&&sub.json.res&&sub.json.res.ok!==false,"pro submitted a packet that expires in 7 days",sub.body.slice(0,200));
   mock.inbox.length=0;
   const sw=await req(port,"POST","/api/act",jsonHeaders({Cookie:ck}),JSON.stringify({name:"sweepVerify19",args:[]}));
   assert(sw.status===200&&sw.json&&sw.json.res&&(sw.json.res.n||0)>=1,"sweepVerify19 records the 7-day reminder",sw.body.slice(0,200));
   assert(mock.inbox.length>=1,"the 7-day Verified reminder was emailed");
   const rem=mock.inbox[0];
   assert(rem.json&&rem.json.to&&rem.json.to[0]===em,"reminder went to the pro's email");
   assert(/7 day|expires/i.test((rem.json.text||"")+" "+(rem.json.html||"")),"reminder names the upcoming expiry");
   assert(/#0E1B2B/.test(rem.json.html||"")&&/Sawyer/.test(rem.json.html||""),"reminder email is branded");
   const rlog=app.log();
   assert(!rlog.includes(FAKE_KEY),"reminder path does not log the API key");
  }finally{await stopApp(app);await mock.close()}
 }

 if(failed){console.error("\n"+failed+" FAILED");process.exit(1)}
 console.log("\nAll v20 checks passed");
})().catch(e=>{console.error(e&&e.stack||e);process.exit(1)});
