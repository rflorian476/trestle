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
}catch(e){failed++;console.log("FAIL crashed: "+(e&&e.stack||e))}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL);try{PS&&PS.srv.close()}catch(e){}
 console.log(failed?"\n"+failed+" FAILED":"\nALL PASS");process.exit(failed?1:0)}})();
