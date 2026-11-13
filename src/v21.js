/* ===== v21 ===== */
/* Perf: responsive photos. Every built-in photo under /img/ that has smaller copies (NAME-sm 400w, NAME-md 640/800w,
   generated from the same Pexels originals) gets a srcset and a sizes hint for where it sits, so a 184 px trade tile
   no longer downloads an 800 px photo. Below-the-fold photos must not also ask for high fetch priority. */
const V21IMGW=__IMGW__;
const V21SIZES=[[/\bv4cat\b/,"(max-width: 700px) 46vw, 240px"],[/\bv19-g\b|\bg12\b/,"(max-width: 700px) 46vw, 260px"],[/\bpx-cover\b/,"100vw"],[/\bpc-img\b/,"(max-width: 700px) 82vw, 340px"],[/\bv4pro-img\b|\bt5home-img\b|\bv4cta\b|\bt6simc\b/,"(max-width: 700px) 92vw, 380px"]];
// the closest known container class before the <img> decides the hint (lists repeat the container per card)
function v21Sizes(before,own){let best=-1,out="(max-width: 700px) 92vw, 420px";for(const[re,s]of V21SIZES){if(re.test(own))return s;const g=new RegExp(re.source,"g");let m,last=-1;while((m=g.exec(before)))last=m.index;if(last>best){best=last;out=s}}return out}
function IMGSET(h){h=String(h==null?"":h);if(h.indexOf("/img/")<0&&h.indexOf("fetchpriority")<0)return h;
 return h.replace(/<img\b[^>]*>/g,(t,at)=>{let o=t;
  if(/\bfetchpriority="high"/.test(o)&&/\bloading="lazy"/.test(o))o=o.replace(/\s*fetchpriority="high"/,"");
  const m=/\ssrc="\/img\/([a-z0-9-]+)\.webp"/.exec(o);if(!m||/\ssrcset=/.test(o))return o;const set=V21IMGW[m[1]];if(!set||set.length<2)return o;
  const before=(h.slice(Math.max(0,at-1200),at).match(/class="[^"]*"/g)||[]).join(" ");const own=(/\sclass="([^"]*)"/.exec(o)||[])[1]||"";
  return o.replace(/\ssrc="/,` srcset="${set.map(([f,w])=>"/img/"+f+".webp "+w+"w").join(", ")}" sizes="${v21Sizes(before,own)}" src="`)})}
