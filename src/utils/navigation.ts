/**
 * Utilitário para determinar a rota de redirecionamento baseada no contexto do clube.
 * Com a Home neutra, todos os usuários vão para `/`.
 */
export const getContextualHome = (_currentUser?: any) => {
  // Home neutra para todos os usuários
  return '/';
};
