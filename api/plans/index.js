const { v4: uuidv4 } = require('uuid');
const { getDb, initDb } = require('../../lib/db');
const { verifyToken, unauthorized } = require('../../lib/auth');

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    await initDb();
    const db = getDb();

    try {
        if (req.method === 'GET') {
            const { date } = req.query;
            let result;

            if (date) {
                result = await db.execute({
                    sql: 'SELECT * FROM plans WHERE user_id = ? AND date = ? ORDER BY time ASC',
                    args: [decoded.id, date]
                });
            } else {
                result = await db.execute({
                    sql: 'SELECT * FROM plans WHERE user_id = ? ORDER BY date DESC, time ASC',
                    args: [decoded.id]
                });
            }

            const plans = result.rows.map(p => ({ ...p, completed: Boolean(p.completed) }));
            return res.json({ success: true, data: plans });
        }

        if (req.method === 'POST') {
            const { title, time, date } = req.body || {};

            if (!title || !date) {
                return res.status(400).json({ success: false, error: 'title과 date는 필수입니다.' });
            }

            const id = uuidv4();
            await db.execute({
                sql: 'INSERT INTO plans (id, user_id, title, time, date) VALUES (?, ?, ?, ?, ?)',
                args: [id, decoded.id, title, time || null, date]
            });

            const result = await db.execute({ sql: 'SELECT * FROM plans WHERE id = ?', args: [id] });
            const plan = { ...result.rows[0], completed: Boolean(result.rows[0].completed) };

            return res.status(201).json({ success: true, data: plan });
        }

        res.status(405).json({ success: false, error: 'Method not allowed' });
    } catch (error) {
        console.error('Plans error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
