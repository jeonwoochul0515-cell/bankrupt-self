# Blueprint: Bankrupt Self

## 🚀 Overview

"Bankrupt Self"는 사용자의 요청에 따라 진화하는 웹 애플리케이션입니다. 초기 목표는 기본 프로젝트 구조를 설정하고 GitHub와 연동하여 버전 관리를 시작하는 것이었습니다. 현재는 부산회생법원 관할에 특화된 개인회생 자가진단 및 AI 변제금 계산 기능을 중심으로, 사용자 경험을 향상시키는 다양한 기능들을 추가하고 있습니다.

---

## 📚 Project Documentation

이 섹션에는 애플리케이션의 모든 기능, 디자인, 스타일이 처음부터 현재 버전까지 순서대로 기록됩니다.

### V4: Multi-Step Diagnosis Form

*   **Interactive Questionnaire:** 사용자의 관할지역, 소득, 채무, 재산 상태 등을 순차적으로 질문하는 다단계 폼을 구현했습니다. 각 답변에 따라 실시간으로 피드백(안내 메시지)을 제공하여 사용자 경험을 개선했습니다.
*   **Progress Bar:** 사용자가 진단 과정에서 자신의 위치를 시각적으로 파악할 수 있도록 진행률 표시줄을 추가했습니다.
*   **Dynamic Logic:** 사용자의 답변을 `userAnswers` 객체에 저장하고, 특정 답변(예: 소득 없음, 재산 초과)에 따라 진행을 멈추거나, 관할 지역에 맞는 특별 안내(예: 부산회생법원 혜택)를 제공하는 로직을 구현했습니다.

### V3: Enhanced User Experience Features

*   **App Introduction & Welcome Message:** 서비스 소개와 환영 메시지를 통해 앱의 목적을 명확히 전달했습니다.
*   **AI Chatbot:** AI 챗봇 UI를 추가하여 사용자가 궁금한 점을 문의할 수 있도록 했습니다. 
*   **Testimonial Carousel:** 고객 후기 캐러셀을 통해 신뢰도를 높였습니다.

### V2: Self-Diagnosis Form & Google Sheets Integration (Legacy)
*   **Legacy Form:** 초기에 사용했던 단일 페이지의 자가진단 폼입니다.
*   **Google Sheets Integration:** 폼 데이터를 구글 시트로 전송하는 기능을 구현했습니다.

### V1: Initial Project Setup

*   **Core Files & Version Control:** `index.html`, `style.css`, `main.js` 파일 생성 및 GitHub 연동을 완료했습니다.

---

## 📝 Current Plan

이 섹션에는 현재 진행 중인 작업 계획이 기록됩니다.

*   **Goal:** AI 변제금 계산 및 결과 표시 기능 구현
*   **Status:** ⏳ **In Progress**
*   **Steps:**
    *   [x] `blueprint.md` 계획 업데이트
    *   [ ] `index.html`: 최종 정보 입력(월 소득, 부양가족) 및 결과 표시 영역 추가
    *   [ ] `style.css`: 최종 입력 필드 및 결과 표시 영역 스타일링
    *   [ ] `main.js`: 월 변제금 계산 로직 및 결과 표시 기능 구현
    *   [ ] `main.js`: 최종 결과(진단 내용 + 계산 결과)를 구글 시트로 제출하는 기능 구현
