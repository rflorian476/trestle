// v44 end-to-end. Self-contained: starts its own Sawyer server (local test mode, no real email or SMS, payments in test
// mode). Covers health 2.27.0-sawyer / SW cache sawyer-v44 (or later), and:
// SW-105 follow-up: a dupBill42 idempotency key is scoped to (owner, source, key); a key reused on another source is refused.
// Account card: v42AcctRefresh updates #signinMethods in place (same node), and the v18 password dialog still opens.
// v10 st10Ready: retries /travel once and a timeout is a logged FAIL line, not an uncaught crash.
// /dash perf: signed-in /dash ships less JS / CSS up front; the deferred layers still load on demand.
// Usage: node test/v44-e2e.js [shots dir]
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const {DatabaseSync}=require("node:sqlite");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,400)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
const STRIP=["NODE_ENV","RENDER","AUTH_TEST_MODE","STAFF_DEMO_PASSWORD","RESEND_API_KEY","SENDGRID_API_KEY","EMAIL_FROM","MAIL_FROM","RESEND_API_URL","TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_FROM","TWILIO_MESSAGING_SERVICE_SID","TEST_NOW","SAWYER_BASE_URL","PUBLIC_URL","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","APPLE_CLIENT_ID","MICROSOFT_CLIENT_ID","FACEBOOK_APP_ID","VAPID_PRIVATE_KEY","VAPID_PUBLIC_KEY","VAPID_SUBJECT","PUSH_DEBUG","PUSH_TEST_ORIGIN","PUSH_RETRY_MS","SAWYER_PERSISTENT","EMAIL_DELIVERY_VERIFIED","SMS_DELIVERY_VERIFIED"];
async function startApp(extra,dir){const port=await freePort();
 const created=!dir;dir=dir||fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v44-"));
 const env=Object.assign({},process.env,{HOST:"127.0.0.1",PORT:String(port),DATA_DIR:dir,RATE_X:"50"});
 for(const k of STRIP)if(!extra||!(k in extra))delete env[k];
 if(extra)Object.assign(env,extra);
 const child=spawn(process.execPath,[path.join(ROOT,"server.js")],{env,stdio:["ignore","pipe","pipe"]});
 let log="";child.stdout.on("data",d=>{log+=d});child.stderr.on("data",d=>{log+=d});
 return new Promise((res,no)=>{const t=setTimeout(()=>no(new Error("server did not start\n"+log.slice(-500))),15000);
  const wait=()=>{if(/live on/.test(log)){clearTimeout(t);res({child,dir,log:()=>log,port,B:"http://127.0.0.1:"+port,created})}else setTimeout(wait,30)};
  child.on("exit",c=>{clearTimeout(t);no(new Error("server exited "+c+"\n"+log.slice(-500)))});wait()})}
function stopApp(s,keepDir){return new Promise(res=>{if(!s||s.child.exitCode!==null){if(!keepDir)try{fs.rmSync(s.dir,{recursive:true,force:true})}catch(e){}return res()}
  const done=()=>{if(!keepDir)try{fs.rmSync(s.dir,{recursive:true,force:true})}catch(e){}res()};s.child.on("exit",done);s.child.kill("SIGTERM");setTimeout(()=>{try{s.child.kill("SIGKILL")}catch(e){}},3000)})}
function req(port,method,p,headers,body){return new Promise((res,no)=>{const r=http.request({hostname:"127.0.0.1",port,path:p,method,headers:headers||{}},rs=>{const ch=[];rs.on("data",c=>ch.push(c));rs.on("end",()=>{let buf=Buffer.concat(ch);const enc=rs.headers["content-encoding"];if(enc==="gzip")buf=zlib.gunzipSync(buf);else if(enc==="br")buf=zlib.brotliDecompressSync(buf);let json=null;try{json=JSON.parse(buf.toString("utf8"))}catch(e){}res({status:rs.statusCode,headers:rs.headers,body:buf.toString("utf8"),json})})});r.on("error",no);if(body)r.write(body);r.end()})}
const J=o=>JSON.stringify(o),JH={"Content-Type":"application/json"};
const stateOf=r=>(r.json&&(r.json.state||r.json))||{};
const sigCk=r=>(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0];
function readBills(dir){const db=new DatabaseSync(path.join(dir,"sawyer.db"),{readOnly:true});try{const row=db.prepare("SELECT v FROM appdata WHERE k=?").get("bills");return JSON.parse(row.v)}finally{db.close()}}
function writeBills(dir,bills){const db=new DatabaseSync(path.join(dir,"sawyer.db"));try{db.prepare("INSERT INTO appdata(k,v,updated) VALUES(?,?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v,updated=excluded.updated").run("bills",JSON.stringify(bills),Date.now())}finally{db.close()}}
function uniquePairs(bills,by){const seen=new Set(),dups=[];for(const b of bills||[]){if(!b||(by&&b.by!==by)||!b.type||!b.no)continue;const k=b.by+"|"+b.type+"|"+b.no;if(seen.has(k))dups.push(k);else seen.add(k)}return dups}

const SERVERS=[];let br=null;
(async()=>{try{
 const run=Math.random().toString(36).slice(2,8);
 const SH=process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),"v44-shots-"));fs.mkdirSync(SH,{recursive:true});
 const L=await startApp();SERVERS.push(L);
 const act=async(S,ck,name,args)=>{const r=await req(S.port,"POST","/api/act",Object.assign(ck?{Cookie:ck}:{},JH),J({name,args}));return {res:(r.json&&r.json.res)||{},st:stateOf(r),status:r.status,error:r.json&&r.json.error}};
 const stateFor=async(S,ck)=>stateOf(await req(S.port,"GET","/api/state",ck?{Cookie:ck}:{}));
 const signup=async(S,kind,tag,zip,extra)=>{const email="v44-"+tag+"-"+run+"@example.com";const data=Object.assign({name:(kind==="pro"?"Val ":"Hana ")+tag,email,zip},kind==="pro"?{biz:"V44 "+tag+" "+run,trade:"Plumbing",phone:"5125550100",plan:"founding"}:kind==="pm"?{biz:"V44 PM "+tag}:{},extra||{});
  const r=await req(S.port,"POST","/api/signup",JH,J({kind,password:"v44-correct-horse",data}));return{status:r.status,error:r.json&&r.json.error,ck:sigCk(r),id:stateOf(r).me,st:stateOf(r),email}};
 const login=async(S,email)=>{const r=await req(S.port,"POST","/api/login",JH,J({email,password:"sawyer-demo-2026"}));return{status:r.status,ck:sigCk(r),id:stateOf(r).me}};
 br=await chromium.launch();
 const page=async(S,w,ck)=>{const c=await br.newContext({viewport:{width:w,height:w<500?844:900},deviceScaleFactor:w<500?2:1,bypassCSP:true,hasTouch:w<500});
  if(ck){const [k,v]=ck.split("=");await c.addCookies([{name:k,value:v,url:S.B}])}
  const p=await c.newPage();return{c,p}};
 const go=async(S,p,u,sel)=>{await p.goto(S.B+u,{waitUntil:"networkidle"});await p.waitForFunction(()=>typeof __PART!=="undefined"&&!__PART&&typeof me==="function",null,{timeout:60000,polling:100});if(sel)await p.waitForSelector(sel,{timeout:20000}).catch(()=>{})};


 // --- release
 {const hz=(await req(L.port,"GET","/healthz")).json||{};ok(/^2\.(2[7-9]|[3-9]\d)\.\d+-sawyer$/.test(hz.v||""),"healthz reports a Sawyer version from 2.27.0 on",J(hz));
  const sw=await req(L.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v(4[4-9]|[5-9]\d)"/.test(sw.body),"service worker cache is sawyer-v44 or later")}

 // --- SW-105 follow-up: idempotency key scoped to (owner, source, key)
 {const P=await signup(L,"pro","keys","78704");const C=await signup(L,"customer","keycu","78704");ok(P.status===200&&P.ck,"fixture pro signs up",J(P.error));
  const cust=await act(L,P.ck,"saveCust",[{name:"Key Clinic",email:C.email}]);
  const mk=async t=>{const r=await act(L,P.ck,"saveBill",[{type:"inv",cust:cust.res.id,title:t,lines:[{d:"Labor",q:1,r:120}]}]);await act(L,P.ck,"sendBill",[r.res.id]);return r.res.id};
  const A1=await mk("Source A"),B1=await mk("Source B");
  const k="v44-key-"+run;
  const b1=await act(L,P.ck,"dupBill42",[B1,k]);ok(b1.res.ok&&b1.res.id,"key K on source B mints a draft",J(b1.res));
  const b2=await act(L,P.ck,"dupBill42",[B1,k]);ok(b2.res.ok&&b2.res.id===b1.res.id,"key K again on source B returns the same draft",J(b2.res));
  const a1=await act(L,P.ck,"dupBill42",[A1,k]);
  ok(!a1.res.ok&&a1.res.id!==b1.res.id&&a1.res.code==="key_reused","key K reused on source A is refused and does NOT open B's draft",J(a1.res));
  ok(/different invoice/i.test(a1.res.msg||""),"the refusal explains the key was used on a different invoice",a1.res.msg);
  const bills=(await stateFor(L,P.ck)).bills||[];
  ok(!bills.some(b=>b.by===P.id&&b.dup42&&b.dup42.from===A1),"no draft of A was created by the reused key",J(bills.filter(b=>b.dup42).map(b=>b.dup42)));
  const a2=await act(L,P.ck,"dupBill42",[A1,k+"-a"]);ok(a2.res.ok&&a2.res.id&&a2.res.id!==b1.res.id,"a fresh key on source A mints A's own draft",J(a2.res));
  const a3=await act(L,P.ck,"dupBill42",[A1,k+"-a"]);ok(a3.res.ok&&a3.res.id===a2.res.id,"that key again on A returns A's draft",J(a3.res));
  const dA=((await stateFor(L,P.ck)).bills||[]).find(b=>b.id===a2.res.id);ok(dA&&dA.dup42&&dA.dup42.from===A1&&dA.dup42.key===k+"-a","A's draft records source A and its key",J(dA&&dA.dup42));
  // another business using the same key string is independent
  const Q=await signup(L,"pro","keys2","78704");const C2=await signup(L,"customer","keycu2","78704");
  const cu2=await act(L,Q.ck,"saveCust",[{name:"Other Clinic",email:C2.email}]);
  const q1=await act(L,Q.ck,"saveBill",[{type:"inv",cust:cu2.res.id,title:"Q source",lines:[{d:"Labor",q:1,r:80}]}]);await act(L,Q.ck,"sendBill",[q1.res.id]);
  const qd=await act(L,Q.ck,"dupBill42",[q1.res.id,k]);ok(qd.res.ok&&qd.res.id&&qd.res.id!==b1.res.id,"the same key string in another business mints that business's own draft",J(qd.res));
  // no key: unchanged behaviour (after the 15s lock a deliberate second duplicate still works is covered by v43)
  const nk=await act(L,P.ck,"dupBill42",[B1]);ok(nk.res.ok&&nk.res.id,"a call without a key still works",J(nk.res))}

 // --- account card: v42AcctRefresh updates #signinMethods in place, v18 password dialog still binds
 {const U=await signup(L,"customer","acct","78704");ok(U.status===200&&U.ck,"account fixture signs up",J(U.error));
  for(const w of[390,1300]){const {c,p}=await page(L,w,U.ck);await go(L,p,"/account","#signinMethods");
   await p.waitForFunction(()=>{const e=document.getElementById("signinMethods");return e&&!e.hasAttribute("aria-busy")&&/@example\.com/.test(e.innerText)},null,{timeout:15000}).catch(()=>{});
   // cold visit: placeholder node is the node that receives the real card
   const cold=await p.evaluate(()=>{V42AC=null;V42ACP=null;window.__ACI=null;window.__ACP=null;go("account");const e=document.getElementById("signinMethods");window.__n44=e;return{busy:!!(e&&e.hasAttribute("aria-busy"))}});
   await p.waitForFunction(()=>{const e=document.getElementById("signinMethods");return e&&!e.hasAttribute("aria-busy")&&/@example\.com/.test(e.innerText)},null,{timeout:15000}).catch(()=>{});
   const c1=await p.evaluate(()=>{const e=document.getElementById("signinMethods");return{same:e===window.__n44,conn:window.__n44.isConnected,busy:e.hasAttribute("aria-busy"),n:document.querySelectorAll("#signinMethods").length,t:e.innerText.slice(0,120)}});
   ok(cold.busy&&c1.same&&c1.conn&&!c1.busy&&c1.n===1,w+": cold visit fills the placeholder card in place (same node, aria-busy cleared, one card)",J({cold,c1}));
   // stale cache: corrected in place
   await p.evaluate(()=>{V42AC.info=Object.assign({},V42AC.info,{password:false});go("dash")});await p.waitForTimeout(150);
   const s0=await p.evaluate(()=>{go("account");const e=document.getElementById("signinMethods");window.__n44=e;return/not set/.test(e.innerText)});
   await p.waitForFunction(()=>/Password set/.test((document.getElementById("signinMethods")||{}).innerText||""),null,{timeout:15000}).catch(()=>{});
   const s1=await p.evaluate(()=>{const e=document.getElementById("signinMethods");return{same:e===window.__n44,conn:window.__n44.isConnected,set:/Password set/.test(e.innerText)}});
   ok(s0&&s1.same&&s1.conn&&s1.set,w+": a stale card is corrected in place (no replaceWith; the held node stays attached)",J({s0,s1}));
   await p.waitForTimeout(1200);
   const s2=await p.evaluate(()=>({same:document.getElementById("signinMethods")===window.__n44,busy:!!V42ACP}));ok(s2.same,w+": the card node is still the same after any follow-up refresh",J(s2));
   await p.click("#setPw");await p.waitForSelector("#modal #pw18",{timeout:8000}).catch(()=>{});
   const dlg=await p.evaluate(()=>({v18:!!document.querySelector("#modal #pw18"),confirm:!!document.getElementById("npw2"),cur:!!document.getElementById("cpw")}));
   ok(dlg.v18&&dlg.confirm&&dlg.cur,w+": Change opens the v18 password dialog (confirm + current fields) after the in-place update",J(dlg));
   if(w===390)await p.screenshot({path:path.join(SH,"v44-account-pwdialog-390.png")});
   await c.close()}}
//@@V44MORE@@

 if(failed)throw new Error(failed+" check(s) failed");
 console.log("OK v44-e2e");
}catch(e){if(!/check\(s\) failed$/.test(String(e&&e.message)))console.log("FAIL crashed: "+String(e&&e.message||e).split("\n")[0].slice(0,300));console.error(e&&e.stack||e);failed++;}
finally{if(br)await br.close().catch(()=>{});await Promise.all(SERVERS.map(s=>stopApp(s)));process.exit(failed?1:0)}})();
