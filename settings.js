const SETTINGS_KEYS={hand:"shoplist_hand",theme:"shoplist_theme"};
const body=document.body;
const settingsModal=document.getElementById("settings-modal");
const settingsButton=document.getElementById("settings-button");
const handButtons=[...document.querySelectorAll("[data-hand-choice]")];
const themeButtons=[...document.querySelectorAll("[data-theme-choice]")];
const settingsCloseButtons=[...document.querySelectorAll("[data-close-settings]")];

function getPreference(key,fallback){return localStorage.getItem(key)||fallback}
function applyHand(hand){const value=hand==="right"?"right":"left";body.dataset.hand=value;localStorage.setItem(SETTINGS_KEYS.hand,value);handButtons.forEach(btn=>btn.classList.toggle("active",btn.dataset.handChoice===value))}
function applyTheme(theme){const value=theme==="dark"?"dark":"light";body.dataset.theme=value;localStorage.setItem(SETTINGS_KEYS.theme,value);themeButtons.forEach(btn=>btn.classList.toggle("active",btn.dataset.themeChoice===value));const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute("content",value==="dark"?"#0b0f14":"#111827")}
function openSettings(){settingsModal?.classList.remove("hidden")}
function closeSettings(){settingsModal?.classList.add("hidden")}

applyHand(getPreference(SETTINGS_KEYS.hand,"left"));
applyTheme(getPreference(SETTINGS_KEYS.theme,"light"));
settingsButton?.addEventListener("click",openSettings);
settingsCloseButtons.forEach(btn=>btn.addEventListener("click",closeSettings));
settingsModal?.addEventListener("click",e=>{if(e.target===settingsModal)closeSettings()});
handButtons.forEach(btn=>btn.addEventListener("click",()=>applyHand(btn.dataset.handChoice)));
themeButtons.forEach(btn=>btn.addEventListener("click",()=>applyTheme(btn.dataset.themeChoice)));
