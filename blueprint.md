# Blueprint: Google Sheets Integration

## Overview

This document outlines the plan to integrate the web application with Google Sheets. The goal is to capture user input from the "AI 변제금 계산기" (AI Repayment Calculator) and save it into a Google Sheet for analysis.

## Implemented Features (Current State)

*   **Static Website:** A single-page application with HTML, CSS, and JavaScript.
*   **UI Components:**
    *   Hero section with a call-to-action.
    *   Information sections about personal rehabilitation.
    *   A multi-step "AI 변제금 계산기" (AI Repayment Calculator).
    *   Q&A section.
    *   Footer with privacy policy link.
*   **Styling:** Modern design with responsive elements.
*   **Interactivity:**
    *   Progress bar for the calculator.
    *   Step-by-step navigation through the calculator questions.
    *   Accordion-style Q&A.

## Plan for Current Request: Google Sheets Integration

The user wants to receive data from the application into a Google Sheet.

### Step 1: Create a Google Apps Script Web App (Backend)

*   A Google Apps Script will be created to act as a simple web API.
*   This script will have a `doPost` function that:
    1.  Receives data (from the calculator form) via an HTTP POST request.
    2.  Opens a specific Google Sheet.
    3.  Appends the received data as a new row in the sheet.
*   The code for this script will be saved in `google-apps-script.js` for the user's reference.

### Step 2: Update the Frontend JavaScript

*   The `main.js` file will be modified to handle the form submission.
*   An event listener will be attached to the final "submit" button of the calculator.
*   When the button is clicked, a `submitDataToSheet` function will be called.
*   This function will:
    1.  Gather the values from all the input fields in the calculator.
    2.  Use the `fetch` API to send this data as a POST request to the deployed Google Apps Script URL.
    3.  Show a confirmation or thank you message to the user upon successful submission.

### Step 3: Provide User Instructions

*   Since the Google Sheet and Apps Script must be created and deployed within the user's own Google account, I will provide clear, step-by-step instructions on how to:
    1.  Create a new Google Sheet and get its ID.
    2.  Create a new Google Apps Script project.
    3.  Paste the provided script code into the project.
    4.  Update the script with their own Google Sheet ID.
    5.  Deploy the script as a web app.
    6.  Copy the generated web app URL.
    7.  Paste the URL into the `main.js` file where indicated.

This approach creates a robust, serverless backend to connect the existing frontend application to Google Sheets.
