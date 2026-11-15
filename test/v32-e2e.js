// v32 end-to-end. Self-contained: starts its own Sawyer server (local test mode) and a local stand-in push service.
// Covers: SW-067 (Tax year card in cents, -$23.19 not $-23), csvCell defense in depth (BOM / zero-width / whitespace /
// newline before a trigger, fullwidth and small-form lookalikes, plain numbers stay numeric), opt-in browser alerts
// (Web Push with VAPID + aes128gcm: subscribe API and endpoint allowlist, the VAPID JWT verified with the public key, every
// payload decrypted, new matching job -> pro, new quote -> homeowner, hired / job filled -> pros, per-kind switches,
// test alert, sign-out and account delete drop devices, dead endpoints removed, private key never leaves the server),
// the dashboard / Inbox cards at 1440 and 390 (turn on, test, kinds, turn off, Not now), the service worker's push and
// notification handlers (Chromium's DevTools push), health and SW cache (any Sawyer version since v33). SW-068: subscribe cannot take over another account's endpoint.
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib"),crypto=require("crypto");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v32-"));
 const env=Object.assign({},process.env,{HOST:"127.0.0.1",PORT:String(port),DATA_DIR:dir,RATE_X:"50"});
 for(const k of ["NODE_ENV","RENDER","AUTH_TEST_MODE","STAFF_DEMO_PASSWORD","RESEND_API_KEY","SENDGRID_API_KEY","EMAIL_FROM","MAIL_FROM","RESEND_API_URL","TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_FROM","TWILIO_MESSAGING_SERVICE_SID","TEST_NOW","SAWYER_BASE_URL","PUBLIC_URL","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","APPLE_CLIENT_ID","MICROSOFT_CLIENT_ID","FACEBOOK_APP_ID","VAPID_PRIVATE_KEY","VAPID_PUBLIC_KEY","VAPID_SUBJECT","PUSH_DEBUG","PUSH_TEST_ORIGIN","PUSH_RETRY_MS"])if(!extra||!(k in extra))delete env[k];
 if(extra)Object.assign(env,extra);
 const child=spawn(process.execPath,[path.join(ROOT,"server.js")],{env,stdio:["ignore","pipe","pipe"]});
 let log="";child.stdout.on("data",d=>{log+=d});child.stderr.on("data",d=>{log+=d});
 return new Promise((res,no)=>{const t=setTimeout(()=>no(new Error("server did not start\n"+log.slice(-400))),15000);
  const wait=()=>{if(/live on/.test(log)){clearTimeout(t);res({child,dir,log:()=>log,port,B:"http://127.0.0.1:"+port})}else setTimeout(wait,30)};
  child.on("exit",c=>{clearTimeout(t);no(new Error("server exited "+c+"\n"+log.slice(-400)))});wait()})}
function stopApp(s){return new Promise(res=>{if(!s)return res();const done=()=>{try{fs.rmSync(s.dir,{recursive:true,force:true})}catch(e){}res()};s.child.on("exit",done);s.child.kill("SIGTERM");setTimeout(()=>{try{s.child.kill("SIGKILL")}catch(e){}},3000)})}
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
(async()=>{try{
 PS=await pushService();
 LOCAL=await startApp(await freePort(),{PUSH_TEST_ORIGIN:PS.origin,PUSH_RETRY_MS:"150"});
 br=await chromium.launch();
 const errs=[];
 const page=async(w,cookie,init)=>{const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900},acceptDownloads:true});
  if(cookie){const [k,v]=cookie.split("=");await c.addCookies([{name:k,value:v,url:LOCAL.B}])}if(init)await c.addInitScript(init.fn,init.arg);
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return p};
 const hz=(await req(LOCAL.port,"GET","/healthz")).json||{};ok(/^2\.\d+\.\d+-sawyer$/.test(hz.v),"healthz reports a Sawyer version",J(hz));
 const sw=await req(LOCAL.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v\d+"/.test(sw.body),"service worker has a Sawyer cache name");
 ok(/addEventListener\("push"/.test(sw.body)&&/showNotification\(/.test(sw.body)&&/addEventListener\("notificationclick"/.test(sw.body)&&/openWindow\(/.test(sw.body)&&/addEventListener\("pushsubscriptionchange"/.test(sw.body),"service worker handles push, notification clicks and subscription changes");
 const run=Math.random().toString(36).slice(2,8);
 const signupPro=async(tag,trade)=>{const r=await req(LOCAL.port,"POST","/api/signup",JH,J({kind:"pro",password:"v32-correct-horse",data:{name:"Vee "+tag,biz:"V32 "+tag+" "+run,email:"v32-"+tag+"-"+run+"@example.com",trade,zip:"78704",phone:"5125550100",plan:"founding"}}));return{ck:(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0],id:stateOf(r).me}};
 const signupHo=async(tag)=>{const r=await req(LOCAL.port,"POST","/api/signup",JH,J({kind:"customer",password:"v32-correct-horse",data:{name:"Hana "+tag,email:"v32-ho-"+tag+"-"+run+"@example.com",zip:"78704"}}));return{ck:(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0],id:stateOf(r).me}};
 const A1=await signupPro("a","Plumbing"),B1=await signupPro("b","Plumbing"),H1=await signupPro("h","HVAC"),HO=await signupHo("x");
 ok(A1.ck&&B1.ck&&H1.ck&&HO.ck,"three new pros (two plumbers, one HVAC) and a homeowner sign up in 78704");

 // ===== 1. SW-067 =====
 {const c1=(await act(LOCAL.port,A1.ck,"saveCust",[{name:"Cents Co",email:"",phone:"",addr:"",site:""}])).res;
  const b1=(await act(LOCAL.port,A1.ck,"saveBill",[{type:"inv",cust:c1.id,title:"Cents",lines:[{d:"Service",q:1,r:308.51}]}])).res;await act(LOCAL.port,A1.ck,"sendBill",[b1.id]);
  const p1=(await act(LOCAL.port,A1.ck,"recordPay",[b1.id,100.51,"check"])).res;
  const l1=(await act(LOCAL.port,A1.ck,"addLedger",[{kind:"exp",amt:42.5,cat:"Materials",vendor:"＝1+2 Supply",note:"x"}])).res;
  const l2=(await act(LOCAL.port,A1.ck,"addLedger",[{kind:"mile",miles:116,from:"Shop",to:"＠Job",note:"Supply run"}])).res;
  ok(p1.ok&&l1.ok&&l2.ok,"pro records a $100.51 payment, a $42.50 expense and 116 miles");
  for(const w of [1440,390]){const p=await page(w,A1.ck);await p.goto(LOCAL.B+"/office/reports",{waitUntil:"networkidle"});await p.waitForSelector("#taxYear");await p.waitForTimeout(250);
   const o=await p.evaluate(()=>{const k=[...document.querySelectorAll(".o9-tax-k > div")].map(d=>[d.querySelector("small").textContent,d.querySelector("b").textContent]);const pl=document.querySelector("#v31pl tfoot td:last-child");
    const y=document.getElementById("o9TaxCsv").dataset.y;return{k,pl:pl&&pl.textContent.trim(),csv:v9TaxCsv(me(),y),ow:document.documentElement.scrollWidth>innerWidth+1}});
   const K=Object.fromEntries(o.k);
   ok(K["Gross receipts"]==="$100.51"&&K["Expenses"]==="$42.50"&&K["Mileage deduction"]==="$81.20"&&K["Est. net profit"]==="-$23.19",w+" SW-067: Tax year card reads $100.51 / $42.50 / $81.20 / -$23.19 (cents, minus before the $)",J(o.k));
   ok(o.pl==="-$23.19"&&o.pl===K["Est. net profit"],w+" SW-067: the card's net equals the P&L total exactly",o.pl);
   ok(/Gross receipts[^\n]*,100\.51/.test(o.csv)&&/net profit[^\n]*,-23\.19/.test(o.csv),w+" SW-067: the tax CSV carries the same cents",o.csv.split("\n").filter(l=>/Gross|Net/i.test(l)).join(" | "));
   ok(!o.ow,w+" no horizontal overflow on Reports");
   if(w===1440){ok(/"'＝1\+2 Supply"/.test(o.csv),"tax CSV: a fullwidth ＝ vendor is neutralized",o.csv.split("\n").filter(l=>/Supply/.test(l)).join(" | "));
    // ===== 2. csvCell defense in depth =====
    const u=await p.evaluate(()=>{const L=["\ufeff=1+2","\u200b=1+2","\n=1+2","\r\n@SUM(A1)","  +cmd","\t-x","＝1+2","＋1","－1","＠x","﹦1","﹢1","﹣1","﹫x","=1+2","-12.50","+1","12"," -12","\ufeff12","hello","Ｈｅｌｌｏ","a,b"];return L.map(s=>[s,csvCell(s)])});
    const want={"\ufeff=1+2":`"'\ufeff=1+2"`,"\u200b=1+2":`"'\u200b=1+2"`,"\n=1+2":`"'\n=1+2"`,"\r\n@SUM(A1)":`"'\r\n@SUM(A1)"`,"  +cmd":`"'  +cmd"`,"\t-x":`"'\t-x"`,"＝1+2":`"'＝1+2"`,"＋1":`"'＋1"`,"－1":`"'－1"`,"＠x":`"'＠x"`,"﹦1":`"'﹦1"`,"﹢1":`"'﹢1"`,"﹣1":`"'﹣1"`,"﹫x":`"'﹫x"`,"=1+2":`"'=1+2"`,"-12.50":"-12.50","+1":"+1","12":"12"," -12":" -12","\ufeff12":"\ufeff12","hello":"hello","Ｈｅｌｌｏ":"Ｈｅｌｌｏ","a,b":`"a,b"`};
    const bad=u.filter(([s,c])=>want[s]!==c);ok(!bad.length,"csvCell: BOM / zero-width / whitespace / newline before a trigger and ＝＋－＠﹦﹢﹣﹫ lookalikes get the ' prefix; plain numbers (even padded) stay numeric",J(bad));}
   await p.context().close()}}

 // ===== 3. Push API =====
 const KEY=(await req(LOCAL.port,"GET","/api/push/key")).json||{};const kraw=Buffer.from(String(KEY.key||""),"base64url");
 ok(kraw.length===65&&kraw[0]===4,"GET /api/push/key: a 65-byte uncompressed P-256 public key (base64url)",J(KEY));
 ok(J(Object.keys(KEY))===J(["key"]),"the key endpoint returns only the public key");
 {const r=await post(LOCAL.port,null,"/api/push/status",{});ok(r.status===401,"push status needs sign-in (401 signed out)",r.status)}
 const dA=device(),dB=device(),dH=device(),dHO=device(),dG=device();
 const EP=(n)=>PS.origin+"/send/"+n+"-"+run;
 {const bads=[["http://evil.example/x","plain http"],["https://169.254.169.254/latest","metadata IP"],["https://127.0.0.1:9/x","loopback https"],["https://evil.example.com/fcm/send/x","unknown host"],["https://fcm.googleapis.com.evil.com/x","lookalike host"],["https://user:pw@fcm.googleapis.com/x","credentials in URL"],["http://127.0.0.1:1/x","other local port"]];
  const out=[];for(const [ep,why] of bads){const r=await post(LOCAL.port,A1.ck,"/api/push/subscribe",{sub:{endpoint:ep,keys:dA.keys}});out.push([why,r.status])}
  ok(out.every(x=>x[1]===400),"subscribe refuses endpoints that aren't a known push service (no SSRF): http, metadata IP, loopback, unknown/lookalike hosts, credentials",J(out));
  const r2=await post(LOCAL.port,A1.ck,"/api/push/subscribe",{sub:{endpoint:EP("a"),keys:{p256dh:"AAAA",auth:"BBBB"}}});ok(r2.status===400,"subscribe refuses malformed device keys",r2.status)}
 const sub=async(who,dev,name,cats)=>(await post(LOCAL.port,who.ck,"/api/push/subscribe",Object.assign({sub:{endpoint:EP(name),keys:dev.keys}},cats?{cats}:{}))).json||{};
 const sA=await sub(A1,dA,"a"),sB=await sub(B1,dB,"b"),sH=await sub(H1,dH,"h"),sHO=await sub(HO,dHO,"ho");
 ok(sA.ok&&sA.on&&sA.devices===1&&J(sA.cats)===J({jobs:true,hires:true,quotes:false,msgs:true}),"pro subscribes: on, 1 device, pro defaults (new jobs, hires, messages)",J(sA));
 ok(sHO.ok&&sHO.on&&J(sHO.cats)===J({jobs:false,hires:false,quotes:true,msgs:true}),"homeowner subscribes: homeowner default (new quotes, messages)",J(sHO));
 {const r=(await post(LOCAL.port,B1.ck,"/api/push/status",{endpoint:EP("a")})).json||{};ok(r.on===false&&r.devices===1,"another account can't see someone else's device as its own",J(r))}
 // SW-068: a signed-in caller cannot take over an endpoint already registered to someone else
 {const C=await signupPro("c","Plumbing"),D=await signupPro("d","Plumbing");const dC=device(),dD=device(),dC2=device();
  const sC=await post(LOCAL.port,C.ck,"/api/push/subscribe",{sub:{endpoint:EP("c"),keys:dC.keys}});
  const sD=await post(LOCAL.port,D.ck,"/api/push/subscribe",{sub:{endpoint:EP("d"),keys:dD.keys}});
  ok(sC.status===200&&sD.status===200&&sC.json&&sC.json.devices===1&&sD.json&&sD.json.devices===1,"SW-068 setup: two accounts each have one device",J([sC.json,sD.json]));
  const steal=await post(LOCAL.port,C.ck,"/api/push/subscribe",{sub:{endpoint:EP("d"),keys:dC2.keys}});
  const err=String((steal.json&&steal.json.error)||"");
  ok(steal.status===409&&err&&!/another|already|account|user|owner|belong|taken|exists|registered/i.test(err),"SW-068: taking over another account's endpoint is refused with a generic 409 (no hint it belongs to someone)",J({s:steal.status,j:steal.json}));
  const stD=(await post(LOCAL.port,D.ck,"/api/push/status",{endpoint:EP("d")})).json||{};
  const stC=(await post(LOCAL.port,C.ck,"/api/push/status",{endpoint:EP("c")})).json||{};
  const stCOnD=(await post(LOCAL.port,C.ck,"/api/push/status",{endpoint:EP("d")})).json||{};
  ok(stD.on===true&&stD.devices===1,"SW-068: the original owner's device count and ownership are unchanged",J(stD));
  ok(stC.on===true&&stC.devices===1&&stCOnD.on===false,"SW-068: the caller does not gain the endpoint and keeps only their own device",J({stC,stCOnD}));
  const {DatabaseSync}=require("node:sqlite");const db=new DatabaseSync(path.join(LOCAL.dir,"sawyer.db"));
  const rowD=db.prepare("SELECT uid,p256dh,auth FROM pushsubs WHERE endpoint=?").get(EP("d"));
  ok(rowD&&rowD.uid===D.id&&rowD.p256dh===dD.keys.p256dh&&rowD.auth===dD.keys.auth,"SW-068: the original row's uid and keys are left alone",J(rowD));
  const again=await post(LOCAL.port,C.ck,"/api/push/subscribe",{sub:{endpoint:EP("c"),keys:dC2.keys}});
  const rowC=db.prepare("SELECT uid,p256dh,auth FROM pushsubs WHERE endpoint=?").get(EP("c"));db.close();
  ok(again.status===200&&again.json&&again.json.on&&again.json.devices===1&&rowC&&rowC.uid===C.id&&rowC.p256dh===dC2.keys.p256dh&&rowC.auth===dC2.keys.auth,"SW-068: the same account can resubscribe and update its device keys",J({s:again.status,j:again.json,rowC}))}
 const wait=async(pred,ms)=>{const t=Date.now();while(Date.now()-t<(ms||4000)){const x=PS.got.filter(pred);if(x.length)return x;await sleep(60)}return PS.got.filter(pred)};
 const to=n=>g=>g.path==="/send/"+n+"-"+run;
 const open=(g,dev)=>{try{return decrypt(dev,g.body).json}catch(e){return{err:e.message}}};
 // new matching job -> plumbers A and B, not the HVAC pro
 PS.got.length=0;
 const job=(await act(LOCAL.port,HO.ck,"postJob",[{title:"V32 kitchen sink drip "+run,cat:"Plumbing",sub:"Drain cleaning",desc:"Drip under the sink. Private: gate 7781.",zip:"78704",budget:"$100–400",when:"This week"}])).res;
 ok(job.ok&&job.id,"homeowner posts a plumbing job in 78704",J(job));
 {const gA=await wait(to("a"));const gB=await wait(to("b"));await sleep(400);const gH=PS.got.filter(to("h"));
  ok(gA.length===1&&gB.length===1,"both matching plumbers get exactly one push",J({a:gA.length,b:gB.length}));
  ok(gH.length===0,"the HVAC pro (not a match) gets none");
  const g=gA[0]||{headers:{},body:Buffer.alloc(0)};
  ok(g.method==="POST"&&g.headers["content-encoding"]==="aes128gcm"&&/^\d+$/.test(g.headers.ttl||"")&&+g.headers.ttl>0&&g.headers["content-type"]==="application/octet-stream"&&/^(normal|high)$/.test(g.headers.urgency||""),"RFC 8030 request: POST, aes128gcm, TTL, Urgency",J({m:g.method,h:g.headers}));
  const v=verifyVapid(g.headers.authorization,KEY.key,PS.origin);ok(v.ok,"VAPID: ES256 JWT signed by the server's key, aud = push service origin, exp within 24 h, sub mailto:/https:",J({sig:v.sigOk,h:v.h,c:v.c,why:v.why}));
  const pa=open(g,dA);ok(pa.title==="New job in your area"&&pa.body==="New job in your area: V32 kitchen sink drip "+run&&pa.url==="/job/"+job.id,"payload decrypts (RFC 8291): 'New job in your area', the job title, link /job/<id>",J(pa));
  ok(!/7781|gate|Private/.test(J(pa)),"the push carries no job description (no private details)");
  let rs=0;try{rs=decrypt(dA,g.body).rs}catch(e){}ok(rs===4096,"record size 4096, single record",rs);
  const pb=open(gB[0]||g,dB);ok(pb.url==="/job/"+job.id,"the second plumber's payload decrypts with their own device key",J(pb));
  let cross=false;try{decrypt(dB,g.body);cross=true}catch(e){}ok(!cross,"one device's push can't be decrypted with another device's key")}
 // quotes -> homeowner; hire -> A hired, B filled
 PS.got.length=0;
 const qA=(await act(LOCAL.port,A1.ck,"quote",[job.id,350.25,"Swap the trap and supply lines."])).res,qB=(await act(LOCAL.port,B1.ck,"quote",[job.id,410,"Same day."])).res;
 ok(qA.ok!==false&&qB.ok!==false,"both plumbers quote",J([qA,qB]));
 {const g=await wait(to("ho"));await sleep(300);const all=PS.got.filter(to("ho")).map(x=>open(x,dHO));
  ok(all.length===2&&all.every(x=>x.title==="New quote"&&x.url==="/job/"+job.id)&&all.some(x=>/V32 a .* sent a quote: \$350\.25/.test(x.body)),"homeowner gets a 'New quote' push per quote, with the pro's name and price, linking to the job",J(all));
  ok(PS.got.filter(to("a")).length===0&&PS.got.filter(to("b")).length===0,"quoting pros get no push for their own quotes")}
 PS.got.length=0;
 const hr=(await act(LOCAL.port,HO.ck,"hire",[job.id,A1.id])).res;ok(hr.ok!==false,"homeowner hires plumber A",J(hr));
 {const gA=await wait(to("a")),gB=await wait(to("b"));const a=gA.map(x=>open(x,dA)),b=gB.map(x=>open(x,dB));
  ok(a.length===1&&a[0].title==="You're hired"&&/^You're hired: V32 kitchen sink drip/.test(a[0].body)&&a[0].url==="/job/"+job.id,"hired pro gets 'You're hired'",J(a));
  ok(b.length===1&&b[0].title==="Job filled"&&/^This job was filled: /.test(b[0].body),"the other quoting pro gets 'Job filled'",J(b))}
 // messages: "New message from <name>", never the text
 {PS.got.length=0;const r=(await act(LOCAL.port,HO.ck,"send",[A1.id,"Secret gate code 5521, see you at 9"])).res;const g=await wait(to("a"));const x=g[0]?open(g[0],dA):{};
  ok(r.ok!==false&&x.title==="New message"&&x.body==="New message from Hana x"&&x.url==="/msgs/"+HO.id,"a message pushes 'New message from Hana x' to the pro, linking to the thread",J([r,x]));
  ok(g[0]&&!/5521|gate code/.test(J(x)),"the message text itself is never in the push (lock screens are public)");
  const r2=(await post(LOCAL.port,A1.ck,"/api/push/prefs",{cats:{jobs:true,hires:true,msgs:false},endpoint:EP("a")})).json||{};PS.got.length=0;await act(LOCAL.port,HO.ck,"send",[A1.id,"Another one"]);await sleep(600);
  ok(r2.cats&&r2.cats.msgs===false&&PS.got.filter(to("a")).length===0,"with messages switched off, no push for the next message",J(r2.cats))}
 // per-kind switches: A turns new jobs off, keeps hires
 {const r=(await post(LOCAL.port,A1.ck,"/api/push/prefs",{cats:{jobs:false,hires:true},endpoint:EP("a")})).json||{};ok(r.ok&&r.cats.jobs===false&&r.cats.hires===true,"pro turns 'new jobs' off (hires stay on)",J(r));
  PS.got.length=0;const j2=(await act(LOCAL.port,HO.ck,"postJob",[{title:"V32 second leak "+run,cat:"Plumbing",sub:"Drain cleaning",desc:"Second.",zip:"78704",budget:"$100–400",when:"This week"}])).res;
  await wait(to("b"));await sleep(400);ok(PS.got.filter(to("a")).length===0&&PS.got.filter(to("b")).length===1,"next matching job: A (new jobs off) gets nothing, B still does",J({a:PS.got.filter(to("a")).length,b:PS.got.filter(to("b")).length}))}
 // test alert
 {PS.got.length=0;const r=await post(LOCAL.port,A1.ck,"/api/push/test",{endpoint:EP("a")});const g=await wait(to("a"));const x=g[0]?open(g[0],dA):{};
  ok(r.status===200&&r.json&&r.json.ok&&x.title==="Sawyer alerts are on"&&x.url==="/inbox","'Send a test alert' delivers to this device",J([r.json,x]));
  const r2=await post(LOCAL.port,A1.ck,"/api/push/test",{endpoint:EP("b")});ok(r2.status===400,"a test alert can't be aimed at someone else's device",r2.status)}
 // sign-out drops that session's devices
 {const r=await post(LOCAL.port,B1.ck,"/api/logout",{});const bl=await login(LOCAL.port,"v32-b-"+run+"@example.com","v32-correct-horse");
  const st=(await post(LOCAL.port,bl.ck,"/api/push/status",{endpoint:EP("b")})).json||{};ok(r.status===200&&st.on===false&&st.devices===0,"signing out removes that browser's alerts",J(st));
  PS.got.length=0;await act(LOCAL.port,HO.ck,"postJob",[{title:"V32 third leak "+run,cat:"Plumbing",sub:"Drain cleaning",desc:"Third.",zip:"78704",budget:"$100–400",when:"This week"}]);await sleep(700);ok(PS.got.filter(to("b")).length===0,"no pushes to a signed-out device")}
 // a session that ends some other way (password change elsewhere) stops pushes too
 {const g1=await signupPro("g","Plumbing");await sub(g1,dG,"g");const g2=await login(LOCAL.port,"v32-g-"+run+"@example.com","v32-correct-horse");
  const pw=await post(LOCAL.port,g2.ck,"/api/account/password",{current:"v32-correct-horse",password:"v32-new-horse-9"});
  PS.got.length=0;await act(LOCAL.port,HO.ck,"postJob",[{title:"V32 fourth leak "+run,cat:"Plumbing",sub:"Drain cleaning",desc:"Fourth.",zip:"78704",budget:"$100–400",when:"This week"}]);await sleep(700);
  ok(pw.status===200&&PS.got.filter(to("g")).length===0,"after a password change signs other sessions out, their devices stop getting alerts",J({pw:pw.status,n:PS.got.filter(to("g")).length}))}
 // dead endpoint (410) is removed
 {const dX=device();await post(LOCAL.port,H1.ck,"/api/push/subscribe",{sub:{endpoint:PS.origin+"/gone/h-"+run,keys:dX.keys}});const r=await post(LOCAL.port,H1.ck,"/api/push/test",{endpoint:PS.origin+"/gone/h-"+run});
  const tries=PS.got.filter(g=>g.path==="/gone/h-"+run).length;const st0=(await post(LOCAL.port,H1.ck,"/api/push/status",{endpoint:PS.origin+"/gone/h-"+run})).json||{};
  ok(r.json&&r.json.sent===1&&tries===2&&st0.on===true&&st0.devices===2,"a brand-new device that reads 410 is retried once and kept (push services can lag right after subscribing)",J([r.json,tries,st0]));
  {const {DatabaseSync}=require("node:sqlite");const db=new DatabaseSync(path.join(LOCAL.dir,"sawyer.db"));db.prepare("UPDATE pushsubs SET created=? WHERE endpoint=?").run(Date.now()-3600e3,PS.origin+"/gone/h-"+run);db.close()}
  const r2=await post(LOCAL.port,H1.ck,"/api/push/test",{endpoint:EP("h")});
  const st=(await post(LOCAL.port,H1.ck,"/api/push/status",{endpoint:PS.origin+"/gone/h-"+run})).json||{};ok(r2.json&&r2.json.sent===1&&st.on===false&&st.devices===1,"an older device that reads 410 Gone is removed (the other one stays)",J([r2.json,st]))}
 // unsubscribe
 {const r=(await post(LOCAL.port,H1.ck,"/api/push/unsubscribe",{endpoint:EP("h")})).json||{};ok(r.ok&&r.on===false&&r.devices===0,"Turn off: unsubscribe removes the device",J(r))}
 // privacy: nothing about devices or keys in state; private key never served or logged
 {const s=await req(LOCAL.port,"GET","/api/state",{Cookie:A1.ck});const pub=await req(LOCAL.port,"GET","/api/state");
  ok(!/\/send\/|p256dh|"auth":"|pushsubs/.test(s.body+pub.body),"no endpoints or device keys in /api/state (signed in or out)");
  const {DatabaseSync}=require("node:sqlite");const db=new DatabaseSync(path.join(LOCAL.dir,"sawyer.db"));const row=db.prepare("SELECT jwk FROM vapid WHERE id=1").get();const jwk=JSON.parse(row.jwk);db.close();
  const pubOf=Buffer.concat([Buffer.from([4]),Buffer.from(jwk.x,"base64url"),Buffer.from(jwk.y,"base64url")]).toString("base64url");
  ok(pubOf===KEY.key,"the stored VAPID key pair matches the served public key (generated once, kept server-side)");
  const ex=await req(LOCAL.port,"GET","/api/account/export",{Cookie:A1.ck});const al=(ex.json||{}).alerts||{};
  ok(al.devices&&al.devices.length===1&&al.devices[0].service==="127.0.0.1"&&al.devices[0].turnedOn&&al.devices[0].lastDelivered&&al.choices&&al.choices.jobs===false&&!/\/send\//.test(J(al)),"'Download my data' lists alert devices (push service, when turned on, last delivered) and choices, without the private endpoint URL",J(al));const hz2=await req(LOCAL.port,"GET","/healthz");const swb=await req(LOCAL.port,"GET","/sw.js");const home=await req(LOCAL.port,"GET","/",{Cookie:A1.ck});
  const hay=[LOCAL.log(),ex.body,hz2.body,swb.body,home.body,s.body,pub.body,J(KEY)].join("\n");ok(jwk.d&&jwk.d.length>=40&&!hay.includes(jwk.d),"the VAPID private key never appears in server logs, the data export, healthz, the service worker, the page or state");
  ok(!/push: [a-z0-9.-]+ -> \d+/.test(LOCAL.log()),"no per-push log lines unless PUSH_DEBUG is set")}
 // account delete removes devices
 {const D=await signupHo("del");const dd=device();await sub(D,dd,"del");const r=await post(LOCAL.port,D.ck,"/api/account/delete",{confirm:"DELETE"});
  const {DatabaseSync}=require("node:sqlite");const db=new DatabaseSync(path.join(LOCAL.dir,"sawyer.db"));const n=db.prepare("SELECT COUNT(*) n FROM pushsubs WHERE uid=?").get(D.id).n,m=db.prepare("SELECT COUNT(*) n FROM pushprefs WHERE uid=?").get(D.id).n;db.close();
  ok(r.status===200&&n===0&&m===0,"deleting an account removes its devices and alert choices",J({s:r.status,n,m}))}

 // ===== 4. UI (dashboard + Inbox) with a stand-in browser push service =====
 // Headless test browsers have no push service, so PushManager / Notification are replaced with a stand-in that hands
 // out a subscription pointing at the local push service. Everything else (service worker, API, encryption) is real.
 const stub={fn:(S)=>{const LS="__v32stub";const g=()=>{try{return JSON.parse(localStorage.getItem(LS)||"{}")}catch(e){return{}}},s=o=>localStorage.setItem(LS,JSON.stringify(Object.assign(g(),o)));
   try{Object.defineProperty(Notification,"permission",{configurable:true,get:()=>g().perm||"default"})}catch(e){}
   Notification.requestPermission=async()=>{const p=S.deny?"denied":"granted";s({perm:p});window.__asked=(window.__asked||0)+1;return p};
   const mk=k=>({endpoint:S.endpoint,options:{applicationServerKey:k},toJSON(){return{endpoint:S.endpoint,expirationTime:null,keys:{p256dh:S.p256dh,auth:S.auth}}},unsubscribe:async()=>{s({sub:false});return true}});
   PushManager.prototype.getSubscription=async function(){const x=g();return x.sub?mk(new Uint8Array(x.key).buffer):null};
   PushManager.prototype.subscribe=async function(o){const k=new Uint8Array(o.applicationServerKey);s({sub:true,key:[...k]});window.__subKey=[...k];return mk(k.buffer)}},arg:null};
 const uiDev=device();const uiStub=Object.assign({},stub,{arg:{endpoint:EP("ui"),p256dh:uiDev.keys.p256dh,auth:uiDev.keys.auth}});
 for(const w of [1440,390]){const U=await signupPro("ui"+w,"Plumbing");uiStub.arg.endpoint=EP("ui"+w);
  const p=await page(w,U.ck,uiStub);await p.goto(LOCAL.B+"/dash",{waitUntil:"networkidle"});await p.waitForSelector("#v32push-dash [data-v32on]",{timeout:10000});
  const o=await p.evaluate(()=>{const c=document.getElementById("v32push-dash");const b=c.getBoundingClientRect();return{t:c.innerText.replace(/\s+/g," "),w:b.width,ow:document.documentElement.scrollWidth>innerWidth+1,h1:document.querySelectorAll("h1").length,font:getComputedStyle(c.querySelector("h2")).fontFamily}});
  ok(/Alerts on this device/.test(o.t)&&/trade and service area/.test(o.t)&&/Works even with Sawyer closed/.test(o.t)&&/Turn on alerts/.test(o.t)&&/Not now/.test(o.t),w+" pro dashboard: 'Alerts on this device' card with a clear Turn on button",o.t);
  ok(!o.ow&&o.h1===1&&/Plus Jakarta Sans/.test(o.font),w+" no overflow, one H1, Plus Jakarta Sans",J(o));
  if(w===1440)await p.screenshot({path:path.join(process.argv[3]||os.tmpdir(),"v32-dash-off-"+w+".png")}).catch(()=>{});
  PS.got.length=0;await p.click("#v32push-dash [data-v32on]");await p.waitForSelector("#v32push-dash [data-v32off]",{timeout:8000});
  const st=(await post(LOCAL.port,U.ck,"/api/push/status",{endpoint:EP("ui"+w)})).json||{};const sk=await p.evaluate(()=>window.__subKey);
  ok(st.on===true&&st.devices===1,w+" Turn on: the browser asks, subscribes and the server has this device",J(st));
  ok(Buffer.from(sk||[]).toString("base64url")===KEY.key,w+" the subscription uses the server's VAPID public key");
  const t2=await p.$eval("#v32push-dash",e=>e.innerText.replace(/\s+/g," "));ok(/On for this device/.test(t2)&&/Send a test alert/.test(t2)&&/Turn off/.test(t2)&&/Choose what alerts you/.test(t2),w+" card now says 'On for this device' with Test, Turn off and a link to choices",t2);
  await p.click("#v32push-dash [data-v32test]");const g=await wait(to("ui"+w));const x=g[0]?open(g[0],uiDev):{};ok(x.title==="Sawyer alerts are on",w+" 'Send a test alert' reaches this device",J(x));
  // Inbox: kinds
  await p.goto(LOCAL.B+"/inbox",{waitUntil:"networkidle"});await p.waitForSelector("#v32push-inbox [data-v32off]",{timeout:8000});
  const ib=await p.evaluate(()=>{const c=document.getElementById("v32push-inbox");return{boxes:[...c.querySelectorAll("[data-v32cat]")].map(i=>[i.dataset.v32cat,i.checked,!!i.closest("label")]),side:!!c.closest(".n11-side"),ow:document.documentElement.scrollWidth>innerWidth+1,first:c.parentElement.firstElementChild===c}});
  ok(J(ib.boxes)===J([["jobs",true,true],["hires",true,true],["msgs",true,true]])&&ib.side&&ib.first&&!ib.ow,w+" Inbox: alert card first in 'How we reach you', with labeled switches for new jobs, hires and messages, no overflow",J(ib));
  if(w===1440)await p.screenshot({path:path.join(process.argv[3]||os.tmpdir(),"v32-inbox-"+w+".png")}).catch(()=>{});
  await p.click('#v32push-inbox [data-v32cat="jobs"]');await sleep(400);const st2=(await post(LOCAL.port,U.ck,"/api/push/status",{endpoint:EP("ui"+w)})).json||{};
  ok(st2.cats&&st2.cats.jobs===false&&st2.cats.hires===true,w+" unticking 'new jobs' saves on the server",J(st2.cats));
  await p.click("#v32push-inbox [data-v32off]");await p.waitForSelector("#v32push-inbox [data-v32on]",{timeout:8000});const st3=(await post(LOCAL.port,U.ck,"/api/push/status",{endpoint:EP("ui"+w)})).json||{};
  ok(st3.on===false&&st3.devices===0,w+" Turn off removes the device on the server",J(st3));
  // Not now hides the dashboard prompt on this device (Inbox still has it)
  await p.goto(LOCAL.B+"/dash",{waitUntil:"networkidle"});await p.waitForSelector("#v32push-dash [data-v32hide]",{timeout:8000});await p.click("#v32push-dash [data-v32hide]");await sleep(200);
  await p.reload({waitUntil:"networkidle"});await sleep(900);const hid=await p.evaluate(()=>{const w=document.querySelector(".v32push-w");return !w||w.hidden||w.offsetHeight===0});ok(hid,w+" 'Not now' hides the dashboard prompt on this device, also after a reload");
  await p.context().close()}
 // homeowner copy + denied permission
 {const p=await page(1440,HO.ck,Object.assign({},stub,{arg:{endpoint:EP("hoUI"),p256dh:dHO.keys.p256dh,auth:dHO.keys.auth,deny:true}}));await p.goto(LOCAL.B+"/dash",{waitUntil:"networkidle"});await p.waitForSelector("#v32push-dash [data-v32s] button",{timeout:8000});
  const t=await p.$eval("#v32push-dash",e=>e.innerText.replace(/\s+/g," "));ok(/as soon as a pro sends you a quote/.test(t),"homeowner dashboard card talks about quotes",t);
  await p.goto(LOCAL.B+"/inbox",{waitUntil:"networkidle"});await p.waitForSelector("#v32push-inbox",{timeout:8000});await sleep(500);
  const hb=await p.$$eval("#v32push-inbox [data-v32cat]",a=>a.map(i=>i.dataset.v32cat));ok(J(hb)===J(["quotes","msgs"]),"homeowner Inbox switches: new quotes and messages",J(hb));
  if(await p.$("#v32push-inbox [data-v32off]")){await p.click("#v32push-inbox [data-v32off]");await p.waitForSelector("#v32push-inbox [data-v32on]",{timeout:8000})}
  await p.click("#v32push-inbox [data-v32on]");await p.waitForFunction(()=>/blocked/.test(document.getElementById("v32push-inbox").innerText),null,{timeout:8000}).catch(()=>{});
  const t2=await p.$eval("#v32push-inbox",e=>e.innerText.replace(/\s+/g," "));ok(/blocked for Sawyer/.test(t2)&&!/On for this device/.test(t2),"if the person says no (permission denied), the card explains how to allow it and stays off",t2);await p.context().close()}
 // PM, signed out: no card
 {const pm=await login(LOCAL.port,"demo-pm@sawyer.test");const p=await page(1440,pm.ck);await p.goto(LOCAL.B+"/dash",{waitUntil:"networkidle"});await sleep(300);ok(!(await p.$("[data-v32push]")),"project-manager dashboard: no alert card (no PM alert kinds yet)");await p.context().close()}
 {const r=await req(LOCAL.port,"GET","/dash");ok(!/data-v32push/.test(r.body),"signed-out HTML has no alert card")}
 // unsupported browser (no PushManager): explains Home Screen on iPhone
 {const p=await page(390,A1.ck,{fn:()=>{try{delete window.PushManager}catch(e){}window.PushManager=undefined},arg:null});await p.goto(LOCAL.B+"/inbox",{waitUntil:"networkidle"});await p.waitForFunction(()=>{const e=document.getElementById("v32push-inbox");return e&&/can't show alerts/.test(e.innerText)},null,{timeout:8000}).catch(()=>{});
  const t=await p.$eval("#v32push-inbox",e=>e.innerText.replace(/\s+/g," ")).catch(()=>"");ok(/can't show alerts/.test(t)&&/Home Screen/.test(t),"a browser without push says so and explains the iPhone Home Screen step",t);await p.context().close()}

 // ===== 5. The real service worker's push + click handlers (Chromium, DevTools push) =====
 {let c=null;try{const ud=fs.mkdtempSync(path.join(os.tmpdir(),"v32-pw-"));c=await chromium.launchPersistentContext(ud,{channel:"chromium",viewport:{width:1440,height:900}});await c.grantPermissions(["notifications"],{origin:LOCAL.B});
   const p=await c.newPage();await p.goto(LOCAL.B+"/",{waitUntil:"networkidle"});await p.evaluate(()=>navigator.serviceWorker.ready);
   const cdp=await c.newCDPSession(p);const regs=[];cdp.on("ServiceWorker.workerRegistrationUpdated",e=>regs.push(...e.registrations));await cdp.send("ServiceWorker.enable");await sleep(600);
   const rid=(regs.find(r=>r.scopeURL===LOCAL.B+"/")||{}).registrationId;
   await cdp.send("ServiceWorker.deliverPushMessage",{origin:LOCAL.B,registrationId:rid,data:J({title:"New job in your area",body:"New job in your area: Leaky faucet",url:"/job/j1",tag:"jobs:job:j1"})});
   await cdp.send("ServiceWorker.deliverPushMessage",{origin:LOCAL.B,registrationId:rid,data:J({title:"Sneaky",body:"x",url:"//evil.example/phish",tag:"t2"})});await sleep(900);
   const ns=await p.evaluate(async()=>{const r=await navigator.serviceWorker.ready;return(await r.getNotifications()).map(n=>({t:n.title,b:n.body,u:n.data&&n.data.url,tag:n.tag,icon:n.icon}))});
   const a=ns.find(n=>n.tag==="jobs:job:j1"),b=ns.find(n=>n.tag==="t2");
   ok(a&&a.t==="New job in your area"&&a.b==="New job in your area: Leaky faucet"&&a.u==="/job/j1"&&/\/icons\/icon-192\.png$/.test(a.icon),"service worker shows the notification (title, body, house icon, link kept for the click)",J(ns));
   ok(b&&b.u==="/inbox","a link that isn't on this site is replaced with /inbox",J(b));
  }catch(e){ok(false,"service worker push check ran (Chromium channel)",e.message)}finally{if(c)await c.close().catch(()=>{})}}

 ok(errs.length===0,"no page errors",J(errs.slice(0,5)));
}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL);try{PS&&PS.srv.close()}catch(e){}}
 console.log(failed?"FAIL v32-e2e: "+failed+" failed":"PASS v32-e2e: all checks passed");process.exit(failed?1:0)})();
