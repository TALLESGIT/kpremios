// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { club_slug } = await req.json()

    if (!club_slug) {
      throw new Error('club_slug is required')
    }

    // 1. Buscar config do clube para pegar o api_id
    const { data: config, error: configError } = await supabaseClient
      .from('clubs_config')
      .select('api_id, name')
      .eq('slug', club_slug)
      .single()

    if (configError || !config?.api_id) {
      throw new Error(`Configuração da API não encontrada para o clube: ${club_slug}`)
    }

    const teamId = config.api_id
    const footballApiKey = Deno.env.get('FOOTBALL_API_KEY')
    if (!footballApiKey) {
      throw new Error('FOOTBALL_API_KEY not set in Edge Function secrets')
    }

    console.log(`Sincronizando elenco do ${config.name} (ID: ${teamId})...`)

    // 2. Buscar elenco da API Football
    const response = await fetch(`https://v3.football.api-sports.io/players/squads?team=${teamId}`, {
      headers: {
        'x-apisports-key': footballApiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    })

    const result = await response.json()

    if (!result.response || result.response.length === 0) {
      return new Response(JSON.stringify({ message: `Nenhum jogador encontrado para o time ${teamId}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    const squad = result.response[0].players
    const posMap: Record<string, string> = {
      'Goalkeeper': 'GOL',
      'Defender': 'ZAG,LAT',
      'Midfielder': 'MEI',
      'Attacker': 'ATA'
    }

    const playersToSync = squad.map((p: any) => {
      const apiPosition: string = p.position || 'Midfielder'
      const position = posMap[apiPosition] || 'MEI'
      
      return {
        name: p.name,
        full_name: p.name,
        photo_url: p.photo,
        position: position,
        number: p.number || null,
        club_slug: club_slug,
        is_active: true,
        updated_at: new Date().toISOString()
      }
    })

    // 3. Atualizar no Supabase (Limpar e Inserir)
    await supabaseClient.from('team_players').delete().eq('club_slug', club_slug)

    const { error: insertError } = await supabaseClient
      .from('team_players')
      .insert(playersToSync)

    if (insertError) throw insertError

    return new Response(JSON.stringify({ 
      success: true, 
      count: playersToSync.length,
      message: `Elenco do ${config.name} sincronizado com sucesso!`
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
