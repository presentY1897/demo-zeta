# Theta (θ) — AI 인터랙티브 스토리 플랫폼 데모

AI 캐릭터와 실시간으로 상호작용하며 나만의 이야기를 만들어가는 인터랙티브 엔터테인먼트 서비스 데모 프로젝트입니다.
유저 대상 웹 서비스와 운영을 위한 오피스(어드민)를 모노레포로 구성했습니다.

## 구조

```
apps/
  web/      # 유저 웹 앱 (모바일 퍼스트, :3000)
  office/   # 운영 오피스 — 지표/유저/비용 관리 (:3001)
packages/
  ui/       # 공통 디자인 시스템
  mocks/    # 시드 기반 모킹 데이터
  config/   # 공유 tsconfig
```

## 실행

```bash
pnpm install
pnpm dev          # web(:3000) + office(:3001) 동시 실행
pnpm dev:web      # 유저 앱만
pnpm dev:office   # 오피스만
```

## 개발 워크플로

- 브랜치: `main` + `feature-*`. 기능 단위로 브랜치를 만들어 작업합니다.
- 병합: `feature-*`를 `main` 위로 rebase 한 뒤 fast-forward로만 병합합니다 (`merge.ff=only`).
- 로컬 저장소는 bare(`.bare`) + `git worktree` 레이아웃으로 브랜치별 디렉터리를 병렬 운용합니다.

문서는 작업이 진행되며 업데이트됩니다.
