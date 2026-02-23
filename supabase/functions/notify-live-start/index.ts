import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAccessToken } from './google-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    const { record, type } = payload

    // Apenas disparar se for um UPDATE e o status mudou para true (Live Iniciada)
    if (type !== 'UPDATE' || !record.is_active || payload.old_record?.is_active) {
      return new Response(JSON.stringify({ message: 'No action needed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const streamTitle = record.title || 'Nova Live'
    const channelName = record.channel_name || 'ZkOficial'

    console.log(`📡 Disparando notificações para a live: ${streamTitle}`)

    // 1. Obter todos os tokens de push
    const { data: pushTokens, error: tokensError } = await supabase
      .from('user_push_tokens')
      .select('token')

    if (tokensError) throw tokensError
    if (!pushTokens || pushTokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No tokens found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Obter Access Token do Google (FCM V1)
    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}')
    const accessToken = await getAccessToken(serviceAccount)

    const projectId = serviceAccount.project_id
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`

    // 3. Enviar notificações em lote (um a um por simplicidade no Edge Function ou usar batch se muitos)
    const results = await Promise.all(
      pushTokens.map(async (t) => {
        try {
          const res = await fetch(fcmUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              message: {
                token: t.token,
                notification: {
                  title: '🔴 ESTAMOS AO VIVO!',
                  body: `O ZK está online agora: ${streamTitle}. Clique para assistir!`,
                },
                data: {
                  type: 'live_start',
                  streamId: record.id,
                  channelName: channelName,
                  url: `https://www.zkoficial.com.br/live/${channelName}`
                },
                android: {
                  priority: 'high',
                  notification: {
                    channel_id: 'default',
                    click_action: 'TOP_STORY_ACTIVITY',
                  }
                }
              },
            }),
          })
          return res.ok
        } catch (e) {
          console.error(`Erro ao enviar para token: ${t.token}`, e)
          return false
        }
      })
    )

    const successCount = results.filter(Boolean).length
    console.log(`✅ Notificações enviadas: ${successCount} de ${pushTokens.length}`)

    return new Response(JSON.stringify({ success: true, sent: successCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
