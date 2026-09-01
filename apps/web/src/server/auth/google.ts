import { createHash, randomBytes } from "node:crypto";

/**
 * 구글 로그인 — 라이브러리 없이 표준 authorization code flow + PKCE 2엔드포인트로 구현한다.
 * 비민감 스코프(openid·email·profile)만 쓰므로 동의 화면을 프로덕션 게시해도 구글 심사가 필요 없다.
 * 콘솔 설정 절차는 docs/setup-google-oauth.md 참고.
 */
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SCOPE = "openid email profile";

export const GOOGLE_STATE_COOKIE = "theta_g_state";
export const GOOGLE_VERIFIER_COOKIE = "theta_g_verifier";

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
}

/** 키가 없으면 null — 호출부는 버튼을 숨기거나 404로 응답한다 */
export function googleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function callbackUrl(req: Request): string {
  return new URL("/api/auth/google/callback", req.url).toString();
}

export interface AuthorizationRequest {
  url: string;
  state: string;
  codeVerifier: string;
}

export function createAuthorizationRequest(
  clientId: string,
  redirectUri: string,
): AuthorizationRequest {
  const state = randomBytes(16).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  // 계정 선택을 매번 띄워 여러 계정 테스트가 쉽도록
  url.searchParams.set("prompt", "select_account");

  return { url: url.toString(), state, codeVerifier };
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  name?: string;
}

/** id_token의 payload를 읽는다. 토큰은 구글과의 직접 통신(TLS)으로 받았으므로 서명 검증은 생략한다 */
export function decodeIdToken(idToken: string): GoogleIdentity | null {
  const payload = idToken.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub?: string;
      email?: string;
      name?: string;
      email_verified?: boolean;
    };
    if (!json.sub || !json.email) return null;
    return { sub: json.sub, email: json.email, name: json.name };
  } catch {
    return null;
  }
}

export type ExchangeResult =
  | { ok: true; identity: GoogleIdentity }
  | { ok: false; message: string };

/** 코드 → 토큰 교환(서버 간 통신). 테스트에서는 fetch를 목킹한다 */
export async function exchangeCode(
  config: GoogleConfig,
  params: { code: string; codeVerifier: string; redirectUri: string },
): Promise<ExchangeResult> {
  let res: Response;
  try {
    res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: params.code,
        code_verifier: params.codeVerifier,
        redirect_uri: params.redirectUri,
        grant_type: "authorization_code",
      }),
    });
  } catch {
    return { ok: false, message: "구글 서버에 연결하지 못했어요." };
  }

  if (!res.ok) return { ok: false, message: "구글 로그인에 실패했어요. 다시 시도해 주세요." };

  const data = (await res.json().catch(() => null)) as { id_token?: string } | null;
  const identity = data?.id_token ? decodeIdToken(data.id_token) : null;
  if (!identity) return { ok: false, message: "구글 계정 정보를 읽지 못했어요." };
  return { ok: true, identity };
}
