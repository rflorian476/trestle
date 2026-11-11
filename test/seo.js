// Index switch, demo exclusion, and canonical origin. Starts its own server.
// Usage: node test/seo.js
"use strict";
const {spawn}=require("child_process"),http=require("http"),fs=require("fs"),os=require("os"),path=require("path"),zlib=require("zlib");
const ROOT=path.join(__dirname,"..");
let failed=0;
function assert(cond,msg){if(!cond){failed++;console.error("FAIL",msg)}else console.log("ok",msg)}
function start(port,extra){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"sawyer-seo-"));
 const env=Object.assign({},process.env,extra||{},{HOST:"127.0.0.1",PORT:String(port),DATA_DIR:dir});
 if(!extra||!("SAWYER_INDEXABLE" in extra))delete env.SAWYER_INDEXABLE;
 if(!extra||!("SAWYER_BASE_URL" in extra))delete env.SAWYER_BASE_URL;
 if(!extra||!("PUBLIC_URL" in extra))delete env.PUBLIC_URL;
 const child=spawn(process.execPath,[path.join(ROOT,"server.js")],{env,stdio:["ignore","pipe","pipe"]});
 let log="";child.stdout.on("data",d=>{log+=d});child.stderr.on("data",d=>{log+=d});
 return new Promise((ok,no)=>{
  const t=setTimeout(()=>{no(new Error("server did not start\n"+log))},8000);
  const wait=()=>{if(/live on/.test(log)){clearTimeout(t);ok({child,dir})}else setTimeout(wait,30)};
  child.on("exit",()=>{clearTimeout(t);no(new Error("server exited\n"+log))});
  wait();
 });
}
function stop(s){return new Promise(ok=>{s.child.on("exit",()=>{fs.rmSync(s.dir,{recursive:true,force:true});ok()});s.child.kill("SIGTERM")})}
function req(port,method,p,headers,body){
 return new Promise((ok,no)=>{
  const r=http.request({hostname:"127.0.0.1",port,path:p,method,headers:headers||{}},res=>{
   const chunks=[];res.on("data",c=>chunks.push(c));res.on("end",()=>{
    let buf=Buffer.concat(chunks);
    const enc=res.headers["content-encoding"];
    if(enc==="gzip")buf=zlib.gunzipSync(buf);
    else if(enc==="br")buf=zlib.brotliDecompressSync(buf);
    ok({status:res.statusCode,headers:res.headers,body:buf});
   });
  });
  r.on("error",no);if(body)r.write(body);r.end();
 });
}
const get=(port,p,headers)=>req(port,"GET",p,headers);
function freePort(){return new Promise((ok,no)=>{const s=http.createServer();s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>ok(p))});s.on("error",no)})}
function locs(xml){return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1])}

(async()=>{
 const betaPort=await freePort(),livePort=await freePort();
 const beta=await start(betaPort);
 const live=await start(livePort,{SAWYER_INDEXABLE:"1",SAWYER_BASE_URL:"https://sawyer.example/ignored"});
 try{
  const hdr={Host:"beta.example","X-Forwarded-Proto":"https"};
  const home=await get(betaPort,"/",hdr);
  const html=home.body.toString("utf8");
  assert(home.status===200,"home 200");
  assert(home.headers["x-robots-tag"]==="noindex, nofollow","beta home sends X-Robots-Tag");
  assert(/data-sawyer-robots="beta"/.test(html)&&/noindex, nofollow/.test(html),"beta home robots meta");
  assert(/rel="canonical" href="https:\/\/beta\.example\/"/.test(html),"canonical uses the request host when the base URL is unset");
  assert(/property="og:url" content="https:\/\/beta\.example\/"/.test(html),"og:url matches the canonical host");
  assert(!html.includes("application/ld+json")&&!html.includes('"@type":"Organization"'),"SW-045: beta home has no JSON-LD while the host is not indexable");
  const zipped=await get(betaPort,"/",Object.assign({"Accept-Encoding":"gzip"},hdr));
  assert(zipped.headers["x-robots-tag"]==="noindex, nofollow"&&/data-sawyer-robots="beta"/.test(zipped.body.toString("utf8"))&&!zipped.body.toString("utf8").includes("ld+json"),"gzipped home still sends noindex and no JSON-LD");

  const robots=(await get(betaPort,"/robots.txt")).body.toString("utf8");
  assert(/\nDisallow: \/\s*\n/.test(robots)&&!/^Sitemap:/m.test(robots)&&robots.includes("SAWYER_INDEXABLE=1"),"beta robots disallows everything and documents the switch");
  const map=(await get(betaPort,"/sitemap.xml",hdr)).body.toString("utf8");
  const betaLocs=locs(map);
  assert(betaLocs.length===1&&betaLocs[0]==="https://beta.example/","beta sitemap is only the homepage");

  const state=JSON.parse((await get(betaPort,"/api/state")).body.toString("utf8")).state;
  const demoPro=(state.users||[]).find(u=>u.role==="contractor"&&u.demo);
  const demoCall=(state.tcalls||[]).find(c=>c.demo||/\(demo\)/i.test(c.title||""));
  assert(demoPro&&demoCall,"seeded demo pro and traveler call exist");
  const pro=await get(betaPort,"/p/"+demoPro.id,hdr);
  const proHtml=pro.body.toString("utf8");
  assert(pro.status===200&&pro.headers["x-robots-tag"]==="noindex, nofollow","demo profile is noindex");
  assert(proHtml.includes("og:title")&&/rel="canonical" href="https:\/\/beta\.example\/p\//.test(proHtml),"demo profile keeps OG and canonical");
  assert(!proHtml.includes("application/ld+json")&&!proHtml.includes("HomeAndConstructionBusiness"),"demo profile has no structured data");
  const call=await get(betaPort,"/t/"+demoCall.id,hdr);
  const callHtml=call.body.toString("utf8");
  assert(call.status===200&&call.headers["x-robots-tag"]==="noindex, nofollow"&&!callHtml.includes("JobPosting")&&!callHtml.includes("application/ld+json"),"demo traveler call is noindex without JobPosting");

  const offSignup=await req(betaPort,"POST","/api/signup",{"Content-Type":"application/json"},JSON.stringify({kind:"pro",password:"correct-horse-9",data:{name:"Riley Real",email:"riley-off@example.com",biz:"Ridgeline Real Roofing",trade:"Roofing",zip:"78704"}}));
  const offId=JSON.parse(offSignup.body.toString("utf8")).res.id;
  assert(offId,"signed up a real pro while indexing is off");
  const offPage=await get(betaPort,"/p/"+offId,hdr);
  assert(offPage.headers["x-robots-tag"]==="noindex, nofollow"&&!offPage.body.toString("utf8").includes("application/ld+json"),"SW-045: a real profile stays noindex with no schema until the switch");
  assert(!locs((await get(betaPort,"/sitemap.xml",hdr)).body.toString("utf8")).some(u=>u.includes("/p/")),"real profiles are not listed while indexing is off");

  const liveHome=await get(livePort,"/",{Host:"other.example","X-Forwarded-Proto":"http"});
  const liveHtml=liveHome.body.toString("utf8");
  assert(!liveHome.headers["x-robots-tag"],"indexable home has no X-Robots-Tag");
  assert(!/name="robots"/.test(liveHtml),"indexable home has no robots meta");
  assert(liveHtml.includes('"@type":"Organization"')&&liveHtml.includes('"url":"https://sawyer.example"'),"indexable home has the Organization schema on SAWYER_BASE_URL");
  assert(/rel="canonical" href="https:\/\/sawyer\.example\/"/.test(liveHtml)&&/og:url" content="https:\/\/sawyer\.example\/"/.test(liveHtml),"canonical and og:url use SAWYER_BASE_URL");
  const liveRobots=(await get(livePort,"/robots.txt")).body.toString("utf8");
  assert(liveRobots.includes("Allow: /")&&liveRobots.includes("Sitemap: https://sawyer.example/sitemap.xml")&&!/\nDisallow: \/\s*\n/.test(liveRobots),"live robots allows the site");
  const liveState=JSON.parse((await get(livePort,"/api/state")).body.toString("utf8")).state;
  const liveDemo=(liveState.users||[]).filter(u=>u.role==="contractor"&&(u.demo||/\(demo\)/i.test((u.biz||"")+" "+(u.name||""))));
  const liveCalls=(liveState.tcalls||[]).filter(c=>c.status!=="closed"&&(c.demo||/\(demo\)/i.test(c.title||"")));
  assert(liveDemo.length>10&&liveCalls.length>0,"live server still has the demo catalog");
  const liveMap=locs((await get(livePort,"/sitemap.xml")).body.toString("utf8"));
  assert(liveMap.length===1&&liveMap[0]==="https://sawyer.example/","indexable sitemap still omits every demo record");
  for(const u of liveDemo)assert(!liveMap.some(l=>l.endsWith("/p/"+u.id)),"demo pro "+u.id+" not in sitemap");
  for(const c of liveCalls)assert(!liveMap.some(l=>l.endsWith("/t/"+c.id)),"demo call "+c.id+" not in sitemap");
  const livePro=await get(livePort,"/p/"+liveDemo[0].id);
  assert(livePro.headers["x-robots-tag"]==="noindex, nofollow"&&livePro.body.toString("utf8").includes('data-sawyer-robots="demo"')&&!livePro.body.toString("utf8").includes("application/ld+json"),"demo profile stays noindex with no schema after the switch");
  const csp=livePro.headers["content-security-policy"]||"";
  assert(/script-src 'self' 'sha256-/.test(csp)&&!/script-src[^;]*unsafe-inline/.test(csp),"profile HTML uses the hash CSP");
  const pretty=await get(livePort,"/pro/"+liveDemo[0].id);
  assert(pretty.status===200&&pretty.headers["x-robots-tag"]==="noindex, nofollow","pretty /pro URL for a demo record is noindex");
  const prices=await get(livePort,"/prices");
  assert(prices.status===200&&!prices.headers["x-robots-tag"]&&/<title>Price guide · Sawyer<\/title>/.test(prices.body.toString("utf8")),"real app routes stay indexable when the switch is on");
  const liveCall=await get(livePort,"/t/"+liveCalls[0].id);
  assert(liveCall.headers["x-robots-tag"]==="noindex, nofollow"&&!liveCall.body.toString("utf8").includes("JobPosting"),"demo call stays noindex with no JobPosting after the switch");

  async function signup(biz,email){const r=await req(livePort,"POST","/api/signup",{"Content-Type":"application/json"},JSON.stringify({kind:"pro",password:"correct-horse-9",data:{name:"Riley Real",email,biz,trade:"Roofing",zip:"78704"}}));return JSON.parse(r.body.toString("utf8")).res.id}
  const realId=await signup("Ridgeline Real Roofing","riley-live@example.com");
  const labelId=await signup("Sample (demo) Roofing","labelled-demo@example.com");
  assert(realId&&labelId,"signed up a real pro and a labelled demo pro");
  const after=locs((await get(livePort,"/sitemap.xml")).body.toString("utf8"));
  assert(after.includes("https://sawyer.example/p/"+realId)&&!after.includes("/p/"+labelId),"sitemap lists the real pro and skips a business labelled (demo)");
  const realPage=await get(livePort,"/p/"+realId);
  const realHtml=realPage.body.toString("utf8");
  assert(!realPage.headers["x-robots-tag"]&&!/noindex/.test(realHtml)&&realHtml.includes("HomeAndConstructionBusiness")&&realHtml.includes("https://sawyer.example/p/"+realId),"real profile is indexable, with schema and a canonical on SAWYER_BASE_URL");
  const labelPage=await get(livePort,"/p/"+labelId);
  assert(labelPage.headers["x-robots-tag"]==="noindex, nofollow"&&!labelPage.body.toString("utf8").includes("application/ld+json"),"a profile labelled (demo) is noindex with no schema");
 }finally{await stop(beta);await stop(live)}
 if(failed){console.error(failed+" failed");process.exit(1)}
 console.log("seo checks passed");
})().catch(e=>{console.error(e);process.exit(1)});
