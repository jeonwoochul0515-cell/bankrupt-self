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

## 죽은 코드 정리 완료 (2026-06-08)
- `tracker.js`: 존재하지 않는 `/api/track`으로 보내던 sendBeacon 제거 (form_abandon은 Firebase로만 추적)
- `google-apps-script.js` 삭제: 클라이언트에서 호출되지 않던 구버전 구글시트 연동 잔재

## 아직 남은 미완 (당장 문제 없음, 필요 시 처리)
- `firestore.indexes.json`의 복합 인덱스 4개는 현재 admin이 클라이언트 측 `.filter()`로 처리하여 미사용
- `.firebaserc`가 비어 있어 `firebase deploy`로 룰/인덱스 자동 배포 불가 (콘솔 수동 의존)

## 발견했지만 범위 밖 (수정 보류, 사용자 확인 필요)
- `api/og.js` 109행: OG 이미지 하단 도메인이 옛 주소 `bankrupt-self.vercel.app`로 하드코딩됨 → 현재는 `busan-hoiseng.pro`가 맞음.
- `index.html` og:image는 unsplash 외부 이미지 사용, manifest 로고는 `/api/og` 사용 → 출처 불일치.
