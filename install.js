let deferredInstallPrompt=null;

const installCard=document.getElementById("install-card");
const installButton=document.getElementById("install-app-button");
const installModal=document.getElementById("install-modal");
const installModalTitle=document.getElementById("install-modal-title");
const installModalCopy=document.getElementById("install-modal-copy");
const installSteps=document.getElementById("install-steps");
const closeInstallButtons=document.querySelectorAll("[data-close-install]");

function isStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone===true;
}

function isIOS(){
  return /iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
}

function isMobile(){
  return isIOS()||/android/i.test(navigator.userAgent);
}

function updateInstallVisibility(){
  if(!installCard)return;
  if(isStandalone()){
    installCard.classList.add("hidden");
    return;
  }
  if(isIOS()){
    installCard.classList.remove("hidden");
    return;
  }
  installCard.classList.toggle("hidden",!deferredInstallPrompt);
}

function openInstallModal(){
  if(!installModal)return;
  if(isIOS()){
    installModalTitle.textContent="Add ShopList to Home Screen";
    installModalCopy.textContent="On iPhone or iPad, add ShopList from the browser share menu.";
    installSteps.innerHTML=`
      <div class="install-step"><span>1</span><div><strong>Open in Safari</strong><small>If you are using another browser, open this page in Safari first.</small></div></div>
      <div class="install-step"><span>2</span><div><strong>Tap Share ↑</strong><small>Use the Share button in Safari.</small></div></div>
      <div class="install-step"><span>3</span><div><strong>Add to Home Screen</strong><small>Scroll if needed, then tap “Add to Home Screen”.</small></div></div>
      <div class="install-step"><span>4</span><div><strong>Tap Add</strong><small>ShopList will appear on your Home Screen with its app icon.</small></div></div>`;
  }else{
    installModalTitle.textContent="Install ShopList";
    installModalCopy.textContent="Your browser did not open the install prompt. Use the browser menu and choose Install app or Add to Home screen.";
    installSteps.innerHTML=`<div class="install-step"><span>⋮</span><div><strong>Browser menu</strong><small>Choose “Install app” or “Add to Home screen”.</small></div></div>`;
  }
  installModal.classList.remove("hidden");
}

async function requestInstall(){
  if(isStandalone()){
    updateInstallVisibility();
    return;
  }
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    try{await deferredInstallPrompt.userChoice}catch{}
    deferredInstallPrompt=null;
    updateInstallVisibility();
    return;
  }
  openInstallModal();
}

window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();
  deferredInstallPrompt=event;
  updateInstallVisibility();
});

window.addEventListener("appinstalled",()=>{
  deferredInstallPrompt=null;
  installCard?.classList.add("hidden");
  installModal?.classList.add("hidden");
});

window.matchMedia("(display-mode: standalone)").addEventListener?.("change",updateInstallVisibility);
window.addEventListener("pageshow",updateInstallVisibility);

installButton?.addEventListener("click",requestInstall);
closeInstallButtons.forEach(button=>button.addEventListener("click",()=>installModal?.classList.add("hidden")));
installModal?.addEventListener("click",event=>{if(event.target===installModal)installModal.classList.add("hidden")});

if(!isMobile()&&!deferredInstallPrompt)installCard?.classList.add("hidden");
updateInstallVisibility();