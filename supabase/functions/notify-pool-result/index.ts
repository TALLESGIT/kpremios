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
    const { record, type, old_record } = payload

    // Apenas disparar se for um UPDATE e is_active mudou de true para false (Bolão encerrado)
    if (type !== 'UPDATE' || record.is_active || !old_record?.is_active) {
      return new Response(JSON.stringify({ message: 'No action needed: Pool not closing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const matchTitle = record.match_title || 'Bolão encerrado'
    const homeScore = record.result_home_score
    const awayScore = record.result_away_score

    console.log(`🏆 Processando encerramento do bolão: ${matchTitle} (${homeScore}x${awayScore})`)

    // 1. Obter todos os participantes deste bolão
    const { data: participants, error: partError } = await supabaseClient
      .from('pool_bets')
      .select('user_id, is_winner, prize_amount')
      .eq('pool_id', record.id)
      .eq('payment_status', 'approved')

    if (partError) throw partError
    if (!participants || participants.length === 0) {
      return new Response(JSON.stringify({ message: 'No participants found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Mapear user_ids para tokens
    const userIds = [...new Set(participants.map((p: any) => p.user_id))]
    const { data: pushTokens, error: tokensError } = await supabaseClient
      .from('user_push_tokens')
      .select('user_id, token')
      .in('user_id', userIds)

    if (tokensError) throw tokensError
    if (!pushTokens || pushTokens.length === 0) {
      return new Response(JSON.stringify({ message: 'No tokens found for participants' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 3. Obter Access Token FCM
    const firebaseServiceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!firebaseServiceAccount) throw new Error('FIREBASE_SERVICE_ACCOUNT not set')

    const serviceAccount = JSON.parse(firebaseServiceAccount)
    const accessToken = await getAccessToken(serviceAccount)
    const projectId = serviceAccount.project_id
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`

    // 4. Enviar notificações personalizadas
    const sendResults = await Promise.all(
      pushTokens.map(async (t: { user_id: string; token: string }) => {
        const userBet = participants.find((p: any) => p.user_id === t.user_id)
        if (!userBet) return false

        const isWinner = userBet.is_winner
        const prize = userBet.prize_amount || 0

        const title = isWinner ? '🏆 VOCÊ GANHOU O BOLÃO!' : '⚽ Resultado do Bolão'
        const body = isWinner
          ? `Parabéns! Você acertou o placar de ${matchTitle} (${homeScore}x${awayScore}) e ganhou R$ ${prize.toFixed(2)}! 🤑`
          : `O bolão de ${matchTitle} encerrou: ${homeScore}x${awayScore}. Veja quem ganhou no app! 🧐`

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
                  type: 'pool_result',
                  poolId: record.id,
                  isWinner: String(isWinner)
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

    const successCount = sendResults.filter(Boolean).length
    console.log(`✅ Notificações de resultado enviadas: ${successCount} de ${pushTokens.length}`)

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
