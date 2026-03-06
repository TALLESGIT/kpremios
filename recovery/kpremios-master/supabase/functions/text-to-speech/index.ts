
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

// Configuração do Google Cloud
// A chave deve ser salva como Secret no Supabase: GOOGLE_SERVICE_ACCOUNT_JSON
const getAccessToken = async () => {
    try {
        const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
        if (!serviceAccountJson) {
            throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not found')
        }

        const serviceAccount = JSON.parse(serviceAccountJson)

        // Criar JWT para autenticação
        const iat = Math.floor(Date.now() / 1000)
        const exp = iat + 3600 // 1 hora de expiração

        const header = {
            alg: 'RS256',
            typ: 'JWT'
        }

        const claimSet = {
            iss: serviceAccount.client_email,
            scope: 'https://www.googleapis.com/auth/cloud-platform',
            aud: 'https://oauth2.googleapis.com/token',
            exp,
            iat
        }

        // Função auxiliar para base64url encode
        const base64UrlEncode = (str: string) => {
            return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
        }

        const encodedHeader = base64UrlEncode(JSON.stringify(header))
        const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet))

        // Assinar JWT
        const key = serviceAccount.private_key
        const pemHeader = "-----BEGIN PRIVATE KEY-----"
        const pemFooter = "-----END PRIVATE KEY-----"
        const pemContents = key.substring(pemHeader.length, key.length - pemFooter.length).replace(/\s/g, "")

        // Decodificar chave privada PEM para formato binário
        const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

        const algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }
        const cryptoKey = await crypto.subtle.importKey(
            "pkcs8",
            binaryKey,
            algorithm,
            false,
            ["sign"]
        )

        const signatureInput = `${encodedHeader}.${encodedClaimSet}`
        const signature = await crypto.subtle.sign(
            algorithm.name,
            cryptoKey,
            new TextEncoder().encode(signatureInput)
        )

        const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))
        const jwt = `${encodedHeader}.${encodedClaimSet}.${encodedSignature}`

        // Trocar JWT por Access Token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
        })

        const tokenData = await tokenResponse.json()
        return tokenData.access_token

    } catch (error) {
        console.error('Erro ao gerar token:', error)
        throw error
    }
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { text, languageCode = 'pt-BR', voiceName, speakingRate = 0.7 } = await req.json()

        if (!text) {
            throw new Error('Text is required')
        }

        const accessToken = await getAccessToken()

        const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: { text },
                voice: {
                    languageCode,
                    // Se não passar voiceName, usar pt-BR-Neural2-A como padrão (voz neural masculina de alta qualidade)
                    // Opções: pt-BR-Neural2-A (Fem), pt-BR-Neural2-B (Masc), pt-BR-Neural2-C (Fem)
                    name: voiceName || 'pt-BR-Neural2-B'
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate,
                    pitch: 0.0,
                    volumeGainDb: 0.0
                }
            })
        })

        const data = await response.json()

        if (data.error) {
            console.error('Google API Error:', data.error)
            throw new Error(data.error.message)
        }

        return new Response(
            JSON.stringify(data),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            }
        )
    }
})
