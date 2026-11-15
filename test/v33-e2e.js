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
 //@@RELEASE@@
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
//@@FEATURES@@

}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL);try{PS&&PS.srv.close()}catch(e){}}
 console.log(failed?"FAIL v33-e2e: "+failed+" failed":"PASS v33-e2e: all checks passed");process.exit(failed?1:0)})();
