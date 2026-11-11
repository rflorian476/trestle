// v10: e-signed estimates -> invoices, receipt photo capture, traveler status + open-to-travel, recurring invoice generation, perf/no-errors guards
// usage: node test/v10-e2e.js http://localhost:8899 [shotdir]   (NODE_PATH must include playwright)
const {chromium}=require("playwright");const fs=require("fs"),path=require("path");const B=process.argv[2]||"http://localhost:8899",OUT=process.argv[3];let fail=0,errs=[];
const ok=(c,n)=>{console.log((c?"PASS ":"FAIL ")+n);if(!c)fail++};
(async()=>{const br=await chromium.launch();
async function as(email,w=1300){const p=await br.newPage({viewport:{width:w,height:w<500?844:900},deviceScaleFactor:w<500?2:1});p.on("pageerror",e=>errs.push(e.message));p.on("console",m=>{if(m.type()==="error"&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});await p.goto(B+"/");
 if(email)await p.evaluate(async e=>{await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,password:"sawyer-demo-2026"})})},email);return p}
const nav=async(p,r)=>{await p.goto(B+"/#"+r);await p.reload();await p.waitForTimeout(900)};
const shot=async(p,n)=>{if(OUT){fs.mkdirSync(OUT,{recursive:true});await p.screenshot({path:path.join(OUT,n+".png")})}};
// --- fonts are external files now (CSS stays small)
{const r=await (await fetch(B+"/")).text();ok(!/base64,d09GMg/.test(r),"no inline base64 fonts in the page");ok(/rel="preload" href="\/fonts\/plus-jakarta-sans-400\.woff2"/.test(r),"body font preloaded");
 const f=await fetch(B+"/fonts/plus-jakarta-sans-800.woff2");ok(f.status===200&&/woff2/.test(f.headers.get("content-type"))&&/immutable/.test(f.headers.get("cache-control")),"font served with long cache");ok(!/Fraunces/.test(r),"unused serif face removed");ok(!/format\("woff2"\) format/.test(r),"font-face src is valid")}
{const p=await as(null);await p.waitForTimeout(1500);ok(await p.evaluate(()=>[...document.fonts].filter(f=>f.family.includes("Jakarta")&&f.status==="loaded").length>=2),"Plus Jakarta Sans actually loads");await p.close()}
// --- pro makes a fresh estimate for the homeowner and sends it
let pro=await as("demo-pro@sawyer.test");await nav(pro,"/office/estimates");
const est=await pro.evaluate(()=>{const s=v7Bill("bbc11001");const o=JSON.parse(JSON.stringify(s));delete o.id;delete o.no;delete o.sig10;o.status="draft";o.title="v10 test: replace water heater";const r=A.saveBill(o);if(!r||!r.ok)return {err:r&&r.msg};const s2=A.sendBill(r.id);return{id:r.id,sent:s2&&s2.ok}});
ok(est.id&&est.sent,"pro creates and sends an estimate");
await nav(pro,"/invoice/"+est.id);ok(await pro.$(".s10-wait"),"pro sees 'Waiting for e-signature'");
// --- homeowner signs on a phone
let cu=await as("demo-homeowner@sawyer.test",390);await nav(cu,"/invoice/"+est.id);
ok(await cu.$("#s10F canvas#s10c"),"customer sees signature pad");ok(!(await cu.$("#bApprove")),"plain approve button replaced by e-sign");
const bypass=await cu.evaluate(id=>A.approveEst(id,[]),est.id);ok(bypass&&!bypass.ok,"approving without a signature is refused");
await cu.fill("#s10n","");await cu.click("#s10go");await cu.waitForTimeout(500);ok(await cu.evaluate(id=>v7Bill(id).status,est.id)==="sent","empty name is refused");
await cu.fill("#s10n","Dana Whitaker");await cu.locator("#s10c").scrollIntoViewIfNeeded();const bx=await cu.locator("#s10c").boundingBox();
await cu.mouse.move(bx.x+30,bx.y+bx.height*.6);await cu.mouse.down();for(let i=1;i<=16;i++)await cu.mouse.move(bx.x+30+i*14,bx.y+bx.height*(.6-.25*Math.sin(i/2.2)));await cu.mouse.up();
await shot(cu,"mobile-esign-pad");
await cu.click("#s10go");await cu.waitForTimeout(500);ok(await cu.evaluate(id=>v7Bill(id).status,est.id)==="sent","must tick the e-sign consent box");
await cu.check("#s10a");await cu.click("#s10go");await cu.waitForTimeout(1200);
const sg=await cu.evaluate(id=>{const b=v7Bill(id);return{st:b.status,sig:b.sig10}},est.id);ok(sg.st==="approved"&&sg.sig&&sg.sig.name==="Dana Whitaker"&&/^M\d/.test(sg.sig.path||""),"signed: approved with name + drawn signature saved");
await nav(cu,"/invoice/"+est.id);ok(await cu.$(".s10-doc svg path"),"signature shows on the document");await shot(cu,"mobile-esign-signed");
// --- pro converts to an invoice that carries the signature reference
await nav(pro,"/invoice/"+est.id);ok(await pro.$(".s10-doc"),"pro sees the signature block");
const conv=await pro.evaluate(id=>A.convertEst(id),est.id);ok(conv&&conv.ok&&conv.id,"approved estimate turns into an invoice");
if(conv&&conv.id){await nav(pro,"/invoice/"+conv.id);ok((await pro.textContent(".s10-from")||"").includes("Dana Whitaker"),"invoice shows 'Based on estimate, signed by'");await shot(pro,"desktop-invoice-from-signed-estimate")}
// --- recurring invoices actually generate when due
const rec=await pro.evaluate(()=>{const t=v7Today();const inv=(DB.bills||[]).find(b=>b.id==="bbc11005");const n0=DB.bills.filter(b=>b.recFrom9===inv.id).length;
 const s=A.setRecurring(inv.id,{every:"week",next:t,auto:true});const r=A.sweep9();const after=DB.bills.filter(b=>b.recFrom9===inv.id);const nb=after[after.length-1];
 const r2=A.sweep9();const after2=DB.bills.filter(b=>b.recFrom9===inv.id).length;const v=v7Bill(inv.id).rec9;A.setRecurring(inv.id,{every:"off"});
 return{set:s&&s.ok,made:after.length-n0,st:nb&&nb.status,sent:!!(nb&&nb.sent),next:v.next,today:t,again:after2-after.length,sameTotal:nb&&billCalc(nb).total===billCalc(inv).total,cuid:nb&&nb.cuid===inv.cuid}});
ok(rec.set&&rec.made===1,"due recurring invoice generates exactly one new invoice");ok(rec.st==="sent"&&rec.sent&&rec.cuid,"auto-send recurring invoice goes to the customer");
ok(rec.sameTotal,"generated invoice copies the lines and total");ok(rec.next>rec.today&&rec.again===0,"schedule moves forward and a second sweep makes nothing");
const cuNote=await cu.evaluate(async()=>{await fetch("/api/state");return 1});
// --- receipt photo capture on phone
await pro.close();pro=await as("demo-pro@sawyer.test",390);await nav(pro,"/office/money");
ok(await pro.$("#ex-p[capture=environment]"),"receipt input opens the camera on phones");
const big=await pro.evaluate(async()=>{const c=document.createElement("canvas");c.width=2400;c.height=3200;const x=c.getContext("2d");for(let i=0;i<4000;i++){x.fillStyle=`hsl(${i%360},60%,${30+i%50}%)`;x.fillRect(Math.random()*2400,Math.random()*3200,40,40)}const b=await new Promise(r=>c.toBlob(r,"image/png"));return Array.from(new Uint8Array(await b.arrayBuffer()))});
const tmp="/tmp/v10-receipt.png";fs.writeFileSync(tmp,Buffer.from(big));
await pro.setInputFiles("#ex-p",tmp);await pro.waitForTimeout(1500);ok(await pro.$("#r10prev img"),"receipt preview shows");
const sz=await pro.evaluate(()=>{const f=document.getElementById("ex-p").files[0];return f&&[f.size,f.type]});ok(sz&&sz[1]==="image/jpeg"&&sz[0]<1024*1024,"big phone photo shrunk to a small JPEG before upload ("+(sz&&Math.round(sz[0]/1024))+" KB)");
await shot(pro,"mobile-receipt-capture");
await pro.fill("#ex-a","86.40");await pro.fill("#ex-v","Home Depot v10");await pro.click("#expF button.btn.primary");await pro.waitForTimeout(1500);
const led=await pro.evaluate(()=>(DB.ledger||[]).filter(l=>l.vendor==="Home Depot v10").pop());ok(led&&/^\/u\/[a-f0-9]{32}\.jpg$/.test(led.photo||""),"receipt photo saved on the expense (was silently dropped before)");
ok(await pro.$("a.r10-th img"),"receipt thumbnail in the expense list");
const forged=await pro.evaluate(()=>A.addLedger({kind:"exp",amt:"5",vendor:"x",photo:"/u/0123456789abcdef0123456789abcdef.jpg"}));ok(forged&&!forged.ok,"server refuses a receipt photo the user didn't upload");
// --- traveler status + open to travel
let tv=await as("demo-remodeler@sawyer.test");await tv.waitForFunction(()=>typeof A!=="undefined"&&typeof A.saveTravel==="function");await tv.evaluate(()=>A.saveTravel({trade:"Electrical",headline:"Journeyman, commercial + industrial",home:"Ludington, MI",lic:[{type:"Journeyman",state:"MI"}],states:["MI","OH","IN"],availNow:true,yrs:9,osha:"OSHA 30"}));
await nav(tv,"/travel?tab=travelers");ok(await tv.$("#t10St .t10seg"),"traveler sees 4-way status picker");
await tv.click("#t10St label:has(input[value=onjob])");const d=new Date(Date.now()+20*864e5).toISOString().slice(0,10);await tv.fill("#t10d",d);await tv.click("#t10save");await tv.waitForTimeout(900);
ok(await tv.evaluate(()=>me().trav.st10==="onjob"&&!me().trav.availNow),"status saved: on a call until date");ok(await tv.$("#t10St .b10-open"),"on a call ending within 45 days still shows Open to travel");
await tv.click("#t10St label:has(input[value=off])");await tv.waitForTimeout(900);ok(await tv.evaluate(()=>me().trav.st10==="off"),"status saved: not looking");
await nav(tv,"/travel?tab=travelers&open=1");const hidden=await tv.evaluate(()=>!document.querySelector(`a[href*="${me().id}"].t5c-t`));ok(hidden,"'Open to travel' filter hides travelers who aren't looking");
await tv.click("#t10St label:has(input[value=now])");await tv.waitForTimeout(900);ok(await tv.evaluate(()=>me().trav.availNow&&me().trav.st10==="now"),"available now syncs the quick switch");
await nav(tv,"/travel?tab=travelers&open=1");ok(await tv.$(".t6tv .b10-open"),"cards show the Open to travel badge");await shot(tv,"desktop-traveler-status");
await tv.uncheck("#tAvail");await tv.waitForTimeout(800);ok(await tv.evaluate(()=>!me().trav.availNow&&me().trav.st10==="soon"),"quick switch off falls back to 'available soon'");await tv.check("#tAvail");await tv.waitForTimeout(600);
const tm=await as(null,390);await nav(tm,"/travel?tab=travelers&open=1");ok((await tm.$$(".t6tv")).length>0,"signed-out visitors can filter Open to travel");await shot(tm,"mobile-travelers-open");
ok(!errs.length,"no page errors"+(errs.length?": "+[...new Set(errs)].slice(0,4).join(" | "):""));
console.log(fail?fail+" FAILED":"ALL PASS");await br.close();process.exit(fail?1:0)})().catch(e=>{console.error(e);process.exit(1)});
