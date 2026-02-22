const { verifyToken, unauthorized } = require('../../lib/auth');
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

    const decoded = verifyToken(req);
    if (!decoded) return unauthorized(res);

    try {
        const { text } = req.body || {};

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ success: false, error: '텍스트를 입력해주세요.' });
        }

        const today = new Date().toISOString().split('T')[0];

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0,
            messages: [
                {
                    role: 'system',
                    content: `당신은 자연어 텍스트에서 일정(시간+할 일)을 추출하는 AI입니다.

규칙:
1. 사용자의 텍스트에서 시간과 할 일을 추출합니다.
2. 시간은 24시간 형식 "HH:MM"으로 변환합니다.
3. 할 일 제목은 핵심 내용만 간결하게 작성합니다 (불필요한 조사, 어미 제거).
4. 여러 일정이 있으면 모두 추출합니다.
5. 시간이 명시되지 않은 일정은 null로 표시합니다.
6. "~까지"는 마감시간으로 처리합니다.
7. 오늘 날짜: ${today}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 출력:
[{"time": "HH:MM", "title": "할 일 제목"}, ...]`
                },
                {
                    role: 'user',
                    content: text
                }
            ]
        });

        const content = completion.choices[0].message.content.trim();

        // JSON 파싱 (코드블록 제거)
        const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const plans = JSON.parse(jsonStr);

        // 유효성 검증
        const validated = plans
            .filter(p => p && p.title && typeof p.title === 'string')
            .map(p => ({
                title: p.title.trim().substring(0, 100),
                time: /^\d{2}:\d{2}$/.test(p.time) ? p.time : null,
                date: today
            }));

        res.json({ success: true, data: validated });
    } catch (error) {
        console.error('Parse error:', error);
        res.status(500).json({ success: false, error: '일정 파싱에 실패했습니다.' });
    }
};
