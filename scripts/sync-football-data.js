import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Carregamento simples de .env sem dependência externa
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
const footballApiKey = env.VITE_FOOTBALL_API_KEY;

if (!supabaseUrl || !supabaseKey || !footballApiKey) {
  console.error('Erro: Variáveis de ambiente faltando no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuração das Ligas (ID API-Football)
// Configuração das Ligas (IDs confirmados para 2026)
const LEAGUES = [
  { id: 71, name: 'Campeonato Brasileiro - Série A' },
  { id: 629, name: 'Campeonato Mineiro' },
  { id: 256, name: 'Copa do Brasil' },
  { id: 330, name: 'Copa Conmebol Sul-Americana' },
  { id: 329, name: 'Copa Conmebol Libertadores' }
];

const CRUZEIRO_API_ID = 135; // ID do Cruzeiro na API-Football (Brasil)

async function syncStandings() {
  console.log('--- Iniciando sincronização de Tabelas ---');

  for (const league of LEAGUES) {
    try {
      console.log(`Buscando classificação para: ${league.name} (ID: ${league.id})...`);

      const response = await fetch(`https://v3.football.api-sports.io/standings?league=${league.id}&season=2026`, {
        headers: {
          'x-apisports-key': footballApiKey,
          'x-rapidapi-host': 'v3.football.api-sports.io'
        }
      });

      const result = await response.json();

      if (!result.response || result.response.length === 0) {
        console.log(`Nenhum dado de classificação encontrado para ${league.name}`);
        continue;
      }

      const allStandings = result.response[0].league.standings;
      let leagueHasCruzeiro = false;

      // Primeiro verificar se o Cruzeiro está em QUALQUER um dos grupos
      for (const group of allStandings) {
        if (group.some(entry => entry.team.id === CRUZEIRO_API_ID)) {
          leagueHasCruzeiro = true;
          break;
        }
      }

      if (!leagueHasCruzeiro) {
        console.log(`Cruzeiro não encontrado na liga ${league.name}. Pulando...`);
        continue;
      }

      console.log(`Confirmado: Cruzeiro participa de ${league.name}. Sincronizando grupos...`);

      // Limpar dados antigos desta competição antes de inserir novos
      await supabase.from('cruzeiro_standings').delete().eq('api_league_id', league.id);

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
            is_cruzeiro: entry.team.id === CRUZEIRO_API_ID,
            competition: league.name,
            api_team_id: entry.team.id,
            api_league_id: league.id
          };

          const { error } = await supabase
            .from('cruzeiro_standings')
            .upsert(teamData, { onConflict: 'api_team_id,api_league_id' });

          if (error) console.error(`Erro ao salvar time ${entry.team.name}:`, error);
        }
      }

      console.log(`Sincronização de ${league.name} concluída.`);

    } catch (error) {
      console.error(`Falha ao sincronizar ${league.name}:`, error);
    }
  }
}

async function syncGames() {
  console.log('--- Iniciando sincronização de Jogos ---');

  try {
    console.log(`Buscando jogos do Cruzeiro (ID: ${CRUZEIRO_API_ID})...`);

    const response = await fetch(`https://v3.football.api-sports.io/fixtures?team=${CRUZEIRO_API_ID}&season=2026`, {
      headers: {
        'x-apisports-key': footballApiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    const result = await response.json();

    if (!result.response) return;

    for (const fixture of result.response) {
      // Filtrar apenas competições que estão na nossa lista oficial
      const officialLeague = LEAGUES.find(l => l.id === fixture.league.id);

      if (!officialLeague) {
        console.log(`Ignorando jogo de competição não oficial: ${fixture.league.name} (ID: ${fixture.league.id})`);
        continue;
      }

      const gameData = {
        opponent: fixture.teams.home.id === CRUZEIRO_API_ID ? fixture.teams.away.name : fixture.teams.home.name,
        opponent_logo: fixture.teams.home.id === CRUZEIRO_API_ID ? fixture.teams.away.logo : fixture.teams.home.logo,
        date: fixture.fixture.date,
        venue: fixture.fixture.venue.name || 'A definir',
        score_home: fixture.goals.home,
        score_away: fixture.goals.away,
        status: fixture.fixture.status.short === 'FT' ? 'finished' : (['NS', 'TBD'].includes(fixture.fixture.status.short) ? 'upcoming' : 'live'),
        competition: officialLeague.name, // Nome normalizado
        is_home: fixture.teams.home.id === CRUZEIRO_API_ID,
        api_fixture_id: fixture.fixture.id,
        api_league_id: fixture.league.id,
        api_home_team_id: fixture.teams.home.id,
        api_away_team_id: fixture.teams.away.id
      };

      const { error } = await supabase
        .from('cruzeiro_games')
        .upsert(gameData, { onConflict: 'api_fixture_id' });

      if (error) console.error(`Erro ao salvar jogo ${fixture.fixture.id}:`, error);
    }

    console.log('Sincronização de jogos concluída.');

  } catch (error) {
    console.error('Falha ao sincronizar jogos:', error);
  }
}

async function syncTopScorers() {
  console.log('--- Iniciando sincronização de Artilharia ---');

  try {
    console.log(`Buscando artilheiro do Cruzeiro (ID: ${CRUZEIRO_API_ID})...`);

    const response = await fetch(`https://v3.football.api-sports.io/players?team=${CRUZEIRO_API_ID}&season=2026`, {
      headers: {
        'x-apisports-key': footballApiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    const result = await response.json();

    if (!result.response || result.response.length === 0) {
      console.log('Nenhum dado de jogador encontrado.');
      return;
    }

    // Mapa para armazenar o melhor marcador de cada competição
    // { "Campeonato Brasileiro - Série A": { name: "...", goals: 0 }, ... }
    const topScorersPerLeague = {};

    // Inicializar com as ligas oficiais
    LEAGUES.forEach(l => {
      topScorersPerLeague[l.name] = { name: 'A definir', goals: 0 };
    });

    for (const playerStats of result.response) {
      const name = playerStats.player.name;

      if (playerStats.statistics && Array.isArray(playerStats.statistics)) {
        for (const stat of playerStats.statistics) {
          const leagueName = stat.league.name;
          const goals = stat.goals.total || 0;

          // Encontrar correspondência na nossa lista de ligas oficiais
          const officialLeague = LEAGUES.find(l =>
            l.name.toLowerCase().includes(leagueName.toLowerCase()) ||
            leagueName.toLowerCase().includes(l.name.toLowerCase())
          );

          if (officialLeague && goals > 0) {
            const currentTop = topScorersPerLeague[officialLeague.name];
            if (goals > currentTop.goals) {
              topScorersPerLeague[officialLeague.name] = { name, goals };
            }
          }
        }
      }
    }

    console.log('Artilheiros por competição identificados:', topScorersPerLeague);

    // Salvar na tabela site_settings o mapa completo
    const { error } = await supabase
      .from('site_settings')
      .upsert({
        key: 'cruzeiro_top_scorers',
        value: {
          leagues: topScorersPerLeague,
          updated_at: new Date().toISOString()
        }
      }, { onConflict: 'key' });

    if (error) console.error('Erro ao salvar artilheiros no site_settings:', error);

    // Manter a chave antiga por compatibilidade temporária (opcional, mas seguro)
    // Pegar o global (quem tem mais gols no total)
    let globalTop = { name: 'Matheus P.', goals: 0 };
    Object.values(topScorersPerLeague).forEach(s => {
      if (s.goals > globalTop.goals) globalTop = s;
    });

    await supabase
      .from('site_settings')
      .upsert({
        key: 'cruzeiro_top_scorer',
        value: { name: globalTop.name, goals: globalTop.goals, updated_at: new Date().toISOString() }
      }, { onConflict: 'key' });

  } catch (error) {
    console.error('Falha ao sincronizar artilharia:', error);
  }
}

async function run() {
  await syncStandings();
  await syncGames();
  await syncTopScorers();
  process.exit(0);
}

run();
