import { getApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, reload, sendEmailVerification, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const auth=getAuth(getApp());
const verifyScreen=document.getElementById("verification-screen");
const verifyEmail=document.getElementById("verification-email");
const verifyMessage=document.getElementById("verification-message");
const verifiedButton=document.getElementById("verified-button");
const resendButton=document.getElementById("resend-verification-button");
const verificationSignout=document.getElementById("verification-signout");
const authScreen=document.getElementById("auth-screen");
const appScreen=document.getElementById("app-screen");

function showVerification(user){
  if(!verifyScreen)return;
  appScreen?.classList.add("hidden");
  authScreen?.classList.add("hidden");
  verifyEmail.textContent=user.email||"";
  verifyMessage.textContent="Check your inbox and verify your email before continuing.";
  verifyScreen.classList.remove("hidden");
}

function hideVerification(){verifyScreen?.classList.add("hidden")}

async function sendVerification(user,manual=false){
  if(!user||user.emailVerified)return;
  const key=`shoplist_verification_sent_${user.uid}`;
  if(!manual&&sessionStorage.getItem(key)==="1")return;
  try{
    await sendEmailVerification(user);
    sessionStorage.setItem(key,"1");
    verifyMessage.textContent=manual?"Verification email sent again. Check your inbox and spam folder.":"Verification email sent. Check your inbox and spam folder.";
  }catch(err){
    verifyMessage.textContent=err?.code==="auth/too-many-requests"?"Too many requests. Please wait before trying again.":"Could not send the verification email. Please try again.";
  }
}

onAuthStateChanged(auth,async user=>{
  if(!user){hideVerification();return}
  try{await reload(user)}catch{}
  if(!user.emailVerified){
    showVerification(user);
    await sendVerification(user,false);
  }else hideVerification();
});

verifiedButton?.addEventListener("click",async()=>{
  const user=auth.currentUser;
  if(!user)return;
  verifiedButton.disabled=true;
  verifyMessage.textContent="Checking verification…";
  try{
    await reload(user);
    if(user.emailVerified){
      verifyMessage.textContent="Email verified. Opening ShopList…";
      setTimeout(()=>window.location.reload(),300);
    }else verifyMessage.textContent="Not verified yet. Open the Firebase email first, then tap this button again.";
  }catch{verifyMessage.textContent="Could not check verification right now. Please try again."}
  finally{verifiedButton.disabled=false}
});

resendButton?.addEventListener("click",async()=>{
  const user=auth.currentUser;
  if(!user)return;
  resendButton.disabled=true;
  await sendVerification(user,true);
  setTimeout(()=>{resendButton.disabled=false},15000);
});

verificationSignout?.addEventListener("click",()=>signOut(auth));
