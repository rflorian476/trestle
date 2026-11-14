// v26 end-to-end. Self-contained: starts its own Sawyer server (local test mode) and a public-host simulation (RENDER=1).
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v26-"));
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
// Covers: SW-059 (no general "3 free months" promise; /signup names founding pros), SW-060 (signed-out traveler calls carry
// counts only, no applications or hires; spots meters still right), the /prices quote check (bands, deep link from public
// job pages, nothing sent or put in the URL), health 2.9.0-sawyer and SW cache sawyer-v26.
let LOCAL=null,PUB=null,br=null;
const pre=h=>(h.match(/<div id="pre11">[\s\S]*$/)||[""])[0].replace(/<script[\s\S]*?<\/script>/g,"");
const login=async(port,email)=>{const r=await req(port,"POST","/api/login",JH,J({email,password:"sawyer-demo-2026"}));return {ck:(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0],st:(r.json&&r.json.state)||{}}};
const stateOf=r=>(r.json&&(r.json.state||r.json))||{};
(async()=>{try{
 LOCAL=await startApp(await freePort(),{});
 PUB=await startApp(await freePort(),{RENDER:"true"});
 br=await chromium.launch();
 const errs=[];
 const page=async(w,js,cookie,S)=>{const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900},javaScriptEnabled:js!==false});
  if(cookie){const [k,v]=cookie.split("=");await c.addCookies([{name:k,value:v,url:(S||LOCAL).B}])}
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));
  await p.addInitScript(()=>{window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:"layout-shift",buffered:true})}catch(e){}});return p};
 const hz=(await req(LOCAL.port,"GET","/healthz")).json||{};ok(hz.v==="2.9.0-sawyer","healthz reports 2.9.0-sawyer",J(hz));
 const sw=await req(LOCAL.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v26"/.test(sw.body),"service worker cache is sawyer-v26");

 // ===== 1. SW-059: every 3-month promise names founding pros =====
 {const src=fs.readFileSync(path.join(ROOT,"app-logic.js"),"utf8")+fs.readdirSync(path.join(ROOT,"public/js")).map(f=>fs.readFileSync(path.join(ROOT,"public/js",f),"utf8")).join("\n");
  ok(!/Pros are \$20\/mo after 3 free months/.test(src),"old /signup line ('Pros are $20/mo after 3 free months') is gone from the built app")}
 for(const S of [LOCAL,PUB]){const tag=S===PUB?"public":"local";for(const w of [1440,390]){const p=await page(w,true,null,S);
  await p.goto(S.B+"/signup",{waitUntil:"networkidle"});await p.waitForSelector("#app h1");
  const t=await p.evaluate(()=>document.querySelector("#app").innerText.replace(/\s+/g," "));
  ok(/Customers and PMs are free\. Founding pros get 3 months free, then \$20\/mo\./.test(t)&&!/after 3 free months/.test(t),tag+" "+w+" /signup subtitle names founding pros",(t.match(/Customers and PMs[^.]*\.[^.]*\./)||[""])[0]);
  if(w===1440){const bad=[];for(const u of ["/signup","/pricing","/pros","/faq","/job/j1","/"]){await p.goto(S.B+u,{waitUntil:"networkidle"});await p.waitForSelector("#app h1");
    bad.push(...(await p.evaluate(u=>{const out=[];const re=/\b(3|three) (free )?months( free)?\b/i;const tw=document.createTreeWalker(document.getElementById("app"),NodeFilter.SHOW_TEXT);let n;
     while((n=tw.nextNode())){if(!re.test(n.nodeValue))continue;const el=n.parentElement;const box=el.closest(".card,article,details,.ctaband,li,.v24c,.upr-t,tr,p")||el;
      const wide=el.closest(".card,article,details,.ctaband,.v24c,.upr-t,.planc,.faq,section")||box;if(!/founding/i.test(box.textContent)&&!/founding/i.test(wide.textContent))out.push(u+": "+n.nodeValue.trim().slice(0,80))}return out},u)))}
   ok(bad.length===0,tag+" every visible '3 months free' line sits with founding-pro wording (signup, pricing, pros, FAQ, job page, home)",J(bad))}
  await p.context().close()}}

 // ===== 2. SW-060: signed-out traveler calls carry counts, not applications =====
 const trav=await login(LOCAL.port,"demo-traveler@sawyer.test");const NOTE="v26-private-note-"+Math.random().toString(36).slice(2,9);
 const ap=await req(LOCAL.port,"POST","/api/act",Object.assign({Cookie:trav.ck},JH),J({name:"applyTravel",args:["tcd3",NOTE]}));
 ok(ap.json&&ap.json.res&&ap.json.res.ok,"demo traveler applies to tcd3 with a private note (privacy baseline)",J(ap.json&&ap.json.res));
 for(const S of [LOCAL,PUB]){const tag=S===PUB?"public":"local";const st=stateOf(await req(S.port,"GET","/api/state"));const tc=st.tcalls||[];
  ok(tc.length>=6&&tc.every(c=>Array.isArray(c.apps)&&c.apps.length===0),tag+" signed-out /api/state: every traveler call has apps: []",J(tc.map(c=>[c.id,(c.apps||[]).length])));
  const c1=tc.find(c=>c.id==="tcd1")||{};ok(c1.nhired===1&&c1.napps>=1&&c1.need===12,tag+" signed-out tcd1 keeps the counts (nhired 1, napps, need 12)",J({nhired:c1.nhired,napps:c1.napps,need:c1.need}));
  const raw=J(tc);ok(!raw.includes('"uid":"tv1"')&&!raw.includes(NOTE)&&!/"invites":\["/.test(raw),tag+" signed-out traveler calls name no applicant, hire, note or invite");
  const h=pre((await req(S.port,"GET","/t/tcd1")).body);ok(/<b>11<\/b> of 12 spots open/.test(h),tag+" /t/tcd1 prerender: spots meter still reads 11 of 12 open",(h.match(/<b>\d+<\/b> of \d+ spots open/)||[""])[0])}
 {const st=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:(await login(LOCAL.port,"demo-homeowner@sawyer.test")).ck}));const c1=(st.tcalls||[]).find(c=>c.id==="tcd1")||{};
  ok((c1.apps||[]).length===1&&c1.apps[0].uid==="tv1"&&c1.apps[0].status==="hired"&&!("note" in c1.apps[0]),"signed-in non-owner still sees the hired row on tcd1 (no note)",J(c1.apps))}
 {const st=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:trav.ck}));const c3=(st.tcalls||[]).find(c=>c.id==="tcd3")||{};
  ok((c3.apps||[]).some(a=>a.uid===st.me&&a.note===NOTE),"the applicant still sees their own application and note",J(c3.apps))}
 for(const w of [1440,390]){const p=await page(w);await p.goto(LOCAL.B+"/t/tcd1",{waitUntil:"networkidle"});await p.waitForFunction(()=>!document.getElementById("pre11"));await p.waitForTimeout(400);
  const o=await p.evaluate(()=>({spots:((document.querySelector("#app .t6spots.big")||{}).innerText||"").replace(/\s+/g," "),f:(document.querySelector("#app .t6spots.big i")||{style:{}}).style.getPropertyValue("--f"),h1:document.querySelectorAll("h1").length,cls:window.__cls}));
  ok(/11 of 12 spots open/.test(o.spots)&&o.f==="8%"&&o.h1===1&&o.cls<0.05,w+" /t/tcd1 after mount: 11 of 12 spots open, meter 8% filled, one H1, no shift",J(o));
  await p.goto(LOCAL.B+"/travel",{waitUntil:"networkidle"});await p.waitForTimeout(500);
  const t=await p.evaluate(()=>{const a=document.querySelector('#app a[href*="tcd1"]');const card=a&&a.closest("article.t6card");return card?card.innerText.replace(/\s+/g," "):document.querySelector("#app").innerText.slice(0,400)});
  ok(/11 of 12 spots open/.test(t),w+" /travel board card for tcd1: 11 of 12 spots open signed out",t.slice(0,160));await p.context().close()}

 // ===== 3. quote check on /prices =====
 for(const S of [LOCAL,PUB]){const tag=S===PUB?"public":"local";const r=await req(S.port,"GET","/prices");const h=pre(r.body);
  ok(/id="qc"/.test(h)&&/id="v26qa"/.test(h)&&/Typical for water heaters near Austin, TX<\/small><b>\$[\d,]+ – \$[\d,]+<\/b>/.test(h)&&/Got a quote\? See if it&#39;s fair\.|Got a quote\? See if it's fair\./.test(h),tag+" /prices prerender includes the quote check with the default water-heater range")}
 for(const w of [1440,390]){const p=await page(w);const sent=[];p.on("request",rq=>{sent.push(rq.url()+" "+(rq.postData()||""))});
  await p.goto(LOCAL.B+"/prices",{waitUntil:"networkidle"});await p.waitForFunction(()=>!document.getElementById("pre11"));await p.waitForSelector("#v26qa");await p.waitForTimeout(300);
  const rg=await p.evaluate(()=>v26Range("Water heaters","soon","78704"));
  const chip=async v=>{await p.fill("#v26qa",String(v));await p.waitForTimeout(60);return p.evaluate(()=>({c:(document.querySelector("#v26qO .v26q-c")||{}).textContent||"",o:document.querySelector("#v26qO").innerText.replace(/\s+/g," ")}))};
  const mid=Math.round((rg.low+rg.high)/2),a=await chip(mid),b=await chip(rg.high*3),c=await chip(Math.round(rg.low*0.3)),d=await chip(Math.round(rg.high*1.5));
  ok(a.c==="In typical range"&&b.c==="Well above typical"&&c.c==="Well below typical"&&d.c==="Above typical",w+" quote check bands: in range / well above / well below / above",J([a.c,b.c,c.c,d.c]));
  ok(/Ask before you hire/.test(b.o)&&/Get up to 3 quotes, free/.test(b.o)&&/no lead fees/.test(b.o),w+" result has questions to ask and the free quotes link");
  const k=await chip("98765");ok(/\$98,765/.test(k.o),w+" amount is read with commas/dollars ($98,765)");await p.fill("#v26qa","$1,234");await p.waitForTimeout(60);
  ok(/\$1,234/.test(await p.textContent("#v26qO")),w+" '$1,234' parses");
  await p.selectOption("#v26qj","Electrical");await p.waitForTimeout(60);const e=await p.textContent("#v26qO");ok(/Typical for a typical electrical job near Austin, TX/.test(e)||/Typical for a typical electrical job/.test(e),w+" trade-wide option uses the trade guide",e.slice(0,90));
  await p.selectOption("#v26qj","Water heaters");await p.selectOption("#v26qu","emergency");await p.waitForTimeout(60);const em=await p.evaluate(()=>v26Range("Water heaters","emergency","78704"));
  ok(em.low>rg.low&&/emergency/.test(await p.textContent("#v26qO")),w+" emergency timing raises the range",J({rg,em}));
  const o=await p.evaluate(()=>({ow:document.documentElement.scrollWidth>innerWidth+1,h1:document.querySelectorAll("h1").length,url:location.href,cls:window.__cls,lab:[...document.querySelectorAll("#v26qF select,#v26qF input")].every(x=>x.labels&&x.labels.length)}));
  ok(!o.ow&&o.h1===1&&o.lab&&o.cls<0.1,w+" /prices with the quote check: no overflow, one H1, labeled fields, no big shift",J(o));
  ok(!/98765|1234/.test(o.url)&&!sent.some(s=>/98765|1,?234/.test(s.replace(/^\S+\/js\/\S+/,""))),w+" the typed price is never in the URL or any request",J(sent.filter(s=>/98765|1,?234/.test(s)).slice(0,2)));
  await p.context().close()}
 // deep link from the public job page carries the job's sub-trade, ZIP and urgency, so both ranges match
 for(const w of [1440,390]){const p=await page(w);await p.goto(LOCAL.B+"/job/j1",{waitUntil:"networkidle"});await p.waitForSelector("#app .v25b");
  const jr=await p.evaluate(()=>{const b=[...document.querySelectorAll("#app .v25bi")].find(e=>/Typical for/.test(e.textContent));return b?b.querySelector("b").textContent:""});
  await p.click("#app a:has-text('Check a quote you got')");await p.waitForSelector("#v26qO");await p.waitForTimeout(900);
  const o=await p.evaluate(()=>({url:location.pathname+location.search,job:document.getElementById("v26qj").value,when:document.getElementById("v26qu").value,r:(document.querySelector("#v26qO .v26q-r b")||{}).textContent||"",top:Math.round(document.getElementById("qc").getBoundingClientRect().top)}));
  ok(/^\/prices\?/.test(o.url)&&o.job==="Water heaters"&&o.when==="urgent"&&o.r===jr&&jr,w+" /job/j1 'Check a quote you got' opens the check with water heaters, within 48 hours, same range as the job card",J({o,jr}));
  ok(o.top>=0&&o.top<200,w+" the quote check is scrolled into view on arrival",o.top);await p.context().close()}
 {const h=pre((await req(LOCAL.port,"GET","/job/j2")).body);ok(/href="\/prices\?qc=Ice%20dam%20removal&amp;zip=\d{5}[^"]*"|href="\/prices\?qc=Ice%20dam%20removal&zip=\d{5}[^"]*"/.test(h),"/job/j2 prerender links the quote check for ice dam removal",(h.match(/href="\/prices[^"]*"/)||[""])[0])}
 {const own=await login(LOCAL.port,"demo-homeowner@sawyer.test");const p=await page(1440,true,own.ck);await p.goto(LOCAL.B+"/prices?qc=Water%20heaters");await p.waitForSelector("#v26qa");ok(!!(await p.$("#qc")),"signed-in visitors get the quote check too");await p.context().close()}

 ok(errs.length===0,"no page errors",J(errs.slice(0,5)));
}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL);await stopApp(PUB)}
 console.log(failed?"FAIL v26-e2e: "+failed+" failed":"PASS v26-e2e: all checks passed");process.exit(failed?1:0)})();
