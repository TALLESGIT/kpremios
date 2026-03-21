/**
 * Utilitário para determinar a rota de redirecionamento baseada no contexto do clube.
 * Isso evita que usuários do Galo caiam na home do Cruzeiro.
 */
export const getContextualHome = (currentUser?: any) => {
  // ✅ NUNCA redirecionar administradores automaticamente
  if (currentUser?.is_admin) {
    return '/';
  }

  try {
    // Priorizar o clube do usuário logado se ele não for admin
    const club = currentUser?.club_slug || sessionStorage.getItem('session_club');
    const sessionChannel = sessionStorage.getItem('session_channel');
    
    if (club === 'atletico-mg') {
      // Se houver um canal específico de live salvo, volta para ele
      if (sessionChannel) {
        return `/ao-vivo/${sessionChannel}`;
      }
      // Caso contrário, vai para a ZkTV que já lidará com o contexto do Galo
      return '/zk-tv';
    }
  } catch (e) {
    console.error('Erro ao acessar sessionStorage:', e);
  }
  
  // Padrão: Home do Cruzeiro
  return '/';
};
