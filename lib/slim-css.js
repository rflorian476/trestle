// v10 perf: drop CSS rules whose class/id selectors never appear in the app's markup or scripts (legacy design layers).
// Conservative: a selector is kept unless it names a class/id that has no matching token anywhere in the JS/HTML.
function tokens(src){const t=new Set(),pre=new Set();for(const m of src.matchAll(/[A-Za-z_][\w-]*/g)){const w=m[0];t.add(w);if(w.endsWith("-")||w.endsWith("_"))pre.add(w)}
 // fragments that end right before ${ or "+ (dynamic class names)
 for(const m of src.matchAll(/([A-Za-z_][\w-]*)(?:\$\{|["'`]\s*\+)/g))pre.add(m[1]);return{t,pre:[...pre].filter(p=>p.length>=2)}}
function used(name,T){if(T.t.has(name))return true;for(const p of T.pre)if(name.startsWith(p))return true;return false}
function selUsed(sel,T){const s=sel.replace(/:(not|is|where|has)\([^)]*\)/g,"").replace(/::?[\w-]+(\([^)]*\))?/g,"").replace(/\[[^\]]*\]/g,"");
 for(const m of s.matchAll(/[.#]([A-Za-z_][\w-]*)/g))if(!used(m[1],T))return false;return true}
function split(css){const out=[];let i=0,n=css.length;while(i<n){while(i<n&&/\s/.test(css[i]))i++;if(i>=n)break;
 if(css.startsWith("/*",i)){const e=css.indexOf("*/",i+2);i=e<0?n:e+2;continue}
 let j=i,depth=0,q=null;// read prelude
 while(j<n&&(q||(css[j]!=="{"&&css[j]!==";"))){if(q){if(css[j]==="\\")j++;else if(css[j]===q)q=null}else if(css[j]==='"'||css[j]==="'")q=css[j];j++}
 const pre=css.slice(i,j).trim();if(j>=n){break}
 if(css[j]===";"){out.push({pre,stmt:true});i=j+1;continue}
 let k=j+1;depth=1;q=null;while(k<n&&depth){const c=css[k];if(q){if(c==="\\")k++;else if(c===q)q=null}else if(c==='"'||c==="'")q=c;else if(c==="{")depth++;else if(c==="}")depth--;k++}
 out.push({pre,body:css.slice(j+1,k-1)});i=k}return out}
// SW-005: one light Linen & Navy theme. Dark-theme selectors are dropped from the shipped CSS.
const DARK=/\[data-theme=["']?dark["']?\]|prefers-color-scheme:\s*dark/;
function slim(css,T,stats){let o="";for(const r of split(css)){
 if(r.stmt){o+=r.pre+";";continue}
 if(r.pre.startsWith("@media")&&DARK.test(r.pre)){stats.dropped++;continue}
 if(r.pre.startsWith("@media")||r.pre.startsWith("@supports")||r.pre.startsWith("@layer")||r.pre.startsWith("@container")){const b=slim(r.body,T,stats);if(b.trim())o+=r.pre+"{"+b+"}";continue}
 if(r.pre.startsWith("@")){o+=r.pre+"{"+r.body+"}";continue}
 const sels=r.pre.split(/,(?![^(]*\))/).map(s=>s.trim()).filter(Boolean);const keep=sels.filter(s=>!DARK.test(s)&&selUsed(s,T));
 if(!keep.length){stats.dropped++;continue}if(keep.length<sels.length)stats.trimmed++;o+=keep.join(",")+"{"+r.body.trim()+"}"}return o}
module.exports=function(css,src){const T=tokens(src),stats={dropped:0,trimmed:0};const out=slim(css,T,stats).replace(/\s*\n\s*/g," ").replace(/\s*([{};])\s*/g,"$1").replace(/;}/g,"}");return{css:out,stats}};
