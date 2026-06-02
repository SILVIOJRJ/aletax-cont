const ZAPSIGN_TOKEN = process.env.ZAPSIGN_TOKEN!;
const BASE_URL = "https://api.zapsign.com.br/api/v1";

interface ZapSignSigner {
  name: string;
  email: string;
}

interface CreateDocumentParams {
  name: string;
  base64_pdf?: string;
  url_pdf?: string;
  signers: ZapSignSigner[];
}

interface ZapSignSignerResult {
  token: string;
  name: string;
  email: string;
  status: string;
  sign_url: string;
}

interface CreateDocumentResult {
  token: string;
  request_signature_link: string;
  signers: ZapSignSignerResult[];
}

interface GetDocumentResult {
  token: string;
  status: string;
  name: string;
  signers: ZapSignSignerResult[];
  created_at: string;
  last_update_at: string;
}

export async function createDocument(
  params: CreateDocumentParams
): Promise<CreateDocumentResult> {
  const response = await fetch(`${BASE_URL}/docs/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ZAPSIGN_TOKEN}`,
    },
    body: JSON.stringify({
      name: params.name,
      ...(params.base64_pdf ? { base64_pdf: params.base64_pdf } : {}),
      ...(params.url_pdf ? { url_pdf: params.url_pdf } : {}),
      signers: params.signers,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `ZapSign createDocument failed (${response.status}): ${error}`
    );
  }

  return response.json() as Promise<CreateDocumentResult>;
}

export async function getDocument(docToken: string): Promise<GetDocumentResult> {
  const response = await fetch(`${BASE_URL}/docs/${docToken}/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${ZAPSIGN_TOKEN}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `ZapSign getDocument failed (${response.status}): ${error}`
    );
  }

  return response.json() as Promise<GetDocumentResult>;
}
