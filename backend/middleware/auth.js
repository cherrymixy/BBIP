const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bbip-plan-secret-key-2024';

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            error: '인증이 필요합니다.'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: '유효하지 않은 토큰입니다.'
        });
    }
}

module.exports = { authMiddleware, JWT_SECRET };
