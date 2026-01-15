/* ===================================
   QRForge Backend - Renderer
   Adapts client-side rendering for Node Canvas
   =================================== */

const { loadImage } = require('canvas');

/**
 * Custom QR Rendering Engine (Backend Version)
 * config: { pattern, corner, qrColor, bgColor, gradient, logoSize, logoPadding }
 * gradient: { enabled, type, startColor, endColor }
 */
async function drawStyledQR(ctx, sourceCanvas, size, config) {
    const { 
        pattern = 'square', 
        corner = 'square', 
        qrColor = '#000000', 
        bgColor = '#ffffff',
        gradient = null
    } = config;

    const sourceCtx = sourceCanvas.getContext('2d');
    const imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const data = imageData.data;
    
    // Create gradient or solid color for dark modules
    let darkColor;
    if (gradient && gradient.enabled) {
        const { type = 'linear', startColor = '#6366f1', endColor = '#8b5cf6' } = gradient;
        
        if (type === 'linear') {
            darkColor = ctx.createLinearGradient(0, 0, size, size);
        } else if (type === 'radial') {
            darkColor = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
        } else if (type === 'horizontal') {
            darkColor = ctx.createLinearGradient(0, 0, size, 0);
        } else if (type === 'vertical') {
            darkColor = ctx.createLinearGradient(0, 0, 0, size);
        } else {
            darkColor = ctx.createLinearGradient(0, 0, size, size);
        }
        
        darkColor.addColorStop(0, startColor);
        darkColor.addColorStop(1, endColor);
    } else {
        darkColor = qrColor;
    }
    
    const lightColor = bgColor;

    
    // 1. Detect module count
    let firstDarkX = -1, firstDarkY = -1;
    for (let y = 0; y < sourceCanvas.height; y++) {
        for (let x = 0; x < sourceCanvas.width; x++) {
            const i = (y * sourceCanvas.width + x) * 4;
            if (data[i] < 128) {
                firstDarkX = x;
                firstDarkY = y;
                break;
            }
        }
        if (firstDarkX !== -1) break;
    }

    if (firstDarkX === -1) return; // Empty QR

    let finderEnd = firstDarkX;
    while (finderEnd < sourceCanvas.width) {
        const i = (firstDarkY * sourceCanvas.width + finderEnd) * 4;
        if (data[i] > 128) break;
        finderEnd++;
    }
    
    const moduleSize = (finderEnd - firstDarkX) / 7;
    const moduleCount = Math.round(sourceCanvas.width / moduleSize);
    
    // 2. Create matrix
    const matrix = [];
    for (let y = 0; y < moduleCount; y++) {
        matrix[y] = [];
        for (let x = 0; x < moduleCount; x++) {
            const centerX = Math.floor((x + 0.5) * moduleSize);
            const centerY = Math.floor((y + 0.5) * moduleSize);
            const i = (centerY * sourceCanvas.width + centerX) * 4;
            matrix[y][x] = data[i] < 128; // True if dark
        }
    }

    // 3. Draw on target canvas
    const drawSize = size / moduleCount;
    const isLightWhite = isColorWhite(lightColor);

    if (!isLightWhite) {
        ctx.fillStyle = lightColor;
        ctx.fillRect(0, 0, size, size);
    }
    
    ctx.fillStyle = darkColor;

    // Helper: Rounded Rect
    const fillRoundedRect = (x, y, w, h, r) => {
        if (r > w / 2) r = w / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.fill();
    };

    // Helper: Diamond
    const fillDiamond = (x, y, w, h) => {
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w, y + h / 2);
        ctx.lineTo(x + w / 2, y + h);
        ctx.lineTo(x, y + h / 2);
        ctx.closePath();
        ctx.fill();
    };

    // Helper: Leaf (two opposite rounded corners)
    const fillLeaf = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w, y); // Sharp Top-Right
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r); // Rounded Bottom-Right
        ctx.lineTo(x, y + h); // Sharp Bottom-Left
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r); // Rounded Top-Left
        ctx.closePath();
        ctx.fill();
    };


    // Helper function to draw a complete finder pattern
    const drawFinder = (startX, startY) => {
        const cx = startX * drawSize;
        const cy = startY * drawSize;
        const fSize = 7 * drawSize;
        
        // Only clear area if background is NOT transparent/white
        if (!isLightWhite) {
            ctx.fillStyle = lightColor;
            ctx.fillRect(cx, cy, fSize, fSize);
        }

        
        // Outer
        ctx.fillStyle = darkColor;
        if (corner === 'square') {
            ctx.fillRect(cx, cy, fSize, fSize);
        } else if (corner === 'rounded') {
            fillRoundedRect(cx, cy, fSize, fSize, drawSize * 1.5);
        } else if (corner === 'dot') {
            ctx.beginPath();
            ctx.arc(cx + fSize / 2, cy + fSize / 2, fSize / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (corner === 'extra') {
            fillLeaf(cx, cy, fSize, fSize, fSize / 1.5);
        }

        // Inner Gap - use background color for proper finder pattern visibility
        const gOff = drawSize;
        const gSize = 5 * drawSize;
        ctx.fillStyle = lightColor;

        
        if (corner === 'square') {
            ctx.fillRect(cx + gOff, cy + gOff, gSize, gSize);
        } else if (corner === 'rounded') {
            fillRoundedRect(cx + gOff, cy + gOff, gSize, gSize, drawSize);
        } else if (corner === 'dot') {
            ctx.beginPath();
            ctx.arc(cx + fSize / 2, cy + fSize / 2, gSize / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (corner === 'extra') {
            fillLeaf(cx + gOff, cy + gOff, gSize, gSize, gSize / 1.5);
        }


        // Inner Center (dark)
        ctx.fillStyle = darkColor;
        const cOff = 2 * drawSize;
        const cSize = 3 * drawSize;
        if (corner === 'square') {
            ctx.fillRect(cx + cOff, cy + cOff, cSize, cSize);
        } else if (corner === 'rounded') {
            fillRoundedRect(cx + cOff, cy + cOff, cSize, cSize, drawSize / 2);
        } else if (corner === 'dot') {
            ctx.beginPath();
            ctx.arc(cx + fSize / 2, cy + fSize / 2, cSize / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (corner === 'extra') {
            fillLeaf(cx + cOff, cy + cOff, cSize, cSize, cSize / 1.5);
        }
    };


    // Draw the 3 finder patterns FIRST
    drawFinder(0, 0); // Top-left
    drawFinder(moduleCount - 7, 0); // Top-right
    drawFinder(0, moduleCount - 7); // Bottom-left

    // Now draw data modules (skip finder areas)
    for (let y = 0; y < moduleCount; y++) {
        for (let x = 0; x < moduleCount; x++) {
            if (!matrix[y][x]) continue;

            // Skip finder pattern areas
            const isFinder = 
                (x < 7 && y < 7) || 
                (x > moduleCount - 8 && y < 7) || 
                (x < 7 && y > moduleCount - 8);
            
            if (isFinder) continue; // Already drawn above

            const px = x * drawSize;
            const py = y * drawSize;

            // Draw Pattern
            ctx.fillStyle = darkColor;
            if (pattern === 'square') {
                ctx.fillRect(px, py, drawSize + 0.5, drawSize + 0.5);
            } else if (pattern === 'dots') {
                ctx.beginPath();
                ctx.arc(px + drawSize / 2, py + drawSize / 2, drawSize / 2 * 0.85, 0, Math.PI * 2);
                ctx.fill();
            } else if (pattern === 'rounded') {
                fillRoundedRect(px + drawSize * 0.1, py + drawSize * 0.1, drawSize * 0.8, drawSize * 0.8, drawSize * 0.3);
            } else if (pattern === 'classy') {
                fillDiamond(px, py, drawSize, drawSize);
            }
        }
    }
}


async function drawLogo(ctx, size, logoBase64, config) {
    if (!logoBase64) return;
    
    try {
        const logoImage = await loadImage(logoBase64);
        const { logoSize: logoSizePercent = 20, logoPadding = 5 } = config;
        
        const logoSize = (size * logoSizePercent) / 100;
        const x = (size - logoSize) / 2;
        const y = (size - logoSize) / 2;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - logoPadding, y - logoPadding, logoSize + logoPadding * 2, logoSize + logoPadding * 2);
        ctx.drawImage(logoImage, x, y, logoSize, logoSize);
    } catch (err) {
        console.error('Error drawing logo:', err);
    }
}

function isColorWhite(color) {
    if (!color) return false;
    const c = color.toLowerCase();
    return c === '#ffffff' || c === '#fff' || c === 'white' || c === 'rgb(255, 255, 255)';
}

module.exports = { drawStyledQR, drawLogo };
