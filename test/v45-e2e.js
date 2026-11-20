// v45 end-to-end. Self-contained: starts its own Sawyer servers (local test mode, no real email or SMS, payments in test
// mode). Covers health 2.28.0-sawyer / SW cache sawyer-v45 (or later), and:
// Late fees: settings (validation, pro-only), terms printed on invoices sent while on, a fee only on an overdue invoice that
//   carried the terms, after the grace period, once, untaxed, the customer notified; waive (final); flat and percent;
//   automatic on the sweep; never copied by Duplicate or a repeating invoice; other accounts refused; UI on 390 and 1300.
// Hire pages: /hire, /hire/<trade>, /hire/<city>, /hire/<trade>/<city> (titles, unique descriptions, prerender, 404s, footer
//   link); launch SEO: twitter/OG tags, private views noindex, JSON-LD only when indexable and only for pages with a real pro,
//   WebSite / FAQPage / Service schema, sitemap.
// Usage: node test/v45-e2e.js [shots dir]
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
 const created=!dir;dir=dir||fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v45-"));
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
 const SH=process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),"v45-shots-"));fs.mkdirSync(SH,{recursive:true});
 const L=await startApp();SERVERS.push(L);
 const act=async(S,ck,name,args)=>{const r=await req(S.port,"POST","/api/act",Object.assign(ck?{Cookie:ck}:{},JH),J({name,args}));return {res:(r.json&&r.json.res)||{},st:stateOf(r),status:r.status,error:r.json&&r.json.error}};
 const stateFor=async(S,ck)=>stateOf(await req(S.port,"GET","/api/state",ck?{Cookie:ck}:{}));
 const signup=async(S,kind,tag,zip,extra)=>{const email="v45-"+tag+"-"+run+"@example.com";const data=Object.assign({name:(kind==="pro"?"Val ":"Hana ")+tag,email,zip},kind==="pro"?{biz:"V45 "+tag+" "+run,trade:"Plumbing",phone:"5125550100",plan:"founding"}:{},extra||{});
  const r=await req(S.port,"POST","/api/signup",JH,J({kind,password:"v45-correct-horse",data}));return{status:r.status,error:r.json&&r.json.error,ck:sigCk(r),id:stateOf(r).me,st:stateOf(r),email}};
 br=await chromium.launch();
 const page=async(S,w,ck)=>{const c=await br.newContext({viewport:{width:w,height:w<500?844:900},deviceScaleFactor:w<500?2:1,bypassCSP:true,hasTouch:w<500});
  if(ck){const [k,v]=ck.split("=");await c.addCookies([{name:k,value:v,url:S.B}])}
  const p=await c.newPage();return{c,p}};
 const go=async(S,p,u,sel)=>{await p.goto(S.B+u,{waitUntil:"networkidle"});await p.waitForFunction(()=>typeof __PART!=="undefined"&&!__PART&&typeof me==="function",null,{timeout:60000,polling:100});if(sel)await p.waitForSelector(sel,{timeout:20000}).catch(()=>{})};
 const ymd=d=>new Date(Date.now()+d*864e5).toISOString().slice(0,10);

 // --- release
 {const hz=(await req(L.port,"GET","/healthz")).json||{};ok(/^2\.(2[8-9]|[3-9]\d)\.\d+-sawyer$/.test(hz.v||""),"healthz reports a Sawyer version from 2.28.0 on",J(hz));
  const sw=await req(L.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v(4[5-9]|[5-9]\d)"/.test(sw.body),"service worker cache is sawyer-v45 or later")}

 // --- late fees: API
 const P=await signup(L,"pro","late","78704"),C=await signup(L,"customer","latecu","78704"),X=await signup(L,"pro","other","78704");
 ok(P.ck&&C.ck&&X.ck,"fixtures sign up (pro, customer, another pro)",J([P.error,C.error,X.error]));
 const cust=await act(L,P.ck,"saveCust",[{name:"Late Clinic",email:C.email}]);ok(cust.res.ok&&cust.res.id,"pro adds the customer",J(cust.res));
 const mkInv=async(title,due,send,extra)=>{const r=await act(L,P.ck,"saveBill",[Object.assign({type:"inv",cust:cust.res.id,title,lines:[{d:"Repair",q:1,r:200}],tax:10,due},extra||{})]);if(send)await act(L,P.ck,"sendBill",[r.res.id]);return r.res.id};
 const billOf=async(id,ck)=>((await stateFor(L,ck||P.ck)).bills||[]).find(b=>b.id===id);
 // invoice sent BEFORE late fees were turned on
 const OLD=await mkInv("Before terms",ymd(-12),true);
 {const r=await act(L,C.ck,"lateSet45",[{on:true,kind:"flat",amt:25,grace:0}]);ok(!r.res.ok,"a customer can't turn on late fees",J(r.res));
  for(const [o,why] of [[{on:true,kind:"flat",amt:0,grace:3},"flat $0"],[{on:true,kind:"flat",amt:501,grace:3},"flat $501"],[{on:true,kind:"pct",amt:12,grace:3},"12%"],[{on:true,kind:"flat",amt:25,grace:61},"61-day grace"]]){
   const x=await act(L,P.ck,"lateSet45",[o]);ok(!x.res.ok,"settings refuse "+why,J(x.res))}
  const s=await act(L,P.ck,"lateSet45",[{on:true,kind:"flat",amt:"25",grace:"5",auto:false}]);ok(s.res.ok&&/\$25\.00/.test(s.res.msg)&&/5 days after/.test(s.res.msg),"pro turns on a $25 fee with a 5-day grace",J(s.res));
  const meP=(s.st.users||[]).find(u=>u.id===P.id);ok(meP&&meP.lf45&&meP.lf45.on&&meP.lf45.amt===25&&meP.lf45.grace===5,"the setting is in the pro's own state",J(meP&&meP.lf45));
  const meX=((await stateFor(L,C.ck)).users||[]).find(u=>u.id===P.id);ok(!meX||!("lf45" in meX),"other accounts don't see the pro's late-fee setting",J(meX&&meX.lf45))}
 {const r=await act(L,P.ck,"lateAdd45",[OLD]);ok(!r.res.ok&&/before you turned on late fees/.test(r.res.msg||""),"an invoice sent before the terms existed can't get a fee",J(r.res))}
 const DRAFT=await mkInv("Draft one",ymd(-12),false);
 {const r=await act(L,P.ck,"lateAdd45",[DRAFT]);ok(!r.res.ok&&/Send the invoice first/.test(r.res.msg||""),"a draft can't get a fee",J(r.res))}
 const GRACE=await mkInv("Inside grace",ymd(-3),true);
 {const b=await billOf(GRACE);ok(b&&b.lf45&&b.lf45.amt===25&&b.lf45.grace===5,"terms are stamped on the invoice when it is sent",J(b&&b.lf45));
  const r=await act(L,P.ck,"lateAdd45",[GRACE]);ok(!r.res.ok&&/grace period/.test(r.res.msg||""),"3 days late with a 5-day grace: refused",J(r.res))}
 const NOTDUE=await mkInv("Not due",ymd(5),true);
 {const r=await act(L,P.ck,"lateAdd45",[NOTDUE]);ok(!r.res.ok&&/isn't past due/.test(r.res.msg||""),"not past due: refused",J(r.res))}
 const LATE=await mkInv("Late one",ymd(-9),true);
 {const x=await act(L,X.ck,"lateAdd45",[LATE]);ok(!x.res.ok&&/wasn't found/.test(x.res.msg||""),"another pro can't add a fee to it",J(x.res));
  const cu=await act(L,C.ck,"lateAdd45",[LATE]);ok(!cu.res.ok,"the customer can't add one either",J(cu.res));
  const r=await act(L,P.ck,"lateAdd45",[LATE]);ok(r.res.ok&&r.res.amt===25,"9 days late: the $25 fee is added",J(r.res));
  const b=await billOf(LATE);const fee=(b.lines||[]).filter(l=>l.lf45);ok(fee.length===1&&fee[0].r===25&&/Late fee \(9 days past due\)/.test(fee[0].d),"one fee line, labelled with the days past due",J(b.lines));
  const cs=await stateFor(L,C.ck);const cb=(cs.bills||[]).find(x=>x.id===LATE);
  ok(cb&&(cb.lines||[]).some(l=>l.lf45),"the customer sees the fee line on their invoice");
  ok((cs.notifs||[]).some(n=>n.to===C.id&&/late fee to invoice/.test(n.text||n.msg||"")),"the customer gets a notice naming the fee",J((cs.notifs||[]).filter(n=>n.to===C.id).map(n=>n.text||n.msg).slice(-3)));
  const again=await act(L,P.ck,"lateAdd45",[LATE]);ok(!again.res.ok&&/already on/.test(again.res.msg||""),"only one fee per invoice",J(again.res))}
 // untaxed: 200 + 10% tax = 220, + 25 fee = 245 (a taxed fee would make 247.50)
 {const tot=await (async()=>{const {c,p}=await page(L,1300,P.ck);await go(L,p,"/invoice/"+LATE,"#paper");const t=await p.evaluate(id=>{const b=v7Bill(id),c=billCalc(b);return{tax:c.tax,total:c.total,bal:c.bal,terms:(document.querySelector("#paper .v45lf-terms")||{}).innerText||"",waive:!!document.getElementById("v45lfWaive")}},LATE);
   await p.screenshot({path:path.join(SH,"v45-invoice-latefee-1300.png"),fullPage:true});await c.close();return t})();
  ok(tot.tax===20&&tot.total===245&&tot.bal===245,"the late fee is not taxed (tax 20.00, total 245.00)",J(tot));
  ok(/Late fee: \$25\.00/.test(tot.terms)&&/5 days after/.test(tot.terms),"the invoice paper prints the late-fee terms",tot.terms);
  ok(tot.waive,"the pro's invoice page offers Waive late fee")}
 // duplicate never copies the fee
 {const d=await act(L,P.ck,"dupBill42",[LATE]);const db=await billOf(d.res.id);ok(d.res.ok&&db&&!(db.lines||[]).some(l=>l.lf45)&&!db.lf45&&db.lines.length===1,"Duplicate leaves the late fee off",J(db&&db.lines));
  ok(!/job-cost line/.test(d.res.msg||""),"…and doesn't call it a job-cost line",d.res.msg)}
 // waive is final
 {const w=await act(L,X.ck,"lateWaive45",[LATE]);ok(!w.res.ok,"another pro can't waive it",J(w.res));
  const r=await act(L,P.ck,"lateWaive45",[LATE]);const b=await billOf(LATE);ok(r.res.ok&&!(b.lines||[]).some(l=>l.lf45)&&b.lf45waived,"the pro waives the fee",J(r.res));
  const re=await act(L,P.ck,"lateAdd45",[LATE]);ok(!re.res.ok&&/waived/.test(re.res.msg||""),"a waived fee stays off",J(re.res))}
 // can't waive once paid in full
 {const id=await mkInv("Paid later",ymd(-8),true);await act(L,P.ck,"lateAdd45",[id]);const b0=await billOf(id);
  const pay=await act(L,P.ck,"recordPay",[id,245,"check"]);ok(pay.res.ok,"pro records full payment including the fee",J(pay.res));
  const w=await act(L,P.ck,"lateWaive45",[id]);ok(!w.res.ok&&/paid in full/.test(w.res.msg||""),"a paid fee can't be waived in the app",J(w.res));ok(b0&&(b0.lines||[]).some(l=>l.lf45),"(fee was on it)")}
 // percent of the balance
 {const s=await act(L,P.ck,"lateSet45",[{on:true,kind:"pct",amt:"1.5",grace:"0"}]);ok(s.res.ok&&/1\.5% of the unpaid balance/.test(s.res.msg),"switch to 1.5% of the balance, no grace",J(s.res));
  const id=await mkInv("Percent",ymd(-2),true);const r=await act(L,P.ck,"lateAdd45",[id]);ok(r.res.ok&&r.res.amt===3.3,"1.5% of the $220 balance is $3.30",J(r.res))}
 // automatic on the sweep
 {const s=await act(L,P.ck,"lateSet45",[{on:true,kind:"flat",amt:"40",grace:"2",auto:true}]);ok(s.res.ok&&/automatically/.test(s.res.msg),"turn on automatic $40 after 2 days",J(s.res));
  const a=await mkInv("Auto late",ymd(-6),true),g=await mkInv("Auto in grace",ymd(-1),true);
  await act(L,P.ck,"sweep9",[]);const ba=await billOf(a),bg=await billOf(g);
  ok((ba.lines||[]).filter(l=>l.lf45).length===1&&(ba.lines||[]).find(l=>l.lf45).r===40,"the sweep adds the fee to an invoice past the grace period",J(ba.lines));
  ok(!(bg.lines||[]).some(l=>l.lf45),"…and not to one still inside it",J(bg.lines));
  await act(L,P.ck,"sweep9",[]);const ba2=await billOf(a);ok((ba2.lines||[]).filter(l=>l.lf45).length===1,"a second sweep doesn't add another fee");
  const old=await billOf(OLD);ok(!(old.lines||[]).some(l=>l.lf45),"the sweep leaves invoices sent without terms alone");
  const ps=await stateFor(L,P.ck);ok((ps.notifs||[]).some(n=>n.to===P.id&&/Late fee of \$40\.00 added/.test(n.text||n.msg||"")),"the pro gets a notice when the sweep adds a fee")}
 // a repeating invoice never carries the fee forward
 {const id=await mkInv("Repeat me",ymd(-6),true);await act(L,P.ck,"sweep9",[]);const b=await billOf(id);ok((b.lines||[]).some(l=>l.lf45),"(the source has a late fee)");
  const r=await act(L,P.ck,"setRecurring",[id,{every:"month",next:ymd(0),auto:false}]);ok(r.res.ok,"make it repeat from today",J(r.res));
  await act(L,P.ck,"sweep9",[]);const nb=((await stateFor(L,P.ck)).bills||[]).find(x=>x.recFrom9===id);
  ok(nb&&!(nb.lines||[]).some(l=>l.lf45)&&!nb.lf45&&nb.lines.length===1,"the next repeating invoice has no late fee line or old terms",J(nb&&nb.lines))}
 // turning it off: new invoices carry no terms
 {const s=await act(L,P.ck,"lateSet45",[{on:false}]);ok(s.res.ok&&/off/.test(s.res.msg),"turn late fees off",J(s.res));
  const id=await mkInv("After off",ymd(-9),true);const b=await billOf(id);ok(b&&!b.lf45,"an invoice sent while off has no terms",J(b&&b.lf45));
  const r=await act(L,P.ck,"lateAdd45",[id]);ok(!r.res.ok,"and can't get a fee",J(r.res))}

 // --- late fees: UI (settings card at 390 / 1300, add button, customer view)
 {await act(L,P.ck,"lateSet45",[{on:false}]);
  for(const w of [390,1300]){const {c,p}=await page(L,w,P.ck);const errs=[];p.on("pageerror",e=>errs.push(e.message));await go(L,p,"/office/recurring","#v45lfF");
   const has=await p.evaluate(()=>({card:!!document.getElementById("v45lf"),h:(document.querySelector("#v45lf h2")||{}).textContent,inputs:["v45lfK","v45lfA","v45lfG"].every(i=>!!document.querySelector('label[for="'+i+'"]'))}));
   ok(has.card&&has.h==="Late fees"&&has.inputs,w+": Office → Recurring shows the Late fees card with labelled fields",J(has));
   if(w===390){await p.check('#v45lfF [name=on]');await p.fill("#v45lfA","30");await p.fill("#v45lfG","3");await p.uncheck('#v45lfF [name=auto]');await p.click('#v45lfF button[type=submit]');await p.waitForTimeout(800);
    const st=await p.evaluate(()=>{const m=me();return m.lf45});ok(st&&st.on&&st.amt===30&&st.grace===3&&!st.auto,"390: saving the card turns on a $30 fee with a 3-day grace",J(st));
    await p.waitForSelector("#v45lf .v45lf-terms",{timeout:8000}).catch(()=>{});ok(await p.evaluate(()=>/Late fee: \$30\.00/.test((document.querySelector("#v45lf .v45lf-terms")||{}).innerText||"")),"390: the card previews the printed terms");
    const ov=await p.evaluate(()=>{const e=document.getElementById("v45lf");return e?e.scrollWidth<=e.clientWidth+1:false});ok(ov,"390: the card doesn't overflow sideways")}
   await p.evaluate(()=>document.getElementById("v45lf").scrollIntoView());await p.screenshot({path:path.join(SH,"v45-latefee-card-"+w+".png")});
   ok(!errs.length,w+": no page errors on Office → Recurring",errs.join(" | "));await c.close()}
  const id=await mkInv("UI late",ymd(-7),true);
  {const {c,p}=await page(L,390,P.ck);await go(L,p,"/invoice/"+id,"#v45lfAdd");const t=await p.evaluate(()=>(document.getElementById("v45lfAdd")||{}).textContent||"");ok(/Add \$30\.00 late fee/.test(t),"390: an overdue invoice with terms shows Add $30.00 late fee",t);
   await p.click("#v45lfAdd");await p.waitForSelector("#v45lfWaive",{timeout:8000}).catch(()=>{});const after=await p.evaluate(id=>({line:(v7Bill(id).lines||[]).some(l=>l.lf45),waive:!!document.getElementById("v45lfWaive"),row:/Late fee \(7 days past due\)/.test(document.getElementById("paper").innerText)}),id);
   ok(after.line&&after.waive&&after.row,"390: tapping it adds the fee line and swaps in Waive late fee",J(after));await p.screenshot({path:path.join(SH,"v45-invoice-added-390.png"),fullPage:true});await c.close()}
  {const {c,p}=await page(L,390,C.ck);await go(L,p,"/invoice/"+id,"#paper");const cv=await p.evaluate(()=>({terms:(document.querySelector("#paper .v45lf-terms")||{}).innerText||"",row:/Late fee \(7 days past due\)/.test(document.getElementById("paper").innerText),add:!!document.getElementById("v45lfAdd"),waive:!!document.getElementById("v45lfWaive")}));
   ok(/Late fee: \$30\.00/.test(cv.terms)&&cv.row&&!cv.add&&!cv.waive,"390 customer: sees the terms and the fee line, no pro buttons",J(cv));await p.screenshot({path:path.join(SH,"v45-invoice-customer-390.png"),fullPage:true});await c.close()}
  const noTerms=OLD;{const {c,p}=await page(L,1300,P.ck);await act(L,P.ck,"lateSet45",[{on:false}]);await go(L,p,"/invoice/"+noTerms,"#paper");const t=await p.evaluate(()=>({why:(document.querySelector(".v45lf-why")||{}).innerText||"",add:!!document.getElementById("v45lfAdd")}));
   ok(!t.add&&/Turn on late fees/.test(t.why),"1300: an overdue invoice with no terms (fees off) offers to turn late fees on, no Add button",J(t));await c.close()}}

 // --- hire pages (beta: not indexable)
 {const H=async u=>{const r=await req(L.port,"GET",u);return{s:r.status,b:r.body,h:r.headers,title:(r.body.match(/<title>([^<]*)<\/title>/)||[])[1]||"",desc:(r.body.match(/<meta name="description" content="([^"]*)">/)||[])[1]||""}};
  const a=await H("/hire/plumbing/austin-tx");
  ok(a.s===200&&a.title==="Plumbers in Austin, TX · Sawyer","/hire/plumbing/austin-tx: 200 with the title Plumbers in Austin, TX",a.title);
  const nA=+((a.desc.match(/^Compare (\d+) plumbing pros near Austin, TX\. Typical job \$\d/)||[])[1]||0);ok(nA>=2,"…its own description with the pro count and local price",a.desc);
  ok(/id="pre11"/.test(a.b)&&/<h1>Plumbers in Austin, TX<\/h1>/.test(a.b)&&/Bluebonnet Plumbing/.test(a.b),"…prerendered (heading and pro cards in the first HTML)");
  {const im=((a.b.split('id="pre11"')[1]||"").match(/<img\b[^>]*>/)||[""])[0];ok(/fetchpriority="high"/.test(im)&&!/loading="lazy"/.test(im),"…the first pro photo loads eagerly (fetchpriority high: it is the phone LCP)",im.slice(0,200))}
  ok(/rel="canonical" href="[^"]*\/hire\/plumbing\/austin-tx"/.test(a.b)&&/name="twitter:title" content="Plumbers in Austin, TX · Sawyer"/.test(a.b)&&/name="twitter:description"/.test(a.b)&&/name="twitter:image"/.test(a.b)&&/property="og:image:alt"/.test(a.b),"…canonical plus full Twitter and OG tags");
  ok(a.h["x-robots-tag"]==="noindex, nofollow"&&!/ld\+json/.test(a.b)&&/data-sawyer-robots="beta"/.test(a.b),"beta: noindex and no structured data (test mode)");
  const descs=new Set();for(const u of ["/hire","/hire/plumbing","/hire/austin-tx","/hire/plumbing/austin-tx","/hire/electrical/phoenix-az","/hire/roofing/detroit-mi","/hire/solar-energy/missoula-mt","/find","/prices","/pros","/pricing","/faq","/about","/travel","/jobs","/projects","/signup","/credits"]){const x=await H(u);ok(x.s===200&&x.desc.length>=40&&x.desc.length<=200,u+": 200 with a 40–200 character description",x.s+" "+x.desc.length);descs.add(x.desc)}
  ok(descs.size===18,"all 18 public pages have different descriptions",descs.size);
  for(const u of ["/hire/nope","/hire/plumbing/nowhere","/hire/plumbing/austin-tx/extra","/hire/austin-tx/plumbing"]){const x=await H(u);ok(x.s===404,u+" is a 404",x.s)}
  const m=await H("/hire/solar-energy/missoula-mt");ok(m.s===200&&/No solar &amp; energy pros listed near Missoula yet/.test(m.b)&&/Post a job/.test(m.b),"a trade with no pros nearby still answers, with a post-a-job prompt");
  const hub=await H("/hire/austin-tx");ok(/<h1>Local pros in Austin, TX<\/h1>/.test(hub.b)&&/href="\/hire\/plumbing\/austin-tx"/.test(hub.b),"/hire/austin-tx lists every trade in the city");
  const dir=await H("/hire");ok(/href="\/hire\/plumbing"/.test(dir.b)&&/href="\/hire\/washington-dc"/.test(dir.b)&&/href="\/hire\/st-louis-mo"/.test(dir.b),"/hire links every trade and city (slugs like washington-dc, st-louis-mo)");
  // browser: same page after the app mounts, no layout jump, links work, footer link
  for(const w of [390,1300]){const {c,p}=await page(L,w);const errs=[];p.on("pageerror",e=>errs.push(e.message));
   await p.goto(L.B+"/hire/plumbing/austin-tx",{waitUntil:"networkidle"});await p.waitForFunction(()=>typeof me==="function"&&typeof ROUTE!=="undefined"&&ROUTE.v==="hire",null,{timeout:60000});await p.waitForTimeout(600);
   const r=await p.evaluate(()=>({h1:(document.querySelector("#app h1")||{}).textContent,title:document.title,cards:document.querySelectorAll("#app .pcard").length,faq:document.querySelectorAll("#app .v45faq details").length,foot:!!document.querySelector('#foot a[data-v45][href="/hire"]'),ow:document.documentElement.scrollWidth<=innerWidth+1,cls:(performance.getEntriesByType("layout-shift")||[]).reduce((a,e)=>a+(e.hadRecentInput?0:e.value),0)}));
   ok(r.h1==="Plumbers in Austin, TX"&&r.title==="Plumbers in Austin, TX · Sawyer"&&r.cards===nA&&r.faq===4,w+": the app renders the same page (heading, tab title, one card per pro in the description, 4 FAQs)",J(r));
   ok(r.foot,w+": the footer links Pros by city");ok(r.ow,w+": no sideways scroll");ok(!errs.length,w+": no page errors",errs.join(" | "));
   await p.screenshot({path:path.join(SH,"v45-hire-austin-plumbing-"+w+".png"),fullPage:true});
   await p.click('#app a[href="/hire/plumbing/lakeway-tx"]');await p.waitForFunction(()=>/Lakeway/.test((document.querySelector("#app h1")||{}).textContent||""),null,{timeout:10000}).catch(()=>{});
   ok(await p.evaluate(()=>location.pathname==="/hire/plumbing/lakeway-tx"&&document.title==="Plumbers in Lakeway, TX · Sawyer"),w+": a nearby-city link navigates in the app with a pretty URL");
   if(w===1300){await p.goto(L.B+"/hire",{waitUntil:"networkidle"});await p.waitForTimeout(500);await p.screenshot({path:path.join(SH,"v45-hire-directory-1300.png"),fullPage:true})}
   await c.close()}}

 // --- launch SEO with the index switch on
 {const I=await startApp({SAWYER_INDEXABLE:"1",SAWYER_BASE_URL:"https://sawyer.example"});SERVERS.push(I);
  const G=async u=>{const r=await req(I.port,"GET",u);const lds=[...r.body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>{try{return JSON.parse(m[1])}catch(e){return{bad:m[1].slice(0,80)}}});return{s:r.status,b:r.body,h:r.headers,lds}};
  const types=ld=>{const out=[];const w=o=>{if(!o||typeof o!=="object")return;if(o["@type"])out.push(o["@type"]);for(const k in o)if(o[k]&&typeof o[k]==="object")w(o[k])};w(ld);return out};
  const home=await G("/");const ht=types(home.lds);ok(ht.includes("Organization")&&ht.includes("WebSite")&&ht.includes("SearchAction")&&/sawyer\.example\/find\?q=\{search_term_string\}/.test(home.b),"indexable home: Organization + WebSite with a site search action",J(ht));
  const faq=await G("/faq");ok(types(faq.lds).includes("FAQPage")&&!/<[a-z]/i.test(J(faq.lds).replace(/\\u003c/g,"<").replace(/"text":"[^"]*"/g,m=>m.includes("<")?"<x":"")),"indexable /faq: FAQPage schema with plain-text answers");
  const pros=await G("/pros");ok(types(pros.lds).includes("Service")&&/"price":"20.00"/.test(J(pros.lds)),"indexable /pros: Service with the $20/mo offer");
  const demoCity=await G("/hire/plumbing/austin-tx");ok(demoCity.h["x-robots-tag"]==="noindex, nofollow"&&!demoCity.lds.length&&/data-sawyer-robots="demo"/.test(demoCity.b),"a city page whose pros are all demo pros stays noindex with no schema");
  const hub=await G("/hire/plumbing");ok(!hub.h["x-robots-tag"]&&types(hub.lds).includes("BreadcrumbList"),"/hire/plumbing hub is indexable with breadcrumbs");
  for(const u of ["/dash","/account","/office","/myhome","/bills","/inbox"]){const x=await G(u);ok(x.h["x-robots-tag"]==="noindex, nofollow"&&/name="robots" content="noindex, nofollow"/.test(x.b),u+" is never indexed (private view)")}
  const pr=await G("/prices");ok(!pr.h["x-robots-tag"]&&!/name="robots"/.test(pr.b),"/prices stays indexable");
  let map=[...(await req(I.port,"GET","/sitemap.xml")).body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  ok(map.includes("https://sawyer.example/hire")&&map.includes("https://sawyer.example/faq")&&!map.some(u=>/\/hire\/plumbing\/austin-tx$/.test(u)),"sitemap: public pages and /hire, no demo-only city page",map.length);
  // a real (non-demo) pro makes the Austin plumbing page indexable with LocalBusiness + Service + FAQ schema
  const R=await signup(I,"pro","real","78704",{biz:"Real Austin Plumbing "+run,trade:"Plumbing"});ok(R.status===200&&R.id,"a real plumber in Austin signs up",J(R.error));
  const real=await G("/hire/plumbing/austin-tx");const rt=types(real.lds);
  ok(!real.h["x-robots-tag"]&&!/name="robots"/.test(real.b),"with a real pro the city page is indexable",J(real.h["x-robots-tag"]));
  ok(rt.includes("Service")&&rt.includes("HomeAndConstructionBusiness")&&rt.includes("FAQPage")&&rt.includes("BreadcrumbList")&&rt.includes("AggregateOffer")&&rt.includes("City"),"…with Service (area served, price range), LocalBusiness, FAQ and breadcrumb schema",J(rt));
  const items=J(real.lds);ok(items.includes("/p/"+R.id)&&!/"url":"https:\/\/sawyer\.example\/p\/c1"/.test(items),"…listing the real pro and none of the demo pros",items.slice(0,200));
  map=[...(await req(I.port,"GET","/sitemap.xml")).body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  ok(map.includes("https://sawyer.example/hire/plumbing/austin-tx")&&map.includes("https://sawyer.example/hire/plumbing")&&map.includes("https://sawyer.example/hire/austin-tx"),"sitemap now lists that city page and its hubs",map.filter(u=>/hire/.test(u)).join(" "))}

 if(failed)throw new Error(failed+" check(s) failed");
 console.log("OK v45-e2e");
}catch(e){if(!/check\(s\) failed$/.test(String(e&&e.message)))console.log("FAIL crashed: "+String(e&&e.message||e).split("\n")[0].slice(0,300));console.error(e&&e.stack||e);failed++;}
finally{if(br)await br.close().catch(()=>{});await Promise.all(SERVERS.map(s=>stopApp(s)));process.exit(failed?1:0)}})();
