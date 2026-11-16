/* ===== v40 ===== */
/* (1) Honest fallbacks (follows SW-095). Where a sign-in route is unavailable, Sawyer names only what this server can complete
   right now, from the same facts as GET /api/auth/methods (window.__AUTHM): a code only once email or text delivery is ready,
   a password and a passkey, and a linked account only if a provider is live. The server's OAuth / demo 404 pages do the same
   (lib/auth.js altWays). In local test mode, or once codes are delivered, the copy stays "Use email or a password". */
function v40Ways(noPk,M){try{M=M||(typeof authMethods==="function"?authMethods():null)}catch(e){M=null}M=M||{};const r=M.ready||{},w=[];
 if(r.email&&r.sms)w.push("a sign-in code by email or text");else if(r.email)w.push("an email sign-in code");else if(r.sms)w.push("a text sign-in code");
 w.push("your password");if(!noPk)w.push("a passkey");if(M.oauth&&Object.keys(M.oauth).some(k=>M.oauth[k]==="live"))w.push("a linked account");
 return w.length>1?w.slice(0,-1).join(", ")+" or "+w[w.length-1]:w[0]}
function v40PkCopy(t){t=String(t||"");try{if(typeof v39CodesReady!=="function"||v39CodesReady())return t;const ways=v40Ways(true);
  return t.replace(/keep using email or a password/g,()=>"keep using "+ways).replace(/Use email or a password/g,()=>"Use "+ways).replace(/use email or a password/g,()=>"use "+ways)}catch(e){return t}}
if(typeof pkFriendly==="function"){const of=pkFriendly;pkFriendly=function(){return v40PkCopy(of.apply(this,arguments))}}
