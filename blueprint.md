# Blueprint: Firebase Firestore Integration

## Overview

This document outlines the revised plan to integrate the web application with **Firebase Firestore**. The previous goal of using Google Sheets is now abandoned due to persistent permission issues. The new goal is to capture user input from the "AI 변제금 계산기" (AI Repayment Calculator) and save it securely and reliably into a Firestore database.

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

## Plan for Current Request: Firebase Firestore Integration

The user wants a reliable way to receive and store data from the application. We will use Firebase, a robust platform from Google, for this purpose.

### Step 1: Add Firebase to the Project

*   I will add the necessary Firebase SDK scripts to the `index.html` file. This allows the website to communicate with Firebase services.

### Step 2: Initialize Firebase Hosting & Firestore

*   I will use the `firebase_init` tool to configure the project for Firebase. This will create essential configuration files (`firebase.json`).
*   I will also initialize Cloud Firestore, which is the NoSQL database we'll use to store the form submissions.

### Step 3: Create Firebase Configuration File

*   I will ask you to create a Firebase project in the Firebase Console (a one-time setup).
*   You will be provided with a configuration object (a snippet of JavaScript code).
*   I will then create a `firebase-config.js` file and instruct you to paste this configuration into it. This securely connects your website to your specific Firebase project.

### Step 4: Update the Frontend JavaScript (`main.js`)

*   I will modify the `main.js` file to handle form submission using Firebase.
*   The existing `submitDataToSheet` function will be replaced with a `submitDataToFirestore` function.
*   This new function will:
    1.  Gather all the user's answers from the form.
    2.  Use the Firebase SDK to create a new "document" (a record, like a row) in a "consultations" collection in your Firestore database.
    3.  Provide immediate feedback to the user (e.g., "신청이 완료되었습니다.").

### Step 5: Final Deployment and Testing

*   After the code is updated, I will push all changes to your GitHub repository.
*   You will then be able to test the live site, and we can verify the data arriving in your Firebase Console in real-time.

This approach provides a professional, scalable, and highly reliable backend for your application, eliminating the frustrations we experienced with Google Apps Script.
