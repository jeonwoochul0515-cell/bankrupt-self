document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('diagnosis-form');
    const steps = [...form.querySelectorAll('.form-step')];
    const progressBar = document.getElementById('progress-bar');
    const nextBtns = form.querySelectorAll('.next-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const qaItems = document.querySelectorAll('.qa-item');

    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyRLpto9DzOY6-sOPFhr4WjXftNlKv1W6ppELyAdD-68rLNDp8hbVyNVwpNOVJuQEiC/exec';

    let currentStep = 1;
    const totalSteps = 3;

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

    const displayResults = () => {
        const resultTitle = document.getElementById('result-title');
        const resultSpecial = document.getElementById('result-special');
        const investment = form.querySelector('[data-question="q5_investment"] .selected')?.dataset.value === 'yes';
        const isYoung = form.querySelector('[data-value="under_30"]').classList.contains('selected');

        // Calculation Logic for 2026
        const monthlyIncome = parseFloat(document.getElementById('monthly-income').value) || 0;
        const dependents = parseInt(form.querySelector('[data-question="q7_dependents"] .selected')?.dataset.value || '1');
        const totalDebt = parseInt(form.querySelector('[data-question="q3_total_debt"] .selected')?.dataset.value || '0');

        const livelihoodCosts = {
            1: 1538543, // 2026년 1인 가구 개인회생 최저생계비
            2: 2538600, // 2026년 기준 2인 가구 예상 생계비
            3: 3246325, // 2026년 기준 3인 가구 예상 생계비
            4: 3954600  // 2026년 기준 4인 가구 예상 생계비
        };
        const baseLivelihood = livelihoodCosts[dependents] || livelihoodCosts[4];
        let monthlyPayment = Math.max(0, monthlyIncome - baseLivelihood);

        let period = 36;
        if (isYoung) {
            period = Math.max(24, period - 6); 
        }
        
        const totalRepayment = monthlyPayment * period;
        const writeOffRate = totalDebt > 0 ? Math.round((1 - (totalRepayment / totalDebt)) * 100) : 0;

        // Displaying results
        document.getElementById('result-payment').textContent = `약 ${Math.round(monthlyPayment / 10000).toLocaleString()}만 원`;
        document.getElementById('result-payment-detail').textContent = `(월 소득 ${(monthlyIncome / 10000).toLocaleString()}만 원 - ${dependents}인 생계비 ${(Math.round(baseLivelihood / 10000)).toLocaleString()}만 원)`;
        document.getElementById('result-period').textContent = `${period}개월`;
        document.getElementById('result-period-detail').textContent = isYoung ? "(청년 단축 적용)" : "(기본)";
        document.getElementById('result-write-off').textContent = `약 ${writeOffRate}%`;
        document.getElementById('result-write-off-detail').textContent = `(총 채무 ${(totalDebt/10000).toLocaleString()}만 원)`;

        resultTitle.textContent = "AI 진단 결과: 회생 가능성이 매우 높습니다.";
        let specialAnalysis = "";
        if (investment) {
            specialAnalysis += "- 주식/코인 투자 손실금은 사행성 채무로 분류될 수 있지만, 부산회생법원은 채무자의 상황을 고려하여 변제율을 조정하는 경향이 있습니다. 투자 경위를 명확히 소명하는 것이 중요합니다.\n";
        }
        if (isYoung) {
            specialAnalysis += "- 만 30세 미만 청년의 경우, 법원은 사회초년생의 어려움을 감안하여 변제 기간 단축이나 추가 생계비 인정에 긍정적일 수 있습니다. 2026년부터는 소득 공제 혜택도 확대됩니다."
        }
        if (!specialAnalysis) {
             specialAnalysis = "- 부산회생법원의 실무준칙에 따라 추가 생계비를 적극적으로 주장하여 월 변제금을 줄일 수 있는 가능성이 있습니다."
        }
        resultSpecial.textContent = specialAnalysis;
    };

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

    const submitDataToSheet = () => {
        submitFinalDataBtn.disabled = true;
        submitFinalDataBtn.textContent = '전송 중...';

        // 1. 모든 폼 데이터 수집 (수정됨)
        const formData = {
            name: document.getElementById('final-name').value,
            phone: document.getElementById('final-phone').value,
            region: form.querySelector('[data-question="q1_region"] .selected')?.dataset.value || '',
            incomeType: form.querySelector('[data-question="q2_income_type"] .selected')?.dataset.value || '',
            totalDebt: form.querySelector('[data-question="q3_total_debt"] .selected')?.dataset.value || '',
            assetRatio: form.querySelector('[data-question="q4_asset_ratio"] .selected')?.dataset.value || '',
            investment: form.querySelector('[data-question="q5_investment"] .selected')?.dataset.value || '',
            reductionReasons: [...form.querySelectorAll('[data-question="q6_reduction_reasons"] .selected')].map(el => el.textContent.trim()).join(', '),
            dependents: form.querySelector('[data-question="q7_dependents"] .selected')?.dataset.value || '',
            extraCosts: [...form.querySelectorAll('[data-question="q8_extra_costs"] .selected')].map(el => el.textContent.trim()).join(', '),
            monthlyIncome: document.getElementById('monthly-income').value,
        };

        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                // For CORS or other network errors, response.ok will be false
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.result === 'success') {
                alert('상담 신청이 성공적으로 접수되었습니다. 감사합니다.');
                consultForm.style.display = 'none';
                requestConsultBtn.style.display = 'block';
                document.getElementById('final-name').value = '';
                document.getElementById('final-phone').value = '';
                privacyAgree.checked = false;
            } else {
                throw new Error(data.error || '알 수 없는 서버 오류가 발생했습니다.');
            }
        })
        .catch(error => {
            console.error('Error submitting data:', error);
            alert(`신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요. 오류: ${error.message}`);
        })
        .finally(() => {
            submitFinalDataBtn.disabled = false;
            submitFinalDataBtn.textContent = '개인회생 무료상담 신청하기';
        });
    };

    submitFinalDataBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const name = document.getElementById('final-name').value;
        const phone = document.getElementById('final-phone').value;

        if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes('YOUR_APPS_SCRIPT_URL')) {
            alert('오류: 스크립트 URL이 설정되지 않았습니다. 개발자에게 문의하세요.');
            return;
        }

        if (name && phone && privacyAgree.checked) {
            submitDataToSheet();
        } else {
            alert('이름, 연락처를 입력하고 개인정보 수집에 동의해주세요.');
        }
    });

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

    updateProgressBar();
});