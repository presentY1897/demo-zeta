# T3 — 플롯 서버화: 공개 피드

- 상태: 대기 · 브랜치: `feature-plots-db` · 의존: T2 · 커밋 계획: 2개 — 플롯 API / 화면 전환
- 설계 근거: [server-design.md](../server-design.md) §4(API)·§5(화면 전환)

## 목표

이번 전환의 핵심. 유저가 만든 **공개 플롯을 다른 유저가 홈과 URL로 본다.** 만들기의
visibility 선택이 실제로 동작한다(기존 갭 ① 해소). localStorage 플롯 저장소는 사라진다.

## 범위

- **포함**: plots API 4개, 홈·프로필·만들기·my/plots 전환, 로컬 플롯 스토어 제거
- **제외**: 채팅방의 플롯 해석(T4에서 room과 함께 전환), 플롯 수정 화면(스코프 외 유지), 좋아요 기능

## 작업 항목

### API (커밋 1)

- [ ] `GET /api/plots?tag=` — `visibility='public'` 전체 + (로그인 시) 본인 비공개. 태그는 `tags @> ARRAY[..]`, 정렬 chats_count desc. 데모 규모라 페이징 없이 전체 반환
- [ ] `POST /api/plots` — 위저드 제출 바디 검증(이름 20자·소개 40자·페르소나 500자 등 기존 제한 그대로), **visibility 저장**, owner=세션 유저, suspended 403
- [ ] `GET /api/plots/[id]` — 비공개는 소유자만, 그 외·미존재는 404(존재 여부 구분 불가하게)
- [ ] `DELETE /api/plots/[id]` — 소유자만, chat_rooms·messages cascade 삭제

### 화면 전환 (커밋 2)

- [ ] 홈 — RSC 전환: searchParams로 태그 필터, 서버에서 공개+내 플롯 조회. 내 플롯 우선 정렬 유지, "MY" 배지 = owner_id 일치. 클라이언트 태그 칩은 라우터 push로
- [ ] 만들기 — 제출만 `POST /api/plots`로 교체(위저드 UI·검증 불변), 성공 시 새 프로필로 이동
- [ ] 플롯 프로필 — 서버 조회(비공개 가드 포함), `generateStaticParams`·클라이언트 해석(PlotProfileView의 usePlot) 제거, 동적 렌더로 전환
- [ ] my/plots — 본인 플롯 API 조회(비공개 포함, 비공개 표시 추가), 삭제는 DELETE API
- [ ] `lib/user-plots.ts`(theta-my-plots)·`lib/plots.ts`의 로컬 병합 로직 제거. 남은 참조 정리

## 테스트

- [ ] 통합(핸들러 직접 호출 + docker DB) —
  **가시성 매트릭스**: {공개, 비공개} × {소유자, 타인, 비로그인} × {목록, 단건} — 특히 비공개×타인=404(존재 여부 비노출), 비공개×소유자=보임 /
  POST: 비로그인 401·suspended 403·필드 제한 초과(이름 20자 등) 400·visibility 저장 확인 /
  DELETE: 타인 403, 성공 시 chat_rooms·messages cascade /
  태그 필터: `tags @>` 일치·불일치, 정렬(chats_count desc)
- [ ] **E2E 도입(이 티켓의 산출물)** — 루트 `e2e/` Playwright 설정(dev 서버 자동 기동, docker DB 시드 전제) + 시나리오 1: 가입 → 플롯 생성(공개) → 로그아웃 → 다른 계정 가입 → 홈에서 그 플롯 확인 → 비공개 플롯은 미노출

## 구현 노트

- 신규 플롯 id는 서버에서 uuid 발급(`u-` 로컬 id 체계 폐기). 시드된 정적 플롯 12개는 기존 id 유지 —
  기존 URL 형태가 그대로 살아 있다.
- 홈이 RSC가 되면 로그인 유저의 비공개 플롯 노출 여부가 요청마다 달라지므로 `force-dynamic`(또는
  `revalidate 0`)으로 캐시를 끈다.
- PlotNotFound 화면의 문구에서 "다른 브라우저에서 만든 플롯일 수 있어요"는 더 이상 사실이 아니므로
  "삭제됐거나 비공개 플롯이에요"로 교체.
- 만들기의 비로그인 가드는 T2의 세션 소스를 그대로 사용.

## 완료 기준

- 계정 A(브라우저 A)가 만든 **공개** 플롯이 계정 B(브라우저 B)의 홈·프로필 URL에서 보임
- **비공개** 플롯은 B의 홈에 없고 URL 직접 접근도 404, A 본인 홈·my/plots에는 보임
- 태그 필터·MY 배지·정렬 기존 동작 유지, 삭제 시 홈·프로필에서 사라짐
- `theta-my-plots` localStorage 키를 지워도 아무 화면도 깨지지 않음

## 검증 방법

- `pnpm test`(가시성 매트릭스 포함) + `pnpm e2e`(시나리오 1) — 완료 기준에 포함
- 수동: 시크릿 창 2개(계정 A/B)로 공개·비공개 확인, `pnpm typecheck && pnpm build`
