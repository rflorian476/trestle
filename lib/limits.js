"use strict";
// v18 (QA SW-036 follow-through): per-field length limits for everything sent to /api/act.
// The UI caps the same fields (src/v18.js reads LIMITS from the page), but the server is the one that enforces them,
// so an API caller can't store a 4,000-character name, message or review that blows out a card or a notification.
// Over-long input is refused with a plain message naming the field; nothing is silently cut.
const KEYS={
 name:[80,"name"],biz:[80,"business name"],company:[80,"company name"],first:[40,"first name"],last:[40,"last name"],
 title:[120,"title"],headline:[120,"headline"],tagline:[120,"tagline"],trade:[60,"trade"],
 phone:[30,"phone number"],zip:[10,"ZIP code"],email:[254,"email"],city:[80,"city"],loc:[80,"location"],
 license:[120,"license"],insurance:[160,"insurance"],rate:[40,"rate"],budget:[60,"budget"],cap:[120,"caption"],
 bio:[1500,"bio"],about:[1500,"about section"],desc:[2000,"description"],description:[2000,"description"],
 note:[1000,"note"],notes:[2000,"notes"],reason:[1000,"reason"],text:[2000,"message"],body:[2000,"message"],msg:[2000,"message"]};
// Positional text arguments, by action (index -> [max, label]).
const POS={send:{1:[2000,"message"]},crewSend:{2:[2000,"message"]},review:{2:[2000,"review"]},reviewCrew:{4:[2000,"review"]},
 reply:{1:[1000,"reply"]},quote:{2:[1000,"quote note"]},applyRole:{2:[1000,"note"]},caseReply:{1:[2000,"message"]},
 disputeReview:{1:[1000,"reason"]},modDecide12:{3:[1000,"note"]},rreqSend12:{1:[2000,"message"]},modVerify19:{2:[400,"reason"]}};
// Per-action overrides for keyed fields (same copy as the action's own check, so the message doesn't change).
const ACT={postJob:{title:[90,"title"],desc:[2000,"description"]}};
const TOP=2000; // any other top-level string argument (ids are short; free text is capped like a message)
const fmt=n=>n.toLocaleString("en-US");
const tooLong=(label,max)=>({field:label,max,msg:`Keep the ${label} under ${fmt(max)} characters.`});
function walk(v,depth,keys){keys=keys||KEYS;
 if(depth>3||!v||typeof v!=="object")return null;
 if(Array.isArray(v)){for(const x of v){const r=walk(x,depth+1,keys);if(r)return r}return null}
 for(const k of Object.keys(v)){const x=v[k];
  if(typeof x==="string"&&Object.prototype.hasOwnProperty.call(keys,k)){const [max,label]=keys[k];if(x.trim().length>max)return tooLong(label,max)}
  else if(x&&typeof x==="object"){const r=walk(x,depth+1,keys);if(r)return r}}
 return null}
// Returns null when every field fits, else {field,max,msg}.
function check(action,args){
 if(!Array.isArray(args))return null;const pos=POS[action]||{};
 for(let i=0;i<args.length;i++){const a=args[i];
  if(typeof a==="string"){const [max,label]=pos[i]||[TOP,"text"];if(a.trim().length>max)return tooLong(label,max)}
  else{const r=walk(a,0,ACT[action]?Object.assign({},KEYS,ACT[action]):KEYS);if(r)return r}}
 return null}
module.exports={check,KEYS,POS,ACT,TOP};
