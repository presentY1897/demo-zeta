# 서버화 작업 목록

설계 원본: [../server-design.md](../server-design.md) · 티켓별 상세는 각 문서 참조.

| 티켓 | 이름 | 브랜치 | 의존 | 상태 |
| --- | --- | --- | --- | --- |
| [T1](./T1-db.md) | packages/db — 스키마·시드·로컬 DB | `feature-db` | — | **완료** |
| [T2](./T2-auth.md) | 인증 — 가입·세션·admin 가드 | `feature-auth` | T1 | 대기 |
| [T3](./T3-plots.md) | 플롯 서버화 — 공개 피드 | `feature-plots-db` | T2 | 대기 |
| [T4](./T4-chat.md) | 채팅 영속화 | `feature-chat-db` | T3 | 대기 |
| [T5](./T5-notices.md) | 공지 연동 — 오피스↔웹 | `feature-notices-db` | T2 | 대기 |
| [T6](./T6-office.md) | 오피스 실데이터화 | `feature-office-db` | T4, T2 | 대기 |
| [T7](./T7-deploy.md) | 배포 — Neon·Vercel | (설정 작업) | T1~T6 | 대기 |
| [T8](./T8-cover-images.md) | 커버 이미지 업로드 | `feature-cover-images` | T3 | 대기 |

```
T1(db) ─→ T2(인증) ─→ T3(플롯) ─→ T4(채팅) ─→ T6(오피스) ─→ T7(배포)
                └────→ T5(공지) ──────────────────┘
                       T3 ─→ T8(커버 이미지) — T7 전 권장, 밀리면 09-02 후 재배포
```

## 공통 규칙

- 티켓 1개 = worktree 브랜치 1개 = rebase → ff 병합 1회. 새 worktree에서는 `pnpm install` 필요.
- 병합 전 검증: `pnpm typecheck && pnpm build && pnpm test` + dev 구동 수동 확인 + 티켓의 "완료 기준" 전 항목.

## 테스트 원칙

- **티켓마다 "테스트" 섹션이 있고, 그 전부의 통과가 완료 기준에 포함된다** — 테스트를 뒤로 미루지 않는다.
- 유닛·DB 통합 테스트(Vitest)는 전 티켓 필수. 기반(루트 설정·DB 테스트 헬퍼)은 T1에서 구축.
- 통합 테스트는 로컬 docker DB(`TEST_DATABASE_URL`) 대상, truncate 리셋 + 직렬 실행(경합 방지).
  Route Handler는 함수로 직접 호출해 테스트한다(dev 서버 불요) — 인증 코어를 next/headers 비의존으로
  설계하는 이유(T2 구현 노트).
- E2E(Playwright)는 T3에서 도입하고 T3→T6 티켓마다 시나리오를 누적한다. T7에서 같은 스위트를
  배포 URL로 재실행.
- `pnpm test` / `pnpm e2e` — 09-02의 CI는 이 명령을 그대로 실행하는 것.
- 티켓 완료 시 이 표의 상태를 갱신한다 (대기 → 진행 → 완료).
- T5는 T2만 있으면 T3·T4와 독립적으로 진행 가능. T7은 Neon·Vercel 계정 인증이 필요해 유저와 함께 진행.
