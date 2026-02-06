
document.addEventListener('DOMContentLoaded', () => {

    // --- Carousel Logic ---
    const carouselInner = document.querySelector('.carousel-inner');
    const carouselItems = document.querySelectorAll('.carousel-item');
    const prevBtn = document.querySelector('.carousel-control.prev');
    const nextBtn = document.querySelector('.carousel-control.next');
    let currentIndex = 0;

    function showSlide(index) {
        const totalItems = carouselItems.length;
        if (index >= totalItems) { currentIndex = 0; }
        else if (index < 0) { currentIndex = totalItems - 1; }
        else { currentIndex = index; }
        
        // Instead of transforming each item, we transform the inner container
        if (carouselInner) {
            carouselInner.style.transform = `translateX(-${currentIndex * 100}%)`;
        }
    }

    if(prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => showSlide(currentIndex - 1));
        nextBtn.addEventListener('click', () => showSlide(currentIndex + 1));
        // Auto-play
        setInterval(() => {
            showSlide(currentIndex + 1);
        }, 5000); // Change slide every 5 seconds
    }

    // --- Q&A Accordion Logic ---
    const qaItems = document.querySelectorAll('.qa-item');
    qaItems.forEach(item => {
        const question = item.querySelector('.qa-question');
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            // Close all items
            qaItems.forEach(i => i.classList.remove('active'));
            // If the clicked item wasn't active, open it
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });


    // --- Chatbot UI & Core Logic ---
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotWindow = document.querySelector('.chatbot-window');
    const chatbotClose = document.getElementById('chatbot-close');
    const chatbotBody = document.querySelector('.chatbot-body');
    const chatbotInput = document.getElementById('chatbot-input');
    const chatbotSend = document.getElementById('chatbot-send');

    if (chatbotToggle && chatbotWindow && chatbotClose) {
        chatbotToggle.addEventListener('click', () => {
            const isClosed = chatbotWindow.style.display === 'none' || chatbotWindow.style.display === '';
            chatbotWindow.style.display = isClosed ? 'flex' : 'none';
        });

        chatbotClose.addEventListener('click', () => {
            chatbotWindow.style.display = 'none';
        });

        const sendMessage = () => {
            const userMessage = chatbotInput.value.trim();
            if (!userMessage) return;

            appendMessage(userMessage, 'user');
            chatbotInput.value = '';
            
            setTimeout(() => generateAiResponse(userMessage), 500);
        };

        chatbotSend.addEventListener('click', sendMessage);
        chatbotInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
    
    function appendMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', `${sender}-message`);
        messageDiv.innerText = text;
        chatbotBody.appendChild(messageDiv);
        chatbotBody.scrollTop = chatbotBody.scrollHeight;
    }

    function generateAiResponse(userMessage) {
        const lowerCaseMessage = userMessage.toLowerCase();
        let response = "죄송합니다. 아직 학습 중이라 답변을 드릴 수 없습니다. '개인회생', '자격', '장점', '절차' 등의 키워드로 질문해주세요.";

        if (lowerCaseMessage.includes('안녕')) {
            response = "안녕하세요! 부산회생법원 맞춤 AI 법률 비서입니다. 무엇을 도와드릴까요?";
        } else if (lowerCaseMessage.includes('배우자')) {
            response = "최근 법원은 배우자 재산의 50%를 무조건 반영하지 않습니다. 채무자가 배우자 재산 형성에 기여한 만큼만 반영하는 추세라 채무자에게 유리해졌습니다.";
        } else if (lowerCaseMessage.includes('주식') || lowerCaseMessage.includes('코인')) {
            response = "네, 주식/코인 투자 손실이 있어도 개인회생 신청이 가능하며, 특히 부산회생법원에서는 손실금을 재산에 반영하지 않아 매우 유리합니다.";
        } else if (lowerCaseMessage.includes('생계비')) {
            response = "2025년 기준 1인 가구 최저 생계비는 약 144만원입니다. 이 금액을 보장받고, 소득에서 이를 제외한 나머지를 변제금으로 내게 됩니다.";
        }

        appendMessage(response, 'bot');
    }

    // --- Multi-step Form Logic ---
    const form = document.getElementById('diagnosis-form');
    if(form) {
        const formSteps = form.querySelectorAll('.form-step');
        const progressBar = document.getElementById('progress-bar');
        const totalSteps = formSteps.length;
        const userAnswers = {};
        let currentStep = 1;

        const privacyCheckbox = document.getElementById('privacy-agree');
        const submitFinalBtn = document.getElementById('submit-final-data');

        if (submitFinalBtn) submitFinalBtn.disabled = true;
        if (privacyCheckbox) {
            privacyCheckbox.addEventListener('change', () => {
                submitFinalBtn.disabled = !privacyCheckbox.checked;
            });
        }
        
        // UPDATED: 2025 Minimum Cost of Living (60% of median income)
        const MIN_COST_OF_LIVING = {
            1: 1444126, // 1-person
            2: 2390270, // 2-person
            3: 3065249, // 3-person
            4: 3734258, // 4-person
            5: 4363207, // 5-person
            6: 4959893, // 6-person
            7: 5547190  // 7-person
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
                case 1: if (answer === 'busan-ulsan-gyeongnam') alert('부산회생법원 관할 사건으로, 주식/코인 손실금 공제 등 부산만의 유리한 실무준칙이 적용됩니다.'); break;
                case 2: if (answer === 'no-income') { alert('죄송합니다. 현재 소득이 없으면 신청이 어렵습니다. (취업 예정인 경우 가능)'); proceed = false; } break;
                case 3: if (answer === 'under-10m' || answer === 'over-limit') { alert('개인회생은 채무 총액이 1,000만 원 이상, 담보 15억, 무담보 10억 이하일 때 신청 가능합니다.'); proceed = false; } break;
                case 4: if (answer === 'asset-higher') { alert('재산이 빚보다 많으면 개인회생 신청 자격이 안 됩니다. (일반회생/파산 대상)'); proceed = false; } break;
                case 5: if (answer === 'yes-invest' && userAnswers["Q1. 거주(근무) 지역"] === 'busan-ulsan-gyeongnam') { alert('부산회생법원은 주식/코인 투자 손실금을 재산에 반영하지 않아도 되는 특별 실무준칙이 있어 매우 유리합니다!'); } break;
                case 6: if (answer !== 'none') { alert('해당자는 변제기간을 36개월 미만으로 단축하여 조기에 빚을 갚을 수 있습니다!'); } break;
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
            const costOfLiving = MIN_COST_OF_LIVING[householdSize] || (MIN_COST_OF_LIVING[7] + (householdSize - 7) * 580000); // Approximation for larger families
            let monthlyPayment = income - costOfLiving;

            if (monthlyPayment <= 0) {
                monthlyPayment = 50000; // Minimum payment
                alert('소득이 최저생계비보다 적거나 비슷하여 월 5만원의 최소 변제금이 책정될 수 있습니다. 정확한 상담이 필요합니다.');
            }

            document.getElementById('monthly-payment').innerText = `${Math.round(monthlyPayment / 10000) * 10000 .toLocaleString()}원`;
            
            const isReducedPeriod = userAnswers['Q6. 변제기간 단축 대상'] !== 'none';
            const periodText = isReducedPeriod ? '최대 36개월 미만, 평균 24개월' : '기본 36개월';
            document.getElementById('repayment-period').innerText = `(변제 기간: ${periodText})`;

            if(privacyCheckbox) privacyCheckbox.checked = false;
            if(submitFinalBtn) submitFinalBtn.disabled = true;

            document.getElementById('final-inputs').style.display = 'none';
            document.getElementById('result-display').style.display = 'block';
            progressBar.style.width = '100%';
        }

        function handleSubmitFinalData() {
            const finalName = document.getElementById('final-name').value;
            const finalPhone = document.getElementById('final-phone').value;

            if (!finalName || !finalPhone) { alert('이름과 연락처를 입력해주세요.'); return; }
            if (!privacyCheckbox.checked) { alert('개인정보 수집 및 이용에 동의해야 상담 신청이 가능합니다.'); return; }

            const data = { ...userAnswers, name: finalName, phone: finalPhone, timestamp: new Date().toISOString() };
            const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbycw7XeQKPeJ-j6AP10z78QyPRZTA2LAeG3l9bG7idro6nM5cqy0BxhiXuHf9kvfeIN8Q/exec';

            fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) })
            .then(() => {
                alert('신청이 성공적으로 제출되었습니다! 전문가가 곧 연락드릴 예정입니다.');
                form.reset();
                goToStep(1);
                document.getElementById('result-display').style.display = 'none';
                document.getElementById('final-inputs').style.display = 'block';
            })
            .catch(error => alert('제출 중 오류가 발생했습니다. 다시 시도해주세요.'));
        }

        goToStep(1);
    }
});

// PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => console.log('SW registered.')).catch(err => console.log('SW registration failed.'));
  });
}
