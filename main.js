document.addEventListener('DOMContentLoaded', () => {
    // --- 기본 요소 선택 --- 
    const form = document.getElementById('diagnosis-form');
    const steps = [...form.querySelectorAll('.form-step')];
    const progressBar = document.getElementById('progress-bar');
    const nextBtns = form.querySelectorAll('.next-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const qaItems = document.querySelectorAll('.qa-item');

    let currentStep = 1;
    const totalSteps = 3;

    // --- 프로그레스 바 및 단계 이동 로직 (변경 없음) ---
    const updateProgressBar = () => {
        const progress = (currentStep - 1) / totalSteps * 100;
        progressBar.style.width = `${progress}%`;
    };

    const goToStep = (step) => {
        steps.forEach(s => s.classList.remove('active'));
        const nextStepElement = form.querySelector(`.form-step[data-step="${step}"]`);
        if (nextStepElement) {
            nextStepElement.classList.add('active');
            currentStep = step;
            updateProgressBar();
        }
    };

    // --- 폼 인터랙션 로직 (변경 없음) ---
    form.addEventListener('click', (e) => {
        if (e.target.matches('.option-btn')) {
            const group = e.target.closest('.option-group-col');
            const isCheckbox = e.target.classList.contains('checkbox');

            if (isCheckbox) {
                e.target.classList.toggle('selected');
            } else {
                [...group.querySelectorAll('.option-btn')].forEach(btn => btn.classList.remove('selected'));
                e.target.classList.add('selected');
                if (currentStep === 1) {
                    const allAnswered = [...form.querySelectorAll('.form-step[data-step="1"] .option-group-col')].every(q => q.querySelector('.selected'));
                    if (allAnswered) {
                        goToStep(2);
                    }
                }
            }
        }
    });

    nextBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep < totalSteps) {
                goToStep(currentStep + 1);
            }
        });
    });

    calculateBtn.addEventListener('click', () => {
        const income = document.getElementById('monthly-income').value;
        if (!income || isNaN(income)) {
            alert('월 평균 소득을 정확히 입력해주세요.');
            return;
        }
        displayResults();
        goToStep(4);
    });

    // --- 결과 표시 로직 (변경 없음) ---
    const displayResults = () => {
        const resultTitle = document.getElementById('result-title');
        const resultSpecial = document.getElementById('result-special');
        const investment = form.querySelector('[data-question="q5_investment"] .selected')?.dataset.value === 'yes';
        const isYoung = form.querySelector('[data-value="under_30"]').classList.contains('selected');

        const monthlyIncome = parseFloat(document.getElementById('monthly-income').value) || 0;
        const dependents = parseInt(form.querySelector('[data-question="q7_dependents"] .selected')?.dataset.value || '1');
        const totalDebt = parseInt(form.querySelector('[data-question="q3_total_debt"] .selected')?.dataset.value || '0');

        const livelihoodCosts = { 1: 1538543, 2: 2538600, 3: 3246325, 4: 3954600 };
        const baseLivelihood = livelihoodCosts[dependents] || livelihoodCosts[4];
        let monthlyPayment = Math.max(0, monthlyIncome - baseLivelihood);

        let period = 36;
        if (isYoung) { period = Math.max(24, period - 6); }

        const totalRepayment = monthlyPayment * period;
        const writeOffRate = totalDebt > 0 ? Math.round((1 - (totalRepayment / totalDebt)) * 100) : 0;

        document.getElementById('result-payment').textContent = `약 ${Math.round(monthlyPayment / 10000).toLocaleString()}만 원`;
        document.getElementById('result-payment-detail').textContent = `(월 소득 ${(monthlyIncome / 10000).toLocaleString()}만 원 - ${dependents}인 생계비 ${(Math.round(baseLivelihood / 10000)).toLocaleString()}만 원)`;
        document.getElementById('result-period').textContent = `${period}개월`;
        document.getElementById('result-period-detail').textContent = isYoung ? "(청년 단축 적용)" : "(기본)";
        document.getElementById('result-write-off').textContent = `약 ${writeOffRate}%`;
        document.getElementById('result-write-off-detail').textContent = `(총 채무 ${(totalDebt / 10000).toLocaleString()}만 원)`;

        resultTitle.textContent = "AI 진단 결과: 회생 가능성이 매우 높습니다.";
        let specialAnalysis = "";
        if (investment) {
            specialAnalysis += "- 주식/코인 투자 손실금은 사행성 채무로 분류될 수 있지만, 부산회생법원은 채무자의 상황을 고려하여 변제율을 조정하는 경향이 있습니다. 투자 경위를 명확히 소명하는 것이 중요합니다.\n";
        }
        if (isYoung) {
            specialAnalysis += "- 만 34세 이하 청년의 경우, 법원은 사회초년생의 어려움을 감안하여 변제 기간 단축이나 추가 생계비 인정에 긍정적일 수 있습니다."
        }
        if (!specialAnalysis) {
            specialAnalysis = "- 부산회생법원의 실무준칙에 따라 추가 생계비를 적극적으로 주장하여 월 변제금을 줄일 수 있는 가능성이 있습니다."
        }
        resultSpecial.textContent = specialAnalysis;
    };

    // --- 신규: 최종 CTA 및 Firestore 제출 로직 ---
    const requestConsultBtn = document.getElementById('request-consult-btn');
    const consultForm = document.getElementById('consult-form');
    const privacyAgree = document.getElementById('privacy-agree');
    const submitFinalDataBtn = document.getElementById('submit-final-data');

    requestConsultBtn.addEventListener('click', () => {
        consultForm.style.display = 'flex';
        requestConsultBtn.style.display = 'none';
    });

    privacyAgree.addEventListener('change', () => {
        submitFinalDataBtn.disabled = !privacyAgree.checked;
    });

    // --- 교체됨: Google Sheets 대신 Firestore로 데이터를 전송하는 새 함수 ---
    const submitDataToFirestore = () => {
        submitFinalDataBtn.disabled = true;
        submitFinalDataBtn.textContent = '전송 중...';

        // 1. 모든 데이터를 객체로 수집
        const submissionData = {
            // 사용자 정보
            name: document.getElementById('final-name').value,
            phone: document.getElementById('final-phone').value,

            // AI 계산기 답변
            q1_region: form.querySelector('[data-question="q1_region"] .selected')?.innerText || '',
            q2_incomeType: form.querySelector('[data-question="q2_income_type"] .selected')?.innerText || '',
            q3_totalDebt: form.querySelector('[data-question="q3_total_debt"] .selected')?.innerText || '',
            q4_assetRatio: form.querySelector('[data-question="q4_asset_ratio"] .selected')?.innerText || '',
            q5_investment: form.querySelector('[data-question="q5_investment"] .selected')?.innerText || '',
            q6_reductionReasons: [...form.querySelectorAll('[data-question="q6_reduction_reasons"] .selected')].map(el => el.innerText).join(', ') || '없음',
            q7_dependents: form.querySelector('[data-question="q7_dependents"] .selected')?.innerText || '',
            q8_extraCosts: [...form.querySelectorAll('[data-question="q8_extra_costs"] .selected')].map(el => el.innerText).join(', ') || '없음',
            q9_monthlyIncome: document.getElementById('monthly-income').value,

            // AI 계산기 결과
            result_eligibility: document.getElementById('result-eligibility').textContent.trim(),
            result_payment: document.getElementById('result-payment').textContent.trim(),
            result_period: document.getElementById('result-period').textContent.trim(),
            result_write_off: document.getElementById('result-write-off').textContent.trim(),
            result_special: document.getElementById('result-special').textContent.trim(),

            // 제출 시간
            submittedAt: new Date()
        };

        // 2. Firestore로 데이터 전송
        // 'db' 객체는 index.html에서 Firebase SDK에 의해 초기화되었습니다.
        db.collection("consultations").add(submissionData)
        .then((docRef) => {
            console.log("Document written with ID: ", docRef.id);
            alert('상담 신청이 성공적으로 접수되었습니다. 감사합니다.');
            
            // 폼 초기화
            consultForm.style.display = 'none';
            requestConsultBtn.style.display = 'block';
            document.getElementById('final-name').value = '';
            document.getElementById('final-phone').value = '';
            privacyAgree.checked = false;
        })
        .catch((error) => {
            console.error("Error adding document: ", error);
            alert(`신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.`);
        })
        .finally(() => {
            submitFinalDataBtn.disabled = false;
            submitFinalDataBtn.textContent = '신청 완료';
        });
    };

    // --- 수정됨: 이벤트 리스너가 새 함수를 호출 ---
    submitFinalDataBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const name = document.getElementById('final-name').value;
        const phone = document.getElementById('final-phone').value;

        if (name && phone && privacyAgree.checked) {
            submitDataToFirestore(); // <-- 새 함수 호출
        } else {
            alert('이름, 연락처를 입력하고 개인정보 수집에 동의해주세요.');
        }
    });

    // --- Q&A 아코디언 로직 (변경 없음) ---
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

    // --- 초기 설정 ---
    updateProgressBar();
});
