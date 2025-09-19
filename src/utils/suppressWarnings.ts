// Utilitário para suprimir avisos específicos do console
export const suppressDeprecatedWarnings = () => {
  // Salvar a função original do console.warn
  const originalWarn = console.warn;
  
  // Substituir console.warn para filtrar avisos específicos
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    
    // Suprimir avisos específicos de feature_collector
    if (message.includes('feature_collector.js') && 
        message.includes('deprecated parameters for the initialization function')) {
      return; // Não exibir este aviso
    }
    
    // Suprimir outros avisos de depreciação comuns
    if (message.includes('deprecated parameters') && 
        message.includes('initialization function')) {
      return; // Não exibir avisos de parâmetros depreciados
    }
    
    // Suprimir avisos de analytics do Vercel
    if (message.includes('analytics') && 
        message.includes('deprecated')) {
      return; // Não exibir avisos de analytics depreciados
    }
    
    // Exibir outros avisos normalmente
    originalWarn.apply(console, args);
  };
};

// Função para suprimir avisos de console.error também
export const suppressDeprecatedErrors = () => {
  const originalError = console.error;
  
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    
    // Suprimir erros relacionados a feature_collector
    if (message.includes('feature_collector.js') && 
        message.includes('deprecated')) {
      return;
    }
    
    // Exibir outros erros normalmente
    originalError.apply(console, args);
  };
};

// Função para restaurar o console.warn original
export const restoreConsoleWarn = () => {
  // Esta função pode ser usada se necessário restaurar o comportamento original
  console.warn = console.warn;
};
