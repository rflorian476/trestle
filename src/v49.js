/* ===================== v49 ===================== */
/* (1) QA v48 idea 3: a void bill's customer link still opens it (marked void, no Pay or Approve) for anyone who has it.
   The pro's card says so (src/v48.js) and off49 turns the link off without making a new one, so the bill stops opening
   from it. Owner only; works for any status; a void bill still can't get a new link (link48). */
const V2_ACTIONS49=["off49"];if(typeof V2_ACTIONS!=="undefined")V2_ACTIONS.push(...V2_ACTIONS49);
A.off49=function(id){const m=me();if(!m)return{ok:false,need:"login",msg:"Sign in first"};const b=v7Bill(id);
 if(!b||b.by!==m.id||!BILLNAME[b.type])return{ok:false,msg:"Not found"};
 if(!v48Ok(b))return{ok:true,msg:"This link is already off"};
 delete b.tk48;delete b.tk48b;delete b.tk48at;save();return{ok:true,msg:"Link turned off. It doesn't open this "+v48Kind(b)+" anymore."}};

