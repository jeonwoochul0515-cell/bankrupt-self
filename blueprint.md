# Blueprint: Bankrupt Self

## 🚀 Overview

"Bankrupt Self"는 사용자의 요청에 따라 진화하는 웹 애플리케이션입니다. 초기 목표는 기본 프로젝트 구조를 설정하고 GitHub와 연동하여 버전 관리를 시작하는 것이었습니다. 현재는 사용자의 재정 상태를 진단하고, 그 결과를 구글 시트로 수집하는 기능을 구현하고 있습니다.

---

## 📚 Project Documentation

이 섹션에는 애플리케이션의 모든 기능, 디자인, 스타일이 처음부터 현재 버전까지 순서대로 기록됩니다.

### V2: Self-Diagnosis Form & Google Sheets Integration
*   **Self-Diagnosis Form:** 사용자의 재정 상태를 진단하기 위한 질문과 이름, 연락처를 입력받는 폼을 생성했습니다.
*   **Visual Design:** 모던하고 직관적인 UI를 적용하여 사용자 경험을 개선했습니다.
    *   **Layout:** 헤더, 메인 콘텐츠, 푸터로 구성된 명확한 구조를 적용했습니다.
    *   **Styling:** CSS 변수를 활용한 일관된 테마, 카드 UI, 그림자 효과 등을 적용하여 시각적 완성도를 높였습니다.
*   **Google Sheets Integration:**
    *   입력된 데이터를 구글 시트에 저장하기 위해 `fetch` API를 사용하여 Google Apps Script 웹앱으로 데이터를 전송하는 기능을 구현했습니다.
    *   사용자가 직접 설정할 수 있도록 `google-apps-script.js` 파일에 스크립트 코드와 가이드를 제공했습니다.

### V1: Initial Project Setup

*   **Core Files:** `index.html`, `style.css`, `main.js` 파일로 기본 구조를 생성했습니다.
*   **Version Control:**
    *   로컬 Git 저장소를 초기화했습니다.
    *   프로젝트를 원격 GitHub 저장소 (`https://github.com/jeonwoochul0515-cell/bankrupt-self.git`)와 연결했습니다.
    *   초기 프로젝트 파일들을 `main` 브랜치에 푸시하여 연동을 완료했습니다.

---

## 📝 Current Plan

이 섹션에는 현재 진행 중인 작업 계획이 기록됩니다.

*   **Goal:** 자가진단 기능 및 구글 시트 연동 기능 추가
*   **Status:** ✅ **Completed**
*   **Steps:**
    *   [x] `blueprint.md` 업데이트
    *   [x] `index.html` 구조 변경 및 자가진단 폼 추가
    *   [x] `style.css`에 새로운 UI/UX 디자인 적용
    *   [x] `main.js`에 폼 제출 및 데이터 전송 로직 구현
    *   [x] Google Apps Script 코드 및 설정 가이드(`google-apps-script.js`) 생성
