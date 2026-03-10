// doc-generators.js
// 개인회생 신청 서류 DOCX 생성 모듈

const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle, PageBreak, Header, Footer, PageNumber, NumberFormat } = docx;

// ========== 공통 스타일 ==========
const FONT = '맑은 고딕';
const FONT_SIZE = 20; // half-points (10pt)

function createParagraph(text, options = {}) {
    return new Paragraph({
        children: [new TextRun({ text, font: FONT, size: options.size || FONT_SIZE, bold: options.bold || false })],
        alignment: options.align || AlignmentType.LEFT,
        spacing: { after: options.afterSpacing || 120 },
        ...(options.heading ? { heading: options.heading } : {}),
    });
}

function createTitle(text) {
    return new Paragraph({
        children: [new TextRun({ text, font: FONT, size: 32, bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300, before: 200 },
    });
}

// ========== 1. 개인회생 신청서 ==========
export function generateApplication(caseData) {
    const doc = new Document({
        sections: [{
            properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
            children: [
                createTitle('개인회생절차 개시신청서'),
                createParagraph(''),
                // 신청인 정보
                createParagraph('신 청 인', { bold: true, size: 24 }),
                createParagraph(`성    명: ${caseData.clientName || ''}`),
                createParagraph(`주민등록번호: ${caseData.clientIdNumber || ''}`),
                createParagraph(`주    소: ${caseData.clientAddress || ''}`),
                createParagraph(`연 락 처: ${caseData.clientPhone || ''}`),
                createParagraph(`직    업: ${caseData.employmentInfo?.status || ''} ${caseData.employmentInfo?.company ? '(' + caseData.employmentInfo.company + ')' : ''}`),
                createParagraph(''),

                // 채무 개요
                createParagraph('신청 취지', { bold: true, size: 24 }),
                createParagraph('채무자에 대하여 개인회생절차를 개시하여 주시기 바랍니다.'),
                createParagraph(''),

                createParagraph('신청 원인', { bold: true, size: 24 }),
                createParagraph(`1. 채무자의 총 채무액은 ${(caseData.totalDebt || 0).toLocaleString()}원이며, 채무자의 월 평균 소득은 ${(caseData.monthlyIncome || 0).toLocaleString()}원입니다.`),
                createParagraph(`2. 채무자의 월 평균 지출은 ${(caseData.monthlyExpense || 0).toLocaleString()}원이며, 월 가용소득은 ${((caseData.monthlyIncome || 0) - (caseData.monthlyExpense || 0)).toLocaleString()}원입니다.`),
                createParagraph('3. 채무자는 현재 채무를 계속 변제하기 어려운 상태에 있으므로, 개인회생절차의 개시를 신청합니다.'),
                createParagraph(''),

                createParagraph('관할 법원', { bold: true, size: 24 }),
                createParagraph(`${caseData.court || ''}`),
                createParagraph(''),

                createParagraph('첨부 서류', { bold: true, size: 24 }),
                createParagraph('1. 채권자 목록 1부'),
                createParagraph('2. 재산 목록 1부'),
                createParagraph('3. 수입 및 지출에 관한 목록 1부'),
                createParagraph('4. 변제계획안 1부'),
                createParagraph('5. 진술서 1부'),
                createParagraph(''),

                // 날짜 및 서명
                createParagraph(new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }), { align: AlignmentType.CENTER }),
                createParagraph(''),
                createParagraph(`신청인  ${caseData.clientName || ''}  (인)`, { align: AlignmentType.RIGHT }),
                createParagraph(''),
                createParagraph(`${caseData.court || ''} 귀중`, { align: AlignmentType.CENTER, bold: true }),
            ]
        }]
    });
    return doc;
}

// ========== 2. 채권자 목록 ==========
export function generateCreditorList(caseData, debts) {
    const rows = [
        new TableRow({
            tableHeader: true,
            children: ['번호', '채권자명', '채권 유형', '원금', '이자', '연체금', '채권 합계', '담보'].map(text =>
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: 18, bold: true })], alignment: AlignmentType.CENTER })],
                    shading: { fill: 'E8E8E8' },
                })
            ),
        }),
    ];

    let totalPrincipal = 0, totalInterest = 0, totalOverdue = 0, totalAmount = 0;

    debts.forEach((d, i) => {
        totalPrincipal += d.principal || 0;
        totalInterest += d.interest || 0;
        totalOverdue += d.overdue || 0;
        totalAmount += d.totalAmount || 0;

        rows.push(new TableRow({
            children: [
                String(i + 1),
                d.creditorName || '',
                `${d.creditorType || ''} (${d.debtType || ''})`,
                (d.principal || 0).toLocaleString(),
                (d.interest || 0).toLocaleString(),
                (d.overdue || 0).toLocaleString(),
                (d.totalAmount || 0).toLocaleString(),
                d.hasCollateral ? '담보' : '무담보',
            ].map(text =>
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: 18 })], alignment: AlignmentType.CENTER })],
                })
            ),
        }));
    });

    // 합계행
    rows.push(new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '합계', font: FONT, size: 18, bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3 }),
            ...[totalPrincipal, totalInterest, totalOverdue, totalAmount].map(v =>
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v.toLocaleString(), font: FONT, size: 18, bold: true })], alignment: AlignmentType.CENTER })] })
            ),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '', font: FONT, size: 18 })] })] }),
        ],
    }));

    const doc = new Document({
        sections: [{
            properties: { page: { margin: { top: 1440, bottom: 1440, left: 1080, right: 1080 } } },
            children: [
                createTitle('채 권 자 목 록'),
                createParagraph(`채무자: ${caseData.clientName || ''} (${caseData.clientIdNumber || ''})`),
                createParagraph(''),
                new Table({
                    rows,
                    width: { size: 100, type: WidthType.PERCENTAGE },
                }),
                createParagraph(''),
                createParagraph(`총 채권자 수: ${debts.length}명`),
                createParagraph(`총 채무액: ${totalAmount.toLocaleString()}원`),
            ]
        }]
    });
    return doc;
}

// ========== 3. 재산 목록 ==========
export function generateAssetList(caseData, assets) {
    const rows = [
        new TableRow({
            tableHeader: true,
            children: ['번호', '재산 유형', '명칭/상세', '평가액', '담보액', '순가치'].map(text =>
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: 18, bold: true })], alignment: AlignmentType.CENTER })],
                    shading: { fill: 'E8E8E8' },
                })
            ),
        }),
    ];

    let totalValue = 0, totalLien = 0, totalNet = 0;

    assets.forEach((a, i) => {
        const net = (a.appraisedValue || 0) - (a.lienAmount || 0);
        totalValue += a.appraisedValue || 0;
        totalLien += a.lienAmount || 0;
        totalNet += net;

        rows.push(new TableRow({
            children: [
                String(i + 1),
                a.assetType || '',
                `${a.assetName || ''} ${a.detail ? '(' + a.detail + ')' : ''}`,
                (a.appraisedValue || 0).toLocaleString(),
                (a.lienAmount || 0).toLocaleString(),
                net.toLocaleString(),
            ].map(text =>
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: 18 })], alignment: AlignmentType.CENTER })] })
            ),
        }));
    });

    rows.push(new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '합계', font: FONT, size: 18, bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3 }),
            ...[totalValue, totalLien, totalNet].map(v =>
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: v.toLocaleString(), font: FONT, size: 18, bold: true })], alignment: AlignmentType.CENTER })] })
            ),
        ],
    }));

    const doc = new Document({
        sections: [{
            properties: { page: { margin: { top: 1440, bottom: 1440, left: 1080, right: 1080 } } },
            children: [
                createTitle('재 산 목 록'),
                createParagraph(`채무자: ${caseData.clientName || ''} (${caseData.clientIdNumber || ''})`),
                createParagraph(''),
                new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
                createParagraph(''),
                createParagraph(`총 재산 평가액: ${totalValue.toLocaleString()}원`),
                createParagraph(`총 담보 설정액: ${totalLien.toLocaleString()}원`),
                createParagraph(`순 재산액 (청산가치): ${totalNet.toLocaleString()}원`),
            ]
        }]
    });
    return doc;
}

// ========== 4. 수입 및 지출에 관한 목록 ==========
export function generateIncomeExpenseList(caseData, incomes, expenses) {
    // 수입 테이블
    const incomeRows = [
        new TableRow({
            tableHeader: true,
            children: ['번호', '수입 유형', '지급처', '월 금액'].map(text =>
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: 18, bold: true })], alignment: AlignmentType.CENTER })],
                    shading: { fill: 'E8E8E8' },
                })
            ),
        }),
    ];
    let totalIncome = 0;
    incomes.forEach((inc, i) => {
        totalIncome += inc.monthlyAmount || 0;
        incomeRows.push(new TableRow({
            children: [String(i+1), inc.incomeType||'', inc.source||'', (inc.monthlyAmount||0).toLocaleString()+'원'].map(text =>
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: 18 })], alignment: AlignmentType.CENTER })] })
            ),
        }));
    });
    incomeRows.push(new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '월 수입 합계', font: FONT, size: 18, bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 3 }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: totalIncome.toLocaleString()+'원', font: FONT, size: 18, bold: true })], alignment: AlignmentType.CENTER })] }),
        ],
    }));

    // 지출 테이블
    const expenseRows = [
        new TableRow({
            tableHeader: true,
            children: ['번호', '지출 유형', '월 금액'].map(text =>
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: 18, bold: true })], alignment: AlignmentType.CENTER })],
                    shading: { fill: 'E8E8E8' },
                })
            ),
        }),
    ];
    let totalExpense = 0;
    expenses.forEach((exp, i) => {
        totalExpense += exp.monthlyAmount || 0;
        expenseRows.push(new TableRow({
            children: [String(i+1), exp.expenseType||'', (exp.monthlyAmount||0).toLocaleString()+'원'].map(text =>
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: 18 })], alignment: AlignmentType.CENTER })] })
            ),
        }));
    });
    expenseRows.push(new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '월 지출 합계', font: FONT, size: 18, bold: true })], alignment: AlignmentType.CENTER })], columnSpan: 2 }),
            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: totalExpense.toLocaleString()+'원', font: FONT, size: 18, bold: true })], alignment: AlignmentType.CENTER })] }),
        ],
    }));

    const disposable = totalIncome - totalExpense;

    const doc = new Document({
        sections: [{
            properties: { page: { margin: { top: 1440, bottom: 1440, left: 1080, right: 1080 } } },
            children: [
                createTitle('수입 및 지출에 관한 목록'),
                createParagraph(`채무자: ${caseData.clientName || ''} (${caseData.clientIdNumber || ''})`),
                createParagraph(`부양가족 수: ${caseData.familyCount || 0}명 (본인 포함)`),
                createParagraph(''),
                createParagraph('1. 수입 내역', { bold: true, size: 24 }),
                new Table({ rows: incomeRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
                createParagraph(''),
                createParagraph('2. 지출 내역', { bold: true, size: 24 }),
                new Table({ rows: expenseRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
                createParagraph(''),
                createParagraph('3. 가용소득 산정', { bold: true, size: 24 }),
                createParagraph(`월 수입 합계: ${totalIncome.toLocaleString()}원`),
                createParagraph(`월 지출 합계: ${totalExpense.toLocaleString()}원`),
                createParagraph(`월 가용소득: ${disposable.toLocaleString()}원`, { bold: true }),
            ]
        }]
    });
    return doc;
}

// ========== 5. 변제계획안 ==========
export function generateRepaymentPlan(caseData, debts, incomes, expenses) {
    const totalIncome = incomes.reduce((s, i) => s + (i.monthlyAmount || 0), 0);
    const totalExpense = expenses.reduce((s, e) => s + (e.monthlyAmount || 0), 0);
    const disposable = totalIncome - totalExpense;
    const totalDebt = debts.reduce((s, d) => s + (d.totalAmount || 0), 0);

    const period36 = disposable * 36;
    const period60 = disposable * 60;
    const rate36 = totalDebt > 0 ? ((period36 / totalDebt) * 100).toFixed(1) : 0;
    const rate60 = totalDebt > 0 ? ((period60 / totalDebt) * 100).toFixed(1) : 0;

    // 채권자별 배분표
    const distRows = [
        new TableRow({
            tableHeader: true,
            children: ['채권자', '채권액', '비율', '3년 변제금', '5년 변제금'].map(text =>
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: 18, bold: true })], alignment: AlignmentType.CENTER })],
                    shading: { fill: 'E8E8E8' },
                })
            ),
        }),
    ];

    debts.forEach(d => {
        const ratio = totalDebt > 0 ? (d.totalAmount / totalDebt) : 0;
        distRows.push(new TableRow({
            children: [
                d.creditorName || '',
                (d.totalAmount || 0).toLocaleString() + '원',
                (ratio * 100).toFixed(1) + '%',
                Math.round(period36 * ratio).toLocaleString() + '원',
                Math.round(period60 * ratio).toLocaleString() + '원',
            ].map(text =>
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, font: FONT, size: 18 })], alignment: AlignmentType.CENTER })] })
            ),
        }));
    });

    const doc = new Document({
        sections: [{
            properties: { page: { margin: { top: 1440, bottom: 1440, left: 1080, right: 1080 } } },
            children: [
                createTitle('변 제 계 획 안'),
                createParagraph(`채무자: ${caseData.clientName || ''} (${caseData.clientIdNumber || ''})`),
                createParagraph(''),
                createParagraph('1. 변제 기본 사항', { bold: true, size: 24 }),
                createParagraph(`총 채무액: ${totalDebt.toLocaleString()}원`),
                createParagraph(`월 가용소득: ${disposable.toLocaleString()}원`),
                createParagraph(`월 변제금액: ${disposable.toLocaleString()}원`),
                createParagraph(''),
                createParagraph('2. 변제 기간별 계획', { bold: true, size: 24 }),
                createParagraph(`[36개월(3년) 변제 시] 총 변제금: ${period36.toLocaleString()}원 / 변제율: ${rate36}%`),
                createParagraph(`[60개월(5년) 변제 시] 총 변제금: ${period60.toLocaleString()}원 / 변제율: ${rate60}%`),
                createParagraph(''),
                createParagraph('3. 채권자별 변제 배분표', { bold: true, size: 24 }),
                new Table({ rows: distRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
                createParagraph(''),
                createParagraph('4. 청산가치 보장', { bold: true, size: 24 }),
                createParagraph(`총 재산 평가액 (청산가치): ${(caseData.totalAsset || 0).toLocaleString()}원`),
                createParagraph(`총 변제금이 청산가치 이상이므로 청산가치 보장 원칙을 충족합니다.`),
                createParagraph(''),
                createParagraph(new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }), { align: AlignmentType.CENTER }),
                createParagraph(`채무자  ${caseData.clientName || ''}  (인)`, { align: AlignmentType.RIGHT }),
            ]
        }]
    });
    return doc;
}

// ========== 6. 진술서 ==========
export function generateStatement(caseData) {
    const doc = new Document({
        sections: [{
            properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
            children: [
                createTitle('진 술 서'),
                createParagraph(`채무자: ${caseData.clientName || ''}`),
                createParagraph(`주민등록번호: ${caseData.clientIdNumber || ''}`),
                createParagraph(''),
                createParagraph('1. 학력 및 경력', { bold: true, size: 24 }),
                createParagraph('(상세 내용을 기재하여 주십시오)'),
                createParagraph(''),
                createParagraph('2. 혼인 관계', { bold: true, size: 24 }),
                createParagraph(`혼인 여부: ${caseData.familyInfo?.maritalStatus || ''}`),
                createParagraph(`부양가족 수: ${caseData.familyCount || 0}명`),
                createParagraph(''),
                createParagraph('3. 채무 발생 경위', { bold: true, size: 24 }),
                createParagraph('(채무가 발생하게 된 구체적인 경위를 시간순으로 기재하여 주십시오)'),
                createParagraph(''),
                createParagraph('4. 채무 변제를 위한 노력', { bold: true, size: 24 }),
                createParagraph('(채무를 변제하기 위해 기울인 노력을 기재하여 주십시오)'),
                createParagraph(''),
                createParagraph('5. 면책불허가 사유 해당 여부', { bold: true, size: 24 }),
                createParagraph('본인은 도박, 사치, 과소비 등 면책불허가 사유에 해당하지 않음을 진술합니다.'),
                createParagraph(''),
                createParagraph('위 내용은 사실과 다름없음을 진술합니다.', { bold: true }),
                createParagraph(''),
                createParagraph(new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }), { align: AlignmentType.CENTER }),
                createParagraph(`진술인  ${caseData.clientName || ''}  (인)`, { align: AlignmentType.RIGHT }),
            ]
        }]
    });
    return doc;
}

// ========== DOCX 다운로드 유틸 ==========
export async function downloadDocx(document, filename) {
    const blob = await Packer.toBlob(document);
    saveAs(blob, filename);
}

export async function downloadAllAsZip(documents, zipFilename) {
    const zip = new JSZip();
    for (const { doc, filename } of documents) {
        const blob = await Packer.toBlob(doc);
        zip.file(filename, blob);
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, zipFilename);
}
