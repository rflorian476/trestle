// v35 end-to-end. Self-contained: starts its own Sawyer server (local test mode). Covers health 2.18.0-sawyer / SW cache
// sawyer-v35, the price book, Who owes you (aging + statements), lead filters, Check your check (traveler hours vs pay),
// SW-076 (the floating .num badge in the invoice editor) and privacy of the new per-user data. Usage: node test/v35-e2e.js [shots dir]
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib"),crypto=require("crypto");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra,keepDir){
 const dir=keepDir||fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v35-"));
 const env=Object.assign({},process.env,{HOST:"127.0.0.1",PORT:String(port),DATA_DIR:dir,RATE_X:"50"});
 for(const k of ["NODE_ENV","RENDER","AUTH_TEST_MODE","STAFF_DEMO_PASSWORD","RESEND_API_KEY","SENDGRID_API_KEY","EMAIL_FROM","MAIL_FROM","RESEND_API_URL","TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN","TWILIO_FROM","TWILIO_MESSAGING_SERVICE_SID","TEST_NOW","SAWYER_BASE_URL","PUBLIC_URL","GOOGLE_CLIENT_ID","GOOGLE_CLIENT_SECRET","APPLE_CLIENT_ID","MICROSOFT_CLIENT_ID","FACEBOOK_APP_ID","VAPID_PRIVATE_KEY","VAPID_PUBLIC_KEY","VAPID_SUBJECT","PUSH_DEBUG","PUSH_TEST_ORIGIN","PUSH_RETRY_MS","SAWYER_PERSISTENT"])if(!extra||!(k in extra))delete env[k];
 if(extra)Object.assign(env,extra);
 const child=spawn(process.execPath,[path.join(ROOT,"server.js")],{env,stdio:["ignore","pipe","pipe"]});
 let log="";child.stdout.on("data",d=>{log+=d});child.stderr.on("data",d=>{log+=d});
 return new Promise((res,no)=>{const t=setTimeout(()=>no(new Error("server did not start\n"+log.slice(-400))),15000);
  const wait=()=>{if(/live on/.test(log)){clearTimeout(t);res({child,dir,log:()=>log,port,B:"http://127.0.0.1:"+port})}else setTimeout(wait,30)};
  child.on("exit",c=>{clearTimeout(t);no(new Error("server exited "+c+"\n"+log.slice(-400)))});wait()})}
function stopApp(s,keep){return new Promise(res=>{if(!s)return res();const done=()=>{if(!keep)try{fs.rmSync(s.dir,{recursive:true,force:true})}catch(e){}res()};s.child.on("exit",done);s.child.kill("SIGTERM");setTimeout(()=>{try{s.child.kill("SIGKILL")}catch(e){}},3000)})}
function req(port,method,p,headers,body){return new Promise((res,no)=>{const r=http.request({hostname:"127.0.0.1",port,path:p,method,headers:headers||{}},rs=>{const ch=[];rs.on("data",c=>ch.push(c));rs.on("end",()=>{let buf=Buffer.concat(ch);const enc=rs.headers["content-encoding"];if(enc==="gzip")buf=zlib.gunzipSync(buf);else if(enc==="br")buf=zlib.brotliDecompressSync(buf);let json=null;try{json=JSON.parse(buf.toString("utf8"))}catch(e){}res({status:rs.statusCode,headers:rs.headers,body:buf.toString("utf8"),json,raw:buf})})});r.on("error",no);if(body)r.write(body);r.end()})}
const J=o=>JSON.stringify(o),JH={"Content-Type":"application/json"};
const stateOf=r=>(r.json&&(r.json.state||r.json))||{};
const login=async(port,email,pw)=>{const r=await req(port,"POST","/api/login",JH,J({email,password:pw||"sawyer-demo-2026"}));return {ck:(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0],st:(r.json&&r.json.state)||{}}};
const act=async(port,ck,name,args)=>{const r=await req(port,"POST","/api/act",Object.assign({Cookie:ck},JH),J({name,args}));return {res:(r.json&&r.json.res)||{},st:stateOf(r),status:r.status}};
const post=(port,ck,p,o)=>req(port,"POST",p,Object.assign(ck?{Cookie:ck}:{},JH),J(o||{}));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const sigCk=r=>(String(r.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0];
let LOCAL=null,br=null;
const DN=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const iso=d=>d.toISOString().slice(0,10);
const addD=(s,n)=>{const d=new Date(s+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);return iso(d)};
const monOf=s=>{const d=new Date(s+"T12:00:00Z");d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return iso(d)};
(async()=>{try{
 LOCAL=await startApp(await freePort());const P=()=>LOCAL.port;
 const hz=(await req(P(),"GET","/healthz")).json||{};ok(hz.v==="2.18.0-sawyer","healthz reports 2.18.0-sawyer",J(hz));
 {const sw=await req(P(),"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v35"/.test(sw.body),"service worker cache is sawyer-v35 (client assets changed)")}
 const run=Math.random().toString(36).slice(2,8);
 const signupPro=async(tag,trade,zip)=>{const r=await req(P(),"POST","/api/signup",JH,J({kind:"pro",password:"v35-correct-horse",data:{name:"Vee "+tag,biz:"V35 "+tag+" "+run,email:"v35-"+tag+"-"+run+"@example.com",trade:trade||"Plumbing",zip:zip||"78704",phone:"5125550100",plan:"founding"}}));return{ck:sigCk(r),id:stateOf(r).me}};
 const signupHo=async(tag)=>{const r=await req(P(),"POST","/api/signup",JH,J({kind:"customer",password:"v35-correct-horse",data:{name:"Hana "+tag,email:"v35-ho-"+tag+"-"+run+"@example.com",zip:"78704"}}));return{ck:sigCk(r),id:stateOf(r).me}};
 const pub=async()=>stateOf(await req(P(),"GET","/api/state"));
 const stateFor=async ck=>stateOf(await req(P(),"GET","/api/state",{Cookie:ck}));
 const meOf=st=>(st.users||[]).find(u=>u.id===st.me)||{};
 const PRIV=["pb35","lf35","tlog35"];const leaks=st=>(st.users||[]).filter(u=>u.id!==st.me&&PRIV.some(k=>u[k]!==undefined)).map(u=>u.id);

 // ===== 1. Price book =====
 const pro=await signupPro("pb");ok(pro.ck&&pro.id,"a throwaway pro signs up");
 {let r=await act(P(),pro.ck,"pbSave35",[{d:"",r:10}]);ok(r.res.ok===false&&/Name the item/.test(r.res.msg),"price book: an item needs a name",J(r.res));
  r=await act(P(),pro.ck,"pbSave35",[{d:"x".repeat(121),r:10}]);ok(r.res.ok===false&&/120/.test(r.res.msg),"price book: names over 120 characters are refused",J(r.res));
  for(const bad of ["-5","abc","1000001"]){r=await act(P(),pro.ck,"pbSave35",[{d:"Thing",r:bad}]);ok(r.res.ok===false&&/price from \$0/.test(r.res.msg),"price book: price "+bad+" is refused",J(r.res))}
  r=await act(P(),pro.ck,"pbSave35",[{d:"Labor | rate\nnew",r:"$95.50",unit:"hour",cat:"Labor"}]);const lab=r.res.id;ok(r.res.ok&&lab,"price book: add Labor at $95.50/hour",J(r.res));
  let me=meOf(r.st);let it=(me.pb35||[]).find(x=>x.id===lab);ok(it&&it.d==="Labor rate new"&&it.r===95.5&&it.unit==="hour"&&it.cat==="Labor","the item is stored cleaned (no | or newlines), with cents, unit and category",J(it));
  r=await act(P(),pro.ck,"pbSave35",[{d:"Expansion tank",r:145,unit:"bogus",cat:"bogus"}]);const tank=r.res.id;me=meOf(r.st);it=(me.pb35||[]).find(x=>x.id===tank);ok(it&&it.unit==="each"&&it.cat==="Materials","unknown unit/category fall back to each / a guessed category",J(it));
  r=await act(P(),pro.ck,"pbSave35",[{d:"expansion TANK",r:150}]);me=meOf(r.st);ok(r.res.ok&&r.res.id===tank&&(me.pb35||[]).length===2&&me.pb35.find(x=>x.id===tank).r===150,"adding the same name again updates that item (no duplicate)",J(r.res));
  r=await act(P(),pro.ck,"pbSave35",[{id:lab,d:"Expansion tank",r:1}]);ok(r.res.ok===false&&/already have/.test(r.res.msg),"renaming an item onto another item's name is refused",J(r.res));
  r=await act(P(),pro.ck,"pbSave35",[{d:"=HYPERLINK(\"http://x\")",r:1}]);const evil=r.res.id;ok(r.res.ok,"a formula-looking item name can be saved (as text)");
  // usage: a saved bill counts toward "most used"
  const cu=await act(P(),pro.ck,"saveCust",[{name:"Rita Cole",email:"rita-"+run+"@example.com"}]);const cid=cu.res.id||((cu.st.bcust||[]).find(c=>c.name==="Rita Cole")||{}).id;ok(!!cid,"Office customer for the bill",J(cu.res));
  r=await act(P(),pro.ck,"saveBill",[{type:"inv",cust:cid,title:"Tank swap",lines:[{d:"Expansion tank",q:1,r:150},{d:"Haul away old unit",q:1,r:40},{d:"Thermal expansion valve",q:2,r:62.5}],tax:0}]);ok(r.res.ok,"saveBill with a price-book line",J(r.res));
  me=meOf(r.st);ok((me.pb35.find(x=>x.id===tank)||{}).n===1&&(me.pb35.find(x=>x.id===lab)||{}).n===0,"the used item's count goes up, others don't",J(me.pb35));
  r=await act(P(),pro.ck,"pbImport35",[]);me=meOf(r.st);ok(r.res.ok&&r.res.n===2&&me.pb35.some(x=>x.d==="Haul away old unit"&&x.r===40&&x.cat==="Fees")&&me.pb35.some(x=>x.d==="Thermal expansion valve"&&x.r===62.5),"Add from your past invoices adds the 2 new priced lines with their price and a category",J(r.res)+" "+J(me.pb35));
  r=await act(P(),pro.ck,"pbImport35",[]);ok(r.res.ok===false&&/Nothing new/.test(r.res.msg),"a second import has nothing new",J(r.res));
  r=await act(P(),pro.ck,"pbDel35",[lab]);me=meOf(r.st);ok(r.res.ok&&!me.pb35.some(x=>x.id===lab),"remove an item");
  r=await act(P(),pro.ck,"pbDel35",["nope"]);ok(r.res.ok===false,"removing an unknown item is refused");
  const ho0=await signupHo("pb");r=await act(P(),ho0.ck,"pbSave35",[{d:"Hack",r:1}]);ok(r.res.ok===false&&/pro accounts/.test(r.res.msg),"a homeowner can't have a price book",J(r.res));
  const other=await signupPro("pb2");const so=await stateFor(other.ck);ok(!leaks(so).length,"another pro's state carries no price book, lead filters or hours logs",J(leaks(so)));
  const ps=await pub();ok(!(ps.users||[]).some(u=>PRIV.some(k=>u[k]!==undefined)),"signed-out state carries none of them");
  const dp=await login(P(),"demo-pro@sawyer.test");const dme=meOf(dp.st);ok(Array.isArray(dme.pb35)&&dme.pb35.length===9&&dme.pb35.some(x=>x.d==="Labor"&&x.r===95),"the demo pro has a seeded price book (9 items)",J((dme.pb35||[]).length));
  global.PRO=pro;global.EVIL=evil}

 // ===== 2. Who owes you: aging + statements =====
 const dp=await login(P(),"demo-pro@sawyer.test"),dh=await login(P(),"demo-homeowner@sawyer.test");
 const pat=(dp.st.bcust||[]).find(c=>c.by==="c1"&&c.uid==="u1"),ortiz=(dp.st.bcust||[]).find(c=>c.by==="c1"&&/Ortiz/.test(c.name));ok(pat&&ortiz,"demo pro has Pat (on Sawyer) and the Ortizes (not on Sawyer) as customers");
 {let r=await act(P(),dp.ck,"stmt35",[ortiz.id]);ok(r.res.ok===false&&/isn't on Sawyer/.test(r.res.msg),"statement: a customer who isn't on Sawyer gets 'copy it' instead",J(r.res));
  r=await act(P(),dh.ck,"stmt35",[pat.id]);ok(r.res.ok===false,"statement: a homeowner can't send one",J(r.res));
  r=await act(P(),PRO.ck,"stmt35",[pat.id]);ok(r.res.ok===false&&/wasn't found/.test(r.res.msg),"statement: another pro can't use the demo pro's customer",J(r.res));
  r=await act(P(),dp.ck,"stmt35",[pat.id]);ok(r.res.ok&&/Statement sent to Pat/.test(r.res.msg),"statement sent to Pat in Sawyer",J(r.res));
  r=await act(P(),dp.ck,"stmt35",[pat.id]);ok(r.res.ok===false&&/24 hours/.test(r.res.msg),"a second statement the same day is refused",J(r.res));
  const hs=await stateFor(dh.ck);const n=(hs.notifs||[]).find(x=>x.link==="stmt35:c1");ok(n&&/sent you a statement: \$[\d,]+\.\d\d open on \d+ invoice/.test(n.text),"Pat gets a statement notice linking to /statement/c1",J(n));
  const ds=await stateFor(dp.ck);ok(((ds.bcust||[]).find(c=>c.id===pat.id)||{}).stmt35>0,"the pro's customer record notes when the statement went out");
  const ps=await pub();ok(!(ps.bcust||[]).length,"signed out: no customer records")}

 // ===== 3. Lead filters =====
 const lp=await signupPro("lf","Plumbing","78704"),ho=await signupHo("lf");
 const post=async(title,o)=>{const r=await act(P(),ho.ck,"postJob",[Object.assign({title:title+" "+run,cat:"Plumbing",sub:"Drain cleaning",desc:"V35 lead filter test.",zip:"78704",budget:"$600–900",when:"This week"},o||{})]);return r.res&&r.res.id};
 const bells=async jid=>((await stateFor(lp.ck)).notifs||[]).filter(n=>n.link==="job:"+jid&&/^New /.test(n.text)).length;
 {let j=await post("V35 baseline drain");ok(j&&await bells(j)===1,"without filters, the pro gets the New job bell",j);
  let r=await act(P(),lp.ck,"leadFilters35",[{mi:999,min:500,nob:true,urg:true,skip:["Not a real type","Water heaters"]}]);let me=meOf(r.st);
  ok(r.res.ok&&me.lf35&&me.lf35.mi===0&&me.lf35.min===500&&J(me.lf35.skip)===J(["Water heaters"]),"leadFilters35 keeps only allowed values (bad distance -> any, unknown job type dropped)",J(me.lf35));
  j=await post("V35 small drain",{budget:"$100–400"});ok(j&&await bells(j)===0,"a job under the $500 minimum rings no bell (so no phone alert)");
  global.SMALL=j;
  j=await post("V35 big drain",{budget:"$600–900"});ok(j&&await bells(j)===1,"a $600–900 job still rings the bell");
  j=await post("V35 per-unit",{budget:"$150 per turn"});ok(j&&await bells(j)===1,"per-unit budgets aren't compared (bell rings)");
  j=await post("V35 heater",{sub:"Water heaters",budget:"$2,000"});ok(j&&await bells(j)===0,"a skipped job type rings no bell");
  r=await act(P(),lp.ck,"leadFilters35",[{min:0,nob:false,urg:false,skip:[]}]);ok(r.res.ok,"switch to: budget required, no urgent jobs",J(r.res));
  j=await post("V35 no budget",{budget:""});ok(j&&await bells(j)===0,"no budget posted + 'budget required' rings no bell");
  j=await post("V35 urgent",{urgent:true});ok(j&&await bells(j)===0,"an urgent job rings no bell when urgent jobs are excluded");
  r=await act(P(),lp.ck,"leadFilters35",[{}]);me=meOf(r.st);ok(r.res.ok&&/off/i.test(r.res.msg)&&me.lf35===undefined,"Turn off removes the filters",J(r.res));
  j=await post("V35 after off",{budget:"$100"});ok(j&&await bells(j)===1,"with filters off, every matching job rings again");
  r=await act(P(),ho.ck,"leadFilters35",[{min:500}]);ok(r.res.ok===false,"a homeowner can't set lead filters");
  await act(P(),lp.ck,"leadFilters35",[{min:500}]);const so=await stateFor((await signupPro("lf2")).ck);ok(!leaks(so).length,"another pro doesn't see the filters")}

 // ===== 4. Check your check =====
 const tv=await login(P(),"demo-traveler@sawyer.test");const today=iso(new Date()),mon=monOf(today),last=addD(mon,-7);
 {const tme=meOf(tv.st),L=tme.tlog35&&tme.tlog35.tcd1;ok(L&&Object.keys(L.d).filter(d=>monOf(d)===last).length===6&&L.chk[last]&&L.chk[last].g>0,"demo traveler has last week logged (6×10) with a check stub",J(L&&L.chk));
  let r=await act(P(),tv.ck,"tlogDay35",["tcd2",today,8]);ok(r.res.ok===false&&/hired on/.test(r.res.msg),"can't log hours on a call you weren't hired on",J(r.res));
  r=await act(P(),tv.ck,"tlogDay35",["tcd1",today,25]);ok(r.res.ok===false&&/0 to 24/.test(r.res.msg),"more than 24 hours a day is refused");
  r=await act(P(),tv.ck,"tlogDay35",["tcd1",addD(today,5),8]);ok(r.res.ok===false&&/up to today/.test(r.res.msg),"days in the future are refused");
  r=await act(P(),tv.ck,"tlogDay35",["tcd1","2026-13-40",8]);ok(r.res.ok===false,"a bad date is refused");
  r=await act(P(),tv.ck,"tlogCheck35",["tcd1",addD(mon,2),100,100]);ok(r.res.ok===false&&/week/.test(r.res.msg),"a check must be for a week starting Monday");
  r=await act(P(),tv.ck,"tlogCheck35",["tcd1",mon,"abc",""]);ok(r.res.ok===false,"non-numeric check amounts are refused");
  r=await act(P(),tv.ck,"tlogDay35",["tcd1",mon,12.3]);ok(r.res.ok&&meOf(r.st).tlog35.tcd1.d[mon]===12.25,"hours round to the quarter hour",J(r.res));
  r=await act(P(),tv.ck,"tlogDay35",["tcd1",mon,""]);ok(r.res.ok&&meOf(r.st).tlog35.tcd1.d[mon]===undefined,"clearing a day removes it");
  r=await act(P(),tv.ck,"tlogSet35",["tcd1",{ot:"8d"}]);ok(r.res.ok&&meOf(r.st).tlog35.tcd1.ot==="8d","OT rule can switch to after 8 a day");
  r=await act(P(),tv.ck,"tlogSet35",["tcd1",{ot:"40w"}]);ok(r.res.ok&&meOf(r.st).tlog35.tcd1.ot==="40w","and back to after 40 a week");
  const s2=await stateFor(dp.ck);ok(!leaks(s2).length,"the demo pro's state has no one else's hours log");
  const ps=await pub();ok(!(ps.users||[]).some(u=>u.tlog35),"signed out: no hours logs");
  const rnd=await signupPro("tc");r=await act(P(),rnd.ck,"tlogCheck35",["tcd1",last,1,1]);ok(r.res.ok===false,"a stranger can't write a check on that call")}

 // ===== 5. Browser =====
 const SH=process.argv[2]||os.tmpdir();br=await chromium.launch();const errs=[];
 const page=async(w,cookie)=>{const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900},acceptDownloads:true});
  if(cookie){const [k,v]=cookie.split("=");await c.addCookies([{name:k,value:v,url:LOCAL.B}])}
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return{c,p}};
 const go=async(p,u)=>{await p.goto(LOCAL.B+u,{waitUntil:"networkidle"});await p.waitForTimeout(250)};
 const noOverflow=async(p,lbl)=>{const ov=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);ok(ov<=0,lbl+": no sideways scroll",ov)};
 const font=async(p,sel)=>p.evaluate(s=>{const e=document.querySelector(s);return e?getComputedStyle(e).fontFamily:""},sel);
 for(const w of [390,1440]){
  // price book page + editor
  {const {c,p}=await page(w,dp.ck);await go(p,"/office/pricebook");
   ok(await p.locator(".v35pb-i").count()===9,w+": Office -> Price book lists the 9 demo items");ok(/Plus Jakarta Sans/.test(await font(p,".v35pb-h h2")),w+": price book uses Plus Jakarta Sans");
   await p.fill("#v35q","tank");ok(await p.locator(".v35pb-i:visible").count()===1,w+": search filters the list");await p.fill("#v35q","");
   await noOverflow(p,w+" price book");await p.screenshot({path:path.join(SH,"v35-pricebook-"+w+".png"),fullPage:false});
   await p.fill("#v35d","Water heater pan");await p.fill("#v35r","38.5");await p.click(".v35pb-s");await p.waitForTimeout(400);
   ok(await p.locator(".v35pb-i",{hasText:"Water heater pan"}).count()===1,w+": add an item from the form");
   await p.locator('[data-v35pbx]').first().waitFor();const del=await p.locator(".v35pb-i",{hasText:"Water heater pan"}).locator("[data-v35pbx]");await del.click();await p.waitForTimeout(300);
   ok(await p.locator(".v35pb-i",{hasText:"Water heater pan"}).count()===0,w+": remove it again");
   await go(p,"/invedit/new?type=inv");const chips=await p.locator("[data-ql]").allTextContents();ok(chips.length===4&&chips[0]==="Labor",w+": invoice editor Quick add shows the pro's own top 4 (Labor first)",J(chips));
   const pos=await p.evaluate(()=>{const e=document.querySelector(".o7-lh .num");return e?getComputedStyle(e).position:"none"});ok(pos==="static",w+": SW-076: the editor's Amount header is not the floating .num badge",pos);
   await p.click("#v35pk");await p.waitForSelector(".v35pk-b");await p.waitForTimeout(450);ok(await p.locator(".v35pk-b").count()===9,w+": Price book picker lists the items");
   if(w===1440)await p.screenshot({path:path.join(SH,"v35-picker-"+w+".png")});
   await p.fill("#v35pq","expansion");await p.locator(".v35pk-b:visible").first().click();await p.waitForTimeout(300);
   const lines=await p.evaluate(()=>[...document.querySelectorAll('input[data-f="d"]')].map(i=>i.value));const rates=await p.evaluate(()=>[...document.querySelectorAll('input[data-f="r"]')].map(i=>i.value));
   ok(lines[0]==="Expansion tank"&&+rates[0]===145,w+": picking an item fills the empty line with its name and price",J(lines)+J(rates));
   await p.locator("#addLine").click();await p.waitForTimeout(200);const d2=p.locator('input[data-f="d"]').nth(1);await d2.fill("Trip charge");await d2.dispatchEvent("change");await p.waitForTimeout(100);
   ok(+(await p.locator('input[data-f="r"]').nth(1).inputValue())===65,w+": typing a price-book name fills its rate");
   const tot=await p.textContent("#tTot");ok(/\$227\.31|\$2[0-9]{2}\.\d\d/.test(tot),w+": totals update ("+tot+")");
   if(w===1440){const csv=await p.evaluate(()=>{const b=v31Backup(me());const f=b.files.find(x=>x[0]==="price-book.csv");return f?f[1]:""});ok(/Labor,95\.00,hour,Labor/.test(csv),"backup ZIP gets price-book.csv",csv.slice(0,120))}
   await c.close()}
  {const {c,p}=await page(w,PRO.ck);if(w===1440){const csv=await p.evaluate(()=>"")||"";await go(p,"/office/pricebook");const t=await p.evaluate(()=>{const b=v31Backup(me());const f=b.files.find(x=>x[0]==="price-book.csv");return f?f[1]:""});ok(/"'=HYPERLINK/.test(t)&&!/^=HYPERLINK/m.test(t),"price-book.csv is formula-safe",t.slice(0,200))}await c.close()}
  // aging card + statement modal
  {const {c,p}=await page(w,dp.ck);await go(p,"/office/invoices");ok(await p.locator("#v35ar").count()===1,w+": Office -> Invoices opens with 'Who owes you'");
   const chk=await p.evaluate(()=>{const m=me(),a=v35Aging(m);const open=(DB.bills||[]).filter(b=>b.by===m.id&&b.type==="inv"&&!["draft","void"].includes(b.status)&&billCalc(b).bal>0.004);
     const B={cur:0,d30:0,d60:0,d90:0,d90p:0};const t0=new Date(new Date().toISOString().slice(0,10)+"T12:00");open.forEach(b=>{const late=b.due?Math.round((t0-new Date(b.due+"T12:00"))/864e5):0;const k=late<=0?"cur":late<=30?"d30":late<=60?"d60":late<=90?"d90":"d90p";B[k]+=billCalc(b).bal});
     const r2=n=>Math.round(n*100)/100;return{ok:Object.keys(B).every(k=>r2(B[k])===a.bk[k])&&r2(open.reduce((s,b)=>s+billCalc(b).bal,0))===a.tot,a:a.bk,B,n:open.length}});
   ok(chk.ok&&chk.n>=5&&chk.a.d90p>0&&chk.a.d30>0,w+": buckets match an independent count of open balances by days late",J(chk));
   const tt=await p.textContent(".v35ar-t");ok(/^\$[\d,]+\.\d\d$/.test(tt.trim()),w+": total shows with cents ("+tt.trim()+")");
   const pos=await p.evaluate(()=>getComputedStyle(document.querySelector(".v35ar-t")).position);ok(pos!=="absolute",w+": the total sits in the card",pos);
   await noOverflow(p,w+" invoices");await p.locator("#v35ar").screenshot({path:path.join(SH,"v35-owes-"+w+".png")});
   await p.locator("[data-v35st]",{hasText:"Statement"}).first().click();await p.waitForSelector(".v35sm");await p.waitForTimeout(450);ok(await p.locator(".v35st tbody tr").count()>=1,w+": statement lists the open invoices");
   const txt=await p.inputValue("#v35stx");ok(/^Statement from Bluebonnet/.test(txt)&&/Total open: \$/.test(txt),w+": statement text is ready to copy");
   const [dl]=await Promise.all([p.waitForEvent("download"),p.click("#v35stD")]);const fp=await dl.path();const csv=fs.readFileSync(fp,"utf8");ok(/^\ufeff?Invoice,Title,Issued,Due,Total,Paid,Balance,Days late/.test(csv)&&/Total open/.test(csv),w+": statement CSV downloads",csv.slice(0,80));
   if(w===390)await p.screenshot({path:path.join(SH,"v35-statement-"+w+".png")});
   await c.close()}
  {const {c,p}=await page(w,dh.ck);await go(p,"/statement/c1");ok(/Statement from Bluebonnet/.test(await p.textContent("h1")),w+": Pat's /statement/c1 page");ok(await p.locator('.v35cs-l a[href*="pay"]').count()>=1,w+": with a Pay button per open invoice (test mode)");await noOverflow(p,w+" statement page");await c.close()}
  // lead filters
  {const {c,p}=await page(w,lp.ck);await go(p,"/jobs");ok(await p.locator("#v35lf").count()===1&&/\$500\+ jobs/.test(await p.textContent("#v35lf")),w+": /jobs shows the lead-filter bar with the summary");
   const tag=p.locator(".v27jc",{hasText:"V35 small drain"}).locator(".v35out");ok(await tag.count()===1&&/budget under \$500/.test(await tag.textContent()),w+": the $100–400 job is tagged 'Outside your filters: budget under $500'");
   ok(await p.locator(".v27jc",{hasText:"V35 big drain"}).locator(".v35out").count()===0,w+": a job that passes isn't tagged");
   await noOverflow(p,w+" jobs");if(w===1440)await p.screenshot({path:path.join(SH,"v35-jobs-filters-"+w+".png")});
   await go(p,"/dash");ok(await p.locator("#v35lf").count()===1,w+": the dashboard's New jobs card has the lead-filter bar");
   await p.click("#v35lfB");await p.waitForSelector("#v35lfF");await p.waitForTimeout(450);ok(await p.locator('#v35lfF input[name="skip"]').count()>=10,w+": the filter sheet lists the trade's job types");
   if(w===390){await p.evaluate(()=>{const b=document.querySelector("#modal .mbox");if(b)b.scrollTop=0});await p.waitForTimeout(100);await p.screenshot({path:path.join(SH,"v35-filters-sheet-"+w+".png")})}
   await p.check('#v35lfF input[value="Sump pumps"]');await p.click('#v35lfF button.primary');await p.waitForTimeout(400);
   const f=await p.evaluate(()=>me().lf35);ok(f&&f.min===500&&f.skip.includes("Sump pumps"),w+": saving from the sheet stores the choices",J(f));
   await p.evaluate(()=>A.leadFilters35({min:500}));await c.close()}
  // check your check
  {const {c,p}=await page(w,tv.ck);await go(p,"/t/tcd1?w35=-1");ok(await p.locator("#v35cc").count()===1,w+": hired traveler sees 'Check your check' on the call");
   const v=await p.textContent(".v35v");ok(/Short \$230\.00/.test(v),w+": last week's stub reads 'Short $230.00'",v);
   const exp=await p.evaluate(()=>{const c=TC("tcd1");const w=v35Week(c,v35Log(me(),"tcd1"),v35Add(v35Mon(new Date().toISOString().slice(0,10)),-7));const r=c.rate,x=tX(c);const want=40*r+20*r*1.5+(String(x.pdUnit).startsWith("7")?7:6)*c.perDiem;return{w,want:Math.round(want*100)/100}});
   ok(exp.w.tot===60&&exp.w.st===40&&exp.w.ot===20&&exp.w.exp===exp.want,w+": 6×10 = 40 straight + 20 OT at 1.5×, plus per diem by its posted unit",J(exp));
   const d8=await p.evaluate(()=>{const c=TC("tcd1");const m=v35Mon("2026-11-04");const L={d:{[m]:12,[v35Add(m,1)]:12,[v35Add(m,2)]:12,[v35Add(m,3)]:12},chk:{},ot:"8d"};const w=v35Week(c,L,m);return{st:w.st,ot:w.ot,wage:w.wage,r:c.rate}});
   ok(d8.st===32&&d8.ot===16&&d8.wage===Math.round((32*d8.r+16*d8.r*1.5)*100)/100,w+": 'after 8 a day' puts 4×4 hrs into OT",J(d8));
   await noOverflow(p,w+" call page");await p.locator("#v35cc").screenshot({path:path.join(SH,"v35-checkcheck-"+w+".png")});
   await p.click("#v35msg");await p.waitForSelector("#v35mt");const msg=await p.inputValue("#v35mt");ok(/checking my check/.test(msg)&&/\$230\.00 short/.test(msg),w+": 'Message' pre-fills a polite summary with the shortfall");await p.click("#modal [data-close] >> nth=1").catch(()=>{});
   await go(p,"/t/tcd1");const inp=p.locator('[data-v35day="'+today+'"]');await inp.fill("7.5");await inp.dispatchEvent("change");await p.waitForTimeout(400);
   const saved=await p.evaluate(t=>me().tlog35.tcd1.d[t],today);ok(saved===7.5,w+": typing today's hours saves them",saved);
   await go(p,"/tdash");ok(await p.locator("#v35td").count()===1,w+": the traveler dashboard links to Check your check");
   await c.close()}
  {const {c,p}=await page(w,null);await go(p,"/t/tcd1");ok(await p.locator("#v35cc").count()===0,w+": signed out: no Check your check");await c.close()}
  {const {c,p}=await page(w,dp.ck);await go(p,"/t/tcd1");ok(await p.locator("#v35cc").count()===0,w+": someone not hired on the call doesn't get it");await c.close()}
 }
 ok(errs.length===0,"no page errors",J(errs.slice(0,5)));
}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL)}
 console.log(failed?"FAIL v35-e2e: "+failed+" failed":"PASS v35-e2e: all checks passed");process.exit(failed?1:0)})();
