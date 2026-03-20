// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const { team_id, opponent_name } = await req.json()

    if (!team_id) {
      throw new Error('team_id is required')
    }

    console.log(`Iniciando sincronização para o time: ${opponent_name || team_id} (ID: ${team_id})`)

    const footballApiKey = Deno.env.get('FOOTBALL_API_KEY')
    if (!footballApiKey) {
      throw new Error('FOOTBALL_API_KEY not set in Edge Function secrets')
    }

    // 1. Buscar elenco da API Football
    const response = await fetch(`https://v3.football.api-sports.io/players/squads?team=${team_id}`, {
      headers: {
        'x-apisports-key': footballApiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    })

    const result = await response.json()

    if (!result.response || result.response.length === 0) {
      return new Response(JSON.stringify({ message: `Nenhum jogador encontrado para o time ${team_id}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const squad = result.response[0].players
    const posMap: Record<string, string> = {
      'Goalkeeper': 'GOL',
      'Defender': 'ZAG',
      'Midfielder': 'MEI',
      'Attacker': 'ATA'
    }

    const playersToSync = squad.map((p: any) => {
      const apiPosition: string = p.position || 'Midfielder'
      let position = posMap[apiPosition] || 'MEI'
      if (p.name === 'Neymar' || p.name === 'Rony') {
        position = 'MEI,ATA'
      }
      return {
        name: p.name,
        full_name: p.name,
        photo_url: p.photo,
        position: position,
        number: p.number || null,
        team_id: team_id,
        is_active: true,
        updated_at: new Date().toISOString()
      }
    })

    // 2. Limpar e Inserir no Supabase (Upsert logic)
    // Deletamos os antigos do mesmo time antes de inserir
    await supabaseClient.from('opponent_players').delete().eq('team_id', team_id)

    const { error: insertError } = await supabaseClient
      .from('opponent_players')
      .insert(playersToSync)

    if (insertError) throw insertError

    console.log(`Sincronização concluída: ${playersToSync.length} jogadores importados.`)

    return new Response(JSON.stringify({ 
      success: true, 
      count: playersToSync.length,
      message: `Sincronização de ${opponent_name || 'adversário'} concluída com sucesso.`
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
