
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('diagnosis-form');
    if (!form) return;

    const steps = form.querySelectorAll('.form-step');
    const progressBar = document.getElementById('progress-bar');
    const nextBtn = form.querySelector('.next-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const requestConsultBtn = document.getElementById('request-consult-btn');
    const recommendLawyerBtn = document.getElementById('recommend-lawyer-btn');
    const consultForm = document.getElementById('consult-form');
    const submitFinalDataBtn = document.getElementById('submit-final-data');

    let currentStep = 1;
    const userAnswers = {
        q6_reduction_reasons: [],
        q8_extra_costs: []
    };

    const MIN_COST_OF_LIVING = {
        1: 1337067, 2: 2209564, 3: 2829373, 4: 3444342, 5: 4028040
    }; 

    function updateProgressBar() {
        progressBar.style.width = `${(currentStep -1) / (steps.length -1) * 100}%`;
    }

    function goToStep(step) {
        steps.forEach(s => s.classList.remove('active'));
        const nextStepEl = form.querySelector(`.form-step[data-step="${step}"]`);
        if (nextStepEl) {
            nextStepEl.classList.add('active');
            currentStep = step;
            updateProgressBar();
        }
    }

    form.addEventListener('click', e => {
        const target = e.target;

        // Handle option selection (single choice)
        if (target.matches('.option-btn') && !target.matches('.checkbox')) {
            const parentGroup = target.closest('.option-group-col');
            const question = parentGroup.dataset.question;
            const value = target.dataset.value;

            // Remove selected from siblings
            parentGroup.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
            target.classList.add('selected');
            userAnswers[question] = value;

            // Immediate feedback logic
            handleImmediateFeedback(question, value);

            // Auto-advance for step 1 questions
            if (currentStep === 1) {
                 const allAnswered = ['q1_region', 'q2_income_type', 'q3_debt_size', 'q4_asset_ratio'].every(q => userAnswers[q]);
                 if(allAnswered) goToStep(2);
            }
        }

        // Handle checkbox selection (multiple choice)
        if (target.matches('.checkbox')) {
            const parentGroup = target.closest('.checkbox-group');
            const question = parentGroup.dataset.question;
            const value = target.dataset.value;
            
            target.classList.toggle('selected');
            
            if (userAnswers[question].includes(value)) {
                userAnswers[question] = userAnswers[question].filter(v => v !== value);
            } else {
                userAnswers[question].push(value);
            }
        }
    });
    
    if(nextBtn) nextBtn.addEventListener('click', () => goToStep(3));
    if(calculateBtn) calculateBtn.addEventListener('click', displayResults);
    if(requestConsultBtn) requestConsultBtn.addEventListener('click', () => consultForm.style.display = 'block');
    if(recommendLawyerBtn) recommendLawyerBtn.addEventListener('click', () => alert("부산회생법원 전문 변호사 리스트를 곧 제공해드릴 예정입니다."));

    function handleImmediateFeedback(question, value) {
        switch(question) {
            case 'q1_region':
                if (['busan', 'ulsan', 'gyeongnam'].includes(value)) {
                    alert("부산회생법원 관할 사건으로, 주식/코인 손실금 공제 등 부산만의 유리한 실무준칙이 적용됩니다.");
                }
                break;
            case 'q2_income_type':
                if (value === 'no_income') {
                    alert("죄송합니다. 현재 소득이 없으면 신청이 어렵습니다. (취업 예정인 경우 가능)");
                }
                break;
            case 'q3_debt_size':
                 if (value !== 'eligible') {
                    alert("개인회생은 채무 총액이 1,000만 원 이상, 담보 15억, 무담보 10억 이하일 때 신청 가능합니다.");
                }
                break;
            case 'q4_asset_ratio':
                if (value === 'asset_higher') {
                    alert("재산이 빚보다 많으면 개인회생 신청 자격이 안 됩니다.");
                }
                break;
        }
    }

    function displayResults() {
        const income = parseInt(document.getElementById('monthly-income').value, 10) || 0;
        userAnswers['q9_income'] = income;

        if (income === 0) { alert("월 평균 소득을 입력해주세요."); return; }

        let eligibility = "✅ 적합";
        if (userAnswers.q2_income_type === 'no_income' || userAnswers.q3_debt_size !== 'eligible' || userAnswers.q4_asset_ratio === 'asset_higher') {
            eligibility = "❌ 부적합 (전문가 상담 필요)";
        }
        
        const dependents = parseInt(userAnswers.q7_dependents, 10) || 1;
        const costOfLiving = MIN_COST_OF_LIVING[dependents] || MIN_COST_OF_LIVING[5];
        let monthlyPayment = income - costOfLiving;
        // Logic for additional costs - simple reduction for now
        let extraCost = 0;
        if (userAnswers.q8_extra_costs.includes('rent')) extraCost += 200000; // Example amount
        if (userAnswers.q8_extra_costs.includes('medical')) extraCost += 100000;

        monthlyPayment -= extraCost;
        if (monthlyPayment < 50000) monthlyPayment = 50000;

        let period = 36;
        let periodReason = "(기본)";
        if (userAnswers.q6_reduction_reasons.length > 0) {
            period = 24;
            periodReason = `(단축 대상: ${userAnswers.q6_reduction_reasons.join(', ')} 사유)`;
        }

        // Final results rendering
        document.getElementById('result-title').innerText = `${document.getElementById('final-name')?.value || '사용자'}님의 부산회생법원 기준 진단 결과`;
        document.getElementById('result-eligibility').innerText = eligibility;
        document.getElementById('result-payment').innerText = `약 ${Math.round(monthlyPayment/10000).toLocaleString()}만 원`;
        document.getElementById('result-payment-detail').innerText = `(월 소득 ${income/10000}만 원 - ${dependents}인 생계비 ${Math.round(costOfLiving/10000)}만 원 - 추가비용 ${extraCost/10000}만 원)`;
        document.getElementById('result-period').innerText = `${period}개월`;
        document.getElementById('result-period-detail').innerText = periodReason;
        
        let specialNotes = [];
        if (['busan', 'ulsan', 'gyeongnam'].includes(userAnswers.q1_region) && userAnswers.q5_investment === 'yes') {
            specialNotes.push("• 주식/코인 손실금은 재산가치에서 제외되어 변제금이 낮아질 가능성이 높습니다.");
        }
        if (userAnswers.q6_reduction_reasons.length > 0) {
            specialNotes.push("• 변제기간 단축 대상자로, 조기 채무 종결이 가능합니다.");
        }
        if (userAnswers.q8_extra_costs.length > 0) {
            specialNotes.push(`• 추가 생계비(주거비 등)가 인정되어 월 변제금이 감소했습니다.`);
        }
        document.getElementById('result-special').innerText = specialNotes.length > 0 ? specialNotes.join('\n') : "해당 없음";

        goToStep(4);
    }

    const privacyCheckbox = document.getElementById('privacy-agree');
    if(privacyCheckbox && submitFinalDataBtn) {
        privacyCheckbox.addEventListener('change', () => {
            submitFinalDataBtn.disabled = !privacyCheckbox.checked;
        });
    }
    
    if(submitFinalDataBtn) {
        submitFinalDataBtn.addEventListener('click', () => {
            const name = document.getElementById('final-name').value;
            const phone = document.getElementById('final-phone').value;
            if (!name || !phone) { alert("이름과 연락처를 입력해주세요."); return; }
            
            userAnswers.name = name;
            userAnswers.phone = phone;
            
            // Here you would typically send the data to a server
            console.log("Final Data:", userAnswers);
            alert("상담 신청이 완료되었습니다. 감사합니다.");
        });
    }

    updateProgressBar();
});
