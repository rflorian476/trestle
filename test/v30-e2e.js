// v30 end-to-end. Self-contained: starts its own Sawyer server (local test mode) and a public-host simulation (RENDER=1).
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v30-"));
 const env=Object.assign({},process.env,{HOST:"127.0.0.1",PORT:String(port),DATA_DIR:dir,RATE_X:"50"});
 for(const k of ["NODE_ENV","RENDER","AUTH_TEST_MODE","STAFF_DEMO_PASSWORD","RESEND_API_KEY","SENDGRID_API_KEY","EMAIL_FROM","MAIL_FROM","RESEND_API_URL","TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_FROM","TWILIO_MESSAGING_SERVICE_SID","TEST_NOW","SAWYER_BASE_URL","PUBLIC_URL","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","APPLE_CLIENT_ID","MICROSOFT_CLIENT_ID","FACEBOOK_APP_ID"])if(!extra||!(k in extra))delete env[k];
 if(extra)Object.assign(env,extra);
 const child=spawn(process.execPath,[path.join(ROOT,"server.js")],{env,stdio:["ignore","pipe","pipe"]});
 let log="";child.stdout.on("data",d=>{log+=d});child.stderr.on("data",d=>{log+=d});
 return new Promise((res,no)=>{const t=setTimeout(()=>no(new Error("server did not start\n"+log.slice(-400))),15000);
  const wait=()=>{if(/live on/.test(log)){clearTimeout(t);res({child,dir,log:()=>log,port,B:"http://127.0.0.1:"+port})}else setTimeout(wait,30)};
  child.on("exit",c=>{clearTimeout(t);no(new Error("server exited "+c+"\n"+log.slice(-400)))});wait()})}
function stopApp(s){return new Promise(res=>{if(!s)return res();const done=()=>{try{fs.rmSync(s.dir,{recursive:true,force:true})}catch(e){}res()};s.child.on("exit",done);s.child.kill("SIGTERM");setTimeout(()=>{try{s.child.kill("SIGKILL")}catch(e){}},3000)})}
function req(port,method,p,headers,body){return new Promise((res,no)=>{const r=http.request({hostname:"127.0.0.1",port,path:p,method,headers:headers||{}},rs=>{const ch=[];rs.on("data",c=>ch.push(c));rs.on("end",()=>{let buf=Buffer.concat(ch);const enc=rs.headers["content-encoding"];if(enc==="gzip")buf=zlib.gunzipSync(buf);else if(enc==="br")buf=zlib.brotliDecompressSync(buf);let json=null;try{json=JSON.parse(buf.toString("utf8"))}catch(e){}res({status:rs.statusCode,headers:rs.headers,body:buf.toString("utf8"),json,raw:buf})})});r.on("error",no);if(body)r.write(body);r.end()})}
const J=o=>JSON.stringify(o),JH={"Content-Type":"application/json"};
const toasts=p=>p.evaluate(()=>[...document.querySelectorAll("#toasts .toast")].map(t=>t.textContent.trim()));
const pre=h=>(h.match(/<div id="pre11">[\s\S]*$/)||[""])[0].replace(/<script[\s\S]*?<\/script>/g,"");
const login=async(port,email,pw)=>{const r=await req(port,"POST","/api/login",JH,J({email,password:pw||"sawyer-demo-2026"}));return {ck:(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0],st:(r.json&&r.json.state)||{}}};
const stateOf=r=>(r.json&&(r.json.state||r.json))||{};
const act=async(port,ck,name,args)=>{const r=await req(port,"POST","/api/act",Object.assign({Cookie:ck},JH),J({name,args}));return {res:(r.json&&r.json.res)||{},st:stateOf(r),status:r.status}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// Covers: the pro dashboard "Sawyer vs pay-per-lead" card (dated, hedged, recalculates, no exact competitor prices, only
// for pros), the dashboard "Renewals coming up" card (pros' licenses/insurance and travelers' wallet cards, expired first,
// 60-day window, no duplicate What's-next item, private), per-trade fill on project managers' dashboard project cards,
// the tax-year CSV's invoice register, health 2.13.0-sawyer and SW cache sawyer-v30.
let LOCAL=null,br=null;
const dayISO=n=>{const d=new Date(Date.now()+n*864e5);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
(async()=>{try{
 LOCAL=await startApp(await freePort(),{});
 br=await chromium.launch();
 const errs=[];
 const page=async(w,cookie)=>{const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900}});
  if(cookie){const [k,v]=cookie.split("=");await c.addCookies([{name:k,value:v,url:LOCAL.B}])}
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return p};
 const dash=async(w,ck)=>{const p=await page(w,ck);await p.goto(LOCAL.B+"/dash",{waitUntil:"networkidle"});await p.waitForTimeout(400);return p};
 const hz=(await req(LOCAL.port,"GET","/healthz")).json||{};ok(hz.v==="2.13.0-sawyer","healthz reports 2.13.0-sawyer",J(hz));
 const sw=await req(LOCAL.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v30"/.test(sw.body),"service worker cache is sawyer-v30");
 const pro=await login(LOCAL.port,"demo-pro@sawyer.test"),ho=await login(LOCAL.port,"demo-homeowner@sawyer.test"),pm=await login(LOCAL.port,"demo-pm@sawyer.test"),tv=await login(LOCAL.port,"demo-traveler@sawyer.test");
 ok(pro.ck&&ho.ck&&pm.ck&&tv.ck,"demo pro, homeowner, PM and traveler sign in");
 const run=Math.random().toString(36).slice(2,8);
 const signup=async(trade,zip,tag)=>{const r=await req(LOCAL.port,"POST","/api/signup",JH,J({kind:"pro",password:"v30-correct-horse",data:{name:"Vee "+tag,biz:"V30 "+tag+" "+run,email:"v30-"+tag+"-"+run+"@example.com",trade,zip,phone:"5125550100",plan:"founding"}}));
  return {ck:(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0],id:stateOf(r).me,status:r.status}};

 // ===== 1. Pro dashboard compare card =====
 for(const w of [1440,390]){const p=await dash(w,pro.ck);
  const o=await p.evaluate(()=>{const c=document.getElementById("v30cmp");if(!c)return null;const r=c.getBoundingClientRect();return{t:c.innerText.replace(/\s+/g," "),h:c.innerHTML,inAside:!!c.closest("aside"),vis:r.height>0,w:r.width,ow:document.documentElement.scrollWidth>innerWidth+1,n:document.querySelectorAll("#v30cmp").length,pros:!!document.getElementById("calcOut")}});
  ok(o&&o.n===1&&o.vis&&o.inAside&&!o.ow,w+" pro dash: one compare card in the sidebar, visible, no overflow",J(o&&{n:o.n,vis:o.vis,inAside:o.inAside,ow:o.ow,w:o.w}));
  ok(o&&/Pay-per-lead, at these numbers \$4,320\/yr/.test(o.t)&&/Sawyer, first year \$180\/yr/.test(o.t)&&/keep \$4,140/i.test(o.t),w+" compare card: 8 × $45 example reads $4,320 vs $180, keep $4,140",o&&o.t.slice(0,400));
  ok(o&&/example of 8 leads a month at \$45 a lead, checked November 2026/.test(o.t)&&/vary/.test(o.t),w+" compare card: dated, hedged note",o&&o.t);
  ok(o&&!/\$287|\$18–\$300|\$15–\$75|~\$150|Pay-per-lead sites/.test(o.h),w+" compare card: no exact competitor prices, no old 'Pay-per-lead sites' label");
  ok(o&&!o.pros,w+" pro dash has no /pros calculator ids (no id clash)");
  await p.$eval("#v30cl",e=>{e.value=10;e.dispatchEvent(new Event("input",{bubbles:true}))});
  const c2=await p.$eval("#v30cmp",e=>e.innerText.replace(/\s+/g," "));ok(/Leads a month: 10/.test(c2)&&/at these numbers \$5,400\/yr/.test(c2)&&/\$5,220/.test(c2),w+" compare card recalculates (10 × $45 = $5,400, keep $5,220)",c2.slice(0,300));
  await p.$eval("#v30cc",e=>{e.value=20;e.dispatchEvent(new Event("input",{bubbles:true}))});
  const c3=await p.$eval("#v30cmp",e=>e.innerText.replace(/\s+/g," "));ok(/Cost per lead: \$20/.test(c3)&&/\$2,400\/yr/.test(c3)&&/\$2,220/.test(c3),w+" cost slider recalculates (10 × $20)",c3.slice(0,300));
  await p.click("#v30cmp summary");const d=await p.$eval("#v30cmp details",e=>({open:e.open,t:e.innerText.replace(/\s+/g," ")}));
  ok(d.open&&/Thumbtack/.test(d.t)&&/HomeAdvisor \/ Angi/.test(d.t)&&/checked November 2026/.test(d.t)&&/isn't affiliated/.test(d.t),w+" 'How Sawyer compares' expands with the dated, hedged rows",d.t.slice(0,300));
  const a=await p.$eval("#v30cmp a.v30cmp-a",e=>e.getAttribute("href"));ok(a==="/pros",w+" 'Full comparison' links to /pros",a);
  if(w===390){const ow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);ok(!ow,"390: no overflow with the comparison open")}
  await p.context().close()}
 for(const [lab,ck] of [["homeowner",ho.ck],["PM",pm.ck],["traveler",tv.ck]]){const p=await dash(1440,ck);const n=await p.$$eval("#v30cmp",a=>a.length);ok(n===0,lab+" dashboard has no pro compare card");await p.context().close()}
 {const r=await req(LOCAL.port,"GET","/dash");ok(!/id="v30cmp"/.test(r.body),"signed-out /dash HTML has no compare card")}

 // ===== 2. Renewals coming up =====
 const np=await signup("Electrical","78704","rn");ok(np.ck,"a new electrical pro signs up");
 {const p=await dash(1440,np.ck);ok(await p.$$eval("#v30renew",a=>a.length)===0,"no renewals card when nothing expires");await p.context().close()}
 const save=async(ck,o)=>(await act(LOCAL.port,ck,"saveDoc",[o])).res;
 {const a=await save(np.ck,{scope:"biz",kind:"license",name:"TX electrical contractor license",num:"TECL 31234",state:"TX",exp:dayISO(20)});
  const b=await save(np.ck,{scope:"biz",kind:"gl",name:"General liability, $1M/$2M",num:"GL-88",exp:dayISO(-5)});
  const c=await save(np.ck,{scope:"biz",kind:"wc",name:"Workers' comp",num:"WC-1",exp:dayISO(200)});
  const d=await save(np.ck,{scope:"biz",kind:"bond",name:"License bond",num:"B-1",exp:dayISO(59)});
  ok(a.ok&&b.ok&&c.ok&&d.ok,"pro saves a license (20 days), an expired policy, workers' comp (200 days) and a bond (59 days)",J([a,b,c,d]))}
 for(const w of [1440,390]){const p=await dash(w,np.ck);
  const o=await p.evaluate(()=>{const c=document.getElementById("v30renew");if(!c)return null;const na=document.querySelector("section.na8");return{items:[...c.querySelectorAll(".v30rn-l li")].map(li=>({cls:li.className,t:li.innerText.replace(/\s+/g," "),href:li.querySelector("a").getAttribute("href")})),head:c.querySelector(".v30rn-h").innerText.replace(/\s+/g," "),
   afterNa8:!na||!!(na.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING),dup:na?/license or insurance doc/.test(na.innerText):false,ow:document.documentElement.scrollWidth>innerWidth+1,vis:c.offsetHeight>0}});
  ok(o&&o.vis&&o.items.length===3&&!o.ow,w+" renewals card lists 3 docs (workers' comp at 200 days is left out), no overflow",J(o));
  ok(o&&/General liability/.test(o.items[0].t)&&/Expired/.test(o.items[0].t)&&o.items[0].cls==="v30rn-bad",w+" expired policy is first and marked expired",J(o&&o.items[0]));
  ok(o&&/TX electrical contractor license/.test(o.items[1].t)&&/Expires in 20 days/.test(o.items[1].t)&&/License bond/.test(o.items[2].t)&&/59 days/.test(o.items[2].t),w+" then the license (20 days), then the bond (59 days)",J(o&&o.items));
  ok(o&&o.items.every(i=>i.href==="/office/compliance"),w+" each row opens Office > Licenses & COIs",J(o&&o.items.map(i=>i.href)));
  ok(o&&/1 expired · 3 in the next 60 days/.test(o.head),w+" header: '1 expired · 3 in the next 60 days'",o&&o.head);
  ok(o&&o.afterNa8&&!o.dup,w+" card sits under What's next, which no longer repeats 'docs need attention'",J(o&&{a:o.afterNa8,d:o.dup}));
  await p.context().close()}
 {await act(LOCAL.port,np.ck,"sweep9",[]);const s=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:np.ck}));const ns=(s.notifs||[]).filter(n=>n.to===np.id&&/TX electrical contractor license expires in|General liability.*expired/.test(n.text)).map(n=>n.text);
  ok(ns.length>=2,"bell reminders still go out for the license and the expired policy",J(ns))}
 {const p=await dash(390,pro.ck);const o=await p.evaluate(()=>{const c=document.getElementById("v30renew");return c?[...c.querySelectorAll(".v30rn-l li")].map(li=>li.innerText.replace(/\s+/g," ")):null});
  ok(o&&o.length===4&&/Expired/.test(o[0])&&o.some(t=>/^Drug test result · 10-panel, clean/.test(t)),"demo pro: 4 rows shown, expired first, wallet card named by type ('Drug test result · 10-panel, clean')",J(o));
  const more=await p.$eval("#v30renew .v30rn-more",e=>e.textContent).catch(()=>"");ok(/^\+\d+ more$/.test(more),"demo pro: '+N more' link for the rest",more);await p.context().close()}
 {const r=await save(tv.ck,{scope:"trav",kind:"osha",name:"OSHA 30",num:"OSHA-30-1",exp:dayISO(10)});ok(r.ok,"traveler saves an OSHA 30 card expiring in 10 days",J(r));
  const p=await dash(390,tv.ck);const o=await p.evaluate(()=>{const c=document.getElementById("v30renew");return c?[...c.querySelectorAll(".v30rn-l li")].map(li=>({t:li.innerText.replace(/\s+/g," "),h:li.querySelector("a").getAttribute("href")})):null});
  ok(o&&o.some(x=>/OSHA 10 \/ 30 card · OSHA 30/.test(x.t)&&/Expires in 10 days/.test(x.t)&&x.h==="/wallet"),"traveler dashboard: OSHA card listed, 10 days left, opens the wallet",J(o));await p.context().close()}
 for(const [lab,ck] of [["signed-out",null],["the homeowner",ho.ck],["another pro",pro.ck]]){const s=stateOf(await req(LOCAL.port,"GET","/api/state",ck?{Cookie:ck}:{}));
  ok(!(s.bdocs||[]).some(d=>d.by===np.id),lab+" /api/state: none of the new pro's documents",J((s.bdocs||[]).filter(d=>d.by===np.id).length))}

 // ===== 3. Per-trade fill on PM project cards =====
 for(const w of [1440,390]){const p=await dash(w,pm.ck);
  const o=await p.evaluate(()=>{const g=id=>{const a=document.querySelector('#app a.upm[href="/project/'+id+'"]');return a?[...a.querySelectorAll(".v30tr li")].map(li=>({c:li.className,t:li.innerText.replace(/\s+/g," ")})):null};return{p1:g("p1"),p3:g("p3"),p4:g("p4"),ow:document.documentElement.scrollWidth>innerWidth+1}});
  ok(o.p1&&o.p1.some(x=>x.t==="Concrete finishers 1 of 3 filled"&&x.c==="part")&&o.p1.some(x=>x.t==="Pool plumber 0 of 1 filled"&&x.c==="open"),w+" pool build card: 'Concrete finishers 1 of 3 filled', 'Pool plumber 0 of 1 filled'",J(o.p1));
  ok(o.p1&&o.p1.length===5&&o.p1[4].t==="+2 more trades"&&!o.p1.slice(0,4).some(x=>x.c==="done"),w+" open trades listed first, 4 shown, '+2 more trades'",J(o.p1));
  ok(o.p4&&o.p4.map(x=>x.t).join("|")==="Deck & seawall crew 0 of 2 filled|Seawall cap finishers 0 of 2 filled|Dock lighting electrician 0 of 1 filled",w+" seawall card lists all 3 trades",J(o.p4));
  ok(o.p3&&o.p3.some(x=>x.t==="Plumber 1 of 1 filled"&&x.c==="done"),w+" kitchen card shows a filled trade as done",J(o.p3));
  ok(!o.ow,w+" PM dash: no overflow");await p.context().close()}
 {const p=await dash(1440,pro.ck);ok(await p.$$eval(".v30tr",a=>a.length)===0,"pro dashboard has no PM per-trade lists");await p.context().close()}

 // ===== 4. Tax-year CSV invoice register =====
 {const p=await page(1440,pro.ck);await p.goto(LOCAL.B+"/office/reports",{waitUntil:"networkidle"});await p.waitForSelector("#taxYear");
  const o=await p.evaluate(()=>{const m=me(),y=document.getElementById("o9TaxCsv").dataset.y;const csv=v9TaxCsv(m,y);const inv=v30InvYear(m,y);const i=csv.indexOf("INVOICES ISSUED");const sec=i<0?[]:csv.slice(i).split("\n");
   return{y,card:document.getElementById("taxYear").innerText.replace(/\s+/g," "),n:inv.length,head:sec[0],rows:sec.slice(1,-1),total:sec[sec.length-1],sum:Math.round(inv.reduce((a,b)=>a+billCalc(b).total,0)*100)/100,owed:Math.round(inv.reduce((a,b)=>a+billCalc(b).bal,0)*100)/100,income:/^INCOME,/m.test(csv),drafts:inv.some(b=>b.status==="draft"||b.status==="void")}});
  ok(o.head==="INVOICES ISSUED,Issued,Invoice,Customer,Due,Total,Paid,Still owed,Status","tax CSV has an INVOICES ISSUED register",o.head);
  ok(o.n>0&&o.rows.length===o.n&&o.rows.every(r=>/^,\d{4}-\d{2}-\d{2},INV-\d+,/.test(r)),"one row per invoice issued that year ("+o.n+")",J(o.rows.slice(0,3)));
  ok(o.total===`TOTAL (${o.n} invoice${o.n===1?"":"s"}),,,,,${o.sum.toFixed(2)},${(o.sum-o.owed).toFixed(2)},${o.owed.toFixed(2)},`,"total row adds up (total, paid, still owed)",o.total+" vs "+o.sum+"/"+o.owed);
  ok(o.rows.some(r=>/,Overdue$/.test(r))&&o.income&&!o.drafts,"overdue invoices are marked, drafts/voids left out, the original income section is still there");
  ok(new RegExp("Also lists the "+o.n+" invoices? you issued in "+o.y).test(o.card),"Tax year card says how many invoices the file includes",o.card.slice(0,300));
  await p.context().close()}

 ok(errs.length===0,"no page errors",J(errs.slice(0,5)));
}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL)}
 console.log(failed?"FAIL v30-e2e: "+failed+" failed":"PASS v30-e2e: all checks passed");process.exit(failed?1:0)})();
