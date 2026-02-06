
// 1. Google Apps Script 에디터에 이 코드를 복사하여 붙여넣으세요.
// 2. 'YOUR_SPREADSHEET_ID'를 실제 Google Sheet ID로 바꾸세요.
// 3. 상단 메뉴에서 '배포' > '새 배포'를 클릭하세요.
// 4. '설정' 아이콘(톱니바퀴)을 클릭하고 '웹 앱'을 선택하세요.
// 5. 설명(선택사항)을 추가하고, '액세스할 수 있는 사용자'를 '모든 사용자'로 설정하세요.
// 6. '배포' 버튼을 누르세요.
// 7. 표시되는 '웹 앱 URL'을 복사하여 main.js 파일의 'YOUR_APPS_SCRIPT_URL' 부분에 붙여넣으세요.

const SHEET_ID = 'YOUR_SPREADSHEET_ID'; // <-- ⚠️ 여기에 실제 구글 시트 ID를 입력하세요.

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    const data = JSON.parse(e.postData.contents);

    // 헤더가 없으면 추가
    if (sheet.getLastRow() === 0) {
      const headers = [
        "Timestamp", "Name", "Phone", "Region", "Debt Type",
        "Total Debt", "Asset Ratio", "Investment Loss", "Income Source",
        "Monthly Income", "Dependents"
      ];
      sheet.appendRow(headers);
    }

    // 데이터 순서에 맞게 시트에 추가
    const newRow = [
      new Date(), // Timestamp
      data.name,
      data.phone,
      data.region,
      data.debtType,
      data.totalDebt,
      data.assetRatio,
      data.investment,
      data.incomeSource,
      data.monthlyIncome,
      data.dependents
    ];

    sheet.appendRow(newRow);

    return ContentService.createTextOutput(JSON.stringify({
      "result": "success"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // 오류 로깅을 위해 Google Apps Script의 로거 사용
    Logger.log(error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      "result": "error",
      "error": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
