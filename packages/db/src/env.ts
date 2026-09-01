import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";

/**
 * 모노레포 루트의 `.env`를 찾아 로드한다.
 * 앱(next.config)과 스크립트가 같은 파일 하나만 보게 해서 env 사본이 흩어지지 않게 한다.
 */
export function loadRootEnv(startDir = process.cwd()): string | null {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, ".env");
    if (existsSync(candidate)) {
      config({ path: candidate });
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
