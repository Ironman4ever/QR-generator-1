/* ===================================
   QRForge Backend - SQLite Database
   Handles all database operations
   =================================== */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_URL || path.join(__dirname, '..', 'database.sqlite');
const db = new Database(DB_PATH);

// Initialize tables
db.exec(`
    CREATE TABLE IF NOT EXISTS links (
        id TEXT PRIMARY KEY,
        name TEXT,
        target_url TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link_id TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        ip TEXT,
        device_type TEXT,
        os TEXT,
        browser TEXT,
        FOREIGN KEY (link_id) REFERENCES links(id)
    );

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'admin',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);


console.log('📦 SQLite Database initialized');

// ---------------------------------------------------------
// Link Operations
// ---------------------------------------------------------

function createLink(id, name, targetUrl) {
    const stmt = db.prepare('INSERT INTO links (id, name, target_url) VALUES (?, ?, ?)');
    stmt.run(id, name, targetUrl);
    return getLink(id);
}

function getLink(id) {
    const stmt = db.prepare('SELECT * FROM links WHERE id = ?');
    return stmt.get(id);
}

function updateLink(id, { name, targetUrl }) {
    const link = getLink(id);
    if (!link) return null;
    
    const newName = name || link.name;
    const newUrl = targetUrl || link.target_url;
    
    const stmt = db.prepare('UPDATE links SET name = ?, target_url = ? WHERE id = ?');
    stmt.run(newName, newUrl, id);
    return getLink(id);
}

function getLinkCount() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM links');
    return stmt.get().count;
}

// ---------------------------------------------------------
// Scan Operations
// ---------------------------------------------------------

function logScan(linkId, scanData) {
    const stmt = db.prepare(`
        INSERT INTO scans (link_id, ip, device_type, os, browser) 
        VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
        linkId,
        scanData.ip || null,
        scanData.deviceType || null,
        scanData.os || null,
        scanData.browser || null
    );
}

function getAnalytics(linkId) {
    const link = getLink(linkId);
    if (!link) return null;

    const totalScans = db.prepare('SELECT COUNT(*) as count FROM scans WHERE link_id = ?').get(linkId).count;
    const uniqueVisitors = db.prepare('SELECT COUNT(DISTINCT ip) as count FROM scans WHERE link_id = ?').get(linkId).count;
    
    const deviceCounts = db.prepare(`
        SELECT device_type, COUNT(*) as count 
        FROM scans 
        WHERE link_id = ? 
        GROUP BY device_type
    `).all(linkId);

    const devices = { mobile: 0, tablet: 0, desktop: 0 };
    deviceCounts.forEach(row => {
        if (row.device_type === 'mobile') devices.mobile = row.count;
        else if (row.device_type === 'tablet') devices.tablet = row.count;
        else devices.desktop += row.count; // null or desktop
    });

    const recentScans = db.prepare(`
        SELECT * FROM scans 
        WHERE link_id = ? 
        ORDER BY timestamp DESC 
        LIMIT 10
    `).all(linkId);

    return {
        info: link,
        analytics: {
            totalScans,
            uniqueVisitors,
            devices,
            recentScans
        }
    };
}

function getTotalScans() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM scans');
    return stmt.get().count;
}

// ---------------------------------------------------------
// User Operations
// ---------------------------------------------------------

function createUser(username, passwordHash) {
    const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    stmt.run(username, passwordHash);
    return getUserByUsername(username);
}

function getUserByUsername(username) {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
}

function getUserCount() {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
    return stmt.get().count;
}

function getAllLinks() {
    const stmt = db.prepare(`
        SELECT l.*, 
            (SELECT COUNT(*) FROM scans WHERE link_id = l.id) as scan_count
        FROM links l
        ORDER BY l.created_at DESC
    `);
    return stmt.all();
}

function deleteLink(id) {
    db.prepare('DELETE FROM scans WHERE link_id = ?').run(id);
    db.prepare('DELETE FROM links WHERE id = ?').run(id);
}

module.exports = {
    createLink,
    getLink,
    updateLink,
    getLinkCount,
    logScan,
    getAnalytics,
    getTotalScans,
    createUser,
    getUserByUsername,
    getUserCount,
    getAllLinks,
    deleteLink
};

