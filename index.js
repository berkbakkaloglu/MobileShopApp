import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-database.js";

const appSettings = {
  databaseURL: "https://playground-644c5-default-rtdb.europe-west1.firebasedatabase.app/"
};

const app = initializeApp(appSettings);
const database = getDatabase(app);

const categories = [
  { id: "grocery", name: "Groceries", icon: "🛒", description: "Weekly food & essentials" },
  { id: "home", name: "Home & Renovation", icon: "🏠", description: "Repairs, furniture & home" },
  { id: "longterm", name: "Long-term Purchases", icon: "📦", description: "Bigger things to buy" },
  { id: "travel", name: "Travel", icon: "✈️", description: "Trips & travel essentials" },
  { id: "health", name: "Health & Personal Care", icon: "♡", description: "Care & personal items" },
  { id: "gifts", name: "Gifts", icon: "🎁", description: "Gifts for others" },
  { id: "other", name: "Other", icon: "✦", description: "Everything else" }
];

const state = {
  userId: getOrCreateGuestId(),
  userName: "Guest",
  currentCategory: null,
  items: [],
  history: [],
  historyCurrency: "EUR"
};

const $ = (id) => document.getElementById(id);
const categoryGrid = $("category-grid");
const shoppingList = $("shopping-list");
const emptyList = $("empty-list");
const toast = $("toast");

// The existing Firebase project does not currently expose Authentication config in this repository.
// Until Firebase Authentication is configured, this first version uses a private device ID so the
// old shared `shoplist` data is never mixed with the new app data.
function getOrCreateGuestId() {
  let id = localStorage.getItem("shoplist_guest_id");
  if (!id) {
    id = `guest_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    localStorage.setItem("shoplist_guest_id", id);
  }
  return id;
}

function userRoot() {
  return ref(database, `users/${state.userId}`);
}

function listsRoot() {
  return ref(database, `users/${state.userId}/lists`);
}

function historyRoot() {
  return ref(database, `users/${state.userId}/history`);
}

function init() {
  renderCategories();
  bindEvents();
  subscribeToData();
  showApp();
}

function showApp() {
  $("auth-screen").classList.add("hidden");
  $("app-screen").classList.remove("hidden");
  $("welcome-name").textContent = `Ready when you are, ${state.userName}.`;
  $("account-name").textContent = state.userName;
  $("account-email").textContent = "Device account · Authentication coming next";
  $("account-button").textContent = state.userName.charAt(0).toUpperCase();
}

function renderCategories() {
  categoryGrid.innerHTML = categories.map(category => `
    <button class="category-card" type="button" data-category="${category.id}">
      <span class="category-icon">${category.icon}</span>
      <span><h3>${category.name}</h3><p>${category.description}</p></span>
    </button>
  `).join("");
  $("category-count").textContent = categories.length;
}

function bindEvents() {
  categoryGrid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-category]");
    if (card) openCategory(card.dataset.category);
  });

  $("item-form").addEventListener("submit", addItem);
  $("shopping-list").addEventListener("click", toggleItem);
  $("back-to-categories").addEventListener("click", () => showView("categories"));
  $("complete-button").addEventListener("click", () => openModal("complete-modal"));
  $("save-complete-button").addEventListener("click", completeShopping);
  $("history-button").addEventListener("click", () => showView("history"));
  $("history-nav").addEventListener("click", () => showView("history"));
  $("home-nav").addEventListener("click", () => showView("categories"));
  $("account-button").addEventListener("click", () => openModal("account-panel"));
  $("history-currency").addEventListener("change", (e) => {
    state.historyCurrency = e.target.value;
    renderHistory();
  });

  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => closeModal(button.dataset.close));
  });

  // The original authentication screen is retained visually; this account uses the existing Firebase
  // database until an Authentication Web App config is supplied.
  $("auth-toggle").addEventListener("click", () => {
    showToast("Login will be enabled after Firebase Authentication is connected.");
  });
  $("auth-form").addEventListener("submit", (event) => {
    event.preventDefault();
    showToast("This first upgrade uses a private device account. Firebase login is next.");
  });
}

function subscribeToData() {
  onValue(listsRoot(), snapshot => {
    const raw = snapshot.val() || {};
    state.items = Object.entries(raw).map(([id, value]) => ({ id, ...value }));
    if (state.currentCategory) renderList();
  });

  onValue(historyRoot(), snapshot => {
    const raw = snapshot.val() || {};
    state.history = Object.entries(raw).map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    if (!$("history-view").classList.contains("hidden")) renderHistory();
  });
}

function openCategory(categoryId) {
  state.currentCategory = categoryId;
  const category = categories.find(item => item.id === categoryId);
  $("list-icon").textContent = category.icon;
  $("list-title").textContent = category.name;
  showView("list");
  renderList();
}

function showView(view) {
  $("categories-view").classList.toggle("hidden", view !== "categories");
  $("list-view").classList.toggle("hidden", view !== "list");
  $("history-view").classList.toggle("hidden", view !== "history");
  $("page-title").textContent = view === "history" ? "History" : view === "list" ? "Shopping list" : "My lists";
  $("home-nav").classList.toggle("active", view !== "history");
  $("history-nav").classList.toggle("active", view === "history");
  if (view === "history") renderHistory();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function addItem(event) {
  event.preventDefault();
  const input = $("item-input");
  const text = input.value.trim();
  if (!text || !state.currentCategory) return;

  await push(listsRoot(), {
    category: state.currentCategory,
    text,
    completed: false,
    createdAt: Date.now()
  });
  input.value = "";
  input.focus();
}

async function toggleItem(event) {
  const item = event.target.closest("[data-item-id]");
  if (!item) return;
  const id = item.dataset.itemId;
  const current = state.items.find(entry => entry.id === id);
  if (!current) return;
  await update(ref(database, `users/${state.userId}/lists/${id}`), { completed: !current.completed });
}

function renderList() {
  if (!state.currentCategory) return;
  const items = state.items.filter(item => item.category === state.currentCategory);
  const completed = items.filter(item => item.completed).length;
  const percent = items.length ? Math.round((completed / items.length) * 100) : 0;

  $("list-subtitle").textContent = `${items.length} item${items.length === 1 ? "" : "s"} · ${completed} done`;
  $("progress-label").textContent = `${percent}%`;
  $("progress-bar").style.width = `${percent}%`;

  shoppingList.innerHTML = items.map(item => `
    <li class="shopping-item ${item.completed ? "completed" : ""}" data-item-id="${item.id}">
      <span class="check-circle">✓</span>
      <span class="item-text">${escapeHtml(item.text)}</span>
    </li>
  `).join("");

  emptyList.classList.toggle("hidden", items.length > 0);
  const completeButton = $("complete-button");
  const allDone = items.length > 0 && completed === items.length;
  completeButton.classList.toggle("hidden", !allDone);
}

async function completeShopping() {
  const items = state.items.filter(item => item.category === state.currentCategory);
  if (!items.length || items.some(item => !item.completed)) return;
  $("amount-input").value = "";
  openModal("complete-modal");
}

async function saveShopping() {
  const amount = Number($("amount-input").value);
  const currency = $("currency-input").value;
  if (!Number.isFinite(amount) || amount < 0) {
    showToast("Please enter a valid amount.");
    return;
  }

  const category = categories.find(item => item.id === state.currentCategory);
  await push(historyRoot(), {
    category: state.currentCategory,
    categoryName: category.name,
    amount,
    currency,
    itemCount: state.items.filter(item => item.category === state.currentCategory).length,
    completedAt: Date.now()
  });

  const updates = {};
  state.items.filter(item => item.category === state.currentCategory).forEach(item => {
    updates[item.id] = null;
  });
  await update(listsRoot(), updates);
  closeModal("complete-modal");
  showToast("Shopping saved to history.");
  showView("categories");
}

function completeShoppingLegacyGuard() {
  return completeShopping;
}

$("save-complete-button").addEventListener("click", saveShopping);

function renderHistory() {
  const currency = state.historyCurrency;
  const relevant = state.history.filter(item => item.currency === currency);
  const total = relevant.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const shoppingCount = relevant.length;
  const thisMonthKey = monthKey(Date.now());
  const monthTotal = relevant.filter(item => monthKey(item.completedAt) === thisMonthKey)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  $("history-summary").innerHTML = `
    <div class="summary-card"><span class="label">All time</span><strong>${formatMoney(total, currency)}</strong></div>
    <div class="summary-card"><span class="label">This month</span><strong>${formatMoney(monthTotal, currency)}</strong></div>
    <div class="summary-card"><span class="label">Completed trips</span><strong>${shoppingCount}</strong></div>
    <div class="summary-card"><span class="label">Categories</span><strong>${new Set(state.history.map(item => item.category)).size}</strong></div>
  `;

  const months = getLastMonths(6);
  const values = months.map(key => relevant.filter(item => monthKey(item.completedAt) === key)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0));
  const max = Math.max(...values, 1);
  $("history-chart").innerHTML = months.map((key, index) => {
    const height = Math.max(3, Math.round((values[index] / max) * 130));
    return `<div class="chart-column"><span class="chart-value">${values[index] ? formatMoney(values[index], currency, true) : ""}</span><div class="chart-bar" style="height:${height}px"></div><span class="chart-label">${key.slice(5)}</span></div>`;
  }).join("");

  $("history-list").innerHTML = state.history.length ? state.history.slice(0, 20).map(item => `
    <div class="history-row">
      <div><strong>${escapeHtml(item.categoryName || item.category)}</strong><small>${formatDate(item.completedAt)} · ${item.itemCount || 0} items</small></div>
      <span class="history-amount">${formatMoney(item.amount, item.currency)}</span>
    </div>
  `).join("") : `<p class="muted" style="font-size:13px;margin:0">No completed shopping yet.</p>`;
}

function openModal(id) { $(id).classList.remove("hidden"); }
function closeModal(id) { $(id).classList.add("hidden"); }
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}
function formatMoney(value, currency, compact = false) {
  const locale = currency === "TRY" ? "tr-TR" : currency === "USD" ? "en-US" : "de-DE";
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: compact ? 0 : 2 }).format(Number(value || 0));
}
function formatDate(timestamp) { return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(timestamp); }
function monthKey(timestamp) { const date = new Date(timestamp); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`; }
function getLastMonths(count) {
  const result = [];
  const date = new Date();
  date.setDate(1);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  }
  return result;
}
function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;","\"":"&quot;"}[char]));
}

// Wire the actual save handler after all functions are declared.
$("save-complete-button").onclick = saveShopping;
init();
