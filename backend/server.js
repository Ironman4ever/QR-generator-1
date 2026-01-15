const express = require('express');
const cors = require('cors');
const shortid = require('shortid');
const UAParser = require('ua-parser-js');
const path = require('path');

// Database & Auth Modules
const db = require('./utils/database');
const auth = require('./utils/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


// Create default admin user if none exists
if (db.getUserCount() === 0) {
    const defaultHash = auth.hashPassword('qrforge123');
    db.createUser('admin', defaultHash);
    console.log('👤 Default admin user created (admin / qrforge123)');
}


// ---------------------------------------------------------
// UI Page
// ---------------------------------------------------------

/**
 * Root Index Page
 */
app.get('/', (req, res) => {
    const linkCount = db.getLinkCount();
    const totalScans = db.getTotalScans();

    res.send(`
        <html>
            <head>
                <title>QRForge Backend Status</title>
                <style>
                    body { font-family: -apple-system, system-ui, sans-serif; background: #0f172a; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                    .card { background: #1e293b; padding: 2rem; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; border: 1px solid #334155; }
                    .status { color: #22c55e; font-weight: bold; font-size: 1.2rem; }
                    .stats { display: flex; gap: 2rem; margin-top: 2rem; border-top: 1px solid #334155; padding-top: 1.5rem; }
                    .stat-box { flex: 1; }
                    .val { font-size: 1.5rem; font-weight: 800; color: #6366f1; }
                    .label { color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; margin-top: 0.2rem; }
                    .db-badge { background: #22c55e; color: white; font-size: 0.7rem; padding: 2px 8px; border-radius: 4px; margin-top: 0.5rem; display: inline-block; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">🚀</div>
                    <h1 style="margin: 0;">QRForge Backend</h1>
                    <p class="status">● System Online</p>
                    <div class="db-badge">SQLite Database</div>
                    <div class="stats">
                        <div class="stat-box">
                            <div class="val">${linkCount}</div>
                            <div class="label">Dynamic Links</div>
                        </div>
                        <div class="stat-box">
                            <div class="val">${totalScans}</div>
                            <div class="label">Total Scans</div>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    `);
});

// ---------------------------------------------------------
// API Endpoints
// ---------------------------------------------------------

/**
 * Creates a new dynamic QR link
 * POST /api/qr
 */
app.post('/api/qr', (req, res) => {
    const { targetUrl, name } = req.body;
    
    if (!targetUrl) {
        return res.status(400).json({ error: 'Target URL is required' });
    }

    const id = shortid.generate();
    const link = db.createLink(id, name || 'Unnamed QR', targetUrl);
    
    // hPanel/Hostinger usually uses a reverse proxy
    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const fullBaseUrl = `${protocol}://${host}${req.baseUrl || ''}`;

    res.json({ 
        id, 
        shortUrl: `${fullBaseUrl}/${id}`,
        targetUrl: link.target_url 
    });


});

/**
 * Update an existing dynamic QR link
 * PUT /api/qr/:id
 */
app.put('/api/qr/:id', (req, res) => {
    const { id } = req.params;
    const { targetUrl, name } = req.body;
    
    const link = db.updateLink(id, { name, targetUrl });
    
    if (!link) {
        return res.status(404).json({ error: 'QR ID not found' });
    }

    res.json(link);
});

/**
 * Get analytics for a specific QR
 * GET /api/analytics/:id
 */
app.get('/api/analytics/:id', (req, res) => {
    const { id } = req.params;
    const result = db.getAnalytics(id);
    
    if (!result) {
        return res.status(404).json({ error: 'QR ID not found' });
    }

    res.json(result);
});

// ---------------------------------------------------------
// Auth Endpoints
// ---------------------------------------------------------

/**
 * Admin Login
 * POST /api/auth/login
 */
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const user = db.getUserByUsername(username);
    
    if (!user || !auth.verifyPassword(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = auth.generateToken(user);
    res.json({ token, username: user.username, role: user.role });
});

/**
 * Verify Token
 * GET /api/auth/verify
 */
app.get('/api/auth/verify', auth.authMiddleware, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// ---------------------------------------------------------
// Admin Endpoints (Protected)
// ---------------------------------------------------------

/**
 * Get all links (Admin)
 * GET /api/admin/links
 */
app.get('/api/admin/links', auth.authMiddleware, (req, res) => {
    const links = db.getAllLinks();
    res.json({ links });
});

/**
 * Delete a link (Admin)
 * DELETE /api/admin/links/:id
 */
app.delete('/api/admin/links/:id', auth.authMiddleware, (req, res) => {
    const { id } = req.params;
    const link = db.getLink(id);
    
    if (!link) {
        return res.status(404).json({ error: 'Link not found' });
    }

    db.deleteLink(id);
    res.json({ success: true, message: 'Link deleted' });
});

/**
 * Get admin stats
 * GET /api/admin/stats
 */
app.get('/api/admin/stats', auth.authMiddleware, (req, res) => {
    res.json({
        totalLinks: db.getLinkCount(),
        totalScans: db.getTotalScans()
    });
});

// ---------------------------------------------------------
// Generator Endpoints
// ---------------------------------------------------------

const { generateQRImage } = require('./utils/generator');
const archiver = require('archiver');


/**
 * Generate a preview of the QR code (Base64)
 * POST /api/generate/preview
 */
app.post('/api/generate/preview', async (req, res) => {
    try {
        const { data, config } = req.body;
        if (!data) return res.status(400).json({ error: 'Data is required' });

        const canvas = await generateQRImage(data, config);
        const dataUrl = canvas.toDataURL('image/png');
        
        res.json({ dataUrl });
    } catch (err) {
        console.error('Preview Error:', err);
        res.status(500).json({ error: 'Generation failed' });
    }
});

/**
 * Download a generated QR code file
 * POST /api/generate/download
 */
app.post('/api/generate/download', async (req, res) => {
    try {
        const { data, config, format = 'png' } = req.body;
        if (!data) return res.status(400).send('Data is required');

        const canvas = await generateQRImage(data, config);

        if (format === 'png') {
            const buffer = canvas.toBuffer('image/png');
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Content-Disposition', 'attachment; filename="qrcode.png"');
            res.send(buffer);
        } else if (format === 'pdf') {
            const buffer = canvas.toBuffer('application/pdf');
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="qrcode.pdf"');
            res.send(buffer);
        } else if (format === 'svg') {
            const dataUrl = canvas.toDataURL('image/png');
            const size = config.size || 500;
            const svgKey = `<?xml version="1.0" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <image width="${size}" height="${size}" xlink:href="${dataUrl}"/>
</svg>`;
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Content-Disposition', 'attachment; filename="qrcode.svg"');
            res.send(svgKey);
        } else {
            res.status(400).send('Unsupported format');
        }
    } catch (err) {
        console.error('Download Error:', err);
        res.status(500).send('QR Generation failed on server');
    }
});


/**
 * Generate multiple QR codes as a ZIP
 * POST /api/generate/bulk
 */
app.post('/api/generate/bulk', async (req, res) => {
    try {
        const { items, config, format = 'png' } = req.body;
        if (!items || !items.length) return res.status(400).send('Items required');

        const archive = archiver('zip', { zlib: { level: 9 } });

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="qrcodes.zip"`);

        archive.pipe(res);

        for (const item of items) {
            const canvas = await generateQRImage(item.content, config);
            const buffer = canvas.toBuffer('image/png');
            const filename = `${item.name.replace(/[^a-z0-9]/gi, '_')}.${format === 'svg' ? 'svg' : 'png'}`;
            
            if (format === 'svg') {
                 const size = config.size || 500;
                 const b64 = buffer.toString('base64');
                 const svgContent = `<?xml version="1.0" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <image width="${size}" height="${size}" xlink:href="data:image/png;base64,${b64}"/>
</svg>`;
                 archive.append(svgContent, { name: filename });
            } else {
                 archive.append(buffer, { name: filename });
            }
        }

        await archive.finalize();

    } catch (err) {
        console.error('Bulk Error:', err);
        if (!res.headersSent) res.status(500).send('Bulk generation failed');
    }
});

// ---------------------------------------------------------
// Redirect & Track Endpoint
// ---------------------------------------------------------

/**
 * Main redirection handler
 * GET /:id
 */
app.get('/:id', (req, res) => {
    const { id } = req.params;
    const link = db.getLink(id);
    
    if (!link) {
        return res.status(404).send('<h1>QR Link not found</h1>');
    }

    // Log Analytics
    const parser = new UAParser(req.headers['user-agent']);
    const result = parser.getResult();
    
    db.logScan(id, {
        ip: req.ip || req.connection.remoteAddress,
        deviceType: result.device.type || 'desktop',
        os: result.os.name,
        browser: result.browser.name
    });

    // Redirect to target
    res.redirect(link.target_url);
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 QRForge Redirect Server running on http://localhost:${PORT}`);
});
