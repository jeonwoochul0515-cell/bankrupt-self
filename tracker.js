import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 1. 세션 ID 생성 (탭 단위 고유 식별)
function getSessionId() {
    let sid = sessionStorage.getItem('session_id');
    if (!sid) {
        sid = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('session_id', sid);
    }
    return sid;
}

// 2. UTM 파라미터 추출
function getUTMParams() {
    const params = new URLSearchParams(location.search);
    return {
        utm_source: params.get('utm_source') || '',
        utm_medium: params.get('utm_medium') || '',
        utm_campaign: params.get('utm_campaign') || ''
    };
}

// 3. 디바이스 정보
function getDeviceInfo() {
    return {
        screenWidth: screen.width,
        screenHeight: screen.height,
        isMobile: /Mobi|Android/i.test(navigator.userAgent),
        language: navigator.language
    };
}

// 4. 쿠키 동의 확인 후에만 추적 (개인정보보호법 준수)
const hasConsent = localStorage.getItem('cookie_consent') === 'accepted';

// 5. 페이지뷰 기록 (세션당 1회, 동의 시에만)
if (hasConsent && !sessionStorage.getItem('tracked')) {
    sessionStorage.setItem('tracked', '1');
    const utm = getUTMParams();
    addDoc(collection(db, 'analytics'), {
        type: 'pageview',
        page: location.pathname,
        referrer: document.referrer || '',
        sessionId: getSessionId(),
        ...utm,
        ...getDeviceInfo(),
        userAgent: navigator.userAgent,
        createdAt: serverTimestamp()
    }).catch(() => {});
}

// 6. 범용 이벤트 추적 함수 (전역에 노출)
window.__trackEvent = function(eventType, extraData = {}) {
    // 동의 여부와 관계없이 consultation_submit은 항상 추적 (서비스 운영 필수)
    if (!hasConsent && eventType !== 'consultation_submit') return;

    // Firebase 저장
    addDoc(collection(db, 'analytics'), {
        type: eventType,
        page: location.pathname,
        sessionId: getSessionId(),
        ...extraData,
        createdAt: serverTimestamp()
    }).catch(() => {});

    // GTM dataLayer push
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
        event: eventType,
        ...extraData
    });
};

// 7. 스크롤 깊이 추적 (25%, 50%, 75%, 100%)
if (hasConsent) {
    const scrollMilestones = new Set();
    window.addEventListener('scroll', () => {
        const percent = Math.round(
            (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
        );
        [25, 50, 75, 100].forEach(m => {
            if (percent >= m && !scrollMilestones.has(m)) {
                scrollMilestones.add(m);
                window.__trackEvent('scroll_depth', { percent: m });
            }
        });
    }, { passive: true });
}

// 8. 재방문 감지
const visitCount = parseInt(localStorage.getItem('visit_count') || '0') + 1;
localStorage.setItem('visit_count', String(visitCount));
if (visitCount > 1 && hasConsent) {
    window.__trackEvent('return_visit', { visitCount });
}
