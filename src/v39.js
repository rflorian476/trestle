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

