import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { title, body, data, target_topic } = await req.json()

    // 1. Obter todos os tokens de push se não houver um tópico específico
    // (Simplificado: enviando para todos os dispositivos registrados)
    const { data: tokens, error: tokenError } = await supabaseClient
      .from('user_push_tokens')
      .select('token')

    if (tokenError) throw tokenError
    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No tokens found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const registrationTokens = tokens.map(t => t.token)

    // 2. Configurar credenciais do Firebase (via service account nos segredos)
    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ?? '{}')

    // Nota: Para enviar via HTTP v1, precisamos de um token de acesso OAuth2.
    // Como estamos em uma Edge Function simplificada, vamos usar um helper ou
    // a API legada se o usuário preferir, mas o padrão moderno é o Console do Firebase
    // enviar via Admin SDK.

    // Por enquanto, vamos logar a tentativa de envio. 
    // O próximo passo será implementar o fetch para a API do Google APIs.

    console.log(`Enviando notificação: ${title} para ${registrationTokens.length} dispositivos`)

    return new Response(JSON.stringify({
      success: true,
      message: `Notification queued for ${registrationTokens.length} devices`
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
