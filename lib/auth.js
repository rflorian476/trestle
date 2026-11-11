// Sawyer auth: one-time codes and magic links (email/SMS), passkeys (WebAuthn), and OAuth/OIDC
// (Google, Apple, Microsoft, Facebook). No dependencies. Each provider is live when its env vars
// are set; otherwise it runs in a clearly labeled test/demo mode.
"use strict";
const crypto=require("crypto");
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
const b64u=b=>Buffer.from(b).toString("base64url");
const fromB64u=s=>Buffer.from(String(s||""),"base64url");
const CODE_TTL=10*60e3,MAX_TRIES=5;
const E=process.env;
// Public hosts (Render, or NODE_ENV=production) must never reveal codes, magic links, or whether an account exists.
// AUTH_TEST_MODE=1 is a local-dev opt-in only; it is ignored on those hosts.
function isPublicHost(){return E.NODE_ENV==="production"||!!String(E.RENDER==null?"":E.RENDER).trim()}

/* ---------- providers ---------- */
const OAUTH={
 google:{label:"Google",live:()=>!!(E.GOOGLE_CLIENT_ID&&E.GOOGLE_CLIENT_SECRET),id:()=>E.GOOGLE_CLIENT_ID,secret:()=>E.GOOGLE_CLIENT_SECRET,
  auth:"https://accounts.google.com/o/oauth2/v2/auth",token:"https://oauth2.googleapis.com/token",scope:"openid email profile",iss:i=>i==="https://accounts.google.com"||i==="accounts.google.com",pkce:true},
 microsoft:{label:"Microsoft",live:()=>!!(E.MICROSOFT_CLIENT_ID&&E.MICROSOFT_CLIENT_SECRET),id:()=>E.MICROSOFT_CLIENT_ID,secret:()=>E.MICROSOFT_CLIENT_SECRET,
  get auth(){return`https://login.microsoftonline.com/${E.MICROSOFT_TENANT||"common"}/oauth2/v2.0/authorize`},get token(){return`https://login.microsoftonline.com/${E.MICROSOFT_TENANT||"common"}/oauth2/v2.0/token`},
  scope:"openid email profile",iss:i=>/^https:\/\/login\.microsoftonline\.com\/[0-9a-f-]{36}\/v2\.0$/.test(i),pkce:true},
 apple:{label:"Apple",live:()=>!!(E.APPLE_CLIENT_ID&&E.APPLE_TEAM_ID&&E.APPLE_KEY_ID&&E.APPLE_PRIVATE_KEY),id:()=>E.APPLE_CLIENT_ID,secret:()=>appleSecret(),
  auth:"https://appleid.apple.com/auth/authorize",token:"https://appleid.apple.com/auth/token",scope:"name email",iss:i=>i==="https://appleid.apple.com",formPost:true},
 facebook:{label:"Facebook",live:()=>!!(E.FACEBOOK_APP_ID&&E.FACEBOOK_APP_SECRET),id:()=>E.FACEBOOK_APP_ID,secret:()=>E.FACEBOOK_APP_SECRET,
  auth:"https://www.facebook.com/v19.0/dialog/oauth",token:"https://graph.facebook.com/v19.0/oauth/access_token",scope:"email,public_profile",userinfo:"https://graph.facebook.com/me?fields=id,name,email"}};
function appleSecret(){ // ES256 client-secret JWT, valid 5 minutes
 const now=Math.floor(Date.now()/1e3),h=b64u(JSON.stringify({alg:"ES256",kid:E.APPLE_KEY_ID})),p=b64u(JSON.stringify({iss:E.APPLE_TEAM_ID,iat:now,exp:now+300,aud:"https://appleid.apple.com",sub:E.APPLE_CLIENT_ID}));
 const sig=crypto.sign("sha256",Buffer.from(h+"."+p),{key:E.APPLE_PRIVATE_KEY.replace(/\\n/g,"\n"),dsaEncoding:"ieee-p1363"});return h+"."+p+"."+b64u(sig)}
const emailLive=()=>!!((E.RESEND_API_KEY||E.SENDGRID_API_KEY)&&E.EMAIL_FROM);
const smsLive=()=>!!(E.TWILIO_ACCOUNT_SID&&E.TWILIO_AUTH_TOKEN&&(E.TWILIO_FROM||E.TWILIO_MESSAGING_SERVICE_SID));
// Test mode shows codes on screen. Locally it is on when no provider is configured, or when AUTH_TEST_MODE=1.
// On a public host it is never on, even if AUTH_TEST_MODE=1 or no provider is configured.
const testMode=ch=>{if(isPublicHost())return false;if(E.AUTH_TEST_MODE==="1")return true;return ch==="email"?!emailLive():!smsLive()};

async function sendEmail(to,subject,text){
 if(E.RESEND_API_KEY){const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+E.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({from:E.EMAIL_FROM,to:[to],subject,text})});if(!r.ok)throw Error("email send failed "+r.status);return}
 const r=await fetch("https://api.sendgrid.com/v3/mail/send",{method:"POST",headers:{Authorization:"Bearer "+E.SENDGRID_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({personalizations:[{to:[{email:to}]}],from:{email:E.EMAIL_FROM},subject,content:[{type:"text/plain",value:text}]})});if(!r.ok)throw Error("email send failed "+r.status)}
async function sendSMS(to,text){
 const f=new URLSearchParams({To:to,Body:text});if(E.TWILIO_MESSAGING_SERVICE_SID)f.set("MessagingServiceSid",E.TWILIO_MESSAGING_SERVICE_SID);else f.set("From",E.TWILIO_FROM);
 const r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${E.TWILIO_ACCOUNT_SID}/Messages.json`,{method:"POST",headers:{Authorization:"Basic "+Buffer.from(E.TWILIO_ACCOUNT_SID+":"+E.TWILIO_AUTH_TOKEN).toString("base64")},body:f});if(!r.ok)throw Error("sms send failed "+r.status)}

/* ---------- minimal CBOR decoder (enough for WebAuthn attestation objects + COSE keys) ---------- */
function cbor(buf){let o=0;const rd=()=>{const ib=buf[o++],mt=ib>>5,ai=ib&31;let len=ai;
  if(ai===24)len=buf[o++];else if(ai===25){len=buf.readUInt16BE(o);o+=2}else if(ai===26){len=buf.readUInt32BE(o);o+=4}else if(ai===27){len=Number(buf.readBigUInt64BE(o));o+=8}else if(ai>27)throw Error("cbor: indefinite lengths unsupported");
  switch(mt){case 0:return len;case 1:return -1-len;case 2:{const b=buf.subarray(o,o+len);o+=len;return Buffer.from(b)}case 3:{const s=buf.toString("utf8",o,o+len);o+=len;return s}
   case 4:{const a=[];for(let i=0;i<len;i++)a.push(rd());return a}case 5:{const m=new Map();for(let i=0;i<len;i++){const k=rd();m.set(k,rd())}return m}
   case 6:return rd();case 7:return ai===20?false:ai===21?true:null}};const v=rd();return{v,end:o}}
function parseAuthData(a){const rpIdHash=a.subarray(0,32),flags=a[32],counter=a.readUInt32BE(33);const r={rpIdHash,flags,counter,up:!!(flags&1),uv:!!(flags&4)};
 if(flags&64){const l=a.readUInt16BE(53);r.credId=a.subarray(55,55+l);const k=cbor(a.subarray(55+l));r.cose=k.v}return r}
function coseToJwk(m){const kty=m.get(1),alg=m.get(3);
 if(kty===2&&alg===-7)return{alg:-7,jwk:{kty:"EC",crv:"P-256",x:b64u(m.get(-2)),y:b64u(m.get(-3))}};
 if(kty===3&&alg===-257)return{alg:-257,jwk:{kty:"RSA",n:b64u(m.get(-1)),e:b64u(m.get(-2))}};
 if(kty===1&&alg===-8)return{alg:-8,jwk:{kty:"OKP",crv:"Ed25519",x:b64u(m.get(-2))}};
 throw Error("Unsupported passkey algorithm")}
function verifySig(alg,jwk,data,sig){const key=crypto.createPublicKey({key:jwk,format:"jwk"});
 if(alg===-7)return crypto.verify("sha256",data,{key,dsaEncoding:"der"},sig);if(alg===-257)return crypto.verify("sha256",data,key,sig);if(alg===-8)return crypto.verify(null,data,key,sig);return false}

/* ---------- module ---------- */
module.exports=function makeAuth({db,limited,ip,newSession,setCookie,sessionUid,send,createUser,findUserByEmail,SESS_DAYS,brand,html,onCodeLogin,emailIsReal,markDemo,demoMayAdopt}){
 db.exec(`CREATE TABLE IF NOT EXISTS codes(id TEXT PRIMARY KEY,channel TEXT NOT NULL,target TEXT NOT NULL,code_hash TEXT NOT NULL,link_hash TEXT,role TEXT,name TEXT,exp INTEGER NOT NULL,tries INTEGER NOT NULL DEFAULT 0,used INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS passkeys(cred_id TEXT PRIMARY KEY,uid TEXT NOT NULL,jwk TEXT NOT NULL,alg INTEGER NOT NULL,counter INTEGER NOT NULL,label TEXT,created INTEGER NOT NULL,last_used INTEGER);
CREATE TABLE IF NOT EXISTS challenges(ch TEXT PRIMARY KEY,uid TEXT,kind TEXT NOT NULL,exp INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS oauth_states(state TEXT PRIMARY KEY,provider TEXT NOT NULL,verifier TEXT,nonce TEXT NOT NULL,role TEXT,bind TEXT NOT NULL,exp INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS identities(provider TEXT NOT NULL,sub TEXT NOT NULL,uid TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(provider,sub));`);
 for(const c of ["phone TEXT"])try{db.exec("ALTER TABLE accounts ADD COLUMN "+c)}catch(e){}
 const ROLES={homeowner:"customer",business:"business",pro:"contractor",pm:"pm"};
 const normPhone=p=>{const d=String(p||"").replace(/[^\d+]/g,"");const n=d.startsWith("+")?d:(d.length===10?"+1"+d:d.length===11&&d[0]==="1"?"+"+d:"");return/^\+\d{10,15}$/.test(n)?n:null};
 const EMAIL=/^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,}$/i;
 const acctBy=(ch,t)=>ch==="sms"?db.prepare("SELECT * FROM accounts WHERE phone=?").get(t):db.prepare("SELECT * FROM accounts WHERE email=?").get(t);
 const login=(res,req,uid,viaCode)=>{const t=newSession(uid);setCookie(res,req,t,SESS_DAYS*86400);if(viaCode&&onCodeLogin)onCodeLogin(t,uid)}; // v13 SW-033: a fresh one-time-code sign-in may reset a forgotten password
 function ensureAccount({channel,target,role,name,email,phone}){ // find or create; returns {uid,created}
  let a=channel?acctBy(channel,target):null;if(!a&&email)a=db.prepare("SELECT * FROM accounts WHERE email=?").get(email);
  if(a){if(phone&&!a.phone)db.prepare("UPDATE accounts SET phone=? WHERE uid=?").run(phone,a.uid);return{uid:a.uid,created:false}}
  const r=createUser({role:ROLES[role]?role:"homeowner",name:name||"",email:email||null,phone:phone||null});if(!r.ok)throw Error(r.msg||"Couldn't create the account");return{uid:r.uid,created:true}}
 const origin=req=>{const h=req.headers.host;const proto=(req.socket.encrypted||String(req.headers["x-forwarded-proto"]||"").startsWith("https"))?"https":"http";return E.PUBLIC_URL?E.PUBLIC_URL.replace(/\/$/,""):proto+"://"+h};
 const rpId=req=>E.PASSKEY_RP_ID||new URL(origin(req)).hostname;

 /* ----- config for the UI ----- */
 function methods(){const chMode=ch=>{if(testMode(ch))return"test";return(ch==="email"?emailLive():smsLive())?"live":"off"};const o={email:chMode("email"),sms:chMode("sms"),passkey:"live",oauth:{}};for(const k in OAUTH)o.oauth[k]=OAUTH[k].live()?"live":isPublicHost()?"off":"demo";return o}

 /* ----- one-time codes + magic links ----- */
 async function start(req,res,b){const ch=b.channel==="sms"?"sms":"email";
  const t=ch==="sms"?normPhone(b.to):String(b.to||"").trim().toLowerCase();
  if(!t||(ch==="email"&&!EMAIL.test(t)))return send(res,400,{error:ch==="sms"?"Enter a valid mobile number, e.g. (512) 555-0134.":"Enter a valid email."});
  if(limited("code-ip:"+ip(req),12,15*60e3)||limited("code-t:"+t,5,15*60e3))return send(res,429,{error:"Too many codes requested. Wait 15 minutes and try again."});
  const live=ch==="email"?emailLive():smsLive();
  // Refuse before a code is stored. The body does not depend on whether the account exists.
  if((isPublicHost()||!testMode(ch))&&!live)return send(res,503,{error:"Sign-in codes aren't available on this server until an email or text provider is configured."});
  const code=String(crypto.randomInt(0,1e6)).padStart(6,"0"),link=crypto.randomBytes(24).toString("base64url"),id=crypto.randomBytes(12).toString("hex");
  db.prepare("UPDATE codes SET used=1 WHERE target=? AND used=0").run(t);
  db.prepare("INSERT INTO codes(id,channel,target,code_hash,link_hash,role,name,exp) VALUES(?,?,?,?,?,?,?,?)").run(id,ch,t,sha(id+code),ch==="email"?sha(link):null,ROLES[b.role]?b.role:null,String(b.name||"").slice(0,80)||null,Date.now()+CODE_TTL);
  const url=origin(req)+"/auth/magic?t="+link;
  const msg=ch==="sms"?`${code} is your ${brand.name} code. It expires in 10 minutes. Don't share it.`:`Your ${brand.name} sign-in code is ${code}.\n\nOr sign in with one tap: ${url}\n\nBoth expire in 10 minutes. If you didn't ask for this, ignore this email.`;
  if(testMode(ch))return send(res,200,{ok:true,test:true,code,link:ch==="email"?"/auth/magic?t="+link:null,note:"Test mode: no "+(ch==="sms"?"SMS":"email")+" provider is configured, so the code is shown here."});
  try{ch==="sms"?await sendSMS(t,msg):await sendEmail(t,`${code} is your ${brand.name} code`,msg)}catch(e){console.error(e.message);return send(res,502,{error:"We couldn't send the code. Try again in a minute."})}
  return send(res,200,{ok:true,sent:true})}
 function verify(req,res,b){const ch=b.channel==="sms"?"sms":"email";const t=ch==="sms"?normPhone(b.to):String(b.to||"").trim().toLowerCase();
  if(limited("verify-ip:"+ip(req),30,15*60e3))return send(res,429,{error:"Too many attempts. Wait 15 minutes."});
  const r=t&&db.prepare("SELECT * FROM codes WHERE target=? AND used=0 ORDER BY exp DESC").get(t);
  if(!r||r.exp<Date.now())return send(res,400,{error:"That code expired. Send a new one."});
  if(r.tries>=MAX_TRIES){db.prepare("UPDATE codes SET used=1 WHERE id=?").run(r.id);return send(res,400,{error:"Too many wrong codes. Send a new one."})}
  const ok=crypto.timingSafeEqual(Buffer.from(sha(r.id+String(b.code||"").replace(/\D/g,""))),Buffer.from(r.code_hash));
  if(!ok){db.prepare("UPDATE codes SET tries=tries+1 WHERE id=?").run(r.id);return send(res,400,{error:`Wrong code. ${MAX_TRIES-r.tries-1} tries left.`})}
  const exists=acctBy(ch,t);const role=b.role||r.role;
  if(!exists&&!ROLES[role])return send(res,200,{ok:true,needRole:true}); // pick a role first; code stays valid
  db.prepare("UPDATE codes SET used=1 WHERE id=?").run(r.id);
  try{const a=ensureAccount({channel:ch,target:t,role,name:b.name||r.name,email:ch==="email"?t:null,phone:ch==="sms"?t:null});login(res,req,a.uid,true);return send(res,200,{ok:true,created:a.created,uid:a.uid})}catch(e){return send(res,400,{error:e.message})}}
 function magic(req,res,url){const t=url.searchParams.get("t")||"";const r=db.prepare("SELECT * FROM codes WHERE link_hash=? AND used=0").get(sha(t));
  if(!r||r.exp<Date.now())return html(res,400,"Link expired",`<p>This sign-in link expired or was already used. <a href="/#/signup">Get a new one</a>.</p>`);
  db.prepare("UPDATE codes SET used=1 WHERE id=?").run(r.id);
  const a=ensureAccount({channel:"email",target:r.target,role:r.role||"homeowner",name:r.name,email:r.target});login(res,req,a.uid,true);res.writeHead(302,{Location:a.created?"/#/account?welcome=1":"/#/dash"});res.end()}

 /* ----- passkeys (WebAuthn) ----- */
 const newCh=(uid,kind)=>{const c=crypto.randomBytes(32).toString("base64url");db.prepare("DELETE FROM challenges WHERE exp<?").run(Date.now());db.prepare("INSERT INTO challenges VALUES(?,?,?,?)").run(c,uid,kind,Date.now()+5*60e3);return c};
 const takeCh=(c,kind)=>{const r=db.prepare("SELECT * FROM challenges WHERE ch=? AND kind=?").get(String(c||""),kind);if(r)db.prepare("DELETE FROM challenges WHERE ch=?").run(r.ch);return r&&r.exp>Date.now()?r:null};
 function checkClient(req,cdj,kind){const c=JSON.parse(fromB64u(cdj).toString("utf8"));if(c.type!==kind)throw Error("Wrong ceremony");if(c.origin!==origin(req))throw Error("Origin mismatch");return c}
 function pkRegOptions(req,res,uid,user){const ex=db.prepare("SELECT cred_id FROM passkeys WHERE uid=?").all(uid);
  return send(res,200,{challenge:newCh(uid,"reg"),rp:{name:brand.name,id:rpId(req)},user:{id:b64u(uid),name:user.email||user.name||uid,displayName:user.name||brand.name+" user"},pubKeyCredParams:[{type:"public-key",alg:-7},{type:"public-key",alg:-257},{type:"public-key",alg:-8}],timeout:120000,attestation:"none",authenticatorSelection:{residentKey:"required",userVerification:"preferred"},excludeCredentials:ex.map(r=>({type:"public-key",id:r.cred_id}))})}
 function pkRegVerify(req,res,uid,b){try{const c=checkClient(req,b.clientDataJSON,"webauthn.create");const ch=takeCh(c.challenge,"reg");if(!ch||ch.uid!==uid)throw Error("Challenge expired, try again");
   const att=cbor(fromB64u(b.attestationObject)).v;const ad=parseAuthData(att.get("authData"));
   if(!ad.rpIdHash.equals(crypto.createHash("sha256").update(rpId(req)).digest()))throw Error("Wrong site");if(!ad.up)throw Error("User presence required");if(!ad.credId)throw Error("No credential");
   const {alg,jwk}=coseToJwk(ad.cose);const id=b64u(ad.credId);
   db.prepare("INSERT INTO passkeys VALUES(?,?,?,?,?,?,?,?)").run(id,uid,JSON.stringify(jwk),alg,ad.counter,String(b.label||"Passkey").slice(0,60),Date.now(),null);return send(res,200,{ok:true,id})}catch(e){return send(res,400,{error:"Passkey not saved: "+e.message})}}
 function pkLoginOptions(req,res){if(limited("pk:"+ip(req),30,15*60e3))return send(res,429,{error:"Too many attempts"});return send(res,200,{challenge:newCh(null,"auth"),rpId:rpId(req),timeout:120000,userVerification:"preferred",allowCredentials:[]})}
 function pkLoginVerify(req,res,b){try{const c=checkClient(req,b.clientDataJSON,"webauthn.get");if(!takeCh(c.challenge,"auth"))throw Error("Challenge expired, try again");
   const k=db.prepare("SELECT * FROM passkeys WHERE cred_id=?").get(String(b.id||""));if(!k)throw Error("This passkey isn't registered here");
   const ad=fromB64u(b.authenticatorData),p=parseAuthData(ad);
   if(!p.rpIdHash.equals(crypto.createHash("sha256").update(rpId(req)).digest()))throw Error("Wrong site");if(!p.up)throw Error("User presence required");
   const data=Buffer.concat([ad,crypto.createHash("sha256").update(fromB64u(b.clientDataJSON)).digest()]);
   if(!verifySig(k.alg,JSON.parse(k.jwk),data,fromB64u(b.signature)))throw Error("Signature check failed");
   if(p.counter&&k.counter&&p.counter<=k.counter)throw Error("Passkey counter replay detected");
   db.prepare("UPDATE passkeys SET counter=?,last_used=? WHERE cred_id=?").run(p.counter,Date.now(),k.cred_id);login(res,req,k.uid);return send(res,200,{ok:true})}catch(e){return send(res,400,{error:"Passkey sign-in failed: "+e.message})}}
 const pkList=uid=>db.prepare("SELECT cred_id,label,created,last_used FROM passkeys WHERE uid=? ORDER BY created").all(uid);
 const pkDelete=(uid,id)=>db.prepare("DELETE FROM passkeys WHERE uid=? AND cred_id=?").run(uid,String(id||"")).changes>0;

 /* ----- OAuth / OIDC ----- */
 function oauthStart(req,res,prov,url){const P=OAUTH[prov];if(!P)return html(res,404,"Unknown provider","");
  if(!P.live()&&isPublicHost())return html(res,404,"Sign-in unavailable",`<p>${P.label} sign-in isn't offered on this server. <a href="/#/signup">Use email or a password</a>.</p>`);
  if(limited("oauth:"+ip(req),30,15*60e3))return html(res,429,"Slow down","<p>Too many sign-in attempts. Try again in 15 minutes.</p>");
  const state=crypto.randomBytes(24).toString("base64url"),nonce=crypto.randomBytes(16).toString("base64url"),verifier=crypto.randomBytes(32).toString("base64url"),bind=crypto.randomBytes(16).toString("base64url");
  const role=ROLES[url.searchParams.get("role")]?url.searchParams.get("role"):null;
  db.prepare("DELETE FROM oauth_states WHERE exp<?").run(Date.now());db.prepare("INSERT INTO oauth_states VALUES(?,?,?,?,?,?,?)").run(state,prov,verifier,nonce,role,bind,Date.now()+10*60e3);
  const sec=origin(req).startsWith("https")?"; Secure":"";res.setHeader("Set-Cookie",`swoa=${bind}; HttpOnly; Path=/auth/; SameSite=Lax; Max-Age=600${sec}`);
  if(!P.live()){res.writeHead(302,{Location:`/auth/oauth/${prov}/demo?state=${state}`});return res.end()}
  const q=new URLSearchParams({client_id:P.id(),redirect_uri:origin(req)+`/auth/oauth/${prov}/callback`,response_type:"code",scope:P.scope,state,nonce});
  if(P.pkce){q.set("code_challenge",b64u(crypto.createHash("sha256").update(verifier).digest()));q.set("code_challenge_method","S256")}
  if(P.formPost)q.set("response_mode","form_post");if(prov==="google")q.set("prompt","select_account");
  res.writeHead(302,{Location:P.auth+"?"+q});res.end()}
 function oauthDemo(req,res,prov,url){const P=OAUTH[prov],st=url.searchParams.get("state")||"";const s=P&&db.prepare("SELECT * FROM oauth_states WHERE state=?").get(st);
  if(isPublicHost())return html(res,404,"Sign-in unavailable",`<p>Demo sign-in isn't offered on this server. <a href="/#/signup">Use email or a password</a>.</p>`);
  if(!P||P.live()||!s)return html(res,400,"Link expired",`<p>Start again from <a href="/#/signup">sign in</a>.</p>`);
  const e=v=>String(v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  return html(res,200,`Continue with ${P.label} (demo mode)`,`<div class="demo">DEMO MODE · not connected to ${P.label}</div><p>${brand.name} hasn't been given ${P.label} API keys yet, so this screen stands in for ${P.label}'s sign-in. Nothing is sent to ${P.label}. Real sign-in turns on automatically when the keys are set.</p>
<form method="post" action="/auth/oauth/${prov}/callback"><input type="hidden" name="state" value="${e(st)}"><label>Name<input name="demo_name" id="oaName" required maxlength="80" autocomplete="name"></label><label>Email<input name="demo_email" id="oaEmail" type="email" required autocomplete="email"></label><button id="oaGo">Continue as this ${P.label} user</button></form><p><a href="/#/signup">Cancel</a></p>`)}
 async function oauthCallback(req,res,prov,url,form){const P=OAUTH[prov];const q=form||Object.fromEntries(url.searchParams);
  if(P&&!P.live()&&isPublicHost())return html(res,404,"Sign-in unavailable",`<p>Demo sign-in isn't offered on this server. <a href="/#/signup">Use email or a password</a>.</p>`);
  const s=P&&db.prepare("SELECT * FROM oauth_states WHERE state=? AND provider=?").get(String(q.state||""),prov);
  if(s)db.prepare("DELETE FROM oauth_states WHERE state=?").run(s.state);
  if(!s||s.exp<Date.now())return html(res,400,"Sign-in expired",`<p>That sign-in attempt expired or was already used. <a href="/#/signup">Try again</a>.</p>`);
  const ck=(req.headers.cookie||"").match(/(?:^|;\s*)swoa=([^;]+)/);
  if(!P.formPost&&(!ck||ck[1]!==s.bind))return html(res,400,"Sign-in blocked",`<p>The sign-in didn't start in this browser (state check failed). <a href="/#/signup">Try again</a>.</p>`);
  if(q.error)return html(res,400,"Sign-in cancelled",`<p>${P.label} sign-in was cancelled. <a href="/#/signup">Back</a>.</p>`);
  let prof;
  try{if(!P.live()){const em=String(q.demo_email||"").trim().toLowerCase();if(!EMAIL.test(em))throw Error("Enter a valid email");
   // Demo sign-in must not adopt a real (non-demo) account, including staff. A colliding email gets its own isolated demo identity.
   let email=em,isolated=false;if(emailIsReal&&emailIsReal(em)){isolated=true;email="oauth-demo-"+sha(prov+":"+em).slice(0,40)+"@demo.invalid";if(emailIsReal(email))email="oauth-demo-"+crypto.randomBytes(16).toString("hex")+"@demo.invalid"}
   prof={sub:"demo:"+em,email,name:String(q.demo_name||"").slice(0,80),verified:true,demo:true,isolated}}
   else{const body=new URLSearchParams({grant_type:"authorization_code",code:String(q.code||""),redirect_uri:origin(req)+`/auth/oauth/${prov}/callback`,client_id:P.id(),client_secret:P.secret()});if(P.pkce)body.set("code_verifier",s.verifier);
    const tr=await fetch(P.token,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",Accept:"application/json"},body});const tk=await tr.json();if(!tr.ok)throw Error("token exchange failed");
    if(P.userinfo){const u=await(await fetch(P.userinfo+"&access_token="+encodeURIComponent(tk.access_token)+"&appsecret_proof="+crypto.createHmac("sha256",P.secret()).update(tk.access_token).digest("hex"))).json();prof={sub:u.id,email:(u.email||"").toLowerCase(),name:u.name||"",verified:!!u.email}}
    else{const c=JSON.parse(fromB64u(String(tk.id_token||"").split(".")[1]).toString()); // id_token came straight from the token endpoint over TLS (OIDC Core 3.1.3.7)
     if(!P.iss(c.iss)||(Array.isArray(c.aud)?!c.aud.includes(P.id()):c.aud!==P.id())||c.exp*1e3<Date.now()||c.nonce!==s.nonce)throw Error("id_token check failed");
     let nm=c.name||"";if(prov==="apple"&&q.user){try{const u=JSON.parse(q.user);nm=[u.name&&u.name.firstName,u.name&&u.name.lastName].filter(Boolean).join(" ")}catch(e){}}
     prof={sub:c.sub,email:String(c.email||c.preferred_username||"").toLowerCase(),name:nm,verified:c.email_verified===true||c.email_verified==="true"||prov==="microsoft"}}}
  }catch(e){console.error("oauth",prov,e.message);return html(res,400,"Sign-in failed",`<p>${P.label} sign-in didn't complete (${String(e.message).replace(/[<>&]/g,"")}). <a href="/#/signup">Try again</a>.</p>`)}
  const sub=prov+(prof.demo?"-demo":"");let idr=db.prepare("SELECT uid FROM identities WHERE provider=? AND sub=?").get(sub,prof.sub),uid,created=false;
  if(idr&&prof.demo&&!(demoMayAdopt&&demoMayAdopt(idr.uid))){db.prepare("DELETE FROM identities WHERE provider=? AND sub=?").run(sub,prof.sub);idr=null}
  const me=sessionUid(req);
  if(idr)uid=idr.uid;else{
   if(me)uid=me;else{if(!prof.email||!EMAIL.test(prof.email))return html(res,400,"Email needed",`<p>${P.label} didn't share an email address, so we can't create the account. <a href="/#/signup">Use another method</a>.</p>`);
    const ex=db.prepare("SELECT uid FROM accounts WHERE email=?").get(prof.email);
    if(ex&&prof.demo&&!(demoMayAdopt&&demoMayAdopt(ex.uid)))return html(res,400,"Sign-in failed",`<p>Demo sign-in can't use that email. <a href="/#/signup">Try again</a>.</p>`);
    if(ex&&!prof.verified)return html(res,400,"Sign in another way",`<p>An account with this email exists. Sign in with your email code first, then link ${P.label} from Account settings.</p>`);
    const a=ensureAccount({role:s.role||"homeowner",name:prof.name,email:prof.email});uid=a.uid;created=a.created;if(prof.isolated&&markDemo)markDemo(uid)}
   db.prepare("INSERT OR IGNORE INTO identities VALUES(?,?,?,?)").run(sub,prof.sub,uid,Date.now())}
  login(res,req,uid);res.writeHead(302,{Location:created?"/#/account?welcome=1":me?"/#/account":"/#/dash"});res.end()}
 const linked=uid=>db.prepare("SELECT provider,created FROM identities WHERE uid=?").all(uid);
 return{methods,start,verify,magic,pkRegOptions,pkRegVerify,pkLoginOptions,pkLoginVerify,pkList,pkDelete,oauthStart,oauthDemo,oauthCallback,linked,OAUTH,normPhone};
};
module.exports.isPublicHost=isPublicHost;
module.exports._test={cbor,parseAuthData,coseToJwk,verifySig,isPublicHost};
