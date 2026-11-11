/* v16: (1) SW-018 partial profile state guard, (2) expiry reminders on one schedule, (3) honest dashboard numbers and first-run guidance. */
// (1) A signed-out /p/<id> page starts with only that profile's data (see client-pre.js). Any other page waits for the
// full public state first (one quick synchronous load), so search, other profiles and the home page never render from
// the slim copy.
if(typeof document!=="undefined"&&typeof render==="function"&&typeof __fullSync==="function"){const r16=render;render=function(){try{if(!__partOk())__fullSync()}catch(e){}return r16.apply(this,arguments)}}
