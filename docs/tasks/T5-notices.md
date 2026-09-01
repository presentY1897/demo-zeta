# T5 — 공지 연동: 오피스↔웹

- 상태: **완료** · 브랜치: `feature-notices-db` · 의존: T2 (T3·T4와 독립 — 사이에 끼워 넣기 가능) · 커밋 계획: 1개
- 설계 근거: [server-design.md](../server-design.md) §4(admin API)·§5(화면 전환)

## 목표

오피스에서 작성·고정·삭제한 공지가 유저 앱에 실제 반영된다. "다른 오리진이라 공유 불가"라던
기존 명시 한계가 같은 DB를 보는 것으로 해소된다.

## 범위

- **포함**: 공지 CRUD API(admin), 오피스 공지 관리 DB 전환, web 공지 목록·상세·홈 배너 DB 전환
- **제외**: 공지 수정 폼(기존 오피스 화면에도 없음 — 작성·고정·삭제만), 예약 게시 등 신규 기능

## 작업 항목

- [x] office `POST /api/admin/notices`(카테고리·제목 60자·본문 1,000자 검증) · `PATCH /api/admin/notices/[id]`(pinned 토글) · `DELETE /api/admin/notices/[id]` — 전부 admin 쿠키 필수
- [x] 오피스 공지 관리 페이지 — 로컬 state를 DB 조회+API mutation으로 교체. "데모: 이 세션에만 반영돼요" 문구 제거, 폼·confirm 등 UI는 유지
- [x] web 공지 목록·상세 — RSC DB 조회로 전환, `generateStaticParams` 제거(동적), 없는 id 404 유지
- [x] web 홈 고정 배너 — DB의 pinned 공지 조회로 교체

## 테스트

- [x] 통합(docker DB) — CRUD: 작성(검증: 제목 60자·본문 1,000자 초과 400)·pinned 토글·삭제 / **비인증 mutation 전부 401** / web 조회: 목록 정렬·pinned 배너 선택(복수 pinned 시 첫 건)·없는 id 404
- [x] E2E 시나리오 추가 — 오피스(:3001) admin 로그인 → 공지 작성 → 웹(:3000) 목록·상세 반영 → 고정 → 홈 배너 교체 → 삭제 → 웹 미노출 (두 앱 동시 기동)

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

## 구현 결과 (2026-09-01)

커밋 1개. `pnpm test` 85개 통과(이번 티켓에서 21개 추가 — 오피스 CRUD 10, web 조회 11),
`pnpm typecheck`·`pnpm build` 통과. dev 서버(web :3010 · office :3011)로 왕복 1회 수동 확인:
미인증 POST 401 → admin 로그인 → 공지 작성(201) → 웹 목록·상세 노출 → 고정 → **홈 배너 교체** →
삭제 → 웹 목록에서 제거·상세 URL 404·배너 원복. 제목 61자 400, 없는 id 404까지 함께 확인했다.

설계 대비 조정한 점:

- **조회 함수를 `@theta/db/notices`로 올렸다** — 목록 정렬(게시일 desc)과 "고정 배너 = 목록 첫 pinned"
  판정을 오피스와 web이 각자 구현하면 두 화면이 어긋난다. 스키마 옆에 두고 양쪽이 같은 함수를 쓴다.
  쓰기(검증·insert/update/delete)는 오피스 전용이라 `apps/office/src/server/notices.ts`에 남겼다.
- **정렬 tie-breaker로 id를 추가** — 같은 초에 두 건이 올라와도 목록 순서가 흔들리지 않게 한다.
- **uuid 형식이 아닌 id는 DB에 묻지 않고 곧바로 404** — `n-2026-08-mymodel` 같은 옛 URL이나 오타가
  들어오면 Postgres가 `invalid input syntax for type uuid`로 던져 500이 된다. 조회 함수에서 형식을
  먼저 거른다(시드 공지의 id가 uuid가 되면서 옛 URL이 실제로 들어올 수 있다).
- **홈 페이지를 서버/클라이언트로 쪼갰다** — 고정 배너는 DB를 읽어야 하고 태그 필터는 클라이언트
  상태라, `(main)/page.tsx`를 RSC로 두고 피드를 `components/HomeFeed.tsx`로 옮겼다. 마크업·동작은 그대로다.
- **오피스 공지 화면도 RSC + 클라이언트 컴포넌트 구성** — `notices/page.tsx`가 DB를 읽어
  `components/NoticeAdmin.tsx`에 넘기고, mutation 후에는 `router.refresh()`로 목록을 다시 읽는다.
  폼·confirm·목록 마크업은 유지했고 실패 시 문구를 보여 주는 자리만 추가했다.
- **작성 응답은 201** — 나머지는 200. 세 라우트 모두 admin 쿠키가 없으면 본문을 읽기 전에 401이다.
- **오피스 안내 문구 교체** — "데모: 작성/변경은 이 세션에만 반영돼요" → "작성·고정·삭제가 유저 앱
  공지사항에 바로 반영돼요".
- 공지 3개 화면(web 목록·상세, 홈)과 오피스 공지 화면 전부 `force-dynamic`이다.

한계:

- **E2E는 티켓 구현 시점에는 없었다** — `e2e/` 기반이 T3에서 만들어지는 중이었다. 당시에는 같은
  순서를 curl로 수동 검증했고, T3 병합 직후 아래 "E2E 추가"에서 자동화로 채웠다.
- 공지 **수정**은 여전히 없다(범위 제외 — 기존 오피스 화면에도 없던 기능).

### E2E 추가 (T3 병합 후)

T3가 만든 Playwright 기반 위에 `e2e/notices.spec.ts`를 얹어 시나리오를 마저 채웠다 —
오피스 admin 로그인 → 공지 작성 → 웹 목록·상세 반영 → 고정 → **홈 배너 교체** → 삭제 → 웹 미노출.
두 앱을 동시에 기동한 상태에서 한 브라우저 컨텍스트가 오리진을 오가며 확인한다.
같은 rebase에서 홈 페이지 충돌도 해소했다 — T3가 홈을 RSC 피드로 다시 썼기 때문에
T5가 분리해 둔 `HomeFeed.tsx`는 삭제하고, 서버 컴포넌트인 `PinnedNoticeBanner`만 남겼다.
