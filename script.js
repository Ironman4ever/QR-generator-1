/* ===================================
   QRForge - Main Entry Point
   Coordinates all modules
   =================================== */

// Global State
let currentType = 'url';
let currentPattern = 'square';
let currentCorner = 'square';
let logoImage = null;
let downloadSize = 500;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI
    initTabs();
    initQRTypeSelector();
    initStyleSelectors();
    initLogoUpload();
    initColorInputs();
    initSizeSlider();
    initEnterpriseOptions();
    
    // Initialize Functional Modules
    initQRGenerator();
    initDownloadButtons();
    initBulkGenerator();
    initDynamicQR();
    
    console.log('🚀 QRForge Modules Loaded Separately!');
});
