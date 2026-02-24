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
    const { record, type, testToken } = payload

    const isTest = type === 'TEST'

    // Apenas disparar se for um UPDATE e o status mudou para true (Live Iniciada) OU for um TESTE
    if (!isTest && (type !== 'UPDATE' || !record?.is_active || payload.old_record?.is_active)) {
      return new Response(JSON.stringify({ message: 'No action needed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const streamTitle = isTest ? 'Live de Teste' : (record.title || 'Nova Live')
    const channelName = isTest ? 'ZkOficial' : (record.channel_name || 'ZkOficial')

    console.log(`📡 Disparando notificações. Tipo: ${type}`)

    // 1. Obter os tokens de push
    let pushTokens: string[] = []

    if (isTest && testToken) {
      pushTokens = [testToken]
    } else {
      const { data, error: tokensError } = await supabase
        .from('user_push_tokens')
        .select('token')

      if (tokensError) throw tokensError
      pushTokens = (data || []).map(t => t.token)
    }

    if (pushTokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No tokens found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Obter Access Token do Google (FCM V1)
    const serviceAccountVar = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!serviceAccountVar) {
      throw new Error('Configuração ausente: FIREBASE_SERVICE_ACCOUNT não encontrado no Supabase Secrets.')
    }

    const serviceAccount = JSON.parse(serviceAccountVar)
    const accessToken = await getAccessToken(serviceAccount)

    const projectId = serviceAccount.project_id
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`

    // 3. Enviar notificações
    const results = await Promise.all(
      pushTokens.map(async (token) => {
        try {
          const res = await fetch(fcmUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              message: {
                token: token,
                notification: {
                  title: isTest ? '🔔 TESTE DE NOTIFICAÇÃO' : '🔴 ESTAMOS AO VIVO!',
                  body: isTest
                    ? 'Este é um teste do sistema de notificações do K-Premios.'
                    : `O ZK está online agora: ${streamTitle}. Clique para assistir!`,
                },
                data: {
                  type: isTest ? 'test' : 'live_start',
                  streamId: isTest ? 'test' : record.id,
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
          const data = await res.json()
          if (!res.ok) console.error(`Erro FCM para token ${token.substring(0, 10)}...:`, data)
          return res.ok
        } catch (e) {
          console.error(`Erro ao enviar para token: ${token}`, e)
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
