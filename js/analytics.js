/* ===================================
   QRForge - Analytics Module
   Backend integration for tracking
   =================================== */

// API_BASE is defined in generator.js


function initDynamicQR() {
    const createBtn = document.getElementById('create-dynamic-btn');
    const dynamicUrlInput = document.getElementById('dynamic-url');
    const dynamicNameInput = document.getElementById('dynamic-name');
    const trackableUrl = document.getElementById('trackable-url');
    
    const creationPanel = document.querySelector('.dynamic-creation-panel');
    const successPanel = document.getElementById('dynamic-success-panel');
    
    createBtn?.addEventListener('click', async () => {
        const url = dynamicUrlInput?.value.trim();
        const name = dynamicNameInput?.value.trim() || 'Untitled Dynamic QR';
        
        if (!url) {
            showToast('Please enter a target URL');
            return;
        }

        createBtn.disabled = true;
        createBtn.textContent = 'Generating Trackable Link...';

        try {
            const response = await fetch(`${API_BASE}/api/qr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUrl: url, name: name })
            });

            const data = await response.json();
            
            if (data.shortUrl) {
                // Show success panel
                creationPanel.style.display = 'none';
                successPanel.style.display = 'block';
                
                trackableUrl.textContent = data.shortUrl.replace('http://', '').replace('https://', '');
                
                // Store state for designer
                localStorage.setItem('pending_dynamic_url', data.shortUrl);
                localStorage.setItem('last_qr_id', data.id);
                
                showToast('Dynamic link generated successfully!');
            }
        } catch (err) {
            console.error('Backend error:', err);
            showToast('Connection failed. Please check if server is running.');
        } finally {
            createBtn.disabled = false;
            createBtn.textContent = 'Create trackable Dynamic QR';
        }
    });
}

function goToDesigner() {
    const url = localStorage.getItem('pending_dynamic_url');
    if (url) {
        // Switch to single tab
        document.querySelector('.nav-tab[data-tab="single"]').click();
        
        // Populate and generate
        const urlInput = document.getElementById('url-input');
        if (urlInput) {
            urlInput.value = url;
            // Trigger a silent generation for preview
            if (typeof generateQRCode === 'function') {
                generateQRCode(true);
            }
        }
    }
}

function resetDynamicForm() {
    document.querySelector('.dynamic-creation-panel').style.display = 'block';
    document.getElementById('dynamic-success-panel').style.display = 'none';
    document.getElementById('dynamic-url').value = '';
    document.getElementById('dynamic-name').value = '';
}

function copyTrackableLink() {
    const url = document.getElementById('trackable-url')?.textContent;
    if (url) {
        // Use full URL for copying
        const fullUrl = url.startsWith('http') ? url : `http://${url}`;
        navigator.clipboard.writeText(fullUrl);
        showToast('Trackable link copied to clipboard!');
    }
}



async function refreshAnalytics() {
    const qrId = localStorage.getItem('last_qr_id');
    if (!qrId) return;

    try {
        const response = await fetch(`${API_BASE}/api/analytics/${qrId}`);
        const data = await response.json();
        
        if (data.analytics) {
            const stats = data.analytics;
            document.getElementById('total-scans').textContent = stats.totalScans;
            document.getElementById('unique-scans').textContent = stats.uniqueVisitors;
            document.getElementById('today-scans').textContent = stats.totalScans;
            
            const total = stats.totalScans || 1;
            const mobilePct = (stats.devices.mobile / total) * 100;
            const tabletPct = (stats.devices.tablet / total) * 100;
            const desktopPct = (stats.devices.desktop / total) * 100;

            document.querySelector('.device-row:nth-child(1) .device-fill').style.width = `${mobilePct}%`;
            document.querySelector('.device-row:nth-child(1) .device-percent').textContent = `${Math.round(mobilePct)}%`;
            document.querySelector('.device-row:nth-child(2) .device-fill').style.width = `${desktopPct}%`;
            document.querySelector('.device-row:nth-child(2) .device-percent').textContent = `${Math.round(desktopPct)}%`;
            document.querySelector('.device-row:nth-child(3) .device-fill').style.width = `${tabletPct}%`;
            document.querySelector('.device-row:nth-child(3) .device-percent').textContent = `${Math.round(tabletPct)}%`;

            const bars = document.querySelectorAll('.demo-chart .bar');
            bars.forEach(bar => {
                if (stats.totalScans > 0) bar.style.height = `${20 + Math.random() * 70}%`;
                else bar.style.height = '10%';
            });
        }
    } catch (err) {
        console.log('Analytics backend offline');
    }
}
