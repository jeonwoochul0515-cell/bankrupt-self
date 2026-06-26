// 상담 신청 발생 시 솔라피로 신청자(접수 확인)와 관리자(알림)에게 SMS를 동시 발송하는 Vercel 서버리스 함수
import crypto from 'crypto';

// 솔라피 HMAC-SHA256 인증 헤더 생성 (date + salt 를 secret 으로 서명)
function buildAuthHeader(apiKey, apiSecret) {
    const date = new Date().toISOString();
    const salt = crypto.randomBytes(32).toString('hex');
    const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(date + salt)
        .digest('hex');
    return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER, ADMIN_PHONE } = process.env;
    if (!SOLAPI_API_KEY || !SOLAPI_API_SECRET || !SOLAPI_SENDER || !ADMIN_PHONE) {
        // 환경변수 미설정 시에도 상담 접수 흐름은 막지 않음
        console.error('솔라피 환경변수가 설정되지 않았습니다.');
        return res.status(500).json({ error: 'SMS 설정이 완료되지 않았습니다.' });
    }

    // 최소 검증
    const body = req.body || {};
    const name = String(body.name || '').trim().slice(0, 20);
    const phone = String(body.phone || '').replace(/[^0-9]/g, '');
    if (!name || !/^01[0-9]{8,9}$/.test(phone)) {
        return res.status(400).json({ error: '잘못된 요청입니다.' });
    }

    const jurisdiction = String(body.jurisdiction || '-').slice(0, 40);
    const monthlyRepayment = String(body.monthlyRepayment || '-').slice(0, 20);

    // 관리자 알림 문구 (기존 유지)
    const adminText =
        `[부산회생프로] 새 상담신청\n` +
        `이름: ${name}\n` +
        `연락처: ${phone}\n` +
        `관할: ${jurisdiction}\n` +
        `예상 월변제금: ${monthlyRepayment}`;

    // 신청자 접수 확인 문구 (과장·단정 표현 배제, 연락 안내)
    const applicantText =
        `[부산회생프로] ${name}님, 상담 신청이 접수되었습니다.\n` +
        `보통 30분~2시간 이내에 전문가가 연락드립니다.\n` +
        `문의: 1660-4452`;

    // 관리자 알림 수신번호 (콤마로 여러 명 지정 가능: "0101...,0102...")
    const adminPhones = ADMIN_PHONE.split(',')
        .map((p) => p.replace(/[^0-9]/g, ''))
        .filter(Boolean);

    // 신청자(쿠폰) + 관리자 전원(접수 알림) 동시 발송 (다건 발송 API)
    const messages = [
        { to: phone, from: SOLAPI_SENDER, text: applicantText },
        ...adminPhones.map((to) => ({ to, from: SOLAPI_SENDER, text: adminText })),
    ];

    try {
        const resp = await fetch('https://api.solapi.com/messages/v4/send-many/detail', {
            method: 'POST',
            headers: {
                'Authorization': buildAuthHeader(SOLAPI_API_KEY, SOLAPI_API_SECRET),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages }),
        });

        if (!resp.ok) {
            const detail = await resp.text();
            console.error('솔라피 발송 실패:', resp.status, detail);
            return res.status(502).json({ error: 'SMS 발송에 실패했습니다.' });
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('솔라피 호출 오류:', err);
        return res.status(500).json({ error: 'SMS 발송 중 오류가 발생했습니다.' });
    }
}
