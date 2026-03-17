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

async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const iat = getNumericDate(0);
  const exp = getNumericDate(3600);
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
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
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
  if (!result.access_token) throw new Error(`Failed to get access token: ${JSON.stringify(result)}`);
  return result.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Identificar VIPs que expiram nos próximos 3 dias
    const today = new Date();
    const inThreeDays = new Date();
    inThreeDays.setDate(today.getDate() + 3);

    const { data: expiringVips, error: vipError } = await supabaseClient
      .from('users')
      .select('id, name, vip_expires_at')
      .eq('is_vip', true)
      .gte('vip_expires_at', today.toISOString())
      .lte('vip_expires_at', inThreeDays.toISOString());

    if (vipError) throw vipError;

    if (!expiringVips || expiringVips.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum VIP expirando em breve.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const vipIds = expiringVips.map(v => v.id);

    // 2. Obter tokens desses usuários
    const { data: tokens, error: tokenError } = await supabaseClient
      .from('user_push_tokens')
      .select('token, user_id')
      .in('user_id', vipIds);

    if (tokenError) throw tokenError;
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhum token encontrado para VIPs expirando.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 3. Configurar Firebase
    const firebaseAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!firebaseAccountJson) throw new Error('FIREBASE_SERVICE_ACCOUNT secret not configured');

    const serviceAccount: ServiceAccount = JSON.parse(firebaseAccountJson)
    const accessToken = await getAccessToken(serviceAccount)
    const projectId = serviceAccount.project_id
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`

    // 4. Enviar notificações
    const sendResults = await Promise.all(tokens.map(async (t) => {
      const vip = expiringVips.find(v => v.id === t.user_id);
      const title = '⚠️ Sua assinatura VIP está vencendo!';
      const body = `Olá ${vip?.name || 'Amigo'}, sua assinatura expira em breve. Renove agora para continuar aproveitando os benefícios! 💎`;
      
      try {
        const response = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: t.token,
              notification: { title, body, image: "https://www.zkoficial.com.br/icons/icon-512.webp" },
              data: { url: '/perfil', type: 'vip_expiration' },
              android: { priority: "high", notification: { sound: "default", channelId: "high_priority" } },
              apns: { payload: { aps: { sound: "default", badge: 1 } } }
            }
          })
        });
        return response.ok;
      } catch {
        return false;
      }
    }));

    const successCount = sendResults.filter(Boolean).length;

    return new Response(JSON.stringify({
      success: true,
      sent_to: successCount,
      total_vips_found: expiringVips.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
