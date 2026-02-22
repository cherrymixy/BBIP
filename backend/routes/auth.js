const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/register — 회원가입
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, emoji } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: '이름, 이메일, 비밀번호는 필수입니다.'
            });
        }

        if (password.length < 4) {
            return res.status(400).json({
                success: false,
                error: '비밀번호는 4자 이상이어야 합니다.'
            });
        }

        // 이메일 중복 확인
        const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) {
            return res.status(409).json({
                success: false,
                error: '이미 사용 중인 이메일입니다.'
            });
        }

        const id = uuidv4();
        const hashedPassword = await bcrypt.hash(password, 10);

        db.prepare(
            'INSERT INTO users (id, name, email, password, emoji) VALUES (?, ?, ?, ?, ?)'
        ).run(id, name, email, hashedPassword, emoji || '🐔');

        const token = jwt.sign({ id, name, email, emoji: emoji || '🐔' }, JWT_SECRET, {
            expiresIn: '7d'
        });

        res.status(201).json({
            success: true,
            data: {
                token,
                user: { id, name, email, emoji: emoji || '🐔' }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/auth/login — 로그인
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: '이메일과 비밀번호를 입력해주세요.'
            });
        }

        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: '이메일 또는 비밀번호가 올바르지 않습니다.'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: '이메일 또는 비밀번호가 올바르지 않습니다.'
            });
        }

        const token = jwt.sign(
            { id: user.id, name: user.name, email: user.email, emoji: user.emoji },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            data: {
                token,
                user: { id: user.id, name: user.name, email: user.email, emoji: user.emoji }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/auth/me — 현재 유저 정보
router.get('/me', authMiddleware, (req, res) => {
    try {
        const user = db.prepare('SELECT id, name, email, emoji, created_at FROM users WHERE id = ?').get(req.user.id);
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

module.exports = router;
