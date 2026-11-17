// v44: regenerates src/dash-css.json, the selectors and class names the signed-in /dash stylesheet subset keeps.
// Starts its own server (temp data, local test mode), opens real dashboards (every demo account plus brand-new pro,
// customer and PM accounts, at 390 and 1300 wide), and records every selector of the full app CSS that matches
// something on the page, plus every class name present. Run it after changing dashboard markup, then rebuild:
//   NODE_PATH=/workspace/tools/node_modules node tools/dash-css.js && NODE_PATH=/workspace/tools/node_modules node build-live.js
// test/v44-e2e.js fails if a dashboard needs a rule the subset doesn't have.
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path");
const {chromium}=require("playwright");const ROOT=path.join(__dirname,"..");const split=require(path.join(ROOT,"lib/css-split.js"));
function freePort(){return new Promise((res,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>res(p))});s.on("error",no)})}
const ACCTS=["demo-pro","demo-electrical","demo-remodeler","demo-homeowner","demo-pm","demo-traveler","demo-trust","demo-business"].map(x=>x+"@sawyer.test");
// in-page matcher (also used by test/v44-e2e.js): conservative, a selector counts if it, its static form, or its base matches
const MATCH=`(sel)=>{const q=s=>{try{return!!document.querySelector(s)}catch(e){return null}};
 const dyn=/:(hover|focus|focus-visible|focus-within|active|visited|link|any-link|target|checked|disabled|enabled|invalid|valid|placeholder-shown|autofill|-webkit-autofill|user-invalid|indeterminate|default|required|optional|read-only|read-write|empty|popover-open|open|modal|fullscreen)(?![\\w-])/g;
 const pe=/::?(before|after|placeholder|selection|marker|first-line|first-letter|backdrop|file-selector-button|-webkit-[\\w-]+|-moz-[\\w-]+)(?![\\w-])/g;
 let base=sel;for(let i=0;i<5;i++)base=base.replace(/:[\\w-]+\\([^()]*\\)/g,"");base=base.replace(/::?[\\w-]+/g,"").trim();
 const a=q(sel);if(a)return true;const b=q(sel.replace(pe,"").replace(dyn,"")||"*");if(b)return true;const c=q(base||"*");return!!c}`;
(async()=>{const port=await freePort(),dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-dashcss-")),B="http://127.0.0.1:"+port;
 const env=Object.assign({},process.env,{HOST:"127.0.0.1",PORT:String(port),DATA_DIR:dir,RATE_X:"50"});for(const k of["NODE_ENV","RENDER","RESEND_API_KEY","SENDGRID_API_KEY","TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN"])delete env[k];
 const child=spawn(process.execPath,[path.join(ROOT,"server.js")],{env,stdio:["ignore","pipe","pipe"]});let log="";child.stdout.on("data",d=>log+=d);child.stderr.on("data",d=>log+=d);
 for(let i=0;i<150&&!/live on/.test(log);i++)await new Promise(r=>setTimeout(r,100));
 // both the full new-headless Chromium (same features as Chrome for real people, e.g. push alerts) and the headless shell
 const brs=[await chromium.launch({channel:"chromium"}),await chromium.launch()];const used=new Set(),classes=new Set();let pages=0;
 try{const cssName=fs.readdirSync(path.join(ROOT,"public/css")).find(f=>/^app\.[0-9a-f]+\.css$/.test(f));const all=split.allSelectors(fs.readFileSync(path.join(ROOT,"public/css",cssName),"utf8"));
  const run="d"+Date.now().toString(36);const logins=[];
  for(const e of ACCTS)logins.push({email:e});
  for(const kind of["pro","customer","pm"])logins.push({signup:kind});
  for(const br of brs)for(const L of logins){for(const w of[390,1300]){const c=await br.newContext({viewport:{width:w,height:w<500?844:900},deviceScaleFactor:1,hasTouch:w<500});
   try{let r;if(L.email)r=await c.request.post(B+"/api/login",{data:{email:L.email,password:"sawyer-demo-2026"}});
    else{const email="dashcss-"+L.signup+"-"+w+"-"+brs.indexOf(br)+"-"+run+"@example.com";r=await c.request.post(B+"/api/signup",{data:{kind:L.signup,password:"dash-css-horse-1",data:Object.assign({name:"Dash Css",email,zip:"49660"},L.signup==="pro"?{biz:"Dash CSS Plumbing",trade:"Plumbing",phone:"2315550100",plan:"founding"}:L.signup==="pm"?{biz:"Dash CSS Builders"}:{})}})}
    if(r.status()!==200){console.log("skip",L.email||L.signup,r.status());continue}
    const p=await c.newPage();await p.goto(B+"/dash",{waitUntil:"networkidle"});
    await p.waitForFunction(()=>typeof __PART!=="undefined"&&!__PART&&typeof me==="function"&&!!me(),null,{timeout:30000});await p.waitForTimeout(1200);
    await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){scrollTo(0,y);await new Promise(r=>setTimeout(r,60))}scrollTo(0,0)});await p.waitForTimeout(400);
    const res=await p.evaluate(([all,M])=>{const m=eval(M);return{u:all.filter(s=>m(s)),c:[...new Set([...document.querySelectorAll("[class]")].flatMap(e=>[...e.classList]))]}},[all,MATCH]);
    res.u.forEach(s=>used.add(s));res.c.forEach(s=>classes.add(s));pages++;console.log((brs.indexOf(br)?"shell ":"chrome ")+(L.email||"new "+L.signup)+" @"+w+": "+res.u.length+" selectors, "+res.c.length+" classes")}
   finally{await c.close()}}}
  // always in the subset: the shell pieces that can appear without a click (toasts, beta bar, skeletons, modal frame)
  for(const s of all)if(/(^|[\s>+~,(])(\.toast|#toasts|\.betabar|\.sk11|\.skel|#modal|\.mbox|\.sr-only|\.skip)/.test(s))used.add(s);
  const out={note:"Generated by tools/dash-css.js. Selectors of the full app CSS that match a signed-in dashboard, and the class names seen there.",pages,selectors:all.filter(s=>used.has(s)),classes:[...classes].sort()};
  fs.writeFileSync(path.join(ROOT,"src/dash-css.json"),JSON.stringify(out,null,0)+"\n");console.log("wrote src/dash-css.json:",out.selectors.length,"of",all.length,"selectors,",out.classes.length,"classes from",pages,"dashboards")}
 finally{for(const b of brs)await b.close();child.kill("SIGTERM");setTimeout(()=>{try{fs.rmSync(dir,{recursive:true,force:true})}catch(e){}},500)}})().catch(e=>{console.error(e);process.exit(1)});
module.exports={MATCH};
