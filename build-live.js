// Builds live/public/index.html (client, API-backed) and live/app-logic.js (shared business rules for the server)
const fs=require("fs"),path=require("path");
const SRC=process.env.ULTIMATE_HTML||path.join(__dirname,"../ultimate/index.html");
if(!fs.existsSync(SRC)){console.log("build-live: "+SRC+" not found; using committed public/index.html + app-logic.js");process.exit(0)}
const src=fs.readFileSync(SRC,"utf8");
const a=src.indexOf("<script>"),b=src.lastIndexOf("</script>");
let js=src.slice(a+8,b);
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
c+="\n"+fs.readFileSync(path.join(__dirname,"client-post.js"),"utf8");
let html=src.slice(0,a+8)+c+src.slice(b);
html=rep(html,'<body><a class="skip" href="#app">Skip to content</a>','<body><div class="betabar" role="status">Beta test, don\'t post sensitive info.</div><a class="skip" href="#app">Skip to content</a>');
html=rep(html,"</style></head>",`.betabar{background:#ffd84d;color:#111;text-align:center;font:600 13px/1.3 system-ui,sans-serif;padding:7px 12px}
.testmode{margin-top:14px;padding:12px 14px;border-radius:12px;border:2px dashed #c58a00;background:#fff6d6;color:#3d2b00;font-size:14px}
.liveauth .fld{margin-bottom:10px}.livelogin{margin-top:18px}
#resetBtn,.demo,[data-login]{display:none!important}
</style></head>`);
fs.writeFileSync(path.join(__dirname,"public/index.html"),html);
console.log("built",html.length);
