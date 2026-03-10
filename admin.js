import { db } from './firebase-config.js';
import { collection, getDocs, orderBy, query, doc, deleteDoc, updateDoc, addDoc, getDoc, setDoc, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

function showError(message) {
    let banner = document.getElementById('error-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'error-banner';
        banner.style.cssText = 'margin:1rem 2rem;padding:1rem 1.5rem;background:#f8d7da;border:1px solid #f5c6cb;border-radius:8px;color:#721c24;font-size:0.9rem;';
        const content = document.getElementById('admin-content');
        content.insertBefore(banner, content.querySelector('.stats-section'));
    }
    banner.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + message;
    banner.hidden = false;
}

function maskPhone(phone) {
    if (!phone) return '-';
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length >= 11) {
        return cleaned.slice(0, 3) + '-****-' + cleaned.slice(7);
    }
    if (cleaned.length >= 7) {
        return cleaned.slice(0, 3) + '-***-' + cleaned.slice(6);
    }
    return phone.slice(0, 3) + '****';
}

function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
}

function formatDateShort(timestamp) {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${m}/${d}`;
}

function isToday(timestamp) {
    if (!timestamp) return false;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    return date.getFullYear() === today.getFullYear()
        && date.getMonth() === today.getMonth()
        && date.getDate() === today.getDate();
}

function parseDebt(value) {
    if (!value) return 0;
    const num = parseFloat(String(value).replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
}

function getDebtValue(c) {
    const a = c.simulationAnswers;
    return a?.['Q6. 총 채무액 (만원)'] ?? a?.['Q5. 총 채무액 (만원)'];
}

function formatMoney(manwon) {
    if (manwon >= 10000) return (manwon / 10000).toFixed(1) + '억';
    return manwon.toLocaleString() + '만원';
}

// ========== 상태 ==========

let allConsultations = [];
let allAnalytics = [];
let selectedIds = new Set();

// ========== 데이터 로드 트리거 ==========

window.__loadData = loadData;

// Firebase Auth 상태 감지 - 이미 로그인된 경우 자동 데이터 로드
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-overlay').hidden = true;
        document.getElementById('admin-content').hidden = false;
        loadData();
    }
});

// ========== 데이터 로드 ==========

async function loadData() {
    const spinner = document.getElementById('loading-spinner');
    spinner && (spinner.hidden = false);
    document.getElementById('empty-state').hidden = true;

    try {

        const [consultSnap, analyticsSnap] = await Promise.all([
            getDocs(query(collection(db, 'consultations'), orderBy('createdAt', 'desc'))),
            getDocs(query(collection(db, 'analytics'), orderBy('createdAt', 'desc')))
        ]);
        allConsultations = consultSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        allAnalytics = analyticsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.error('데이터 로드 실패:', err);
        showError('데이터를 불러오는데 실패했습니다: ' + err.message);
        allConsultations = [];
        allAnalytics = [];
    }

    spinner && (spinner.hidden = true);
    populateCourtFilter();
    updateStats();
    updateAnalyticsStats();
    updateDailyStats();
    updateFunnelAnalysis();
    updateReferrerStats();
    renderList();
    document.getElementById('select-all-bar').hidden = allConsultations.length === 0;
    loadCases();
}

// ========== 통계 ==========

function updateStats() {
    const data = allConsultations;
    document.getElementById('stat-total').textContent = data.length;
    document.getElementById('stat-today').textContent = data.filter(c => isToday(c.createdAt)).length;

    const debts = data.map(c => {
        return parseDebt(getDebtValue(c));
    }).filter(v => v > 0);
    const avgDebt = debts.length > 0 ? Math.round(debts.reduce((a, b) => a + b, 0) / debts.length) : 0;
    document.getElementById('stat-avg-debt').textContent = avgDebt > 0 ? formatMoney(avgDebt) : '-';

    const courts = {};
    data.forEach(c => {
        const court = c.simulationResults?.['관할 법원'];
        if (court) courts[court] = (courts[court] || 0) + 1;
    });
    const topCourt = Object.entries(courts).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('stat-top-court').textContent = topCourt ? topCourt[0] : '-';
}

// ========== 방문자 통계 ==========

function updateAnalyticsStats() {
    const pageviews = allAnalytics.filter(a => a.type === 'pageview');
    const lawyerClicks = allAnalytics.filter(a => a.type === 'lawyer_click');
    const todayViews = pageviews.filter(a => isToday(a.createdAt));

    document.getElementById('stat-views').textContent = pageviews.length;
    document.getElementById('stat-views-today').textContent = todayViews.length;
    document.getElementById('stat-lawyer-clicks').textContent = lawyerClicks.length;

    // 전환율 = 상담 신청 / 방문자
    const rate = pageviews.length > 0
        ? ((allConsultations.length / pageviews.length) * 100).toFixed(1) + '%'
        : '-';
    document.getElementById('stat-conversion').textContent = rate;
}

// ========== 일별 방문자 추이 ==========

function updateDailyStats() {
    const pageviews = allAnalytics.filter(a => a.type === 'pageview');
    const container = document.getElementById('daily-stats-body');

    // 최근 7일 날짜 생성
    const days = [];
    const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        days.push(d);
    }

    // 일별 방문자 수 집계
    const dailyCounts = days.map(day => {
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        return pageviews.filter(a => {
            const date = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
            return date >= day && date < nextDay;
        }).length;
    });

    const maxCount = Math.max(...dailyCounts, 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 평균 계산
    const totalVisits = dailyCounts.reduce((a, b) => a + b, 0);
    const avgVisits = (totalVisits / 7).toFixed(1);

    let chartHtml = '<div class="daily-chart">';
    days.forEach((day, i) => {
        const count = dailyCounts[i];
        const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
        const isToday = day.getTime() === today.getTime();
        const label = `${day.getMonth() + 1}/${day.getDate()}(${dayLabels[day.getDay()]})`;

        chartHtml += `
            <div class="daily-bar-wrapper${isToday ? ' daily-bar-today' : ''}">
                <span class="daily-bar-count">${count}</span>
                <div class="daily-bar" style="height:${Math.max(heightPercent, 3)}%"></div>
                <span class="daily-bar-label">${label}</span>
            </div>
        `;
    });
    chartHtml += '</div>';
    chartHtml += `<div class="daily-avg">일 평균 방문자: <strong>${avgVisits}명</strong></div>`;

    container.innerHTML = chartHtml;
}

// ========== 전환 퍼널 분석 ==========

function updateFunnelAnalysis() {
    const container = document.getElementById('funnel-chart');
    const insightEl = document.getElementById('funnel-insight');

    const funnelEvents = allAnalytics.filter(a => a.type === 'funnel_step');

    const stepLabels = [
        '페이지 방문',
        '시뮬레이션 시작',
        'Q1 응답',
        'Q2 응답',
        'Q3 응답',
        'Q4 응답',
        'Q5 응답',
        '상담 신청 완료'
    ];

    // 각 단계별 도달 수 집계
    const stepCounts = new Array(8).fill(0);
    funnelEvents.forEach(a => {
        const step = a.step ?? a.funnelStep;
        if (step !== undefined && step >= 0 && step <= 7) {
            stepCounts[step]++;
        }
    });

    // 퍼널 이벤트가 없으면 pageview/consultation 기반 기본 퍼널 생성
    const totalPageviews = allAnalytics.filter(a => a.type === 'pageview').length;
    const totalConsultations = allConsultations.length;
    if (stepCounts.every(c => c === 0) && totalPageviews > 0) {
        stepCounts[0] = totalPageviews;
        stepCounts[7] = totalConsultations;
    }

    const maxCount = Math.max(...stepCounts, 1);

    let chartHtml = '<div class="funnel-bars">';
    stepCounts.forEach((count, i) => {
        const widthPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
        chartHtml += `
            <div class="funnel-row">
                <span class="funnel-label">${stepLabels[i]}</span>
                <div class="funnel-bar-track">
                    <div class="funnel-bar" style="width:${Math.max(widthPercent, 2)}%"></div>
                </div>
                <span class="funnel-count">${count}</span>
            </div>
        `;
    });
    chartHtml += '</div>';
    container.innerHTML = chartHtml;

    // 가장 이탈률이 높은 단계 찾기
    let maxDropRate = 0;
    let maxDropStep = -1;
    for (let i = 0; i < stepCounts.length - 1; i++) {
        if (stepCounts[i] > 0) {
            const dropRate = ((stepCounts[i] - stepCounts[i + 1]) / stepCounts[i]) * 100;
            if (dropRate > maxDropRate) {
                maxDropRate = dropRate;
                maxDropStep = i;
            }
        }
    }

    if (maxDropStep >= 0) {
        insightEl.innerHTML = `<i class="fas fa-lightbulb"></i> 가장 이탈률이 높은 단계: <strong>${stepLabels[maxDropStep]} → ${stepLabels[maxDropStep + 1]}</strong> (이탈률 ${maxDropRate.toFixed(1)}%)`;
    } else {
        insightEl.innerHTML = '<i class="fas fa-info-circle"></i> 퍼널 데이터가 부족합니다.';
    }
}

// ========== 유입 채널별 통계 ==========

function updateReferrerStats() {
    const container = document.getElementById('referrer-stats');
    const pageviews = allAnalytics.filter(a => a.type === 'pageview');

    const channels = {
        '네이버': 0,
        '구글': 0,
        '카카오': 0,
        '직접 방문': 0,
        '기타': 0
    };

    const channelIcons = {
        '네이버': 'fas fa-leaf',
        '구글': 'fab fa-google',
        '카카오': 'fas fa-comment',
        '직접 방문': 'fas fa-desktop',
        '기타': 'fas fa-globe'
    };

    const channelColors = {
        '네이버': '#03C75A',
        '구글': '#4285F4',
        '카카오': '#FEE500',
        '직접 방문': '#6c5ce7',
        '기타': '#636e72'
    };

    pageviews.forEach(a => {
        const ref = (a.referrer || '').toLowerCase();
        if (!ref || ref === '' || ref === 'direct') {
            channels['직접 방문']++;
        } else if (ref.includes('naver')) {
            channels['네이버']++;
        } else if (ref.includes('google')) {
            channels['구글']++;
        } else if (ref.includes('kakao')) {
            channels['카카오']++;
        } else {
            channels['기타']++;
        }
    });

    const totalViews = pageviews.length || 1;

    let html = '<div class="referrer-grid">';
    Object.entries(channels).forEach(([name, count]) => {
        const percent = ((count / totalViews) * 100).toFixed(1);
        html += `
            <div class="referrer-item">
                <div class="referrer-item-header">
                    <span class="referrer-icon" style="color:${channelColors[name]}"><i class="${channelIcons[name]}"></i></span>
                    <span class="referrer-name">${name}</span>
                </div>
                <div class="referrer-bar-track">
                    <div class="referrer-bar" style="width:${Math.max(parseFloat(percent), 1)}%;background:${channelColors[name]}"></div>
                </div>
                <div class="referrer-values">
                    <span class="referrer-count">${count}명</span>
                    <span class="referrer-percent">${percent}%</span>
                </div>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

// ========== 상담 상태 관리 ==========

const STATUS_CONFIG = {
    new: { label: '신규', color: '#3498db' },
    contacted: { label: '연락완료', color: '#f39c12' },
    converted: { label: '수임성사', color: '#27ae60' },
    closed: { label: '종료', color: '#95a5a6' }
};

async function updateConsultationStatus(docId, newStatus) {
    try {
        await updateDoc(doc(db, 'consultations', docId), { status: newStatus });
        // 로컬 데이터도 업데이트
        const item = allConsultations.find(c => c.id === docId);
        if (item) item.status = newStatus;
    } catch (err) {
        console.error('상태 업데이트 실패:', err);
        alert('상태 변경 중 오류가 발생했습니다.');
    }
}

// ========== 관할 법원 필터 ==========

function populateCourtFilter() {
    const select = document.getElementById('filter-court');
    const courts = new Set();
    allConsultations.forEach(c => {
        const court = c.simulationResults?.['관할 법원'];
        if (court) courts.add(court);
    });
    // 기존 옵션 제거 (첫 번째 "전체" 제외)
    while (select.options.length > 1) select.remove(1);
    [...courts].sort().forEach(court => {
        const opt = document.createElement('option');
        opt.value = court;
        opt.textContent = court;
        select.appendChild(opt);
    });
}

// ========== 필터/정렬/검색 ==========

function getFilteredData() {
    let data = [...allConsultations];

    // 검색
    const searchText = document.getElementById('search-input').value.trim().toLowerCase();
    if (searchText) {
        data = data.filter(c => {
            const name = (c.requesterInfo?.name || '').toLowerCase();
            const phone = (c.requesterInfo?.phone || '').toLowerCase();
            return name.includes(searchText) || phone.includes(searchText);
        });
    }

    // 관할 법원 필터
    const courtFilter = document.getElementById('filter-court').value;
    if (courtFilter) {
        data = data.filter(c => c.simulationResults?.['관할 법원'] === courtFilter);
    }

    // 상태 필터
    const statusFilter = document.getElementById('filter-status').value;
    if (statusFilter) {
        data = data.filter(c => (c.status || 'new') === statusFilter);
    }

    // 날짜 필터
    const startDate = document.getElementById('filter-date-start').value;
    const endDate = document.getElementById('filter-date-end').value;
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        data = data.filter(c => {
            const d = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
            return d >= start;
        });
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        data = data.filter(c => {
            const d = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
            return d <= end;
        });
    }

    // 정렬
    const sortVal = document.getElementById('sort-select').value;
    data.sort((a, b) => {
        switch (sortVal) {
            case 'newest': {
                const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const db2 = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return db2 - da;
            }
            case 'oldest': {
                const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                const db2 = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                return da - db2;
            }
            case 'debt-high':
                return parseDebt(getDebtValue(b)) - parseDebt(getDebtValue(a));
            case 'debt-low':
                return parseDebt(getDebtValue(a)) - parseDebt(getDebtValue(b));
            default: return 0;
        }
    });

    return data;
}

// ========== 목록 렌더링 ==========

function renderList() {
    const container = document.getElementById('consultation-list');
    const filtered = getFilteredData();
    container.innerHTML = '';

    if (filtered.length === 0) {
        document.getElementById('empty-state').hidden = false;
        return;
    }
    document.getElementById('empty-state').hidden = true;

    filtered.forEach(c => {
        const card = document.createElement('div');
        card.className = 'consultation-card';
        card.dataset.id = c.id;

        const name = c.requesterInfo?.name || '이름 없음';
        const phone = maskPhone(c.requesterInfo?.phone);
        const dateStr = formatDateShort(c.createdAt);
        const court = c.simulationResults?.['관할 법원'] || '-';
        const debt = parseDebt(getDebtValue(c));
        const rate = c.simulationResults?.['예상 탕감률'] || '-';
        const status = c.status || 'new';
        const statusInfo = STATUS_CONFIG[status] || STATUS_CONFIG['new'];

        card.innerHTML = `
            <input type="checkbox" class="card-checkbox" data-id="${c.id}" ${selectedIds.has(c.id) ? 'checked' : ''}>
            <div class="card-header">
                <span class="card-name">${escapeHtml(name)}</span>
                <span class="card-date">${dateStr}</span>
            </div>
            <div class="card-status-row">
                <span class="status-badge" style="background:${statusInfo.color}">${statusInfo.label}</span>
                <select class="status-select" data-id="${c.id}">
                    <option value="new" ${status === 'new' ? 'selected' : ''}>신규</option>
                    <option value="contacted" ${status === 'contacted' ? 'selected' : ''}>연락완료</option>
                    <option value="converted" ${status === 'converted' ? 'selected' : ''}>수임성사</option>
                    <option value="closed" ${status === 'closed' ? 'selected' : ''}>종료</option>
                </select>
            </div>
            <div class="card-body">
                <div class="card-field"><span class="label">연락처</span> <span class="value">${phone}</span></div>
                <div class="card-field"><span class="label">관할</span> <span class="value">${escapeHtml(court)}</span></div>
                <div class="card-field"><span class="label">채무액</span> <span class="value">${debt > 0 ? formatMoney(debt) : '-'}</span></div>
                <div class="card-field"><span class="label">탕감률</span> <span class="value">${escapeHtml(String(rate))}</span></div>
            </div>
            <div class="card-actions">
                <button class="btn btn-danger btn-sm delete-btn" data-id="${c.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;

        // 카드 클릭 → 상세보기 (체크박스/삭제 버튼/상태 셀렉트 제외)
        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-checkbox') || e.target.closest('.delete-btn') || e.target.closest('.status-select')) return;
            showDetail(c);
        });

        container.appendChild(card);
    });

    // 체크박스 이벤트
    container.querySelectorAll('.card-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            e.stopPropagation();
            const id = cb.dataset.id;
            if (cb.checked) selectedIds.add(id);
            else selectedIds.delete(id);
            updateBulkUI();
        });
    });

    // 상태 변경 이벤트
    container.querySelectorAll('.status-select').forEach(sel => {
        sel.addEventListener('click', (e) => e.stopPropagation());
        sel.addEventListener('change', async (e) => {
            e.stopPropagation();
            const docId = sel.dataset.id;
            const newStatus = sel.value;
            await updateConsultationStatus(docId, newStatus);
            // 배지 업데이트
            const badge = sel.parentElement.querySelector('.status-badge');
            const info = STATUS_CONFIG[newStatus] || STATUS_CONFIG['new'];
            badge.style.background = info.color;
            badge.textContent = info.label;
        });
    });

    // 개별 삭제 이벤트
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            confirmDelete([btn.dataset.id]);
        });
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========== 체크박스/일괄 삭제 UI ==========

function updateBulkUI() {
    const bulkBtn = document.getElementById('bulk-delete-btn');
    const countEl = document.getElementById('selected-count');
    if (selectedIds.size > 0) {
        bulkBtn.hidden = false;
        countEl.textContent = selectedIds.size;
    } else {
        bulkBtn.hidden = true;
    }
    // 전체 선택 체크박스 상태 동기화
    const allCheckboxes = document.querySelectorAll('.card-checkbox');
    const selectAllCb = document.getElementById('select-all-checkbox');
    if (allCheckboxes.length > 0 && selectedIds.size === allCheckboxes.length) {
        selectAllCb.checked = true;
    } else {
        selectAllCb.checked = false;
    }
}

document.getElementById('select-all-checkbox').addEventListener('change', (e) => {
    const checked = e.target.checked;
    document.querySelectorAll('.card-checkbox').forEach(cb => {
        cb.checked = checked;
        if (checked) selectedIds.add(cb.dataset.id);
        else selectedIds.delete(cb.dataset.id);
    });
    updateBulkUI();
});

document.getElementById('bulk-delete-btn').addEventListener('click', () => {
    confirmDelete([...selectedIds]);
});

// ========== 삭제 ==========

let pendingDeleteIds = [];

function confirmDelete(ids) {
    pendingDeleteIds = ids;
    const msg = ids.length === 1
        ? '이 상담 데이터를 삭제하시겠습니까?'
        : `선택한 ${ids.length}건의 상담 데이터를 삭제하시겠습니까?`;
    document.getElementById('confirm-message').textContent = msg;
    document.getElementById('confirm-modal').hidden = false;
}

document.getElementById('confirm-cancel').addEventListener('click', () => {
    document.getElementById('confirm-modal').hidden = true;
    pendingDeleteIds = [];
});

document.getElementById('confirm-ok').addEventListener('click', async () => {
    document.getElementById('confirm-modal').hidden = true;
    try {
        await Promise.all(pendingDeleteIds.map(id => deleteDoc(doc(db, 'consultations', id))));
        allConsultations = allConsultations.filter(c => !pendingDeleteIds.includes(c.id));
        pendingDeleteIds.forEach(id => selectedIds.delete(id));
        pendingDeleteIds = [];
        updateStats();
        renderList();
        updateBulkUI();
    } catch (err) {
        console.error('삭제 실패:', err);
        alert('삭제 중 오류가 발생했습니다.');
    }
});

// ========== 상세보기 모달 ==========

function showDetail(c) {
    const body = document.getElementById('modal-body');
    const name = c.requesterInfo?.name || '-';
    const phone = c.requesterInfo?.phone || '-';
    const date = formatDate(c.createdAt);

    let answersHtml = '';
    if (c.simulationAnswers) {
        const entries = Object.entries(c.simulationAnswers);
        answersHtml = entries.map(([key, val]) =>
            `<div class="detail-item"><span class="label">${escapeHtml(key)}</span><span class="value">${escapeHtml(String(val))}</span></div>`
        ).join('');
    }

    let resultsHtml = '';
    if (c.simulationResults) {
        const entries = Object.entries(c.simulationResults);
        resultsHtml = entries.map(([key, val]) => {
            const isLong = String(val).length > 50;
            return `<div class="detail-item${isLong ? ' full-width' : ''}"><span class="label">${escapeHtml(key)}</span><span class="value">${escapeHtml(String(val))}</span></div>`;
        }).join('');
    }

    body.innerHTML = `
        <div class="detail-section">
            <h3><i class="fas fa-user"></i> 신청자 정보</h3>
            <div class="detail-grid">
                <div class="detail-item"><span class="label">이름</span><span class="value">${escapeHtml(name)}</span></div>
                <div class="detail-item"><span class="label">연락처</span><span class="value">${escapeHtml(phone)}</span></div>
                <div class="detail-item"><span class="label">신청일시</span><span class="value">${date}</span></div>
            </div>
        </div>
        <div class="detail-section">
            <h3><i class="fas fa-clipboard-check"></i> 시뮬레이션 답변</h3>
            <div class="detail-grid">${answersHtml || '<p>답변 데이터 없음</p>'}</div>
        </div>
        <div class="detail-section">
            <h3><i class="fas fa-chart-bar"></i> 진단 결과</h3>
            <div class="detail-grid">${resultsHtml || '<p>결과 데이터 없음</p>'}</div>
        </div>
    `;

    document.getElementById('detail-modal').hidden = false;
}

document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('detail-modal').hidden = true;
});

document.getElementById('detail-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        document.getElementById('detail-modal').hidden = true;
    }
});

document.getElementById('confirm-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        document.getElementById('confirm-modal').hidden = true;
        pendingDeleteIds = [];
    }
});

// ========== CSV 내보내기 ==========

document.getElementById('csv-export-btn').addEventListener('click', () => {
    const filtered = getFilteredData();
    if (filtered.length === 0) {
        alert('내보낼 데이터가 없습니다.');
        return;
    }

    // 모든 답변/결과 키 수집
    const answerKeys = new Set();
    const resultKeys = new Set();
    filtered.forEach(c => {
        if (c.simulationAnswers) Object.keys(c.simulationAnswers).forEach(k => answerKeys.add(k));
        if (c.simulationResults) Object.keys(c.simulationResults).forEach(k => resultKeys.add(k));
    });

    const headers = ['이름', '연락처', '신청일시', ...answerKeys, ...resultKeys];
    const rows = filtered.map(c => {
        const row = [
            c.requesterInfo?.name || '',
            maskPhone(c.requesterInfo?.phone),
            formatDate(c.createdAt),
        ];
        answerKeys.forEach(k => row.push(String(c.simulationAnswers?.[k] ?? '')));
        resultKeys.forEach(k => row.push(String(c.simulationResults?.[k] ?? '')));
        return row;
    });

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    // BOM for Excel 한글 호환
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const today = new Date().toISOString().slice(0, 10);
    a.download = `consultations_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
});

// ========== 검색/필터/정렬 이벤트 ==========

document.getElementById('search-input').addEventListener('input', renderList);
document.getElementById('filter-court').addEventListener('change', renderList);
document.getElementById('filter-status').addEventListener('change', renderList);
document.getElementById('filter-date-start').addEventListener('change', renderList);
document.getElementById('filter-date-end').addEventListener('change', renderList);
document.getElementById('sort-select').addEventListener('change', renderList);

// ========== 키보드 ESC ==========

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.getElementById('detail-modal').hidden = true;
        document.getElementById('confirm-modal').hidden = true;
        pendingDeleteIds = [];
    }
});

// ========== 6개월 경과 데이터 정리 ==========

async function cleanupOldData() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const snapshot = await getDocs(
        query(collection(db, 'consultations'),
              where('createdAt', '<', sixMonthsAgo))
    );

    if (snapshot.empty) {
        alert('삭제할 오래된 데이터가 없습니다.');
        return;
    }

    if (!confirm(`${snapshot.size}건의 6개월 경과 데이터를 삭제하시겠습니까?`)) return;

    let deleted = 0;
    for (const doc of snapshot.docs) {
        await deleteDoc(doc.ref);
        deleted++;
    }
    alert(`${deleted}건의 데이터가 삭제되었습니다.`);
    loadData(); // 데이터 새로고침
}

window.cleanupOldData = cleanupOldData;

// ========== 사건 관리 ==========

import { generateApplication, generateCreditorList, generateAssetList, generateIncomeExpenseList, generateRepaymentPlan, generateStatement, downloadDocx, downloadAllAsZip } from './doc-generators.js';

let allCases = [];
let currentCaseId = null;
let currentCaseData = null;

const CASE_STATUSES = ['접수', '서류준비', '신청완료', '개시결정', '변제중', '면책', '종결'];
const CASE_STATUS_COLORS = {
    '접수': '#3498db', '서류준비': '#f39c12', '신청완료': '#9b59b6',
    '개시결정': '#27ae60', '변제중': '#e67e22', '면책': '#2ecc71', '종결': '#95a5a6'
};

async function loadCases() {
    try {
        const snap = await getDocs(query(collection(db, 'cases'), orderBy('createdAt', 'desc')));
        allCases = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.error('사건 로드 실패:', err);
        allCases = [];
    }
    renderCasesList();
    renderCaseStatusSummary();
    populateDocCaseSelect();
}

function renderCaseStatusSummary() {
    const container = document.getElementById('case-status-summary');
    if (!container) return;
    const counts = {};
    CASE_STATUSES.forEach(s => counts[s] = 0);
    allCases.forEach(c => { counts[c.status || '접수'] = (counts[c.status || '접수'] || 0) + 1; });

    container.innerHTML = CASE_STATUSES.map(s =>
        `<span class="case-status-badge" style="background:${CASE_STATUS_COLORS[s]}20;color:${CASE_STATUS_COLORS[s]}">${s} (${counts[s]})</span>`
    ).join('');
}

function renderCasesList() {
    const container = document.getElementById('cases-list');
    if (!container) return;

    const searchText = (document.getElementById('case-search')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('case-status-filter')?.value || '';

    let filtered = allCases.filter(c => {
        if (searchText && !(c.clientName || '').toLowerCase().includes(searchText) && !(c.caseNumber || '').toLowerCase().includes(searchText)) return false;
        if (statusFilter && (c.status || '접수') !== statusFilter) return false;
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-briefcase"></i><p>등록된 사건이 없습니다.</p></div>';
        return;
    }

    container.innerHTML = filtered.map(c => {
        const status = c.status || '접수';
        const color = CASE_STATUS_COLORS[status] || '#95a5a6';
        const date = c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString('ko-KR') : '-';
        return `
            <div class="case-card" data-id="${c.id}">
                <div class="case-card-info">
                    <div class="case-card-name">${escapeHtml(c.clientName || '이름 없음')}</div>
                    <div class="case-card-meta">${escapeHtml(c.caseNumber || '사건번호 미정')} | ${c.court || '-'} | ${date}</div>
                </div>
                <span class="status-badge" style="background:${color}">${status}</span>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.case-card').forEach(card => {
        card.addEventListener('click', () => openCaseDetail(card.dataset.id));
    });
}

// 사건 상세 열기
async function openCaseDetail(caseId) {
    currentCaseId = caseId;
    document.getElementById('cases-list-view').hidden = true;
    document.getElementById('case-detail-view').hidden = false;

    const caseDoc = await getDoc(doc(db, 'cases', caseId));
    if (!caseDoc.exists()) { alert('사건을 찾을 수 없습니다.'); return; }
    currentCaseData = { id: caseDoc.id, ...caseDoc.data() };

    document.getElementById('case-detail-title').textContent = `${currentCaseData.clientName || '이름 없음'} - 사건 상세`;

    // 상태 셀렉트
    const statusSelect = document.getElementById('case-status-select');
    statusSelect.innerHTML = CASE_STATUSES.map(s =>
        `<option value="${s}" ${(currentCaseData.status || '접수') === s ? 'selected' : ''}>${s}</option>`
    ).join('');

    // 첫 탭 로드
    document.querySelectorAll('.case-tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.case-tab[data-tab="personal"]').classList.add('active');
    renderCaseTab('personal');
}

// 탭 렌더링
async function renderCaseTab(tabName) {
    const container = document.getElementById('case-tab-content');
    const d = currentCaseData;

    switch (tabName) {
        case 'personal':
            container.innerHTML = `
                <div class="form-row"><div class="form-group"><label>이름</label><input type="text" id="ct-name" value="${escapeHtml(d.clientName || '')}"></div>
                <div class="form-group"><label>주민등록번호</label><input type="text" id="ct-ssn" value="${escapeHtml(d.clientIdNumber || '')}"></div></div>
                <div class="form-row"><div class="form-group"><label>연락처</label><input type="tel" id="ct-phone" value="${escapeHtml(d.clientPhone || '')}"></div>
                <div class="form-group"><label>이메일</label><input type="email" id="ct-email" value="${escapeHtml(d.clientEmail || '')}"></div></div>
                <div class="form-group"><label>주소</label><input type="text" id="ct-address" value="${escapeHtml(d.clientAddress || '')}"></div>
                <div class="form-row"><div class="form-group"><label>관할 법원</label><input type="text" id="ct-court" value="${escapeHtml(d.court || '')}"></div>
                <div class="form-group"><label>사건번호</label><input type="text" id="ct-casenum" value="${escapeHtml(d.caseNumber || '')}"></div></div>
                <button class="btn btn-primary" id="save-personal-btn"><i class="fas fa-save"></i> 저장</button>
            `;
            document.getElementById('save-personal-btn').addEventListener('click', async () => {
                await updateDoc(doc(db, 'cases', currentCaseId), {
                    clientName: document.getElementById('ct-name').value,
                    clientIdNumber: document.getElementById('ct-ssn').value,
                    clientPhone: document.getElementById('ct-phone').value,
                    clientEmail: document.getElementById('ct-email').value,
                    clientAddress: document.getElementById('ct-address').value,
                    court: document.getElementById('ct-court').value,
                    caseNumber: document.getElementById('ct-casenum').value,
                    updatedAt: serverTimestamp()
                });
                currentCaseData.clientName = document.getElementById('ct-name').value;
                currentCaseData.clientIdNumber = document.getElementById('ct-ssn').value;
                currentCaseData.clientPhone = document.getElementById('ct-phone').value;
                currentCaseData.clientEmail = document.getElementById('ct-email').value;
                currentCaseData.clientAddress = document.getElementById('ct-address').value;
                currentCaseData.court = document.getElementById('ct-court').value;
                currentCaseData.caseNumber = document.getElementById('ct-casenum').value;
                alert('저장되었습니다.');
            });
            break;

        case 'family':
            container.innerHTML = `
                <div class="form-row"><div class="form-group"><label>혼인 여부</label>
                <select id="ct-marital"><option value="">선택</option><option value="미혼" ${d.familyInfo?.maritalStatus==='미혼'?'selected':''}>미혼</option><option value="기혼" ${d.familyInfo?.maritalStatus==='기혼'?'selected':''}>기혼</option><option value="이혼" ${d.familyInfo?.maritalStatus==='이혼'?'selected':''}>이혼</option><option value="사별" ${d.familyInfo?.maritalStatus==='사별'?'selected':''}>사별</option></select></div>
                <div class="form-group"><label>부양가족 수 (본인 포함)</label><input type="number" id="ct-family-count" value="${d.familyCount || 1}" min="1"></div></div>
                <div class="form-group"><label>배우자 이름</label><input type="text" id="ct-spouse" value="${escapeHtml(d.familyInfo?.spouseName || '')}"></div>
                <div class="form-group"><label>부양가족 상세</label><textarea id="ct-family-detail" rows="3">${escapeHtml(d.familyInfo?.detail || '')}</textarea></div>
                <button class="btn btn-primary" id="save-family-btn"><i class="fas fa-save"></i> 저장</button>
            `;
            document.getElementById('save-family-btn').addEventListener('click', async () => {
                await updateDoc(doc(db, 'cases', currentCaseId), {
                    familyInfo: {
                        maritalStatus: document.getElementById('ct-marital').value,
                        spouseName: document.getElementById('ct-spouse').value,
                        detail: document.getElementById('ct-family-detail').value
                    },
                    familyCount: parseInt(document.getElementById('ct-family-count').value) || 1,
                    updatedAt: serverTimestamp()
                });
                alert('저장되었습니다.');
            });
            break;

        case 'employment':
            container.innerHTML = `
                <div class="form-row"><div class="form-group"><label>재직 상태</label>
                <select id="ct-emp-status"><option value="">선택</option><option value="재직중" ${d.employmentInfo?.status==='재직중'?'selected':''}>재직중</option><option value="휴직중" ${d.employmentInfo?.status==='휴직중'?'selected':''}>휴직중</option><option value="무직" ${d.employmentInfo?.status==='무직'?'selected':''}>무직</option><option value="자영업" ${d.employmentInfo?.status==='자영업'?'selected':''}>자영업</option><option value="일용직" ${d.employmentInfo?.status==='일용직'?'selected':''}>일용직</option></select></div>
                <div class="form-group"><label>직장명</label><input type="text" id="ct-company" value="${escapeHtml(d.employmentInfo?.company || '')}"></div></div>
                <div class="form-row"><div class="form-group"><label>직위/직종</label><input type="text" id="ct-position" value="${escapeHtml(d.employmentInfo?.position || '')}"></div>
                <div class="form-group"><label>근속 기간</label><input type="text" id="ct-tenure" value="${escapeHtml(d.employmentInfo?.tenure || '')}"></div></div>
                <div class="form-group"><label>월 급여 (원)</label><input type="number" id="ct-salary" value="${d.employmentInfo?.salary || 0}"></div>
                <button class="btn btn-primary" id="save-emp-btn"><i class="fas fa-save"></i> 저장</button>
            `;
            document.getElementById('save-emp-btn').addEventListener('click', async () => {
                await updateDoc(doc(db, 'cases', currentCaseId), {
                    employmentInfo: {
                        status: document.getElementById('ct-emp-status').value,
                        company: document.getElementById('ct-company').value,
                        position: document.getElementById('ct-position').value,
                        tenure: document.getElementById('ct-tenure').value,
                        salary: parseInt(document.getElementById('ct-salary').value) || 0
                    },
                    updatedAt: serverTimestamp()
                });
                alert('저장되었습니다.');
            });
            break;

        case 'debts':
            await renderSubCollectionTab('debts', container);
            break;

        case 'assets':
            await renderSubCollectionTab('assets', container);
            break;

        case 'income-expense':
            await renderIncomeExpenseTab(container);
            break;

        case 'notes':
            await renderNotesTab(container);
            break;
    }
}

// 채무/재산 서브컬렉션 탭
async function renderSubCollectionTab(type, container) {
    const colRef = collection(db, 'cases', currentCaseId, type);
    const snap = await getDocs(colRef);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (type === 'debts') {
        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
                <h3>채무 목록 (${items.length}건)</h3>
                <button class="btn btn-primary btn-sm" id="add-debt-btn"><i class="fas fa-plus"></i> 채무 추가</button>
            </div>
            <table class="data-table"><thead><tr><th>채권자</th><th>유형</th><th>원금</th><th>이자</th><th>연체금</th><th>합계</th><th>담보</th><th>작업</th></tr></thead>
            <tbody id="debts-tbody"></tbody></table>
            <div class="data-table-footer"><span>총 채무: ${items.reduce((s,d) => s+(d.totalAmount||0), 0).toLocaleString()}원</span></div>
            <div id="debt-form-area" hidden></div>
        `;
        const tbody = document.getElementById('debts-tbody');
        items.forEach(d => {
            tbody.innerHTML += `<tr>
                <td>${escapeHtml(d.creditorName||'')}</td>
                <td>${escapeHtml(d.creditorType||'')} ${d.debtType?'('+escapeHtml(d.debtType)+')':''}</td>
                <td>${(d.principal||0).toLocaleString()}</td>
                <td>${(d.interest||0).toLocaleString()}</td>
                <td>${(d.overdue||0).toLocaleString()}</td>
                <td>${(d.totalAmount||0).toLocaleString()}</td>
                <td>${d.hasCollateral?'담보':'무담보'}</td>
                <td class="data-table-actions">
                    <button class="btn btn-danger btn-sm del-debt" data-id="${d.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });
        tbody.querySelectorAll('.del-debt').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('이 채무를 삭제하시겠습니까?')) return;
                await deleteDoc(doc(db, 'cases', currentCaseId, 'debts', btn.dataset.id));
                renderCaseTab('debts');
            });
        });
        document.getElementById('add-debt-btn').addEventListener('click', () => showDebtForm());
    } else {
        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
                <h3>재산 목록 (${items.length}건)</h3>
                <button class="btn btn-primary btn-sm" id="add-asset-btn"><i class="fas fa-plus"></i> 재산 추가</button>
            </div>
            <table class="data-table"><thead><tr><th>유형</th><th>명칭</th><th>평가액</th><th>담보액</th><th>순가치</th><th>작업</th></tr></thead>
            <tbody id="assets-tbody"></tbody></table>
            <div class="data-table-footer"><span>총 재산: ${items.reduce((s,a) => s+(a.appraisedValue||0), 0).toLocaleString()}원</span></div>
            <div id="asset-form-area" hidden></div>
        `;
        const tbody = document.getElementById('assets-tbody');
        items.forEach(a => {
            const net = (a.appraisedValue||0) - (a.lienAmount||0);
            tbody.innerHTML += `<tr>
                <td>${escapeHtml(a.assetType||'')}</td>
                <td>${escapeHtml(a.assetName||'')}</td>
                <td>${(a.appraisedValue||0).toLocaleString()}</td>
                <td>${(a.lienAmount||0).toLocaleString()}</td>
                <td>${net.toLocaleString()}</td>
                <td class="data-table-actions">
                    <button class="btn btn-danger btn-sm del-asset" data-id="${a.id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });
        tbody.querySelectorAll('.del-asset').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('이 재산을 삭제하시겠습니까?')) return;
                await deleteDoc(doc(db, 'cases', currentCaseId, 'assets', btn.dataset.id));
                renderCaseTab('assets');
            });
        });
        document.getElementById('add-asset-btn').addEventListener('click', () => showAssetForm());
    }
}

function showDebtForm() {
    const area = document.getElementById('debt-form-area');
    area.hidden = false;
    area.innerHTML = `
        <div style="background:#f8f9fa;padding:1.2rem;border-radius:8px;margin-top:1rem">
            <h4 style="margin-bottom:1rem">채무 추가</h4>
            <div class="form-row"><div class="form-group"><label>채권자명</label><input type="text" id="df-name"></div>
            <div class="form-group"><label>채권자 유형</label><select id="df-type"><option>금융기관</option><option>대부업체</option><option>개인</option><option>공공기관</option><option>기타</option></select></div></div>
            <div class="form-row"><div class="form-group"><label>채무 유형</label><select id="df-debt-type"><option>신용대출</option><option>카드론</option><option>카드매출</option><option>주택담보대출</option><option>자동차대출</option><option>학자금대출</option><option>보증채무</option><option>기타</option></select></div>
            <div class="form-group"><label>담보 여부</label><select id="df-collateral"><option value="false">무담보</option><option value="true">담보</option></select></div></div>
            <div class="form-row-3"><div class="form-group"><label>원금 (원)</label><input type="number" id="df-principal" value="0"></div>
            <div class="form-group"><label>이자 (원)</label><input type="number" id="df-interest" value="0"></div>
            <div class="form-group"><label>연체금 (원)</label><input type="number" id="df-overdue" value="0"></div></div>
            <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
                <button class="btn btn-primary" id="df-save"><i class="fas fa-check"></i> 추가</button>
                <button class="btn btn-secondary" id="df-cancel">취소</button>
            </div>
        </div>
    `;
    document.getElementById('df-cancel').addEventListener('click', () => { area.hidden = true; });
    document.getElementById('df-save').addEventListener('click', async () => {
        const principal = parseInt(document.getElementById('df-principal').value) || 0;
        const interest = parseInt(document.getElementById('df-interest').value) || 0;
        const overdue = parseInt(document.getElementById('df-overdue').value) || 0;
        await addDoc(collection(db, 'cases', currentCaseId, 'debts'), {
            creditorName: document.getElementById('df-name').value,
            creditorType: document.getElementById('df-type').value,
            debtType: document.getElementById('df-debt-type').value,
            hasCollateral: document.getElementById('df-collateral').value === 'true',
            principal, interest, overdue,
            totalAmount: principal + interest + overdue,
            createdAt: serverTimestamp()
        });
        renderCaseTab('debts');
    });
}

function showAssetForm() {
    const area = document.getElementById('asset-form-area');
    area.hidden = false;
    area.innerHTML = `
        <div style="background:#f8f9fa;padding:1.2rem;border-radius:8px;margin-top:1rem">
            <h4 style="margin-bottom:1rem">재산 추가</h4>
            <div class="form-row"><div class="form-group"><label>재산 유형</label><select id="af-type"><option>부동산</option><option>차량</option><option>예금</option><option>보험(해약환급금)</option><option>퇴직금</option><option>임차보증금</option><option>기타</option></select></div>
            <div class="form-group"><label>명칭</label><input type="text" id="af-name"></div></div>
            <div class="form-group"><label>상세</label><input type="text" id="af-detail" placeholder="예: 서울시 강남구 아파트 84㎡"></div>
            <div class="form-row"><div class="form-group"><label>평가액 (원)</label><input type="number" id="af-value" value="0"></div>
            <div class="form-group"><label>담보설정액 (원)</label><input type="number" id="af-lien" value="0"></div></div>
            <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
                <button class="btn btn-primary" id="af-save"><i class="fas fa-check"></i> 추가</button>
                <button class="btn btn-secondary" id="af-cancel">취소</button>
            </div>
        </div>
    `;
    document.getElementById('af-cancel').addEventListener('click', () => { area.hidden = true; });
    document.getElementById('af-save').addEventListener('click', async () => {
        await addDoc(collection(db, 'cases', currentCaseId, 'assets'), {
            assetType: document.getElementById('af-type').value,
            assetName: document.getElementById('af-name').value,
            detail: document.getElementById('af-detail').value,
            appraisedValue: parseInt(document.getElementById('af-value').value) || 0,
            lienAmount: parseInt(document.getElementById('af-lien').value) || 0,
            createdAt: serverTimestamp()
        });
        renderCaseTab('assets');
    });
}

// 수입/지출 탭
async function renderIncomeExpenseTab(container) {
    const [incSnap, expSnap] = await Promise.all([
        getDocs(collection(db, 'cases', currentCaseId, 'income')),
        getDocs(collection(db, 'cases', currentCaseId, 'expenses'))
    ]);
    const incomes = incSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const expenses = expSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const totalInc = incomes.reduce((s, i) => s + (i.monthlyAmount || 0), 0);
    const totalExp = expenses.reduce((s, e) => s + (e.monthlyAmount || 0), 0);

    container.innerHTML = `
        <h3>수입 (월 합계: ${totalInc.toLocaleString()}원)</h3>
        <table class="data-table"><thead><tr><th>유형</th><th>지급처</th><th>월 금액</th><th>작업</th></tr></thead>
        <tbody id="income-tbody">${incomes.map(i => `<tr><td>${escapeHtml(i.incomeType||'')}</td><td>${escapeHtml(i.source||'')}</td><td>${(i.monthlyAmount||0).toLocaleString()}</td>
        <td class="data-table-actions"><button class="btn btn-danger btn-sm del-inc" data-id="${i.id}"><i class="fas fa-trash"></i></button></td></tr>`).join('')}</tbody></table>
        <button class="btn btn-primary btn-sm" id="add-income-btn" style="margin:0.8rem 0"><i class="fas fa-plus"></i> 수입 추가</button>
        <div id="income-form-area" hidden></div>
        <hr style="margin:1.5rem 0">
        <h3>지출 (월 합계: ${totalExp.toLocaleString()}원)</h3>
        <table class="data-table"><thead><tr><th>유형</th><th>월 금액</th><th>작업</th></tr></thead>
        <tbody id="expense-tbody">${expenses.map(e => `<tr><td>${escapeHtml(e.expenseType||'')}</td><td>${(e.monthlyAmount||0).toLocaleString()}</td>
        <td class="data-table-actions"><button class="btn btn-danger btn-sm del-exp" data-id="${e.id}"><i class="fas fa-trash"></i></button></td></tr>`).join('')}</tbody></table>
        <button class="btn btn-primary btn-sm" id="add-expense-btn" style="margin:0.8rem 0"><i class="fas fa-plus"></i> 지출 추가</button>
        <div id="expense-form-area" hidden></div>
        <div class="data-table-footer" style="font-size:1.1rem;color:var(--primary-color)">
            <span>월 가용소득: ${(totalInc - totalExp).toLocaleString()}원</span>
        </div>
    `;

    container.querySelectorAll('.del-inc').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('삭제하시겠습니까?')) return;
            await deleteDoc(doc(db, 'cases', currentCaseId, 'income', btn.dataset.id));
            renderCaseTab('income-expense');
        });
    });
    container.querySelectorAll('.del-exp').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('삭제하시겠습니까?')) return;
            await deleteDoc(doc(db, 'cases', currentCaseId, 'expenses', btn.dataset.id));
            renderCaseTab('income-expense');
        });
    });

    document.getElementById('add-income-btn').addEventListener('click', () => {
        const area = document.getElementById('income-form-area');
        area.hidden = false;
        area.innerHTML = `
            <div style="background:#f8f9fa;padding:1rem;border-radius:8px">
            <div class="form-row-3"><div class="form-group"><label>유형</label><select id="if-type"><option>급여</option><option>사업소득</option><option>연금</option><option>임대소득</option><option>기타</option></select></div>
            <div class="form-group"><label>지급처</label><input type="text" id="if-source"></div>
            <div class="form-group"><label>월 금액 (원)</label><input type="number" id="if-amount" value="0"></div></div>
            <div style="display:flex;gap:0.5rem"><button class="btn btn-primary" id="if-save">추가</button><button class="btn btn-secondary" id="if-cancel">취소</button></div></div>
        `;
        document.getElementById('if-cancel').addEventListener('click', () => { area.hidden = true; });
        document.getElementById('if-save').addEventListener('click', async () => {
            await addDoc(collection(db, 'cases', currentCaseId, 'income'), {
                incomeType: document.getElementById('if-type').value,
                source: document.getElementById('if-source').value,
                monthlyAmount: parseInt(document.getElementById('if-amount').value) || 0,
                createdAt: serverTimestamp()
            });
            renderCaseTab('income-expense');
        });
    });

    document.getElementById('add-expense-btn').addEventListener('click', () => {
        const area = document.getElementById('expense-form-area');
        area.hidden = false;
        area.innerHTML = `
            <div style="background:#f8f9fa;padding:1rem;border-radius:8px">
            <div class="form-row"><div class="form-group"><label>유형</label><select id="ef-type"><option>주거비</option><option>식비</option><option>교통비</option><option>통신비</option><option>교육비</option><option>의료비</option><option>보험료</option><option>공과금</option><option>기타</option></select></div>
            <div class="form-group"><label>월 금액 (원)</label><input type="number" id="ef-amount" value="0"></div></div>
            <div style="display:flex;gap:0.5rem"><button class="btn btn-primary" id="ef-save">추가</button><button class="btn btn-secondary" id="ef-cancel">취소</button></div></div>
        `;
        document.getElementById('ef-cancel').addEventListener('click', () => { area.hidden = true; });
        document.getElementById('ef-save').addEventListener('click', async () => {
            await addDoc(collection(db, 'cases', currentCaseId, 'expenses'), {
                expenseType: document.getElementById('ef-type').value,
                monthlyAmount: parseInt(document.getElementById('ef-amount').value) || 0,
                createdAt: serverTimestamp()
            });
            renderCaseTab('income-expense');
        });
    });
}

// 메모 탭
async function renderNotesTab(container) {
    const snap = await getDocs(query(collection(db, 'cases', currentCaseId, 'notes'), orderBy('createdAt', 'desc')));
    const notes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    container.innerHTML = `
        <div class="note-input">
            <textarea id="note-text" placeholder="메모를 입력하세요..."></textarea>
            <button class="btn btn-primary" id="add-note-btn"><i class="fas fa-plus"></i></button>
        </div>
        <div class="notes-list" id="notes-list">
            ${notes.map(n => `
                <div class="note-card">
                    <div class="note-meta">${n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString('ko-KR') : '-'}
                        <button class="btn btn-danger btn-sm del-note" data-id="${n.id}" style="float:right"><i class="fas fa-trash"></i></button>
                    </div>
                    <div class="note-content">${escapeHtml(n.content || '')}</div>
                </div>
            `).join('')}
        </div>
    `;

    document.getElementById('add-note-btn').addEventListener('click', async () => {
        const text = document.getElementById('note-text').value.trim();
        if (!text) return;
        await addDoc(collection(db, 'cases', currentCaseId, 'notes'), {
            content: text,
            createdAt: serverTimestamp()
        });
        renderCaseTab('notes');
    });

    container.querySelectorAll('.del-note').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('메모를 삭제하시겠습니까?')) return;
            await deleteDoc(doc(db, 'cases', currentCaseId, 'notes', btn.dataset.id));
            renderCaseTab('notes');
        });
    });
}

// 사건 목록으로 돌아가기
document.getElementById('back-to-cases')?.addEventListener('click', () => {
    document.getElementById('case-detail-view').hidden = true;
    document.getElementById('cases-list-view').hidden = false;
    currentCaseId = null;
    currentCaseData = null;
    loadCases();
});

// 탭 전환
document.querySelectorAll('.case-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.case-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderCaseTab(tab.dataset.tab);
    });
});

// 사건 상태 변경
document.getElementById('case-status-select')?.addEventListener('change', async (e) => {
    if (!currentCaseId) return;
    await updateDoc(doc(db, 'cases', currentCaseId), { status: e.target.value, updatedAt: serverTimestamp() });
    if (currentCaseData) currentCaseData.status = e.target.value;
});

// 새 사건 등록
document.getElementById('new-case-btn')?.addEventListener('click', () => {
    document.getElementById('new-case-modal').hidden = false;
});
document.getElementById('new-case-modal-close')?.addEventListener('click', () => {
    document.getElementById('new-case-modal').hidden = true;
});
document.getElementById('nc-cancel')?.addEventListener('click', () => {
    document.getElementById('new-case-modal').hidden = true;
});
document.getElementById('nc-save')?.addEventListener('click', async () => {
    const name = document.getElementById('nc-name').value.trim();
    if (!name) { alert('이름을 입력하세요.'); return; }
    await addDoc(collection(db, 'cases'), {
        clientName: name,
        clientPhone: document.getElementById('nc-phone').value,
        clientIdNumber: document.getElementById('nc-ssn').value,
        clientAddress: document.getElementById('nc-address').value,
        court: document.getElementById('nc-court').value,
        caseNumber: document.getElementById('nc-case-number').value,
        status: '접수',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    document.getElementById('new-case-modal').hidden = true;
    // 폼 리셋
    ['nc-name','nc-phone','nc-ssn','nc-address','nc-case-number'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('nc-court').selectedIndex = 0;
    loadCases();
});

// 사건 검색/필터
document.getElementById('case-search')?.addEventListener('input', renderCasesList);
document.getElementById('case-status-filter')?.addEventListener('change', renderCasesList);

// ========== 서류 생성 페이지 ==========

function populateDocCaseSelect() {
    const select = document.getElementById('doc-case-select');
    if (!select) return;
    // 첫 번째 옵션 유지
    while (select.options.length > 1) select.remove(1);
    allCases.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = `${c.clientName || '이름 없음'} (${c.caseNumber || '번호 미정'})`;
        select.appendChild(opt);
    });
}

document.getElementById('doc-case-select')?.addEventListener('change', async (e) => {
    const caseId = e.target.value;
    const summary = document.getElementById('doc-case-summary');
    const checklist = document.getElementById('doc-checklist');
    const actions = document.getElementById('doc-actions');

    if (!caseId) {
        summary.hidden = true;
        checklist.hidden = true;
        actions.hidden = true;
        return;
    }

    const caseDoc = await getDoc(doc(db, 'cases', caseId));
    if (!caseDoc.exists()) return;
    const d = caseDoc.data();

    summary.hidden = false;
    checklist.hidden = false;
    actions.hidden = false;
    summary.innerHTML = `
        <div style="background:var(--surface-color);padding:1.2rem;border-radius:8px;margin:0 2rem;box-shadow:0 1px 4px var(--shadow-color)">
            <strong>${escapeHtml(d.clientName || '')}</strong> | ${escapeHtml(d.court || '-')} | 상태: ${d.status || '접수'}
        </div>
    `;
});

document.getElementById('generate-selected-btn')?.addEventListener('click', async () => {
    const caseId = document.getElementById('doc-case-select').value;
    if (!caseId) { alert('사건을 선택하세요.'); return; }
    await generateSelectedDocs(caseId);
});

document.getElementById('generate-all-zip-btn')?.addEventListener('click', async () => {
    const caseId = document.getElementById('doc-case-select').value;
    if (!caseId) { alert('사건을 선택하세요.'); return; }
    await generateAllDocsZip(caseId);
});

// 사건 상세에서 서류 생성 버튼
document.getElementById('generate-docs-btn')?.addEventListener('click', async () => {
    if (!currentCaseId) return;
    // 서류 생성 페이지로 이동하고 사건 선택
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const pages = document.querySelectorAll('.page-content');
    sidebarItems.forEach(i => i.classList.remove('active'));
    document.querySelector('.sidebar-item[data-page="documents"]').classList.add('active');
    pages.forEach(p => { p.hidden = p.dataset.page !== 'documents'; });
    document.getElementById('doc-case-select').value = currentCaseId;
    document.getElementById('doc-case-select').dispatchEvent(new Event('change'));
});

async function getCaseDataForDoc(caseId) {
    const caseDoc = await getDoc(doc(db, 'cases', caseId));
    const caseData = caseDoc.data();

    const [debtsSnap, assetsSnap, incomeSnap, expensesSnap] = await Promise.all([
        getDocs(collection(db, 'cases', caseId, 'debts')),
        getDocs(collection(db, 'cases', caseId, 'assets')),
        getDocs(collection(db, 'cases', caseId, 'income')),
        getDocs(collection(db, 'cases', caseId, 'expenses'))
    ]);

    const debts = debtsSnap.docs.map(d => d.data());
    const assets = assetsSnap.docs.map(d => d.data());
    const incomes = incomeSnap.docs.map(d => d.data());
    const expenses = expensesSnap.docs.map(d => d.data());

    caseData.totalDebt = debts.reduce((s, d) => s + (d.totalAmount || 0), 0);
    caseData.totalAsset = assets.reduce((s, a) => s + (a.appraisedValue || 0) - (a.lienAmount || 0), 0);
    caseData.monthlyIncome = incomes.reduce((s, i) => s + (i.monthlyAmount || 0), 0);
    caseData.monthlyExpense = expenses.reduce((s, e) => s + (e.monthlyAmount || 0), 0);

    return { caseData, debts, assets, incomes, expenses };
}

async function generateSelectedDocs(caseId) {
    const checked = document.querySelectorAll('#doc-checklist input[type="checkbox"]:checked');
    if (checked.length === 0) { alert('생성할 서류를 선택하세요.'); return; }

    const { caseData, debts, assets, incomes, expenses } = await getCaseDataForDoc(caseId);
    const name = caseData.clientName || '의뢰인';

    for (const cb of checked) {
        let docObj, filename;
        switch (cb.value) {
            case 'application':
                docObj = generateApplication(caseData);
                filename = `${name}_개인회생신청서.docx`;
                break;
            case 'creditors':
                docObj = generateCreditorList(caseData, debts);
                filename = `${name}_채권자목록.docx`;
                break;
            case 'assets':
                docObj = generateAssetList(caseData, assets);
                filename = `${name}_재산목록.docx`;
                break;
            case 'income-expense':
                docObj = generateIncomeExpenseList(caseData, incomes, expenses);
                filename = `${name}_수입지출목록.docx`;
                break;
            case 'repayment':
                docObj = generateRepaymentPlan(caseData, debts, incomes, expenses);
                filename = `${name}_변제계획안.docx`;
                break;
            case 'statement':
                docObj = generateStatement(caseData);
                filename = `${name}_진술서.docx`;
                break;
        }
        if (docObj) await downloadDocx(docObj, filename);
    }
}

async function generateAllDocsZip(caseId) {
    const { caseData, debts, assets, incomes, expenses } = await getCaseDataForDoc(caseId);
    const name = caseData.clientName || '의뢰인';

    const documents = [
        { doc: generateApplication(caseData), filename: `${name}_개인회생신청서.docx` },
        { doc: generateCreditorList(caseData, debts), filename: `${name}_채권자목록.docx` },
        { doc: generateAssetList(caseData, assets), filename: `${name}_재산목록.docx` },
        { doc: generateIncomeExpenseList(caseData, incomes, expenses), filename: `${name}_수입지출목록.docx` },
        { doc: generateRepaymentPlan(caseData, debts, incomes, expenses), filename: `${name}_변제계획안.docx` },
        { doc: generateStatement(caseData), filename: `${name}_진술서.docx` },
    ];

    await downloadAllAsZip(documents, `${name}_개인회생서류_전체.zip`);
}

// 새 사건 모달 클릭 바깥 닫기
document.getElementById('new-case-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.target.hidden = true;
});

// ========== 초기화 ==========
// Firebase Auth의 onAuthStateChanged가 인증 상태를 자동으로 관리합니다.
// loadCases는 loadData와 함께 호출
