// Security hotfix checks (SW-001 .. SW-009 from QA sweep 1): privilege escalation closed, real HTTP status codes,
// signed-out state redaction, security headers + CSP with zero violations, pretty URLs, login limiter, light theme only,
// no stock photos as a pro's own work.
// usage: node test/hotfix-e2e.js http://localhost:8910   (NODE_PATH must include playwright; optional ADMIN_TOKEN = server's)
const {chromium}=require("playwright");const B=(process.argv[2]||"http://localhost:8910").replace(/\/$/,"");let fail=0;const errs=[];
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||!extra?"":" :: "+String(extra).slice(0,300)));if(!c)fail++};
const PW="sawyer-demo-2026",run=Date.now().toString(36);
async function req(path,{method="GET",body,cookie,headers={}}={}){const h=Object.assign({},headers);if(body!==undefined&&!h["Content-Type"])h["Content-Type"]="application/json";if(cookie)h.Cookie=cookie;
 const r=await fetch(B+path,{method,headers:h,body:body===undefined?undefined:(typeof body==="string"||Buffer.isBuffer(body)?body:JSON.stringify(body)),redirect:"manual"});
 const t=await r.text();let j=null;try{j=JSON.parse(t)}catch(e){}const sc=(r.headers.get("set-cookie")||"").match(/swsid=([^;]*)/);return{code:r.status,j,t,h:r.headers,cookie:sc&&sc[1]?"swsid="+sc[1]:null}}
const login=async(email,pw=PW)=>{const r=await req("/api/login",{method:"POST",body:{email,password:pw}});return r};
const act=(cookie,name,...args)=>req("/api/act",{method:"POST",cookie,body:{name,args}});
const meOf=(st,id)=>st.users.find(u=>u.id===id);
(async()=>{
 /* ---------- SW-001: no self-granted staff / verified ---------- */
 {const L=await login("demo-business@sawyer.test");ok(L.code===200&&L.cookie,"business demo login works",L.code);const ck=L.cookie;
  const r=await act(ck,"updatePro",{staff:true,verified:true,license:"X-999",insurance:"INS-1",bio:"pwned"});
  const b1=meOf(r.j.state,"b1");ok(r.code===403&&r.j.status===403,"customer calling updatePro is refused with HTTP 403",r.code+" "+r.t.slice(0,120));
  ok(b1&&!b1.staff&&!b1.verified&&b1.bio!=="pwned"&&!b1.license,"customer record unchanged (no staff, no verified, no pro fields)",JSON.stringify(b1));
  const r2=await act(ck,"updateMe",{name:"Rosa Delgado",staff:true,verified:true,role:"contractor",admin:true});const b2=meOf(r2.j.state,"b1");
  ok(b2&&!b2.staff&&!b2.verified&&!b2.admin&&b2.role==="customer","updateMe ignores staff/verified/role/admin",JSON.stringify(b2).slice(0,200))}
 let proCk,proId;
 {const email=`hf-pro-${run}@example.com`;const r=await req("/api/signup",{method:"POST",body:{kind:"pro",password:"correct-horse-9",data:{name:"Hotfix Tester",biz:"Hotfix Electric "+run,email,trade:"Electrical",zip:"78704",license:"TX-12345",insurance:"Acme $1M",plan:"lifetime-free",verified:true,staff:true,bg:true}}});
  proCk=r.cookie;proId=r.j&&r.j.state&&r.j.state.me;const u=proId&&meOf(r.j.state,proId);
  ok(r.code===200&&u,"pro signs up",r.code+" "+r.t.slice(0,160));
  ok(u&&u.verified===false&&!u.staff&&u.bg===false&&u.plan==="founding","new pro is NOT verified from typed license text; staff/bg/plan not client-settable",JSON.stringify(u&&{v:u.verified,s:u.staff,bg:u.bg,plan:u.plan}));
  const x=await act(proCk,"updatePro",{staff:true,verified:true,bg:true,paid:true,role:"customer",id:"c1",email:"evil@x.com",founding:true,rate:"$95/hr",bio:"Licensed master electrician",license:"TX-99999",insurance:"Big Mutual $2M",__proto__:{staff:true}});
  const v=meOf(x.j.state,proId);
  ok(x.code===200&&x.j.res&&x.j.res.ok,"pro can still edit their own profile",x.t.slice(0,160));
  ok(v&&v.rate==="$95/hr"&&v.bio==="Licensed master electrician"&&v.license==="TX-99999","allowlisted fields saved (rate, bio, license)",JSON.stringify(v).slice(0,200));
  ok(v&&!v.staff&&v.verified===false&&v.bg===false&&v.role==="contractor"&&v.id===proId&&v.email!=="evil@x.com","staff/verified/bg/role/id/email cannot be self-granted via updatePro",JSON.stringify(v&&{s:v.staff,v:v.verified,bg:v.bg,role:v.role,id:v.id,email:v.email}));
  // a verified demo pro who edits license text loses the badge until it's re-checked
  const P=await login("demo-pro@sawyer.test");const y=await act(P.cookie,"updatePro",{license:"FAKE-LIC"});const c1=meOf(y.j.state,"c1");
  ok(c1&&c1.verified===false,"changing license text clears Verified until re-checked",JSON.stringify(c1&&c1.verified));
  const z=await act(P.cookie,"updatePro",{staff:true,verified:true});ok(!meOf(z.j.state,"c1").verified&&!meOf(z.j.state,"c1").staff,"verified pro can't re-grant verified/staff");
  // staff-only verify action
  const no=await req("/api/staff/verify",{method:"POST",cookie:P.cookie,body:{uid:"c1"}});ok(no.code===404,"staff verify endpoint hidden without the server admin token",no.code);
  const bad=await req("/api/staff/verify",{method:"POST",headers:{"x-admin-token":"wrong-token-value"},body:{uid:"c1"}});ok(bad.code===404,"staff verify endpoint refuses a wrong token",bad.code);
  if(process.env.ADMIN_TOKEN){const g=await req("/api/staff/verify",{method:"POST",headers:{"x-admin-token":process.env.ADMIN_TOKEN},body:{uid:"c1"}});ok(g.code===200&&g.j.verified===true,"staff (admin token) can verify a pro",g.t);
   const st=(await req("/api/state")).j.state;ok(meOf(st,"c1").verified===true,"verified restored by staff action")}
  // hire must target a real pro
  const H=await login("demo-homeowner@sawyer.test");const st=(await req("/api/state",{cookie:H.cookie})).j.state;const j=st.jobs.find(x=>x.cust==="u1"&&x.status==="posted");
  if(j){const h=await act(H.cookie,"hire",j.id,"b1");ok(h.code===400&&meOf(h.j.state,"u1")&&!h.j.state.jobs.find(x=>x.id===j.id).hired,"hire() refuses a non-pro id",h.code)}}
 /* ---------- SW-027..029: job lifecycle (hire / complete / review) ---------- */
 {const H=await login("demo-homeowner@sawyer.test");const ck=H.cookie;const post=async t=>{const r=await act(ck,"postJob",{title:t+" "+run,cat:"Plumbing",desc:"Kitchen sink drips at the base, need a fix",zip:"78704"});return r.j.res&&r.j.res.id};
  const j1=await post("Hotfix lifecycle A");ok(!!j1,"customer posts a job");const J=st=>st.jobs.find(x=>x.id===j1);
  let r=await act(ck,"complete",j1);ok(r.j.res&&r.j.res.ok===false&&J(r.j.state).status==="posted","a job with no hire can't be marked complete (SW-028)",JSON.stringify(r.j.res));
  r=await act(ck,"review",j1,{quality:5,communication:5,timeliness:5,value:5},"Great work on a job nobody was hired for.");ok(r.j.res&&r.j.res.ok===false&&!r.j.state.reviews.some(x=>x.job===j1),"no review on a job nobody was hired for (SW-029)",JSON.stringify(r.j.res));
  r=await act(ck,"hire",j1,"c1");ok(r.j.res&&r.j.res.ok&&J(r.j.state).hired==="c1","hire a pro on an open job");
  r=await act(ck,"hire",j1,"c26");ok(r.j.res&&r.j.res.ok===false&&J(r.j.state).hired==="c1","can't silently switch to a different pro after hiring (SW-027)",JSON.stringify(r.j.res));
  r=await act(ck,"complete",j1);ok(r.j.res&&r.j.res.ok&&J(r.j.state).status==="completed","hired job can be completed");
  r=await act(ck,"hire",j1,"c26");ok(r.j.res&&r.j.res.ok===false&&J(r.j.state).status==="completed"&&J(r.j.state).hired==="c1","a completed job can't be re-hired (SW-027)",JSON.stringify(r.j.res));
  r=await act(ck,"review",j1,{quality:5,communication:5,timeliness:5,value:5},"Fixed the leak fast and cleaned up after.");const rv=r.j.state.reviews.find(x=>x.job===j1);ok(r.j.res&&r.j.res.ok&&rv&&rv.cid==="c1","verified review is tied to the hired pro",JSON.stringify(rv));
  const j2=await post("Hotfix lifecycle B");for(const who of ["tv1","u2","b1","m1","nope"]){r=await act(ck,"hire",j2,who);ok((r.code===400||(r.j.res&&r.j.res.ok===false))&&!J2(r.j.state),"can't hire a non-pro / missing id: "+who,r.code+" "+JSON.stringify(r.j.res||r.j.error))}
  function J2(st){const x=st.jobs.find(y=>y.id===j2);return x&&x.hired}}
 /* ---------- SW-030/031: messaging needs a real account + connection ---------- */
 {const H=await login("demo-homeowner@sawyer.test");let r=await act(H.cookie,"send","no-such-user","hello?");ok(r.j.res&&r.j.res.ok===false&&!r.j.state.msgs.some(m=>m.b==="no-such-user"||m.a==="no-such-user"),"message to a missing account is refused, no orphan thread",JSON.stringify(r.j.res));
  r=await act(H.cookie,"send","u2","unsolicited hello from another homeowner");ok(r.j.res&&r.j.res.ok===false,"customer can't cold-message an unrelated customer",JSON.stringify(r.j.res));
  r=await act(H.cookie,"send","c5","Hi, are you free next week for a small repair?");ok(r.j.res&&r.j.res.ok!==false,"customer can contact a pro from the pro's profile",JSON.stringify(r.j.res));
  const P=await login("demo-pro@sawyer.test");r=await act(P.cookie,"send","u1","Thanks, see you Tuesday.");ok(r.j.res&&r.j.res.ok!==false,"pro can reply to a customer they work with",JSON.stringify(r.j.res));
  const T=await login("demo-traveler@sawyer.test");r=await act(T.cookie,"send","u2","random message");ok(r.j.res&&r.j.res.ok===false,"traveler can't cold-message an unrelated homeowner",JSON.stringify(r.j.res))}
 /* ---------- SW-032: password change needs the current password ---------- */
 {const email=`hf-cu-${run}@example.com`,pw1="first-pass-123",pw2="second-pass-456";const s1=await req("/api/signup",{method:"POST",body:{kind:"customer",password:pw1,data:{name:"Pat Hotfix",email,zip:"78704"}}});ok(s1.code===200,"throwaway customer signs up",s1.code);
  const c2=(await login(email,pw1)).cookie;
  let r=await req("/api/account/password",{method:"POST",cookie:s1.cookie,body:{password:pw2}});ok(r.code===403,"password change without the current password = 403",r.code);
  r=await req("/api/account/password",{method:"POST",cookie:s1.cookie,body:{password:pw2,current:"wrong-guess-1"}});ok(r.code===403,"wrong current password = 403",r.code);
  r=await req("/api/account/password",{method:"POST",cookie:s1.cookie,body:{password:pw2,current:pw1}});ok(r.code===200,"right current password changes it",r.code);
  ok((await req("/api/account",{cookie:s1.cookie})).code===200,"this session stays signed in");ok((await req("/api/account",{cookie:c2})).code===401,"other sessions are signed out after a password change");
  ok((await login(email,pw1)).code===401&&(await login(email,pw2)).code===200,"old password stops working, new one works")}
 /* ---------- SW-002: real status codes ---------- */
 {const a=await req("/api/account");ok(a.code===401&&a.j.status===401,"GET /api/account signed out = 401",a.code);
  const w=await login("demo-homeowner@sawyer.test","wrong-password");ok(w.code===401,"wrong password = 401",w.code);
  const o=await req("/api/login",{method:"POST",headers:{Origin:"https://evil.example"},body:{email:"a@b.co",password:"x"}});ok(o.code===403,"cross-site POST = 403",o.code);
  const f=await req("/api/login",{method:"POST",headers:{"Content-Type":"text/plain"},body:"x"});ok(f.code===415,"non-JSON POST = 415",f.code);
  const u=await act(null,"nope");ok(u.code===400,"unknown action = 400",u.code);
  const s=await act(null,"fav","c1");ok(s.code===401&&s.j.need==="login","action signed out = 401 (need: login)",s.code);
  const n=await req("/api/nothing-here",{method:"POST",body:{}});ok(n.code===404,"unknown API path = 404",n.code);const n2=await req("/api/nothing-here");ok(n2.code===405,"GET on a POST-only API path = 405",n2.code);
  const up=await req("/api/upload",{method:"POST",headers:{"Content-Type":"image/png"},body:Buffer.from([1,2,3])});ok(up.code===401,"upload signed out = 401",up.code);
  const sg=await req("/api/signup",{method:"POST",body:{kind:"customer",password:"x",data:{name:"A",email:"bad"}}});ok(sg.code===400,"bad signup = 400",sg.code)}
 /* ---------- SW-006: public snapshot redaction ---------- */
 const chk=(st,label)=>{const ph=st.users.filter(u=>u.phone).length,em=st.users.filter(u=>u.email).length,lc=st.users.filter(u=>u.locations||u.recurring||u.plan||u.favs).length,jc=st.jobs.filter(j=>j.cust).length,jd=st.jobs.filter(j=>j.desc).length,es=st.jobs.filter(j=>j.escrow).length,bw=st.users.filter(u=>(u.busy||[]).some(b=>b.why)).length;
  ok(!ph&&!em&&!lc&&!jc&&!jd&&!es&&!bw,label+": no phones, emails, business addresses, plans, job descriptions, customer ids, escrow, private busy reasons",JSON.stringify({ph,em,lc,jc,jd,es,bw}));
  if(st.partial){const pid=st.partial;ok(st.users.some(u=>u.id===pid&&u.role==="contractor")&&(st.reviews||[]).some(r=>r.pro===pid||r.to===pid||r.cid===pid),label+": slim profile state (v16 SW-018) still has that pro and their reviews")}
  else ok(st.users.filter(u=>u.role==="contractor").length>=40&&st.jobs.length>=40&&st.reviews.length>=20,label+": public profiles, job cards and reviews still present")};
 {chk((await req("/api/state")).j.state,"signed-out /api/state");
  // v21 perf: "/" and "/prices" no longer inline the public snapshot (they prefetch /api/state, checked above); /p/<id> inlines its slim state.
  for(const p of ["/","/p/c1","/prices"]){const h=(await req(p)).t;const m=h.match(/<script>window\.__ST=([\s\S]*?)<\/script>/);
   if(p==="/p/c1"){ok(!!m,"__ST inlined on "+p);if(m)chk(JSON.parse(m[1]),"inlined __ST on "+p)}else ok(!m&&/window\.__STP=fetch\("\/api\/state"/.test(h),"no inline snapshot on "+p+"; it prefetches /api/state")}
  const P=await login("demo-pro@sawyer.test");const sp=(await req("/api/state",{cookie:P.cookie})).j.state;
  ok(sp.users.filter(u=>u.role==="contractor"&&u.phone).length>=40,"signed-in viewers see pros' business phones");
  ok(sp.jobs.filter(j=>j.status==="posted"&&j.desc).length>0,"signed-in pros see open job details to quote");
  ok(!sp.users.some(u=>u.id!=="c1"&&(u.email||u.locations)),"signed-in pro sees no one else's email or business addresses");
  const Bz=await login("demo-business@sawyer.test");const sb=(await req("/api/state",{cookie:Bz.cookie})).j.state;ok((meOf(sb,"b1").locations||[]).length>=2,"business still sees its own locations");
  ok(!sb.jobs.some(j=>j.cust&&j.cust!=="b1"&&j.hired!=="b1"&&j.desc),"customers don't see other customers' job descriptions")}
 /* ---------- SW-003/004: headers ---------- */
 {for(const p of ["/","/p/c1","/t/tcd1","/prices"]){const r=await req(p);const csp=r.h.get("content-security-policy")||"";
   ok(r.code===200&&/default-src 'self'/.test(csp)&&/script-src 'self' 'sha256-/.test(csp)&&!/unsafe-inline'[^;]*;?\s*style/.test(csp.split("script-src")[1].split(";")[0])&&/frame-ancestors 'none'/.test(csp)&&/object-src 'none'/.test(csp)&&/base-uri 'self'/.test(csp),"CSP on "+p+" (hash-based scripts, no unsafe-inline scripts)",csp);
   ok(r.h.get("x-frame-options")==="DENY"&&r.h.get("x-content-type-options")==="nosniff"&&!!r.h.get("referrer-policy"),"X-Frame-Options, nosniff, Referrer-Policy on "+p)}
  const hs=await req("/",{headers:{"x-forwarded-proto":"https"}});ok(/max-age=\d{7,}/.test(hs.h.get("strict-transport-security")||""),"HSTS over HTTPS",hs.h.get("strict-transport-security"));
  const hp=await req("/");ok(!hp.h.get("strict-transport-security"),"no HSTS on plain HTTP (local)");
  const js=await req("/api/state");ok(/default-src 'none'/.test(js.h.get("content-security-policy")||""),"API responses carry a deny-all CSP")}
 /* ---------- SW-007: pretty URLs ---------- */
 {for(const p of ["/prices","/find","/post","/pricing","/faq","/jobs","/travel","/signup","/job/j1"]){const r=await req(p);ok(r.code===200&&/text\/html/.test(r.h.get("content-type"))&&/<div id="app"|id="app"/.test(r.t),p+" serves the app (HTML 200)",r.code)}
  const pr=await req("/prices");ok(/<title>Price guide · Sawyer<\/title>/.test(pr.t)&&/rel="canonical" href="[^"]*\/prices"/.test(pr.t),"/prices has its own title + canonical");
  const nf=await req("/definitely-not-a-page");ok(nf.code===404&&/text\/html/.test(nf.h.get("content-type")),"unknown page = HTML 404 (not JSON)",nf.code)}
 /* ---------- SW-009: login limiter ---------- */
 {let okAll=true;for(let i=0;i<15;i++){const r=await login("demo-pm@sawyer.test");if(r.code!==200){okAll=false;break}}ok(okAll,"15 successful logins in a row from one IP are never throttled");
  const victim=`hf-pro-${run}@example.com`;let codes=[];for(let i=0;i<10;i++)codes.push((await login(victim,"nope-"+i)).code);ok(codes.every(c=>c===401),"wrong passwords get 401",codes.join(","));
  const lk=await login(victim,"nope-x");ok(lk.code===429&&lk.h.get("retry-after"),"11th wrong password for that account = HTTP 429 + Retry-After",lk.code);
  const lk2=await login(victim,"correct-horse-9");ok(lk2.code===429,"that account stays throttled from this IP for the window, even with the right password",lk2.code);
  const other=await login("demo-remodeler@sawyer.test");ok(other.code===200,"other accounts on the same IP still sign in (no household/office lockout)",other.code)}
 /* ---------- browser: CSP violations, theme, photos, pretty URLs, delegated handlers ---------- */
 const br=await chromium.launch();
 const page=async(email,w=1300)=>{const ctx=await br.newContext({viewport:{width:w,height:w<500?844:900}});const p=await ctx.newPage();p.setDefaultTimeout(10000);
  p.on("pageerror",e=>errs.push((email||"anon")+" pageerror: "+e.message));p.on("console",m=>{if(m.type()==="error"&&!/Failed to load resource: the server responded with a status of 4\d\d/.test(m.text()))errs.push((email||"anon")+" console: "+m.text())});
  await p.addInitScript(()=>{window.__csp=[];document.addEventListener("securitypolicyviolation",e=>window.__csp.push(e.violatedDirective+" "+(e.blockedURI||"")+" "+(e.sourceFile||"")+":"+e.lineNumber))});
  await p.goto(B+"/");if(email){const r=await p.evaluate(async e=>{const o=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,password:"sawyer-demo-2026"})});return o.status},email);if(r!==200)throw Error("login "+email+" "+r)}return p};
 const nav=async(p,h)=>{await p.goto(B+"/#"+h);await p.reload();await p.waitForTimeout(900)};
 const routes={anon:["/home","/find","/pro/c1","/pros","/pricing","/prices","/jobs","/job/j1","/travel","/traveler/tv1","/tcall/tcd1","/faq","/about","/signup","/credits","/compare","/post"],
  "demo-homeowner@sawyer.test":["/dash","/find","/pro/c1","/msgs","/inbox","/account","/job/j1","/estimate","/saved"],
  "demo-pro@sawyer.test":["/dash","/office","/jobs","/pro/c1","/msgs","/schedule","/account"],
  "demo-business@sawyer.test":["/dash","/bills","/find"],"demo-pm@sawyer.test":["/dash","/projects"],"demo-traveler@sawyer.test":["/dash","/travel","/tdash","/perdiem"]};
 for(const [who,rs] of Object.entries(routes)){const p=await page(who==="anon"?null:who);for(const r of rs)await nav(p,r);const v=await p.evaluate(()=>window.__csp);ok(!v.length,"zero CSP violations: "+who+" ("+rs.length+" pages)",v.join(" | "));
  const th=await p.evaluate(()=>({btn:!!document.getElementById("themeBtn"),t:document.documentElement.dataset.theme,metas:[...document.querySelectorAll('meta[name="theme-color"]')].map(m=>m.content)}));
  ok(!th.btn&&th.t==="light"&&th.metas.length===1&&th.metas[0]==="#F7F6F3","light Linen & Navy only, no theme toggle ("+who+")",JSON.stringify(th));await p.context().close()}
 {const p=await page(null);await p.evaluate(()=>localStorage.setItem("sawyer_prefs",JSON.stringify({theme:"dark"})));await p.reload();await p.waitForTimeout(800);
  const t=await p.evaluate(()=>({t:document.documentElement.dataset.theme,dark:[...document.styleSheets].some(s=>{try{return [...s.cssRules].some(r=>/data-theme=("?)dark/.test(r.cssText))}catch(e){return false}})}));ok(t.t==="light"&&!t.dark,"a saved dark preference is ignored and no dark CSS ships",JSON.stringify(t));
  await nav(p,"/pro/c1");const ph=await p.evaluate(()=>({cap:[...document.querySelectorAll(".gallery figcaption")].map(x=>x.textContent.trim()),ex:[...document.querySelectorAll(".v19-exgal figcaption,.v19-ex")].map(x=>x.textContent.trim()),soon:!!document.querySelector(".sec-soon"),gal:!!document.querySelector(".v19-exgal"),coverAlt:[...document.querySelectorAll(".px-cover img")].map(i=>i.alt).filter(Boolean),stockVerified:[...document.querySelectorAll(".vwork img")].length}));
  ok(!ph.soon&&ph.gal&&ph.ex.every(t=>/^Example of .+ work$/.test(t)||/not photos from this pro/i.test(t))&&!ph.coverAlt.length&&!ph.stockVerified&&!ph.cap.length,"pro profile: example trade photos are labeled honestly, never as this pro's work",JSON.stringify(ph));
  await nav(p,"/find");const fa=await p.evaluate(()=>[...document.querySelectorAll(".pc-img img.art")].filter(i=>i.alt).length);ok(fa===0,"search cards: stock photo is decorative (empty alt), not labeled as the pro's job",fa);
  await p.goto(B+"/prices");await p.waitForTimeout(1200);const pu=await p.evaluate(()=>({h:routeStr(),h1:(document.querySelector("#app h1")||{}).textContent||""}));ok(pu.h.startsWith("#/prices")&&/price|cost/i.test(pu.h1),"typing /prices opens the price guide",JSON.stringify(pu));
  await p.goto(B+"/find?cat=Roofing");await p.waitForTimeout(1200);const pf=await p.evaluate(()=>routeStr());ok(pf==="#/find?cat=Roofing","/find?cat=Roofing keeps its query",pf);
  await nav(p,"/job/j1");const jt=await p.evaluate(()=>(document.querySelector("#app h1")||{}).textContent||"");ok(jt.length>0,"signed-out job page still renders with redacted data",jt);
  await p.context().close()}
 {const p=await page("demo-homeowner@sawyer.test");await nav(p,"/pro/c2");const b=await p.$('[data-csp="toggleFav"]');if(b){const a0=await b.getAttribute("aria-pressed");await b.click();await p.waitForTimeout(700);const b2=await p.$('[data-csp="toggleFav"]');const a1=await b2.getAttribute("aria-pressed");ok(a0!==a1,"save-pro heart works without inline handlers",a0+"→"+a1)}else ok(false,"save button present on profile");
  const v=await p.evaluate(()=>window.__csp);ok(!v.length,"no CSP violations after clicking delegated buttons",v.join("|"));await p.context().close()}
 {const p=await page("demo-homeowner@sawyer.test");await nav(p,"/msgs");const o=await p.evaluate(async()=>{DB.msgs.push({id:"orph",a:me().id,b:"ghost-user",from:me().id,text:"hi",date:Date.now(),read:false});location.hash="#/msgs/ghost-user";await new Promise(r=>setTimeout(r,600));const a=routeStr();location.hash="#/msgs";await new Promise(r=>setTimeout(r,600));return{a,b:routeStr(),h:(document.querySelector("#app h1,#app h2")||{}).textContent||"",find:/All pros near/.test(document.body.innerText)}});
  ok(!o.find&&/^#\/msgs/.test(o.b),"a thread with a missing account doesn't crash the inbox (SW-031)",JSON.stringify(o));
  await nav(p,"/account");const sp=await p.$("#setPw");if(sp){await sp.click();await p.waitForTimeout(400);const f=await p.evaluate(()=>({cur:!!document.getElementById("cpw"),form:!!document.getElementById("pw18"),demo:/Demo accounts are shared/.test((document.querySelector("#modal")||{}).textContent||""),h:(document.querySelector("#modal h2")||{}).textContent}));ok(/Change/.test(f.h)&&f.demo&&!f.form,"Change password on a shared demo account explains it can't be changed (v18; the current-password form itself is covered for real accounts in v18-e2e)",JSON.stringify(f))}else ok(false,"password row on account page");
  await p.context().close()}
 await br.close();
 ok(!errs.length,"zero page errors / console errors (4xx resource logs excluded)",errs.slice(0,6).join(" | "));
 console.log(fail?`\n${fail} FAILED`:"\nALL PASS");process.exit(fail?1:0)})().catch(e=>{console.error("FAIL crashed",e);process.exit(1)});
