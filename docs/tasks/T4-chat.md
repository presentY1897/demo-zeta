# T4 — 채팅 영속화

- 상태: 대기 · 브랜치: `feature-chat-db` · 의존: T3 · 커밋 계획: 2개 — rooms·chat API / 화면 전환
- 설계 근거: [server-design.md](../server-design.md) §4(/api/chat 개편)·§6(실사용 지표)
- ⚠️ **최대 리스크 티켓** — 스트리밍 도중 저장·중단 경로가 핵심 난점. 밀리면 T5·T6을 09-02 오전으로 미룬다.

## 목표

대화가 서버에 남고 기기 간 동기화된다. 기존 채팅 UX — 스트리밍 렌더링, 중단(부분 보존),
재생성, 마지막 메시지 수정/다시 보내기, 초기화 — 는 체감상 그대로다. 응답마다 usage_events가
쌓여 T6의 실사용 지표 원천이 된다.

## 범위

- **포함**: rooms API 4개, /api/chat 영속화, 채팅방·대화 목록 전환, usage_events 기록
- **제외**: BYOK 통과·SSE 변환·20초 타임아웃·모의 응답 로직(불변), 지표 화면(T6), 방 삭제 UI(플롯 삭제 cascade로 충분)

## 작업 항목

### API (커밋 1)

- [ ] `GET /api/rooms` — 내 방 목록 + 마지막 메시지 + 플롯 요약(이름·이모지·그라디언트), updated_at desc
- [ ] `POST /api/rooms {plotId}` — 방 개설: 플롯 접근 가능(공개 또는 소유) 검증, 첫 메시지를 seq 0으로 저장, plots.chats_count +1. `UNIQUE(user_id, plot_id)` 충돌 시 기존 방 반환(idempotent)
- [ ] `DELETE /api/rooms/[id]/messages?fromSeq=n` — n≥1 검증(첫 메시지 보호), n부터 끝까지 삭제
- [ ] `POST /api/rooms/[id]/reset` — seq 0만 남기고 삭제, updated_at 갱신
- [ ] `/api/chat` 개편 — 요청에 `roomId` 추가. 순서: 세션 확인(suspended 403) → 방 소유 검증 → user 메시지 저장 → 업스트림 스트리밍 시작 → **TransformStream으로 통과분 버퍼 누적** → 종료 시 assistant 메시지 저장 + usage_events 1행 + updated_at → 빈 응답이면 user 메시지 롤백 없이 assistant 미저장(기존 "빈 응답" 에러 UX 유지)
- [ ] 중단 경로 — 클라이언트 abort(`req.signal`)·업스트림 cancel 모두에서 **부분 버퍼를 `interrupted=true`로 저장**. 응답 스트림 종료 후 저장이 실행되도록 Next 15 `after()`(또는 cancel/flush 콜백)로 보장
- [ ] usage_events — provider_kind·model(설정값, mock이면 'mock')·est_input_tokens(시스템+메시지 글자수 기반)·est_output_tokens(응답 글자수 기반). 추정 계수는 상수로 분리

### 화면 전환 (커밋 2)

- [ ] ChatRoomLoader — 진입 시 방 조회/개설(POST /api/rooms), 메시지 초기 로드
- [ ] ChatRoom — 전송 시 roomId 포함, 재생성=DELETE fromSeq(마지막 assistant)+재요청, 수정/다시 보내기=DELETE fromSeq(해당 user 메시지)+재전송, 초기화=reset API. 옵티미스틱 렌더 유지(전송 직후 화면 먼저, 실패 시 롤백)
- [ ] 대화 목록 — `GET /api/rooms` 기반, 미리보기·상대 시간 로직 재사용
- [ ] `theta-chats` 스토어를 서버 데이터 캐시로 축소(persist 제거 또는 캐시 전용), 사라진 액션 정리

## 테스트

- [ ] 유닛 — `sseToTextStream`(청크 경계에서 잘린 JSON·`[DONE]`·불완전 라인 스킵 — 기존 계획 이관) / 토큰 추정 함수(입력·출력, 계수 상수) / roleplay 지문 파싱(미닫힘 별표)
- [ ] 통합(docker DB) —
  rooms: 개설 시 첫 메시지 seq 0 저장·chats_count +1·재호출 idempotent(기존 방 반환) /
  fromSeq: 0 거부, 중간 절단 후 남은 seq 검증 / reset: seq 0만 잔존 /
  **/api/chat mock 경로 전체**: user·assistant 메시지 저장, usage_events +1(추정 토큰 값 포함), updated_at 갱신, 빈 응답 시 assistant 미저장 /
  **중단**: 스트리밍 도중 abort → 부분 내용이 `interrupted=true`로 저장 /
  권한: 비로그인 401, 타인 방 403, suspended 403
- [ ] E2E 시나리오 추가 — 채팅 전송 → 스트리밍 렌더 → 새로고침 후 대화 유지 → 중단 시 부분 보존 표시 → 재생성·수정 동작

## 구현 노트

- seq 채번은 방별 `max(seq)+1`을 삽입 트랜잭션 안에서 — 동시 전송은 UI상 불가능하지만 UNIQUE(room_id, seq)가 최종 방어선.
- 서버 재시작·함수 조기 종료로 저장이 유실될 수 있는 구간은 "user 메시지는 저장됐고 assistant만 없음" —
  이 상태는 기존 "재시도" 버튼 UX가 자연 복구하므로 별도 처리 불요(노트로 README에).
- 모의 모드도 동일 경로로 저장·기록된다(리뷰어가 키 없이도 실사용 지표를 만들 수 있음 — T6 검증에 사용).

## 완료 기준

- 모의 모드 대화 → 새로고침·다른 브라우저 로그인에도 대화 그대로
- 스트리밍 중단 → 부분 응답이 DB에 `interrupted=true`로 남고 화면 표시 유지
- 수정/다시 보내기·재생성·초기화 후 DB와 화면 일치(psql로 seq 확인)
- assistant 응답(중단 포함)마다 usage_events +1, 제재 계정은 /api/chat 403
- BYOK 실제 프로바이더 경로 1회 이상 확인(또는 Ollama)

## 검증 방법

- `pnpm test`(중단 저장 포함) + `pnpm e2e` — 완료 기준에 포함. 중단 통합 테스트는 mock 스트림의 타이핑 지연 도중 AbortController로 재현
- 수동: BYOK 실 프로바이더(또는 Ollama) 1회 — 실연동은 자동화 불가 구간
- `pnpm typecheck && pnpm build`
