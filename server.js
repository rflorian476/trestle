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
const COLS=["users","jobs","reviews","msgs","quotes","notifs","projects","pmsgs","estimates"];
const BRAND=require("./brand.json");const APP_VERSION=require("./package.json").version+"-"+BRAND.slug;
const UPLOADS=path.join(DATA,"uploads");fs.mkdirSync(UPLOADS,{recursive:true});
const MAX_UPLOAD=5*1024*1024;

/* ---- shared business rules: the same A.* actions the UI was built on, run server-side ---- */
let VER=Date.now(),allowAuto=false,dirty=false;
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
function persist(){const d=DB();for(const c of COLS)setKV.run(c,JSON.stringify(d[c]||[]),Date.now());setKV.run("meta",JSON.stringify({v:1,seeded:true}),Date.now());VER++;dirty=false}
function hashPw0(pw){const salt=crypto.randomBytes(16).toString("hex");return{salt,hash:crypto.scryptSync(pw,salt,64,{N:16384,r:8,p:1}).toString("hex")}}
// first boot: seed demo data, clearly labeled
{const d=DB();if(!getKV.get("meta")||!JSON.parse(getKV.get("meta").v).labeled){
  d.users.forEach(u=>{u.demo=true;u.email=u.id+"@demo.invalid"});(d.projects||[]).forEach(p=>{p.demo=true;if(!/^Demo: /.test(p.title))p.title="Demo: "+p.title});(d.jobs||[]).forEach(j=>j.demo=true);
  d.pmsgs=(d.pmsgs||[]);d.me=null;persist();setKV.run("meta",JSON.stringify({v:1,seeded:true,labeled:true}),Date.now());console.log("seeded demo data:",d.users.length,"users")}}
// demo logins (README): fixed accounts for the seeded homeowner, pro and project manager
const DEMO_PW=BRAND.slug+"-demo-2026";
for(const[uid_,email]of[["u1","demo-homeowner@"+BRAND.slug+".test"],["c1","demo-pro@"+BRAND.slug+".test"],["m1","demo-pm@"+BRAND.slug+".test"],["c26","demo-remodeler@"+BRAND.slug+".test"]]){
 const u=DB().users.find(x=>x.id===uid_);if(!u||db.prepare("SELECT 1 FROM accounts WHERE uid=? OR email=?").get(uid_,email))continue;
 const h=hashPw0(DEMO_PW);db.prepare("INSERT INTO accounts(uid,email,salt,hash,role,created) VALUES(?,?,?,?,?,?)").run(uid_,email,h.salt,h.hash,u.role,Date.now());u.email=email;persist()}
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
function setCookie(res,req,t,maxAge){const secure=(req.socket.encrypted||(TRUST_PROXY&&(String(req.headers["x-forwarded-proto"]||"").split(",")[0].trim()==="https"||/https/.test(req.headers["cf-visitor"]||""))))?"; Secure":"";res.setHeader("Set-Cookie",`swsid=${t}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`)}
const hits=new Map();
function limited(key,max,winMs){const now=Date.now();const a=(hits.get(key)||[]).filter(t=>now-t<winMs);a.push(now);hits.set(key,a);return a.length>max}
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
const ACTIONS=new Set(["updatePro","fav","postJob","interest","quote","hire","complete","review","reply","send","readNotifs","readNotif","postProject","applyRole","acceptApp","declineApp","markDone","reviewCrew","advancePhase","crewSend","inviteCrew","respondInvite","addPhoto","confirmDone","setMilestones","fundMilestone","requestRelease","releaseMilestone","saveEstimate","setBusy","flagLead","reportNoShow","disputeReview","sharePhone","cancelPlan","resumePlan","requestCOI","sendCOI","addLocation","addRecurring","updateMe"]);
const PRO_LOCKED=["id","role","email","verified","paid","founding","bg","demo","joined","favs"];

/* ---- user-scoped snapshot: no password data, no other people's private messages/emails ---- */
function snapshot(uid){const d=DB();const crewOf=p=>(p.roles||[]).flatMap(r=>r.filled||[]);
 const rc=ctx.__v2&&ctx.__v2.respCalc;
 const users=d.users.map(u=>{const c=Object.assign({},u);if(u.id!==uid){delete c.email;if(u.role!=="contractor"&&!(u.sharedWith||[]).includes(uid))delete c.phone;delete c.sharedWith;delete c.credits;delete c.coiReqs;delete c.flags;delete c.favs;delete c.plan}if(u.role==="contractor"&&rc){try{c.rs=rc(u.id)}catch(e){}}return c});
 const jobs=d.jobs.map(j=>{const party=uid&&(j.cust===uid||j.hired===uid);if(party)return j;const c=Object.assign({},j);delete c.escrow;const done=j.status==="completed"&&j.custConfirmed;if(!done)delete c.photos;return c});
 const myJobs=new Set(d.jobs.filter(j=>j.cust===uid).map(j=>j.id));
 const quotes=d.quotes.map(q=>(q.cid===uid||myJobs.has(q.job))?q:Object.assign({},q,{price:null,note:""}));
 const pm=new Map((d.projects||[]).map(p=>[p.id,p]));
 const pmsgs=(d.pmsgs||[]).filter(m=>{const p=pm.get(m.pid);if(!p||!uid)return false;if(m.from===uid||m.to===uid)return true;return m.to==="all"&&(p.pm===uid||crewOf(p).includes(uid))});
 return{v:1,_v:VER,users,jobs,estimates:uid?(d.estimates||[]).filter(e=>e.uid===uid):[],reviews:d.reviews,quotes,msgs:uid?d.msgs.filter(m=>m.a===uid||m.b===uid):[],notifs:uid?d.notifs.filter(n=>n.to===uid):[],projects:d.projects||[],pmsgs,me:uid&&d.users.some(u=>u.id===uid)?uid:null,theme:"light",recent:[]}}

function run(uid,name,args){const d=DB();d.me=uid;let r;try{r=api.A[name](...args)}catch(e){r={ok:false,msg:"That didn't work. The item may have changed, refresh and try again."}}finally{DB().me=null}if(dirty)persist();return r}

/* ---- http ---- */
const INDEX=()=>fs.readFileSync(path.join(__dirname,"public/index.html"));
function send(res,code,obj,extra){if(code>=400&&code<500&&code!==404&&code!==405&&code!==415){obj.status=code;code=200}res.writeHead(code,Object.assign({"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"},extra||{}));res.end(JSON.stringify(obj))}
function body(req){return new Promise((ok,no)=>{let n=0,c=[];req.on("data",b=>{n+=b.length;if(n>256e3){no(new Error("too big"));req.destroy()}else c.push(b)});req.on("end",()=>{try{ok(c.length?JSON.parse(Buffer.concat(c).toString()):{})}catch(e){no(e)}})})}
const SEC={"X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"same-origin","Permissions-Policy":"geolocation=(), camera=(), microphone=()"};
/* ---- photo uploads: images only, 5 MB max, magic bytes checked, stored under DATA_DIR/uploads ---- */
const IMG={"image/jpeg":{ext:"jpg",ok:b=>b[0]===0xff&&b[1]===0xd8&&b[2]===0xff},"image/png":{ext:"png",ok:b=>b.slice(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))},"image/webp":{ext:"webp",ok:b=>b.slice(0,4).toString("latin1")==="RIFF"&&b.slice(8,12).toString("latin1")==="WEBP"}};
function upload(req,res){
 const send=(res,code,o)=>{if(code!==200)o.status=code;res.writeHead(200,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});res.end(JSON.stringify(o))};
 const o=req.headers.origin;if(o&&req.headers.host&&new URL(o).host!==req.headers.host)return send(res,403,{error:"Bad origin"});
 const uid=sessionUid(req);if(!uid){req.resume();return send(res,401,{error:"Sign in to upload photos"})}
 const type=String(req.headers["content-type"]||"").split(";")[0].trim().toLowerCase(),t=IMG[type];
 if(!t){req.resume();return send(res,415,{error:"JPEG, PNG or WebP images only"})}
 if(+req.headers["content-length"]>MAX_UPLOAD){req.resume();return send(res,413,{error:"Photos must be 5 MB or smaller"})}
 if(limited("up:"+uid,30,60*60e3)){req.resume();return send(res,429,{error:"Upload limit reached, try again later"})}
 let n=0,c=[],dead=false;
 req.on("data",b=>{if(dead)return;n+=b.length;if(n>MAX_UPLOAD){dead=true;send(res,413,{error:"Photos must be 5 MB or smaller"});req.resume()}else c.push(b)});
 req.on("end",()=>{if(dead)return;const buf=Buffer.concat(c);if(buf.length<12||!t.ok(buf))return send(res,415,{error:"That file isn't a valid image"});
  const name=crypto.randomBytes(16).toString("hex")+"."+t.ext;fs.writeFileSync(path.join(UPLOADS,name),buf);
  db.prepare("INSERT INTO uploads VALUES(?,?,?,?,?)").run(name,uid,type,buf.length,Date.now());send(res,200,{ok:true,url:"/u/"+name})})}
const ownsUpload=(uid,url)=>{const m=/^\/u\/([a-f0-9]{32}\.(?:jpg|png|webp))$/.exec(String(url||""));return !!(m&&db.prepare("SELECT 1 FROM uploads WHERE name=? AND uid=?").get(m[1],uid))};
/* ---- passwordless, passkeys, OAuth (lib/auth.js) ---- */
function htmlPage(res,code,title,inner){const e=v=>String(v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));res.writeHead(code,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"});
 res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)} · ${BRAND.name}</title><style>body{font:16px/1.5 system-ui,sans-serif;background:#F7F5F0;color:#14202B;display:grid;place-items:center;min-height:100vh;margin:0;padding:20px}main{background:#fff;max-width:420px;width:100%;padding:28px;border-radius:16px;box-shadow:0 10px 40px -20px rgba(0,0,0,.3)}h1{font-size:22px;margin:0 0 12px}.demo{background:#FFF4D6;border:1px solid #E8C25A;color:#6B4E00;font-weight:700;font-size:13px;letter-spacing:.04em;padding:8px 12px;border-radius:8px;margin-bottom:14px}label{display:block;font-weight:600;font-size:14px;margin:12px 0 0}input{display:block;width:100%;box-sizing:border-box;padding:11px 12px;margin-top:6px;border:1px solid #C9CFD4;border-radius:10px;font:inherit}button{margin-top:18px;width:100%;padding:12px;border:0;border-radius:10px;background:#14202B;color:#fff;font:600 16px system-ui;cursor:pointer}a{color:#1D5FA8}</style></head><body><main><h1>${e(title)}</h1>${inner}</main></body></html>`)}
function createUser({role,name,email,phone}){const d=DB();d.me=null;const nm=String(name||"").trim().slice(0,80);const em=email||("sms-"+String(phone).replace(/\D/g,"")+"@phone.invalid");
 if(db.prepare("SELECT 1 FROM accounts WHERE email=?").get(em))return{ok:false,msg:"That email already has an account"};
 let r;try{r=role==="pro"?api.A.signupPro({name:nm||"New pro",email:em,biz:(nm||"New")+" (finish setup)",trade:"Handyman",zip:"78704",phone:phone||""}):role==="pm"?api.A.signupPM({name:nm||"New member",biz:"Your company",email:em,zip:"78704"}):api.A.signupCustomer(nm||"New member",em,"78704")}catch(e){r={ok:false}}
 const id=d.me;d.me=null;if(!r||!r.ok||!id){if(dirty)persist();return{ok:false,msg:(r&&r.msg)||"Sign-up failed"}}
 const u=d.users.find(x=>x.id===id);u.needsSetup=true;if(phone)u.phone=phone;if(!email)u.emailHidden=true;if(role==="business"){u.acct="business";u.locations=[];u.recurring=[]}
 db.prepare("INSERT INTO accounts(uid,email,salt,hash,role,created,phone) VALUES(?,?,?,?,?,?,?)").run(id,em,"","",u.role,Date.now(),phone||null);persist();return{ok:true,uid:id}}
const AUTH=require("./lib/auth.js")({db,limited,ip:r=>ip(r),newSession,setCookie,sessionUid,send,createUser,SESS_DAYS,brand:BRAND,html:htmlPage});
function formBody(req){return new Promise((ok,no)=>{let n=0,c=[];req.on("data",b=>{n+=b.length;if(n>16e3){no(new Error("too big"));req.destroy()}else c.push(b)});req.on("end",()=>ok(Object.fromEntries(new URLSearchParams(Buffer.concat(c).toString()))))})}
const server=http.createServer(async(req,res)=>{
 for(const[k,v]of Object.entries(SEC))res.setHeader(k,v);
 const url=new URL(req.url,"http://x");const p=url.pathname;
 try{
 if(req.method==="GET"&&(p==="/"||p==="/index.html")){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-cache"});return res.end(INDEX())}
 if(req.method==="GET"&&/^\/icons\/[a-z0-9-]+\.(png|svg|webmanifest)$/.test(p)){const f=path.join(__dirname,"public/icons",path.basename(p));if(!fs.existsSync(f))return send(res,404,{error:"Not found"});const ty={png:"image/png",svg:"image/svg+xml",webmanifest:"application/manifest+json"}[p.split(".").pop()];res.writeHead(200,{"Content-Type":ty,"Cache-Control":"public, max-age=86400","X-Content-Type-Options":"nosniff"});return res.end(fs.readFileSync(f))}
 if(req.method==="GET"&&p==="/favicon.ico"){res.writeHead(200,{"Content-Type":"image/png","Cache-Control":"public, max-age=86400"});return res.end(fs.readFileSync(path.join(__dirname,"public/icons/favicon-32.png")))}
 if(req.method==="GET"&&p==="/healthz")return send(res,200,{ok:true,v:APP_VERSION,app:BRAND.name,data:VER});
 if(req.method==="GET"&&/^\/u\/[a-f0-9]{32}\.(jpg|png|webp)$/.test(p)){const f=path.join(UPLOADS,path.basename(p));if(!fs.existsSync(f))return send(res,404,{error:"Not found"});const ext=p.split(".").pop();res.writeHead(200,{"Content-Type":ext==="jpg"?"image/jpeg":"image/"+ext,"Cache-Control":"public, max-age=31536000, immutable","Content-Security-Policy":"default-src 'none'; sandbox"});return fs.createReadStream(f).pipe(res)}
 if(req.method==="GET"&&p==="/auth/magic")return AUTH.magic(req,res,url);
 {const m=/^\/auth\/oauth\/(google|apple|microsoft|facebook)\/(start|demo|callback)$/.exec(p);if(m){
  if(m[2]==="start"&&req.method==="GET")return AUTH.oauthStart(req,res,m[1],url);
  if(m[2]==="demo"&&req.method==="GET")return AUTH.oauthDemo(req,res,m[1],url);
  if(m[2]==="callback"){if(req.method==="POST"){if(!/x-www-form-urlencoded/.test(req.headers["content-type"]||""))return htmlPage(res,415,"Bad request","");const o=req.headers.origin;if(o&&o!=="null"&&new URL(o).host!==req.headers.host&&m[1]!=="apple")return htmlPage(res,403,"Blocked","<p>Cross-site form post refused.</p>");return AUTH.oauthCallback(req,res,m[1],url,await formBody(req))}return AUTH.oauthCallback(req,res,m[1],url,null)}
  return htmlPage(res,405,"Method not allowed","")}}
 if(!p.startsWith("/api/"))return send(res,404,{error:"Not found"});
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
  if(limited("login:"+ip(req),+process.env.LOGIN_RATE_MAX||10,15*60e3))return send(res,429,{error:"Too many login attempts. Try again in 15 minutes."});
  const email=String(b.email||"").trim().toLowerCase(),pw=String(b.password||"");
  const a=db.prepare("SELECT * FROM accounts WHERE email=?").get(email);
  if(!a||!a.hash||!checkPw(pw,a.salt,a.hash))return send(res,401,{error:"Wrong email or password."});
  const t=newSession(a.uid);setCookie(res,req,t,SESS_DAYS*86400);return send(res,200,{ok:true,state:snapshot(a.uid)})}
 if(p==="/api/auth/start")return AUTH.start(req,res,b);
 if(p==="/api/auth/verify")return AUTH.verify(req,res,b);
 if(p==="/api/passkey/login/options")return AUTH.pkLoginOptions(req,res);
 if(p==="/api/passkey/login/verify")return AUTH.pkLoginVerify(req,res,b);
 if(p.startsWith("/api/passkey/")||p==="/api/account/password"){if(!uid)return send(res,401,{error:"Sign in first"});const u=DB().users.find(x=>x.id===uid)||{};
  if(p==="/api/passkey/register/options")return AUTH.pkRegOptions(req,res,uid,{email:(db.prepare("SELECT email FROM accounts WHERE uid=?").get(uid)||{}).email,name:u.name});
  if(p==="/api/passkey/register/verify")return AUTH.pkRegVerify(req,res,uid,b);
  if(p==="/api/passkey/delete")return send(res,200,{ok:AUTH.pkDelete(uid,b.id)});
  if(p==="/api/account/password"){const pw=String(b.password||"");if(pw.length<8||pw.length>200)return send(res,400,{error:"Password must be at least 8 characters."});const h=hashPw(pw);db.prepare("UPDATE accounts SET salt=?,hash=? WHERE uid=?").run(h.salt,h.hash,uid);return send(res,200,{ok:true})}
  return send(res,404,{error:"Not found"})}
 if(p==="/api/logout"){const t=cookies(req).swsid;if(t)db.prepare("DELETE FROM sessions WHERE token=?").run(t);setCookie(res,req,"",0);return send(res,200,{ok:true,state:snapshot(null)})}
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
  if(!uid)return send(res,200,{error:"Sign in first",need:"login",state:snapshot(null)});
  if(limited("act:"+uid,120,60e3))return send(res,429,{error:"Too many actions, slow down."});
  if(name==="addPhoto"&&!ownsUpload(uid,args[2]))return send(res,200,{res:{ok:false,msg:"Upload the photo again"},state:snapshot(uid)});
  if(name==="saveEstimate"&&args[0]&&args[0].photo&&!ownsUpload(uid,args[0].photo))return send(res,200,{res:{ok:false,msg:"Upload the photo again"},state:snapshot(uid)});
  if(name==="updatePro"&&args[0]&&typeof args[0]==="object")for(const k of PRO_LOCKED)delete args[0][k];
  // demo accounts auto-reply (they're not real people); real users never get fake replies
  const isDemo=id=>!!(DB().users.find(u=>u.id===id)||{}).demo;
  allowAuto=(name==="send"&&isDemo(args[0]))||name==="inviteCrew"||(name==="crewSend"&&(()=>{const pr=(DB().projects||[]).find(x=>x.id===args[0]);return pr&&pr.demo})());
  const r=run(uid,name,args);allowAuto=false;
  return send(res,200,{res:r===undefined?{ok:true}:r,state:snapshot(uid)})}
 return send(res,404,{error:"Not found"});
 }catch(e){console.error(e);return send(res,400,{error:"Bad request"})}
});
setInterval(()=>{db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());const now=Date.now();for(const[k,a]of hits)if(!a.some(t=>now-t<3600e3))hits.delete(k)},3600e3).unref();
server.listen(PORT,HOST,()=>console.log(`${BRAND.name} live on http://${HOST}:${PORT} (data: ${DATA})`));
for(const sig of ["SIGTERM","SIGINT"])process.on(sig,()=>{server.close();try{db.close()}catch(e){}process.exit(0)});
