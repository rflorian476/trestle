// v29 end-to-end. Self-contained: starts its own Sawyer server (local test mode) and a public-host simulation (RENDER=1).
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v29-"));
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
// Covers: SW-063 (every quote amount keeps its cents: job-page "You quoted" callout, homeowner "sent a quote" bell, quote list,
// Compare bids price + "Hire for", pipeline card, quote check; whole dollars still read "$275" without ".00"), the compare-table
// footnote spacing on /pros and /pricing, the dated and hedged /pros savings calculator, full and hired jobs dropping out of a
// pro's "new" count with their unread "New job in your area" notices quieted (other pros' notices untouched, nothing leaks),
// health 2.12.0-sawyer and SW cache sawyer-v29.
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
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return p};
 const hz=(await req(LOCAL.port,"GET","/healthz")).json||{};ok(hz.v==="2.12.0-sawyer","healthz reports 2.12.0-sawyer",J(hz));
 const sw=await req(LOCAL.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v29"/.test(sw.body),"service worker cache is sawyer-v29");
 const pro=await login(LOCAL.port,"demo-pro@sawyer.test"),ho=await login(LOCAL.port,"demo-homeowner@sawyer.test");
 ok(pro.ck&&ho.ck,"demo pro and demo homeowner sign in");
 const run=Math.random().toString(36).slice(2,8);
 const signup=async(trade,zip,tag)=>{const r=await req(LOCAL.port,"POST","/api/signup",JH,J({kind:"pro",password:"v29-correct-horse",data:{name:"Vee "+tag,biz:"V29 "+tag+" "+run,email:"v29-"+tag+"-"+run+"@example.com",trade,zip,phone:"5125550100",plan:"founding"}}));
  return {ck:(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0],id:stateOf(r).me,status:r.status}};

 // ===== 1. SW-063: quote amounts keep cents everywhere =====
 const post=async(t,cat,sub,extra)=>{const r=await act(LOCAL.port,ho.ck,"postJob",[Object.assign({title:t,cat,sub,desc:"V29 test job.",zip:"78704",budget:"$200–600",when:"This week"},extra||{})]);return r.res&&r.res.id};
 const JQ=await post("V29 water heater pilot out","Plumbing","Water heaters");ok(!!JQ,"homeowner posts a plumbing job for the cents checks");
 {const r=await act(LOCAL.port,pro.ck,"quote",[JQ,308.51,"From estimate: 2 × labor + part + 8.25% tax = $308.51."]);ok(r.res.ok,"demo pro quotes $308.51",J(r.res))}
 const other=await signup("Plumbing","78704","plumb2");ok(other.ck,"a second plumbing pro signs up");
 {const r=await act(LOCAL.port,other.ck,"quote",[JQ,275,"Flat price."]);ok(r.res.ok,"second pro quotes a whole-dollar $275",J(r.res))}
 {const st=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:ho.ck}));const ns=(st.notifs||[]).filter(n=>n.link==="job:"+JQ&&/sent a quote/.test(n.text)).map(n=>n.text);
  ok(ns.some(t=>/sent a quote: \$308\.51$/.test(t))&&!ns.some(t=>/\$309\b/.test(t)),"homeowner bell: 'sent a quote: $308.51' (not $309)",J(ns));
  ok(ns.some(t=>/sent a quote: \$275$/.test(t)),"homeowner bell: whole dollars read '$275' (no .00)",J(ns))}
 for(const w of [1440,390]){const p=await page(w,true,pro.ck);await p.goto(LOCAL.B+"/job/"+JQ,{waitUntil:"networkidle"});
  const t=await p.evaluate(()=>{const c=[...document.querySelectorAll("#app .callout")].find(x=>/You quoted/.test(x.textContent));return c?c.textContent.replace(/\s+/g," "):""});
  ok(/You quoted \$308\.51\./.test(t)&&!/\$309\b/.test(t),w+" job page: pro's callout reads 'You quoted $308.51'",t);
  const q=await p.$$eval("#app .qprice",a=>a.map(x=>x.textContent));ok(q.length===1&&q[0]==="$308.51",w+" job page: the pro's own quote row shows $308.51",J(q));
  await p.goto(LOCAL.B+"/jobs",{waitUntil:"networkidle"});const card=await p.evaluate(j=>{const a=document.querySelector('#app a.jobcard[href$="/job/'+j+'"]');return a&&a.closest(".v27jc")?a.closest(".v27jc").innerText.replace(/\s+/g," "):""},JQ);
  ok(/You quoted \$308\.51/.test(card),w+" pipeline card reads 'You quoted $308.51'",card.slice(0,200));await p.context().close()}
 for(const w of [1440,390]){const p=await page(w,true,ho.ck);await p.goto(LOCAL.B+"/job/"+JQ,{waitUntil:"networkidle"});
  const q=await p.$$eval("#app .qprice",a=>a.map(x=>x.textContent));ok(q.includes("$308.51")&&q.includes("$275")&&!q.some(x=>/\.00$|\$309$/.test(x)),w+" homeowner job page: quote list shows $308.51 and $275",J(q));
  const ch=await p.evaluate(()=>href("compare",location.pathname.split("/").pop()));await p.goto(LOCAL.B+ch,{waitUntil:"networkidle"});
  const c=await p.evaluate(()=>({pr:[...document.querySelectorAll("#app .cmp-price")].map(x=>x.textContent),hb:[...document.querySelectorAll("#app [data-chire]")].map(x=>x.textContent.trim())}));
  ok(c.pr.includes("$308.51")&&c.pr.includes("$275"),w+" Compare bids: prices $308.51 and $275",J(c.pr));ok(c.hb.some(x=>/Hire for \$308\.51$/.test(x))&&c.hb.some(x=>/Hire for \$275$/.test(x)),w+" Compare bids: 'Hire for $308.51' and 'Hire for $275'",J(c.hb));
  const qc=await p.evaluate(()=>typeof v26Out==="function"?v26Out("Plumbing","soon","308.51","78704").replace(/<[^>]+>/g," ").replace(/\s+/g," "):"");ok(/Your quote: \$308\.51\s*\./.test(qc),"quote check keeps typed cents ($308.51)",qc.slice(0,200));
  const qd=await p.evaluate(()=>v26Out("Plumbing","soon","$1,450","78704").replace(/<[^>]+>/g," ").replace(/\s+/g," "));ok(/Your quote: \$1,450\s*\./.test(qd),"quote check: whole dollars read $1,450",qd.slice(0,200));
  await p.context().close()}
 {const p=await page(1440);await p.goto(LOCAL.B+"/",{waitUntil:"networkidle"});const o=await p.evaluate(()=>[v28$(308.51),v28$(309),v28$(0.99),v28$(9850.74),v28$(1450)]);ok(J(o)===J(["$308.51","$309","$0.99","$9,850.74","$1,450"]),"v28$ formats cents and whole dollars",J(o));await p.context().close()}

 // ===== 2. Compare-table footnote spacing =====
 for(const u of ["/pros","/pricing"])for(const w of [1440,390]){const p=await page(w);await p.goto(LOCAL.B+u,{waitUntil:"networkidle"});await p.waitForFunction(()=>!document.getElementById("pre11"));
  const o=await p.evaluate(()=>{const t=document.querySelector("table.compare"),n=t&&t.parentElement.querySelector(".v28cmp-n");if(!n)return null;const cs=getComputedStyle(n),z=document.createElement("span");z.style.color="var(--muted)";n.parentElement.appendChild(z);const mu=getComputedStyle(z).color;z.remove();return{mu,gap:Math.round(n.getBoundingClientRect().top-t.getBoundingClientRect().bottom),fs:parseFloat(cs.fontSize),c:cs.color,vis:n.offsetHeight>0,ow:document.documentElement.scrollWidth>innerWidth+1}});
  ok(o&&o.gap>=8&&o.gap<=18&&o.fs<=14&&o.c===o.mu&&o.vis&&!o.ow,w+" "+u+" footnote sits 8-18px under the table, small muted text, no overflow",J(o));await p.context().close()}

 // ===== 3. /pros savings calculator: dated and hedged =====
 for(const S of [LOCAL,PUB]){const h=pre((await req(S.port,"GET","/pros")).body);const n=(h.match(/<p class="[^"]*v29calc-n[^"]*"[^>]*>([\s\S]*?)<\/p>/)||[])[1]||"";
  ok(/example/i.test(n)&&/checked November 2026/.test(n)&&/vary/.test(n)&&/8 leads/.test(n)&&/\$45/.test(n),(S===PUB?"public":"local")+" /pros prerender: calculator note dates and hedges the 8 × $45 example",n)}
 for(const u of ["/pros","/pricing"])for(const w of [1440,390]){const p=await page(w);await p.goto(LOCAL.B+u,{waitUntil:"networkidle"});await p.waitForFunction(()=>!document.getElementById("pre11"));
  const o=await p.evaluate(()=>{const n=document.getElementById("v29calcN"),c=document.getElementById("calcOut");return{n:n&&n.offsetHeight>0?n.innerText:"",c:c?c.innerText.replace(/\s+/g," "):""}});
  ok(/checked November 2026/.test(o.n)&&/Pay-per-lead, at these numbers \$4,320\/yr/.test(o.c)&&/\$180\/yr/.test(o.c)&&!/Pay-per-lead sites/.test(o.c),w+" "+u+" calculator: dated note visible, result labeled 'at these numbers'",J(o));
  await p.$eval("#cl",e=>{e.value=10;e.dispatchEvent(new Event("input",{bubbles:true}))});const c2=await p.$eval("#calcOut",e=>e.innerText.replace(/\s+/g," "));
  ok(/Pay-per-lead, at these numbers \$5,400\/yr/.test(c2)&&/\$5,220/.test(c2),w+" "+u+" calculator still recalculates with the hedged label (10 × $45)",c2);await p.context().close()}

 // ===== 4. full and hired jobs leave the "new" count; their unread notices are quieted =====
 const near=await signup("HVAC","78704","near");const fillers=[];for(const t of ["f1","f2","f3"])fillers.push(await signup("HVAC","78704",t));
 ok(near.ck&&fillers.every(f=>f.ck),"an HVAC pro plus three more HVAC pros in Austin sign up");
 const dashNew=async(w,ck)=>{const p=await page(w,true,ck);await p.goto(LOCAL.B+"/dash",{waitUntil:"networkidle"});await p.waitForSelector("#v28new");await p.waitForTimeout(900);
  const o=await p.evaluate(()=>({t:document.getElementById("v28new").innerText.replace(/\s+/g," "),cards:[...document.querySelectorAll(".v27jc.v28isnew")].map(c=>(c.querySelector("a.jobcard")||{}).getAttribute("href")),ow:document.documentElement.scrollWidth>innerWidth+1}));await p.context().close();return o};
 {const o=await dashNew(1440,near.ck);ok(/Nothing new/.test(o.t),"first dashboard visit: nothing new",J(o))}
 await sleep(300);
 const JO=await post("V29 furnace clicking, open","HVAC","Furnace repair"),JF=await post("V29 AC not cooling, will fill","HVAC","AC repair"),JH2=await post("V29 thermostat swap, will hire","HVAC","Thermostat install");
 ok(JO&&JF&&JH2,"homeowner posts three HVAC jobs");
 const nOf=async(ck,jid)=>(stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:ck})).notifs||[]).filter(n=>n.link==="job:"+jid&&/^New job in your area/.test(n.text));
 {const a=await nOf(near.ck,JO),b=await nOf(near.ck,JF),c=await nOf(near.ck,JH2);ok(a.length===1&&b.length===1&&c.length===1&&[a,b,c].every(x=>x[0].read===false),"the pro gets three unread 'New job in your area' notices",J([a,b,c]))}
 for(const f of fillers){const r=await act(LOCAL.port,f.ck,"quote",[JF,400+fillers.indexOf(f)*10,"V29 filler quote"]);ok(r.res.ok,"filler pro quotes the job that fills up",J(r.res))}
 {const st=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:ho.ck}));ok((st.quotes||[]).filter(q=>q.job===JF).length===3,"that job now has 3 of 3 pros")}
 {const b=await nOf(near.ck,JF);ok(b.length===1&&b[0].read===true&&/· now full \(3 of 3 pros\)$/.test(b[0].text),"the pro's notice for the full job is marked read and says 'now full (3 of 3 pros)'",J(b));
  const a=await nOf(near.ck,JO);ok(a.length===1&&a[0].read===false&&a[0].text==="New job in your area: V29 furnace clicking, open","the notice for the still-open job is untouched",J(a))}
 for(const f of fillers){const n=await nOf(f.ck,JF);ok(n.length===1&&!/now full|filled/.test(n[0].text),"a pro who quoted the full job keeps an unchanged notice",J(n))}
 // a 4th pro can't make it "un-full"; refused quotes don't touch notices
 {const r=await act(LOCAL.port,near.ck,"quote",[JF,390,"late"]);ok(r.res.ok===false,"a pro can't quote a job that already has 3 pros",J(r.res))}
 // hire on the third job: the non-hired pro's unread notice is quieted
 {const r=await act(LOCAL.port,fillers[0].ck,"quote",[JH2,180,"V29 thermostat"]);ok(r.res.ok,"a filler pro quotes the thermostat job");
  const h=await act(LOCAL.port,ho.ck,"hire",[JH2,fillers[0].id]);ok(h.res.ok,"homeowner hires that pro",J(h.res));
  const c=await nOf(near.ck,JH2);ok(c.length===1&&c[0].read===true&&/· filled, the customer hired a pro$/.test(c[0].text),"the pro's notice for the hired job is marked read and says 'filled'",J(c))}
 for(const w of [1440,390]){const o=await dashNew(w,near.ck);
  if(w===1440)ok(/1 new since your last visit/.test(o.t)&&o.cards.length===1&&o.cards[0].endsWith("/job/"+JO)&&!o.ow,"dashboard: only the open job counts as new (full and hired jobs don't)",J(o));
  else ok(/Nothing new since your last visit/.test(o.t)&&!o.ow,"390 next visit: count resets, no overflow",J(o))}
 {const s=stateOf(await req(LOCAL.port,"GET","/api/state",{Cookie:near.ck}));const unread=(s.notifs||[]).filter(n=>!n.read&&/^New job in your area/.test(n.text)).map(n=>n.link);ok(unread.length===1&&unread[0]==="job:"+JO,"the pro's unread new-job notices are only for work they can still quote",J(unread))}
 // privacy: notices (and the new suffix) stay with that pro
 for(const [lab,ck] of [["signed-out",null],["a filler pro",fillers[1].ck],["the homeowner",ho.ck]]){const s=stateOf(await req(LOCAL.port,"GET","/api/state",ck?{Cookie:ck}:{}));
  ok(!(s.notifs||[]).some(n=>n.to===near.id||(n.to!==s.me&&/now full|filled, the customer/.test(n.text))),lab+" /api/state: none of the other pro's quieted notices",J((s.notifs||[]).filter(n=>n.to!==s.me&&/now full|filled/.test(n.text))))}
 for(const u of ["/jobs","/job/"+JF,"/"]){const r=await req(LOCAL.port,"GET",u);ok(!/now full \(3 of 3|filled, the customer hired|jobsSeen28/.test(r.body),"signed-out "+u+" HTML has no notice data")}

 ok(errs.length===0,"no page errors",J(errs.slice(0,5)));
}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL);await stopApp(PUB)}
 console.log(failed?"FAIL v29-e2e: "+failed+" failed":"PASS v29-e2e: all checks passed");process.exit(failed?1:0)})();
