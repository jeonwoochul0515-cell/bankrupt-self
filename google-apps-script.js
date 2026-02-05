/**
 * Google Apps Script for Bankrupt Self-Diagnosis Form
 *
 * This script collects data from the HTML form and adds it as a new row in a Google Sheet.
 * 
 * HOW TO USE:
 * 
 * 1.  CREATE A GOOGLE SHEET:
 *     - Go to https://sheets.new and create a new spreadsheet.
 *     - Name it (e.g., "파산 진단 결과").
 *     - Set up the headers in the first row: 
 *       Timestamp, Income, Debt, Overdue, Name, Phone
 *
 * 2.  CREATE A GOOGLE APPS SCRIPT:
 *     - In your Google Sheet, go to "Extensions" > "Apps Script".
 *     - Delete any default code in the `Code.gs` file and paste the code below.
 * 
 * 3.  DEPLOY AS A WEB APP:
 *     - Click the "Deploy" button > "New deployment".
 *     - For "Select type," choose "Web app".
 *     - In the "Deployment configuration" settings:
 *         - Description: "Bankrupt Self Diagnosis Collector"
 *         - Execute as: "Me"
 *         - Who has access: "Anyone" (This is important for the form to be able to send data)
 *     - Click "Deploy".
 *     - Authorize the script to access your Google Account and Sheets.
 *     - Copy the "Web app URL" that is generated.
 *
 * 4.  CONNECT TO YOUR WEBSITE:
 *     - Open the `main.js` file in your project.
 *     - Find the line: `const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL';`
 *     - Replace `'YOUR_APPS_SCRIPT_URL'` with the URL you copied in the previous step.
 * 
 * 5.  SAVE AND TEST:
 *     - Save the changes to `main.js`.
 *     - Open your `index.html` file in a browser, fill out the form, and submit.
 *     - A new row with the submitted data should appear in your Google Sheet.
 */

function doPost(e) {
  try {
    // Parse the JSON data from the request body
    const data = JSON.parse(e.postData.contents);

    // Open the Google Sheet by name. Make sure this matches your sheet name.
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("파산 진단 결과");

    // Append a new row with the data
    sheet.appendRow([
      new Date(),
      data.income,
      data.debt,
      data.overdue,
      data.name,
      data.phone
    ]);

    // Return a success response
    return ContentService.createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // Log any errors for debugging
    console.error("Error in doPost: " + error.toString());
    
    // Return an error response
    return ContentService.createTextOutput(JSON.stringify({ result: 'error', error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
