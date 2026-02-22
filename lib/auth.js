const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bbip-plan-dev-secret';

function verifyToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    try {
        return jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    } catch {
        return null;
    }
}

function createToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function unauthorized(res) {
    return res.status(401).json({ success: false, error: '인증이 필요합니다.' });
}

module.exports = { verifyToken, createToken, unauthorized, JWT_SECRET };
