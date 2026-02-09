
// 2026년 기준 중위소득 60% (법원 인정 생계비)
const LIVELIHOOD_COST_2026 = {
    0: 1538543, // 1인 가구
    1: 1538543,
    2: 2519575,
    3: 3215422,
    4: 3896843,
    5: 4534031,
    6: 5133571,
};

class SimulationForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.currentStep = 0; // Start from step 0
        this.totalSteps = 6; // Updated total steps
        this.formData = JSON.parse(localStorage.getItem('formData')) || {};
        this.render();
    }

    render() {
        const style = `
            :host { display: block; width: 100%; max-width: 800px; margin: 0 auto; font-family: 'Pretendard', sans-serif; }
            .simulation-form-wrapper { background-color: #fff; border-radius: 16px; padding: 2.5rem; box-shadow: 0 10px 40px rgba(0,0,0,0.08); }
            #progress-bar-container { width: 100%; background-color: #e9ecef; border-radius: 10px; margin-bottom: 2rem; height: 12px; overflow: hidden; }
            #progress-bar { width: 0; height: 100%; background: linear-gradient(90deg, #1A3A6D, #2b509a); transition: width 0.4s ease-in-out; }
            .form-step { display: none; animation: fadeIn 0.5s; }
            .form-step.active { display: block; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
            .question-title { font-size: 1.3rem; font-weight: 600; margin: 1.5rem 0 1rem 0; color: #343a40; }
            .option-group { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
            .option-btn { padding: 1rem; border: 2px solid #dee2e6; border-radius: 8px; font-size: 1rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease; background-color: #fff; text-align: center; }
            .option-btn.selected { background-color: #e8f1ff; border-color: #1A3A6D; font-weight: 600; color: #1A3A6D; }
            .navigation-btns { margin-top: 2rem; display: flex; justify-content: space-between; align-items: center; }
            .nav-btn { padding: 0.8rem 2rem; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s; }
            #next-btn { background-color: #1A3A6D; color: white; box-shadow: 0 4px 15px rgba(26, 58, 109, 0.2); }
            #next-btn:disabled { background-color: #adb5bd; cursor: not-allowed; }
            #next-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(26, 58, 109, 0.3); }
            #prev-btn { background-color: #f1f3f5; color: #495057; }
            .input-group { display: flex; align-items: center; border: 2px solid #dee2e6; border-radius: 8px; padding-right: 1rem; transition: border-color 0.3s; margin-bottom: 1rem;}
            .input-group:focus-within { border-color: #1A3A6D; }
            input[type="number"], input[type="text"] { width: 100%; padding: 1rem; border: none; border-radius: 8px; font-size: 1.1rem; outline: none; }
            .input-group span { color: #868e96; font-weight: 600; }
            .privacy-policy { margin-top: 1.5rem; font-size: 0.9rem; color: #6c757d;}
            .privacy-policy input { margin-right: 0.5rem; }
            /* Result Styles */
            .result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 2rem; text-align: center; }
            .result-item { background: #f8f9fa; padding: 1.5rem; border-radius: 12px; }
            .result-item h4 { margin: 0 0 0.5rem; font-size: 1rem; color: #495057; font-weight: 500; }
            .result-item p { margin: 0; font-size: 1.8rem; font-weight: 700; color: #1A3A6D; }
            #result-write-off { font-size: 2.2rem; color: #E8A95A; }
            .result-item.full-width { grid-column: 1 / -1; background-color: #e8f1ff; border: 1px solid #1A3A6D; }
            .result-item.full-width p { font-size: 1.1rem; font-weight: 500; color: #1A3A6D; white-space: pre-wrap; line-height: 1.7; }
            .result-actions { margin-top: 2rem; display: flex; flex-direction: column; gap: 1rem; }
            .action-btn { padding: 1rem; border-radius: 8px; font-size: 1.1rem; font-weight: 600; text-align: center; text-decoration: none; cursor: pointer; transition: all 0.3s; }
            #law-firm-btn { background-color: #1A3A6D; color: white; }
            #delete-data-btn { background-color: #e63946; color: white; border: none; }
        `;

        const template = `
            <div class="simulation-form-wrapper">
                <div id="progress-bar-container"><div id="progress-bar"></div></div>
                <form id="simulation-steps">
                    <!-- Step 0: Personal Info -->
                    <div class="form-step active" data-step="0">
                        <p class="question-title">진단을 위해 기본 정보를 입력해주세요.</p>
                        <div class="input-group"><input type="text" data-question="user_name" placeholder="이름"></div>
                        <div class="input-group"><input type="text" data-question="user_phone" placeholder="전화번호"></div>
                        <div class="privacy-policy">
                            <label><input type="checkbox" id="privacy-agree"> 개인정보 수집 및 활용에 동의합니다.</label>
                        </div>
                    </div>

                    <!-- Step 1: 기초 자격 검증 -->
                    <div class="form-step" data-step="1">
                        <p class="question-title">Q1. 소득 형태가 어떻게 되시나요?</p>
                        <div class="option-group" data-question="income_source">
                            <button type="button" class="option-btn" data-value="salary">급여소득자</button>
                            <button type="button" class="option-btn" data-value="business">영업소득자</button>
                            <button type="button" class="option-btn" data-value="none">무소득</button>
                        </div>
                    </div>

                    <!-- Step 2: 채무 및 재산 -->
                    <div class="form-step" data-step="2">
                        <p class="question-title">Q2. 총 채무액은 얼마인가요?</p>
                        <div class="input-group"><input type="number" data-question="total_debt" placeholder="10,000,000"><span>원</span></div>
                        <p class="question-title">Q3. 총 재산가치는 얼마인가요?</p>
                        <div class="input-group"><input type="number" data-question="total_assets" placeholder="5,000,000"><span>원</span></div>
                    </div>

                    <!-- Step 3: 소득 -->
                    <div class="form-step" data-step="3">
                        <p class="question-title">Q4. 월 평균 소득(세후)은 얼마인가요?</p>
                        <div class="input-group"><input type="number" data-question="monthly_income" placeholder="3,000,000"><span>원</span></div>
                    </div>

                    <!-- Step 4: 부양가족 -->
                    <div class="form-step" data-step="4">
                         <p class="question-title">Q5. 본인을 포함한 부양가족은 몇 명인가요?</p>
                        <div class="option-group" data-question="dependents">
                            <button type="button" class="option-btn" data-value="0">0명 (1인 가구)</button>
                            <button type="button" class="option-btn" data-value="1">1명</button>
                            <button type="button" class="option-btn" data-value="2">2명</button>
                            <button type="button" class="option-btn" data-value="3">3명</button>
                            <button type="button" class="option-btn" data-value="4">4명 이상</button>
                        </div>
                    </div>

                     <!-- Step 5: 부산법원 특화 -->
                    <div class="form-step" data-step="5">
                        <p class="question-title">Q6. 최근 1년 내 채무 중 주식/코인 투자 손실이 큰 비중을 차지하나요?</p>
                        <div class="option-group" data-question="investment_loss">
                            <button type="button" class="option-btn" data-value="yes">예</button>
                            <button type="button" class="option-btn" data-value="no">아니오</button>
                        </div>
                    </div>

                    <!-- Step 6: 결과 -->
                    <div class="form-step" data-step="6" id="result-step"></div>

                    <div class="navigation-btns">
                        <button type="button" id="prev-btn" class="nav-btn">이전</button>
                        <button type="button" id="next-btn" class="nav-btn">다음</button>
                    </div>
                </form>
            </div>
        `;
        this.shadowRoot.innerHTML = `<style>${style}</style>${template}`;
    }

    connectedCallback() {
        this.shadowRoot.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const group = e.target.parentElement;
                const question = group.dataset.question;
                const value = e.target.dataset.value;
                group.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                this.formData[question] = value;
                this.saveToLocalStorage();
            });
        });

        const nextBtn = this.shadowRoot.querySelector('#next-btn');
        const prevBtn = this.shadowRoot.querySelector('#prev-btn');
        const privacyAgree = this.shadowRoot.querySelector('#privacy-agree');

        privacyAgree.addEventListener('change', () => {
            nextBtn.disabled = !privacyAgree.checked;
        });

        nextBtn.addEventListener('click', () => {
            if (this.currentStep === 0 && !privacyAgree.checked) {
                alert('개인정보 수집 및 활용에 동의해주세요.');
                return;
            }
            if (this.currentStep < this.totalSteps - 1) {
                this.currentStep++;
                this.updateFormView();
            } 
            if (this.currentStep === this.totalSteps -1) {
                this.collectInputData();
                this.calculateAndShowResults();
                 this.currentStep++; // Move to result step
                this.updateFormView();
            }
        });

        prevBtn.addEventListener('click', () => {
            if (this.currentStep > 0) {
                this.currentStep--;
                this.updateFormView();
            }
        });
        this.updateFormView(); // Initial setup
        this.populateFormFromData();
        // Disable next button initially on step 0
        if (this.currentStep === 0) {
            nextBtn.disabled = !privacyAgree.checked;
        }
    }

    updateFormView() {
        this.shadowRoot.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
        this.shadowRoot.querySelector(`.form-step[data-step="${this.currentStep}"]`).classList.add('active');
        
        const progress = this.currentStep === 0 ? 0 : (this.currentStep / (this.totalSteps - 1)) * 100;
        this.shadowRoot.querySelector('#progress-bar').style.width = `${progress}%`;

        this.shadowRoot.querySelector('#prev-btn').style.display = this.currentStep === 0 ? 'none' : 'inline-block';
        this.shadowRoot.querySelector('#next-btn').textContent = this.currentStep === this.totalSteps - 2 ? '결과 보기' : '다음';
        this.shadowRoot.querySelector('#next-btn').style.display = this.currentStep === this.totalSteps -1 ? 'none' : 'inline-block';
    }
    
    collectInputData(){
         this.shadowRoot.querySelectorAll('input[type="number"], input[type="text"]').forEach(input => {
             if(input.dataset.question){
                this.formData[input.dataset.question] = input.value || '';
             }
        });
        this.saveToLocalStorage();
    }
    
    saveToLocalStorage() {
        localStorage.setItem('formData', JSON.stringify(this.formData));
    }

    populateFormFromData() {
        for (const key in this.formData) {
            const input = this.shadowRoot.querySelector(`[data-question='${key}']`);
            if (input) {
                if (input.type === 'number' || input.type === 'text') {
                    input.value = this.formData[key];
                } else if (input.classList.contains('option-group')) {
                    const btn = input.querySelector(`[data-value='${this.formData[key]}']`);
                    if (btn) btn.classList.add('selected');
                }
            }
        }
    }

    calculateAndShowResults() {
        if (this.formData.income_source === 'none') {
            this.displayResult("신청 어려움", "안정적인 소득이 없어 개인회생 신청이 어렵습니다.");
            return;
        }
        if (this.formData.total_debt <= this.formData.total_assets) {
             this.displayResult("신청 어려움", "채무보다 재산이 많을 경우 개인회생 신청이 어렵습니다.");
             return;
        }

        const dependents = parseInt(this.formData.dependents) || 0;
        const livelihoodCost = LIVELIHOOD_COST_2026[dependents] || LIVELIHOOD_COST_2026[1];
        const monthlyIncome = parseFloat(this.formData.monthly_income) || 0;
        const liquidationValue = parseFloat(this.formData.total_assets) || 0;
        const totalDebt = parseFloat(this.formData.total_debt) || 0;

        let availableIncome = monthlyIncome - livelihoodCost;
        if (availableIncome <= 0) {
            this.displayResult("면제 가능성 높음", `월 소득이 ${dependents}인 가구 생계비보다 적어, 월 변제금이 발생하지 않거나 매우 적을 수 있습니다. 전문가 상담이 필수적입니다.`);
            return;
        }

        let repaymentPeriod = 36;
        let totalRepayment = availableIncome * repaymentPeriod;

        if (totalRepayment < liquidationValue) {
            repaymentPeriod = Math.ceil(liquidationValue / availableIncome);
            if (repaymentPeriod > 60) {
                this.displayResult("신청 어려움", "재산 가치가 높아 60개월 내 변제가 불가능합니다. 파산 또는 전문가 상담을 권유합니다.");
                return;
            }
            repaymentPeriod = Math.min(60, Math.max(36, repaymentPeriod));
        }
        totalRepayment = availableIncome * repaymentPeriod;

        const totalWriteOff = totalDebt - totalRepayment;
        const writeOffRate = totalDebt > 0 ? (totalWriteOff / totalDebt) * 100 : 0;

        const resultsHTML = `
            <h3 style="text-align:center; margin-bottom: 2rem;">AI 진단 결과 요약</h3>
            <div class="result-grid">
                <div class="result-item">
                    <h4>예상 월 변제금</h4>
                    <p>${Math.round(availableIncome).toLocaleString()}원</p>
                </div>
                <div class="result-item">
                    <h4>예상 변제 기간</h4>
                    <p>${repaymentPeriod}개월</p>
                </div>
                <div class="result-item full-width">
                     <h4>예상 총 탕감액 (원금 기준)</h4>
                     <p id="result-write-off">약 ${Math.round(totalWriteOff).toLocaleString()}원 (${writeOffRate.toFixed(1)}%)</p>
                </div>
                <div class="result-item full-width">
                    <h4>분석 코멘트</h4>
                    <p>${this.formData.investment_loss === 'yes' ? '주식/코인 투자 손실이 있을 경우, 법원에서는 투자 경위와 자금 사용처에 대한 소명을 중요하게 봅니다. 전문적인 서류 준비가 변제금 상향을 막는 핵심이 될 수 있습니다.' : '최근 채무 사용 내역이 건전하여, 긍정적인 결과를 기대할 수 있습니다. 전문가와 함께 최적의 변제 계획을 세워보세요.'}</p>
                </div>
            </div>
        `;
        this.displayResult("회생 가능성 높음", resultsHTML, true);
    }

    displayResult(title, content, isHtml = false) {
        const resultStep = this.shadowRoot.querySelector('#result-step');
        let finalHtml = '';
        if (isHtml) {
             finalHtml = content;
        } else {
            finalHtml = `<h3 style="text-align:center;">${title}</h3><p style="text-align:center; font-size: 1.1rem; padding: 1rem;">${content}</p>`;
        }
        
        finalHtml += `
            <div class="result-actions">
                <a href="http://lawchungsong.vercel.app" target="_blank" id="law-firm-btn" class="action-btn">홈페이지 바로가기</a>
                <button id="delete-data-btn" class="action-btn">모든 개인정보 삭제하기</button>
            </div>
        `;
        resultStep.innerHTML = finalHtml;

        this.shadowRoot.querySelector('#delete-data-btn').addEventListener('click', () => {
            localStorage.removeItem('formData');
            this.formData = {};
            alert('삭제완료');
            // Optionally, reset the form
            this.currentStep = 0;
            this.render(); // Re-render the component from the start
            this.connectedCallback();
        });
    }
}

customElements.define('simulation-form', SimulationForm);
