
document.addEventListener('DOMContentLoaded', () => {

    // --- Review Data & Generation ---
    const reviews = [
        {
            stars: 5,
            text: '막막하기만 했는데, 여기서 진단받고 희망을 얻었습니다. 월 변제금이 생각보다 훨씬 적게 나와서 바로 상담 신청했어요. 정말 감사합니다.',
            author: '김OO',
            location: '부산시 해운대구'
        },
        {
            stars: 5,
            text: '코인 투자 실패로 빚더미에 앉았을 때 정말 절망적이었습니다. 부산법원 스타일에 맞춰 서류를 준비해준다는 점이 가장 믿음이 갔습니다.',
            author: '박XX',
            location: '경남 창원시'
        },
        {
            stars: 5,
            text: '여러 곳 알아봤는데 여기가 제일 계산이 정확하고 빨랐어요. 1분 만에 결과가 나오는 게 신기하네요. 덕분에 빠르게 결정할 수 있었습니다.',
            author: '이OO',
            location: '부산시 진구'
        }
    ];

    const reviewGrid = document.getElementById('review-grid');
    if (reviewGrid) {
        reviews.forEach(review => {
            const card = document.createElement('div');
            card.className = 'bg-gray-50 p-8 rounded-2xl flex flex-col justify-between';

            let starsHtml = '';
            for (let i = 0; i < review.stars; i++) {
                starsHtml += '<span class="material-symbols-outlined fill-current">star</span>';
            }

            card.innerHTML = `
                <div>
                    <div class="flex items-center gap-1 text-yellow-500 mb-4">
                        ${starsHtml}
                    </div>
                    <p class="text-navy-900 font-serif font-medium text-lg italic mb-6">"${review.text}"</p>
                </div>
                <div class="flex items-center gap-4 pt-6 border-t border-gray-200 font-sans">
                    <div class="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <span class="material-symbols-outlined">person</span>
                    </div>
                    <div>
                        <p class="font-bold text-navy-900">${review.author}</p>
                        <p class="text-sm text-gray-500">${review.location}</p>
                    </div>
                </div>
            `;
            reviewGrid.appendChild(card);
        });
    }

    // --- Mobile Menu Toggle ---
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', () => {
            const isHidden = mobileMenu.classList.contains('hidden');
            mobileMenu.classList.toggle('hidden', !isHidden);
            const icon = menuBtn.querySelector('.material-symbols-outlined');
            icon.textContent = isHidden ? 'close' : 'menu';
        });

        // Close menu on link click
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                menuBtn.querySelector('.material-symbols-outlined').textContent = 'menu';
            });
        });
    }
});
