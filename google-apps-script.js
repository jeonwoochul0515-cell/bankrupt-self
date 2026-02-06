// How to use:
// 1. Open your Google Apps Script project and open the 'Code.gs' file.
// 2. DELETE ALL existing code in the file.
// 3. Copy and paste ALL of the code below into the file.
// 4. Change the 'SHEET_ID' to your actual Google Sheet ID if needed.
// 5. Click 'Deploy' > 'New deployment'. In the dialog, for 'Who has access', select 'Anyone'.
// 6. Click 'Deploy'. This will update your web app. You do not need a new URL.

const SHEET_ID = '1lJzS0SPB0743bEBAEMVSf2bM9a-B91Jd33l0kwsmyTI';

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    const data = e.parameter;

    // Add a header row if the sheet is empty
    if (sheet.getLastRow() === 0) {
      const headers = [
        "Timestamp", "Name", "Phone", "Region", "Income Type",
        "Total Debt", "Asset Ratio", "Investment", "Reduction Reasons",
        "Dependents", "Extra Costs", "Monthly Income"
      ];
      sheet.appendRow(headers);
    }

    // Add the new data as a row
    const newRow = [
      new Date(),
      data.name,
      data.phone,
      data.region,
      data.incomeType,
      data.totalDebt,
      data.assetRatio,
      data.investment,
      data.reductionReasons,
      data.dependents,
      data.extraCosts,
      data.monthlyIncome
    ];
    sheet.appendRow(newRow);

    // Return a success JSON response to the website
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Log any errors for debugging in the Apps Script dashboard
    Logger.log("Error in doPost: " + error.toString() + "\nParameters: " + JSON.stringify(e.parameter));

    // Return an error JSON response to the website
    return ContentService
      .createTextOutput(JSON.stringify({ "result": "error", "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
