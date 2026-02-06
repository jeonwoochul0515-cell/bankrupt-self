
// 1. Google Apps Script 에디터에 이 코드를 복사하여 붙여넣으세요.
// 2. 'YOUR_SHEET_ID'를 실제 Google Sheet ID로 바꾸세요.
// 3. '배포' > '새 배포'를 클릭하고, '웹 앱'으로 유형을 선택한 후 배포하세요.
// 4. 표시되는 웹 앱 URL을 복사하여 main.js 파일의 'YOUR_APPS_SCRIPT_URL'에 붙여넣으세요.

const SHEET_ID = 'YOUR_SHEET_ID'; // <-- 여기에 구글 시트 ID를 입력하세요.
const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const newRow = sheet.getLastRow() + 1;

    // 데이터 순서에 맞게 시트에 추가 (순서가 중요합니다)
    sheet.getRange(newRow, 1).setValue(new Date()); // 제출 시간
    sheet.getRange(newRow, 2).setValue(data.loanType);
    sheet.getRange(newRow, 3).setValue(data.loanPeriod);
    sheet.getRange(newRow, 4).setValue(data.interestRate);
    sheet.getRange(newRow, 5).setValue(data.loanAmount);
    sheet.getRange(newRow, 6).setValue(data.incomeType);
    sheet.getRange(newRow, 7).setValue(data.incomeAmount);
    sheet.getRange(newRow, 8).setValue(data.residence);
    sheet.getRange(newRow, 9).setValue(data.property);
    sheet.getRange(newRow, 10).setValue(data.dependents);

    return ContentService.createTextOutput(JSON.stringify({
      "result": "success",
      "data": JSON.stringify(data)
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      "result": "error",
      "error": error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
