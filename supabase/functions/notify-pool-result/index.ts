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
    const { poolId } = payload

    if (!poolId) {
      throw new Error('poolId is required')
    }

    // 1. Obter dados do bolão
    const { data: pool, error: poolError } = await supabaseClient
      .from('match_pools')
      .select('*')
      .eq('id', poolId)
      .single()

    if (poolError) throw poolError

    const matchTitle = pool.match_title || 'Bolão'
    const homeScore = pool.result_home_score
    const awayScore = pool.result_away_score

    console.log(`🏆 Processando encerramento do bolão: ${matchTitle} (${homeScore}x${awayScore})`)

    // 2. Obter participantes deste bolão
    const { data: participants, error: partError } = await supabaseClient
      .from('pool_bets')
      .select('user_id, is_winner, prize_amount')
      .eq('pool_id', poolId)
      .eq('payment_status', 'approved')

    if (partError) throw partError

    // 3. Obter TODOS os tokens para notificação geral
    const { data: allPushTokens, error: tokensError } = await supabaseClient
      .from('user_push_tokens')
      .select('user_id, token')

    if (tokensError) throw tokensError
    if (!allPushTokens || allPushTokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No tokens found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 4. Obter Access Token FCM
    const firebaseServiceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!firebaseServiceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT not set')

    const serviceAccount = JSON.parse(firebaseServiceAccount)
    const accessToken = await getAccessToken(serviceAccount)
    const projectId = serviceAccount.project_id
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`

    // 5. Enviar notificações
    const sendResults = await Promise.all(
      allPushTokens.map(async (t: { user_id: string; token: string }) => {
        const userBet = participants?.find((p: any) => p.user_id === t.user_id)

        let title = '⚽ RESULTADO DO BOLÃO!'
        let body = `O resultado de ${matchTitle} saiu: ${homeScore} x ${awayScore}. Confira as premiações no app! 🧐`
        let type = 'pool_result'

        if (userBet) {
          if (userBet.is_winner) {
            title = '🏆 PARABÉNS! VOCÊ VENCEU!'
            body = `Você acertou o placar de ${matchTitle} (${homeScore}x${awayScore}) e ganhou R$ ${userBet.prize_amount?.toFixed(2)}! Fale com o ZK para resgatar! 🤑`
            type = 'pool_winner'
          } else {
            title = '⚽ RESULTADO DO BOLÃO'
            body = `A bota bateu na trave! O placar foi ${homeScore} x ${awayScore}. Continue tentando nos próximos jogos! 🍀`
          }
        }

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
                notification: { title, body },
                data: {
                  type,
                  poolId: String(poolId),
                  isWinner: String(!!userBet?.is_winner)
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

    const successCount = sendResults.filter(Boolean).length
    console.log(`✅ Notificações de bolão enviadas: ${successCount} de ${allPushTokens.length}`)

    return new Response(JSON.stringify({ success: true, sent: successCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('❌ Erro na Edge Function notify-pool-result:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
