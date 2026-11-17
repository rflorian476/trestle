// v43 end-to-end. Self-contained: starts its own Sawyer server (local test mode, no real email or SMS, payments in test
// mode). Covers health 2.26.0-sawyer / SW cache sawyer-v43 (or later), and:
// SW-106: invoice numbers are max(existing of that type for that business)+1; (business, type, no) is unique; a fresh
//   seed's next INV / EST / CO do not collide; on boot the newer of a colliding pair is renumbered.
// SW-104: void invoices cannot be duplicated (API and the Duplicate button is hidden).
// SW-105: two parallel dupBill42 calls for the same source return one draft.
// Usage: node test/v43-e2e.js [shots dir]
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
 const created=!dir;dir=dir||fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v43-"));
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
 const SH=process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),"v43-shots-"));fs.mkdirSync(SH,{recursive:true});
 const L=await startApp();SERVERS.push(L);
 const act=async(S,ck,name,args)=>{const r=await req(S.port,"POST","/api/act",Object.assign(ck?{Cookie:ck}:{},JH),J({name,args}));return {res:(r.json&&r.json.res)||{},st:stateOf(r),status:r.status,error:r.json&&r.json.error}};
 const stateFor=async(S,ck)=>stateOf(await req(S.port,"GET","/api/state",ck?{Cookie:ck}:{}));
 const signup=async(S,kind,tag,zip,extra)=>{const email="v43-"+tag+"-"+run+"@example.com";const data=Object.assign({name:(kind==="pro"?"Val ":"Hana ")+tag,email,zip},kind==="pro"?{biz:"V43 "+tag+" "+run,trade:"Plumbing",phone:"5125550100",plan:"founding"}:kind==="pm"?{biz:"V43 PM "+tag}:{},extra||{});
  const r=await req(S.port,"POST","/api/signup",JH,J({kind,password:"v43-correct-horse",data}));return{status:r.status,error:r.json&&r.json.error,ck:sigCk(r),id:stateOf(r).me,st:stateOf(r),email}};
 const login=async(S,email)=>{const r=await req(S.port,"POST","/api/login",JH,J({email,password:"sawyer-demo-2026"}));return{status:r.status,ck:sigCk(r),id:stateOf(r).me}};
 br=await chromium.launch();
 const page=async(S,w,ck)=>{const c=await br.newContext({viewport:{width:w,height:w<500?844:900},deviceScaleFactor:w<500?2:1,bypassCSP:true,hasTouch:w<500});
  if(ck){const [k,v]=ck.split("=");await c.addCookies([{name:k,value:v,url:S.B}])}
  const p=await c.newPage();return{c,p}};
 const go=async(S,p,u,sel)=>{await p.goto(S.B+u,{waitUntil:"networkidle"});await p.waitForFunction(()=>typeof __PART!=="undefined"&&!__PART&&typeof me==="function",null,{timeout:60000,polling:100});if(sel)await p.waitForSelector(sel,{timeout:20000}).catch(()=>{})};

 // --- release
 {const hz=(await req(L.port,"GET","/healthz")).json||{};ok(/^2\.(2[6-9]|[3-9]\d)\.\d+-sawyer$/.test(hz.v||""),"healthz reports a Sawyer version from 2.26.0 on",J(hz));
  const sw=await req(L.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v(4[3-9]|[5-9]\d)"/.test(sw.body),"service worker cache is sawyer-v43 or later")}

 const PRO=await login(L,"demo-pro@sawyer.test");ok(PRO.status===200&&PRO.id==="c1"&&PRO.ck,"demo-pro signs in");
 const REM=await login(L,"demo-remodeler@sawyer.test");ok(REM.status===200&&REM.ck,"demo-remodeler signs in");

 // --- SW-106: seed numbers are unique and per-type, next mint does not collide
 {const st=await stateFor(L,PRO.ck);
  const mine=(st.bills||[]).filter(b=>b.by==="c1");
  const byType=t=>mine.filter(b=>b.type===t).map(b=>b.no).sort();
  const inv=byType("inv"),est=byType("est"),co=byType("co");
  ok(est[0]==="EST-1001"&&est[1]==="EST-1002"&&est.length===2,"SW-106: demo-pro seed estimates are EST-1001 and EST-1002",J(est));
  ok(inv[0]==="INV-1001"&&inv[inv.length-1]==="INV-1007"&&inv.length===7,"SW-106: demo-pro seed invoices are INV-1001…INV-1007 (per-type, no shared CO-1010-style gap)",J(inv));
  ok(co.length===1&&co[0]==="CO-1001","SW-106: demo-pro seed change order is CO-1001, not CO-1010",J(co));
  ok(uniquePairs(mine).length===0,"SW-106: no two demo-pro seed bills share type+number",J(uniquePairs(mine)));
  ok(mine.some(b=>b.id==="bbc11004"&&b.type==="inv"&&/Kitchen sink/.test(b.title||"")),"SW-106: kitchen-sink invoice kept id bbc11004 so older suites still find it");
  ok(mine.some(b=>b.id==="bbc11001"&&b.type==="est"),"SW-106: first estimate kept id bbc11001");
  ok(mine.some(b=>b.id==="bbc11005"&&b.type==="inv"),"SW-106: grease-trap invoice kept id bbc11005");
  const rst=await stateFor(L,REM.ck);
  const rinv=(rst.bills||[]).filter(b=>b.by===REM.id&&b.type==="inv").map(b=>b.no);
  ok(rinv.includes("INV-1001")&&uniquePairs(rst.bills,REM.id).length===0,"SW-106: uniqueness is per business (demo-remodeler may also have INV-1001)",J(rinv.slice(0,3)));}

 {const {c,p}=await page(L,1100,PRO.ck);
  await go(L,p,"/office/invoices");
  const nxt=await p.evaluate(()=>({inv:v7Next(me(),"inv"),est:v7Next(me(),"est"),co:v7Next(me(),"co")}));
  ok(nxt.inv==="INV-1008"&&nxt.est==="EST-1003"&&nxt.co==="CO-1002","SW-106: after a fresh seed the next numbers are INV-1008, EST-1003, CO-1002",J(nxt));
  await c.close()}

 {const last=(await stateFor(L,PRO.ck)).bills.filter(b=>b.by==="c1"&&b.type==="inv"&&b.status!=="draft"&&b.status!=="void").sort((a,b)=>(b.sent||b.date||0)-(a.sent||a.date||0))[0];
  const r=await act(L,PRO.ck,"dupBill42",[last.id]);
  ok(r.res.ok&&r.res.no==="INV-1008","SW-106: Bill again / Duplicate mints INV-1008, not a colliding INV-1008-from-count",J(r.res));
  const after=(r.st.bills||[]).filter(b=>b.by==="c1");
  ok(uniquePairs(after).length===0,"SW-106: the new draft does not share a number with any existing invoice",J(uniquePairs(after)));
  const draft=(after).find(b=>b.id===r.res.id);
  ok(draft&&draft.status==="draft"&&draft.no==="INV-1008","SW-106: the copy is a draft numbered INV-1008")}

 {const TP=await signup(L,"pro","freshinv","78701");ok(TP.status===200&&TP.ck,"a throwaway pro with no seed signs up");
  const cu=await signup(L,"customer","freshcu","78701");ok(cu.status===200&&cu.ck,"a throwaway customer signs up");
  // add a customer record then an invoice and an estimate
  const add=await act(L,TP.ck,"saveCust",[{name:"River Clinic",email:cu.email}]);
  ok(add.res.ok&&add.res.id,"throwaway pro can add a customer",J(add.res));
  const inv=await act(L,TP.ck,"saveBill",[{type:"inv",cust:add.res.id,title:"First invoice",lines:[{d:"Labor",q:1,r:100}]}]);
  ok(inv.res.ok&&inv.res.id,"throwaway pro saves a first invoice");
  const invB=((inv.st.bills)||[]).find(b=>b.id===inv.res.id);
  ok(invB&&invB.no==="INV-1001","SW-106: a business with no seed starts at INV-1001",invB&&invB.no);
  const est=await act(L,TP.ck,"saveBill",[{type:"est",cust:add.res.id,title:"First estimate",lines:[{d:"Labor",q:1,r:80}]}]);
  const estB=((est.st.bills)||[]).find(b=>b.id===est.res.id);
  ok(est.res.ok&&estB&&estB.no==="EST-1001","SW-106: a business with no seed starts estimates at EST-1001",estB&&estB.no);
  const inv2=await act(L,TP.ck,"saveBill",[{type:"inv",cust:add.res.id,title:"Second invoice",lines:[{d:"Parts",q:1,r:40}]}]);
  const inv2B=((inv2.st.bills)||[]).find(b=>b.id===inv2.res.id);
  ok(inv2.res.ok&&inv2B&&inv2B.no==="INV-1002","SW-106: the second invoice is INV-1002",inv2B&&inv2B.no);
  // void INV-1001; the next invoice must not reuse 1001
  const vo=await act(L,TP.ck,"voidBill",[inv.res.id]);ok(vo.res.ok,"the first invoice can be voided");
  const inv3=await act(L,TP.ck,"saveBill",[{type:"inv",cust:add.res.id,title:"After a void",lines:[{d:"Labor",q:1,r:50}]}]);
  const inv3B=((inv3.st.bills)||[]).find(b=>b.id===inv3.res.id);
  ok(inv3.res.ok&&inv3B&&inv3B.no==="INV-1003","SW-106: a voided number is not reused (next is INV-1003, not INV-1001)",inv3B&&inv3B.no);
  // gap: if a high number already exists, next is max+1 (not count+1001)
  const {c,p}=await page(L,1100,TP.ck);
  await go(L,p,"/dash");
  const gap=await p.evaluate(()=>{
    const m=me();const pre="INV-";
    v7Col("bills").push({id:"b-gap-106",by:m.id,no:"INV-1019",type:"inv",status:"draft",payments:[],lines:[{d:"x",q:1,r:1}],date:Date.now(),cust:"ignore"});
    return v7Next(m,"inv");
  });
  ok(gap==="INV-1020","SW-106: a gap / high existing number yields max+1 (INV-1020), not count+1001",gap);
  await c.close()}

 // --- SW-106: boot repair renumbers the newer colliding bill
 {const R=await startApp();SERVERS.push(R);
  const ck=(await login(R,"demo-pro@sawyer.test")).ck;
  const before=readBills(R.dir);
  const src=before.find(b=>b.by==="c1"&&b.type==="inv"&&b.no==="INV-1006")||before.find(b=>b.by==="c1"&&b.type==="inv");
  ok(!!src,"SW-106: a seed invoice exists to clone for the collision fixture",src&&src.no);
  const clone=JSON.parse(JSON.stringify(src));
  clone.id="b-collide-106";clone.status="draft";clone.date=(src.date||0)+864e5*2;clone.title="Collision fixture (newer)";clone.payments=[];clone.sent=null;
  // same no as src — this is the v42 live bug
  writeBills(R.dir,before.concat([clone]));
  await stopApp(R,true);
  const R2=await startApp({},R.dir);SERVERS.push(R2);
  const log=R2.log();
  ok(/SW-106: renumbered 1 bill/.test(log),"SW-106: boot logs that it renumbered the colliding bill",log.split("\n").filter(l=>/SW-106|renumber/.test(l)).join(" | "));
  const ck2=(await login(R2,"demo-pro@sawyer.test")).ck;
  const st=await stateFor(R2,ck2);
  const mine=(st.bills||[]).filter(b=>b.by==="c1");
  const older=mine.find(b=>b.id===src.id),newer=mine.find(b=>b.id==="b-collide-106");
  ok(older&&older.no===src.no,"SW-106: the older bill keeps its number",older&&older.no);
  ok(newer&&newer.no!==src.no&&/^INV-/.test(newer.no),"SW-106: the newer colliding bill is renumbered",newer&&newer.no);
  ok(uniquePairs(mine).length===0,"SW-106: after boot repair, demo-pro numbers are unique",J(uniquePairs(mine)));
  await stopApp(R2,true)}


 // --- SW-104: refuse to duplicate a void invoice (API + hidden button)
 {const P=await signup(L,"pro","voidsrc","78704");const C=await signup(L,"customer","voidcu","78704");
  const cust=await act(L,P.ck,"saveCust",[{name:"Void Clinic",email:C.email}]);
  const inv=await act(L,P.ck,"saveBill",[{type:"inv",cust:cust.res.id,title:"To be voided",lines:[{d:"Labor",q:1,r:120}]}]);
  const sent=await act(L,P.ck,"sendBill",[inv.res.id]);ok(sent.res.ok,"SW-104 fixture invoice is sent");
  const vo=await act(L,P.ck,"voidBill",[inv.res.id]);ok(vo.res.ok,"SW-104 fixture invoice is voided");
  const dup=await act(L,P.ck,"dupBill42",[inv.res.id]);
  ok(!dup.res.ok&&/void/i.test(dup.res.msg||""),"SW-104: dupBill42 refuses a void invoice",J(dup.res));
  const bills=(dup.st.bills||[]).filter(b=>b.by===P.id&&b.id!==inv.res.id);
  ok(!bills.some(b=>b.dup42),"SW-104: no draft was created from the void invoice",J(bills.map(b=>({id:b.id,no:b.no,st:b.status}))));
  // a still-open invoice from the same pro can be duplicated (the helper isn't stuck off)
  const inv2=await act(L,P.ck,"saveBill",[{type:"inv",cust:cust.res.id,title:"Still open",lines:[{d:"Labor",q:1,r:90}]}]);
  await act(L,P.ck,"sendBill",[inv2.res.id]);
  const dup2=await act(L,P.ck,"dupBill42",[inv2.res.id]);
  ok(dup2.res.ok&&dup2.res.id,"SW-104: a non-void invoice can still be duplicated",J(dup2.res));
  const {c,p}=await page(L,1100,P.ck);
  await go(L,p,"/invoice/"+inv.res.id);
  const ui=await p.evaluate(()=>({btn:!!document.getElementById("bDup42"),can:typeof v42CanDup==="function"&&v42CanDup(v7Bill(location.pathname.split("/").pop()),me()),voided:/void/i.test(document.body.innerText)}));
  ok(!ui.btn&&!ui.can&&ui.voided,"SW-104: Duplicate is hidden on a void invoice and v42CanDup is false",J(ui));
  await go(L,p,"/invoice/"+inv2.res.id);
  const ui2=await p.evaluate(()=>({btn:!!document.getElementById("bDup42")}));
  ok(ui2.btn,"SW-104: Duplicate still shows on an open invoice");
  await c.close()}


 // --- SW-105: parallel dupBill42 yields one draft
 {const P=await signup(L,"pro","idems","78704");const C=await signup(L,"customer","idemcu","78704");
  const cust=await act(L,P.ck,"saveCust",[{name:"Idem Clinic",email:C.email}]);
  const inv=await act(L,P.ck,"saveBill",[{type:"inv",cust:cust.res.id,title:"Monthly backflow",lines:[{d:"Test",q:1,r:250}]}]);
  await act(L,P.ck,"sendBill",[inv.res.id]);
  const srcNo=((await stateFor(L,P.ck)).bills||[]).find(b=>b.id===inv.res.id).no;
  const pair=await Promise.all([act(L,P.ck,"dupBill42",[inv.res.id]),act(L,P.ck,"dupBill42",[inv.res.id])]);
  ok(pair[0].res.ok&&pair[1].res.ok,"SW-105: both parallel calls succeed",J(pair.map(x=>x.res)));
  ok(pair[0].res.id&&pair[0].res.id===pair[1].res.id,"SW-105: both calls return the same draft id",J(pair.map(x=>x.res)));
  const st=await stateFor(L,P.ck);
  const copies=(st.bills||[]).filter(b=>b.by===P.id&&b.status==="draft"&&b.dup42&&(b.dup42.from===inv.res.id||b.dup42.no===srcNo));
  ok(copies.length===1,"SW-105: only one draft was created from the source",J(copies.map(b=>({id:b.id,no:b.no}))));
  // optional idempotency key: the same key always returns that draft
  const invB=await act(L,P.ck,"saveBill",[{type:"inv",cust:cust.res.id,title:"Keyed source",lines:[{d:"Visit",q:1,r:80}]}]);
  await act(L,P.ck,"sendBill",[invB.res.id]);
  const k="v43-key-"+run;
  const a=await act(L,P.ck,"dupBill42",[invB.res.id,k]);
  const b=await act(L,P.ck,"dupBill42",[invB.res.id,k]);
  ok(a.res.ok&&b.res.ok&&a.res.id===b.res.id,"SW-105: the same idempotency key returns the same draft",J({a:a.res,b:b.res}));
  const other=await act(L,P.ck,"dupBill42",[inv.res.id,k+"-other"]);
  ok(other.res.ok&&other.res.id!==a.res.id,"SW-105: a different key (or a different source) can still mint its own draft",J(other.res))}

 if(failed)throw new Error(failed+" check(s) failed");
 console.log("OK v43-e2e");
}catch(e){console.error(e&&e.stack||e);failed++;}
finally{if(br)await br.close().catch(()=>{});await Promise.all(SERVERS.map(s=>stopApp(s)));process.exit(failed?1:0)}})();
