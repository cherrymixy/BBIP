const { v4: uuidv4 } = require('uuid');
const { getDb, initDb } = require('../../lib/db');
const { verifyToken, unauthorized } = require('../../lib/auth');

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    try {
        await initDb();
        const db = getDb();
        const { plans } = req.body || {};

        if (!Array.isArray(plans) || plans.length === 0) {
            return res.status(400).json({ success: false, error: 'plans 배열이 필요합니다.' });
        }

        if (plans.length > 20) {
            return res.status(400).json({ success: false, error: '한 번에 최대 20개까지 생성 가능합니다.' });
        }

        const created = [];
        for (const plan of plans) {
            if (!plan.title || plan.title.length > 100) continue;
            const id = uuidv4();
            await db.execute({
                sql: 'INSERT INTO plans (id, user_id, title, time, date) VALUES (?, ?, ?, ?, ?)',
                args: [id, decoded.id, plan.title, plan.time || null, plan.date]
            });
            created.push({ id, ...plan, completed: false });
        }

        res.status(201).json({ success: true, data: created });
    } catch (error) {
        console.error('Bulk create error:', error);
        res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
    }
};
