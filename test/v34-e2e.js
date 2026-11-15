// v34 end-to-end. Self-contained: starts its own Sawyer servers (local test mode, temp data dirs).
// Covers: SW-072 (deleting a PM's account takes their projects out of the public catalog: unstaffed ones are deleted,
// staffed ones are closed + unlisted + anonymized and only their crew still sees them; owners deleted before v34 are tidied
// at start), and the v34 sections below.
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib"),crypto=require("crypto");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra,keepDir){
 const dir=keepDir||fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v34-"));
 const env=Object.assign({},process.env,{HOST:"127.0.0.1",PORT:String(port),DATA_DIR:dir,RATE_X:"50"});
 for(const k of ["NODE_ENV","RENDER","AUTH_TEST_MODE","STAFF_DEMO_PASSWORD","RESEND_API_KEY","SENDGRID_API_KEY","EMAIL_FROM","MAIL_FROM","RESEND_API_URL","TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_FROM","TWILIO_MESSAGING_SERVICE_SID","TEST_NOW","SAWYER_BASE_URL","PUBLIC_URL","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","APPLE_CLIENT_ID","MICROSOFT_CLIENT_ID","FACEBOOK_APP_ID","VAPID_PRIVATE_KEY","VAPID_PUBLIC_KEY","VAPID_SUBJECT","PUSH_DEBUG","PUSH_TEST_ORIGIN","PUSH_RETRY_MS","SAWYER_PERSISTENT"])if(!extra||!(k in extra))delete env[k];
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
const sigCk=r=>(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0];
let LOCAL=null,br=null;
(async()=>{try{
 LOCAL=await startApp(await freePort());const P=()=>LOCAL.port;
 const run=Math.random().toString(36).slice(2,8);
 const signupPro=async(tag,trade,zip)=>{const r=await req(P(),"POST","/api/signup",JH,J({kind:"pro",password:"v34-correct-horse",data:{name:"Vee "+tag,biz:"V34 "+tag+" "+run,email:"v34-"+tag+"-"+run+"@example.com",trade:trade||"Plumbing",zip:zip||"78704",phone:"5125550100",plan:"founding"}}));return{ck:sigCk(r),id:stateOf(r).me}};
 const signupHo=async(tag)=>{const r=await req(P(),"POST","/api/signup",JH,J({kind:"customer",password:"v34-correct-horse",data:{name:"Hana "+tag,email:"v34-ho-"+tag+"-"+run+"@example.com",zip:"78704"}}));return{ck:sigCk(r),id:stateOf(r).me}};
 const signupPm=async(tag)=>{const r=await req(P(),"POST","/api/signup",JH,J({kind:"pm",password:"v34-correct-horse",data:{name:"Pam "+tag,biz:"V34 Build "+tag+" "+run,email:"v34-pm-"+tag+"-"+run+"@example.com",zip:"78704"}}));return{ck:sigCk(r),id:stateOf(r).me}};
 const pub=async()=>stateOf(await req(P(),"GET","/api/state"));
 const stateFor=async ck=>stateOf(await req(P(),"GET","/api/state",{Cookie:ck}));
 const delAcct=ck=>post(P(),ck,"/api/account/delete",{confirm:"DELETE"});
 const proj=(tag)=>({type:"custom",title:"V34 "+tag+" addition "+run,zip:"78704",budget:"45000",start:"2027-03-01",end:"2027-06-01",desc:"Secret gate code 4321 "+tag,phases:["Dig","Frame","Finish"],roles:[{trade:"Plumbing",label:"Plumber",need:2},{trade:"Electrical",label:"Electrician",need:1}]});
 const SH=process.argv[2]||os.tmpdir();br=await chromium.launch();const errs=[];
 const page=async(w,cookie)=>{const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900},acceptDownloads:true});
  if(cookie){const [k,v]=cookie.split("=");await c.addCookies([{name:k,value:v,url:LOCAL.B}])}
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return p};

 // ===== 1. SW-072: deleting a PM account takes their projects out of the public catalog =====
 {const PM=await signupPm("open"),X=await signupPro("onlooker");ok(PM.ck&&X.ck,"SW-072: throwaway PM and pro sign up");
  const a=await act(P(),PM.ck,"postProject",[proj("open")]);const pid=a.res.id;ok(a.res.ok&&pid,"PM posts an open project with no crew",J(a.res));
  await act(P(),PM.ck,"crewSend",[pid,"all","note to self "+run]);
  let s=await pub();ok((s.projects||[]).some(p=>p.id===pid&&p.status==="open"),"the open project is in the signed-out catalog before the delete");
  {const ns=(await stateFor(X.ck)).notifs||[];ok(ns.some(n=>n.link==="project:"+pid),"a matching pro got the 'new crew opening' notice",J(ns.slice(-3)))}
  const d=await delAcct(PM.ck);ok(d.status===200&&d.json.ok,"PM deletes their account",d.status+" "+d.body.slice(0,200));
  s=await pub();ok(!(s.projects||[]).some(p=>p.id===pid)&&!JSON.stringify(s).includes("V34 open addition "+run),"after the delete the project is gone from the signed-out catalog (no title anywhere)",J((s.projects||[]).map(p=>p.id)));
  const sx=await stateFor(X.ck);ok(!(sx.projects||[]).some(p=>p.id===pid),"…and from a signed-in pro's state");
  ok(!(sx.notifs||[]).some(n=>n.link==="project:"+pid),"the pro's 'new crew opening' notice for it is removed (no dead link)");
  const lg=await login(P(),"demo-pm@sawyer.test");ok(!(lg.st.projects||[]).some(p=>p.id===pid),"…and from another PM's state");
  {const {DatabaseSync}=require("node:sqlite");const db=new DatabaseSync(path.join(LOCAL.dir,"sawyer.db"));const pj=JSON.parse(db.prepare("SELECT v FROM appdata WHERE k='projects'").get().v),pm=JSON.parse(db.prepare("SELECT v FROM appdata WHERE k='pmsgs'").get().v);db.close();
   ok(!pj.some(p=>p.id===pid)&&!pm.some(m=>m.pid===pid),"an unstaffed project is hard-deleted from the database, with its crew chat",J({p:pj.filter(p=>p.id===pid).length,m:pm.filter(m=>m.pid===pid).length}))}
  const pp=await page(1440,X.ck);await pp.goto(LOCAL.B+"/project/"+pid,{waitUntil:"networkidle"});const t=await pp.evaluate(()=>document.querySelector("h1")&&document.querySelector("h1").textContent);ok(/not found/i.test(t||""),"its page now says Page not found",t);await pp.context().close();
 }
 {const PM=await signupPm("staffed"),C1=await signupPro("crew"),C2=await signupPro("pending"),Y=await signupPro("stranger");
  const a=await act(P(),PM.ck,"postProject",[proj("staffed")]);const pid=a.res.id;
  ok((await act(P(),C1.ck,"applyRole",[pid,"r1","I can start in March"])).res.ok&&(await act(P(),C2.ck,"applyRole",[pid,"r1","Me too"])).res.ok,"two pros apply for the plumber slots");
  ok((await act(P(),PM.ck,"acceptApp",[pid,"r1",C1.id])).res.ok,"PM accepts one onto the crew (project is now staffed)");
  const d=await delAcct(PM.ck);ok(d.status===200,"PM with a staffed project deletes their account",d.body.slice(0,200));
  const s=await pub();ok(!(s.projects||[]).some(p=>p.id===pid)&&!JSON.stringify(s).includes("V34 staffed addition "+run),"the staffed project is not in the signed-out catalog either");
  ok(!((await stateFor(Y.ck)).projects||[]).some(p=>p.id===pid),"a pro who isn't on it doesn't get it");
  const c1=await stateFor(C1.ck),pc=(c1.projects||[]).find(p=>p.id===pid);
  ok(pc&&pc.status==="closed"&&pc.ownerGone34&&pc.desc===""&&pc.budget===""&&!/4321/.test(J(pc))&&pc.roles[0].filled.includes(C1.id),"the crew still has it as a closed, anonymized record (no description, notes or budget; crew kept)",J(pc&&{s:pc.status,d:pc.desc,b:pc.budget}));
  ok((c1.notifs||[]).some(n=>n.link==="project:"+pid&&/was closed: the project manager deleted their account/.test(n.text)),"the crew is told it was closed");
  const pend=((await stateFor(C2.ck)).projects||[]).find(p=>p.id===pid);ok(pend&&pend.roles[0].apps.find(x=>x.cid===C2.id).status==="closed","the pending applicant's application is closed (not left pending)",J(pend&&pend.roles[0].apps));
  for(const w of [390,1440]){const pp=await page(w,C1.ck);await pp.goto(LOCAL.B+"/projects",{waitUntil:"networkidle"});await sleep(300);
   ok(!(await pp.content()).includes("V34 staffed addition "+run),w+" the crew member's project browse doesn't list it as a listing");
   await pp.goto(LOCAL.B+"/project/"+pid,{waitUntil:"networkidle"});await pp.waitForSelector(".v34gone",{timeout:8000}).catch(()=>{});
   const n=await pp.evaluate(()=>{const e=document.querySelector(".v34gone");return e?{t:e.textContent,r:Math.round(e.getBoundingClientRect().right),ow:document.documentElement.scrollWidth>innerWidth+1}:null});
   ok(n&&/This project is closed\. Its project manager deleted their Sawyer account/.test(n.t)&&n.r<=w&&!n.ow,w+" its page says it is closed because the PM deleted their account",J(n));
   if(w===390){await sleep(500);await pp.screenshot({path:path.join(SH,"v34-project-closed-390.png")}).catch(()=>{})}
   await pp.context().close()}
 }
 // owners deleted before v34: tidied at start
 {const PM=await signupPm("old"),C=await signupPro("oldcrew");const a1=await act(P(),PM.ck,"postProject",[proj("oldopen")]),a2=await act(P(),PM.ck,"postProject",[proj("oldstaffed")]);
  await act(P(),C.ck,"applyRole",[a2.res.id,"r1","ok"]);await act(P(),PM.ck,"acceptApp",[a2.res.id,"r1",C.id]);
  await stopApp(LOCAL,true);
  {const {DatabaseSync}=require("node:sqlite");const db=new DatabaseSync(path.join(LOCAL.dir,"sawyer.db"));const us=JSON.parse(db.prepare("SELECT v FROM appdata WHERE k='users'").get().v);const u=us.find(x=>x.id===PM.id);
   for(const k of Object.keys(u))if(k!=="id"&&k!=="created")delete u[k];Object.assign(u,{name:"Former Sawyer member",role:"deleted",email:"",zip:"",deleted13:Date.now()});
   db.prepare("UPDATE appdata SET v=? WHERE k='users'").run(JSON.stringify(us));db.close()}
  LOCAL=await startApp(await freePort(),null,LOCAL.dir);
  ok(/SW-072: tidied 2 project\(s\)/.test(LOCAL.log()),"at start, projects of an owner deleted before v34 are tidied (logged)",LOCAL.log().slice(-300));
  const s=await pub();ok(!(s.projects||[]).some(p=>p.id===a1.res.id||p.id===a2.res.id),"neither is in the signed-out catalog");
  const cs=await login(P(),"v34-oldcrew-"+run+"@example.com","v34-correct-horse");const pc=(cs.st.projects||[]).find(p=>p.id===a2.res.id);
  ok(!(cs.st.projects||[]).some(p=>p.id===a1.res.id)&&pc&&pc.status==="closed"&&pc.ownerGone34,"the unstaffed one is deleted, the staffed one closed for its crew",J(pc&&pc.status));
  ok(((await pub()).projects||[]).filter(p=>/^Demo: /.test(p.title)).length===4,"the four demo projects are untouched")}

 // ===== 2. Persistence readiness / wipe detection (SW-071 itself needs a paid disk: owner decision) =====
 {const PS=require(path.join(ROOT,"lib/persist.js"));
  ok(PS.check("/data",{},"overlay / overlay rw 0 0\n/dev/sdb /data ext4 rw 0 0\n").persistent===true,"mount check: DATA_DIR=/data on its own ext4 disk is persistent");
  ok(PS.check("/data/sawyer",{},"overlay / overlay rw 0 0\n/dev/sdb /data ext4 rw 0 0\n").persistent===true,"…a folder inside the disk too");
  ok(PS.check("/opt/render/project/src/data",{},"overlay / overlay rw 0 0\n/dev/sdb /data ext4 rw 0 0\n").persistent===false,"./data in the app folder (Render free) is not persistent");
  ok(PS.check("/data",{},"overlay / overlay rw 0 0\n").persistent===false,"/data with no disk attached is not persistent");
  ok(PS.check("/scratch",{},"/dev/a / ext4 rw 0 0\ntmpfs /scratch tmpfs rw 0 0\n").persistent===false,"tmpfs is not persistent");
  ok(PS.check("/data",{SAWYER_PERSISTENT:"1"},"overlay / overlay rw 0 0\n").persistent===true&&PS.check("/data",{SAWYER_PERSISTENT:"0"},"/dev/a / ext4 rw 0 0\n/dev/b /data ext4 rw 0 0\n").persistent===false,"SAWYER_PERSISTENT=1 / 0 overrides the guess");
  ok(PS.mountOf("/data2",'/dev/a / ext4 rw 0 0\n/dev/b /data ext4 rw 0 0\n').point==="/","/data2 is not inside /data (prefix match is per path segment)");
  // a fresh server on a temp dir (root filesystem here)
  const A1=await startApp(await freePort());
  let hz=(await req(A1.port,"GET","/healthz")).json||{};
  ok(hz.persistent===false&&hz.freshDb===true&&hz.boots===1&&/^\d{4}-\d\d-\d\dT/.test(hz.dbSince||""),"/healthz on a fresh temp data dir: persistent false, freshDb true, boots 1, dbSince",J(hz));
  ok(!/\/tmp|sawyer-v34|DATA_DIR|mount/i.test(J(hz)),"/healthz carries no paths",J(hz));
  ok(/WARNING: data is NOT persistent \(DATA_DIR is on the root filesystem/.test(A1.log())&&/NOTICE: started from an empty database/.test(A1.log()),"boot log warns clearly (not persistent; fresh database seeded)",A1.log().slice(0,600));
  ok(stateOf(await req(A1.port,"GET","/api/state")).beta34&&stateOf(await req(A1.port,"GET","/api/state")).beta34.persistent===false,"state tells the app the beta isn't persistent");
  const since=hz.dbSince;await stopApp(A1,true);
  const A2=await startApp(await freePort(),null,A1.dir);hz=(await req(A2.port,"GET","/healthz")).json||{};
  ok(hz.freshDb===false&&hz.boots===2&&hz.dbSince===since&&!/NOTICE: started from an empty database/.test(A2.log()),"a restart on the same data: freshDb false, boots 2, same dbSince, no 'empty database' notice",J(hz));
  await stopApp(A2);
  const A3=await startApp(await freePort(),{SAWYER_PERSISTENT:"1"});hz=(await req(A3.port,"GET","/healthz")).json||{};
  ok(hz.persistent===true&&!/WARNING: data is NOT persistent/.test(A3.log())&&stateOf(await req(A3.port,"GET","/api/state")).beta34.persistent===true,"with a disk (SAWYER_PERSISTENT=1): persistent true, no warning",J(hz));
  await stopApp(A3);
  // DATA_DIR must be writable: a clear message, not a stack trace
  {const blocker=path.join(os.tmpdir(),"sawyer-v34-file-"+run);fs.writeFileSync(blocker,"not a folder");const badDir=blocker+"/data";
   const bad=spawn(process.execPath,[path.join(ROOT,"server.js")],{env:Object.assign({},process.env,{HOST:"127.0.0.1",PORT:String(await freePort()),DATA_DIR:badDir}),stdio:["ignore","pipe","pipe"]});let o="";bad.stdout.on("data",d=>o+=d);bad.stderr.on("data",d=>o+=d);
   const code=await new Promise(r=>{bad.on("exit",r);setTimeout(()=>{try{bad.kill("SIGKILL")}catch(e){}},8000)});
   ok(code===1&&o.includes("FATAL: DATA_DIR="+badDir+" is not writable")&&/attach the persistent disk/.test(o)&&!/\n\s+at /.test(o),"an unwritable DATA_DIR stops the server with a clear FATAL line (no stack trace)",code+" "+o.slice(0,300));fs.rmSync(blocker,{force:true})}
  // relative DATA_DIR resolves next to server.js
  {const rel="data-v34-"+run,abs=path.join(ROOT,rel);const A4=await startApp(await freePort(),{DATA_DIR:"./"+rel},abs);ok(fs.existsSync(path.join(abs,"sawyer.db"))&&new RegExp("data: "+abs.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).test(A4.log()),"DATA_DIR=./data style paths resolve next to server.js",A4.log().slice(0,200));await stopApp(A4)}
  // render.yaml: disk block ready but commented; plan unchanged; README steps
  const ry=fs.readFileSync(path.join(ROOT,"render.yaml"),"utf8"),rd=fs.readFileSync(path.join(ROOT,"README.md"),"utf8");
  ok(/^\s+plan: free$/m.test(ry)&&/^\s+# disk:$/m.test(ry)&&/^\s+#\s+mountPath: \/data$/m.test(ry)&&/^\s+#\s+sizeGB: 1$/m.test(ry)&&!/^\s+disk:/m.test(ry),"render.yaml: plan still free, disk block (/data, 1 GB) written out but commented");
  ok(/VAPID_PRIVATE_KEY/.test(ry)&&!/^\s+- key: VAPID/m.test(ry),"render.yaml documents the VAPID env keys (commented)");
  ok(/## Keep data between deploys/.test(rd)&&/mount path \*\*`\/data`\*\*/.test(rd)&&/`DATA_DIR=\/data`/.test(rd)&&/"persistent": true/.test(rd)&&/tools\/vapid-keys\.js/.test(rd),"README has the exact disk steps, the healthz check and the VAPID key steps");
 }

 // ===== 3. "This beta resets" note while the data isn't persistent =====
 {const NOTE="This beta resets from time to time — don't store real jobs here yet.";
  const BH=await signupHo("beta");
  const look=async(p)=>p.evaluate(()=>{const e=document.getElementById("v34beta");if(!e)return null;const r=e.getBoundingClientRect(),cs=getComputedStyle(e);return{t:e.textContent.trim(),role:e.getAttribute("role"),l:Math.round(r.left),r:Math.round(r.right),h:Math.round(r.height),c:cs.color,bg:cs.backgroundColor,ff:cs.fontFamily,ow:document.documentElement.scrollWidth>innerWidth+1}});
  for(const w of [390,1440]){
   {const p=await page(w);await p.goto(LOCAL.B+"/signup",{waitUntil:"networkidle"});await p.waitForSelector("#v34beta",{timeout:8000}).catch(()=>{});const n=await look(p);
    ok(n&&n.t===NOTE&&n.role==="note"&&n.l>=0&&n.r<=w&&!n.ow&&/Plus Jakarta Sans/.test(n.ff)&&n.c==="rgb(15, 42, 68)",w+" sign-up shows the plain beta note (navy on linen, Plus Jakarta Sans, fits)",J(n));
    const inBox=await p.evaluate(()=>!!document.querySelector("#authBox #v34beta"));ok(inBox,w+" …inside the sign-in card");
    if(w===390){await sleep(500);await p.screenshot({path:path.join(SH,"v34-beta-signup-390.png")}).catch(()=>{})}
    await p.goto(LOCAL.B+"/join",{waitUntil:"networkidle"});await p.waitForSelector("#v34beta",{timeout:8000}).catch(()=>{});const j=await look(p);ok(j&&j.t===NOTE&&j.r<=w&&!j.ow,w+" the pro sign-up wizard (step 1) shows it too",J(j));await p.context().close()}
   {const p=await page(w,BH.ck);await p.goto(LOCAL.B+"/account",{waitUntil:"networkidle"});await p.waitForSelector("#v34beta",{timeout:8000}).catch(()=>{});const n=await look(p);ok(n&&n.t===NOTE&&n.r<=w&&!n.ow,w+" Account shows it under the page title",J(n));
    if(w===1440){await sleep(500);await p.screenshot({path:path.join(SH,"v34-beta-account-1440.png")}).catch(()=>{})}
    await p.goto(LOCAL.B+"/",{waitUntil:"networkidle"});ok(!(await p.$("#v34beta")),w+" not on the home page (betabar stays as it was)");await p.context().close()}}
  // with a disk the note is gone
  const D=await startApp(await freePort(),{SAWYER_PERSISTENT:"1"});
  {const c=await br.newContext({viewport:{width:390,height:844}});const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));await p.goto(D.B+"/signup",{waitUntil:"networkidle"});await p.waitForSelector("#authBox",{timeout:8000}).catch(()=>{});
   ok(!(await p.$("#v34beta"))&&!!(await p.$("#authBox")),"with persistent storage the note is not shown");await c.close()}
  await stopApp(D)}

 // ===== 4. "Export my data" on the delete screen =====
 {const unzip=buf=>{const out={};let i=0;while(i+30<=buf.length&&buf.readUInt32LE(i)===0x04034b50){const n=buf.readUInt16LE(i+26),x=buf.readUInt16LE(i+28),sz=buf.readUInt32LE(i+18),crc=buf.readUInt32LE(i+14);const name=buf.subarray(i+30,i+30+n).toString("utf8");out[name]={data:buf.subarray(i+30+n+x,i+30+n+x+sz),crc};i+=30+n+x+sz}return out};
  const EP=await signupPro("export");ok(!!EP.ck,"a throwaway pro signs up for the export test");
  ok((await act(P(),EP.ck,"addLedger",[{kind:"exp",amt:12.34,cat:"Materials",vendor:'=HYPERLINK("http://evil.example","x")',date:"2026-11-14"}])).res.ok,"…logs an Office receipt whose vendor looks like a formula");
  const EH=await signupHo("exporth");{const r=await act(P(),EH.ck,"send",[EP.id,"+1 call me about the drain "+run]);ok(r.res.ok!==false,"…and a homeowner messages them",J(r.res))}
  for(const w of [390,1440]){const p=await page(w,EP.ck);await p.goto(LOCAL.B+"/account",{waitUntil:"networkidle"});await p.waitForSelector("#delGo",{timeout:8000});await p.click("#delGo");await p.waitForSelector("#v34ex",{timeout:8000}).catch(()=>{});
   const o=await p.evaluate(()=>{const e=document.getElementById("v34ex"),z=document.getElementById("v34zip"),j=document.getElementById("v34json"),f=document.getElementById("delTxt");if(!e)return null;const r=z.getBoundingClientRect(),box=document.querySelector("#modal .mbox").getBoundingClientRect();
    return{t:e.innerText.replace(/\s+/g," "),zh:Math.round(r.height),zr:Math.round(r.right),jh:j.getAttribute("href"),jd:j.hasAttribute("download"),before:!!(f&&(e.compareDocumentPosition(f)&Node.DOCUMENT_POSITION_FOLLOWING)),box:[Math.round(box.left),Math.round(box.right)],ow:document.documentElement.scrollWidth>innerWidth+1}});
   ok(o&&/Take a copy first/.test(o.t)&&/Export my data \(ZIP\)/.test(o.t)&&/and your Office records/.test(o.t)&&o.zh>=44&&o.zr<=w&&o.jh==="/api/account/export"&&o.jd&&o.before&&o.box[0]>=0&&o.box[1]<=w&&!o.ow,w+" the delete dialog offers 'Export my data (ZIP)' and 'JSON only' above the DELETE box (44px+ button, fits)",J(o));
   if(w===390){await sleep(500);await p.screenshot({path:path.join(SH,"v34-export-delete-390.png")}).catch(()=>{});
    const [dl]=await Promise.all([p.waitForEvent("download",{timeout:15000}),p.click("#v34zip")]);const fp=path.join(os.tmpdir(),"v34-export-"+run+".zip");await dl.saveAs(fp);const buf=fs.readFileSync(fp);fs.rmSync(fp,{force:true});
    ok(/^sawyer-data-\d{4}-\d\d-\d\d\.zip$/.test(dl.suggestedFilename()),"the download is sawyer-data-<date>.zip",dl.suggestedFilename());
    const z=unzip(buf),names=Object.keys(z);
    ok(["sawyer-data.json","README.txt","jobs.csv","quotes.csv","messages.csv","reviews.csv","office/expenses.csv","office/customers.csv","office/README.txt"].every(n=>names.includes(n)),"the ZIP has the full JSON, a README, jobs/quotes/messages/reviews CSVs and the Office backup files",J(names));
    const crcOk=names.every(n=>{const t=new Uint32Array(256);for(let k=0;k<256;k++){let c=k;for(let q=0;q<8;q++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[k]=c>>>0}let c=0xFFFFFFFF;for(const b of z[n].data)c=t[(c^b)&255]^(c>>>8);return((c^0xFFFFFFFF)>>>0)===z[n].crc});ok(crcOk,"every file in the ZIP passes its CRC (a valid archive)");
    const js=JSON.parse(z["sawyer-data.json"].data.toString("utf8"));ok(js.account&&js.account.id===EP.id&&js.profile&&js.profile.id===EP.id&&(js.ledger||[]).length===1,"sawyer-data.json is this account's export (account, profile, the receipt)",J(js.account));
    const all=names.map(n=>z[n].data.toString("utf8")).join("\n");ok(!/"(hash|salt|token|sess)"\s*:/.test(all)&&!all.includes("v34-correct-horse"),"no password hash, salt, session or password anywhere in the ZIP");
    const msg=z["messages.csv"].data.toString("utf8");ok(msg.includes("'+1 call me about the drain "+run)&&msg.includes("Hana exporth")&&/,You,/.test(msg),"messages.csv: a message starting with + is formula-safe (leading ') and shows who sent it to whom",msg.slice(0,300));
    const ex=z["office/expenses.csv"].data.toString("utf8");ok(ex.includes("'=HYPERLINK")&&ex.includes("12.34"),"office/expenses.csv reuses the formula-safe Office backup (leading ', cents kept)",ex.slice(0,200));
    const st=await p.$eval("#v34exs",e=>e.textContent);ok(/Downloaded sawyer-data-/.test(st),"the dialog confirms the download",st);
    // the delete still works after exporting
    await p.fill("#delTxt","DELETE");await p.click("#delYes");await sleep(1500);const lg=await req(P(),"POST","/api/login",JH,J({email:"v34-export-"+run+"@example.com",password:"v34-correct-horse"}));ok(lg.status===401,"after exporting, typing DELETE still deletes the account",lg.status)}
   await p.context().close();if(w===390)break}
  // 1440 look with another account (the first was deleted above)
  {const E2=await signupHo("export2");const p=await page(1440,E2.ck);await p.goto(LOCAL.B+"/account",{waitUntil:"networkidle"});await p.waitForSelector("#delGo");await p.click("#delGo");await p.waitForSelector("#v34ex",{timeout:8000}).catch(()=>{});
   const o=await p.evaluate(()=>{const e=document.getElementById("v34ex");return e?{t:e.innerText.replace(/\s+/g," "),ow:document.documentElement.scrollWidth>innerWidth+1}:null});ok(o&&/Export my data \(ZIP\)/.test(o.t)&&!/Office records/.test(o.t)&&!o.ow,"1440 a homeowner sees it too (no Office mention without Office records)",J(o));
   await sleep(500);await p.screenshot({path:path.join(SH,"v34-export-delete-1440.png")}).catch(()=>{});
   const r=await req(P(),"GET","/api/account/export",{Cookie:E2.ck});ok(r.status===200&&/attachment; filename="sawyer-data-/.test(r.headers["content-disposition"]||"")&&r.json&&r.json.account.id===E2.id,"'JSON only' downloads this account's JSON export");await p.context().close()}
  // demo accounts can't be deleted, so there is nothing to export first
  {const dm=await login(P(),"demo-homeowner@sawyer.test");const p=await page(390,dm.ck);await p.goto(LOCAL.B+"/account",{waitUntil:"networkidle"});await p.waitForSelector("#delGo");await p.click("#delGo");await sleep(500);ok(!(await p.$("#v34ex")),"the demo account's dialog (can't delete) doesn't offer the export");await p.context().close()}
  ok((await req(P(),"GET","/api/account/export")).status===401,"signed out, the export is 401")}
// @@NEXT@@
 ok(errs.length===0,"no page errors",J(errs.slice(0,5)));
}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL)}
 console.log(failed?"FAIL v34-e2e: "+failed+" failed":"PASS v34-e2e: all checks passed");process.exit(failed?1:0)})();
