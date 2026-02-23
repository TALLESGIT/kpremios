import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './styles/loading-animations.css';
import './styles/mobile-video.css';
import { suppressDeprecatedWarnings, suppressDeprecatedErrors } from './utils/suppressWarnings';

// Suprimir avisos de depreciação específicos
suppressDeprecatedWarnings();
suppressDeprecatedErrors();

// NOTA: StrictMode removido para evitar renderizações duplas do ZKViewer
// que causam múltiplas conexões Agora.io
createRoot(document.getElementById('root')!).render(
  <App />
);
