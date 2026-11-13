/* ===== v23 ===== */
/* One title helper (SW-056). The server builds every first-HTML <title> with sawyerTitle() (it runs this file in its
   vm), and the app sets document.title with the same function after every render, so the tab text never changes when
   the app mounts. Format: "<View> · Sawyer" for named views, "<Record>: … · Sawyer" for profiles, jobs and traveler
   calls, and the plain "Sawyer — <tagline>" only on home (and views without a name). */
if(typeof TITLES!=="undefined")Object.assign(TITLES,{signup:"Sign up",prices:"Price guide",post:"Request a pro",travel:"Traveling electricians",traveling:"Traveling electricians",credits:"Photo credits",pricing:"Pricing",pros:"For pros",about:"About",faq:"FAQ",jobs:"Job board",find:"Find pros",compare:"Compare bids"});
function sawyerTitle(v,p,db){const d=db||(typeof DB!=="undefined"?DB:null)||{};const S=" · __BRAND__";
 if(typeof VIEWS!=="undefined"&&v&&v!=="home"&&!VIEWS[v])return "Page not found"+S;
 const town=z=>{try{return z?String(townOf(z)||""):""}catch(e){return String(z||"")}};
 if(v==="pro"){const u=(d.users||[]).find(x=>x.id===p&&x.role==="contractor");if(u){const t=town(u.zip);return `${u.biz||u.name||"Pro"}: ${u.trade||"Contractor"}${t?" in "+t:""}`+S}}
 if(v==="job"||v==="compare"){const j=(d.jobs||[]).find(x=>x.id===p);if(j&&j.title)return (v==="compare"?"Compare bids: ":"")+String(j.title).slice(0,120)+S}
 if(v==="tcall"){const c=(d.tcalls||[]).find(x=>x.id===p);if(c&&c.title)return `${c.title}: ${c.loc||""}${c.state?", "+c.state:""}`+S}
 const n=typeof TITLES!=="undefined"&&v&&v!=="home"?TITLES[v]:"";return n?n+S:"__BRAND__ — "+TAGLINE}
if(typeof document!=="undefined"&&typeof render==="function"){const or=render;render=function(){const r=or.apply(this,arguments);
 try{if(typeof ROUTE!=="undefined"&&ROUTE){const t=sawyerTitle(ROUTE.v,ROUTE.p,DB);if(document.title!==t)document.title=t}}catch(e){}return r}}
