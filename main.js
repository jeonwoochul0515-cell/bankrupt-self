
document.addEventListener('DOMContentLoaded', () => {

    // --- Feature Cards Data & Generation ---
    const features = [
        { icon: 'fa-check-circle', title: '2026년 최신 기준 완벽 적용', description: '역대 최대로 인상된 2026년 기준 중위소득 및 생계비를 즉시 반영하여, 당신의 월 변제금을 정확하게 계산하고 부담을 낮춰드립니다.' },
        { icon: 'fa-map-marker-alt', title: '부산/경남 지역 특화 정밀 진단', description: '부산회생법원의 최신 실무 준칙과 지역적 특수성을 알고리즘에 녹여내어, 다른 곳에서는 볼 수 없는 맞춤형 분석 결과를 제공합니다.' },
        { icon: 'fa-robot', title: 'AI 기반 1분 완성 시뮬레이션', description: '복잡한 정보 입력 없이, 몇 가지 핵심 질문만으로 개인회생 신청 자격부터 예상 탕감액까지 1분 안에 명쾌하게 확인할 수 있습니다.' },
        { icon: 'fa-shield-alt', title: '철저한 개인정보 보호', description: '모든 진단 데이터는 종단간 암호화되며, 원하실 경우 언제든지 직접 데이터를 파기할 수 있어 안심하고 이용할 수 있습니다.' }
    ];
    const featuresGrid = document.querySelector('.features-grid');
    const featureCardTemplate = document.getElementById('feature-card-template');
    if (featuresGrid && featureCardTemplate) {
        features.forEach(feature => {
            const cardClone = featureCardTemplate.content.cloneNode(true);
            cardClone.querySelector('.feature-icon').classList.add('fas', feature.icon);
            cardClone.querySelector('.feature-title').textContent = feature.title;
            cardClone.querySelector('.feature-description').textContent = feature.description;
            featuresGrid.appendChild(cardClone);
        });
    }

    // --- Review Carousel Data & Generation ---
    const reviews = [
        { stars: 5, text: '막막하기만 했는데, 여기서 진단받고 희망을 얻었습니다. 월 변제금이 생각보다 훨씬 적게 나와서 바로 상담 신청했어요. 정말 감사합니다.', author: '김OO / 부산시 해운대구' },
        { stars: 5, text: '코인 투자 실패로 빚더미에 앉았을 때 정말 절망적이었습니다. 부산법원 스타일에 맞춰 서류를 준비해준다는 점이 가장 믿음이 갔습니다.', author: '박XX / 경남 창원시' },
        { stars: 5, text: '여러 곳 알아봤는데 여기가 제일 계산이 정확하고 빨랐어요. 1분 만에 결과가 나오는 게 신기하네요. 덕분에 빠르게 결정할 수 있었습니다.', author: '이OO / 부산시 진구' },
        { stars: 5, text: '혹시나 기록에 남을까 봐 걱정했는데, 개인정보 보호가 철저하다고 해서 안심하고 이용했습니다. 망설이시는 분들께 강력 추천합니다!', author: '최XX / 경남 김해시' }
    ];
    const reviewCarousel = document.querySelector('.review-carousel');
    const reviewCardTemplate = document.getElementById('review-card-template');
    if (reviewCarousel && reviewCardTemplate) {
        reviews.forEach(review => {
            const cardClone = reviewCardTemplate.content.cloneNode(true);
            const starContainer = cardClone.querySelector('.review-stars');
            for(let i = 0; i < review.stars; i++) {
                const star = document.createElement('i');
                star.classList.add('fas', 'fa-star');
                starContainer.appendChild(star);
            }
            cardClone.querySelector('.review-text').textContent = review.text;
            cardClone.querySelector('.reviewer').textContent = `- ${review.author}`; 
            reviewCarousel.appendChild(cardClone);
        });
    }

    // --- Carousel Navigation ---
    const prevBtn = document.querySelector('.carousel-btn.prev');
    const nextBtn = document.querySelector('.carousel-btn.next');
    if (reviewCarousel && prevBtn && nextBtn) {
        nextBtn.addEventListener('click', () => {
            const cardWidth = reviewCarousel.querySelector('.review-card').offsetWidth;
            reviewCarousel.scrollBy({ left: cardWidth + 32, behavior: 'smooth' }); // 32 is the gap
        });
        prevBtn.addEventListener('click', () => {
            const cardWidth = reviewCarousel.querySelector('.review-card').offsetWidth;
            reviewCarousel.scrollBy({ left: -(cardWidth + 32), behavior: 'smooth' });
        });
    }

    // --- Mobile Menu Toggle ---
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            const isVisible = mainNav.style.display === 'flex';
            mainNav.style.display = isVisible ? 'none' : 'flex';
            mainNav.style.flexDirection = 'column'; 
            mainNav.style.position = 'absolute';
            mainNav.style.top = '60px';
            mainNav.style.right = '2rem';
            mainNav.style.background = 'white';
            mainNav.style.padding = '1rem';
            mainNav.style.borderRadius = '8px';
            mainNav.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
        });
    }
});
