// v16 end-to-end: upload hardening (polyglots, trailing bytes, GPS removal), slim inline state on /p/:id (SW-018),
// expiry reminders that go out without opening the app, and honest dashboard numbers / first-run guidance.
// usage: node test/v16-e2e.js http://localhost:8899 [shotdir]   (NODE_PATH must include playwright)
const {chromium}=require("playwright");const fs=require("fs"),path=require("path"),zlib=require("zlib");
const B=(process.argv[2]||"http://localhost:8899").replace(/\/$/,"");const OUT=process.argv[3]||"";let fail=0;const errs=[];
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)fail++};
if(OUT)fs.mkdirSync(OUT,{recursive:true});
const PW="sawyer-demo-2026",run=Date.now().toString(36),FX=path.join(__dirname,"fixtures");
async function req(p,{method="GET",body,cookie,headers}={}){const h=Object.assign({},headers||{});if(body!==undefined&&!h["Content-Type"])h["Content-Type"]="application/json";if(cookie)h.Cookie=cookie;
 const r=await fetch(B+p,{method,headers:h,body:body===undefined?undefined:(Buffer.isBuffer(body)||typeof body==="string"?body:JSON.stringify(body)),redirect:"manual"});const buf=Buffer.from(await r.arrayBuffer());const t=buf.toString();let j=null;try{j=JSON.parse(t)}catch(e){}
 const sc=(r.headers.get("set-cookie")||"").match(/swsid=([^;]*)/);return{code:r.status,j,t,buf,headers:r.headers,cookie:sc&&sc[1]?"swsid="+sc[1]:null}}
const login=email=>req("/api/login",{method:"POST",body:{email,password:PW}});
const act=(cookie,name,args)=>req("/api/act",{method:"POST",cookie,body:{name,args}});
const signup=(kind,data)=>req("/api/signup",{method:"POST",body:{kind,password:"v16-pass-"+run,data}});
const up=(cookie,type,buf)=>req("/api/upload",{method:"POST",cookie,headers:{"Content-Type":type},body:buf});
// GPS entry count inside a JPEG's EXIF block (-1 when there is no GPS block at all)
function gpsCount(b){const x=b.indexOf("Exif\0\0","latin1");if(x<0)return -1;const t=x+6,le=b.toString("latin1",t,t+2)==="II";const u16=o=>le?b.readUInt16LE(o):b.readUInt16BE(o),u32=o=>le?b.readUInt32LE(o):b.readUInt32BE(o);
 const i0=t+u32(t+4),n=u16(i0);for(let k=0;k<n;k++){const e=i0+2+k*12;if(u16(e)===0x8825)return u16(t+u32(e+8))}return -1}
const shot=async(p,n)=>{if(OUT)await p.screenshot({path:OUT+"/"+n+".png"})};
function pngChunk(type,data){const d=Buffer.from(data,"latin1"),h=Buffer.alloc(8);h.writeUInt32BE(d.length,0);h.write(type,4,"latin1");const c=Buffer.alloc(4);c.writeUInt32BE(zlib.crc32(Buffer.concat([h.subarray(4),d]))>>>0,0);return Buffer.concat([h,d,c])}
(async()=>{
// ===================== 1) uploads hardening =====================
{const S=await signup("pro",{name:"Uma Upload",email:"v16-up-"+run+"@sawyer.test",biz:"Uma Upload Electric",trade:"Electrical",zip:"78704",phone:"5125550111"});const ck=S.cookie;ok(S.code===200&&ck,"throwaway pro signed up for upload checks",S.code);
 const jpg=fs.readFileSync(path.join(FX,"v16-gps.jpg")),prog=fs.readFileSync(path.join(FX,"v16-progressive.jpg")),png=fs.readFileSync(path.join(FX,"v16-plain.png")),webp=fs.readFileSync(path.join(FX,"v16-exif.webp"));
 ok(gpsCount(jpg)>0,"fixture photo carries GPS coordinates ("+gpsCount(jpg)+" GPS tags)");
 const r1=await up(ck,"image/jpeg",jpg);ok(r1.code===200&&/^\/u\/[a-f0-9]{32}\.jpg$/.test(r1.j&&r1.j.url||""),"real camera JPEG uploads",r1.t);
 if(r1.j&&r1.j.url){const g=await req(r1.j.url);ok(g.code===200&&g.buf[0]===0xff&&g.buf[1]===0xd8&&g.buf.slice(-2).equals(Buffer.from([0xff,0xd9])),"stored JPEG is still a whole image (SOI..EOI)");
  ok(gpsCount(g.buf)===0,"GPS location is removed from the stored photo (GPS tags left: "+gpsCount(g.buf)+")");
  ok(g.buf.indexOf("TestCam","latin1")>0,"the rest of the EXIF (camera, orientation) is kept");
  ok(/sandbox/.test(g.headers.get("content-security-policy")||"")&&g.headers.get("x-content-type-options")==="nosniff","uploads still served with a sandbox CSP and nosniff")}
 for(const[n,t,b]of[["progressive JPEG","image/jpeg",prog],["PNG","image/png",png],["WebP with EXIF","image/webp",webp]]){const r=await up(ck,t,b);ok(r.code===200&&r.j&&r.j.ok,n+" uploads",r.t)}
 const poly=[["JPEG + trailing <html><script>","image/jpeg",Buffer.concat([jpg,Buffer.from("<html><body><script>alert(document.domain)</script>")])],
  ["PNG + trailing <script>","image/png",Buffer.concat([png,Buffer.from("<script>fetch('/api/account')</script>")])],
  ["WebP + trailing <svg onload>","image/webp",Buffer.concat([webp,Buffer.from('<svg onload="alert(1)">')])],
  ["JPEG with <script> in a comment segment","image/jpeg",Buffer.concat([jpg.subarray(0,2),Buffer.from([0xff,0xfe,0,2+26]),Buffer.from("<script>alert(1)</script>x"),jpg.subarray(2)])],
  ["PNG with an <iframe> text chunk","image/png",Buffer.concat([png.subarray(0,33),pngChunk("tEXt","Comment\0<iframe src=//evil.example></iframe>"),png.subarray(33)])],
  ["HTML page with a JPEG header","image/jpeg",Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.from("<!doctype html><html><script>alert(1)</script></html>")])],
  ["JPEG cut off before its end marker","image/jpeg",jpg.subarray(0,jpg.length-500)]];
 for(const[n,t,b]of poly){const r=await up(ck,t,b);ok(r.code===415&&r.j&&!r.j.ok&&/web code|isn't a valid image/.test(r.j.error||""),"refused: "+n+" (HTTP "+r.code+")",r.t)}
 const hid=await up(ck,"image/jpeg",poly[0][2]);ok(/hidden inside it/.test(hid.j&&hid.j.error||""),"polyglot error tells the user what to do: "+(hid.j&&hid.j.error));
 const tz=Buffer.concat([jpg,Buffer.from("PK\x03\x04 appended motion clip bytes ".repeat(20))]);const rz=await up(ck,"image/jpeg",tz);ok(rz.code===200,"photo with harmless trailing bytes (phone motion clip) still uploads");
 if(rz.j&&rz.j.url){const g=await req(rz.j.url);ok(g.buf.length<tz.length&&g.buf.slice(-2).equals(Buffer.from([0xff,0xd9]))&&g.buf.indexOf("PK\x03\x04","latin1")<0,"trailing bytes are cut off at the end marker ("+tz.length+" -> "+g.buf.length+" bytes)")}
 const rp=await up(ck,"image/png",Buffer.concat([png,Buffer.from("trailing")]));if(rp.j&&rp.j.url){const g=await req(rp.j.url);ok(g.buf.length===png.length,"PNG trailing bytes trimmed after IEND")}
}
// ===================== 2) SW-018: signed-out /p/:id inlines only that profile's data =====================
{const inl=t=>{const i=t.indexOf("window.__ST=");if(i<0)return null;const e=t.indexOf("</script>",i);try{return{len:e-i-12,st:JSON.parse(t.slice(i+12,e))}}catch(x){return null}};
 const full=(await req("/api/state")).j.state;const fullLen=JSON.stringify(full).length;
 const r=await req("/p/c1");const x=inl(r.t);
 ok(x&&x.st.partial==="c1","signed-out /p/c1 inlines a slim state marked partial for c1");
 ok(x&&x.len<Math.min(20000,fullLen/4),"inline state is small: "+(x&&x.len)+" bytes vs "+fullLen+" for the full public state");
 ok(x&&x.st._v===0,"slim state carries no data version, so the client never treats it as current");
 ok(x&&x.st.users.some(u=>u.id==="c1")&&x.st.users.every(u=>u.id==="c1"||u.role==="pm"),"only the pro (and PMs of their crew projects) are inlined ("+(x&&x.st.users.length)+" users)");
 ok(x&&x.st.reviews.length>0&&x.st.reviews.every(r=>r.cid==="c1"&&/^rv-/.test(r.uid)),"inlined reviews are this pro's, still tokenized (SW-039)");
 ok(x&&!/"(email|phone|password|hash|salt)":"[^"]/.test(JSON.stringify(x.st.users.filter(u=>u.id!=="c1")))&&!x.st.users.some(u=>u.id==="c1"&&u.phone),"no contact details in the slim state");
 const pros=full.users.filter(u=>u.role==="contractor").slice(0,8);let n=0;for(const u of pros){const y=inl((await req("/p/"+u.id)).t);if(y&&y.st.partial===u.id&&y.len<20000)n++}
 ok(n===pros.length,"every sampled profile gets its slim state ("+n+"/"+pros.length+")");
 const H=await login("demo-homeowner@sawyer.test");const rs=await req("/p/c1",{cookie:H.cookie});ok(rs.code===200&&rs.t.indexOf("window.__ST=")<0,"signed-in visitors never get inline state");
 const br=await chromium.launch();
 for(const w of [1300,390]){const c=await br.newContext({viewport:{width:w,height:w<500?844:900}});const p=await c.newPage();const pe=[];p.on("pageerror",e=>pe.push(String(e).slice(0,200)));
  let hold=true;await p.route("**/api/state*",async rt=>{while(hold)await new Promise(z=>setTimeout(z,50));await rt.continue()});// hold the background load until the first paint is checked
  await p.goto(B+"/p/c1",{waitUntil:"domcontentloaded"});await p.waitForFunction(()=>typeof DB!=="undefined"&&DB&&document.querySelector("#app .px-name"),null,{polling:10,timeout:15000});
  const a=await p.evaluate(()=>({part:__PART,n:DB.users.length,h1:(document.querySelector("#app h1")||{}).textContent,html:document.querySelector("#app").innerHTML}));
  ok(a.part==="c1"&&a.n<=x.st.users.length,w+": the profile paints from the slim state, and the browser doesn't seed demo data into it ("+a.n+" users)");
  ok(/Bluebonnet/.test(a.h1||""),w+": profile heading renders ("+a.h1+")");
  hold=false;await p.waitForFunction(()=>__PART===null,null,{timeout:8000}).catch(()=>{});
  const b=await p.evaluate(()=>({part:__PART,n:DB.users.length,html:document.querySelector("#app").innerHTML}));
  ok(b.part===null&&b.n===full.users.length,w+": the full public state loads in the background after paint ("+b.n+" users)");
  ok(a.html===b.html,w+": the page doesn't change when the full state arrives");
  if(w===1300)await shot(p,"v16-p-c1-slim-1300");
  await p.click("a.backlink");await p.waitForTimeout(900);const cards=await p.$$eval("#app .pcard, #app article.pc, #app .pc",e=>e.length).catch(()=>0);
  ok(/#\/find/.test(p.url())&&cards>=3,w+": Find opens with the full list after leaving the profile ("+cards+" cards)");
  const q=await c.newPage();q.on("pageerror",e=>pe.push(String(e).slice(0,200)));await q.goto(B+"/p/c1",{waitUntil:"domcontentloaded"});await q.waitForFunction(()=>typeof __PART!=="undefined"&&typeof DB!=="undefined"&&DB,null,{polling:5,timeout:15000});
  await q.evaluate(()=>{location.hash="#/find?cat=Electrical"});await q.waitForTimeout(700);
  const qn=await q.evaluate(()=>({part:__PART,n:DB.users.length,cards:document.querySelectorAll("#app .pcard, #app article.pc, #app .pc").length}));
  ok(qn.part===null&&qn.n===full.users.length&&qn.cards>=1,w+": leaving the profile right away loads the full state first ("+qn.n+" users, "+qn.cards+" cards)");
  ok(pe.length===0,w+": no page errors on the slim profile",pe.join(" | "));errs.push(...pe);await c.close()}
 await br.close()}
// ===================== 3) Records: expiry reminders + vendor COIs with real expiry dates =====================
{const day=n=>new Date(Date.now()+n*864e5).toISOString().slice(0,10);
 const P=await signup("pro",{name:"Cory Coi",email:"v16-coi-pro-"+run+"@sawyer.test",biz:"Cory Coi Electric",trade:"Electrical",zip:"78704",phone:"5125550122"});
 const C=await signup("customer",{name:"Hana Homeowner",email:"v16-coi-cu-"+run+"@sawyer.test",zip:"78704"});
 const pid=P.j&&P.j.state.me,cid=C.j&&C.j.state.me;ok(pid&&cid,"throwaway pro and customer for the COI flow");
 // a pro with no liability policy on file: COI goes out, with a nudge
 let r=await act(C.cookie,"requestCOI",[pid,"Kitchen"]);ok(r.j&&r.j.res&&r.j.res.ok,"customer asks the pro for a COI",r.t);
 let ps=(await act(P.cookie,"sweep9",[])).j.state;let rq=(ps.users.find(u=>u.id===pid).coiReqs||[]).find(x=>x.from===cid&&x.status==="requested");
 r=await act(P.cookie,"sendCOI",[rq&&rq.id]);ok(r.j.res.ok&&/general liability policy/.test(r.j.res.msg),"no policy on file: COI sent, pro told to add the policy and its expiry: "+r.j.res.msg);
 let cs=(await act(C.cookie,"sweep9",[])).j.state;let mine=cs.users.find(u=>u.id===cid).cois.filter(c=>c.cid===pid);ok(mine.length===1&&mine[0].status==="received"&&!mine[0].exp,"customer's COI shows received, with no expiry to track");
 // the pro adds the policy; the next COI carries carrier, number and expiry
 r=await act(P.cookie,"saveDoc",[{scope:"biz",kind:"gl",name:"General liability, $1M/$2M",num:"GL-"+run,holder:"Acme Mutual (test)",exp:day(20)}]);ok(r.j.res.ok,"pro saves a liability policy expiring in 20 days");
 r=await act(C.cookie,"requestCOI",[pid,""]);ok(r.j.res.ok,"customer asks for an updated COI");
 ps=(await act(P.cookie,"sweep9",[])).j.state;rq=(ps.users.find(u=>u.id===pid).coiReqs||[]).find(x=>x.from===cid&&x.status==="requested");
 ok(ps.notifs.some(n=>/General liability, \$1M\/\$2M expires in 20 days/.test(n.text)&&/verified badge/.test(n.text)),"pro gets the 30-day notice for the policy (no payment reminders needed)");
 r=await act(P.cookie,"sendCOI",[rq&&rq.id]);ok(r.j.res.ok&&r.j.res.msg==="COI sent","COI sent");
 cs=(await act(C.cookie,"sweep9",[])).j.state;const me=cs.users.find(u=>u.id===cid);const last=me.cois.filter(c=>c.cid===pid).sort((a,b)=>b.date-a.date)[0];
 ok(last&&last.exp===day(20)&&last.carrier==="Acme Mutual (test)"&&last.num==="GL-"+run,"the customer's COI carries the policy's expiry, carrier and number",JSON.stringify(last));
 const nt=cs.notifs.filter(n=>/certificate of insurance expires in 20 days/.test(n.text));ok(nt.length===1&&/Cory Coi Electric/.test(nt[0].text),"customer gets a 30-day COI notice: "+(nt[0]&&nt[0].text));
 cs=(await act(C.cookie,"sweep9",[])).j.state;ok(cs.notifs.filter(n=>/certificate of insurance expires/.test(n.text)).length===1,"the same notice isn't sent twice");
 const pub=(await req("/api/state",{cookie:P.cookie})).j.state;ok(!JSON.stringify(pub.users.find(u=>u.id===cid)).includes("cois"),"other accounts never see a customer's COI list");
 // a renewal restarts the schedule
 const gl=ps.bdocs.find(d=>d.by===pid&&d.kind==="gl");r=await act(P.cookie,"saveDoc",[Object.assign({},gl,{exp:day(400)})]);ps=(await act(P.cookie,"sweep9",[])).j.state;
 ok((ps.bdocs.find(d=>d.id===gl.id).rem9||[]).length===0,"renewing a policy resets its reminder schedule");
 r=await act(P.cookie,"saveDoc",[Object.assign({},gl,{exp:day(5)})]);ps=(await act(P.cookie,"sweep9",[])).j.state;
 ok(ps.notifs.some(n=>/expires in 5 days/.test(n.text)),"…so the next expiry gets its own notice");
 // the server sweep reaches accounts that never open the app (boot sweep runs 5 s after start; not a pro, no payment reminders)
 let bn=[];for(let i=0;i<20&&!bn.length;i++){const L=await login("demo-business@sawyer.test");bn=(L.j.state.notifs||[]).filter(n=>/certificate of insurance expires/.test(n.text));if(!bn.length)await new Promise(z=>setTimeout(z,700))}
 ok(bn.length===1&&/Bluebonnet/.test(bn[0].text),"server sweep sends the demo business its COI notice without the app open: "+(bn[0]&&bn[0].text));
 const BL=await login("demo-business@sawyer.test");const b1=BL.j.state.users.find(u=>u.id===BL.j.state.me);ok((b1.cois||[]).some(c=>c.cid==="c1"&&c.exp&&c.carrier),"demo business holds Bluebonnet's COI with a real expiry");
 const br=await chromium.launch();
 for(const w of [1300,390]){const c=await br.newContext({viewport:{width:w,height:w<500?844:900},deviceScaleFactor:w<500?2:1});const p=await c.newPage();const pe=[];p.on("pageerror",e=>pe.push(String(e).slice(0,200)));p.on("dialog",d=>d.accept());
  await p.goto(B+"/");await p.evaluate(async e=>{await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,password:"sawyer-demo-2026"})})},"demo-business@sawyer.test");
  await p.goto(B+"/#/dash");await p.reload();await p.waitForSelector("#bizPanel",{timeout:10000});
  const t=await p.$eval("#bizPanel",e=>e.innerText);ok(/Bluebonnet[\s\S]*Expires in \d+ days/.test(t)&&/Next Insurance/.test(t),w+": business dashboard lists the COI with carrier and days left");
  ok(/INV-\d+/.test(t)&&!/Invoices appear here when jobs complete/.test(t),w+": the panel's Invoices list shows the real invoice to pay");
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1),w+": no sideways scroll");
  const el=await p.$("#bizPanel");await el.scrollIntoViewIfNeeded();if(OUT)await el.screenshot({path:OUT+"/v16-biz-coi-"+w+".png"});
  if(w===390){await p.click("[data-coi16]");await p.waitForTimeout(700);const t2=await p.$eval(".coi16-l",e=>e.innerText);ok(/Requested/.test(t2),"one tap asks Bluebonnet for an updated COI ("+t2.replace(/\s+/g," ").slice(0,80)+")")}
  ok(pe.length===0,w+": no page errors",pe.join(" | "));errs.push(...pe);await c.close()}
 // Office copy now matches the schedule that actually runs
 const c=await br.newContext({viewport:{width:1300,height:900}});const p=await c.newPage();await p.goto(B+"/");await p.evaluate(async e=>{await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:e,password:"sawyer-demo-2026"})})},"demo-pro@sawyer.test");
 await p.goto(B+"/#/office/compliance");await p.reload();await p.waitForTimeout(900);const ot=await p.$eval("#app",e=>e.innerText);
 ok(/60, 30 and 7 days/.test(ot)&&!/45 days/.test(ot),"Office states one reminder schedule (60, 30, 7 days and the day of)");
 await br.close()}
//@@V16-NEXT@@
if(errs.length)console.log("page errors:",errs.slice(0,5).join(" | "));ok(errs.length===0,"no page errors ("+errs.length+")");
console.log(fail?`\n${fail} FAILED`:"\nALL PASS");process.exit(fail?1:0)})().catch(e=>{console.log("FAIL crashed:",e&&e.stack||e);process.exit(1)});
