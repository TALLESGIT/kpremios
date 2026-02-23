import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getAccessToken } from '../notify-live-start/google-auth.ts'

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
    const { record, type } = payload

    if (type !== 'INSERT') {
      return new Response(JSON.stringify({ message: 'Only INSERT events are handled' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const musicTitle = record.title || 'Nova Música'

    console.log(`🎵 Disparando notificações para a música: ${musicTitle}`)

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
                  title: '🎵 LANÇAMENTO NOVO!',
                  body: `Acabamos de lançar "${musicTitle}". Ouça agora no app! 🚀`,
                },
                data: {
                  type: 'new_music',
                  musicId: String(record.id),
                  url: 'https://www.zkoficial.com.br/musicas'
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
    console.log(`✅ Notificações de música enviadas: ${successCount} de ${pushTokens.length}`)

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
