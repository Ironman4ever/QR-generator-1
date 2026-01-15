/* ===================================
   QRForge - Renderer Module
   Handles custom QR geometry & styling
   =================================== */

/**
 * Custom QR Rendering Engine
 */
function drawStyledQR(ctx, sourceCanvas, size, darkColor, lightColor) {
    const sourceCtx = sourceCanvas.getContext('2d');
    const imageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const data = imageData.data;
    
    // 1. Detect module count (QR grid size)
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

    // Find the end of the first finder pattern (always 7 modules wide)
    let finderEnd = firstDarkX;
    while (finderEnd < sourceCanvas.width) {
        const i = (firstDarkY * sourceCanvas.width + finderEnd) * 4;
        if (data[i] > 128) break;
        finderEnd++;
    }
    
    const moduleSize = (finderEnd - firstDarkX) / 7;
    const moduleCount = Math.round(sourceCanvas.width / moduleSize);
    
    // 2. Create the matrix
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

    // 3. Draw on the target canvas
    const drawSize = size / moduleCount;
    const isLightWhite = isColorWhite(lightColor);

    if (!isLightWhite) {
        ctx.fillStyle = lightColor;
        ctx.fillRect(0, 0, size, size);
    }
    
    ctx.fillStyle = darkColor;

    // Helper to draw a rounded rect
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

    // Helper to draw a diamond
    const fillDiamond = (x, y, w, h) => {
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w, y + h / 2);
        ctx.lineTo(x + w / 2, y + h);
        ctx.lineTo(x, y + h / 2);
        ctx.closePath();
        ctx.fill();
    };

    for (let y = 0; y < moduleCount; y++) {
        for (let x = 0; x < moduleCount; x++) {
            if (!matrix[y][x]) continue;

            // Check if this is part of a Finder Pattern
            const isFinder = 
                (x < 7 && y < 7) || // Top-left
                (x > moduleCount - 8 && y < 7) || // Top-right
                (x < 7 && y > moduleCount - 8); // Bottom-left

            const px = x * drawSize;
            const py = y * drawSize;

            if (isFinder) {
                // Apply Corner Style
                if ((x === 0 && y === 0) || 
                    (x === moduleCount - 7 && y === 0) || 
                    (x === 0 && y === moduleCount - 7)) {
                    
                    const cx = x * drawSize;
                    const cy = y * drawSize;
                    const fSize = 7 * drawSize;
                    
                    if (!isLightWhite) {
                        ctx.fillStyle = lightColor;
                        ctx.fillRect(cx, cy, fSize, fSize);
                    }
                    ctx.fillStyle = darkColor;

                    // Draw Outer Square
                    if (currentCorner === 'square') {
                        ctx.fillRect(cx, cy, fSize, fSize);
                    } else if (currentCorner === 'rounded') {
                        fillRoundedRect(cx, cy, fSize, fSize, drawSize * 1.5);
                    } else if (currentCorner === 'dot') {
                        ctx.beginPath();
                        ctx.arc(cx + fSize / 2, cy + fSize / 2, fSize / 2, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (currentCorner === 'extra') {
                        fillRoundedRect(cx, cy, fSize, fSize, fSize / 2);
                    }

                    // Draw Inner White Gap
                    if (!isLightWhite) {
                        ctx.fillStyle = lightColor;
                        const gOff = drawSize;
                        const gSize = 5 * drawSize;
                        if (currentCorner === 'square') {
                            ctx.fillRect(cx + gOff, cy + gOff, gSize, gSize);
                        } else if (currentCorner === 'rounded') {
                            fillRoundedRect(cx + gOff, cy + gOff, gSize, gSize, drawSize);
                        } else if (currentCorner === 'dot') {
                            ctx.beginPath();
                            ctx.arc(cx + fSize / 2, cy + fSize / 2, gSize / 2, 0, Math.PI * 2);
                            ctx.fill();
                        } else if (currentCorner === 'extra') {
                            fillRoundedRect(cx + gOff, cy + gOff, gSize, gSize, gSize / 2);
                        }
                    }

                    // Draw Inner Dark Center
                    ctx.fillStyle = darkColor;
                    const cOff = 2 * drawSize;
                    const cSize = 3 * drawSize;
                    if (currentCorner === 'square') {
                        ctx.fillRect(cx + cOff, cy + cOff, cSize, cSize);
                    } else if (currentCorner === 'rounded') {
                        fillRoundedRect(cx + cOff, cy + cOff, cSize, cSize, drawSize / 2);
                    } else if (currentCorner === 'dot') {
                        ctx.beginPath();
                        ctx.arc(cx + fSize / 2, cy + fSize / 2, cSize / 2, 0, Math.PI * 2);
                        ctx.fill();
                    } else if (currentCorner === 'extra') {
                        fillRoundedRect(cx + cOff, cy + cOff, cSize, cSize, cSize / 2);
                    }
                }
            } else {
                // Apply Pattern Style
                ctx.fillStyle = darkColor;
                if (currentPattern === 'square') {
                    ctx.fillRect(px, py, drawSize + 0.5, drawSize + 0.5);
                } else if (currentPattern === 'dots') {
                    ctx.beginPath();
                    ctx.arc(px + drawSize / 2, py + drawSize / 2, drawSize / 2 * 0.85, 0, Math.PI * 2);
                    ctx.fill();
                } else if (currentPattern === 'rounded') {
                    fillRoundedRect(px + drawSize * 0.1, py + drawSize * 0.1, drawSize * 0.8, drawSize * 0.8, drawSize * 0.3);
                } else if (currentPattern === 'classy') {
                    fillDiamond(px, py, drawSize, drawSize);
                }
            }
        }
    }
}

function drawLogo(ctx, size) {
    if (!logoImage) return;
    
    const logoSizePercent = parseInt(document.getElementById('logo-size')?.value || 20);
    const logoPadding = parseInt(document.getElementById('logo-padding')?.value || 5);
    
    const logoSize = (size * logoSizePercent) / 100;
    const x = (size - logoSize) / 2;
    const y = (size - logoSize) / 2;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - logoPadding, y - logoPadding, logoSize + logoPadding * 2, logoSize + logoPadding * 2);
    ctx.drawImage(logoImage, x, y, logoSize, logoSize);
}

function createCanvasFromImage(img, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    return canvas;
}

function isColorWhite(color) {
    const c = color.toLowerCase();
    return c === '#ffffff' || c === '#fff' || c === 'white' || c === 'rgb(255, 255, 255)';
}
