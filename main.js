
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
        carouselInner.style.transform = `translateX(-${currentIndex * 100}%)`;
    }

    if(prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => showSlide(currentIndex - 1));
        nextBtn.addEventListener('click', () => showSlide(currentIndex + 1));
        setInterval(() => nextBtn.click(), 5000); // Auto-play
    }

    // --- Q&A Accordion Logic ---
    const qaItems = document.querySelectorAll('.qa-item');
    qaItems.forEach(item => {
        const question = item.querySelector('.qa-question');
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            qaItems.forEach(i => i.classList.remove('active'));
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
            response = "배우자 명의 재산의 절반(50%)이 채무자의 재산으로 포함될 수 있습니다. 하지만 재산 형성 기여도에 따라 달라질 수 있습니다.";
        } else if (lowerCaseMessage.includes('주식') || lowerCaseMessage.includes('코인')) {
            response = "네, 주식/코인 투자 손실이 있어도 개인회생 신청이 가능하며, 특히 부산회생법원에서는 손실금을 재산에 반영하지 않아 매우 유리합니다.";
        } else if (lowerCaseMessage.includes('생계비')) {
            response = "2024년 기준 1인 가구 생계비는 약 134만원입니다. 이 금액을 보장받고, 소득에서 이를 제외한 나머지를 변제금으로 내게 됩니다.";
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

        // ... (rest of the form logic remains the same)
    }

});

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered.'))
        .catch(err => console.log(`Service Worker registration failed: ${err}`));
  });
}
