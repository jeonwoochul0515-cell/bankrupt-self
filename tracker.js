import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 세션당 1회만 페이지뷰 기록
if (!sessionStorage.getItem('tracked')) {
    sessionStorage.setItem('tracked', '1');
    addDoc(collection(db, 'analytics'), {
        type: 'pageview',
        page: location.pathname,
        referrer: document.referrer || '',
        userAgent: navigator.userAgent,
        createdAt: serverTimestamp()
    }).catch(() => {});
}

// 변호사 추천 클릭 추적 (Shadow DOM 내부이므로 전역 이벤트 위임)
window.__trackEvent = function(eventType) {
    addDoc(collection(db, 'analytics'), {
        type: eventType,
        page: location.pathname,
        createdAt: serverTimestamp()
    }).catch(() => {});
};
