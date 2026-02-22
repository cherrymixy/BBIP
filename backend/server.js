const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());

// 요청 로깅
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
    next();
});

// API 라우트
const plansRouter = require('./routes/plans');
const userRouter = require('./routes/user');

app.use('/api/plans', plansRouter);
app.use('/api/user', userRouter);

// 헬스 체크
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '삡-플랜 API 서버 정상 동작 중',
        timestamp: new Date().toISOString()
    });
});

// 404 처리
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '요청한 리소스를 찾을 수 없습니다.'
    });
});

// 에러 핸들러
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        error: '서버 내부 오류가 발생했습니다.'
    });
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║     삡-플랜 API 서버 시작               ║
║     http://localhost:${PORT}              ║
╚════════════════════════════════════════╝
    `);
});

module.exports = app;
