// Sawyer mailer: send email through Resend's HTTPS API. No npm dependencies.
// Codes, magic links and the API key are never written to logs.
"use strict";

const DEFAULT_FROM="Sawyer <onboarding@resend.dev>";
const DEFAULT_URL="https://api.resend.com/emails";
const TIMEOUT_MS=8000;
const EMAIL=/^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,}$/i;
const DEMO_DOMAIN=/@(phone\.invalid|demo\.invalid|sawyer\.test)$/i;

function env(name){return String(process.env[name]==null?"":process.env[name]).trim()}
// RESEND_API_URL is a local-test hook. It is ignored on a public host (NODE_ENV=production or RENDER).
function isProdEnv(){const n=env("NODE_ENV");return n==="production"||n==="prod"}
function apiUrl(){const u=env("RESEND_API_URL");if(u&&!isProdEnv())return u.replace(/\/$/,"");return DEFAULT_URL}
function fromAddress(){return env("MAIL_FROM")||env("EMAIL_FROM")||DEFAULT_FROM}
function configured(){return !!env("RESEND_API_KEY")}
function mailable(address){const em=String(address||"").trim().toLowerCase();return EMAIL.test(em)&&!DEMO_DOMAIN.test(em)}

class MailError extends Error{
 constructor(kind,message,publicMessage,status){
  super(message);this.name="MailError";this.kind=kind;this.publicMessage=publicMessage;this.status=status}
}

function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}

// Inline house mark (same paths as the app). Email clients that strip SVG still see the "Sawyer" wordmark.
const LOGO_SVG=`<svg width="28" height="28" viewBox="0 0 48 48" role="img" aria-label="Sawyer" xmlns="http://www.w3.org/2000/svg"><rect x="31.5" y="6.5" width="5" height="9" rx="1.2" fill="#B5532F"/><path d="M24 5.2L42.5 19.4V39A4 4 0 0 1 38.5 43H9.5A4 4 0 0 1 5.5 39V19.4Z" fill="#0E1B2B" stroke="#0E1B2B" stroke-width="1.6" stroke-linejoin="round"/><path d="M29.6 22.2A5.1 4.6 0 1 0 24 26.4A5.1 4.6 0 1 1 18.4 30.6" fill="none" stroke="#F7F6F3" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function wrap({preheader,heading,innerText,innerHtml,footerText}){
 const text=[heading,innerText,footerText].filter(Boolean).join("\n\n").replace(/\n{3,}/g,"\n\n");
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(heading||"Sawyer")}</title></head>
<body style="margin:0;padding:0;background:#F7F6F3;color:#0E1B2B;">
${preheader?`<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#F7F6F3;">${esc(preheader)}</div>`:""}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F7F6F3;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="width:560px;max-width:100%;background:#ffffff;border:1px solid #E4E0D6;border-radius:16px;">
<tr><td style="padding:24px 28px 8px;font-family:'Plus Jakarta Sans','Segoe UI',Arial,sans-serif;">
<table role="presentation" cellspacing="0" cellpadding="0"><tr>
<td style="vertical-align:middle;padding-right:10px;">${LOGO_SVG}</td>
<td style="vertical-align:middle;font-weight:700;font-size:18px;letter-spacing:-0.01em;color:#0E1B2B;">Sawyer</td>
</tr></table>
</td></tr>
<tr><td style="padding:8px 28px 28px;font-family:'Plus Jakarta Sans','Segoe UI',Arial,sans-serif;font-size:16px;line-height:1.55;color:#0E1B2B;">
<h1 style="margin:12px 0 16px;font-size:22px;line-height:1.25;color:#0E1B2B;">${esc(heading||"Sawyer")}</h1>
${innerHtml}
<p style="margin:28px 0 0;font-size:13px;color:#5B6570;">${esc(footerText||"Sawyer · hire pros you'd trust with your house")}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
 return{text,html}
}

function authEmail({brand,code,magicUrl}){
 const name=brand||"Sawyer";
 const subject=`Your ${name} sign-in code`;
 const innerText=`Your ${name} sign-in code is ${code}.\n\nOr sign in with one tap:\n${magicUrl}\n\nBoth expire in 10 minutes. If you didn't ask for this, you can ignore this email.`;
 const innerHtml=`<p style="margin:0 0 16px;">Use this code to sign in or reset your password. It expires in 10 minutes.</p>
<p style="margin:0 0 20px;font-size:32px;line-height:1.2;letter-spacing:0.16em;font-weight:700;color:#0E1B2B;">${esc(code)}</p>
<p style="margin:0 0 20px;"><a href="${esc(magicUrl)}" style="display:inline-block;background:#0E1B2B;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">Sign in with one tap</a></p>
<p style="margin:0 0 8px;font-size:14px;color:#5B6570;">Or paste this link into your browser:</p>
<p style="margin:0 0 16px;font-size:14px;word-break:break-all;"><a href="${esc(magicUrl)}" style="color:#1D4E89;">${esc(magicUrl)}</a></p>
<p style="margin:0;font-size:14px;color:#5B6570;">Both expire in 10 minutes. If you didn't ask for this, you can ignore this email.</p>`;
 const packed=wrap({preheader:`Your ${name} sign-in code expires in 10 minutes.`,heading:`Your ${name} sign-in code`,innerText,innerHtml,footerText:`${name} · hire pros you'd trust with your house`});
 packed.subject=subject;return packed
}

function noticeEmail({brand,heading,body,ctaUrl,ctaLabel}){
 const name=brand||"Sawyer";
 const subject=heading||`A reminder from ${name}`;
 const label=ctaLabel||"Open Sawyer";
 const innerText=body+(ctaUrl?`\n\n${label}: ${ctaUrl}`:"");
 const btn=ctaUrl?`<p style="margin:20px 0 0;"><a href="${esc(ctaUrl)}" style="display:inline-block;background:#0E1B2B;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;">${esc(label)}</a></p>`:"";
 const innerHtml=`<p style="margin:0;">${esc(body)}</p>${btn}`;
 const packed=wrap({preheader:body,heading:subject,innerText,innerHtml,footerText:`${name} · hire pros you'd trust with your house`});
 packed.subject=subject;return packed
}

async function send({to,subject,text,html}){
 if(!configured())throw new MailError("failed","email provider is not configured","Sign-in codes aren't available on this server until an email or text provider is configured.",503);
 const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),TIMEOUT_MS);
 try{
  const r=await fetch(apiUrl(),{method:"POST",headers:{Authorization:"Bearer "+env("RESEND_API_KEY"),"Content-Type":"application/json"},body:JSON.stringify({from:fromAddress(),to:[to],subject,text,html}),signal:ac.signal});
  if(r.status===403){
   console.error("mailer: Resend returned 403 (email delivery isn't fully enabled yet)");
   throw new MailError("unverified","resend 403","Email delivery isn't fully enabled yet.",503);
  }
  if(!r.ok){
   console.error("mailer: Resend returned "+r.status);
   throw new MailError("failed","resend "+r.status,"We couldn't send the email. Try again in a minute.",502);
  }
  return{ok:true,status:r.status};
 }catch(e){
  if(e instanceof MailError)throw e;
  if(e&&(e.name==="AbortError"||e.code==="ABORT_ERR")){
   console.error("mailer: Resend request timed out");
   throw new MailError("timeout","timeout","We couldn't send the email. Try again in a minute.",502);
  }
  console.error("mailer: send failed");
  throw new MailError("failed","send failed","We couldn't send the email. Try again in a minute.",502);
 }finally{clearTimeout(timer)}
}

module.exports={configured,mailable,send,authEmail,noticeEmail,MailError,TIMEOUT_MS};
module.exports._test={apiUrl,fromAddress,configured,isProdEnv,mailable,DEFAULT_URL,DEFAULT_FROM,TIMEOUT_MS};
