/* v44 perf: the signed-in /dash stylesheet. dash.<hash>.css keeps, in their original order, only the rules whose
   selectors match something on a dashboard (src/dash-css.json, made by tools/dash-css.js from real dashboards), plus
   every @font-face / @keyframes / :root / @property block. The full app.<hash>.css other pages use is unchanged. The
   dashboard later adds dashx.<hash>.css (the full sheet minus @font-face) after the subset, so every rule is present
   in its original order and the later copy wins any tie: the cascade is exactly the usual one. */
"use strict";
function split(css){const out=[];let i=0,n=css.length;while(i<n){while(i<n&&/\s/.test(css[i]))i++;if(i>=n)break;
 if(css.startsWith("/*",i)){const e=css.indexOf("*/",i+2);i=e<0?n:e+2;continue}
 let j=i,q=null,p=0;while(j<n&&(q||p||(css[j]!=="{"&&css[j]!==";"))){const c=css[j];if(q){if(c==="\\")j++;else if(c===q)q=null}else if(c==='"'||c==="'")q=c;else if(c==="(")p++;else if(c===")")p--;j++}
 const pre=css.slice(i,j).trim();if(j>=n)break;if(css[j]===";"){out.push({pre,stmt:true});i=j+1;continue}
 let k=j+1,d=1;q=null;while(k<n&&d){const c=css[k];if(q){if(c==="\\")k++;else if(c===q)q=null}else if(c==='"'||c==="'")q=c;else if(c==="{")d++;else if(c==="}")d--;k++}
 out.push({pre,body:css.slice(j+1,k-1)});i=k}return out}
/* top-level comma split of a selector list (commas inside :is()/:not()/[attr="a,b"] stay) */
function sels(pre){const out=[];let s=0,p=0,b=0,q=null;for(let i=0;i<=pre.length;i++){const c=pre[i];
 if(i<pre.length&&q){if(c==="\\")i++;else if(c===q)q=null;continue}if(c==='"'||c==="'"){q=c;continue}
 if(c==="(")p++;else if(c===")")p--;else if(c==="[")b++;else if(c==="]")b--;else if(i===pre.length||(c===","&&!p&&!b)){const t=pre.slice(s,i).trim();if(t)out.push(t);s=i+1}}return out}
const KEEP=/^@(font-face|keyframes|-webkit-keyframes|property|charset|import|layer\s*[^{]*$)/i;
const GROUP=/^@(media|supports|container|layer)\b/i;
function pick(list,want,stats){let o="";for(const r of list){
 if(r.stmt){o+=r.pre+";";continue}
 if(KEEP.test(r.pre)||/^:root\b/.test(r.pre)&&sels(r.pre).every(s=>/^:root\b/.test(s))){o+=r.pre+"{"+r.body+"}";stats.kept++;continue}
 if(GROUP.test(r.pre)){const b=pick(split(r.body),want,stats);if(b)o+=r.pre+"{"+b+"}";continue}
 if(r.pre.startsWith("@")){stats.dropped++;continue}
 if(sels(r.pre).some(s=>want.has(s))){o+=r.pre+"{"+r.body+"}";stats.kept++}else stats.dropped++}return o}
/* every style-rule selector in the sheet, in order (for tools/dash-css.js) */
function allSelectors(css){const out=new Set();const walk=list=>{for(const r of list){if(r.stmt||KEEP.test(r.pre))continue;if(GROUP.test(r.pre)){walk(split(r.body));continue}if(r.pre.startsWith("@"))continue;for(const s of sels(r.pre))out.add(s)}};walk(split(css));return[...out]}
/* the full sheet without its @font-face blocks: the dashboard swaps this in next to the subset (which keeps the same
   faces), so the browser's font set never changes and the swap costs a style pass, not a relayout of every line of text */
function noFonts(css){let o="";for(const r of split(css)){if(r.stmt){o+=r.pre+";";continue}if(/^@font-face\b/i.test(r.pre))continue;o+=r.pre+"{"+r.body+"}"}return o}
function subset(css,selectors){const stats={kept:0,dropped:0};const want=new Set(selectors);return{css:pick(split(css),want,stats),stats}}
module.exports={subset,noFonts,allSelectors,split,sels};
