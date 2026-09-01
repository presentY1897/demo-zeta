# T5 — 공지 연동: 오피스↔웹

- 상태: 대기 · 브랜치: `feature-notices-db` · 의존: T2 (T3·T4와 독립 — 사이에 끼워 넣기 가능) · 커밋 계획: 1개
- 설계 근거: [server-design.md](../server-design.md) §4(admin API)·§5(화면 전환)

## 목표

오피스에서 작성·고정·삭제한 공지가 유저 앱에 실제 반영된다. "다른 오리진이라 공유 불가"라던
기존 명시 한계가 같은 DB를 보는 것으로 해소된다.

## 범위

- **포함**: 공지 CRUD API(admin), 오피스 공지 관리 DB 전환, web 공지 목록·상세·홈 배너 DB 전환
- **제외**: 공지 수정 폼(기존 오피스 화면에도 없음 — 작성·고정·삭제만), 예약 게시 등 신규 기능

## 작업 항목

- [ ] office `POST /api/admin/notices`(카테고리·제목 60자·본문 1,000자 검증) · `PATCH /api/admin/notices/[id]`(pinned 토글) · `DELETE /api/admin/notices/[id]` — 전부 admin 쿠키 필수
- [ ] 오피스 공지 관리 페이지 — 로컬 state를 DB 조회+API mutation으로 교체. "데모: 이 세션에만 반영돼요" 문구 제거, 폼·confirm 등 UI는 유지
- [ ] web 공지 목록·상세 — RSC DB 조회로 전환, `generateStaticParams` 제거(동적), 없는 id 404 유지
- [ ] web 홈 고정 배너 — DB의 pinned 공지 조회로 교체

## 테스트

- [ ] 통합(docker DB) — CRUD: 작성(검증: 제목 60자·본문 1,000자 초과 400)·pinned 토글·삭제 / **비인증 mutation 전부 401** / web 조회: 목록 정렬·pinned 배너 선택(복수 pinned 시 첫 건)·없는 id 404
- [ ] E2E 시나리오 추가 — 오피스(:3001) admin 로그인 → 공지 작성 → 웹(:3000) 목록·상세 반영 → 고정 → 홈 배너 교체 → 삭제 → 웹 미노출 (두 앱 동시 기동)

## 구현 노트

- 새 공지의 `published_at`은 서버 시각(실제 오늘). 시드 공지 5건은 기존 날짜 유지.
- pinned 복수 허용은 기존 오피스 동작 그대로(홈 배너는 목록 첫 pinned 1건) — 동작 변경 없음.
- web 공지가 동적이 되므로 페이지 캐시를 끈다(`force-dynamic` 또는 짧은 revalidate — 데모 특성상 즉시 반영이 보이는 게 중요).

## 완료 기준

- 오피스 작성 → 웹 목록·상세에 노출(새로고침 기준), 오피스 재접속에도 유지
- 고정 토글 → 홈 배너 교체, 삭제 → 웹에서 제거 + 상세 URL 404
- 비인증 상태에서 admin notices API 전부 차단

## 검증 방법

- `pnpm test` + `pnpm e2e` — 완료 기준에 포함
- 수동: 오피스↔웹 왕복 1회, `pnpm typecheck && pnpm build`
