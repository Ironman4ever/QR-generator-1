/* ===================================
   QRForge - Generator & Downloads Module
   Core QR creation and file export
   =================================== */

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000' 
    : window.location.origin + window.location.pathname.replace(/\/$/, ""); 
// This ensures that if you host at rapidreelz.in/QR, it calls rapidreelz.in/QR/api



let livePreviewTimeout;

function initQRGenerator() {
    const generateBtn = document.getElementById('generate-btn');
    generateBtn?.addEventListener('click', generateQRCode);
    
    const sizeBtns = document.querySelectorAll('.size-btn');
    sizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            downloadSize = parseInt(btn.dataset.size);
            triggerLivePreview();
        });
    });

    // Add live preview listeners to all inputs
    const liveInputs = document.querySelectorAll('input, textarea, select');
    liveInputs.forEach(input => {
        input.addEventListener('input', triggerLivePreview);
        input.addEventListener('change', triggerLivePreview);
    });

    // Also watch for style button clicks in ui.js indirectly
    document.addEventListener('click', (e) => {
        if (e.target.closest('.style-btn') || e.target.closest('.corner-btn') || e.target.closest('.gradient-btn')) {
            triggerLivePreview();
        }
    });
}

function triggerLivePreview() {
    clearTimeout(livePreviewTimeout);
    livePreviewTimeout = setTimeout(() => {
        // Only auto-generate if there is some data
        if (getQRData()) {
            generateQRCode(true); // true means it's a silent live update
        }
    }, 500); // 500ms debounce
}


function getConfig() {
    const qrColor = document.getElementById('qr-color').value;
    const bgColor = document.getElementById('bg-color').value;
    const logoSize = parseInt(document.getElementById('logo-size')?.value || 20);
    const logoPadding = parseInt(document.getElementById('logo-padding')?.value || 5);
    const ecc = document.getElementById('error-correction')?.value || 'M';

    // Gradient Config
    const gradientEnabled = document.getElementById('gradient-enabled')?.checked || false;
    const activeGradientBtn = document.querySelector('.gradient-btn.active');
    const gradientType = activeGradientBtn?.dataset.gradientType || 'linear';
    const gradientStart = document.getElementById('gradient-start')?.value || '#6366f1';
    const gradientEnd = document.getElementById('gradient-end')?.value || '#ec4899';

    return {
        qrColor,
        bgColor,
        pattern: currentPattern, // Global from script.js
        corner: currentCorner,   // Global from script.js
        logoSize,
        logoPadding,
        ecc,
        logoBase64: logoImage ? getLogoBase64() : null,
        gradient: {
            enabled: gradientEnabled,
            type: gradientType,
            startColor: gradientStart,
            endColor: gradientEnd
        }
    };
}


function getLogoBase64() {
    if (!logoImage) return null;
    const canvas = document.createElement('canvas');
    canvas.width = logoImage.width;
    canvas.height = logoImage.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(logoImage, 0, 0);
    return canvas.toDataURL('image/png');
}

async function generateQRCode(silent = false) {
    const data = getQRData();
    if (!data) {
        if (!silent) showToast('Please enter some data first!');
        return;
    }
    
    const displaySize = parseInt(document.getElementById('qr-size').value);
    const config = { ...getConfig(), size: displaySize };
    
    const qrDisplay = document.getElementById('qr-display');
    const placeholder = qrDisplay.querySelector('.qr-placeholder');
    const canvas = document.getElementById('qr-canvas');
    
    // Show Loading State (Optional: Add spinner)
    if (!silent) showToast('Generating on server...');

    try {
        const response = await fetch(`${API_BASE}/api/generate/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, config })
        });


        if (!response.ok) throw new Error('Server generation failed');
        
        const { dataUrl } = await response.json();
        
        // Render to Canvas for consistency with UI
        const img = new Image();
        img.onload = () => {
            placeholder.style.display = 'none';
            canvas.style.display = 'block';
            canvas.width = displaySize;
            canvas.height = displaySize;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, displaySize, displaySize);
            ctx.drawImage(img, 0, 0);
            
            document.getElementById('download-section').style.display = 'block';
            if (!silent) showToast('QR Code generated!');
        };

        img.src = dataUrl;

    } catch (error) {
        console.error('QR generation error:', error);
        showToast('Error: Is backend running?');
    }
}

function getQRData() {
    // Existing logic from previous file (kept for brevity/completeness)
    // We assume currentType is global
    switch (currentType) {
        case 'url': return document.getElementById('url-input')?.value.trim() || null;
        case 'text': return document.getElementById('text-input')?.value.trim() || null;
        case 'wifi':
            const ssid = document.getElementById('wifi-ssid')?.value.trim();
            const password = document.getElementById('wifi-password')?.value || '';
            const encryption = document.getElementById('wifi-encryption')?.value || 'WPA';
            return ssid ? `WIFI:T:${encryption};S:${ssid};P:${password};;` : null;
        case 'vcard':
            const fn = document.getElementById('vcard-firstname')?.value.trim() || '';
            const ln = document.getElementById('vcard-lastname')?.value.trim() || '';
            if (!fn && !ln) return null;
            let vcard = `BEGIN:VCARD\nVERSION:3.0\nN:${ln};${fn};;;\nFN:${fn} ${ln}\n`;
            const phone = document.getElementById('vcard-phone')?.value.trim();
            const email = document.getElementById('vcard-email')?.value.trim();
            const company = document.getElementById('vcard-company')?.value.trim();
            if (phone) vcard += `TEL:${phone}\n`;
            if (email) vcard += `EMAIL:${email}\n`;
            if (company) vcard += `ORG:${company}\n`;
            return vcard + 'END:VCARD';
        case 'email':
            const addr = document.getElementById('email-address')?.value.trim();
            if (!addr) return null;
            let mailto = `mailto:${addr}`;
            const subj = document.getElementById('email-subject')?.value.trim();
            const body = document.getElementById('email-body')?.value.trim();
            if (subj || body) {
                const params = [];
                if (subj) params.push(`subject=${encodeURIComponent(subj)}`);
                if (body) params.push(`body=${encodeURIComponent(body)}`);
                mailto += `?${params.join('&')}`;
            }
            return mailto;
        case 'sms':
            const smsPhone = document.getElementById('sms-phone')?.value.trim();
            if (!smsPhone) return null;
            const smsMsg = document.getElementById('sms-message')?.value.trim();
            return `sms:${smsPhone}${smsMsg ? `?body=${encodeURIComponent(smsMsg)}` : ''}`;
        case 'phone':
            const phoneNum = document.getElementById('phone-number')?.value.trim();
            return phoneNum ? `tel:${phoneNum}` : null;
        case 'location':
            const lat = document.getElementById('location-lat')?.value.trim();
            const lng = document.getElementById('location-lng')?.value.trim();
            const query = document.getElementById('location-query')?.value.trim();
            if (lat && lng) return `geo:${lat},${lng}`;
            if (query) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
            return null;
        case 'event':
            const title = document.getElementById('event-title')?.value.trim();
            if (!title) return null;
            const start = document.getElementById('event-start')?.value;
            const end = document.getElementById('event-end')?.value;
            let ical = `BEGIN:VEVENT\nSUMMARY:${title}\n`;
            if (start) ical += `DTSTART:${formatICalDate(start)}\n`;
            if (end) ical += `DTEND:${formatICalDate(end)}\n`;
            return ical + 'END:VEVENT';
        default: return null;
    }
}

/**
 * Downloads & Exporting
 * Triggers backend stream download
 */
function initDownloadButtons() {
    document.getElementById('download-png')?.addEventListener('click', () => downloadFile('png'));
    document.getElementById('download-svg')?.addEventListener('click', () => downloadFile('svg'));
    document.getElementById('download-pdf')?.addEventListener('click', () => downloadFile('pdf'));
    document.getElementById('download-eps')?.addEventListener('click', () => downloadFile('svg')); // EPS mapped to SVG for now
    document.getElementById('copy-btn')?.addEventListener('click', copyToClipboard);
}

async function downloadFile(format) {
    const data = getQRData();
    if (!data) return;
    
    const config = { ...getConfig(), size: downloadSize };
    showToast(`Downloading ${format.toUpperCase()}...`);

    try {
        const response = await fetch(`${API_BASE}/api/generate/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data, config, format })
        });

        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `qrcode.${format === 'eps' ? 'svg' : format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        showToast('Download started!');
    } catch (err) {
        console.error('Download error:', err);
        showToast('Download failed');
    }
}

async function copyToClipboard() {
    const canvas = document.getElementById('qr-canvas');
    if (!canvas) return;
    try {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('Copied to clipboard!');
    } catch (err) {
        showToast('Could not copy to clipboard');
    }
}

function formatICalDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
