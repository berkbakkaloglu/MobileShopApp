import { initializeApp,getApps } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth,onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getDatabase,ref,onValue } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

const config={apiKey:"AIzaSyByeYMVBKuGjJeknOnirnJMZGBFNI1cEzU",authDomain:"playground-644c5.firebaseapp.com",databaseURL:"https://playground-644c5-default-rtdb.europe-west1.firebasedatabase.app",projectId:"playground-644c5",storageBucket:"playground-644c5.firebasestorage.app",messagingSenderId:"794763452337",appId:"1:794763452337:web:5cd8e4e533c80200b06790"};
const app=getApps()[0]||initializeApp(config),auth=getAuth(app),db=getDatabase(app);
const box=document.getElementById("all-currencies-card"),totalEl=document.getElementById("all-currencies-total"),monthEl=document.getElementById("all-currencies-month");
let unsubscribe=null;

function monthKey(t){const d=new Date(t);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function formatMoney(v,c){const l=c==="TRY"?"tr-TR":c==="USD"?"en-US":"de-DE";return new Intl.NumberFormat(l,{style:"currency",currency:c,maximumFractionDigits:2}).format(Number(v||0))}
function renderTotals(rows){const order=["EUR","TRY","USD"],totals={},monthTotals={},currentMonth=monthKey(Date.now());for(const row of rows){const c=row.currency||"EUR";totals[c]=(totals[c]||0)+Number(row.amount||0);if(monthKey(row.completedAt)===currentMonth)monthTotals[c]=(monthTotals[c]||0)+Number(row.amount||0)}const used=order.filter(c=>(totals[c]||0)!==0);const extras=Object.keys(totals).filter(c=>!order.includes(c)&&(totals[c]||0)!==0);const currencies=[...used,...extras];if(!currencies.length){totalEl.innerHTML='<span class="all-currencies-empty">No spending yet.</span>';monthEl.innerHTML='';return}totalEl.innerHTML=currencies.map((c,i)=>`${i?'<span class="currency-plus">+</span>':''}<span class="currency-total-chip">${formatMoney(totals[c],c)} <small>${c}</small></span>`).join("");const monthCurrencies=currencies.filter(c=>(monthTotals[c]||0)!==0);monthEl.innerHTML=monthCurrencies.length?`This month: <strong>${monthCurrencies.map(c=>`${formatMoney(monthTotals[c],c)} ${c}`).join(" + ")}</strong>`:'This month: <strong>No spending yet</strong>'}

onAuthStateChanged(auth,user=>{if(unsubscribe){unsubscribe();unsubscribe=null}if(!user){box?.classList.add("hidden");return}box?.classList.remove("hidden");unsubscribe=onValue(ref(db,`users/${user.uid}/history`),snap=>{const rows=Object.values(snap.val()||{});renderTotals(rows)})});
