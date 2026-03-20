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

    const { club_slug, league_id, season = 2026 } = await req.json()

    if (!club_slug || !league_id) {
      throw new Error('club_slug and league_id are required')
    }

    // 0. Get club config
    const { data: clubConfig, error: configError } = await supabaseClient
      .from('clubs_config')
      .select('*')
      .eq('slug', club_slug)
      .single()

    if (configError || !clubConfig) {
      throw new Error(`Club config not found for slug: ${club_slug}`)
    }

    const clubApiId = clubConfig.api_id
    const footballApiKey = Deno.env.get('FOOTBALL_API_KEY')

    if (!footballApiKey) {
      throw new Error('FOOTBALL_API_KEY not set in Edge Function secrets')
    }

    // Fetch Competition Name based on ID
    const competitionsMap = {
      71: 'Campeonato Brasileiro',
      629: 'Estadual',
      256: 'Copa do Brasil',
      330: 'Conmebol Sul-Americana',
      329: 'Conmebol Libertadores'
    }
    const competitionName = competitionsMap[league_id] || 'Outra Competição'

    // 1. Sync Standings
    console.log(`Buscando classificação para: ${competitionName} (ID: ${league_id}) e Clube: ${club_slug}...`)
    
    const standingsResponse = await fetch(`https://v3.football.api-sports.io/standings?league=${league_id}&season=${season}`, {
      headers: {
        'x-apisports-key': footballApiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    })

    const standingsResult = await standingsResponse.json()

    if (standingsResult.response && standingsResult.response.length > 0) {
      const allStandings = standingsResult.response[0].league.standings
      
      // Clear data for this club and competition before inserting
      // No match_standings table? It was cruzeiro_standings before refactor.
      // After my refactor it is match_standings.
      await supabaseClient.from('match_standings').delete().match({ club_slug, api_league_id: league_id })

      for (const group of allStandings) {
        for (const entry of group) {
           const teamData = {
            position: entry.rank,
            team: entry.team.name,
            logo: entry.team.logo,
            points: entry.points,
            played: entry.all.played,
            won: entry.all.win,
            drawn: entry.all.draw,
            lost: entry.all.lose,
            goals_for: entry.all.goals.for,
            goals_against: entry.all.goals.against,
            is_primary_team: entry.team.id === clubApiId,
            competition: competitionName,
            api_team_id: entry.team.id,
            api_league_id: league_id,
            club_slug: club_slug
          }

          await supabaseClient.from('match_standings').upsert(teamData)
        }
      }
    }

    // 2. Sync Games
    console.log(`Buscando jogos para Clube: ${club_slug} (ID API: ${clubApiId})...`)
    const gamesResponse = await fetch(`https://v3.football.api-sports.io/fixtures?team=${clubApiId}&season=${season}&league=${league_id}`, {
      headers: {
        'x-apisports-key': footballApiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    })

    const gamesResult = await gamesResponse.json()
    let gamesSynced = 0

    if (gamesResult.response) {
      for (const fixture of gamesResult.response) {
          const gameData = {
            opponent: fixture.teams.home.id === clubApiId ? fixture.teams.away.name : fixture.teams.home.name,
            opponent_logo: fixture.teams.home.id === clubApiId ? fixture.teams.away.logo : fixture.teams.home.logo,
            date: fixture.fixture.date,
            venue: fixture.fixture.venue.name || 'A definir',
            score_home: fixture.goals.home,
            score_away: fixture.goals.away,
            status: fixture.fixture.status.short === 'FT' ? 'finished' : (['NS', 'TBD'].includes(fixture.fixture.status.short) ? 'upcoming' : 'live'),
            competition: competitionName,
            is_home: fixture.teams.home.id === clubApiId,
            api_fixture_id: fixture.fixture.id,
            api_league_id: fixture.league.id,
            api_home_team_id: fixture.teams.home.id,
            api_away_team_id: fixture.teams.away.id,
            club_slug: club_slug
          }

          await supabaseClient.from('match_games').upsert(gameData)
          gamesSynced++
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Sincronização de ${competitionName} para ${club_slug} concluída.`,
      games_synced: gamesSynced
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
