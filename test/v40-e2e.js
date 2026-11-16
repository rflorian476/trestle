// v40 end-to-end. Self-contained: starts its own Sawyer servers (local test mode; a public-host simulation with no email
// provider; a Resend stand-in answering 200). Covers health 2.23.0-sawyer / SW cache sawyer-v40, (1) SW-096: typed ZIP
// fields never block paste (no preventDefault; Lighthouse 'paste-preventing-inputs'), the paste lands (maxlength 10) and the
// input event trims it, drops a ZIP+4's +4, keeps leading zeros and puts the caret after the kept digits, hints included;
// (2) honest fallbacks: OAuth / demo-unavailable 404 pages and passkey error copy name only what AUTH.methods() reports
// ready; (3) signed-out /signup prerendered server-side with the honest card (no 'No password needed' anywhere);
// (4) in-place edit of a 1099 payment or credit in Tax records (integer cents, same year, never below $0.00, inline error
// clears on change, CSV formula-safe), and (5) the Reports year view waits for the year card to settle.
// Usage: node test/v40-e2e.js [shots dir]   (V40_SHOTS=dir also copies the screenshots there)
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
const STRIP=["NODE_ENV","RENDER","AUTH_TEST_MODE","STAFF_DEMO_PASSWORD","RESEND_API_KEY","SENDGRID_API_KEY","EMAIL_FROM","MAIL_FROM","RESEND_API_URL","TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_FROM","TWILIO_MESSAGING_SERVICE_SID","TEST_NOW","SAWYER_BASE_URL","PUBLIC_URL","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","APPLE_CLIENT_ID","MICROSOFT_CLIENT_ID","FACEBOOK_APP_ID","VAPID_PRIVATE_KEY","VAPID_PUBLIC_KEY","VAPID_SUBJECT","PUSH_DEBUG","PUSH_TEST_ORIGIN","PUSH_RETRY_MS","SAWYER_PERSISTENT","EMAIL_DELIVERY_VERIFIED","SMS_DELIVERY_VERIFIED"];
async function startApp(extra){const port=await freePort();
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v40-"));
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
 const SH=process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),"v40-shots-"));const SHOTS=process.env.V40_SHOTS||"";fs.mkdirSync(SH,{recursive:true});if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
 const L=await startApp();SERVERS.push(L);
 const act=async(S,ck,name,args)=>{const r=await req(S.port,"POST","/api/act",Object.assign(ck?{Cookie:ck}:{},JH),J({name,args}));return {res:(r.json&&r.json.res)||{},st:stateOf(r),status:r.status,error:r.json&&r.json.error}};
 const stateFor=async(S,ck)=>stateOf(await req(S.port,"GET","/api/state",ck?{Cookie:ck}:{}));
 const signup=async(S,kind,tag,zip,extra)=>{const email="v40-"+tag+"-"+run+"@example.com";const data=Object.assign({name:(kind==="pro"?"Vee ":"Hana ")+tag,email,zip},kind==="pro"?{biz:"V40 "+tag+" "+run,trade:"Plumbing",phone:"5125550100",plan:"founding"}:kind==="pm"?{biz:"V40 PM "+tag}:{},extra||{});
  const r=await req(S.port,"POST","/api/signup",JH,J({kind,password:"v40-correct-horse",data}));return{status:r.status,error:r.json&&r.json.error,ck:sigCk(r),id:stateOf(r).me,st:stateOf(r),email}};
 br=await chromium.launch();
 const page=async(S,w,ck,opt)=>{const c=await br.newContext(Object.assign({viewport:{width:w,height:w<500?844:900},acceptDownloads:true,bypassCSP:true,hasTouch:w<500},opt||{}));
  if(ck){const [k,v]=ck.split("=");await c.addCookies([{name:k,value:v,url:S.B}])}
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return{c,p}};
 const go=async(S,p,u)=>{await p.goto(S.B+u,{waitUntil:"networkidle"});await p.waitForTimeout(300)};
 const shot=async(p,name,opt)=>{await p.screenshot(Object.assign({path:path.join(SH,name)},opt||{}));if(SHOTS)await p.screenshot(Object.assign({path:path.join(SHOTS,name)},opt||{}))};
 const eshot=async(loc,name)=>{await loc.scrollIntoViewIfNeeded();await loc.screenshot({path:path.join(SH,name)});if(SHOTS)await loc.screenshot({path:path.join(SHOTS,name)})};
 const noOverflow=async(p,lbl)=>{const ov=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);ok(ov<=0,lbl+": no sideways scroll",ov)};
 const axe=async(p,sel,lbl)=>{if(!AXE)return;await p.addScriptTag({content:AXE});const v=await p.evaluate(async s=>{const r=await axe.run(document.querySelector(s)||document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa"]}});return r.violations.filter(v=>v.impact==="serious"||v.impact==="critical").map(v=>v.id)},sel);ok(!v.length,lbl+": no serious axe issues",J(v))};
 // (5) the Reports year view: wait for the year control, pick the year with it if the URL didn't land there, then wait for
 // the Tax records card heading to show that year before reading anything
 const yearView=async(S,p,y)=>{await go(S,p,"/office/reports?y="+y);await p.waitForSelector("#o9Year",{timeout:15000});
  if(await p.inputValue("#o9Year")!==String(y))await p.selectOption("#o9Year",String(y));
  await p.waitForFunction(y=>{const s=document.getElementById("o9Year"),c=document.getElementById("v38tax"),h=c&&c.querySelector("h2");return s&&s.value===y&&h&&h.textContent.includes("Tax records · "+y)},String(y),{timeout:15000});
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))};
 // a real paste: the event is dispatched cancelable, and if nothing prevents it the text is inserted the way the browser
 // would (insertText fires beforeinput/input), replacing the current value
 const paste=async(p,sel,text)=>{await p.locator(sel).click();await p.evaluate(s=>{const i=document.querySelector(s);i.focus();i.select()},sel);
  const prevented=await p.evaluate(({sel,text})=>{const i=document.querySelector(sel);const dt=new DataTransfer();dt.setData("text/plain",text);const ev=new ClipboardEvent("paste",{clipboardData:dt,bubbles:true,cancelable:true});i.dispatchEvent(ev);return ev.defaultPrevented},{sel,text});
  if(!prevented)await p.keyboard.insertText(text);
  return{prevented,v:await p.inputValue(sel),caret:await p.evaluate(s=>document.querySelector(s).selectionStart,sel)}};

 // ===== 0. version =====
 {const hz=(await req(L.port,"GET","/healthz")).json||{};ok(hz.v==="2.23.0-sawyer","healthz reports 2.23.0-sawyer",J(hz));
  const sw=await req(L.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v40"/.test(sw.body),"service worker cache is sawyer-v40")}

 // ===== 1. SW-096: paste is never blocked; the input event cleans it =====
 {const files=[path.join(ROOT,"public/index.html"),...fs.readdirSync(path.join(ROOT,"public/js")).filter(f=>/\.js$/.test(f)).map(f=>path.join(ROOT,"public/js",f))];
  const hits=files.filter(f=>/["']paste["']/.test(fs.readFileSync(f,"utf8"))).map(f=>path.basename(f));ok(!hits.length,"no shipped script listens for paste (the SW-094 preventDefault handler is gone)",J(hits))}
 for(const w of [390,1440]){const {c,p}=await page(L,w);await go(L,p,"/myhome");await p.waitForSelector("#authBox");
  await p.evaluate(()=>{const d=document.getElementById("pwSection");if(d)d.open=true});
  for(const id of ["cu-z","pms-z"]){const mx=await p.evaluate(id=>{const i=document.getElementById(id);return i?i.maxLength:null},id);ok(mx===10,w+": signed-out /myhome #"+id+" maxlength 10 so a paste lands whole",mx)}
  let r=await paste(p,"#cu-z"," 96813 ");ok(!r.prevented&&r.v==="96813"&&r.caret===5,w+": pasting ' 96813 ' into #cu-z is not blocked and lands as 96813, caret after the digits",J(r));
  ok(/Hawaii/.test(await p.locator("#cu-z-h").innerText()),w+": the Hawaii hint follows the paste");
  r=await paste(p,"#cu-z","96813-1234");ok(!r.prevented&&r.v==="96813"&&r.caret===5,w+": a ZIP+4 paste drops the +4 (96813-1234 -> 96813)",J(r));
  r=await paste(p,"#cu-z","96813 1234");ok(r.v==="96813",w+": a spaced ZIP+4 drops the +4 too",J(r));
  r=await paste(p,"#pms-z","00901");ok(!r.prevented&&r.v==="00901",w+": #pms-z keeps the leading zeros of 00901",J(r));
  ok(/Puerto Rico · Automatic time zone: Atlantic \(AT\)/.test(await p.locator("#pms-z-h").innerText()),w+": 00901 hints Puerto Rico / Atlantic",await p.locator("#pms-z-h").innerText());
  r=await paste(p,"#pms-z","ZIP: 49660");ok(r.v==="49660"&&/Michigan/.test(await p.locator("#pms-z-h").innerText()),w+": a labelled paste keeps the five digits",J(r));
  // caret: typing a stray dash in the middle keeps the caret where it was
  await p.fill("#cu-z","96813");await p.evaluate(()=>{const i=document.getElementById("cu-z");i.focus();i.setSelectionRange(2,2)});await p.keyboard.insertText("-");
  r={v:await p.inputValue("#cu-z"),caret:await p.evaluate(()=>document.getElementById("cu-z").selectionStart)};ok(r.v==="96813"&&r.caret===2,w+": a stray character mid-ZIP is dropped and the caret stays put",J(r));
  await p.fill("#cu-z","4966");await p.locator("#cu-z").press("Enter");await p.waitForTimeout(200);ok(/5-digit ZIP/.test(await p.locator("#cu-z-e").innerText()),w+": a short ZIP still stops at the inline error");
  if(w===390)await eshot(p.locator("#pms-z").locator("xpath=ancestor::form[1]"),"v40-zip-paste-390.png");
  await noOverflow(p,w+" /myhome sign-up");await c.close()}
 {const HO=await signup(L,"customer","zipho","78704");const {c,p}=await page(L,390,HO.ck);await go(L,p,"/account");
  const r=await paste(p,"#ac-z"," 00901 ");ok(!r.prevented&&r.v==="00901"&&/Puerto Rico/.test(await p.locator("#ac-z-h").innerText()),"Account ZIP: paste lands, ' 00901 ' -> 00901 with the Puerto Rico hint",J(r));
  await p.click("#acctForm button.primary");await p.waitForTimeout(500);ok(meOf(await stateFor(L,HO.ck)).zip==="00901","Account saves 00901 (leading zeros kept)");await c.close()}

 // ===== 2. honest fallbacks =====
 const HON=/Sign in with your password or a passkey/,PROMISE=/No password needed|One step\./;
 const P=await startApp({RENDER:"true"});SERVERS.push(P);
 {for(const [u,lbl] of [["/auth/oauth/google/start","Google start"],["/auth/oauth/apple/demo?state=x","demo page"],["/auth/oauth/microsoft/callback?state=x","callback"]]){const r=await req(P.port,"GET",u);
   ok(r.status===404&&/Use a password or a passkey<\/a>\./.test(r.body)&&!/Use email|email or a password/i.test(r.body),"public host "+lbl+": 404 says 'Use a password or a passkey' (no email promise)",r.body.slice(r.body.indexOf("<p>"),r.body.indexOf("<p>")+160))}
  const pk=await req(P.port,"POST","/api/passkey/login/verify",JH,J({id:"x",clientDataJSON:"x",authenticatorData:"x",signature:"x"}));ok(pk.status>=400&&!/email/i.test((pk.json&&pk.json.error)||""),"passkey failure copy doesn't offer email",pk.body.slice(0,160));
  const lr=await req(L.port,"GET","/auth/oauth/google/start");ok(lr.status===302&&/\/demo\?state=/.test(lr.headers.location||""),"local test mode: OAuth still goes to the demo stand-in",lr.status);
  const {c,p}=await page(P,390);await go(P,p,"/signup");const m=await p.evaluate(()=>[pkFriendly({name:"NotAllowedError"},false),pkFriendly({name:"NotSupportedError"},false),pkFriendly({name:"NotAllowedError"},true),pkFriendly({name:"NotSupportedError"},true)]);
  ok(/Try again, or use your password\.$/.test(m[0])&&/Use your password\.$/.test(m[1])&&/keep using your password\.$/.test(m[3])&&m.every(x=>!/email/i.test(x)),"public host passkey errors offer the password, not email",J(m));await c.close();
  const l=await page(L,390);await go(L,l.p,"/signup");const lm=await l.p.evaluate(()=>pkFriendly({name:"NotSupportedError"},false));ok(/Use email or a password\./.test(lm),"local test mode keeps 'Use email or a password'",lm);await l.c.close()}
 {const M=await mockResend("200");const R=await startApp({RENDER:"true",RESEND_API_KEY:"re_fake_v40_key_000000",RESEND_API_URL:M.url});SERVERS.push(R);
  const st=await req(R.port,"POST","/api/auth/start",JH,J({channel:"email",to:"x-v40@example.com"}));ok(st.status===200,"stand-in Resend delivers a code",st.status);
  const r=await req(R.port,"GET","/auth/oauth/google/start");ok(r.status===404&&/Use an email sign-in code, a password or a passkey/.test(r.body),"once email codes are delivered the 404 offers them too",r.body.slice(r.body.indexOf("<p>"),r.body.indexOf("<p>")+160));
  const raw=await req(R.port,"GET","/signup");ok(/Sign in with a one-time code, a password or a passkey/.test(raw.body)&&!PROMISE.test(raw.body),"…and /signup's first HTML leads with codes, without 'No password needed'");
  ok(!/re_fake_v40_key/.test(raw.body+r.body)&&!/re_fake_v40_key/.test(R.log()),"the key is never in a page or the log");M.srv.close()}

 // ===== 3. /signup prerendered with the honest card =====
 {const raw=await req(P.port,"GET","/signup");const pre=(raw.body.match(/<div id="pre11">[\s\S]*?<\/main>/)||[""])[0];
  ok(raw.status===200&&/<div id="pre11">/.test(raw.body)&&/id="authBox"/.test(pre)&&HON.test(pre)&&/not switched on yet/.test(pre)&&/id="pwSection" open/.test(pre),"public host: /signup first HTML is the prerendered honest card (codes folded, password open)",pre.slice(0,200));
  ok(!PROMISE.test(raw.body)&&!/<script/i.test(pre.replace(/<\/main>$/,"")),"no 'No password needed' / 'One step.' anywhere in the first HTML, no script in the prerender");
  const lraw=await req(L.port,"GET","/signup");ok(/<div id="pre11">/.test(lraw.body)&&/Sign in with a one-time code, a password or a passkey/.test(lraw.body)&&!PROMISE.test(lraw.body),"local test mode: prerendered code-first card with the new honest default");
  const mh=await req(P.port,"GET","/myhome");ok(HON.test(mh.body)&&!PROMISE.test(mh.body),"/myhome first HTML stays honest");
  const src=fs.readFileSync(path.join(ROOT,"src/v3.js"),"utf8");ok(!/No password needed/.test(src),"src/v3.js default card no longer says 'No password needed'");
  const who=await signup(P,"customer","pre","49660");const sraw=await req(P.port,"GET","/signup",{Cookie:who.ck});ok(!/<div id="pre11">/.test(sraw.body),"signed in: /signup is not prerendered");
  for(const w of [390,1440]){const nj=await page(P,w,null,{javaScriptEnabled:false});await nj.p.goto(P.B+"/signup");const t0=await nj.p.locator("#authBox").innerText();
   ok(HON.test(t0)&&!PROMISE.test(t0),w+": with JS off the card is already there and honest",t0.slice(0,120));if(w===390)await shot(nj.p,"v40-signup-firstpaint-390.png");await nj.c.close();
   const {c,p}=await page(P,w);await p.addInitScript(()=>{window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:"layout-shift",buffered:true})}catch(e){}});
   await go(P,p,"/signup");await p.waitForSelector("#authBox");const o=await p.evaluate(()=>({t:document.getElementById("authBox").innerText,cls:window.__cls,pre:!!document.getElementById("pre11"),pw:(document.getElementById("pwSection")||{}).open}));
   ok(HON.test(o.t)&&o.pw===true,w+": after the app mounts the card is the same honest card",o.t.slice(0,120));ok(o.cls<0.02,w+": no layout shift when the app takes over",o.cls);
   await p.click("#liForgot").catch(()=>{});await p.waitForTimeout(200);ok(/isn't switched on in this beta yet/.test(await p.evaluate(()=>document.body.innerText)),w+": app hooks are live on the prerendered page ('Forgot password?')");
   await shot(p,"v40-signup-"+w+".png");if(w===1440)await axe(p,"#app",w+" /signup");await noOverflow(p,w+" /signup");await c.close()}}

 {// handoff: what a visitor does on the prerendered card before the app mounts carries over
  const {c,p}=await page(L,390);let release;const gate=new Promise(r=>release=r);let held=0;
  await p.route(/\/js\/a\d\.[0-9a-f]+\.js$/,async rt=>{held++;await gate;await rt.continue()});
  await p.goto(L.B+"/signup",{waitUntil:"domcontentloaded"});await p.waitForSelector("#pre11 #authBox");
  const pre=await p.evaluate(()=>({pw:document.getElementById("pwSection").open,app:typeof A!=="undefined"}));
  await p.evaluate(()=>{document.getElementById("pwSection").open=true});await p.fill("#cu-n","Una Handoff");await p.check("input[name=au-role][value=business]",{force:true});
  await p.click("#cu-e");await p.keyboard.type("una@exa");
  release();await p.waitForFunction(()=>!document.getElementById("pre11")&&typeof A!=="undefined",null,{timeout:15000});await p.waitForTimeout(300);
  const o=await p.evaluate(()=>({pw:document.getElementById("pwSection").open,n:document.getElementById("cu-n").value,e:document.getElementById("cu-e").value,role:(document.querySelector("input[name=au-role]:checked")||{}).value,f:document.activeElement&&document.activeElement.id,href:(document.querySelector(".v3o[data-p]")||{}).href||""}));
  ok(held>0&&pre.pw===false&&pre.app===false,"local /signup: the prerendered card is interactive before the app JS runs",J({held,pre}));
  ok(o.pw===true&&o.n==="Una Handoff"&&o.e==="una@exa"&&o.role==="business"&&o.f==="cu-e"&&(!o.href||/role=business/.test(o.href)),"when the app mounts, the open password section, typed values, chosen role and focus carry over",J(o));
  await p.keyboard.type("mple.com");ok(await p.inputValue("#cu-e")==="una@example.com","typing continues where it left off (caret kept)");await c.close()}

 // ===== 4. edit a 1099 payment or credit in place =====
 const TP=await signup(L,"pro","tax","48226");
 {const a=o=>act(L,TP.ck,"addLedger",[o]).then(r=>r.res);const E=(id,o,ck)=>act(L,ck===undefined?TP.ck:ck,"editLedger40",[id,o]).then(r=>r.res);
  await a({kind:"exp",cat:"Subcontractor",vendor:"Exact Line LLC",amt:"2100.00",date:"2026-06-15"});
  let r=await a({kind:"exp",cat:"Subcontractor",vendor:"Exact Line LLC",amt:"-150.00",date:"2026-07-01",note:"refund"});ok(r.ok,"setup: a $150 credit",J(r));
  await a({kind:"exp",cat:"Subcontractor",vendor:'=HYPERLINK("http://evil.example","x")',amt:"700",date:"2026-05-01"});
  await a({kind:"exp",cat:"Materials",vendor:"Big Supply",amt:"80",date:"2026-06-15"});
  await a({kind:"exp",cat:"Subcontractor",vendor:"Next Year Tile",amt:"2500",date:"2027-01-05"});
  let st=await stateFor(L,TP.ck);const led=st.ledger||[];const pay=led.find(l=>/Exact Line/.test(l.vendor)&&l.amt>0),cr=led.find(l=>l.credit39),mat=led.find(l=>l.cat==="Materials");
  ok(pay&&cr&&mat,"setup: payment, credit and a materials receipt",J(led.map(l=>[l.vendor,l.amt])));
  r=await E(cr.id,{amt:"2100.01"});ok(r.ok===false&&r.max===210000&&/more than the \$2,100\.00 paid to Exact Line LLC in 2026/.test(r.msg),"a credit edited above what was paid is refused (never below $0.00)",J(r));
  r=await E(cr.id,{amt:"2100"});ok(r.ok&&/total: \$0\.00/.test(r.msg),"a credit edited to exactly what was paid takes the total to $0.00",J(r));
  r=await E(cr.id,{amt:"200.00",note:"refund, corrected"});st=await stateFor(L,TP.ck);let c2=(st.ledger||[]).find(l=>l.id===cr.id);
  ok(r.ok&&/total: \$1,900\.00/.test(r.msg)&&c2.c39===-20000&&c2.amt===-200&&c2.credit39&&c2.note==="refund, corrected"&&c2.vendor===cr.vendor,"credit edited to $200: integer cents (c39 −20000), note saved, still a credit to the same sub",J(c2));
  r=await E(pay.id,{amt:"199.99"});ok(r.ok===false&&r.min===20000&&/at least \$200\.00/.test(r.msg),"a payment can't shrink below the credits against it",J(r));
  r=await E(pay.id,{amt:"2,345.67"});st=await stateFor(L,TP.ck);let p2=(st.ledger||[]).find(l=>l.id===pay.id);ok(r.ok&&p2.c39===234567&&p2.amt===2345.67&&/total: \$2,145\.67/.test(r.msg),"a payment edited to $2,345.67 (integer cents)",J({r,p2}));
  r=await E(pay.id,{amt:"2345.67",date:"2027-01-02"});ok(r.ok===false&&r.field==="date"&&/Keep the date in 2026/.test(r.msg),"the date stays in the entry's own year",J(r));
  r=await E(pay.id,{amt:"2345.67",date:"2026-02-30"});ok(r.ok===false&&/real date/.test(r.msg),"an impossible date is refused",J(r));
  r=await E(pay.id,{amt:"2345.67",date:"2026-09-30"});ok(r.ok,"moving within 2026 is fine",J(r));
  r=await E(pay.id,{amt:"abc"});ok(r.ok===false&&/payment amount/.test(r.msg),"a non-number is refused",J(r));
  r=await E(pay.id,{amt:"0"});ok(r.ok===false,"zero is refused (delete the receipt instead)",J(r));
  r=await E(mat.id,{amt:"90"});ok(r.ok===false&&/Only subcontractor/.test(r.msg),"other receipts aren't edited here",J(r));
  const other=await signup(L,"pro","taxother","30307");r=await E(pay.id,{amt:"1"},other.ck);ok(r.ok===false&&/Not found/.test(r.msg),"another pro can't edit it",J(r));
  {const so=await act(L,"","editLedger40",[pay.id,{amt:"1"}]);ok(so.res.ok!==true&&(so.status>=400||!!so.error||so.res.ok===false),"signed out can't edit it",J({s:so.status,e:so.error,r:so.res}))}
  st=await stateFor(L,TP.ck);ok(((st.ledger||[]).find(l=>l.id===pay.id)||{}).c39===234567,"refused edits changed nothing");
  ok(!((await stateFor(L,other.ck)).ledger||[]).some(l=>/Exact Line/.test(l.vendor||"")),"the other pro never sees the entries")}
 for(const w of [390,1440]){const {c,p}=await page(L,w,TP.ck);await yearView(L,p,2026);const card=p.locator("#v38tax");
  const btn=p.locator('[data-v40ent="exact line llc"]');ok(await btn.count()===1,w+": 'Edit entries' next to Credit / refund for the sub");await btn.click();await p.waitForSelector("#modal .v40el li");
  let items=await p.locator("#modal .v40el li").allInnerTexts();ok(items.length===2&&/Credit \/ refund/.test(items[0])&&/refund, corrected/.test(items[0])&&/Payment/.test(items[1]),w+": the sheet lists the sub's 2026 payment and credit",J(items));
  if(w===390)await shot(p,"v40-1099-entries-390.png");else await eshot(p.locator("#modal .mbox"),"v40-1099-entries-1440.png");
  await p.locator("#modal .v40el li").nth(0).locator("[data-v40ed]").click();await p.waitForSelector("#v40lf");
  ok(await p.inputValue("#v40la")===(w===390?"200.00":"250.00")&&await p.inputValue("#v40ld")===(w===390?"2026-07-01":"2026-07-02"),w+": the edit sheet opens with the credit's amount and date");
  await p.fill("#v40la","5000");await p.click("#v40lf button.primary");await p.waitForTimeout(150);
  let e=await p.evaluate(()=>({t:document.getElementById("v40lE").textContent,h:document.getElementById("v40lE").hidden,inv:document.getElementById("v40la").getAttribute("aria-invalid"),f:document.activeElement&&document.activeElement.id}));
  ok(!e.h&&/down to \$0\.00, not below/.test(e.t)&&e.inv==="true"&&e.f==="v40la",w+": too large a credit shows the inline error (cap $0.00), focus on Amount",J(e));
  await p.fill("#v40la","250");ok(await p.locator("#v40lE").isHidden(),w+": the inline error clears as soon as the amount changes");
  await p.fill("#v40ld","2027-01-01");await p.click("#v40lf button.primary");await p.waitForTimeout(150);ok(/Keep the date in 2026/.test(await p.locator("#v40lE").innerText()),w+": a date outside 2026 is refused inline");
  await p.fill("#v40ld","2026-07-02");ok(await p.locator("#v40lE").isHidden(),w+": …and clears when the date changes");
  if(w===1440){await eshot(p.locator("#modal .mbox"),"v40-1099-edit-1440.png");await axe(p,"#modal",w+" 1099 edit sheet")}else await shot(p,"v40-1099-edit-390.png");
  const amt=w===390?"250":"300";await p.fill("#v40la",amt);await p.click("#v40lf button.primary");await p.waitForSelector("#modal .v40el li");
  items=await p.locator("#modal .v40el li").allInnerTexts();ok(new RegExp("−\\$"+amt+"\\.00").test(items[0])&&/edited/.test(items[0]),w+": back on the list the credit reads −$"+amt+".00 · edited",J(items));
  await p.click("#modal .actions [data-close]");await p.waitForTimeout(300);const t=await card.innerText();const tot=w===390?"2,095.67":"2,045.67";
  ok(new RegExp("\\$"+tot.replace(/[.,]/g,m=>"\\"+m)).test(t)&&new RegExp("credits −\\$"+amt+"\\.00").test(t),w+": the card shows $"+tot+" and credits −$"+amt+".00",t.slice(0,400));
  {await p.waitForFunction(()=>{const a=document.activeElement;return!!(a&&a.dataset&&a.dataset.v40ent)},null,{timeout:2000}).catch(()=>{});const fa=await p.evaluate(()=>{const a=document.activeElement;return a?a.tagName+"#"+a.id+"."+a.className+":"+((a.dataset||{}).v40ent||""):"none"});ok(/:exact line llc$/.test(fa),w+": focus returns to 'Edit entries'",fa)}
  if(w===1440){const [dl]=await Promise.all([p.waitForEvent("download"),p.click("#v38SubCsv")]);const csv=fs.readFileSync(await dl.path(),"utf8").replace(/^\ufeff/,"");
   ok(/^"'=HYPERLINK\(""http:\/\/evil\.example"",""x""\)",1,0\.00,700\.00/m.test(csv)&&/^Exact Line LLC,1,300\.00,2045\.67,/m.test(csv),"1099 worksheet CSV after edits: totals follow the edit and the formula-looking name stays quoted with a leading '",csv.slice(0,400))}
  await noOverflow(p,w+" Tax records");
  // (5) year view: 2027 settles before it's read
  await yearView(L,p,2027);const t7=await card.innerText();ok(/Tax records · 2027/.test(t7)&&/check IRS — adjusts for inflation after 2026/.test(t7)&&/Next Year Tile/.test(t7)&&!/Exact Line/.test(t7),w+": ?y=2027 settles on the 2027 card (estimate label, 2027 subs only)",t7.slice(0,300));
  await c.close()}

 ok(!errs.length,"no page errors",errs.join(" | "));
}catch(e){failed++;console.log("FAIL crashed: "+(e&&e.stack||e))}finally{try{if(br)await br.close()}catch(e){}for(const s of SERVERS)await stopApp(s);
 console.log(failed?"\n"+failed+" FAILED":"\nALL PASS");process.exit(failed?1:0)}})();
