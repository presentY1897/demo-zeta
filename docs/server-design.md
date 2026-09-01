# 세타 서버화 설계 — 실서비스 수준 전환

- 작성: 2026-09-01 (화) · 구현 착수 전 검토용
- 배경: "브라우저 저장 + 시드 모킹" 구조를 폐기하고 실제 DB·인증·배포를 갖춘 서비스 수준으로 전환한다.
  모킹 데이터는 **DB 시드 + 테스트 픽스처**로 역할이 내려간다.
- 확정된 선택 (09-01 답변):
  - DB/배포: **Neon Postgres + Drizzle ORM, Vercel 배포**
  - 인증: **실제 회원가입(이메일+비밀번호) + 데모 계정 3종 DB 시드**
  - 서버화 범위: **유저 플롯·공개 피드(핵심) + 대화 기록 + 공지 연동 + 실사용 지표 + 유저 관리 실데이터화** (전부)
  - 일정: 오늘(09-01) 내 완료 목표, 착수 전 설계 검토 먼저
- 유지되는 원칙: **BYOK API 키는 계속 브라우저(localStorage)에만 저장한다.** DB·서버에 절대 저장하지 않고
  대화 요청 단위로만 통과시킨다. 시드 고정 mulberry32·기준일 08-31도 시드 데이터 생성에 그대로 쓴다.

---

## 1. 아키텍처 개요

```
apps/web (:3000, Vercel)  ─┐
                            ├─ packages/db (Drizzle 스키마·클라이언트·시드) ─ Neon Postgres
apps/office (:3001, Vercel)─┘
```

- 새 패키지 **`packages/db`** — Drizzle 스키마, DB 클라이언트(@neondatabase/serverless), drizzle-kit
  마이그레이션, 시드 스크립트. web·office가 공용으로 import.
- web은 유저용 API(Route Handler)와 RSC 직접 조회를 병행, office는 RSC 직접 조회 + 관리용 mutation API.
- 로컬 개발은 `docker-compose.yml`의 Postgres로 동일 스키마 실행(리뷰어도 Neon 없이 실행 가능).
- 환경변수: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD`, `GOOGLE_CLIENT_ID/SECRET`.
  **문서화 원칙 (09-01)**: 리뷰어 주 경로는 배포 URL(설치 불요)이고 로컬 실행은 선택 지원 —
  `.env.example`의 키별 상세 주석 + README 키 표 + 구글 OAuth 셋업 가이드(`docs/setup-google-oauth.md`)로,
  필요한 사람이 문서만 보고 키를 발급·입력할 수 있게 한다. 키 미설정 시에도 해당 기능만 빠진 채 동작.
- `packages/mocks`는 삭제하지 않는다: 시드 스크립트의 데이터 소스 + 유닛 테스트 픽스처로 남는다.

## 2. DB 스키마 (Drizzle → Postgres)

```
users          id uuid PK · email unique · password_hash(널 허용) · google_sub unique(널 허용)
               nickname unique · plan 'free'|'pass' · hue int · status 'active'|'suspended'
               country 'KR'|'JP'|'US' · is_seed bool · joined_at · last_active_at
sessions       token PK(랜덤 256bit) · user_id FK · expires_at(30일)
plots          id text PK · owner_id FK nullable · name · tagline · description
               persona · first_message · tags text[] · emoji · gradient_from/to
               visibility 'public'|'private' · chats_count · likes_count · created_at
chat_rooms     id uuid PK · user_id FK · plot_id FK · created_at · updated_at
               UNIQUE(user_id, plot_id)
messages       id uuid PK · room_id FK · seq int · role 'user'|'assistant'
               content · interrupted bool · created_at · UNIQUE(room_id, seq)
usage_events   id bigserial · user_id · plot_id · provider_kind · model
               est_input_tokens · est_output_tokens · created_at
daily_metrics  date PK · dau · new_users · turns · tokens jsonb(모델별 입출력)
               gpu_cost_krw · revenue_krw · fee_krw          ← 90일 시드 전용
notices        id uuid PK · category · title · body · pinned · published_at
experiments    id PK · name · hypothesis · status · started_at · ended_at
               variants jsonb · conclusion
images         id uuid PK · owner_id FK · content_type · bytes bytea
               width · height · created_at      (+ plots.cover_image_id FK 널 허용)
```

인덱스: `plots(visibility, created_at)` + `tags` GIN / `messages(room_id, seq)` /
`usage_events(created_at)` / `users(lower(email))`.

**시드 내용** (전부 기존 mocks에서 생성, 시드 고정이라 재실행해도 동일):
큐레이션 플롯 12개(owner = "세타 공식" 시드 계정) · 유저 800명(`is_seed`, 로그인 불가 해시) ·
데모 계정 3종(문서화된 비밀번호로 실제 로그인 가능) · 90일 daily_metrics · 공지 5건 · 실험 3건.

## 3. 인증 설계

- **가입** `POST /api/auth/signup` — 이메일·비밀번호(8자+)·닉네임. bcrypt 해시, 이메일·닉네임 중복 검사.
  가입 즉시 세션 발급. hue는 닉네임 해시로 자동 배정.
- **로그인/로그아웃** `POST /api/auth/login` · `POST /api/auth/logout` — 세션은 DB `sessions` 행 +
  `theta_session` httpOnly·secure 쿠키. `GET /api/auth/me`로 현재 유저 조회.
- **Google 로그인 병행 (09-01 확정)** — openid·email·profile 스코프의 code flow + PKCE.
  google_sub로 매칭, 이메일 일치 시 기존 계정에 연결, 신규면 닉네임 자동 생성.
  `GOOGLE_CLIENT_ID/SECRET` 미설정이면 버튼 자동 숨김 — 키 없는 로컬 실행도 완전 동작.
- **로그인 페이지 개편** — 이메일/비밀번호 폼 + 가입 전환 탭 + "Google로 계속하기" + 기존 데모 계정
  카드 3개는 "원클릭 로그인"(시드 계정으로 로그인 API 호출)으로 유지. 리뷰어 체험 경로 보존.
  로그인 상태로 /login 접근 시 홈으로 리다이렉트(기존 갭 ② 해소).
- **제재 반영** — `status='suspended'`면 로그인 거부("제재된 계정이에요") + 기존 세션 무효화 +
  `/api/chat`·플롯 생성 403. 오피스 제재가 실제 효력을 갖게 됨.
- **오피스 보호** — `ADMIN_PASSWORD` 단일 비밀번호 로그인(쿠키 세션). 배포된 오피스가
  무방비로 공개되는 것을 막는 최소 장치. (확인 포인트 A)
- zustand `theta-session` 스토어는 제거하고 서버 세션이 유일한 진실이 된다.

## 4. API 설계

### web (유저 API)

| 메서드·경로 | 설명 | 인증 |
| --- | --- | --- |
| POST `/api/auth/signup` · `/login` · `/logout`, GET `/api/auth/me` | §3 | - |
| GET `/api/plots?tag=&cursor=` | 공개 플롯 피드(+본인 비공개 포함), 태그 필터, chats_count 정렬 | 선택 |
| POST `/api/plots` | 플롯 생성(만들기 위저드 제출) — **visibility 실제 저장** (갭 ① 해소) | 필수 |
| GET `/api/plots/[id]` | 단건 조회 — 비공개는 소유자만, 그 외 404 | 선택 |
| DELETE `/api/plots/[id]` | 소유자 삭제(대화방 cascade) | 필수 |
| POST `/api/uploads` | 커버 이미지 업로드(매직 바이트 검증·2MB 상한) → `{id}` — T8 | 필수 |
| GET `/api/images/[id]` | 이미지 서빙(immutable 캐시 + ETag) — T8 | - |
| GET `/api/rooms` | 내 대화방 목록(마지막 메시지 포함, updated_at desc) | 필수 |
| POST `/api/rooms` | 방 개설 `{plotId}` — 첫 메시지 저장, plots.chats_count +1 | 필수 |
| DELETE `/api/rooms/[id]/messages?fromSeq=n` | n부터 잘라내기(수정·재생성용, seq 0 보호) | 필수 |
| POST `/api/rooms/[id]/reset` | 첫 메시지만 남기고 초기화 | 필수 |
| POST `/api/chat` | 스트리밍 프록시 개편(아래) | 필수 |

**`/api/chat` 개편** — 기존 프록시(BYOK 통과·SSE→텍스트·20초 연결 타임아웃·모의 모드)는 유지하고
영속화를 얹는다: 세션 확인 → `roomId` 검증 → **user 메시지 저장** → 업스트림 스트리밍하며 서버가
버퍼 누적 → 종료·중단 시 **assistant 메시지 저장(`interrupted` 포함) + usage_events 1건 기록 +
room.updated_at 갱신**. 클라이언트가 중단해도 부분 응답이 서버에 남는다(기존 UX 동일).
정지 상태 유저는 403.

### office (관리 API — 전부 admin 쿠키 필수)

| 메서드·경로 | 설명 |
| --- | --- |
| POST `/api/admin/login` · `/logout` | ADMIN_PASSWORD 세션 |
| POST `/api/admin/users/[id]/sanction` | 제재/해제 — users.status 갱신 + 세션 무효화, **DB 영속** |
| POST · PATCH · DELETE `/api/admin/notices` | 공지 CRUD — **web 공지 페이지에 즉시 반영** (미연동 한계 해소) |

조회(대시보드·유저 목록·실험)는 API 없이 RSC에서 Drizzle 직접 쿼리.
유저 목록의 검색·필터·정렬·페이징은 SQL로 이전(800 시드 + 실가입 유저가 한 목록에).

## 5. 화면 전환 (달라지는 것 / 유지되는 것)

| 영역 | 전환 내용 |
| --- | --- |
| 홈 피드 | RSC로 공개 플롯 DB 조회(태그는 searchParams). **다른 유저의 공개 플롯이 보이기 시작** — 이번 요구의 핵심. 내 플롯 우선 정렬 유지, 비공개는 본인에게만. |
| 만들기 | 위저드 UI 그대로, 제출만 `POST /api/plots`. 비공개 선택이 실제 동작. **커버 이미지 업로드(선택) 추가**(T8) — 클라이언트 4:3 크롭·리사이즈·webp 재인코딩 후 업로드, 미첨부 시 이모지+그라디언트 폴백. 저장은 DB(bytea)+스토리지 인터페이스 분리(실서비스라면 오브젝트 스토리지+CDN 교체 지점). |
| 플롯 프로필 | DB 조회. `u-` 로컬 id 개념 소멸 — 남의 공개 플롯 URL 공유 가능. |
| 채팅 | UI·조작(중단/재생성/수정/초기화) 그대로, 저장소만 chat-store→서버. 입장 시 방 조회/개설, 메시지는 서버 저장. zustand는 화면 캐시+옵티미스틱 용도로 축소. |
| 대화 목록 | `GET /api/rooms` 기반. 기기 간 동기화됨. |
| MY | 서버 세션 기반. 내 플롯은 API 조회(비공개 포함). |
| 내 AI 연결 | **변경 없음** — BYOK 설정·키는 localStorage 유지. |
| 공지(web) | RSC가 DB 조회(정적 프리렌더 → 동적). 오피스 작성이 즉시 노출. |
| 오피스 유저 | DB 기반 목록/상세. 제재 영속 + 로그인·채팅 차단 효력. "이 세션에서만 반영" 문구 제거. |
| 오피스 대시보드 | 시드 daily_metrics + 실데이터(usage_events·users 가입) **날짜별 합산**: DAU·신규 가입·턴·토큰. 매출·GPU 비용·마진·모델별 차트는 시드 전용으로 명시(확인 포인트 C). |
| 오피스 공지·실험 | 공지는 DB CRUD. 실험은 DB 시드 조회(읽기 전용 유지). |

기존 localStorage 데이터(대화·플롯)는 마이그레이션하지 않는다 — 배포 전 데모 데이터로 간주(확인 포인트 D).

## 6. 실사용 지표 설계

- assistant 응답 1건 완료(중단 포함)마다 `usage_events` 1행: provider_kind(mock/openai/anthropic),
  model(설정값), 토큰 추정치.
- **토큰 추정** — OpenAI 호환·Anthropic 스트림은 usage를 안 주는 경우가 많아, 입력은 프롬프트 글자 수,
  출력은 응답 글자 수 기반 추정(한글 ≈ 1자당 0.5~1토큰, 계수는 상수로 문서화). 오피스에는 "추정치" 라벨.
  (확인 포인트 B)
- 대시보드 합산: 선택 구간의 날짜별로 `시드 + 실데이터` 병합. DAU 실데이터는 usage_events의 일별
  distinct user, 신규 가입은 is_seed=false 가입일, 턴은 이벤트 수.
- 원가·매출 계열은 실데이터 원가 정보가 없으므로(유저의 BYOK 모델은 자사 모델이 아님) 시드 전용 유지.

## 7. 작업 순서와 일정

git은 기존 규칙대로 기능별 worktree → rebase → ff 병합.
**개별 작업 단위는 [tasks/](./tasks/README.md) 아래 T1~T7 별도 문서로 분해되어 있다**(티켓별 목표·범위·작업 항목·구현 노트·완료 기준·검증 방법) — 아래 표는 순서 요약.

| 순서 | 작업 | 산출 |
| --- | --- | --- |
| ① | `packages/db` — 스키마·클라이언트·마이그레이션·시드 + docker-compose | 로컬 DB에 시드 확인 |
| ② | 인증 — auth API + 로그인/가입 화면 + 세션 헬퍼 + 오피스 admin 가드 | 데모 계정 원클릭 로그인 |
| ③ | 플롯 — plots API + 홈/프로필/만들기/my-plots 전환 | 공개 피드에 타 유저 플롯 |
| ④ | 채팅 — /api/chat 영속화 + rooms API + 채팅 화면 전환 | 기기 간 대화 동기화 |
| ⑤ | 공지 — 오피스 CRUD → DB, web RSC 전환 | 오피스↔웹 연동 |
| ⑥ | 오피스 — 유저 관리 DB 전환·제재 효력, 대시보드 실데이터 합산 | |
| ⑦ | 배포 — Neon 프로비저닝, Vercel 2프로젝트, 시드, 배포 스모크 | 공개 URL |

- **테스트는 뒤로 미루지 않고 티켓 안에 포함한다(09-01 확정)** — 티켓마다 유닛·DB 통합 테스트(Vitest)
  필수, E2E(Playwright)는 T3 도입 후 티켓별 시나리오 누적. 상세는 tasks/README.md "테스트 원칙".
- **오늘(09-01) 목표: ①~⑦ 전부(티켓별 테스트 포함).** 최대 리스크는 ④(스트리밍 중 저장·중단 경로)로,
  밀리면 ⑤⑥을 09-02 오전으로 넘긴다.
- 09-02~03: CI(티켓에서 작성된 `pnpm test`/`pnpm e2e`를 docker postgres 서비스로 실행)·README
  재작성(서버 아키텍처 기준)·폴리시.
- 09-04: 클린 환경 재현 확인(로컬 docker 경로 + 배포 URL), 최종 점검.
- 기존 중간 점검 문서(spec-review-2026-09-01.md)의 §6~8 계획은 이 문서로 대체된다.

## 8. 확인 포인트 (이견 없으면 추천안으로 진행)

- **A. 오피스 보호** — `ADMIN_PASSWORD` 단일 비밀번호 세션(추천). 더 간단히 가면 무보호+README 명시인데,
  배포 URL에서 제재·공지 조작이 열리므로 비추천.
- **B. 토큰 추정** — 글자 수 기반 추정치 + "추정" 라벨(추천). 정확히 하려면 프로바이더별 usage 파싱을
  추가해야 하고 mock·Ollama는 어차피 추정이 필요.
- **C. 모델별 비용·매출 차트** — 시드 전용 유지(추천). 실 BYOK 사용을 자사 모델(koji/luca) 원가에 억지로
  매핑하면 데이터가 거짓이 됨. DAU·신규·턴·토큰 총량만 실데이터 합산.
- **D. 기존 localStorage 데이터** — 마이그레이션 생략(추천). 전환 전 대화·플롯은 데모 산출물로 간주.
