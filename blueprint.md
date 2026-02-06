
# Blueprint: Firebase Firestore Integration for Debt Relief Calculator

## Overview

This document outlines the architecture and plan for a web-based debt relief eligibility calculator. The primary goal is to provide users in Busan, Ulsan, and Gyeongnam with a preliminary diagnosis for personal rehabilitation, capture their data securely, and handle consultation requests using **Firebase Firestore** as the backend.

## Implemented Features & Code Cleanup

This iteration focuses on cleaning up the codebase, improving user experience, and implementing a robust backend with Firebase.

*   **UI/UX Improvements:**
    *   Reordered the buttons in the "Total Debt" question (`q3_total_debt`) in `index.html` to be in a logical, ascending order, improving user intuition.

*   **Code Refactoring & Structuring:**
    *   **`firebase-config.js` Created & Modularized:** A dedicated, modular file for Firebase configuration has been created. It now initializes the Firebase app and exports the Firestore `db` instance, making it reusable and easy to manage.
    *   **`main.js` Complete Refactor:**
        *   **Switched to ES Modules:** Now uses `import` to get the `db` object from `firebase-config.js`, creating a clear dependency graph.
        *   **Logic Separation:** The code is now structured with clear separation of concerns:
            *   **UI Event Handling:** Manages all user interactions (button clicks, form navigation).
            *   **Calculation Logic:** A dedicated `displayResults` function calculates the estimated payment, write-off amount, etc., based on user input.
            *   **Data Submission Logic:** An `async` function now handles submitting the final data to Firestore using `addDoc` and `collection` for reliability.
        *   **Replaced Google Sheets with Firestore:** The previous, less reliable `fetch` call to a Google Apps Script has been completely replaced by direct, secure communication with the Firestore database.

*   **Backend:**
    *   **Firebase Firestore:** Chosen as the backend database to securely store user diagnostic data and consultation requests in a collection named `consultations`.

## Current Plan: Finalization & Deployment

### Step 1: Update `index.html` to use ES Modules

*   Ensure the `<script>` tags in `index.html` have the `type="module"` attribute. This is crucial for the `import`/`export` syntax in `main.js` and `firebase-config.js` to work correctly.
*   Add script tags for the Firebase SDKs (`firebase-app` and `firebase-firestore`).

### Step 2: Commit All Changes to Git

*   All the recent changes (HTML button order, new `firebase-config.js`, refactored `main.js`, and this updated `blueprint.md`) will be committed to the Git repository with a clear message, e.g., "refactor: Clean up code and integrate Firebase".

### Step 3: Push to GitHub

*   The new commit will be pushed to the remote GitHub repository. This will trigger any configured CI/CD pipeline (like Vercel or Netlify deployments) to build and deploy the latest version of the application, making the changes live.

This structured approach ensures the application is now more robust, maintainable, and scalable for future development.
