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
//@@V16-NEXT@@
if(errs.length)console.log("page errors:",errs.slice(0,5).join(" | "));ok(errs.length===0,"no page errors ("+errs.length+")");
console.log(fail?`\n${fail} FAILED`:"\nALL PASS");process.exit(fail?1:0)})().catch(e=>{console.log("FAIL crashed:",e&&e.stack||e);process.exit(1)});
