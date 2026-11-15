// v36 end-to-end. Self-contained: starts its own Sawyer server (local test mode). Covers health 2.19.0-sawyer / SW cache
// sawyer-v36, SW-082 (a deleted contractor's traveler calls leave signed-out state and /t/<id>, incl. filled calls; hired
// travelers keep a closed record; boot tidy for older deletes), SW-080 (Unicode minus / dash budgets parse as no budget),
// SW-081 (staff accounts never link as Office customers or get statements), the hours-log date message, Bill job costs
// (receipts and trips onto an invoice, markup, one live invoice per receipt, void frees them, customer copy has no receipt
// ids), and Photos of the work on invoices (own uploads only, 8 max, tags/captions, customer gallery + full-size view),
// at 390 and 1440. Usage: node test/v36-e2e.js [shots dir]
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib"),crypto=require("crypto");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra,keepDir){
 const dir=keepDir||fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v36-"));
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
const DN=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const iso=d=>d.toISOString().slice(0,10);
const addD=(s,n)=>{const d=new Date(s+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return iso(d)};
const monOf=s=>{const d=new Date(s+"T12:00:00Z");d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return iso(d)};
(async()=>{try{
 LOCAL=await startApp(await freePort());const P=()=>LOCAL.port;
 const hz=(await req(P(),"GET","/healthz")).json||{};ok(hz.v==="2.19.0-sawyer","healthz reports 2.19.0-sawyer",J(hz));
 {const sw=await req(P(),"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v36"/.test(sw.body),"service worker cache is sawyer-v36 (client assets changed)")}
 const run=Math.random().toString(36).slice(2,8);
 const signupPro=async(tag,trade,zip)=>{const r=await req(P(),"POST","/api/signup",JH,J({kind:"pro",password:"v36-correct-horse",data:{name:"Vee "+tag,biz:"V36 "+tag+" "+run,email:"v36-"+tag+"-"+run+"@example.com",trade:trade||"Plumbing",zip:zip||"78704",phone:"5125550100",plan:"founding"}}));return{ck:sigCk(r),id:stateOf(r).me,email:"v36-"+tag+"-"+run+"@example.com"}};
 const signupHo=async(tag)=>{const r=await req(P(),"POST","/api/signup",JH,J({kind:"customer",password:"v36-correct-horse",data:{name:"Hana "+tag,email:"v36-ho-"+tag+"-"+run+"@example.com",zip:"78704"}}));return{ck:sigCk(r),id:stateOf(r).me,email:"v36-ho-"+tag+"-"+run+"@example.com"}};
 const pub=async()=>stateOf(await req(P(),"GET","/api/state"));
 const stateFor=async ck=>stateOf(await req(P(),"GET","/api/state",{Cookie:ck}));
 const meOf=st=>(st.users||[]).find(u=>u.id===st.me)||{};
 const delAcct=ck=>post(P(),ck,"/api/account/delete",{confirm:"DELETE"});
 const getT=async(id,ck)=>req(P(),"GET","/t/"+id,ck?{Cookie:ck}:{});

 // ===== 1. SW-082: a deleted contractor's traveler calls leave the catalog =====
 {const callO={trade:"Electrical",title:"V36 call open "+run,loc:"Ashburn",state:"VA",weeks:12,hours:"6x10s",rate:48,perDiem:120,lic:"Journeyman",start:addD(iso(new Date()),-10),need:2,type:"Data center",desc:"V36 private-ish description "+run};
  const own=await signupPro("tcown","Electrical","20147");
  let r=await act(P(),own.ck,"postTravel",[callO]);const open=r.res.id;ok(r.res.ok&&open,"SW-082 setup: a throwaway contractor posts an open call",J(r.res));
  r=await act(P(),own.ck,"postTravel",[Object.assign({},callO,{title:"V36 call filled "+run,need:1})]);const filled=r.res.id;
  r=await act(P(),own.ck,"postTravel",[Object.assign({},callO,{title:"V36 call staffed "+run,need:3})]);const staffed=r.res.id;
  const mkTrav=async tag=>{const t=await signupHo(tag);await act(P(),t.ck,"saveTravel",[{trade:"Electrical",headline:"Journeyman wireman",home:"Ludington, MI",lic:[{type:"Journeyman",state:"MI"}],states:["VA","MI"],availNow:true,yrs:8,osha:"OSHA 30"}]);return t};
  const t1=await mkTrav("tv1"),t2=await mkTrav("tv2"),t3=await mkTrav("tv3");
  // the 1-spot call fills with one hire; the 3-spot call has one hire and one pending applicant; the open call has only a pending applicant
  r=await act(P(),t1.ck,"applyTravel",[filled,"Ready"]);r=await act(P(),own.ck,"decideTravel",[filled,t1.id,true]);
  let ps=await pub();ok(((ps.tcalls||[]).find(c=>c.id===filled)||{}).status==="filled","setup: the 1-spot call is filled by a hire");
  await act(P(),t2.ck,"applyTravel",[staffed,"Ready"]);await act(P(),own.ck,"decideTravel",[staffed,t2.id,true]);await act(P(),t3.ck,"applyTravel",[staffed,"Pending one"]);
  await act(P(),t3.ck,"applyTravel",[open,"Pending on open"]);await act(P(),t3.ck,"saveCall",[open]);
  ok((await getT(open)).status===200,"before delete: /t/<open call> is 200 signed out");
  const d=await delAcct(own.ck);ok(d.status===200,"the contractor deletes their account",d.status+" "+d.body.slice(0,120));
  ps=await pub();const ids=(ps.tcalls||[]).map(c=>c.id);
  ok(![open,filled,staffed].some(x=>ids.includes(x)),"SW-082: none of the deleted contractor's calls (open, filled, staffed) are in signed-out /api/state tcalls",J(ids));
  ok(!(ps.tcalls||[]).some(c=>c.by===own.id),"signed out: no call by the deleted account at all");
  for(const [id,lbl] of [[open,"open"],[filled,"filled"],[staffed,"staffed"]]){const h=await getT(id);ok(h.status===404&&!/V36 call/.test(h.body),"SW-082: /t/<"+lbl+" call> is the generic 404 signed out",h.status)}
  const unk=await getT("tcnosuchcall1");const h0=await getT(open);ok(unk.status===404&&h0.body===unk.body,"/t/<deleted id> is byte-for-byte the same page as an unknown id");
  const s3=await stateFor(t3.ck);ok(!(s3.tcalls||[]).some(c=>[open,filled,staffed].includes(c.id)),"an applicant who wasn't hired no longer gets the calls",J((s3.tcalls||[]).filter(c=>c.by===own.id).map(c=>c.id)));
  ok(!(s3.notifs||[]).some(n=>n.link==="tcall:"+open),"notices pointing at the deleted open call are gone");
  ok(!(meOf(s3).tsaved||[]).includes(open),"the deleted call is gone from the traveler's saved calls",J(meOf(s3).tsaved));
  const s1=await stateFor(t1.ck);const kc=(s1.tcalls||[]).find(c=>c.id===filled);
  ok(kc&&kc.status==="closed"&&kc.ownerGone36&&!kc.desc&&kc.rate===48,"the hired traveler keeps a closed record of the filled call with its pay terms (no description)",J(kc&&{st:kc.status,g:!!kc.ownerGone36,d:kc.desc,r:kc.rate}));
  ok((s1.notifs||[]).some(n=>n.link==="tcall:"+filled&&/was closed: the contractor deleted/.test(n.text)),"the hired traveler is told the call was closed");
  ok((await getT(filled,t1.ck)).status===200,"the hired traveler can still open /t/<filled call>");
  ok((await getT(filled,t3.ck)).status===404,"another signed-in user gets 404 for it");
  r=await act(P(),t3.ck,"applyTravel",[staffed,"again"]);ok(r.res.ok===false,"nobody can apply to a closed call",J(r.res));
  global.T1=t1;global.FILLED=filled}
 // boot tidy: a call left by an account deleted before v36 (simulated in a kept data dir)
 {const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v36-boot-"));let S=await startApp(await freePort(),null,dir);
  const pp=S.port;const sg=await req(pp,"POST","/api/signup",JH,J({kind:"pro",password:"v36-correct-horse",data:{name:"Old Poster",biz:"V36 old "+run,email:"v36-old-"+run+"@example.com",trade:"Electrical",zip:"20147",phone:"5125550100",plan:"founding"}}));
  const ck=sigCk(sg),oid=stateOf(sg).me;const pr=await req(pp,"POST","/api/act",Object.assign({Cookie:ck},JH),J({name:"postTravel",args:[{trade:"Electrical",title:"V36 orphan "+run,loc:"Reno",state:"NV",weeks:6,hours:"5x10s",rate:44,perDiem:100,lic:"Journeyman",start:addD(iso(new Date()),7),need:2,type:"Industrial"}]}));
  const cid=(pr.json&&pr.json.res&&pr.json.res.id);await stopApp(S,true);
  // simulate a pre-v36 delete: anonymize the owner row directly in the DB file, leaving the call behind
  const {DatabaseSync}=require("node:sqlite");const dbf=fs.readdirSync(dir).find(f=>/\.db$/.test(f));const db=new DatabaseSync(path.join(dir,dbf));
  const row=db.prepare("SELECT v FROM appdata WHERE k='users'").get();const us=JSON.parse(row.v);const u=us.find(x=>x.id===oid);for(const k of Object.keys(u))if(k!=="id")delete u[k];Object.assign(u,{name:"Former Sawyer member",role:"deleted",email:""});
  db.prepare("UPDATE appdata SET v=? WHERE k='users'").run(JSON.stringify(us));db.close();
  S=await startApp(await freePort(),null,dir);const ps=stateOf(await req(S.port,"GET","/api/state"));
  ok(cid&&!(ps.tcalls||[]).some(c=>c.id===cid)&&/SW-082: tidied 1/.test(S.log()),"boot tidy: a call whose poster was deleted before v36 is removed at start",J({cid,log:S.log().slice(-300)}));
  ok((ps.tcalls||[]).length>=5,"demo calls are untouched by the tidy",(ps.tcalls||[]).length);await stopApp(S)}

 // ===== 2. SW-080: Unicode minus / dashes on a budget parse like ASCII "-500" =====
 {const lp=await signupPro("lf","Plumbing","78704"),ho=await signupHo("lf");
  const postJ=async(title,o)=>{const r=await act(P(),ho.ck,"postJob",[Object.assign({title:title+" "+run,cat:"Plumbing",sub:"Drain cleaning",desc:"V36 budget test.",zip:"78704",budget:"$600–900",when:"This week"},o||{})]);return r.res&&r.res.id};
  const bells=async jid=>((await stateFor(lp.ck)).notifs||[]).filter(n=>n.link==="job:"+jid&&/^New /.test(n.text)).length;
  await act(P(),lp.ck,"leadFilters35",[{min:1000,nob:true,urg:true,skip:[]}]);
  let j=await postJ("V36 small",{budget:"$500–800"});ok(j&&await bells(j)===0,"control: a $500–800 job is under the $1,000 minimum (no bell)");
  for(const [b,lbl] of [["-500","ASCII -500"],["\u2212500","U+2212 −500"],["\u2013500","en dash –500"],["\u2014500","em dash —500"],["$\u2212500","$−500"],[" \u2212 500"," − 500"],["\uff0d500","fullwidth －500"]]){
   const jj=await act(P(),ho.ck,"postJob",[{title:"V36 neg2 "+lbl+" "+run,cat:"Plumbing",sub:"Drain cleaning",desc:"V36 budget test.",zip:"78704",budget:b,when:"This week"}]);
   ok(jj.res.id&&await bells(jj.res.id)===1,"SW-080: budget "+JSON.stringify(b)+" ("+lbl+") parses as no budget, so the bell rings like TBD")}
  j=await postJ("V36 big",{budget:"$1,500"});ok(j&&await bells(j)===1,"control: $1,500 still passes the minimum");
  const dp=await login(P(),"demo-pro@sawyer.test");
  const pj=await act(P(),ho.ck,"postJob",[{title:"V36 guide "+run,cat:"Plumbing",sub:"Water heaters",desc:"V36 guide test.",zip:"78704",budget:"\u2212500",when:"This week"}]);
  global.GUIDEJOB=pj.res.id}

 // ===== 3. SW-081: staff accounts never link as Office customers =====
 {const dp=await login(P(),"demo-pro@sawyer.test");
  let r=await act(P(),dp.ck,"saveCust",[{name:"Trust team",email:"demo-trust@sawyer.test"}]);let c=(r.st.bcust||[]).find(x=>x.id===r.res.id);
  ok(r.res.ok&&c&&c.uid==null,"SW-081: saveCust with demo-trust@sawyer.test (staff) stays unlinked",J(c&&{uid:c.uid}));
  r=await act(P(),dp.ck,"saveCust",[{name:"Trust team caps",email:"  DEMO-TRUST@sawyer.test "}]);c=(r.st.bcust||[]).find(x=>x.id===r.res.id);ok(c&&c.uid==null,"SW-081: case/space variants of the staff email stay unlinked too");
  r=await act(P(),dp.ck,"saveCust",[{name:"Trust uid",email:"x-"+run+"@example.com",uid:"a1"}]);c=(r.st.bcust||[]).find(x=>x.id===r.res.id);ok(c&&c.uid==null,"SW-081: a supplied staff uid is ignored");
  const b=await act(P(),dp.ck,"saveBill",[{type:"inv",cust:c.id,title:"Staff bill",lines:[{d:"Labor",q:1,r:50}],tax:0}]);await act(P(),dp.ck,"sendBill",[b.res.id]);
  r=await act(P(),dp.ck,"stmt35",[(r.st.bcust||[]).find(x=>x.name==="Trust team").id]);ok(r.res.ok===false&&/isn't on Sawyer/.test(r.res.msg),"SW-081: no in-app statement to the staff account",J(r.res));
  const st=await login(P(),"demo-trust@sawyer.test");ok(!(st.st.notifs||[]).some(n=>/statement|sent you invoice/.test(n.text)),"the staff account got no statement or invoice notice");
  ok(!(st.st.bills||[]).length,"the staff account has no bills addressed to it");
  const ho=await signupHo("stmt81");r=await act(P(),dp.ck,"saveCust",[{name:"Real Hana",email:ho.email}]);c=(r.st.bcust||[]).find(x=>x.id===r.res.id);ok(c&&c.uid===ho.id,"a real customer email still links (SW-077 unchanged)")}

 // ===== 4. hours-log date message matches the rule =====
 {const tv=await login(P(),"demo-traveler@sawyer.test");const today=iso(new Date());
  let r=await act(P(),tv.ck,"tlogDay35",["tcd1",addD(today,1),8]);const fmt=new Date(today+"T12:00:00Z").toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"UTC"});
  ok(r.res.ok===false&&r.res.msg==="Log days up to today ("+fmt+"), from the last 400 days.","hours log: tomorrow is refused with a message naming the server's today ("+fmt+")",J(r.res));
  r=await act(P(),tv.ck,"tlogDay35",["tcd1",addD(today,-401),8]);ok(r.res.ok===false&&/last 400 days/.test(r.res.msg),"401 days back is refused with the same message");
  r=await act(P(),tv.ck,"tlogDay35",["tcd1",addD(today,-399),8]);ok(r.res.ok===true,"399 days back is accepted (the message's 400-day window)",J(r.res));
  await act(P(),tv.ck,"tlogDay35",["tcd1",addD(today,-399),""]);
  r=await act(P(),tv.ck,"tlogDay35",["tcd1",today,"\u22125"]);ok(r.status===400,"SW-078 still: a Unicode minus on hours is 400")}

 // ===== 5. Bill job costs =====
 const jp=await signupPro("jc","Plumbing","78704"),jho=await signupHo("jc");
 let JBILL=null,PBILL=null,U1=null,U2=null;
 {let r=await act(P(),jp.ck,"saveCust",[{name:"Hana Costs",email:jho.email,addr:"12 Oak St"}]);const cid=r.res.id;ok(((r.st.bcust||[]).find(c=>c.id===cid)||{}).uid===jho.id,"job costs setup: the customer is linked by email");
  const day=n=>addD(iso(new Date()),-n);
  const led=[];for(const o of [{kind:"exp",amt:"212.40",cat:"Materials",vendor:"Ferguson",job:"Kitchen remodel",date:day(3)},{kind:"exp",amt:"38.15",cat:"Dump fees",vendor:"City transfer station",job:"Kitchen remodel",date:day(2)},{kind:"mile",miles:"24",from:"Shop",to:"12 Oak St",job:"Kitchen remodel",date:day(2)},{kind:"exp",amt:"55",cat:"Materials",vendor:"Home Depot",job:"Other job",date:day(1)}]){r=await act(P(),jp.ck,"addLedger",[o]);ok(r.res.ok,"log "+o.kind+" "+(o.vendor||o.to),J(r.res))}
  const L=(r.st.ledger||[]).filter(x=>x.by===jp.id);const fer=L.find(x=>x.vendor==="Ferguson"),dump=L.find(x=>x.vendor==="City transfer station"),mi=L.find(x=>x.kind==="mile"),hd=L.find(x=>x.vendor==="Home Depot");
  ok(fer&&dump&&mi&&hd,"four ledger rows are logged");
  for(const bad of ["-5","\u22125","101","abc"]){r=await act(P(),jp.ck,"mk36",[bad]);ok(r.res.ok===false&&/0% to 100%/.test(r.res.msg),"markup "+JSON.stringify(bad)+" is refused",J(r.res))}
  r=await act(P(),jp.ck,"mk36",["15%"]);ok(r.res.ok&&meOf(r.st).mk36===15,"markup 15% is saved for the pro",J(r.res));
  r=await act(P(),jho.ck,"mk36",[10]);ok(r.res.ok===false,"a homeowner can't set a markup");
  const lines=[{d:"Labor",q:4,r:95},{d:"Materials: Ferguson",q:1,r:244.26,l36:fer.id},{d:"Dump fees",q:1,r:43.87,l36:dump.id},{d:"Mileage",q:24,r:0.7,l36:mi.id}];
  r=await act(P(),jp.ck,"saveBill",[{type:"inv",cust:cid,title:"Kitchen remodel",job:"Kitchen remodel",lines,tax:0}]);JBILL=r.res.id;
  ok(r.res.ok&&r.res.costs36===3,"saveBill with 3 cost lines reports 3 job costs billed",J(r.res));
  let led2=(r.st.ledger||[]);ok([fer,dump,mi].every(x=>(led2.find(y=>y.id===x.id)||{}).billed36===JBILL)&&!(led2.find(y=>y.id===hd.id)||{}).billed36,"those 3 ledger rows are marked billed on the invoice; the other job's receipt isn't");
  let bill=(r.st.bills||[]).find(b=>b.id===JBILL);ok(bill&&bill.lines.filter(l=>l.l36).length===3,"the pro's copy keeps which line came from which receipt");
  r=await act(P(),jp.ck,"saveBill",[{type:"inv",cust:cid,title:"Double bill",lines:[{d:"Ferguson again",q:1,r:212.4,l36:fer.id},{d:"HD",q:1,r:55,l36:hd.id}],tax:0}]);const dbl=r.res.id;led2=r.st.ledger||[];
  ok(r.res.ok&&(led2.find(y=>y.id===fer.id)||{}).billed36===JBILL&&(led2.find(y=>y.id===hd.id)||{}).billed36===dbl&&!((r.st.bills||[]).find(b=>b.id===dbl).lines[0].l36),"a receipt already on a live invoice can't go on a second one (that line stays a plain line)",J(r.res));
  const other=await signupPro("jc2");const ol=await act(P(),other.ck,"addLedger",[{kind:"exp",amt:"9.99",cat:"Materials",vendor:"Not yours",date:day(1)}]);const oid=(ol.st.ledger||[]).find(x=>x.by===other.id).id;
  r=await act(P(),jp.ck,"saveBill",[{id:dbl,type:"inv",cust:cid,title:"Double bill",lines:[{d:"HD",q:1,r:55,l36:hd.id},{d:"Injected",q:1,r:9.99,l36:oid}],tax:0}]);
  ok(!((r.st.bills||[]).find(b=>b.id===dbl).lines.some(l=>l.l36===oid)),"another pro's receipt id is ignored");
  const so=await stateFor(other.ck);ok(!(so.ledger||[]).find(x=>x.id===oid).billed36,"and their receipt is untouched");
  ok(!(so.users||[]).some(u=>u.id===jp.id&&u.mk36!==undefined),"another pro doesn't see the markup");ok(!((await pub()).users||[]).some(u=>u.mk36!==undefined),"signed out: no markup");
  await act(P(),jp.ck,"sendBill",[JBILL]);
  const hs=await stateFor(jho.ck);const hb=(hs.bills||[]).find(b=>b.id===JBILL);ok(hb&&hb.lines.length===4&&!hb.lines.some(l=>"l36" in l),"the customer's copy has plain lines (no receipt ids)",J(hb&&hb.lines));
  ok(!(hs.ledger||[]).length,"the customer never gets the pro's ledger");
  r=await act(P(),jp.ck,"voidBill",[dbl]);ok(r.res.ok&&!(r.st.ledger||[]).find(y=>y.id===hd.id).billed36,"voiding an invoice frees its receipts again");
  global.JP=jp;global.JHO=jho;global.JCID=cid}

 // ===== 6. Photos of the work on invoices =====
 {const up=async(ck,file,type)=>{const buf=fs.readFileSync(path.join(ROOT,file));const r=await req(P(),"POST","/api/upload",{Cookie:ck,"Content-Type":type||"image/webp","Content-Length":buf.length},buf);return r.json&&r.json.url};
  U1=await up(JP.ck,"public/img/g-wall-pipes.webp");U2=await up(JP.ck,"public/img/g-copper.webp");ok(/^\/u\/[a-f0-9]{32}\.webp$/.test(U1||"")&&/^\/u\//.test(U2||""),"two job photos upload",U1+" "+U2);
  let r=await act(P(),JP.ck,"billPhotos36",[JBILL,[{src:U1,tag:"before",cap:"Old galvanized line"},{src:U2,tag:"after",cap:"New copper, pressure tested"},{src:U1,tag:"after"}]]);
  let b=(r.st.bills||[]).find(x=>x.id===JBILL);ok(r.res.ok&&b&&b.ph36.length===2&&b.ph36[0].tag==="before"&&b.ph36[1].cap==="New copper, pressure tested","billPhotos36 stores 2 tagged photos with captions (duplicates dropped)",J(r.res));
  const o2=await signupPro("ph2");const U3=await up(o2.ck,"public/img/g-drain.webp");
  r=await act(P(),JP.ck,"billPhotos36",[JBILL,[{src:U3,tag:"after"}]]);ok(r.res.ok===false&&/couldn't be added/.test(r.res.msg),"another account's upload can't be put on the invoice",J(r.res));
  r=await act(P(),JP.ck,"billPhotos36",[JBILL,[{src:U1},{src:U2},{src:U3}]]);b=(r.st.bills||[]).find(x=>x.id===JBILL);ok(r.res.ok&&b.ph36.length===2&&!b.ph36.some(p=>p.src===U3),"a mixed list keeps only the pro's own photos");
  r=await act(P(),JP.ck,"billPhotos36",[JBILL,[{src:"/img/hero.webp"}]]);ok(r.res.ok===false,"a stock image path is refused");
  r=await act(P(),JP.ck,"billPhotos36",[JBILL,Array.from({length:9},(_,i)=>({src:i%2?U1:U2}))]);ok(r.res.ok===false&&/Up to 8/.test(r.res.msg),"more than 8 photos is refused",J(r.res));
  r=await act(P(),JHO.ck,"billPhotos36",[JBILL,[]]);ok(r.res.ok===false,"the customer can't change the pro's photos");
  r=await act(P(),o2.ck,"billPhotos36",[JBILL,[{src:U3}]]);ok(r.res.ok===false,"another pro can't add photos to it");
  await act(P(),JP.ck,"billPhotos36",[JBILL,[{src:U1,tag:"before",cap:"Old galvanized line"},{src:U2,tag:"after",cap:"New copper, pressure tested"}]]);
  const hs=await stateFor(JHO.ck);const hb=(hs.bills||[]).find(x=>x.id===JBILL);ok(hb&&hb.ph36&&hb.ph36.length===2,"the customer sees the 2 photos on the invoice");
  ok(!((await pub()).bills||[]).length,"signed out: no bills or photos");
  const ph=await req(P(),"GET",U1);ok(ph.status===200,"the photo is served");
  // a draft can also hold photos; removing all of them works
  r=await act(P(),JP.ck,"saveBill",[{type:"est",cust:JCID,title:"Bath estimate",lines:[{d:"Labor",q:2,r:95}],tax:0}]);const est=r.res.id;
  r=await act(P(),JP.ck,"billPhotos36",[est,[{src:U1,tag:"before"}]]);ok(r.res.ok,"an estimate can carry photos too");
  r=await act(P(),JP.ck,"billPhotos36",[est,[]]);ok(r.res.ok&&!(r.st.bills||[]).find(x=>x.id===est).ph36.length,"an empty list removes them");
  PBILL=JBILL}

 // ===== 7. Browser (390 + 1440) =====
 const SH=process.argv[2]||os.tmpdir();br=await chromium.launch();const errs=[];
 const page=async(w,cookie)=>{const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900}});
  if(cookie){const [k,v]=cookie.split("=");await c.addCookies([{name:k,value:v,url:LOCAL.B}])}
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return{c,p}};
 const go=async(p,u)=>{await p.goto(LOCAL.B+u,{waitUntil:"networkidle"});await p.waitForTimeout(250)};
 const noOverflow=async(p,lbl)=>{const ov=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);ok(ov<=0,lbl+": no sideways scroll",ov)};
 const font=async(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);return e?getComputedStyle(e).fontFamily:""},sel);
 for(const w of [390,1440]){
  const JOB="Bath refresh "+w;for(const o of [{kind:"exp",amt:"126.80",cat:"Materials",vendor:"Ferguson Supply",job:JOB,date:addD(iso(new Date()),-1)},{kind:"exp",amt:"42.50",cat:"Permits",vendor:"City of Austin",job:JOB,date:addD(iso(new Date()),-1)},{kind:"mile",miles:"18.5",from:"Shop",to:"Oak St",job:JOB,date:iso(new Date())}])await act(P(),JP.ck,"addLedger",[o]);
  {const {c,p}=await page(w,JP.ck);await go(p,"/office/money");
   ok(await p.locator("#v36ub").count()===1&&/Not billed yet: \$/.test(await p.textContent("#v36ub")),w+": Expenses shows 'Not billed yet' with a total");
   ok(await p.locator(".v36bl",{hasText:"Billed on"}).count()>=3,w+": receipts on an invoice say 'Billed on INV-…'");
   ok(/Plus Jakarta Sans/.test(await font(p,"#v36ub b")),w+": uses Plus Jakarta Sans");
   await noOverflow(p,w+" expenses");await p.screenshot({path:path.join(SH,"v36-expenses-"+w+".png")});
   await p.click("#v36ub a.btn");await p.waitForSelector(".v36jc",{timeout:5000}).catch(()=>{});await p.waitForTimeout(450);
   ok(await p.locator(".v36jc").count()===1,w+": 'Bill job costs' opens the editor with the job-costs sheet");
   await p.selectOption("#v36jcJ",JOB);await p.waitForTimeout(100);
   ok(await p.locator("#v36jcL [data-v36c]").count()===3,w+": picking the job lists its 3 unbilled costs");
   await p.click('[data-v36mk="10"]');await p.waitForTimeout(100);const s=await p.textContent("#v36jcS");
   const want=Math.round((126.8*1.1)*100)/100+Math.round((42.5*1.1)*100)/100+18.5*0.7;
   ok(s.includes("Adds 3 lines")&&s.includes("$"+want.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})),w+": summary shows 3 lines with a 10% markup on receipts ("+s+")",want);
   await noOverflow(p,w+" job-costs sheet");if(w===390)await p.screenshot({path:path.join(SH,"v36-jobcosts-sheet-"+w+".png")});else await p.locator("#modal .mbox").screenshot({path:path.join(SH,"v36-jobcosts-sheet-"+w+".png")}).catch(()=>p.screenshot({path:path.join(SH,"v36-jobcosts-sheet-"+w+".png")}));
   await p.click("#v36jcGo");await p.waitForTimeout(400);
   const lines=await p.evaluate(()=>[...document.querySelectorAll('input[data-f="d"]')].map(i=>i.value));ok(lines.length===3&&/^Materials: Ferguson Supply/.test(lines[0])&&/^Mileage: Shop → Oak St/.test(lines[2]),w+": the lines land on the invoice",J(lines));
   ok(await p.inputValue("#be-j")===JOB,w+": the job name is filled in");ok(await p.locator("#v36jcOn").count()===1,w+": the editor notes the lines came from logged costs");
   if(w===390){await p.selectOption("#be-c",{label:"Hana Costs"});await p.waitForTimeout(150);await p.click("#bedSave");await p.waitForTimeout(700);
    const st=await p.evaluate(J=>{const b=(DB.bills||[]).filter(x=>x.job===J).pop();const L=(DB.ledger||[]).filter(l=>l.job===J);return{b:b&&b.id,n:b&&b.lines.filter(l=>l.l36).length,billed:L.filter(l=>l.billed36===(b&&b.id)).length,mk:me().mk36}},JOB);
    ok(st.n===3&&st.billed===3&&st.mk===10,"saving from the editor marks the 3 costs billed and remembers the 10% markup",J(st))}
   await c.close()}
  // pro: photos card on the invoice
  {const {c,p}=await page(w,JP.ck);await go(p,"/invoice/"+PBILL);
   ok(await p.locator("#v36pc").count()===1&&await p.locator("#v36pc .v36pc-l li").count()===2,w+": the pro's invoice page has 'Photos of the work' with the 2 photos");
   ok(await p.locator("#paper .v36g img").count()===2,w+": the photos sit on the invoice itself");
   await noOverflow(p,w+" pro invoice");await p.screenshot({path:path.join(SH,"v36-invoice-pro-"+w+".png"),fullPage:w===1440});
   if(w===1440){await p.selectOption("#v36t0","during");await p.waitForTimeout(500);const t=await p.evaluate(id=>v7Bill(id).ph36[0].tag,PBILL);ok(t==="during","changing a tag saves it",t);await p.selectOption("#v36t0","before");await p.waitForTimeout(400)}
   await c.close()}
  // customer: the gallery + full-size view
  {const {c,p}=await page(w,JHO.ck);await go(p,"/invoice/"+PBILL);
   ok(await p.locator(".v36g img").count()===2&&await p.locator(".v36g-before").count()===1&&await p.locator(".v36g-after").count()===1,w+": the customer sees Before / After photos on the invoice");
   ok(await p.locator("#v36pc").count()===0,w+": the customer has no photo editor");
   const cls=await p.evaluate(()=>{const i=document.querySelector(".v36g img");return i&&i.getAttribute("width")&&i.getAttribute("height")});ok(!!cls,w+": gallery images carry width/height");
   await p.locator(".v36g").scrollIntoViewIfNeeded();await p.waitForTimeout(300);await noOverflow(p,w+" customer invoice");
   await p.locator(".v36g").screenshot({path:path.join(SH,"v36-invoice-photos-"+w+".png")});
   await p.click('[data-v36ph="0"]');await p.waitForSelector(".v36lb img");ok(/Before photo/.test(await p.textContent(".v36lb h2")),w+": tapping a photo opens it full size");
   await p.click("#v36lbN");await p.waitForTimeout(150);ok(/After photo/.test(await p.textContent(".v36lb h2")),w+": next goes to the After photo");
   if(w===390)await p.screenshot({path:path.join(SH,"v36-photo-lightbox-"+w+".png")});
   await c.close()}
 }
 // SW-082 in the browser: the hired traveler sees the closed note; signed out /t/<id> is Not found
 {const {c,p}=await page(1440,T1.ck);await go(p,"/t/"+FILLED);ok(await p.locator(".v36gone").count()===1,"the hired traveler's call page says it's closed because the contractor deleted their account");await c.close()}
 {const {c,p}=await page(390,null);const r=await p.goto(LOCAL.B+"/t/"+FILLED);ok(r.status()===404&&!/V36 call/.test(await p.content()),"signed out: /t/<deleted call> is Not found in a browser");await c.close()}
 // SW-080 on the public job page: a −500 budget isn't compared with the guide
 {const {c,p}=await page(1440,null);await go(p,"/job/"+GUIDEJOB);const t=await p.evaluate(()=>{const e=document.querySelector(".v25b");return e?e.innerText:""});ok(!/Posted budget/.test(t)&&!/under the usual range/.test(t),"SW-080: the job page doesn't compare a −500 budget with the price guide",t.slice(0,160));await c.close()}
 ok(errs.length===0,"no page errors",J(errs.slice(0,5)));
}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL)}
 console.log(failed?"FAIL v36-e2e: "+failed+" failed":"PASS v36-e2e: all checks passed");process.exit(failed?1:0)})();
