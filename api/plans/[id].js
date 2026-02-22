const { getDb, initDb } = require('../../lib/db');
const { verifyToken, unauthorized } = require('../../lib/auth');

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    const { id } = req.query;

    await initDb();
    const db = getDb();

    try {
        // 소유권 확인
        const existing = await db.execute({
            sql: 'SELECT * FROM plans WHERE id = ? AND user_id = ?',
            args: [id, decoded.id]
        });

        if (existing.rows.length === 0) {
            return res.status(404).json({ success: false, error: '계획을 찾을 수 없습니다.' });
        }

        if (req.method === 'PUT') {
            const { title, time, date, completed } = req.body || {};

            await db.execute({
                sql: `UPDATE plans
                      SET title = COALESCE(?, title),
                          time = COALESCE(?, time),
                          date = COALESCE(?, date),
                          completed = COALESCE(?, completed),
                          updated_at = CURRENT_TIMESTAMP
                      WHERE id = ? AND user_id = ?`,
                args: [
                    title || null,
                    time || null,
                    date || null,
                    completed !== undefined ? (completed ? 1 : 0) : null,
                    id,
                    decoded.id
                ]
            });

            const result = await db.execute({ sql: 'SELECT * FROM plans WHERE id = ?', args: [id] });
            const plan = { ...result.rows[0], completed: Boolean(result.rows[0].completed) };
            return res.json({ success: true, data: plan });
        }

        if (req.method === 'DELETE') {
            await db.execute({
                sql: 'DELETE FROM plans WHERE id = ? AND user_id = ?',
                args: [id, decoded.id]
            });
            return res.json({ success: true, message: '계획이 삭제되었습니다.' });
        }

        res.status(405).json({ success: false, error: 'Method not allowed' });
    } catch (error) {
        console.error('Plan [id] error:', error);
        res.status(500).json({ success: false, error: '서버 오류가 발생했습니다.' });
    }
};
