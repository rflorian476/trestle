// v7 checks: Office tabs render, customer pays invoice in test mode, privacy of bills, lodging + wallet render.
const {chromium}=require("playwright");const BASE=process.argv[2]||"http://localhost:8899";let fail=0;const errs=[];
const ok=(c,m)=>{console.log((c?"PASS ":"FAIL ")+m);if(!c)fail++};
(async()=>{const b=await chromium.launch();
async function login(e){const c=await b.newContext();const p=await c.newPage();p.setDefaultTimeout(20000);p.on("pageerror",x=>errs.push(x.message));p.on("console",m=>{if(m.type()==="error")errs.push(m.text())});await p.goto(BASE+"/");await p.evaluate(e=>fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,password:"sawyer-demo-2026"})}),e);await p.reload();return p}
const pro=await login("demo-pro@sawyer.test");
for(const t of ["","/invoices","/estimates","/customers","/money","/time","/compliance","/templates","/reports"]){await pro.goto(BASE+"/#/office"+t);await pro.waitForSelector(".o7-tabs");ok((await pro.locator("#app").innerText()).length>500,"office"+(t||"/overview")+" renders")}
for(const r of ["/lodging","/wallet","/perdiem"]){await pro.goto(BASE+"/#"+r);await pro.waitForTimeout(400);ok((await pro.locator("#app h1").count())>0,r+" renders")}
const anon=await (await b.newContext()).newPage();await anon.goto(BASE+"/");const st=await anon.evaluate(()=>fetch("/api/state").then(r=>r.json()));ok(st.state.bills.length===0&&st.state.bcust.length===0,"anon sees no bills/customers");
const cu=await login("demo-homeowner@sawyer.test");await cu.goto(BASE+"/#/pay/bbc11004");await cu.waitForSelector(".o7-paybtn");await cu.click(".o7-paybtn");await cu.waitForSelector(".o7-receipt",{timeout:20000}).catch(()=>{});ok(await cu.locator(".o7-receipt").count()>0,"customer pays invoice (test mode) and sees receipt");
await pro.goto(BASE+"/#/invoice/bbc11004");await pro.reload();await pro.waitForTimeout(800);ok(/Paid/.test(await pro.locator("#app").innerText()),"pro sees invoice paid");
ok(errs.length===0,"no console errors "+errs.join(" | "));await b.close();process.exit(fail?1:0)})();
