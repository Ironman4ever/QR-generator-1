/* ===================================
   QRForge Backend - Generator Controller
   Orchestrates QR creation pipeline
   =================================== */

const { createCanvas, loadImage } = require('canvas');
const QRCode = require('qrcode');
const { drawStyledQR, drawLogo } = require('./renderer');

async function generateQRImage(data, config) {
    console.log('📊 generateQRImage called with config:', JSON.stringify(config, null, 2));
    
    const { 
        size = 500, 
        qrColor = '#000000', 
        bgColor = '#ffffff',
        ecc = 'M',
        logoBase64 = null
    } = config || {};

    
    // 1. Generate Raw QR on Temp Canvas
    // We render it at the target size first to get the correct module grid
    const tempCanvas = createCanvas(size, size);
    
    await QRCode.toCanvas(tempCanvas, data, {
        errorCorrectionLevel: ecc,
        margin: 0, // No margin for cleaner edge

        color: {
            dark: '#000000',
            light: '#ffffff' // Always black/white for the source matrix
        },
        width: size
    });

    // 2. Create Final Canvas for Styling
    const finalCanvas = createCanvas(size, size);
    const ctx = finalCanvas.getContext('2d');
    
    // 3. Draw Styled QR
    await drawStyledQR(ctx, tempCanvas, size, config);
    
    // 4. Draw Logo
    if (logoBase64) {
        await drawLogo(ctx, size, logoBase64, config);
    }

    return finalCanvas;
}

module.exports = { generateQRImage };
