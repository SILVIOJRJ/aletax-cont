const CORA_CLIENT_ID = process.env.CORA_CLIENT_ID!;
const CORA_CLIENT_SECRET = process.env.CORA_CLIENT_SECRET!;
const CORA_ENVIRONMENT = process.env.CORA_ENVIRONMENT ?? "sandbox";

const isSandbox = CORA_ENVIRONMENT !== "production";

const TOKEN_URL = isSandbox
  ? "https://matls-clients.sandbox.cora.com.br/token"
  : "https://matls-clients.cora.com.br/token";

const API_BASE_URL = isSandbox
  ? "https://sandbox.cora.com.br"
  : "https://api.cora.com.br";

// ─── Token cache ──────────────────────────────────────────────────────────────

interface TokenCache {
  accessToken: string;
  expiresAt: number; // Unix ms
}

let tokenCache: TokenCache | null = null;

export async function getToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid (with 60 s buffer)
  if (tokenCache && tokenCache.expiresAt - 60_000 > now) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CORA_CLIENT_ID,
    client_secret: CORA_CLIENT_SECRET,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cora getToken failed (${response.status}): ${error}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return tokenCache.accessToken;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CoraCustomerDocument {
  identity: string;
  type: "CPF" | "CPJ"; // CPJ = CNPJ on Cora's API
}

interface CoraCustomer {
  name: string;
  email?: string;
  document: CoraCustomerDocument;
}

interface CoraPaymentTerms {
  max_due_date_gap?: number;
}

interface CoraNotifications {
  send_only_payment_receipts?: boolean;
}

export interface CreateBoletoParams {
  code: string;
  amount: number; // centavos
  due_date: string; // YYYY-MM-DD
  payment_terms?: CoraPaymentTerms;
  customer: CoraCustomer;
  notifications?: CoraNotifications;
}

export interface CoraBoletoResult {
  id: string;
  payment_link: string;
  digitable_line: string;
  status: string;
  [key: string]: unknown;
}

// ─── API functions ────────────────────────────────────────────────────────────

export async function createBoleto(
  params: CreateBoletoParams
): Promise<CoraBoletoResult> {
  const token = await getToken();

  const response = await fetch(`${API_BASE_URL}/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cora createBoleto failed (${response.status}): ${error}`);
  }

  return response.json() as Promise<CoraBoletoResult>;
}

export async function cancelBoleto(coraId: string): Promise<void> {
  const token = await getToken();

  const response = await fetch(`${API_BASE_URL}/invoices/${coraId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cora cancelBoleto failed (${response.status}): ${error}`);
  }
}
