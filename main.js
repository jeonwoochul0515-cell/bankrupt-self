
document.addEventListener('DOMContentLoaded', () => {

    // --- Success Carousel ---
    const successCases = [
        { debt: '1억 2천', monthly: '35만원', name: '김OO', region: '부산 해운대' },
        { debt: '8,500만원', monthly: '28만원', name: '박OO', region: '울산 남구' },
        { debt: '2억 1천', monthly: '45만원', name: '이OO', region: '경남 창원' },
        { debt: '5,700만원', monthly: '18만원', name: '정OO', region: '부산 사하구' },
        { debt: '1억 5천', monthly: '38만원', name: '최OO', region: '부산 동래구' },
        { debt: '9,200만원', monthly: '30만원', name: '강OO', region: '경남 김해' },
        { debt: '3억', monthly: '52만원', name: '윤OO', region: '부산 부산진구' },
        { debt: '6,800만원', monthly: '22만원', name: '한OO', region: '울산 중구' },
        { debt: '1억 8천', monthly: '42만원', name: '조OO', region: '경남 양산' },
        { debt: '4,300만원', monthly: '15만원', name: '서OO', region: '부산 금정구' },
        { debt: '2억 5천', monthly: '48만원', name: '임OO', region: '부산 연제구' },
        { debt: '7,600만원', monthly: '25만원', name: '신OO', region: '경남 거제' },
        { debt: '1억', monthly: '32만원', name: '오OO', region: '부산 수영구' },
        { debt: '1억 3천', monthly: '36만원', name: '배OO', region: '울산 울주군' },
        { debt: '6,100만원', monthly: '20만원', name: '권OO', region: '부산 사상구' },
        { debt: '2억 3천', monthly: '47만원', name: '유OO', region: '경남 진주' },
        { debt: '5,400만원', monthly: '17만원', name: '노OO', region: '부산 남구' },
        { debt: '1억 7천', monthly: '40만원', name: '문OO', region: '경남 통영' },
        { debt: '8,900만원', monthly: '29만원', name: '양OO', region: '부산 북구' },
        { debt: '3억 2천', monthly: '55만원', name: '홍OO', region: '울산 동구' },
    ];

    const track = document.getElementById('success-track');
    if (track) {
        const buildItems = () => successCases.map(c =>
            `<div class="h-[48px] flex items-center gap-3 px-4">
                <div class="bg-green-100 p-1.5 rounded-full text-green-600 shrink-0">
                    <span class="material-symbols-outlined text-base">verified_user</span>
                </div>
                <p class="text-sm font-bold text-navy-900 whitespace-nowrap">채무 ${c.debt} → 월 ${c.monthly} 변제 - ${c.name}님 (${c.region})</p>
            </div>`
        ).join('');
        track.innerHTML = buildItems() + buildItems();
    }

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

    // --- FAQ Accordion ---
    document.querySelectorAll('.faq-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.faq-item');
            const content = item.querySelector('.faq-content');
            const icon = btn.querySelector('.faq-icon');
            const isOpen = !content.classList.contains('hidden');

            // Close all others
            document.querySelectorAll('.faq-item').forEach(other => {
                if (other !== item) {
                    other.querySelector('.faq-content').classList.add('hidden');
                    other.querySelector('.faq-icon').classList.remove('open');
                    other.querySelector('.faq-toggle').setAttribute('aria-expanded', 'false');
                }
            });

            // Toggle current
            content.classList.toggle('hidden', isOpen);
            icon.classList.toggle('open', !isOpen);
            btn.setAttribute('aria-expanded', !isOpen);
        });
    });
});
