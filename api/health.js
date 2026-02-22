module.exports = async function handler(req, res) {
    res.json({
        success: true,
        message: 'BBIP API 서버 정상 동작 중',
        timestamp: new Date().toISOString()
    });
};
