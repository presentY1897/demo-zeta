# T7 — 배포: Neon·Vercel

- 상태: 대기 · 브랜치: 없음(설정 작업, 코드 변경 생기면 `chore` 커밋) · 의존: T1~T6
- ⚠️ **Neon·Vercel 계정 로그인이 필요해 유저와 함께 진행하는 티켓** (CLI 인증 또는 콘솔 작업)
- 설계 근거: [server-design.md](../server-design.md) §1(아키텍처)·§7(일정)

## 목표

공개 URL 2개(web·office)에서 전체 기능이 동작한다. 리뷰어는 URL 접속 → 데모 계정 원클릭 →
바로 체험이 가능하다.

## 범위

- **포함**: Neon 프로비저닝·시드, Vercel 프로젝트 2개 설정, 배포 스모크, README 배포 섹션
- **제외**: 커스텀 도메인, 모니터링/알림, 프리뷰 배포 파이프라인

## 작업 항목

- [ ] Neon 프로젝트 생성 → **풀드(pooled) 커넥션 스트링** 확보 (pg Pool + 서버리스 특성상 필수)
- [ ] 로컬에서 Neon URL로 `db:migrate` + `db:seed` 실행, 카운트 검증(T1과 동일 기준)
- [ ] Vercel 프로젝트 2개 — 모노레포 root directory를 각각 `apps/web` / `apps/office`로 지정, pnpm+turbo 빌드 확인
- [ ] 환경변수 — 두 프로젝트에 `DATABASE_URL`(동일 Neon), web에 `SESSION_SECRET`·`GOOGLE_CLIENT_ID`·`GOOGLE_CLIENT_SECRET`, office에 `ADMIN_PASSWORD`(+ 서명용 `SESSION_SECRET`)
- [ ] Google 콘솔 — OAuth 클라이언트의 redirect URI에 프로덕션 도메인 콜백 추가(로컬 것과 병기), 동의 화면 프로덕션 게시(비민감 스코프라 심사 불요)
- [ ] 프로덕션 배포 → 배포 스모크(아래) 전 항목
- [ ] README — 배포 URL 2개, 데모 계정(`theta-demo`), admin 접근 안내(비밀번호는 README에 쓰지 않음). **체험 경로를 2트랙으로 명시**: ① 기본 — 배포 URL 접속(설치 불요, 리뷰어 주 경로), ② 선택 — 로컬 실행(docker + `.env.example` 복사만으로 동작, env 키는 필요할 때만: 키별 역할·미설정 시 동작 표 + `docs/setup-google-oauth.md` 링크)

## 배포 스모크 (완료 기준)

1. web 접속 → 데모 계정 원클릭 로그인
2. 신규 가입(별도 시크릿 창) → 플롯 생성(공개) → 데모 계정 홈에서 그 플롯 확인. Google 로그인도 1회 왕복
3. 모의 모드 채팅 → 새로고침 후 대화 유지 → 중단 시 부분 보존
4. (선택) BYOK 키로 실제 프로바이더 1회
5. office 접속 → admin 로그인 → 공지 작성 → web에 반영 확인
6. office 유저 목록에서 2번의 신규 계정 검색 → 제재 → 해당 계정 로그인 차단 확인 → 해제
7. 대시보드 오늘 날짜에 3번 채팅의 턴·DAU 반영 확인

## 테스트

- [ ] T3~T6에서 누적한 **Playwright 스위트를 `BASE_URL=배포 URL`로 재실행** — 구글 실로그인 등 써드파티 구간만 제외. 배포 환경(서버리스·Neon)에서 스트리밍·세션이 로컬과 동일함을 자동으로 확인
- [ ] 위 배포 스모크 체크리스트는 수동으로 1회 병행(E2E가 못 덮는 BYOK 실 프로바이더·구글 로그인)

## 구현 노트

- 시드는 배포 파이프라인이 아니라 **로컬에서 1회 수동 실행** — 서버리스 빌드 단계에서 DB를 만지지 않는다.
- Vercel의 함수 리전과 Neon 리전을 맞춘다(레이턴시). 둘 다 아시아(도쿄/싱가포르) 권장.
- `x-accel-buffering: no` 등 기존 스트리밍 헤더는 Vercel에서도 유효 — 배포 후 스트리밍이 버퍼링되지 않는지 3번에서 확인.
- 실패 시 롤백은 Vercel 이전 배포 승격으로 충분(DB 마이그레이션은 초기 1회라 롤백 시나리오 없음).
