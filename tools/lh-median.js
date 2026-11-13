// Mobile Lighthouse (default simulated throttling), N runs per URL, prints each run and the median.
// usage: NODE_PATH=/workspace/tools/node_modules node tools/lh-median.js <base-url> [runs=3] [paths=/,/prices,/p/c1] [--json out.json]
const {chromium}=require("playwright");
(async()=>{const {pathToFileURL}=require("url"),path=require("path");const imp=m=>{const roots=(process.env.NODE_PATH||"").split(path.delimiter).filter(Boolean);for(const r of roots){try{return import(pathToFileURL(require.resolve(m,{paths:[r]})).href)}catch(e){}}return import(m)};
 const lh=(await imp("lighthouse")).default;const cl=await imp("chrome-launcher");
 const base=process.argv[2].replace(/\/$/,""),n=+process.argv[3]||3,paths=(process.argv[4]||"/,/prices,/p/c1").split(",");const ji=process.argv.indexOf("--json");const out={};
 for(const p of paths){const runs=[];
  for(let i=0;i<n;i++){const c=await cl.launch({chromePath:chromium.executablePath(),chromeFlags:["--headless=new","--no-sandbox"]});
   try{const r=await lh(base+p,{port:c.port,output:"json",logLevel:"error",onlyCategories:["performance"],formFactor:"mobile"});const a=r.lhr.audits;
    const v={score:Math.round(r.lhr.categories.performance.score*100),fcp:Math.round(a["first-contentful-paint"].numericValue),lcp:Math.round(a["largest-contentful-paint"].numericValue),tbt:Math.round(a["total-blocking-time"].numericValue),cls:+a["cumulative-layout-shift"].numericValue.toFixed(3),si:Math.round(a["speed-index"].numericValue),bytes:Math.round((a["total-byte-weight"]||{}).numericValue||0)};
    runs.push(v);console.log(p,"run",i+1,JSON.stringify(v))}finally{await c.kill()}}
  const med=k=>{const s=runs.map(r=>r[k]).sort((a,b)=>a-b);return s[Math.floor(s.length/2)]};
  const m={score:med("score"),fcp:med("fcp"),lcp:med("lcp"),tbt:med("tbt"),cls:med("cls"),si:med("si"),bytes:med("bytes"),min:Math.min(...runs.map(r=>r.score))};out[p]={runs,median:m};console.log(p,"MEDIAN",JSON.stringify(m))}
 if(ji>0)require("fs").writeFileSync(process.argv[ji+1],JSON.stringify(out,null,1))})();
