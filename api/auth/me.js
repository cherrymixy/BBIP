const { getDb, initDb } = require('../../lib/db');
const { verifyToken, unauthorized } = require('../../lib/auth');

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    try {
        await initDb();
        const db = getDb();

        const result = await db.execute({
            sql: 'SELECT id, name, email, emoji, created_at FROM users WHERE id = ?',
            args: [decoded.id]
        });

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Me error:', error);
        res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
    }
};
