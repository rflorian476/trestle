// v37 end-to-end. Self-contained: starts its own Sawyer server (local test mode, local stand-in push service). Covers health
// 2.20.0-sawyer / SW cache sawyer-v37, SW-085 (job-cost markup in integer hundredths of a percent: $0.01–$500 at 33.33%,
// 12.5%, 7.25%, 150%, 300% and the presets against BigInt math, saved markups, the Bill job costs sheet), Appointments (arrival windows,
// customer Confirm / Ask to reschedule, the pro picks a time, a moved visit asks again, "On my way", phone alerts, job page /
// tracker / dashboard / schedule UI, SW-086 confirm-needed visits stay visible, 3 times per request / 6 requests in all,
// Eastern 180-day window) and My home (properties, filing by ZIP and by hand, notes with photos, print and all-property CSV),
// with privacy checks (signed out, other customers, other pros, the hired pro) at 390 and 1440.
// Usage: node test/v37-e2e.js [shots dir]
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib"),crypto=require("crypto");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v37-"));
 const env=Object.assign({},process.env,{HOST:"127.0.0.1",PORT:String(port),DATA_DIR:dir,RATE_X:"50"});
 for(const k of ["NODE_ENV","RENDER","AUTH_TEST_MODE","STAFF_DEMO_PASSWORD","RESEND_API_KEY","SENDGRID_API_KEY","EMAIL_FROM","MAIL_FROM","RESEND_API_URL","TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_FROM","TWILIO_MESSAGING_SERVICE_SID","TEST_NOW","SAWYER_BASE_URL","PUBLIC_URL","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","APPLE_CLIENT_ID","MICROSOFT_CLIENT_ID","FACEBOOK_APP_ID","VAPID_PRIVATE_KEY","VAPID_PUBLIC_KEY","VAPID_SUBJECT","PUSH_DEBUG","PUSH_TEST_ORIGIN","PUSH_RETRY_MS","SAWYER_PERSISTENT"])if(!extra||!(k in extra))delete env[k];
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
 const hz=(await req(P(),"GET","/healthz")).json||{};ok(hz.v==="2.20.0-sawyer","healthz reports 2.20.0-sawyer",J(hz));
 {const sw=await req(P(),"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v37"/.test(sw.body),"service worker cache is sawyer-v37 (client assets changed)")}
 const run=Math.random().toString(36).slice(2,8);
 const signupPro=async(tag,trade,zip)=>{const r=await req(P(),"POST","/api/signup",JH,J({kind:"pro",password:"v37-correct-horse",data:{name:"Vee "+tag,biz:"V37 "+tag+" "+run,email:"v37-"+tag+"-"+run+"@example.com",trade:trade||"Plumbing",zip:zip||"78704",phone:"5125550100",plan:"founding"}}));return{ck:sigCk(r),id:stateOf(r).me,email:"v37-"+tag+"-"+run+"@example.com"}};
 const signupHo=async(tag,zip)=>{const r=await req(P(),"POST","/api/signup",JH,J({kind:"customer",password:"v37-correct-horse",data:{name:"Hana "+tag+" Reyes",email:"v37-ho-"+tag+"-"+run+"@example.com",zip:zip||"78704"}}));return{ck:sigCk(r),id:stateOf(r).me,email:"v37-ho-"+tag+"-"+run+"@example.com"}};
 const pub=async()=>stateOf(await req(P(),"GET","/api/state"));
 const stateFor=async ck=>stateOf(await req(P(),"GET","/api/state",{Cookie:ck}));
 const meOf=st=>(st.users||[]).find(u=>u.id===st.me)||{};
 const up=async(ck,file)=>{const buf=fs.readFileSync(path.join(ROOT,file));const r=await req(P(),"POST","/api/upload",{Cookie:ck,"Content-Type":"image/webp","Content-Length":buf.length},buf);return r.json&&r.json.url};
 const today=bizToday();

 // ===== 1. SW-085: markup in integer hundredths of a percent =====
 const mp=await signupPro("mk","Plumbing","78704");
 for(const [inp,want] of [["33.33",33.33],["12.5%",12.5],["7.25",7.25],["33.335",33.34],["0",0],["25",25],["150",150],["300",300],["500",500]]){const r=await act(P(),mp.ck,"mk36",[inp]);ok(r.res.ok&&meOf(r.st).mk36===want,"SW-085: markup "+J(inp)+" is saved as "+want+"%",J(r.res))}
 for(const bad of ["500.01","-1","\u221233.33","abc"]){const r=await act(P(),mp.ck,"mk36",[bad]);ok(r.res.ok===false,"SW-085: markup "+J(bad)+" is refused",J(r.res))}

 // ===== 2. Appointments: API, rules and privacy =====
 const pro=await signupPro("ap","Plumbing","78704"),ho=await signupHo("ap"),ho2=await signupHo("ap2"),pro2=await signupPro("ap2","Plumbing","78704");
 let r=await act(P(),ho.ck,"postJob",[{title:"V37 water heater swap "+run,cat:"Plumbing",sub:"Water heaters",desc:"40 gal, garage. Private: gate 7781.",zip:"78704",budget:"$1,200–1,800",when:"This week"}]);const JID=r.res.id;ok(r.res.ok&&JID,"setup: the homeowner posts a job",J(r.res));
 r=await act(P(),pro.ck,"quote",[JID,1450,"Can do Thursday"]);ok(r.res.ok,"setup: the pro quotes",J(r.res));
 r=await act(P(),ho.ck,"hire",[JID,pro.id]);ok(r.res.ok,"setup: the homeowner hires the pro",J(r.res));
 r=await act(P(),pro.ck,"custFromJob",[JID]);const CID=r.res.id;ok(r.res.ok&&CID,"the pro adds the customer from the job",J(r.res));
 const D1=addD(today,3),D2=addD(today,5),D3=addD(today,6);
 r=await act(P(),pro.ck,"saveVisit",[{cust:CID,title:"Water heater install",date:D1,start:"08:00",hrs:"3",win:"45",job:JID}]);ok(r.res.ok===false&&/arrival window/.test(r.res.msg),"an arrival window that isn't on the list is refused",J(r.res));
 r=await act(P(),pro.ck,"saveVisit",[{cust:CID,title:"Water heater install",date:D1,start:"08:00",hrs:"3",win:"120",job:JID,notes:"Bring the 3/4 flex lines"}]);const VID=r.res.id;
 let v=(r.st.visits||[]).find(x=>x.id===VID);ok(r.res.ok&&v&&v.win37===120&&v.job37===JID&&v.conf37&&v.conf37.s==="pending"&&v.cuid===ho.id,"the pro schedules a visit with a 2-hour arrival window, tied to the hired job, waiting for the customer",J(v&&{w:v.win37,j:v.job37,c:v.conf37,cu:v.cuid}));
 let hs=await stateFor(ho.ck);let n=(hs.notifs||[]).find(x=>x.link==="visit:"+VID);
 ok(n&&/arrive 8–10am/.test(n.text)&&/Tap to confirm/.test(n.text),"the customer's notice names the window (arrive 8–10am) and asks them to confirm",n&&n.text);
 ok((hs.visits||[]).some(x=>x.id===VID),"the customer gets the visit in their state");
 {const ps=await pub();ok(!(ps.visits||[]).length,"signed out: no visits at all in /api/state");
  const s2=await stateFor(ho2.ck);ok(!(s2.visits||[]).some(x=>x.id===VID),"another homeowner doesn't get the visit");
  const s3=await stateFor(pro2.ck);ok(!(s3.visits||[]).some(x=>x.id===VID),"another pro doesn't get the visit")}
 {const j2=(await act(P(),ho2.ck,"postJob",[{title:"V37 other job "+run,cat:"Plumbing",sub:"Drain cleaning",desc:"x",zip:"78704",budget:"$200",when:"This week"}])).res.id;
  r=await act(P(),pro.ck,"saveVisit",[{cust:CID,title:"Tie test",date:D1,start:"13:00",hrs:"1",win:"0",job:j2}]);const vv=(r.st.visits||[]).find(x=>x.id===r.res.id);ok(r.res.ok&&vv&&!vv.job37,"a job that isn't this pro's hire for this customer is not tied to the visit",J(vv&&vv.job37));
  await act(P(),pro.ck,"delVisit",[r.res.id])}
 r=await act(P(),ho2.ck,"visitConfirm37",[VID]);ok(r.res.ok===false,"another homeowner can't confirm it",J(r.res));
 r=await act(P(),pro.ck,"visitConfirm37",[VID]);ok(r.res.ok===false,"the pro can't confirm on the customer's behalf",J(r.res));
 r=await act(P(),ho2.ck,"visitAsk37",[VID,[{date:D2,start:"09:00"}],"x"]);ok(r.res.ok===false,"another homeowner can't ask to reschedule it");
 r=await act(P(),ho.ck,"visitAsk37",[VID,[{date:addD(today,-1),start:"09:00"}],""]);ok(r.res.ok===false&&/from today/.test(r.res.msg),"a time in the past is refused",J(r.res));
 r=await act(P(),ho.ck,"visitAsk37",[VID,[{date:D2,start:""}],""]);ok(r.res.ok===false&&/day and a time/.test(r.res.msg),"a day without a time is refused",J(r.res));
 r=await act(P(),ho.ck,"visitAsk37",[VID,[{date:D2,start:"09:00"},{date:D2,start:"10:00"},{date:D3,start:"08:00"},{date:D3,start:"12:00"}],""]);ok(r.res.ok===false&&/up to 3/.test(r.res.msg),"more than 3 times is refused",J(r.res));
 {const cap=addD(today,180),over=addD(today,181);
  r=await act(P(),ho.ck,"visitAsk37",[VID,[{date:over,start:"09:00"}],""]);ok(r.res.ok===false&&/6 months/.test(r.res.msg),"a day past the 180-day Eastern cap is refused",J({over,msg:r.res.msg}));
  r=await act(P(),pro.ck,"saveVisit",[{cust:CID,title:"Cap day check",date:D2,start:"11:00",hrs:"1",win:"0",job:JID}]);const VCAP=r.res.id;
  r=await act(P(),ho.ck,"visitAsk37",[VCAP,[{date:cap,start:"09:00"}],""]);ok(r.res.ok,"the exact 180-day Eastern cap day is accepted",J({cap,res:r.res}));
  await act(P(),pro.ck,"delVisit",[VCAP])}
 const NOTE="Mornings only, the dog is out after noon "+run;
 r=await act(P(),ho.ck,"visitAsk37",[VID,[{date:D2,start:"09:00"},{date:D3,start:"07:30"}],NOTE]);v=(r.st.visits||[]).find(x=>x.id===VID);
 ok(r.res.ok&&v.conf37.s==="ask"&&v.conf37.slots.length===2&&v.conf37.note===NOTE,"the customer asks to reschedule with 2 times and a note",J(r.res));
 let pst=await stateFor(pro.ck);n=(pst.notifs||[]).filter(x=>x.link==="visit:"+VID).pop();
 ok(n&&/asked to move/.test(n.text)&&/offered 2 other times/.test(n.text)&&!n.text.includes("dog"),"the pro is told (2 times offered); the note isn't in the notice text",n&&n.text);
 r=await act(P(),pro2.ck,"visitPick37",[VID,0]);ok(r.res.ok===false,"another pro can't pick a time on it");
 r=await act(P(),pro.ck,"visitPick37",[VID,1]);v=(r.st.visits||[]).find(x=>x.id===VID);
 ok(r.res.ok&&v.date===D3&&v.start==="07:30"&&v.conf37.s==="ok","the pro picks the customer's 2nd time: the visit moves and is confirmed",J(v&&{d:v.date,s:v.start,c:v.conf37}));
 hs=await stateFor(ho.ck);n=(hs.notifs||[]).filter(x=>x.link==="visit:"+VID).pop();ok(n&&/a time you offered/.test(n.text)&&/arrive 7:30–9:30am/.test(n.text),"the customer is told it moved to their time",n&&n.text);
 r=await act(P(),pro.ck,"visitPick37",[VID,0]);ok(r.res.ok===false,"picking again without a request is refused");
 r=await act(P(),pro.ck,"saveVisit",[{id:VID,cust:CID,title:"Water heater install",date:D3,start:"10:00",hrs:"3",win:"120"}]);v=(r.st.visits||[]).find(x=>x.id===VID);
 ok(r.res.ok&&v.conf37.s==="pending"&&v.job37===JID,"the pro moves the visit: it needs the customer's OK again (job link kept)",J(v&&v.conf37));
 hs=await stateFor(ho.ck);n=(hs.notifs||[]).filter(x=>x.link==="visit:"+VID).pop();ok(n&&/moved "Water heater install" to .*arrive 10am–12pm\. Please confirm/.test(n.text),"the customer is asked to confirm the new time",n&&n.text);
 r=await act(P(),pro.ck,"saveVisit",[{id:VID,cust:CID,title:"Water heater install (bring flex lines)",date:D3,start:"10:00",hrs:"3",win:"120"}]);v=(r.st.visits||[]).find(x=>x.id===VID);ok(v.conf37.s==="pending","a title edit alone doesn't send a 'moved' notice",J(v.conf37));
 hs=await stateFor(ho.ck);ok((hs.notifs||[]).filter(x=>x.link==="visit:"+VID&&/moved .*Please confirm/.test(x.text)).length===1,"only one 'please confirm the new time' notice so far");
 // phone alerts: the customer turns them on; confirm / on my way reach the right devices
 const dH=device(),dP=device();
 let s=(await post(P(),ho.ck,"/api/push/subscribe",{sub:{endpoint:PS.origin+"/send/ho-"+run,keys:dH.keys}})).json||{};
 ok(s.ok&&s.cats&&s.cats.visits===true,"phone alerts: appointment updates are on by default for a homeowner",J(s.cats));
 s=(await post(P(),pro.ck,"/api/push/subscribe",{sub:{endpoint:PS.origin+"/send/pro-"+run,keys:dP.keys}})).json||{};ok(s.ok&&s.cats&&s.cats.visits===true,"…and for a pro",J(s.cats));
 PS.got.length=0;r=await act(P(),ho.ck,"visitConfirm37",[VID]);v=(r.st.visits||[]).find(x=>x.id===VID);ok(r.res.ok&&v.conf37.s==="ok","the customer confirms",J(r.res));
 await sleep(700);ok(PS.got.filter(g=>g.path.includes("/pro-")).length===1&&PS.got.filter(g=>g.path.includes("/ho-")).length===0,"the pro's device gets one 'confirmed' alert, the customer's none",J(PS.got.map(g=>g.path)));
 ok(PS.got.every(g=>g.headers.topic==="visits"),"alerts use the 'visits' topic",J(PS.got.map(g=>g.headers.topic)));
 pst=await stateFor(pro.ck);ok((pst.notifs||[]).some(x=>x.link==="visit:"+VID&&/confirmed .*arrive 10am–12pm/.test(x.text)),"the pro's notice says the customer confirmed the window");
 r=await act(P(),ho.ck,"visitConfirm37",[VID]);ok(r.res.ok&&/Already/.test(r.res.msg),"confirming twice is harmless");
 PS.got.length=0;r=await act(P(),pro.ck,"visitStatus",[VID,"enroute",15]);await sleep(700);
 hs=await stateFor(ho.ck);ok((hs.notifs||[]).some(x=>x.link==="visit:"+VID&&/is on the way\. About 15 min/.test(x.text)),"On my way: the customer gets 'is on the way. About 15 min'");
 ok(PS.got.filter(g=>g.path.includes("/ho-")).length===1,"…and one phone alert",J(PS.got.map(g=>g.path)));
 r=await act(P(),ho.ck,"visitAsk37",[VID,[{date:D2,start:"09:00"}],""]);ok(r.res.ok===false,"once the pro is on the way the customer can't ask to move it");
 await act(P(),pro.ck,"visitStatus",[VID,"scheduled"]);
 PS.got.length=0;r=await act(P(),pro.ck,"saveVisit",[{cust:CID,title:"Follow-up check",date:D2,start:"14:00",hrs:"1",win:"60",job:JID}]);const VID2=r.res.id;await sleep(700);ok(r.res.ok,"a second visit for the same job");
 // the 'visits' switch: off means no appointment alerts for that account; the push opens the tracker and names business + title only
 {const sched=PS.got.filter(g=>g.path.includes("/ho-"));ok(sched.length>=1,"scheduling the second visit sends the customer a phone alert",J(PS.got.map(g=>g.path)));
  let pr=(await post(P(),pro.ck,"/api/push/prefs",{cats:{jobs:true,hires:true,quotes:false,msgs:true,visits:false}})).json||{};ok(pr.cats&&pr.cats.visits===false,"the pro turns the 'visits' switch off",J(pr.cats));
  r=await act(P(),pro.ck,"saveVisit",[{cust:CID,title:"Switch check",date:D3,start:"16:00",hrs:"1",win:"0"}]);const VID3=r.res.id;await sleep(700);
  PS.got.length=0;r=await act(P(),ho.ck,"visitConfirm37",[VID3]);await sleep(700);ok(r.res.ok&&PS.got.filter(g=>g.path.includes("/pro-")).length===0,"with 'visits' off, the pro's device gets no alert when the customer confirms",J(PS.got.map(g=>g.path)));
  pst=await stateFor(pro.ck);ok((pst.notifs||[]).some(x=>x.link==="visit:"+VID3&&/confirmed/.test(x.text)),"…the in-app notice still arrives");
  pr=(await post(P(),pro.ck,"/api/push/prefs",{cats:{jobs:true,hires:true,quotes:false,msgs:true,visits:true}})).json||{};ok(pr.cats&&pr.cats.visits===true,"…and back on");
  r=await act(P(),pro.ck,"delVisit",[VID3]);ok(r.res.ok,"(the check visit is removed)")}
 {const s2=await stateFor(ho2.ck);ok(!(s2.visits||[]).length&&!(s2.notifs||[]).some(x=>/visit:/.test(x.link||"")),"the other homeowner has no visits or visit notices");
  const ps=await pub();ok(!J(ps).includes(NOTE)&&!J(ps).includes(VID),"signed out: neither the visit nor the reschedule note appear anywhere");
  const s3=await stateFor(pro2.ck);ok(!J(s3).includes(NOTE),"another pro never sees the reschedule note")}

 // ===== 2b. SW-086: a later visit waiting for confirm stays on the job page =====
 const j86=await act(P(),ho.ck,"postJob",[{title:"V37 many visits "+run,cat:"Plumbing",sub:"Water heaters",desc:"Several upcoming visits on one job.",zip:"78704",budget:"$800",when:"This month"}]);
 const J86=j86.res.id;await act(P(),pro.ck,"quote",[J86,900,"Yes"]);await act(P(),ho.ck,"hire",[J86,pro.id]);
 const c86=await act(P(),pro.ck,"custFromJob",[J86]);const C86=c86.res.id;ok(c86.res.ok&&C86,"SW-086 setup: a second hired job",J(c86.res));
 const EARLY=[];
 for(let i=0;i<4;i++){r=await act(P(),pro.ck,"saveVisit",[{cust:C86,title:"Early visit "+(i+1),date:addD(today,40+i),start:"09:00",hrs:"1",win:"0",job:J86}]);ok(r.res.ok,"SW-086: early visit "+(i+1)+" is scheduled",J(r.res));EARLY.push(r.res.id);r=await act(P(),ho.ck,"visitConfirm37",[r.res.id]);ok(r.res.ok,"SW-086: early visit "+(i+1)+" is confirmed")}
 r=await act(P(),pro.ck,"saveVisit",[{cust:C86,title:"Needs confirm last",date:addD(today,50),start:"10:00",hrs:"1",win:"60",job:J86}]);const VLAST=r.res.id;
 ok(r.res.ok&&((r.st.visits||[]).find(x=>x.id===VLAST)||{}).conf37.s==="pending","SW-086: the 5th visit, last by date, is waiting for confirm",J(r.res));

 // ===== 3. My home: API, rules and privacy =====
 r=await act(P(),ho.ck,"home37Prop",[{name:"Lake house",addr:"1200 N Lincoln Memorial Dr, Milwaukee, WI 53202",zip:""}]);const CAB=r.res.id;
 ok(r.res.ok&&CAB&&(meOf(r.st).home37.props||[]).some(p=>p.id===CAB&&p.zip==="53202"),"the homeowner adds a property; the ZIP is read from the address",J(r.res));
 r=await act(P(),ho.ck,"home37Prop",[{name:"X",zip:"abc"}]);ok(r.res.ok===false,"a bad property (1-letter name / bad ZIP) is refused");
 r=await act(P(),pro.ck,"home37Prop",[{name:"Shop",zip:"78704"}]);ok(r.res.ok===false,"a pro account can't keep a My home file");
 r=await act(P(),ho.ck,"postJob",[{title:"V37 cabin deck repair "+run,cat:"Carpentry",sub:"Decks",desc:"Soft boards by the steps.",zip:"53202",budget:"$800",when:"This month"}]);const CJ=r.res.id;
 const cp=await signupPro("cab","Carpentry","53202");await act(P(),cp.ck,"quote",[CJ,780,"Next week"]);r=await act(P(),ho.ck,"hire",[CJ,cp.id]);ok(r.res.ok,"setup: a cabin job is hired",J(r.res));
 r=await act(P(),ho2.ck,"home37Assign",["job",CJ,"main"]);ok(r.res.ok===false,"another homeowner can't file someone else's job");
 r=await act(P(),ho.ck,"home37Assign",["job",JID,"nope"]);ok(r.res.ok===false,"an unknown property is refused");
 r=await act(P(),ho.ck,"home37Assign",["job",JID,CAB]);ok(r.res.ok&&meOf(r.st).home37.as["job:"+JID]===CAB,"the homeowner moves a job to the cabin by hand",J(r.res));
 r=await act(P(),ho.ck,"home37Assign",["job",JID,"main"]);ok(r.res.ok&&!meOf(r.st).home37.as["job:"+JID],"…and back home (no pin left)");
 const U1=await up(ho.ck,"public/img/g-wall-pipes.webp"),UX=await up(ho2.ck,"public/img/g-copper.webp");ok(/^\/u\//.test(U1||"")&&/^\/u\//.test(UX||""),"photos upload");
 r=await act(P(),ho.ck,"home37Note",[{prop:CAB,text:"Water shutoff: crawlspace hatch by the steps",photo:U1}]);const NID=r.res.id;
 ok(r.res.ok&&(meOf(r.st).home37.notes||[]).some(x=>x.id===NID&&x.photo===U1&&x.prop===CAB),"a note with the owner's own photo is saved to the cabin",J(r.res));
 r=await act(P(),ho.ck,"home37Note",[{prop:CAB,text:"Someone else's photo",photo:UX}]);ok(r.res.ok===false&&/couldn't be added/.test(r.res.msg),"another account's upload can't go on a note",J(r.res));
 r=await act(P(),ho.ck,"home37Note",[{prop:"main",text:"=HYPERLINK(\"http://x\") furnace filter 16x25x1"}]);ok(r.res.ok,"a note that starts like a formula is stored as text");
 r=await act(P(),ho.ck,"home37Note",[{prop:"zzz",text:"no"}]);ok(r.res.ok===false,"a note for an unknown property is refused");
 {const ps=await pub();ok(!J(ps).includes("Lake house")&&!J(ps).includes("crawlspace")&&!(ps.users||[]).some(u=>u.home37),"signed out: no My home data anywhere");
  const sp=await stateFor(pro.ck);const hu=(sp.users||[]).find(u=>u.id===ho.id);ok(!J(sp).includes("crawlspace")&&!(hu&&hu.home37),"the hired pro never gets the homeowner's My home file",J(hu&&Object.keys(hu)));
  const s2=await stateFor(ho2.ck);ok(!J(s2).includes("Lake house")&&!J(s2).includes("crawlspace"),"another homeowner doesn't either");
  const sc=await stateFor(cp.ck);ok(!J(sc).includes("crawlspace"),"the cabin's pro doesn't either");
  for(const u of ["/myhome","/myhome/"+CAB]){const h=await req(P(),"GET",u);ok(!h.body.includes("crawlspace")&&!h.body.includes("Lake house"),"signed-out "+u+" HTML carries none of it",h.status)}
  const ex=await req(P(),"GET","/api/account/export",{Cookie:ho.ck});ok(ex.status===200&&ex.body.includes("crawlspace"),"the owner's own data export includes their My home notes",ex.status)}
 r=await act(P(),ho.ck,"home37NoteDel",[NID+"x"]);ok(r.res.ok===false,"removing a note that isn't there is refused");

 // ===== 4. Browser at 390 and 1440 =====
 const SH=process.argv[2]||os.tmpdir();const SHOTS=process.env.V37_SHOTS||"";br=await chromium.launch();const errs=[];
 const page=async(w,cookie)=>{const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900},acceptDownloads:true,bypassCSP:true,hasTouch:w<500});
  if(cookie){const [k,v]=cookie.split("=");await c.addCookies([{name:k,value:v,url:LOCAL.B}])}
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return{c,p}};
 const go=async(p,u)=>{await p.goto(LOCAL.B+u,{waitUntil:"networkidle"});await p.waitForTimeout(300)};
 const shot=async(p,name,opt)=>{await p.screenshot(Object.assign({path:path.join(SH,name)},opt||{}));if(SHOTS)await p.screenshot(Object.assign({path:path.join(SHOTS,name)},opt||{}))};
 const noOverflow=async(p,lbl)=>{const ov=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);ok(ov<=0,lbl+": no sideways scroll",ov)};
 const font=async(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);return e?getComputedStyle(e).fontFamily:""},sel);
 const axe=async(p,sel,lbl)=>{if(!AXE)return;await p.addScriptTag({content:AXE});const v=await p.evaluate(async s=>(await axe.run(s,{runOnly:{type:"tag",values:["wcag2a","wcag2aa"]}})).violations.filter(x=>["serious","critical"].includes(x.impact)).map(x=>x.id+": "+x.nodes.map(n=>n.html.slice(0,60)).join(" | ")),sel);ok(!v.length,lbl+": no serious axe (WCAG A/AA) issues",v.join(" ;; "))};
 // SW-085 in the page and the Bill job costs sheet
 {const {c,p}=await page(1440,mp.ck);await go(p,"/office/money");
  const sw=await p.evaluate(()=>{const H=mk=>{const [w,f=""]=String(mk).split(".");return BigInt(w)*100n+BigInt((f+"00").slice(0,2))};
   const want=(c,mk)=>{const t=BigInt(c)*(10000n+H(mk));return Number(t/10000n+(t%10000n>=5000n?1n:0n))};const bad=[];let n=0;
   for(const mk of ["33.33","12.5","7.25","0","10","15","20","25","150","300"])for(let c=1;c<=50000;c++){n++;const got=Math.round(v36CostLine({kind:"exp",amt:c/100,date:"2026-11-15",cat:"Materials",vendor:"x"},Number(mk)).r*100);if(got!==want(c,mk)){bad.push([c,mk,got,want(c,mk)]);if(bad.length>8)break}}
   const five=[50,150,250,350,450].map(a=>v36CostLine({kind:"exp",amt:a,date:"2026-11-15"},33.33).r);return{n,bad,five,str:v36Markup("50.00","33.33%")}});
  ok(!sw.bad.length&&sw.n===500000,"SW-085: $0.01–$500 at 33.33/12.5/7.25/150/300% and 0/10/15/20/25% match integer half-up cents (500,000 checks)",J(sw.bad));
  ok(J(sw.five)===J([66.67,200,333.33,466.66,599.99]),"SW-085: $50/$150/$250/$350/$450 at 33.33% bill $66.67 / $200.00 / $333.33 / $466.66 / $599.99",J(sw.five));
  ok(sw.str===66.67,"SW-085: text inputs (\"50.00\", \"33.33%\") give the same answer",sw.str);await c.close()}
 {await act(P(),mp.ck,"addLedger",[{kind:"exp",amt:"50",cat:"Materials",vendor:"Ferguson",job:"Markup check",date:today}]);await act(P(),mp.ck,"addLedger",[{kind:"exp",amt:"450",cat:"Materials",vendor:"Supply house",job:"Markup check",date:today}]);
  const {c,p}=await page(390,mp.ck);await go(p,"/invedit/new?type=inv&jc36=1");await p.waitForSelector(".v36jc",{timeout:6000}).catch(()=>{});await p.waitForTimeout(300);
  await p.selectOption("#v36jcJ","Markup check");await p.fill("#v36jcM","33.33");await p.waitForTimeout(150);const t=await p.textContent("#v36jcS");
  ok(/\$666\.66/.test(t)&&/markup \$166\.66/.test(t),"SW-085: the sheet shows $66.67 + $599.99 = $666.66 at 33.33% (markup $166.66)",t);await c.close()}
 // Appointments: customer side
 for(const w of [390,1440]){
  const Dw=addD(today,w===390?8:9);r=await act(P(),pro.ck,"saveVisit",[{cust:CID,title:"Anode rod check "+w,date:Dw,start:"08:00",hrs:"1",win:"120",job:JID}]);const VW=r.res.id;
  {const {c,p}=await page(w,ho.ck);await go(p,"/job/"+JID);
   const card=p.locator("#v37ap-"+VW);ok(await card.count()===1,w+": the customer's job page shows the appointment card");
   ok(/Arrive 8–10am/.test(await card.textContent())&&/Please confirm/.test(await card.textContent()),w+": it shows the window and 'Please confirm'");
   ok(await card.locator('[role="status"]').count()===1,w+": the status line is a live region");
   ok(/Plus Jakarta Sans/.test(await font(p,"#v37ap-"+VW+" h2")),w+": appointment card uses Plus Jakarta Sans");
   await noOverflow(p,w+" job page with appointments");await card.scrollIntoViewIfNeeded();await p.waitForTimeout(150);
   await shot(p,"v37-appointment-customer-"+w+".png",w===390?{}:{clip:await card.boundingBox().then(b=>({x:Math.max(0,b.x-16),y:b.y-16,width:Math.min(1440,b.width+32),height:b.height+32}))});
   await axe(p,".v37aps",w+" appointment cards");
   await card.locator("[data-v37ask]").click();await p.waitForSelector("#v37as");ok(await p.locator("#v37as label[for=v37d0]").count()===1&&await p.locator("#v37as label[for=v37n]").count()===1,w+": the reschedule sheet has labeled fields");ok(/3 times per request/.test(await p.textContent("#v37as"))&&/6 requests in all/.test(await p.textContent("#v37as")),w+": the sheet copy says 3 times per request and 6 requests in all");
   const fx=await p.evaluate(()=>document.activeElement&&document.activeElement.id);ok(fx==="v37d0",w+": focus starts on the first day field",fx);
   await p.fill("#v37d0",addD(today,10));await p.fill("#v37t0","09:00");await p.fill("#v37d1",addD(today,11));await p.fill("#v37t1","13:30");await p.fill("#v37n","Any morning works, side gate");
   if(w===390){await p.waitForTimeout(400);await shot(p,"v37-reschedule-sheet-390.png")}
   await p.click("#v37asGo");await p.waitForTimeout(600);
   ok(/Reschedule asked/.test(await p.locator("#v37ap-"+VW).textContent())&&await p.locator("#v37ap-"+VW+" .v37ap-sl li").count()===2,w+": after sending, the card says 'Reschedule asked' and lists the 2 times");
   await c.close()}
  // pro: schedule chip + visit sheet shows the request; "Use this time"
  {const {c,p}=await page(w,pro.ck);const off=Math.floor((Date.parse(Dw)-Date.parse(today))/864e5);
   const mon=d=>{const x=new Date(d+"T12:00:00Z");x.setUTCDate(x.getUTCDate()-((x.getUTCDay()+6)%7));return iso(x)};const wk=Math.round((Date.parse(mon(Dw))-Date.parse(mon(today)))/(7*864e5));
   await go(p,"/schedule"+(wk?"?w="+wk:""));const chip=p.locator('.vc8[data-v="'+VW+'"]:visible').first();
   ok(await chip.count()===1&&/8–10am/.test(await chip.textContent())&&/Asked to reschedule/.test(await chip.getAttribute("aria-label")),w+": the week calendar chip shows 8–10am and says 'Asked to reschedule'",await chip.count()&&await chip.getAttribute("aria-label"));
   await chip.click();await p.waitForSelector(".v37cf");ok(await p.locator(".v37cf [data-v37pick]").count()===2&&/side gate/.test(await p.textContent(".v37cf")),w+": the visit sheet lists the customer's 2 times and note");
   ok(await p.locator("#vm-w").count()===1&&await p.locator('label[for="vm-w"]').count()===1,w+": the edit form has a labeled Arrival window picker");
   await noOverflow(p,w+" visit sheet");await p.waitForTimeout(450);await shot(p,"v37-schedule-request-"+w+".png");
   await p.locator('.v37cf [data-v37pick="1"]').click();await p.waitForTimeout(500);const vv=await p.evaluate(id=>{const v=v8Visit(id);return{d:v.date,s:v.start,c:v.conf37.s}},VW);
   ok(vv.d===addD(today,11)&&vv.s==="13:30"&&vv.c==="ok",w+": 'Use this time' moves the visit to the customer's 2nd time, confirmed",J(vv));await c.close()}
  // pro job page: Visits for this job + Schedule a visit
  {const {c,p}=await page(w,pro.ck);await go(p,"/job/"+JID);ok(await p.locator("#v37pj li").count()>=2,w+": the pro's job page lists visits for this job");
   await p.click("#v37new");await p.waitForSelector("#vm8f",{timeout:6000}).catch(()=>{});await p.waitForTimeout(300);
   const f=await p.evaluate(()=>({job:(document.querySelector('#vm8f [name=job]')||{}).value,t:(document.getElementById("vm-t")||{}).value,win:!!document.getElementById("vm-w")}));
   ok(f.win&&f.t&&/water heater/i.test(f.t)&&f.job,w+": 'Schedule a visit' opens the schedule sheet for this job with the window picker",J(f));
   await p.selectOption("#vm-w","180");await p.fill("#vm-d",addD(today,12));await p.fill("#vm-s","09:00");await p.click('#vm8f button.primary');await p.waitForTimeout(600);
   const made=await p.evaluate(()=>(DB.visits||[]).filter(v=>v.win37===180).map(v=>({j:v.job37,c:v.conf37&&v.conf37.s})));ok(made.length>=1&&made.every(x=>x.j&&x.c==="pending"),w+": the new visit is tied to the job with a 3-hour window, waiting for the customer",J(made));
   await p.evaluate(()=>{(DB.visits||[]).filter(v=>v.win37===180).forEach(v=>A.delVisit(v.id))});await c.close()}
 }
 // customer: dashboard next step + tracker confirm by keyboard
 {const {c,p}=await page(390,ho.ck);await go(p,"/dash");const na=await p.textContent(".na8-l").catch(()=>"");ok(/Confirm /.test(na),"dashboard: 'Confirm <day, window>' is a next step",na.slice(0,160));
  await go(p,"/track/"+VID2);ok(await p.locator(".tk8-side .v37ap").count()===1,"tracker: the appointment card sits in the side column");
  ok(/Arriving between/.test(await p.textContent(".tk8-eta")),"tracker: 'Arriving between 2–3pm'",await p.textContent(".tk8-eta"));
  await p.locator(".v37ap [data-v37ok]").focus();await p.keyboard.press("Enter");await p.waitForTimeout(600);
  ok(/You confirmed/.test(await p.textContent(".v37ap")),"tracker: Confirm works from the keyboard");await noOverflow(p,"390 tracker");await c.close()}
 // SW-086 in the browser: 4 confirmed visits plus a later pending confirm
 {const {c,p}=await page(390,ho.ck);await go(p,"/job/"+J86);
  ok(await p.locator("#v37ap-"+VLAST).count()===1,"SW-086: the job page shows the later visit that still needs confirm");
  ok(/Needs confirm last/.test(await p.locator("#v37ap-"+VLAST).textContent())&&/Please confirm/.test(await p.locator("#v37ap-"+VLAST).textContent()),"SW-086: that card is the pending 'Needs confirm last' visit");
  ok(await p.locator("#v37more").count()===1&&/and 1 more/.test(await p.textContent("#v37more")),"SW-086: an 'and 1 more' link is shown for the hidden confirmed visit");
  ok(await p.locator("#v37ap-"+EARLY[3]).count()===0,"SW-086: the 4th confirmed visit is behind the link until it is expanded");
  await p.click("#v37more");await p.waitForTimeout(400);
  ok(await p.locator("#v37ap-"+EARLY[3]).count()===1&&await p.locator("#v37ap-"+VLAST).count()===1&&await p.locator("#v37more").count()===0,"SW-086: 'and 1 more' expands the full list");
  await noOverflow(p,"390 job page with 5 visits");await c.close()}
 // My home
 for(const w of [390,1440]){const {c,p}=await page(w,ho.ck);await go(p,"/myhome");
  ok(await p.locator("h1").first().textContent().then(t=>/Your home/.test(t)),w+": My home opens on 'Your home'");
  ok(await p.locator(".v37tabs a").count()===2&&await p.locator('.v37tabs a[aria-current="page"]').count()===1,w+": property tabs (home + cabin), current one marked");
  ok(/water heater swap/i.test(await p.textContent(".v37jl")),w+": the hired job is filed under home");
  await noOverflow(p,w+" My home");await axe(p,"#v37home",w+" My home");
  await go(p,"/myhome/"+CAB);ok(/Lake house/.test(await p.textContent("h1"))&&/cabin deck repair/i.test(await p.textContent(".v37jl")),w+": the cabin job filed itself under the cabin by ZIP");
  ok(await p.locator(".v37nl img").count()>=1&&/crawlspace/.test(await p.textContent(".v37nl")),w+": the cabin note shows with its photo");
  await p.fill("#v37nt","Septic pumped "+w+": next due 2029");await p.click("#v37nGo");await p.waitForTimeout(500);ok(new RegExp("Septic pumped "+w).test(await p.textContent(".v37nl")),w+": a note is added from the page");
  await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(1500);await shot(p,"v37-myhome-"+w+".png",{fullPage:true});
  if(w===1440){const [dl]=await Promise.all([p.waitForEvent("download"),p.click("#v37csv")]);const txt=fs.readFileSync(await dl.path(),"utf8");
   ok(/^\ufeff/.test(txt)&&/^Date,?"?Property"?,?"?Type"?/.test(txt.replace(/^\ufeff/,""))&&/Lake house/.test(txt)&&/Your home/.test(txt)&&/cabin deck repair/i.test(txt)&&/water heater swap/i.test(txt)&&/crawlspace/.test(txt),"CSV: every property is in one file, with a Property column",txt.slice(0,400));
   await go(p,"/myhome");const [d2]=await Promise.all([p.waitForEvent("download"),p.click("#v37csv")]);const t2=fs.readFileSync(await d2.path(),"utf8");ok(/"'=HYPERLINK/.test(t2),"CSV: a note that starts with = is escaped as text",t2.split("\n").find(l=>/HYPERLINK/.test(l)));
   await p.emulateMedia({media:"print"});const pr=await p.evaluate(()=>({tabs:getComputedStyle(document.querySelector(".v37tabs")).display,btn:getComputedStyle(document.getElementById("v37print").closest(".v37act")).display,hdr:getComputedStyle(document.querySelector(".v37pr")).display,form:getComputedStyle(document.getElementById("v37nf")).display}));
   ok(pr.tabs==="none"&&pr.btn==="none"&&pr.form==="none"&&pr.hdr==="block","print: tabs, buttons and the note form are hidden; a 'Home history printed …' line shows",J(pr));
   await shot(p,"v37-myhome-print-1440.png",{fullPage:true});await p.emulateMedia({media:"screen"});
   await p.click("#v37addP");await p.waitForSelector("#v37pf");await p.fill("#v37pn","Mom's house");await p.fill("#v37pz","49431");await p.keyboard.press("Enter");await p.waitForTimeout(600);
   ok(/Mom's house/.test(await p.textContent("h1"))&&await p.locator(".v37tabs a").count()===3,"adding a property from the page opens it as a new tab");
   const sel=p.locator('[data-v37mv="job"]').first();await go(p,"/myhome");const jid=await p.locator('[data-v37mv="job"]').first().getAttribute("data-id");
   const pid=await p.evaluate(()=>v37H(me()).props.find(x=>x.name==="Mom's house").id);await p.selectOption('[data-v37mv="job"][data-id="'+jid+'"]',pid);await p.waitForTimeout(500);
   ok(await p.evaluate(([j,pp])=>v37H(me()).as["job:"+j]===pp,[jid,pid]),"the picker next to a job files it under another property");await sel.count()}
  await c.close()}
 {const {c,p}=await page(390,ho.ck);await go(p,"/homelog");ok(await p.locator('.v37hl a[href*="myhome"]').count()===1,"the home log links to My home");
  await go(p,"/dash");ok(await p.locator(".v37dc").count()===1,"the homeowner dashboard has a My home card");await c.close()}
 {const {c,p}=await page(390,null);await go(p,"/myhome");ok(await p.locator("#v37home").count()===0&&!(await p.content()).includes("Lake house"),"signed out: /myhome asks to sign in and shows nothing");await c.close()}
 {const {c,p}=await page(390,pro.ck);await go(p,"/myhome");ok(await p.locator("#v37home").count()===0&&/homeowners and businesses/.test(await p.textContent("#app")),"a pro gets a plain 'My home is for homeowners' page");await c.close()}
 {const bz=await login(P(),"demo-business@sawyer.test");const {c,p}=await page(1440,bz.ck);await go(p,"/myhome");ok(await p.locator(".v37tabs a").count()===3,"a business account sees its two locations as properties",await p.locator(".v37tabs a").count());await c.close()}
 // SW-087: with many properties, the tab rail scrolls and Add a property stays on screen
 {const have=((meOf(await stateFor(ho.ck)).home37||{}).props||[]).map(x=>x.name);
  for(let i=2;i<=10;i++){if(have.includes("North shore summer cottage "+i))continue;r=await act(P(),ho.ck,"home37Prop",[{name:"North shore summer cottage "+i,zip:"4966"+String(i%10)}]);ok(r.res.ok||/Up to 10/.test(r.res.msg||""),"SW-087: add cottage "+i,J(r.res))}}
 for(const w of [390,1440]){const {c,p}=await page(w,ho.ck);await go(p,"/myhome");
  await noOverflow(p,w+" My home with many property tabs");
  const add=await p.locator("#v37addP").boundingBox();const vp=p.viewportSize();
  ok(add&&add.x>=0&&add.x+add.width<=vp.width+1&&add.y>=0&&add.y+Math.min(add.height,40)<=vp.height,"SW-087 "+w+": 'Add a property' stays on screen",J({add,vp}));
  const rail=await p.evaluate(()=>{const nav=document.getElementById("v37tabs"),sc=document.getElementById("v37tabsSc");if(!nav)return null;nav.scrollLeft=0;const can=nav.scrollWidth>nav.clientWidth+2;nav.scrollLeft=nav.scrollWidth;const last=nav.querySelector("a:last-of-type");const r=last&&last.getBoundingClientRect();const add=document.getElementById("v37addP").getBoundingClientRect();return{can,tabs:nav.querySelectorAll("a").length,hasR:!!(sc&&sc.classList.contains("has-r")||nav.scrollLeft>2),lastX:r&&r.left,addX:add.left}});
  ok(rail&&rail.tabs>=10&&rail.can,"SW-087 "+w+": the property rail scrolls horizontally when there are many places",J(rail));
  ok(rail&&rail.lastX!=null&&rail.lastX<rail.addX,"SW-087 "+w+": scrolling the rail reaches the last property without covering Add a property",J(rail));
  await c.close()}
 ok(!errs.length,"no page errors",errs.join(" | "));
}catch(e){failed++;console.log("FAIL crashed: "+(e&&e.stack||e))}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL);try{PS&&PS.srv.close()}catch(e){}
 console.log(failed?"\n"+failed+" FAILED":"\nALL PASS");process.exit(failed?1:0)}})();
