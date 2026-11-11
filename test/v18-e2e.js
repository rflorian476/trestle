// v18 end-to-end: SW-045 (no JSON-LD while the host isn't indexable), SW-024 (realistic seed names), SW-010/SW-011
// (contrast + heading order on the pages QA still flagged), SW-036 follow-through (server-side field limits, maxlength +
// counter in the browser, long words wrap), Account → Your data (export), demo password lock, and the new
// Change password dialog with the one-time-code "Forgot your current password?" path.
// usage: node test/v18-e2e.js http://localhost:8899 [shotdir]   (NODE_PATH must include playwright and axe-core)
const {chromium}=require("playwright");const fs=require("fs");
const B=(process.argv[2]||"http://localhost:8899").replace(/\/$/,"");const OUT=process.argv[3]||"";let fail=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)fail++};
if(OUT)fs.mkdirSync(OUT,{recursive:true});
const PW="sawyer-demo-2026",run=Date.now().toString(36);
let AXE="";try{AXE=fs.readFileSync(require.resolve("axe-core/axe.min.js"),"utf8")}catch(e){}
async function req(p,{method="GET",body,cookie,headers}={}){const h=Object.assign({},headers||{});if(body!==undefined&&!h["Content-Type"])h["Content-Type"]="application/json";if(cookie)h.Cookie=cookie;
 const r=await fetch(B+p,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body),redirect:"manual"});const t=await r.text();let j=null;try{j=JSON.parse(t)}catch(e){}
 const sc=(r.headers.get("set-cookie")||"").match(/swsid=([^;]*)/);return{code:r.status,j,t,headers:r.headers,cookie:sc&&sc[1]?"swsid="+sc[1]:null}}
const login=email=>req("/api/login",{method:"POST",body:{email,password:PW}});
const act=(cookie,name,args)=>req("/api/act",{method:"POST",cookie,body:{name,args}});
const signup=(kind,data,pw)=>req("/api/signup",{method:"POST",body:{kind,password:pw||"v18-pass-"+run,data}});
const shot=async(p,n)=>{if(OUT)await p.screenshot({path:OUT+"/"+n+".png"})};
async function ctxFor(br,cookie,w){const c=await br.newContext({viewport:{width:w||1440,height:w&&w<500?844:900},bypassCSP:true});if(cookie)await c.addCookies([{name:"swsid",value:cookie.replace(/^swsid=/,""),url:B}]);return c}
async function audit(pg){return pg.evaluate(()=>{const hs=[...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(h=>h.offsetParent||h.classList.contains("sr-only"));const skips=[];let prev=0;
 for(const h of hs){const l=+h.tagName[1];if(prev&&l>prev+1)skips.push(h.tagName+": "+h.textContent.trim().slice(0,40));prev=l}
 return{h1:hs.filter(h=>h.tagName==="H1").length,skips,over:document.documentElement.scrollWidth>document.documentElement.clientWidth}})}
async function contrast(pg){if(!AXE)return null;await pg.addScriptTag({content:AXE});return pg.evaluate(async()=>(await axe.run(document,{runOnly:["color-contrast"]})).violations.flatMap(v=>v.nodes.map(n=>n.html.slice(0,80))))}
(async()=>{
// ===== SW-045 =====
{const h=await req("/");ok(h.code===200&&/name="robots" content="noindex, nofollow"/.test(h.t),"SW-045: beta home still carries robots noindex");
 ok(!h.t.includes("application/ld+json")&&!h.t.includes('"@type":"Organization"'),"SW-045: beta home has no Organization JSON-LD while the host is not indexable");
 const p=await req("/prices");ok(p.code===200&&!p.t.includes("application/ld+json"),"SW-045: marketing routes have no JSON-LD either")}
// ===== SW-024 =====
{const st=(await req("/api/state")).j.state;const names=(st.users||[]).map(u=>u.name||"");
 const bad=names.filter(n=>/\b(Homeowner|Renter|Cottage|Buildwell|Framer|Placeholder|Fakeson|Example|Testwell|Sample|Mockler|Faux|Seaside|Peachtree|Northwood)\b/.test(n));
 ok(names.length>40&&bad.length===0,"SW-024: seed names read as real people ("+names.length+" users)",bad.join(", "));
 const h=await login("demo-homeowner@sawyer.test");ok(h.code===200&&(h.j.state.users.find(u=>u.id===h.j.state.me)||{}).name==="Pat Hollis","SW-024: demo homeowner is Pat Hollis (short name stays 'Pat H.')")}
const br=await chromium.launch();
// ===== SW-010 / SW-011 =====
{const pages=[[null,"pros"],[null,"projects"],[null,"jobs"],["demo-pm@sawyer.test","projects"],["demo-pro@sawyer.test","schedule"],["demo-pro@sawyer.test","bills"],["demo-pro@sawyer.test","jobs"],["demo-homeowner@sawyer.test","saved"],["demo-traveler@sawyer.test","perdiem"]];
 const ck={};for(const [who,v] of pages){if(who&&!ck[who])ck[who]=(await login(who)).cookie;const c=await ctxFor(br,who&&ck[who]);const pg=await c.newPage();await pg.goto(B+"/#/"+v,{waitUntil:"networkidle"});await pg.waitForTimeout(300);
  const a=await audit(pg);ok(a.h1===1&&!a.skips.length,`SW-011: ${who?who.split("@")[0]:"signed-out"} #/${v} has one H1 and no skipped heading levels`,JSON.stringify(a));
  const cc=await contrast(pg);if(cc)ok(!cc.length,`SW-010: ${who?who.split("@")[0]:"signed-out"} #/${v} has no axe color-contrast failures`,cc.join(" | "));await c.close()}
 // empty state title is an H2 that keeps the H3 look
 const S=await signup("pro",{name:"Eli Empty",email:"v18-empty-"+run+"@sawyer.test",biz:"Eli Empty Electric",trade:"Electrical",zip:"78704"});
 const c=await ctxFor(br,S.cookie);const pg=await c.newPage();await pg.goto(B+"/#/bills",{waitUntil:"networkidle"});
 const e=await pg.evaluate(()=>{const h=document.querySelector(".empty .empty-h");return h&&{tag:h.tagName,fs:parseFloat(getComputedStyle(h).fontSize)}});ok(e&&e.tag==="H2"&&e.fs>17&&e.fs<20,"SW-011: empty-state title is an H2 at the old H3 size",JSON.stringify(e));await c.close()}
// ===== SW-036: server-side limits =====
{const S=await signup("pro",{name:"Lena Limits",email:"v18-lim-"+run+"@sawyer.test",biz:"Lena Limits Plumbing",trade:"Plumbing",zip:"78704"});const ck=S.cookie;ok(S.code===200&&ck,"throwaway pro for field limits");
 const C=await signup("customer",{name:"Cal Customer",email:"v18-lim-cu-"+run+"@sawyer.test",zip:"78704"});
 const cases=[["send",[C.j.res.id,"x".repeat(2001)],/message under 2,000/],["updatePro",[{bio:"b".repeat(1501)}],/bio under 1,500/],["quote",["j1",120,"n".repeat(1001)],/quote note under 1,000/],
  ["updateMe",[{name:"N".repeat(81)}],/name under 80/],["postProject",[{title:"T".repeat(121),roles:[{trade:"Electrical",need:1}]}],/title under 120/],["reply",["r1","y".repeat(1001)],/reply under 1,000/]];
 for(const [n,a,re] of cases){const r=await act(ck,n,a);ok(r.code===400&&re.test(r.j&&r.j.error||"")&&r.j.res&&r.j.res.ok===false,`SW-036: ${n} over the limit → 400 "${(r.j&&r.j.error)||""}"`,r.code+" "+r.t.slice(0,160))}
 const at=await act(C.cookie,"send",[S.j.res.id,"z".repeat(2000)]);ok(at.code===200&&at.j.res.ok!==false,"SW-036: a message of exactly 2,000 characters is accepted",at.t.slice(0,160));
 const sg=await signup("pro",{name:"Bo Biz",email:"v18-lim-sg-"+run+"@sawyer.test",biz:"B".repeat(81),trade:"Roofing",zip:"78704"});ok(sg.code===400&&/business name under 80/.test(sg.j.error),"SW-036: sign-up refuses an 81-character business name",sg.t.slice(0,160));
 // long unbroken words wrap at 390
 const H=await signup("customer",{name:"Wren Wrap",email:"v18-wrap-"+run+"@sawyer.test",zip:"78704"});
 const pj=await act(H.cookie,"postJob",[{title:"W".repeat(90),cat:"plumbing",zip:"78704",desc:"D".repeat(1999)}]);const jid=pj.j&&pj.j.res&&pj.j.res.id;ok(!!jid,"posted a job with a 90-char title and a 1,999-char unbroken description",pj.t.slice(0,160));
 await act(H.cookie,"send",["c1","M".repeat(1999)]);
 const c=await ctxFor(br,H.cookie,390);const pg=await c.newPage();
 for(const v of ["job/"+jid,"msgs/c1","dash"]){await pg.goto(B+"/#/"+v,{waitUntil:"networkidle"});await pg.waitForTimeout(300);const a=await audit(pg);ok(!a.over,"SW-036: no sideways scroll at 390 on #/"+v.replace(jid,"<long job>")+" with unbroken text");await shot(pg,"v18-wrap-"+v.split("/")[0]+"-390")}
 // composer gets the 2,000 limit and a counter near the end
 await pg.goto(B+"/#/msgs/c1",{waitUntil:"networkidle"});await pg.focus("#mtxt");const ml=await pg.$eval("#mtxt",e=>e.maxLength);ok(ml===2000,"SW-036: chat composer is capped at 2,000 characters in the browser",ml);
 await pg.fill("#mtxt","q".repeat(1700));await pg.dispatchEvent("#mtxt","input");const cnt=await pg.evaluate(()=>{const c=document.querySelector("#mtxt+.v18-cnt");return c&&!c.hidden?c.textContent:""});ok(/300 characters left/.test(cnt),"SW-036: a counter appears once the message is 80% of the limit",cnt);
 await c.close()}
// ===== Your data (export) =====
{const S=await signup("customer",{name:"Dee Data",email:"v18-data-"+run+"@sawyer.test",zip:"78704"});const ck=S.cookie;
 await act(ck,"postJob",[{title:"Fence repair after storm",cat:"fencing",zip:"78704",desc:"Two panels down"}]);
 const no=await req("/api/account/export");ok(no.code===401,"export: signed out → 401",no.code);
 const r=await req("/api/account/export",{cookie:ck});ok(r.code===200&&/attachment; filename="sawyer-data-\d{4}-\d\d-\d\d\.json"/.test(r.headers.get("content-disposition")||""),"export: 200 as a dated JSON attachment",r.headers.get("content-disposition"));
 const j=r.j||{};ok(j.account&&j.account.email==="v18-data-"+run+"@sawyer.test"&&j.account.password===true&&j.profile&&j.profile.name==="Dee Data","export: account and profile are yours");
 ok((j.jobs||[]).some(x=>x.title==="Fence repair after storm"),"export: includes the job you posted");
 ok(!/"(hash|salt|token|code_hash|link_hash|jwk|cred_id|swsid)"\s*:/.test(r.t),"export: no password hash, salt, session token or passkey key");
 const emails=(r.t.match(/[\w.+-]+@[\w-]+\.[\w.]+/g)||[]).filter(e=>e!=="v18-data-"+run+"@sawyer.test");ok(!emails.length,"export: no other account's email address",emails.join(","));
 const c=await ctxFor(br,ck);const pg=await c.newPage();await pg.goto(B+"/#/account",{waitUntil:"networkidle"});
 const card=await pg.evaluate(()=>{const d=document.getElementById("dataExport"),del=document.getElementById("delAcct");const a=document.getElementById("exportGo");return d&&a&&{href:a.getAttribute("href"),dl:a.hasAttribute("download"),before:!!(del&&d.compareDocumentPosition(del)&Node.DOCUMENT_POSITION_FOLLOWING)}});
 ok(card&&card.href==="/api/account/export"&&card.dl&&card.before,"Account shows Your data → Download my data, above Delete account",JSON.stringify(card));
 const [dl]=await Promise.all([pg.waitForEvent("download",{timeout:8000}).catch(()=>null),pg.click("#exportGo")]);ok(dl&&/^sawyer-data-.*\.json$/.test(dl.suggestedFilename()),"clicking Download my data saves sawyer-data-<date>.json",dl&&dl.suggestedFilename());
 await shot(pg,"v18-account-1440");await c.close()}
// ===== demo password lock =====
{const d=await login("demo-remodeler@sawyer.test");const r=await req("/api/account/password",{method:"POST",cookie:d.cookie,body:{password:"hijack-pass-123",current:PW}});
 ok(r.code===400&&/Demo accounts are shared/.test(r.j&&r.j.error||""),"demo accounts: password change refused",r.code+" "+r.t.slice(0,120));
 ok((await login("demo-remodeler@sawyer.test")).code===200,"demo accounts: the shared password still works afterwards");
 const c=await ctxFor(br,d.cookie);const pg=await c.newPage();await pg.goto(B+"/#/account",{waitUntil:"networkidle"});await pg.click("#setPw");await pg.waitForSelector("#pw18Ok");
 ok(!(await pg.$("#pw18")),"demo accounts: the dialog explains instead of showing a form");await c.close()}
// ===== Change password dialog + forgot =====
{const em="v18-pw-"+run+"@sawyer.test";const S=await signup("customer",{name:"Pia Password",email:em,zip:"78704"},"first-pass-123");
 const c=await ctxFor(br,S.cookie,390);const pg=await c.newPage();const errs=[];pg.on("pageerror",e=>errs.push(e.message));
 await pg.goto(B+"/#/account",{waitUntil:"networkidle"});await pg.click("#setPw");await pg.waitForSelector("#pw18");
 ok(await pg.isDisabled("#npwGo"),"dialog: Save is disabled until the form is valid");
 ok(!!(await pg.$("#cpw"))&&!!(await pg.$("#npw2"))&&!!(await pg.$("#pw18Forgot")),"dialog: current, new, confirm and 'Forgot your current password?'");
 await pg.fill("#npw","short");ok(/3 more characters/.test(await pg.textContent("#npwHint")),"dialog: live length hint");
 await pg.fill("#cpw","wrong-pass-1");await pg.fill("#npw","second-pass-456");await pg.fill("#npw2","second-pass-45");ok(/don't match/.test(await pg.textContent("#npwHint"))&&await pg.isDisabled("#npwGo"),"dialog: mismatch is called out and blocks Save");
 await pg.fill("#npw2","second-pass-456");await pg.click("[data-eye=npw]");ok((await pg.getAttribute("#npw","type"))==="text"&&(await pg.getAttribute("[data-eye=npw]","aria-pressed"))==="true","dialog: Show reveals the password (aria-pressed)");
 await pg.press("#npw2","Enter");await pg.waitForSelector("#pw18Err:not([hidden])");ok(/current password isn't right/.test(await pg.textContent("#pw18Err")),"dialog: wrong current password shows inline (Enter submits)");
 await shot(pg,"v18-password-dialog-390");
 await pg.fill("#cpw","first-pass-123");await pg.click("#npwGo");await pg.waitForFunction(()=>!document.getElementById("pw18"),null,{timeout:5000}).catch(()=>{});
 ok((await req("/api/login",{method:"POST",body:{email:em,password:"second-pass-456"}})).code===200,"dialog: right current password changes it");
 await pg.click("#setPw");await pg.click("#pw18Forgot");await pg.click("#pw18Send");await pg.waitForSelector("#pw18Code:not([hidden])");const note=await pg.textContent("#pw18Note");const code=(note.match(/(\d{6})/)||[])[1];
 ok(!!code,"forgot: a one-time code is sent to the account email (test mode shows it)",note);
 await pg.fill("#pw18c","000000"===code?"111111":"000000");await pg.click("#pw18Verify");await pg.waitForSelector("#pw18Err:not([hidden])");ok(/Wrong code/.test(await pg.textContent("#pw18Err")),"forgot: a wrong code is refused inline");
 await pg.fill("#pw18c",code);await pg.click("#pw18Verify");await pg.waitForSelector("#pw18");ok(!(await pg.$("#cpw"))&&(await pg.textContent("#mtitle"))==="Set a new password","forgot: after the code, set a new password without the old one");
 await pg.fill("#npw","third-pass-789");await pg.fill("#npw2","third-pass-789");await pg.click("#npwGo");await pg.waitForFunction(()=>!document.getElementById("pw18"),null,{timeout:5000}).catch(()=>{});
 ok((await req("/api/login",{method:"POST",body:{email:em,password:"third-pass-789"}})).code===200,"forgot: the new password works");
 ok(!errs.length,"no page errors in the password flows",errs.join(" | "));await c.close()}
await br.close();
console.log(fail?fail+" FAILED":"ALL PASS");process.exit(fail?1:0)})().catch(e=>{console.log("FAIL crashed: "+e.stack);process.exit(1)});
