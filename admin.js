import { db } from './firebase-config.js';
import { collection, getDocs, orderBy, query, doc, deleteDoc, updateDoc, where, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ========== 탭/페이지 전환 ==========

function initNavigation() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const pages = document.querySelectorAll('.page-content');

    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const page = item.dataset.page;
            sidebarItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            pages.forEach(p => {
                p.hidden = p.dataset.page !== page;
            });
            if (page === 'cases') loadCases();
            if (page === 'documents') loadDocCaseSelect();

            document.querySelector('.sidebar')?.classList.remove('open');
            document.querySelector('.sidebar-overlay')?.classList.remove('active');
        });
    });

    document.querySelector('.sidebar-toggle')?.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('open');
        document.querySelector('.sidebar-overlay').classList.toggle('active');
    });
    document.querySelector('.sidebar-overlay')?.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.remove('open');
        document.querySelector('.sidebar-overlay').classList.remove('active');
    });
}

// ========== 유틸리티 ==========

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

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ========== 상태 ==========

let allConsultations = [];
let allAnalytics = [];
let selectedIds = new Set();
let allCases = [];
let currentCaseId = null;

// ========== 데이터 로드 트리거 ==========

window.__loadData = loadData;

// Firebase Auth 상태 감지
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('login-overlay').hidden = true;
        document.getElementById('admin-content').hidden = false;
        initNavigation();
        initNewCase();
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

    const debts = data.map(c => parseDebt(getDebtValue(c))).filter(v => v > 0);
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

    const rate = pageviews.length > 0
        ? ((allConsultations.length / pageviews.length) * 100).toFixed(1) + '%'
        : '-';
    document.getElementById('stat-conversion').textContent = rate;
}

// ========== 일별 방문자 추이 ==========

function updateDailyStats() {
    const pageviews = allAnalytics.filter(a => a.type === 'pageview');
    const container = document.getElementById('daily-stats-body');

    const days = [];
    const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        days.push(d);
    }

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

    const totalVisits = dailyCounts.reduce((a, b) => a + b, 0);
    const avgVisits = (totalVisits / 7).toFixed(1);

    let chartHtml = '<div class="daily-chart">';
    days.forEach((day, i) => {
        const count = dailyCounts[i];
        const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
        const isTodayBar = day.getTime() === today.getTime();
        const label = `${day.getMonth() + 1}/${day.getDate()}(${dayLabels[day.getDay()]})`;

        chartHtml += `
            <div class="daily-bar-wrapper${isTodayBar ? ' daily-bar-today' : ''}">
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
        '페이지 방문', '시뮬레이션 시작',
        'Q1 응답', 'Q2 응답', 'Q3 응답', 'Q4 응답', 'Q5 응답',
        '상담 신청 완료'
    ];

    const stepCounts = new Array(8).fill(0);
    funnelEvents.forEach(a => {
        const step = a.step ?? a.funnelStep;
        if (step !== undefined && step >= 0 && step <= 7) {
            stepCounts[step]++;
        }
    });

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

    const channels = { '네이버': 0, '구글': 0, '카카오': 0, '직접 방문': 0, '기타': 0 };
    const channelIcons = { '네이버': 'fas fa-leaf', '구글': 'fab fa-google', '카카오': 'fas fa-comment', '직접 방문': 'fas fa-desktop', '기타': 'fas fa-globe' };
    const channelColors = { '네이버': '#03C75A', '구글': '#4285F4', '카카오': '#FEE500', '직접 방문': '#6c5ce7', '기타': '#636e72' };

    pageviews.forEach(a => {
        const ref = (a.referrer || '').toLowerCase();
        if (!ref || ref === '' || ref === 'direct') channels['직접 방문']++;
        else if (ref.includes('naver')) channels['네이버']++;
        else if (ref.includes('google')) channels['구글']++;
        else if (ref.includes('kakao')) channels['카카오']++;
        else channels['기타']++;
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

    const searchText = document.getElementById('search-input').value.trim().toLowerCase();
    if (searchText) {
        data = data.filter(c => {
            const name = (c.requesterInfo?.name || '').toLowerCase();
            const phone = (c.requesterInfo?.phone || '').toLowerCase();
            return name.includes(searchText) || phone.includes(searchText);
        });
    }

    const courtFilter = document.getElementById('filter-court').value;
    if (courtFilter) data = data.filter(c => c.simulationResults?.['관할 법원'] === courtFilter);

    const statusFilter = document.getElementById('filter-status').value;
    if (statusFilter) data = data.filter(c => (c.status || 'new') === statusFilter);

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
            case 'debt-high': return parseDebt(getDebtValue(b)) - parseDebt(getDebtValue(a));
            case 'debt-low': return parseDebt(getDebtValue(a)) - parseDebt(getDebtValue(b));
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

        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-checkbox') || e.target.closest('.delete-btn') || e.target.closest('.status-select')) return;
            showDetail(c);
        });

        container.appendChild(card);
    });

    container.querySelectorAll('.card-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            e.stopPropagation();
            if (cb.checked) selectedIds.add(cb.dataset.id);
            else selectedIds.delete(cb.dataset.id);
            updateBulkUI();
        });
    });

    container.querySelectorAll('.status-select').forEach(sel => {
        sel.addEventListener('click', (e) => e.stopPropagation());
        sel.addEventListener('change', async (e) => {
            e.stopPropagation();
            await updateConsultationStatus(sel.dataset.id, sel.value);
            const badge = sel.parentElement.querySelector('.status-badge');
            const info = STATUS_CONFIG[sel.value] || STATUS_CONFIG['new'];
            badge.style.background = info.color;
            badge.textContent = info.label;
        });
    });

    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            confirmDelete([btn.dataset.id]);
        });
    });
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
    const allCheckboxes = document.querySelectorAll('.card-checkbox');
    const selectAllCb = document.getElementById('select-all-checkbox');
    selectAllCb.checked = allCheckboxes.length > 0 && selectedIds.size === allCheckboxes.length;
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
    document.querySelector('#detail-modal .modal-header h2').innerHTML = '<i class="fas fa-info-circle"></i> 상담 상세';
    const name = c.requesterInfo?.name || '-';
    const phone = c.requesterInfo?.phone || '-';
    const date = formatDate(c.createdAt);

    let answersHtml = '';
    if (c.simulationAnswers) {
        answersHtml = Object.entries(c.simulationAnswers).map(([key, val]) =>
            `<div class="detail-item"><span class="label">${escapeHtml(key)}</span><span class="value">${escapeHtml(String(val))}</span></div>`
        ).join('');
    }

    let resultsHtml = '';
    if (c.simulationResults) {
        resultsHtml = Object.entries(c.simulationResults).map(([key, val]) => {
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
        <div class="detail-section" style="text-align:center;padding-top:1rem;border-top:2px solid var(--accent-color)">
            <button id="convert-to-case-btn" class="btn btn-primary"><i class="fas fa-briefcase"></i> 수임 전환 (사건 등록)</button>
        </div>
    `;

    document.getElementById('detail-modal').hidden = false;

    document.getElementById('convert-to-case-btn')?.addEventListener('click', async () => {
        try {
            const newCase = {
                clientName: c.requesterInfo?.name || '',
                clientPhone: c.requesterInfo?.phone || '',
                court: c.simulationResults?.['관할 법원'] || '',
                status: '접수',
                consultationId: c.id,
                totalDebt: 0,
                totalAsset: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            await addDoc(collection(db, 'cases'), newCase);
            await updateDoc(doc(db, 'consultations', c.id), { status: 'converted' });
            c.status = 'converted';
            document.getElementById('detail-modal').hidden = true;
            alert('사건이 등록되었습니다. 사건 관리에서 확인하세요.');
            renderList();
        } catch (err) {
            alert('수임 전환 실패: ' + err.message);
        }
    });
}

document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('detail-modal').hidden = true;
});

document.getElementById('detail-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('detail-modal').hidden = true;
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
    if (filtered.length === 0) { alert('내보낼 데이터가 없습니다.'); return; }

    const answerKeys = new Set();
    const resultKeys = new Set();
    filtered.forEach(c => {
        if (c.simulationAnswers) Object.keys(c.simulationAnswers).forEach(k => answerKeys.add(k));
        if (c.simulationResults) Object.keys(c.simulationResults).forEach(k => resultKeys.add(k));
    });

    const headers = ['이름', '연락처', '신청일시', ...answerKeys, ...resultKeys];
    const rows = filtered.map(c => {
        const row = [c.requesterInfo?.name || '', maskPhone(c.requesterInfo?.phone), formatDate(c.createdAt)];
        answerKeys.forEach(k => row.push(String(c.simulationAnswers?.[k] ?? '')));
        resultKeys.forEach(k => row.push(String(c.simulationResults?.[k] ?? '')));
        return row;
    });

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consultations_${new Date().toISOString().slice(0, 10)}.csv`;
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
        const ncModal = document.getElementById('new-case-modal');
        if (ncModal) ncModal.hidden = true;
        pendingDeleteIds = [];
    }
});

// ========== 6개월 경과 데이터 정리 ==========

async function cleanupOldData() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const snapshot = await getDocs(
        query(collection(db, 'consultations'), where('createdAt', '<', sixMonthsAgo))
    );

    if (snapshot.empty) { alert('삭제할 오래된 데이터가 없습니다.'); return; }
    if (!confirm(`${snapshot.size}건의 6개월 경과 데이터를 삭제하시겠습니까?`)) return;

    let deleted = 0;
    for (const d of snapshot.docs) {
        await deleteDoc(d.ref);
        deleted++;
    }
    alert(`${deleted}건의 데이터가 삭제되었습니다.`);
    loadData();
}

window.cleanupOldData = cleanupOldData;

// ================================================================
// ========== 사건 관리 (Cases) ==========
// ================================================================

async function loadCases() {
    try {
        const authInstance = getAuth();
        if (!authInstance.currentUser) return;

        const snap = await getDocs(query(collection(db, 'cases'), orderBy('createdAt', 'desc')));
        allCases = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCaseStatusSummary();
        renderCasesList();
    } catch (err) {
        console.error('사건 로드 실패:', err);
    }
}

function renderCaseStatusSummary() {
    const container = document.getElementById('case-status-summary');
    if (!container) return;
    const statusConfig = {
        '접수': { color: '#3498db' }, '서류준비': { color: '#f39c12' },
        '신청완료': { color: '#00b894' }, '개시결정': { color: '#6c5ce7' },
        '변제중': { color: '#00cec9' }, '면책': { color: '#fdcb6e' },
        '종결': { color: '#636e72' }
    };
    const counts = {};
    allCases.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });

    let html = `<span class="case-status-badge" style="background:#e9ecef;color:#333" data-status="">전체 ${allCases.length}</span>`;
    Object.entries(statusConfig).forEach(([status, config]) => {
        const count = counts[status] || 0;
        if (count > 0) {
            html += `<span class="case-status-badge" style="background:${config.color};color:#fff" data-status="${status}">${status} ${count}</span>`;
        }
    });
    container.innerHTML = html;

    container.querySelectorAll('.case-status-badge').forEach(badge => {
        badge.addEventListener('click', () => {
            const filterEl = document.getElementById('case-status-filter');
            if (filterEl) filterEl.value = badge.dataset.status;
            renderCasesList();
        });
    });
}

function renderCasesList() {
    const container = document.getElementById('cases-list');
    if (!container) return;

    let filtered = [...allCases];
    const search = document.getElementById('case-search')?.value?.toLowerCase() || '';
    const statusFilter = document.getElementById('case-status-filter')?.value || '';

    if (search) {
        filtered = filtered.filter(c =>
            (c.clientName || '').toLowerCase().includes(search) ||
            (c.caseNumber || '').toLowerCase().includes(search)
        );
    }
    if (statusFilter) filtered = filtered.filter(c => c.status === statusFilter);

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-briefcase"></i><p>사건이 없습니다.</p></div>';
        return;
    }

    const statusColors = { '접수':'#3498db', '서류준비':'#f39c12', '신청완료':'#00b894', '개시결정':'#6c5ce7', '변제중':'#00cec9', '면책':'#fdcb6e', '종결':'#636e72' };

    container.innerHTML = filtered.map(c => {
        const debt = c.totalDebt ? formatMoney(c.totalDebt / 10000) : '-';
        const date = formatDateShort(c.createdAt);
        return `
            <div class="case-card" data-id="${c.id}">
                <div class="case-card-info">
                    <div class="case-card-name">${escapeHtml(c.clientName || '이름 없음')}</div>
                    <div class="case-card-meta">
                        <span class="status-badge" style="background:${statusColors[c.status] || '#999'}">${c.status || '접수'}</span>
                        ${c.caseNumber ? ' ' + escapeHtml(c.caseNumber) : ''} | ${c.court || '-'} | ${date}
                    </div>
                </div>
                <div class="case-card-amounts">
                    <div class="case-card-amount"><div class="label">채무총액</div><div class="value">${debt}</div></div>
                </div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.case-card').forEach(card => {
        card.addEventListener('click', () => openCaseDetail(card.dataset.id));
    });
}

// ========== 사건 상세 보기 ==========

async function openCaseDetail(caseId) {
    currentCaseId = caseId;
    document.getElementById('cases-list-view').hidden = true;
    document.getElementById('case-detail-view').hidden = false;

    const caseData = allCases.find(c => c.id === caseId);
    if (!caseData) return;

    document.getElementById('case-detail-title').textContent =
        (caseData.clientName || '이름 없음') + (caseData.caseNumber ? ' - ' + caseData.caseNumber : '');

    const statusSelect = document.getElementById('case-status-select');
    const statuses = ['접수','서류준비','신청완료','개시결정','변제중','면책','종결'];
    statusSelect.innerHTML = statuses.map(s =>
        `<option value="${s}" ${caseData.status === s ? 'selected' : ''}>${s}</option>`
    ).join('');

    const tabs = document.querySelectorAll('.case-tab');
    tabs.forEach(tab => {
        const newTab = tab.cloneNode(true);
        tab.parentNode.replaceChild(newTab, tab);
        newTab.addEventListener('click', () => {
            document.querySelectorAll('.case-tab').forEach(t => t.classList.remove('active'));
            newTab.classList.add('active');
            renderCaseTab(newTab.dataset.tab, caseData);
        });
    });

    renderCaseTab('personal', caseData);
}

function renderCaseTab(tabName, caseData) {
    const container = document.getElementById('case-tab-content');
    switch(tabName) {
        case 'personal': renderPersonalTab(container, caseData); break;
        case 'family': renderFamilyTab(container, caseData); break;
        case 'employment': renderEmploymentTab(container, caseData); break;
        case 'debts': renderDebtsTab(container, caseData); break;
        case 'assets': renderAssetsTab(container, caseData); break;
        case 'income-expense': renderIncomeExpenseTab(container, caseData); break;
        case 'notes': renderNotesTab(container, caseData); break;
    }
}

function renderPersonalTab(container, caseData) {
    container.innerHTML = `
        <form id="personal-form">
            <div class="form-row">
                <div class="form-group"><label>이름</label><input type="text" name="clientName" value="${escapeHtml(caseData.clientName || '')}"></div>
                <div class="form-group"><label>연락처</label><input type="tel" name="clientPhone" value="${escapeHtml(caseData.clientPhone || '')}"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>주민등록번호</label><input type="text" name="clientIdNumber" value="${escapeHtml(caseData.clientIdNumber || '')}" placeholder="000000-0000000"></div>
                <div class="form-group"><label>생년월일</label><input type="text" name="clientBirth" value="${escapeHtml(caseData.clientBirth || '')}"></div>
            </div>
            <div class="form-group"><label>주소</label><input type="text" name="clientAddress" value="${escapeHtml(caseData.clientAddress || '')}"></div>
            <div class="form-row">
                <div class="form-group"><label>관할 법원</label><input type="text" name="court" value="${escapeHtml(caseData.court || '')}"></div>
                <div class="form-group"><label>사건번호</label><input type="text" name="caseNumber" value="${escapeHtml(caseData.caseNumber || '')}" placeholder="2026개회12345"></div>
            </div>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> 저장</button>
        </form>
    `;
    container.querySelector('#personal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updates = { updatedAt: serverTimestamp() };
        for (const [key, val] of formData.entries()) updates[key] = val;
        try {
            await updateDoc(doc(db, 'cases', currentCaseId), updates);
            const cs = allCases.find(x => x.id === currentCaseId);
            if (cs) Object.assign(cs, updates);
            alert('저장되었습니다.');
        } catch (err) { alert('저장 실패: ' + err.message); }
    });
}

function renderFamilyTab(container, caseData) {
    const family = caseData.familyInfo || {};
    container.innerHTML = `
        <form id="family-form">
            <div class="form-row">
                <div class="form-group">
                    <label>혼인 여부</label>
                    <select name="maritalStatus">
                        <option value="">선택</option>
                        <option value="미혼" ${family.maritalStatus === '미혼' ? 'selected' : ''}>미혼</option>
                        <option value="기혼" ${family.maritalStatus === '기혼' ? 'selected' : ''}>기혼</option>
                        <option value="이혼" ${family.maritalStatus === '이혼' ? 'selected' : ''}>이혼</option>
                        <option value="사별" ${family.maritalStatus === '사별' ? 'selected' : ''}>사별</option>
                    </select>
                </div>
                <div class="form-group"><label>부양가족 수</label><input type="number" name="familyCount" value="${caseData.familyCount || 0}" min="0"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>배우자 이름</label><input type="text" name="spouseName" value="${escapeHtml(family.spouseName || '')}"></div>
                <div class="form-group"><label>배우자 주민번호</label><input type="text" name="spouseSsn" value="${escapeHtml(family.spouseSsn || '')}"></div>
            </div>
            <h3 style="margin:1rem 0 0.5rem;font-size:0.95rem;color:var(--primary-color)">부양가족 목록</h3>
            <div id="dependents-list"></div>
            <button type="button" id="add-dependent" class="btn btn-secondary btn-sm" style="margin:0.5rem 0"><i class="fas fa-plus"></i> 부양가족 추가</button>
            <br><button type="submit" class="btn btn-primary" style="margin-top:1rem"><i class="fas fa-save"></i> 저장</button>
        </form>
    `;
    container.querySelector('#family-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const updates = {
            familyInfo: { maritalStatus: fd.get('maritalStatus'), spouseName: fd.get('spouseName'), spouseSsn: fd.get('spouseSsn') },
            familyCount: parseInt(fd.get('familyCount')) || 0,
            updatedAt: serverTimestamp()
        };
        try {
            await updateDoc(doc(db, 'cases', currentCaseId), updates);
            const cs = allCases.find(x => x.id === currentCaseId);
            if (cs) Object.assign(cs, updates);
            alert('저장되었습니다.');
        } catch (err) { alert('저장 실패: ' + err.message); }
    });
}

function renderEmploymentTab(container, caseData) {
    const emp = caseData.employmentInfo || {};
    container.innerHTML = `
        <form id="employment-form">
            <div class="form-row">
                <div class="form-group">
                    <label>재직 상태</label>
                    <select name="employmentStatus">
                        <option value="">선택</option>
                        <option value="재직" ${emp.status === '재직' ? 'selected' : ''}>재직</option>
                        <option value="휴직" ${emp.status === '휴직' ? 'selected' : ''}>휴직</option>
                        <option value="퇴직" ${emp.status === '퇴직' ? 'selected' : ''}>퇴직</option>
                        <option value="자영업" ${emp.status === '자영업' ? 'selected' : ''}>자영업</option>
                        <option value="무직" ${emp.status === '무직' ? 'selected' : ''}>무직</option>
                    </select>
                </div>
                <div class="form-group"><label>직장명</label><input type="text" name="company" value="${escapeHtml(emp.company || '')}"></div>
            </div>
            <div class="form-group"><label>직장 주소</label><input type="text" name="companyAddress" value="${escapeHtml(emp.companyAddress || '')}"></div>
            <div class="form-row-3">
                <div class="form-group"><label>입사일</label><input type="date" name="startDate" value="${emp.startDate || ''}"></div>
                <div class="form-group"><label>월 급여(세전, 만원)</label><input type="number" name="salaryGross" value="${emp.salaryGross || ''}"></div>
                <div class="form-group"><label>월 급여(세후, 만원)</label><input type="number" name="salaryNet" value="${emp.salaryNet || ''}"></div>
            </div>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> 저장</button>
        </form>
    `;
    container.querySelector('#employment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const updates = {
            employmentInfo: { status: fd.get('employmentStatus'), company: fd.get('company'), companyAddress: fd.get('companyAddress'), startDate: fd.get('startDate'), salaryGross: parseInt(fd.get('salaryGross')) || 0, salaryNet: parseInt(fd.get('salaryNet')) || 0 },
            updatedAt: serverTimestamp()
        };
        try {
            await updateDoc(doc(db, 'cases', currentCaseId), updates);
            const cs = allCases.find(x => x.id === currentCaseId);
            if (cs) Object.assign(cs, updates);
            alert('저장되었습니다.');
        } catch (err) { alert('저장 실패: ' + err.message); }
    });
}

async function renderDebtsTab(container, caseData) {
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> 로딩 중...</div>';
    try {
        const snap = await getDocs(query(collection(db, 'cases', currentCaseId, 'debts'), orderBy('createdAt', 'desc')));
        const debts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        let totalDebt = debts.reduce((sum, d) => sum + (d.totalAmount || 0), 0);

        let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
                <h3 style="color:var(--primary-color)">채무 목록 (${debts.length}건)</h3>
                <button id="add-debt-btn" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> 채무 추가</button>
            </div>`;

        if (debts.length > 0) {
            html += `<table class="data-table"><thead><tr><th>채권자</th><th>유형</th><th>원금</th><th>이자</th><th>합계</th><th>연체</th><th></th></tr></thead><tbody>`;
            debts.forEach(d => {
                html += `<tr><td>${escapeHtml(d.creditorName || '')}</td><td>${escapeHtml(d.creditorType || '')}</td><td>${(d.principal || 0).toLocaleString()}원</td><td>${(d.interest || 0).toLocaleString()}원</td><td><strong>${(d.totalAmount || 0).toLocaleString()}원</strong></td><td>${d.isOverdue ? '<span style="color:red">연체</span>' : '-'}</td><td class="data-table-actions"><button class="btn btn-danger btn-sm delete-debt" data-id="${d.id}"><i class="fas fa-trash"></i></button></td></tr>`;
            });
            html += `</tbody></table><div class="data-table-footer"><span>총 채무액</span><span style="font-size:1.2rem;color:var(--primary-color)">${totalDebt.toLocaleString()}원</span></div>`;
        } else {
            html += '<p style="color:var(--text-secondary);text-align:center;padding:2rem">등록된 채무가 없습니다.</p>';
        }
        container.innerHTML = html;

        container.querySelector('#add-debt-btn')?.addEventListener('click', () => showAddDebtModal());
        container.querySelectorAll('.delete-debt').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('이 채무를 삭제하시겠습니까?')) return;
                await deleteDoc(doc(db, 'cases', currentCaseId, 'debts', btn.dataset.id));
                renderDebtsTab(container, caseData);
            });
        });
    } catch (err) {
        container.innerHTML = '<p style="color:red">채무 데이터 로드 실패: ' + err.message + '</p>';
    }
}

function showAddDebtModal() {
    const modal = document.getElementById('detail-modal');
    const body = document.getElementById('modal-body');
    document.querySelector('#detail-modal .modal-header h2').innerHTML = '<i class="fas fa-plus-circle"></i> 채무 추가';
    body.innerHTML = `
        <form id="add-debt-form">
            <div class="form-row">
                <div class="form-group"><label>채권자명</label><input type="text" name="creditorName" required placeholder="예: 국민은행"></div>
                <div class="form-group"><label>채권자 구분</label><select name="creditorType"><option value="은행">은행</option><option value="카드">카드</option><option value="캐피탈">캐피탈</option><option value="저축은행">저축은행</option><option value="대부업">대부업</option><option value="사채">사채</option><option value="공공기관">공공기관</option><option value="개인">개인</option><option value="기타">기타</option></select></div>
            </div>
            <div class="form-group"><label>채무 유형</label><select name="debtType"><option value="대출">대출</option><option value="카드론">카드론</option><option value="현금서비스">현금서비스</option><option value="할부">할부</option><option value="보증채무">보증채무</option><option value="세금">세금</option><option value="기타">기타</option></select></div>
            <div class="form-row-3">
                <div class="form-group"><label>원금 (원)</label><input type="number" name="principal" required></div>
                <div class="form-group"><label>이자 (원)</label><input type="number" name="interest" value="0"></div>
                <div class="form-group"><label>연체금 (원)</label><input type="number" name="overdue" value="0"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>연체 여부</label><select name="isOverdue"><option value="false">아니오</option><option value="true">예</option></select></div>
                <div class="form-group"><label>담보 여부</label><select name="hasCollateral"><option value="false">무담보</option><option value="true">담보</option></select></div>
            </div>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> 추가</button>
        </form>
    `;
    modal.hidden = false;
    body.querySelector('#add-debt-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const principal = parseInt(fd.get('principal')) || 0;
        const interest = parseInt(fd.get('interest')) || 0;
        const overdueAmt = parseInt(fd.get('overdue')) || 0;
        const debtData = { creditorName: fd.get('creditorName'), creditorType: fd.get('creditorType'), debtType: fd.get('debtType'), principal, interest, overdue: overdueAmt, totalAmount: principal + interest + overdueAmt, isOverdue: fd.get('isOverdue') === 'true', hasCollateral: fd.get('hasCollateral') === 'true', createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        try {
            await addDoc(collection(db, 'cases', currentCaseId, 'debts'), debtData);
            modal.hidden = true;
            const snap = await getDocs(collection(db, 'cases', currentCaseId, 'debts'));
            const totalDebt = snap.docs.reduce((sum, d) => sum + (d.data().totalAmount || 0), 0);
            await updateDoc(doc(db, 'cases', currentCaseId), { totalDebt, updatedAt: serverTimestamp() });
            const cd = allCases.find(c => c.id === currentCaseId);
            if (cd) cd.totalDebt = totalDebt;
            renderDebtsTab(document.getElementById('case-tab-content'), cd);
        } catch (err) { alert('채무 추가 실패: ' + err.message); }
    });
}

async function renderAssetsTab(container, caseData) {
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> 로딩 중...</div>';
    try {
        const snap = await getDocs(query(collection(db, 'cases', currentCaseId, 'assets'), orderBy('createdAt', 'desc')));
        const assets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        let totalAsset = assets.reduce((sum, a) => sum + (a.appraisedValue || 0), 0);

        let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem"><h3 style="color:var(--primary-color)">재산 목록 (${assets.length}건)</h3><button id="add-asset-btn" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> 재산 추가</button></div>`;
        if (assets.length > 0) {
            html += `<table class="data-table"><thead><tr><th>유형</th><th>명칭</th><th>평가액</th><th>담보액</th><th>순가치</th><th></th></tr></thead><tbody>`;
            assets.forEach(a => {
                const net = (a.appraisedValue || 0) - (a.lienAmount || 0);
                html += `<tr><td>${escapeHtml(a.assetType || '')}</td><td>${escapeHtml(a.assetName || '')}</td><td>${(a.appraisedValue || 0).toLocaleString()}원</td><td>${(a.lienAmount || 0).toLocaleString()}원</td><td><strong>${net.toLocaleString()}원</strong></td><td><button class="btn btn-danger btn-sm delete-asset" data-id="${a.id}"><i class="fas fa-trash"></i></button></td></tr>`;
            });
            html += `</tbody></table><div class="data-table-footer"><span>총 재산 평가액</span><span style="font-size:1.2rem;color:var(--primary-color)">${totalAsset.toLocaleString()}원</span></div>`;
        } else {
            html += '<p style="color:var(--text-secondary);text-align:center;padding:2rem">등록된 재산이 없습니다.</p>';
        }
        container.innerHTML = html;
        container.querySelector('#add-asset-btn')?.addEventListener('click', () => showAddAssetModal(caseData));
        container.querySelectorAll('.delete-asset').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (!confirm('삭제하시겠습니까?')) return;
                await deleteDoc(doc(db, 'cases', currentCaseId, 'assets', btn.dataset.id));
                renderAssetsTab(container, caseData);
            });
        });
    } catch (err) {
        container.innerHTML = '<p style="color:red">재산 데이터 로드 실패: ' + err.message + '</p>';
    }
}

function showAddAssetModal(caseData) {
    const modal = document.getElementById('detail-modal');
    const body = document.getElementById('modal-body');
    document.querySelector('#detail-modal .modal-header h2').innerHTML = '<i class="fas fa-plus-circle"></i> 재산 추가';
    body.innerHTML = `
        <form id="add-asset-form">
            <div class="form-row">
                <div class="form-group"><label>재산 유형</label><select name="assetType"><option value="부동산">부동산</option><option value="자동차">자동차</option><option value="예금">예금</option><option value="보험">보험</option><option value="퇴직금">퇴직금</option><option value="주식">주식</option><option value="전세보증금">전세보증금</option><option value="기타">기타</option></select></div>
                <div class="form-group"><label>명칭</label><input type="text" name="assetName" required placeholder="예: 국민은행 정기예금"></div>
            </div>
            <div class="form-group"><label>상세 정보</label><input type="text" name="detail" placeholder="주소, 차량번호 등"></div>
            <div class="form-row">
                <div class="form-group"><label>평가액 (원)</label><input type="number" name="appraisedValue" required></div>
                <div class="form-group"><label>담보권 설정액 (원)</label><input type="number" name="lienAmount" value="0"></div>
            </div>
            <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> 추가</button>
        </form>
    `;
    modal.hidden = false;
    body.querySelector('#add-asset-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = { assetType: fd.get('assetType'), assetName: fd.get('assetName'), detail: fd.get('detail'), appraisedValue: parseInt(fd.get('appraisedValue')) || 0, lienAmount: parseInt(fd.get('lienAmount')) || 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        data.netValue = data.appraisedValue - data.lienAmount;
        try {
            await addDoc(collection(db, 'cases', currentCaseId, 'assets'), data);
            modal.hidden = true;
            const snap = await getDocs(collection(db, 'cases', currentCaseId, 'assets'));
            const totalAsset = snap.docs.reduce((sum, d) => sum + (d.data().appraisedValue || 0), 0);
            await updateDoc(doc(db, 'cases', currentCaseId), { totalAsset, updatedAt: serverTimestamp() });
            if (caseData) caseData.totalAsset = totalAsset;
            renderAssetsTab(document.getElementById('case-tab-content'), caseData);
        } catch (err) { alert('재산 추가 실패: ' + err.message); }
    });
}

async function renderIncomeExpenseTab(container, caseData) {
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> 로딩 중...</div>';
    try {
        const [incSnap, expSnap] = await Promise.all([
            getDocs(collection(db, 'cases', currentCaseId, 'income')),
            getDocs(collection(db, 'cases', currentCaseId, 'expenses'))
        ]);
        const incomes = incSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const expenses = expSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const totalIncome = incomes.reduce((s, i) => s + (i.monthlyAmount || 0), 0);
        const totalExpense = expenses.reduce((s, e) => s + (e.monthlyAmount || 0), 0);
        const disposable = totalIncome - totalExpense;

        let html = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem"><div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem"><h3 style="color:var(--primary-color)">월 수입</h3><button id="add-income-btn" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i></button></div><table class="data-table"><thead><tr><th>유형</th><th>지급처</th><th>월액</th><th></th></tr></thead><tbody>`;
        incomes.forEach(i => {
            html += `<tr><td>${escapeHtml(i.incomeType||'')}</td><td>${escapeHtml(i.source||'')}</td><td>${(i.monthlyAmount||0).toLocaleString()}원</td><td><button class="btn btn-danger btn-sm del-income" data-id="${i.id}"><i class="fas fa-trash"></i></button></td></tr>`;
        });
        html += `</tbody></table><div class="data-table-footer"><span>합계</span><span>${totalIncome.toLocaleString()}원</span></div></div><div><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem"><h3 style="color:var(--primary-color)">월 지출</h3><button id="add-expense-btn" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i></button></div><table class="data-table"><thead><tr><th>유형</th><th>월액</th><th></th></tr></thead><tbody>`;
        expenses.forEach(e => {
            html += `<tr><td>${escapeHtml(e.expenseType||'')}</td><td>${(e.monthlyAmount||0).toLocaleString()}원</td><td><button class="btn btn-danger btn-sm del-expense" data-id="${e.id}"><i class="fas fa-trash"></i></button></td></tr>`;
        });
        html += `</tbody></table><div class="data-table-footer"><span>합계</span><span>${totalExpense.toLocaleString()}원</span></div></div></div>`;
        html += `<div style="background:var(--surface-color);border-radius:12px;padding:1.5rem;margin-top:1rem;box-shadow:0 2px 8px var(--shadow-color);text-align:center"><div style="font-size:0.9rem;color:var(--text-secondary)">월 가용소득 (수입 - 지출)</div><div style="font-size:1.8rem;font-weight:800;color:${disposable >= 0 ? 'var(--primary-color)' : 'var(--danger-color)'}">${disposable.toLocaleString()}원</div><div style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.5rem">3년 변제 시 총 변제금: ${(disposable * 36).toLocaleString()}원 | 5년 변제 시 총 변제금: ${(disposable * 60).toLocaleString()}원</div></div>`;
        container.innerHTML = html;

        container.querySelector('#add-income-btn')?.addEventListener('click', () => {
            const type = prompt('수입 유형 (급여/사업소득/연금/임대소득/기타):');
            const source = prompt('지급처:');
            const amount = parseInt(prompt('월 금액 (원):'));
            if (type && amount) addDoc(collection(db, 'cases', currentCaseId, 'income'), { incomeType: type, source: source || '', monthlyAmount: amount, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }).then(() => renderIncomeExpenseTab(container, caseData));
        });
        container.querySelector('#add-expense-btn')?.addEventListener('click', () => {
            const type = prompt('지출 유형 (주거비/식비/교통비/통신비/교육비/의료비/보험료/기타):');
            const amount = parseInt(prompt('월 금액 (원):'));
            if (type && amount) addDoc(collection(db, 'cases', currentCaseId, 'expenses'), { expenseType: type, monthlyAmount: amount, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }).then(() => renderIncomeExpenseTab(container, caseData));
        });
        container.querySelectorAll('.del-income').forEach(btn => { btn.addEventListener('click', async () => { await deleteDoc(doc(db, 'cases', currentCaseId, 'income', btn.dataset.id)); renderIncomeExpenseTab(container, caseData); }); });
        container.querySelectorAll('.del-expense').forEach(btn => { btn.addEventListener('click', async () => { await deleteDoc(doc(db, 'cases', currentCaseId, 'expenses', btn.dataset.id)); renderIncomeExpenseTab(container, caseData); }); });
    } catch (err) {
        container.innerHTML = '<p style="color:red">수입/지출 데이터 로드 실패: ' + err.message + '</p>';
    }
}

async function renderNotesTab(container, caseData) {
    container.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> 로딩 중...</div>';
    try {
        const snap = await getDocs(query(collection(db, 'cases', currentCaseId, 'notes'), orderBy('createdAt', 'desc')));
        const notes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        let html = `<div class="note-input"><textarea id="note-text" placeholder="메모 입력..."></textarea><button id="add-note-btn" class="btn btn-primary"><i class="fas fa-plus"></i></button></div><div class="notes-list">`;
        notes.forEach(n => {
            html += `<div class="note-card${n.isPinned ? ' pinned' : ''}"><div class="note-meta">${formatDate(n.createdAt)} | ${escapeHtml(n.noteType || '일반메모')}<button class="btn btn-danger btn-sm del-note" data-id="${n.id}" style="float:right"><i class="fas fa-trash"></i></button></div><div class="note-content">${escapeHtml(n.content || '')}</div></div>`;
        });
        html += '</div>';
        container.innerHTML = html;
        container.querySelector('#add-note-btn')?.addEventListener('click', async () => {
            const text = document.getElementById('note-text').value.trim();
            if (!text) return;
            await addDoc(collection(db, 'cases', currentCaseId, 'notes'), { noteType: '일반메모', content: text, authorUid: getAuth().currentUser?.uid || '', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            renderNotesTab(container, caseData);
        });
        container.querySelectorAll('.del-note').forEach(btn => { btn.addEventListener('click', async () => { await deleteDoc(doc(db, 'cases', currentCaseId, 'notes', btn.dataset.id)); renderNotesTab(container, caseData); }); });
    } catch (err) {
        container.innerHTML = '<p style="color:red">메모 로드 실패: ' + err.message + '</p>';
    }
}

// ========== 새 사건 생성 ==========

function initNewCase() {
    document.getElementById('new-case-btn')?.addEventListener('click', () => { document.getElementById('new-case-modal').hidden = false; });
    document.getElementById('new-case-modal-close')?.addEventListener('click', () => { document.getElementById('new-case-modal').hidden = true; });
    document.getElementById('nc-cancel')?.addEventListener('click', () => { document.getElementById('new-case-modal').hidden = true; });
    document.getElementById('nc-save')?.addEventListener('click', async () => {
        const name = document.getElementById('nc-name').value.trim();
        const phone = document.getElementById('nc-phone').value.trim();
        if (!name || !phone) { alert('이름과 연락처는 필수입니다.'); return; }
        try {
            await addDoc(collection(db, 'cases'), { clientName: name, clientPhone: phone, clientIdNumber: document.getElementById('nc-ssn').value.trim(), clientAddress: document.getElementById('nc-address').value.trim(), court: document.getElementById('nc-court').value, caseNumber: document.getElementById('nc-case-number').value.trim(), status: '접수', totalDebt: 0, totalAsset: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            document.getElementById('new-case-modal').hidden = true;
            ['nc-name','nc-phone','nc-ssn','nc-address','nc-case-number'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            loadCases();
        } catch (err) { alert('사건 등록 실패: ' + err.message); }
    });
}

document.getElementById('back-to-cases')?.addEventListener('click', () => {
    document.getElementById('case-detail-view').hidden = true;
    document.getElementById('cases-list-view').hidden = false;
    loadCases();
});

document.getElementById('case-status-select')?.addEventListener('change', async (e) => {
    if (!currentCaseId) return;
    try {
        await updateDoc(doc(db, 'cases', currentCaseId), { status: e.target.value, updatedAt: serverTimestamp() });
        const cs = allCases.find(x => x.id === currentCaseId);
        if (cs) cs.status = e.target.value;
    } catch (err) { alert('상태 변경 실패: ' + err.message); }
});

document.getElementById('case-search')?.addEventListener('input', renderCasesList);
document.getElementById('case-status-filter')?.addEventListener('change', renderCasesList);

// ================================================================
// ========== 서류 생성 페이지 ==========
// ================================================================

async function loadDocCaseSelect() {
    try {
        if (allCases.length === 0) await loadCases();
        const select = document.getElementById('doc-case-select');
        if (!select) return;
        select.innerHTML = '<option value="">사건을 선택하세요</option>';
        allCases.forEach(c => { select.innerHTML += `<option value="${c.id}">${escapeHtml(c.clientName || '이름없음')} ${c.caseNumber ? '(' + c.caseNumber + ')' : ''}</option>`; });
    } catch(err) { console.error(err); }
}

document.getElementById('doc-case-select')?.addEventListener('change', async (e) => {
    const caseId = e.target.value;
    const summary = document.getElementById('doc-case-summary');
    const checklist = document.getElementById('doc-checklist');
    const actions = document.getElementById('doc-actions');
    if (!caseId) {
        summary && (summary.hidden = true);
        checklist && (checklist.hidden = true);
        actions && (actions.hidden = true);
        return;
    }
    const caseData = allCases.find(c => c.id === caseId);
    if (summary && caseData) {
        summary.innerHTML = `<div style="padding:1rem 2rem;background:var(--surface-color);border-radius:8px;margin:0 2rem"><strong>${escapeHtml(caseData.clientName)}</strong> | ${caseData.court || '-'} | 채무: ${caseData.totalDebt ? (caseData.totalDebt).toLocaleString() + '원' : '-'} | 재산: ${caseData.totalAsset ? (caseData.totalAsset).toLocaleString() + '원' : '-'}</div>`;
        summary.hidden = false;
    }
    checklist && (checklist.hidden = false);
    actions && (actions.hidden = false);
});

// ========== 서류 생성 (DOCX) ==========

import { generateApplication, generateCreditorList, generateAssetList, generateIncomeExpenseList, generateRepaymentPlan, generateStatement, downloadDocx, downloadAllAsZip } from './doc-generators.js';

async function getCaseDataForDoc(caseId) {
    const caseData = allCases.find(c => c.id === caseId) || {};
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

document.getElementById('generate-selected-btn')?.addEventListener('click', async () => {
    const caseId = document.getElementById('doc-case-select').value;
    if (!caseId) { alert('사건을 선택하세요.'); return; }
    const checked = document.querySelectorAll('#doc-checklist input[type="checkbox"]:checked');
    if (checked.length === 0) { alert('생성할 서류를 선택하세요.'); return; }
    const { caseData, debts, assets, incomes, expenses } = await getCaseDataForDoc(caseId);
    const name = caseData.clientName || '의뢰인';
    for (const cb of checked) {
        let docObj, filename;
        switch (cb.value) {
            case 'application': docObj = generateApplication(caseData); filename = `${name}_개인회생신청서.docx`; break;
            case 'creditors': docObj = generateCreditorList(caseData, debts); filename = `${name}_채권자목록.docx`; break;
            case 'assets': docObj = generateAssetList(caseData, assets); filename = `${name}_재산목록.docx`; break;
            case 'income-expense': docObj = generateIncomeExpenseList(caseData, incomes, expenses); filename = `${name}_수입지출목록.docx`; break;
            case 'repayment': docObj = generateRepaymentPlan(caseData, debts, incomes, expenses); filename = `${name}_변제계획안.docx`; break;
            case 'statement': docObj = generateStatement(caseData); filename = `${name}_진술서.docx`; break;
        }
        if (docObj) await downloadDocx(docObj, filename);
    }
});

document.getElementById('generate-all-zip-btn')?.addEventListener('click', async () => {
    const caseId = document.getElementById('doc-case-select').value;
    if (!caseId) { alert('사건을 선택하세요.'); return; }
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
});

document.getElementById('generate-docs-btn')?.addEventListener('click', () => {
    if (!currentCaseId) return;
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const pages = document.querySelectorAll('.page-content');
    sidebarItems.forEach(i => i.classList.remove('active'));
    document.querySelector('.sidebar-item[data-page="documents"]').classList.add('active');
    pages.forEach(p => { p.hidden = p.dataset.page !== 'documents'; });
    loadDocCaseSelect().then(() => {
        document.getElementById('doc-case-select').value = currentCaseId;
        document.getElementById('doc-case-select').dispatchEvent(new Event('change'));
    });
});

// ========== 초기화 ==========
// Firebase Auth의 onAuthStateChanged가 인증 상태를 자동으로 관리합니다.
