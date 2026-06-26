<!-- 사이트 활성화 작업 중 내린 결정과 근거 기록 -->
# Context Notes — 사이트 활성화

## 진단 결과 (2026-06-08)
- 사이트는 `https://busan-hoiseng.pro`에 정상 배포됨 (Vercel). `bankrupt-self.vercel.app` → 301 리다이렉트.
- SEO 기술 세팅(메타/OG/구조화데이터/geo/네이버·구글 인증코드/GTM)은 이미 거의 완비.
- 문제는 코드가 아니라 **검색 색인·노출·유입 경로 부재**. "부산회생프로/부산 개인회생" 검색 시 경쟁사만 노출되고 본 사이트는 안 보임.
- 방문 추적은 쿠키 동의자만 기록 → 통계가 실제보다 과소집계됨.

## 스택
- 순수 정적 HTML/JS/CSS + Tailwind(빌드: `npm run build:css`)
- Firebase Firestore: 클라이언트가 직접 `consultations`/`analytics`에 쓰기 (firestore.rules: create는 공개, read는 auth 필요)
- 배포: Vercel. serverless function 사용 중 (`api/og.js`, edge runtime)
- 분석: GTM-TZRMFF55 (동의 후 로드)

## 결정 사항
- **솔라피 알림은 Vercel Node serverless function(`api/notify.js`)으로 구현.** 이유: 솔라피 API Secret을 클라이언트에 노출 불가 → 서버 필요. HMAC-SHA256 서명에 Node `crypto` 필요 → edge가 아닌 Node runtime 사용.
- 솔라피 SDK(`solapi` npm) 대신 fetch + crypto로 직접 서명 → 의존성 최소화 (CLAUDE.md 단순성 원칙).
- 상담 저장(addDoc)과 SMS 발송은 분리 — SMS 실패가 상담 접수를 막지 않도록 fire-and-forget.

## 솔라피 연동에 필요한 사용자 액션 (Vercel 환경변수)
- `SOLAPI_API_KEY` — 솔라피 콘솔 API Key
- `SOLAPI_API_SECRET` — 솔라피 콘솔 API Secret
- `SOLAPI_SENDER` — 솔라피에 사전 등록·인증된 발신번호 ('-' 없이)
- `ADMIN_PHONE` — 알림 받을 관리자 휴대폰 번호 ('-' 없이)

## 신청자 SMS + 다중 관리자 (2026-06-27)
- 상담신청 제출 시 **신청자 + 관리자 전원**에게 SMS 발송 (`api/notify.js`).
- 단건 `/messages/v4/send` → 다건 `/messages/v4/send-many/detail`로 전환, `messages` 배열에 동봉.
- **신청자 문구 = 접수 확인 + 연락 안내**(과장·단정 배제, 문의 1660-4452). 발송 타이밍은 번호가 확보되는 **상담신청 제출 직후**가 유일.
  - (이력) 한때 "20만원 할인쿠폰"으로 했다가 2026-06-27 사용자 요청으로 철회 — 변호사법·변협 광고규정상 수임료 할인 유인 소지 있어 더 안전.

## 20만원 할인쿠폰 전면 제거 + 사업자 정보 변경 (2026-06-27)
- SMS뿐 아니라 **화면 전반에 하드코딩돼 있던 "수임료 20만원 할인 쿠폰" 광고를 전부 제거**(변호사법·변협 광고규정 리스크 + 미지급 혜택 약속 방지).
  - `index.html`: 혜택 카드(쿠폰→"전문가 1:1 직접 상담"), 통계블록(20만원→"1:1"), 섹션 제목/소제목, 히어로·CTA·footer 텍스트, OG description.
  - `terms.html`: 제4조(할인 쿠폰 이용 조건) 삭제 후 제5·6조 → 제4·5조로 번호 당김.
  - `guide.html`: 수임료 20만원 할인 문구 → 분할납부 등 비용 상담 안내로 교체.
  - `simulation-form.js`: 진단 결과 안내 문구에서 쿠폰 제거 → 전문가 검토 안내.
  - `og-image-generator.html`(개발툴): 캡션 교체.
- **사업자 정보 상호 변경**: `index.html` footer `상호: 부산회생프로` → `법률사무소 청송law`(privacy.html 표기와 통일).

## 푸터 사업자정보 chang-hee.kim 기준 전면 교체 + 법률사무소 연동 (2026-06-27)
- footer 사업자 정보를 `chang-hee.kim`(법률사무소 청송 공식) 기준으로 교체:
  - 대표(광고책임)변호사: **김창희**(기존 전우철에서 변경), 주소 `부산 연제구 법원남로15번길 10, 202호 (거제동, 미르코아빌딩)`, 전화 1660-4452, 팩스 051-714-1516, 이메일 `lawchungsong@daum.net`(기존 플레이스홀더 info@busan-hoiseng.pro 대체).
- **법률사무소 홈페이지 연동**: footer에 청송 공식 홈페이지(chang-hee.kim) 링크 + JSON-LD Organization에 `sameAs`(chang-hee.kim) 및 `parentOrganization`(법률사무소 청송) 추가 → 엔티티 연결로 GEO/지식그래프 인식 강화.
- ⚠️ 미해소: `사업자등록번호 758-81-00296`은 기존값 유지 — 법률사무소 청송 기준 번호가 맞는지 사용자 확인 필요. `privacy.html`의 개인정보 담당자(전우철)·이메일(info@busan-hoiseng.pro)은 이번에 미변경(개인정보 담당자는 대표와 별개 역할일 수 있어 확인 필요).
- **관리자 수신번호는 `ADMIN_PHONE`을 콤마 구분 다중 지원**으로 변경. 현재 값: `01026085099,01033682382` (Vercel Production, 2026-06-27 갱신).
- 발신번호/시크릿 등 4개 env는 이미 19일 전 설정돼 있어 그대로 사용. `ADMIN_PHONE`만 갱신함.
- 주의: 신청자 문구가 SMS 90byte 초과 → 솔라피가 LMS로 자동 전환(과금↑).

## 홈 진입 시 하단 스크롤 버그 수정 (2026-06-27)
- 증상: 홈페이지 진입하면 최상단이 아니라 진단폼(하단)으로 스크롤됨.
- 원인: `simulation-form.js` `connectedCallback()` → 초기 `updateFormView()` 호출 끝에 `scrollIntoView`가 있어 최초 마운트 때도 폼으로 스크롤.
- 수정: `updateFormView(shouldScroll = true)`로 변경, 스텝 전환 호출은 그대로 스크롤·**최초 마운트(line 351)만 `false`**로 호출해 스크롤 억제.

## 죽은 코드 정리 완료 (2026-06-08)
- `tracker.js`: 존재하지 않는 `/api/track`으로 보내던 sendBeacon 제거 (form_abandon은 Firebase로만 추적)
- `google-apps-script.js` 삭제: 클라이언트에서 호출되지 않던 구버전 구글시트 연동 잔재

## 아직 남은 미완 (당장 문제 없음, 필요 시 처리)
- `firestore.indexes.json`의 복합 인덱스 4개는 현재 admin이 클라이언트 측 `.filter()`로 처리하여 미사용
- `.firebaserc`가 비어 있어 `firebase deploy`로 룰/인덱스 자동 배포 불가 (콘솔 수동 의존)

## 발견했지만 범위 밖 (수정 보류, 사용자 확인 필요)
- ~~`api/og.js` OG 이미지 하단 도메인 옛 주소~~ → 2026-06-08 `busan-hoiseng.pro`로 수정 완료.
- `index.html` og:image는 unsplash 외부 이미지 사용, manifest 로고는 `/api/og` 사용 → 출처 불일치.
