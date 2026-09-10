import { getApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, reload, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const app=getApp(),auth=getAuth(app);
const verifyScreen=document.getElementById("verification-screen");
const verifyEmail=document.getElementById("verification-email");
const verifyMessage=document.getElementById("verification-message");
const verifiedButton=document.getElementById("verified-button");
const resendButton=document.getElementById("resend-verification-button");
const verificationSignout=document.getElementById("verification-signout");
const authScreen=document.getElementById("auth-screen");
const appScreen=document.getElementById("app-screen");
const forgotButton=document.getElementById("forgot-password");
const resetModal=document.getElementById("reset-password-modal");
const resetEmail=document.getElementById("reset-email");
const resetSend=document.getElementById("reset-send-button");
const resetStatus=document.getElementById("reset-status");
const EMAIL_ENDPOINT="/.netlify/functions/auth-email";

function showVerification(user){
  if(!verifyScreen)return;
  appScreen?.classList.add("hidden");
  authScreen?.classList.add("hidden");
  verifyEmail.textContent=user.email||"";
  verifyMessage.textContent="Check your inbox and tap the ShopList verification button before continuing.";
  verifyScreen.classList.remove("hidden");
}

function hideVerification(){verifyScreen?.classList.add("hidden")}

async function requestAuthEmail(payload){
  const response=await fetch(EMAIL_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data?.error||"Email request failed");
  return data;
}

async function sendVerification(user,manual=false){
  if(!user||user.emailVerified)return;
  const key=`shoplist_verification_sent_${user.uid}`;
  if(!manual&&sessionStorage.getItem(key)==="1")return;
  try{
    const idToken=await user.getIdToken(true);
    const result=await requestAuthEmail({type:"verify",idToken});
    if(result?.alreadyVerified){
      verifyMessage.textContent="Email already verified. Opening ShopList…";
      setTimeout(()=>window.location.reload(),300);
      return;
    }
    sessionStorage.setItem(key,"1");
    verifyMessage.textContent=manual?"A new ShopList verification email has been sent.":"Verification email sent. Check your inbox.";
  }catch(err){
    console.error("Verification email error",err);
    verifyMessage.textContent="Could not send the verification email right now. Please try again.";
  }
}

onAuthStateChanged(auth,async user=>{
  if(!user){hideVerification();return}
  try{await reload(user)}catch{}
  if(!user.emailVerified){
    showVerification(user);
    await sendVerification(user,false);
  }else{
    hideVerification();
  }
});

verifiedButton?.addEventListener("click",async()=>{
  const user=auth.currentUser;if(!user)return;
  verifiedButton.disabled=true;
  verifyMessage.textContent="Checking verification…";
  try{
    await reload(user);
    if(user.emailVerified){
      verifyMessage.textContent="Email verified. Opening ShopList…";
      setTimeout(()=>window.location.reload(),350);
    }else{
      verifyMessage.textContent="Not verified yet. Open the email and tap Verify email, then try again.";
    }
  }catch{verifyMessage.textContent="Could not check right now. Please try again."}
  finally{verifiedButton.disabled=false}
});

resendButton?.addEventListener("click",async()=>{
  const user=auth.currentUser;if(!user)return;
  resendButton.disabled=true;
  await sendVerification(user,true);
  setTimeout(()=>{resendButton.disabled=false},15000);
});

verificationSignout?.addEventListener("click",()=>signOut(auth));

function openResetModal(){
  if(!resetModal)return;
  resetEmail.value=document.getElementById("email-input")?.value?.trim()||"";
  resetStatus.textContent="";resetStatus.className="reset-status";
  resetModal.classList.remove("hidden");
  setTimeout(()=>resetEmail.focus(),50);
}
function closeResetModal(){resetModal?.classList.add("hidden")}

forgotButton?.addEventListener("click",e=>{
  e.preventDefault();
  e.stopImmediatePropagation();
  openResetModal();
},true);

document.querySelectorAll("[data-close-reset]").forEach(b=>b.addEventListener("click",closeResetModal));
resetModal?.addEventListener("click",e=>{if(e.target===resetModal)closeResetModal()});

resetSend?.addEventListener("click",async()=>{
  const email=resetEmail.value.trim();
  resetStatus.className="reset-status";
  if(!email){resetStatus.textContent="Enter your email address first.";resetStatus.classList.add("error");return}
  resetSend.disabled=true;resetStatus.textContent="Sending reset email…";
  try{
    await requestAuthEmail({type:"reset",email});
    resetStatus.textContent="If an account exists for this email, a ShopList password reset link has been sent. Check your inbox.";
    resetStatus.classList.add("success");
  }catch(err){
    resetStatus.textContent=err?.message?.includes("valid email")?"Please enter a valid email address.":"Could not send the reset email right now. Please try again.";
    resetStatus.classList.add("error");
  }finally{resetSend.disabled=false}
});
