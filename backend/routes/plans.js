const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuidv4 } = require('uuid');

// GET /api/plans - 모든 계획 조회
router.get('/', (req, res) => {
    try {
        const { date } = req.query;
        let plans;

        if (date) {
            plans = db.prepare('SELECT * FROM plans WHERE date = ? ORDER BY time ASC').all(date);
        } else {
            plans = db.prepare('SELECT * FROM plans ORDER BY date DESC, time ASC').all();
        }

        // completed를 boolean으로 변환
        plans = plans.map(plan => ({
            ...plan,
            completed: Boolean(plan.completed)
        }));

        res.json({ success: true, data: plans });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/plans - 새 계획 생성
router.post('/', (req, res) => {
    try {
        const { title, time, date } = req.body;

        if (!title || !date) {
            return res.status(400).json({
                success: false,
                error: 'title과 date는 필수입니다.'
            });
        }

        const id = uuidv4();
        const stmt = db.prepare(
            'INSERT INTO plans (id, title, time, date) VALUES (?, ?, ?, ?)'
        );
        stmt.run(id, title, time || null, date);

        const newPlan = db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
        newPlan.completed = Boolean(newPlan.completed);

        res.status(201).json({ success: true, data: newPlan });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/plans/:id - 계획 수정
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { title, time, date, completed } = req.body;

        const existing = db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: '계획을 찾을 수 없습니다.'
            });
        }

        const stmt = db.prepare(`
            UPDATE plans 
            SET title = COALESCE(?, title),
                time = COALESCE(?, time),
                date = COALESCE(?, date),
                completed = COALESCE(?, completed),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);

        stmt.run(
            title || null,
            time || null,
            date || null,
            completed !== undefined ? (completed ? 1 : 0) : null,
            id
        );

        const updated = db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
        updated.completed = Boolean(updated.completed);

        res.json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/plans/:id - 계획 삭제
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;

        const existing = db.prepare('SELECT * FROM plans WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: '계획을 찾을 수 없습니다.'
            });
        }

        db.prepare('DELETE FROM plans WHERE id = ?').run(id);

        res.json({ success: true, message: '계획이 삭제되었습니다.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/plans/bulk - 여러 계획 한번에 생성 (자연어 파싱 결과용)
router.post('/bulk', (req, res) => {
    try {
        const { plans } = req.body;

        if (!Array.isArray(plans) || plans.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'plans 배열이 필요합니다.'
            });
        }

        const insertStmt = db.prepare(
            'INSERT INTO plans (id, title, time, date) VALUES (?, ?, ?, ?)'
        );

        const insertMany = db.transaction((planList) => {
            const results = [];
            for (const plan of planList) {
                const id = uuidv4();
                insertStmt.run(id, plan.title, plan.time || null, plan.date);
                results.push({ id, ...plan, completed: false });
            }
            return results;
        });

        const created = insertMany(plans);

        res.status(201).json({ success: true, data: created });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
