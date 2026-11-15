// v33 end-to-end. Self-contained: starts its own Sawyer server (local test mode) and a local stand-in push service.
// Covers: SW-069 (push endpoints are canonicalized: lowercase scheme/host, no trailing slash, odd spellings refused, one
// key for subscribe / conflict / unsubscribe / status / test; v32 rows migrated at start), health 2.16.0-sawyer and the
// v33 features (see the sections below). No real push service or email provider is contacted: deliveries go to the local
// stand-in (PUSH_TEST_ORIGIN); the fcm.googleapis.com endpoints below are only subscribed / checked / removed, never sent to.
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib"),crypto=require("crypto");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra,keepDir){
 const dir=keepDir||fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v33-"));
 const env=Object.assign({},process.env,{HOST:"127.0.0.1",PORT:String(port),DATA_DIR:dir,RATE_X:"50"});
 for(const k of ["NODE_ENV","RENDER","AUTH_TEST_MODE","STAFF_DEMO_PASSWORD","RESEND_API_KEY","SENDGRID_API_KEY","EMAIL_FROM","MAIL_FROM","RESEND_API_URL","TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_FROM","TWILIO_MESSAGING_SERVICE_SID","TEST_NOW","SAWYER_BASE_URL","PUBLIC_URL","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","APPLE_CLIENT_ID","MICROSOFT_CLIENT_ID","FACEBOOK_APP_ID","VAPID_PRIVATE_KEY","VAPID_PUBLIC_KEY","VAPID_SUBJECT","PUSH_DEBUG","PUSH_TEST_ORIGIN","PUSH_RETRY_MS"])if(!extra||!(k in extra))delete env[k];
 if(extra)Object.assign(env,extra);
 const child=spawn(process.execPath,[path.join(ROOT,"server.js")],{env,stdio:["ignore","pipe","pipe"]});
 let log="";child.stdout.on("data",d=>{log+=d});child.stderr.on("data",d=>{log+=d});
 return new Promise((res,no)=>{const t=setTimeout(()=>no(new Error("server did not start\n"+log.slice(-400))),15000);
  const wait=()=>{if(/live on/.test(log)){clearTimeout(t);res({child,dir,log:()=>log,port,B:"http://127.0.0.1:"+port})}else setTimeout(wait,30)};
  child.on("exit",c=>{clearTimeout(t);no(new Error("server exited "+c+"\n"+log.slice(-400)))});wait()})}
function stopApp(s,keep){return new Promise(res=>{if(!s)return res();const done=()=>{if(!keep)try{fs.rmSync(s.dir,{recursive:true,force:true})}catch(e){}res()};s.child.on("exit",done);s.child.kill("SIGTERM");setTimeout(()=>{try{s.child.kill("SIGKILL")}catch(e){}},3000)})}
function req(port,method,p,headers,body){return new Promise((res,no)=>{const r=http.request({hostname:"127.0.0.1",port,path:p,method,headers:headers||{}},rs=>{const ch=[];rs.on("data",c=>ch.push(c));rs.on("end",()=>{let buf=Buffer.concat(ch);const enc=rs.headers["content-encoding"];if(enc==="gzip")buf=zlib.gunzipSync(buf);else if(enc==="br")buf=zlib.brotliDecompressSync(buf);let json=null;try{json=JSON.parse(buf.toString("utf8"))}catch(e){}res({status:rs.statusCode,headers:rs.headers,body:buf.toString("utf8"),json,raw:buf})})});r.on("error",no);if(body)r.write(body);r.end()})}
const J=o=>JSON.stringify(o),JH={"Content-Type":"application/json"};
const stateOf=r=>(r.json&&(r.json.state||r.json))||{};
const login=async(port,email,pw)=>{const r=await req(port,"POST","/api/login",JH,J({email,password:pw||"sawyer-demo-2026"}));return {ck:(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0],st:(r.json&&r.json.state)||{}}};
const act=async(port,ck,name,args)=>{const r=await req(port,"POST","/api/act",Object.assign({Cookie:ck},JH),J({name,args}));return {res:(r.json&&r.json.res)||{},st:stateOf(r),status:r.status}};
const post=(port,ck,p,o)=>req(port,"POST",p,Object.assign(ck?{Cookie:ck}:{},JH),J(o||{}));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// ---- the "browser" side of Web Push: a device key pair, and RFC 8291 decryption written independently of the server ----
const hmac=(k,d)=>crypto.createHmac("sha256",k).update(d).digest();
function device(){const e=crypto.createECDH("prime256v1");e.generateKeys();const auth=crypto.randomBytes(16);return{e,auth,keys:{p256dh:e.getPublicKey().toString("base64url"),auth:auth.toString("base64url")}}}
function decrypt(dev,buf){const salt=buf.subarray(0,16),rs=buf.readUInt32BE(16),idl=buf[20],as=buf.subarray(21,21+idl),ct=buf.subarray(21+idl);
 const shared=dev.e.computeSecret(as);const ikm=hmac(hmac(dev.auth,shared),Buffer.concat([Buffer.from("WebPush: info\0"),dev.e.getPublicKey(),as,Buffer.from([1])]));const prk=hmac(salt,ikm);
 const cek=hmac(prk,Buffer.concat([Buffer.from("Content-Encoding: aes128gcm\0"),Buffer.from([1])])).subarray(0,16),nonce=hmac(prk,Buffer.concat([Buffer.from("Content-Encoding: nonce\0"),Buffer.from([1])])).subarray(0,12);
 const d=crypto.createDecipheriv("aes-128-gcm",cek,nonce);d.setAuthTag(ct.subarray(ct.length-16));let pt=Buffer.concat([d.update(ct.subarray(0,ct.length-16)),d.final()]);
 let i=pt.length-1;while(i>=0&&pt[i]===0)i--;if(pt[i]!==2)throw new Error("no last-record delimiter");return{json:JSON.parse(pt.subarray(0,i).toString("utf8")),rs,idl}}
function verifyVapid(auth,pubB64,aud){const m=/^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(String(auth||""));if(!m)return{ok:false,why:"header shape"};
 if(m[4]!==pubB64)return{ok:false,why:"k is not the server's public key"};const raw=Buffer.from(pubB64,"base64url");
 const key=crypto.createPublicKey({key:{kty:"EC",crv:"P-256",x:raw.subarray(1,33).toString("base64url"),y:raw.subarray(33).toString("base64url")},format:"jwk"});
 const sigOk=crypto.verify("sha256",Buffer.from(m[1]+"."+m[2]),{key,dsaEncoding:"ieee-p1363"},Buffer.from(m[3],"base64url"));
 const h=JSON.parse(Buffer.from(m[1],"base64url")),c=JSON.parse(Buffer.from(m[2],"base64url"));const now=Date.now()/1000;
 return{ok:sigOk&&h.alg==="ES256"&&c.aud===aud&&c.exp>now&&c.exp<=now+86400&&/^(mailto:|https:)/.test(c.sub),h,c,sigOk}}
// ---- stand-in push service (what FCM / Mozilla / Apple would be) ----
function pushService(){const got=[];const srv=http.createServer((rq,rs)=>{const ch=[];rq.on("data",c=>ch.push(c));rq.on("end",()=>{got.push({path:rq.url,method:rq.method,headers:rq.headers,body:Buffer.concat(ch)});
  if(/\/gone\//.test(rq.url)){rs.writeHead(410);return rs.end()}rs.writeHead(201);rs.end()})});
 return new Promise(res=>srv.listen(0,"127.0.0.1",()=>res({srv,got,port:srv.address().port,origin:"http://127.0.0.1:"+srv.address().port})))}
let LOCAL=null,br=null,PS=null;
const sigCk=r=>(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0];
(async()=>{try{
 PS=await pushService();
 LOCAL=await startApp(await freePort(),{PUSH_TEST_ORIGIN:PS.origin,PUSH_RETRY_MS:"150"});
 const hz=(await req(LOCAL.port,"GET","/healthz")).json||{};ok(hz.v==="2.16.0-sawyer","healthz reports 2.16.0-sawyer",J(hz));
 const sw=await req(LOCAL.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v33"/.test(sw.body),"service worker cache is sawyer-v33 (client assets changed)");
 const run=Math.random().toString(36).slice(2,8);
 const signupPro=async(tag,trade,zip)=>{const r=await req(LOCAL.port,"POST","/api/signup",JH,J({kind:"pro",password:"v33-correct-horse",data:{name:"Vee "+tag,biz:"V33 "+tag+" "+run,email:"v33-"+tag+"-"+run+"@example.com",trade:trade||"Plumbing",zip:zip||"78704",phone:"5125550100",plan:"founding"}}));return{ck:sigCk(r),id:stateOf(r).me}};
 const signupHo=async(tag)=>{const r=await req(LOCAL.port,"POST","/api/signup",JH,J({kind:"customer",password:"v33-correct-horse",data:{name:"Hana "+tag,email:"v33-ho-"+tag+"-"+run+"@example.com",zip:"78704"}}));return{ck:sigCk(r),id:stateOf(r).me}};

 // ===== 1. SW-069: one device, one key =====
 {const V=await signupPro("vic"),X=await signupPro("att");ok(V.ck&&X.ck,"SW-069: two throwaway pros sign up");
  const dv=device(),dx=device(),dv2=device();
  const sub=(ck,ep,d)=>post(LOCAL.port,ck,"/api/push/subscribe",{sub:{endpoint:ep,keys:d.keys}});
  const st=(ck,ep)=>post(LOCAL.port,ck,"/api/push/status",{endpoint:ep}).then(r=>r.json||{});
  const GEN=/another|already|account|user|owner|belong|taken|exists|registered/i;
  // (a) local push service origin: trailing slash / scheme case / many slashes are the same device
  const base=PS.origin+"/send/sw69-"+run;
  let r=await sub(V.ck,base,dv);ok(r.status===200&&r.json.on===true&&r.json.devices===1,"victim turns alerts on for "+"/send/sw69-…",J(r.json));
  for(const [lbl,ep] of [["trailing slash",base+"/"],["upper-case scheme",base.replace("http://","HTTP://")]]){
   r=await sub(X.ck,ep,dx);ok(r.status===409&&!GEN.test(r.json&&r.json.error||"")&&/Couldn't turn alerts on for this device/.test(r.json.error),"SW-069: another account subscribing the "+lbl+" variant gets the generic 409",r.status+" "+J(r.json))}
  {const s=await st(X.ck,base+"/");ok(s.on===false&&s.devices===0,"the other account has no device after the variants",J(s))}
  {const s=await st(V.ck,base);ok(s.on===true&&s.devices===1,"victim still has exactly one device",J(s))}
  {const s=await st(V.ck,base+"/");ok(s.on===true,"status looks up the canonical key (a trailing slash still reads as on)",J(s))}
  // same account, variant spelling: updates the one row (new keys), no sibling
  r=await sub(V.ck,base+"/",dv2);ok(r.status===200&&r.json.devices===1&&r.json.on===true,"same account resubscribing a variant updates its row (still 1 device)",J(r.json));
  {const {DatabaseSync}=require("node:sqlite");const d=new DatabaseSync(path.join(LOCAL.dir,"sawyer.db"));const rows=d.prepare("SELECT endpoint,url,uid,p256dh FROM pushsubs WHERE endpoint LIKE ?").all("%sw69-"+run+"%");d.close();
   ok(rows.length===1&&rows[0].endpoint===base&&rows[0].uid===V.id&&rows[0].p256dh===dv2.keys.p256dh&&rows[0].url===base+"/","one row: canonical key, the victim's uid, the new keys, and the browser's own URL for delivery",J(rows))}
  // test alert: found by any spelling, delivered to the URL the browser gave
  PS.got.length=0;r=await post(LOCAL.port,V.ck,"/api/push/test",{endpoint:base.replace("http://","HTTP://")});await sleep(300);
  ok(r.status===200&&r.json.sent===1&&PS.got.length===1&&PS.got[0].path==="/send/sw69-"+run+"/","test alert: canonical lookup, delivered to the stored URL",r.status+" "+J(r.json)+" "+J(PS.got.map(g=>g.path)));
  // the other account can't remove it with a variant
  await post(LOCAL.port,X.ck,"/api/push/unsubscribe",{endpoint:base+"/"});{const s=await st(V.ck,base);ok(s.on===true,"another account's unsubscribe of a variant leaves the victim's device",J(s))}
  // the owner can remove it with a variant; then the other account may register it
  r=await post(LOCAL.port,V.ck,"/api/push/unsubscribe",{endpoint:base.replace("http://","Http://")+"/"});ok(r.status===200&&r.json.on===false&&r.json.devices===0,"owner's unsubscribe with a variant spelling removes the device",J(r.json));
  r=await sub(X.ck,base,dx);ok(r.status===200&&r.json.on===true,"after the owner turns it off, another account can register that device",J(r.json));
  await post(LOCAL.port,X.ck,"/api/push/unsubscribe",{all:true});
  // (b) odd spellings are refused before anything is stored
  const P=PS.origin.replace("http://","");
  const bad=[["userinfo","http://u:p@"+P+"/send/b-"+run],["empty port","http://127.0.0.1:/send/b"],["%-escape in path",PS.origin+"/send/%62-"+run],["dot segment",PS.origin+"/send/../send/b-"+run],["double slash inside the path",PS.origin+"/send//b-"+run],["two trailing slashes",base+"//"],["fragment",PS.origin+"/send/b-"+run+"#x"],["backslash",PS.origin+"\\send\\b"],["space",PS.origin+"/send/b "+run],["non-ASCII",PS.origin+"/send/b-é"],
   ["explicit :443 on FCM","https://fcm.googleapis.com:443/fcm/send/v33-"+run+"-nodeliver"],["%-escape in FCM path","https://fcm.googleapis.com/fcm/send/v33%2D"+run]];
  for(const [lbl,ep] of bad){r=await sub(V.ck,ep,dv);ok(r.status===400,"refused: "+lbl,r.status+" "+J(r.json))}
  {const s=await st(V.ck,"");ok(s.devices===0,"nothing was stored for the refused spellings",J(s))}
  // (c) FCM: host case and trailing slash are one device (subscribe / status / unsubscribe only; nothing is sent to FCM)
  const F="https://fcm.googleapis.com/fcm/send/v33-"+run+"-nodeliver";
  r=await sub(V.ck,F,dv);ok(r.status===200,"victim subscribes a (never delivered) FCM endpoint",r.status);
  for(const [lbl,ep] of [["upper-case host",F.replace("fcm.googleapis.com","FCM.GoogleAPIs.com")],["trailing slash",F+"/"],["both",F.replace("fcm.","FCM.")+"/"]]){r=await sub(X.ck,ep,dx);ok(r.status===409,"SW-069 FCM "+lbl+" variant from another account: 409",r.status)}
  {const s=await st(X.ck,F);ok(s.devices===0,"other account still has no device",J(s))}
  r=await sub(V.ck,F.replace("fcm.","FCM.")+"/",dv2);ok(r.status===200&&r.json.devices===1,"same account, FCM variant: update, still 1 device",J(r.json));
  r=await post(LOCAL.port,V.ck,"/api/push/unsubscribe",{endpoint:F.replace("fcm.","Fcm.")});ok(r.json&&r.json.devices===0,"FCM device removed through a host-case variant",J(r.json));
 }
 // ===== 1b. SW-069 migration: v32 rows with raw endpoints are moved to the canonical key at start =====
 {const dir=LOCAL.dir;const ids=(await req(LOCAL.port,"GET","/api/state")).json;await stopApp(LOCAL,true);
  const {DatabaseSync}=require("node:sqlite");let d=new DatabaseSync(path.join(dir,"sawyer.db"));const k=device().keys,t=Date.now();
  const ins=d.prepare("INSERT INTO pushsubs(endpoint,url,uid,p256dh,auth,sess,created,fails) VALUES(?,NULL,?,?,?,?,?,0)");
  const E=PS.origin+"/send/mig-"+run;ins.run(E+"/","u-first",k.p256dh,k.auth,"s1",t-5000);ins.run(E.replace("http://","HTTP://"),"u-second",k.p256dh,k.auth,"s2",t-1000);ins.run(PS.origin+"/send/mig2-"+run,"u-third",k.p256dh,k.auth,"s3",t);ins.run("not a url","u-junk",k.p256dh,k.auth,"s4",t);d.close();
  LOCAL=await startApp(await freePort(),{PUSH_TEST_ORIGIN:PS.origin,PUSH_RETRY_MS:"150"},dir);
  d=new DatabaseSync(path.join(dir,"sawyer.db"));const rows=d.prepare("SELECT endpoint,url,uid FROM pushsubs ORDER BY created").all();d.close();
  ok(rows.length===2&&rows[0].endpoint===E&&rows[0].uid==="u-first"&&rows[0].url===E+"/"&&rows[1].endpoint===PS.origin+"/send/mig2-"+run&&rows[1].url===rows[1].endpoint,"migration: raw v32 rows move to the canonical key, the first-registered owner keeps a duplicated device, junk is dropped",J(rows))}
 // ===== 2. Quote follow-ups =====
 const SH=process.argv[2]||os.tmpdir();br=await chromium.launch();const errs=[];
 const page=async(w,cookie)=>{const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900}});
  if(cookie){const [k,v]=cookie.split("=");await c.addCookies([{name:k,value:v,url:LOCAL.B}])}
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return p};
 const P=()=>LOCAL.port;
 const HO=await signupHo("fu"),PA=await signupPro("fua"),PB=await signupPro("fub"),PC=await signupPro("fuc"),PH=await signupPro("fuh","HVAC");
 ok(HO.ck&&PA.ck&&PB.ck&&PC.ck,"follow-ups: a homeowner and three plumbers sign up");
 const T1="V33 kitchen drain "+run;
 const pj=(await act(P(),HO.ck,"postJob",[{title:T1,cat:"Plumbing",sub:"Drain cleaning",desc:"Kitchen sink drains slowly.",zip:"78704",budget:"$100–400",when:"This week"}])).res;
 const JID=pj.id||((await act(P(),HO.ck,"seenJobs28",[])).st.jobs||[]).find(j=>j.title===T1)?.id;
 const qa=await act(P(),PA.ck,"quote",[JID,1234.5,"Snake and camera the line."]),qb=await act(P(),PB.ck,"quote",[JID,980,"Flat price."]),qc=await act(P(),PC.ck,"quote",[JID,1100,"Includes cleanout."]);
 ok(JID&&qa.res.ok&&qb.res.ok&&qc.res.ok,"homeowner posts a job and three pros quote",J([JID,qa.res,qb.res,qc.res]));
 const qid=(st,cid)=>((st.quotes||[]).find(q=>q.job===JID&&q.cid===cid)||{}).id;
 const QA=qid(qa.st,PA.id),QB=qid(qb.st,PB.id),QC=qid(qc.st,PC.id);
 {const r=(await act(P(),PA.ck,"followUp33",[QA,"Checking in"])).res;ok(r.ok===false&&/2 days/.test(r.msg),"a follow-up right after quoting is refused (give them 2 days)",J(r))}
 {const d=(await act(P(),PA.ck,"seenJobs28",[])).st;ok(!(d.quotes||[]).some(q=>q.fu33),"no follow-up recorded yet")}
 // homeowner writes to pro C after the quote: C's quote is answered, no follow-up card for C
 await act(P(),HO.ck,"send",[PC.id,"Can you come Thursday?"]);
 // two days pass: the quotes are moved 3 days back in the stored data
 {const dir=LOCAL.dir;await stopApp(LOCAL,true);const {DatabaseSync}=require("node:sqlite");const d=new DatabaseSync(path.join(dir,"sawyer.db"));
  const q=JSON.parse(d.prepare("SELECT v FROM appdata WHERE k='quotes'").get().v);for(const x of q)if(x.job===JID)x.date-=3*864e5;d.prepare("UPDATE appdata SET v=? WHERE k='quotes'").run(JSON.stringify(q));
  const ms=JSON.parse(d.prepare("SELECT v FROM appdata WHERE k='msgs'").get().v);for(const x of ms)if(x.from===HO.id)x.date-=1*864e5;d.prepare("UPDATE appdata SET v=? WHERE k='msgs'").run(JSON.stringify(ms));d.close();
  LOCAL=await startApp(await freePort(),{PUSH_TEST_ORIGIN:PS.origin,PUSH_RETRY_MS:"150"},dir)}
 for(const w of [1440,390]){const p=await page(w,PA.ck);await p.goto(LOCAL.B+"/dash",{waitUntil:"networkidle"});await p.waitForSelector("#v33fu",{timeout:10000}).catch(()=>{});
  const o=await p.evaluate(()=>{const c=document.getElementById("v33fu");if(!c)return null;const na=document.querySelector("section.na8");return{t:c.innerText.replace(/\s+/g," "),n:c.querySelectorAll("[data-v33fu]").length,afterNa:!!na&&!!(na.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING),ow:document.documentElement.scrollWidth>innerWidth+1,h1:document.querySelectorAll("h1").length,font:getComputedStyle(c.querySelector("h2")).fontFamily,btnH:c.querySelector("[data-v33fu]").getBoundingClientRect().height}});
  ok(o&&/Quotes waiting for an answer/.test(o.t)&&o.t.includes(T1)&&/You quoted \$1,234\.50/.test(o.t)&&/3 days ago/.test(o.t)&&/Hana · /.test(o.t)&&o.n===1,w+" pro dashboard: 'Quotes waiting for an answer' lists the job, the homeowner's first name, the quote with cents and how long ago",J(o));
  ok(o&&o.afterNa&&!o.ow&&o.h1===1&&/Plus Jakarta Sans/.test(o.font)&&o.btnH>=32,w+" card sits under What's next, no overflow, one H1, Plus Jakarta Sans",J(o));
  if(w===1440)await (await p.$("#v33fu")).screenshot({path:path.join(SH,"v33-followup-card-1440.png")}).catch(()=>{});
  if(w===390){await p.click("[data-v33fu]");await p.waitForSelector("#v33ft");const v=await p.$eval("#v33ft",e=>e.value);
   ok(/^Hi Hana, just checking in on my quote for "V33 kitchen drain/.test(v)&&v.includes("($1,234.50)")&&/- Vee, V33 fua/.test(v),"Follow up opens an editable, friendly message with the first name, job and price",v);
   await sleep(700);await p.screenshot({path:path.join(SH,"v33-followup-modal-390.png")}).catch(()=>{});
   await p.fill("#v33ft",v+"\nI can also do Saturday.");await p.click("#v33fs");await p.waitForSelector("#v33fu",{state:"detached",timeout:8000}).catch(()=>{});
   const gone=await p.evaluate(()=>!document.getElementById("v33fu")&&/Follow-up sent to Hana/.test(document.getElementById("toasts").innerText));ok(gone,"sending shows 'Follow-up sent to Hana.' and the card goes away")}
  await p.context().close()}
 {const p=await page(1440,PC.ck);await p.goto(LOCAL.B+"/dash",{waitUntil:"networkidle"});await sleep(300);ok(!(await p.$("#v33fu")),"a pro the homeowner already wrote back to has no follow-up card");await p.context().close()}
 {const st=stateOf(await req(P(),"GET","/api/state",{Cookie:HO.ck}));const m=(st.msgs||[]).filter(x=>x.from===PA.id);const n=(st.notifs||[]).find(x=>/New message from V33 fua/.test(x.text||""));const q=(st.quotes||[]).find(x=>x.id===QA);
  ok(m.length===1&&/I can also do Saturday\./.test(m[0].text)&&n,"homeowner gets it as a normal message, with the 'New message' notice",J({m,n}));
  ok(q&&q.fu33>0,"the homeowner (job owner) can see the follow-up time on the quote")}
 {const st=stateOf(await req(P(),"GET","/api/state",{Cookie:PB.ck}));const q=(st.quotes||[]).find(x=>x.id===QA);ok(q&&q.fu33===undefined,"another pro's copy of that quote has no follow-up field",J(q))}
 {const st=stateOf(await req(P(),"GET","/api/state"));const q=(st.quotes||[]).find(x=>x.id===QA);ok(!q||q.fu33===undefined,"signed-out state has no follow-up field")}
 {const r=(await act(P(),PA.ck,"followUp33",[QA,"Again?"])).res;ok(r.ok===false&&/already followed up/.test(r.msg),"one follow-up per quote (a second one is refused)",J(r))}
 {const r=(await act(P(),PB.ck,"followUp33",[QA,"Hi"])).res;ok(r.ok===false&&/wasn't found/.test(r.msg),"a pro can't follow up on someone else's quote",J(r))}
 {const r=(await act(P(),HO.ck,"followUp33",[QA,"Hi"])).res;ok(r.ok===false&&/Only pros/.test(r.msg),"homeowners can't use it",J(r))}
 {const r=await post(P(),PB.ck,"/api/act",{name:"followUp33",args:[QB,"x".repeat(1001)]});ok(r.status===400&&/1,000/.test(r.json.error),"a message over 1,000 characters is refused by the server",r.status+" "+J(r.json))}
 {const r=(await act(P(),PB.ck,"followUp33",[QB,"   "])).res;ok(r.ok===false&&/Type a message/.test(r.msg),"an empty message is refused",J(r))}
 await act(P(),HO.ck,"hire",[JID,PC.id]);
 {const r=(await act(P(),PB.ck,"followUp33",[QB,"Still interested?"])).res;ok(r.ok===false&&/isn't open/.test(r.msg),"after the homeowner hires someone, follow-ups on that job are refused",J(r))}
 {const p=await page(1440,PB.ck);await p.goto(LOCAL.B+"/dash",{waitUntil:"networkidle"});await sleep(300);ok(!(await p.$("#v33fu")),"…and the card is gone for the other pros");await p.context().close()}
 {const hp=await page(1440,HO.ck);await hp.goto(LOCAL.B+"/dash",{waitUntil:"networkidle"});await sleep(300);ok(!(await hp.$("#v33fu"))&&!(await hp.$("#v33ql")),"homeowner dashboard has neither pro card");await hp.context().close()}

 // ===== 3. Quick log =====
 for(const w of [390,1440]){const p=await page(w,PA.ck);await p.goto(LOCAL.B+"/dash",{waitUntil:"networkidle"});await p.waitForSelector("#v33ql",{timeout:10000});
  const o=await p.evaluate(()=>{const c=document.getElementById("v33ql");const na=document.querySelector("section.na8");const b=[...c.querySelectorAll("[data-v33ql]")].map(x=>{const r=x.getBoundingClientRect();return[x.textContent.trim(),Math.round(r.height),Math.round(r.right)]});return{t:c.innerText.replace(/\s+/g," "),b,afterNa:!!na&&!!(na.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING),ow:document.documentElement.scrollWidth>innerWidth+1}});
  ok(/Quick log/.test(o.t)&&o.b.length===2&&o.b[0][0]==="Receipt"&&o.b[1][0]==="Trip"&&o.b.every(x=>x[1]>=44&&x[2]<=w)&&o.afterNa&&!o.ow,w+" pro dashboard: Quick log card with Receipt and Trip buttons (44px+ tap targets, no overflow)",J(o));
  if(w===390){await (await p.$("#v33ql")).screenshot({path:path.join(SH,"v33-quicklog-card-390.png")}).catch(()=>{});
   await p.click('[data-v33ql="exp"]');await p.waitForSelector("#v33qf");
   const f=await p.evaluate(()=>{const a=document.getElementById("v33am"),ph=document.getElementById("v33pf"),box=document.querySelector("#modal .mbox").getBoundingClientRect();return{im:a.inputMode,focus:document.activeElement===a,cap:ph.getAttribute("capture"),acc:ph.accept,cats:[...document.querySelectorAll('#v33qf input[name="cat"]')].map(x=>x.value),box:[Math.round(box.left),Math.round(box.right)],ow:document.documentElement.scrollWidth>innerWidth+1}});
   ok(f.im==="decimal"&&f.focus&&f.cap==="environment"&&/image\/jpeg/.test(f.acc)&&f.cats.join()==="Materials,Fuel,Tools,Permits,Meals,Dump fees"&&f.box[0]>=0&&f.box[1]<=390,"receipt sheet: number pad, focused amount, one-tap categories, camera for the receipt photo, fits a 390px phone",J(f));
   await p.click("#v33qs");const e1=await p.$eval("#v33qe",e=>e.textContent);ok(/Enter the receipt total/.test(e1),"an empty total says 'Enter the receipt total.'",e1);
   await p.fill("#v33am","$42.50");await p.click('#v33qf label:has(input[value="Fuel"])');await p.fill("#v33vn","Ferguson");await sleep(700);await p.screenshot({path:path.join(SH,"v33-quicklog-receipt-390.png")}).catch(()=>{});
   await p.click("#v33qs");await p.waitForSelector(".v33done",{timeout:8000});const d1=await p.$eval(".v33done",e=>e.innerText.replace(/\s+/g," "));
   ok(/Receipt logged/.test(d1)&&/\$42\.50 · Fuel · Ferguson/.test(d1)&&/Undo/.test(d1)&&/Log another/.test(d1),"after saving: 'Receipt logged · $42.50 · Fuel · Ferguson' with Undo, Log another and Done",d1);
   await sleep(700);await p.screenshot({path:path.join(SH,"v33-quicklog-done-390.png")}).catch(()=>{});
   let st=stateOf(await req(P(),"GET","/api/state",{Cookie:PA.ck}));let l=(st.ledger||[]).filter(x=>x.by===PA.id);
   ok(l.length===1&&l[0].kind==="exp"&&l[0].amt===42.5&&l[0].cat==="Fuel"&&l[0].vendor==="Ferguson","the receipt is an Office expense record ($42.50, Fuel, Ferguson)",J(l));
   await p.click("#v33un");await sleep(400);st=stateOf(await req(P(),"GET","/api/state",{Cookie:PA.ck}));ok(!(st.ledger||[]).some(x=>x.by===PA.id),"Undo removes it");
   // other category from the select + Log another
   await p.click('[data-v33ql="exp"]');await p.waitForSelector("#v33qf");await p.fill("#v33am","19.99");await p.selectOption("#v33cx","Office");await p.click("#v33qs");await p.waitForSelector(".v33done");
   await p.click("#v33ag");await p.waitForSelector("#v33qf");await p.fill("#v33am","1,250");await p.click("#v33qs");await p.waitForSelector(".v33done");await p.click("#v33dn");await sleep(400);
   st=stateOf(await req(P(),"GET","/api/state",{Cookie:PA.ck}));l=(st.ledger||[]).filter(x=>x.by===PA.id&&x.kind==="exp").map(x=>[x.amt,x.cat]).sort((a,b)=>a[0]-b[0]);
   ok(J(l)===J([[19.99,"Office"],[1250,"Materials"]]),"'More…' categories work, 'Log another' keeps the sheet open, and 1,250 reads as $1,250",J(l));
   // trip, round trip
   await p.click('[data-v33ql="mile"]');await p.waitForSelector("#v33qf");const fr=await p.$eval("#v33fr",e=>e.value);await p.fill("#v33mi","12.4");await p.check("#v33rt");await p.fill("#v33to","Ferguson");await p.click("#v33qs");await p.waitForSelector(".v33done");
   const d2=await p.$eval(".v33done",e=>e.innerText.replace(/\s+/g," "));ok(fr==="Shop"&&/Trip logged/.test(d2)&&/24\.8 mi to Ferguson and back · about \$17\.36 deduction/.test(d2),"Trip: round trip doubles the miles (12.4 -> 24.8 mi, about $17.36 at 70¢)",fr+" | "+d2);
   await p.click("#v33dn");await sleep(400);st=stateOf(await req(P(),"GET","/api/state",{Cookie:PA.ck}));const t=(st.ledger||[]).find(x=>x.by===PA.id&&x.kind==="mile");
   ok(t&&t.miles===24.8&&t.from==="Shop"&&t.to==="Ferguson and back","the trip is an Office mileage record",J(t));
   const s2=await p.$eval("#v33qls",e=>e.textContent);ok(/This month: \$1,269\.99 in receipts · 24\.8 mi/.test(s2),"the card now sums this month: receipts and miles",s2);
   await p.goto(LOCAL.B+"/office?t=money",{waitUntil:"networkidle"}).catch(()=>{});}
  await p.context().close()}
 {const hp=await page(390,PH.ck);await hp.goto(LOCAL.B+"/dash",{waitUntil:"networkidle"});await hp.waitForSelector("#v33ql",{timeout:8000}).catch(()=>{});const t=await hp.$eval("#v33ql",e=>e.innerText).catch(()=>"");ok(/Log a receipt or a trip in seconds/.test(t),"a pro with nothing logged sees what Quick log does",t);await hp.context().close()}

 // ===== 4. PM: reuse a project as a template =====
 {const pm=await login(P(),"demo-pm@sawyer.test");ok(!!pm.ck,"demo project manager logs in");
  const src=(pm.st.projects||[]).find(x=>x.id==="p1");
  for(const w of [390,1440]){const p=await page(w,pm.ck);await p.goto(LOCAL.B+"/project/p1",{waitUntil:"networkidle"});await p.waitForSelector("#v33tpl",{timeout:10000});
   const b=await p.evaluate(()=>{const e=document.getElementById("v33tpl"),r=e.getBoundingClientRect();return{t:e.textContent.trim(),h:r.height,r:r.right,ow:document.documentElement.scrollWidth>innerWidth+1}});
   ok(b.t==="Reuse as template"&&b.h>=36&&b.r<=w&&!b.ow,w+" PM's project page has 'Reuse as template'",J(b));
   if(w===390){await sleep(700);await (await p.$(".upj-act")).screenshot({path:path.join(SH,"v33-template-button-390.png")}).catch(()=>{})}
   await p.click("#v33tpl");await p.waitForSelector("#v33tp.on",{timeout:8000});
   const o=await p.evaluate(()=>({url:location.pathname+location.hash,title:document.getElementById("np-title").value,n:document.querySelector(".v33tp-n").innerText.replace(/\s+/g," "),ow:document.documentElement.scrollWidth>innerWidth+1}));
   ok(/newproject/.test(o.url)&&o.title==="Inground pool build, Scottsdale (copy)"&&/Copied from Demo: Inground pool build, Scottsdale: 6 trades · 9 crew · \d+ phases/.test(o.n)&&!o.ow,w+" it opens Post a project with the title '(copy)' and a 'Copied from' note (trades, crew, phases)",J(o));
   if(w===1440){await sleep(700);await p.screenshot({path:path.join(SH,"v33-template-wizard-1440.png")}).catch(()=>{});}
   if(w===1440){await p.click("#npNext");await p.waitForSelector("#np-start");const dates=await p.evaluate(()=>[document.getElementById("np-start").value,document.getElementById("np-end").value,document.getElementById("np-phases").value.split("\n").length]);
    ok(dates[0]===""&&dates[1]===""&&dates[2]===src.phases.length,"dates start blank and the phases are copied",J(dates));
    await p.fill("#np-start","2027-03-01");await p.fill("#np-end","2027-05-15");await p.click("#npNext");await p.waitForSelector(".nproles");
    const roles=await p.evaluate(()=>[...document.querySelectorAll(".np-row")].map(r=>[r.querySelector("select").value,r.querySelector("input[name^=label]").value,+r.querySelector("input[name^=need]").value]));
    ok(J(roles)===J(src.roles.map(r=>[r.trade,r.label,r.need])),"every trade, role name and crew count is copied",J(roles));
    await p.click("#npNext");await p.waitForSelector(".npreview");await p.click("#npPost");await p.waitForFunction(()=>/\/project\//.test(location.pathname+location.hash),null,{timeout:8000}).catch(()=>{});
    const st=stateOf(await req(P(),"GET","/api/state",{Cookie:pm.ck}));const np=(st.projects||[]).filter(x=>x.pm===pm.st.me&&x.title==="Inground pool build, Scottsdale (copy)");
    ok(np.length===1&&np[0].start==="2027-03-01"&&J(np[0].roles.map(r=>[r.trade,r.label,r.need,r.filled.length,r.apps.length]))===J(src.roles.map(r=>[r.trade,r.label,r.need,0,0]))&&J(np[0].phases)===J(src.phases)&&np[0].phase===0&&!np[0].demo,"posting makes a new project with the same crew plan, empty slots, phase 1, new dates",J(np[0]&&{t:np[0].title,s:np[0].start,r:np[0].roles.length}))}
   await p.context().close()}
  // the picker in Post a project
  {const p=await page(1440,pm.ck);await p.goto(LOCAL.B+"/newproject",{waitUntil:"networkidle"});await p.waitForSelector("#v33ps",{timeout:8000});
   const opts=await p.$$eval("#v33ps option",a=>a.map(o=>o.textContent));ok(opts.length>=4&&/Lakeview kitchen remodel/.test(opts.join("|")),"Post a project offers 'Start from one of your projects'",J(opts));
   const val=await p.$$eval("#v33ps option",a=>(a.find(o=>/Lakeview/.test(o.textContent))||{}).value);await p.selectOption("#v33ps",val);await p.waitForSelector("#v33tp.on");
   const t=await p.$eval("#np-title",e=>e.value);ok(t==="Lakeview kitchen remodel, Chicago (copy)","picking one fills the draft from it",t);await p.context().close()}
  // not for others
  {const p=await page(1440,PA.ck);await p.goto(LOCAL.B+"/project/p1",{waitUntil:"networkidle"});await sleep(400);ok(!(await p.$("#v33tpl")),"a pro viewing the project has no 'Reuse as template'");
   await p.goto(LOCAL.B+"/newproject",{waitUntil:"networkidle"});await sleep(300);ok(!(await p.$("#v33ps")),"a pro with no projects of their own sees no picker");await p.context().close()}
 }
 ok(errs.length===0,"no page errors",J(errs.slice(0,5)));

}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL);try{PS&&PS.srv.close()}catch(e){}}
 console.log(failed?"FAIL v33-e2e: "+failed+" failed":"PASS v33-e2e: all checks passed");process.exit(failed?1:0)})();
