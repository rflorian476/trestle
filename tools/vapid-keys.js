// v34: make a VAPID key pair for push alerts, to paste into the Render dashboard as VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.
// Run it on your own machine (`node tools/vapid-keys.js`) and paste straight into the dashboard. Don't commit the output
// or put it in render.yaml: the private key signs every push Sawyer sends.
"use strict";
const {privateKey}=require("crypto").generateKeyPairSync("ec",{namedCurve:"prime256v1"});const j=privateKey.export({format:"jwk"});
const pub=Buffer.concat([Buffer.from([4]),Buffer.from(j.x,"base64url"),Buffer.from(j.y,"base64url")]).toString("base64url");
process.stdout.write("VAPID_PUBLIC_KEY="+pub+"\nVAPID_PRIVATE_KEY="+j.d+"\n");
