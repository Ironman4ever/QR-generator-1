/* ===================================
   QRForge Backend - Auth Utilities
   JWT and password management
   =================================== */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Secret key for JWT (in production, use environment variable)
const JWT_SECRET = 'qrforge_secret_key_2026';
const JWT_EXPIRES = '24h';

/**
 * Hash a password
 */
function hashPassword(password) {
    return bcrypt.hashSync(password, 10);
}

/**
 * Verify password against hash
 */
function verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash);
}

/**
 * Generate JWT token for user
 */
function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
    );
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
}

/**
 * Express middleware to protect routes
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = decoded;
    next();
}

module.exports = {
    hashPassword,
    verifyPassword,
    generateToken,
    verifyToken,
    authMiddleware
};
