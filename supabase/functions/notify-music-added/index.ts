import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAccessToken } from './google-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    const payload = await req.json()
    const { record, type, content_type } = payload

    if (type !== 'INSERT') {
      return new Response(JSON.stringify({ message: 'Only INSERT events are handled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const contentTitle = record.title || 'Novo Conteúdo'
    const isClip = content_type === 'clip'

    const notificationTitle = isClip
      ? '🎬 NOVO CLIPE EXCLUSIVO!'
      : '🎵 LANÇAMENTO DO ZK!'

    const notificationBody = isClip
      ? `Confira o novo clipe "${contentTitle}" — conteúdo exclusivo para a Nação! 🔥⚽`
      : `Acabamos de lançar "${contentTitle}". Ouça esse novo sucesso agora no app! 🚀🎸`

    const notificationType = isClip ? 'new_clip' : 'new_music'
    const notificationUrl = isClip
      ? 'https://www.zkoficial.com.br/zk-clips'
      : 'https://www.zkoficial.com.br/musicas'

    console.log(`${isClip ? '🎬' : '🎵'} Disparando notificações para: ${contentTitle}`)

    const { data: pushTokens, error: tokensError } = await supabaseClient
      .from('user_push_tokens')
      .select('token')

    if (tokensError) throw tokensError
    if (!pushTokens || pushTokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No tokens found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const firebaseServiceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!firebaseServiceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT not set')

    const serviceAccount = JSON.parse(firebaseServiceAccount)
    const accessToken = await getAccessToken(serviceAccount)

    const projectId = serviceAccount.project_id
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`

    const results = await Promise.all(
      pushTokens.map(async (t: { token: string }) => {
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
                  title: notificationTitle,
                  body: notificationBody,
                },
                data: {
                  type: notificationType,
                  musicId: String(record.id),
                  url: notificationUrl
                },
                android: {
                  priority: 'high',
                  notification: {
                    channel_id: 'default',
                    click_action: 'TOP_STORY_ACTIVITY',
                    icon: 'ic_stat_notification',
                    color: '#005BAA'
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

  } catch (error: any) {
    console.error('❌ Erro na Edge Function notify-music-added:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
