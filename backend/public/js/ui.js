/* ===================================
   QRForge - UI & Utilities Module
   Handles tabs, selectors, and notifications
   =================================== */

function initTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = `tab-${tab.dataset.tab}`;
            
            if (tab.dataset.tab === 'analytics' && typeof refreshAnalytics === 'function') {
                refreshAnalytics();
            }

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            contents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetId) {
                    content.classList.add('active');
                }
            });
        });
    });
}

function initQRTypeSelector() {
    const typeButtons = document.querySelectorAll('.qr-type-btn');
    const forms = document.querySelectorAll('.input-form');
    
    typeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            currentType = btn.dataset.type;
            
            typeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            forms.forEach(form => {
                form.classList.remove('active');
                if (form.id === `form-${currentType}`) {
                    form.classList.add('active');
                }
            });
        });
    });
}

function initStyleSelectors() {
    const patternBtns = document.querySelectorAll('.style-btn');
    patternBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            patternBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPattern = btn.dataset.pattern;
        });
    });
    
    const cornerBtns = document.querySelectorAll('.corner-btn');
    cornerBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            cornerBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCorner = btn.dataset.corner;
        });
    });

    // Gradient Toggle
    const gradientCheck = document.getElementById('gradient-enabled');
    const gradientOptions = document.getElementById('gradient-options');
    gradientCheck?.addEventListener('change', () => {
        gradientOptions.style.display = gradientCheck.checked ? 'block' : 'none';
    });

    // Gradient Type Buttons
    const gradientBtns = document.querySelectorAll('.gradient-btn');
    gradientBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            gradientBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}


function initLogoUpload() {
    const uploadArea = document.getElementById('logo-upload-area');
    const fileInput = document.getElementById('logo-input');
    const placeholder = document.getElementById('upload-placeholder');
    const preview = document.getElementById('logo-preview');
    const previewImg = document.getElementById('logo-preview-img');
    const removeBtn = document.getElementById('remove-logo');
    const controls = document.getElementById('logo-controls');
    
    uploadArea?.addEventListener('click', () => fileInput.click());
    
    uploadArea?.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--color-accent-1)';
    });
    
    uploadArea?.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '';
    });
    
    uploadArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handleLogoFile(file);
    });
    
    fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleLogoFile(file);
    });
    
    removeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        logoImage = null;
        placeholder.style.display = 'flex';
        preview.style.display = 'none';
        controls.style.display = 'none';
        uploadArea.classList.remove('has-logo');
        fileInput.value = '';
    });
    
    function handleLogoFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            logoImage = new Image();
            logoImage.src = e.target.result;
            previewImg.src = e.target.result;
            placeholder.style.display = 'none';
            preview.style.display = 'block';
            controls.style.display = 'block';
            uploadArea.classList.add('has-logo');
        };
        reader.readAsDataURL(file);
    }
    
    const logoSizeSlider = document.getElementById('logo-size');
    const logoSizeValue = document.getElementById('logo-size-value');
    logoSizeSlider?.addEventListener('input', (e) => {
        logoSizeValue.textContent = e.target.value;
    });
    
    const logoPaddingSlider = document.getElementById('logo-padding');
    const logoPaddingValue = document.getElementById('logo-padding-value');
    logoPaddingSlider?.addEventListener('input', (e) => {
        logoPaddingValue.textContent = e.target.value;
    });
}

function initColorInputs() {
    const colorInputs = document.querySelectorAll('.color-input');
    colorInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const valueSpan = e.target.nextElementSibling;
            if (valueSpan && valueSpan.classList.contains('color-value')) {
                valueSpan.textContent = e.target.value;
            }
        });
    });
}

function initSizeSlider() {
    const sizeSlider = document.getElementById('qr-size');
    const sizeValue = document.getElementById('size-value');
    sizeSlider?.addEventListener('input', (e) => {
        sizeValue.textContent = e.target.value;
    });
}

function initEnterpriseOptions() {
    const passwordCheck = document.getElementById('password-protect');
    const passwordField = document.getElementById('password-field');
    const expiryCheck = document.getElementById('set-expiry');
    const expiryField = document.getElementById('expiry-field');
    
    passwordCheck?.addEventListener('change', () => {
        passwordField.style.display = passwordCheck.checked ? 'block' : 'none';
    });
    
    expiryCheck?.addEventListener('change', () => {
        expiryField.style.display = expiryCheck.checked ? 'block' : 'none';
    });
}

function showToast(message) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

function formatICalDate(dateString) {
    const date = new Date(dateString);
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
