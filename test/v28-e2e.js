// v28 end-to-end. Self-contained: starts its own Sawyer server (local test mode) and a public-host simulation (RENDER=1).
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v28-"));
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
// Covers: SW-061 (a quote from an Office estimate keeps the cents; the note adds up), SW-062 (one quote and one toast on a
// double tap, on the two-tap sheet and the job-page modal; Send comes back after a refused price), "Set a starting price"
// done only with a from-price above $0, the /jobs labeled stock photo (prerendered, sized, lazy, no CLS), the dated and
// hedged /pros "How Sawyer compares" table, in-app "New job in your area" notices plus "new since your last visit" on the
// dashboard (private to that pro: nothing in other users' state, signed-out /api/state or prerendered HTML),
// health 2.11.0-sawyer and SW cache sawyer-v28.
let LOCAL=null,PUB=null,br=null;
const pre=h=>(h.match(/<div id="pre11">[\s\S]*$/)||[""])[0].replace(/<script[\s\S]*?<\/script>/g,"");
const login=async(port,email,pw)=>{const r=await req(port,"POST","/api/login",JH,J({email,password:pw||"sawyer-demo-2026"}));return {ck:(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0],st:(r.json&&r.json.state)||{}}};
const stateOf=r=>(r.json&&(r.json.state||r.json))||{};
const act=async(port,ck,name,args)=>{const r=await req(port,"POST","/api/act",Object.assign({Cookie:ck},JH),J({name,args}));return {res:(r.json&&r.json.res)||{},st:stateOf(r),status:r.status}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
 LOCAL=await startApp(await freePort(),{});
 PUB=await startApp(await freePort(),{RENDER:"true"});
 br=await chromium.launch();
 const errs=[];
 const page=async(w,js,cookie,S)=>{const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900},javaScriptEnabled:js!==false});
  if(cookie){const [k,v]=cookie.split("=");await c.addCookies([{name:k,value:v,url:(S||LOCAL).B}])}
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p.addInitScript(()=>{window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:"layout-shift",buffered:true})}catch(e){}});return p};
 const hz=(await req(LOCAL.port,"GET","/healthz")).json||{};ok(hz.v==="2.11.0-sawyer","healthz reports 2.11.0-sawyer",J(hz));
 const sw=await req(LOCAL.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v28"/.test(sw.body),"service worker cache is sawyer-v28");
 const pro=await login(LOCAL.port,"demo-pro@sawyer.test"),ho=await login(LOCAL.port,"demo-homeowner@sawyer.test");

 // ===== 1. SW-061: a quote from an Office estimate keeps the cents =====
 let EST=null;
 {const st=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:pro.ck}));const cu=(st.bcust||[]).find(c=>c.by===st.me);ok(!!cu,"demo pro has an Office customer");
  const r=await act(LOCAL.port,pro.ck,"saveBill",[{type:"est",cust:cu&&cu.id,title:"V28 furnace repair package",tax:8.25,lines:[{d:"Labor, diagnose and repair",q:2,r:120},{d:"Thermocouple",q:1,r:45},{d:"Full tune-up",q:1,r:89,opt:true,on:false}]}]);
  EST=r.res&&r.res.id;const b=(r.st.bills||[]).find(x=>x.id===EST);ok(r.res.ok&&b&&b.no,"pro saves an estimate with cents after tax (2 × $120 + $45, 8.25% tax)",J(r.res))}
 for(const w of [1440,390]){const p=await page(w,true,pro.ck);await p.goto(LOCAL.B+"/job/j4",{waitUntil:"networkidle"});const b=await p.$("#doQuote");
  if(!b){ok(false,w+" job page j4 has a quote button");await p.context().close();continue}
  await b.click();await p.waitForSelector("#qf #v27es");const lab=await p.$eval(`#v27es option[value="${EST}"]`,o=>o.textContent).catch(()=>"");
  ok(/\$308\.51$/.test(lab)&&!/\$309\b/.test(lab),w+" job-page estimate picker label shows cents ($308.51)",lab);
  await p.selectOption("#v27es",EST);const o=await p.evaluate(()=>({p:document.getElementById("qp").value,n:document.getElementById("qn").value}));
  ok(o.p==="308.51",w+" job-page modal: picking the estimate sets the exact total 308.51",o.p);
  ok(/Labor, diagnose and repair \(\$240\)/.test(o.n)&&/Thermocouple \(\$45\)/.test(o.n)&&/Subtotal \$285 \+ 8\.25% tax \(\$23\.51\) = \$308\.51/.test(o.n)&&/Optional add-ons \(not in the price\): Full tune-up \(\$89\)/.test(o.n),w+" note adds up: lines, subtotal, tax and total match the price",o.n);
  await p.context().close()}
 // the two-tap sheet: pick the estimate, send, the stored price and the card keep the cents
 {const p=await page(1440,true,pro.ck);await p.goto(LOCAL.B+"/jobs",{waitUntil:"networkidle"});await p.click('.v27jc [data-v27q="j4"]');await p.waitForSelector("#v27qf #v27es");
  await p.selectOption("#v27es",EST);ok(await p.inputValue("#v27qp")==="308.51","two-tap sheet: estimate sets 308.51");
  await p.click("#v27qs");await p.waitForTimeout(500);const st=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:pro.ck}));const q=(st.quotes||[]).find(x=>x.job==="j4"&&x.cid===st.me);
  ok(q&&q.price===308.51&&/= \$308\.51/.test(q.note),"the quote is stored at $308.51 with the matching note",J(q&&{p:q.price,n:q.note}));
  const card=await p.evaluate(()=>{const a=document.querySelector('#app a.jobcard[href$="/job/j4"]');return a?a.closest(".v27jc").innerText:""});ok(/You quoted \$308\.51/.test(card),"the card reads 'You quoted $308.51'",card.slice(0,200));
  const hst=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:ho.ck}));await p.context().close()}

 // ===== 2. SW-062: a double tap sends one quote and shows one toast =====
 const post=async t=>{const r=await act(LOCAL.port,ho.ck,"postJob",[{title:t,cat:"Plumbing",sub:"Drain cleaning",desc:"Kitchen sink drains slowly.",zip:"78704",budget:"$100–400",when:"This week"}]);return r.res&&r.res.id};
 const JA=await post("V28 kitchen drain slow A"),JB=await post("V28 kitchen drain slow B");ok(JA&&JB,"homeowner posts two plumbing jobs for the double-tap tests");
 const countQ=async jid=>{const st=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:ho.ck}));return (st.quotes||[]).filter(q=>q.job===jid).length};
 {const p=await page(390,true,pro.ck);await p.goto(LOCAL.B+"/jobs",{waitUntil:"networkidle"});await p.click(`.v27jc [data-v27q="${JA}"]`);await p.waitForSelector("#v27qs");await p.fill("#v27qp","275");
  await p.dblclick("#v27qs");await p.waitForTimeout(700);const t=(await toasts(p)).filter(x=>/Quote sent/.test(x));
  ok(t.length===1,"two-tap sheet: a double tap on Send shows one 'Quote sent' toast",J(await toasts(p)));ok(await countQ(JA)===1,"two-tap sheet: one quote stored");await p.context().close()}
 {const p=await page(1440,true,pro.ck);await p.goto(LOCAL.B+"/job/"+JB,{waitUntil:"networkidle"});await p.click("#doQuote");await p.waitForSelector("#qf");
  const sb='#qf button:not([type="button"])';await p.fill("#qp","0");await p.click(sb);await p.waitForTimeout(300);
  ok(await p.$eval(sb,b=>!b.disabled).catch(()=>false)&&!!(await p.$("#qf")),"job-page modal: a refused price leaves Send enabled (fix and retry)");
  await p.fill("#qp","300");await p.dblclick(sb);await p.waitForTimeout(700);const t=(await toasts(p)).filter(x=>/Quote sent/.test(x));
  ok(t.length===1,"job-page modal: a double tap on Send shows one 'Quote sent' toast",J(await toasts(p)));ok(await countQ(JB)===1,"job-page modal: one quote stored");await p.context().close()}
 // Enter key twice on the sheet: still one quote
 {const JC=await post("V28 kitchen drain slow C");const p=await page(1440,true,pro.ck);await p.goto(LOCAL.B+"/jobs",{waitUntil:"networkidle"});await p.click(`.v27jc [data-v27q="${JC}"]`);await p.waitForSelector("#v27qp");
  await p.fill("#v27qp","260");await p.focus("#v27qp");await p.keyboard.press("Enter");await p.keyboard.press("Enter").catch(()=>{});await p.waitForTimeout(700);
  ok((await toasts(p)).filter(x=>/Quote sent/.test(x)).length===1&&await countQ(JC)===1,"two-tap sheet: Enter twice sends one quote, one toast",J(await toasts(p)));await p.context().close()}

 // ===== 3. "Set a starting price" needs a from-price above $0 =====
 const run=Math.random().toString(36).slice(2,8);
 const signup=async(trade,zip,tag)=>{const r=await req(LOCAL.port,"POST","/api/signup",JH,J({kind:"pro",password:"v28-correct-horse",data:{name:"Vee "+tag,biz:"V28 "+tag+" "+run,email:"v28-"+tag+"-"+run+"@example.com",trade,zip,phone:"5125550100",plan:"founding"}}));
  return {ck:(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0],id:stateOf(r).me,status:r.status}};
 {const np=await signup("Plumbing","78704","price");ok(np.status===200&&np.ck,"a new plumbing pro signs up");
  const step=async()=>{const p=await page(1440,true,np.ck);await p.goto(LOCAL.B+"/dash",{waitUntil:"networkidle"});await p.waitForSelector("#v27guide");const o=await p.evaluate(()=>{const s=document.querySelector('.v27g-s[data-step="price"]');return{c:s.className,t:s.innerText.replace(/\s+/g," ")}});await p.context().close();return o};
  let o=await step();ok(!/\bdone\b/.test(o.c)&&/Not set yet/.test(o.t),"no menu yet: the price step is open",J(o));
  await act(LOCAL.port,np.ck,"setMenu12",[[{s:"Drain cleaning",from:"",unit:"job",note:""},{s:"Water heaters",from:"",unit:"job",note:""}]]);o=await step();
  ok(!/\bdone\b/.test(o.c)&&/No price above \$0 yet/.test(o.t),"services saved with blank prices: the step stays open",J(o));
  await act(LOCAL.port,np.ck,"setMenu12",[[{s:"Drain cleaning",from:"0",unit:"job",note:""}]]);o=await step();ok(!/\bdone\b/.test(o.c),"a $0 from-price does not complete the step",J(o));
  await act(LOCAL.port,np.ck,"setMenu12",[[{s:"Drain cleaning",from:"0",unit:"job",note:""},{s:"Water heaters",from:"1200",unit:"job",note:""}]]);o=await step();ok(/\bdone\b/.test(o.c)&&/Starting prices set/.test(o.t),"one service from $1,200: the step is done",J(o))}

 // ===== 4. /jobs: small labeled stock photo (SEO image-alt parity), no layout shift =====
 for(const S of [LOCAL,PUB]){const r=await req(S.port,"GET","/jobs");const h=pre(r.body);const im=(h.match(/<img class="v28jb-ph"[^>]*>/)||[""])[0];
  ok(/src="\/img\/x-carpentry-sm\.webp"/.test(im)&&/alt="[^"]+\(stock photo\)"/.test(im)&&/width="400" height="300"/.test(im)&&/loading="lazy"/.test(im),(S===PUB?"public":"local")+" /jobs prerender has the labeled, sized, lazy stock photo",im)}
 for(const w of [1440,390]){const p=await page(w);await p.goto(LOCAL.B+"/jobs",{waitUntil:"networkidle"});await p.waitForFunction(()=>!document.getElementById("pre11"));await p.waitForTimeout(300);
  const o=await p.evaluate(()=>{const i=document.getElementById("v28jbPh");const r=i&&i.getBoundingClientRect();return{has:!!i,ok:!!i&&i.complete&&i.naturalWidth>0,w:r&&Math.round(r.width),noalt:[...document.querySelectorAll("img")].filter(x=>!x.hasAttribute("alt")).length,h1:document.querySelectorAll("h1").length,cls:window.__cls,ow:document.documentElement.scrollWidth>innerWidth+1}});
  ok(o.has&&o.ok&&o.noalt===0&&o.h1===1&&o.cls<0.05&&!o.ow&&o.w<=140,w+" /jobs after hydration: photo loaded and small, every image has alt, one H1, CLS ~0, no overflow",J(o));await p.context().close()}
 {const p=await page(1440,true,pro.ck);await p.goto(LOCAL.B+"/jobs",{waitUntil:"networkidle"});ok(!(await p.$("#v28jbPh")),"signed-in pro's /jobs has no header photo (pipeline cards only)");await p.context().close()}

 // ===== 5. /pros: the older comparison table is dated and hedged =====
 for(const S of [LOCAL,PUB]){const h=pre((await req(S.port,"GET","/pros")).body);const t=(h.match(/<table class="compare">[\s\S]*?<\/div>/)||[""])[0];
  ok(/checked November 2026/.test(t)&&!/\$287\.99|\$15–\$75|\$18–\$300|~\$150/.test(t),(S===PUB?"public":"local")+" /pros prerender: 'How Sawyer compares' is dated, no unverified exact competitor prices",t.replace(/<[^>]+>/g," ").slice(0,300))}
 for(const w of [1440,390]){const p=await page(w);await p.goto(LOCAL.B+"/pros",{waitUntil:"networkidle"});await p.waitForFunction(()=>!document.getElementById("pre11"));
  const o=await p.evaluate(()=>{const t=document.querySelector("table.compare");const rows=[...t.querySelectorAll("tbody tr")].map(r=>r.innerText.replace(/\s+/g," "));return{rows,note:t.parentElement.innerText.replace(/\s+/g," "),ow:document.documentElement.scrollWidth>innerWidth+1}});
  ok(o.rows.length===4&&/^Sawyer \$20\/mo flat \$0/.test(o.rows[0])&&o.rows.slice(1).every(r=>!/\$\d/.test(r))&&o.rows.slice(1).some(r=>/varies/.test(r)),w+" /pros table: Sawyer exact, competitors 'varies' with no exact prices",J(o.rows));
  ok(/checked November 2026/.test(o.note)&&!o.ow,w+" /pros table note is visible and dated; no overflow",o.note.slice(-260));await p.context().close()}

 // ===== 6. new-work notices for pros (in-app) + "new since your last visit" =====
 const near=await signup("HVAC","78704","near"),far=await signup("HVAC","98103","far"),other=await signup("Roofing","78704","roof");
 ok(near.ck&&far.ck&&other.ck,"three new pros: HVAC in Austin, HVAC in Seattle, Roofing in Austin");
 const dashNew=async(w,ck)=>{const p=await page(w,true,ck);await p.goto(LOCAL.B+"/dash",{waitUntil:"networkidle"});await p.waitForSelector("#v28new");await p.waitForTimeout(900);
  const o=await p.evaluate(()=>({t:document.getElementById("v28new").innerText.replace(/\s+/g," "),cards:[...document.querySelectorAll(".v27jc.v28isnew")].map(c=>({h:(c.querySelector("a.jobcard")||{}).getAttribute("href"),tag:!!c.querySelector(".v28tag")})),ow:document.documentElement.scrollWidth>innerWidth+1}));return{p,o}};
 {const {p,o}=await dashNew(1440,near.ck);ok(/Nothing new since your last visit/.test(o.t)&&o.cards.length===0,"first dashboard visit of a brand-new pro: nothing new",J(o));await p.context().close()}
 await sleep(300);
 const pj=await act(LOCAL.port,ho.ck,"postJob",[{title:"V28 furnace short cycling",cat:"HVAC",sub:"Furnace repair",desc:"Gas furnace turns off after two minutes. Private detail: gate code 4417.",zip:"78704",budget:"$200–600",when:"This week"}]);
 const JN=pj.res&&pj.res.id;ok(pj.res.ok&&JN,"homeowner posts an HVAC job in Austin",J(pj.res));
 const ns=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:near.ck}));const nn=(ns.notifs||[]).filter(n=>n.link==="job:"+JN);
 ok(nn.length===1&&nn[0].text==="New job in your area: V28 furnace short cycling"&&nn[0].read===false,"matching pro gets one unread bell notice 'New job in your area' linked to the job",J(nn));
 for(const [u,lab] of [[far,"HVAC pro outside the radius"],[other,"Roofing pro nearby"]]){const s=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:u.ck}));ok(!(s.notifs||[]).some(n=>n.link==="job:"+JN),lab+" gets no notice")}
 {const s=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:ho.ck}));ok(!(s.notifs||[]).some(n=>/New job in your area/.test(n.text)),"the homeowner who posted gets no 'new job' notice")}
 for(const w of [390]){const {p,o}=await dashNew(w,near.ck);
  ok(/1 new since your last visit/.test(o.t)&&o.cards.length===1&&/\/job\/[^/]+$/.test(o.cards[0].h)&&o.cards[0].h.endsWith("/job/"+JN)&&o.cards[0].tag&&!o.ow,w+" dashboard: '1 new since your last visit' and the job's card is tagged New",J(o));
  // bell -> the notice links to the job
  await p.goto(LOCAL.B+"/inbox",{waitUntil:"networkidle"});const it=await p.evaluate(jn=>{const a=[...document.querySelectorAll("#app a[data-n]")].find(x=>/New job in your area: V28 furnace/.test(x.textContent));return a?a.textContent.replace(/\s+/g," "):""},JN);
  ok(/New job in your area: V28 furnace short cycling/.test(it),"the notice is in the pro's inbox (bell)",it);
  const a=await p.$('#app a[data-n]:has-text("New job in your area")');if(a){await a.click();await p.waitForTimeout(500);ok(new URL(p.url()).pathname==="/job/"+JN,"clicking the notice opens the job",p.url())}else ok(false,"inbox notice is clickable");
  await p.context().close()}
 {const {p,o}=await dashNew(1440,near.ck);ok(/Nothing new since your last visit/.test(o.t)&&o.cards.length===0,"the next dashboard visit: the count resets (last visit saved)",J(o));await p.context().close()}
 // privacy: last-visit time and notices stay with that pro
 {const own=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:near.ck}));const meU=(own.users||[]).find(u=>u.id===own.me);ok(meU&&meU.jobsSeen28>0,"the pro's own state carries the last-visit time",J(meU&&meU.jobsSeen28));
  for(const [lab,ck] of [["signed-out",null],["another pro",pro.ck],["a homeowner",ho.ck]]){const s=stateOf(await req(LOCAL.port,"GET","/api/state",ck?{Cookie:ck}:{}));
   const others=(s.users||[]).filter(u=>u.id!==s.me);ok(!J(others).includes("jobsSeen28")&&!(s.notifs||[]).some(n=>n.link==="job:"+JN||n.to===near.id),lab+" /api/state: no other user's last-visit time and none of that pro's notices",J((s.notifs||[]).filter(n=>n.link==="job:"+JN)))}
  for(const S of [LOCAL]){for(const u of ["/jobs","/job/"+JN,"/pros","/"]){const r=await req(S.port,"GET",u);ok(!/jobsSeen28|since your last visit|New job in your area|v28new|gate code 4417/.test(r.body),"signed-out "+u+" HTML has no private new-work data")}}
  const pub=stateOf(await req(LOCAL.port,"GET","/api/state"));const pjob=(pub.jobs||[]).find(j=>j.id===JN);ok(pjob&&pjob.desc===""&&pjob.cust===null,"signed-out state: the new job is redacted (no description, no customer)",J(pjob&&{d:pjob.desc,c:pjob.cust}))}
 // seenJobs28 is a pro-only action and can't be called signed out
 {const r=await req(LOCAL.port,"POST","/api/act",JH,J({name:"seenJobs28",args:[]}));ok(r.status===401,"signed-out seenJobs28 is refused (401)",r.status);
  const h=await act(LOCAL.port,ho.ck,"seenJobs28",[]);ok(h.res.ok===false,"a homeowner can't call seenJobs28",J(h.res))}

 ok(errs.length===0,"no page errors",J(errs.slice(0,5)));
}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL);await stopApp(PUB)}
 console.log(failed?"FAIL v28-e2e: "+failed+" failed":"PASS v28-e2e: all checks passed");process.exit(failed?1:0)})();
