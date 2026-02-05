document.getElementById('diagnosis-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const income = document.getElementById('income').value;
    const debt = document.getElementById('debt').value;
    const overdue = document.getElementById('overdue').value;
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;

    const data = {
        income,
        debt,
        overdue,
        name,
        phone,
        timestamp: new Date().toISOString()
    };

    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbycw7XeQKPeJ-j6AP10z78QyPRZTA2LAeG3l9bG7idro6nM5cqy0BxhiXuHf9kvfeIN8Q/exec';

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        alert('진단 결과가 성공적으로 제출되었습니다!');
        document.getElementById('diagnosis-form').reset();
    })
    .catch(error => {
        console.error('Error:', error);
        alert('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
    });
});
