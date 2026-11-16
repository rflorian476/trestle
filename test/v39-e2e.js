// v39 end-to-end. Self-contained: starts its own Sawyer servers (local test mode; a public-host simulation with no email
// provider; Resend stand-ins answering 403 and 200; a test-clock server for visits). Covers health (any Sawyer version /
// SW cache since v40), (1) the typed 5-digit ZIP on Account and sign-up (inputmode/pattern, live town/state + Automatic time zone
// hint, 96813 / 00901 / unlisted 27514 saved, malformed refused inline; PM and pro signup apply the server's ZIP rule),
// (2) 1099 credits / refunds (integer cents, never below $0, Subcontractor only, private, not billable) and the year-keyed
// 1099-NEC line ($600 through 2025, $2,000 for 2026, 2027+ labeled "check IRS — adjusts for inflation after 2026"),
// (3) elapsed-today visits ("Due now" / "Past start time" on the visit's own clock, Ask stays until the end of the visit
// day, passed times today refused, SW-092 western visits after midnight Eastern still listed) and (4) honest sign-in copy
// while codes can't be delivered (ready.email / ready.sms) at 390 and 1440. SW-094: ZIP paste/input
// strips spaces and non-digits on every typed ZIP field (maxlength 10). SW-095: SMS POST /api/auth/start
// is honest when neither channel is ready (no 'Use email to get a sign-in code').
// Usage: node test/v39-e2e.js [shots dir]   (V39_SHOTS=dir also copies the screenshots there)
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
const STRIP=["NODE_ENV","RENDER","AUTH_TEST_MODE","STAFF_DEMO_PASSWORD","RESEND_API_KEY","SENDGRID_API_KEY","EMAIL_FROM","MAIL_FROM","RESEND_API_URL","TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_FROM","TWILIO_MESSAGING_SERVICE_SID","TEST_NOW","SAWYER_BASE_URL","PUBLIC_URL","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","APPLE_CLIENT_ID","MICROSOFT_CLIENT_ID","FACEBOOK_APP_ID","VAPID_PRIVATE_KEY","VAPID_PUBLIC_KEY","VAPID_SUBJECT","PUSH_DEBUG","PUSH_TEST_ORIGIN","PUSH_RETRY_MS","SAWYER_PERSISTENT","EMAIL_DELIVERY_VERIFIED","SMS_DELIVERY_VERIFIED"];
async function startApp(extra){const port=await freePort();
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v39-"));
 const env=Object.assign({},process.env,{HOST:"127.0.0.1",PORT:String(port),DATA_DIR:dir,RATE_X:"50"});
 for(const k of STRIP)if(!extra||!(k in extra))delete env[k];
 if(extra)Object.assign(env,extra);
 const child=spawn(process.execPath,[path.join(ROOT,"server.js")],{env,stdio:["ignore","pipe","pipe"]});
 let log="";child.stdout.on("data",d=>{log+=d});child.stderr.on("data",d=>{log+=d});
 return new Promise((res,no)=>{const t=setTimeout(()=>no(new Error("server did not start\n"+log.slice(-400))),15000);
  const wait=()=>{if(/live on/.test(log)){clearTimeout(t);res({child,dir,log:()=>log,port,B:"http://127.0.0.1:"+port})}else setTimeout(wait,30)};
  child.on("exit",c=>{clearTimeout(t);no(new Error("server exited "+c+"\n"+log.slice(-400)))});wait()})}
function stopApp(s){return new Promise(res=>{if(!s||s.child.exitCode!==null)return res();const done=()=>{try{fs.rmSync(s.dir,{recursive:true,force:true})}catch(e){}res()};s.child.on("exit",done);s.child.kill("SIGTERM");setTimeout(()=>{try{s.child.kill("SIGKILL")}catch(e){}},3000)})}
function req(port,method,p,headers,body){return new Promise((res,no)=>{const r=http.request({hostname:"127.0.0.1",port,path:p,method,headers:headers||{}},rs=>{const ch=[];rs.on("data",c=>ch.push(c));rs.on("end",()=>{let buf=Buffer.concat(ch);const enc=rs.headers["content-encoding"];if(enc==="gzip")buf=zlib.gunzipSync(buf);else if(enc==="br")buf=zlib.brotliDecompressSync(buf);let json=null;try{json=JSON.parse(buf.toString("utf8"))}catch(e){}res({status:rs.statusCode,headers:rs.headers,body:buf.toString("utf8"),json})})});r.on("error",no);if(body)r.write(body);r.end()})}
function mockResend(mode){const inbox=[];const srv=http.createServer((rq,rs)=>{const ch=[];rq.on("data",c=>ch.push(c));rq.on("end",()=>{inbox.push(1);if(mode==="403"){rs.writeHead(403,{"Content-Type":"application/json"});return rs.end(JSON.stringify({statusCode:403,name:"validation_error",message:"domain not verified"}))}rs.writeHead(200,{"Content-Type":"application/json"});rs.end(JSON.stringify({id:"mock_"+inbox.length}))})});
 return new Promise(res=>srv.listen(0,"127.0.0.1",()=>res({srv,inbox,url:"http://127.0.0.1:"+srv.address().port+"/emails"})))}
const J=o=>JSON.stringify(o),JH={"Content-Type":"application/json"};
const stateOf=r=>(r.json&&(r.json.state||r.json))||{};
const sigCk=r=>(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0];
const meOf=st=>(st.users||[]).find(u=>u.id===st.me)||{};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let AXE="";try{AXE=fs.readFileSync(require.resolve("axe-core/axe.min.js"),"utf8")}catch(e){}
const SERVERS=[];let br=null;const errs=[];
(async()=>{try{
 const run=Math.random().toString(36).slice(2,8);
 const SH=process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),"v39-shots-"));const SHOTS=process.env.V39_SHOTS||"";fs.mkdirSync(SH,{recursive:true});if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
 const L=await startApp();SERVERS.push(L);
 const act=async(S,ck,name,args)=>{const r=await req(S.port,"POST","/api/act",Object.assign({Cookie:ck},JH),J({name,args}));return {res:(r.json&&r.json.res)||{},st:stateOf(r),status:r.status}};
 const stateFor=async(S,ck)=>stateOf(await req(S.port,"GET","/api/state",ck?{Cookie:ck}:{}));
 const signup=async(S,kind,tag,zip,extra)=>{const email="v39-"+tag+"-"+run+"@example.com";const data=Object.assign({name:(kind==="pro"?"Vee ":"Hana ")+tag,email,zip},kind==="pro"?{biz:"V39 "+tag+" "+run,trade:"Plumbing",phone:"5125550100",plan:"founding"}:kind==="pm"?{biz:"V39 PM "+tag}:{},extra||{});
  const r=await req(S.port,"POST","/api/signup",JH,J({kind,password:"v39-correct-horse",data}));return{status:r.status,error:r.json&&r.json.error,ck:sigCk(r),id:stateOf(r).me,st:stateOf(r),email}};
 br=await chromium.launch();
 const page=async(S,w,ck,init)=>{const c=await br.newContext({viewport:{width:w,height:w<500?844:900},acceptDownloads:true,bypassCSP:true,hasTouch:w<500});
  if(ck){const [k,v]=ck.split("=");await c.addCookies([{name:k,value:v,url:S.B}])}if(init)await c.addInitScript(init.fn,init.arg);
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return{c,p}};
 const go=async(S,p,u)=>{await p.goto(S.B+u,{waitUntil:"networkidle"});await p.waitForTimeout(300)};
 // v40: the Reports year view settles before it is read: wait for the year control, pick the year with it if the URL
 // didn't land there, then wait until the Tax records card heading shows that year (the ?y=2027 check was racy under run-all).
 const yearView=async(S,p,y)=>{await go(S,p,"/office/reports?y="+y);await p.waitForSelector("#o9Year",{timeout:15000});
  if(await p.inputValue("#o9Year")!==String(y)){await p.selectOption("#o9Year",String(y));}
  await p.waitForFunction(y=>{const s=document.getElementById("o9Year"),c=document.getElementById("v38tax"),h=c&&c.querySelector("h2");return s&&s.value===y&&h&&h.textContent.includes("Tax records · "+y)},String(y),{timeout:15000});
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))};
 const shot=async(p,name,opt)=>{await p.screenshot(Object.assign({path:path.join(SH,name)},opt||{}));if(SHOTS)await p.screenshot(Object.assign({path:path.join(SHOTS,name)},opt||{}))};
 const eshot=async(loc,name)=>{await loc.scrollIntoViewIfNeeded();await loc.screenshot({path:path.join(SH,name)});if(SHOTS)await loc.screenshot({path:path.join(SHOTS,name)})};
 const noOverflow=async(p,lbl)=>{const ov=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);ok(ov<=0,lbl+": no sideways scroll",ov)};
 const axe=async(p,sel,lbl)=>{if(!AXE)return;await p.addScriptTag({content:AXE});const v=await p.evaluate(async s=>{const r=await axe.run(document.querySelector(s)||document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa"]}});return r.violations.filter(v=>v.impact==="serious"||v.impact==="critical").map(v=>v.id)},sel);ok(!v.length,lbl+": no serious axe issues",J(v))};
 const pasteZip=async(p,sel,text)=>{
  await p.locator(sel).click();
  await p.evaluate(({sel,text})=>{
   const i=document.querySelector(sel);
   i.focus();i.value="";
   const dt=new DataTransfer();dt.setData("text/plain",text);
   const ev=new ClipboardEvent("paste",{clipboardData:dt,bubbles:true,cancelable:true});
   const prevented=!i.dispatchEvent(ev)||ev.defaultPrevented;
   if(!prevented){const max=i.maxLength>0?i.maxLength:Infinity;i.value=(i.value+text).slice(0,max);i.dispatchEvent(new Event("input",{bubbles:true}))}
  },{sel,text});
 };

 // ===== 0. version =====
 {const hz=(await req(L.port,"GET","/healthz")).json||{};ok(/^2\.\d+\.\d+-sawyer$/.test(hz.v),"healthz reports a Sawyer version",J(hz));
  const sw=await req(L.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v\d+"/.test(sw.body),"service worker has a Sawyer cache name")}

 // ===== 1. ZIPs: server rule for every sign-up kind, then the typed field =====
 {for(const z of ["27514","96813","00901"]){const a=await signup(L,"pm","pm"+z,z);ok(a.status===200&&meOf(a.st).zip===z,"PM signup stores "+z+" as entered (was remapped to 78704)",J({s:a.status,e:a.error,zip:meOf(a.st).zip}))}
  const bad=await signup(L,"pm","pmbad","1234");ok(bad.status===400&&/5-digit ZIP/.test(bad.error||""),"PM signup refuses a malformed ZIP",J(bad.error));
  const pz=await signup(L,"pro","pro27514","27514");ok(pz.status===200&&meOf(pz.st).zip==="27514","pro signup stores unlisted 27514",J({e:pz.error}));
  const pb=await signup(L,"pro","probad","abcde");ok(pb.status===400&&/5-digit ZIP/.test(pb.error||""),"pro signup refuses a malformed ZIP (it stored any string before)",J(pb.error));
  const cb=await signup(L,"customer","cubad","9681");ok(cb.status===400,"homeowner signup still refuses a malformed ZIP",J(cb.error))}
 const HO=await signup(L,"customer","zipho","78704");
 for(const w of [1440,390]){await act(L,HO.ck,"updateMe",[{zip:"78704"}]);const {c,p}=await page(L,w,HO.ck);await go(L,p,"/account");
  const f=await p.evaluate(()=>{const i=document.getElementById("ac-z");return i&&{tag:i.tagName,type:i.type,im:i.inputMode,pat:i.pattern,req:i.required,ac:i.autocomplete,val:i.value,sel:document.querySelectorAll("#acctForm select[name=zip]").length,lab:(document.querySelector('label[for="ac-z"]')||{}).textContent,hint:(document.getElementById("ac-z-h")||{}).textContent,desc:i.getAttribute("aria-describedby")}});
  ok(f&&f.tag==="INPUT"&&f.type==="text"&&f.im==="numeric"&&f.pat==="[0-9]{5}"&&f.req&&f.ac==="postal-code"&&f.sel===0,w+": Account ZIP is a 5-digit text field (inputmode numeric, pattern, no city <select>)",J(f));
  ok(f&&f.lab==="ZIP code"&&/Austin, TX/.test(f.hint)&&/Automatic time zone: Central \(CT\)/.test(f.hint)&&/ac-z-h/.test(f.desc),w+": hint shows the known town and the Automatic zone",J(f&&f.hint));
  const z=w===1440?"27514":"00901",want=w===1440?/North Carolina · Automatic time zone: Eastern \(ET\)/:/Puerto Rico · Automatic time zone: Atlantic \(AT\)/;
  await p.fill("#ac-z",z);const h1=await p.locator("#ac-z-h").innerText();ok(want.test(h1),w+": typing unlisted "+z+" shows the state and its zone live",h1);
  await p.click("#acctForm button.primary");await p.waitForTimeout(500);let me=meOf(await stateFor(L,HO.ck));ok(me.zip===z,w+": saving stores "+z+" via updateMe",me.zip);
  await p.fill("#ac-z","96813");ok(/Hawaii \(HT\)/.test(await p.locator("#ac-z-h").innerText()),w+": 96813 hints Hawaii time");
  await p.click("#acctForm button.primary");await p.waitForTimeout(500);me=meOf(await stateFor(L,HO.ck));ok(me.zip==="96813",w+": 96813 saves",me.zip);
  await go(L,p,"/account");ok(await p.inputValue("#ac-z")==="96813",w+": the saved ZIP comes back in the field");
  await p.fill("#ac-z","4966");await p.click("#acctForm button.primary");await p.waitForTimeout(300);
  let e=await p.evaluate(()=>{const x=document.getElementById("ac-z-e"),i=document.getElementById("ac-z");return{hid:x.hidden,t:x.textContent,inv:i.getAttribute("aria-invalid"),foc:document.activeElement&&document.activeElement.id,role:x.getAttribute("role")}});
  ok(!e.hid&&/5-digit ZIP/.test(e.t)&&e.inv==="true"&&e.foc==="ac-z"&&e.role==="alert",w+": a 4-digit ZIP shows an inline error, focus stays on the field",J(e));
  me=meOf(await stateFor(L,HO.ck));ok(me.zip==="96813",w+": the malformed ZIP is not saved",me.zip);
  if(w===390)await eshot(p.locator("#acctForm"),"v39-zip-error-390.png");
  await p.fill("#ac-z","49a60");ok((await p.inputValue("#ac-z"))==="4960",w+": letters are stripped on input (SW-094)",await p.inputValue("#ac-z"));
  await p.fill("#ac-z","49660");e=await p.evaluate(()=>({h:document.getElementById("ac-z").getAttribute("aria-invalid"),x:document.getElementById("ac-z-e").hidden,t:document.getElementById("ac-z-h").textContent}));ok(e.h===null&&e.x&&/Michigan · Automatic time zone: Eastern/.test(e.t),w+": a good ZIP clears the error (Manistee 49660: Michigan, Eastern)",J(e));
  await p.click("#acctForm button.primary");await p.waitForTimeout(500);ok(meOf(await stateFor(L,HO.ck)).zip==="49660",w+": 49660 saves");
  if(w===390){
   const mx=await p.evaluate(()=>document.getElementById("ac-z").maxLength);
   ok(mx>=10||mx<0,"SW-094: Account ZIP maxlength is at least 10 (was 5, which truncated ' 96813 ' to ' 9681')",mx);
   await pasteZip(p,"#ac-z"," 96813 ");
   const a=await p.evaluate(()=>({v:document.getElementById("ac-z").value,h:document.getElementById("ac-z-h").textContent}));
   ok(a.v==="96813"&&/Hawaii/.test(a.h),"SW-094: pasting ' 96813 ' into Account keeps 96813 and hints Hawaii (not ' 9681')",J(a));
   await pasteZip(p,"#ac-z","96813-1234");
   ok((await p.inputValue("#ac-z"))==="96813","SW-094: a ZIP+4 paste keeps the first five digits");
  }
  await noOverflow(p,w+" Account");
  await eshot(p.locator("#acctForm"),"v39-account-zip-"+w+".png");
  if(w===1440)await axe(p,"#acctForm",w+" Account form");
  if(w===390){
   await go(L,p,"/myhome");
   await p.click("#v37addP");await p.waitForSelector("#v37pz");
   await pasteZip(p,"#v37pz"," 96813 ");
   ok((await p.inputValue("#v37pz"))==="96813","SW-094: pasting into the My home property ZIP keeps 96813");
  }
  await c.close()}
 // sign-up forms: typed ZIPs for homeowner/business and PM; the pro wizard's location step
 for(const w of [1440,390]){const {c,p}=await page(L,w);await go(L,p,"/signup");await p.evaluate(()=>{const d=document.getElementById("pwSection");if(d)d.open=true});
  const ids=await p.evaluate(()=>[...document.querySelectorAll("input.v39zip")].map(i=>i.id+":"+i.inputMode+":"+i.pattern));const sels=await p.evaluate(()=>document.querySelectorAll("#cu-z,#pms-z").length&&[...document.querySelectorAll("select#cu-z,select#pms-z")].length);
  ok(ids.includes("cu-z:numeric:[0-9]{5}")&&ids.includes("pms-z:numeric:[0-9]{5}")&&!sels,w+": sign-up ZIPs are typed (homeowner and PM)",J(ids));
  if(w===1440){const em="v39-ui-"+run+"@example.com";await p.fill("#cu-n","Una Unlisted");await p.fill("#cu-e",em);await p.fill("#cu-p","v39-correct-horse");
   await p.fill("#cu-z","123");await p.locator("#cu-z").press("Enter");await p.waitForTimeout(300);
   const er=await p.evaluate(()=>({t:document.getElementById("cu-z-e").textContent,me:typeof me==="function"&&me()}));ok(/5-digit ZIP/.test(er.t)&&!er.me,"sign-up with a 3-digit ZIP stops at the inline error, no account",J(er));
   await p.fill("#cu-z","27514");ok(/North Carolina/.test(await p.locator("#cu-z-h").innerText()),"sign-up hint for 27514");
   await eshot(p.locator("#cu-z").locator("xpath=ancestor::form[1]"),"v39-signup-zip-1440.png");
   await p.locator("#cu-z").press("Enter");await p.waitForTimeout(800);const z=await p.evaluate(()=>me()&&me().zip);ok(z==="27514","signing up in the browser with unlisted 27514 stores it",z)}
  await go(L,p,"/join");await p.evaluate(()=>{OBS=2;render()});await p.waitForTimeout(300);
  const ob=await p.evaluate(()=>{const i=document.getElementById("ob-zip");return i&&i.tagName+":"+i.className+":"+(document.getElementById("ob-zip-h")||{}).textContent});ok(/^INPUT:v39zip/.test(ob||""),w+": pro onboarding 'Where do you work?' takes a typed ZIP",ob);
  if(w===390){await p.fill("#ob-zip","96813");await eshot(p.locator("#obf"),"v39-join-zip-390.png");
   await go(L,p,"/signup");
   await p.evaluate(()=>{const d=document.getElementById("pwSection");if(d)d.open=true});
   await pasteZip(p,"#cu-z"," 96813 ");
   ok((await p.inputValue("#cu-z"))==="96813","SW-094: pasting ' 96813 ' into the sign-up ZIP keeps 96813");
   await go(L,p,"/p/c1");
   await p.waitForSelector("#ar12z");
   await pasteZip(p,"#ar12z"," 96813 ");
   ok((await p.inputValue("#ar12z"))==="96813","SW-094: pasting into the service-area ZIP keeps 96813")}
  await noOverflow(p,w+" sign-up");await c.close()}

 // ===== 2. 1099: credits / refunds and the year-keyed line =====
 const TP=await signup(L,"pro","tax","48226");
 {const a=(n,o)=>act(L,TP.ck,"addLedger",[o]).then(r=>r.res);
  let r=await a(0,{kind:"exp",cat:"Subcontractor",vendor:"Exact Line LLC",amt:"2100.00",date:"2026-06-15"});ok(r.ok,"a $2,100 sub payment in 2026",J(r));
  await a(0,{kind:"exp",cat:"Subcontractor",vendor:"Penny Sub",amt:"0.30",date:"2026-03-01"});
  await a(0,{kind:"exp",cat:"Subcontractor",vendor:"Next Year Tile",amt:"2500",date:"2027-01-05"});
  await a(0,{kind:"exp",cat:"Subcontractor",vendor:"Old Year Paint",amt:"700",date:"2025-04-05"});
  await a(0,{kind:"exp",cat:"Materials",vendor:"Big Supply",amt:"80",date:"2026-06-15"});
  r=await a(0,{kind:"exp",cat:"Subcontractor",vendor:"exact  line llc",amt:"-150.00",date:"2026-07-01",note:"refund"});
  ok(r.ok&&/Credit of \$150\.00 from Exact Line LLC/.test(r.msg)&&/total: \$1,950\.00/.test(r.msg),"a −$150 credit to the same sub (any spacing/case) is logged against them",J(r));
  let st=await stateFor(L,TP.ck);const cr=(st.ledger||[]).find(l=>l.id===r.id);ok(cr&&cr.c39===-15000&&cr.amt===-150&&cr.credit39&&cr.cat==="Subcontractor"&&cr.job==="","stored in integer cents (c39 −15000), no job tag",J(cr));
  r=await a(0,{kind:"exp",cat:"Subcontractor",vendor:"Exact Line LLC",amt:"−1950.01",date:"2026-08-01"});ok(r.ok===false&&r.max===195000&&/down to \$0\.00, not below/.test(r.msg),"a credit bigger than what's left (Unicode minus) is refused; total can't go below $0",J(r));
  r=await a(0,{kind:"exp",cat:"Materials",vendor:"Big Supply",amt:"-5",date:"2026-06-16"});ok(r.ok===false&&/subcontractor/i.test(r.msg),"credits are for subs only",J(r));
  r=await a(0,{kind:"exp",cat:"Subcontractor",vendor:"Nobody Here",amt:"-5",date:"2026-06-16"});ok(r.ok===false&&/no 2026 payments/.test(r.msg),"no credit for a sub with no payments that year",J(r));
  r=await a(0,{kind:"exp",cat:"Subcontractor",vendor:"Exact Line LLC",amt:"-5",date:"2025-06-16"});ok(r.ok===false,"a credit lands in its own calendar year (no 2025 payments to this sub)",J(r));
  for(let i=0;i<3;i++){r=await a(0,{kind:"exp",cat:"Subcontractor",vendor:"Penny Sub",amt:"-0.10",date:"2026-03-0"+(2+i)});if(!r.ok)break}
  ok(r.ok&&/total: \$0\.00/.test(r.msg),"three 10¢ credits take a 30¢ sub to exactly $0.00 (no float drift)",J(r));
  r=await a(0,{kind:"exp",cat:"Subcontractor",vendor:"Penny Sub",amt:"-0.01",date:"2026-03-09"});ok(r.ok===false&&/already \$0\.00/.test(r.msg),"one more cent is refused",J(r));
  r=await a(0,{kind:"exp",cat:"Subcontractor",vendor:"Exact Line LLC",amt:"-abc",date:"2026-08-01"});ok(r.ok===false&&/credit amount/.test(r.msg),"a non-number credit is refused",J(r));
  const other=await signup(L,"pro","taxother","30307");const os=await stateFor(L,other.ck);ok(!(os.ledger||[]).some(l=>l.credit39||/Exact Line/i.test(l.vendor||"")),"another pro never gets the credits");
  const pubs=await stateFor(L);ok(!(pubs.ledger||[]).length,"signed-out state carries no ledger")}
 for(const w of [390,1440]){const {c,p}=await page(L,w,TP.ck);await yearView(L,p,2026);const card=p.locator("#v38tax");ok(await card.count()===1,w+": Tax records render");let t=await card.innerText();
  ok(/Exact Line LLC/.test(t)&&/\$1,950\.00/.test(t)&&/credits −\$150\.00/.test(t)&&!/1 sub reached/.test(t),w+": after the credit Exact Line is $1,950.00 (under the $2,000 line), credits shown",t.slice(0,900));
  ok(!/check IRS/.test(t)&&/\$2,000 or more in 2026/.test(t),w+": 2026 states the $2,000 line plainly");
  ok(/never tax IDs/.test(t)&&!(await p.locator('#v38tax input[name*=tin i],#v38tax input[name*=ssn i],#v38tax input[name*=ein i]').count()),w+": W-9 stays yes/no, no tax ID fields");
  const ub=await p.evaluate(()=>v36Unbilled(me()).some(l=>l.credit39));ok(!ub,w+": credits are never offered as billable job costs");
  if(w===1440){const lines=await p.evaluate(()=>[2024,2025,2026,2027,2030].map(y=>[y,v38Line(y),v39Line(y).est]));ok(J(lines)===J([[2024,600,false],[2025,600,false],[2026,2000,false],[2027,2000,true],[2030,2000,true]]),"1099-NEC table: $600 through 2025, $2,000 for 2026, 2027+ flagged as an estimate",J(lines));
   const [dl]=await Promise.all([p.waitForEvent("download"),p.click("#v38SubCsv")]);const csv=fs.readFileSync(await dl.path(),"utf8").replace(/^\ufeff/,"");
   ok(/^Paid to,Payments,Credits \/ refunds,Total paid 2026 \(after credits\)/.test(csv)&&/Exact Line LLC,1,150\.00,1950\.00,2026-06-15,2000\.00,No,No/.test(csv)&&/Penny Sub,1,0\.30,0\.00/.test(csv),"1099 worksheet CSV has credits and totals after credits",csv.slice(0,400));
   // the credit sheet in the browser
   await p.locator('[data-v39cr="exact line llc"]').click();await p.waitForSelector("#v39crf");await p.fill("#v39cra","2000");await p.click("#v39crf button.primary");await p.waitForTimeout(200);
   const er=await p.locator("#v39crE").innerText();ok(/down to \$0\.00, not below/.test(er),"the credit sheet refuses more than was paid, inline",er);
   await p.fill("#v39cra","200.50");ok(await p.locator("#v39crE").isHidden(),"the sheet's error clears once the amount is changed");await p.fill("#v39crn","Callback, redone");await shot(p,"v39-1099-credit-sheet-1440.png");
   await p.click("#v39crf button.primary");await p.waitForTimeout(600);t=await card.innerText();ok(/\$1,749\.50/.test(t)&&/credits −\$350\.50/.test(t),"after a $200.50 credit from the sheet the total is $1,749.50",t.slice(0,400))}
  await eshot(card,"v39-1099-credits-"+w+".png");
  await yearView(L,p,2027);t=await p.locator("#v38tax").innerText();
  ok(/Tax records · 2027/.test(t)&&/check IRS — adjusts for inflation after 2026/.test(t)&&/1 sub reached \$2,000 \(check IRS — adjusts for inflation after 2026\) in 2027/.test(t),w+": 2027 shows $2,000 labeled 'check IRS — adjusts for inflation after 2026'",t.slice(0,500));
  if(w===390)await eshot(p.locator("#v38tax section").first(),"v39-1099-2027-390.png");
  await yearView(L,p,2025);t=await p.locator("#v38tax").innerText();ok(/\$600 or more in 2025/.test(t)&&!/check IRS/.test(t),w+": 2025 uses the $600 line, no estimate label");
  await noOverflow(p,w+" Tax records");if(w===1440){await yearView(L,p,2026);await axe(p,"#v38tax",w+" Tax records")}
  await c.close()}

 // ===== 3. elapsed-today visits, on a test clock: 2026-11-16 07:30Z = 2:30am ET Nov 16 = 9:30pm HST Nov 15 =====
 const NOW="2026-11-16T07:30:00Z",MS=Date.parse(NOW);const V=await startApp({TEST_NOW:NOW});SERVERS.push(V);
 const hire=async(ho,pro,zip,tag)=>{const j=(await act(V,ho.ck,"postJob",[{title:"V39 "+tag+" "+run,cat:"Plumbing",sub:"Water heaters",desc:"x",zip,budget:"$900",when:"This week"}])).res.id;
  await act(V,pro.ck,"quote",[j,900,"ok"]);await act(V,ho.ck,"hire",[j,pro.id]);const cid=(await act(V,pro.ck,"custFromJob",[j])).res.id;return{j,cid}};
 const visit=async(pro,cid,j,date,start,win,title)=>{const r=await act(V,pro.ck,"saveVisit",[{cust:cid,title,date,start,hrs:"1",win:String(win),job:j}]);return r.res.id};
 const hp=await signup(V,"pro","hipro","96813"),hh=await signup(V,"customer","hiho","96813");
 const H1=await hire(hh,hp,"96813","hi-a"),H2=await hire(hh,hp,"96813","hi-b"),H3=await hire(hh,hp,"96813","hi-c");
 const VP=await visit(hp,H1.cid,H1.j,"2026-11-15","20:45",0,"Gutter check (past)"),VD=await visit(hp,H2.cid,H2.j,"2026-11-15","21:00",60,"Faucet swap (due)"),VU=await visit(hp,H3.cid,H3.j,"2026-11-15","23:30",0,"Evening install (later)");
 ok(VP&&VD&&VU,"SW-092 setup: a Hawaii pro schedules 8:45pm, 9:00pm (1-hour window) and 11:30pm HT visits on Sun Nov 15 (already Mon 2:30am ET)");
 {const s=await stateFor(V,hh.ck);ok([VP,VD,VU].every(id=>(s.visits||[]).some(v=>v.id===id&&v.status==="scheduled")),"the Hawaii customer still has all three visits")}
 const clock={fn:ms=>{window.__now=()=>ms},arg:MS};
 for(const w of [390,1440]){const {c,p}=await page(V,w,hh.ck,clock);
  const card=async j=>{await go(V,p,"/job/"+j);const el=p.locator(".v37ap").first();return{n:await p.locator(".v37ap").count(),t:await el.innerText().catch(()=>""),cls:await el.getAttribute("class").catch(()=>""),ok:await p.locator(".v37ap [data-v37ok]").count(),ask:await p.locator(".v37ap [data-v37ask]").count()}};
  let k=await card(H1.j);ok(k.n===1&&/Past start time/.test(k.t)&&/8:45pm HT start has passed/.test(k.t)&&/v39-past/.test(k.cls),w+": 8:45pm HT at 9:30pm HT reads 'Past start time' (not a future open slot)",k.t.slice(0,300));
  ok(k.ok===0&&k.ask===1,w+": a past start drops 'Confirm this time' and keeps Ask to reschedule (until the end of the visit day)",J(k));
  await eshot(p.locator(".v37ap").first(),"v39-visit-past-"+w+".png");
  k=await card(H2.j);ok(/Due now/.test(k.t)&&/arrival window started at 9pm HT/.test(k.t)&&k.ok===1&&k.ask===1&&/v39-due/.test(k.cls),w+": 9:00pm HT with a 1-hour window at 9:30pm reads 'Due now'; confirm and ask both stay",k.t.slice(0,300));
  await eshot(p.locator(".v37ap").first(),"v39-visit-due-"+w+".png");
  if(w===1440)await axe(p,".v37ap",w+" due-now card");
  k=await card(H3.j);ok(k.n===1&&!/Due now|Past start time/.test(k.t)&&/Please confirm/.test(k.t),w+": 11:30pm HT is still an upcoming visit (SW-092: listed after midnight Eastern)",k.t.slice(0,200));
  await noOverflow(p,w+" job page with an elapsed visit");await c.close()}
 {// asking: a time already passed today is refused, later today and tomorrow are fine; the pro sees the same status
  let r=await act(V,hh.ck,"visitAsk37",[VP,[{date:"2026-11-15",start:"21:00"}],""]);ok(r.res.ok===false&&/already passed/.test(r.res.msg),"asking for 9:00pm HT today (passed) is refused",J(r.res));
  r=await act(V,hh.ck,"visitAsk37",[VP,[{date:"2026-11-15",start:"22:30"},{date:"2026-11-17",start:"09:00"}],""]);ok(r.res.ok,"asking for 10:30pm HT tonight or Tue works on a past-start visit",J(r.res));
  const {c,p}=await page(V,1440,hp.ck,clock);await go(V,p,"/");const b=await p.evaluate(ids=>ids.map(id=>v37Badge(v8Visit(id))),[VP,VD,VU]);
  ok(/Past start time/.test(b[0])&&/Due now/.test(b[1])&&!/Due now|Past start/.test(b[2]),"the pro's badges say Past start time / Due now / normal",J(b));await c.close()}
 {// an Eastern pro and a Central customer at 2:30am ET: the label is on the customer's clock
  const ep=await signup(V,"pro","etpro","30307"),cc=await signup(V,"customer","ctho","78704");const E=await hire(cc,ep,"78704","et");const VE=await visit(ep,E.cid,E.j,"2026-11-16","02:00",60,"Early pump check");
  const {c,p}=await page(V,390,cc.ck,clock);await go(V,p,"/job/"+E.j);const t=await p.locator(".v37ap").first().innerText();ok(/Due now/.test(t)&&/started at 1am CT/.test(t),"a 2:00am ET window shows 'Due now … started at 1am CT' to the Central customer",t.slice(0,240));await c.close()}

 // ===== 4. honest sign-in copy =====
 const HON=/Sign in with your password or a passkey/,PROMISE=/Sign in with a one-time code, a password or a passkey/;/* v40: the code-first card no longer says "No password needed" */
 const view=async(S,w,lbl,shotName)=>{const {c,p}=await page(S,w);await go(S,p,"/signup");await p.waitForSelector("#authBox");
  const o=await p.evaluate(()=>{const b=document.getElementById("authBox"),d=document.getElementById("v39codes"),s=document.getElementById("au-send");return{t:b.innerText,det:!!d,open:d?d.open:null,send:!!s,sendVis:!!(s&&s.checkVisibility()),verF:!!document.getElementById("verF"),pw:(document.getElementById("pwSection")||{}).open}});
  if(shotName)await eshot(p.locator("#authBox"),shotName);await c.close();return o};
 {const P=await startApp({RENDER:"true"});SERVERS.push(P);
  const m=(await req(P.port,"GET","/api/auth/methods")).json||{};ok(m.email==="off"&&m.ready&&m.ready.email===false&&m.ready.sms===false,"public host, no provider: ready.email/sms false",J(m));
  const st=await req(P.port,"POST","/api/auth/start",JH,J({channel:"email",to:"x-v39@example.com"}));ok(st.status===503,"POST /api/auth/start is still 503 (email/SMS not enabled; nothing turned on)",st.status);
  const sms=await req(P.port,"POST","/api/auth/start",JH,J({channel:"sms",to:"+15555550100"}));
  const smse=(sms.json&&sms.json.error)||"";
  ok(sms.status===503&&/aren't switched on yet/i.test(smse)&&/password/i.test(smse)&&/passkey/i.test(smse)&&/linked account/i.test(smse)&&!/Use email to get a sign-in code/i.test(smse),"SW-095: SMS 503 when both channels are off is honest (no 'use email')",sms.body.slice(0,240));
  for(const w of [390,1440]){const o=await view(P,w,"pub","v39-signin-honest-"+w+".png");
   ok(HON.test(o.t)&&!PROMISE.test(o.t)&&!/Codes expire in 10 minutes/.test(o.t),w+": the card leads with password / passkey, no 'No password needed' promise",o.t.slice(0,300));
   ok(o.det&&o.open===false&&o.send&&!o.sendVis&&o.verF&&o.pw===true,w+": the code form stays in the page (hooks) but folded under 'not switched on yet'; password section open",J(o))}
  const raw=await req(P.port,"GET","/myhome");ok(raw.status===200&&HON.test(raw.body)&&!PROMISE.test(raw.body)&&/not switched on yet/.test(raw.body),"prerendered /myhome tells the truth too");
  {const {c,p}=await page(P,390);await go(P,p,"/signup");await p.evaluate(()=>{const d=document.getElementById("pwSection");if(d)d.open=true});await p.click("#liForgot");await p.waitForTimeout(300);
   const t=await p.evaluate(()=>(document.querySelector(".toast,#toast,[role=status].toast")||document.body).innerText);ok(/isn't switched on in this beta yet/.test(t),"'Forgot password?' says email reset isn't on instead of promising a code",t.slice(0,200));
   await noOverflow(p,"390 honest sign-in");await c.close()}}
 {const M=await mockResend("403");const R=await startApp({RENDER:"true",RESEND_API_KEY:"re_fake_v39_key_000000",RESEND_API_URL:M.url});SERVERS.push(R);
  let m=(await req(R.port,"GET","/api/auth/methods")).json||{};ok(m.email==="live"&&m.ready.email===false,"Resend key set but unproven: email live, ready false (copy stays honest)",J(m));
  const st=await req(R.port,"POST","/api/auth/start",JH,J({channel:"email",to:"x-v39@example.com"}));ok(st.status===503&&/isn't fully enabled yet/.test(st.json&&st.json.error||""),"Resend 403 is still a 503",st.body.slice(0,120));
  m=(await req(R.port,"GET","/api/auth/methods")).json||{};ok(m.ready.email===false,"after a refused send ready.email stays false",J(m.ready));
  const o=await view(R,1440,"403");ok(HON.test(o.t)&&!PROMISE.test(o.t),"unverified domain: honest copy",o.t.slice(0,200));
  const raw=await req(R.port,"GET","/myhome");ok(!/re_fake_v39_key/.test(raw.body)&&!/re_fake_v39_key/.test(R.log()),"the API key is never in a page or the log");
  M.srv.close()}
 {const M=await mockResend("200");const R=await startApp({RENDER:"true",RESEND_API_KEY:"re_fake_v39_key_000000",RESEND_API_URL:M.url});SERVERS.push(R);
  let raw=await req(R.port,"GET","/myhome");ok(HON.test(raw.body),"working provider before any send: still not promising");
  const st=await req(R.port,"POST","/api/auth/start",JH,J({channel:"email",to:"x-v39@example.com"}));ok(st.status===200&&st.json&&st.json.sent,"a delivered code (stand-in Resend 200)",st.body.slice(0,120));
  const m=(await req(R.port,"GET","/api/auth/methods")).json||{};ok(m.ready.email===true,"after a delivered code ready.email is true",J(m.ready));
  raw=await req(R.port,"GET","/myhome");ok(PROMISE.test(raw.body)&&!/not switched on yet/.test(raw.body),"…and the prerendered card offers codes again (cache follows the methods)");
  const o=await view(R,1440,"200");ok(PROMISE.test(o.t)&&!o.det,"the card's code form is back up front",o.t.slice(0,160));M.srv.close()}
 {const R=await startApp({RENDER:"true",RESEND_API_KEY:"re_fake_v39_key_000000",EMAIL_DELIVERY_VERIFIED:"1"});SERVERS.push(R);const m=(await req(R.port,"GET","/api/auth/methods")).json||{};ok(m.ready.email===true,"EMAIL_DELIVERY_VERIFIED=1 marks a verified sender ready from boot",J(m.ready))}
 {const o=await view(L,1440,"local");ok(PROMISE.test(o.t)&&/Test mode/.test(o.t)&&!o.det,"local test mode (codes shown on screen) keeps the code-first card",o.t.slice(0,200))}

 ok(!errs.length,"no page errors",errs.join(" | "));
}catch(e){failed++;console.log("FAIL crashed: "+(e&&e.stack||e))}finally{try{if(br)await br.close()}catch(e){}for(const s of SERVERS)await stopApp(s);
 console.log(failed?"\n"+failed+" FAILED":"\nALL PASS");process.exit(failed?1:0)}})();
