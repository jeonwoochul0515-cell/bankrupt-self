document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('diagnosis-form');
    const steps = [...form.querySelectorAll('.form-step')];
    const progressBar = document.getElementById('progress-bar');
    const nextBtns = form.querySelectorAll('.next-btn');
    const calculateBtn = document.getElementById('calculate-btn');
    const qaItems = document.querySelectorAll('.qa-item');

    let currentStep = 1;
    const totalSteps = 3; // Excluding the result step

    const updateProgressBar = () => {
        const progress = (currentStep -1) / totalSteps * 100;
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

    // Handle option selection
    form.addEventListener('click', (e) => {
        if (e.target.matches('.option-btn')) {
            const group = e.target.closest('.option-group-col');
            const question = group.dataset.question;
            const isCheckbox = e.target.classList.contains('checkbox');

            if (isCheckbox) {
                e.target.classList.toggle('selected');
            } else {
                [...group.querySelectorAll('.option-btn')].forEach(btn => btn.classList.remove('selected'));
                e.target.classList.add('selected');
                
                // Auto-advance for non-checkbox questions in step 1
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
        // Simple validation
        const income = document.getElementById('monthly-income').value;
        if (!income || isNaN(income)) {
            alert('월 평균 소득을 정확히 입력해주세요.');
            return;
        }

        // In a real app, you'd perform calculations based on all inputs
        // Here's a simplified demonstration
        displayResults();
        goToStep(4); // Move to result step
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
        //... and so on for other result fields
    }

    // Consultation Form Logic
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

    submitFinalDataBtn.addEventListener('click', () => {
        const name = document.getElementById('final-name').value;
        const phone = document.getElementById('final-phone').value;
        if (name && phone && privacyAgree.checked) {
            // Here you would send the data to your server/backend
            console.log('Submitting:', { name, phone });
            alert('상담 신청이 완료되었습니다. 곧 연락드리겠습니다.');
            // Optionally reset the form
            consultForm.style.display = 'none';
            requestConsultBtn.style.display = 'block';
            document.getElementById('final-name').value = '';
            document.getElementById('final-phone').value = '';
            privacyAgree.checked = false;
            submitFinalDataBtn.disabled = true;
        } else {
            alert('이름과 연락처를 모두 입력해주세요.');
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
