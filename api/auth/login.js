const bcrypt = require('bcryptjs');
const { getDb, initDb } = require('../../lib/db');
const { createToken } = require('../../lib/auth');

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    try {
        await initDb();
        const db = getDb();
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({ success: false, error: '이메일과 비밀번호를 입력해주세요.' });
        }

        const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] });
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
        }

        const token = createToken({ id: user.id, name: user.name, email: user.email, emoji: user.emoji });

        res.json({
            success: true,
            data: {
                token,
                user: { id: user.id, name: user.name, email: user.email, emoji: user.emoji }
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
    }
};
