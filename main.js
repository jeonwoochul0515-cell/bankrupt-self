document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('diagnosis-form');
    const steps = [...form.querySelectorAll('.form-step')];
    const progressBar = document.getElementById('progress-bar');
    const nextBtns = form.querySelectorAll('.next-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const qaItems = document.querySelectorAll('.qa-item');

    // -------------------------------------------------------------------
    // ✅ URL이 성공적으로 업데이트되었습니다.
    // -------------------------------------------------------------------
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyRLpto9DzOY6-sOPFhr4WjXftNlKv1W6ppELyAdD-68rLNDp8hbVyNVwpNOVJuQEiC/exec';

    let currentStep = 1;
    const totalSteps = 3; // Excluding the result step

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

        resultTitle.textContent = "AI 진단 결과: 회생 가능성이 매우 높습니다.";
        let specialAnalysis = "";
        if (investment) {
            specialAnalysis += "- 주식/코인 투자 손실금은 사행성 채무로 분류될 수 있지만, 부산회생법원은 채무자의 상황을 고려하여 변제율을 조정하는 경향이 있습니다. 투자 경위를 명확히 소명하는 것이 중요합니다.\n";
        }
        if (isYoung) {
            specialAnalysis += "- 만 30세 미만 청년의 경우, 법원은 사회초년생의 어려움을 감안하여 변제 기간 단축이나 추가 생계비 인정에 긍정적일 수 있습니다."
        }
        if (!specialAnalysis) {
             specialAnalysis = "- 부산회생법원의 실무준칙에 따라 추가 생계비를 적극적으로 주장하여 월 변제금을 줄일 수 있는 가능성이 있습니다."
        }
        resultSpecial.textContent = specialAnalysis;
    };

    // --- Form Submission Logic ---
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

    // --- 데이터 수집 및 Google Sheet 전송 함수 ---
    const submitDataToSheet = () => {
        submitFinalDataBtn.disabled = true;
        submitFinalDataBtn.textContent = '전송 중...';

        // 1. 모든 폼 데이터 수집
        const formData = {
            name: document.getElementById('final-name').value,
            phone: document.getElementById('final-phone').value,
            region: form.querySelector('[data-question="q1_region"] .selected')?.dataset.value || '',
            debtType: [...form.querySelectorAll('[data-question="q2_debt_type"] .selected')].map(el => el.dataset.value).join(', '),
            totalDebt: form.querySelector('[data-question="q3_total_debt"] .selected')?.dataset.value || '',
            assetRatio: form.querySelector('[data-question="q4_asset_ratio"] .selected')?.dataset.value || '',
            investment: form.querySelector('[data-question="q5_investment"] .selected')?.dataset.value || '',
            incomeSource: form.querySelector('[data-question="q6_income_source"] .selected')?.dataset.value || '',
            monthlyIncome: document.getElementById('monthly-income').value,
            dependents: form.querySelector('[data-question="q8_dependents"] .selected')?.dataset.value || ''
        };

        // 2. Fetch API로 Google Apps Script에 POST 요청 전송
        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(formData),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.result === 'success') {
                alert('상담 신청이 성공적으로 접수되었습니다. 감사합니다.');
                // 폼 초기화
                consultForm.style.display = 'none';
                requestConsultBtn.style.display = 'block';
                document.getElementById('final-name').value = '';
                document.getElementById('final-phone').value = '';
                privacyAgree.checked = false;
            } else {
                throw new Error(data.error || '알 수 없는 오류가 발생했습니다.');
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
        e.preventDefault(); // 기본 폼 제출 방지
        const name = document.getElementById('final-name').value;
        const phone = document.getElementById('final-phone').value;

        if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL') {
            alert('오류: 스크립트 URL이 설정되지 않았습니다. 개발자에게 문의하세요.');
            return;
        }

        if (name && phone && privacyAgree.checked) {
            submitDataToSheet();
        } else {
            alert('이름, 연락처를 입력하고 개인정보 수집에 동의해주세요.');
        }
    });

    // Q&A Accordion
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

    updateProgressBar(); // Initial call
});
