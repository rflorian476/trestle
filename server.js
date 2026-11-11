// Sawyer live beta server: Node http + node:sqlite. No external deps.
"use strict";
const http=require("http"),fs=require("fs"),path=require("path"),crypto=require("crypto"),vm=require("vm");
const {DatabaseSync}=require("node:sqlite");
const PORT=+process.env.PORT||8787;
const HOST=process.env.HOST||"0.0.0.0";
const TRUST_PROXY=process.env.TRUST_PROXY!=="0"; // Render/Cloudflare terminate TLS and set x-forwarded-proto
const DATA=process.env.DATA_DIR||path.join(__dirname,"data");fs.mkdirSync(DATA,{recursive:true});
// migrate earlier database names (trestle.db -> spanwise.db -> toolbelt.db -> <slug>.db) so no data is lost
{const dst=path.join(DATA,require("./brand.json").slug+".db");if(!fs.existsSync(dst))for(const old of ["toolbelt.db","spanwise.db","trestle.db"].filter(f=>f!==path.basename(dst))){const src=path.join(DATA,old);if(fs.existsSync(src)){for(const ext of ["","-wal","-shm"])if(fs.existsSync(src+ext))fs.renameSync(src+ext,dst+ext);console.log("migrated",old,"-> toolbelt.db");break}}}
const db=new DatabaseSync(path.join(DATA,require("./brand.json").slug+".db"));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS accounts(uid TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL,role TEXT NOT NULL,created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,uid TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS appdata(k TEXT PRIMARY KEY,v TEXT NOT NULL,updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS uploads(name TEXT PRIMARY KEY,uid TEXT NOT NULL,type TEXT NOT NULL,size INTEGER NOT NULL,created INTEGER NOT NULL);`);
const getKV=db.prepare("SELECT v FROM appdata WHERE k=?"),setKV=db.prepare("INSERT INTO appdata(k,v,updated) VALUES(?,?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v,updated=excluded.updated");
const COLS=["users","jobs","reviews","msgs","quotes","notifs","projects","pmsgs","estimates","tcalls","bills","bcust","bdocs","ledger","tsheets","lodging","creviews","visits","cases","crew","refs","consults","rreq12","reports12","rmrev12"];
const BRAND=require("./brand.json");const APP_VERSION=require("./package.json").version+"-"+BRAND.slug;
const UPLOADS=path.join(DATA,"uploads");fs.mkdirSync(UPLOADS,{recursive:true});
const MAX_UPLOAD=5*1024*1024;
const IMGSAFE=require("./lib/imgsafe.js");

/* ---- shared business rules: the same A.* actions the UI was built on, run server-side ---- */
let VER=Date.now(),allowAuto=false,dirty=false,PUB_ST={t:0,s:"",v:0};
function anyStub(){const f=function(){return p};const p=new Proxy(f,{get:(t,k)=>k===Symbol.toPrimitive?()=>"":k==="length"?0:p,set:()=>true,apply:()=>p,construct:()=>p});return p}
const store={};
const ctx={console,Date,Math,JSON,Object,Array,String,Number,Boolean,RegExp,Error,Set,Map,Promise,Intl,parseInt,parseFloat,isNaN,encodeURIComponent,decodeURIComponent,
 localStorage:{getItem:k=>{if(k.startsWith("sawyer_designs")){const o={};let any=false;for(const c of COLS){const r=getKV.get(c);if(r){o[c]=JSON.parse(r.v);any=true}}const m=getKV.get("meta");if(!any)return null;return JSON.stringify(Object.assign({v:1,me:null,theme:"light",recent:[]},m?JSON.parse(m.v):{},o))}return store[k]||null},
  setItem:(k,v)=>{if(k.startsWith("sawyer_designs"))dirty=true;else store[k]=v},removeItem:()=>{}},
 setTimeout:(fn,ms)=>{if(!allowAuto)return 0;return setTimeout(()=>{try{fn();persist()}catch(e){}},ms)},clearTimeout,setInterval:()=>0,requestAnimationFrame:()=>0,
 document:anyStub(),location:{hash:"",search:"",href:"",pathname:"/"},navigator:{userAgent:"node"},matchMedia:()=>({matches:false,addEventListener(){}}),history:anyStub(),
 addEventListener(){},removeEventListener(){},getComputedStyle:()=>anyStub(),IntersectionObserver:function(){return anyStub()},ResizeObserver:function(){return anyStub()},MutationObserver:function(){return anyStub()},
 scrollTo(){},innerWidth:1280,innerHeight:800,performance:{now:()=>Date.now()},crypto:require("crypto").webcrypto,alert(){},confirm:()=>true,Image:function(){return anyStub()}};
ctx.window=ctx;ctx.globalThis=ctx;ctx.self=ctx;
vm.createContext(ctx);
try{vm.runInContext(fs.readFileSync(path.join(__dirname,"app-logic.js"),"utf8"),ctx,{filename:"app-logic.js"})}catch(e){console.error("logic load warning:",e.message)}
const api=ctx.__api;if(!api)throw new Error("app logic failed to load");
ctx.onData=null;
function DB(){return api.DB}
function persist(){const d=DB();for(const c of COLS)setKV.run(c,JSON.stringify(d[c]||[]),Date.now());setKV.run("meta",JSON.stringify({v:1,seeded:true,labeled:!!getKV.get("meta")}),Date.now());VER++;dirty=false;PUB_ST={t:0,s:"",v:0}}
function hashPw0(pw){const salt=crypto.randomBytes(16).toString("hex");return{salt,hash:crypto.scryptSync(pw,salt,64,{N:16384,r:8,p:1}).toString("hex")}}
// first boot: seed demo data, clearly labeled
{const d=DB();if(!getKV.get("meta")||!JSON.parse(getKV.get("meta").v).labeled){
  d.users.forEach(u=>{u.demo=true;u.email=u.id+"@demo.invalid"});(d.projects||[]).forEach(p=>{p.demo=true;if(!/^Demo: /.test(p.title))p.title="Demo: "+p.title});(d.jobs||[]).forEach(j=>j.demo=true);
  d.pmsgs=(d.pmsgs||[]);d.me=null;persist();setKV.run("meta",JSON.stringify({v:1,seeded:true,labeled:true}),Date.now());console.log("seeded demo data:",d.users.length,"users")}}
// demo logins (README): fixed accounts for the seeded homeowner, pro and project manager
const DEMO_PW=BRAND.slug+"-demo-2026";
for(const[uid_,email]of[["u1","demo-homeowner@"+BRAND.slug+".test"],["c1","demo-pro@"+BRAND.slug+".test"],["m1","demo-pm@"+BRAND.slug+".test"],["c26","demo-remodeler@"+BRAND.slug+".test"],["b1","demo-business@"+BRAND.slug+".test"],["tv1","demo-traveler@"+BRAND.slug+".test"],["a1","demo-trust@"+BRAND.slug+".test"]]){
 const u=DB().users.find(x=>x.id===uid_);if(!u||db.prepare("SELECT 1 FROM accounts WHERE uid=? OR email=?").get(uid_,email))continue;
 const h=hashPw0(DEMO_PW);db.prepare("INSERT INTO accounts(uid,email,salt,hash,role,created) VALUES(?,?,?,?,?,?)").run(uid_,email,h.salt,h.hash,u.role,Date.now());u.email=email;persist()}
// v5: travel work collection added to existing databases
if(!getKV.get("tcalls")){if(!Array.isArray(DB().tcalls)&&ctx.__v5)ctx.__v5.seedTravel();persist();console.log("travel work seeded:",(DB().tcalls||[]).length,"calls")}
// v12: consults, review requests, reports and the trust account added to existing databases
if(!getKV.get("consults")){persist();console.log("v12 data seeded")}
// keep meta flag on later persists
const _p=persist;persist=function(){_p();setKV.run("meta",JSON.stringify({v:1,seeded:true,labeled:true}),Date.now())};

/* ---- auth ---- */
const scrypt=(pw,salt)=>crypto.scryptSync(pw,salt,64,{N:16384,r:8,p:1}).toString("hex");
const hashPw=pw=>{const salt=crypto.randomBytes(16).toString("hex");return{salt,hash:scrypt(pw,salt)}};
const checkPw=(pw,salt,hash)=>{const h=Buffer.from(scrypt(pw,salt),"hex");return crypto.timingSafeEqual(h,Buffer.from(hash,"hex"))};
const SESS_DAYS=30;
function newSession(uid){const t=crypto.randomBytes(32).toString("base64url");db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(t,uid,Date.now()+SESS_DAYS*864e5);return t}
function cookies(req){const o={};(req.headers.cookie||"").split(";").forEach(s=>{const i=s.indexOf("=");if(i>0)o[s.slice(0,i).trim()]=decodeURIComponent(s.slice(i+1).trim())});return o}
function sessionUid(req){const t=cookies(req).swsid;if(!t)return null;const r=db.prepare("SELECT uid,expires FROM sessions WHERE token=?").get(t);if(!r||r.expires<Date.now())return null;return r.uid}
const isHttps=req=>!!(req.socket.encrypted||(TRUST_PROXY&&(String(req.headers["x-forwarded-proto"]||"").split(",")[0].trim()==="https"||/https/.test(req.headers["cf-visitor"]||""))));
function setCookie(res,req,t,maxAge){const secure=isHttps(req)?"; Secure":"";res.setHeader("Set-Cookie",`swsid=${t}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`)}
const hits=new Map();
const NEW_THREAD_MAX=Math.max(1,+process.env.NEW_THREAD_MAX||20);// v14: new conversations a sender may start per 24 h
const RATE_X=Math.max(1,+process.env.RATE_X||1);// RATE_X: loosen limits for local e2e runs only
function limited(key,max,winMs){max*=RATE_X;const now=Date.now();const a=(hits.get(key)||[]).filter(t=>now-t<winMs);a.push(now);hits.set(key,a);return a.length>max}
// SW-009: login throttling counts FAILED attempts only, per IP+account (tight) and per IP (looser, for spraying). Successful logins never count.
// (Not loosened by RATE_X: test runs log in successfully as often as they like, so they never need it.)
function overLimit(key,max,winMs){const now=Date.now();const a=(hits.get(key)||[]).filter(t=>now-t<winMs);hits.set(key,a);return a.length>=max}
function addHit(key){const a=hits.get(key)||[];a.push(Date.now());hits.set(key,a)}
const ip=req=>(TRUST_PROXY&&(req.headers["cf-connecting-ip"]||(req.headers["x-forwarded-for"]||"").split(",")[0].trim()))||req.socket.remoteAddress;

/* ---- validation ---- */
const EMAIL=/^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,}$/i;
function clean(v,depth=0){ // strings capped, control chars removed, structure bounded
 if(depth>8)return null;
 if(typeof v==="string")return v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,"").slice(0,4000);
 if(typeof v==="number")return Number.isFinite(v)?v:0;
 if(typeof v==="boolean"||v===null)return v;
 if(Array.isArray(v))return v.slice(0,60).map(x=>clean(x,depth+1));
 if(typeof v==="object"){const o={};for(const k of Object.keys(v).slice(0,60)){if(k==="__proto__"||k==="constructor"||k==="prototype")continue;o[k]=clean(v[k],depth+1)}return o}
 return null}
const ACTIONS=new Set(["updatePro","fav","postJob","interest","quote","hire","complete","review","reply","send","readNotifs","readNotif","postProject","applyRole","acceptApp","declineApp","markDone","reviewCrew","advancePhase","crewSend","inviteCrew","respondInvite","addPhoto","confirmDone","setMilestones","fundMilestone","requestRelease","releaseMilestone","saveEstimate","setBusy","flagLead","reportNoShow","disputeReview","sharePhone","cancelPlan","resumePlan","requestCOI","sendCOI","addLocation","addRecurring","updateMe","saveTravel","travAvail","postTravel","applyTravel","withdrawTravel","decideTravel","inviteTraveler","closeTravel","saveCall","setAlert","delAlert","stageTravel","saveCust","addCustNote","addCustPhoto","saveDoc","delDoc","saveBill","sendBill","remindBill","recordPay","payBill","approveEst","convertEst","voidBill","addLedger","delLedger","logTime","approveTime","delTime","postLodging","closeLodging","reviewCo","setCallDetails","setCrew","tripCheck","setAlertPrefs","saveVisit","visitStatus","delVisit","setFocus","custFromJob","setRecurring","setAutoRemind","sweep9","openCase","caseReply","caseAccept","caseEscalate","caseWithdraw","signEst","travStatus","setNotifPrefs","inviteQuote","crewSave","crewDel","crewClock","refAsk","refGive","refDecline","setMenu12","setGal12","setConsult12","consultBook","consultSet","homeTask12","homeItem12","homeItemDel12","importProfile12","rreqSend12","rreqRemind12","reportReview12","modDecide12","setRoleDates12"]);
// SW-001: pro profile edits are an ALLOWLIST. Privilege and trust flags (staff, verified, bg, paid, plan, role, ...) are
// never taken from the client; "verified" only changes through the staff-only POST /api/staff/verify, never from license text.
const PRO_EDITABLE=["bio","rate","phone","license","insurance","availNow"];
function pickPro(o){const r={};if(!o||typeof o!=="object"||Array.isArray(o))return r;for(const k of PRO_EDITABLE)if(Object.prototype.hasOwnProperty.call(o,k))r[k]=o[k];return r}
// strip privilege keys from any top-level object argument of any action (defence in depth for every action, not just updatePro)
function stripPriv(args){for(const a of args)if(a&&typeof a==="object"&&!Array.isArray(a))for(const k of ["staff","admin","verified","founding","bg","planStatus","planEnds","credits"])delete a[k];return args}

const PRO_PRIVATE=["email","sharedWith","credits","coiReqs","cois","flags","favs","plan","planStatus","planEnds","paidThru","tsaved","talerts","trip","aprefs","focus8","crew8","nprefs11","home12","rrTpl12","locations","recurring","saved","autoRem9","needsSetup","verifyPending","emailHidden","staff","admin"];
const PUBLIC_USER=["id","role","acct","name","biz","zip","bio","demo","joined","created","trav","avatar","photo"];
/* ---- user-scoped snapshot: no password data, no other people's private messages/emails ---- */
function snapshot(uid){const d=DB();const own=a=>uid?(a||[]).filter(x=>x.by===uid):[];const crewOf=p=>(p.roles||[]).flatMap(r=>r.filled||[]);
 const rc=ctx.__v2&&ctx.__v2.respCalc;const staff=!!(uid&&(d.users.find(u=>u.id===uid)||{}).staff);
 // SW-006: other people's records are reduced to what public pages need. Customers/PMs/travelers: an allowlist.
 // Pros: business profile minus private/billing fields. Phone numbers only for signed-in viewers (pros' business line)
 // or when the person shared it with the viewer. Business locations (street addresses) never leave the owner.
 const viewer=uid&&d.users.find(u=>u.id===uid),isPro=!!(viewer&&viewer.role==="contractor");
 const users=d.users.map(u=>{if(u.id===uid){const c=Object.assign({},u);if(u.role==="contractor"&&rc){try{c.rs=rc(u.id)}catch(e){}}return c}
  let c;if(u.role==="contractor"){c=Object.assign({},u);for(const k of PRO_PRIVATE)delete c[k];if(!uid)delete c.phone;if(Array.isArray(c.busy))c.busy=c.busy.map(x=>({start:x&&x.start,end:x&&x.end}));if(rc){try{c.rs=rc(u.id)}catch(e){}}}
  else{c={};for(const k of PUBLIC_USER)if(u[k]!==undefined)c[k]=u[k];if(uid&&(u.sharedWith||[]).includes(uid)&&u.phone)c.phone=u.phone}
  return c});
 // Jobs: parties see everything. Signed-in pros see open requests to quote (no escrow, no customer contact).
 // Everyone else (signed out, other customers) gets a redacted card: no description, no customer id, no exact budget.
 const jobs=d.jobs.map(j=>{const party=uid&&(j.cust===uid||j.hired===uid);if(party)return j;const c=Object.assign({},j);delete c.escrow;delete c.cases;const done=j.status==="completed"&&j.custConfirmed;if(!done){delete c.photos;delete c.rphotos}
  if(!isPro){c.cust=null;c.desc="";delete c.interested;delete c.invited;delete c.rphotos;delete c.est11;delete c.noShow;delete c.flags}return c});
 const myJobs=new Set(d.jobs.filter(j=>j.cust===uid).map(j=>j.id));
 const quotes=d.quotes.map(q=>(q.cid===uid||myJobs.has(q.job))?q:Object.assign({},q,{price:null,note:""}));
 const pm=new Map((d.projects||[]).map(p=>[p.id,p]));
 const pmsgs=(d.pmsgs||[]).filter(m=>{const p=pm.get(m.pid);if(!p||!uid)return false;if(m.from===uid||m.to===uid)return true;return m.to==="all"&&(p.pm===uid||crewOf(p).includes(uid))});
 // SW-039: a review's author id stays with the parties (the author, the reviewed pro) and staff. Everyone else gets a
 // per-review token (not linkable across reviews or to users[]) plus the short display name ("Pat H.") the card shows.
 const uName=new Map(d.users.map(u=>[u.id,u.name]));const shortNm=n=>{const w=String(n||"").trim().split(/\s+/).filter(Boolean);return w.length?w[0]+(w[1]?" "+w[1][0]+".":""):"Customer"};
 const reviews=(d.reviews||[]).map(r=>(staff||(uid&&(r.uid===uid||r.cid===uid)))?r:Object.assign({},r,{uid:"rv-"+r.id,an:shortNm(uName.get(r.uid))}));
 return{v:1,_v:VER,users,jobs,estimates:uid?(d.estimates||[]).filter(e=>e.uid===uid):[],reviews,quotes,msgs:uid?d.msgs.filter(m=>m.a===uid||m.b===uid):[],notifs:uid?d.notifs.filter(n=>n.to===uid):[],projects:d.projects||[],pmsgs,tcalls:(d.tcalls||[]).map(c=>c.by===uid?c:Object.assign({},c,{napps:(c.apps||[]).filter(a=>a.status!=="withdrawn").length,apps:(c.apps||[]).filter(a=>a.status==="hired"||(uid&&a.uid===uid)).map(a=>a.uid===uid?a:{uid:a.uid,status:a.status,date:a.date}),invites:(c.invites||[]).filter(x=>x===uid)})),bills:uid?(d.bills||[]).filter(b=>b.by===uid||(b.cuid===uid&&b.status!=="draft")):[],bcust:own(d.bcust),bdocs:own(d.bdocs),ledger:own(d.ledger),tsheets:own(d.tsheets),lodging:d.lodging||[],creviews:d.creviews||[],visits:uid?(d.visits||[]).filter(v=>v.by===uid||v.cuid===uid):[],cases:uid?(d.cases||[]).filter(c=>c.cu===uid||c.pro===uid):[],crew:own(d.crew),refs:(d.refs||[]).filter(r=>r.status==="given"||(uid&&(r.trav===uid||r.by===uid))).map(r=>r.status==="given"||(uid&&(r.trav===uid||r.by===uid))?r:null),consults:(d.consults||[]).map(c=>uid&&(c.pro===uid||c.cu===uid)?c:(c.status==="requested"||c.status==="confirmed")?{id:c.id,pro:c.pro,date:c.date,time:c.time,status:c.status}:null).filter(Boolean),rreq12:uid?(d.rreq12||[]).filter(r=>r.by===uid||r.cu===uid):[],reports12:staff?(d.reports12||[]):uid?(d.reports12||[]).filter(r=>r.by===uid):[],rmrev12:staff?(d.rmrev12||[]):[],me:uid&&d.users.some(u=>u.id===uid)?uid:null,theme:"light",recent:[]}}

function run(uid,name,args){const d=DB();d.me=uid;let r;try{r=api.A[name](...args)}catch(e){r={ok:false,msg:"That didn't work. The item may have changed, refresh and try again."}}finally{DB().me=null}if(dirty)persist();return r}

/* ---- http ---- */
const INDEX=()=>fs.readFileSync(path.join(__dirname,"public/index.html"));
// SW-002: real HTTP status codes. Errors also keep "status" in the JSON body for older clients.
function send(res,code,obj,extra){if(code>=400&&obj&&typeof obj==="object")obj.status=code;res.writeHead(code,Object.assign({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'"},extra||{}));res.end(JSON.stringify(obj))}
function body(req){return new Promise((ok,no)=>{let n=0,c=[];req.on("data",b=>{n+=b.length;if(n>256e3){no(new Error("too big"));req.destroy()}else c.push(b)});req.on("end",()=>{try{ok(c.length?JSON.parse(Buffer.concat(c).toString()):{})}catch(e){no(e)}})})}

// v8: SEO + PWA helpers
const ORIGIN=req=>(process.env.PUBLIC_URL||("http"+(req.headers["x-forwarded-proto"]==="https"?"s":"")+"://"+(req.headers.host||"localhost"))).replace(/\/$/,"");
const xe=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
const sj=o=>JSON.stringify(o).replace(/</g,"\\u003c");
// v11 perf: signed-out visitors to "/" get the real home hero inside <main> (public/pre-home.html, made by
// tools/prerender-hero.js) so the photo and headline paint before the app JS runs. Deep links (#/...) fall back to the skeleton.
let PRE_HOME=null,PRE_TOP=null;try{PRE_HOME=fs.readFileSync(path.join(__dirname,"public/pre-home.html"),"utf8");PRE_TOP=fs.readFileSync(path.join(__dirname,"public/pre-top.html"),"utf8")}catch(e){}
function preHome(req,h){if(!PRE_HOME||sessionUid(req))return h;const re=/<div class="sk11 wrap" aria-hidden="true">[\s\S]*?<\/div>/;if(!re.test(h))return h;
 if(PRE_TOP)h=h.replace('<header class="top" id="top"></header>',()=>PRE_TOP);
 return h.replace(re,()=>'<div id="pre11">'+PRE_HOME+'</div><script>if(location.hash.length>2){document.getElementById("top").classList.remove("on-home");var e=document.getElementById("pre11");e.outerHTML=\'<div class="sk11 wrap" aria-hidden="true"><i style="height:34px;width:42%"></i><i style="height:16px;width:64%"></i><i style="height:220px"></i></div>\'}</script>')}
// v13 perf: signed-out visitors to /p/<id> get that pro's real cover photos inside <main>, rendered by the same
// VIEWS.pro the browser runs, from the public (signed-out) snapshot only. The browser keeps those painted <img>s
// when the app mounts, so the profile's largest paint no longer waits for the app JS.
let PRE_PRO={k:"",v:null};
function proCover(id){const k=id+"|"+VER;if(PRE_PRO.k===k)return PRE_PRO.v;let v=null;const save=api.DB;
 try{if(api.VIEWS&&api.VIEWS.pro){try{vm.runInContext("V4N={};V4Q=0",ctx)}catch(e){}/* v16: same stock-cover order as the browser's first render */const s=JSON.parse(JSON.stringify(snapshot(null)));s.me=null;s.theme="light";s.recent=[];api.DB=s;
  const out=String(api.VIEWS.pro(id,{})||"");const m=out.match(/<div class="px-cover[^"]*">[\s\S]*?<div class="px-shade"><\/div><a class="backlink"[^>]*>[\s\S]*?<\/a><\/div>/);
  if(m&&!/<script/i.test(m[0])){const img=(m[0].match(/<img[^>]*src="([^"]+)"/)||[])[1];v={html:m[0],img:img&&/^\/(img|u)\//.test(img)?img:null}}}}
 catch(e){v=null}finally{api.DB=save}PRE_PRO={k,v};return v}
function prePro(req,h,id){if(sessionUid(req))return h;const c=proCover(id);if(!c)return h;const re=/<div class="sk11 wrap" aria-hidden="true">[\s\S]*?<\/div>/;if(!re.test(h))return h;
 if(PRE_TOP)h=h.replace('<header class="top" id="top"></header>',()=>PRE_TOP.replace(" on-home",""));
 if(c.img)h=h.replace('<meta name="viewport"',()=>`<link rel="preload" as="image" href="${xe(c.img)}" fetchpriority="high"><meta name="viewport"`);
 // the cover gets the bandwidth first; the loader at the end of <body> fetches the app scripts right after it paints
 h=h.replace(/<link rel="preload" href="\/js\/[^"]+" as="script">/g,"");
 return h.replace(re,()=>'<div id="pre11"><section class="px">'+c.html+'</section></div>')}
// v13 (QA SW-018): the public snapshot is the same for every signed-out visitor, so build it at most every 3 s instead of per request
function pubST(){const n=Date.now();if(n-PUB_ST.t>3000||!PUB_ST.s||PUB_ST.v!==VER)PUB_ST={t:n,s:sj(snapshot(null)),v:VER};return PUB_ST.s}
// v16 (QA SW-018): a signed-out /p/<id> page inlines only the data that profile needs (the pro, their reviews, quotes,
// consults, the jobs and crew projects they're part of, and those projects' PMs), about 10 KB instead of the whole
// public snapshot. The slim copy is used only if the profile renders byte-for-byte the same from it as from the full
// public snapshot (checked once per pro per data version); otherwise the full snapshot is inlined as before. The
// browser loads the rest right after first paint, and before any other page renders.
let SLIM={v:-1,m:new Map()};
function renderPro(st,id){const save=api.DB,mr=Math.random,dn=Date.now,t0=dn();let x=7;
 try{vm.runInContext("V4N={};V4Q=0",ctx)}catch(e){}
 Math.random=()=>{x=(x*16807)%2147483647;return x/2147483647};Date.now=()=>t0;
 try{const s=JSON.parse(JSON.stringify(st));s.me=null;s.theme="light";s.recent=[];api.DB=s;return String(api.VIEWS.pro(id,{})||"")}catch(e){return null}finally{api.DB=save;Math.random=mr;Date.now=dn}}
function slimFor(full,id){const s={};for(const k of Object.keys(full))s[k]=Array.isArray(full[k])?[]:full[k];
 const tok=JSON.stringify(id),has=o=>JSON.stringify(o).includes(tok);
 const qj=new Set((full.quotes||[]).filter(q=>q.cid===id).map(q=>q.job));
 s.reviews=(full.reviews||[]).filter(r=>r.cid===id);s.quotes=(full.quotes||[]).filter(q=>q.cid===id);s.consults=(full.consults||[]).filter(c=>c.pro===id);
 s.jobs=(full.jobs||[]).filter(j=>j.hired===id||qj.has(j.id)||has([j.interested||[],j.invited||[]]));
 s.projects=(full.projects||[]).filter(has);const pms=new Set(s.projects.map(p=>p.pm));
 s.users=(full.users||[]).filter(u=>u.id===id||pms.has(u.id));s._v=0;s.partial=id;return s}
function pubSlim(id){if(process.env.SLIM_P==="0")return null;if(SLIM.v!==VER)SLIM={v:VER,m:new Map()};if(SLIM.m.has(id))return SLIM.m.get(id);let out=null;
 try{if(api.VIEWS&&api.VIEWS.pro){const full=snapshot(null),sl=slimFor(full,id);const a=renderPro(full,id),b=renderPro(sl,id);if(a&&a===b)out=sj(sl);else console.warn("slim /p/"+id+" differs from full; inlining the full public state")}}catch(e){out=null}
 if(SLIM.m.size>500)SLIM.m.clear();SLIM.m.set(id,out);return out}
function withMeta(req,m){let h=INDEX().toString();const o=ORIGIN(req);const og=`<meta property="og:type" content="${m.type||"website"}"><meta property="og:site_name" content="Sawyer"><meta property="og:title" content="${xe(m.title)}"><meta property="og:description" content="${xe(m.desc)}"><meta property="og:url" content="${xe(o+(m.path||"/"))}"><meta property="og:image" content="${xe(o+(m.img||"/img/hero.webp"))}"><meta name="twitter:card" content="summary_large_image"><link rel="canonical" href="${xe(o+(m.path||"/"))}">`+(m.ld?`<script type="application/ld+json">${sj(m.ld)}</script>`:"");
 h=h.replace(/<title>[^<]*<\/title>/,`<title>${xe(m.title)}</title>`).replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${xe(m.desc)}">`+og);
 // v9 perf: inline the public snapshot for signed-out visitors so first paint skips the blocking /api/state round trip (never inline private state).
 if(!sessionUid(req)){const st=(m.slim&&pubSlim(m.slim))||pubST();h=h.replace("</head>",`<script>window.__ST=${st}</script></head>`)}
 if((m.path||"/")==="/")h=h.replace("</head>",`<link rel="preload" as="image" href="/img/hero-sm.webp" imagesrcset="/img/hero-sm.webp 800w, /img/hero.webp 1600w" imagesizes="(max-width: 900px) 100vw, 50vw" fetchpriority="high"></head>`);
 return h}
function SEO_PAGE(req,k,id){const d=DB(),o=ORIGIN(req);if(k==="p"){const u=(d.users||[]).find(x=>x.id===id&&x.role==="contractor");if(!u)return null;const town=String(u.zip||"");const name=u.biz||u.name;
  return prePro(req,withMeta(req,{title:`${name}: ${u.trade||"Contractor"} · Sawyer`,desc:`${name}, ${String(u.trade||"").toLowerCase()} pro. ${u.rating?(+u.rating).toFixed(1)+" stars from "+(u.reviews||0)+" verified reviews. ":""}Free quotes, no lead fees.`,path:"/p/"+id,slim:id,type:"profile",img:u.cover||"/img/pro-1.webp",ld:Object.assign({"@context":"https://schema.org","@type":"HomeAndConstructionBusiness",name,url:o+"/p/"+id,address:{"@type":"PostalAddress",postalCode:town,addressCountry:"US"}},u.rating&&u.reviews?{aggregateRating:{"@type":"AggregateRating",ratingValue:(+u.rating).toFixed(1),reviewCount:u.reviews}}:{})}),id)}
 const c=(d.tcalls||[]).find(x=>x.id===id);if(!c)return null;const org=(d.users||[]).find(x=>x.id===c.by)||{};
 return withMeta(req,{title:`${c.title} · ${c.loc||""}${c.state?", "+c.state:""} · Sawyer`,desc:`$${c.rate}/hr${c.perDiem?" + $"+c.perDiem+"/day per diem":""}, about ${c.weeks} weeks. Rate, per diem and layoff risk up front.`,path:"/t/"+id,img:"/img/tr-wire.webp",ld:{"@context":"https://schema.org","@type":"JobPosting",title:c.title,description:c.desc||c.title,datePosted:new Date(c.date||Date.now()).toISOString().slice(0,10),employmentType:"CONTRACTOR",hiringOrganization:{"@type":"Organization",name:org.biz||"Sawyer contractor"},jobLocation:{"@type":"Place",address:{"@type":"PostalAddress",addressLocality:c.loc||"",addressRegion:c.state||"",addressCountry:"US"}},baseSalary:{"@type":"MonetaryAmount",currency:"USD",value:{"@type":"QuantitativeValue",value:c.rate,unitText:"HOUR"}}}})}
// SW-007: pretty URLs for app views (/prices, /find, /job/j12 ...) serve the app; the client maps the path to its #/ route.
const VIEW_META={find:["Find pros","Search licensed, reviewed local pros by trade and distance. Free for customers."],prices:["Price guide","Typical prices for common home projects, adjusted by ZIP code."],pricing:["Pricing","Free for customers. Pros pay a flat $20/mo with no lead fees."],pros:["For pros","A flat $20/month gets you a profile, job-board leads and the business tools. No lead fees."],faq:["FAQ","Answers about quotes, reviews, payments and the pro plan."],about:["About","Why Sawyer exists and how it keeps reviews honest."],jobs:["Job board","Open jobs from customers near you. Pros quote free."],post:["Request a pro","Describe your project and get matched with local pros."],travel:["Traveling electricians","Traveler calls with rate, per diem and layoff risk up front."],traveling:["Traveling electricians","Traveler calls with rate, per diem and layoff risk up front."],signup:["Join","Customers are free. Pros pay a flat $20/mo."],credits:["Photo credits","Photo credits."]};
function viewRoute(p){const m=/^\/([a-z0-9]{2,20})(?:\/([\w.-]{1,60}))?\/?$/.exec(p);if(!m||m[1]==="notfound"||m[1]==="api"||m[1]==="auth")return null;const V=api.VIEWS||{};return Object.prototype.hasOwnProperty.call(V,m[1])?m[1]:null}
const SW_JS=`const C="sawyer-v13";const SHELL=["/","/icons/icon-192.png","/img/hero.webp","/fonts/plus-jakarta-sans-400.woff2","/fonts/plus-jakarta-sans-800.woff2"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).catch(()=>{}))});
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{const r=e.request;if(r.method!=="GET")return;const u=new URL(r.url);if(u.origin!==location.origin||u.pathname.startsWith("/api/")||u.pathname.startsWith("/auth/"))return;
 if(r.mode==="navigate"){e.respondWith(fetch(r).then(x=>{const y=x.clone();caches.open(C).then(c=>c.put("/",y));return x}).catch(()=>caches.match("/")));return}
 if(/^\\/(img|icons|u|fonts|js)\\//.test(u.pathname))e.respondWith(caches.match(r).then(h=>h||fetch(r).then(x=>{if(x.ok){const y=x.clone();caches.open(C).then(c=>c.put(r,y))}return x})))});`;
const SEC={"X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"same-origin","Permissions-Policy":"geolocation=(), camera=(), microphone=()"};
// SW-003: app pages get a strict CSP. Inline boot scripts are allowed by their exact sha256 hash (computed per response),
// app code only from this origin, no inline event handlers, no plugins, no framing, no foreign form posts.
function cspFor(html,req){const hs=new Set();for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))hs.add("'sha256-"+crypto.createHash("sha256").update(m[1],"utf8").digest("base64")+"'");
 return["default-src 'self'","script-src 'self' "+[...hs].join(" "),"style-src 'self' 'unsafe-inline'","img-src 'self' data: blob:","font-src 'self' data:","connect-src 'self'","media-src 'self' blob:","worker-src 'self'","manifest-src 'self'","object-src 'none'","base-uri 'self'","form-action 'self'","frame-ancestors 'none'"].concat(isHttps(req)?["upgrade-insecure-requests"]:[]).join("; ")}
function sendHtml(res,req,code,html,extra){res.writeHead(code,Object.assign({"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-cache","Content-Security-Policy":cspFor(html,req)},extra||{}));return res.end(html)}
/* ---- photo uploads: images only, 5 MB max, magic bytes checked, stored under DATA_DIR/uploads ---- */
const IMG={"image/jpeg":{ext:"jpg",ok:b=>b[0]===0xff&&b[1]===0xd8&&b[2]===0xff},"image/png":{ext:"png",ok:b=>b.slice(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))},"image/webp":{ext:"webp",ok:b=>b.slice(0,4).toString("latin1")==="RIFF"&&b.slice(8,12).toString("latin1")==="WEBP"}};
function upload(req,res){
 const send=(res,code,o)=>{if(code!==200)o.status=code;res.writeHead(code,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});res.end(JSON.stringify(o))};
 const o=req.headers.origin;if(o&&req.headers.host&&new URL(o).host!==req.headers.host)return send(res,403,{error:"Bad origin"});
 const uid=sessionUid(req);if(!uid){req.resume();return send(res,401,{error:"Sign in to upload photos"})}
 const type=String(req.headers["content-type"]||"").split(";")[0].trim().toLowerCase(),t=IMG[type];
 if(!t){req.resume();return send(res,415,{error:"JPEG, PNG or WebP images only"})}
 if(+req.headers["content-length"]>MAX_UPLOAD){req.resume();return send(res,413,{error:"Photos must be 5 MB or smaller"})}
 if(limited("up:"+uid,30,60*60e3)){req.resume();return send(res,429,{error:"Upload limit reached, try again later"})}
 let n=0,c=[],dead=false;
 req.on("data",b=>{if(dead)return;n+=b.length;if(n>MAX_UPLOAD){dead=true;send(res,413,{error:"Photos must be 5 MB or smaller"});req.resume()}else c.push(b)});
 req.on("end",()=>{if(dead)return;let buf=Buffer.concat(c);if(buf.length<12||!t.ok(buf))return send(res,415,{error:"That file isn't a valid image"});
  // v16: full structure check. Refuses HTML/script hidden in or after the image (polyglots), trims trailing bytes, removes GPS.
  const sf=IMGSAFE.check(type,buf);if(!sf.ok)return send(res,415,{error:sf.error});buf=sf.buf;
  const name=crypto.randomBytes(16).toString("hex")+"."+t.ext;fs.writeFileSync(path.join(UPLOADS,name),buf);
  db.prepare("INSERT INTO uploads VALUES(?,?,?,?,?)").run(name,uid,type,buf.length,Date.now());send(res,200,{ok:true,url:"/u/"+name})})}
const ownsUpload=(uid,url)=>{const m=/^\/u\/([a-f0-9]{32}\.(?:jpg|png|webp))$/.exec(String(url||""));return !!(m&&db.prepare("SELECT 1 FROM uploads WHERE name=? AND uid=?").get(m[1],uid))};
/* ---- passwordless, passkeys, OAuth (lib/auth.js) ---- */
// SW-040: border-box sizing (the 100%-wide card plus its padding overflowed by 8px at 390px), long words wrap,
// and the page carries the brand: house mark, Plus Jakarta Sans (self-hosted, font-src 'self'), linen + navy.
function htmlPage(res,code,title,inner){const e=v=>String(v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));res.writeHead(code,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; form-action 'self'; frame-ancestors 'none'"});
 res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#F7F6F3"><title>${e(title)} · ${BRAND.name}</title><style>@font-face{font-family:"Plus Jakarta Sans";src:url(/fonts/plus-jakarta-sans-400.woff2) format("woff2");font-weight:400;font-display:swap}@font-face{font-family:"Plus Jakarta Sans";src:url(/fonts/plus-jakarta-sans-700.woff2) format("woff2");font-weight:700;font-display:swap}*,*::before,*::after{box-sizing:border-box}html,body{max-width:100%;overflow-x:hidden}body{font:16px/1.55 "Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;background:#F7F6F3;color:#0E1B2B;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px 16px}main{background:#fff;max-width:420px;width:100%;padding:28px 24px;border-radius:16px;border:1px solid #E4E0D6;box-shadow:0 10px 40px -20px rgba(14,27,43,.3);overflow-wrap:anywhere}.brand{display:flex;align-items:center;gap:8px;margin:0 0 18px;font-weight:700;font-size:18px;color:#0E1B2B;text-decoration:none;letter-spacing:-.01em}h1{font-size:22px;line-height:1.25;margin:0 0 12px}.demo{background:#FFF4D6;border:1px solid #E8C25A;color:#6B4E00;font-weight:700;font-size:13px;letter-spacing:.04em;padding:8px 12px;border-radius:8px;margin-bottom:14px}label{display:block;font-weight:600;font-size:14px;margin:12px 0 0}input{display:block;width:100%;padding:11px 12px;margin-top:6px;border:1px solid #C9CFD4;border-radius:10px;font:inherit}button{margin-top:18px;width:100%;padding:12px;border:0;border-radius:10px;background:#0E1B2B;color:#fff;font:700 16px "Plus Jakarta Sans",system-ui,sans-serif;cursor:pointer}a{color:#1D4E89}</style></head><body><main><a class="brand" href="/"><svg width="30" height="30" viewBox="0 0 48 48" aria-hidden="true"><rect x="31.5" y="6.5" width="5" height="9" rx="1.2" fill="#B5532F"/><path d="M24 5.2L42.5 19.4V39A4 4 0 0 1 38.5 43H9.5A4 4 0 0 1 5.5 39V19.4Z" fill="#0E1B2B" stroke="#0E1B2B" stroke-width="1.6" stroke-linejoin="round"/><path d="M29.6 22.2A5.1 4.6 0 1 0 24 26.4A5.1 4.6 0 1 1 18.4 30.6" fill="none" stroke="#F7F6F3" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/></svg>${BRAND.name}</a><h1>${e(title)}</h1>${inner}</main></body></html>`)}
function createUser({role,name,email,phone}){const d=DB();d.me=null;const nm=String(name||"").trim().slice(0,80);const em=email||("sms-"+String(phone).replace(/\D/g,"")+"@phone.invalid");
 if(db.prepare("SELECT 1 FROM accounts WHERE email=?").get(em))return{ok:false,msg:"That email already has an account"};
 let r;try{r=role==="pro"?api.A.signupPro({name:nm||"New pro",email:em,biz:(nm||"New")+" (finish setup)",trade:"Handyman",zip:"78704",phone:phone||""}):role==="pm"?api.A.signupPM({name:nm||"New member",biz:"Your company",email:em,zip:"78704"}):api.A.signupCustomer(nm||"New member",em,"78704")}catch(e){r={ok:false}}
 const id=d.me;d.me=null;if(!r||!r.ok||!id){if(dirty)persist();return{ok:false,msg:(r&&r.msg)||"Sign-up failed"}}
 const u=d.users.find(x=>x.id===id);u.needsSetup=true;if(phone)u.phone=phone;if(!email)u.emailHidden=true;if(role==="business"){u.acct="business";u.locations=[];u.recurring=[]}
 db.prepare("INSERT INTO accounts(uid,email,salt,hash,role,created,phone) VALUES(?,?,?,?,?,?,?)").run(id,em,"","",u.role,Date.now(),phone||null);persist();return{ok:true,uid:id}}
// v13 SW-033: sessions started by a one-time code in the last 15 minutes may set a new password without the old one (forgot password).
const CODE_SESS=new Map();const codeFresh=req=>{const t=cookies(req).swsid,e=t&&CODE_SESS.get(t);return !!(e&&e>Date.now())};
const AUTH=require("./lib/auth.js")({onCodeLogin:t=>{CODE_SESS.set(t,Date.now()+15*60e3);if(CODE_SESS.size>5000)for(const[k,v]of CODE_SESS)if(v<Date.now())CODE_SESS.delete(k)},db,limited,ip:r=>ip(r),newSession,setCookie,sessionUid,send,createUser,SESS_DAYS,brand:BRAND,html:htmlPage});
function formBody(req){return new Promise((ok,no)=>{let n=0,c=[];req.on("data",b=>{n+=b.length;if(n>16e3){no(new Error("too big"));req.destroy()}else c.push(b)});req.on("end",()=>ok(Object.fromEntries(new URLSearchParams(Buffer.concat(c).toString()))))})}
// v9 perf: brotli for big text. Fast level now, max level computed off-thread and cached for repeat bodies (the signed-out home page).
const BRC=new Map();function brot(zl,b){const buf=Buffer.isBuffer(b)?b:Buffer.from(b);if(buf.length<65536)return zl.brotliCompressSync(buf,{params:{[zl.constants.BROTLI_PARAM_QUALITY]:5}});
 const k=require("crypto").createHash("sha1").update(buf).digest("base64");const hit=BRC.get(k);if(hit&&hit!=="busy")return hit;
 if(!hit){BRC.set(k,"busy");zl.brotliCompress(buf,{params:{[zl.constants.BROTLI_PARAM_QUALITY]:11,[zl.constants.BROTLI_PARAM_SIZE_HINT]:buf.length}},(e,z)=>{if(e){BRC.delete(k);return}BRC.set(k,z);if(BRC.size>24)BRC.delete(BRC.keys().next().value)})}
 return zl.brotliCompressSync(buf,{params:{[zl.constants.BROTLI_PARAM_QUALITY]:5}})}
// v12: embeddable review widget for a pro's own website (iframe). Read-only public data, framable by any site.
function embedPage(req,res,id,url){const d=DB();const u=(d.users||[]).find(x=>x.id===id&&x.role==="contractor");res.removeHeader("X-Frame-Options");
 const hd={"Content-Type":"text/html; charset=utf-8","Cache-Control":"public, max-age=300","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:; frame-ancestors *; base-uri 'none'; form-action 'none'"};
 if(!u){res.writeHead(404,hd);return res.end("<!doctype html><title>Not found</title><p style='font:14px system-ui'>This widget isn't connected to a Sawyer profile.</p>")}
 const rv=(d.reviews||[]).filter(r=>r.cid===id).sort((a,b)=>b.date-a.date);const n=rv.length,avg=n?rv.reduce((a,r)=>a+r.stars,0)/n:0;const o=ORIGIN(req);const nm=String(u.biz||u.name).replace(/ \(demo\)$/,"");
 const st=k=>"<span class=s aria-hidden=true>"+"★".repeat(Math.round(k))+"<i>"+"★".repeat(5-Math.round(k))+"</i></span>";const first=uid=>{const c=(d.users||[]).find(x=>x.id===uid);return c?xe(String(c.name||"Customer").split(" ")[0]+" "+(String(c.name||"").split(" ")[1]||"").slice(0,1)+"."):"Customer"};
 const items=rv.slice(0,3).map(r=>{const t=String(r.text||"");return`<li><div class=h>${st(r.stars)}<b>${first(r.uid)}</b><small>${xe(new Date(r.date).toLocaleDateString("en-US",{month:"short",year:"numeric"}))}</small></div><p>${xe(t.length>170?t.slice(0,167)+"…":t)}</p><em>✓ Verified job</em></li>`}).join("");
 res.writeHead(200,hd);res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${xe(nm)} reviews · Sawyer</title><meta name="robots" content="noindex"><style>
*{box-sizing:border-box}body{margin:0;font:14px/1.45 "Plus Jakarta Sans",system-ui,-apple-system,"Segoe UI",sans-serif;color:#14202B;background:#fff}
.w{border:1px solid #e3e6ee;border-radius:14px;padding:14px 16px;max-width:420px}.t{display:flex;align-items:center;gap:10px}.t b{font-size:15px;color:#0F2A44}.t small{display:block;color:#5b6475;font-size:12px}
.lg{flex:none;width:34px;height:34px;display:grid;place-items:center}.big{display:flex;align-items:baseline;gap:8px;margin:10px 0 4px}.big strong{font-size:28px;color:#0F2A44;letter-spacing:-.02em}
.s{color:#B45309;letter-spacing:1px}.s i{color:#d7dbe3;font-style:normal}ul{list-style:none;margin:8px 0 0;padding:0}li{border-top:1px solid #eef0f5;padding:10px 0}.h{display:flex;gap:8px;align-items:center}.h small{margin-left:auto;color:#5b6475;font-size:12px}
p{margin:4px 0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}em{font-style:normal;font-size:11.5px;color:#1f7a4d;font-weight:700}a.c{display:block;text-align:center;margin-top:8px;padding:9px;border-radius:10px;background:#c94a12;color:#fff;text-decoration:none;font-weight:700}
.n{font-size:11.5px;color:#5b6475;margin-top:8px;text-align:center}</style></head><body><div class=w><div class=t><span class=lg aria-hidden=true><svg width="34" height="34" viewBox="0 0 48 48"><rect x="31.5" y="6.5" width="5" height="9" rx="1.2" fill="#B5532F"/><path d="M24 5.2L42.5 19.4V39A4 4 0 0 1 38.5 43H9.5A4 4 0 0 1 5.5 39V19.4Z" fill="#0E1B2B" stroke="#0E1B2B" stroke-width="1.6" stroke-linejoin="round"/><path d="M29.6 22.2A5.1 4.6 0 1 0 24 26.4A5.1 4.6 0 1 1 18.4 30.6" fill="none" stroke="#F7F6F3" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/></svg></span><div><b>${xe(nm)}</b><small>${xe(u.trade||"")} · reviews on Sawyer</small></div></div>
<div class=big>${n?`<strong>${avg.toFixed(1)}</strong>${st(avg)}<small>${n} verified review${n>1?"s":""}</small>`:`<small>No reviews yet. Reviews appear after finished jobs.</small>`}</div><ul>${items}</ul>
<a class=c href="${xe(o+"/p/"+u.id+"?ref=widget")}" target="_blank" rel="noopener">See all reviews on Sawyer</a><div class=n>Only customers with a finished, hired job can review.</div></div></body></html>`)}
const server=http.createServer(async(req,res)=>{
 for(const[k,v]of Object.entries(SEC))res.setHeader(k,v);
 if(isHttps(req))res.setHeader("Strict-Transport-Security","max-age=31536000; includeSubDomains");// SW-004
 const AE=req.headers["accept-encoding"]||"";if(/\b(gzip|br)\b/.test(AE)){const zl=require("zlib"),useBr=/\bbr\b/.test(AE);const wh=res.writeHead.bind(res),en=res.end.bind(res);let hd=null;
  res.writeHead=(c,h)=>{hd=[c,h||{}];return res};const wr=res.write.bind(res);res.write=(...a)=>{if(hd&&hd!=="done"){wh(...hd);hd="done"}else if(!hd){wh(res.statusCode,{});hd="done"}return wr(...a)};// v11 fix: a 2nd chunk used to re-send headers and cut streamed photos off at 64 KB
  res.end=(b,...r)=>{if(hd==="done")return en(b,...r);if(!hd)hd=[res.statusCode,{}];const[c,h]=hd;const ct=String(h["Content-Type"]||res.getHeader("Content-Type")||"");
   if(b&&typeof b!=="function"&&/text|json|javascript|xml|svg/.test(ct)&&Buffer.byteLength(b)>1024){const z=useBr?brot(zl,b):zl.gzipSync(b);h["Content-Encoding"]=useBr?"br":"gzip";h["Vary"]="Accept-Encoding";delete h["Content-Length"];res.removeHeader&&res.removeHeader("Content-Length");wh(c,h);return en(z)}
   wh(c,h);return en(b,...r)}}
 if(req.method==="HEAD")req.method="GET";// HEAD answers like GET (Node drops the body)
 const url=new URL(req.url,"http://x");const p=url.pathname;
 try{
 if(req.method==="GET"&&(p==="/"||p==="/index.html")){return sendHtml(res,req,200,preHome(req,withMeta(req,{title:"Sawyer: hire pros you'd trust with your house",desc:"Find trusted local contractors. Free for customers. Pros pay a flat $20/mo with no lead fees, and the business tools are included. Reviews only from completed jobs.",path:"/",ld:{"@context":"https://schema.org","@type":"Organization",name:"Sawyer",url:ORIGIN(req),logo:ORIGIN(req)+"/icons/icon-512.png"}})))}
 if(req.method==="GET"&&/^\/img\/[a-z0-9-]+\.webp$/.test(p)){const f=path.join(__dirname,"public/img",path.basename(p));if(!fs.existsSync(f))return send(res,404,{error:"Not found"});res.writeHead(200,{"Content-Type":"image/webp","Cache-Control":"public, max-age=604800"});return res.end(fs.readFileSync(f))}
 if(req.method==="GET"&&/^\/icons\/[a-z0-9-]+\.(png|svg|webmanifest)$/.test(p)){const f=path.join(__dirname,"public/icons",path.basename(p));if(!fs.existsSync(f))return send(res,404,{error:"Not found"});const ty={png:"image/png",svg:"image/svg+xml",webmanifest:"application/manifest+json"}[p.split(".").pop()];res.writeHead(200,{"Content-Type":ty,"Cache-Control":"public, max-age=86400","X-Content-Type-Options":"nosniff"});return res.end(fs.readFileSync(f))}
 if(req.method==="GET"&&/^\/fonts\/[a-z0-9-]+\.woff2$/.test(p)){const f=path.join(__dirname,"public/fonts",path.basename(p));if(!fs.existsSync(f))return send(res,404,{error:"Not found"});res.writeHead(200,{"Content-Type":"font/woff2","Cache-Control":"public, max-age=31536000, immutable","Access-Control-Allow-Origin":"*"});return res.end(fs.readFileSync(f))}
 if(req.method==="GET"&&/^\/js\/(a\d+|lz\d+)\.[0-9a-f]{10}\.js$/.test(p)){const f=path.join(__dirname,"public/js",path.basename(p));if(!fs.existsSync(f))return send(res,404,{error:"Not found"});res.writeHead(200,{"Content-Type":"text/javascript; charset=utf-8","Cache-Control":"public, max-age=31536000, immutable"});return res.end(fs.readFileSync(f))}
 if(req.method==="GET"&&p==="/sw.js"){res.writeHead(200,{"Content-Type":"text/javascript; charset=utf-8","Cache-Control":"no-cache","Service-Worker-Allowed":"/"});return res.end(SW_JS)}
 if(req.method==="GET"&&p==="/robots.txt"){res.writeHead(200,{"Content-Type":"text/plain; charset=utf-8"});return res.end("User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /auth/\nDisallow: /u/\nSitemap: "+ORIGIN(req)+"/sitemap.xml\n")}
 if(req.method==="GET"&&p==="/sitemap.xml"){const o=ORIGIN(req),d=DB();const urls=["/"].concat((d.users||[]).filter(u=>u.role==="contractor"&&u.biz).map(u=>"/p/"+u.id),(d.tcalls||[]).filter(c=>c.status!=="closed").map(c=>"/t/"+c.id));res.writeHead(200,{"Content-Type":"application/xml; charset=utf-8","Cache-Control":"public, max-age=3600"});return res.end('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(u=>"<url><loc>"+o+u+"</loc></url>").join("\n")+"\n</urlset>\n")}
 {const sm=/^\/([pt])\/([A-Za-z0-9_-]{1,40})$/.exec(p);if(req.method==="GET"&&sm){const html=SEO_PAGE(req,sm[1],sm[2]);if(!html)return htmlPage(res,404,"Not found","<p>That page doesn't exist. <a href=\"/\">Go home</a></p>");return sendHtml(res,req,200,html)}}
 {const em=/^\/embed\/([A-Za-z0-9_-]{1,40})$/.exec(p);if(req.method==="GET"&&em)return embedPage(req,res,em[1],url)}
 if(req.method==="GET"&&p==="/favicon.ico"){res.writeHead(200,{"Content-Type":"image/png","Cache-Control":"public, max-age=86400"});return res.end(fs.readFileSync(path.join(__dirname,"public/icons/favicon-32.png")))}
 if(req.method==="GET"&&p==="/healthz")return send(res,200,{ok:true,v:APP_VERSION,app:BRAND.name,data:VER});
 if(req.method==="GET"&&/^\/u\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(p)){const f=path.join(UPLOADS,path.basename(p));if(!fs.existsSync(f))return send(res,404,{error:"Not found"});const ext=p.split(".").pop();res.writeHead(200,{"Content-Type":ext==="jpg"?"image/jpeg":"image/"+ext,"Cache-Control":"public, max-age=31536000, immutable","Content-Security-Policy":"default-src 'none'; sandbox"});return fs.createReadStream(f).pipe(res)}
 if(req.method==="GET"&&p==="/auth/magic")return AUTH.magic(req,res,url);
 {const m=/^\/auth\/oauth\/(google|apple|microsoft|facebook)\/(start|demo|callback)$/.exec(p);if(m){
  if(m[2]==="start"&&req.method==="GET")return AUTH.oauthStart(req,res,m[1],url);
  if(m[2]==="demo"&&req.method==="GET")return AUTH.oauthDemo(req,res,m[1],url);
  if(m[2]==="callback"){if(req.method==="POST"){if(!/x-www-form-urlencoded/.test(req.headers["content-type"]||""))return htmlPage(res,415,"Bad request","");const o=req.headers.origin;if(o&&o!=="null"&&new URL(o).host!==req.headers.host&&m[1]!=="apple")return htmlPage(res,403,"Blocked","<p>Cross-site form post refused.</p>");return AUTH.oauthCallback(req,res,m[1],url,await formBody(req))}return AUTH.oauthCallback(req,res,m[1],url,null)}
  return htmlPage(res,405,"Method not allowed","")}}
 if(!p.startsWith("/api/")){
  if(req.method==="GET"){const v=viewRoute(p);if(v){const mm=VIEW_META[v];return sendHtml(res,req,200,withMeta(req,{title:mm?mm[0]+" · Sawyer":"Sawyer: hire pros you'd trust with your house",desc:mm?mm[1]:"Find trusted local contractors. Free for customers. Pros pay a flat $20/mo with no lead fees.",path:p.replace(/\/$/,"")}))}
   return htmlPage(res,404,"Page not found","<p>That page doesn't exist. <a href=\"/\">Go to the home page</a></p>")}
  return send(res,404,{error:"Not found"})}
 if(req.method==="POST"&&p==="/api/upload")return upload(req,res);
 if(req.method==="POST"){const o=req.headers.origin;if(o&&req.headers.host&&new URL(o).host!==req.headers.host)return send(res,403,{error:"Bad origin"});if(!/application\/json/.test(req.headers["content-type"]||""))return send(res,415,{error:"JSON only"})}
 if(limited("all:"+ip(req),600,60e3))return send(res,429,{error:"Too many requests, slow down."});
 const uid=sessionUid(req);
 if(req.method==="GET"&&p==="/api/state"){const v=+url.searchParams.get("v");if(v&&v===VER)return send(res,200,{same:true});return send(res,200,{state:snapshot(uid)})}
 if(req.method==="GET"&&p==="/api/auth/methods")return send(res,200,AUTH.methods());
 if(req.method==="GET"&&p==="/api/account"){if(!uid)return send(res,401,{error:"Sign in first"});const a=db.prepare("SELECT email,phone,hash FROM accounts WHERE uid=?").get(uid)||{};return send(res,200,{email:/@phone\.invalid$/.test(a.email||"")?null:a.email,phone:a.phone||null,password:!!a.hash,passkeys:AUTH.pkList(uid),linked:AUTH.linked(uid),methods:AUTH.methods()})}
 if(req.method!=="POST")return send(res,405,{error:"Method not allowed"});
 const b=clean(await body(req));
 if(p==="/api/login"){
  const email=String(b.email||"").trim().toLowerCase().slice(0,254),pw=String(b.password||"");
  const kA="loginfail:"+ip(req)+"|"+email,kI="loginfail:"+ip(req),W=15*60e3;
  if(overLimit(kA,+process.env.LOGIN_RATE_MAX||10,W)||overLimit(kI,+process.env.LOGIN_IP_MAX||50,W))return send(res,429,{error:"Too many wrong passwords. Try again in 15 minutes."},{"Retry-After":"900"});
  const a=db.prepare("SELECT * FROM accounts WHERE email=?").get(email);
  if(!a||!a.hash||!checkPw(pw,a.salt,a.hash)){addHit(kA);addHit(kI);return send(res,401,{error:"Wrong email or password."})}
  hits.delete(kA);
  const t=newSession(a.uid);setCookie(res,req,t,SESS_DAYS*86400);return send(res,200,{ok:true,state:snapshot(a.uid)})}
 // staff-only trust action: mark a pro's license + insurance as checked. Off unless ADMIN_TOKEN is set on the server.
 if(p==="/api/staff/verify"){const tok=process.env.ADMIN_TOKEN||"",got=String(req.headers["x-admin-token"]||"");if(!tok||got.length!==tok.length||!crypto.timingSafeEqual(Buffer.from(got),Buffer.from(tok)))return send(res,404,{error:"Not found"});
  const u=DB().users.find(x=>x.id===String(b.uid||"")&&x.role==="contractor");if(!u)return send(res,400,{error:"Unknown pro"});u.verified=b.verified!==false;u.verifyPending=false;u.verifiedAt=u.verified?Date.now():null;persist();return send(res,200,{ok:true,uid:u.id,verified:u.verified})}
 if(p==="/api/auth/start")return AUTH.start(req,res,b);
 if(p==="/api/auth/verify")return AUTH.verify(req,res,b);
 if(p==="/api/passkey/login/options")return AUTH.pkLoginOptions(req,res);
 if(p==="/api/passkey/login/verify")return AUTH.pkLoginVerify(req,res,b);
 if(p.startsWith("/api/passkey/")||p==="/api/account/password"){if(!uid)return send(res,401,{error:"Sign in first"});const u=DB().users.find(x=>x.id===uid)||{};
  if(p==="/api/passkey/register/options")return AUTH.pkRegOptions(req,res,uid,{email:(db.prepare("SELECT email FROM accounts WHERE uid=?").get(uid)||{}).email,name:u.name});
  if(p==="/api/passkey/register/verify")return AUTH.pkRegVerify(req,res,uid,b);
  if(p==="/api/passkey/delete")return send(res,200,{ok:AUTH.pkDelete(uid,b.id)});
  // SW-032: changing an existing password needs the current one (a session cookie alone isn't enough), and signs out other sessions.
  if(p==="/api/account/password"){const pw=String(b.password||"");if(pw.length<8||pw.length>200)return send(res,400,{error:"Password must be at least 8 characters."});
   const acc=db.prepare("SELECT salt,hash FROM accounts WHERE uid=?").get(uid)||{};const kP="pwfail:"+uid;
   const reset=codeFresh(req)&&!b.current;if(acc.hash&&!reset){if(overLimit(kP,5,15*60e3))return send(res,429,{error:"Too many wrong passwords. Try again in 15 minutes."},{"Retry-After":"900"});
    if(!checkPw(String(b.current||""),acc.salt,acc.hash)){addHit(kP);return send(res,403,{error:"Your current password isn't right."})}hits.delete(kP)}
   const h=hashPw(pw);db.prepare("UPDATE accounts SET salt=?,hash=? WHERE uid=?").run(h.salt,h.hash,uid);
   if(reset)CODE_SESS.delete(cookies(req).swsid);if(acc.hash)db.prepare("DELETE FROM sessions WHERE uid=? AND token<>?").run(uid,cookies(req).swsid||"");return send(res,200,{ok:true})}
  return send(res,404,{error:"Not found"})}
 if(p==="/api/logout"){const t=cookies(req).swsid;if(t)db.prepare("DELETE FROM sessions WHERE token=?").run(t);setCookie(res,req,"",0);return send(res,200,{ok:true,state:snapshot(null)})}
 // v13 (QA SW-034): delete my account. Ends every session, removes sign-in methods and uploads, anonymizes the profile
 // (reviews stay, credited to "Former Sawyer member"). Shared demo accounts can't be deleted.
 if(p==="/api/account/delete"){if(!uid)return send(res,401,{error:"Sign in first"});if(String(b.confirm||"")!=="DELETE")return send(res,400,{error:'Type DELETE to confirm.'});
  const u=DB().users.find(x=>x.id===uid);if(!u)return send(res,404,{error:"Account not found"});if(u.demo)return send(res,400,{error:"Demo accounts are shared, so they can't be deleted. Create your own account to try this."});
  const r=run(uid,"__delete13",[]);if(!r||!r.ok)return send(res,400,{error:(r&&r.msg)||"Couldn't delete the account."});
  const a=db.prepare("SELECT email,phone FROM accounts WHERE uid=?").get(uid)||{};
  for(const up of db.prepare("SELECT name FROM uploads WHERE uid=?").all(uid)){try{fs.unlinkSync(path.join(UPLOADS,up.name))}catch(e){}}
  db.prepare("DELETE FROM uploads WHERE uid=?").run(uid);db.prepare("DELETE FROM sessions WHERE uid=?").run(uid);db.prepare("DELETE FROM accounts WHERE uid=?").run(uid);
  for(const t of ["passkeys","identities"])try{db.prepare("DELETE FROM "+t+" WHERE uid=?").run(uid)}catch(e){}
  for(const t of [a.email,a.phone].filter(Boolean))try{db.prepare("DELETE FROM codes WHERE target=?").run(String(t).toLowerCase())}catch(e){}
  setCookie(res,req,"",0);return send(res,200,{ok:true,state:snapshot(null)})}
 if(p==="/api/signup"){
  if(limited("signup:"+ip(req),20,60*60e3))return send(res,429,{error:"Too many sign-ups from this network. Try later."});
  const kind=b.kind,d=b.data&&typeof b.data==="object"?b.data:{},pw=String(b.password||"");
  if(!["customer","pro","pm"].includes(kind))return send(res,400,{error:"Bad account type"});
  const email=String(d.email||"").trim().toLowerCase();
  if(!EMAIL.test(email))return send(res,400,{error:"Enter a valid email."});
  if(pw.length<8||pw.length>200)return send(res,400,{error:"Password must be at least 8 characters."});
  if(!String(d.name||"").trim()||String(d.name).length>80)return send(res,400,{error:"Enter your name (80 characters max)."});
  if(db.prepare("SELECT 1 FROM accounts WHERE email=?").get(email)||DB().users.some(u=>(u.email||"").toLowerCase()===email))return send(res,409,{error:"That email already has an account. Log in instead."});
  d.email=email;let r;DB().me=null;
  try{r=kind==="customer"?api.A.signupCustomer(String(d.name),email,String(d.zip||"")):kind==="pm"?api.A.signupPM(d):api.A.signupPro(d)}catch(e){r={ok:false,msg:"Sign-up failed, check the form."}}
  const newId=DB().me;DB().me=null;
  if(!r||!r.ok||!newId){if(dirty)persist();return send(res,400,{error:(r&&r.msg)||"Sign-up failed"})}
  const role=DB().users.find(u=>u.id===newId).role;const h=hashPw(pw);
  db.prepare("INSERT INTO accounts(uid,email,salt,hash,role,created) VALUES(?,?,?,?,?,?)").run(newId,email,h.salt,h.hash,role,Date.now());persist();
  const t=newSession(newId);setCookie(res,req,t,SESS_DAYS*86400);return send(res,200,{res:r,state:snapshot(newId)})}
 if(p==="/api/act"){
  const name=String(b.name||""),args=Array.isArray(b.args)?b.args.slice(0,6):[];
  if(!ACTIONS.has(name))return send(res,400,{error:"Unknown action"});
  if(!uid)return send(res,401,{error:"Sign in first",need:"login",state:snapshot(null)});
  if(limited("act:"+uid,120,60e3))return send(res,429,{error:"Too many actions, slow down."});
  if(name==="addLedger"&&args[0]&&args[0].photo&&!ownsUpload(uid,args[0].photo))return send(res,200,{res:{ok:false,msg:"Upload the receipt photo again"},state:snapshot(uid)});
 if(name==="addPhoto"&&!ownsUpload(uid,args[2]))return send(res,200,{res:{ok:false,msg:"Upload the photo again"},state:snapshot(uid)});
  if(name==="postJob"&&args[0]&&Array.isArray(args[0].photos))args[0].photos=args[0].photos.filter(u=>ownsUpload(uid,u));
  if(name==="saveDoc"&&args[0]&&args[0].file&&!ownsUpload(uid,args[0].file)){const prev=(DB().bdocs||[]).find(d=>d.id===args[0].id&&d.by===uid);if(!prev||prev.file!==args[0].file)args[0].file=""}
  if(name==="saveEstimate"&&args[0]&&args[0].photo&&!ownsUpload(uid,args[0].photo))return send(res,200,{res:{ok:false,msg:"Upload the photo again"},state:snapshot(uid)});
  if(name==="updatePro"){const me_=DB().users.find(u=>u.id===uid);if(!me_||me_.role!=="contractor")return send(res,403,{error:"Only pro accounts have a pro profile",res:{ok:false,msg:"Only pro accounts have a pro profile"},state:snapshot(uid)});args[0]=pickPro(args[0]);args.length=1}
  stripPriv(args);
  if(name==="hire"){const cand=DB().users.find(u=>u.id===args[1]);if(!cand||cand.role!=="contractor")return send(res,400,{error:"Pick a pro who quoted",res:{ok:false,msg:"Pick a pro who quoted"},state:snapshot(uid)})}
  // v13 (QA SW-037): a portfolio is only cleared by an explicit empty list; if every submitted photo is rejected, nothing is written.
  if(name==="setGal12"){if(!Array.isArray(args[0]))return send(res,200,{res:{ok:false,msg:"Send a list of photos"},state:snapshot(uid)});const gu=DB().users.find(u=>u.id===uid)||{};const prev=new Set((gu.gal12||[]).map(x=>x.src));const n=args[0].length;
   args[0]=args[0].filter(x=>x&&typeof x.src==="string"&&(prev.has(x.src)||ownsUpload(uid,x.src)));
   if(n&&!args[0].length)return send(res,200,{res:{ok:false,msg:"Those photos couldn't be added. Upload them again from your device."},state:snapshot(uid)})}
  if(name==="homeItem12"&&args[0]&&args[0].photo&&!ownsUpload(uid,args[0].photo))args[0].photo="";
  // demo accounts auto-reply (they're not real people); real users never get fake replies
  const isDemo=id=>!!(DB().users.find(u=>u.id===id)||{}).demo;
  allowAuto=(name==="send"&&isDemo(args[0]))||name==="inviteCrew"||(name==="crewSend"&&(()=>{const pr=(DB().projects||[]).find(x=>x.id===args[0]);return pr&&pr.demo})());
  // v14: first contact is capped (anyone may message a pro's public profile, so cold outreach is the spam path).
  // Up to NEW_THREAD_MAX new conversations per sender per 24 h; replies in existing threads are never limited.
  // SW-041: a missing recipient is a normal "doesn't exist" error, not the cap. Check the account exists before counting or refusing a new thread.
  let newThread=false;if(name==="send"){const to=String(args[0]||"");const exists=!!(to&&DB().users.find(u=>u.id===to));newThread=exists&&to!==uid&&!DB().msgs.some(x=>(x.a===uid&&x.b===to)||(x.a===to&&x.b===uid));
   if(newThread){const now=Date.now(),k="newthread:"+uid,a=(hits.get(k)||[]).filter(t=>now-t<864e5);hits.set(k,a);if(a.length>=NEW_THREAD_MAX*RATE_X)return send(res,429,{error:"You've started a lot of new conversations today. Reply in your existing threads, or try again tomorrow.",res:{ok:false,msg:"You've started a lot of new conversations today. Reply in your existing threads, or try again tomorrow."},state:snapshot(uid)})}}
  const r=run(uid,name,args);allowAuto=false;
  if(newThread&&r&&r.ok!==false&&DB().msgs.some(x=>x.from===uid&&(x.a===String(args[0])||x.b===String(args[0]))))hits.get("newthread:"+uid).push(Date.now());
  return send(res,200,{res:r===undefined?{ok:true}:r,state:snapshot(uid)})}
 return send(res,404,{error:"Not found"});
 }catch(e){console.error(e);return send(res,400,{error:"Bad request"})}
});
// v10: recurring invoices and overdue reminders run on the server too, so they go out even when the pro doesn't open the app.
// v16: expiry notices for licenses, policies, permits and vendor COIs go out for every account that has a dated record,
// not only for pros with payment reminders on, so nobody has to open the app to hear their insurance is about to lapse.
function sweepAll(){try{const d=DB();const dated=new Set((d.bdocs||[]).filter(x=>x&&x.exp).map(x=>x.by));
 for(const u of (d.users||[]).slice()){const pro=u.role==="contractor"&&(u.autoRem9||(d.bills||[]).some(b=>b.by===u.id&&b.rec9&&b.rec9.on));
  const has=pro||dated.has(u.id)||(u.cois||[]).some(c=>c&&c.exp);if(has)run(u.id,"sweep9",[])}}catch(e){console.error("sweep",e.message)}}
setTimeout(sweepAll,5000).unref();setInterval(sweepAll,+process.env.SWEEP_MS||3600e3).unref();
setInterval(()=>{db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());const now=Date.now();for(const[k,a]of hits)if(!a.some(t=>now-t<(k.startsWith("newthread:")?864e5:3600e3)))hits.delete(k)},3600e3).unref();
server.listen(PORT,HOST,()=>{console.log(`${BRAND.name} live on http://${HOST}:${PORT} (data: ${DATA})`);
 // v10 perf: warm the max-compression cache for the signed-out home page so the first visitor after a deploy gets the small copy
 const warm=()=>{try{require("http").get({host:HOST==="0.0.0.0"?"127.0.0.1":HOST,port:PORT,path:"/",headers:{"Accept-Encoding":"br"}},r=>r.resume()).on("error",()=>{})}catch(e){}};setTimeout(warm,300).unref();setTimeout(warm,4000).unref()});
for(const sig of ["SIGTERM","SIGINT"])process.on(sig,()=>{server.close();try{db.close()}catch(e){}process.exit(0)});
