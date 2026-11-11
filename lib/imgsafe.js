// v16 (QA sweep-2 B5): upload hardening. The server already checks magic bytes and serves uploads with nosniff and a
// sandbox CSP. This goes further and walks the real structure of each JPEG / PNG / WebP:
//  - a file must be well formed all the way to its end marker (JPEG EOI, PNG IEND, the WebP RIFF length),
//  - HTML or script anywhere in it (in metadata, comments, text chunks, or bytes tacked on after the image) is refused,
//  - other bytes after the end marker are cut off (some phones append a motion clip; it's never shown, so it isn't kept),
//  - location data is removed: the GPS block of a JPEG's EXIF is blanked, and XMP / PNG eXIf / WebP EXIF+XMP are dropped,
//    so a homeowner's job photo never carries the house's coordinates. Camera orientation and the photo itself are kept.
// v17 (SW-043): declared pixel counts are read from the PNG IHDR, JPEG SOF and WebP (VP8X / VP8 / VP8L) headers
//  before the file is stored. Anything over 25 megapixels is refused (a tiny file can claim a 40000×40000 canvas).
// No dependencies. Returns {ok:true,buf,info} or {ok:false,error}.
"use strict";
const zlib=require("zlib");
// Long markers are checked across the whole file (compressed image data is effectively random, so a 5+ character
// tag can't turn up by chance). Short ones are only checked in metadata and trailing bytes, where text lives.
const MARK_ALL=/<(script|html|iframe|object|embed|\?php|!doctype)|javascript:/i;
const MARK_META=/<(script|html|iframe|object|embed|\?php|!doctype|svg|body|img|meta|link|form|base|style|a\s)|javascript:|\bon[a-z]{3,20}\s*=/i;
const BAD="That file isn't a valid image. Save it again from your camera or photos app and upload it.";
const HIDDEN="That image has web code hidden inside it, so it can't be uploaded. Save the photo again from your camera or photos app and upload that copy.";
const MAX_PX=25e6;
const BIG="That photo is too large to upload safely (over 25 megapixels). Resize it in your photos app and try again.";
const hasMarkup=(b,re)=>re.test(b.toString("latin1"));
function dimErr(w,h){if(!(w>0)||!(h>0)||!Number.isFinite(w)||!Number.isFinite(h))return BAD;if(w*h>MAX_PX)return BIG;return null}

function jpeg(b){
 if(b.length<4||b[0]!==0xff||b[1]!==0xd8)return{ok:false,error:BAD};
 const keep=[[0,2]],meta=[];let i=2,end=-1,sos=false,gps=false,xmp=false,w=0,h=0;
 while(i<b.length){
  if(b[i]!==0xff)return{ok:false,error:BAD};
  const s=i;while(i<b.length&&b[i]===0xff)i++;if(i>=b.length)return{ok:false,error:BAD};
  const m=b[i++];
  if(m===0xd9){end=i;keep.push([s,i]);break}
  if((m>=0xd0&&m<=0xd7)||m===0x01){keep.push([s,i]);continue}
  if(i+2>b.length)return{ok:false,error:BAD};
  const L=b.readUInt16BE(i);if(L<2||i+L>b.length)return{ok:false,error:BAD};
  const d0=i+2,d1=i+L;i=d1;
  if((m>=0xe0&&m<=0xef)||m===0xfe)meta.push([d0,d1]);
  if(m===0xe1&&b.toString("latin1",d0,d0+6)==="Exif\0\0"){if(blankGps(b,d0+6,d1))gps=true}
  if(m===0xe1&&b.toString("latin1",d0,d0+29)==="http://ns.adobe.com/xap/1.0/\0"){xmp=true;continue}// XMP can repeat GPS; drop it
  // SOF (not DHT 0xC4, JPEG-reserved 0xC8, or DAC 0xCC): height then width, 16-bit big-endian
  if((m>=0xc0&&m<=0xcf)&&m!==0xc4&&m!==0xc8&&m!==0xcc&&L>=7){h=b.readUInt16BE(d0+1);w=b.readUInt16BE(d0+3)}
  if(m===0xda){sos=true;// entropy-coded data runs until the next real marker
   while(i<b.length){if(b[i]!==0xff){i++;continue}const n=b[i+1];if(n===0x00||(n>=0xd0&&n<=0xd7)){i+=2;continue}if(n===0xff){i++;continue}break}
   keep.push([s,i]);continue}
  keep.push([s,d1])}
 if(end<0||!sos)return{ok:false,error:BAD};
 const de=dimErr(w,h);if(de)return{ok:false,error:de};
 const tail=b.subarray(end);
 for(const[a,z]of meta)if(hasMarkup(b.subarray(a,z),MARK_META))return{ok:false,error:HIDDEN};
 if(tail.length&&hasMarkup(tail,MARK_META))return{ok:false,error:HIDDEN};
 if(hasMarkup(b,MARK_ALL))return{ok:false,error:HIDDEN};
 return{ok:true,buf:Buffer.concat(keep.map(([a,z])=>b.subarray(a,z))),info:{gps,xmp,trailer:tail.length,width:w,height:h}}}

// Blank the GPS IFD inside a TIFF/EXIF block [t0,lim): zero every GPS value and set the entry count to 0.
const TSIZE={1:1,2:1,3:2,4:4,5:8,6:1,7:1,8:2,9:4,10:8,11:4,12:8};
function blankGps(b,t0,lim){try{
 const bo=b.toString("latin1",t0,t0+2);if(bo!=="II"&&bo!=="MM")return false;const le=bo==="II";
 const u16=o=>le?b.readUInt16LE(o):b.readUInt16BE(o),u32=o=>le?b.readUInt32LE(o):b.readUInt32BE(o);
 const ifd0=t0+u32(t0+4);if(ifd0+2>lim)return false;const n=u16(ifd0);let g=-1;
 for(let k=0;k<n;k++){const e=ifd0+2+k*12;if(e+12>lim)return false;if(u16(e)===0x8825){g=t0+u32(e+8);break}}
 if(g<0||g+2>lim)return false;const n2=u16(g);
 for(let k=0;k<n2;k++){const e=g+2+k*12;if(e+12>lim)break;const sz=(TSIZE[u16(e+2)]||1)*u32(e+4);
  if(sz>4){const o=t0+u32(e+8);if(o>=t0&&o+sz<=lim)b.fill(0,o,o+sz)}b.fill(0,e,e+12)}
 b.fill(0,g,g+2);return n2>0}catch(e){return false}}

function png(b){
 const SIG=Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);if(b.length<20||!b.subarray(0,8).equals(SIG))return{ok:false,error:BAD};
 const keep=[[0,8]];let i=8,end=-1,first=true,dropped=0,w=0,h=0;
 while(i+12<=b.length){const L=b.readUInt32BE(i),ty=b.toString("latin1",i+4,i+8);if(!/^[A-Za-z]{4}$/.test(ty)||L>b.length||i+12+L>b.length)return{ok:false,error:BAD};
  if(first&&ty!=="IHDR")return{ok:false,error:BAD};first=false;
  if(ty==="IHDR"){if(L<13)return{ok:false,error:BAD};w=b.readUInt32BE(i+8);h=b.readUInt32BE(i+12);const de=dimErr(w,h);if(de)return{ok:false,error:de}}
  if(typeof zlib.crc32==="function"&&(zlib.crc32(b.subarray(i+4,i+8+L))>>>0)!==b.readUInt32BE(i+8+L))return{ok:false,error:BAD};
  const z=i+12+L;
  if(/^(tEXt|zTXt|iTXt|eXIf)$/.test(ty)&&hasMarkup(b.subarray(i+8,i+8+L),MARK_META))return{ok:false,error:HIDDEN};
  if(ty==="eXIf"){dropped++}else keep.push([i,z]);
  i=z;if(ty==="IEND"){end=z;break}}
 if(end<0)return{ok:false,error:BAD};
 const tail=b.subarray(end);if(tail.length&&hasMarkup(tail,MARK_META))return{ok:false,error:HIDDEN};
 if(hasMarkup(b,MARK_ALL))return{ok:false,error:HIDDEN};
 return{ok:true,buf:Buffer.concat(keep.map(([a,z])=>b.subarray(a,z))),info:{gps:dropped>0,trailer:tail.length,width:w,height:h}}}

function webpDims(b,total){
 let w=0,h=0,src="";
 let i=12;while(i+8<=total){const ty=b.toString("latin1",i,i+4),L=b.readUInt32LE(i+4),p=i+8,z=p+L+(L&1);if(z>total)break;
  if(ty==="VP8X"&&L>=10){w=1+b[p+4]+(b[p+5]<<8)+(b[p+6]<<16);h=1+b[p+7]+(b[p+8]<<8)+(b[p+9]<<16);src="VP8X";break}
  if(ty==="VP8 "&&L>=10&&b[p+3]===0x9d&&b[p+4]===0x01&&b[p+5]===0x2a){w=b.readUInt16LE(p+6)&0x3fff;h=b.readUInt16LE(p+8)&0x3fff;src="VP8"}
  if(ty==="VP8L"&&L>=5&&b[p]===0x2f){const bits=b[p+1]|(b[p+2]<<8)|(b[p+3]<<16)|(b[p+4]<<24);w=(bits&0x3fff)+1;h=((bits>>14)&0x3fff)+1;src="VP8L"}
  i=z}
 return src?{w,h,src}:null}

function webp(b){
 if(b.length<20||b.toString("latin1",0,4)!=="RIFF"||b.toString("latin1",8,12)!=="WEBP")return{ok:false,error:BAD};
 const total=b.readUInt32LE(4)+8;if(total>b.length||total<20)return{ok:false,error:BAD};
 const d=webpDims(b,total);if(d){const de=dimErr(d.w,d.h);if(de)return{ok:false,error:de}}
 const parts=[];let i=12,dropped=0,img=false;
 while(i+8<=total){const ty=b.toString("latin1",i,i+4),L=b.readUInt32LE(i+4),z=i+8+L+(L&1);if(z>total)return{ok:false,error:BAD};
  if(/^VP8[ LX]$/.test(ty)||ty==="ANIM")img=true;
  if(ty==="EXIF"||ty==="XMP "){if(hasMarkup(b.subarray(i+8,i+8+L),MARK_META))return{ok:false,error:HIDDEN};dropped++}else parts.push(b.subarray(i,z));i=z}
 if(i!==total||!img)return{ok:false,error:BAD};
 const tail=b.subarray(total);if(tail.length&&hasMarkup(tail,MARK_META))return{ok:false,error:HIDDEN};
 if(hasMarkup(b.subarray(0,total),MARK_ALL))return{ok:false,error:HIDDEN};
 const body=Buffer.concat(parts);const out=Buffer.concat([Buffer.from("RIFF"),Buffer.alloc(4),Buffer.from("WEBP"),body]);out.writeUInt32LE(out.length-8,4);
 if(dropped){const x=out.indexOf("VP8X",12,"latin1");if(x===12)out[20]&=~0x0c}// clear the EXIF + XMP flags
 return{ok:true,buf:out,info:{gps:dropped>0,trailer:tail.length,width:d?d.w:0,height:d?d.h:0}}}

function check(type,buf){const b=Buffer.from(buf);// work on a copy: GPS blanking writes in place
 if(type==="image/jpeg")return jpeg(b);if(type==="image/png")return png(b);if(type==="image/webp")return webp(b);return{ok:false,error:"JPEG, PNG or WebP images only"}}
module.exports={check,HIDDEN,BAD,BIG,MAX_PX};
