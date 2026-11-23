/* v44 perf: drop server-only code from the browser bundle.
   In the live app every action named in client-post.js LIVE (plus V2_ACTIONS) is replaced on the client with a call to
   POST /api/act, so the browser never runs the original A.<action> bodies: the server runs them from app-logic.js.
   The demo seed builders (seed, seedV2, seedV7, ...) only fill the server's database; the client always gets its data
   from /api/state. This removes both from the client copy only (app-logic.js keeps everything).
   Only load-time definitions are touched (statements outside any function), so a handler that wraps A.quote at
   runtime keeps working. Stubs return {ok:false} so a stray load-time call can't crash a page. */
"use strict";
const acorn=require("./acorn.js");
/* v48: helpers only the server calls (from stripped action bodies, boot repairs and sweeps, or vm.runInContext in
   server.js). The browser gets the guest bill as window.__INV48, so it never builds the view, looks up a token or mints
   one, and the reminder/expiry sweeps and data repairs run on the server only. Nothing left in the browser copy calls
   any of these (checked against every public/js file, including the on-demand lz12 chunk: each name appears once, at
   its declaration; b12Conflicts is NOT here because lz12 calls it). Bodies become {return null}. */
/* v49: the payment/late-fee/bills-to-pay reminder sweep (v9Sweep, lf45Sweep, ap46Sweep) runs only on the server (the
   hourly sweep and the stripped setAutoRemind/sweep9 bodies); in the browser copy they are declared and wrapped but never called. */
const SERVER_FNS=new Set(["v48View","v48Find","v48Set","v19Remind","v19Expire","v7RepairNos","v36CallOrphans","v34Orphans","v9Sweep","lf45Sweep","ap46Sweep"]);
module.exports=function stripServer(code,liveNames){
 const ast=acorn.parse(code,{ecmaVersion:"latest",sourceType:"script",allowHashBang:true});
 // 1) the action names: client-post's LIVE list + everything pushed onto V2_ACTIONS
 const arrays=new Map();const names=new Set(liveNames||[]);
 const strs=n=>n&&n.type==="ArrayExpression"&&n.elements.every(e=>e&&e.type==="Literal"&&typeof e.value==="string")?n.elements.map(e=>e.value):null;
 const walk=(n,f,depth)=>{if(!n||typeof n.type!=="string")return;if(f(n,depth)===false)return;const fn=/Function/.test(n.type);
  for(const k in n){if(k==="type"||k==="start"||k==="end")continue;const v=n[k];if(Array.isArray(v)){for(const x of v)walk(x,f,depth+(fn?1:0))}else if(v&&typeof v.type==="string")walk(v,f,depth+(fn?1:0))}};
 walk(ast,n=>{if(n.type==="VariableDeclarator"&&n.id.type==="Identifier"){const a=strs(n.init);if(a)arrays.set(n.id.name,a)}},0);
 let pushes=0;
 walk(ast,n=>{if(n.type==="CallExpression"&&n.callee.type==="MemberExpression"&&n.callee.object.type==="Identifier"&&n.callee.object.name==="V2_ACTIONS"&&n.callee.property.name==="push"){pushes++;
  for(const a of n.arguments){if(a.type==="Literal"&&typeof a.value==="string")names.add(a.value);else if(a.type==="SpreadElement"){const v=a.argument.type==="Identifier"?arrays.get(a.argument.name):strs(a.argument);if(v)v.forEach(x=>names.add(x));else throw new Error("strip-server: can't resolve a V2_ACTIONS.push argument at "+a.start)}else throw new Error("strip-server: unexpected V2_ACTIONS.push argument at "+a.start)}}
  if(n.type==="VariableDeclarator"&&n.id.name==="V2_ACTIONS"){const v=strs(n.init);if(v)v.forEach(x=>names.add(x))}},0);
 // 2) load-time definitions to replace
 const edits=[];let acts=0,seeds=0,saved=0;
 const stubFor=(fnNode,method)=>method?"(){return{ok:false}}":fnNode.type==="ArrowFunctionExpression"?"()=>({ok:false})":"function(){return{ok:false}}";
 const isFn=n=>n&&(n.type==="FunctionExpression"||n.type==="ArrowFunctionExpression");
 const props=obj=>{for(const p of obj.properties){if(p.type!=="Property"||p.computed)continue;const k=p.key.type==="Identifier"?p.key.name:p.key.value;if(names.has(k)&&isFn(p.value)){edits.push([p.value.start,p.value.end,stubFor(p.value,p.method)]);acts++}}};
 walk(ast,(n,depth)=>{if(depth>0)return false;
  if(n.type==="AssignmentExpression"&&n.operator==="="&&n.left.type==="MemberExpression"&&!n.left.computed&&n.left.object.type==="Identifier"&&n.left.object.name==="A"&&names.has(n.left.property.name)&&isFn(n.right)){edits.push([n.right.start,n.right.end,stubFor(n.right)]);acts++;return false}
  if(n.type==="CallExpression"&&n.callee.type==="MemberExpression"&&n.callee.object.name==="Object"&&n.callee.property.name==="assign"&&n.arguments[0]&&n.arguments[0].type==="Identifier"&&n.arguments[0].name==="A"){for(const o of n.arguments.slice(1))if(o.type==="ObjectExpression")props(o);return false}
  if(n.type==="VariableDeclarator"&&n.id.type==="Identifier"&&n.id.name==="A"&&n.init&&n.init.type==="ObjectExpression"){props(n.init);return false}
  if(n.type==="FunctionDeclaration"&&/^seed([A-Z0-9]\w*)?$/.test(n.id.name)){edits.push([n.body.start,n.body.end,"{}"]);seeds++;return false}
  if(n.type==="FunctionDeclaration"&&SERVER_FNS.has(n.id.name)){edits.push([n.body.start,n.body.end,"{return null}"]);acts++;return false}},0);
 if(!pushes||names.size<50)throw new Error("strip-server: action list looks wrong ("+names.size+" names, "+pushes+" pushes)");
 edits.sort((a,b)=>b[0]-a[0]);let out=code;let last=Infinity;
 for(const [s,e,t] of edits){if(e>last)continue;/* nested inside an edit already applied */saved+=(e-s)-t.length;out=out.slice(0,s)+t+out.slice(e);last=s}
 return{code:out,stats:{names:names.size,actions:acts,seeds,saved}}};
