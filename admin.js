import { db, auth } from './firebase-config.js';
import { collection, getDocs, orderBy, query, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

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

function formatMoney(manwon) {
    if (manwon >= 10000) return (manwon / 10000).toFixed(1) + '억';
    return manwon.toLocaleString() + '만원';
}

// ========== 상태 ==========

let allConsultations = [];
let allAnalytics = [];
let selectedIds = new Set();

// ========== Firebase Auth ==========

window.__adminLogin = async function(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
        console.error('로그인 실패:', err);
        document.getElementById('login-error').hidden = false;
    }
};

window.__adminLogout = async function() {
    await signOut(auth);
    location.reload();
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        showApp();
        loadData();
    }
});

// 페이지 로드 전에 로그인 시도가 있었으면 처리
if (window.__pendingLogin) {
    const { email, pw } = window.__pendingLogin;
    window.__adminLogin(email, pw);
    window.__pendingLogin = null;
}

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
    renderList();
    document.getElementById('select-all-bar').hidden = allConsultations.length === 0;
}

// ========== 통계 ==========

function updateStats() {
    const data = allConsultations;
    document.getElementById('stat-total').textContent = data.length;
    document.getElementById('stat-today').textContent = data.filter(c => isToday(c.createdAt)).length;

    const debts = data.map(c => {
        const val = c.simulationAnswers?.['Q5. 총 채무액 (만원)'];
        return parseDebt(val);
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
                return parseDebt(b.simulationAnswers?.['Q5. 총 채무액 (만원)']) - parseDebt(a.simulationAnswers?.['Q5. 총 채무액 (만원)']);
            case 'debt-low':
                return parseDebt(a.simulationAnswers?.['Q5. 총 채무액 (만원)']) - parseDebt(b.simulationAnswers?.['Q5. 총 채무액 (만원)']);
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
        const debt = parseDebt(c.simulationAnswers?.['Q5. 총 채무액 (만원)']);
        const rate = c.simulationResults?.['예상 탕감률'] || '-';

        card.innerHTML = `
            <input type="checkbox" class="card-checkbox" data-id="${c.id}" ${selectedIds.has(c.id) ? 'checked' : ''}>
            <div class="card-header">
                <span class="card-name">${escapeHtml(name)}</span>
                <span class="card-date">${dateStr}</span>
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

        // 카드 클릭 → 상세보기 (체크박스/삭제 버튼 제외)
        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-checkbox') || e.target.closest('.delete-btn')) return;
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
            c.requesterInfo?.phone || '',
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

// ========== 초기화 ==========
// Firebase Auth의 onAuthStateChanged가 인증 상태를 자동으로 관리합니다.
