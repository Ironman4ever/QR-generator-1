/* ===================================
   QRForge - Bulk Generation Module
   Handles CSV parsing and Backend ZIP creation
   =================================== */

function initBulkGenerator() {
    const csvUploadArea = document.getElementById('csv-upload-area');
    const csvInput = document.getElementById('csv-input');
    const bulkBtn = document.getElementById('bulk-generate-btn');
    
    let csvData = [];
    
    csvUploadArea?.addEventListener('click', () => csvInput.click());
    
    csvUploadArea?.addEventListener('dragover', (e) => {
        e.preventDefault();
        csvUploadArea.style.borderColor = 'var(--color-accent-1)';
    });
    
    csvUploadArea?.addEventListener('drop', (e) => {
        e.preventDefault();
        csvUploadArea.style.borderColor = '';
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.csv')) parseCSV(file);
    });
    
    csvInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) parseCSV(file);
    });
    
    function parseCSV(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim());
            csvData = lines.map(line => {
                const [name, content, type] = line.split(',').map(s => s.trim());
                return { name: name || 'qrcode', content, type: type || 'url' };
            });
            
            document.getElementById('csv-preview-section').style.display = 'block';
            document.getElementById('csv-count').textContent = csvData.length;
            
            const previewDiv = document.getElementById('csv-preview');
            previewDiv.innerHTML = csvData.slice(0, 5).map(item => 
                `<div style="padding: 8px; background: var(--color-bg-primary); margin: 4px 0; border-radius: 4px; font-size: 0.8rem;">
                    <strong>${item.name}</strong>: ${item.content?.substring(0, 40)}...
                </div>`
            ).join('') + (csvData.length > 5 ? `<div style="color: var(--color-text-muted); font-size: 0.8rem;">...and ${csvData.length - 5} more</div>` : '');
            
            bulkBtn.disabled = false;
        };
        reader.readAsText(file);
    }
    
    bulkBtn?.addEventListener('click', async () => {
        if (csvData.length === 0) return;
        bulkBtn.disabled = true;
        bulkBtn.innerHTML = '<span>Processing on Server...</span>';
        
        const bulkColor = document.getElementById('bulk-color')?.value || '#000000';
        const bulkBg = document.getElementById('bulk-bg')?.value || '#ffffff';
        const bulkSize = parseInt(document.getElementById('bulk-size')?.value || 512);
        const bulkFormat = document.getElementById('bulk-format')?.value || 'png';
        
        // Inherit global pattern/corner styles from UI
        // We reuse logic from generator.js indirectly by reading constants
        const config = {
            size: bulkSize,
            qrColor: bulkColor,
            bgColor: bulkBg,
            pattern: currentPattern,
            corner: currentCorner,
            // For bulk, we might skip logo or inherit it. 
            // Let's assume we inherit logic if logoImage exists globally.
            logoBase64: typeof getLogoBase64 === 'function' && logoImage ? getLogoBase64() : null
        };

        try {
            const response = await fetch(`${API_BASE}/api/generate/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    items: csvData, 
                    config, 
                    format: bulkFormat 
                })
            });

            if (!response.ok) throw new Error('Bulk generation failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'qrcodes.zip';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            showToast(`${csvData.length} QR codes downloaded!`);
        } catch (err) {
            console.error('Bulk generation error:', err);
            showToast('Error: Backend failed');
        } finally {
            bulkBtn.disabled = false;
            bulkBtn.innerHTML = '<span>Generate & Download ZIP</span>';
        }
    });
}
