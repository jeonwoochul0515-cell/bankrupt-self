
import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =================================================================
// [상수 선언] 2026년 기준 중위소득 및 생계비 데이터 (보건복지부 고시)
// =================================================================
const CONSTANTS = {
    LIVING_COST_2026: {
        1: 1538543,
        2: 2519575,
        3: 3215422,
        4: 3896843,
        5: 4534031,
        6: 5133571
    },
    HOUSING_LIMIT: {
        "SEOUL": 589000,
        "SUWON": 430000,
        "METRO_OVER": 430000,
        "BUSAN": 229000,
        "METRO": 229000,
        "OTHER": 176000
    },
    EDU_LIMIT_PER_CHILD: 200000,
    MED_DEDUCTIBLE: 64000,
    MIN_WAGE_PROTECT: 2500000
};

const SPECIALIZED_COURTS = ["BUSAN", "SEOUL", "SUWON"];

class SimulationForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.currentStep = 0;
        this.totalSteps = 9; // 0~7: 질문, 8: 결과
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
            .question-desc { font-size: 0.9rem; color: #6c757d; margin: -0.5rem 0 1rem 0; }
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
            .result-item.highlight { background-color: #fff3cd; border: 1px solid #E8A95A; }
            .result-item.highlight p { color: #856404; font-size: 1.1rem; font-weight: 600; }
            .consultation-form { margin-top: 2.5rem; padding: 2rem; border: 2px solid #e9ecef; border-radius: 12px; }
            .privacy-policy { margin: 1rem 0; font-size: 0.9rem; color: #6c757d;}
            .privacy-policy-link { text-decoration: underline; cursor: pointer; color: #1A3A6D; }
            .result-actions { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
            .action-btn { padding: 1rem; border-radius: 8px; font-size: 1.1rem; font-weight: 600; text-align: center; text-decoration: none; cursor: pointer; transition: all 0.3s; }
            #submit-consultation-btn { background-color: #137fec; color: white; border: none; box-shadow: 0 4px 15px rgba(19, 127, 236, 0.3); }
            #submit-consultation-btn:hover { background-color: #0e5eb0; }
            #recommend-btn { background-color: #0a1f33; color: white; border: none; box-shadow: 0 4px 15px rgba(10, 31, 51, 0.2); }
            #recommend-btn:hover { background-color: #112a45; }
            #delete-data-btn { background-color: #f6f7f8; color: #6c757d; border: 1px solid #dee2e6; }
            #delete-data-btn:hover { background-color: #e9ecef; }
            /* Modal Styles */
            .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: none; align-items: center; justify-content: center; z-index: 1000; }
            .modal-content { background: white; padding: 2rem; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow-y: auto; position: relative; }
            .close-btn { position: absolute; top: 1rem; right: 1rem; font-size: 1.5rem; cursor: pointer; border: none; background: none; color: #868e96; }
        `;

        const template = `
            <div class="simulation-form-wrapper">
                <div id="progress-bar-container"><div id="progress-bar"></div></div>
                <form id="simulation-steps">
                    <!-- Step 0: 거주지 + 기본 자격 -->
                    <div class="form-step active" data-step="0">
                        <p class="question-title">Q1. 거주지가 어디인가요?</p>
                        <div class="option-group" data-question="location">
                            <button type="button" class="option-btn" data-value="BUSAN">부산 / 울산 / 경남</button>
                            <button type="button" class="option-btn" data-value="SEOUL">서울</button>
                            <button type="button" class="option-btn" data-value="SUWON">수원 / 경기남부</button>
                            <button type="button" class="option-btn" data-value="METRO_OVER">경기 과밀억제권역</button>
                            <button type="button" class="option-btn" data-value="METRO">기타 광역시</button>
                            <button type="button" class="option-btn" data-value="OTHER">그 외 지역</button>
                        </div>
                        <p class="question-title">Q2. 총 채무가 1,000만원 이상인가요?</p>
                        <div class="option-group" data-question="min_debt">
                            <button type="button" class="option-btn" data-value="yes">예</button>
                            <button type="button" class="option-btn" data-value="no">아니오</button>
                        </div>
                    </div>

                    <!-- Step 1: 나이 + 소득 형태 -->
                    <div class="form-step" data-step="1">
                        <p class="question-title">Q3. 만 나이를 입력해주세요.</p>
                        <p class="question-desc">만 30세 미만 또는 만 65세 이상은 변제 기간 단축(24개월) 특례가 적용될 수 있습니다.</p>
                        <div class="input-group"><input type="number" data-question="age" placeholder="35"><span>세</span></div>
                        <p class="question-title">Q4. 소득 형태가 어떻게 되시나요?</p>
                        <div class="option-group" data-question="income_source">
                            <button type="button" class="option-btn" data-value="salary">급여소득자</button>
                            <button type="button" class="option-btn" data-value="business">영업소득자</button>
                            <button type="button" class="option-btn" data-value="none">무소득</button>
                        </div>
                    </div>

                    <!-- Step 2: 채무/본인 재산 -->
                    <div class="form-step" data-step="2">
                        <p class="question-title">Q5. 총 채무액은 얼마인가요?</p>
                        <div class="input-group"><input type="number" data-question="total_debt" placeholder="10000"><span>만원</span></div>
                        <p class="question-title">Q6. 본인 명의 총 재산가치는 얼마인가요?</p>
                        <p class="question-desc">부동산, 차량, 보험해약환급금, 예금 등 합산</p>
                        <div class="input-group"><input type="number" data-question="my_assets" placeholder="5000"><span>만원</span></div>
                    </div>

                    <!-- Step 3: 배우자 재산 + 손실금 -->
                    <div class="form-step" data-step="3">
                        <p class="question-title">Q7. 배우자 명의 재산이 있나요?</p>
                        <p class="question-desc">전문법원(부산/서울/수원)은 배우자 재산 미반영, 일반법원은 50% 반영됩니다.</p>
                        <div class="input-group"><input type="number" data-question="spouse_assets" placeholder="0"><span>만원</span></div>
                        <p class="question-title">Q8. 주식/코인 투자 손실액이 있나요?</p>
                        <p class="question-desc">전문법원(부산/서울/수원)은 투자 손실을 청산가치에서 제외합니다.</p>
                        <div class="input-group"><input type="number" data-question="invest_loss" placeholder="0"><span>만원</span></div>
                        <p class="question-title">Q9. 도박 등으로 인한 손실액이 있나요?</p>
                        <p class="question-desc">도박 손실은 모든 법원에서 청산가치에 반영됩니다.</p>
                        <div class="input-group"><input type="number" data-question="gambling_loss" placeholder="0"><span>만원</span></div>
                    </div>

                    <!-- Step 4: 월 소득 -->
                    <div class="form-step" data-step="4">
                        <p class="question-title">Q10. 월 평균 소득(세후)은 얼마인가요?</p>
                        <div class="input-group"><input type="number" data-question="monthly_income" placeholder="3000000"><span>원</span></div>
                    </div>

                    <!-- Step 5: 부양가족 상세 -->
                    <div class="form-step" data-step="5">
                        <p class="question-title">Q11. 부양가족 구성을 알려주세요.</p>
                        <p class="question-desc">본인은 자동으로 포함됩니다. 해당 없으면 0을 입력해주세요.</p>
                        <p class="question-title" style="font-size:1.1rem;">배우자 (부양 대상)</p>
                        <div class="option-group" data-question="spouse_dependent">
                            <button type="button" class="option-btn" data-value="yes">있음</button>
                            <button type="button" class="option-btn" data-value="no">없음</button>
                        </div>
                        <p class="question-title" style="font-size:1.1rem;">미성년 자녀 수</p>
                        <div class="input-group"><input type="number" data-question="minor_children" placeholder="0" value="0"><span>명</span></div>
                        <p class="question-title" style="font-size:1.1rem;">성년 부양 자녀 수 (19~21세 저소득)</p>
                        <div class="input-group"><input type="number" data-question="adult_dependent_children" placeholder="0" value="0"><span>명</span></div>
                        <p class="question-title" style="font-size:1.1rem;">부양 노부모 수</p>
                        <div class="input-group"><input type="number" data-question="elderly_parents" placeholder="0" value="0"><span>명</span></div>
                    </div>

                    <!-- Step 6: 추가 비용 -->
                    <div class="form-step" data-step="6">
                        <p class="question-title">Q12. 추가 지출 비용을 알려주세요.</p>
                        <p class="question-desc">해당 없으면 0을 입력해주세요. 지역별 한도 내에서 생계비에 추가 인정됩니다.</p>
                        <p class="question-title" style="font-size:1.1rem;">월세 + 주택담보대출 이자</p>
                        <div class="input-group"><input type="number" data-question="housing_cost" placeholder="0"><span>원/월</span></div>
                        <p class="question-title" style="font-size:1.1rem;">월 의료비 (본인 부담금)</p>
                        <div class="input-group"><input type="number" data-question="medical_expense" placeholder="0"><span>원/월</span></div>
                        <p class="question-title" style="font-size:1.1rem;">월 교육비 (미성년 자녀)</p>
                        <div class="input-group"><input type="number" data-question="education_expense" placeholder="0"><span>원/월</span></div>
                    </div>

                    <!-- Step 7: 특수 사항 -->
                    <div class="form-step" data-step="7">
                        <p class="question-title">Q13. 아래 해당 사항이 있나요?</p>
                        <p class="question-desc">해당 시 변제 기간 24개월 단축 특례가 적용될 수 있습니다.</p>
                        <p class="question-title" style="font-size:1.1rem;">전세사기 피해자 또는 중증장애인에 해당하나요?</p>
                        <div class="option-group" data-question="is_special_victim">
                            <button type="button" class="option-btn" data-value="yes">예</button>
                            <button type="button" class="option-btn" data-value="no">아니오</button>
                        </div>
                    </div>

                    <!-- Step 8: 결과 -->
                    <div class="form-step" data-step="8" id="result-step"></div>

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
            // Step 0 검증: 거주지 선택 + 채무 1천만원 이상
            if (this.currentStep === 0) {
                if (!this.formData.location) {
                    alert('거주지를 선택해주세요.');
                    return;
                }
                if (this.formData.min_debt !== 'yes') {
                    this.displayResult("신청 어려움", "총 채무액이 1,000만원 미만일 경우 개인회생 신청이 어렵습니다. 다른 제도를 알아보시거나, 전문가와 상담해보세요.");
                    this.currentStep = this.totalSteps - 1;
                    this.updateFormView();
                    return;
                }
            }

            const lastQuestionStep = this.totalSteps - 2; // step 7
            if (this.currentStep < lastQuestionStep) {
                this.currentStep++;
                this.updateFormView();
            } else if (this.currentStep === lastQuestionStep) {
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

    collectInputData() {
        this.shadowRoot.querySelectorAll('input[type="number"], input[type="text"]').forEach(input => {
            if (input.dataset.question) {
                this.formData[input.dataset.question] = input.value || '0';
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
                } else if (input.tagName === 'INPUT') {
                    input.value = this.formData[key];
                }
            }
        }
    }

    calculateAndShowResults() {
        // ======= 입력값 추출 =======
        const location = this.formData.location || "OTHER";
        const age = parseInt(this.formData.age) || 0;
        const income = parseFloat(this.formData.monthly_income) || 0;
        const totalDebt = (parseFloat(this.formData.total_debt) || 0) * 10000; // 만원 → 원
        const myAssets = (parseFloat(this.formData.my_assets) || 0) * 10000;
        const spouseAssets = (parseFloat(this.formData.spouse_assets) || 0) * 10000;
        const investLoss = (parseFloat(this.formData.invest_loss) || 0) * 10000;
        const gamblingLoss = (parseFloat(this.formData.gambling_loss) || 0) * 10000;
        const housingCost = parseFloat(this.formData.housing_cost) || 0;
        const medicalExpense = parseFloat(this.formData.medical_expense) || 0;
        const educationExpense = parseFloat(this.formData.education_expense) || 0;
        const minorChildren = parseInt(this.formData.minor_children) || 0;
        const adultDependentChildren = parseInt(this.formData.adult_dependent_children) || 0;
        const elderlyParents = parseInt(this.formData.elderly_parents) || 0;
        const spouseDependent = this.formData.spouse_dependent === 'yes';
        const isSpecialVictim = this.formData.is_special_victim === 'yes';

        // ======= 무소득 체크 =======
        if (this.formData.income_source === 'none') {
            this.displayResult("신청 어려움", "안정적인 소득이 없어 개인회생 신청이 어렵습니다. 파산 면책 절차를 검토해보시거나 전문가와 상담하세요.");
            return;
        }

        // ======= 부양가족 수 산정 =======
        let familyCount = 1; // 본인
        if (spouseDependent) familyCount += 1;
        familyCount += minorChildren;
        familyCount += adultDependentChildren;
        familyCount += elderlyParents;
        const calcFamilyCount = Math.min(familyCount, 6);

        // ======= 관할 법원 성향 판별 =======
        const isSpecializedCourt = SPECIALIZED_COURTS.includes(location);
        const isBusan = location === "BUSAN";

        // ======= 청산가치(재산가치) 정밀 산정 =======
        let liquidationValue = myAssets;

        // 배우자 재산: 전문법원은 0%, 일반법원은 50% 반영
        if (!isSpecializedCourt && spouseAssets > 0) {
            liquidationValue += (spouseAssets * 0.5);
        }
        // 투자 손실: 전문법원은 제외, 일반법원은 전액 반영
        if (!isSpecializedCourt && investLoss > 0) {
            liquidationValue += investLoss;
        }
        // 도박 손실: 모든 법원에서 반영
        if (gamblingLoss > 0) {
            liquidationValue += gamblingLoss;
        }

        // ======= 가용소득 산출 =======
        const baseLivingCost = CONSTANTS.LIVING_COST_2026[calcFamilyCount] || CONSTANTS.LIVING_COST_2026[1];

        // 추가 주거비
        let addHousingCost = 0;
        if (housingCost > 0) {
            const limit = CONSTANTS.HOUSING_LIMIT[location] || CONSTANTS.HOUSING_LIMIT["OTHER"];
            addHousingCost = Math.min(housingCost, limit);
        }

        // 추가 의료비 (기본공제 초과분만)
        let addMedCost = 0;
        if (medicalExpense > CONSTANTS.MED_DEDUCTIBLE) {
            addMedCost = medicalExpense - CONSTANTS.MED_DEDUCTIBLE;
        }

        // 추가 교육비 (미성년 자녀 수 × 한도)
        let addEduCost = 0;
        if (minorChildren > 0 && educationExpense > 0) {
            addEduCost = Math.min(educationExpense, minorChildren * CONSTANTS.EDU_LIMIT_PER_CHILD);
        }

        const finalLivingCost = baseLivingCost + addHousingCost + addMedCost + addEduCost;
        let monthlyPayment = Math.max(0, income - finalLivingCost);

        // ======= 가용소득 0 이하 =======
        if (monthlyPayment <= 0) {
            this.formData.result_monthly_repayment = 0;
            this.formData.result_repayment_period = 0;
            this.formData.result_total_write_off = totalDebt;
            this.formData.result_write_off_rate = '100.0';
            this.displayResult("면제 가능성 높음", `월 소득(${income.toLocaleString()}원)이 ${calcFamilyCount}인 가구 인정 생계비(${Math.round(finalLivingCost).toLocaleString()}원)보다 적어, 월 변제금이 발생하지 않거나 매우 적을 수 있습니다. 전문가 상담이 필수적입니다.`);
            return;
        }

        // ======= 변제 기간 산정 =======
        let duration = 36;

        // 24개월 단축 특례 판정
        const isYouth = age > 0 && age < 30;
        const isSenior = age >= 65;
        const isMultiChild = minorChildren >= 2;

        if (isSpecializedCourt && (isYouth || isSenior || isMultiChild || isSpecialVictim)) {
            duration = 24;
        }

        // ======= 청산가치 보장 원칙 검증 =======
        let totalPaymentIncomeBased = monthlyPayment * duration;

        if (totalPaymentIncomeBased < liquidationValue) {
            monthlyPayment = Math.ceil(liquidationValue / duration);

            // 변제금이 생계비를 침해하면 기간 연장 (최대 60개월)
            if (monthlyPayment > (income - CONSTANTS.LIVING_COST_2026[1])) {
                duration = 60;
                monthlyPayment = Math.ceil(liquidationValue / 60);
            }
        }

        // 최종 변제금이 소득을 초과하면 불가
        if (monthlyPayment > income) {
            this.displayResult("신청 어려움", "재산 가치가 높아 소득 내에서 변제가 불가능합니다. 파산 면책 또는 전문가 상담을 권유합니다.");
            return;
        }

        // ======= 결과 계산 =======
        const totalPayment = monthlyPayment * duration;
        const debtReliefAmount = Math.max(0, totalDebt - totalPayment);
        const reliefRate = totalDebt > 0 ? (debtReliefAmount / totalDebt) * 100 : 0;

        // formData에 결과 저장
        this.formData.result_monthly_repayment = Math.round(monthlyPayment);
        this.formData.result_repayment_period = duration;
        this.formData.result_total_write_off = Math.round(debtReliefAmount);
        this.formData.result_write_off_rate = reliefRate.toFixed(1);
        this.formData.result_jurisdiction = isBusan ? "부산회생법원 (2026 특례 적용)" : (isSpecializedCourt ? "회생전문법원" : "일반지방법원");
        this.formData.result_is_24month = duration === 24;
        this.formData.result_applied_living_cost = Math.round(finalLivingCost);
        this.formData.result_liquidation_value = Math.round(liquidationValue);

        // ======= 결과 HTML 생성 =======
        const jurisdictionLabel = this.formData.result_jurisdiction;

        // 24개월 단축 사유
        let shortReasons = [];
        if (isYouth) shortReasons.push("만 30세 미만 청년");
        if (isSenior) shortReasons.push("만 65세 이상 고령자");
        if (isMultiChild) shortReasons.push("다자녀 가구(미성년 2명 이상)");
        if (isSpecialVictim) shortReasons.push("전세사기 피해자/중증장애인");

        // 투자손실 메시지
        let investMessage = '';
        if (investLoss > 0 && isSpecializedCourt) {
            investMessage = `전문법원(${isBusan ? '부산' : location}) 실무준칙에 따라 투자 손실금(${(investLoss / 10000).toLocaleString()}만원)이 청산가치에서 제외되어 변제금이 대폭 낮아졌습니다.`;
        } else if (investLoss > 0 && !isSpecializedCourt) {
            investMessage = `일반법원 기준으로 투자 손실금(${(investLoss / 10000).toLocaleString()}만원)이 청산가치에 전액 반영되었습니다. 전문법원 관할이면 변제금이 더 낮아질 수 있습니다.`;
        }

        // 생계비 내역
        let livingCostBreakdown = `기본 ${calcFamilyCount}인 가구: ${baseLivingCost.toLocaleString()}원`;
        if (addHousingCost > 0) livingCostBreakdown += `\n+ 추가 주거비: ${addHousingCost.toLocaleString()}원`;
        if (addMedCost > 0) livingCostBreakdown += `\n+ 추가 의료비: ${addMedCost.toLocaleString()}원`;
        if (addEduCost > 0) livingCostBreakdown += `\n+ 추가 교육비: ${addEduCost.toLocaleString()}원`;
        livingCostBreakdown += `\n= 총 인정 생계비: ${Math.round(finalLivingCost).toLocaleString()}원`;

        const resultsHTML = `
            <h3 style="text-align:center; margin-bottom: 2rem;">AI 정밀 진단 결과</h3>
            <div class="result-grid">
                <div class="result-item"><h4>관할 법원</h4><p style="font-size:1.2rem;">${jurisdictionLabel}</p></div>
                <div class="result-item"><h4>예상 월 변제금</h4><p>${Math.round(monthlyPayment).toLocaleString()}원</p></div>
                <div class="result-item"><h4>예상 변제 기간</h4><p>${duration}개월${duration === 24 ? ' (단축 특례)' : ''}</p></div>
                <div class="result-item full-width"><h4>예상 총 탕감액 (원금 기준)</h4><p id="result-write-off">약 ${Math.round(debtReliefAmount).toLocaleString()}원 (${reliefRate.toFixed(1)}%)</p></div>
                ${duration === 24 ? `<div class="result-item highlight"><h4>24개월 단축 특례 적용</h4><p>사유: ${shortReasons.join(', ')}</p></div>` : ''}
                ${investMessage ? `<div class="result-item highlight"><h4>투자 손실 분석</h4><p>${investMessage}</p></div>` : ''}
                <div class="result-item full-width"><h4>인정 생계비 내역</h4><p style="font-size:1rem; text-align:left;">${livingCostBreakdown}</p></div>
                <div class="result-item full-width"><h4>청산가치 (재산가치)</h4><p style="font-size:1.2rem;">${Math.round(liquidationValue).toLocaleString()}원${!isSpecializedCourt && spouseAssets > 0 ? ' (배우자 재산 50% 포함)' : ''}</p></div>
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
        this.shadowRoot.querySelector('#recommend-btn').addEventListener('click', () => {
            if (window.__trackEvent) window.__trackEvent('lawyer_click');
        });

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
        event.preventDefault();
        const questionMap = {
            location: "Q1. 거주지",
            min_debt: "Q2. 총 채무 1천만원 이상 여부",
            age: "Q3. 만 나이",
            income_source: "Q4. 소득 형태",
            total_debt: "Q5. 총 채무액 (만원)",
            my_assets: "Q6. 본인 재산 (만원)",
            spouse_assets: "Q7. 배우자 재산 (만원)",
            invest_loss: "Q8. 투자 손실액 (만원)",
            gambling_loss: "Q9. 도박 손실액 (만원)",
            monthly_income: "Q10. 월 소득 (원)",
            spouse_dependent: "Q11-1. 배우자 부양",
            minor_children: "Q11-2. 미성년 자녀 수",
            adult_dependent_children: "Q11-3. 성년 부양 자녀 수",
            elderly_parents: "Q11-4. 부양 노부모 수",
            housing_cost: "Q12-1. 주거비 (원/월)",
            medical_expense: "Q12-2. 의료비 (원/월)",
            education_expense: "Q12-3. 교육비 (원/월)",
            is_special_victim: "Q13. 전세사기/중증장애",
            result_monthly_repayment: "예상 월 변제금",
            result_repayment_period: "예상 변제 기간",
            result_total_write_off: "예상 총 탕감액",
            result_write_off_rate: "예상 탕감률",
            result_jurisdiction: "관할 법원",
            result_is_24month: "24개월 단축 여부",
            result_applied_living_cost: "적용 생계비",
            result_liquidation_value: "청산가치",
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

        try {
            const simulationAnswers = {};
            const simulationResults = {};

            for (const key in this.formData) {
                if (key.startsWith('result_')) {
                    simulationResults[questionMap[key] || key] = this.formData[key];
                } else {
                    simulationAnswers[questionMap[key] || key] = this.formData[key];
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
            const docRef = await addDoc(collection(db, "consultations"), consultationData);
            console.log("Document written with ID: ", docRef.id);
            if (window.__trackEvent) window.__trackEvent('consultation_submit');
            alert(`${name}님, 상담 신청이 완료되었습니다. 곧 연락드리겠습니다.`);
        } catch (e) {
            console.error("Error adding document: ", e);
            alert(`상담 신청 중 오류가 발생했습니다. 다시 시도해주세요. 오류: ${e.message}`);
        }
    }
}

customElements.define('simulation-form', SimulationForm);
