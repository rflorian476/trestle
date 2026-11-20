/* ===================== v48 ===================== */
/* (1) QA v47 ideas 1-2. The traveling-electricians guide (VIEWS.traveling) now lives at /travel?tab=how: /traveling is a
   single 301 there (server.js), and the in-app links point at it directly, so a reload or a shared link opens the same
   page. Canonical stays /travel. */
{const ov=VIEWS.travel;VIEWS.travel=(p,q)=>q&&q.tab==="how"&&VIEWS.traveling?VIEWS.traveling(p,q):ov(p,q)}
{const oa=AFTER.travel;AFTER.travel=(p,q)=>{if(q&&q.tab==="how"){AFTER.traveling&&AFTER.traveling(p,q);return}oa&&oa(p,q)}}
