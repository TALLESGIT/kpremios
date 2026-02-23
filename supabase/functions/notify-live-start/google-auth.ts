import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts"

/**
 * Obtém um Access Token do Google usando a Service Account para o FCM V1.
 */
export async function getAccessToken(serviceAccount: any): Promise<string> {
  const { client_email, private_key } = serviceAccount

  if (!client_email || !private_key) {
    throw new Error('Service Account incompleta. Verifique private_key e client_email.')
  }

  // Prepara o JWT para a requisição do token
  const payload = {
    iss: client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: getNumericDate(3600), // expira em 1 hora
    iat: getNumericDate(0),
  }

  // O private_key do JSON vem com \n, precisamos converter para CryptoKey
  const pem = private_key.replace(/\\n/g, '\n')
  const cryptoKey = await importPrivateKey(pem)

  const jwt = await create({ alg: 'RS256', typ: 'JWT' }, payload, cryptoKey)

  // Faz a troca do JWT pelo Access Token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const data = await response.json()
  if (data.error) {
    throw new Error(`Erro OAuth Google: ${data.error_description || data.error}`)
  }

  return data.access_token
}

async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const binaryDer = pemToBinary(pem)
  return await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  )
}

function pemToBinary(pem: string): ArrayBuffer {
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}
