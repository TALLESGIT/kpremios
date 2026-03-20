import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.1/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

// Função para obter o Token de Acesso do Google (OAuth2) usando RS256
async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const iat = getNumericDate(0);
  const exp = getNumericDate(3600); // 1 hora de validade

  // Importar a chave privada RS256
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = serviceAccount.private_key
    .replace(/\\n/g, "\n")
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");

  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
    },
    key
  );

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const result = await response.json();
  if (!result.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(result)}`);
  }
  return result.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    const { title, body, data, user_ids, exclude_user_ids, image } = payload

    console.log(`🔔 Evento recebido: ${title} - ${body}${user_ids ? ` (para ${user_ids.length} usuários)` : ' (broadcast)'}`)

    // 1. Obter os tokens de push cadastrados
    let tokensQuery = supabaseClient.from('user_push_tokens').select('token')
    
    if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
      tokensQuery = tokensQuery.in('user_id', user_ids)
    }

    if (exclude_user_ids && Array.isArray(exclude_user_ids) && exclude_user_ids.length > 0) {
      tokensQuery = tokensQuery.not('user_id', 'in', `(${exclude_user_ids.map(id => `"${id}"`).join(',')})`)
    }

    const { data: tokens, error: tokenError } = await tokensQuery

    if (tokenError) throw tokenError
    if (!tokens || tokens.length === 0) {
      console.log('ℹ️ Nenhum token de dispositivo encontrado para o envio.')
      return new Response(JSON.stringify({ message: 'No tokens found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const registrationTokens = [...new Set(tokens.map(t => t.token))].filter(Boolean)
    console.log(`📲 Enviando para ${registrationTokens.length} dispositivos...`)

    // 2. Configurar credenciais do Firebase (via Secret)
    const firebaseAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!firebaseAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT secret is not configured in Supabase')
    }

    const serviceAccount: ServiceAccount = JSON.parse(firebaseAccountJson)
    const accessToken = await getAccessToken(serviceAccount)

    const projectId = serviceAccount.project_id
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`

    // 3. Enviar notificações individualmente
    const sendPromises = registrationTokens.map(async (token) => {
      try {
        const response = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: token,
              notification: { 
                title, 
                body,
                image: image || "https://www.zkoficial.com.br/icons/icon-512.webp"
              },
              data: data || {},
              android: { 
                priority: "high", 
                notification: { 
                  sound: "default",
                  image: image || "https://www.zkoficial.com.br/icons/icon-512.webp",
                  channelId: "high_priority"
                } 
              },
              apns: { 
                payload: { 
                  aps: { 
                    sound: "default", 
                    badge: 1,
                    'mutable-content': 1
                  } 
                },
                fcm_options: {
                  image: image || "https://www.zkoficial.com.br/icons/icon-512.webp"
                }
              }
            }
          })
        })

        const result = await response.json()
        if (!response.ok) {
          console.error(`❌ Erro ao enviar para token ${token.substring(0, 10)}...:`, result)
          return { token: token.substring(0, 10), status: response.status, error: result?.error?.message || 'FCM Error' }
        }
        return { token: token.substring(0, 10), status: response.status }
      } catch (e) {
        console.error(`❌ Falha na requisição FCM para token ${token.substring(0, 10)}:`, e.message)
        return { token: token.substring(0, 10), error: e.message }
      }
    })

    const results = await Promise.all(sendPromises)
    const successCount = results.filter(r => r.status === 200).length
    const errors = results.filter(r => r.status !== 200).slice(0, 5) // Pegar até 5 erros para debug

    console.log(`✅ Processo concluído. Sucessos: ${successCount}/${registrationTokens.length}`)

    return new Response(JSON.stringify({
      success: true,
      sent: successCount,
      total: registrationTokens.length,
      sample_errors: errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('❌ Erro crítico na função notify-events:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
