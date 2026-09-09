import { getApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, get, remove, set } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

const app=getApp();
const database=getDatabase(app);
const auth=getAuth(app);
const list=document.getElementById("shopping-list");
const snackbar=document.getElementById("undo-snackbar");
const message=document.getElementById("undo-message");
const undoButton=document.getElementById("undo-button");

let pendingUndo=null;
let hideTimer=null;

function hideUndo(){
  clearTimeout(hideTimer);
  hideTimer=null;
  snackbar?.classList.remove("show");
  pendingUndo=null;
}

function showUndo(item){
  clearTimeout(hideTimer);
  pendingUndo=item;
  if(message)message.textContent=`Removed “${item.data.text||"item"}”`;
  snackbar?.classList.add("show");
  hideTimer=setTimeout(hideUndo,5000);
}

async function interceptDelete(event){
  const button=event.target.closest("[data-delete-id]");
  if(!button||!list?.contains(button))return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const user=auth.currentUser;
  const id=button.dataset.deleteId;
  if(!user||!id)return;

  button.disabled=true;
  try{
    const itemRef=ref(database,`users/${user.uid}/lists/${id}`);
    const snapshot=await get(itemRef);
    if(!snapshot.exists())return;
    const data=snapshot.val();
    await remove(itemRef);
    showUndo({id,data,userId:user.uid});
  }catch(error){
    console.error("Could not delete item",error);
    button.disabled=false;
  }
}

async function restoreItem(){
  if(!pendingUndo)return;
  const item=pendingUndo;
  clearTimeout(hideTimer);
  hideTimer=null;
  undoButton.disabled=true;
  try{
    await set(ref(database,`users/${item.userId}/lists/${item.id}`),item.data);
    if(message)message.textContent=`Restored “${item.data.text||"item"}”`;
    undoButton.classList.add("hidden");
    setTimeout(()=>{
      snackbar?.classList.remove("show");
      undoButton.classList.remove("hidden");
      undoButton.disabled=false;
      pendingUndo=null;
    },1200);
  }catch(error){
    console.error("Could not restore item",error);
    undoButton.disabled=false;
  }
}

list?.addEventListener("click",interceptDelete,true);
undoButton?.addEventListener("click",restoreItem);
