type TokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  token_type?: string;
};

export type ConstantContactEmailActivityInput = {
  format_type: 5;
  from_email: string;
  from_name: string;
  html_content: string;
  preheader?: string;
  reply_to_email: string;
  subject: string;
};

export type ConstantContactCreateEmailPayload = {
  name: string;
  email_campaign_activities: ConstantContactEmailActivityInput[];
};

let cachedAccessToken: {
  accessToken: string;
  expiresAt: number;
} | null = null;

export function hasConstantContactRefreshToken() {
  return Boolean(process.env.CONSTANT_CONTACT_REFRESH_TOKEN);
}

export function getConstantContactConfig() {
  const clientId = requireEnv("CONSTANT_CONTACT_CLIENT_ID");
  const clientSecret = requireEnv("CONSTANT_CONTACT_CLIENT_SECRET");
  const redirectUri = requireEnv("CONSTANT_CONTACT_REDIRECT_URI");

  return {
    apiBaseUrl: process.env.CONSTANT_CONTACT_API_BASE_URL ?? "https://api.cc.email/v3",
    authBaseUrl:
      process.env.CONSTANT_CONTACT_AUTH_BASE_URL ??
      "https://authz.constantcontact.com/oauth2/default/v1/authorize",
    clientId,
    clientSecret,
    redirectUri,
    tokenUrl:
      process.env.CONSTANT_CONTACT_TOKEN_URL ??
      "https://authz.constantcontact.com/oauth2/default/v1/token",
  };
}

export function buildConstantContactAuthorizationUrl(state: string) {
  const config = getConstantContactConfig();
  const url = new URL(config.authBaseUrl);

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "campaign_data offline_access");
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeConstantContactAuthorizationCode(code: string) {
  const config = getConstantContactConfig();
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });

  return requestConstantContactToken(body);
}

export async function refreshConstantContactAccessToken() {
  const now = Date.now();

  if (cachedAccessToken && cachedAccessToken.expiresAt - now > 60_000) {
    return cachedAccessToken.accessToken;
  }

  const refreshToken = requireEnv("CONSTANT_CONTACT_REFRESH_TOKEN");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const tokenResponse = await requestConstantContactToken(body);
  const expiresIn = tokenResponse.expires_in ?? 7200;

  // TODO: Replace env-based refresh token storage with encrypted database storage.
  // Constant Contact can rotate refresh tokens; production should persist replacements securely.
  if (
    process.env.NODE_ENV !== "production" &&
    tokenResponse.refresh_token &&
    tokenResponse.refresh_token !== refreshToken
  ) {
    console.warn(
      "Constant Contact returned a replacement refresh token. Update CONSTANT_CONTACT_REFRESH_TOKEN in .env.local and restart the app. Do not share it:",
      tokenResponse.refresh_token
    );
  }

  cachedAccessToken = {
    accessToken: tokenResponse.access_token,
    expiresAt: now + expiresIn * 1000,
  };

  return tokenResponse.access_token;
}

export async function createConstantContactEmailDraft(
  payload: ConstantContactCreateEmailPayload
) {
  const config = getConstantContactConfig();
  const accessToken = await refreshConstantContactAccessToken();
  const response = await fetch(`${config.apiBaseUrl}/emails`, {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const responseText = await response.text();
  const responseBody = parseJson(responseText);

  if (!response.ok) {
    throw new ConstantContactApiError(
      "Constant Contact rejected the draft request.",
      response.status,
      responseBody ?? responseText
    );
  }

  return responseBody;
}

async function requestConstantContactToken(body: URLSearchParams): Promise<TokenResponse> {
  const config = getConstantContactConfig();
  const response = await fetch(config.tokenUrl, {
    body,
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${config.clientId}:${config.clientSecret}`
      ).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const responseText = await response.text();
  const responseBody = parseJson(responseText);

  if (!response.ok) {
    throw new ConstantContactApiError(
      "Constant Contact token request failed.",
      response.status,
      responseBody ?? responseText
    );
  }

  if (!responseBody?.access_token) {
    throw new Error("Constant Contact token response did not include an access token.");
  }

  return responseBody as TokenResponse;
}

function parseJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

export class ConstantContactApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details: unknown
  ) {
    super(message);
  }
}
