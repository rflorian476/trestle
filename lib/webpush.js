// v32: standard Web Push (RFC 8030 delivery, RFC 8291 aes128gcm payload encryption, RFC 8292 VAPID) on node:crypto only.
// No third-party push service or library: the browser's own push service (FCM for Chrome/Edge, Mozilla autopush,
// Apple Web Push, WNS) delivers the message to the service worker, even when no Sawyer tab is open.
// The VAPID private key never leaves the server: it comes from VAPID_PRIVATE_KEY (+ VAPID_PUBLIC_KEY) if set, otherwise
// it is generated once and kept in the server database (table vapid). It is never logged, returned or sent to a client.
"use strict";
const crypto=require("crypto");
const b64u=b=>Buffer.from(b).toString("base64url");
const unb64u=s=>Buffer.from(String(s||"").replace(/=+$/,""),"base64url");
// Push services a browser may hand out. The server only ever POSTs to these (no SSRF via a crafted endpoint).
const PUSH_HOSTS=[/^fcm\.googleapis\.com$/,/^android\.googleapis\.com$/,/^updates\.push\.services\.mozilla\.com$/,/^[a-z0-9-]+\.push\.services\.mozilla\.com$/,/^web\.push\.apple\.com$/,/^[a-z0-9-]+\.push\.apple\.com$/,/^[a-z0-9-]+\.notify\.windows\.com$/];
// Chromium builds without Google API keys hand out legacy https://<shard>.google.com/fcm/send/... endpoints.
const FCM_LEGACY=/^[a-z0-9-]+\.google\.com$/;
function testOrigin(){const env=String(process.env.NODE_ENV||"").toLowerCase();if(env==="production"||env==="prod"||process.env.RENDER)return "";
 const o=String(process.env.PUSH_TEST_ORIGIN||"").trim();return /^http:\/\/127\.0\.0\.1:\d{2,5}$/.test(o)?o:""}
function endpointOk(ep){let u;try{u=new URL(String(ep||""))}catch(e){return false}if(String(ep).length>1000||u.username||u.password)return false;
 const t=testOrigin();if(t&&u.origin===t)return true;
 return u.protocol==="https:"&&(!u.port||u.port==="443")&&(PUSH_HOSTS.some(r=>r.test(u.hostname))||FCM_LEGACY.test(u.hostname)&&u.pathname.startsWith("/fcm/send/"))}
function keysOk(k){if(!k||typeof k!=="object")return false;const p=unb64u(k.p256dh),a=unb64u(k.auth);return p.length===65&&p[0]===4&&a.length===16}
function rawPub(jwk){return Buffer.concat([Buffer.from([4]),unb64u(jwk.x),unb64u(jwk.y)])}
function makeVapid(db){
 db.exec("CREATE TABLE IF NOT EXISTS vapid(id INTEGER PRIMARY KEY CHECK(id=1),jwk TEXT NOT NULL,created INTEGER NOT NULL)");
 let jwk=null;const envPriv=String(process.env.VAPID_PRIVATE_KEY||"").trim(),envPub=String(process.env.VAPID_PUBLIC_KEY||"").trim();
 if(envPriv&&envPub){const pub=unb64u(envPub);if(pub.length===65&&unb64u(envPriv).length===32)jwk={kty:"EC",crv:"P-256",d:envPriv.replace(/=+$/,""),x:b64u(pub.subarray(1,33)),y:b64u(pub.subarray(33,65))};else console.error("push: VAPID env keys are malformed; using the stored key")}
 if(!jwk){const r=db.prepare("SELECT jwk FROM vapid WHERE id=1").get();if(r){try{jwk=JSON.parse(r.jwk)}catch(e){jwk=null}}}
 if(!jwk){const {privateKey}=crypto.generateKeyPairSync("ec",{namedCurve:"prime256v1"});jwk=privateKey.export({format:"jwk"});
  db.prepare("INSERT OR REPLACE INTO vapid(id,jwk,created) VALUES(1,?,?)").run(JSON.stringify({kty:jwk.kty,crv:jwk.crv,d:jwk.d,x:jwk.x,y:jwk.y}),Date.now());console.log("push: generated a VAPID key pair (stored server-side)")}
 const key=crypto.createPrivateKey({key:{kty:"EC",crv:"P-256",d:jwk.d,x:jwk.x,y:jwk.y},format:"jwk"});
 return{publicKey:b64u(rawPub(jwk)),key}}
function vapidHeader(v,endpoint,subject){const aud=new URL(endpoint).origin;const now=Math.floor(Date.now()/1000);
 const h=b64u(JSON.stringify({typ:"JWT",alg:"ES256"})),c=b64u(JSON.stringify({aud,exp:now+12*3600,sub:subject}));
 const sig=crypto.sign("sha256",Buffer.from(h+"."+c),{key:v.key,dsaEncoding:"ieee-p1363"});
 return "vapid t="+h+"."+c+"."+b64u(sig)+", k="+v.publicKey}
const hmac=(k,d)=>crypto.createHmac("sha256",k).update(d).digest();
// RFC 8291: one aes128gcm record, last-record delimiter 0x02, record size 4096.
function encrypt(keys,plain){const ua=unb64u(keys.p256dh),auth=unb64u(keys.auth);
 const ecdh=crypto.createECDH("prime256v1");ecdh.generateKeys();const as=ecdh.getPublicKey();const shared=ecdh.computeSecret(ua);
 const prkKey=hmac(auth,shared);const ikm=hmac(prkKey,Buffer.concat([Buffer.from("WebPush: info\0"),ua,as,Buffer.from([1])]));
 const salt=crypto.randomBytes(16);const prk=hmac(salt,ikm);
 const cek=hmac(prk,Buffer.from("Content-Encoding: aes128gcm\0\x01","latin1")).subarray(0,16),nonce=hmac(prk,Buffer.from("Content-Encoding: nonce\0\x01","latin1")).subarray(0,12);
 const ci=crypto.createCipheriv("aes-128-gcm",cek,nonce);const body=Buffer.concat([ci.update(Buffer.concat([Buffer.from(plain),Buffer.from([2])])),ci.final(),ci.getAuthTag()]);
 const rs=Buffer.alloc(4);rs.writeUInt32BE(4096);return Buffer.concat([salt,rs,Buffer.from([as.length]),as,body])}
// Sends one message. Resolves {ok, status, gone}; gone=true means the subscription is dead (404/410) and should be removed.
async function send(v,sub,payload,opts){opts=opts||{};if(!endpointOk(sub.endpoint)||!keysOk(sub.keys))return{ok:false,status:0,gone:true};
 const json=Buffer.from(JSON.stringify(payload));if(json.length>3000)return{ok:false,status:0,gone:false};
 const body=encrypt(sub.keys,json);
 try{const ac=new AbortController();const t=setTimeout(()=>ac.abort(),opts.timeout||10000);
  const r=await fetch(sub.endpoint,{method:"POST",redirect:"error",signal:ac.signal,headers:{"Content-Type":"application/octet-stream","Content-Encoding":"aes128gcm","TTL":String(opts.ttl||86400),"Urgency":opts.urgency||"normal",...(opts.topic?{"Topic":opts.topic}:{}),"Authorization":vapidHeader(v,sub.endpoint,opts.subject||"mailto:support@sawyer.invalid")},body});
  clearTimeout(t);try{await r.arrayBuffer()}catch(e){}
  return{ok:r.status>=200&&r.status<300,status:r.status,gone:r.status===404||r.status===410}}
 catch(e){return{ok:false,status:0,gone:false}}}
module.exports={makeVapid,send,encrypt,endpointOk,keysOk,vapidHeader};
