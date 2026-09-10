import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const PROJECT_ID="playground-644c5";
const WEB_API_KEY="AIzaSyByeYMVBKuGjJeknOnirnJMZGBFNI1cEzU";
const DEFAULT_APP_URL="https://berkscartapp.netlify.app";

function json(statusCode,body){return{statusCode,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"},body:JSON.stringify(body)}}

function getAdmin(){
  if(getApps().length)return getApps()[0];
  const raw=process.env.FIREBASE_SERVICE_ACCOUNT;
  if(!raw)throw new Error("Missing FIREBASE_SERVICE_ACCOUNT");
  const serviceAccount=JSON.parse(raw);
  return initializeApp({credential:cert(serviceAccount),projectId:PROJECT_ID});
}

function actionUrl(generatedLink,mode){
  const generated=new URL(generatedLink);
  const oobCode=generated.searchParams.get("oobCode");
  if(!oobCode)throw new Error("Firebase action link did not include an oobCode");
  const appUrl=(process.env.APP_URL||process.env.URL||DEFAULT_APP_URL).replace(/\/$/,"");
  const target=new URL(`${appUrl}/auth-action.html`);
  target.searchParams.set("mode",mode);
  target.searchParams.set("oobCode",oobCode);
  target.searchParams.set("apiKey",WEB_API_KEY);
  return target.toString();
}

function escapeHtml(value=""){
  return String(value).replace(/[&<>'"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
}

function emailShell({headline,copy,buttonText,url,footer}){
  return `<!doctype html><html><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#111827"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:28px 14px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden"><tr><td style="padding:32px"><div style="width:44px;height:44px;line-height:44px;text-align:center;background:#111827;color:#fff;border-radius:13px;font-size:22px;font-weight:700;margin-bottom:20px">✓</div><div style="font-size:11px;letter-spacing:.16em;font-weight:700;color:#6b7280;margin-bottom:10px">SHOPLIST</div><h1 style="font-size:26px;line-height:1.2;margin:0 0 14px">${escapeHtml(headline)}</h1><p style="font-size:15px;line-height:1.65;color:#4b5563;margin:0 0 24px">${copy}</p><a href="${escapeHtml(url)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:13px 18px;border-radius:12px;font-size:14px;font-weight:700">${escapeHtml(buttonText)}</a><p style="font-size:12px;line-height:1.6;color:#9ca3af;margin:26px 0 0">${footer}</p></td></tr></table></td></tr></table></body></html>`;
}

async function sendWithResend({to,subject,html}){
  const apiKey=process.env.RESEND_API_KEY;
  const from=process.env.MAIL_FROM||"ShopList <onboarding@resend.dev>";
  if(!apiKey)throw new Error("Missing RESEND_API_KEY");
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({from,to:[to],subject,html})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(`Resend error ${response.status}: ${data?.message||"unknown error"}`);
  return data;
}

export const handler=async event=>{
  if(event.httpMethod!=="POST")return json(405,{ok:false,error:"Method not allowed"});
  let body;
  try{body=JSON.parse(event.body||"{}")}catch{return json(400,{ok:false,error:"Invalid request"})}
  const type=body?.type;
  try{
    const app=getAdmin();
    const adminAuth=getAuth(app);
    if(type==="verify"){
      const idToken=String(body?.idToken||"");
      if(!idToken)return json(401,{ok:false,error:"Authentication required"});
      const decoded=await adminAuth.verifyIdToken(idToken);
      const user=await adminAuth.getUser(decoded.uid);
      if(!user.email)return json(400,{ok:false,error:"This account has no email address"});
      if(user.emailVerified)return json(200,{ok:true,alreadyVerified:true});
      const generated=await adminAuth.generateEmailVerificationLink(user.email,{url:(process.env.APP_URL||process.env.URL||DEFAULT_APP_URL)+"/",handleCodeInApp:false});
      const url=actionUrl(generated,"verifyEmail");
      const name=user.displayName?.trim();
      await sendWithResend({to:user.email,subject:"Verify your ShopList email",html:emailShell({headline:"Verify your email",copy:`${name?`Hi ${escapeHtml(name)}, `:""}Tap the button below to confirm your email address and finish setting up your ShopList account.`,buttonText:"Verify email",url,footer:"If you didn’t create a ShopList account, you can safely ignore this email."})});
      return json(200,{ok:true});
    }
    if(type==="reset"){
      const email=String(body?.email||"").trim().toLowerCase();
      if(!/^\S+@\S+\.\S+$/.test(email))return json(400,{ok:false,error:"Please enter a valid email address."});
      try{
        const generated=await adminAuth.generatePasswordResetLink(email,{url:(process.env.APP_URL||process.env.URL||DEFAULT_APP_URL)+"/",handleCodeInApp:false});
        const url=actionUrl(generated,"resetPassword");
        await sendWithResend({to:email,subject:"Reset your ShopList password",html:emailShell({headline:"Reset your password",copy:"We received a request to reset the password for your ShopList account. Tap the button below to choose a new password.",buttonText:"Reset password",url,footer:"If you didn’t request a password reset, you can ignore this email. Your current password will keep working."})});
      }catch(error){
        const code=String(error?.code||"");
        if(!code.includes("user-not-found"))throw error;
      }
      return json(200,{ok:true});
    }
    return json(400,{ok:false,error:"Unsupported email action"});
  }catch(error){
    console.error("auth-email",error);
    return json(500,{ok:false,error:"Email service is not configured yet. Please try again later."});
  }
};
