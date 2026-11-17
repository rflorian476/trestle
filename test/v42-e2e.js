// v42 end-to-end. Self-contained: starts its own Sawyer server (local test mode, no real email or SMS, payments in test
// mode). Covers health 2.25.0-sawyer / SW cache sawyer-v42 (or later), and:
// SW-101: Account no longer makes a synchronous XHR for GET /api/account (source, app-logic and every built bundle are
//   free of open(...,false)); a signed-in /account page starts the fetch from <head> and paints the real sign-in methods
//   first; in-app visits never show a wrong "not added" / "not set"; a changed answer swaps in the card and the v18
//   password dialog still opens.
// SW-102: "Washington DC" / "Washington, D.C." / "Washington, DC" / "D.C." parse as DC; "Washington state" and
//   "Washington" stay WA; a DC card fits a call that accepts Washington, D.C.
// SW-103: traveler calls take all 50 states plus DC and PR (T_STATES, the posting form, postTravel); every one resolves
//   to an IANA zone (Pacific/Honolulu, America/Anchorage, America/Puerto_Rico ...); days-to-start in Hawaii counts on
//   Honolulu dates, including the 11:30 pm / 12:05 am midnight-Hawaii case, and Alaska on Anchorage dates.
// Test hygiene: v41-e2e's "header reserve is in source" is a real assertion (no ||true).
// Feature: Duplicate an invoice or estimate / "Bill again" (dupBill42): what is and isn't copied, terms, job-cost lines
//   left off, estimates, change orders / other pros / customers / signed-out refused, nothing sent to the customer,
//   locked (paid) invoices offer "Duplicate instead", and the UI at 390 and 1300 (axe, no sideways scroll).
// Usage: node test/v42-e2e.js [shots dir]   (V42_SHOTS=dir also copies the screenshots there)
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
const STRIP=["NODE_ENV","RENDER","AUTH_TEST_MODE","STAFF_DEMO_PASSWORD","RESEND_API_KEY","SENDGRID_API_KEY","EMAIL_FROM","MAIL_FROM","RESEND_API_URL","TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_FROM","TWILIO_MESSAGING_SERVICE_SID","TEST_NOW","SAWYER_BASE_URL","PUBLIC_URL","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","APPLE_CLIENT_ID","MICROSOFT_CLIENT_ID","FACEBOOK_APP_ID","VAPID_PRIVATE_KEY","VAPID_PUBLIC_KEY","VAPID_SUBJECT","PUSH_DEBUG","PUSH_TEST_ORIGIN","PUSH_RETRY_MS","SAWYER_PERSISTENT","EMAIL_DELIVERY_VERIFIED","SMS_DELIVERY_VERIFIED"];
async function startApp(extra){const port=await freePort();
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v42-"));
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
 const SH=process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),"v42-shots-"));const SHOTS=process.env.V42_SHOTS||"";fs.mkdirSync(SH,{recursive:true});if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
 const L=await startApp();SERVERS.push(L);
 const act=async(S,ck,name,args)=>{const r=await req(S.port,"POST","/api/act",Object.assign(ck?{Cookie:ck}:{},JH),J({name,args}));return {res:(r.json&&r.json.res)||{},st:stateOf(r),status:r.status,error:r.json&&r.json.error}};
 const stateFor=async(S,ck)=>stateOf(await req(S.port,"GET","/api/state",ck?{Cookie:ck}:{}));
 const signup=async(S,kind,tag,zip,extra)=>{const email="v42-"+tag+"-"+run+"@example.com";const data=Object.assign({name:(kind==="pro"?"Vee ":"Hana ")+tag,email,zip},kind==="pro"?{biz:"V42 "+tag+" "+run,trade:"Plumbing",phone:"5125550100",plan:"founding"}:kind==="pm"?{biz:"V42 PM "+tag}:{},extra||{});
  const r=await req(S.port,"POST","/api/signup",JH,J({kind,password:"v42-correct-horse",data}));return{status:r.status,error:r.json&&r.json.error,ck:sigCk(r),id:stateOf(r).me,st:stateOf(r),email}};
 const login=async(S,email)=>{const r=await req(S.port,"POST","/api/login",JH,J({email,password:"sawyer-demo-2026"}));return{status:r.status,ck:sigCk(r),id:stateOf(r).me}};
 br=await chromium.launch();
 const page=async(S,w,ck,opt)=>{const c=await br.newContext(Object.assign({viewport:{width:w,height:w<500?844:900},deviceScaleFactor:w<500?2:1,bypassCSP:true,hasTouch:w<500},opt||{}));
  if(ck){const [k,v]=ck.split("=");await c.addCookies([{name:k,value:v,url:S.B}])}
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return{c,p}};
 // wait for the full state (not the partial first paint) before reading anything that depends on it
 const go=async(S,p,u,sel)=>{await p.goto(S.B+u,{waitUntil:"networkidle"});await p.waitForFunction(()=>typeof __PART!=="undefined"&&!__PART&&typeof me==="function",null,{timeout:60000,polling:100});if(sel)await p.waitForSelector(sel,{timeout:20000}).catch(()=>{})};
 const shot=async(p,name,opt)=>{await p.screenshot(Object.assign({path:path.join(SH,name)},opt||{}));if(SHOTS)await p.screenshot(Object.assign({path:path.join(SHOTS,name)},opt||{}))};
 const eshot=async(loc,name)=>{await loc.scrollIntoViewIfNeeded();await loc.screenshot({path:path.join(SH,name)});if(SHOTS)await loc.screenshot({path:path.join(SHOTS,name)})};
 const noOverflow=async(p,lbl)=>{const ov=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);ok(ov<=0,lbl+": no sideways scroll",ov)};
 const axe=async(p,sel,lbl,rules)=>{if(!AXE)return;if(!(await p.evaluate(()=>typeof axe!=="undefined")))await p.addScriptTag({content:AXE});const v=await p.evaluate(async([s,rules])=>{const o=rules?{runOnly:{type:"rule",values:rules}}:{runOnly:{type:"tag",values:["wcag2a","wcag2aa"]}};const r=await axe.run(document.querySelector(s)||document,o);return r.violations.filter(v=>rules||v.impact==="serious"||v.impact==="critical").map(v=>v.id+":"+v.nodes.map(n=>n.target.join(" ")).join(","))},[sel,rules||null]);ok(!v.length,lbl+": no "+(rules?rules.join(","):"serious axe")+" issues",J(v))};

 // --- release
 {const hz=(await req(L.port,"GET","/healthz")).json||{};ok(/^2\.(2[5-9]|[3-9]\d)\.\d+-sawyer$/.test(hz.v||""),"healthz reports a Sawyer version from 2.25.0 on",J(hz));
  const sw=await req(L.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v(4[2-9]|[5-9]\d)"/.test(sw.body),"service worker cache is sawyer-v42 or later")}
 const PRO=await login(L,"demo-pro@sawyer.test");ok(PRO.status===200&&PRO.id==="c1"&&PRO.ck,"demo-pro signs in");
 const EC=await login(L,"demo-electrical@sawyer.test");ok(EC.status===200&&EC.ck,"demo-electrical signs in");

 // --- test hygiene: the v41 header-reserve check can fail now
 {const t=fs.readFileSync(path.join(ROOT,"test/v41-e2e.js"),"utf8");const line=t.split("\n").find(l=>/header reserve is in source/.test(l))||"";
  ok(line&&!/\|\|\s*true/.test(line),"v41-e2e 'header reserve is in source' no longer ends in ||true",line.slice(0,160));
  ok(!/ok\([^\n]*\|\|\s*true\s*,\s*"/.test(t),"no ok(...) in v41-e2e is short-circuited with ||true");
  const css=fs.readFileSync(path.join(ROOT,"src/v41.css"),"utf8"),re=/(^|\})\s*header\.top\{min-height:\s*6\dpx\}/m;ok(re.test(css)&&!re.test(css.replace(/header\.top\{min-height:68px\}/,"")),"the tightened check passes on the real CSS and would fail without the rule")}

 // --- SW-101: no synchronous XHR anywhere in what ships
 {const syncRe=/\.open\(\s*[^()]*?,\s*(?:false|!1)\s*\)/;const files=["app-logic.js","public/index.html","src/v3.js","client-pre.js","client-post.js"].concat(fs.readdirSync(path.join(ROOT,"public/js")).map(f=>"public/js/"+f));
  const hits=files.filter(f=>syncRe.test(fs.readFileSync(path.join(ROOT,f),"utf8")));ok(!hits.length,"SW-101: no synchronous open(...,false) in source, app-logic or any built bundle ("+files.length+" files)",hits.join(","));
  ok(!/open\("GET","\/api\/account",false\)/.test(fs.readFileSync(path.join(ROOT,"src/v3.js"),"utf8")),"SW-101: VIEWS.account no longer opens /api/account synchronously");
  const a1=fs.readdirSync(path.join(ROOT,"public/js")).find(f=>/^a1\./.test(f)),a1s=fs.readFileSync(path.join(ROOT,"public/js",a1),"utf8");ok(/v42AcctLoad/.test(a1s)&&/__xhr\("GET","\/api\/account"\)/.test(a1s),"SW-101: the built a1 bundle loads /api/account through async __xhr",a1)}
 {const si=await req(L.port,"GET","/account",{Cookie:PRO.ck}),so=await req(L.port,"GET","/account");
  ok(/<script>window\.__ACP=fetch\("\/api\/account"/.test(si.body),"SW-101: signed-in /account starts GET /api/account from <head>");
  ok(!/__ACP=fetch/.test(so.body),"SW-101: signed-out /account doesn't (no 401 in the console)");
  const csp=String(si.headers["content-security-policy"]||"");ok(/script-src[^;]*'sha256-/.test(csp),"SW-101: the head script is covered by the page's CSP hashes")}
 for(const w of [390,1300]){const {c,p}=await page(L,w,PRO.ck);
  await p.addInitScript(()=>{window.__syncX=[];const o=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u,a){if(a===false)window.__syncX.push(String(m)+" "+String(u));return o.apply(this,arguments)};
   window.__firstCard=null;new MutationObserver(()=>{const e=document.getElementById("signinMethods");if(e&&window.__firstCard===null)window.__firstCard={t:e.innerText,busy:e.hasAttribute("aria-busy")}}).observe(document,{subtree:true,childList:true})});
  await go(L,p,"/account","#signinMethods");await p.waitForFunction(()=>!document.querySelector("#signinMethods[aria-busy]"),null,{timeout:15000}).catch(()=>{});
  const f=await p.evaluate(()=>({first:window.__firstCard,sync:window.__syncX,now:document.getElementById("signinMethods").innerText}));
  ok(f.first&&!f.first.busy&&/demo-pro@sawyer\.test/.test(f.first.t)&&/Password set/.test(f.first.t),w+": SW-101: the first paint of /account already has the real sign-in methods (no placeholder, no empty flash)",J(f.first));
  ok(f.sync.length===0,w+": SW-101: no synchronous XHR on /account",J(f.sync));
  // in-app visit with nothing cached: neutral placeholder (never a wrong answer), then the real card
  await go(L,p,"/dash","#acctBtn");await p.waitForTimeout(3200);
  const warm=await p.evaluate(()=>!!(V42AC&&V42AC.info&&V42AC.info.email));ok(warm,w+": SW-101: a signed-in page warms the account cache in the background after load");
  const t0=await p.evaluate(()=>{V42AC=null;V42ACP=null;window.__ACI=null;window.__ACP=null;go("account");const e=document.getElementById("signinMethods");return e?{t:e.innerText,busy:e.hasAttribute("aria-busy")}:null});
  ok(t0&&t0.busy&&!/not added|not set|@/.test(t0.t),w+": SW-101: a cold in-app visit shows neutral placeholders, never a wrong 'not added' / 'not set'",J(t0));
  await p.waitForFunction(()=>{const e=document.getElementById("signinMethods");return e&&!e.hasAttribute("aria-busy")&&/demo-pro@sawyer\.test/.test(e.innerText)},null,{timeout:15000}).catch(()=>{});
  const t1=await p.evaluate(()=>document.getElementById("signinMethods").innerText);ok(/demo-pro@sawyer\.test/.test(t1)&&/Password set/.test(t1),w+": SW-101: the real card arrives without a reload",t1.slice(0,200));
  // a stale cached answer is corrected in place, and the card is rebound through the AFTER chain (v18 dialog)
  await p.evaluate(()=>{V42AC.info=Object.assign({},V42AC.info,{password:false});go("dash")});await p.waitForTimeout(200);await p.evaluate(()=>go("account"));
  await p.waitForFunction(()=>/Password set/.test((document.getElementById("signinMethods")||{}).innerText||""),null,{timeout:15000}).catch(()=>{});
  ok(/Password set/.test(await p.evaluate(()=>document.getElementById("signinMethods").innerText)),w+": SW-101: a changed answer swaps in the corrected card");
  await p.click("#setPw");await p.waitForSelector("#modal .mbox",{timeout:8000}).catch(()=>{});
  const mt=await p.evaluate(()=>{const m=document.querySelector("#modal .mbox");return m?m.innerText.slice(0,160):""});ok(/password/i.test(mt),w+": SW-101: Change opens the password dialog after the swap",mt);
  if(w===390)await shot(p,"v42-account-390.png");
  ok((await p.evaluate(()=>window.__syncX.length))===0,w+": SW-101: still no synchronous XHR after in-app visits");
  await c.close()}

 // --- SW-102 / SW-103 rules in the page
 {const {c,p}=await page(L,1300,EC.ck);await go(L,p,"/dash");
  const R=await p.evaluate(()=>{const P=t=>v41ParseRecip(t).join(",");const zones={};for(const s of T_STATES)zones[s]=v41CallTz({state:s});let bad=[];for(const s of T_STATES){try{new Intl.DateTimeFormat("en-US",{timeZone:zones[s]})}catch(e){bad.push(s)}}
   return{dc1:P("Washington DC"),dc2:P("Washington, D.C."),dc3:P("Washington, DC"),dc4:P("washington d.c."),dc5:P("D.C. and Maryland"),dc6:P("District of Columbia"),dc7:P("Reciprocity: Washington DC, VA"),
    wa1:P("Washington state"),wa2:P("Washington"),wa3:P("Reciprocity: WA, OR"),wa4:P("Washington and Oregon"),wa5:P("Washington, Delaware"),
    prose:P("COME IN WITH YOUR CARD OR ASK ME"),acc:v41Accepts({lstate:"VA",recip:"Reciprocity from Washington, D.C. and Maryland"}).recip.join(","),
    fitDC:v41Fit({lic:"Journeyman",lstate:"VA",recip:"We accept Washington, D.C. cards"},{lic:[{type:"Journeyman",state:"DC"}],availNow:true}).lic.k,
    fitWA:v41Fit({lic:"Journeyman",lstate:"VA",recip:"We accept Washington, D.C. cards"},{lic:[{type:"Journeyman",state:"WA"}],availNow:true}).lic.ok,
    n:T_STATES.length,uniq:new Set(T_STATES).size,has:["HI","AK","DC","PR","ME","VT","WV"].every(s=>T_STATES.includes(s)),zones,bad}});
  for(const k of ["dc1","dc2","dc3","dc4","dc6"])ok(R[k]==="DC","SW-102: "+k+" parses as DC",R[k]);
  ok(R.dc5==="DC,MD","SW-102: 'D.C. and Maryland' is DC, MD",R.dc5);ok(R.dc7==="DC,VA","SW-102: 'Reciprocity: Washington DC, VA' is DC, VA",R.dc7);
  ok(R.wa1==="WA"&&R.wa2==="WA","SW-102: 'Washington state' and plain 'Washington' stay WA",R.wa1+"|"+R.wa2);
  ok(R.wa3==="WA,OR"&&R.wa4==="WA,OR"&&R.wa5==="WA,DE","SW-102: Washington state in lists is unchanged",[R.wa3,R.wa4,R.wa5].join("|"));
  ok(R.prose==="","SW-100 still holds: all-caps prose is not a state list",R.prose);
  ok(R.acc==="DC,MD","SW-102: a call accepting 'Washington, D.C. and Maryland' takes DC and MD cards",R.acc);
  ok(R.fitDC==="recip"&&R.fitWA===false,"SW-102: a DC card fits that call by reciprocity, a WA card doesn't",R.fitDC+"|"+R.fitWA);
  ok(R.n===52&&R.uniq===52&&R.has,"SW-103: T_STATES has all 50 states plus DC and PR",R.n);
  ok(!R.bad.length,"SW-103: every state's call zone is a real IANA zone",J(R.bad));
  const Z=R.zones;ok(Z.HI==="Pacific/Honolulu"&&Z.AK==="America/Anchorage"&&Z.PR==="America/Puerto_Rico","SW-103: HI, AK and PR resolve to Pacific/Honolulu, America/Anchorage, America/Puerto_Rico",J([Z.HI,Z.AK,Z.PR]));
  ok(Z.CA==="America/Los_Angeles"&&Z.VA==="America/New_York"&&Z.TX==="America/Chicago"&&Z.AZ==="America/Phoenix"&&Z.CO==="America/Denver"&&Z.DC==="America/New_York","SW-103: mainland zones are unchanged (CA, VA, TX, AZ, CO, DC)",J([Z.CA,Z.VA,Z.TX,Z.AZ,Z.CO,Z.DC]));
  ok(Object.values(Z).every(z=>z!==undefined&&z!==""),"SW-103: no state falls back to an empty zone");
  await c.close()}

 // --- SW-103: post calls anywhere, midnight in Hawaii
 {const base={trade:"Electrical",title:"",loc:"",state:"",type:"Commercial",weeks:4,hours:"50",rate:48,perDiem:120,start:"2026-12-01",need:3,lic:"Journeyman",lstate:"",recip:""};
  const post=async(st,loc,title,ck)=>act(L,ck||EC.ck,"postTravel",[Object.assign({},base,{state:st,lstate:st,loc,title})]);
  const EL=await signup(L,"pro","hielec","78701",{trade:"Electrical"});ok(EL.status===200&&EL.ck,"an electrical contractor with no calls signs up",J(EL.error));
  const hi=await post("HI","Kapolei","Kapolei solar + BESS journeymen",EL.ck);ok(hi.res.ok&&hi.res.id,"SW-103: postTravel accepts a call in Hawaii (HI)",J(hi.res));
  const ak=await post("AK","Anchorage","Anchorage hospital tie-in",EL.ck);ok(ak.res.ok&&ak.res.id,"SW-103: postTravel accepts Alaska (AK)",J(ak.res));
  const dc=await post("DC","Washington","DC data hall fit-out");ok(dc.res.ok,"SW-103: postTravel accepts DC",J(dc.res));
  const pr=await post("PR","San Juan","San Juan substation");ok(pr.res.ok,"SW-103: postTravel accepts Puerto Rico (PR)",J(pr.res));
  const vt=await post("VT","Burlington","Burlington school retrofit");ok(vt.res.ok,"SW-103: postTravel accepts a state that was missing before (VT)",J(vt.res));
  const zz=await post("ZZ","Nowhere","Bad state");ok(!zz.res.ok&&/state/i.test(zz.res.msg||""),"SW-103: a non-state is still refused",J(zz.res));
  const st=await stateFor(L,EL.ck);const call=(st.tcalls||[]).find(x=>x.id===hi.res.id);ok(call&&call.state==="HI"&&call.lstate==="HI","SW-103: the HI call is stored with state HI",J(call&&{s:call.state,l:call.lstate}));
  const recip=await act(L,EC.ck,"postTravel",[Object.assign({},base,{state:"VA",lstate:"VA",loc:"Ashburn",title:"Recip all states",recipStates:["HI","AK","DC","PR","VT"]})]);
  const rc=((await stateFor(L,EC.ck)).tcalls||[]).find(x=>x.id===recip.res.id);ok(rc&&rc.recipStates.join()==="HI,AK,DC,PR,VT","SW-103: reciprocity can name HI, AK, DC, PR and VT",J(rc&&rc.recipStates));
  // 11:30 pm Nov 30 in Honolulu is already Dec 1 in the East: the Hawaii call still starts tomorrow
  const cases=[["2026-12-01T09:30:00Z",hi.res.id,1,"starts tomorrow","11:30 pm HST Nov 30 (4:30 am ET Dec 1)"],["2026-12-01T10:05:00Z",hi.res.id,0,"starts today","12:05 am HST Dec 1"],["2026-12-02T09:59:00Z",hi.res.id,0,"starts today","11:59 pm HST Dec 1"],["2026-12-02T10:01:00Z",hi.res.id,-1,"started","12:01 am HST Dec 2"],
   ["2026-12-01T08:30:00Z",ak.res.id,1,"starts tomorrow","11:30 pm AKST Nov 30"],["2026-12-01T09:05:00Z",ak.res.id,0,"starts today","12:05 am AKST Dec 1"]];
  for(const [iso,id,days,txt,lbl] of cases){const {c,p}=await page(L,1300,EL.ck);await p.addInitScript(ms=>{window.__now=()=>ms},Date.parse(iso));await go(L,p,"/dash","#v41calls");
   const r=await p.evaluate(id=>{const c=(DB.tcalls||[]).find(x=>x.id===id);return{days:v41TDays(c),tz:v41CallTz(c),et:v41TodayIn("America/New_York"),local:v41TodayIn(v41CallTz(c))}},id);
   ok(r.days===days,"SW-103: "+lbl+": days to start is "+days+" on the call's own calendar",J(r));
   const row=await p.locator('#v41calls .v41row[data-call="'+id+'"]').innerText().catch(()=>"");
   ok(new RegExp(txt).test(row),"SW-103: "+lbl+": the dashboard row says '"+txt+"'",row.slice(0,200)||"(no row)");
   if(iso==="2026-12-01T09:30:00Z"){ok(r.et==="2026-12-01"&&r.local==="2026-11-30","SW-103: the midnight-Hawaii case is real (Dec 1 in the East, Nov 30 in Honolulu)",J(r));
    await p.locator('#v41calls').scrollIntoViewIfNeeded();await shot(p,"v42-hawaii-midnight-1300.png")}
   await c.close()}
  // the posting form offers every state
  const {c,p}=await page(L,390,EC.ck);await go(L,p,"/newtravel","#tpf");
  const f=await p.evaluate(()=>({opts:[...document.querySelectorAll("#tp-state option")].map(o=>o.value).filter(Boolean),recip:document.querySelectorAll("#tp-recipStates input[name=recipStates]").length}));
  ok(f.opts.length===52&&["HI","AK","DC","PR"].every(s=>f.opts.includes(s)),"SW-103: the job-state picker lists 52 (50 + DC + PR) incl. HI and AK",f.opts.length);
  ok(f.recip===52,"SW-103: the reciprocity picker has 52 labeled checkboxes",f.recip);
  await p.selectOption("#tp-state","HI");await p.locator("#tp-state").scrollIntoViewIfNeeded();await shot(p,"v42-travel-hi-390.png");
  await noOverflow(p,"390 /newtravel with 52 states");
  await c.close()}

 // --- Feature: Duplicate / Bill again
 {const st0=await stateFor(L,PRO.ck);const mine=(st0.bills||[]).filter(b=>b.by==="c1");
  const inv=mine.filter(b=>b.type==="inv"&&b.status!=="void"&&b.status!=="draft").sort((a,b)=>(b.sent||b.date)-(a.sent||a.date))[0];
  const paid=mine.find(b=>b.type==="inv"&&(b.payments||[]).length);const est=mine.find(b=>b.type==="est");const co=mine.find(b=>b.type==="co");
  ok(inv&&paid&&est,"demo-pro has invoices, a paid one and an estimate to copy",J({inv:!!inv,paid:!!paid,est:!!est,co:!!co}));
  const snapSrc=JSON.stringify(inv);const custNotifs=async()=>{return 0};
  const H=await login(L,"demo-homeowner@sawyer.test");const hn0=((await stateFor(L,H.ck)).notifs||[]).length;
  const r=await act(L,PRO.ck,"dupBill42",[inv.id]);ok(r.res.ok&&r.res.id&&r.res.id!==inv.id,"dupBill42 makes a new bill",J(r.res));
  ok(new RegExp("drafted from "+inv.no).test(r.res.msg||""),"the message names the source",r.res.msg);
  const st1=await stateFor(L,PRO.ck);const nb=(st1.bills||[]).find(b=>b.id===r.res.id),src=(st1.bills||[]).find(b=>b.id===inv.id);
  ok(nb&&nb.status==="draft"&&nb.type==="inv"&&nb.by==="c1","the copy is a draft invoice owned by the pro",J(nb&&{s:nb.status,t:nb.type}));
  ok(nb&&nb.no!==inv.no&&/^INV-/.test(nb.no),"the copy has its own number",nb&&nb.no);
  ok(nb&&nb.cust===inv.cust&&nb.cname===inv.cname&&nb.title===inv.title&&nb.job===inv.job&&nb.tax===inv.tax&&nb.kind===inv.kind,"same customer, title, job, tax and kind",J(nb&&{c:nb.cname,t:nb.title}));
  const plain=(inv.lines||[]).filter(l=>!l.l36).map(l=>[l.d,l.q,l.r].join("|")).join("~");ok(nb&&nb.lines.map(l=>[l.d,l.q,l.r].join("|")).join("~")===plain,"same line items (descriptions, qty, rates)");
  ok(nb&&!(nb.payments||[]).length&&!(nb.reminders||[]).length&&!nb.sent&&!nb.viewed&&!nb.approved&&!(nb.ph36||[]).length&&nb.po==="","payments, reminders, history, photos and P.O. are not copied",J(nb&&{p:nb.payments,r:nb.reminders,po:nb.po}));
  ok(nb&&Math.abs(nb.date-Date.now())<120000,"the copy is dated now",nb&&nb.date);
  const terms=(()=>{const t0=new Date(inv.sent||inv.date);const s=Date.UTC(t0.getUTCFullYear(),t0.getUTCMonth(),t0.getUTCDate());const n=Math.round((Date.parse(inv.due+"T00:00:00Z")-s)/864e5);return n>=1&&n<=120?n:14})();
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const exp=new Date(Date.parse(today+"T00:00:00Z")+terms*864e5).toISOString().slice(0,10);ok(nb&&nb.due===exp,"due date keeps the original terms ("+terms+" days) from today in the pro's zone",J({due:nb&&nb.due,exp}));
  ok(nb&&nb.dup42&&nb.dup42.no===inv.no,"the copy remembers its source number",J(nb&&nb.dup42));
  ok(JSON.stringify(src)===snapSrc,"the source invoice is unchanged");
  const hn1=((await stateFor(L,H.ck)).notifs||[]).length;ok(hn1===hn0,"nothing is sent to the customer when a draft is duplicated",hn0+"->"+hn1);
  // paid invoice can be duplicated (the "void it and issue a new one" path); estimate keeps deposit/validity; CO refused
  const rp=await act(L,PRO.ck,"dupBill42",[paid.id]);ok(rp.res.ok,"an invoice with payments can be duplicated",J(rp.res));
  const re=await act(L,PRO.ck,"dupBill42",[est.id]);const ne=((await stateFor(L,PRO.ck)).bills||[]).find(b=>b.id===re.res.id);
  ok(re.res.ok&&ne&&ne.type==="est"&&/^EST-/.test(ne.no)&&ne.deposit===est.deposit&&/^\d{4}-\d{2}-\d{2}$/.test(ne.valid||"")&&!ne.due,"an estimate copies as an estimate with its deposit and a new valid-until date",J(ne&&{no:ne.no,dep:ne.deposit,v:ne.valid}));
  if(co){const rc=await act(L,PRO.ck,"dupBill42",[co.id]);ok(!rc.res.ok&&/change order/i.test(rc.res.msg||""),"a change order is refused with a reason",J(rc.res))}
  // job-cost lines are left off
  {const sA=await act(L,PRO.ck,"addLedger",[{kind:"exp",amt:"42.10",cat:"Materials",vendor:"V42 Supply",job:"V42 job",date:today}]);ok(sA.res.ok!==false,"a receipt is logged",J(sA.res));
   const led=((sA.st.ledger)||[]).filter(l=>l.vendor==="V42 Supply").slice(-1)[0];ok(led&&led.id,"the receipt has an id",J(led));
   const sb=await act(L,PRO.ck,"saveBill",[{type:"inv",cust:inv.cust,title:"V42 job costs",job:"V42 job",tax:0,lines:[{d:"Labor",q:2,r:95},{d:"Materials: V42 Supply",q:1,r:42.1,l36:led&&led.id}]}]);
   const jb=((await stateFor(L,PRO.ck)).bills||[]).find(b=>b.id===sb.res.id);ok(jb&&jb.lines.some(l=>l.l36),"a bill with a job-cost line exists",J(jb&&jb.lines));
   const rj=await act(L,PRO.ck,"dupBill42",[sb.res.id]);const nj=((await stateFor(L,PRO.ck)).bills||[]).find(b=>b.id===rj.res.id);
   ok(rj.res.ok&&nj&&nj.lines.length===1&&nj.lines[0].d==="Labor"&&!nj.lines.some(l=>l.l36),"job-cost lines (receipts) are left off the copy",J(nj&&nj.lines));
   ok(/1 job-cost line was left off/.test(rj.res.msg||"")&&nj.dup42.skipped===1,"and the pro is told",rj.res.msg);
   const sB=await act(L,PRO.ck,"addLedger",[{kind:"exp",amt:"18.40",cat:"Materials",vendor:"V42 Supply 2",job:"V42 job",date:today}]);const led2=((sB.st.ledger)||[]).filter(l=>l.vendor==="V42 Supply 2").slice(-1)[0];
   const only=await act(L,PRO.ck,"saveBill",[{type:"inv",cust:inv.cust,title:"Only costs",tax:0,lines:[{d:"Materials: V42 Supply 2",q:1,r:18.4,l36:led2&&led2.id}]}]);
   ok((((await stateFor(L,PRO.ck)).bills||[]).find(b=>b.id===only.res.id)||{lines:[]}).lines.every(l=>l.l36),"a bill made only of a job-cost line exists");
   const ro=await act(L,PRO.ck,"dupBill42",[only.res.id]);ok(!ro.res.ok&&/billed once/.test(ro.res.msg||""),"a bill of only job costs can't be duplicated (receipts bill once)",J(ro.res))}
  // who can't
  const other=await signup(L,"pro","dupother","78701");const ro=await act(L,other.ck,"dupBill42",[inv.id]);ok(!ro.res.ok&&!((await stateFor(L,other.ck)).bills||[]).some(b=>b.dup42),"another pro can't duplicate someone else's invoice",J(ro.res));
  const rh=await act(L,H.ck,"dupBill42",[inv.id]);ok(!rh.res.ok,"a customer can't duplicate the pro's invoice",J(rh.res));
  const rs=await req(L.port,"POST","/api/act",JH,J({name:"dupBill42",args:[inv.id]}));ok(rs.status===401,"signed out is refused",rs.status);
  const rx=await act(L,PRO.ck,"dupBill42",["nope"]);ok(!rx.res.ok,"an unknown id is refused",J(rx.res));
  // UI
  for(const w of [390,1300]){const {c,p}=await page(L,w,PRO.ck);await go(L,p,"/office/invoices","#v42again");
   const t=await p.locator("#v42again").innerText().catch(()=>"");ok(/again\?/.test(t)&&/Duplicate last invoice/.test(t),w+": Office -> Invoices has the 'Bill again' card",t.slice(0,200));
   const last=await p.evaluate(()=>{const b=v42LastInv(me());return b&&b.no});ok(last&&t.includes(last),w+": it names the last invoice sent ("+last+")",t.slice(0,200));
   await axe(p,"#v42again",w+" Bill again card");await noOverflow(p,w+" /office/invoices");
   await p.locator("#v42again").scrollIntoViewIfNeeded();await p.waitForTimeout(300);await shot(p,"v42-bill-again-"+w+".png");
   await p.click("#v42againB");await p.waitForSelector("#v42dupn",{timeout:15000}).catch(()=>{});
   const n=await p.locator("#v42dupn").innerText().catch(()=>"");ok(new RegExp("Copied from "+last).test(n)&&/weren't copied/.test(n),w+": the editor says what was copied",n.slice(0,240));
   ok(/\/invedit\//.test(p.url()),w+": Duplicate opens the new draft in the editor",p.url());
   await p.waitForTimeout(700);await axe(p,"#v42dupn",w+" copied-from note");if(w===1300)await shot(p,"v42-dup-editor-1300.png");
   await p.click("#bedF button.primary");await p.waitForSelector("#bDup42",{timeout:15000}).catch(()=>{});
   const tl=await p.locator(".o7-tl").innerText().catch(()=>"");ok(new RegExp("Duplicated from "+last).test(tl),w+": the sent copy's timeline says where it came from",tl.slice(0,200));
   ok(await p.locator("#bDup42").count()===1,w+": the invoice page has Duplicate");await p.waitForTimeout(900);await axe(p,".o7-side",w+" invoice actions");
   if(w===390){await p.locator("#bDup42").scrollIntoViewIfNeeded();await p.waitForTimeout(300);await shot(p,"v42-invoice-dup-390.png")}
   await p.goto(L.B+"/invedit/"+paid.id,{waitUntil:"networkidle"});await p.waitForSelector("#v42lockDup",{timeout:15000}).catch(()=>{});ok(await p.locator("#v42lockDup").count()===1,w+": a paid (locked) invoice offers 'Duplicate instead'");
   await c.close()}
  const hs=await stateFor(L,H.ck);const sentCopies=(hs.bills||[]).filter(b=>b.dup42);ok(sentCopies.every(b=>b.status!=="draft"),"the customer only ever sees copies the pro sent, never drafts",J(sentCopies.map(b=>b.status)))}


 ok(!errs.length,"no page errors",errs.join(" | "));
}catch(e){failed++;console.log("FAIL crashed: "+(e&&e.stack||e))}finally{try{if(br)await br.close()}catch(e){}for(const s of SERVERS)await stopApp(s);
 console.log(failed?"\n"+failed+" FAILED":"\nALL PASS");process.exit(failed?1:0)}})();
