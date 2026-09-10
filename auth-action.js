import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, applyActionCode, checkActionCode, verifyPasswordResetCode, confirmPasswordReset } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const firebaseConfig={apiKey:"AIzaSyByeYMVBKuGjJeknOnirnJMZGBFNI1cEzU",authDomain:"playground-644c5.firebaseapp.com",databaseURL:"https://playground-644c5-default-rtdb.europe-west1.firebasedatabase.app",projectId:"playground-644c5",storageBucket:"playground-644c5.firebasestorage.app",messagingSenderId:"794763452337",appId:"1:794763452337:web:5cd8e4e533c80200b06790"};
const app=initializeApp(firebaseConfig),auth=getAuth(app);

const params=new URLSearchParams(location.search);
const mode=params.get("mode"),code=params.get("oobCode");
const title=document.getElementById("action-title");
const copy=document.getElementById("action-copy");
const status=document.getElementById("action-status");
const resetForm=document.getElementById("reset-form");
const password=document.getElementById("new-password");
const confirmPassword=document.getElementById("confirm-password");
const savePassword=document.getElementById("save-password");
const openShopList=document.getElementById("open-shoplist");
const backShopList=document.getElementById("back-shoplist");

function setStatus(message,type=""){
  status.textContent=message;
  status.className=`status ${type}`.trim();
}
function showOpen(){openShopList.classList.remove("hidden");backShopList.classList.add("hidden")}
function invalidLink(){
  title.textContent="This link is no longer valid";
  copy.textContent="The link may have expired or already been used. Return to ShopList and request a new one.";
  setStatus("","");
}

async function handleVerifyEmail(){
  title.textContent="Verifying your email…";
  copy.textContent="We’re confirming your ShopList email address.";
  try{
    await checkActionCode(auth,code);
    await applyActionCode(auth,code);
    title.textContent="Email verified";
    copy.textContent="Your email address is confirmed. You can now continue to ShopList.";
    setStatus("Your account is ready to use.","success");
    showOpen();
  }catch{invalidLink()}
}

async function handleResetPassword(){
  title.textContent="Choose a new password";
  copy.textContent="Create a new password for your ShopList account.";
  try{
    const email=await verifyPasswordResetCode(auth,code);
    setStatus(`Resetting password for ${email}`);
    resetForm.classList.remove("hidden");
    password.focus();
  }catch{invalidLink()}
}

savePassword?.addEventListener("click",async()=>{
  const next=password.value,confirm=confirmPassword.value;
  if(next.length<6){setStatus("Password must be at least 6 characters.","error");return}
  if(next!==confirm){setStatus("Passwords do not match.","error");return}
  savePassword.disabled=true;
  setStatus("Saving your new password…");
  try{
    await confirmPasswordReset(auth,code,next);
    resetForm.classList.add("hidden");
    title.textContent="Password updated";
    copy.textContent="Your password has been changed successfully. You can sign in to ShopList now.";
    setStatus("Password reset complete.","success");
    showOpen();
  }catch{
    setStatus("This reset link is no longer valid. Request a new password reset email from ShopList.","error");
  }finally{savePassword.disabled=false}
});

async function init(){
  if(!mode||!code){invalidLink();return}
  if(mode==="verifyEmail")await handleVerifyEmail();
  else if(mode==="resetPassword")await handleResetPassword();
  else{
    title.textContent="Unsupported account link";
    copy.textContent="This ShopList account action is not supported on this page.";
  }
}
init();
