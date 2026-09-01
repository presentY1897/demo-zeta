import type { NextConfig } from "next";
import { loadRootEnv } from "@theta/db/env";

// 모노레포 루트의 .env 하나만 쓴다 — Next는 앱 디렉터리만 보므로 여기서 직접 로드한다
loadRootEnv(process.cwd());

const nextConfig: NextConfig = {
  transpilePackages: ["@theta/ui", "@theta/mocks", "@theta/db"],
  // 서버 전용 네이티브/CJS 의존성은 번들에서 제외한다
  serverExternalPackages: ["pg", "bcryptjs"],
};

export default nextConfig;
