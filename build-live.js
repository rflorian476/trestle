// Builds live/public/index.html (client, API-backed) and live/app-logic.js (shared business rules for the server)
const fs=require("fs"),path=require("path");
const SRC=process.env.ULTIMATE_HTML||path.join(__dirname,"src/app.html");
if(!fs.existsSync(SRC)){console.log("build-live: "+SRC+" not found; using committed public/index.html + app-logic.js");process.exit(0)}
const BRAND=require("./brand.json");
// Brand tokens: change brand.json to rename the product (one line).
const T=s=>s.split("__BRAND_LC__").join(BRAND.name.toLowerCase()).split("__BRAND__").join(BRAND.name).split("__TAGLINE__").join(BRAND.tagline);
const src=T(fs.readFileSync(SRC,"utf8"));
const a=src.indexOf("<script>"),b=src.lastIndexOf("</script>");
let js=src.slice(a+8,b);
const V2JS=T(fs.readFileSync(path.join(__dirname,"src/v2.js"),"utf8")+"\n"+fs.readFileSync(path.join(__dirname,"src/v3.js"),"utf8")+"\n"+fs.readFileSync(path.join(__dirname,"src/v4.js"),"utf8")+"\n"+fs.readFileSync(path.join(__dirname,"src/v5.js"),"utf8")+"\n"+fs.readFileSync(path.join(__dirname,"src/v6.js"),"utf8")+"\n"+fs.readFileSync(path.join(__dirname,"src/v7.js"),"utf8")+"\n"+fs.readFileSync(path.join(__dirname,"src/v8.js"),"utf8")+"\n"+fs.readFileSync(path.join(__dirname,"src/v9.js"),"utf8")+"\n"+fs.readFileSync(path.join(__dirname,"src/v10.js"),"utf8"));
if(!js.includes("\nboot();"))throw new Error("boot anchor missing");
js=js.replace("\nboot();","\n"+V2JS+"\nboot();");
fs.writeFileSync(path.join(__dirname,"app-logic.js"),js+"\n;globalThis.__api={get DB(){return DB},set DB(v){DB=v},A,seed,KEY};\n");
function rep(s,from,to){if(!s.includes(from))throw new Error("patch anchor missing: "+from.slice(0,60));return s.split(from).join(to)}
let c=js;
c=rep(c,"try{DB=JSON.parse(localStorage.getItem(KEY))}catch(e){DB=null}\nif(!DB||!DB.users||DB.v!==1)seed();","DB=__liveLoad();");
c=rep(c,"function save(){try{localStorage.setItem(KEY,JSON.stringify(DB))}catch(e){}}",fs.readFileSync(path.join(__dirname,"client-pre.js"),"utf8"));
c=rep(c,'<p class="muted small">Demo only: no card is charged. In production this step opens a secure Stripe checkout.</p>','<div class="testmode" role="note"><b>Test mode, no real charge.</b> This beta never asks for or stores a card number. Picking a plan here is simulated.</div>');
c=rep(c,'${F("phone","Phone",OB.phone,"tel","(231) 555-0100","tel")}</div>','${F("phone","Phone",OB.phone,"tel","(231) 555-0100","tel")}</div>${F("password","Password (8+ characters)",OB.password||"","password","","new-password")}');
c=rep(c,'<div class="fld"><label for="cu-z">','<div class="fld"><label for="cu-p">Password (8+ characters)</label><input id="cu-p" name="password" type="password" autocomplete="new-password" minlength="8" required></div><div class="fld"><label for="cu-z">');
c=rep(c,'<div class="fld"><label for="pms-z"','<div class="fld"><label for="pms-p">Password (8+ characters)</label><input id="pms-p" name="password" type="password" autocomplete="new-password" minlength="8"></div><div class="fld"><label for="pms-z"');
c=rep(c,'<button class="linkbtn" id="resetBtn">Reset demo data</button>','');
c=rep(c,'Demo prototype. Every business, person, license and review here is fictional.','Beta test. Listings marked (demo) are fictional sample data; everything else was posted by real beta users.');
// v9 perf: run the live-mode patches before boot so the page renders once instead of twice
{const post=fs.readFileSync(path.join(__dirname,"client-post.js"),"utf8");const tail="try{render()}catch(e){}\n})();";if(!post.trimEnd().endsWith(tail.trim()))throw new Error("client-post tail changed");
 const pre=post.trimEnd().slice(0,-tail.trim().length)+"})();";if(!c.includes("\nboot();"))throw new Error("boot anchor missing (client)");c=c.replace("\nboot();","\n"+pre+"\nboot();")}
// v9 perf: split boot into its own script so the parser can yield between compile/eval and first render (shorter long tasks on mobile)
if(!c.includes("\nboot();"))throw new Error("boot anchor missing (client)");
c=c.replace("\nboot();","\n</script><script>\"use strict\";\nboot();");
let html=src.slice(0,a+8)+c+src.slice(b);
html=rep(html,'<body><a class="skip" href="#app">Skip to content</a>','<body><div class="betabar" role="status">'+BRAND.name+' beta · test mode · don\'t post sensitive info</div><a class="skip" href="#app">Skip to content</a>');
html=rep(html,"</style></head>",`.betabar{text-align:center;padding:7px 12px}
.testmode{margin-top:14px;padding:12px 14px;border-radius:12px;font-size:14px}
.liveauth .fld{margin-bottom:10px}.livelogin{margin-top:18px}
#resetBtn,.demo,[data-login]{display:none!important}
`+T(fs.readFileSync(path.join(__dirname,"src/v2.css"),"utf8")+"\n"+fs.readFileSync(path.join(__dirname,"src/v3.css"),"utf8")+"\n"+fs.readFileSync(path.join(__dirname,"src/v4.css"),"utf8")+"\n"+fs.readFileSync(path.join(__dirname,"src/v5.css"),"utf8")+"\n"+fs.readFileSync(path.join(__dirname,"src/v6.css"),"utf8")+"\n"+fs.readFileSync(path.join(__dirname,"src/v7.css"),"utf8")+"\n"+fs.readFileSync(path.join(__dirname,"src/v8.css"),"utf8")+"\n"+fs.readFileSync(path.join(__dirname,"src/v9.css"),"utf8")+"\n"+fs.readFileSync(path.join(__dirname,"src/v10.css"),"utf8"))+`
</style></head>`);
// v10 perf: fonts move out of the CSS into cacheable woff2 files (CSS no longer carries ~128KB of base64),
// the unused serif face is dropped, and legacy CSS rules no markup uses are removed.
{const s0=html.indexOf("<style>")+7,e0=html.indexOf("</style></head>");let css=html.slice(s0,e0);const rest=html.slice(0,s0-7)+html.slice(e0+8);
 fs.mkdirSync(path.join(__dirname,"public/fonts"),{recursive:true});const pre=[];
 css=css.replace(/@font-face\{([^}]*)\}/g,(m,b)=>{const fam=(b.match(/font-family:"([^"]+)"/)||[])[1]||"f";if(/Fraunces/.test(fam))return "";
  const wt=((b.match(/font-weight:([^;]+)/)||[])[1]||"400").trim().replace(/\s+/g,"-");const d=b.match(/url\(data:font\/woff2;base64,([^)]+)\)/);if(!d)return m;
  const name=fam.toLowerCase().replace(/[^a-z0-9]+/g,"-")+"-"+wt+".woff2";fs.writeFileSync(path.join(__dirname,"public/fonts",name),Buffer.from(d[1],"base64"));
  if(/Jakarta/.test(fam)&&(wt==="400"||wt==="800"))pre.push(name);return "@font-face{"+b.replace(d[0],'url(/fonts/'+name+') format("woff2")').replace(/src:url\(\/fonts[^;]*format\("woff2"\)\)/,s=>s)+"}"});
 css=css.split('--font-d:"Fraunces S",Georgia,"Times New Roman",serif').join('--font-d:"Jakarta E",ui-sans-serif,system-ui,sans-serif');
 const r=require("./lib/slim-css.js")(css,rest);const before=css.length;css=r.css;
 console.log("css",before,"->",css.length,"rules dropped",r.stats.dropped,"selectors trimmed",r.stats.trimmed);
 const links=pre.map(n=>'<link rel="preload" href="/fonts/'+n+'" as="font" type="font/woff2" crossorigin>').join("");
 html=html.slice(0,s0-7)+links+"<style>"+css+html.slice(e0)}
fs.writeFileSync(path.join(__dirname,"public/index.html"),html);
console.log("built",html.length);
