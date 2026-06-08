<!-- 사이트 활성화 작업 진행 체크리스트 -->
# 사이트 활성화 작업 체크리스트

진단 결과: 사이트(busan-hoiseng.pro)는 정상 작동하나 검색 노출/유입 경로가 없어 사실상 방문자가 없음.
목표: ① 상담 알림(솔라피 SMS) ② 추적 정상화 ③ FAQ SEO ④ 콘텐츠 페이지 ⑤ 색인 제출 가이드.

## 1. 솔라피 SMS 알림 (상담 신청 시 관리자에게 문자)
- [x] `api/notify.js` 생성 — 솔라피 HMAC-SHA256 서명 + 메시지 발송 (Vercel Node runtime)
- [x] `simulation-form.js` `submitConsultation()` — addDoc 성공 후 `/api/notify` 호출 추가
- [x] Vercel 환경변수 안내 (SEO/context-notes에 기록) → **사용자가 Vercel에 직접 설정 필요**
- [x] 발송 실패해도 상담 저장은 성공 처리 (fire-and-forget)

## 2. 추적 정상화 (동의 안 한 방문자도 익명 집계)
- [x] `tracker.js` — 개인정보 없는 익명 pageview는 동의 무관 기록, 식별정보(UA/referrer)는 동의 시에만
- [x] admin은 type==='pageview' 카운트 → 자동 반영됨 (코드 확인)

## 3. FAQ 구조화데이터 + 화면 FAQ
- [x] 이미 완비되어 있음 — FAQPage JSON-LD 12개(195~292행) + 화면 FAQ 12개(681~799행). 변경 불필요

## 4. 콘텐츠 페이지 추가 (롱테일 키워드)
- [ ] 보류 — 이미 단일 페이지 콘텐츠가 풍부함. 얇은 페이지 양산은 역효과. 깊이 있는 가이드 1개 여부 사용자 확인 대기

## 5. 색인 제출 가이드
- [x] `SEO-GUIDE.md` 작성 (구글 서치콘솔/네이버 서치어드바이저 sitemap 제출 + 유입 전략)

## 검증
- [x] 변경 JS 3종 `node --check` 통과 (CSS는 미변경)
- [ ] 배포 후 폼 제출 → SMS 수신 확인 (환경변수 설정 후)
- [ ] 의미 단위로 커밋 (사용자 요청 시)
