import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

/**
 * Obtém um Access Token do Google usando a Service Account para o FCM V1.
 * Versão v7: Usando 'jose' para evitar erros de polyfill de crypto no Deno.
 */
export async function getAccessToken(serviceAccount: any): Promise<string> {
  const { client_email, private_key } = serviceAccount;

  if (!client_email || !private_key) {
    throw new Error('Service Account incompleta. Verifique private_key e client_email.');
  }

  try {
    // 1. Importar a chave privada
    const signingKey = await jose.importPKCS8(private_key, 'RS256');

    // 2. Criar e assinar o JWT
    const jwt = await new jose.SignJWT({
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(client_email)
      .setAudience('https://oauth2.googleapis.com/token')
      .setExpirationTime('1h')
      .setIssuedAt()
      .sign(signingKey);

    // 3. Trocar o JWT pelo Access Token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`OAuth Error: ${data.error_description || data.error}`);
    }

    return data.access_token;
  } catch (error) {
    console.error('v7: Erro ao gerar token Google Auth:', error);
    throw new Error(`GOOGLE_AUTH_ERROR ${error.message}`);
  }
}
