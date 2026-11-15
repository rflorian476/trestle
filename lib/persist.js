// v34: is DATA_DIR on storage that survives a deploy / restart / idle spin-down?
// Reads /proc/self/mounts (Linux) and finds the mount that holds DATA_DIR. The root filesystem of a Render (or any
// container) service is rebuilt on every deploy, so DATA_DIR on "/" (or on tmpfs / overlay) is treated as NOT persistent.
// A separate disk (Render persistent disk at /data, a Fly volume, ...) shows up as its own mount and counts as persistent.
// On Render (RENDER is set), the app workdir (/opt/render/...) is rebuilt on every deploy even if it appears as its own
// ext4 mount, so only a mount outside that tree (typically /data) counts as persistent. SAWYER_PERSISTENT=1 / 0 overrides.
"use strict";
const fs=require("fs"),path=require("path");
const VOLATILE=/^(tmpfs|ramfs|overlay|overlayfs|aufs|devtmpfs|squashfs)$/i;
function unesc(s){return String(s).replace(/\\([0-7]{3})/g,(m,o)=>String.fromCharCode(parseInt(o,8)))}
function mountOf(dir,mountsText){let real=dir;try{real=fs.realpathSync(dir)}catch(e){real=path.resolve(dir)}
 let txt=mountsText;if(txt==null){try{txt=fs.readFileSync("/proc/self/mounts","utf8")}catch(e){return null}}
 let best=null;for(const line of String(txt).split("\n")){const f=line.split(" ");if(f.length<3)continue;const point=unesc(f[1]),type=f[2];
  const inside=point==="/"||real===point||real.startsWith(point.endsWith("/")?point:point+"/");if(inside&&(!best||point.length>=best.point.length))best={point,type}}
 return best}
function check(dir,env,mountsText){env=env||process.env;const forced=String(env.SAWYER_PERSISTENT||"").trim().toLowerCase();const m=mountOf(dir,mountsText);
 const base={mount:m?m.point:null,type:m?m.type:null};
 if(/^(1|true|yes)$/.test(forced))return Object.assign(base,{persistent:true,reason:"SAWYER_PERSISTENT=1"});
 if(/^(0|false|no)$/.test(forced))return Object.assign(base,{persistent:false,reason:"SAWYER_PERSISTENT=0"});
 if(!m)return Object.assign(base,{persistent:false,reason:"couldn't read the mount table"});
 if(m.point==="/")return Object.assign(base,{persistent:false,reason:"DATA_DIR is on the root filesystem (no disk attached)"});
 if(VOLATILE.test(m.type))return Object.assign(base,{persistent:false,reason:"DATA_DIR is on "+m.type+" (memory / image layer)"});
 if(env.RENDER&&(m.point==="/opt/render"||String(m.point).startsWith("/opt/render/")))return Object.assign(base,{persistent:false,reason:"DATA_DIR is on the Render app filesystem (not an attached disk)"});
 return Object.assign(base,{persistent:true,reason:"DATA_DIR is on its own "+m.type+" mount at "+m.point})}
// DATA_DIR must exist and be writable. A clear message instead of a stack trace when a disk isn't attached yet.
function ensureDir(dir){try{fs.mkdirSync(dir,{recursive:true});const t=path.join(dir,".write-test-"+process.pid);fs.writeFileSync(t,"ok");fs.unlinkSync(t);return null}
 catch(e){return`DATA_DIR=${dir} is not writable (${e.code||e.message}). On Render, attach the persistent disk with mount path ${dir} (README: "Keep data between deploys"), or unset DATA_DIR to use ./data.`}}
module.exports={check,mountOf,ensureDir};
