import React from 'react';
import ZKViewer from '../components/ZKViewer';

/**
 * Página de exemplo para usar o ZKViewer
 * 
 * Como usar:
 * 1. Importe o componente: import ZKViewer from '../components/ZKViewer';
 * 2. Use o componente passando o channel name:
 *    <ZKViewer channel="ZkPremios" />
 * 
 * O App ID será obtido automaticamente da variável de ambiente VITE_AGORA_APP_ID
 * 
 * Ou você pode passar manualmente:
 * <ZKViewer appId="seu-app-id" channel="ZkPremios" />
 */
function ZKViewerExamplePage() {
  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <ZKViewer 
        channel="ZkPremios" 
      />
    </div>
  );
}

export default ZKViewerExamplePage;

