import "./all-currencies.js";
import { getApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

const app=getApp(),auth=getAuth(app),database=getDatabase(app);
const historyList=document.getElementById("history-list");
const modal=document.getElementById("receipt-modal");
const content=document.getElementById("receipt-content");
const closeButtons=document.querySelectorAll("[data-close-receipt]");
let currentId=null,currentRecord=null,editing=false;

const esc=v=>String(v??"").replace(/[&<>\'\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;","\"":"&quot;"}[c]));
const money=(v,c)=>new Intl.NumberFormat(c==="TRY"?"tr-TR":c==="USD"?"en-US":"de-DE",{style:"currency",currency:c||"EUR",maximumFractionDigits:2}).format(Number(v||0));
const date=t=>new Intl.DateTimeFormat("en",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(t||Date.now());

function recordItems(r){return Array.isArray(r?.purchasedItems)?r.purchasedItems:Array.isArray(r?.items)?r.items:[]}

async function openReceipt(id){
  const user=auth.currentUser;if(!user||!id)return;
  const snap=await get(ref(database,`users/${user.uid}/history/${id}`));
  if(!snap.exists())return;
  currentId=id;currentRecord={id,...snap.val()};editing=false;renderReceipt();modal.classList.remove("hidden");
}

function renderReceipt(){
  if(!currentRecord)return;
  const items=recordItems(currentRecord);
  if(editing){renderEditor(items);return}
  content.innerHTML=`<div class="receipt-paper"><div class="receipt-logo">SHOPLIST</div><div class="receipt-title">${esc(currentRecord.categoryName||"Shopping")}</div><div class="receipt-meta">${esc(date(currentRecord.completedAt))}</div><hr class="receipt-rule"><div class="receipt-items">${items.length?items.map((x,i)=>`<div class="receipt-item-row"><div><span class="receipt-item-index">${String(i+1).padStart(2,"0")}</span>${esc(x)}</div><span class="receipt-item-price-placeholder">✓</span></div>`).join(""):`<div class="receipt-item-row"><span>No item details</span></div>`}</div><hr class="receipt-rule"><div class="receipt-total-row"><span class="receipt-total-label">TOTAL</span><span class="receipt-total-value">${money(currentRecord.amount,currentRecord.currency)}</span></div></div><div class="receipt-actions"><button id="receipt-edit-button" class="receipt-edit-button" type="button">Edit receipt</button><button data-close-receipt class="receipt-cancel-button" type="button">Done</button></div>`;
  document.getElementById("receipt-edit-button")?.addEventListener("click",()=>{editing=true;renderReceipt()});
  content.querySelectorAll("[data-close-receipt]").forEach(b=>b.addEventListener("click",closeReceipt));
}

function renderEditor(items){
  content.innerHTML=`<div class="receipt-paper"><div class="receipt-logo">EDIT RECEIPT</div><div class="receipt-title">${esc(currentRecord.categoryName||"Shopping")}</div><div class="receipt-meta">Change purchased items and final total</div><hr class="receipt-rule"><div id="receipt-edit-list" class="receipt-edit-list">${items.map(x=>editRow(x)).join("")}</div><button id="receipt-add-item" class="receipt-add-item" type="button">+ Add purchased item</button><hr class="receipt-rule"><div class="receipt-total-edit"><input id="receipt-amount" type="number" min="0" step="0.01" inputmode="decimal" value="${Number(currentRecord.amount||0)}"><select id="receipt-currency"><option value="EUR" ${currentRecord.currency==="EUR"?"selected":""}>EUR</option><option value="TRY" ${currentRecord.currency==="TRY"?"selected":""}>TRY</option><option value="USD" ${currentRecord.currency==="USD"?"selected":""}>USD</option></select></div></div><div class="receipt-actions"><button id="receipt-save-button" class="receipt-save-button" type="button">Save changes</button><button id="receipt-cancel-edit" class="receipt-cancel-button" type="button">Cancel</button></div>`;
  bindEditor();
}

function editRow(value=""){return `<div class="receipt-edit-row"><input class="receipt-item-input" type="text" value="${esc(value)}" placeholder="Purchased item"><button class="receipt-remove-item" type="button" aria-label="Remove item">×</button></div>`}

function bindEditor(){
  const list=document.getElementById("receipt-edit-list");
  list?.addEventListener("click",e=>{const b=e.target.closest(".receipt-remove-item");if(b)b.closest(".receipt-edit-row")?.remove()});
  document.getElementById("receipt-add-item")?.addEventListener("click",()=>{list.insertAdjacentHTML("beforeend",editRow(""));list.lastElementChild?.querySelector("input")?.focus()});
  document.getElementById("receipt-cancel-edit")?.addEventListener("click",()=>{editing=false;renderReceipt()});
  document.getElementById("receipt-save-button")?.addEventListener("click",saveReceipt);
}

async function saveReceipt(){
  const user=auth.currentUser;if(!user||!currentId)return;
  const items=[...document.querySelectorAll(".receipt-item-input")].map(x=>x.value.trim()).filter(Boolean);
  const amount=Number(document.getElementById("receipt-amount")?.value);
  const currency=document.getElementById("receipt-currency")?.value||"EUR";
  if(!Number.isFinite(amount)||amount<0)return;
  await update(ref(database,`users/${user.uid}/history/${currentId}`),{purchasedItems:items,purchasedCount:items.length,itemCount:items.length,amount,currency});
  currentRecord={...currentRecord,purchasedItems:items,purchasedCount:items.length,itemCount:items.length,amount,currency};editing=false;renderReceipt();
}

function closeReceipt(){modal?.classList.add("hidden");editing=false}
closeButtons.forEach(b=>b.addEventListener("click",closeReceipt));
modal?.addEventListener("click",e=>{if(e.target===modal)closeReceipt()});

historyList?.addEventListener("click",e=>{
  const row=e.target.closest("[data-history-id]");
  if(!row)return;
  e.preventDefault();e.stopPropagation();
  openReceipt(row.dataset.historyId);
},true);

const observer=new MutationObserver(()=>{
  const rows=[...historyList.querySelectorAll(".history-row[data-history-id]")];
  rows.forEach(row=>{
    if(row.dataset.receiptStyled)return;
    row.dataset.receiptStyled="1";
    const title=row.querySelector(".history-main strong")?.textContent?.trim()||"Shopping";
    const meta=row.querySelector(".history-main small")?.textContent?.trim()||"";
    const amount=row.querySelector(".history-amount")?.textContent?.trim()||"";
    row.className="history-receipt-preview";
    row.innerHTML=`<div class="history-receipt-top"><span class="history-receipt-name">${esc(title)}</span><span class="history-receipt-date">${esc(meta.split("·")[0]?.trim()||"")}</span></div><div class="history-receipt-items">${esc(meta)}</div><div class="history-receipt-total"><span>TOTAL</span><span>${esc(amount)}</span></div>`;
  });
});
if(historyList)observer.observe(historyList,{childList:true,subtree:false});
