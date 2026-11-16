// v41 end-to-end. Self-contained: starts its own Sawyer server (local test mode). Covers health 2.24.0-sawyer / SW cache
// sawyer-v41, (1) the signed-in account button's accessible name starts with its visible text (axe
// label-content-name-mismatch at 390 and 1300), (2) the traveler-call fit check (license / reciprocity / level, start
// date, safety card, references) as rules and on the owner's Applicants list, the summary line, pipeline cards and the
// traveler's own call page, and that it never reaches anyone but the poster or that traveler, and (3) the pro dashboard's
// "Your traveler calls" card and the demo electrical contractor login (demo-electrical@sawyer.test).
// Usage: node test/v41-e2e.js [shots dir]   (V41_SHOTS=dir also copies the screenshots there)
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
const STRIP=["NODE_ENV","RENDER","AUTH_TEST_MODE","STAFF_DEMO_PASSWORD","RESEND_API_KEY","SENDGRID_API_KEY","EMAIL_FROM","MAIL_FROM","RESEND_API_URL","TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_FROM","TWILIO_MESSAGING_SERVICE_SID","TEST_NOW","SAWYER_BASE_URL","PUBLIC_URL","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","APPLE_CLIENT_ID","MICROSOFT_CLIENT_ID","FACEBOOK_APP_ID","VAPID_PRIVATE_KEY","VAPID_PUBLIC_KEY","VAPID_SUBJECT","PUSH_DEBUG","PUSH_TEST_ORIGIN","PUSH_RETRY_MS","SAWYER_PERSISTENT","EMAIL_DELIVERY_VERIFIED","SMS_DELIVERY_VERIFIED"];
async function startApp(extra){const port=await freePort();
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v41-"));
 const env=Object.assign({},process.env,{HOST:"127.0.0.1",PORT:String(port),DATA_DIR:dir,RATE_X:"50"});
 for(const k of STRIP)if(!extra||!(k in extra))delete env[k];
 if(extra)Object.assign(env,extra);
 const child=spawn(process.execPath,[path.join(ROOT,"server.js")],{env,stdio:["ignore","pipe","pipe"]});
 let log="";child.stdout.on("data",d=>{log+=d});child.stderr.on("data",d=>{log+=d});
 return new Promise((res,no)=>{const t=setTimeout(()=>no(new Error("server did not start\n"+log.slice(-400))),15000);
  const wait=()=>{if(/live on/.test(log)){clearTimeout(t);res({child,dir,log:()=>log,port,B:"http://127.0.0.1:"+port})}else setTimeout(wait,30)};
  child.on("exit",c=>{clearTimeout(t);no(new Error("server exited "+c+"\n"+log.slice(-400)))});wait()})}
function stopApp(s){return new Promise(res=>{if(!s||s.child.exitCode!==null)return res();const done=()=>{try{fs.rmSync(s.dir,{recursive:true,force:true})}catch(e){}res()};s.child.on("exit",done);s.child.kill("SIGTERM");setTimeout(()=>{try{s.child.kill("SIGKILL")}catch(e){}},3000)})}
function req(port,method,p,headers,body){return new Promise((res,no)=>{const r=http.request({hostname:"127.0.0.1",port,path:p,method,headers:headers||{}},rs=>{const ch=[];rs.on("data",c=>ch.push(c));rs.on("end",()=>{let buf=Buffer.concat(ch);const enc=rs.headers["content-encoding"];if(enc==="gzip")buf=zlib.gunzipSync(buf);else if(enc==="br")buf=zlib.brotliDecompressSync(buf);let json=null;try{json=JSON.parse(buf.toString("utf8"))}catch(e){}res({status:rs.statusCode,headers:rs.headers,body:buf.toString("utf8"),json})})});r.on("error",no);if(body)r.write(body);r.end()})}
function mockResend(mode){const inbox=[];const srv=http.createServer((rq,rs)=>{const ch=[];rq.on("data",c=>ch.push(c));rq.on("end",()=>{inbox.push(1);if(mode==="403"){rs.writeHead(403,{"Content-Type":"application/json"});return rs.end(JSON.stringify({statusCode:403,name:"validation_error",message:"domain not verified"}))}rs.writeHead(200,{"Content-Type":"application/json"});rs.end(JSON.stringify({id:"mock_"+inbox.length}))})});
 return new Promise(res=>srv.listen(0,"127.0.0.1",()=>res({srv,inbox,url:"http://127.0.0.1:"+srv.address().port+"/emails"})))}
const J=o=>JSON.stringify(o),JH={"Content-Type":"application/json"};
const stateOf=r=>(r.json&&(r.json.state||r.json))||{};
const sigCk=r=>(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0];
const meOf=st=>(st.users||[]).find(u=>u.id===st.me)||{};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let AXE="";try{AXE=fs.readFileSync(require.resolve("axe-core/axe.min.js"),"utf8")}catch(e){}
const SERVERS=[];let br=null;const errs=[];
(async()=>{try{
 const run=Math.random().toString(36).slice(2,8);
 const SH=process.argv[2]||fs.mkdtempSync(path.join(os.tmpdir(),"v41-shots-"));const SHOTS=process.env.V41_SHOTS||"";fs.mkdirSync(SH,{recursive:true});if(SHOTS)fs.mkdirSync(SHOTS,{recursive:true});
 const L=await startApp();SERVERS.push(L);
 const act=async(S,ck,name,args)=>{const r=await req(S.port,"POST","/api/act",Object.assign(ck?{Cookie:ck}:{},JH),J({name,args}));return {res:(r.json&&r.json.res)||{},st:stateOf(r),status:r.status,error:r.json&&r.json.error}};
 const stateFor=async(S,ck)=>stateOf(await req(S.port,"GET","/api/state",ck?{Cookie:ck}:{}));
 const signup=async(S,kind,tag,zip,extra)=>{const email="v41-"+tag+"-"+run+"@example.com";const data=Object.assign({name:(kind==="pro"?"Vee ":"Hana ")+tag,email,zip},kind==="pro"?{biz:"V41 "+tag+" "+run,trade:"Plumbing",phone:"5125550100",plan:"founding"}:kind==="pm"?{biz:"V41 PM "+tag}:{},extra||{});
  const r=await req(S.port,"POST","/api/signup",JH,J({kind,password:"v41-correct-horse",data}));return{status:r.status,error:r.json&&r.json.error,ck:sigCk(r),id:stateOf(r).me,st:stateOf(r),email}};
 const login=async(S,email)=>{const r=await req(S.port,"POST","/api/login",JH,J({email,password:"sawyer-demo-2026"}));return{status:r.status,ck:sigCk(r),id:stateOf(r).me}};
 br=await chromium.launch();
 const page=async(S,w,ck,opt)=>{const c=await br.newContext(Object.assign({viewport:{width:w,height:w<500?844:900},deviceScaleFactor:w<500?2:1,bypassCSP:true,hasTouch:w<500},opt||{}));
  if(ck){const [k,v]=ck.split("=");await c.addCookies([{name:k,value:v,url:S.B}])}
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return{c,p}};
 // wait for the full state (not the partial first paint) before reading anything that depends on it
 const go=async(S,p,u,sel)=>{await p.goto(S.B+u,{waitUntil:"networkidle"});await p.waitForFunction(()=>typeof __PART!=="undefined"&&!__PART&&typeof me==="function",null,{timeout:60000,polling:100});if(sel)await p.waitForSelector(sel,{timeout:20000}).catch(()=>{})};
 const shot=async(p,name,opt)=>{await p.screenshot(Object.assign({path:path.join(SH,name)},opt||{}));if(SHOTS)await p.screenshot(Object.assign({path:path.join(SHOTS,name)},opt||{}))};
 const eshot=async(loc,name)=>{await loc.scrollIntoViewIfNeeded();await loc.screenshot({path:path.join(SH,name)});if(SHOTS)await loc.screenshot({path:path.join(SHOTS,name)})};
 const noOverflow=async(p,lbl)=>{const ov=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);ok(ov<=0,lbl+": no sideways scroll",ov)};
 const axe=async(p,sel,lbl,rules)=>{if(!AXE)return;if(!(await p.evaluate(()=>typeof axe!=="undefined")))await p.addScriptTag({content:AXE});const v=await p.evaluate(async([s,rules])=>{const o=rules?{runOnly:{type:"rule",values:rules}}:{runOnly:{type:"tag",values:["wcag2a","wcag2aa"]}};const r=await axe.run(document.querySelector(s)||document,o);return r.violations.filter(v=>rules||v.impact==="serious"||v.impact==="critical").map(v=>v.id+":"+v.nodes.map(n=>n.target.join(" ")).join(","))},[sel,rules||null]);ok(!v.length,lbl+": no "+(rules?rules.join(","):"serious axe")+" issues",J(v))};

 // --- release
 {const hz=(await req(L.port,"GET","/healthz")).json||{};ok(hz.v==="2.24.0-sawyer","healthz reports 2.24.0-sawyer",J(hz));
  const sw=await req(L.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v41"/.test(sw.body),"service worker cache is sawyer-v41")}

 // --- (3) demo electrical contractor login
 const EC=await login(L,"demo-electrical@sawyer.test");ok(EC.status===200&&EC.id==="c2"&&EC.ck,"demo-electrical@sawyer.test signs in as Saguaro Electric (c2)",J({s:EC.status,id:EC.id}));
 const PRO=await login(L,"demo-pro@sawyer.test");ok(PRO.status===200&&PRO.id==="c1","demo-pro still signs in");
 {const bad=await req(L.port,"POST","/api/login",JH,J({email:"demo-electrical@sawyer.test",password:"wrong-password-41"}));ok(bad.status!==200&&!sigCk(bad),"wrong password is refused for the new demo login",bad.status)}

 // --- (1) a11y: #acctBtn accessible name starts with the visible text
 for(const w of [390,1300]){const {c,p}=await page(L,w,PRO.ck);await go(L,p,"/dash","#acctBtn");
  const r=await p.evaluate(()=>{const b=document.getElementById("acctBtn");if(!b)return null;return{label:b.getAttribute("aria-label")||"",vis:b.innerText.replace(/\s+/g," ").trim()}});
  ok(r&&r.vis&&r.label.toLowerCase().startsWith(r.vis.toLowerCase())&&/, account menu$/.test(r.label),w+": #acctBtn label starts with what it shows",J(r));
  ok(r&&/^BP Kevin|^[A-Z]{1,2} /.test(r.label),w+": label leads with the initials",J(r));
  await axe(p,"#acctBtn",w+" account button",["label-content-name-mismatch"]);
  await axe(p,"#acctBtn",w+" account button name",["button-name"]);
  const gap=await p.evaluate(()=>{const b=document.getElementById("acctBtn"),a=b.querySelector(".avatar"),s=b.querySelector(".hide-s");if(!s||getComputedStyle(s).display==="none")return 0;return Math.round(s.getBoundingClientRect().left-a.getBoundingClientRect().right)});ok(gap<=12,w+": the added space doesn't push the name away from the avatar",gap);await c.close()}

 // --- (2) fit rules (pure)
 {const {c,p}=await page(L,1300,EC.ck);await go(L,p,"/dash");
  const R=await p.evaluate(()=>{const VA={lic:"Journeyman",lstate:"VA",recip:"Reciprocity accepted from TX, OK, NC, SC with proof of hours",start:"2026-11-30"};
   const f=(c,t)=>{const x=v41Fit(c,t);return x.lic.k+"/"+x.start.k+"/"+(x.fits?1:0)};
   return{
    inState:f(VA,{lic:[{type:"Journeyman",state:"VA"}],availNow:true}),
    recip:f(VA,{lic:[{type:"Journeyman",state:"TX"}],availNow:true}),
    none:f(VA,{lic:[{type:"Journeyman",state:"OH"}],availNow:true}),
    noneTxt:v41Fit(VA,{lic:[{type:"Journeyman",state:"OH"}]}).lic.txt,
    level:f(VA,{lic:[{type:"Apprentice",state:"VA"}],availNow:true}),
    master:f(VA,{lic:[{type:"Master",state:"NC"}],availNow:true}),
    otherClass:f(VA,{lic:[{type:"Lineman",state:"VA"}],availNow:true}),
    noLic:f(VA,{lic:[],availNow:true}),
    ask:f({lic:"Journeyman",lstate:"",recip:""},{lic:[{type:"Journeyman",state:"TX"}],availNow:true}),
    required:v41Accepts({lstate:"TX",recip:"TX license required (TDLR); apprentices with 4,000+ hrs considered"}).recip.join(","),
    ky:v41Accepts({lstate:"KY",recip:"KY license or reciprocity (OH, IN, TN, WV)"}).recip.join(","),
    noRecip:v41Accepts({lstate:"WA",recip:"No reciprocity. WA card only (OR and ID applicants must test)"}).recip.join(","),
    before:f(VA,{lic:[{type:"Journeyman",state:"VA"}],availDate:"2026-11-28"}),
    late:v41Fit(VA,{lic:[{type:"Journeyman",state:"VA"}],availDate:"2026-12-10"}).start.txt,
    off:f(VA,{lic:[{type:"Journeyman",state:"VA"}],availNow:false,st10:"off"}),
    noDate:f(VA,{lic:[{type:"Journeyman",state:"VA"}]})}});
  ok(R.inState==="state/now/1","in-state journeyman card, free now: fits",R.inState);
  ok(R.recip==="recip/now/1","TX card on a VA call that names TX: fits by reciprocity",R.recip);
  ok(R.none==="none/now/0"&&/No VA card; OH isn't on the accepted list/.test(R.noneTxt),"OH card on that call: no fit, says why",R.none+" "+R.noneTxt);
  ok(R.level==="level/now/0","apprentice card where journeyman is asked: no fit",R.level);
  ok(R.master==="recip/now/1","master card covers a journeyman call",R.master);
  ok(R.otherClass==="level/now/0","a different license class (lineman) doesn't count as journeyman",R.otherClass);
  ok(R.noLic==="none/now/0","no license on the profile: no fit",R.noLic);
  ok(R.ask.startsWith("ask/"),"call without a license state: 'ask'",R.ask);
  ok(R.required==="","'TX license required (TDLR)' accepts no other state",R.required);
  ok(R.ky==="OH,IN,TN,WV","reciprocity states are read from the posting",R.ky);
  ok(R.noRecip==="","'No reciprocity' accepts no other state even when it names some",R.noRecip);
  ok(R.before==="state/before/1","free two days before the start: fits",R.before);
  ok(/^Free Dec 10, 10 days after the start$/.test(R.late),"free after the start: says how many days late",R.late);
  ok(R.off==="state/off/0","marked not looking: no fit",R.off);
  ok(R.noDate==="state/ask/0","no free date on the profile: 'ask', not a fit",R.noDate);
  await c.close()}

 // --- (2) a traveler with an OH card applies to the KY battery-plant call (reciprocity OH, IN, TN, WV)
 const TV=await signup(L,"customer","trav","43215");ok(TV.status===200&&TV.ck,"a traveler signs up",J(TV.error));
 let r=await act(L,TV.ck,"saveTravel",[{trade:"Electrical",headline:"Journeyman wireman, industrial",home:"Columbus, OH",lic:[{type:"Journeyman",state:"OH"}],states:["OH","KY","IN"],availNow:true,yrs:11,osha:"OSHA 30"}]);ok(r.res.ok,"traveler profile saved",J(r.res));
 r=await act(L,TV.ck,"applyTravel",["tcd6","OH journeyman, free now"]);ok(r.res.ok,"traveler applies to the Glendale, KY call",J(r.res));
 // the fit chips are view-only: the public snapshot still carries no applicants, and another pro sees no fit chips
 {const pub=await stateFor(L,null);const c6=(pub.tcalls||[]).find(c=>c.id==="tcd6");ok(c6&&Array.isArray(c6.apps)&&c6.apps.length===0,"signed-out state still names no applicants",J(c6&&c6.apps))}

 // owner: call page, summary, chips
 for(const w of [1300,390]){const {c,p}=await page(L,w,EC.ck);await go(L,p,"/tcall/tcd6","#v41sum");
  const sum=await p.locator("#v41sum").innerText().catch(()=>"");ok(/1 of 1\s+active applicant fits the license and start date/.test(sum)&&/cards from KY, OH, IN, TN, WV/.test(sum),w+": summary on the call",sum);
  const fit=await p.evaluate(id=>{const a=[...document.querySelectorAll(".t5app")].find(x=>x.querySelector(`a[href*="/traveler/${id}"]`));const f=a&&a.querySelector(".v41fit");return f?{fit:f.dataset.fit,lic:f.dataset.lic,start:f.dataset.start,txt:f.innerText.replace(/\s+/g," ")}:null},TV.id);
  ok(fit&&fit.fit==="yes"&&fit.lic==="recip"&&fit.start==="now"&&/OH journeyman card, accepted by reciprocity/.test(fit.txt)&&/OSHA 30/.test(fit.txt)&&/0 references/.test(fit.txt),w+": applicant row shows the fit chips",J(fit));
  await noOverflow(p,w+" call page");await axe(p,".t5apps",w+" applicants");
  if(w===1300)await eshot(p.locator(".t6sec:has(.t5apps)"),"v41-applicants-fit-1300.png");
  // tcd1: Jess (OH) on a VA call that doesn't take OH
  await go(L,p,"/tcall/tcd1","#v41sum");const t1=await p.evaluate(()=>{const a=[...document.querySelectorAll(".t5app")].find(x=>x.querySelector('a[href*="/traveler/tv5"]'));const f=a&&a.querySelector(".v41fit");return f?{fit:f.dataset.fit,lic:f.dataset.lic,txt:f.innerText.replace(/\s+/g," ")}:null});
  ok(t1&&t1.fit==="no"&&t1.lic==="none"&&/No VA card; OH isn't on the accepted list/.test(t1.txt),w+": an OH card on the VA call says it isn't accepted",J(t1));
  ok(await p.locator('.t5app [data-tdec="tv5:1"]').count()===1,w+": Hire is still offered (the check informs, it doesn't block)");
  // pipeline card
  await go(L,p,"/tdash?call=tcd6",".t6k-card .v41fit");const pc=await p.evaluate(id=>{const k=document.querySelector(`.t6k-card[data-uid="${id}"] .v41fit`);return k?k.dataset.fit+"|"+k.innerText.replace(/\s+/g," "):""},TV.id);
  ok(/^yes\|/.test(pc),w+": pipeline card carries the fit chips",pc);await noOverflow(p,w+" pipeline");
  if(w===1300)await eshot(p.locator(".t6kan"),"v41-pipeline-fit-1300.png");
  // dashboard card
  await go(L,p,"/dash","#v41calls");const dash=await p.locator("#v41calls").innerText().catch(()=>"");
  ok(/Your traveler calls/.test(dash)&&/Battery plant/.test(dash)&&/Hyperscale data center/.test(dash),w+": dashboard lists the contractor's calls",dash.slice(0,300));
  const row6=await p.locator('#v41calls .v41row[data-call="tcd6"]').innerText().catch(()=>"");ok(/0\s*\/\s*8 hired/.test(row6)&&/1\s*active\s*·\s*1\s*fit/.test(row6)&&/starts in \d+ days/.test(row6),w+": the KY call row: 0/8 hired, 1 active · 1 fit, days to start",row6);
  ok(await p.locator('#v41calls .v41row[data-call="tcd6"] a[href*="tdash"]').count()===1,w+": the row links to its pipeline");
  await noOverflow(p,w+" dashboard");await axe(p,"#v41calls",w+" traveler calls card");
  await eshot(p.locator("#v41calls"),"v41-dash-calls-"+w+".png");await c.close()}

 // traveler's own view
 for(const w of [390]){const {c,p}=await page(L,w,TV.ck);await go(L,p,"/tcall/tcd6","#v41me");
  let me_=await p.locator("#v41me").innerText().catch(()=>"");ok(/You fit this call/.test(me_)&&/OH journeyman card, accepted by reciprocity/.test(me_)&&/Free now/.test(me_),w+": the traveler sees 'You fit this call'",me_);
  await axe(p,"#v41me",w+" your fit");await eshot(p.locator(".t6recip"),"v41-traveler-fit-390.png");
  await go(L,p,"/tcall/tcd1","#v41me");me_=await p.locator("#v41me").innerText().catch(()=>"");ok(/Check your license first/.test(me_)&&/No VA card; OH isn't on the accepted list/.test(me_),w+": on the VA call the traveler is told to check their license first",me_);
  ok(await p.locator(".t5apps,.t6k-card").count()===0,w+": the traveler never sees the applicant list");
  await noOverflow(p,w+" traveler call page");await c.close()}

 // another pro (not the poster, no traveler profile) sees no fit chips and no applicant list
 {const {c,p}=await page(L,1300,PRO.ck);await go(L,p,"/tcall/tcd6",".t6recip");ok(await p.locator(".v41fit,#v41sum,#v41me").count()===0,"another pro sees no fit chips on someone else's call");
  await go(L,p,"/dash","#acctBtn");ok(await p.locator("#v41calls").count()===0,"a plumber with no calls gets no traveler-calls card");await c.close()}
 // an electrical pro with no calls gets the 'Post a traveler call' card
 {const EP=await signup(L,"pro","elec","85004",{trade:"Electrical"});ok(EP.status===200,"an electrical pro signs up",J(EP.error));
  const {c,p}=await page(L,1300,EP.ck);await go(L,p,"/dash","#v41calls");const t=await p.locator("#v41calls").innerText().catch(()=>"");
  ok(/Need hands for a big job\?/.test(t)&&await p.locator('#v41calls a[href*="newtravel"]').count()>=1,"an electrical pro with no calls sees 'Post a traveler call'",t);await c.close()}

 ok(!errs.length,"no page errors",errs.join(" | "));
}catch(e){failed++;console.log("FAIL crashed: "+(e&&e.stack||e))}finally{try{if(br)await br.close()}catch(e){}for(const s of SERVERS)await stopApp(s);
 console.log(failed?"\n"+failed+" FAILED":"\nALL PASS");process.exit(failed?1:0)}})();
