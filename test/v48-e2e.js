// v48 end-to-end. Self-contained: starts its own Sawyer servers (local test mode, no real email or SMS, payments in test
// mode). Covers health 2.31.0-sawyer / SW cache sawyer-v48 (or later), and: QA v47 ideas 1-3 (/traveling and /tcall/<id>
// single-hop 301s, a real noindex 404 for unknown or malformed traveler-call ids, noindex on every error page) and
// customer links for invoices / estimates (/i/<token>: guest view, claim after sign-up, the pro's share card, privacy).
// Usage: node test/v48-e2e.js [shots dir]
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
 const created=!dir;dir=dir||fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v48-"));
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
 const SH=process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),"v48-shots-"));fs.mkdirSync(SH,{recursive:true});
 const L=await startApp();SERVERS.push(L);
 const act=async(S,ck,name,args)=>{const r=await req(S.port,"POST","/api/act",Object.assign(ck?{Cookie:ck}:{},JH),J({name,args}));return {res:(r.json&&r.json.res)||{},st:stateOf(r),status:r.status,error:r.json&&r.json.error}};
 const stateFor=async(S,ck)=>stateOf(await req(S.port,"GET","/api/state",ck?{Cookie:ck}:{}));
 const signup=async(S,kind,tag,zip,extra)=>{const email="v48-"+tag+"-"+run+"@example.com";const data=Object.assign({name:(kind==="pro"?"Val ":"Hana ")+tag,email,zip},kind==="pro"?{biz:"V48 "+tag+" "+run,trade:"Plumbing",phone:"5125550100",plan:"founding"}:{},extra||{});
  const r=await req(S.port,"POST","/api/signup",JH,J({kind,password:"v48-correct-horse",data}));return{status:r.status,error:r.json&&r.json.error,ck:sigCk(r),id:stateOf(r).me,st:stateOf(r),email}};
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

 const pageCSP=async(S,w,ck)=>{const c=await br.newContext({viewport:{width:w,height:w<500?844:900},deviceScaleFactor:w<500?2:1,hasTouch:w<500});
  if(ck){const [k,v]=ck.split("=");await c.addCookies([{name:k,value:v,url:S.B}])}
  const p=await c.newPage();const errs=[];p.on("pageerror",e=>errs.push("pageerror: "+e.message));p.on("console",m=>{if(m.type()==="error"&&!/status of 4\d\d/.test(m.text()))errs.push("console: "+m.text())});
  await p.addInitScript(()=>{window.__csp=[];document.addEventListener("securitypolicyviolation",e=>window.__csp.push(e.violatedDirective+" "+(e.blockedURI||"")))});p.on("dialog",d=>d.accept().catch(()=>{}));return{c,p,errs}};
 const robotsOf=r=>({hdr:String(r.headers["x-robots-tag"]||""),meta:(r.body.match(/<meta name="robots" content="([^"]*)"/)||[])[1]||"",desc:(r.body.match(/<meta name="description" content="([^"]*)"/)||[])[1]||""});

 // --- release
 {const hz=(await req(L.port,"GET","/healthz")).json||{};ok(/^2\.(3[1-9]|[4-9]\d)\.\d+-sawyer$/.test(hz.v||""),"healthz reports a Sawyer version from 2.31.0 on",J(hz));
  const sw=await req(L.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v(4[89]|[5-9]\d)"/.test(sw.body),"service worker cache is sawyer-v48 or later")}

 // --- QA v47 idea 1: single-hop 301s, query kept, never an external Location
 {const tc=(((await stateFor(L)).tcalls)||[]).find(c=>c&&c.status==="open").id;
  const chk=async(u,want)=>{const r=await req(L.port,"GET",u);ok(r.status===301&&r.headers.location===want&&!/\/\/|^https?:/i.test(r.headers.location),u+" is one 301 to "+want,J([r.status,r.headers.location]));return r};
  await chk("/traveling","/travel?tab=how");await chk("/traveling/","/travel?tab=how");await chk("/traveling?utm_source=x","/travel?utm_source=x&tab=how");
  await chk("/tcall/"+tc,"/t/"+tc);await chk("/tcall/"+tc+"?ref=sms&x=1","/t/"+tc+"?ref=sms&x=1");await chk("/tcall/"+tc+"/","/t/"+tc);
  {const r=await req(L.port,"HEAD","/tcall/"+tc);ok(r.status===301&&r.headers.location==="/t/"+tc,"HEAD answers the same 301",r.status)}
  const t=await req(L.port,"GET","/t/"+tc);ok(t.status===200&&new RegExp("/t/"+tc+'"').test(t.body),"the target /t/<id> is a 200 with its own canonical (one hop total)",t.status);
  const tr=await req(L.port,"GET","/travel?tab=how");ok(tr.status===200&&/\/travel"/.test((tr.body.match(/<link rel="canonical" href="[^"]*"/)||[""])[0]),"/travel?tab=how is a 200 with canonical /travel",tr.status);
  // --- QA v47 idea 2: unknown or malformed ids are a real 404 with a noindex not-found page
  for(const u of ["/tcall/%2F%2Fevil.com","/tcall/https:%2F%2Fevil.com","/tcall/nope-"+run,"/tcall/"+tc+"/extra","/tcall/%E0%A4%A","/t/nope-"+run,"/t/%2F%2Fevil.com","/t/a.b"]){const r=await req(L.port,"GET",u);const ro=robotsOf(r);
   ok(r.status===404&&!r.headers.location&&/noindex/.test(ro.hdr)&&/noindex/.test(ro.meta)&&/Traveler call not found/.test(r.body)&&/traveler call isn't on Sawyer anymore/i.test(ro.desc)&&!/evil\.com/.test(r.body),u+": real 404, noindex (header + meta), its own description, nothing echoed",J([r.status,ro]))}
  {const r=await req(L.port,"GET","/no-such-page-"+run);const ro=robotsOf(r);ok(r.status===404&&/noindex/.test(ro.hdr)&&/noindex/.test(ro.meta),"any other 404 page is noindex too",J([r.status,ro]))}
  {const S=await startApp({SAWYER_INDEXABLE:"1"});SERVERS.push(S);const r=await req(S.port,"GET","/t/nope-"+run);const ro=robotsOf(r);ok(r.status===404&&/noindex/.test(ro.hdr)&&/noindex/.test(ro.meta),"with indexing ON, an unknown call is still a noindex 404",J([r.status,ro]));
   const ok2=await req(S.port,"GET","/travel");ok(!/noindex/.test(robotsOf(ok2).hdr),"…and real pages stay indexable",robotsOf(ok2).hdr);await stopApp(S)}
  // the guide renders at /travel?tab=how, and the app's links point there
  for(const w of [390,1300]){const {c,p,errs}=await pageCSP(L,w);await go(L,p,"/traveling",".t6land");const d=await p.evaluate(()=>({url:location.pathname+location.search,land:!!document.querySelector(".t6land h1"),tabs:!!document.querySelector(".t5tabs"),foot:(document.querySelector("#foot [data-v6]")||{}).getAttribute&&document.querySelector("#foot [data-v6]").getAttribute("href"),sw:document.documentElement.scrollWidth,csp:window.__csp}));
   ok(d.url==="/travel?tab=how"&&d.land&&!d.tabs&&d.sw<=w&&!d.csp.length&&!errs.length,w+": /traveling lands on the traveling guide at /travel?tab=how (no overflow, no CSP or script errors)",J([d,errs]));
   ok(d.foot==="/travel?tab=how","the footer's Traveling electricians link goes straight to /travel?tab=how",d.foot);
   if(w===390)await p.screenshot({path:path.join(SH,"v48-travel-guide-390.png")});
   await go(L,p,"/travel",".t5tabs");const l=await p.evaluate(()=>({tabs:!!document.querySelector(".t5tabs"),land:!!document.querySelector(".t6land"),how:(document.querySelector('.t6tab-l')||{}).getAttribute&&document.querySelector('.t6tab-l').getAttribute("href")}));ok(l.tabs&&!l.land&&l.how==="/travel?tab=how","/travel is still the call list; its 'New to traveling?' tab links the guide",J(l));
   await go(L,p,"/tcall/"+tc,".t5side");const u=await p.evaluate(()=>location.pathname);ok(u==="/t/"+tc,"opening an old /tcall/<id> link ends on /t/<id> with the call",u);await c.close()}}

 // --- QA v47 idea 3 is in v47-e2e (accepts 'Show 1 more call'); check the source so a revert is caught here too
 {const src=fs.readFileSync(path.join(ROOT,"test/v47-e2e.js"),"utf8");ok(/more call\$\{mine\.length-4===1\?"":"s"\}/.test(src),"v47-e2e accepts the singular 'Show 1 more call'")}

 // --- Customer links
 const P=await signup(L,"pro","pro","78704",{name:"Maria Lopez",biz:"Lopez Plumbing & Heating "+run});
 const cust=(await act(L,P.ck,"saveCust",[{name:"Dana Whitfield",email:"dana-"+run+"@example.com",phone:"(512) 555-0111",addr:"1402 Elm St, Austin, TX"}])).res.id;
 const mk=async(type,extra)=>(await act(L,P.ck,"saveBill",[Object.assign({type,cust,title:"Water heater replacement",site:"1402 Elm St, Austin, TX",lines:[{d:"50-gal gas water heater (installed)",q:1,r:1385},{d:"Labor: drain, remove and haul away old tank",q:3,r:95},{d:"Expansion tank + code-required parts",q:1,r:142.5}],tax:8.25,notes:"6-year tank warranty, 1-year labor."},extra||{})])).res.id;
 const bid=await mk("inv");
 const billOf=async(ck,id)=>((await stateFor(L,ck)).bills||[]).find(b=>b.id===id);
 {const r=await act(L,P.ck,"link48",[bid,false,"AAAAAAAAAAAAAAAAAAAAAAAA"]);ok(r.res.ok===false&&/Send it first/.test(r.res.msg),"a draft has no customer link yet",J(r.res))}
 const s=await act(L,P.ck,"sendBill",[bid,"AAAAAAAAAAAAAAAAAAAAAAAA"]);let B0=s.st.bills.find(b=>b.id===bid);
 ok(s.res.ok&&/customer link/.test(s.res.msg)&&/^[A-Za-z0-9_-]{24}$/.test(B0.tk48||"")&&B0.tk48!=="AAAAAAAAAAAAAAAAAAAAAAAA"&&B0.tk48b===bid,"sending to a customer with no account makes a 24-character link from the server (a token sent by the browser is ignored)",J([s.res,B0.tk48]));
 const tok=B0.tk48;
 {const r=await req(L.port,"GET","/i/"+tok);const js=(r.body.split("window.__INV48=")[1]||"").split("</script>")[0];let g=null;try{g=JSON.parse(js)}catch(e){}
  ok(r.status===200&&/noindex/.test(String(r.headers["x-robots-tag"]))&&r.headers["referrer-policy"]==="no-referrer"&&/no-store/.test(String(r.headers["cache-control"]))&&/<meta name="robots" content="noindex/.test(r.body),"the link page is noindex, no-store and no-referrer",J(r.headers));
  ok(g&&g.b&&g.b.no&&!("cust" in g.b)&&!("cuid" in g.b)&&!("tk48b" in g.b)&&!("reminders" in g.b)&&!("rec9" in g.b)&&g.tok===tok,"the guest copy has the bill but no customer ids, reminders or recurring setup",J(g&&Object.keys(g.b)));
  ok(/<title>Invoice INV-\d+ from Lopez Plumbing/.test(r.body)&&/View and pay invoice INV-\d+ from Lopez Plumbing/.test(r.body),"title and description name the invoice and the business (no amount in link previews)",(r.body.match(/<title>[^<]*/)||[])[0]);
  const lh=await req(L.port,"GET","/i/"+tok,{"User-Agent":"Mozilla/5.0 (compatible; facebookexternalhit/1.1)"});ok(lh.status===200,"a link-preview bot (or a request with no user agent) gets the page…");ok(!(await billOf(P.ck,bid)).viewed,"…but it doesn't count as the customer opening it")}
 for(const u of ["/i/"+tok.slice(0,23)+(tok[23]==="x"?"y":"x"),"/i/short","/i/%2F%2Fevil.com","/i/"+tok+"/x"]){const r=await req(L.port,"GET",u);ok(r.status===404&&/noindex/.test(robotsOf(r).meta)&&!/__INV48/.test(r.body),u.slice(0,40)+": not an active link -> 404, noindex",r.status)}
 // guest view in the browser, CSP on
 for(const w of [390,1300]){const {c,p,errs}=await pageCSP(L,w);await go(L,p,"/i/"+tok,"#i48Go");await p.waitForTimeout(500);
  const d=await p.evaluate(()=>({title:document.title,paper:!!document.querySelector("#paper"),btn:document.getElementById("i48Go").textContent,top:!!(document.querySelector(".i48-top")&&document.querySelector(".i48-top").offsetParent),pro:!!document.querySelector(".i48 .o7-pro"),own:!!document.querySelector(".i48-own"),sw:document.documentElement.scrollWidth,csp:window.__csp,trust:(document.querySelector(".i48-trust")||{}).textContent||""}));
  ok(d.paper&&/^Pay \$1,962\.03$/.test(d.btn.trim())&&d.pro&&!d.own&&d.sw<=w&&!d.csp.length&&!errs.length&&/search engines never list it/.test(d.trust),w+": a signed-out customer sees the invoice, the balance and Pay (no overflow, no CSP or script errors)",J([d,errs]));
  ok(/^Invoice INV-\d+ from Lopez Plumbing & Heating .* · Sawyer$/.test(d.title),w+": the tab keeps the invoice's title after the app mounts",d.title);
  ok(w<500?d.top:!d.top,w+": phones get the 'due + Pay' strip above the paper; desktop doesn't need it",d.top);
  await p.screenshot({path:path.join(SH,"v48-customer-link-"+w+".png"),fullPage:false});await c.close()}
 {const b=await billOf(P.ck,bid);const n=((await stateFor(L,P.ck)).notifs||[]).filter(x=>/Dana Whitfield opened invoice/.test(x.text));ok(b.viewed>0&&n.length===1&&n[0].link==="bill:"+bid,"the first open marks the invoice viewed and tells the pro once",J([b.viewed,n.length]))}
 // the pro's card
 for(const w of [390,1300]){const {c,p,errs}=await pageCSP(L,w,P.ck);await go(L,p,"/invoice/"+bid,"#i48Url");
  const d=await p.evaluate(()=>({url:document.getElementById("i48Url").value,sms:document.getElementById("i48Sms").getAttribute("href"),mail:document.getElementById("i48Mail").getAttribute("href"),prev:document.querySelector('.i48-card a[target="_blank"]').getAttribute("href"),rel:document.querySelector('.i48-card a[target="_blank"]').getAttribute("rel"),seen:document.querySelector(".i48-seen").textContent,sw:document.documentElement.scrollWidth,csp:window.__csp}));
  ok(d.url===L.B+"/i/"+tok&&d.prev==="/i/"+tok&&/noreferrer/.test(d.rel),w+": the pro's invoice page shows the customer link and a Preview",J(d));
  ok(/^sms:\+?5125550111\?&body=Hi%20Dana/.test(d.sms)&&decodeURIComponent(d.sms).includes(L.B+"/i/"+tok)&&/due /.test(decodeURIComponent(d.sms)),w+": Text it opens the phone's messages with the customer's number and a short note with the link",d.sms.slice(0,120));
  ok(/^mailto:dana-[a-z0-9]+@example\.com\?subject=Invoice%20INV-\d+%20from%20Lopez/.test(d.mail)&&decodeURIComponent(d.mail).includes("/i/"+tok),w+": Email it opens the mail app with the customer's email, a subject and the link",d.mail.slice(0,120));
  ok(/Opened by Dana/.test(d.seen)&&d.sw<=w&&!d.csp.length&&!errs.length,w+": it says when Dana opened it (no overflow or errors)",J([d.seen,errs]));
  if(w===390){const el=await p.$(".i48-card");await el.screenshot({path:path.join(SH,"v48-pro-link-card-390.png")})}
  if(w===1300){await p.click("#i48Copy");await p.waitForTimeout(300);const t=await p.evaluate(()=>(document.getElementById("toasts")||{}).textContent||"");ok(/Link copied|copy the link/i.test(t),"Copy gives feedback",t)}
  await c.close()}
 // pro preview of their own link
 {const {c,p}=await pageCSP(L,1300,P.ck);await go(L,p,"/i/"+tok,"#i48Go");const d=await p.evaluate(()=>({own:(document.querySelector(".i48-own")||{}).textContent||""}));ok(/This is what Dana Whitfield sees/.test(d.own),"the pro previewing their own link sees a 'this is what your customer sees' note",d.own);
  await p.click("#i48Go");await p.waitForTimeout(300);ok(/^\/i\//.test(await p.evaluate(()=>location.pathname)),"…and the Pay button doesn't take the pro anywhere");
  const own=await act(L,P.ck,"claim48",[tok]);ok(own.res.ok===false&&/your own invoice/.test(own.res.msg),"the pro can't claim their own invoice",own.res.msg);await c.close()}
 // demo accounts can't claim
 {const ck=await login(L,"demo-homeowner@sawyer.test");const r=await act(L,ck,"claim48",[tok]);ok(r.res.ok===false&&/Demo accounts are shared/.test(r.res.msg),"a shared demo account can't hold a real invoice",r.res.msg)}
 {const r=await act(L,null,"claim48",[tok]);ok(r.status===401,"claiming needs a session",r.status)}
 // signed out -> Pay -> sign up -> back -> claimed -> /pay
 const C={};
 {const {c,p,errs}=await pageCSP(L,390);await go(L,p,"/i/"+tok,"#i48Go");await p.click("#i48Go");await p.waitForTimeout(700);const at=await p.evaluate(()=>location.pathname+location.search);
  ok(/^\/signup\?next=%2Fi%2F/.test(at),"Pay while signed out opens sign-up and remembers the invoice",at);
  C.email="v48-dana-"+run+"@example.com";const r=await p.evaluate(async e=>{const o=await fetch("/api/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"customer",password:"v48-correct-horse",data:{name:"Dana Whitfield",email:e,zip:"78704"}})});const j=await o.json();__applyState(j.state);go("account",null,{welcome:"1"});return o.status},C.email);
  await p.waitForFunction(()=>/^\/pay\//.test(location.pathname),null,{timeout:20000}).catch(()=>{});const d=await p.evaluate(()=>({url:location.pathname,h:(document.querySelector("h1")||{}).textContent||"",errs:0}));
  ok(r===200&&d.url==="/pay/"+bid&&/Lopez Plumbing/.test(d.h),"after creating an account (any sign-in path), the invoice is added and the customer lands on Pay",J(d));
  await p.screenshot({path:path.join(SH,"v48-claimed-pay-390.png")});
  ck: {const cks=await c.cookies();const s=cks.find(x=>x.name==="swsid");C.ck=s?"swsid="+s.value:null}
  ok(!errs.length,"no script errors through the sign-up hand-off",J(errs));await c.close()}
 {const st=await stateFor(L,C.ck);const b=(st.bills||[]).find(x=>x.id===bid);ok(b&&b.cuid===st.me,"the invoice is in the customer's account",J(b&&b.cuid));
  const n=((await stateFor(L,P.ck)).notifs||[]).filter(x=>/added invoice INV-\d+ to their Sawyer account/.test(x.text));ok(n.length===1,"the pro is told the customer added it",n.length);
  const cr=((await stateFor(L,P.ck)).bcust||[]).find(x=>x.id===cust);ok(cr&&cr.uid===st.me,"the customer record is linked, so the next invoice goes to their account",J(cr&&cr.uid));
  const again=await act(L,C.ck,"claim48",[tok]);ok(again.res.ok&&/already in your account/.test(again.res.msg),"claiming twice is a friendly no-op",again.res.msg);
  const O=await signup(L,"customer","other","78704");const r=await act(L,O.ck,"claim48",[tok]);ok(r.res.ok===false&&/already in another Sawyer account/.test(r.res.msg),"someone else with the link can't take it over",r.res.msg);
  const os=await stateFor(L,O.ck);ok(!(os.bills||[]).some(x=>x.id===bid)&&!JSON.stringify(os).includes(tok),"…and never sees it or the token");
  const pub=JSON.stringify(await stateFor(L));ok(!pub.includes(tok)&&!(JSON.parse(pub).bills||[]).length,"the public snapshot has no bills and no tokens")}
 // the pro edits the claimed invoice: it stays with the customer
 {const b=await billOf(P.ck,bid);const r=await act(L,P.ck,"saveBill",[Object.assign({},b,{id:bid,title:"Water heater swap"})]);const st=await stateFor(L,C.ck);ok(r.res.ok&&(st.bills||[]).some(x=>x.id===bid&&x.title==="Water heater swap"),"editing a claimed invoice keeps it in the customer's account",J(r.res))}
 // the next invoice for that customer goes in-app (no link needed)
 {const b2=await mk("inv",{title:"Annual flush"});const s2=await act(L,P.ck,"sendBill",[b2]);const b=s2.st.bills.find(x=>x.id===b2);ok(b.cuid&&!b.tk48&&/in the app/.test(s2.res.msg),"the next invoice for Dana goes straight to her account",J([s2.res.msg,b.cuid]))}
 // reset turns the old link off; Duplicate never inherits a link; void links are off
 {const c2=(await act(L,P.ck,"saveCust",[{name:"Rae Nolan",email:"rae-"+run+"@example.com"}])).res.id;const b3=(await act(L,P.ck,"saveBill",[{type:"inv",cust:c2,title:"Leak repair",lines:[{d:"Repair",q:1,r:240}]}])).res.id;const t1=(await act(L,P.ck,"sendBill",[b3])).st.bills.find(x=>x.id===b3).tk48;
  const r=await act(L,P.ck,"link48",[b3,true]);const t2=r.st.bills.find(x=>x.id===b3).tk48;ok(r.res.ok&&t2&&t2!==t1&&/old link doesn't open/.test(r.res.msg),"Turn off and make a new link replaces the token",J(r.res));
  ok((await req(L.port,"GET","/i/"+t1)).status===404&&(await req(L.port,"GET","/i/"+t2)).status===200,"the old link is a 404, the new one opens");
  const d=await act(L,P.ck,"dupBill42",[b3]);const db=d.st.bills.find(x=>x.id===d.res.id);ok(d.res.ok&&db&&!(db.tk48&&db.tk48b===db.id),"a duplicate doesn't inherit the link",J(db&&[db.tk48,db.tk48b]));
  const cp=JSON.parse(JSON.stringify(d.st.bills.find(x=>x.id===b3)));ok(cp.tk48b===b3,"the link is pinned to its own bill id (copies made any other way are ignored)");
  const v=await act(L,P.ck,"voidBill",[b3]);ok(v.res.ok&&(await req(L.port,"GET","/i/"+t2)).status===200,"a voided invoice's link still opens, marked void…");
  const {c,p}=await pageCSP(L,390);await go(L,p,"/i/"+t2,".o7-paybox");const box=await p.evaluate(()=>document.querySelector(".o7-paybox").textContent);ok(/voided/.test(box)&&!(await p.$("#i48Go")),"…with no Pay button",box);await c.close();
  const vc=await act(L,C.ck,"claim48",[t2]);ok(vc.res.ok===false&&/voided/.test(vc.res.msg),"and can't be claimed",vc.res.msg);
  const l=await act(L,P.ck,"link48",[b3,true]);ok(l.res.ok===false&&/void/.test(l.res.msg),"no new link for a void invoice",l.res.msg)}
 // estimates: Review and approve -> claim -> the estimate page with Approve
 {const c3=(await act(L,P.ck,"saveCust",[{name:"Sam Ortiz",email:"sam-"+run+"@example.com"}])).res.id;const e=(await act(L,P.ck,"saveBill",[{type:"est",cust:c3,title:"Repipe estimate",lines:[{d:"PEX repipe, 2 baths",q:1,r:5400},{d:"Optional: recirculation pump",q:1,r:650,opt:true}]}])).res.id;
  const et=(await act(L,P.ck,"sendBill",[e])).st.bills.find(x=>x.id===e).tk48;ok(/^[A-Za-z0-9_-]{24}$/.test(et||""),"estimates get a customer link too");
  const S2=await signup(L,"customer","sam","78704");const {c,p,errs}=await pageCSP(L,1300,S2.ck);await go(L,p,"/i/"+et,"#i48Go");const btn=await p.evaluate(()=>document.getElementById("i48Go").textContent.trim());ok(btn==="Review and approve","a signed-in customer sees Review and approve",btn);
  await p.click("#i48Go");await p.waitForFunction(()=>/^\/invoice\//.test(location.pathname),null,{timeout:15000}).catch(()=>{});const d=await p.evaluate(()=>({u:location.pathname,ap:!!(document.getElementById("s10go")||document.getElementById("bApprove"))}));ok(d.u==="/invoice/"+e&&d.ap,"…which adds the estimate to their account and opens it with Sign and approve",J(d));ok(!errs.length,"no script errors",J(errs));await c.close()}
 // throttle
 {const S=await startApp({RATE_X:"1"});SERVERS.push(S);let last=0;for(let i=0;i<125;i++){last=(await req(S.port,"GET","/i/AAAAAAAAAAAAAAAAAAAAAAA"+(i%10))).status}ok(last===429,"guessing links is throttled per IP (429 after 120 a minute)",last);await stopApp(S)}

 if(failed)throw new Error(failed+" check(s) failed");
 console.log("OK v48-e2e");
}catch(e){if(!/check\(s\) failed$/.test(String(e&&e.message)))console.log("FAIL crashed: "+String(e&&e.message||e).split("\n")[0].slice(0,300));console.error(e&&e.stack||e);failed++;}
finally{if(br)await br.close().catch(()=>{});await Promise.all(SERVERS.map(s=>stopApp(s)));process.exit(failed?1:0)}})();
