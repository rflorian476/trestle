// v31: build outputs must match their sources. Copies the build inputs into a temp dir, runs build-live.js there and
// compares every generated file (app-logic.js, public/index.html, public/js/*, public/css/*, public/fonts/*) byte for
// byte with what is committed. A stale bundle (like SW-064: src/v9.js said "$0.70", the shipped JS said "0.70") fails.
// Needs the same esbuild the release build uses: NODE_PATH=/workspace/tools/node_modules node test/bundle-sync.js
"use strict";
const fs=require("fs"),os=require("os"),path=require("path"),{execFileSync}=require("child_process");
const ROOT=path.join(__dirname,"..");let failed=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,400)));if(!c)failed++};
let esb=true;try{require.resolve("esbuild")}catch(e){esb=false}
ok(esb,"esbuild resolves (release bundles are minified with it; set NODE_PATH like run-all.sh)");
if(!esb){process.exit(1)}
const T=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-bundle-"));
try{
 for(const f of ["build-live.js","client-pre.js","client-post.js","brand.json","package.json"])fs.copyFileSync(path.join(ROOT,f),path.join(T,f));
 for(const d of ["src","lib","public"])fs.cpSync(path.join(ROOT,d),path.join(T,d),{recursive:true});
 // Start from a public/ with no generated files, so a missing or renamed output can't hide behind the copy.
 for(const d of ["js","css"])fs.rmSync(path.join(T,"public",d),{recursive:true,force:true});
 fs.rmSync(path.join(T,"public/index.html"),{force:true});fs.rmSync(path.join(T,"app-logic.js"),{force:true});
 const out=execFileSync(process.execPath,[path.join(T,"build-live.js")],{cwd:T,env:Object.assign({},process.env,{NO_MINIFY:""}),encoding:"utf8"});
 ok(/built \d+/.test(out),"build-live.js runs from source",out.slice(-300));
 const list=d=>{try{return fs.readdirSync(d).sort()}catch(e){return[]}};
 const cmp=(rel)=>{const a=path.join(ROOT,rel),b=path.join(T,rel);const ea=fs.existsSync(a),eb=fs.existsSync(b);
  if(!ea||!eb)return ok(false,rel+" exists in both the commit and the fresh build","committed "+ea+", built "+eb);
  const A=fs.readFileSync(a),B=fs.readFileSync(b);let i=0;if(!A.equals(B)){while(i<A.length&&i<B.length&&A[i]===B[i])i++}
  ok(A.equals(B),rel+" matches a fresh build of the sources",A.equals(B)?"":"first difference at byte "+i+": committed …"+A.toString("utf8",Math.max(0,i-60),i+60)+"… built …"+B.toString("utf8",Math.max(0,i-60),i+60)+"… (run: NODE_PATH=… node build-live.js and commit)")};
 cmp("app-logic.js");cmp("public/index.html");
 for(const d of ["public/js","public/css"]){const a=list(path.join(ROOT,d)),b=list(path.join(T,d));
  ok(a.join()===b.join(),d+" has exactly the files the build makes (no stale or missing hashed bundles)","committed "+a.join(" ")+" | built "+b.join(" "));
  for(const f of b)if(a.includes(f))cmp(d+"/"+f)}
 for(const f of list(path.join(T,"public/fonts")))cmp("public/fonts/"+f);
 const html=fs.readFileSync(path.join(ROOT,"public/index.html"),"utf8");const refs=[...html.matchAll(/\/(js|css)\/([\w.]+\.(?:js|css))/g)].map(m=>m[1]+"/"+m[2]);
 ok(refs.length>=3&&refs.every(r=>fs.existsSync(path.join(ROOT,"public",r))),"every /js and /css file index.html loads is committed",refs.filter(r=>!fs.existsSync(path.join(ROOT,"public",r))).join(" "));
 // The SW-064 class of bug: a "$$" in a layer source must reach the shipped JS literally.
 const src=fs.readFileSync(path.join(ROOT,"src/v9.js"),"utf8"),logic=fs.readFileSync(path.join(ROOT,"app-logic.js"),"utf8");
 const pub=list(path.join(ROOT,"public/js")).map(f=>fs.readFileSync(path.join(ROOT,"public/js",f),"utf8")).join("\n");
 ok(/mi at \$\$\{MILE_RATE/.test(src)&&/mi at \$\$\{MILE_RATE/.test(logic)&&/mi at \$\$\{MILE_RATE/.test(pub),"SW-064: 'mi at $${MILE_RATE…}' is the same in src/v9.js, app-logic.js and public/js");
}catch(e){ok(false,"bundle sync check ran",e&&e.stack||e)}
finally{fs.rmSync(T,{recursive:true,force:true})}
console.log(failed?"FAIL bundle-sync ("+failed+")":"bundle-sync: all checks passed");process.exit(failed?1:0);
