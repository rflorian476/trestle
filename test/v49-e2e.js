// v49 end-to-end. Self-contained: starts its own Sawyer servers (local test mode, no real email or SMS, payments in test
// mode). Covers health 2.32.0-sawyer / SW cache sawyer-v49 (or later), and: QA v48 idea 1 (the guest /i/<token> page is
// prerendered: the paper is in the first HTML, still noindex/no-store/no-referrer/CSP, no private fields, no shift when the
// app takes over), idea 2 (extra path segments on /traveling and the other one-page views are a noindex 404, no redirect),
// idea 3 (the pro's card says a voided bill's link still shows it; Turn off this link / off49), and reminders that reach
// customers without an account (Text / Email reminder with the link, honest remindBill and auto-reminder sweep).
// Usage: node test/v49-e2e.js [shots dir]
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
 const created=!dir;dir=dir||fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v49-"));
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
 const SH=process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),"v49-shots-"));fs.mkdirSync(SH,{recursive:true});
 const L=await startApp();SERVERS.push(L);
 const act=async(S,ck,name,args)=>{const r=await req(S.port,"POST","/api/act",Object.assign(ck?{Cookie:ck}:{},JH),J({name,args}));return {res:(r.json&&r.json.res)||{},st:stateOf(r),status:r.status,error:r.json&&r.json.error}};
 const stateFor=async(S,ck)=>stateOf(await req(S.port,"GET","/api/state",ck?{Cookie:ck}:{}));
 const signup=async(S,kind,tag,zip,extra)=>{const email="v49-"+tag+"-"+run+"@example.com";const data=Object.assign({name:(kind==="pro"?"Val ":"Hana ")+tag,email,zip},kind==="pro"?{biz:"V48 "+tag+" "+run,trade:"Plumbing",phone:"5125550100",plan:"founding"}:{},extra||{});
  const r=await req(S.port,"POST","/api/signup",JH,J({kind,password:"v49-correct-horse",data}));return{status:r.status,error:r.json&&r.json.error,ck:sigCk(r),id:stateOf(r).me,st:stateOf(r),email}};
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
 {const hz=(await req(L.port,"GET","/healthz")).json||{};ok(/^2\.(3[2-9]|[4-9]\d)\.\d+-sawyer$/.test(hz.v||""),"healthz reports a Sawyer version from 2.32.0 on",J(hz));
  const sw=await req(L.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v(49|[5-9]\d)"/.test(sw.body),"service worker cache is sawyer-v49 or later")}

 // --- shared fixtures: a pro, a customer without an account, invoices
 const P=await signup(L,"pro","pro","78704",{name:"Maria Lopez",biz:"Lopez Plumbing & Heating "+run});
 const custOf=async(name,tag)=>(await act(L,P.ck,"saveCust",[{name,email:tag+"-"+run+"@example.com",phone:"(512) 555-0111",addr:"1402 Elm St, Austin, TX"}])).res.id;
 const cust=await custOf("Dana Whitfield","dana");
 const LINES=[{d:"50-gal gas water heater (installed)",q:1,r:1385},{d:"Labor: drain, remove and haul away old tank",q:3,r:95},{d:"Expansion tank + code-required parts",q:1,r:142.5}];
 const mk=async(type,extra,c)=>(await act(L,P.ck,"saveBill",[Object.assign({type,cust:c||cust,title:"Water heater replacement",site:"1402 Elm St, Austin, TX",lines:LINES,tax:8.25,notes:"6-year tank warranty, 1-year labor."},extra||{})])).res.id;
 const send=async id=>(await act(L,P.ck,"sendBill",[id])).st.bills.find(b=>b.id===id);
 const billOf=async(ck,id)=>((await stateFor(L,ck)).bills||[]).find(b=>b.id===id);
 const preOf=b=>{const i=b.indexOf('<div id="pre11">');if(i<0)return"";const j=b.indexOf("</main>",i);return b.slice(i,j<0?undefined:j)};
 const bid=await mk("inv");const B0=await send(bid);const tok=B0.tk48;
 ok(/^[A-Za-z0-9_-]{24}$/.test(tok||""),"a sent invoice for a customer without an account has a customer link",tok);

 // --- 1) QA v48 idea 1: the guest /i/<token> page is prerendered (first HTML has the paper), private fields stay out
 {const r=await req(L.port,"GET","/i/"+tok,{"User-Agent":"Mozilla/5.0 (Linux; Android 11) Chrome/120 Mobile"});const pre=preOf(r.body);
  ok(r.status===200&&/id="paper"/.test(pre)&&/\$1,962\.03/.test(pre)&&/INV-\d+/.test(pre)&&/Lopez Plumbing/.test(pre)&&/id="i48Go"/.test(pre),"signed out, the first HTML already has the invoice paper, the balance and Pay",pre.slice(0,200));
  ok(/<header class="top[^"]*" id="top"><div class="topin">/.test(r.body)&&!/<header class="top" id="top"><\/header>/.test(r.body),"…and the site header (no empty header that fills in later)");
  ok(!/<link rel="preload" href="\/js\//.test(r.body),"app JS isn't preloaded ahead of the paper (it loads after the first paint, like the other prerendered pages)");
  ok(/noindex/.test(String(r.headers["x-robots-tag"]))&&r.headers["referrer-policy"]==="no-referrer"&&/no-store/.test(String(r.headers["cache-control"]))&&/<meta name="robots" content="noindex/.test(r.body),"still noindex (header and meta), no-store and no-referrer",J([r.headers["x-robots-tag"],r.headers["referrer-policy"],r.headers["cache-control"]]));
  const csp=String(r.headers["content-security-policy"]||"");const sc=(csp.match(/script-src([^;]*)/)||[])[1]||"";ok(/sha256-/.test(sc)&&!/unsafe-inline|unsafe-eval/.test(sc),"still a hash-based CSP (no unsafe-inline scripts)",sc.slice(0,120));
  ok(!/<script/i.test(pre)&&!/\son[a-z]+=/i.test(pre),"the prerendered bill has no scripts or inline handlers");
  const em="dana-"+run+"@example.com";ok(!pre.includes(cust)&&!pre.includes(em)&&!/reminder/i.test(pre),"the prerendered bill has no customer id, customer email or reminders",J([pre.includes(cust),pre.includes(em)]));
  const js=(r.body.split("window.__INV48=")[1]||"").split("</script>")[0];let g=null;try{g=JSON.parse(js)}catch(e){}
  ok(g&&g.b&&!("cust" in g.b)&&!("cuid" in g.b)&&!("tk48b" in g.b)&&!("reminders" in g.b)&&!("rec9" in g.b),"the inlined guest copy still leaves out customer ids, reminders and recurring setup",J(g&&Object.keys(g.b)));
}
 {const r=await req(L.port,"GET","/i/"+tok,{Cookie:P.ck});ok(r.status===200&&!/<div id="pre11">/.test(r.body),"signed in, the page is the normal app page (the pro's own preview isn't prerendered from the guest view)")}
 for(const u of ["/i/short","/i/%2F%2Fevil.com","/i/"+tok+"/x"]){const r=await req(L.port,"GET",u);ok(r.status===404&&!/id="paper"/.test(r.body)&&!/__INV48/.test(r.body),u.slice(0,30)+" is still a 404 with no bill",r.status)}
 // private line costs never reach the prerender
 {const b2=await mk("inv",{title:"Fixture swap",lines:[{d:"Faucet + install",q:1,r:410,cost:180}]});const t2=(await send(b2)).tk48;const r=await req(L.port,"GET","/i/"+t2,{"User-Agent":"Mozilla/5.0 Chrome/120"});const pre=preOf(r.body);
  ok(/Faucet \+ install/.test(pre)&&!/180/.test(pre.replace(/\d{3,}px|\d+\.\d+|#[0-9a-f]{3,6}/gi,"")),"a line's private cost isn't in the prerendered bill",pre.length)}
 // first paint without any JavaScript, then the app takes over without moving the paper
 for(const w of [390,1300]){
  {const c=await br.newContext({viewport:{width:w,height:w<500?844:900},deviceScaleFactor:w<500?2:1,javaScriptEnabled:false});const p=await c.newPage();await p.goto(L.B+"/i/"+tok,{waitUntil:"load"});
   const d=await p.evaluate(()=>({paper:!!document.querySelector("#paper"),btn:(document.getElementById("i48Go")||{}).textContent||"",sw:document.documentElement.scrollWidth,top:!!document.querySelector("#top a")}));
   ok(d.paper&&/Pay \$1,962\.03/.test(d.btn)&&d.sw<=w&&d.top,w+": with JavaScript off, the paper, the balance and the header are already painted",J(d));
   if(w===390)await p.screenshot({path:path.join(SH,"v49-guest-first-paint-390.png")});await c.close()}
  {const {c,p,errs}=await pageCSP(L,w);await p.addInitScript(()=>{window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:"layout-shift",buffered:true})}catch(e){}});
   const resp=await p.goto(L.B+"/i/"+tok,{waitUntil:"networkidle"});await p.waitForFunction(()=>typeof __PART!=="undefined"&&!__PART&&typeof me==="function",null,{timeout:60000,polling:100});await p.waitForTimeout(400);
   const d=await p.evaluate(()=>({paper:document.querySelectorAll("#paper").length,btn:(document.getElementById("i48Go")||{}).textContent||"",pre:!!document.getElementById("pre11"),title:document.title,cls:window.__cls,csp:window.__csp,sw:document.documentElement.scrollWidth}));
   ok(resp.status()===200&&d.paper===1&&/^Pay \$1,962\.03$/.test(d.btn.trim())&&d.sw<=w&&!d.csp.length&&!errs.length,w+": after the app mounts there is one paper and a working Pay (CSP on, no errors, no overflow)",J([d,errs]));
   ok(d.cls<0.05,w+": the takeover doesn't shift the page (CLS "+d.cls.toFixed(3)+")",d.cls);
   ok(/^Invoice INV-\d+ from Lopez Plumbing/.test(d.title),w+": the tab title is the invoice",d.title);
   await p.click("#i48Go");await p.waitForTimeout(600);const at=await p.evaluate(()=>location.pathname+location.search);ok(/^\/signup\?next=%2Fi%2F/.test(at),w+": Pay on the prerendered page still opens sign-up and remembers the invoice",at);
   if(w===1300){await p.goBack({waitUntil:"networkidle"}).catch(()=>{});}
   await c.close()}
  {const {c,p}=await pageCSP(L,w);await go(L,p,"/i/"+tok,"#i48Go");await p.waitForTimeout(300);await p.screenshot({path:path.join(SH,"v49-guest-link-"+w+".png")});await c.close()}}
 // estimates and void bills prerender the same states the app shows
 {const cE=await custOf("Sam Ortiz","sam");const e=(await act(L,P.ck,"saveBill",[{type:"est",cust:cE,title:"Repipe estimate",lines:[{d:"PEX repipe, 2 baths",q:1,r:5400},{d:"Optional: recirculation pump",q:1,r:650,opt:true}]}])).res.id;const et=(await send(e)).tk48;
  const pre=preOf((await req(L.port,"GET","/i/"+et,{"User-Agent":"Mozilla/5.0 Chrome/120"})).body);ok(/id="paper"/.test(pre)&&/Review and approve/.test(pre),"an estimate's link is prerendered with Review and approve",pre.length)}

 // --- 2) QA v48 idea 2: extra path segments are a real noindex 404, never a redirect
 const extra=async(S,tag)=>{for(const u of ["/traveling/x","/traveling/%2F%2Fevil.com","/traveling//evil.com","/traveling/https:%2F%2Fevil.com","/traveling/x/y","/travel/x","/travel/%2F%2Fevil.com","/faq/x","/pricing/x","/about/x","/pros/x","/prices/x"]){
   const r=await req(S.port,"GET",u);const ro=robotsOf(r);ok(r.status===404&&!r.headers.location&&/noindex/.test(ro.hdr)&&/noindex/.test(ro.meta)&&!/evil\.com/.test(r.body),tag+": "+u+" is a noindex 404 with no Location",J([r.status,r.headers.location,ro.hdr]))}
  for(const [u,want] of [["/traveling","/travel?tab=how"],["/traveling/","/travel?tab=how"],["/traveling?utm_source=x","/travel?utm_source=x&tab=how"]]){const r=await req(S.port,"GET",u);ok(r.status===301&&r.headers.location===want,tag+": "+u+" is still one 301 to "+want,J([r.status,r.headers.location]))}
  for(const u of ["/travel","/travel/","/travel?tab=how","/faq","/pricing","/pricing?s=compare","/about","/pros","/pros/","/prices","/prices?cat=Plumbing"]){const r=await req(S.port,"GET",u);ok(r.status===200,tag+": "+u+" still opens (200)",r.status)}};
 await extra(L,"beta");
 {const S=await startApp({SAWYER_INDEXABLE:"1"});SERVERS.push(S);await extra(S,"indexing on");const r=await req(S.port,"GET","/traveling/x");ok(/Page not found/.test(r.body)&&/travel\?tab=how/.test(r.body),"the 404 points to the traveling guide");await stopApp(S)}
 {const {c,p}=await pageCSP(L,390);await p.goto(L.B+"/traveling/%2F%2Fevil.com");await p.screenshot({path:path.join(SH,"v49-traveling-404-390.png")});await c.close()}

 // --- 3) QA v48 idea 3: the pro's card says a voided bill's link still shows it, and Turn off this link hides it
 for(const w of [390,1300]){const {c,p,errs}=await pageCSP(L,w,P.ck);await go(L,p,"/invoice/"+bid,"#i48Url");
  const t=await p.evaluate(()=>(document.querySelector(".i49-vnote")||{}).textContent||"");ok(/If you void this invoice, anyone who has the link can still open it, marked void with no Pay button\. Turn off this link to hide it\./.test(t)&&!errs.length,w+": the customer link card explains what a voided bill's link shows and how to hide it",t);await c.close()}
 {const cV=await custOf("Rae Nolan","rae");const v=(await act(L,P.ck,"saveBill",[{type:"inv",cust:cV,title:"Leak repair",lines:[{d:"Repair",q:1,r:240}]}])).res.id;const vt=(await send(v)).tk48;
  const vr=await act(L,P.ck,"voidBill",[v]);ok(vr.res.ok&&(await req(L.port,"GET","/i/"+vt)).status===200,"a voided invoice's link still opens (marked void)");
  const pre=preOf((await req(L.port,"GET","/i/"+vt,{"User-Agent":"Mozilla/5.0 Chrome/120"})).body);ok(/This invoice was voided/.test(pre)&&!/id="i48Go"/.test(pre),"…and its prerender says voided, with no Pay",pre.length);
  {const O=await signup(L,"pro","other","78704");const r=await act(L,O.ck,"off49",[v]);ok(r.res.ok===false&&/Not found/.test(r.res.msg),"another pro can't turn the link off",r.res.msg);
   const C=await signup(L,"customer","cust","78704");const r2=await act(L,C.ck,"off49",[v]);ok(r2.res.ok===false,"a customer can't either",r2.res.msg);
   const r3=await act(L,null,"off49",[v]);ok(r3.status===401,"signed out is 401",r3.status);ok((await req(L.port,"GET","/i/"+vt)).status===200,"the link is still on after those tries")}
  for(const w of [1300,390]){const {c,p,errs}=await pageCSP(L,w,P.ck);await go(L,p,"/invoice/"+v,".i48-card");
   const d=await p.evaluate(()=>({t:(document.querySelector(".i48-card")||{}).textContent||"",off:!!document.getElementById("i49Off"),prev:(document.querySelector('.i48-card a[target="_blank"]')||{getAttribute:()=>""}).getAttribute("href"),sw:document.documentElement.scrollWidth,csp:window.__csp}));
   ok(/Customer link still on/.test(d.t)&&/This invoice is void, but anyone who has the link can still open it, marked void with no Pay button\. Turn off this link to hide it\./.test(d.t)&&d.off&&d.prev==="/i/"+vt&&d.sw<=w&&!d.csp.length&&!errs.length,w+": a void invoice's card says its link still opens and offers Turn off this link and Preview",J(d));
   if(w===390){await (await p.$(".i48-card")).screenshot({path:path.join(SH,"v49-void-link-card-390.png")});
    await p.click("#i49Off");await p.waitForFunction(()=>/Customer link off/.test((document.querySelector(".i48-card")||{}).textContent||""),null,{timeout:10000}).catch(()=>{});
    const t2=await p.evaluate(()=>(document.querySelector(".i48-card")||{}).textContent||"");ok(/Customer link off/.test(t2)&&/Nobody can open this void invoice from a link/.test(t2)&&!(await p.$("#i49Off")),"Turn off this link (after a confirm) turns it off, and the card says so",t2)}
   await c.close()}
  const g=await req(L.port,"GET","/i/"+vt);ok(g.status===404&&!/__INV48/.test(g.body),"the void invoice's old link is now a 404 with no data",g.status);
  const b=await billOf(P.ck,v);ok(b&&!b.tk48&&!b.tk48b,"the token is gone from the bill",J(b&&[b.tk48,b.tk48b]));
  const again=await act(L,P.ck,"off49",[v]);ok(again.res.ok&&/already off/.test(again.res.msg),"turning it off twice is a friendly no-op",again.res.msg);
  const l=await act(L,P.ck,"link48",[v,true]);ok(l.res.ok===false&&/void/.test(l.res.msg),"a void invoice still can't get a new link",l.res.msg)}
 // off49 on a live (not void) bill: the link stops opening and Get customer link makes a fresh one
 {const cL=await custOf("Lee Park","lee");const x=(await act(L,P.ck,"saveBill",[{type:"inv",cust:cL,title:"Disposal",lines:[{d:"Disposal",q:1,r:310}]}])).res.id;const xt=(await send(x)).tk48;
  const r=await act(L,P.ck,"off49",[x]);ok(r.res.ok&&(await req(L.port,"GET","/i/"+xt)).status===404,"off49 on a live invoice turns its link off",r.res.msg);
  const n=await act(L,P.ck,"link48",[x,false]);const nt=n.st.bills.find(y=>y.id===x).tk48;ok(n.res.ok&&nt&&nt!==xt&&(await req(L.port,"GET","/i/"+nt)).status===200,"…and Get customer link makes a new one",J(n.res))}

 // --- 4) reminders that reach customers without an account
 const cR=await custOf("Jordan Hale","jordan");
 const od=await mk("inv",{title:"Sump pump",lines:[{d:"Sump pump replacement",q:1,r:640}],tax:0,due:ymd(-9)},cR);const odB=await send(od);const odt=odB.tk48;
 {const r=await act(L,P.ck,"remindBill",[od]);ok(r.res.ok===false&&/has no Sawyer account, so Sawyer can't deliver a reminder/.test(r.res.msg)&&!((await billOf(P.ck,od)).reminders||[]).length,"Send reminder no longer claims 'Reminder sent' for a customer without an account (nothing is logged)",r.res.msg)}
 {const r=await act(L,P.ck,"remindBill",[od,"carrier-pigeon"]);ok(r.res.ok===false&&!((await billOf(P.ck,od)).reminders||[]).length,"an unknown channel is refused",r.res.msg)}
 for(const w of [390,1300]){const {c,p,errs}=await pageCSP(L,w,P.ck);await go(L,p,"/invoice/"+od,"#i49Rem");
  const d=await p.evaluate(()=>({t:(document.getElementById("i49Rem")||{}).textContent||"",sms:(document.getElementById("i49Sms")||{getAttribute:()=>""}).getAttribute("href"),mail:(document.getElementById("i49Mail")||{getAttribute:()=>""}).getAttribute("href"),sw:document.documentElement.scrollWidth,csp:window.__csp}));
  const sb=decodeURIComponent(d.sms),mb=decodeURIComponent(d.mail);
  ok(/Overdue: send a reminder/.test(d.t)&&/Jordan has no Sawyer account, so Sawyer can't deliver a reminder/.test(d.t),w+": an overdue invoice's card has a reminder and says why it goes from the pro's phone",d.t);
  ok(/^sms:\+?5125550111\?&body=/.test(d.sms)&&/^Hi Jordan, a friendly reminder from Lopez Plumbing & Heating .*: invoice INV-\d+ has \$640\.00 due \(it was due [A-Z][a-z]{2} \d{1,2}/.test(sb.split("body=")[1]||"")&&sb.includes(L.B+"/i/"+odt),w+": Text reminder has the number, the balance, the due date and the link",sb.slice(0,200));
  ok(/^mailto:jordan-[a-z0-9]+@example\.com\?subject=Reminder%3A%20invoice%20INV-\d+%20from%20Lopez/.test(d.mail)&&mb.includes("/i/"+odt),w+": Email reminder has the address, a subject and the link",d.mail.slice(0,120));
  ok(d.sw<=w&&!d.csp.length&&!errs.length,w+": no overflow, CSP or script errors",J([d.sw,errs]));
  await p.evaluate(()=>document.getElementById("i49Rem").scrollIntoView({block:"center",behavior:"instant"}));await p.waitForTimeout(600);await (await p.$(".i48-card")).screenshot({path:path.join(SH,"v49-reminder-card-"+w+".png")});
  if(w===390){await p.evaluate(()=>scrollTo(0,0));await p.click("#bRemind");await p.waitForTimeout(400);const f=await p.evaluate(()=>document.activeElement&&document.activeElement.id);ok(f==="i49Sms","Send reminder (top of the page) takes the pro to Text reminder instead of claiming it was sent",f)}
  if(w===1300){
   await p.evaluate(()=>{const a=document.getElementById("i49Sms");a.setAttribute("href","#");a.click()});await p.waitForTimeout(900);
   const st=await p.evaluate(()=>({toast:(document.getElementById("toasts")||{}).textContent||"",rem:(document.getElementById("i49Rem")||{}).textContent||"",tl:(document.querySelector(".o7-tl")||{}).textContent||""}));
   ok(/Reminder logged\. Send it from your messages app\./.test(st.toast)&&/Last reminder/.test(st.rem)&&/Reminder sent/.test(st.tl),"tapping Text reminder logs it on the timeline and the card shows the last reminder",J(st))}
  await c.close()}
 {const b=await billOf(P.ck,od);ok((b.reminders||[]).length===1,"one reminder logged",J(b.reminders));
  const r=await act(L,P.ck,"remindBill",[od,"email"]);const b2=await billOf(P.ck,od);ok(r.res.ok&&/already logged today/.test(r.res.msg)&&(b2.reminders||[]).length===1,"a second channel the same day opens the app without logging twice",r.res.msg);
  const g=await req(L.port,"GET","/i/"+odt);const js=(g.body.split("window.__INV48=")[1]||"").split("</script>")[0];ok(!/reminders/.test(js)&&!/Last reminder/.test(preOf(g.body)),"the customer's copy still has no reminders")}
 // no reminder on drafts, paid, void or not-yet-linked bills
 {const dr=await mk("inv",{title:"Draft",lines:[{d:"x",q:1,r:50}]},cR);const {c,p}=await pageCSP(L,1300,P.ck);await go(L,p,"/invoice/"+dr,".o7-side");ok(!(await p.$("#i49Rem")),"a draft has no reminder panel");await c.close()}
 {const pd=await mk("inv",{title:"Paid",lines:[{d:"x",q:1,r:50}],tax:0},cR);await send(pd);const rp=await act(L,P.ck,"recordPay",[pd,50,"cash"]);const {c,p}=await pageCSP(L,1300,P.ck);await go(L,p,"/invoice/"+pd,".i48-card");ok(rp.res.ok&&!(await p.$("#i49Rem")),"a paid invoice has no reminder panel",J(rp.res));await c.close()}
 {const nl=await mk("inv",{title:"No link yet",lines:[{d:"x",q:1,r:75}],due:ymd(-2)},cR);await send(nl);await act(L,P.ck,"off49",[nl]);const r=await act(L,P.ck,"remindBill",[nl,"sms"]);ok(r.res.ok===false&&/Get the customer link/.test(r.res.msg),"with the link off, the reminder asks for a link first",r.res.msg)}
 // Office overview: the overdue alert's Send reminder opens the invoice at the reminder
 {const {c,p,errs}=await pageCSP(L,1300,P.ck);await go(L,p,"/office",'[data-remind="'+od+'"]');const has=!!(await p.$('[data-remind="'+od+'"]'));
  if(has){await p.click('[data-remind="'+od+'"]');await p.waitForFunction(id=>location.pathname==="/invoice/"+id,od,{timeout:10000}).catch(()=>{});await p.waitForTimeout(500)}
  const d=await p.evaluate(()=>({u:location.pathname+location.search,f:document.activeElement&&document.activeElement.id}));ok(has&&d.u.startsWith("/invoice/"+od)&&d.f==="i49Sms","the Office overdue alert's Send reminder opens the invoice with Text reminder ready",J([has,d]));ok(!errs.length,"no script errors",J(errs));await c.close()}
 // customers with an account: unchanged (in-app reminder)
 {const C2=await signup(L,"customer","acct","78704");const cA=await custOf("Ari Stone","ari");const ab=await mk("inv",{title:"Water softener",lines:[{d:"Softener",q:1,r:900}],tax:0,due:ymd(-3)},cA);const at=(await send(ab)).tk48;
  const cl=await act(L,C2.ck,"claim48",[at]);ok(cl.res.ok,"(customer adds the invoice to their account)",cl.res.msg);
  const r=await act(L,P.ck,"remindBill",[ab]);ok(r.res.ok&&r.res.msg==="Reminder sent","a customer with an account still gets the in-app reminder",r.res.msg);
  const n=((await stateFor(L,C2.ck)).notifs||[]).filter(x=>/Friendly reminder from Lopez/.test(x.text));ok(n.length===1,"…and it reaches them",n.length);
  const {c,p}=await pageCSP(L,1300,P.ck);await go(L,p,"/invoice/"+ab,".o7-side");ok(!(await p.$("#i49Rem")),"no Text/Email reminder panel for a customer with an account");await c.close()}
 // auto reminders: no fake 'sent' for customers without an account; the pro is told instead (once per step)
 {const r=await act(L,P.ck,"setAutoRemind",[true]);ok(r.res.ok,"auto reminders on",r.res.msg);
  const st=await stateFor(L,P.ck);const b=(st.bills||[]).find(x=>x.id===od);const ns=(st.notifs||[]).filter(x=>new RegExp(b.no+" for Jordan Hale is 9 days overdue\\. They have no Sawyer account, so text or email them a reminder from the invoice\\.").test(x.text));
  ok((b.reminders||[]).length===1&&ns.length===1&&ns[0].link==="bill:"+od,"the sweep doesn't log a nudge nobody got; it tells the pro, linked to the invoice",J([b.reminders,ns.length]));
  await act(L,P.ck,"sweep9",[]);const ns2=((await stateFor(L,P.ck)).notifs||[]).filter(x=>/for Jordan Hale is 9 days overdue/.test(x.text));ok(ns2.length===1,"…once per step",ns2.length);
  const {c,p}=await pageCSP(L,1300,P.ck);await go(L,p,"/office/recurring","#o9Auto");const t=await p.evaluate(()=>(document.querySelector(".o9-auto")||{}).textContent||"");ok(/Customers without a Sawyer account can't get it, so we tell you and you text or email theirs from the invoice\./.test(t),"the auto-reminder card says who it can't reach",t.slice(0,200));await c.close()}

 // --- budget: server-only sweeps stay out of the browser bundle
 {const html=(await req(L.port,"GET","/")).body;const js=[...html.matchAll(/\/js\/(a\d+\.[0-9a-f]{10}\.js)/g)].map(m=>fs.readFileSync(path.join(ROOT,"public/js",m[1]),"utf8")).join("\n");const logic=fs.readFileSync(path.join(ROOT,"app-logic.js"),"utf8");
  ok(/function v9Sweep\(m\)\{return null\}/.test(js)&&/function v9Sweep\(m\)\{if\(!m\)return 0/.test(logic),"the reminder sweep runs on the server and isn't shipped to browsers");
  ok(!/so text or email them a reminder from the invoice/.test(js)&&/so text or email them a reminder from the invoice/.test(logic),"(its new notice text is server-only too)");
  const tot=fs.readdirSync(path.join(ROOT,"public/js")).filter(f=>/^a\d+\./.test(f)).reduce((n,f)=>n+fs.statSync(path.join(ROOT,"public/js",f)).size,0);ok(tot<1120000,"app JS stays under the 1.12 MB budget",tot)}

 if(failed)throw new Error(failed+" check(s) failed");
 console.log("OK v49-e2e");
}catch(e){if(!/check\(s\) failed$/.test(String(e&&e.message)))console.log("FAIL crashed: "+String(e&&e.message||e).split("\n")[0].slice(0,300));console.error(e&&e.stack||e);failed++;}
finally{if(br)await br.close().catch(()=>{});await Promise.all(SERVERS.map(s=>stopApp(s)));process.exit(failed?1:0)}})();
