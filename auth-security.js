import { getApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, reload, sendEmailVerification, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getDatabase, ref, get, update, push, set, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

const app=getApp();
const auth=getAuth(app);
const database=getDatabase(app);
const verifyScreen=document.getElementById("verification-screen");
const verifyEmail=document.getElementById("verification-email");
const verifyMessage=document.getElementById("verification-message");
const verifiedButton=document.getElementById("verified-button");
const resendButton=document.getElementById("resend-verification-button");
const verificationSignout=document.getElementById("verification-signout");
const authScreen=document.getElementById("auth-screen");
const appScreen=document.getElementById("app-screen");

const PUSH_CHARS="-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
const categoryByName={
  "Groceries":"grocery",
  "Home & Renovation":"home",
  "Long-term Purchases":"longterm",
  "Travel":"travel",
  "Health & Personal Care":"health",
  "Gifts":"gifts",
  "Other":"other"
};

function showVerification(user){
  if(!verifyScreen)return;
  appScreen?.classList.add("hidden");
  authScreen?.classList.add("hidden");
  verifyEmail.textContent=user.email||"";
  verifyMessage.textContent="Check your inbox and verify your email before continuing.";
  verifyScreen.classList.remove("hidden");
}

function hideVerification(){verifyScreen?.classList.add("hidden")}

async function refreshVerificationState(user){
  await reload(user);
  if(user.emailVerified){
    await user.getIdToken(true);
    return true;
  }
  return false;
}

function pushIdTimestamp(id){
  if(typeof id!=="string"||id.length<8)return null;
  let timestamp=0;
  for(let i=0;i<8;i++){
    const value=PUSH_CHARS.indexOf(id[i]);
    if(value<0)return null;
    timestamp=timestamp*64+value;
  }
  return Number.isFinite(timestamp)?timestamp:null;
}

async function repairHistoryTimestamps(user){
  if(!user?.uid||!user.emailVerified)return;
  const historyRef=ref(database,`users/${user.uid}/history`);
  const snap=await get(historyRef);
  if(!snap.exists())return;
  const repairs={};
  for(const [id,record] of Object.entries(snap.val()||{})){
    const keyTimestamp=pushIdTimestamp(id);
    if(!keyTimestamp)continue;
    const savedTimestamp=Number(record?.completedAt);
    if(!Number.isFinite(savedTimestamp)||Math.abs(savedTimestamp-keyTimestamp)>5*60*1000){
      repairs[`${id}/completedAt`]=keyTimestamp;
    }
  }
  if(Object.keys(repairs).length)await update(historyRef,repairs);
}

function showToast(message){
  const toast=document.getElementById("toast");
  if(!toast)return;
  toast.textContent=message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer=setTimeout(()=>toast.classList.remove("show"),2600);
}

async function saveShoppingWithServerTime(button){
  const user=auth.currentUser;
  if(!user?.emailVerified)return;
  const amountInput=document.getElementById("amount-input");
  const currencyInput=document.getElementById("currency-input");
  const amount=Number(amountInput?.value);
  const currency=currencyInput?.value||"EUR";
  if(!Number.isFinite(amount)||amount<0){showToast("Please enter a valid amount.");return}

  const categoryName=document.getElementById("list-title")?.textContent?.trim()||"Other";
  const category=categoryByName[categoryName]||"other";
  const purchased=[...document.querySelectorAll("#shopping-list .shopping-item[data-item-id]")]
    .filter(row=>row.classList.contains("completed"))
    .map(row=>({id:row.dataset.itemId,text:row.querySelector(".item-text")?.textContent?.trim()||""}));

  button.disabled=true;
  try{
    const historyItemRef=push(ref(database,`users/${user.uid}/history`));
    await set(historyItemRef,{
      category,
      categoryName,
      amount,
      currency,
      itemCount:purchased.length,
      purchasedCount:purchased.length,
      purchasedItems:purchased.map(item=>item.text),
      completedAt:serverTimestamp()
    });

    if(purchased.length){
      const removals={};
      purchased.forEach(item=>{removals[item.id]=null});
      await update(ref(database,`users/${user.uid}/lists`),removals);
    }

    document.getElementById("complete-modal")?.classList.add("hidden");
    showToast(purchased.length?"Shopping saved. Unbought items stay on your list.":"Shopping closed. No items were marked as bought.");
  }catch(error){
    console.error("Could not save shopping",error);
    showToast("Could not save shopping. Please try again.");
  }finally{
    button.disabled=false;
  }
}

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
  let verified=false;
  try{verified=await refreshVerificationState(user)}catch{}
  if(!verified){
    sessionStorage.removeItem(`shoplist_verified_reload_${user.uid}`);
    showVerification(user);
    await sendVerification(user,false);
    return;
  }

  hideVerification();
  const reloadKey=`shoplist_verified_reload_${user.uid}`;
  if(sessionStorage.getItem(reloadKey)!=="1"){
    sessionStorage.setItem(reloadKey,"1");
    window.location.reload();
    return;
  }

  try{await repairHistoryTimestamps(user)}catch(error){console.error("History timestamp repair failed",error)}
});

document.addEventListener("click",async event=>{
  const button=event.target.closest("#save-complete-button");
  if(!button)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  await saveShoppingWithServerTime(button);
},true);

verifiedButton?.addEventListener("click",async()=>{
  const user=auth.currentUser;
  if(!user)return;
  verifiedButton.disabled=true;
  verifyMessage.textContent="Checking verification…";
  try{
    const verified=await refreshVerificationState(user);
    if(verified){
      sessionStorage.setItem(`shoplist_verified_reload_${user.uid}`,"1");
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
