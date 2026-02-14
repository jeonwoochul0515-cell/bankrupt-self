
import { db } from './firebase-init.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
        this.currentStep = 0;
        this.totalSteps = 7; // 0: 자격, 1: 소득형태, 2: 채무/재산, 3: 월소득, 4: 부양가족, 5: 투자손실, 6: 결과
        this.formData = JSON.parse(localStorage.getItem('formData')) || {};
        this.render();
    }

    render() {
        const style = `
            :host { display: block; width: 100%; max-width: 800px; margin: 0 auto; font-family: 'Pretendard', sans-serif; }
            .simulation-form-wrapper { background-color: #fff; border-radius: 16px; padding: 2.5rem; box-shadow: 0 10px 40px rgba(0,0,0,0.08); position: relative; }
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
            #prev-btn { background-color: #f1f3f5; color: #495057; }
            .input-group { display: flex; align-items: center; border: 2px solid #dee2e6; border-radius: 8px; padding-right: 1rem; transition: border-color 0.3s; margin-bottom: 1rem;}
            .input-group:focus-within { border-color: #1A3A6D; }
            input[type="number"], input[type="text"] { width: 100%; padding: 1rem; border: none; border-radius: 8px; font-size: 1.1rem; outline: none; }
            .input-group span { color: #868e96; font-weight: 600; }
            /* Result & Consultation Styles */
            .result-grid, .consultation-form { text-align: center; }
            .result-item { background: #f8f9fa; padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem; }
            .result-item h4 { margin: 0 0 0.5rem; font-size: 1rem; color: #495057; font-weight: 500; }
            .result-item p { margin: 0; font-size: 1.8rem; font-weight: 700; color: #1A3A6D; }
            #result-write-off { font-size: 2.2rem; color: #E8A95A; }
            .result-item.full-width { background-color: #e8f1ff; border: 1px solid #1A3A6D; }
            .result-item.full-width p { font-size: 1.1rem; font-weight: 500; color: #1A3A6D; white-space: pre-wrap; line-height: 1.7; }
            .consultation-form { margin-top: 2.5rem; padding: 2rem; border: 2px solid #e9ecef; border-radius: 12px; }
            .privacy-policy { margin: 1rem 0; font-size: 0.9rem; color: #6c757d;}
            .privacy-policy-link { text-decoration: underline; cursor: pointer; color: #1A3A6D; }
            .result-actions { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
            .action-btn { padding: 1rem; border-radius: 8px; font-size: 1.1rem; font-weight: 600; text-align: center; text-decoration: none; cursor: pointer; transition: all 0.3s; }
            #submit-consultation-btn { background-color: #E8A95A; color: white; border: none; }
            #recommend-btn { background-color: #28a745; color: white; border: none; }
            #delete-data-btn { background-color: #e63946; color: white; border: none; }
            /* Modal Styles */
            .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: none; align-items: center; justify-content: center; z-index: 1000; }
            .modal-content { background: white; padding: 2rem; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow-y: auto; position: relative; }
            .close-btn { position: absolute; top: 1rem; right: 1rem; font-size: 1.5rem; cursor: pointer; border: none; background: none; color: #868e96; }
        `;

        const template = `
            <div class="simulation-form-wrapper">
                <div id="progress-bar-container"><div id="progress-bar"></div></div>
                <form id="simulation-steps">
                    <!-- Step 0: 관할 및 기본 자격 확인 -->
                    <div class="form-step active" data-step="0">
                        <p class="question-title">Q1. 거주지가 부산, 울산, 경남에 해당하나요?</p>
                        <div class="option-group" data-question="jurisdiction">
                            <button type="button" class="option-btn" data-value="yes">예</button>
                            <button type="button" class="option-btn" data-value="no">아니오</button>
                        </div>
                        <p class="question-title">Q2. 총 채무가 1,000만원 이상인가요?</p>
                        <div class="option-group" data-question="min_debt">
                            <button type="button" class="option-btn" data-value="yes">예</button>
                            <button type="button" class="option-btn" data-value="no">아니오</button>
                        </div>
                    </div>

                    <!-- Step 1: 소득 형태 -->
                    <div class="form-step" data-step="1">
                        <p class="question-title">Q3. 소득 형태가 어떻게 되시나요?</p>
                        <div class="option-group" data-question="income_source">
                            <button type="button" class="option-btn" data-value="salary">급여소득자</button>
                            <button type="button" class="option-btn" data-value="business">영업소득자</button>
                            <button type="button" class="option-btn" data-value="none">무소득</button>
                        </div>
                    </div>

                    <!-- Step 2: 채무 및 재산 -->
                    <div class="form-step" data-step="2">
                        <p class="question-title">Q4. 총 채무액은 얼마인가요? (단위: 만원)</p>
                        <div class="input-group"><input type="number" data-question="total_debt" placeholder="10000"><span>만원</span></div>
                        <p class="question-title">Q5. 총 재산가치는 얼마인가요? (단위: 만원)</p>
                        <div class="input-group"><input type="number" data-question="total_assets" placeholder="5000"><span>만원</span></div>
                    </div>

                    <!-- Step 3: 소득 -->
                    <div class="form-step" data-step="3">
                        <p class="question-title">Q6. 월 평균 소득(세후)은 얼마인가요?</p>
                        <div class="input-group"><input type="number" data-question="monthly_income" placeholder="3,000,000"><span>원</span></div>
                    </div>

                    <!-- Step 4: 부양가족 -->
                    <div class="form-step" data-step="4">
                         <p class="question-title">Q7. 본인을 포함한 부양가족은 몇 명인가요?</p>
                        <div class="option-group" data-question="dependents">
                            <button type="button" class="option-btn" data-value="1">1명</button>
                            <button type="button" class="option-btn" data-value="2">2명</button>
                            <button type="button" class="option-btn" data-value="3">3명</button>
                            <button type="button" class="option-btn" data-value="4">4명 이상</button>
                        </div>
                    </div>

                     <!-- Step 5: 부산법원 특화 -->
                    <div class="form-step" data-step="5">
                        <p class="question-title">Q8. 최근 1년 내 채무 중 주식/코인 투자 손실이 큰 비중을 차지하나요?</p>
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
            <div class="modal-overlay" id="privacy-modal">
                <div class="modal-content">
                    <button class="close-btn" id="close-modal-btn">&times;</button>
                    <div id="privacy-content"></div>
                </div>
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

        nextBtn.addEventListener('click', () => {
            if (this.currentStep === 0) {
                if (this.formData.jurisdiction !== 'yes') {
                    this.displayResult("상담 필요", "거주지가 부산회생법원 관할(부산, 울산, 경남)이 아니시군요. 관할 법원에 따라 결과가 달라질 수 있어 전문가의 도움이 필요합니다. 상담을 신청해주시면 관할에 맞는 최적의 방법을 안내해 드리겠습니다.");
                    this.currentStep = this.totalSteps - 1;
                    this.updateFormView();
                    return;
                } 
                if(this.formData.min_debt !== 'yes') {
                    this.displayResult("신청 어려움", "총 채무액이 1,000만원 미만일 경우 개인회생 신청이 어렵습니다. 다른 제도를 알아보시거나, 전문가와 상담해보세요.");
                    this.currentStep = this.totalSteps - 1;
                    this.updateFormView();
                    return;
                }
            }

            if (this.currentStep < this.totalSteps - 2) {
                this.currentStep++;
                this.updateFormView();
            } else if (this.currentStep === this.totalSteps - 2) {
                this.collectInputData();
                this.calculateAndShowResults();
                this.currentStep++;
                this.updateFormView();
            }
        });

        prevBtn.addEventListener('click', () => {
            if (this.currentStep > 0 && this.currentStep < this.totalSteps - 1) {
                this.currentStep--;
                this.updateFormView();
            }
        });
        
        this.updateFormView();
        this.populateFormFromData();
    }

    updateFormView() {
        this.shadowRoot.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
        const currentStepEl = this.shadowRoot.querySelector(`.form-step[data-step="${this.currentStep}"]`);
        if (currentStepEl) currentStepEl.classList.add('active');

        const progress = (this.currentStep / (this.totalSteps - 1)) * 100;
        this.shadowRoot.querySelector('#progress-bar').style.width = `${progress}%`;

        this.shadowRoot.querySelector('#prev-btn').style.display = (this.currentStep === 0 || this.currentStep === this.totalSteps - 1) ? 'none' : 'inline-block';
        this.shadowRoot.querySelector('#next-btn').textContent = this.currentStep === this.totalSteps - 2 ? '결과 보기' : '다음';
        this.shadowRoot.querySelector('#next-btn').style.display = this.currentStep === this.totalSteps - 1 ? 'none' : 'inline-block';
    }
    
    collectInputData(){
         this.shadowRoot.querySelectorAll('input[type="number"], input[type="text"]').forEach(input => {
             if(input.dataset.question){
                let value = input.value || '';
                if (input.dataset.question === 'total_debt' || input.dataset.question === 'total_assets') {
                    value = parseFloat(value); // Store as 백만원
                }
                this.formData[input.dataset.question] = value;
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
                if (input.classList.contains('option-group')) {
                    const btn = input.querySelector(`[data-value='${this.formData[key]}']`);
                    if (btn) btn.classList.add('selected');
                } else {
                    input.value = this.formData[key];
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
        const liquidationValue = parseFloat(this.formData.total_assets) * 10_000 || 0; // Convert 만원 to 원 for calculation
        const totalDebt = parseFloat(this.formData.total_debt) * 10_000 || 0; // Convert 만원 to 원 for calculation

        let availableIncome = monthlyIncome - livelihoodCost;
        if (availableIncome <= 0) {
            this.displayResult("면제 가능성 높음", `월 소득이 ${dependents+1}인 가구 생계비보다 적어, 월 변제금이 발생하지 않거나 매우 적을 수 있습니다. 전문가 상담이 필수적입니다.`);
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
        
        this.formData.result_monthly_repayment = Math.round(availableIncome);
        this.formData.result_repayment_period = repaymentPeriod;
        this.formData.result_total_write_off = Math.round(totalWriteOff);
        this.formData.result_write_off_rate = writeOffRate.toFixed(1);

        const resultsHTML = `
            <h3 style="text-align:center; margin-bottom: 2rem;">AI 진단 결과 요약</h3>
            <div class="result-grid">
                <div class="result-item"><h4>예상 월 변제금</h4><p>${this.formData.result_monthly_repayment.toLocaleString()}원</p></div>
                <div class="result-item"><h4>예상 변제 기간</h4><p>${this.formData.result_repayment_period}개월</p></div>
                <div class="result-item full-width"><h4>예상 총 탕감액 (원금 기준)</h4><p id="result-write-off">약 ${this.formData.result_total_write_off.toLocaleString()}원 (${this.formData.result_write_off_rate}%)</p></div>
                <div class="result-item full-width"><h4>부산회생법원 특화 분석</h4><p>${this.formData.investment_loss === 'yes' ? '주식/코인 투자 손실이 있을 경우, 부산법원에서는 투자 경위와 자금 사용처에 대한 소명을 중요하게 봅니다. 전문적인 서류 준비가 변제금 상향을 막는 핵심이 될 수 있습니다.' : '최근 채무 사용 내역이 건전하여, 부산법원에서 긍정적인 결과를 기대할 수 있습니다. 전문가와 함께 최적의 변제 계획을 세워보세요.'}</p></div>
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
            this.formData.result_title = title;
            this.formData.result_content = content;
            finalHtml = `<h3 style="text-align:center;">${title}</h3><p style="text-align:center; font-size: 1.1rem; padding: 1rem;">${content}</p>`;
        }
        
        finalHtml += `
            <div class="consultation-form">
                <h3>전문가 상담 신청</h3>
                <p>결과에 대해 더 궁금한 점이 있거나, 다음 단계를 진행하고 싶으시면 상담을 신청하세요.</p>
                 <div class="input-group"><input type="text" id="user_name" placeholder="이름"></div>
                 <div class="input-group"><input type="text" id="user_phone" placeholder="연락처 ('-' 없이)"></div>
                 <div class="privacy-policy">
                    <label><input type="checkbox" id="privacy-agree"> <span class="privacy-policy-link" id="privacy-policy-link">개인정보처리방침</span>에 동의합니다.</label>
                </div>
                <div class="result-actions">
                    <button id="submit-consultation-btn" class="action-btn">상담 신청하기</button>
                    <a href="http://lawchungsong.vercel.app" target="_blank" id="recommend-btn" class="action-btn">부산회생법원 인근 변호사사무실 추천</a>
                    <button id="delete-data-btn" class="action-btn">모든 내 정보 삭제하기</button>
                </div>
            </div>
        `;
        resultStep.innerHTML = finalHtml;
        
        this.shadowRoot.querySelector('#privacy-policy-link').addEventListener('click', () => this.loadPrivacyPolicy());
        this.shadowRoot.querySelector('#delete-data-btn').addEventListener('click', () => this.deleteData());
        this.shadowRoot.querySelector('#submit-consultation-btn').addEventListener('click', (event) => this.submitConsultation(event));
        
        const modal = this.shadowRoot.querySelector('#privacy-modal');
        this.shadowRoot.querySelector('#close-modal-btn').addEventListener('click', () => modal.style.display = 'none');
        modal.addEventListener('click', (e) => { if(e.target === modal) { modal.style.display = 'none'; } });
    }

    async loadPrivacyPolicy() {
        const modal = this.shadowRoot.querySelector('#privacy-modal');
        const contentDiv = this.shadowRoot.querySelector('#privacy-content');
        try {
            const response = await fetch('privacy.html');
            if(!response.ok) throw new Error('Privacy policy could not be loaded.');
            contentDiv.innerHTML = await response.text();
            modal.style.display = 'flex';
        } catch (error) {
            contentDiv.innerHTML = '개인정보처리방침을 불러오는 데 실패했습니다.';
            console.error(error);
             modal.style.display = 'flex';
        }
    }

    deleteData() {
        localStorage.removeItem('formData');
        this.formData = {};
        alert('모든 정보가 삭제되었습니다.');
        this.currentStep = 0;
        this.render(); 
        this.connectedCallback();
    }
    
    async submitConsultation(event) {
        event.preventDefault(); // Prevent default form submission
        const questionMap = {
            jurisdiction: "Q1. 거주지",
            min_debt: "Q2. 총 채무 1천만원 이상 여부",
            income_source: "Q3. 소득 형태",
            total_debt: "Q4. 총 채무액",
            total_assets: "Q5. 총 재산가치",
            monthly_income: "Q6. 월 평균 소득",
            dependents: "Q7. 부양가족 수",
            investment_loss: "Q8. 주식/코인 투자 손실 여부",
            result_monthly_repayment: "예상 월 변제금",
            result_repayment_period: "예상 변제 기간",
            result_total_write_off: "예상 총 탕감액",
            result_write_off_rate: "예상 탕감률",
            result_title: "진단 결과 요약",
            result_content: "진단 결과 상세 내용"
        };
        const name = this.shadowRoot.querySelector('#user_name').value;
        const phone = this.shadowRoot.querySelector('#user_phone').value;
        const agree = this.shadowRoot.querySelector('#privacy-agree').checked;

        if (!name || !phone) {
            alert('이름과 연락처를 모두 입력해주세요.');
            return;
        }
        if (!agree) {
            alert('개인정보처리방침에 동의해주세요.');
            return;
        }

        const simulationAnswers = {};
        const simulationResults = {};

        for (const key in this.formData) {
            if (key.startsWith('result_')) {
                simulationResults[this.questionMap[key] || key] = this.formData[key];
            } else {
                simulationAnswers[this.questionMap[key] || key] = this.formData[key];
            }
        }

        const consultationData = {
            requesterInfo: {
                name: name,
                phone: phone,
            },
            simulationAnswers: simulationAnswers,
            simulationResults: simulationResults,
            createdAt: serverTimestamp()
        };

        try {
            const docRef = await addDoc(collection(db, "consultations"), consultationData);
            console.log("Document written with ID: ", docRef.id);
            alert(`${name}님, 상담 신청이 완료되었습니다. 곧 연락드리겠습니다.`);
            // Optionally, clear form or redirect
        } catch (e) {
            console.error("Error adding document: ", e);
            alert(`상담 신청 중 오류가 발생했습니다. 다시 시도해주세요. 오류: ${e.message}`);
        }
    }
}

customElements.define('simulation-form', SimulationForm);
