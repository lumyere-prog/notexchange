// 🔥 QR + INSTALL SETUP

// Generate QR
function generateQRCode() {
    const qrContainer = document.getElementById("qrcode");

    if (!qrContainer) return; // prevent errors

    new QRCode(qrContainer, {
        text: "https://notexchangedb.web.app/", // 🔥 CHANGE THIS
        width: 200,
        height: 200
    });
}



// Handle install prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

// Install button function
function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
            deferredPrompt = null;
        });
    }
}

// Run when page loads
window.addEventListener("DOMContentLoaded", () => {
    generateQRCode();
});

// Make installApp global (so button can use it)
window.installApp = installApp;