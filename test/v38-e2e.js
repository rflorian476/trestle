"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib"),crypto=require("crypto");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra,keepDir){
 const dir=keepDir||fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v38-"));
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
const iso=d=>d.toISOString().slice(0,10);
const bizToday=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Detroit",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const addD=(s,n)=>{const d=new Date(s+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return iso(d)};
function device(){const e=crypto.createECDH("prime256v1");e.generateKeys();return{keys:{p256dh:e.getPublicKey().toString("base64url"),auth:crypto.randomBytes(16).toString("base64url")}}}
function pushService(){const got=[];const srv=http.createServer((rq,rs)=>{const ch=[];rq.on("data",c=>ch.push(c));rq.on("end",()=>{got.push({path:rq.url,headers:rq.headers});rs.writeHead(201);rs.end()})});
 return new Promise(res=>srv.listen(0,"127.0.0.1",()=>res({srv,got,origin:"http://127.0.0.1:"+srv.address().port})))}
let AXE="";try{AXE=fs.readFileSync(require.resolve("axe-core/axe.min.js"),"utf8")}catch(e){}
let LOCAL=null,br=null,PS=null;
(async()=>{try{
 PS=await pushService();
 LOCAL=await startApp(await freePort(),{PUSH_TEST_ORIGIN:PS.origin,PUSH_RETRY_MS:"150"});const P=()=>LOCAL.port;
 const hz=(await req(P(),"GET","/healthz")).json||{};ok(hz.v==="2.21.0-sawyer","healthz reports 2.21.0-sawyer",J(hz));
 {const sw=await req(P(),"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v38"/.test(sw.body),"service worker cache is sawyer-v38 (client assets changed)")}
 const run=Math.random().toString(36).slice(2,8);
 const signupPro=async(tag,trade,zip)=>{const r=await req(P(),"POST","/api/signup",JH,J({kind:"pro",password:"v38-correct-horse",data:{name:"Vee "+tag,biz:"V38 "+tag+" "+run,email:"v38-"+tag+"-"+run+"@example.com",trade:trade||"Plumbing",zip:zip||"78704",phone:"5125550100",plan:"founding"}}));return{ck:sigCk(r),id:stateOf(r).me,email:"v38-"+tag+"-"+run+"@example.com"}};
 const signupHo=async(tag,zip)=>{const r=await req(P(),"POST","/api/signup",JH,J({kind:"customer",password:"v38-correct-horse",data:{name:"Hana "+tag+" Reyes",email:"v38-ho-"+tag+"-"+run+"@example.com",zip:zip||"78704"}}));return{ck:sigCk(r),id:stateOf(r).me,email:"v38-ho-"+tag+"-"+run+"@example.com"}};
 const pub=async()=>stateOf(await req(P(),"GET","/api/state"));
 const stateFor=async ck=>stateOf(await req(P(),"GET","/api/state",{Cookie:ck}));
 const meOf=st=>(st.users||[]).find(u=>u.id===st.me)||{};
 const up=async(ck,file)=>{const buf=fs.readFileSync(path.join(ROOT,file));const r=await req(P(),"POST","/api/upload",{Cookie:ck,"Content-Type":"image/webp","Content-Length":buf.length},buf);return r.json&&r.json.url};
 const today=bizToday();

 // ===== 1. SW-088: a hired job leaves the catalog when the last party deletes their account =====
 const delAcct=ck=>post(P(),ck,"/api/account/delete",{confirm:"DELETE"});
 const counts=s=>({users:(s.users||[]).length,jobs:(s.jobs||[]).length,quotes:(s.quotes||[]).length,reviews:(s.reviews||[]).length,projects:(s.projects||[]).length,tcalls:(s.tcalls||[]).length});
 const SEED=counts(await pub());ok(SEED.jobs>0&&SEED.users>0,"SW-088 baseline: signed-out counts",J(SEED));
 const SUBS={quality:5,communication:5,timeliness:4,value:5};
 const hiredJob=async(tag,ho,pro,opts)=>{let r=await act(P(),ho.ck,"postJob",[{title:"V38 "+tag+" water heater swap "+run,cat:"Plumbing",sub:"Water heaters",desc:"40 gal, garage. Private: gate 7781.",zip:"78704",budget:"$1,200–1,800",when:"This week"}]);const id=r.res.id;
  r=await act(P(),pro.ck,"quote",[id,1450,"Can do Thursday"]);ok(r.res.ok,"SW-088 "+tag+": the pro quotes",J(r.res));
  r=await act(P(),ho.ck,"hire",[id,pro.id]);ok(r.res.ok,"SW-088 "+tag+": the homeowner hires",J(r.res));
  if(!opts||!opts.live){r=await act(P(),ho.ck,"complete",[id]);ok(r.res.ok!==false,"SW-088 "+tag+": the job is marked complete",J(r.res))}
  if(opts&&opts.review){r=await act(P(),ho.ck,"review",[id,SUBS,"Fast, tidy and the price held. Would hire again."]);ok(r.res.ok!==false,"SW-088 "+tag+": the homeowner reviews the job",J(r.res))}
  return id};
 let JOB088=null;
 {// (a) homeowner deletes first, then the pro
  const ho=await signupHo("d88a"),pro=await signupPro("d88a");const id=await hiredJob("a",ho,pro,{review:true});JOB088=id;
  let s=await pub();ok((s.jobs||[]).some(j=>j.id===id),"SW-088 a: the completed job is public while its parties have accounts");
  let r=await delAcct(ho.ck);ok(r.status===200,"SW-088 a: the homeowner deletes their account",r.status);
  const ps=await stateFor(pro.ck);ok((ps.jobs||[]).some(j=>j.id===id)&&(ps.quotes||[]).some(q=>q.job===id),"SW-088 a: with the pro still here, the job and quote stay for the pro's records");
  ok((ps.reviews||[]).some(x=>x.job===id),"SW-088 a: the review written on it stays on the pro's profile");
  r=await delAcct(pro.ck);ok(r.status===200,"SW-088 a: then the hired pro deletes theirs",r.status);
  s=await pub();ok(!(s.jobs||[]).some(j=>j.id===id),"SW-088 a: the job is gone from signed-out /api/state",J((s.jobs||[]).filter(j=>j.id===id)));
  ok(!(s.quotes||[]).some(q=>q.job===id),"SW-088 a: its accepted quote is gone too");
  ok(!(s.reviews||[]).some(x=>x.job===id),"SW-088 a: so is the review written on it");
  const hp=await req(P(),"GET","/job/"+id);ok(!new RegExp("V38 a water heater swap "+run).test(hp.body),"SW-088 a: the /job/<id> HTML no longer carries the title",hp.status)}
 {// (b) the pro deletes first, then the homeowner
  const ho=await signupHo("d88b"),pro=await signupPro("d88b");const id=await hiredJob("b",ho,pro);
  let r=await delAcct(pro.ck);ok(r.status===200,"SW-088 b: the hired pro deletes first",r.status);
  const hs=await stateFor(ho.ck);ok((hs.jobs||[]).some(j=>j.id===id),"SW-088 b: the homeowner still has the job (My home history)");
  r=await delAcct(ho.ck);ok(r.status===200,"SW-088 b: then the homeowner deletes",r.status);
  const s=await pub();ok(!(s.jobs||[]).some(j=>j.id===id)&&!(s.quotes||[]).some(q=>q.job===id),"SW-088 b: job and quote leave signed-out state")}
 {// (c) an active hired job still blocks deletion (escrow), and nothing is removed
  const ho=await signupHo("d88c"),pro=await signupPro("d88c");const id=await hiredJob("c",ho,pro,{live:true});
  let r=await delAcct(ho.ck);ok(r.status===400,"SW-088 c: a homeowner with an active hire can't delete yet",r.status);
  const s=await pub();ok((s.jobs||[]).some(j=>j.id===id),"SW-088 c: the active job is untouched");
  r=await act(P(),ho.ck,"complete",[id]);r=await delAcct(ho.ck);r=await delAcct(pro.ck);ok(r.status===200,"SW-088 c: once finished both can delete",r.status)}
 {const s=await pub(),now=counts(s);ok(J(now)===J(SEED),"SW-088: public counts are back to the seed (users, jobs, quotes, reviews, projects, calls)",J({now,SEED}))}
 // boot tidy: a completed job whose parties were both deleted before v38 (the live jtcksnex shape, simulated in a kept data dir)
 {const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v38-boot-"));let S=await startApp(await freePort(),null,dir);const pp=S.port;
  const sg=async(kind,data)=>{const r=await req(pp,"POST","/api/signup",JH,J({kind,password:"v38-correct-horse",data}));return{ck:sigCk(r),id:stateOf(r).me}};
  const a=async(ck,name,args)=>((await req(pp,"POST","/api/act",Object.assign({Cookie:ck},JH),J({name,args}))).json||{}).res||{};
  const ho=await sg("customer",{name:"Old Owner",email:"v38-oldho-"+run+"@example.com",zip:"78704"}),pro=await sg("pro",{name:"Old Pro",biz:"V38 old "+run,email:"v38-oldpro-"+run+"@example.com",trade:"Plumbing",zip:"78704",phone:"5125550100",plan:"founding"});
  const jid=(await a(ho.ck,"postJob",[{title:"V38 orphan "+run,cat:"Plumbing",sub:"Water heaters",desc:"x",zip:"78704",budget:"$900",when:"This week"}])).id;
  await a(pro.ck,"quote",[jid,900,"ok"]);await a(ho.ck,"hire",[jid,pro.id]);await a(ho.ck,"complete",[jid]);await stopApp(S,true);
  const {DatabaseSync}=require("node:sqlite");const dbf=fs.readdirSync(dir).find(f=>/\.db$/.test(f));const db=new DatabaseSync(path.join(dir,dbf));
  const row=db.prepare("SELECT v FROM appdata WHERE k='users'").get();const us=JSON.parse(row.v);for(const oid of [ho.id,pro.id]){const u=us.find(x=>x.id===oid);for(const k of Object.keys(u))if(k!=="id")delete u[k];Object.assign(u,{name:"Former Sawyer member",role:"deleted",email:""})}
  db.prepare("UPDATE appdata SET v=? WHERE k='users'").run(JSON.stringify(us));db.close();
  S=await startApp(await freePort(),null,dir);const ps=stateOf(await req(S.port,"GET","/api/state"));
  ok(jid&&!(ps.jobs||[]).some(j=>j.id===jid)&&!(ps.quotes||[]).some(q=>q.job===jid)&&/SW-088: removed 1 /.test(S.log()),"SW-088 boot tidy: a finished job whose parties were deleted before v38 is removed at start",J({jid,log:S.log().slice(-300)}));
  ok((ps.jobs||[]).length===SEED.jobs,"SW-088 boot tidy: seed/demo jobs are untouched",(ps.jobs||[]).length);await stopApp(S)}

const V38N=8;
 // ===== 2. Appointment times in the customer's zone =====
 const pro=await signupPro("tz","Plumbing","30307"),ho=await signupHo("tz","78704");
 let r=await act(P(),ho.ck,"postJob",[{title:"V38 water heater swap "+run,cat:"Plumbing",sub:"Water heaters",desc:"40 gal, garage.",zip:"78704",budget:"$1,200–1,800",when:"This week"}]);const JID=r.res.id;ok(r.res.ok&&JID,"tz setup: an Austin (Central) homeowner posts a job; an Atlanta (Eastern) pro quotes",J(r.res));
 r=await act(P(),pro.ck,"quote",[JID,1450,"Can do Thursday"]);r=await act(P(),ho.ck,"hire",[JID,pro.id]);ok(r.res.ok,"tz setup: hired",J(r.res));
 r=await act(P(),pro.ck,"custFromJob",[JID]);const CID=r.res.id;
 const D1=addD(today,3);
 r=await act(P(),pro.ck,"saveVisit",[{cust:CID,title:"Water heater install",date:D1,start:"08:00",hrs:"3",win:"120",job:JID}]);const VID=r.res.id;
 let v=(r.st.visits||[]).find(x=>x.id===VID);ok(r.res.ok&&v&&v.tz38==="America/New_York"&&v.ctz38==="America/Chicago","the visit remembers the pro's zone (Eastern, from 30307) and the customer's (Central, from 78704)",J(v&&{tz:v.tz38,c:v.ctz38}));
 let hs=await stateFor(ho.ck);let n=(hs.notifs||[]).find(x=>x.link==="visit:"+VID);
 ok(n&&/arrive 7–9am CT/.test(n.text),"the customer's notice shows the window on their clock with a label (8–10am ET -> 7–9am CT)",n&&n.text);
 // Phoenix customer (no DST): Central 08:00 is 07:00 MST in winter, 06:00 MST in summer
 // the customer picks a zone by hand
 r=await act(P(),ho.ck,"setTz38",["America/Los_Angeles"]);ok(r.res.ok&&/Pacific/.test(r.res.msg),"the customer can pick their zone (Pacific)",J(r.res));
 hs=await stateFor(ho.ck);ok(meOf(hs).tz38==="America/Los_Angeles"&&(hs.visits||[]).find(x=>x.id===VID).ctz38==="America/Los_Angeles","their visits follow the new zone",J(meOf(hs).tz38));
 r=await act(P(),ho.ck,"setTz38",["Mars/Olympus"]);ok(r.res.ok===false,"a zone that isn't listed is refused",J(r.res));
 {const ps=await pub();ok(!(ps.users||[]).some(u=>u.tz38),"signed out: no one's time zone choice is public")}
 r=await act(P(),ho.ck,"setTz38",[""]);ok(r.res.ok&&!meOf(r.st).tz38,"Automatic goes back to the ZIP's zone",J(r.res));
 // moving the visit: the pro's own move notice is converted too
 r=await act(P(),pro.ck,"saveVisit",[{id:VID,cust:CID,title:"Water heater install",date:D1,start:"13:00",hrs:"3",win:"60",job:JID}]);
 hs=await stateFor(ho.ck);n=(hs.notifs||[]).filter(x=>x.link==="visit:"+VID).sort((a,b)=>b.date-a.date)[0];ok(n&&/moved/.test(n.text)&&/arrive 12–1pm CT/.test(n.text),"a moved visit's notice is on the customer's clock (1–2pm ET -> 12–1pm CT)",n&&n.text);
 // the customer offers times on their clock (sent converted): 10:00 ET is 09:00 CT for the pro
 const D2=addD(today,5);
 r=await act(P(),ho.ck,"visitAsk37",[VID,[{date:D2,start:"09:00"}],""]);ok(r.res.ok,"ask 1 (times converted by the app before sending)",J(r.res));
 r=await act(P(),pro.ck,"visitPick37",[VID,0]);hs=await stateFor(ho.ck);n=(hs.notifs||[]).filter(x=>x.link==="visit:"+VID).sort((a,b)=>b.date-a.date)[0];
 ok(r.res.ok&&n&&/ CT\b/.test(n.text)&&/a time you offered/.test(n.text),"the pick notice is on the customer's clock too",n&&n.text);

 // ===== 3. The 6-request limit says so =====
 for(let i=2;i<=6;i++){r=await act(P(),ho.ck,"visitAsk37",[VID,[{date:addD(today,6+i),start:"10:00"}],""]);ok(r.res.ok,"ask "+i+" accepted",J(r.res));
  if(i===5)ok(/1 reschedule request left/.test(r.res.msg),"ask 5 says 1 request is left",r.res.msg);if(i===6)ok(/last reschedule request/.test(r.res.msg),"ask 6 says it was the last one",r.res.msg)}
 r=await act(P(),ho.ck,"visitAsk37",[VID,[{date:addD(today,20),start:"10:00"}],""]);ok(r.res.ok===false&&/used all 6 reschedule requests/.test(r.res.msg)&&/Message V38 tz/.test(r.res.msg),"the 7th ask names the 6-request limit and who to message",r.res.msg);
 r=await act(P(),ho.ck,"visitAsk37",[VID,[{date:addD(today,20),start:"10:00"},{date:addD(today,21),start:"10:00"},{date:addD(today,22),start:"10:00"},{date:addD(today,23),start:"10:00"}],""]);ok(r.res.ok===false,"still refused at the limit",r.res.msg);
 {const p2=await signupPro("tz2"),h2=await signupHo("tz2");const j=(await act(P(),h2.ck,"postJob",[{title:"V38 limit "+run,cat:"Plumbing",sub:"Water heaters",desc:"x",zip:"78704",budget:"$900",when:"This week"}])).res.id;await act(P(),p2.ck,"quote",[j,900,"ok"]);await act(P(),h2.ck,"hire",[j,p2.id]);
  const c=(await act(P(),p2.ck,"custFromJob",[j])).res.id;const vid=(await act(P(),p2.ck,"saveVisit",[{cust:c,title:"Check",date:addD(today,4),start:"09:00",hrs:"1",win:"0",job:j}])).res.id;
  r=await act(P(),h2.ck,"visitAsk37",[vid,[1,2,3,4].map(i=>({date:addD(today,6+i),start:"10:00"})),""]);ok(r.res.ok===false&&r.res.msg==="Offer up to 3 times per request.","4 times in one request: 'Offer up to 3 times per request.'",r.res.msg);
  global.LIM={p2,h2,j,vid}}

 // ===== 5. In the browser =====
 const SH=process.argv[2]||os.tmpdir();const SHOTS=process.env.V38_SHOTS||"";br=await chromium.launch();const errs=[];
 const page=async(w,cookie)=>{const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900},acceptDownloads:true,bypassCSP:true,hasTouch:w<500});
  if(cookie){const [k,v]=cookie.split("=");await c.addCookies([{name:k,value:v,url:LOCAL.B}])}
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return{c,p}};
 const go=async(p,u)=>{await p.goto(LOCAL.B+u,{waitUntil:"networkidle"});await p.waitForTimeout(300)};
 const shot=async(p,name,opt)=>{await p.screenshot(Object.assign({path:path.join(SH,name)},opt||{}));if(SHOTS)await p.screenshot(Object.assign({path:path.join(SHOTS,name)},opt||{}))};
 const noOverflow=async(p,lbl)=>{const ov=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);ok(ov<=0,lbl+": no sideways scroll",ov)};
 // SW-088: the removed job is the app's Not found page
 {const {c,p}=await page(1440);await go(p,"/job/"+JOB088);const t=await p.locator("main").innerText();ok(/not found|doesn.t exist|no longer/i.test(t)&&!/water heater swap/i.test(t),"SW-088: signed-out /job/<removed id> shows Not found",t.slice(0,160));await c.close()}
 // /myhome signed out: prerendered sign-in card, no synchronous XHR, sign-in methods in the page
 {const {c,p}=await page(390);await p.addInitScript(()=>{window.__SYNC=[];const o=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u,a){if(a===false)window.__SYNC.push(String(u));return o.apply(this,arguments)}});
  const raw=await req(P(),"GET","/myhome");ok(/<div id="pre11">/.test(raw.body)&&/<h1/.test(raw.body),"signed-out /myhome arrives prerendered (sign-in card in the first HTML)");
  ok(/window\.__AUTHM=\{/.test(raw.body)&&!/re_[A-Za-z0-9]{6,}|secret|token|password/i.test((raw.body.match(/window\.__AUTHM=([^<]*)/)||[])[1]||""),"the page carries the sign-in methods (no secrets)");
  const csp=String(raw.headers["content-security-policy"]||"");ok(/script-src 'self' 'sha256-/.test(csp)&&!/unsafe-inline'[^;]*script|script-src[^;]*unsafe-inline/.test(csp),"CSP still hashes inline scripts (no unsafe-inline scripts)");
  await go(p,"/myhome");const sync=await p.evaluate(()=>window.__SYNC);ok(Array.isArray(sync)&&!sync.some(u=>/auth\/methods/.test(u)),"no synchronous XHR for the sign-in methods",J(sync));
  ok(await p.locator("main h1").count()===1,"one h1 on the sign-in page");await noOverflow(p,"390 /myhome signed out");await c.close()}
 // appointment card on the customer's clock + Change zone + the limit
 for(const w of [390,1440]){const {c,p}=await page(w,ho.ck);await go(p,"/job/"+JID);
  const card=p.locator(".v37ap").first();ok(await card.count()>0,w+": the customer's Appointment card shows");const ct=await card.innerText();
  ok(/ CT\b/.test(ct)&&/Central time \(CT\)/.test(ct)&&/on Eastern time/.test(ct),w+": the card is on the customer's clock with a zone label, and says the pro is on Eastern",ct.slice(0,900));
  ok(/used all 6 reschedule requests/.test(ct)&&await card.locator("[data-v37ask]").count()===0,w+": at the limit the card says so and has no Ask to reschedule button");
  await noOverflow(p,w+" job page with the zone line");
  if(w===390)await shot(p,"v38-appointment-zone-390.png",{fullPage:false,clip:await card.boundingBox().then(b=>({x:0,y:Math.max(0,b.y-10),width:390,height:Math.min(700,b.height+20)}))}).catch(async()=>{await card.scrollIntoViewIfNeeded();await shot(p,"v38-appointment-zone-390.png")});
  if(w===1440){await p.click("[data-v38tz]");await p.waitForSelector("#v38tzs");ok(await p.locator("#v38tzs option").count()===V38N+1,"Change opens the zone picker (Automatic + "+V38N+" zones)");
   await p.selectOption("#v38tzs","America/Denver");await p.click("#v38tzf .btn.primary");await p.waitForTimeout(400);const t2=await p.locator(".v37ap").first().innerText();ok(/MT\b/.test(t2)&&/Mountain time/.test(t2),"picking Mountain re-renders the card on that clock",t2.slice(0,200));
   await act(P(),ho.ck,"setTz38",[""])}
  await c.close()}
 // the reschedule sheet: requests left and the customer's zone, inputs converted on send
 {const {p2,h2,j,vid}=global.LIM;await act(P(),h2.ck,"visitAsk37",[vid,[{date:addD(today,8),start:"10:00"}],""]);for(let i=0;i<3;i++)await act(P(),h2.ck,"visitAsk37",[vid,[{date:addD(today,9+i),start:"10:00"}],""]);
  const {c,p}=await page(390,h2.ck);await go(p,"/job/"+j);await p.click("[data-v37ask]");await p.waitForSelector("#v37as");const t=await p.locator("#v37as").innerText();
  ok(/2 of 6\s*requests left/.test(t)&&/Central time \(CT\)/.test(t),"the sheet says 2 of 6 requests left and which clock the times are on",t.slice(0,300));
  await p.waitForTimeout(700);await shot(p,"v38-reschedule-left-390.png");await p.keyboard.press("Escape");await c.close()}
 // the "and N more" expander is a disclosure
 {const {p2,h2,j}=global.LIM;const cc=(await act(P(),p2.ck,"custFromJob",[j])).res.id;for(let i=0;i<4;i++){const vv=(await act(P(),p2.ck,"saveVisit",[{cust:cc,title:"Visit "+i,date:addD(today,10+i),start:"09:00",hrs:"1",win:"0",job:j}])).res.id;await act(P(),h2.ck,"visitConfirm37",[vv])}
  for(const w of [390,1440]){const {c,p}=await page(w,h2.ck);await go(p,"/job/"+j);const more=p.locator("#v37more");ok(await more.count()===1,w+": 'and N more' shows");
   ok(await more.getAttribute("aria-expanded")==="false"&&await more.getAttribute("aria-controls")==="v37aps"&&await p.locator("#v37aps").count()===1,w+": it has aria-expanded=false and aria-controls the visit list");
   await more.focus();await p.keyboard.press("Enter");await p.waitForTimeout(400);const less=p.locator("#v38less");
   ok(await less.count()===1&&await less.getAttribute("aria-expanded")==="true",w+": expanded, 'Show fewer visits' has aria-expanded=true");
   ok(await p.evaluate(()=>document.activeElement&&document.activeElement.id)==="v38less",w+": focus moves to the collapse button");
   const n1=await p.locator(".v37ap").count();if(w===1440){await p.locator("#v37aps").evaluate(e=>e.scrollIntoView({block:"start"}));await p.evaluate(()=>scrollBy(0,-90));await p.waitForTimeout(200);await shot(p,"v38-visits-expander-1440.png",{fullPage:false})}
   await less.click();await p.waitForTimeout(400);ok(await p.locator("#v37more").count()===1&&await p.locator(".v37ap").count()<n1,w+": Show fewer collapses the list again");
   ok(await p.evaluate(()=>document.activeElement&&document.activeElement.id)==="v37more",w+": focus returns to the expander");
   if(AXE){await p.addScriptTag({content:AXE});const ax=await p.evaluate(async()=>{const r=await axe.run(document.querySelector(".v37aps")||document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa"]}});return r.violations.filter(v=>v.impact==="serious"||v.impact==="critical").map(v=>v.id)});ok(!ax.length,w+": no serious axe issues on the visit list",J(ax))}
   await c.close()}}
 // pro side: the customer's clock in the visit sheet
 {const {c,p}=await page(1440,pro.ck);await go(p,"/schedule?v="+encodeURIComponent(VID));await p.waitForTimeout(500);const t=await p.locator("#modal").innerText().catch(()=>"");
  ok(/Your times are ET/.test(t)&&/sees/.test(t)&&/ CT\b/.test(t),"the pro's visit sheet shows the customer's clock when the zones differ",t.slice(0,300));await c.close()}
 ok(!errs.length,"no page errors",errs.join(" | "));
}catch(e){failed++;console.log("FAIL crashed: "+(e&&e.stack||e))}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL);try{PS&&PS.srv.close()}catch(e){}
 console.log(failed?"\n"+failed+" FAILED":"\nALL PASS");process.exit(failed?1:0)}})();
