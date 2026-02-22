const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/user - 현재 사용자 정보 조회
router.get('/', (req, res) => {
    try {
        const user = db.prepare('SELECT * FROM users LIMIT 1').get();

        if (!user) {
            return res.status(404).json({
                success: false,
                error: '사용자를 찾을 수 없습니다.'
            });
        }

        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/user - 사용자 정보 수정
router.put('/', (req, res) => {
    try {
        const { name, emoji } = req.body;

        const user = db.prepare('SELECT * FROM users LIMIT 1').get();
        if (!user) {
            return res.status(404).json({
                success: false,
                error: '사용자를 찾을 수 없습니다.'
            });
        }

        db.prepare(`
            UPDATE users 
            SET name = COALESCE(?, name),
                emoji = COALESCE(?, emoji)
            WHERE id = ?
        `).run(name || null, emoji || null, user.id);

        const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
