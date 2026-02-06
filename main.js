
// Firebase SDK에서 필요한 함수들을 가져옵니다.
import { db } from './firebase-config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소들을 미리 찾아둡니다.
    const form = document.getElementById('diagnosis-form');
    const steps = [...form.querySelectorAll('.form-step')];
    const progressBar = document.getElementById('progress-bar');
    const calculateBtn = document.getElementById('calculate-btn');
    const qaItems = document.querySelectorAll('.qa-item');
    const nextBtn = form.querySelector('.next-btn'); // '다음' 버튼 추가

    let currentStep = 1;
    const totalSteps = 3; // 총 단계 수를 3으로 수정

    const diagnosisData = {}; // 사용자의 답변을 저장할 객체

    // --- UI 업데이트 관련 함수들 ---

    /**
     * 진행률 바(Progress Bar)를 현재 단계에 맞게 업데이트합니다.
     */
    const updateProgressBar = () => {
        const progress = (currentStep - 1) / totalSteps * 100;
        progressBar.style.width = `${progress}%`;
    };

    /**
     * 지정된 단계로 화면을 전환합니다.
     * @param {number} step - 이동할 단계 번호
     */
    const goToStep = (step) => {
        steps.forEach(s => s.classList.remove('active'));
        const nextStepElement = form.querySelector(`.form-step[data-step="${step}"]`);
        if (nextStepElement) {
            nextStepElement.classList.add('active');
            currentStep = step;
            updateProgressBar();
        }
    };

    // --- 이벤트 리스너 설정 ---

    /**
     * 옵션 버튼 클릭 이벤트를 처리합니다.
     * 선택된 값을 diagnosisData 객체에 저장하고, 필요한 경우 다음 단계로 이동합니다.
     */
    form.addEventListener('click', (e) => {
        if (e.target.matches('.option-btn')) {
            const group = e.target.closest('.option-group-col');
            const question = group.dataset.question;
            const value = e.target.dataset.value;
            const isCheckbox = e.target.classList.contains('checkbox');

            if (isCheckbox) {
                e.target.classList.toggle('selected');
                if (!diagnosisData[question]) {
                    diagnosisData[question] = [];
                }
                const index = diagnosisData[question].indexOf(value);
                if (index > -1) {
                    diagnosisData[question].splice(index, 1); // 선택 해제 시 배열에서 제거
                } else {
                    diagnosisData[question].push(value); // 선택 시 배열에 추가
                }
            } else {
                [...group.querySelectorAll('.option-btn')].forEach(btn => btn.classList.remove('selected'));
                e.target.classList.add('selected');
                diagnosisData[question] = value;
            }
            
            // 1단계의 모든 질문에 답변했는지 확인하고 2단계로 자동 이동
            if (currentStep === 1) {
                const allAnswered = ['q1_region', 'q2_income_type', 'q3_total_debt', 'q4_asset_ratio'].every(q => diagnosisData[q]);
                if (allAnswered) {
                    goToStep(2);
                }
            }
        }
    });
    
    // '다음' 버튼 클릭 시 3단계로 이동
    nextBtn.addEventListener('click', () => {
        if (currentStep === 2) {
             goToStep(3);
        }
    });

    // '결과 확인하기' 버튼 클릭 이벤트
    calculateBtn.addEventListener('click', () => {
        const incomeInput = document.getElementById('monthly-income');
        const income = incomeInput.value;

        if (!income || isNaN(income) || income <= 0) {
            alert('월 평균 소득을 정확히 입력해주세요.');
            incomeInput.focus();
            return;
        }
        diagnosisData['q9_income'] = parseFloat(income);
        
        displayResults(); // 결과 계산 및 표시
        goToStep(4); // 결과 화면으로 이동
    });

    // Q&A 아코디언 메뉴 이벤트
    qaItems.forEach(item => {
        const question = item.querySelector('.qa-question');
        question.addEventListener('click', () => {
            const currentlyActive = document.querySelector('.qa-item.active');
            if (currentlyActive && currentlyActive !== item) {
                currentlyActive.classList.remove('active');
            }
            item.classList.toggle('active');
        });
    });

    // --- 결과 계산 및 표시 함수 ---
    const displayResults = () => {
        const { 
            q3_total_debt: totalDebtRaw, 
            q5_investment: investment,
            q6_reduction_reasons: reductionReasons = [],
            q7_dependents: dependentsRaw,
            q9_income: monthlyIncome 
        } = diagnosisData;

        const totalDebt = parseInt(totalDebtRaw || '0');
        const dependents = parseInt(dependentsRaw || '1');
        const isYoung = reductionReasons.includes('under_30');

        // 2026년 최저 생계비 기준
        const livelihoodCosts = { 1: 1538543, 2: 2538600, 3: 3246325, 4: 3954600 };
        const baseLivelihood = livelihoodCosts[dependents] || livelihoodCosts[4];
        
        let monthlyPayment = Math.max(0, monthlyIncome - baseLivelihood);
        let period = 36;
        if (isYoung) { period = Math.max(24, period - 12); } // 청년 기간 단축 강화

        const totalRepayment = monthlyPayment * period;
        const writeOffAmount = totalDebt > totalRepayment ? totalDebt - totalRepayment : 0;

        // 결과를 화면에 표시
        document.getElementById('result-eligibility').textContent = '✅ 적합';
        document.getElementById('result-payment').textContent = `약 ${Math.round(monthlyPayment / 10000).toLocaleString()}만 원`;
        document.getElementById('result-payment-detail').textContent = `(소득 ${toManwon(monthlyIncome)} - 생계비 ${toManwon(baseLivelihood)})`;
        document.getElementById('result-period').textContent = `${period}개월`;
        document.getElementById('result-period-detail').textContent = isYoung ? "(청년 특례 적용)" : "(기본)";
        document.getElementById('result-write-off').textContent = `${toManwon(writeOffAmount)}`;
        document.getElementById('result-write-off-detail').textContent = `(총 채무 ${toManwon(totalDebt)})`;
        
        // 특화 분석 텍스트 생성
        let specialAnalysis = '';
        if (investment === 'yes') {
            specialAnalysis += '주식/코인 채무도 조정 가능성이 높습니다. 투자 경위 소명이 중요합니다.\n';
        }
        if (isYoung) {
            specialAnalysis += '청년 특별 감면 혜택으로 변제 기간 단축 및 추가 생계비 확보가 유리합니다.';
        } else {
            specialAnalysis += '부산회생법원의 최신 실무준칙에 따라, 추가 생계비를 적극 주장하여 변제금을 줄일 수 있습니다.';
        }
        document.getElementById('result-special').textContent = specialAnalysis;
    };

    // --- 상담 신청 관련 로직 ---
    const requestConsultBtn = document.getElementById('request-consult-btn');
    const consultForm = document.getElementById('consult-form');
    const privacyAgree = document.getElementById('privacy-agree');
    const submitFinalDataBtn = document.getElementById('submit-final-data');

    requestConsultBtn.addEventListener('click', () => {
        consultForm.style.display = 'block';
        requestConsultBtn.style.display = 'none';
    });

    privacyAgree.addEventListener('change', () => {
        submitFinalDataBtn.disabled = !privacyAgree.checked;
    });

    submitFinalDataBtn.addEventListener('click', async () => {
        const name = document.getElementById('final-name').value;
        const phone = document.getElementById('final-phone').value;

        if (!name || !phone) {
            alert('이름과 연락처를 모두 입력해주세요.');
            return;
        }
        if (!privacyAgree.checked) {
            alert('개인정보 수집 및 이용에 동의해주세요.');
            return;
        }

        submitFinalDataBtn.disabled = true;
        submitFinalDataBtn.textContent = '전송 중...';

        try {
            // Firestore에 저장할 최종 데이터
            const finalData = {
                ...diagnosisData,
                name,
                phone,
                createdAt: new Date()
            };

            // 'consultations' 컬렉션에 데이터 추가
            const docRef = await addDoc(collection(db, "consultations"), finalData);
            console.log("Document written with ID: ", docRef.id);

            alert('상담 신청이 성공적으로 접수되었습니다. 곧 연락드리겠습니다.');
            // 폼 초기화
            consultForm.style.display = 'none';
            requestConsultBtn.style.display = 'block';
            document.getElementById('final-name').value = '';
            document.getElementById('final-phone').value = '';
            privacyAgree.checked = false;

        } catch (error) {
            console.error("Error adding document: ", error);
            alert('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            submitFinalDataBtn.disabled = false;
            submitFinalDataBtn.textContent = '신청 완료';
        }
    });

    // --- 유틸리티 함수 ---
    const toManwon = (value) => `${Math.round(value / 10000).toLocaleString()}만 원`;

    // 페이지 로드 시 초기화
    updateProgressBar();
});
