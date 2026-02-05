# Blueprint: Bankrupt Self

## 🚀 Overview

"Bankrupt Self"는 사용자의 요청에 따라 진화하는 웹 애플리케이션입니다. 초기 목표는 기본 프로젝트 구조를 설정하고 GitHub와 연동하여 버전 관리를 시작하는 것이었습니다. 현재는 부산회생법원 관할에 특화된 개인회생 자가진단 및 AI 변제금 계산 기능을 중심으로, 사용자 경험을 향상시키는 다양한 기능들을 추가하고 있습니다.

---

## 📚 Project Documentation

이 섹션에는 애플리케이션의 모든 기능, 디자인, 스타일이 처음부터 현재 버전까지 순서대로 기록됩니다.

### V4: Multi-Step Diagnosis Form & AI Calculator

*   **Interactive Questionnaire & Progress Bar:** 사용자의 상황을 파악하기 위한 다단계 질문과 진행률 표시줄을 구현했습니다.
*   **Dynamic Logic:** 답변에 따라 실시간 피드백을 제공하고, 특정 조건에서는 진행을 제어하는 로직을 적용했습니다.
*   **AI-Powered Calculator:** 2024년 최저생계비 기준 월 변제금을 자동으로 계산하고, 단축 변제 기간 적용 여부를 안내합니다.
*   **Data Submission:** 진단 결과와 사용자 정보를 Google Sheets로 전송하여 전문가 상담으로 연결하는 기능을 완성했습니다.

### V3: Enhanced User Experience Features

*   **App Introduction & Welcome Message:** 서비스 소개와 환영 메시지를 통해 앱의 목적을 명확히 전달했습니다.
*   **AI Chatbot UI:** AI 챗봇의 사용자 인터페이스(UI)를 구현했습니다. 
*   **Testimonial Carousel:** 고객 후기 캐러셀을 통해 신뢰도를 높였습니다.

### V2: Self-Diagnosis Form & Google Sheets Integration (Legacy)
*   **Legacy Form & Google Sheets Integration:** 초기에 사용했던 단일 페이지 폼과 구글 시트 데이터 전송 기능을 구현했습니다.

### V1: Initial Project Setup

*   **Core Files & Version Control:** `index.html`, `style.css`, `main.js` 파일 생성 및 GitHub 연동을 완료했습니다.

---

## 📝 Current Plan

이 섹션에는 현재 진행 중인 작업 계획이 기록됩니다.

*   **Goal:** AI 법률 비서 답변 기능 활성화
*   **Status:** ⏳ **In Progress**
*   **Steps:**
    *   [x] `blueprint.md` 계획 업데이트
    *   [ ] `main.js`: 챗봇 메시지 전송 이벤트 리스너 추가
    *   [ ] `main.js`: 사용자 메시지를 채팅창에 표시하는 기능 구현
    *   [ ] `main.js`: 키워드 기반의 간단한 답변 생성 로직 추가 (예: '개인회생', '자격' 등)
    *   [ ] `style.css`: 채팅 메시지 스타일 추가
