const {chromium}=require("playwright");const B=process.argv[2]||"http://localhost:8899";let fail=0,errs=[];
const ok=(c,n)=>{console.log((c?"PASS ":"FAIL ")+n);if(!c)fail++};
(async()=>{const br=await chromium.launch();
async function as(email,w=1300){const p=await br.newPage({viewport:{width:w,height:900}});p.on("pageerror",e=>errs.push(e.message));p.on("console",m=>{if(m.type()==="error")errs.push(m.text())});await p.goto(B+"/");await p.evaluate(async e=>{await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,password:"sawyer-demo-2026"})})},email);return p}
const nav=async(p,r)=>{await p.goto(B+"/#"+r);await p.reload();await p.waitForTimeout(700)};
let p=await as("demo-pro@sawyer.test");await nav(p,"/dash");ok(await p.$(".na8"),"pro dashboard shows next actions");
await nav(p,"/schedule");ok((await p.$$(".vc8")).length>3,"schedule shows visits");
await p.keyboard.press("Control+k");await p.waitForTimeout(300);await p.keyboard.type("water");await p.waitForTimeout(300);ok((await p.$$("#pal8 [role=option]")).length>0,"Cmd-K palette finds results");await p.keyboard.press("Escape");
await nav(p,"/msgs/u1");ok(await p.$(".conv .mc8")&&await p.$("#bubbles"),"messages show job context + bubbles");ok(!(await p.textContent(".conv")).includes("undefined"),"no 'undefined' in conversation");
await p.close();
p=await as("demo-homeowner@sawyer.test",390);await nav(p,"/track/vc10");ok(await p.$(".tk8"),"homeowner sees live job tracker");await nav(p,"/dash");ok(await p.$(".na8"),"homeowner next actions");await p.close();
p=await as("demo-business@sawyer.test");await nav(p,"/dash");ok(await p.$(".na8"),"business owner login + dashboard");await p.close();
const g=async u=>{const r=await fetch(B+u);return[r.status,await r.text()]};
let [s,t]=await g("/sitemap.xml");ok(s===200&&t.includes("<urlset"),"sitemap.xml");[s,t]=await g("/robots.txt");ok(s===200&&t.includes("Sitemap"),"robots.txt");
[s,t]=await g("/p/c1");ok(s===200&&t.includes("application/ld+json")&&t.includes("og:title"),"pro SEO page has OG + JSON-LD");[s,t]=await g("/sw.js");ok(s===200,"service worker served");
ok(errs.length===0,"no console errors "+errs.slice(0,3).join(" | "));await br.close();process.exit(fail?1:0)})();
