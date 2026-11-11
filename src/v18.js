/* ===== v18 layer ===== */
/* SW-036 follow-through: the same field limits the server enforces (lib/limits.js), applied in the browser so people see
   them while typing. A field gets a maxlength the first time it's focused (if it has none), and a quiet counter appears
   once it's 80% full. Free-text boxes without a known name get the message limit (2,000). */
const V18LIM={name:80,biz:80,company:80,first:40,last:40,title:120,headline:120,tagline:120,trade:60,phone:30,zip:10,email:254,city:80,loc:80,license:120,insurance:160,rate:40,budget:60,cap:120,bio:1500,about:1500,desc:2000,description:2000,note:1000,notes:2000,reason:1000,text:2000,body:2000,msg:2000};
function v18Max(el){if(el.maxLength>0)return el.maxLength;const n=String(el.name||"").toLowerCase();if(Object.prototype.hasOwnProperty.call(V18LIM,n))return V18LIM[n];return el.tagName==="TEXTAREA"?2000:0}
function v18Count(el){const max=el.maxLength;if(!(max>0))return;let c=el.nextElementSibling&&el.nextElementSibling.classList&&el.nextElementSibling.classList.contains("v18-cnt")?el.nextElementSibling:null;
 const n=el.value.length,show=n>=Math.floor(max*.8);if(!show){if(c)c.hidden=true;return}
 if(!c){c=document.createElement("small");c.className="v18-cnt";c.setAttribute("aria-live","polite");el.insertAdjacentElement("afterend",c)}
 c.hidden=false;c.textContent=(max-n).toLocaleString("en-US")+" characters left";c.classList.toggle("v18-full",n>=max)}
if(typeof document!=="undefined"&&document.addEventListener&&typeof window!=="undefined"&&!window.__v18lim){window.__v18lim=1;
 const ok=el=>el&&(el.tagName==="TEXTAREA"||(el.tagName==="INPUT"&&/^(text|search|email|tel|url|)$/.test(el.type||"")));
 document.addEventListener("focusin",e=>{const el=e.target;if(!ok(el)||el.maxLength>0)return;const m=v18Max(el);if(m>0)el.maxLength=m});
 document.addEventListener("input",e=>{const el=e.target;if(ok(el)&&el.maxLength>0)v18Count(el)})}
