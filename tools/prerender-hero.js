// Dev-only (needs Playwright via NODE_PATH): captures the signed-out home hero so the server can send it
// inside <main> for "/" — the hero photo + headline paint before the app JS finishes (better mobile LCP).
// Also saves the signed-out site header (public/pre-top.html) so the hero does not shift when the app mounts.
// Usage: node tools/prerender-hero.js http://localhost:8899   -> writes public/pre-home.html
const {chromium}=require("playwright"),fs=require("fs"),path=require("path");
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:412,height:860}});
 await p.goto((process.argv[2]||"http://localhost:8899")+"/");await p.waitForSelector("section.v4hero");
 let h=await p.$eval("section.v4hero",e=>e.outerHTML);const top=await p.$eval("#top",e=>e.outerHTML);await b.close();
 fs.writeFileSync(path.join(__dirname,"../public/pre-top.html"),top);
 h=h.replace(/\s(data-[a-z0-9-]+)="[^"]*"/g,(m,k)=>/^data-(href|go)$/.test(k)?m:"");
 fs.writeFileSync(path.join(__dirname,"../public/pre-home.html"),h);console.log("pre-home.html",h.length)})();
