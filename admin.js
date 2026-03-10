import { db } from './firebase-config.js';
import { collection, getDocs, orderBy, query, doc, deleteDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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

// ========== 초기화 ==========
// Firebase Auth의 onAuthStateChanged가 인증 상태를 자동으로 관리합니다.
