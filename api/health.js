module.exports = async function handler(req, res) {
    res.json({
        success: true,
        message: '삡-플랜 API 서버 정상 동작 중',
        timestamp: new Date().toISOString()
    });
};
