// v46 end-to-end. Self-contained: starts its own Sawyer servers (local test mode, no real email or SMS, payments in test
// mode). Covers health 2.29.0-sawyer / SW cache sawyer-v46 (or later), and:
// SW-107: /hire/<trade>/<city> slugs in any letter case 301 to the canonical lowercase page (query string kept); slugs that
//   don't exist (spaces, underscores, unknown trades or cities) are still real 404s with noindex, in beta and indexable mode.
// Bills to pay (Office -> Expenses & mileage): see the section header below.
// Usage: node test/v46-e2e.js [shots dir]
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
 const created=!dir;dir=dir||fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v46-"));
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
 const SH=process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),"v46-shots-"));fs.mkdirSync(SH,{recursive:true});
 const L=await startApp();SERVERS.push(L);
 const act=async(S,ck,name,args)=>{const r=await req(S.port,"POST","/api/act",Object.assign(ck?{Cookie:ck}:{},JH),J({name,args}));return {res:(r.json&&r.json.res)||{},st:stateOf(r),status:r.status,error:r.json&&r.json.error}};
 const stateFor=async(S,ck)=>stateOf(await req(S.port,"GET","/api/state",ck?{Cookie:ck}:{}));
 const signup=async(S,kind,tag,zip,extra)=>{const email="v46-"+tag+"-"+run+"@example.com";const data=Object.assign({name:(kind==="pro"?"Val ":"Hana ")+tag,email,zip},kind==="pro"?{biz:"V46 "+tag+" "+run,trade:"Plumbing",phone:"5125550100",plan:"founding"}:{},extra||{});
  const r=await req(S.port,"POST","/api/signup",JH,J({kind,password:"v46-correct-horse",data}));return{status:r.status,error:r.json&&r.json.error,ck:sigCk(r),id:stateOf(r).me,st:stateOf(r),email}};
 br=await chromium.launch();
 const page=async(S,w,ck)=>{const c=await br.newContext({viewport:{width:w,height:w<500?844:900},deviceScaleFactor:w<500?2:1,bypassCSP:true,hasTouch:w<500});
  if(ck){const [k,v]=ck.split("=");await c.addCookies([{name:k,value:v,url:S.B}])}
  const p=await c.newPage();return{c,p}};
 const go=async(S,p,u,sel)=>{await p.goto(S.B+u,{waitUntil:"networkidle"});await p.waitForFunction(()=>typeof __PART!=="undefined"&&!__PART&&typeof me==="function",null,{timeout:60000,polling:100});if(sel)await p.waitForSelector(sel,{timeout:20000}).catch(()=>{})};
 const ymd=d=>new Date(Date.now()+d*864e5).toISOString().slice(0,10);

 // --- release
 {const hz=(await req(L.port,"GET","/healthz")).json||{};ok(/^2\.(29|[3-9]\d)\.\d+-sawyer$/.test(hz.v||""),"healthz reports a Sawyer version from 2.29.0 on",J(hz));
  const sw=await req(L.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v(4[6-9]|[5-9]\d)"/.test(sw.body),"service worker cache is sawyer-v46 or later")}

 // --- SW-107: hire slugs are case-insensitive and canonicalize with a 301
 for(const S of [L,await (async()=>{const I=await startApp({SAWYER_INDEXABLE:"1",SAWYER_BASE_URL:"https://sawyer.example"});SERVERS.push(I);return I})()]){const tag=S===L?"beta":"indexable";
  const R=async(u,m)=>{const r=await req(S.port,m||"GET",u);return{s:r.status,loc:r.headers.location||"",h:r.headers,b:r.body||""}};
  for(const [u,to] of [["/hire/Plumbing/austin-tx","/hire/plumbing/austin-tx"],["/hire/plumbing/Austin-TX","/hire/plumbing/austin-tx"],["/hire/PLUMBING/AUSTIN-TX","/hire/plumbing/austin-tx"],["/HIRE/Plumbing/Austin-TX/","/hire/plumbing/austin-tx"],["/hire/Plumbing","/hire/plumbing"],["/hire/Austin-TX","/hire/austin-tx"],["/Hire","/hire"],["/hire/Solar-Energy/Missoula-MT","/hire/solar-energy/missoula-mt"]]){
   const x=await R(u);ok(x.s===301&&x.loc===to,tag+": "+u+" 301s to "+to,x.s+" "+x.loc)}
  {const x=await R("/hire/Plumbing/Austin-TX?zip=78704&utm_source=flyer");ok(x.s===301&&x.loc==="/hire/plumbing/austin-tx?zip=78704&utm_source=flyer",tag+": the query string is kept on the redirect",x.loc)}
  {const x=await R("/hire/Plumbing/Austin-TX","HEAD");ok(x.s===301&&x.loc==="/hire/plumbing/austin-tx",tag+": HEAD redirects too",x.s)}
  {const x=await R("/hire/plumbing/austin-tx");ok(x.s===200&&/<title>Plumbers in Austin, TX · Sawyer<\/title>/.test(x.b),tag+": the canonical lowercase page is a 200 (no redirect loop)",x.s)}
  for(const u of ["/hire/plumbing/austin%20tx","/hire/Plumbing/Austin%20TX","/hire/plumbing/austin_tx","/hire/Plumbing_X/Austin-TX","/hire/Nope/Austin-TX","/hire/plumbing/Nowhere","/hire/Plumbing/Austin-TX/Extra","/hire/Austin-TX/Plumbing","/hire/nope"]){
   const x=await R(u);ok(x.s===404&&/noindex/.test(String(x.h["x-robots-tag"]||"")),tag+": "+u+" stays a real 404 with noindex",x.s+" "+x.loc+" "+x.h["x-robots-tag"])}}

 // --- Bills to pay (Office -> Expenses & mileage). API: validation, pro-only, private; paid logs an expense; undo; monthly;
 //     delete; deleting the expense reopens; refused while billed on a live invoice; sweep reminders; demo samples. UI 390/1300.
 const P=await signup(L,"pro","ap","78704"),C=await signup(L,"customer","apcu","78704"),X=await signup(L,"pro","apx","78704");
 ok(P.ck&&C.ck&&X.ck,"a pro, a customer and a second pro sign up",J([P.error,C.error,X.error]));
 const apOf=async ck=>{const st=await stateFor(L,ck);const meU=(st.users||[]).find(u=>u.id===st.me)||{};return{st,ap:meU.ap46||[],led:(st.ledger||[]).filter(l=>l.by===st.me),notifs:st.notifs||[]}};
 {const r=await act(L,null,"apSave46",[{vendor:"Ferguson",amt:"10",due:ymd(5)}]);ok(r.res.ok!==true&&(r.status>=400||r.res.need==="login"),"signed out: apSave46 is refused",J([r.status,r.error,r.res]))}
 {const r=await act(L,C.ck,"apSave46",[{vendor:"Ferguson",amt:"10",due:ymd(5)}]);ok(r.res.ok===false&&/pro accounts/.test(r.res.msg||""),"a customer can't keep bills to pay",J(r.res))}
 for(const [o,re,n] of [[{amt:"10",due:ymd(5)},/vendor/,"no vendor"],[{vendor:"F",amt:"0",due:ymd(5)},/amount/,"a $0 amount"],[{vendor:"F",amt:"abc",due:ymd(5)},/amount/,"a non-number"],[{vendor:"F",amt:"2000000",due:ymd(5)},/amount/,"over $1M"],[{vendor:"F",amt:"10",due:"next week"},/due/,"no real date"],[{vendor:"F",amt:"10",due:"2099-01-01"},/looks off/,"a far-off year"]]){
  const r=await act(L,P.ck,"apSave46",[o]);ok(r.res.ok===false&&re.test(r.res.msg||""),"validation: "+n+" is refused",J(r.res))}
 const add=async(o)=>{const r=await act(L,P.ck,"apSave46",[o]);ok(r.res.ok&&r.res.id,"adds a bill: "+o.vendor,J(r.res));return r.res.id};
 const A1=await add({vendor:"Ferguson Supply",amt:"412.50",due:ymd(10),cat:"Materials",job:"Kitchen repipe",ref:"FG-1"});
 const B1=await add({vendor:"Ruiz Drywall",amt:"2,500.00",due:ymd(-2),cat:"Subcontractor"});
 const yr=new Date().getFullYear()+1;const R1=await add({vendor:"Shop rent",amt:"675",due:yr+"-01-31",cat:"Office",every:"month"});
 const T1=await add({vendor:"Due Today Co",amt:"20",due:ymd(0)}),T3=await add({vendor:"Three Day Co",amt:"30",due:ymd(3),cat:"Bogus"});
 {const {ap}=await apOf(P.ck);const a=ap.find(x=>x.id===A1),r=ap.find(x=>x.id===R1),t3=ap.find(x=>x.id===T3);
  ok(ap.length===5&&a&&a.amt===412.5&&a.ref==="FG-1"&&a.job==="Kitchen repipe"&&ap.find(x=>x.id===B1).amt===2500,"the pro's state has the 5 bills with amounts parsed ($2,500.00 -> 2500)",J(ap.map(x=>[x.vendor,x.amt])));
  ok(r&&r.every==="month"&&t3&&t3.cat==="Materials","monthly flag kept; an unknown category falls back to Materials",J([r&&r.every,t3&&t3.cat]))}
 {const sx=await stateFor(L,X.ck),so=await stateFor(L,null),sc=await stateFor(L,C.ck);const pu=s=>(s.users||[]).find(u=>u.id===P.id)||{};
  ok(!("ap46" in pu(sx))&&!("ap46" in pu(so))&&!("ap46" in pu(sc))&&!J(sx).includes("Ferguson Supply")&&!J(so).includes("Ruiz Drywall"),"bills to pay are private: another pro, a customer and signed-out state never see them")}
 for(const [nm,args] of [["apPay46",[A1,{}]],["apUndo46",[A1]],["apDel46",[A1]],["apSave46",[{id:A1,vendor:"Hacked",amt:"1",due:ymd(1)}]]]){const r=await act(L,X.ck,nm,args);ok(r.res.ok===false,"another pro can't "+nm+" someone else's bill",J(r.res))}
 {const r=await act(L,P.ck,"apSave46",[{id:A1,vendor:"Ferguson Supply",amt:"415.25",due:ymd(10),cat:"Materials",job:"Kitchen repipe",ref:"FG-1"}]);const {ap}=await apOf(P.ck);ok(r.res.ok&&ap.find(x=>x.id===A1).amt===415.25&&ap.length===5,"edit updates the bill in place",J(r.res))}
 {const r=await act(L,P.ck,"apPay46",[A1,{date:ymd(2)}]);ok(r.res.ok===false&&/future/.test(r.res.msg||""),"a future paid date is refused",J(r.res))}
 let ledA;{const r=await act(L,P.ck,"apPay46",[A1,{date:ymd(-1)}]);const {ap,led}=await apOf(P.ck);const a=ap.find(x=>x.id===A1);const l=led.find(x=>x.ap46===A1);ledA=l&&l.id;
  ok(r.res.ok&&/Logged as a Materials expense/.test(r.res.msg||""),"mark paid: "+String(r.res.msg||"").slice(0,90),J(r.res));
  ok(a&&a.paid&&a.paid.date===ymd(-1)&&l&&l.kind==="exp"&&l.amt===415.25&&l.cat==="Materials"&&l.vendor==="Ferguson Supply"&&l.job==="Kitchen repipe"&&l.date===ymd(-1)&&/#FG-1/.test(l.note),"…the bill is paid and an expense with the same amount, category, vendor, job and date is in the log",J([a&&a.paid,l]))}
 {const r=await act(L,P.ck,"apPay46",[A1,{}]);ok(r.res.ok===false&&/already/.test(r.res.msg||""),"paying twice is refused",J(r.res));const d=await act(L,P.ck,"apDel46",[A1]);ok(d.res.ok===false&&/Undo paid/.test(d.res.msg||""),"a paid bill can't be deleted (undo first)",J(d.res));
  const e=await act(L,P.ck,"apSave46",[{id:A1,vendor:"X",amt:"1",due:ymd(1)}]);ok(e.res.ok===false&&/already paid/.test(e.res.msg||""),"a paid bill can't be edited",J(e.res))}
 {const r=await act(L,P.ck,"apUndo46",[A1]);const {ap,led}=await apOf(P.ck);ok(r.res.ok&&!ap.find(x=>x.id===A1).paid&&!led.some(x=>x.ap46===A1),"undo paid reopens the bill and takes its expense off the log",J(r.res))}
 // billed on a live invoice: undo is refused until that invoice is voided
 {const cust=await act(L,P.ck,"saveCust",[{name:"Hana apcu",email:C.email}]);await act(L,P.ck,"apPay46",[A1,{}]);const {led}=await apOf(P.ck);const l=led.find(x=>x.ap46===A1);
  const inv=await act(L,P.ck,"saveBill",[{type:"inv",cust:cust.res.id,title:"Repipe materials",lines:[{d:"Materials: Ferguson Supply",q:1,r:415.25,l36:l.id}],tax:0,due:ymd(14)}]);
  const bill=((await stateFor(L,P.ck)).bills||[]).find(b=>b.id===inv.res.id)||{};ok(inv.res.ok&&(bill.lines||[]).some(x=>x.l36===l.id),"(the expense is billed on a draft invoice)",J(inv.res));
  const u=await act(L,P.ck,"apUndo46",[A1]);ok(u.res.ok===false&&/billed to/.test(u.res.msg||""),"undo paid is refused while that expense is billed on a live invoice",J(u.res));
  await act(L,P.ck,"voidBill",[inv.res.id]);const u2=await act(L,P.ck,"apUndo46",[A1]);ok(u2.res.ok,"…and allowed once that invoice is void",J(u2.res))}
 // deleting the expense in the log reopens the bill
 {await act(L,P.ck,"apPay46",[B1,{}]);let {led}=await apOf(P.ck);const l=led.find(x=>x.ap46===B1);ok(l&&l.cat==="Subcontractor"&&l.vendor==="Ruiz Drywall"&&l.amt===2500,"a paid sub bill is a Subcontractor expense (feeds the 1099 totals)",J(l));
  const d=await act(L,P.ck,"delLedger",[l.id]);const {ap}=await apOf(P.ck);ok(d.res.ok&&/back in Bills to pay/.test(d.res.msg||"")&&!ap.find(x=>x.id===B1).paid,"deleting that expense in the log reopens the bill",J(d.res))}
 // monthly: paying opens next month's bill (Jan 31 -> Feb 28/29); undo removes the untouched copy
 {const r=await act(L,P.ck,"apPay46",[R1,{}]);let {ap}=await apOf(P.ck);const n=ap.find(x=>x.from46===R1);const feb=new Date(Date.UTC(yr,2,0)).getUTCDate();
  ok(r.res.ok&&n&&!n.paid&&n.due===yr+"-02-"+feb&&n.amt===675&&n.every==="month"&&/Next month's bill is due/.test(r.res.msg||""),"monthly: paying opens next month's bill, due "+yr+"-02-"+feb,J([r.res.msg,n&&n.due]));
  const u=await act(L,P.ck,"apUndo46",[R1]);({ap}=await apOf(P.ck));ok(u.res.ok&&!ap.some(x=>x.from46===R1),"undo on a monthly bill removes the copy it opened",J(u.res));
  await act(L,P.ck,"apPay46",[R1,{}]);({ap}=await apOf(P.ck));const n2=ap.find(x=>x.from46===R1);await act(L,P.ck,"apSave46",[{id:n2.id,vendor:"Shop rent",amt:"700",due:n2.due,cat:"Office",every:"month"}]);
  await act(L,P.ck,"apUndo46",[R1]);({ap}=await apOf(P.ck));ok(ap.some(x=>x.id===n2.id&&x.amt===700),"…but keeps a copy the pro already edited",J(ap.map(x=>[x.vendor,x.amt])));await act(L,P.ck,"apPay46",[R1,{}])}
 // delete an open bill
 {const id=await add({vendor:"Delete Me",amt:"5",due:ymd(30)});const r=await act(L,P.ck,"apDel46",[id]);const {ap}=await apOf(P.ck);ok(r.res.ok&&!ap.some(x=>x.id===id),"an open bill can be deleted",J(r.res))}
 // reminders on the sweep
 {await act(L,P.ck,"sweep9",[]);let {notifs}=await apOf(P.ck);const t=notifs.map(n=>n.text);
  ok(t.some(x=>/Bill from Ruiz Drywall \(\$2,500\.00\) is 2 days late/.test(x)),"sweep: a late bill gets a notice",J(t.filter(x=>/Bill from/.test(x))));
  ok(t.some(x=>/Due Today Co \(\$20\.00\) is due today/.test(x))&&t.some(x=>/Three Day Co \(\$30\.00\) is due in 3 days/.test(x)),"sweep: due-today and due-in-3-days notices");
  ok(!t.some(x=>/Ferguson Supply/.test(x)&&/Bill from/.test(x)),"sweep: a bill 10 days out gets no notice yet");
  await act(L,P.ck,"sweep9",[]);({notifs}=await apOf(P.ck));ok(notifs.filter(n=>/Bill from/.test(n.text)).length===t.filter(x=>/Bill from/.test(x)).length,"a second sweep sends nothing new")}
 // demo pro: sample bills, quiet on the sweep
 {const r=await req(L.port,"POST","/api/login",JH,J({email:"demo-pro@sawyer.test",password:"sawyer-demo-2026"}));const dk=sigCk(r);const st=await stateFor(L,dk);const meU=(st.users||[]).find(u=>u.id===st.me)||{};
  ok(dk&&(meU.ap46||[]).length===3&&meU.ap46.every(x=>x.demo),"demo pro has 3 sample bills to pay",J((meU.ap46||[]).map(x=>x.vendor)))}

 // UI
 {const {c,p}=await page(L,1300,P.ck);await go(L,p,"/office/money","#ap46");
  const v=await p.evaluate(()=>({h:(document.getElementById("ap46Head")||{}).textContent||"",rows:document.querySelectorAll("#ap46Open .ap46-r").length,late:(document.querySelector(".ap46-kbad b")||{}).textContent||"",first:(document.querySelector("#ap46Open .ap46-r b")||{}).textContent||"",exp:!!document.getElementById("expF")}));
  ok(v.rows>=4&&/open on/.test(v.h)&&v.late==="$2,500.00"&&v.first==="Ruiz Drywall"&&v.exp,"1300: Bills to pay sits above the expense log, late bill first, Late total $2,500.00",J(v));
  await p.fill("#ap-v","Home Depot Pro");await p.fill("#ap-a","88.10");await p.fill("#ap-d",await p.evaluate(()=>v7Day(6)));await p.selectOption("#ap-c","Tools");await p.click("#ap46F button.primary");
  await p.waitForFunction(()=>[...document.querySelectorAll("#ap46Open .ap46-r b")].some(b=>b.textContent==="Home Depot Pro"),null,{timeout:10000}).catch(()=>{});
  ok(await p.evaluate(()=>[...document.querySelectorAll("#ap46Open .ap46-r b")].some(b=>b.textContent==="Home Depot Pro")),"1300: the form adds a bill to the list");
  await p.screenshot({path:path.join(SH,"v46-bills-1300.png"),fullPage:true});
  const dl=p.waitForEvent("download",{timeout:10000}).catch(()=>null);await p.click("#ap46Csv");const d=await dl;let csv="";if(d){const f=await d.path();csv=fs.readFileSync(f,"utf8")}
  ok(/^Vendor,Their invoice #,Category,Job,Due,Amount,Status,Paid on,Repeats/.test(csv)&&/Ruiz Drywall,,Subcontractor,,[0-9-]+,2500\.00,Late/.test(csv)&&/Home Depot Pro/.test(csv),"1300: Bills to pay (CSV) downloads every bill with its status",csv.slice(0,200));
  await go(L,p,"/office","#app");const al=await p.evaluate(()=>document.getElementById("app").innerText);ok(/Bill from Ruiz Drywall \(\$2,500\.00\) is 2 days late/.test(al)&&/Due Today Co \(\$20\.00\) is due today/.test(al),"1300: the Office overview lists late and due-soon bills",al.slice(0,300));await c.close()}
 {const {c,p}=await page(L,1300,P.ck);await go(L,p,"/office/reports","#app");const f=await p.evaluate(()=>{const b=v31Backup(me());const x=b.files.find(f=>f[0]==="bills-to-pay.csv");return x?x[1]:""});
  ok(/^\ufeffVendor,Their invoice #/.test(f)&&/Ferguson Supply,FG-1,Materials,Kitchen repipe/.test(f),"Back up everything adds bills-to-pay.csv",f.slice(0,120));await c.close()}
 {const {c,p}=await page(L,390,P.ck);await go(L,p,"/office/money","#ap46");
  const ow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);ok(ow<=1,"390: no sideways scroll on Expenses & mileage",ow);
  await p.screenshot({path:path.join(SH,"v46-bills-390.png"),fullPage:true});
  await p.click('#ap46Open [data-ap46pay]');await p.waitForSelector("#ap46PF",{timeout:8000}).catch(()=>{});const mt=await p.evaluate(()=>(document.getElementById("ap46PF")||{}).innerText||"");
  ok(/Logs a Subcontractor expense of \$2,500\.00 from Ruiz Drywall/.test(mt),"390: Mark paid asks for the date and says what it will log",mt.slice(0,160));await p.screenshot({path:path.join(SH,"v46-bills-pay-390.png")});
  await p.click('#ap46PF [type=submit]');await p.waitForFunction(()=>!document.querySelector("#ap46PF")&&![...document.querySelectorAll("#ap46Open .ap46-r b")].some(b=>b.textContent==="Ruiz Drywall"),null,{timeout:10000}).catch(()=>{});
  const after=await p.evaluate(()=>({open:[...document.querySelectorAll("#ap46Open .ap46-r b")].map(b=>b.textContent),paid:(document.querySelector(".ap46-p summary")||{}).textContent||"",expRow:/Ruiz Drywall/.test((document.getElementById("expF")||{}).closest?document.getElementById("expF").closest(".card").innerText:"")}));
  ok(!after.open.includes("Ruiz Drywall")&&/Paid recently/.test(after.paid)&&after.expRow,"390: paying moves it to Paid recently and the expense shows in Receipts and expenses",J(after));
  await go(L,p,"/office/money?ap="+A1,"#ap46F");const ed=await p.evaluate(()=>({v:(document.getElementById("ap-v")||{}).value,a:(document.getElementById("ap-a")||{}).value,btn:(document.querySelector("#ap46F button.primary")||{}).textContent}));
  ok(ed.v==="Ferguson Supply"&&ed.a==="415.25"&&ed.btn==="Save bill","390: Edit opens the bill in the form",J(ed));await c.close()}
 {const {c,p}=await page(L,390,C.ck);await go(L,p,"/office/money","#app");ok(!(await p.$("#ap46"))&&/The Office is for pros/.test(await p.evaluate(()=>document.getElementById("app").innerText)),"390 customer: no Bills to pay card (The Office is for pros)");await c.close()}

 if(failed)throw new Error(failed+" check(s) failed");
 console.log("OK v46-e2e");
}catch(e){if(!/check\(s\) failed$/.test(String(e&&e.message)))console.log("FAIL crashed: "+String(e&&e.message||e).split("\n")[0].slice(0,300));console.error(e&&e.stack||e);failed++;}
finally{if(br)await br.close().catch(()=>{});await Promise.all(SERVERS.map(s=>stopApp(s)));process.exit(failed?1:0)}})();
