// v21 perf: remove CSS declarations that a later rule with the *same selector in the same at-rule context* overrides.
// Same selector text => same specificity, and the later rule wins whatever sits in between, so the earlier
// declaration can never apply. Rules left empty are dropped. Top-level :root blocks (the historic theme layers)
// lose every token a later :root redefines, so only the final Linen & Navy values remain. Conservative on purpose:
//  - only exact property-name matches (a later `background` does not remove an earlier `background-color`, or vice versa)
//  - an !important declaration is only removed by a later !important one
//  - fallback values (newer units/functions, vendor prefixes) are never treated as overriding
//  - @keyframes, @font-face and other non-style at-rules are left untouched
function split(css){const out=[];let i=0,n=css.length;while(i<n){while(i<n&&/\s/.test(css[i]))i++;if(i>=n)break;
 if(css.startsWith("/*",i)){const e=css.indexOf("*/",i+2);i=e<0?n:e+2;continue}
 let j=i,q=null;while(j<n&&(q||(css[j]!=="{"&&css[j]!==";"))){if(q){if(css[j]==="\\")j++;else if(css[j]===q)q=null}else if(css[j]==='"'||css[j]==="'")q=css[j];j++}
 const pre=css.slice(i,j).trim();if(j>=n)break;if(css[j]===";"){out.push({pre,stmt:true});i=j+1;continue}
 let k=j+1,d=1;q=null;while(k<n&&d){const c=css[k];if(q){if(c==="\\")k++;else if(c===q)q=null}else if(c==='"'||c==="'")q=c;else if(c==="{")d++;else if(c==="}")d--;k++}
 out.push({pre,body:css.slice(j+1,k-1)});i=k}return out}
function decls(body){const out=[];let i=0,n=body.length,s=0,q=null,p=0;for(;i<=n;i++){const c=body[i];if(i<n&&q){if(c==="\\")i++;else if(c===q)q=null;continue}
 if(i<n&&(c==='"'||c==="'")){q=c;continue}if(c==="(")p++;else if(c===")")p--;else if(i===n||(c===";"&&p===0)){const t=body.slice(s,i).trim();if(t){const k=t.indexOf(":");if(k>0){const pn=t.slice(0,k).trim();out.push({prop:pn.startsWith("--")?pn:pn.toLowerCase(),val:t.slice(k+1).trim(),raw:t})}else out.push({prop:null,raw:t})}s=i+1}}return out}
const RISKY=/dvh|svh|lvh|dvw|svw|lvw|color-mix|-webkit-|-moz-|-ms-|\bcqi\b|\bcqw\b|\blch\(|\boklch\(|\boklab\(|:has\(/i;
// A declaration the browser would drop as invalid (e.g. the old "rgba((27,58,91),.6)" typos) must not count as overriding.
function plausible(v){if(/\(\s*\(/.test(v))return false;let d=0;for(const c of v){if(c==="(")d++;else if(c===")"&&--d<0)return false}return d===0&&v.replace(/!\s*important\s*$/i,"").trim()!==""}
let OVERRIDERS=null;
const imp=v=>/!\s*important\s*$/i.test(v);
const norm=s=>s.replace(/\s+/g," ").replace(/\s*([>+~,])\s*/g,"$1").trim();
function pass(list,stats,top){
 // recurse into grouping at-rules first; each at-rule body is its own context
 for(const r of list){if(r.stmt)continue;if(/^@(media|supports|layer|container)\b/.test(r.pre)){r.kids=split(r.body);pass(r.kids,stats,false)}}
 const style=r=>!r.stmt&&!r.pre.startsWith("@");
 // later-wins map: selector -> {prop -> [hasNormal, hasImportant]} built from the end
 const seen=new Map();
 for(let i=list.length-1;i>=0;i--){const r=list[i];if(!style(r))continue;const key=norm(r.pre);let m=seen.get(key);if(!m){m=new Map();seen.set(key,m)}
  const ds=decls(r.body);const keep=[];
  // within a rule, a later duplicate of the same property is a fallback pair; keep all of them
  const local=new Set();
  for(let k=ds.length-1;k>=0;k--){const d=ds[k];if(!d.prop||d.prop.startsWith("--")&&!(top&&key===":root")){keep.unshift(d);continue}
   const st=m.get(d.prop),I=imp(d.val);
   const dead=st&&!local.has(d.prop)&&(I?st.imp:(st.norm||st.imp));
   if(dead){stats.decls++;continue}keep.unshift(d);local.add(d.prop)}
  for(const d of keep){if(!d.prop||/^-[a-z]/.test(d.prop))continue;if(RISKY.test(d.val)||!plausible(d.val))continue;if(OVERRIDERS)OVERRIDERS.push([d.prop,d.val]);const st=m.get(d.prop)||{norm:false,imp:false};if(imp(d.val))st.imp=true;else st.norm=true;m.set(d.prop,st)}
  r.body=keep.map(d=>d.raw).join(";");if(!r.body.trim()){r.dead=true;stats.rules++}}
}
function emit(list){let o="";for(const r of list){if(r.dead)continue;if(r.stmt){o+=r.pre+";";continue}if(r.kids){const b=emit(r.kids);if(b.trim())o+=r.pre+"{"+b+"}";continue}o+=r.pre+"{"+r.body+"}"}return o}
function dedupe(css){const stats={decls:0,rules:0,root:0,tokens:0};const list=split(css);
 // historic theme layers: the root element gets tokens from top-level `html`, `:root` and `:root:root` blocks.
 // For each custom property, only the winning declaration (importance, then specificity, then order) is kept.
 // A token that also appears in a root selector list or inside @media/@supports is left alone.
 const ROOTSPEC={"html":1,":root":10,":root:root":20};const frozen=new Set();
 (function walk(l,top){for(const r of l){if(r.stmt)continue;if(r.pre.startsWith("@")){if(/^@(media|supports|layer|container)\b/.test(r.pre))walk(split(r.body),false);continue}
  const sels=r.pre.split(",").map(norm);const rootish=sels.filter(x=>/^(html|:root)/.test(x));if(!rootish.length)continue;
  if(!top||sels.length>1||!(sels[0] in ROOTSPEC))for(const d of decls(r.body))if(d.prop&&d.prop.startsWith("--"))frozen.add(d.prop)}})(list,true);
 const win=new Map();list.forEach((r,idx)=>{if(r.stmt||!(norm(r.pre) in ROOTSPEC))return;const sp=ROOTSPEC[norm(r.pre)];
  for(const d of decls(r.body)){if(!d.prop||!d.prop.startsWith("--")||frozen.has(d.prop))continue;const rank=[imp(d.val)?1:0,sp,idx],w=win.get(d.prop);
   if(!w||rank[0]>w[0]||rank[0]===w[0]&&(rank[1]>w[1]||rank[1]===w[1]&&rank[2]>=w[2]))win.set(d.prop,rank)}});
 list.forEach((r,idx)=>{if(r.stmt||!(norm(r.pre) in ROOTSPEC))return;const ds=decls(r.body);const keep=ds.filter(d=>{if(!d.prop||!d.prop.startsWith("--")||frozen.has(d.prop))return true;const w=win.get(d.prop);const k=w&&w[2]===idx;if(!k)stats.tokens++;return k});
  r.body=keep.map(d=>d.raw).join(";");if(!r.body.trim()){r.dead=true;stats.root++}});
 pass(list,stats,true);return{css:emit(list),stats}}
module.exports={dedupe,_collect:on=>{OVERRIDERS=on?[]:null},_overriders:()=>OVERRIDERS};
