/* ===== v39 ===== */
function v39Now(){return typeof __now==="function"?__now():Date.now()}
/* (1) QA v38 idea 4: every US ZIP can be typed. The Account form and the sign-up forms (homeowner / business, project
   manager, pro onboarding) used a 45-city <select>, so a customer in an unlisted ZIP could not correct it in the UI even
   though signup / updateMe store any well-formed ZIP (SW-091 / SW-093). Now a 5-digit text field (inputmode numeric,
   pattern [0-9]{5}, the server's rule: exactly five digits after trimming) with a live hint: the town when Sawyer knows the
   ZIP, otherwise the state from the 3-digit prefix, and the Automatic time zone from the prefix (v38ZipTz). A malformed ZIP
   gets an inline error and the form doesn't submit. signupPro and signupPM apply the same rule on the server (signupPM no
   longer remaps unknown ZIPs to 78704; signupPro no longer stores whatever string it was sent). */
const V39_ZIP=/^\d{5}$/;
function v39ZipOk(z){return V39_ZIP.test(String(z==null?"":z).trim())}
const V39_ST={AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",CT:"Connecticut",DE:"Delaware",DC:"Washington, DC",FL:"Florida",GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",OR:"Oregon",PA:"Pennsylvania",PR:"Puerto Rico",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",VI:"U.S. Virgin Islands",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",GU:"Guam",AA:"Military (AA)",AE:"Military (AE)",AP:"Military (AP)"};
/* 3-digit ZIP prefix -> state (USPS sectional centers; the main state where a prefix is shared) */
const V39_ZR=[[5,5,"NY"],[6,7,"PR"],[8,8,"VI"],[9,9,"PR"],[10,27,"MA"],[28,29,"RI"],[30,38,"NH"],[39,49,"ME"],[50,59,"VT"],[60,69,"CT"],[70,89,"NJ"],[90,99,"AE"],[100,149,"NY"],[150,196,"PA"],[197,199,"DE"],[200,200,"DC"],[201,201,"VA"],[202,205,"DC"],[206,219,"MD"],[220,246,"VA"],[247,268,"WV"],[270,289,"NC"],[290,299,"SC"],[300,319,"GA"],[320,339,"FL"],[340,340,"AA"],[341,349,"FL"],[350,369,"AL"],[370,385,"TN"],[386,397,"MS"],[398,399,"GA"],[400,427,"KY"],[430,459,"OH"],[460,479,"IN"],[480,499,"MI"],[500,528,"IA"],[530,549,"WI"],[550,567,"MN"],[569,569,"DC"],[570,577,"SD"],[580,588,"ND"],[590,599,"MT"],[600,629,"IL"],[630,658,"MO"],[660,679,"KS"],[680,693,"NE"],[700,714,"LA"],[716,729,"AR"],[730,749,"OK"],[750,799,"TX"],[800,816,"CO"],[820,831,"WY"],[832,838,"ID"],[840,847,"UT"],[850,865,"AZ"],[870,884,"NM"],[885,885,"TX"],[889,898,"NV"],[900,961,"CA"],[962,966,"AP"],[967,968,"HI"],[969,969,"GU"],[970,979,"OR"],[980,994,"WA"],[995,999,"AK"]];
function v39ZipState(z){z=String(z||"").trim();if(!V39_ZIP.test(z))return"";const p=+z.slice(0,3);for(const r of V39_ZR)if(p>=r[0]&&p<=r[1])return r[2];return""}
function v39ZipPlace(z){z=String(z||"").trim();if(!V39_ZIP.test(z))return"";if(typeof ZIPS!=="undefined"&&ZIPS[z])return ZIPS[z][0];const st=v39ZipState(z);return st?(V39_ST[st]||st):""}
function v39ZipHint(z,u){z=String(z||"").trim();if(!V39_ZIP.test(z))return"5 digits, like 49660. It finds pros near you and sets your time zone.";
 const pl=v39ZipPlace(z),tz=v38ZipTz(z),auto=`Automatic time zone: ${v38Name(tz)} (${v38Abbr(tz)})`;
 const pick=u&&u.tz38&&v38TzOk(u.tz38)&&u.tz38!==tz?` · you picked ${v38Name(u.tz38)} (${v38Abbr(u.tz38)})`:"";
 return(pl?pl+" · ":"ZIP "+z+" · ")+auto+pick}
const V39_ZMSG="Enter a 5-digit ZIP, like 49660.";
function v39ZipField(id,val,label,u,req){const v=String(val||"");
 return`<label for="${id}">${esc(label)}</label><input id="${id}" name="zip" class="v39zip" type="text" inputmode="numeric" pattern="[0-9]{5}" minlength="5" maxlength="5" autocomplete="postal-code" placeholder="49660" ${req===false?"":"required"} value="${esc(v39ZipOk(v)?v.trim():"")}" aria-describedby="${id}-h ${id}-e"><p class="v39zh small muted" id="${id}-h" aria-live="polite">${esc(v39ZipHint(v,u))}</p><p class="v39ze" id="${id}-e" role="alert" hidden></p>`}
const V39_ZIDS={"ac-z":"ZIP code","cu-z":"ZIP code","pms-z":"ZIP code (where you're based)","ob-zip":"ZIP code (where you're based)"};
function v39ZipSwap(h,vals,u){return String(h).replace(/<label for="(ac-z|cu-z|pms-z|ob-zip)">[^<]*<\/label><select id="\1" name="zip">[\s\S]*?<\/select>/g,(x,id)=>v39ZipField(id,vals&&vals[id]!=null?vals[id]:"",V39_ZIDS[id],u))}
{const os=A.signupPM;if(os)A.signupPM=function(o){o=o||{};const z=String(o.zip||"").trim();if(!V39_ZIP.test(z))return{ok:false,msg:V39_ZMSG};const r=os.apply(this,arguments);try{if(r&&r.ok){const u=me();if(u&&u.role==="pm"){u.zip=z;save()}}}catch(e){}return r}}
{const os=A.signupPro;if(os)A.signupPro=function(o){o=o||{};const z=String(o.zip||"").trim();if(!V39_ZIP.test(z))return{ok:false,msg:V39_ZMSG};o.zip=z;return os.apply(this,arguments)}}
if(typeof document!=="undefined"){
 function v39ZipErr(i,msg){const e=document.getElementById(i.id+"-e");if(e){e.textContent=msg||"";e.hidden=!msg}if(msg)i.setAttribute("aria-invalid","true");else i.removeAttribute("aria-invalid")}
 function v39ZipCheck(i,strict){const v=i.value.trim();if(!v)return strict&&i.required?(v39ZipErr(i,V39_ZMSG),false):(v39ZipErr(i,""),true);if(/\D/.test(v)){v39ZipErr(i,"ZIP codes are numbers only. "+V39_ZMSG);return false}
  if(!V39_ZIP.test(v)){if(strict)v39ZipErr(i,V39_ZMSG);return false}v39ZipErr(i,"");return true}
 function v39ZipBind(){document.querySelectorAll("input.v39zip").forEach(i=>{if(i.__v39)return;i.__v39=1;const h=document.getElementById(i.id+"-h");
  const u=i.id==="ac-z"?me():null;i.addEventListener("input",()=>{if(h)h.textContent=v39ZipHint(i.value,u);v39ZipCheck(i,false)});
  i.addEventListener("invalid",e=>{e.preventDefault();v39ZipCheck(i,true);i.focus()})})}
 /* a malformed ZIP stops the form before its own submit handler runs (capture phase), with the inline error */
 document.addEventListener("submit",e=>{const f=e.target;if(!f||!f.querySelectorAll)return;const bad=[...f.querySelectorAll("input.v39zip")].find(i=>!v39ZipCheck(i,true));if(bad){e.preventDefault();e.stopImmediatePropagation();bad.focus()}},true);
 {const ov=VIEWS.account;VIEWS.account=function(){const h=ov.apply(this,arguments);try{const m=me();if(!m)return h;return v39ZipSwap(h,{"ac-z":m.zip},m)}catch(e){return h}}}
 {const ov=VIEWS.signup;VIEWS.signup=function(){const h=ov.apply(this,arguments);try{return v39ZipSwap(h,{})}catch(e){return h}}}
 {const ov=VIEWS.join;if(ov)VIEWS.join=function(){const h=ov.apply(this,arguments);try{return v39ZipSwap(h,{"ob-zip":typeof OB!=="undefined"&&OB?OB.zip:""})}catch(e){return h}}}
 for(const k of ["account","signup","join"]){const oa=AFTER[k];AFTER[k]=function(){const r=oa&&oa.apply(this,arguments);try{v39ZipBind()}catch(e){}return r}}
}

/* (2) 1099 year-end (QA v38 idea 6). A sub can be credited or refunded (a negative Subcontractor entry, "Credit / refund"
   in Tax records, or a minus amount in Expenses & mileage), so a sub can be brought back under the line without deleting a
   receipt. Integer cents end to end (c39), and a credit can only bring that sub's total for that calendar year down to
   $0.00, never below. The 1099-NEC line is a year-keyed table ($600 through 2025, $2,000 for 2026); for 2027 and later the
   page shows $2,000 labeled "check IRS — adjusts for inflation after 2026" instead of asserting it. W-9 stays yes/no. */
const V39_1099=[[0,2025,600],[2026,2026,2000]];
const V39_EST="check IRS — adjusts for inflation after 2026";
function v39Line(y){y=+y;for(const r of V39_1099)if(y>=r[0]&&y<=r[1])return{amt:r[2],est:false};const last=V39_1099[V39_1099.length-1];return{amt:last[2],est:y>last[1],note:V39_EST}}
v38Line=function(y){return v39Line(y).amt};
function v39Cents(s){s=String(s==null?"":s).trim().replace(/[\s,$]/g,"").replace(/^[(]|[)]$/g,"").replace(/^[-\u2212\u2010\u2012\u2013\u2014\uFE63\uFF0D]+/,"");const m=/^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(s);if(!m)return null;return(+m[1])*100+(m[2]?+(m[2]+"0").slice(0,2):0)}
function v39IsNeg(s){const t=String(s==null?"":s).trim().replace(/^\$\s*/,"");return/^[(]/.test(t)||/^[-\u2212\u2010\u2012\u2013\u2014\uFE63\uFF0D]/.test(t)}
function v39LC(l){if(l&&Number.isInteger(l.c39))return l.c39;return Math.round((+(l&&l.amt)||0)*100)}
function v39SubTotal(m,key,y){let c=0;v7Mine("ledger",m).forEach(l=>{if(l&&l.kind==="exp"&&l.cat==="Subcontractor"&&v38Key(l.vendor)===key&&v38PayYear(l.date,v38TaxTz(m))===String(y))c+=v39LC(l)});return c}
const v39$c=c=>v7$(c/100);
{const ol=A.addLedger;A.addLedger=function(o){o=o||{};if(o.kind==="mile"||!(o.credit===true||v39IsNeg(o.amt)))return ol.apply(this,arguments);
 const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};if(String(o.cat||"")!=="Subcontractor")return{ok:false,msg:"Credits and refunds go on a subcontractor (category Subcontractor). For other receipts, edit or delete the receipt."};
 const key=v38Key(o.vendor);if(!key||key==="(no name)")return{ok:false,msg:"Name the sub the credit is from."};
 const c=v39Cents(o.amt);if(!c||c<1||c>1e8)return{ok:false,msg:"Enter the credit amount, like 150.00."};
 const date=v7Date(o.date)||v7Today(),y=date.slice(0,4),have=v39SubTotal(m,key,y);
 const first=v7Mine("ledger",m).find(l=>l&&l.kind==="exp"&&l.cat==="Subcontractor"&&v38Key(l.vendor)===key&&v39LC(l)>0),name=String(first?first.vendor:o.vendor||"").trim().replace(/\s+/g," ").slice(0,80);
 if(have<=0)return{ok:false,msg:first&&v39SubTotal(m,key,y)===0&&v7Mine("ledger",m).some(l=>l&&l.credit39&&v38Key(l.vendor)===key&&String(l.date).slice(0,4)===y)?`${name}'s ${y} total is already $0.00.`:`There are no ${y} payments to ${name} to credit.`};
 if(c>have)return{ok:false,max:have,msg:`That's more than the ${v39$c(have)} paid to ${name} in ${y}. A credit can bring the total down to $0.00, not below.`};
 const l={id:"l"+uid(),by:m.id,kind:"exp",date,amt:-c/100,c39:-c,credit39:true,cat:"Subcontractor",vendor:name,job:"",note:v7S(o.note,200),photo:null,dt:Date.now()};v7Col("ledger").push(l);save();
 return{ok:true,id:l.id,msg:`Credit of ${v39$c(c)} from ${name} logged. ${y} total: ${v39$c(have-c)}.`}}}
/* a credit is never billable as a job cost */
{const ou=v36Unbilled;v36Unbilled=function(){return ou.apply(this,arguments).filter(L=>!(L&&L.credit39))}}
v38Subs=function(m,y){const L=v39Line(y),line=L.amt,by=new Map(),w9=(m&&m.w938&&typeof m.w938==="object")?m.w938:{};
 v7Mine("ledger",m).filter(l=>l&&l.kind==="exp"&&l.cat==="Subcontractor"&&v38PayYear(l.date,v38TaxTz(m))===String(y)).forEach(l=>{const k=v38Key(l.vendor)||"(no name)";const o=by.get(k)||{key:k,name:"",n:0,cr:0,crc:0,c:0,last:""};const lc=v39LC(l);
  if(lc<0){o.cr++;o.crc+=-lc}else{o.n++;if(!o.name)o.name=String(l.vendor||"").trim();if(String(l.date)>o.last)o.last=String(l.date)}o.c+=lc;if(!o.name&&k!=="(no name)")o.name=String(l.vendor||"").trim();by.set(k,o)});
 const rows=[...by.values()].map(o=>{o.c=Math.max(0,o.c);if(!o.name)o.name=o.key==="(no name)"?"No name on the receipt":o.key;if(!o.last)o.last=String(y)+"-01-01";return Object.assign(o,{amt:o.c/100,need:o.c>=line*100&&o.key!=="(no name)",w9:!!w9[o.key]})}).sort((a,b)=>b.c-a.c);
 return{y:String(y),line,est:L.est,due:v38Due(y),rows,need:rows.filter(r=>r.need).length,missing:rows.filter(r=>r.need&&!r.w9).length,total:rows.reduce((a,r)=>a+r.c,0)/100}};
v38SubsCsv=function(m,y){const s=v38Subs(m,y),ln=s.line.toFixed(2)+(s.est?" ("+V39_EST+")":"");return[["Paid to","Payments","Credits / refunds","Total paid "+s.y+" (after credits)","Last payment","1099-NEC line","1099-NEC likely needed","W-9 on file"],...s.rows.map(r=>[r.name,r.n,(r.crc/100).toFixed(2),r.amt.toFixed(2),r.last,ln,r.need?"Yes":"No",r.w9?"Yes":"No"])]};
if(typeof document!=="undefined"){
 {const ot=v38TaxCard;v38TaxCard=function(m,y){let h=ot.apply(this,arguments);try{const yy=typeof v31Year==="function"?v31Year(m,y):String(y||new Date().getFullYear());const s=v38Subs(m,yy),L=v39Line(yy);
   if(L.est){const lab=`${v7$0(L.amt)} (${V39_EST})`;h=h.replace(`<h3 id="v38sh">Subs to 1099</h3>`,()=>`<h3 id="v38sh">Subs to 1099</h3><p class="v39est small" role="note">${I("info",14)}<span>The ${esc(yy)} line shown is <b>${v7$0(L.amt)}</b>: ${esc(V39_EST)}.</span></p>`);
    h=h.split(`reached ${v7$0(L.amt)} in`).join(`reached ${lab} in`)}
   const i0=h.indexOf('<tbody>',h.indexOf('class="o7t v38t"'));const i1=i0<0?-1:h.indexOf('</tbody>',i0);
   if(i0>=0&&i1>i0){let k=0;const body=h.slice(i0,i1).replace(/<\/small><\/th>/g,x=>{const r=s.rows[k++];if(!r||r.key==="(no name)")return x;
     return`${r.crc?` · credits −${esc(v7$(r.crc/100))}`:""}</small><button type="button" class="linkbtn v39cr" data-v39cr="${esc(r.key)}" data-v39n="${esc(r.name)}" data-v39y="${esc(yy)}" data-v39have="${r.c}">Credit / refund</button></th>`});h=h.slice(0,i0)+body+h.slice(i1)}}catch(e){console.warn(e)}return h}}
 function v39CrModal(key,name,y,have){const today=v7Today(),d=String(y)===today.slice(0,4)?today:String(y)+"-12-31";
  modal(`<form id="v39crf" class="v39crf" novalidate><h2 id="mtitle">${I("doc",20)} Credit or refund from ${esc(name)}</h2><p class="muted small">Money ${esc(name)} gave back (a refund, a credit for work redone, or a payment you logged by mistake). It lowers their ${esc(String(y))} total, down to $0.00 at most. Paid so far: <b>${v39$c(+have)}</b>.</p>
   <div class="row2"><div class="fld"><label for="v39cra">Amount</label><input id="v39cra" inputmode="decimal" placeholder="150.00" required autocomplete="off"></div><div class="fld"><label for="v39crd">Date</label><input id="v39crd" type="date" value="${d}" min="${esc(String(y))}-01-01" max="${esc(String(y))}-12-31"></div></div>
   <div class="fld"><label for="v39crn">Note (optional)</label><input id="v39crn" maxlength="200" placeholder="Refund for the second coat"></div><p class="v39ze" id="v39crE" role="alert" hidden></p>
   <div class="actions"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn primary">Log credit</button></div></form>`,"v33sheet");
  document.querySelectorAll("#modal [data-close]").forEach(x=>x.onclick=closeModal);const $=s=>document.getElementById(s);setTimeout(()=>{const a=$("v39cra");if(a)a.focus()},40);
  $("v39crf").onsubmit=e=>{e.preventDefault();const E=$("v39crE"),say=t=>{E.textContent=t;E.hidden=!t};const c=v39Cents($("v39cra").value);if(!c){say("Enter the credit amount, like 150.00.");return}if(c>+have){say(`That's more than the ${v39$c(+have)} paid to ${name} in ${y}. A credit can bring the total down to $0.00, not below.`);return}
   const r=A.addLedger({kind:"exp",cat:"Subcontractor",vendor:name,amt:"-"+(c/100).toFixed(2),date:$("v39crd").value,note:$("v39crn").value,credit:true});if(r&&r.ok===false){say(r.msg||"That didn't save.");return}closeModal();act(r,()=>{const yy=scrollY;render();scrollTo(0,yy)})}}
 {const oa=AFTER.office;AFTER.office=function(tab){const r=oa&&oa.apply(this,arguments);try{if(tab==="reports")document.querySelectorAll("[data-v39cr]").forEach(b=>b.onclick=()=>v39CrModal(b.dataset.v39cr,b.dataset.v39n,b.dataset.v39y,b.dataset.v39have))}catch(e){}return r}}
}

