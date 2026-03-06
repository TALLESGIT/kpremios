/**
 * Mapeamento de logos dos clubes brasileiros e sul-americanos
 * Usando a API pública do Football-Data / escudos via CDN
 */

// Logos dos clubes via API brasileirão (cdn confiável e gratuito)
const TEAM_LOGOS: Record<string, string> = {
  // ========== SÉRIE A ==========
  'Cruzeiro': 'https://logodetimes.com/times/cruzeiro/logo-cruzeiro-256.png',
  'Flamengo': 'https://logodetimes.com/times/flamengo/logo-flamengo-256.png',
  'Palmeiras': 'https://logodetimes.com/times/palmeiras/logo-palmeiras-256.png',
  'São Paulo': 'https://logodetimes.com/times/sao-paulo/logo-sao-paulo-256.png',
  'Corinthians': 'https://logodetimes.com/times/corinthians/logo-corinthians-256.png',
  'Internacional': 'https://logodetimes.com/times/internacional/logo-internacional-256.png',
  'Grêmio': 'https://logodetimes.com/times/gremio/logo-gremio-256.png',
  'Bahia': 'https://logodetimes.com/times/bahia/logo-bahia-256.png',
  'Fortaleza': 'https://logodetimes.com/times/fortaleza/logo-fortaleza-256.png',
  'Fluminense': 'https://logodetimes.com/times/fluminense/logo-fluminense-256.png',
  'Vasco': 'https://logodetimes.com/times/vasco-da-gama/logo-vasco-da-gama-256.png',
  'Botafogo': 'https://logodetimes.com/times/botafogo/logo-botafogo-256.png',
  'Red Bull Bragantino': 'https://logodetimes.com/times/red-bull-bragantino/logo-red-bull-bragantino-256.png',
  'Athletico-PR': 'https://logodetimes.com/times/athletico-paranaense/logo-athletico-paranaense-256.png',
  'Cuiabá': 'https://logodetimes.com/times/cuiaba/logo-cuiaba-256.png',
  'Juventude': 'https://logodetimes.com/times/juventude/logo-juventude-256.png',
  'Vitória': 'https://logodetimes.com/times/vitoria/logo-vitoria-256.png',
  'Criciúma': 'https://logodetimes.com/times/criciuma/logo-criciuma-256.png',
  'Atlético-GO': 'https://logodetimes.com/times/atletico-goianiense/logo-atletico-goianiense-256.png',
  'Amazonas': 'https://logodetimes.com/times/amazonas-fc/logo-amazonas-fc-256.png',
  'Santos': 'https://logodetimes.com/times/sao-paulo/logo-sao-paulo-256.png', // Fallback for 256px
  'Chapecoense': 'https://logodetimes.com/times/chapecoense/logo-chapecoense-256.png',
  'Remo': 'https://logodetimes.com/times/remo/logo-remo-256.png',
  'Sport': 'https://logodetimes.com/times/sport/logo-sport-256.png',
  'Ceará': 'https://logodetimes.com/times/ceara/logo-ceara-256.png',
  'Mirassol': 'https://logodetimes.com/times/mirassol/logo-mirassol-256.png',
  'Goiás': 'https://logodetimes.com/times/goias/logo-goias-256.png',
  'Coritiba': 'https://logodetimes.com/times/coritiba/logo-coritiba-256.png',
  'Avaí': 'https://logodetimes.com/times/avai/logo-avai-256.png',
  'Ponte Preta': 'https://logodetimes.com/times/ponte-preta/logo-ponte-preta-256.png',
  'Guarani': 'https://logodetimes.com/times/guarani/logo-guarani-256.png',

  // ========== MINEIRO ==========
  'Atlético-MG': 'https://logodetimes.com/times/atletico-mineiro/logo-atletico-mineiro-256.png',
  'América-MG': 'https://logodetimes.com/times/america-mineiro/logo-america-mineiro-256.png',
  'Athletic Club': 'https://logodetimes.com/times/athletic-club/logo-athletic-club-256.png',
  'Villa Nova': 'https://logodetimes.com/times/villa-nova/logo-villa-nova-256.png',
  'Tombense': 'https://logodetimes.com/times/tombense/logo-tombense-256.png',
  'Ipatinga': 'https://logodetimes.com/times/ipatinga/logo-ipatinga-256.png',
  'Uberlândia': 'https://logodetimes.com/times/uberlandia/logo-uberlandia-256.png',
  'Pouso Alegre': 'https://logodetimes.com/times/pouso-alegre/logo-pouso-alegre-256.png',
  'Democrata-GV': 'https://logodetimes.com/times/democrata-de-governador-valadares/logo-democrata-de-governador-valadares-256.png',
  'Itabirito': 'https://logodetimes.com/times/itabirito/logo-itabirito-256.png',
  'Patrocinense': 'https://logodetimes.com/times/patrocinense/logo-patrocinense-256.png',
  'Democrata-SL': 'https://logodetimes.com/times/democrata-de-sete-lagoas/logo-democrata-de-sete-lagoas-256.png',

  // ========== LIBERTADORES / SUL-AMERICANA ==========
  'River Plate': 'https://logodetimes.com/times/river-plate/logo-river-plate-256.png',
  'Boca Juniors': 'https://logodetimes.com/times/boca-juniors/logo-boca-juniors-256.png',
  'Racing': 'https://logodetimes.com/times/racing/logo-racing-256.png',
  'Independiente': 'https://logodetimes.com/times/independiente/logo-independiente-256.png',
  'Peñarol': 'https://logodetimes.com/times/penarol/logo-penarol-256.png',
  'Nacional': 'https://logodetimes.com/times/nacional-uruguai/logo-nacional-uruguai-256.png',
  'Colo-Colo': 'https://logodetimes.com/times/colo-colo/logo-colo-colo-256.png',
  'Olimpia': 'https://logodetimes.com/times/olimpia/logo-olimpia-256.png',
  'Cerro Porteño': 'https://logodetimes.com/times/cerro-porteno/logo-cerro-porteno-256.png',
  'Bolívar': 'https://logodetimes.com/times/bolivar/logo-bolivar-256.png',
  'LDU Quito': 'https://logodetimes.com/times/ldu-quito/logo-ldu-quito-256.png',
  'Millonarios': 'https://logodetimes.com/times/millonarios/logo-millonarios-256.png',
  'Atlético Nacional': 'https://logodetimes.com/times/atletico-nacional-colombia/logo-atletico-nacional-colombia-256.png',
  'The Strongest': 'https://logodetimes.com/times/the-strongest/logo-the-strongest-256.png',
  'Independiente del Valle': 'https://logodetimes.com/times/independiente-del-valle/logo-independiente-del-valle-256.png',
  'Estudiantes': 'https://logodetimes.com/times/estudiantes-de-la-plata/logo-estudiantes-de-la-plata-256.png',
  'Talleres': 'https://logodetimes.com/times/talleres-de-cordoba/logo-talleres-de-cordoba-256.png',
  'Libertad': 'https://logodetimes.com/times/libertad/logo-libertad-256.png',
  'Alianza Lima': 'https://logodetimes.com/times/alianza-lima/logo-alianza-lima-256.png',
  'Universitario': 'https://logodetimes.com/times/universitario/logo-universitario-256.png',
  'Barca SC': 'https://logodetimes.com/times/barcelona-de-guayaquil/logo-barcelona-de-guayaquil-256.png',
  'Belgrano': 'https://logodetimes.com/times/belgrano-de-cordoba/logo-belgrano-de-cordoba-256.png',
  'Lanús': 'https://logodetimes.com/times/lanus/logo-lanus-256.png',
  'Defensa y Justicia': 'https://logodetimes.com/times/defensa-y-justicia/logo-defensa-y-justicia-256.png',
};

// Cores primárias do clube (para fallback e gradientes)
const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  'Cruzeiro': { primary: '#003DA5', secondary: '#FFFFFF' },
  'Flamengo': { primary: '#D1001C', secondary: '#000000' },
  'Palmeiras': { primary: '#006437', secondary: '#FFFFFF' },
  'São Paulo': { primary: '#FF0000', secondary: '#FFFFFF' },
  'Corinthians': { primary: '#000000', secondary: '#FFFFFF' },
  'Internacional': { primary: '#E30613', secondary: '#FFFFFF' },
  'Grêmio': { primary: '#0A2F5A', secondary: '#8ECAE6' },
  'Bahia': { primary: '#005BAA', secondary: '#EC1C24' },
  'Fortaleza': { primary: '#004A9C', secondary: '#ED1C24' },
  'Fluminense': { primary: '#841F2B', secondary: '#1B5E20' },
  'Vasco': { primary: '#000000', secondary: '#FFFFFF' },
  'Botafogo': { primary: '#000000', secondary: '#FFFFFF' },
  'Red Bull Bragantino': { primary: '#D1001C', secondary: '#FFFFFF' },
  'Athletico-PR': { primary: '#D50032', secondary: '#000000' },
  'Atlético-MG': { primary: '#000000', secondary: '#FFFFFF' },
  'Santos': { primary: '#000000', secondary: '#FFFFFF' },
  'América-MG': { primary: '#008C3A', secondary: '#FFFFFF' },
  'Sport': { primary: '#D50032', secondary: '#000000' },
  'Vitória': { primary: '#D50032', secondary: '#000000' },
  'Ceará': { primary: '#000000', secondary: '#FFFFFF' },
  'Cuiabá': { primary: '#006437', secondary: '#FFD700' },
  'Juventude': { primary: '#006437', secondary: '#FFFFFF' },
  'Criciúma': { primary: '#FFD700', secondary: '#000000' },
  'Atlético-GO': { primary: '#D1001C', secondary: '#000000' },
  'Amazonas': { primary: '#FFD700', secondary: '#000000' },
  'Chapecoense': { primary: '#009145', secondary: '#FFFFFF' },
  'Remo': { primary: '#161923', secondary: '#FFFFFF' },
  'Mirassol': { primary: '#FFD700', secondary: '#006437' },
  'Goiás': { primary: '#006437', secondary: '#FFFFFF' },
  'Coritiba': { primary: '#006437', secondary: '#FFFFFF' },
  'Avaí': { primary: '#003DA5', secondary: '#FFFFFF' },
  'Ponte Preta': { primary: '#000000', secondary: '#FFFFFF' },
  'Guarani': { primary: '#006437', secondary: '#FFFFFF' },

  // MINEIRO
  'Athletic Club': { primary: '#000000', secondary: '#FFFFFF' },
  'Villa Nova': { primary: '#FF0000', secondary: '#FFFFFF' },
  'Tombense': { primary: '#FF0000', secondary: '#FFFFFF' },
  'Ipatinga': { primary: '#006437', secondary: '#FFFFFF' },
  'Uberlândia': { primary: '#006437', secondary: '#FFFFFF' },
  'Pouso Alegre': { primary: '#FF0000', secondary: '#FFFFFF' },
  'Democrata-GV': { primary: '#000000', secondary: '#FFFFFF' },
  'Itabirito': { primary: '#FFD700', secondary: '#000000' },
  'Patrocinense': { primary: '#800000', secondary: '#FFFFFF' },
  'Democrata-SL': { primary: '#FF0000', secondary: '#FFFFFF' },

  // INTERNACIONAL
  'River Plate': { primary: '#D50032', secondary: '#FFFFFF' },
  'Boca Juniors': { primary: '#003DA5', secondary: '#FFCC00' },
  'Racing': { primary: '#7CB9E8', secondary: '#FFFFFF' },
  'Independiente': { primary: '#D1001C', secondary: '#FFFFFF' },
  'Peñarol': { primary: '#FFCC00', secondary: '#000000' },
  'Nacional': { primary: '#0000FF', secondary: '#FFFFFF' },
  'Colo-Colo': { primary: '#000000', secondary: '#FFFFFF' },
  'Olimpia': { primary: '#000000', secondary: '#FFFFFF' },
  'Cerro Porteño': { primary: '#0000FF', secondary: '#FF0000' },
  'Bolívar': { primary: '#00BFFF', secondary: '#FFFFFF' },
  'LDU Quito': { primary: '#FFFFFF', secondary: '#0000FF' },
  'Millonarios': { primary: '#0000FF', secondary: '#FFFFFF' },
  'Atlético Nacional': { primary: '#008C3A', secondary: '#FFFFFF' },
  'The Strongest': { primary: '#FFCC00', secondary: '#000000' },
  'Independiente del Valle': { primary: '#0000FF', secondary: '#000000' },
  'Estudiantes': { primary: '#D1001C', secondary: '#FFFFFF' },
  'Talleres': { primary: '#000080', secondary: '#FFFFFF' },
  'Libertad': { primary: '#000000', secondary: '#FFFFFF' },
  'Alianza Lima': { primary: '#000080', secondary: '#FFFFFF' },
  'Universitario': { primary: '#800000', secondary: '#F5F5DC' },
  'Barca SC': { primary: '#FFCC00', secondary: '#DD0000' },
  'Belgrano': { primary: '#00BFFF', secondary: '#FFFFFF' },
  'Lanús': { primary: '#800000', secondary: '#FFFFFF' },
  'Defensa y Justicia': { primary: '#006437', secondary: '#FFFF00' },
};

/**
 * Retorna a URL do logo do time
 */
export function getTeamLogo(teamName: string): string | null {
  return TEAM_LOGOS[teamName] || null;
}

/**
 * Retorna as cores do time
 */
export function getTeamColors(teamName: string): { primary: string; secondary: string } {
  return TEAM_COLORS[teamName] || { primary: '#334155', secondary: '#94a3b8' };
}

/**
 * Gera iniciais do time para fallback (quando não tem logo)
 */
export function getTeamInitials(teamName: string): string {
  if (!teamName) return '?';
  // Mapeamento especial para times com nomes longos
  const INITIALS_MAP: Record<string, string> = {
    'Democrata-GV': 'DGV',
    'Democrata-SL': 'DSL',
    'Itabirito': 'ITA',
    'Patrocinense': 'PAT',
    'Tombense': 'TOM',
    'Ipatinga': 'IPA',
    'Uberlândia': 'UEC',
    'Pouso Alegre': 'PAF',
    'Athletico-PR': 'CAP',
    'Atlético-MG': 'CAM',
    'Atlético-GO': 'ACG',
    'América-MG': 'AME',
    'Athletic Club': 'ATH',
    'Villa Nova': 'VNO',
    'Cerro Porteño': 'CRP',
    'Independiente del Valle': 'IDV',
    'LDU Quito': 'LDU',
    'The Strongest': 'TST',
    'River Plate': 'RIV',
    'Boca Juniors': 'BOC',
    'Colo-Colo': 'COL',
    'Alianza Lima': 'ALI',
    'Universitario': 'UNI',
    'Defensa y Justicia': 'DYJ',
    'Red Bull Bragantino': 'RBB',
    'RB Bragantino': 'RBB',
    'Amazonas': 'AMA',
    'Chapecoense': 'CHA',
    'Remo': 'REM',
  };
  if (INITIALS_MAP[teamName]) return INITIALS_MAP[teamName];
  return teamName.substring(0, 3).toUpperCase();
}
