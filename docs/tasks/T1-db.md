# T1 — packages/db: 스키마·시드·로컬 DB

- 상태: 대기 · 브랜치: `feature-db` · 의존: 없음 · 커밋 계획: 1개 — `feat(db): 스키마·시드·로컬 개발 DB`
- 설계 근거: [server-design.md](../server-design.md) §1(아키텍처)·§2(스키마)

## 목표

web·office가 공용으로 import하는 DB 계층(`@theta/db`)과, mocks를 원본으로 하는 재현 가능한 시드를 만든다.
이 티켓이 끝나면 로컬 docker Postgres에 전체 스키마와 시드 데이터가 올라가 있어야 한다.

## 범위

- **포함**: 스키마 9테이블, 마이그레이션, 시드 스크립트, docker-compose, .env.example, 루트 스크립트
- **제외**: 앱에서의 사용(T2부터), Neon 프로비저닝(T7)

## 작업 항목

- [ ] `packages/db` 생성 — `package.json`(`@theta/db`, drizzle-orm·pg·drizzle-kit), `drizzle.config.ts`
- [ ] `src/schema.ts` — 설계 §2의 10테이블: users / sessions / plots / chat_rooms / messages / usage_events / daily_metrics / notices / experiments / **images(T8용 — plots.cover_image_id FK 포함)** + 인덱스(plots(visibility, created_at)·tags GIN, messages(room_id, seq), usage_events(created_at), users(lower(email)))
- [ ] `src/client.ts` — pg Pool 싱글턴 + drizzle 인스턴스. `DATABASE_URL` 없으면 명확한 에러 메시지
- [ ] `docker-compose.yml` (루트) — postgres:16, 5432, named volume, 헬스체크
- [ ] `.env.example` (루트) — `DATABASE_URL` / `SESSION_SECRET` / `ADMIN_PASSWORD` / `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. **키마다 상세 주석**: 용도, 필수/선택 여부, 값 만드는 법(예: SESSION_SECRET은 `openssl rand -base64 32`), 미설정 시 동작(구글 버튼 숨김 등). `DATABASE_URL` 기본값은 docker-compose와 일치시켜 **복사만 하면 로컬이 바로 동작**하게
- [ ] 마이그레이션 생성(drizzle-kit generate) + 루트 스크립트 `db:migrate` / `db:seed`
- [ ] `src/seed.ts` — 아래 시드 전략대로

## 테스트

- [ ] **테스트 기반 구축(이 티켓의 산출물)** — 루트 Vitest 설정(workspace)과 `pnpm test` 스크립트,
  DB 통합 테스트 헬퍼: `TEST_DATABASE_URL`(docker DB) 접속, 시작 시 마이그레이션 보장, 파일별
  truncate 리셋, 통합 테스트 직렬 실행(fileParallelism off)
- [ ] `packages/db` 통합 테스트 —
  시드 카운트(plots 12 · users 804 · notices 5 · daily_metrics 90 · experiments 3) /
  **idempotency: 2회 실행 후 상태 동일** /
  unique 제약: 이메일·닉네임 중복 삽입 거부 /
  FK cascade: 플롯 삭제 시 chat_rooms·messages 동반 삭제 /
  시드 유저 password_hash가 bcrypt 형식이 아님(로그인 불가 보장)

## 구현 노트

- **드라이버는 node-postgres(pg) 단일화.** Neon도 표준 Postgres 프로토콜(풀드 커넥션 스트링)로 접속하므로
  로컬 docker와 코드 분기가 없다. @neondatabase/serverless 이원화 금지.
- **시드는 idempotent** — FK 역순 truncate 후 삽입(재실행 시 동일 상태). 시드 데이터 자체는 mulberry32
  시드 고정이라 값도 항상 동일. 실행은 `db:seed`를 명시적으로 돌릴 때만(앱 런과 무관), DB에 들어간
  뒤에는 행을 계속 재사용한다.
- **재실행 = 데모 초기화** — truncate 방식이므로 시드 이후 쌓인 실가입·실대화·usage_events도 함께
  지워진다. 로컬 리셋 용도로만 쓰고, 배포 DB에는 T7에서 초기 1회만 실행.
- **bcrypt 비용 주의** — 800명 시드 유저는 로그인 불가가 스펙이므로 bcrypt를 800번 돌리지 말고
  더미 문자열(`"!seed"` 등 해시 형식이 아닌 값)을 password_hash에 넣는다. 실제 해시는 데모 계정
  3종 + "세타 공식" 계정만 계산(비밀번호 `theta-demo`).
- **시드 구성**: 세타 공식 계정 1 → 플롯 12(owner=공식, visibility='public') → 유저 800(`is_seed=true`,
  기존 mocks의 국가/플랜/상태/토큰 유지) → 데모 계정 3 → daily_metrics 90일 → 공지 5 → 실험 3.
- gradient는 `gradient_from`/`gradient_to` 2컬럼으로 분해(mocks의 `[string, string]` 튜플).
- 기준일: mocks의 `TODAY`(2026-08-31)를 그대로 사용 — daily_metrics는 08-31까지, 실사용 데이터(T4)는
  실제 오늘부터 쌓이므로 날짜가 겹치지 않는다.

## 완료 기준

- `docker compose up -d` → `pnpm db:migrate && pnpm db:seed` 성공, **재실행해도 동일 상태**
- 카운트 검증: plots=12 · users=804(시드 800+데모 3+공식 1) · notices=5 · daily_metrics=90 · experiments=3
- "테스트" 섹션 전부 통과(`pnpm test`), `pnpm typecheck` 통과

## 검증 방법

```bash
docker compose up -d
pnpm db:migrate && pnpm db:seed && pnpm db:seed   # 두 번 실행
docker compose exec db psql -U postgres -d theta -c \
  "select (select count(*) from plots), (select count(*) from users), \
          (select count(*) from notices), (select count(*) from daily_metrics);"
```
