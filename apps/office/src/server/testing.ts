import { ADMIN_COOKIE, issueAdminToken } from "./admin-auth";

/** 통합 테스트용 — 핸들러에 바로 넘길 Request를 만든다 (dev 서버 불요) */
export interface TestRequestOptions {
  method?: string;
  body?: unknown;
  /** true면 유효한 admin 쿠키를 실어 보낸다 */
  admin?: boolean;
}

export function apiRequest(url: string, options: TestRequestOptions = {}): Request {
  const headers = new Headers();
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.admin)
    headers.set("cookie", `${ADMIN_COOKIE}=${encodeURIComponent(issueAdminToken().token)}`);

  return new Request(url, {
    method: options.method ?? "GET",
    headers,
    body:
      options.body === undefined
        ? undefined
        : typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body),
  });
}

/** Next 동적 라우트의 두 번째 인자 */
export function routeContext<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}
