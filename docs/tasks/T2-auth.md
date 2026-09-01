# T2 — 인증: 회원가입·세션·데모 원클릭·admin 가드

- 상태: **완료** · 브랜치: `feature-auth` · 의존: T1 · 커밋 계획: 3개 — 이메일 인증 / Google 로그인 / office admin 가드
- 설계 근거: [server-design.md](../server-design.md) §3(인증)

## 목표

서버 세션이 로그인의 유일한 진실이 된다. 실제 회원가입이 가능해지고, 리뷰어의 데모 계정 원클릭
경로는 그대로 유지된다. 오피스는 admin 비밀번호 없이는 아무것도 못 하게 잠근다.

## 범위

- **포함**: web 인증 API·세션 헬퍼·로그인/가입 화면·Header/MY 전환, **Google 로그인(이메일 가입과 병행)**, office admin 가드
- **제외**: 제재에 따른 채팅 차단(T4에서 /api/chat에 적용), 제재 API 자체(T6), rate limit·이메일 본인확인(스코프 외), Google 외 소셜

## 작업 항목

### web (커밋 1)

- [x] `src/server/auth/` — bcryptjs 해시/검증, 세션 토큰 발급(랜덤 32바이트 base64url), sessions 행 생성/조회/삭제, `theta_session` httpOnly·secure·sameSite=lax 쿠키(30일)
- [x] `getSession()` — RSC·Route Handler 겸용, React `cache()`로 요청 내 중복 조회 방지. 만료 세션은 조회 시 정리
- [x] `POST /api/auth/signup` — 이메일 형식·비밀번호 8자+·닉네임 1~20자 검증, 이메일(lower)·닉네임 중복 검사, hue는 닉네임 해시로 배정, 가입 즉시 세션 발급
- [x] `POST /api/auth/login` — 검증 실패·`status='suspended'` 각각 한국어 메시지("제재된 계정이에요"), `last_active_at` 갱신
- [x] `POST /api/auth/logout` · `GET /api/auth/me`
- [x] 로그인 페이지 개편 — 로그인/가입 탭 폼 + 데모 계정 카드 3개는 원클릭(login API를 시드 자격증명으로 호출) + **로그인 상태로 /login 접근 시 홈 리다이렉트**(기존 갭 ②)
- [x] Header·MY를 서버 세션 기반으로 전환(RSC에서 유저 주입 또는 me fetch), zustand `theta-session` 스토어와 `useSessionUser` 제거, 로그아웃은 API 호출로

### Google 로그인 (커밋 2)

- [x] authorization code flow + PKCE 직접 구현(스코프 openid·email·profile) — `GET /api/auth/google`(state 쿠키 + 구글로 리다이렉트) · `GET /api/auth/google/callback`(코드 교환 → id_token에서 sub·email·이름)
- [x] 계정 매칭 — `google_sub` 일치 계정으로 로그인 → 없으면 이메일 일치 계정에 google_sub 연결 → 둘 다 없으면 신규 생성(닉네임은 구글 이름 기반 자동, 중복 시 숫자 접미)
- [x] 로그인 화면에 "Google로 계속하기" 버튼 — **`GOOGLE_CLIENT_ID` 미설정이면 버튼 자동 숨김**(키 없는 로컬 실행은 이메일 가입+데모 계정으로 완전 동작)
- [x] users 스키마 반영(T1에서): `google_sub` unique 널 허용, `password_hash` 널 허용(Google 전용 계정)
- [x] **셋업 가이드 문서 `docs/setup-google-oauth.md`** — 구글 클라우드 콘솔에서 OAuth 클라이언트 생성 → 동의 화면(비민감 스코프, 프로덕션 게시) → redirect URI에 넣을 정확한 값(로컬 `http://localhost:3000/api/auth/google/callback` / 배포 도메인) → env 입력까지 단계별로. README에서 링크

### office (커밋 3)

- [x] `POST /api/admin/login`(`ADMIN_PASSWORD` 비교 → `theta_admin` 서명 쿠키) · `POST /api/admin/logout`
- [x] admin 로그인 화면 + 루트 레이아웃 가드 — 미인증이면 로그인 화면만 렌더(모든 라우트 차단)

## 테스트

- [x] 유닛 — 비밀번호 해시/검증(bcryptjs 래퍼) / 세션 토큰 발급·만료 판정 / admin HMAC 서명·검증(변조 토큰 거부) / 닉네임 자동 생성(중복 시 숫자 접미)
- [x] 통합(핸들러 직접 호출 + docker DB) —
  signup: 성공(세션 발급 확인)·중복 이메일 409·비밀번호 8자 미만 400 /
  login: 성공·오류 메시지·suspended 거부·시드 유저(더미 해시) 거부 /
  logout 후 me 401, 세션 만료 처리 /
  google 계정 매칭 3분기: google_sub 재로그인 → 동일 계정, 이메일 일치 → 기존 계정에 sub 연결, 둘 다 없음 → 신규 생성 (구글 토큰 교환은 fetch 목킹) /
  admin: 올바른 비밀번호만 쿠키 발급, 비인증 mutation 차단

## 구현 노트

- **미들웨어 대신 레이아웃/핸들러 가드** — Next middleware는 edge 런타임이라 pg 접속 불가.
  세션 검증은 Node 런타임(RSC·Route Handler)에서 수행한다.
- **테스트 가능성이 설계 요건** — 인증 코어(가입·로그인·세션 검증·계정 매칭)는 next/headers에
  의존하지 않는 순수 함수/DB 함수로 분리하고(token·Request를 인자로 받음), next 쿠키 접근은 얇은
  어댑터로 감싼다. 통합 테스트가 dev 서버 없이 핸들러·코어를 직접 호출할 수 있게 하기 위함.
- admin 쿠키는 DB 세션 없이 `SESSION_SECRET` HMAC 서명 토큰으로 충분(관리자 1명, 폐기는 비밀번호 교체).
- Google OAuth는 라이브러리 없이 표준 code flow 2엔드포인트로 — 토큰 교환은 서버 간 fetch, 세션 발급은
  이메일 로그인과 동일 경로 합류. 비민감 스코프(openid·email·profile)만 사용하므로 동의 화면을
  프로덕션 게시해도 구글 심사 불요(콘솔 작업은 T7). password_hash가 null인 계정은 비밀번호 로그인 거부.
- 만들기 위저드의 비로그인 가드 등 기존 화면의 `useSessionUser` 사용처를 모두 새 세션 소스로 치환하는
  것까지가 이 티켓 범위(화면 동작은 불변).

## 완료 기준

- 가입 → 로그아웃 → 로그인 왕복 성공, 새로고침에도 세션 유지
- 데모 계정 카드 원클릭 즉시 로그인, 시드 800명 계정으로는 로그인 불가
- /login 로그인 상태 리다이렉트, 잘못된 비밀번호·중복 이메일에 한국어 에러
- Google: env 설정 시 로그인 왕복 성공(신규 생성 → 재로그인 시 동일 계정), 이메일 겹치는 기존 계정에 연결 동작, env 미설정 시 버튼 미노출·나머지 전부 정상
- 셋업 가이드만 보고(코드를 열지 않고) 콘솔 설정 → env 입력 → 구글 로그인 성공까지 도달 가능
- 오피스: 비밀번호 없이 접근 시 전 화면 차단, 로그인 후 정상, 로그아웃 동작

## 검증 방법

- `pnpm test` — 위 테스트 섹션 전부 (완료 기준에 포함)
- 수동: 가입/로그인/로그아웃 왕복, 데모 원클릭, /login 재방문, 오피스 가드, (env 설정 시) 실제 구글 왕복 1회 — 구글 실연동은 자동화 불가 구간
- `pnpm typecheck && pnpm build`

## 구현 결과 (2026-09-01)

커밋 3개(이메일 인증 / Google 로그인 / office admin 가드). `pnpm test` 64개 통과,
`pnpm typecheck`·`pnpm build` 통과. dev 서버로 가입→로그아웃→로그인 왕복, 데모 원클릭,
/login 재방문 리다이렉트, 오피스 가드까지 수동 확인했다.

- **쿠키를 next/headers 대신 Request/Response에서 직접 다룬다** — 핸들러가
  `(req: Request) => Promise<NextResponse>` 순수 함수라 통합 테스트가 dev 서버 없이
  그대로 호출한다. `next/headers`를 쓰는 곳은 RSC용 어댑터(`current-user.ts`,
  `admin-session.ts`) 둘뿐이고, 실제 검증 로직은 그 바깥의 순수 함수에 있다.
- **테스트가 개발자 .env에 의존하지 않는다** — vitest setup이 `DATABASE_URL`을
  `TEST_DATABASE_URL`로 덮고 `SESSION_SECRET`·`ADMIN_PASSWORD`도 고정값으로 덮어쓴다.
  라우트 핸들러가 쓰는 `@theta/db` 싱글턴이 지연 생성이라 가능한 방식.
- **로그인 실패 메시지 통합** — 설계에는 "검증 실패" 메시지만 있었으나, 계정 존재 여부가
  드러나지 않도록 "없는 이메일"과 "틀린 비밀번호"를 같은 401 문구로 합쳤다.
- **구글 실왕복은 미검증 구간** — 키가 없어 콘솔 설정이 필요한 부분(T7)까지는 확인하지 못했다.
  코드 경로는 fetch 목킹으로 3분기 전부 테스트했고, 키 미설정 시 버튼 미노출은 확인했다.
- **오피스 사이드바 하단 문구 교체** — "데모 환경 · 모든 데이터는 모킹입니다" 자리에
  로그아웃 버튼을 넣었다(데이터가 더 이상 모킹이 아니게 되는 방향과도 맞다).
