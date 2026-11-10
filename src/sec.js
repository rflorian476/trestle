/* ===== hotfix-sec layer (QA sweep 1) ===== */
/* SW-003: no inline event handlers (the Content-Security-Policy blocks them). Buttons carry data-csp + data-arg instead. */
if(typeof document!=="undefined"&&document.addEventListener&&typeof window!=="undefined"&&!window.__secCsp){window.__secCsp=1;
 const CSP_FN={shareLink:a=>shareLink(a),contactPro:a=>contactPro(a),messagePro:a=>messagePro(a),toggleFav:(a,el)=>toggleFav(a,el),uShareApp:()=>uShareApp()};
 document.addEventListener("click",e=>{const b=e.target&&e.target.closest&&e.target.closest("[data-csp]");if(!b)return;const f=CSP_FN[b.dataset.csp];if(!f)return;e.preventDefault();try{f(b.dataset.arg,b)}catch(x){console.warn(x)}});
 document.addEventListener("submit",e=>{const f=e.target;if(!f||!f.matches||!f.matches("form[data-reply]"))return;e.preventDefault();act(A.reply(f.dataset.reply,(f.t&&f.t.value)||""))})}
/* SW-007: typed or shared pretty URLs (/prices, /find?cat=Roofing, /job/j12) open the same view as the #/ route */
if(typeof location!=="undefined"&&typeof history!=="undefined"&&typeof window!=="undefined"&&window.addEventListener){try{const pn=location.pathname;if(pn&&pn!=="/"&&pn!=="/index.html"&&!/^\/[pt]\/[\w-]+$/.test(pn)&&(!location.hash||location.hash.length<3)&&/^\/[a-z0-9]+(\/[\w.-]+)?\/?$/.test(pn))history.replaceState(null,"","/#"+pn.replace(/\/$/,"")+location.search)}catch(x){}}
