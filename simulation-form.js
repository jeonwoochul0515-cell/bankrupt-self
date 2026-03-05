
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
    MIN_WAGE_PROTECT: 2500000
};

const SPECIALIZED_COURTS = ["BUSAN", "SEOUL", "SUWON"];

const STEP_MESSAGES = [
    { counter: "", message: "" },
    { counter: "1 / 6", message: "새로운 시작을 위한 첫 걸음입니다." },
    { counter: "2 / 6", message: "잘 하고 계십니다!" },
    { counter: "3 / 6", message: "절반을 지났습니다!" },
    { counter: "4 / 6", message: "핵심 정보를 입력하고 있습니다." },
    { counter: "5 / 6", message: "거의 다 왔습니다!" },
    { counter: "6 / 6", message: "마지막 단계입니다!" },
    { counter: "", message: "" }
];

class SimulationForm extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.currentStep = 0;
        this.totalSteps = 8; // 0: welcome, 1~6: questions, 7: results
        this.formData = JSON.parse(localStorage.getItem('formData')) || {};
        this.render();
    }

    render() {
        const style = `
            :host { display: block; width: 100%; max-width: 800px; margin: 0 auto; font-family: 'Pretendard', sans-serif; }
            .simulation-form-wrapper { background-color: #fff; border-radius: 16px; padding: 2.5rem; box-shadow: 0 10px 40px rgba(0,0,0,0.08); position: relative; }
            #progress-bar-container { width: 100%; background-color: #e9ecef; border-radius: 10px; margin-bottom: 0.75rem; height: 14px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1); }
            #progress-bar { width: 0; height: 100%; background: linear-gradient(90deg, #1A3A6D, #137fec); transition: width 0.4s ease-in-out; border-radius: 10px; }
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
            .input-group { display: flex; flex-wrap: nowrap; align-items: center; border: 2px solid #dee2e6; border-radius: 8px; padding-right: 1rem; transition: border-color 0.3s; margin-bottom: 1rem; }
            .input-group:focus-within { border-color: #1A3A6D; }
            input[type="number"], input[type="text"] { flex: 1; min-width: 0; padding: 1rem; border: none; border-radius: 8px; font-size: 1.1rem; outline: none; }
            .input-group span { color: #868e96; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
            /* Trust signals */
            .trust-signals { display: flex; flex-direction: column; gap: 1rem; margin: 1.5rem 0; }
            .trust-item { display: flex; align-items: flex-start; gap: 1rem; padding: 1rem 1.2rem; background: #f8f9fa; border-radius: 10px; border: 1px solid #e9ecef; }
            .trust-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 700; color: white; flex-shrink: 0; }
            .trust-icon.shield { background: linear-gradient(135deg, #1A3A6D, #2a5298); }
            .trust-icon.free { background: linear-gradient(135deg, #00b894, #55efc4); color: #065f46; }
            .trust-icon.choice { background: linear-gradient(135deg, #6c5ce7, #a29bfe); }
            .trust-title { font-weight: 700; font-size: 0.95rem; color: #343a40; margin: 0 0 0.25rem; }
            .trust-desc { font-size: 0.85rem; color: #6c757d; margin: 0; line-height: 1.5; }
            /* Shortening check */
            .shortening-box { background: #f0f7ff; border: 1px solid #d0e3ff; border-radius: 12px; padding: 1.2rem; margin-bottom: 1.5rem; }
            .shortening-title { font-weight: 700; font-size: 0.95rem; color: #1A3A6D; margin: 0 0 0.75rem; }
            .shortening-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; font-size: 0.9rem; color: #495057; }
            .check-icon { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 700; flex-shrink: 0; }
            .check-yes { background: #22c55e; color: white; }
            .check-no { background: #e9ecef; color: #adb5bd; }
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
            .consultation-form { margin-top: 2.5rem; padding: 2rem; border: 2px solid #1A3A6D; border-radius: 12px; background: #f0f4ff; }
            .consultation-form h4 { margin: 0 0 0.5rem; font-size: 1.1rem; font-weight: 700; color: #1A3A6D; }
            .consultation-form .form-desc { font-size: 0.9rem; color: #6c757d; margin-bottom: 1.5rem; }
            .privacy-policy { margin: 1rem 0; font-size: 0.9rem; color: #6c757d; }
            .privacy-policy-link { text-decoration: underline; cursor: pointer; color: #1A3A6D; }
            .result-actions { margin-top: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
            .action-btn { padding: 1rem; border-radius: 8px; font-size: 1.1rem; font-weight: 600; text-align: center; text-decoration: none; cursor: pointer; transition: all 0.3s; }
            #submit-consultation-btn { background-color: #137fec; color: white; border: none; box-shadow: 0 4px 15px rgba(19, 127, 236, 0.3); }
            #submit-consultation-btn:hover { background-color: #0e5eb0; }
            #submit-consultation-btn:disabled { background-color: #adb5bd; cursor: not-allowed; box-shadow: none; }
            #delete-data-btn { background-color: #f6f7f8; color: #6c757d; border: 1px solid #dee2e6; }
            #delete-data-btn:hover { background-color: #e9ecef; }
            /* Modal Styles */
            .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: none; align-items: center; justify-content: center; z-index: 1000; }
            .modal-content { background: white; padding: 2rem; border-radius: 12px; max-width: 600px; max-height: 80vh; overflow-y: auto; position: relative; }
            .close-btn { position: absolute; top: 1rem; right: 1rem; font-size: 1.5rem; cursor: pointer; border: none; background: none; color: #868e96; }
            /* Step Info */
            .step-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; padding: 0 0.25rem; }
            .step-counter { font-size: 0.85rem; font-weight: 600; color: #1A3A6D; }
            .step-message { font-size: 0.85rem; color: #137fec; font-weight: 500; }
            /* Immunity Section */
            .immunity-section { margin-top: 1rem; padding: 1rem 1.2rem; background: #f0f7ff; border-radius: 12px; border: 1px solid #d0e3ff; }
            .immunity-item { margin-bottom: 0.75rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e0edff; }
            .immunity-item:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
            .immunity-q { font-weight: 600; color: #495057; font-size: 0.9rem; margin: 0 0 0.25rem; }
            .immunity-a { color: #137fec; font-size: 0.85rem; margin: 0; line-height: 1.5; }
            /* Commitment Section */
            .commitment-section { margin-top: 1.5rem; padding: 1.5rem; background: linear-gradient(135deg, #f0f4ff, #e8f1ff); border-radius: 12px; border: 1px solid #c5d9f8; text-align: center; }
            .commitment-section h4 { margin: 0 0 0.75rem; font-size: 1.1rem; color: #1A3A6D; font-weight: 700; }
            .commitment-section p { font-size: 0.9rem; color: #495057; margin: 0.5rem 0; line-height: 1.6; }
            .commitment-section .highlight-text { font-weight: 700; color: #1A3A6D; font-size: 1rem; }
            /* Consultation success */
            .consultation-complete { padding: 2rem; text-align: center; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; }
            .consultation-complete h4 { margin: 0 0 0.5rem; font-size: 1.2rem; color: #166534; font-weight: 700; }
            .consultation-complete p { margin: 0; font-size: 0.95rem; color: #15803d; }
            .complete-check { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: #22c55e; color: white; font-size: 24px; font-weight: bold; margin-bottom: 0.75rem; }
            /* Delete section */
            .delete-section { margin-top: 1rem; padding: 1.5rem; border: 1px solid #e9ecef; border-radius: 12px; background: #fff; }
        `;

        const template = `
            <div class="simulation-form-wrapper">
                <div id="progress-bar-container"><div id="progress-bar"></div></div>
                <div id="step-info" class="step-info" style="display:none;"><span id="step-counter" class="step-counter"></span><span id="step-message" class="step-message"></span></div>
                <form id="simulation-steps">
                    <!-- Step 0: Welcome (trust signals) -->
                    <div class="form-step active" data-step="0">
                        <h3 style="text-align:center; margin-bottom: 0.5rem;">무료 자가진단</h3>
                        <p class="question-desc" style="text-align:center; margin-bottom: 1.5rem;">1분이면 내 예상 변제금과 탕감률을 확인할 수 있습니다.</p>
                        <div class="trust-signals">
                            <div class="trust-item">
                                <div class="trust-icon shield">P</div>
                                <div>
                                    <p class="trust-title">개인정보 입력 없이 바로 진단</p>
                                    <p class="trust-desc">이름/연락처 없이 결과를 먼저 확인하세요. 상담 신청은 결과 확인 후 원할 때만 선택할 수 있습니다.</p>
                                </div>
                            </div>
                            <div class="trust-item">
                                <div class="trust-icon free">0</div>
                                <div>
                                    <p class="trust-title">완전 무료, 비용 부담 제로</p>
                                    <p class="trust-desc">자가진단 비용은 없습니다. 전문가 상담도 완전 무료입니다.</p>
                                </div>
                            </div>
                            <div class="trust-item">
                                <div class="trust-icon choice">V</div>
                                <div>
                                    <p class="trust-title">영업 전화 없음</p>
                                    <p class="trust-desc">먼저 연락드리지 않습니다. 상담을 원하실 때만 직접 신청하시면 됩니다.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Step 1: Location + Min Debt -->
                    <div class="form-step" data-step="1">
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

                    <!-- Step 2: Age + Income Type + Monthly Income -->
                    <div class="form-step" data-step="2">
                        <p class="question-title">Q3. 만 나이를 입력해주세요.</p>
                        <p class="question-desc">만 30세 미만 또는 만 65세 이상은 변제 기간 단축(24개월) 특례가 적용될 수 있습니다.</p>
                        <div class="input-group"><input type="number" data-question="age" placeholder="35"><span>세</span></div>
                        <p class="question-title">Q4. 소득 형태가 어떻게 되시나요?</p>
                        <div class="option-group" data-question="income_source">
                            <button type="button" class="option-btn" data-value="salary">급여소득자</button>
                            <button type="button" class="option-btn" data-value="business">영업소득자</button>
                            <button type="button" class="option-btn" data-value="none">무소득</button>
                        </div>
                        <p class="question-title">Q5. 월 평균 소득(세후)은 얼마인가요?</p>
                        <div class="input-group"><input type="number" data-question="monthly_income" placeholder="3000000"><span>원</span></div>
                    </div>

                    <!-- Step 3: Debt + Assets -->
                    <div class="form-step" data-step="3">
                        <p class="question-title">Q6. 총 채무액은 얼마인가요?</p>
                        <div class="input-group"><input type="number" data-question="total_debt" placeholder="10000"><span>만원</span></div>
                        <p class="question-title">Q7. 본인 명의 총 재산가치는 얼마인가요?</p>
                        <p class="question-desc">부동산, 차량, 보험해약환급금, 예금 등 합산</p>
                        <div class="input-group"><input type="number" data-question="my_assets" placeholder="5000"><span>만원</span></div>
                    </div>

                    <!-- Step 4: Dependents + Housing -->
                    <div class="form-step" data-step="4">
                        <p class="question-title">Q8. 부양가족 구성을 알려주세요.</p>
                        <p class="question-desc">본인은 자동으로 포함됩니다. 해당 없으면 0을 입력해주세요.</p>
                        <p class="question-title" style="font-size:1.1rem;">배우자 (부양 대상)</p>
                        <div class="option-group" data-question="spouse_dependent">
                            <button type="button" class="option-btn" data-value="yes">있음</button>
                            <button type="button" class="option-btn" data-value="no">없음</button>
                        </div>
                        <p class="question-title" style="font-size:1.1rem;">미성년 자녀 수</p>
                        <div class="input-group"><input type="number" data-question="minor_children" placeholder="0" value="0"><span>명</span></div>
                        <p class="question-title" style="font-size:1.1rem;">부양 노부모 수</p>
                        <div class="input-group"><input type="number" data-question="elderly_parents" placeholder="0" value="0"><span>명</span></div>
                        <p class="question-title">Q9. 월세 + 주택담보대출 이자는 얼마인가요?</p>
                        <p class="question-desc">해당 없으면 0을 입력해주세요. 지역별 한도 내에서 생계비에 추가 인정됩니다.</p>
                        <div class="input-group"><input type="number" data-question="housing_cost" placeholder="0"><span>원/월</span></div>
                    </div>

                    <!-- Step 5: Spouse Assets + Losses -->
                    <div class="form-step" data-step="5">
                        <p class="question-title">Q10. 배우자 명의 재산이 있나요?</p>
                        <p class="question-desc">전문법원(부산/서울/수원)은 배우자 재산 미반영, 일반법원은 50% 반영됩니다.</p>
                        <div class="input-group"><input type="number" data-question="spouse_assets" placeholder="0"><span>만원</span></div>
                        <p class="question-title">Q11. 주식/코인 투자 손실액이 있나요?</p>
                        <p class="question-desc">전문법원(부산/서울/수원)은 투자 손실을 청산가치에서 제외합니다.</p>
                        <div class="input-group"><input type="number" data-question="invest_loss" placeholder="0"><span>만원</span></div>
                        <p class="question-title">Q12. 도박 등으로 인한 손실액이 있나요?</p>
                        <p class="question-desc">도박 손실은 모든 법원에서 청산가치에 반영됩니다.</p>
                        <div class="input-group"><input type="number" data-question="gambling_loss" placeholder="0"><span>만원</span></div>
                    </div>

                    <!-- Step 6: 24-month Shortening Check -->
                    <div class="form-step" data-step="6">
                        <p class="question-title">Q13. 변제기간 단축 특례 확인</p>
                        <p class="question-desc">아래 항목에 해당하면 변제기간이 36개월에서 24개월로 단축될 수 있습니다. (전문법원 관할 시)</p>
                        <div class="shortening-box">
                            <p class="shortening-title">이전 답변 기준 자동 확인</p>
                            <div class="shortening-item" id="check-youth">
                                <span class="check-icon check-no" id="icon-youth">-</span>
                                <span>만 30세 미만 청년</span>
                            </div>
                            <div class="shortening-item" id="check-senior">
                                <span class="check-icon check-no" id="icon-senior">-</span>
                                <span>만 65세 이상 고령자</span>
                            </div>
                            <div class="shortening-item" id="check-multi-child">
                                <span class="check-icon check-no" id="icon-multi-child">-</span>
                                <span>미성년 자녀 2명 이상 (다자녀)</span>
                            </div>
                        </div>
                        <p class="question-title" style="font-size:1.1rem;">추가로 해당하는 항목이 있나요?</p>
                        <p class="question-desc">해당 없으면 "해당 없음"을 선택해주세요.</p>
                        <div class="option-group" data-question="special_case">
                            <button type="button" class="option-btn" data-value="single_parent">한부모가족</button>
                            <button type="button" class="option-btn" data-value="lease_fraud">전세사기 피해자</button>
                            <button type="button" class="option-btn" data-value="severe_disability">중증장애인</button>
                            <button type="button" class="option-btn" data-value="none">해당 없음</button>
                        </div>
                    </div>

                    <!-- Step 7: Results -->
                    <div class="form-step" data-step="7" id="result-step"></div>

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
            // Step 1 validation
            if (this.currentStep === 1) {
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

            const lastQuestionStep = this.totalSteps - 2; // step 6
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

        // Zeigarnik effect: warn on page close during form
        this._beforeUnloadHandler = (e) => {
            if (this.currentStep > 0 && this.currentStep < this.totalSteps - 1) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', this._beforeUnloadHandler);

        // Modal close handlers
        const modal = this.shadowRoot.querySelector('#privacy-modal');
        this.shadowRoot.querySelector('#close-modal-btn').addEventListener('click', () => modal.style.display = 'none');
        modal.addEventListener('click', (e) => { if (e.target === modal) { modal.style.display = 'none'; } });
    }

    updateFormView() {
        this.shadowRoot.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
        const currentStepEl = this.shadowRoot.querySelector(`.form-step[data-step="${this.currentStep}"]`);
        if (currentStepEl) currentStepEl.classList.add('active');

        const progress = (this.currentStep / (this.totalSteps - 1)) * 100;
        this.shadowRoot.querySelector('#progress-bar').style.width = `${progress}%`;

        const stepInfo = STEP_MESSAGES[this.currentStep] || { counter: "", message: "" };
        const stepInfoEl = this.shadowRoot.querySelector('#step-info');
        const counterEl = this.shadowRoot.querySelector('#step-counter');
        const messageEl = this.shadowRoot.querySelector('#step-message');
        if (counterEl) counterEl.textContent = stepInfo.counter;
        if (messageEl) messageEl.textContent = stepInfo.message;
        if (stepInfoEl) stepInfoEl.style.display = (this.currentStep === 0 || this.currentStep === this.totalSteps - 1) ? 'none' : 'flex';

        this.shadowRoot.querySelector('#prev-btn').style.display = (this.currentStep === 0 || this.currentStep === this.totalSteps - 1) ? 'none' : 'inline-block';
        this.shadowRoot.querySelector('#next-btn').textContent = this.currentStep === 0 ? '진단 시작하기' : (this.currentStep === this.totalSteps - 2 ? '결과 보기' : '다음');
        this.shadowRoot.querySelector('#next-btn').style.display = this.currentStep === this.totalSteps - 1 ? 'none' : 'inline-block';

        // Step 6: update shortening check icons
        if (this.currentStep === 6) {
            this.updateShorteningCheck();
        }
    }

    updateShorteningCheck() {
        const age = parseInt(this.formData.age) || 0;
        const minorChildren = parseInt(this.formData.minor_children) || 0;

        const setIcon = (id, condition) => {
            const icon = this.shadowRoot.querySelector(`#icon-${id}`);
            if (icon) {
                icon.className = condition ? 'check-icon check-yes' : 'check-icon check-no';
                icon.textContent = condition ? 'O' : '-';
            }
        };

        setIcon('youth', age > 0 && age < 30);
        setIcon('senior', age >= 65);
        setIcon('multi-child', minorChildren >= 2);
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
        const location = this.formData.location || "OTHER";
        const age = parseInt(this.formData.age) || 0;
        const income = parseFloat(this.formData.monthly_income) || 0;
        const totalDebt = (parseFloat(this.formData.total_debt) || 0) * 10000;
        const myAssets = (parseFloat(this.formData.my_assets) || 0) * 10000;
        const spouseAssets = (parseFloat(this.formData.spouse_assets) || 0) * 10000;
        const investLoss = (parseFloat(this.formData.invest_loss) || 0) * 10000;
        const gamblingLoss = (parseFloat(this.formData.gambling_loss) || 0) * 10000;
        const housingCost = parseFloat(this.formData.housing_cost) || 0;
        const minorChildren = parseInt(this.formData.minor_children) || 0;
        const elderlyParents = parseInt(this.formData.elderly_parents) || 0;
        const spouseDependent = this.formData.spouse_dependent === 'yes';
        const specialCase = this.formData.special_case || 'none';

        // 무소득 체크
        if (this.formData.income_source === 'none') {
            this.displayResult("신청 어려움", "안정적인 소득이 없어 개인회생 신청이 어렵습니다. 파산 면책 절차를 검토해보시거나 전문가와 상담하세요.");
            return;
        }

        // 부양가족 수 산정
        let familyCount = 1;
        if (spouseDependent) familyCount += 1;
        familyCount += minorChildren;
        familyCount += elderlyParents;
        const calcFamilyCount = Math.min(familyCount, 6);

        // 관할 법원 성향
        const isSpecializedCourt = SPECIALIZED_COURTS.includes(location);
        const isBusan = location === "BUSAN";

        // 청산가치 산정
        let liquidationValue = myAssets;
        if (!isSpecializedCourt && spouseAssets > 0) {
            liquidationValue += (spouseAssets * 0.5);
        }
        if (!isSpecializedCourt && investLoss > 0) {
            liquidationValue += investLoss;
        }
        if (gamblingLoss > 0) {
            liquidationValue += gamblingLoss;
        }

        // 가용소득 산출
        const baseLivingCost = CONSTANTS.LIVING_COST_2026[calcFamilyCount] || CONSTANTS.LIVING_COST_2026[1];

        let addHousingCost = 0;
        if (housingCost > 0) {
            const limit = CONSTANTS.HOUSING_LIMIT[location] || CONSTANTS.HOUSING_LIMIT["OTHER"];
            addHousingCost = Math.min(housingCost, limit);
        }

        const finalLivingCost = baseLivingCost + addHousingCost;
        let monthlyPayment = Math.max(0, income - finalLivingCost);

        // 가용소득 0 이하
        if (monthlyPayment <= 0) {
            this.formData.result_monthly_repayment = 0;
            this.formData.result_repayment_period = 0;
            this.formData.result_total_write_off = totalDebt;
            this.formData.result_write_off_rate = '100.0';
            this.displayResult("면제 가능성 높음", `월 소득(${income.toLocaleString()}원)이 ${calcFamilyCount}인 가구 인정 생계비(${Math.round(finalLivingCost).toLocaleString()}원)보다 적어, 월 변제금이 발생하지 않거나 매우 적을 수 있습니다. 전문가 상담이 필수적입니다.`);
            return;
        }

        // 변제 기간 산정
        let duration = 36;
        const isYouth = age > 0 && age < 30;
        const isSenior = age >= 65;
        const isMultiChild = minorChildren >= 2;
        const isSpecialCase = specialCase !== 'none';

        if (isSpecializedCourt && (isYouth || isSenior || isMultiChild || isSpecialCase)) {
            duration = 24;
        }

        // 청산가치 보장 원칙
        let totalPaymentIncomeBased = monthlyPayment * duration;
        if (totalPaymentIncomeBased < liquidationValue) {
            monthlyPayment = Math.ceil(liquidationValue / duration);
            if (monthlyPayment > (income - CONSTANTS.LIVING_COST_2026[1])) {
                duration = 60;
                monthlyPayment = Math.ceil(liquidationValue / 60);
            }
        }

        if (monthlyPayment > income) {
            this.displayResult("신청 어려움", "재산 가치가 높아 소득 내에서 변제가 불가능합니다. 파산 면책 또는 전문가 상담을 권유합니다.");
            return;
        }

        // 결과 계산
        const totalPayment = monthlyPayment * duration;
        const debtReliefAmount = Math.max(0, totalDebt - totalPayment);
        const reliefRate = totalDebt > 0 ? (debtReliefAmount / totalDebt) * 100 : 0;

        this.formData.result_monthly_repayment = Math.round(monthlyPayment);
        this.formData.result_repayment_period = duration;
        this.formData.result_total_write_off = Math.round(debtReliefAmount);
        this.formData.result_write_off_rate = reliefRate.toFixed(1);
        this.formData.result_jurisdiction = isBusan ? "부산회생법원 (2026 특례 적용)" : (isSpecializedCourt ? "회생전문법원" : "일반지방법원");
        this.formData.result_is_24month = duration === 24;
        this.formData.result_applied_living_cost = Math.round(finalLivingCost);
        this.formData.result_liquidation_value = Math.round(liquidationValue);

        const jurisdictionLabel = this.formData.result_jurisdiction;

        // 24개월 단축 사유
        let shortReasons = [];
        if (isYouth) shortReasons.push("만 30세 미만 청년");
        if (isSenior) shortReasons.push("만 65세 이상 고령자");
        if (isMultiChild) shortReasons.push("다자녀 가구(미성년 2명 이상)");
        if (specialCase === 'single_parent') shortReasons.push("한부모가족");
        if (specialCase === 'lease_fraud') shortReasons.push("전세사기 피해자");
        if (specialCase === 'severe_disability') shortReasons.push("중증장애인");

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
        livingCostBreakdown += `\n= 총 인정 생계비: ${Math.round(finalLivingCost).toLocaleString()}원`;

        const resultsHTML = `
            <h3 style="text-align:center; margin-bottom: 2rem;">진단 결과</h3>
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
            <div class="commitment-section">
                <h4>2026년, 개인회생의 최적 시기입니다</h4>
                <p>기준 중위소득 <strong>역대 최대 6.51% 인상</strong>으로 변제금이 크게 줄었습니다.</p>
                <p>급여 압류금지 최저금액 <strong>250만원 인상</strong>, 생계비 전용계좌 신설 등 채무자 보호가 강화되었습니다.</p>
                <p class="highlight-text" style="margin-top:1rem;">일찍 시작하면 일찍 끝납니다.<br>지금 시작하면 3년 후, 모든 빚에서 자유로워질 수 있습니다.</p>
            </div>
            <div class="consultation-form" id="consultation-form-section">
                <h4>전문가 무료 상담 신청 (선택)</h4>
                <p class="form-desc">상담을 원하시면 아래 정보를 입력해주세요. 입력하지 않아도 진단 결과는 유지됩니다.</p>
                <p class="question-title" style="font-size:1rem; margin-top:0;">이름</p>
                <div class="input-group"><input type="text" id="consult_name" placeholder="이름을 입력해주세요"></div>
                <p class="question-title" style="font-size:1rem;">연락처</p>
                <div class="input-group"><input type="text" id="consult_phone" placeholder="연락처 ('-' 없이)"></div>
                <div class="privacy-policy" style="padding: 0.75rem; background: #e8f1ff; border-radius: 8px;">
                    <label><input type="checkbox" id="privacy-agree"> <span class="privacy-policy-link" id="privacy-policy-link">개인정보처리방침</span>에 동의합니다.</label>
                </div>
                <div class="immunity-section">
                    <div class="immunity-item">
                        <p class="immunity-q">Q. 상담 비용이 부담되지 않을까?</p>
                        <p class="immunity-a">자가진단 완료 시 수임료 20만원 할인 + 분할 납부가 가능합니다.</p>
                    </div>
                    <div class="immunity-item">
                        <p class="immunity-q">Q. 개인정보가 안전할까?</p>
                        <p class="immunity-a">모든 정보는 암호화되어 안전하게 보호되며, 아래 버튼으로 언제든 삭제할 수 있습니다.</p>
                    </div>
                    <div class="immunity-item">
                        <p class="immunity-q">Q. 상담이 정말 도움이 될까?</p>
                        <p class="immunity-a">법원 실무준칙 기반의 진단 결과를 전문가가 직접 검토하고, 최적의 방향을 안내해드립니다.</p>
                    </div>
                </div>
                <div class="result-actions">
                    <button id="submit-consultation-btn" class="action-btn">무료 상담 신청하기</button>
                </div>
            </div>
            <div class="delete-section">
                <div class="result-actions">
                    <button id="delete-data-btn" class="action-btn">모든 내 정보 삭제하기</button>
                </div>
            </div>
        `;
        resultStep.innerHTML = finalHtml;

        // Restore submitted state if already submitted
        if (localStorage.getItem('consultation_submitted')) {
            this._showSubmittedState();
        }

        // Pre-fill if data exists
        if (this.formData.user_name) {
            const nameInput = this.shadowRoot.querySelector('#consult_name');
            if (nameInput) nameInput.value = this.formData.user_name;
        }
        if (this.formData.user_phone) {
            const phoneInput = this.shadowRoot.querySelector('#consult_phone');
            if (phoneInput) phoneInput.value = this.formData.user_phone;
        }

        // Event listeners
        this.shadowRoot.querySelector('#delete-data-btn').addEventListener('click', () => this.deleteData());
        this.shadowRoot.querySelector('#submit-consultation-btn')?.addEventListener('click', () => this.submitConsultation());

        const privacyLink = this.shadowRoot.querySelector('#privacy-policy-link');
        if (privacyLink) {
            privacyLink.addEventListener('click', () => this.loadPrivacyPolicy());
        }
    }

    async submitConsultation() {
        const name = this.shadowRoot.querySelector('#consult_name').value.trim();
        const phone = this.shadowRoot.querySelector('#consult_phone').value.trim();
        const agree = this.shadowRoot.querySelector('#privacy-agree').checked;

        if (!name || !phone) {
            alert('이름과 연락처를 모두 입력해주세요.');
            return;
        }
        if (!agree) {
            alert('개인정보처리방침에 동의해주세요.');
            return;
        }
        if (this._submitted || localStorage.getItem('consultation_submitted')) {
            return;
        }

        const submitBtn = this.shadowRoot.querySelector('#submit-consultation-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '전송 중...';

        try {
            this.formData.user_name = name;
            this.formData.user_phone = phone;
            this.saveToLocalStorage();

            const questionMap = this._getQuestionMap();
            const simulationAnswers = {};
            const simulationResults = {};

            for (const key in this.formData) {
                if (key === 'user_name' || key === 'user_phone') continue;
                if (key.startsWith('result_')) {
                    simulationResults[questionMap[key] || key] = this.formData[key];
                } else {
                    simulationAnswers[questionMap[key] || key] = this.formData[key];
                }
            }

            const consultationData = {
                requesterInfo: { name, phone },
                simulationAnswers,
                simulationResults,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, "consultations"), consultationData);
            this._submitted = true;
            localStorage.setItem('consultation_submitted', 'true');
            if (window.__trackEvent) window.__trackEvent('consultation_submit');

            this._showSubmittedState();
        } catch (e) {
            console.error("Submit error:", e);
            submitBtn.disabled = false;
            submitBtn.textContent = '무료 상담 신청하기';
            alert('전송 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
    }

    _showSubmittedState() {
        const formSection = this.shadowRoot.querySelector('#consultation-form-section');
        if (formSection) {
            const name = this.formData.user_name || '';
            formSection.innerHTML = `
                <div class="consultation-complete">
                    <div class="complete-check">&#10003;</div>
                    <h4>상담 신청이 완료되었습니다</h4>
                    <p>${name}님의 연락처로 전문가가 곧 연락드리겠습니다.</p>
                </div>
            `;
        }
    }

    async loadPrivacyPolicy() {
        const modal = this.shadowRoot.querySelector('#privacy-modal');
        const contentDiv = this.shadowRoot.querySelector('#privacy-content');
        try {
            const response = await fetch('privacy.html');
            if (!response.ok) throw new Error('Privacy policy could not be loaded.');
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
        localStorage.removeItem('consultation_submitted');
        this._submitted = false;
        this.formData = {};
        alert('모든 정보가 삭제되었습니다.');
        this.currentStep = 0;
        this.render();
        this.connectedCallback();
    }

    _getQuestionMap() {
        return {
            location: "Q1. 거주지",
            min_debt: "Q2. 총 채무 1천만원 이상 여부",
            age: "Q3. 만 나이",
            income_source: "Q4. 소득 형태",
            monthly_income: "Q5. 월 소득 (원)",
            total_debt: "Q6. 총 채무액 (만원)",
            my_assets: "Q7. 본인 재산 (만원)",
            spouse_dependent: "Q8. 배우자 부양",
            minor_children: "Q8. 미성년 자녀 수",
            elderly_parents: "Q8. 부양 노부모 수",
            housing_cost: "Q9. 주거비 (원/월)",
            spouse_assets: "Q10. 배우자 재산 (만원)",
            invest_loss: "Q11. 투자 손실액 (만원)",
            gambling_loss: "Q12. 도박 손실액 (만원)",
            special_case: "Q13. 단축 특례 해당 사항",
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
    }
}

customElements.define('simulation-form', SimulationForm);
