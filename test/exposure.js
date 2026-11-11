// Public-host exposure checks: auth test mode, demo OAuth, staff password, signed-out snapshot.
// Usage: node test/exposure.js
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const ROOT=path.join(__dirname,"..");
let failed=0;
function assert(cond,msg){if(!cond){failed++;console.error("FAIL",msg)}else console.log("ok",msg)}
function start(port,extra){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-exposure-"));
 const env=Object.assign({},process.env,extra||{},{HOST:"127.0.0.1",PORT:String(port),DATA_DIR:dir});
 for(const k of ["NODE_ENV","RENDER","AUTH_TEST_MODE","STAFF_DEMO_PASSWORD","RESEND_API_KEY","SENDGRID_API_KEY","EMAIL_FROM","TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_FROM"])if(!extra||!(k in extra))delete env[k];
 const child=spawn(process.execPath,[path.join(ROOT,"server.js")],{env,stdio:["ignore","pipe","pipe"]});
 let log="";child.stdout.on("data",d=>{log+=d});child.stderr.on("data",d=>{log+=d});
 return new Promise((ok,no)=>{
  const t=setTimeout(()=>{no(new Error("server did not start\n"+log))},8000);
  const wait=()=>{if(/live on/.test(log)){clearTimeout(t);ok({child,dir,log:()=>log})}else setTimeout(wait,30)};
  child.on("exit",()=>{clearTimeout(t);no(new Error("server exited\n"+log))});
  wait();
 });
}
function stop(s){return new Promise(ok=>{s.child.on("exit",()=>{fs.rmSync(s.dir,{recursive:true,force:true});ok()});s.child.kill("SIGTERM")})}
function req(port,method,p,headers,body){
 return new Promise((ok,no)=>{
  const r=http.request({hostname:"127.0.0.1",port,path:p,method,headers:headers||{}},res=>{
   const chunks=[];res.on("data",c=>chunks.push(c));res.on("end",()=>{
    let buf=Buffer.concat(chunks);const enc=res.headers["content-encoding"];
    if(enc==="gzip")buf=zlib.gunzipSync(buf);else if(enc==="br")buf=zlib.brotliDecompressSync(buf);
    let json=null;try{json=JSON.parse(buf.toString("utf8"))}catch(e){}
    ok({status:res.statusCode,headers:res.headers,body:buf.toString("utf8"),json});
   });
  });
  r.on("error",no);if(body)r.write(body);r.end();
 });
}
const DEMO="sawyer-demo-2026";
function freePort(){return new Promise((ok,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>ok(p))});s.on("error",no)})}
function cookieJar(res,jar){const raw=res.headers["set-cookie"];const list=Array.isArray(raw)?raw:raw?[raw]:[];
 for(const c of list){const kv=c.split(";")[0];const i=kv.indexOf("=");if(i>0)jar[kv.slice(0,i).trim()]=kv.slice(i+1).trim()}return jar}
function cookieHeader(jar){return Object.entries(jar).map(([k,v])=>k+"="+v).join("; ")}
async function login(port,email,pw){
 const jar={};const r=await req(port,"POST","/api/login",{"Content-Type":"application/json"},JSON.stringify({email,password:pw}));
 cookieJar(r,jar);return {status:r.status,json:r.json,cookie:cookieHeader(jar)};
}
async function state(port,cookie){const r=await req(port,"GET","/api/state",cookie?{Cookie:cookie}:{});return r.json&&r.json.state}

(async()=>{
 const localPort=await freePort(),prodPort=await freePort(),renderPort=await freePort(),staffPort=await freePort();
 const local=await start(localPort);
 const prod=await start(prodPort,{NODE_ENV:"production",AUTH_TEST_MODE:"1"});
 const render=await start(renderPort,{RENDER:"true"});
 const staffed=await start(staffPort,{NODE_ENV:"production",STAFF_DEMO_PASSWORD:"trust-only-pass-99"});
 try{
  const known=await req(localPort,"POST","/api/auth/start",{"Content-Type":"application/json"},JSON.stringify({channel:"email",to:"demo-homeowner@sawyer.test"}));
  const unknown=await req(localPort,"POST","/api/auth/start",{"Content-Type":"application/json"},JSON.stringify({channel:"email",to:"nobody-exposure@example.com"}));
  assert(known.status===200&&unknown.status===200,"local /api/auth/start still returns the test code");
  assert(known.json&&known.json.test&&/^\d{6}$/.test(known.json.code)&&typeof known.json.link==="string","local test mode includes code and magic link");
  const keys=o=>Object.keys(o||{}).sort().join(",");
  assert(keys(known.json)===keys(unknown.json)&&!("exists" in known.json)&&!("exists" in unknown.json),"local start responses have the same keys and omit exists");

  for(const [port,label] of [[prodPort,"NODE_ENV=production"],[renderPort,"RENDER=true"]]){
   const a=await req(port,"POST","/api/auth/start",{"Content-Type":"application/json"},JSON.stringify({channel:"email",to:"demo-homeowner@sawyer.test"}));
   const b=await req(port,"POST","/api/auth/start",{"Content-Type":"application/json"},JSON.stringify({channel:"email",to:"nobody-exposure@example.com"}));
   const leak=j=>j&&(j.code||j.link||("exists" in j)||/test mode/i.test(JSON.stringify(j)));
   assert(a.status===b.status&&a.body===b.body&&!leak(a.json),label+" start is identical for known and unknown emails and has no code, link, or exists",a.status+" "+a.body.slice(0,180));
   const demo=await req(port,"GET","/auth/oauth/google/start?role=homeowner");
   assert(demo.status===404&&!/DEMO MODE|oaGo|demo_email/.test(demo.body),label+" disables the demo OAuth route",demo.status);
   const home=await login(port,"demo-homeowner@sawyer.test",DEMO);
   assert(home.status===200&&home.json&&home.json.ok,label+" still allows the shared demo homeowner login",home.status);
   const trust=await login(port,"demo-trust@sawyer.test",DEMO);
   assert(trust.status===401,label+" refuses the shared demo password for staff",trust.status);
  }

  const trustOk=await login(staffPort,"demo-trust@sawyer.test","trust-only-pass-99");
  assert(trustOk.status===200&&trustOk.json&&trustOk.json.ok,"STAFF_DEMO_PASSWORD signs in the trust account on the public host");
  const trustNo=await login(staffPort,"demo-trust@sawyer.test",DEMO);
  assert(trustNo.status===401,"the published demo password still does not open staff when STAFF_DEMO_PASSWORD is set");
  const localTrust=await login(localPort,"demo-trust@sawyer.test",DEMO);
  assert(localTrust.status===200&&localTrust.json&&localTrust.json.ok,"local dev still signs in staff with the shared demo password");

  const badPw=await req(localPort,"POST","/api/signup",{"Content-Type":"application/json"},JSON.stringify({kind:"customer",password:DEMO,data:{name:"Pat Real",email:"pat-real@example.com",zip:"78704"}}));
  assert(badPw.status===400,"signup rejects the shared demo password");
  const su=await req(localPort,"POST","/api/signup",{"Content-Type":"application/json"},JSON.stringify({kind:"customer",password:"correct-horse-9",data:{name:"Pat Real",email:"pat-real@example.com",zip:"78704"}}));
  const victim=su.json&&su.json.state&&su.json.state.me;
  assert(su.status===200&&victim,"signed up a non-demo account");
  const asDemo=await login(localPort,"pat-real@example.com",DEMO);
  assert(asDemo.status===401,"the shared demo password does not open a non-demo account");

  const jar={};const startO=await req(localPort,"GET","/auth/oauth/google/start?role=homeowner");
  cookieJar(startO,jar);const loc=startO.headers.location||"";const st=(loc.match(/state=([^&]+)/)||[])[1];
  assert(startO.status===302&&/\/auth\/oauth\/google\/demo/.test(loc)&&jar.swoa,"local demo OAuth still redirects to the demo screen");
  const cb=await req(localPort,"POST","/auth/oauth/google/callback",{"Content-Type":"application/x-www-form-urlencoded",Cookie:cookieHeader(jar)},"state="+encodeURIComponent(st||"")+"&demo_name=Pat+Imposter&demo_email="+encodeURIComponent("pat-real@example.com"));
  const ojar={};cookieJar(cb,ojar);
  assert(cb.status===302&&ojar.swsid,"demo OAuth with an existing email still finishes");
  const stole=await state(localPort,cookieHeader(ojar));
  assert(stole&&stole.me&&stole.me!==victim,"demo OAuth does not sign in as the existing non-demo account");
  const fresh=await req(localPort,"GET","/auth/oauth/google/start?role=pm");
  const fjar={};cookieJar(fresh,fjar);const fst=((fresh.headers.location||"").match(/state=([^&]+)/)||[])[1];
  const fcb=await req(localPort,"POST","/auth/oauth/google/callback",{"Content-Type":"application/x-www-form-urlencoded",Cookie:cookieHeader(fjar)},"state="+encodeURIComponent(fst||"")+"&demo_name=Pat+Manager&demo_email="+encodeURIComponent("pm-new-exposure@example.com"));
  const foj={};cookieJar(fcb,foj);const made=await state(localPort,cookieHeader(foj));
  const madeUser=(made&&made.users||[]).find(u=>u.id===made.me);
  assert(fcb.status===302&&madeUser&&madeUser.role==="pm","a new demo OAuth email still creates an account with the chosen role");

  const pub=await state(localPort);
  assert(pub&&pub.projects&&pub.projects.length>0&&pub.lodging&&pub.lodging.length>0,"signed-out snapshot still includes projects and lodging");
  assert(pub.projects.every(p=>p.desc===""&&p.pm==null&&!(p.roles||[]).some(r=>(r.apps||[]).length||(r.note||""))),"signed-out projects drop descriptions, PM ids, and applicant notes");
  assert(pub.projects.some(p=>p.demo&&p.zip&&p.title),"demo projects keep a town and title for browsing");
  assert(!JSON.stringify(pub.projects).includes("gunite")&&!JSON.stringify(pub.lodging).includes("Gravel pad"),"seed descriptions and lodging notes are not in the signed-out payload");
  assert(pub.lodging.every(l=>!l.notes)&&pub.lodging.some(l=>l.demo&&l.loc&&l.state),"signed-out lodging drops notes and keeps demo town and state");
  assert(pub.users.every(u=>!u.phone&&!u.email),"signed-out users have no phones or emails");
  assert((pub.reviews||[]).length>0&&pub.reviews.every(r=>String(r.uid||"").startsWith("rv-")),"signed-out reviews use per-review tokens, not author uids");
  const ids=new Set(pub.users.map(u=>u.id));
  assert(pub.reviews.every(r=>!ids.has(r.uid)),"review tokens are not linkable to users[]");
  const pro=await login(localPort,"demo-pro@sawyer.test",DEMO);
  const ps=await state(localPort,pro.cookie);
  assert(ps&&ps.projects.some(p=>/gunite/.test(p.desc||"")&&p.pm),"a signed-in pro still sees project descriptions and PM ids");
  const pm=await login(localPort,"demo-pm@sawyer.test",DEMO);
  const pms=await state(localPort,pm.cookie);
  assert(pms&&pms.projects.some(p=>p.pm==="m1"&&/gunite|pole barn|kitchen/i.test(p.desc||"")),"the demo PM still sees their own project detail");
 }finally{await stop(local);await stop(prod);await stop(render);await stop(staffed)}
 if(failed){console.error("\n"+failed+" FAILED");process.exit(1)}
 console.log("\nALL PASS");
})().catch(e=>{console.error("FAIL crashed",e);process.exit(1)});
