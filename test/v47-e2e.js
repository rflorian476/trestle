// v47 end-to-end. Self-contained: starts its own Sawyer servers (local test mode, no real email or SMS, payments in test
// mode). Covers health 2.30.0-sawyer / SW cache sawyer-v47 (or later), and: signed-out /dash prerendered (perf); unique
// meta descriptions and canonicals on every public page (SEO); QA v42 ideas 3 (lone reciprocity code), 5 (every traveler
// call on the dashboard card) and 10 (Drafts chip after a burst of duplicates); and Payroll in Office -> Time & payroll.
// Usage: node test/v47-e2e.js [shots dir]
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
 const created=!dir;dir=dir||fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v47-"));
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
 const SH=process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),"v47-shots-"));fs.mkdirSync(SH,{recursive:true});
 const L=await startApp();SERVERS.push(L);
 const act=async(S,ck,name,args)=>{const r=await req(S.port,"POST","/api/act",Object.assign(ck?{Cookie:ck}:{},JH),J({name,args}));return {res:(r.json&&r.json.res)||{},st:stateOf(r),status:r.status,error:r.json&&r.json.error}};
 const stateFor=async(S,ck)=>stateOf(await req(S.port,"GET","/api/state",ck?{Cookie:ck}:{}));
 const signup=async(S,kind,tag,zip,extra)=>{const email="v47-"+tag+"-"+run+"@example.com";const data=Object.assign({name:(kind==="pro"?"Val ":"Hana ")+tag,email,zip},kind==="pro"?{biz:"V47 "+tag+" "+run,trade:"Plumbing",phone:"5125550100",plan:"founding"}:{},extra||{});
  const r=await req(S.port,"POST","/api/signup",JH,J({kind,password:"v47-correct-horse",data}));return{status:r.status,error:r.json&&r.json.error,ck:sigCk(r),id:stateOf(r).me,st:stateOf(r),email}};
 const login=async(S,email)=>{const r=await req(S.port,"POST","/api/login",JH,J({email,password:"sawyer-demo-2026"}));return sigCk(r)};
 br=await chromium.launch();
 const page=async(S,w,ck)=>{const c=await br.newContext({viewport:{width:w,height:w<500?844:900},deviceScaleFactor:w<500?2:1,bypassCSP:true,hasTouch:w<500});
  if(ck){const [k,v]=ck.split("=");await c.addCookies([{name:k,value:v,url:S.B}])}
  const p=await c.newPage();p.on("dialog",d=>d.accept().catch(()=>{}));return{c,p}};
 const go=async(S,p,u,sel)=>{await p.goto(S.B+u,{waitUntil:"networkidle"});await p.waitForFunction(()=>typeof __PART!=="undefined"&&!__PART&&typeof me==="function",null,{timeout:60000,polling:100});if(sel)await p.waitForSelector(sel,{timeout:20000}).catch(()=>{})};
 const ymd=d=>new Date(Date.now()+d*864e5).toISOString().slice(0,10);
 const addD=(iso,n)=>{const d=new Date(iso+"T00:00:00Z");d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 const today=ymd(0),dow=(new Date(today+"T00:00:00Z").getUTCDay()+6)%7,thisMon=addD(today,-dow),lastMon=addD(thisMon,-7);
 const meta=b=>{const g=re=>((b.match(re)||[])[1]||"").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"');return{title:g(/<title>([^<]*)<\/title>/),desc:g(/<meta name="description" content="([^"]*)">/),canon:g(/<link rel="canonical" href="([^"]*)">/),robots:g(/<meta name="robots" content="([^"]*)"/)}};

 // --- release
 {const hz=(await req(L.port,"GET","/healthz")).json||{};ok(/^2\.(3\d|[4-9]\d)\.\d+-sawyer$/.test(hz.v||""),"healthz reports a Sawyer version from 2.30.0 on",J(hz));
  const sw=await req(L.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v(4[7-9]|[5-9]\d)"/.test(sw.body),"service worker cache is sawyer-v47 or later")}

 // --- PERF: signed-out /dash arrives prerendered (the sign-in card, like /signup and /myhome); signed-in /dash is still the dashboard
 {const r=await req(L.port,"GET","/dash");const b=r.body;ok(r.status===200&&/<div id="pre11">/.test(b)&&/id="authBox"/.test(b)&&(b.match(/<h1[\s>]/g)||[]).length===1&&/Sign in or join free/.test(b),"signed-out /dash: the first HTML is the prerendered sign-in card with one h1",r.status);
  ok(!/<div class="sk11 wrap"/.test(b)&&!/<link rel="preload" href="\/js\//.test(b),"…no skeleton, and no app-script preloads competing with the paint");
  ok(/noindex/.test(String(r.headers["x-robots-tag"]||""))&&/noindex/.test(meta(b).robots),"…still noindex (meta and header)");
  const q=await req(L.port,"GET","/dash?x=1");ok(q.status===200&&!/<div id="pre11">/.test(q.body),"/dash with a query string is not prerendered (same rule as /signup)");
  const ck=await login(L,"demo-pro@sawyer.test");const s=await req(L.port,"GET","/dash",{Cookie:ck});ok(s.status===200&&/<div id="pre11">/.test(s.body)&&!/id="authBox"/.test(s.body)&&/no-store/.test(String(s.headers["cache-control"]||"")),"signed-in /dash is still the prerendered dashboard (no sign-in card, no-store)");
  const {c,p}=await page(L,390);await go(L,p,"/dash","#authBox");const t=await p.evaluate(()=>({h1:[...document.querySelectorAll("h1")].map(h=>h.textContent),pre:!!document.getElementById("pre11"),box:!!document.getElementById("authBox"),sw:document.documentElement.scrollWidth}));
  ok(t.h1.length===1&&t.h1[0]==="Sign in or join free."&&!t.pre&&t.box&&t.sw<=390,"390: the app takes over the prerendered card in place (one h1, sign-in box, no overflow)",J(t));
  await p.screenshot({path:path.join(SH,"v47-dash-signed-out-390.png")});await c.close()}

 // --- SEO: every public page has its own description (70–160 chars, never the home page's), canonical aliases, noindex stays on
 const pub=await stateFor(L,null);const proId=((pub.users||[]).find(u=>u.id==="c1")||{}).id||"c1",trav=((pub.users||[]).find(u=>u.trav)||{}).id,job=((pub.jobs||[])[0]||{}).id,proj=((pub.projects||[])[0]||{}),tc=((pub.tcalls||[])[0]||{}).id;
 {const home=meta((await req(L.port,"GET","/")).body);ok(home.desc.length>=70&&home.desc.length<=160,"home description is 70–160 characters",home.desc.length);
  const pages=["/find","/prices","/pricing","/pros","/faq","/about","/jobs","/post","/travel","/signup","/credits","/projects","/join","/cmp","/estimate","/newproject","/newtravel","/perdiem","/lodging","/hire","/hire/plumbing","/hire/austin-tx","/hire/plumbing/austin-tx","/welcome","/track","/case","/ref","/verify","/wallet","/statement","/dash","/office","/myhome","/p/"+proId,"/traveler/"+trav,"/job/"+job,"/compare/"+job,"/project/"+proj.id,"/t/"+tc];
  const seen=new Map();let bad=[];for(const u of pages){const r=await req(L.port,"GET",u);const m=meta(r.body);if(r.status!==200||m.desc.length<70||m.desc.length>160||m.desc===home.desc||/Find trusted local contractors/.test(m.desc)||!m.canon||!/noindex/.test(m.robots))bad.push([u,r.status,m.desc.length,m.desc.slice(0,60)]);if(seen.has(m.desc))bad.push([u,"dup of",seen.get(m.desc)]);seen.set(m.desc,u)}
  ok(!bad.length,pages.length+" public and app pages: each a unique 70–160 character description (not the home text), a canonical, and noindex in beta",J(bad));
  const pr=meta((await req(L.port,"GET","/p/"+proId)).body);ok(/is a plumbing pro in Austin, TX\./.test(pr.desc)&&/stars from \d+ reviews? of finished jobs/.test(pr.desc),"pro page description: trade, town and stars from finished jobs",pr.desc);
  const pj=meta((await req(L.port,"GET","/project/"+proj.id)).body);ok(/crew spots open|crew full/.test(pj.desc)&&/: crew openings · Sawyer$/.test(pj.title),"project page: open crew spots in the description and the project name in the title",J(pj));
  const full=(await stateFor(L,await login(L,"demo-pm@sawyer.test"))).projects||[];const secret=(full.find(x=>x.id===proj.id)||{}).desc||"";ok(!secret||!pj.desc.includes(secret.slice(0,20)),"…never the project's private description");
  const tv=meta((await req(L.port,"GET","/traveler/"+trav)).body);const tu=(pub.users||[]).find(u=>u.id===trav)||{};ok(/^Traveling /.test(tv.desc)&&!tv.desc.includes(tu.name||"@@")&&/^Traveling .* · Sawyer$/.test(tv.title),"traveler profile: trade and home base, no name",J(tv));
  const a=meta((await req(L.port,"GET","/traveling")).body),b=meta((await req(L.port,"GET","/tcall/"+tc)).body),t=meta((await req(L.port,"GET","/t/"+tc)).body);
  ok(/\/travel$/.test(a.canon)&&new RegExp("/t/"+tc+"$").test(b.canon)&&b.desc===t.desc,"canonical: /traveling -> /travel, /tcall/<id> -> /t/<id> with the same description",J([a.canon,b.canon]));
  const {c,p}=await page(L,1300);for(const u of ["/p/"+proId,"/project/"+proj.id,"/hire/plumbing/austin-tx","/faq"]){const sv=meta((await req(L.port,"GET",u)).body);await go(L,p,u);await p.waitForTimeout(400);const cl=await p.evaluate(()=>[document.querySelector('meta[name="description"]').content,document.title]);ok(cl[0]===sv.desc&&cl[1]===sv.title,u+": the app keeps the same description and title after it mounts",J([cl,sv.desc]))}
  await p.evaluate(()=>{history.pushState({},"","/pricing");dispatchEvent(new PopStateEvent("popstate"))});await p.waitForTimeout(500);const nv=await p.evaluate(()=>document.querySelector('meta[name="description"]').content);const sp=meta((await req(L.port,"GET","/pricing")).body);ok(nv===sp.desc,"in-app navigation updates the description to the new page's",nv);await c.close()}

 // --- QA v42 idea 3: a lone two-letter code in a reciprocity line is that state
 {const {c,p}=await page(L,1300);await go(L,p,"/travel");const r=await p.evaluate(()=>{const f=s=>v41ParseRecip(s).join(",");return{dc:f("DC"),va:f("va."),vb:f(" VA "),list:f("TX, OK"),no:f("No reciprocity"),xx:f("XX"),words:f("COME IN WITH YOUR CARD OR ASK ME"),dcName:f("Washington, D.C."),wa:f("Washington state")}});
  ok(r.dc==="DC"&&r.va==="VA"&&r.vb==="VA","a reciprocity line of only DC / va. / VA parses as that state",J(r));
  ok(r.list==="TX,OK"&&r.no===""&&r.xx===""&&r.words===""&&r.dcName==="DC"&&r.wa==="WA","lists, 'No reciprocity', unknown codes, everyday words and D.C. rules are unchanged",J(r));
  const acc=await p.evaluate(()=>v41Accepts({lstate:"MD",recip:"DC"}));ok(Array.isArray(acc)?acc.includes("DC"):JSON.stringify(acc).includes("DC"),"…and the fit check accepts DC cards on that call",J(acc));await c.close()}

 // --- QA v42 idea 5: "Your traveler calls" shows every call (4 + Show N more), open calls first by days to start
 {const ck=await login(L,"demo-electrical@sawyer.test");const mk=[["Honolulu","HI",30],["Detroit","MI",9],["Austin","TX",14],["Phoenix","AZ",21],["Denver","CO",40]];
  for(const [loc,st,dd] of mk){const r=await act(L,ck,"postTravel",[{trade:"Electrical",title:"V47 call "+loc+" "+run,loc,state:st,weeks:8,hours:"5x10s",rate:44,perDiem:100,lic:"Journeyman",start:ymd(dd),need:3,type:"Commercial",desc:"v47 test"}]);ok(r.res.ok,"posted a traveler call in "+st,J(r.res))}
  const eS=await stateFor(L,ck);const mine=(eS.tcalls||[]).filter(x=>x.by===eS.me&&!x.ownerGone36);
  for(const w of [390,1300]){const {c,p}=await page(L,w,ck);await go(L,p,"/dash","#v41calls");const info=()=>p.evaluate(()=>{const s=document.getElementById("v41calls");const rows=[...s.querySelectorAll(".v41row")];const b=s.querySelector("[data-v47calls]");return{rows:rows.length,vis:rows.filter(r=>r.offsetParent).map(r=>r.querySelector("b").textContent),btn:b&&b.textContent,exp:b&&b.getAttribute("aria-expanded"),ctl:b&&b.getAttribute("aria-controls"),all:(s.querySelector('a[href="/tdash"]')||{}).textContent,sw:document.documentElement.scrollWidth}});
   const a=await info();ok(a.rows===mine.length&&a.vis.length===4&&a.btn===`Show ${mine.length-4} more calls`&&a.exp==="false"&&a.ctl==="v47callul"&&a.sw<=w,w+": every call is in the card, 4 showing, with 'Show "+(mine.length-4)+" more calls'",J(a));
   ok(/^V47 call Detroit/.test(a.vis[0]||""),w+": open calls start with the soonest start (Detroit, 9 days)",J(a.vis));
   await p.click("[data-v47calls]");await p.waitForTimeout(200);const b=await info();ok(b.vis.length===mine.length&&b.exp==="true"&&b.btn==="Show fewer calls"&&b.vis.some(x=>/Honolulu/.test(x))&&b.sw<=w,w+": Show more opens the rest in place, including the Honolulu call",J(b));
   if(w===390)await (await p.$("#v41calls")).screenshot({path:path.join(SH,"v47-traveler-calls-390.png")});
   await p.waitForTimeout(4600);const c2=await info();ok(c2.vis.length===mine.length&&c2.exp==="true",w+": it stays open through the 4-second refresh",J(c2));
   await p.click("[data-v47calls]");await p.waitForTimeout(200);const d=await info();ok(d.vis.length===4&&d.exp==="false",w+": Show fewer collapses it again",J(d));await c.close()}}

 // --- QA v42 idea 10: Drafts chip count after a burst of duplicates
 {const P=await signup(L,"pro","dr","78704");const cu=await act(L,P.ck,"saveCust",[{name:"Burst Co",email:"draft-"+run+"@example.com"}]);const ids=[];
  for(let i=0;i<3;i++){const r=await act(L,P.ck,"saveBill",[{type:"inv",cust:cu.res.id,title:"Source "+i,lines:[{d:"Work",q:1,r:100+i}],tax:0,due:ymd(14)}]);await act(L,P.ck,"sendBill",[r.res.id]);ids.push(r.res.id)}
  const rs=await Promise.all([...ids,...ids,...ids].map(id=>act(L,P.ck,"dupBill42",[id])));ok(rs.every(r=>r.res.ok),"9 parallel duplicates of 3 invoices",J(rs.map(r=>r.res.msg)));
  const {c,p}=await page(L,1300,P.ck);await go(L,p,"/office/invoices",".chip7");const x=await p.evaluate(()=>{const ch={};document.querySelectorAll(".chip7").forEach(a=>{const n=a.querySelector("small");ch[a.textContent.replace(n?n.textContent:"","").trim()]=+(n?n.textContent:"NaN")});const rows=[...document.querySelectorAll("table.o7t tbody tr")].map(t=>t.textContent);return{ch,rows:rows.length,drafts:rows.filter(t=>/Draft/.test(t)).length}});
  const bills=((await stateFor(L,P.ck)).bills||[]).filter(b=>b.by===P.id&&b.type==="inv");
  ok(x.ch.All===x.rows&&x.ch.Drafts===x.drafts&&x.ch.Drafts===bills.filter(b=>b.status==="draft").length,"the Drafts chip matches the draft rows and the records after the burst",J([x,bills.length]));
  await p.click('.chip7:has-text("Drafts")');await p.waitForTimeout(500);const y=await p.evaluate(()=>document.querySelectorAll("table.o7t tbody tr").length);ok(y===x.ch.Drafts,"the Drafts filter lists exactly that many",y);await c.close()}

 // --- Payroll (Office -> Time & payroll)
 const P=await signup(L,"pro","pay","78704"),X=await signup(L,"pro","payx","78704"),C=await signup(L,"customer","paycu","78704");ok(P.ck&&X.ck&&C.ck,"a pro, a second pro and a customer sign up",J([P.error,X.error,C.error]));
 const tsOf=async ck=>{const st=await stateFor(L,ck);const meU=(st.users||[]).find(u=>u.id===st.me)||{};return{st,ts:(st.tsheets||[]).filter(t=>t.by===st.me),runs:meU.pr47||[],led:(st.ledger||[]).filter(l=>l.by===st.me)}};
 const log=async(who,role,date,hrs,rate,job)=>{const r=await act(L,P.ck,"logTime",[{who,role,job:job||"Kitchen repipe",date,hrs:String(hrs),rate:rate==null?"":String(rate)}]);ok(r.res.ok,"logged "+hrs+" hrs for "+who+" on "+date,J(r.res))};
 for(let i=0;i<5;i++)await log("Luis Ortega","Journeyman",addD(lastMon,i),9,30);
 await log("Kayla Brooks","Apprentice",addD(lastMon,1),8,25,"Bath remodel");await log("Kayla Brooks","Apprentice",addD(lastMon,2),4,35,"Bath remodel");await log("Kayla Brooks","Apprentice",addD(lastMon,3),3,25);
 await log("=Sam Formula","Laborer",addD(lastMon,4),6,null);
 await log("Val pay","Owner",addD(lastMon,4),5,null);
 await log("Luis Ortega","Journeyman",addD(lastMon,-2),7,30);// the week before: not in this run
 {const {ts}=await tsOf(P.ck);for(const t of ts){if(t.who==="Kayla Brooks"&&t.hrs===3)continue;await act(L,P.ck,"approveTime",[t.id])}}
 for(const [ck,who] of [[null,"signed out"],[C.ck,"a customer"]]){const r=await act(L,ck,"pr47Pay",[lastMon,{date:today}]);ok(r.res.ok!==true&&(r.status>=400||r.res.need==="login"||/pro accounts/.test(r.res.msg||"")),who+": pr47Pay is refused",J([r.status,r.res]))}
 {const r=await act(L,X.ck,"pr47Pay",[lastMon,{date:today,rates:{"=sam formula":"20"}}]);const {ts,runs}=await tsOf(P.ck);ok(r.res.ok===false&&!ts.some(t=>t.pr47)&&!runs.length&&!ts.some(t=>t.who==="=Sam Formula"&&t.rate),"another pro can't pay (or set rates on) someone else's hours",J(r.res))}
 for(const [wk,o,re,n] of [[addD(lastMon,1),{},/pay week/,"a week that doesn't start on Monday"],[addD(thisMon,7),{},/hasn't started/,"a future week"],["soon",{},/pay week/,"not a date"],[lastMon,{date:ymd(2)},/future|pay rate/,"a future paid date"]]){const r=await act(L,P.ck,"pr47Pay",[wk,o]);ok(r.res.ok===false&&re.test(r.res.msg||""),"validation: "+n+" is refused",J(r.res))}
 {const r=await act(L,P.ck,"pr47Pay",[lastMon,{date:today}]);ok(r.res.ok===false&&r.res.field==="rate"&&/=Sam Formula/.test(r.res.msg||"")&&!/Val pay/.test(r.res.msg||""),"hours with no pay rate block the run and name the person (the owner's rate-less hours don't)",J(r.res))}
 {const r=await act(L,P.ck,"pr47Pay",[lastMon,{date:addD(lastMon,-1),rates:{"=sam formula":"20"}}]);ok(r.res.ok===false&&r.res.field==="date"&&/before the week/.test(r.res.msg||""),"a paid date before the week starts is refused",J(r.res))}
 // the UI shows the week before paying
 {const {c,p}=await page(L,390,P.ck);await go(L,p,"/office/time?wk="+lastMon,"#pr47");const u=await p.evaluate(()=>{const s=document.getElementById("pr47");const rows=[...s.querySelectorAll(".pr47-tbl tbody tr")].map(r=>[...r.cells].map(c=>c.textContent.trim()));return{tab:(document.querySelector('.o7-tabs a[aria-current="page"]')||{}).textContent,rows,tot:(s.querySelector("#pr47Tot")||{}).textContent,own:!!s.querySelector(".pr47-own"),warn:!!s.querySelector(".pr47-warn"),rate:!!s.querySelector("[data-pr47rate]"),sw:document.documentElement.scrollWidth,wk:s.querySelector("#pr47wk").value}});
  ok(u.tab==="Time & payroll"&&u.wk===lastMon,"390: Office tab reads 'Time & payroll' and the chosen week is selected",J([u.tab,u.wk]));
  const luis=u.rows.find(r=>/Luis Ortega/.test(r[0]))||[],kay=u.rows.find(r=>/Kayla Brooks/.test(r[0]))||[];
  ok(luis[1]==="40.00"&&luis[2]==="5.00"&&luis[3]==="$30.00"&&luis[4]==="$1,425.00","Luis: 45 hrs = 40 regular + 5 overtime at 1.5x $30 = $1,425.00",J(luis));
  ok(kay[1]==="12.00"&&kay[2]==="–"&&kay[4]==="$340.00"&&/28\.33/.test(kay[3]),"Kayla: 8 hrs at $25 + 4 at $35 = $340.00 (regular rate $28.33); her unapproved 3 hrs are left out",J(kay));
  ok(u.own&&u.warn&&u.rate&&u.sw<=390,"390: owner hours are left off with a note, Sam's missing rate has an input, no horizontal overflow",J(u));
  await p.screenshot({path:path.join(SH,"v47-payroll-before-390.png"),fullPage:false});
  await p.fill('[data-pr47rate="=sam formula"]',"20");await p.selectOption("#pr47m","Direct deposit");await p.click('#pr47F button[type=submit]');await p.waitForFunction(()=>!document.getElementById("pr47F")||document.querySelector(".pr47-p"),null,{timeout:10000}).catch(()=>{});await p.waitForTimeout(600);
  const after=await p.evaluate(()=>({paid:[...document.querySelectorAll(".pr47-p li")].map(l=>l.textContent.replace(/\s+/g," ").trim()),badges:[...document.querySelectorAll(".o7t .b7")].filter(b=>b.textContent==="Paid").length,sw:document.documentElement.scrollWidth}));
  ok(after.paid.length===1&&/Direct deposit/.test(after.paid[0])&&/\$1,885\.00/.test(after.paid[0])&&after.badges>=7&&after.sw<=390,"390: Mark week paid → the week is in Paid weeks ($1,885.00 by direct deposit) and its log entries read Paid",J(after));
  await p.screenshot({path:path.join(SH,"v47-payroll-paid-390.png"),fullPage:false});await c.close()}
 let runId;{const {ts,runs,led}=await tsOf(P.ck);const r=runs[0]||{};runId=r.id;const w=led.filter(l=>l.pr47===r.id);
  ok(runs.length===1&&r.wk===lastMon&&r.date===today&&r.method==="Direct deposit"&&r.total===1885&&r.lines.length===3,"one run: week, date, method, total $1,885.00 (1,425 + 340 + 6 x $20)",J(r));
  ok(w.length===3&&w.every(l=>l.cat==="Wages"&&l.kind==="exp"&&l.job===""&&l.date===today)&&w.find(l=>l.vendor==="Luis Ortega").amt===1425&&w.find(l=>l.vendor==="Kayla Brooks").amt===340&&w.find(l=>l.vendor==="=Sam Formula").amt===120,"each person's gross is a Wages expense on the paid date, with no job tag",J(w));
  const paidTs=ts.filter(t=>t.pr47===r.id);ok(paidTs.length===8&&!ts.find(t=>t.hrs===3&&t.who==="Kayla Brooks").pr47&&!ts.find(t=>t.who==="Val pay").pr47&&!ts.find(t=>t.date===addD(lastMon,-2)).pr47&&ts.find(t=>t.who==="=Sam Formula").rate===20,"the 8 paid entries are locked to the run; unapproved, owner and other-week hours aren't; Sam's typed rate is saved",J(paidTs.length))}
 {const {ts,led}=await tsOf(P.ck);const t=ts.find(x=>x.pr47);const l=led.find(x=>x.pr47);
  for(const [nm,args,re] of [["approveTime",[t.id],/payroll/],["delTime",[t.id],/payroll/],["delLedger",[l.id],/Undo the payroll run/],["editLedger40",[l.id,{amt:"1.00"}],/payroll/]]){const r=await act(L,P.ck,nm,args);ok(r.res.ok===false&&re.test(r.res.msg||""),nm+" on paid payroll is refused",J(r.res))}
  const r=await act(L,P.ck,"pr47Pay",[lastMon,{date:today}]);ok(r.res.ok===false&&/No approved hours/.test(r.res.msg||""),"paying the same hours twice is refused",J(r.res));
  const u=await act(L,X.ck,"pr47Undo",[runId]);ok(u.res.ok===false&&(await tsOf(P.ck)).runs.length===1,"another pro can't undo someone else's run",J(u.res))}
 {const sx=await stateFor(L,X.ck),so=await stateFor(L,null),sc=await stateFor(L,C.ck);const pu=s=>(s.users||[]).find(u=>u.id===P.id)||{};
  ok(!("pr47" in pu(sx))&&!("pr47" in pu(so))&&!("pr47" in pu(sc))&&!J(sx.ledger||[]).includes("Luis Ortega")&&!J(so).includes("Luis Ortega")&&!J(sc.tsheets||[]).includes("Luis Ortega"),"payroll is private: other pros, customers and signed-out state never see runs, wages or hours")}
 // overtime across two runs in the same week
 await log("Luis Ortega","Journeyman",addD(lastMon,5),5,30);{const {ts}=await tsOf(P.ck);const t=ts.find(x=>x.date===addD(lastMon,5)&&x.who==="Luis Ortega");await act(L,P.ck,"approveTime",[t.id]);
  const r=await act(L,P.ck,"pr47Pay",[lastMon,{date:today,method:"Check"}]);const {runs}=await tsOf(P.ck);const r2=runs.find(x=>x.id===r.res.id)||{};const l=(r2.lines||[])[0]||{};
  ok(r.res.ok&&runs.length===2&&l.who==="Luis Ortega"&&l.ot===5&&l.reg===0&&l.gross===225,"a second run in the same week counts the 45 hrs already paid: 5 more hrs are all overtime ($225.00)",J([r.res,l]));
  const u=await act(L,P.ck,"pr47Undo",[r.res.id]);ok(u.res.ok,"undo the second run",J(u.res))}
 // the books in the browser: P&L / tax line, job costing unchanged, CSV (formula-safe), backup, overview alert
 {const {c,p}=await page(L,1300,P.ck);await go(L,p,"/office/time?wk="+lastMon,"#pr47");
  const b=await p.evaluate(LASTMON=>{const m=me();const csv=pr47Csv(m);const bk=v31Backup(m);return{sch:V9SCHC.Wages,csv:csv.split("\r\n").slice(0,5),bk:(bk&&bk.files||[]).map(f=>f[0]),jc:jc11(m,"Kitchen repipe"),jcx:v7Mine("tsheets",m).filter(t=>t.job==="Kitchen repipe").reduce((a,t)=>a+t.hrs*(t.rate||0),0),wk47:pr47Wk(LASTMON),label:document.querySelector('.o7-tabs a[aria-current="page"]').textContent}},lastMon);
  ok(b.sch==="Line 26 Wages","Wages expenses land on Schedule C line 26 in the tax file",b.sch);
  ok(/^Week start,Week end,Date paid,Method,Person/.test(b.csv[0])&&b.csv.some(x=>/"'=Sam Formula"/.test(x))&&b.csv.some(x=>/Luis Ortega,Journeyman,40,5,30\.00,1425\.00/.test(x)),"Payroll (CSV) lists each person per run and escapes a formula-looking name",J(b.csv));
  ok(b.bk.includes("payroll.csv"),"Back up everything includes payroll.csv",J(b.bk));
  ok(b.jc&&Math.abs(b.jc.lab-b.jcx)<0.01&&b.jc.mat===0,"job costing still counts labor once from the timesheets (wages aren't added as materials)",J(b.jc&&{lab:b.jc.lab,x:b.jcx,mat:b.jc.mat,hrs:b.jc.hrs}));
  await go(L,p,"/office","#app");const al=await p.evaluate(()=>document.getElementById("app").innerText);{const mm=al.match(/Payroll for the week of[^\n]*/g)||[];ok(mm.length===1&&mm[0].includes(b.wk47)&&/1 person, 5 approved hours/.test(mm[0]),"the overview alert only counts last week's unpaid hours (the late 5 hrs left after the undo)",mm)}
  await p.screenshot({path:path.join(SH,"v47-payroll-1300.png"),fullPage:false});await c.close()}
 {const r=await act(L,P.ck,"pr47Undo",[runId]);const {ts,runs,led}=await tsOf(P.ck);ok(r.res.ok&&!runs.length&&!led.some(l=>l.pr47)&&!ts.some(t=>t.pr47),"undo takes the Wages expenses off and unlocks the hours",J(r.res));
  const r2=await act(L,P.ck,"pr47Undo",[runId]);ok(r2.res.ok===false,"undoing twice is refused",J(r2.res));
  const d=await act(L,P.ck,"delTime",[ts.find(t=>t.who==="=Sam Formula").id]);ok(d.res.ok,"unlocked hours can be deleted again",J(d.res))}
 {const {c,p}=await page(L,1300,P.ck);await go(L,p,"/office","#app");const al=await p.evaluate(()=>document.getElementById("app").innerText);ok(/Payroll for the week of .* is ready: 2 people, 62 approved hours, not marked paid\./.test(al),"the overview flags last week's unpaid approved hours",al.match(/Payroll for[^\n]*/)&&al.match(/Payroll for[^\n]*/)[0]);await c.close()}
 {const {c,p}=await page(L,390,C.ck);await go(L,p,"/office/time","#app");ok(!(await p.$("#pr47")),"390 customer: no payroll card");await c.close()}
 {const ck=await login(L,"demo-pro@sawyer.test");const {c,p}=await page(L,1300,ck);await go(L,p,"/office/time","#pr47");const d=await p.evaluate(()=>({rows:document.querySelectorAll(".pr47-tbl tbody tr").length,sw:document.documentElement.scrollWidth}));ok(d.rows>=1&&d.sw<=1300,"demo pro: the payroll card opens on a week with sample hours",J(d));await c.close()}

 if(failed)throw new Error(failed+" check(s) failed");
 console.log("OK v47-e2e");
}catch(e){if(!/check\(s\) failed$/.test(String(e&&e.message)))console.log("FAIL crashed: "+String(e&&e.message||e).split("\n")[0].slice(0,300));console.error(e&&e.stack||e);failed++;}
finally{if(br)await br.close().catch(()=>{});await Promise.all(SERVERS.map(s=>stopApp(s)));process.exit(failed?1:0)}})();
