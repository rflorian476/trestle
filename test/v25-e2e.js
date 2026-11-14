// v25 end-to-end. Self-contained: starts its own Sawyer server (local test mode) and a public-host simulation (RENDER=1).
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v25-"));
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
// Covers: SW-058 (pro pitch on public job pages promises 3 free months to founding pros only), the posted budget next to a
// sub-trade price guide on public job pages, the signed-out /t/<id> traveler-call prerender (public call facts only, one
// H1, clean hydration), measured median reply time on /find cards, health 2.8.0-sawyer and SW cache sawyer-v25.
let LOCAL=null,PUB=null,br=null;
const tt=h=>((h.match(/<title>([^<]*)<\/title>/)||[])[1]||"").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,"<").replace(/&gt;/g,">");
const pre=h=>(h.match(/<div id="pre11">[\s\S]*$/)||[""])[0].replace(/<script[\s\S]*?<\/script>/g,"");
const login=async(port,email)=>{const r=await req(port,"POST","/api/login",JH,J({email,password:"sawyer-demo-2026"}));return {ck:(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0],st:(r.json&&r.json.state)||{}}};
(async()=>{try{
 LOCAL=await startApp(await freePort(),{});
 PUB=await startApp(await freePort(),{RENDER:"true"});
 br=await chromium.launch();
 const errs=[];
 const page=async(w,js,cookie)=>{const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900},javaScriptEnabled:js!==false});
  if(cookie){const [k,v]=cookie.split("=");await c.addCookies([{name:k,value:v,url:LOCAL.B}])}
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p.addInitScript(()=>{window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:"layout-shift",buffered:true})}catch(e){}});return p};
 const hz=(await req(LOCAL.port,"GET","/healthz")).json||{};ok(/^2\.\d+\.\d+-sawyer$/.test(hz.v),"healthz reports a Sawyer version",J(hz));
 const sw=await req(LOCAL.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v\d+"/.test(sw.body),"service worker cache is versioned");

 // ===== 1. SW-058: founding-pro wording on the public job pitch =====
 for(const S of [LOCAL,PUB]){const tag=S===PUB?"public":"local";for(const id of ["j1","j2"]){const h=pre((await req(S.port,"GET","/job/"+id)).body);
  ok(/No lead fees\. One flat \$20\/mo\. Founding pros get their first 3 months free\./.test(h)&&!/and the first 3 months are free/.test(h),tag+" /job/"+id+": pro pitch says founding pros get 3 months free",(h.match(/No lead fees[^<]*/)||[""])[0])}}

 // ===== 2. posted budget next to the sub-trade guide =====
 const money=s=>Number(String(s).replace(/[^\d]/g,""));
 for(const S of [LOCAL,PUB]){const tag=S===PUB?"public":"local";
  {const h=pre((await req(S.port,"GET","/job/j1")).body);const g=h.match(/Typical for water heaters near Austin, TX<\/small><b>\$([\d,]+) – \$([\d,]+)<\/b>/);
   ok(/<small>Posted budget<\/small><b>\$1,000–1,800<\/b>/.test(h),tag+" /job/j1: posted budget shown in the homeowner card");
   ok(!!g&&money(g[1])<=1800&&money(g[2])>=1000&&money(g[2])-money(g[1])<=1600,tag+" /job/j1: guide is the water-heater range and overlaps the budget",g&&g[0]);
   ok(/The posted budget is within the usual range\. A guide, not a quote\./.test(h),tag+" /job/j1: plain note on where the budget sits")}
  {const h=pre((await req(S.port,"GET","/job/j2")).body);ok(/<small>Posted budget<\/small><b>Around \$500<\/b>/.test(h)&&/Typical for ice dam removal near Columbus, OH<\/small><b>\$[\d,]+ – \$[\d,]+<\/b>/.test(h),tag+" /job/j2: budget + ice-dam guide",(h.match(/Typical for[^<]*/)||[""])[0])}
  {const h=pre((await req(S.port,"GET","/job/j3")).body);ok(/Typical for EV charger install near Phoenix, AZ/.test(h),tag+" /job/j3: acronyms keep their case (EV)",(h.match(/Typical for[^<]*/)||[""])[0])}
  {const h=pre((await req(S.port,"GET","/job/j6")).body);ok(!/Posted budget/.test(h)&&/Typical for furnace repair near Austin, TX/.test(h),tag+" /job/j6 (TBD budget): guide only, no budget row")}
  {const h=pre((await req(S.port,"GET","/job/j5")).body);ok(!/Posted budget/.test(h),tag+" /job/j5 ($150 per turn): a per-unit budget isn't compared")}}
 for(const w of [1440,390]){const p=await page(w);await p.goto(LOCAL.B+"/job/j1");await p.waitForSelector("#app .v25b");await p.waitForTimeout(600);
  const o=await p.evaluate(()=>({pre:!!document.getElementById("pre11"),h1:document.querySelectorAll("h1").length,ow:document.documentElement.scrollWidth>innerWidth+1,rows:[...document.querySelectorAll("#app .v25bi")].map(e=>{const b=e.querySelector("b");return {t:e.innerText.replace(/\s+/g," "),fit:b.scrollWidth<=b.clientWidth+1,one:b.getBoundingClientRect().height<40}}),cls:window.__cls}));
  ok(!o.pre&&o.h1===1&&!o.ow&&o.rows.length===2&&o.rows.every(r=>r.fit&&r.one),w+" /job/j1: budget and guide rows fit on one line each after mount",J(o));
  ok(o.cls<0.05,w+" /job/j1: no layout shift on hydration",o.cls);
  const u=await p.evaluate(()=>({a:v25Budget("$1,000–1,800"),b:v25Budget("Around $500"),c:v25Budget("TBD"),d:v25Budget("$150 per turn"),e:v25Budget("$2k–3k"),f:v25Guide({cat:"Plumbing",sub:"Not a real sub-trade",zip:"78704"}),g:v25Guide({cat:"Plumbing",sub:"Water heaters",zip:"78704"})}));
  ok(J(u.a)==="[1000,1800]"&&J(u.b)==="[500,500]"&&u.c===null&&u.d===null&&J(u.e)==="[2000,3000]",w+" budget parsing (range, around, TBD, per-unit, k)",J(u));
  ok(u.f&&u.f.sub===null&&u.f.low>0&&u.g&&u.g.sub==="Water heaters",w+" unknown sub-trade falls back to the trade-wide guide",J(u));await p.context().close()}
 {const own=await login(LOCAL.port,"demo-homeowner@sawyer.test");const p=await page(1440,true,own.ck);await p.goto(LOCAL.B+"/job/j1");await p.waitForSelector("#app h1");await p.waitForTimeout(500);ok(!(await p.$("#app .v25b")),"the job owner still sees their own tools, not the public card");await p.context().close()}

 // ===== 3. /t/<id> traveler-call prerender =====
 const trav=await login(LOCAL.port,"demo-traveler@sawyer.test");const NOTE="v25-private-note-"+Math.random().toString(36).slice(2,9);
 const ap=await req(LOCAL.port,"POST","/api/act",Object.assign({Cookie:trav.ck},JH),J({name:"applyTravel",args:["tcd3",NOTE]}));
 const tname=String(((trav.st.users||[]).find(u=>u.id===trav.st.me)||{}).name||"Marcus Delgado");
 ok(ap.json&&ap.json.res&&ap.json.res.ok,"demo traveler applies to tcd3 with a private note (privacy baseline)",J(ap.json&&ap.json.res));
 for(const S of [LOCAL,PUB]){const tag=S===PUB?"public":"local";for(const id of ["tcd1","tcd2","tcd3","tcd4","tcd5","tcd6"]){const r=await req(S.port,"GET","/t/"+id);const h=pre(r.body);
   ok(r.status===200&&/^<div id="pre11">/.test(h)&&(h.match(/<h1[\s>]/g)||[]).length===1&&!/<link rel="preload" href="\/js\//.test(r.body)&&/<header class="top[^"]*"[^>]*>[\s\S]*?class="brand"/.test(r.body),tag+" /t/"+id+": prerendered (one H1, header, no JS preloads)");
   ok(!/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(h)&&!/\(\d{3}\)\s?\d{3}-\d{4}/.test(h),tag+" /t/"+id+": no emails or phone numbers in the prerender")}
  const h3=pre((await req(S.port,"GET","/t/tcd3")).body);ok(S===PUB||(!h3.includes(NOTE)&&!h3.includes(tname)),tag+" /t/tcd3: a pending application (note, applicant name) is not in the public HTML")}
 {const r=await req(LOCAL.port,"GET","/t/tcd1",{Cookie:trav.ck});ok(!/<div id="pre11">/.test(r.body),"signed-in /t/tcd1 is not prerendered")}
 {const r=await req(LOCAL.port,"GET","/compare/j1");ok(!/<div id="pre11">/.test(r.body),"/compare/j1 is still never prerendered")}
 for(const w of [1440,390]){
  {const p=await page(w,false);await p.goto(LOCAL.B+"/t/tcd1");const o=await p.evaluate(()=>({h1:[...document.querySelectorAll("h1")].map(e=>e.textContent),t:document.querySelector("main").innerText}));
   ok(o.h1.length===1&&/\(demo\)/.test(o.h1[0])&&/\$46\/hr/.test(o.t)&&/Ashburn, VA/.test(o.t),w+" /t/tcd1 paints the call (rate, place) with JS off",J(o.h1));await p.context().close()}
  {const p=await page(w);const first=tt((await req(LOCAL.port,"GET","/t/tcd1")).body);await p.goto(LOCAL.B+"/t/tcd1",{waitUntil:"networkidle"});await p.waitForFunction(()=>!document.getElementById("pre11"));await p.waitForTimeout(600);
   const o=await p.evaluate(()=>({h1:document.querySelectorAll("h1").length,ow:document.documentElement.scrollWidth>innerWidth+1,title:document.title,cls:window.__cls,broken:[...document.querySelectorAll("img")].filter(i=>i.complete&&!i.naturalWidth).length}));
   ok(o.h1===1&&!o.ow&&o.title===first&&o.broken===0,w+" /t/tcd1 hydrates cleanly (one H1, same title, no overflow, no broken images)",J(o));ok(o.cls<0.05,w+" /t/tcd1: no layout shift on hydration",o.cls);await p.context().close()}}

 // ===== 4. measured median reply on /find cards =====
 const st=(await req(LOCAL.port,"GET","/api/state")).json;const S0=(st&&st.state)||st||{};const rs=new Map((S0.users||[]).map(u=>[u.id,u.rs]));
 const mins=ms=>{const m=Math.round(ms/6e4);return m<1?"under 1 min":m<60?m+" min":m<60*24?(Math.round(m/6)/10)+" hr":Math.round(m/1440)+" days"};
 {const h=pre((await req(LOCAL.port,"GET","/find")).body);const cards=[...h.matchAll(/<article class="pcard[\s\S]*?<\/article>/g)].map(m=>m[0]);let good=0,bad=[];
  for(const c of cards){const id=(c.match(/href="\/pro\/([\w-]+)"/)||[])[1];const r=rs.get(id);const want=r&&r.n>=2&&r.med!=null?"Replies in "+mins(r.med):null;const got=(c.match(/<p class="v25rs">[\s\S]*?<span>([^<]*)<\/span>/)||[])[1]||null;if(got===want)good++;else bad.push({id,want,got})}
  ok(cards.length>=6&&bad.length===0&&cards.some(c=>/class="v25rs"/.test(c))&&cards.some(c=>!/class="v25rs"/.test(c)),"/find prerender: reply time only on pros with 2+ measured replies, and it's the median",J({n:cards.length,bad:bad.slice(0,3)}));
  ok(/href="\/pro\/c1"[\s\S]*?Replies in 22 min/.test(cards.find(c=>/href="\/pro\/c1"/.test(c))||""),"/find: Bluebonnet (c1) card reads 'Replies in 22 min'")}
 for(const w of [1440,390]){const p=await page(w);await p.goto(LOCAL.B+"/find",{waitUntil:"networkidle"});await p.waitForFunction(()=>!document.getElementById("pre11"));await p.waitForTimeout(600);
  const o=await p.evaluate(()=>({n:document.querySelectorAll("#app .v25rs").length,c1:((document.querySelector('#app a[href="/pro/c1"]')||{}).closest?.("article")?.querySelector(".v25rs")?.innerText||"").replace(/\s+/g," "),ow:document.documentElement.scrollWidth>innerWidth+1,cls:window.__cls}));
  ok(o.n>=3&&/Replies in 22 min/.test(o.c1)&&!o.ow,w+" /find after mount: reply times on the cards, c1 = 22 min",J(o));ok(o.cls<0.1,w+" /find: no big layout shift",o.cls);
  await p.goto(LOCAL.B+"/p/c1");await p.waitForSelector("#app .px-stats");await p.waitForTimeout(300);const med=await p.evaluate(()=>{const d=[...document.querySelectorAll("#app .px-stats>div")].find(x=>(x.querySelector("small")||{}).textContent==="median reply");return d?d.querySelector("b").textContent:""});
  ok(/Replies in 22 min/.test(o.c1)&&med==="22 min",w+" card and profile show the same measured median",J({card:o.c1,med}));await p.context().close()}

 ok(errs.length===0,"no page errors",J(errs.slice(0,5)));
}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL);await stopApp(PUB)}
 console.log(failed?"FAIL v25-e2e: "+failed+" failed":"PASS v25-e2e: all checks passed");process.exit(failed?1:0)})();
