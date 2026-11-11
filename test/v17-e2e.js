// v17: SW-043 (reject declared dimensions over 25 megapixels), SW-042 (pview IP/day dedupe),
// and SW-044 (keep WebP orientation). API checks; no browser required.
// usage: node test/v17-e2e.js http://localhost:8899 [shotdir]
const fs=require("fs"),path=require("path"),zlib=require("zlib");
const IMGSAFE=require("../lib/imgsafe.js");
const B=(process.argv[2]||"http://localhost:8899").replace(/\/$/,"");let fail=0;
const ok=(c,n,extra)=>{console.log((c?"PASS ":"FAIL ")+n+(c||extra===undefined?"":" :: "+String(extra).slice(0,300)));if(!c)fail++};
const PW="sawyer-demo-2026",run=Date.now().toString(36),FX=path.join(__dirname,"fixtures");
async function req(p,{method="GET",body,cookie,headers}={}){const h=Object.assign({},headers||{});if(body!==undefined&&!h["Content-Type"])h["Content-Type"]="application/json";if(cookie)h.Cookie=cookie;
 const r=await fetch(B+p,{method,headers:h,body:body===undefined?undefined:(Buffer.isBuffer(body)||typeof body==="string"?body:JSON.stringify(body)),redirect:"manual"});const buf=Buffer.from(await r.arrayBuffer());const t=buf.toString();let j=null;try{j=JSON.parse(t)}catch(e){}
 const sc=(r.headers.get("set-cookie")||"").match(/swsid=([^;]*)/);return{code:r.status,j,t,buf,headers:r.headers,cookie:sc&&sc[1]?"swsid="+sc[1]:null}}
const signup=(kind,data)=>req("/api/signup",{method:"POST",body:{kind,password:"v17-pass-"+run,data}});
const up=(cookie,type,buf)=>req("/api/upload",{method:"POST",cookie,headers:{"Content-Type":type},body:buf});
function pngChunk(type,data){const d=Buffer.isBuffer(data)?data:Buffer.from(data,"latin1"),h=Buffer.alloc(8);h.writeUInt32BE(d.length,0);h.write(type,4,"latin1");const c=Buffer.alloc(4);c.writeUInt32BE(zlib.crc32(Buffer.concat([h.subarray(4),d]))>>>0,0);return Buffer.concat([h,d,c])}
function pngIHDR(w,h){const sig=Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=2;return Buffer.concat([sig,pngChunk("IHDR",ihdr),pngChunk("IEND",Buffer.alloc(0))])}
function jpegSOF(w,h){const sof=Buffer.from([0xff,0xc0,0x00,0x0b,0x08,0,0,0,0,0x01,0x01,0x11,0x00]);sof.writeUInt16BE(h,5);sof.writeUInt16BE(w,7);
 return Buffer.concat([Buffer.from([0xff,0xd8]),sof,Buffer.from([0xff,0xda,0x00,0x08,0x01,0x01,0x00,0x00,0x3f,0x00,0x00]),Buffer.from([0xff,0xd9])])}
function webpCanvas(src,w,h){const b=Buffer.from(src);if(b.toString("latin1",12,16)!=="VP8X")throw new Error("fixture has no VP8X");
 b[24]=(w-1)&255;b[25]=((w-1)>>8)&255;b[26]=((w-1)>>16)&255;b[27]=(h-1)&255;b[28]=((h-1)>>8)&255;b[29]=((h-1)>>16)&255;return b}
function webpVP8(src,w,h){const b=Buffer.from(src);let i=12,total=b.readUInt32LE(4)+8;
 while(i+8<=total){const ty=b.toString("latin1",i,i+4),L=b.readUInt32LE(i+4),p=i+8,z=p+L+(L&1);
  if(ty==="VP8 "&&L>=10&&b[p+3]===0x9d&&b[p+4]===0x01&&b[p+5]===0x2a){b.writeUInt16LE((w&0x3fff)|(b.readUInt16LE(p+6)&0xc000),p+6);b.writeUInt16LE((h&0x3fff)|(b.readUInt16LE(p+8)&0xc000),p+8);
   // drop VP8X so the VP8 header is what we read
   if(b.toString("latin1",12,16)==="VP8X"){const Lx=b.readUInt32LE(16),zx=20+Lx+(Lx&1);const out=Buffer.concat([b.subarray(0,12),b.subarray(zx)]);out.writeUInt32LE(out.length-8,4);return out}
   return b}
  i=z}throw new Error("no VP8 frame")}
(async()=>{
 const jpg=fs.readFileSync(path.join(FX,"v16-gps.jpg")),png=fs.readFileSync(path.join(FX,"v16-plain.png")),webp=fs.readFileSync(path.join(FX,"v16-exif.webp"));
// ===================== SW-043: reject declared dimensions over 25 megapixels =====================
{const bombP=pngIHDR(40000,40000),okP=pngIHDR(16,16),edgeP=pngIHDR(5000,5000),overP=pngIHDR(5001,5000);
 const rBomb=IMGSAFE.check("image/png",bombP);ok(rBomb.ok===false&&rBomb.error===IMGSAFE.BIG,"unit: PNG IHDR 40000×40000 is refused with the friendly size message",rBomb.error);
 const rOk=IMGSAFE.check("image/png",okP);ok(rOk.ok===true&&rOk.info.width===16&&rOk.info.height===16,"unit: a tiny PNG still passes");
 const rEdge=IMGSAFE.check("image/png",edgeP);ok(rEdge.ok===true&&rEdge.info.width===5000&&rEdge.info.height===5000,"unit: 5000×5000 (exactly 25 MP) is allowed");
 const rOver=IMGSAFE.check("image/png",overP);ok(rOver.ok===false&&rOver.error===IMGSAFE.BIG,"unit: 5001×5000 (just over 25 MP) is refused");
 const rJ=IMGSAFE.check("image/jpeg",jpegSOF(40000,40000));ok(rJ.ok===false&&rJ.error===IMGSAFE.BIG,"unit: JPEG SOF 40000×40000 is refused",rJ.error);
 const rJok=IMGSAFE.check("image/jpeg",jpegSOF(64,48));ok(rJok.ok===true&&rJok.info.width===64&&rJok.info.height===48,"unit: a small JPEG SOF still passes");
 const rW=IMGSAFE.check("image/webp",webpCanvas(webp,40000,40000));ok(rW.ok===false&&rW.error===IMGSAFE.BIG,"unit: WebP VP8X canvas 40000×40000 is refused",rW.error);
 const rWok=IMGSAFE.check("image/webp",webp);ok(rWok.ok===true&&rWok.info.width>0&&rWok.info.width*rWok.info.height<=IMGSAFE.MAX_PX,"unit: the real WebP fixture still passes ("+rWok.info.width+"×"+rWok.info.height+")");
 const rVP8=IMGSAFE.check("image/webp",webpVP8(webp,5001,5000));ok(rVP8.ok===false&&rVP8.error===IMGSAFE.BIG,"unit: WebP VP8 frame header 5001×5000 (no VP8X) is refused",rVP8.error);
 const realJpg=IMGSAFE.check("image/jpeg",jpg),realPng=IMGSAFE.check("image/png",png);
 ok(realJpg.ok&&realPng.ok,"unit: existing camera JPEG and PNG fixtures still pass");
 ok(/25 megapixels/.test(IMGSAFE.BIG)&&/Resize it/.test(IMGSAFE.BIG),"the size error is something a person can act on: "+IMGSAFE.BIG);
 const S=await signup("pro",{name:"Pix Limit",email:"v17-px-"+run+"@sawyer.test",biz:"Pix Limit Electric",trade:"Electrical",zip:"78704",phone:"5125550177"});
 const ck=S.cookie;ok(S.code===200&&ck,"throwaway pro signed up for the size-limit upload checks",S.code);
 const uBomb=await up(ck,"image/png",bombP);ok(uBomb.code===415&&uBomb.j&&uBomb.j.error===IMGSAFE.BIG&&!uBomb.j.url,"upload: 40000×40000 PNG is not stored (HTTP 415, friendly message)",uBomb.t);
 const uJ=await up(ck,"image/jpeg",jpegSOF(40000,40000));ok(uJ.code===415&&/25 megapixels/.test(uJ.j&&uJ.j.error||""),"upload: 40000×40000 JPEG is not stored",uJ.t);
 const uW=await up(ck,"image/webp",webpCanvas(webp,40000,40000));ok(uW.code===415&&/25 megapixels/.test(uW.j&&uW.j.error||""),"upload: 40000×40000 WebP is not stored",uW.t);
 const uOk=await up(ck,"image/png",png);ok(uOk.code===200&&uOk.j&&uOk.j.url,"upload: a normal PNG still stores",uOk.t);
 const uTiny=await up(ck,"image/png",okP);ok(uTiny.code===200&&uTiny.j&&uTiny.j.url,"upload: a 16×16 PNG still stores",uTiny.t);
}
// ===================== SW-042: signed-out /api/pview dedupes per IP and pro per day, not User-Agent =====================
{const P=await signup("pro",{name:"Ira Views",email:"v17-pv-"+run+"@sawyer.test",biz:"Ira Views Roofing",trade:"Roofing",zip:"78704",phone:"5125550178"});
 const pid=P.j&&P.j.state&&P.j.state.me;ok(pid,"throwaway pro for view-count checks",P.code);
 const C=await signup("customer",{name:"Pat Viewer",email:"v17-pv-cu-"+run+"@sawyer.test",zip:"78704"});
 const ua=s=>({method:"POST",body:{pid},headers:{"User-Agent":s}});
 const a=await req("/api/pview",ua("Mozilla/5.0 (Windows NT 10.0; rv:128.0) Gecko/20100101 Firefox/128.0"));
 ok(a.code===200&&a.j&&a.j.counted===true,"first signed-out view from this IP counts",a.t);
 const b=await req("/api/pview",ua("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148"));
 ok(b.code===200&&b.j&&b.j.counted===false,"the same IP with a different User-Agent does not count again",b.t);
 const c=await req("/api/pview",ua("Mozilla/5.0 (Windows NT 10.0; rv:128.0) Gecko/20100101 Firefox/128.0"));
 ok(c.code===200&&c.j&&c.j.counted===false,"a repeat with the original User-Agent still does not count",c.t);
 const Q=await signup("pro",{name:"Other Pro",email:"v17-pv2-"+run+"@sawyer.test",biz:"Other Pro HVAC",trade:"HVAC",zip:"78704",phone:"5125550179"});
 const pid2=Q.j&&Q.j.state&&Q.j.state.me;
 const d=await req("/api/pview",{method:"POST",body:{pid:pid2},headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; rv:128.0) Gecko/20100101 Firefox/128.0"}});
 ok(d.code===200&&d.j&&d.j.counted===true,"the same IP can still count a view of a different pro",d.t);
 const e=await req("/api/pview",{method:"POST",body:{pid},cookie:C.cookie,headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; rv:128.0) Gecko/20100101 Firefox/128.0"}});
 ok(e.code===200&&e.j&&e.j.counted===true,"a signed-in customer from the same IP still counts once as themselves",e.t);
 const e2=await req("/api/pview",{method:"POST",body:{pid},cookie:C.cookie,headers:{"User-Agent":"Mozilla/5.0 totally-different"}});
 ok(e2.code===200&&e2.j&&e2.j.counted===false,"that signed-in customer does not count twice by changing User-Agent",e2.t);
 const st=(await req("/api/state",{cookie:P.cookie})).j.state.users.find(u=>u.id===pid);const tot=Object.values(st&&st.pv16||{}).reduce((a,n)=>a+n,0);
 ok(tot===2,"the pro sees 2 views (one signed-out IP, one signed-in customer), not one per User-Agent ("+tot+")");
}
function webpChunks(b){const o=[];const total=b.readUInt32LE(4)+8;let i=12;while(i+8<=total){const ty=b.toString("latin1",i,i+4),L=b.readUInt32LE(i+4);o.push({ty,L,i,data:b.subarray(i+8,i+8+L)});i=i+8+L+(L&1)}return o}
function webpExif(b){const ex=(webpChunks(b).find(c=>c.ty==="EXIF")||{}).data;if(!ex)return null;let t0=0;if(ex.toString("latin1",0,6)==="Exif\0\0")t0=6;
 const le=ex.toString("latin1",t0,t0+2)==="II";const u16=o=>le?ex.readUInt16LE(o):ex.readUInt16BE(o),u32=o=>le?ex.readUInt32LE(o):ex.readUInt32BE(o);
 const ifd=t0+u32(t0+4),n=u16(ifd);const r={orientation:null,gpsCount:-1,camera:ex.indexOf("TestCam")>=0,n};
 for(let k=0;k<n;k++){const e=ifd+2+k*12;const tag=u16(e),typ=u16(e+2),cnt=u32(e+4),val=u32(e+8);
  if(tag===0x0112)r.orientation=typ===3&&cnt===1?(le?val&0xffff:val>>>16):val;if(tag===0x8825){const g=t0+val;if(g+2<=ex.length)r.gpsCount=u16(g)}}
 return r}
function webpSetOri(src,ori){const b=Buffer.from(src);const ch=webpChunks(b).find(c=>c.ty==="EXIF");if(!ch)throw new Error("no EXIF");
 let t0=ch.i+8;if(b.toString("latin1",t0,t0+6)==="Exif\0\0")t0+=6;const le=b.toString("latin1",t0,t0+2)==="II";
 const u16=o=>le?b.readUInt16LE(o):b.readUInt16BE(o),u32=o=>le?b.readUInt32LE(o):b.readUInt32BE(o);
 const ifd=t0+u32(t0+4),n=u16(ifd);
 for(let k=0;k<n;k++){const e=ifd+2+k*12;if(u16(e)===0x0112){if(le)b.writeUInt16LE(ori,e+8);else b.writeUInt16BE(ori,e+8);return b}}
 throw new Error("no orientation tag")}
// ===================== SW-044: WebP EXIF keeps orientation and camera tags; GPS is blanked; XMP is dropped =====================
{const src=fs.readFileSync(path.join(FX,"v16-exif.webp"));
 const before=webpExif(src);ok(before&&before.orientation===1&&before.camera&&before.gpsCount>0,"fixture WebP carries orientation, camera name and GPS ("+JSON.stringify(before)+")");
 const unit=IMGSAFE.check("image/webp",src);ok(unit.ok,"unit: WebP with EXIF still passes");
 const after=webpExif(unit.buf);ok(after&&after.orientation===1&&after.camera,"unit: orientation and camera name are kept",JSON.stringify(after));
 ok(after&&after.gpsCount===0,"unit: GPS IFD is blanked (count "+(after&&after.gpsCount)+")");
 ok(unit.info&&unit.info.gps===true,"unit: info.gps notes that location was removed");
 const rot=webpSetOri(src,6);const r6=IMGSAFE.check("image/webp",rot);ok(r6.ok&&webpExif(r6.buf)&&webpExif(r6.buf).orientation===6,"unit: orientation 6 (rotate 90) is kept, not dropped");
 // XMP chunk should be removed, EXIF kept, VP8X XMP flag cleared
 const total=src.readUInt32LE(4)+8;const xmp=Buffer.alloc(8+32);xmp.write("XMP ",0);xmp.writeUInt32LE(32,4);xmp.write("http://ns.adobe.com/xap/1.0/ pad-pad-pad",8);
 const withX=Buffer.concat([src.subarray(0,total),xmp]);withX.writeUInt32LE(withX.length-8,4);withX[20]|=0x0c;
 const rx=IMGSAFE.check("image/webp",withX);ok(rx.ok&&!webpChunks(rx.buf).some(c=>c.ty==="XMP ")&&webpChunks(rx.buf).some(c=>c.ty==="EXIF"),"unit: XMP is dropped and EXIF is kept");
 ok((rx.buf[20]&0x04)===0&&(rx.buf[20]&0x08)===0x08,"unit: VP8X keeps the EXIF flag and clears the XMP flag (flags="+rx.buf[20]+")");
 ok(webpExif(rx.buf)&&webpExif(rx.buf).orientation===1&&webpExif(rx.buf).camera,"unit: orientation and camera survive XMP removal");
 const S=await signup("pro",{name:"Ori Webp",email:"v17-webp-"+run+"@sawyer.test",biz:"Ori Webp Electric",trade:"Electrical",zip:"78704",phone:"5125550180"});
 const ck=S.cookie;ok(S.code===200&&ck,"throwaway pro signed up for WebP EXIF upload checks",S.code);
 const u=await up(ck,"image/webp",src);ok(u.code===200&&u.j&&u.j.url,"upload: WebP with EXIF stores",u.t);
 if(u.j&&u.j.url){const g=await req(u.j.url);const got=webpExif(g.buf);
  ok(g.code===200&&got&&got.orientation===1&&got.camera,"stored WebP still has orientation and the camera name",JSON.stringify(got));
  ok(got&&got.gpsCount===0,"stored WebP has no GPS tags left");
  ok(webpChunks(g.buf).some(c=>c.ty==="EXIF"),"stored WebP still has an EXIF chunk (not dropped wholesale)")}
 const u6=await up(ck,"image/webp",rot);ok(u6.code===200&&u6.j&&u6.j.url,"upload: WebP with orientation 6 stores");
 if(u6.j&&u6.j.url){const g=await req(u6.j.url);ok(webpExif(g.buf)&&webpExif(g.buf).orientation===6,"stored WebP keeps orientation 6")}
}
if(fail){console.log(fail+" FAIL");process.exit(1)}else console.log("ZERO failures");
})().catch(e=>{console.error(e);process.exit(1)});
