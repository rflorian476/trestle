// v31 end-to-end. Self-contained: starts its own Sawyer server (local test mode).
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const {chromium}=require("playwright");
const ROOT=path.join(__dirname,"..");
let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)failed++};
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
function startApp(port,extra){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-v31-"));
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
// Covers: SW-066 formula-safe CSV cells (shared csvCell in the tax file, its invoice register and the other exports),
// SW-064 mileage line "116 mi at $0.70" in the shipped JS, SW-065 button word gaps, the month-by-month P&L on
// Office > Reports, "Back up everything" (a real ZIP: signatures, CRC-32, files, counts, own records only),
// health 2.14.0-sawyer and SW cache sawyer-v31.
let LOCAL=null,br=null;
function unzip(buf){const out={};let e=buf.length-22;while(e>=0&&buf.readUInt32LE(e)!==0x06054b50)e--;if(e<0)throw new Error("no end of central directory");
 const n=buf.readUInt16LE(e+10),cdOff=buf.readUInt32LE(e+16);let p=cdOff;
 for(let i=0;i<n;i++){if(buf.readUInt32LE(p)!==0x02014b50)throw new Error("bad central header "+i);const method=buf.readUInt16LE(p+10),crc=buf.readUInt32LE(p+16),size=buf.readUInt32LE(p+24),nl=buf.readUInt16LE(p+28),xl=buf.readUInt16LE(p+30),cl=buf.readUInt16LE(p+32),lo=buf.readUInt32LE(p+42);
  const name=buf.toString("utf8",p+46,p+46+nl);if(buf.readUInt32LE(lo)!==0x04034b50)throw new Error("bad local header "+name);const ln=buf.readUInt16LE(lo+26),lx=buf.readUInt16LE(lo+28);
  const data=buf.subarray(lo+30+ln+lx,lo+30+ln+lx+size);out[name]={method,crc,ok:zlib.crc32(data)===crc,text:data.toString("utf8")};p+=46+nl+xl+cl}return out}
const cells=line=>{const r=[];let i=0,cur="",q=false;for(;i<line.length;i++){const ch=line[i];if(q){if(ch==='"'&&line[i+1]==='"'){cur+='"';i++}else if(ch==='"')q=false;else cur+=ch}else if(ch==='"')q=true;else if(ch===","){r.push(cur);cur=""}else cur+=ch}r.push(cur);return r};
(async()=>{try{
 LOCAL=await startApp(await freePort(),{});
 br=await chromium.launch();
 const errs=[];
 const page=async(w,cookie)=>{const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900},acceptDownloads:true});
  if(cookie){const [k,v]=cookie.split("=");await c.addCookies([{name:k,value:v,url:LOCAL.B}])}
  const p=await c.newPage();p.on("pageerror",e=>errs.push(String(e).slice(0,200)));return p};
 const reports=async(w,ck)=>{const p=await page(w,ck);await p.goto(LOCAL.B+"/office/reports",{waitUntil:"networkidle"});await p.waitForSelector("#taxYear");await p.waitForTimeout(300);return p};
 const hz=(await req(LOCAL.port,"GET","/healthz")).json||{};ok(hz.v==="2.14.0-sawyer","healthz reports 2.14.0-sawyer",J(hz));
 const sw=await req(LOCAL.port,"GET","/sw.js");ok(sw.status===200&&/const C="sawyer-v31"/.test(sw.body),"service worker cache is sawyer-v31");
 const pro=await login(LOCAL.port,"demo-pro@sawyer.test"),ho=await login(LOCAL.port,"demo-homeowner@sawyer.test");ok(pro.ck&&ho.ck,"demo pro and homeowner sign in");
 const run=Math.random().toString(36).slice(2,8);
 const su=await req(LOCAL.port,"POST","/api/signup",JH,J({kind:"pro",password:"v31-correct-horse",data:{name:"Vee Tax",biz:"V31 Tax "+run,email:"v31-tax-"+run+"@example.com",trade:"Plumbing",zip:"78704",phone:"5125550100",plan:"founding"}}));
 const np={ck:(String(su.headers["set-cookie"]||"").match(/swsid=[^;]+/)||[])[0],id:stateOf(su).me};ok(np.ck,"a new pro signs up");

 // ===== 1. SW-066: formula-safe CSV =====
 const c1=(await act(LOCAL.port,np.ck,"saveCust",[{name:"=1+2",email:"",phone:"",addr:"",site:""}])).res;
 const c2=(await act(LOCAL.port,np.ck,"saveCust",[{name:'Peach, "the" Co',email:"",phone:"",addr:"",site:""}])).res;
 ok(c1.ok&&c2.ok,"pro saves customers '=1+2' and 'Peach, \"the\" Co'",J([c1,c2]));
 const b1=(await act(LOCAL.port,np.ck,"saveBill",[{type:"inv",cust:c1.id,title:"Formula test",lines:[{d:"@SUM(A1:A9)",q:1,r:308.51}]}])).res;
 const b2=(await act(LOCAL.port,np.ck,"saveBill",[{type:"inv",cust:c2.id,title:"Comma test",lines:[{d:"Service call, 2 hrs",q:1,r:150}]}])).res;
 const s1=(await act(LOCAL.port,np.ck,"sendBill",[b1.id])).res,s2=(await act(LOCAL.port,np.ck,"sendBill",[b2.id])).res;
 const p1=(await act(LOCAL.port,np.ck,"recordPay",[b1.id,100.51,"check"])).res;
 const l1=(await act(LOCAL.port,np.ck,"addLedger",[{kind:"exp",amt:42.5,cat:"Materials",vendor:"+cmd|' /C calc'!A0",note:"-2+3"}])).res;
 const l2=(await act(LOCAL.port,np.ck,"addLedger",[{kind:"mile",miles:116,from:"Shop",to:"=HYPERLINK(\"http://x\")",note:"Supply run"}])).res;
 ok(b1.ok&&b2.ok&&s1.ok&&s2.ok&&p1.ok&&l1.ok&&l2.ok,"two invoices sent ($308.51 with $100.51 paid, $150), a formula-like expense and trip logged",J([b1,b2,s1,s2,p1,l1,l2].map(x=>x.ok)));
 {const p=await reports(1440,np.ck);
  const o=await p.evaluate(()=>{const m=me(),y=document.getElementById("o9TaxCsv").dataset.y;return{csv:v9TaxCsv(m,y),unit:[csvCell("=1+2"),csvCell("+1"),csvCell("-12.50"),csvCell("@x"),csvCell("\tx"),csvCell("\rx"),csvCell('a,"b"'),csvCell("plain"),csvCell("x",true),csvCell(-5),csvCell(null)],
   v7:v7CSV([["=A1","-3","ok, fine"]]),em:document.querySelector(".o9-tax-k em").textContent}});
  ok(J(o.unit)===J([`"'=1+2"`,"+1","-12.50",`"'@x"`,`"'\tx"`,`"'\rx"`,`"a,""b"""`,"plain",`"x"`,"-5",""]),"csvCell: = @ tab CR get a leading ' and quotes; plain numbers stay numbers; comma/quote quoting kept",J(o.unit));
  ok(o.v7===`"'=A1",-3,"ok, fine"`,"the QuickBooks/expense exports (v7CSV) use the same escaper",o.v7);
  const lines=o.csv.split("\n");const inv=lines.filter(l=>/,INV-\d+,/.test(l));
  ok(inv.some(l=>l.includes(`,"'=1+2",`))&&inv.some(l=>l.includes(`,"Peach, ""the"" Co",`)),"invoice register: '=1+2' is quoted with a leading ', the comma/quote name escaped as before",J(inv));
  ok(inv.some(l=>/,308\.51,100\.51,208\.00,/.test(l))&&lines.some(l=>/^TOTAL \(2 invoices\),,,,,458\.51,100\.51,358\.00,$/.test(l)),"cents and totals unchanged (308.51 / 100.51 / 208.00; total 458.51)",J(lines.filter(l=>/TOTAL|308/.test(l))));
  const bad=[];for(const l of lines)for(const c of cells(l))if(/^[=+\-@\t\r]/.test(c)&&!/^[+-]?\d+(\.\d+)?$/.test(c))bad.push(c);
  ok(bad.length===0,"no cell anywhere in the tax file starts with = + - @ tab or CR (unless it's a plain number)",J(bad));
  ok(o.csv.includes(`"'+cmd|' /C calc'!A0"`),"expense vendor in the tax file is neutralized too",J(lines.filter(l=>/cmd|2\+3/.test(l))));
  // ===== 2. SW-064 =====
  ok(o.em==="116 mi at $0.70","SW-064: mileage line reads '116 mi at $0.70'",o.em);
  ok(/Mileage deduction \(116\.00 mi x \$0\.70\)/.test(o.csv),"SW-064: the tax file summary says 'mi x $0.70'",J(lines.filter(l=>/Mileage deduction/.test(l))));
  await p.context().close()}
 {const p=await reports(1440,pro.ck);const em=await p.$eval(".o9-tax-k em",e=>e.textContent);ok(/^\d[\d,]* mi at \$0\.70$/.test(em),"demo pro: mileage line has the $",em);
  const js=(await req(LOCAL.port,"GET","/")).body.match(/\/js\/a\d+\.[0-9a-f]+\.js/g)||[];let hit=false;for(const u of new Set(js)){const r=await req(LOCAL.port,"GET",u);if(/mi at \$\$\{MILE_RATE/.test(r.body)||/mi at \$\$\{/.test(r.body))hit=true}
  ok(hit,"served public JS carries 'mi at $${MILE_RATE…}' like src/v9.js");
  // ===== 3. SW-065 =====
  const s=await p.$eval("#o9TaxCsv",e=>{const cs=getComputedStyle(e);const t=[...e.childNodes].find(n=>n.nodeType===3&&/Download/.test(n.textContent));const r=document.createRange();const i=t.textContent.indexOf(" ");r.setStart(t,i);r.setEnd(t,i+1);
   return{ls:cs.letterSpacing,ws:parseFloat(cs.wordSpacing),gap:r.getBoundingClientRect().width,txt:e.textContent}});
  ok(s.txt==="Download 2026 tax file (CSV)".replace("2026",s.txt.match(/\d{4}/)[0]),"SW-065: the button string is unchanged",s.txt);
  ok((s.ls==="normal"||s.ls==="0px")&&s.ws>=1&&s.gap>=3.2,"SW-065: tax button has letter-spacing 0, word-spacing .12em, a visible word gap (≥3.2px; it was about 2px)",J(s));
  await p.context().close()}
 {const p=await page(390);await p.goto(LOCAL.B+"/",{waitUntil:"networkidle"});const s=await p.$$eval(".btn",a=>a.filter(b=>b.offsetParent).slice(0,4).map(b=>{const c=getComputedStyle(b);return[c.letterSpacing,c.wordSpacing]}));
  ok(s.length&&s.every(([l,w])=>(l==="normal"||l==="0px")&&parseFloat(w)>0),"SW-065: other buttons get the same spacing (home page)",J(s));await p.context().close()}

 // ===== 4. P&L month by month =====
 for(const w of [1440,390]){const p=await reports(w,pro.ck);
  const o=await p.evaluate(()=>{const c=document.getElementById("v31pl"),m=me(),y=document.getElementById("o9TaxCsv").dataset.y;if(!c)return null;const t=v9Tax(m,y),pl=v31Pl(m,y);const tw=c.querySelector(".o7-tw");
   const tax=document.getElementById("taxYear"),exp=document.querySelector(".o7-exp");
   return{t:c.innerText.replace(/\s+/g," "),rows:[...c.querySelectorAll("tbody tr")].map(r=>r.innerText.replace(/\s+/g," ")),foot:c.querySelector("tfoot").innerText.replace(/\s+/g," "),net:Math.round(t.net*100)/100,plNet:pl.T.net,sum:Math.round(pl.rows.reduce((a,x)=>a+x.net,0)*100)/100,
    order:!!(tax.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(c.compareDocumentPosition(exp)&Node.DOCUMENT_POSITION_FOLLOWING),ow:document.documentElement.scrollWidth>innerWidth+1,clip:tw.scrollWidth>tw.clientWidth+1,first:pl.rows[0]&&pl.rows[0].l,from:pl.from,h1:document.querySelectorAll("h1").length}});
  ok(o&&o.rows.length>=1&&/Profit & loss, month by month · \d{4}/.test(o.t)&&/Cash basis/.test(o.t),w+" demo pro: P&L card with month rows",o&&o.t.slice(0,200));
  ok(o&&Math.abs(o.plNet-o.net)<0.006&&Math.abs(o.sum-o.net)<0.02,w+" P&L total and the sum of months equal the Tax year card's net",J(o&&{n:o.net,p:o.plNet,s:o.sum}));
  ok(o&&o.order,w+" P&L sits between the Tax year card and Export");
  ok(o&&!o.ow&&!o.clip&&o.h1===1,w+" no overflow, the table fits its card, one H1",J(o&&{ow:o.ow,clip:o.clip,h1:o.h1}));
  ok(o&&/not tax advice/i.test(o.t)&&/matches the tax-year file/.test(o.t),w+" hedged: planning estimate, not tax advice");
  if(w===1440)ok(o&&(o.from===0||new RegExp("Starts in "+o.first).test(o.t)),"months before the first money in or out are left off and the card says where it starts",J(o&&{f:o.first,from:o.from}));
  await p.context().close()}
 {const p=await reports(1440,np.ck);const o=await p.evaluate(()=>{const m=me(),y=document.getElementById("o9TaxCsv").dataset.y;return{rows:v31PlRows(m,y),t:document.getElementById("v31pl").innerText.replace(/\s+/g," ")}});
  const now=new Date(),mon=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][now.getMonth()]+" "+now.getFullYear();
  ok(o.rows.length===3&&o.rows[1][0]===mon&&o.rows[1][1]==="100.51"&&o.rows[1][3]==="42.50"&&o.rows[1][4]==="116.00"&&o.rows[1][5]==="81.20"&&o.rows[1][6]==="-23.19","new pro: one month row (collected 100.51, expenses 42.50, 116 mi = 81.20, net -23.19)",J(o.rows));
  ok(o.rows[2][0]==="Total "+now.getFullYear()&&o.rows[2][6]==="-23.19","totals row",J(o.rows[2]));
  const [d]=await Promise.all([p.waitForEvent("download"),p.click("#v31PlCsv")]);const f=await d.path();const csv=fs.readFileSync(f,"utf8");
  ok(/^sawyer-profit-loss-\d{4}\.csv$/.test(d.suggestedFilename())&&csv.split("\r\n")[0]==="Month,Collected,Processing fees,Expenses,Miles,Mileage deduction,Net"&&/,-23\.19$/.test(csv.trim()),"'Download P&L (CSV)' saves the same rows (negative net stays a number)",d.suggestedFilename()+" "+csv.slice(-80));
  // ===== 5. Back up everything =====
  const card=await p.$eval("#v31bk",e=>e.innerText.replace(/\s+/g," "));ok(/Back up everything/.test(card)&&/nothing is uploaded/.test(card),"Export card has 'Back up everything' (built on the device)",card);
  const [z]=await Promise.all([p.waitForEvent("download"),p.click("#v31Zip")]);const buf=fs.readFileSync(await z.path());let Z={};try{Z=unzip(buf)}catch(e){ok(false,"backup ZIP parses",e.message)}
  const names=Object.keys(Z);const want=["README.txt","customers.csv","invoices-and-estimates.csv","invoice-lines.csv","payments.csv","expenses.csv","mileage.csv","timesheets.csv","licenses-and-insurance.csv"];
  ok(/^sawyer-backup-\d{4}-\d{2}-\d{2}\.zip$/.test(z.suggestedFilename())&&buf.readUInt32LE(0)===0x04034b50,"downloads sawyer-backup-<date>.zip (a real ZIP)",z.suggestedFilename());
  ok(want.every(n=>names.includes(n))&&names.some(n=>/^profit-and-loss-\d{4}\.csv$/.test(n))&&names.length===10,"ZIP has the README and 9 CSV files",J(names));
  ok(names.length&&names.every(n=>Z[n].ok&&Z[n].method===0),"every file's CRC-32 checks out (stored)",J(names.filter(n=>!Z[n].ok)));
  const T=n=>(Z[n]&&Z[n].text||"").replace(/^\ufeff/,"");const rows=n=>T(n).split("\r\n").filter(Boolean).map(cells);
  const cu=rows("customers.csv"),iv=rows("invoices-and-estimates.csv"),li=rows("invoice-lines.csv"),pa=rows("payments.csv"),ex=rows("expenses.csv"),mi=rows("mileage.csv");
  ok(cu.length===3&&cu.some(r=>r[0]==="'=1+2")&&cu.some(r=>r[0]==='Peach, "the" Co')&&T("customers.csv").includes(`"'=1+2"`),"customers.csv: both customers, '=1+2' neutralized, comma/quote name intact",T("customers.csv").slice(0,200));
  ok(iv.length===3&&iv.some(r=>r[1]==="Invoice"&&r[2]==="'=1+2"&&r[7]==="308.51"&&r[8]==="100.51"&&r[9]==="208.00"),"invoices-and-estimates.csv: totals, paid and balance keep cents",J(iv));
  ok(li.some(r=>r[2]==="'@SUM(A1:A9)"&&r[5]==="308.51")&&li.some(r=>r[2]==="Service call, 2 hrs"),"invoice-lines.csv: every line, formula-like text neutralized",J(li));
  ok(pa.length===2&&pa[1][3]==="100.51"&&ex.length===2&&ex[1][1]==="'+cmd|' /C calc'!A0"&&ex[1][4]==="42.50"&&mi.length===2&&mi[1][2]===`'=HYPERLINK("http://x")`,"payments, expenses and mileage files carry the records, neutralized",J([pa,ex,mi]));
  ok(/V31 Tax/.test(T("README.txt"))&&/2 customers/.test(T("README.txt"))&&/2 invoices and estimates/.test(T("README.txt"))&&/Not tax advice/.test(T("README.txt")),"README names the business and counts the records",T("README.txt").slice(0,300));
  ok(!Object.values(Z).some(f=>/Bluebonnet|Pat Hollis|sawyer-demo-2026|swsid|password/i.test(f.text)),"the backup holds only this pro's own records (no demo pro data, no secrets)");
  await p.context().close()}
 {const p=await reports(390,pro.ck);const o=await p.evaluate(()=>{const b=document.getElementById("v31bk");return{vis:!!b&&b.offsetHeight>0,ow:document.documentElement.scrollWidth>innerWidth+1}});ok(o.vis&&!o.ow,"390: backup block visible, no overflow",J(o));await p.context().close()}
 // ===== 6. Pros only =====
 {const p=await page(1440,ho.ck);await p.goto(LOCAL.B+"/office/reports",{waitUntil:"networkidle"});await p.waitForTimeout(300);const n=await p.$$eval("#v31pl,#v31bk",a=>a.length);ok(n===0,"homeowner: no P&L or backup (Office is for pros)");await p.context().close()}
 {const r=await req(LOCAL.port,"GET","/office/reports");ok(!/id="v31pl"|id="v31bk"/.test(r.body),"signed-out /office/reports HTML has neither card")}
 for(const [lab,ck] of [["signed-out",null],["another pro",pro.ck],["the homeowner",ho.ck]]){const s=stateOf(await req(LOCAL.port,"GET","/api/state",ck?{Cookie:ck}:{}));
  ok(!(s.bcust||[]).some(c=>c.by===np.id)&&!(s.bills||[]).some(b=>b.by===np.id)&&!(s.ledger||[]).some(l=>l.by===np.id),lab+" /api/state: none of the new pro's customers, invoices or expenses")}

 ok(errs.length===0,"no page errors",J(errs.slice(0,5)));
}catch(e){ok(false,"suite crashed",e&&e.stack||e)}finally{try{if(br)await br.close()}catch(e){}await stopApp(LOCAL)}
 console.log(failed?"FAIL v31-e2e: "+failed+" failed":"PASS v31-e2e: all checks passed");process.exit(failed?1:0)})();
