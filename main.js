
document.addEventListener('DOMContentLoaded', () => {

    // --- Carousel Logic ---
    const carouselInner = document.querySelector('.carousel-inner');
    if (carouselInner) {
        const items = document.querySelectorAll('.carousel-item');
        const prevBtn = document.querySelector('.carousel-control.prev');
        const nextBtn = document.querySelector('.carousel-control.next');
        let currentIndex = 0;

        function updateCarousel() {
            items.forEach((item, index) => {
                item.style.display = index === currentIndex ? 'block' : 'none';
            });
        }

        nextBtn.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % items.length;
            updateCarousel();
        });

        prevBtn.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + items.length) % items.length;
            updateCarousel();
        });

        setInterval(() => { nextBtn.click(); }, 5000);
        updateCarousel();
    }

    // --- Chatbot UI Logic ---
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotWindow = document.querySelector('.chatbot-window');
    const chatbotClose = document.getElementById('chatbot-close');

    if (chatbotToggle && chatbotWindow && chatbotClose) {
        chatbotToggle.addEventListener('click', () => {
            const isClosed = chatbotWindow.style.display === 'none' || chatbotWindow.style.display === '';
            chatbotWindow.style.display = isClosed ? 'flex' : 'none';
        });

        chatbotClose.addEventListener('click', () => {
            chatbotWindow.style.display = 'none';
        });
    }

    // --- Multi-step Form Logic ---
    const form = document.getElementById('diagnosis-form');
    const formSteps = document.querySelectorAll('.form-step');
    const progressBar = document.getElementById('progress-bar');
    const totalSteps = formSteps.length;
    const userAnswers = {};
    let currentStep = 1;

    const MIN_COST_OF_LIVING = {
        1: 1246735, // 1-person household
        2: 2073693, // 2-person household
        3: 2660890,
        4: 3240578,
        5: 3798413,
        6: 4336824,
        7: 4861394
    };

    function goToStep(stepNumber) {
        formSteps.forEach(step => step.classList.remove('active'));
        const nextStepElement = document.querySelector(`.form-step[data-step="${stepNumber}"]`);
        if (nextStepElement) {
            nextStepElement.classList.add('active');
            currentStep = stepNumber;
            updateProgressBar();
        }
    }

    function updateProgressBar() {
        const progress = ((currentStep - 1) / (totalSteps -1)) * 100;
        progressBar.style.width = `${Math.min(progress, 100)}%`;
    }

    form.addEventListener('click', (e) => {
        if (e.target.classList.contains('option-btn')) {
            handleOptionClick(e.target);
        } else if (e.target.id === 'calculate-btn') {
            handleCalculation();
        } else if (e.target.id === 'submit-final-data') {
            handleSubmitFinalData();
        }
    });

    function handleOptionClick(button) {
        const parentStep = button.closest('.form-step');
        const question = parentStep.querySelector('h3').innerText.trim();
        const answer = button.dataset.value;
        userAnswers[question] = answer;

        let proceed = true;
        const step = parseInt(parentStep.dataset.step, 10);

        // Special logic for each step
        switch (step) {
            case 1:
                if (answer === 'busan-ulsan-gyeongnam') alert('부산회생법원 관할 사건으로, 주식/코인 손실금 공제 등 부산만의 유리한 실무준칙이 적용됩니다.');
                break;
            case 2:
                if (answer === 'no-income') {
                    alert('죄송합니다. 현재 소득이 없으면 신청이 어렵습니다. (취업 예정인 경우 가능)');
                    proceed = false;
                }
                break;
            case 3:
                if (answer === 'under-10m' || answer === 'over-limit') {
                    alert('개인회생은 채무 총액이 1,000만 원 이상, 담보 15억, 무담보 10억 이하일 때 신청 가능합니다.');
                    proceed = false;
                }
                break;
            case 4:
                if (answer === 'asset-higher') {
                    alert('재산이 빚보다 많으면 개인회생 신청 자격이 안 됩니다. (일반회생/파산 대상)');
                    proceed = false;
                }
                break;
            case 5:
                if (answer === 'yes-invest' && userAnswers["Q1. 거주(근무) 지역"] === 'busan-ulsan-gyeongnam') {
                    alert('부산회생법원은 주식/코인 투자 손실금을 재산에 반영하지 않아도 되는 특별 실무준칙이 있어 매우 유리합니다!');
                }
                break;
            case 6:
                 if (answer !== 'none') {
                    alert('해당자는 변제기간을 36개월 미만으로 단축하여 조기에 빚을 갚을 수 있습니다!');
                }
                break;
        }

        if (proceed) {
            goToStep(currentStep + 1);
        }
    }

    function handleCalculation() {
        const income = parseInt(document.getElementById('monthly-income').value, 10);
        const dependents = parseInt(document.getElementById('dependents').value, 10);

        if (isNaN(income) || isNaN(dependents) || income <= 0) {
            alert('정확한 월 소득과 부양가족 수를 입력해주세요.');
            return;
        }

        const householdSize = dependents + 1;
        const costOfLiving = MIN_COST_OF_LIVING[householdSize] || MIN_COST_OF_LIVING[7] + (householdSize - 7) * 525570;
        let monthlyPayment = income - costOfLiving;

        if (monthlyPayment <= 0) {
            monthlyPayment = 50000; // Set a minimum payment if income is less than living costs
            alert('소득이 최저생계비보다 적어 월 5만원의 최소 변제금이 책정될 수 있습니다. 정확한 상담이 필요합니다.');
        }

        document.getElementById('monthly-payment').innerText = `${monthlyPayment.toLocaleString()}원`;
        
        const isReducedPeriod = userAnswers['Q6. 변제기간 단축 대상'] !== 'none';
        const periodText = isReducedPeriod ? '최대 36개월 미만, 평균 24개월' : '기본 36개월';
        document.getElementById('repayment-period').innerText = `(변제 기간: ${periodText})`;

        document.getElementById('final-inputs').style.display = 'none';
        document.getElementById('result-display').style.display = 'block';
        progressBar.style.width = '100%';
    }

    function handleSubmitFinalData() {
        const finalName = document.getElementById('final-name').value;
        const finalPhone = document.getElementById('final-phone').value;

        if (!finalName || !finalPhone) {
            alert('이름과 연락처를 입력해주세요.');
            return;
        }

        const data = {
            ...userAnswers,
            monthlyIncome: document.getElementById('monthly-income').value,
            dependents: document.getElementById('dependents').value,
            calculatedMonthlyPayment: document.getElementById('monthly-payment').innerText,
            name: finalName,
            phone: finalPhone,
            timestamp: new Date().toISOString()
        };

        const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbycw7XeQKPeJ-j6AP10z78QyPRZTA2LAeG3l9bG7idro6nM5cqy0BxhiXuHf9kvfeIN8Q/exec';

        fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        })
        .then(() => {
            alert('신청이 성공적으로 제출되었습니다! 전문가가 곧 연락드릴 예정입니다.');
            form.reset();
            goToStep(1); // Reset form to the beginning
            document.getElementById('result-display').style.display = 'none';
            document.getElementById('final-inputs').style.display = 'block';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
        });
    }

    // Initialize
    goToStep(1);
});
