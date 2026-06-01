// Fluxo de instalação PWA no Android/iOS
// Dependências importadas pelo arquivo principal: ../aluno.js

function setupInstallFlow() {
  if (!installBtn) return;

  hideInstallButton();

  if (isAndroidDevice() && !isStandaloneMode()) {
    showInstallButton();
    installBtn.textContent = "Instalar app";
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installPromptSeen = true;

    if (isAndroidDevice() && !isStandaloneMode()) {
      installBtn.textContent = "Instalar app";
      showInstallButton();
    }
  });

  installBtn.addEventListener("click", async () => {
    if (isStandaloneMode()) return hideInstallButton();

    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } finally {
        deferredPrompt = null;
        isStandaloneMode() ? hideInstallButton() : showInstallButton();
      }

      return;
    }

    if (isAndroidDevice()) return showAndroidManualInstall();

    if (isIOSDevice()) {
      const modal = document.getElementById("iosInstallModal");
      modal?.classList.add("show");
      modal?.setAttribute("aria-hidden", "false");
    }
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    hideInstallButton();
  });

  setTimeout(() => {
    if (isAndroidDevice() && !isStandaloneMode() && !installPromptSeen) {
      installBtn.textContent = "Instalar app";
      showInstallButton();
    }
  }, 2500);
}

setupInstallFlow();

(function iosInstallModalInit() {
  const modal = document.getElementById("iosInstallModal");

  if (!modal || !isIOSDevice() || isStandaloneMode()) return;

  const key = "rf_ios_install_hide_until";
  const hideUntil = Number(localStorage.getItem(key) || "0");

  if (hideUntil && Date.now() < hideUntil) return;

  const closeBtn = document.getElementById("iosInstallClose");
  const laterBtn = document.getElementById("iosLaterBtn");
  const okBtn = document.getElementById("iosOkBtn");
  const dontShowChk = document.getElementById("iosDontShowChk");

  function open() {
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }

  function close() {
    if (dontShowChk?.checked) {
      localStorage.setItem(key, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    }

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }

  closeBtn?.addEventListener("click", close);
  laterBtn?.addEventListener("click", close);
  okBtn?.addEventListener("click", close);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  setTimeout(open, 700);
})();
