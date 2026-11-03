// v9: recurring invoices, auto reminders, tax-year CSV, resolution cases, trust panel, traveler OT filter, per diem calculator, a11y/perf guards
const {chromium}=require("playwright");const B=process.argv[2]||"http://localhost:8899";let fail=0,errs=[];
const ok=(c,n)=>{console.log((c?"PASS ":"FAIL ")+n);if(!c)fail++};
(async()=>{const br=await chromium.launch();
async function as(email,w=1300){const p=await br.newPage({viewport:{width:w,height:900},acceptDownloads:true});p.on("pageerror",e=>errs.push(e.message));p.on("console",m=>{if(m.type()==="error")errs.push(m.text())});await p.goto(B+"/");if(email)await p.evaluate(async e=>{await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,password:"sawyer-demo-2026"})})},email);return p}
const nav=async(p,r)=>{await p.goto(B+"/#"+r);await p.reload();await p.waitForTimeout(800)};
// --- pro: recurring + reminders + tax year
let p=await as("demo-pro@sawyer.test");await nav(p,"/office/recurring");
ok(await p.$("#o9Auto"),"Recurring tab shows auto-reminder switch");
const before=await p.$$eval(".o9-rep tbody tr, table tbody tr",r=>r.length);
const was=await p.$eval("#o9Auto",e=>e.checked);await p.click("label.t5switch:has(#o9Auto)");await p.waitForTimeout(500);
ok(await p.evaluate(()=>!!me().autoRem9)!==was,"auto reminders toggle saves");
await p.click("label.t5switch:has(#o9Auto)");await p.waitForTimeout(400);
const cand=await p.$("a.chip7[href*='rep=1']");ok(cand,"recurring tab offers invoices to repeat");
if(cand){await cand.click();await p.waitForTimeout(700);ok(await p.$("#o9RepF"),"invoice page has Repeat card");
 await p.selectOption("#o9RepF select[name=every]","quarter");await p.click("#o9RepF button");await p.waitForTimeout(700);
 ok(await p.$("#o9RepOff"),"repeat schedule saved on invoice");
 await nav(p,"/office/recurring");const after=await p.$$eval(".o9-rep tbody tr, table tbody tr",r=>r.length);ok(after>before,"new schedule listed on Recurring tab");}
const sw=await p.evaluate(()=>{const due=DB.bills.find(b=>b.rec9&&b.rec9.on);if(!due)return null;const n0=DB.bills.length;return{n0}});
await nav(p,"/office/reports");ok(await p.$("#taxYear"),"tax-year card on reports");
const tdNum=await p.$eval("td.num",e=>getComputedStyle(e).position+"|"+getComputedStyle(e).fontSize);ok(tdNum.startsWith("static")&&parseFloat(tdNum.split("|")[1])<20,"report table figures visible (no leaked .num badge style)");
const [dl]=await Promise.all([p.waitForEvent("download",{timeout:5000}).catch(()=>null),p.click("#o9TaxCsv")]);
if(dl){const fs=require("fs");const f=await dl.path();const t=fs.readFileSync(f,"utf8");ok(/Schedule C/i.test(t)&&t.split("\n").length>3,"tax-year CSV downloads with Schedule C lines")}else ok(false,"tax-year CSV downloads");
await p.close();
// --- homeowner: resolution case
p=await as("demo-homeowner@sawyer.test",390);await nav(p,"/case/csd1");
ok(await p.$(".o9-steps4"),"case page shows progress steps");ok(await p.$("#c9r")||await p.$(".o9-res"),"case page has reply form (or resolved record)");
if(await p.$("#c9t")){await p.fill("#c9t","Thanks, Nov 5 works. Please bring a new cartridge.");await p.click("#c9r button[type=submit], #c9r .btn.primary");await p.waitForTimeout(700);
ok((await p.textContent(".o9-tl")).includes("new cartridge"),"reply lands on the case timeline");
await p.click("#c9Acc");await p.waitForTimeout(800);ok(await p.$(".o9-res"),"accepting the offer resolves the case");}else console.log("SKIP demo case csd1 already resolved (re-run on a fresh DATA_DIR to cover reply/accept)");
const jid=await p.evaluate(()=>{const live=["open","replied","escalated"];const j=DB.jobs.find(j=>j.cust===me().id&&j.hired&&!(DB.cases||[]).some(c=>c.job===j.id&&live.includes(c.status)));return j&&j.id});
if(jid){await nav(p,"/job/"+jid);const b=await p.$("[data-case9]");ok(b,"job page offers Report a problem");
 if(b){await b.click();await p.waitForTimeout(400);await p.fill("#c9d","The new outlet in the kitchen stopped working two days after the install.");await p.click("#c9f button[type=submit], #c9f .btn.primary");await p.waitForTimeout(900);
  ok(await p.evaluate(()=>(DB.cases||[]).some(c=>c.status==="open"&&c.by===me().id)),"opening a case saves it");}}
else ok(false,"homeowner has a hired job to report on");
await p.close();
// --- trust panel, traveler filters, per diem
p=await as(null);await nav(p,"/pro/c1");ok(await p.$("#trust"),"pro profile shows How we checked panel");
await nav(p,"/travel");const n0=await p.$$eval("article.t6card",a=>a.length);await nav(p,"/travel?ot=20");const n1=await p.$$eval("article.t6card",a=>a.length);
ok(await p.$("a.t6qc.on[aria-pressed=true]"),"overtime chip shows as pressed");ok(n1<=n0,"heavy-OT filter narrows calls ("+n0+"→"+n1+")");
await nav(p,"/perdiem");ok(await p.$("#pdf9"),"per diem calculator renders");
const o1=await p.textContent("#pdo9");await p.fill("#pdf9 input[name=lodge]","2400");await p.waitForTimeout(300);const o2=await p.textContent("#pdo9");ok(o1!==o2,"per diem calculator updates live");
await p.close();
// --- perf/a11y guards
const r=await fetch(B+"/",{headers:{"Accept-Encoding":"br"}});const t=await r.text();
ok(t.includes("window.__ST=")&&t.includes('rel="preload" as="image" href="/img/hero-sm.webp"'),"home inlines public state + preloads mobile hero");
ok(!/"email":"demo-/.test(t.split("window.__ST=")[1].split("</script>")[0]),"inlined state has no private emails");
ok(errs.length===0,"no console errors "+errs.slice(0,3).join(" | "));await br.close();process.exit(fail?1:0)})();
